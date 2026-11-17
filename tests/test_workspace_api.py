import asyncio
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.services import build_queue as bq_module
from app.services import temp_storage as ts_module
from app.services import workspace_store as ws_module
from app.services.build_queue import DebouncedBuildQueue
from app.services.workspace_store import WorkspaceStore


@pytest.fixture()
def isolated_store(tmp_path, monkeypatch):
    db_file = tmp_path / "test_workspace.db"
    staging_dir = tmp_path / "staging"
    monkeypatch.setattr(get_settings(), "TEMP_STORAGE_DIR", str(staging_dir))
    monkeypatch.setattr(get_settings(), "AUTH_DEV_GOOGLE_ENABLED", True)
    monkeypatch.setattr(ts_module, "_temp_storage_instance", None)
    store = WorkspaceStore(db_path=str(db_file))
    fresh_queue = DebouncedBuildQueue()
    monkeypatch.setattr(ws_module, "_store_instance", store)
    monkeypatch.setattr("app.routers.workspace.get_workspace_store", lambda: store)
    monkeypatch.setattr("app.routers.auth.get_workspace_store", lambda: store)
    monkeypatch.setattr(bq_module, "_build_queue", fresh_queue)
    yield store
    fresh_queue.cancel_all()
    monkeypatch.setattr(ts_module, "_temp_storage_instance", None)


def test_extension_sync_exam_shield_and_note_preserving_diff(isolated_store):
    client = TestClient(app)

    initial_payload = {
        "authority": "ucu",
        "moodle_url": "https://learn.ucu.edu.ua",
        "course_id": 1048,
        "course_name": "Discrete Mathematics",
        "course_shortname": "DM-1048",
        "sections": [
            {
                "section_index": 0,
                "title": "Topic 1: Graph Theory",
                "summary": "Vertices, edges, handshaking lemma",
                "modules": [
                    {
                        "module_id": 101,
                        "name": "Lecture 1 Slides",
                        "modname": "resource",
                        "url": "https://learn.ucu.edu.ua/mod/resource/view.php?id=101",
                        "text_excerpt": "Sum of vertex degrees equals twice the edge count",
                    },
                    {
                        "module_id": 102,
                        "name": "Self-Test Graph Basics",
                        "modname": "quiz",
                        "quiz_meta": {
                            "name": "Self-Test Graph Basics",
                            "attempts": 0,
                            "timelimit_seconds": 0,
                            "review_correctness_allowed": True,
                        },
                    },
                ],
            },
            {
                "section_index": 1,
                "title": "Topic 2: Midterms",
                "modules": [
                    {
                        "module_id": 201,
                        "name": "Midterm Exam #1",
                        "modname": "quiz",
                        "quiz_meta": {
                            "name": "Midterm Exam #1",
                            "attempts": 1,
                            "timelimit_seconds": 2700,
                        },
                    },
                    {
                        "module_id": 202,
                        "name": "Mystery Quiz",
                        "modname": "quiz",
                    },
                ],
            },
        ],
    }

    sync_res = client.post("/api/sync/extension", json=initial_payload)
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["success"] is True
    assert sync_data["workspace_url"] == "/ucu/courses/1048"
    assert sync_data["summary"]["new_topics"] == 2
    assert sync_data["summary"]["blocked_exams"] == 2

    # Verify workspace course bundle (ExamMix is lazy until opened/requested)
    bundle_res = client.get("/api/workspace/courses/1048")
    assert bundle_res.status_code == 200
    bundle = bundle_res.json()
    assert bundle["course"]["title"] == "Discrete Mathematics"
    assert len(bundle["topic_mixes"]) == 2
    assert len(bundle["blocked_quizzes"]) == 2
    assert bundle["exam_mix"] is None
    assert bundle["course"]["exam_mix_stale"] is True

    exam_res = client.post("/api/workspace/courses/1048/exam-mix")
    assert exam_res.status_code == 200
    exam_data = exam_res.json()["exam_mix"]
    assert "flowchart LR" in exam_data["concept_map_mermaid"]

    first_mix = bundle["topic_mixes"][0]
    mix_id = first_mix["mix_id"]
    assert len(first_mix["book_sections"]) >= 1
    assert "flowchart TD" in first_mix["book_sections"][0]["mermaid_diagram"]

    # Save personal student notes
    note_text = "Remember Euler formula: V - E + F = 2"
    note_res = client.patch(f"/api/workspace/mixes/{mix_id}/notes", json={"notes": note_text})
    assert note_res.status_code == 200
    assert note_res.json()["user_notes"] == note_text

    # Identical re-sync -> 0 changes
    res_same = client.post("/api/sync/extension", json=initial_payload)
    assert res_same.status_code == 200
    assert res_same.json()["summary"]["unchanged_topics"] == 2
    assert res_same.json()["summary"]["updated_topics"] == 0

    # Upstream change on Topic 1 -> marks update available without erasing notes
    updated_payload = {
        **initial_payload,
        "sections": [
            {
                **initial_payload["sections"][0],
                "summary": "Vertices, edges, planar graphs, Euler theorem",
            },
            initial_payload["sections"][1],
        ],
    }
    res_diff = client.post("/api/sync/extension", json=updated_payload)
    assert res_diff.status_code == 200
    assert res_diff.json()["summary"]["updated_topics"] == 1

    mid_bundle = client.get("/api/workspace/courses/1048").json()
    assert mid_bundle["topic_mixes"][0]["has_upstream_update"] is True
    assert mid_bundle["topic_mixes"][0]["user_notes"] == note_text

    # Apply update -> increments version and keeps personal notes
    ack_res = client.post(f"/api/workspace/mixes/{mix_id}/ack-update")
    assert ack_res.status_code == 200
    acked = ack_res.json()["mix"]
    assert acked["version"] == 2
    assert acked["has_upstream_update"] is False
    assert acked["user_notes"] == note_text


def test_file_upload_tools_update_and_course_page(isolated_store):
    client = TestClient(app)

    tools_json = (
        '{"interactive_book": true, "mermaid_diagrams": true, '
        '"visual_cards": true, "practice_quizzes": true, '
        '"flashcards": true, "exam_mix": true, "deadline_tracker": true}'
    )
    upload_res = client.post(
        "/api/workspace/courses/upload",
        data={
            "course_title": "Algorithms & Data Structures",
            "shortname": "ADS-202",
            "authority": "custom",
            "tools_json": tools_json,
        },
        files={"file": ("lecture1.md", b"# Binary Trees\nEach node has up to 2 children.\nBalanced AVL trees stay O(log n).", "text/markdown")},
    )
    assert upload_res.status_code == 200
    up_data = upload_res.json()
    cid = up_data["course_id"]
    assert up_data["workspace_url"] == f"/custom/courses/{cid}"

    # Verify list endpoint & standalone course page HTML
    list_res = client.get("/api/workspace/courses")
    assert list_res.status_code == 200
    assert any(c["course_id"] == cid for c in list_res.json())

    html_res = client.get(f"/custom/courses/{cid}")
    assert html_res.status_code == 200
    assert "mermaid" in html_res.text

    # Toggle off mermaid diagrams via tools endpoint
    put_res = client.put(
        f"/api/workspace/courses/{cid}/tools",
        json={
            "interactive_book": True,
            "mermaid_diagrams": False,
            "visual_cards": False,
            "practice_quizzes": True,
            "flashcards": True,
            "exam_mix": True,
            "deadline_tracker": True,
        },
    )
    assert put_res.status_code == 200

    updated_bundle = client.get(f"/api/workspace/courses/{cid}").json()
    assert updated_bundle["topic_mixes"][0]["book_sections"][0]["mermaid_diagram"] is None
    assert len(updated_bundle["topic_mixes"][0]["flashcards"]) >= 1

    # Delete course cleanly
    del_res = client.delete(f"/api/workspace/courses/{cid}")
    assert del_res.status_code == 200
    assert client.get(f"/api/workspace/courses/{cid}").status_code == 404


