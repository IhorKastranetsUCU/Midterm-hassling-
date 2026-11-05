from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.exceptions import MoodleException
from app.core.security import get_current_user_session
from app.models.grade import GradeOverviewResponse, CourseGrades, GradeItem
from app.services.moodle_client import MoodleClient

router = APIRouter(prefix="/api/grades", tags=["Grades"])


@router.get("", response_model=GradeOverviewResponse)
async def get_my_grades(session: Dict[str, Any] = Depends(get_current_user_session)):
    """
    Fetch all grades, feedbacks, and course totals for the enrolled user.
    """
    client = MoodleClient(base_url=session.get("site_url"))
    token = session["moodle_token"]
    user_id = session["user_id"]
    auth_type = session.get("auth_type", "token")
    sesskey = session.get("sesskey")

    try:
        courses = await client.get_user_courses(
            token=token,
            user_id=user_id,
            auth_type=auth_type,
            sesskey=sesskey,
        )
    except MoodleException as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Moodle error fetching user courses for grades: {exc.message}",
        )

    course_grades_list: List[CourseGrades] = []

    for course in courses:
        cid = course["id"]
        cname = course.get("fullname", f"Course #{cid}")
        try:
            res = await client.get_user_grades(
                token=token,
                course_id=cid,
                user_id=user_id,
                auth_type=auth_type,
                sesskey=sesskey,
            )
            user_grades = res.get("usergrades", [])
            items = []
            if user_grades:
                for raw_item in user_grades[0].get("gradeitems", []):
                    # Include items with names or course totals
                    item_name = raw_item.get("itemname") or ("Course Total" if raw_item.get("itemtype") == "course" else "Item")
                    items.append(
                        GradeItem(
                            id=raw_item.get("id"),
                            itemname=item_name,
                            itemtype=raw_item.get("itemtype"),
                            gradeformatted=raw_item.get("gradeformatted") or raw_item.get("graderaw"),
                            grademin=raw_item.get("grademin"),
                            grademax=raw_item.get("grademax"),
                            percentageformatted=raw_item.get("percentageformatted"),
                            feedback=raw_item.get("feedback"),
                        )
                    )
            course_grades_list.append(CourseGrades(course_id=cid, course_fullname=cname, grade_items=items))
        except Exception:
            # Continue with other courses if one doesn't have grade reports enabled
            course_grades_list.append(CourseGrades(course_id=cid, course_fullname=cname, grade_items=[]))

    return GradeOverviewResponse(courses=course_grades_list)
