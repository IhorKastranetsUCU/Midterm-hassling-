async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 } });
  const qa = await context.newPage();
  qa.setDefaultTimeout(6000);
  const errors = [];
  qa.on('pageerror', e => errors.push(e.message));
  qa.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  const assert = (condition, reason) => { if (!condition) throw new Error(reason); };
  const base = 'http://localhost:8081/prototype/';
  const shot = name => qa.screenshot({path:'output/playwright/review-' + name + '.png'});
  const goto = async hash => {
    await qa.goto(base + 'app.html#' + hash);
    await qa.waitForFunction(() => !!document.querySelector('main h1'));
  };
  const layout = async label => {
    const issues = await qa.evaluate(() => {
      const logo = document.querySelector('.folded-h');
      const buttons = [...document.querySelectorAll('main button,main a')].filter(e => e.checkVisibility() && !e.textContent.trim() && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby'));
      return [document.documentElement.scrollWidth > innerWidth, logo && (logo.clientWidth > 54 || !logo.naturalWidth), buttons.length];
    });
    assert(issues.every(i => !i), label + ' ' + JSON.stringify(issues));
  };
  await qa.clock.setFixedTime(new Date('2026-11-18T17:39:00Z'));
  await qa.goto(base); await layout('landing'); await shot('landing');
  await qa.getByRole('link',{name:'Увійти'}).click();
  await qa.getByRole('heading',{name:'Увійти',exact:true}).waitFor(); await layout('login');
  await qa.getByRole('link',{name:'Створити акаунт'}).click();
  await qa.getByLabel('Ім’я',{exact:true}).fill('Студент');
  await qa.getByLabel('Email',{exact:true}).fill('student@example.test');
  await qa.getByLabel('Пароль',{exact:true}).fill('hustle-example');
  await layout('registration'); await shot('register');
  await qa.getByRole('button',{name:/Підключення LMS/}).click();
  await qa.getByLabel('Адреса LMS').fill('https://lms.example.test');
  await layout('connect'); await qa.getByRole('button',{name:'Підключити',exact:false}).click();
  await qa.locator('[name="course"][value="english"]').check();
  await qa.getByRole('button',{name:/Відкрити мій план/}).click();
  await qa.getByRole('heading',{level:1,name:'Мій огляд'}).waitFor();
  const routes = ['plan','courses','course/probability','course/algebra','course/english','practice','focus','calendar','settings'];
  for (const width of [360,390,768,1024,1440]) {
    await qa.setViewportSize({width,height:width < 400 ? 844 : 900});
    for (const route of routes) {
      await goto(route);
      await layout(width + ' ' + route);
      if ([390,1440].includes(width) && ['plan','courses','course/algebra','practice','focus','calendar','settings'].includes(route)) await shot(route.replace('/','-') + '-' + width);
    }
  }
  await goto('courses');
  const paper = qa.locator('.subject-lilac');
  const bounds = await paper.boundingBox();
  const originalShadow = await paper.evaluate(el => getComputedStyle(el).boxShadow);
  await qa.mouse.move(bounds.x + 55, bounds.y + 30);
  await qa.waitForFunction(() => Number(getComputedStyle(document.querySelector('.subject-lilac'), '::before').opacity) > .95);
  const lightAt = () => paper.evaluate(el => el.style.getPropertyValue('--light-x'));
  const firstX = await lightAt();
  await qa.mouse.move(bounds.x + 145, bounds.y + 50);
  assert(await lightAt() !== firstX, 'light follows the pointer across the page');
  assert(await paper.evaluate(el => getComputedStyle(el).boxShadow) !== originalShadow, 'hover lifts the shadow');
  assert(await paper.locator('.subject-deadline').evaluate(el => getComputedStyle(el).backgroundImage === 'none' && getComputedStyle(el).borderTopWidth === '0px' && getComputedStyle(el.querySelector('.due-badge')).backgroundColor === 'rgba(0, 0, 0, 0)'), 'deadline details share the subject paper');
  await shot('courses-hover');
  await qa.emulateMedia({reducedMotion:'reduce'});
  assert(await paper.locator('.course-avatar').evaluate(el => getComputedStyle(el).transitionDuration) === '0s', 'reduced motion disables hover movement');
  await qa.emulateMedia({reducedMotion:'no-preference'});
  await qa.mouse.move(2,2);
  const selection = await qa.evaluate(() => {
    document.querySelector('.subject-lilac').focus();
    return document.activeElement.getAttribute('href');
  });
  assert(selection === '#course/algebra', 'subject reachable with keyboard');
  await qa.keyboard.press('Enter');
  const manual = qa.locator('[data-dash-complete="algebra:example"]');
  await manual.click();
  assert(await manual.getAttribute('aria-pressed') === 'true' && await qa.locator('.practice-line.just-completed').count() === 1, 'check gives immediate feedback');
  await manual.click();
  assert(await manual.getAttribute('aria-pressed') === 'false', 'task can be undone');
  await goto('course/algebra');
  assert((await qa.locator('.workspace-nav [aria-current="page"]').getAttribute('href')) === '#course/algebra','current course in sidebar');
  await qa.getByRole('button',{name:'Конспект',exact:true}).click();
  await qa.getByRole('dialog').getByRole('heading',{name:'Базис векторного простору'}).waitFor();
  await qa.keyboard.press('Escape');
  await qa.getByRole('button',{name:'Почати заняття',exact:true}).click();
  for (let i = 0; i < 3; i++) {
    await qa.locator('[data-reveal]').click(); await qa.getByRole('button',{name:'Знаю ✓'}).click();
  }
  await qa.getByText('+10 XP', {exact:false}).first().waitFor(); await qa.keyboard.press('Escape');
  await goto('focus'); await qa.locator('[data-timer-toggle]').click();
  await qa.reload(); await qa.getByRole('button',{name:'Пауза',exact:true}).click();
  await qa.getByRole('button',{name:'Скинути таймер'}).click();
  await goto('calendar');
  await qa.locator('[data-sync-inbox]').click();
  await qa.getByRole('button',{name:/Відхилити: Есе/}).click();
  await qa.getByRole('button',{name:/Додати в календар: Практичне/}).click();
  await shot('inbox'); await qa.keyboard.press('Escape');
  const chip = qa.locator('.calendar-event-chip').first();
  await chip.click(); await qa.locator('input[name="day"]').fill('2026-11-22');
  await qa.locator('input[name="time"]').fill('10:45'); await qa.getByRole('button',{name:/Зберегти/}).click();
  await qa.locator('[data-drop-day="2026-11-22"] .calendar-event-chip').waitFor();
  await qa.locator('[data-drop-day="2026-11-22"] .calendar-event-chip').dragTo(qa.locator('[data-drop-day="2026-11-23"]'));
  await qa.locator('[data-drop-day="2026-11-23"] .calendar-event-chip').waitFor();
  await qa.locator('.calendar-grid [data-calendar-date="2026-11-23"]').click();
  await qa.locator('.calendar-agenda-event').click();
  assert((await qa.locator('.event-original').textContent()).includes('19 листопада · 16:00'), 'original Moodle deadline survives move');
  await qa.getByRole('button',{name:'Прибрати з календаря'}).click();
  await qa.locator('.calendar-event-chip').waitFor({state:'detached'});
  await qa.getByRole('button',{name:/Події з LMS/}).click();
  await qa.getByRole('button',{name:'Усі події',exact:true}).click();
  await qa.locator('.sync-event').filter({hasText:'Практичне заняття'}).getByRole('button',{name:'Додати'}).click();
  await qa.keyboard.press('Escape');
  await qa.getByRole('button',{name:'Наступний місяць'}).click();
  await qa.getByRole('button',{name:'Сьогодні',exact:true}).click();
  await qa.locator('.calendar-grid [aria-pressed="true"]').focus(); await qa.keyboard.press('ArrowRight');
  await shot('calendar-populated');
  await qa.setViewportSize({width:390,height:844});
  await qa.getByRole('button',{name:'Відкрити меню'}).click();
  await qa.getByRole('link',{name:'Мій огляд',exact:true}).click();
  assert(await qa.locator('#menu-toggle').getAttribute('aria-expanded') === 'false','drawer closes');
  assert(!errors.length, errors.join('\n'));
  await context.close();
  return 'PASS — onboarding, 45 route/viewport pairs, course notes and practice, reward, timer reload, inbox decisions, event move/drag/remove/restore, keyboard and mobile navigation; no browser errors';
}
