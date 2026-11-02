"""Browser checks for the jQuery version. These tools are NOT loaded by the website.
Default: python tests/jquery-browser-check.py --base http://127.0.0.1:5500
The --isolated flag exists for restricted build environments, not for claiming a live-CDN pass.
"""
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlparse
import argparse, json, re, traceback
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:8765')
parser.add_argument('--isolated',action='store_true')
parser.add_argument('--browser',default='/usr/bin/chromium')
parser.add_argument('--jquery',default='/opt/pyvenv/lib/python3.13/site-packages/nbclassic/static/components/jquery/dist/jquery.min.js')
parser.add_argument('--bootstrap-css',default='/opt/imagemagick/share/doc/ImageMagick-7/www/assets/bootstrap.min.css')
parser.add_argument('--bootstrap-js',default='/opt/imagemagick/share/doc/ImageMagick-7/www/assets/bootstrap.bundle.min.js')
args=parser.parse_args()
report={'run_at':datetime.now(timezone.utc).isoformat(),'mode':'isolated in-memory DOM' if args.isolated else 'live HTTP',
        'checks':[], 'application_errors':[], 'console_errors':[], 'failed_resources':[], 'limitations':[]}
if args.isolated:
 report['limitations']=[
  'Enterprise browser policy blocks top-level HTTP navigation in this build environment. Documents were mounted in memory with a base URL to the local source server.',
  'Exact full jQuery 3.7.1 bytes (verified by the source integrity attribute) were served locally. Bootstrap 5.3.6 local assets substituted for the unchanged 5.3.3 CDN URLs only in the test harness.',
  'A storage test double was used for persistence scenarios; actual localStorage and end-to-end page navigation/CDN delivery need a local Live Server check on the students\' computer.',
  'Source files and production CDN links were not rewritten for these environment adaptations.'
 ]

