#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build distributions table, quiz questions, and topic study notes.
"""

DISTRIBUTIONS_DATA = [
    {
        "name": "Bernoulli B(1, p)",
        "type": "Discrete",
        "parameters": "p \\in (0, 1)",
        "support": "\\{0, 1\\}",
        "pmf_pdf": "P(X=1)=p, \\; P(X=0)=1-p",
        "mean": "p",
        "variance": "p(1-p)",
        "pgf": "1 - p + ps",
        "mgf": "1 - p + pe^t",
        "keyProperty": "Building block: sum of n i.i.d. Bernoullis is Binomial B(n, p)."
    },
    {
        "name": "Binomial B(n, p)",
        "type": "Discrete",
        "parameters": "n \\in \\mathbb{N}, \\; p \\in (0, 1)",
        "support": "\\{0, 1, \\dots, n\\}",
        "pmf_pdf": "\\binom{n}{k} p^k (1-p)^{n-k}",
        "mean": "np",
        "variance": "np(1-p)",
        "pgf": "(1 - p + ps)^n",
        "mgf": "(1 - p + pe^t)^n",
        "keyProperty": "Sum of independent binomials with same p is binomial B(n_1+n_2, p)."
    },
    {
        "name": "Geometric G(p)",
        "type": "Discrete",
        "parameters": "p \\in (0, 1)",
        "support": "\\{1, 2, 3, \\dots\\}",
        "pmf_pdf": "(1-p)^{k-1} p",
        "mean": "1/p",
        "variance": "\\frac{1-p}{p^2}",
        "pgf": "\\frac{ps}{1 - (1-p)s}",
        "mgf": "\\frac{pe^t}{1 - (1-p)e^t}",
        "keyProperty": "Memoryless property: P(X > m+n | X > m) = P(X > n). Tail sum: E[X] = \\sum P(X \\ge k)."
    },
    {
        "name": "Poisson P(λ)",
        "type": "Discrete",
        "parameters": "\\lambda > 0",
        "support": "\\{0, 1, 2, \\dots\\}",
        "pmf_pdf": "\\frac{\\lambda^k e^{-\\lambda}}{k!}",
        "mean": "\\lambda",
        "variance": "\\lambda",
        "pgf": "e^{\\lambda(s-1)}",
        "mgf": "e^{\\lambda(e^t - 1)}",
        "keyProperty": "Mean equals variance. Sum of independent Poissons is Poisson P(\\lambda_1 + \\lambda_2). Thinning theorem."
    },
    {
        "name": "Uniform U(a, b)",
        "type": "Continuous",
        "parameters": "a < b",
        "support": "[a, b]",
        "pmf_pdf": "\\frac{1}{b-a}",
        "mean": "\\frac{a+b}{2}",
        "variance": "\\frac{(b-a)^2}{12}",
        "pgf": "\\text{N/A (continuous)}",
        "mgf": "\\frac{e^{tb} - e^{ta}}{t(b-a)}",
        "keyProperty": "Flat density. Sum of two independent U(0,1) gives triangle distribution on (0, 2)."
    },
    {
        "name": "Exponential E(λ)",
        "type": "Continuous",
        "parameters": "\\lambda > 0",
        "support": "[0, \\infty)",
        "pmf_pdf": "\\lambda e^{-\\lambda x}",
        "mean": "1/\\lambda",
        "variance": "1/\\lambda^2",
        "pgf": "\\text{N/A (continuous)}",
        "mgf": "\\frac{\\lambda}{\\lambda - t} \\; (t < \\lambda)",
        "keyProperty": "Memoryless: P(X > s+t | X > s) = P(X > t). Min of independent exponentials is E(\\sum \\lambda_i)."
    },
    {
        "name": "Normal N(μ, σ²)",
        "type": "Continuous",
        "parameters": "\\mu \\in \\mathbb{R}, \\; \\sigma > 0",
        "support": "\\mathbb{R}",
        "pmf_pdf": "\\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-(x-\\mu)^2/(2\\sigma^2)}",
        "mean": "\\mu",
        "variance": "\\sigma^2",
        "pgf": "\\text{N/A (continuous)}",
        "mgf": "e^{\\mu t + \\frac{1}{2}\\sigma^2 t^2}",
        "keyProperty": "Symmetric around \\mu. Affine transform aX+b ~ N(a\\mu+b, a^2\\sigma^2). Z = (X-\\mu)/\\sigma ~ N(0,1)."
    },
    {
        "name": "Laplace (Double Exponential)",
        "type": "Continuous",
        "parameters": "\\lambda > 0",
        "support": "\\mathbb{R}",
        "pmf_pdf": "\\frac{\\lambda}{2} e^{-\\lambda |x|}",
        "mean": "0",
        "variance": "2/\\lambda^2",
        "pgf": "\\text{N/A (continuous)}",
        "mgf": "\\frac{\\lambda^2}{\\lambda^2 - t^2} \\; (|t| < \\lambda)",
        "keyProperty": "Distribution of difference X_1 - X_2 of two i.i.d. Exponential E(\\lambda) variables."
    }
]

QUIZ_QUESTIONS = [
    {
        "id": "q1",
        "topic": "Definitions & Axioms",
        "question": "Which of the following is NOT a fundamental defining property of a Cumulative Distribution Function $F_X(x)$?",
        "options": [
            "$F_X$ is strictly continuous from the left everywhere",
            "$F_X$ is non-decreasing: $x_1 < x_2 \\implies F_X(x_1) \\le F_X(x_2)$",
            "$\\lim_{x \\to -\\infty} F_X(x) = 0$ and $\\lim_{x \\to +\\infty} F_X(x) = 1$",
            "$F_X$ is continuous from the right: $\\lim_{h \\to 0^+} F_X(x+h) = F_X(x)$"
        ],
        "correctIndex": 0,
        "explanation": "By definition, the CDF must be **right-continuous**, not left-continuous! Right-continuity follows from the continuity of probability measure on decreasing sets: $\\bigcap_n \\{\\omega: X \\le x + 1/n\\} = \\{\\omega: X \\le x\\}$."
    },
    {
        "id": "q2",
        "topic": "Variance Properties",
        "question": "If $X$ and $Y$ are independent random variables with $\\text{Var}(X) = \\text{Var}(Y) = 1$, what is $\\text{Var}(2X - Y)$?",
        "options": [
            "$1$",
            "$3$",
            "$5$",
            "$4$"
        ],
        "correctIndex": 2,
        "explanation": "Since $X$ and $Y$ are independent, $\\text{Cov}(X, Y) = 0$. Using $\\text{Var}(aX + bY) = a^2 \\text{Var}(X) + b^2 \\text{Var}(Y)$:\n$$\\text{Var}(2X - Y) = 2^2 \\text{Var}(X) + (-1)^2 \\text{Var}(Y) = 4(1) + 1(1) = 5$$."
    },
    {
        "id": "q3",
        "topic": "Normal Affine Transformation",
        "question": "If $X \\sim N(0, 1)$, what is the distribution of $Y = aX + b$ (where $a \\ne 0$)?",
        "options": [
            "$\\mu = a, \\; \\sigma^2 = b$",
            "$\\mu = b, \\; \\sigma^2 = a$",
            "$\\mu = b, \\; \\sigma^2 = a^2$",
            "$\\mu = a^2, \\; \\sigma^2 = b^2$"
        ],
        "correctIndex": 2,
        "explanation": "Expectation is $E[Y] = aE[X] + b = a(0) + b = b$. Variance is $\\text{Var}(Y) = a^2 \\text{Var}(X) = a^2(1) = a^2$. Therefore $Y \\sim N(b, a^2)$."
    },
    {
        "id": "q4",
        "topic": "Density Recognition",
        "question": "The formula $f(x) = c e^{-2x^2}$ (with a suitable normalizing constant $c$) gives the probability density function for which distribution?",
        "options": [
            "$E(2)$",
            "$N(0, 1/2)$",
            "$N(0, 1/4)$",
            "$E(\\sqrt{2})$"
        ],
        "correctIndex": 2,
        "explanation": "The standard normal density has exponent $-\\frac{x^2}{2\\sigma^2}$. Comparing $-2x^2 = -\\frac{x^2}{2\\sigma^2}$ gives $2\\sigma^2 = 1/2 \\implies \\sigma^2 = 1/4$. Thus, it is $N(0, 1/4)$."
    },
    {
        "id": "q5",
        "topic": "Expectation Fallacies",
        "question": "Is the following statement True or False: 'If $E[X] = E[Y]$, then $E[X^2] = E[Y^2]$'?",
        "options": [
            "True",
            "False"
        ],
        "correctIndex": 1,
        "explanation": "False! $E[X^2] = \\text{Var}(X) + (E[X])^2$. Two variables can have identical means but completely different variances. For example, $X = 0$ constantly has $E[X^2] = 0$, while $Y = \\pm 1$ each with prob $1/2$ has $E[Y] = 0$ but $E[Y^2] = 1$."
    },
    {
        "id": "q6",
        "topic": "Sum of Uniforms",
        "question": "Is the following statement True or False: 'If $X_1$ and $X_2$ are independent and have distribution $U(0, 1)$, then $X_1 + X_2$ is uniformly distributed on $(0, 2)$'?",
        "options": [
            "True",
            "False"
        ],
        "correctIndex": 1,
        "explanation": "False! The sum of two independent uniforms has a triangular distribution peaking at $z=1$ ($f(z) = z$ on $[0, 1]$ and $2-z$ on $[1, 2]$). It is definitely not flat/uniform."
    },
    {
        "id": "q7",
        "topic": "Covariance & Independence",
        "question": "If $\\text{Cov}(X, Y) = 0$, does this imply that $X$ and $Y$ are independent?",
        "options": [
            "Yes, always: $\\text{Cov}(X, Y) = 0 \\implies X \\perp Y$",
            "Yes, provided both $X$ and $Y$ are discrete",
            "No, zero covariance only implies lack of linear association, not independence",
            "No, only if both have zero mean: $E[X] = E[Y] = 0$"
        ],
        "correctIndex": 2,
        "explanation": "Independence implies $\\text{Cov}(X, Y) = 0$, but the converse is FALSE! Classic counterexample: $X \\sim U(-1, 1)$ and $Y = X^2$. Here $E[X] = 0$ and $E[XY] = E[X^3] = 0$, so $\\text{Cov}(X, Y) = 0$, but $Y$ is completely functionally determined by $X$!"
    },
    {
        "id": "q8",
        "topic": "PGF Properties",
        "question": "Let $G_X(s)$ be the probability generating function of a non-negative integer RV $X$. Which formula correctly gives $\\text{Var}(X)$?",
        "options": [
            "$G_X''(1) - (G_X'(1))^2$",
            "$G_X''(1) + G_X'(1) - (G_X'(1))^2$",
            "$G_X''(0) + G_X'(0)$",
            "$G_X'(1) - (G_X''(1))^2$"
        ],
        "correctIndex": 1,
        "explanation": "Recall $G'(1) = E[X]$, and $G''(1) = E[X(X-1)] = E[X^2] - E[X]$. Thus $E[X^2] = G''(1) + G'(1)$. Then $\\text{Var}(X) = E[X^2] - (E[X])^2 = G''(1) + G'(1) - (G'(1))^2$."
    },
    {
        "id": "q9",
        "topic": "Poisson Sum",
        "question": "If $X_1 \\sim P(\\lambda_1)$ and $X_2 \\sim P(\\lambda_2)$ are independent, what is the distribution of $X_1 + X_2$?",
        "options": [
            "$P(\\lambda_1 \\lambda_2)$",
            "$P(\\lambda_1 + \\lambda_2)$",
            "$B(\\lambda_1 + \\lambda_2, 0.5)$",
            "Cannot be determined without joint distribution"
        ],
        "correctIndex": 1,
        "explanation": "By PGFs: $G_{X_1+X_2}(s) = G_{X_1}(s) G_{X_2}(s) = e^{\\lambda_1(s-1)} e^{\\lambda_2(s-1)} = e^{(\\lambda_1 + \\lambda_2)(s-1)}$, which uniquely characterizes $P(\\lambda_1 + \\lambda_2)$."
    },
    {
        "id": "q10",
        "topic": "Continuous Points",
        "question": "For a continuous random variable $X$ with density $f_X(x)$, what is $P(X = 3.5)$?",
        "options": [
            "$f_X(3.5)$",
            "$0$",
            "$\\int_0^{3.5} f_X(x) \\, dx$",
            "Depends on whether $f_X(3.5) > 0$"
        ],
        "correctIndex": 1,
        "explanation": "For any continuous random variable, the probability of any single real point is strictly 0: $P(X = c) = \\int_c^c f_X(t) dt = 0$."
    },
    {
        "id": "q11",
        "topic": "Geometric Memoryless",
        "question": "If $X \\sim G(p)$ is the number of trials until the first success, what is $P(X > 7 \\mid X > 4)$?",
        "options": [
            "$P(X > 4)$",
            "$P(X > 3)$",
            "$P(X = 3)$",
            "$(1-p)^7$"
        ],
        "correctIndex": 1,
        "explanation": "By the memoryless property of the Geometric distribution: $P(X > m + n \\mid X > m) = P(X > n)$. Here $m = 4$ and $n = 3$, so $P(X > 4 + 3 \\mid X > 4) = P(X > 3) = (1-p)^3$."
    },
    {
        "id": "q12",
        "topic": "Continuous Uniform Variance",
        "question": "What is the variance of a random variable $X \\sim U(2, 8)$?",
        "options": [
            "$3$",
            "$6$",
            "$\\frac{(8 - 2)^2}{12} = \\frac{36}{12} = 3$",
            "$\\frac{8 - 2}{12} = 0.5$"
        ],
        "correctIndex": 2,
        "explanation": "For $U(a, b)$, $\\text{Var}(X) = \\frac{(b-a)^2}{12}$. With $a = 2, b = 8$: $\\text{Var}(X) = \\frac{(8-2)^2}{12} = \\frac{36}{12} = 3$."
    },
    {
        "id": "q13",
        "topic": "Normal Symmetry",
        "question": "Let $Z \\sim N(0, 1)$ and $\\Phi$ denote its cumulative distribution function. Express $P(Z > 1.96)$ in terms of $\\Phi$:",
        "options": [
            "$\\Phi(1.96)$",
            "$1 - \\Phi(1.96)$ or $\\Phi(-1.96)$",
            "$2\\Phi(1.96) - 1$",
            "$-\\Phi(1.96)$"
        ],
        "correctIndex": 1,
        "explanation": "$P(Z > 1.96) = 1 - P(Z \\le 1.96) = 1 - \\Phi(1.96)$. By symmetry of the standard normal bell curve, $1 - \\Phi(z) = \\Phi(-z)$, so it also equals $\\Phi(-1.96)$."
    },
    {
        "id": "q14",
        "topic": "Poisson Thinning",
        "question": "If total email arrivals $N \\sim P(\\lambda)$ and each email is independently spam with probability $p$, what is the distribution of spam emails $S$?",
        "options": [
            "$B(\\lambda, p)$",
            "$P(\\lambda p)$",
            "$P(\\lambda / p)$",
            "$G(p)$ (Geometric)"
        ],
        "correctIndex": 1,
        "explanation": "This is Poisson Thinning: the number of spam emails $S \\sim P(\\lambda p)$, non-spam emails $N - S \\sim P(\\lambda(1-p))$, and remarkably, $S$ and $N - S$ are completely independent!"
    },
    {
        "id": "q15",
        "topic": "Conditional Uniform",
        "question": "If $(X, Y)$ is uniformly distributed over the triangle $0 < y < x < 1$ with joint density $f(x, y) = 2$, what is the conditional distribution of $Y$ given $X = 0.8$?",
        "options": [
            "$U(0, 1)$",
            "$U(0, 0.8)$",
            "$N(0.4, 0.8)$",
            "$E(0.8)$"
        ],
        "correctIndex": 1,
        "explanation": "Given $X = 0.8$, $y$ is constrained to $0 < y < 0.8$. The joint density is constant, so the conditional density $f_{Y|X}(y \\mid 0.8) = \\frac{2}{2(0.8)} = \\frac{1}{0.8}$ for $y \\in (0, 0.8)$, which is the uniform distribution $U(0, 0.8)$."
    }
]

TOPICS_NOTES = [
    {
        "id": "topic-1",
        "number": 1,
        "title": "Topic 1: Discrete Random Variables & Standard Distributions",
        "summary": "Covers sample spaces, measurability, discrete support, PMF, Bernoulli, Binomial, Geometric, and Poisson models.",
        "content": """### Core Concepts
