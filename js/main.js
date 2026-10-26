'use strict';

// Shared feature: a persistent, validated basket and consistent accessible UI.
// Store only SKU IDs and quantities. Contact details and comments stay in memory.
(() => {
    const { settings } = window.ChicData;
    const Logic = window.ChicLogic;
    const CART_KEY = 'chic-flowers-cart-v1';
    let storageAvailable = true;
    let invalidSavedData = false;
    let cart = Logic.normaliseCart(safeRead(CART_KEY, []));

    function el(tag, classes = '', text = '') {
        const element = document.createElement(tag);
        if (classes.trim() !== '') element.classList.add(...classes.trim().split(/\s+/));
        if (text !== '') element.textContent = text;
        return element;
    }

    function button(text, classes = 'btn btn-outline-dark', type = 'button') {
        const element = el('button', classes, text);
        element.type = type;
        return element;
    }

    function message(container, text, kind = 'success') {
        container.textContent = text;
        container.classList.add('state-message', 'text-break');
        container.classList.toggle('hidden', text === '');
        container.classList.toggle('error', text !== '' && kind === 'error');
        container.classList.toggle('success', text !== '' && kind === 'success');
        if (!container.hasAttribute('aria-live')) container.setAttribute('aria-live', 'polite');
    }

    function fieldError(input, text) {
        const id = `${input.id}-error`;
        let output = document.getElementById(id);
        if (!output) {
            output = el('p', 'small mt-2 mb-0 text-break');
            output.id = id;
            output.setAttribute('aria-live', 'polite');
            // Checkbox/radio feedback follows its label, not between input and label.
            const label = input.nextElementSibling;
            const anchor = label && label.tagName === 'LABEL' ? label : input;
            anchor.insertAdjacentElement('afterend', output);
        }
        const describedBy = new Set((input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
        describedBy.add(id);
        input.setAttribute('aria-describedby', [...describedBy].join(' '));
        output.textContent = text;
        output.classList.toggle('hidden', text === '');
        output.classList.toggle('error', text !== '');
        input.classList.toggle('is-invalid', text !== '');
        input.classList.toggle('is-valid', text === '');
        input.setAttribute('aria-invalid', String(text !== ''));
    }

    function clearFieldError(input) {
        const output = document.getElementById(`${input.id}-error`);
        if (output) {
            output.textContent = '';
            output.classList.add('hidden');
            output.classList.remove('error');
        }
        input.classList.remove('is-invalid', 'is-valid');
        input.removeAttribute('aria-invalid');
    }

    function safeRead(key, fallback) {
        let value;
        try {
            value = window.localStorage.getItem(key);
        } catch {
            storageAvailable = false;
            return fallback;
        }
        if (value === null) return fallback;
        try {
            return JSON.parse(value);
        } catch {
            invalidSavedData = true;
            return fallback;
        }
    }

    function safeWrite(key, value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            storageAvailable = false;
            return false;
        }
    }

    const statusWrap = el('div', 'container');
    const status = el('p', 'hidden');
    status.id = 'site-feedback';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    statusWrap.append(status);
    const header = document.querySelector('header');
    if (header) header.insertAdjacentElement('afterend', statusWrap);

    function announce(text, kind = 'success') {
        message(status, text, kind);
    }

    function getCart() {
        return cart.map((line) => ({ ...line }));
    }

    function getTotals() {
        return Logic.calculateCart(cart);
    }

    function commitCart(next, feedback) {
        cart = Logic.normaliseCart(next);
        const saved = safeWrite(CART_KEY, cart);
        if (!saved) updateFallbackAddress();
        document.dispatchEvent(new CustomEvent('chic:cartchange', { detail: getTotals() }));
        const result = saved ? feedback : `${feedback} Browser storage is unavailable; internal page links carry this basket. Use a local server for reliable persistence.`;
        announce(result);
        return { ok: true, message: result };
    }

    function fail(text) {
        announce(text, 'error');
        return { ok: false, message: text };
    }

    function addToCart(id, quantity = 1) {
        const product = Logic.findProduct(id);
        if (!product) return fail('This bouquet is not in the current catalog. Choose another item.');
        if (!Number.isInteger(quantity) || quantity <= 0) return fail('Choose a positive whole quantity.');
        const existing = cart.find((line) => line.id === id);
        const nextQuantity = (existing ? existing.quantity : 0) + quantity;
        if (nextQuantity > settings.maxPerItem) return fail(`For this demo, the limit is ${settings.maxPerItem} of each bouquet option.`);
        if (getTotals().quantity + quantity > settings.maxItems) return fail(`For this demo, the basket limit is ${settings.maxItems} arrangements. Remove an item first.`);
        const next = getCart();
        const line = next.find((entry) => entry.id === id);
        if (line) line.quantity = nextQuantity;
        else next.push({ id, quantity });
        return commitCart(next, `${productLabel(product)} added. Basket: ${getTotals().quantity + quantity} arrangement(s).`);
    }

    function setQuantity(id, quantity) {
        const existing = cart.find((line) => line.id === id);
        if (!existing) return fail('This item is no longer in your basket.');
        if (!Number.isInteger(quantity) || quantity < 0 || quantity > settings.maxPerItem) {
            return fail(`Choose a whole quantity from 0 to ${settings.maxPerItem}; 0 removes the item.`);
        }
        if (getTotals().quantity - existing.quantity + quantity > settings.maxItems) {
            return fail(`The demo basket can contain at most ${settings.maxItems} arrangements.`);
        }
        if (quantity === 0) return removeFromCart(id);
        const next = getCart();
        next.find((line) => line.id === id).quantity = quantity;
        return commitCart(next, `${productLabel(Logic.findProduct(id))}: quantity updated to ${quantity}.`);
    }

    function removeFromCart(id) {
        const product = Logic.findProduct(id);
        if (!cart.some((line) => line.id === id)) return fail('This item has already been removed.');
        return commitCart(cart.filter((line) => line.id !== id), `${productLabel(product)} removed from your basket.`);
    }

    function clearCart() {
        return commitCart([], 'Your basket is now empty. Choose bouquets to start again.');
    }

    // A fallback for browsers that block localStorage. No personal data goes in a URL.
    function checkoutURL() {
        const selection = cart.map((line) => `${line.id}~${line.quantity}`).join(',');
        return `order.html?cart=${encodeURIComponent(selection)}#order-form`;
    }

    function updateFallbackAddress() {
        const url = new URL(window.location.href);
        url.searchParams.set('cart', cart.map((line) => `${line.id}~${line.quantity}`).join(','));
        try { window.history.replaceState(null, '', url.href); } catch {
            // Some file:// browsers restrict history. Internal links still carry IDs.
        }
    }

    function productLabel(product) {
        return product.size ? `${product.name} (${product.size})` : product.name;
    }

    function missingPhoto(img) {
        if (!img.isConnected) return;
        const fallback = el('p', 'bg-white border-bottom p-4 mb-0 text-secondary text-center',
            'Photo unavailable. Please ask the florist for a current photograph.');
        fallback.setAttribute('role', 'img');
        fallback.setAttribute('aria-label', `Photo unavailable: ${img.alt}`);
        img.replaceWith(fallback);
    }

    function watchImage(img) {
        img.addEventListener('error', () => missingPhoto(img), { once: true });
        if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) missingPhoto(img);
    }

    function renderProductCard(product, prefix, orderNow = true) {
        const column = el('div', 'col');
        const card = el('article', 'card h-100 shadow-sm product-card');
        card.id = `${prefix}-${product.id}`;
        card.dataset.productId = product.id;
        const img = el('img', 'card-img-top');
        img.src = product.image;
        img.alt = `${productLabel(product)} flower arrangement`;
        img.loading = 'lazy';
        img.width = 700;
        img.height = 760;
        const body = el('div', 'card-body d-flex flex-column');
        const title = el('h3', 'h5 card-title', productLabel(product));
        const description = el('p', 'card-text text-secondary small', product.description);
        const price = el('p', 'fw-bold mt-auto mb-2', Logic.formatMoney(product.price));
        const selected = el('p', 'small hidden mb-2');
        selected.dataset.selectedLabel = product.id;
        const actions = el('div', 'd-flex flex-wrap gap-2');
        const add = button('Add to basket', 'btn btn-outline-dark btn-sm');
        add.dataset.addId = product.id;
        add.setAttribute('aria-label', `Add ${productLabel(product)} to basket`);
        const feedback = el('p', 'small hidden mb-0');
        feedback.setAttribute('role', 'status');
        add.addEventListener('click', () => {
            const result = addToCart(product.id);
            message(feedback, result.message, result.ok ? 'success' : 'error');
        });
        actions.append(add);
        if (orderNow) {
            const order = button('Order now', 'btn btn-dark btn-sm');
            order.setAttribute('aria-label', `Prepare an order with ${productLabel(product)}`);
            order.addEventListener('click', () => {
                const result = cart.some((line) => line.id === product.id)
                    ? { ok: true } : addToCart(product.id);
                if (result.ok) window.location.assign(checkoutURL());
                else message(feedback, result.message, 'error');
            });
            actions.append(order);
        }
        body.append(title, description, price, selected, actions, feedback);
        card.append(img, body);
        column.append(card);
        // Attach the handler before image loading can finish.
        img.addEventListener('error', () => missingPhoto(img), { once: true });
        return column;
    }

    function renderProducts(items, container, options = {}) {
        const { emptyText = 'No bouquets match your choices.', orderNow = true } = options;
        container.replaceChildren();
        if (items.length === 0) {
            container.append(el('p', 'col-12 text-secondary', emptyText));
            return;
        }
        const fragment = document.createDocumentFragment();
        for (const product of items) fragment.append(renderProductCard(product, container.id || 'products', orderNow));
        container.append(fragment);
        updateSelectedCards();
    }

    function updateSelectedCards() {
        document.querySelectorAll('article[data-product-id]').forEach((card) => {
            const line = cart.find((entry) => entry.id === card.dataset.productId);
            card.classList.toggle('selected', Boolean(line));
            const label = card.querySelector('[data-selected-label]');
            if (label) {
                label.textContent = line ? `In your basket: ${line.quantity}` : '';
                label.classList.toggle('hidden', !line);
            }
        });
    }

    const navigation = document.querySelector('#mainNav .navbar-nav');
    const basketLink = el('a', 'nav-link', 'Basket (0)');
    basketLink.href = 'catalog.html#basket';
    basketLink.id = 'site-basket-link';
    if (navigation) {
        const item = el('li', 'nav-item');
        item.append(basketLink);
        navigation.append(item);
    }
    function updateNavigation() {
        const totals = getTotals();
        basketLink.textContent = `Basket (${totals.quantity})`;
        basketLink.setAttribute('aria-label', `Basket: ${totals.quantity} arrangements, ${Logic.formatMoney(totals.total)}`);
        updateSelectedCards();
    }

    // Hydrate an explicit checkout selection once, then remove it from the address.
    // Refreshing after a later edit must not replay the old checkout selection.
    if (['index.html', 'catalog.html', 'order.html', 'blog.html'].some((page) => window.location.pathname.endsWith(page))) {
        const parameters = new URLSearchParams(window.location.search);
        if (parameters.has('cart')) {
            const raw = parameters.get('cart');
            const entries = raw === '' ? [] : raw.split(',').slice(0, 200).map((entry) => {
                const [id, value] = entry.split('~');
                return { id, quantity: Number(value) };
            });
            const cleaned = Logic.normaliseCart(entries);
            cart = cleaned;
            const saved = safeWrite(CART_KEY, cart);
            // An explicit checkout selection supersedes unreadable older storage.
            invalidSavedData = false;
            if (saved) parameters.delete('cart');
            const query = parameters.toString();
            try {
                window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
            } catch {
                // file:// may restrict history; the page and basket still work.
            }
            if (JSON.stringify(entries) !== JSON.stringify(cleaned)) announce('Invalid basket entries or quantities were corrected. Please review the remaining selection.', 'error');
        }
    }

    document.addEventListener('click', (event) => {
        if (storageAvailable || event.defaultPrevented) return;
        const link = event.target.closest('a[href]');
        if (!link || link.getAttribute('href').startsWith('#')) return;
        const url = new URL(link.href, window.location.href);
        const internalPage = ['index.html', 'catalog.html', 'order.html', 'blog.html']
            .some((page) => url.pathname.endsWith(`/${page}`));
        if (url.origin !== window.location.origin || !internalPage) return;
        url.searchParams.set('cart', cart.map((line) => `${line.id}~${line.quantity}`).join(','));
        link.href = url.href;
    });

    document.addEventListener('chic:cartchange', updateNavigation);
    window.addEventListener('storage', (event) => {
        if (event.key !== CART_KEY && event.key !== null) return;
        cart = Logic.normaliseCart(safeRead(CART_KEY, []));
        document.dispatchEvent(new CustomEvent('chic:cartchange', { detail: getTotals() }));
        announce('Your basket was updated in another tab. Please review the current quantities.');
    });

    // The original Bootstrap CDN is retained. If its bundle cannot load, the
    // existing mobile navigation still works using the same prepared classes.
    const toggler = document.querySelector('.navbar-toggler');
    const collapse = document.getElementById('mainNav');
    if (toggler && collapse && !window.bootstrap) {
        toggler.addEventListener('click', () => {
            const expanded = !collapse.classList.contains('show');
            collapse.classList.toggle('show', expanded);
            toggler.setAttribute('aria-expanded', String(expanded));
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('img').forEach(watchImage);
    }, { once: true });
    window.Chic = Object.freeze({ el, button, message, fieldError, clearFieldError,
        safeRead, safeWrite, announce, getCart, getTotals, addToCart, setQuantity,
        removeFromCart, clearCart, checkoutURL, renderProducts, productLabel, watchImage });
    updateNavigation();
    if (!storageAvailable) announce('Browser storage is unavailable. Internal page links will carry your basket; use Live Server for reliable persistence.', 'error');
    else if (invalidSavedData) announce('Unreadable saved basket data was ignored. Please select your bouquets again.', 'error');
})();
