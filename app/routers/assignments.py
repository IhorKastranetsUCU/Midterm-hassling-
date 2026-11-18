from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.exceptions import MoodleException
from app.core.security import get_current_user_session
from app.models.assignment import AssignmentItem, AssignmentListResponse
from app.services.academic_cache import get_academic_cache
from app.services.moodle_client import MoodleClient
from app.services.submission_status import get_submission_states

router = APIRouter(prefix="/api/assignments", tags=["Assignments"])


@router.get("/submission-status")
async def get_assignment_submission_status(
    assignment_ids: List[int] = Query(default=[], max_length=24),
    session: Dict[str, Any] = Depends(get_current_user_session),
):
    client = MoodleClient(base_url=session.get("site_url"))
    return {"statuses": await get_submission_states(client, session, [i for i in assignment_ids if i > 0])}


@router.get("", response_model=AssignmentListResponse)
async def get_my_assignments(
    course_id: Optional[int] = None,
    refresh: bool = Query(default=False),
    session: Dict[str, Any] = Depends(get_current_user_session),
):
    """
    Fetch assignments across all enrolled courses or for a specific course (per-user TTL cached).
    """
    site_url = session.get("site_url")
    user_id = session["user_id"]
    cache = get_academic_cache()
    cache_key = str(course_id) if course_id is not None else "all"

    if not refresh:
        cached = cache.get(site_url, user_id, "assignments", cache_key)
        if cached is not None:
            return cached
        # If global assignments were recently fetched/prefetched, slice without extra Moodle call
        if course_id is not None:
            cached_all = cache.get(site_url, user_id, "assignments", "all")
            if cached_all is not None and cached_all.assignments:
                filtered = [a for a in cached_all.assignments if int(a.course_id) == int(course_id)]
                if filtered:
                    resp = AssignmentListResponse(total=len(filtered), assignments=filtered)
                    cache.set(site_url, user_id, "assignments", resp, key=cache_key, ttl_seconds=300.0)
                    return resp

    client = MoodleClient(base_url=site_url)
    token = session["moodle_token"]
    auth_type = session.get("auth_type", "token")
    sesskey = session.get("sesskey")

    try:
        # Determine course IDs (reusing cached courses when possible)
        if course_id:
            course_ids = [course_id]
        else:
            courses = None if refresh else cache.get(site_url, user_id, "courses")
            if courses is None:
                courses = await client.get_user_courses(
                    token=token,
                    user_id=user_id,
                    auth_type=auth_type,
                    sesskey=sesskey,
                )
                cache.set(site_url, user_id, "courses", courses, ttl_seconds=300.0)
            course_ids = [c["id"] for c in courses]

        raw_data = await client.get_assignments(
            token=token,
            course_ids=course_ids,
            auth_type=auth_type,
            sesskey=sesskey,
        )
    except MoodleException as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Moodle error fetching assignments: {exc.message}",
        )

    assignments_list = []
    now_ts = int(datetime.now(timezone.utc).timestamp())

    for c in raw_data.get("courses", []):
        c_id = int(c["id"])
        if course_id is not None and c_id != int(course_id):
            continue
        c_name = c.get("fullname", "")
        for a in c.get("assignments", []):
            duedate = a.get("duedate", 0)
            duedate_formatted = None
            is_overdue = False

            if duedate and duedate > 0:
                dt = datetime.fromtimestamp(duedate, tz=timezone.utc)
                duedate_formatted = dt.strftime("%Y-%m-%d %H:%M UTC")
                if duedate < now_ts:
                    is_overdue = True

            assignments_list.append(
                AssignmentItem(
                    id=a["id"],
                    cmid=a.get("cmid"),
                    course_id=c_id,
                    course_name=c_name,
                    name=a.get("name", "Assignment"),
                    duedate=duedate,
                    duedate_formatted=duedate_formatted,
                    intro=a.get("intro"),
                    nosubmissions=a.get("nosubmissions", 0),
                    submissions_open=a.get("submissions_open", True),
                    is_overdue=is_overdue,
                )
            )

    # Sort assignments by due date (upcoming first)
    assignments_list.sort(key=lambda x: x.duedate if x.duedate and x.duedate > 0 else 9999999999)

    resp = AssignmentListResponse(
        total=len(assignments_list),
        assignments=assignments_list,
    )
    cache.set(site_url, user_id, "assignments", resp, key=cache_key, ttl_seconds=300.0)
    return resp
