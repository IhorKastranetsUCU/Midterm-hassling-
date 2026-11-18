(() => {
  const demo = document.querySelector("#example");
  const play = demo.querySelector("[data-demo-play]");
  const playIcon = demo.querySelector("[data-play-icon]");
  const playLabel = demo.querySelector("[data-play-label]");
  const status = demo.querySelector("[data-demo-status]");
  const scenes = demo.querySelectorAll("[data-scene]");
  const steps = demo.querySelectorAll("[data-step]");
  const tabs = demo.querySelector(".demo-tabs");
  const views = tabs.querySelectorAll("[data-view]");
  const panels = demo.querySelectorAll("[data-panel]");
  const cardToggle = demo.querySelector("[data-card-toggle]");
  const cardAnswer = demo.querySelector("#demo-card-answer");
  const choices = demo.querySelectorAll("[data-choice]");
  const feedback = demo.querySelector("[data-feedback]");
  let phaseTimer;

  function showPhase(phase, announcement) {
    for (const scene of scenes) scene.hidden = scene.dataset.scene !== phase;
    for (const step of steps) {
      if (step.dataset.step === phase) {
        step.setAttribute("aria-current", "step");
      } else {
        step.removeAttribute("aria-current");
      }
    }
    status.textContent = announcement;
  }

  function showView(view) {
    for (const control of views) {
      control.setAttribute("aria-pressed", String(control.dataset.view === view));
    }
    for (const panel of panels) panel.hidden = panel.dataset.panel !== view;
  }

  function finishDemo() {
    window.clearTimeout(phaseTimer);
    phaseTimer = undefined;
    showView("plan");
    showPhase("ready", "План, картка й мініквіз готові.");
    playIcon.textContent = "▶";
    playLabel.textContent = "Відтворити демо";
  }

  play.addEventListener("click", () => {
    if (phaseTimer !== undefined) {
      finishDemo();
      return;
    }
    playIcon.textContent = "■";
    playLabel.textContent = "Зупинити демо";
    showPhase("lms", "Підключення LMS.");
    phaseTimer = window.setTimeout(() => {
      showPhase("analysis", "ШІ аналізує матеріали.");
      phaseTimer = window.setTimeout(finishDemo, 1500);
    }, 1400);
  });

  for (const view of views) {
    view.addEventListener("click", () => showView(view.dataset.view));
  }

  cardToggle.addEventListener("click", () => {
    const reveal = cardAnswer.hidden;
    cardAnswer.hidden = !reveal;
    cardToggle.setAttribute("aria-expanded", String(reveal));
    cardToggle.textContent = reveal ? "Сховати відповідь" : "Показати відповідь";
  });

  for (const choice of choices) {
    choice.addEventListener("click", () => {
      for (const option of choices) {
        option.setAttribute("aria-pressed", String(option === choice));
      }
      feedback.textContent = choice.hasAttribute("data-correct")
        ? "Правильно. Є три парні грані — 2, 4 і 6. Лише одна з них — шістка."
        : "Спробуй ще раз. Враховуй лише парні грані.";
    });
  }

  tabs.hidden = false;
  play.hidden = false;
})();
