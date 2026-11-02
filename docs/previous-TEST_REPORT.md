# Verification evidence — Chic Flowers Assignments 4–5

## Actual result

Application verification passed: **17 pure-logic tests**, **13 browser scenario groups**, **7 JavaScript syntax checks** and **14 source/freeze checks**. Browser page exceptions: **0**. Non-image console errors: **0**.

This is not an unconditional submission-ready claim: **40 original image files were not supplied**, and the real Git repository/tag history was unavailable. The asset check correctly reports failure until the package is merged with the original images.

## Environment and time

- Recorded browser run: `2026-10-26T11:30:26.755Z` UTC; local user date 26 October 2026 (Asia/Qyzylorda).
- Browser: Chrome for Testing `156.0.8078.47`, driven by Playwright as a development tool only.
- Viewports: **375 × 900**, **768 × 900**, **1440 × 900**.
- Local HTTP server; original Bootstrap 5.3.3 CSS and official bundle loaded from their existing CDN.
- The test browser accepted the workspace proxy certificate for that CDN. The application source and user-facing security settings were not changed.
- Missing original photographs were **not** replaced by unrelated images or fake product photographs. Browser inspection used the explicit missing-photo messages.
- Images were not mocked as successful responses in the recorded end-to-end suite. Full-page screenshots were used only for internal visual inspection and are not presented as final design evidence with real photographs.

## Browser scenarios

| # | Scenario group | Result |
| --- | --- | --- |
| 1 | Home finder, invalid input, empty result, reset and random recommendation | PASS |
| 2 | Home to catalog transfers shared basket and selected state | PASS |
| 3 | Catalog connected controls, empty state and reset | PASS |
| 4 | Cart arithmetic, remove, clear cancellation and repeated quantities | PASS |
| 5 | Checkout transfers items, validates fields, and confirms a demo only | PASS |
| 6 | Delivery cross-field validation, stale confirmation removal and reset | PASS |
| 7 | Journal search, topic filter and no-results reset | PASS |
| 8 | Comments validate, render safe text and automatic time, edit and remove | PASS |
| 9 | Cross-tab shared basket synchronization | PASS |
| 10 | Malformed stored data recovers without an application exception | PASS |
| 11 | Tampered checkout is normalized using canonical prices and limits | PASS |
| 12 | Blocked storage still transfers Home → Basket → Order via IDs only | PASS |
| 13 | Responsive widths, duplicate IDs, labels and mobile navigation | PASS |

The responsive group visits all four pages at all three widths and checks document width, duplicate IDs, label targets, actual Bootstrap layout and mobile navigation. The Home/Catalog focused review also checks filtered and empty states, keyboard clearing, restored focus and filter persistence at 375/768 px.

## Source freeze and permitted changes

`freeze-baseline.json` contains SHA-256 digests of the exact attached files. `verify-freeze.py` removes only the four exact newly added deferred script lines from each delivered HTML file and checks the remaining bytes against its baseline. All three CSS files match their original SHA-256 hashes without any removal or normalization.

The prohibited-pattern scan covers all seven application JS files: strict mode required; no `var`, loose equality, HTML-string insertion, generated inline styles/events, `eval`, `document.write` or `alert` found. Syntax validation used `node --check`. The scan is evidence of these particular checks, not a general security certification.

## Browser console and asset limitation

The raw run captured **353 repeated console resource errors**, all HTTP 404 responses for original `/img/` photographs. There were **40 unique missing image paths**, **0 application exceptions**, and **0 other console errors**. Repeated navigation/filter rendering requested some photographs more than once. These missing assets remain a real release issue; an empty JavaScript exception list does not make the full console error-free.

`asset-results.json` lists the exact required paths, including filename case and the existing name containing a space. Preserve the original `img/` folder in the repository. If any files are also missing there, restore the corresponding original photographs, then rerun `python3 tests/check-assets.py` and browser checks. Do not submit with image 404 responses.

## Tests that ran

```bash
node --test --test-isolation=none tests/logic.test.cjs
python3 tests/verify-freeze.py
python3 tests/check-assets.py
node tests/browser-check.cjs
```

The first command's extra isolation flag is useful in the supplied Node runtime; ordinary `node --test tests/logic.test.cjs` also exits successfully. The asset command exits **1** in this image-less delivery workspace, as intended. The browser command requires an installed test browser and the local server; `CHIC_BASE_URL` and `CHIC_BROWSER_PATH` select them. The website itself requires neither Node nor Playwright.

## Matters not claimed as verified

- Original image appearance/availability after merging into your Git repository.
- The contents or immutability of the real `midterm` Git tag.
- `assignment-4` / `assignment-5` tags, remote pushes, student authorship or commits over three days. No repository was supplied and none of these actions were performed.
- Formal W3C validator certification of the actual final repository. Source bytes were preserved and dynamic DOM/labels were checked; run the validators on the repository before submission.
- Current real shop stock, quotations, delivery/payment policies or legal terms. The project preserves inherited estimates and clearly requires confirmation with the florist.
- Individual understanding and defense performance. The supplied Russian guides are preparation material, not a substitute for the defense.

## Reproducible evidence files

- `logic-results.txt`: 17 function tests and results.
- `syntax-results.txt`: all seven application JS files passed Node syntax checks.
- `freeze-baseline.json`, `freeze-results.json`, `freeze-results.txt`: exact attachment comparison and scan results.
- `browser-results.json`: actual browser scenario results, application exceptions, console resource errors and environment note.
- `asset-results.json`: exact missing local image resources.

Test assertions and scripts are included under `tests/`; they do not run for site visitors.
