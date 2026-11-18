import base64
import hashlib
import json
import os
import re
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.config import get_settings
from app.core.authorities import resolve_authority_slug
from app.core.events import AcademicEvent, event_bus
from app.models.mix import (
    BlockedQuizNotice,
    CourseToolsConfig,
    ExamMix,
    ExtensionSectionPayload,
    ExtensionSyncPayload,
    Flashcard,
    InteractiveBookSection,
    PracticeQuestion,
    QuizAttemptRequest,
    QuizSafetyMetadata,
    RawTopicSnapshot,
    SyncDiffRequest,
    SyncDiffResponse,
    TopicDigest,
    TopicMaterialItem,
    TopicMix,
    TopicPreviewItem,
    WorkspaceCourseSummary,
    compute_artifact_cache_key,
    compute_content_hash,
)
from app.services.build_queue import get_build_queue
from app.services.course_update_matcher import CourseUpdateMatcher
from app.services.text_analyzer import MaterialTextAnalyzer, detect_material_type
from app.services.mix_generator import (
    _extract_key_points,
    extract_text_from_upload,
    get_mix_generator,
    split_text_into_semantic_chunks,
)
from app.services.temp_storage import (
    build_isolated_storage_key,
    get_temp_storage,
    is_allowed_staging_filename,
)


def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


from app.services.learning_provider import current_provider, with_learning_provider


