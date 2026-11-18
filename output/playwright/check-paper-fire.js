async (page) => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 } });
  const qa = await context.newPage();
  qa.setDefaultTimeout(8000);
  const errors = [];
  qa.on('pageerror', error => errors.push(error.message));
  await qa.addInitScript(() => {
    const key = 'hustle-product-prototype-v1';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, JSON.stringify({ registered: true, ready: true, name: 'Студент', courses: ['probability', 'algebra', 'english'], school: 'https://example.edu', minutes: 25 }));
      localStorage.setItem('hustle-study-dashboard-v1', JSON.stringify({ anchor: '2026-11-18' }));
    }
  });
  const url = 'http://localhost:8081/prototype/app.html';
  await qa.clock.setFixedTime(new Date('2026-11-16T12:00:00Z'));
  await qa.goto(url + '#courses');
  const subject = qa.locator('.subject-lilac');
  const edge = subject.locator('.subject-deadline');
  const canvas = edge.locator('canvas');
  assert((await qa.locator('.subject-card').first().getAttribute('href')) === '#course/algebra', 'nearest incomplete deadline shown first');
  assert(await qa.locator('.subject-card .paper-tape').count() === 3, 'each subject has paper tape');
  assert(await qa.getByRole('link', {name:'Матеріали',exact:true}).count() === 0, 'materials removed from nav');
  assert(await qa.getByRole('link', {name:'Усі предмети',exact:true}).count() === 0, 'no duplicate link to current page');
  await qa.waitForFunction(() => document.querySelector('.subject-lilac .subject-deadline').dataset.heatStage === 'cool');
  assert(!await canvas.isVisible(), 'distant deadline has no flame');
  assert(!await edge.locator('.deadline-countdown').isVisible(), 'distant deadline only shows date');
  const due = Date.parse('2026-11-19T14:00:00Z');
  const sample = async minutes => {
    await qa.clock.setFixedTime(new Date(due - minutes * 60000));
    await qa.waitForFunction(value => {
      const el = document.querySelector('.subject-lilac .subject-deadline');
      const expected = window.HustleStudy.deadlineWarmth(value, false);
      return el && Math.abs(Number(el.style.getPropertyValue('--deadline-warmth')) - expected) < .000001;
    }, due);
    return edge.evaluate(el => ({
      warmth: Number(el.style.getPropertyValue('--deadline-warmth')),
      heat: Number(el.style.getPropertyValue('--deadline-heat')),
      image: getComputedStyle(el.closest('.subject-card')).backgroundImage,
      opacity: Number(getComputedStyle(el.querySelector('canvas')).opacity)
    }));
  };
  const early = await sample(60 * 60);
  const yellow = await sample(36 * 60);
  assert(yellow.warmth > early.warmth && yellow.image !== early.image && !await canvas.isVisible(), 'paper changes continuously without flames');
  await qa.screenshot({path:'output/playwright/paper-deadlines-quiet.png'});
  await sample(24 * 60);
  assert(!await canvas.isVisible(), 'no flame at the start of the last day');
  const faint = await sample(23 * 60);
  assert(faint.opacity > 0 && faint.opacity < .03, 'first glow is faint');
  const moderate = await sample(11 * 60 + 17);
  await qa.screenshot({path:'output/playwright/paper-deadlines-warm.png'});
  const pixels = await canvas.evaluate(el => el.toDataURL());
  await qa.waitForFunction(value => document.querySelector('.subject-lilac canvas')?.toDataURL() !== value, pixels);
  const strong = await sample(137);
  assert(strong.heat > moderate.heat && moderate.heat > faint.heat && strong.image !== moderate.image, 'intensity and paper tint follow the remaining time');
  await qa.clock.setFixedTime(new Date('2026-11-19T13:45:00Z'));
  await edge.getByText('Лишилось 15 хв', {exact:true}).waitFor();
  await qa.screenshot({path:'output/playwright/paper-deadlines-critical.png'});
  await qa.emulateMedia({reducedMotion:'reduce'});
  await qa.waitForTimeout(130);
  const readPixels = () => qa.evaluate(() => document.querySelector('.subject-lilac .subject-deadline canvas')?.toDataURL());
  const still = await readPixels();
  await qa.waitForTimeout(350);
  assert(still && still === await readPixels(), 'reduced motion shows a static fire');
  await qa.emulateMedia({reducedMotion:'no-preference'});
  await qa.clock.setFixedTime(new Date('2026-11-19T14:00:00Z'));
  await edge.getByText('Прострочено', {exact:true}).waitFor();
  assert(!await canvas.isVisible(), 'overdue keeps status without continuous fire');
  await qa.clock.setFixedTime(new Date('2026-11-19T13:45:00Z'));
  await qa.goto(url + '#plan');
  await qa.locator('.focus-deadline .deadline-fire:visible').waitFor();
  assert(await qa.locator(`canvas[data-deadline="${due}"]:visible`).count() === 1, 'overview shows one active fire for one deadline');
  await qa.locator('.remaining-tasks summary').click();
  assert(await qa.locator(`canvas[data-deadline="${due}"]:visible`).count() === 1, 'expanding the plan does not repeat the animation');
  await qa.goto(url + '#courses');
  await subject.click();
  await qa.getByRole('heading', {name:'Лінійна алгебра',level:1,exact:true}).waitFor();
  assert(await qa.getByRole('heading', {name:'Матеріали предмета',exact:true}).count() === 0, 'course has no standalone materials section');
  await qa.getByRole('button',{name:'Почати заняття',exact:true}).click();
  await qa.getByRole('button',{name:'Показати відповідь',exact:true}).waitFor();
  await qa.keyboard.press('Escape');
  await qa.getByRole('button',{name:'Старт',exact:true}).click();
  await qa.getByRole('button',{name:'Пауза',exact:true}).click();
  await qa.getByRole('button',{name:'Скинути таймер',exact:true}).click();
  assert(await qa.locator('.next-session .paper-tape').evaluate(el => el.offsetParent === el.parentElement), 'tape stays attached to the card');
  await qa.screenshot({path:'output/playwright/paper-course-critical.png'});
  await qa.goto(url + '#materials');
  await qa.waitForFunction(() => location.hash === '#courses');
  await qa.getByRole('link',{ name:'Календар',exact:true}).first().click();
  await qa.getByRole('button',{name:/Події з LMS/}).click();
  await qa.getByRole('button',{name:/Додати в календар: Практичне заняття/}).click();
  await qa.getByRole('button',{name:'Закрити події LMS',exact:true}).click();
  await qa.locator('.calendar-grid [data-calendar-date="2026-11-19"]').click();
  await qa.locator('.calendar-agenda-event[data-heat-stage="approaching"]').waitFor();
  await qa.locator('.calendar-agenda-event').click();
  await qa.getByRole('dialog',{name:'Практичне заняття'}).waitFor();
  await qa.keyboard.press('Escape');
  await qa.goto(url + '#course/algebra');
  for (const kind of ['cards','example','quiz']) {
    const check = qa.locator(`[data-dash-complete="algebra:${kind}"]`);
    if (!await check.isVisible()) await qa.locator('.remaining-tasks summary').click();
    await check.click();
  }
  await qa.getByRole('heading',{name:'План виконано',exact:true}).waitFor();
  assert(await qa.locator('canvas.deadline-fire').count() === 0, 'completed course has no fire');
  await qa.goto(url + '#courses');
  assert(await qa.locator('.subject-lilac canvas').count() === 0, 'completed subject paper stays cool');
  assert((await qa.locator('.subject-card').last().getAttribute('href')) === '#course/algebra', 'completed deadlines move after active ones');
  await qa.setViewportSize({width:390,height:844});
  await qa.screenshot({path:'output/playwright/paper-deadlines-mobile.png'});
  assert(await qa.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'subject grid fits mobile');
  await qa.goto(url + '#plan');
  await qa.screenshot({path:'output/playwright/workspace-review-mobile.png',fullPage:true});
  await qa.setViewportSize({width:1440,height:900});
  await qa.screenshot({path:'output/playwright/workspace-review-desktop.png',fullPage:true});
  assert(!errors.length, errors.join('\n'));
  await context.close();
  return 'PASS — continuous warmth, flame growth and pixels, static reduced motion, completion, no duplicate fire, navigation and mobile layout';
}
