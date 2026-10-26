"""Regenerate exact line references after any JavaScript edits."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]

def ref(file, text):
    for number, line in enumerate((root / file).read_text().splitlines(), start=1):
        if text in line:
            return f'`{file}:{number}`'
    raise ValueError(f'Missing checklist anchor: {file}: {text}')

def refs(*items):
    return '; '.join(ref(file, text) for file, text in items)

rows = [
    ('Folder, shared and page scripts; defer', refs(('index.html', 'js/data.js'), ('catalog.html', 'js/catalog.js'), ('order.html', 'js/order.js'), ('blog.html', 'js/blog.js')), 'data → logic → main → page; Home uses home.js.'),
    ('Strict mode and const/let', refs(('js/main.js', "'use strict'"), ('js/main.js', 'const CART_KEY'), ('js/main.js', 'let cart')), 'Every one of the seven application files has strict mode; state uses let, fixed bindings use const.'),
    ('Array of at least six objects / four meaningful properties', ref('js/data.js', '"products": ['), '38 SKU objects, each with id, groupId, name, category, price, image, description, size.'),
    ('Variables, arithmetic, operators', refs(('js/logic.js', 'subtotal: product.price *'), ('js/logic.js', 'total: lines.reduce')), 'Integer KZT line totals and whole-basket totals.'),
    ('Conditions and at least two logical operators', refs(('js/logic.js', "category === 'all' ||"), ('js/main.js', '!Number.isInteger(quantity) ||')), 'Meaningful ||, && and ! conditions for matching and bounded quantities.'),
    ('Strict equality and inequality', refs(('js/logic.js', 'product.id === id'), ('js/logic.js', 'item.id !== previousId')), 'Find the selected product and exclude a previous recommendation.'),
    ('Traversal/filter/find/transform/total', refs(('js/logic.js', 'function filterProducts'), ('js/logic.js', 'for (const entry'), ('js/logic.js', 'function calculateCart')), 'filter, find, for-of, map and reduce operate on actual catalog/cart data.'),
    ('Reusable function 1: findProduct(id) → object', ref('js/logic.js', 'function findProduct'), 'Used by normalization, calculation and basket actions.'),
    ('Reusable function 2: filterProducts(items, options) → array', ref('js/logic.js', 'function filterProducts'), 'Shared by Home and Catalog; sorting preserves the source array.'),
    ('Reusable function 3: calculateCart(cart) → totals', ref('js/logic.js', 'function calculateCart'), 'Calls normaliseCart and findProduct; returns lines, quantity and total.'),
    ('Reusable function 4: formatMoney(amount) → string', ref('js/logic.js', 'function formatMoney'), 'Consistent KZT formatting on every page.'),
    ('Additional reusable validators with parameters/returns', refs(('js/logic.js', 'function validateName'), ('js/logic.js', 'function validatePhone'), ('js/logic.js', 'function validateDate')), 'Specific messages or empty string for valid values.'),
    ('Meaningful Math.random()', refs(('js/logic.js', 'function randomItem'), ('js/logic.js', 'function createReference'), ('js/home.js', 'function suggestBouquet')), 'Actual product inspiration plus an explicitly temporary DEMO reference; no business promise.'),
    ('Reusable DOM product renderer', refs(('js/main.js', 'function renderProductCard'), ('js/main.js', 'function renderProducts')), 'One card function renders array products for catalog, finder and recommendation.'),
    ('DOM creation/removal and attributes', refs(('js/main.js', 'document.createElement'), ('js/main.js', 'container.replaceChildren()'), ('js/blog.js', 'function renderComments')), 'Nodes are created, appended/replaced and safely removed during list updates.'),
    ('Prepared hidden/active/selected/error/success states', refs(('js/main.js', 'function message'), ('js/main.js', "classList.toggle('selected'"), ('js/catalog.js', 'function updateCategoryLinks'), ('css/alua.css', '.hidden {')), 'Only prepared state classes and inherited Bootstrap classes; no new CSS or element.style.'),
    ('Catalog: connected controls/count/empty/reset', refs(('js/catalog.js', 'function readFilters'), ('js/catalog.js', 'function renderCatalog'), ('js/catalog.js', "reset.addEventListener('click'")), 'Search + category + optional budget + sort; matches and valid next actions.'),
    ('Home: complete budget selection flow', refs(('js/home.js', 'function validBudget'), ('js/home.js', 'function showMatches')), 'Input validation → matching options → add/order or no-results/reset.'),
    ('Cart in prepared container', refs(('catalog.html', 'id="basket"'), ('js/catalog.js', 'function renderBasket')), 'Uses the midterm basket; no new HTML source block or unprepared modal.'),
    ('Cart add/increase/decrease/remove/clear and limits', refs(('js/main.js', 'function addToCart'), ('js/main.js', 'function setQuantity'), ('js/main.js', 'function removeFromCart'), ('js/main.js', 'function clearCart')), 'Every mutation recalculates from canonical prices; 9 per SKU, 30 total.'),
    ('Empty cart, checkout disabled and transfer', refs(('js/catalog.js', 'checkout.disabled'), ('js/main.js', 'function checkoutURL'), ('js/order.js', 'submitButton.disabled')), 'Empty state on both pages; product IDs and quantities transfer without personal data.'),
    ('Site-wide basket and reload/other-tab behavior', refs(('js/main.js', 'function safeRead'), ('js/main.js', 'function safeWrite'), ('js/main.js', "addEventListener('storage'")), 'Malformed/blocked storage is handled; shared navigation count updates.'),
    ('Events: submit, click, input, change, keydown', refs(('js/order.js', "form.addEventListener('submit'"), ('js/catalog.js', "basketList.addEventListener('click'"), ('js/home.js', "budget.addEventListener('input'"), ('js/blog.js', "category.addEventListener('change'"), ('js/catalog.js', "clearPrompt.addEventListener('keydown'")), 'Real project interactions use addEventListener; Escape cancels basket clearing.'),
    ('Form: required trimmed name, phone, email/date/selection', refs(('js/order.js', 'function readValues'), ('js/order.js', 'function collectErrors')), 'More than four fields validated with specific field-level messages.'),
    ('Form: combined/cross-field rules', refs(('js/order.js', 'function validateTime'), ('js/order.js', "values.receive === 'delivery' && values.payment !== 'remote'")), 'Today requires a future Astana time; delivery needs address and remote-payment preference; quantity must match basket.'),
    ('Form: beside-field errors, first focus, stale errors', refs(('js/main.js', 'function fieldError'), ('js/order.js', 'function validateVisibleFields'), ('js/order.js', 'invalid[0][0].focus()')), 'aria-describedby/invalid and visible text; no alert validation.'),
    ('Form: useful demo summary and repeated submit', refs(('js/order.js', 'function showConfirmation'), ('js/order.js', 'lastSubmission.signature !== signature'), ('js/order.js', 'function resetDetails')), 'Itemized summary, unchanged repeat keeps reference, edit/reset invalidates old state, no real request.'),
    ('Journal article finder', refs(('js/blog.js', 'function filterArticles'), ('js/blog.js', 'function renderArticle')), 'Original complete articles retained; useful category/catalog links.'),
    ('Comments: shared renderer, date/rating/text', refs(('js/blog.js', 'function renderComment'), ('js/blog.js', 'function formatCommentDate')), 'Every existing/new/edited local object uses the same renderer; automatic timestamps.'),
    ('Comments: validation, length and counter', refs(('js/blog.js', 'function commentError'), ('js/blog.js', 'function updateCounter'), ('js/blog.js', 'function validateCommentForm')), 'Name, article and rating; 20–600 trimmed characters; first-invalid focus.'),
    ('Comments: edit/remove/duplicate and empty states', refs(('js/blog.js', 'function beginEdit'), ('js/blog.js', 'comments.splice(index, 1)'), ('js/blog.js', 'const duplicate = comments.find'), ('js/blog.js', 'function renderComments')), 'Local-only full lifecycle without fabricated real reviews.'),
    ('User text safety and no personal storage', refs(('js/main.js', 'element.textContent = text'), ('js/order.js', 'document.createTextNode(value)'), ('js/blog.js', "const comments = []")), 'User input is text, not HTML. Only basket IDs/quantities are persisted.'),
    ('Accessibility and responsive evidence', refs(('tests/browser-check.cjs', 'Responsive widths, duplicate IDs'), ('evidence/TEST_REPORT.md', '375 × 900')), 'All four pages checked at 375/768/1440; buttons, labels, feedback and focus scenarios.'),
    ('HTML/CSS freeze verification', refs(('tests/verify-freeze.py', 'actual = hashlib.sha256'), ('evidence/TEST_REPORT.md', 'Source freeze and permitted changes')), 'Only script additions; original CSS bytes preserved. Baseline is supplied attachments, not unseen Git tag.'),
    ('README plan and honest AI log', refs(('README.md', '## Functionality Plan'), ('AI_LOG.md', '2026-10-26')), 'Team responsibilities, expected outcomes, disclosed generated code and test evidence.'),
    ('Git tags/commit days/defense', refs(('README.md', '## Assignment 4 and Assignment 5 milestones'), ('docs/SUBMISSION_RU.md', 'git tag --list assignment-4')), 'User/repository actions remain required; no tags/history/defense claimed as performed.')
]

header = '''# JavaScript checklist — exact source references\n\nGenerated from the delivered source files. A reference such as `js/logic.js:40` means the exact first line of the relevant function/statement. Read the whole function when tracing the feature. Run `python3 tests/update-checklist.py` after code edits to refresh these numbers.\n\nThe runtime scripts are the seven files under `js/`; test dependencies are not website libraries.\n\n| Requirement | Exact file and line | Implementation / result |\n| --- | --- | --- |\n'''
table = '\n'.join(f'| {requirement} | {location} | {note.replace("|", "&#124;")} |' for requirement, location, note in rows)
(root / 'docs/JAVASCRIPT_CHECKLIST.md').write_text(header + table + '\n')
print(f'Generated {len(rows)} requirement mappings with current line numbers.')
