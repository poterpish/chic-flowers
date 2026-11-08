"""Endterm behavior smoke tests (test-only tooling, not loaded by the website).
Run from the project root with a local HTTP server on port 8765:
    python -m http.server 8765
    python tests/endterm-browser-check.py
Testing runs on isolated source documents due local browser navigation policy.
"""
from pathlib import Path
from datetime import datetime, timezone
import json
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
JQUERY = '/opt/pyvenv/lib/python3.13/site-packages/nbclassic/static/components/jquery/dist/jquery.min.js'
BOOTSTRAP_CSS = '/opt/imagemagick/share/doc/ImageMagick-7/www/assets/bootstrap.min.css'
BOOTSTRAP_JS = '/opt/imagemagick/share/doc/ImageMagick-7/www/assets/bootstrap.bundle.min.js'
BASE = 'http://127.0.0.1:8765/'
report={'time_utc':datetime.now(timezone.utc).isoformat(),'checks':[],'page_errors':[],'console_errors':[],
        'limitations':['Isolated HTML loaded with base URL from local HTTP server; actual CDN requests replaced with locally installed assets.',
                       'Test jQuery local full build and Bootstrap test asset may differ from production CDN; use Live Server manually.',
                       'The browser uses an injected localStorage stub for page-to-page basket tests.']}

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1000})
    context.route('https://code.jquery.com/**',lambda r:r.fulfill(path=JQUERY,content_type='application/javascript',headers={'Access-Control-Allow-Origin':'*'}))
    def bootstrap(route):
        css='.css' in route.request.url
        route.fulfill(path=BOOTSTRAP_CSS if css else BOOTSTRAP_JS,content_type='text/css' if css else 'application/javascript')
    context.route('https://cdn.jsdelivr.net/**',bootstrap)
    def load(name, initial=None, width=1440):
        page=context.new_page()
        page.set_viewport_size({'width':width,'height':950})
        page.on('pageerror',lambda error:report['page_errors'].append(f'{name}: {error}'))
        page.on('console',lambda msg:report['console_errors'].append(f'{name}: {msg.text}') if msg.type=='error' else None)
        page.evaluate('''(initial) => { const mem={...initial};window.__memory=mem;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return mem[k]??null},setItem(k,v){mem[k]=String(v)},removeItem(k){delete mem[k]},clear(){Object.keys(mem).forEach(k=>delete mem[k])}}}) }''',initial or {})
        html=(ROOT/name).read_text(encoding='utf8').replace('<head>',f'<head><base href="{BASE}">',1)
        page.set_content(html,wait_until='domcontentloaded',timeout=25000)
        page.wait_for_function('typeof Chic === "object"',timeout=10000)
        return page
    def checked(label, action):
        action();report['checks'].append(label);print('PASS:',label,flush=True)
    def storage(page):
        return page.evaluate('window.__memory')
    def totals(page):
        return page.evaluate('Chic.getTotals()')

    home=load('index.html')
    def home_test():
        expect(home.locator('#finder-occasion')).to_be_visible()
        home.locator('#finder-quantity').fill('2')
        home.locator('#finder-budget').fill('100000')
        home.locator('#finder-occasion').select_option('romance')
        assert home.locator('#finder-results article').count()>0
        home.locator('#finder-results button[data-estimate-id]').first.click()
        expect(home.locator('#gift-estimate')).to_contain_text('Budget remaining')
        home.locator('#finder-results button[data-add-id]').first.click()
        assert totals(home)['quantity']==2
        home.locator('#finder-budget').fill('')
        expect(home.locator('#finder-error')).to_be_visible()
        home.locator('#finder-reset').click()
        expect(home.locator('#finder-quantity')).to_have_value('1')
        before=home.locator('#featured-results article').get_attribute('data-product-id')
        home.locator('#featured-next').click()
        assert before!=home.locator('#featured-results article').get_attribute('data-product-id')
    checked('Vanilla JS gift planner, total, delegation, cart handoff, invalid/reset, another suggestion',home_test)

    catalog=load('catalog.html',storage(home))
    def catalog_test():
        assert totals(catalog)['quantity']==2
        catalog.locator('#catalog-category').select_option('boxes')
        catalog.locator('#catalog-search').fill('royal bloom')
        expect(catalog.locator('#catalog-count')).to_contain_text('2 of 38')
        catalog.locator('#catalog-search').fill('zzzzzzzzzz')
        expect(catalog.locator('#catalog-empty')).to_be_visible()
        catalog.locator('#catalog-reset').click()
        catalog.wait_for_timeout(250)
        expect(catalog.locator('#catalog-count')).to_contain_text('38 of 38')
        catalog.locator('#basket-budget').fill('100000')
        expect(catalog.locator('#basket-budget-status')).to_contain_text('Remaining')
        assert catalog.locator('#basket-budget-candidates button[data-add-id]').count()>0
        catalog.locator('#basket-budget-candidates button[data-add-id]').first.click()
        catalog.wait_for_function('Chic.getTotals().quantity === 3')
        assert totals(catalog)['quantity']==3
        catalog.locator('#basket-budget').fill('1')
        expect(catalog.locator('#basket-budget-status')).to_contain_text('exceeds')
        catalog.locator('#basket-budget').fill('-1')
        expect(catalog.locator('#basket-budget-error')).to_be_visible()
        catalog.locator('#basket-budget').fill('200000')
        catalog.locator('#basket-items button[data-cart-action="decrease"]').first.click()
        assert totals(catalog)['quantity']==2
        catalog.locator('#basket-clear').click()
        catalog.wait_for_timeout(230)
        expect(catalog.locator('#basket-clear-prompt')).to_be_visible()
        catalog.locator('#basket-clear-cancel').click()
        catalog.wait_for_timeout(230)
        assert totals(catalog)['quantity']==2
    checked('jQuery catalog search, empty state, basket changes, budget helper and clearing',catalog_test)

    order=load('order.html',storage(catalog))
    def order_test():
        assert totals(order)['quantity']==2
        expect(order.locator('#include-gift-card')).to_be_visible()
        order.locator('#include-gift-card').check()
        expect(order.locator('#gift-card-fields')).to_be_visible()
        order.locator('#gift-card-text').fill('Thank you for everything!')
        expect(order.locator('#gift-card-preview')).to_contain_text('Thank you for everything!')
        order.locator('#order-preview').click()
        expect(order.locator('#full-name-error')).to_be_visible()
        order.locator('#full-name').fill('Alua Kurmanbay')
        order.locator('#phone').fill('+7 705 888 5622')
        order.locator('#email').fill('alua@example.com')
        day=order.evaluate('ChicLogic.dateAfter(1)')
        order.locator('#order-date').fill(day)
        order.locator('#order-time').fill('15:00')
        order.locator('#pickup-location').select_option(index=1)
        order.locator('#order-consent').check()
        order.locator('#order-preview').click()
        expect(order.locator('#demo-confirmation-title')).to_be_visible()
        expect(order.locator('#order-confirmation')).to_contain_text('Thank you for everything!')
        expect(order.locator('#full-name')).to_have_value('')
        order.locator('#edit-order-details').click()
        order.wait_for_timeout(250)
        expect(order.locator('#full-name')).to_have_value('Alua Kurmanbay')
        expect(order.locator('#gift-card-text')).to_have_value('Thank you for everything!')
    checked('jQuery form field validation, gift card preview, demo confirmation and restore',order_test)

    blog=load('blog.html')
    def blog_test():
        expect(blog.locator('#reading-list-status')).to_contain_text('0 saved')
        blog.locator('#article-results button[data-save-article]').first.click()
        expect(blog.locator('#reading-list-status')).to_contain_text('1 saved')
        blog.locator('#article-saved-toggle').click()
        assert blog.locator('#article-results article').count()==1
        blog.locator('#reading-list-items button[data-unsave-id]').click()
        expect(blog.locator('#reading-list-status')).to_contain_text('0 saved')
        expect(blog.locator('#article-empty')).to_be_visible()
        blog.locator('#article-saved-toggle').click()
        blog.locator('#article-search').fill('zzzzunknown')
        expect(blog.locator('#article-empty')).to_be_visible()
        blog.locator('#article-reset').click()
        expect(blog.locator('#article-results article')).to_have_count(3)
        blog.locator('#comment-name').fill('Gauhar')
        blog.locator('#comment-article').select_option(index=1)
        blog.locator('#comment-rating').select_option('5')
        blog.locator('#comment-text').fill('Very helpful advice for a lovely flower gift.')
        blog.locator('#comment-submit').click()
        expect(blog.locator('#comment-count')).to_contain_text('1 of 1')
        blog.locator('#comment-list button[data-comment-action="edit"]').click()
        blog.locator('#comment-text').fill('Updated helpful advice about flowers and gifts.')
        blog.locator('#comment-submit').click()
        expect(blog.locator('#comment-list')).to_contain_text('Updated helpful advice')
    checked('jQuery bookmarks and comments add/edit/filter, search and empty states',blog_test)

    for width in (375,768,1440):
        for name in ('index.html','catalog.html','order.html','blog.html'):
            page=load(name,width=width)
            page.wait_for_timeout(100)
            size=page.evaluate('({scroll: document.documentElement.scrollWidth, width:window.innerWidth})')
            if size['scroll']>size['width']+1: raise AssertionError(f'overflow {name}@{width}: {size}')
            page.close()
        checked(f'No sideways overflow at width {width} on any of four pages',lambda:None)
    if report['page_errors'] or report['console_errors']:
        raise RuntimeError(f'Browser console/page errors: {report["page_errors"]}, {report["console_errors"]}')
    for page in (home,catalog,order,blog):page.close()
    browser.close()

out=ROOT/'evidence'/'endterm-browser-results.json'
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('PASS all',len(report['checks']),'checks; no page/console errors',flush=True)