class WorkspaceStore:
    """
    Zero-config SQLite persistence for course snapshots, TopicMixes, ExamMixes, and privacy diffs.
    Never stores Moodle passwords or MoodleSession cookies.
    """

    def __init__(self, db_path: Optional[str] = None):
        settings = get_settings()
        self.db_path = db_path or settings.WORKSPACE_DB_PATH
        parent = os.path.dirname(os.path.abspath(self.db_path))
        if parent:
            os.makedirs(parent, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA busy_timeout=5000")
        return conn

    def _create_tables(self, conn: sqlite3.Connection) -> None:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS workspace_courses (
                owner_id TEXT NOT NULL,
                course_id INTEGER NOT NULL,
                authority TEXT NOT NULL,
                title TEXT NOT NULL,
                shortname TEXT NOT NULL,
                moodle_url TEXT NOT NULL,
                source_type TEXT NOT NULL,
                visibility TEXT NOT NULL DEFAULT 'private',
                tools_config_json TEXT NOT NULL,
                sections_json TEXT NOT NULL DEFAULT '[]',
                blocked_quizzes_json TEXT NOT NULL DEFAULT '[]',
                exam_mix_stale INTEGER NOT NULL DEFAULT 0,
                gemini_api_key TEXT,
                last_moodle_check_at TEXT,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (owner_id, course_id)
            );

            CREATE TABLE IF NOT EXISTS topic_snapshots (
                snapshot_key TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                course_id INTEGER NOT NULL,
                topic_index INTEGER NOT NULL,
                source_id TEXT NOT NULL,
                authority TEXT NOT NULL,
                title TEXT NOT NULL,
                content_text TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_hash TEXT NOT NULL,
                safety_status TEXT NOT NULL,
                visibility TEXT NOT NULL DEFAULT 'private',
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_snapshots_owner_course
                ON topic_snapshots (owner_id, course_id, topic_index);

            CREATE TABLE IF NOT EXISTS module_chunks (
                chunk_key TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                course_id INTEGER NOT NULL,
                topic_index INTEGER NOT NULL,
                chunk_id TEXT NOT NULL,
                module_id INTEGER NOT NULL DEFAULT 0,
                modname TEXT NOT NULL DEFAULT 'resource',
                heading TEXT NOT NULL,
                content_text TEXT NOT NULL,
                module_hash TEXT NOT NULL,
                safety_status TEXT NOT NULL DEFAULT 'safe_material',
                order_index INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_chunks_owner_course_topic
                ON module_chunks (owner_id, course_id, topic_index, order_index);
            CREATE INDEX IF NOT EXISTS idx_chunks_owner_module
                ON module_chunks (owner_id, course_id, module_id);

            CREATE TABLE IF NOT EXISTS topic_mixes (
                mix_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                course_id INTEGER NOT NULL,
                topic_index INTEGER NOT NULL,
                title TEXT NOT NULL,
                source_hash TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                visibility TEXT NOT NULL DEFAULT 'private',
                has_upstream_update INTEGER NOT NULL DEFAULT 0,
                user_notes TEXT,
                mix_json TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (owner_id, mix_id)
            );
            CREATE INDEX IF NOT EXISTS idx_mixes_owner_course
                ON topic_mixes (owner_id, course_id, topic_index);

            CREATE TABLE IF NOT EXISTS exam_mixes (
                owner_id TEXT NOT NULL,
                course_id INTEGER NOT NULL,
                exam_mix_id TEXT NOT NULL,
                visibility TEXT NOT NULL DEFAULT 'private',
                exam_mix_json TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (owner_id, course_id)
            );

            CREATE TABLE IF NOT EXISTS artifact_cache (
                cache_key TEXT PRIMARY KEY,
                content_hash TEXT NOT NULL,
                artifact_type TEXT NOT NULL,
                prompt_version TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                hit_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_artifact_cache_lookup
                ON artifact_cache (content_hash, artifact_type, prompt_version);

            CREATE TABLE IF NOT EXISTS quiz_telemetry (
                owner_id TEXT NOT NULL,
                course_id INTEGER NOT NULL,
                mix_id TEXT NOT NULL,
                question TEXT NOT NULL,
                topic_ref TEXT NOT NULL,
                wrong_count INTEGER NOT NULL DEFAULT 0,
                correct_count INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (owner_id, mix_id, question)
            );
            CREATE INDEX IF NOT EXISTS idx_quiz_telemetry_course
                ON quiz_telemetry (owner_id, course_id);

            CREATE TABLE IF NOT EXISTS platform_users (
                owner_id TEXT PRIMARY KEY,
                google_sub TEXT UNIQUE,
                email TEXT NOT NULL,
                fullname TEXT NOT NULL,
                picture_url TEXT,
                linked_moodle_url TEXT,
                linked_moodle_user_id INTEGER,
                linked_moodle_username TEXT,
                last_paired_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS temp_staging (
                staging_id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                course_id INTEGER NOT NULL,
                module_id INTEGER NOT NULL DEFAULT 0,
                filename TEXT NOT NULL,
                content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
                size_bytes INTEGER NOT NULL DEFAULT 0,
                sha256_hash TEXT NOT NULL,
                storage_backend TEXT NOT NULL DEFAULT 'local',
                storage_key TEXT NOT NULL,
                safety_status TEXT NOT NULL DEFAULT 'safe_material',
                status TEXT NOT NULL DEFAULT 'pending_validation',
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                purged_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_temp_staging_owner_course
                ON temp_staging (owner_id, course_id, status);
            CREATE INDEX IF NOT EXISTS idx_temp_staging_expiry
                ON temp_staging (expires_at, purged_at);

            CREATE TABLE IF NOT EXISTS file_manifest (
                owner_id TEXT NOT NULL,
                course_id INTEGER NOT NULL,
                module_id INTEGER NOT NULL,
                remote_url TEXT NOT NULL DEFAULT '',
                moodle_timemodified INTEGER NOT NULL DEFAULT 0,
                sha256_hash TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                PRIMARY KEY (owner_id, course_id, module_id)
            );
            CREATE INDEX IF NOT EXISTS idx_file_manifest_course
                ON file_manifest (owner_id, course_id);
            """
        )

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            has_courses_table = (
                conn.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='workspace_courses'"
                ).fetchone()
                is not None
            )
            if has_courses_table:
                cols = {
                    row["name"]
                    for row in conn.execute("PRAGMA table_info(workspace_courses)").fetchall()
                }
                if "owner_id" not in cols:
                    self._migrate_legacy_schema(conn)
                    return
                if "exam_mix_stale" not in cols:
                    conn.execute(
                        "ALTER TABLE workspace_courses ADD COLUMN exam_mix_stale INTEGER NOT NULL DEFAULT 0"
                    )
                if "gemini_api_key" not in cols:
                    conn.execute(
                        "ALTER TABLE workspace_courses ADD COLUMN gemini_api_key TEXT"
                    )
                if "last_moodle_check_at" not in cols:
                    conn.execute(
                        "ALTER TABLE workspace_courses ADD COLUMN last_moodle_check_at TEXT"
                    )

            self._create_tables(conn)

    def _migrate_legacy_schema(self, conn: sqlite3.Connection) -> None:
        """Preserve any pre-isolation single-tenant rows under owner_id='legacy'."""
        legacy_owner = "legacy"
        tables = ("workspace_courses", "topic_snapshots", "topic_mixes", "exam_mixes")
        existing = {
            t
            for t in tables
            if conn.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (t,)
            ).fetchone()
        }
        for tbl in existing:
            conn.execute(f"ALTER TABLE {tbl} RENAME TO _legacy_{tbl}")

        self._create_tables(conn)

        if "workspace_courses" in existing:
            conn.execute(
                """
                INSERT INTO workspace_courses (
                    owner_id, course_id, authority, title, shortname, moodle_url, source_type,
                    visibility, tools_config_json, sections_json, blocked_quizzes_json, updated_at
                )
                SELECT ?, course_id, authority, title, shortname, moodle_url, source_type,
                       visibility, tools_config_json, sections_json, blocked_quizzes_json, updated_at
                FROM _legacy_workspace_courses
                """,
                (legacy_owner,),
            )

        if "topic_snapshots" in existing:
            conn.execute(
                """
                INSERT INTO topic_snapshots (
                    snapshot_key, owner_id, course_id, topic_index, source_id, authority, title,
                    content_text, source_type, source_hash, safety_status, visibility, updated_at
                )
                SELECT ? || ':' || snapshot_key, ?, course_id, topic_index, source_id, authority, title,
                       content_text, source_type, source_hash, safety_status, visibility, updated_at
                FROM _legacy_topic_snapshots
                """,
                (legacy_owner, legacy_owner),
            )

        if "topic_mixes" in existing:
            conn.execute(
                """
                INSERT INTO topic_mixes (
                    mix_id, owner_id, course_id, topic_index, title, source_hash, version,
                    visibility, has_upstream_update, user_notes, mix_json, updated_at
                )
                SELECT mix_id, ?, course_id, topic_index, title, source_hash, version,
                       visibility, has_upstream_update, user_notes, mix_json, updated_at
                FROM _legacy_topic_mixes
                """,
                (legacy_owner,),
            )

        if "exam_mixes" in existing:
            conn.execute(
                """
                INSERT INTO exam_mixes (owner_id, course_id, exam_mix_id, visibility, exam_mix_json, updated_at)
                SELECT ?, course_id, exam_mix_id, visibility, exam_mix_json, updated_at
                FROM _legacy_exam_mixes
                """,
                (legacy_owner,),
            )

        for tbl in existing:
            conn.execute(f"DROP TABLE IF EXISTS _legacy_{tbl}")

    def _get_cached_artifact(
        self,
        content_hash: str,
        artifact_type: str,
        prompt_version: str,
    ) -> Optional[str]:
        """Look up a non-user-specific AI output in the global content-addressed cache."""
        cache_key = compute_artifact_cache_key(content_hash, artifact_type, prompt_version)
        with self._connect() as conn:
            row = conn.execute(
                "SELECT payload_json FROM artifact_cache WHERE cache_key = ?",
                (cache_key,),
            ).fetchone()
            if not row:
                return None
            conn.execute(
                "UPDATE artifact_cache SET hit_count = hit_count + 1 WHERE cache_key = ?",
                (cache_key,),
            )
            return row["payload_json"]

    def _put_cached_artifact(
        self,
        content_hash: str,
        artifact_type: str,
        prompt_version: str,
        payload_json: str,
        safety_status: str = "safe_material",
    ) -> None:
        """
        Store an AI output in the global cache strictly AFTER fail-closed safety classification.
        Refuses restricted_exam items and never stores owner_id or user_notes.
        """
        if safety_status == "restricted_exam":
            raise ValueError("Academic Integrity violation: restricted_exam items cannot be cached.")
        if safety_status not in ("safe_material", "self_test"):
            raise ValueError(f"Unsupported safety_status for shared cache: {safety_status}")

        cache_key = compute_artifact_cache_key(content_hash, artifact_type, prompt_version)
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO artifact_cache (
                    cache_key, content_hash, artifact_type, prompt_version, payload_json, hit_count, created_at
                )
                VALUES (?, ?, ?, ?, ?, 0, ?)
                ON CONFLICT(cache_key) DO UPDATE SET
                    payload_json = excluded.payload_json
                """,
                (cache_key, content_hash, artifact_type, prompt_version, payload_json, _utc_iso()),
            )

    def _load_topic_chunks(
        self, owner_id: str, course_id: int, topic_index: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            if topic_index is None:
                rows = conn.execute(
                    "SELECT * FROM module_chunks WHERE owner_id = ? AND course_id = ? "
                    "ORDER BY topic_index ASC, order_index ASC",
                    (owner_id, course_id),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM module_chunks WHERE owner_id = ? AND course_id = ? AND topic_index = ? "
                    "ORDER BY order_index ASC",
                    (owner_id, course_id, topic_index),
                ).fetchall()
        return [dict(r) for r in rows]

    def _save_topic_chunks(
        self,
        owner_id: str,
        course_id: int,
        topic_index: int,
        chunks: List[Dict[str, Any]],
    ) -> None:
        now = _utc_iso()
        rows_to_insert = [
            (
                f"{owner_id}:{course_id}:{topic_index}:{ch['chunk_id']}",
                owner_id,
                course_id,
                topic_index,
                ch["chunk_id"],
                int(ch.get("module_id", 0)),
                ch.get("modname", "resource"),
                ch["heading"],
                ch["content_text"],
                ch["module_hash"],
                ch.get("safety_status", "safe_material"),
                idx,
                now,
            )
            for idx, ch in enumerate(chunks)
        ]
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM module_chunks WHERE owner_id = ? AND course_id = ? AND topic_index = ?",
                (owner_id, course_id, topic_index),
            )
            if rows_to_insert:
                conn.executemany(
                    """
                    INSERT INTO module_chunks (
                        chunk_key, owner_id, course_id, topic_index, chunk_id, module_id,
                        modname, heading, content_text, module_hash, safety_status, order_index, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    rows_to_insert,
                )

    def compute_sync_diff(self, req: SyncDiffRequest, owner_id: str) -> SyncDiffResponse:
        """
        Pre-flight diff against stored per-module hashes (~1 KB probe).
        Isolated strictly to req.course_id + owner_id.
        """
        existing_rows = self._load_topic_chunks(owner_id=owner_id, course_id=req.course_id)
        server_hashes: Dict[int, str] = {}
        server_sections: Dict[int, int] = {}
        for row in existing_rows:
            mid = int(row.get("module_id", 0))
            if mid > 0:
                server_hashes[mid] = row["module_hash"]
                server_sections[mid] = int(row["topic_index"])

        incoming_probes: Dict[int, Tuple[int, str]] = {}
        for probe in req.modules:
            incoming_probes[probe.module_id] = (probe.section_index, probe.module_hash)
        for k_str, m_hash in req.known_hashes.items():
            try:
                mid = int(k_str)
            except (TypeError, ValueError):
                continue
            if mid not in incoming_probes:
                incoming_probes[mid] = (server_sections.get(mid, 0), m_hash)

        new_ids: List[int] = []
        changed_ids: List[int] = []
        unchanged_ids: List[int] = []
        dirty_sections = set()

        for mid, (sec_idx, m_hash) in incoming_probes.items():
            srv_hash = server_hashes.get(mid)
            if srv_hash is None:
                new_ids.append(mid)
                dirty_sections.add(sec_idx)
            elif srv_hash != m_hash:
                changed_ids.append(mid)
                dirty_sections.add(sec_idx)
            else:
                unchanged_ids.append(mid)

        removed_ids: List[int] = []
        for mid, sec_idx in server_sections.items():
            if mid not in incoming_probes:
                removed_ids.append(mid)
                dirty_sections.add(sec_idx)

        return SyncDiffResponse(
            course_id=req.course_id,
            new_module_ids=sorted(new_ids),
            changed_module_ids=sorted(changed_ids),
            unchanged_module_ids=sorted(unchanged_ids),
            removed_module_ids=sorted(removed_ids),
            dirty_section_indices=sorted(dirty_sections),
            known_server_hashes=server_hashes,
        )

    _NON_STUDY_MODNAMES = frozenset({"quiz", "label", "subsection", "forum", "questionnaire"})

    @staticmethod
    def _scoped_cache_hash(raw_hash: str, course_title: str = "", topic_title: str = "") -> str:
        clean_course = (course_title or "").strip()
        clean_topic = (topic_title or "").strip()
        if not clean_course and not clean_topic:
            return raw_hash
        return compute_content_hash(f"{clean_course}|{clean_topic}|{raw_hash}")

    async def _build_book_sections_cached(
        self,
        chunks: List[Dict[str, Any]],
        include_mermaid: bool,
        include_visual_cards: bool,
        source_type: str,
        source_id: str,
        old_sections_by_chunk: Optional[Dict[str, InteractiveBookSection]] = None,
        api_key: Optional[str] = None,
        course_title: str = "",
        topic_title: str = "",
    ) -> Tuple[List[InteractiveBookSection], int, int]:
        """
        Build InteractiveBookSections independently per chunk with shared content-addressed caching.
        Reuses existing unchanged chunk sections and hits shared cache for prose/mermaid/visual cards.
        """
        generator = get_mix_generator(api_key=api_key)
        pv = generator.prompt_version
        sections: List[InteractiveBookSection] = []
        cache_hits = 0
        recomputed = 0
        existing_map = old_sections_by_chunk or {}
        has_study_chunks = any(
            (ch.get("modname") or "").lower() not in self._NON_STUDY_MODNAMES
            for ch in chunks
            if ch.get("safety_status", "safe_material") != "restricted_exam"
        )

        for ch in chunks:
            safety = ch.get("safety_status", "safe_material")
            if safety == "restricted_exam":
                continue
            modname = (ch.get("modname") or "").lower()
            if has_study_chunks and modname in self._NON_STUDY_MODNAMES:
                continue
            chunk_id = ch["chunk_id"]
            chunk_hash = ch["module_hash"]
            scoped_hash = self._scoped_cache_hash(chunk_hash, course_title=course_title, topic_title=topic_title)
            heading = ch["heading"]
            body = ch["content_text"]

            old_sec = existing_map.get(chunk_id)
            if old_sec and old_sec.source_hash == chunk_hash:
                base_heading = old_sec.heading
                explanation_md = old_sec.explanation_markdown
                key_takeaways = list(old_sec.key_takeaways)
            else:
                cached_core = self._get_cached_artifact(scoped_hash, "book_section_core", pv)
                if cached_core:
                    core = json.loads(cached_core)
                    base_heading = core["heading"]
                    explanation_md = core["explanation_markdown"]
                    key_takeaways = list(core["key_takeaways"])
                    cache_hits += 1
                else:
                    built = await generator.generate_book_section(
                        title=heading,
                        content_text=body,
                        source_type=source_type,
                        source_id=source_id,
                        include_mermaid=False,
                        include_visual_cards=False,
                        chunk_id=chunk_id,
                        source_hash=chunk_hash,
                        course_title=course_title,
                        topic_title=topic_title,
                    )
                    base_heading = built.heading
                    explanation_md = built.explanation_markdown
                    key_takeaways = list(built.key_takeaways)
                    recomputed += 1
                    self._put_cached_artifact(
                        scoped_hash,
                        "book_section_core",
                        pv,
                        json.dumps(
                            {
                                "heading": base_heading,
                                "explanation_markdown": explanation_md,
                                "key_takeaways": key_takeaways,
                            }
                        ),
                        safety_status=safety,
                    )

            mermaid_diagram: Optional[str] = None
            if include_mermaid:
                if old_sec and old_sec.source_hash == chunk_hash and old_sec.mermaid_diagram:
                    mermaid_diagram = old_sec.mermaid_diagram
                else:
                    cached_mmd = self._get_cached_artifact(scoped_hash, "mermaid_diagram", pv)
                    if cached_mmd:
                        mermaid_diagram = json.loads(cached_mmd)["mermaid_diagram"]
                        cache_hits += 1
                    else:
                        mermaid_diagram = await generator.generate_mermaid_diagram(
                            base_heading, key_takeaways, course_title=course_title
                        )
                        recomputed += 1
                        self._put_cached_artifact(
                            scoped_hash,
                            "mermaid_diagram",
                            pv,
                            json.dumps({"mermaid_diagram": mermaid_diagram}),
                            safety_status=safety,
                        )

            card_caption: Optional[str] = None
            card_prompt: Optional[str] = None
            if include_visual_cards:
                if (
                    old_sec
                    and old_sec.source_hash == chunk_hash
                    and old_sec.visual_card_caption
                    and old_sec.visual_card_prompt
                ):
                    card_caption = old_sec.visual_card_caption
                    card_prompt = old_sec.visual_card_prompt
                else:
                    cached_card = self._get_cached_artifact(scoped_hash, "visual_card", pv)
                    if cached_card:
                        card_obj = json.loads(cached_card)
                        card_caption = card_obj["visual_card_caption"]
                        card_prompt = card_obj["visual_card_prompt"]
                        cache_hits += 1
                    else:
                        card_caption, card_prompt = await generator.generate_visual_card(base_heading)
                        recomputed += 1
                        self._put_cached_artifact(
                            scoped_hash,
                            "visual_card",
                            pv,
                            json.dumps(
                                {
                                    "visual_card_caption": card_caption,
                                    "visual_card_prompt": card_prompt,
                                }
                            ),
                            safety_status=safety,
                        )

            sections.append(
                InteractiveBookSection(
                    chunk_id=chunk_id,
                    source_hash=chunk_hash,
                    heading=base_heading,
                    explanation_markdown=explanation_md,
                    key_takeaways=key_takeaways,
                    mermaid_diagram=mermaid_diagram,
                    visual_card_caption=card_caption,
                    visual_card_prompt=card_prompt,
                )
            )

        return sections, cache_hits, recomputed

    async def _build_quizzes_cached(
        self,
        title: str,
        source_hash: str,
        content_text: str,
        safety_status: str,
        api_key: Optional[str] = None,
        course_title: str = "",
    ) -> Tuple[List[PracticeQuestion], int, int]:
        if safety_status == "restricted_exam":
            return [], 0, 0
        generator = get_mix_generator(api_key=api_key)
        pv = generator.prompt_version
        scoped_hash = self._scoped_cache_hash(source_hash, course_title=course_title, topic_title=title)
        cached = self._get_cached_artifact(scoped_hash, "topic_quizzes", pv)
        if cached:
            items = [PracticeQuestion.model_validate(q) for q in json.loads(cached)]
            return items, 1, 0
        key_points, total_bullets = _extract_key_points(content_text, title, limit=5)
        items = await generator.generate_practice_quizzes(
            title,
            key_points,
            total_points=total_bullets,
            course_title=course_title,
            content_text=content_text,
        )
        self._put_cached_artifact(
            scoped_hash,
            "topic_quizzes",
            pv,
            json.dumps([q.model_dump() for q in items]),
            safety_status=safety_status,
        )
        return items, 0, 1

    async def _build_flashcards_cached(
        self,
        title: str,
        source_hash: str,
        key_takeaways: List[str],
        safety_status: str,
        api_key: Optional[str] = None,
        course_title: str = "",
    ) -> Tuple[List[Flashcard], int, int]:
        if safety_status == "restricted_exam":
            return [], 0, 0
        generator = get_mix_generator(api_key=api_key)
        pv = generator.prompt_version
        scoped_hash = self._scoped_cache_hash(source_hash, course_title=course_title, topic_title=title)
        cached = self._get_cached_artifact(scoped_hash, "topic_flashcards", pv)
        if cached:
            cards = [Flashcard.model_validate(c) for c in json.loads(cached)]
            return cards, 1, 0
        cards = await generator.generate_flashcards(title, key_takeaways, course_title=course_title)
        self._put_cached_artifact(
            scoped_hash,
            "topic_flashcards",
            pv,
            json.dumps([c.model_dump() for c in cards]),
            safety_status=safety_status,
        )
        return cards, 0, 1

    async def resolve_youtube_digest(
        self,
        youtube_url: str,
        title: str = "",
        course_title: str = "",
        raise_on_error: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """Resolve a YouTube video's captions (0 tokens) or cached Gemini video notes."""
        import asyncio
        from app.services.video_transcriber import VideoTranscriberService
        from app.services.gemini_service import GeminiService

        norm = VideoTranscriberService.normalize_youtube_url(youtube_url)
        vid = VideoTranscriberService.extract_youtube_video_id(norm or "")
        if not norm or not vid:
            return None

        cache_hash = compute_content_hash(f"yt:{vid}")
        cached = self._get_cached_artifact(cache_hash, "youtube_digest", "yt-v1")
        if cached:
            try:
                obj = json.loads(cached)
                if obj.get("text"):
                    return obj
            except Exception:
                pass

        yt = await asyncio.to_thread(VideoTranscriberService.get_youtube_transcript, norm)
        if yt and yt.get("full_text"):
            result = {
                "url": norm,
                "video_id": vid,
                "source": "youtube_captions",
                "language": yt.get("language"),
                "text": yt["full_text"][:18000],
                "token_cost": 0,
            }
            self._put_cached_artifact(cache_hash, "youtube_digest", "yt-v1", json.dumps(result), safety_status="safe_material")
            return result

        gemini = GeminiService()
        if gemini.is_available:
            notes = await gemini.summarize_youtube_video(
                norm, title=title, course_title=course_title, raise_on_error=raise_on_error
            )
            if notes and notes.strip():
                result = {
                    "url": norm,
                    "video_id": vid,
                    "source": "gemini_video",
                    "language": "uk",
                    "text": notes.strip()[:18000],
                    "token_cost": 1,
                }
                self._put_cached_artifact(cache_hash, "youtube_digest", "yt-v1", json.dumps(result), safety_status="safe_material")
                return result
        return None

    async def enrich_chunks_with_youtube(
        self,
        chunks: List[Dict[str, Any]],
        snapshot_text: str = "",
        course_title: str = "",
        topic_title: str = "",
        max_videos: int = 3,
    ) -> Tuple[List[Dict[str, Any]], str]:
        """Populate YouTube transcripts/digests into video chunks and topic snapshot text."""
        from app.services.video_transcriber import VideoTranscriberService

        enriched: List[Dict[str, Any]] = []
        resolved_by_url: Dict[str, Optional[Dict[str, Any]]] = {}
        seen_urls = 0

        for ch in chunks:
            copy_ch = dict(ch)
            body = copy_ch.get("content_text") or ""
            if (
                copy_ch.get("safety_status", "safe_material") != "restricted_exam"
                and "[YouTube Transcript]" not in body
                and "[YouTube Video Notes]" not in body
            ):
                urls = VideoTranscriberService.extract_youtube_urls_from_text(body)
                additions = []
                for yt_url in urls:
                    if yt_url not in resolved_by_url:
                        if seen_urls >= max_videos:
                            continue
                        seen_urls += 1
                        resolved_by_url[yt_url] = await self.resolve_youtube_digest(
                            yt_url,
                            title=copy_ch.get("heading") or topic_title,
                            course_title=course_title,
                        )
                    digest = resolved_by_url.get(yt_url)
                    if digest and digest.get("text"):
                        tag = "[YouTube Transcript]" if digest["source"] == "youtube_captions" else "[YouTube Video Notes]"
                        additions.append(f"{tag} ({yt_url})\n{digest['text']}")
                if additions:
                    copy_ch["content_text"] = (body + "\n\n" + "\n\n".join(additions)).strip()
            enriched.append(copy_ch)

        extra_snap_blocks = []
        for yt_url in VideoTranscriberService.extract_youtube_urls_from_text(snapshot_text):
            if yt_url in resolved_by_url or seen_urls >= max_videos:
                continue
            seen_urls += 1
            digest = await self.resolve_youtube_digest(yt_url, title=topic_title, course_title=course_title)
            resolved_by_url[yt_url] = digest
            if digest and digest.get("text"):
                tag = "[YouTube Transcript]" if digest["source"] == "youtube_captions" else "[YouTube Video Notes]"
                extra_snap_blocks.append(f"{tag} ({yt_url})\n{digest['text']}")

        merged_text = "\n\n".join(c.get("content_text") or "" for c in enriched if c.get("content_text"))
        if extra_snap_blocks:
            merged_text = (merged_text + "\n\n" + "\n\n".join(extra_snap_blocks)).strip()
        return enriched, merged_text or snapshot_text

    async def _build_topic_mix_cached(
        self,
        snapshot: RawTopicSnapshot,
        tools: CourseToolsConfig,
        topic_index: int,
        chunks: List[Dict[str, Any]],
        existing_notes: Optional[str] = None,
        version: int = 1,
        stable_mix_id: Optional[str] = None,
        old_sections_by_chunk: Optional[Dict[str, InteractiveBookSection]] = None,
        api_key: Optional[str] = None,
        materials: Optional[List[TopicMaterialItem]] = None,
        course_title: str = "",
    ) -> Tuple[TopicMix, int, int]:
        """Build a TopicMix using shared per-artifact caching and optional chunk reuse."""
        if snapshot.safety_status == "restricted_exam":
            raise ValueError("Refusing to generate TopicMix for restricted_exam snapshot.")

        src_hash = snapshot.source_hash or compute_content_hash(snapshot.content_text)
        total_hits = 0
        total_recomputed = 0

        book_sections: List[InteractiveBookSection] = []
        if tools.interactive_book:
            book_sections, h, r = await self._build_book_sections_cached(
                chunks=chunks,
                include_mermaid=tools.mermaid_diagrams,
                include_visual_cards=tools.visual_cards,
                source_type=snapshot.source_type,
                source_id=snapshot.source_id,
                old_sections_by_chunk=old_sections_by_chunk,
                api_key=api_key,
                course_title=course_title,
                topic_title=snapshot.title,
            )
            total_hits += h
            total_recomputed += r

        quizzes: List[PracticeQuestion] = []
        if tools.practice_quizzes:
            quizzes, h, r = await self._build_quizzes_cached(
                title=snapshot.title,
                source_hash=src_hash,
                content_text=snapshot.content_text,
                safety_status=snapshot.safety_status,
                api_key=api_key,
                course_title=course_title,
            )
            total_hits += h
            total_recomputed += r

        flashcards: List[Flashcard] = []
        if tools.flashcards:
            takeaways = [tk for sec in book_sections for tk in sec.key_takeaways][:10]
            if not takeaways:
                takeaways, _ = _extract_key_points(snapshot.content_text, snapshot.title, limit=4)
            flashcards, h, r = await self._build_flashcards_cached(
                title=snapshot.title,
                source_hash=src_hash,
                key_takeaways=takeaways,
                safety_status=snapshot.safety_status,
                api_key=api_key,
                course_title=course_title,
            )
            total_hits += h
            total_recomputed += r

        mix_id = stable_mix_id or f"mix-{snapshot.course_id}-{topic_index}-{src_hash[:8]}"
        now = datetime.now(timezone.utc)
        mix = TopicMix(
            mix_id=mix_id,
            course_id=snapshot.course_id,
            authority=snapshot.authority,
            topic_index=topic_index,
            title=snapshot.title,
            source_hash=src_hash,
            version=version,
            visibility=snapshot.visibility,
            tools_enabled=tools,
            book_sections=book_sections,
            materials=materials or [],
            quizzes=quizzes,
            flashcards=flashcards,
            user_notes=existing_notes,
            has_upstream_update=False,
            dirty_chunk_ids=[],
            created_at=now,
            updated_at=now,
        )
        return mix, total_hits, total_recomputed

    def _filter_and_serialize_section(
        self,
        sec: ExtensionSectionPayload,
        prev_chunks_by_module: Optional[Dict[int, Dict[str, Any]]] = None,
        prev_topic_chunks: Optional[Dict[str, Dict[str, Any]]] = None,
        extra_module_hashes: Optional[Dict[int, str]] = None,
    ) -> Tuple[str, Dict[str, Any], List[BlockedQuizNotice], List[Dict[str, Any]]]:
        """
        Separate safe study content from restricted exams using fail-closed QuizSafetyMetadata.
        Produces per-module/chunk records so diffs pinpoint only modified modules inside a topic.
        """
        prev_by_mod = prev_chunks_by_module or {}
        prev_by_cid = prev_topic_chunks or {}
        extra_hashes = extra_module_hashes or {}

        safe_lines: List[str] = []
        chunks: List[Dict[str, Any]] = []
        if sec.summary and sec.summary.strip():
            sum_text = sec.summary.strip()
            safe_lines.append(sum_text)
            chunks.append(
                {
                    "chunk_id": "chunk-summary",
                    "module_id": 0,
                    "modname": "summary",
                    "heading": f"{sec.title} — Overview",
                    "content_text": sum_text,
                    "module_hash": compute_content_hash(f"summary|{sec.title}|{sum_text}"),
                    "safety_status": "safe_material",
                }
            )

        blocked: List[BlockedQuizNotice] = []
        sanitized_modules: List[Dict[str, Any]] = []

        for mod in sec.modules:
            is_quiz = mod.modname.lower() == "quiz" or mod.quiz_meta is not None
            incoming_hash = mod.module_hash or extra_hashes.get(mod.module_id) or mod.effective_hash()
            prev_chunk = prev_by_cid.get(f"mod-{mod.module_id}") or prev_by_mod.get(mod.module_id)

            if is_quiz:
                meta = mod.quiz_meta or QuizSafetyMetadata(name=mod.name)
                safety = meta.classify_safety()
                if safety == "restricted_exam":
                    blocked.append(
                        BlockedQuizNotice(
                            name=mod.name,
                            reason="Timed/capped/restricted quiz blocked from storage & AI ingestion",
                            classification="restricted_exam",
                        )
                    )
                    sanitized_modules.append(
                        {
                            "id": mod.module_id,
                            "name": mod.name,
                            "modname": mod.modname,
                            "url": mod.url,
                            "safety_status": "restricted_exam",
                            "description": "[Excluded by Academic Integrity Policy]",
                        }
                    )
                    continue

                if mod.text_excerpt is None and prev_chunk and prev_chunk["module_hash"] == incoming_hash:
                    chunk_text = prev_chunk["content_text"]
                    excerpt_val = chunk_text
                else:
                    lines_mod = [f"[Self-Test] {mod.name}"]
                    if mod.text_excerpt and mod.text_excerpt.strip():
                        lines_mod.append(mod.text_excerpt.strip())
                    chunk_text = "\n".join(lines_mod)
                    excerpt_val = mod.text_excerpt or ""

                safe_lines.append(chunk_text)
                chunks.append(
                    {
                        "chunk_id": f"mod-{mod.module_id}",
                        "module_id": mod.module_id,
                        "modname": mod.modname,
                        "heading": mod.name,
                        "content_text": chunk_text,
                        "module_hash": incoming_hash,
                        "safety_status": "self_test",
                    }
                )
                sanitized_modules.append(
                    {
                        "id": mod.module_id,
                        "name": mod.name,
                        "modname": mod.modname,
                        "url": mod.url,
                        "module_hash": incoming_hash,
                        "safety_status": "self_test",
                        "description": excerpt_val,
                    }
                )
            else:
                if mod.text_excerpt is None and not mod.attachment_base64 and prev_chunk and prev_chunk["module_hash"] == incoming_hash:
                    chunk_text = prev_chunk["content_text"]
                    excerpt_val = chunk_text
                else:
                    lines_mod = [f"[{mod.modname.upper()}] {mod.name}"]
                    if mod.text_excerpt and mod.text_excerpt.strip():
                        lines_mod.append(mod.text_excerpt.strip())
                    if mod.attachment_base64 and len(mod.attachment_base64) <= 5_600_000:
                        try:
                            raw_bytes = base64.b64decode(mod.attachment_base64, validate=False)
                            if 0 < len(raw_bytes) <= 4 * 1024 * 1024:
                                extracted = extract_text_from_upload(
                                    mod.attachment_filename or f"{mod.name}.txt", raw_bytes
                                )
                                if extracted:
                                    lines_mod.append(extracted[:24000])
                        except Exception:
                            pass
                    chunk_text = "\n".join(lines_mod)
                    excerpt_val = chunk_text

                safe_lines.append(chunk_text)
                chunks.append(
                    {
                        "chunk_id": f"mod-{mod.module_id}",
                        "module_id": mod.module_id,
                        "modname": mod.modname,
                        "heading": mod.name,
                        "content_text": chunk_text,
                        "module_hash": incoming_hash,
                        "safety_status": "safe_material",
                    }
                )
                sanitized_modules.append(
                    {
                        "id": mod.module_id,
                        "name": mod.name,
                        "modname": mod.modname,
                        "url": mod.url,
                        "due_at": mod.due_at,
                        "module_hash": incoming_hash,
                        "safety_status": "safe_material",
                        "description": excerpt_val[:500] if excerpt_val else "",
                    }
                )

        if not safe_lines:
            safe_lines.append(sec.title)
        if not chunks:
            chunks.append(
                {
                    "chunk_id": "chunk-0",
                    "module_id": 0,
                    "modname": "section",
                    "heading": sec.title,
                    "content_text": sec.title,
                    "module_hash": compute_content_hash(sec.title),
                    "safety_status": "safe_material",
                }
            )

        section_dict = {
            "moodle_section_id": sec.moodle_section_id,
            "parent_section_id": sec.parent_section_id,
            "parent_section_index": sec.parent_section_index,
            "url": sec.url,
            "id": sec.section_index,
            "name": sec.title,
            "summary": sec.summary or "",
            "modules": sanitized_modules,
        }
        return "\n".join(safe_lines), section_dict, blocked, chunks

    @with_learning_provider
    async def sync_extension_payload(
        self, payload: ExtensionSyncPayload, owner_id: str, skip_live_ai: bool = False
    ) -> Dict[str, Any]:
        """
        Ingest sanitized course structure & module-level diffs for an isolated user.
        Reuses global content-addressed AI artifacts on cache hit and leaves ExamMix lazy.
        """
        authority = (
            payload.authority.lower().strip()
            if payload.authority and payload.authority != "auto"
            else resolve_authority_slug(payload.moodle_url, fallback="custom")
        )
        if authority not in ("ucu", "kpi", "lnu", "lpnu", "nure", "vntu", "demo", "custom"):
            authority = resolve_authority_slug(payload.moodle_url, fallback="custom")

        existing = self.get_course_bundle(payload.course_id, owner_id=owner_id)
        tools = payload.tools_config or (
            CourseToolsConfig.model_validate(existing["tools_config"])
            if existing
            else CourseToolsConfig()
        )

        prev_all_chunks = self._load_topic_chunks(owner_id=owner_id, course_id=payload.course_id)
        prev_by_mod: Dict[int, Dict[str, Any]] = {
            int(c["module_id"]): c for c in prev_all_chunks if int(c.get("module_id", 0)) > 0
        }
        prev_by_topic_cid: Dict[int, Dict[str, Dict[str, Any]]] = {}
        for c in prev_all_chunks:
            prev_by_topic_cid.setdefault(int(c["topic_index"]), {})[c["chunk_id"]] = c

        all_blocked: List[BlockedQuizNotice] = []
        sanitized_sections: List[Dict[str, Any]] = []
        new_topics = 0
        updated_topics = 0
        unchanged_topics = 0
        total_cache_hits = 0
        total_recomputed = 0

        existing_mixes_by_idx: Dict[int, TopicMix] = {
            m.topic_index: m for m in (existing["topic_mixes"] if existing else [])
        }

        for idx, sec in enumerate(payload.sections):
            prev_topic_map = prev_by_topic_cid.get(sec.section_index, {})
            content_text, sec_dict, blocked, topic_chunks = self._filter_and_serialize_section(
                sec,
                prev_chunks_by_module=prev_by_mod,
                prev_topic_chunks=prev_topic_map,
                extra_module_hashes=payload.module_hashes,
            )
            sanitized_sections.append(sec_dict)
            all_blocked.extend(blocked)

            dirty_chunks: List[str] = []
            for ch in topic_chunks:
                prev_ch = prev_topic_map.get(ch["chunk_id"])
                if not prev_ch or prev_ch["module_hash"] != ch["module_hash"]:
                    dirty_chunks.append(ch["chunk_id"])

            self._save_topic_chunks(
                owner_id=owner_id,
                course_id=payload.course_id,
                topic_index=sec.section_index,
                chunks=topic_chunks,
            )

            snapshot = RawTopicSnapshot(
                source_id=f"course-{payload.course_id}-sec-{sec.section_index}",
                course_id=payload.course_id,
                authority=authority,
                title=sec.title or f"Topic {idx + 1}",
                content_text=content_text,
                source_type="moodle_extension",
                safety_status="safe_material",
                visibility="private",
            )
            self._save_snapshot(snapshot, topic_index=sec.section_index, owner_id=owner_id)

            prev_mix = existing_mixes_by_idx.get(sec.section_index)
            if prev_mix and prev_mix.source_hash == snapshot.source_hash and not dirty_chunks:
                unchanged_topics += 1
            elif prev_mix:
                self._mark_mix_update_available(
                    prev_mix.mix_id,
                    owner_id=owner_id,
                    dirty_chunk_ids=dirty_chunks or [c["chunk_id"] for c in topic_chunks],
                )
                updated_topics += 1
            else:
                provider = current_provider.get()
                if skip_live_ai and provider and provider.strict:
                    # Course sync should ingest Moodle materials reliably without invoking paid/slow AI per section.
                    src_hash = snapshot.source_hash or compute_content_hash(snapshot.content_text)
                    now_utc = datetime.now(timezone.utc)
                    new_mix = TopicMix(
                        mix_id=f"mix-{snapshot.course_id}-{sec.section_index}-{src_hash[:8]}",
                        course_id=snapshot.course_id,
                        authority=snapshot.authority,
                        topic_index=sec.section_index,
                        title=snapshot.title,
                        source_hash=src_hash,
                        version=1,
                        visibility=snapshot.visibility,
                        tools_enabled=tools,
                        book_sections=[],
                        quizzes=[],
                        flashcards=[],
                        created_at=now_utc,
                        updated_at=now_utc,
                    )
                    hits, recomp = 0, 0
                else:
                    new_mix, hits, recomp = await self._build_topic_mix_cached(
                        snapshot=snapshot,
                        tools=tools,
                        topic_index=sec.section_index,
                        chunks=topic_chunks,
                        course_title=payload.course_name,
                    )
                # Attach real section materials with key items
                sec_raw_modules = [m.model_dump() if hasattr(m, "model_dump") else m for m in sec.modules]
                sec_mat_items = []
                for m_raw in sec_raw_modules:
                    m_name = m_raw.get("name") or "Матеріал"
                    m_mod = (m_raw.get("modname") or "resource").lower()
                    m_desc = m_raw.get("description") or m_raw.get("text_excerpt") or ""
                    m_type = detect_material_type(name=m_name, modname=m_mod, url=m_raw.get("url"), description=m_desc)
                    sec_mat_items.append(
                        TopicMaterialItem(
                            id=int(m_raw.get("module_id") or 0) or (sec.section_index * 1000 + len(sec_mat_items) + 1),
                            name=m_name,
                            material_type=m_type,
                            modname=m_mod,
                            url=m_raw.get("url"),
                            description=m_desc[:500] if m_desc else None,
                            key_items=MaterialTextAnalyzer.extract_key_items(text=m_desc, title=m_name, material_type=m_type, max_items=4),
                        )
                    )
                new_mix.materials = sec_mat_items
                total_cache_hits += hits
                total_recomputed += recomp
                self._save_topic_mix(new_mix, owner_id=owner_id)
                new_topics += 1

        prev_stale = existing["course"].exam_mix_stale if existing else False
        exam_stale = bool(
            tools.exam_mix
            and (new_topics > 0 or updated_topics > 0 or not existing or not existing["exam_mix"] or prev_stale)
        )

        shortname = payload.course_shortname or f"CRS-{payload.course_id}"
        if existing:
            sanitized_sections.extend(s for s in existing["sections"] if s.get("source_type") == "manual_upload")
        self._upsert_course(
            owner_id=owner_id,
            course_id=payload.course_id,
            authority=authority,
            title=payload.course_name,
            shortname=shortname,
            moodle_url=payload.moodle_url,
            source_type="moodle_extension",
            tools=tools,
            sections=sanitized_sections,
            blocked_quizzes=all_blocked,
            exam_mix_stale=exam_stale,
        )

        return {
            "course_id": payload.course_id,
            "authority": authority,
            "course_name": payload.course_name,
            "new_topics": new_topics,
            "updated_topics": updated_topics,
            "unchanged_topics": unchanged_topics,
            "blocked_exams": len(all_blocked),
            "cache_hits": total_cache_hits,
            "recomputed_artifacts": total_recomputed,
            "exam_mix_stale": exam_stale,
        }

    @with_learning_provider
    async def create_or_ingest_upload(
        self,
        title: str,
        authority: str,
        content_text: str,
        filename: str,
        tools: CourseToolsConfig,
        owner_id: str,
        course_id: Optional[int] = None,
        shortname: Optional[str] = None,
        debounce_seconds: Optional[float] = None,
        source_url: Optional[str] = None,
        modname: str = "resource",
    ) -> Dict[str, Any]:
        """
        Create/append a standalone course workspace from uploaded materials or pasted text.
        Splits large docs into semantic chunks, uses shared cache, and debounces ExamMix rebuilds.
        """
        now_id = course_id or self._next_custom_course_id(owner_id=owner_id)
        existing = self.get_course_bundle(now_id, owner_id=owner_id)
        topic_index = max([m.topic_index for m in existing["topic_mixes"]] + [1000000 if existing["course"].source_type != "manual_upload" else 0]) + 1 if existing else 1
        course_title = existing["course"].title if existing else title
        course_short = existing["course"].shortname if existing else (shortname or "CUSTOM")
        clean_auth = existing["course"].authority if existing else (authority or "custom")
        topic_title = title if filename in ("pasted-notes.md", "youtube-video.url") else filename

        if source_url and "[YouTube" not in content_text:
            digest = await self.resolve_youtube_digest(source_url, title=topic_title, course_title=course_title)
            if digest and digest.get("text"):
                tag = "[YouTube Transcript]" if digest["source"] == "youtube_captions" else "[YouTube Video Notes]"
                base_note = content_text.strip()
                content_text = f"{base_note}\n\n{tag} ({digest['url']})\n{digest['text']}".strip()

        snapshot = RawTopicSnapshot(
            source_id=f"upload-{now_id}-{topic_index}-{filename}",
            course_id=now_id,
            authority=clean_auth,
            title=topic_title,
            content_text=content_text,
            source_type="manual_upload",
            safety_status="safe_material",
            visibility="private",
        )
        self._save_snapshot(snapshot, topic_index=topic_index, owner_id=owner_id)

        raw_chunks = split_text_into_semantic_chunks(topic_title, content_text)
        chunk_records = [
            {
                "chunk_id": c["chunk_id"],
                "module_id": 0,
                "modname": modname if source_url else "upload",
                "heading": c["heading"],
                "content_text": c["content_text"],
                "module_hash": c["content_hash"],
                "safety_status": "safe_material",
            }
            for c in raw_chunks
        ]
        self._save_topic_chunks(
            owner_id=owner_id,
            course_id=now_id,
            topic_index=topic_index,
            chunks=chunk_records,
        )

        mod_label = topic_title if source_url else filename
        module_entry = {
            "id": topic_index * 100,
            "name": mod_label,
            "modname": modname or "resource",
            "safety_status": "safe_material",
            "description": content_text[:280],
        }
        if source_url:
            module_entry["url"] = source_url
        sections = list(existing["sections"]) if existing else []
        sections.append(
            {
                "id": topic_index,
                "source_type": "manual_upload",
                "name": snapshot.title,
                "summary": f"YouTube: {source_url}" if source_url else f"Uploaded file: {filename} ({len(chunk_records)} chunk(s))",
                "modules": [module_entry],
            }
        )

        self._upsert_course(
            owner_id=owner_id,
            course_id=now_id,
            authority=clean_auth,
            title=course_title,
            shortname=course_short,
            moodle_url=existing["course"].moodle_url if existing else "",
            source_type=existing["course"].source_type if existing else "manual_upload",
            tools=tools,
            sections=sections,
            blocked_quizzes=existing["blocked_quizzes"] if existing else [],
            exam_mix_stale=tools.exam_mix,
        )

        mat_items: List[TopicMaterialItem] = []
        if source_url:
            mat_items.append(
                TopicMaterialItem(
                    id=topic_index * 100,
                    name=mod_label,
                    material_type="video",
                    modname=modname or "url",
                    url=source_url,
                    description=content_text[:500],
                    has_transcript=True,
                )
            )
        topic_mix, cache_hits, recomputed = await self._build_topic_mix_cached(
            snapshot=snapshot,
            tools=tools,
            topic_index=topic_index,
            chunks=chunk_records,
            course_title=course_title,
            materials=mat_items,
        )
        self._save_topic_mix(topic_mix, owner_id=owner_id)

        queued_job = None
        if tools.exam_mix:
            async def _bg_exam_build() -> None:
                await self.build_exam_mix(now_id, owner_id=owner_id, from_queue=True)

            queued_job = get_build_queue().schedule(
                owner_id=owner_id,
                course_id=now_id,
                job_type="exam_mix",
                coro_factory=_bg_exam_build,
                debounce_seconds=debounce_seconds,
            )

        return {
            "course_id": now_id,
            "authority": clean_auth,
            "topic_mix_id": topic_mix.mix_id,
            "has_exam_mix": bool(existing and existing["exam_mix"]),
            "exam_mix_stale": tools.exam_mix,
            "queued_exam_build": queued_job is not None,
            "chunks_indexed": len(chunk_records),
            "cache_hits": cache_hits,
            "recomputed_artifacts": recomputed,
        }

    @with_learning_provider
    async def create_course_from_confirmed_structure(
        self,
        owner_id: str,
        course_id: int,
        title: str,
        shortname: str,
        authority: str,
        target_score: int,
        topics: List[TopicPreviewItem],
        tools: CourseToolsConfig,
        debounce_seconds: Optional[float] = None,
        gemini_api_key: Optional[str] = None,
        moodle_sections: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Build and persist a new course workspace from AI-generated, user-confirmed syllabus structure.
        Creates raw topic snapshots, semantic chunks, and TopicMixes for each topic with analyzed Moodle materials.
        """
        clean_auth = authority or "ucu"
        sections = []
        topic_mix_ids = []
        total_chunks = 0
        total_cache_hits = 0
        total_recomputed = 0

        # If no explicit Moodle sections provided, pull mock data if applicable
        if not moodle_sections and (get_settings().MOODLE_MOCK_MODE or clean_auth == "mock"):
            from app.services.mock_data import MOCK_COURSE_CONTENTS
            moodle_sections = MOCK_COURSE_CONTENTS.get(course_id)

        # Match real materials to topics and extract key items for each material
        matched_items_by_topic: Dict[int, List[TopicMaterialItem]] = {}
        if moodle_sections:
            from app.services.content_clusterer import MaterialContentClusterer
            topics_data = [
                {
                    "topic_index": t.topic_index,
                    "title": t.title,
                    "keywords": getattr(t, "keywords", None) or t.key_concepts or [t.title],
                    "key_concepts": t.key_concepts,
                }
                for t in topics
            ]
            matched_items_by_topic = MaterialContentClusterer.cluster_all_materials(
                sections=moodle_sections, canonical_topics=topics_data
            )
            # Fallback if clustering returned empty
            if not any(matched_items_by_topic.values()):
                matcher = CourseUpdateMatcher(topics_data)
                match_res = matcher.match_all_sections(moodle_sections)
                matched_items_by_topic = match_res.get("topic_material_items", {})

        for t in topics:
            t_idx = t.topic_index
            t_title = t.title
            content_text = (
                f"# {t_title}\n\n"
                f"**Рівень складності:** {t.difficulty} | **Орієнтовний час:** {t.estimated_hours} год.\n\n"
                f"{t.summary}\n\n"
                f"## Ключові концепції:\n" + "\n".join(f"- {c}" for c in t.key_concepts) + "\n\n"
                f"## План вивчення (Цільовий бал: {target_score}%):\n{t.suggested_focus}"
            )

            snapshot = RawTopicSnapshot(
                source_id=f"syllabus-{course_id}-{t_idx}",
                course_id=course_id,
                authority=clean_auth,
                title=t_title,
                content_text=content_text,
                source_type="moodle_extension",
                safety_status="safe_material",
                visibility="private",
            )
            self._save_snapshot(snapshot, topic_index=t_idx, owner_id=owner_id)

            raw_chunks = split_text_into_semantic_chunks(t_title, content_text)
            chunk_records = [
                {
                    "chunk_id": c["chunk_id"],
                    "module_id": 0,
                    "modname": "syllabus",
                    "heading": c["heading"],
                    "content_text": c["content_text"],
                    "module_hash": c["content_hash"],
                    "safety_status": "safe_material",
                }
                for c in raw_chunks
            ]
            self._save_topic_chunks(
                owner_id=owner_id,
                course_id=course_id,
                topic_index=t_idx,
                chunks=chunk_records,
            )

            sections.append({
                "id": t_idx,
                "name": t_title,
                "summary": t.summary,
                "modules": [
                    {
                        "id": t_idx * 100,
                        "name": f"Матеріали теми: {t_title}",
                        "modname": "resource",
                        "safety_status": "safe_material",
                        "description": t.summary,
                    }
                ],
            })

            topic_mat_items = matched_items_by_topic.get(t_idx, [])
            topic_mix, cache_hits, recomputed = await self._build_topic_mix_cached(
                snapshot=snapshot,
                tools=tools,
                topic_index=t_idx,
                chunks=chunk_records,
                api_key=gemini_api_key,
                materials=topic_mat_items,
                course_title=title,
            )
            topic_mix.materials = topic_mat_items
            topic_mix.keywords = list(getattr(t, "keywords", None) or t.key_concepts or [t_title])
            topic_mix.last_updated_at = t.last_updated_at or _utc_iso()
            self._save_topic_mix(topic_mix, owner_id=owner_id)
            topic_mix_ids.append(topic_mix.mix_id)
            total_chunks += len(chunk_records)
            total_cache_hits += cache_hits
            total_recomputed += recomputed

        self._upsert_course(
            owner_id=owner_id,
            course_id=course_id,
            authority=clean_auth,
            title=title,
            shortname=shortname or "COURSE",
            moodle_url="",
            source_type="moodle_extension",
            tools=tools,
            sections=moodle_sections if moodle_sections else sections,
            blocked_quizzes=[],
            exam_mix_stale=tools.exam_mix,
            gemini_api_key=gemini_api_key,
            last_moodle_check_at=_utc_iso(),
        )

        queued_job = None
        if tools.exam_mix:
            async def _bg_exam_build() -> None:
                await self.build_exam_mix(course_id, owner_id=owner_id, from_queue=True)

            queued_job = get_build_queue().schedule(
                owner_id=owner_id,
                course_id=course_id,
                job_type="exam_mix",
                coro_factory=_bg_exam_build,
                debounce_seconds=debounce_seconds,
            )

        return {
            "success": True,
            "course_id": course_id,
            "authority": clean_auth,
            "topics_count": len(topics),
            "workspace_url": f"/{clean_auth}/courses/{course_id}",
            "topic_mix_ids": topic_mix_ids,
            "exam_mix_queued": queued_job is not None,
            "chunks_indexed": total_chunks,
            "cache_hits": total_cache_hits,
            "recomputed_artifacts": total_recomputed,
        }

    @with_learning_provider
    async def check_and_apply_course_updates(
        self,
        course_id: int,
        owner_id: str,
        moodle_client: Optional[Any] = None,
        session: Optional[Dict[str, Any]] = None,
        force: bool = False,
    ) -> Dict[str, Any]:
        """
        Automatic course updater with 1-minute debounce:
        1. Checks if last update check was within 60 seconds (returns early if so, unless force=True).
        2. Retrieves latest Moodle contents.
        3. Uses CourseUpdateMatcher to map new/modified materials to topics by logical structure
           or maximum keyword overlap.
        4. Updates topic timestamps and regenerates dirty TopicMixes without losing user notes.
        """
        bundle = self.get_course_bundle(course_id, owner_id=owner_id)
        if not bundle:
            return {"checked": False, "error": f"Course {course_id} not found."}

        with self._connect() as conn:
            row = conn.execute(
                "SELECT gemini_api_key, last_moodle_check_at, tools_config_json FROM workspace_courses WHERE owner_id = ? AND course_id = ?",
                (owner_id, course_id),
            ).fetchone()

        course_api_key = row["gemini_api_key"] if row and "gemini_api_key" in row.keys() else None
        last_check = row["last_moodle_check_at"] if row and "last_moodle_check_at" in row.keys() else None

        now = datetime.now(timezone.utc)
        if not force and last_check:
            try:
                dt_check = datetime.fromisoformat(last_check)
                if dt_check.tzinfo is None:
                    dt_check = dt_check.replace(tzinfo=timezone.utc)
                age = (now - dt_check).total_seconds()
                if age < 60:
                    return {
                        "checked": False,
                        "debounced": True,
                        "age_seconds": round(age, 1),
                        "has_updates": False,
                        "message": f"Курс було перевірено {round(age)}с тому. Наступна автоперевірка через {int(60 - age)}с.",
                    }
            except Exception:
                pass

        if bundle["course"].source_type == "manual_upload":
            return {"checked": False, "has_updates": False, "message": "Курс містить власні матеріали."}
        fresh_sections = None
        if moodle_client and session and session.get("moodle_token"):
            # Retrieve fresh contents from Moodle
            try:
                fresh_sections = await moodle_client.get_course_contents(
                    token=session["moodle_token"],
                    course_id=course_id,
                    auth_type=session.get("auth_type", "token"),
                    sesskey=session.get("sesskey"),
                    base_url=session.get("site_url"),
                )
            except Exception as exc:
                logger.warning(f"Failed to fetch Moodle course contents for update check: {exc}")
                return {"checked": False, "error": str(exc)}
        elif (get_settings().MOODLE_MOCK_MODE or bundle["course"].authority == "mock") and bundle["course"].source_type != "manual_upload":
            from app.services.mock_data import MOCK_COURSE_CONTENTS
            fresh_sections = MOCK_COURSE_CONTENTS.get(course_id)
        else:
            return {
                "checked": False,
                "has_updates": False,
                "message": "Немає активної Moodle-сесії для перевірки оновлень.",
            }

        if not fresh_sections:
            with self._connect() as conn:
                conn.execute(
                    "UPDATE workspace_courses SET last_moodle_check_at = ? WHERE owner_id = ? AND course_id = ?",
                    (now.isoformat(), owner_id, course_id),
                )
            return {"checked": True, "has_updates": False, "message": "Матеріали актуальні."}

        fresh_sections = [{**s, "modules": [dict(m) for m in s.get("modules", [])]} for s in fresh_sections]
        fresh_sections.extend(s for s in bundle["sections"] if s.get("source_type") == "manual_upload")
        from app.services.course_organization import safe_sections
        fresh_sections = safe_sections(fresh_sections)

        # Build topics list for matcher
        existing_mixes: List[TopicMix] = bundle.get("topic_mixes", [])
        topics_data: List[Dict[str, Any]] = []
        for m in existing_mixes:
            topics_data.append({
                "topic_index": m.topic_index,
                "title": m.title,
                "keywords": getattr(m, "keywords", None) or [],
                "last_updated_at": getattr(m, "last_updated_at", None),
            })

        existing_chunks = self._load_topic_chunks(owner_id=owner_id, course_id=course_id)
        previous_content = {int(c["module_id"]): c["content_text"] for c in existing_chunks if int(c.get("module_id", 0)) > 0}
        existing_hashes = {
            int(c["module_id"]): c["module_hash"]
            for c in existing_chunks
            if int(c.get("module_id", 0)) > 0
        }

        matcher = CourseUpdateMatcher(topics_data)
        match_res = matcher.match_all_sections(fresh_sections, existing_hashes)

        tools = CourseToolsConfig.model_validate(bundle["tools_config"])
        updated_topics_count = 0

        if match_res["has_updates"]:
            for t_idx in match_res["dirty_topics"]:
                assigned_mods = match_res["topic_materials"].get(t_idx, [])
                if not assigned_mods:
                    continue

                existing_mix = next((m for m in existing_mixes if m.topic_index == t_idx), None)

                new_chunks = []
                for mod in assigned_mods:
                    m_id = mod.get("id", 0)
                    m_name = mod.get("name", f"Resource {m_id}")
                    m_desc = mod.get("description") or ""
                    m_hash = mod.get("module_hash") or compute_content_hash(f"{m_id}:{m_name}")
                    new_chunks.append({
                        "chunk_id": f"mod-{m_id}",
                        "module_id": m_id,
                        "modname": mod.get("modname", "resource"),
                        "heading": m_name,
                        "content_text": previous_content.get(m_id) or f"{m_name}\n\n{m_desc}",
                        "module_hash": m_hash,
                        "safety_status": mod.get("safety_status", "safe_material"),
                    })

                self._save_topic_chunks(
                    owner_id=owner_id,
                    course_id=course_id,
                    topic_index=t_idx,
                    chunks=new_chunks,
                )

                t_title = existing_mix.title if existing_mix else f"Тема {t_idx}"
                snap_rec = RawTopicSnapshot(
                    source_id=f"syllabus-{course_id}-{t_idx}",
                    course_id=course_id,
                    authority=bundle["course"].authority,
                    title=t_title,
                    content_text="\n\n".join(c["content_text"] for c in new_chunks),
                    source_type="moodle_api",
                    safety_status="safe_material",
                    visibility="private",
                )

                topic_mat_items = match_res.get("topic_material_items", {}).get(t_idx, [])
                rebuilt_mix, _, _ = await self._build_topic_mix_cached(
                    snapshot=snap_rec,
                    tools=tools,
                    topic_index=t_idx,
                    chunks=new_chunks,
                    existing_notes=existing_mix.user_notes if existing_mix else None,
                    version=(existing_mix.version + 1) if existing_mix else 1,
                    stable_mix_id=existing_mix.mix_id if existing_mix else None,
                    api_key=course_api_key,
                    materials=topic_mat_items,
                    course_title=bundle["course"].title,
                )
                rebuilt_mix.has_upstream_update = True
                rebuilt_mix.materials = topic_mat_items
                rebuilt_mix.keywords = matcher._extract_topic_keywords(
                    next((td for td in topics_data if td["topic_index"] == t_idx), {})
                )
                rebuilt_mix.last_updated_at = match_res["topic_timestamps"].get(t_idx) or now.isoformat()
                self._save_topic_mix(rebuilt_mix, owner_id=owner_id)
                updated_topics_count += 1

            self._set_exam_mix_stale(owner_id=owner_id, course_id=course_id, stale=True)

            await event_bus.publish(
                AcademicEvent(
                    type="topic.update_available",
                    title=f"Оновлено курс: {bundle['course'].title}",
                    message=f"Виявлено {match_res['new_materials_count']} нових матеріалів у {len(match_res['dirty_topics'])} темах.",
                    severity="info",
                    owner_id=owner_id,
                    data={"course_id": course_id, "dirty_topics": match_res["dirty_topics"]},
                )
            )

        with self._connect() as conn:
            conn.execute(
                "UPDATE workspace_courses SET sections_json = ?, last_moodle_check_at = ?, updated_at = ? WHERE owner_id = ? AND course_id = ?",
                (json.dumps(fresh_sections), now.isoformat(), _utc_iso(), owner_id, course_id),
            )

        return {
            "checked": True,
            "has_updates": match_res["has_updates"],
            "dirty_topics": match_res["dirty_topics"],
            "updated_topics_count": updated_topics_count,
            "new_materials_count": match_res["new_materials_count"],
            "total_materials_count": match_res["total_materials_count"],
            "topic_timestamps": match_res["topic_timestamps"],
            "message": (
                f"Виявлено {match_res['new_materials_count']} оновлень!"
                if match_res["has_updates"]
                else "Всі матеріали курсу актуальні."
            ),
        }

    @staticmethod
    def _current_mix_rows(rows) -> List[Dict[str, Any]]:
        """One current generation per source topic; historical rows stay untouched.

        Older generators used a content hash in mix_id, so a changed source could
        leave several IDs for the same owner/course/topic. Names are not identity:
        two separate sections called "Lecture" must remain separate topics.
        """
        groups: Dict[Tuple[str, int, int], List[Dict[str, Any]]] = {}
        for row in rows:
            key = (row["owner_id"], row["course_id"], row["topic_index"])
            groups.setdefault(key, []).append(dict(row))
        current = []
        for key in sorted(groups):
            versions = groups[key]
            selected = dict(max(versions, key=lambda row: (
                row["version"], row["updated_at"], row["mix_id"],
            )))
            # None means no note was saved on this generation. An explicit empty
            # string is a cleared note and must not resurrect an older revision.
            if selected["user_notes"] is None:
                notes = [row for row in versions if row["user_notes"] is not None]
                if notes:
                    selected["user_notes"] = max(notes, key=lambda row: (
                        row["updated_at"], row["version"], row["mix_id"],
                    ))["user_notes"]
            current.append(selected)
        return current

    def _current_mix_for_row(self, conn, row) -> Dict[str, Any]:
        versions = conn.execute(
            "SELECT * FROM topic_mixes WHERE owner_id = ? AND course_id = ? AND topic_index = ?",
            (row["owner_id"], row["course_id"], row["topic_index"]),
        ).fetchall()
        return self._current_mix_rows(versions)[0]

    def list_courses(self, owner_id: str) -> List[WorkspaceCourseSummary]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM workspace_courses WHERE owner_id = ? ORDER BY updated_at DESC",
                (owner_id,),
            ).fetchall()

            results: List[WorkspaceCourseSummary] = []
            for row in rows:
                cid = row["course_id"]
                mix_stats = conn.execute(
                    "SELECT COUNT(*) AS cnt, COALESCE(SUM(has_upstream_update), 0) AS upd "
                    "FROM (SELECT has_upstream_update, ROW_NUMBER() OVER ("
                    "PARTITION BY topic_index ORDER BY version DESC, updated_at DESC, mix_id DESC"
                    ") AS generation_rank FROM topic_mixes WHERE owner_id = ? AND course_id = ?) "
                    "WHERE generation_rank = 1",
                    (owner_id, cid),
                ).fetchone()
                has_exam = (
                    conn.execute(
                        "SELECT 1 FROM exam_mixes WHERE owner_id = ? AND course_id = ?",
                        (owner_id, cid),
                    ).fetchone()
                    is not None
                )
                blocked_list = json.loads(row["blocked_quizzes_json"] or "[]")
                results.append(
                    WorkspaceCourseSummary(
                        course_id=cid,
                        owner_id=owner_id,
                        authority=row["authority"],
                        title=row["title"],
                        shortname=row["shortname"],
                        moodle_url=row["moodle_url"],
                        source_type=row["source_type"],
                        visibility=row["visibility"],
                        tools_config=CourseToolsConfig.model_validate_json(row["tools_config_json"]),
                        topic_count=mix_stats["cnt"] if mix_stats else 0,
                        has_exam_mix=has_exam,
                        exam_mix_stale=bool(row["exam_mix_stale"]) if "exam_mix_stale" in row.keys() else False,
                        updates_pending=int(mix_stats["upd"]) if mix_stats else 0,
                        blocked_quizzes_count=len(blocked_list),
                        updated_at=datetime.fromisoformat(row["updated_at"]),
                    )
                )
            return results

    def get_course_bundle(self, course_id: int, owner_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            course_row = conn.execute(
                "SELECT * FROM workspace_courses WHERE owner_id = ? AND course_id = ?",
                (owner_id, course_id),
            ).fetchone()
            if not course_row:
                return None

            snap_rows = conn.execute(
                "SELECT * FROM topic_snapshots WHERE owner_id = ? AND course_id = ? ORDER BY topic_index ASC",
                (owner_id, course_id),
            ).fetchall()
            mix_rows = conn.execute(
                "SELECT * FROM topic_mixes WHERE owner_id = ? AND course_id = ? ORDER BY topic_index ASC",
                (owner_id, course_id),
            ).fetchall()
            exam_row = conn.execute(
                "SELECT * FROM exam_mixes WHERE owner_id = ? AND course_id = ?",
                (owner_id, course_id),
            ).fetchone()

        mix_rows = self._current_mix_rows(mix_rows)
        blocked = [
            BlockedQuizNotice.model_validate(item)
            for item in json.loads(course_row["blocked_quizzes_json"] or "[]")
        ]
        snapshots = [
            RawTopicSnapshot(
                source_id=r["source_id"],
                course_id=r["course_id"],
                authority=r["authority"],
                title=r["title"],
                content_text=r["content_text"],
                source_type=r["source_type"],
                source_hash=r["source_hash"],
                safety_status=r["safety_status"],
                visibility=r["visibility"],
            )
            for r in snap_rows
        ]
        sections_data = json.loads(course_row["sections_json"] or "[]")
        mixes: List[TopicMix] = []
        for r in mix_rows:
            mix = TopicMix.model_validate_json(r["mix_json"])
            mix.has_upstream_update = bool(r["has_upstream_update"])
            mix.user_notes = r["user_notes"]
            mixes.append(mix)

        # Dynamic Material Linking & Key-Item Extraction:
        # Ensures that every time a topic is loaded, all Moodle materials related to it
        # (videos, audios, lectures, self-tests) and their analyzed key items are present.
        if mixes and any(not m.materials for m in mixes) and sections_data:
            try:
                topics_data = [
                    {
                        "topic_index": m.topic_index,
                        "title": m.title,
                        "keywords": getattr(m, "keywords", None) or [m.title],
                    }
                    for m in mixes
                ]
                matcher = CourseUpdateMatcher(topics_data)
                match_res = matcher.match_all_sections(sections_data)
                mat_items_map = match_res.get("topic_material_items", {})
                for m in mixes:
                    if not m.materials and m.topic_index in mat_items_map:
                        m.materials = mat_items_map[m.topic_index]
            except Exception as e:
                logger.debug(f"Dynamic material enrichment error in get_course_bundle: {e}")

        exam_mix = ExamMix.model_validate_json(exam_row["exam_mix_json"]) if exam_row else None
        tools_cfg = CourseToolsConfig.model_validate_json(course_row["tools_config_json"])

        summary = WorkspaceCourseSummary(
            course_id=course_row["course_id"],
            owner_id=owner_id,
            authority=course_row["authority"],
            title=course_row["title"],
            shortname=course_row["shortname"],
            moodle_url=course_row["moodle_url"],
            source_type=course_row["source_type"],
            visibility=course_row["visibility"],
            tools_config=tools_cfg,
            topic_count=len(mixes),
            has_exam_mix=exam_mix is not None,
            exam_mix_stale=bool(course_row["exam_mix_stale"]) if "exam_mix_stale" in course_row.keys() else False,
            updates_pending=sum(1 for m in mixes if m.has_upstream_update),
            blocked_quizzes_count=len(blocked),
            updated_at=datetime.fromisoformat(course_row["updated_at"]),
        )

        return {
            "course": summary,
            "tools_config": tools_cfg.model_dump(),
            "sections": json.loads(course_row["sections_json"] or "[]"),
            "snapshots": snapshots,
            "topic_mixes": mixes,
            "exam_mix": exam_mix,
            "blocked_quizzes": blocked,
        }

    def update_tools_config(self, course_id: int, tools: CourseToolsConfig, owner_id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute(
                "UPDATE workspace_courses SET tools_config_json = ?, updated_at = ? "
                "WHERE owner_id = ? AND course_id = ?",
                (tools.model_dump_json(), _utc_iso(), owner_id, course_id),
            )
            return cur.rowcount > 0

    @with_learning_provider
    async def regenerate_course_mixes_detailed(
        self, course_id: int, owner_id: str, force_full: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Incrementally update enabled artifacts across topics:
        toggling flashcards computes ONLY flashcards from existing takeaways without touching books/quizzes.
        """
        bundle = self.get_course_bundle(course_id, owner_id=owner_id)
        if not bundle:
            return None

        tools = CourseToolsConfig.model_validate(bundle["tools_config"])
        generator = get_mix_generator()
        pv = generator.prompt_version
        prev_by_idx = {m.topic_index: m for m in bundle["topic_mixes"]}

        with self._connect() as conn:
            snap_rows = conn.execute(
                "SELECT * FROM topic_snapshots WHERE owner_id = ? AND course_id = ? ORDER BY topic_index ASC",
                (owner_id, course_id),
            ).fetchall()

        updated: List[TopicMix] = []
        recomputed_names = set()
        reused_names = set()
        total_cache_hits = 0

        for r in snap_rows:
            t_idx = r["topic_index"]
            snap = RawTopicSnapshot(
                source_id=r["source_id"],
                course_id=r["course_id"],
                authority=r["authority"],
                title=r["title"],
                content_text=r["content_text"],
                source_type=r["source_type"],
                source_hash=r["source_hash"],
                safety_status=r["safety_status"],
                visibility=r["visibility"],
            )
            if snap.safety_status == "restricted_exam":
                continue

            chunks = self._load_topic_chunks(owner_id=owner_id, course_id=course_id, topic_index=t_idx)
            if not chunks:
                chunks = [
                    {
                        "chunk_id": c["chunk_id"],
                        "module_id": 0,
                        "modname": snap.source_type,
                        "heading": c["heading"],
                        "content_text": c["content_text"],
                        "module_hash": c["content_hash"],
                        "safety_status": snap.safety_status,
                    }
                    for c in split_text_into_semantic_chunks(snap.title, snap.content_text)
                ]

            old_mix = prev_by_idx.get(t_idx)
            if (
                not force_full
                and old_mix
                and not old_mix.has_upstream_update
                and old_mix.source_hash == snap.source_hash
            ):
                changed = False
                course_title = bundle["course"].title
                # 1. Book sections (+ independent mermaid/visual cards)
                if not tools.interactive_book:
                    book_sections = []
                    if old_mix.book_sections:
                        changed = True
                elif not old_mix.book_sections:
                    book_sections, hits, _ = await self._build_book_sections_cached(
                        chunks=chunks,
                        include_mermaid=tools.mermaid_diagrams,
                        include_visual_cards=tools.visual_cards,
                        source_type=snap.source_type,
                        source_id=snap.source_id,
                        course_title=course_title,
                        topic_title=snap.title,
                    )
                    total_cache_hits += hits
                    recomputed_names.add("book_sections")
                    changed = True
                else:
                    reused_names.add("book_sections")
                    book_sections = []
                    for sec in old_mix.book_sections:
                        sec_copy = sec.model_copy(deep=True)
                        sec_hash = self._scoped_cache_hash(
                            sec_copy.source_hash or snap.source_hash,
                            course_title=course_title,
                            topic_title=snap.title,
                        )
                        if not tools.mermaid_diagrams:
                            if sec_copy.mermaid_diagram is not None:
                                sec_copy.mermaid_diagram = None
                                changed = True
                        elif not sec_copy.mermaid_diagram:
                            cached_mmd = self._get_cached_artifact(sec_hash, "mermaid_diagram", pv)
                            if cached_mmd:
                                sec_copy.mermaid_diagram = json.loads(cached_mmd)["mermaid_diagram"]
                                total_cache_hits += 1
                            else:
                                sec_copy.mermaid_diagram = await generator.generate_mermaid_diagram(
                                    sec_copy.heading, sec_copy.key_takeaways, course_title=course_title
                                )
                                self._put_cached_artifact(
                                    sec_hash,
                                    "mermaid_diagram",
                                    pv,
                                    json.dumps({"mermaid_diagram": sec_copy.mermaid_diagram}),
                                    safety_status=snap.safety_status,
                                )
                            recomputed_names.add("mermaid_diagrams")
                            changed = True
                        else:
                            reused_names.add("mermaid_diagrams")

                        if not tools.visual_cards:
                            if sec_copy.visual_card_caption is not None or sec_copy.visual_card_prompt is not None:
                                sec_copy.visual_card_caption = None
                                sec_copy.visual_card_prompt = None
                                changed = True
                        elif not sec_copy.visual_card_caption:
                            cached_card = self._get_cached_artifact(sec_hash, "visual_card", pv)
                            if cached_card:
                                card_obj = json.loads(cached_card)
                                sec_copy.visual_card_caption = card_obj["visual_card_caption"]
                                sec_copy.visual_card_prompt = card_obj["visual_card_prompt"]
                                total_cache_hits += 1
                            else:
                                cap, prm = await generator.generate_visual_card(sec_copy.heading)
                                sec_copy.visual_card_caption = cap
                                sec_copy.visual_card_prompt = prm
                                self._put_cached_artifact(
                                    sec_hash,
                                    "visual_card",
                                    pv,
                                    json.dumps(
                                        {
                                            "visual_card_caption": cap,
                                            "visual_card_prompt": prm,
                                        }
                                    ),
                                    safety_status=snap.safety_status,
                                )
                            recomputed_names.add("visual_cards")
                            changed = True
                        else:
                            reused_names.add("visual_cards")

                        book_sections.append(sec_copy)

                # 2. Quizzes (independent)
                if not tools.practice_quizzes:
                    quizzes = []
                    if old_mix.quizzes:
                        changed = True
                elif old_mix.tools_enabled.practice_quizzes and old_mix.quizzes:
                    quizzes = list(old_mix.quizzes)
                    reused_names.add("practice_quizzes")
                else:
                    quizzes, hits, _ = await self._build_quizzes_cached(
                        title=snap.title,
                        source_hash=snap.source_hash or "",
                        content_text=snap.content_text,
                        safety_status=snap.safety_status,
                        course_title=course_title,
                    )
                    total_cache_hits += hits
                    recomputed_names.add("practice_quizzes")
                    changed = True

                # 3. Flashcards (computed purely from existing key_takeaways!)
                if not tools.flashcards:
                    flashcards = []
                    if old_mix.flashcards:
                        changed = True
                elif old_mix.tools_enabled.flashcards and old_mix.flashcards:
                    flashcards = list(old_mix.flashcards)
                    reused_names.add("flashcards")
                else:
                    takeaways = [tk for sec in book_sections for tk in sec.key_takeaways][:10]
                    if not takeaways:
                        takeaways, _ = _extract_key_points(snap.content_text, snap.title, limit=4)
                    flashcards, hits, _ = await self._build_flashcards_cached(
                        title=snap.title,
                        source_hash=snap.source_hash or "",
                        key_takeaways=takeaways,
                        safety_status=snap.safety_status,
                        course_title=course_title,
                    )
                    total_cache_hits += hits
                    recomputed_names.add("flashcards")
                    changed = True

                new_mix = TopicMix(
                    mix_id=old_mix.mix_id,
                    course_id=old_mix.course_id,
                    authority=old_mix.authority,
                    topic_index=t_idx,
                    title=old_mix.title,
                    source_hash=old_mix.source_hash,
                    version=old_mix.version + (1 if changed else 0),
                    visibility=old_mix.visibility,
                    tools_enabled=tools,
                    book_sections=book_sections,
                    quizzes=quizzes,
                    flashcards=flashcards,
                    user_notes=old_mix.user_notes,
                    has_upstream_update=False,
                    dirty_chunk_ids=[],
                    created_at=old_mix.created_at,
                    updated_at=datetime.now(timezone.utc),
                )
            else:
                old_sec_map = (
                    {s.chunk_id: s for s in old_mix.book_sections if s.chunk_id}
                    if (old_mix and not force_full)
                    else None
                )
                new_mix, hits, recomp = await self._build_topic_mix_cached(
                    snapshot=snap,
                    tools=tools,
                    topic_index=t_idx,
                    chunks=chunks,
                    existing_notes=old_mix.user_notes if old_mix else None,
                    version=(old_mix.version + 1) if old_mix else 1,
                    stable_mix_id=old_mix.mix_id if old_mix else None,
                    old_sections_by_chunk=old_sec_map,
                    course_title=bundle["course"].title,
                )
                total_cache_hits += hits
                if recomp > 0:
                    recomputed_names.add("topic_mix")

            self._save_topic_mix(new_mix, owner_id=owner_id)
            updated.append(new_mix)

        exam_stale = bool(tools.exam_mix and (recomputed_names or force_full or bundle["course"].exam_mix_stale))
        self._set_exam_mix_stale(owner_id, course_id, exam_stale)

        return {
            "topic_mixes": updated,
            "recomputed_artifacts": sorted(recomputed_names),
            "reused_artifacts": sorted(reused_names),
            "cache_hits": total_cache_hits,
            "exam_mix_stale": exam_stale,
        }

    async def regenerate_course_mixes(
        self, course_id: int, owner_id: str, force_full: bool = False
    ) -> Optional[List[TopicMix]]:
        """Incremental TopicMix update wrapper preserving List[TopicMix] signature."""
        res = await self.regenerate_course_mixes_detailed(
            course_id, owner_id=owner_id, force_full=force_full
        )
        return res["topic_mixes"] if res is not None else None

    @with_learning_provider
    async def build_exam_mix(
        self, course_id: int, owner_id: str, from_queue: bool = False
    ) -> Optional[ExamMix]:
        """
        Incremental 'Mix of Mixes': reuses cached ~200-400 token TopicDigests for unchanged topics
        and updates only modified/new topic digests, attaching private user_notes strictly in memory.
        """
        if not from_queue:
            get_build_queue().cancel_job(owner_id, course_id, "exam_mix")

        bundle = self.get_course_bundle(course_id, owner_id=owner_id)
        if not bundle or not bundle["topic_mixes"]:
            return None

        generator = get_mix_generator()
        pv = generator.prompt_version
        course = bundle["course"]
        from app.services.learning_provider import current_provider, LearningProviderError
        provider = current_provider.get()
        if provider and provider.strict:
            prepared = []
            for topic in bundle["topic_mixes"]:
                questions = [q for q in topic.quizzes if not re.search(
                    r"Which key concept is explicitly introduced|How many core study items were indexed|AI Engineer will enrich",
                    q.question + q.explanation)]
                sections = [s for s in topic.book_sections if not re.search(
                    r"This interactive unit organizes material from|Опрацювання матеріалу з \*\*", s.explanation_markdown)]
                if questions or sections:
                    prepared.append(topic.model_copy(update={"quizzes": questions, "book_sections": sections}))
            if not prepared:
                raise LearningProviderError("Спочатку підготуй навчальні матеріали хоча б однієї теми.", 422)
            bundle["topic_mixes"] = prepared
        prev_exam: Optional[ExamMix] = bundle["exam_mix"]
        prev_digests: Dict[str, TopicDigest] = {
            d.mix_id: d for d in (prev_exam.topic_digests if prev_exam else [])
        }

        per_user_digests: List[TopicDigest] = []
        incremental_updates = 0
        cached_topics_reused = 0

        for mix in bundle["topic_mixes"]:
            note_highlight = (
                mix.user_notes.strip()[:240]
                if (mix.user_notes and mix.user_notes.strip())
                else None
            )
            digest_cache_input = compute_content_hash(
                f"{mix.source_hash}:{mix.version}:{len(mix.book_sections)}:{len(mix.quizzes)}:{mix.title}"
            )
            prev_d = prev_digests.get(mix.mix_id)
            if (
                prev_d is not None
                and prev_d.source_hash == mix.source_hash
                and len(prev_d.sample_question_prompts) == min(3, len(mix.quizzes))
            ):
                base_digest = prev_d
                cached_topics_reused += 1
            else:
                cached_digest_json = self._get_cached_artifact(
                    digest_cache_input, "topic_digest", pv
                )
                if cached_digest_json:
                    base_digest = TopicDigest.model_validate_json(cached_digest_json)
                    base_digest.mix_id = mix.mix_id
                    base_digest.topic_index = mix.topic_index
                    cached_topics_reused += 1
                else:
                    base_digest = await generator.build_topic_digest(
                        mix, include_user_notes=False
                    )
                    self._put_cached_artifact(
                        digest_cache_input,
                        "topic_digest",
                        pv,
                        base_digest.model_dump_json(),
                        safety_status="safe_material",
                    )
                    incremental_updates += 1

            per_user_digests.append(
                base_digest.model_copy(update={"user_note_highlight": note_highlight})
            )

        exam_mix = await generator.merge_exam_mix(
            course_id=course_id,
            authority=course.authority,
            course_title=course.title,
            topic_digests=per_user_digests,
            topic_mixes=bundle["topic_mixes"],
            incremental_updates=incremental_updates,
            cached_topics_reused=cached_topics_reused,
            weak_spots=self._get_course_weak_spots(owner_id=owner_id, course_id=course_id),
        )
        if provider and provider.strict:
            exam_mix.mock_exam_questions = [q for q in exam_mix.mock_exam_questions
                if not q.question.startswith("Which mode builds the cross-topic prep sheet")]
        self._save_exam_mix(exam_mix, owner_id=owner_id)
        self._set_exam_mix_stale(owner_id, course_id, False)

        await event_bus.publish(
            AcademicEvent(
                type="mix.ready",
                title=f"Exam Mix Ready: {course.title}",
                message=(
                    f"Synthesized {len(per_user_digests)} topic digests "
                    f"({cached_topics_reused} reused, {incremental_updates} rebuilt)."
                ),
                severity="success",
                owner_id=owner_id,
                data={
                    "course_id": course_id,
                    "authority": course.authority,
                    "incremental_updates": incremental_updates,
                    "cached_topics_reused": cached_topics_reused,
                },
            )
        )
        return exam_mix

    def save_mix_notes(self, mix_id: str, notes: str, owner_id: str) -> Optional[TopicMix]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM topic_mixes WHERE owner_id = ? AND mix_id = ?",
                (owner_id, mix_id),
            ).fetchone()
            if not row:
                return None
            row = self._current_mix_for_row(conn, row)
            mix_id = row["mix_id"]
            mix = TopicMix.model_validate_json(row["mix_json"])
            mix.user_notes = notes
            mix.updated_at = datetime.now(timezone.utc)
            conn.execute(
                "UPDATE topic_mixes SET user_notes = ?, mix_json = ?, updated_at = ? "
                "WHERE owner_id = ? AND mix_id = ?",
                (notes, mix.model_dump_json(), _utc_iso(), owner_id, mix_id),
            )
            has_exam = (
                conn.execute(
                    "SELECT 1 FROM exam_mixes WHERE owner_id = ? AND course_id = ?",
                    (owner_id, mix.course_id),
                ).fetchone()
                is not None
            )
            if has_exam:
                conn.execute(
                    "UPDATE workspace_courses SET exam_mix_stale = 1 WHERE owner_id = ? AND course_id = ?",
                    (owner_id, mix.course_id),
                )
            return mix

    @with_learning_provider
    async def acknowledge_mix_update(self, mix_id: str, owner_id: str) -> Optional[TopicMix]:
        """Apply updated upstream module chunks to a TopicMix, reusing clean chunks and user_notes."""
        with self._connect() as conn:
            mix_row = conn.execute(
                "SELECT * FROM topic_mixes WHERE owner_id = ? AND mix_id = ?",
                (owner_id, mix_id),
            ).fetchone()
            if not mix_row:
                return None
            mix_row = self._current_mix_for_row(conn, mix_row)
            mix_id = mix_row["mix_id"]

            course_id = mix_row["course_id"]
            topic_index = mix_row["topic_index"]
            course_row = conn.execute(
                "SELECT tools_config_json, title FROM workspace_courses WHERE owner_id = ? AND course_id = ?",
                (owner_id, course_id),
            ).fetchone()
            snap_row = conn.execute(
                "SELECT * FROM topic_snapshots WHERE owner_id = ? AND course_id = ? AND topic_index = ?",
                (owner_id, course_id, topic_index),
            ).fetchone()
            if not snap_row:
                return None

        old_mix = TopicMix.model_validate_json(mix_row["mix_json"])
        tools = (
            CourseToolsConfig.model_validate_json(course_row["tools_config_json"])
            if course_row
            else CourseToolsConfig()
        )
        snap = RawTopicSnapshot(
            source_id=snap_row["source_id"],
            course_id=snap_row["course_id"],
            authority=snap_row["authority"],
            title=snap_row["title"],
            content_text=snap_row["content_text"],
            source_type=snap_row["source_type"],
            source_hash=snap_row["source_hash"],
            safety_status=snap_row["safety_status"],
            visibility=snap_row["visibility"],
        )

        chunks = self._load_topic_chunks(owner_id=owner_id, course_id=course_id, topic_index=topic_index)
        if not chunks:
            chunks = [
                {
                    "chunk_id": c["chunk_id"],
                    "module_id": 0,
                    "modname": snap.source_type,
                    "heading": c["heading"],
                    "content_text": c["content_text"],
                    "module_hash": c["content_hash"],
                    "safety_status": snap.safety_status,
                }
                for c in split_text_into_semantic_chunks(snap.title, snap.content_text)
            ]

        old_sections_by_chunk = {
            sec.chunk_id: sec for sec in old_mix.book_sections if sec.chunk_id
        }
        new_mix, _, _ = await self._build_topic_mix_cached(
            snapshot=snap,
            tools=tools,
            topic_index=topic_index,
            chunks=chunks,
            existing_notes=mix_row["user_notes"],
            version=int(mix_row["version"]) + 1,
            stable_mix_id=old_mix.mix_id,
            old_sections_by_chunk=old_sections_by_chunk,
            course_title=course_row["title"] if course_row else "",
        )
        self._save_topic_mix(new_mix, owner_id=owner_id)
        if tools.exam_mix:
            self._set_exam_mix_stale(owner_id, course_id, True)
        return new_mix

    def record_quiz_attempt(
        self, mix_id: str, attempt: QuizAttemptRequest, owner_id: str
    ) -> Optional[Dict[str, Any]]:
        """Persist per-user practice quiz accuracy so ExamMix highlights genuine weak spots."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT course_id, title FROM topic_mixes WHERE owner_id = ? AND mix_id = ?",
                (owner_id, mix_id),
            ).fetchone()
            if not row:
                return None

            course_id = int(row["course_id"])
            topic_ref = (attempt.topic_ref or row["title"] or "Topic").strip()
            is_correct = attempt.chosen_index == attempt.correct_index
            wrong_delta = 0 if is_correct else 1
            correct_delta = 1 if is_correct else 0
            now = _utc_iso()

            conn.execute(
                """
                INSERT INTO quiz_telemetry (
                    owner_id, course_id, mix_id, question, topic_ref, wrong_count, correct_count, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(owner_id, mix_id, question) DO UPDATE SET
                    wrong_count = quiz_telemetry.wrong_count + ?,
                    correct_count = quiz_telemetry.correct_count + ?,
                    updated_at = ?
                """,
                (
                    owner_id,
                    course_id,
                    mix_id,
                    attempt.question,
                    topic_ref,
                    wrong_delta,
                    correct_delta,
                    now,
                    wrong_delta,
                    correct_delta,
                    now,
                ),
            )
            if not is_correct:
                has_exam = (
                    conn.execute(
                        "SELECT 1 FROM exam_mixes WHERE owner_id = ? AND course_id = ?",
                        (owner_id, course_id),
                    ).fetchone()
                    is not None
                )
                if has_exam:
                    conn.execute(
                        "UPDATE workspace_courses SET exam_mix_stale = 1, updated_at = ? "
                        "WHERE owner_id = ? AND course_id = ?",
                        (now, owner_id, course_id),
                    )

        return {
            "mix_id": mix_id,
            "course_id": course_id,
            "is_correct": is_correct,
            "weak_spots": self._get_course_weak_spots(owner_id=owner_id, course_id=course_id),
        }

    def _get_course_weak_spots(self, owner_id: str, course_id: int, limit: int = 4) -> List[str]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT topic_ref, SUM(wrong_count) AS misses FROM quiz_telemetry "
                "WHERE owner_id = ? AND course_id = ? AND wrong_count > 0 "
                "GROUP BY topic_ref ORDER BY misses DESC, MAX(updated_at) DESC LIMIT ?",
                (owner_id, course_id, limit),
            ).fetchall()
        return [f"Weak Spot: {r['topic_ref']} ({int(r['misses'])} missed)" for r in rows]

    def delete_course(self, course_id: int, owner_id: str) -> bool:
        get_build_queue().cancel_job(owner_id, course_id, "exam_mix")
        storage = get_temp_storage()
        storage.delete_prefix(owner_id, course_id=course_id)
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM temp_staging WHERE owner_id = ? AND course_id = ?",
                (owner_id, course_id),
            )
            conn.execute(
                "DELETE FROM file_manifest WHERE owner_id = ? AND course_id = ?",
                (owner_id, course_id),
            )
            cur = conn.execute(
                "DELETE FROM workspace_courses WHERE owner_id = ? AND course_id = ?",
                (owner_id, course_id),
            )
            conn.execute(
                "DELETE FROM topic_snapshots WHERE owner_id = ? AND course_id = ?",
                (owner_id, course_id),
            )
            conn.execute(
                "DELETE FROM module_chunks WHERE owner_id = ? AND course_id = ?",
                (owner_id, course_id),
            )
            conn.execute(
                "DELETE FROM quiz_telemetry WHERE owner_id = ? AND course_id = ?",
                (owner_id, course_id),
            )
            conn.execute(
                "DELETE FROM topic_mixes WHERE owner_id = ? AND course_id = ?",
                (owner_id, course_id),
            )
            conn.execute(
                "DELETE FROM exam_mixes WHERE owner_id = ? AND course_id = ?",
                (owner_id, course_id),
            )
            return cur.rowcount > 0

    def _next_custom_course_id(self, owner_id: str) -> int:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT MAX(course_id) AS max_id FROM workspace_courses WHERE owner_id = ?",
                (owner_id,),
            ).fetchone()
        max_id = row["max_id"] if row and row["max_id"] else 90000
        return max(90001, int(max_id) + 1)

    def _set_exam_mix_stale(self, owner_id: str, course_id: int, stale: bool) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE workspace_courses SET exam_mix_stale = ?, updated_at = ? "
                "WHERE owner_id = ? AND course_id = ?",
                (1 if stale else 0, _utc_iso(), owner_id, course_id),
            )

    def _upsert_course(
        self,
        owner_id: str,
        course_id: int,
        authority: str,
        title: str,
        shortname: str,
        moodle_url: str,
        source_type: str,
        tools: CourseToolsConfig,
        sections: List[Dict[str, Any]],
        blocked_quizzes: List[BlockedQuizNotice],
        exam_mix_stale: bool = False,
        gemini_api_key: Optional[str] = None,
        last_moodle_check_at: Optional[str] = None,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO workspace_courses (
                    owner_id, course_id, authority, title, shortname, moodle_url, source_type,
                    visibility, tools_config_json, sections_json, blocked_quizzes_json,
                    exam_mix_stale, gemini_api_key, last_moodle_check_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'private', ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(owner_id, course_id) DO UPDATE SET
                    authority = excluded.authority,
                    title = excluded.title,
                    shortname = excluded.shortname,
                    moodle_url = excluded.moodle_url,
                    source_type = excluded.source_type,
                    tools_config_json = excluded.tools_config_json,
                    sections_json = excluded.sections_json,
                    blocked_quizzes_json = excluded.blocked_quizzes_json,
                    exam_mix_stale = excluded.exam_mix_stale,
                    gemini_api_key = COALESCE(excluded.gemini_api_key, workspace_courses.gemini_api_key),
                    last_moodle_check_at = COALESCE(excluded.last_moodle_check_at, workspace_courses.last_moodle_check_at),
                    updated_at = excluded.updated_at
                """,
                (
                    owner_id,
                    course_id,
                    authority,
                    title,
                    shortname,
                    moodle_url,
                    source_type,
                    tools.model_dump_json(),
                    json.dumps(sections),
                    json.dumps([b.model_dump() for b in blocked_quizzes]),
                    1 if exam_mix_stale else 0,
                    gemini_api_key,
                    last_moodle_check_at,
                    _utc_iso(),
                ),
            )

    def _save_snapshot(self, snap: RawTopicSnapshot, topic_index: int, owner_id: str) -> None:
        snap_key = f"{owner_id}:{snap.course_id}:{topic_index}"
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO topic_snapshots (
                    snapshot_key, owner_id, course_id, topic_index, source_id, authority, title,
                    content_text, source_type, source_hash, safety_status, visibility, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(snapshot_key) DO UPDATE SET
                    source_id = excluded.source_id,
                    title = excluded.title,
                    content_text = excluded.content_text,
                    source_type = excluded.source_type,
                    source_hash = excluded.source_hash,
                    safety_status = excluded.safety_status,
                    updated_at = excluded.updated_at
                """,
                (
                    snap_key,
                    owner_id,
                    snap.course_id,
                    topic_index,
                    snap.source_id,
                    snap.authority,
                    snap.title,
                    snap.content_text,
                    snap.source_type,
                    snap.source_hash or compute_content_hash(snap.content_text),
                    snap.safety_status,
                    snap.visibility,
                    _utc_iso(),
                ),
            )

    def _save_topic_mix(self, mix: TopicMix, owner_id: str) -> None:
        with self._connect() as conn:
            # Serialize the identity lookup with the write. Two simultaneous
            # imports must not both insert a fresh ID for the same source topic.
            conn.execute("BEGIN IMMEDIATE")
            current = self._current_mix_rows(conn.execute(
                "SELECT * FROM topic_mixes WHERE owner_id = ? AND course_id = ? AND topic_index = ?",
                (owner_id, mix.course_id, mix.topic_index),
            ).fetchall())
            if current:
                previous = current[0]
                new_generation = mix.mix_id != previous["mix_id"] or mix.source_hash != previous["source_hash"]
                mix.mix_id = previous["mix_id"]
                mix.version = max(mix.version, previous["version"] + int(new_generation))
                if previous["user_notes"] is not None:
                    mix.user_notes = previous["user_notes"]
                mix.created_at = TopicMix.model_validate_json(previous["mix_json"]).created_at
            mix.updated_at = datetime.now(timezone.utc)
            conn.execute(
                """
                INSERT INTO topic_mixes (
                    mix_id, owner_id, course_id, topic_index, title, source_hash, version,
                    visibility, has_upstream_update, user_notes, mix_json, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(owner_id, mix_id) DO UPDATE SET
                    topic_index = excluded.topic_index,
                    title = excluded.title,
                    source_hash = excluded.source_hash,
                    version = excluded.version,
                    has_upstream_update = excluded.has_upstream_update,
                    user_notes = excluded.user_notes,
                    mix_json = excluded.mix_json,
                    updated_at = excluded.updated_at
                """,
                (
                    mix.mix_id,
                    owner_id,
                    mix.course_id,
                    mix.topic_index,
                    mix.title,
                    mix.source_hash,
                    mix.version,
                    mix.visibility,
                    1 if mix.has_upstream_update else 0,
                    mix.user_notes,
                    mix.model_dump_json(),
                    _utc_iso(),
                ),
            )

    def _mark_mix_update_available(
        self,
        mix_id: str,
        owner_id: str,
        dirty_chunk_ids: Optional[List[str]] = None,
    ) -> None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT mix_json FROM topic_mixes WHERE owner_id = ? AND mix_id = ?",
                (owner_id, mix_id),
            ).fetchone()
            if row and dirty_chunk_ids is not None:
                mix = TopicMix.model_validate_json(row["mix_json"])
                mix.has_upstream_update = True
                mix.dirty_chunk_ids = list(dict.fromkeys(dirty_chunk_ids))
                conn.execute(
                    "UPDATE topic_mixes SET has_upstream_update = 1, mix_json = ?, updated_at = ? "
                    "WHERE owner_id = ? AND mix_id = ?",
                    (mix.model_dump_json(), _utc_iso(), owner_id, mix_id),
                )
            else:
                conn.execute(
                    "UPDATE topic_mixes SET has_upstream_update = 1, updated_at = ? "
                    "WHERE owner_id = ? AND mix_id = ?",
                    (_utc_iso(), owner_id, mix_id),
                )

    def _delete_mix(self, mix_id: str, owner_id: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM topic_mixes WHERE owner_id = ? AND mix_id = ?",
                (owner_id, mix_id),
            )

    def _save_exam_mix(self, exam_mix: ExamMix, owner_id: str) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO exam_mixes (owner_id, course_id, exam_mix_id, visibility, exam_mix_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(owner_id, course_id) DO UPDATE SET
                    exam_mix_id = excluded.exam_mix_id,
                    exam_mix_json = excluded.exam_mix_json,
                    updated_at = excluded.updated_at
                """,
                (
                    owner_id,
                    exam_mix.course_id,
                    exam_mix.exam_mix_id,
                    exam_mix.visibility,
                    exam_mix.model_dump_json(),
                    _utc_iso(),
                ),
            )

    # ------------------------------------------------------------------
    # Platform Users (Google OAuth + Moodle Cookie Pairing Metadata)
    # ------------------------------------------------------------------

    def upsert_google_user(
        self,
        owner_id: str,
        google_sub: str,
        email: str,
        fullname: str,
        picture_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = _utc_iso()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO platform_users (
                    owner_id, google_sub, email, fullname, picture_url, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(owner_id) DO UPDATE SET
                    google_sub = excluded.google_sub,
                    email = excluded.email,
                    fullname = excluded.fullname,
                    picture_url = COALESCE(excluded.picture_url, platform_users.picture_url),
                    updated_at = excluded.updated_at
                """,
                (owner_id, google_sub, email, fullname, picture_url, now, now),
            )
        return self.get_platform_user(owner_id) or {}

    def link_moodle_account(
        self,
        owner_id: str,
        moodle_url: str,
        moodle_user_id: int,
        moodle_username: str,
    ) -> Optional[Dict[str, Any]]:
        """Bind verified Moodle site/user identity to a Google user without storing cookies or passwords."""
        now = _utc_iso()
        with self._connect() as conn:
            cur = conn.execute(
                """
                UPDATE platform_users
                SET linked_moodle_url = ?,
                    linked_moodle_user_id = ?,
                    linked_moodle_username = ?,
                    last_paired_at = ?,
                    updated_at = ?
                WHERE owner_id = ?
                """,
                (moodle_url, int(moodle_user_id), moodle_username, now, now, owner_id),
            )
        if cur.rowcount == 0:
            return None
        return self.get_platform_user(owner_id)

    def get_platform_user(self, owner_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM platform_users WHERE owner_id = ?",
                (owner_id,),
            ).fetchone()
        return dict(row) if row else None

    # ------------------------------------------------------------------
    # Per-Person Temporary File Storage (ОБД: Validation & Processing Only)
    # ------------------------------------------------------------------

    def stage_material(
        self,
        owner_id: str,
        course_id: int,
        module_id: int,
        filename: str,
        raw_bytes: bytes,
        content_type: str = "application/octet-stream",
        safety_status: str = "safe_material",
        ttl_seconds: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Store raw uploaded/fetched bytes in a strictly per-person isolated directory/S3 prefix
        strictly for the duration of validation and processing. Never stores restricted_exam items.
        """
        if safety_status == "restricted_exam":
            raise ValueError("Exam Shield: restricted_exam materials cannot be staged.")
        if not is_allowed_staging_filename(filename):
            raise ValueError(f"Unsupported file extension for staging: {filename}")

        settings = get_settings()
        if len(raw_bytes) > settings.TEMP_STORAGE_MAX_FILE_BYTES:
            raise ValueError("File exceeds maximum allowed staging size.")

        ttl = int(ttl_seconds if ttl_seconds is not None else settings.TEMP_STORAGE_TTL_SECONDS)
        now_dt = datetime.now(timezone.utc)
        expires_dt = now_dt + timedelta(seconds=max(1, ttl))
        staging_id = f"stg-{uuid.uuid4().hex[:16]}"
        sha256_hash = hashlib.sha256(raw_bytes).hexdigest()
        storage_key = build_isolated_storage_key(owner_id, course_id, module_id, sha256_hash, filename)

        now_iso = now_dt.isoformat()
        expires_iso = expires_dt.isoformat()
        clean_type = content_type or "application/octet-stream"
        size_bytes = len(raw_bytes)

        backend = get_temp_storage()
        backend.put_bytes(storage_key, raw_bytes, content_type=clean_type)

        try:
            with self._connect() as conn:
                conn.execute(
                    """
                    INSERT INTO temp_staging (
                        staging_id, owner_id, course_id, module_id, filename, content_type,
                        size_bytes, sha256_hash, storage_backend, storage_key,
                        safety_status, status, created_at, expires_at, purged_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_validation', ?, ?, NULL)
                    """,
                    (
                        staging_id,
                        owner_id,
                        int(course_id),
                        int(module_id),
                        filename,
                        clean_type,
                        size_bytes,
                        sha256_hash,
                        backend.backend_name,
                        storage_key,
                        safety_status,
                        now_iso,
                        expires_iso,
                    ),
                )
        except Exception:
            try:
                backend.delete_bytes(storage_key)
            except Exception:
                pass
            raise

        return {
            "staging_id": staging_id,
            "owner_id": owner_id,
            "course_id": int(course_id),
            "module_id": int(module_id),
            "filename": filename,
            "content_type": clean_type,
            "size_bytes": size_bytes,
            "sha256_hash": sha256_hash,
            "storage_backend": backend.backend_name,
            "storage_key": storage_key,
            "safety_status": safety_status,
            "status": "pending_validation",
            "created_at": now_iso,
            "expires_at": expires_iso,
            "purged_at": None,
        }

    def get_staged_material(self, owner_id: str, staging_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM temp_staging WHERE staging_id = ? AND owner_id = ?",
                (staging_id, owner_id),
            ).fetchone()
        if not row:
            return None
        data = dict(row)
        if not get_temp_storage().verify_key_ownership(owner_id, data["storage_key"]):
            return None
        return data

    def read_staged_bytes(self, owner_id: str, staging_id: str) -> Optional[bytes]:
        record = self.get_staged_material(owner_id, staging_id)
        if not record or record.get("purged_at"):
            return None
        if record.get("expires_at") and record["expires_at"] <= _utc_iso():
            return None
        return get_temp_storage().get_bytes(record["storage_key"])

    def mark_staged_validated(self, owner_id: str, staging_id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute(
                """
                UPDATE temp_staging
                SET status = 'validated'
                WHERE staging_id = ? AND owner_id = ? AND purged_at IS NULL
                """,
                (staging_id, owner_id),
            )
        return cur.rowcount > 0

    def mark_staged_processed(self, owner_id: str, staging_id: str) -> bool:
        return self.mark_staged_processed_batch(owner_id, [staging_id]) > 0

    def mark_staged_processed_batch(self, owner_id: str, staging_ids: List[str]) -> int:
        clean_ids = [sid for sid in dict.fromkeys(staging_ids) if sid]
        if not clean_ids:
            return 0
        placeholders = ",".join("?" for _ in clean_ids)
        with self._connect() as conn:
            cur = conn.execute(
                f"UPDATE temp_staging SET status = 'processed' WHERE owner_id = ? AND staging_id IN ({placeholders}) AND purged_at IS NULL",
                [owner_id, *clean_ids],
            )
        return cur.rowcount

    def purge_staged_material(
        self,
        owner_id: str,
        staging_id: str,
        status: str = "purged",
    ) -> bool:
        return self.purge_staged_materials_batch(owner_id, [staging_id], status=status) > 0

    def purge_staged_materials_batch(
        self,
        owner_id: str,
        staging_ids: List[str],
        status: str = "purged",
    ) -> int:
        """Delete staged files for one owner in a single batched DB transaction."""
        clean_ids = [sid for sid in dict.fromkeys(staging_ids) if sid]
        if not clean_ids:
            return 0

        placeholders = ",".join("?" for _ in clean_ids)
        storage = get_temp_storage()
        now = _utc_iso()
        deleted_ids: List[Tuple[str, str, str, str]] = []
        with self._connect() as conn:
            rows = conn.execute(
                f"SELECT staging_id, storage_key FROM temp_staging WHERE owner_id = ? AND staging_id IN ({placeholders})",
                [owner_id, *clean_ids],
            ).fetchall()
            for r in rows:
                if not storage.verify_key_ownership(owner_id, r["storage_key"]):
                    continue
                storage.delete_bytes(r["storage_key"])
                deleted_ids.append((status, now, r["staging_id"], owner_id))
            if deleted_ids:
                conn.executemany(
                    "UPDATE temp_staging SET status = ?, purged_at = ? WHERE staging_id = ? AND owner_id = ?",
                    deleted_ids,
                )
        return len(deleted_ids)

    def list_staged_materials(
        self,
        owner_id: str,
        course_id: Optional[int] = None,
        include_purged: bool = False,
    ) -> List[Dict[str, Any]]:
        query = "SELECT * FROM temp_staging WHERE owner_id = ?"
        params: List[Any] = [owner_id]
        if course_id is not None:
            query += " AND course_id = ?"
            params.append(int(course_id))
        if not include_purged:
            query += " AND purged_at IS NULL"
        query += " ORDER BY created_at DESC"
        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]

    def cleanup_expired_staging(self, owner_id: Optional[str] = None) -> int:
        """Sweep any temporary files whose TTL has expired and delete them from disk/S3."""
        now_iso = _utc_iso()
        query = "SELECT staging_id, owner_id, storage_key FROM temp_staging WHERE purged_at IS NULL AND expires_at <= ?"
        params: List[Any] = [now_iso]
        if owner_id is not None:
            query += " AND owner_id = ?"
            params.append(owner_id)

        storage = get_temp_storage()
        to_mark: List[Tuple[str, str, str]] = []
        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
            for r in rows:
                try:
                    storage.delete_bytes(r["storage_key"])
                except Exception:
                    continue
                to_mark.append((now_iso, r["staging_id"], r["owner_id"]))
            if to_mark:
                conn.executemany(
                    "UPDATE temp_staging SET status = 'expired_purged', purged_at = ? WHERE staging_id = ? AND owner_id = ?",
                    to_mark,
                )
        return len(to_mark)

    # ------------------------------------------------------------------
    # Per-Person File Manifest (Metadata-Only Diff Before Re-Downloading)
    # ------------------------------------------------------------------

    def get_course_file_manifest(self, owner_id: str, course_id: int) -> Dict[int, Dict[str, Any]]:
        """Return existing {module_id: manifest_row} for (owner_id, course_id)."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM file_manifest WHERE owner_id = ? AND course_id = ?",
                (owner_id, int(course_id)),
            ).fetchall()
        return {int(r["module_id"]): dict(r) for r in rows}

    def upsert_file_manifest_batch(
        self,
        owner_id: str,
        course_id: int,
        records: List[Dict[str, Any]],
    ) -> None:
        if not records:
            return
        now = _utc_iso()
        rows = [
            (
                owner_id,
                int(course_id),
                int(rec["module_id"]),
                str(rec.get("remote_url") or ""),
                int(rec.get("moodle_timemodified") or 0),
                str(rec.get("sha256_hash") or ""),
                now,
            )
            for rec in records
        ]
        with self._connect() as conn:
            conn.executemany(
                """
                INSERT INTO file_manifest (
                    owner_id, course_id, module_id, remote_url, moodle_timemodified, sha256_hash, last_seen_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(owner_id, course_id, module_id) DO UPDATE SET
                    remote_url = excluded.remote_url,
                    moodle_timemodified = excluded.moodle_timemodified,
                    sha256_hash = excluded.sha256_hash,
                    last_seen_at = excluded.last_seen_at
                """,
                rows,
            )

    def get_course_module_chunks_map(self, owner_id: str, course_id: int) -> Dict[int, Dict[str, Any]]:
        """Map {module_id: chunk_row} so unchanged Moodle downloads can reuse prior extracted text."""
        rows = self._load_topic_chunks(owner_id=owner_id, course_id=course_id)
        return {int(r["module_id"]): r for r in rows if int(r.get("module_id") or 0) > 0}


_store_instance: Optional[WorkspaceStore] = None


def get_workspace_store() -> WorkspaceStore:
    """Return singleton WorkspaceStore wired to current Settings.WORKSPACE_DB_PATH."""
    global _store_instance
    settings = get_settings()
    if _store_instance is None or _store_instance.db_path != settings.WORKSPACE_DB_PATH:
        _store_instance = WorkspaceStore(db_path=settings.WORKSPACE_DB_PATH)
    return _store_instance
