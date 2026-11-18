import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.config import get_settings
from app.services.learning_provider import current_provider, LearningProviderError, provider_http_error

logger = logging.getLogger("gemini_service")

_VERTEX_TOKEN_CACHE: Dict[str, Any] = {"token": None, "expires_at": 0.0}


class GeminiService:
    """
    Client for Google Gemini API (AI Studio API key or Google Cloud Vertex AI).
    Provides structured syllabus parsing, educational textbook synthesis,
    practice quiz generation, flashcards, and Mermaid concept maps.
    """

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        settings = get_settings()
        provider = current_provider.get()
        explicit_key = (api_key or "").strip()
        personal_key = provider.api_key.strip() if provider and provider.source == "personal" and provider.api_key else ""
        if explicit_key:
            self.api_key = explicit_key
            self.vertex_project = ""
        elif personal_key:
            self.api_key = personal_key
            self.vertex_project = ""
        elif (settings.VERTEX_AI_PROJECT or "").strip():
            self.api_key = ""
            self.vertex_project = settings.VERTEX_AI_PROJECT.strip()
        else:
            self.api_key = ((provider.api_key if provider else None) or settings.GEMINI_API_KEY or "").strip()
            self.vertex_project = ""
        self.vertex_location = (settings.VERTEX_AI_LOCATION or "global").strip() or "global"
        self.model = model or (provider.model if provider else None) or settings.GEMINI_MODEL or "gemini-2.0-flash"
        self.strict = bool(provider and provider.strict)

    @property
    def is_available(self) -> bool:
        return bool(self.api_key or self.vertex_project)

    async def _get_vertex_token(self, force_refresh: bool = False) -> Optional[str]:
        env_token = (os.getenv("VERTEX_AI_ACCESS_TOKEN") or "").strip()
        if env_token:
            return env_token
        now = time.monotonic()
        if not force_refresh and _VERTEX_TOKEN_CACHE["token"] and _VERTEX_TOKEN_CACHE["expires_at"] > now:
            return _VERTEX_TOKEN_CACHE["token"]
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(
                    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
                    headers={"Metadata-Flavor": "Google"},
                )
            if res.status_code != 200:
                logger.warning("Vertex metadata token request returned HTTP %s", res.status_code)
                return None
            payload = res.json()
            tok = (payload.get("access_token") or "").strip()
            if not tok:
                return None
            ttl = max(60, int(payload.get("expires_in", 3600)) - 60)
            _VERTEX_TOKEN_CACHE["token"] = tok
            _VERTEX_TOKEN_CACHE["expires_at"] = now + ttl
            return tok
        except Exception as exc:
            logger.warning("Vertex metadata token error (%s)", type(exc).__name__)
            return None

    async def generate_content(
        self,
        prompt: str = "",
        system_instruction: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.2,
        timeout: float = 30.0,
        extra_parts: Optional[List[Dict[str, Any]]] = None,
        parts: Optional[List[Dict[str, Any]]] = None,
        raise_on_error: bool = False,
    ) -> Optional[str]:
        """Send prompt to Gemini API (Vertex AI or AI Studio) and return raw response text."""
        if not self.is_available:
            return None

        req_parts: List[Dict[str, Any]] = list(extra_parts or parts or [])
        if prompt:
            req_parts.append({"text": prompt})
        if not req_parts:
            return None
        payload: Dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": req_parts,
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

        should_raise = self.strict or raise_on_error
        try:
            if self.vertex_project:
                host = (
                    "aiplatform.googleapis.com"
                    if self.vertex_location == "global"
                    else f"{self.vertex_location}-aiplatform.googleapis.com"
                )
                url = (
                    f"https://{host}/v1/projects/{self.vertex_project}/locations/"
                    f"{self.vertex_location}/publishers/google/models/{self.model}:generateContent"
                )
                resp = None
                for attempt in range(2):
                    tok = await self._get_vertex_token(force_refresh=(attempt == 1))
                    if not tok:
                        if should_raise:
                            raise LearningProviderError("Не вдалося отримати токен Vertex AI на сервері.")
                        return None
                    headers = {
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {tok}",
                        "X-Goog-User-Project": self.vertex_project,
                    }
                    async with httpx.AsyncClient(timeout=timeout) as client:
                        resp = await client.post(url, json=payload, headers=headers)
                    if resp.status_code == 401 and attempt == 0:
                        _VERTEX_TOKEN_CACHE["token"] = None
                        continue
                    break
            else:
                url = f"{self.BASE_URL}/{self.model}:generateContent"
                headers = {"Content-Type": "application/json", "x-goog-api-key": self.api_key}
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(url, json=payload, headers=headers)

            if resp is None or resp.status_code != 200:
                code = resp.status_code if resp is not None else 502
                safe_detail = ""
                if resp is not None:
                    try:
                        err_obj = (resp.json() or {}).get("error") or {}
                        safe_detail = str(err_obj.get("message") or err_obj.get("status") or "").strip()
                    except Exception:
                        safe_detail = ""
                    if self.api_key and self.api_key in safe_detail:
                        safe_detail = safe_detail.replace(self.api_key, "[redacted]")
                    safe_detail = safe_detail[:160]
                provider_kind = "vertex" if self.vertex_project else "studio"
                logger.warning("Gemini API (%s) returned HTTP %s%s", provider_kind, code, f": {safe_detail}" if safe_detail else "")
                if should_raise:
                    raise provider_http_error(code, source=provider_kind, detail=safe_detail if code == 400 else "")
                return None

            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates:
                resp_parts = candidates[0].get("content", {}).get("parts", [])
                if resp_parts:
                    return "\n".join(part.get("text", "") for part in resp_parts if not part.get("thought"))
                finish_reason = candidates[0].get("finishReason")
                if finish_reason:
                    logger.warning("Gemini returned empty parts with finishReason=%s", finish_reason)
                    if should_raise:
                        raise LearningProviderError(f"Gemini не зміг згенерувати матеріал ({finish_reason}).", 422)
            elif data.get("promptFeedback", {}).get("blockReason"):
                block_reason = data["promptFeedback"]["blockReason"]
                logger.warning("Gemini blocked prompt with blockReason=%s", block_reason)
                if should_raise:
                    raise LearningProviderError(f"Gemini заблокував запит ({block_reason}).", 422)
            if should_raise:
                raise LearningProviderError("Gemini не повернув навчальний матеріал. Спробуй ще раз.")
            return None
        except LearningProviderError:
            raise
        except Exception as exc:
            logger.warning("Error calling Gemini API (%s)", type(exc).__name__)
            if should_raise:
                if isinstance(exc, httpx.TimeoutException):
                    raise LearningProviderError("Gemini занадто довго обробляє запит. Спробуй ще раз.") from None
                raise LearningProviderError("Не вдалося отримати матеріали від Gemini. Спробуй ще раз.") from None
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
        course_title: str = "",
        topic_title: str = "",
    ) -> Optional[Dict[str, Any]]:
        """Synthesize interactive textbook markdown and takeaways with Gemini."""
        if not self.is_available:
            return None

        kw_str = ", ".join(keywords or [])
        context_lines = []
        if course_title:
            context_lines.append(f'Course: "{course_title}"')
        if topic_title and topic_title.strip() != title.strip():
            context_lines.append(f'Topic: "{topic_title}"')
        context_block = ("\n".join(context_lines) + "\n") if context_lines else ""
        prompt = f"""
You are an expert university professor explaining this course material:
{context_block}Section title: "{title}"
Ingested source material:
{content_text[:6000]}

Keywords: {kw_str}

Grounding rules:
- Stay strictly within the academic domain of the Course and Topic above.
- Never drift into unrelated disciplines (e.g. generic study methods like SQ3R or unrelated ML topics) unless explicitly present in the source text.
- Never treat Moodle activity names (Reading, Seminar, Quiz, Bonus activities) as course concepts to meta-explain.
- If the ingested source text is sparse or only a title/outline, explain the actual domain theory, definitions, and intuition corresponding to the Course + Topic + Section title.

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
            system_instruction="You write high-quality academic textbook materials in Ukrainian strictly grounded in the course subject. Return JSON only.",
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
        course_title: str = "",
        content_text: str = "",
    ) -> Optional[List[Dict[str, Any]]]:
        """Generate high-yield conceptual practice questions with Gemini."""
        if not self.is_available:
            return None

        points_str = "\n".join(f"- {p}" for p in key_points)
        course_line = f'Course: "{course_title}"\n' if course_title else ""
        source_block = f'\nSource material excerpt:\n{content_text[:3500]}\n' if content_text else ""
        prompt = f"""