def test_favicon_and_unknown_authority_do_not_crash():
    client = TestClient(app)

    fav_res = client.get("/favicon.ico")
    assert fav_res.status_code == 204

    unknown_res = client.get("/unknown-university-slug")
    assert unknown_res.status_code == 404


@pytest.mark.asyncio
async def test_event_monitor_scan_uses_course_id_per_course():
    from app.services.event_monitor import EventMonitorService

    captured_course_ids = []

    class FakeMoodleClient:
        async def get_user_courses(self, **kwargs):
            return [{"id": 101, "shortname": "CS-101"}]

        async def get_assignments(self, **kwargs):
            return {"courses": []}

        async def get_user_grades(self, **kwargs):
            assert "course_ids" not in kwargs
            captured_course_ids.append(kwargs["course_id"])
            return {
                "usergrades": [
                    {
                        "courseid": kwargs["course_id"],
                        "gradeitems": [
                            {"itemname": "Lab 1", "gradeformatted": "95.00"}
                        ],
                    }
                ]
            }

    monitor = EventMonitorService()
    await monitor.scan_user_events(user_id=42, client=FakeMoodleClient(), token="tok")
    assert captured_course_ids == [101]
    assert monitor._user_state[42]["grades"]["101_Lab 1"] == "95.00"


def test_user_isolation_guests_cannot_read_or_overwrite_same_course(isolated_store):
    client_a = TestClient(app)
    client_b = TestClient(app)

    payload = {
        "authority": "ucu",
        "moodle_url": "https://learn.ucu.edu.ua",
        "course_id": 1048,
        "course_name": "Operating Systems",
        "course_shortname": "OS-1048",
        "sections": [
            {
                "section_index": 0,
                "title": "Processes & Threads",
                "summary": "Scheduling and context switching",
                "modules": [
                    {
                        "module_id": 501,
                        "name": "Lecture 1 Slides",
                        "modname": "resource",
                        "text_excerpt": "PCB stores registers and memory map",
                    }
                ],
            }
        ],
    }

    # Client A syncs course 1048 and writes private notes
    res_a = client_a.post("/api/sync/extension", json=payload)
    assert res_a.status_code == 200
    bundle_a = client_a.get("/api/workspace/courses/1048").json()
    mix_id_a = bundle_a["topic_mixes"][0]["mix_id"]
    assert client_a.patch(
        f"/api/workspace/mixes/{mix_id_a}/notes",
        json={"notes": "User A confidential exam tip"},
    ).status_code == 200

    # Client B starts isolated: empty list and 404 on Client A's course & mix
    assert client_b.get("/api/workspace/courses").json() == []
    assert client_b.get("/api/workspace/courses/1048").status_code == 404
    assert client_b.patch(
        f"/api/workspace/mixes/{mix_id_a}/notes",
        json={"notes": "Tampered by B"},
    ).status_code == 404
    assert client_b.post(f"/api/workspace/mixes/{mix_id_a}/ack-update").status_code == 404
    assert client_b.delete("/api/workspace/courses/1048").status_code == 404

    # Client B syncs the exact same Moodle course_id and content hash -> separate private workspace
    res_b = client_b.post("/api/sync/extension", json=payload)
    assert res_b.status_code == 200
    bundle_b = client_b.get("/api/workspace/courses/1048").json()
    mix_id_b = bundle_b["topic_mixes"][0]["mix_id"]
    assert client_b.patch(
        f"/api/workspace/mixes/{mix_id_b}/notes",
        json={"notes": "User B personal note"},
    ).status_code == 200

    # Verify both tenants retained independent notes cleanly
    recheck_a = client_a.get("/api/workspace/courses/1048").json()
    recheck_b = client_b.get("/api/workspace/courses/1048").json()
    assert recheck_a["topic_mixes"][0]["user_notes"] == "User A confidential exam tip"
    assert recheck_b["topic_mixes"][0]["user_notes"] == "User B personal note"


def test_moodle_user_isolation_and_extension_session_token(isolated_store):
    from app.config import get_settings
    from app.core.security import create_session_jwt

    settings = get_settings()
    jwt_u1 = create_session_jwt(
        {
            "sub": "student_one",
            "user_id": 1001,
            "fullname": "Student One",
            "site_url": "https://learn.ucu.edu.ua",
            "moodle_token": "tok1",
        },
        settings,
    )
    jwt_u2 = create_session_jwt(
        {
            "sub": "student_two",
            "user_id": 2002,
            "fullname": "Student Two",
            "site_url": "https://learn.ucu.edu.ua",
            "moodle_token": "tok2",
        },
        settings,
    )

    browser_u1 = TestClient(app)
    browser_u1.cookies.set(settings.COOKIE_NAME, jwt_u1)
    sess_res = browser_u1.get("/api/workspace/session")
    assert sess_res.status_code == 200
    sess_data = sess_res.json()
    assert sess_data["auth_mode"] == "moodle"
    assert sess_data["owner_id"] == "moodle:learn.ucu.edu.ua:1001"
    ext_token = sess_data["workspace_token"]

    # Extension worker sends ONLY X-Workspace-Token (no Moodle cookie!) -> lands inside User 1001 workspace
    ext_worker = TestClient(app)
    up_res = ext_worker.post(
        "/api/workspace/courses/create-text",
        headers={"X-Workspace-Token": ext_token},
        json={"title": "Linear Algebra", "content_text": "Eigenvalues satisfy det(A - lambda I) = 0"},
    )
    assert up_res.status_code == 200
    assert up_res.json()["owner_id"] == "moodle:learn.ucu.edu.ua:1001"
    u1_courses = browser_u1.get("/api/workspace/courses").json()
    assert len(u1_courses) == 1
    assert u1_courses[0]["title"] == "Linear Algebra"

    # Second Moodle user sees empty list and cannot open User 1001's course
    browser_u2 = TestClient(app)
    browser_u2.cookies.set(settings.COOKIE_NAME, jwt_u2)
    assert browser_u2.get("/api/workspace/courses").json() == []
    assert browser_u2.get(f"/api/workspace/courses/{u1_courses[0]['course_id']}").status_code == 404


def test_legacy_workspace_db_auto_migrates_without_leaking(tmp_path):
    import sqlite3

    legacy_db = tmp_path / "legacy_workspace.db"
    with sqlite3.connect(str(legacy_db)) as conn:
        conn.executescript(
            """
            CREATE TABLE workspace_courses (
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
            CREATE TABLE topic_snapshots (
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
            CREATE TABLE topic_mixes (
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
            CREATE TABLE exam_mixes (
                course_id INTEGER PRIMARY KEY,
                exam_mix_id TEXT NOT NULL,
                visibility TEXT NOT NULL DEFAULT 'private',
                exam_mix_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO workspace_courses VALUES (
                777, 'ucu', 'Legacy Course', 'LEG-777', 'https://learn.ucu.edu.ua',
                'moodle_extension', 'private', '{}', '[]', '[]', '2026-11-14T18:00:00+00:00'
            );
            """
        )

    store = WorkspaceStore(db_path=str(legacy_db))
    assert store.list_courses(owner_id="ws:fresh_user") == []
    legacy_list = store.list_courses(owner_id="legacy")
    assert len(legacy_list) == 1
    assert legacy_list[0].course_id == 777


