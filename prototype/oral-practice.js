/* Paper reading notes and connected courses open the same oral examiner. */
(() => {
  const H = window.Hustle, {escape: esc, icon} = H;
  const paperTopics = {probability: 1, algebra: 2, english: 3};
  let selectedCourse = '', selectedTopic = '', courseRequest;
  const option = (value, name) => `<option value="${esc(value)}">${esc(name)}</option>`;
  const button = c => `<button type="button" class="secondary paper-oral-button" data-paper-oral="${esc(c.id)}">${icon('practice')} Усний захист</button>`;

  function startPaper(id) {
    const course = window.HustleCourses.find(c => c.id === id);
    if (!course) return;
    window.HustleOralDefense.open({
      courseId: 'paper', topicIndex: paperTopics[id], topicTitle: course.topic,
      reading: {
        course_title: course.name, topic_title: course.topic,
        lecture_context: course.materials.map(m => [m.title,m.body,m.formula,m.detail].filter(Boolean).join('\n')).join('\n\n'),
      },
    });
  }
  function shell() {
    return `<section class="dash-panel oral-picker" data-oral-picker><div class="oral-picker-head"><div>
      <h2>Практика за темою</h2><p>Відповідай на питання за конспектом. Після відповіді побачиш, що вдалося пояснити й що варто уточнити.</p></div>
      <img src="study-donkey.webp" alt="" width="76" height="76"></div>
      <form><label>Предмет<select name="course" required></select></label><label>Тема<select name="topic" required disabled></select></label>
      <p data-oral-status role="status"></p><button class="primary" type="submit" disabled>Перейти до захисту ${icon('arrow')}</button></form>
      <a class="text-button" href="/hustle/app.html#courses">Мої курси й матеріали ${icon('arrow')}</a></section>`;
  }
  function mount(root) {
    const form = root.querySelector('form'), course = form.elements.course, topic = form.elements.topic;
    const status = root.querySelector('[data-oral-status]'), submit = form.querySelector('[type=submit]');
    let generation = 0, topics = [];
    function error(err, retry) {
      status.textContent = err.message + ' ';
      const btn = document.createElement('button'); btn.textContent = 'Повторити'; btn.className = 'text-button';
      btn.type = 'button'; btn.onclick = retry; status.append(btn);
    }
    async function loadTopics() {
      const turn = ++generation;
      selectedCourse = course.value; topic.disabled = submit.disabled = true; topic.innerHTML = ''; topics = [];
      status.textContent = 'Завантажуємо теми…';
      try {
        const paper = window.HustleCourses.find(c => c.id === selectedCourse);
        if (paper) topics = [{key:paper.id, title:paper.topic}];
        else {
          const bundle = await UI.api('/api/workspace/courses/' + encodeURIComponent(selectedCourse));
          if (!root.isConnected || turn !== generation) return;
          const nodes = bundle.course_map?.nodes?.filter(n => n.learnable && (n.topic_index ?? n.section_index) != null) || [];
          topics = nodes.length ? nodes.map(n => ({key:n.id, title:n.title, index:n.topic_index ?? n.section_index, node:n.id}))
            : bundle.topic_mixes.map(t => ({key:String(t.topic_index), title:t.title, index:t.topic_index}));
        }
        topic.innerHTML = topics.map(t => option(t.key,t.title)).join('');
        if (topics.some(t => t.key === selectedTopic)) topic.value = selectedTopic;
        selectedTopic = topic.value; topic.disabled = submit.disabled = !topics.length;
        status.textContent = topics.length ? '' : 'Для цього курсу ще немає навчальних тем.';
      } catch (err) { if (root.isConnected && turn === generation) error(err,loadTopics); }
    }
    async function loadCourses() {
      status.textContent = 'Завантажуємо курси…';
      try {
        courseRequest ||= UI.api('/api/workspace/courses').finally(() => { courseRequest = null; });
        const courses = await courseRequest;
        if (!root.isConnected) return;
        course.innerHTML = (courses.length ? '<optgroup label="Мої курси">' + courses.map(c => option(c.course_id,c.title)).join('') + '</optgroup>' : '') +
          '<optgroup label="Теми з демопростору">' + window.HustleCourses.map(c => option(c.id,c.name)).join('') + '</optgroup>';
        if ([...course.options].some(o => o.value === selectedCourse)) course.value = selectedCourse;
        await loadTopics();
      } catch (err) { if (root.isConnected) error(err,loadCourses); }
    }
    course.onchange = loadTopics;
    topic.onchange = () => { selectedTopic = topic.value; };
    form.onsubmit = event => {
      event.preventDefault();
      if (submit.disabled) return;
      if (paperTopics[course.value]) return startPaper(course.value);
      const chosen = topics.find(t => t.key === topic.value);
      if (chosen) H.workspace && window.HustleDashboard?.trackCourseActivity(course.value);
      if (chosen) window.HustleOralDefense.open({courseId:course.value, topicIndex:chosen.index, nodeId:chosen.node, topicTitle:chosen.title});
    };
    loadCourses();
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-paper-oral]');
    if (trigger) {
      if (H.workspace?.courses.some(c => c.id === trigger.dataset.paperOral)) {
        selectedCourse = trigger.dataset.paperOral; selectedTopic = ''; location.hash = 'oral';
      } else startPaper(trigger.dataset.paperOral);
    }
  });
  H.paperOral = {shell, mount, button};
})();
