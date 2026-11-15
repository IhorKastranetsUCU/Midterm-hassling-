import io
import logging
import re
import uuid
import xml.etree.ElementTree as ET
import zipfile
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from app.models.mix import (
    CourseToolsConfig,
    ExamMix,
    Flashcard,
    InteractiveBookSection,
    PracticeQuestion,
    RawTopicSnapshot,
    TopicDigest,
    TopicMix,
    TopicPreviewItem,
    CourseStructurePreview,
    compute_content_hash,
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


def _extract_key_points(text: str, title: str, limit: int = 6) -> Tuple[List[str], int]:
    """Extract clean bullet takeaways and total indexed point count from raw content."""
    lines = [ln.strip() for ln in (text or "").splitlines() if ln.strip()]
    bullets = [re.sub(r"^[\-\*\d\.\)]+\s*", "", ln) for ln in lines if len(ln) > 4]
    key_points = bullets[:limit] or [f"Core concepts covered in {title}"]
    return key_points, len(bullets)


def split_text_into_semantic_chunks(
    title: str,
    content_text: str,
    max_chunk_chars: int = 1800,
) -> List[Dict[str, str]]:
    """
    Split large documents/slides/notes into semantic chunks so edits invalidate only dirty chunks.
    Returns deterministic chunk dicts with chunk_id, heading, content_text, and content_hash.
    """
    text = (content_text or "").strip()
    if not text:
        empty_hash = compute_content_hash(f"{title}\n")
        return [
            {
                "chunk_id": "chunk-0",
                "heading": title,
                "content_text": "",
                "content_hash": empty_hash,
            }
        ]

    # Split on markdown headers (#, ##, ###) or slide markers while keeping heading attached
    raw_sections = re.split(r"(?m)(?=^#{1,3}\s+\S|^##\s+Slide\s+\d+)", text)
    sections = [s.strip() for s in raw_sections if s.strip()]
    if len(sections) <= 1 and len(text) > max_chunk_chars:
        sections = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]

    grouped: List[Tuple[str, str]] = []
    buf_heading = title
    buf_parts: List[str] = []
    buf_len = 0

    for part in sections:
        first_line = part.splitlines()[0].strip()
        part_heading = (
            re.sub(r"^#{1,3}\s*", "", first_line).strip()
            if first_line.startswith("#")
            else buf_heading
        )
        if buf_parts and (buf_len + len(part) > max_chunk_chars or first_line.startswith("#")):
            grouped.append((buf_heading, "\n\n".join(buf_parts)))
            buf_parts = [part]
            buf_heading = part_heading or title
            buf_len = len(part)
        else:
            if not buf_parts and first_line.startswith("#"):
                buf_heading = part_heading or title
            buf_parts.append(part)
            buf_len += len(part)

    if buf_parts:
        grouped.append((buf_heading, "\n\n".join(buf_parts)))

    chunks: List[Dict[str, str]] = []
    for idx, (heading, body) in enumerate(grouped):
        chunk_heading = heading if len(grouped) == 1 else f"{title} — {heading}" if heading != title else f"{title} (Part {idx + 1})"
        chunk_hash = compute_content_hash(f"{chunk_heading}\n{body}")
        chunks.append(
            {
                "chunk_id": f"chunk-{idx}",
                "heading": chunk_heading,
                "content_text": body,
                "content_hash": chunk_hash,
            }
        )
    return chunks


