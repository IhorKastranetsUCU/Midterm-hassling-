import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

VisibilityScope = Literal["private", "course_shared"]
IngestionSourceType = Literal["moodle_extension", "moodle_api", "manual_upload"]
ExamSafetyClassification = Literal["safe_material", "self_test", "restricted_exam"]

_SELF_TEST_HINTS = ("self", "practice", "тренувал", "самоперевірк", "пробн")
_RESTRICTED_EXAM_HINTS = ("іспит", "екзамен", "контрольн", "модульн", "midterm", "final")
_SHORT_WINDOW_SECONDS = 4 * 3600  # 4 hours


def compute_content_hash(content: str) -> str:
    """Return a deterministic SHA-256 hex digest for source deduplication and diff detection."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def compute_artifact_cache_key(
    content_hash: str, artifact_type: str, prompt_version: str = "v1"
) -> str:
    """Return a shared cache key sha256(content_hash:artifact_type:prompt_version)."""
    return compute_content_hash(f"{content_hash}:{artifact_type}:{prompt_version}")


class CourseToolsConfig(BaseModel):
    """Per-course generation toggles chosen before building AI study artifacts."""

    interactive_book: bool = True
    mermaid_diagrams: bool = True
    visual_cards: bool = True
    practice_quizzes: bool = True
    flashcards: bool = False
    exam_mix: bool = True
    deadline_tracker: bool = True


class QuizSafetyMetadata(BaseModel):
    """Metadata describing a Moodle quiz to prevent accidental exam/answer ingestion."""

    name: str
    attempts: Optional[int] = Field(None, description="0 means unlimited attempts; >=1 indicates capped attempts")
    timelimit_seconds: Optional[int] = Field(None, description="0 means untimed; >0 indicates strict timer")
    timeopen: Optional[int] = None
    timeclose: Optional[int] = None
    grade_max: Optional[float] = None
    requires_seb: bool = False
    review_correctness_allowed: Optional[bool] = None

    def classify_safety(self) -> ExamSafetyClassification:
        """Fail-closed classifier separating open self-tests from restricted graded exams."""
        if self.requires_seb:
            return "restricted_exam"
        if self.timelimit_seconds is not None and self.timelimit_seconds > 0:
            return "restricted_exam"
        if self.attempts is not None and self.attempts > 0:
            return "restricted_exam"
        if self.review_correctness_allowed is False:
            return "restricted_exam"

        if self.timeopen is not None and self.timeclose is not None:
            window = self.timeclose - self.timeopen
            if 0 < window <= _SHORT_WINDOW_SECONDS:
                return "restricted_exam"

        lower_name = self.name.lower()
        has_self_hint = any(hint in lower_name for hint in _SELF_TEST_HINTS)
        has_exam_hint = any(hint in lower_name for hint in _RESTRICTED_EXAM_HINTS)
        if has_exam_hint and not has_self_hint:
            return "restricted_exam"

        # Allow open practice only when unlimited attempts & untimed are explicitly confirmed.
        if self.attempts == 0 and (self.timelimit_seconds is None or self.timelimit_seconds == 0):
            return "self_test"

        return "restricted_exam"


class RawTopicSnapshot(BaseModel):
    """Normalized, immutable snapshot of ingested course material before AI synthesis."""

    source_id: str
    course_id: int
    authority: str = "ucu"
    title: str
    content_text: str
    source_type: IngestionSourceType = "moodle_extension"
    source_hash: Optional[str] = None
    safety_status: ExamSafetyClassification = "safe_material"
    visibility: VisibilityScope = "private"

    @model_validator(mode="after")
    def ensure_source_hash(self) -> "RawTopicSnapshot":
        if not self.source_hash:
            self.source_hash = compute_content_hash(f"{self.title}\n{self.content_text}")
        return self


class InteractiveBookSection(BaseModel):
    """Structured interactive textbook unit with optional Mermaid diagram and visual card."""

    chunk_id: Optional[str] = None
    source_hash: Optional[str] = None
    heading: str
    explanation_markdown: str
    key_takeaways: List[str] = Field(default_factory=list)
    mermaid_diagram: Optional[str] = None
    visual_card_caption: Optional[str] = None
    visual_card_prompt: Optional[str] = None
    visual_card_url: Optional[str] = None


class PracticeQuestion(BaseModel):
    """Synthetic practice question generated from lecture content (never scraped exam items)."""

    question: str
    options: List[str] = Field(min_length=2)
    correct_index: int = Field(ge=0)
    explanation: str
    topic_ref: Optional[str] = None

    @model_validator(mode="after")
    def validate_correct_index(self) -> "PracticeQuestion":
        if self.correct_index >= len(self.options):
            raise ValueError("correct_index must be within options range.")
        return self


class Flashcard(BaseModel):
    """Spaced-repetition study card derived from a topic."""

    front: str
    back: str
    tag: Optional[str] = None


class TopicMaterialItem(BaseModel):
    """A real course material associated with a topic (lecture, video, audio, self-test, etc.)."""

    id: int
    name: str
    material_type: str = "lecture"  # "video" | "audio" | "lecture" | "self_test" | "assignment" | "resource" | "url"
    modname: str = "resource"
    url: Optional[str] = None
    download_url: Optional[str] = None
    description: Optional[str] = None
    timemodified: Optional[int] = None
    time_created: Optional[int] = None
    last_updated_at: Optional[str] = None
    safety_status: str = "safe_material"
    key_items: List[str] = Field(default_factory=list)
    files_count: int = 0
    has_transcript: bool = False
    transcript_snippet: Optional[str] = None


class TopicMix(BaseModel):
    """Level 1 AI artifact for a single course topic, preserving user notes across upstream updates."""

    mix_id: str
    course_id: int
    authority: str = "ucu"
    topic_index: int = 0
    title: str
    source_hash: str
    version: int = 1
    visibility: VisibilityScope = "private"
    tools_enabled: CourseToolsConfig = Field(default_factory=CourseToolsConfig)
    book_sections: List[InteractiveBookSection] = Field(default_factory=list)
    materials: List[TopicMaterialItem] = Field(default_factory=list)
    quizzes: List[PracticeQuestion] = Field(default_factory=list)
    flashcards: List[Flashcard] = Field(default_factory=list)
    user_notes: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    last_updated_at: Optional[str] = None
    has_upstream_update: bool = False
    dirty_chunk_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TopicDigest(BaseModel):
    """Compact (~200-400 token) topic summary used as input to incremental ExamMix builds."""

    mix_id: str
    topic_index: int = 0
    title: str
    source_hash: str
    summary_bullets: List[str] = Field(default_factory=list)
    mermaid_node: Optional[str] = None
    sample_question_prompts: List[str] = Field(default_factory=list)
    user_note_highlight: Optional[str] = None


class ExamMix(BaseModel):
    """Level 2 cross-topic synthesis ('Mix of Mixes') built from TopicMix summaries for exam prep."""

    exam_mix_id: str
    course_id: int
    authority: str = "ucu"
    title: str
    included_mix_ids: List[str] = Field(default_factory=list)
    topic_digests: List[TopicDigest] = Field(default_factory=list)
    master_cheatsheet_markdown: str = ""
    concept_map_mermaid: Optional[str] = None
    mock_exam_questions: List[PracticeQuestion] = Field(default_factory=list)
    weak_spots_focus: List[str] = Field(default_factory=list)
    incremental_updates: int = 0
    cached_topics_reused: int = 0
    visibility: VisibilityScope = "private"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class QuizAttemptRequest(BaseModel):
    """Per-user quiz practice telemetry used to feed weak spots into ExamMix."""

    question: str
    chosen_index: int
    correct_index: int
    topic_ref: str = ""


class ExtensionModuleItem(BaseModel):
    """Single course activity/resource captured by the browser extension in Moodle DOM."""

    module_id: int
    name: str
    modname: str
    url: Optional[str] = None
    text_excerpt: Optional[str] = None
    attachment_filename: Optional[str] = None
    attachment_base64: Optional[str] = None
    due_at: Optional[str] = None
    module_hash: Optional[str] = None
    file_hashes: List[str] = Field(default_factory=list)
    quiz_meta: Optional[QuizSafetyMetadata] = None

    def effective_hash(self) -> str:
        """Return explicit module_hash if supplied, otherwise deterministic SHA-256 over content."""
        if self.module_hash:
            return self.module_hash
        canonical = "|".join(
            [
                str(self.module_id),
                self.modname.strip(),
                self.name.strip(),
                self.url or "",
                self.text_excerpt or "",
                self.attachment_filename or "",
                self.due_at or "",
                ",".join(self.file_hashes),
            ]
        )
        return compute_content_hash(canonical)


class ExtensionSectionPayload(BaseModel):
    """Course topic/section payload sent by the Chrome Extension."""

    section_index: int
    title: str
    summary: Optional[str] = None
    modules: List[ExtensionModuleItem] = Field(default_factory=list)


class ExtensionSyncPayload(BaseModel):
    """Contract between the Browser Extension and Backend ingestion endpoint."""

    authority: str = "ucu"
    moodle_url: str
    course_id: int
    course_name: str
    course_shortname: Optional[str] = None
    sections: List[ExtensionSectionPayload] = Field(default_factory=list)
    known_hashes: List[str] = Field(default_factory=list)
    module_hashes: Dict[int, str] = Field(default_factory=dict)
    tools_config: Optional[CourseToolsConfig] = None


class ModuleHashProbe(BaseModel):
    """Lightweight (~50B) hash probe sent before uploading full section/module content."""

    module_id: int
    section_index: int = 0
    module_hash: str
    modname: str = "resource"
    name: str = ""


class SyncDiffRequest(BaseModel):
    """Pre-flight diff request carrying only module_id -> hash probes (~1 KB)."""

    authority: str = "ucu"
    course_id: int
    modules: List[ModuleHashProbe] = Field(default_factory=list)
    known_hashes: Dict[str, str] = Field(default_factory=dict)


class SyncDiffResponse(BaseModel):
    """Server diff instructions telling the client which modules need full upload."""

    course_id: int
    new_module_ids: List[int] = Field(default_factory=list)
    changed_module_ids: List[int] = Field(default_factory=list)
    unchanged_module_ids: List[int] = Field(default_factory=list)
    removed_module_ids: List[int] = Field(default_factory=list)
    dirty_section_indices: List[int] = Field(default_factory=list)
    known_server_hashes: Dict[int, str] = Field(default_factory=dict)


class BlockedQuizNotice(BaseModel):
    """Transparent audit record for exams blocked from AI/content storage by safety policy."""

    name: str
    reason: str = "Restricted exam/graded quiz excluded by Academic Integrity Policy"
    classification: ExamSafetyClassification = "restricted_exam"


class WorkspaceCourseSummary(BaseModel):
    """Metadata summary for a synced or uploaded course workspace."""

    course_id: int
    owner_id: Optional[str] = None
    authority: str = "ucu"
    title: str
    shortname: str = "COURSE"
    moodle_url: str = ""
    source_type: IngestionSourceType = "moodle_extension"
    visibility: VisibilityScope = "private"
    tools_config: CourseToolsConfig = Field(default_factory=CourseToolsConfig)
    topic_count: int = 0
    has_exam_mix: bool = False
    exam_mix_stale: bool = False
    updates_pending: int = 0
    blocked_quizzes_count: int = 0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TopicPreviewItem(BaseModel):
    """Single topic proposed by AI from course syllabus."""

    topic_index: int = 0
    title: str
    summary: str
    key_concepts: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    last_updated_at: Optional[str] = None
    material_ids: List[int] = Field(default_factory=list)
    difficulty: str = "Intermediate"  # Basic, Intermediate, Advanced
    estimated_hours: int = 3
    source_modules_count: int = 0
    suggested_focus: str = "Core concepts & practical application"


class CourseStructurePreview(BaseModel):
    """Complete course architecture generated by AI from syllabus before confirmation."""

    course_id: int
    title: str
    shortname: str = "COURSE"
    authority: str = "ucu"
    target_score: int = 85
    syllabus_source: str = "Moodle Syllabus & Course Sections"
    syllabus_found: bool = True
    syllabus_excerpt: Optional[str] = None
    topics: List[TopicPreviewItem] = Field(default_factory=list)
    tools_config: CourseToolsConfig = Field(default_factory=CourseToolsConfig)
    total_estimated_hours: int = 0
    weekly_hours_recommendation: int = 4


class PreviewStructureRequest(BaseModel):
    """Request to generate syllabus-based course preview."""

    course_id: Optional[int] = None
    title: Optional[str] = None
    authority: str = "ucu"
    target_score: int = 85
    custom_syllabus_text: Optional[str] = None
    tools_config: Optional[CourseToolsConfig] = None
    gemini_api_key: Optional[str] = None


class ConfirmStructureRequest(BaseModel):
    """User confirmation payload to build and persist the AI-generated course structure."""

    course_id: int
    title: str
    shortname: Optional[str] = "COURSE"
    authority: str = "ucu"
    target_score: int = 85
    topics: List[TopicPreviewItem]
    tools_config: Optional[CourseToolsConfig] = None
    gemini_api_key: Optional[str] = None

