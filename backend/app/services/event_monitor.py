import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.core.events import event_bus, AcademicEvent
from app.services.moodle_client import MoodleClient

logger = logging.getLogger("moodle_event_monitor")


class EventMonitorService:
    """
    Lightweight, resource-efficient event detector.
    Analyzes assignments and grades to emit actionable events:
    - assignment.due_soon (Deadline approaching in 24 hours)
    - assignment.urgent (Deadline approaching in 6 hours)
    - assignment.overdue (Deadline passed without submission)
    - grade.updated (New grade or teacher feedback posted)
    """

    def __init__(self):
        # In-memory snapshot of user state: {user_id: {"assignments": {...}, "grades": {...}}}
        self._user_state: Dict[int, Dict[str, Any]] = {}

    async def scan_user_events(
        self,
        user_id: int,
        client: MoodleClient,
        token: str,
        auth_type: str = "token",
        sesskey: Optional[str] = None,
    ) -> List[AcademicEvent]:
        """
        Scan assignments and grades for a specific user and emit detected events.
        """
        now = datetime.now(timezone.utc)
        emitted_events: List[AcademicEvent] = []

        try:
            # 1. Fetch user courses
            courses = await client.get_user_courses(
                token=token,
                user_id=user_id,
                auth_type=auth_type,
                sesskey=sesskey,
            )
            course_ids = [c["id"] for c in courses]
            if not course_ids:
                return []

            # 2. Check Assignments & Deadlines
            raw_assign_data = await client.get_assignments(
                token=token,
                course_ids=course_ids,
                auth_type=auth_type,
                sesskey=sesskey,
            )
            assignments_courses = raw_assign_data.get("courses", []) if isinstance(raw_assign_data, dict) else (raw_assign_data if isinstance(raw_assign_data, list) else [])

            for course_assign in assignments_courses:
                if not isinstance(course_assign, dict):
                    continue
                course_name = course_assign.get("shortname") or f"Course #{course_assign.get('id')}"
                for assign in course_assign.get("assignments", []):
                    due_date = assign.get("duedate")
                    if not due_date or due_date <= 0:
                        continue

                    due_dt = datetime.fromtimestamp(due_date, tz=timezone.utc)
                    assign_name = assign.get("name", "Assignment")
                    time_diff = due_dt - now

                    # Urgent: Due in < 6 hours
                    if timedelta(0) <= time_diff <= timedelta(hours=6):
                        event = AcademicEvent(
                            type="assignment.urgent",
                            title=f"🚨 Urgent: {assign_name}",
                            message=f"Due in {int(time_diff.total_seconds() // 3600)}h {int((time_diff.total_seconds() % 3600) // 60)}m ({course_name})",
                            severity="danger",
                            user_id=user_id,
                            data={"course": course_name, "assignment_id": assign.get("id"), "due": due_dt.isoformat()},
                        )
                        emitted_events.append(event)
                        await event_bus.publish(event)

                    # Due soon: Due in < 24 hours
                    elif timedelta(hours=6) < time_diff <= timedelta(hours=24):
                        event = AcademicEvent(
                            type="assignment.due_soon",
                            title=f"⏰ Approaching Deadline: {assign_name}",
                            message=f"Due in {int(time_diff.total_seconds() // 3600)} hours ({course_name})",
                            severity="warning",
                            user_id=user_id,
                            data={"course": course_name, "assignment_id": assign.get("id"), "due": due_dt.isoformat()},
                        )
                        emitted_events.append(event)
                        await event_bus.publish(event)

            # 3. Check Grades per course
            prev_grades = self._user_state.get(user_id, {}).get("grades", {})
            current_grades = {}

            for cid in course_ids:
                try:
                    grades_data = await client.get_user_grades(
                        token=token,
                        course_id=cid,
                        user_id=user_id,
                        auth_type=auth_type,
                        sesskey=sesskey,
                    )
                except Exception:
                    continue

                if not isinstance(grades_data, dict):
                    continue

                for ug in grades_data.get("usergrades", []):
                    for item in ug.get("gradeitems", []):
                        itemname = item.get("itemname") or ""
                        grade_val = item.get("gradeformatted") or item.get("graderaw")
                        if itemname and grade_val is not None and str(grade_val).strip() not in ("", "-", "None"):
                            grade_str = str(grade_val)
                            key = f"{cid}_{itemname}"
                            current_grades[key] = grade_str
                            if prev_grades and key not in prev_grades:
                                event = AcademicEvent(
                                    type="grade.new",
                                    title=f"🎓 New Grade Posted: {itemname}",
                                    message=f"Result: {grade_str}",
                                    severity="success",
                                    user_id=user_id,
                                    data={"course_id": cid, "item": itemname, "grade": grade_str},
                                )
                                emitted_events.append(event)
                                await event_bus.publish(event)

                for table in grades_data.get("tables", []):
                    t_cid = table.get("courseid", cid)
                    for item in table.get("tabledata", []):
                        itemname = item.get("itemname", {}).get("content", "") if isinstance(item.get("itemname"), dict) else ""
                        grade_val = item.get("grade", {}).get("content", "") if isinstance(item.get("grade"), dict) else ""
                        if itemname and grade_val and grade_val != "-":
                            key = f"{t_cid}_{itemname}"
                            current_grades[key] = grade_val
                            if prev_grades and key not in prev_grades:
                                event = AcademicEvent(
                                    type="grade.new",
                                    title=f"🎓 New Grade Posted: {itemname}",
                                    message=f"Result: {grade_val}",
                                    severity="success",
                                    user_id=user_id,
                                    data={"course_id": t_cid, "item": itemname, "grade": grade_val},
                                )
                                emitted_events.append(event)
                                await event_bus.publish(event)

            # Update cache snapshot
            if user_id not in self._user_state:
                self._user_state[user_id] = {}
            self._user_state[user_id]["grades"] = current_grades

        except Exception as exc:
            logger.warning(f"Error scanning events for user {user_id}: {exc}")

        return emitted_events


event_monitor = EventMonitorService()