1. **Random Variable**: A measurable function $X: \\Omega \\to \\mathbb{R}$.
2. **Discrete RV**: Support $S_X$ is finite or countably infinite.
3. **PMF**: $p_X(x) = P(X = x)$. Axioms: $p_X(x) \\ge 0$, $\\sum_{x \\in S_X} p_X(x) = 1$.

### Standard Distributions
- **Bernoulli $B(1, p)$**: Indicator of success. $E[X] = p$, $\\text{Var}(X) = p(1-p)$.
- **Binomial $B(n, p)$**: $p(k) = \\binom{n}{k} p^k (1-p)^{n-k}$, $k=0, \\dots, n$. $E[X] = np$, $\\text{Var}(X) = np(1-p)$.
- **Geometric $G(p)$**: $p(k) = (1-p)^{k-1}p$, $k \\ge 1$. $E[X] = 1/p$, $\\text{Var}(X) = \\frac{1-p}{p^2}$. Memoryless: $P(X > m+n \\mid X > m) = P(X > n)$.
- **Poisson $P(\\lambda)$**: $p(k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}$, $k \\ge 0$. $E[X] = \\lambda$, $\\text{Var}(X) = \\lambda$.
"""
    },
    {
        "id": "topic-2",
        "number": 2,
        "title": "Topic 2: Cumulative Distribution Function (CDF)",
        "summary": "Properties of CDF, step functions for discrete variables, limits, right-continuity, and jump heights.",
        "content": """### Four Fundamental Axioms of CDF