def test_preflight_diff_and_partial_module_update(isolated_store, monkeypatch):
    from app.models.mix import compute_content_hash
    from app.services.mix_generator import StructuredPlaceholderMixGenerator

    client = TestClient(app)
    h101 = compute_content_hash("mod101:v1")
    h102_v1 = compute_content_hash("mod102:v1")
    h102_v2 = compute_content_hash("mod102:v2")

    payload_v1 = {
        "authority": "ucu",
        "moodle_url": "https://learn.ucu.edu.ua",
        "course_id": 2201,
        "course_name": "Systems Engineering",
        "sections": [
            {
                "section_index": 0,
                "title": "Topic 0: Pipelines",
                "modules": [
                    {
                        "module_id": 101,
                        "name": "Lecture 1 - Hashing",
                        "modname": "resource",
                        "text_excerpt": "Deterministic SHA-256 content addressing",
                        "module_hash": h101,
                    },
                    {
                        "module_id": 102,
                        "name": "Lecture 2 - Diffing",
                        "modname": "page",
                        "text_excerpt": "Initial pre-flight diff protocol",
                        "module_hash": h102_v1,
                    },
                ],
            }
        ],
    }
    res1 = client.post("/api/sync/extension", json=payload_v1)
    assert res1.status_code == 200
    assert res1.json()["summary"]["new_topics"] == 1

    # Identical pre-flight probe (~1 KB) -> both unchanged
    diff_same = client.post(
        "/api/sync/diff",
        json={
            "course_id": 2201,
            "modules": [
                {"module_id": 101, "section_index": 0, "module_hash": h101},
                {"module_id": 102, "section_index": 0, "module_hash": h102_v1},
            ],
        },
    )
    assert diff_same.status_code == 200
    assert diff_same.json()["unchanged_module_ids"] == [101, 102]
    assert diff_same.json()["changed_module_ids"] == []

    # Edit only module 102 -> pre-flight identifies only 102 as dirty
    diff_partial = client.post(
        "/api/sync/diff",
        json={
            "course_id": 2201,
            "modules": [
                {"module_id": 101, "section_index": 0, "module_hash": h101},
                {"module_id": 102, "section_index": 0, "module_hash": h102_v2},
            ],
        },
    )
    assert diff_partial.status_code == 200
    assert diff_partial.json()["unchanged_module_ids"] == [101]
    assert diff_partial.json()["changed_module_ids"] == [102]
    assert diff_partial.json()["dirty_section_indices"] == [0]

    # Extension omits heavy text_excerpt for unchanged module 101
    payload_v2 = {
        **payload_v1,
        "sections": [
            {
                "section_index": 0,
                "title": "Topic 0: Pipelines",
                "modules": [
                    {
                        "module_id": 101,
                        "name": "Lecture 1 - Hashing",
                        "modname": "resource",
                        "text_excerpt": None,
                        "module_hash": h101,
                    },
                    {
                        "module_id": 102,
                        "name": "Lecture 2 - Diffing",
                        "modname": "page",
                        "text_excerpt": "Updated incremental chunk merge algorithm",
                        "module_hash": h102_v2,
                    },
                ],
            }
        ],
    }
    res2 = client.post("/api/sync/extension", json=payload_v2)
    assert res2.status_code == 200
    assert res2.json()["summary"]["updated_topics"] == 1

    bundle = client.get("/api/workspace/courses/2201").json()
    mix = bundle["topic_mixes"][0]
    assert mix["has_upstream_update"] is True
    assert mix["dirty_chunk_ids"] == ["mod-102"]
    assert "Deterministic SHA-256" in bundle["sections"][0]["modules"][0]["description"]

    # Spy on generate_book_section during ack-update -> only mod-102 should rebuild!
    rebuilt_titles = []
    orig_gen_book = StructuredPlaceholderMixGenerator.generate_book_section

    async def spy_book(self, *args, **kwargs):
        rebuilt_titles.append(kwargs.get("title") or (args[0] if args else ""))
        return await orig_gen_book(self, *args, **kwargs)

    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "generate_book_section", spy_book)
    ack_res = client.post(f"/api/workspace/mixes/{mix['mix_id']}/ack-update")
    assert ack_res.status_code == 200
    acked = ack_res.json()["mix"]
    assert acked["mix_id"] == mix["mix_id"]
    assert acked["dirty_chunk_ids"] == []
    assert rebuilt_titles == ["Lecture 2 - Diffing"]


def test_shared_artifact_cache_and_exam_shield_non_caching(isolated_store):
    import sqlite3

    client_a = TestClient(app)
    client_b = TestClient(app)

    sess_a = client_a.get("/api/workspace/session").json()
    sess_b = client_b.get("/api/workspace/session").json()
    headers_a = {"X-Workspace-Token": sess_a["workspace_token"]}
    headers_b = {"X-Workspace-Token": sess_b["workspace_token"]}

    course_payload = {
        "authority": "ucu",
        "moodle_url": "https://learn.ucu.edu.ua",
        "course_id": 3301,
        "course_name": "Shared Cache Algorithms",
        "sections": [
            {
                "section_index": 0,
                "title": "Week 1: Dynamic Programming",
                "modules": [
                    {
                        "module_id": 501,
                        "name": "Lecture Alpha",
                        "modname": "resource",
                        "text_excerpt": "Bellman equations, memoization, DAG longest path",
                    },
                    {
                        "module_id": 502,
                        "name": "Restricted Midterm Exam",
                        "modname": "quiz",
                        "text_excerpt": "SECRET EXAM KEY DO NOT CACHE",
                        "quiz_meta": {"name": "Restricted Midterm Exam", "timelimit_seconds": 3600},
                    },
                ],
            }
        ],
    }

    # Student A computes & populates shared cache (only for safe_material, NEVER restricted_exam)
    res_a = client_a.post("/api/sync/extension", json=course_payload, headers=headers_a)
    assert res_a.status_code == 200
    assert res_a.json()["summary"]["cache_hits"] == 0
    assert res_a.json()["summary"]["recomputed_artifacts"] > 0

    # Student B has NO pre-flight entry (private tenant), so /api/sync/diff reports new module
    diff_b = client_b.post(
        "/api/sync/diff",
        json={"course_id": 3301, "modules": [{"module_id": 501, "section_index": 0, "module_hash": "x"}]},
        headers=headers_b,
    )
    assert diff_b.json()["new_module_ids"] == [501]

    # Student B syncs same content -> hits shared artifact_cache with 0 LLM recompute
    res_b = client_b.post("/api/sync/extension", json=course_payload, headers=headers_b)
    assert res_b.status_code == 200
    sum_b = res_b.json()["summary"]
    assert sum_b["cache_hits"] >= 3
    assert sum_b["recomputed_artifacts"] == 0

    # Verify Student A notes stay private & restricted_exam text NEVER entered artifact_cache
    mix_a = client_a.get("/api/workspace/courses/3301", headers=headers_a).json()["topic_mixes"][0]
    client_a.patch(
        f"/api/workspace/mixes/{mix_a['mix_id']}/notes",
        json={"notes": "Student A top secret note"},
        headers=headers_a,
    )
    client_b.post("/api/workspace/courses/3301/exam-mix", headers=headers_b)

    with sqlite3.connect(str(isolated_store.db_path)) as conn:
        rows = conn.execute("SELECT payload_json FROM artifact_cache").fetchall()
    all_cached_blob = "\n".join(r[0] for r in rows)
    assert "SECRET EXAM KEY DO NOT CACHE" not in all_cached_blob
    assert "Restricted Midterm Exam" not in all_cached_blob
    assert "Student A top secret note" not in all_cached_blob


