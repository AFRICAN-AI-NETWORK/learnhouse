# Notification System — Backend + Frontend

## Summary

In-app (WebSocket) + email notifications for assignment grading, retake requests, new chapters/activities, and org-wide announcements. Certificate downloads are gated on capstone grading. Email delivery retries up to 3 times, then gives up without affecting the rest of the system.

Follows [`Notification System Implementation Plan-20260721112716.md`](./Notification%20System%20Implementation%20Plan-20260721112716.md). Core decision: reuse existing infra (chat WebSocket, global APScheduler, SMTP sender, enrollment/trail model) instead of a parallel SSE + Redis stack — one real-time channel's worth of load, not two.

## Backend (`apps/api`)

**Data model**

- `Notification` (`src/db/notifications.py`) — one table discriminated by `notification_type`, not one per trigger. Email state (`email_status`/`email_retry_count`/`email_last_error`/`email_sent_at`) lives on the row, mirroring `WaitlistEmailLog` instead of a separate audit-log table.
- `Assignment.required_for_certificate` — the generic capstone flag; no separate capstone concept modeled.
- `AssignmentGradeCreate` — optional `feedback` on the grade endpoint (previously accepted no body).
- Migrations: `eb0b6f06c6d3`, `5c4fe3ba3606`.

**Service layer** (`src/services/notifications/`)

- `notification_copy.py` — pure title/message builders per type, no DB/mocking needed to test.
- `notification_service.py` — create/push/query/read-state. In-app delivery reuses `ConnectionManager.send_personal_message()` — no new transport.
- `email_dispatch.py` — sweeps `PENDING` rows (`retry_count < 3`), isolates each send, flips to `FAILED_PERMANENT` after 3 attempts, never raises into the caller. Uses the real `send_email(to, subject, body)` (`services/email/utils.py`) — not the broken `services/emails` import chat's existing code uses.
- `fanout_jobs.py` — chapter/activity/org fan-out, per-user error isolation.
- `scheduling.py` — defensive one-off job enqueue against the app-wide scheduler; never raises if the scheduler isn't running.

**Jobs**: `jobs/notification_jobs.py` runs the email sweep on a worker thread (same pattern as `waitlist_processor.py`); registered in `app.py`'s existing global scheduler, every 5 min, no second scheduler instance.

**Trigger wiring** — every call site wrapped in try/except; a notification failure never turns a successful grade/publish/announcement into an error:

| Trigger              | Where                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Assignment graded    | `grade_assignment_submission()` — accepts feedback, re-checks certificate eligibility if the assignment is a capstone |
| Retake requested     | `reject_assignment_submission()`                                                                                      |
| New chapter/activity | `update_chapter()`/`update_activity()`, on the publish transition — enqueued, never inline                            |
| App update           | `create_announcement()` — live WS push only; no eager per-member rows                                                 |

**Certificate gate**: `has_ungraded_required_assignments()` in `certifications.py`, checked in `check_course_completion_and_create_certificate()`. Enforced at `CertificateUser` creation — the only safe point, since PDF generation is client-side and the verify endpoint has no RBAC.

**API** (`GET /notifications`, `GET /unread-count`, `POST /{id}/read`, `POST /read-all`, `DELETE /{id}`): no SSE, no preferences endpoints — both channels are always on, no per-user toggle in scope.

## Frontend (`apps/web`)

**New**: `types/notifications.ts`, `services/notifications/notificationAPI.ts`, `NotificationBell.tsx`, `ActivityNotificationToast.tsx`.

**Modified**:

- `GlobalChatContext.tsx` — second listener (`activity_notification`) on the _same_ WebSocket chat already owns; no new connection.
- `useNotifications.ts` / `utils/notification.ts` — `showActivityNotificationToast`, `getNotificationIcon`.
- `OrgMenu.tsx` — swapped in `NotificationBell`; deleted the now-unused `AnnouncementBell.tsx`.
- `EvaluateAssignment.tsx` / `services/courses/assignments.ts` — grading feedback textarea.
- `activity.tsx` — GRADED status banner now shows instructor feedback.
- `CertificatePage.tsx` — empty-state copy explains the capstone gate.
- `locales/en.json` — one new key; other locales fall back to English (`fallbackLng` already configured).

**`NotificationBell`**: merges `GET /notifications` + the existing `GET /announcements` client-side into one dropdown, one unread count. Announcements stay a separate backend — merging would mean eager per-member rows on every announcement, heavier than announcements' existing lazy read-tracking.

**Deliberate omission**: no click-to-navigate on notification items. None of the 5 types carry enough metadata (course_uuid, activity id) for a working deep link — a wrong link is worse than none. Matches `AnnouncementBell`'s existing mark-as-read-only behavior.

## Testing

**Backend**: 69 new tests in `apps/api/src/tests/notifications/` — copy templates, core service (incl. WS-push-failure isolation), email retry/give-up, fan-out per-user isolation, scheduling defensiveness, grading/rejection/publish/announcement trigger wiring, certificate gate. Full suite: 652 passed; the only failures are pre-existing Redis-connection errors unrelated to this change (confirmed by isolated run). `ruff check` clean.

**Frontend**: no test runner exists in this repo (Jest/RTL installed, never configured) — by explicit decision, no new test infra was added; code is structured for easy testing later (pure helpers, presentational/data separation). `tsc --noEmit`: 0 errors. `eslint`: clean on every touched file. Booted both dev servers live — API scheduler log confirmed the new job registered; the one runtime error hit (`course.whatsapp_group_link does not exist`) traced to pre-existing local-DB migration drift in unrelated course-listing code.

## Out of scope

- Deep-linking notification items (needs richer backend metadata).
- Consolidating chat's `ChatNotification` into the new `notification` table.
- Fixing chat's pre-existing broken `services/emails` import — found, not touched here.
