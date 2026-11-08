# Chic Flowers — Endterm Project

**Introduction to Web Technologies · JavaScript (weeks 6–8) and jQuery (weeks 9–10)**

Same four-page Chic Flowers website for Astana, Kazakhstan, continued in the **same Git repository**. The layout uses the existing Bootstrap 5.3.3 CDN and existing custom CSS. There is no server, database, live inventory, real checkout or payment integration.

## Pages and responsibility

| Page / module | Student responsible for understanding and maintaining it | Technology | What visitors can finish |
| --- | --- | --- | --- |
| `index.html` → `js/home.js` | **Alua Kurmanbay** | **Plain JavaScript only** for the gift planner | Select occasion, category, quantity and full budget; see calculated estimates, a matching bouquet list, a new suggestion and a path to the catalog |
| `catalog.html` → `js/catalog.js` | **Alua Kurmanbay** | **jQuery only** for the catalog and budget widget | Search, filter and sort; add/remove products, change quantities, calculate price; compare with a total spending limit and see suitable additions |
| `order.html` → `js/order.js` | **Gauhar Mukhametbay** | **jQuery only** | Edit the shared basket, choose delivery or pickup, validate contact/date/time, optionally preview a greeting card and receive an explicit **demonstration** summary |
| `blog.html` → `js/blog.js` | **Gauhar Mukhametbay** | **jQuery only** | Search articles, save/unsave them in a local reading list, add/edit/remove local demo comments with validation |
| `js/main.js` | **Shared** | jQuery | Accessible feedback, global basket, dynamic product rendering, delegation for buttons and basket count in navigation |
| `js/data.js`, `js/logic.js` | **Shared** | Plain JavaScript data and reusable calculations (no DOM manipulation) | Real supplied item data, find/filter/sort, cart total, date and validation helpers |

The file `js/old-js-version.js` is the **previous, unlinked** JavaScript implementation preserved for the earlier jQuery comparison assignment. It must **not** be included with a `<script>` tag.

## What is NEW since the previous defended assignments

Repeating an existing feature without an extension does not count in this endterm. These are the new tasks added **after** the previous plain-JS/jQuery work:

| Earlier behavior | Endterm extension and why it is useful |
| --- | --- |
| Home had a category + per-bouquet budget finder and random idea | **Plain JS gift planner** now considers the *occasion*, the *number* of arrangements and the visitor's **overall** spending limit. It shows a calculated subtotal and remaining money for an individual suggestion, with a reusable dynamically generated card and event delegation. |
| Catalog already supported search, basket totals and quantity editing | **Total-budget checker** now compares the complete basket against the chosen limit and, when possible, lists additional bouquets that fit the money remaining. It also handles over-budget and no-suggestions cases. |
| Order already validated contact/delivery preferences and showed a demo confirmation | **Optional greeting-card editor** now enables/disables a separate field, checks its length, shows a live text preview, includes it in the final demonstration summary and restores it when editing. |
| Blog already had article search and local demo comments | **Saved-articles reading list** now lets a visitor save/unsave article IDs, filter to saved articles and revisit links. It has an empty state and retains article IDs in the same browser when storage is available. |

All those new form fields, buttons, lists and sections are built **by scripts**, not handwritten into the HTML. Existing HTML/CSS from the uploaded working copy were kept unchanged.

## Three complete visitor journeys

1. **Plan and review a flower gift:** Home → choose occasion, total budget and bouquet count → inspect suggestions and their calculated subtotal → add a bouquet → Catalog basket → adjust quantity and overall budget → Order → fill valid details → optional greeting message → read the clearly labelled demo summary or edit it.
2. **Compare products:** Catalog → search and change category, price and sort → view the result count or an empty-state explanation → reset filters if necessary → add bouquets, increase/decrease/remove, or clear with confirmation → compare the full basket to a chosen spending limit → proceed to Order.
3. **Get inspiration and save it:** Home → Blog → search a gift idea or flower-care article → save it for later → show saved-only → return to the original article → optionally leave/edit/delete an explicitly local demonstration comment → browse catalog products from the article.

**No paid order is placed.** Only product IDs/quantities are stored in local browser storage (unless disabled). Names, phone numbers, addresses and greeting messages stay on the current page; nothing is transmitted to the florist. All totals are **bouquet estimates** that exclude delivery and any other unconfirmed charges. The `DEMO-...` reference identifies a local preview, not a reservation.

## Project architecture / JavaScript vs jQuery

