'use strict';

// Run from the project root: node --test tests/logic.test.cjs
// Uses only Node's built-in test runner; no browser, package install or server.
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/data.js');
require('../js/logic.js');

const { products, categories, settings } = globalThis.ChicData;
const L = globalThis.ChicLogic;
const firstId = 'premium-hydrangea-cloud';
const secondId = 'mono-pink-blossom-basket-s';

test('canonical catalog contains 38 unique options belonging to 36 arrangements', () => {
    assert.equal(products.length, 38);
    assert.equal(new Set(products.map((product) => product.id)).size, 38);
    assert.equal(new Set(products.map((product) => product.groupId)).size, 36);
    assert.deepEqual(categories.map((category) => category.id), ['premium', 'mono', 'boxes']);
    assert.deepEqual(categories.map((category) =>
        products.filter((product) => product.category === category.id).length), [12, 13, 13]);
    for (const product of products) {
        assert.equal(typeof product.name, 'string');
        assert.ok(product.name.length > 0);
        assert.ok(product.description.length > 0);
        assert.ok(product.image.startsWith('img/'));
        assert.ok(Number.isSafeInteger(product.price) && product.price > 0);
        assert.ok(categories.some((category) => category.id === product.category));
        assert.equal(typeof product.size, 'string');
    }
});

test('prices use visible midterm cards and stale basket-only options are absent', () => {
    assert.equal(L.findProduct('boxes-rosy-symphony').price, 75000);
    assert.equal(L.findProduct('boxes-pink-celebration').price, 45000);
    assert.equal(L.findProduct('boxes-royal-bloom-alt').price, 40000);
    assert.equal(L.findProduct('boxes-royal-bloom').price, 48500);
    for (const removedId of ['premium-sweet-harmony', 'mono-pure-elegance', 'boxes-grand-romance']) {
        assert.equal(L.findProduct(removedId), undefined);
    }
    assert.equal(L.findProduct('not-a-product'), undefined);
});

test('size options have separate IDs and correct prices without merging basket lines', () => {
    const small = L.findProduct('mono-pink-blossom-basket-s');
    const medium = L.findProduct('mono-pink-blossom-basket-m');
    assert.equal(small.groupId, medium.groupId);
    assert.notEqual(small.id, medium.id);
    assert.deepEqual([small.size, small.price, medium.size, medium.price], ['S', 14500, 'M', 20500]);
    const boxSmall = L.findProduct('boxes-pastel-harmony-s');
    const boxLarge = L.findProduct('boxes-pastel-harmony-l');
    assert.equal(boxSmall.groupId, boxLarge.groupId);
    assert.deepEqual([boxSmall.size, boxSmall.price, boxLarge.size, boxLarge.price], ['S', 19000, 'L', 25500]);
    const totals = L.calculateCart([{id: small.id, quantity: 1}, {id: medium.id, quantity: 1}]);
    assert.equal(totals.lines.length, 2);
    assert.equal(totals.quantity, 2);
    assert.equal(totals.total, 35000);
});

test('search, category and maximum price work together with trimming and case folding', () => {
    const options = {query: '  PASTEL HARMONY  ', category: 'boxes', maxPrice: 20000, sort: 'price-asc'};
    assert.deepEqual(L.filterProducts(products, options).map((product) => product.id), ['boxes-pastel-harmony-s']);
    assert.deepEqual(L.filterProducts(products, {...options, category: 'mono'}), []);
    assert.deepEqual(L.filterProducts(products, {...options, maxPrice: 18000}), []);
    assert.deepEqual(L.filterProducts(products, {query: 'calla lilies'}).map((product) => product.id), ['premium-pink-blossom']);
    assert.deepEqual(L.filterProducts(products, {query: 'hydrangea mix'}).map((product) => product.id), ['boxes-royal-bloom-alt']);
});

