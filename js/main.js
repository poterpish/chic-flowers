'use strict';

// jQuery 3.7.1 (full build). ready waits for the DOM before selecting or creating UI.
$(function () {
    const L = window.ChicLogic;
    const settings = window.ChicData.settings;
    const CART_KEY = 'chic-flowers-cart-v1';
    let storageAvailable = true;
    let invalidSavedData = false;
    let cart = L.normaliseCart(safeRead(CART_KEY, []));

    // Pure data/calculation functions remain in logic.js; all UI uses jQuery.
    function el(tag, classes = '', text = '') {
        return $(`<${tag}>`).addClass(classes).text(text);
    }
    function button(text, classes = 'btn btn-outline-dark', type = 'button') {
        return el('button', classes, text).attr('type', type);
    }
    function option($select, value, text) {
        return el('option', '', text).val(value).appendTo($select);
    }
    function field(id, text, $input, classes = 'col-12 col-md-6') {
        return el('div', classes).append(el('label', 'form-label', text).attr('for', id), $input.attr('id', id));
    }
    function message($target, text, kind = 'success') {
        $target.text(text).addClass('state-message text-break').attr('aria-live', 'polite')
            .toggleClass('hidden', text === '').toggleClass('error', text !== '' && kind === 'error')
            .toggleClass('success', text !== '' && kind === 'success');
    }
    function fieldError($input, text) {
        const id = `${$input.attr('id')}-error`;
        let $output = $(`#${id}`);
        if (!$output.length) {
            $output = el('p', 'small mt-2 mb-0 text-break').attr({ id, 'aria-live': 'polite' });
            // Traversal: radio/checkbox feedback goes after its sibling label.
            const $label = $input.is(':checkbox, :radio') ? $input.siblings('label').first() : $();
            $output.insertAfter($label.length ? $label : $input);
        }
        const descriptions = new Set(($input.attr('aria-describedby') || '').split(/\s+/).filter(Boolean));
        descriptions.add(id);
        $input.attr({ 'aria-describedby': [...descriptions].join(' '), 'aria-invalid': String(text !== '') })
            .toggleClass('error', text !== '').toggleClass('is-invalid', text !== '')
            .toggleClass('is-valid', text === '');
        $output.text(text).toggleClass('hidden', text === '').toggleClass('error', text !== '');
    }
    function clearFieldError($input) {
        $(`#${$input.attr('id')}-error`).empty().addClass('hidden').removeClass('error');
        $input.removeClass('error is-invalid is-valid').removeAttr('aria-invalid');
    }

    // Effects are the assignment's explicit exception for transient animation styles.
    // We never call .css() or set style rules. Callbacks restore existing state classes.
    function reveal($target, effect = 'slide', done = function () {}) {
        $target.stop(true, true);
        const complete = function () {
            $(this).removeClass('hidden').removeAttr('style');
            done();
        };
        if (effect === 'fade') $target.fadeIn(180, complete);
        else $target.slideDown(180, complete);
    }
    function conceal($target, effect = 'slide', done = function () {}) {
        $target.stop(true, true);
        if ($target.hasClass('hidden')) { done(); return; }
        const complete = function () {
            $(this).addClass('hidden').removeAttr('style');
            done();
        };
        if (effect === 'fade') $target.fadeOut(160, complete);
        else $target.slideUp(160, complete);
    }
    function focus($target) {
        $target.first().trigger('focus');
    }
    function safeRead(key, fallback) {
        let value;
        try { value = window.localStorage.getItem(key); }
        catch { storageAvailable = false; return fallback; }
        if (value === null) return fallback;
        try { return JSON.parse(value); }
        catch { invalidSavedData = true; return fallback; }
    }
    function safeWrite(key, value) {
        try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch { storageAvailable = false; return false; }
    }
    const $status = el('p', 'hidden').attr({ id: 'site-feedback', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    el('div', 'container').append($status).insertAfter($('header').first());
    function announce(text, kind = 'success') { message($status, text, kind); }
    function getCart() { return cart.map((line) => ({ ...line })); }
    function getTotals() { return L.calculateCart(cart); }
    function productLabel(product) { return product.size ? `${product.name} (${product.size})` : product.name; }
    function selectionString() { return cart.map((line) => `${line.id}~${line.quantity}`).join(','); }
    function checkoutURL() { return `order.html?cart=${encodeURIComponent(selectionString())}#order-form`; }
    function commitCart(next, feedback) {
        cart = L.normaliseCart(next);
        const saved = safeWrite(CART_KEY, cart);
        if (!saved) {
            const url = new URL(window.location.href);
            url.searchParams.set('cart', selectionString());
            try { window.history.replaceState(null, '', url.href); } catch { /* file:// may restrict history. */ }
        }
        $(document).trigger('chic:cartchange', [getTotals()]);
        const text = saved ? feedback : `${feedback} Storage is unavailable; internal links carry your basket.`;
        announce(text);
        return { ok: true, message: text };
    }
    function fail(text) { announce(text, 'error'); return { ok: false, message: text }; }
    function addToCart(id, quantity = 1) {
        const product = L.findProduct(id);
        if (!product) return fail('Choose a bouquet from the current catalog.');
        if (!Number.isInteger(quantity) || quantity <= 0) return fail('Choose a positive whole quantity.');
        const existing = cart.find((line) => line.id === id);
        const nextQuantity = (existing ? existing.quantity : 0) + quantity;
        if (nextQuantity > settings.maxPerItem) return fail(`Demo limit: ${settings.maxPerItem} of each option.`);
        if (getTotals().quantity + quantity > settings.maxItems) return fail(`Demo basket limit: ${settings.maxItems} arrangements.`);
        const next = getCart();
        const line = next.find((item) => item.id === id);
        if (line) line.quantity = nextQuantity;
        else next.push({ id, quantity });
        return commitCart(next, `${productLabel(product)} added to your basket.`);
    }
    function setQuantity(id, quantity) {
        const line = cart.find((item) => item.id === id);
        if (!line) return fail('This item is no longer in the basket.');
        if (!Number.isInteger(quantity) || quantity < 0 || quantity > settings.maxPerItem) return fail(`Use a whole quantity from 0 to ${settings.maxPerItem}.`);
        if (getTotals().quantity - line.quantity + quantity > settings.maxItems) return fail(`Demo basket limit: ${settings.maxItems} arrangements.`);
        if (quantity === 0) return removeFromCart(id);
        const next = getCart();
        next.find((item) => item.id === id).quantity = quantity;
        return commitCart(next, `${productLabel(L.findProduct(id))}: quantity ${quantity}.`);
    }
    function removeFromCart(id) {
        if (!cart.some((item) => item.id === id)) return fail('This item was already removed.');
        return commitCart(cart.filter((item) => item.id !== id), `${productLabel(L.findProduct(id))} removed.`);
    }
    function clearCart() { return commitCart([], 'Your basket is now empty.'); }

    function watchImage($image) {
        function fallback() {
            if (!$image.parent().length) return;
            el('p', 'border p-4 text-secondary text-center', 'Photo unavailable. Ask the florist for a current photograph.')
                .attr({ role: 'img', 'aria-label': `Photo unavailable: ${$image.attr('alt') || 'bouquet'}` }).replaceAll($image);
        }
        $image.on('error.chic', fallback);
        if ($image.prop('complete') && $image.prop('naturalWidth') === 0 && $image.attr('src')) fallback();
    }

    // REWRITE 1: $('<tag>'), .attr(), .text(), .append() replace createElement,
    // textContent and append. Chains make the card builder shorter; prices still use pure logic.
    function renderProductCard(product, prefix, orderNow = true) {
        const $card = el('article', 'card h-100 shadow-sm product-card')
            .attr({ id: `${prefix}-${product.id}`, 'data-product-id': product.id });
        const $image = el('img', 'card-img-top').attr({ src: product.image, alt: `${productLabel(product)} flower arrangement`, loading: 'lazy', width: 700, height: 760 });
        watchImage($image);
        const $body = el('div', 'card-body d-flex flex-column');
        const $actions = el('div', 'd-flex flex-wrap gap-2').append(
            button('Add to basket', 'btn btn-outline-dark btn-sm').attr({ 'data-add-id': product.id, 'aria-label': `Add ${productLabel(product)} to basket` })
        );
        if (orderNow) $actions.append(button('Order now', 'btn btn-dark btn-sm').attr('data-buy-id', product.id));
        $body.append(el('h3', 'h5 card-title', productLabel(product)),
            el('p', 'card-text text-secondary small', product.description),
            el('p', 'fw-bold mt-auto mb-2', L.formatMoney(product.price)),
            el('p', 'small hidden mb-2').attr('data-selected-label', product.id), $actions,
            el('p', 'small hidden mb-0').attr({ 'data-product-feedback': '', role: 'status' }));
        return el('div', 'col').append($card.append($image, $body));
    }
    function renderProducts(items, $container, options = {}) {
        $container.empty();
        if (!items.length) $container.append(el('p', 'col-12 text-secondary', options.emptyText || 'No bouquets match your choices.'));
        items.forEach((product) => $container.append(renderProductCard(product, $container.attr('id') || 'products', options.orderNow !== false)));
        updateSelectedCards();
    }
    function updateSelectedCards() {
        $('article[data-product-id]').each(function () {
            const $card = $(this);
            const line = cart.find((item) => item.id === $card.attr('data-product-id'));
            $card.toggleClass('selected', Boolean(line));
            // Chain: find the status inside this card, set safe text, then toggle its visibility.
            $card.find('[data-selected-label]').text(line ? `In your basket: ${line.quantity}` : '').toggleClass('hidden', !line);
        });
    }

    // Delegation: main exists now, but cards are inserted/replaced later by renderProducts.
    // A direct binding to today's buttons would miss tomorrow's newly generated buttons.
    $('main').on('click.chic', 'button[data-add-id], button[data-buy-id]', function () {
        const $control = $(this);
        const $card = $control.closest('article[data-product-id]');
        const id = $card.attr('data-product-id');
        const buy = $control.is('[data-buy-id]');
        const result = buy && cart.some((line) => line.id === id) ? { ok: true } : addToCart(id);
        if (buy && result.ok) window.location.assign(checkoutURL());
        else message($card.find('[data-product-feedback]'), result.message, result.ok ? 'success' : 'error');
    });

    const $basketLink = el('a', 'nav-link', 'Basket (0)').attr({ id: 'site-basket-link', href: 'catalog.html#basket' });
    el('li', 'nav-item').append($basketLink).appendTo($('#mainNav').find('.navbar-nav'));
    function updateNavigation() {
        const totals = getTotals();
        $basketLink.text(`Basket (${totals.quantity})`).attr('aria-label', `Basket: ${totals.quantity} arrangements, ${L.formatMoney(totals.total)}`);
        updateSelectedCards();
    }
    const parameters = new URLSearchParams(window.location.search);
    if (parameters.has('cart')) {
        const raw = parameters.get('cart');
        const entries = raw === '' ? [] : raw.split(',').slice(0, 200).map((entry) => {
            const [id, value] = entry.split('~');
            return { id, quantity: Number(value) };
        });
        cart = L.normaliseCart(entries);
        if (safeWrite(CART_KEY, cart)) parameters.delete('cart');
        invalidSavedData = false;
        const query = parameters.toString();
        try { window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`); } catch { /* file:// */ }
        if (JSON.stringify(entries) !== JSON.stringify(cart)) announce('Invalid saved basket entries were corrected. Review your selection.', 'error');
    }
    $(document).on('click.chic', 'a[href]', function () {
        if (storageAvailable || $(this).attr('href').startsWith('#')) return;
        const url = new URL($(this).attr('href'), window.location.href);
        const internal = ['index.html', 'catalog.html', 'order.html', 'blog.html'].some((page) => url.pathname.endsWith(`/${page}`));
        if (url.origin === window.location.origin && internal) {
            url.searchParams.set('cart', selectionString());
            $(this).attr('href', url.href);
        }
    });
    $(document).on('chic:cartchange', updateNavigation);
    $(window).on('storage.chic', function (event) {
        if (event.originalEvent.key !== CART_KEY && event.originalEvent.key !== null) return;
        cart = L.normaliseCart(safeRead(CART_KEY, []));
        $(document).trigger('chic:cartchange', [getTotals()]);
        announce('Your basket changed in another tab. Please review it.');
    });
    if (!window.bootstrap) $('.navbar-toggler').on('click.chic', function () {
        const expanded = !$('#mainNav').hasClass('show');
        $('#mainNav').toggleClass('show', expanded);
        $(this).attr('aria-expanded', String(expanded));
    });
    $('img').each(function () { watchImage($(this)); });
    window.Chic = Object.freeze({ el, button, option, field, message, fieldError, clearFieldError,
        reveal, conceal, focus, safeRead, safeWrite, announce, getCart, getTotals, addToCart,
        setQuantity, removeFromCart, clearCart, checkoutURL, renderProducts, productLabel, watchImage });
    updateNavigation();
    if (!storageAvailable) announce('Storage is unavailable. Internal page links carry your basket; use Live Server for reliable persistence.', 'error');
    else if (invalidSavedData) announce('Unreadable saved basket was ignored. Select your bouquets again.', 'error');
});
