'use strict';

// jQuery 3.7.1: ready waits for the existing order form; no HTML/CSS is added by hand.
$(function () {
    const $form = $('#order-form');
    if (!$form.length) return;
    const C = window.Chic;
    const L = window.ChicLogic;
    const settings = window.ChicData.settings;
    const f = {
        name: $('#full-name'), phone: $('#phone'), email: $('#email'), items: $('#order-items'),
        quantity: $('#quantity'), date: $('#order-date'), message: $('#order-message'),
        pickup: $('#pickup'), delivery: $('#delivery'), address: $('#delivery-address'),
        store: $('#pay-store'), remote: $('#pay-direct'), consent: $('#order-consent')
    };
    const $submit = $('#order-preview').text('Create demonstration preview');
    const $error = $('#order-error').attr('role', 'alert').addClass('hidden');
    const $confirmation = $('#order-confirmation').addClass('hidden');
    const $aside = $('#order-summary');
    const touched = new Set();
    let submitted = false;
    let lastPreview = null;
    let pendingFocus = null;

    // required/type/min/max stay active as the native first line of defence.
    // Native invalid events receive jQuery field messages instead of one browser popup.
    // Client checks can be bypassed: a real server MUST validate again before any order/payment.
    $form.prop('noValidate', false);
    f.items.add(f.quantity).prop('readOnly', true);
    f.quantity.attr({ step: 1, max: settings.maxItems });
    f.name.attr('maxlength', 60); f.phone.attr('maxlength', 30); f.email.attr('maxlength', 254);
    f.address.attr('maxlength', 180); f.message.attr('maxlength', 500);
    f.store.val('store'); f.remote.val('remote');
    $('#order-reset').text('Clear contact details');
    $('#order-form-title + p').text('Your basket is transferred automatically. Review your details and create a local demonstration preview. No information is sent to Chic Flowers.');
    $('#order-steps .text-secondary').eq(1).text('Review your basket and choose contact details, date, time and pickup or delivery preferences.');
    f.items.siblings('.form-text').text('These items and quantities come from your basket. Change them using the summary buttons.');

    f.time = C.el('input', 'form-control').attr({ type: 'time', step: 60, required: true });
    const $timeGroup = C.field('order-time', 'Preferred time (Astana)', f.time);
    $timeGroup.append(C.el('div', 'form-text', 'A time preference only, not a reserved slot.').attr('id', 'order-time-help'));
    f.time.attr('aria-describedby', 'order-time-help');
    $timeGroup.insertAfter(f.date.parent());
    C.el('div', 'form-text', `Demo planning window: today through the next ${settings.maxDaysAhead} days. Past dates/times are rejected.`)
        .attr('id', 'order-date-help').insertAfter(f.date);
    f.date.attr('aria-describedby', 'order-date-help');
    f.location = C.el('select', 'form-select').prop('required', true);
    C.option(f.location, '', 'Choose a location');
    settings.locations.forEach((location) => C.option(f.location, location, location));
    const $locationGroup = C.field('pickup-location', 'Pickup location', f.location, 'mb-3').attr('id', 'pickup-location-group');
    $locationGroup.insertAfter(f.pickup.closest('fieldset').find('.d-flex').first());
    const $addressGroup = C.el('div', 'mb-2 hidden').attr('id', 'delivery-address-group');
    const $addressLabel = $('label[for="delivery-address"]');
    const $addressHelp = f.address.next('.form-text');
    $addressGroup.insertBefore($addressLabel).append($addressLabel, f.address, $addressHelp);
    $addressLabel.text('Delivery address in Astana');
    f.address.attr('placeholder', 'Astana, street, building number, apartment');
    $addressHelp.text('Include Astana, street and building. Confirm service coverage and delivery charges with the shop.');
    const $counter = C.el('div', 'form-text').attr('id', 'order-message-count').insertAfter(f.message);
    f.message.attr('aria-describedby', 'order-message-count');
    // ENDTERM EXTENSION (jQuery): optional greeting-card message with a live
    // preview. A visitor can opt in, edit it, or opt out before demo checkout.
    f.giftCard = C.el('input', 'form-check-input').attr({ id: 'include-gift-card', type: 'checkbox' });
    f.giftText = C.el('textarea', 'form-control').attr({
        id: 'gift-card-text', rows: 3, maxlength: 160, placeholder: 'Write a personal greeting for the recipient'
    });
    const $giftCheckbox = C.el('div', 'col-12 form-check ms-2').append(f.giftCard,
        C.el('label', 'form-check-label', 'Include a greeting-card message').attr('for', 'include-gift-card'));
    const $giftFields = C.field('gift-card-text', 'Greeting card message (required when selected)', f.giftText, 'col-12 hidden')
        .attr('id', 'gift-card-fields');
    const $giftCounter = C.el('p', 'form-text').attr('id', 'gift-card-count');
    const $giftPreview = C.el('div', 'border rounded p-3 text-break').attr({ id: 'gift-card-preview', role: 'status', 'aria-live': 'polite' });
    $giftFields.append($giftCounter, $giftPreview);
    $giftCheckbox.insertAfter(f.message.parent());
    $giftFields.insertAfter($giftCheckbox);
    const $summaryItems = C.el('ul', 'list-group mb-3').attr({ id: 'order-summary-items', 'aria-label': 'Your basket summary' });
    const $summaryTotals = C.el('div', 'border-top pt-3 mb-3').attr({ id: 'order-live-totals', 'aria-live': 'polite', 'aria-atomic': 'true' });
    const $preferences = C.el('div', 'mb-3 text-break').attr('id', 'order-live-preferences');
    const $basketNotice = C.el('p', 'hidden').attr({ id: 'order-basket-feedback', role: 'status' });
    $aside.find('h2').first().text('Contact the florist');
    $aside.prepend(C.el('h2', 'h4 mb-3', 'Your basket summary').attr('id', 'live-summary-title'),
        C.el('p', 'small text-secondary', `Demo limits: ${settings.maxPerItem} per option, ${settings.maxItems} arrangements. Decreasing 1 removes that item.`),
        $summaryItems, $summaryTotals, $preferences, $basketNotice);

    function currentTime(now = new Date()) {
        return new Intl.DateTimeFormat('en-GB', { timeZone: settings.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
    }
    function readValues() {
        return { name: f.name.val().trim(), phone: f.phone.val().trim(), email: f.email.val().trim(),
            date: f.date.val(), time: f.time.val(), quantity: Number(f.quantity.val()),
            receive: $form.find('input[name="receive"]:checked').val() || '',
            location: f.location.val(), address: f.address.val().trim(), message: f.message.val().trim(),
            giftCard: f.giftCard.prop('checked'), giftText: f.giftText.val().trim(),
            payment: $form.find('input[name="payment"]:checked').val() || '', consent: f.consent.prop('checked') };
        // .prop('checked') reads the LIVE boolean; .attr('checked') describes initial markup.
    }

    // REWRITE 3: .val(), .prop(), .on() and jQuery field feedback replace native
    // value/checked, addEventListener and DOM updates. Validation rules are not shorter, only UI access is.
    function collectErrors(v, totals) {
        const now = new Date();
        let timeError = '';
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time)) timeError = 'Choose a valid preferred time.';
        else if (v.date === L.todayInAstana(now) && v.time <= currentTime(now)) timeError = 'For today, choose a later time in Astana.';
        let addressError = '';
        if (v.receive === 'delivery') {
            if (v.address.length < 10 || v.address.length > 180) addressError = 'Enter a complete address of 10–180 characters.';
            else if (!/(astana|астана)/iu.test(v.address) || !/\d/.test(v.address)) addressError = 'Include Astana, the street and building number.';
        }
        let paymentError = '';
        if (!['store', 'remote'].includes(v.payment)) paymentError = 'Choose a payment preference.';
        else if (v.receive === 'delivery' && v.payment !== 'remote') paymentError = 'For this delivery demo, select “Ask the shop about remote payment”. No payment occurs.';
        return [
            [f.name, L.validateName(v.name)], [f.phone, L.validatePhone(v.phone)],
            [f.email, L.validateEmail(v.email) || (f.email.prop('validity').typeMismatch ? 'Enter a valid email address.' : '')],
            [f.items, totals.quantity === 0 ? 'Your basket is empty. Add a bouquet in the catalog.' : ''],
            [f.quantity, !Number.isInteger(v.quantity) || v.quantity < 1 || v.quantity > settings.maxItems || v.quantity !== totals.quantity ? 'Quantity must match your basket. Use its quantity buttons.' : ''],
            [f.date, L.validateDate(v.date, now)], [f.time, timeError],
            [f.message, v.message.length > 500 ? 'Keep your requests within 500 characters.' : ''],
            [f.giftText, v.giftCard && (v.giftText.length < 2 || v.giftText.length > 160) ? 'Write 2–160 characters for the greeting card.' : ''],
            [f.pickup, !['pickup', 'delivery'].includes(v.receive) ? 'Choose pickup or delivery.' : ''],
            [f.location, v.receive === 'pickup' && !settings.locations.includes(v.location) ? 'Choose one of the two pickup locations.' : ''],
            [f.address, addressError], [f.store, paymentError],
            [f.consent, !v.consent ? 'Confirm that this is a demonstration, not a sent order.' : '']
        ];
    }
    function updateConditionalFields(animate = false) {
        const delivery = f.delivery.prop('checked');
        function setPanel($panel, visible) {
            if (animate && visible === $panel.hasClass('hidden')) {
                if (visible) C.reveal($panel); else C.conceal($panel);
            } else if (!animate) $panel.stop(true, true).toggleClass('hidden', !visible).removeAttr('style');
        }
        setPanel($locationGroup, !delivery); setPanel($addressGroup, delivery);
        f.location.prop({ disabled: delivery, required: !delivery });
        f.address.prop({ disabled: !delivery, required: delivery });
        C.clearFieldError(delivery ? f.location : f.address);
        const includeCard = f.giftCard.prop('checked');
        $giftFields.toggleClass('hidden', !includeCard);
        f.giftText.prop({ disabled: !includeCard, required: includeCard });
        if (!includeCard) C.clearFieldError(f.giftText);
        f.date.attr({ min: L.todayInAstana(), max: L.dateAfter(settings.maxDaysAhead) });
        if (f.date.val() === L.todayInAstana()) f.time.attr('min', currentTime());
        else f.time.removeAttr('min');
    }
    function updateLiveSummary() {
        const totals = C.getTotals();
        const v = readValues();
        $summaryTotals.empty().append(C.el('p', 'mb-1', `Total quantity: ${totals.quantity}`),
            C.el('p', 'fw-bold mb-1', `Bouquet subtotal: ${L.formatMoney(totals.total)}`),
            C.el('p', 'small text-secondary mb-0', v.receive === 'delivery' ? 'Delivery charges are not included. Confirm the final total with the florist.' : 'Confirm bouquet prices and availability with the florist.'));
        $preferences.empty().append(C.el('p', 'small mb-1', v.receive === 'delivery' ? `Delivery: ${v.address || 'enter an Astana address'}` : `Pickup: ${v.location || 'choose a location'}`),
            C.el('p', 'small mb-1', `Preferred date: ${v.date || 'not selected'}`), C.el('p', 'small mb-0', `Preferred time: ${v.time || 'not selected'} (Astana)`));
        $counter.text(`${f.message.val().length} / 500 characters`);
        $giftCounter.text(`${f.giftText.val().trim().length} / 160 characters`);
        $giftPreview.text(v.giftCard ? (v.giftText || 'Enter your greeting above to preview it here.') : 'No greeting card selected.');
        $submit.prop('disabled', totals.quantity === 0);
    }
    function renderBasket() {
        const totals = C.getTotals();
        $summaryItems.empty();
        if (!totals.lines.length) $summaryItems.append(C.el('li', 'list-group-item', 'Your basket is empty. ').append(
            C.el('a', '', 'Choose bouquets in the catalog').attr({ id: 'order-empty-catalog', href: 'catalog.html' })));
        totals.lines.forEach((line) => {
            const name = C.productLabel(line.product);
            const $controls = C.el('div', 'd-flex flex-wrap gap-2 align-items-center mt-2');
            [['−', 'decrease'], ['+', 'increase'], ['Remove', 'remove']].forEach(([text, action]) => {
                C.button(text, 'btn btn-outline-dark btn-sm').attr({ 'data-order-action': action, 'data-id': line.id, 'aria-label': `${action} ${name}` })
                    .prop('disabled', action === 'increase' && (line.quantity >= settings.maxPerItem || totals.quantity >= settings.maxItems)).appendTo($controls);
            });
            $controls.prepend(C.el('span', 'small', `Quantity: ${line.quantity}`));
            C.el('li', 'list-group-item text-break').attr('data-id', line.id).append(C.el('h3', 'h6 mb-1', name),
                C.el('p', 'small mb-1', `${L.formatMoney(line.product.price)} each × ${line.quantity}`),
                C.el('p', 'fw-bold small mb-0', `Line subtotal: ${L.formatMoney(line.subtotal)}`), $controls).appendTo($summaryItems);
        });
        f.items.val(totals.lines.map((line) => `${C.productLabel(line.product)} — ${line.quantity}`).join('\n'));
        f.quantity.val(String(totals.quantity));
        updateLiveSummary();
        if (pendingFocus) {
            let $next = $summaryItems.find('button:not(:disabled)').filter(function () {
                return $(this).attr('data-id') === pendingFocus.id && $(this).attr('data-order-action') === pendingFocus.action;
            }).first();
            if (!$next.length) $next = $summaryItems.find('button:not(:disabled), a').first();
            C.focus($next); pendingFocus = null;
        }
    }
    function validateFields(all = false) {
        const errors = collectErrors(readValues(), C.getTotals());
        errors.forEach(([$input, text]) => {
            if ($input.prop('disabled')) C.clearFieldError($input);
            else if (all || submitted || touched.has($input.attr('id'))) C.fieldError($input, text);
        });
        return errors.filter(([$input, text]) => !$input.prop('disabled') && text !== '');
    }
    function clearDetails() {
        // Reset all editable values after success; derived basket values are repopulated.
        [f.name, f.phone, f.email, f.date, f.time, f.location, f.address, f.message, f.giftText].forEach(($input) => $input.val(''));
        f.giftCard.prop('checked', false);
        f.pickup.add(f.store).prop('checked', true);
        f.delivery.add(f.remote).add(f.consent).prop('checked', false);
        $form.find('input, select, textarea').each(function () { C.clearFieldError($(this)); });
        touched.clear(); submitted = false;
        updateConditionalFields(); renderBasket();
    }
    function invalidateConfirmation() {
        if (lastPreview) {
            C.conceal($confirmation, 'fade');
            C.message($error, 'Details changed. Create a new demonstration preview to review them.');
            lastPreview = null;
        }
    }
    function addSummaryRow($list, label, value) {
        return C.el('li', 'list-group-item text-break').append(C.el('strong', '', `${label}: `), C.el('span', '', value)).appendTo($list);
    }
    function showConfirmation(v, totals) {
        const reference = L.createReference();
        lastPreview = { values: v, reference };
        const $heading = C.el('h2', 'h4', 'Demonstration preview ready').attr({ id: 'demo-confirmation-title', tabindex: -1 });
        const $details = C.el('ul', 'list-group mb-3');
        addSummaryRow($details, 'Name', v.name); addSummaryRow($details, 'Phone', v.phone);
        if (v.email) addSummaryRow($details, 'Email', v.email);
        totals.lines.forEach((line) => addSummaryRow($details, C.productLabel(line.product), `${line.quantity} × ${L.formatMoney(line.product.price)} = ${L.formatMoney(line.subtotal)}`));
        addSummaryRow($details, 'Total arrangements', String(totals.quantity));
        addSummaryRow($details, 'Estimated bouquet subtotal', L.formatMoney(totals.total));
        addSummaryRow($details, 'Preferred date and time', `${v.date}, ${v.time} (Astana)`);
        addSummaryRow($details, v.receive === 'delivery' ? 'Delivery address' : 'Pickup location', v.receive === 'delivery' ? v.address : v.location);
        addSummaryRow($details, 'Payment preference', v.payment === 'remote' ? 'Ask the shop about remote payment' : 'Arrange payment at the shop');
        if (v.message) addSummaryRow($details, 'Special requests', v.message);
        if (v.giftCard) addSummaryRow($details, 'Greeting card (subject to florist confirmation)', v.giftText);        // .html() is appropriate ONLY for this fixed trusted markup, never user input.
        // Names, messages and all values above use .text() through C.el().
        const $notice = C.el('p').html('<strong>Demonstration only.</strong> No data has been sent to a server. No real order, reservation or payment has been created.');
        $confirmation.stop(true, true).empty().addClass('state-message success hidden').removeClass('error').removeAttr('style').append(
            $heading, C.el('p', 'fw-bold text-break', `Demo reference: ${reference}`).attr('id', 'demo-reference'), $notice, $details,
            C.el('p', 'small', 'Delivery is not included. The florist confirms final prices and availability. Contact fields were reset; your basket was kept.'),
            C.el('div', 'd-flex flex-wrap gap-2').append(
                C.button('Edit these details').attr('id', 'edit-order-details'), C.button('Dismiss preview').attr('id', 'dismiss-order-preview'),
                C.el('a', 'btn btn-dark', 'Call the florist').attr('href', 'tel:+77058885622')));
        C.message($error, 'All checks passed. Contact fields reset; your demonstration summary is below.');
        C.reveal($confirmation, 'fade', function () { C.focus($heading); });
    }
    $summaryItems.on('click', 'button[data-order-action]', function () {
        const $button = $(this);
        const id = $button.closest('li').attr('data-id');
        const line = C.getCart().find((entry) => entry.id === id);
        if (!line) return;
        const action = $button.attr('data-order-action');
        pendingFocus = { id, action };
        const result = action === 'remove' ? C.removeFromCart(id) : C.setQuantity(id, line.quantity + (action === 'increase' ? 1 : -1));
        C.message($basketNotice, result.message, result.ok ? 'success' : 'error');
        if (!result.ok) pendingFocus = null;
    });
    $(document).on('chic:cartchange', function () {
        invalidateConfirmation(); renderBasket();
        if (submitted) validateFields();
    });
    $form.on('input change', 'input, select, textarea', function (event) {
        touched.add($(this).attr('id'));
        invalidateConfirmation();
        updateConditionalFields(event.type === 'change' && $(this).is('[name="receive"]'));
        updateLiveSummary();
        const invalid = validateFields();
        if (submitted) C.message($error, invalid.length ? `Correct ${invalid.length} marked field(s). No data sent.` : 'Details now pass. Submit to generate your demonstration summary.', invalid.length ? 'error' : 'success');
    });
    $form.on('reset', function (event) {
        event.preventDefault(); // Keep basket-derived fields; reset only contact preferences ourselves.
        lastPreview = null; C.conceal($confirmation, 'fade'); clearDetails();
        C.message($error, 'Contact details cleared. Your basket was kept.'); C.focus(f.name);
    });
    // invalid does not bubble, so bind directly to the controls after creating them.
    // Preventing the popup does NOT submit an invalid form; native submission is still blocked.
    $form.find('input, select, textarea').on('invalid', function (event) {
        event.preventDefault();
        submitted = true;
        const invalid = validateFields(true);
        C.conceal($confirmation, 'fade');
        C.message($error, `Please correct ${invalid.length} field(s). No data was sent.`, 'error');
        if (invalid.length) C.focus(invalid[0][0]);
    });
    $form.on('submit', function (event) {
        event.preventDefault(); // Without this, the form navigates to its GET action and loses the preview.
        submitted = true;
        updateConditionalFields();
        const invalid = validateFields(true);
        if (invalid.length) {
            C.conceal($confirmation, 'fade');
            C.message($error, `Please correct ${invalid.length} field(s). No data was sent.`, 'error');
            C.focus(invalid[0][0]); return;
        }
        const values = readValues();
        const totals = C.getTotals();
        showConfirmation(values, totals);
        clearDetails(); // Reset AFTER showing success, and only after EVERY check passed.
    });
    $confirmation.on('click', '#dismiss-order-preview', function () {
        // Fade-out dismisses a result the visitor finished reading; callback returns keyboard focus.
        C.conceal($confirmation, 'fade', function () { C.focus($submit); });
        lastPreview = null;
    });
    $confirmation.on('click', '#edit-order-details', function () {
        if (!lastPreview) return;
        const v = lastPreview.values;
        ['name', 'phone', 'email', 'date', 'time', 'location', 'address', 'message'].forEach((key) => f[key].val(v[key]));
        f.giftCard.prop('checked', v.giftCard); f.giftText.val(v.giftText);
        f.pickup.prop('checked', v.receive === 'pickup'); f.delivery.prop('checked', v.receive === 'delivery');
        f.store.prop('checked', v.payment === 'store'); f.remote.prop('checked', v.payment === 'remote');
        f.consent.prop('checked', false); // Explicitly agree again when preparing another preview.
        lastPreview = null;
        updateConditionalFields(); updateLiveSummary();
        C.conceal($confirmation, 'fade', function () { C.focus(f.name); });
        C.message($error, 'Edit the restored details, confirm the demonstration checkbox, and submit again.');
    });
    updateConditionalFields(); renderBasket();
});
