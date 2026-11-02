'use strict';

/* ORIGINAL PLAIN-JAVASCRIPT VERSION — comparison only. Never link this file.
   Copied verbatim from the supplied chic-flowers.rar, before the jQuery rewrite.
   Feature 1: main.js renderProductCard/renderProducts — dynamic product cards.
   Feature 2: catalog.js clear/cancelClearBasket — show/hide basket confirmation.
   Feature 3: order.js validation, input/change and submit — order form.
   Full original modules are retained, including Home and Blog, for context. */

// ===== ORIGINAL FILE: js/main.js =====
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


// ===== ORIGINAL FILE: js/home.js =====
'use strict';

// Alua: a budget-based bouquet finder and a useful rotating recommendation.
(() => {
    const { el, button, renderProducts, fieldError, clearFieldError } = window.Chic;
    const { products, categories } = window.ChicData;
    const { filterProducts, randomItem, formatMoney } = window.ChicLogic;
    const categorySection = document.getElementById('categories');
    if (!categorySection) return;

    const finder = el('section', 'container py-5');
    finder.id = 'bouquet-finder';
    finder.setAttribute('aria-labelledby', 'finder-heading');
    const heading = el('h2', 'display-6', 'Find flowers for your budget');
    heading.id = 'finder-heading';
    const explanation = el('p', 'text-secondary',
        'Choose a style and a maximum price per arrangement. Prices are catalog estimates; the florist confirms availability.');
    const form = el('form', 'row g-3 align-items-end mb-4');
    form.id = 'finder-form';
    form.noValidate = true;

    const categoryField = el('div', 'col-12 col-md-4');
    const categoryLabel = el('label', 'form-label', 'Bouquet style');
    categoryLabel.htmlFor = 'finder-category';
    const category = el('select', 'form-select');
    category.id = 'finder-category';
    const allOption = el('option', '', 'All styles');
    allOption.value = 'all';
    category.append(allOption);
    categories.forEach((item) => {
        const option = el('option', '', item.label);
        option.value = item.id;
        category.append(option);
    });
    categoryField.append(categoryLabel, category);

    const budgetField = el('div', 'col-12 col-md-4');
    const budgetLabel = el('label', 'form-label', 'Maximum price per arrangement (KZT)');
    budgetLabel.htmlFor = 'finder-budget';
    const budget = el('input', 'form-control');
    budget.id = 'finder-budget';
    budget.type = 'number';
    budget.min = '1';
    budget.max = '2000000';
    budget.step = '1';
    budget.value = '50000';
    budget.required = true;
    budgetField.append(budgetLabel, budget);

    const actions = el('div', 'col-12 col-md-4 d-flex flex-wrap gap-2');
    const findButton = button('Find bouquets', 'btn btn-dark', 'submit');
    const resetButton = button('Reset finder', 'btn btn-outline-secondary');
    resetButton.id = 'finder-reset';
    actions.append(findButton, resetButton);
    form.append(categoryField, budgetField, actions);

    const count = el('p', 'fw-semibold');
    count.id = 'finder-count';
    count.setAttribute('role', 'status');
    count.setAttribute('aria-live', 'polite');
    const results = el('div', 'row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4');
    results.id = 'finder-results';
    const viewAll = el('a', 'btn btn-outline-dark mt-4', 'View all matching bouquets');
    viewAll.id = 'finder-view-all';
    finder.append(heading, explanation, form, count, results, viewAll);
    categorySection.after(finder);

    // A return value makes this validator usable by submit and change handlers.
    function validBudget(value) {
        const amount = Number(value);
        return value.trim() !== '' && Number.isInteger(amount) && amount >= 1 && amount <= 2000000;
    }

    function showMatches(focusInvalid = false) {
        if (!validBudget(budget.value)) {
            fieldError(budget, 'Enter a whole-number budget from 1 to 2,000,000 KZT.');
            count.textContent = 'Enter a valid budget to find bouquets.';
            renderProducts([], results, { emptyText: 'No suggestions until the budget is valid.' });
            viewAll.classList.add('hidden');
            if (focusInvalid) budget.focus();
            return [];
        }
        clearFieldError(budget);
        const matches = filterProducts(products, {
            category: category.value,
            maxPrice: Number(budget.value),
            sort: 'price-asc'
        });
        const shown = matches.slice(0, 6);
        count.textContent = matches.length === 0
            ? '0 matching options. Increase your budget, choose another style or reset the finder.'
            : `${matches.length} matching option${matches.length === 1 ? '' : 's'} up to ${formatMoney(Number(budget.value))}. Showing ${shown.length}, lowest price first.`;
        renderProducts(shown, results, {
            emptyText: 'No bouquets match these choices. Try a higher budget or all styles.'
        });
        const query = new URLSearchParams({ category: category.value, max: budget.value, sort: 'price-asc' });
        viewAll.href = `catalog.html?${query.toString()}#catalog-controls`;
        viewAll.classList.toggle('hidden', matches.length === 0);
        return matches;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        showMatches(true);
    });
    category.addEventListener('change', () => showMatches());
    budget.addEventListener('input', () => showMatches());
    resetButton.addEventListener('click', () => {
        category.value = 'all';
        budget.value = '50000';
        showMatches();
        window.Chic.announce('Finder reset to all styles and a 50,000 KZT budget.');
        category.focus();
    });
    showMatches();

    const featuredSection = el('section', 'container py-5');
    featuredSection.id = 'featured-bouquet';
    const featureLayout = el('div', 'row g-4 align-items-center');
    const featureIntro = el('div', 'col-12 col-md-6');
    const featureHeading = el('h2', 'display-6', 'Need a little inspiration?');
    const featureText = el('p', 'text-secondary',
        'Discover a different bouquet from our catalog. This is a random suggestion, not a special offer or a stock reservation.');
    const nextFeature = button('Suggest another bouquet', 'btn btn-outline-dark');
    nextFeature.id = 'featured-next';
    const featureStatus = el('p', 'small text-secondary mt-3');
    featureStatus.id = 'featured-status';
    featureStatus.setAttribute('role', 'status');
    featureStatus.setAttribute('aria-live', 'polite');
    featureIntro.append(featureHeading, featureText, nextFeature, featureStatus);
    const featureColumn = el('div', 'col-12 col-md-6');
    const featureCards = el('div', 'row row-cols-1 g-4');
    featureCards.id = 'featured-results';
    featureColumn.append(featureCards);
    featureLayout.append(featureIntro, featureColumn);
    featuredSection.append(featureLayout);
    document.getElementById('shop-info').before(featuredSection);
    let featuredId = '';

    function suggestBouquet() {
        const product = randomItem(products, featuredId);
        if (!product) {
            renderProducts([], featureCards, { emptyText: 'No recommendations are available. Please contact the shop.' });
            featureStatus.textContent = 'There are no catalog items to suggest.';
            nextFeature.disabled = true;
            return null;
        }
        featuredId = product.id;
        renderProducts([product], featureCards);
        featureStatus.textContent = `Suggested: ${product.name}${product.size ? ` (${product.size})` : ''}, ${formatMoney(product.price)}.`;
        nextFeature.disabled = products.length < 2;
        return product;
    }

    nextFeature.addEventListener('click', suggestBouquet);
    suggestBouquet();
})();


// ===== ORIGINAL FILE: js/catalog.js =====
'use strict';

