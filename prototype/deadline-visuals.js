(() => {
  const { deadlineHeat, deadlineWarmth, deadlineRemaining, urgency } = window.HustleStudy;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const surfaces = new Map();
  let countdowns = [];
  let frame = 0;
  let lastFrame = 0;

  function edge(due, done, showFire = true) {
    if (done || !Number.isFinite(due)) return '';
    if (!showFire) return `<span data-deadline="${due}" hidden></span>`;
    return `<canvas class="deadline-fire" data-deadline="${due}" width="1" height="1" aria-hidden="true" hidden></canvas>`;
  }

  function schedule() {
    if (!frame && !reduceMotion.matches && !document.hidden &&
        [...surfaces.values()].some(surface => surface.visible && surface.heat)) {
      frame = requestAnimationFrame(animate);
    }
  }

  const intersection = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      const surface = surfaces.get(target);
      if (surface) surface.visible = isIntersecting;
    }
    schedule();
  });

  const resize = new ResizeObserver(entries => {
    for (const { target } of entries) {
      const surface = surfaces.get(target);
      if (surface?.heat) {
        size(surface);
        if (reduceMotion.matches) paint(surface, 0);
      }
    }
    schedule();
  });

  function mount(container) {
    intersection.disconnect();
    resize.disconnect();
    surfaces.clear();
    countdowns = [...(container?.querySelectorAll('[data-deadline-countdown]') || [])];
    container?.querySelectorAll('[data-deadline]').forEach(marker => {
      const card = marker.parentElement;
      const context = marker.matches('canvas') ? marker.getContext('2d') : null;
      const canvas = context ? marker : null;
      surfaces.set(card, {
        canvas,
        card,
        context,
        cover: card.closest('.subject-card, .focus-note'),
        due: Number(marker.dataset.deadline),
        heat: 0,
        warmth: 0,
        phase: 0,
        visible: false,
      });
      if (canvas) {
        intersection.observe(card);
        resize.observe(card);
      }
    });
    syncHeat();
  }

  function syncHeat() {
    const now = Date.now();
    for (const label of countdowns) {
      const due = Number(label.dataset.deadlineCountdown);
      const remaining = deadlineRemaining(due, now);
      if (label.textContent !== remaining) label.textContent = remaining;
      if (label.hidden === Boolean(remaining)) label.hidden = !remaining;
      const status = urgency(due, false, now);
      label.parentElement.classList.toggle('upcoming', status === 'upcoming');
      label.parentElement.classList.toggle('urgent', status === 'urgent');
      label.parentElement.classList.toggle('overdue', status === 'overdue');
    }
    for (const surface of surfaces.values()) {
      const { card, canvas, due, cover } = surface;
      const heat = deadlineHeat(due, false, now);
      const warmth = deadlineWarmth(due, false, now);
      const stage = due <= now ? 'overdue' : warmth ? 'approaching' : 'cool';
      if (card.dataset.heatStage !== stage) card.dataset.heatStage = stage;
      if (heat === surface.heat && warmth === surface.warmth) continue;
      for (const paper of cover ? [card, cover] : [card]) {
        paper.style.setProperty('--deadline-warmth', warmth.toFixed(6));
        paper.style.setProperty('--deadline-heat', heat.toFixed(6));
      }
      surface.heat = heat;
      surface.warmth = warmth;
      if (!canvas) continue;
      if (canvas.hidden === Boolean(heat)) canvas.hidden = !heat;
      if (heat && (reduceMotion.matches || !surface.visible)) paint(surface, 0);
    }
    schedule();
  }

  function animate(ms) {
    frame = 0;
    if (ms - lastFrame >= 1000 / 33) {
      const elapsed = Math.min((ms - lastFrame) / 1000, .07);
      for (const surface of surfaces.values()) {
        if (!surface.visible || !surface.heat) continue;
        surface.phase += elapsed * (.32 + 2.41 * surface.heat);
        paint(surface, surface.phase);
      }
      lastFrame = ms;
    }
    schedule();
  }

  function paint(surface, time) {
    const { canvas, context, heat } = surface;
    if (!surface.width || !canvas.width || canvas.width === 1) {
      size(surface);
    }
    const { width, height, ratio } = surface;
    if (!width || !height) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const rise = height * (.12 + heat * .87);
    const glow = context.createLinearGradient(0, height - rise, 0, height);
    glow.addColorStop(0, 'rgba(255, 170, 65, 0)');
    glow.addColorStop(.65, 'rgba(255, 135, 46, .10)');
    glow.addColorStop(1, 'rgba(250, 109, 34, .75)');
    context.fillStyle = glow;
    context.fillRect(0, height - rise, width, rise);
    const back = context.createLinearGradient(0, height - rise, 0, height);
    back.addColorStop(0, 'rgba(242, 103, 33, .2)');
    back.addColorStop(.46, 'rgba(230, 71, 25, .78)');
    back.addColorStop(.91, 'rgb(185, 43, 21)');
    back.addColorStop(1, 'rgb(109, 36, 21)');
    context.globalAlpha = 0.48 + heat * 0.48;
    drawFlames(context, width, height, rise, time, back, 0);
    const front = context.createLinearGradient(0, height - rise * .64, 0, height);
    front.addColorStop(0, 'rgba(255, 145, 55, .32)');
    front.addColorStop(.43, 'rgb(252, 130, 36)');
    front.addColorStop(.8, 'rgb(255, 205, 91)');
    front.addColorStop(.94, 'rgb(255, 231, 157)');
    front.addColorStop(1, 'rgb(221, 83, 29)');
    context.globalAlpha = 0.74 + heat * .23;
    drawFlames(context, width, height, rise * .66, time, front, .04);

    // A few sparks rise out of the fire once the deadline is close.
    for (let i = 0; i < Math.floor(heat * 9); i++) {
      const life = (time * (.18 + i % 3 * .045) + i * .287) % 1;
      const x = ((i * .618 + .14) % 1) * width + Math.sin(time + i) * 4 * life;
      const y = height - rise * (.18 + life * .79);
      context.globalAlpha = Math.sin(life * Math.PI) * (.18 + .53 * heat);
      context.fillStyle = i % 3 ? '#ec6530' : '#ffae3c';
      context.beginPath();
      context.ellipse(x, y, 0.65 + heat * .8, 0.7 + heat * 1.15, -.42, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function size(surface) {
    const { canvas } = surface;
    surface.width = canvas.clientWidth;
    surface.height = canvas.clientHeight;
    if (!surface.width || !surface.height) return;
    surface.ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(surface.width * surface.ratio);
    canvas.height = Math.round(surface.height * surface.ratio);
  }

  function drawFlames(ctx, width, height, rise, time, fill, offset) {
    const pitch = Math.max(24, Math.min(40, width / 9));
    const base = height + 2;
    const joint = index => (index + offset + .17 * Math.sin(index * 1.68 + offset)) * pitch;
    ctx.beginPath();
    ctx.moveTo(-pitch * 2, base);
    for (let i = -2; joint(i) < width + pitch; i++) {
      const x = joint(i);
      const span = joint(i + 1) - x;
      const phase = i * 2.38 + offset * 7;
      const sway = Math.sin(time * 1.32 + phase * 1.12);
      const pulse = Math.sin(time * 1.91 + phase) * .5 + Math.cos(time * 1.26 + phase * 1.7) * .5;
      const crest = rise * (.43 + .33 * pulse + (i % 3 === 0 ? .2 : 0));
      const tipX = x + span * (.47 + sway * .36);
      const tipY = base - crest;
      const valley = base - rise * (.065 + .035 * Math.abs(sway));
      const shoulder = base - crest * .36;
      ctx.lineTo(x, valley);
      // The hot base feeds each tongue; softer shoulders keep the edge continuous.
      ctx.bezierCurveTo(x + span * .18, valley, x + span * .18, shoulder, x + span * .38, shoulder - crest * .08);
      ctx.quadraticCurveTo(tipX + span * .08, tipY + crest * .22, tipX, tipY);
      ctx.bezierCurveTo(tipX + span * .3, tipY + crest * .25, x + span * .7, shoulder, x + span * .66, shoulder + crest * .06);
      ctx.bezierCurveTo(x + span * .71, valley - crest * .10, x + span * .86, valley, x + span, valley);
    }
    ctx.lineTo(width + pitch * 2, base);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      for (const surface of surfaces.values()) {
        if (surface.canvas && surface.heat) paint(surface, 0);
      }
    } else schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  setInterval(syncHeat, 1000);

  window.HustleDeadlineVisuals = { edge, mount };
})();
