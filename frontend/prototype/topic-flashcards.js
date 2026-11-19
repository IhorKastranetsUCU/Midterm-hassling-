/* Topic decks and quizzes in the course practice workspace. */
(() => {
  const {escape: esc, icon} = UI;

  const drafts = (window.frameElement && window.parent.HustleTopicCards?.drafts) || new Map();
  const setLink = (courseId, mode, topic) => UI.courseLink(courseId, mode, topic?.topic_index);
  const deckLink = (courseId, topic) => setLink(courseId, 'cards', topic);
  const count = value => UI.countLabel(value, 'картка', 'картки', 'карток');
  const questionCount = value => UI.countLabel(value, 'питання', 'питання', 'питань');
  const isQuiz = state => state.mode === 'quizzes';
  const size = (state, topic) => isQuiz(state) ? topic.question_count : topic.cards_count;
  const itemCount = (state, value) => isQuiz(state) ? questionCount(value) : count(value);
  const draftKey = state => [state.courseId, state.mode, state.topicIndex].join('/');

  function sessionFor(courseId, topicIndex, practiceAll = false, mode = 'cards') {
    const params = new URLSearchParams();
    if (topicIndex !== undefined) params.set('topic_index', topicIndex);
    if (practiceAll) params.set('practice_all', 'true');
    return UI.api('/api/workspace/courses/' + courseId + '/' + (mode === 'cards' ? 'flashcards' : 'quizzes') + '?' + params);
  }

  function suggest(topics) {
    return topics.find(topic => topic.due_count)
      || topics.find(topic => topic.cards_count)
      || topics.find(topic => topic.has_source);
  }

  function overview(courseId) {
    return `<section class="topic-card-overview" data-card-overview="${esc(courseId)}" aria-label="Картки курсу">
      <p class="muted" role="status">Завантажуємо картки…</p>
    </section>`;
  }

  async function loadOverview(host) {
    const courseId = host.dataset.cardOverview;
    const heading = `<div class="topic-card-overview-head">
      <h2>Повторення карток</h2><a class="text-button" href="${deckLink(courseId)}">Усі набори ${icon('arrow')}</a>
    </div>`;
    try {
      const {topics} = await sessionFor(courseId);
      if (!host.isConnected) return;
      const topic = suggest(topics) || topics[0];
      if (!topic) {
        host.innerHTML = heading + '<p class="muted">У курсі ще немає навчальних тем.</p>';
        return;
      }
      const label = topic.due_count ? 'Повторити' : topic.cards_count ? 'Відкрити набір' : 'Створити картки';
      const details = [topic.path.join(' › '), count(topic.cards_count)];
      if (topic.due_count) details.push(topic.due_count + ' до повторення');
      host.innerHTML = `${heading}<div class="topic-card-recommendation">
        <span class="topic-card-symbol" aria-hidden="true">${icon('practice')}</span>
        <div><h3>${esc(topic.title)}</h3><p>${esc(details.filter(Boolean).join(' · '))}</p></div>
        <a class="primary" href="${deckLink(courseId, topic)}">${label} ${icon('arrow')}</a>
      </div>`;
    } catch (error) {
      if (!host.isConnected) return;
      host.innerHTML = `${heading}<p class="field-error" role="alert">${esc(error.message)}
        <button type="button" class="text-button" data-card-retry>Повторити</button></p>`;
      host.querySelector('[data-card-retry]').onclick = () => loadOverview(host);
    }
  }

  function mountOverview(root) {
    const host = root.querySelector('[data-card-overview]');
    if (host && !host.dataset.mounted) {
      host.dataset.mounted = 'true';
      loadOverview(host);
    }
  }

  function topicList(state, topic) {
    const topics = state.session.topics;
    const rows = topics.map(item => `<li>
      <a href="${setLink(state.courseId, state.mode, item)}" data-deck-link="${item.topic_index}" ${item === topic ? 'aria-current="page"' : ''}>
        <span class="topic-set-name">
          ${item.path.length ? `<small>${esc(item.path.join(' › '))}</small>` : ''}
          <strong>${esc(item.title)}</strong><span>${esc(itemCount(state, size(state, item)))}</span>
        </span>
        ${item.due_count ? `<span class="topic-set-due" aria-label="До повторення ${item.due_count}">${item.due_count}</span>` : ''}
      </a>
    </li>`).join('');
    const options = topics.map(item => {
      const title = [...item.path, item.title].join(' › ');
      return `<option value="${item.topic_index}" ${item === topic ? 'selected' : ''}>
        ${esc(title + ' · ' + itemCount(state, size(state, item)))}
      </option>`;
    }).join('');
    return `<nav class="topic-set-index" aria-label="Розділи й теми"><h2>Розділи й теми</h2><ul>${rows}</ul></nav>
      <label class="topic-set-picker">Розділ або тема<select data-deck-topic>${options}</select></label>`;
  }

  function sourceLink(state, topic) {
    const node = topic.node_id && window.HustleCurriculum?.find(state.bundle, topic.node_id);
    return node ? HustleCurriculum.link(state.bundle, node) : UI.courseLink(state.courseId, 'reading', topic.topic_index);
  }

  function createAction(state) {
    const existing = size(state, state.topic);
    const label = isQuiz(state) ? (existing ? 'Додати питання' : 'Створити квіз')
      : (existing ? 'Додати картки' : 'Створити картки');
    return `<button type="button" class="${existing ? 'secondary' : 'primary'}" data-deck-create>${label}</button>`;
  }

  function creationForm(state) {
    const quiz = isQuiz(state);
    const draft = drafts.get(draftKey(state)) || {};
    const fields = quiz
      ? `<fieldset class="topic-quiz-fields">
          <legend>Варіанти відповіді</legend>
          ${[0, 1, 2].map((index) => `<label>Варіант ${index + 1}<input name="option${index}" required maxlength="400"
              value="${esc(draft['option' + index])}"></label>`).join('')}
          <label>Правильний варіант<select name="correct_index" required>
            <option value="">Обрати</option>${[0, 1, 2].map(index =>
              `<option value="${index}"${draft.correct_index === String(index) ? ' selected' : ''}>Варіант ${index + 1}</option>`).join('')}
          </select></label>
        </fieldset>
        <label>Пояснення (за бажанням)<textarea name="explanation" rows="2" maxlength="900">${esc(draft.explanation)}</textarea></label>`
      : `<label>Відповідь<textarea name="back" required rows="3" maxlength="900">${esc(draft.back)}</textarea></label>`;
    const aiAction = !state.topic.has_source
      ? `<p>Для генерації потрібен текст цієї теми.</p><a class="text-button" href="${sourceLink(state, state.topic)}">До матеріалів ${icon('arrow')}</a>`
      : state.provider?.configured === false
        ? '<a class="secondary" href="#settings">Підключити Gemini ' + icon('arrow') + '</a>'
        : `<button type="button" class="secondary" data-deck-generate>${quiz ? 'Згенерувати квіз' : 'Згенерувати картки'}</button>`;
    return `<div class="topic-set-create">
      <section class="topic-set-empty topic-ai-create">
        <div><h3>З матеріалів теми</h3>${aiAction}</div>
      </section>
      <form data-deck-form class="topic-set-empty topic-manual-create">
        <h3>Додати вручну</h3>
        <label>Запитання<textarea name="${quiz ? 'question' : 'front'}" required minlength="5" maxlength="400" rows="2"
          >${esc(quiz ? draft.question : draft.front)}</textarea></label>
        ${fields}
        <button type="submit" class="primary" data-deck-save>${quiz ? 'Зберегти питання' : 'Зберегти картку'}</button>
      </form>
    </div>`;
  }

  function quizView(state) {
    if (!state.topic.question_count) return `<div class="topic-set-empty">
      <h3>У цій темі ще немає квізу</h3>${createAction(state)}
    </div>`;
    return `<div class="topic-set-empty">
      <h3>Квіз за темою</h3>
      <button type="button" class="primary" data-quiz-start>Почати квіз ${icon('arrow')}</button>
    </div>`;
  }

  function ratingButtons(ratings) {
    const buttons = ratings.map(({id, label, interval}) =>
      `<button type="button" class="topic-rating ${id}" data-card-rate="${id}">
        <strong>${esc(label)}</strong><span>${esc(interval)}</span>
      </button>`).join('');
    return `<div class="topic-rating-grid" role="group" aria-label="Оціни, наскільки добре знаєш картку">${buttons}</div>`;
  }

  function cardView(state) {
    const card = state.queue[state.index];
    const {cards_count: size, due_count: due, next_due_in: nextDue} = state.topic;
    if (!card) {
      if (!size) return `<div class="topic-set-empty"><h3>У цій темі ще немає карток</h3>${createAction(state)}</div>`;
      return '<div class="topic-set-empty" tabindex="-1" data-deck-complete>'
        + (state.index ? '<span class="mascot-sticker mascot-sticker--complete" aria-hidden="true"><img src="/prototype/assets/mascot/complete.webp" alt="" width="384" height="384"></span>' : '')
        + '<h3>' + (state.index ? 'Серію завершено' : 'На цей час усе повторено') + '</h3>'
        + (state.index ? '<p>' + esc(count(state.index)) + ' переглянуто</p>' : '')
        + (nextDue && !due ? '<p>Наступне повторення через ' + esc(nextDue) + '.</p>' : '')
        + (due ? '<button type="button" class="primary" data-deck-mode="due">Наступна серія ' + icon('arrow') + '</button>'
          : '<button type="button" class="secondary" data-deck-mode="all">Повторити поза розкладом</button>')
        + '</div>';
    }
    const progress = `Картка ${state.index + 1} з ${state.queue.length}`;
    const answer = state.revealed ? `<div class="topic-card-answer" data-deck-answer tabindex="-1">
      ${UI.inlineMath(card.back)}
      ${card.source_citation ? `<div class="topic-card-source">Джерело · ${esc(card.source_citation)}</div>` : ''}
      </div>${ratingButtons(state.session.ratings)}`
      : '<div><button type="button" class="primary" data-deck-reveal>Показати відповідь</button></div>';
    return `<article class="topic-review-card">
      <div class="topic-review-position"><span>${progress}</span>
        <progress aria-label="${progress}" value="${state.index + 1}" max="${state.queue.length}"></progress></div>
      <h3 class="topic-card-question" data-deck-question tabindex="-1">${UI.inlineMath(card.front)}</h3>
      ${answer}
    </article>`;
  }

  function draw(state, focus) {
    if (!state.host.isConnected) return;
    const topic = state.session.topics.find(item => item.topic_index === state.topicIndex);
    state.topic = topic;
    if (!topic) {
      state.content.innerHTML = '<div class="topic-set-empty"><h2>У курсі ще немає навчальних тем</h2><a class="secondary" href="'
        + UI.courseLink(state.courseId, 'topics') + '">Теми курсу ' + icon('arrow') + '</a></div>';
      return;
    }
    const mode = state.session.practice_all ? '<button class="text-button" type="button" data-deck-mode="due">Лише за розкладом</button>'
      : topic.cards_count > topic.due_count
        ? '<button class="text-button" type="button" data-deck-mode="all">Повторити поза розкладом</button>' : '';
    state.content.innerHTML = `<div class="topic-deck-layout">
      ${topicList(state, topic)}
      <section class="topic-deck-review" aria-labelledby="topic-deck-title">
        <header class="topic-deck-header">
          <div>
            ${topic.path.length ? `<p class="topic-deck-path">${esc(topic.path.join(' › '))}</p>` : ''}
            <h2 id="topic-deck-title" tabindex="-1">${esc(topic.title)}</h2>
            <p class="topic-set-meta">${esc(itemCount(state, size(state, topic)))}
              ${topic.due_count ? ` · ${topic.due_count} до повторення` : ''}</p>
          </div>
          ${state.creating ? '<button type="button" class="text-button" data-deck-cancel>До набору</button>'
            : size(state, topic) ? createAction(state) : ''}
        </header>
        <div data-deck-feedback></div>
        ${state.creating ? creationForm(state) : isQuiz(state) ? quizView(state)
          : cardView(state) + (state.index < state.queue.length ? mode : '')}
      </section>
    </div>`;
    state.content.querySelector('[data-deck-feedback]').append(state.notice, state.error);
    const selected = state.content.querySelector('.topic-set-index [aria-current="page"]');
    const list = selected.closest('ul');
    const itemBounds = selected.getBoundingClientRect();
    const listBounds = list.getBoundingClientRect();
    if (itemBounds.bottom > listBounds.bottom) list.scrollTop += itemBounds.bottom - listBounds.bottom;
    UI.enhance?.(state.content);
    if (focus) state.content.querySelector(focus)?.focus({preventScroll: true});
  }

  function begin(state, session) {
    state.session = session;
    state.queue = session.queue || [];
    state.index = 0;
    state.revealed = false;
  }

  function topicApi(state) {
    return '/api/workspace/courses/' + state.courseId + '/topics/' + state.topicIndex
      + '/' + (isQuiz(state) ? 'quizzes' : 'flashcards');
  }

  function status(state, message = '', isError = false) {
    state.notice.textContent = isError ? '' : message;
    state.error.textContent = isError ? message : '';
  }

  async function act(state, button, task, pendingMessage) {
    if (state.pending) return;
    state.pending = true;
    button.setAttribute('aria-disabled', 'true');
    status(state, pendingMessage);
    try {
      await task();
    } catch (error) {
      status(state, error.message, true);
    } finally {
      state.pending = false;
      button.removeAttribute('aria-disabled');
    }
  }

  async function saveItems(state, path, payload) {
    const key = draftKey(state);
    const submittedDraft = drafts.get(key);
    const result = await UI.post(topicApi(state) + path, payload);
    if (path === '/manual' && drafts.get(key) === submittedDraft) drafts.delete(key);
    if (!state.host.isConnected) return;
    const message = result.added ? 'Додано ' + itemCount(state, result.added) + '.' : 'Набір уже містить ці запитання.';
    let fresh;
    try {
      fresh = await sessionFor(state.courseId, state.topicIndex, state.session.practice_all, state.mode);
    } catch (error) {
      status(state, message + ' Онови сторінку, щоб завантажити набір.', true);
      return;
    }
    if (state.index < state.queue.length) state.session = fresh;
    else begin(state, fresh);
    state.creating = false;
    draw(state, isQuiz(state) ? '[data-quiz-start]' : '[data-deck-create]');
    status(state, message);
  }

  function bind(state) {
    state.host.addEventListener('input', event => {
      const form = event.target.closest('[data-deck-form]');
      if (form) drafts.set(draftKey(state), Object.fromEntries(new FormData(form)));
    });
    state.host.addEventListener('submit', event => {
      const form = event.target.closest('[data-deck-form]');
      if (!form) return;
      event.preventDefault();
      if (state.pending) return;
      const data = Object.fromEntries(new FormData(form));
      const options = [data.option0, data.option1, data.option2];
      if (isQuiz(state) && (options.some(option => !option.trim()) ||
          new Set(options.map(option => option.trim().toLocaleLowerCase())).size !== options.length)) {
        status(state, 'Введи три різні варіанти відповіді.', true);
        return;
      }
      const payload = isQuiz(state)
        ? {question: data.question, options, correct_index: Number(data.correct_index), explanation: data.explanation}
        : {front: data.front, back: data.back};
      if ((data.question || data.front).trim().length < 5 || (!isQuiz(state) && !data.back.trim())) {
        status(state, 'Введи запитання й відповідь.', true);
        return;
      }
      act(state, form.querySelector('[data-deck-save]'), async () => {
        const inputs = [...form.elements].filter(control => control.matches('input, select, textarea'));
        inputs.forEach(control => { control.disabled = true; });
        try { await saveItems(state, '/manual', payload); }
        finally { inputs.forEach(control => { control.disabled = false; }); }
      }, 'Зберігаємо…');
    });
    state.host.addEventListener('change', event => {
      if (event.target.matches('[data-deck-topic]')) {
        const targetIndex = Number(event.target.value);
        state.content.querySelector(`[data-deck-link="${targetIndex}"]`)?.click();
      }
    });
    state.host.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || state.pending) return;
      if (button.hasAttribute('data-deck-create') || button.hasAttribute('data-deck-cancel')) {
        state.creating = button.hasAttribute('data-deck-create');
        status(state);
        draw(state, state.creating ? '[data-deck-form] textarea' : '[data-deck-create]');
      } else if (button.hasAttribute('data-quiz-start')) {
        HustleLearning.openTopicPractice(state.bundle, 'quiz', state.topic.mix_id, state.session.questions);
      } else if (button.hasAttribute('data-deck-reveal')) {
        state.revealed = true;
        draw(state, '[data-deck-answer]');
      } else if (button.hasAttribute('data-card-rate')) {
        act(state, button, async () => {
          const response = await UI.post(topicApi(state) + '/review', {
            card_id: state.queue[state.index].card_id, rating: button.dataset.cardRate,
          });
          state.session.topics = response.topics;
          state.index += 1;
          state.revealed = false;
          draw(state, state.queue[state.index] ? '[data-deck-question]' : '[data-deck-complete]');
          status(state, 'Повторення цієї картки через ' + response.next_review_in + '.');
        }, 'Зберігаємо оцінку…');
      } else if (button.hasAttribute('data-deck-mode')) {
        act(state, button, async () => {
          begin(state, await sessionFor(state.courseId, state.topicIndex, button.dataset.deckMode === 'all'));
          draw(state, state.queue.length ? '[data-deck-question]' : '[data-deck-complete]');
          status(state);
        }, 'Оновлюємо набір…');
      } else if (button.hasAttribute('data-deck-generate')) {
        act(state, button, () => saveItems(state, '', {}), 'Генеруємо з матеріалів теми…');
      }
    });
  }

  function view(bundle, mode = 'cards') {
    return '<div class="topic-decks" data-topic-decks="' + mode + '" data-course="' + esc(bundle.course.course_id)
      + '"><div data-deck-content><p class="muted" role="status">Завантажуємо набори…</p></div>'
      + '<p class="topic-deck-notice" data-deck-notice role="status"></p>'
      + '<p class="field-error topic-deck-notice" data-deck-error role="alert"></p></div>';
  }

  async function openDeck(state, routeTopic) {
    const index = routeTopic === undefined ? undefined : Number(routeTopic);
    try {
      if (index !== undefined && !/^\d+$/.test(routeTopic)) throw new Error('Тему не знайдено в цьому курсі.');
      const [initial, provider] = await Promise.all([
        sessionFor(state.courseId, index, false, state.mode),
        UI.api('/api/workspace/learning/settings').catch(() => null),
      ]);
      const suggested = isQuiz(state) ? initial.topics.find(item => item.question_count)
        || initial.topics.find(item => item.has_source) : suggest(initial.topics);
      const topic = index === undefined ? suggested || initial.topics[0]
        : initial.topics.find(item => item.topic_index === index);
      state.provider = provider;
      state.topicIndex = topic?.topic_index;
      state.creating = drafts.has(draftKey(state));
      begin(state, topic && index === undefined ? await sessionFor(state.courseId, state.topicIndex, false, state.mode) : initial);
      draw(state, index === undefined ? undefined : '#topic-deck-title');
    } catch (error) {
      if (!state.host.isConnected) return;
      state.content.innerHTML = '<div class="topic-set-empty"><p role="alert" class="field-error">'
        + esc(error.message) + '</p><button type="button" class="secondary" data-deck-retry>Повторити</button>'
        + (routeTopic === undefined ? '' : '<a class="text-button" href="' + setLink(state.courseId, state.mode) + '">Усі теми</a>')
        + '</div>';
      state.content.querySelector('[data-deck-retry]').onclick = () => openDeck(state, routeTopic);
    }
  }

  function mount(root, bundle) {
    mountOverview(root);
    const host = root.querySelector('[data-topic-decks]');
    if (!host || host.dataset.mounted || !bundle) return;
    host.dataset.mounted = 'true';
    const state = {
      host, bundle, courseId: Number(host.dataset.course), mode: host.dataset.topicDecks,
      content: host.querySelector('[data-deck-content]'),
      notice: host.querySelector('[data-deck-notice]'), error: host.querySelector('[data-deck-error]'),
    };
    bind(state);
    openDeck(state, UI.route().topic);
  }

  window.HustleTopicCards = {overview, view, mount, mountOverview, deckLink, drafts};
})();
