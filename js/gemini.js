// ========================================================
// Gemini AI Integration for UCU Probability & Statistics
// Midterm 2 & Colloquium 2 Preparation
// Models: gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash
// ========================================================

class GeminiMentor {
  constructor() {
    this.apiKey = localStorage.getItem('stathustle_gemini_api_key') || '';
    const savedModel = localStorage.getItem('stathustle_gemini_model');
    // Default to the cutting-edge gemini-3.8-flash model
    this.selectedModel = savedModel || 'gemini-3.8-flash';
    this.history = [];
    this.isProcessing = false;
  }

  hasValidApiKey() {
    return Boolean(this.apiKey && this.apiKey.trim().length >= 5);
  }

  hasApiKey() {
    return this.hasValidApiKey();
  }

  setApiKey(key) {
    this.apiKey = key ? key.trim() : '';
    if (this.apiKey) {
      localStorage.setItem('stathustle_gemini_api_key', this.apiKey);
    } else {
      localStorage.removeItem('stathustle_gemini_api_key');
    }
    // Also mirror to user profile if active
    if (window.userProfile?.profile) {
      window.userProfile.profile.geminiApiKey = this.apiKey;
      window.userProfile.saveProfile();
    }
    this.updateKeyStatusUI();
  }

  setModel(model) {
    this.selectedModel = model.trim();
    localStorage.setItem('stathustle_gemini_model', this.selectedModel);
  }

  promptForApiKey(reason = "для роботи з нейромережею") {
    const modal = document.getElementById('gemini-settings-modal') || document.getElementById('gemini-key-modal');
    if (modal) {
      modal.classList.remove('hidden');
      const input = document.getElementById('settings-api-key-input') || document.getElementById('gemini-key-input');
      if (input) {
        input.value = this.apiKey || '';
        input.focus();
      }
      const feedback = document.getElementById('settings-test-status') || document.getElementById('gemini-key-test-feedback');
      if (feedback) {
        feedback.className = 'mt-2 text-xs text-amber-400 p-2 rounded bg-amber-950/60 border border-amber-800';
        feedback.textContent = `Потрібен Gemini API ключ ${reason}. Отримайте його безкоштовно в Google AI Studio (ai.google.dev).`;
        feedback.classList.remove('hidden');
      }
    }
  }

  updateKeyStatusUI() {
    const statusLabel = document.getElementById('gemini-key-status-label');
    if (statusLabel) {
      statusLabel.textContent = this.hasValidApiKey() ? 'API Key ✓' : 'Set API Key 🔑';
      statusLabel.className = this.hasValidApiKey() ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold';
    }
  }

