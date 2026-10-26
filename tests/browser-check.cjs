'use strict';

// Development verification only: Playwright is not loaded by the website.
// Run a local server first. Optional CHIC_BROWSER_PATH selects a Chrome binary.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const baseURL = process.env.CHIC_BASE_URL || 'http://127.0.0.1:8765';
const report = { runAt: new Date().toISOString(), browser: '', checks: [],
    applicationErrors: [], consoleErrors: [], missingImages: [], failedResources: [],
    environmentNote: 'The test browser accepts the workspace proxy certificate for the existing Bootstrap CDN. No application security settings or source resources are changed.' };

async function main() {
    const browser = await chromium.launch({ headless: true,
        executablePath: process.env.CHIC_BROWSER_PATH || undefined,
        args: ['--no-sandbox'] });
    report.browser = await browser.version();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
    function observe(page) {
        page.on('pageerror', (error) => report.applicationErrors.push(error.message));
        page.on('console', (entry) => {
            if (entry.type() === 'error') report.consoleErrors.push({ text: entry.text(), url: entry.location().url });
        });
        page.on('response', (response) => {
            if (response.status() >= 400) {
                const target = response.url();
                if (target.includes('/img/')) report.missingImages.push(target);
                else report.failedResources.push(`${response.status()} ${target}`);
            }
        });
        page.on('requestfailed', (request) => report.failedResources.push(`${request.failure().errorText} ${request.url()}`));
    }
    const page = await context.newPage();
    observe(page);
    async function check(name, action) {
        await action();
        report.checks.push({ name, status: 'passed' });
        console.log(`PASS ${name}`);
    }
    try {
        await page.goto(`${baseURL}/index.html`);
        await check('Home finder, invalid input, empty result, reset and random recommendation', async () => {
            assert.match(await page.locator('#finder-count').textContent(), /matching options/);
            await page.locator('#finder-budget').fill('1');
            assert.match(await page.locator('#finder-count').textContent(), /^0 matching/);
            await page.locator('#finder-budget').fill('');
            await page.locator('#finder-form button[type="submit"]').click();
            assert.equal(await page.locator('#finder-budget').getAttribute('aria-invalid'), 'true');
            assert.equal(await page.evaluate(() => document.activeElement.id), 'finder-budget');
            await page.locator('#finder-reset').click();
            const first = await page.locator('#featured-results article').getAttribute('data-product-id');
            await page.locator('#featured-next').click();
            assert.notEqual(await page.locator('#featured-results article').getAttribute('data-product-id'), first);
        });
        await check('Home to catalog transfers shared basket and selected state', async () => {
            await page.locator('#finder-results [data-add-id]').first().click();
            assert.equal(await page.locator('#site-basket-link').textContent(), 'Basket (1)');
            await page.locator('#site-basket-link').click();
            await page.waitForURL('**/catalog.html#basket');
            assert.equal(await page.locator('#basket-items > li').count(), 1);
            assert.equal(await page.locator('article.selected').count(), 1);
        });
        await check('Catalog connected controls, empty state and reset', async () => {
            await page.locator('#catalog-category').selectOption('boxes');
            await page.locator('#catalog-search').fill('royal bloom');
            await page.locator('#catalog-sort').selectOption('price-asc');
            assert.match(await page.locator('#catalog-count').textContent(), /^2 of 38/);
            const prices = await page.locator('#catalog-boxes-results .fw-bold').allTextContents();
            assert.deepEqual(prices, ['40,000 KZT', '48,500 KZT']);
            await page.locator('#catalog-search').fill('zzzz-no-such-bouquet');
            assert.match(await page.locator('#catalog-count').textContent(), /^0 of 38/);
            assert.equal(await page.locator('#catalog-empty').isVisible(), true);
            await page.locator('#catalog-reset').click();
            assert.match(await page.locator('#catalog-count').textContent(), /^38 of 38/);
        });
        await check('Cart arithmetic, remove, clear cancellation and repeated quantities', async () => {
            await page.locator('#basket-clear').click();
            await page.locator('#basket-clear-cancel').click();
            assert.equal(await page.locator('#basket-items > li').count(), 1);
            await page.locator('#basket-clear').click();
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#basket-clear-prompt').isVisible(), false);
            await page.locator('#basket-clear').click();
            await page.locator('#basket-clear-confirm').click();
            assert.equal(await page.locator('#basket-checkout').isDisabled(), true);
            await page.locator('[data-add-id="premium-hydrangea-cloud"]').click();
            await page.locator('[data-add-id="boxes-spring-delight"]').click();
            await page.locator('[data-cart-action="increase"][data-product-id="premium-hydrangea-cloud"]').click();
            assert.equal(await page.locator('#basket-sum').textContent(), '85,500 KZT');
            assert.match(await page.locator('#basket-quantity').textContent(), /^3 arrangements/);
            await page.locator('[data-cart-action="decrease"][data-product-id="premium-hydrangea-cloud"]').click();
            assert.equal(await page.locator('#basket-sum').textContent(), '50,500 KZT');
        });
        await check('Checkout transfers items, validates fields, and confirms a demo only', async () => {
            await page.locator('#basket-checkout').click();
            await page.waitForURL('**/order.html*');
            assert.match(await page.locator('#order-live-totals').textContent(), /50,500 KZT/);
            await page.locator('#order-preview').click();
            assert.equal(await page.evaluate(() => document.activeElement.id), 'full-name');
            assert.equal(await page.locator('#full-name').getAttribute('aria-invalid'), 'true');
            await page.locator('#full-name').fill('  Test Visitor  ');
            await page.locator('#phone').fill('+7 705 888 5622');
            await page.locator('#email').fill('visitor@example.com');
            const tomorrow = await page.evaluate(() => ChicLogic.dateAfter(1));
            await page.locator('#order-date').fill(tomorrow);
            await page.locator('#order-time').fill('12:30');
            await page.locator('#pickup-location').selectOption({ index: 1 });
            await page.locator('#order-message').fill('<img src=x onerror="window.bad=1"> A personal card message.');
            await page.locator('#order-consent').check();
            await page.locator('#order-preview').click();
            assert.equal(await page.locator('#order-confirmation').isVisible(), true);
            assert.match(await page.locator('#order-confirmation').textContent(), /No data has been sent to a server/);
            assert.equal(await page.locator('#order-confirmation img').count(), 0);
            assert.equal(await page.evaluate(() => window.bad), undefined);
            const reference = await page.locator('#demo-reference').textContent();
            await page.locator('#order-preview').click();
            assert.equal(await page.locator('#demo-reference').textContent(), reference);
            const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
            assert.equal(stored.includes('Test Visitor'), false);
            assert.equal(stored.includes('visitor@example.com'), false);
        });
        await check('Delivery cross-field validation, stale confirmation removal and reset', async () => {
            await page.locator('#delivery').check();
            assert.equal(await page.locator('#order-confirmation').isVisible(), false);
            await page.locator('#order-preview').click();
            assert.equal(await page.locator('#delivery-address').getAttribute('aria-invalid'), 'true');
            assert.equal(await page.locator('#pay-store').getAttribute('aria-invalid'), 'true');
            await page.locator('#delivery-address').fill('Astana, Test Street 10, apartment 2');
            await page.locator('#pay-direct').check();
            await page.locator('#order-preview').click();
            assert.equal(await page.locator('#order-confirmation').isVisible(), true);
            assert.match(await page.locator('#order-confirmation').textContent(), /Delivery charges are not included/);
            await page.locator('#new-order-preview').click();
            assert.equal(await page.locator('#full-name').inputValue(), '');
            assert.equal(await page.locator('#quantity').inputValue(), '2');
            assert.equal(await page.locator('#order-confirmation').isVisible(), false);
        });
        await page.goto(`${baseURL}/blog.html`);
        await check('Journal search, topic filter and no-results reset', async () => {
            await page.locator('#article-category').selectOption('care');
            assert.match(await page.locator('#article-count').textContent(), /^1 of 3/);
            await page.locator('#article-search').fill('zzzzzz');
            assert.equal(await page.locator('#article-empty').isVisible(), true);
            await page.locator('#article-reset').click();
            assert.match(await page.locator('#article-count').textContent(), /^3 of 3/);
            assert.equal(await page.locator('.journal-article').count(), 3);
        });
        await check('Comments validate, render safe text and automatic time, edit and remove', async () => {
            await page.locator('#comment-submit').click();
            assert.equal(await page.evaluate(() => document.activeElement.id), 'comment-name');
            await page.locator('#comment-name').fill('  Demo Reader  ');
            await page.locator('#comment-article').selectOption('flower-care');
            await page.locator('#comment-rating').selectOption('5');
            const text = '<img src=x onerror="window.commentBad=1"> Helpful advice for caring for roses.';
            await page.locator('#comment-text').fill(text);
            assert.match(await page.locator('#comment-counter').textContent(), /600 characters/);
            await page.locator('#comment-submit').click();
            assert.equal(await page.locator('#journal-comment-1').count(), 1);
            assert.equal(await page.locator('#journal-comment-1 img').count(), 0);
            assert.equal(await page.evaluate(() => window.commentBad), undefined);
            assert.ok(await page.locator('#journal-comment-1 time').getAttribute('datetime'));
            assert.match(await page.locator('#journal-comment-1').textContent(), /Demo Reader/);
            await page.locator('#journal-comment-1 button[aria-label^="Edit"]').click();
            await page.locator('#comment-text').fill('Updated comment about keeping the bouquet in clean water.');
            await page.locator('#comment-submit').click();
            assert.match(await page.locator('#journal-comment-1').textContent(), /Updated comment/);
            assert.match(await page.locator('#journal-comment-1').textContent(), /Edited/);
            await page.locator('#comment-filter').selectOption('flowers-for-mom');
            assert.match(await page.locator('#comment-empty').textContent(), /No comments for this article/);
            await page.locator('#comment-show-all').click();
            await page.locator('#journal-comment-1 button[aria-label^="Remove"]').click();
            await page.locator('#confirm-delete-1').click();
            assert.match(await page.locator('#comment-empty').textContent(), /No comments yet/);
        });
        await check('Cross-tab shared basket synchronization', async () => {
            const second = await context.newPage();
            observe(second);
            await second.goto(`${baseURL}/catalog.html`);
            await second.locator('[data-add-id="boxes-blush-box"]').click();
            await page.waitForFunction(() => document.querySelector('#site-basket-link').textContent === 'Basket (3)');
            await second.close();
        });
        await check('Malformed stored data recovers without an application exception', async () => {
            await page.evaluate(() => localStorage.setItem('chic-flowers-cart-v1', '{broken'));
            await page.reload();
            assert.match(await page.locator('#site-feedback').textContent(), /Unreadable saved basket/);
            assert.equal(await page.locator('#site-basket-link').textContent(), 'Basket (0)');
        });
        await check('Tampered checkout is normalized using canonical prices and limits', async () => {
            await page.goto(`${baseURL}/order.html?cart=boxes-royal-bloom-alt~99,unknown~3`);
            assert.equal(await page.locator('#quantity').inputValue(), '9');
            assert.match(await page.locator('#order-live-totals').textContent(), /360,000 KZT/);
            assert.match(await page.locator('#site-feedback').textContent(), /corrected/);
        });
        await check('Blocked storage still transfers Home → Basket → Order via IDs only', async () => {
            const blocked = await browser.newContext({ ignoreHTTPSErrors: true });
            await blocked.addInitScript(() => {
                Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
            });
            const fallback = await blocked.newPage();
            observe(fallback);
            await fallback.goto(`${baseURL}/index.html`);
            await fallback.locator('#finder-results [data-add-id]').first().click();
            await fallback.locator('#site-basket-link').click();
            await fallback.waitForURL('**/catalog.html*');
            assert.equal(await fallback.locator('#basket-items > li').count(), 1);
            await fallback.locator('#basket-checkout').click();
            await fallback.waitForURL('**/order.html*');
            assert.equal(await fallback.locator('#quantity').inputValue(), '1');
            await blocked.close();
        });
        await check('Responsive widths, duplicate IDs, labels and mobile navigation', async () => {
            for (const width of [375, 768, 1440]) {
                await page.setViewportSize({ width, height: 900 });
                for (const name of ['index', 'catalog', 'order', 'blog']) {
                    await page.goto(`${baseURL}/${name}.html`);
                    const metrics = await page.evaluate(() => {
                        const ids = Array.from(document.querySelectorAll('[id]')).map((el) => el.id);
                        return {
                            width: document.documentElement.clientWidth,
                            content: document.documentElement.scrollWidth,
                            duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
                            invalidLabels: Array.from(document.querySelectorAll('label[for]'))
                                .filter((label) => !document.getElementById(label.htmlFor)).map((label) => label.htmlFor),
                            bootstrapReady: getComputedStyle(document.querySelector('.container')).maxWidth !== 'none'
                        };
                    });
                    assert.ok(metrics.content <= metrics.width + 1, `${name} overflows at ${width}: ${metrics.content}`);
                    assert.deepEqual(metrics.duplicateIds, [], `${name}: duplicate IDs`);
                    assert.deepEqual(metrics.invalidLabels, [], `${name}: broken labels`);
                    if (width >= 768) assert.equal(metrics.bootstrapReady, true, 'Existing Bootstrap CSS must load');
                    if (width === 375) {
                        await page.locator('.navbar-toggler').click();
                        assert.equal(await page.locator('.navbar-toggler').getAttribute('aria-expanded'), 'true');
                        await page.waitForFunction(() => document.querySelector('#mainNav').classList.contains('show'));
                        await page.locator('.navbar-toggler').click();
                        await page.waitForFunction(() => !document.querySelector('#mainNav').classList.contains('show')
                            && !document.querySelector('#mainNav').classList.contains('collapsing'));
                    }
                    if (process.env.CHIC_SCREENSHOT_DIR && width === 375) {
                        await page.screenshot({ path: path.join(process.env.CHIC_SCREENSHOT_DIR, `${name}-375.png`), fullPage: true });
                    }
                }
            }
        });
        assert.deepEqual(report.applicationErrors, []);
        const unexpectedConsole = report.consoleErrors.filter((entry) => !entry.url.includes('/img/'));
        assert.deepEqual(unexpectedConsole, [], 'Unexpected browser console errors');
        assert.deepEqual(report.failedResources, [], 'Unexpected failed resources');
        report.applicationChecksPassed = true;
    } catch (error) {
        report.applicationChecksPassed = false;
        report.failure = error.stack;
        throw error;
    } finally {
        report.missingImages = [...new Set(report.missingImages)];
        report.failedResources = [...new Set(report.failedResources)];
        report.consoleErrorCount = report.consoleErrors.length;
        report.qualification = report.missingImages.length > 0
            ? 'Application tests are separate from asset validation. Original img files were not supplied; restore them in the original repository and rerun before submission.'
            : 'Image resource requests passed in this run. Review current shop data and actual Git milestones separately.';
        const folder = path.join(__dirname, '..', 'evidence');
        fs.mkdirSync(folder, { recursive: true });
        fs.writeFileSync(path.join(folder, 'browser-results.json'), JSON.stringify(report, null, 2));
        await browser.close();
    }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
