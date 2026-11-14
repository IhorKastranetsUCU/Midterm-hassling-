import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.config import get_settings
from app.core.authorities import resolve_authority_slug
from app.models.mix import (
    BlockedQuizNotice,
    CourseToolsConfig,
    ExamMix,
    ExtensionSectionPayload,
    ExtensionSyncPayload,
    QuizSafetyMetadata,
    RawTopicSnapshot,
    TopicMix,
    WorkspaceCourseSummary,
    compute_content_hash,
)
from app.services.mix_generator import get_mix_generator


def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS workspace_courses (
                    course_id INTEGER PRIMARY KEY,
                    authority TEXT NOT NULL,
                    title TEXT NOT NULL,
                    shortname TEXT NOT NULL,
                    moodle_url TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    visibility TEXT NOT NULL DEFAULT 'private',
                    tools_config_json TEXT NOT NULL,
                    sections_json TEXT NOT NULL DEFAULT '[]',
                    blocked_quizzes_json TEXT NOT NULL DEFAULT '[]',
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS topic_snapshots (
                    snapshot_key TEXT PRIMARY KEY,
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

                CREATE TABLE IF NOT EXISTS topic_mixes (
                    mix_id TEXT PRIMARY KEY,
                    course_id INTEGER NOT NULL,
                    topic_index INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    source_hash TEXT NOT NULL,
                    version INTEGER NOT NULL DEFAULT 1,
                    visibility TEXT NOT NULL DEFAULT 'private',
                    has_upstream_update INTEGER NOT NULL DEFAULT 0,
                    user_notes TEXT,
                    mix_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS exam_mixes (
                    course_id INTEGER PRIMARY KEY,
                    exam_mix_id TEXT NOT NULL,
                    visibility TEXT NOT NULL DEFAULT 'private',
                    exam_mix_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """
            )

    def _filter_and_serialize_section(
        self, sec: ExtensionSectionPayload
    ) -> Tuple[str, Dict[str, Any], List[BlockedQuizNotice]]:
        """
        Separate safe study content from restricted exams using fail-closed QuizSafetyMetadata.
        """
        safe_lines: List[str] = []
        if sec.summary:
            safe_lines.append(sec.summary.strip())

        blocked: List[BlockedQuizNotice] = []
        sanitized_modules: List[Dict[str, Any]] = []

        for mod in sec.modules:
            is_quiz = mod.modname.lower() == "quiz" or mod.quiz_meta is not None
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

                # Open untimed self-test: include label and excerpt only
                safe_lines.append(f"[Self-Test] {mod.name}")
                if mod.text_excerpt:
                    safe_lines.append(mod.text_excerpt.strip())
                sanitized_modules.append(
                    {
                        "id": mod.module_id,
                        "name": mod.name,
                        "modname": mod.modname,
                        "url": mod.url,
                        "safety_status": "self_test",
                        "description": mod.text_excerpt or "",
                    }
                )
            else:
                safe_lines.append(f"[{mod.modname.upper()}] {mod.name}")
                if mod.text_excerpt:
                    safe_lines.append(mod.text_excerpt.strip())
                sanitized_modules.append(
                    {
                        "id": mod.module_id,
                        "name": mod.name,
                        "modname": mod.modname,
                        "url": mod.url,
                        "safety_status": "safe_material",
                        "description": mod.text_excerpt or "",
                    }
                )

        if not safe_lines:
            safe_lines.append(sec.title)

        section_dict = {
            "id": sec.section_index,
            "name": sec.title,
            "summary": sec.summary or "",
            "modules": sanitized_modules,
        }
        return "\n".join(safe_lines), section_dict, blocked

    async def sync_extension_payload(self, payload: ExtensionSyncPayload) -> Dict[str, Any]:
        """Ingest sanitized course structure & diffs from the Chrome Extension."""
        authority = (
            payload.authority.lower().strip()
            if payload.authority and payload.authority != "auto"
            else resolve_authority_slug(payload.moodle_url, fallback="custom")
        )
        if authority not in ("ucu", "kpi", "lnu", "lpnu", "nure", "vntu", "demo", "custom"):
            authority = resolve_authority_slug(payload.moodle_url, fallback="custom")

        existing = self.get_course_bundle(payload.course_id)
        tools = payload.tools_config or (
            CourseToolsConfig.model_validate(existing["tools_config"])
            if existing
            else CourseToolsConfig()
        )

        generator = get_mix_generator()
        all_blocked: List[BlockedQuizNotice] = []
        sanitized_sections: List[Dict[str, Any]] = []
        new_topics = 0
        updated_topics = 0
        unchanged_topics = 0

        existing_mixes_by_idx: Dict[int, TopicMix] = {
            m.topic_index: m for m in (existing["topic_mixes"] if existing else [])
        }

        for idx, sec in enumerate(payload.sections):
            content_text, sec_dict, blocked = self._filter_and_serialize_section(sec)
            sanitized_sections.append(sec_dict)
            all_blocked.extend(blocked)

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
            self._save_snapshot(snapshot, topic_index=sec.section_index)

            prev_mix = existing_mixes_by_idx.get(sec.section_index)
            if prev_mix and prev_mix.source_hash == snapshot.source_hash:
                unchanged_topics += 1
            elif prev_mix:
                self._mark_mix_update_available(prev_mix.mix_id)
                updated_topics += 1
            else:
                new_mix = await generator.generate_topic_mix(
                    snapshot=snapshot,
                    tools=tools,
                    topic_index=sec.section_index,
                )
                self._save_topic_mix(new_mix)
                new_topics += 1

        shortname = payload.course_shortname or f"CRS-{payload.course_id}"
        self._upsert_course(
            course_id=payload.course_id,
            authority=authority,
            title=payload.course_name,
            shortname=shortname,
            moodle_url=payload.moodle_url,
            source_type="moodle_extension",
            tools=tools,
            sections=sanitized_sections,
            blocked_quizzes=all_blocked,
        )

        if tools.exam_mix and (new_topics > 0 or not existing or not existing["exam_mix"]):
            await self.build_exam_mix(payload.course_id)

        return {
            "course_id": payload.course_id,
            "authority": authority,
            "course_name": payload.course_name,
            "new_topics": new_topics,
            "updated_topics": updated_topics,
            "unchanged_topics": unchanged_topics,
            "blocked_exams": len(all_blocked),
        }

    async def create_or_ingest_upload(
        self,
        title: str,
        authority: str,
        content_text: str,
        filename: str,
        tools: CourseToolsConfig,
        course_id: Optional[int] = None,
        shortname: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a standalone workspace course or append an uploaded document topic."""
        now_id = course_id or self._next_custom_course_id()
        existing = self.get_course_bundle(now_id)
        topic_index = len(existing["snapshots"]) + 1 if existing else 1
        course_title = existing["course"].title if existing else title
        course_short = existing["course"].shortname if existing else (shortname or "CUSTOM")
        clean_auth = authority or (existing["course"].authority if existing else "custom")

        snapshot = RawTopicSnapshot(
            source_id=f"upload-{now_id}-{filename}",
            course_id=now_id,
            authority=clean_auth,
            title=title if existing else f"Topic {topic_index}: {filename}",
            content_text=content_text,
            source_type="manual_upload",
            safety_status="safe_material",
            visibility="private",
        )
        self._save_snapshot(snapshot, topic_index=topic_index)

        sections = list(existing["sections"]) if existing else []
        sections.append(
            {
                "id": topic_index,
                "name": snapshot.title,
                "summary": f"Uploaded file: {filename}",
                "modules": [
                    {
                        "id": topic_index * 100,
                        "name": filename,
                        "modname": "resource",
                        "safety_status": "safe_material",
                        "description": content_text[:280],
                    }
                ],
            }
        )

        self._upsert_course(
            course_id=now_id,
            authority=clean_auth,
            title=course_title,
            shortname=course_short,
            moodle_url="",
            source_type="manual_upload",
            tools=tools,
            sections=sections,
            blocked_quizzes=existing["blocked_quizzes"] if existing else [],
        )

        generator = get_mix_generator()
        topic_mix = await generator.generate_topic_mix(
            snapshot=snapshot,
            tools=tools,
            topic_index=topic_index,
        )
        self._save_topic_mix(topic_mix)

        exam_mix = None
        if tools.exam_mix:
            bundle = self.get_course_bundle(now_id)
            if bundle and bundle["topic_mixes"]:
                exam_mix = await generator.generate_exam_mix(
                    course_id=now_id,
                    authority=clean_auth,
                    course_title=course_title,
                    topic_mixes=bundle["topic_mixes"],
                )
                self._save_exam_mix(exam_mix)

        return {
            "course_id": now_id,
            "authority": clean_auth,
            "topic_mix_id": topic_mix.mix_id,
            "has_exam_mix": exam_mix is not None,
        }

    def list_courses(self) -> List[WorkspaceCourseSummary]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM workspace_courses ORDER BY updated_at DESC"
            ).fetchall()

            results: List[WorkspaceCourseSummary] = []
            for row in rows:
                cid = row["course_id"]
                mix_stats = conn.execute(
                    "SELECT COUNT(*) AS cnt, COALESCE(SUM(has_upstream_update), 0) AS upd "
                    "FROM topic_mixes WHERE course_id = ?",
                    (cid,),
                ).fetchone()
                has_exam = (
                    conn.execute(
                        "SELECT 1 FROM exam_mixes WHERE course_id = ?", (cid,)
                    ).fetchone()
                    is not None
                )
                blocked_list = json.loads(row["blocked_quizzes_json"] or "[]")
                results.append(
                    WorkspaceCourseSummary(
                        course_id=cid,
                        authority=row["authority"],
                        title=row["title"],
                        shortname=row["shortname"],
                        moodle_url=row["moodle_url"],
                        source_type=row["source_type"],
                        visibility=row["visibility"],
                        tools_config=CourseToolsConfig.model_validate_json(row["tools_config_json"]),
                        topic_count=mix_stats["cnt"] if mix_stats else 0,
                        has_exam_mix=has_exam,
                        updates_pending=int(mix_stats["upd"]) if mix_stats else 0,
                        blocked_quizzes_count=len(blocked_list),
                        updated_at=datetime.fromisoformat(row["updated_at"]),
                    )
                )
            return results

    def get_course_bundle(self, course_id: int) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            course_row = conn.execute(
                "SELECT * FROM workspace_courses WHERE course_id = ?", (course_id,)
            ).fetchone()
            if not course_row:
                return None

            snap_rows = conn.execute(
                "SELECT * FROM topic_snapshots WHERE course_id = ? ORDER BY topic_index ASC",
                (course_id,),
            ).fetchall()
            mix_rows = conn.execute(
                "SELECT * FROM topic_mixes WHERE course_id = ? ORDER BY topic_index ASC",
                (course_id,),
            ).fetchall()
            exam_row = conn.execute(
                "SELECT * FROM exam_mixes WHERE course_id = ?", (course_id,)
            ).fetchone()

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
        mixes: List[TopicMix] = []
        for r in mix_rows:
            mix = TopicMix.model_validate_json(r["mix_json"])
            mix.has_upstream_update = bool(r["has_upstream_update"])
            mix.user_notes = r["user_notes"]
            mixes.append(mix)

        exam_mix = ExamMix.model_validate_json(exam_row["exam_mix_json"]) if exam_row else None
        tools_cfg = CourseToolsConfig.model_validate_json(course_row["tools_config_json"])

        summary = WorkspaceCourseSummary(
            course_id=course_row["course_id"],
            authority=course_row["authority"],
            title=course_row["title"],
            shortname=course_row["shortname"],
            moodle_url=course_row["moodle_url"],
            source_type=course_row["source_type"],
            visibility=course_row["visibility"],
            tools_config=tools_cfg,
            topic_count=len(mixes),
            has_exam_mix=exam_mix is not None,
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

    def update_tools_config(self, course_id: int, tools: CourseToolsConfig) -> bool:
        with self._connect() as conn:
            cur = conn.execute(
                "UPDATE workspace_courses SET tools_config_json = ?, updated_at = ? WHERE course_id = ?",
                (tools.model_dump_json(), _utc_iso(), course_id),
            )
            return cur.rowcount > 0

    async def regenerate_course_mixes(self, course_id: int) -> Optional[List[TopicMix]]:
        bundle = self.get_course_bundle(course_id)
        if not bundle:
            return None

        tools = CourseToolsConfig.model_validate(bundle["tools_config"])
        generator = get_mix_generator()
        prev_by_idx = {m.topic_index: m for m in bundle["topic_mixes"]}

        with self._connect() as conn:
            snap_rows = conn.execute(
                "SELECT * FROM topic_snapshots WHERE course_id = ? ORDER BY topic_index ASC",
                (course_id,),
            ).fetchall()

        updated: List[TopicMix] = []
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
            old_mix = prev_by_idx.get(t_idx)
            # Delete stale mix key if hash changed so topic_index stays clean
            if old_mix:
                self._delete_mix(old_mix.mix_id)
            new_mix = await generator.generate_topic_mix(
                snapshot=snap,
                tools=tools,
                topic_index=t_idx,
                existing_notes=old_mix.user_notes if old_mix else None,
                version=(old_mix.version + 1) if old_mix else 1,
            )
            self._save_topic_mix(new_mix)
            updated.append(new_mix)

        return updated

    async def build_exam_mix(self, course_id: int) -> Optional[ExamMix]:
        bundle = self.get_course_bundle(course_id)
        if not bundle or not bundle["topic_mixes"]:
            return None
        generator = get_mix_generator()
        course = bundle["course"]
        exam_mix = await generator.generate_exam_mix(
            course_id=course_id,
            authority=course.authority,
            course_title=course.title,
            topic_mixes=bundle["topic_mixes"],
        )
        self._save_exam_mix(exam_mix)
        return exam_mix

    def save_mix_notes(self, mix_id: str, notes: str) -> Optional[TopicMix]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM topic_mixes WHERE mix_id = ?", (mix_id,)
            ).fetchone()
            if not row:
                return None
            mix = TopicMix.model_validate_json(row["mix_json"])
            mix.user_notes = notes
            mix.updated_at = datetime.now(timezone.utc)
            conn.execute(
                "UPDATE topic_mixes SET user_notes = ?, mix_json = ?, updated_at = ? WHERE mix_id = ?",
                (notes, mix.model_dump_json(), _utc_iso(), mix_id),
            )
            return mix

    async def acknowledge_mix_update(self, mix_id: str) -> Optional[TopicMix]:
        """Apply updated upstream snapshot to a TopicMix while preserving user_notes."""
        with self._connect() as conn:
            mix_row = conn.execute(
                "SELECT * FROM topic_mixes WHERE mix_id = ?", (mix_id,)
            ).fetchone()
            if not mix_row:
                return None

            course_id = mix_row["course_id"]
            topic_index = mix_row["topic_index"]
            course_row = conn.execute(
                "SELECT tools_config_json FROM workspace_courses WHERE course_id = ?", (course_id,)
            ).fetchone()
            snap_row = conn.execute(
                "SELECT * FROM topic_snapshots WHERE course_id = ? AND topic_index = ?",
                (course_id, topic_index),
            ).fetchone()
            if not snap_row:
                return None

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

        generator = get_mix_generator()
        new_mix = await generator.generate_topic_mix(
            snapshot=snap,
            tools=tools,
            topic_index=topic_index,
            existing_notes=mix_row["user_notes"],
            version=int(mix_row["version"]) + 1,
        )
        self._delete_mix(mix_id)
        self._save_topic_mix(new_mix)
        return new_mix

    def delete_course(self, course_id: int) -> bool:
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM workspace_courses WHERE course_id = ?", (course_id,))
            conn.execute("DELETE FROM topic_snapshots WHERE course_id = ?", (course_id,))
            conn.execute("DELETE FROM topic_mixes WHERE course_id = ?", (course_id,))
            conn.execute("DELETE FROM exam_mixes WHERE course_id = ?", (course_id,))
            return cur.rowcount > 0

    def _next_custom_course_id(self) -> int:
        with self._connect() as conn:
            row = conn.execute("SELECT MAX(course_id) AS max_id FROM workspace_courses").fetchone()
        max_id = row["max_id"] if row and row["max_id"] else 90000
        return max(90001, int(max_id) + 1)

    def _upsert_course(
        self,
        course_id: int,
        authority: str,
        title: str,
        shortname: str,
        moodle_url: str,
        source_type: str,
        tools: CourseToolsConfig,
        sections: List[Dict[str, Any]],
        blocked_quizzes: List[BlockedQuizNotice],
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO workspace_courses (
                    course_id, authority, title, shortname, moodle_url, source_type,
                    visibility, tools_config_json, sections_json, blocked_quizzes_json, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, 'private', ?, ?, ?, ?)
                ON CONFLICT(course_id) DO UPDATE SET
                    authority = excluded.authority,
                    title = excluded.title,
                    shortname = excluded.shortname,
                    moodle_url = excluded.moodle_url,
                    source_type = excluded.source_type,
                    tools_config_json = excluded.tools_config_json,
                    sections_json = excluded.sections_json,
                    blocked_quizzes_json = excluded.blocked_quizzes_json,
                    updated_at = excluded.updated_at
                """,
                (
                    course_id,
                    authority,
                    title,
                    shortname,
                    moodle_url,
                    source_type,
                    tools.model_dump_json(),
                    json.dumps(sections),
                    json.dumps([b.model_dump() for b in blocked_quizzes]),
                    _utc_iso(),
                ),
            )

    def _save_snapshot(self, snap: RawTopicSnapshot, topic_index: int) -> None:
        snap_key = f"{snap.course_id}:{topic_index}"
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO topic_snapshots (
                    snapshot_key, course_id, topic_index, source_id, authority, title,
                    content_text, source_type, source_hash, safety_status, visibility, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    def _save_topic_mix(self, mix: TopicMix) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO topic_mixes (
                    mix_id, course_id, topic_index, title, source_hash, version,
                    visibility, has_upstream_update, user_notes, mix_json, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(mix_id) DO UPDATE SET
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

    def _mark_mix_update_available(self, mix_id: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE topic_mixes SET has_upstream_update = 1, updated_at = ? WHERE mix_id = ?",
                (_utc_iso(), mix_id),
            )

    def _delete_mix(self, mix_id: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM topic_mixes WHERE mix_id = ?", (mix_id,))

    def _save_exam_mix(self, exam_mix: ExamMix) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO exam_mixes (course_id, exam_mix_id, visibility, exam_mix_json, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(course_id) DO UPDATE SET
                    exam_mix_id = excluded.exam_mix_id,
                    exam_mix_json = excluded.exam_mix_json,
                    updated_at = excluded.updated_at
                """,
                (
                    exam_mix.course_id,
                    exam_mix.exam_mix_id,
                    exam_mix.visibility,
                    exam_mix.model_dump_json(),
                    _utc_iso(),
                ),
            )


_store_instance: Optional[WorkspaceStore] = None


def get_workspace_store() -> WorkspaceStore:
    """Return singleton WorkspaceStore wired to current Settings.WORKSPACE_DB_PATH."""
    global _store_instance
    settings = get_settings()
    if _store_instance is None or _store_instance.db_path != settings.WORKSPACE_DB_PATH:
        _store_instance = WorkspaceStore(db_path=settings.WORKSPACE_DB_PATH)
    return _store_instance
