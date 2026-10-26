'use strict';

// Gauhar: find an article, read it, then leave or manage a local demo comment.
(() => {
    const posts = document.querySelector('#blog-posts');
    if (!posts) return;

    const { el, button, message, fieldError, clearFieldError, watchImage } = window.Chic;
    const { validateName } = window.ChicLogic;
    const categories = [
        { id: 'all', label: 'All topics' },
        { id: 'gifts', label: 'Gift ideas' },
        { id: 'care', label: 'Flower care' }
    ];
    const articleDetails = {
        'flowers-for-girlfriend': {
            category: 'gifts', catalog: 'premium',
            image: 'img/chic-bouquet.png', imageAlt: 'Flower bouquet for a romantic gift'
        },
        'flowers-for-mom': {
            category: 'gifts', catalog: 'boxes',
            image: 'img/5337175895774535335.jpg', imageAlt: 'Flower bouquet as a gift for mom'
        },
        'flower-care': {
            category: 'care', catalog: 'mono',
            image: 'img/5337175895774535334.jpg', imageAlt: 'Fresh flower arrangement'
        }
    };

    // Read the midterm content once; the original complete articles remain intact.
    const articles = Array.from(posts.querySelectorAll('article')).map((card) => {
        const id = card.querySelector('a').hash.slice(1);
        const image = card.querySelector('img');
        const section = document.getElementById(id);
        return {
            id,
            title: card.querySelector('h3').textContent.trim(),
            description: card.querySelector('.card-text').textContent.trim().replace(/\s+/g, ' '),
            // Shared main.js may already have replaced a missing original image.
            image: image ? image.getAttribute('src') : articleDetails[id].image,
            imageAlt: image ? image.alt : articleDetails[id].imageAlt,
            searchText: section.textContent.toLocaleLowerCase(),
            category: articleDetails[id].category,
            catalog: articleDetails[id].catalog
        };
    });

    function addOption(select, value, label) {
        const option = el('option', '', label);
        option.value = value;
        select.append(option);
        return option;
    }

    function labelledControl(id, text, control, classes = 'col-12 col-md-6') {
        const wrapper = el('div', classes);
        const label = el('label', 'form-label', text);
        label.htmlFor = id;
        control.id = id;
        wrapper.append(label, control);
        return wrapper;
    }

    const controls = el('form', 'row g-3 align-items-end mb-4');
    controls.id = 'article-search-form';
    controls.setAttribute('role', 'search');
    controls.setAttribute('aria-label', 'Find a flower journal article');
    const search = el('input', 'form-control');
    search.type = 'search';
    search.maxLength = 100;
    search.placeholder = 'Try roses, water or gift';
    const category = el('select', 'form-select');
    categories.forEach((item) => addOption(category, item.id, item.label));
    const resetSearch = button('Reset article filters');
    resetSearch.id = 'article-reset';
    const resetWrapper = el('div', 'col-12');
    resetWrapper.append(resetSearch);
    controls.append(
        labelledControl('article-search', 'Search articles', search),
        labelledControl('article-category', 'Topic', category),
        resetWrapper
    );
    const resultCount = el('p', 'text-secondary');
    resultCount.id = 'article-count';
    resultCount.setAttribute('role', 'status');
    resultCount.setAttribute('aria-live', 'polite');
    const articleList = posts.querySelector('.row');
    articleList.id = 'article-results';
    articleList.classList.add('row-cols-1', 'row-cols-md-2', 'row-cols-lg-3');
    posts.insertBefore(controls, articleList);
    posts.insertBefore(resultCount, articleList);

    function filterArticles(items, query, selectedCategory) {
        const term = query.trim().toLocaleLowerCase();
        return items.filter((article) => {
            const matchesTopic = selectedCategory === 'all' || article.category === selectedCategory;
            const matchesText = `${article.title} ${article.description} ${article.searchText}`
                .toLocaleLowerCase().includes(term);
            return matchesTopic && matchesText;
        });
    }

    function renderArticle(article) {
        const column = el('article', 'col');
        const card = el('div', 'card h-100 shadow-sm product-card journal-card');
        card.dataset.articleId = article.id;
        const picture = el('img', 'card-img-top');
        picture.alt = article.imageAlt;
        picture.loading = 'lazy';
        picture.src = article.image;
        const body = el('div', 'card-body d-flex flex-column');
        const topic = categories.find((item) => item.id === article.category);
        const tag = el('p', 'small text-secondary', topic.label);
        const title = el('h3', 'card-title h5', article.title);
        const description = el('p', 'card-text', article.description);
        const read = el('a', 'btn btn-dark mt-auto', 'Read article');
        read.href = `#${article.id}`;
        read.setAttribute('aria-label', `Read ${article.title}`);
        body.append(tag, title, description, read);
        card.append(picture, body);
        column.append(card);
        watchImage(picture);
        return column;
    }

    function renderArticles() {
        const matches = filterArticles(articles, search.value, category.value);
        articleList.replaceChildren();
        matches.forEach((article) => articleList.append(renderArticle(article)));
        if (matches.length === 0) {
            const empty = el('p', 'col-12 state-message', 'No articles match. Try another word or reset the filters.');
            empty.id = 'article-empty';
            articleList.append(empty);
        }
        resultCount.textContent = `${matches.length} of ${articles.length} articles match.`;
        resetSearch.classList.toggle('active', search.value.trim() !== '' || category.value !== 'all');
        markCurrentArticle();
    }

    function markCurrentArticle() {
        const currentId = window.location.hash.slice(1);
        articleList.querySelectorAll('[data-article-id]').forEach((card) => {
            card.classList.toggle('selected', card.dataset.articleId === currentId);
        });
    }

    controls.addEventListener('submit', (event) => {
        event.preventDefault();
        renderArticles();
    });
    search.addEventListener('input', renderArticles);
    category.addEventListener('change', renderArticles);
    resetSearch.addEventListener('click', () => {
        search.value = '';
        category.value = 'all';
        renderArticles();
        search.focus();
    });
    window.addEventListener('hashchange', markCurrentArticle);

    // Comments are held only in this array. No names or text enter browser storage.
    const comments = [];
    let nextCommentId = 1;
    let editingId = null;
    let pendingDeleteId = null;
    let attemptedSubmit = false;

    const commentsSection = el('section', 'container py-5');
    commentsSection.id = 'journal-comments';
    const heading = el('h2', 'h2', 'Discuss the articles');
    const privacyNote = el('p', 'text-secondary',
        'Practice writing an article comment. Comments stay on this open page only and disappear on reload. Nothing is sent to a server or published as a real customer review.');
    const commentForm = el('form', 'card card-body shadow-sm mb-4');
    commentForm.id = 'comment-form';
    commentForm.noValidate = true;
    const formHeading = el('h3', 'h5', 'Add a demo comment');
    formHeading.id = 'comment-form-heading';
    commentForm.setAttribute('aria-labelledby', formHeading.id);
    const fieldGrid = el('div', 'row g-3');
    const name = el('input', 'form-control');
    name.type = 'text';
    name.required = true;
    name.maxLength = 60;
    name.autoComplete = 'nickname';
    const articleChoice = el('select', 'form-select');
    articleChoice.required = true;
    addOption(articleChoice, '', 'Choose an article');
    articles.forEach((article) => addOption(articleChoice, article.id, article.title));
    const rating = el('select', 'form-select');
    rating.required = true;
    addOption(rating, '', 'Choose a rating');
    for (let score = 1; score <= 5; score += 1) {
        addOption(rating, String(score), `${score} / 5`);
    }
    const commentText = el('textarea', 'form-control');
    commentText.required = true;
    commentText.rows = 4;
    commentText.maxLength = 600;
    commentText.placeholder = 'Share what you found useful or ask a question about this article.';
    const textWrapper = labelledControl('comment-text', 'Your comment (20–600 characters)', commentText, 'col-12');
    const counter = el('p', 'form-text mb-0');
    counter.id = 'comment-counter';
    commentText.setAttribute('aria-describedby', counter.id);
    textWrapper.append(counter);
    fieldGrid.append(
        labelledControl('comment-name', 'Display name (2–60 characters)', name),
        labelledControl('comment-article', 'Article', articleChoice),
        labelledControl('comment-rating', 'How helpful was the article?', rating),
        textWrapper
    );
    const actions = el('div', 'd-flex flex-wrap gap-2 mt-3');
    const submitComment = button('Add demo comment', 'btn btn-dark', 'submit');
    submitComment.id = 'comment-submit';
    const resetComment = button('Clear comment form');
    resetComment.id = 'comment-reset';
    actions.append(submitComment, resetComment);
    const formStatus = el('p', 'state-message hidden');
    formStatus.id = 'comment-status';
    formStatus.setAttribute('role', 'status');
    formStatus.setAttribute('aria-live', 'polite');
    commentForm.append(formHeading, fieldGrid, actions, formStatus);

    const listControls = el('div', 'row g-3 align-items-end mb-3');
    const commentFilter = el('select', 'form-select');
    addOption(commentFilter, 'all', 'All articles');
    articles.forEach((article) => addOption(commentFilter, article.id, article.title));
    const showAll = button('Show all comments');
    showAll.id = 'comment-show-all';
    const showAllWrapper = el('div', 'col-12 col-md-6');
    showAllWrapper.append(showAll);
    listControls.append(labelledControl('comment-filter', 'View comments for', commentFilter), showAllWrapper);
    const commentCount = el('p', 'text-secondary');
    commentCount.id = 'comment-count';
    commentCount.setAttribute('aria-live', 'polite');
    const commentList = el('div', 'row g-3');
    commentList.id = 'comment-list';
    commentList.tabIndex = -1;
    commentList.setAttribute('aria-label', 'Local demo comments');
    commentsSection.append(heading, privacyNote, commentForm, listControls, commentCount, commentList);
    document.querySelector('main').insertBefore(commentsSection, document.getElementById('journal-next'));

    function commentError(input) {
        if (input === name) return validateName(name.value);
        if (input === articleChoice) {
            return articles.some((article) => article.id === articleChoice.value)
                ? '' : 'Choose the article you are commenting on.';
        }
        if (input === rating) {
            const value = Number(rating.value);
            return Number.isInteger(value) && value >= 1 && value <= 5
                ? '' : 'Rate this article from 1 to 5.';
        }
        const length = commentText.value.trim().length;
        if (length < 20) return 'Write at least 20 characters, excluding spaces at the beginning and end.';
        if (length > 600) return 'Keep your comment within 600 characters.';
        return '';
    }

    function updateCounter() {
        const count = commentText.value.trim().length;
        counter.textContent = `${count} / 600 characters after trimming. Minimum: 20.`;
        counter.classList.toggle('error', count > 600);
    }

    function validateCommentForm() {
        const fields = [name, articleChoice, rating, commentText];
        let firstInvalid = null;
        fields.forEach((input) => {
            const error = commentError(input);
            fieldError(input, error);
            if (error !== '' && firstInvalid === null) firstInvalid = input;
        });
        if (firstInvalid !== null) {
            firstInvalid.focus();
            return false;
        }
        return true;
    }

    function resetCommentForm(keepName = false) {
        if (!keepName) name.value = '';
        articleChoice.value = '';
        rating.value = '';
        commentText.value = '';
        editingId = null;
        attemptedSubmit = false;
        formHeading.textContent = 'Add a demo comment';
        submitComment.textContent = 'Add demo comment';
        resetComment.textContent = 'Clear comment form';
        [name, articleChoice, rating, commentText].forEach(clearFieldError);
        updateCounter();
    }

    function beginEdit(comment) {
        editingId = comment.id;
        pendingDeleteId = null;
        attemptedSubmit = false;
        name.value = comment.name;
        articleChoice.value = comment.articleId;
        rating.value = String(comment.rating);
        commentText.value = comment.text;
        [name, articleChoice, rating, commentText].forEach(clearFieldError);
        formHeading.textContent = 'Edit your demo comment';
        submitComment.textContent = 'Save comment changes';
        resetComment.textContent = 'Cancel editing';
        message(formStatus, 'Editing your local comment. Save changes or cancel to keep the original.');
        updateCounter();
        renderComments();
        commentForm.scrollIntoView({ block: 'start' });
        commentText.focus();
    }

    function formatCommentDate(isoDate) {
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: window.ChicData.settings.timeZone,
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(isoDate));
    }

    // The same renderer handles every new, existing and edited comment object.
    function renderComment(comment) {
        const column = el('div', 'col-12');
        const card = el('article', 'card shadow-sm');
        card.id = `journal-comment-${comment.id}`;
        card.classList.toggle('selected', comment.id === editingId);
        const body = el('div', 'card-body');
        const article = articles.find((item) => item.id === comment.articleId);
        const title = el('h3', 'h5 text-break', comment.name);
        const details = el('p', 'small text-secondary', `${article.title} · Helpfulness: ${comment.rating}/5`);
        const dateLine = el('p', 'small text-secondary');
        const time = el('time', '', `${formatCommentDate(comment.createdAt)} (Astana time)`);
        time.dateTime = comment.createdAt;
        dateLine.append(time);
        if (comment.updatedAt !== null) {
            dateLine.append(document.createTextNode(` · Edited ${formatCommentDate(comment.updatedAt)}`));
        }
        const text = el('p', 'text-break', comment.text);
        const state = el('p', 'small text-secondary', 'Local demo comment — not publicly submitted.');
        const buttons = el('div', 'd-flex flex-wrap gap-2');
        const edit = button('Edit', 'btn btn-outline-dark btn-sm');
        edit.setAttribute('aria-label', `Edit comment by ${comment.name}`);
        edit.addEventListener('click', () => beginEdit(comment));
        const remove = button('Remove', 'btn btn-outline-secondary btn-sm');
        remove.setAttribute('aria-label', `Remove comment by ${comment.name}`);
        remove.addEventListener('click', () => {
            pendingDeleteId = comment.id;
            renderComments();
            document.getElementById(`confirm-delete-${comment.id}`).focus();
        });
        buttons.append(edit, remove);
        body.append(title, details, dateLine, text, state, buttons);
        if (pendingDeleteId === comment.id) {
            const confirmation = el('div', 'border rounded p-3 mt-3');
            const prompt = el('p', '', 'Remove this demo comment from the open page?');
            const confirm = button('Yes, remove', 'btn btn-dark btn-sm');
            confirm.id = `confirm-delete-${comment.id}`;
            const cancel = button('Cancel', 'btn btn-outline-secondary btn-sm');
            const confirmationButtons = el('div', 'd-flex flex-wrap gap-2');
            confirm.addEventListener('click', () => {
                const index = comments.findIndex((item) => item.id === comment.id);
                if (index !== -1) comments.splice(index, 1);
                if (editingId === comment.id) resetCommentForm(true);
                pendingDeleteId = null;
                renderComments();
                message(formStatus, 'Demo comment removed. Nothing was sent to a server.');
                commentList.focus();
            });
            cancel.addEventListener('click', () => {
                pendingDeleteId = null;
                renderComments();
                message(formStatus, 'Removal cancelled. Your demo comment is unchanged.');
                document.getElementById(`journal-comment-${comment.id}`).querySelector('button').focus();
            });
            confirmationButtons.append(confirm, cancel);
            confirmation.append(prompt, confirmationButtons);
            body.append(confirmation);
        }
        card.append(body);
        column.append(card);
        return column;
    }

    function renderComments() {
        const visible = comments.filter((comment) => commentFilter.value === 'all' || comment.articleId === commentFilter.value);
        commentList.replaceChildren();
        visible.forEach((comment) => commentList.append(renderComment(comment)));
        if (visible.length === 0) {
            const empty = el('p', 'col-12', comments.length === 0
                ? 'No comments yet. Add the first local demo comment using the form above.'
                : 'No comments for this article yet. Add one above or choose Show all comments.');
            empty.id = 'comment-empty';
            commentList.append(empty);
        }
        commentCount.textContent = `${visible.length} of ${comments.length} local demo comments shown.`;
        showAll.classList.toggle('active', commentFilter.value !== 'all');
    }

    commentForm.addEventListener('submit', (event) => {
        event.preventDefault();
        attemptedSubmit = true;
        if (!validateCommentForm()) {
            message(formStatus, 'Please correct the marked fields before adding your demo comment.', 'error');
            return;
        }
        const values = {
            name: name.value.trim(),
            articleId: articleChoice.value,
            rating: Number(rating.value),
            text: commentText.value.trim()
        };
        const duplicate = comments.find((comment) => comment.id !== editingId
            && comment.name === values.name && comment.articleId === values.articleId
            && comment.rating === values.rating && comment.text === values.text);
        if (duplicate) {
            commentFilter.value = values.articleId;
            renderComments();
            message(formStatus, 'This exact demo comment already appears below. Edit that comment or write a different one.', 'error');
            commentText.focus();
            return;
        }
        const wasEditing = editingId !== null;
        if (wasEditing) {
            const existing = comments.find((comment) => comment.id === editingId);
            Object.assign(existing, values, { updatedAt: new Date().toISOString() });
        } else {
            comments.push({ id: nextCommentId, ...values, createdAt: new Date().toISOString(), updatedAt: null });
            nextCommentId += 1;
        }
        pendingDeleteId = null;
        commentFilter.value = values.articleId;
        resetCommentForm(true);
        renderComments();
        message(formStatus, wasEditing
            ? 'Demo comment updated on this page only. No data was sent or published.'
            : 'Demo comment added on this page only. No data was sent or published; reloading will remove it.');
    });

    [name, articleChoice, rating, commentText].forEach((input) => {
        const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(eventType, () => {
            updateCounter();
            if (attemptedSubmit) fieldError(input, commentError(input));
            else clearFieldError(input);
            message(formStatus, '');
        });
    });
    resetComment.addEventListener('click', () => {
        const wasEditing = editingId !== null;
        resetCommentForm();
        renderComments();
        message(formStatus, wasEditing ? 'Editing cancelled. The original demo comment is unchanged.' : 'Comment form cleared. Existing demo comments are unchanged.');
        name.focus();
    });
    commentFilter.addEventListener('change', () => {
        pendingDeleteId = null;
        renderComments();
    });
    showAll.addEventListener('click', () => {
        commentFilter.value = 'all';
        pendingDeleteId = null;
        renderComments();
        commentFilter.focus();
    });

    articles.forEach((article) => {
        const section = document.getElementById(article.id);
        const catalogLink = section.querySelector('a[href="catalog.html"]');
        if (catalogLink) catalogLink.href = `catalog.html#${article.catalog}`;
        const discuss = button('Discuss this article', 'btn btn-outline-dark mt-3');
        discuss.addEventListener('click', () => {
            if (editingId !== null) {
                message(formStatus, 'Save or cancel your current comment edit before choosing another article.', 'error');
            } else {
                articleChoice.value = article.id;
                clearFieldError(articleChoice);
                commentFilter.value = article.id;
                renderComments();
                message(formStatus, `Commenting on “${article.title}”. Your comment stays on this page only.`);
            }
            commentForm.scrollIntoView({ block: 'start' });
            name.focus();
        });
        section.firstElementChild.append(discuss);
    });

    renderArticles();
    updateCounter();
    renderComments();
})();
