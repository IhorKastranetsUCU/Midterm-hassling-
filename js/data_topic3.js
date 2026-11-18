// UCU Probability & Statistics Midterm 3 & Colloquium 3 Master Data (English Edition)
// Limit Theorems, Descriptive Statistics, Parameter Estimation, Confidence Intervals & Bayesian Methods

window.PS_DATA_TOPIC3 = {
  "id": "topic3",
  "name": "Topic 3: Limit Theorems & Statistical Inference (Midterm 3 & Col 3)",
  "shortName": "Topic 3 (Midterm 3 & Col 3)",
  "badge": "MIDTERM 3 & COL 3",
  "SCHEDULE_DAYS": [
    {
      "day": 1,
      "date": "Day 1 (Concentration Inequalities)",
      "title": "Concentration Inequalities: Markov, Chebyshev, Cantelli & Chernoff",
      "focus": "Seminar 7: Markov's inequality, two-sided Chebyshev, one-sided Chebyshev (Cantelli), Chernoff bounding technique, tail distribution estimation.",
      "tasks": [
        {
          "id": "t3_d1_t1",
          "text": "Master Definitions 5, 6, 7 (Markov, Chebyshev, Cantelli one-sided inequality).",
          "topic": "definitions",
          "target": "5-7"
        },
        {
          "id": "t3_d1_t2",
          "text": "Review rigorous proof of Markov's inequality via indicator functions and Chebyshev via Markov.",
          "topic": "proofs"
        },
        {
          "id": "t3_d1_t3",
          "text": "Solve Chernoff bound derivations: P(X >= a) <= e^{-sa} M(s) and Legendre transform phi(a) = max{sa - ln M(s)}.",
          "topic": "problems",
          "target": "chernoff"
        },
        {
          "id": "t3_d1_t4",
          "text": "Compare Markov, Chebyshev, Cantelli, and Chernoff upper bounds for Poisson(10).",
          "topic": "problems",
          "target": "poisson-bounds"
        },
        {
          "id": "t3_d1_t5",
          "text": "Complete 2 prolonged focus sessions (45-60 min each).",
          "topic": "pomodoro"
        }
      ],
      "colloquiumGoal": "Be ready to write down Markov and Chebyshev proofs on the board without hesitation and emphasize the X >= 0 non-negativity condition.",
      "readinessWeight": 12
    },
    {
      "day": 2,
      "date": "Day 2 (Modes of Convergence & LLN)",
      "title": "Modes of Convergence & Laws of Large Numbers (WLLN & SLLN)",
      "focus": "Convergence almost surely (a.s.), in probability (P), in distribution (d). Weak Law (Khinchin / Chebyshev) and Strong Law (Kolmogorov).",
      "tasks": [
        {
          "id": "t3_d2_t1",
          "text": "Master Definitions 1, 2, 3 (modes of stochastic convergence) and the hierarchy a.s. => P => d.",
          "topic": "definitions",
          "target": "1-3"
        },
        {
          "id": "t3_d2_t2",
          "text": "Memorize counterexamples (why d does not imply P, why P does not imply a.s.) and the degenerate limit exception.",
          "topic": "traps"
        },
        {
          "id": "t3_d2_t3",
          "text": "Learn exact conditions for WLLN (Khinchin: finite mean; Chebyshev: finite variance) and SLLN (Kolmogorov).",
          "topic": "theory"
        },
        {
          "id": "t3_d2_t4",
          "text": "Solve Problem: Convergence of uniform extremes Z_n = max(X_i) -> a in probability.",
          "topic": "problems"
        },
        {
          "id": "t3_d2_t5",
          "text": "Complete Quiz 7: Limit Theorems (10 questions).",
          "topic": "quiz",
          "target": "quiz-7"
        }
      ],
      "colloquiumGoal": "Clearly explain the distinction between a.s. and in probability convergence to Professor Babii and formulate Kolmogorov's SLLN.",
      "readinessWeight": 15
    },
    {
      "day": 3,
      "date": "Day 3 (Central Limit Theorem & Approximations)",
      "title": "Central Limit Theorem (CLT) & Normal Approximations",
      "focus": "Lindeberg-Lévy CLT, MGF-based proof sketch, normal approximation for Binomial and Poisson sums, continuity corrections.",
      "tasks": [
        {
          "id": "t3_d3_t1",
          "text": "Master formulation of CLT: (S_n - n*mu) / (sigma * sqrt(n)) -> N(0, 1) in distribution.",
          "topic": "definitions",
          "target": "10"
        },
        {
          "id": "t3_d3_t2",
          "text": "Understand the proof sketch of CLT using Taylor expansion of log-MGF / characteristic functions.",
          "topic": "proofs"
        },
        {
          "id": "t3_d3_t3",
          "text": "Solve Problem 3 from Midterm: Probability limits of Arman's startup across 3 growth rates (constant, sqrt(n), n).",
          "topic": "problems",
          "target": "midterm-p3"
        },
        {
          "id": "t3_d3_t4",
          "text": "Solve Airline Overbooking problem: Calculating maximum tickets n such that overbooking probability is under 5%.",
          "topic": "problems"
        },
        {
          "id": "t3_d3_t5",
          "text": "Complete 3 prolonged Pomodoro focus sessions (45 min each).",
          "topic": "pomodoro"
        }
      ],
      "colloquiumGoal": "State CLT with exact standardization (sigma*sqrt(n)) and know when to apply continuity correction (+/- 0.5) for discrete sums.",
      "readinessWeight": 14
    },
    {
      "day": 4,
      "date": "Day 4 (Sample Statistics & Special Distributions)",
      "title": "Sample Statistics, Sampling Distributions & Chi-Squared / Student t",
      "focus": "Seminar 8: Population vs Sample, Sample moments, Sample mean X_bar, Sample variance S^2 (Bessel's correction n-1), Chi-squared, Student's t, Fisher's F.",
      "tasks": [
        {
          "id": "t3_d4_t1",
          "text": "Master Definitions 12, 13 (Population parameters vs Sample statistics).",
          "topic": "definitions",
          "target": "12-13"
        },
        {
          "id": "t3_d4_t2",
          "text": "Understand why S^2 divides by n-1 instead of n: Rigorous proof that E[S^2] = sigma^2 (unbiasedness).",
          "topic": "proofs"
        },
        {
          "id": "t3_d4_t3",
          "text": "Learn distributions of sample statistics for normal samples: X_bar ~ N(mu, sigma^2/n), (n-1)S^2/sigma^2 ~ Chi^2(n-1).",
          "topic": "theory"
        },
        {
          "id": "t3_d4_t4",
          "text": "Complete Quiz 8: Descriptive Analysis & Special Distributions (10 questions).",
          "topic": "quiz",
          "target": "quiz-8"
        },
        {
          "id": "t3_d4_t5",
          "text": "Solve Problem: Sum of 120 Uniform RVs and accurate CLT tail probabilities.",
          "topic": "problems"
        }
      ],
      "colloquiumGoal": "Explain the role of degrees of freedom in Chi-squared and Student-t distributions and why sample variance requires n-1.",
      "readinessWeight": 12
    },
    {
      "day": 5,
      "date": "Day 5 (Point Estimation: MME)",
      "title": "Point Estimation: Method of Moments (MME)",
      "focus": "Seminar 9: Equating theoretical population moments to sample moments, solving systems for 1- and 2-parameter distributions.",
      "tasks": [
        {
          "id": "t3_d5_t1",
          "text": "Master Definition 15 (Method of Moments Estimator).",
          "topic": "definitions",
          "target": "15"
        },
        {
          "id": "t3_d5_t2",
          "text": "Derive MME for standard distributions: U(0, a), Gamma(alpha, beta), Exponential(lambda), Normal(mu, sigma^2).",
          "topic": "theory"
        },
        {
          "id": "t3_d5_t3",
          "text": "Solve Problem 4(a) from Midterm: Discrete distribution with unknown theta and MME formula.",
          "topic": "problems",
          "target": "midterm-p4"
        },
        {
          "id": "t3_d5_t4",
          "text": "Understand why MME may yield estimates outside the valid parameter space.",
          "topic": "traps"
        },
        {
          "id": "t3_d5_t5",
          "text": "Complete 2 prolonged focus sessions (50 min).",
          "topic": "pomodoro"
        }
      ],
      "colloquiumGoal": "Instantly formulate the system of equations E[X^k] = (1/n) sum X_i^k for MME without hesitation.",
      "readinessWeight": 11
    },
    {
      "day": 6,
      "date": "Day 6 (Point Estimation: MLE)",
      "title": "Maximum Likelihood Estimation (MLE) & Invariance Principle",
      "focus": "Seminar 9: Likelihood function L(theta), log-likelihood ell(theta), score equation d/d theta = 0, boundary MLE for U(0, a), invariance property.",
      "tasks": [
        {
          "id": "t3_d6_t1",
          "text": "Master Definition 16 (Maximum Likelihood Estimators & Invariance).",
          "topic": "definitions",
          "target": "16"
        },
        {
          "id": "t3_d6_t2",
          "text": "Derive MLE for Poisson, Exponential, and Normal distributions.",
          "topic": "theory"
        },
        {
          "id": "t3_d6_t3",
          "text": "Solve Problem 6 from Midterm: U(0, a) MLE a_hat = max(X_i) (boundary case where derivative is strictly positive).",
          "topic": "problems",
          "target": "midterm-p6"
        },
        {
          "id": "t3_d6_t4",
          "text": "Complete Quiz 9: Parameter Estimation (10 questions).",
          "topic": "quiz",
          "target": "quiz-9"
        },
        {
          "id": "t3_d6_t5",
          "text": "Complete 2 prolonged focus sessions (45 min).",
          "topic": "pomodoro"
        }
      ],
      "colloquiumGoal": "Confidently differentiate ln L(theta) and find MLE for any distribution family, recognizing when support depends on parameter.",
      "readinessWeight": 13
    },
    {
      "day": 7,
      "date": "Day 7 (Estimator Properties & Confidence Intervals)",
      "title": "Estimator Properties, Fisher Information & Confidence Intervals",
      "focus": "Unbiasedness, consistency, Slutsky's theorem, MSE = Var + Bias^2, Cramér-Rao lower bound, 100(1-alpha)% CI via pivotal quantities.",
      "tasks": [
        {
          "id": "t3_d7_t1",
          "text": "Master Definitions 17, 18, 21, 22 (Unbiasedness, Consistency, CI, Confidence level).",
          "topic": "definitions",
          "target": "17-18,21-22"
        },
        {
          "id": "t3_d7_t2",
          "text": "Solve Problem 5 from Midterm: Density exp{(6x - x^2)/(2*theta)}, finding MLE, proving unbiasedness and 95% Chi-squared CI.",
          "topic": "problems",
          "target": "midterm-p5"
        },
        {
          "id": "t3_d7_t3",
          "text": "Master construction of exact CIs for U(0, a) using pivot X_(n) / a ~ u^n.",
          "topic": "problems"
        },
        {
          "id": "t3_d7_t4",
          "text": "Learn CIs for normal mean: Z-interval (known sigma) and t-interval (unknown sigma).",
          "topic": "theory"
        },
        {
          "id": "t3_d7_t5",
          "text": "Complete prolonged focus session (60 min).",
          "topic": "pomodoro"
        }
      ],
      "colloquiumGoal": "Construct a confidence interval of any given level for normal, exponential, or uniform models in under 2 minutes.",
      "readinessWeight": 15
    },
    {
      "day": 8,
      "date": "Day 8 (Bayesian Estimation & Midterm 3 Simulation)",
      "title": "Bayesian Estimation, Conjugate Priors & Exam Simulation",
      "focus": "Prior and posterior distributions, Beta-Binomial, Gamma-Poisson, Normal-Normal, quadratic loss (Bayes estimator = posterior mean), complete Midterm 3 exam simulator.",
      "tasks": [
        {
          "id": "t3_d8_t1",
          "text": "Master Definitions 19, 20 (Bayesian estimator, Prior & Posterior, Conjugacy).",
          "topic": "definitions",
          "target": "19-20"
        },
        {
          "id": "t3_d8_t2",
          "text": "Solve Bayesian Coin problem: Prior Beta(2,2), 7 heads out of 10 tosses -> Posterior Beta(9, 5), Bayes estimate = 9/14.",
          "topic": "problems",
          "target": "bayes-coin"
        },
        {
          "id": "t3_d8_t3",
          "text": "Solve Bayesian lifetime & semiconductor chips problems (Exponential model with Gamma prior).",
          "topic": "problems",
          "target": "bayes-lifetime"
        },
        {
          "id": "t3_d8_t4",
          "text": "Complete Quiz 10: Bayesian and Interval Estimation (10 questions).",
          "topic": "quiz",
          "target": "quiz-10"
        },
        {
          "id": "t3_d8_t5",
          "text": "Take the FULL Module 3 Self-Test (24 questions) under timed exam conditions (80 min).",
          "topic": "quiz",
          "target": "self-test-m3"
        },
        {
          "id": "t3_d8_t6",
          "text": "Conduct error diagnostics with Gemini AI Tutor before the exam.",
          "topic": "gemini-review"
        }
      ],
      "colloquiumGoal": "Achieve 100% readiness for Midterm 3 and Colloquium 3: all 22 definitions, oral tickets, problems, and quizzes fully mastered!",
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
      "time": "3-4 min",
      "structure": [
        "1. Definitions of the three convergence modes: a.s. (almost surely), P (in probability), d (in distribution)",
        "2. Statement of the hierarchy theorem: X_n -> X a.s. => X_n -> X in P => X_n -> X in d",
        "3. Counterexamples: why in probability does not imply almost surely (typewriter sequence / sliding interval)",
        "4. Examiner Trap: when convergence in distribution IMPLIES convergence in probability (when limit X = c is constant!)"
      ],
      "speech": "Distinguished examiners! Consider a sequence of random variables $X_n$ defined on a probability space $(\\Omega, \\mathcal{F}, P)$. We distinguish three fundamental modes of convergence: 1) **Convergence almost everywhere (almost surely, a.s.)**: $P\\left(\\lim_{n \\to \\infty} X_n = X\\right) = 1$. For almost every sample point $\\omega \\in \\Omega$, the real sequence $X_n(\\omega)$ converges to $X(\\omega)$. 2) **Convergence in probability (in P)**: for every $\\varepsilon > 0$, $\\lim_{n \\to \\infty} P(|X_n - X| \\ge \\varepsilon) = 0$. 3) **Convergence in distribution (in law, d)**: $\\lim_{n \\to \\infty} F_{X_n}(x) = F_X(x)$ at all continuity points of $F_X$. The hierarchy is strictly: $X_n \\xrightarrow{a.s.} X \\implies X_n \\xrightarrow{P} X \\implies X_n \\xrightarrow{d} X$. The converses are false in general. A classic counterexample showing $P \\not\\implies a.s.$ is the 'typewriter' sequence of indicator variables $I_n = I_{A_k, j}$ on $[0, 1]$. Here $P(I_n = 1) \\to 0$, so $I_n \\xrightarrow{P} 0$, but at every point $\\omega$, $I_n(\\omega)$ takes values 1 and 0 infinitely often, so $\\lim I_n(\\omega)$ does not exist! Another counterexample showing $d \\not\\implies P$: let $X \\sim N(0, 1)$ and $X_n = -X$. Then $X_n \\sim N(0, 1)$, so $F_{X_n} = F_X$ ($X_n \\xrightarrow{d} X$), but $|X_n - X| = 2|X|$, so $P(|X_n - X| \\ge \\varepsilon) > 0$ for all $n$, hence no convergence in probability. However, there is a fundamental exception: if the limiting random variable is a deterministic constant $c$, then convergence in distribution is strictly equivalent to convergence in probability: $X_n \\xrightarrow{d} c \\iff X_n \\xrightarrow{P} c$!",
      "keyFormulas": [
        "X_n \\xrightarrow{a.s.} X \\implies X_n \\xrightarrow{P} X \\implies X_n \\xrightarrow{d} X",
        "\\lim_{n \\to \\infty} P(|X_n - c| \\ge \\varepsilon) = 0 \\iff X_n \\xrightarrow{d} c \\quad (c = \\text{const})"
      ],
      "examinerQuestions": [
        {
          "q": "Does convergence in distribution require all random variables to be defined on the same probability space?",
          "a": "No! Convergence in distribution concerns only CDFs on the real line, so $X_n$ and $X$ can be defined on completely different probability spaces. In contrast, a.s. and in probability convergence strictly require a common probability space $(\\Omega, \\mathcal{F}, P)$."
        },
        {
          "q": "Prove quickly why X_n -> c in distribution implies X_n -> c in probability.",
          "a": "For $\\varepsilon > 0$, $P(|X_n - c| \\ge \\varepsilon) = P(X_n \\le c - \\varepsilon) + P(X_n \\ge c + \\varepsilon) \\le F_{X_n}(c - \\varepsilon) + (1 - F_{X_n}(c + \\varepsilon/2))$. Since the CDF of constant $c$ is 0 for $x < c$ and 1 for $x > c$, continuity points yield limits $0 + (1 - 1) = 0$."
        }
      ]
    },
    {
      "id": 2,
      "number": 2,
      "title": "Markov's Inequality: Statement & 2-Line Rigorous Proof",
      "titleUa": "Нерівність Маркова: точне формулювання, доведення та область застосування",
      "time": "2-3 min",
      "structure": [
        "1. Necessary conditions: X >= 0 (strictly non-negative!) and a > 0",
        "2. Statement: P(X >= a) <= E[X] / a",
        "3. Two-line rigorous proof using the indicator function",
        "4. Applications: Foundation for Chebyshev, Cantelli, and Chernoff bounds"
      ],
      "speech": "Distinguished examiners! Markov's inequality is the bedrock of concentration inequalities in probability theory. Let $X$ be a non-negative random variable ($X \\ge 0$ almost surely) with finite expectation $E[X] < \\infty$. Then for any constant $a > 0$: $$P(X \\ge a) \\le \\frac{E[X]}{a}.$$ The proof is remarkably elegant and takes two lines. Consider the indicator random variable $I_{\\{X \\ge a\\}}$, which equals 1 when $X \\ge a$ and 0 otherwise. Because $X \\ge 0$, for every possible outcome $\\omega \\in \\Omega$, we have the pointwise inequality: $$X(\\omega) \\ge a \\cdot I_{\\{X \\ge a\\}}(\\omega).$$ Taking expectations on both sides and using monotonicity and linearity of expectation: $$E[X] \\ge E[a \\cdot I_{\\{X \\ge a\\}}] = a \\cdot E[I_{\\{X \\ge a\\}}] = a \\cdot P(X \\ge a).$$ Dividing both sides by the positive constant $a > 0$, we immediately obtain $P(X \\ge a) \\le \\frac{E[X]}{a}$. $\\blacksquare$ Markov's inequality requires only first-moment information. By applying Markov to increasing functions of $X$, we derive Chebyshev's inequality for $(X-\\mu)^2$ and the Chernoff bound for $e^{sX}$.",
      "keyFormulas": [
        "X \\ge a \\cdot I_{\\{X \\ge a\\}} \\quad (\\text{for } X \\ge 0, a > 0)",
        "P(X \\ge a) \\le \\frac{E[X]}{a}"
      ],
      "examinerQuestions": [
        {
          "q": "What happens if X can take negative values?",
          "a": "The inequality fails! If $X$ can be negative, $X \\ge a \\cdot I_{\\{X \\ge a\\}}$ is false when $X < 0$. However, we can apply Markov to $|X| \\ge 0$, yielding $P(|X| \\ge a) \\le E[|X|]/a$."
        },
        {
          "q": "Is Markov's inequality sharp (tight)?",
          "a": "Yes! Equality holds if and only if $X$ takes only two values: $a$ with probability $p$ and $0$ with probability $1-p$. Then $E[X] = ap$, so $P(X \\ge a) = p = E[X]/a$."
        }
      ]
    },
    {
      "id": 3,
      "number": 3,
      "title": "Chebyshev's and Cantelli's (One-sided) Inequalities",
      "titleUa": "Нерівність Чебишова та одностороння нерівність Кантеллі",
      "time": "3-4 min",
      "structure": [
        "1. Formulation of two-sided Chebyshev: P(|X - mu| >= k) <= Var(X) / k^2",
        "2. Derivation from Markov applied to Y = (X - mu)^2",
        "3. Formulation of Cantelli's one-sided inequality: P(X - mu >= k) <= Var(X) / (Var(X) + k^2)",
        "4. Why Cantelli is strictly sharper than dividing Chebyshev by 2"
      ],
      "speech": "Distinguished examiners! Let $X$ be any random variable with mean $\\mu = E[X]$ and finite variance $\\sigma^2 = \\text{Var}(X) < \\infty$. Chebyshev's two-sided inequality states that for any $k > 0$: $$P(|X - \\mu| \\ge k) \\le \\frac{\\sigma^2}{k^2}.$$ The proof is an immediate application of Markov's inequality: define the non-negative random variable $Y = (X - \\mu)^2 \\ge 0$. The event $\\{|X - \\mu| \\ge k\\}$ is identical to $\\{Y \\ge k^2\\}$. Applying Markov to $Y$ with threshold $k^2 > 0$: $$P(|X - \\mu| \\ge k) = P(Y \\ge k^2) \\le \\frac{E[Y]}{k^2} = \\frac{\\text{Var}(X)}{k^2}.$$ However, when we care only about a one-sided deviation $P(X - \\mu \\ge k)$, dividing Chebyshev's bound by 2 is valid only for symmetric distributions! In the general case, we use Cantelli's one-sided inequality: $$P(X - \\mu \\ge k) \\le \\frac{\\sigma^2}{\\sigma^2 + k^2}.$$ To see why Cantelli is superior: for $k = \\sigma$, Chebyshev gives $P(|X - \\mu| \\ge \\sigma) \\le 1$, which is completely vacuous. Dividing by 2 would naively guess $1/2$, but Cantelli rigorously proves $P(X - \\mu \\ge \\sigma) \\le \\frac{\\sigma^2}{\\sigma^2 + \\sigma^2} = \\frac{1}{2}$ for ANY distribution, without requiring symmetry!",
      "keyFormulas": [
        "P(|X - \\mu| \\ge k) \\le \\frac{\\sigma^2}{k^2} \\quad (\\text{Two-sided Chebyshev})",
        "P(X - \\mu \\ge k) \\le \\frac{\\sigma^2}{\\sigma^2 + k^2} \\quad (\\text{Cantelli's One-sided})"
      ],
      "examinerQuestions": [
        {
          "q": "How is Cantelli's inequality proven?",
          "a": "For any constant $u > 0$, $X - \\mu \\ge k \\iff (X - \\mu + u) \\ge k + u$. Since $(X - \\mu + u)^2 \\ge (k + u)^2$, apply Markov to get bound $\\frac{\\sigma^2 + u^2}{(k + u)^2}$. Minimizing this with respect to $u > 0$ yields optimal $u = \\sigma^2/k$, giving exactly $\\frac{\\sigma^2}{\\sigma^2 + k^2}$."
        }
      ]
    },
    {
      "id": 4,
      "number": 4,
      "title": "Laws of Large Numbers: WLLN vs SLLN",
      "titleUa": "Закони великих чисел: Слабкий ЗВЧ (WLLN) проти Сильного ЗВЧ (SLLN)",
      "time": "3-4 min",
      "structure": [
        "1. Setup for i.i.d. sample: sample average X_bar_n = S_n / n",
        "2. Weak Law (Khinchin / Chebyshev): formulation, proof via Chebyshev, and in probability convergence",
        "3. Strong Law (Kolmogorov): formulation of almost sure convergence and the E[|X|] < infty condition",
        "4. Conceptual distinction: point-in-time deviation vs whole-trajectory stability"
      ],
      "speech": "Distinguished examiners! The Laws of Large Numbers mathematically justify the frequency interpretation of probability and the validity of empirical sampling. Let $X_1, X_2, \\dots, X_n$ be independent identically distributed (i.i.d.) random variables with expectation $E[X_i] = \\mu$. Consider the sample average $\\bar{X}_n = \\frac{1}{n} \\sum_{i=1}^n X_i$. The **Weak Law of Large Numbers (WLLN)**, due to Khinchin, asserts convergence in probability: $$\\forall \\varepsilon > 0, \\quad \\lim_{n \\to \\infty} P(|\\bar{X}_n - \\mu| \\ge \\varepsilon) = 0.$$ If finite variance $\\sigma^2 < \\infty$ is assumed, Chebyshev's inequality gives a one-line proof: $$P(|\\bar{X}_n - \\mu| \\ge \\varepsilon) \\le \\frac{\\text{Var}(\\bar{X}_n)}{\\varepsilon^2} = \\frac{\\sigma^2}{n\\varepsilon^2} \\xrightarrow{n \\to \\infty} 0.$$ The **Strong Law of Large Numbers (SLLN)**, due to Kolmogorov, asserts almost sure convergence: $$P\\left(\\lim_{n \\to \\infty} \\bar{X}_n = \\mu\\right) = 1.$$ Kolmogorov proved that $E[|X_1|] < \\infty$ is both necessary and sufficient for SLLN to hold. The fundamental conceptual difference: WLLN guarantees that at any single distant horizon $n$, the chance of observing a large error $|\\bar{X}_n - \\mu| \\ge \\varepsilon$ is tiny. SLLN makes a much stronger claim: with probability 1, the ENTIRE sequence of sample means $\\bar{X}_n(\\omega)$ enters the $\\varepsilon$-strip around $\\mu$ and never leaves it for all sufficiently large $n$!",
      "keyFormulas": [
        "\\bar{X}_n \\xrightarrow{P} \\mu \\quad (\\text{WLLN: Khinchin})",
        "\\bar{X}_n \\xrightarrow{a.s.} \\mu \\quad (\\text{SLLN: Kolmogorov, } E[|X_1|] < \\infty)"
      ],
      "examinerQuestions": [
        {
          "q": "What happens to the sample mean if X_i follow the standard Cauchy distribution?",
          "a": "For Cauchy, $E[|X|] = \\infty$, so neither WLLN nor SLLN holds! The sample mean $\\bar{X}_n$ has the exact same Cauchy distribution for all $n$ and never concentrates around any constant."
        }
      ]
    },
    {
      "id": 5,
      "number": 5,
      "title": "Central Limit Theorem & MGF Sketch of Proof",
      "titleUa": "Центральна гранична теорема (ЦГТ) та ескіз доведення через MGF",
      "time": "3-4 min",
      "structure": [
        "1. Formulation of the Lindeberg-Lévy CLT for i.i.d. random variables",
        "2. Standardization: Z_n = (S_n - n*mu) / (sigma * sqrt(n))",
        "3. Proof sketch via Taylor expansion of Moment Generating Functions (MGF)",
        "4. Applications: Normal approximation for Binomial B(n, p) and Poisson(lambda)"
      ],
      "speech": "Distinguished examiners! The Central Limit Theorem explains why the Bell Curve / Normal distribution arises ubiquitously across science and engineering. Let $X_1, X_2, \\dots, X_n$ be i.i.d. random variables with mean $\\mu$ and variance $\\sigma^2 \\in (0, \\infty)$. The Lindeberg-Lévy CLT asserts that the standardized sum converges in distribution to the standard normal $N(0, 1)$: $$Z_n = \\frac{\\sum_{i=1}^n X_i - n\\mu}{\\sigma\\sqrt{n}} = \\frac{\\sqrt{n}(\\bar{X}_n - \\mu)}{\\sigma} \\xrightarrow{d} N(0, 1).$$ That is, $\\lim_{n \\to \\infty} P(Z_n \\le z) = \\Phi(z) = \\int_{-\\infty}^z \\frac{1}{\\sqrt{2\\pi}} e^{-t^2/2} dt$. The sketch of proof using MGFs is concise and elegant: Assume without loss of generality $\\mu = 0$ and $\\sigma^2 = 1$. The MGF of $X_1$ has second-order Taylor expansion around 0: $$M_X(s) = E[e^{sX}] = 1 + s E[X] + \\frac{s^2}{2} E[X^2] + o(s^2) = 1 + \\frac{s^2}{2} + o(s^2).$$ The standardized sum is $Z_n = \\frac{1}{\\sqrt{n}} \\sum_{i=1}^n X_i$. By independence, its MGF is: $$M_{Z_n}(s) = \\left[ M_X\\left(\\frac{s}{\\sqrt{n}}\\right) \\right]^n = \\left[ 1 + \\frac{s^2}{2n} + o\\left(\\frac{s^2}{n}\\right) \\right]^n.$$ Taking the limit as $n \\to \\infty$ using $\\lim (1 + a/n)^n = e^a$: $$\\lim_{n \\to \\infty} M_{Z_n}(s) = e^{s^2/2}.$$ Since $e^{s^2/2}$ is the unique MGF of $N(0, 1)$, by the continuity theorem for MGFs, $Z_n \\xrightarrow{d} N(0, 1)$!",
      "keyFormulas": [
        "Z_n = \\frac{S_n - n\\mu}{\\sigma\\sqrt{n}} \\xrightarrow{d} N(0, 1)",
        "\\lim_{n \\to \\infty} \\left(1 + \\frac{s^2}{2n}\\right)^n = e^{s^2/2} = M_{N(0,1)}(s)"
      ],
      "examinerQuestions": [
        {
          "q": "Why do we apply a continuity correction (+/- 0.5) when approximating discrete random variables?",
          "a": "Because discrete variables place mass at integer points. To approximate $P(S_n \\le k)$, the histogram bar for $k$ extends from $k - 0.5$ to $k + 0.5$. Integrating the continuous normal density up to $k + 0.5$ captures this entire bar, dramatically reducing approximation error."
        }
      ]
    },
    {
      "id": 6,
      "number": 6,
      "title": "Population Parameters vs Sample Statistics",
      "titleUa": "Параметри генеральної сукупності проти вибіркових статистик",
      "time": "3 min",
      "structure": [
        "1. Population and parameter theta: deterministic, unknown constants of distribution F_theta",
        "2. Sample (X_1, ..., X_n) and sample statistic T = g(X_1, ..., X_n): observable functions without unknown parameters",
        "3. Sampling distribution of a statistic: T is a random variable with its own mean and variance",
        "4. Estimator (rule / random variable) vs Estimate (realized numerical value)"
      ],
      "speech": "Distinguished examiners! Mathematical statistics begins with the foundational dichotomy between the population and the sample. A **population** is the full theoretical set of all possible entities or outcomes, modeled by a distribution function $F(x | \\theta)$ indexed by a **parameter** $\\theta \\in \\Theta$. The parameter $\\theta$ is a fixed, non-random, deterministic, yet unknown constant (e.g. population mean $\\mu$, variance $\\sigma^2$, or success probability $p$). A **sample** $(X_1, \\dots, X_n)$ is a collection of observable random variables drawn from the population, typically assumed to be independent and identically distributed (i.i.d.). A **sample statistic** $T = g(X_1, \\dots, X_n)$ is any measurable function of the sample that **does not depend on any unknown parameters**. Crucially, because the sample $(X_1, \\dots, X_n)$ is random, any statistic $T$ is itself a **random variable** and possesses its own probability distribution, known as the **sampling distribution**. Finally, we distinguish an **estimator** from an **estimate**: - An **estimator** $\\hat{\\theta} = g(X_1, \\dots, X_n)$ is a formula, function, and random variable. - An **estimate** $\\hat{\\theta}_{\\text{obs}} = g(x_1, \\dots, x_n)$ is the concrete numerical value obtained after data is observed. For instance, $\\bar{X}$ is an estimator; 4.23 is an estimate.",
      "keyFormulas": [
        "\\theta \\in \\Theta \\quad (\\text{Deterministic unknown constant})",
        "T = g(X_1, \\dots, X_n) \\quad (\\text{Statistic: random variable with sampling distribution})"
      ],
      "examinerQuestions": [
        {
          "q": "Is T = (X_bar - mu) / sigma a sample statistic?",
          "a": "No! It depends on the unknown parameters $\\mu$ and $\\sigma$. Such expressions are pivotal quantities, not statistics. A statistic must be computable strictly from observable sample data alone."
        }
      ]
    },
    {
      "id": 7,
      "number": 7,
      "title": "Method of Moments (MME): Principle & System of Equations",
      "titleUa": "Метод моментів (MME): принцип, рівняння та властивості",
      "time": "3-4 min",
      "structure": [
        "1. Principle: equating theoretical moments mu_k(theta) to sample moments m_hat_k",
        "2. Formulation of the system of equations for p parameters",
        "3. Concrete examples: U(0, a) and Gamma(alpha, beta)",
        "4. Theoretical properties: strong consistency via SLLN, asymptotic normality, but potential lack of efficiency"
      ],
      "speech": "Distinguished examiners! The Method of Moments (MME), introduced by Karl Pearson, is one of the earliest and most intuitive point estimation techniques. The core idea is based on the Law of Large Numbers: theoretical population moments $\\mu_k(\\theta) = E[X^k]$ should be close to their empirical sample analogues $\\hat{m}_k = \\frac{1}{n} \\sum_{i=1}^n X_i^k$. To estimate $p$ unknown parameters $\\theta = (\\theta_1, \\dots, \\theta_p)$, we set up a system of $p$ equations: $$\\begin{cases} \\mu_1(\\theta_1, \\dots, \\theta_p) = \\hat{m}_1 = \\bar{X} \\\\ \\mu_2(\\theta_1, \\dots, \\theta_p) = \\hat{m}_2 = \\frac{1}{n} \\sum X_i^2 \\\\ \\vdots \\\\ \\mu_p(\\theta_1, \\dots, \\theta_p) = \\hat{m}_p = \\frac{1}{n} \\sum X_i^p \\end{cases}$$ Solving this system for $(\\theta_1, \\dots, \\theta_p)$ produces the MME estimators $\\hat{\\theta}_{\\text{MM}}$. For example, for $U(0, a)$, $E[X] = a/2$. Equating $\\bar{X} = a/2$ gives $\\hat{a}_{\\text{MM}} = 2\\bar{X}$. For properties: MME estimators are almost always **consistent** because sample moments $\\hat{m}_k \\xrightarrow{a.s.} \\mu_k$ by Kolmogorov's SLLN, and continuous mappings preserve convergence. However, MME estimators are often not asymptotically efficient (they do not achieve the Cramér-Rao lower bound) and can occasionally produce estimates outside the valid parameter support (e.g. $2\\bar{X}$ could be strictly smaller than the observed maximum $X_{(n)}$!).",
      "keyFormulas": [
        "\\mu_k(\\theta) = E[X^k] = \\frac{1}{n} \\sum_{i=1}^n X_i^k = \\hat{m}_k \\quad (k = 1, \\dots, p)",
        "\\hat{a}_{\\text{MM}} = 2\\bar{X} \\quad (\\text{for } U(0, a))"
      ],
      "examinerQuestions": [
        {
          "q": "Why is 2*X_bar problematic for U(0, a)?",
          "a": "Because $X_i \\le a$ strictly. If we observe a sample with maximum $X_{(n)} = 9.8$ and mean $\\bar{X} = 4.5$, then $\\hat{a}_{\\text{MM}} = 9.0 < 9.8$, which claims the upper bound is 9.0 even though we already observed 9.8! MLE fixes this by choosing $\\hat{a}_{\\text{ML}} = X_{(n)}$."
        }
      ]
    },
    {
      "id": 8,
      "number": 8,
      "title": "Maximum Likelihood Estimation (MLE) & Score Function",
      "titleUa": "Метод максимальної вірогідності (MLE): функція правдоподібності, score-функція та межі носія",
      "time": "3-4 min",
      "structure": [
        "1. Definitions of likelihood L(theta) and log-likelihood ell(theta)",
        "2. Score function S(theta) = d ell / d theta and the score equation S(theta) = 0",
        "3. The Invariance Property: MLE of g(theta) is g(theta_hat)",
        "4. Boundary case: when support depends on parameter (e.g. U(0, theta))"
      ],
      "speech": "Distinguished examiners! Maximum Likelihood Estimation (MLE), pioneered by Ronald Fisher, is the gold standard of classical parameter estimation. For an i.i.d. sample $(X_1, \\dots, X_n)$ with density $f(x | \\theta)$, the **likelihood function** is: $$L(\\theta; x) = \\prod_{i=1}^n f(x_i | \\theta).$$ Because the product is computationally unwieldy, we take the natural logarithm to obtain the **log-likelihood**: $$\\ell(\\theta; x) = \\ln L(\\theta; x) = \\sum_{i=1}^n \\ln f(x_i | \\theta).$$ Since the logarithm is strictly increasing, maximizing $\\ell(\\theta)$ is equivalent to maximizing $L(\\theta)$. When the support does not depend on $\\theta$, we set the derivative (the **score function**) to zero: $$S(\\theta) = \\frac{\\partial \\ell(\\theta)}{\\partial \\theta} = 0, \\quad \\text{and verify } \\frac{\\partial^2 \\ell}{\\partial \\theta^2} < 0.$$ A magnificent property of MLE is **functional invariance**: if $\\hat{\\theta}$ is the MLE of $\\theta$, then for ANY function $g(\\theta)$, the MLE of $g(\\theta)$ is simply $g(\\hat{\\theta})$. Exam Trap: If the support depends on $\\theta$, differentiation is invalid! For example, for $X_i \\sim U(0, a)$, $L(a) = a^{-n} I_{\\{a \\ge X_{(n)}\\}}$. Here $a^{-n}$ is strictly decreasing in $a$. The maximum is attained at the smallest permissible value of $a$, which is the sample maximum: $\\hat{a}_{\\text{ML}} = \\max(X_1, \\dots, X_n) = X_{(n)}$!",
      "keyFormulas": [
        "\\ell(\\theta) = \\sum_{i=1}^n \\ln f(X_i | \\theta), \\quad S(\\theta) = \\frac{\\partial \\ell}{\\partial \\theta} = 0",
        "\\widehat{g(\\theta)}_{\\text{ML}} = g(\\hat{\\theta}_{\\text{ML}}) \\quad (\\text{Invariance Property})"
      ],
      "examinerQuestions": [
        {
          "q": "What are the asymptotic properties of MLE under standard regularity conditions?",
          "a": "Under regularity conditions, the MLE is strongly consistent $\\hat{\\theta}_n \\xrightarrow{P} \\theta$, asymptotically normal $\\sqrt{n}(\\hat{\\theta}_n - \\theta) \\xrightarrow{d} N(0, 1/I_1(\\theta))$, and asymptotically efficient (attains the Cramér-Rao lower bound)."
        }
      ]
    },
    {
      "id": 9,
      "number": 9,
      "title": "Unbiasedness vs Consistency: Definitions & Traps",
      "titleUa": "Незміщеність проти Слушності (Consistency): порівняння та класичні пастки",
      "time": "3-4 min",
      "structure": [
        "1. Exact definition of unbiasedness: E_theta[theta_hat] = theta for all theta (finite-sample)",
        "2. Exact definition of consistency: theta_hat_n -> theta in probability (asymptotic)",
        "3. Example of biased yet consistent estimator: S_n^2 with 1/n or max(X_i) for U(0, a)",
        "4. Example of unbiased yet INCONSISTENT estimator: taking the first single observation X_1"
      ],
      "speech": "Distinguished examiners! Unbiasedness and consistency are two primary benchmarks of estimator quality, but they operate on fundamentally different mathematical planes. 1) **Unbiasedness** is a **finite-sample property**. An estimator $\\hat{\\theta}$ is unbiased for $\\theta$ if its expectation equals the true parameter for every sample size $n$ and every parameter value: $$E_\\theta[\\hat{\\theta}] = \\theta, \\quad \\forall \\theta \\in \\Theta.$$ The bias is $\\text{Bias}(\\hat{\\theta}) = E[\\hat{\\theta}] - \\theta$. 2) **Consistency** is an **asymptotic large-sample property**. An estimator sequence $\\hat{\\theta}_n$ is weakly consistent if it converges in probability to $\\theta$ as $n \\to \\infty$: $$\\forall \\varepsilon > 0, \\quad \\lim_{n \\to \\infty} P(|\\hat{\\theta}_n - \\theta| \\ge \\varepsilon) = 0 \\quad (\\hat{\\theta}_n \\xrightarrow{P} \\theta).$$ Exam Traps: Unbiasedness and consistency neither imply nor require each other! - **Biased but consistent**: The standard sample variance $S_n^2 = \\frac{1}{n} \\sum (X_i - \\bar{X})^2$ has $E[S_n^2] = \\frac{n-1}{n}\\sigma^2 \\ne \\sigma^2$ (biased), but $S_n^2 \\xrightarrow{P} \\sigma^2$ (consistent). Similarly, $\\hat{a} = X_{(n)}$ for $U(0, a)$ has $E[X_{(n)}] = \\frac{n}{n+1}a$ (biased), but $X_{(n)} \\xrightarrow{P} a$ (consistent). - **Unbiased but INCONSISTENT**: Consider estimating the population mean $\\mu$ using only the first observation: $\\hat{\\mu} = X_1$. Then $E[\\hat{\\mu}] = E[X_1] = \\mu$, so it is perfectly unbiased for all $n$. However, its variance is always $\\sigma^2 > 0$ regardless of $n$, so $X_1$ never converges in probability to $\\mu$!",
      "keyFormulas": [
        "\\text{Bias}(\\hat{\\theta}) = E_\\theta[\\hat{\\theta}] - \\theta = 0 \\quad (\\text{Unbiasedness})",
        "\\lim_{n \\to \\infty} P(|\\hat{\\theta}_n - \\theta| < \\varepsilon) = 1 \\quad (\\text{Consistency})"
      ],
      "examinerQuestions": [
        {
          "q": "What is the sufficient condition for an estimator to be consistent?",
          "a": "If $\\text{Bias}(\\hat{\\theta}_n) \\to 0$ and $\\text{Var}(\\hat{\\theta}_n) \\to 0$ as $n \\to \\infty$, then $\\text{MSE}(\\hat{\\theta}_n) \\to 0$. By Chebyshev's inequality, $P(|\\hat{\\theta}_n - \\theta| \\ge \\varepsilon) \\le \\text{MSE}/\\varepsilon^2 \\to 0$, which proves consistency."
        }
      ]
    },
    {
      "id": 10,
      "number": 10,
      "title": "Mean Squared Error (MSE) & Cramér-Rao Lower Bound",
      "titleUa": "Середньоквадратична помилка (MSE), інформація Фішера та нерівність Рао-Крамера",
      "time": "3-4 min",
      "structure": [
        "1. MSE decomposition into variance and squared bias: MSE = Var + Bias^2",
        "2. Fisher Information: definition I(theta) = E[(d ln f / d theta)^2] = -E[d^2 ln f / d theta^2]",
        "3. Cramér-Rao Lower Bound (CRLB) for unbiased estimators: Var(theta_hat) >= 1 / (n * I_1(theta))",
        "4. Efficient estimators and Uniformly Minimum Variance Unbiased Estimators (UMVUE)"
      ],
      "speech": "Distinguished examiners! When comparing different estimators, the standard performance metric is the **Mean Squared Error (MSE)**: $$\\text{MSE}(\\hat{\\theta}) = E[(\\hat{\\theta} - \\theta)^2].$$ A fundamental algebraic decomposition splits MSE into variance and bias: $$\\text{MSE}(\\hat{\\theta}) = \\text{Var}(\\hat{\\theta}) + [\\text{Bias}(\\hat{\\theta})]^2.$$ This formalizes the classic Bias-Variance tradeoff: a slightly biased estimator with substantially lower variance can have smaller overall MSE than an unbiased estimator. For unbiased estimators (where $\\text{Bias} = 0$), MSE equals variance. How low can this variance go? The answer is given by the **Cramér-Rao Lower Bound (CRLB)**. We define the **Fisher Information** contained in a single observation: $$I_1(\\theta) = E\\left[\\left(\\frac{\\partial \\ln f(X|\\theta)}{\\partial \\theta}\\right)^2\\right] = -E\\left[\\frac{\\partial^2 \\ln f(X|\\theta)}{\\partial \\theta^2}\\right].$$ For an i.i.d. sample of size $n$, the total Fisher information is additive: $I_n(\\theta) = n I_1(\\theta)$. The Cramér-Rao Theorem states that for any unbiased estimator $\\hat{\\theta}$: $$\\text{Var}(\\hat{\\theta}) \\ge \\frac{1}{n I_1(\\theta)}.$$ An unbiased estimator whose variance achieves this theoretical minimum is called **efficient** (or UMVUE). For example, for $N(\\mu, \\sigma^2)$, $\\bar{X}$ achieves CRLB $\\sigma^2/n$ exactly!",
      "keyFormulas": [
        "\\text{MSE}(\\hat{\\theta}) = \\text{Var}(\\hat{\\theta}) + (E[\\hat{\\theta}] - \\theta)^2",
        "\\text{Var}(\\hat{\\theta}) \\ge \\frac{1}{n I_1(\\theta)}, \\quad I_1(\\theta) = -E\\left[\\frac{\\partial^2 \\ln f}{\\partial \\theta^2}\\right]"
      ],
      "examinerQuestions": [
        {
          "q": "Can CRLB be applied to U(0, theta)?",
          "a": "No! Regularity conditions require the support of $f(x|\\theta)$ to be independent of $\\theta$, so integration and differentiation can be interchanged. For $U(0, \\theta)$, the support $[0, \\theta]$ depends on $\\theta$, so CRLB is invalid. Indeed, $\\text{Var}(X_{(n)}) \\propto 1/n^2$, which shrinks faster than $1/n$!"
        }
      ]
    },
    {
      "id": 11,
      "number": 11,
      "title": "Confidence Intervals: Pivotal Method (Z vs t Distribution)",
      "titleUa": "Довірчі інтервали: метод півотів, різниця між Z- та t-розподілами Стьюдента",
      "time": "3-4 min",
      "structure": [
        "1. Rigorous definition of a 100(1-alpha)% confidence interval [L(X), U(X)]",
        "2. The Pivotal Quantity method: Q(X, theta) having parameter-free distribution",
        "3. Known variance sigma^2: standard normal Z-pivot and Z-interval",
        "4. Unknown variance sigma^2: Student's t-pivot and t-interval with n-1 degrees of freedom"
      ],
      "speech": "Distinguished examiners! In interval estimation, rather than providing a single point guess, we construct a random interval $[L(X), U(X)]$ that covers the true parameter with guaranteed probability $1 - \\alpha$: $$P_\\theta(L(X) \\le \\theta \\le U(X)) = 1 - \\alpha, \\quad \\forall \\theta \\in \\Theta.$$ Here $1 - \\alpha$ is the **confidence level** (e.g. 0.95 or 0.99). The standard method of construction is the **Pivotal Quantity Method**. A pivot $Q(X_1, \\dots, X_n; \\theta)$ is a function of the sample and parameter whose probability distribution is completely known and **does not depend on $\\theta$**. Case 1: Normal mean $\\mu$ with **known variance $\\sigma^2$**: The pivot is $Z = \\frac{\\bar{X} - \\mu}{\\sigma / \\sqrt{n}} \\sim N(0, 1)$. Setting $P(-z_{1-\\alpha/2} \\le Z \\le z_{1-\\alpha/2}) = 1 - \\alpha$ and inverting for $\\mu$ gives the **Z-interval**: $$\\bar{X} \\pm z_{1-\\alpha/2} \\frac{\\sigma}{\\sqrt{n}}.$$ Case 2: Normal mean $\\mu$ with **unknown variance $\\sigma^2$**: Replacing $\\sigma$ by the sample standard deviation $S$ yields the Student-t pivot: $$T = \\frac{\\bar{X} - \\mu}{S / \\sqrt{n}} \\sim t_{n-1}.$$ Inverting gives the **t-interval**: $$\\bar{X} \\pm t_{1-\\alpha/2}^{(n-1)} \\frac{S}{\\sqrt{n}}.$$ Because Student's t has heavier tails due to the additional uncertainty in estimating $\\sigma$, the critical value $t_{1-\\alpha/2}^{(n-1)}$ is strictly larger than $z_{1-\\alpha/2}$, producing a wider, more conservative interval.",
      "keyFormulas": [
        "\\bar{X} \\pm z_{1-\\alpha/2} \\frac{\\sigma}{\\sqrt{n}} \\quad (\\sigma \\text{ known, } N(0,1))",
        "\\bar{X} \\pm t_{1-\\alpha/2}^{(n-1)} \\frac{S}{\\sqrt{n}} \\quad (\\sigma \\text{ unknown, } t_{n-1})"
      ],
      "examinerQuestions": [
        {
          "q": "What is the proper interpretation of a 95% confidence interval?",
          "a": "It means: in repeated sampling, 95% of the calculated intervals $[L, U]$ will contain the fixed parameter $\\theta$. It is INCORRECT to say 'the parameter has a 95% probability of lying in [2.1, 4.5]'; once realized, the numbers are fixed and either contain $\\theta$ or do not (probability 1 or 0)."
        }
      ]
    },
    {
      "id": 12,
      "number": 12,
      "title": "Bayesian Estimation & Conjugate Priors (Beta & Gamma)",
      "titleUa": "Баєсівське оцінювання: теорема Баєса, апріорні та апостеріорні розподіли, спряжені пари",
      "time": "3-4 min",
      "structure": [
        "1. The Bayesian paradigm: theta as a random variable with prior distribution pi(theta)",
        "2. Bayes theorem for posterior density: pi(theta | x) proportional to f(x | theta) * pi(theta)",
        "3. Quadratic loss function and the Bayes estimator as the posterior mean E[theta | X]",
        "4. Conjugate prior pairs: Beta-Binomial and Gamma-Poisson"
      ],
      "speech": "Distinguished examiners! In contrast to the frequentist paradigm where parameters are fixed unknown constants, **Bayesian statistics** treats the parameter $\\theta$ as a **random variable** itself. Our beliefs prior to observing the sample are encoded in the **prior distribution** $\\pi(\\theta)$. Given observed data $x = (x_1, \\dots, x_n)$, we update our beliefs via Bayes' Theorem to obtain the **posterior distribution**: $$\\pi(\\theta | x) = \\frac{f(x | \\theta) \\pi(\\theta)}{\\int_\\Theta f(x | \\tilde{\\theta}) \\pi(\\tilde{\\theta}) d\\tilde{\\theta}} \\propto f(x | \\theta) \\pi(\\theta) \\quad (\\text{Likelihood} \\times \\text{Prior}).$$ Under the standard quadratic loss function $L(\\theta, \\hat{\\theta}) = (\\hat{\\theta} - \\theta)^2$, the optimal point estimator minimizing expected posterior risk is the **posterior mean**: $$\\hat{\\theta}_{\\text{Bayes}} = E[\\theta | X] = \\int_\\Theta \\theta \\pi(\\theta | x) d\\theta.$$ A prior is called **conjugate** if the posterior belongs to the exact same distribution family as the prior. Two fundamental conjugate models in our course: 1) **Beta-Binomial**: For coin tosses with $k$ heads out of $n$, prior $\\theta \\sim \\text{Beta}(\\alpha, \\beta)$ yields posterior $\\theta | x \\sim \\text{Beta}(\\alpha + k, \\beta + n - k)$. The Bayes estimator is $\\hat{\\theta}_{\\text{Bayes}} = \\frac{\\alpha + k}{\\alpha + \\beta + n}$, which beautifully balances prior mean $\\frac{\\alpha}{\\alpha+\\beta}$ and sample mean $\\frac{k}{n}$! 2) **Gamma-Poisson**: For $X_i \\sim \\text{Poisson}(\\lambda)$, prior $\\lambda \\sim \\text{Gamma}(\\alpha, \\beta)$ yields posterior $\\lambda | x \\sim \\text{Gamma}(\\alpha + \\sum X_i, \\beta + n)$ with Bayes estimate $\\hat{\\lambda}_{\\text{Bayes}} = \\frac{\\alpha + \\sum X_i}{\\beta + n}$.",
      "keyFormulas": [
        "\\pi(\\theta | x) \\propto f(x | \\theta) \\pi(\\theta) \\quad (\\text{Likelihood} \\times \\text{Prior})",
        "\\hat{\\theta}_{\\text{Bayes}} = E[\\theta | X] = \\frac{\\alpha + \\sum X_i}{\\beta + n} \\quad (\\text{Gamma-Poisson})"
      ],
      "examinerQuestions": [
        {
          "q": "What happens to the Bayesian estimator as the sample size n approaches infinity?",
          "a": "As $n \\to \\infty$, the data dominates the prior, and the Bayes estimator converges to the Maximum Likelihood Estimator (MLE). This demonstrates Bayesian consistency: the influence of the subjective prior washes out as empirical evidence accumulates."
        }
      ]
    }
  ],
  "PROBLEMS_BANK": [
    {
      "id": "p_t3_1",
      "title": "Conceptual Multiple Choice Questions (Midterm 3 Problem 1)",
      "source": "Midterm Exam 2024 / 2022",
      "topic": "Limit Theorems & Parameter Estimation",
      "points": 10,
      "question": "Solve the 5 conceptual multiple choice questions from the official Midterm 3 exam paper:\n\n1. Assume that $S_n$ is the sum of i.i.d. random variables $X_1, \\dots, X_n$ with mean $0$ and variance $1$. Then $S_n / n$ converges as $n \\to \\infty$ (choose all that apply):\n(a) almost surely, (b) in probability, (c) in distribution.\n\n2. Convergence in probability is asserted by the following classical theorem(s) (choose all that apply):\n(a) WLLN, (b) SLLN, (c) CLT, (d) Poisson.\n\n3. The moment method estimator for the parameter $\\theta := \\mu^2$ from a sample with mean $\\bar{X}$ is:\n(a) $\\bar{X}/\\sigma$, (b) $\\mu/S$, (c) $\\bar{X}/S$, (d) $\\bar{X}^2$.\n\n4. The approximate $99\\%$ confidence interval for $\\theta := \\mu$ if $\\sigma^2$ is unknown is:\n(a) $\\bar{X} \\pm \\frac{S}{\\sqrt{n}} t_{0.995}^{(n-1)}$, (b) $\\bar{X} \\pm \\frac{\\sigma}{\\sqrt{n}} t_{0.995}^{(n-1)}$, (c) $\\bar{X} \\pm \\frac{S}{\\sqrt{n}} z_{0.99}$.\n\n5. If we increase the sample size $n$, the length of the confidence interval will:\n(a) decrease, (b) increase, (c) cannot be determined.",
      "solution": "**Complete Academic Solution:**\n\n1. **Convergence of $S_n / n$:**\n   - By Kolmogorov's SLLN, since $E[|X_i|] < \\infty$ ($E[X_i] = 0$), $S_n/n \\xrightarrow{a.s.} 0$.\n   - Almost sure convergence implies convergence in probability ($a.s. \\implies P$), so $S_n/n \\xrightarrow{P} 0$.\n   - Convergence in probability implies convergence in distribution ($P \\implies d$), so $S_n/n \\xrightarrow{d} 0$.\n   - **Answer:** (a), (b), (c) — all three!\n\n2. **Theorems asserting convergence in probability:**\n   - WLLN directly asserts $\\bar{X}_n \\xrightarrow{P} \\mu$.\n   - SLLN asserts $\\bar{X}_n \\xrightarrow{a.s.} \\mu$, which implies $\\bar{X}_n \\xrightarrow{P} \\mu$.\n   - **Answer:** (a), (b).\n\n3. **MME estimator for $\\theta = \\mu^2$:**\n   - The first theoretical moment is $E[X] = \\mu$, and the first sample moment is $\\bar{X}$. Thus $\\hat{\\mu} = \\bar{X}$, and $\\hat{\\theta}_{MM} = \\hat{\\mu}^2 = \\bar{X}^2$.\n   - **Answer:** (d) $\\bar{X}^2$.\n\n4. **$99\\%$ CI for $\\mu$ with unknown $\\sigma^2$:**\n   - When $\\sigma^2$ is unknown, we replace it by sample standard deviation $S$, giving Student's $t_{n-1}$ distribution. The critical quantile for confidence level $1 - \\alpha = 0.99$ is $t_{1 - \\alpha/2} = t_{0.995}^{(n-1)}$.\n   - **Answer:** (a) $\\bar{X} \\pm \\frac{S}{\\sqrt{n}} t_{0.995}^{(n-1)}$.\n\n5. **Length of CI as $n$ increases:**\n   - The margin of error is $2 \\cdot t_{1-\\alpha/2}^{(n-1)} \\frac{S}{\\sqrt{n}} = O(1/\\sqrt{n})$, which decreases to 0 as $n \\to \\infty$.\n   - **Answer:** (a) decrease.",
      "inputPrompt": "Enter the correct letters in order (e.g. a,b,c; a,b; d; a; a):",
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
      "title": "Complete the Definitions & Statements (Midterm 3 Problem 2)",
      "source": "Midterm Exam 2024 / 2022",
      "topic": "Theoretical Formulations",
      "points": 10,
      "question": "Complete the 5 fundamental definitions and statements from the course:\n\n1. For i.i.d. random variables $X_1, X_2, \\dots$ the WLLN asserts that: ...\n2. If $[a(X), b(X)]$ is a $99\\%$ confidence interval for a parameter $\\theta$, then: ...\n3. The estimator $\\hat{\\theta}_n$ of a parameter $\\theta$ is called consistent if: ...\n4. If $X_1, \\dots, X_n$ are i.i.d. random variables with exponential distribution $E(\\lambda)$, then the distribution of the statistic $T(X) = X_1 + \\dots + X_n$ is: ...\n5. Given the quantile $z_\\alpha$ of the standard normal distribution of level $\\alpha$, the quantile $z_{1-\\alpha}$ is equal to: ...",
      "solution": "**Official Model Answers:**\n\n1. **WLLN Statement:**\n   $$\\forall \\varepsilon > 0, \\quad \\lim_{n \\to \\infty} P(|\\bar{X}_n - \\mu| \\ge \\varepsilon) = 0 \\quad (\\text{or } \\bar{X}_n \\xrightarrow{P} \\mu).$$\n\n2. **Confidence Interval Definition:**\n   $$P_\\theta(a(X) \\le \\theta \\le b(X)) = 0.99 \\quad \\forall \\theta \\in \\Theta.$$\n\n3. **Consistent Estimator:**\n   $$\\hat{\\theta}_n \\xrightarrow{P} \\theta \\quad \\text{as } n \\to \\infty \\quad (\\lim_{n \\to \\infty} P(|\\hat{\\theta}_n - \\theta| < \\varepsilon) = 1, \\; \\forall \\varepsilon > 0).$$\n\n4. **Distribution of Sum of Exponentials:**\n   - Gamma distribution $\\Gamma(n, \\lambda)$ (or Erlang distribution with shape $n$ and rate $\\lambda$).\n\n5. **Normal Quantile Symmetry:**\n   $$z_{1-\\alpha} = -z_\\alpha.$$",
      "inputPrompt": "Enter the distribution name of the sum of exponentials (e.g. Gamma or Erlang):",
      "expectedAnswer": "Gamma",
      "acceptableAnswers": [
        "Gamma",
        "Gamma(n, lambda)",
        "gamma",
        "Erlang",
        "-z_alpha"
      ]
    },
    {
      "id": "p_t3_3",
      "title": "Probability Limits & Arman's Startup (Midterm 3 Problem 3)",
      "source": "Midterm Exam 2024 / 2022",
      "topic": "Central Limit Theorem (CLT)",
      "points": 20,
      "question": "IT guru Arman plans to launch a start-up and is raising money. Each week, he succeeds to raise either 1000 UAH or nothing with equal chances $1/2$. Denote by $S_n$ the amount (in thousands of UAH) Arman has raised after $n$ weeks.\n\nEstimate the value for the limit as $n \\to \\infty$ for the following three expressions (justify your answer!):\n(a) $\\lim_{n \\to \\infty} P\\left( \\frac{n}{2} - 10 \\le S_n \\le \\frac{n}{2} + 10 \\right)$\n(b) $\\lim_{n \\to \\infty} P\\left( \\frac{n}{2} - \\frac{n}{10} \\le S_n \\le \\frac{n}{2} + \\frac{n}{10} \\right)$\n(c) $\\lim_{n \\to \\infty} P\\left( \\frac{n}{2} - \\frac{\\sqrt{n}}{2} \\le S_n \\le \\frac{n}{2} + \\frac{\\sqrt{n}}{2} \\right)$",
      "solution": "**Complete Mathematical Analysis via CLT:**\n\nEach weekly fundraising outcome $X_i \\in \\{0, 1\\}$ is Bernoulli with $p = 1/2$:\n$$\\mu = E[X_i] = 1/2, \\quad \\sigma^2 = \\text{Var}(X_i) = p(1-p) = 1/4, \\quad \\sigma = 1/2.$$\nThe sum $S_n = \\sum_{i=1}^n X_i$ has mean $n/2$ and standard deviation $\\sigma\\sqrt{n} = \\frac{\\sqrt{n}}{2}$.\nBy the Central Limit Theorem:\n$$Z_n = \\frac{S_n - n/2}{\\sqrt{n}/2} \\xrightarrow{d} N(0, 1).$$\n\n**(a) Limit for fixed interval $\\pm 10$:**\n$$P\\left(-10 \\le S_n - n/2 \\le 10\\right) = P\\left(-\\frac{20}{\\sqrt{n}} \\le Z_n \\le \\frac{20}{\\sqrt{n}}\\right).$$\nAs $n \\to \\infty$, the interval width $\\pm \\frac{20}{\\sqrt{n}} \\to 0$. Therefore:\n$$\\lim_{n \\to \\infty} P\\left( \\frac{n}{2} - 10 \\le S_n \\le \\frac{n}{2} + 10 \\right) = \\Phi(0) - \\Phi(0) = 0.$$\n\n**(b) Limit for proportional interval $\\pm n/10$:**\n$$P\\left(-\\frac{n}{10} \\le S_n - n/2 \\le \\frac{n}{10}\\right) = P\\left(-\\frac{n/10}{\\sqrt{n}/2} \\le Z_n \\le \\frac{n/10}{\\sqrt{n}/2}\\right) = P\\left(-\\frac{\\sqrt{n}}{5} \\le Z_n \\le \\frac{\\sqrt{n}}{5}\\right).$$\nAs $n \\to \\infty$, $\\frac{\\sqrt{n}}{5} \\to \\infty$. Alternatively, by WLLN: $P(|S_n/n - 1/2| \\le 1/10) \\to 1$.\n$$\\lim_{n \\to \\infty} P\\left( \\frac{n}{2} - \\frac{n}{10} \\le S_n \\le \\frac{n}{2} + \\frac{n}{10} \\right) = 1.$$\n\n**(c) Limit for diffusion scale $\\pm \\sqrt{n}/2$:**\n$$P\\left(-\\frac{\\sqrt{n}}{2} \\le S_n - n/2 \\le \\frac{\\sqrt{n}}{2}\\right) = P\\left(-1 \\le \\frac{S_n - n/2}{\\sqrt{n}/2} \\le 1\\right) = P(-1 \\le Z_n \\le 1).$$\nBy the CLT, as $n \\to \\infty$ this converges to standard normal coverage over $[-1, 1]$:\n$$\\lim_{n \\to \\infty} = \\Phi(1) - \\Phi(-1) = 2\\Phi(1) - 1 \\approx 2(0.8413) - 1 = 0.6826.$$\n\n**Final Answers:** (a) 0, (b) 1, (c) $2\\Phi(1) - 1 \\approx 0.6826$.",
      "inputPrompt": "Enter the numeric value of limit (c) (rounded to 4 decimal places, e.g. 0.6826):",
      "expectedAnswer": "0.6826",
      "acceptableAnswers": [
        "0.6826",
        "0.683",
        "0.68",
        "2Phi(1)-1",
        "0.6827"
      ]
    },
    {
      "id": "p_t3_4",
      "title": "Discrete Estimation: MME, MLE & Consistency (Midterm 3 Problem 4)",
      "source": "Midterm Exam 2024 / 2022",
      "topic": "Point Estimation of Parameters",
      "points": 20,
      "question": "Suppose that $X_1, X_2, \\dots, X_n$ are i.i.d. discrete random variables with p.m.f.:\n$$P(X = 1 | \\theta) = \\frac{\\theta}{4}, \\quad P(X = 2 | \\theta) = \\frac{3\\theta}{4}, \\quad P(X = 3 | \\theta) = \\frac{1-\\theta}{3}, \\quad P(X = 4 | \\theta) = \\frac{2 - 2\\theta}{3}$$\nwith unknown parameter $\\theta \\in (0, 1)$.\n\n(a) Find the moment method estimator $\\hat{\\Theta}_{MM}$ of $\\theta$.\n(b) Find the maximum likelihood estimator $\\hat{\\Theta}_{ML}$ of $\\theta$.\n(c) Assume that for a sample of size $n = 400$ the sample mean is $\\bar{X} = 2$. Calculate the moment method estimate $\\hat{\\theta}_{MM}$.\n(d) Is the maximum likelihood estimator $\\hat{\\Theta}_{ML}$ consistent?",
      "solution": "**Complete Solution:**\n\n**(a) Method of Moments $\\hat{\\Theta}_{MM}$:**\nCalculate the theoretical expectation $E[X]$ as a function of $\\theta$:\n$$E[X] = 1 \\cdot \\frac{\\theta}{4} + 2 \\cdot \\frac{3\\theta}{4} + 3 \\cdot \\frac{1-\\theta}{3} + 4 \\cdot \\frac{2(1-\\theta)}{3}$$\n$$E[X] = \\frac{\\theta}{4} + \\frac{6\\theta}{4} + (1-\\theta) + \\frac{8 - 8\\theta}{3} = \\frac{7\\theta}{4} + \\frac{11 - 11\\theta}{3}$$\n$$E[X] = \\frac{21\\theta + 44 - 44\\theta}{12} = \\frac{44 - 23\\theta}{12} = \\frac{11}{3} - \\frac{23}{12}\\theta.$$\nEquating $\\bar{X} = \\frac{44 - 23\\hat{\\theta}}{12}$:\n$$12\\bar{X} = 44 - 23\\hat{\\theta} \\implies 23\\hat{\\theta} = 44 - 12\\bar{X} \\implies \\hat{\\Theta}_{MM} = \\frac{44 - 12\\bar{X}}{23}.$$\n\n**(b) Maximum Likelihood Estimator $\\hat{\\Theta}_{ML}$:**\nLet $N_k = \\sum_{i=1}^n I_{\\{X_i = k\\}}$ be the number of sample observations equal to $k \\in \\{1, 2, 3, 4\\}$.\nThe likelihood function is:\n$$L(\\theta) = \\left(\\frac{\\theta}{4}\\right)^{N_1} \\left(\\frac{3\\theta}{4}\\right)^{N_2} \\left(\\frac{1-\\theta}{3}\\right)^{N_3} \\left(\\frac{2(1-\\theta)}{3}\\right)^{N_4} \\propto \\theta^{N_1 + N_2} (1-\\theta)^{N_3 + N_4}.$$\nTaking log-likelihood:\n$$\\ell(\\theta) = (N_1 + N_2) \\ln \\theta + (N_3 + N_4) \\ln (1-\\theta) + C.$$\nDifferentiating and setting to 0:\n$$\\frac{d\\ell}{d\\theta} = \\frac{N_1 + N_2}{\\theta} - \\frac{N_3 + N_4}{1-\\theta} = 0 \\implies (N_1 + N_2)(1-\\theta) = (N_3 + N_4)\\theta$$\n$$\\implies \\hat{\\Theta}_{ML} = \\frac{N_1 + N_2}{N_1 + N_2 + N_3 + N_4} = \\frac{N_1 + N_2}{n}.$$\n\n**(c) Numerical estimate for $n = 400, \\bar{X} = 2$:**\n$$\\hat{\\theta}_{MM} = \\frac{44 - 12(2)}{23} = \\frac{44 - 24}{23} = \\frac{20}{23} \\approx 0.8696.$$\n\n**(d) Consistency of $\\hat{\\Theta}_{ML}$:**\nNotice that $N_1 + N_2 = \\sum_{i=1}^n I_{\\{X_i \\in \\{1, 2\\}\\}}$. By the Weak Law of Large Numbers (WLLN):\n$$\\hat{\\Theta}_{ML} = \\frac{1}{n} \\sum_{i=1}^n I_{\\{X_i \\in \\{1, 2\\}\\}} \\xrightarrow{P} P(X \\in \\{1, 2\\}) = \\frac{\\theta}{4} + \\frac{3\\theta}{4} = \\theta.$$\nSince $\\hat{\\Theta}_{ML} \\xrightarrow{P} \\theta$, it is **strictly consistent**!",
      "inputPrompt": "Enter the MME estimate theta_MM when X_bar = 2 as a fraction (e.g. 20/23):",
      "expectedAnswer": "20/23",
      "acceptableAnswers": [
        "20/23",
        "0.8696",
        "0.87",
        "0.86956"
      ]
    },
    {
      "id": "p_t3_5",
      "title": "Normal Estimation & Chi-Squared CI (Midterm 3 Problem 5)",
      "source": "Midterm Exam 2024 / 2022",
      "topic": "MLE & Confidence Intervals",
      "points": 20,
      "question": "Assume that $X_1, \\dots, X_n$ are i.i.d. random variables whose distribution has p.d.f.:\n$$f(x | \\theta) \\propto \\exp\\left\\{ \\frac{6x - x^2}{2\\theta} \\right\\}, \\quad x \\in \\mathbb{R}, \\; \\theta > 0.$$\n\n(a) Identify the distribution explicitly (name and parameters).\n(b) Find the moment method estimator $\\hat{\\Theta}_{MM}$ of $\\theta$.\n(c) Find the maximum likelihood estimator $\\hat{\\Theta}_{ML}$ of $\\theta$.\n(d) Prove that the estimator $\\hat{\\Theta}_{ML}$ is unbiased and consistent.\n(e) Determine the distribution of $\\hat{\\Theta}_{ML}$ and find the $95\\%$ confidence interval for $\\theta$.",
      "solution": "**Complete Solution:**\n\n**(a) Distribution Identification:**\nComplete the square in the exponent:\n$$6x - x^2 = -(x^2 - 6x + 9) + 9 = -(x - 3)^2 + 9.$$\nThus:\n$$f(x | \\theta) \\propto \\exp\\left( -\\frac{(x - 3)^2}{2\\theta} \\right) \\exp\\left( \\frac{9}{2\\theta} \\right) \\propto \\frac{1}{\\sqrt{2\\pi\\theta}} \\exp\\left( -\\frac{(x - 3)^2}{2\\theta} \\right).$$\nThis is the **Normal distribution** with known mean $\\mu = 3$ and unknown variance $\\sigma^2 = \\theta$: $X \\sim N(3, \\theta)$.\n\n**(b) Method of Moments $\\hat{\\Theta}_{MM}$:**\nThe first moment is $E[X] = 3$, which does not depend on $\\theta$. Therefore we must use the second moment:\n$$E[X^2] = \\text{Var}(X) + (E[X])^2 = \\theta + 3^2 = \\theta + 9.$$\nEquating to the sample second moment $\\hat{m}_2 = \\frac{1}{n} \\sum X_i^2$:\n$$\\hat{\\Theta}_{MM} = \\frac{1}{n} \\sum_{i=1}^n X_i^2 - 9.$$\n\n**(c) Maximum Likelihood Estimator $\\hat{\\Theta}_{ML}$:**\n$$\\ell(\\theta) = -\\frac{n}{2} \\ln(2\\pi) - \\frac{n}{2} \\ln \\theta - \\frac{1}{2\\theta} \\sum_{i=1}^n (X_i - 3)^2.$$\n$$\\frac{d\\ell}{d\\theta} = -\\frac{n}{2\\theta} + \\frac{1}{2\\theta^2} \\sum_{i=1}^n (X_i - 3)^2 = 0 \\implies \\hat{\\Theta}_{ML} = \\frac{1}{n} \\sum_{i=1}^n (X_i - 3)^2.$$\n\n**(d) Proof of Unbiasedness and Consistency:**\n- **Unbiased:** $E[\\hat{\\Theta}_{ML}] = \\frac{1}{n} \\sum_{i=1}^n E[(X_i - 3)^2] = \\text{Var}(X_i) = \\theta$.\n- **Consistent:** Since $(X_i - 3)^2$ are i.i.d. with finite mean $\\theta$, by WLLN $\\frac{1}{n} \\sum (X_i - 3)^2 \\xrightarrow{P} \\theta$.\n\n**(e) Sampling Distribution and $95\\%$ Confidence Interval:**\nSince $\\frac{X_i - 3}{\\sqrt{\\theta}} \\sim N(0, 1)$ i.i.d., the sum of squares follows a Chi-squared distribution with $n$ degrees of freedom:\n$$Q = \\frac{n \\hat{\\Theta}_{ML}}{\\theta} = \\sum_{i=1}^n \\left( \\frac{X_i - 3}{\\sqrt{\\theta}} \\right)^2 \\sim \\chi^2_n.$$\nFor $95\\%$ confidence, choose quantiles $\\chi^2_{n, 0.025}$ and $\\chi^2_{n, 0.975}$ such that:\n$$P\\left( \\chi^2_{n, 0.025} \\le \\frac{\\sum (X_i - 3)^2}{\\theta} \\le \\chi^2_{n, 0.975} \\right) = 0.95.$$\nInverting for $\\theta$ gives the exact $95\\%$ CI:\n$$\\left[ \\frac{\\sum_{i=1}^n (X_i - 3)^2}{\\chi^2_{n, 0.975}}, \\; \\frac{\\sum_{i=1}^n (X_i - 3)^2}{\\chi^2_{n, 0.025}} \\right].$$",
      "inputPrompt": "Enter the mean value mu of the identified normal distribution (an integer):",
      "expectedAnswer": "3",
      "acceptableAnswers": [
        "3",
        "mu=3",
        "3.0"
      ]
    },
    {
      "id": "p_t3_6",
      "title": "Uniform Distribution U(0, a): MLE, Maximum CDF & CI (Midterm 3 Problem 6)",
      "source": "Midterm Exam 2024 / 2022",
      "topic": "Boundary MLE & Exact Confidence Intervals",
      "points": 20,
      "question": "Assume that $X_1, \\dots, X_n$ are i.i.d. random variables that are uniformly distributed over the interval $(0, a)$ with unknown parameter $a > 0$.\n\n(a) Find the maximum likelihood estimator $\\hat{A}_{ML}$ of the parameter $a$.\n(b) Find the distribution of the random variables $X_k / a$.\n(c) Using (b), determine the c.d.f. of the random variable $\\hat{A}_{ML} / a$.\n(d) Based on (c), find a $95\\%$ confidence interval for $a$.",
      "solution": "**Complete Solution:**\n\n**(a) Maximum Likelihood Estimator $\\hat{A}_{ML}$:**\nThe density of $U(0, a)$ is $f(x | a) = \\frac{1}{a} I_{\\{0 \\le x \\le a\\}}$. The joint likelihood is:\n$$L(a) = \\frac{1}{a^n} \\prod_{i=1}^n I_{\\{0 \\le X_i \\le a\\}} = \\frac{1}{a^n} I_{\\{a \\ge \\max(X_1, \\dots, X_n)\\}}.$$\nFor $a < X_{(n)} = \\max(X_1, \\dots, X_n)$, $L(a) = 0$. For $a \\ge X_{(n)}$, $L(a) = a^{-n}$, which is strictly decreasing in $a$.\nThus $L(a)$ is maximized at the smallest possible value $a = X_{(n)}$:\n$$\\hat{A}_{ML} = X_{(n)} = \\max(X_1, X_2, \\dots, X_n).$$\n\n**(b) Distribution of $Y_k = X_k / a$:**\nBy scale transformation, $Y_k = X_k / a \\sim U(0, 1)$ with cdf $F_Y(y) = y$ for $y \\in [0, 1]$.\n\n**(c) CDF of $T = \\hat{A}_{ML} / a = \\max(Y_1, \\dots, Y_n)$:**\nFor $t \\in [0, 1]$:\n$$F_T(t) = P(T \\le t) = P\\left( \\max(Y_1, \\dots, Y_n) \\le t \\right) = \\prod_{i=1}^n P(Y_i \\le t) = [F_Y(t)]^n = t^n.$$\nThus $F_T(t) = t^n$ for $t \\in [0, 1]$ (and 0 for $t < 0$, 1 for $t > 1$).\n\n**(d) $95\\%$ Confidence Interval for $a$:**\nNotice $T = X_{(n)} / a$ is a pivotal quantity since its distribution $t^n$ contains no unknown parameters!\nSince $X_{(n)} \\le a$, we have $T \\le 1$. We choose constant $\\alpha_1 \\in (0, 1)$ such that:\n$$P(\\alpha_1 \\le T \\le 1) = 0.95 \\implies 1 - F_T(\\alpha_1) = 0.95 \\implies 1 - \\alpha_1^n = 0.95 \\implies \\alpha_1^n = 0.05 \\implies \\alpha_1 = (0.05)^{1/n}.$$\nTherefore:\n$$P\\left( (0.05)^{1/n} \\le \\frac{X_{(n)}}{a} \\le 1 \\right) = 0.95 \\implies P\\left( X_{(n)} \\le a \\le \\frac{X_{(n)}}{(0.05)^{1/n}} \\right) = 0.95.$$\n**Exact $95\\%$ Confidence Interval:**\n$$\\left[ X_{(n)}, \\; \\frac{X_{(n)}}{(0.05)^{1/n}} \\right].$$",
      "inputPrompt": "Enter the formula of the MLE a_hat (e.g. max(X_i) or X_(n)):",
      "expectedAnswer": "max(X_i)",
      "acceptableAnswers": [
        "max(X_i)",
        "X_(n)",
        "max",
        "X_(n)=max(X_i)",
        "max(X)"
      ]
    },
    {
      "id": "p_t3_7",
      "title": "Chernoff Bound: General Case & Normal Tail",
      "source": "Colloquium 3 (Seminar 7 Problem 1)",
      "topic": "Concentration Inequalities",
      "points": 15,
      "question": "The Chernoff Bound is a powerful tool providing exponentially sharp bounds on tail probabilities $P(X \\ge a)$ relying on the MGF $M(s) = E[e^{sX}]$.\n\n(a) Show that $P(X \\ge a) \\le e^{-sa} M(s)$ holds for every $a$ and every $s \\ge 0$.\n(b) Show that $P(X \\ge a) \\le e^{-\\phi(a)}$ holds for every $a$, where $\\phi(a) = \\max_{s \\ge 0} \\{sa - \\ln M(s)\\}$.\n(c) Apply part (b) to obtain a bound for $P(X \\ge a)$ when $X \\sim N(0, 1)$ and $a > 0$.",
      "solution": "**Complete Solution:**\n\n**(a) Derivation for $s \\ge 0$:**\nFor $s \\ge 0$, the function $g(x) = e^{sx}$ is strictly non-negative and monotonically non-decreasing. Thus:\n$$X \\ge a \\iff e^{sX} \\ge e^{sa}.$$\nApplying Markov's inequality to the non-negative random variable $e^{sX}$ with positive threshold $e^{sa}$:\n$$P(X \\ge a) = P(e^{sX} \\ge e^{sa}) \\le \\frac{E[e^{sX}]}{e^{sa}} = e^{-sa} M(s).$$\n\n**(b) Optimizing $s \\ge 0$:**\nSince the bound holds for every $s \\ge 0$, it holds for the infimum over $s \\ge 0$:\n$$P(X \\ge a) \\le \\inf_{s \\ge 0} e^{-sa} M(s) = \\inf_{s \\ge 0} \\exp\\left( -(sa - \\ln M(s)) \\right) = \\exp\\left( -\\sup_{s \\ge 0} \\{sa - \\ln M(s)\\} \\right) = e^{-\\phi(a)}.$$\n\n**(c) Normal $N(0, 1)$ Application:**\nFor $X \\sim N(0, 1)$, $M(s) = e^{s^2/2}$, so $\\ln M(s) = s^2/2$.\nWe maximize $h(s) = sa - s^2/2$ over $s \\ge 0$. Differentiating: $h'(s) = a - s = 0 \\implies s^* = a > 0$.\nThus $\\phi(a) = a^2 - a^2/2 = a^2/2$.\n**Chernoff Bound for Standard Normal:**\n$$P(X \\ge a) \\le e^{-a^2/2}, \\quad \\forall a > 0.$$",
      "inputPrompt": "Enter the analytical Chernoff bound for X ~ N(0, 1) (e.g. e^(-a^2/2)):",
      "expectedAnswer": "e^(-a^2/2)",
      "acceptableAnswers": [
        "e^(-a^2/2)",
        "exp(-a^2/2)",
        "e^{-a^2/2}",
        "exp(-0.5*a^2)"
      ]
    },
    {
      "id": "p_t3_8",
      "title": "Bayesian Coin: Beta-Binomial Conjugate Updating",
      "source": "Colloquium 3 (Seminar 10 / Topic 10)",
      "topic": "Bayesian Estimation",
      "points": 15,
      "question": "A coin has unknown probability of landing heads $\\theta \\in (0, 1)$. Our prior belief is modeled by $\\theta \\sim \\text{Beta}(2, 2)$ with p.d.f. $\\pi(\\theta) = 6\\theta(1-\\theta)$. We toss the coin $n = 10$ times independently and observe $k = 7$ heads.\n\n(a) Find the posterior distribution $\\pi(\\theta | k=7)$.\n(b) Under quadratic loss $L(\\theta, \\hat{\\theta}) = (\\hat{\\theta} - \\theta)^2$, find the Bayes point estimate $\\hat{\\theta}_{\\text{Bayes}}$.\n(c) Compare $\\hat{\\theta}_{\\text{Bayes}}$ with the Maximum Likelihood Estimate $\\hat{\\theta}_{ML}$.",
      "solution": "**Complete Solution:**\n\n**(a) Posterior Distribution:**\nLikelihood for $B(10, \\theta)$ with $k = 7$ heads and $3$ tails:\n$$f(k=7 | \\theta) = \\binom{10}{7} \\theta^7 (1-\\theta)^3 \\propto \\theta^7 (1-\\theta)^3.$$\nPrior: $\\pi(\\theta) \\propto \\theta^{2-1} (1-\\theta)^{2-1} = \\theta (1-\\theta)$.\nBy Bayes' rule:\n$$\\pi(\\theta | k=7) \\propto f(k=7 | \\theta) \\pi(\\theta) \\propto \\theta^7 (1-\\theta)^3 \\cdot \\theta (1-\\theta) = \\theta^8 (1-\\theta)^4 = \\theta^{9-1} (1-\\theta)^{5-1}.$$\nThis is the **Beta(9, 5)** distribution!\n\n**(b) Bayes Estimator:**\nUnder quadratic loss, the Bayes estimate is the posterior mean:\n$$\\hat{\\theta}_{\\text{Bayes}} = E[\\theta | X] = \\frac{\\alpha'}{\\alpha' + \\beta'} = \\frac{9}{9 + 5} = \\frac{9}{14} \\approx 0.6429.$$\n\n**(c) Comparison with MLE:**\nThe MLE is $\\hat{\\theta}_{ML} = k/n = 7/10 = 0.7000$.\nThe prior mean was $\\frac{2}{2+2} = 0.5000$.\nThe Bayes estimate $9/14 \\approx 0.6429$ pulls the MLE towards the prior mean (shrinkage effect), protecting against small-sample overfitting!",
      "inputPrompt": "Enter the Bayes estimate theta_Bayes as a fraction (e.g. 9/14):",
      "expectedAnswer": "9/14",
      "acceptableAnswers": [
        "9/14",
        "0.6429",
        "0.643",
        "0.642857"
      ]
    },
    {
      "id": "p_t3_9",
      "title": "Airline Overbooking & CLT Normal Approximation",
      "source": "Seminar 7 Problem 6 / Exam",
      "topic": "CLT in Practice",
      "points": 15,
      "question": "From long-term historical records, airline managers know that an average of $10\\%$ of ticketed passengers do not show up for their flight. A plane has 200 seats. The airline overbooks by selling $n > 200$ tickets. Assume passenger arrivals are independent Bernoulli trials with show-up probability $p = 0.90$.\n\n(a) If the airline sells $n = 215$ tickets, approximate the probability of overbooking (more than 200 passengers show up).\n(b) Find the maximum number of tickets $n$ the airline can sell so that the overbooking probability is at most $5\\%$.",
      "solution": "**Complete Solution:**\n\nLet $S_n \\sim B(n, p)$ be the number of passengers who show up, where $p = 0.9$.\n$$E[S_n] = np = 0.9n, \\quad \\text{Var}(S_n) = np(1-p) = 0.09n, \\quad \\sigma = \\sqrt{0.09n} = 0.3\\sqrt{n}.$$\n\n**(a) For $n = 215$:**\n$$\\mu = 215 \\times 0.9 = 193.5, \\quad \\sigma = 0.3\\sqrt{215} \\approx 0.3(14.663) \\approx 4.399.$$\nApplying continuity correction (+0.5 for strictly > 200, i.e. $\\ge 200.5$):\n$$P(S_{215} > 200) = P(S_{215} \\ge 200.5) \\approx P\\left( Z \\ge \\frac{200.5 - 193.5}{4.399} \\right) = P(Z \\ge 1.591).$$\n$$P(Z \\ge 1.59) = 1 - \\Phi(1.59) \\approx 1 - 0.9441 = 0.0559 \\; (5.59\\%).$$\n\n**(b) Maximum tickets $n$ for $P(\\text{Overbooking}) \\le 0.05$:**\nWe require $P(S_n \\le 200.5) \\ge 0.95 \\implies \\frac{200.5 - 0.9n}{0.3\\sqrt{n}} \\ge z_{0.95} = 1.645$.\n$$200.5 - 0.9n \\ge 1.645(0.3\\sqrt{n}) = 0.4935\\sqrt{n}.$$\nLetting $u = \\sqrt{n}$, we solve the quadratic inequality $0.9u^2 + 0.4935u - 200.5 \\le 0$:\n$$u \\le \\frac{-0.4935 + \\sqrt{0.4935^2 + 4(0.9)(200.5)}}{1.8} = \\frac{-0.4935 + \\sqrt{0.2435 + 721.8}}{1.8} = \\frac{-0.4935 + 26.87}{1.8} \\approx 14.653.$$\n$$n = u^2 \\le (14.653)^2 \\approx 214.73.$$\nHence, the maximum integer number of tickets is **$n = 214$**.",
      "inputPrompt": "Enter the maximum integer number of tickets n for part (b):",
      "expectedAnswer": "214",
      "acceptableAnswers": [
        "214",
        "214 tickets",
        "n=214"
      ]
    },
    {
      "id": "p_t3_10",
      "title": "Comparison of Poisson Bounds: Markov, Chebyshev, Cantelli & CLT",
      "source": "Colloquium 3 (Seminar 7 Problem 2)",
      "topic": "Concentration Inequalities",
      "points": 15,
      "question": "Let $X$ be a Poisson random variable with mean $\\lambda = 10$.\n\n(a) Use Markov's inequality to obtain an upper bound on $p_1 = P(X \\ge 40)$.\n(b) Use two-sided Chebyshev and one-sided Cantelli inequalities to obtain an upper bound on $p_1$ and compare.\n(c) Use Central Limit Theorem normal approximation to estimate $p_1$.",
      "solution": "**Complete Solution:**\n\nFor $X \\sim \\text{Poisson}(10)$, $E[X] = 10$ and $\\text{Var}(X) = 10$.\n\n**(a) Markov's Inequality:**\n$$P(X \\ge 40) \\le \\frac{E[X]}{40} = \\frac{10}{40} = 0.25.$$\n\n**(b) Chebyshev and Cantelli:**\n- **Two-sided Chebyshev:** Deviation $k = 40 - 10 = 30$.\n$$P(X \\ge 40) \\le P(|X - 10| \\ge 30) \\le \\frac{\\text{Var}(X)}{30^2} = \\frac{10}{900} = \\frac{1}{90} \\approx 0.0111.$$\n- **Cantelli (One-sided):**\n$$P(X - 10 \\ge 30) \\le \\frac{\\sigma^2}{\\sigma^2 + 30^2} = \\frac{10}{10 + 900} = \\frac{10}{910} = \\frac{1}{91} \\approx 0.01099.$$\nCantelli is slightly sharper than two-sided Chebyshev ($1/91 < 1/90$).\n\n**(c) CLT Normal Approximation:**\nWith continuity correction:\n$$P(X \\ge 40) = P(X \\ge 39.5) \\approx P\\left( Z \\ge \\frac{39.5 - 10}{\\sqrt{10}} \\right) = P(Z \\ge 9.33) \\approx 0.$$\nThe actual probability is approximately $10^{-13}$, showing that while Markov and Chebyshev provide rigorous mathematical bounds, the CLT captures the true asymptotic decay rate!",
      "inputPrompt": "Enter the Markov bound for P(X >= 40) as a decimal (e.g. 0.25):",
      "expectedAnswer": "0.25",
      "acceptableAnswers": [
        "0.25",
        "1/4",
        "0.250"
      ]
    },
    {
      "id": "p_t3_11",
      "title": "Sum of 120 Uniform Variables U(0, 1) & Tails",
      "source": "Colloquium 3 (Seminar 7 Problem 3)",
      "topic": "CLT & Extreme Bounds",
      "points": 15,
      "question": "Let $U_1, U_2, \\dots, U_{120}$ be i.i.d. random variables with uniform distribution $U(0, 1)$, and let $X = U_1 + \\dots + U_{120}$.\n\n(a) Calculate $E[X]$ and $\\text{Var}(X)$.\n(b) Use two-sided Chebyshev and one-sided Cantelli to obtain an upper bound on $p_2 = P(X \\ge 80)$.\n(c) Which distribution is $X$ very close to, and what theorem justifies this?\n(d) Use that distribution to give an accurate approximation for $p_1 = P(X \\ge 50)$ and $p_2 = P(X \\ge 80)$.",
      "solution": "**Complete Solution:**\n\n**(a) Mean and Variance:**\nFor $U_i \\sim U(0, 1)$, $E[U_i] = 1/2$ and $\\text{Var}(U_i) = 1/12$.\n$$E[X] = 120 \\times \\frac{1}{2} = 60, \\quad \\text{Var}(X) = 120 \\times \\frac{1}{12} = 10, \\quad \\sigma = \\sqrt{10} \\approx 3.162.$$\n\n**(b) Chebyshev and Cantelli for $P(X \\ge 80)$:**\n- Deviation $k = 80 - 60 = 20$.\n- **Chebyshev:** $P(X \\ge 80) \\le P(|X - 60| \\ge 20) \\le \\frac{\\sigma^2}{20^2} = \\frac{10}{400} = \\frac{1}{40} = 0.025$.\n- **Cantelli:** $P(X - 60 \\ge 20) \\le \\frac{10}{10 + 400} = \\frac{10}{410} = \\frac{1}{41} \\approx 0.02439$.\n\n**(c) Limiting Distribution:**\nBy the **Central Limit Theorem (CLT)**, $X$ is extraordinarily close to the Normal distribution $N(60, 10)$!\n\n**(d) CLT Approximations:**\n- For $p_1 = P(X \\ge 50)$:\n$$P(X \\ge 50) \\approx P\\left( Z \\ge \\frac{50 - 60}{\\sqrt{10}} \\right) = P(Z \\ge -3.162) = \\Phi(3.162) \\approx 0.9992.$$\n- For $p_2 = P(X \\ge 80)$:\n$$P(X \\ge 80) \\approx P\\left( Z \\ge \\frac{80 - 60}{\\sqrt{10}} \\right) = P(Z \\ge 6.32) = 1 - \\Phi(6.32) \\approx 1.3 \\times 10^{-10}.$$",
      "inputPrompt": "Enter E[X] (the expectation of the sum of 120 uniform variables):",
      "expectedAnswer": "60",
      "acceptableAnswers": [
        "60",
        "60.0",
        "E[X]=60"
      ]
    },
    {
      "id": "p_t3_12",
      "title": "Factory Gadgets: Sample Size & First Passage Time",
      "source": "Colloquium 3 (Seminar 7 Problem 4)",
      "topic": "CLT in Industrial Operations",
      "points": 15,
      "question": "A factory produces $X_n$ gadgets on day $n$, where $X_n$ are i.i.d. random variables with mean $\\mu = 4$ and variance $\\sigma^2 = 25$.\n\n(a) Find an approximation to the probability that the total number of gadgets produced in 100 days is less than 400.\n(b) Find (approximately) the largest value of $n$ such that $P(X_1 + \\dots + X_n > 200 + 4n) < 0.05$.\n(c) Let $N$ be the first day on which the total number of gadgets produced exceeds 1000. Calculate an approximation to $P(N > 220)$.",
      "solution": "**Complete Solution:**\n\nLet $S_n = \\sum_{i=1}^n X_i$. Mean is $4n$, variance is $25n$, standard deviation is $5\\sqrt{n}$.\n\n**(a) For $n = 100$ days:**\n$S_{100}$ has mean $400$ and std dev $5\\sqrt{100} = 50$.\n$$P(S_{100} < 400) = P\\left( Z < \\frac{400 - 400}{50} \\right) = P(Z < 0) = 0.5000.$$\n\n**(b) Largest $n$ such that $P(S_n > 200 + 4n) < 0.05$:**\n$$P(S_n - 4n > 200) = P\\left( Z > \\frac{200}{5\\sqrt{n}} \\right) = P\\left( Z > \\frac{40}{\\sqrt{n}} \\right) < 0.05.$$\nThis requires $\\frac{40}{\\sqrt{n}} > z_{0.95} = 1.645$:\n$$\\sqrt{n} < \\frac{40}{1.645} \\approx 24.316 \\implies n < (24.316)^2 \\approx 591.27.$$\nThe largest integer is **$n = 591$**.\n\n**(c) First passage day $P(N > 220)$:**\nThe event that the 1000th gadget is not reached by day 220 is precisely the event that the total production in 220 days is at most 1000:\n$$\\{N > 220\\} \\iff \\{S_{220} \\le 1000\\}.$$\nFor $n = 220$:\n$$E[S_{220}] = 4 \\times 220 = 880, \\quad \\text{Var}(S_{220}) = 25 \\times 220 = 5500, \\quad \\sigma = \\sqrt{5500} \\approx 74.162.$$\n$$P(S_{220} \\le 1000) \\approx \\Phi\\left( \\frac{1000 - 880}{74.162} \\right) = \\Phi\\left( \\frac{120}{74.162} \\right) = \\Phi(1.618) \\approx 0.9472.$$",
      "inputPrompt": "Enter the largest integer n for part (b):",
      "expectedAnswer": "591",
      "acceptableAnswers": [
        "591",
        "n=591",
        "591 days"
      ]
    },
    {
      "id": "p_t3_13",
      "title": "Extremes of Uniform RVs & Exponential Limit",
      "source": "Colloquium 3 (Seminar 7 Problem 5)",
      "topic": "Asymptotic Distributions & Modes of Convergence",
      "points": 15,
      "question": "Let $X_1, X_2, \\dots$ be independent random variables, each having the uniform distribution on $(0, a)$, and let $Z_n = \\max\\{X_1, \\dots, X_n\\}$.\n\n(a) Show that $Z_n \\xrightarrow{P} a$ as $n \\to \\infty$.\n(b) If $a = 1$ and $U_n = n(1 - Z_n)$, show that $U_n$ converges in distribution to the standard Exponential distribution $E(1)$.\n(c) If $a = 1$, show that $Y_n = X_1 X_2 \\dots X_n$ converges in probability to $0$.",
      "solution": "**Complete Solution:**\n\n**(a) Convergence in probability $Z_n \\xrightarrow{P} a$:**\nSince $X_i \\le a$, $Z_n \\le a$. For any $\\varepsilon \\in (0, a)$:\n$$P(|Z_n - a| \\ge \\varepsilon) = P(Z_n \\le a - \\varepsilon) = \\prod_{i=1}^n P(X_i \\le a - \\varepsilon) = \\left( \\frac{a - \\varepsilon}{a} \\right)^n = \\left( 1 - \\frac{\\varepsilon}{a} \\right)^n.$$\nSince $0 < 1 - \\varepsilon/a < 1$, as $n \\to \\infty$ we have $\\lim_{n \\to \\infty} (1 - \\varepsilon/a)^n = 0$.\nThus $Z_n \\xrightarrow{P} a$.\n\n**(b) Exponential Limit for $U_n = n(1 - Z_n)$:**\nFor $x > 0$ and $n > x$:\n$$P(U_n \\le x) = P\\left( n(1 - Z_n) \\le x \\right) = P\\left( Z_n \\ge 1 - \\frac{x}{n} \\right) = 1 - P\\left( Z_n \\le 1 - \\frac{x}{n} \\right)$$\n$$= 1 - \\left( 1 - \\frac{x}{n} \\right)^n.$$\nUsing the fundamental limit $\\lim_{n \\to \\infty} (1 - x/n)^n = e^{-x}$:\n$$\\lim_{n \\to \\infty} P(U_n \\le x) = 1 - e^{-x}, \\quad \\forall x > 0.$$\nThis is precisely the CDF of the Exponential distribution with parameter $\\lambda = 1$: $U_n \\xrightarrow{d} E(1)$!\n\n**(c) Product Convergence $Y_n = \\prod_{i=1}^n X_i \\xrightarrow{P} 0$:**\nBy independence: $E[Y_n] = \\prod_{i=1}^n E[X_i] = (1/2)^n$.\nSince $Y_n \\ge 0$, applying Markov's inequality for any $\\varepsilon > 0$:\n$$P(Y_n \\ge \\varepsilon) \\le \\frac{E[Y_n]}{\\varepsilon} = \\frac{(1/2)^n}{\\varepsilon} \\xrightarrow{n \\to \\infty} 0.$$\nTherefore $Y_n \\xrightarrow{P} 0$.",
      "inputPrompt": "Enter the rate parameter lambda of the limiting exponential distribution in part (b):",
      "expectedAnswer": "1",
      "acceptableAnswers": [
        "1",
        "lambda=1",
        "1.0"
      ]
    },
    {
      "id": "p_t3_14",
      "title": "Bayesian Reliability: Lifetime & Truncated Exponential",
      "source": "Colloquium 3 (Topic 10 Bayesian)",
      "topic": "Bayesian Estimation",
      "points": 15,
      "question": "The lifetime $X$ of an industrial battery has exponential distribution with failure rate $\\theta$: $f(x | \\theta) = \\theta e^{-\\theta x}$ for $x > 0$. Our prior distribution on $\\theta$ is $\\text{Gamma}(\\alpha, \\beta)$ with density $\\pi(\\theta) \\propto \\theta^{\\alpha-1} e^{-\\beta \\theta}$.\n\n(a) Find the posterior density $\\pi(\\theta | X = x)$ after observing a single battery lifetime $x$.\n(b) Find the Bayes estimator $\\hat{\\theta}_{\\text{Bayes}}$ under squared error loss.\n(c) What happens to $\\hat{\\theta}_{\\text{Bayes}}$ as the observed lifetime $x \\to \\infty$?",
      "solution": "**Complete Solution:**\n\n**(a) Posterior Distribution:**\n$$\\pi(\\theta | x) \\propto f(x | \\theta) \\pi(\\theta) = (\\theta e^{-\\theta x}) \\cdot (\\theta^{\\alpha-1} e^{-\\beta \\theta}) = \\theta^{(\\alpha + 1) - 1} e^{-(\\beta + x)\\theta}.$$\nThis is recognizable as the **Gamma($\\alpha + 1$, $\\beta + x$)** distribution!\n\n**(b) Bayes Estimator:**\nUnder quadratic loss, the Bayes estimator is the posterior expectation:\n$$\\hat{\\theta}_{\\text{Bayes}} = E[\\theta | X=x] = \\frac{\\alpha + 1}{\\beta + x}.$$\n\n**(c) Asymptotic Limit as $x \\to \\infty$:**\n$$\\lim_{x \\to \\infty} \\hat{\\theta}_{\\text{Bayes}} = \\lim_{x \\to \\infty} \\frac{\\alpha + 1}{\\beta + x} = 0.$$\nThis is intuitively elegant: observing an extraordinarily long battery lifetime $x \\to \\infty$ provides decisive evidence that the failure rate $\\theta$ is virtually zero.",
      "inputPrompt": "Enter the limit of theta_Bayes as x -> infinity (an integer):",
      "expectedAnswer": "0",
      "acceptableAnswers": [
        "0",
        "zero",
        "0.0"
      ]
    },
    {
      "id": "p_t3_15",
      "title": "Semiconductor Chips: Gamma-Poisson Conjugate Updating",
      "source": "Colloquium 3 (Topic 10 Bayesian)",
      "topic": "Bayesian Estimation",
      "points": 15,
      "question": "The number of defects per wafer in a semiconductor fab follows a $\\text{Poisson}(\\lambda)$ distribution: $P(X = k | \\lambda) = \\frac{\\lambda^k e^{-\\lambda}}{k!}$. Our prior on the defect rate is $\\lambda \\sim \\text{Gamma}(\\alpha, \\beta)$ with mean $\\alpha / \\beta$. We inspect $n$ independent wafers and observe defect counts $X_1, \\dots, X_n$ with sum $S = \\sum_{i=1}^n X_i$.\n\n(a) Find the posterior distribution $\\lambda | X_1, \\dots, X_n$.\n(b) Find the Bayes estimate $\\hat{\\lambda}_{\\text{Bayes}}$ under squared error loss.\n(c) Express $\\hat{\\lambda}_{\\text{Bayes}}$ as a weighted average of the prior mean and the sample mean $\\bar{X}$.",
      "solution": "**Complete Solution:**\n\n**(a) Posterior Distribution:**\nThe sample likelihood is:\n$$L(\\lambda) = \\prod_{i=1}^n \\frac{\\lambda^{X_i} e^{-\\lambda}}{X_i!} \\propto \\lambda^{\\sum X_i} e^{-n\\lambda}.$$\nThe Gamma prior is $\\pi(\\lambda) \\propto \\lambda^{\\alpha - 1} e^{-\\beta \\lambda}$.\nMultiplying likelihood by prior:\n$$\\pi(\\lambda | X) \\propto \\lambda^{\\sum X_i} e^{-n\\lambda} \\cdot \\lambda^{\\alpha - 1} e^{-\\beta \\lambda} = \\lambda^{(\\alpha + \\sum X_i) - 1} e^{-(\\beta + n)\\lambda}.$$\nThus the posterior is **Gamma($\\alpha + \\sum X_i, \\; \\beta + n$)**.\n\n**(b) Bayes Estimator:**\nUnder squared error loss, the Bayes estimate is the posterior mean:\n$$\\hat{\\lambda}_{\\text{Bayes}} = \\frac{\\alpha + \\sum_{i=1}^n X_i}{\\beta + n}.$$\n\n**(c) Weighted Average Representation:**\nRewrite $\\hat{\\lambda}_{\\text{Bayes}}$ as:\n$$\\hat{\\lambda}_{\\text{Bayes}} = \\frac{\\alpha}{\\beta + n} + \\frac{n\\bar{X}}{\\beta + n} = \\left( \\frac{\\beta}{\\beta + n} \\right) \\left( \\frac{\\alpha}{\\beta} \\right) + \\left( \\frac{n}{\\beta + n} \\right) \\bar{X}.$$\nThis proves that the Bayes estimate is a convex linear combination of:\n- The prior mean $\\mu_0 = \\frac{\\alpha}{\\beta}$ with weight $\\frac{\\beta}{\\beta + n}$.\n- The sample mean $\\bar{X} = \\hat{\\lambda}_{ML}$ with weight $\\frac{n}{\\beta + n}$.\nAs $n \\to \\infty$, the sample weight $\\frac{n}{\\beta+n} \\to 1$, showing convergence to the frequentist MLE!",
      "inputPrompt": "Enter the formula for Bayes estimate lambda_Bayes (e.g. (alpha + sum(X_i)) / (beta + n)):",
      "expectedAnswer": "(alpha + sum(X_i)) / (beta + n)",
      "acceptableAnswers": [
        "(alpha + sum(X_i)) / (beta + n)",
        "(alpha+sum(X_i))/(beta+n)",
        "(alpha+S)/(beta+n)",
        "(alpha + sum(X))/(beta + n)"
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
      "mgf": "Does not exist for any t != 0",
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
        "Incorrect statement",
        "Other option"
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
        "\\(P(X\\ge2)\\le 0.5\\)"
      ],
      "correctIndex": 4,
      "explanation": "Correct answers: \\(P(X\\ge2)\\le 0.5\\)\n, \\(P(X< 4)\\ge 0.75\\)\n, \\(P(X\\ge 6)\\le1/(1+5^2)\\)"
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
        "in distribution (in law)"
      ],
      "correctIndex": 3,
      "explanation": "Correct answers: in distribution (in law), in probability, almost surely (with probability 1)"
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
      "explanation": "Correct answers: almost surely, in probability, in distribution"
    },
    {
      "id": "t7_q9",
      "topicId": 7,
      "topic": "Topic 7: Limit Theorems (LLN & CLT)",
      "question": "Order the following convergence types from the strongest (i.e. that implies the other ones) to the weakest",
      "options": [],
      "correctIndex": 0,
      "explanation": "According to the course lectures and official formulas."
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
        "\\(2\\Phi(1)-1\\)"
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
      "explanation": "Correct answers: sample mean, sample median"
    },
    {
      "id": "t8_q4",
      "topicId": 8,
      "topic": "Topic 8: Descriptive Analysis of Data",
      "question": "The sample mean is never equal to the sample median",
      "options": [
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'False'."
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
      "explanation": "Correct answers: lower quartile, sample mean"
    },
    {
      "id": "t8_q6",
      "topicId": 8,
      "topic": "Topic 8: Descriptive Analysis of Data",
      "question": "Find the following sample statistics for the ordered data \\(7, 7, 8, 8, 10, 10, 11, 11, 11, 11, 11, 12, 13\\) (whose sum is \\(130\\)):\n(a) sample mode, (b) sample median, (c) sample mean, (d) lower quartile.",
      "options": [
        "Find the following sample statistics for the ordered data \\(7, 7, 8, 8, 10, 10, 11, 11, 11, 11, 11, 12, 13\\) (whose sum is \\( 130 \\) ):\n(a) sample mode [11]  (b) sample median [11] (c) sample mean [10] (d) lower quartile [8]",
        "Incorrect statement",
        "Other option"
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
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'False'."
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
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'False'."
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
        "\\(\\hat\\Theta\\)"
      ],
      "correctIndex": 3,
      "explanation": "Correct answers: \\(\\hat\\Theta\\)\n, \\(\\frac{n}{n+1}\\hat\\Theta\\)"
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
        "\\(\\mathsf{E}(\\widehat\\Theta)= \\theta\\)"
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
        "\\(\\hat\\Theta\\)"
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
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'True'."
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
        "Incorrect statement",
        "Other option"
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
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'False'."
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
      "question": "Fill in the blanks: A Bayesian estimate \\(\\hat{\\theta}\\) is the value of \\(\\theta\\) that [minimizes] the [expected loss] under the [posterior] distribution.",
      "options": [
        "A Bayesian estimate \\(\\hat\\theta\\) is the value of \\(\\theta\\) that [minimizes] the [expected loss] under the [posterior] distribution",
        "Incorrect statement",
        "Other option"
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
        "at most \\(1-\\alpha/2\\)"
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
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'False'."
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
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'False'."
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
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'False'."
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
      "explanation": "Correct answers: sample mode, sample median"
    },
    {
      "id": "t11_q5",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "For a fixed confidence level, when the sample size increases, the length of the confidence  interval for a population mean decreases",
      "options": [
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'True'."
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
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'True'."
    },
    {
      "id": "t11_q8",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "If numbers \\(x_1,x_2,\\dots,x_n\\) are sampled from the standard normal distribution, then their sample mean is equal to \\(0\\)",
      "options": [
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'False'."
    },
    {
      "id": "t11_q9",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "If an estimator \\(\\widehat{\\Theta}\\) is unbiased and \\(\\widetilde{\\Theta}\\) is biased, \\(\\widehat{\\Theta}\\) should always be preferred",
      "options": [
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'False'."
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
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'False'."
    },
    {
      "id": "t11_q14",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "Assume that \\((a,b)\\) is a \\(90\\%\\) confidence interval for a population mean   \\(\\mu\\) calculated for data \\(\\mathbf{x}\\) . Then there is a \\(0.90\\)   probability that  \\(\\mu \\in (a,b)\\) .",
      "options": [
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'False'."
    },
    {
      "id": "t11_q15",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "If numbers \\(x_1,x_2,\\dots,x_n\\) are sampled from the standard normal distribution,  then their sample mean is equal to the sample median",
      "options": [
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'False'."
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
      "question": "Find the following sample statistics for the ordered data \\(1, 2, 3, 3, 4, 4, 4, 5, 6, 6, 8, 9, 10\\) (whose sum is \\(65\\)):\n(a) sample mode, (b) sample median, (c) sample mean, (d) lower quartile.",
      "options": [
        "Find the following sample statistics for the ordered data \\(1,2,3,3,4,4,4,5,6,6,8,9,10\\) (whose sum is \\(65\\) ):\n(a) sample mode [4]  (b) sample median [4] (c) sample mean [5] (d) lower quartile [3]",
        "Incorrect statement",
        "Other option"
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
      "explanation": "Correct answers: \\(m \\pm s z_{0.025}/10\\)\n, \\(m \\pm s t^{(99)}_{0.025}/10\\)"
    },
    {
      "id": "t11_q24",
      "topicId": 11,
      "topic": "Topic 11: Module 3 Self-Test (Comprehensive Exam Practice)",
      "question": "If numbers \\(x_1,x_2,\\dots,x_n\\) are sampled from the standard normal distribution, then their sample variance is equal to \\(1\\)",
      "options": [
        "True",
        "False"
      ],
      "correctIndex": 1,
      "explanation": "Correct answer: 'False'."
    }
  ],
  "TOPICS_NOTES": [
    {
      "id": "topic-7",
      "number": 7,
      "title": "Topic 7: Limit Theorems (LLN & CLT)",
      "summary": "Markov, Chebyshev, Cantelli, and Chernoff concentration inequalities. Modes of stochastic convergence (a.s., in P, in d), Weak and Strong Laws of Large Numbers, Central Limit Theorem.",
      "content": "### 1. Concentration Inequalities\n- **Markov's Inequality**: For $X \\ge 0$ and $a > 0$:\n  $$P(X \\ge a) \\le \\frac{E[X]}{a}.$$\n- **Chebyshev's Two-sided Inequality**: For any RV with mean $\\mu$ and variance $\\sigma^2$:\n  $$P(|X - \\mu| \\ge k) \\le \\frac{\\sigma^2}{k^2}.$$\n- **Cantelli's One-sided Inequality**: For $k > 0$:\n  $$P(X - \\mu \\ge k) \\le \\frac{\\sigma^2}{\\sigma^2 + k^2}.$$\n- **Chernoff Bound**: Optimizing over the MGF parameter $s > 0$:\n  $$P(X \\ge a) \\le e^{-\\phi(a)}, \\quad \\phi(a) = \\max_{s \\ge 0} \\{sa - \\ln M(s)\\}.$$\n\n### 2. Modes of Convergence & Hierarchy\n$$X_n \\xrightarrow{a.s.} X \\implies X_n \\xrightarrow{P} X \\implies X_n \\xrightarrow{d} X.$$\n- *Constant limit exception*: If $X = c = \\text{const}$, then $X_n \\xrightarrow{d} c \\iff X_n \\xrightarrow{P} c$.\n\n### 3. Laws of Large Numbers\n- **WLLN (Khinchin)**: $\\bar{X}_n \\xrightarrow{P} \\mu$ as $n \\to \\infty$.\n- **SLLN (Kolmogorov)**: $\\bar{X}_n \\xrightarrow{a.s.} \\mu$ as $n \\to \\infty \\iff E[|X_1|] < \\infty$.\n\n### 4. Central Limit Theorem (CLT)\nFor i.i.d. $X_i$ with mean $\\mu$ and variance $\\sigma^2 \\in (0, \\infty)$:\n$$Z_n = \\frac{\\sum_{i=1}^n X_i - n\\mu}{\\sigma\\sqrt{n}} = \\frac{\\sqrt{n}(\\bar{X}_n - \\mu)}{\\sigma} \\xrightarrow{d} N(0, 1).$$"
    },
    {
      "id": "topic-8",
      "number": 8,
      "title": "Topic 8: Descriptive Statistics & Sampling Distributions",
      "summary": "Population vs Sample. Sample moments, sample mean, median, mode, sample variance (Bessel's correction n-1). Chi-squared, Student's t, and Fisher's F distributions.",
      "content": "### 1. Sample Statistics\n- **Sample Mean**: $\\bar{X} = \\frac{1}{n} \\sum_{i=1}^n X_i$. Unbiased: $E[\\bar{X}] = \\mu$, $\\text{Var}(\\bar{X}) = \\sigma^2/n$.\n- **Sample Variance**: $S^2 = \\frac{1}{n-1} \\sum_{i=1}^n (X_i - \\bar{X})^2$. Unbiased: $E[S^2] = \\sigma^2$.\n\n### 2. Exact Normal Sampling Distributions\nIf $X_i \\sim N(\\mu, \\sigma^2)$ are i.i.d.:\n1. $\\bar{X} \\sim N(\\mu, \\sigma^2/n)$.\n2. $\\frac{(n-1)S^2}{\\sigma^2} = \\sum_{i=1}^n \\left(\\frac{X_i - \\bar{X}}{\\sigma}\\right)^2 \\sim \\chi^2_{n-1}$.\n3. $\\bar{X}$ and $S^2$ are **statistically independent** (Fisher's Theorem).\n4. The Studentized statistic follows Student's t:\n   $$T = \\frac{\\bar{X} - \\mu}{S/\\sqrt{n}} \\sim t_{n-1}.$$"
    },
    {
      "id": "topic-9",
      "number": 9,
      "title": "Topic 9: Point Estimation (MME, MLE & Properties)",
      "summary": "Method of Moments (MME), Maximum Likelihood Estimation (MLE), unbiasedness, consistency, MSE decomposition, Fisher Information, and the Cramér-Rao Lower Bound.",
      "content": "### 1. Point Estimation Methods\n- **Method of Moments (MME)**: Equate theoretical moments $\\mu_k(\\theta) = E[X^k]$ to empirical sample moments $\\hat{m}_k = \\frac{1}{n} \\sum X_i^k$.\n- **Maximum Likelihood (MLE)**: Maximize log-likelihood $\\ell(\\theta) = \\sum \\ln f(x_i | \\theta)$.\n- **MLE Invariance**: If $\\hat{\\theta}$ is the MLE of $\\theta$, then $g(\\hat{\\theta})$ is the MLE of $g(\\theta)$.\n\n### 2. Quality Criteria for Estimators\n- **Unbiasedness**: $E[\\hat{\\theta}] = \\theta$ for all $\\theta$.\n- **Consistency**: $\\hat{\\theta}_n \\xrightarrow{P} \\theta$ as $n \\to \\infty$.\n- **MSE Decomposition**: $\\text{MSE}(\\hat{\\theta}) = \\text{Var}(\\hat{\\theta}) + [\\text{Bias}(\\hat{\\theta})]^2$.\n- **Fisher Information**: $I_n(\\theta) = -n E\\left[\\frac{\\partial^2 \\ln f}{\\partial \\theta^2}\\right]$.\n- **Cramér-Rao Lower Bound**: For any unbiased $\\hat{\\theta}$, $\\text{Var}(\\hat{\\theta}) \\ge \\frac{1}{n I_1(\\theta)}$."
    },
    {
      "id": "topic-10",
      "number": 10,
      "title": "Topic 10: Confidence Intervals & Bayesian Estimation",
      "summary": "Constructing confidence intervals via pivotal quantities (Z- and t-intervals). Bayesian paradigm: prior and posterior distributions, conjugate pairs (Beta-Binomial, Gamma-Poisson), and Bayes point estimators.",
      "content": "### 1. Confidence Intervals (Pivotal Method)\n- **Z-Interval (Known $\\sigma^2$)**: $\\bar{X} \\pm z_{1-\\alpha/2} \\frac{\\sigma}{\\sqrt{n}}$.\n- **t-Interval (Unknown $\\sigma^2$)**: $\\bar{X} \\pm t_{1-\\alpha/2}^{(n-1)} \\frac{S}{\\sqrt{n}}$.\n- **Exact Uniform CI**: For $U(0, a)$, $T = X_{(n)} / a$ has CDF $t^n$. 95% CI is $\\left[ X_{(n)}, \\; \\frac{X_{(n)}}{(0.05)^{1/n}} \\right]$.\n\n### 2. Bayesian Estimation\nParameter $\\theta$ is treated as a random variable with prior $\\pi(\\theta)$.\nPosterior distribution via Bayes' formula:\n$$\\pi(\\theta | x) \\propto f(x | \\theta) \\pi(\\theta) \\quad (\\text{Likelihood} \\times \\text{Prior}).$$\n- **Quadratic Loss**: The Bayes estimator is the **posterior mean** $\\hat{\\theta}_{\\text{Bayes}} = E[\\theta | X]$.\n- **Beta-Binomial Conjugate Pair**: $X \\sim B(n, \\theta)$, prior $\\theta \\sim \\text{Beta}(\\alpha, \\beta) \\implies \\theta|X \\sim \\text{Beta}(\\alpha + x, \\beta + n - x)$. Bayes estimate: $\\hat{\\theta} = \\frac{\\alpha + x}{\\alpha + \\beta + n}$.\n- **Gamma-Poisson Conjugate Pair**: $X_i \\sim \\text{Poisson}(\\lambda)$, prior $\\lambda \\sim \\text{Gamma}(\\alpha, \\beta) \\implies \\lambda|X \\sim \\text{Gamma}(\\alpha + \\sum X_i, \\beta + n)$. Bayes estimate: $\\hat{\\lambda} = \\frac{\\alpha + \\sum X_i}{\\beta + n}$."
    },
    {
      "id": "topic-11",
      "number": 11,
      "title": "Topic 11: Comprehensive Module 3 Self-Test (24 Questions)",
      "summary": "24 comprehensive Module 3 test questions with detailed mathematical solutions, common trap analyses, and previous exam questions.",
      "content": "### Module 3 Final Assessment Structure\n1. **Conceptual Foundations**: modes of stochastic convergence, conditions for Khinchin, Kolmogorov, Lindeberg-Lévy theorems.\n2. **CLT Practical Calculations**: sample size $n$ determinations, continuity corrections $\\pm 0.5$.\n3. **MME & MLE Derivations**: 1-parameter and 2-parameter models, support boundary parameter cases.\n4. **Confidence Interval Construction**: exact CIs for $U(0, a)$, $N(\\mu, \\sigma^2)$, and asymptotic normal intervals for proportions $p$.\n5. **Bayesian Posterior Derivations**: finding normalizing constants, posterior distributions, and optimal Bayes estimates."
    }
  ],
  "TOPICS_LIST": [
    {
      "id": 7,
      "title": "Topic 7: Limit Theorems (LLN & CLT)"
    },
    {
      "id": 8,
      "title": "Topic 8: Descriptive Statistics & Sampling Distributions"
    },
    {
      "id": 9,
      "title": "Topic 9: Point Estimation (MME, MLE & Properties)"
    },
    {
      "id": 10,
      "title": "Topic 10: Confidence Intervals & Bayesian Estimation"
    },
    {
      "id": 11,
      "title": "Topic 11: Comprehensive Module 3 Self-Test (24 Questions)"
    }
  ]
};