// Alua: connected catalog controls and the complete basket in the prepared container.
(() => {
    const C = window.Chic;
    const L = window.ChicLogic;
    const { products, categories, settings } = window.ChicData;
    const intro = document.getElementById('catalog-intro');
    if (!intro) return;

    const arrangementCount = new Set(products.map((product) => product.groupId)).size;
    intro.querySelector('.lead').textContent =
        `Explore ${arrangementCount} arrangements in ${products.length} size options. Search, compare estimates and prepare a demonstration order.`;
    intro.querySelector('p.small.mb-0').textContent =
        'Add bouquets to your basket, adjust quantities and continue to the order form. Availability and final prices must be confirmed with Chic Flowers.';

    const controls = C.el('form', 'container pb-4');
    controls.id = 'catalog-controls';
    controls.noValidate = true;
    controls.setAttribute('aria-label', 'Filter the flower catalog');
    const controlRow = C.el('div', 'row g-3 align-items-end');

    function addControl(labelText, id, control) {
        const column = C.el('div', 'col-12 col-md-6 col-lg-3');
        const label = C.el('label', 'form-label', labelText);
        label.htmlFor = id;
        control.id = id;
        column.append(label, control);
        controlRow.append(column);
        return control;
    }

    function addOption(select, value, label) {
        const option = C.el('option', '', label);
        option.value = value;
        select.append(option);
        return option;
    }

    const search = addControl('Search name or flowers', 'catalog-search', C.el('input', 'form-control'));
    search.type = 'search';
    search.maxLength = 100;
    search.placeholder = 'For example: rose, hydrangea';
    const category = addControl('Category', 'catalog-category', C.el('select', 'form-select'));
    addOption(category, 'all', 'All categories');
    categories.forEach((item) => addOption(category, item.id, item.label));
    const sort = addControl('Sort within categories', 'catalog-sort', C.el('select', 'form-select'));
    addOption(sort, 'name', 'Name: A to Z');
    addOption(sort, 'price-asc', 'Price: low to high');
    addOption(sort, 'price-desc', 'Price: high to low');
    const maximum = addControl('Maximum price (KZT, optional)', 'catalog-max-price', C.el('input', 'form-control'));
    maximum.type = 'number';
    maximum.min = '1';
    maximum.max = '2000000';
    maximum.step = '1';
    maximum.placeholder = 'Any price';
    const actions = C.el('div', 'd-flex flex-wrap gap-2 mt-3');
    const apply = C.button('Apply filters', 'btn btn-dark', 'submit');
    const reset = C.button('Reset filters', 'btn btn-outline-secondary');
    reset.id = 'catalog-reset';
    actions.append(apply, reset);
    const count = C.el('p', 'fw-semibold mt-3 mb-0');
    count.id = 'catalog-count';
    count.setAttribute('role', 'status');
    count.setAttribute('aria-live', 'polite');
    const empty = C.el('div', 'state-message hidden');
    empty.id = 'catalog-empty';
    empty.setAttribute('role', 'status');
    const linkFeedback = C.el('p', 'state-message hidden');
    linkFeedback.id = 'catalog-link-feedback';
    linkFeedback.setAttribute('role', 'status');
    controls.append(controlRow, actions, count, empty, linkFeedback);
    intro.after(controls);

    const sections = categories.map((item) => {
        const section = document.getElementById(item.id);
        const grid = section.querySelector('.row');
        grid.id = `catalog-${item.id}-results`;
        return { ...item, section, grid, badge: section.querySelector('.badge') };
    });
    const parameters = new URLSearchParams(window.location.search);
    const requestedCategory = parameters.get('category') || window.location.hash.slice(1);
    const invalidLinkFilters = [];
    if (categories.some((item) => item.id === requestedCategory)) category.value = requestedCategory;
    else if (parameters.has('category') && requestedCategory !== 'all') invalidLinkFilters.push('category');
    const requestedSort = parameters.get('sort');
    if (['name', 'price-asc', 'price-desc'].includes(requestedSort)) sort.value = requestedSort;
    else if (parameters.has('sort')) invalidLinkFilters.push('sort order');
    search.value = (parameters.get('q') || '').slice(0, 100);
    const requestedMaximum = parameters.get('max') || '';
    if (requestedMaximum !== '') {
        const value = Number(requestedMaximum);
        if (Number.isInteger(value) && value >= 1 && value <= 2000000) maximum.value = String(value);
        else invalidLinkFilters.push('maximum price');
    }

    function readFilters() {
        const rawMaximum = maximum.value.trim();
        const value = Number(rawMaximum);
        const valid = !maximum.validity.badInput &&
            (rawMaximum === '' || (Number.isInteger(value) && value >= 1 && value <= 2000000));
        return {
            valid,
            query: search.value.trim(),
            category: category.value,
            sort: sort.value,
            maxPrice: rawMaximum === '' ? Infinity : value
        };
    }

    function updateCategoryLinks() {
        intro.querySelectorAll('a[href^="#"]').forEach((link) => {
            const target = link.getAttribute('href').slice(1);
            if (!categories.some((item) => item.id === target)) return;
            const selected = link.getAttribute('href') === `#${category.value}`;
            link.classList.toggle('active', selected);
            link.classList.toggle('btn-dark', selected);
            link.classList.toggle('btn-outline-dark', !selected);
            if (selected) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
        });
    }

    function saveFiltersInAddress(filters) {
        const query = new URLSearchParams(window.location.search);
        [['q', filters.query], ['category', filters.category], ['sort', filters.sort],
            ['max', maximum.value.trim()]].forEach(([key, value]) => {
            if (value === '' || (key === 'category' && value === 'all') ||
                (key === 'sort' && value === 'name')) query.delete(key);
            else query.set(key, value);
        });
        const hash = filters.category === 'all' ? 'catalog-controls' : filters.category;
        try {
            window.history.replaceState(null, '',
                `${window.location.pathname}${query.toString() ? `?${query.toString()}` : ''}#${hash}`);
        } catch {
            // Some file:// browsers restrict history. Filtering still works locally.
        }
    }

    function renderCatalog(focusInvalid = false, saveAddress = true) {
        C.message(linkFeedback, '');
        const filters = readFilters();
        if (!filters.valid) {
            C.fieldError(maximum, 'Enter a whole number from 1 to 2,000,000 KZT, or leave this blank.');
            sections.forEach(({ section, grid }) => {
                C.renderProducts([], grid);
                section.classList.add('hidden');
            });
            count.textContent = 'Enter a valid maximum price to show matching bouquets.';
            C.message(empty, 'The price filter needs attention. Correct it or reset the filters.', 'error');
            if (focusInvalid) maximum.focus();
            return [];
        }
        C.clearFieldError(maximum);
        const matches = L.filterProducts(products, filters);
        sections.forEach(({ id, section, grid, badge }) => {
            const matchingCategory = matches.filter((product) => product.category === id);
            C.renderProducts(matchingCategory, grid);
            section.classList.toggle('hidden', matchingCategory.length === 0);
            badge.textContent = `${matchingCategory.length} option${matchingCategory.length === 1 ? '' : 's'}`;
        });
        count.textContent = `${matches.length} of ${products.length} catalog options match your choices.`;
        C.message(empty, matches.length === 0
            ? 'No bouquets match these filters. Try a different search, increase the maximum price or use Reset filters.'
            : '', 'error');
        updateCategoryLinks();
        if (saveAddress) saveFiltersInAddress(filters);
        return matches;
    }

    controls.addEventListener('submit', (event) => {
        event.preventDefault();
        renderCatalog(true);
    });
    search.addEventListener('input', () => renderCatalog());
    maximum.addEventListener('input', () => renderCatalog());
    category.addEventListener('change', () => renderCatalog());
    sort.addEventListener('change', () => renderCatalog());
    reset.addEventListener('click', () => {
        search.value = '';
        category.value = 'all';
        sort.value = 'name';
        maximum.value = '';
        // Reset only this view; the basket is deliberately unaffected.
        renderCatalog();
        C.announce('All catalog filters were reset. Your basket is unchanged.');
        search.focus();
    });
    intro.querySelectorAll('a[href^="#"]').forEach((link) => {
        const id = link.getAttribute('href').slice(1);
        if (!categories.some((item) => item.id === id)) return;
        link.addEventListener('click', (event) => {
            event.preventDefault();
            category.value = id;
            renderCatalog();
            const target = document.getElementById(id);
            (target.classList.contains('hidden') ? controls : target).scrollIntoView();
        });
    });
    window.addEventListener('hashchange', () => {
        const id = window.location.hash.slice(1);
        if (categories.some((item) => item.id === id)) {
            category.value = id;
            renderCatalog();
        }
    });
    renderCatalog(false, false);
    if (invalidLinkFilters.length > 0) {
        C.message(linkFeedback,
            `This link contained an invalid ${invalidLinkFilters.join(', ')}. Those filters were reset; review the controls above.`, 'error');
    }

    // Use one data source for the cards, basket and reference price table.
    const overview = document.querySelector('#catalog-overview tbody');
    overview.replaceChildren();
    document.querySelector('#catalog-overview > p').textContent =
        'All catalog estimates, independent of the filters above. Each size is a separate option. The shop confirms final prices.';
    products.forEach((product) => {
        const row = C.el('tr');
        const categoryName = categories.find((item) => item.id === product.category).label;
        const label = `${product.name}${product.size ? ` (${product.size})` : ''}`;
        row.append(C.el('td', '', categoryName), C.el('td', '', label), C.el('td', '', L.formatMoney(product.price)));
        overview.append(row);
    });
    if (products.length === 0) {
        const row = C.el('tr');
        const cell = C.el('td', '', 'No catalog prices are available. Please contact the shop.');
        cell.colSpan = 3;
        row.append(cell);
        overview.append(row);
    }

    const basket = document.getElementById('basket');
    const basketList = document.getElementById('basket-items');
    const basketEmpty = document.getElementById('basket-empty');
    const basketTotal = document.getElementById('basket-total');
    // The frozen CSS adds a counter after #basket-total; this JS-owned output needs a fresh id.
    basketTotal.id = 'basket-sum';
    const quantity = C.el('p', 'small text-secondary mt-3 mb-0');
    quantity.id = 'basket-quantity';
    basketTotal.parentElement.after(quantity);
    const checkout = document.getElementById('basket-checkout');
    const basketForm = document.getElementById('basket-form');
    basket.querySelector('.col-lg-7 > p').textContent =
        `Change quantities or remove bouquets below. Limit: ${settings.maxPerItem} of each option and ${settings.maxItems} arrangements per demonstration request.`;
    basket.querySelector('.brand-note > p').textContent =
        'Your basket and estimated subtotal are transferred to the order form. Review your selection before continuing.';
    basket.querySelector('.brand-note > p.small').textContent =
        'Only product IDs and quantities are transferred. Personal details are never put in a URL. No payment or real order is created.';
    basketEmpty.textContent = 'Your basket is empty. ';
    const browse = C.el('a', '', 'Choose bouquets above.');
    browse.href = '#catalog-controls';
    browse.id = 'basket-browse';
    basketEmpty.append(browse);

    const clear = C.button('Clear basket', 'btn btn-outline-secondary mt-3');
    clear.id = 'basket-clear';
    const clearPrompt = C.el('div', 'border rounded p-3 mt-3 hidden');
    clearPrompt.id = 'basket-clear-prompt';
    const clearQuestion = C.el('p', 'mb-3', 'Remove every bouquet from your basket?');
    const clearButtons = C.el('div', 'd-flex flex-wrap gap-2');
    const confirmClear = C.button('Yes, clear basket', 'btn btn-dark');
    confirmClear.id = 'basket-clear-confirm';
    const cancelClear = C.button('Keep my basket', 'btn btn-outline-secondary');
    cancelClear.id = 'basket-clear-cancel';
    clearButtons.append(confirmClear, cancelClear);
    clearPrompt.append(clearQuestion, clearButtons);
    basketList.parentElement.append(clear, clearPrompt);
    const feedback = C.el('p', 'state-message hidden');
    feedback.id = 'basket-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    basket.append(feedback);

    function basketActionButton(text, action, id, description) {
        const control = C.button(text, 'btn btn-outline-dark btn-sm');
        control.dataset.cartAction = action;
        control.dataset.productId = id;
        control.setAttribute('aria-label', description);
        return control;
    }

    function renderBasket() {
        const active = document.activeElement;
        const previousId = active && active.dataset ? active.dataset.productId : '';
        const previousAction = active && active.dataset ? active.dataset.cartAction : '';
        const wasInClearPrompt = clearPrompt.contains(active);
        const totals = C.getTotals();
        basketList.replaceChildren();
        totals.lines.forEach((line) => {
            const name = `${line.product.name}${line.product.size ? ` (${line.product.size})` : ''}`;
            const row = C.el('li', 'list-group-item py-3');
            row.dataset.productId = line.id;
            const details = C.el('div', 'd-flex flex-wrap gap-2 justify-content-between mb-2');
            details.append(C.el('strong', 'text-break', name), C.el('span', '', L.formatMoney(line.subtotal)));
            row.append(details, C.el('p', 'small text-secondary mb-2',
                `${L.formatMoney(line.product.price)} × ${line.quantity} = ${L.formatMoney(line.subtotal)}`));
            const actions = C.el('div', 'd-flex flex-wrap gap-2 align-items-center');
            const decrease = basketActionButton('−', 'decrease', line.id, `Decrease quantity of ${name}`);
            const increase = basketActionButton('+', 'increase', line.id, `Increase quantity of ${name}`);
            increase.disabled = line.quantity >= settings.maxPerItem || totals.quantity >= settings.maxItems;
            if (increase.disabled) increase.title = 'The maximum quantity for this demonstration request has been reached.';
            const amount = C.el('span', 'px-2', `Quantity: ${line.quantity}`);
            const remove = basketActionButton('Remove', 'remove', line.id, `Remove ${name} from basket`);
            actions.append(decrease, amount, increase, remove);
            row.append(actions);
            basketList.append(row);
        });
        basketEmpty.classList.toggle('hidden', totals.quantity !== 0);
        basketTotal.textContent = L.formatMoney(totals.total);
        quantity.textContent = `${totals.quantity} arrangement${totals.quantity === 1 ? '' : 's'} · ${totals.lines.length} different option${totals.lines.length === 1 ? '' : 's'}. Delivery, if requested, is quoted by the shop.`;
        checkout.disabled = totals.quantity === 0;
        clear.disabled = totals.quantity === 0;
        clearPrompt.classList.add('hidden');
        if (previousId && previousAction) {
            const replacement = Array.from(basketList.querySelectorAll('button')).find((control) =>
                control.dataset.productId === previousId && control.dataset.cartAction === previousAction && !control.disabled);
            const next = replacement || basketList.querySelector('button:not(:disabled)') || browse;
            next.focus();
        } else if (wasInClearPrompt) {
            (clear.disabled ? browse : clear).focus();
        }
    }

    basketList.addEventListener('click', (event) => {
        const control = event.target.closest('button[data-cart-action]');
        if (!control || !basketList.contains(control)) return;
        const id = control.dataset.productId;
        const line = C.getCart().find((item) => item.id === id);
        if (!line) return;
        let result;
        if (control.dataset.cartAction === 'remove') result = C.removeFromCart(id);
        else {
            const change = control.dataset.cartAction === 'increase' ? 1 : -1;
            result = C.setQuantity(id, line.quantity + change);
        }
        C.message(feedback, result.message, result.ok ? 'success' : 'error');
    });
    clear.addEventListener('click', () => {
        clearPrompt.classList.remove('hidden');
        confirmClear.focus();
    });
    function cancelClearBasket() {
        clearPrompt.classList.add('hidden');
        C.message(feedback, 'Your basket was kept.');
        clear.focus();
    }
    cancelClear.addEventListener('click', cancelClearBasket);
    clearPrompt.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') cancelClearBasket();
    });
    confirmClear.addEventListener('click', () => {
        const result = C.clearCart();
        C.message(feedback, result.message, result.ok ? 'success' : 'error');
        browse.focus();
    });
    basketForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (C.getTotals().quantity === 0) {
            C.message(feedback, 'Your basket is empty. Add a bouquet before continuing.', 'error');
            browse.focus();
            return;
        }
        window.location.href = C.checkoutURL();
    });
    document.addEventListener('chic:cartchange', () => {
        renderBasket();
        C.message(feedback, '');
    });
    renderBasket();
})();


