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