1. **Monotone**: $x_1 < x_2 \\implies F(x_1) \\le F(x_2)$.
2. **Right-Continuous**: $\\lim_{h \\to 0^+} F(x+h) = F(x)$.
3. **Limits at Infinity**: $\\lim_{x \\to -\\infty} F(x) = 0$ and $\\lim_{x \\to +\\infty} F(x) = 1$.
4. **Interval Probabilities**: $P(a < X \\le b) = F(b) - F(a)$.

### Jumps
The height of the jump at point $a$ gives the exact point probability:
$$P(X = a) = F(a) - F(a^-)$$
"""
    },
    {
        "id": "topic-3",
        "number": 3,
        "title": "Topic 3: Joint, Marginal & Conditional Distributions (Discrete)",
        "summary": "Contingency tables, marginal summation, independence test, and conditional PMF.",
        "content": """### Formulas
- Joint PMF: $p_{X,Y}(x, y) = P(X=x, Y=y)$.
- Marginals: $p_X(x) = \\sum_y p_{X,Y}(x, y)$, $p_Y(y) = \\sum_x p_{X,Y}(x, y)$.
- Independence: $X \\perp Y \\iff p_{X,Y}(x, y) = p_X(x) p_Y(y)$ for ALL $x, y$.
- Conditional PMF: $p_{X|Y}(x \\mid y) = \\frac{p_{X,Y}(x, y)}{p_Y(y)}$.
"""
    },
    {
        "id": "topic-4",
        "number": 4,
        "title": "Topic 4: Expectation & LOTUS",
        "summary": "Mathematical expectation, absolute convergence requirement, linearity, and LOTUS.",
        "content": """### Expectation Formulas
