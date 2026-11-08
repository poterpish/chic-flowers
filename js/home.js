'use strict';

// ENDTERM: The Home gift planner uses only plain JavaScript DOM APIs.
// The shared basket is its own site-wide feature and is handled by jQuery main.js.
// Unlike the previous budget-only finder, this planner considers the occasion,
// number of arrangements, and TOTAL spending limit; each suggestion has a calculated cost.
(() => {
    const products = window.ChicData.products;
    const categories = window.ChicData.categories;
    const logic = window.ChicLogic;
    const occasionChoices = [
        { id: 'all', label: 'Any occasion', words: null },
        { id: 'romance', label: 'Romantic gift', words: /rose|romance|romantic|blush|pink|peony|love/i },
        { id: 'birthday', label: 'Birthday or celebration', words: /celebrat|colour|color|bright|garden|box|mix|pink/i },
        { id: 'thanks', label: 'Thank you / appreciation', words: /ivory|white|cream|soft|pastel|elegan|hydrangea|orchid/i }
    ];

    // Reused for cards, form elements, labels, messages and sections.
    function create(tag, classNames = '', text = '') {
        const element = document.createElement(tag);
        element.className = classNames;
        element.textContent = text;
        return element;
    }

    function formatMoney(amount) {
        return logic.formatMoney(amount);
    }

    function estimatedCost(product, count) {
        return product.price * count;
    }

    function occasionMatches(product, occasionId) {
        const occasion = occasionChoices.find((choice) => choice.id === occasionId);
        if (!occasion || !occasion.words) return true;
        return occasion.words.test(`${product.name} ${product.description}`);
    }

    function findSuggestions(preferences) {
        const perBouquetBudget = Math.floor(preferences.budget / preferences.count);
        return logic.filterProducts(products, {
            category: preferences.category, maxPrice: perBouquetBudget, sort: 'price-asc'
        }).filter((product) => occasionMatches(product, preferences.occasion));
    }

    function createField(id, labelText, input, column = 'col-12 col-md-6 col-lg-3') {
        const group = create('div', column);
        const label = create('label', 'form-label', labelText);
        label.htmlFor = id;
        input.id = id;
        group.append(label, input);
        return group;
    }

    function fillOptions(select, items) {
        for (const item of items) {
            const option = create('option', '', item.label);
            option.value = item.id;
            select.append(option);
        }
        return select;
    }

    function buildCard(product, count) {
        const column = create('div', 'col');
        const article = create('article', 'card h-100 shadow-sm product-card');
        article.dataset.productId = product.id;
        const image = create('img', 'card-img-top');
        image.src = product.image;
        image.alt = `${product.name} floral arrangement`;
        image.loading = 'lazy';
        image.addEventListener('error', () => {
            const fallback = create('p', 'border p-4 text-center text-secondary', 'Photo unavailable. Please contact the shop.');
            fallback.setAttribute('role', 'img');
            fallback.setAttribute('aria-label', image.alt);
            image.replaceWith(fallback);
        }, { once: true });
        const body = create('div', 'card-body d-flex flex-column');
        body.append(create('h3', 'h5 card-title', product.size ? `${product.name} (${product.size})` : product.name),
            create('p', 'card-text text-secondary small', product.description),
            create('p', 'fw-bold mt-auto mb-1', `${formatMoney(product.price)} each`),
            create('p', 'small mb-2', `${count} arrangement(s): ${formatMoney(estimatedCost(product, count))}`));
        const actions = create('div', 'd-flex flex-wrap gap-2');
        const add = create('button', 'btn btn-outline-dark btn-sm', count === 1 ? 'Add to basket' : `Add ${count} to basket`);
        add.type = 'button';
        add.dataset.addId = product.id; // Handled by the separate shared cart delegate in main.js.
        add.dataset.addQuantity = String(count);
        add.setAttribute('aria-label', `Add ${count} of ${product.name} to basket`);
        const details = create('button', 'btn btn-dark btn-sm', 'See gift estimate');
        details.type = 'button';
        details.dataset.estimateId = product.id;
        const note = create('p', 'small hidden mb-0');
        note.setAttribute('data-product-feedback', '');
        const selected = create('p', 'small hidden mb-2');
        selected.setAttribute('data-selected-label', product.id);
        actions.append(add, details);
        body.append(selected, actions, note);
        article.append(image, body);
        column.append(article);
        return column;
    }

    function init() {
        const anchor = document.getElementById('categories');
        const shopInfo = document.getElementById('shop-info');
        if (!anchor || !shopInfo) return;
        const section = create('section', 'container py-5');
        section.id = 'bouquet-finder';
        const title = create('h2', 'display-6', 'Plan a flower gift within your budget');
        title.id = 'finder-heading';
        section.setAttribute('aria-labelledby', title.id);
        const intro = create('p', 'text-secondary', 'Choose the occasion, style, number of bouquets and total budget. Suggestions are based on catalog descriptions, not current stock.');
        const form = create('form', 'row g-3 align-items-end mb-4');
        form.id = 'finder-form';
        form.noValidate = true;
        const category = fillOptions(create('select', 'form-select'), [{ id: 'all', label: 'All styles' }, ...categories]);
        const occasion = fillOptions(create('select', 'form-select'), occasionChoices);
        const budget = create('input', 'form-control');
        budget.type = 'number'; budget.value = '50000'; budget.min = '1'; budget.max = '2000000'; budget.step = '1'; budget.required = true;
        const quantity = create('input', 'form-control');
        quantity.type = 'number'; quantity.value = '1'; quantity.min = '1'; quantity.max = '9'; quantity.step = '1'; quantity.required = true;
        const submit = create('button', 'btn btn-dark', 'Find bouquets'); submit.type = 'submit';
        const reset = create('button', 'btn btn-outline-secondary', 'Reset plan'); reset.type = 'button'; reset.id = 'finder-reset';
        form.append(createField('finder-category', 'Bouquet style', category),
            createField('finder-occasion', 'Occasion', occasion),
            createField('finder-budget', 'Total budget (KZT)', budget),
            createField('finder-quantity', 'Arrangements to buy', quantity));
        const actions = create('div', 'col-12 d-flex flex-wrap gap-2');
        actions.append(submit, reset);
        form.append(actions);
        const count = create('p', 'fw-semibold'); count.id = 'finder-count'; count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite');
        const error = create('p', 'hidden'); error.id = 'finder-error'; error.setAttribute('role', 'alert');
        const results = create('div', 'row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4'); results.id = 'finder-results';
        const estimate = create('div', 'hidden state-message'); estimate.id = 'gift-estimate'; estimate.setAttribute('aria-live', 'polite');
        const viewAll = create('a', 'btn btn-outline-dark mt-4', 'View matching catalog options'); viewAll.id = 'finder-view-all';
        section.append(title, intro, form, count, error, results, estimate, viewAll);
        anchor.insertAdjacentElement('afterend', section);

        const inspiration = create('section', 'container py-5'); inspiration.id = 'featured-bouquet';
        const inspirationTitle = create('h2', 'display-6', 'Another idea for your gift');
        const next = create('button', 'btn btn-outline-dark', 'Suggest another bouquet'); next.id = 'featured-next'; next.type = 'button';
        const status = create('p', 'small text-secondary mt-3'); status.id = 'featured-status'; status.setAttribute('role', 'status');
        const featuredResults = create('div', 'row row-cols-1 g-4'); featuredResults.id = 'featured-results';
        const row = create('div', 'row g-4 align-items-center');
        const left = create('div', 'col-12 col-md-6');
        left.append(inspirationTitle, create('p', 'text-secondary', 'Pick another catalog option that fits the plan. This is a suggestion, not a reservation.'), next, status);
        const right = create('div', 'col-12 col-md-6'); right.append(featuredResults);
        row.append(left, right); inspiration.append(row);
        shopInfo.insertAdjacentElement('beforebegin', inspiration);

        let matches = [];
        let featuredId = '';

        function readPreferences() {
            const rawBudget = budget.value.trim();
            const rawCount = quantity.value.trim();
            const amount = Number(rawBudget);
            const countValue = Number(rawCount);
            return {
                category: category.value, occasion: occasion.value,
                budget: amount, count: countValue,
                valid: rawBudget !== '' && Number.isInteger(amount) && amount >= 1 && amount <= 2000000 &&
                    rawCount !== '' && Number.isInteger(countValue) && countValue >= 1 && countValue <= 9 &&
                    !budget.validity.badInput && !quantity.validity.badInput
            };
        }

        function suggestBouquet() {
            const item = logic.randomItem(matches, featuredId);
            featuredResults.replaceChildren();
            if (!item) {
                status.textContent = 'No matching bouquets yet. Adjust your budget or reset your plan.';
                next.disabled = true;
                return;
            }
            featuredId = item.id;
            featuredResults.append(buildCard(item, readPreferences().count));
            status.textContent = `Suggested: ${item.name} — ${formatMoney(estimatedCost(item, readPreferences().count))} for your plan.`;
            next.disabled = matches.length < 2;
        }

        function renderPlan(focusInvalid = false) {
            const preferences = readPreferences();
            results.replaceChildren(); estimate.classList.add('hidden');
            error.textContent = ''; error.classList.add('hidden'); error.classList.remove('error');
            for (const input of [budget, quantity]) {
                input.classList.remove('is-invalid', 'error'); input.removeAttribute('aria-invalid');
            }
            if (!preferences.valid) {
                const problem = budget.value.trim() === '' || !Number.isInteger(preferences.budget) || preferences.budget < 1 || preferences.budget > 2000000 ? budget : quantity;
                problem.classList.add('is-invalid', 'error'); problem.setAttribute('aria-invalid', 'true');
                error.textContent = 'Enter a budget from 1 to 2,000,000 KZT and a whole quantity from 1 to 9.';
                error.classList.remove('hidden'); error.classList.add('error', 'state-message');
                count.textContent = 'Correct your plan to see matching bouquets.';
                matches = []; viewAll.classList.add('hidden');
                if (focusInvalid) problem.focus();
                suggestBouquet();
                return;
            }
            matches = findSuggestions(preferences);
            count.textContent = `${matches.length} matching options. ${preferences.count} of the same arrangement, within ${formatMoney(preferences.budget)} total. Showing up to 6 lowest-priced options.`;
            for (const item of matches.slice(0, 6)) results.append(buildCard(item, preferences.count));
            if (matches.length === 0) results.append(create('p', 'col-12 text-secondary', 'No bouquets match. Try another occasion, fewer bouquets or a higher budget.'));
            const query = new URLSearchParams({ category: preferences.category, max: String(Math.floor(preferences.budget / preferences.count)), sort: 'price-asc' });
            viewAll.href = `catalog.html?${query.toString()}#catalog-controls`;
            viewAll.classList.toggle('hidden', matches.length === 0);
            featuredId = '';
            suggestBouquet();
        }

        // A single delegated handler works for dynamically recreated suggestion cards.
        results.addEventListener('click', (event) => {
            const control = event.target.closest('button[data-estimate-id]');
            if (!control || !results.contains(control)) return;
            const product = products.find((item) => item.id === control.dataset.estimateId);
            if (!product) return;
            const preferences = readPreferences();
            if (!preferences.valid) return;
            for (const previous of results.querySelectorAll('article.selected')) previous.classList.remove('selected');
            control.closest('article').classList.add('selected');
            const subtotal = estimatedCost(product, preferences.count);
            estimate.textContent = `${product.name}: ${preferences.count} × ${formatMoney(product.price)} = ${formatMoney(subtotal)}. Budget remaining: ${formatMoney(preferences.budget - subtotal)}. Delivery, wrapping and availability are confirmed by Chic Flowers.`;
            estimate.classList.remove('hidden');
            estimate.classList.add('success');
        });
        form.addEventListener('submit', (event) => { event.preventDefault(); renderPlan(true); });
        for (const control of [category, occasion]) control.addEventListener('change', () => renderPlan());
        for (const control of [budget, quantity]) control.addEventListener('input', () => renderPlan());
        reset.addEventListener('click', () => {
            category.value = 'all'; occasion.value = 'all'; budget.value = '50000'; quantity.value = '1';
            renderPlan(); category.focus();
        });
        next.addEventListener('click', suggestBouquet);
        renderPlan();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
