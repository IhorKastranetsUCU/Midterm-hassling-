// UCU Probability & Statistics Midterm 3 & Colloquium 3 Master Data
// Limit Theorems, Descriptive Statistics, Parameter Estimation, Confidence Intervals & Bayesian Methods

window.PS_DATA_TOPIC3 = {
  "id": "topic3",
  "name": "Тема 3: Граничні теореми & Статистичне оцінювання (Midterm 3 & Col 3)",
  "shortName": "Тема 3 (Midterm 3 & Col 3)",
  "badge": "MIDTERM 3 & COL 3",
  "SCHEDULE_DAYS": [
    {
      "day": 1,
      "date": "Day 1 (Concentration Inequalities)",
      "title": "Нерівності концентрації: Марков, Чебишов, Кантеллі та Чернов",
      "focus": "Seminar 7: Нерівність Маркова, двостороння Чебишова, одностороння Кантеллі, межа Чернова, оцінка хвостів розподілів.",
      "tasks": [
        {
          "id": "t3_d1_t1",
          "text": "Вивчити означення 5, 6, 7 (Марков, Чебишов, Кантеллі).",
          "topic": "definitions",
          "target": "5-7"
        },
        {
          "id": "t3_d1_t2",
          "text": "Розібрати строге доведення нерівності Маркова через індикаторну функцію та Чебишова через Маркова.",
          "topic": "proofs"
        },
        {
          "id": "t3_d1_t3",
          "text": "Розв'язати задачі про Чернова: виведення P(X >= a) <= e^{-sa} M(s) та оптимізація phi(a).",
          "topic": "problems",
          "target": "chernoff"
        },
        {
          "id": "t3_d1_t4",
          "text": "Порівняти межі Маркова, Чебишова, Кантеллі та Чернова для Poisson(10).",
          "topic": "problems",
          "target": "poisson-bounds"
        },
        {
          "id": "t3_d1_t5",
          "text": "Пройти 2 подовжені фокус-сесії (45-60 хв кожна).",
          "topic": "pomodoro"
        }
      ],
      "colloquiumGoal": "Вміти без затримки записати доведення Маркова та Чебишова на дошці та назвати умову X >= 0.",
      "readinessWeight": 12
    },
    {
      "day": 2,
      "date": "Day 2 (Modes of Convergence & LLN)",
      "title": "Види збіжності та Закони великих чисел (WLLN & SLLN)",
      "focus": "Збіжність майже напевно (a.s.), за ймовірністю (P), за розподілом (d). Слабкий ЗВЧ Хінчина/Чебишова та Сильний ЗВЧ Колмогорова.",
      "tasks": [
        {
          "id": "t3_d2_t1",
          "text": "Вивчити означення 1, 2, 3 (види збіжності) та ієрархію a.s. => P => d.",
          "topic": "definitions",
          "target": "1-3"
        },
        {
          "id": "t3_d2_t2",
          "text": "Запам'ятати контрприклади (чому d не тягне P і P не тягне a.s.) та виняток (коли границя - константа!).",
          "topic": "traps"
        },
        {
          "id": "t3_d2_t3",
          "text": "Вивчити точні умови WLLN (Хінчин: скінченне матсподівання; Чебишов: скінченна дисперсія) та SLLN (Колмогоров).",
          "topic": "theory"
        },
        {
          "id": "t3_d2_t4",
          "text": "Розв'язати задачу про збіжність максимуму рівномірних величин Z_n = max(X_i) -> a за ймовірністю.",
          "topic": "problems"
        },
        {
          "id": "t3_d2_t5",
          "text": "Пройти Quiz 7: Limit Theorems (10 питань).",
          "topic": "quiz",
          "target": "quiz-7"
        }
      ],
      "colloquiumGoal": "Чітко пояснити професору Бабію різницю між a.s. та P збіжністю та сформулювати SLLN.",
      "readinessWeight": 15
    },
    {
      "day": 3,
      "date": "Day 3 (Central Limit Theorem & Approximations)",
      "title": "Центральна гранична теорема (ЦГТ) та нормальна апроксимація",
      "focus": "ЦГТ Ліндеберга-Леві, MGF-доведення ЦГТ, апроксимація сум Біноміальних та Пуассонівських величин, фабрика гаджетів.",
      "tasks": [
        {
          "id": "t3_d3_t1",
          "text": "Вивчити формулювання ЦГТ: (S_n - n*mu) / (sigma * sqrt(n)) -> N(0, 1) за розподілом.",
          "topic": "definitions",
          "target": "10"
        },
        {
          "id": "t3_d3_t2",
          "text": "Розібрати ідею доведення ЦГТ через розклад Тейлора логарифму MGF або характеристичних функцій.",
          "topic": "proofs"
        },
        {
          "id": "t3_d3_t3",
          "text": "Розв'язати задачу 3 з Midterm: Границі ймовірностей стартапу Армана (3 різні режими зростання).",
          "topic": "problems",
          "target": "midterm-arman"
        },
        {
          "id": "t3_d3_t4",
          "text": "Розв'язати задачу про авіакомпанію (300 місць, 324 квитки, 90% явка) та фабрику гаджетів.",
          "topic": "problems"
        },
        {
          "id": "t3_d3_t5",
          "text": "Пройти 2 подовжені фокус-сесії (45 хв).",
          "topic": "pomodoro"
        }
      ],
      "colloquiumGoal": "Вміти стандартизувати будь-яку суму S_n та обчислювати ймовірності через функцію Phi(z).",
      "readinessWeight": 15
    },
    {
      "day": 4,
      "date": "Day 4 (Colloquium 3 Drill & Oral Defense)",
      "title": "Колоквіум 3: Бліц-тренування 22 означень та 12 усних запитань",
      "focus": "Інтерактивні 3D флешкартки, симулятор усної співбесіди з Gemini AI, відпрацювання відповідей на дошці.",
      "tasks": [
        {
          "id": "t3_d4_t1",
          "text": "Пройти всі 22 означення Колоквіуму 3 у режимі флешкарток та набрати >=6 балів.",
          "topic": "definitions",
          "target": "all-22"
        },
        {
          "id": "t3_d4_t2",
          "text": "Здати симуляцію усної співбесіди на 12 питань з Gemini AI Tutor.",
          "topic": "oral-defense"
        },
        {
          "id": "t3_d4_t3",
          "text": "Перевірити академічні пастки професора: усунення зміщення n/(n-1), омега-множини в a.s., константи в d => P.",
          "topic": "traps"
        },
        {
          "id": "t3_d4_t4",
          "text": "Пройти колоквіум-тренажер на максимум.",
          "topic": "colloquium"
        }
      ],
      "colloquiumGoal": "Отримати 10/10 на Колоквіумі 3 та впевнено захистити будь-яке теоретичне твердження.",
      "readinessWeight": 20
    },
    {
      "day": 5,
      "date": "Day 5 (Descriptive Statistics & Sampling Distributions)",
      "title": "Описова статистика, вибіркові характеристики та розподіли",
      "focus": "Генеральна сукупність vs вибірка, вибіркові моменти, вибіркова дисперсія S^2 (поправка Бесселя n-1), розподіли Chi-square, Student-t, Fisher-F.",
      "tasks": [
        {
          "id": "t3_d5_t1",
          "text": "Вивчити означення 12, 13 (параметри vs статистики, вибіркові моменти, медіана, мода, квантилі).",
          "topic": "definitions",
          "target": "12-13"
        },
        {
          "id": "t3_d5_t2",
          "text": "Зрозуміти властивості (n-1)*S^2 / sigma^2 ~ Chi^2_{n-1} та незалежність X_bar і S^2 для нормальної вибірки (теорема Фішера).",
          "topic": "theory"
        },
        {
          "id": "t3_d5_t3",
          "text": "Вивчити розподіл Стьюдента: t = (X_bar - mu) / (S / sqrt(n)) ~ t_{n-1}.",
          "topic": "distributions"
        },
        {
          "id": "t3_d5_t4",
          "text": "Пройти Quiz 8: Descriptive Analysis of Data (10 питань).",
          "topic": "quiz",
          "target": "quiz-8"
        },
        {
          "id": "t3_d5_t5",
          "text": "Пройти подовжений фокус-сеанс (60 хв).",
          "topic": "pomodoro"
        }
      ],
      "colloquiumGoal": "Чітко вивести E[S^2] = sigma^2 та пояснити, чому ділимо на n-1, а не n.",
      "readinessWeight": 12
    },
    {
      "day": 6,
      "date": "Day 6 (Parameter Estimation: MME & MLE)",
      "title": "Точкове оцінювання параметрів: Метод моментів (MME) та Максимальна вірогідність (MLE)",
      "focus": "Рівняння методу моментів, функція правдоподібності L(theta), лог-правдоподібність ln L, рівняння оцінювання, інваріантність MLE.",
      "tasks": [
        {
          "id": "t3_d6_t1",
          "text": "Вивчити означення 14, 15, 16 (Estimators, MME, MLE).",
          "topic": "definitions",
          "target": "14-16"
        },
        {
          "id": "t3_d6_t2",
          "text": "Розв'язати задачу 4 з Midterm: Дискретне оцінювання MME та MLE для PMF з параметром theta.",
          "topic": "problems",
          "target": "midterm-p4"
        },
        {
          "id": "t3_d6_t3",
          "text": "Розв'язати задачу 6 з Midterm: U(0, a) - знаходження MLE a_hat = max(X_i) (випадок граничного параметра!).",
          "topic": "problems",
          "target": "midterm-p6"
        },
        {
          "id": "t3_d6_t4",
          "text": "Пройти Quiz 9: Parameter Estimation (10 питань).",
          "topic": "quiz",
          "target": "quiz-9"
        },
        {
          "id": "t3_d6_t5",
          "text": "Пройти 2 подовжені фокус-сесії (45 хв).",
          "topic": "pomodoro"
        }
      ],
      "colloquiumGoal": "Вміти безпомилково диференціювати ln L(theta) та знаходити MLE для будь-якої сім'ї розподілів.",
      "readinessWeight": 13
    },
    {
      "day": 7,
      "date": "Day 7 (Estimator Properties & Confidence Intervals)",
      "title": "Властивості оцінок, інформація Фішера та Довірчі інтервали",
      "focus": "Незміщеність, слушність (consistency), теорема Слуцького, MSE = Var + Bias^2, нерівність Рао-Крамера, побудова 100(1-alpha)% ДІ через півоти.",
      "tasks": [
        {
          "id": "t3_d7_t1",
          "text": "Вивчити означення 17, 18, 21, 22 (Unbiasedness, Consistency, CI, Confidence level).",
          "topic": "definitions",
          "target": "17-18,21-22"
        },
        {
          "id": "t3_d7_t2",
          "text": "Розв'язати задачу 5 з Midterm: Щільність exp{(6x - x^2)/2*theta}, знаходження MLE, доведення незміщеності та 95% ДІ через Chi^2.",
          "topic": "problems",
          "target": "midterm-p5"
        },
        {
          "id": "t3_d7_t3",
          "text": "Засвоїти побудову точних ДІ для U(0, a): використання півота X_(n) / a ~ u^n.",
          "topic": "problems"
        },
        {
          "id": "t3_d7_t4",
          "text": "Вивчити ДІ для нормального середнього: Z-інтервал (sigma відома) та t-інтервал (sigma невідома).",
          "topic": "theory"
        },
        {
          "id": "t3_d7_t5",
          "text": "Пройти подовжений фокус-сеанс (60 хв).",
          "topic": "pomodoro"
        }
      ],
      "colloquiumGoal": "Побудувати довірчий інтервал будь-якого рівня надійності за 2 хвилини без підказок.",
      "readinessWeight": 15
    },
    {
      "day": 8,
      "date": "Day 8 (Bayesian Estimation & Midterm 3 Exam Simulation)",
      "title": "Баєсівське оцінювання, Спряжені апріорні розподіли та Симуляція іспиту",
      "focus": "Апріорні та апостеріорні розподіли, Beta-Binomial, Gamma-Poisson, Normal-Normal, квадратична функція втрат (оцінка = апостеріорне середнє), повний симулятор Midterm 3.",
      "tasks": [
        {
          "id": "t3_d8_t1",
          "text": "Вивчити означення 19, 20 (Bayesian estimator, Prior & Posterior, Conjugacy).",
          "topic": "definitions",
          "target": "19-20"
        },
        {
          "id": "t3_d8_t2",
          "text": "Розв'язати задачу про Баєсівську монету: Prior Beta(2,2), 7 гербів з 10 -> Posterior Beta(9, 5), Bayes estimate = 9/14.",
          "topic": "problems",
          "target": "bayes-coin"
        },
        {
          "id": "t3_d8_t3",
          "text": "Розв'язати задачу про час життя батареї та чіпів (експоненційний розподіл з гамма-апріорним).",
          "topic": "problems",
          "target": "bayes-lifetime"
        },
        {
          "id": "t3_d8_t4",
          "text": "Пройти Quiz 10: Bayesian and Interval Estimation (10 питань).",
          "topic": "quiz",
          "target": "quiz-10"
        },
        {
          "id": "t3_d8_t5",
          "text": "Пройти ПОВНИЙ Self-Test Модуля 3 (24 тестових завдання) на час (80 хв).",
          "topic": "quiz",
          "target": "self-test-m3"
        },
        {
          "id": "t3_d8_t6",
          "text": "Зробити діагностику помилок з Gemini AI Tutor перед іспитом.",
          "topic": "gemini-review"
        }
      ],
      "colloquiumGoal": "100% готовність до Midterm 3 та Colok 3: всі 22 означення, всі задачі та квізи розібрані досконало!",
      "readinessWeight": 18
    }
  ],
  "DEFINITIONS_21": [
    {
      "id": 1,
      "name": "Convergence Almost Everywhere (Almost Surely)",
      "nameUa": "Збіжність майже скрізь (майже напевно, з ймовірністю 1)",
      "latex": "X_n \\xrightarrow{a.s.} X \\iff P\\left(\\left\\{\\omega \\in \\Omega : \\lim_{n \\to \\infty} X_n(\\omega) = X(\\omega)\\right\\}\\right) = 1",
      "latexFull": "X_n \\xrightarrow{a.s.} X \\iff P\\left(\\lim_{n \\to \\infty} X_n = X\\right) = 1 \\iff \\forall \\varepsilon > 0, \\; P\\left(\\limsup_{n \\to \\infty} |X_n - X| > \\varepsilon\\right) = 0",
      "definition": "A sequence of random variables $X_n$ defined on a probability space $(\\Omega, \\mathcal{F}, P)$ converges almost everywhere (almost surely, with probability 1) to a random variable $X$ if the set of outcomes $\\omega$ for which the ordinary numerical sequence $X_n(\\omega)$ converges to $X(\\omega)$ has probability equal to 1.",
      "keyPoints": [
        "Strongest of the three main modes of stochastic convergence: a.s. => P => d.",
        "Requires all $X_n$ and $X$ to be defined on the common probability space $(\\Omega, \\mathcal{F}, P)$.",
        "Allows the sequence $X_n(\\omega)$ to diverge on an exceptional event of probability zero (null set)."
      ],
      "example": "By the Strong Law of Large Numbers (SLLN), if $X_i$ are i.i.d. with $E[|X_1|] < \\infty$, then the sample average $S_n/n \\xrightarrow{a.s.} \\mu$.",
      "colloquiumTip": "Professor Babii will ask: 'Does convergence a.s. mean convergence for every single omega in Omega?' Answer: 'No, only on a set of measure 1; divergence is permitted on a null set of probability 0.'",
      "trap": "Do not confuse with pointwise convergence! Measurable probability measure $P$ is essential."
    },
    {
      "id": 2,
      "name": "Convergence in Probability",
      "nameUa": "Збіжність за ймовірністю",
      "latex": "X_n \\xrightarrow{P} X \\iff \\forall \\varepsilon > 0, \\quad \\lim_{n \\to \\infty} P(|X_n - X| \\ge \\varepsilon) = 0",
      "latexFull": "X_n \\xrightarrow{P} X \\iff \\forall \\varepsilon > 0, \\; \\lim_{n \\to \\infty} P(|X_n - X| < \\varepsilon) = 1",
      "definition": "A sequence of random variables $X_n$ converges in probability to a random variable $X$ if for every tolerance $\\varepsilon > 0$, the probability of a deviation of size at least $\\varepsilon$ vanishes as $n \\to \\infty$.",
      "keyPoints": [
        "Asserted by the Weak Law of Large Numbers (WLLN).",
        "Hierarchy: $X_n \\xrightarrow{a.s.} X \\implies X_n \\xrightarrow{P} X \\implies X_n \\xrightarrow{d} X$.",
        "Reverse is NOT true in general: convergence in probability does NOT imply convergence almost surely (classic counterexample: the typewriter/sliding indicator sequence)."
      ],
      "example": "For $X_i \\sim U(0, a)$ independent, the sample maximum $Z_n = \\max(X_1, \\dots, X_n) \\xrightarrow{P} a$ as $n \\to \\infty$.",
      "colloquiumTip": "State clearly that epsilon > 0 is fixed first, and then the limit as n -> infinity is taken for the probability measure of the event.",
      "trap": "Do NOT write lim inside the probability! The limit is outside: lim_{n -> infty} P(|X_n - X| >= eps) = 0."
    },
    {
      "id": 3,
      "name": "Convergence in Distribution (in Law)",
      "nameUa": "Збіжність за розподілом (за законом)",
      "latex": "X_n \\xrightarrow{d} X \\iff \\lim_{n \\to \\infty} F_{X_n}(x) = F_X(x) \\quad \\text{at all continuity points of } F_X",
      "latexFull": "X_n \\xrightarrow{d} X \\iff \\lim_{n \\to \\infty} E[g(X_n)] = E[g(X)] \\quad \\forall g \\in C_b(\\mathbb{R})",
      "definition": "A sequence of random variables $X_n$ converges in distribution (or converges in law) to a random variable $X$ if their cumulative distribution functions satisfy $\\lim_{n \\to \\infty} F_{X_n}(x) = F_X(x)$ for every real number $x$ where $F_X(x)$ is continuous.",
      "keyPoints": [
        "Weakest form of convergence: only concerns distributions, NOT values on the sample space.",
        "$X_n$ do NOT even need to be defined on the same probability space!",
        "Central Limit Theorem (CLT) is the primary theorem asserting convergence in distribution."
      ],
      "example": "If $X_n \\sim B(n, \\lambda/n)$, then $X_n \\xrightarrow{d} \\text{Poisson}(\\lambda)$. Standardized sum $(S_n - n\\mu)/(\\sigma\\sqrt{n}) \\xrightarrow{d} N(0, 1)$.",
      "colloquiumTip": "Crucial Oral Trap: When does convergence in distribution imply convergence in probability? Answer: If and only if the limit $X = c$ is a DEGENERATE random variable (a constant)! Then $X_n \\xrightarrow{d} c \\implies X_n \\xrightarrow{P} c$.",
      "trap": "Must specify 'at all continuity points of F_X'! If F has jump discontinuities, convergence might fail at those discrete jumps without violating convergence in law."
    },
    {
      "id": 4,
      "name": "Distribution of a Sample Mean",
      "nameUa": "Розподіл вибіркового середнього",
      "latex": "\\bar{X}_n = \\frac{1}{n} \\sum_{i=1}^n X_i, \\quad E[\\bar{X}_n] = \\mu, \\quad \\text{Var}(\\bar{X}_n) = \\frac{\\sigma^2}{n}",
      "latexFull": "\\bar{X}_n \\sim N\\left(\\mu, \\frac{\\sigma^2}{n}\\right) \\quad \\text{if } X_i \\overset{i.i.d.}{\\sim} N(\\mu, \\sigma^2)",
      "definition": "For a random sample $X_1, \\dots, X_n$ of i.i.d. random variables with mean $\\mu$ and variance $\\sigma^2$, the sample mean $\\bar{X}_n$ is a random variable with expected value $E[\\bar{X}_n] = \\mu$ and variance $\\text{Var}(\\bar{X}_n) = \\sigma^2 / n$. If the population is Normal $N(\\mu, \\sigma^2)$, then $\\bar{X}_n$ is strictly Normal $N(\\mu, \\sigma^2/n)$ for any sample size $n$.",
      "keyPoints": [
        "Unbiased estimator for the population mean: $E[\\bar{X}_n] = \\mu$.",
        "Variance shrinks strictly as $O(1/n)$, leading directly to WLLN via Chebyshev.",
        "Standard error of the mean is $\\text{SE}(\\bar{X}_n) = \\sigma / \\sqrt{n}$."
      ],
      "example": "If heights have mean 175 cm and variance 100 cm$^2$, the mean of 25 individuals has mean 175 cm and variance $100/25 = 4$ cm$^2$ (std dev 2 cm).",
      "colloquiumTip": "Emphasize that the exact distribution of $\\bar{X}_n$ is known for normal samples ($N(\\mu, \\sigma^2/n)$), while for non-normal samples it is approximate via CLT.",
      "trap": "Don't confuse the variance of the sample $\\sigma^2$ with the variance of the sample mean $\\sigma^2 / n$."
    },
    {
      "id": 5,
      "name": "Markov's Inequality",
      "nameUa": "Нерівність Маркова",
      "latex": "P(X \\ge a) \\le \\frac{E[X]}{a} \\quad \\text{for } X \\ge 0 \\text{ and } a > 0",
      "latexFull": "E[X] = \\int_0^\\infty x dF_X(x) \\ge \\int_a^\\infty x dF_X(x) \\ge a \\int_a^\\infty dF_X(x) = a P(X \\ge a)",
      "definition": "For any non-negative random variable $X$ ($X \\ge 0$) with finite expectation $E[X] < \\infty$, and for any constant $a > 0$, the probability that $X$ exceeds $a$ is upper-bounded by $E[X] / a$.",
      "keyPoints": [
        "Requires STRICT non-negativity: $P(X \\ge 0) = 1$.",
        "Requires only the first moment $E[X]$; distribution form can be completely unknown.",
        "Foundation for deriving Chebyshev's inequality and Chernoff bounds."
      ],
      "example": "If the average time spent on an exam is 50 minutes, then the probability a student spends at least 100 minutes is at most $50/100 = 0.5$.",
      "colloquiumTip": "Memorize the 2-line indicator proof: Introduce $Y_a = a \\cdot I_{X \\ge a}$. Clearly $Y_a \\le X$, hence $E[Y_a] = a P(X \\ge a) \\le E[X]$, so $P(X \\ge a) \\le E[X]/a$.",
      "trap": "Never apply Markov directly to random variables that take negative values without applying an absolute value or squaring first!"
    },
    {
      "id": 6,
      "name": "Chebyshev's Inequality",
      "nameUa": "Нерівність Чебишова (двостороння)",
      "latex": "P(|X - \\mu| \\ge c) \\le \\frac{\\sigma^2}{c^2} \\quad \\text{for } c > 0",
      "latexFull": "P(|X - \\mu| \\ge k\\sigma) \\le \\frac{1}{k^2} \\quad \\text{and} \\quad P(|X - \\mu| < k\\sigma) \\ge 1 - \\frac{1}{k^2}",
      "definition": "Let $X$ be any random variable with finite expected value $\\mu = E[X]$ and finite variance $\\sigma^2 = \\text{Var}(X) < \\infty$. Then for every constant $c > 0$, the probability of deviating from the mean by at least $c$ is bounded by $\\sigma^2 / c^2$.",
      "keyPoints": [
        "Works for ANY distribution (discrete, continuous, mixed) as long as variance is finite.",
        "Proven by applying Markov's inequality to the non-negative random variable $Y = (X - \\mu)^2$ with threshold $a = c^2$.",
        "At least $1 - 1/k^2$ of the probability mass lies within $k$ standard deviations of the mean (e.g., $\\ge 75\\%$ for $k=2$, $\\ge 88.9\\%$ for $k=3$)."
      ],
      "example": "If $\\mu = 50, \\sigma = 5$, the probability of falling outside $[40, 60]$ ($c=10$) is at most $25 / 100 = 0.25$.",
      "colloquiumTip": "Be ready to prove Chebyshev from Markov in 30 seconds on the board: $P(|X - \\mu| \\ge c) = P((X - \\mu)^2 \\ge c^2) \\le \\frac{E[(X - \\mu)^2]}{c^2} = \\frac{\\sigma^2}{c^2}$.",
      "trap": "Chebyshev gives a two-sided bound ($|X - \\mu| \\ge c$). For one-sided deviation $X - \\mu \\ge c$, use Cantelli's inequality for a strictly sharper bound!"
    },
    {
      "id": 7,
      "name": "One-sided Chebyshev's Inequality (Cantelli's)",
      "nameUa": "Одностороння нерівність Чебишова (Кантеллі)",
      "latex": "P(X - \\mu \\ge c) \\le \\frac{\\sigma^2}{\\sigma^2 + c^2} \\quad \\text{for } c > 0",
      "latexFull": "P(X - \\mu \\le -c) \\le \\frac{\\sigma^2}{\\sigma^2 + c^2} \\quad \\text{for } c > 0",
      "definition": "Cantelli's inequality provides a sharp one-sided probability bound for any random variable with mean $\\mu$ and variance $\\sigma^2$. For any $c > 0$, the probability of exceeding the mean by at least $c$ is bounded by $\\frac{\\sigma^2}{\\sigma^2 + c^2}$.",
      "keyPoints": [
        "Always strictly sharper than the naive two-sided Chebyshev bound of $\\frac{1}{2} \\frac{\\sigma^2}{c^2}$.",
        "Proven by considering $X - \\mu + u$ for $u > 0$, applying Markov to $(X - \\mu + u)^2$, and optimizing over $u = \\sigma^2 / c$.",
        "Also holds symmetrically for the lower tail: $P(X - \\mu \\le -c) \\le \\frac{\\sigma^2}{\\sigma^2 + c^2}$."
      ],
      "example": "For $c = \\sigma$, Cantelli gives $P(X - \\mu \\ge \\sigma) \\le \\frac{\\sigma^2}{\\sigma^2 + \\sigma^2} = 0.5$, whereas two-sided Chebyshev only gives $\\le 1.0$.",
      "colloquiumTip": "Remember the optimal choice of parameter: $u = \\sigma^2 / c$. This is a classic oral exam derivation question!",
      "trap": "Do not write $\\sigma^2 / c^2$ in the denominator; the denominator is strictly $\\sigma^2 + c^2$."
    },
    {
      "id": 8,
      "name": "Weak Law of Large Numbers (WLLN)",
      "nameUa": "Слабкий закон великих чисел (СЗВЧ)",
      "latex": "\\forall \\varepsilon > 0, \\quad \\lim_{n \\to \\infty} P\\left(\\left|\\frac{1}{n}\\sum_{i=1}^n X_i - \\mu\\right| \\ge \\varepsilon\\right) = 0 \\iff \\bar{X}_n \\xrightarrow{P} \\mu",
      "latexFull": "P(|\\bar{X}_n - \\mu| \\ge \\varepsilon) \\le \\frac{\\text{Var}(\\bar{X}_n)}{\\varepsilon^2} = \\frac{\\sigma^2}{n \\varepsilon^2} \\xrightarrow{n \\to \\infty} 0",
      "definition": "Let $X_1, X_2, \\dots$ be a sequence of independent and identically distributed (i.i.d.) random variables with finite expectation $E[X_i] = \\mu$. Then the sample mean $\\bar{X}_n = \\frac{1}{n} \\sum_{i=1}^n X_i$ converges in probability to $\\mu$ as $n \\to \\infty$.",
      "keyPoints": [
        "Asserts convergence IN PROBABILITY ($\\bar{X}_n \\xrightarrow{P} \\mu$).",
        "Chebyshev's version requires finite variance $\\sigma^2 < \\infty$; proof is a trivial 1-line application of Chebyshev: $P(|\\bar{X}_n - \\mu| \\ge \\varepsilon) \\le \\frac{\\sigma^2}{n\\varepsilon^2} \\to 0$.",
        "Khinchin's general version requires only finite mean $E[|X_i|] < \\infty$ (proven via characteristic functions)."
      ],
      "example": "In fair coin tossing ($X_i \\sim B(1, 0.5)$), the proportion of heads in $n$ tosses gets arbitrarily close to $0.5$ in probability.",
      "colloquiumTip": "Know the two versions: 1) Chebyshev's WLLN assumes finite variance $\\sigma^2 < \\infty$; 2) Khinchin's WLLN assumes only $E[|X_1|] < \\infty$.",
      "trap": "Do not claim WLLN proves almost sure convergence; that is the Strong Law of Large Numbers (SLLN)!"
    },
    {
      "id": 9,
      "name": "Strong Law of Large Numbers (SLLN)",
      "nameUa": "Сильний закон великих чисел (СЗВЧ)",
      "latex": "P\\left(\\lim_{n \\to \\infty} \\frac{1}{n}\\sum_{i=1}^n X_i = \\mu\\right) = 1 \\iff \\bar{X}_n \\xrightarrow{a.s.} \\mu",
      "latexFull": "E[|X_1|] < \\infty \\iff \\bar{X}_n \\xrightarrow{a.s.} \\mu \\quad \\text{(Kolmogorov's SLLN)}",
      "definition": "Let $X_1, X_2, \\dots$ be a sequence of i.i.d. random variables with finite expectation $E[|X_i|] < \\infty$ and $E[X_i] = \\mu$. Kolmogorov's SLLN states that the sample mean $\\bar{X}_n = \\frac{1}{n} \\sum_{i=1}^n X_i$ converges almost surely (with probability 1) to $\\mu$ as $n \\to \\infty$.",
      "keyPoints": [
        "Asserts ALMOST SURE convergence ($\\bar{X}_n \\xrightarrow{a.s.} \\mu$).",
        "Necessity and Sufficiency: $E[|X_1|] < \\infty$ is both necessary and sufficient for SLLN to hold.",
        "Strong Law implies the Weak Law ($a.s. \\implies P$)."
      ],
      "example": "If you toss a coin indefinitely, the sequence of realization averages converges to $0.5$ on every trajectory except for an event of probability zero.",
      "colloquiumTip": "If Professor Babii asks: 'What happens if $X_i$ have Cauchy distribution?' Answer: 'The mean does not exist ($E[|X|] = \\infty$), and $\\bar{X}_n$ has the exact same Cauchy distribution for all $n$, so neither WLLN nor SLLN holds!'",
      "trap": "Do not say 'SLLN requires finite variance'. Kolmogorov proved it requires only $E[|X_1|] < \\infty$!"
    },
    {
      "id": 10,
      "name": "Central Limit Theorem (CLT)",
      "nameUa": "Центральна гранична теорема (ЦГТ)",
      "latex": "\\frac{S_n - n\\mu}{\\sigma\\sqrt{n}} = \\frac{\\bar{X}_n - \\mu}{\\sigma / \\sqrt{n}} \\xrightarrow{d} N(0, 1) \\quad \\text{as } n \\to \\infty",
      "latexFull": "\\lim_{n \\to \\infty} P\\left(a \\le \\frac{\\sum_{i=1}^n X_i - n\\mu}{\\sigma\\sqrt{n}} \\le b\\right) = \\Phi(b) - \\Phi(a) = \\frac{1}{\\sqrt{2\\pi}} \\int_a^b e^{-t^2/2} dt",
      "definition": "Let $X_1, X_2, \\dots, X_n$ be a sequence of independent and identically distributed (i.i.d.) random variables with finite mean $\\mu$ and finite strictly positive variance $\\sigma^2 \\in (0, \\infty)$. The standardized sum converges in distribution to the standard normal distribution $N(0, 1)$ as $n \\to \\infty$.",
      "keyPoints": [
        "Applies to ANY underlying distribution (discrete or continuous) with finite variance.",
        "Rate of normalization: centering by $n\\mu$ and scaling by $\\sigma\\sqrt{n}$.",
        "Justifies the universal occurrence of the Gaussian/Normal distribution in nature and engineering."
      ],
      "example": "For Binomial $B(n, p)$, sum of $n$ Bernoullis: $\\frac{S_n - np}{\\sqrt{np(1-p)}} \\xrightarrow{d} N(0, 1)$ (De Moivre-Laplace theorem).",
      "colloquiumTip": "Mention the sketch of proof via MGF: Let $Z_i = (X_i - \\mu)/\\sigma$, $M_Z(t) = 1 + \\frac{t^2}{2} + o(t^2)$. Then $M_{\\bar{Z}_n}(t) = [M_Z(t/\\sqrt{n})]^n = [1 + \\frac{t^2}{2n} + o(t^2/n)]^n \\to e^{t^2/2}$, which is the MGF of $N(0, 1)$!",
      "trap": "Always mention the continuity correction of $\\pm 0.5$ when using CLT to approximate discrete distributions!"
    },
    {
      "id": 11,
      "name": "Approximate Distribution of a Sample Mean",
      "nameUa": "Апроксимативний розподіл вибіркового середнього",
      "latex": "\\bar{X}_n \\approx N\\left(\\mu, \\frac{\\sigma^2}{n}\\right) \\iff \\frac{\\bar{X}_n - \\mu}{S / \\sqrt{n}} \\approx N(0, 1) \\text{ (or } t_{n-1})",
      "latexFull": "P(a \\le \\bar{X}_n \\le b) \\approx \\Phi\\left(\\frac{b - \\mu}{\\sigma/\\sqrt{n}}\\right) - \\Phi\\left(\\frac{a - \\mu}{\\sigma/\\sqrt{n}}\\right)",
      "definition": "By the Central Limit Theorem, for sufficiently large sample size $n$ (typically $n \\ge 30$), the distribution of the sample mean $\\bar{X}_n$ is approximately Normal with mean $\\mu$ and variance $\\sigma^2 / n$, irrespective of the population distribution shape.",
      "keyPoints": [
        "Enables probability calculations for sample averages without knowing the exact parent distribution.",
        "If $\\sigma$ is replaced by the sample standard deviation $S$, Slutsky's theorem guarantees $\\frac{\\bar{X}_n - \\mu}{S/\\sqrt{n}} \\xrightarrow{d} N(0, 1)$.",
        "For small samples ($n < 30$) from a normal population, the exact distribution is Student's $t_{n-1}$."
      ],
      "example": "If lightbulb lifetimes have mean 1000 hrs and std dev 200 hrs, the average of 100 bulbs has approx distribution $N(1000, 20^2)$.",
      "colloquiumTip": "Cite Slutsky's theorem: since $S_n \\xrightarrow{P} \\sigma$, $\\frac{\\bar{X}_n - \\mu}{S_n/\\sqrt{n}} = \\frac{\\bar{X}_n - \\mu}{\\sigma/\\sqrt{n}} \\cdot \\frac{\\sigma}{S_n} \\xrightarrow{d} N(0,1) \\cdot 1 = N(0,1)$.",
      "trap": "Do not forget that for small $n$ without population normality, this normal approximation can be poor, especially for skewed distributions."
    },
    {
      "id": 12,
      "name": "Population (Distribution) Parameters",
      "nameUa": "Параметри генеральної сукупності (розподілу)",
      "latex": "\\theta \\in \\Theta \\subset \\mathbb{R}^k, \\quad f(x | \\theta) \\text{ or } p(x | \\theta)",
      "latexFull": "F(x; \\theta), \\quad \\mu = E_\\theta[X], \\quad \\sigma^2 = \\text{Var}_\\theta(X)",
      "definition": "A population parameter $\\theta$ is a fixed (usually unknown) constant that indexes and determines the specific probability distribution of a random variable in a parametric family $\\{P_\\theta : \\theta \\in \\Theta\\}$. The set of all possible parameter values $\\Theta$ is called the parameter space.",
      "keyPoints": [
        "Fixed numerical constants, NOT random variables (in classical frequentist statistics).",
        "Examples: $p$ in $B(n, p)$, $\\lambda$ in $\\text{Poisson}(\\lambda)$, $(\\mu, \\sigma^2)$ in $N(\\mu, \\sigma^2)$.",
        "Parameters determine population moments: $\\mu_k = E_\\theta[X^k]$."
      ],
      "example": "In a clinical trial, the true efficacy rate $\\theta = p \\in [0, 1]$ of a vaccine is a population parameter.",
      "colloquiumTip": "Contrasting point: In frequentist statistics $\\theta$ is a fixed unknown constant; in Bayesian statistics $\\theta$ is treated as a random variable with a prior distribution $\\pi(\\theta)$.",
      "trap": "Never confuse a population parameter (e.g. $\\mu, \\sigma$) with a sample statistic (e.g. $\\bar{X}, S$). Parameters are constants; statistics are random variables!"
    },
    {
      "id": 13,
      "name": "Sample Statistics",
      "nameUa": "Вибіркові статистики (моменти, середнє, медіана, дисперсія)",
      "latex": "T = g(X_1, \\dots, X_n), \\quad \\hat{m}_k = \\frac{1}{n}\\sum_{i=1}^n X_i^k, \\quad S^2 = \\frac{1}{n-1}\\sum_{i=1}^n (X_i - \\bar{X})^2",
      "latexFull": "\\bar{X} = \\frac{1}{n}\\sum_{i=1}^n X_i, \\quad S^2 = \\frac{1}{n-1}\\sum_{i=1}^n (X_i - \\bar{X})^2, \\quad \\hat{m}_k = \\frac{1}{n}\\sum_{i=1}^n X_i^k",
      "definition": "A sample statistic is any measurable function $T = g(X_1, \\dots, X_n)$ of the observed sample data that does NOT depend on any unknown parameters. Since it is a function of random variables, every statistic is itself a random variable with a sampling distribution.",
      "keyPoints": [
        "Must be computable purely from sample data: no unknown parameters $\\theta$ allowed in formula.",
        "Sample mean: $\\bar{X} = \\frac{1}{n}\\sum X_i$.",
        "Sample variance: $S^2 = \\frac{1}{n-1}\\sum (X_i - \\bar{X})^2$ (Bessel's correction ensures unbiasedness).",
        "Sample moments: $\\hat{m}_k = \\frac{1}{n}\\sum X_i^k$."
      ],
      "example": "The sample median $X_{((n+1)/2)}$ or the sample range $X_{(n)} - X_{(1)}$ are sample statistics.",
      "colloquiumTip": "Memorize the proof that $E[S^2] = \\sigma^2$: $\\sum (X_i - \\bar{X})^2 = \\sum (X_i - \\mu)^2 - n(\\bar{X} - \\mu)^2$, take expectation: $n\\sigma^2 - n(\\sigma^2/n) = (n-1)\\sigma^2$. Dividing by $n-1$ gives $\\sigma^2$!",
      "trap": "If an expression contains the unknown parameter $\\theta$ (like $(X_1 - \\theta)^2$), it is NOT a statistic; it is called a pivotal quantity or function!"
    },
    {
      "id": 14,
      "name": "Parameter Estimators and Estimates",
      "nameUa": "Оцінювачі та оцінки параметрів",
      "latex": "\\hat{\\theta}_n = g(X_1, \\dots, X_n) \\quad \\text{vs} \\quad \\hat{\\theta}_{obs} = g(x_1, \\dots, x_n)",
      "latexFull": "\\hat{\\theta}(X) \\text{ is a random variable (estimator)}; \\quad \\hat{\\theta}(x) \\in \\mathbb{R} \\text{ is a concrete number (estimate)}",
      "definition": "An estimator $\\hat{\\theta}_n = g(X_1, \\dots, X_n)$ is a rule or formula (a statistic / random variable) used to estimate an unknown population parameter $\\theta$. An estimate $\\hat{\\theta} = g(x_1, \\dots, x_n)$ is the specific numerical value obtained when the estimator is evaluated on realized numerical data $x_1, \\dots, x_n$.",
      "keyPoints": [
        "Estimator: Random variable, uppercase $X_i$, has mean, variance, and sampling distribution.",
        "Estimate: Concrete real number, lowercase $x_i$, computed after sample is observed.",
        "Key properties evaluated on estimators: unbiasedness, consistency, efficiency, MSE."
      ],
      "example": "The formula $\\bar{X} = \\frac{1}{n}\\sum X_i$ is an estimator for $\\mu$; the number $51.76$ computed from 42 graduate salaries is an estimate.",
      "colloquiumTip": "Professors love to deduct marks if you say 'the estimate is unbiased'. You must say 'the ESTIMATOR is unbiased' because an estimate is just a fixed number!",
      "trap": "Never confuse the estimator (the function/random variable) with the estimate (the resulting number)."
    },
    {
      "id": 15,
      "name": "Method of Moments Estimators (MME)",
      "nameUa": "Оцінки методу моментів (MME)",
      "latex": "\\hat{m}_k = \\mu_k(\\theta) \\iff \\frac{1}{n}\\sum_{i=1}^n X_i^k = E_\\theta[X^k], \\quad k = 1, \\dots, m",
      "latexFull": "\\hat{m}_1 = E[X] = \\mu(\\theta), \\quad \\hat{m}_2 = E[X^2], \\quad \\dots \\implies \\hat{\\theta}_{MM} = g^{-1}(\\hat{m}_1, \\dots, \\hat{m}_m)",
      "definition": "The Method of Moments (MME) estimates $k$ unknown parameters $\\theta_1, \\dots, \\theta_k$ by equating the first $k$ sample moments $\\hat{m}_j = \\frac{1}{n} \\sum_{i=1}^n X_i^j$ to the corresponding theoretical population moments $\\mu_j(\\theta) = E[X^j]$, and solving the resulting system of $k$ equations for $\\theta$.",
      "keyPoints": [
        "First moment equation: $\\bar{X} = E[X]$.",
        "Second moment equation: $\\frac{1}{n}\\sum X_i^2 = E[X^2] = \\text{Var}(X) + (E[X])^2$.",
        "Pros: Simple, computationally straightforward, always consistent under mild regularity.",
        "Cons: May not be statistically efficient (higher variance than MLE); can produce estimates outside the valid parameter space."
      ],
      "example": "For $X_i \\sim U(0, a)$, $E[X] = a/2$. Equating $\\bar{X} = a/2$ gives $\\hat{a}_{MM} = 2\\bar{X}$.",
      "colloquiumTip": "If asked for MME of $\\theta = \\mu^2$, note that $E[X] = \\mu$, so $\\hat{\\mu}_{MM} = \\bar{X}$, and $\\hat{\\theta}_{MM} = (\\bar{X})^2$.",
      "trap": "Always solve the system completely for the parameters $\\theta$; do not leave equations in terms of higher moments."
    },
    {
      "id": 16,
      "name": "Maximum Likelihood Estimators (MLE)",
      "nameUa": "Оцінки максимальної правдоподібності (MLE)",
      "latex": "\\hat{\\theta}_{ML} = \\arg\\max_{\\theta \\in \\Theta} L(\\theta; X) = \\arg\\max_{\\theta \\in \\Theta} \\sum_{i=1}^n \\ln f(X_i | \\theta)",
      "latexFull": "\\ell(\\theta) = \\ln L(\\theta) = \\sum_{i=1}^n \\ln f(X_i | \\theta), \\quad \\frac{\\partial \\ell}{\\partial \\theta} = 0, \\quad \\frac{\\partial^2 \\ell}{\\partial \\theta^2} < 0",
      "definition": "The Maximum Likelihood Estimator (MLE) $\\hat{\\theta}_{ML}$ is the parameter value that maximizes the likelihood function $L(\\theta; x) = \\prod_{i=1}^n f(x_i | \\theta)$ (or the log-likelihood $\\ell(\\theta) = \\ln L(\\theta)$), making the observed data sample most probable under the model.",
      "keyPoints": [
        "Log-likelihood simplifies products into sums: $\\ell(\\theta) = \\sum_{i=1}^n \\ln f(x_i | \\theta)$.",
        "Score equation: $\\frac{d\\ell}{d\\theta} = 0$. Check second derivative $\\frac{d^2\\ell}{d\\theta^2} < 0$ for maximum.",
        "Invariance property: If $\\hat{\\theta}$ is the MLE of $\\theta$, then $g(\\hat{\\theta})$ is the MLE of $g(\\theta)$.",
        "Boundary/Support parameters: When support depends on $\\theta$ (e.g. $U(0, a)$), derivative does not work; maximize directly on support $\\to \\hat{a}_{ML} = \\max(X_1, \\dots, X_n)$."
      ],
      "example": "For $X_i \\sim \\text{Poisson}(\\lambda)$, $L(\\lambda) = \\prod \\frac{\\lambda^{x_i} e^{-\\lambda}}{x_i!}$, $\\ell(\\lambda) = \\ln \\lambda \\sum x_i - n\\lambda - \\sum \\ln(x_i!)$. Setting $\\ell'(\\lambda) = \\frac{\\sum x_i}{\\lambda} - n = 0 \\implies \\hat{\\lambda}_{ML} = \\bar{X}$.",
      "colloquiumTip": "Always verify whether the support depends on the parameter! For $U(0, a)$, $L(a) = a^{-n} I(X_{(n)} \\le a)$, so $L(a)$ is decreasing for $a \\ge X_{(n)}$, giving $\\hat{a}_{ML} = X_{(n)} = \\max X_i$.",
      "trap": "Do not mechanically set derivative to zero if the support depends on $\\theta$! Derivatives fail at boundary constraints."
    },
    {
      "id": 17,
      "name": "Unbiased Estimators",
      "nameUa": "Незсунені (незміщені) оцінки",
      "latex": "E_\\theta[\\hat{\\theta}] = \\theta \\quad \\forall \\theta \\in \\Theta \\iff \\text{Bias}_\\theta(\\hat{\\theta}) = E[\\hat{\\theta}] - \\theta = 0",
      "latexFull": "\\text{Asymptotically unbiased: } \\lim_{n \\to \\infty} E[\\hat{\\theta}_n] = \\theta",
      "definition": "An estimator $\\hat{\\theta}$ is said to be an unbiased estimator of the parameter $\\theta$ if its mathematical expectation equals the true parameter value $\\theta$ for all possible values of $\\theta \\in \\Theta$. The bias is defined as $\\text{Bias}(\\hat{\\theta}) = E[\\hat{\\theta}] - \\theta$.",
      "keyPoints": [
        "Unbiased on average: If repeated samples are taken, the average of the estimates equals the true value.",
        "Sample mean $\\bar{X}$ is always unbiased for population mean $\\mu$: $E[\\bar{X}] = \\mu$.",
        "Sample variance $S^2 = \\frac{1}{n-1}\\sum(X_i-\\bar{X})^2$ is unbiased: $E[S^2] = \\sigma^2$. The divisor $n$ estimator $S_n^2$ is BIASED: $E[S_n^2] = \\frac{n-1}{n}\\sigma^2$ (asymptotically unbiased).",
        "For $X_i \\sim U(0, a)$, $\\hat{a}_{ML} = X_{(n)}$ has $E[X_{(n)}] = \\frac{n}{n+1}a$ (biased!), but $\\frac{n+1}{n}X_{(n)}$ is unbiased."
      ],
      "example": "For $X_i \\sim \\text{Exp}(\\lambda)$, $\\bar{X}$ is unbiased for $1/\\lambda$, but $1/\\bar{X}$ is a BIASED estimator for $\\lambda$ because $E[1/\\bar{X}] > 1/E[\\bar{X}]$ by Jensen's inequality!",
      "colloquiumTip": "Remember Jensen's inequality trap: If $\\hat{\\theta}$ is unbiased for $\\theta$, then $g(\\hat{\\theta})$ is generally BIASED for $g(\\theta)$ unless $g$ is an affine linear function!",
      "trap": "Unbiasedness does not guarantee low error! An unbiased estimator can have enormous variance and be worse than a slightly biased estimator with small variance."
    },
    {
      "id": 18,
      "name": "Consistent Estimators",
      "nameUa": "Слушні (консистентні) оцінки",
      "latex": "\\hat{\\theta}_n \\xrightarrow{P} \\theta \\iff \\forall \\varepsilon > 0, \\; \\lim_{n \\to \\infty} P(|\\hat{\\theta}_n - \\theta| \\ge \\varepsilon) = 0",
      "latexFull": "\\text{Sufficient condition: } \\lim_{n \\to \\infty} \\text{Bias}(\\hat{\\theta}_n) = 0 \\quad \\text{and} \\quad \\lim_{n \\to \\infty} \\text{Var}(\\hat{\\theta}_n) = 0 \\implies \\hat{\\theta}_n \\xrightarrow{P} \\theta",
      "definition": "An estimator sequence $\\hat{\\theta}_n$ is called consistent for the parameter $\\theta$ if it converges in probability to the true parameter value $\\theta$ as the sample size $n \\to \\infty$.",
      "keyPoints": [
        "Crucial asymptotic requirement: As more data arrives, the estimator converges to the exact ground truth.",
        "Sufficient condition: If $\\text{MSE}(\\hat{\\theta}_n) = \\text{Var}(\\hat{\\theta}_n) + (\\text{Bias}(\\hat{\\theta}_n))^2 \\to 0$ as $n \\to \\infty$, then $\\hat{\\theta}_n$ is consistent.",
        "An estimator can be biased but consistent (e.g. $S_n^2 = \\frac{1}{n}\\sum(X_i-\\bar{X})^2$, or $\\hat{a}_{ML} = X_{(n)}$ for $U(0, a)$).",
        "An estimator can be unbiased but INCONSISTENT (e.g. $\\hat{\\mu} = X_1$ for all $n$, where variance remains $\\sigma^2 > 0$ forever)."
      ],
      "example": "The sample median, sample variance, MME and MLE are all consistent under mild regularity conditions.",
      "colloquiumTip": "Distinguish unbiasedness and consistency clearly: Unbiasedness is a property for a fixed sample size $n$ ($E[\\hat{\\theta}_n] = \\theta$); Consistency is an asymptotic limit property as $n \\to \\infty$ ($\\hat{\\theta}_n \\xrightarrow{P} \\theta$).",
      "trap": "Do not assume that unbiasedness implies consistency. $X_1$ is unbiased for $\\mu$ but does not converge to $\\mu$!"
    },
    {
      "id": 19,
      "name": "Bayesian Estimators & Quadratic Loss",
      "nameUa": "Баєсівські оцінки та квадратична функція втрат",
      "latex": "\\hat{\\theta}_{Bayes} = E[\\theta | X] = \\int_\\Theta \\theta \\, \\pi(\\theta | x) \\, d\\theta",
      "latexFull": "L(\\theta, \\hat{\\theta}) = (\\theta - \\hat{\\theta})^2 \\implies \\hat{\\theta} = E[\\theta | X] \\quad \\text{(Posterior Mean)}",
      "definition": "In the Bayesian paradigm, the parameter $\\theta$ is treated as a random variable. The Bayesian estimator under quadratic (squared-error) loss $L(\\theta, \\hat{\\theta}) = (\\theta - \\hat{\\theta})^2$ is the conditional expectation of $\\theta$ given the observed data $X$, known as the posterior mean $E[\\theta | X]$.",
      "keyPoints": [
        "Quadratic loss $\\implies$ Posterior Mean: $\\hat{\\theta} = E[\\theta | X]$.",
        "Absolute loss $|\\theta - \\hat{\\theta}| \\implies$ Posterior Median.",
        "0-1 Loss $\\implies$ Maximum A Posteriori (MAP) mode: $\\hat{\\theta}_{MAP} = \\arg\\max \\pi(\\theta | x)$.",
        "Bayesian estimate naturally compromises between prior knowledge and observed sample data."
      ],
      "example": "For $X \\sim B(n, \\theta)$ with prior $\\theta \\sim \\text{Beta}(\\alpha, \\beta)$, posterior is $\\text{Beta}(\\alpha+x, \\beta+n-x)$, and Bayes estimate is $\\hat{\\theta} = \\frac{\\alpha + x}{\\alpha + \\beta + n}$.",
      "colloquiumTip": "Explain how Bayes estimate is a weighted average: $\\hat{\\theta} = \\frac{\\alpha+\\beta}{\\alpha+\\beta+n} \\frac{\\alpha}{\\alpha+\\beta} + \\frac{n}{\\alpha+\\beta+n} \\frac{x}{n} = (1-w)\\theta_0 + w \\bar{X}$. As $n \\to \\infty$, weight $w \\to 1$ and data dominates the prior!",
      "trap": "Under quadratic loss, the Bayes estimator is the posterior MEAN, NOT the mode (MAP)!"
    },
    {
      "id": 20,
      "name": "Prior and Posterior Distribution of a Parameter",
      "nameUa": "Апріорний та апостеріорний розподіли параметра",
      "latex": "\\pi(\\theta | x) = \\frac{f(x | \\theta) \\pi(\\theta)}{\\int_\\Theta f(x | \\theta') \\pi(\\theta') d\\theta'} \\propto f(x | \\theta) \\pi(\\theta)",
      "latexFull": "\\text{Posterior} \\propto \\text{Likelihood} \\times \\text{Prior}",
      "definition": "The prior distribution $\\pi(\\theta)$ represents the beliefs or knowledge about the parameter $\\theta$ before observing any data. The posterior distribution $\\pi(\\theta | x)$ represents the updated probability distribution of $\\theta$ after observing data $x$, calculated via Bayes' Theorem.",
      "keyPoints": [
        "Fundamental Bayesian update formula: $\\pi(\\theta | x) \\propto f(x | \\theta) \\pi(\\theta)$.",
        "Conjugate Prior: A prior family is called conjugate to a likelihood if the resulting posterior belongs to the same parametric family as the prior.",
        "Key Conjugate Pairs:",
        "  • Binomial likelihood + Beta prior $\\implies$ Beta posterior.",
        "  • Poisson likelihood + Gamma prior $\\implies$ Gamma posterior.",
        "  • Normal likelihood (known $\\sigma^2$) + Normal prior $\\implies$ Normal posterior."
      ],
      "example": "Flipping a coin 10 times with 7 heads, prior $\\pi(\\theta) = 6\\theta(1-\\theta) = \\text{Beta}(2, 2) \\implies$ posterior $\\pi(\\theta|x) \\propto \\theta^7(1-\\theta)^3 \\cdot \\theta^1(1-\\theta)^1 = \\theta^8(1-\\theta)^4 = \\text{Beta}(9, 5)$.",
      "colloquiumTip": "When calculating posteriors, drop all factors that do not depend on $\\theta$! Keep only terms with $\\theta$, recognize the kernel of the distribution, and identify the parameters directly.",
      "trap": "Don't waste time integrating the denominator if you can recognize the kernel of a Beta, Gamma, or Normal distribution!"
    },
    {
      "id": 21,
      "name": "Confidence Intervals",
      "nameUa": "Довірчі інтервали",
      "latex": "P_\\theta\\left(a(X) \\le \\theta \\le b(X)\\right) = 1 - \\alpha \\quad \\forall \\theta \\in \\Theta",
      "latexFull": "[a(X), b(X)] \\text{ is a } 100(1-\\alpha)\\% \\text{ confidence interval for } \\theta",
      "definition": "A $100(1-\\alpha)\\%$ confidence interval for an unknown parameter $\\theta$ is an interval with random endpoints $[a(X), b(X)]$ computed from the sample data $X$, such that the probability that the random interval covers the true fixed parameter $\\theta$ is at least $1 - \\alpha$ for all possible values of $\\theta \\in \\Theta$.",
      "keyPoints": [
        "The INTERVAL $[a(X), b(X)]$ is random; the parameter $\\theta$ is a fixed constant.",
        "Meaning: In $100(1-\\alpha)\\%$ of repeated independent samples, the computed interval will cover the true parameter $\\theta$.",
        "Normal sample with known $\\sigma$: $\\bar{X} \\pm z_{1-\\alpha/2} \\frac{\\sigma}{\\sqrt{n}}$.",
        "Normal sample with unknown $\\sigma$: $\\bar{X} \\pm t_{1-\\alpha/2}^{(n-1)} \\frac{S}{\\sqrt{n}}$."
      ],
      "example": "A 95% confidence interval for mean salary $[48.2, 54.1]$ means the procedure produces intervals covering the true mean 95% of the time.",
      "colloquiumTip": "Frequentist interpretation trap: Never say 'there is a 95% probability that theta is inside [48.2, 54.1]'! Once numerical values are plugged in, $\\theta$ is either inside (prob 1) or outside (prob 0). The 95% refers to the procedure before data is observed!",
      "trap": "As sample size $n$ increases, the length of the confidence interval DECREASES at rate $O(1/\\sqrt{n})$."
    },
    {
      "id": 22,
      "name": "Confidence Level & Quantiles",
      "nameUa": "Рівень довіри та квантилі",
      "latex": "1 - \\alpha \\in (0, 1), \\quad P(Z \\le z_p) = p, \\quad z_{1-\\alpha/2} = -z_{\\alpha/2}",
      "latexFull": "1 - \\alpha = 0.95 \\implies \\alpha = 0.05, \\; \\alpha/2 = 0.025, \\; z_{0.975} = 1.96",
      "definition": "The confidence level $1 - \\alpha$ (commonly 0.95 or 0.99) is the pre-specified probability that the confidence interval covers the true parameter. The significance level $\\alpha$ is the probability that the interval fails to cover the parameter. A quantile $z_p$ is the value such that $P(Z \\le z_p) = p$.",
      "keyPoints": [
        "Standard normal quantiles: $z_{0.95} \\approx 1.645$, $z_{0.975} \\approx 1.96$, $z_{0.995} \\approx 2.576$.",
        "Symmetry of standard normal: $z_{1-p} = -z_p$, so $z_{0.025} = -1.96$.",
        "Student-$t$ quantiles $t_{p}^{(n-1)}$ are strictly larger than normal quantiles $z_p$ due to heavier tails from estimating $\\sigma$ with $S$.",
        "Chi-squared quantiles $\\chi_{\\alpha/2}^2$ and $\\chi_{1-\\alpha/2}^2$ are positive and asymmetric."
      ],
      "example": "For 99% confidence level, $\\alpha = 0.01$, tail probability $\\alpha/2 = 0.005$, and upper quantile is $z_{0.995} = 2.576$.",
      "colloquiumTip": "Write down the key normal quantiles on the blackboard immediately: $z_{0.975} = 1.96$, $z_{0.995} = 2.58$, $z_{0.95} = 1.645$.",
      "trap": "Remember that $t$ quantiles depend on degrees of freedom $n-1$, and as $n \\to \\infty$, $t_{p}^{(n-1)} \\to z_p$."
    }
  ],
  "ORAL_QUESTIONS_12": [
    {
      "id": 1,
      "number": 1,
      "title": "Hierarchy of Stochastic Convergence & Counterexamples",
      "titleUa": "Ієрархія збіжностей (a.s. => P => d), контрприклади та виняток для константи",
      "time": "3-4 хв",
      "structure": [
        "1. Означення трьох типів збіжності: a.s. (майже напевно), P (за ймовірністю), d (за розподілом)",
        "2. Формулювання теореми про ієрархію: X_n -> X a.s. => X_n -> X in P => X_n -> X in d",
        "3. Контрприклад: збіжність за ймовірністю не тягне збіжність майже напевно (біжучий індикатор / друкарська машинка)",
        "4. Екзаменаційна пастка: коли збіжність за розподілом ТЯГНЕ збіжність за ймовірністю (коли границя X = c є константою!)"
      ],
      "speech": "Шановні екзаменатори! Розглянемо послідовність випадкових величин X_n на ймовірнісному просторі (Omega, F, P). Ми розрізняємо три фундаментальні види збіжності: 1) Збіжність майже скрізь (a.s.): P(lim X_n = X) = 1. Тобто для майже всіх елементарних подій числова послідовність X_n(omega) прямує до X(omega). 2) Збіжність за ймовірністю (in P): для будь-якого eps > 0, lim P(|X_n - X| >= eps) = 0. 3) Збіжність за розподілом (in law/d): lim F_{X_n}(x) = F_X(x) у всіх точках неперервності функції F_X. Ієрархія має вигляд: a.s. тягне P, а P тягне d. Обернені твердження у загальному випадку невірні! Класичний контрприклад P не тягне a.s. — це так звана 'друкарська машинка' або послідовність індикаторів інтервалів [j/2^k, (j+1)/2^k] на [0, 1]. Ймовірність P(I_n = 1) = 2^{-k} -> 0, отже I_n -> 0 за ймовірністю. Проте в кожній точці omega індикатор нескінченно багато разів приймає значення 1 і 0, отже lim I_n(omega) взагалі не існує! Проте є фундаментальний виняток: якщо гранична випадкова величина X = c є константою, то збіжність за розподілом X_n -> c ЕКВІВАЛЕНТНА збіжності за ймовірністю X_n -> c!",
      "keyFormulas": [
        "X_n \\xrightarrow{a.s.} X \\implies X_n \\xrightarrow{P} X \\implies X_n \\xrightarrow{d} X",
        "\\lim_{n \\to \\infty} P(|X_n - c| \\ge \\varepsilon) = 0 \\iff X_n \\xrightarrow{d} c \\quad (c = \\text{const})"
      ],
      "examinerQuestions": [
        {
          "q": "Чи вимагає збіжність за розподілом, щоб X_n та X були задані на одному ймовірнісному просторі?",
          "a": "Ні! Збіжність за розподілом стосується виключно функцій розподілу на R, тому величини можуть жити на абсолютно різних просторах Omega."
        },
        {
          "q": "Наведіть приклад, коли X_n -> X за розподілом, але не за ймовірністю.",
          "a": "Нехай X ~ N(0, 1), і покладемо X_n = -X для всіх n. Оскільки нормальний розподіл симетричний, X_n має однаковий розподіл N(0, 1) з X, отже X_n -> X за розподілом. Але |X_n - X| = |2X|, і P(|2X| >= eps) > 0 для всіх n, отже за ймовірністю збіжності немає!"
        }
      ]
    },
    {
      "id": 2,
      "number": 2,
      "title": "Markov's Inequality: Statement & 2-Line Rigorous Proof",
      "titleUa": "Нерівність Маркова: точне формулювання, доведення та область застосування",
      "time": "3 хв",
      "structure": [
        "1. Умови нерівності: X >= 0 (невід'ємність!) та a > 0",
        "2. Формулювання: P(X >= a) <= E[X] / a",
        "3. Строге математичне доведення через допоміжну випадкову величину Y_a = a * I_{X >= a}",
        "4. Застосування та межі застосовності"
      ],
      "speech": "Нерівність Маркова є наріжним каменем теорії ймовірностей, з якого виводяться нерівність Чебишова, межа Чернова та Слабкий закон великих чисел. Нехай X — невід'ємна випадкова величина, тобто P(X >= 0) = 1, зі скінченним матсподіванням E[X] < infty, і нехай a > 0 — довільна додатна константа. Тоді: P(X >= a) <= E[X] / a. Доведення елегантне і складається з двох кроків: Введемо допоміжну випадкову величину Y_a = a * I(X >= a), яка дорівнює a, якщо X >= a, і 0, якщо X < a. Оскільки X >= 0, нерівність Y_a <= X виконується для ВСІХ omega in Omega: якщо X < a, то 0 <= X; якщо X >= a, то a <= X. За монотонністю математичного сподівання: E[Y_a] <= E[X]. Оскільки E[Y_a] = a * P(X >= a) + 0 * P(X < a) = a * P(X >= a), маємо a * P(X >= a) <= E[X]. Ділячи на a > 0, отримуємо P(X >= a) <= E[X] / a. Твердження доведено!",
      "keyFormulas": [
        "P(X \\ge a) \\le \\frac{E[X]}{a} \\quad (X \\ge 0, \\; a > 0)",
        "Y_a = a \\cdot I_{X \\ge a} \\le X \\implies E[Y_a] = a P(X \\ge a) \\le E[X]"
      ],
      "examinerQuestions": [
        {
          "q": "Чому умова X >= 0 є критично важливою?",
          "a": "Якщо X може набувати від'ємних значень, то Y_a = 0 не обов'язково менше або рівне за X (наприклад, якщо X = -5, то 0 > -5), тому монотонність сподівання E[Y_a] <= E[X] порушується."
        },
        {
          "q": "Чи є нерівність Маркова точною (sharp)?",
          "a": "Так, вона точна: якщо випадкова величина приймає лише два значення {0, a}, нерівність перетворюється на точну рівність."
        }
      ]
    },
    {
      "id": 3,
      "number": 3,
      "title": "Chebyshev's and Cantelli's (One-sided) Inequalities",
      "titleUa": "Нерівність Чебишова та одностороння нерівність Кантеллі",
      "time": "3-4 хв",
      "structure": [
        "1. Формулювання двосторонньої нерівності Чебишова: P(|X - mu| >= c) <= sigma^2 / c^2",
        "2. Виведення Чебишова з нерівності Маркова для Y = (X - mu)^2",
        "3. Формулювання односторонньої нерівності Чебишова (Кантеллі): P(X - mu >= c) <= sigma^2 / (sigma^2 + c^2)",
        "4. Чому Кантеллі строгіша за наївний поділ на 2"
      ],
      "speech": "Нехай X — довільна випадкова величина зі скінченним середнім mu = E[X] та скінченною дисперсією sigma^2 = Var(X). Тоді для будь-якого c > 0: P(|X - mu| >= c) <= sigma^2 / c^2. Доведення: Подія {|X - mu| >= c} еквівалентна події {(X - mu)^2 >= c^2}. Оскільки (X - mu)^2 є невід'ємною випадковою величиною, ми можемо застосувати нерівність Маркова: P((X - mu)^2 >= c^2) <= E[(X - mu)^2] / c^2 = sigma^2 / c^2. Коли нас цікавить лише одне плече відхилення, тобто P(X - mu >= c), наївне застосування Чебишова дає лише 0.5 * sigma^2 / c^2. Проте одностороння нерівність Кантеллі дає СТРОГІШУ межу: P(X - mu >= c) <= sigma^2 / (sigma^2 + c^2). Для доведення Кантеллі розглядають величину Y = X - mu + u для деякого u > 0, застосовують Маркова до Y^2 та мінімізують отриману межу за u, що дає оптимальне u = sigma^2 / c.",
      "keyFormulas": [
        "P(|X - \\mu| \\ge c) \\le \\frac{\\sigma^2}{c^2}",
        "P(X - \\mu \\ge c) \\le \\frac{\\sigma^2}{\\sigma^2 + c^2}"
      ],
      "examinerQuestions": [
        {
          "q": "Яка межа виходить за Кантеллі при c = sigma?",
          "a": "P(X - mu >= sigma) <= sigma^2 / (sigma^2 + sigma^2) = 1/2. За звичайним Чебишовим було б sigma^2/sigma^2 = 1 (ніякої інформації!)."
        },
        {
          "q": "Чи залежить нерівність Чебишова від симетрії розподілу?",
          "a": "Ні, вона справедлива для абсолютно будь-якого розподілу зі скінченною дисперсією."
        }
      ]
    },
    {
      "id": 4,
      "number": 4,
      "title": "Laws of Large Numbers: WLLN vs SLLN",
      "titleUa": "Закони великих чисел: Слабкий ЗВЧ (WLLN) проти Сильного ЗВЧ (SLLN)",
      "time": "4 хв",
      "structure": [
        "1. Постановка задачі для i.i.d. вибірки: вибіркове середнє X_bar_n = S_n / n",
        "2. Слабкий закон (Хінчин / Чебишов): формулювання та доведення версії Чебишова через Var(X_bar) = sigma^2/n",
        "3. Сильний закон (Колмогоров): формулювання збіжності a.s. та необхідність і достатність E[|X|] < infty",
        "4. Філософська різниця: ймовірність відхилення в фіксованій точці n проти поведінки всієї траєкторії"
      ],
      "speech": "Закони великих чисел математично обґрунтовують статистичну стійкість середніх. Нехай X_1, X_2, ... — незалежні однаково розподілені (i.i.d.) випадкові величини з E[X_i] = mu. 1) Слабкий ЗВЧ (WLLN) стверджує, що для будь-якого eps > 0, lim_{n -> infty} P(|X_bar_n - mu| >= eps) = 0. Якщо додатково дисперсія sigma^2 < infty, доведення тривіальне: Var(X_bar_n) = sigma^2 / n, і за нерівністю Чебишова P(|X_bar_n - mu| >= eps) <= sigma^2 / (n * eps^2) -> 0 при n -> infty. Хінчин послабив умову до просто E[|X_i|] < infty. 2) Сильний ЗВЧ (Колмогоров) стверджує більше: P(lim_{n -> infty} X_bar_n = mu) = 1. Тобто збіжність відбувається майже напевно. Теорема Колмогорова стверджує, що існування матсподівання E[|X_1|] < infty є НЕОБХІДНОЮ І ДОСТАТНЬОЮ умовою для виконання SLLN. Різниця між ними глибока: WLLN говорить, що на великому кроці n ймовірність відхилитися мала; SLLN гарантує, що вся траєкторія після деякого моменту N ніколи не вийде за межі (mu - eps, mu + eps) з ймовірністю 1.",
      "keyFormulas": [
        "\\text{WLLN: } \\forall \\varepsilon > 0, \\; \\lim_{n \\to \\infty} P(|\\bar{X}_n - \\mu| \\ge \\varepsilon) = 0",
        "\\text{SLLN: } P\\left(\\lim_{n \\to \\infty} \\bar{X}_n = \\mu\\right) = 1 \\iff E[|X_1|] < \\infty"
      ],
      "examinerQuestions": [
        {
          "q": "Чи виконується WLLN для розподілу Коші?",
          "a": "Ні, для Коші E[|X|] = infty, вибіркове середнє X_bar_n знову має той самий розподіл Коші для будь-якого n і не концентрується біля жодної точки."
        },
        {
          "q": "Чи випливає WLLN з SLLN?",
          "a": "Так, оскільки збіжність майже напевно завжди тягне збіжність за ймовірністю (a.s. => P)."
        }
      ]
    },
    {
      "id": 5,
      "number": 5,
      "title": "Central Limit Theorem & MGF Sketch of Proof",
      "titleUa": "Центральна гранична теорема (ЦГТ) та ескіз доведення через MGF",
      "time": "4 хв",
      "structure": [
        "1. Формулювання теореми Ліндеберга-Леві для i.i.d. вибірки",
        "2. Центрування та нормування: Zn = (S_n - n*mu) / (sigma * sqrt(n)) -> N(0, 1) за розподілом",
        "3. Ескіз доведення через твірні функції моментів MGF: розклад Тейлора",
        "4. Поправка на неперервність для дискретних сум"
      ],
      "speech": "Центральна гранична теорема (ЦГТ) пояснює, чому нормальний розподіл є фундаментальним у природі. Теорема Ліндеберга-Леві: Нехай X_1, ..., X_n — i.i.d. випадкові величини з середнім mu та скінченною додатною дисперсією sigma^2 > 0. Тоді центрована і нормована сума Z_n = (S_n - n*mu) / (sigma * sqrt(n)) збігається за розподілом до стандартного нормального розподілу N(0, 1). Доведення через MGF: Без обмеження загальності припустимо mu = 0, sigma^2 = 1. Розкладемо MGF однієї величини X у ряд Тейлора в околі нуля: M_X(t) = 1 + t*E[X] + (t^2/2)*E[X^2] + o(t^2) = 1 + t^2/2 + o(t^2). Тоді Z_n = (1/sqrt(n)) sum X_i. За незалежністю: M_{Z_n}(t) = [M_X(t / sqrt(n))]^n = [1 + t^2 / (2n) + o(t^2 / n)]^n. За класичною чудовою границею lim (1 + a/n)^n = e^a, маємо lim M_{Z_n}(t) = e^{t^2/2}. Але e^{t^2/2} — це в точності твірна функція моментів стандартного нормального розподілу N(0, 1)! За теоремою неперервності для MGF, збіжність твірних функцій гарантує збіжність за розподілом: Z_n -> N(0, 1).",
      "keyFormulas": [
        "Z_n = \\frac{S_n - n\\mu}{\\sigma\\sqrt{n}} \\xrightarrow{d} N(0, 1)",
        "M_{Z_n}(t) = \\left[1 + \\frac{t^2}{2n} + o(t^2/n)\\right]^n \\xrightarrow{n \\to \\infty} e^{t^2/2}"
      ],
      "examinerQuestions": [
        {
          "q": "Яка швидкість зростання знаменника і чому саме sqrt(n)?",
          "a": "Дисперсія суми Var(S_n) = n*sigma^2. Щоб нормована величина мала дисперсію 1, ми зобов'язані ділити на стандартне відхилення sqrt(n*sigma^2) = sigma*sqrt(n)."
        },
        {
          "q": "Коли потрібна поправка на неперервність (continuity correction)?",
          "a": "Коли ми апроксимуємо дискретну суму (наприклад, біноміальну) неперервним нормальним розподілом, P(S_n = k) апроксимується як P(k - 0.5 <= Y <= k + 0.5)."
        }
      ]
    },
    {
      "id": 6,
      "number": 6,
      "title": "Population Parameters vs Sample Statistics",
      "titleUa": "Параметри генеральної сукупності проти вибіркових статистик",
      "time": "3 хв",
      "structure": [
        "1. Генеральна сукупність (Population) та параметр theta in Theta як детермінована константа",
        "2. Вибірка (X_1, ..., X_n) та вибіркова статистика T = g(X_1, ..., X_n)",
        "3. Статистика як випадкова величина: власний розподіл (Sampling distribution)",
        "4. Оцінювач (Estimator) проти оцінки (Estimate)"
      ],
      "speech": "У математичній статистиці фундаментальним є розмежування між генеральною сукупністю та вибіркою: Генеральна сукупність описується теоретичним розподілом F(x; theta) з фіксованими невідомими параметрами theta (наприклад, mu або sigma^2). У класичній статистиці параметр theta є ДЕТЕРМІНОВАНОЮ КОНСТАНТОЮ, а не випадковою величиною! Вибірка X_1, ..., X_n — це набір спостережуваних випадкових величин. Вибіркова статистика T = g(X_1, ..., X_n) — це будь-яка вимірна функція вибірки, яка НЕ містить невідомих параметрів. Оскільки статистика є функцією випадкових величин, вона САМА Є ВИПАДКОВОЮ ВЕЛИЧИНОЮ і має свій вибірковий розподіл (sampling distribution). Далі розрізняють: Оцінювач (Estimator) theta_hat(X) — це формула/статистика (випадкова величина). Оцінка (Estimate) theta_hat(x) — це конкретне число, отримане після підстановки числових спостережень. Оцінювач може бути незміщеним, а оцінка є просто числом!",
      "keyFormulas": [
        "T = g(X_1, \\dots, X_n) \\quad (\\text{не містить } \\theta)",
        "E[\\bar{X}] = \\mu, \\quad \\text{Var}(\\bar{X}) = \\frac{\\sigma^2}{n}"
      ],
      "examinerQuestions": [
        {
          "q": "Чи є вираз sum (X_i - mu)^2 / n статистикою, якщо mu невідоме?",
          "a": "Ні! Оскільки mu невідоме, обчислити це значення з вибірки неможливо. Це не статистика, а теоретична величина або півот."
        },
        {
          "q": "Чому вибіркова дисперсія S^2 ділиться на n-1, а не n?",
          "a": "Тому що одне ступеня вільності втрачається на оцінювання невідомого середнього mu через X_bar. Ділення на n-1 компенсує це і робить оцінювач строго незміщеним (поправка Бесселя)."
        }
      ]
    },
    {
      "id": 7,
      "number": 7,
      "title": "Method of Moments (MME): Principle & System of Equations",
      "titleUa": "Метод моментів (MME): принцип, рівняння та властивості",
      "time": "3 хв",
      "structure": [
        "1. Ідея: прирівнювання вибіркових моментів m_hat_k до теоретичних mu_k(theta)",
        "2. Формування системи рівнянь для k параметрів",
        "3. Приклад для рівномірного U(0, a) або Гамма-розподілу",
        "4. Переваги та недоліки методу"
      ],
      "speech": "Метод моментів (MME), запропонований Карлом Пірсоном, ґрунтується на Законі великих чисел: вибіркові моменти m_hat_k = (1/n) sum X_i^k збігаються за ймовірністю до теоретичних моментів mu_k(theta) = E[X^k]. Процедура: Якщо розподіл залежить від k параметрів theta = (theta_1, ..., theta_k), ми обчислюємо перші k теоретичних моментів mu_1(theta), ..., mu_k(theta) як функції від параметрів. Потім складаємо систему k рівнянь: m_hat_1 = mu_1(theta), m_hat_2 = mu_2(theta), ..., m_hat_k = mu_k(theta). Розв'язок цієї системи відносно параметрів theta і є оцінкою методу моментів theta_hat_MM. Переваги: простота обчислень, відсутність потреби диференціювати складні добутки, автоматична консистентність за теоремою про неперервне відображення. Недоліки: MME часто не є ефективним (має більшу дисперсію, ніж MLE) і може видавати оцінки поза межами допустимої області параметрів.",
      "keyFormulas": [
        "\\hat{m}_k = \\frac{1}{n}\\sum_{i=1}^n X_i^k = E_\\theta[X^k] = \\mu_k(\\theta), \\quad k=1,\\dots,m",
        "U(0, a): \\quad \\bar{X} = \\frac{a}{2} \\implies \\hat{a}_{MM} = 2\\bar{X}"
      ],
      "examinerQuestions": [
        {
          "q": "Знайдіть MME для експоненційного розподілу Exp(lambda).",
          "a": "E[X] = 1/lambda. Прирівнюємо X_bar = 1/lambda => lambda_hat_MM = 1 / X_bar."
        },
        {
          "q": "Чи завжди оцінка методу моментів незміщена?",
          "a": "Ні! Наприклад, для Exp(lambda) оцінка 1/X_bar є зміщеною за нерівністю Єнсена (E[1/X_bar] > 1/E[X_bar] = lambda), хоча вона є слушною."
        }
      ]
    },
    {
      "id": 8,
      "number": 8,
      "title": "Maximum Likelihood Estimation (MLE) & Score Function",
      "titleUa": "Метод максимальної вірогідності (MLE): функція правдоподібності, score-функція та межі носія",
      "time": "4 хв",
      "structure": [
        "1. Означення функції правдоподібності L(theta) та лог-правдоподібності ell(theta)",
        "2. Рівняння вірогідності (score equation): d ell / d theta = 0 та перевірка другої похідної",
        "3. Властивість інваріантності MLE: g(theta_hat) = [g(theta)]_hat",
        "4. Спеціальний випадок: коли носій залежить від параметра (наприклад, U(0, a))"
      ],
      "speech": "Метод максимальної правдоподібності (MLE), розроблений Рональдом Фішером, обирає значення параметра theta, яке робить спостережувану вибірку найбільш імовірною. Функція правдоподібності для i.i.d. вибірки: L(theta) = prod_{i=1}^n f(x_i | theta). Оскільки логарифм є монотонно зростаючою функцією, максимізація L(theta) еквівалентна максимізації лог-правдоподібності: ell(theta) = ln L(theta) = sum_{i=1}^n ln f(x_i | theta). Стандартний алгоритм: 1) Взяти похідну (score-функцію) d ell / d theta і прирівняти до 0. 2) Перевірити умову максимуму через другу похідну: d^2 ell / d theta^2 < 0. Ключова властивість — функціональна інваріантність: якщо theta_hat є MLE для theta, то для будь-якої функції g оцінкою MLE для g(theta) є g(theta_hat)! Увага, екзаменаційна пастка: якщо область визначення (носій) залежить від параметра, наприклад X_i ~ U(0, a), то f(x|a) = (1/a) * I(0 <= x <= a). Тоді L(a) = a^{-n} * I(max X_i <= a). Ця функція спадає за a при a >= max X_i, тому похідна в нуль не перетворюється! Максимум досягається на лівій межі допустимої області: a_hat_ML = max(X_1, ..., X_n).",
      "keyFormulas": [
        "\\ell(\\theta) = \\sum_{i=1}^n \\ln f(X_i | \\theta), \\quad \\frac{\\partial \\ell}{\\partial \\theta} = 0",
        "X_i \\sim U(0, a) \\implies \\hat{a}_{ML} = X_{(n)} = \\max(X_1, \\dots, X_n)"
      ],
      "examinerQuestions": [
        {
          "q": "Яка асимптотична властивість MLE при великих n?",
          "a": "За умов регулярності MLE є асимптотично незміщеною, слушною, асимптотично нормальною і асимптотично ефективною (досягає нижньої межі Рао-Крамера 1 / (n * I(theta)))."
        },
        {
          "q": "Знайдіть MLE для параметра нормального розподілу sigma^2.",
          "a": "sigma_hat^2_ML = (1/n) sum (X_i - X_bar)^2. Зверніть увагу: це зміщена оцінка з діленням на n, а не n-1!"
        }
      ]
    },
    {
      "id": 9,
      "number": 9,
      "title": "Unbiasedness vs Consistency: Definitions & Traps",
      "titleUa": "Незміщеність проти Слушності (Consistency): порівняння та класичні пастки",
      "time": "3-4 хв",
      "structure": [
        "1. Точне означення незміщеності: E_theta[theta_hat] = theta для всіх n",
        "2. Точне означення слушності: theta_hat_n -> theta за ймовірністю при n -> infty",
        "3. Приклад зміщеної, але слушної оцінки (S_n^2 або max(X_i) для U(0, a))",
        "4. Приклад незміщеної, але НЕСЛУШНОЇ оцінки (перше спостереження X_1)"
      ],
      "speech": "Незміщеність і слушність — два ключові критерії якості оцінювачів, які студенти часто плутають: 1) Незміщеність (Unbiasedness) — це властивість оцінювача при ФІКСОВАНОМУ обсязі вибірки n. Оцінювач theta_hat називається незміщеним, якщо його математичне сподівання строго дорівнює істинному значенню: E_theta[theta_hat] = theta для всіх theta in Theta. 2) Слушність (Consistency) — це АСИМПТОТИЧНА властивість при n -> infty. Оцінювач theta_hat_n є слушним, якщо він збігається до theta за ймовірністю: для будь-якого eps > 0, P(|theta_hat_n - theta| >= eps) -> 0. Ці поняття не тягнуть одне одне! Класичний контрприклад 1 (зміщена, але слушна): Для U(0, a) оцінка MLE є a_hat = X_{(n)}. Її сподівання E[X_{(n)}] = n/(n+1)*a != a, тобто вона зміщена! Але Var(X_{(n)}) -> 0 і зміщення -> 0, отже MSE -> 0 і оцінка є строго слушною. Класичний контрприклад 2 (незміщена, але НЕСЛУШНА): Візьмемо theta_hat = X_1 для оцінки середнього mu. Оскільки E[X_1] = mu, оцінка строго незміщена для будь-якого n! Проте з ростом n ми взагалі ігноруємо нові дані, дисперсія Var(X_1) = sigma^2 > 0 не спадає, і theta_hat ніколи не сходиться до mu за ймовірністю!",
      "keyFormulas": [
        "\\text{Unbiased: } E_\\theta[\\hat{\\theta}_n] = \\theta \\quad (\\forall n)",
        "\\text{Consistent: } \\hat{\\theta}_n \\xrightarrow{P} \\theta \\quad (n \\to \\infty)"
      ],
      "examinerQuestions": [
        {
          "q": "Яка достатня умова слушності через MSE?",
          "a": "Якщо MSE(theta_hat_n) = Var(theta_hat_n) + [Bias(theta_hat_n)]^2 -> 0 при n -> infty, то оцінювач є слушним (випливає безпосередньо з нерівності Чебишова)."
        },
        {
          "q": "Як виправити зміщення оцінки max(X_i) для U(0, a)?",
          "a": "Помножити на (n+1)/n: оцінювач (n+1)/n * X_{(n)} стає строго незміщеним."
        }
      ]
    },
    {
      "id": 10,
      "number": 10,
      "title": "Mean Squared Error (MSE) & Cramér-Rao Lower Bound",
      "titleUa": "Середньоквадратична помилка (MSE), інформація Фішера та нерівність Рао-Крамера",
      "time": "4 хв",
      "structure": [
        "1. Розклад MSE на дисперсію та квадрат зміщення: MSE = Var + Bias^2",
        "2. Означення інформації Фішера I(theta) = E[(d ln f / d theta)^2] = -E[d^2 ln f / d theta^2]",
        "3. Нерівність Рао-Крамера (CRLB) для незміщених оцінок: Var(theta_hat) >= 1 / (n * I(theta))",
        "4. Ефективні оцінки (UMVUE)"
      ],
      "speech": "Коли ми порівнюємо два оцінювачі, критерієм точності слугує середньоквадратична помилка (Mean Squared Error): MSE(theta_hat) = E[(theta_hat - theta)^2]. Фундаментальна теорема стверджує, що MSE розкладається на дві компоненти: MSE(theta_hat) = Var(theta_hat) + [Bias(theta_hat)]^2, де Bias = E[theta_hat] - theta. Це демонструє класичний компроміс між зміщенням та дисперсією (bias-variance tradeoff). Чи можна зробити дисперсію незміщеної оцінки як завгодно малою? Ні! Межу встановлює нерівність Рао-Крамера (Cramér-Rao Lower Bound): Для будь-якої незміщеної оцінки theta_hat регулярного сімейства розподілів: Var(theta_hat) >= 1 / (n * I(theta)), де I(theta) — інформація Фішера одного спостереження, яка обчислюється як I(theta) = -E[d^2 ln f(X | theta) / d theta^2]. Якщо незміщений оцінювач досягає цієї межі, він називається ефективним (або UMVUE — Uniformly Minimum Variance Unbiased Estimator).",
      "keyFormulas": [
        "\\text{MSE}(\\hat{\\theta}) = \\text{Var}(\\hat{\\theta}) + \\left(\\text{Bias}(\\hat{\\theta})\\right)^2",
        "\\text{Var}(\\hat{\\theta}) \\ge \\frac{1}{n I(\\theta)}, \\quad I(\\theta) = -E\\left[\\frac{\\partial^2 \\ln f(X|\\theta)}{\\partial \\theta^2}\\right]"
      ],
      "examinerQuestions": [
        {
          "q": "Чи є вибіркове середнє X_bar ефективною оцінкою для mu в нормальному розподілі?",
          "a": "Так! I(mu) = 1/sigma^2, нижня межа CRLB дорівнює sigma^2/n. Але Var(X_bar) = sigma^2/n, отже межа досягається в точності, і X_bar є ефективним оцінювачем."
        },
        {
          "q": "Чи застосовна нерівність Рао-Крамера до розподілу U(0, theta)?",
          "a": "Ні! Умова регулярності про незалежність носія від theta тут порушена, тому оцінки можуть збігатися зі швидкістю 1/n^2 замість 1/n!"
        }
      ]
    },
    {
      "id": 11,
      "number": 11,
      "title": "Confidence Intervals: Pivotal Method (Z vs t Distribution)",
      "titleUa": "Довірчі інтервали: метод півотів, різниця між Z- та t-розподілами Стьюдента",
      "time": "4 хв",
      "structure": [
        "1. Означення 100(1-alpha)% довірчого інтервалу та його строга ймовірнісна інтерпретація",
        "2. Метод півота (pivotal quantity)",
        "3. Випадок відомої sigma^2: Z = (X_bar - mu)/(sigma/sqrt(n)) ~ N(0, 1)",
        "4. Випадок невідомої sigma^2: t = (X_bar - mu)/(S/sqrt(n)) ~ t_{n-1} з розподілом Стьюдента"
      ],
      "speech": "Довірчий інтервал рівня 1 - alpha для параметра theta — це випадковий інтервал [a(X), b(X)], побудований за вибіркою, такий що P_theta(a(X) <= theta <= b(X)) = 1 - alpha для всіх можливих theta. Головний спосіб побудови — метод півота: ми знаходимо функцію Q(X, theta), розподіл якої НЕ залежить від theta. Розглянемо нормальну вибірку N(mu, sigma^2): 1) Якщо sigma^2 відома: півотом є Z = (X_bar - mu) / (sigma / sqrt(n)) ~ N(0, 1). Розв'язуючи P(-z_{1-alpha/2} <= Z <= z_{1-alpha/2}) = 1 - alpha, маємо інтервал X_bar +- z_{1-alpha/2} * (sigma / sqrt(n)). 2) Якщо sigma^2 НЕВІДОМА: ми замінюємо sigma на вибіркове стандартне відхилення S = sqrt(sum (X_i - X_bar)^2 / (n-1)). Статистика T = (X_bar - mu) / (S / sqrt(n)) має розподіл Стьюдента з n-1 ступенями вільності! Довірчий інтервал набуває вигляду: X_bar +- t_{1-alpha/2}^{(n-1)} * (S / sqrt(n)). Оскільки розподіл Стьюдента має важчі хвости через невизначеність S, квантиль t завжди більший за квантиль z, і довірчий інтервал ширший. При n -> infty за теоремою Слуцького t_{n-1} прямує до N(0, 1).",
      "keyFormulas": [
        "\\sigma \\text{ відома: } \\bar{X} \\pm z_{1-\\alpha/2} \\frac{\\sigma}{\\sqrt{n}}",
        "\\sigma \\text{ невідома: } \\bar{X} \\pm t_{1-\\alpha/2}^{(n-1)} \\frac{S}{\\sqrt{n}}"
      ],
      "examinerQuestions": [
        {
          "q": "Яка ймовірність того, що константа mu лежить у вже обчисленому інтервалі [5.2, 7.8]?",
          "a": "0 або 1! Конкретний числовий інтервал вже не є випадковим, тому mu або потрапило в нього, або ні. Рівень 95% означає, що при багаторазовому повторенні експерименту 95% таких побудованих інтервалів накриють mu."
        },
        {
          "q": "Як зміниться довжина довірчого інтервалу, якщо збільшити n у 4 рази?",
          "a": "Довжина зменшиться рівно у sqrt(4) = 2 рази."
        }
      ]
    },
    {
      "id": 12,
      "number": 12,
      "title": "Bayesian Estimation & Conjugate Priors (Beta & Gamma)",
      "titleUa": "Баєсівське оцінювання: теорема Баєса, апріорні та апостеріорні розподіли, спряжені пари",
      "time": "4 хв",
      "structure": [
        "1. Концепція Баєсівського підходу: theta як випадкова величина з апріорним розподілом pi(theta)",
        "2. Формула апостеріорного розподілу: pi(theta | x) proportional to f(x | theta) * pi(theta)",
        "3. Поняття спряженого апріорного розподілу (conjugate prior)",
        "4. Дві ключові моделі: Beta-Binomial (монета) та Gamma-Poisson (час життя)"
      ],
      "speech": "На відміну від частотного підходу, у Баєсівській статистиці невідомий параметр theta розглядається як випадкова величина зі своїм апріорним розподілом pi(theta), що виражає наші попередні переконання або знання до проведення експерименту. Після отримання вибірки x ми оновлюємо наші переконання через теорему Баєса: pi(theta | x) = f(x | theta) * pi(theta) / int f(x | theta') pi(theta') dtheta' proportional to f(x | theta) * pi(theta). Тобто: Апостеріорний розподіл пропорційний Правдоподібності, помноженій на Апріорний розподіл! Спряженим апріорним (Conjugate prior) називається такий клас розподілів, для якого апостеріорний розподіл належить до того ж самого параметричного сімейства. Дві головні екзаменаційні спряжені пари: 1) Модель Beta-Binomial: Нехай X ~ Bin(n, theta), а апріорний розподіл theta ~ Beta(alpha, beta) з густиною theta^{alpha-1} (1-theta)^{beta-1}. Тоді апостеріорний розподіл: pi(theta | x) proportional to theta^x (1-theta)^{n-x} * theta^{alpha-1} (1-theta)^{beta-1} = theta^{(alpha+x)-1} (1-theta)^{(beta+n-x)-1}. Це знову Бета-розподіл Beta(alpha + x, beta + n - x)! Оцінка Баєса при квадратичних втратах — це апостеріорне середнє: theta_hat = (alpha + x) / (alpha + beta + n). 2) Модель Gamma-Poisson: Дані X_i ~ Poisson(lambda), апріорний lambda ~ Gamma(alpha, beta). Апостеріорний розподіл буде знову Gamma(alpha + sum X_i, beta + n).",
      "keyFormulas": [
        "\\pi(\\theta | x) \\propto f(x | \\theta) \\cdot \\pi(\\theta)",
        "\\text{Beta-Binomial: } \\theta | X \\sim \\text{Beta}(\\alpha + x, \\beta + n - x), \\quad \\hat{\\theta} = \\frac{\\alpha + x}{\\alpha + \\beta + n}"
      ],
      "examinerQuestions": [
        {
          "q": "Яка оцінка параметра theta мінімізує квадратичну функцію втрат L(theta, theta_hat) = (theta - theta_hat)^2?",
          "a": "Апостеріорне середнє E[theta | X]."
        },
        {
          "q": "Що відбувається з баєсівською оцінкою, коли розмір вибірки n прямує до нескінченності?",
          "a": "Вага апріорного розподілу прямує до нуля, і баєсівська оцінка збігається до класичної оцінки MLE (x/n). Дані повністю домінують над апріорними переконаннями."
        }
      ]
    }
  ],
  "PROBLEMS_BANK": [
    {
      "id": "p_t3_1",
      "title": "Тестові концептуальні питання (Midterm 3 Problem 1)",
      "source": "Midterm Exam 2024 / 2022",
      "topic": "Граничні теореми та Оцінювання",
      "points": 10,
      "question": "Розв'яжіть 5 концептуальних тестових завдань:\n\n1. Нехай $S_n$ — сума i.i.d. в.в. $X_1, \\dots, X_n$ з $E[X_i] = 0$ та $\\text{Var}(X_i) = 1$. Тоді $S_n / n$ при $n \\to \\infty$ збігається (оберіть всі правильні):\n(a) майже напевно, (b) за ймовірністю, (c) за розподілом.\n\n2. Збіжність за ймовірністю стверджується класичними теоремами:\n(a) WLLN, (b) SLLN, (c) CLT, (d) Poisson.\n\n3. Оцінка методу моментів для параметра $\\theta := \\mu^2$ при вибірці з середнім $\\mu$ дорівнює:\n(a) $\\bar{X}/\\sigma$, (b) $\\mu/S$, (c) $\\bar{X}/S$, (d) $\\bar{X}^2$.\n\n4. Наближений $99\\%$ довірчий інтервал для $\\theta := \\mu$, якщо $\\sigma^2$ невідома:\n(a) $\\bar{X} \\pm \\frac{S}{\\sqrt{n}} t_{0.995}^{(n-1)}$, (b) $\\bar{X} \\pm \\frac{\\sigma}{\\sqrt{n}} t_{0.995}^{(n-1)}$, (c) $\\bar{X} \\pm \\frac{S}{\\sqrt{n}} z_{0.99}$.\n\n5. Якщо збільшити обсяг вибірки $n$, довжина довірчого інтервалу:\n(a) зменшиться, (b) збільшиться, (c) не зміниться.",
      "solution": "**Повний академічний розв'язок:**\n\n1. **Збіжність $S_n / n$:**\n   - За SLLN (Колмогоров), оскільки $E[|X_i|] < \\infty$, $S_n/n \\xrightarrow{a.s.} 0$.\n   - Збіжність a.s. тягне збіжність за ймовірністю ($a.s. \\implies P$), тому $S_n/n \\xrightarrow{P} 0$.\n   - Збіжність за ймовірністю тягне збіжність за розподілом ($P \\implies d$), тому $S_n/n \\xrightarrow{d} 0$.\n   - **Відповідь:** (a), (b), (c) — всі три!\n\n2. **Теореми, що стверджують збіжність за ймовірністю:**\n   - WLLN (Слабкий закон) безпосередньо стверджує $\\bar{X}_n \\xrightarrow{P} \\mu$.\n   - SLLN стверджує $\\bar{X}_n \\xrightarrow{a.s.} \\mu$, що тягне $\\bar{X}_n \\xrightarrow{P} \\mu$.\n   - **Відповідь:** (a), (b).\n\n3. **Оцінка MME для $\\theta = \\mu^2$:**\n   - Перший момент $E[X] = \\mu$, вибірковий момент $\\bar{X}$. Отже $\\hat{\\mu} = \\bar{X}$, і $\\hat{\\theta}_{MM} = \\bar{X}^2$.\n   - **Відповідь:** (d) $\\bar{X}^2$.\n\n4. **$99\\%$ ДІ для $\\mu$ при невідомому $\\sigma^2$:**\n   - Замінюємо $\\sigma$ на $S$, статистика має розподіл Стьюдента $t_{n-1}$. Квантиль для $1-\\alpha=0.99$ є $t_{1-\\alpha/2} = t_{0.995}^{(n-1)}$.\n   - **Відповідь:** (a) $\\bar{X} \\pm \\frac{S}{\\sqrt{n}} t_{0.995}^{(n-1)}$.\n\n5. **Довжина ДІ при зростанні $n$:**\n   - Довжина дорівнює $2 \\cdot t_{0.995}^{(n-1)} \\frac{S}{\\sqrt{n}} = O(1/\\sqrt{n})$, тому зменшується.\n   - **Відповідь:** (a) зменшиться.",
      "inputPrompt": "Введіть правильні літери відповідей по порядку (напр. a,b,c; a,b; d; a; a):",
      "expectedAnswer": "a,b,c; a,b; d; a; a",
      "acceptableAnswers": [
        "a,b,c; a,b; d; a; a",
        "abc, ab, d, a, a",
        "1:abc 2:ab 3:d 4:a 5:a",
        "d",
        "a",
        "1"
      ]
    },
    {
      "id": "p_t3_2",
      "title": "Заповнення тверджень та формулювань (Midterm 3 Problem 2)",
      "source": "Midterm Exam 2024 / 2022",
      "topic": "Теоретичні формулювання",
      "points": 10,
      "question": "Доповніть фундаментальні формулювання курсу:\n\n1. Для i.i.d. в.в. $X_1, X_2, \\dots$ WLLN стверджує, що...\n2. Якщо $[a(X), b(X)]$ є $99\\%$ довірчим інтервалом для $\\theta$, то...\n3. Оцінювач $\\hat{\\theta}_n$ називається слушним (consistent), якщо...\n4. Якщо $X_1, \\dots, X_n$ — i.i.d. випадкові величини з експоненційним розподілом $E(\\lambda)$, то розподіл статистики $T(X) = X_1 + \\dots + X_n$ дорівнює...\n5. Для квантиля $z_\\alpha$ стандартного нормального розподілу рівня $\\alpha$, квантиль $z_{1-\\alpha}$ дорівнює...",
      "solution": "**Зразкові відповіді:**\n\n1. **WLLN:** Для будь-якого $\\varepsilon > 0$, $\\lim_{n \\to \\infty} P(|\\bar{X}_n - \\mu| \\ge \\varepsilon) = 0$, тобто $\\bar{X}_n \\xrightarrow{P} \\mu$.\n2. **$99\\%$ ДІ:** $P_\\theta(a(X) \\le \\theta \\le b(X)) = 0.99$ для всіх $\\theta \\in \\Theta$.\n3. **Слушність:** $\\hat{\\theta}_n \\xrightarrow{P} \\theta$ при $n \\to \\infty$, тобто $\\forall \\varepsilon > 0, \\lim P(|\\hat{\\theta}_n - \\theta| \\ge \\varepsilon) = 0$.\n4. **Сума експоненційних величин:** Гамма-розподіл $\\Gamma(n, \\lambda)$ (ерлангівський розподіл) з густиною $\\frac{\\lambda^n}{(n-1)!} x^{n-1} e^{-\\lambda x}$.\n5. **Симетрія нормального квантиля:** $z_{1-\\alpha} = -z_\\alpha$.",
      "inputPrompt": "Введіть назву розподілу суми експоненційних величин (пункт 4):",
      "expectedAnswer": "Gamma(n, lambda)",
      "acceptableAnswers": [
        "Gamma(n, lambda)",
        "Gamma(n,lambda)",
        "Гамма",
        "gamma",
        "Gamma",
        "Erlang",
        "Erlang(n, lambda)"
      ]
    },
    {
      "id": "p_t3_3",
      "title": "Границя ймовірностей та стартап Армана (Midterm 3 Problem 3)",
      "source": "Midterm Exam 2024 / 2022",
      "topic": "Центральна Гранична Теорема (ЦГТ)",
      "points": 20,
      "question": "IT-гуру Арман запускає стартап і залучає інвестиції. Щотижня він з однаковою ймовірністю $1/2$ залучає або 1000 грн ($X_i = 1$), або нічого ($X_i = 0$). Позначимо через $S_n$ суму (у тис. грн), яку Арман залучив за $n$ тижнів ($S_n = \\sum_{i=1}^n X_i$).\n\nЗнайдіть границю при $n \\to \\infty$ для трьох виразів (обґрунтуйте за допомогою ЦГТ):\n(a) $\\lim_{n \\to \\infty} P\\left(\\frac{n}{2} - 10 \\le S_n \\le \\frac{n}{2} + 10\\right)$\n(b) $\\lim_{n \\to \\infty} P\\left(\\frac{n}{2} - \\frac{n}{10} \\le S_n \\le \\frac{n}{2} + \\frac{n}{10}\\right)$\n(c) $\\lim_{n \\to \\infty} P\\left(\\frac{n}{2} - \\frac{\\sqrt{n}}{2} \\le S_n \\le \\frac{n}{2} + \\frac{\\sqrt{n}}{2}\\right)$",
      "solution": "**Повний математичний аналіз через ЦГТ:**\n\nКожна величина $X_i \\sim B(1, 1/2)$, отже $E[X_i] = 1/2$, $\\text{Var}(X_i) = 1/4$, $\\sigma = 1/2$.\nДля суми: $E[S_n] = n/2$, стандартне відхилення $\\sigma_{S_n} = \\sqrt{n}/2$.\nЗа Центральною граничною теоремою: $Z_n = \\frac{S_n - n/2}{\\sqrt{n}/2} \\xrightarrow{d} N(0, 1)$.\n\n**(a) Фіксований інтервал $[-10, 10]$:**\n$$P\\left(\\left|S_n - \\frac{n}{2}\\right| \\le 10\\right) = P\\left(|Z_n| \\le \\frac{10}{\\sqrt{n}/2}\\right) = P\\left(|Z_n| \\le \\frac{20}{\\sqrt{n}}\\right).$$\nОскільки $20/\\sqrt{n} \\to 0$ при $n \\to \\infty$, інтервал стискається в точку: $\\Phi(0) - \\Phi(0) = 0$.\n**Границя (a): 0.**\n\n**(b) Інтервал порядку $O(n)$ ($[-n/10, n/10]$):**\n$$P\\left(\\left|S_n - \\frac{n}{2}\\right| \\le \\frac{n}{10}\\right) = P\\left(|Z_n| \\le \\frac{n/10}{\\sqrt{n}/2}\\right) = P\\left(|Z_n| \\le \\frac{\\sqrt{n}}{5}\\right).$$\nОскільки $\\sqrt{n}/5 \\to \\infty$, границя дорівнює $\\Phi(\\infty) - \\Phi(-\\infty) = 1 - 0 = 1$.\n**Границя (b): 1.**\n\n**(c) Інтервал порядку $O(\\sqrt{n})$ ($[-\\sqrt{n}/2, \\sqrt{n}/2]$):**\n$$P\\left(\\left|S_n - \\frac{n}{2}\\right| \\le \\frac{\\sqrt{n}}{2}\\right) = P\\left(|Z_n| \\le \\frac{\\sqrt{n}/2}{\\sqrt{n}/2}\\right) = P(|Z_n| \\le 1).$$\nЗа ЦГТ це дорівнює $\\Phi(1) - \\Phi(-1) = 2\\Phi(1) - 1 \\approx 2(0.8413) - 1 = 0.6826$.\n**Границя (c): $2\\Phi(1) - 1 \\approx 0.6826$.**",
      "inputPrompt": "Введіть числове значення границі (c) (округліть до 2 знаків, напр. 0.68):",
      "expectedAnswer": "0.68",
      "acceptableAnswers": [
        "0.68",
        "0.6826",
        "0.683",
        "2Phi(1)-1",
        "2*Phi(1)-1",
        "0.6827"
      ]
    },
    {
      "id": "p_t3_4",
      "title": "Дискретне оцінювання: MME, MLE та слушність (Midterm 3 Problem 4)",
      "source": "Midterm Exam 2024 / 2022",
      "topic": "Точкове оцінювання параметрів",
      "points": 20,
      "question": "Нехай $X_1, \\dots, X_n$ — i.i.d. дискретні випадкові величини з PMF:\n$$P(X=1|\\theta) = \\frac{\\theta}{4}, \\quad P(X=2|\\theta) = \\frac{3\\theta}{4}, \\quad P(X=3|\\theta) = \\frac{1-\\theta}{3}, \\quad P(X=4|\\theta) = \\frac{2 - 2\\theta}{3},$$\nде $\\theta \\in (0, 1)$ — невідомий параметр.\n\n(a) Знайдіть оцінку методу моментів $\\hat{\\theta}_{MM}$.\n(b) Знайдіть оцінку максимальної вірогідності $\\hat{\\theta}_{ML}$.\n(c) Якщо для вибірки $n = 400$ вибіркове середнє дорівнює $\\bar{X} = 2$, обчисліть оцінку $\\hat{\\theta}_{MM}$.\n(d) Чи є оцінка $\\hat{\\theta}_{ML}$ слушною (consistent)? Доведіть.",
      "solution": "**Повний розв'язок:**\n\n**(a) Метод моментів $\\hat{\\theta}_{MM}$:**\nОбчислимо теоретичне математичне сподівання $E[X]$:\n$$E[X] = 1\\cdot\\frac{\\theta}{4} + 2\\cdot\\frac{3\\theta}{4} + 3\\cdot\\frac{1-\\theta}{3} + 4\\cdot\\frac{2(1-\\theta)}{3}$$\n$$= \\frac{7\\theta}{4} + (1 - \\theta) + \\frac{8 - 8\\theta}{3} = \\frac{11}{3} + \\theta\\left(\\frac{7}{4} - 1 - \\frac{8}{3}\\right) = \\frac{11}{3} - \\frac{23}{12}\\theta.$$\nПрирівнюємо до $\\bar{X}$: $\\bar{X} = \\frac{11}{3} - \\frac{23}{12}\\theta \\implies \\frac{23}{12}\\theta = \\frac{11}{3} - \\bar{X} = \\frac{44 - 12\\bar{X}}{12}$.\nЗвідси: $$\\hat{\\theta}_{MM} = \\frac{44 - 12\\bar{X}}{23}.$$\n\n**(b) Оцінка MLE $\\hat{\\theta}_{ML}$:**\nНехай $n_k = \\sum_{i=1}^n I(X_i = k)$ — кількість спостережень зі значенням $k$.\nФункція правдоподібності:\n$$L(\\theta) = \\left(\\frac{\\theta}{4}\\right)^{n_1} \\left(\\frac{3\\theta}{4}\\right)^{n_2} \\left(\\frac{1-\\theta}{3}\\right)^{n_3} \\left(\\frac{2(1-\\theta)}{3}\\right)^{n_4} \\propto \\theta^{n_1+n_2} (1-\\theta)^{n_3+n_4}.$$\nЛог-правдоподібність: $\\ell(\\theta) = (n_1+n_2)\\ln\\theta + (n_3+n_4)\\ln(1-\\theta) + \\text{const}$.\nДиференціюємо: $\\frac{d\\ell}{d\\theta} = \\frac{n_1+n_2}{\\theta} - \\frac{n_3+n_4}{1-\\theta} = 0 \\implies (n_1+n_2)(1-\\theta) = (n_3+n_4)\\theta$.\nОскільки $n_1+n_2+n_3+n_4 = n$:\n$$\\hat{\\theta}_{ML} = \\frac{n_1 + n_2}{n} = \\frac{1}{n} \\sum_{i=1}^n I(X_i \\in \\{1, 2\\}).$$\n\n**(c) Числове значення для $\\bar{X} = 2$:**\n$$\\hat{\\theta}_{MM} = \\frac{44 - 12(2)}{23} = \\frac{20}{23} \\approx 0.8696.$$\n\n**(d) Доведення слушності $\\hat{\\theta}_{ML}$:**\nПозначимо $Y_i = I(X_i \\in \\{1, 2\\})$. Величини $Y_i$ є i.i.d. Bernoullis з параметром успіху $p = P(X \\in \\{1, 2\\}) = \\frac{\\theta}{4} + \\frac{3\\theta}{4} = \\theta$.\nЗа Слабким законом великих чисел (WLLN), вибіркове середнє $\\bar{Y}_n = \\frac{n_1+n_2}{n}$ збігається за ймовірністю до $E[Y_1] = \\theta$.\nОтже, $\\hat{\\theta}_{ML} \\xrightarrow{P} \\theta$. Оцінювач строго слушний!",
      "inputPrompt": "Введіть оцінку theta_MM при X_bar = 2 як дріб (напр. 20/23) або десятковий дріб (0.87):",
      "expectedAnswer": "20/23",
      "acceptableAnswers": [
        "20/23",
        "0.87",
        "0.8696",
        "0.869",
        "20 / 23"
      ]
    },
    {
      "id": "p_t3_5",
      "title": "Нормальне оцінювання та ДІ Хі-квадрат (Midterm 3 Problem 5)",
      "source": "Midterm Exam 2024 / 2022",
      "topic": "MLE та Довірчі інтервали",
      "points": 20,
      "question": "Нехай $X_1, \\dots, X_n$ — i.i.d. випадкові величини з густиною\n$$f(x | \\theta) \\propto \\exp\\left\\{\\frac{6x - x^2}{2\\theta}\\right\\},$$\nз невідомим параметром $\\theta > 0$.\n\n(a) Ідентифікуйте цей розподіл явно (сім'я, параметри).\n(b) Знайдіть оцінку методу моментів $\\hat{\\theta}_{MM}$.\n(c) Знайдіть оцінку максимальної вірогідності $\\hat{\\theta}_{ML}$.\n(d) Доведіть, що оцінка $\\hat{\\theta}_{ML}$ є незміщеною та слушною.\n(e) Знайдіть точний $95\\%$ довірчий інтервал для $\\theta$.",
      "solution": "**Повний розв'язок:**\n\n**(a) Ідентифікація розподілу:**\nВиділимо повний квадрат у показнику експоненти:\n$$6x - x^2 = -(x^2 - 6x) = -((x - 3)^2 - 9) = -(x - 3)^2 + 9.$$\nТому $f(x|\\theta) \\propto \\exp\\left\\{-\\frac{(x - 3)^2}{2\\theta}\\right\\}$.\nЦе в точності **нормальний розподіл** $N(\\mu, \\sigma^2)$ із середнім $\\mu = 3$ та дисперсією $\\sigma^2 = \\theta$!\n\n**(b) Метод моментів $\\hat{\\theta}_{MM}$:**\nДля $N(3, \\theta)$ перший момент фіксований $E[X] = 3$. Використовуємо другий момент:\n$$E[X^2] = \\text{Var}(X) + (E[X])^2 = \\theta + 9.$$\nПрирівнюємо до $\\hat{m}_2 = \\frac{1}{n} \\sum X_i^2$:\n$$\\hat{\\theta}_{MM} = \\frac{1}{n} \\sum_{i=1}^n X_i^2 - 9.$$\n\n**(c) Оцінка MLE $\\hat{\\theta}_{ML}$:**\nГустина: $f(x|\\theta) = \\frac{1}{\\sqrt{2\\pi\\theta}} \\exp\\left\\{-\\frac{(x - 3)^2}{2\\theta}\\right\\}$.\nЛог-правдоподібність: $\\ell(\\theta) = -\\frac{n}{2}\\ln(2\\pi) - \\frac{n}{2}\\ln\\theta - \\frac{1}{2\\theta}\\sum_{i=1}^n (X_i - 3)^2$.\nДиференціюємо за $\\theta$: $\\frac{d\\ell}{d\\theta} = -\\frac{n}{2\\theta} + \\frac{1}{2\\theta^2}\\sum_{i=1}^n (X_i - 3)^2 = 0$.\nЗвідси: $$\\hat{\\theta}_{ML} = \\frac{1}{n} \\sum_{i=1}^n (X_i - 3)^2.$$\n\n**(d) Доведення незміщеності та слушності:**\n1. Незміщеність: $E[\\hat{\\theta}_{ML}] = \\frac{1}{n} \\sum_{i=1}^n E[(X_i - 3)^2] = \\frac{1}{n} \\cdot n \\text{Var}(X_1) = \\theta$. Оцінка строго незміщена!\n2. Слушність: Оскільки $X_i \\sim N(3, \\theta)$, $\\frac{X_i - 3}{\\sqrt{\\theta}} \\sim N(0, 1)$, отже $\\left(\\frac{X_i - 3}{\\sqrt{\\theta}}\\right)^2 \\sim \\chi_1^2$.\nДисперсія $\\text{Var}((X_i - 3)^2) = \\theta^2 \\text{Var}(\\chi_1^2) = 2\\theta^2$.\nТому $\\text{Var}(\\hat{\\theta}_{ML}) = \\frac{2\\theta^2}{n} \\to 0$ при $n \\to \\infty$. За Чебишовим, $\\hat{\\theta}_{ML} \\xrightarrow{P} \\theta$. Слушна!\n\n**(e) $95\\%$ Довірчий інтервал:**\nСтатистика $Q = \\frac{1}{\\theta} \\sum_{i=1}^n (X_i - 3)^2 = \\frac{n\\hat{\\theta}_{ML}}{\\theta}$ має розподіл Хі-квадрат $\\chi_n^2$ з $n$ ступенями вільності.\nОбираємо квантилі $\\chi^2_{\\alpha/2, n}$ та $\\chi^2_{1-\\alpha/2, n}$ такі, що $P(\\chi^2_{0.025, n} \\le Q \\le \\chi^2_{0.975, n}) = 0.95$.\nПідставляючи $Q$ та виражаючи $\\theta$, маємо точний $95\\%$ ДІ:\n$$\\left[ \\frac{\\sum_{i=1}^n (X_i - 3)^2}{\\chi^2_{0.975, n}}, \\; \\frac{\\sum_{i=1}^n (X_i - 3)^2}{\\chi^2_{0.025, n}} \\right].$$",
      "inputPrompt": "Введіть середнє значення mu ідентифікованого нормального розподілу N(mu, theta):",
      "expectedAnswer": "3",
      "acceptableAnswers": [
        "3",
        "mu=3",
        "3.0",
        "N(3, theta)"
      ]
    },
    {
      "id": "p_t3_6",
      "title": "Рівномірний розподіл U(0, a): MLE, CDF максимуму та ДІ (Midterm 3 Problem 6)",
      "source": "Midterm Exam 2024 / 2022",
      "topic": "MLE на межі носія та Точні ДІ",
      "points": 20,
      "question": "Нехай $X_1, \\dots, X_n$ — i.i.d. випадкові величини з рівномірним розподілом $U(0, a)$ з невідомим параметром $a > 0$.\n\n(a) Знайдіть оцінку максимальної вірогідності $\\hat{a}_{ML}$.\n(b) Знайдіть розподіл випадкових величин $Y_k = X_k / a$.\n(c) Використовуючи пункт (b), знайдіть функцію розподілу (CDF) випадкової величини $U = \\hat{a}_{ML} / a$.\n(d) На основі пункту (c) побудуйте точний $95\\%$ довірчий інтервал для параметра $a$.",
      "solution": "**Повний розв'язок:**\n\n**(a) Оцінка MLE $\\hat{a}_{ML}$:**\nГустина: $f(x|a) = \\frac{1}{a} I(0 \\le x \\le a)$.\nФункція правдоподібності: $L(a) = \\prod_{i=1}^n f(x_i|a) = \\frac{1}{a^n} I(0 \\le X_{(1)} \\le \\dots \\le X_{(n)} \\le a)$, де $X_{(n)} = \\max(X_1, \\dots, X_n)$.\nПри $a < X_{(n)}$ правдоподібність дорівнює 0. При $a \\ge X_{(n)}$, $L(a) = a^{-n}$ строго спадає за $a$.\nОтже, максимум досягається на лівій межі носія:\n$$\\hat{a}_{ML} = X_{(n)} = \\max(X_1, \\dots, X_n).$$\n\n**(b) Розподіл $Y_k = X_k / a$:**\nОскільки $X_k \\sim U(0, a)$, лінійне масштабування дає:\n$$P(Y_k \\le y) = P(X_k \\le ay) = \\frac{ay}{a} = y \\quad \\text{для } y \\in (0, 1).$$\nОтже, $Y_k \\sim U(0, 1)$ — стандартний рівномірний розподіл на $(0, 1)$.\n\n**(c) CDF величини $U = \\hat{a}_{ML} / a$:**\n$$U = \\frac{\\max(X_1, \\dots, X_n)}{a} = \\max\\left(\\frac{X_1}{a}, \\dots, \\frac{X_n}{a}\\right) = \\max(Y_1, \\dots, Y_n).$$\nОскільки $Y_i$ незалежні:\n$$F_U(u) = P(U \\le u) = P(Y_1 \\le u, \\dots, Y_n \\le u) = \\prod_{i=1}^n P(Y_i \\le u) = u^n \\quad \\text{для } u \\in (0, 1).$$\n\n**(d) Точний $95\\%$ довірчий інтервал:**\nВеличина $U = X_{(n)} / a$ є півотом, оскільки її розподіл $F_U(u) = u^n$ не залежить від параметра $a$!\nЗнайдемо межі $c_1, c_2$ такі, що $P(c_1 \\le X_{(n)}/a \\le c_2) = 0.95$.\nОскільки $X_{(n)} \\le a$ завжди ($U \\le 1$), природно обрати $c_2 = 1$.\nТоді $P(c_1 \\le U \\le 1) = 1 - F_U(c_1) = 1 - c_1^n = 0.95 \\implies c_1^n = 0.05 \\implies c_1 = (0.05)^{1/n}$.\nОтримуємо нерівність: $(0.05)^{1/n} \\le \\frac{X_{(n)}}{a} \\le 1$.\nПеревертаючи нерівність для $a$:\n$$X_{(n)} \\le a \\le \\frac{X_{(n)}}{(0.05)^{1/n}}.$$\nОтже, точний $95\\%$ ДІ для $a$: $$\\left[ X_{(n)}, \\; \\frac{X_{(n)}}{(0.05)^{1/n}} \\right].$$",
      "inputPrompt": "Введіть формулу оцінки MLE a_hat (напр. max(X_i) або X_(n)):",
      "expectedAnswer": "max(X_i)",
      "acceptableAnswers": [
        "max(X_i)",
        "X_(n)",
        "max(X)",
        "X_(n) = max(X_i)",
        "max X_i",
        "max"
      ]
    },
    {
      "id": "p_t3_7",
      "title": "Межа Чернова (Chernoff Bound): Загальний випадок та Нормальний хвіст",
      "source": "Colloquium 3 / Seminar 7 Problem 1",
      "topic": "Нерівності концентрації",
      "points": 15,
      "question": "Межа Чернова (Chernoff Bound) — потужний інструмент експоненційного оцінювання хвостів розподілів.\n\n(a) Доведіть, що для будь-якого $a$ та $s \\ge 0$ виконується:\n$$P(X \\ge a) \\le e^{-sa} M_X(s),$$\nде $M_X(s) = E[e^{sX}]$ — твірна функція моментів (MGF).\n(b) Доведіть, що $P(X \\ge a) \\le e^{-\\varphi(a)}$, де $\\varphi(a) = \\max_{s \\ge 0} \\{sa - \\ln M(s)\\}$.\n(c) Застосуйте результат до стандартної нормальної величини $X \\sim N(0, 1)$ для $a > 0$ і знайдіть точну межу Чернова.",
      "solution": "**Повний розв'язок:**\n\n**(a) Доведення:**\nОскільки експонента $e^{sx}$ строго зростає для $s > 0$, подія $\\{X \\ge a\\}$ еквівалентна події $\\{e^{sX} \\ge e^{sa}\\}$.\nОскільки $e^{sX} > 0$ завжди, застосовуємо нерівність Маркова:\n$$P(X \\ge a) = P(e^{sX} \\ge e^{sa}) \\le \\frac{E[e^{sX}]}{e^{sa}} = e^{-sa} M_X(s).$$\n\n**(b) Оптимізація:**\nОскільки нерівність справедлива для будь-якого $s \\ge 0$, вона зберігається і для інфімуму правої частини за $s \\ge 0$:\n$$P(X \\ge a) \\le \\inf_{s \\ge 0} \\left\\{ e^{-(sa - \\ln M(s))} \\right\\} = e^{-\\sup_{s \\ge 0} \\{sa - \\ln M(s)\\}} = e^{-\\varphi(a)}.$$\n\n**(c) Нормальний розподіл $X \\sim N(0, 1)$:**\nДля $N(0, 1)$ твірна функція моментів $M(s) = e^{s^2 / 2}$, отже $\\ln M(s) = s^2 / 2$.\nМаксимізуємо $g(s) = sa - s^2/2$ за $s \\ge 0$:\n$g'(s) = a - s = 0 \\implies s^* = a > 0$.\nМаксимум: $\\varphi(a) = a(a) - a^2/2 = a^2 / 2$.\nПідставляючи в формулу Чернова, отримуємо:\n$$P(X \\ge a) \\le e^{-a^2 / 2}.$$\nДля порівняння: при $a = 3$, межа Чернова дає $e^{-4.5} \\approx 0.0111$, тоді як Чебишов дає лише $1/9 \\approx 0.111$ (у 10 разів слабша!).",
      "inputPrompt": "Введіть аналітичний вираз межі Чернова для X ~ N(0,1) через a (напр. e^{-a^2/2}):",
      "expectedAnswer": "e^{-a^2/2}",
      "acceptableAnswers": [
        "e^{-a^2/2}",
        "exp(-a^2/2)",
        "e^(-a^2/2)",
        "exp(-0.5*a^2)"
      ]
    },
    {
      "id": "p_t3_8",
      "title": "Баєсівська монета: Спряжений розподіл Beta-Binomial",
      "source": "Colloquium 3 Problem 18",
      "topic": "Баєсівське оцінювання",
      "points": 15,
      "question": "Маємо монету з невідомою ймовірністю випадання герба $\\theta \\in (0, 1)$. Апріорно вважається, що $\\theta$ має густину $\\pi(\\theta) = 6\\theta(1-\\theta)$ на $(0, 1)$. Підкинувши монету $n = 10$ разів, ми отримали $k = 7$ гербів.\n\n(a) Знайдіть апостеріорну густину $\\pi(\\theta | x)$ та ідентифікуйте цей розподіл (сім'я, параметри).\n(b) Знайдіть оцінку Баєса для $\\theta$ при квадратичній функції втрат.",
      "solution": "**Повний розв'язок:**\n\n**(a) Апостеріорний розподіл:**\nАпріорний розподіл: $\\pi(\\theta) = 6\\theta^{2-1}(1-\\theta)^{2-1}$ є Бета-розподілом $\\text{Beta}(\\alpha=2, \\beta=2)$.\nПравдоподібність для 10 підкидань та 7 гербів:\n$$L(\\theta) = \\binom{10}{7} \\theta^7 (1-\\theta)^{10-7} \\propto \\theta^7 (1-\\theta)^3.$$\nЗа теоремою Баєса:\n$$\\pi(\\theta | x) \\propto L(\\theta) \\pi(\\theta) \\propto \\theta^7 (1-\\theta)^3 \\cdot \\theta(1-\\theta) = \\theta^8 (1-\\theta)^4.$$\nМи впізнаємо ядро Бета-розподілу $\\text{Beta}(\\alpha', \\beta')$, де:\n$\\alpha' - 1 = 8 \\implies \\alpha' = 9$, $\\beta' - 1 = 4 \\implies \\beta' = 5$.\nОтже, апостеріорний розподіл є **$\\text{Beta}(9, 5)$** з густиною:\n$$\\pi(\\theta | x) = \\frac{\\theta^8 (1-\\theta)^4}{B(9, 5)}.$$\n\n**(b) Оцінка Баєса під квадратичну функцію втрат:**\nПри квадратичній функції втрат оцінка Баєса є апостеріорним середнім:\n$$\\hat{\\theta}_{Bayes} = E[\\theta | X] = \\frac{\\alpha'}{\\alpha' + \\beta'} = \\frac{9}{9 + 5} = \\frac{9}{14} \\approx 0.6429.$$\n(Зверніть увагу: звичайна оцінка MLE дорівнює $7/10 = 0.70$. Баєсівська оцінка $9/14 \\approx 0.643$ зміщена в бік апріорного середнього $0.5$!).",
      "inputPrompt": "Введіть оцінку Баєса theta_Bayes у вигляді звичайного дробу (напр. 9/14):",
      "expectedAnswer": "9/14",
      "acceptableAnswers": [
        "9/14",
        "9 / 14",
        "0.643",
        "0.6429",
        "0.64"
      ]
    },
    {
      "id": "p_t3_9",
      "title": "Авіакомпанія та овербукінг: Апроксимація через ЦГТ",
      "source": "Colloquium 3 Further Problems 1",
      "topic": "ЦГТ на практиці",
      "points": 15,
      "question": "З досвіду менеджери авіакомпанії знають, що в середньому лише $90\\%$ пасажирів ($p = 0.9$), які забронювали квиток, з'являються на рейс. Рішення пасажирів вважаються незалежними.\n\n(a) На рейс із 300 місць продано 324 квитки. Яка ймовірність того, що рейс буде переповнений (явиться більше 300 пасажирів)?\n(b) Скільки квитків $n$ може продати авіакомпанія на літак зі 144 місцями, щоб з імовірністю $99\\%$ ($1-\\alpha = 0.99$) усі пасажири помістилися?",
      "solution": "**Повний розв'язок:**\n\n**(a) Ймовірність овербукінгу для 324 квитків на 300 місць:**\nКількість пасажирів $S_{324} \\sim B(n=324, p=0.9)$.\nПараметри: $\\mu = 324 \\cdot 0.9 = 291.6$, $\\sigma^2 = 324 \\cdot 0.9 \\cdot 0.1 = 29.16 \\implies \\sigma = 5.4$.\nРейс переповнений, якщо $S_{324} \\ge 301$. З поправкою на неперервність ($S \\ge 300.5$):\n$$P(S_{324} \\ge 300.5) = P\\left(Z \\ge \\frac{300.5 - 291.6}{5.4}\\right) = P\\left(Z \\ge \\frac{8.9}{5.4}\\right) = P(Z \\ge 1.648).$$\nЗа таблицею стандартного нормального розподілу: $1 - \\Phi(1.65) = 1 - 0.9505 = 0.0495 \\approx 4.95\\%$.\n\n**(b) Кількість квитків для літака на 144 місця:**\nПотрібно, щоб $P(S_n \\le 144) \\ge 0.99$.\nДля $n$ квитків: $E[S_n] = 0.9n$, $\\sigma = \\sqrt{0.09n} = 0.3\\sqrt{n}$.\nСтандартизуємо: $P\\left(Z \\le \\frac{144.5 - 0.9n}{0.3\\sqrt{n}}\\right) \\ge 0.99$.\nКвантиль рівня 0.99 стандартного нормального розподілу дорівнює $z_{0.99} = 2.326$.\nРівняння: $\\frac{144.5 - 0.9n}{0.3\\sqrt{n}} \\ge 2.326 \\implies 144.5 - 0.9n \\ge 0.698\\sqrt{n}$.\nПозначимо $u = \\sqrt{n}$: $0.9u^2 + 0.698u - 144.5 \\le 0$.\nКорені квадратного рівняння: $u = \\frac{-0.698 + \\sqrt{0.487 + 520.2}}{1.8} = \\frac{-0.698 + 22.819}{1.8} \\approx 12.289$.\nТоді $n = u^2 \\approx 12.289^2 \\approx 151.02$.\nОтже, компанія може продати щонайбільше **151 квиток**!",
      "inputPrompt": "Введіть максимальну кількість квитків n для пункту (b):",
      "expectedAnswer": "151",
      "acceptableAnswers": [
        "151",
        "150",
        "151 квиток",
        "n=151"
      ]
    },
    {
      "id": "p_t3_10",
      "title": "Порівняння меж для Пуассона: Марков, Чебишов, Кантеллі та ЦГТ",
      "source": "Colloquium 3 Seminar 7 Problem 2",
      "topic": "Нерівності концентрації",
      "points": 15,
      "question": "Нехай $X$ — випадкова величина з розподілом Пуассона $\\text{Poisson}(\\lambda = 10)$ ($E[X]=10, \\text{Var}(X)=10$).\n\n(a) Застосуйте нерівність Маркова, щоб знайти верхню межу для $p_1 = P(X \\ge 40)$.\n(b) Застосуйте двосторонню нерівність Чебишова та односторонню нерівність Кантеллі для $p_1$.\n(c) Знайдіть наближене значення $p_1$ за допомогою Центральної Граничної Теореми (ЦГТ).",
      "solution": "**Повний розв'язок:**\n\n**(a) Нерівність Маркова:**\nОскільки $X \\ge 0$ та $a = 40 > 0$:\n$$P(X \\ge 40) \\le \\frac{E[X]}{40} = \\frac{10}{40} = 0.25.$$\n\n**(b) Нерівності Чебишова та Кантеллі:**\n1. Двосторонній Чебишов ($c = 30$): $P(|X - 10| \\ge 30) \\le \\frac{\\sigma^2}{30^2} = \\frac{10}{900} = \\frac{1}{90} \\approx 0.0111$.\n2. Односторонній Кантеллі ($c = 30$):\n$$P(X - 10 \\ge 30) \\le \\frac{\\sigma^2}{\\sigma^2 + c^2} = \\frac{10}{10 + 900} = \\frac{10}{910} = \\frac{1}{91} \\approx 0.01099.$$\n(Кантеллі дає строгішу межу, ніж двосторонній Чебишов!)\n\n**(c) Апроксимація через ЦГТ:**\nЗа ЦГТ $X \\approx N(10, 10)$, $\\sigma = \\sqrt{10} \\approx 3.162$.\nЗ поправкою на неперервність ($X \\ge 39.5$):\n$$P(X \\ge 39.5) = P\\left(Z \\ge \\frac{39.5 - 10}{\\sqrt{10}}\\right) = P\\left(Z \\ge \\frac{29.5}{3.162}\\right) = P(Z \\ge 9.33) \\approx 0.$$\nІстинне значення в Пуассоні: $\\approx 1.2 \\times 10^{-11}$.",
      "inputPrompt": "Введіть межу Маркова для P(X >= 40) як десятковий дріб (напр. 0.25):",
      "expectedAnswer": "0.25",
      "acceptableAnswers": [
        "0.25",
        "1/4",
        "0,25"
      ]
    },
    {
      "id": "p_t3_11",
      "title": "Сума 120 рівномірних величин U(0, 1) та хвости",
      "source": "Colloquium 3 Seminar 7 Problem 3",
      "topic": "ЦГТ та межі",
      "points": 15,
      "question": "Нехай $U_1, U_2, \\dots, U_{120}$ — i.i.d. випадкові величини з розподілом $U(0, 1)$, і нехай $X = U_1 + \\dots + U_{120}$.\n\n(a) Знайдіть $E[X]$ та $\\text{Var}(X)$.\n(b) Застосуйте нерівність Маркова, щоб знайти верхню межу для $p = P(X \\ge 80)$.\n(c) Застосуйте нерівність Чебишова та Кантеллі для оцінки $p$.\n(d) До якого відомого розподілу дуже близький розподіл $X$? Сформулюйте теорему, яка це обґрунтовує.",
      "solution": "**Повний розв'язок:**\n\n**(a) Математичне сподівання та дисперсія:**\nДля кожного $U_i \\sim U(0, 1)$: $E[U_i] = 1/2$, $\\text{Var}(U_i) = 1/12$.\nДля суми 120 незалежних величин:\n$$E[X] = 120 \\times \\frac{1}{2} = 60.$$\n$$\\text{Var}(X) = 120 \\times \\frac{1}{12} = 10 \\implies \\sigma = \\sqrt{10} \\approx 3.162.$$\n\n**(b) Нерівність Маркова:**\n$$P(X \\ge 80) \\le \\frac{E[X]}{80} = \\frac{60}{80} = \\frac{3}{4} = 0.75.$$\n\n**(c) Нерівність Чебишова та Кантеллі:**\nВідхилення $c = 80 - 60 = 20$.\n- Двосторонній Чебишов: $P(|X - 60| \\ge 20) \\le \\frac{\\sigma^2}{20^2} = \\frac{10}{400} = 0.025$.\n- Односторонній Кантеллі: $P(X - 60 \\ge 20) \\le \\frac{10}{10 + 400} = \\frac{10}{410} \\approx 0.0244$.\n\n**(d) Граничний розподіл та теорема:**\nЗа **Центральною Граничною Теоремою (Ліндеберга-Леві)**, оскільки $n = 120$ є великим, розподіл $X$ дуже близький до **Нормального розподілу** $N(\\mu = 60, \\sigma^2 = 10)$.",
      "inputPrompt": "Введіть E[X] (математичне сподівання суми 120 величин):",
      "expectedAnswer": "60",
      "acceptableAnswers": [
        "60",
        "60.0",
        "E[X]=60"
      ]
    },
    {
      "id": "p_t3_12",
      "title": "Фабрика гаджетів: Обсяг вибірки та час першого перевищення",
      "source": "Colloquium 3 Seminar 7 Problem 4",
      "topic": "ЦГТ на практиці",
      "points": 20,
      "question": "Фабрика щодня виробляє $X_n$ гаджетів, де $X_n$ — незалежні однаково розподілені в.в. із середнім $\\mu = 4$ та дисперсією $\\sigma^2 = 25$.\n\n(a) Знайдіть наближену ймовірність того, що загальна кількість гаджетів за 100 днів буде меншою за 400.\n(b) Знайдіть приблизно найбільше $n$, при якому $P(X_1 + \\dots + X_n > 200 + 4n) < 0.05$.\n(c) Нехай $N$ — перший день, коли загальна кількість виготовлених гаджетів перевищить 1000. Обчисліть наближено $P(N > 220)$.",
      "solution": "**Повний розв'язок:**\n\n**(a) Ймовірність для 100 днів $P(S_{100} < 400)$:**\nСума $S_{100}$: $E[S_{100}] = 100 \\times 4 = 400$, $\\sigma = \\sqrt{100 \\times 25} = 50$.\nЗа ЦГТ $\\frac{S_{100} - 400}{50} \\approx N(0, 1)$.\n$$P(S_{100} < 400) = P(Z < 0) = \\Phi(0) = 0.5.$$\n\n**(b) Найбільше $n$:**\n$$P(S_n - 4n > 200) = P\\left(Z > \\frac{200}{5\\sqrt{n}}\\right) = P\\left(Z > \\frac{40}{\\sqrt{n}}\\right) < 0.05.$$\nДля стандартного нормального розподілу $P(Z > z_{0.95}) = 0.05$, де $z_{0.95} = 1.645$.\nОтже $\\frac{40}{\\sqrt{n}} \\ge 1.645 \\implies \\sqrt{n} \\le \\frac{40}{1.645} \\approx 24.316 \\implies n \\le 24.316^2 \\approx 591.28$.\nНайбільше ціле $n$: **591 день**.\n\n**(c) Ймовірність $P(N > 220)$:**\nПодія $\\{N > 220\\}$ (перший день перевищення настав після 220 дня) означає, що за перші 220 днів вироблено НЕ більше 1000 гаджетів: $\\{S_{220} \\le 1000\\}$.\nДля $n = 220$: $E[S_{220}] = 220 \\times 4 = 880$, $\\sigma = 5\\sqrt{220} \\approx 74.162$.\n$$P(S_{220} \\le 1000) = P\\left(Z \\le \\frac{1000 - 880}{74.162}\\right) = P\\left(Z \\le \\frac{120}{74.162}\\right) = P(Z \\le 1.618).$$\nЗа таблицею $\\Phi(1.62) \\approx 0.9474$ (близько $94.7\\%$).",
      "inputPrompt": "Введіть максимальне ціле n для пункту (b):",
      "expectedAnswer": "591",
      "acceptableAnswers": [
        "591",
        "591 день",
        "n=591"
      ]
    },
    {
      "id": "p_t3_13",
      "title": "Екстремуми рівномірних величин та Експоненційна границя",
      "source": "Colloquium 3 Seminar 7 Problem 5",
      "topic": "Асимптотика та види збіжності",
      "points": 15,
      "question": "Нехай $X_1, X_2, \\dots$ — i.i.d. випадкові величини з рівномірним розподілом $U(0, 1)$, і нехай $Z_n = \\max(X_1, \\dots, X_n)$.\n\n(a) Доведіть, що $Z_n \\xrightarrow{P} 1$ при $n \\to \\infty$.\n(b) Нехай $U_n = n(1 - Z_n)$. Доведіть, що $U_n$ збігається за розподілом до експоненційного розподілу $\\text{Exp}(1)$.\n(c) Розглянемо послідовність добутків $Y_n = X_1 X_2 \\cdots X_n$. Покажіть, що $Y_n \\xrightarrow{P} 0$ за допомогою нерівності Маркова.",
      "solution": "**Повний розв'язок:**\n\n**(a) Збіжність за ймовірністю $Z_n \\xrightarrow{P} 1$:**\nФункція розподілу максимуму: $F_{Z_n}(z) = P(Z_n \\le z) = z^n$ для $z \\in (0, 1)$.\nДля будь-якого $\\varepsilon \\in (0, 1)$:\n$$P(|Z_n - 1| \\ge \\varepsilon) = P(Z_n \\le 1 - \\varepsilon) = (1 - \\varepsilon)^n.$$\nОскільки $0 < 1 - \\varepsilon < 1$, границя при $n \\to \\infty$ дорівнює 0.\nОтже, $Z_n \\xrightarrow{P} 1$ за ймовірністю!\n\n**(b) Експоненційна границя для $U_n = n(1 - Z_n)$:**\nДля $x > 0$:\n$$P(U_n \\le x) = P\\left(n(1 - Z_n) \\le x\\right) = P\\left(Z_n \\ge 1 - \\frac{x}{n}\\right) = 1 - P\\left(Z_n < 1 - \\frac{x}{n}\\right).$$\nПідставляючи CDF максимуму:\n$$P(U_n \\le x) = 1 - \\left(1 - \\frac{x}{n}\\right)^n.$$\nЗа класичною границею $\\lim_{n \\to \\infty} (1 - x/n)^n = e^{-x}$.\nТому для всіх $x > 0$:\n$$\\lim_{n \\to \\infty} P(U_n \\le x) = 1 - e^{-x}.$$\nЦе функція розподілу експоненційної величини $\\text{Exp}(\\lambda = 1)$! Отже, $U_n \\xrightarrow{d} \\text{Exp}(1)$.\n\n**(c) Добуток $Y_n = X_1 \\cdots X_n$:**\nОскільки $X_i$ незалежні та $E[X_i] = 1/2$:\n$$E[Y_n] = E[X_1] \\cdots E[X_n] = \\left(\\frac{1}{2}\\right)^n.$$\nЗастосуємо нерівність Маркова ($Y_n \\ge 0$): для будь-якого $\\varepsilon > 0$,\n$$P(Y_n \\ge \\varepsilon) \\le \\frac{E[Y_n]}{\\varepsilon} = \\frac{(1/2)^n}{\\varepsilon} \\xrightarrow{n \\to \\infty} 0.$$\nОтже, $Y_n \\xrightarrow{P} 0$ за ймовірністю!",
      "inputPrompt": "Введіть параметр lambda граничного експоненційного розподілу Exp(lambda) для пункту (b):",
      "expectedAnswer": "1",
      "acceptableAnswers": [
        "1",
        "lambda=1",
        "1.0",
        "Exp(1)"
      ]
    },
    {
      "id": "p_t3_14",
      "title": "Баєсівський аналіз: Час життя батареї та зрізаний експоненційний розподіл",
      "source": "Colloquium 3 Problem 19",
      "topic": "Баєсівське оцінювання",
      "points": 15,
      "question": "Час роботи батареї є випадковою величиною з густиною $f(x | \\theta) = \\exp(-(x - \\theta))$ при $0 < \\theta < x$ та 0 інакше.\nПараметр $\\theta$ має апріорний розподіл з густиною $\\pi(\\theta) = 2\\exp(-2\\theta)$ при $\\theta > 0$.\n\n(a) Знайдіть апостеріорну густину $\\pi(\\theta | x)$ для одного спостереження $x$.\n(b) Знайдіть оцінку Баєса для $\\theta$ під квадратичну функцію втрат.",
      "solution": "**Повний розв'язок:**\n\n**(a) Апостеріорна густина:**\nСпільна густина спостереження $x$ та параметра $\\theta$:\n$$f(x, \\theta) = f(x | \\theta) \\pi(\\theta) = e^{-(x - \\theta)} \\cdot 2e^{-2\\theta} I(0 < \\theta < x) = 2e^{-x} e^{-\\theta} I(0 < \\theta < x).$$\nМаргінальна густина $m(x)$:\n$$m(x) = \\int_0^x 2e^{-x} e^{-\\theta} d\\theta = 2e^{-x} [1 - e^{-x}].$$\nАпостеріорна густина за теоремою Баєса:\n$$\\pi(\\theta | x) = \\frac{2e^{-x} e^{-\\theta}}{2e^{-x} [1 - e^{-x}]} = \\frac{e^{-\\theta}}{1 - e^{-x}} \\quad \\text{для } 0 < \\theta < x.$$\nЦе зрізаний експоненційний розподіл на інтервалі $(0, x)$!\n\n**(b) Оцінка Баєса під квадратичну функцію втрат:**\nОцінка Баєса є апостеріорним математичним сподіванням $E[\\theta | x]$:\n$$E[\\theta | x] = \\int_0^x \\theta \\frac{e^{-\\theta}}{1 - e^{-x}} d\\theta = \\frac{1}{1 - e^{-x}} \\int_0^x \\theta e^{-\\theta} d\\theta.$$\nІнтегруємо частинами: $\\int_0^x \\theta e^{-\\theta} d\\theta = \\left[ -\\theta e^{-\\theta} - e^{-\\theta} \\right]_0^x = 1 - (1 + x)e^{-x}$.\nПідставляючи, отримуємо:\n$$\\hat{\\theta}_{Bayes} = \\frac{1 - e^{-x}(1 + x)}{1 - e^{-x}} = 1 - \\frac{x e^{-x}}{1 - e^{-x}} = 1 - \\frac{x}{e^x - 1}.$$\n(При $x \\to \\infty$ ця оцінка прямує до 1; при $x \\to 0$ вона прямує до 0).",
      "inputPrompt": "Введіть границю оцінки theta_Bayes при x -> infty (напр. 1):",
      "expectedAnswer": "1",
      "acceptableAnswers": [
        "1",
        "1.0",
        "theta=1"
      ]
    },
    {
      "id": "p_t3_15",
      "title": "Напівпровідникові чіпи: Спряжена пара Gamma-Poisson",
      "source": "Colloquium 3 Further Problem 6",
      "topic": "Баєсівське оцінювання",
      "points": 15,
      "question": "Час життя комп'ютерних чіпів має експоненційний розподіл з параметром $\\lambda$ ($f(x|\\lambda) = \\lambda e^{-\\lambda x}$).\nАпріорний розподіл для $\\lambda$ є Гамма-розподілом $\\Gamma(\\alpha=3, \\beta=1)$ з густиною $g(\\lambda) = \\frac{\\lambda^2 e^{-\\lambda}}{2}$ для $\\lambda > 0$.\nПротестувавши вибірку з $n = 20$ чіпів, отримали середній час життя $\\bar{x} = 4.6$ години (отже $\\sum_{i=1}^{20} x_i = 92$).\n\n(a) Знайдіть апостеріорний розподіл $\\pi(\\lambda | x)$ та його параметри.\n(b) Знайдіть оцінку Баєса для $\\lambda$ при квадратичній функції втрат.",
      "solution": "**Повний розв'язок:**\n\n**(a) Апостеріорний розподіл:**\nПравдоподібність для вибірки обсягу $n=20$ зі сумою $\\sum x_i = 92$:\n$$L(\\lambda) = \\prod_{i=1}^{20} \\lambda e^{-\\lambda x_i} = \\lambda^{20} e^{-\\lambda \\sum x_i} = \\lambda^{20} e^{-92\\lambda}.$$\nАпріорна густина: $\\pi(\\lambda) = \\frac{\\lambda^{3-1} e^{-1\\cdot\\lambda}}{\\Gamma(3)} \\propto \\lambda^2 e^{-\\lambda}$.\nЗа теоремою Баєса:\n$$\\pi(\\lambda | x) \\propto L(\\lambda) \\pi(\\lambda) = \\lambda^{20} e^{-92\\lambda} \\cdot \\lambda^2 e^{-\\lambda} = \\lambda^{22} e^{-93\\lambda}.$$\nМи впізнаємо ядро Гамма-розподілу $\\Gamma(\\alpha', \\beta')$, де:\n$\\alpha' - 1 = 22 \\implies \\alpha' = 23$.\n$\\beta' = 93$.\nОтже, апостеріорний розподіл є **$\\Gamma(\\alpha' = 23, \\; \\beta' = 93)$**!\n\n**(b) Оцінка Баєса:**\nПри квадратичній функції втрат оцінкою Баєса є апостеріорне математичне сподівання:\n$$\\hat{\\lambda}_{Bayes} = E[\\lambda | x] = \\frac{\\alpha'}{\\beta'} = \\frac{23}{93} \\approx 0.2473.$$\n(Для порівняння: класична оцінка MLE дорівнює $1 / \\bar{x} = 1 / 4.6 = 20 / 92 \\approx 0.2174$. Баєсівська оцінка зміщує її в бік апріорного середнього $\\alpha/\\beta = 3/1 = 3$).",
      "inputPrompt": "Введіть оцінку Баєса lambda_Bayes у вигляді звичайного дробу (напр. 23/93):",
      "expectedAnswer": "23/93",
      "acceptableAnswers": [
        "23/93",
        "23 / 93",
        "0.247",
        "0.2473"
      ]
    }
  ],
  "DISTRIBUTIONS_DATA": [
    {
      "name": "Standard Normal N(0, 1)",
      "type": "Continuous / Limiting",
      "parameters": "\\mu = 0, \\; \\sigma^2 = 1",
      "support": "\\mathbb{R}",
      "pmf_pdf": "\\phi(z) = \\frac{1}{\\sqrt{2\\pi}} e^{-z^2/2}",
      "mean": "0",
      "variance": "1",
      "pgf": "—",
      "mgf": "e^{t^2/2}",
      "keyProperty": "CLT limit. Quantiles: z_{0.95} = 1.645, z_{0.975} = 1.96, z_{0.995} = 2.576. Symmetry: z_{1-p} = -z_p."
    },
    {
      "name": "Student's t Distribution (t_k)",
      "type": "Continuous / Sampling",
      "parameters": "k \\text{ (degrees of freedom)}",
      "support": "\\mathbb{R}",
      "pmf_pdf": "\\frac{\\Gamma((k+1)/2)}{\\sqrt{k\\pi}\\Gamma(k/2)} \\left(1 + \\frac{t^2}{k}\\right)^{-(k+1)/2}",
      "mean": "0 \\; (k > 1)",
      "variance": "\\frac{k}{k-2} \\; (k > 2)",
      "pgf": "—",
      "mgf": "Не існує для всіх t",
      "keyProperty": "Constructed as Z / \\sqrt{V/k} where Z ~ N(0,1), V ~ \\chi_k^2. Used for CI of \\mu when \\sigma is unknown. Heavier tails than normal; t_k \\to N(0,1) as k \\to \\infty."
    },
    {
      "name": "Chi-Squared Distribution (\\chi_k^2)",
      "type": "Continuous / Sampling",
      "parameters": "k \\text{ (degrees of freedom)}",
      "support": "(0, \\infty)",
      "pmf_pdf": "\\frac{1}{2^{k/2}\\Gamma(k/2)} x^{k/2 - 1} e^{-x/2}",
      "mean": "k",
      "variance": "2k",
      "pgf": "—",
      "mgf": "(1 - 2t)^{-k/2} \\; (t < 1/2)",
      "keyProperty": "Sum of k squared independent standard normals: \\sum_{i=1}^k Z_i^2 ~ \\chi_k^2. Sample variance: (n-1)S^2 / \\sigma^2 ~ \\chi_{n-1}^2."
    },
    {
      "name": "Fisher-Snedecor (F_{d1, d2})",
      "type": "Continuous / Sampling",
      "parameters": "d_1, d_2 \\text{ degrees of freedom}",
      "support": "(0, \\infty)",
      "pmf_pdf": "\\frac{1}{B(d_1/2, d_2/2)} \\left(\\frac{d_1}{d_2}\\right)^{d_1/2} \\frac{x^{d_1/2 - 1}}{(1 + \\frac{d_1}{d_2}x)^{(d_1+d_2)/2}}",
      "mean": "\\frac{d_2}{d_2 - 2} \\; (d_2 > 2)",
      "variance": "\\frac{2 d_2^2(d_1+d_2-2)}{d_1(d_2-2)^2(d_2-4)}",
      "pgf": "—",
      "mgf": "—",
      "keyProperty": "Ratio of two independent chi-squared variables divided by df: (U_1/d_1) / (U_2/d_2). Used to compare variances S_1^2 / S_2^2."
    },
    {
      "name": "Beta Distribution Beta(\\alpha, \\beta)",
      "type": "Continuous / Bayesian",
      "parameters": "\\alpha > 0, \\; \\beta > 0",
      "support": "(0, 1)",
      "pmf_pdf": "\\frac{1}{B(\\alpha, \\beta)} x^{\\alpha - 1} (1-x)^{\\beta - 1}",
      "mean": "\\frac{\\alpha}{\\alpha + \\beta}",
      "variance": "\\frac{\\alpha\\beta}{(\\alpha+\\beta)^2(\\alpha+\\beta+1)}",
      "pgf": "—",
      "mgf": "1 + \\sum_{k=1}^\\infty \\frac{t^k}{k!} \\prod_{r=0}^{k-1} \\frac{\\alpha+r}{\\alpha+\\beta+r}",
      "keyProperty": "Conjugate prior for Binomial likelihood. If X ~ Bin(n, \\theta) and \\theta ~ Beta(\\alpha, \\beta), then \\theta|X ~ Beta(\\alpha+x, \\beta+n-x)."
    },
    {
      "name": "Gamma Distribution Gamma(\\alpha, \\beta)",
      "type": "Continuous / Bayesian",
      "parameters": "\\alpha > 0 \\text{ (shape)}, \\; \\beta > 0 \\text{ (rate)}",
      "support": "(0, \\infty)",
      "pmf_pdf": "\\frac{\\beta^\\alpha}{\\Gamma(\\alpha)} x^{\\alpha-1} e^{-\\beta x}",
      "mean": "\\alpha / \\beta",
      "variance": "\\alpha / \\beta^2",
      "pgf": "—",
      "mgf": "(1 - t/\\beta)^{-\\alpha} \\; (t < \\beta)",
      "keyProperty": "Sum of \\alpha independent Exp(\\beta) variables. Conjugate prior for Poisson rate: if X_i ~ Poisson(\\lambda), \\lambda|X ~ Gamma(\\alpha + \\sum X_i, \\beta + n)."
    },
    {
      "name": "Sample Mean Statistic (\\bar{X}_n)",
      "type": "Statistic / Estimator",
      "parameters": "n, \\; \\mu, \\; \\sigma^2",
      "support": "\\mathbb{R}",
      "pmf_pdf": "Exact: N(\\mu, \\sigma^2/n) if parent is normal; approx via CLT.",
      "mean": "\\mu",
      "variance": "\\sigma^2 / n",
      "pgf": "—",
      "mgf": "[M_X(t/n)]^n",
      "keyProperty": "Unbiased, consistent, efficient estimator of \\mu. SE = \\sigma / \\sqrt{n}."
    },
    {
      "name": "Sample Variance Statistic (S^2)",
      "type": "Statistic / Estimator",
      "parameters": "n, \\; \\sigma^2",
      "support": "(0, \\infty)",
      "pmf_pdf": "(n-1)S^2 / \\sigma^2 \\sim \\chi_{n-1}^2 \\text{ (for normal sample)}",
      "mean": "\\sigma^2",
      "variance": "\\frac{2\\sigma^4}{n-1} \\text{ (normal)}",
      "pgf": "—",
      "mgf": "—",
      "keyProperty": "Unbiased estimator of \\sigma^2 due to Bessel's n-1 divisor. Independent of \\bar{X} for normal samples (Fisher's theorem)."
    }
  ],
  "QUIZ_QUESTIONS": [
    {
      "id": "t7_q1",
      "topicId": 7,
      "topic": "Topic 7: Limit Theorems (LLN & CLT)",
      "question": "Let r.v.  \\(X_n\\) have binomial distribution \\(\\mathscr{B}(n,\\frac{1}{5n})\\) . Then \\(X_n\\) converge in law to",
      "options": [
        "the Poisson distribution with parameter 1/5",
        "none of suggested",
        "the Poisson distribution with parameter 5",
        "the exponential distribution with parameter 5"
      ],
      "correctIndex": 0,
      "explanation": "the Poisson distribution with parameter 1/5"
    },
    {
      "id": "t7_q2",
      "topicId": 7,
      "topic": "Topic 7: Limit Theorems (LLN & CLT)",
      "question": "Let \\(X\\) be a non-negative  r.v. with mean \\(\\mu\\) and variance \\(\\sigma^2\\) and \\(c>0\\) some constant.   Match the inequalities and their names",
      "options": [
        "\\(P(X-\\mu\\ge c)\\le\\sigma^2/(\\sigma^2+c^2)\\)\n→ one sided Chebyshev's inequality, \\(P(X\\ge c)\\le E(X)/c\\)\n→ Markov inequality, \\(P(|X-\\mu|\\ge c)\\le\\sigma^2/c^2\\)\n→ Chebyshev's inequality",
        "Неправильне твердження",
        "Інший варіант"
      ],
      "correctIndex": 0,
      "explanation": "\\(P(X-\\mu\\ge c)\\le\\sigma^2/(\\sigma^2+c^2)\\)\n→ one sided Chebyshev's inequality, \\(P(X\\ge c)\\le E(X)/c\\)\n→ Markov inequality, \\(P(|X-\\mu|\\ge c)\\le\\sigma^2/c^2\\)\n→ Chebyshev's inequality"
    },
    {
      "id": "t7_q3",
      "topicId": 7,
      "topic": "Topic 7: Limit Theorems (LLN & CLT)",
      "question": "If \\(X\\) is a r.v. with exponential distribution \\(\\mathscr{E}(2)\\) , then the Markov inequality implies that",
      "options": [
        "\\(P(X\\ge 2)\\le 0.25\\)",
        "\\(P(X\\le 4)\\le0.25\\)",
        "\\(P(X\\ge 2)\\ge0.25\\)",
        "\\(P(X\\ge 4)\\ge0.5\\)"
      ],
      "correctIndex": 0,
      "explanation": "\\(P(X\\ge 2)\\le 0.25\\)"
    },
    {
      "id": "t7_q4",
      "topicId": 7,
      "topic": "Topic 7: Limit Theorems (LLN & CLT)",
      "question": "If \\(X_1, X_2, \\dots \\) are independent identically distributed  r.v.'s with binomial distribution \\(\\mathscr{B}(10,0.25)\\) then the sample means \\( M_n\\)",
      "options": [
        "converge almost everywhere to \\(2.5\\)",
        "converge almost everywhere to \\(n/4\\)",
        "do not converge",
        "converge to a r.v. with a binomial distribution"
      ],
      "correctIndex": 0,
      "explanation": "converge almost everywhere to \\(2.5\\)"
    },
    {
      "id": "t7_q5",
      "topicId": 7,
      "topic": "Topic 7: Limit Theorems (LLN & CLT)",
      "question": "For r.v. \\(X\\) with normal distribution \\(\\mathscr{N}(1,1)\\) choose all correct inequalities",
      "options": [
        "\\(P(X\\ge 6)\\ge1/(1+5^2)\\)",
        "\\(P(X\\ge2)\\ge 0.5\\)",
        "\\(P(X\\ge 6)\\le1/(1+5^2)\\)",
        "\\(P(X< 4)\\ge 0.75\\)",
        "\\(P(X\\ge2)\\le 0.5\\)\n### Коментар\nYour answer is correct. Правильні відповіді: \\(P(X\\ge2)\\le 0.5\\)\n, \\(P(X< 4)\\ge 0.75\\)\n, \\(P(X\\ge 6)\\le1/(1+5^2)\\)"
      ],
      "correctIndex": 4,
      "explanation": "Правильні відповіді: \\(P(X\\ge2)\\le 0.5\\)\n, \\(P(X< 4)\\ge 0.75\\)\n, \\(P(X\\ge 6)\\le1/(1+5^2)\\)"
    },
    {
      "id": "t7_q6",
      "topicId": 7,
      "topic": "Topic 7: Limit Theorems (LLN & CLT)",
      "question": "Let \\(X_n \\sim\\mathscr{B}(n,p)\\) and \\(Y_n = X_n/n\\) . For large \\(n\\) , the distribution of \\(Y_n\\) is close to",
      "options": [
        "none of the above",
        "Binomial distribution \\(\\mathscr{B}(1,p/n)\\)",
        "Poisson distribution \\(\\mathscr{P}(p)\\)",
        "that of the number \\(p\\)\nYes, the LLN applies here because \\(X_n\\) has the same distribution as the sum of \\(n\\) Bernoulli success indicators"
      ],
      "correctIndex": 3,
      "explanation": "that of the number \\(p\\)"
    },
    {
      "id": "t7_q7",
      "topicId": 7,
      "topic": "Topic 7: Limit Theorems (LLN & CLT)",
      "question": "Strong law of large numbers (SLLN) implies  convergence of sample means \\(M_n\\) to the expected value",
      "options": [
        "in probability",
        "almost surely (with probability 1)",
        "none of the suggested",
        "in distribution (in law)\n### Коментар\nВаша відповідь правильна Правильні відповіді: in distribution (in law), in probability, almost surely (with probability 1)"
      ],
      "correctIndex": 3,
      "explanation": "Правильні відповіді: in distribution (in law), in probability, almost surely (with probability 1)"
    },
    {
      "id": "t7_q8",
      "topicId": 7,
      "topic": "Topic 7: Limit Theorems (LLN & CLT)",
      "question": "Assume that \\(S_n\\) is the sum of i.i.d. r.v .'s \\(X_1,X_2,\\dots,X_n\\) with mean \\(0\\) and variance \\(\\sigma^2\\) . Then \\(S_n/n\\) converges as \\(n\\to\\infty\\) (choose all that applies):",
      "options": [
        "in probability\nYes, by WLLN",
        "almost surely\nYes, by SLLN",
        "in distribution\nYes, because WLLN (convergence in probability) implies convergence in distribution",
        "none of the suggested"
      ],
      "correctIndex": 0,
      "explanation": "Правильні відповіді: almost surely, in probability, in distribution"
    },
    {
      "id": "t7_q9",
      "topicId": 7,
      "topic": "Topic 7: Limit Theorems (LLN & CLT)",
      "question": "Order the following convergence types from the strongest (i.e. that implies the other ones) to the weakest",
      "options": [],
      "correctIndex": 0,
      "explanation": "Згідно з навчальними матеріалами та формулами курсу."
    },
    {
      "id": "t7_q10",
      "topicId": 7,
      "topic": "Topic 7: Limit Theorems (LLN & CLT)",
      "question": "Researches found that boys playing high school football absorb an average of \\(355\\) hits to the head with a standard deviation of \\(80\\) hits during a season.  What is the probability on a randomly selected team of \\(64\\) players that the average number of head hits per player is between \\(345\\) and \\(365\\) ?",
      "options": [
        "\\(2\\Phi(0.1)-1\\)",
        "\\(2\\Phi(1)\\)",
        "\\(2\\Phi(1/8)-1\\)",
        "\\(2\\Phi(1)-1\\)\n### Коментар\nYour answer is correct. Правильна відповідь: \\(2\\Phi(1)-1\\)"
      ],
      "correctIndex": 3,
      "explanation": "\\(2\\Phi(1)-1\\)"
    },
    {
      "id": "t8_q1",
      "topicId": 8,
      "topic": "Topic 8: Descriptive Analysis of Data",
      "question": "If one adds \\(4\\) to all data in a sample of size \\(n\\) , the sample median (choose all correct answers)",
      "options": [
        "stay the same",
        "increase by \\(4\\)",
        "increase by \\(2\\sqrt{n}\\)",
        "increase by \\(4n\\)"
      ],
      "correctIndex": 1,
      "explanation": "increase by \\(4\\)"
    },
    {
      "id": "t8_q2",
      "topicId": 8,
      "topic": "Topic 8: Descriptive Analysis of Data",
      "question": "If numbers \\(x_1,x_2,\\dots,x_n\\) are sampled from the Poisson distribution with parameter \\(\\lambda=2\\) ,  then their  sample mean",
      "options": [
        "is less than 2",
        "cannot be determined",
        "is equal to 2",
        "is greater than or equal to 2"
      ],
      "correctIndex": 1,
      "explanation": "cannot be determined"
    },
    {
      "id": "t8_q3",
      "topicId": 8,
      "topic": "Topic 8: Descriptive Analysis of Data",
      "question": "Which of the following characteristics are measures of data center location",
      "options": [
        "sample median",
        "sample mean",
        "sample variance",
        "kurtosis"
      ],
      "correctIndex": 1,
      "explanation": "Правильні відповіді: sample mean, sample median"
    },
    {
      "id": "t8_q4",
      "topicId": 8,
      "topic": "Topic 8: Descriptive Analysis of Data",
      "question": "The sample mean is never equal to the sample median",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Неправильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Неправильно’."
    },
    {
      "id": "t8_q5",
      "topicId": 8,
      "topic": "Topic 8: Descriptive Analysis of Data",
      "question": "Choose all characterics of a sample which can be less than its median",
      "options": [
        "sample mean",
        "lower quartile",
        "60 percentile",
        "upper quartile"
      ],
      "correctIndex": 1,
      "explanation": "Правильні відповіді: lower quartile, sample mean"
    },
    {
      "id": "t8_q6",
      "topicId": 8,
      "topic": "Topic 8: Descriptive Analysis of Data",
      "question": "Find the following sample statistics for the ordered data \\(7, 7, 8, 8, 10, 10, 11, 11, 11, 11, 11, 12, 13\\) (whose sum is \\( 130 \\) ):\n(a) sample mode Пусто 1 Питання 6   11 8 10 9   (b) sample median Пусто 2 Питання 6   11 8 10 9 (c) sample mean Пусто 3 Питання 6   11 8 10 9 (d) lower quartile Пусто 4 Питання 6   11 8 10 9",
      "options": [
        "Find the following sample statistics for the ordered data \\(7, 7, 8, 8, 10, 10, 11, 11, 11, 11, 11, 12, 13\\) (whose sum is \\( 130 \\) ):\n(a) sample mode [11]  (b) sample median [11] (c) sample mean [10] (d) lower quartile [8]",
        "Неправильне твердження",
        "Інший варіант"
      ],
      "correctIndex": 0,
      "explanation": "Find the following sample statistics for the ordered data \\(7, 7, 8, 8, 10, 10, 11, 11, 11, 11, 11, 12, 13\\) (whose sum is \\( 130 \\) ):\n(a) sample mode [11]  (b) sample median [11] (c) sample mean [10] (d) lower quartile [8]"
    },
    {
      "id": "t8_q7",
      "topicId": 8,
      "topic": "Topic 8: Descriptive Analysis of Data",
      "question": "For symmetric data (choose all correct statements)",
      "options": [
        "the sample variance is 0",
        "sample median is 0",
        "skewness is greater than 0",
        "the sample mean is equal to the sample median"
      ],
      "correctIndex": 3,
      "explanation": "the sample mean is equal to the sample median"
    },
    {
      "id": "t8_q8",
      "topicId": 8,
      "topic": "Topic 8: Descriptive Analysis of Data",
      "question": "The value in a set of data that occurs most frequently is called",
      "options": [
        "frequency",
        "sample median",
        "relative frequency",
        "sample mode"
      ],
      "correctIndex": 3,
      "explanation": "sample mode"
    },
    {
      "id": "t8_q9",
      "topicId": 8,
      "topic": "Topic 8: Descriptive Analysis of Data",
      "question": "Let  numbers   \\(x_1,x_2,\\dots, x_n\\) be sampled from distribution with expectation \\(0\\) and variance \\(1\\) . Then their sample mean is \\(0\\) and the sample varaince is \\(1\\) .",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Неправильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Неправильно’."
    },
    {
      "id": "t8_q10",
      "topicId": 8,
      "topic": "Topic 8: Descriptive Analysis of Data",
      "question": "Which of the following measures will always change if a single value in the data changes?",
      "options": [
        "sample mode",
        "sample median",
        "none of the listed",
        "sample mean"
      ],
      "correctIndex": 3,
      "explanation": "sample mean"
    },
    {
      "id": "t9_q1",
      "topicId": 9,
      "topic": "Topic 9: Parameter Estimation",
      "question": "For a distribution with p.d.f. \\(f(x\\mid \\theta)\\) with parameter \\(\\theta\\) , the MLE of \\(\\theta\\) for observations \\(x_1,x_2,\\dots,x_n\\) minimizes the likelihood  \\(\\operatorname{lik}(\\theta) = f(x_1 \\mid\\theta) f(x_2\\mid\\theta) \\cdots f(x_n\\mid\\theta)\\)",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Неправильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Неправильно’."
    },
    {
      "id": "t9_q2",
      "topicId": 9,
      "topic": "Topic 9: Parameter Estimation",
      "question": "Let MSE of estimator \\(\\hat\\Theta\\) of parameter \\(\\theta\\) goes to 0 as \\(n\\to\\infty\\) . Choose all consistent estimators of \\(\\theta\\)",
      "options": [
        "\\(n\\hat\\Theta\\)",
        "\\(\\frac{n}{n+1}\\hat\\Theta\\)",
        "none of suggested",
        "\\(\\hat\\Theta\\)\n### Коментар\nYour answer is partially correct. У вас правильних відповідей: 1. Правильні відповіді: \\(\\hat\\Theta\\)\n, \\(\\frac{n}{n+1}\\hat\\Theta\\)"
      ],
      "correctIndex": 3,
      "explanation": "Правильні відповіді: \\(\\hat\\Theta\\)\n, \\(\\frac{n}{n+1}\\hat\\Theta\\)"
    },
    {
      "id": "t9_q3",
      "topicId": 9,
      "topic": "Topic 9: Parameter Estimation",
      "question": "An estimator \\(\\widehat\\Theta\\) of a parameter \\(\\theta\\) is called unbiased  if",
      "options": [
        "\\(\\widehat\\Theta\\) converges to \\(\\theta\\) in probability as \\(n\\to\\infty\\)",
        "the values of \\(\\widehat\\Theta\\) are close to \\(\\theta\\)",
        "the values of \\(\\widehat\\Theta\\) coincide with \\(\\theta\\)",
        "\\(\\mathsf{E}(\\widehat\\Theta)= \\theta\\)\n### Коментар\nYour answer is correct. Правильна відповідь: \\(\\mathsf{E}(\\widehat\\Theta)= \\theta\\)"
      ],
      "correctIndex": 3,
      "explanation": "\\(\\mathsf{E}(\\widehat\\Theta)= \\theta\\)"
    },
    {
      "id": "t9_q4",
      "topicId": 9,
      "topic": "Topic 9: Parameter Estimation",
      "question": "Assume \\(X_1,\\dots,X_n\\) are i.i.d. r.v. 's with expected value \\(\\theta\\) and \\(T(\\mathbf{X}):=\\frac{1}{n}(X_1+X_2+\\dots+X_n)\\) . The unbiased  estimator of \\(\\theta\\) is equal to",
      "options": [
        "\\(T(\\mathbf{X})/(n-1)\\)",
        "depends on the distribution",
        "\\(n T(\\mathbf{X})\\)",
        "\\(T(\\mathbf{X})\\)"
      ],
      "correctIndex": 3,
      "explanation": "\\(T(\\mathbf{X})\\)"
    },
    {
      "id": "t9_q5",
      "topicId": 9,
      "topic": "Topic 9: Parameter Estimation",
      "question": "Let \\(\\hat\\Theta\\) be unbiased estimator  of the parameter \\(\\theta\\) with variance \\(\\mathsf{Var}(\\hat\\Theta)=6\\) and \\(\\tilde\\Theta\\) be estimator of parameter \\(\\theta\\) with \\(\\mathsf{E}(\\tilde\\Theta)=\\theta-2\\) and variance  \\(\\mathsf{Var}(\\tilde\\Theta)=1\\) . Which estimator should be preferred?",
      "options": [
        "\\(\\tilde\\Theta\\)",
        "cannot be determined",
        "\\(\\hat\\Theta\\)\n### Коментар\nYour answer is incorrect. Правильна відповідь: \\(\\tilde\\Theta\\)"
      ],
      "correctIndex": 2,
      "explanation": "\\(\\tilde\\Theta\\)"
    },
    {
      "id": "t9_q6",
      "topicId": 9,
      "topic": "Topic 9: Parameter Estimation",
      "question": "Assume \\(X_1,\\dots,X_n\\) are i.i.d. r.v. 's with uniform distribution \\(\\mathscr{U}(0,\\theta)\\) . Then the moment method  estimator of \\(\\theta\\) is",
      "options": [
        "\\(2\\overline{\\mathbf{X}}\\)",
        "none of suggested",
        "\\(\\overline{\\mathbf{X}}\\)",
        "\\(\\widehat{\\Theta}\\)"
      ],
      "correctIndex": 0,
      "explanation": "\\(2\\overline{\\mathbf{X}}\\)"
    },
    {
      "id": "t9_q7",
      "topicId": 9,
      "topic": "Topic 9: Parameter Estimation",
      "question": "If the MSE of an estimator \\(\\widehat{\\Theta}\\) goes to zero as \\(n\\to\\infty\\) , then \\(\\widehat{\\Theta}\\) must be asymptotically unbiased",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Правильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Правильно’."
    },
    {
      "id": "t9_q8",
      "topicId": 9,
      "topic": "Topic 9: Parameter Estimation",
      "question": "Assume \\(X_1,\\dots,X_n\\) are  i.i.d. r.v. 's with normal distribution \\(\\mathscr{N}(\\mu,1/2)\\) . Then the  maximum liklihood  estimator of \\(\\mu\\)",
      "options": [
        "maximizes the function \\(f(\\mu)=e^{-\\mu(x_1+\\dots+x_n)}\\)",
        "none of suggested",
        "maximizes the function \\(f(\\mu)=e^{-(x_1-\\mu)^2-\\dots-(x_n-\\mu)^2}\\)",
        "is equal to the maximum of the function \\(f(\\mu)=\\pi^{-n/2}e^{-(x_1-\\mu)^2-\\dots-(x_n-\\mu)^2}\\)"
      ],
      "correctIndex": 2,
      "explanation": "maximizes the function \\(f(\\mu)=e^{-(x_1-\\mu)^2-\\dots-(x_n-\\mu)^2}\\)"
    },
    {
      "id": "t9_q9",
      "topicId": 9,
      "topic": "Topic 9: Parameter Estimation",
      "question": "Assume \\(X_1,\\dots,X_n\\) are i.i.d. r.v. 's with distribution \\(\\mathscr{N}(1,2\\theta)\\) . Then the moment method  estimator of \\(\\theta\\) is",
      "options": [
        "\\(\\widehat{m}_2-1\\)",
        "\\((\\widehat{m}_2-1)/2\\)",
        "\\(\\widehat{m}_2\\)",
        "\\(\\widehat{m}_2/2\\)"
      ],
      "correctIndex": 1,
      "explanation": "\\((\\widehat{m}_2-1)/2\\)"
    },
    {
      "id": "t9_q10",
      "topicId": 9,
      "topic": "Topic 9: Parameter Estimation",
      "question": "Match the following abbreviations and their meaning",
      "options": [
        "MSE → mean squared error, MLE → maximum likelihood estimator",
        "Неправильне твердження",
        "Інший варіант"
      ],
      "correctIndex": 0,
      "explanation": "MSE → mean squared error, MLE → maximum likelihood estimator"
    },
    {
      "id": "t10_q1",
      "topicId": 10,
      "topic": "Topic 10: Bayesian & Interval Estimation",
      "question": "For a fixed sample size, when a confidence interval becomes shorter, the level of confidence increases",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Неправильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Неправильно’."
    },
    {
      "id": "t10_q2",
      "topicId": 10,
      "topic": "Topic 10: Bayesian & Interval Estimation",
      "question": "For a normally distributed population with variance \\(\\sigma^2\\), the interval estimator \\(\\overline{\\mathbf{X}} \\pm \\sigma z_\\alpha/\\sqrt{n}\\) ( \\(\\alpha<0.5\\) ) for the population mean has confidence level",
      "options": [
        "\\(2(1-\\alpha)\\)",
        "\\(1-2\\alpha\\)",
        "\\(2\\alpha\\)",
        "\\(\\alpha\\)"
      ],
      "correctIndex": 1,
      "explanation": "\\(1-2\\alpha\\)"
    },
    {
      "id": "t10_q3",
      "topicId": 10,
      "topic": "Topic 10: Bayesian & Interval Estimation",
      "question": "A Bayesian estimate \\(\\hat\\theta\\) is the value of \\(\\theta\\) that Пусто 1 Питання 3   minimizes maximizes the Пусто 2 Питання 3   expected loss loss likelihood under the Пусто 3 Питання 3   prior posterior distribution",
      "options": [
        "A Bayesian estimate \\(\\hat\\theta\\) is the value of \\(\\theta\\) that [minimizes] the [expected loss] under the [posterior] distribution",
        "Неправильне твердження",
        "Інший варіант"
      ],
      "correctIndex": 0,
      "explanation": "A Bayesian estimate \\(\\hat\\theta\\) is the value of \\(\\theta\\) that [minimizes] the [expected loss] under the [posterior] distribution"
    },
    {
      "id": "t10_q4",
      "topicId": 10,
      "topic": "Topic 10: Bayesian & Interval Estimation",
      "question": "A sample of size \\(n=25\\) has sample mean \\(m\\) and sample standard deviation \\(s\\) . Then an approximate \\(90\\%\\) confidence interval for the population mean is",
      "options": [
        "\\(m \\pm s t^{(24)}_{0.1}/5\\)",
        "\\(m \\pm s t^{(24)}_{0.05}/5\\)",
        "\\(m \\pm s z_{0.1}/5\\)",
        "\\(m \\pm s z_{0.05}/5\\)"
      ],
      "correctIndex": 1,
      "explanation": "\\(m \\pm s t^{(24)}_{0.05}/5\\)"
    },
    {
      "id": "t10_q5",
      "topicId": 10,
      "topic": "Topic 10: Bayesian & Interval Estimation",
      "question": "Assume that \\(X_1,\\dots,X_n\\) is a sample from a probability distribution of population mean \\(\\mu\\) and that \\(\\overline{\\mathbf{X}} \\pm d\\) is a confidence interval for \\(\\mu\\) of confidence level \\(1-\\alpha\\) . Then  \\(\\overline{\\mathbf{X}} \\pm 2d\\) is a confidence interval for \\(\\mu\\) of confidence level",
      "options": [
        "at least \\(1-\\alpha\\)",
        "at least \\(1-\\alpha/2\\)",
        "at most \\(1-\\alpha/2\\)\n### Коментар\nYour answer is incorrect. Правильна відповідь: at least \\(1-\\alpha\\)"
      ],
      "correctIndex": 2,
      "explanation": "at least \\(1-\\alpha\\)"
    },
    {
      "id": "t10_q6",
      "topicId": 10,
      "topic": "Topic 10: Bayesian & Interval Estimation",
      "question": "Several values of the c.d.f.   \\(\\Phi\\) of a standard normal distribution are \\(\\Phi(1) = 0.841\\) , \\(\\Phi(2)=0.977\\) , \\(\\Phi(3)=0.999\\) . Given a sample \\(\\mathbf{x}\\) of size \\(n\\) from a normal distribution with standard deviation \\(\\sigma\\) , the values \\(\\overline{\\mathbf{x}} \\pm 2\\sigma/\\sqrt{n}\\) are endpoints of the confidence interval for the mean \\(\\mu\\) of exact confidence level",
      "options": [
        "\\(0.977\\)",
        "\\(0.999\\)",
        "\\(0.841\\)",
        "\\(0.954\\)"
      ],
      "correctIndex": 3,
      "explanation": "\\(0.954\\)"
    },
    {
      "id": "t10_q7",
      "topicId": 10,
      "topic": "Topic 10: Bayesian & Interval Estimation",
      "question": "For a fixed confidence level, when the sample size decreases, the length of the confidence interval for a population mean decreases",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Неправильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Неправильно’."
    },
    {
      "id": "t10_q8",
      "topicId": 10,
      "topic": "Topic 10: Bayesian & Interval Estimation",
      "question": "To make a confidence interval for a sample mean twice shorter under the fixed confidence level, the sample size must be taken",
      "options": [
        "twice larger",
        "four times smaller",
        "four times larger",
        "twice smaller"
      ],
      "correctIndex": 2,
      "explanation": "four times larger"
    },
    {
      "id": "t10_q9",
      "topicId": 10,
      "topic": "Topic 10: Bayesian & Interval Estimation",
      "question": "Assume that \\((a,b)\\) is a \\(90\\%\\) confidence interval for a population mean   \\(\\mu\\) calculated for data \\(\\mathbf{x}\\) . Then there is a \\(0.90\\)   probability that  \\(\\mu \\in (a,b)\\) .",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Неправильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Неправильно’."
    },
    {
      "id": "t10_q10",
      "topicId": 10,
      "topic": "Topic 10: Bayesian & Interval Estimation",
      "question": "Confidence intervals of which confidence level will be the widest?",
      "options": [
        "\\(90\\%\\)",
        "\\(95\\%\\)",
        "\\(80\\%\\)",
        "\\(98\\%\\)"
      ],
      "correctIndex": 3,
      "explanation": "\\(98\\%\\)"
    },
    {
      "id": "t11_q1",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "Several values of the c.d.f.   \\(\\Phi\\) of a standard normal distribution are \\(\\Phi(1) = 0.841\\) , \\(\\Phi(2)=0.977\\) , \\(\\Phi(3)=0.999\\) . Given a sample \\(\\mathbf{x}\\) of size \\(n\\) from a normal distribution with standard deviation \\(\\sigma\\) , the values \\(\\overline{\\mathbf{x}} \\pm 2\\sigma/\\sqrt{n}\\) are endpoints of the confidence interval for the mean \\(\\mu\\) of exact confidence level",
      "options": [
        "\\(0.999\\)",
        "\\(0.977\\)",
        "\\(0.841\\)",
        "\\(0.954\\)"
      ],
      "correctIndex": 3,
      "explanation": "\\(0.954\\)"
    },
    {
      "id": "t11_q2",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "Confidence intervals of which confidence level will be the widest?",
      "options": [
        "\\(95\\%\\)",
        "\\(98\\%\\)",
        "\\(80\\%\\)",
        "\\(90\\%\\)"
      ],
      "correctIndex": 1,
      "explanation": "\\(98\\%\\)"
    },
    {
      "id": "t11_q3",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "Fof a fixed sample size, when the level of confidence increases, the confidence interval becomes shorter",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Неправильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Неправильно’."
    },
    {
      "id": "t11_q4",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "In the ordered data \\(1,2,3,3,4,4,4,5,6,6,8,9,10\\) (whose sum is \\(65\\) ) the value \\(x=4\\) is (choose all correct answers)",
      "options": [
        "lower quartile",
        "sample mean",
        "sample mode",
        "sample median"
      ],
      "correctIndex": 3,
      "explanation": "Правильні відповіді: sample mode, sample median"
    },
    {
      "id": "t11_q5",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "For a fixed confidence level, when the sample size increases, the length of the confidence  interval for a population mean decreases",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Правильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Правильно’."
    },
    {
      "id": "t11_q6",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "A single numerical value used to describe a characteristic of a sample data set, such as  the sample median , is referred to as a",
      "options": [
        "sample parameter",
        "sample median",
        "population parameter",
        "sample statistic"
      ],
      "correctIndex": 3,
      "explanation": "sample statistic"
    },
    {
      "id": "t11_q7",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "If the MSE  of an estimator \\(\\widehat{\\Theta}\\) goes to zero as \\(n\\to\\infty\\) , then \\(\\widehat{\\Theta}\\) must be consistent",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Правильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Правильно’."
    },
    {
      "id": "t11_q8",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "If numbers \\(x_1,x_2,\\dots,x_n\\) are sampled from the standard normal distribution, then their sample mean is equal to \\(0\\)",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Неправильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Неправильно’."
    },
    {
      "id": "t11_q9",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "If an estimator \\(\\widehat{\\Theta}\\) is unbiased and \\(\\widetilde{\\Theta}\\) is biased, \\(\\widehat{\\Theta}\\) should always be preferred",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Неправильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Неправильно’."
    },
    {
      "id": "t11_q10",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "The value in a set of data that occurs most frequently is called",
      "options": [
        "relative frequency",
        "sample median",
        "sample mode",
        "frequency"
      ],
      "correctIndex": 2,
      "explanation": "sample mode"
    },
    {
      "id": "t11_q11",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "If one adds \\(4\\) to all data in a sample of size \\(n\\) , the sample standard error  will (choose all correct answers)",
      "options": [
        "increase by \\(4\\)",
        "increase by \\(2\\sqrt{n}\\)",
        "increase by \\(4n\\)",
        "stay the same"
      ],
      "correctIndex": 3,
      "explanation": "stay the same"
    },
    {
      "id": "t11_q12",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "For a normally distributed population with variance \\(\\sigma^2\\), the interval estimator \\(\\overline{\\mathbf{X}} \\pm \\sigma z_\\alpha/\\sqrt{n}\\) ( \\(\\alpha<0.5\\) ) for the population mean has confidence level",
      "options": [
        "\\(2(1-\\alpha)\\)",
        "\\(1-2\\alpha\\)",
        "\\(\\alpha\\)",
        "\\(2\\alpha\\)"
      ],
      "correctIndex": 1,
      "explanation": "\\(1-2\\alpha\\)"
    },
    {
      "id": "t11_q13",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "If the MSE  of an estimator \\(\\widehat{\\Theta}\\) goes to zero as \\(n\\to\\infty\\) , then \\(\\widehat{\\Theta}\\) must be unbiased",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Неправильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Неправильно’."
    },
    {
      "id": "t11_q14",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "Assume that \\((a,b)\\) is a \\(90\\%\\) confidence interval for a population mean   \\(\\mu\\) calculated for data \\(\\mathbf{x}\\) . Then there is a \\(0.90\\)   probability that  \\(\\mu \\in (a,b)\\) .",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Неправильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Неправильно’."
    },
    {
      "id": "t11_q15",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "If numbers \\(x_1,x_2,\\dots,x_n\\) are sampled from the standard normal distribution,  then their sample mean is equal to the sample median",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Неправильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Неправильно’."
    },
    {
      "id": "t11_q16",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "Assume \\(X_1,\\dots,X_n\\) are i.i.d. r.v. 's with variance \\(\\theta\\) and \\(S_{\\mathbf{XX}} := \\sum (X_k-\\overline{\\mathbf{X}})^2\\) . The unbiased  estimator of \\(\\theta\\) is equal to",
      "options": [
        "\\( S_{\\mathbf{XX}}/(n+1) \\)",
        "\\( S_{\\mathbf{XX}}/n \\)",
        "depends on the distribution",
        "\\( S_{\\mathbf{XX}}/(n-1) \\)"
      ],
      "correctIndex": 3,
      "explanation": "\\( S_{\\mathbf{XX}}/(n-1) \\)"
    },
    {
      "id": "t11_q17",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "Assume \\(X_1,\\dots,X_n\\) are i.i.d. r.v. 's with geometric distribution \\(\\mathscr{G}(\\theta)\\) . Then the moment method  estimator of \\(\\theta\\) is",
      "options": [
        "\\(1/\\overline{\\mathbf{X}}\\)",
        "\\(\\widehat{\\theta}\\)",
        "\\(\\widehat{\\Theta}\\)",
        "\\(\\overline{\\mathbf{X}}\\)"
      ],
      "correctIndex": 0,
      "explanation": "\\(1/\\overline{\\mathbf{X}}\\)"
    },
    {
      "id": "t11_q18",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "Assume \\(X_1,\\dots,X_n\\) are i.i.d. r.v. 's with distribution \\(\\mathscr{N}(0,\\theta)\\) . Then the moment method  estimator of \\(\\theta\\) is",
      "options": [
        "\\(\\widehat{\\theta}\\)",
        "\\(\\widehat{m}_2\\)",
        "\\(m_2\\)",
        "\\(\\widehat{\\Theta}\\)"
      ],
      "correctIndex": 1,
      "explanation": "\\(\\widehat{m}_2\\)"
    },
    {
      "id": "t11_q19",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "Which of the following measures will always change if a single value in the data changes?",
      "options": [
        "none of the listed",
        "sample median",
        "sample mean",
        "sample mode"
      ],
      "correctIndex": 2,
      "explanation": "sample mean"
    },
    {
      "id": "t11_q20",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "Find the following sample statistics for the ordered data \\(1,2,3,3,4,4,4,5,6,6,8,9,10\\) (whose sum is \\(65\\) ):\n(a) sample mode Пусто 1 Питання 20   4 3 5   (b) sample median Пусто 2 Питання 20   4 3 5 (c) sample mean Пусто 3 Питання 20   4 3 5 (d) lower quartile Пусто 4 Питання 20   4 3 5",
      "options": [
        "Find the following sample statistics for the ordered data \\(1,2,3,3,4,4,4,5,6,6,8,9,10\\) (whose sum is \\(65\\) ):\n(a) sample mode [4]  (b) sample median [4] (c) sample mean [5] (d) lower quartile [3]",
        "Неправильне твердження",
        "Інший варіант"
      ],
      "correctIndex": 0,
      "explanation": "Find the following sample statistics for the ordered data \\(1,2,3,3,4,4,4,5,6,6,8,9,10\\) (whose sum is \\(65\\) ):\n(a) sample mode [4]  (b) sample median [4] (c) sample mean [5] (d) lower quartile [3]"
    },
    {
      "id": "t11_q21",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "Which of the following measures are not sensitive to the outlier (i.e. will not change much when it is removed)?",
      "options": [
        "sample variance",
        "interquartile range",
        "spread (range)",
        "sample mean"
      ],
      "correctIndex": 1,
      "explanation": "interquartile range"
    },
    {
      "id": "t11_q22",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "Assume \\(X_1,\\dots,X_n\\) are i.i.d. r.v. 's with distribution \\(\\mathscr{N}(\\theta,1)\\) . Then the moment method  estimator of \\(\\theta\\) is",
      "options": [
        "\\(\\overline{\\mathbf{X}^2}\\)",
        "\\(\\widehat{\\Theta}\\)",
        "\\(\\overline{\\mathbf{X}}\\)",
        "\\(\\widehat{\\theta}\\)"
      ],
      "correctIndex": 2,
      "explanation": "\\(\\overline{\\mathbf{X}}\\)"
    },
    {
      "id": "t11_q23",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "A sample of size \\(n=100\\) has sample mean \\(m\\) and sample standard deviation \\(s\\) . Then an approximate \\(95\\%\\) confidence interval for the population mean is",
      "options": [
        "\\(m \\pm s z_{0.025}/10\\)",
        "\\(m \\pm s z_{0.05}/10\\)",
        "\\(m \\pm s t^{(99)}_{0.025}/10\\)",
        "\\(m \\pm s t^{(99)}_{0.05}/10\\)"
      ],
      "correctIndex": 2,
      "explanation": "Правильні відповіді: \\(m \\pm s z_{0.025}/10\\)\n, \\(m \\pm s t^{(99)}_{0.025}/10\\)"
    },
    {
      "id": "t11_q24",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "If numbers \\(x_1,x_2,\\dots,x_n\\) are sampled from the standard normal distribution, then their sample variance is equal to \\(1\\)",
      "options": [
        "Правильно",
        "Неправильно\n### Коментар\nПравильна відповідь ’Неправильно’."
      ],
      "correctIndex": 1,
      "explanation": "Правильна відповідь ’Неправильно’."
    }
  ],
  "TOPICS_NOTES": [
    {
      "id": "topic-7",
      "number": 7,
      "title": "Topic 7: Граничні теореми (Limit Theorems: LLN & CLT)",
      "summary": "Нерівності Маркова, Чебишова, Кантеллі, Чернова. Види збіжності (a.s., in P, in d), Слабкий та Сильний закони великих чисел, Центральна гранична теорема.",
      "content": "### 1. Нерівності концентрації\n- **Нерівність Маркова**: Для $X \\ge 0$ та $a > 0$: $P(X \\ge a) \\le \\frac{E[X]}{a}$. Доведення через $Y_a = a \\cdot I_{X \\ge a} \\le X$.\n- **Нерівність Чебишова**: Для будь-якої в.в. зі скінченною дисперсією $\\sigma^2$: $P(|X - \\mu| \\ge c) \\le \\frac{\\sigma^2}{c^2}$.\n- **Нерівність Кантеллі (одностороння)**: $P(X - \\mu \\ge c) \\le \\frac{\\sigma^2}{\\sigma^2 + c^2}$. Завжди строгіша за $0.5 \\sigma^2/c^2$.\n- **Межа Чернова**: $P(X \\ge a) \\le e^{-\\varphi(a)}$, де $\\varphi(a) = \\max_{s \\ge 0} \\{sa - \\ln M_X(s)\\}$. Дає експоненційне спадання хвостів!\n\n### 2. Види збіжності та їх ієрархія\n1. **Майже напевно ($a.s.$)**: $P(\\lim X_n = X) = 1$.\n2. **За ймовірністю ($P$)**: $\\forall \\varepsilon > 0, \\lim P(|X_n - X| \\ge \\varepsilon) = 0$.\n3. **За розподілом ($d$)**: $\\lim F_{X_n}(x) = F_X(x)$ у точках неперервності.\n**Ієрархія**: $a.s. \\implies P \\implies d$. Обернене $d \\implies P$ вірне ЛИШЕ коли границя $X = c$ є константою!\n\n### 3. Закони великих чисел (ЗВЧ)\n- **WLLN (Хінчин)**: $X_i$ i.i.d., $E[|X_i|] < \\infty \\implies \\bar{X}_n \\xrightarrow{P} \\mu$.\n- **SLLN (Колмогоров)**: $X_i$ i.i.d. $E[|X_i|] < \\infty \\iff \\bar{X}_n \\xrightarrow{a.s.} \\mu$.\n\n### 4. Центральна Гранична Теорема (ЦГТ)\nДля i.i.d. в.в. зі скінченною $\\sigma^2 > 0$:\n$$Z_n = \\frac{S_n - n\\mu}{\\sigma\\sqrt{n}} \\xrightarrow{d} N(0, 1).$$\nДоведення через розклад Тейлора MGF: $M_{Z_n}(t) = [1 + t^2/(2n) + o(t^2/n)]^n \\to e^{t^2/2}$."
    },
    {
      "id": "topic-8",
      "number": 8,
      "title": "Topic 8: Описова статистика та спеціальні розподіли",
      "summary": "Генеральна сукупність проти вибірки. Вибіркові моменти, середнє, медіана, мода, вибіркова дисперсія (поправка Бесселя n-1). Розподіли Хі-квадрат, Стьюдента t та Фішера F.",
      "content": "### 1. Генеральна сукупність vs Вибірка\n- **Генеральна сукупність**: повна сукупність об'єктів із розподілом $F(x; \\theta)$. Параметр $\\theta$ — фіксована невідома константа.\n- **Вибірка**: $X_1, \\dots, X_n$ — незалежні спостереження.\n- **Статистика**: будь-яка вимірна функція вибірки $T(X_1, \\dots, X_n)$, що НЕ містить невідомих параметрів.\n\n### 2. Числові характеристики вибірки\n- Вибіркове середнє: $\\bar{X} = \\frac{1}{n}\\sum X_i$, $E[\\bar{X}] = \\mu$, $\\text{Var}(\\bar{X}) = \\sigma^2/n$.\n- Вибіркова дисперсія: $S^2 = \\frac{1}{n-1}\\sum (X_i - \\bar{X})^2$. $E[S^2] = \\sigma^2$ (незміщена завдяки діленню на $n-1$).\n- Вибіркові моменти: $\\hat{m}_k = \\frac{1}{n}\\sum X_i^k$.\n\n### 3. Спеціальні вибіркові розподіли\n- **$\\chi_k^2$**: сума $k$ квадратів незалежних $N(0, 1)$. Середнє $k$, дисперсія $2k$.\n- **Стьюдента $t_k$**: $T = Z / \\sqrt{V/k}$, де $Z \\sim N(0, 1)$, $V \\sim \\chi_k^2$. Важчі хвости, ніж у нормального.\n- **Фішера $F_{d_1, d_2}$**: $(V_1/d_1) / (V_2/d_2)$ для порівняння дисперсій двох вибірок."
    },
    {
      "id": "topic-9",
      "number": 9,
      "title": "Topic 9: Точкове оцінювання параметрів (MME, MLE, властивості)",
      "summary": "Метод моментів (MME), Метод максимальної правдоподібності (MLE), незміщеність, слушність (consistency), розклад MSE, інформація Фішера та нерівність Рао-Крамера.",
      "content": "### 1. Метод моментів (MME)\nПрирівнюємо вибіркові моменти $\\hat{m}_k = \\frac{1}{n}\\sum X_i^k$ до теоретичних $\\mu_k(\\theta) = E[X^k]$ і розв'язуємо систему відносно $\\theta$.\n\n### 2. Метод максимальної правдоподібності (MLE)\nФункція правдоподібності $L(\\theta) = \\prod f(x_i | \\theta)$.\nЛог-правдоподібність: $\\ell(\\theta) = \\sum \\ln f(x_i | \\theta)$.\nРівняння score: $\\frac{d\\ell}{d\\theta} = 0$, перевірка $\\frac{d^2\\ell}{d\\theta^2} < 0$.\n- **Властивість інваріантності**: якщо $\\hat{\\theta}$ є MLE для $\\theta$, то $g(\\hat{\\theta})$ є MLE для $g(\\theta)$.\n- **Граничні випадки**: для $U(0, a)$, $L(a) = a^{-n} I(X_{(n)} \\le a)$, максимум на лівій межі $\\implies \\hat{a}_{ML} = \\max(X_1, \\dots, X_n)$.\n\n### 3. Критерії якості оцінок\n- **Незміщеність**: $E[\\hat{\\theta}] = \\theta$ для всіх $n$.\n- **Слушність**: $\\hat{\\theta}_n \\xrightarrow{P} \\theta$ при $n \\to \\infty$.\n- **MSE (середньоквадратична помилка)**: $\\text{MSE}(\\hat{\\theta}) = \\text{Var}(\\hat{\\theta}) + [\\text{Bias}(\\hat{\\theta})]^2$.\n- **Нерівність Рао-Крамера (CRLB)**: Для будь-якої незміщеної оцінки $\\text{Var}(\\hat{\\theta}) \\ge \\frac{1}{n I(\\theta)}$, де $I(\\theta) = -E\\left[\\frac{\\partial^2 \\ln f}{\\partial \\theta^2}\\right]$."
    },
    {
      "id": "topic-10",
      "number": 10,
      "title": "Topic 10: Довірчі інтервали та Баєсівське оцінювання",
      "summary": "Побудова довірчих інтервалів через метод півотів (Z- та t-інтервали). Баєсівський підхід: апріорні та апостеріорні розподіли, спряжені пари (Beta-Binomial, Gamma-Poisson), оцінка Баєса.",
      "content": "### 1. Довірчі інтервали (Confidence Intervals)\nВипадковий інтервал $[a(X), b(X)]$ такий, що $P_\\theta(a(X) \\le \\theta \\le b(X)) = 1 - \\alpha$.\n- Відома $\\sigma$: $\\bar{X} \\pm z_{1-\\alpha/2} \\frac{\\sigma}{\\sqrt{n}}$.\n- Невідома $\\sigma$: $\\bar{X} \\pm t_{1-\\alpha/2}^{(n-1)} \\frac{S}{\\sqrt{n}}$.\n- Довжина інтервалу пропорційна $1/\\sqrt{n}$ — щоб зменшити довжину вдвічі, треба збільшити $n$ у 4 рази!\n\n### 2. Баєсівське оцінювання\nПараметр $\\theta$ — випадкова величина з апріорною густиною $\\pi(\\theta)$.\nАпостеріорний розподіл за формулою Баєса:\n$$\\pi(\\theta | x) \\propto f(x | \\theta) \\pi(\\theta) \\quad (\\text{Likelihood} \\times \\text{Prior}).$$\n- **Квадратична функція втрат**: оцінка Баєса є **апостеріорним середнім** $\\hat{\\theta} = E[\\theta | X]$.\n- **Спряжена пара Beta-Binomial**: $X \\sim B(n, \\theta)$, prior $\\theta \\sim \\text{Beta}(\\alpha, \\beta) \\implies \\theta|X \\sim \\text{Beta}(\\alpha+x, \\beta+n-x)$. Оцінка $\\hat{\\theta} = \\frac{\\alpha+x}{\\alpha+\\beta+n}$.\n- **Спряжена пара Gamma-Poisson**: $X_i \\sim \\text{Poisson}(\\lambda)$, prior $\\lambda \\sim \\text{Gamma}(\\alpha, \\beta) \\implies \\lambda|X \\sim \\text{Gamma}(\\alpha+\\sum X_i, \\beta+n)$."
    },
    {
      "id": "topic-11",
      "number": 11,
      "title": "Topic 11: Комплексний Self-Test та розбори екзаменаційних задач",
      "summary": "24 комплексних тестових завдання Модуля 3 з повними розв'язками, розбір типових помилок, задачі підвищеної складності минулих років.",
      "content": "### Структура підсумкового контролю Модуля 3\n1. **Концептуальні питання**: види збіжності, умови теорем Хінчина, Колмогорова, Ліндеберга-Леві.\n2. **Практичні задачі на ЦГТ**: розрахунки обсягу вибірки $n$, поправка на неперервність $\\pm 0.5$.\n3. **Задачі на MME та MLE**: однопараметричні та двопараметричні моделі, граничні параметри носія.\n4. **Побудова довірчих інтервалів**: точні для $U(0, a)$, $N(\\mu, \\sigma^2)$, асимптотичні для пропорцій $p$.\n5. **Баєсівські задачі**: знаходження константи нормування, апостеріорного розподілу та оцінки Баєса."
    }
  ],
  "TOPICS_LIST": [
    {
      "id": 7,
      "title": "Topic 7: Граничні теореми (Limit Theorems: LLN & CLT)"
    },
    {
      "id": 8,
      "title": "Topic 8: Описова статистика та спеціальні розподіли"
    },
    {
      "id": 9,
      "title": "Topic 9: Точкове оцінювання параметрів (MME, MLE, властивості)"
    },
    {
      "id": 10,
      "title": "Topic 10: Довірчі інтервали та Баєсівське оцінювання"
    },
    {
      "id": 11,
      "title": "Topic 11: Комплексний Self-Test Модуля 3 (24 завдання)"
    }
  ]
};
