# JavaScript checklist — exact source references

Generated from the delivered source files. A reference such as `js/logic.js:40` means the exact first line of the relevant function/statement. Read the whole function when tracing the feature. Run `python3 tests/update-checklist.py` after code edits to refresh these numbers.

The runtime scripts are the seven files under `js/`; test dependencies are not website libraries.

| Requirement | Exact file and line | Implementation / result |
| --- | --- | --- |
| Folder, shared and page scripts; defer | `index.html:14`; `catalog.html:17`; `order.html:18`; `blog.html:18` | data → logic → main → page; Home uses home.js. |
| Strict mode and const/let | `js/main.js:1`; `js/main.js:8`; `js/main.js:11` | Every one of the seven application files has strict mode; state uses let, fixed bindings use const. |
| Array of at least six objects / four meaningful properties | `js/data.js:7` | 38 SKU objects, each with id, groupId, name, category, price, image, description, size. |
| Variables, arithmetic, operators | `js/logic.js:62`; `js/logic.js:67` | Integer KZT line totals and whole-basket totals. |
| Conditions and at least two logical operators | `js/logic.js:22`; `js/main.js:136` | Meaningful &#124;&#124;, && and ! conditions for matching and bounded quantities. |
| Strict equality and inequality | `js/logic.js:9`; `js/logic.js:73` | Find the selected product and exclude a previous recommendation. |
| Traversal/filter/find/transform/total | `js/logic.js:16`; `js/logic.js:42`; `js/logic.js:58` | filter, find, for-of, map and reduce operate on actual catalog/cart data. |
| Reusable function 1: findProduct(id) → object | `js/logic.js:8` | Used by normalization, calculation and basket actions. |
| Reusable function 2: filterProducts(items, options) → array | `js/logic.js:16` | Shared by Home and Catalog; sorting preserves the source array. |
| Reusable function 3: calculateCart(cart) → totals | `js/logic.js:58` | Calls normaliseCart and findProduct; returns lines, quantity and total. |
| Reusable function 4: formatMoney(amount) → string | `js/logic.js:12` | Consistent KZT formatting on every page. |
| Additional reusable validators with parameters/returns | `js/logic.js:99`; `js/logic.js:107`; `js/logic.js:126` | Specific messages or empty string for valid values. |
| Meaningful Math.random() | `js/logic.js:71`; `js/logic.js:79`; `js/home.js:140` | Actual product inspiration plus an explicitly temporary DEMO reference; no business promise. |
| Reusable DOM product renderer | `js/main.js:205`; `js/main.js:252` | One card function renders array products for catalog, finder and recommendation. |
| DOM creation/removal and attributes | `js/main.js:14`; `js/main.js:254`; `js/blog.js:384` | Nodes are created, appended/replaced and safely removed during list updates. |
| Prepared hidden/active/selected/error/success states | `js/main.js:26`; `js/main.js:268`; `js/catalog.js:111`; `css/alua.css:63` | Only prepared state classes and inherited Bootstrap classes; no new CSS or element.style. |
| Catalog: connected controls/count/empty/reset | `js/catalog.js:97`; `js/catalog.js:141`; `js/catalog.js:180` | Search + category + optional budget + sort; matches and valid next actions. |
| Home: complete budget selection flow | `js/home.js:69`; `js/home.js:74` | Input validation → matching options → add/order or no-results/reset. |
| Cart in prepared container | `catalog.html:668`; `js/catalog.js:284` | Uses the midterm basket; no new HTML source block or unprepared modal. |
| Cart add/increase/decrease/remove/clear and limits | `js/main.js:133`; `js/main.js:148`; `js/main.js:163`; `js/main.js:169` | Every mutation recalculates from canonical prices; 9 per SKU, 30 total. |
| Empty cart, checkout disabled and transfer | `js/catalog.js:313`; `js/main.js:174`; `js/order.js:250` | Empty state on both pages; product IDs and quantities transfer without personal data. |
| Site-wide basket and reload/other-tab behavior | `js/main.js:69`; `js/main.js:86`; `js/main.js:332` | Malformed/blocked storage is handled; shared navigation count updates. |
| Events: submit, click, input, change, keydown | `js/order.js:448`; `js/catalog.js:326`; `js/home.js:107`; `js/blog.js:152`; `js/catalog.js:350` | Real project interactions use addEventListener; Escape cancels basket clearing. |
| Form: required trimmed name, phone, email/date/selection | `js/order.js:148`; `js/order.js:175` | More than four fields validated with specific field-level messages. |
| Form: combined/cross-field rules | `js/order.js:165`; `js/order.js:205` | Today requires a future Astana time; delivery needs address and remote-payment preference; quantity must match basket. |
| Form: beside-field errors, first focus, stale errors | `js/main.js:35`; `js/order.js:314`; `js/order.js:457` | aria-describedby/invalid and visible text; no alert validation. |
| Form: useful demo summary and repeated submit | `js/order.js:341`; `js/order.js:344`; `js/order.js:391` | Itemized summary, unchanged repeat keeps reference, edit/reset invalidates old state, no real request. |
| Journal article finder | `js/blog.js:93`; `js/blog.js:103` | Original complete articles retained; useful category/catalog links. |
| Comments: shared renderer, date/rating/text | `js/blog.js:322`; `js/blog.js:313` | Every existing/new/edited local object uses the same renderer; automatic timestamps. |
| Comments: validation, length and counter | `js/blog.js:242`; `js/blog.js:259`; `js/blog.js:265` | Name, article and rating; 20–600 trimmed characters; first-invalid focus. |
| Comments: edit/remove/duplicate and empty states | `js/blog.js:294`; `js/blog.js:362`; `js/blog.js:412`; `js/blog.js:384` | Local-only full lifecycle without fabricated real reviews. |
| User text safety and no personal storage | `js/main.js:16`; `js/order.js:336`; `js/blog.js:162` | User input is text, not HTML. Only basket IDs/quantities are persisted. |
| Accessibility and responsive evidence | `tests/browser-check.cjs:213`; `evidence/TEST_REPORT.md:13` | All four pages checked at 375/768/1440; buttons, labels, feedback and focus scenarios. |
| HTML/CSS freeze verification | `tests/verify-freeze.py:24`; `evidence/TEST_REPORT.md:39` | Only script additions; original CSS bytes preserved. Baseline is supplied attachments, not unseen Git tag. |
| README plan and honest AI log | `README.md:22`; `AI_LOG.md:3` | Team responsibilities, expected outcomes, disclosed generated code and test evidence. |
| Git tags/commit days/defense | `README.md:117`; `docs/SUBMISSION_RU.md:125` | User/repository actions remain required; no tags/history/defense claimed as performed. |
