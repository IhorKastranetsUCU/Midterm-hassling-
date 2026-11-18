# Hustle study workspace

Primary product: `/prototype/`. This checkout is `feat/dashboard-focus`, created from `origin/main` at `cbc7fb7`. The earlier working directory and its uncommitted changes are preserved.

Start a static server from this checkout (`python3 -m http.server 8081`) and visit `/prototype/`. Register, enter an HTTPS LMS address, select subjects, and enter the workspace. Account and LMS steps are local simulations; no credentials are stored or transmitted, and no university or Google service is contacted.

## Behavior

- `#plan`: overview, next incomplete task by source deadline, real recorded study time, seven-day chart, task progress, chronological deadline list, Pomodoro and day calendar.
- `#course/<id>`: the same metrics filtered by subject, with the practice actions in the plan. The old materials URL redirects to courses. Progress measures the three plan tasks, not mastery.
- `#calendar`: month/day agenda, keyboard day navigation, month navigation, today button, draggable accepted event chips, and editable event details.
- `#focus`: persistent 25/5/15 Pomodoro. Four completed focus sessions suggest a long break. Breaks require an explicit start and do not count toward study time.

The Pomodoro uses an absolute end time and credits only its actual focus interval, including background time. Reloading does not reset it. Active practice/material reading also records time while the page is focused and visible, until 60 seconds of inactivity. Practice and Pomodoro intervals never count twice. A reset or mode switch preserves time already studied. Day totals and midnight splitting use Europe/Kyiv, including daylight saving.

Urgency uses the original LMS deadline. The paper begins to warm three days out, without motion. A countdown and a faint edge effect begin in the last day. The color, height, opacity and movement of the flames increase continuously with the time remaining. Each deadline animates once per view. Reduced motion uses a still edge, completion clears the accent, and overdue items show a static status.

## Calendar integration boundary

`calendar-sync.js` owns the LMS review queue. Each candidate has an immutable source date/time, an editable calendar date/time, a decision status (`pending`, `accepted`, `declined`, `removed`), and change history. Only accepted events appear on the calendar. Rejecting or removing an event retains the record; users can add it again from **Події з LMS → Усі події**. Moving an event changes its calendar placement, while its original LMS deadline remains visible in event details and drives study urgency.

Demo candidates currently come from selected prototype subjects, dated relative to first workspace entry. `Hustle.calendar` exposes `init`, `events`, `pending`, `button`, `chips`, and `agenda`; a future LMS/Google adapter should supply stable external event IDs and persist decisions, OAuth permissions, timezone and synchronization state on the server. There is no Google OAuth, Google Calendar API call, external calendar synchronization or server account integration in this version.

## Persistence

- Existing account/course selection remains in the original tab's `sessionStorage` (`hustle-product-prototype-v1`).
- Study ledger, completed plan tasks, sessions and active timer: `localStorage` (`hustle-study-dashboard-v1`).
- Calendar candidates, decisions, placement and history: `localStorage` (`hustle-calendar-events-v1`).

These are browser-local prototype records. They are not isolated by authenticated account. Production integration needs account-scoped storage and server reconciliation.

## Verification

`node --test tests/prototype-study.test.js` covers Kyiv dates, month/year boundaries, urgency thresholds, timer recovery, midnight allocation and daylight saving.

Browser QA covers onboarding, course dashboards, actual practice completion, timer start/pause/reset/modes/reload/completion, LMS accept/reject/restore, event editing and removal, calendar navigation, desktop/mobile overflow, console errors and reduced motion. Screenshots are under `output/playwright/`.

## Compact progress and rewards

The overview and subject pages share a single statistics strip (daily focus/goal, seven-day total, task progress, active-day streak, XP level). The next activity sits on a warm paper note with the source deadline at its lower edge. Course sheets show their date directly on the cover. The month calendar and selected day share a spread on wide screens. First completion of a real practice task pays 10 XP, and a completed Pomodoro pays 25 XP. Reward IDs prevent repeat farming; manual task ticks do not pay XP. A level requires 100 XP. A short reward stamp animation respects reduced motion.

The calculation suite runs eight tests. Browser scenarios verified onboarding, timer start/pause/reset/modes/reload, exact completion accounting, completion idempotency, expired-break recovery, subject practice and XP repeat protection, event accept/reject/restore/edit/drag/remove/history, source deadline preservation, month/today/keyboard navigation, mobile drawer and reduced motion. A layout sweep covered ten routes at 390, 768, 1024 and 1512 pixels with no horizontal overflow or unnamed actions. Browser console contained no errors or warnings. Accelerated timer fixtures used the separate `127.0.0.1` origin, leaving the `localhost` review account with only actual QA activity.