Generate {num_questions} multiple-choice conceptual practice questions for university students on:
{course_line}Topic: "{title}"
Key points covered:
{points_str}{source_block}

Requirements:
- Stay strictly inside the academic subject of {course_title or title} and test actual domain knowledge, formulas, theorems, or problem-solving for "{title}".
- NEVER ask trivia or meta-questions about Moodle logistics or course components (such as what Reading folders, Seminars, Quizzes, Self-tests, or Extra/bonus activities are for).
- NEVER drift into unrelated subjects outside the course.
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
            system_instruction="You are an exam designer creating conceptual subject-matter quizzes in Ukrainian. Never write questions about Moodle navigation or unrelated subjects. Return JSON only.",
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
        course_title: str = "",
    ) -> Optional[List[Dict[str, str]]]:
        """Generate spaced-repetition flashcards with Gemini."""
        if not self.is_available:
            return None

        points_str = "\n".join(f"- {p}" for p in key_points)
        course_line = f'Course: "{course_title}"\n' if course_title else ""
        prompt = f"""
Generate {num_cards} spaced-repetition flashcards for:
{course_line}Topic: "{title}"
Key concepts:
{points_str}

Requirements:
- Every card must belong strictly to the academic subject of {course_title or title} — topic "{title}" (core definitions, formulas, theorems, or domain principles).
- Ignore any generic study-advice phrases or unrelated subjects.
- Never create cards about Moodle structure (seminars, bonus tasks, reading folders).
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
            system_instruction="You create subject-matter flashcards in Ukrainian strictly grounded in the given course and topic. Return JSON array of flashcards only.",
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
        course_title: str = "",
    ) -> Optional[str]:
        """Generate valid Mermaid flowchart TD code with Gemini."""
        if not self.is_available:
            return None

        points_str = "\n".join(f"- {p}" for p in key_points[:6])
        course_line = f' in course "{course_title}"' if course_title else ""
        prompt = f"""
