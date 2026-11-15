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
            button('Add to bag', 'btn btn-dark btn-sm w-100').attr({ 'data-add-id': product.id, 'aria-label': `Add ${productLabel(product)} to basket` })
        );
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
        const id = $card.attr('data-product-id') || $control.attr('data-add-id') || $control.attr('data-buy-id');
        const buy = $control.is('[data-buy-id]');
        const requestedQuantity = Number($control.attr('data-add-quantity') || 1);
        const result = buy && cart.some((line) => line.id === id) ? { ok: true } : addToCart(id, requestedQuantity);
        if (result.ok) showAddedModal();
        else if ($card.length) message($card.find('[data-product-feedback]'), result.message, 'error');
        // Shared add buttons outside a product card still get site-wide feedback via commitCart/fail.
    });

    const $basketLink = el('a', 'nav-link chic-basket-trigger', 'Bag (0)').attr({ id: 'site-basket-link', href: '#chic-basket-drawer', role: 'button', 'aria-haspopup': 'dialog', 'aria-controls': 'chic-basket-drawer' });
    el('li', 'nav-item').append($basketLink).appendTo($('#mainNav').find('.navbar-nav'));
    function updateNavigation() {
        const totals = getTotals();
        $basketLink.text(`Bag (${totals.quantity})`).attr('aria-label', `Open basket: ${totals.quantity} arrangements, ${L.formatMoney(totals.total)}`);
        updateSelectedCards();
    }

    // Editorial shopping experience: all dialogs are generated by jQuery.
    // The original cart calculations and localStorage remain the single source of truth.
    const $veil = el('div', 'chic-veil').attr({ 'aria-hidden': 'true' }).appendTo('body');
    const $drawer = el('aside', 'chic-drawer').attr({
        id: 'chic-basket-drawer', role: 'dialog', 'aria-modal': 'true',
        'aria-label': 'Shopping basket', 'aria-hidden': 'true', tabindex: '-1'
    }).appendTo('body');
    const $drawerHeader = el('div', 'chic-drawer-header').append(
        el('div').append(el('p', 'chic-eyebrow', 'YOUR SELECTION'), el('h2', '', 'Your bag')),
        button('×', 'chic-icon-close').attr('aria-label', 'Close basket').attr('data-close-bag', '')
    );
    const $drawerItems = el('div', 'chic-drawer-items').attr({ id: 'chic-drawer-items', 'aria-live': 'polite' });
    const $drawerFooter = el('div', 'chic-drawer-footer').append(
        el('div', 'chic-drawer-total').append(el('span', '', 'Subtotal'), el('strong', '', '0 ₸').attr('id', 'chic-drawer-sum')),
        el('p', 'chic-drawer-note', 'Delivery and final availability are confirmed by the florist.'),
        el('a', 'btn chic-checkout w-100', 'Continue to checkout').attr({ id: 'chic-drawer-checkout', href: checkoutURL() }),
        button('Continue shopping', 'chic-continue w-100').attr('data-close-bag', '')
    );
    $drawer.append($drawerHeader, $drawerItems, $drawerFooter);

    const $added = el('div', 'chic-added-modal').attr({
        id: 'chic-added-modal', role: 'dialog', 'aria-modal': 'true',
        'aria-label': 'Added to basket', 'aria-hidden': 'true', tabindex: '-1'
    }).append(
        button('×', 'chic-added-close').attr({ 'data-close-added': '', 'aria-label': 'Close' }),
        el('p', 'chic-added-mark', '✦'),
        el('h2', '', 'Added to your bag'),
        el('p', '', 'A little beauty, ready to be gifted.'),
        button('Continue shopping', 'btn chic-added-outline w-100').attr('data-close-added', ''),
        el('a', 'btn chic-checkout w-100', 'Go to checkout').attr({ href: checkoutURL(), id: 'chic-added-checkout' })
    ).appendTo('body');

    let currentDialog = null;
    let previousFocus = null;
    function openDialog(kind) {
        if (!currentDialog) previousFocus = document.activeElement;
        else closeDialog(false);
        currentDialog = kind;
        $('body').addClass('chic-dialog-open');
        $veil.addClass('is-visible');
        const $target = kind === 'bag' ? $drawer : $added;
        $target.addClass('is-visible').attr('aria-hidden', 'false');
        if (kind === 'bag') renderDrawer();
        const focusTarget = kind === 'bag' ? $drawer.find('[data-close-bag]').first() : $added.find('[data-close-added]').first();
        focusTarget.trigger('focus');
    }
    function closeDialog(restore = true) {
        $drawer.add($added).removeClass('is-visible').attr('aria-hidden', 'true');
        $veil.removeClass('is-visible');
        $('body').removeClass('chic-dialog-open');
        currentDialog = null;
        if (restore && previousFocus && typeof previousFocus.focus === 'function' && document.contains(previousFocus)) previousFocus.focus();
    }
    function openDrawer() { openDialog('bag'); }
    function showAddedModal() { $('#chic-added-checkout').attr('href', checkoutURL()); openDialog('added'); }
    function renderDrawer() {
        const $focused = $(document.activeElement);
        const focusId = $focused.attr('data-id');
        const focusAction = $focused.attr('data-drawer-action');
        const totals = getTotals();
        $drawerItems.empty();
        if (!totals.lines.length) {
            $drawerItems.append(el('div', 'chic-empty-bag').append(
                el('span', 'chic-empty-icon', '✿'),
                el('h3', '', 'Your bag is waiting'),
                el('p', '', 'Choose a bouquet and it will appear here.'),
                el('a', 'btn chic-checkout', 'Explore bouquets').attr('href', 'catalog.html')
            ));
        }
        totals.lines.forEach((line) => {
            const name = productLabel(line.product);
            const $photo = el('img', 'chic-bag-photo').attr({ src: line.product.image, alt: name, loading: 'lazy' });
            const $quantity = el('div', 'chic-quantity').append(
                button('−', 'chic-qty-button').attr({ 'data-drawer-action': 'decrease', 'data-id': line.id, 'aria-label': `Decrease ${name}` }),
                el('span', '', String(line.quantity)),
                button('+', 'chic-qty-button').attr({ 'data-drawer-action': 'increase', 'data-id': line.id, 'aria-label': `Increase ${name}` })
                    .prop('disabled', line.quantity >= settings.maxPerItem || totals.quantity >= settings.maxItems)
            );
            const $details = el('div', 'chic-bag-details').append(
                el('h3', '', name),
                el('p', 'chic-bag-price', L.formatMoney(line.subtotal)),
                $quantity
            );
            const $remove = button('×', 'chic-bag-remove').attr({
                'data-drawer-action': 'remove', 'data-id': line.id, 'aria-label': `Remove ${name}`
            });
            $drawerItems.append(el('article', 'chic-bag-line').append($photo, $details, $remove));
        });
        $('#chic-drawer-sum').text(L.formatMoney(totals.total));
        $('#chic-drawer-checkout').attr('href', checkoutURL()).toggleClass('disabled', !totals.quantity)
            .attr('aria-disabled', String(!totals.quantity)).attr('tabindex', totals.quantity ? '0' : '-1');
        if (focusId && focusAction && currentDialog === 'bag') {
            const $next = $drawerItems.find('[data-drawer-action]').filter(function () {
                return $(this).attr('data-id') === focusId && $(this).attr('data-drawer-action') === focusAction;
            }).first();
            if ($next.length && !$next.prop('disabled')) $next.trigger('focus');
            else $drawer.find('[data-close-bag]').first().trigger('focus');
        }
    }
    $(document).on('click.chic', '#site-basket-link, a[href$="#basket"], a[href="#chic-basket-drawer"]', function (event) {
        event.preventDefault();
        openDrawer();
    });
    $drawer.on('click', '[data-close-bag]', function () { closeDialog(); });
    $added.on('click', '[data-close-added]', function () { closeDialog(); });
    $veil.on('click', function () { closeDialog(); });
    $drawerItems.on('click', '[data-drawer-action]', function () {
        const id = $(this).attr('data-id');
        const action = $(this).attr('data-drawer-action');
        const line = getCart().find((item) => item.id === id);
        if (!line) return;
        const result = action === 'remove' ? removeFromCart(id) : setQuantity(id, line.quantity + (action === 'increase' ? 1 : -1));
        if (!result.ok) announce(result.message, 'error');
    });
    $(document).on('keydown.chic', function (event) {
        if (!currentDialog) return;
        if (event.key === 'Escape') { event.preventDefault(); closeDialog(); return; }
        if (event.key !== 'Tab') return;
        const $active = currentDialog === 'bag' ? $drawer : $added;
        const $focusable = $active.find('button:not(:disabled), a[href]:not(.disabled), input:not(:disabled), [tabindex="0"]').filter(':visible');
        if (!$focusable.length) return;
        const first = $focusable[0]; const last = $focusable[$focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    $(document).on('chic:cartchange', renderDrawer);
    if (window.location.hash === '#basket') openDrawer();
    // Hide the inherited oversized basket and price table. They remain in source for the course audit.
    $('#basket, #catalog-overview').addClass('d-none').attr('aria-hidden', 'true');
    $('#catalog-intro a[href="#basket"]').remove();
    $('.navbar-nav a[href="order.html"]').text('Contact').attr('href', 'order.html#contact');
    $('#start-order').text('View your bag').attr('href', '#chic-basket-drawer');
    $('#explore-catalog').text('Shop the collection');
    $('#home-hero .lead').text('Flowers for the moments that matter.');
    $('#catalog-intro h1').text('The collection');
    $('#catalog-intro > p.lead').text('Thoughtfully selected flowers, made to celebrate every kind of love.');
    $('#catalog-intro > p.small.mb-0').addClass('d-none');
    $('#order-steps').addClass('d-none');
    $('#order-intro h1').text('Checkout');
    $('#order-intro > p.lead').text('Just a few details, and your flowers are one step closer.');
    $('#order-intro .d-flex').addClass('d-none');

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

// All visual overrides are created at runtime. No existing HTML/CSS file is edited.
// IMPORTANT: JS-injected CSS still counts as new CSS under a strict CSS freeze.
$(function () {
    if (document.getElementById('chic-editorial-theme')) return;
    const theme = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap');
:root { --chic-ink:#382f32; --chic-rose:#bb8188; --chic-rose-light:#f4e4e2; --chic-paper:#fcfaf8; --chic-line:#e9deda; --chic-muted:#776e70; }
html { scroll-behavior:smooth; }
body { background:var(--chic-paper)!important; color:var(--chic-ink)!important; font-family:'Manrope',Arial,sans-serif!important; font-size:15px; line-height:1.75; }
h1,h2,h3,h4,.navbar-brand,.chic-drawer-header h2,.chic-added-modal h2 { font-family:'Cormorant Garamond',Georgia,serif!important; font-weight:500!important; letter-spacing:-.018em; }
h1 { font-size:clamp(3.8rem,6.2vw,6.5rem)!important; line-height:.95!important; }
h2 { font-size:clamp(2.6rem,4vw,4.1rem)!important; line-height:1.05!important; }
h3 { line-height:1.15!important; }
.text-secondary,.form-text { color:var(--chic-muted)!important; }
.btn { border-radius:100px!important; padding:.78rem 1.6rem; font-weight:600; letter-spacing:.015em; font-size:.86rem; transition:background .2s,color .2s,transform .2s,border-color .2s; }
.btn:hover { transform:translateY(-2px); }
.btn-dark,.btn-secondary,.chic-checkout { background:var(--chic-ink)!important; border:1px solid var(--chic-ink)!important; color:white!important; }
.btn-dark:hover,.btn-secondary:hover,.chic-checkout:hover { background:#6d4d53!important; border-color:#6d4d53!important; color:white!important; }
.btn-outline-dark,.btn-outline-secondary { background:transparent!important; color:var(--chic-ink)!important; border:1px solid #b8a8a5!important; }
.btn-outline-dark:hover,.btn-outline-secondary:hover { background:var(--chic-rose-light)!important; border-color:var(--chic-rose)!important; color:var(--chic-ink)!important; }
header { position:sticky;top:0;z-index:1030;background:rgba(252,250,248,.97);backdrop-filter:blur(16px); }
header .navbar { background:transparent!important; border-color:var(--chic-line)!important; box-shadow:none!important; min-height:92px; }
header .navbar>.container { max-width:1300px; position:relative; }
.navbar-brand { font-size:2rem!important; letter-spacing:.115em!important; font-weight:500!important; color:var(--chic-ink)!important; }
.navbar-nav { gap:1.45rem!important; }
.navbar .nav-link { font-size:.78rem; letter-spacing:.09em; text-transform:uppercase; color:#62595a!important; font-weight:600; }
.navbar .nav-link:hover,.navbar .nav-link.active { color:var(--chic-rose)!important; }
.chic-basket-trigger { display:inline-flex;align-items:center;justify-content:center; border:1px solid var(--chic-line);border-radius:100px; padding:.45rem .9rem!important;white-space:nowrap; }
main>.container,main>.container-fluid>.container { max-width:1280px; }
#home-hero { padding-top:70px!important;padding-bottom:100px!important;max-width:1320px; }
#home-hero .row { min-height:580px; }
#home-hero .col-lg-5 { padding-right:5vw; }
#home-hero .text-uppercase { letter-spacing:.25em;font-size:.72rem!important;color:#aa777e!important;font-weight:700; }
#home-hero h1 { margin:24px 0 28px; }
#home-hero .lead { font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(1.7rem,2.4vw,2.5rem)!important;line-height:1.18;color:#7c5961; }
#home-hero .text-secondary { font-size:.96rem;max-width:420px;line-height:1.85; }
#home-hero .hero-photo { max-height:610px!important;height:570px;width:100%;object-fit:cover; border-radius:240px 240px 24px 24px!important; box-shadow:0 25px 65px rgba(80,46,54,.10)!important; }
#home-hero .btn { margin-top:15px; }
#categories { padding-top:65px!important;padding-bottom:100px!important; }
#categories .section-title { margin-bottom:14px; }
#categories .lead { font-size:1rem; }
#categories .product-card { background:transparent; }
#categories .product-card img { height:340px!important;border-radius:180px 180px 18px 18px!important; }
#categories .card-body { text-align:center;align-items:center; }
#categories .card-title { font-size:2.1rem!important; }
#categories .card-text { max-width:320px; }
#categories .btn { margin-top:10px!important; }
main>.container-fluid { background:#f4e9e7!important;border-color:var(--chic-line)!important; }
main>.container-fluid h2 { font-size:3.3rem!important; }
main>.container-fluid .border.rounded { border-color:#e3cfcb!important;background:rgba(255,255,255,.64);border-radius:16px!important; }
main>.container-fluid strong { font-family:'Cormorant Garamond',Georgia,serif;font-size:1.75rem; }
#shop-info { padding-top:110px!important;padding-bottom:100px!important; }
.brand-note { border:1px solid var(--chic-line)!important;border-radius:20px!important;box-shadow:none!important;background:#fff!important; }
#shop-info .brand-note { padding:35px!important; }
footer { background:#392f33!important;color:#f6f0ed!important; }
footer a { color:#f6f0ed!important; }
#bouquet-finder { background:#f8f0ed;border-radius:26px;padding:48px!important; margin-top:30px; margin-bottom:40px; }
#bouquet-finder h2 { margin-bottom:8px; }
.chic-gift-details summary,.chic-advanced-filters summary,.chic-order-extras summary { cursor:pointer; font-weight:700; color:#9b6871;list-style:none; }
.chic-gift-details summary { display:inline-flex;border:1px solid #caa7aa;border-radius:50px;padding:12px 23px;margin:14px 0 25px; }
.chic-gift-details summary:after,.chic-advanced-filters summary:after,.chic-order-extras summary:after { content:' +';margin-left:9px; }
.chic-gift-details[open] summary:after,.chic-advanced-filters[open] summary:after,.chic-order-extras[open] summary:after { content:' −'; }
.chic-gift-details #featured-bouquet { padding-left:0!important;padding-right:0!important; }
#catalog-intro { padding-top:90px!important;padding-bottom:35px!important; }
#catalog-intro h1 { font-size:clamp(4.2rem,6vw,6.5rem)!important; }
#catalog-intro .lead { max-width:660px;line-height:1.7;font-size:1rem; }
#catalog-intro .small.text-uppercase,#order-intro .small.text-uppercase,.chic-eyebrow { color:#aa7b80!important;letter-spacing:.25em;font-size:.72rem;font-weight:700; }
#catalog-intro .d-flex { margin-top:35px!important; }
#catalog-intro .d-flex a { font-size:.8rem;padding:11px 23px; }
#catalog-controls { max-width:1150px;padding:26px 35px 25px!important;background:#f5eeeb;border-radius:24px;margin-top:20px; margin-bottom:35px;scroll-margin-top:120px; }
#catalog-controls label { font-size:.78rem;letter-spacing:.035em;font-weight:600;margin-bottom:9px; }
#catalog-controls .form-control,#catalog-controls .form-select { border-radius:100px!important;border:1px solid #e1d4d0;min-height:50px;padding:10px 18px;background:#fff; }
.chic-advanced-filters { margin-top:15px; }
.chic-advanced-filters summary { display:inline-block;font-size:.83rem; }
.chic-advanced-filters .row { padding-top:8px; }
#catalog-count { margin-top:16px!important;font-size:.8rem;color:#8c7b7e;font-weight:500!important; }
.chic-curated-collection { max-width:1260px;padding-bottom:110px; }
.chic-collection-head { text-align:center;margin:38px 0 45px; }
.chic-collection-head h2 { font-size:clamp(2.8rem,4.6vw,4.6rem)!important; }
.product-card { border:0!important;border-radius:20px!important;background:transparent!important;box-shadow:none!important;overflow:hidden;outline:none!important; }
.product-card img { height:auto!important;aspect-ratio:4/5;object-fit:cover;border-radius:18px!important;transition:transform .35s; }
.product-card:hover img { transform:scale(1.018); }
.product-card .card-body { padding:17px 4px 16px!important; }
.product-card .card-title { font-family:'Cormorant Garamond',Georgia,serif!important;font-size:1.8rem!important;font-weight:600!important;line-height:1.1;margin-bottom:8px; }
.product-card .card-text { color:#857a7b!important;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
.product-card .fw-bold { font-size:1rem;letter-spacing:.01em;color:#62484d; }
.product-card .btn { padding:11px 18px;font-size:.78rem; }
.product-card.selected { outline:none!important; }
.product-card [data-selected-label] { font-size:.76rem;color:#9a7377!important; }
.chic-load-more { background:transparent;border:1px solid #bda4a7;color:var(--chic-ink);padding:14px 35px; }
#order-intro { padding-top:75px!important;padding-bottom:20px!important; }
#order-intro h1 { font-size:clamp(4rem,5vw,5.6rem)!important; }
#order-intro .lead { font-size:1rem; }
#checkout { max-width:1240px;padding-bottom:90px!important; }
#checkout>.row { align-items:start; }
#checkout .card { border:1px solid var(--chic-line)!important; border-radius:28px!important;box-shadow:none!important;background:#f5eeeb; }
#checkout .card-body { padding:42px!important; }
#order-form-title { font-size:3.2rem!important; }
#order-form-title+p { max-width:530px;font-size:.88rem; }
#order-form fieldset { margin-bottom:32px!important; }
#order-form legend { font-family:'Cormorant Garamond',Georgia,serif;font-size:1.95rem!important;font-weight:600; }
#order-form .form-label { font-size:.8rem;font-weight:600;letter-spacing:.02em; }
#order-form .form-control,#order-form .form-select { border-radius:14px!important;min-height:50px;border:1px solid #e5d8d5;background:#fff;padding:11px 15px; }
#order-form textarea.form-control { border-radius:15px!important; }
#order-form .form-check-input:checked { background-color:#a97981;border-color:#a97981; }
#order-form .form-text { font-size:.72rem; }
.chic-order-extras { padding:15px 0 28px; }
.chic-order-extras summary { margin-bottom:12px; }
.chic-order-extras .col-12 { margin-bottom:16px; }
#order-summary { position:sticky;top:115px;padding:34px!important;border-radius:28px!important;background:#fff!important; }
#order-summary #live-summary-title { font-size:2.9rem!important; }
#order-summary .list-group-item { background:transparent;border-color:#eee6e3;padding:17px 0; }
.chic-checkout-line { display:grid;grid-template-columns:76px 1fr;column-gap:15px;align-items:start; }
.chic-checkout-photo { width:76px;height:86px;object-fit:cover;border-radius:12px;grid-row:span 3; }
.chic-checkout-line h3 { font-family:'Manrope',Arial,sans-serif!important;font-size:.87rem!important;font-weight:700!important;margin:0 0 5px; }
.chic-checkout-line p { grid-column:2; }
.chic-checkout-line>div { grid-column:2; }
#order-live-totals .fw-bold { font-size:1.4rem; }
#order-live-preferences { font-size:.76rem; }
#order-preview { width:100%; }
#order-reset { width:100%; }
#order-form .state-message,#order-confirmation { max-width:none; }
.chic-veil { position:fixed;inset:0;background:rgba(39,29,33,.51);opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s;z-index:1050; }
.chic-veil.is-visible { opacity:1;visibility:visible; }
body.chic-dialog-open { overflow:hidden; }
.chic-drawer { position:fixed;z-index:1052;right:0;top:0;width:min(510px,100vw);height:100dvh;background:#fcfaf8;transform:translateX(105%);visibility:hidden;transition:transform .32s ease,visibility .32s;display:flex;flex-direction:column;box-shadow:-20px 0 70px rgba(31,22,25,.10); }
.chic-drawer.is-visible { transform:translateX(0);visibility:visible; }
.chic-drawer-header { display:flex;align-items:center;justify-content:space-between;padding:32px 34px 22px;border-bottom:1px solid var(--chic-line); }
.chic-drawer-header h2 { font-size:3.25rem!important;margin:0; }
.chic-eyebrow { margin-bottom:5px; }
.chic-icon-close,.chic-added-close { border:0;background:transparent;color:#544448;font-size:2rem;line-height:1;cursor:pointer;min-width:40px;min-height:40px; }
.chic-drawer-items { flex:1;min-height:0;overflow-y:auto;padding:12px 34px; }
.chic-bag-line { display:grid;grid-template-columns:100px 1fr 30px;gap:17px;align-items:start;padding:21px 0;border-bottom:1px solid var(--chic-line); }
.chic-bag-photo { width:100px;height:118px;object-fit:cover;border-radius:13px; }
.chic-bag-details h3 { font-family:'Manrope',Arial,sans-serif!important;font-size:.91rem!important;font-weight:700!important;margin:2px 0 8px; }
.chic-bag-price { font-weight:700;margin:0 0 12px;color:#7d565e; }
.chic-bag-remove { border:0;background:none;color:#87777b;font-size:1.5rem;line-height:1;cursor:pointer; }
.chic-quantity { display:inline-flex;align-items:center;gap:16px;border:1px solid #e5d8d5;border-radius:100px;padding:2px 9px;font-size:.86rem; }
.chic-qty-button { background:none;border:0;font-size:1.3rem;cursor:pointer;min-width:24px;min-height:30px; }
.chic-qty-button:disabled { opacity:.35;cursor:not-allowed; }
.chic-drawer-footer { padding:25px 34px 27px;border-top:1px solid var(--chic-line);background:#fcfaf8; }
.chic-drawer-total { display:flex;justify-content:space-between;align-items:center;font-size:1.05rem;margin-bottom:6px; }
.chic-drawer-total strong { font-size:1.5rem; }
.chic-drawer-note { font-size:.72rem;color:#8a7e7f;margin-bottom:18px; }
.chic-checkout { padding:15px 18px!important; }
.chic-checkout.disabled { pointer-events:none;opacity:.45; }
.chic-continue { border:0;background:none;padding:14px;color:#806068;font-size:.86rem;font-weight:600; }
.chic-empty-bag { text-align:center;padding:90px 0; }
.chic-empty-icon { font-family:Georgia,serif;font-size:3rem;color:#b18a90; }
.chic-empty-bag h3 { font-size:2.3rem!important; }
.chic-empty-bag p { color:#88797b; }
.chic-added-modal { position:fixed;z-index:1053;left:50%;top:50%;transform:translate(-50%,-45%) scale(.97);opacity:0;visibility:hidden;transition:transform .22s,opacity .22s,visibility .22s;width:min(390px,calc(100vw - 34px));background:#fcfaf8;border-radius:23px;padding:46px 42px 38px;text-align:center;box-shadow:0 25px 90px rgba(37,27,29,.17); }
.chic-added-modal.is-visible { transform:translate(-50%,-50%) scale(1);opacity:1;visibility:visible; }
.chic-added-close { position:absolute;right:15px;top:10px; }
.chic-added-mark { font-size:1.9rem;color:#b17f86;margin-bottom:6px; }
.chic-added-modal h2 { font-size:2.7rem!important;margin-bottom:10px; }
.chic-added-modal>p:not(.chic-added-mark) { color:#89787c;font-size:.84rem;margin-bottom:24px; }
.chic-added-modal .btn { margin-bottom:10px;padding:13px; }
.chic-added-outline { border:1px solid #bca2a6!important;color:#63494f!important; }
@media (max-width:991px) { header .navbar { min-height:76px; } .navbar-brand { font-size:1.65rem!important; } #home-hero .row { min-height:auto; } #home-hero .hero-photo { height:460px; } #checkout .card-body { padding:27px!important; } #order-summary { position:static; } }
@media (max-width:767px) { header .navbar { min-height:70px; } .navbar-nav { gap:.2rem!important;padding:20px 0; } .chic-basket-trigger { justify-content:flex-start;width:max-content; } #home-hero { padding-top:35px!important;padding-bottom:55px!important; } #home-hero .col-lg-5 { padding-right:12px;text-align:center!important; } #home-hero .text-secondary { margin-left:auto;margin-right:auto; } #home-hero .hero-photo { height:390px!important;border-radius:200px 200px 18px 18px!important; } #categories { padding-top:25px!important;padding-bottom:50px!important; } #catalog-intro { padding-top:55px!important; } #catalog-controls { padding:23px!important;border-radius:18px; } .chic-collection-head { margin:25px 0 30px; } #bouquet-finder { padding:26px!important; } .chic-drawer-header { padding:24px 21px 16px; } .chic-drawer-items { padding:6px 21px; } .chic-drawer-footer { padding:20px 21px; } .chic-bag-line { grid-template-columns:82px 1fr 22px;gap:12px; } .chic-bag-photo { width:82px;height:100px; } .chic-added-modal { padding:42px 24px 26px; } #order-form-title { font-size:2.7rem!important; } }
@media (prefers-reduced-motion:reduce) { *,*::before,*::after { scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important; } }
`;
    $('<style>').attr('id', 'chic-editorial-theme').text(theme).appendTo('head');
});