- Discrete: $E[X] = \\sum x p_X(x)$ (if $\\sum |x|p_X(x) < \\infty$).
- Continuous: $E[X] = \\int_{-\\infty}^\\infty x f_X(x) dx$ (if $\\int |x|f_X(x)dx < \\infty$).
- LOTUS: $E[g(X)] = \\sum g(x)p_X(x)$ or $\\int_{-\\infty}^\\infty g(x)f_X(x)dx$.
- Linearity: $E[aX + bY + c] = aE[X] + bE[Y] + c$ (always valid, no independence needed).
- Tail Sum: For non-negative integer RV: $E[X] = \\sum_{k=1}^\\infty P(X \\ge k)$.
"""
    },
    {
        "id": "topic-5",
        "number": 5,
        "title": "Topic 5: Variance, Moments, Covariance & Correlation",
        "summary": "Variance properties, bilinear covariance, Cauchy-Schwarz bound, and uncorrelated vs independent.",
        "content": """### Key Properties
- $\\text{Var}(X) = E[X^2] - (E[X])^2$.
- $\\text{Var}(aX + b) = a^2 \\text{Var}(X)$.
- $\\text{Var}(X + Y) = \\text{Var}(X) + \\text{Var}(Y) + 2\\text{Cov}(X, Y)$.
- $\\text{Cov}(X, Y) = E[XY] - E[X]E[Y]$.
- $\\rho(X, Y) = \\frac{\\text{Cov}(X, Y)}{\\sigma_X \\sigma_Y} \\in [-1, 1]$.
- $|\\rho| = 1 \\iff Y = aX + b$ a.s.
- $\\text{Cov}(X, Y) = 0$ does NOT imply independence!
"""
    },
    {
        "id": "topic-6",
        "number": 6,
        "title": "Topic 6: Probability Generating Functions (PGF)",
        "summary": "Definition, radius of convergence, factorial moments, and sums of independent variables.",
        "content": """### PGF Toolbox
