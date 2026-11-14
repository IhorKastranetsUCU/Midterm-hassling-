import io
import logging
import re
import uuid
import xml.etree.ElementTree as ET
import zipfile
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import List, Optional

from app.models.mix import (
    CourseToolsConfig,
    ExamMix,
    Flashcard,
    InteractiveBookSection,
    PracticeQuestion,
    RawTopicSnapshot,
    TopicMix,
)

logger = logging.getLogger("mix_generator")


def _safe_mermaid_label(text: str, max_len: int = 42) -> str:
    """Sanitize and truncate node text so Mermaid syntax stays valid."""
    cleaned = re.sub(r'["`\[\]\(\){};<>]', " ", text or "").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if len(cleaned) > max_len:
        cleaned = cleaned[: max_len - 3].rstrip() + "..."
    return cleaned or "Topic Node"


def extract_text_from_upload(filename: str, raw_bytes: bytes) -> str:
    """
    Lightweight local text extractor for uploaded study materials (.txt, .md, .html, .docx, .pptx, .pdf).
    Requires zero external ML/API dependencies; PDF falls back to printable text scan if pypdf is absent.
    """
    lower = (filename or "").lower()

    if lower.endswith((".txt", ".md", ".csv", ".json")):
        return raw_bytes.decode("utf-8", errors="ignore").strip()

    if lower.endswith((".html", ".htm")):
        html = raw_bytes.decode("utf-8", errors="ignore")
        text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        return re.sub(r"\s+", " ", text).strip()

    if lower.endswith(".docx"):
        try:
            with zipfile.ZipFile(io.BytesIO(raw_bytes)) as zf:
                xml_bytes = zf.read("word/document.xml")
            root = ET.fromstring(xml_bytes)
            paragraphs = []
            for p in root.iter():
                if p.tag.endswith("}p"):
                    texts = [node.text for node in p.iter() if node.tag.endswith("}t") and node.text]
                    if texts:
                        paragraphs.append("".join(texts))
            return "\n".join(paragraphs).strip()
        except Exception as exc:
            logger.warning(f"DOCX extraction failed for {filename}: {exc}")

    if lower.endswith(".pptx"):
        try:
            slides_text: List[str] = []
            with zipfile.ZipFile(io.BytesIO(raw_bytes)) as zf:
                slide_names = sorted(
                    n for n in zf.namelist() if n.startswith("ppt/slides/slide") and n.endswith(".xml")
                )
                for idx, slide_name in enumerate(slide_names, start=1):
                    root = ET.fromstring(zf.read(slide_name))
                    chunks = [node.text.strip() for node in root.iter() if node.tag.endswith("}t") and node.text]
                    if chunks:
                        slides_text.append(f"## Slide {idx}\n" + "\n".join(chunks))
            return "\n\n".join(slides_text).strip()
        except Exception as exc:
            logger.warning(f"PPTX extraction failed for {filename}: {exc}")

    if lower.endswith(".pdf"):
        try:
            import pypdf  # type: ignore

            reader = pypdf.PdfReader(io.BytesIO(raw_bytes))
            pages = [page.extract_text() or "" for page in reader.pages]
            extracted = "\n\n".join(p.strip() for p in pages if p.strip())
            if extracted:
                return extracted
        except ImportError:
            pass
        except Exception as exc:
            logger.warning(f"pypdf extraction failed for {filename}: {exc}")

        # Fallback readable ASCII/UTF stream scan so PDF upload still yields inspectable structure
        decoded = raw_bytes.decode("latin-1", errors="ignore")
        ascii_runs = re.findall(r"[A-Za-z0-9\s,.;:()\-_/]{18,}", decoded)
        snippet = "\n".join(run.strip() for run in ascii_runs[:40])
        if snippet:
            return f"[PDF Uploaded: {filename} — Connect AI/pypdf parser for full OCR]\n{snippet}"
        return f"[PDF Uploaded: {filename} ({len(raw_bytes)} bytes) — ready for AI document ingestion]"

    return raw_bytes.decode("utf-8", errors="ignore").strip() or f"[Uploaded file: {filename}]"


