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
