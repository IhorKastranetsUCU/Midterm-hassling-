import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.config import get_settings

logger = logging.getLogger("gemini_service")


class GeminiService:
    """
    Client for Google Gemini API (gemini-2.0-flash).
    Provides structured syllabus parsing, educational textbook synthesis,
    practice quiz generation, flashcards, and Mermaid concept maps.
    """

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        settings = get_settings()
        self.api_key = (api_key or settings.GEMINI_API_KEY or "").strip()
        self.model = model or settings.GEMINI_MODEL or "gemini-2.0-flash"

    @property
    def is_available(self) -> bool:
        return bool(self.api_key)

    async def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.2,
        timeout: float = 30.0,
    ) -> Optional[str]:
        """Send prompt to Gemini 2.0 Flash API and return raw response text."""
        if not self.is_available:
            return None

        url = f"{self.BASE_URL}/{self.model}:generateContent?key={self.api_key}"

        payload: Dict[str, Any] = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
            },
        }

        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        headers = {"Content-Type": "application/json"}

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=payload, headers=headers)

            if resp.status_code != 200:
                logger.warning(
                    f"Gemini API returned HTTP {resp.status_code}: {resp.text[:300]}"
                )
                return None

            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
            return None
        except Exception as exc:
            logger.warning(f"Error calling Gemini API: {exc}")
            return None

    async def structure_syllabus_to_topics(
        self,
        course_title: str,
        sections: Optional[List[Dict[str, Any]]] = None,
        custom_syllabus_text: Optional[str] = None,
        target_score: int = 85,
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Use Gemini 2.0 Flash to analyze course materials/syllabus and produce
        a structured weekly progression of topics with distinctive keywords.
        """
        if not self.is_available:
            return None

        sections_desc = []
        if sections:
            for s in sections:
                s_name = s.get("name", "Section")
                mod_names = [m.get("name", "") for m in s.get("modules", []) if m.get("name")]
                sections_desc.append(f"- Section: '{s_name}'. Items: {', '.join(mod_names[:6])}")
        
        input_context = (
            f"Course Title: {course_title}\n"
            f"Target Score: {target_score}%\n\n"
            f"Moodle Sections:\n" + "\n".join(sections_desc) + "\n\n"
        )
        if custom_syllabus_text:
            input_context += f"Custom Syllabus / Notes:\n{custom_syllabus_text[:4000]}\n"

        prompt = f"""
Analyze the course curriculum materials below and organize them into a clean, chronological sequence of weekly study topics based on their TRUE ACADEMIC CONCEPTS.

CRITICAL ARCHITECTURAL RULES:
1. STRICTLY AVOID ADMINISTRATIVE CONTAINER LABELS as topic titles or concepts!
   Phrases such as "Topic 4", "Reading for topic 4", "Quiz 4", "Self-test", "Seminar 4", "Week 4", "Тема 4", "Colloquium", "Midterm exam" are NOT academic concepts.
   Instead, identify the actual subject taught inside each topic (e.g. if Topic 4 contains "Reading for topic 4" and "Discrete random variables", the true topic is "Дискретні випадкові величини (Discrete Random Variables)").
2. For each topic, extract the real substantive educational concepts (e.g. for "Expectation": Expected Value, Variance, Probability Distribution, Linearity of Expectation).
3. In `keywords`, include ONLY substantive domain/scientific terms (e.g. "discrete random variables", "pmf", "cumulative distribution", "expectation", "variance").
   NEVER include administrative words in keywords (NO: "topic", "reading", "quiz", "self-test", "seminar", "week", "тиждень", "тема", "колоквіум", "екзамен").
4. Filter out standalone exams or assessments ("Colloquium", "Midterm exam") from being standalone study topics; structure topics strictly by conceptual learning progression.

For each topic, provide:
1. topic_index: integer starting from 1 (Week 1, Week 2, etc.)
2. title: concise, descriptive topic title in Ukrainian (e.g. "Тиждень 4: Дискретні випадкові величини")
3. summary: 2-3 sentences overview in Ukrainian
4. key_concepts: list of 4-6 main educational concepts
5. keywords: list of 8-15 distinctive keywords and terms (both in Ukrainian and English, lowercase) used to automatically match lectures, files, and assignments to this topic
6. difficulty: "Basic", "Intermediate", or "Advanced"
7. estimated_hours: realistic study hours (2-8)
8. suggested_focus: key learning outcome to achieve the target score ({target_score}%)

Return ONLY a JSON array with this schema:
[
  {{
    "topic_index": 1,
    "title": "Тиждень 1: ...",
    "summary": "...",
    "key_concepts": ["концепт 1", "концепт 2"],
    "keywords": ["термін", "keyword", "alg", ...],
    "difficulty": "Basic",
    "estimated_hours": 3,
    "suggested_focus": "..."
  }}
]

Course Data:
{input_context}
"""
        res = await self.generate_content(
            prompt,
            system_instruction="You are an expert university curriculum architect. Output valid JSON array only.",
            json_mode=True,
            temperature=0.2,
        )
        if not res:
            return None

        try:
            clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", res.strip(), flags=re.MULTILINE)
            parsed = json.loads(clean_json)
            if isinstance(parsed, list) and len(parsed) > 0:
                return parsed
        except Exception as exc:
            logger.warning(f"Failed to parse Gemini syllabus response: {exc}")

        return None

    async def generate_book_section_content(
        self,
        title: str,
        content_text: str,
        keywords: Optional[List[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Synthesize interactive textbook markdown and takeaways with Gemini."""
        if not self.is_available:
            return None

        kw_str = ", ".join(keywords or [])
        prompt = f"""
You are an expert professor explaining the university topic: "{title}".
Ingested source material:
{content_text[:6000]}

Keywords: {kw_str}

Please generate an engaging, in-depth interactive study section in Markdown (Ukrainian language) covering:
1. Core theoretical foundations with clear intuition and examples
2. Real-world applications and key algorithms / principles
3. Common pitfalls and edge cases to watch out for
4. Key takeaways summary (4-6 bullets)

Return ONLY a JSON object:
{{
  "explanation_markdown": "# {title}\\n\\n...",
  "key_takeaways": ["Point 1", "Point 2", "Point 3", "Point 4"]
}}
"""
        res = await self.generate_content(
            prompt,
            system_instruction="You write high-quality academic textbook materials in Ukrainian. Return JSON only.",
            json_mode=True,
            temperature=0.3,
        )
        if not res:
            return None

        try:
            clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", res.strip(), flags=re.MULTILINE)
            return json.loads(clean_json)
        except Exception:
            return None

    async def generate_practice_quizzes(
        self,
        title: str,
        key_points: List[str],
        num_questions: int = 3,
    ) -> Optional[List[Dict[str, Any]]]:
        """Generate high-yield conceptual practice questions with Gemini."""
        if not self.is_available:
            return None

        points_str = "\n".join(f"- {p}" for p in key_points)
        prompt = f"""
Generate {num_questions} multiple-choice conceptual practice questions for university students on topic: "{title}".
Key points covered:
{points_str}

Requirements:
- Each question must test understanding, not trivia.
- Exactly 4 options per question.
- Distinct, realistic distractors.
- correct_index: 0, 1, 2, or 3.
- explanation: clear rationale why the correct answer is right and why distractors are wrong.
- Language: Ukrainian.

Return ONLY a JSON array:
[
  {{
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0,
    "explanation": "..."
  }}
]
"""
        res = await self.generate_content(
            prompt,
            system_instruction="You are an exam designer creating conceptual practice quizzes in Ukrainian. Return JSON only.",
            json_mode=True,
            temperature=0.3,
        )
        if not res:
            return None

        try:
            clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", res.strip(), flags=re.MULTILINE)
            data = json.loads(clean_json)
            if isinstance(data, list):
                return data
        except Exception:
            pass
        return None

    async def generate_flashcards(
        self,
        title: str,
        key_points: List[str],
        num_cards: int = 4,
    ) -> Optional[List[Dict[str, str]]]:
        """Generate spaced-repetition flashcards with Gemini."""
        if not self.is_available:
            return None

        points_str = "\n".join(f"- {p}" for p in key_points)
        prompt = f"""
Generate {num_cards} spaced-repetition flashcards for topic: "{title}".
Key concepts:
{points_str}

Each card should have:
- "front": short prompt, term, or question
- "back": clear, memorable definition, formula, or principle
- "tag": short topic tag (e.g. "{title[:20]}")
- Language: Ukrainian.

Return ONLY a JSON array:
[
  {{
    "front": "...",
    "back": "...",
    "tag": "..."
  }}
]
"""
        res = await self.generate_content(
            prompt,
            system_instruction="Return JSON array of flashcards only.",
            json_mode=True,
            temperature=0.3,
        )
        if not res:
            return None

        try:
            clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", res.strip(), flags=re.MULTILINE)
            data = json.loads(clean_json)
            if isinstance(data, list):
                return data
        except Exception:
            pass
        return None

    async def generate_mermaid_diagram(
        self,
        title: str,
        key_points: List[str],
    ) -> Optional[str]:
        """Generate valid Mermaid flowchart TD code with Gemini."""
        if not self.is_available:
            return None

        points_str = "\n".join(f"- {p}" for p in key_points[:6])
        prompt = f"""
Generate clean, valid Mermaid.js flowchart diagram code (flowchart TD) illustrating the relationships between key concepts in topic "{title}".
Concepts:
{points_str}

Rules:
- Start with `flowchart TD`
- Use sanitized node IDs without special characters (e.g. A["Concept Name"])
- Wrap all labels in double quotes inside square brackets
- Keep labels under 35 characters
- Max 8 nodes
- Output ONLY the raw Mermaid diagram text (no markdown fences, no backticks).
"""
        res = await self.generate_content(
            prompt,
            system_instruction="Output valid Mermaid.js diagram code only without markdown formatting.",
            temperature=0.2,
        )
        if not res:
            return None

        clean = re.sub(r"^```(?:mermaid)?\s*|\s*```$", "", res.strip(), flags=re.MULTILINE).strip()
        if clean.startswith("flowchart") or clean.startswith("graph"):
            return clean
        return None
