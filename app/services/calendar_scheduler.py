"""Constraint-aware calendar slot finder and AI study-session scheduling infrastructure."""
from __future__ import annotations

import json
import logging
import re
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.services.calendar_service import (
    CalendarConflictError,
    CalendarServiceError,
    CalendarStore,
    _intervals_overlap,
    _merge_intervals,
    get_calendar_store,
    parse_utc_iso,
    resolve_timezone,
    to_utc_iso,
)
from app.services.gemini_service import GeminiService
from app.services.learning_provider import LearningProviderError

logger = logging.getLogger(__name__)

_PART_BOUNDS = {
    "morning": (6, 12),
    "afternoon": (12, 17),
    "evening": (17, 23),
}


def _round_up_15(dt: datetime) -> datetime:
    dt = dt.replace(second=0, microsecond=0)
    rem = dt.minute % 15
    if rem:
        dt = dt + timedelta(minutes=15 - rem)
    return dt


class CalendarScheduler:
    """Deterministic constraint engine + Gemini planner for AI-scheduled study events."""

    def __init__(self, store: Optional[CalendarStore] = None):
        self.store = store or get_calendar_store()

    def build_blocked_intervals(
        self,
        owner_id: str,
        start_utc: datetime,
        end_utc: datetime,
        *,
        settings: Optional[Dict[str, Any]] = None,
    ) -> List[Tuple[datetime, datetime]]:
        cfg = settings or self.store.get_settings(owner_id)
        raw: List[Tuple[datetime, datetime]] = []

        for fb in self.store.expand_forbidden_intervals(cfg, start_utc, end_utc):
            raw.append((parse_utc_iso(fb["start_at"]), parse_utc_iso(fb["end_at"])))

        if cfg.get("avoid_conflicts", True):
            pad = timedelta(minutes=max(0, int(cfg.get("buffer_minutes", 10))))
            for ev in self.store.list_events(owner_id, start_utc - pad, end_utc + pad):
                if ev.get("all_day") or ev.get("status") in {"free", "skipped"}:
                    continue
                s = max(start_utc, parse_utc_iso(ev["start_at"]) - pad)
                e = min(end_utc, parse_utc_iso(ev["end_at"]) + pad)
                if e > s:
                    raw.append((s, e))

        clipped = [
            (max(start_utc, s), min(end_utc, e))
            for s, e in raw
            if min(end_utc, e) > max(start_utc, s)
        ]
        return _merge_intervals(clipped)

    def _daily_study_minutes(self, owner_id: str, start_utc: datetime, end_utc: datetime, local_tz) -> Dict[date, int]:
        usage: Dict[date, int] = {}
        for ev in self.store.list_events(owner_id, start_utc, end_utc):
            if ev.get("source_type") != "ai_study" or ev.get("status") == "skipped":
                continue
            s = parse_utc_iso(ev["start_at"]).astimezone(local_tz)
            e = parse_utc_iso(ev["end_at"]).astimezone(local_tz)
            mins = max(0, int((e - s).total_seconds() // 60))
            usage[s.date()] = usage.get(s.date(), 0) + mins
        return usage

    def find_available_slots(
        self,
        owner_id: str,
        start_utc: datetime,
        end_utc: datetime,
        *,
        min_minutes: int = 30,
        respect_daily_cap: bool = True,
        settings: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        cfg = settings or self.store.get_settings(owner_id)
        local_tz = resolve_timezone(cfg.get("timezone", "Europe/Kyiv"))
        min_start = _round_up_15(max(start_utc, datetime.now(timezone.utc) + timedelta(minutes=10)))
        if end_utc <= min_start:
            return []

        blocked = self.build_blocked_intervals(owner_id, min_start, end_utc, settings=cfg)
        free: List[Tuple[datetime, datetime]] = []
        cursor = min_start
        for b_start, b_end in blocked:
            if b_start > cursor:
                free.append((cursor, b_start))
            cursor = max(cursor, b_end)
        if cursor < end_utc:
            free.append((cursor, end_utc))

        max_daily = int(cfg.get("max_daily_study_minutes", 240))
        daily_used = self._daily_study_minutes(owner_id, min_start - timedelta(days=1), end_utc + timedelta(days=1), local_tz) if respect_daily_cap else {}

        # Split at local midnight so daily capacity and day display stay clean.
        slots: List[Dict[str, Any]] = []
        for s_utc, e_utc in free:
            cur = _round_up_15(s_utc)
            while cur + timedelta(minutes=min_minutes) <= e_utc:
                cur_local = cur.astimezone(local_tz)
                next_midnight_local = datetime.combine(cur_local.date() + timedelta(days=1), time(0, 0), tzinfo=local_tz)
                next_midnight_utc = next_midnight_local.astimezone(timezone.utc)
                seg_end = min(e_utc, next_midnight_utc)
                dur = int((seg_end - cur).total_seconds() // 60)
                rem_cap = max_daily - daily_used.get(cur_local.date(), 0) if respect_daily_cap else dur
                if dur >= min_minutes and rem_cap >= min_minutes:
                    usable_end = min(seg_end, cur + timedelta(minutes=rem_cap)) if respect_daily_cap else seg_end
                    usable_dur = int((usable_end - cur).total_seconds() // 60)
                    if usable_dur >= min_minutes:
                        slots.append({
                            "date": cur_local.date().isoformat(),
                            "start_at": to_utc_iso(cur),
                            "end_at": to_utc_iso(usable_end),
                            "local_start": cur_local.strftime("%Y-%m-%d %H:%M"),
                            "local_end": usable_end.astimezone(local_tz).strftime("%H:%M"),
                            "duration_minutes": usable_dur,
                        })
                cur = next_midnight_utc
        return slots

    def _pick_slot(
        self,
        owner_id: str,
        duration_minutes: int,
        *,
        preferred_date: Optional[str] = None,
        preferred_time: Optional[str] = None,
        preferred_part_of_day: Optional[str] = None,
        horizon_days: int = 7,
        now_utc: Optional[datetime] = None,
    ) -> Optional[Tuple[datetime, datetime]]:
        cfg = self.store.get_settings(owner_id)
        local_tz = resolve_timezone(cfg.get("timezone", "Europe/Kyiv"))
        anchor = now_utc or datetime.now(timezone.utc)
        end_utc = anchor + timedelta(days=max(1, min(30, horizon_days)))
        slots = self.find_available_slots(owner_id, anchor, end_utc, min_minutes=duration_minutes, respect_daily_cap=True, settings=cfg)
        if not slots:
            return None

        dur_td = timedelta(minutes=duration_minutes)

        # 1. Exact preferred_date + preferred_time ("HH:MM") if that exact window fits inside a free slot.
        if preferred_date and preferred_time and re.match(r"^\d{2}:\d{2}$", preferred_time.strip()):
            try:
                pd = date.fromisoformat(preferred_date.strip())
                ph, pm = map(int, preferred_time.strip().split(":"))
                target_start = datetime.combine(pd, time(ph, pm), tzinfo=local_tz).astimezone(timezone.utc)
                target_end = target_start + dur_td
                if target_start >= anchor:
                    check = self.store.check_slot_conflicts(
                        owner_id,
                        target_start,
                        target_end,
                        settings=cfg,
                        check_forbidden=True,
                        check_existing=cfg.get("avoid_conflicts", True),
                        buffer_minutes=int(cfg.get("buffer_minutes", 10)),
                    )
                    daily_used = self._daily_study_minutes(owner_id, target_start - timedelta(days=1), target_end + timedelta(days=1), local_tz)
                    if check.allowed and daily_used.get(pd, 0) + duration_minutes <= int(cfg.get("max_daily_study_minutes", 240)):
                        return target_start, target_end
            except ValueError:
                pass

        def score(slot: Dict[str, Any]) -> Tuple[int, int, str]:
            s_utc = parse_utc_iso(slot["start_at"])
            s_local = s_utc.astimezone(local_tz)
            date_penalty = 0 if (not preferred_date or slot["date"] == preferred_date) else (1 if slot["date"] > preferred_date else 2)
            part_penalty = 0
            if preferred_part_of_day in _PART_BOUNDS:
                low_h, high_h = _PART_BOUNDS[preferred_part_of_day]
                if not (low_h <= s_local.hour < high_h):
                    part_penalty = 1
            return (date_penalty, part_penalty, slot["start_at"])

        best = min(slots, key=score)
        best_start = parse_utc_iso(best["start_at"])
        if preferred_part_of_day in _PART_BOUNDS:
            low_h, high_h = _PART_BOUNDS[preferred_part_of_day]
            best_local = best_start.astimezone(local_tz)
            if best_local.hour < low_h:
                shifted_local = best_local.replace(hour=low_h, minute=0, second=0, microsecond=0)
                shifted_utc = shifted_local.astimezone(timezone.utc)
                slot_end_utc = parse_utc_iso(best["end_at"])
                if shifted_utc + dur_td <= slot_end_utc:
                    best_start = shifted_utc
        return best_start, best_start + dur_td

    async def schedule_study_block(
        self,
        owner_id: str,
        *,
        course_id: Optional[int] = None,
        course_title: str = "",
        topic_index: Optional[int] = None,
        topic_title: str = "",
        title: str = "",
        description: str = "",
        duration_minutes: Optional[int] = None,
        preferred_date: Optional[str] = None,
        preferred_time: Optional[str] = None,
        preferred_part_of_day: Optional[str] = None,
        horizon_days: int = 7,
        created_by: str = "ai",
        sync_google: bool = True,
        now_utc: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Core infrastructure entrypoint: schedule a study block into the nearest valid,
        non-forbidden, conflict-free slot and optionally mirror to Google Calendar.
        """
        cfg = self.store.get_settings(owner_id)
        dur = max(15, min(240, int(duration_minutes or cfg.get("default_session_minutes", 60))))
        slot = self._pick_slot(
            owner_id,
            dur,
            preferred_date=preferred_date,
            preferred_time=preferred_time,
            preferred_part_of_day=preferred_part_of_day,
            horizon_days=horizon_days,
            now_utc=now_utc,
        )
        if slot is None:
            raise CalendarConflictError(
                f"Не знайдено вільного вікна на {dur} хв у межах найближчих {horizon_days} дн. "
                "Перевір заборонені години, зайняті події або денний ліміт навчання."
            )

        start_utc, end_utc = slot
        clean_course = str(course_title or "").strip()
        clean_topic = str(topic_title or "").strip()
        clean_title = str(title or "").strip()
        if not clean_title:
            if clean_course and clean_topic:
                clean_title = f"Навчання: {clean_course} — {clean_topic}"
            elif clean_course:
                clean_title = f"Навчання: {clean_course}"
            else:
                clean_title = "Навчальна сесія"

        ev = self.store.create_event(
            owner_id,
            title=clean_title[:220],
            start_utc=start_utc,
            end_utc=end_utc,
            source_type="ai_study" if created_by == "ai" else "manual",
            description=description,
            all_day=False,
            course_id=course_id,
            topic_index=topic_index,
            status="planned",
            created_by=created_by,
            check_conflicts=True,
            allow_conflict=False,
        )
        if sync_google:
            gid = await self.store.push_event_to_google(owner_id, ev)
            if gid:
                ev = self.store.get_event(owner_id, ev["event_id"]) or ev
        return ev

    async def plan_with_ai(
        self,
        owner_id: str,
        *,
        prompt: str,
        courses: List[Dict[str, Any]],
        deadlines: Optional[List[Dict[str, Any]]] = None,
        days: int = 7,
        sync_external: bool = True,
    ) -> Dict[str, Any]:
        """Convert natural-language study requests or auto-planning into conflict-safe calendar events."""
        sync_warnings: List[str] = []
        if sync_external:
            sync_res = await self.store.sync_all_sources(owner_id)
            sync_warnings.extend(sync_res.get("warnings") or [])

        cfg = self.store.get_settings(owner_id)
        local_tz = resolve_timezone(cfg.get("timezone", "Europe/Kyiv"))
        now_utc = datetime.now(timezone.utc)
        now_local = now_utc.astimezone(local_tz)
        horizon_days = max(1, min(14, int(days or 7)))
        end_utc = now_utc + timedelta(days=horizon_days)
        free_slots = self.find_available_slots(owner_id, now_utc, end_utc, min_minutes=30, respect_daily_cap=True, settings=cfg)

        if not free_slots:
            return {
                "scheduled": [],
                "unscheduled": [{"reason": "Немає вільних вікон у вибраному періоді (зайнятість або заборонені години)."}],
                "sync_warnings": sync_warnings,
                "assistant_message": "Не вдалося знайти вільний час з урахуванням сну, заборонених годин і наявних подій.",
            }

        svc = GeminiService()
        if not svc.is_available:
            raise LearningProviderError(
                "Підключи Gemini API key в налаштуваннях, щоб планувати заняття текстом. "
                "Без AI ти можеш додати заняття для курсу напряму кнопкою швидкого планування.",
                400,
            )

        course_lines = [
            f"- course_id={c.get('course_id')}: {c.get('title')} (тем: {c.get('topic_count', 0)})"
            for c in courses[:25]
        ] or ["- Курси ще не додані"]
        deadline_lines = []
        for dl in (deadlines or [])[:20]:
            due = int(dl.get("duedate") or 0)
            if due <= 0:
                continue
            due_local = datetime.fromtimestamp(due, tz=timezone.utc).astimezone(local_tz)
            deadline_lines.append(
                f"- course_id={dl.get('course_id')}: {dl.get('name')} до {due_local.strftime('%Y-%m-%d %H:%M')}"
            )
        slot_lines = [
            f"- {s['date']} {s['local_start'][-5:]}-{s['local_end']} (макс {s['duration_minutes']} хв)"
            for s in free_slots[:35]
        ]

        user_request = (prompt or "").strip() or (
            "Склади збалансований план навчання на найближчі дні з фокусом на найближчі дедлайни та активні курси."
        )
        ai_prompt = f"""Current local time: {now_local.strftime('%Y-%m-%d %H:%M (%A)')} ({cfg['timezone']})
Default session length: {cfg['default_session_minutes']} minutes
Daily study limit: {cfg['max_daily_study_minutes']} minutes

Student courses:
{chr(10).join(course_lines)}

Upcoming Moodle deadlines:
{chr(10).join(deadline_lines) if deadline_lines else '- Немає найближчих дедлайнів'}

Available conflict-free windows (already excluding sleep, forbidden hours, and busy events):
{chr(10).join(slot_lines)}

Student request:
\"\"\"{user_request}\"\"\"

Plan concrete study sessions strictly matching the student's request (or a practical 2-4 session plan if asked to plan generally).
Return JSON object with exact schema:
{{
  "assistant_message": "Коротке пояснення українською, що саме заплановано",
  "sessions": [
    {{
      "course_id": 123,
      "title": "Назва події українською (наприклад, Підготовка: Назва курсу)",
      "description": "Що саме варто опрацювати в цій сесії",
      "duration_minutes": 60,
      "preferred_date": "YYYY-MM-DD",
      "preferred_time": "HH:MM",
      "preferred_part_of_day": "morning|afternoon|evening"
    }}
  ]
}}
Rules:
- Use exact `course_id` from the list above (or null if general study).
- Pick `preferred_date` and `preferred_time` ONLY inside the available windows above.
- Never exceed 6 sessions per plan; keep duration between 30 and 180 minutes."""

        raw = await svc.generate_content(
            ai_prompt,
            system_instruction="You are a concise academic calendar planner. Output strict JSON only.",
            temperature=0.2,
            response_mime_type="application/json",
            timeout=45.0,
        )
        if not raw:
            raise LearningProviderError("Gemini не повернув план занять. Спробуй ще раз.", 502)

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if not match:
                raise LearningProviderError("Не вдалося розібрати план від Gemini. Спробуй сформулювати запит інакше.", 502)
            parsed = json.loads(match.group(0))

        course_map = {int(c["course_id"]): str(c.get("title") or "") for c in courses if c.get("course_id") is not None}
        proposed = parsed.get("sessions") if isinstance(parsed, dict) else []
        if not isinstance(proposed, list):
            proposed = []

        scheduled: List[Dict[str, Any]] = []
        unscheduled: List[Dict[str, Any]] = []
        for item in proposed[:6]:
            if not isinstance(item, dict):
                continue
            raw_cid = item.get("course_id")
            cid = int(raw_cid) if raw_cid is not None and str(raw_cid).isdigit() and int(raw_cid) in course_map else None
            c_title = course_map.get(cid, "") if cid is not None else ""
            dur = int(item.get("duration_minutes") or cfg["default_session_minutes"])
            try:
                created = await self.schedule_study_block(
                    owner_id,
                    course_id=cid,
                    course_title=c_title,
                    title=str(item.get("title") or "").strip(),
                    description=str(item.get("description") or "").strip(),
                    duration_minutes=dur,
                    preferred_date=item.get("preferred_date"),
                    preferred_time=item.get("preferred_time"),
                    preferred_part_of_day=item.get("preferred_part_of_day"),
                    horizon_days=horizon_days,
                    created_by="ai",
                    sync_google=True,
                    now_utc=now_utc,
                )
                scheduled.append(created)
            except CalendarConflictError as exc:
                unscheduled.append({
                    "title": item.get("title") or c_title or "Навчання",
                    "reason": exc.message,
                })

        return {
            "scheduled": scheduled,
            "unscheduled": unscheduled,
            "sync_warnings": sync_warnings,
            "assistant_message": str(parsed.get("assistant_message") or "").strip() or f"Заплановано занять: {len(scheduled)}.",
        }
