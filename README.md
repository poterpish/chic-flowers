# Chic Flowers — Assignments 4 and 5

## Essential midterm corrections recorded before JavaScript implementation

The supplied HTML and CSS are frozen. Only deferred custom script links will be added to HTML. Corrections below are implemented through DOM updates and a single JavaScript data source; no CSS rules or original interface blocks are edited in source.

1. The old README and category badges say 39 arrangements / 41 options. Three cards are commented out in the supplied HTML: Sweet Harmony, Pure Elegance and Grand Romance. The active catalog actually has **36 arrangements / 38 purchasable size options**. JavaScript uses only those active items and derives counts instead of restoring commented-out cards.
2. Three visible product prices disagree with the old CSS basket and comparison table. The current visible card is the canonical supplied project price: Rosy Symphony **75,000 KZT** (stale basket 110,000); Pink Celebration **45,000 KZT** (stale basket 115,000); the second Royal Bloom, SKU `boxes-royal-bloom-alt`, **40,000 KZT** (stale basket 180,000). These are inherited project estimates, not newly verified shop quotations. The array, cards, comparison table, basket and order summary use the same values.
3. Two different products have the name Royal Bloom. A descriptive variant label distinguishes the hydrangea mix from the classic composition; their stable SKU IDs remain distinct.
4. The old static basket uses a CSS pseudo-element on `#basket-total`. The live DOM output receives a new ID so the obsolete CSS counter cannot append a second incorrect total. CSS itself remains unchanged.
5. Obsolete instructions that selections must be copied manually or cannot transfer without JavaScript are updated through DOM methods after scripts load. The original source remains the no-JavaScript fallback.
6. Image files and a Git repository were not supplied. Existing `img/` references are retained. Merge this package into the original repository and retain its photographs. Missing-image messages are graceful fallbacks, not replacement product photos or evidence that image assets passed verification.

These corrections receive no Assignment 4–5 feature credit. They make the inherited project consistent before the JavaScript features are assessed.

## Project and scope

The same four-page Chic Flowers student website for Astana continues the supplied midterm. The existing Bootstrap **5.3.3** CSS and official bundle remain in place. The added application code is plain JavaScript: no jQuery, extra framework, copied widget, database or backend.

This is a **front-end demonstration**. The site does not send personal form details or comments, create a real order or reservation, promise stock, process payments or authenticate a user. Contact the florist using the original phone/Instagram links to confirm a real purchase. Phone numbers, addresses, opening hours, photographs and catalog estimates are inherited project content; this work does not certify current business information.

## Functionality Plan

The table records assigned review/implementation ownership for the team. Substantial AI code assistance is disclosed in `AI_LOG.md`; each student must understand and personally review their contribution before making real commits.

| Page | Visitor goal | Planned and implemented function | Expected completed result | Responsible student |
| --- | --- | --- | --- | --- |
| Home | Find a suitable bouquet within a budget | Category + maximum-price finder using the canonical product array | Validated budget, matching count, up to six lowest-price suggestions, empty state, reset and link to all matches | Alua Kurmanbay |
| Home | Get inspiration and choose an item | Random recommendation excluding the previous option when possible | Actual catalog item with its price, Add/Order actions and another-suggestion button; no random discount or stock promise | Alua Kurmanbay |
| Catalog | Find and compare real project products | Connected search, category, optional price ceiling and sorting within categories | Matching count, no-results message, reset, valid category links and a comparison table from the same data | Alua Kurmanbay |
| Catalog | Build and revise a bouquet selection | Basket in the existing prepared `#basket` container | Add, increase, decrease, remove, clear with confirmation/cancel, line totals, quantity, subtotal, empty state and disabled empty checkout | Alua Kurmanbay; shared cart model reviewed by both |
| All pages | Keep the selection while browsing | Validated shared basket, navigation count and storage event synchronization | Basket survives normal navigation/reload and updates in another tab; corrupt data is ignored; blocked storage uses product-only URL transfer | Both students |
| Order | Check chosen products before proceeding | Live summary and basket quantity editing | Automatic transfer, read-only derived item list/quantity, matching line and total amounts, safe empty state | Gauhar Mukhametbay |
| Order | Prepare useful contact and fulfilment details | Field validation, conditional pickup/delivery rules, date/time checks and demo confirmation | Specific errors beside fields, first-invalid focus, live summary, detailed `DEMO-…` reference, edit/reset and clear no-server/no-order statement | Gauhar Mukhametbay |
| Blog | Find relevant flower advice | Search and topic filter over the three existing complete articles | Count, no-results state, reset, working article links and a relevant catalog next step | Gauhar Mukhametbay |
| Blog | Discuss an article and manage a comment | Validated local comments with one card renderer | Name, article, rating, trimmed text, character counter, automatic date/time, edit/cancel/remove, duplicate prevention and empty states | Gauhar Mukhametbay |