// ===== ORIGINAL FILE: js/order.js =====
'use strict';

/* Gauhar's page: basket editing, order validation and a local demo preview.
   Nothing in this file sends a request or stores contact details. */
(() => {
    const form = document.querySelector('#order-form');
    if (!form) return;

    const C = window.Chic;
    const L = window.ChicLogic;
    const settings = window.ChicData.settings;
    const fields = {
        name: document.querySelector('#full-name'),
        phone: document.querySelector('#phone'),
        email: document.querySelector('#email'),
        items: document.querySelector('#order-items'),
        quantity: document.querySelector('#quantity'),
        date: document.querySelector('#order-date'),
        message: document.querySelector('#order-message'),
        pickup: document.querySelector('#pickup'),
        delivery: document.querySelector('#delivery'),
        address: document.querySelector('#delivery-address'),
        storePayment: document.querySelector('#pay-store'),
        remotePayment: document.querySelector('#pay-direct'),
        consent: document.querySelector('#order-consent')
    };
    const submitButton = document.querySelector('#order-preview');
    const errorBox = document.querySelector('#order-error');
    const confirmation = document.querySelector('#order-confirmation');
    const aside = document.querySelector('#order-summary');
    const touched = new Set();
    let submitted = false;
    let lastSubmission = null;
    let pendingFocus = null;

    // Existing HTML is frozen; all new controls are created here.
    form.noValidate = true;
    fields.items.readOnly = true;
    fields.quantity.readOnly = true;
    fields.quantity.step = '1';
    fields.quantity.max = String(settings.maxItems);
    fields.name.maxLength = 60;
    fields.phone.maxLength = 30;
    fields.email.maxLength = 254;
    fields.address.maxLength = 180;
    fields.message.maxLength = 500;
    fields.storePayment.value = 'store';
    fields.remotePayment.value = 'remote';
    submitButton.textContent = 'Create demonstration preview';
    document.querySelector('#order-reset').textContent = 'Clear contact details';
    document.querySelector('#order-form-title + p').textContent =
        'Your basket is transferred automatically. Check the selection, choose your preferences and create a demonstration preview. No information is sent to Chic Flowers.';
    document.querySelectorAll('#order-steps .card-text, #order-steps .text-secondary')[1].textContent =
        'Review your basket and enter your contact details, preferred date, time and pickup or delivery choices.';
    fields.items.nextElementSibling.textContent =
        'This list and quantity come from your basket. Use the buttons in Your basket summary to change them.';

    const timeGroup = C.el('div', 'col-12 col-md-6');
    const timeLabel = C.el('label', 'form-label', 'Preferred time (Astana)');
    const timeInput = C.el('input', 'form-control');
    timeInput.id = 'order-time';
    timeInput.type = 'time';
    timeInput.step = '60';
    timeInput.required = true;
    timeLabel.htmlFor = timeInput.id;
    const timeHelp = C.el('div', 'form-text', 'A time preference only; the florist must confirm it. Astana time is used.');
    timeHelp.id = 'order-time-help';
    timeInput.setAttribute('aria-describedby', timeHelp.id);
    timeGroup.append(timeLabel, timeInput, timeHelp);
    fields.date.parentElement.after(timeGroup);
    fields.time = timeInput;

    const dateHelp = C.el('div', 'form-text', 'Demo planning window: today through the next 30 days. Past dates and times are not accepted.');
    dateHelp.id = 'order-date-help';
    fields.date.setAttribute('aria-describedby', dateHelp.id);
    fields.date.after(dateHelp);

    const locationGroup = C.el('div', 'mb-3');
    locationGroup.id = 'pickup-location-group';
    const locationLabel = C.el('label', 'form-label', 'Pickup location');
    const locationInput = C.el('select', 'form-select');
    locationInput.id = 'pickup-location';
    locationInput.required = true;
    locationLabel.htmlFor = locationInput.id;
    const locationPrompt = C.el('option', '', 'Choose a location');
    locationPrompt.value = '';
    locationInput.append(locationPrompt);
    settings.locations.forEach((location) => {
        const option = C.el('option', '', location);
        option.value = location;
        locationInput.append(option);
    });
    locationGroup.append(locationLabel, locationInput);
    fields.pickup.closest('fieldset').querySelector('.d-flex').after(locationGroup);
    fields.location = locationInput;

    // Group the existing address nodes without adding markup to the HTML file.
    const addressGroup = C.el('div', 'mb-2');
    addressGroup.id = 'delivery-address-group';
    const addressLabel = document.querySelector('label[for="delivery-address"]');
    const addressHelp = fields.address.nextElementSibling;
    addressLabel.before(addressGroup);
    addressGroup.append(addressLabel, fields.address, addressHelp);
    addressLabel.textContent = 'Delivery address in Astana';
    fields.address.placeholder = 'Astana, street, building number, apartment';
    addressHelp.textContent = 'Include Astana, the street and building number. Service coverage and delivery charges must be confirmed by the shop.';

    const messageCounter = C.el('div', 'form-text', '0 / 500 characters');
    messageCounter.id = 'order-message-count';
    fields.message.setAttribute('aria-describedby', messageCounter.id);
    fields.message.after(messageCounter);

    const summaryTitle = C.el('h2', 'h4 mb-3', 'Your basket summary');
    summaryTitle.id = 'live-summary-title';
    const summaryItems = C.el('ul', 'list-group mb-3');
    summaryItems.id = 'order-summary-items';
    summaryItems.setAttribute('aria-labelledby', summaryTitle.id);
    const basketLimits = C.el('p', 'small text-secondary', `Demo basket limit: ${settings.maxPerItem} of each option and ${settings.maxItems} arrangements in total. Decreasing quantity 1 removes the item.`);
    const summaryTotals = C.el('div', 'border-top pt-3 mb-3');
    summaryTotals.id = 'order-live-totals';
    summaryTotals.setAttribute('aria-live', 'polite');
    summaryTotals.setAttribute('aria-atomic', 'true');
    const summaryPreferences = C.el('div', 'mb-3 text-break');
    summaryPreferences.id = 'order-live-preferences';
    const basketNotice = C.el('div', 'state-message hidden mb-3');
    basketNotice.id = 'order-basket-feedback';
    basketNotice.setAttribute('role', 'status');
    basketNotice.setAttribute('aria-live', 'polite');
    aside.prepend(summaryTitle, basketLimits, summaryItems, summaryTotals, summaryPreferences, basketNotice);
    aside.querySelector('h2:not(#live-summary-title)').textContent = 'Contact the florist';
    confirmation.classList.add('hidden');
    errorBox.classList.add('hidden');
    errorBox.setAttribute('role', 'alert');

    function productLabel(product) {
        return product.size ? `${product.name} (${product.size})` : product.name;
    }

    function currentAstanaTime(date = new Date()) {
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: settings.timeZone,
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23'
        }).format(date);
    }

    function readValues() {
        return {
            name: fields.name.value.trim(),
            phone: fields.phone.value.trim(),
            email: fields.email.value.trim(),
            date: fields.date.value,
            time: fields.time.value,
            quantity: Number(fields.quantity.value),
            receive: fields.pickup.checked ? 'pickup' : fields.delivery.checked ? 'delivery' : '',
            location: fields.location.value,
            address: fields.address.value.trim(),
            message: fields.message.value.trim(),
            payment: fields.storePayment.checked ? 'store' : fields.remotePayment.checked ? 'remote' : '',
            consent: fields.consent.checked
        };
    }

    function validateTime(value, dateValue, now = new Date()) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
            return 'Choose a valid preferred time.';
        }
        if (dateValue === L.todayInAstana(now) && value <= currentAstanaTime(now)) {
            return 'For today, choose a time later than the current time in Astana.';
        }
        return '';
    }

    function collectErrors(values, totals) {
        const now = new Date();
        const errors = new Map();
        errors.set(fields.name, L.validateName(values.name));
        errors.set(fields.phone, L.validatePhone(values.phone));
        errors.set(fields.email, L.validateEmail(values.email));
        errors.set(fields.items, totals.quantity === 0 ? 'Your basket is empty. Add at least one bouquet in the catalog.' : '');
        errors.set(fields.quantity,
            !Number.isInteger(values.quantity) || values.quantity < 1 || values.quantity > settings.maxItems || values.quantity !== totals.quantity
                ? `The quantity must match your basket and be between 1 and ${settings.maxItems}. Change it with the basket buttons.`
                : '');
        errors.set(fields.date, L.validateDate(values.date, now));
        errors.set(fields.time, validateTime(values.time, values.date, now));
        errors.set(fields.message, values.message.length > 500 ? 'Keep your card message and requests within 500 characters.' : '');
        errors.set(fields.pickup, values.receive === '' ? 'Choose pickup or delivery.' : '');
        errors.set(fields.location,
            values.receive === 'pickup' && !settings.locations.includes(values.location)
                ? 'Choose one of the two pickup locations.' : '');
        let addressError = '';
        if (values.receive === 'delivery') {
            if (values.address.length < 10 || values.address.length > 180) {
                addressError = 'Enter a complete delivery address of 10 to 180 characters.';
            } else if (!/(astana|астана)/iu.test(values.address) || !/\d/.test(values.address)) {
                addressError = 'Include Astana, the street and a building number in the address.';
            }
        }
        errors.set(fields.address, addressError);
        let paymentError = '';
        if (values.payment === '') {
            paymentError = 'Choose a payment preference.';
        } else if (values.receive === 'delivery' && values.payment !== 'remote') {
            paymentError = 'For a delivery request, choose “Ask the shop about remote payment”. No payment is processed here.';
        }
        errors.set(fields.storePayment, paymentError);
        errors.set(fields.consent, values.consent ? '' : 'Confirm that you understand this is a demonstration, not a sent order.');
        return errors;
    }

    function updateConditionalFields() {
        const deliverySelected = fields.delivery.checked;
        locationGroup.classList.toggle('hidden', deliverySelected);
        fields.location.disabled = deliverySelected;
        fields.location.required = !deliverySelected;
        addressGroup.classList.toggle('hidden', !deliverySelected);
        fields.address.disabled = !deliverySelected;
        fields.address.required = deliverySelected;
        C.clearFieldError(deliverySelected ? fields.location : fields.address);
        fields.date.min = L.todayInAstana();
        fields.date.max = L.dateAfter(settings.maxDaysAhead);
        if (fields.date.value === L.todayInAstana()) {
            fields.time.min = currentAstanaTime();
        } else {
            fields.time.removeAttribute('min');
        }
    }

    function updateLiveSummary() {
        const totals = C.getTotals();
        const values = readValues();
        summaryTotals.replaceChildren(
            C.el('p', 'mb-1', `Total quantity: ${totals.quantity}`),
            C.el('p', 'fw-bold mb-1', `Bouquet subtotal: ${L.formatMoney(totals.total)}`),
            C.el('p', 'small text-secondary mb-0', values.receive === 'delivery'
                ? 'Delivery cost: to be confirmed. The subtotal excludes delivery; a final total is not available on this website.'
                : 'Pickup selected. Bouquet prices and availability still require confirmation from the florist.')
        );
        const receiveText = values.receive === 'delivery'
            ? `Delivery: ${values.address || 'enter an Astana address'}`
            : `Pickup: ${values.location || 'choose a location'}`;
        summaryPreferences.replaceChildren(
            C.el('p', 'small mb-1', receiveText),
            C.el('p', 'small mb-1', `Preferred date: ${values.date || 'not selected'}`),
            C.el('p', 'small mb-0', `Preferred time: ${values.time || 'not selected'} (Astana)`)
        );
        messageCounter.textContent = `${fields.message.value.length} / 500 characters`;
        submitButton.disabled = totals.quantity === 0;
    }

    function renderBasket() {
        const totals = C.getTotals();
        summaryItems.replaceChildren();
        if (totals.lines.length === 0) {
            const empty = C.el('li', 'list-group-item', 'Your basket is empty. ');
            const catalogLink = C.el('a', '', 'Choose bouquets in the catalog');
            catalogLink.href = 'catalog.html';
            catalogLink.id = 'order-empty-catalog';
            empty.append(catalogLink);
            summaryItems.append(empty);
        } else {
            totals.lines.forEach((line) => {
                const item = C.el('li', 'list-group-item text-break');
                const name = productLabel(line.product);
                const controls = C.el('div', 'd-flex flex-wrap gap-2 align-items-center mt-2');
                const minus = C.button('−', 'btn btn-outline-dark btn-sm');
                const plus = C.button('+', 'btn btn-outline-dark btn-sm');
                const remove = C.button('Remove', 'btn btn-outline-secondary btn-sm');
                const quantityText = C.el('span', 'small', `Quantity: ${line.quantity}`);
                minus.setAttribute('aria-label', `Decrease ${name} quantity`);
                plus.setAttribute('aria-label', `Increase ${name} quantity`);
                remove.setAttribute('aria-label', `Remove ${name} from basket`);
                plus.disabled = line.quantity >= settings.maxPerItem || totals.quantity >= settings.maxItems;
                plus.title = `Maximum ${settings.maxPerItem} per option and ${settings.maxItems} arrangements in total`;
                [minus, plus, remove].forEach((button, index) => {
                    button.dataset.orderAction = ['decrease', 'increase', 'remove'][index];
                    button.dataset.id = line.id;
                });
                controls.append(minus, quantityText, plus, remove);
                item.append(
                    C.el('h3', 'h6 mb-1', name),
                    C.el('p', 'small mb-1', `${L.formatMoney(line.product.price)} each × ${line.quantity}`),
                    C.el('p', 'fw-bold small mb-0', `Line subtotal: ${L.formatMoney(line.subtotal)}`),
                    controls
                );
                summaryItems.append(item);
            });
        }
        fields.items.value = totals.lines.map((line) => `${productLabel(line.product)} — ${line.quantity}`).join('\n');
        fields.quantity.value = String(totals.quantity);
        updateLiveSummary();
        if (pendingFocus) {
            const candidate = Array.from(summaryItems.querySelectorAll('button')).find((button) =>
                button.dataset.id === pendingFocus.id && button.dataset.orderAction === pendingFocus.action && !button.disabled);
            const fallback = summaryItems.querySelector('button:not(:disabled), a');
            (candidate || fallback)?.focus();
            pendingFocus = null;
        }
    }

    function hideOutdatedConfirmation() {
        if (lastSubmission) {
            C.message(errorBox, 'Your choices changed. Create a new demonstration preview to review the updated summary.', 'success');
        }
        lastSubmission = null;
        confirmation.replaceChildren();
        confirmation.classList.add('hidden');
        confirmation.classList.remove('success');
        submitButton.textContent = 'Create demonstration preview';
    }

    function validateVisibleFields(allFields = false) {
        const errors = collectErrors(readValues(), C.getTotals());
        errors.forEach((error, field) => {
            if (allFields || submitted || touched.has(field)) {
                if (field.disabled) C.clearFieldError(field);
                else C.fieldError(field, error);
            }
        });
        return errors;
    }

    function updateValidationFeedback(errors) {
        if (!submitted) return;
        const count = Array.from(errors).filter(([field, text]) => !field.disabled && text !== '').length;
        C.message(errorBox, count > 0
            ? `Please correct ${count} ${count === 1 ? 'field' : 'fields'} marked below. No data was sent.`
            : 'Your current details are valid. Create a demonstration preview to review the complete summary.',
        count > 0 ? 'error' : 'success');
    }

    function addSummaryRow(list, label, value) {
        const item = C.el('li', 'list-group-item text-break');
        item.append(C.el('strong', '', `${label}: `), document.createTextNode(value));
        list.append(item);
        return item;
    }

    function showConfirmation(values, totals) {
        // Only the in-memory form values are compared; no contact data is persisted.
        const signature = JSON.stringify({values, cart: C.getCart()});
        if (!lastSubmission || lastSubmission.signature !== signature) {
            lastSubmission = {signature, reference: L.createReference()};
        }
        const heading = C.el('h2', 'h4', 'Demonstration preview ready');
        heading.tabIndex = -1;
        heading.id = 'demo-confirmation-title';
        const reference = C.el('p', 'fw-bold text-break', `Demo reference: ${lastSubmission.reference}`);
        reference.id = 'demo-reference';
        const notice = C.el('p', '', 'No data has been sent to a server. No real order, booking, reservation or payment has been created. This reference identifies this page preview only; it is not a shop order number.');
        const details = C.el('ul', 'list-group mb-3');
        addSummaryRow(details, 'Name', values.name);
        addSummaryRow(details, 'Phone', values.phone);
        if (values.email !== '') addSummaryRow(details, 'Email', values.email);
        totals.lines.forEach((line) => {
            addSummaryRow(details, productLabel(line.product), `${line.quantity} × ${L.formatMoney(line.product.price)} = ${L.formatMoney(line.subtotal)}`);
        });
        addSummaryRow(details, 'Total arrangements', String(totals.quantity));
        addSummaryRow(details, 'Estimated bouquet subtotal', L.formatMoney(totals.total));
        addSummaryRow(details, 'Preferred date and time', `${values.date}, ${values.time} (Astana time)`);
        addSummaryRow(details, values.receive === 'delivery' ? 'Delivery address' : 'Pickup location',
            values.receive === 'delivery' ? values.address : values.location);
        addSummaryRow(details, 'Payment preference', values.payment === 'remote' ? 'Ask the florist about remote payment' : 'Arrange payment at the shop');
        if (values.message !== '') addSummaryRow(details, 'Card message / requests', values.message);
        const priceNote = C.el('p', 'small', values.receive === 'delivery'
            ? 'Delivery charges are not included. Confirm delivery coverage, the final total and availability directly with Chic Flowers.'
            : 'Confirm bouquet availability, the final price and pickup time directly with Chic Flowers.');
        const actions = C.el('div', 'd-flex flex-wrap gap-2');
        const edit = C.button('Edit details', 'btn btn-outline-dark');
        edit.id = 'edit-order-details';
        edit.addEventListener('click', () => {
            fields.name.focus();
            C.message(errorBox, 'You can edit your details above. Submit again to update the demonstration preview.', 'success');
        });
        const again = C.button('Start another preview', 'btn btn-outline-dark');
        again.id = 'new-order-preview';
        again.addEventListener('click', resetDetails);
        const call = C.el('a', 'btn btn-dark', 'Call the florist to confirm');
        call.href = 'tel:+77058885622';
        actions.append(edit, again, call);
        confirmation.replaceChildren(heading, reference, notice, details, priceNote, actions);
        confirmation.classList.remove('hidden', 'error');
        confirmation.classList.add('state-message', 'success');
        C.message(errorBox, 'Validation passed. Your demonstration summary is ready below.', 'success');
        submitButton.textContent = 'Review the same demonstration';
        heading.focus();
    }

    function resetDetails() {
        [fields.name, fields.phone, fields.email, fields.date, fields.time, fields.location,
            fields.address, fields.message].forEach((field) => { field.value = ''; });
        fields.pickup.checked = true;
        fields.delivery.checked = false;
        fields.storePayment.checked = true;
        fields.remotePayment.checked = false;
        fields.consent.checked = false;
        Object.values(fields).forEach((field) => C.clearFieldError(field));
        touched.clear();
        submitted = false;
        lastSubmission = null;
        confirmation.replaceChildren();
        confirmation.classList.add('hidden');
        confirmation.classList.remove('success');
        submitButton.textContent = 'Create demonstration preview';
        updateConditionalFields();
        renderBasket();
        C.message(basketNotice, '');
        C.message(errorBox, 'Contact details and preferences cleared. Your basket is kept so you can prepare another preview.', 'success');
        fields.name.focus();
    }

    summaryItems.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-order-action]');
        if (!button) return;
        const line = C.getCart().find((entry) => entry.id === button.dataset.id);
        if (!line) return;
        const action = button.dataset.orderAction;
        pendingFocus = {id: line.id, action};
        let result;
        if (action === 'remove') result = C.removeFromCart(line.id);
        else result = C.setQuantity(line.id, line.quantity + (action === 'increase' ? 1 : -1));
        C.message(basketNotice, result.message, result.ok ? 'success' : 'error');
        if (!result.ok) pendingFocus = null;
    });

    document.addEventListener('chic:cartchange', () => {
        hideOutdatedConfirmation();
        renderBasket();
        if (submitted) updateValidationFeedback(validateVisibleFields());
    });

    function handleFieldChange(event) {
        if (!Object.values(fields).includes(event.target)) return;
        touched.add(event.target);
        hideOutdatedConfirmation();
        updateConditionalFields();
        updateLiveSummary();
        updateValidationFeedback(validateVisibleFields());
    }
    form.addEventListener('input', handleFieldChange);
    form.addEventListener('change', handleFieldChange);
    form.addEventListener('reset', (event) => {
        event.preventDefault();
        resetDetails();
    });
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        submitted = true;
        updateConditionalFields();
        const errors = validateVisibleFields(true);
        const invalid = Array.from(errors).filter(([field, text]) => !field.disabled && text !== '');
        if (invalid.length > 0) {
            confirmation.classList.add('hidden');
            C.message(errorBox, `Please correct ${invalid.length} ${invalid.length === 1 ? 'field' : 'fields'} below. No data was sent.`, 'error');
            invalid[0][0].focus();
            return;
        }
        const values = readValues();
        fields.name.value = values.name;
        fields.phone.value = values.phone;
        fields.email.value = values.email;
        fields.address.value = values.address;
        fields.message.value = values.message;
        updateLiveSummary();
        showConfirmation(values, C.getTotals());
    });

    updateConditionalFields();
    renderBasket();
})();


