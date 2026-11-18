#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Full database builder for UCU Probability & Statistics Midterm 2 and Colloquium 2.
"""

import json
import os

base_dir = "/Users/ihor/Studing/UCU/3 semestr/бабілка/мідтерм хаслінг/midterm2"
js_dir = os.path.join(base_dir, "js")
os.makedirs(js_dir, exist_ok=True)

# 1. Schedule Days
from build_schedule import SCHEDULE_DAYS

# 2. Definitions 21
DEFINITIONS_21 = [
    {
        "id": 1,
        "name": "Discrete Random Variable",
        "nameUa": "Дискретна випадкова величина",
        "latex": "X: \\Omega \\to \\mathbb{R}",
        "latexFull": "X: \\Omega \\to \\mathbb{R} \\text{ such that } \\forall a \\in \\mathbb{R}, \\; \\{\\omega \\in \\Omega : X(\\omega) \\le a\\} \\in \\mathcal{F}, \\quad S_X \\subset \\mathbb{R} \\text{ is finite or countably infinite}",
        "definition": "A random variable $X$ is a measurable function mapping the sample space $\\Omega$ into real numbers $\\mathbb{R}$. It is called **discrete** if its range (support) $S_X = X(\\Omega) \\subset \\mathbb{R}$ is finite or countably infinite, i.e., $S_X = \\{x_1, x_2, \\dots\\}$.",
        "keyPoints": [
            "Measurability condition: For every $a \\in \\mathbb{R}$, the pre-image $\{\\omega \\in \\Omega : X(\\omega) \\le a\}$ must belong to the $\\sigma$-algebra $\\mathcal{F}$.",
            "Support $S_X$ is at most countable (can be listed $x_1, x_2, \\dots$).",
            "Probability of any event $B \\subset \\mathbb{R}$ is $P(X \\in B) = \\sum_{x_k \\in B \\cap S_X} P(X = x_k)$."
        ],
        "example": "Let $\\Omega$ be the outcomes of 3 coin tosses. Let $X(\\omega)$ be the number of Heads. Then $S_X = \\{0, 1, 2, 3\\}$, which is finite, so $X$ is a discrete random variable.",
        "colloquiumTip": "Professor Babii will ask: 'What makes a function a random variable?' You must mention **measurability** relative to the $\\sigma$-algebra $\\mathcal{F}$! Then state that the range is countable.",
        "trap": "Don't just say 'a variable taking discrete values'. A random variable is a **function** on the sample space $\\Omega$!"
    },
    {
        "id": 2,
        "name": "Probability Mass Function (p.m.f.)",
        "nameUa": "Функція маси ймовірності (ф.м.й.)",
        "latex": "p_X(x) = P(X = x)",
        "latexFull": "p_X(x) = P(X = x) = P(\\{\\omega \\in \\Omega : X(\\omega) = x\\})",
        "definition": "The probability mass function (p.m.f.) of a discrete random variable $X$ is the function $p_X: \\mathbb{R} \\to [0, 1]$ defined by $p_X(x) = P(X = x)$.",
        "keyPoints": [
            "Non-negativity: $p_X(x) \\ge 0$ for all $x \\in \\mathbb{R}$.",
            "Normalization axiom: $\\sum_{x \\in S_X} p_X(x) = 1$.",
            "For any set $A \\subset \\mathbb{R}$, $P(X \\in A) = \\sum_{x \\in A \\cap S_X} p_X(x)$."
        ],
        "example": "For a fair 6-sided die, $p_X(k) = \\frac{1}{6}$ for $k \\in \\{1, 2, 3, 4, 5, 6\\}$, and $0$ elsewhere. Total sum $= 6 \\times \\frac{1}{6} = 1$.",
        "colloquiumTip": "Always state both fundamental properties: $p_X(x) \\ge 0$ and $\\sum_{x \\in S_X} p_X(x) = 1$.",
        "trap": "A p.m.f. is only defined for discrete random variables; for continuous variables, $P(X = x) = 0$ for every single point!"
    },
    {
        "id": 3,
        "name": "Cumulative Distribution Function (c.d.f.)",
        "nameUa": "Функція розподілу (ф.р.)",
        "latex": "F_X(x) = P(X \\le x)",
        "latexFull": "F_X(x) = P(X \\le x) = P(\\{\\omega \\in \\Omega : X(\\omega) \\le x\\}), \\quad x \\in \\mathbb{R}",
        "definition": "The cumulative distribution function (c.d.f.) of a random variable $X$ (discrete or continuous) is the function $F_X: \\mathbb{R} \\to [0, 1]$ defined by $F_X(x) = P(X \\le x)$.",
        "keyPoints": [
            "**1. Non-decreasing**: If $x_1 < x_2$, then $F_X(x_1) \\le F_X(x_2)$.",
            "**2. Right-continuous**: $\\lim_{h \\to 0^+} F_X(x + h) = F_X(x)$ for all $x \\in \\mathbb{R}$.",
            "**3. Limits at infinity**: $\\lim_{x \\to -\\infty} F_X(x) = 0$ and $\\lim_{x \\to +\\infty} F_X(x) = 1$.",
            "**4. Interval probability**: $P(a < X \\le b) = F_X(b) - F_X(a)$.",
            "**5. Point mass**: $P(X = a) = F_X(a) - \\lim_{x \\to a^-} F_X(x) = F_X(a) - F_X(a^-)$."
        ],
        "example": "For Bernoulli $X \\sim B(1, p)$:\n$$F_X(x) = \\begin{cases} 0, & x < 0 \\\\ 1 - p, & 0 \\le x < 1 \\\\ 1, & x \\ge 1 \\end{cases}$$",
        "colloquiumTip": "You MUST know all 4 defining properties! If asked 'What is $P(a \\le X \\le b)$?', answer $F(b) - F(a^-)$. Remember right-continuity: $\\lim_{x \\to a^+} F(x) = F(a)$.",
        "trap": "Do NOT say continuous from the left! The standard mathematical convention is **continuous from the right**."
    },
    {
        "id": 4,
        "name": "Binomial Distribution B(n, p)",
        "nameUa": "Біноміальний розподіл B(n, p)",
        "latex": "X \\sim B(n, p)",
        "latexFull": "p_X(k) = \\binom{n}{k} p^k (1-p)^{n-k}, \\quad k \\in \\{0, 1, \\dots, n\\}, \\; p \\in (0, 1)",
        "definition": "The distribution of the number of successes $k$ in $n$ independent and identically distributed Bernoulli trials, each having success probability $p$.",
        "keyPoints": [
            "Support: $S_X = \\{0, 1, 2, \\dots, n\\}$.",
            "Mean: $E[X] = np$.",
            "Variance: $\\text{Var}(X) = np(1-p)$.",
            "P.G.F.: $G_X(s) = (1 - p + ps)^n$.",
            "M.G.F.: $M_X(t) = (1 - p + pe^t)^n$.",
            "Sum of independent binomials with same $p$: $X_1 \\sim B(n_1, p), X_2 \\sim B(n_2, p) \\implies X_1 + X_2 \\sim B(n_1 + n_2, p)$."
        ],
        "example": "Tossing a fair coin ($p=0.5$) 10 times: $X \\sim B(10, 0.5)$. $E[X] = 5$, $\\text{Var}(X) = 2.5$.",
        "colloquiumTip": "Prove $E[X] = np$ using indicator random variables $X = \\sum_{i=1}^n I_i$, where $I_i \\sim B(1, p)$. By linearity $E[X] = \\sum E[I_i] = np$. This is 10x faster and more elegant than the binomial theorem sum!",
        "trap": "Don't forget the binomial coefficient $\\binom{n}{k} = \\frac{n!}{k!(n-k)!}$."
    },
    {
        "id": 5,
        "name": "Geometric Distribution G(p)",
        "nameUa": "Геометричний розподіл G(p)",
        "latex": "X \\sim G(p)",
        "latexFull": "p_X(k) = (1-p)^{k-1} p, \\quad k \\in \\{1, 2, 3, \\dots\\}, \\; p \\in (0, 1)",
        "definition": "The distribution of the trial number $k$ on which the **first success** occurs in repeated independent Bernoulli trials with success probability $p$.",
        "keyPoints": [
            "Support: $S_X = \\{1, 2, 3, \\dots\\}$.",
            "Tail probability: $P(X \\ge k) = (1-p)^{k-1}$, and $P(X > k) = (1-p)^k$.",
            "C.D.F.: $F_X(k) = 1 - (1-p)^k$ for integer $k \\ge 1$.",
            "Mean: $E[X] = \\frac{1}{p}$ (derived via tail sum: $E[X] = \\sum_{k=1}^\\infty P(X \\ge k) = \\sum_{k=1}^\\infty (1-p)^{k-1} = \\frac{1}{p}$).",
            "Variance: $\\text{Var}(X) = \\frac{1-p}{p^2}$.",
            "P.G.F.: $G_X(s) = \\frac{ps}{1 - (1-p)s}$.",
            "**Memoryless property**: $P(X > m + n \\mid X > m) = P(X > n)$ for integers $m, n \\ge 1$."
        ],
        "example": "Rolling a fair die until the first '6' appears ($p = 1/6$). Expected number of rolls is $1/(1/6) = 6$.",
        "colloquiumTip": "Derive the **Memoryless Property** in 2 lines: $P(X > m+n \\mid X > m) = \\frac{P(X > m+n)}{P(X > m)} = \\frac{(1-p)^{m+n}}{(1-p)^m} = (1-p)^n = P(X > n)$.",
        "trap": "Be clear on convention: UCU convention defines $X$ as the **trial of first success** ($k \\in \\{1, 2, \\dots\\}$), so $E[X] = 1/p$. (Not number of failures before success, which starts at 0)."
    },
    {
        "id": 6,
        "name": "Poisson Distribution P(λ)",
        "nameUa": "Пуассонівський розподіл P(λ)",
        "latex": "X \\sim P(\\lambda)",
        "latexFull": "p_X(k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}, \\quad k \\in \\{0, 1, 2, \\dots\\}, \\; \\lambda > 0",
        "definition": "The distribution of the number of occurrences of a rare event within a fixed interval of time or space, parameterized by average rate $\\lambda > 0$.",
        "keyPoints": [
            "Support: $S_X = \\{0, 1, 2, \\dots\\}$.",
            "Sum of probabilities: $\\sum_{k=0}^\\infty \\frac{\\lambda^k e^{-\\lambda}}{k!} = e^{-\\lambda} \\sum_{k=0}^\\infty \\frac{\\lambda^k}{k!} = e^{-\\lambda} e^\\lambda = 1$.",
            "Mean: $E[X] = \\lambda$.",
            "Variance: $\\text{Var}(X) = \\lambda$. (Equal mean and variance!)",
            "P.G.F.: $G_X(s) = e^{\\lambda(s-1)}$.",
            "**Poisson Limit Theorem**: If $X_n \\sim B(n, p_n)$ with $n p_n \\to \\lambda$ as $n \\to \\infty$, then $P(X_n = k) \\to \\frac{\\lambda^k e^{-\\lambda}}{k!}$.",
            "**Sum of independent Poissons**: If $X_1 \\sim P(\\lambda_1), X_2 \\sim P(\\lambda_2)$ are independent, then $X_1 + X_2 \\sim P(\\lambda_1 + \\lambda_2)$."
        ],
        "example": "Server receives on average $\\lambda = 4$ requests per second. Probability of exactly 0 requests is $e^{-4} \\approx 0.0183$.",
        "colloquiumTip": "Colloquium favourite: Prove that if $X_1, X_2 \\sim P(\\lambda)$ independent, then $X_1 + X_2 \\sim P(2\\lambda)$. Use P.G.F.: $G_{X_1+X_2}(s) = G_{X_1}(s)G_{X_2}(s) = e^{\\lambda(s-1)} e^{\\lambda(s-1)} = e^{2\\lambda(s-1)}$. Done!",
        "trap": "Remember that $0! = 1$, so $p_X(0) = e^{-\\lambda}$."
    },
    {
        "id": 7,
        "name": "Continuous Random Variable",
        "nameUa": "Неперервна випадкова величина",
        "latex": "F_X(x) = \\int_{-\\infty}^x f_X(t) \\, dt",
        "latexFull": "\\exists f_X: \\mathbb{R} \\to [0, \\infty) \\text{ integrable such that } \\forall x \\in \\mathbb{R}, \\; F_X(x) = \\int_{-\\infty}^x f_X(t) \\, dt",
        "definition": "A random variable $X$ is called **continuous** if there exists a non-negative function $f_X: \\mathbb{R} \\to [0, \\infty)$ such that its cumulative distribution function can be represented as an integral of $f_X$ from $-\\infty$ to $x$.",
        "keyPoints": [
            "The cumulative distribution function $F_X(x)$ is continuous everywhere on $\\mathbb{R}$.",
            "**Point probability is zero**: For any single real number $c$, $P(X = c) = 0$.",
            "As a result: $P(a < X < b) = P(a \\le X < b) = P(a < X \\le b) = P(a \\le X \\le b) = F_X(b) - F_X(a)$.",
            "By the Fundamental Theorem of Calculus, $f_X(x) = F_X'(x)$ at every point where $f_X$ is continuous."
        ],
        "example": "The exact time $T$ until a light bulb fails, or an angle $\\Theta$ drawn uniformly at random from $[0, 2\\pi)$.",
        "colloquiumTip": "Professor will ask: 'Does $P(X = c) = 0$ mean the outcome $X = c$ is impossible?' Correct answer: **NO!** In continuous sample spaces, possible events can have probability zero (e.g., throwing a dart at an exact geometric point).",
        "trap": "Do not confuse 'continuous random variable' with merely having a continuous range. The defining condition is the existence of an integrable density $f_X$ (absolute continuity)!"
    },
    {
        "id": 8,
        "name": "Probability Density Function (p.d.f.)",
        "nameUa": "Щільність розподілу ймовірностей (щ.р.й.)",
        "latex": "f_X(x) \\ge 0, \\quad \\int_{-\\infty}^\\infty f_X(x) \\, dx = 1",
        "latexFull": "f_X(x) \\ge 0, \\quad \\int_{-\\infty}^\\infty f_X(x) \\, dx = 1, \\quad P(a \\le X \\le b) = \\int_a^b f_X(x) \\, dx",
        "definition": "A function $f_X: \\mathbb{R} \\to [0, \\infty)$ that describes the relative likelihood for the continuous random variable $X$ to take on a given value.",
        "keyPoints": [
            "Non-negativity: $f_X(x) \\ge 0$ for all $x \\in \\mathbb{R}$.",
            "Total area under curve is 1: $\\int_{-\\infty}^\\infty f_X(x) \\, dx = 1$.",
            "Infinitesimal probability interpretation: $P(x \\le X \\le x + dx) \\approx f_X(x) dx$.",
            "**$f_X(x)$ can exceed 1!** $f_X(x)$ is a probability *density* (probability per unit length), not a probability."
        ],
        "example": "If $X \\sim U(0, 0.1)$, then $f_X(x) = \\frac{1}{0.1} = 10$ for $x \\in [0, 0.1]$. Notice $f(x) = 10 > 1$, which is completely valid!",
        "colloquiumTip": "If asked 'Can a density function be greater than 1?', answer immediately: **YES!** Give the example $U(0, 0.5)$ where $f(x) = 2$.",
        "trap": "$f_X(x)$ is NOT $P(X = x)$. $P(X = x) = 0$ for all $x$."
    },
    {
        "id": 9,
        "name": "Uniform Distribution U(a, b)",
        "nameUa": "Рівномірний розподіл U(a, b)",
        "latex": "X \\sim U(a, b)",
        "latexFull": "f_X(x) = \\begin{cases} \\frac{1}{b-a}, & a \\le x \\le b \\\\ 0, & \\text{otherwise} \\end{cases}, \\quad F_X(x) = \\begin{cases} 0, & x < a \\\\ \\frac{x-a}{b-a}, & a \\le x \\le b \\\\ 1, & x > b \\end{cases}",
        "definition": "Continuous distribution where all intervals of equal length within support $[a, b]$ are equally likely.",
        "keyPoints": [
            "Mean: $E[X] = \\frac{a+b}{2}$.",
            "Variance: $\\text{Var}(X) = \\frac{(b-a)^2}{12}$.",
            "M.G.F.: $M_X(t) = \\frac{e^{tb} - e^{ta}}{t(b-a)}$ for $t \\ne 0$, and $M_X(0) = 1$.",
            "For standard uniform $U(0, 1)$: $E[X] = 1/2$, $\\text{Var}(X) = 1/12$."
        ],
        "example": "Arrival of a bus uniformly between 12:00 and 12:30 ($a=0, b=30$). Average waiting time $= 15$ min.",
        "colloquiumTip": "Derivation of $\\text{Var}(X) = \\frac{(b-a)^2}{12}$: First compute for $U(0, 1)$: $E[U] = 1/2$, $E[U^2] = \\int_0^1 u^2 du = 1/3 \\implies \\text{Var}(U) = 1/3 - 1/4 = 1/12$. Then $X = a + (b-a)U \\implies \\text{Var}(X) = (b-a)^2 \\text{Var}(U) = \\frac{(b-a)^2}{12}$. Super fast!",
        "trap": "In the midterm 2017 problem: the sum of two independent uniforms $X_1 + X_2$ is NOT uniform! It has a triangular distribution on $(0, 2)$."
    },
    {
        "id": 10,
        "name": "Exponential Distribution E(λ)",
        "nameUa": "Експоненційний розподіл E(λ)",
        "latex": "X \\sim E(\\lambda)",
        "latexFull": "f_X(x) = \\begin{cases} \\lambda e^{-\\lambda x}, & x \\ge 0 \\\\ 0, & x < 0 \\end{cases}, \\quad F_X(x) = \\begin{cases} 1 - e^{-\\lambda x}, & x \\ge 0 \\\\ 0, & x < 0 \\end{cases}",
        "definition": "Continuous distribution modeling the time between independent events occurring continuously at a constant average rate $\\lambda > 0$.",
        "keyPoints": [
            "Survival / Reliability function: $P(X > t) = e^{-\\lambda t}$ for $t \\ge 0$.",
            "Mean: $E[X] = \\frac{1}{\\lambda}$.",
            "Variance: $\\text{Var}(X) = \\frac{1}{\\lambda^2}$.",
            "M.G.F.: $M_X(t) = \\frac{\\lambda}{\\lambda - t}$ for $t < \\lambda$.",
            "**Memoryless Property**: $P(X > s + t \\mid X > s) = P(X > t)$ for all $s, t \\ge 0$.",
            "**Minimum of independent exponentials**: If $X_1 \\sim E(\\lambda_1), \\dots, X_n \\sim E(\\lambda_n)$ independent, then $\\min(X_1, \\dots, X_n) \\sim E(\\lambda_1 + \\dots + \\lambda_n)$."
        ],
        "example": "Time until the next radioactive particle decays, or customer service duration at an ATM.",
        "colloquiumTip": "Colloquium Question 11: Memoryless proof in 1 step: $P(X > s+t \\mid X > s) = \\frac{P(X > s+t)}{P(X > s)} = \\frac{e^{-\\lambda(s+t)}}{e^{-\\lambda s}} = e^{-\\lambda t} = P(X > t)$.",
        "trap": "Check parameter convention: at UCU, $\\lambda$ is the rate parameter, so $E[X] = 1/\\lambda$, not $\\lambda$."
    },
    {
        "id": 11,
        "name": "Normal (Gaussian) Distribution N(μ, σ²)",
        "nameUa": "Нормальний (Гауссів) розподіл N(μ, σ²)",
        "latex": "X \\sim N(\\mu, \\sigma^2)",
        "latexFull": "f_X(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} \\exp\\left( -\\frac{(x-\\mu)^2}{2\\sigma^2} \\right), \\quad x \\in \\mathbb{R}, \\; \\mu \\in \\mathbb{R}, \\; \\sigma > 0",
        "definition": "The cornerstone continuous bell-shaped distribution completely determined by its mean $\\mu$ and variance $\\sigma^2$.",
        "keyPoints": [
            "Symmetric about the mean: $f_X(\\mu - x) = f_X(\\mu + x)$.",
            "Standard normal: $Z = \\frac{X - \\mu}{\\sigma} \\sim N(0, 1)$, with $\\phi(z) = \\frac{1}{\\sqrt{2\\pi}} e^{-z^2/2}$ and $\\Phi(z) = \\int_{-\\infty}^z \\phi(t)dt$.",
            "Symmetry of $\\Phi$: $\\Phi(-z) = 1 - \\Phi(z)$.",
            "**Affine Transformation Theorem**: If $X \\sim N(\\mu, \\sigma^2)$, then $Y = aX + b \\sim N(a\\mu + b, a^2\\sigma^2)$.",
            "M.G.F.: $M_X(t) = \\exp\\left( \\mu t + \\frac{1}{2}\\sigma^2 t^2 \\right)$."
        ],
        "example": "Measurement errors, heights in a population, midterm test scores.",
        "colloquiumTip": "In Midterm 2017: If $X \\sim N(0, 1)$ and $Y = aX + b$, then $Y \\sim N(\\mu, \\sigma^2)$ with $\\mu = b$ and $\\sigma^2 = a^2$! Don't write $\\mu = a, \\sigma^2 = b$!",
        "trap": "In the formula $f(x) = c e^{-2x^2}$, identify the distribution: $-2x^2 = -\\frac{x^2}{2\\sigma^2} \\implies 2\\sigma^2 = 1/2 \\implies \\sigma^2 = 1/4$. Thus it is $N(0, 1/4)$!"
    },
    {
        "id": 12,
        "name": "Expectation and Moments",
        "nameUa": "Математичне сподівання та моменти",
        "latex": "E[X] = \\sum x p(x) \\quad \\text{or} \\quad \\int_{-\\infty}^\\infty x f(x) \\, dx",
        "latexFull": "E[X] = \\sum_{x \\in S_X} x p_X(x) \\; (\\text{provided } \\sum |x|p(x) < \\infty) \\quad \\text{or} \\quad \\int_{-\\infty}^\\infty x f_X(x) dx \\; (\\text{provided } \\int |x|f(x)dx < \\infty)",
        "definition": "The expected value (mean) $\\mu_X = E[X]$ is the probability-weighted average of all possible values of $X$, provided absolute summability/integrability holds.",
        "keyPoints": [
            "**Linearity**: $E[aX + bY + c] = aE[X] + bE[Y] + c$ (ALWAYS holds, whether independent or not!).",
            "**LOTUS (Law of the Unconscious Statistician)**: $E[g(X)] = \\sum g(x)p_X(x)$ or $\\int_{-\\infty}^\\infty g(x)f_X(x)dx$.",
            "**$k$-th moment**: $\\alpha_k = E[X^k]$.",
            "**$k$-th central moment**: $\\mu_k = E[(X - E[X])^k]$.",
            "**Tail sum formula**: For non-negative integer RV: $E[X] = \\sum_{k=1}^\\infty P(X \\ge k)$. For non-negative continuous RV: $E[X] = \\int_0^\\infty P(X > t) dt$."
        ],
        "example": "If $X$ is an indicator of event $A$ ($I_A$), then $E[I_A] = 1 \\cdot P(A) + 0 \\cdot P(A^c) = P(A)$.",
        "colloquiumTip": "Condition for existence: Always mention that $\\sum |x|p_X(x) < \\infty$ or $\\int |x|f_X(x)dx < \\infty$. Give Cauchy distribution as an example where expectation does not exist!",
        "trap": "$E[X^2] \\ne (E[X])^2$ unless $\\text{Var}(X) = 0$. Jensen's inequality: $E[X^2] \\ge (E[X])^2$."
    },
    {
        "id": 13,
        "name": "Variance and Covariance",
        "nameUa": "Дисперсія та коваріація",
        "latex": "\\text{Var}(X) = E[(X - E[X])^2], \\quad \\text{Cov}(X, Y) = E[XY] - E[X]E[Y]",
        "latexFull": "\\text{Var}(X) = E[X^2] - (E[X])^2, \\quad \\text{Cov}(X, Y) = E[(X - E[X])(Y - E[Y])] = E[XY] - E[X]E[Y]",
        "definition": "Variance measures the spread of $X$ around its mean. Covariance measures the joint variability and linear association between two random variables $X$ and $Y$.",
        "keyPoints": [
            "Non-negativity: $\\text{Var}(X) \\ge 0$, with $\\text{Var}(X) = 0 \\iff X = c$ almost surely.",
            "Scale property: $\\text{Var}(aX + b) = a^2 \\text{Var}(X)$.",
            "Variance of a sum: $\\text{Var}(X + Y) = \\text{Var}(X) + \\text{Var}(Y) + 2\\text{Cov}(X, Y)$.",
            "General linear combination: $\\text{Var}(aX + bY) = a^2\\text{Var}(X) + b^2\\text{Var}(Y) + 2ab\\text{Cov}(X, Y)$.",
            "If $X, Y$ are independent (or uncorrelated): $\\text{Var}(aX + bY) = a^2\\text{Var}(X) + b^2\\text{Var}(Y)$."
        ],
        "example": "If $X, Y$ are independent with $\\text{Var}(X) = \\text{Var}(Y) = 1$: $\\text{Var}(2X - Y) = 2^2 \\text{Var}(X) + (-1)^2 \\text{Var}(Y) = 4(1) + 1(1) = 5$.",
        "colloquiumTip": "Covariance is bilinear: $\\text{Cov}(\\sum a_i X_i, \\sum b_j Y_j) = \\sum_i \\sum_j a_i b_j \\text{Cov}(X_i, Y_j)$.",
        "trap": "Common exam error: $\\text{Var}(2X - Y) \\ne 4\\text{Var}(X) - \\text{Var}(Y)$! The minus sign squared becomes $(-1)^2 = +1$!"
    },
    {
        "id": 14,
        "name": "Correlation and its Properties",
        "nameUa": "Кореляція та її властивості",
        "latex": "\\rho(X, Y) = \\frac{\\text{Cov}(X, Y)}{\\sqrt{\\text{Var}(X)\\text{Var}(Y)}}",
        "latexFull": "\\rho(X, Y) = \\text{Corr}(X, Y) = \\frac{\\text{Cov}(X, Y)}{\\sigma_X \\sigma_Y}, \\quad -1 \\le \\rho(X, Y) \\le 1",
        "definition": "Dimensionless measure of the strength and direction of the linear relationship between two random variables.",
        "keyPoints": [
            "**Boundedness**: $-1 \\le \\rho(X, Y) \\le 1$ (proved via Cauchy-Schwarz inequality).",
            "**Linear dependence**: $|\\rho(X, Y)| = 1 \\iff \\exists a \\ne 0, b$ such that $Y = aX + b$ almost surely. If $a > 0, \\rho = 1$; if $a < 0, \\rho = -1$.",
            "**Invariance**: For constants $a > 0, c > 0$: $\\rho(aX+b, cY+d) = \\rho(X, Y)$. If $ac < 0$, sign flips.",
            "**Independence implies $\\rho = 0$**: If $X, Y$ are independent, $\\text{Cov}(X, Y) = 0 \\implies \\rho = 0$.",
            "**CRUCIAL TRAP: $\\rho = 0 \\centernot\\implies$ independent!**"
        ],
        "example": "Let $X \\sim U(-1, 1)$, and $Y = X^2$. Then $E[X] = 0, E[XY] = E[X^3] = 0 \\implies \\text{Cov}(X, Y) = 0 \\implies \\rho = 0$. But $Y$ is completely determined by $X$, so they are strongly dependent!",
        "colloquiumTip": "Colloquium Question 6: Always state Cauchy-Schwarz inequality $E[(U - \\lambda V)^2] \\ge 0$ as the proof that $|\\rho| \\le 1$, and present the $X \\sim U(-1, 1), Y = X^2$ counterexample.",
        "trap": "Never claim that $\\rho = 0$ means independence. It only means absence of *linear* relationship."
    },
    {
        "id": 15,
        "name": "Random Vectors & Joint Distributions",
        "nameUa": "Випадкові вектори та сумісні розподіли",
        "latex": "(X, Y): \\Omega \\to \\mathbb{R}^2, \\quad F_{X,Y}(x, y) = P(X \\le x, Y \\le y)",
        "latexFull": "F_{X,Y}(x, y) = P(X \\le x, Y \\le y), \\quad p_{X,Y}(x, y) = P(X=x, Y=y), \\quad P((X, Y) \\in A) = \\iint_A f_{X,Y}(x, y) dx dy",
        "definition": "A random vector $(X, Y)$ models pairs of random variables simultaneously on the same probability space $(\\Omega, \\mathcal{F}, P)$.",
        "keyPoints": [
            "Discrete joint p.m.f.: $p_{X,Y}(x, y) \\ge 0$ and $\\sum_x \\sum_y p_{X,Y}(x, y) = 1$.",
            "Continuous joint p.d.f.: $f_{X,Y}(x, y) \\ge 0$ and $\\int_{-\\infty}^\\infty \\int_{-\\infty}^\\infty f_{X,Y}(x, y) dx dy = 1$.",
            "Joint c.d.f. connection: $f_{X,Y}(x, y) = \\frac{\\partial^2 F_{X,Y}(x, y)}{\\partial x \\partial y}$ at points of continuity.",
            "Expectation of function $g(X, Y)$: $E[g(X, Y)] = \\iint g(x, y) f_{X,Y}(x, y) dx dy$."
        ],
        "example": "Uniform distribution over the unit disk $D = \\{(x, y): x^2 + y^2 \\le 1\\}$: $f_{X,Y}(x, y) = \\frac{1}{\\pi}$ for $(x, y) \\in D$, 0 elsewhere.",
        "colloquiumTip": "Know how to check if joint density integrates to 1 and how to find unknown normalizing constant $c$ using double integrals.",
        "trap": "Always sketch the support region in the $(x, y)$ plane before setting up double integral bounds!"
    },
    {
        "id": 16,
        "name": "Marginal Distributions",
        "nameUa": "Маргінальні (крайові) розподіли",
        "latex": "f_X(x) = \\int_{-\\infty}^\\infty f_{X,Y}(x, y) \\, dy, \\quad p_X(x) = \\sum_y p_{X,Y}(x, y)",
        "latexFull": "f_X(x) = \\int_{-\\infty}^\\infty f_{X,Y}(x, y) \\, dy, \\quad f_Y(y) = \\int_{-\\infty}^\\infty f_{X,Y}(x, y) \\, dx",
        "definition": "The individual probability distribution of one coordinate of a random vector obtained by summing or integrating out all other coordinates.",
        "keyPoints": [
            "Discrete: $p_X(x) = \\sum_{y \\in S_Y} p_{X,Y}(x, y)$ (sum across row/column in joint table).",
            "Continuous: $f_X(x) = \\int_{-\\infty}^\\infty f_{X,Y}(x, y) dy$.",
            "Marginal c.d.f.: $F_X(x) = \\lim_{y \\to \\infty} F_{X,Y}(x, y)$.",
            "**Independence criterion**: $X$ and $Y$ are independent $\\iff f_{X,Y}(x, y) = f_X(x) f_Y(y)$ for all $x, y$ (or $p_{X,Y}(x, y) = p_X(x) p_Y(y)$)."
        ],
        "example": "Triangle density $f(x, y) = 2$ for $x, y > 0, x+y < 1$: $f_X(x) = \\int_0^{1-x} 2 dy = 2(1-x)$ for $x \\in (0, 1)$.",
        "colloquiumTip": "In integration bounds, the upper limit depends on $x$! If support is $0 \\le y \\le 1-x$, integrate $y$ from $0$ to $1-x$, NOT $0$ to $1$!",
        "trap": "Forgetting the support of the marginal. Always write 'for $0 < x < 1$, and 0 otherwise'."
    },
    {
        "id": 17,
        "name": "Conditional Distributions",
        "nameUa": "Умовні розподіли",
        "latex": "f_{X|Y}(x \\mid y) = \\frac{f_{X,Y}(x, y)}{f_Y(y)}, \\quad p_{X|Y}(x \\mid y) = \\frac{p_{X,Y}(x, y)}{p_Y(y)}",
        "latexFull": "f_{X|Y}(x \\mid y) = \\frac{f_{X,Y}(x, y)}{f_Y(y)} \\; (\\text{for } f_Y(y) > 0), \\quad E[X \\mid Y = y] = \\int_{-\\infty}^\\infty x f_{X|Y}(x \\mid y) dx",
        "definition": "The probability distribution of random variable $X$ given that another random variable $Y$ has taken on a specific value $y$.",
        "keyPoints": [
            "For fixed $y$, $f_{X|Y}(x \\mid y)$ is a genuine probability density function in $x$: integrates to 1 over $\\mathbb{R}$.",
            "**Conditional Expectation**: $E[X \\mid Y = y] = \\int x f_{X|Y}(x \\mid y) dx$ (or $\\sum x p_{X|Y}(x \\mid y)$).",
            "**Law of Total Expectation**: $E[X] = E[E[X \\mid Y]] = \\int_{-\\infty}^\\infty E[X \\mid Y=y] f_Y(y) dy$.",
            "If $X, Y$ are independent, then $f_{X|Y}(x \\mid y) = f_X(x)$ and $E[X \\mid Y = y] = E[X]$."
        ],
        "example": "For $f(x, y) = 2$ on $x, y > 0, x+y < 1$: $f_Y(0.5) = 2(1 - 0.5) = 1$. Then $f_{X|Y}(x \\mid 0.5) = \\frac{2}{1} = 2$ on $0 < x < 0.5$, which is $U(0, 0.5)$! Hence $E[X \\mid Y = 0.5] = 0.25$.",
        "colloquiumTip": "Colloquium Problem 24 & Midterm 2017 Problem 6 ask this exact calculation! Divide joint density by marginal at the specific value.",
        "trap": "Don't forget the support of $X$ conditioned on $Y=y$! If $x+y < 1$ and $y=0.5$, then $x$ only ranges from $0$ to $0.5$."
    },
    {
        "id": 18,
        "name": "Distribution of Transformed Random Variable",
        "nameUa": "Розподіл перетвореної випадкової величини",
        "latex": "f_Y(y) = f_X(g^{-1}(y)) \\left| \\frac{d}{dy} g^{-1}(y) \\right|",
        "latexFull": "f_Y(y) = f_X(x) \\left| \\frac{dx}{dy} \\right| = \\frac{f_X(g^{-1}(y))}{|g'(g^{-1}(y))|}, \\quad \\text{for strictly monotonic, differentiable } g",
        "definition": "Finding the probability distribution of $Y = g(X)$ (or random vector $(U, V) = g(X, Y)$) from the known distribution of $X$.",
        "keyPoints": [
            "**Method 1: CDF Method (Always works!)**: Find $F_Y(y) = P(g(X) \\le y)$, express in terms of $F_X$, then differentiate: $f_Y(y) = F_Y'(y)$.",
            "**Method 2: Transformation Formula**: For strictly monotonic and differentiable $g$, $f_Y(y) = f_X(g^{-1}(y)) |(g^{-1})'(y)|$.",
            "**2D Jacobian Method**: For bijective $(u, v) = g(x, y)$, $f_{U,V}(u, v) = f_{X,Y}(x(u,v), y(u,v)) |J|$, where $J = \\det \\begin{pmatrix} \\frac{\\partial x}{\\partial u} & \\frac{\\partial x}{\\partial v} \\\\ \\frac{\\partial y}{\\partial u} & \\frac{\\partial y}{\\partial v} \\end{pmatrix}$."
        ],
        "example": "Let $Z \\sim N(0, 1)$ and $Y = 3 - 2Z$. Here $g(z) = 3 - 2z$ is decreasing. $z = g^{-1}(y) = \\frac{3-y}{2}$. Derivative $\\frac{dz}{dy} = -1/2$. Thus $f_Y(y) = \\phi\\left(\\frac{3-y}{2}\\right) \\cdot |-\\frac{1}{2}| = \\frac{1}{2\\sqrt{2\\pi}} e^{-(y-3)^2 / 8} \\implies Y \\sim N(3, 4)$.",
        "colloquiumTip": "In non-monotonic cases (e.g. $Y = X^2$), split into branches using CDF method: $F_Y(y) = P(-\\sqrt{y} \\le X \\le \\sqrt{y}) = F_X(\\sqrt{y}) - F_X(-\\sqrt{y})$.",
        "trap": "Always remember the **absolute value** of the derivative/Jacobian $|J|$!"
    },
    {
        "id": 19,
        "name": "Distribution of the Sum of Random Variables",
        "nameUa": "Розподіл суми випадкових величин (згортка)",
        "latex": "f_{X+Y}(z) = \\int_{-\\infty}^\\infty f_X(x) f_Y(z - x) \\, dx",
        "latexFull": "\\text{Discrete: } p_{X+Y}(z) = \\sum_x p_X(x) p_Y(z - x), \\quad \\text{Continuous: } f_{X+Y}(z) = \\int_{-\\infty}^\\infty f_X(x) f_Y(z - x) dx \\; (\\text{for indep. } X, Y)",
        "definition": "The distribution of $Z = X + Y$, known as the **convolution** of the distributions of $X$ and $Y$ when they are independent.",
        "keyPoints": [
            "General (dependent): $f_{X+Y}(z) = \\int_{-\\infty}^\\infty f_{X,Y}(x, z - x) dx$.",
            "Independent discrete: $p_{X+Y}(z) = \\sum_{x} p_X(x) p_Y(z - x)$.",
            "Alternative via Generating Functions: $G_{X+Y}(s) = G_X(s) G_Y(s)$ (discrete) or $M_{X+Y}(t) = M_X(t) M_Y(t)$ (continuous).",
            "Sum of independent Normals: $X_1 \\sim N(\\mu_1, \\sigma_1^2), X_2 \\sim N(\\mu_2, \\sigma_2^2) \\implies X_1 + X_2 \\sim N(\\mu_1 + \\mu_2, \\sigma_1^2 + \\sigma_2^2)$."
        ],
        "example": "Sum of two independent standard uniforms $X_1, X_2 \\sim U(0, 1)$: $f_{X_1+X_2}(z) = z$ for $0 \\le z \\le 1$, and $2 - z$ for $1 \\le z \\le 2$ (triangle distribution).",
        "colloquiumTip": "If asked to find the distribution of $X_1 + X_2$ for independent Poissons, show it via PGF ($e^{\\lambda_1(s-1)} e^{\\lambda_2(s-1)} = e^{(\\lambda_1+\\lambda_2)(s-1)}$) — examiners love this proof!",
        "trap": "Don't confuse the sum of variables $X+Y$ with the mixture of distributions!"
    },
    {
        "id": 20,
        "name": "Probability Generating Function (p.g.f.)",
        "nameUa": "Твірна функція ймовірностей (т.ф.й.)",
        "latex": "G_X(s) = E[s^X] = \\sum_{k=0}^\\infty p_X(k) s^k",
        "latexFull": "G_X(s) = E[s^X] = \\sum_{k=0}^\\infty P(X = k) s^k, \\quad |s| \\le 1, \\quad X \\in \\{0, 1, 2, \\dots\\}",
        "definition": "A power series representation of the probability mass function of a non-negative integer-valued random variable $X$.",
        "keyPoints": [
            "Defined at least on the closed interval $[-1, 1]$.",
            "**Normalization**: $G_X(1) = \\sum_{k=0}^\\infty p_X(k) = 1$.",
            "**Probability recovery**: $P(X = k) = \\frac{G_X^{(k)}(0)}{k!}$. In particular, $P(X = 0) = G_X(0)$.",
            "**Factorial moments**: $G_X'(1) = E[X]$, and $G_X''(1) = E[X(X-1)] = E[X^2] - E[X]$.",
            "**Variance formula**: $\\text{Var}(X) = G_X''(1) + G_X'(1) - (G_X'(1))^2$.",
            "**Sum of independent RVs**: If $X, Y$ are independent, $G_{X+Y}(s) = E[s^{X+Y}] = E[s^X s^Y] = G_X(s) G_Y(s)$."
        ],
        "example": "Poisson $X \\sim P(\\lambda)$: $G_X(s) = \\sum_{k=0}^\\infty \\frac{\\lambda^k e^{-\\lambda}}{k!} s^k = e^{-\\lambda} \\sum \\frac{(\\lambda s)^k}{k!} = e^{-\\lambda} e^{\\lambda s} = e^{\\lambda(s-1)}$.",
        "colloquiumTip": "Colloquium Question 7: You must derive $G'(1) = E[X]$ by taking derivative inside the sum $\\frac{d}{ds} \\sum p(k) s^k = \\sum k p(k) s^{k-1}$ and setting $s=1$.",
        "trap": "Remember that $G_X''(1)$ is NOT $E[X^2]$! It is the second factorial moment $E[X(X-1)]$. You must add $E[X]$ to get $E[X^2]$."
    },
    {
        "id": 21,
        "name": "Moment Generating Function (m.g.f.)",
        "nameUa": "Твірна функція моментів (т.ф.м.)",
        "latex": "M_X(t) = E[e^{tX}]",
        "latexFull": "M_X(t) = E[e^{tX}] = \\int_{-\\infty}^\\infty e^{tx} f_X(x) \\, dx \\quad (\\text{or } \\sum e^{tk} p_X(k))",
        "definition": "An alternative specification of the probability distribution of random variable $X$ via the expectation of $e^{tX}$, defined for all $t$ where this expectation is finite.",
        "keyPoints": [
            "**Value at zero**: $M_X(0) = E[e^0] = 1$.",
            "**Moment generation**: Expanding $e^{tX} = \\sum_{k=0}^\\infty \\frac{t^k X^k}{k!}$ shows that $M_X^{(k)}(0) = E[X^k]$.",
            "**Affine transform**: $M_{aX+b}(t) = E[e^{t(aX+b)}] = e^{bt} M_X(at)$.",
            "**Sum of independent RVs**: If $X, Y$ are independent, $M_{X+Y}(t) = M_X(t) M_Y(t)$.",
            "**Uniqueness Theorem**: If $M_X(t) = M_Y(t)$ in an open interval containing 0, then $F_X(x) = F_Y(x)$ for all $x$."
        ],
        "example": "Standard normal $Z \\sim N(0, 1)$: $M_Z(t) = E[e^{tZ}] = \\int_{-\\infty}^\\infty e^{tz} \\frac{1}{\\sqrt{2\\pi}} e^{-z^2/2} dz = e^{t^2/2}$. Then $M_Z'(0) = 0$ (mean), $M_Z''(0) = 1$ (variance).",
        "colloquiumTip": "Explain the difference between PGF and MGF: PGF is for non-negative integer RVs with dummy variable $s$ ($E[s^X]$); MGF is for general RVs with parameter $t$ ($E[e^{tX}]$). Connection: $M_X(t) = G_X(e^t)$.",
        "trap": "MGF might not exist for distributions with heavy tails, such as Cauchy or log-normal."
    }
]

# Write out to confirm definitions count
print("Definitions defined: ", len(DEFINITIONS_21))