def test_checkbox_toggle_flashcards_only_no_book_or_quiz_recompute(isolated_store, monkeypatch):
    from app.services.mix_generator import StructuredPlaceholderMixGenerator

    client = TestClient(app)
    initial_tools = (
        '{"interactive_book": true, "mermaid_diagrams": true, '
        '"visual_cards": true, "practice_quizzes": true, '
        '"flashcards": false, "exam_mix": true, "deadline_tracker": true}'
    )
    up_res = client.post(
        "/api/workspace/courses/upload",
        data={"course_title": "Operating Systems", "tools_json": initial_tools},
        files={
            "file": (
                "schedulers.md",
                b"# CPU Scheduling\nShortest Job First minimizes average waiting time.\nRound Robin uses a fixed time quantum.",
                "text/markdown",
            )
        },
    )
    assert up_res.status_code == 200
    cid = up_res.json()["course_id"]

    calls = {"book": 0, "mermaid": 0, "card": 0, "quiz": 0, "flash": 0}
    orig_book = StructuredPlaceholderMixGenerator.generate_book_section
    orig_mmd = StructuredPlaceholderMixGenerator.generate_mermaid_diagram
    orig_card = StructuredPlaceholderMixGenerator.generate_visual_card
    orig_quiz = StructuredPlaceholderMixGenerator.generate_practice_quizzes
    orig_flash = StructuredPlaceholderMixGenerator.generate_flashcards

    async def spy_book(self, *args, **kwargs):
        calls["book"] += 1
        return await orig_book(self, *args, **kwargs)

    async def spy_mmd(self, *args, **kwargs):
        calls["mermaid"] += 1
        return await orig_mmd(self, *args, **kwargs)

    async def spy_card(self, *args, **kwargs):
        calls["card"] += 1
        return await orig_card(self, *args, **kwargs)

    async def spy_quiz(self, *args, **kwargs):
        calls["quiz"] += 1
        return await orig_quiz(self, *args, **kwargs)

    async def spy_flash(self, *args, **kwargs):
        calls["flash"] += 1
        return await orig_flash(self, *args, **kwargs)

    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "generate_book_section", spy_book)
    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "generate_mermaid_diagram", spy_mmd)
    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "generate_visual_card", spy_card)
    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "generate_practice_quizzes", spy_quiz)
    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "generate_flashcards", spy_flash)

    # Turn ONLY flashcards ON
    toggle_res = client.put(
        f"/api/workspace/courses/{cid}/tools",
        json={
            "interactive_book": True,
            "mermaid_diagrams": True,
            "visual_cards": True,
            "practice_quizzes": True,
            "flashcards": True,
            "exam_mix": True,
            "deadline_tracker": True,
        },
    )
    assert toggle_res.status_code == 200
    t_data = toggle_res.json()
    assert t_data["recomputed_artifacts"] == ["flashcards"]
    assert "book_sections" in t_data["reused_artifacts"]
    assert "practice_quizzes" in t_data["reused_artifacts"]
    assert calls == {"book": 0, "mermaid": 0, "card": 0, "quiz": 0, "flash": 1}

    bundle = client.get(f"/api/workspace/courses/{cid}").json()
    assert len(bundle["topic_mixes"][0]["flashcards"]) >= 1


@pytest.mark.asyncio
async def test_debounced_queue_coalesces_four_rapid_uploads(isolated_store, monkeypatch):
    from app.config import get_settings
    from app.models.mix import CourseToolsConfig
    from app.services.build_queue import get_build_queue
    from app.services.workspace_store import get_workspace_store

    monkeypatch.setattr(get_settings(), "BUILD_DEBOUNCE_SECONDS", 0.05)
    store = get_workspace_store()
    queue = get_build_queue()
    owner_id = "ws:debounce_tester"
    tools = CourseToolsConfig(flashcards=False, exam_mix=True)

    # Rapid burst of 4 uploads into the same course
    res1 = await store.create_or_ingest_upload(
        title="Networks 101",
        authority="custom",
        content_text="TCP three-way handshake and congestion control",
        filename="lec1.md",
        tools=tools,
        owner_id=owner_id,
    )
    cid = res1["course_id"]
    for i in range(2, 5):
        await store.create_or_ingest_upload(
            title=f"Lecture {i}",
            authority="custom",
            content_text=f"Topic {i} routing protocol details",
            filename=f"lec{i}.md",
            tools=tools,
            owner_id=owner_id,
            course_id=cid,
        )

    jobs_before = queue.get_jobs(owner_id, cid)
    assert len(jobs_before) == 1
    assert jobs_before[0]["scheduled_count"] == 4
    assert jobs_before[0]["status"] == "debouncing"

    await asyncio.sleep(0.15)
    jobs_after = queue.get_jobs(owner_id, cid)
    assert jobs_after[0]["status"] == "completed"
    assert jobs_after[0]["executions"] == 1

    bundle = store.get_course_bundle(cid, owner_id=owner_id)
    assert bundle is not None
    assert bundle["course"].exam_mix_stale is False
    assert bundle["exam_mix"] is not None
    assert len(bundle["exam_mix"].included_mix_ids) == 4


def test_incremental_exam_mix_reuses_unchanged_topic_digests(isolated_store, monkeypatch):
    from app.services.mix_generator import StructuredPlaceholderMixGenerator

    client = TestClient(app)
    sections = [
        {
            "section_index": i,
            "title": f"Topic {i}",
            "summary": f"Core theorem {i}",
            "modules": [{"module_id": 900 + i, "name": f"Module {i}", "modname": "resource", "text_excerpt": f"Material {i}"}],
        }
        for i in range(4)
    ]
    sync_payload = {
        "authority": "ucu",
        "moodle_url": "https://learn.ucu.edu.ua",
        "course_id": 4401,
        "course_name": "Distributed Systems",
        "sections": sections,
    }
    assert client.post("/api/sync/extension", json=sync_payload).status_code == 200

    # Initial lazy ExamMix build computes 4 digests
    first_exam = client.post("/api/workspace/courses/4401/exam-mix").json()
    assert first_exam["incremental_updates"] == 4
    assert first_exam["cached_topics_reused"] == 0

    # Add personal note on Topic 0
    bundle_0 = client.get("/api/workspace/courses/4401").json()
    mix0_id = bundle_0["topic_mixes"][0]["mix_id"]
    mix2_id = bundle_0["topic_mixes"][2]["mix_id"]
    client.patch(f"/api/workspace/mixes/{mix0_id}/notes", json={"notes": "Topic 0 Exam Reminder"})

    # Update ONLY Topic 2 out of 4
    updated_sections = list(sections)
    updated_sections[2] = {
        "section_index": 2,
        "title": "Topic 2",
        "summary": "Raft consensus leader election & log replication",
        "modules": [{"module_id": 902, "name": "Module 2", "modname": "resource", "text_excerpt": "Updated Raft quorum proofs"}],
    }
    sync2 = client.post("/api/sync/extension", json={**sync_payload, "sections": updated_sections}).json()
    assert sync2["summary"]["updated_topics"] == 1
    assert sync2["summary"]["unchanged_topics"] == 3
    assert client.post(f"/api/workspace/mixes/{mix2_id}/ack-update").status_code == 200

    digest_calls = []
    orig_digest = StructuredPlaceholderMixGenerator.build_topic_digest

    async def spy_digest(self, mix, include_user_notes=True):
        digest_calls.append(mix.topic_index)
        return await orig_digest(self, mix, include_user_notes=include_user_notes)

    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "build_topic_digest", spy_digest)

    rebuilt = client.post("/api/workspace/courses/4401/exam-mix").json()
    assert digest_calls == [2]
    assert rebuilt["incremental_updates"] == 1
    assert rebuilt["cached_topics_reused"] == 3
    assert "Topic 0 Exam Reminder" in rebuilt["exam_mix"]["master_cheatsheet_markdown"]