class BaseMixGenerator(ABC):
    """
    Extension seam for the AI Engineer.
    Swap StructuredPlaceholderMixGenerator with an LLM provider (Gemini/OpenAI Structured Output)
    without modifying backend routers or frontend components.
    """

    prompt_version: str = "v1"

    @abstractmethod
    async def generate_book_section(
        self,
        title: str,
        content_text: str,
        source_type: str = "manual_upload",
        source_id: str = "",
        include_mermaid: bool = True,
        include_visual_cards: bool = True,
        chunk_id: Optional[str] = None,
        source_hash: Optional[str] = None,
    ) -> InteractiveBookSection:
        """Build a single InteractiveBookSection atomically."""

    @abstractmethod
    async def generate_mermaid_diagram(self, title: str, key_points: List[str]) -> str:
        """Build a Mermaid diagram string independently of prose/quizzes."""

    @abstractmethod
    async def generate_visual_card(self, title: str) -> Tuple[str, str]:
        """Build (visual_card_caption, visual_card_prompt) independently."""

    @abstractmethod
    async def generate_practice_quizzes(
        self,
        title: str,
        key_points: List[str],
        total_points: Optional[int] = None,
    ) -> List[PracticeQuestion]:
        """Build practice questions independently."""

    @abstractmethod
    async def generate_flashcards(
        self,
        title: str,
        key_takeaways: List[str],
    ) -> List[Flashcard]:
        """Build flashcards solely from already-extracted key_takeaways (zero raw-file recompute)."""

    @abstractmethod
    async def build_topic_digest(
        self,
        mix: TopicMix,
        include_user_notes: bool = True,
    ) -> TopicDigest:
        """Extract a compact ~200-400 token TopicDigest for incremental ExamMix synthesis."""

    @abstractmethod
    async def merge_exam_mix(
        self,
        course_id: int,
        authority: str,
        course_title: str,
        topic_digests: List[TopicDigest],
        topic_mixes: Optional[List[TopicMix]] = None,
        incremental_updates: int = 0,
        cached_topics_reused: int = 0,
        weak_spots: Optional[List[str]] = None,
    ) -> ExamMix:
        """Synthesize Level 2 ExamMix strictly from compact per-topic digests."""

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
    Supports atomic per-artifact generation so edits and tool toggles only recompute dirty artifacts.
    """

    prompt_version: str = "v1"

    async def generate_mermaid_diagram(self, title: str, key_points: List[str]) -> str:
        root_lbl = _safe_mermaid_label(title, 36)
        node_lines = [f'  T["{root_lbl}"]']
        for i, pt in enumerate((key_points or [title])[:4], start=1):
            node_lines.append(f'  T --> N{i}["{_safe_mermaid_label(pt, 32)}"]')
        return "flowchart TD\n" + "\n".join(node_lines)

    async def generate_visual_card(self, title: str) -> Tuple[str, str]:
        return (
            f"Concept Card: {title}",
            f"Clean educational infographic illustrating: {title}",
        )

    async def generate_book_section(
        self,
        title: str,
        content_text: str,
        source_type: str = "manual_upload",
        source_id: str = "",
        include_mermaid: bool = True,
        include_visual_cards: bool = True,
        chunk_id: Optional[str] = None,
        source_hash: Optional[str] = None,
    ) -> InteractiveBookSection:
        key_points, _ = _extract_key_points(content_text, title, limit=6)
        mermaid_code = await self.generate_mermaid_diagram(title, key_points) if include_mermaid else None
        card_caption, card_prompt = (
            await self.generate_visual_card(title) if include_visual_cards else (None, None)
        )
        summary_body = "\n".join(f"- {pt}" for pt in key_points[:6])
        explanation = (
            f"### Overview of {title}\n\n"
            f"This interactive unit organizes material from **{source_type}** "
            f"(`{source_id}`) without modifying or storing restricted exam items.\n\n"
            f"{summary_body}"
        )
        return InteractiveBookSection(
            chunk_id=chunk_id,
            source_hash=source_hash or compute_content_hash(content_text or title),
            heading=title,
            explanation_markdown=explanation,
            key_takeaways=key_points[:4],
            mermaid_diagram=mermaid_code,
            visual_card_caption=card_caption,
            visual_card_prompt=card_prompt,
        )

    async def generate_practice_quizzes(
        self,
        title: str,
        key_points: List[str],
        total_points: Optional[int] = None,
    ) -> List[PracticeQuestion]:
        pts = key_points or [f"Core concepts covered in {title}"]
        primary_concept = pts[0]
        distractors = [pt for pt in pts[1:4] if pt != primary_concept]
        while len(distractors) < 3:
            distractors.append(f"Unrelated topic outside {title}")

        options = [primary_concept] + distractors[:3]
        quizzes = [
            PracticeQuestion(
                question=f"Which key concept is explicitly introduced in '{title}'?",
                options=options,
                correct_index=0,
                explanation=f"Grounded in ingested source material for '{title}'. (AI Engineer will enrich with deep LLM questions.)",
                topic_ref=title,
            )
        ]
        if len(pts) > 1:
            count_val = total_points if total_points is not None else len(pts)
            quizzes.append(
                PracticeQuestion(
                    question=f"How many core study items were indexed for '{title}'?",
                    options=[
                        f"{count_val} extracted points/modules",
                        "Zero public materials",
                        "Restricted final exam keys only",
                        "External unverified syllabus",
                    ],
                    correct_index=0,
                    explanation="Computed deterministically during pre-AI topic ingestion.",
                    topic_ref=title,
                )
            )
        return quizzes

    async def generate_flashcards(
        self,
        title: str,
        key_takeaways: List[str],
    ) -> List[Flashcard]:
        pts = key_takeaways or [f"Core concepts covered in {title}"]
        return [
            Flashcard(
                front=f"{title} — Key Concept #{idx}",
                back=pt,
                tag=title,
            )
            for idx, pt in enumerate(pts[:4], start=1)
        ]

    async def build_topic_digest(
        self,
        mix: TopicMix,
        include_user_notes: bool = True,
    ) -> TopicDigest:
        bullets: List[str] = []
        for sec in mix.book_sections:
            for tk in sec.key_takeaways:
                if tk and tk not in bullets:
                    bullets.append(tk[:180])
                if len(bullets) >= 6:
                    break
            if len(bullets) >= 6:
                break
        if not bullets:
            bullets = [f"Core syllabus focus for {mix.title}"]

        note_highlight = (
            mix.user_notes.strip()[:240]
            if (include_user_notes and mix.user_notes and mix.user_notes.strip())
            else None
        )
        return TopicDigest(
            mix_id=mix.mix_id,
            topic_index=mix.topic_index,
            title=mix.title,
            source_hash=mix.source_hash,
            summary_bullets=bullets,
            mermaid_node=_safe_mermaid_label(mix.title, 30),
            sample_question_prompts=[q.question[:160] for q in mix.quizzes[:3]],
            user_note_highlight=note_highlight,
        )

    async def generate_topic_mix(
        self,
        snapshot: RawTopicSnapshot,
        tools: CourseToolsConfig,
        topic_index: int = 0,
        existing_notes: Optional[str] = None,
        version: int = 1,
    ) -> TopicMix:
        key_points, total_bullets = _extract_key_points(snapshot.content_text, snapshot.title, limit=5)

        book_sections: List[InteractiveBookSection] = []
        if tools.interactive_book:
            chunks = split_text_into_semantic_chunks(snapshot.title, snapshot.content_text)
            for chunk in chunks:
                sec = await self.generate_book_section(
                    title=chunk["heading"],
                    content_text=chunk["content_text"] or snapshot.content_text,
                    source_type=snapshot.source_type,
                    source_id=snapshot.source_id,
                    include_mermaid=tools.mermaid_diagrams,
                    include_visual_cards=tools.visual_cards,
                    chunk_id=chunk["chunk_id"],
                    source_hash=chunk["content_hash"],
                )
                book_sections.append(sec)

        quizzes: List[PracticeQuestion] = []
        if tools.practice_quizzes:
            quizzes = await self.generate_practice_quizzes(
                snapshot.title, key_points, total_points=total_bullets
            )

        flashcards: List[Flashcard] = []
        if tools.flashcards:
            takeaways = [tk for sec in book_sections for tk in sec.key_takeaways] or key_points[:4]
            flashcards = await self.generate_flashcards(snapshot.title, takeaways)

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

    async def merge_exam_mix(
        self,
        course_id: int,
        authority: str,
        course_title: str,
        topic_digests: List[TopicDigest],
        topic_mixes: Optional[List[TopicMix]] = None,
        incremental_updates: int = 0,
        cached_topics_reused: int = 0,
        weak_spots: Optional[List[str]] = None,
    ) -> ExamMix:
        included_ids = [d.mix_id for d in topic_digests]
        cheatsheet_lines = [f"# {course_title} — Exam Prep Master Mix", ""]
        mermaid_lines = ["flowchart LR", f'  E["Exam: {_safe_mermaid_label(course_title, 30)}"]']
        combined_questions: List[PracticeQuestion] = []
        focus_areas: List[str] = list(dict.fromkeys(weak_spots or []))

        mix_by_id = {m.mix_id: m for m in (topic_mixes or [])}

        for idx, digest in enumerate(topic_digests, start=1):
            focus_areas.append(digest.title)
            node_label = digest.mermaid_node or _safe_mermaid_label(digest.title, 30)
            mermaid_lines.append(f'  E --> M{idx}["{node_label}"]')

            cheatsheet_lines.append(f"## {idx}. {digest.title}")
            for tk in digest.summary_bullets:
                cheatsheet_lines.append(f"- {tk}")
            if digest.user_note_highlight:
                cheatsheet_lines.append(f"> **Your Note:** {digest.user_note_highlight}")
            cheatsheet_lines.append("")

            mix = mix_by_id.get(digest.mix_id)
            if mix and mix.quizzes:
                combined_questions.extend(mix.quizzes)

        if not combined_questions:
            combined_questions.append(
                PracticeQuestion(
                    question=f"Which mode builds the cross-topic prep sheet for {course_title}?",
                    options=[
                        "Exam Mix (synthesized from TopicMix digests)",
                        "Direct exam answer scraping",
                        "Manual F12 cookie polling",
                        "Unfiltered quiz dumps",
                    ],
                    correct_index=0,
                    explanation="ExamMix aggregates safe per-topic digests instead of re-reading raw PDFs or scraping exams.",
                    topic_ref="Course Overview",
                )
            )

        return ExamMix(
            exam_mix_id=f"exam-{course_id}-{uuid.uuid4().hex[:8]}",
            course_id=course_id,
            authority=authority,
            title=f"{course_title} — Exam Mix",
            included_mix_ids=included_ids,
            topic_digests=topic_digests,
            master_cheatsheet_markdown="\n".join(cheatsheet_lines).strip(),
            concept_map_mermaid="\n".join(mermaid_lines),
            mock_exam_questions=combined_questions[:15],
            weak_spots_focus=focus_areas[:6],
            incremental_updates=incremental_updates,
            cached_topics_reused=cached_topics_reused,
            visibility="private",
            created_at=datetime.now(timezone.utc),
        )

    async def generate_exam_mix(
        self,
        course_id: int,
        authority: str,
        course_title: str,
        topic_mixes: List[TopicMix],
    ) -> ExamMix:
        digests = [await self.build_topic_digest(mix, include_user_notes=True) for mix in topic_mixes]
        return await self.merge_exam_mix(
            course_id=course_id,
            authority=authority,
            course_title=course_title,
            topic_digests=digests,
            topic_mixes=topic_mixes,
            incremental_updates=len(digests),
            cached_topics_reused=0,
        )


def get_mix_generator() -> BaseMixGenerator:
    """Factory hook — AI Engineer will swap this to return an LLM-backed generator when connecting AI."""
    return StructuredPlaceholderMixGenerator()


def generate_course_structure_from_syllabus(
    course_id: int,
    title: str,
    shortname: str = "COURSE",
    authority: str = "ucu",
    target_score: int = 85,
    custom_syllabus_text: Optional[str] = None,
    sections: Optional[List[Dict[str, Any]]] = None,
    tools_config: Optional[CourseToolsConfig] = None,
) -> CourseStructurePreview:
    """
    AI Course Architect: analyzes raw syllabus text or Moodle section metadata to generate
    a coherent, structured topic roadmap with key concepts, estimated hours, and study focus
    tailored to the user's target score (60% to 100%).
    """
    cfg = tools_config or CourseToolsConfig()
    topics: List[TopicPreviewItem] = []
    syllabus_excerpt = None
    syllabus_found = False

    # 1. If sections are provided from Moodle
    if sections:
        non_empty = [s for s in sections if s.get("modules") or (s.get("name") and s.get("name") not in ("General", "Вступ"))]
        if not non_empty:
            non_empty = sections

        topic_idx = 1
        for s in non_empty:
            s_name = (s.get("name") or "").strip()
            # If section is "General" and has summary, capture as syllabus excerpt
            if s_name.lower() in ("general", "вступ", "course info", "інформація"):
                summary_text = s.get("summary") or ""
                mod_names = [m.get("name", "") for m in s.get("modules", [])]
                syllabus_excerpt = (summary_text + "\n" + "\n".join(mod_names)).strip()[:500]
                syllabus_found = True
                if len(s.get("modules", [])) <= 1 and len(non_empty) > 1:
                    continue

            modules = s.get("modules", [])
            mod_titles = [m.get("name", "") for m in modules if m.get("name")]
            raw_summary = s.get("summary") or ""
            clean_summary = re.sub(r"<[^>]+>", " ", raw_summary).strip()

            if not clean_summary and mod_titles:
                clean_summary = f"Опрацювання матеріалів: {', '.join(mod_titles[:3])}"
            elif not clean_summary:
                clean_summary = f"Теоретичний та практичний блок теми '{s_name}'."

            # Extract key concepts
            concepts = []
            for t in mod_titles:
                words = [w for w in re.split(r"[:,\-\(\)]", t) if len(w.strip()) > 3]
                for w in words[:2]:
                    cw = w.strip()
                    if cw and cw not in concepts and len(cw) < 30:
                        concepts.append(cw)
            if not concepts:
                concepts = [s_name, f"Основи {s_name}", "Практичні завдання"]

            # Calculate estimated hours & difficulty
            total_items = max(len(modules), 1)
            score_factor = 1.0 if target_score < 75 else (1.4 if target_score < 90 else 1.8)
            est_hours = max(2, int(round((total_items * 0.7 + 1.5) * score_factor)))

            # Difficulty tiering
            if topic_idx <= 1:
                diff = "Basic"
                focus = "Фундаментальна теорія та базова термінологія"
            elif topic_idx >= len(non_empty) - 1:
                diff = "Advanced" if target_score >= 80 else "Intermediate"
                focus = "Комплексні задачі та підготовка до іспиту"
            else:
                diff = "Intermediate"
                focus = "Поглиблений аналіз та вирішення типових кейсів"

            topics.append(
                TopicPreviewItem(
                    topic_index=topic_idx,
                    title=f"Тема {topic_idx}: {s_name}",
                    summary=clean_summary[:250],
                    key_concepts=concepts[:5],
                    difficulty=diff,
                    estimated_hours=est_hours,
                    source_modules_count=len(modules),
                    suggested_focus=focus,
                )
            )
            topic_idx += 1

    # 2. If custom syllabus text is provided
    elif custom_syllabus_text and custom_syllabus_text.strip():
        text = custom_syllabus_text.strip()
        syllabus_found = True
        syllabus_excerpt = text[:500]
        chunks = re.split(r"(?=(?:^|\n)(?:Тема\s*\d+|Week\s*\d+|Module\s*\d+|Розділ\s*\d+|Topic\s*\d+|##\s+))", text, flags=re.IGNORECASE)
        clean_chunks = [c.strip() for c in chunks if len(c.strip()) > 20]
        if not clean_chunks:
            clean_chunks = [c["content_text"] for c in split_text_into_semantic_chunks(title, text)]

        for idx, chunk in enumerate(clean_chunks[:8], start=1):
            lines = chunk.split("\n")
            first_line = re.sub(r"^[#\s\d.:\-]+", "", lines[0]).strip() or f"Тема {idx}"
            body_text = "\n".join(lines[1:]).strip() or first_line
            key_pts, _ = _extract_key_points(body_text, first_line, limit=4)
            diff = "Basic" if idx == 1 else ("Advanced" if idx == len(clean_chunks) else "Intermediate")
            est_hours = 3 if target_score < 80 else 4
            topics.append(
                TopicPreviewItem(
                    topic_index=idx,
                    title=f"Тема {idx}: {first_line[:50]}",
                    summary=body_text[:200].replace("\n", " "),
                    key_concepts=key_pts[:4],
                    difficulty=diff,
                    estimated_hours=est_hours,
                    source_modules_count=len(lines),
                    suggested_focus="Теоретичний огляд та практичне закріплення",
                )
            )

    # 3. Baseline fallback
    if not topics:
        syllabus_found = False
        default_titles = [
            f"Вступ та фундаментальні концепції {title}",
            f"Методи та інструменти аналізу у {title}",
            f"Практичне застосування та типові алгоритми",
            f"Комплексна підготовка до контрольних заходів та іспиту",
        ]
        for idx, d_title in enumerate(default_titles, start=1):
            topics.append(
                TopicPreviewItem(
                    topic_index=idx,
                    title=f"Тема {idx}: {d_title}",
                    summary=f"Структурований модуль вивчення курсу '{title}'.",
                    key_concepts=[title, f"Модуль {idx}", "Практика"],
                    difficulty="Basic" if idx == 1 else ("Advanced" if idx == 4 else "Intermediate"),
                    estimated_hours=3,
                    source_modules_count=1,
                    suggested_focus="Опрацювання матеріалів та самоперевірка",
                )
            )

    total_hours = sum(t.estimated_hours for t in topics)
    weekly_rec = max(2, int(round(total_hours / max(len(topics), 1) * 1.5)))

    return CourseStructurePreview(
        course_id=course_id,
        title=title,
        shortname=shortname,
        authority=authority,
        target_score=target_score,
        syllabus_source="Moodle Syllabus & Course Sections" if sections else ("Uploaded Syllabus Text" if custom_syllabus_text else "AI Adaptive Blueprint"),
        syllabus_found=syllabus_found,
        syllabus_excerpt=syllabus_excerpt,
        topics=topics,
        tools_config=cfg,
        total_estimated_hours=total_hours,
        weekly_hours_recommendation=weekly_rec,
    )

