import asyncio
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.exceptions import MoodleAuthError, MoodleException
from app.core.security import get_current_user_session
from app.models.grade import GradeOverviewResponse, CourseGrades, GradeItem
from app.services.academic_cache import get_academic_cache
from app.services.moodle_client import MoodleClient

router = APIRouter(prefix="/api/grades", tags=["Grades"])


@router.get("", response_model=GradeOverviewResponse)
async def get_my_grades(
    course_id: Optional[int] = None,
    refresh: bool = Query(default=False),
    session: Dict[str, Any] = Depends(get_current_user_session),
):
    """
    Fetch all grades, feedbacks, and course totals concurrently with per-user TTL caching.
    """
    site_url = session.get("site_url")
    client = MoodleClient(base_url=site_url)
    token = session["moodle_token"]
    user_id = session["user_id"]
    auth_type = session.get("auth_type", "token")
    sesskey = session.get("sesskey")
    cache = get_academic_cache()

    courses = None if refresh else cache.get(site_url, user_id, "courses")
    if courses is None:
        try:
            courses = await client.get_user_courses(
                token=token,
                user_id=user_id,
                auth_type=auth_type,
                sesskey=sesskey,
            )
            cache.set(site_url, user_id, "courses", courses, ttl_seconds=300.0)
        except MoodleException as exc:
            if course_id is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Moodle error fetching user courses for grades: {exc.message}",
                )
            courses = []

    if course_id:
        target_courses = [c for c in courses if int(c["id"]) == int(course_id)]
        if not target_courses:
            target_courses = [{"id": course_id, "fullname": f"Course #{course_id}"}]
    else:
        target_courses = courses

    sem = asyncio.Semaphore(5)

    async def _fetch_course_grade(course: Dict[str, Any]) -> CourseGrades:
        cid = int(course["id"])
        cname = course.get("fullname", f"Course #{cid}")
        if not refresh:
            cached_cg = cache.get(site_url, user_id, "grades", str(cid))
            if cached_cg is not None:
                return cached_cg

        async with sem:
            try:
                res = await client.get_user_grades(
                    token=token,
                    course_id=cid,
                    user_id=user_id,
                    auth_type=auth_type,
                    sesskey=sesskey,
                )
                user_grades = res.get("usergrades", [])
                items: List[GradeItem] = []
                if user_grades:
                    for raw_item in user_grades[0].get("gradeitems", []):
                        item_name = raw_item.get("itemname") or ("Course Total" if raw_item.get("itemtype") == "course" else "Item")
                        raw_grade = raw_item.get("gradeformatted")
                        if raw_grade is None:
                            raw_grade = raw_item.get("graderaw")
                        items.append(
                            GradeItem(
                                id=raw_item.get("id"),
                                itemname=item_name,
                                itemtype=raw_item.get("itemtype"),
                                gradeformatted=str(raw_grade) if raw_grade is not None else None,
                                grademin=raw_item.get("grademin"),
                                grademax=raw_item.get("grademax"),
                                percentageformatted=raw_item.get("percentageformatted"),
                                feedback=raw_item.get("feedback"),
                            )
                        )
                cg = CourseGrades(course_id=cid, course_fullname=cname, grade_items=items)
                cache.set(site_url, user_id, "grades", cg, key=str(cid), ttl_seconds=300.0)
                return cg
            except MoodleAuthError as exc:
                if course_id is not None:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=exc.message,
                    )
                return CourseGrades(course_id=cid, course_fullname=cname, grade_items=[])
            except MoodleException as exc:
                if course_id is not None:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=exc.message,
                    )
                return CourseGrades(course_id=cid, course_fullname=cname, grade_items=[])
            except Exception:
                return CourseGrades(course_id=cid, course_fullname=cname, grade_items=[])

    course_grades_list = list(await asyncio.gather(*(_fetch_course_grade(c) for c in target_courses)))
    return GradeOverviewResponse(courses=course_grades_list)
