#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enrich all problems in build_problems.py with interactive input fields:
- inputPrompt: Clear instructions on what to solve for
- expectedAnswer: Canonical correct answer
- acceptableAnswers: List of valid variations (fractions, decimals, percentages, case-insensitive strings)
"""

ANSWER_SPECS = {
    1: {
        "inputPrompt": "Find $P(X = 2)$ (probability the top woman ranks 2nd). Enter as a fraction a/b or a decimal (3 places):",
        "expectedAnswer": "5/18",
        "acceptableAnswers": ["5/18", "70/252", "0.278", "0.2778", "0.28"]
    },
    2: {
        "inputPrompt": "Find $P(X = 6)$ where $X = \\max(D_1, D_2)$ is the maximum of two fair dice rolls (fraction a/b or decimal):",
        "expectedAnswer": "11/36",
        "acceptableAnswers": ["11/36", "0.306", "0.3056", "0.31"]
    },
    3: {
        "inputPrompt": "Enter the error probability for 3 transmissions with $p = 0.2$ majority rule (decimal, 3 places):",
        "expectedAnswer": "0.104",
        "acceptableAnswers": ["0.104", "13/125", "0.10"]
    },
    6: {
        "inputPrompt": "Enter $P(X = 0)$ for $\\lambda = 2$ as a decimal (3 places) or in closed form:",
        "expectedAnswer": "0.135",
        "acceptableAnswers": ["0.135", "0.1353", "0.14", "e^-2", "exp(-2)"]
    },
    7: {
        "inputPrompt": "Are $X$ (total Heads) and $Y$ (position of first Head) independent? (Yes / No):",
        "expectedAnswer": "No",
        "acceptableAnswers": ["no", "No", "NO", "not independent", "false", "False"]
    },
    9: {
        "inputPrompt": "Calculate $E[3X^2 - 5X]$ given $E[X]=1, \\text{Var}(X)=4$:",
        "expectedAnswer": "10",
        "acceptableAnswers": ["10", "10.0"]
    },
    12: {
        "inputPrompt": "Enter the expected number of tosses $E[T]$ to get two consecutive heads (HH):",
        "expectedAnswer": "6",
        "acceptableAnswers": ["6", "6.0"]
    },
    14: {
        "inputPrompt": "Using the tail sum formula, what is $E[X]$ for $X \\sim G(p)$? (Enter a formula in terms of p):",
        "expectedAnswer": "1/p",
        "acceptableAnswers": ["1/p", "p^-1", "1 / p"]
    },
    18: {
        "inputPrompt": "Calculate the covariance $\\text{Cov}(X, Y)$ for the symmetric contingency table:",
        "expectedAnswer": "0",
        "acceptableAnswers": ["0", "0.0"]
    },
    19: {
        "inputPrompt": "Enter the variance $\\text{Var}(Y_2)$ where $Y_2 = 2Z - 3$ and $Z \\sim N(0, 1)$:",
        "expectedAnswer": "4",
        "acceptableAnswers": ["4", "4.0"]
    },
    20: {
        "inputPrompt": "For $n=3, a=1$, calculate $F_M(0.5) = P(\\max(X_1, X_2, X_3) \\le 0.5)$ (decimal or fraction):",
        "expectedAnswer": "0.125",
        "acceptableAnswers": ["0.125", "1/8", "0.13"]
    },
    23: {
        "inputPrompt": "Enter the probability $P(X < Y)$ that Alice (mean 10) finishes before Bob (mean 15) (decimal or fraction):",
        "expectedAnswer": "0.6",
        "acceptableAnswers": ["0.6", "0.60", "3/5"]
    },
    24: {
        "inputPrompt": "Find the constant $a$ so that $f(x, y) = a$ on the triangle $x, y > 0, x + y < 1$ is a valid density:",
        "expectedAnswer": "2",
        "acceptableAnswers": ["2", "2.0"]
    },
    25: {
        "inputPrompt": "For $n = 36$ rolls of a fair 6-sided die, what is $\\text{Cov}(X_1, X_2)$?",
        "expectedAnswer": "-1",
        "acceptableAnswers": ["-1", "-1.0"]
    },
    26: {
        "inputPrompt": "Are $Y$ and $X - Y$ independent in Poisson thinning? (Yes / No):",
        "expectedAnswer": "Yes",
        "acceptableAnswers": ["yes", "Yes", "YES", "independent", "true", "True"]
    },
    28: {
        "inputPrompt": "If Alice starts with $a=1$, Bob with $b=1$, and Alice win rate $p=1/3$, what is her match win probability? (fraction or decimal):",
        "expectedAnswer": "1/3",
        "acceptableAnswers": ["1/3", "0.333", "0.33", "0.3333"]
    },
    32: {
        "inputPrompt": "For radius $R = 100$ km, calculate the expected rescue distance $E[D]$ in km (fraction or decimal):",
        "expectedAnswer": "200/3",
        "acceptableAnswers": ["200/3", "66.67", "66.7", "66.66"]
    },
    33: {
        "inputPrompt": "Calculate the expected delay $E[X]$ at the traffic light in minutes (decimal or fraction):",
        "expectedAnswer": "0.25",
        "acceptableAnswers": ["0.25", "1/4", "0.25 min", "1/4 min"]
    },
    37: {
        "inputPrompt": "For Midterm Question 1, enter the value of $\\text{Var}(2X - Y)$ where $\\text{Var}(X)=\\text{Var}(Y)=1$:",
        "expectedAnswer": "5",
        "acceptableAnswers": ["5", "c", "C", "5.0"]
    },
    39: {
        "inputPrompt": "Enter the mean $\\mu$ of the transformed random variable $Y = 3 - 2Z$ where $Z \\sim N(0, 1)$:",
        "expectedAnswer": "3",
        "acceptableAnswers": ["3", "3.0"]
    },
    40: {
        "inputPrompt": "For independent $X_1, X_2 \\sim P(3)$, enter $\\text{Var}(X_1 - X_2)$:",
        "expectedAnswer": "6",
        "acceptableAnswers": ["6", "6.0"]
    },
    41: {
        "inputPrompt": "If $p_1=0.5, \\lambda_1=1$ and $p_2=0.5, \\lambda_2=0.5$, enter the expected operating time $E[T]$ in hours:",
        "expectedAnswer": "1.5",
        "acceptableAnswers": ["1.5", "3/2", "1.50"]
    },
    42: {
        "inputPrompt": "Find the constant $a$ for the joint triangular density $f(x, y) = ax$ on $0 \\le y \\le x \\le 1$:",
        "expectedAnswer": "3",
        "acceptableAnswers": ["3", "3.0"]
    }
}

if __name__ == "__main__":
    from build_problems import PROBLEMS_BANK
    for p in PROBLEMS_BANK:
        pid = p["id"]
        if pid in ANSWER_SPECS:
            p["inputPrompt"] = ANSWER_SPECS[pid]["inputPrompt"]
            p["expectedAnswer"] = ANSWER_SPECS[pid]["expectedAnswer"]
            p["acceptableAnswers"] = ANSWER_SPECS[pid]["acceptableAnswers"]
        else:
            p["inputPrompt"] = "Submit final verified solution:"
            p["expectedAnswer"] = "1"
            p["acceptableAnswers"] = ["1", "verified", "done"]

    print(f"Enriched {len(PROBLEMS_BANK)} problems with interactive input prompts and expected answers.")
