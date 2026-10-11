#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
12 Colloquium Oral Defense Questions Builder.
"""

ORAL_QUESTIONS_12 = [
    {
        "id": 1,
        "title": "Discrete random variables; probability mass function and cumulative distribution function and their properties; examples",
        "titleUa": "Дискретні випадкові величини, ф.м.й., функція розподілу та їх властивості",
        "time": "4-5 minutes",
        "structure": [
            "1. Formal definition of a random variable as measurable map X: Ω -> R, then definition of discrete RV (countable range S_X).",
            "2. Define p.m.f. p_X(x) = P(X = x) and state its 2 fundamental properties (non-negativity, sum to 1).",
            "3. Define c.d.f. F_X(x) = P(X <= x) and state its 4 fundamental properties (non-decreasing, right-continuous, limits at ±∞, interval formula).",
            "4. Relationship between PMF and CDF for discrete RVs: step-function graph, jumps at points of support with jump size P(X = x).",
            "5. Give a concrete example with numbers (e.g. Fair 6-sided die or Bernoulli trial) and sketch the CDF."
        ],
        "speech": "A random variable $X$ on a probability space $(\\Omega, \\mathcal{F}, P)$ is a measurable function $X: \\Omega \\to \\mathbb{R}$. It is called discrete if its range $S_X$ is finite or countably infinite: $S_X = \\{x_1, x_2, \\dots\\}$.\n\nThe probability mass function (p.m.f.) is defined as $p_X(x) = P(X = x)$. It satisfies two axioms: $p_X(x) \\ge 0$ for all $x$, and $\\sum_{x \\in S_X} p_X(x) = 1$.\n\nThe cumulative distribution function (c.d.f.) is $F_X(x) = P(X \\le x)$. Its 4 defining properties are:\n1. Non-decreasing: $x_1 < x_2 \\implies F(x_1) \\le F(x_2)$.\n2. Right-continuous: $\\lim_{h \\to 0^+} F(x+h) = F(x)$.\n3. Limits: $\\lim_{x \\to -\\infty} F(x) = 0$ and $\\lim_{x \\to +\\infty} F(x) = 1$.\n4. For any $a < b$, $P(a < X \\le b) = F(b) - F(a)$, and the jump at $a$ is $P(X = a) = F(a) - F(a^-)$.\n\nFor a discrete RV, $F_X(x) = \\sum_{x_k \\le x} p_X(x_k)$, which is a right-continuous step function with jump equal to $p_X(x_k)$ at each support point $x_k$.",
        "keyFormulas": [
            "p_X(x) = P(X = x), \\quad \\sum_{x \\in S_X} p_X(x) = 1",
            "F_X(x) = P(X \\le x) = \\sum_{x_k \\le x} p_X(x_k)",
            "P(a < X \\le b) = F_X(b) - F_X(a), \\quad P(X = a) = F_X(a) - F_X(a^-)"
        ],
        "examinerQuestions": [
            "Why is the CDF right-continuous rather than left-continuous? (Because {X <= x+1/n} decreases to {X <= x} by continuity of probability measure).",
            "Can you reconstruct the PMF completely if you are only given the CDF? (Yes, the jumps of F give the exact values of P(X = x))."
        ]
    },
    {
        "id": 2,
        "title": "Binomial distribution; Geometric distribution; Poisson distribution; examples",
        "titleUa": "Біноміальний, геометричний та пуассонівський розподіли; приклади",
        "time": "4-5 minutes",
        "structure": [
            "1. Binomial B(n, p): Model (n independent Bernoulli trials), PMF, E[X] = np, Var(X) = np(1-p). Mention proof of E[X] via indicators.",
            "2. Geometric G(p): Model (trials until first success), PMF (1-p)^{k-1}p for k >= 1, CDF, E[X] = 1/p, Var = (1-p)/p^2. State & prove memoryless property.",
            "3. Poisson P(λ): Model (rare events, rate λ), PMF λ^k e^{-λ} / k!, E[X] = λ, Var(X) = λ.",
            "4. Poisson limit theorem: state how B(n, λ/n) converges to P(λ) as n -> ∞.",
            "5. Practical examples for each."
        ],
        "speech": "We study the three fundamental discrete distributions:\n\n1. **Binomial $B(n, p)$**: models number of successes in $n$ independent Bernoulli trials with parameter $p$. Its p.m.f. is $p(k) = \\binom{n}{k} p^k (1-p)^{n-k}$ for $k=0, \\dots, n$. Mean is $E[X] = np$, variance is $\\text{Var}(X) = np(1-p)$. We can write $X = \\sum_{i=1}^n I_i$ where $I_i \\sim B(1, p)$ are i.i.d. indicators.\n\n2. **Geometric $G(p)$**: models the trial number of the first success. $p(k) = (1-p)^{k-1}p$ for $k=1, 2, \\dots$. Tail probability is $P(X > k) = (1-p)^k$. Expected value is $E[X] = \\sum_{k=1}^\\infty P(X \\ge k) = \\frac{1}{p}$, and $\\text{Var}(X) = \\frac{1-p}{p^2}$. It satisfies the unique discrete **memoryless property**: $P(X > m+n \\mid X > m) = P(X > n)$.\n\n3. **Poisson $P(\\lambda)$**: models rare events in continuous time/space. $p(k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}$ for $k=0, 1, 2, \\dots$. Mean and variance are both equal to $\\lambda$.\n\nConnection: By the Poisson Limit Theorem, if $n \\to \\infty$ and $p_n \\to 0$ such that $n p_n \\to \\lambda$, the Binomial distribution $B(n, p_n)$ converges point-wise to $P(\\lambda)$.",
        "keyFormulas": [
            "B(n, p): \\quad p(k) = \\binom{n}{k} p^k (1-p)^{n-k}, \\quad E[X] = np, \\quad \\text{Var}(X) = np(1-p)",
            "G(p): \\quad p(k) = (1-p)^{k-1}p, \\quad P(X > k) = (1-p)^k, \\quad E[X] = 1/p",
            "P(\\lambda): \\quad p(k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}, \\quad E[X] = \\lambda, \\quad \\text{Var}(X) = \\lambda"
        ],
        "examinerQuestions": [
            "Prove the memoryless property of the Geometric distribution on the board.",
            "Why is the Poisson distribution called the 'law of small numbers'?"
        ]
    },
    {
        "id": 3,
        "title": "Joint and marginal distributions; conditional distribution; examples",
        "titleUa": "Сумісні та маргінальні розподіли; умовний розподіл; приклади",
        "time": "4-5 minutes",
        "structure": [
            "1. Define joint PMF p_{X,Y}(x, y) = P(X=x, Y=y) and joint PDF f_{X,Y}(x, y) with their properties.",
            "2. Define marginal PMF (sum over y) and marginal PDF (integral over y from -∞ to ∞).",
            "3. State definition of independence: p_{X,Y}(x, y) = p_X(x)p_Y(y) or f_{X,Y}(x, y) = f_X(x)f_Y(y).",
            "4. Define conditional PMF p_{X|Y}(x | y) = p_{X,Y}(x,y)/p_Y(y) and conditional PDF f_{X|Y}(x | y) = f_{X,Y}(x,y)/f_Y(y).",
            "5. Give a 2x2 contingency table or triangular uniform continuous example."
        ],
        "speech": "For a pair of random variables $(X, Y)$:\n\nThe joint p.m.f. is $p_{X,Y}(x, y) = P(X = x, Y = y)$, satisfying $p_{X,Y}(x, y) \\ge 0$ and $\\sum_x \\sum_y p_{X,Y}(x, y) = 1$. In the continuous case, the joint p.d.f. $f_{X,Y}(x, y) \\ge 0$ satisfies $\\iint_{\\mathbb{R}^2} f_{X,Y}(x, y) dx dy = 1$.\n\nThe **marginal distributions** represent the distribution of a single coordinate alone:\n- Discrete: $p_X(x) = \\sum_y p_{X,Y}(x, y)$\n- Continuous: $f_X(x) = \\int_{-\\infty}^\\infty f_{X,Y}(x, y) dy$.\n\nRandom variables $X$ and $Y$ are **independent** if and only if their joint distribution factors as the product of their marginals for all $x, y$: $f_{X,Y}(x, y) = f_X(x) f_Y(y)$.\n\nThe **conditional distribution** of $X$ given $Y = y$ (where $f_Y(y) > 0$) is defined by:\n$$f_{X|Y}(x \\mid y) = \\frac{f_{X,Y}(x, y)}{f_Y(y)}$$\nIt is a genuine density in $x$ integrating to 1 over $\\mathbb{R}$. The conditional expectation is $E[X \\mid Y = y] = \\int_{-\\infty}^\\infty x f_{X|Y}(x \\mid y) dx$, and by the Law of Total Expectation, $E[X] = E[E[X \\mid Y]]$.",
        "keyFormulas": [
            "p_X(x) = \\sum_y p_{X,Y}(x, y), \\quad f_X(x) = \\int_{-\\infty}^\\infty f_{X,Y}(x, y) dy",
            "f_{X|Y}(x \\mid y) = \\frac{f_{X,Y}(x, y)}{f_Y(y)}, \\quad E[X \\mid Y=y] = \\int x f_{X|Y}(x \\mid y) dx",
            "E[X] = E[E[X \\mid Y]]"
        ],
        "examinerQuestions": [
            "If the support of joint PDF is a triangle $0 < y < x < 1$, can $X$ and $Y$ ever be independent? (NO! Because the support is not a product of intervals/sets!).",
            "Show that $\\int_{-\\infty}^\\infty f_{X|Y}(x \\mid y) dx = 1$."
        ]
    },
    {
        "id": 4,
        "title": "Expectation of a random variable and its properties; examples",
        "titleUa": "Математичне сподівання випадкової величини та його властивості; приклади",
        "time": "4-5 minutes",
        "structure": [
            "1. Definition for discrete (sum x*p(x)) and continuous (integral x*f(x)dx) with absolute convergence condition.",
            "2. State LOTUS: E[g(X)] = sum g(x)p(x) or integral g(x)f(x)dx.",
            "3. State and prove Linearity: E[aX + bY + c] = aE[X] + bE[Y] + c (holds regardless of independence!).",
            "4. Monotonicity: X <= Y almost surely => E[X] <= E[Y].",
            "5. Indicator trick: E[I_A] = P(A) and tail sum formula E[X] = sum P(X >= k)."
        ],
        "speech": "The expected value $E[X]$ is the probability-weighted mean of $X$. For a discrete RV, $E[X] = \\sum_{x \\in S_X} x p_X(x)$ provided $\\sum |x|p_X(x) < \\infty$. For continuous RV, $E[X] = \\int_{-\\infty}^\\infty x f_X(x) dx$ provided $\\int |x|f_X(x)dx < \\infty$.\n\nKey Properties:\n1. **Linearity**: For any constants $a, b, c$, $E[aX + bY + c] = aE[X] + bE[Y] + c$. Linearity holds unconditionally — $X$ and $Y$ do NOT need to be independent!\n2. **LOTUS**: To compute $E[g(X)]$, we do not need the distribution of $g(X)$; we integrate $g(x) f_X(x) dx$.\n3. **Monotonicity**: If $X \\le Y$ almost surely, then $E[X] \\le E[Y]$. In particular, if $X \\ge 0$, then $E[X] \\ge 0$.\n4. **Expectation of Product**: If $X$ and $Y$ are independent, $E[XY] = E[X] E[Y]$.\n5. **Tail Sum Formula**: For non-negative integer RV: $E[X] = \\sum_{k=1}^\\infty P(X \\ge k)$.\n\nExample of non-existence: Cauchy distribution $f(x) = \\frac{1}{\\pi(1+x^2)}$ where $\\int_{-\\infty}^\\infty |x| f(x) dx = \\infty$, so expectation is undefined.",
        "keyFormulas": [
            "E[X] = \\sum x p_X(x) \\quad \\text{or} \\quad \\int_{-\\infty}^\\infty x f_X(x) dx",
            "E[aX + bY + c] = aE[X] + bE[Y] + c",
            "E[g(X)] = \\int_{-\\infty}^\\infty g(x) f_X(x) dx, \\quad E[X] = \\sum_{k=1}^\\infty P(X \\ge k)"
        ],
        "examinerQuestions": [
            "Why must we require $\\sum |x|p(x) < \\infty$ instead of just $\\sum x p(x)$? (To prevent the sum from depending on the order of summation, Riemann rearrangement theorem).",
            "Prove the tail sum formula using double summation on the board."
        ]
    },
    {
        "id": 5,
        "title": "Moments and variance; properties of variance",
        "titleUa": "Моменти та дисперсія; властивості дисперсії",
        "time": "4-5 minutes",
        "structure": [
            "1. Define k-th raw moment E[X^k] and k-th central moment E[(X - μ)^k].",
            "2. Define variance Var(X) = E[(X - E[X])^2] = E[X^2] - (E[X])^2 and standard deviation σ = sqrt(Var(X)).",
            "3. State properties: Var(X) >= 0; Var(c) = 0; Var(aX + b) = a^2 Var(X).",
            "4. Derive formula for Var(X + Y) = Var(X) + Var(Y) + 2Cov(X, Y).",
            "5. Case of independent variables: Var(sum X_i) = sum Var(X_i)."
        ],
        "speech": "The $k$-th raw moment is $\\alpha_k = E[X^k]$, and the $k$-th central moment is $\\mu_k = E[(X - E[X])^k]$.\n\nThe **variance** $\\text{Var}(X)$ is the second central moment, measuring dispersion:\n$$\\text{Var}(X) = E[(X - E[X])^2] = E[X^2 - 2X E[X] + (E[X])^2] = E[X^2] - (E[X])^2$$\nStandard deviation is $\\sigma_X = \\sqrt{\\text{Var}(X)}$.\n\nProperties of Variance:\n1. $\\text{Var}(X) \\ge 0$, and $\\text{Var}(X) = 0 \\iff X = c$ almost surely.\n2. Invariance to shift & scaling: $\\text{Var}(aX + b) = a^2 \\text{Var}(X)$. (Shifts do not alter dispersion).\n3. Variance of a sum:\n$$\\text{Var}(X + Y) = \\text{Var}(X) + \\text{Var}(Y) + 2\\text{Cov}(X, Y)$$\n4. If $X_1, \\dots, X_n$ are pairwise independent (or uncorrelated):\n$$\\text{Var}\\left(\\sum_{i=1}^n X_i\\right) = \\sum_{i=1}^n \\text{Var}(X_i)$$",
        "keyFormulas": [
            "\\text{Var}(X) = E[(X - E[X])^2] = E[X^2] - (E[X])^2",
            "\\text{Var}(aX + b) = a^2 \\text{Var}(X)",
            "\\text{Var}(X + Y) = \\text{Var}(X) + \\text{Var}(Y) + 2\\text{Cov}(X, Y)",
            "\\text{Var}(aX + bY) = a^2 \\text{Var}(X) + b^2 \\text{Var}(Y) + 2ab\\text{Cov}(X, Y)"
        ],
        "examinerQuestions": [
            "Can variance be negative? What does $\\text{Var}(X) = 0$ mean?",
            "If $X, Y$ are independent with variance 1, what is $\\text{Var}(2X - Y)$? Answer: $4(1) + 1(1) = 5$."
        ]
    },
    {
        "id": 6,
        "title": "Covariance and correlation",
        "titleUa": "Коваріація та кореляція",
        "time": "4-5 minutes",
        "structure": [
            "1. Define covariance Cov(X, Y) = E[(X - E[X])(Y - E[Y])] = E[XY] - E[X]E[Y].",
            "2. State bilinearity and symmetry of Cov.",
            "3. Define correlation coefficient ρ(X, Y) = Cov(X, Y) / (σ_X σ_Y).",
            "4. State and prove -1 <= ρ <= 1 using Cauchy-Schwarz inequality.",
            "5. State when |ρ| = 1 (iff Y = aX + b almost surely).",
            "6. Critical point: Independence implies ρ = 0, but ρ = 0 does NOT imply independence! Give standard counterexample."
        ],
        "speech": "The **covariance** of $X$ and $Y$ measures their joint linear variability:\n$$\\text{Cov}(X, Y) = E[(X - E[X])(Y - E[Y])] = E[XY] - E[X]E[Y]$$\nCovariance is symmetric $\\text{Cov}(X, Y) = \\text{Cov}(Y, X)$, satisfies $\\text{Cov}(X, X) = \\text{Var}(X)$, and is bilinear: $\\text{Cov}(aX+b, cY+d) = ac\\text{Cov}(X, Y)$.\n\nThe **correlation coefficient** is the normalized covariance:\n$$\\rho(X, Y) = \\frac{\\text{Cov}(X, Y)}{\\sigma_X \\sigma_Y}$$\n\nProperties of Correlation:\n1. $-1 \\le \\rho(X, Y) \\le 1$. Proof: Consider the quadratic $q(t) = E[( (X-E[X]) + t(Y-E[Y]) )^2] \\ge 0$. Its discriminant $\\Delta = 4(\\text{Cov}(X,Y))^2 - 4\\text{Var}(X)\\text{Var}(Y) \\le 0$, which immediately implies $(\\text{Cov}(X,Y))^2 \\le \\text{Var}(X)\\text{Var}(Y)$, hence $|\\rho| \\le 1$.\n2. $|\\rho| = 1 \\iff Y = aX + b$ almost surely ($a > 0 \\implies \\rho = 1$, $a < 0 \\implies \\rho = -1$).\n3. If $X, Y$ are independent, then $E[XY] = E[X]E[Y] \\implies \\text{Cov}(X, Y) = 0 \\implies \\rho = 0$.\n4. **Counterexample (Uncorrelated does NOT mean independent)**: Let $X \\sim U(-1, 1)$, and $Y = X^2$. Here $E[X] = 0, E[XY] = E[X^3] = 0 \\implies \\text{Cov}(X, Y) = 0 \\implies \\rho = 0$. Yet $Y$ is completely determined by $X$!",
        "keyFormulas": [
            "\\text{Cov}(X, Y) = E[XY] - E[X]E[Y]",
            "\\rho(X, Y) = \\frac{\\text{Cov}(X, Y)}{\\sqrt{\\text{Var}(X)\\text{Var}(Y)}}, \\quad -1 \\le \\rho(X, Y) \\le 1",
            "|\\rho| = 1 \\iff Y = aX + b \\text{ a.s.}"
        ],
        "examinerQuestions": [
            "Write the proof of $|\\rho| \\le 1$ using the discriminant on the board.",
            "Can you give an example where two variables have correlation 0 but are strongly dependent?"
        ]
    },
    {
        "id": 7,
        "title": "Probability generating functions and their properties",
        "titleUa": "Твірні функції ймовірностей та їхні властивості",
        "time": "4-5 minutes",
        "structure": [
            "1. Define PGF G_X(s) = E[s^X] = sum_{k=0}^∞ p_X(k) s^k for non-negative integer RV X, |s| <= 1.",
            "2. Normalization: G_X(1) = 1.",
            "3. Recovery of probabilities: P(X = k) = G_X^{(k)}(0) / k!.",
            "4. Factorial moments: G_X'(1) = E[X], G_X''(1) = E[X(X-1)]. Derive Var(X) = G''(1) + G'(1) - (G'(1))^2.",
            "5. Sum of independent variables: G_{X+Y}(s) = G_X(s) G_Y(s).",
            "6. Examples: Bernoulli, Binomial, Poisson."
        ],
        "speech": "For an integer-valued non-negative random variable $X \\in \\{0, 1, 2, \\dots\\}$, the **Probability Generating Function (p.g.f.)** is defined for $|s| \\le 1$ as:\n$$G_X(s) = E[s^X] = \\sum_{k=0}^\\infty p_X(k) s^k$$\n\nProperties of PGF:\n1. $G_X(1) = \\sum_{k=0}^\\infty p_X(k) = 1$.\n2. **Uniqueness & Probability Recovery**: By Taylor series, $p_X(k) = P(X = k) = \\frac{G_X^{(k)}(0)}{k!}$. In particular, $P(X = 0) = G_X(0)$.\n3. **Moments**: Taking derivatives term-by-term at $s=1$:\n$$G_X'(1) = \\sum_{k=1}^\\infty k p_X(k) = E[X]$$\n$$G_X''(1) = \\sum_{k=2}^\\infty k(k-1) p_X(k) = E[X(X-1)] = E[X^2] - E[X]$$\nConsequently, $\\text{Var}(X) = G_X''(1) + G_X'(1) - (G_X'(1))^2$.\n4. **Sum of independent random variables**: If $X, Y$ are independent:\n$$G_{X+Y}(s) = E[s^{X+Y}] = E[s^X s^Y] = E[s^X] E[s^Y] = G_X(s) G_Y(s)$$\n\nExample (Poisson): $G_X(s) = \\sum \\frac{(\\lambda s)^k e^{-\\lambda}}{k!} = e^{\\lambda(s-1)}$. Then for $X_1, X_2 \\sim P(\\lambda)$ independent, $G_{X_1+X_2}(s) = e^{2\\lambda(s-1)} \\implies X_1 + X_2 \\sim P(2\\lambda)$.",
        "keyFormulas": [
            "G_X(s) = E[s^X] = \\sum_{k=0}^\\infty p_X(k) s^k",
            "p_X(k) = \\frac{G_X^{(k)}(0)}{k!}, \\quad G_X'(1) = E[X], \\quad G_X''(1) = E[X(X-1)]",
            "G_{X+Y}(s) = G_X(s) G_Y(s)"
        ],
        "examinerQuestions": [
            "Why is G_X(s) guaranteed to converge for all |s| <= 1? (Because |s^k| <= 1 and sum p(k) = 1, so the series is dominated by 1).",
            "Find the PGF of a Geometric distribution G(p)."
        ]
    },
    {
        "id": 8,
        "title": "Continuous random variables; their properties",
        "titleUa": "Неперервні випадкові величини та їхні властивості",
        "time": "4-5 minutes",
        "structure": [
            "1. Formal definition: existence of non-negative integrable density f_X such that F_X(x) = int_{-∞}^x f_X(t)dt.",
            "2. Properties of PDF: f_X(x) >= 0, integral over R is 1, P(a <= X <= b) = integral_a^b f(x)dx.",
            "3. Point probability P(X = c) = 0 for all c in R, and implication for interval endpoints.",
            "4. Relationship between CDF and PDF: f_X(x) = F_X'(x) at continuity points.",
            "5. Expectation E[X] = integral x f(x)dx and LOTUS E[g(X)] = integral g(x)f(x)dx."
        ],
        "speech": "A random variable $X$ is continuous if its cumulative distribution function can be written as:\n$$F_X(x) = \\int_{-\\infty}^x f_X(t) dt$$\nwhere $f_X: \\mathbb{R} \\to [0, \\infty)$ is an integrable function called the probability density function (p.d.f.).\n\nFundamental Properties:\n1. $f_X(x) \\ge 0$ almost everywhere, and $\\int_{-\\infty}^\\infty f_X(x) dx = 1$.\n2. $F_X(x)$ is continuous everywhere on $\\mathbb{R}$.\n3. **Probability of any singleton is zero**: For every $c \\in \\mathbb{R}$, $P(X = c) = \\int_c^c f_X(t) dt = 0$.\n4. Endpoints of intervals do not affect probabilities:\n$$P(a \\le X \\le b) = P(a < X \\le b) = P(a \\le X < b) = P(a < X < b) = \\int_a^b f_X(x) dx = F_X(b) - F_X(a)$$\n5. Wherever $f_X$ is continuous, $F_X'(x) = f_X(x)$.\n6. The expected value is $E[X] = \\int_{-\\infty}^\\infty x f_X(x) dx$ provided $\\int |x|f_X(x)dx < \\infty$. By LOTUS, $E[g(X)] = \\int_{-\\infty}^\\infty g(x) f_X(x) dx$.",
        "keyFormulas": [
            "F_X(x) = \\int_{-\\infty}^x f_X(t) dt, \\quad f_X(x) = F_X'(x)",
            "P(a \\le X \\le b) = \\int_a^b f_X(x) dx, \\quad P(X = c) = 0",
            "E[X] = \\int_{-\\infty}^\\infty x f_X(x) dx"
        ],
        "examinerQuestions": [
            "Can a PDF take values larger than 1? Can it be unbounded?",
            "Give an example of a random variable that is neither discrete nor continuous (e.g. traffic light delay with an atom at 0 and uniform on (0, 1))."
        ]
    },
    {
        "id": 9,
        "title": "Independent random variables; examples and properties",
        "titleUa": "Незалежні випадкові величини; приклади та властивості",
        "time": "4-5 minutes",
        "structure": [
            "1. General definition: P(X <= x, Y <= y) = P(X <= x) P(Y <= y) for all x, y (i.e. F_{X,Y}(x, y) = F_X(x) F_Y(y)).",
            "2. Discrete characterization: p_{X,Y}(x, y) = p_X(x) p_Y(y) for all x, y.",
            "3. Continuous characterization: f_{X,Y}(x, y) = f_X(x) f_Y(y) for all x, y.",
            "4. Fundamental properties: E[g(X) h(Y)] = E[g(X)] E[h(Y)], in particular E[XY] = E[X]E[Y], Cov(X, Y) = 0, Var(X + Y) = Var(X) + Var(Y).",
            "5. Generating function factorization: G_{X+Y}(s) = G_X(s)G_Y(s), M_{X+Y}(t) = M_X(t)M_Y(t).",
            "6. Examples: Tossing two separate coins, coordinates in product support."
        ],
        "speech": "Random variables $X$ and $Y$ are independent if for all $x, y \\in \\mathbb{R}$:\n$$F_{X,Y}(x, y) = P(X \\le x, Y \\le y) = P(X \\le x) P(Y \\le y) = F_X(x) F_Y(y)$$\n\nEquivalently:\n- For discrete RVs: $p_{X,Y}(x, y) = p_X(x) p_Y(y)$ for all $x, y$.\n- For continuous RVs: $f_{X,Y}(x, y) = f_X(x) f_Y(y)$ for all $x, y$.\n\nCore Properties of Independent RVs:\n1. **Expectation of Product**: For any measurable functions $g, h$, $E[g(X)h(Y)] = E[g(X)] E[h(Y)]$.\n2. **Zero Covariance**: $E[XY] = E[X]E[Y] \\implies \\text{Cov}(X, Y) = 0$ and $\\rho(X, Y) = 0$.\n3. **Variance of Sum**: $\\text{Var}(X + Y) = \\text{Var}(X) + \\text{Var}(Y)$. More generally, $\\text{Var}(aX + bY) = a^2\\text{Var}(X) + b^2\\text{Var}(Y)$.\n4. **Generating Functions Product**: $G_{X+Y}(s) = G_X(s) G_Y(s)$ and $M_{X+Y}(t) = M_X(t) M_Y(t)$.\n5. **Support Condition**: For continuous RVs to be independent, their joint support MUST be a Cartesian product of domains $S_X \\times S_Y$. If the boundary depends on the other variable (like $0 < y < x < 1$), they CANNOT be independent!",
        "keyFormulas": [
            "F_{X,Y}(x, y) = F_X(x) F_Y(y), \\quad f_{X,Y}(x, y) = f_X(x) f_Y(y)",
            "E[g(X)h(Y)] = E[g(X)] E[h(Y)] \\implies \\text{Cov}(X, Y) = 0",
            "\\text{Var}(X + Y) = \\text{Var}(X) + \\text{Var}(Y)"
        ],
        "examinerQuestions": [
            "Does pairwise independence of three random variables imply mutual independence? (NO! Give pairwise independent coin toss counterexample: X, Y fair coins, Z = X XOR Y).",
            "If Cov(X, Y) = 0, are X and Y independent? (NO! Give U(-1, 1) and X^2)."
        ]
    },
    {
        "id": 10,
        "title": "Normal distribution and its properties",
        "titleUa": "Нормальний розподіл та його властивості",
        "time": "4-5 minutes",
        "structure": [
            "1. Define PDF f(x) = 1/(σ√(2π)) exp(-(x-μ)^2 / (2σ^2)) with parameters μ in R, σ > 0.",
            "2. Symmetry: bell-shaped curve centered at μ, inflection points at μ ± σ.",
            "3. Standardization: Z = (X - μ)/σ ~ N(0, 1), standard normal density φ(z) and CDF Φ(z). Symmetry: Φ(-z) = 1 - Φ(z).",
            "4. Affine transformation theorem: If X ~ N(μ, σ^2), then Y = aX + b ~ N(aμ + b, a^2 σ^2).",
            "5. Sum of independent normals: X_1 + X_2 ~ N(μ_1 + μ_2, σ_1^2 + σ_2^2).",
            "6. MGF: M_X(t) = exp(μt + (1/2)σ^2 t^2)."
        ],
        "speech": "The Normal (Gaussian) distribution $N(\\mu, \\sigma^2)$ has density:\n$$f_X(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} \\exp\\left( -\\frac{(x-\\mu)^2}{2\\sigma^2} \\right), \\quad x \\in \\mathbb{R}$$\nwith mean $E[X] = \\mu$ and variance $\\text{Var}(X) = \\sigma^2$.\n\nKey Properties:\n1. **Symmetry**: $f_X(\\mu - x) = f_X(\\mu + x)$. The mean, median, and mode are all equal to $\\mu$.\n2. **Standardization**: If $X \\sim N(\\mu, \\sigma^2)$, then $Z = \\frac{X - \\mu}{\\sigma} \\sim N(0, 1)$. We express all normal probabilities using $\\Phi(z) = \\int_{-\\infty}^z \\frac{1}{\\sqrt{2\\pi}} e^{-t^2/2} dt$. By symmetry, $\\Phi(-z) = 1 - \\Phi(z)$.\n3. **Affine Transformation**: If $X \\sim N(\\mu, \\sigma^2)$, then for any constants $a \\ne 0, b$:\n$$Y = aX + b \\sim N(a\\mu + b, a^2 \\sigma^2)$$\n4. **Sum of Independent Normals**: If $X_1 \\sim N(\\mu_1, \\sigma_1^2)$ and $X_2 \\sim N(\\mu_2, \\sigma_2^2)$ are independent, then $X_1 + X_2 \\sim N(\\mu_1 + \\mu_2, \\sigma_1^2 + \\sigma_2^2)$.\n5. **MGF**: $M_X(t) = e^{\\mu t + \\frac{1}{2}\\sigma^2 t^2}$.",
        "keyFormulas": [
            "Z = \\frac{X - \\mu}{\\sigma} \\sim N(0, 1), \\quad \\Phi(-z) = 1 - \\Phi(z)",
            "X \\sim N(\\mu, \\sigma^2) \\implies aX + b \\sim N(a\\mu + b, a^2\\sigma^2)",
            "M_X(t) = \\exp\\left(\\mu t + \\frac{1}{2}\\sigma^2 t^2\\right)"
        ],
        "examinerQuestions": [
            "In Midterm 2017: If Z ~ N(0, 1) and Y = 3 - 2Z, express P(Y <= 1) and P(Y > 5) in terms of Φ. Answer: P(Y <= 1) = P(3 - 2Z <= 1) = P(Z >= 1) = 1 - Φ(1).",
            "Why is the normal distribution so central to probability theory? (Central Limit Theorem: sum of many independent RVs converges to normal)."
        ]
    },
    {
        "id": 11,
        "title": "Exponential distribution and its properties",
        "titleUa": "Експоненційний розподіл та його властивості",
        "time": "4-5 minutes",
        "structure": [
            "1. Define PDF f(x) = λ e^{-λx} for x >= 0 (λ > 0), and CDF F(x) = 1 - e^{-λx}.",
            "2. Survival function: P(X > t) = e^{-λt}.",
            "3. Mean E[X] = 1/λ, Variance Var(X) = 1/λ^2. Derive using integration by parts or Gamma function.",
            "4. State and prove the Memoryless Property: P(X > s + t | X > s) = P(X > t).",
            "5. Minimum of independent exponentials: min(X_1, ..., X_n) ~ E(sum λ_i).",
            "6. Hazard rate function: h(t) = f(t)/P(X > t) = λ (constant hazard rate!)."
        ],
        "speech": "The Exponential distribution $E(\\lambda)$ with rate $\\lambda > 0$ has density:\n$$f_X(x) = \\lambda e^{-\\lambda x}, \\quad x \\ge 0$$\nand CDF $F_X(x) = 1 - e^{-\\lambda x}$ for $x \\ge 0$. Its survival function is $P(X > t) = e^{-\\lambda t}$.\n\nMean and Variance:\n$$E[X] = \\int_0^\\infty x \\lambda e^{-\\lambda x} dx = \\frac{1}{\\lambda}, \\quad \\text{Var}(X) = \\frac{1}{\\lambda^2}$$\n\n**The Memoryless Property**:\nFor all $s, t \\ge 0$:\n$$P(X > s + t \\mid X > s) = \\frac{P(X > s + t)}{P(X > s)} = \\frac{e^{-\\lambda(s+t)}}{e^{-\\lambda s}} = e^{-\\lambda t} = P(X > t)$$\nThis means the remaining lifetime has the exact same distribution as a brand new item! The exponential distribution is the ONLY continuous distribution with this property.\n\n**Minimum of Independent Exponentials**:\nIf $X_1 \\sim E(\\lambda_1), \\dots, X_n \\sim E(\\lambda_n)$ are independent, then for $M = \\min(X_1, \\dots, X_n)$:\n$$P(M > t) = P(X_1 > t, \\dots, X_n > t) = \\prod_{i=1}^n e^{-\\lambda_i t} = e^{-(\\sum \\lambda_i) t}$$\nThus, $M \\sim E\\left(\\sum_{i=1}^n \\lambda_i\\right)$ with expected value $\\frac{1}{\\sum \\lambda_i}$.",
        "keyFormulas": [
            "f(x) = \\lambda e^{-\\lambda x}, \\quad P(X > t) = e^{-\\lambda t}, \\quad E[X] = 1/\\lambda, \\quad \\text{Var}(X) = 1/\\lambda^2",
            "P(X > s + t \\mid X > s) = P(X > t)",
            "\\min(X_1, \\dots, X_n) \\sim E\\left(\\sum_{i=1}^n \\lambda_i\\right)"
        ],
        "examinerQuestions": [
            "What is P(X_1 < X_2) for two independent exponentials with rates λ_1 and λ_2? Answer: λ_1 / (λ_1 + λ_2).",
            "What is the connection between the Poisson process and the exponential distribution? (Inter-arrival times are exponential with rate λ)."
        ]
    },
    {
        "id": 12,
        "title": "Distribution of transformed random variables & sum of random variables",
        "titleUa": "Розподіл перетворених випадкових величин та розподіл суми",
        "time": "4-5 minutes",
        "structure": [
            "1. 1D transformation: CDF method F_Y(y) = P(g(X) <= y) and differentiation.",
            "2. Change of variables formula for strictly monotonic g: f_Y(y) = f_X(g^{-1}(y)) |d/dy g^{-1}(y)|.",
            "3. 2D Jacobian transformation: f_{U,V}(u, v) = f_{X,Y}(x(u,v), y(u,v)) |J|.",
            "4. Distribution of sum Z = X + Y: Convolution formula for independent continuous RVs f_{X+Y}(z) = integral f_X(x) f_Y(z-x) dx.",
            "5. Examples: Laplace distribution as difference of two exponentials, and sum of uniforms."
        ],
        "speech": "To find the distribution of $Y = g(X)$:\n\n1. **The CDF Method**:\n$$F_Y(y) = P(g(X) \\le y) = \\int_{\\{x: g(x) \\le y\\}} f_X(x) dx$$\nThen $f_Y(y) = F_Y'(y)$. This method always works, even when $g$ is not monotonic.\n\n2. **Monotonic Transformation Formula**:\nIf $g$ is strictly monotonic and continuously differentiable on the support, then $x = g^{-1}(y)$ exists, and:\n$$f_Y(y) = f_X(g^{-1}(y)) \\left| \\frac{d}{dy} g^{-1}(y) \\right| = \\frac{f_X(x)}{|g'(x)|}$$\n\n3. **2D Transformations via Jacobian**:\nFor $(U, V) = (g_1(X, Y), g_2(X, Y))$ being a bijection with inverse $(X, Y) = (h_1(U, V), h_2(U, V))$:\n$$f_{U,V}(u, v) = f_{X,Y}(h_1(u, v), h_2(u, v)) \\cdot |J(u, v)|, \\quad J = \\det \\begin{pmatrix} \\frac{\\partial x}{\\partial u} & \\frac{\\partial x}{\\partial v} \\\\ \\frac{\\partial y}{\\partial u} & \\frac{\\partial y}{\\partial v} \\end{pmatrix}$$\n\n4. **Sum of Independent Variables (Convolution)**:\nFor $Z = X + Y$ with $X, Y$ independent:\n$$f_{X+Y}(z) = \\int_{-\\infty}^\\infty f_X(x) f_Y(z - x) dx$$\nAlternatively, use generating functions: $M_{X+Y}(t) = M_X(t) M_Y(t)$.",
        "keyFormulas": [
            "f_Y(y) = f_X(g^{-1}(y)) \\left| \\frac{d}{dy} g^{-1}(y) \\right|",
            "f_{U,V}(u, v) = f_{X,Y}(x(u,v), y(u,v)) \\cdot |J|",
            "f_{X+Y}(z) = \\int_{-\\infty}^\\infty f_X(x) f_Y(z - x) dx"
        ],
        "examinerQuestions": [
            "Find the PDF of Y = Z^2 when Z ~ N(0, 1). Show that it gives the Chi-squared distribution with 1 degree of freedom.",
            "If X_1, X_2 ~ E(λ) are independent, what is the distribution of Y = X_1 - X_2? Answer: Laplace / double exponential with density (λ/2) e^{-λ|y|}."
        ]
    }
]

print("Oral questions defined: ", len(ORAL_QUESTIONS_12))