- Definition: $G_X(s) = E[s^X] = \\sum_{k=0}^\\infty p_X(k) s^k$ for $|s| \\le 1$.
- Normalization: $G_X(1) = 1$.
- Probability recovery: $p_X(k) = \\frac{G_X^{(k)}(0)}{k!}$.
- Moments: $G'(1) = E[X]$, $G''(1) = E[X(X-1)]$.
- Variance: $\\text{Var}(X) = G''(1) + G'(1) - (G'(1))^2$.
- Independent sum: $G_{X+Y}(s) = G_X(s) G_Y(s)$.
"""
    },
    {
        "id": "topic-7",
        "number": 7,
        "title": "Topic 7: Continuous Random Variables & PDF",
        "summary": "Absolute continuity, density properties, Fundamental Theorem of Calculus, zero point probability.",
        "content": """### Continuous RV Essentials
- $F_X(x) = \\int_{-\\infty}^x f_X(t) dt$.
- $f_X(x) \\ge 0$, $\\int_{-\\infty}^\\infty f_X(x) dx = 1$.
- $P(X = c) = 0$ for any singleton $c$.
- $f_X(x) = F_X'(x)$ at continuity points.
- $f_X(x)$ can exceed 1 (it is a density, not probability!).
"""
    },
    {
        "id": "topic-8",
        "number": 8,
        "title": "Topic 8: Standard Continuous Distributions",
        "summary": "Uniform, Exponential with memorylessness, Normal and standard normal Phi table.",
        "content": """### Uniform $U(a, b)$
