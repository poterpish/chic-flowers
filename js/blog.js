'use strict';

// jQuery 3.7.1: ready makes the existing article markup available before traversal.
$(function () {
    const $posts = $('#blog-posts');
    if (!$posts.length) return;
    const C = window.Chic;
    const L = window.ChicLogic;
    const topics = [{ id: 'all', label: 'All topics' }, { id: 'gifts', label: 'Gift ideas' }, { id: 'care', label: 'Flower care' }];
    const links = { 'flowers-for-girlfriend': ['gifts', 'premium', 'img/chic-bouquet.png'],
        'flowers-for-mom': ['gifts', 'boxes', 'img/5337175895774535335.jpg'],
        'flower-care': ['care', 'mono', 'img/5337175895774535334.jpg'] };
    const articles = [];
    // Traversal replaces querySelector/Array.from; the full original articles are not rewritten.
    $posts.find('article').each(function () {
        const $card = $(this);
        const id = $card.find('a').attr('href').slice(1);
        articles.push({ id, title: $card.find('h3').text().trim(),
            description: $card.find('.card-text').text().trim().replace(/\s+/g, ' '),
            image: $card.find('img').attr('src') || links[id][2], imageAlt: $card.find('img').attr('alt') || 'Flower arrangement',
            searchText: $(`#${id}`).text().toLowerCase(), category: links[id][0], catalog: links[id][1] });
    });
    // ENDTERM EXTENSION (jQuery): keep a local reading list of the journal's
    // existing useful articles. Only article IDs are stored, never visitor data.
    const SAVED_KEY = 'chic-flowers-reading-list-v1';
    const storedIds = C.safeRead(SAVED_KEY, []);
    const savedIds = new Set(Array.isArray(storedIds) ? storedIds.filter((id) => articles.some((a) => a.id === id)) : []);
    let savedOnly = false;
    const $savedToggle = C.button('Show saved articles only', 'btn btn-outline-dark').attr('id', 'article-saved-toggle');
    const $savedStatus = C.el('p', 'small text-secondary').attr({ id: 'reading-list-status', role: 'status', 'aria-live': 'polite' });
    const $savedItems = C.el('ul', 'list-group').attr('id', 'reading-list-items');
    const $savedPanel = C.el('section', 'container py-4').attr('id', 'reading-list');
    $savedPanel.append(C.el('h2', 'h4', 'Your saved reading list'),
        C.el('p', 'text-secondary small', 'Save an article to read later on this browser. You can remove it anytime.'),
        $savedStatus, $savedItems).insertAfter($posts);
    function renderSaved() {
        const chosen = articles.filter((article) => savedIds.has(article.id));
        $savedItems.empty();
        chosen.forEach((article) => {
            C.el('li', 'list-group-item d-flex flex-wrap gap-2 justify-content-between align-items-center')
                .append(C.el('a', 'text-break', article.title).attr('href', `#${article.id}`),
                    C.button('Remove saved', 'btn btn-outline-secondary btn-sm')
                        .attr({ 'data-unsave-id': article.id, 'aria-label': `Remove ${article.title} from reading list` }))
                .appendTo($savedItems);
        });
        if (chosen.length === 0) $savedItems.append(C.el('li', 'list-group-item text-secondary', 'No articles saved yet. Save one from the cards above.'));
        $savedStatus.text(`${chosen.length} saved article(s).`);
        $savedToggle.toggleClass('active', savedOnly).text(savedOnly ? 'Show all matching articles' : 'Show saved articles only');
    }
    function toggleSaved(id) {
        if (!articles.some((article) => article.id === id)) return;
        if (savedIds.has(id)) savedIds.delete(id);
        else savedIds.add(id);
        const stored = C.safeWrite(SAVED_KEY, [...savedIds]);
        renderArticles(); renderSaved();
        C.message($savedNotice, `${savedIds.has(id) ? 'Saved' : 'Removed'} article. ${stored ? 'Your reading list was updated in this browser.' : 'Storage is unavailable; changes last only until reload.'}`);
    }
    const $savedNotice = C.el('p', 'hidden').attr({ id: 'reading-list-notice', role: 'status', 'aria-live': 'polite' }).appendTo($savedPanel);
    const $search = C.el('input', 'form-control').attr({ type: 'search', maxlength: 100, placeholder: 'Try roses, water or gift' });
    const $category = C.el('select', 'form-select');
    topics.forEach((topic) => C.option($category, topic.id, topic.label));
    const $reset = C.button('Reset article filters').attr('id', 'article-reset');
    const $controls = C.el('form', 'row g-3 align-items-end mb-4').attr({ id: 'article-search-form', role: 'search', 'aria-label': 'Find a journal article' })
        .append(C.field('article-search', 'Search articles', $search), C.field('article-category', 'Topic', $category), C.el('div', 'col-12').append($reset));
    const $count = C.el('p', 'text-secondary').attr({ id: 'article-count', role: 'status', 'aria-live': 'polite' });
    const $list = $posts.children('.row').first().attr('id', 'article-results').addClass('row-cols-1 row-cols-md-2 row-cols-lg-3');
    $controls.find('.col-12').last().append($savedToggle);
    $controls.insertBefore($list); $count.insertBefore($list);
    function renderArticle(article) {
        const $picture = C.el('img', 'card-img-top').attr({ src: article.image, alt: article.imageAlt, loading: 'lazy' });
        C.watchImage($picture);
        const saved = savedIds.has(article.id);
        const $body = C.el('div', 'card-body d-flex flex-column').append(
            C.el('p', 'small text-secondary', topics.find((t) => t.id === article.category).label),
            C.el('h3', 'card-title h5', article.title), C.el('p', 'card-text', article.description),
            C.el('a', 'btn btn-dark mt-auto', 'Read article').attr({ href: `#${article.id}`, 'aria-label': `Read ${article.title}` }),
            C.button(saved ? 'Remove from saved' : 'Save for later', 'btn btn-outline-dark btn-sm mt-2')
                .attr({ 'data-save-article': article.id, 'aria-pressed': String(saved) }).toggleClass('selected', saved));
        return C.el('article', 'col').append(C.el('div', 'card h-100 shadow-sm product-card journal-card')
            .attr('data-article-id', article.id).append($picture, $body));
    }
    function markCurrentArticle() {
        const id = window.location.hash.slice(1);
        $list.find('[data-article-id]').each(function () { $(this).toggleClass('selected', $(this).attr('data-article-id') === id); });
    }
    function renderArticles() {
        const term = $search.val().trim().toLowerCase();
        const matches = articles.filter((article) => ($category.val() === 'all' || article.category === $category.val()) &&
            `${article.title} ${article.description} ${article.searchText}`.toLowerCase().includes(term) &&
            (!savedOnly || savedIds.has(article.id)));
        $list.empty();
        matches.forEach((article) => $list.append(renderArticle(article)));
        if (!matches.length) $list.append(C.el('p', 'col-12 state-message', savedOnly ? 'No saved articles match. Save an article or show all matching articles.' : 'No articles match. Try another word or reset the filters.').attr('id', 'article-empty'));
        $count.text(`${matches.length} of ${articles.length} articles match.`);
        $reset.toggleClass('active', term !== '' || $category.val() !== 'all');
        markCurrentArticle();
    }
    // Delegation: save buttons are recreated every time the article results change.
    $list.on('click', 'button[data-save-article]', function () {
        const id = $(this).closest('[data-article-id]').attr('data-article-id');
        toggleSaved(id);
        const $next = $list.find('button[data-save-article]').filter(function () { return $(this).attr('data-save-article') === id; });
        C.focus($next.length ? $next : $savedToggle);
    });
    $savedItems.on('click', 'button[data-unsave-id]', function () {
        toggleSaved($(this).attr('data-unsave-id'));
        C.focus($savedToggle);
    });
    $savedToggle.on('click', function () {
        savedOnly = !savedOnly;
        renderArticles(); renderSaved();
        C.focus($(this));
    });
    $controls.on('submit', function (event) { event.preventDefault(); renderArticles(); }); // Prevent page reload during a local search.
    $search.on('input', renderArticles); $category.on('change', renderArticles);
    $reset.on('click', function () { $search.val(''); $category.val('all'); renderArticles(); C.focus($search); });
    $(window).on('hashchange', markCurrentArticle);

    // Local comments are neither saved to storage nor published as real customer reviews.
    const comments = [];
    let nextId = 1;
    let editingId = null;
    let pendingDelete = null;
    let attempted = false;
    const $section = C.el('section', 'container py-5').attr('id', 'journal-comments');
    const $form = C.el('form', 'card card-body shadow-sm mb-4').attr({ id: 'comment-form', 'aria-labelledby': 'comment-form-heading' }).prop('noValidate', true);
    const $heading = C.el('h3', 'h5', 'Add a demo comment').attr('id', 'comment-form-heading');
    const $name = C.el('input', 'form-control').attr({ type: 'text', required: true, maxlength: 60, autocomplete: 'nickname' });
    const $article = C.el('select', 'form-select').prop('required', true);
    C.option($article, '', 'Choose an article'); articles.forEach((a) => C.option($article, a.id, a.title));
    const $rating = C.el('select', 'form-select').prop('required', true);
    C.option($rating, '', 'Choose a rating');
    for (let n = 1; n <= 5; n += 1) C.option($rating, String(n), `${n} / 5`);
    const $text = C.el('textarea', 'form-control').attr({ rows: 4, required: true, maxlength: 600, placeholder: 'Share what you found useful about this article.' });
    const $counter = C.el('p', 'form-text mb-0').attr('id', 'comment-counter');
    $text.attr('aria-describedby', 'comment-counter');
    const $submit = C.button('Add demo comment', 'btn btn-dark', 'submit').attr('id', 'comment-submit');
    const $clear = C.button('Clear comment form').attr('id', 'comment-reset');
    const $status = C.el('p', 'hidden').attr({ id: 'comment-status', role: 'status' });
    $form.append($heading, C.el('div', 'row g-3').append(C.field('comment-name', 'Display name (2–60 characters)', $name),
        C.field('comment-article', 'Article', $article), C.field('comment-rating', 'How helpful was this article?', $rating),
        C.field('comment-text', 'Your comment (20–600 characters)', $text, 'col-12').append($counter)),
        C.el('div', 'd-flex flex-wrap gap-2 mt-3').append($submit, $clear), $status);
    const $filter = C.el('select', 'form-select');
    C.option($filter, 'all', 'All articles'); articles.forEach((a) => C.option($filter, a.id, a.title));
    const $all = C.button('Show all comments').attr('id', 'comment-show-all');
    const $commentCount = C.el('p', 'text-secondary').attr({ id: 'comment-count', 'aria-live': 'polite' });
    const $commentList = C.el('div', 'row g-3').attr({ id: 'comment-list', tabindex: -1, 'aria-label': 'Local demo comments' });
    $section.append(C.el('h2', 'h2', 'Discuss the articles'), C.el('p', 'text-secondary',
        'Comments stay on this open page and disappear on reload. Nothing is sent to a server or published as a real customer review.'), $form,
        C.el('div', 'row g-3 align-items-end mb-3').append(C.field('comment-filter', 'View comments for', $filter), C.el('div', 'col-12 col-md-6').append($all)),
        $commentCount, $commentList).insertBefore('#journal-next');
    function updateCounter() {
        const count = $text.val().trim().length;
        $counter.text(`${count} / 600 characters after trimming. Minimum: 20.`).toggleClass('error', count > 600);
    }
    function getError(id) {
        if (id === 'comment-name') return L.validateName($name.val());
        if (id === 'comment-article') return articles.some((a) => a.id === $article.val()) ? '' : 'Choose the article you are commenting on.';
        if (id === 'comment-rating') return /^[1-5]$/.test($rating.val()) ? '' : 'Choose a rating from 1 to 5.';
        const length = $text.val().trim().length;
        return length < 20 ? 'Write at least 20 characters, excluding outer spaces.' : length > 600 ? 'Keep your comment within 600 characters.' : '';
    }
    function clearForm() {
        $name.add($text).val(''); $article.add($rating).val('');
        editingId = null; attempted = false;
        $heading.text('Add a demo comment'); $submit.text('Add demo comment'); $clear.text('Clear comment form');
        $form.find('input, select, textarea').each(function () { C.clearFieldError($(this)); });
        updateCounter();
    }
    function formatDate(iso) {
        return new Intl.DateTimeFormat('en-GB', { timeZone: window.ChicData.settings.timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
    }
    // Rewritten list: .appendTo()/.text() replace createElement/textContent; one renderer
    // handles new and edited comments. User text never passes through .html().
    function renderComment(comment) {
        const article = articles.find((a) => a.id === comment.articleId);
        const $card = C.el('article', 'card shadow-sm').attr({ id: `journal-comment-${comment.id}`, 'data-comment-id': comment.id }).toggleClass('selected', comment.id === editingId);
        const $body = C.el('div', 'card-body').append(C.el('h3', 'h5 text-break', comment.name),
            C.el('p', 'small text-secondary', `${article.title} · Helpfulness: ${comment.rating}/5`),
            C.el('p', 'small text-secondary').append(C.el('time', '', `${formatDate(comment.createdAt)} (Astana)`).attr('datetime', comment.createdAt)),
            C.el('p', 'text-break', comment.text), C.el('p', 'small text-secondary', 'Local demo comment — not publicly submitted.'));
        if (comment.updatedAt) $body.append(C.el('p', 'small text-secondary', `Edited ${formatDate(comment.updatedAt)}`));
        $body.append(C.el('div', 'd-flex flex-wrap gap-2').append(
            C.button('Edit', 'btn btn-outline-dark btn-sm').attr('data-comment-action', 'edit'),
            C.button('Remove', 'btn btn-outline-secondary btn-sm').attr('data-comment-action', 'remove')));
        if (pendingDelete === comment.id) $body.append(C.el('div', 'border rounded p-3 mt-3').append(
            C.el('p', '', 'Remove this local demo comment?'), C.el('div', 'd-flex flex-wrap gap-2').append(
                C.button('Yes, remove', 'btn btn-dark btn-sm').attr({ id: `confirm-delete-${comment.id}`, 'data-comment-action': 'confirm' }),
                C.button('Cancel', 'btn btn-outline-secondary btn-sm').attr('data-comment-action', 'cancel'))));
        return C.el('div', 'col-12').append($card.append($body));
    }
    function renderComments() {
        const visible = comments.filter((c) => $filter.val() === 'all' || c.articleId === $filter.val());
        $commentList.empty();
        visible.forEach((comment) => $commentList.append(renderComment(comment)));
        if (!visible.length) $commentList.append(C.el('p', 'col-12', comments.length ? 'No comments for this article. Choose Show all comments or add one.' : 'No comments yet. Add the first local demo comment above.').attr('id', 'comment-empty'));
        $commentCount.text(`${visible.length} of ${comments.length} local demo comments shown.`);
        $all.toggleClass('active', $filter.val() !== 'all');
    }
    // Delegated because renderComments replaces the children after edits and filtering.
    $commentList.on('click', 'button[data-comment-action]', function () {
        const id = Number($(this).closest('[data-comment-id]').attr('data-comment-id'));
        const comment = comments.find((c) => c.id === id);
        if (!comment) return;
        const action = $(this).attr('data-comment-action');
        if (action === 'edit') {
            editingId = id; pendingDelete = null; attempted = false;
            $name.val(comment.name); $article.val(comment.articleId); $rating.val(String(comment.rating)); $text.val(comment.text);
            $form.find('input, select, textarea').each(function () { C.clearFieldError($(this)); });
            $heading.text('Edit your demo comment'); $submit.text('Save comment changes'); $clear.text('Cancel editing');
            renderComments(); updateCounter(); C.focus($text);
            C.message($status, 'Editing your local comment. Save it or cancel to keep the original.');
        } else if (action === 'remove') {
            pendingDelete = id; renderComments(); C.focus($(`#confirm-delete-${id}`));
        } else if (action === 'confirm') {
            comments.splice(comments.findIndex((c) => c.id === id), 1);
            if (editingId === id) clearForm();
            pendingDelete = null; renderComments(); C.focus($commentList);
            C.message($status, 'Demo comment removed. Nothing was sent to a server.');
        } else {
            pendingDelete = null; renderComments();
            C.focus($(`#journal-comment-${id}`).find('button').first());
            C.message($status, 'Removal cancelled. Your comment is unchanged.');
        }
    });
    $form.on('submit', function (event) {
        event.preventDefault(); // Otherwise the browser navigates away and loses local comments.
        attempted = true;
        let $first = $();
        $form.find('input, select, textarea').each(function () {
            const error = getError($(this).attr('id'));
            C.fieldError($(this), error);
            if (error && !$first.length) $first = $(this);
        });
        if ($first.length) { C.message($status, 'Correct the marked fields before adding the comment.', 'error'); C.focus($first); return; }
        const v = { name: $name.val().trim(), articleId: $article.val(), rating: Number($rating.val()), text: $text.val().trim() };
        if (comments.some((c) => c.id !== editingId && c.name === v.name && c.articleId === v.articleId && c.rating === v.rating && c.text === v.text)) {
            C.message($status, 'This exact comment already exists. Edit it or write a different one.', 'error'); C.focus($text); return;
        }
        const edited = editingId !== null;
        if (edited) Object.assign(comments.find((c) => c.id === editingId), v, { updatedAt: new Date().toISOString() });
        else { comments.push({ id: nextId, ...v, createdAt: new Date().toISOString(), updatedAt: null }); nextId += 1; }
        pendingDelete = null; $filter.val(v.articleId); clearForm(); renderComments();
        C.message($status, edited ? 'Demo comment updated on this page only. No data published.' : 'Demo comment added on this page only. Reloading will remove it.');
    });
    $form.on('input change', 'input, select, textarea', function () {
        updateCounter();
        if (attempted || $(this).hasClass('error')) C.fieldError($(this), getError($(this).attr('id')));
        else C.clearFieldError($(this));
        C.message($status, '');
    });
    $clear.on('click', function () { clearForm(); pendingDelete = null; renderComments(); C.message($status, 'Form cleared; existing comments kept.'); C.focus($name); });
    $filter.on('change', function () { pendingDelete = null; renderComments(); });
    $all.on('click', function () { $filter.val('all'); pendingDelete = null; renderComments(); C.focus($filter); });
    articles.forEach((article) => {
        const $section = $(`#${article.id}`);
        $section.find('a[href="catalog.html"]').attr('href', `catalog.html#${article.catalog}`);
        C.button('Discuss this article', 'btn btn-outline-dark mt-3').attr('data-discuss-id', article.id).appendTo($section.children().first());
    });
    $('main').on('click', 'button[data-discuss-id]', function () {
        const id = $(this).attr('data-discuss-id');
        if (editingId !== null) C.message($status, 'Save or cancel your current edit before choosing another article.', 'error');
        else {
            $article.val(id); $filter.val(id); C.clearFieldError($article); renderComments();
            C.message($status, 'Write a local demo comment about this article. It is not sent or published.');
        }
        C.focus($name);
    });
    renderArticles(); renderSaved(); updateCounter(); renderComments();
});