// ===== ORIGINAL FILE: js/blog.js =====
'use strict';

// Gauhar: find an article, read it, then leave or manage a local demo comment.
(() => {
    const posts = document.querySelector('#blog-posts');
    if (!posts) return;

    const { el, button, message, fieldError, clearFieldError, watchImage } = window.Chic;
    const { validateName } = window.ChicLogic;
    const categories = [
        { id: 'all', label: 'All topics' },
        { id: 'gifts', label: 'Gift ideas' },
        { id: 'care', label: 'Flower care' }
    ];
    const articleDetails = {
        'flowers-for-girlfriend': {
            category: 'gifts', catalog: 'premium',
            image: 'img/chic-bouquet.png', imageAlt: 'Flower bouquet for a romantic gift'
        },
        'flowers-for-mom': {
            category: 'gifts', catalog: 'boxes',
            image: 'img/5337175895774535335.jpg', imageAlt: 'Flower bouquet as a gift for mom'
        },
        'flower-care': {
            category: 'care', catalog: 'mono',
            image: 'img/5337175895774535334.jpg', imageAlt: 'Fresh flower arrangement'
        }
    };

    // Read the midterm content once; the original complete articles remain intact.
    const articles = Array.from(posts.querySelectorAll('article')).map((card) => {
        const id = card.querySelector('a').hash.slice(1);
        const image = card.querySelector('img');
        const section = document.getElementById(id);
        return {
            id,
            title: card.querySelector('h3').textContent.trim(),
            description: card.querySelector('.card-text').textContent.trim().replace(/\s+/g, ' '),
            // Shared main.js may already have replaced a missing original image.
            image: image ? image.getAttribute('src') : articleDetails[id].image,
            imageAlt: image ? image.alt : articleDetails[id].imageAlt,
            searchText: section.textContent.toLocaleLowerCase(),
            category: articleDetails[id].category,
            catalog: articleDetails[id].catalog
        };
    });

    function addOption(select, value, label) {
        const option = el('option', '', label);
        option.value = value;
        select.append(option);
        return option;
    }

    function labelledControl(id, text, control, classes = 'col-12 col-md-6') {
        const wrapper = el('div', classes);
        const label = el('label', 'form-label', text);
        label.htmlFor = id;
        control.id = id;
        wrapper.append(label, control);
        return wrapper;
    }

    const controls = el('form', 'row g-3 align-items-end mb-4');
    controls.id = 'article-search-form';
    controls.setAttribute('role', 'search');
    controls.setAttribute('aria-label', 'Find a flower journal article');
    const search = el('input', 'form-control');
    search.type = 'search';
    search.maxLength = 100;
    search.placeholder = 'Try roses, water or gift';
    const category = el('select', 'form-select');
    categories.forEach((item) => addOption(category, item.id, item.label));
    const resetSearch = button('Reset article filters');
    resetSearch.id = 'article-reset';
    const resetWrapper = el('div', 'col-12');
    resetWrapper.append(resetSearch);
    controls.append(
        labelledControl('article-search', 'Search articles', search),
        labelledControl('article-category', 'Topic', category),
        resetWrapper
    );
    const resultCount = el('p', 'text-secondary');
    resultCount.id = 'article-count';
    resultCount.setAttribute('role', 'status');
    resultCount.setAttribute('aria-live', 'polite');
    const articleList = posts.querySelector('.row');
    articleList.id = 'article-results';
    articleList.classList.add('row-cols-1', 'row-cols-md-2', 'row-cols-lg-3');
    posts.insertBefore(controls, articleList);
    posts.insertBefore(resultCount, articleList);

    function filterArticles(items, query, selectedCategory) {
        const term = query.trim().toLocaleLowerCase();
        return items.filter((article) => {
            const matchesTopic = selectedCategory === 'all' || article.category === selectedCategory;
            const matchesText = `${article.title} ${article.description} ${article.searchText}`
                .toLocaleLowerCase().includes(term);
            return matchesTopic && matchesText;
        });
    }

    function renderArticle(article) {
        const column = el('article', 'col');
        const card = el('div', 'card h-100 shadow-sm product-card journal-card');
        card.dataset.articleId = article.id;
        const picture = el('img', 'card-img-top');
        picture.alt = article.imageAlt;
        picture.loading = 'lazy';
        picture.src = article.image;
        const body = el('div', 'card-body d-flex flex-column');
        const topic = categories.find((item) => item.id === article.category);
        const tag = el('p', 'small text-secondary', topic.label);
        const title = el('h3', 'card-title h5', article.title);
        const description = el('p', 'card-text', article.description);
        const read = el('a', 'btn btn-dark mt-auto', 'Read article');
        read.href = `#${article.id}`;
        read.setAttribute('aria-label', `Read ${article.title}`);
        body.append(tag, title, description, read);
        card.append(picture, body);
        column.append(card);
        watchImage(picture);
        return column;
    }

    function renderArticles() {
        const matches = filterArticles(articles, search.value, category.value);
        articleList.replaceChildren();
        matches.forEach((article) => articleList.append(renderArticle(article)));
        if (matches.length === 0) {
            const empty = el('p', 'col-12 state-message', 'No articles match. Try another word or reset the filters.');
            empty.id = 'article-empty';
            articleList.append(empty);
        }
        resultCount.textContent = `${matches.length} of ${articles.length} articles match.`;
        resetSearch.classList.toggle('active', search.value.trim() !== '' || category.value !== 'all');
        markCurrentArticle();
    }

    function markCurrentArticle() {
        const currentId = window.location.hash.slice(1);
        articleList.querySelectorAll('[data-article-id]').forEach((card) => {
            card.classList.toggle('selected', card.dataset.articleId === currentId);
        });
    }

    controls.addEventListener('submit', (event) => {
        event.preventDefault();
        renderArticles();
    });
    search.addEventListener('input', renderArticles);
    category.addEventListener('change', renderArticles);
    resetSearch.addEventListener('click', () => {
        search.value = '';
        category.value = 'all';
        renderArticles();
        search.focus();
    });
    window.addEventListener('hashchange', markCurrentArticle);

    // Comments are held only in this array. No names or text enter browser storage.
    const comments = [];
    let nextCommentId = 1;
    let editingId = null;
    let pendingDeleteId = null;
    let attemptedSubmit = false;

    const commentsSection = el('section', 'container py-5');
    commentsSection.id = 'journal-comments';
    const heading = el('h2', 'h2', 'Discuss the articles');
    const privacyNote = el('p', 'text-secondary',
        'Practice writing an article comment. Comments stay on this open page only and disappear on reload. Nothing is sent to a server or published as a real customer review.');
    const commentForm = el('form', 'card card-body shadow-sm mb-4');
    commentForm.id = 'comment-form';
    commentForm.noValidate = true;
    const formHeading = el('h3', 'h5', 'Add a demo comment');
    formHeading.id = 'comment-form-heading';
    commentForm.setAttribute('aria-labelledby', formHeading.id);
    const fieldGrid = el('div', 'row g-3');
    const name = el('input', 'form-control');
    name.type = 'text';
    name.required = true;
    name.maxLength = 60;
    name.autoComplete = 'nickname';
    const articleChoice = el('select', 'form-select');
    articleChoice.required = true;
    addOption(articleChoice, '', 'Choose an article');
    articles.forEach((article) => addOption(articleChoice, article.id, article.title));
    const rating = el('select', 'form-select');
    rating.required = true;
    addOption(rating, '', 'Choose a rating');
    for (let score = 1; score <= 5; score += 1) {
        addOption(rating, String(score), `${score} / 5`);
    }
    const commentText = el('textarea', 'form-control');
    commentText.required = true;
    commentText.rows = 4;
    commentText.maxLength = 600;
    commentText.placeholder = 'Share what you found useful or ask a question about this article.';
    const textWrapper = labelledControl('comment-text', 'Your comment (20–600 characters)', commentText, 'col-12');
    const counter = el('p', 'form-text mb-0');
    counter.id = 'comment-counter';
    commentText.setAttribute('aria-describedby', counter.id);
    textWrapper.append(counter);
    fieldGrid.append(
        labelledControl('comment-name', 'Display name (2–60 characters)', name),
        labelledControl('comment-article', 'Article', articleChoice),
        labelledControl('comment-rating', 'How helpful was the article?', rating),
        textWrapper
    );
    const actions = el('div', 'd-flex flex-wrap gap-2 mt-3');
    const submitComment = button('Add demo comment', 'btn btn-dark', 'submit');
    submitComment.id = 'comment-submit';
    const resetComment = button('Clear comment form');
    resetComment.id = 'comment-reset';
    actions.append(submitComment, resetComment);
    const formStatus = el('p', 'state-message hidden');
    formStatus.id = 'comment-status';
    formStatus.setAttribute('role', 'status');
    formStatus.setAttribute('aria-live', 'polite');
    commentForm.append(formHeading, fieldGrid, actions, formStatus);

    const listControls = el('div', 'row g-3 align-items-end mb-3');
    const commentFilter = el('select', 'form-select');
    addOption(commentFilter, 'all', 'All articles');
    articles.forEach((article) => addOption(commentFilter, article.id, article.title));
    const showAll = button('Show all comments');
    showAll.id = 'comment-show-all';
    const showAllWrapper = el('div', 'col-12 col-md-6');
    showAllWrapper.append(showAll);
    listControls.append(labelledControl('comment-filter', 'View comments for', commentFilter), showAllWrapper);
    const commentCount = el('p', 'text-secondary');
    commentCount.id = 'comment-count';
    commentCount.setAttribute('aria-live', 'polite');
    const commentList = el('div', 'row g-3');
    commentList.id = 'comment-list';
    commentList.tabIndex = -1;
    commentList.setAttribute('aria-label', 'Local demo comments');
    commentsSection.append(heading, privacyNote, commentForm, listControls, commentCount, commentList);
    document.querySelector('main').insertBefore(commentsSection, document.getElementById('journal-next'));

    function commentError(input) {
        if (input === name) return validateName(name.value);
        if (input === articleChoice) {
            return articles.some((article) => article.id === articleChoice.value)
                ? '' : 'Choose the article you are commenting on.';
        }
        if (input === rating) {
            const value = Number(rating.value);
            return Number.isInteger(value) && value >= 1 && value <= 5
                ? '' : 'Rate this article from 1 to 5.';
        }
        const length = commentText.value.trim().length;
        if (length < 20) return 'Write at least 20 characters, excluding spaces at the beginning and end.';
        if (length > 600) return 'Keep your comment within 600 characters.';
        return '';
    }

    function updateCounter() {
        const count = commentText.value.trim().length;
        counter.textContent = `${count} / 600 characters after trimming. Minimum: 20.`;
        counter.classList.toggle('error', count > 600);
    }

    function validateCommentForm() {
        const fields = [name, articleChoice, rating, commentText];
        let firstInvalid = null;
        fields.forEach((input) => {
            const error = commentError(input);
            fieldError(input, error);
            if (error !== '' && firstInvalid === null) firstInvalid = input;
        });
        if (firstInvalid !== null) {
            firstInvalid.focus();
            return false;
        }
        return true;
    }

    function resetCommentForm(keepName = false) {
        if (!keepName) name.value = '';
        articleChoice.value = '';
        rating.value = '';
        commentText.value = '';
        editingId = null;
        attemptedSubmit = false;
        formHeading.textContent = 'Add a demo comment';
        submitComment.textContent = 'Add demo comment';
        resetComment.textContent = 'Clear comment form';
        [name, articleChoice, rating, commentText].forEach(clearFieldError);
        updateCounter();
    }

    function beginEdit(comment) {
        editingId = comment.id;
        pendingDeleteId = null;
        attemptedSubmit = false;
        name.value = comment.name;
        articleChoice.value = comment.articleId;
        rating.value = String(comment.rating);
        commentText.value = comment.text;
        [name, articleChoice, rating, commentText].forEach(clearFieldError);
        formHeading.textContent = 'Edit your demo comment';
        submitComment.textContent = 'Save comment changes';
        resetComment.textContent = 'Cancel editing';
        message(formStatus, 'Editing your local comment. Save changes or cancel to keep the original.');
        updateCounter();
        renderComments();
        commentForm.scrollIntoView({ block: 'start' });
        commentText.focus();
    }

    function formatCommentDate(isoDate) {
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: window.ChicData.settings.timeZone,
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(isoDate));
    }

    // The same renderer handles every new, existing and edited comment object.
    function renderComment(comment) {
        const column = el('div', 'col-12');
        const card = el('article', 'card shadow-sm');
        card.id = `journal-comment-${comment.id}`;
        card.classList.toggle('selected', comment.id === editingId);
        const body = el('div', 'card-body');
        const article = articles.find((item) => item.id === comment.articleId);
        const title = el('h3', 'h5 text-break', comment.name);
        const details = el('p', 'small text-secondary', `${article.title} · Helpfulness: ${comment.rating}/5`);
        const dateLine = el('p', 'small text-secondary');
        const time = el('time', '', `${formatCommentDate(comment.createdAt)} (Astana time)`);
        time.dateTime = comment.createdAt;
        dateLine.append(time);
        if (comment.updatedAt !== null) {
            dateLine.append(document.createTextNode(` · Edited ${formatCommentDate(comment.updatedAt)}`));
        }
        const text = el('p', 'text-break', comment.text);
        const state = el('p', 'small text-secondary', 'Local demo comment — not publicly submitted.');
        const buttons = el('div', 'd-flex flex-wrap gap-2');
        const edit = button('Edit', 'btn btn-outline-dark btn-sm');
        edit.setAttribute('aria-label', `Edit comment by ${comment.name}`);
        edit.addEventListener('click', () => beginEdit(comment));
        const remove = button('Remove', 'btn btn-outline-secondary btn-sm');
        remove.setAttribute('aria-label', `Remove comment by ${comment.name}`);
        remove.addEventListener('click', () => {
            pendingDeleteId = comment.id;
            renderComments();
            document.getElementById(`confirm-delete-${comment.id}`).focus();
        });
        buttons.append(edit, remove);
        body.append(title, details, dateLine, text, state, buttons);
        if (pendingDeleteId === comment.id) {
            const confirmation = el('div', 'border rounded p-3 mt-3');
            const prompt = el('p', '', 'Remove this demo comment from the open page?');
            const confirm = button('Yes, remove', 'btn btn-dark btn-sm');
            confirm.id = `confirm-delete-${comment.id}`;
            const cancel = button('Cancel', 'btn btn-outline-secondary btn-sm');
            const confirmationButtons = el('div', 'd-flex flex-wrap gap-2');
            confirm.addEventListener('click', () => {
                const index = comments.findIndex((item) => item.id === comment.id);
                if (index !== -1) comments.splice(index, 1);
                if (editingId === comment.id) resetCommentForm(true);
                pendingDeleteId = null;
                renderComments();
                message(formStatus, 'Demo comment removed. Nothing was sent to a server.');
                commentList.focus();
            });
            cancel.addEventListener('click', () => {
                pendingDeleteId = null;
                renderComments();
                message(formStatus, 'Removal cancelled. Your demo comment is unchanged.');
                document.getElementById(`journal-comment-${comment.id}`).querySelector('button').focus();
            });
            confirmationButtons.append(confirm, cancel);
            confirmation.append(prompt, confirmationButtons);
            body.append(confirmation);
        }
        card.append(body);
        column.append(card);
        return column;
    }

    function renderComments() {
        const visible = comments.filter((comment) => commentFilter.value === 'all' || comment.articleId === commentFilter.value);
        commentList.replaceChildren();
        visible.forEach((comment) => commentList.append(renderComment(comment)));
        if (visible.length === 0) {
            const empty = el('p', 'col-12', comments.length === 0
                ? 'No comments yet. Add the first local demo comment using the form above.'
                : 'No comments for this article yet. Add one above or choose Show all comments.');
            empty.id = 'comment-empty';
            commentList.append(empty);
        }
        commentCount.textContent = `${visible.length} of ${comments.length} local demo comments shown.`;
        showAll.classList.toggle('active', commentFilter.value !== 'all');
    }

    commentForm.addEventListener('submit', (event) => {
        event.preventDefault();
        attemptedSubmit = true;
        if (!validateCommentForm()) {
            message(formStatus, 'Please correct the marked fields before adding your demo comment.', 'error');
            return;
        }
        const values = {
            name: name.value.trim(),
            articleId: articleChoice.value,
            rating: Number(rating.value),
            text: commentText.value.trim()
        };
        const duplicate = comments.find((comment) => comment.id !== editingId
            && comment.name === values.name && comment.articleId === values.articleId
            && comment.rating === values.rating && comment.text === values.text);
        if (duplicate) {
            commentFilter.value = values.articleId;
            renderComments();
            message(formStatus, 'This exact demo comment already appears below. Edit that comment or write a different one.', 'error');
            commentText.focus();
            return;
        }
        const wasEditing = editingId !== null;
        if (wasEditing) {
            const existing = comments.find((comment) => comment.id === editingId);
            Object.assign(existing, values, { updatedAt: new Date().toISOString() });
        } else {
            comments.push({ id: nextCommentId, ...values, createdAt: new Date().toISOString(), updatedAt: null });
            nextCommentId += 1;
        }
        pendingDeleteId = null;
        commentFilter.value = values.articleId;
        resetCommentForm(true);
        renderComments();
        message(formStatus, wasEditing
            ? 'Demo comment updated on this page only. No data was sent or published.'
            : 'Demo comment added on this page only. No data was sent or published; reloading will remove it.');
    });

    [name, articleChoice, rating, commentText].forEach((input) => {
        const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(eventType, () => {
            updateCounter();
            if (attemptedSubmit) fieldError(input, commentError(input));
            else clearFieldError(input);
            message(formStatus, '');
        });
    });
    resetComment.addEventListener('click', () => {
        const wasEditing = editingId !== null;
        resetCommentForm();
        renderComments();
        message(formStatus, wasEditing ? 'Editing cancelled. The original demo comment is unchanged.' : 'Comment form cleared. Existing demo comments are unchanged.');
        name.focus();
    });
    commentFilter.addEventListener('change', () => {
        pendingDeleteId = null;
        renderComments();
    });
    showAll.addEventListener('click', () => {
        commentFilter.value = 'all';
        pendingDeleteId = null;
        renderComments();
        commentFilter.focus();
    });

    articles.forEach((article) => {
        const section = document.getElementById(article.id);
        const catalogLink = section.querySelector('a[href="catalog.html"]');
        if (catalogLink) catalogLink.href = `catalog.html#${article.catalog}`;
        const discuss = button('Discuss this article', 'btn btn-outline-dark mt-3');
        discuss.addEventListener('click', () => {
            if (editingId !== null) {
                message(formStatus, 'Save or cancel your current comment edit before choosing another article.', 'error');
            } else {
                articleChoice.value = article.id;
                clearFieldError(articleChoice);
                commentFilter.value = article.id;
                renderComments();
                message(formStatus, `Commenting on “${article.title}”. Your comment stays on this page only.`);
            }
            commentForm.scrollIntoView({ block: 'start' });
            name.focus();
        });
        section.firstElementChild.append(discuss);
    });

    renderArticles();
    updateCounter();
    renderComments();
})();

