import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_system_health():
    response = client.get("/api/system/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "latency_ms" in data
    assert data["target_url"] == "https://learn.ucu.edu.ua"


def test_unauthenticated_access_denied():
    response = client.get("/api/courses")
    assert response.status_code == 401


def test_auth_with_cookie():
    # Test browser cookie sign-in
    res = client.post(
        "/api/auth/login",
        json={"cookie": "mock_moodle_session_cookie_12345"}
    )
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert "moodle_session" in res.cookies

    # Verify courses work with cookie session
    courses_res = client.get("/api/courses", cookies=res.cookies)
    assert courses_res.status_code == 200
    assert len(courses_res.json()) > 0


def test_auth_with_token():
    # Test direct token sign in
    res = client.post(
        "/api/auth/login",
        json={"token": "mock_token_demo"}
    )
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert "moodle_session" in res.cookies


def test_auth_and_full_flow():
    # 1. Login with demo account
    login_res = client.post(
        "/api/auth/login",
        json={"username": "demo", "password": "demopassword"}
    )
    assert login_res.status_code == 200
    auth_data = login_res.json()
    assert auth_data["success"] is True
    assert "moodle_session" in login_res.cookies

    # 2. Check /api/auth/me
    me_res = client.get("/api/auth/me", cookies=login_res.cookies)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "demo"

    # 3. Check /api/courses
    courses_res = client.get("/api/courses", cookies=login_res.cookies)
    assert courses_res.status_code == 200
    courses = courses_res.json()
    assert len(courses) > 0
    course_id = courses[0]["id"]

    # 4. Check course contents
    contents_res = client.get(f"/api/courses/{course_id}/contents", cookies=login_res.cookies)
    assert contents_res.status_code == 200
    sections = contents_res.json()
    assert len(sections) > 0

    # 4b. Check single course detail endpoint
    detail_res = client.get(f"/api/courses/{course_id}", cookies=login_res.cookies)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == course_id

    # 4c. Check dedicated course HTML page
    html_res = client.get(f"/courses/{course_id}")
    assert html_res.status_code == 200
    assert "text/html" in html_res.headers["content-type"]

    # 5. Check assignments
    assign_res = client.get("/api/assignments", cookies=login_res.cookies)
    assert assign_res.status_code == 200
    assert assign_res.json()["total"] > 0

    # 6. Check grades (all and filtered by course_id)
    grades_res = client.get("/api/grades", cookies=login_res.cookies)
    assert grades_res.status_code == 200
    assert len(grades_res.json()["courses"]) > 0

    single_grades_res = client.get(f"/api/grades?course_id={course_id}", cookies=login_res.cookies)
    assert single_grades_res.status_code == 200
    assert len(single_grades_res.json()["courses"]) == 1

    # 7. Logout
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200