def check(name,fn):
 fn();report['checks'].append({'name':name,'passed':True});print('PASS',name,flush=True)

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=args.browser,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000})
 if args.isolated:
  context.route('https://code.jquery.com/**', lambda r:r.fulfill(path=args.jquery,content_type='application/javascript',headers={'Access-Control-Allow-Origin':'*'}))
  def bootstrap_route(route):
   css='.css' in route.request.url
   route.fulfill(path=args.bootstrap_css if css else args.bootstrap_js,content_type='text/css' if css else 'application/javascript')
  context.route('https://cdn.jsdelivr.net/**',bootstrap_route)
 pages=[]
 def load(name,stored=None,blocked=False,width=1440):
  page=context.new_page();pages.append(page)
  page.set_viewport_size({'width':width,'height':1000})
  page.on('pageerror', lambda e:report['application_errors'].append(str(e)))
  page.on('console',lambda m:report['console_errors'].append(m.text) if m.type=='error' else None)
  page.on('requestfailed',lambda r:report['failed_resources'].append({'url':r.url,'failure':r.failure}))
  if args.isolated:
   page.evaluate('''({stored,blocked}) => {
    const memory = Object.assign({}, stored || {});
    window.__testMemory=memory;
    Object.defineProperty(window,'localStorage',{configurable:true,value:{
     getItem(key){if(blocked)throw new Error('storage blocked');return memory[key] ?? null;},
     setItem(key,value){if(blocked)throw new Error('storage blocked');memory[key]=String(value);},
     removeItem(key){delete memory[key];},clear(){Object.keys(memory).forEach(key=>delete memory[key]);}
    }});
   }''', {'stored':stored,'blocked':blocked})
   html=(ROOT/name).read_text().replace('<head>',f'<head><base href="{args.base}/">',1)
   page.set_content(html,wait_until='networkidle')
  else:
   if stored is not None:
    page.goto(args.base+'/index.html')
    page.evaluate('(stored)=>{localStorage.clear();Object.entries(stored).forEach(([k,v])=>localStorage.setItem(k,v));}',stored)
   page.goto(args.base+'/'+name,wait_until='networkidle')
  page.wait_for_function('typeof Chic === "object"')
  return page
 def store(page):
  return page.evaluate('Object.fromEntries(Object.entries(window.__testMemory))') if args.isolated else page.evaluate('Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))')
 def visible(page,selector): expect(page.locator(selector)).to_be_visible()
 def not_visible(page,selector): expect(page.locator(selector)).to_be_hidden()
 def text(page,selector,pattern): expect(page.locator(selector)).to_contain_text(pattern)
 def cartqty(page,n): assert page.evaluate('Chic.getTotals().quantity')==n
 def wait_effect(page): page.wait_for_timeout(240)
 try:
  home=load('index.html',{})
  report['jquery_version']=home.evaluate('jQuery.fn.jquery')
  report['bootstrap_test_version']=home.evaluate('bootstrap.Tooltip.VERSION')
  def home_test():
   text(home,'#finder-count','matching options')
   home.locator('#finder-budget').fill('1');text(home,'#finder-count','0 matching')
   home.locator('#finder-budget').fill('');home.locator('#finder-form button[type=submit]').click()
   expect(home.locator('#finder-budget')).to_have_attribute('aria-invalid','true')
   home.locator('#finder-reset').click();expect(home.locator('#finder-budget')).to_have_value('50000')
   first=home.locator('#featured-results article').get_attribute('data-product-id')
   home.locator('#featured-next').click();assert home.locator('#featured-results article').get_attribute('data-product-id')!=first
   home.locator('#finder-results [data-add-id]').first.click();cartqty(home,1)
  check('Home finder: invalid/empty/reset, random recommendation, delegated add',home_test)
  catalog=load('catalog.html',store(home))
  check('Shared basket state rehydrates in catalog',lambda:cartqty(catalog,1))
  def filter_test():
   text(catalog,'#catalog-count','38 of 38')
   catalog.locator('#catalog-category').select_option('boxes');catalog.locator('#catalog-search').fill('royal bloom')
   catalog.locator('#catalog-sort').select_option('price-asc');text(catalog,'#catalog-count','2 of 38')
   assert catalog.locator('#catalog-boxes-results .fw-bold').all_text_contents()==['40,000 KZT','48,500 KZT']
   catalog.locator('#catalog-search').fill('zzzzzz');text(catalog,'#catalog-count','0 of 38');visible(catalog,'#catalog-empty')
   catalog.locator('#catalog-reset').click();wait_effect(catalog);text(catalog,'#catalog-count','38 of 38')
   catalog.locator('#catalog-max-price').fill('-1');visible(catalog,'#catalog-max-price-error')
   catalog.locator('#catalog-reset').click();wait_effect(catalog)
   catalog.locator('#catalog-filter-toggle').click();wait_effect(catalog);not_visible(catalog,'#catalog-filter-panel')
   catalog.locator('#catalog-filter-toggle').click();wait_effect(catalog);visible(catalog,'#catalog-filter-panel')
  check('Catalog connected filters, sorting, no results, reset and slide effects',filter_test)
  def basket_test():
   catalog.locator('#basket-clear').click();wait_effect(catalog);visible(catalog,'#basket-clear-prompt')
   assert catalog.evaluate('document.activeElement.id')=='basket-clear-confirm'
   catalog.locator('#basket-clear-cancel').click();wait_effect(catalog);not_visible(catalog,'#basket-clear-prompt');cartqty(catalog,1)
   catalog.locator('#basket-clear').click();wait_effect(catalog);catalog.locator('#basket-clear-confirm').click();cartqty(catalog,0)
   expect(catalog.locator('#basket-checkout')).to_be_disabled()
   catalog.locator('[data-add-id="premium-pink-symphony"]').click()
   catalog.locator('[data-add-id="mono-golden-serenity"]').click();cartqty(catalog,2);text(catalog,'#basket-sum','92,000')
   catalog.locator('button[data-cart-action="increase"][data-product-id="premium-pink-symphony"]').click();cartqty(catalog,3);text(catalog,'#basket-sum','156,000')
   catalog.locator('button[data-cart-action="decrease"][data-product-id="premium-pink-symphony"]').click();cartqty(catalog,2)
   assert catalog.locator('article.selected').count()==2
   before=catalog.evaluate('Chic.getTotals().total')
   catalog.evaluate("Chic.setQuantity('premium-pink-symphony', 999)");assert catalog.evaluate('Chic.getTotals().total')==before
  check('Cart add/increase/decrease, arithmetic, cancel/clear, empty checkout, quantity limit',basket_test)
  order=load('order.html',store(catalog))
  def validation_test():
   text(order,'#order-live-totals','92,000')
   order.locator('#order-preview').click();visible(order,'#full-name-error');visible(order,'#phone-error')
   assert order.evaluate('document.activeElement.id')=='full-name'
   order.locator('#full-name').fill('  Alua Test  ');not_visible(order,'#full-name-error')
   order.locator('#phone').fill('wrong');visible(order,'#phone-error')
   order.locator('#phone').fill('+7 705 888 5622');not_visible(order,'#phone-error')
   order.locator('#email').fill('bad@email');visible(order,'#email-error')
   order.locator('#email').fill('alua@example.com');not_visible(order,'#email-error')
   order.locator('#order-date').fill('2020-01-01');visible(order,'#order-date-error')
   order.locator('#order-date').fill(order.evaluate('ChicLogic.dateAfter(1)'))
   order.locator('#order-time').fill('14:30')
   order.locator('#delivery').check();wait_effect(order);visible(order,'#delivery-address-group');not_visible(order,'#pickup-location-group')
   order.locator('#delivery-address').fill('short');visible(order,'#delivery-address-error')
   order.locator('#delivery-address').fill('Astana, Imanova 10a, apartment 2');not_visible(order,'#delivery-address-error')
   order.locator('#order-preview').click();visible(order,'#pay-store-error')
   order.locator('#pay-direct').check();not_visible(order,'#pay-store-error')
   order.locator('#order-message').fill('<img src=x onerror=alert(1)> A safe card message')
   order.locator('#order-consent').check();order.locator('#order-preview').click();wait_effect(order)
   visible(order,'#demo-reference');text(order,'#order-confirmation','No data has been sent')
   assert order.locator('#order-confirmation img').count()==0
   text(order,'#order-confirmation','<img src=x onerror=alert(1)>')
   expect(order.locator('#full-name')).to_have_value('');expect(order.locator('#phone')).to_have_value('')
   expect(order.locator('#order-consent')).not_to_be_checked()
   assert order.evaluate('document.activeElement.id')=='demo-confirmation-title'
   order.locator('#edit-order-details').click();wait_effect(order);expect(order.locator('#full-name')).to_have_value('Alua Test')
   order.locator('#order-consent').check();order.locator('#order-preview').click();wait_effect(order)
   order.locator('#dismiss-order-preview').click();wait_effect(order);not_visible(order,'#order-confirmation')
   order.locator('#order-preview').click();not_visible(order,'#order-confirmation');visible(order,'#full-name-error')
  check('Order full field validation, conditional rules, escaped summary, reset, edit and fade dismiss',validation_test)
  def privacy_test():
   saved=json.dumps(store(order));assert 'Alua Test' not in saved and 'alua@example.com' not in saved and '+7' not in saved
  check('Only cart identifiers and quantities are stored, not contact details',privacy_test)
  blog=load('blog.html',store(catalog))
  def blog_test():
   text(blog,'#article-count','3 of 3')
   blog.locator('#article-category').select_option('care');text(blog,'#article-count','1 of 3')
   blog.locator('#article-search').fill('zzzzzz');visible(blog,'#article-empty')
   blog.locator('#article-reset').click();text(blog,'#article-count','3 of 3')
   blog.locator('#comment-submit').click();visible(blog,'#comment-name-error')
   blog.locator('#comment-name').fill('Alua');blog.locator('#comment-article').select_option('flower-care');blog.locator('#comment-rating').select_option('5')
   blog.locator('#comment-text').fill('short');visible(blog,'#comment-text-error')
   payload='<b>Useful advice</b> about water and keeping flowers fresh.'
   blog.locator('#comment-text').fill(payload);not_visible(blog,'#comment-text-error')
   blog.locator('#comment-submit').click();assert blog.locator('#comment-list [data-comment-id]').count()==1
   assert blog.locator('#comment-list b').count()==0; text(blog,'#comment-list',payload)
   expect(blog.locator('#comment-text')).to_have_value('')
   blog.locator('[data-comment-action=edit]').click();blog.locator('#comment-text').fill('Updated comment: this article was useful for caring for roses.')
   blog.locator('#comment-submit').click();text(blog,'#comment-list','Updated comment')
   blog.locator('[data-comment-action=remove]').click();blog.locator('[data-comment-action=cancel]').click()
   assert blog.locator('#comment-list [data-comment-id]').count()==1
   blog.locator('[data-comment-action=remove]').click();blog.locator('[data-comment-action=confirm]').click();visible(blog,'#comment-empty')
  check('Journal search and full comment add/edit/cancel/remove, counter and safe text',blog_test)
  blocked=load('catalog.html',{},blocked=True)
  def blocked_test():
   blocked.locator('[data-add-id="premium-pink-symphony"]').click();cartqty(blocked,1)
   assert 'premium-pink-symphony~1' in blocked.evaluate('decodeURIComponent(Chic.checkoutURL())')
  check('Blocked-storage fallback still selects products and produces a transfer URL',blocked_test)
  corrupt=load('catalog.html',{'chic-flowers-cart-v1':'not json'})
  check('Malformed saved JSON recovers without script errors',lambda:cartqty(corrupt,0))
  tampered=load('catalog.html',{'chic-flowers-cart-v1':json.dumps([{'id':'not-a-product','quantity':1},{'id':'premium-pink-symphony','quantity':999}])})
  check('Unknown products removed and stored quantity clamped',lambda:cartqty(tampered,9))
  for filename in ['index.html','catalog.html','order.html','blog.html']:
   for width in [375,768,1440]:
    page=load(filename,store(catalog),width=width)
    def responsive_test(page=page,filename=filename,width=width):
     assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),f'{filename} overflow at {width}'
     assert page.evaluate('(()=>{const ids=[...document.querySelectorAll("[id]")].map(x=>x.id);return ids.length===new Set(ids).size})()')
     if width==375:
      page.locator('.navbar-toggler').click();page.wait_for_timeout(400);visible(page,'#mainNav');page.locator('.navbar-toggler').click();page.wait_for_timeout(400)
     page.evaluate('window.scrollTo(0,document.body.scrollHeight)');page.wait_for_timeout(150);page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(600)
     assert page.evaluate('[...document.images].filter(x=>x.complete && x.naturalWidth===0).length')==0
     if width in [375,1440]:
      out=ROOT/'evidence/jquery-previews';out.mkdir(exist_ok=True)
      page.screenshot(path=str(out/f'{Path(filename).stem}-{width}.png'),full_page=False)
    check(f'{filename}: {width}px, unique IDs, no overflow/broken loaded images, mobile nav',responsive_test)
    page.close()
  check('No application JavaScript exceptions in tested interactions',lambda: (_ for _ in ()).throw(AssertionError(report['application_errors'])) if report['application_errors'] else None)
  report['passed']=True
 except Exception as e:
  report['passed']=False;report['failure']=str(e);traceback.print_exc()
 finally:
  (ROOT/'evidence/jquery-browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
  print('CHECKS',len(report['checks']),'ERRORS',report['application_errors'],'CONSOLE',report['console_errors'][:5],flush=True)
  browser.close()
if not report.get('passed'):raise SystemExit(1)
