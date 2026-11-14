import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import workspace_store as ws_module
from app.services.workspace_store import WorkspaceStore


@pytest.fixture()
def isolated_store(tmp_path, monkeypatch):
    db_file = tmp_path / "test_workspace.db"
    store = WorkspaceStore(db_path=str(db_file))
    monkeypatch.setattr(ws_module, "_store_instance", store)
    monkeypatch.setattr("app.routers.workspace.get_workspace_store", lambda: store)
    return store


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

    # Verify workspace course bundle
    bundle_res = client.get("/api/workspace/courses/1048")
    assert bundle_res.status_code == 200
    bundle = bundle_res.json()
    assert bundle["course"]["title"] == "Discrete Mathematics"
    assert len(bundle["topic_mixes"]) == 2
    assert len(bundle["blocked_quizzes"]) == 2
    assert bundle["exam_mix"] is not None
    assert "flowchart LR" in bundle["exam_mix"]["concept_map_mermaid"]

    first_mix = bundle["topic_mixes"][0]
    mix_id = first_mix["mix_id"]
    assert len(first_mix["book_sections"]) == 1
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
