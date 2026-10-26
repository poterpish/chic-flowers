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
