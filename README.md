# Chic Flowers — final jQuery assignment

The same Chic Flowers website, repository, organization and four pages. The existing cream/green design and Bootstrap layout are retained. This stage rewrites the existing plain-JavaScript interface with **jQuery 3.7.1, full build**, loaded from its official CDN.

## Open the project

Open this folder in VS Code and start **Live Server** on `index.html`. Use the same server address and port for all four pages. Internet access is needed for the jQuery and Bootstrap CDNs. Opening separate `file://` pages can restrict browser storage; Live Server is recommended.

There is no build step, package installation, backend, database or payment gateway for the site itself. The optional automated tests are not loaded by any page.

## Pages and responsibility

| Student / shared part | Files | Visitor tasks |
| --- | --- | --- |
| Alua Kurmanbay | `index.html`, `js/home.js` | Find bouquets by budget and category; get another catalog suggestion; add a bouquet. |
| Alua Kurmanbay | `catalog.html`, `js/catalog.js` | Search/filter/sort products; change basket quantities; remove or clear items; proceed to the order form. |
| Gauhar Mukhametbay | `order.html`, `js/order.js` | Review/edit the shared basket; validate every applicable field; produce, dismiss or edit a local demonstration preview. |
| Gauhar Mukhametbay | `blog.html`, `js/blog.js` | Search articles; add, edit, filter and remove local demonstration comments. |
| Shared | `js/main.js` | jQuery DOM helpers, accessible messages, product-card renderer, delegated product buttons, persistent basket and navigation count. |
| Shared data / calculations | `js/data.js`, `js/logic.js` | Original product array, totals, bounded quantities and pure validators, unchanged for this stage. No DOM or handlers in these files. |

Ownership describes the team areas to understand and maintain, not a claim that AI-assisted code was independently written. See `AI_LOG.md`.

## What was rewritten

`js/old-js-version.js` preserves the actual supplied plain-JavaScript implementations, with labeled sections for the original files. It is **not linked to any page**. It is comparison material, not a second running implementation.

| Required rewrite | Original feature | Current jQuery version |
| --- | --- | --- |
| 1. A list built in code | `main.js`: `renderProductCard` and `renderProducts` | `js/main.js`: jQuery element creation, `.text()`, `.attr()`, `.append()` and one reusable card renderer. Generated product controls use delegation on the existing `main`. |
| 2. Show/hide a block | `catalog.js`: basket-clear confirmation | `js/catalog.js`: `.on()` plus `.slideDown()` / `.slideUp()` through shared effect helpers. A completion callback puts keyboard focus on the confirmation button. |
| 3. Main form validation | `order.js`: field reading, error output, input/change and submit handlers | `js/order.js`: `.val()`, `.prop()`, `.on()`, per-field messages and state classes, safe confirmation content, then contact-field reset. |

Each rewritten feature has a comparison comment. The comments distinguish shorter DOM access from validation rules that remain equally complex. Home and Blog interface code was also converted, so there is no competing native DOM implementation of the same feature.

The independent arrays, arithmetic, storage serialization and validators remain ordinary JavaScript. Using a pure calculation function from jQuery is not mixing DOM approaches: all active interface selection, creation, event binding and visual changes use jQuery.

## Working journeys

1. **Budget to order:** Home → choose a category and budget → find matches → add bouquets → Basket → adjust quantities → continue to Order → enter valid details → view a clearly labeled demonstration summary. The contact fields reset after success; the basket remains available for another preview.
2. **Compare and choose:** Catalog → combine search/category/maximum price/sort → see the matching count → add products → increase/decrease/remove → cancel or confirm a full basket clear. An empty basket disables checkout; impossible quantities are rejected.
3. **Read and discuss:** Blog → search/topic filter → read the full original article → Discuss this article → complete the comment form → see a dated local comment → edit it or confirm its removal. Comments are never presented as real published reviews.

## jQuery coverage

- The CDN script is before all application scripts; DOM modules run inside `$(function () { ... })`. Script files remain external and deferred.
- ID, class, element and attribute selectors; `:checked`, `:not(:disabled)` and `:focus` filters.
- Meaningful `.find()`, `.closest()`, `.parent()`, `.siblings()` and `.each()` traversal.
- `$(this)` in delegated product, basket, comment and input handlers; chains of three or more methods, including an explained chain in `main.js`.
- `.text()` for user values; `.html()` only for a fixed trusted demonstration notice; `.val()` for form values; `.attr()` for attributes; `.prop()` for live checkbox/disabled/required states.
- Existing `.hidden`, `.active`, `.selected`, `.error`, `.success` and existing Bootstrap classes; no new CSS rules and no `.css()` / `element.style` calls.
- All application handlers use `.on()`. Events include `click`, `submit`, `input`, `change`, `keydown`, `hashchange`, `storage` and the shared basket event.
- Product, basket and comment actions are delegated to parents that survive re-rendering. Old direct listeners are not also attached.
- Meaningful effects: slide filters and clear-confirmation panels; fade in a successful preview; fade it out when dismissed or superseded. Durations and completion callbacks are explicit.
- Effect methods temporarily set animation properties internally. After animation, callbacks restore the prepared state class and remove transient inline styles. No CSS rules or custom animation styles are generated.

`JQUERY_CHECKLIST.md` is an optional source map with exact line references, useful during practice. It is not a written report requirement.

## Main form validation