def test_extension_attachment_extraction_and_exam_shield_isolation(isolated_store):
    import base64

    client = TestClient(app)
    safe_notes = base64.b64encode(
        b"# Red-Black Trees\nEvery path from root to leaf has equal black height.\nRotations keep O(log n) lookup."
    ).decode("ascii")
    exam_secret = base64.b64encode(b"RESTRICTED FINAL EXAM ANSWERS").decode("ascii")

    res = client.post(
        "/api/sync/extension",
        json={
            "authority": "ucu",
            "moodle_url": "https://learn.ucu.edu.ua",
            "course_id": 5501,
            "course_name": "Advanced Data Structures",
            "sections": [
                {
                    "section_index": 0,
                    "title": "Balanced Trees",
                    "modules": [
                        {
                            "module_id": 701,
                            "name": "Lecture Slides",
                            "modname": "resource",
                            "attachment_filename": "rb_trees.md",
                            "attachment_base64": safe_notes,
                        },
                        {
                            "module_id": 702,
                            "name": "Lab 1 Submission",
                            "modname": "assign",
                            "due_at": "Due: Friday, 20 Nov 23:59",
                            "text_excerpt": "Implement RB insert and delete",
                        },
                        {
                            "module_id": 703,
                            "name": "Final Exam",
                            "modname": "quiz",
                            "attachment_filename": "answers.txt",
                            "attachment_base64": exam_secret,
                            "quiz_meta": {"name": "Final Exam", "timelimit_seconds": 5400},
                        },
                    ],
                }
            ],
        },
    )
    assert res.status_code == 200
    assert res.json()["summary"]["blocked_exams"] == 1

    bundle = client.get("/api/workspace/courses/5501").json()
    book_text = "\n".join(s["explanation_markdown"] for s in bundle["topic_mixes"][0]["book_sections"])
    assert "equal black height" in book_text
    assert "RESTRICTED FINAL EXAM ANSWERS" not in book_text
    assign_mod = [m for m in bundle["sections"][0]["modules"] if m["id"] == 702][0]
    assert assign_mod["due_at"] == "Due: Friday, 20 Nov 23:59"


def test_quiz_attempt_telemetry_feeds_exam_mix_weak_spots_privately(isolated_store):
    client_a = TestClient(app)
    client_b = TestClient(app)
    sess_a = client_a.get("/api/workspace/session").json()
    sess_b = client_b.get("/api/workspace/session").json()
    hdr_a = {"X-Workspace-Token": sess_a["workspace_token"]}
    hdr_b = {"X-Workspace-Token": sess_b["workspace_token"]}

    payload = {
        "authority": "ucu",
        "moodle_url": "https://learn.ucu.edu.ua",
        "course_id": 5601,
        "course_name": "Computer Architecture",
        "sections": [
            {
                "section_index": 0,
                "title": "Pipelining & Hazards",
                "modules": [
                    {
                        "module_id": 801,
                        "name": "Pipeline Hazards",
                        "modname": "page",
                        "text_excerpt": "Data hazards use forwarding\nControl hazards need branch prediction",
                    }
                ],
            }
        ],
    }
    assert client_a.post("/api/sync/extension", json=payload, headers=hdr_a).status_code == 200
    assert client_b.post("/api/sync/extension", json=payload, headers=hdr_b).status_code == 200

    mix_a = client_a.get("/api/workspace/courses/5601", headers=hdr_a).json()["topic_mixes"][0]
    q = mix_a["quizzes"][0]

    # Build initial ExamMix for Student A, then answer wrongly twice -> becomes stale & tracks weak spot
    client_a.post("/api/workspace/courses/5601/exam-mix", headers=hdr_a)
    wrong_idx = (q["correct_index"] + 1) % len(q["options"])
    for _ in range(2):
        att = client_a.post(
            f"/api/workspace/mixes/{mix_a['mix_id']}/quiz-attempt",
            headers=hdr_a,
            json={
                "question": q["question"],
                "chosen_index": wrong_idx,
                "correct_index": q["correct_index"],
                "topic_ref": "Pipelining & Hazards",
            },
        )
        assert att.status_code == 200
        assert att.json()["is_correct"] is False

    bundle_a = client_a.get("/api/workspace/courses/5601", headers=hdr_a).json()
    assert bundle_a["course"]["exam_mix_stale"] is True

    exam_a = client_a.post("/api/workspace/courses/5601/exam-mix", headers=hdr_a).json()["exam_mix"]
    assert any("Weak Spot: Pipelining & Hazards (2 missed)" in w for w in exam_a["weak_spots_focus"])

    # Student B stays completely unaffected by Student A's quiz misses
    exam_b = client_b.post("/api/workspace/courses/5601/exam-mix", headers=hdr_b).json()["exam_mix"]
    assert not any("Weak Spot:" in w for w in exam_b["weak_spots_focus"])


@pytest.mark.asyncio
async def test_workspace_owner_scoped_sse_and_events_history(isolated_store):
    import json
    import httpx

    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as client_a,
        httpx.AsyncClient(transport=transport, base_url="http://test") as client_b,
    ):
        sess_a = (await client_a.get("/api/workspace/session")).json()
        sess_b = (await client_b.get("/api/workspace/session")).json()
        assert sess_a["owner_id"] != sess_b["owner_id"]
        hdr_a = {"X-Workspace-Token": sess_a["workspace_token"]}
        hdr_b = {"X-Workspace-Token": sess_b["workspace_token"]}

        async def _trigger_sync_and_exam():
            await asyncio.sleep(0.05)
            await client_a.post(
                "/api/sync/extension",
                headers=hdr_a,
                json={
                    "authority": "ucu",
                    "moodle_url": "https://learn.ucu.edu.ua",
                    "course_id": 5701,
                    "course_name": "SSE Live Test",
                    "sections": [{"section_index": 0, "title": "Intro", "modules": []}],
                },
            )
            await client_a.post("/api/workspace/courses/5701/exam-mix", headers=hdr_a)

        async def _consume_sse():
            events_seen = []
            async with client_a.stream(
                "GET", "/api/workspace/events/stream?max_events=3", headers=hdr_a
            ) as stream_res:
                assert stream_res.status_code == 200
                async for line in stream_res.aiter_lines():
                    if line.startswith("event: "):
                        events_seen.append(line[len("event: "):].strip())
            return events_seen

        trigger_task = asyncio.create_task(_trigger_sync_and_exam())
        seen_types = await asyncio.wait_for(_consume_sse(), timeout=5.0)
        await trigger_task

        assert "system.connected" in seen_types
        assert "workspace.synced" in seen_types
        assert "mix.ready" in seen_types

        # Student A sees own recent events; Student B sees none of Student A's course events
        hist_a = (await client_a.get("/api/workspace/events", headers=hdr_a)).json()
        hist_b = (await client_b.get("/api/workspace/events", headers=hdr_b)).json()
        assert any(e["type"] == "mix.ready" and e["data"].get("course_id") == 5701 for e in hist_a)
        assert not any(e.get("data", {}).get("course_id") == 5701 for e in hist_b)


@pytest.mark.asyncio
async def test_build_queue_respects_concurrency_limit(isolated_store, monkeypatch):
    from app.config import get_settings
    from app.services.build_queue import get_build_queue

    monkeypatch.setattr(get_settings(), "BUILD_MAX_CONCURRENCY", 2)
    queue = get_build_queue()

    active = 0
    max_active = 0
    completed = 0

    for cid in range(1, 6):
        async def _job():
            nonlocal active, max_active, completed
            active += 1
            max_active = max(max_active, active)
            await asyncio.sleep(0.04)
            active -= 1
            completed += 1

        queue.schedule("ws:conc_tester", cid, "exam_mix", _job, debounce_seconds=0.01)

    await asyncio.sleep(0.25)
    assert completed == 5
    assert max_active <= 2


