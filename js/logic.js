'use strict';

// Assignment 4: pure project logic. These functions can run without a page.
// Reused by both students; DOM and events belong to Assignment 5 files.
(() => {
    const { products, settings } = globalThis.ChicData;

    function findProduct(id) {
        return products.find((product) => product.id === id);
    }

    function formatMoney(amount) {
        return `${new Intl.NumberFormat('en-GB').format(amount)} KZT`;
    }

    function filterProducts(items, options = {}) {
        const query = (options.query || '').trim().toLocaleLowerCase();
        const category = options.category || 'all';
        const maxPrice = options.maxPrice === undefined ? Infinity : Number(options.maxPrice);
        const result = items.filter((product) => {
            const text = `${product.name} ${product.description} ${product.size}`.toLocaleLowerCase();
            return (category === 'all' || product.category === category)
                && (query === '' || text.includes(query))
                && product.price <= maxPrice;
        });
        switch (options.sort) {
            case 'price-asc':
                return result.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
            case 'price-desc':
                return result.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
            default:
                return result.sort((a, b) => a.name.localeCompare(b.name) || a.price - b.price);
        }
    }

    // Only valid product IDs and bounded whole quantities enter the cart.
    // Prices are always looked up in data.js, never trusted from storage or URLs.
    function normaliseCart(raw) {
        if (!Array.isArray(raw)) return [];
        const result = [];
        let totalQuantity = 0;
        for (const entry of raw.slice(0, 200)) {
            if (!entry || typeof entry !== 'object' || !findProduct(entry.id)) continue;
            if (!Number.isInteger(entry.quantity) || entry.quantity <= 0) continue;
            const existing = result.find((line) => line.id === entry.id);
            const previous = existing ? existing.quantity : 0;
            const quantity = Math.min(entry.quantity, settings.maxPerItem - previous,
                settings.maxItems - totalQuantity);
            if (quantity <= 0) continue;
            if (existing) existing.quantity += quantity;
            else result.push({ id: entry.id, quantity });
            totalQuantity += quantity;
        }
        return result;
    }

    // Calls normaliseCart and findProduct: one source for all three totals.
    function calculateCart(cart) {
        const lines = normaliseCart(cart).map((entry) => {
            const product = findProduct(entry.id);
            return { product, id: entry.id, quantity: entry.quantity,
                subtotal: product.price * entry.quantity };
        });
        return {
            lines,
            quantity: lines.reduce((total, line) => total + line.quantity, 0),
            total: lines.reduce((total, line) => total + line.subtotal, 0)
        };
    }

    function randomItem(items, previousId = '') {
        if (items.length === 0) return null;
        const alternatives = items.filter((item) => item.id !== previousId);
        const pool = alternatives.length > 0 ? alternatives : items;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // A temporary, non-secure demo label. It never reserves flowers or stock.
    function createReference(date = new Date()) {
        const datePart = todayInAstana(date).replaceAll('-', '');
        const randomPart = Math.floor(Math.random() * 900000) + 100000;
        return `DEMO-${datePart}-${randomPart}`;
    }

    function todayInAstana(date = new Date()) {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: settings.timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(date);
        const part = (type) => parts.find((entry) => entry.type === type).value;
        return `${part('year')}-${part('month')}-${part('day')}`;
    }

    function dateAfter(days, date = new Date()) {
        const result = new Date(`${todayInAstana(date)}T12:00:00Z`);
        result.setUTCDate(result.getUTCDate() + days);
        return result.toISOString().slice(0, 10);
    }

    function validateName(value) {
        const name = value.trim();
        if (name.length === 0) return 'Enter your name; spaces alone do not count.';
        if (name.length < 2 || name.length > 60) return 'Use 2–60 characters for your name.';
        if (!/\p{L}/u.test(name)) return 'Include at least one letter in your name.';
        return '';
    }

    function validatePhone(value) {
        const phone = value.trim();
        if (phone === '') return 'Enter a Kazakhstan phone number.';
        if (!/^\+?[\d\s()-]+$/.test(phone)) return 'Use digits, spaces, brackets or hyphens, with at most one + at the beginning.';
        const digits = phone.replace(/\D/g, '');
        if (!/^[78]\d{10}$/.test(digits)) return 'Use 11 digits starting with +7 or 8, for example +7 705 888 5622.';
        if (phone.includes('+') && !/^\+7/.test(phone)) return 'A country code must start with +7.';
        return '';
    }

    function validateEmail(value, required = false) {
        const email = value.trim();
        if (email === '' && !required) return '';
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            return 'Enter an email address such as name@example.com.';
        }
        return '';
    }

    function validateDate(value, date = new Date()) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Choose a preferred date.';
        const parsed = new Date(`${value}T12:00:00Z`);
        if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
            return 'Choose a real calendar date.';
        }
        if (value < todayInAstana(date)) return 'The preferred date cannot be in the past (Astana time).';
        if (value > dateAfter(settings.maxDaysAhead, date)) {
            return `For this demo, choose a date within the next ${settings.maxDaysAhead} days.`;
        }
        return '';
    }

    globalThis.ChicLogic = Object.freeze({ findProduct, formatMoney, filterProducts,
        normaliseCart, calculateCart, randomItem, createReference, todayInAstana,
        dateAfter, validateName, validatePhone, validateEmail, validateDate });
})();