test('price and name sorting return new arrays without changing the catalog', () => {
    const originalIds = products.map((product) => product.id);
    const ascending = L.filterProducts(products, {sort: 'price-asc'});
    const descending = L.filterProducts(products, {sort: 'price-desc'});
    const byName = L.filterProducts(products, {sort: 'name'});
    assert.notEqual(ascending, products);
    assert.equal(ascending[0].id, 'mono-pink-blossom-basket-s');
    assert.equal(descending[0].id, 'mono-pink-royalty');
    for (let index = 1; index < products.length; index += 1) {
        assert.ok(ascending[index - 1].price <= ascending[index].price);
        assert.ok(descending[index - 1].price >= descending[index].price);
        assert.ok(byName[index - 1].name.localeCompare(byName[index].name) <= 0);
    }
    assert.deepEqual(products.map((product) => product.id), originalIds);
});

test('budget boundary and no-results states return the correct arrays', () => {
    assert.deepEqual(L.filterProducts(products, {maxPrice: 14499}), []);
    assert.deepEqual(L.filterProducts(products, {maxPrice: 14500}).map((product) => product.id), [secondId]);
    assert.deepEqual(L.filterProducts(products, {query: 'nonexistent arrangement xyz'}), []);
    assert.deepEqual(L.filterProducts([], {category: 'boxes'}), []);
    assert.equal(L.filterProducts(products, {}).length, products.length);
});

test('basket calculation uses catalog prices for line subtotals, quantity and total', () => {
    const totals = L.calculateCart([
        {id: firstId, quantity: 2, price: 1},
        {id: secondId, quantity: 3, subtotal: -999}
    ]);
    assert.deepEqual(totals.lines.map((line) => [line.id, line.quantity, line.subtotal]), [
        [firstId, 2, 70000], [secondId, 3, 43500]
    ]);
    assert.equal(totals.quantity, 5);
    assert.equal(totals.total, 113500);
    assert.equal(totals.lines[0].product, L.findProduct(firstId));
    assert.deepEqual(L.calculateCart([]), {lines: [], quantity: 0, total: 0});
    assert.equal(L.formatMoney(113500), '113,500 KZT');
    assert.equal(L.formatMoney(0), '0 KZT');
});

test('normalization rejects invalid containers, unknown IDs and invalid quantities', () => {
    for (const raw of [null, undefined, {}, 'not an array', 12]) {
        assert.deepEqual(L.normaliseCart(raw), []);
    }
    const raw = [null, false, 'bad entry', {},
        {id: 'unknown-product', quantity: 1},
        {id: '__proto__', quantity: 1},
        {id: firstId, quantity: 1.5},
        {id: firstId, quantity: '2'},
        {id: firstId, quantity: 0},
        {id: firstId, quantity: -1},
        {id: firstId, quantity: NaN},
        {id: firstId, quantity: Infinity},
        {id: secondId, quantity: 2}
    ];
    assert.deepEqual(L.normaliseCart(raw), [{id: secondId, quantity: 2}]);
});

test('normalization merges duplicates, clamps a SKU and does not mutate input', () => {
    const raw = [{id: firstId, quantity: 4}, {id: firstId, quantity: 7}, {id: secondId, quantity: 8}];
    const original = structuredClone(raw);
    assert.deepEqual(L.normaliseCart(raw), [
        {id: firstId, quantity: settings.maxPerItem}, {id: secondId, quantity: 8}
    ]);
    assert.deepEqual(raw, original);
    assert.deepEqual(L.normaliseCart([{id: firstId, quantity: 999999}]), [{id: firstId, quantity: 9}]);
});

test('normalization enforces the 30-item basket cap across different SKUs', () => {
    const raw = products.slice(0, 5).map((product) => ({id: product.id, quantity: 9}));
    const normalized = L.normaliseCart(raw);
    assert.deepEqual(normalized.map((line) => line.quantity), [9, 9, 9, 3]);
    assert.equal(L.calculateCart(raw).quantity, settings.maxItems);
    assert.ok(normalized.every((line) => line.quantity <= settings.maxPerItem));
    assert.deepEqual(L.normaliseCart(normalized), normalized);
});