def test_google_login_and_extension_cookie_pairing(isolated_store, monkeypatch):
    """Google platform sign-in registers user without passwords and keeps same owner_id after MoodleSession pairing."""
    from app.services.moodle_client import MoodleClient

    async def fake_auth_cookie(self, cookie_input: str, target_moodle_url=None):
        return {
            "user": {
                "user_id": 4242,
                "username": "student.ucu",
                "fullname": "Olena Koval",
                "userpictureurl": None,
                "site_name": "UCU Learn",
                "site_url": "https://learn.ucu.edu.ua",
                "role": "student",
            },
            "token": cookie_input,
            "auth_type": "cookie",
            "sesskey": "sess-xyz",
        }

    monkeypatch.setattr(MoodleClient, "authenticate_with_cookie", fake_auth_cookie)

    client = TestClient(app)
    login_res = client.post(
        "/api/auth/google/dev-login",
        json={"email": "olena@ucu.edu.ua", "fullname": "Olena Koval"},
    )
    assert login_res.status_code == 200, login_res.text
    g_data = login_res.json()
    assert g_data["owner_id"].startswith("google:")

    pair_res = client.post(
        "/api/auth/extension-pair",
        json={"moodle_url": "https://learn.ucu.edu.ua", "cookie": "MoodleSession=secret_cookie_val_999"},
    )
    assert pair_res.status_code == 200, pair_res.text
    p_data = pair_res.json()
    assert p_data["owner_id"] == g_data["owner_id"]
    assert p_data["google_linked"] is True
    assert p_data["moodle_paired"] is True

    # Verify DB stores linked metadata ONLY — zero raw MoodleSession cookies or passwords
    db_user = isolated_store.get_platform_user(g_data["owner_id"])
    assert db_user is not None
    assert db_user["linked_moodle_user_id"] == 4242
    assert "secret_cookie_val_999" not in str(db_user)

    status_res = client.get("/api/auth/status")
    assert status_res.status_code == 200
    st = status_res.json()
    assert st["owner_id"] == g_data["owner_id"]
    assert st["google_linked"] is True
    assert st["moodle_paired"] is True
    assert st["moodle_url"] == "https://learn.ucu.edu.ua"

    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200
    st_after = client.get("/api/auth/status").json()
    assert st_after["google_linked"] is False
    assert st_after["moodle_paired"] is False

    # Account-switch isolation: User A logs in + pairs Moodle, then User B logs into Google on same browser
    client.post("/api/auth/google/dev-login", json={"email": "alice@ucu.edu.ua"})
    client.post(
        "/api/auth/extension-pair",
        json={"moodle_url": "https://learn.ucu.edu.ua", "cookie": "alice_cookie"},
    )
    client.post("/api/auth/google/dev-login", json={"email": "bob@ucu.edu.ua"})
    st_bob = client.get("/api/auth/status").json()
    assert st_bob["email"] == "bob@ucu.edu.ua"
    assert st_bob["owner_id"] != g_data["owner_id"]
    assert st_bob["moodle_paired"] is False

    # SSRF & non-HTTPS/unknown host rejection on extension-pair
    for bad_url in ("http://169.254.169.254", "https://127.0.0.1", "https://evil.example.com"):
        bad_pair = client.post(
            "/api/auth/extension-pair",
            json={"moodle_url": bad_url, "cookie": "test_cookie_val"},
        )
        assert bad_pair.status_code == 400


def test_per_person_isolated_temp_storage_and_auto_purge(isolated_store, tmp_path):
    """Temporary staging isolates raw files per owner_id, blocks restricted_exam, and auto-purges after upload."""
    from app.core.security import owner_storage_slug
    from app.services.temp_storage import get_temp_storage

    owner_a = "google:alice_sub_1"
    owner_b = "google:bob_sub_2"

    # Exam Shield: restricted_exam must NEVER be staged
    with pytest.raises(ValueError, match="Exam Shield"):
        isolated_store.stage_material(
            owner_id=owner_a,
            course_id=101,
            module_id=9,
            filename="final_exam.pdf",
            raw_bytes=b"secret exam answers",
            safety_status="restricted_exam",
        )

    staged_a = isolated_store.stage_material(
        owner_id=owner_a,
        course_id=101,
        module_id=1,
        filename="../evil/notes.txt",
        raw_bytes=b"Alice private lecture notes",
        ttl_seconds=10,
    )
    expected_prefix = f"{owner_storage_slug(owner_a)}/101/1_{staged_a['sha256_hash'][:12]}_notes.txt"
    assert staged_a["storage_key"] == expected_prefix
    assert ".." not in staged_a["storage_key"]
    assert get_temp_storage().exists(staged_a["storage_key"]) is True

    # Unsupported extension must be rejected
    with pytest.raises(ValueError, match="Unsupported file extension"):
        isolated_store.stage_material(
            owner_id=owner_a,
            course_id=101,
            module_id=3,
            filename="payload.exe",
            raw_bytes=b"MZ",
        )

    # Person B cannot read or purge Person A's staged file
    assert isolated_store.get_staged_material(owner_b, staged_a["staging_id"]) is None
    assert isolated_store.read_staged_bytes(owner_b, staged_a["staging_id"]) is None
    assert isolated_store.purge_staged_material(owner_b, staged_a["staging_id"]) is False
    assert isolated_store.list_staged_materials(owner_b) == []

    # Person A can read, validate, and purge
    assert isolated_store.read_staged_bytes(owner_a, staged_a["staging_id"]) == b"Alice private lecture notes"
    assert isolated_store.mark_staged_validated(owner_a, staged_a["staging_id"]) is True
    assert isolated_store.purge_staged_material(owner_a, staged_a["staging_id"]) is True
    assert get_temp_storage().exists(staged_a["storage_key"]) is False
    assert isolated_store.read_staged_bytes(owner_a, staged_a["staging_id"]) is None

    # Expired TTL sweep cleans abandoned staged files
    expired = isolated_store.stage_material(
        owner_id=owner_b,
        course_id=202,
        module_id=2,
        filename="abandoned.txt",
        raw_bytes=b"temporary data",
        ttl_seconds=1,
    )
    with isolated_store._connect() as conn:
        conn.execute(
            "UPDATE temp_staging SET expires_at = '2020-01-01T00:00:00+00:00' WHERE staging_id = ?",
            (expired["staging_id"],),
        )
    assert isolated_store.cleanup_expired_staging(owner_id=owner_b) == 1
    assert get_temp_storage().exists(expired["storage_key"]) is False

    # Upload endpoint uses per-user staging and auto-purges raw file once TopicMix is built
    client = TestClient(app)
    client.post("/api/auth/google/dev-login", json={"email": "uploader@ucu.edu.ua"})
    up_res = client.post(
        "/api/workspace/courses/upload",
        data={"course_title": "Linear Algebra", "shortname": "LA101"},
        files={"file": ("lecture1.txt", b"# Eigenvalues\nAx = lambda x defines eigenvectors.", "text/plain")},
    )
    assert up_res.status_code == 200, up_res.text
    up_json = up_res.json()
    assert up_json["staging_purged"] is True
    stg_list = client.get("/api/workspace/storage/staging").json()
    assert stg_list["items"] == []


