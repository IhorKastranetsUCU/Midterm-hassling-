"""Read actual Moodle submission states; unknown is deliberately not overdue."""
import asyncio
import hashlib
import time

_cache = {}


def submission_state(payload):
    raw = ((payload or {}).get("lastattempt") or {}).get("submission") or {}
    state = raw.get("status")
    return state if state in {"submitted", "new", "draft", "reopened"} else "unknown"


async def get_submission_states(client, session, assignment_ids):
    token = session["moodle_token"]
    scope = (session.get("site_url"), session.get("user_id"), hashlib.sha256(token.encode()).hexdigest())
    gate = asyncio.Semaphore(4)

    async def one(assignment_id):
        key = (*scope, assignment_id)
        cached = _cache.get(key)
        if cached and cached[0] > time.monotonic():
            return str(assignment_id), cached[1]
        state = "unknown"
        async with gate:
            try:
                params = {"assignid": assignment_id}
                if session.get("auth_type") == "cookie":
                    payload = await asyncio.wait_for(client.call_ajax_ws(
                        "mod_assign_get_submission_status", cookie=token,
                        sesskey=session.get("sesskey"), args=params,
                    ), timeout=8)
                else:
                    payload = await asyncio.wait_for(client.call_ws(
                        "mod_assign_get_submission_status", token, params=params,
                    ), timeout=8)
                state = submission_state(payload)
            except Exception:
                # Some universities don't expose the status service over AJAX.
                pass
        if len(_cache) < 2048 or key in _cache:
            _cache[key] = (time.monotonic() + (45 if state == "unknown" else 120), state)
        return str(assignment_id), state

    return dict(await asyncio.gather(*(one(i) for i in dict.fromkeys(assignment_ids))))
