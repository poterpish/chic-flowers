'use strict';

// jQuery 3.7.1: ready waits for the catalog and its prepared basket container.
$(function () {
    const $intro = $('#catalog-intro');
    if (!$intro.length) return;
    const C = window.Chic;
    const L = window.ChicLogic;
    const { products, categories, settings } = window.ChicData;
    const arrangementCount = new Set(products.map((p) => p.groupId)).size;
    $intro.find('.lead').text(`Explore ${arrangementCount} arrangements in ${products.length} size options. Search, compare estimates and prepare a demonstration order.`);
    $intro.find('p.small.mb-0').text('Add bouquets, adjust quantities and continue to the order form. Confirm availability and final prices with Chic Flowers.');

    const $form = C.el('form', 'container pb-4').attr({ id: 'catalog-controls', 'aria-label': 'Filter the flower catalog' }).prop('noValidate', true);
    const $row = C.el('div', 'row g-3 align-items-end').attr('id', 'catalog-filter-panel');
    const $search = C.el('input', 'form-control').attr({ type: 'search', maxlength: 100, placeholder: 'For example: rose, hydrangea' });
    const $category = C.el('select', 'form-select');
    C.option($category, 'all', 'All categories');
    categories.forEach((item) => C.option($category, item.id, item.label));
    const $sort = C.el('select', 'form-select');
    [['name', 'Name: A to Z'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low']]
        .forEach(([value, text]) => C.option($sort, value, text));
    const $maximum = C.el('input', 'form-control').attr({ type: 'number', min: 14500, max: 2000000, step: 1000, placeholder: 'Any price' });
    [['catalog-search', 'Search name or flowers', $search], ['catalog-category', 'Category', $category],
        ['catalog-sort', 'Sort within categories', $sort], ['catalog-max-price', 'Maximum price (KZT, optional)', $maximum]]
        .forEach(([id, text, $input]) => $row.append(C.field(id, text, $input, 'col-12 col-md-6 col-lg-3')));
    const $reset = C.button('Reset filters', 'btn btn-outline-secondary').attr('id', 'catalog-reset');
    const $toggle = C.button('Hide filters', 'btn btn-outline-secondary btn-sm mb-3')
        .attr({ id: 'catalog-filter-toggle', 'aria-controls': 'catalog-filter-panel', 'aria-expanded': 'true' });
    const $count = C.el('p', 'fw-semibold mt-3 mb-0').attr({ id: 'catalog-count', role: 'status', 'aria-live': 'polite' });
    const $empty = C.el('p', 'hidden').attr({ id: 'catalog-empty', role: 'status' });
    const $linkFeedback = C.el('p', 'hidden').attr('id', 'catalog-link-feedback');
    $form.append($toggle, $row, C.el('div', 'd-flex flex-wrap gap-2 mt-3').append(C.button('Apply filters', 'btn btn-dark', 'submit'), $reset), $count, $empty, $linkFeedback).insertAfter($intro);
    const sections = categories.map((item) => {
        const $section = $(`#${item.id}`);
        return { ...item, $section, $grid: $section.find('.row').first().attr('id', `catalog-${item.id}-results`), $badge: $section.find('.badge') };
    });
    const parameters = new URLSearchParams(window.location.search);
    const requestedCategory = parameters.get('category') || window.location.hash.slice(1);
    const invalid = [];
    if (categories.some((c) => c.id === requestedCategory)) $category.val(requestedCategory);
    else if (parameters.has('category') && requestedCategory !== 'all') invalid.push('category');
    if (['name', 'price-asc', 'price-desc'].includes(parameters.get('sort'))) $sort.val(parameters.get('sort'));
    else if (parameters.has('sort')) invalid.push('sort order');
    $search.val((parameters.get('q') || '').slice(0, 100));
    const rawMax = parameters.get('max') || '';
    if (rawMax !== '') {
        const n = Number(rawMax);
        if (Number.isInteger(n) && n >= 1 && n <= 2000000) $maximum.val(String(n));
        else invalid.push('maximum price');
    }
    function readFilters() {
        const raw = $maximum.val().trim();
        const value = Number(raw);
        return { valid: !$maximum.prop('validity').badInput && (raw === '' || (Number.isInteger(value) && value >= 1 && value <= 2000000)),
            query: $search.val().trim(), category: $category.val(), sort: $sort.val(), maxPrice: raw === '' ? Infinity : value };
    }
    function renderCatalog(focusInvalid = false, saveAddress = true) {
        C.message($linkFeedback, '');
        const filters = readFilters();
        if (!filters.valid) {
            C.fieldError($maximum, 'Use a whole price from 1 to 2,000,000 KZT, or leave the filter blank.');
            sections.forEach((s) => s.$section.addClass('hidden'));
            $count.text('Enter a valid maximum price.');
            C.message($empty, 'Correct the price filter or reset the filters.', 'error');
            if (focusInvalid) { C.reveal($row); C.focus($maximum); }
            return [];
        }
        C.clearFieldError($maximum);
        const matches = L.filterProducts(products, filters);
        sections.forEach((s) => {
            const subset = matches.filter((product) => product.category === s.id);
            C.renderProducts(subset, s.$grid);
            s.$section.toggleClass('hidden', !subset.length);
            s.$badge.text(`${subset.length} options`);
        });
        $count.text(`${matches.length} of ${products.length} catalog options match your choices.`);
        C.message($empty, !matches.length ? 'No bouquets match these filters. Try another word, increase your maximum price or Reset filters.' : '', 'error');
        $intro.find('a[href^="#"]').each(function () {
            const id = $(this).attr('href').slice(1);
            if (!categories.some((c) => c.id === id)) return;
            const selected = id === $category.val();
            $(this).toggleClass('active btn-dark', selected).toggleClass('btn-outline-dark', !selected);
            if (selected) $(this).attr('aria-current', 'true');
            else $(this).removeAttr('aria-current');
        });
        if (saveAddress) {
            const query = new URLSearchParams(window.location.search);
            [['q', filters.query], ['category', filters.category], ['sort', filters.sort], ['max', $maximum.val().trim()]].forEach(([key, value]) => {
                if (value === '' || value === 'all' || (key === 'sort' && value === 'name')) query.delete(key);
                else query.set(key, value);
            });
            const hash = filters.category === 'all' ? 'catalog-controls' : filters.category;
            try { window.history.replaceState(null, '', `${window.location.pathname}${query.size ? `?${query}` : ''}#${hash}`); } catch { /* file:// */ }
        }
        return matches;
    }
    $form.on('submit', function (event) {
        event.preventDefault(); // Without this, GET navigation would replace the filtered page.
        renderCatalog(true);
    });
    $form.on('input', 'input', function () { renderCatalog(); });
    $form.on('change', 'select', function () { renderCatalog(); });
    $reset.on('click', function () {
        $search.val(''); $category.val('all'); $sort.val('name'); $maximum.val('');
        renderCatalog(); C.reveal($row, 'slide', function () { C.focus($search); });
        $toggle.text('Hide filters').attr('aria-expanded', 'true');
        C.announce('Filters reset. Your basket is unchanged.');
    });
    $toggle.on('click', function () {
        const open = $(this).attr('aria-expanded') !== 'true';
        $(this).attr('aria-expanded', String(open)).text(open ? 'Hide filters' : 'Show filters');
        if (open) C.reveal($row); else C.conceal($row);
    });
    $intro.on('click', 'a[href^="#"]', function (event) {
        const id = $(this).attr('href').slice(1);
        if (!categories.some((c) => c.id === id)) return;
        event.preventDefault(); // Update the linked filter rather than scrolling to a hidden section.
        $category.val(id); renderCatalog();
        const $target = $(`#${id}`);
        C.focus(($target.hasClass('hidden') ? $form : $target).attr('tabindex', '-1'));
    });
    $(window).on('hashchange', function () {
        const id = window.location.hash.slice(1);
        if (categories.some((c) => c.id === id)) { $category.val(id); renderCatalog(); }
    });
    renderCatalog(false, false);
    if (invalid.length) C.message($linkFeedback, `Invalid ${invalid.join(', ')} in the link was reset.`, 'error');

    const $overview = $('#catalog-overview').find('tbody').empty();
    $('#catalog-overview > p').text('All catalog estimates. Each size is a separate option; final prices are confirmed by the shop.');
    products.forEach((product) => C.el('tr').append(C.el('td', '', categories.find((c) => c.id === product.category).label),
        C.el('td', '', C.productLabel(product)), C.el('td', '', L.formatMoney(product.price))).appendTo($overview));
    if (!products.length) $overview.append(C.el('tr').append(C.el('td', '', 'No catalog prices available.').attr('colspan', 3)));

    const $basket = $('#basket');
    const $list = $('#basket-items');
    const $basketEmpty = $('#basket-empty').text('Your basket is empty. ');
    const $browse = C.el('a', '', 'Choose bouquets above.').attr({ id: 'basket-browse', href: '#catalog-controls' }).appendTo($basketEmpty);
    // Rename the output in code to avoid the inherited CSS counter pseudo-element.
    const $total = $('#basket-total').attr('id', 'basket-sum');
    const $quantity = C.el('p', 'small text-secondary mt-3 mb-0').attr('id', 'basket-quantity').insertAfter($total.parent());
    const $checkout = $('#basket-checkout');
    $basket.find('.col-lg-7 > p').text(`Change quantities or remove bouquets. Demo limits: ${settings.maxPerItem} per option, ${settings.maxItems} arrangements total.`);
    $basket.find('.brand-note > p').first().text('Your basket is transferred automatically to the order form.');
    $basket.find('.brand-note > p.small').text('No real order or payment is created. Only product IDs and quantities are transferred; no personal data is put in the URL.');
    const $clear = C.button('Clear basket', 'btn btn-outline-secondary mt-3').attr('id', 'basket-clear');
    const $prompt = C.el('div', 'border rounded p-3 mt-3 hidden').attr('id', 'basket-clear-prompt');
    const $confirm = C.button('Yes, clear basket', 'btn btn-dark').attr('id', 'basket-clear-confirm');
    const $cancel = C.button('Keep my basket').attr('id', 'basket-clear-cancel');
    $prompt.append(C.el('p', '', 'Remove every bouquet from your basket?'), C.el('div', 'd-flex flex-wrap gap-2').append($confirm, $cancel));
    $list.parent().append($clear, $prompt);
    const $feedback = C.el('p', 'hidden').attr({ id: 'basket-feedback', role: 'status' }).appendTo($basket);
    // ENDTERM EXTENSION (jQuery): compare the entire basket against a visitor's
    // spending limit; suggest an additional bouquet only when it really fits.
    // No invented delivery charge or commercial discount is included.
    const $giftBudget = C.el('input', 'form-control').attr({
        id: 'basket-budget', type: 'number', min: 1, max: 2000000, step: 1,
        placeholder: 'For example: 100000', 'aria-describedby': 'basket-budget-help'
    });
    const $budgetMessage = C.el('p', 'hidden').attr({ id: 'basket-budget-status', role: 'status', 'aria-live': 'polite' });
    const $budgetCandidates = C.el('div', 'd-flex flex-column gap-2 mt-3').attr('id', 'basket-budget-candidates');
    const $budgetSection = C.el('section', 'border rounded p-3 mt-4').attr({ id: 'basket-budget-panel', 'aria-label': 'Plan a total bouquet budget' });
    $budgetSection.append(C.el('h4', 'h5', 'Check your total gift budget'),
        C.el('label', 'form-label', 'Maximum spend on bouquets (KZT)').attr('for', 'basket-budget'), $giftBudget,
        C.el('p', 'form-text', 'Optional. Compares the complete basket against your budget; excludes delivery.').attr('id', 'basket-budget-help'),
        $budgetMessage, $budgetCandidates);
    $basket.find('.brand-note').append($budgetSection);
    function renderBudgetPlan() {
        const raw = $giftBudget.val().trim();
        const limit = Number(raw);
        const totals = C.getTotals();
        $budgetCandidates.empty();
        if (raw === '') {
            C.clearFieldError($giftBudget);
            C.message($budgetMessage, 'Enter a budget to see the remaining amount and suitable additions.');
            return;
        }
        if (!Number.isInteger(limit) || limit < 1 || limit > 2000000 || $giftBudget.prop('validity').badInput) {
            C.fieldError($giftBudget, 'Use a whole total budget from 1 to 2,000,000 KZT.');
            C.message($budgetMessage, 'Correct your budget before comparing bouquet costs.', 'error');
            return;
        }
        C.clearFieldError($giftBudget);
        const difference = limit - totals.total;
        if (difference < 0) {
            C.message($budgetMessage, `Your bouquet subtotal exceeds the budget by ${L.formatMoney(-difference)}. Reduce quantities or choose lower-priced arrangements.`, 'error');
            return;
        }
        C.message($budgetMessage, `Basket: ${L.formatMoney(totals.total)} of ${L.formatMoney(limit)}. Remaining: ${L.formatMoney(difference)}. Delivery is not included.`);
        if (totals.quantity >= settings.maxItems) {
            $budgetCandidates.append(C.el('p', 'small mb-0', 'The demo basket has reached its quantity limit.')); return;
        }
        const inCart = new Set(totals.lines.map((line) => line.id));
        const eligible = products.filter((item) => !inCart.has(item.id) && item.price <= difference)
            .sort((a, b) => b.price - a.price || a.name.localeCompare(b.name)).slice(0, 3);
        $budgetCandidates.append(C.el('h5', 'h6 mb-0', 'Optional additions that fit the remaining budget'));
        if (eligible.length === 0) {
            $budgetCandidates.append(C.el('p', 'small text-secondary mb-0', 'No other bouquet fits the remaining amount. Your current selection is still available.')); return;
        }
        eligible.forEach((item) => {
            const $button = C.button(`Add ${C.productLabel(item)}`, 'btn btn-outline-dark btn-sm')
                .attr({ 'data-add-id': item.id, 'aria-label': `Add ${C.productLabel(item)} to basket` });
            $budgetCandidates.append(C.el('div', 'd-flex flex-wrap justify-content-between gap-2 align-items-center')
                .append(C.el('span', 'small text-break', `${C.productLabel(item)} — ${L.formatMoney(item.price)}`), $button));
        });
    }
    $giftBudget.on('input', renderBudgetPlan);
    function renderBasket() {
        const $focused = $(':focus');
        const previousId = $focused.attr('data-product-id');
        const previousAction = $focused.attr('data-cart-action');
        const totals = C.getTotals();
        $list.empty();
        totals.lines.forEach((line) => {
            const name = C.productLabel(line.product);
            const $row = C.el('li', 'list-group-item py-3').attr('data-product-id', line.id);
            const $actions = C.el('div', 'd-flex flex-wrap gap-2 align-items-center');
            [['−', 'decrease'], ['+', 'increase'], ['Remove', 'remove']].forEach(([text, action]) => {
                C.button(text, 'btn btn-outline-dark btn-sm').attr({ 'data-cart-action': action, 'data-product-id': line.id,
                    'aria-label': `${action} ${name}` }).prop('disabled', action === 'increase' && (line.quantity >= settings.maxPerItem || totals.quantity >= settings.maxItems)).appendTo($actions);
            });
            $actions.prepend(C.el('span', 'small', `Quantity: ${line.quantity}`));
            $row.append(C.el('strong', 'text-break', name), C.el('p', 'small text-secondary mb-2', `${L.formatMoney(line.product.price)} × ${line.quantity} = ${L.formatMoney(line.subtotal)}`), $actions).appendTo($list);
        });
        $basketEmpty.toggleClass('hidden', totals.quantity !== 0);
        $total.text(L.formatMoney(totals.total));
        $quantity.text(`${totals.quantity} arrangements · ${totals.lines.length} different options. Delivery is quoted by the shop.`);
        $checkout.add($clear).prop('disabled', totals.quantity === 0);
        renderBudgetPlan();
        $prompt.stop(true, true).addClass('hidden').removeAttr('style');
        if (previousId && previousAction) {
            let $next = $list.find('button:not(:disabled)').filter(function () {
                return $(this).attr('data-product-id') === previousId && $(this).attr('data-cart-action') === previousAction;
            }).first();
            if (!$next.length) $next = $list.find('button:not(:disabled)').first();
            C.focus($next.length ? $next : $browse);
        }
    }
    // Delegation survives .empty() and rebuilding rows; direct bindings would be lost.
    $list.on('click', 'button[data-cart-action]', function () {
        const $button = $(this);
        const id = $button.closest('li').attr('data-product-id');
        const line = C.getCart().find((item) => item.id === id);
        if (!line) return;
        const action = $button.attr('data-cart-action');
        const result = action === 'remove' ? C.removeFromCart(id) : C.setQuantity(id, line.quantity + (action === 'increase' ? 1 : -1));
        C.message($feedback, result.message, result.ok ? 'success' : 'error');
    });
    // REWRITE 2: .on(), .slideDown()/.slideUp() replace click listeners and classList
    // show/hide. The effect callback adds useful focus management, not fewer lines.
    $clear.on('click', function () {
        C.reveal($prompt, 'slide', function () { C.focus($confirm); });
    });
    function cancelClear() {
        C.conceal($prompt, 'slide', function () { C.focus($clear); });
        C.message($feedback, 'Your basket was kept.');
    }
    $cancel.on('click', cancelClear);
    $prompt.on('keydown', function (event) { if (event.key === 'Escape') cancelClear(); });
    $confirm.on('click', function () { C.clearCart(); C.message($feedback, 'Your basket is now empty.'); C.focus($browse); });
    $('#basket-form').on('submit', function (event) {
        event.preventDefault(); // Otherwise the legacy form submits stale checkbox values.
        if (!C.getTotals().quantity) { C.message($feedback, 'Add a bouquet first.', 'error'); C.focus($browse); return; }
        window.location.assign(C.checkoutURL());
    });
    $(document).on('chic:cartchange', function () { renderBasket(); C.message($feedback, ''); });
    renderBasket();
});
