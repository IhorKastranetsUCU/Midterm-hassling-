from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.exceptions import MoodleException
from app.core.security import get_current_user_session
from app.models.assignment import AssignmentItem, AssignmentListResponse
from app.services.moodle_client import MoodleClient

router = APIRouter(prefix="/api/assignments", tags=["Assignments"])


@router.get("", response_model=AssignmentListResponse)
async def get_my_assignments(
    course_id: Optional[int] = None,
    session: Dict[str, Any] = Depends(get_current_user_session),
):
    """
    Fetch assignments across all enrolled courses or for a specific course.
    """
    client = MoodleClient(base_url=session.get("site_url"))
    token = session["moodle_token"]
    user_id = session["user_id"]
    auth_type = session.get("auth_type", "token")
    sesskey = session.get("sesskey")

    try:
        # Determine course IDs
        if course_id:
            course_ids = [course_id]
        else:
            courses = await client.get_user_courses(
                token=token,
                user_id=user_id,
                auth_type=auth_type,
                sesskey=sesskey,
            )
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
        c_id = c["id"]
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

    return AssignmentListResponse(
        total=len(assignments_list),
        assignments=assignments_list,
    )
