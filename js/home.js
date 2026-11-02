'use strict';

// jQuery 3.7.1: ready ensures the frozen Home sections exist before enhancement.
$(function () {
    if (!$('#categories').length) return;
    const C = window.Chic;
    const L = window.ChicLogic;
    const { products, categories } = window.ChicData;
    const $category = C.el('select', 'form-select');
    C.option($category, 'all', 'All styles');
    categories.forEach((item) => C.option($category, item.id, item.label));
    const $budget = C.el('input', 'form-control').attr({ type: 'number', min: 1, max: 2000000, step: 1, required: true }).val('50000');
    const $reset = C.button('Reset finder', 'btn btn-outline-secondary').attr('id', 'finder-reset');
    const $form = C.el('form', 'row g-3 align-items-end mb-4').attr('id', 'finder-form').prop('noValidate', true);
    $form.append(C.field('finder-category', 'Bouquet style', $category, 'col-12 col-md-4'),
        C.field('finder-budget', 'Maximum price per arrangement (KZT)', $budget, 'col-12 col-md-4'),
        C.el('div', 'col-12 col-md-4 d-flex flex-wrap gap-2').append(C.button('Find bouquets', 'btn btn-dark', 'submit'), $reset));
    const $count = C.el('p', 'fw-semibold').attr({ id: 'finder-count', role: 'status', 'aria-live': 'polite' });
    const $results = C.el('div', 'row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4').attr('id', 'finder-results');
    const $viewAll = C.el('a', 'btn btn-outline-dark mt-4', 'View all matching bouquets').attr('id', 'finder-view-all');
    C.el('section', 'container py-5').attr({ id: 'bouquet-finder', 'aria-labelledby': 'finder-heading' })
        .append(C.el('h2', 'display-6', 'Find flowers for your budget').attr('id', 'finder-heading'),
            C.el('p', 'text-secondary', 'Choose a style and a maximum price per arrangement. The florist confirms availability and final prices.'),
            $form, $count, $results, $viewAll).insertAfter('#categories');

    // .val(), .text(), .toggleClass() replace value/textContent/classList; the logic is unchanged.
    function showMatches(focusInvalid = false) {
        const raw = $budget.val().trim();
        const amount = Number(raw);
        if (raw === '' || !Number.isInteger(amount) || amount < 1 || amount > 2000000 || $budget.prop('validity').badInput) {
            C.fieldError($budget, 'Enter a whole-number budget from 1 to 2,000,000 KZT.');
            $count.text('Enter a valid budget to find bouquets.');
            C.renderProducts([], $results, { emptyText: 'No suggestions until the budget is valid.' });
            $viewAll.addClass('hidden');
            if (focusInvalid) C.focus($budget);
            return [];
        }
        C.clearFieldError($budget);
        const matches = L.filterProducts(products, { category: $category.val(), maxPrice: amount, sort: 'price-asc' });
        $count.text(`${matches.length} matching options up to ${L.formatMoney(amount)}. Showing ${Math.min(6, matches.length)}, lowest price first.`);
        C.renderProducts(matches.slice(0, 6), $results, { emptyText: 'No bouquets match. Increase your budget, choose all styles or reset the finder.' });
        const query = new URLSearchParams({ category: $category.val(), max: raw, sort: 'price-asc' });
        $viewAll.attr('href', `catalog.html?${query}#catalog-controls`).toggleClass('hidden', !matches.length);
        return matches;
    }
    $form.on('submit', function (event) {
        event.preventDefault(); // Otherwise the browser reloads the page instead of displaying matches.
        showMatches(true);
    });
    $category.on('change', function () { showMatches(); });
    $budget.on('input', function () { showMatches(); });
    $reset.on('click', function () {
        $category.val('all'); $budget.val('50000'); showMatches();
        C.announce('Finder reset to all styles and a 50,000 KZT budget.');
        C.focus($category);
    });
    showMatches();

    const $featureCards = C.el('div', 'row row-cols-1 g-4').attr('id', 'featured-results');
    const $next = C.button('Suggest another bouquet').attr('id', 'featured-next');
    const $featureStatus = C.el('p', 'small text-secondary mt-3').attr({ id: 'featured-status', role: 'status', 'aria-live': 'polite' });
    C.el('section', 'container py-5').attr('id', 'featured-bouquet').append(
        C.el('div', 'row g-4 align-items-center').append(
            C.el('div', 'col-12 col-md-6').append(C.el('h2', 'display-6', 'Need a little inspiration?'),
                C.el('p', 'text-secondary', 'A random catalog suggestion, not a special offer or a stock reservation.'), $next, $featureStatus),
            C.el('div', 'col-12 col-md-6').append($featureCards))).insertBefore('#shop-info');
    let featuredId = '';
    function suggestBouquet() {
        const product = L.randomItem(products, featuredId);
        C.renderProducts(product ? [product] : [], $featureCards);
        if (product) {
            featuredId = product.id;
            $featureStatus.text(`Suggested: ${C.productLabel(product)}, ${L.formatMoney(product.price)}.`);
        } else $featureStatus.text('There are no catalog items to suggest.');
        $next.prop('disabled', products.length < 2);
    }
    $next.on('click', suggestBouquet);
    suggestBouquet();
});