$f(x) = \\frac{1}{b-a}$, $E[X] = \\frac{a+b}{2}$, $\\text{Var}(X) = \\frac{(b-a)^2}{12}$.

### Exponential $E(\\lambda)$
$f(x) = \\lambda e^{-\\lambda x}$ ($x \\ge 0$). Survival $P(X > t) = e^{-\\lambda t}$. $E[X] = 1/\\lambda$, $\\text{Var}(X) = 1/\\lambda^2$. Memoryless!

### Normal $N(\\mu, \\sigma^2)$
$f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-(x-\\mu)^2/(2\\sigma^2)}$. $Z = (X-\\mu)/\\sigma \\sim N(0, 1)$. Affine: $aX + b \\sim N(a\\mu+b, a^2\\sigma^2)$.
"""
    },
    {
        "id": "topic-9",
        "number": 9,
        "title": "Topic 9: Transformations of Random Variables",
        "summary": "1D CDF method, monotonic transformation formula, and non-monotonic branch splitting.",
        "content": """### Transformation Methods
1. **CDF Method**: $F_Y(y) = P(g(X) \\le y)$. Differentiate: $f_Y(y) = F_Y'(y)$.
2. **Formula (Monotonic $g$)**:
$$f_Y(y) = f_X(g^{-1}(y)) \\left| \\frac{d}{dy} g^{-1}(y) \\right| = \\frac{f_X(x)}{|g'(x)|}$$
3. For $Y = X^2$: $F_Y(y) = F_X(\\sqrt{y}) - F_X(-\\sqrt{y}) \\implies f_Y(y) = \\frac{f_X(\\sqrt{y}) + f_X(-\\sqrt{y})}{2\\sqrt{y}}$.
"""
    },
    {
        "id": "topic-10",
        "number": 10,
        "title": "Topic 10: Joint Continuous Distributions & 2D Transformations",
        "summary": "Joint density, double integrals, marginal densities, conditional densities, and Jacobian determinant.",
        "content": """### 2D Toolbox
- Total probability: $\\iint f_{X,Y}(x, y) dx dy = 1$.
- Marginals: $f_X(x) = \\int_{-\\infty}^\\infty f_{X,Y}(x, y) dy$.
- Conditional: $f_{X|Y}(x \\mid y) = \\frac{f_{X,Y}(x, y)}{f_Y(y)}$.
- 2D Jacobian transformation: $f_{U,V}(u, v) = f_{X,Y}(x(u,v), y(u,v)) |J|$.
"""
    },
    {
        "id": "topic-11",
        "number": 11,
        "title": "Topic 11: Moment Generating Functions (MGF)",
        "summary": "Definition, connection to raw moments, independent products, and uniqueness theorem.",
        "content": """### MGF Essentials
- Definition: $M_X(t) = E[e^{tX}]$.
- $M_X(0) = 1$.
- Moments: $M_X^{(k)}(0) = E[X^k]$.
- Affine: $M_{aX+b}(t) = e^{bt} M_X(at)$.
- Independent sum: $M_{X+Y}(t) = M_X(t) M_Y(t)$.
- Uniqueness: MGF uniquely determines the distribution.
"""
    },
    {
        "id": "topic-12",
        "number": 12,
        "title": "Topic 12: Advanced Topics (Poisson Thinning, Gambler's Ruin, Order Statistics)",
        "summary": "Poisson thinning theorem, difference equations for gambler's ruin, min/max of i.i.d. variables, and Laplace convolution.",
        "content": """### Advanced Gems
- **Poisson Thinning**: $N \\sim P(\\lambda)$, Bernoulli trial $p \\implies S \\sim P(\\lambda p)$ and $N-S \\sim P(\\lambda(1-p))$ independent!
- **Order Statistics**:
  - Max: $F_M(x) = (F(x))^n$.
  - Min: $F_N(x) = 1 - (1 - F(x))^n$.
- **Gambler's Ruin**: $p_k = p p_{k+1} + q p_{k-1} \\implies p_k = \\frac{1 - (q/p)^k}{1 - (q/p)^{a+b}}$.
"""
    }
]

print("Distributions:", len(DISTRIBUTIONS_DATA))
print("Quiz Questions:", len(QUIZ_QUESTIONS))
print("Topics:", len(TOPICS_NOTES))