Generate clean, valid Mermaid.js flowchart diagram code (flowchart TD) illustrating the relationships between key domain concepts in topic "{title}"{course_line}.
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

    async def summarize_youtube_video(
        self,
        youtube_url: str,
        title: str = "",
        course_title: str = "",
        raise_on_error: bool = False,
    ) -> Optional[str]:
        """Extract structured lecture notes from a YouTube URL natively via Gemini fileData."""
        if not self.is_available:
            return None
        from app.services.video_transcriber import VideoTranscriberService
        norm = VideoTranscriberService.normalize_youtube_url(youtube_url)
        if not norm:
            return None

        ctx = []
        if course_title:
            ctx.append(f'Course: "{course_title}"')
        if title:
            ctx.append(f'Material/Topic: "{title}"')
        ctx_line = ("\n".join(ctx) + "\n") if ctx else ""
        prompt = (
            f"{ctx_line}"
            "Watch and listen to this educational video and write structured study notes in Ukrainian "
            "covering all key definitions, formulas (using LaTeX $...$ / $$...$$ when appropriate), "
            "theorems, examples, and step-by-step explanations taught in the video. "
            "Include only content actually presented in the video."
        )
        try:
            return await self.generate_content(
                prompt,
                system_instruction="You extract accurate academic lecture notes from educational videos in Ukrainian.",
                temperature=0.2,
                timeout=120.0,
                extra_parts=[{"fileData": {"fileUri": norm, "mimeType": "video/mp4"}}],
            )
        except LearningProviderError as exc:
            if raise_on_error:
                raise
            logger.warning("Gemini YouTube video extraction failed for %s (%s)", norm, getattr(exc, "message", exc))
            return None
        except Exception as exc:
            logger.warning("Unexpected YouTube Gemini extraction error (%s)", type(exc).__name__)
            return None
