# Earlier jQuery Assignment 4 checklist (historical)

**The line references below describe the preceding jQuery submission and are not the updated Endterm source map.** For the current version, see `ENDTERM_CODE_MAP.md`. This earlier list is retained only to compare the course stages.

# jQuery requirement map

Optional source navigation for the final jQuery assignment; not a required written report. Regenerate after editing with `python tests/update-jquery-checklist.py`.

| Requirement | File and start line |
| --- | --- |
| CDN version / dependency order | `index.html:14` |
| DOM-ready wrapper | `js/main.js:4` |
| Rewrite 1: cards comparison | `js/main.js:149` |
| Rewrite 2: show/hide comparison | `js/catalog.js:194` |
| Rewrite 3: validation comparison | `js/order.js:82` |
| Original plain JS: product renderer | `js/old-js-version.js:215` |
| Original plain JS: show/hide confirmation | `js/old-js-version.js:873` |
| Original plain JS: order form | `js/old-js-version.js:911` |
| ID selector | `js/order.js:5` |
| Class selector | `js/main.js:233` |
| Element selector + each | `js/main.js:238` |
| Attribute selector + delegation + this + closest | `js/main.js:186` |
| Filter :checked / live checkbox property | `js/order.js:76` |
| Traversal .find() / chain of three, explained | `js/main.js:179` |
| Traversal .parent() | `js/catalog.js:142` |
| Traversal .siblings() | `js/main.js:36` |
| Traversal .each() / selected class | `js/main.js:175` |
| Second chain of 3+ methods | `js/order.js:208` |
| .text() for safe values | `js/main.js:14` |
| .html() only trusted fixed notice | `js/order.js:207` |
| .val() reads and trims input | `js/order.js:74` |
| .attr() sets product metadata | `js/main.js:153` |
| .prop() controls disabled / required | `js/order.js:118` |
| State classes add/remove/toggle | `js/main.js:25` |
| .hasClass() for panel state | `js/order.js:113` |
| Array rendering using .append() | `js/main.js:168` |
| Delegation explanation for new cards | `js/main.js:184` |
| Delegated basket-row handler | `js/catalog.js:185` |
| submit event + preventDefault explanation | `js/order.js:255` |
| input/change events + this | `js/order.js:232` |
| keydown event | `js/catalog.js:204` |
| fadeIn + slideDown, duration and callback | `js/main.js:53` |
| fadeOut + slideUp, class restoration | `js/main.js:62` |
| Effect callback focuses clear confirmation | `js/catalog.js:197` |
| Fade-in success callback | `js/order.js:215` |
| Fade-out dismiss action | `js/order.js:270` |
| Native attributes preserved / server validation note | `js/order.js:25` |
| All-field validation | `js/order.js:84` |
| Phone and email format | `js/logic.js:107` |
| Field errors beside inputs | `js/main.js:30` |
| Clear stale error on edit | `js/order.js:237` |
| First invalid focus | `js/order.js:253` |
| Success then reset only after valid result | `js/order.js:268` |
| Generated local comment cards / text safety | `js/blog.js:118` |
| Comment add/edit/remove delegation | `js/blog.js:144` |
| Freeze verifier (upload baseline, not old tag) | `tests/verify-jquery.py:9` |

Full original modules are labeled in `old-js-version.js`; that file is never linked. Pure `data.js` / `logic.js` do not manipulate the DOM.
All CSS is unchanged from the uploaded working tree. See README for pre-existing differences from its historical midterm tag.
The current live defense must demonstrate real interactions, not merely the presence of these method names.
