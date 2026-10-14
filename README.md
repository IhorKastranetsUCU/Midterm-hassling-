# 🎓 UCU StatHustle: Probability & Statistics Midterm 2 & Colloquium Mastery Platform

> **Target:** Maximum score (100% / Top Grade) on **Colloquium II (Wednesday)** & **Midterm 2 (Friday)**.  
> **Course:** Probability and Statistics (UCU 3rd Semester, "Бабілка").  
> **Built for:** Ihor

---

## ⚡ Quick Start

You can open the platform in any browser in two ways:

### Option 1: Direct File Open (Instant, No terminal required)
Double-click `index.html` or open it directly in Chrome/Safari:
```bash
open "/Users/ihor/Studing/UCU/3 semestr/бабілка/мідтерм хаслінг/midterm2/index.html"
```

### Option 2: Local Server (Recommended)
Run the built-in python launcher to start a local server and auto-open your browser:
```bash
python3 server.py
```
Open **`http://localhost:8080`**.

### Tests
Pure logic (drill queue, ticket picker) is covered by Node's built-in test runner — no dependencies:
```bash
node --test tests/*.test.js
```

---

## 🌟 Key Features Built From Scratch

### 1. 🎯 Colloquium Center (Focus First!)
* **All 21 Official Colloquium Definitions**:
  * Interactive 3D Flashcards with tap-to-flip mode.
  * Exact mathematical definitions with measurability and integrability conditions.
  * Colloquium tips and **Professor Traps** (the exact nuances examiners check).
  * Direct "Mark as Mastered" checkboxes that feed into your Readiness Meter.
* **🎲 Random Definition Drill (Quizlet-style)** — toggle "Рандомний тест" above the flashcards:
  * Definitions come in shuffled order: type (or say) the definition, reveal the reference, tick the key points you actually covered and grade yourself ✗ / ~ / ✓ (keys `1` `2` `3`, `Ctrl/⌘+Enter` to reveal).
  * "Didn't know" cards come back 3 cards later, "partially" ones go to the end of the queue; the round ends with a summary and a one-click re-run of the weak ones.
  * Scope: all 21 or only the ones not yet scored ≥6/10. Grades feed the same readiness score as the flashcards.
* **The 12 Colloquium Oral Questions & Defense Guides**:
  * Structured 4-step oral answer templates (Definition -> Axioms -> Proof/Formulas -> Counterexample).
  * Key formulas to write down on the board immediately.
  * Examiner follow-up questions and traps.
* **🎙️ Oral Defense Simulator with Gemini**:
  * Speak or type your answer to any oral exam question.
  * Gemini evaluates your answer on a strict 10-point scale, identifies missing mathematical conditions, and calculates your readiness boost!

### 2. 📊 Dynamic Readiness Engine (0% – 100%)
Tracks your real progress across 4 weighted pillars:
1. **21 Definitions Mastery (35%)** — Essential for Wednesday's Colloquium.
2. **Formula & Quiz Mastery (25%)** — Tests understanding of distributions and properties.
3. **Seminar & Colloquium Problems (25%)** — Problem-solving capability for Midterm 2.
4. **Oral Defense & Gemini Evaluations (15%)** — Oral articulation and proof rigor.
* Bonus readiness awarded for completing Pomodoro study sessions!

### 3. 📅 Structured Day-by-Day Study Roadmap (Sunday → Friday)
* **Day 1 (Sunday - Today):** Discrete RVs & Colloquium Core Definitions (Defs 1–6, Seminar 4 problems).
* **Day 2 (Monday):** Expectation, Variance, Covariance, Correlation & PGF (Defs 12–16, 20, Seminar 5).
* **Day 3 (Tuesday):** Continuous RVs, Transformations & Full Oral Colloquium Mock Simulation (Defs 7–11, 17–19, 21, Seminar 6).
* **Day 4 (Wednesday):** **COLLOQUIUM DAY** (Crush oral exam in morning, Midterm 2017 exam in afternoon).
* **Day 5 (Thursday):** Midterm 2 Hardcore Problem Solving (Poisson thinning, Gambler's ruin, Helicopter, timed mock exam).
* **Day 6 (Friday):** **MIDTERM 2 EXAM DAY** (Formula sheet refresh & maximum score victory!).

### 4. 🧠 Interactive Quizzes & Automated Problem Solver
* High-yield multiple choice and calculation questions with KaTeX formula rendering.
* Instant visual feedback (green/red) with complete step-by-step mathematical proofs.
* **Hint ladder on every problem**: first a "🧭 Куди рухатись?" nudge (which approach makes it easy — no computations), then the step hints one at a time. The full solution stays collapsed until you open it, and answer prompts no longer show the answer as an "e.g." example.
* Complete problem bank covering:
  * Seminar 4 (Discrete, Rankings, Dice, Redundancy Channel).
  * Seminar 5 (Expectation algebra, Waiting for HH, Geometric tail sum, Urn indicators).
  * Seminar 6 (Normal transformations, Min/Max uniform extremes, Shopping exponential times, Triangle joint density).
  * Colloquium 2022 New Problems (Multinomial covariance $-n/36$, Poisson thinning independence, Gambler's ruin difference equations, Helicopter rescue distance, Mixed traffic light distribution).
  * Midterm 2017 Exam Paper (Problems 1 to 6 complete solutions).

### 5. 🤖 Gemini AI Mentor Integration
* Dedicated slide-over AI tutor drawer available on every page.
* Integrated with Google Gemini 2.0 Flash / 1.5 Flash.
* Pre-configured with UCU Probability curriculum and grading criteria.
* Supports your custom API key (saved securely in your browser's `localStorage`).
* **Intelligent Offline Fallback**: If no API key is provided yet, a built-in smart tutor knowledge base still evaluates your answers and provides hints!

### 6. ⏱️ Built-in Pomodoro Focus Station
* 25-minute focus sessions with 5-minute short breaks and 15-minute long breaks.
* Synthesized Web Audio chime (works 100% offline, no external audio files required).
* Persistent session tracking across days.

### 7. 📐 Master Distribution & Formula Matrix
* Complete reference table for discrete ($B(1,p), B(n,p), G(p), P(\lambda)$) and continuous ($U(a,b), E(\lambda), N(\mu, \sigma^2), \text{Laplace}$) distributions.
* Includes Supports, PMF/PDF, Means, Variances, PGFs, MGFs, and key exam pitfalls.

---

## 🗂️ File Structure
```
midterm2/
├── index.html            # Main web application
├── server.py             # One-click local Python server
├── README.md             # This guide
├── css/
│   └── style.css         # Modern dark/light theme & layout styles
├── js/
│   ├── data.js           # 137KB verified course dataset (definitions, problems, schedule)
│   ├── problem-directions.js # "Куди рухатись" direction hints, one per problem (kept out of generated data.js)
│   ├── gemini.js         # Gemini AI Mentor & oral evaluator
│   ├── pomodoro.js       # Pomodoro timer with Web Audio synthesizer
│   ├── quiz.js           # Interactive quiz manager & readiness engine
│   ├── definition-drill.js # Random definition drill (shuffled recall + self-grading)
│   └── app.js            # UI controller, routing & event handling
├── tests/                # node --test unit tests for pure logic
├── vendor/
│   └── katex/            # Offline KaTeX assets (css, js, auto-render)
└── extracted_text/       # Clean text extractions from course PDFs
```

Good luck on Wednesday and Friday — go get that maximum score! 🚀
