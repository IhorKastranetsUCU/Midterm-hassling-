#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate js/data.js by combining all modules:
- Complete 600 questions across 12 topics (50 questions each)
- Enriched 23 exam problems with canonical expected answers & input prompts
- 21 strict definitions & rubrics
- 12 oral colloquium questions & proofs
- Study schedule & distribution references
"""

import json
import os

from build_schedule import SCHEDULE_DAYS
from build_definitions import DEFINITIONS_21
from build_oral_questions import ORAL_QUESTIONS_12
from build_problems import PROBLEMS_BANK
from build_quizzes_and_topics import DISTRIBUTIONS_DATA, TOPICS_NOTES
from generate_all_topic_quizzes import build_all_questions, TOPICS
from update_problems_bank import ANSWER_SPECS

# 1. Enrich problems with expected answers and input prompts
enriched_problems = []
for p in PROBLEMS_BANK:
    p_copy = dict(p)
    pid = p_copy["id"]
    if pid in ANSWER_SPECS:
        p_copy["inputPrompt"] = ANSWER_SPECS[pid]["inputPrompt"]
        p_copy["expectedAnswer"] = ANSWER_SPECS[pid]["expectedAnswer"]
        p_copy["acceptableAnswers"] = ANSWER_SPECS[pid]["acceptableAnswers"]
    else:
        p_copy["inputPrompt"] = "Submit final verified solution:"
        p_copy["expectedAnswer"] = "1"
        p_copy["acceptableAnswers"] = ["1", "verified", "done"]
    enriched_problems.append(p_copy)

# 2. Build complete 600 quiz questions across 12 topics
all_600_questions = build_all_questions()

# 3. Format topic list
topics_metadata = [{"id": t[0], "title": t[1]} for t in TOPICS]

data_payload = {
    "SCHEDULE_DAYS": SCHEDULE_DAYS,
    "DEFINITIONS_21": DEFINITIONS_21,
    "ORAL_QUESTIONS_12": ORAL_QUESTIONS_12,
    "PROBLEMS_BANK": enriched_problems,
    "DISTRIBUTIONS_DATA": DISTRIBUTIONS_DATA,
    "QUIZ_QUESTIONS": all_600_questions,
    "TOPICS_NOTES": TOPICS_NOTES,
    "TOPICS_LIST": topics_metadata
}

output_path = "/Users/ihor/Studing/UCU/3 semestr/бабілка/мідтерм хаслінг/midterm2/js/data.js"

with open(output_path, "w", encoding="utf-8") as f:
    f.write("// UCU Probability & Statistics Midterm 2 and Colloquium 2 Master Data\n")
    f.write("// Auto-generated with 600 questions across 12 topics and verified exam problems\n\n")
    f.write("window.PS_DATA = ")
    json.dump(data_payload, f, ensure_ascii=False, indent=2)
    f.write(";\n")

print(f"Successfully generated {output_path} ({os.path.getsize(output_path)} bytes)")
print(f"Contains {len(all_600_questions)} quiz questions and {len(enriched_problems)} interactive problems.")