test('name validation trims whitespace, accepts letters and enforces length', () => {
    for (const value of ['  Alua Kurmanbay  ', 'Гаухар Мұхаметбай', 'A-B']) {
        assert.equal(L.validateName(value), '');
    }
    for (const value of ['', ' \t\n ', ' A ', '12345', 'A'.repeat(61)]) {
        assert.notEqual(L.validateName(value), '');
    }
    assert.equal(L.validateName('A'.repeat(60)), '');
});

test('Kazakhstan phone validation accepts supported formats and rejects malformed plus signs', () => {
    for (const value of ['+77058885622', '8 (705) 888-56-22', '  +7 (705) 888-56-22  ', '77058885622']) {
        assert.equal(L.validatePhone(value), '', value);
    }
    for (const value of ['', '   ', '+7+7058885622', '++77058885622', '+87058885622',
        '+17058885622', '7058885622', '+770588856221', '+7 abc 888 5622', '7705.888.5622']) {
        assert.notEqual(L.validatePhone(value), '', value);
    }
});

test('optional email accepts empty input but validates every entered address', () => {
    assert.equal(L.validateEmail(''), '');
    assert.equal(L.validateEmail('   '), '');
    assert.notEqual(L.validateEmail('', true), '');
    assert.equal(L.validateEmail('  student@example.com '), '');
    assert.equal(L.validateEmail('student+flowers@example.kz'), '');
    for (const value of ['name', 'name@', 'name@example', 'a@@example.com', 'a b@example.com', 'a@example.c', `${'a'.repeat(250)}@example.com`]) {
        assert.notEqual(L.validateEmail(value), '', value);
    }
});

test('Astana date changes exactly at UTC 19:00 and dateAfter uses that calendar', () => {
    const beforeMidnight = new Date('2026-10-26T18:59:59Z');
    const midnight = new Date('2026-10-26T19:00:00Z');
    assert.equal(L.todayInAstana(beforeMidnight), '2026-10-26');
    assert.equal(L.todayInAstana(midnight), '2026-10-27');
    assert.equal(L.dateAfter(1, beforeMidnight), '2026-10-27');
    assert.equal(L.dateAfter(1, midnight), '2026-10-28');
    assert.equal(L.dateAfter(30, midnight), '2026-11-26');
    assert.notEqual(L.validateDate('2026-10-26', midnight), '');
    assert.equal(L.validateDate('2026-10-27', midnight), '');
});

test('preferred dates include today and day 30, reject past, day 31 and impossible dates', () => {
    const now = new Date('2026-10-26T12:00:00Z');
    assert.equal(L.validateDate('2026-10-26', now), '');
    assert.equal(L.validateDate('2026-11-25', now), '');
    assert.notEqual(L.validateDate('2026-10-25', now), '');
    assert.notEqual(L.validateDate('2026-11-26', now), '');
    for (const value of ['', 'not-a-date', '2026-2-03', '2026-02-30', '2026-13-01', '2026-11-31']) {
        assert.notEqual(L.validateDate(value, now), '', value);
    }
    assert.equal(L.validateDate('2028-02-29', new Date('2028-02-20T10:00:00Z')), '');
    assert.notEqual(L.validateDate('2027-02-29', new Date('2027-02-20T10:00:00Z')), '');
});

test('random recommendation returns a real alternative without changing the pool', () => {
    const pool = products.slice(0, 3);
    const originalIds = pool.map((product) => product.id);
    for (let attempt = 0; attempt < 25; attempt += 1) {
        const result = L.randomItem(pool, pool[0].id);
        assert.ok(pool.includes(result));
        assert.notEqual(result.id, pool[0].id);
    }
    assert.deepEqual(pool.map((product) => product.id), originalIds);
    assert.equal(L.randomItem([], firstId), null);
    assert.equal(L.randomItem([pool[0]], pool[0].id), pool[0]);
});

test('demo reference is explicitly marked and contains Astana date and a six-digit suffix', () => {
    const instant = new Date('2026-10-26T19:00:00Z');
    const reference = L.createReference(instant);
    assert.match(reference, /^DEMO-20261027-[1-9]\d{5}$/);
    // Randomness is not tested as a uniqueness or reservation guarantee.
});