def test_backend_moodle_sync_fetches_safe_resources_and_purges_staging(isolated_store, monkeypatch):
    """Backend sync-moodle uses paired MoodleSession cookie, skips quizzes, stages safe files, and purges them."""
    from app.services.moodle_client import MoodleClient
    from app.services.temp_storage import get_temp_storage

    async def fake_auth_cookie(self, cookie_input: str, target_moodle_url=None):
        return {
            "user": {
                "user_id": 77,
                "username": "taras",
                "fullname": "Taras Shevchenko",
                "site_name": "UCU Learn",
                "site_url": "https://learn.ucu.edu.ua",
            },
            "token": cookie_input,
            "auth_type": "cookie",
            "sesskey": "sess-77",
        }

    async def fake_get_courses(self, token, user_id, auth_type="token", sesskey=None):
        return [{"id": 555, "fullname": "Algorithms & Complexity", "shortname": "ALG-555"}]

    current_timemodified = [1700000100]

    async def fake_get_contents(self, token, course_id, auth_type="token", sesskey=None):
        return [
            {
                "section": 1,
                "name": "Topic 1: Dynamic Programming",
                "summary": "Memoization and optimal substructure",
                "modules": [
                    {
                        "id": 301,
                        "name": "DP Lecture Notes",
                        "modname": "resource",
                        "url": "https://learn.ucu.edu.ua/mod/resource/view.php?id=301",
                        "timemodified": current_timemodified[0],
                    },
                    {
                        "id": 302,
                        "name": "Midterm Exam Quiz",
                        "modname": "quiz",
                        "url": "https://learn.ucu.edu.ua/mod/quiz/view.php?id=302",
                    },
                ],
            }
        ]

    fetched_urls = []

    async def fake_fetch_resource(self, cookie, module_url, modname="resource", max_bytes=10 * 1024 * 1024, http_client=None):
        fetched_urls.append(module_url)
        return {
            "filename": "dp_notes.md",
            "content_type": "text/markdown",
            "raw_bytes": b"# Bellman Principle\nAn optimal policy has optimal subpolicies.",
            "text_excerpt": "Bellman Principle: An optimal policy has optimal subpolicies.",
        }

    monkeypatch.setattr(MoodleClient, "authenticate_with_cookie", fake_auth_cookie)
    monkeypatch.setattr(MoodleClient, "get_user_courses", fake_get_courses)
    monkeypatch.setattr(MoodleClient, "get_course_contents", fake_get_contents)
    monkeypatch.setattr(MoodleClient, "fetch_module_resource", fake_fetch_resource)

    client = TestClient(app)
    client.post("/api/auth/google/dev-login", json={"email": "taras@ucu.edu.ua"})
    client.post(
        "/api/auth/extension-pair",
        json={"moodle_url": "https://learn.ucu.edu.ua", "cookie": "live_cookie_abc"},
    )

    sync_res = client.post("/api/workspace/courses/555/sync-moodle", json={"fetch_files": True})
    assert sync_res.status_code == 200, sync_res.text
    sdata = sync_res.json()
    assert sdata["success"] is True
    assert sdata["downloaded_files"] == 1
    assert sdata["staged_count"] == 1
    assert sdata["staging_purged"] is True
    assert sdata["blocked_exams"] == 1
    # Never fetched the quiz URL
    assert fetched_urls == ["https://learn.ucu.edu.ua/mod/resource/view.php?id=301"]

    bundle = client.get("/api/workspace/courses/555").json()
    assert bundle["course"]["title"] == "Algorithms & Complexity"
    assert len(bundle["blocked_quizzes"]) == 1
    assert any("Bellman" in s["explanation_markdown"] for s in bundle["topic_mixes"][0]["book_sections"])

    # Temporary file bytes were purged after validation & processing
    stg = client.get("/api/workspace/storage/staging?include_purged=true").json()
    assert len(stg["items"]) == 1
    assert stg["items"][0]["status"] == "purged"
    assert get_temp_storage().exists(stg["items"][0]["storage_key"]) is False

    # 2nd sync with unchanged timemodified MUST skip re-downloading via file_manifest
    sync_res2 = client.post("/api/workspace/courses/555/sync-moodle", json={"fetch_files": True})
    assert sync_res2.status_code == 200
    s2 = sync_res2.json()
    assert s2["downloaded_files"] == 0
    assert s2["skipped_unchanged_downloads"] == 1
    assert len(fetched_urls) == 1

    # Bump timemodified -> re-downloads changed file & purges again
    current_timemodified[0] = 1700000999
    sync_res3 = client.post("/api/workspace/courses/555/sync-moodle", json={"fetch_files": True})
    assert sync_res3.status_code == 200
    s3 = sync_res3.json()
    assert s3["downloaded_files"] == 1
    assert len(fetched_urls) == 2


@pytest.mark.asyncio
async def test_moodle_client_fetch_module_resource_guards():
    """Real MoodleClient.fetch_module_resource streams safe files and blocks quiz redirects, http downgrades & oversized files."""
    import httpx
    from app.services.moodle_client import MoodleClient

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == "/mod/resource/view.php" and request.url.query == b"id=1&redirect=1":
            return httpx.Response(302, headers={"Location": "https://learn.ucu.edu.ua/pluginfile.php/10/mod_resource/content/1/slides.txt"})
        if path == "/pluginfile.php/10/mod_resource/content/1/slides.txt":
            return httpx.Response(200, headers={"Content-Type": "text/plain"}, content=b"Graph theory lecture slides")
        if path == "/mod/url/view.php" and request.url.query == b"id=2":
            return httpx.Response(302, headers={"Location": "https://learn.ucu.edu.ua/mod/quiz/view.php?id=99"})
        if path == "/mod/resource/view.php" and request.url.query == b"id=3&redirect=1":
            return httpx.Response(302, headers={"Location": "http://learn.ucu.edu.ua/pluginfile.php/10/secret.pdf"})
        if path == "/pluginfile.php/big.pdf":
            return httpx.Response(200, headers={"Content-Type": "application/pdf", "Content-Length": str(20 * 1024 * 1024)}, content=b"x" * 100)
        return httpx.Response(404)

    mc = MoodleClient(base_url="https://learn.ucu.edu.ua")
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler), follow_redirects=False) as http_client:
        ok = await mc.fetch_module_resource(
            cookie="sess123",
            module_url="https://learn.ucu.edu.ua/mod/resource/view.php?id=1",
            modname="resource",
            http_client=http_client,
        )
        assert ok is not None
        assert ok["filename"] == "slides.txt"
        assert ok["raw_bytes"] == b"Graph theory lecture slides"

        # Redirect to /mod/quiz/ must be blocked by Exam Shield
        with pytest.raises(ValueError, match="Exam Shield"):
            await mc.fetch_module_resource(
                cookie="sess123",
                module_url="https://learn.ucu.edu.ua/mod/url/view.php?id=2",
                modname="url",
                http_client=http_client,
            )

        # Redirect downgrading to http:// must be rejected (returns None)
        downgrade = await mc.fetch_module_resource(
            cookie="sess123",
            module_url="https://learn.ucu.edu.ua/mod/resource/view.php?id=3",
            modname="resource",
            http_client=http_client,
        )
        assert downgrade is None

        # Oversized Content-Length must abort before buffering
        with pytest.raises(ValueError, match="exceeds max allowed staging limit"):
            await mc.fetch_module_resource(
                cookie="sess123",
                module_url="https://learn.ucu.edu.ua/pluginfile.php/big.pdf",
                modname="file",
                max_bytes=1024 * 1024,
                http_client=http_client,
            )


