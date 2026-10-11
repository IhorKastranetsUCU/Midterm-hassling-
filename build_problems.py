#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build complete problems bank (42 problems: Seminar 4-6, Colloquium New, Midterm 2017).
"""

PROBLEMS_BANK = [
    # --- SEMINAR 4: Discrete RVs ---
    {
        "id": 1,
        "title": "Problem 1: Ranked Examination Scores",
        "source": "Colloquium II / Seminar 4",
        "topic": "Discrete RVs & Joint PMF",
        "difficulty": "Medium",
        "statement": "Five men and five women are ranked according to their scores on an examination. Assume that no two scores are alike and all $10!$ possible rankings are equally likely. Let $X$ denote the highest ranking achieved by a woman (1 is top rank) and let $Y$ denote their lowest ranking.\n\n(a) Find the probability mass function of $X$.\n(b) Find the probability mass function of $Y$.\n(c) Find the joint probability mass function of $X$ and $Y$.\n(d) Are $X$ and $Y$ independent?",
        "hints": [
            "Hint 1: If the highest ranked woman has rank k, then the top k-1 positions must all be men, position k is a woman, and the remaining 4 women are chosen from the remaining 10-k positions.",
            "Hint 2: Total number of ways to choose 5 ranks for 5 women out of 10 positions is $\\binom{10}{5} = 252$."
        ],
        "solution": "**(a) PMF of $X$ (highest ranking achieved by a woman):**\nThe highest rank $X$ can be $k \\in \\{1, 2, 3, 4, 5, 6\\}$ (since there are 5 men, all 5 men could take ranks 1 to 5, so $X$ could be 6 at most).\nFor $X = k$, position $k$ is occupied by a woman, positions $1, \\dots, k-1$ must be occupied by men, and the remaining $4$ women can be placed in any of the remaining $10 - k$ positions.\nTotal ways to choose the 5 ranks for the 5 women is $\\binom{10}{5} = 252$.\nTherefore:\n$$p_X(k) = P(X = k) = \\frac{\\binom{10-k}{4}}{\\binom{10}{5}}, \\quad k \\in \\{1, 2, 3, 4, 5, 6\\}$$\nExplicit values:\n- $P(X = 1) = \\frac{\\binom{9}{4}}{252} = \\frac{126}{252} = \\frac{1}{2}$\n- $P(X = 2) = \\frac{\\binom{8}{4}}{252} = \\frac{70}{252} = \\frac{5}{18}$\n- $P(X = 3) = \\frac{\\binom{7}{4}}{252} = \\frac{35}{252} = \\frac{5}{36}$\n- $P(X = 4) = \\frac{\\binom{6}{4}}{252} = \\frac{15}{252} = \\frac{5}{84}$\n- $P(X = 5) = \\frac{\\binom{5}{4}}{252} = \\frac{5}{252}$\n- $P(X = 6) = \\frac{\\binom{4}{4}}{252} = \\frac{1}{252}$\n\n**(b) PMF of $Y$ (lowest ranking achieved by a woman):**\nBy symmetry from the bottom (ranks 10 down to 5):\n$$p_Y(j) = P(Y = j) = \\frac{\\binom{j-1}{4}}{\\binom{10}{5}}, \\quad j \\in \\{5, 6, 7, 8, 9, 10\\}$$\n\n**(c) Joint PMF of $(X, Y)$:**\nFor $X = x$ and $Y = y$, we must have $y - x \\ge 4$ (at least 3 other women between them). Rank $x$ is a woman, rank $y$ is a woman, and the remaining 3 women must be placed strictly between them among the $y - x - 1$ available spots:\n$$p_{X,Y}(x, y) = P(X = x, Y = y) = \\frac{\\binom{y - x - 1}{3}}{\\binom{10}{5}}, \\quad 1 \\le x < y \\le 10, \\; y - x \\ge 4$$\n\n**(d) Independence:**\nClearly $X$ and $Y$ are **not independent** because $P(X = 6, Y = 6) = 0 \\ne P(X = 6) P(Y = 6) > 0$."
    },
    {
        "id": 2,
        "title": "Problem 2: Extreme Values of Two Dice Rolls",
        "source": "Colloquium II / Seminar 4",
        "topic": "Discrete RVs & Order Statistics",
        "difficulty": "Easy",
        "statement": "Suppose that a fair die is rolled twice. What is the probability mass function of the following random variables:\n(a) $X = \\max(D_1, D_2)$ (the maximum value to appear);\n(b) $Y = \\min(D_1, D_2)$ (the minimum value to appear);\n(c) $Z = D_1 + D_2$;\n(d) $W = |D_1 - D_2|$.",
        "hints": [
            "Hint 1: For the maximum, use the CDF method: $P(X \\le k) = P(D_1 \\le k, D_2 \\le k) = P(D_1 \\le k) P(D_2 \\le k) = (k/6)^2$.",
            "Hint 2: Then $P(X = k) = P(X \\le k) - P(X \\le k-1) = \\frac{k^2 - (k-1)^2}{36} = \\frac{2k-1}{36}$."
        ],
        "solution": "**(a) Maximum $X = \\max(D_1, D_2)$:**\nUsing the CDF trick:\n$$P(X \\le k) = P(D_1 \\le k \\text{ and } D_2 \\le k) = \\left(\\frac{k}{6}\\right)^2 = \\frac{k^2}{36}$$\nThen:\n$$p_X(k) = P(X \\le k) - P(X \\le k-1) = \\frac{k^2 - (k-1)^2}{36} = \\frac{2k - 1}{36}, \\quad k \\in \\{1, 2, 3, 4, 5, 6\\}$$\nExplicitly: $1/36, 3/36, 5/36, 7/36, 9/36, 11/36$. Sum $= 36/36 = 1$.\n\n**(b) Minimum $Y = \\min(D_1, D_2)$:**\nTail CDF trick: $P(Y \\ge k) = P(D_1 \\ge k, D_2 \\ge k) = \\left(\\frac{7-k}{6}\\right)^2$.\nThen:\n$$p_Y(k) = P(Y \\ge k) - P(Y \\ge k+1) = \\frac{(7-k)^2 - (6-k)^2}{36} = \\frac{13 - 2k}{36}, \\quad k \\in \\{1, 2, 3, 4, 5, 6\\}$$\nExplicitly: $11/36, 9/36, 7/36, 5/36, 3/36, 1/36$.\n\n**(c) Sum $Z = D_1 + D_2$:**\n$k \\in \\{2, 3, \\dots, 12\\}$.\n$$p_Z(k) = \\frac{6 - |k - 7|}{36}$$\n\n**(d) Absolute Difference $W = |D_1 - D_2|$:**\n- $W = 0$: 6 outcomes $(i, i) \\implies 6/36$.\n- $W = k$ for $k \\in \\{1, 2, 3, 4, 5\\}$: $2(6 - k)/36$ outcomes."
    },
    {
        "id": 3,
        "title": "Problem 3: Binary Channel with Repetition Code",
        "source": "Colloquium II / Seminar 4",
        "topic": "Binomial Distribution",
        "difficulty": "Easy",
        "statement": "A communications channel transmits digits 0 and 1. Due to noise, each transmitted digit is received incorrectly with probability $p = 0.2$, independently across digits. To reduce errors, each digit is transmitted 3 times and decoded by majority rule.\n(a) What is the probability that a digit is decoded incorrectly?\n(b) If instead each digit is transmitted 5 times and decoded by majority rule, what is the new error probability?",
        "hints": [
            "Hint: For 3 transmissions, majority rule fails if 2 or 3 transmissions are received in error.",
            "Hint: Let X be the number of transmission errors. Then $X \\sim B(n, p)$."
        ],
        "solution": "**(a) 3 Transmissions:**\nLet $X \\sim B(3, 0.2)$ be the number of erroneous transmissions. Majority vote decides incorrectly if $X \\ge 2$:\n$$P(\\text{Error}) = P(X = 2) + P(X = 3) = \\binom{3}{2}(0.2)^2(0.8) + \\binom{3}{3}(0.2)^3$$\n$$= 3 \\cdot (0.04) \\cdot (0.8) + 1 \\cdot 0.008 = 0.096 + 0.008 = 0.104$$\nError rate dropped from $0.20$ to $0.104$!\n\n**(b) 5 Transmissions:**\nLet $Y \\sim B(5, 0.2)$. Majority vote fails if $Y \\ge 3$:\n$$P(Y \\ge 3) = \\binom{5}{3}(0.2)^3(0.8)^2 + \\binom{5}{4}(0.2)^4(0.8) + \\binom{5}{5}(0.2)^5$$\n$$= 10(0.008)(0.64) + 5(0.0016)(0.8) + 0.00032 = 0.0512 + 0.0064 + 0.00032 = 0.05792$$\nError rate drops further to $\\approx 5.8\\%$."
    },
    {
        "id": 6,
        "title": "Problem 6: Poisson COVID-19 Testing",
        "source": "Colloquium II / Seminar 4",
        "topic": "Poisson Distribution",
        "difficulty": "Easy",
        "statement": "Suppose the number of new positive COVID-19 cases detected in a university dormitory on any given day follows a Poisson distribution with parameter $\\lambda = 2$.\n(a) Find the probability that no new cases are detected today.\n(b) Find the probability that at least 2 new cases are detected.\n(c) Given that at least one case is detected, what is the conditional probability that exactly 3 cases are detected?",
        "hints": [
            "Hint 1: P(X = 0) = e^{-λ}.",
            "Hint 2: P(X >= 2) = 1 - P(X = 0) - P(X = 1)."
        ],
        "solution": "Let $X \\sim P(2)$ with $p_X(k) = \\frac{2^k e^{-2}}{k!}$.\n\n**(a) No cases:**\n$$P(X = 0) = \\frac{2^0 e^{-2}}{0!} = e^{-2} \\approx 0.1353$$\n\n**(b) At least 2 cases:**\n$$P(X \\ge 2) = 1 - P(X = 0) - P(X = 1) = 1 - e^{-2} - 2e^{-2} = 1 - 3e^{-2} \\approx 1 - 0.4060 = 0.5940$$\n\n**(c) Conditional probability:**\n$$P(X = 3 \\mid X \\ge 1) = \\frac{P(X = 3)}{P(X \\ge 1)} = \\frac{\\frac{2^3 e^{-2}}{3!}}{1 - e^{-2}} = \\frac{\\frac{8}{6}e^{-2}}{1 - e^{-2}} = \\frac{4 e^{-2}}{3(1 - e^{-2})} \\approx 0.2087$$"
    },
    {
        "id": 7,
        "title": "Problem 7: Coin Tosses & First Head Position",
        "source": "Colloquium II / Seminar 4",
        "topic": "Joint PMF & Independence",
        "difficulty": "Medium",
        "statement": "A fair coin is tossed 3 times. Let $X$ denote the total number of Heads, and let $Y$ denote the position of the first Head (with $Y = 0$ if no Heads appear).\n(a) Find the joint probability mass function of $(X, Y)$ and display it as a contingency table.\n(b) Find the marginal distributions of $X$ and $Y$.\n(c) Are $X$ and $Y$ independent?",
        "hints": [
            "Hint: The sample space has 8 equally likely outcomes: HHH, HHT, HTH, HTT, THH, THT, TTH, TTT.",
            "Hint: Notice that if X = 0, then Y MUST be 0. If X > 0, Y cannot be 0."
        ],
        "solution": "Sample space has $2^3 = 8$ outcomes, each with probability $1/8$:\n- TTT: $X = 0, Y = 0$\n- HTT: $X = 1, Y = 1$\n- THT: $X = 1, Y = 2$\n- TTH: $X = 1, Y = 3$\n- HHT: $X = 2, Y = 1$\n- HTH: $X = 2, Y = 1$\n- THH: $X = 2, Y = 2$\n- HHH: $X = 3, Y = 1$\n\n**(a) Joint PMF Table:**\n\n| $X \\backslash Y$ | $0$ | $1$ | $2$ | $3$ | **$p_X(x)$** |\n|---|---|---|---|---|---|\n| **$0$** | $1/8$ | $0$ | $0$ | $0$ | **$1/8$** |\n| **$1$** | $0$ | $1/8$ | $1/8$ | $1/8$ | **$3/8$** |\n| **$2$** | $0$ | $2/8$ | $1/8$ | $0$ | **$3/8$** |\n| **$3$** | $0$ | $1/8$ | $0$ | $0$ | **$1/8$** |\n| **$p_Y(y)$** | **$1/8$** | **$4/8$** | **$2/8$** | **$1/8$** | **$1$** |\n\n**(b) Marginals:**\n- $X \\sim B(3, 1/2)$: $p_X(0) = 1/8, p_X(1) = 3/8, p_X(2) = 3/8, p_X(3) = 1/8$.\n- $p_Y(0) = 1/8, p_Y(1) = 1/2, p_Y(2) = 1/4, p_Y(3) = 1/8$.\n\n**(c) Independence:**\n$X$ and $Y$ are **NOT independent**.\nProof: $P(X = 0, Y = 1) = 0$, but $P(X = 0) P(Y = 1) = \\frac{1}{8} \\times \\frac{1}{2} = \\frac{1}{16} \\ne 0$."
    },

    # --- SEMINAR 5: Expectation, Variance, Moments, Covariance, PGF ---
    {
        "id": 9,
        "title": "Problem 9: Algebra of Expectations and Variances",
        "source": "Colloquium II / Seminar 5",
        "topic": "Expectation & Variance",
        "difficulty": "Easy",
        "statement": "If $E[X] = 1, E[Y] = -1, \\text{Var}(X) = 4$, and $\\text{Var}(Y) = 3$, find:\n(a) $E[(X - 1) \\ln 2]$;\n(b) $E[3X^2 - 5X]$;\n(c) $E[(-4 - Y)Y]$.",
        "hints": [
            "Hint 1: Use linearity of expectation: E[aX + b] = aE[X] + b.",
            "Hint 2: Recall Var(X) = E[X²] - (E[X])² => E[X²] = Var(X) + (E[X])²."
        ],
        "solution": "**(a) $E[(X - 1) \\ln 2]$:**\n$$E[(X - 1) \\ln 2] = (\\ln 2) (E[X] - 1) = (\\ln 2)(1 - 1) = 0$$\n\n**(b) $E[3X^2 - 5X]$:**\nFirst compute $E[X^2]$:\n$$E[X^2] = \\text{Var}(X) + (E[X])^2 = 4 + 1^2 = 5$$\nThen:\n$$E[3X^2 - 5X] = 3E[X^2] - 5E[X] = 3(5) - 5(1) = 15 - 5 = 10$$\n\n**(c) $E[(-4 - Y)Y]$:**\n$$E[-4Y - Y^2] = -4E[Y] - E[Y^2]$$\nWe have $E[Y^2] = \\text{Var}(Y) + (E[Y])^2 = 3 + (-1)^2 = 4$.\nThus:\n$$-4(-1) - 4 = 4 - 4 = 0$$"
    },
    {
        "id": 12,
        "title": "Problem 12: Waiting for Consecutive Heads (HH)",
        "source": "Colloquium II / Seminar 5",
        "topic": "Expectation via Conditioning",
        "difficulty": "Hard",
        "statement": "A fair coin is tossed repeatedly and independently until two consecutive heads (HH) appear. Let $T$ be the total number of tosses made. Find $E[T]$.",
        "hints": [
            "Hint 1: Condition on the outcome of the first toss, and if it is H, condition on the second toss.",
            "Hint 2: Let e = E[T]. If first toss is T (prob 1/2), you wasted 1 toss and restart: expected remaining is e. If first is H and second is T (prob 1/4), you wasted 2 tosses and restart: 2 + e. If first is H and second is H (prob 1/4), you finish in 2 tosses!"
        ],
        "solution": "Let $e = E[T]$. We condition on the first few tosses:\n- Case 1 (First toss is Tails, prob $1/2$): 1 toss is spent, and we are back to the start. Expected remaining tosses: $e$. Total: $1 + e$.\n- Case 2 (First toss is Heads, second is Tails, prob $1/4$): 2 tosses spent, back to start. Expected remaining tosses: $e$. Total: $2 + e$.\n- Case 3 (First two tosses are Heads, prob $1/4$): Process terminates in exactly 2 tosses!\n\nBy the Law of Total Expectation:\n$$e = \\frac{1}{2}(1 + e) + \\frac{1}{4}(2 + e) + \\frac{1}{4}(2)$$\n$$e = \\frac{1}{2} + \\frac{1}{2}e + \\frac{1}{2} + \\frac{1}{4}e + \\frac{1}{2}$$\n$$e = \\frac{3}{2} + \\frac{3}{4}e$$\n$$e \\left(1 - \\frac{3}{4}\\right) = \\frac{3}{2} \\implies \\frac{1}{4}e = \\frac{3}{2} \\implies e = 6$$\n\nThus, the expected number of tosses to see HH is **$6$**."
    },
    {
        "id": 14,
        "title": "Problem 14: Geometric Tail Sum Formula",
        "source": "Colloquium II / Seminar 5",
        "topic": "Geometric Distribution & Tail Sum",
        "difficulty": "Medium",
        "statement": "Assume that $X \\sim G(p)$ with $p \\in (0, 1)$.\n(a) Show that $P(X \\ge k) = (1-p)^{k-1}$ for $k \\in \\{1, 2, \\dots\\}$.\n(b) Using the tail sum formula $E[X] = \\sum_{k=1}^\\infty P(X \\ge k)$, prove that $E[X] = 1/p$.\n(c) Verify the memoryless property: $P(X > m + n \\mid X > m) = P(X > n)$.",
        "hints": [
            "Hint: P(X >= k) means the first k-1 trials were all failures.",
            "Hint: Use sum of infinite geometric series sum_{j=0}^∞ q^j = 1/(1-q) where q = 1-p."
        ],
        "solution": "**(a) Tail probability:**\n$X \\ge k$ occurs if and only if the first $k-1$ trials were all failures (Tails). Since trials are independent with failure probability $1-p$:\n$$P(X \\ge k) = (1-p)^{k-1}, \\quad k \\in \\{1, 2, 3, \\dots\\}$$\n\n**(b) Tail Sum Formula:**\nFor non-negative integer RVs:\n$$E[X] = \\sum_{k=1}^\\infty P(X \\ge k) = \\sum_{k=1}^\\infty (1-p)^{k-1}$$\nLet $j = k-1$. As $k$ runs from $1$ to $\\infty$, $j$ runs from $0$ to $\\infty$:\n$$E[X] = \\sum_{j=0}^\\infty (1-p)^j = \\frac{1}{1 - (1-p)} = \\frac{1}{p}$$\nQ.E.D.\n\n**(c) Memoryless Property:**\n$$P(X > m + n \\mid X > m) = \\frac{P(X > m + n)}{P(X > m)}$$\nSince $P(X > t) = P(X \\ge t+1) = (1-p)^t$:\n$$= \\frac{(1-p)^{m+n}}{(1-p)^m} = (1-p)^n = P(X > n)$$\nQ.E.D."
    },
    {
        "id": 18,
        "title": "Problem 18: Joint Contingency Table, Marginals & Covariance",
        "source": "Colloquium II / Seminar 5",
        "topic": "Covariance & Correlation",
        "difficulty": "Medium",
        "statement": "Assume $X$ and $Y$ have joint probability mass function given by the table:\n\n| $X \\backslash Y$ | $-1$ | $0$ | $1$ |\n|---|---|---|---|\n| $-1$ | $1/12$ | $1/6$ | $1/12$ |\n| $0$ | $1/6$ | $0$ | $1/6$ |\n| $1$ | $1/12$ | $1/6$ | $1/12$ |\n\n(a) Find the marginal distributions of $X$ and $Y$.\n(b) Find $E[X], E[Y]$, and $\\text{Cov}(X, Y)$.\n(c) Are $X$ and $Y$ independent?",
        "hints": [
            "Hint 1: Sum rows for p_X(x) and columns for p_Y(y). Notice symmetry around 0.",
            "Hint 2: Since X and Y are symmetric around 0, E[X] = 0 and E[Y] = 0."
        ],
        "solution": "**(a) Marginal Distributions:**\nSumming each row:\n- $p_X(-1) = 1/12 + 1/6 + 1/12 = 1/3$\n- $p_X(0) = 1/6 + 0 + 1/6 = 1/3$\n- $p_X(1) = 1/12 + 1/6 + 1/12 = 1/3$\nSo $X$ is uniformly distributed on $\\{-1, 0, 1\\}$.\nBy symmetry, $Y$ has the identical marginal: $p_Y(-1) = 1/3, p_Y(0) = 1/3, p_Y(1) = 1/3$.\n\n**(b) Expectations and Covariance:**\n- $E[X] = (-1)(1/3) + 0(1/3) + 1(1/3) = 0$.\n- $E[Y] = 0$.\n- For $E[XY]$:\n  - Points with $x=0$ or $y=0$ give $xy = 0$.\n  - $(-1, -1) \\implies xy = 1$ with prob $1/12$\n  - $(-1, 1) \\implies xy = -1$ with prob $1/12$\n  - $(1, -1) \\implies xy = -1$ with prob $1/12$\n  - $(1, 1) \\implies xy = 1$ with prob $1/12$\n  $$E[XY] = 1(1/12) + (-1)(1/12) + (-1)(1/12) + 1(1/12) = 0$$\nTherefore:\n$$\\text{Cov}(X, Y) = E[XY] - E[X]E[Y] = 0 - 0 = 0$$\n\n**(c) Independence:**\nAre $X$ and $Y$ independent?\nCheck $(X=0, Y=0)$:\n$$P(X = 0, Y = 0) = 0$$\nHowever:\n$$P(X = 0) P(Y = 0) = \\frac{1}{3} \\times \\frac{1}{3} = \\frac{1}{9} \\ne 0$$\nTherefore, $X$ and $Y$ are **NOT independent**, even though $\\text{Cov}(X, Y) = 0$! (Classic colloquium trap!)."
    },

    # --- SEMINAR 6: Continuous RVs & Transformations ---
    {
        "id": 19,
        "title": "Problem 19: Linear & Quadratic Transformations of Normal RV",
        "source": "Colloquium II / Seminar 6",
        "topic": "Continuous RVs & Transformations",
        "difficulty": "Medium",
        "statement": "Assume that $Z \\sim N(0, 1)$. Find the probability density function of:\n(a) $Y_1 = -Z$;\n(b) $Y_2 = 2Z - 3$;\n(c) $Y_3 = Z^2$.",
        "hints": [
            "Hint 1: For (a) and (b), use the affine normal transformation rule: aZ + b ~ N(b, a²).",
            "Hint 2: For (c), use the CDF method: F_{Y_3}(y) = P(Z² <= y) = P(-√y <= Z <= √y) for y > 0."
        ],
        "solution": "**(a) $Y_1 = -Z$:**\nBy symmetry of standard normal, $-Z \\sim N(0, 1)$.\nDensity:\n$$f_{Y_1}(y) = \\frac{1}{\\sqrt{2\\pi}} e^{-y^2/2}, \\quad y \\in \\mathbb{R}$$\n\n**(b) $Y_2 = 2Z - 3$:**\nHere $Y_2$ is an affine transformation with $a = 2, b = -3$.\nMean $\\mu = 2(0) - 3 = -3$, variance $\\sigma^2 = 2^2(1) = 4$.\nThus $Y_2 \\sim N(-3, 4)$:\n$$f_{Y_2}(y) = \\frac{1}{2\\sqrt{2\\pi}} \\exp\\left( -\\frac{(y + 3)^2}{8} \\right), \\quad y \\in \\mathbb{R}$$\n\n**(c) $Y_3 = Z^2$:**\nFor $y \\le 0$, $F_{Y_3}(y) = 0$.\nFor $y > 0$:\n$$F_{Y_3}(y) = P(Z^2 \\le y) = P(-\\sqrt{y} \\le Z \\le \\sqrt{y}) = \\Phi(\\sqrt{y}) - \\Phi(-\\sqrt{y}) = 2\\Phi(\\sqrt{y}) - 1$$\nDifferentiating with respect to $y$ via chain rule:\n$$f_{Y_3}(y) = \\frac{d}{dy} [2\\Phi(\\sqrt{y}) - 1] = 2 \\phi(\\sqrt{y}) \\cdot \\frac{1}{2\\sqrt{y}} = \\frac{\\phi(\\sqrt{y})}{\\sqrt{y}}$$\nSubstituting $\\phi(u) = \\frac{1}{\\sqrt{2\\pi}} e^{-u^2/2}$:\n$$f_{Y_3}(y) = \\frac{1}{\\sqrt{2\\pi y}} e^{-y/2}, \\quad y > 0$$\nThis is the **Chi-squared distribution with 1 degree of freedom** ($\\chi^1_2$ or $\\text{Gamma}(1/2, 1/2)$)!"
    },
    {
        "id": 20,
        "title": "Problem 20: Extremes of i.i.d. Uniform Variables",
        "source": "Colloquium II / Seminar 6",
        "topic": "Continuous Order Statistics",
        "difficulty": "Medium",
        "statement": "Assume that $X_1, X_2, \\dots, X_n$ are independent random variables with uniform distribution $U(0, a)$. Find the distribution (c.d.f. and p.d.f.) of:\n(a) $M = \\max(X_1, \\dots, X_n)$;\n(b) $N = \\min(X_1, \\dots, X_n)$.",
        "hints": [
            "Hint 1: P(M <= x) = P(all X_i <= x) = (F(x))^n.",
            "Hint 2: P(N > x) = P(all X_i > x) = (1 - F(x))^n."
        ],
        "solution": "For each $X_i \\sim U(0, a)$, the CDF is $F(x) = \\frac{x}{a}$ for $x \\in [0, a]$.\n\n**(a) Maximum $M = \\max(X_1, \\dots, X_n)$:**\n$$F_M(x) = P(M \\le x) = P(X_1 \\le x, \\dots, X_n \\le x) = \\prod_{i=1}^n P(X_i \\le x) = \\left(\\frac{x}{a}\\right)^n, \\quad x \\in [0, a]$$\nTaking the derivative:\n$$f_M(x) = F_M'(x) = \\frac{n x^{n-1}}{a^n}, \\quad x \\in [0, a]$$\n(and 0 elsewhere).\n\n**(b) Minimum $N = \\min(X_1, \\dots, X_n)$:**\n$$P(N > x) = P(X_1 > x, \\dots, X_n > x) = \\prod_{i=1}^n (1 - F(x)) = \\left(1 - \\frac{x}{a}\\right)^n, \\quad x \\in [0, a]$$\nThus the CDF is:\n$$F_N(x) = 1 - P(N > x) = 1 - \\left(1 - \\frac{x}{a}\\right)^n, \\quad x \\in [0, a]$$\nTaking the derivative:\n$$f_N(x) = \\frac{n}{a} \\left(1 - \\frac{x}{a}\\right)^{n-1}, \\quad x \\in [0, a]$$"
    },
    {
        "id": 23,
        "title": "Problem 23: Alice and Bob Shopping Times",
        "source": "Colloquium II / Seminar 6",
        "topic": "Exponential Distribution & Min/Max",
        "difficulty": "Hard",
        "statement": "Alice and Bob enter the grocery store simultaneously. Their shopping times are independent random variables $X$ and $Y$ with exponential distributions of mean 10 min and 15 min, respectively.\n(a) What is the probability that Alice finishes shopping before Bob?\n(b) What is the expected shopping time until the first person finishes, and the expected time that person has to wait for his/her friend?\n(c) Check that $E[M] + E[W] > 15$; is there any contradiction there?\n(d) Justify the strong memorylessness property: given that Alice is the second to finish, the difference $X - Y$ has the same distribution as $X$.",
        "hints": [
            "Hint 1: Means are 1/λ_1 = 10 (λ_1 = 1/10) and 1/λ_2 = 15 (λ_2 = 1/15).",
            "Hint 2: P(X < Y) = λ_1 / (λ_1 + λ_2).",
            "Hint 3: Min M = min(X, Y) has rate λ_1 + λ_2."
        ],
        "solution": "Here $X \\sim E(\\lambda_1)$ with $\\lambda_1 = 1/10$, and $Y \\sim E(\\lambda_2)$ with $\\lambda_2 = 1/15$.\n\n**(a) $P(X < Y)$:**\n$$P(X < Y) = \\frac{\\lambda_1}{\\lambda_1 + \\lambda_2} = \\frac{1/10}{1/10 + 1/15} = \\frac{3/30}{3/30 + 2/30} = \\frac{3}{5} = 0.6$$\n\n**(b) Expected first departure $M = \\min(X, Y)$ and wait time $W = |X - Y|$:**\n- First person finishes at $M = \\min(X, Y) \\sim E(\\lambda_1 + \\lambda_2)$ with rate $\\frac{1}{10} + \\frac{1}{15} = \\frac{5}{30} = \\frac{1}{6}$.\n  $$E[M] = \\frac{1}{1/6} = 6 \\text{ minutes}$$\n- Notice that $\\max(X, Y) + \\min(X, Y) = X + Y$, and $\\max(X, Y) - \\min(X, Y) = W = |X - Y|$.\n  Therefore: $M + W = \\max(X, Y)$.\n  Also $E[X + Y] = E[M] + E[\\max(X, Y)] = 10 + 15 = 25$.\n  So $E[\\max(X, Y)] = 25 - 6 = 19$ minutes.\n  Then $E[W] = E[\\max(X, Y)] - E[M] = 19 - 6 = 13$ minutes.\n\n**(c) Check $E[M] + E[W] = 6 + 13 = 19 > 15$:**\nThere is no contradiction because $M + W = \\max(X, Y)$, and the maximum of two independent variables is always strictly greater than either individual expectation!\n\n**(d) Strong memorylessness:**\nIf Alice finishes second ($X > Y$), conditioned on $Y = y$, by the memoryless property of the exponential distribution $X$, the remaining duration $X - y$ is independent of $y$ and has distribution $E(\\lambda_1)$, the exact same distribution as $X$!"
    },
    {
        "id": 24,
        "title": "Problem 24: Triangular Joint Density Analysis",
        "source": "Colloquium II / Seminar 6",
        "topic": "Joint Continuous & Conditional",
        "difficulty": "Medium",
        "statement": "The joint probability density function of $X$ and $Y$ is:\n$$f_{X,Y}(x, y) = \\begin{cases} a, & x, y > 0, \\; x + y < 1 \\\\ 0, & \\text{otherwise} \\end{cases}$$\n(a) Find the value of $a$.\n(b) Calculate the marginal p.d.f.'s $f_X$ and $f_Y$ and decide whether $X$ and $Y$ are independent.\n(c) Find $E[X], E[Y]$, and $\\text{Cov}(X, Y)$.\n(d) Calculate $E[XY]$.\n(e) Calculate the conditional density $f_{X|Y}(x \\mid 0.5)$.\n(f) Find the conditional expectation $E[X \\mid Y = 0.5]$.",
        "hints": [
            "Hint: The region is a right triangle with vertices (0,0), (1,0), (0,1). Area = 1/2.",
            "Hint: To integrate out y for f_X(x), y goes from 0 to 1-x."
        ],
        "solution": "**(a) Value of $a$:**\n$$\\iint_{\\mathbb{R}^2} f(x, y) dx dy = a \\cdot \\text{Area}(\\text{Triangle}) = a \\cdot \\frac{1}{2} = 1 \\implies a = 2$$\n\n**(b) Marginals & Independence:**\nFor $x \\in (0, 1)$, $y$ ranges from $0$ to $1 - x$:\n$$f_X(x) = \\int_0^{1-x} 2 dy = 2(1 - x), \\quad x \\in (0, 1)$$\nBy symmetry: $f_Y(y) = 2(1 - y)$ for $y \\in (0, 1)$.\nSince $f_{X,Y}(x, y) = 2 \\ne 4(1-x)(1-y) = f_X(x) f_Y(y)$, $X$ and $Y$ are **NOT independent**.\n\n**(c) Expectations and Covariance:**\n$$E[X] = \\int_0^1 x \\cdot 2(1 - x) dx = 2 \\left[ \\frac{x^2}{2} - \\frac{x^3}{3} \\right]_0^1 = 2\\left(\\frac{1}{6}\\right) = \\frac{1}{3}$$\nBy symmetry: $E[Y] = 1/3$.\n\n**(d) $E[XY]$:**\n$$E[XY] = \\int_0^1 x \\left( \\int_0^{1-x} 2y dy \\right) dx = \\int_0^1 x (1 - x)^2 dx = \\int_0^1 (x - 2x^2 + x^3) dx = \\frac{1}{2} - \\frac{2}{3} + \\frac{1}{4} = \\frac{1}{12}$$\nThen:\n$$\\text{Cov}(X, Y) = E[XY] - E[X]E[Y] = \\frac{1}{12} - \\left(\\frac{1}{3}\\right)^2 = \\frac{1}{12} - \\frac{1}{9} = -\\frac{1}{36}$$\nNotice the covariance is negative: as $X$ increases, $Y$ must decrease to stay inside $x + y < 1$!\n\n**(e) Conditional Density $f_{X|Y}(x \\mid 0.5)$:**\nFor $Y = 0.5$, $f_Y(0.5) = 2(1 - 0.5) = 1$. The bound is $x + 0.5 < 1 \\implies 0 < x < 0.5$.\n$$f_{X|Y}(x \\mid 0.5) = \\frac{f_{X,Y}(x, 0.5)}{f_Y(0.5)} = \\frac{2}{1} = 2, \\quad 0 < x < 0.5$$\nThis is the uniform distribution $U(0, 0.5)$!\n\n**(f) Conditional Expectation:**\n$$E[X \\mid Y = 0.5] = \\frac{0 + 0.5}{2} = 0.25$$"
    },

    # --- ADVANCED COLLOQUIUM 2022 PROBLEMS ---
    {
        "id": 25,
        "title": "Problem 25: Multinomial Dice Rolls Covariance",
        "source": "Colloquium II New Problem 1",
        "topic": "Multinomial & Covariance",
        "difficulty": "Hard",
        "statement": "A fair die is rolled $n$ times. Let $X_k$ denote the number of rolls that show face $k$, for $k = 1, \\dots, 6$.\n(a) Find $E[X_k]$ and $\\text{Var}(X_k)$;\n(b) Find the conditional distribution of $X_j$ given that $X_k = m$ ($j \\ne k$);\n(c) Find $\\text{Cov}(X_j, X_k)$ for $j \\ne k$. Predict the sign without calculations.",
        "hints": [
            "Hint 1: Each X_k is marginally Binomial B(n, 1/6).",
            "Hint 2: Given X_k = m, there are n - m rolls left, and face j has probability (1/6)/(5/6) = 1/5.",
            "Hint 3: For covariance, Var(X_j + X_k) = Var(X_j) + Var(X_k) + 2Cov(X_j, X_k), and X_j + X_k ~ B(n, 2/6 = 1/3)."
        ],
        "solution": "**(a) Marginal Mean & Variance:**\nEach roll shows face $k$ with probability $1/6$. Thus $X_k \\sim B(n, 1/6)$:\n$$E[X_k] = \\frac{n}{6}, \\quad \\text{Var}(X_k) = n \\cdot \\frac{1}{6} \\cdot \\frac{5}{6} = \\frac{5n}{36}$$\n\n**(b) Conditional Distribution:**\nGiven that $X_k = m$, exactly $m$ rolls were used up by face $k$. The remaining $n - m$ rolls can only land on the remaining 5 faces. Given that a roll is not $k$, the probability it lands on $j$ is $\\frac{1/6}{5/6} = 1/5$.\nHence:\n$$(X_j \\mid X_k = m) \\sim B\\left(n - m, \\frac{1}{5}\\right)$$\n\n**(c) Covariance $\\text{Cov}(X_j, X_k)$:**\n*Intuitive Sign*: Negative! Because a roll showing face $k$ cannot show face $j$; higher counts of $k$ compete with and restrict counts of $j$.\n*Rigorous Calculation*:\nNotice $X_j + X_k$ counts rolls showing either $j$ or $k$. Each roll has probability $2/6 = 1/3$ of being $j$ or $k$, so $X_j + X_k \\sim B(n, 1/3)$:\n$$\\text{Var}(X_j + X_k) = n \\cdot \\frac{1}{3} \\cdot \\frac{2}{3} = \\frac{2n}{9} = \\frac{8n}{36}$$\nUsing the sum of variances formula:\n$$\\text{Var}(X_j + X_k) = \\text{Var}(X_j) + \\text{Var}(X_k) + 2\\text{Cov}(X_j, X_k)$$\n$$\\frac{8n}{36} = \\frac{5n}{36} + \\frac{5n}{36} + 2\\text{Cov}(X_j, X_k) = \\frac{10n}{36} + 2\\text{Cov}(X_j, X_k)$$\n$$2\\text{Cov}(X_j, X_k) = \\frac{8n - 10n}{36} = -\\frac{2n}{36} \\implies \\text{Cov}(X_j, X_k) = -\\frac{n}{36}$$\nSince $\\text{Cov}(X_j, X_k) = -n/36 \\ne 0$, $X_j$ and $X_k$ are **dependent**."
    },
    {
        "id": 26,
        "title": "Problem 26: Poisson Thinning & Independence",
        "source": "Colloquium II New Problem 2",
        "topic": "Poisson Thinning & Conditioning",
        "difficulty": "Hard",
        "statement": "Assume that $X \\sim P(\\lambda)$ and that, conditioned on $\\{X = k\\}$, $Y \\sim B(k, p)$.\n(a) Find the marginal distribution of $Y$;\n(b) Find the distribution of $X - Y$ and prove that $Y$ and $X - Y$ are independent;\n(c) Find the conditional distribution of $X$ given $\\{Y = n\\}$.",
        "hints": [
            "Hint 1: Law of total probability: P(Y = j) = sum_{k=j}^∞ P(Y = j | X = k) P(X = k).",
            "Hint 2: Compute joint probability P(Y = j, X - Y = m) by setting k = j + m."
        ],
        "solution": "**(a) Marginal Distribution of $Y$:**\n$$P(Y = j) = \\sum_{k=j}^\\infty P(Y = j \\mid X = k) P(X = k) = \\sum_{k=j}^\\infty \\binom{k}{j} p^j (1-p)^{k-j} \\frac{\\lambda^k e^{-\\lambda}}{k!}$$\nSubstitute $\\binom{k}{j} = \\frac{k!}{j!(k-j)!}$:\n$$= \\frac{p^j e^{-\\lambda}}{j!} \\sum_{k=j}^\\infty \\frac{(1-p)^{k-j} \\lambda^k}{(k-j)!}$$\nLet $m = k - j$:\n$$= \\frac{(\\lambda p)^j e^{-\\lambda}}{j!} \\sum_{m=0}^\\infty \\frac{(\\lambda(1-p))^m}{m!} = \\frac{(\\lambda p)^j e^{-\\lambda}}{j!} e^{\\lambda(1-p)} = \\frac{(\\lambda p)^j e^{-\\lambda p}}{j!}$$\nThis proves that **$Y \\sim P(\\lambda p)$**!\n\n**(b) Distribution of $X - Y$ and Independence:**\nLet $Y = j$ and $X - Y = m$. Then $X = j + m$:\n$$P(Y = j, X - Y = m) = P(X = j + m, Y = j) = P(X = j + m) P(Y = j \\mid X = j + m)$$\n$$= \\frac{\\lambda^{j+m} e^{-\\lambda}}{(j+m)!} \\binom{j+m}{j} p^j (1-p)^m = \\frac{\\lambda^{j+m} e^{-\\lambda}}{(j+m)!} \\frac{(j+m)!}{j! m!} p^j (1-p)^m$$\n$$= \\left( \\frac{(\\lambda p)^j e^{-\\lambda p}}{j!} \\right) \\left( \\frac{(\\lambda(1-p))^m e^{-\\lambda(1-p)}}{m!} \\right) = P(Y = j) \\cdot P(X - Y = m)$$\nThis proves simultaneously that:\n1. **$X - Y \\sim P(\\lambda(1-p))$**.\n2. **$Y$ and $X - Y$ are completely INDEPENDENT!** (The famous Poisson Thinning Theorem).\n\n**(c) Conditional Distribution of $X$ given $Y = n$:**\nSince $X = Y + (X - Y)$ and $X - Y$ is independent of $Y$:\n$$P(X = k \\mid Y = n) = P(X - Y = k - n \\mid Y = n) = P(X - Y = k - n) = \\frac{(\\lambda(1-p))^{k-n} e^{-\\lambda(1-p)}}{(k-n)!}$$\nSo conditioned on $Y=n$, $X - n \\sim P(\\lambda(1-p))$."
    },
    {
        "id": 28,
        "title": "Problem 28: Gambler's Ruin with Coins",
        "source": "Colloquium II New Problem 4",
        "topic": "Difference Equations & Ruin Probability",
        "difficulty": "Hard",
        "statement": "Alice and Bob have $a$ and $b$ gold coins, respectively. They play a series of independent games where the loser gives a gold coin to the winner. They stop when one of them has no coins left. Alice wins each individual game with probability $p \\ne 1/2$ (and Bob with $q = 1-p$).\n(a) Find the probability that Alice wins the entire match (takes all coins);\n(b) Find the expected number of games played.",
        "hints": [
            "Hint 1: Let p_k be the probability Alice wins when she has k coins. Condition on the first game: p_k = p * p_{k+1} + q * p_{k-1}.",
            "Hint 2: Boundary conditions: p_0 = 0 and p_{a+b} = 1."
        ],
        "solution": "Let $N = a + b$ be the total coins in circulation. Let $p_k$ be Alice's probability of winning starting with $k$ coins ($0 \\le k \\le N$).\n\n**(a) Alice's Winning Probability:**\nConditioning on the first game:\n$$p_k = p \\cdot p_{k+1} + q \\cdot p_{k-1}$$\nRearranging using $p + q = 1$:\n$$p(p_{k+1} - p_k) = q(p_k - p_{k-1}) \\implies p_{k+1} - p_k = \\left(\\frac{q}{p}\\right) (p_k - p_{k-1})$$\nThis is a geometric progression. Summing telescopes:\n$$p_k = p_1 \\sum_{j=0}^{k-1} \\left(\\frac{q}{p}\\right)^j = p_1 \\frac{1 - (q/p)^k}{1 - (q/p)}$$\nUsing the boundary condition $p_N = 1$ at $N = a + b$:\n$$1 = p_1 \\frac{1 - (q/p)^N}{1 - (q/p)} \\implies p_1 = \\frac{1 - (q/p)}{1 - (q/p)^N}$$\nThus, starting with $a$ coins:\n$$p_a = \\frac{1 - (q/p)^a}{1 - (q/p)^{a+b}}$$\n\n**(b) Expected Duration $m_k$:**\nLet $m_k$ be the expected number of games starting from $k$ coins. Then:\n$$m_k = 1 + p m_{k+1} + q m_{k-1}, \\quad m_0 = 0, \\; m_N = 0$$\nFor $p \\ne 1/2$, the particular solution is $m_k = \\frac{k}{q - p}$. The homogeneous solution matches the ruin probabilities. Applying boundaries:\n$$m_a = \\frac{a}{q - p} - \\frac{a+b}{q - p} \\left( \\frac{1 - (q/p)^a}{1 - (q/p)^{a+b}} \\right)$$"
    },
    {
        "id": 32,
        "title": "Problem 32: Helicopter Rescue Distance in Circular Region",
        "source": "Colloquium II New Problem 8",
        "topic": "Geometric Probability & Continuous RVs",
        "difficulty": "Medium",
        "statement": "A field hospital is located at the center of a circle of radius $R = 100$ km. An accident occurs at a point uniformly distributed inside this circle.\n(a) Find the distribution (c.d.f. and p.d.f.) of the flight distance $D$ to the accident point, its expected value $E[D]$, and variance $\\text{Var}(D)$;\n(b) Find the marginal distribution of the abscissa $X$ of the accident point $(X, Y)$, its expected value, and variance.",
        "hints": [
            "Hint 1: P(D <= r) is the ratio of area of circle of radius r to area of circle of radius R: (π r²) / (π R²).",
            "Hint 2: For abscissa X, integrate the constant joint density 1/(π R²) over the vertical chord at position x."
        ],
        "solution": "**(a) Distance $D$:**\nFor $r \\in [0, R]$:\n$$F_D(r) = P(D \\le r) = \\frac{\\text{Area}(\\text{Disk of radius } r)}{\\text{Area}(\\text{Disk of radius } R)} = \\frac{\\pi r^2}{\\pi R^2} = \\frac{r^2}{R^2}$$\nDifferentiating:\n$$f_D(r) = F_D'(r) = \\frac{2r}{R^2}, \\quad 0 \\le r \\le R$$\nExpectation:\n$$E[D] = \\int_0^R r \\cdot \\frac{2r}{R^2} dr = \\frac{2}{R^2} \\left[ \\frac{r^3}{3} \\right]_0^R = \\frac{2R}{3} = \\frac{200}{3} \\approx 66.67 \\text{ km}$$\nSecond moment:\n$$E[D^2] = \\int_0^R r^2 \\cdot \\frac{2r}{R^2} dr = \\frac{2}{R^2} \\left[ \\frac{r^4}{4} \\right]_0^R = \\frac{R^2}{2} = \\frac{10000}{2} = 5000$$\nVariance:\n$$\\text{Var}(D) = E[D^2] - (E[D])^2 = \\frac{R^2}{2} - \\frac{4R^2}{9} = \\frac{R^2}{18} = \\frac{10000}{18} \\approx 555.56 \\text{ km}^2$$\n\n**(b) Abscissa $X$:**\nJoint density is $f(x, y) = \\frac{1}{\\pi R^2}$ on the circle $x^2 + y^2 \\le R^2$.\nFor fixed $x \\in [-R, R]$, $y$ ranges from $-\\sqrt{R^2 - x^2}$ to $\\sqrt{R^2 - x^2}$:\n$$f_X(x) = \\int_{-\\sqrt{R^2-x^2}}^{\\sqrt{R^2-x^2}} \\frac{1}{\\pi R^2} dy = \\frac{2\\sqrt{R^2 - x^2}}{\\pi R^2}, \\quad -R \\le x \\le R$$\nBy symmetry around 0: $E[X] = 0$.\nVariance: by symmetry $E[X^2] = E[Y^2]$, and $E[X^2 + Y^2] = E[D^2] = R^2/2$, so:\n$$\\text{Var}(X) = E[X^2] = \\frac{R^2}{4} = \\frac{10000}{4} = 2500 \\text{ km}^2$$"
    },
    {
        "id": 33,
        "title": "Problem 33: Traffic Light Delay (Mixed Distribution)",
        "source": "Colloquium II New Problem 9",
        "topic": "Mixed Continuous-Discrete RV",
        "difficulty": "Hard",
        "statement": "Stop lights at an intersection alternate green for 1 minute, red for 1 minute. A car arrives at a time distributed uniformly at random relative to this 2-minute cycle. Let $X$ be the delay of the car at the lights (neglecting congestion).\n(a) Find the c.d.f. $F_X(x)$ and sketch its graph;\n(b) Is $X$ discrete, continuous, or neither?\n(c) Find $E[X]$ and $\\text{Var}(X)$.",
        "hints": [
            "Hint 1: If the car arrives during the green light (prob 1/2), the delay is 0: P(X = 0) = 1/2.",
            "Hint 2: If the car arrives during red light with t minutes remaining (t in (0, 1)), the delay is t. This is uniformly distributed on (0, 1)."
        ],
        "solution": "**(a) C.D.F. $F_X(x)$:**\n- If car arrives during Green (interval of length 1 out of 2, prob $1/2$), delay $X = 0$.\n- If car arrives during Red at time $t$ before green (uniformly distributed on $(0, 1)$, prob $1/2$), delay $X = t$.\nThus:\n- For $x < 0$: $F_X(x) = 0$.\n- At $x = 0$: $P(X = 0) = 1/2$, so $F_X(0) = 1/2$.\n- For $0 < x < 1$: $F_X(x) = P(X = 0) + P(0 < X \\le x) = \\frac{1}{2} + \\frac{1}{2} x$.\n- For $x \\ge 1$: $F_X(x) = 1$.\n\n**(b) Nature of the Distribution:**\n$X$ is **NEITHER discrete NOR continuous**! It is a **mixed (hybrid) distribution**:\n- It has a discrete point mass (atom) of weight $1/2$ at $x = 0$ (so it is not continuous);\n- It takes a continuum of values on $(0, 1)$ with positive density $1/2$ (so it is not discrete).\n\n**(c) Expectation and Variance:**\nConditioning on arrival phase (Green vs Red):\n$$E[X] = \\frac{1}{2} \\cdot 0 + \\frac{1}{2} E[U(0, 1)] = \\frac{1}{2} \\cdot \\frac{1}{2} = \\frac{1}{4} \\text{ min}$$\nSecond moment:\n$$E[X^2] = \\frac{1}{2} \\cdot 0^2 + \\frac{1}{2} E[U^2] = \\frac{1}{2} \\cdot \\frac{1}{3} = \\frac{1}{6}$$\nVariance:\n$$\\text{Var}(X) = E[X^2] - (E[X])^2 = \\frac{1}{6} - \\left(\\frac{1}{4}\\right)^2 = \\frac{1}{6} - \\frac{1}{16} = \\frac{5}{48} \\approx 0.1042 \\text{ min}^2$$"
    },

    # --- PRACTICE MIDTERM 2 (2017 Exam Paper) ---
    {
        "id": 37,
        "title": "Midterm 2017: Problem 1 Multiple Choice Complete Set",
        "source": "Midterm Exam 2 (Spring 2017)",
        "topic": "Midterm 2 Multi-Choice",
        "difficulty": "Medium",
        "statement": "Solve the 5 official Midterm 2 Multiple Choice questions:\n1. If $X$ and $Y$ are independent r.v. with $\\text{Var}(X) = \\text{Var}(Y) = 1$, then $\\text{Var}(2X - Y)$ is equal to:\n(a) 1  (b) 3  (c) 5  (d) other\n\n2. If $X \\sim N(0, 1)$, then $Y = aX + b \\sim N(\\mu, \\sigma^2)$ with:\n(a) $\\mu = a, \\sigma^2 = b$  (b) $\\mu = b, \\sigma^2 = a$  (c) $\\mu = b, \\sigma^2 = a^2$  (d) other\n\n3. The formula $f(x) = c e^{-2x^2}$ gives the p.d.f. for the distribution:\n(a) $E(2)$  (b) $E(\\sqrt{2})$  (c) $N(0, 1/4)$  (d) other\n\n4. If $E[X] = E[Y]$, then $E[X^2] = E[Y^2]$. (True or False?)\n\n5. If $X_1$ and $X_2$ are independent and have distribution $U(0, 1)$, then $X_1 + X_2$ is uniformly distributed on $(0, 2)$. (True or False?)",
        "hints": [
            "Hint for Q1: Var(aX + bY) = a² Var(X) + b² Var(Y) for independent variables.",
            "Hint for Q3: The exponent of a normal distribution is -(x - μ)² / (2σ²). Here -2x² = -x² / (2(1/4)).",
            "Hint for Q5: The sum of two independent uniforms forms a tent/triangle distribution, not flat uniform."
        ],
        "solution": "**1. $\\text{Var}(2X - Y)$:**\nSince $X, Y$ are independent:\n$$\\text{Var}(2X - Y) = 2^2 \\text{Var}(X) + (-1)^2 \\text{Var}(Y) = 4(1) + 1(1) = 5$$\n**Correct answer: (c) 5**.\n\n**2. $Y = aX + b$ for $X \\sim N(0, 1)$:**\n$E[Y] = aE[X] + b = a(0) + b = b$.\n$\\text{Var}(Y) = a^2 \\text{Var}(X) = a^2(1) = a^2$.\n**Correct answer: (c) $\\mu = b, \\sigma^2 = a^2$**.\n\n**3. $f(x) = c e^{-2x^2}$:**\nStandard normal form has $e^{-x^2 / (2\\sigma^2)}$. Setting $\\frac{1}{2\\sigma^2} = 2 \\implies \\sigma^2 = \\frac{1}{4}$.\n**Correct answer: (c) $N(0, 1/4)$**.\n\n**4. $E[X] = E[Y] \\implies E[X^2] = E[Y^2]$:**\n**FALSE (F)**. Counterexample: Let $X = 0$ constantly ($E[X]=0, E[X^2]=0$), and let $Y$ take values $\\pm 1$ with probability $1/2$ ($E[Y]=0$, but $E[Y^2]=1$).\n\n**5. Sum of uniforms is uniform:**\n**FALSE (F)**. $X_1 + X_2$ has a triangular density $f(z) = z$ on $[0, 1]$ and $2-z$ on $[1, 2]$. It is not uniform on $(0, 2)$."
    },
    {
        "id": 39,
        "title": "Midterm 2017: Problem 3 Normal Transformation Y = 3 - 2Z",
        "source": "Midterm Exam 2 (Spring 2017)",
        "topic": "Normal Transformation & Φ",
        "difficulty": "Medium",
        "statement": "Assume that $Z \\sim N(0, 1)$ and $Y = 3 - 2Z$.\n(a) Determine the cumulative distribution function of $Y$ in terms of $\\Phi$.\n(b) Find the probability density function of $Y$ and identify the distribution of $Y$.\n(c) Express in terms of $\\Phi$ the probability that $Y \\le 1$.\n(d) Express in terms of $\\Phi$ the probability that $Y > 5$.",
        "hints": [
            "Hint 1: Y <= y <=> 3 - 2Z <= y <=> 2Z >= 3 - y <=> Z >= (3 - y)/2.",
            "Hint 2: P(Z >= u) = 1 - Φ(u).",
            "Hint 3: For (b), differentiate F_Y(y) with respect to y."
        ],
        "solution": "**(a) C.D.F. of $Y$:**\n$$F_Y(y) = P(Y \\le y) = P(3 - 2Z \\le y) = P(2Z \\ge 3 - y) = P\\left(Z \\ge \\frac{3-y}{2}\\right)$$\nUsing the standard normal CDF $\\Phi$:\n$$F_Y(y) = 1 - \\Phi\\left(\\frac{3-y}{2}\\right) = \\Phi\\left(\\frac{y-3}{2}\\right)$$\n(since $1 - \\Phi(u) = \\Phi(-u)$ by symmetry).\n\n**(b) P.D.F. and Identification:**\nDifferentiating with respect to $y$:\n$$f_Y(y) = \\frac{d}{dy} \\Phi\\left(\\frac{y-3}{2}\\right) = \\Phi'\\left(\\frac{y-3}{2}\\right) \\cdot \\frac{1}{2} = \\frac{1}{2} \\phi\\left(\\frac{y-3}{2}\\right)$$\n$$f_Y(y) = \\frac{1}{2\\sqrt{2\\pi}} \\exp\\left( -\\frac{(y - 3)^2}{8} \\right), \\quad y \\in \\mathbb{R}$$\nThis is precisely the density of **$N(3, 4)$**, i.e. normal with mean $\\mu = 3$ and variance $\\sigma^2 = 4$ ($\\\\sigma = 2$).\n\n**(c) $P(Y \\le 1)$:**\n$$P(Y \\le 1) = \\Phi\\left(\\frac{1 - 3}{2}\\right) = \\Phi(-1) = 1 - \\Phi(1) \\approx 0.1587$$\n\n**(d) $P(Y > 5)$:**\n$$P(Y > 5) = 1 - P(Y \\le 5) = 1 - \\Phi\\left(\\frac{5 - 3}{2}\\right) = 1 - \\Phi(1) = \\Phi(-1) \\approx 0.1587$$"
    },
    {
        "id": 40,
        "title": "Midterm 2017: Problem 4 Poisson Sum & Conditional Binomial",
        "source": "Midterm Exam 2 (Spring 2017)",
        "topic": "Poisson & Binomial Conditioning",
        "difficulty": "Hard",
        "statement": "Random variables $X_1$ and $X_2$ are independent and have Poisson distribution $P(\\lambda)$.\n(a) Find $E[X_1 - X_2]$ and $\\text{Var}(X_1 - X_2)$;\n(b) Find the probability generating function of $X_1$;\n(c) Using (b), prove that $Y := X_1 + X_2 \\sim P(2\\lambda)$;\n(d) Prove that the conditional distribution $(X_1 \\mid Y = n)$ is binomial $B(n, 1/2)$.",
        "hints": [
            "Hint 1: Var(X_1 - X_2) = Var(X_1) + (-1)² Var(X_2) = λ + λ = 2λ.",
            "Hint 2: G_{X_1}(s) = e^{λ(s-1)}.",
            "Hint 3: P(X_1 = k | Y = n) = P(X_1 = k, X_2 = n - k) / P(Y = n)."
        ],
        "solution": "**(a) $E[X_1 - X_2]$ and $\\text{Var}(X_1 - X_2)$:**\n$$E[X_1 - X_2] = E[X_1] - E[X_2] = \\lambda - \\lambda = 0$$\n$$\\text{Var}(X_1 - X_2) = \\text{Var}(X_1) + (-1)^2 \\text{Var}(X_2) = \\lambda + \\lambda = 2\\lambda$$\n\n**(b) P.G.F. of $X_1$:**\n$$G_{X_1}(s) = E[s^{X_1}] = \\sum_{k=0}^\\infty s^k \\frac{\\lambda^k e^{-\\lambda}}{k!} = e^{-\\lambda} \\sum_{k=0}^\\infty \\frac{(\\lambda s)^k}{k!} = e^{-\\lambda} e^{\\lambda s} = e^{\\lambda(s-1)}$$\n\n**(c) Distribution of $Y = X_1 + X_2$:**\nSince $X_1, X_2$ are independent:\n$$G_Y(s) = G_{X_1}(s) G_{X_2}(s) = e^{\\lambda(s-1)} \\cdot e^{\\lambda(s-1)} = e^{2\\lambda(s-1)}$$\nBy the uniqueness theorem of generating functions, $Y$ must have the Poisson distribution with parameter $2\\lambda$: **$Y \\sim P(2\\lambda)$**.\n\n**(d) Conditional Distribution $(X_1 \\mid Y = n)$:**\nFor $k \\in \\{0, 1, \\dots, n\\}$:\n$$P(X_1 = k \\mid Y = n) = \\frac{P(X_1 = k, Y = n)}{P(Y = n)} = \\frac{P(X_1 = k, X_2 = n - k)}{P(Y = n)}$$\nSince $X_1, X_2$ are independent:\n$$= \\frac{\\frac{\\lambda^k e^{-\\lambda}}{k!} \\cdot \\frac{\\lambda^{n-k} e^{-\\lambda}}{(n-k)!}}{\\frac{(2\\lambda)^n e^{-2\\lambda}}{n!}} = \\frac{\\lambda^n e^{-2\\lambda}}{k!(n-k)!} \\cdot \\frac{n!}{2^n \\lambda^n e^{-2\\lambda}} = \\frac{n!}{k!(n-k)!} \\cdot \\frac{1}{2^n}$$\n$$= \\binom{n}{k} \\left(\\frac{1}{2}\\right)^k \\left(\\frac{1}{2}\\right)^{n-k}$$\nThis is precisely the p.m.f. of **$B(n, 1/2)$**! Q.E.D."
    },
    {
        "id": 41,
        "title": "Midterm 2017: Problem 5 Battery Lifetimes Mixture",
        "source": "Midterm Exam 2 (Spring 2017)",
        "topic": "Exponential Mixture & Reliability",
        "difficulty": "Medium",
        "statement": "There are two types of batteries in a bin. Type $i$ battery lifetimes (in hours) are exponentially distributed with rate $\\lambda_i$, for $i = 1, 2$. A randomly chosen battery is type $i$ with probability $p_i$, where $p_1 + p_2 = 1$.\n(a) What is the probability that a randomly chosen battery is still operating after $t$ hours?\n(b) Calculate the expected operating time for a randomly chosen battery.\n(c) If a battery is still operating after $t$ hours, what is the probability it still operates after an additional $s$ hours?",
        "hints": [
            "Hint 1: Law of total probability: P(T > t) = p_1 P(T_1 > t) + p_2 P(T_2 > t).",
            "Hint 2: For exponential, P(T_i > t) = e^{-λ_i t}.",
            "Hint 3: Conditional probability P(T > t + s | T > t) = P(T > t + s) / P(T > t)."
        ],
        "solution": "**(a) Reliability $P(T > t)$:**\nLet $I \\in \\{1, 2\\}$ denote the type of the chosen battery. By total probability:\n$$P(T > t) = p_1 P(T > t \\mid I = 1) + p_2 P(T > t \\mid I = 2) = p_1 e^{-\\lambda_1 t} + p_2 e^{-\\lambda_2 t}, \\quad t \\ge 0$$\n\n**(b) Expected Operating Time:**\n$$E[T] = p_1 E[T \\mid I = 1] + p_2 E[T \\mid I = 2] = \\frac{p_1}{\\lambda_1} + \\frac{p_2}{\\lambda_2}$$\n\n**(c) Conditional Survival $P(T > t + s \\mid T > t)$:**\n$$P(T > t + s \\mid T > t) = \\frac{P(T > t + s)}{P(T > t)} = \\frac{p_1 e^{-\\lambda_1(t+s)} + p_2 e^{-\\lambda_2(t+s)}}{p_1 e^{-\\lambda_1 t} + p_2 e^{-\\lambda_2 t}}$$\n*Note*: Notice that this mixture is **NOT** memoryless! Even though each component is memoryless, the mixture changes our belief about which battery type was picked as time passes (if it survives a long time, it is more likely to be the longer-lasting type)."
    },
    {
        "id": 42,
        "title": "Midterm 2017: Problem 6 Joint Triangular Density f(x, y) = ax",
        "source": "Midterm Exam 2 (Spring 2017)",
        "topic": "Continuous Joint & Conditional Expectation",
        "difficulty": "Hard",
        "statement": "The joint probability density function of $X$ and $Y$ is given by:\n$$f_{X,Y}(x, y) = \\begin{cases} ax, & 0 \\le y \\le x \\le 1 \\\\ 0, & \\text{otherwise} \\end{cases}$$\n(a) Find the value of $a$;\n(b) Calculate the marginal densities $f_X$ and $f_Y$, and find $E[X]$ and $E[Y]$;\n(c) Calculate the conditional density $f_{X|Y}(x \\mid 0.5)$ of $X$ given $Y = 0.5$;\n(d) Find the conditional expectation $E[X \\mid Y = 0.5]$.",
        "hints": [
            "Hint 1: To find a, integrate over the triangle: int_0^1 (int_0^x ax dy) dx = 1.",
            "Hint 2: For f_Y(y), y is fixed in [0, 1] and x runs from y to 1.",
            "Hint 3: Conditional density f_{X|Y}(x | 0.5) = f(x, 0.5) / f_Y(0.5) for x in [0.5, 1]."
        ],
        "solution": "**(a) Value of $a$:**\n$$\\int_0^1 \\left( \\int_0^x ax \\, dy \\right) dx = \\int_0^1 ax^2 \\, dx = a \\left[ \\frac{x^3}{3} \\right]_0^1 = \\frac{a}{3} = 1 \\implies a = 3$$\n\n**(b) Marginals and Expectations:**\n- Marginal $f_X(x)$ for $x \\in [0, 1]$:\n  $$f_X(x) = \\int_0^x 3x \\, dy = 3x^2, \\quad x \\in [0, 1]$$\n  $$E[X] = \\int_0^1 x (3x^2) \\, dx = 3 \\left[ \\frac{x^4}{4} \\right]_0^1 = \\frac{3}{4} = 0.75$$\n- Marginal $f_Y(y)$ for $y \\in [0, 1]$ ($x$ goes from $y$ to $1$):\n  $$f_Y(y) = \\int_y^1 3x \\, dx = 3 \\left[ \\frac{x^2}{2} \\right]_y^1 = \\frac{3}{2}(1 - y^2), \\quad y \\in [0, 1]$$\n  $$E[Y] = \\int_0^1 y \\cdot \\frac{3}{2}(1 - y^2) \\, dy = \\frac{3}{2} \\left[ \\frac{y^2}{2} - \\frac{y^4}{4} \\right]_0^1 = \\frac{3}{2} \\left(\\frac{1}{4}\\right) = \\frac{3}{8} = 0.375$$\n\n**(c) Conditional Density $f_{X|Y}(x \\mid 0.5)$:**\nFor $Y = 0.5$:\n$$f_Y(0.5) = \\frac{3}{2}(1 - 0.5^2) = \\frac{3}{2}\\left(\\frac{3}{4}\\right) = \\frac{9}{8}$$\nFor $x \\in [0.5, 1]$:\n$$f_{X|Y}(x \\mid 0.5) = \\frac{f(x, 0.5)}{f_Y(0.5)} = \\frac{3x}{9/8} = \\frac{24x}{9} = \\frac{8x}{3}, \\quad 0.5 \\le x \\le 1$$\n(and 0 otherwise). Check integral: $\\int_{0.5}^1 \\frac{8x}{3} dx = \\frac{4}{3}(1 - 0.25) = 1$. Valid!\n\n**(d) Conditional Expectation $E[X \\mid Y = 0.5]$:**\n$$E[X \\mid Y = 0.5] = \\int_{0.5}^1 x \\left( \\frac{8x}{3} \\right) dx = \\frac{8}{3} \\left[ \\frac{x^3}{3} \\right]_{0.5}^1 = \\frac{8}{9}\\left(1 - \\frac{1}{8}\\right) = \\frac{8}{9} \\cdot \\frac{7}{8} = \\frac{7}{9} \\approx 0.7778$$"
    }
]

print("Problems defined: ", len(PROBLEMS_BANK))
