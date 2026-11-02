"""Generate an optional jQuery source map after editing script line numbers."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
rows=[
 ('CDN version / dependency order','index.html','<!-- jQuery 3.7.1 full build'),
 ('DOM-ready wrapper','js/main.js','$(function () {'),
 ('Rewrite 1: cards comparison','js/main.js','// REWRITE 1:'),
 ('Rewrite 2: show/hide comparison','js/catalog.js','// REWRITE 2:'),
 ('Rewrite 3: validation comparison','js/order.js','// REWRITE 3:'),
 ('Original plain JS: product renderer','js/old-js-version.js','    function renderProductCard'),
 ('Original plain JS: show/hide confirmation','js/old-js-version.js',"    clear.addEventListener('click'"),
 ('Original plain JS: order form','js/old-js-version.js',"/* Gauhar's page: basket editing"),
 ('ID selector','js/order.js',"const $form = $('#order-form')"),
 ('Class selector','js/main.js',"if (!window.bootstrap) $('.navbar-toggler')"),
 ('Element selector + each','js/main.js',"$('img').each"),
 ('Attribute selector + delegation + this + closest','js/main.js',"$('main').on('click.chic'"),
 ('Filter :checked / live checkbox property','js/order.js',"receive: $form.find('input[name=\"receive\"]:checked')"),
 ('Traversal .find() / chain of three, explained','js/main.js','// Chain: find the status'),
 ('Traversal .parent()','js/catalog.js',".insertAfter($total.parent())"),
 ('Traversal .siblings()','js/main.js',"$input.siblings('label')"),
 ('Traversal .each() / selected class','js/main.js',"$('article[data-product-id]').each"),
 ('Second chain of 3+ methods','js/order.js',"$confirmation.stop(true, true).empty().addClass"),
 ('.text() for safe values','js/main.js',"return $(`<${tag}>`).addClass(classes).text(text)"),
 ('.html() only trusted fixed notice','js/order.js',"const $notice = C.el('p').html("),
 ('.val() reads and trims input','js/order.js',"return { name: f.name.val().trim()"),
 ('.attr() sets product metadata','js/main.js',".attr({ id: `${prefix}-${product.id}`"),
 ('.prop() controls disabled / required','js/order.js',"f.location.prop({ disabled:"),
 ('State classes add/remove/toggle','js/main.js','function message('),
 ('.hasClass() for panel state','js/order.js',"visible === $panel.hasClass('hidden')"),
 ('Array rendering using .append()','js/main.js','function renderProducts('),
 ('Delegation explanation for new cards','js/main.js','// Delegation: main exists now'),
 ('Delegated basket-row handler','js/catalog.js',"$list.on('click', 'button[data-cart-action]'"),
 ('submit event + preventDefault explanation','js/order.js',"$form.on('submit'"),
 ('input/change events + this','js/order.js',"$form.on('input change'"),
 ('keydown event','js/catalog.js',"$prompt.on('keydown'"),
 ('fadeIn + slideDown, duration and callback','js/main.js','function reveal('),
 ('fadeOut + slideUp, class restoration','js/main.js','function conceal('),
 ('Effect callback focuses clear confirmation','js/catalog.js',"C.reveal($prompt, 'slide'"),
 ('Fade-in success callback','js/order.js',"C.reveal($confirmation, 'fade'"),
 ('Fade-out dismiss action','js/order.js',"$confirmation.on('click', '#dismiss-order-preview'"),
 ('Native attributes preserved / server validation note','js/order.js','// required/type/min/max stay'),
 ('All-field validation','js/order.js','function collectErrors('),
 ('Phone and email format','js/logic.js','    function validatePhone('),
 ('Field errors beside inputs','js/main.js','function fieldError('),
 ('Clear stale error on edit','js/order.js','const invalid = validateFields();'),
 ('First invalid focus','js/order.js','C.focus(invalid[0][0]);'),
 ('Success then reset only after valid result','js/order.js','clearDetails(); // Reset AFTER'),
 ('Generated local comment cards / text safety','js/blog.js','function renderComment('),
 ('Comment add/edit/remove delegation','js/blog.js',"$commentList.on('click'"),
 ('Freeze verifier (upload baseline, not old tag)','tests/verify-jquery.py',"for name,expected in baseline['css'].items()"),
]
lines=['# jQuery requirement map','',
 'Optional source navigation for the final jQuery assignment; not a required written report. Regenerate after editing with `python tests/update-jquery-checklist.py`.','',
 '| Requirement | File and start line |','| --- | --- |']
for label,path,needle in rows:
 text=(root/path).read_text().splitlines()
 indices=[i+1 for i,line in enumerate(text) if needle in line]
 if not indices:raise ValueError((path,needle))
 lines.append(f'| {label} | `{path}:{indices[0]}` |')
lines+=['','Full original modules are labeled in `old-js-version.js`; that file is never linked. Pure `data.js` / `logic.js` do not manipulate the DOM.',
        'All CSS is unchanged from the uploaded working tree. See README for pre-existing differences from its historical midterm tag.',
        'The current live defense must demonstrate real interactions, not merely the presence of these method names.','']
(root/'JQUERY_CHECKLIST.md').write_text('\n'.join(lines))
print('Mapped',len(rows),'requirements')