The order flow validates trimmed name, telephone format, optional non-empty email format, nonempty basket, calculated quantity, valid date/time, receiving method, applicable pickup/address field, payment preference, message length and demonstration consent.

For delivery, the address must include Astana and a building number; the demo requests the remote-payment preference. The planning window and quantity bounds are inherited **demo constraints**, not independently verified business policies. No fee, discount or stock promise is invented.

Errors appear beside the related field. Correcting a field clears its obsolete error; the first invalid field receives focus. Disabled, inapplicable controls do not block submission. Success is shown only after every check passes, and the editable form fields are then reset. The confirmation keeps a safe snapshot and can restore it for editing; consent must be checked again.

Native `required`, type and range attributes remain active on the main form. Direct `.on('invalid', ...)` handlers replace the browser's first popup with the full jQuery field-level feedback; the invalid form is still blocked by the browser. The `.on('submit', ...)` handler then checks every field, including constraints the browser cannot know, and prevents navigation. Native validity states are also inspected. Client checks are **never** a replacement for server validation in a real system.

## Data, privacy and real-world limitations

The supplied `data.js` is unchanged: **36 arrangements / 38 size options**, including two separately identified Royal Bloom variants. Product names, descriptions, photographs and prices come from the submitted project; they have not been independently reverified with the florist. The same product data drives cards, basket totals, price overview and order summary.

Only product IDs and quantities are stored in `localStorage`. Prices are looked up from the product array. Invalid stored entries are ignored and quantities are bounded. Storage failure uses an ID/quantity URL fallback; contact details never enter a URL or browser storage.

Comments live only in memory and disappear when the page reloads. Name, email, phone, address and messages are not sent to a server. No real order, payment, reservation, user account or public review is created. The random `DEMO-...` number identifies a preview only.

## HTML/CSS freeze — exact scope

For **this jQuery revision**, all three CSS files are byte-for-byte identical to the uploaded `chic-flowers.rar`. The four HTML files only gain the jQuery CDN script and a version comment. No interface element was manually added, removed or rewritten; new interface elements are created in the scripts.

**Important inherited difference:** the working-tree HTML/CSS in the submitted RAR was already different from its bundled Git `midterm` tag before this revision. This package preserves that supplied working tree; it cannot retroactively certify that earlier changes were allowed. See `evidence/inherited-midterm-audit.json`. Explain/document those earlier corrections with the teacher; do not move or recreate `midterm` to hide the difference.

The audit and `tests/verify-jquery.py` distinguish the uploaded baseline from the historical Git tag. Neither the existing tag nor the repository history was edited. `.git` is deliberately not included in the output ZIP: copy files into the existing repository instead of replacing its Git metadata.

## Verification

Current reproducible checks:

```text
node tests/logic.test.cjs
python tests/verify-jquery.py
python tests/jquery-browser-check.py --base http://127.0.0.1:5500 --browser PATH_TO_CHROME
```

The site itself needs none of these testing tools. Browser checks require Python Playwright. Current results are in `evidence/jquery-browser-results.json` and `evidence/jquery-freeze-results.json`; source previews are in `evidence/jquery-previews/`.

The build environment blocks top-level browser navigation. Automated interaction checks therefore used documents mounted in memory, the exact full jQuery 3.7.1 bytes, and an explicitly recorded local Bootstrap 5.3.6 test substitution for the unchanged 5.3.3 production CDN. Storage was injected for persistence scenarios. The test did not certify live CDN delivery or real browser cross-page storage. Run the short manual check below through Live Server on your own computer. The file records these limitations instead of presenting them as a live-site pass.

Historical files from the previous plain-JavaScript stage are preserved under `docs/` and in the inherited evidence/tests. Their old line references and test claims must not be used as current jQuery evidence.

## Final student check and submission

Through Live Server, open each page, confirm the console has no errors, open/close the phone menu, search for a nonexistent bouquet and reset, add two bouquets, change quantities, continue to Order and verify the same basket. Submit invalid details, correct them and verify the demo summary and reset. Test the Blog comment add/edit/remove flow. Repeat important interactions at 375px and desktop, using keyboard as well as mouse.

Submit in the **same** repository: updated external scripts, `old-js-version.js`, the four HTML files with their CDN link, updated README and AI log. This final jQuery brief does not require a written report, recording or a new named tag.

Each student still needs at least four meaningful commits across three real days and the live defense. This package does not fabricate commits, dates, student authorship or a successful defense. Keep the previous tags, especially `midterm`, unchanged. Disclose AI help and follow the teacher's current AI rules.

## Official documentation used for API verification

- https://releases.jquery.com/ — pinned jQuery 3.7.1 full build.
- https://api.jquery.com/ready/ — DOM-ready initialization.
- https://api.jquery.com/on/ — event binding and delegation.
- https://api.jquery.com/prop/ — properties versus attributes.
- https://api.jquery.com/html/ — trusted HTML insertion versus text.
- https://api.jquery.com/slideDown/ — effects, duration and completion callback.

## Defense practice: point to real code

Explain why `old-js-version.js` is not loaded; how the delegated `main` handler still works after filtering; why `.closest('article')` locates the clicked product; why `.prop('checked')` reads live state; why a visitor's comment is inserted with `.text()` rather than `.html()`; which callback returns focus after an effect; and why every validation rule must also exist on a real server.

Practice changing a fade duration, adding a card through the existing renderer, adding one validation rule and extending a jQuery chain. Both students should be able to explain either member's page.