No login/registration pages existed, so fake accounts or unrelated password demos were not added. The order form includes preferred date/time rules where delivery or pickup planning logically requires them; no unrelated appointment system was invented.

## Completed visitor journeys

1. **Choose flowers:** Home finder or category → Catalog filters → Add → revise basket → Continue → Order validation → explicit demonstration summary → contact the shop manually.
2. **Get a gift idea:** Blog search/topic → full article → relevant category → product → basket → order preview.
3. **Discuss advice:** Read an article → Discuss this article → validated local comment → automatic dated card → edit, cancel or remove.
4. **Find the shop:** shared navigation → Order & Contact → original locations and direct phone/Instagram links.

The site never sends a call, email, social message or real order automatically. The visitor chooses whether to use an external contact link.

## Files and ownership

| File | Role |
| --- | --- |
| `js/data.js` | 38 canonical product options, categories and shared limits |
| `js/logic.js` | Pure filtering, calculation, normalization, random selection/reference and reusable validation |
| `js/main.js` | Shared DOM helpers, image fallback, basket state/storage, navigation count and reusable product-card renderer |
| `js/home.js`, `js/catalog.js` | Alua's page interactions |
| `js/order.js`, `js/blog.js` | Gauhar's page interactions |
| `css/alua.css`, `css/gauhar.css`, `css/base.css` | Original supplied files, byte-for-byte unchanged; base.css remains an inherited unused stylesheet |
| `docs/JAVASCRIPT_CHECKLIST.md` | Requirement mapping with exact source files and line numbers |
| `docs/SUBMISSION_RU.md` | Git stages, tag commands, real commit schedule and submission steps in Russian |
| `docs/ALUA_DEFENSE_RU.md` | Alua's explanation and live-change practice |
| `docs/GAUHAR_ORDER_DEFENSE_RU.md`, `docs/GAUHAR_BLOG_DEFENSE_RU.md` | Gauhar's explanation and live-change practice |
| `evidence/TEST_REPORT.md` | Actual checks, results and remaining asset/Git limitations |
| `tests/logic.test.cjs` | Dependency-free tests of the project logic |
| `tests/browser-check.cjs` | Optional development-only browser checks; not loaded by the website |
| `tests/verify-freeze.py`, `tests/check-assets.py` | Reproducible source freeze and local asset checks |

All four pages load `data.js`, `logic.js`, `main.js` and their page script with `defer`, in that order. Every application script starts with `'use strict';`. Open the final files with their normal names (`index.html`, not the downloaded attachment suffix).

## Project rules and calculations

- All monetary calculations use integer **KZT**. Each line is `product.price × quantity`; the displayed bouquet subtotal is the sum of all lines. No tax, discount or delivery charge is invented.
- Every size is a separate SKU. Products with identical display names remain distinct by ID and variant.
- The demo limit is **9 of each option and 30 arrangements total**. These are documented interface limits, not claims about real shop stock.
- Date/time checks use **Asia/Almaty**, the time zone used for Astana. The demo planning window is today through 30 days ahead, inclusive. For today, the chosen time must be later than the current local time.
- Pickup requires one of the two inherited locations. Delivery requires a complete Astana address with a building number and the preference to ask the florist about remote payment. This is a consistent demonstration flow, not a statement that the shop forbids every other payment method.
- Delivery charges and service coverage remain **to be confirmed**; a delivery preview never labels the bouquet subtotal as a final delivered price.
- Name: trimmed, 2–60 characters including a letter. Phone: supported Kazakhstan `+7`/`8` eleven-digit format. Email is optional but validated when supplied. Card notes are limited to 500 characters. Consent to the demonstration is required.
- Comments: valid display name, an existing article, a 1–5 helpfulness rating and 20–600 trimmed characters. Existing and edited local objects use the same `renderComment()` function. No fake customer reviews are seeded.

