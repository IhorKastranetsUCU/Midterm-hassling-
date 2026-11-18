/* Live Oral Defense Studio: AI voice question with synced dynamic text, mic voice answer, and lecture-grounded evaluation. */
(() => {
  const { escape: esc } = UI;
  const dialog = document.querySelector('#study-dialog');
  const body = document.querySelector('#dialog-body');
  if (!dialog || !body) return;

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;

  let session = null;

  function createEmptyState(opts) {
    return {
      courseId: Number(opts.courseId),
      topicIndex: Number(opts.topicIndex || 1),
      nodeId: opts.nodeId || '',
      topicTitle: opts.topicTitle || `Тема ${opts.topicIndex || 1}`,
      difficulty: 'standard',
      phase: 'loading_question', // loading_question | question_ready | recording | evaluating | feedback | needs_key | error
      avatarState: 'thinking', // thinking | speaking | listening
      muted: false,
      question: null,
      words: [],
      spokenIndex: -1,
      isSpeaking: false,
      previousQuestions: [],
      questionNumber: 0,
      liveTranscript: '',
      finalTranscript: '',
      elapsedSec: 0,
      feedback: null,
      errorMessage: '',
      micNotice: '',
      showTextFallback: false,
      // Runtime media handles
      utterance: null,
      revealTimer: null,
      lastBoundaryAt: 0,
      recorder: null,
      mediaStream: null,
      audioCtx: null,
      rafId: null,
      recTimer: null,
      recognition: null,
      audioChunks: [],
      aborted: false,
    };
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(path, { credentials: 'same-origin', ...options });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const err = new Error(
        typeof data?.detail === 'string'
          ? data.detail
          : response.status === 401
          ? 'Сесія завершилася. Увійди ще раз.'
          : 'Не вдалося виконати запит. Спробуй ще раз.'
      );
      err.status = response.status;
      throw err;
    }
    return data;
  }

  function stopTTS(state = session) {
    if (!state) return;
    if (state.revealTimer) {
      clearInterval(state.revealTimer);
      state.revealTimer = null;
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    state.utterance = null;
    state.isSpeaking = false;
  }

  function stopMic(state = session) {
    if (!state) return;
    if (state.recTimer) {
      clearInterval(state.recTimer);
      state.recTimer = null;
    }
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    if (state.recognition) {
      try { state.recognition.onresult = null; state.recognition.onerror = null; state.recognition.onend = null; state.recognition.stop(); } catch {}
      state.recognition = null;
    }
    if (state.audioCtx) {
      try { state.audioCtx.close(); } catch {}
      state.audioCtx = null;
    }
    if (state.mediaStream) {
      try { state.mediaStream.getTracks().forEach(t => t.stop()); } catch {}
      state.mediaStream = null;
    }
  }

  function cleanupSession() {
    if (!session) return;
    session.aborted = true;
    stopTTS(session);
    if (session.recorder && session.recorder.state !== 'inactive') {
      try { session.recorder.onstop = null; session.recorder.stop(); } catch {}
    }
    stopMic(session);
    dialog.classList.remove('oral-defense-modal');
    session = null;
  }

  dialog.addEventListener('close', cleanupSession);

  function tokenizeWords(text) {
    const tokens = [];
    const regex = /\S+/g;
    let match;
    while ((match = regex.exec(text || '')) !== null) {
      tokens.push({ word: match[0], start: match.index, end: match.index + match[0].length });
    }
    return tokens;
  }

  function speakableText(text) {
    return String(text || '')
      .replace(/[*_`#$]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function pickVoice(lang) {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    const prefix = (lang || 'uk-UA').slice(0, 2).toLowerCase();
    return (
      voices.find(v => v.lang && v.lang.toLowerCase().startsWith(prefix) && /google|lesya|natural|premium/i.test(v.name)) ||
      voices.find(v => v.lang && v.lang.toLowerCase().startsWith(prefix)) ||
      null
    );
  }

  function updateWordHighlights(state) {
    if (session !== state) return;
    const wordEls = body.querySelectorAll('[data-od-word]');
    wordEls.forEach((el, idx) => {
      el.classList.toggle('is-spoken', idx <= state.spokenIndex);
      el.classList.toggle('is-current', state.isSpeaking && idx === state.spokenIndex);
    });
  }

  function finishWordReveal(state) {
    if (session !== state) return;
    state.isSpeaking = false;
    state.spokenIndex = state.words.length - 1;
    state.avatarState = state.phase === 'recording' ? 'listening' : 'listening';
    if (state.revealTimer) {
      clearInterval(state.revealTimer);
      state.revealTimer = null;
    }
    updateWordHighlights(state);
    const ring = body.querySelector('.od-avatar-ring');
    const pill = body.querySelector('.od-state-pill');
    const stopBtn = body.querySelector('[data-od-stop-voice]');
    if (ring) {
      ring.classList.remove('is-speaking', 'is-thinking');
      ring.classList.add('is-listening');
    }
    if (pill) pill.textContent = 'Твоя черга: відповідай';
    if (stopBtn) stopBtn.hidden = true;
  }

  function speakQuestion(state) {
    if (!state || !state.question || state.aborted) return;
    stopTTS(state);

    const text = state.question.question_text || '';
    state.words = tokenizeWords(text);
    state.spokenIndex = state.muted ? state.words.length - 1 : 0;

    if (state.muted || !window.speechSynthesis) {
      // If muted or TTS unsupported, gracefully stream words quickly via timer
      if (!state.muted && state.words.length) {
        state.isSpeaking = true;
        state.avatarState = 'speaking';
        render();
        let idx = 0;
        state.revealTimer = setInterval(() => {
          if (session !== state || state.aborted) return clearInterval(state.revealTimer);
          idx++;
          state.spokenIndex = idx;
          updateWordHighlights(state);
          if (idx >= state.words.length - 1) finishWordReveal(state);
        }, 170);
      } else {
        state.isSpeaking = false;
        state.avatarState = 'listening';
        render();
      }
      return;
    }

    state.isSpeaking = true;
    state.avatarState = 'speaking';
    state.lastBoundaryAt = 0;
    render();

    const clean = speakableText(text);
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = state.question.language || 'uk-UA';
    utt.rate = 0.98;
    const voice = pickVoice(utt.lang);
    if (voice) utt.voice = voice;

    utt.onboundary = (event) => {
      if (session !== state || state.aborted) return;
      if (typeof event.charIndex === 'number') {
        state.lastBoundaryAt = Date.now();
        let found = state.spokenIndex;
        for (let i = 0; i < state.words.length; i++) {
          if (event.charIndex >= state.words[i].start) found = i;
        }
        if (found > state.spokenIndex) {
          state.spokenIndex = found;
          updateWordHighlights(state);
        }
      }
    };

    // Monotonic progressive fallback in case system voice skips onboundary events
    state.revealTimer = setInterval(() => {
      if (session !== state || !state.isSpeaking || state.aborted) {
        clearInterval(state.revealTimer);
        state.revealTimer = null;
        return;
      }
      if (Date.now() - state.lastBoundaryAt > 360 && state.spokenIndex < state.words.length - 1) {
        state.spokenIndex++;
        updateWordHighlights(state);
      }
    }, 220);

    utt.onend = () => finishWordReveal(state);
    utt.onerror = () => finishWordReveal(state);

    state.utterance = utt;
    try {
      window.speechSynthesis.speak(utt);
    } catch {
      finishWordReveal(state);
    }
  }

  async function fetchQuestion(state) {
    if (!state || state.aborted) return;
    stopTTS(state);
    stopMic(state);
    state.phase = 'loading_question';
    state.avatarState = 'thinking';
    state.question = null;
    state.feedback = null;
    state.errorMessage = '';
    state.liveTranscript = '';
    state.finalTranscript = '';
    state.micNotice = '';
    render();

    try {
      const data = await apiRequest(
        `/api/workspace/courses/${encodeURIComponent(state.courseId)}/topics/${encodeURIComponent(state.topicIndex)}/oral-defense/question`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node_id: state.nodeId || null,
            previous_questions: state.previousQuestions,
            difficulty: state.difficulty,
          }),
        }
      );
      if (session !== state || state.aborted) return;
      state.question = data;
      state.questionNumber += 1;
      if (data.question_text) state.previousQuestions.push(data.question_text);
      state.phase = 'question_ready';
      speakQuestion(state);
    } catch (err) {
      if (session !== state || state.aborted) return;
      if (err.status === 424) {
        state.phase = 'needs_key';
      } else {
        state.phase = 'error';
      }
      state.avatarState = 'thinking';
      state.errorMessage = err.message || 'Не вдалося згенерувати питання.';
      render();
    }
  }

  function chooseRecorderMime() {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
    return candidates.find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
  }

  function startAudioVisualizer(state, stream) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      state.audioCtx = ctx;
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (session !== state || state.phase !== 'recording' || state.aborted) return;
        analyser.getByteFrequencyData(data);
        const bars = body.querySelectorAll('.od-meter-bars span');
        bars.forEach((bar, i) => {
          const val = data[i * 2] || 0;
          const h = Math.max(4, Math.min(24, Math.round((val / 255) * 24)));
          bar.style.height = `${h}px`;
        });
        state.rafId = requestAnimationFrame(tick);
      };
      state.rafId = requestAnimationFrame(tick);
    } catch {}
  }

  function startLiveCaptioning(state) {
    if (!SpeechRec) return;
    try {
      const rec = new SpeechRec();
      rec.lang = state.question?.language || 'uk-UA';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event) => {
        if (session !== state || state.phase !== 'recording') return;
        let finalStr = '';
        let interimStr = '';
        for (let i = 0; i < event.results.length; i++) {
          const piece = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) finalStr += piece + ' ';
          else interimStr += piece;
        }
        state.finalTranscript = finalStr.trim();
        state.liveTranscript = (finalStr + interimStr).trim();
        const box = body.querySelector('[data-od-live-transcript]');
        if (box) box.textContent = state.liveTranscript || 'Говори впевнено — слухаю твою відповідь…';
      };
      rec.onerror = () => {};
      rec.start();
      state.recognition = rec;
    } catch {}
  }

  async function startRecording(state) {
    if (!state || state.phase === 'recording' || state.phase === 'evaluating') return;
    stopTTS(state);
    state.spokenIndex = state.words.length - 1;
    state.micNotice = '';
    state.liveTranscript = '';
    state.finalTranscript = '';
    state.audioChunks = [];
    state.elapsedSec = 0;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      state.micNotice = 'Цей браузер не підтримує запис мікрофона. Скористайся текстовим полем нижче.';
      state.showTextFallback = true;
      render();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (session !== state || state.aborted) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      state.mediaStream = stream;
      const mime = chooseRecorderMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      state.recorder = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) state.audioChunks.push(e.data);
      };

      recorder.onstop = async () => {
        const chunks = state.audioChunks.slice();
        const blobMime = recorder.mimeType || mime || 'audio/webm';
        stopMic(state);
        if (session !== state || state.aborted) return;
        const blob = new Blob(chunks, { type: blobMime });
        await submitEvaluation(state, blob, state.liveTranscript || state.finalTranscript);
      };

      recorder.start(250);
      state.phase = 'recording';
      state.avatarState = 'listening';
      render();

      startAudioVisualizer(state, stream);
      startLiveCaptioning(state);

      state.recTimer = setInterval(() => {
        if (session !== state || state.phase !== 'recording') return clearInterval(state.recTimer);
        state.elapsedSec += 1;
        const timerEl = body.querySelector('[data-od-timer]');
        if (timerEl) timerEl.textContent = formatTime(state.elapsedSec);
        if (state.elapsedSec >= 180) {
          finishRecording(state);
        }
      }, 1000);
    } catch {
      stopMic(state);
      state.micNotice = 'Не вдалося увімкнути мікрофон (перевір дозвіл у браузері). Можеш відповісти текстом нижче.';
      state.showTextFallback = true;
      render();
    }
  }

  function finishRecording(state) {
    if (!state || state.phase !== 'recording') return;
    if (state.recorder && state.recorder.state !== 'inactive') {
      state.phase = 'evaluating';
      state.avatarState = 'thinking';
      render();
      state.recorder.stop();
    } else {
      stopMic(state);
    }
  }

  async function submitEvaluation(state, audioBlob, transcriptText) {
    if (!state || state.aborted || !state.question) return;
    state.phase = 'evaluating';
    state.avatarState = 'thinking';
    state.errorMessage = '';
    render();

    const formData = new FormData();
    formData.append('question_id', state.question.question_id);
    if (transcriptText && transcriptText.trim()) {
      formData.append('transcript', transcriptText.trim());
    }
    if (audioBlob && audioBlob.size >= 250) {
      const ext = (audioBlob.type || '').includes('mp4') ? 'm4a' : (audioBlob.type || '').includes('ogg') ? 'ogg' : 'webm';
      formData.append('audio', audioBlob, `answer.${ext}`);
    }

    try {
      const result = await apiRequest(
        `/api/workspace/courses/${encodeURIComponent(state.courseId)}/topics/${encodeURIComponent(state.topicIndex)}/oral-defense/evaluate`,
        { method: 'POST', body: formData }
      );
      if (session !== state || state.aborted) return;
      state.feedback = result;
      state.phase = 'feedback';
      state.avatarState = 'listening';
      render();
    } catch (err) {
      if (session !== state || state.aborted) return;
      if (err.status === 424) {
        state.phase = 'needs_key';
      } else {
        state.phase = 'question_ready';
        state.micNotice = err.message || 'Помилка перевірки відповіді.';
      }
      state.avatarState = 'listening';
      render();
    }
  }

  function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function avatarLabel(state) {
    if (state.phase === 'loading_question') return 'Формулюю питання…';
    if (state.phase === 'evaluating') return 'Аналізую відповідь…';
    if (state.isSpeaking) return 'Озвучую питання…';
    if (state.phase === 'recording') return 'Уважно слухаю…';
    if (state.phase === 'feedback') return 'Розбір готовий';
    if (state.phase === 'needs_key') return 'Потрібен Gemini API';
    return 'Твоя черга: відповідай';
  }

  function avatarSvg() {
    return `
      <svg class="od-avatar-svg" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="#F3E8FF" stroke="#7C3AED" stroke-width="2"/>
        <circle cx="32" cy="26" r="10" fill="#4C1D95" opacity=".12"/>
        <circle cx="24" cy="25" r="2.6" fill="#3B2238"/>
        <circle cx="40" cy="25" r="2.6" fill="#3B2238"/>
        <path class="od-avatar-mouth" d="M24 36c2.5 3 13.5 3 16 0" stroke="#3B2238" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M16 18c4-5 10-8 16-8s12 3 16 8" stroke="#6D28D9" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
    `;
  }

  function micIconSvg() {
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8"/></svg>`;
  }

  function renderFeedback(fb) {
    const wrongHtml = fb.what_was_wrong?.length
      ? `<ul>${fb.what_was_wrong.map(item => `<li><strong>Неточність:</strong> ${esc(item.said)}${item.correction ? `<br><span>→ <strong>Правильно:</strong> ${esc(item.correction)}</span>` : ''}</li>`).join('')}</ul>`
      : `<p style="margin:0;">Грубих фактичних помилок у відповіді не виявлено.</p>`;

    const missedHtml = fb.what_was_missed?.length
      ? `<ul>${fb.what_was_missed.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`
      : `<p style="margin:0;">Ти згадав усі ключові моменти цього питання.</p>`;

    const correctHtml = fb.what_was_correct?.length
      ? `<div class="od-card od-correct"><h3>✅ Що сказано правильно</h3><ul>${fb.what_was_correct.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`
      : '';

    return `
      <section class="od-feedback" aria-live="polite">
        <div class="od-verdict-row">
          <span class="od-verdict-badge is-${esc(fb.verdict)}">${esc(fb.verdict_label)}</span>
        </div>

        ${fb.user_transcript ? `
          <div class="od-heard-box">
            <strong>🎙️ Твоя озвучена відповідь</strong>
            ${esc(fb.user_transcript)}
          </div>
        ` : ''}

        <div class="od-card od-summary">
          <h3>💬 Коментар викладача</h3>
          <div>${UI.markdown(fb.detailed_feedback || 'Аналіз завершено.')}</div>
        </div>

        <div class="od-card od-wrong">
          <h3>❌ Що було сказано неправильно</h3>
          ${wrongHtml}
        </div>

        <div class="od-card od-missed">
          <h3>⚠️ Що було пропущено</h3>
          ${missedHtml}
        </div>

        ${correctHtml}

        ${fb.ideal_answer ? `
          <div class="od-ideal">
            <details>
              <summary>📖 Еталонна відповідь за лекцією</summary>
              <div style="margin-top:.55rem;">${UI.markdown(fb.ideal_answer)}</div>
            </details>
          </div>
        ` : ''}

        <div class="od-footer-actions">
          <button type="button" class="secondary" data-od-retry-same>🔁 Спробувати це питання ще раз</button>
          <button type="button" class="primary" data-od-next-question>🎤 Наступне питання →</button>
        </div>
      </section>
    `;
  }

  function render() {
    const state = session;
    if (!state) return;

    const ringClass =
      state.isSpeaking ? 'is-speaking'
      : state.phase === 'recording' ? 'is-listening'
      : (state.phase === 'loading_question' || state.phase === 'evaluating') ? 'is-thinking'
      : 'is-listening';

    let bodyContent = '';

    if (state.phase === 'needs_key') {
      bodyContent = `
        <div class="od-key-inline">
          <p style="margin:0; font-weight:600; color:#3b2238;">${esc(state.errorMessage || 'Підключи особистий Gemini API key для живого усного захисту.')}</p>
          <form class="learning-key-form" data-od-key-form>
            <label>Gemini API key
              <input name="gemini_key" type="password" required autocomplete="off" spellcheck="false" placeholder="Встав свій API key">
            </label>
            <button type="submit" class="primary">Підключити та почати →</button>
            <p class="field-error" role="alert" data-od-key-error></p>
          </form>
        </div>
      `;
    } else if (state.phase === 'error') {
      bodyContent = `
        <div class="od-error-box" role="alert">
          <div>${esc(state.errorMessage)}</div>
          <div><button type="button" class="primary" data-od-next-question>Спробувати ще раз ↻</button></div>
        </div>
      `;
    } else {
      const q = state.question;
      const wordsHtml = state.words.length
        ? state.words.map((w, idx) => {
            const cls = [
              'od-word',
              idx <= state.spokenIndex ? 'is-spoken' : '',
              state.isSpeaking && idx === state.spokenIndex ? 'is-current' : '',
            ].filter(Boolean).join(' ');
            return `<span class="${cls}" data-od-word="${idx}">${esc(w.word)}</span>`;
          }).join(' ')
        : `<span class="muted">Готуємо запитання з матеріалів лекції…</span>`;

      bodyContent = `
        <div class="od-stage">
          <div class="od-avatar-wrap">
            <div class="od-avatar-ring ${ringClass}">
              ${avatarSvg()}
            </div>
            <div class="od-voice-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
            <span class="od-state-pill">${esc(avatarLabel(state))}</span>
          </div>

          <div class="od-question-col">
            <div class="od-question-meta">
              <span>${state.questionNumber ? `Питання #${state.questionNumber}` : 'Підготовка'}</span>
              ${q?.source_hint ? `<span>📚 ${esc(q.source_hint)}</span>` : ''}
            </div>

            <div class="od-question-bubble" aria-live="polite">
              ${wordsHtml}
            </div>

            ${q ? `
              <div class="od-question-toolbar">
                <button type="button" class="od-mini-btn" data-od-replay ${state.phase === 'recording' || state.phase === 'evaluating' ? 'disabled' : ''}>
                  🔊 Озвучити ще раз
                </button>
                <button type="button" class="od-mini-btn" data-od-stop-voice ${state.isSpeaking ? '' : 'hidden'}>
                  ⏹ Зупинити голос
                </button>
                <button type="button" class="od-mini-btn" data-od-toggle-mute>
                  ${state.muted ? '🔇 Без звуку' : '🔈 Звук увімкнено'}
                </button>
                <button type="button" class="od-mini-btn" data-od-next-question ${state.phase === 'recording' || state.phase === 'evaluating' ? 'disabled' : ''}>
                  ↻ Інше питання
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      if (q && (state.phase === 'question_ready' || state.phase === 'recording' || state.phase === 'evaluating')) {
        const isRec = state.phase === 'recording';
        const isEval = state.phase === 'evaluating';
        bodyContent += `
          <div class="od-answer-stage">
            <div class="od-mic-row">
              <button type="button" class="od-mic-btn ${isRec ? 'is-recording' : ''}" data-od-mic ${isEval ? 'disabled' : ''}>
                ${micIconSvg()}
                <span>${isEval ? '⏳ Аналізую твою відповідь…' : isRec ? '⏹ Зупинити запис і надіслати' : '🎙️ Натисни та відповідай голосом'}</span>
              </button>
              ${isRec ? `<span class="od-timer" data-od-timer>${formatTime(state.elapsedSec)}</span>` : ''}
            </div>

            ${isRec ? `
              <div class="od-meter-bars" aria-hidden="true">
                ${Array.from({ length: 16 }, () => '<span></span>').join('')}
              </div>
              <div class="od-live-transcript" data-od-live-transcript>
                ${esc(state.liveTranscript || 'Говори впевнено — слухаю твою відповідь…')}
              </div>
            ` : ''}

            ${state.micNotice ? `<p class="field-error" role="alert" style="margin:0;">${esc(state.micNotice)}</p>` : ''}

            <div class="od-text-fallback">
              <details ${state.showTextFallback ? 'open' : ''}>
                <summary>⌨️ Або відповісти текстом (якщо мікрофон недоступний)</summary>
                <form class="od-text-fallback-form" data-od-text-form>
                  <textarea name="text_answer" placeholder="Напиши свою відповідь на питання…" ${isEval ? 'disabled' : ''}></textarea>
                  <div><button type="submit" class="secondary" ${isEval ? 'disabled' : ''}>Надіслати на перевірку →</button></div>
                </form>
              </details>
            </div>
          </div>
        `;
      }

      if (state.phase === 'feedback' && state.feedback) {
        bodyContent += renderFeedback(state.feedback);
      }
    }

    body.innerHTML = `
      <div class="od-shell">
        <header class="od-header">
          <div>
            <span class="od-badge">🎙️ Усний захист · Oral Defense</span>
            <h2 id="dialog-title">${esc(state.topicTitle)}</h2>
          </div>
          <div class="od-controls-top">
            <div class="od-difficulty" role="group" aria-label="Рівень питань">
              <button type="button" data-od-diff="standard" aria-pressed="${state.difficulty === 'standard'}">Базовий</button>
              <button type="button" data-od-diff="deep" aria-pressed="${state.difficulty === 'deep'}">Поглиблений</button>
            </div>
          </div>
        </header>
        ${bodyContent}
      </div>
    `;
  }

  function open(opts) {
    cleanupSession();
    session = createEmptyState(opts);
    dialog.classList.add('oral-defense-modal');
    render();
    if (!dialog.open) dialog.showModal();
    fetchQuestion(session);
  }

  // Handle clicks inside dialog
  body.addEventListener('click', (event) => {
    const state = session;
    if (!state) return;

    const diffBtn = event.target.closest('[data-od-diff]');
    if (diffBtn) {
      const next = diffBtn.dataset.odDiff;
      if (next !== state.difficulty) {
        state.difficulty = next;
        fetchQuestion(state);
      }
      return;
    }

    if (event.target.closest('[data-od-replay]')) {
      state.muted = false;
      speakQuestion(state);
      return;
    }

    if (event.target.closest('[data-od-stop-voice]')) {
      stopTTS(state);
      finishWordReveal(state);
      return;
    }

    if (event.target.closest('[data-od-toggle-mute]')) {
      state.muted = !state.muted;
      if (state.muted) {
        stopTTS(state);
        state.spokenIndex = state.words.length - 1;
        state.avatarState = 'listening';
      }
      render();
      return;
    }

    if (event.target.closest('[data-od-mic]')) {
      if (state.phase === 'recording') finishRecording(state);
      else startRecording(state);
      return;
    }

    if (event.target.closest('[data-od-next-question]')) {
      fetchQuestion(state);
      return;
    }

    if (event.target.closest('[data-od-retry-same]')) {
      state.phase = 'question_ready';
      state.feedback = null;
      state.micNotice = '';
      speakQuestion(state);
    }
  });

  body.addEventListener('submit', async (event) => {
    const state = session;
    if (!state) return;

    if (event.target.matches('[data-od-text-form]')) {
      event.preventDefault();
      const val = event.target.elements.text_answer?.value?.trim();
      if (!val) return;
      await submitEvaluation(state, null, val);
      return;
    }

    if (event.target.matches('[data-od-key-form]')) {
      event.preventDefault();
      const form = event.target;
      const input = form.elements.gemini_key;
      const btn = form.querySelector('[type="submit"]');
      const errEl = form.querySelector('[data-od-key-error]');
      const key = input?.value?.trim();
      if (!key || btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Перевіряємо…';
      if (errEl) errEl.textContent = '';
      try {
        await apiRequest('/api/workspace/learning/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: key }),
        });
        input.value = '';
        UI.toast('Gemini підключено');
        fetchQuestion(state);
      } catch (err) {
        if (errEl) errEl.textContent = err.message;
        btn.disabled = false;
        btn.textContent = 'Підключити та почати →';
      }
    }
  });

  // Global delegation for [data-oral-defense] triggers anywhere in workspace
  document.querySelector('#workspace-main')?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-oral-defense]');
    if (!btn) return;
    event.preventDefault();
    open({
      courseId: btn.dataset.courseId || UI.route().courseId,
      topicIndex: btn.dataset.topicIndex || 1,
      nodeId: btn.dataset.nodeId || '',
      topicTitle: btn.dataset.topicTitle || 'Усний захист',
    });
  });

  window.HustleOralDefense = { open };
})();