  // Test connection to verify model and key
  async testConnection(candidateKey = null) {
    const keyToTest = candidateKey ? candidateKey.trim() : this.apiKey;
    if (!keyToTest || keyToTest.length < 5) {
      return { success: false, message: "Будь ласка, введіть дійсний Gemini API ключ." };
    }

    const modelsToTry = [
      this.selectedModel || 'gemini-3.8-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-2.5-flash',
      'gemini-flash-latest'
    ];
    const uniqueModels = [...new Set(modelsToTry)];

    for (const m of uniqueModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(keyToTest)}`;
        const body = {
          contents: [{ parts: [{ text: "Respond with: OK" }] }]
        };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-goog-api-key": keyToTest
          },
          body: JSON.stringify(body)
        });

        if (res.ok) {
          this.setApiKey(keyToTest);
          this.setModel(m);
          return { success: true, message: `Підключено успішно до Gemini API (${m})!` };
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status}`;
          const errStatus = errData.error?.status;

          // Check if Google returned 402 / RESOURCE_EXHAUSTED (credits depleted)
          if (res.status === 402 || errStatus === 'RESOURCE_EXHAUSTED' || errMsg.includes('credits are depleted')) {
            this.setApiKey(keyToTest);
            this.setModel(m);
            return { 
              success: true, 
              warning: true,
              message: `Ключ дійсний для моделі ${m}! Проте Google повідомляє: 'Your prepayment credits are depleted' (RESOURCE_EXHAUSTED). Поповніть кредити в Google AI Studio або використайте інший проект. Локальний тьютор активний.` 
            };
          }

          if (res.status === 400 || res.status === 403) {
            if (errMsg.includes('API key not valid')) {
              return { success: false, message: "Google API: Недійсний ключ. Перевірте, чи ви скопіювали ключ повністю з Google AI Studio." };
            }
            return { success: false, message: `Помилка Google API (${res.status}): ${errMsg}` };
          }
          // If 404 or other status, try next fallback model
        }
      } catch (e) {
        continue;
      }
    }
    return { success: false, message: "Не вдалося з'єднатися з Gemini API. Перевірте ключ та інтернет-з'єднання." };
  }

  // Generic call to Gemini API with model fallback
  async generateContent(prompt, systemInstruction = '', throwOnError = false) {
    if (!this.hasValidApiKey()) {
      this.promptForApiKey();
      return this.getLocalFallbackResponse(prompt, "Введіть власний Gemini API ключ у вікні налаштувань для отримання відповіді штучного інтелекту.");
    }

    const modelsToTry = [
      this.selectedModel || 'gemini-3.8-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-2.5-flash',
      'gemini-flash-latest'
    ];
    const uniqueModels = [...new Set(modelsToTry)];
    let lastError = null;

    for (const model of uniqueModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
      const body = {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        }
      };

      if (systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData.error?.message || `API error ${response.status}`;
          lastError = new Error(errMsg);

          if (response.status === 402 || errorData.error?.status === 'RESOURCE_EXHAUSTED' || errMsg.includes('credits are depleted')) {
            return this.getLocalFallbackResponse(
              prompt, 
              "Google AI Studio: Передплачені кредити для цього ключа вичерпано (RESOURCE_EXHAUSTED). Нижче надано розбір від вбудованої академічної бази знань УКУ."
            );
          }
          continue; // Try next fallback model
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        if (candidate?.content?.parts?.[0]?.text) {
          if (this.selectedModel !== model) {
            this.setModel(model);
          }
          return candidate.content.parts[0].text;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (throwOnError && lastError) throw lastError;

    console.warn("Gemini call failed with fallback, using local smart tutor:", lastError);
    return this.getLocalFallbackResponse(prompt, lastError?.message || '');
  }

  // Chat alias used by UI
  async chat(userMessage, context = '') {
    return await this.askMentor(userMessage, context);
  }

  // Interactive Chat / Concept Explainer
  async askMentor(userMessage, context = '') {
    const systemPrompt = `You are "Gemini P&S Mentor", a dedicated AI tutor helping a Ukrainian Catholic University (UCU) student prepare for Probability and Statistics Midterm 2 and Colloquium 2.
Your goal is to help them achieve 100% on their exams.
Always format mathematical formulas in LaTeX using single $ for inline ($X \\sim B(n, p)$) and double $$ for block equations.
Be mathematically rigorous, state required conditions (measurability, absolute integrability $\\sum |x|p(x) < \\infty$), highlight common exam traps, and offer practical advice. Reply in Ukrainian or English matching the student.`;

    let fullPrompt = userMessage;
    if (context) {
      fullPrompt = `[Context: ${context}]\n\nStudent question: ${userMessage}`;
    }

    return await this.generateContent(fullPrompt, systemPrompt);
  }

  // Colloquium Oral Exam Answer Evaluator
  async evaluateOralAnswer(questionTitle, studentAnswer, rubric) {
    if (!this.hasValidApiKey()) {
      this.promptForApiKey("для суворої перевірки усного екзамену");
    }

    const systemPrompt = `You are an expert, strict but encouraging professor of Probability and Statistics at the Ukrainian Catholic University (UCU), specializing in preparing students for Colloquium 2 and Midterm 2.
Evaluate the student's answer with extreme academic rigor:
1. Verify exact mathematical definitions (e.g. measurability $X: \\Omega \\to \\mathbb{R}$, sigma-algebra, countable support $S_X$, absolute integrability conditions $\\sum |x|p_X(x) < \\infty$ or $\\int |x|f_X(x)dx < \\infty$).
2. Check for common pitfalls and traps (e.g. CDF right-continuous vs left-continuous; uncorrelated vs independent; variance scale factor $a^2$; sum of uniform is triangular NOT uniform).
3. Grade on a 10-point scale: [Score: X/10].
4. Provide structured feedback:
   - What was done well
   - Missing mathematical conditions or nuances
   - The ideal model oral presentation with LaTeX formulas ($...$)
   - Impact on overall readiness.
Format your response using Markdown and LaTeX ($...$ and $$...$$). Reply in Ukrainian or English matching the student.`;

    const prompt = `QUESTION FOR COLLOQUIUM 2:
${questionTitle}

EXAMINER RUBRIC / EXPECTED CONTENT:
${rubric}

STUDENT'S SPOKEN OR WRITTEN ANSWER:
"""
${studentAnswer}
"""

Please grade this answer out of 10, point out missing conditions, and provide high-yield advice.`;

    return await this.generateContent(prompt, systemPrompt);
  }

  // Dynamic Question Generator
  async generateAdaptiveQuestion(topicName, weaknessArea) {
    const prompt = `Generate a challenging exam-style question for UCU Probability & Statistics Midterm 2 on the topic "${topicName}".
Focus on student weak area: "${weaknessArea || 'Properties & calculations'}".
The question should test deep understanding, not just rote memorization.
Include:
1. Question statement with LaTeX formulas ($...$).
2. 4 Multiple choice options (labeled A, B, C, D) with exactly one correct option.
3. State the correct answer.
4. Detailed step-by-step mathematical derivation and explanation.
5. Common exam trap to watch out for.`;

    return await this.generateContent(prompt);
  }

  // Smart Offline Fallback Evaluator
  simulateOralEvaluation(questionTitle, studentAnswer) {
    const answerLower = studentAnswer.toLowerCase();
    let score = 7;
    const strengths = [];
    const missing = [];

    if (answerLower.length < 50) {
      score = 4;
      missing.push("Відповідь занадто коротка. На Колоквіумі 2 викладачі очікують 3-4 хвилинну структуровану усну відповідь з доведенням.");
    } else {
      strengths.push("Хороша спроба покрити основні математичні аспекти теми.");
    }

    if (answerLower.includes("measurable") || answerLower.includes("вимірн")) {
      strengths.push("Чудово! Ви чітко зазначили вимогу вимірності відносно $\\sigma$-алгебри: $\\{\\omega: X(\\omega) \\le a\\} \\in \\mathcal{F}$.");
      score += 1;
    } else if (questionTitle.toLowerCase().includes("random variable")) {
      missing.push("Обов'язково вкажіть, що випадкова величина — це **вимірна функція** $X: \\Omega \\to \\mathbb{R}$.");
    }

    if (answerLower.includes("right-continuous") || answerLower.includes("неперервна справа")) {
      strengths.push("Правильно вказано властивість неперервності справа (càdlàg) для функції розподілу (CDF).");
      score += 1;
    }

    if (answerLower.includes("independent") && (answerLower.includes("cov") || answerLower.includes("0"))) {
      strengths.push("Коректно обговорено різницю між некорельованістю $\\text{Cov}(X,Y)=0$ та незалежністю.");
    }

    score = Math.min(Math.max(score, 4), 9);

    return `### 🧑‍🏫 Оцінка Gemini P&S Mentor (Офлайн-рубрика)

**Score: ${score}/10**

#### ✅ Сильні сторони:
${strengths.map(s => `- ${s}`).join('\n')}

#### ⚠️ Критичні умови для отримання 10/10:
${missing.length > 0 ? missing.map(m => `- ${m}`).join('\n') : '- Відразу пишіть ключові формули на папері, щоб екзаменатор бачив вашу структуру.'}
- Завжди вказуйте область визначення та умови абсолютної збіжності: $\\sum |x|p_X(x) < \\infty$ або $\\int |x|f_X(x)dx < \\infty$.
- Наводьте конкретний контрприклад (наприклад, $X \\sim U(-1, 1), Y = X^2$, де $\\text{Cov}(X,Y) = 0$, але змінні залежні!).

> **Colloquium Readiness Impact**: +${Math.round(score * 1.5)}% до володіння темою!`;
  }

  getLocalFallbackResponse(prompt, errorMsg = '') {
    return `### 💡 Gemini P&S Mentor

${errorMsg ? `*(⚠️ ${errorMsg})*` : `*(Підключено)*`}

**Поради за матеріалами курсу УКУ (Колоквіум 2 та Мідтерм 2):**
- **Колоквіум**: Розпочинайте із формального означення, вкажіть усі технічні умови (вимірність, зліченний або неперервний носій, інтегровність), наведіть 3-4 ключові властивості та завершіть контрприкладом або типовим розподілом.
- **Мідтерм**: Уважно перевіряйте межі інтегрування для сумісних розподілів (трикутні області $x+y < 1$), пам'ятайте, що $\\text{Var}(aX + bY) = a^2\\text{Var}(X) + b^2\\text{Var}(Y) + 2ab\\text{Cov}(X, Y)$, а сума двох рівномірних розподілів $U(0, 1)$ має трикутний, а не рівномірний розподіл!`;
  }
}

window.geminiMentor = new GeminiMentor();