## State, safety and accessibility

Only `{id, quantity}` entries are persisted under `chic-flowers-cart-v1` in `localStorage`. Prices are always looked up in `data.js`, not trusted from a URL or storage. Contact details and comments remain in page memory; comments disappear on reload. No password fields or password storage exist.

For restricted storage, internal navigation carries the current basket using nonpersonal product IDs/quantities. A visible message explains the limitation. Checkout validates/normalizes the selection again. An unchanged repeated form submission keeps the same temporary demo reference; editing values or the basket invalidates the old summary.

Dynamic elements use `createElement`, `append`, `replaceChildren`, attributes and `textContent`/`createTextNode`. No application code uses HTML string insertion, `element.style`, generated CSS, inline event handlers, `eval`, `document.write`, `alert`, `var` or loose equality. Visual state changes use existing Bootstrap classes and the prepared `hidden`, `active`, `selected`, `error` and `success` classes through `classList`.

Actions use real buttons, labels identify inputs, field errors have `aria-describedby`/`aria-invalid`, live result/status messages use `aria-live`, and invalid submission focuses the first incorrect field. Basket row updates restore focus. Clear-basket confirmation supports Escape; buttons support native Enter/Space activation. Error and success messages contain explanatory text as well as colour.

## Run locally

Merge the package into the original repository and **keep the original `img/` directory**. Then open the repository with VS Code Live Server, or run:

```bash
python3 -m http.server 8000
```

Visit `http://localhost:8000/index.html`. A local HTTP server is recommended for predictable storage and links. The inherited Bootstrap CDN requires an internet connection. The app also includes a small class-based mobile-navigation fallback if the Bootstrap JS bundle fails to load; Bootstrap CSS is still required for the existing layout.

The website itself needs no build step or npm packages.

## Reproduce checks

```bash
node --test tests/logic.test.cjs
python3 tests/verify-freeze.py
python3 tests/check-assets.py
```

The asset checker intentionally fails until all referenced photographs exist. Do not remove that failure from evidence or claim images passed without restoring them.

Optional developer browser check: install Playwright in a separate development environment, run the server, set `CHIC_BASE_URL` to its address and execute `node tests/browser-check.cjs`. `CHIC_BROWSER_PATH` can point to an existing Chrome test binary. This dependency is only a test tool; no test framework is linked to the website. The recorded run uses the original Bootstrap CDN and documents the workspace certificate setting. See `evidence/TEST_REPORT.md` for actual observations.

For manual review, check each page at **375, 768 and 1440 px**, navigate with Tab/Enter/Space, submit invalid then valid forms, empty/reset each list, repeat add/remove/submit actions, check the browser console, and validate the actual submitted HTML/CSS with the W3C validators. Formal W3C certification is not claimed by this package.

## Assignment 4 and Assignment 5 milestones

The delivery includes a separate **Assignment 4 foundation snapshot** with data, pure logic, tests and only the relevant script links. Apply and review that stage first on a branch based on the real midterm tag, make authentic team commits, then tag that verified commit `assignment-4`. Assignment 5 adds the shared DOM layer and completed page interactions; apply the final snapshot afterward and tag the verified final commit `assignment-5`.

No Git repository was attached, so this work did **not** inspect the real midterm tag, create repository commits, create either assignment tag or verify remote authorship. The source freeze report proves consistency against the supplied attachments only. Compare against the actual tagged source before submission.

Each team member still needs **at least four meaningful personal commits across three actual days** and an individual defense. A single upload/commit cannot satisfy that requirement. Existing tags must not be force-moved, and dates/authors must not be fabricated. The Russian submission guide provides a practical schedule and conditional commands.