class BaseMixGenerator(ABC):
    """
    Extension seam for the AI Engineer.
    Swap StructuredPlaceholderMixGenerator with an LLM provider (Gemini/OpenAI Structured Output)
    without modifying backend routers or frontend components.
    """

    @abstractmethod
    async def generate_topic_mix(
        self,
        snapshot: RawTopicSnapshot,
        tools: CourseToolsConfig,
        topic_index: int = 0,
        existing_notes: Optional[str] = None,
        version: int = 1,
    ) -> TopicMix:
        """Build a Level 1 TopicMix from a sanitized RawTopicSnapshot."""

    @abstractmethod
    async def generate_exam_mix(
        self,
        course_id: int,
        authority: str,
        course_title: str,
        topic_mixes: List[TopicMix],
    ) -> ExamMix:
        """Build a Level 2 ExamMix ('Mix of Mixes') from Level 1 TopicMix summaries."""


class StructuredPlaceholderMixGenerator(BaseMixGenerator):
    """
    Deterministic, zero-cost mix builder used before plugging in live AI models.
    Parses extracted headings/lines into structured interactive book sections, Mermaid diagrams,
    visual concept cards, practice quizzes, flashcards, and combined exam packs.
    """

    async def generate_topic_mix(
        self,
        snapshot: RawTopicSnapshot,
        tools: CourseToolsConfig,
        topic_index: int = 0,
        existing_notes: Optional[str] = None,
        version: int = 1,
    ) -> TopicMix:
        lines = [ln.strip() for ln in snapshot.content_text.splitlines() if ln.strip()]
        bullets = [re.sub(r"^[\-\*\d\.\)]+\s*", "", ln) for ln in lines if len(ln) > 4]
        key_points = bullets[:5] or [f"Core concepts covered in {snapshot.title}"]

        book_sections: List[InteractiveBookSection] = []
        if tools.interactive_book:
            mermaid_code = None
            if tools.mermaid_diagrams:
                root_lbl = _safe_mermaid_label(snapshot.title, 36)
                node_lines = [f'  T["{root_lbl}"]']
                for i, pt in enumerate(key_points[:4], start=1):
                    node_lines.append(f'  T --> N{i}["{_safe_mermaid_label(pt, 32)}"]')
                mermaid_code = "flowchart TD\n" + "\n".join(node_lines)

            summary_body = "\n".join(f"- {pt}" for pt in key_points[:6])
            explanation = (
                f"### Overview of {snapshot.title}\n\n"
                f"This interactive unit organizes material from **{snapshot.source_type}** "
                f"(`{snapshot.source_id}`) without modifying or storing restricted exam items.\n\n"
                f"{summary_body}"
            )

            book_sections.append(
                InteractiveBookSection(
                    heading=snapshot.title,
                    explanation_markdown=explanation,
                    key_takeaways=key_points[:4],
                    mermaid_diagram=mermaid_code,
                    visual_card_caption=f"Concept Card: {snapshot.title}" if tools.visual_cards else None,
                    visual_card_prompt=(
                        f"Clean educational infographic illustrating: {snapshot.title}"
                        if tools.visual_cards
                        else None
                    ),
                )
            )

        quizzes: List[PracticeQuestion] = []
        if tools.practice_quizzes:
            primary_concept = key_points[0] if key_points else snapshot.title
            distractors = [
                pt for pt in key_points[1:4] if pt != primary_concept
            ]
            while len(distractors) < 3:
                distractors.append(f"Unrelated topic outside {snapshot.title}")

            options = [primary_concept] + distractors[:3]
            quizzes.append(
                PracticeQuestion(
                    question=f"Which key concept is explicitly introduced in '{snapshot.title}'?",
                    options=options,
                    correct_index=0,
                    explanation=f"Grounded in ingested source material for '{snapshot.title}'. (AI Engineer will enrich with deep LLM questions.)",
                    topic_ref=snapshot.title,
                )
            )
            if len(key_points) > 1:
                quizzes.append(
                    PracticeQuestion(
                        question=f"How many core study items were indexed for '{snapshot.title}'?",
                        options=[
                            f"{len(bullets)} extracted points/modules",
                            "Zero public materials",
                            "Restricted final exam keys only",
                            "External unverified syllabus",
                        ],
                        correct_index=0,
                        explanation="Computed deterministically during pre-AI topic ingestion.",
                        topic_ref=snapshot.title,
                    )
                )

        flashcards: List[Flashcard] = []
        if tools.flashcards:
            for idx, pt in enumerate(key_points[:4], start=1):
                flashcards.append(
                    Flashcard(
                        front=f"{snapshot.title} — Key Concept #{idx}",
                        back=pt,
                        tag=snapshot.title,
                    )
                )

        mix_id = f"mix-{snapshot.course_id}-{topic_index}-{snapshot.source_hash[:8]}"
        now = datetime.now(timezone.utc)
        return TopicMix(
            mix_id=mix_id,
            course_id=snapshot.course_id,
            authority=snapshot.authority,
            topic_index=topic_index,
            title=snapshot.title,
            source_hash=snapshot.source_hash or "",
            version=version,
            visibility=snapshot.visibility,
            tools_enabled=tools,
            book_sections=book_sections,
            quizzes=quizzes,
            flashcards=flashcards,
            user_notes=existing_notes,
            has_upstream_update=False,
            created_at=now,
            updated_at=now,
        )

    async def generate_exam_mix(
        self,
        course_id: int,
        authority: str,
        course_title: str,
        topic_mixes: List[TopicMix],
    ) -> ExamMix:
        included_ids = [m.mix_id for m in topic_mixes]
        cheatsheet_lines = [f"# {course_title} — Exam Prep Master Mix", ""]
        mermaid_lines = ["flowchart LR", f'  E["Exam: {_safe_mermaid_label(course_title, 30)}"]']
        combined_questions: List[PracticeQuestion] = []
        focus_areas: List[str] = []

        for idx, mix in enumerate(topic_mixes, start=1):
            focus_areas.append(mix.title)
            mermaid_lines.append(f'  E --> M{idx}["{_safe_mermaid_label(mix.title, 30)}"]')

            cheatsheet_lines.append(f"## {idx}. {mix.title}")
            for sec in mix.book_sections:
                for tk in sec.key_takeaways:
                    cheatsheet_lines.append(f"- {tk}")
            if mix.user_notes:
                cheatsheet_lines.append(f"> **Your Note:** {mix.user_notes.strip()}")
            cheatsheet_lines.append("")

            for q in mix.quizzes:
                combined_questions.append(q)

        if not combined_questions:
            combined_questions.append(
                PracticeQuestion(
                    question=f"Which mode builds the cross-topic prep sheet for {course_title}?",
                    options=[
                        "Exam Mix (synthesized from TopicMix packs)",
                        "Direct exam answer scraping",
                        "Manual F12 cookie polling",
                        "Unfiltered quiz dumps",
                    ],
                    correct_index=0,
                    explanation="ExamMix aggregates safe TopicMix summaries instead of re-reading raw PDFs or scraping exams.",
                    topic_ref="Course Overview",
                )
            )

        return ExamMix(
            exam_mix_id=f"exam-{course_id}-{uuid.uuid4().hex[:8]}",
            course_id=course_id,
            authority=authority,
            title=f"{course_title} — Exam Mix",
            included_mix_ids=included_ids,
            master_cheatsheet_markdown="\n".join(cheatsheet_lines).strip(),
            concept_map_mermaid="\n".join(mermaid_lines),
            mock_exam_questions=combined_questions[:15],
            weak_spots_focus=focus_areas[:6],
            visibility="private",
            created_at=datetime.now(timezone.utc),
        )


def get_mix_generator() -> BaseMixGenerator:
    """Factory hook — AI Engineer will swap this to return an LLM-backed generator when connecting AI."""
    return StructuredPlaceholderMixGenerator()