- `js/data.js`: array of **38 product-size options from 36 arrangements** provided in the project, with IDs, names, categories, prices, descriptions and image paths. Two Royal Bloom products remain distinct because they have different IDs and prices. This project does not claim live stock availability.
- `js/logic.js`: pure functions with parameters and return values, using loops, `filter`, `find`, arithmetic, validation, `===`, `!==`, logical operators, and `Math.random()` for a **noncommercial demo suggestion/reference**.
- `js/home.js`: **Vanilla DOM** APIs `createElement`, `append`, `replaceChildren`, `textContent`, `classList`; delegated click on dynamically created estimate buttons; `submit`, `change`, `input` and `click` listeners. No jQuery calls in this feature.
- `js/catalog.js`, `js/order.js`, `js/blog.js`, `js/main.js`: jQuery 3.7.1, wrapped in `$(function () { ... })`, use `.on()`, `.find()`, `.closest()`, `.siblings()`, `.each()`, `.val()`, `.prop()`, `.append()`, `.text()`, effects with duration and completion callbacks. jQuery uses `.html()` only for a fixed, trusted explanatory notice—not visitor data.
- The **basket is a distinct shared jQuery feature** exposed through the `Chic` interface. Home creates its own suggestion cards with Vanilla JS; their Add buttons are intentionally handled by the existing shared basket's delegated click listener, rather than duplicating cart logic.
- All visual state changes use prepared `.hidden`, `.selected`, `.error`, `.success`, `.active` or Bootstrap classes. The endterm revision adds **no CSS rules** or handwritten HTML interface elements.

## Getting started

1. Copy the updated files into your **existing** `chic-flowers` Git project; do not replace or delete `.git`.
2. Open the folder in VS Code, right-click `index.html` and select **Open with Live Server**. Keep the same host/port for all pages.
3. The app uses **Bootstrap 5.3.3 and jQuery 3.7.1 over CDNs**, so the browser needs internet access. Check DevTools Console for failed loads.
4. Explore every user journey and verify links, amounts, empty states, validation, keyboard controls and navigation on phone (about 375px), tablet (768px) and desktop.

## Verification completed in this build environment

- `node tests/logic.test.cjs` — **17 pure-logic tests passed**.
- `python tests/check-assets.py` — **49 local image/asset references found**.
- `node --check js/*.js` (run file-by-file) — active script syntax checked without errors.
- `python tests/endterm-browser-check.py` — isolated automated interactions passed for home, catalog, order and blog plus horizontal-overflow checks at 375px, 768px and 1440px, with no JS page/console errors **in that environment**. Detailed machine results in `evidence/endterm-browser-results.json`.

**Testing limitation:** because of this build environment's network/browser restrictions, the browser test loads a local jQuery full build and a local Bootstrap test asset in place of the production CDNs. It uses an injected browser-storage substitute. This does **not** prove your real Live Server can fetch CDN files or preserve cart state across actual page navigations. Please test locally before submission. These tests also do not replace the official **W3C HTML validator**.

## Important: midterm HTML/CSS freeze

In **this endterm edit**, the four `.html` and three `.css` files are **byte-identical to your newly uploaded RAR**. New UI was created by JavaScript only, so this endterm edit does not itself add handwritten HTML/CSS.

However, the uploaded RAR **already contained HTML/CSS differences relative to the Git `midterm` tag** (notably catalog, order, blog and CSS). These changes predate this endterm pass, so it would be misleading to claim the entire working tree is strictly identical to the frozen midterm. Essential earlier midterm corrections must be documented and discussed with your instructor; they do **not** earn new-feature points. Never move or overwrite the historical `midterm` tag. See `evidence/endterm-uploaded-baseline.json` and `evidence/endterm-midterm-diff.txt`.

## Final quality pass and submission

**Both students must do this themselves**, ideally at least two days before the deadline: Alua checks order/blog, Gauhar checks home/catalog; test every actual link and interaction, both wrong and valid form values, empty and repeated actions, mobile layout and console. Record findings and genuine fixes in your own log. Automated tests do **not** replace this cross-check.

This endterm requires **no separate written report or recording**. Submit the **same** shared repository with working plain JS + jQuery files, this README and your accurate `AI_LOG.md`. After both students commit real work from their own accounts across **at least four commits on three different days each**, and after the quality pass, create the final tag:

```bash
git status
git pull origin main
git push origin main
git tag endterm
git push origin endterm
```

Only tag when the working tree is clean, the uploaded repository is truly final and the `endterm` tag does not already exist. Do not manufacture commits or dates. At the defense both partners need to explain either technology and any page, trace an input to its result and make live code changes without AI assistance.

## Data and AI disclosure

The project continues using its uploaded bouquet information, image paths, shop phone, locations and opening hours; current prices and stock were **not independently verified** with Chic Flowers. The new Endterm source code, troubleshooting, automated tests and README were **AI-assisted** at the student's request. See the AI log, review and understand every change, and follow your teacher's rules for AI use and source attribution.
