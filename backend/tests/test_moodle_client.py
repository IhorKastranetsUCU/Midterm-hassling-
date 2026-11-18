from app.config import get_settings
import pytest
from app.services.moodle_client import build_moodle_params, MoodleClient


def test_build_moodle_params_flat():
    params = {"userid": 42, "category": "cs"}
    result = dict(build_moodle_params(params))
    assert result == {"userid": 42, "category": "cs"}


def test_build_moodle_params_nested_list():
    params = {"courseids": [101, 102, 103]}
    result = dict(build_moodle_params(params))
    assert result == {
        "courseids[0]": 101,
        "courseids[1]": 102,
        "courseids[2]": 103,
    }


def test_build_moodle_params_nested_dict():
    params = {
        "criteria": [
            {"key": "id", "value": 101},
            {"key": "shortname", "value": "CS101"}
        ]
    }
    result = dict(build_moodle_params(params))
    assert result["criteria[0][key]"] == "id"
    assert result["criteria[0][value]"] == 101
    assert result["criteria[1][key]"] == "shortname"
    assert result["criteria[1][value]"] == "CS101"


@pytest.mark.asyncio
async def test_moodle_client_mock_auth(monkeypatch):
    monkeypatch.setattr(get_settings(), "MOODLE_MOCK_MODE", True)
    client = MoodleClient()
    result = await client.authenticate_user("demo", "anypassword")
    assert result["token"].startswith("mock_moodle_token")
    assert result["user"]["username"] == "demo"
    assert "fullname" in result["user"]


@pytest.mark.asyncio
async def test_moodle_client_mock_courses(monkeypatch):
    monkeypatch.setattr(get_settings(), "MOODLE_MOCK_MODE", True)
    client = MoodleClient()
    token = "mock_token"
    courses = await client.get_user_courses(token, user_id=42)
    assert len(courses) > 0
    assert courses[0]["id"] == 101
    assert "fullname" in courses[0]


@pytest.mark.asyncio
async def test_moodle_client_mock_course_contents(monkeypatch):
    monkeypatch.setattr(get_settings(), "MOODLE_MOCK_MODE", True)
    client = MoodleClient()
    token = "mock_token"
    contents = await client.get_course_contents(token, course_id=101)
    assert len(contents) > 0
    assert "modules" in contents[0]

@pytest.mark.asyncio
async def test_live_empty_enrolments_stay_empty(monkeypatch):
    from unittest.mock import AsyncMock

    monkeypatch.setattr(get_settings(), "MOODLE_MOCK_MODE", False)
    client = MoodleClient()
    enrolled = AsyncMock(return_value=[])
    monkeypatch.setattr(client, "call_ws", enrolled)
    assert await client.get_user_courses("live-token", user_id=42) == []
    enrolled.assert_awaited_once()