def _make_sample_pdf_bytes(text: str) -> bytes:
    """Build a minimal single-page PDF readable by pypdf."""
    escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream = f"BT /F1 12 Tf 72 720 Td ({escaped}) Tj ET\n".encode("latin-1")
    objs = [
        b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
        b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
        b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
        f"4 0 obj<< /Length {len(stream)} >>stream\n".encode("ascii") + stream + b"endstream\nendobj\n",
        b"5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objs:
        offsets.append(len(out))
        out.extend(obj)
    xref_pos = len(out)
    out.extend(f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    out.extend(f"trailer<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii"))
    return bytes(out)


def _make_sample_docx_bytes(paragraphs: list[str]) -> bytes:
    import io
    import zipfile

    body = "".join(f"<w:p><w:r><w:t>{p}</w:t></w:r></w:p>" for p in paragraphs)
    doc_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{body}</w:body></w:document>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("word/document.xml", doc_xml)
    return buf.getvalue()


def _make_sample_pptx_bytes(slides: list[list[str]]) -> bytes:
    import io
    import zipfile

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for idx, lines in enumerate(slides, start=1):
            txts = "".join(f"<a:r><a:t>{ln}</a:t></a:r>" for ln in lines)
            slide_xml = (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
                'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
                f"<p:cSld><p:spTree>{txts}</p:spTree></p:cSld></p:sld>"
            )
            zf.writestr(f"ppt/slides/slide{idx}.xml", slide_xml)
    return buf.getvalue()


def test_import_extractors_for_pdf_docx_pptx_and_html(isolated_store):
    """Upload pipeline validates, extracts text from PDF/DOCX/PPTX/HTML, persists TopicMix, and purges staging."""
    client = TestClient(app)
    client.post("/api/auth/google/dev-login", json={"email": "importer@ucu.edu.ua"})

    samples = [
        ("lecture.pdf", _make_sample_pdf_bytes("Bayesian Posterior Inference"), "application/pdf", "Bayesian Posterior"),
        ("syllabus.docx", _make_sample_docx_bytes(["Markov Chains and Stationary Distributions"]), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Markov Chains"),
        ("slides.pptx", _make_sample_pptx_bytes([["SVD Decomposition", "Singular values capture variance"]]), "application/vnd.openxmlformats-officedocument.presentationml.presentation", "SVD Decomposition"),
        ("reading.html", b"<html><script>alert(1)</script><body><h1>Convex Optimization</h1><p>Lagrange multipliers</p></body></html>", "text/html", "Lagrange multipliers"),
    ]

    for idx, (fname, raw_bytes, mime, expected_phrase) in enumerate(samples, start=1):
        res = client.post(
            "/api/workspace/courses/upload",
            data={"course_id": str(800 + idx), "course_title": f"Course {idx}", "shortname": f"C{idx}"},
            files={"file": (fname, raw_bytes, mime)},
        )
        assert res.status_code == 200, f"{fname}: {res.text}"
        payload = res.json()
        assert payload["success"] is True
        assert payload["staging_purged"] is True
        assert payload["extracted_chars"] > 0

        bundle = client.get(f"/api/workspace/courses/{800 + idx}").json()
        book_md = "\n".join(s["explanation_markdown"] for s in bundle["topic_mixes"][0]["book_sections"])
        assert expected_phrase in book_md
        assert "alert(1)" not in book_md

    assert client.get("/api/workspace/storage/staging").json()["items"] == []


def test_moodle_html_scraping_and_resource_import_end_to_end(isolated_store, monkeypatch):
    """Full cookie-auth -> AJAX course list -> HTML course scrape fallback -> file fetch/extract -> purge flow."""
    import json
    import httpx
    from app.services.temp_storage import get_temp_storage

    requested_urls = []
    pdf_bytes = _make_sample_pdf_bytes("Dynamic Programming Memoization Table")
    pptx_bytes = _make_sample_pptx_bytes([["Shortest Paths", "Dijkstra relaxes non-negative edges"]])

    def moodle_handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        requested_urls.append(url_str)
        path = request.url.path

        # Never touch quiz endpoints
        if "/mod/quiz/" in path:
            raise AssertionError(f"Exam Shield violated! Requested quiz URL: {url_str}")

        if path == "/my/":
            assert "MoodleSession=valid_real_cookie_777" in request.headers.get("cookie", "")
            html = (
                '<html><script>M.cfg={"sesskey":"realSess99","userId":901};</script>'
                '<span class="usertext">Nadia Franko</span>'
                '<a href="https://learn.ucu.edu.ua/user/profile.php?id=901">Profile</a></html>'
            )
            return httpx.Response(200, headers={"Content-Type": "text/html"}, content=html.encode("utf-8"))

        if path == "/lib/ajax/service.php":
            info = request.url.params.get("info", "")
            if info == "core_course_get_enrolled_courses_by_timeline_classification":
                return httpx.Response(
                    200,
                    json=[
                        {
                            "error": False,
                            "data": {
                                "courses": [
                                    {"id": 612, "shortname": "CS-612", "fullname": "Algorithm Design"}
                                ]
                            },
                        }
                    ],
                )
            # Simulate AJAX core_course_get_contents disabled so real HTML scraping fallback runs
            if info == "core_course_get_contents":
                return httpx.Response(
                    200,
                    json=[{"error": True, "exception": {"message": "Web service disabled"}}],
                )

        if path == "/course/view.php" and request.url.params.get("id") == "612":
            course_html = """
            <html><body>
              <ul class="topics">
                <li id="section-1" class="section main">
                  <h3 class="sectionname"><span>Week 1: Graphs & DP</span></h3>
                  <div class="summary"><p>Core graph traversal and DP techniques</p></div>
                  <div class="activity">
                    <a href="https://learn.ucu.edu.ua/mod/resource/view.php?id=401"><span>Lecture 1 PDF</span></a>
                    <a href="https://learn.ucu.edu.ua/mod/resource/view.php?id=402"><span>Lecture 2 Slides</span></a>
                    <a href="https://learn.ucu.edu.ua/mod/page/view.php?id=403"><span>Course Syllabus Page</span></a>
                    <a href="https://learn.ucu.edu.ua/mod/quiz/view.php?id=999"><span>Final Exam</span></a>
                  </div>
                </li>
              </ul>
            </body></html>
            """
            return httpx.Response(200, headers={"Content-Type": "text/html"}, content=course_html.encode("utf-8"))

        if path == "/mod/resource/view.php" and request.url.params.get("id") == "401":
            return httpx.Response(
                302,
                headers={"Location": "https://learn.ucu.edu.ua/pluginfile.php/55/mod_resource/content/1/week1.pdf?forcedownload=1"},
            )

        if path == "/pluginfile.php/55/mod_resource/content/1/week1.pdf":
            return httpx.Response(200, headers={"Content-Type": "application/pdf"}, content=pdf_bytes)

        # Simulate HTML wrapper resource page containing nested pluginfile.php link
        if path == "/mod/resource/view.php" and request.url.params.get("id") == "402":
            wrapper = '<html><body><div class="resourceworkaround"><a href="/pluginfile.php/55/mod_resource/content/2/dijkstra.pptx">Download</a></div></body></html>'
            return httpx.Response(200, headers={"Content-Type": "text/html"}, content=wrapper.encode("utf-8"))

        if path == "/pluginfile.php/55/mod_resource/content/2/dijkstra.pptx":
            return httpx.Response(
                200,
                headers={"Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation"},
                content=pptx_bytes,
            )

        if path == "/mod/page/view.php" and request.url.params.get("id") == "403":
            page_html = '<html><body><nav>Menu</nav><section id="region-main"><div role="main"><p>Weekly office hours are Tuesday 16:00.</p></div></section></body></html>'
            return httpx.Response(200, headers={"Content-Type": "text/html"}, content=page_html.encode("utf-8"))

        return httpx.Response(404, text="Not found")

    mock_transport = httpx.MockTransport(moodle_handler)
    orig_async_client = httpx.AsyncClient

    class PatchedAsyncClient(orig_async_client):
        def __init__(self, *args, **kwargs):
            kwargs["transport"] = mock_transport
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", PatchedAsyncClient)

    client = TestClient(app)
    g_res = client.post("/api/auth/google/dev-login", json={"email": "nadia@ucu.edu.ua", "fullname": "Nadia Franko"})
    assert g_res.status_code == 200

    pair_res = client.post(
        "/api/auth/extension-pair",
        json={"moodle_url": "https://learn.ucu.edu.ua", "cookie": "MoodleSession=valid_real_cookie_777"},
    )
    assert pair_res.status_code == 200, pair_res.text
    assert pair_res.json()["moodle_user_id"] == 901

    sync_res = client.post("/api/workspace/courses/612/sync-moodle", json={"fetch_files": True})
    assert sync_res.status_code == 200, sync_res.text
    sdata = sync_res.json()
    assert sdata["success"] is True
    assert sdata["downloaded_files"] == 3  # PDF + PPTX + HTML page
    assert sdata["staged_count"] == 3
    assert sdata["staging_purged"] is True
    assert sdata["blocked_exams"] == 1
    assert not any("/mod/quiz/" in u for u in requested_urls)

    bundle = client.get("/api/workspace/courses/612").json()
    assert bundle["course"]["title"] == "Algorithm Design"
    assert bundle["course"]["shortname"] == "CS-612"
    book_md = "\n".join(s["explanation_markdown"] for s in bundle["topic_mixes"][0]["book_sections"])
    assert "Dynamic Programming Memoization Table" in book_md
    assert "Dijkstra relaxes non-negative edges" in book_md
    assert "Weekly office hours are Tuesday 16:00." in book_md

    # Verify all 3 staged raw files were purged after processing
    stg = client.get("/api/workspace/storage/staging?include_purged=true").json()
    assert len(stg["items"]) == 3
    assert all(item["status"] == "purged" for item in stg["items"])
    assert all(not get_temp_storage().exists(item["storage_key"]) for item in stg["items"])

