# Implementation Plan v2: Continental Academic Calendar Epic

LearnHouse API (`apps/api`) — Academic Calendar, Weekly Operating Schedule, Programme Calendars, Student Journey, Rest-Day Enforcement

- Supersedes: `academic_calendar_implementation_plan.md` (v1)
- Audited against: branch `feat/alx-update`, Alembic head `cc19b07d83fa`
- Status: planning, no code changed

---

## 0. Decisions that shape this version

| #   | Decision                                                                                                                                                                                                                               | Source |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| D1  | Single organization. `org_id` columns stay (schema convention, cascades) but there is no cross-org logic, no per-org feature flags and no org-override machinery beyond "org default, optional course override" for the weekly rhythm. | CTO    |
| D2  | Time is always local, never UTC and never an "org timezone". Each item is judged in its own declared timezone; each student sees and is flagged in their own timezone.                                                                 | CTO    |
| D3  | Access is rights-based, not admin-only. Admin, Maintainer, Instructor and Students Mentor can work with every endpoint in this epic.                                                                                                   | CTO    |
| D4  | Draft items never count against a rest day. Only published items do.                                                                                                                                                                   | CTO    |
| D5  | No TODOs: the two open TODOs in the cohorts router are closed in Stage 0, and every open question from v1 is resolved in this document.                                                                                                | CTO    |
| D6  | One definition per concept: capstone, analytics, date parsing and authorization each have exactly one implementation, reused everywhere.                                                                                               | Review |
| D7  | Programme weeks belong to a course run (course + academic cohort), not to a course.                                                                                                                                                    | Review |

One consequence of D2 needs to be understood by everyone: a single instant cannot be "not Sunday" in every timezone on earth. So the hard block uses the item's own timezone, and students in other zones get an accurate local view with a rest-day flag. See section 7.

---

## 1. What exists today (verified in code)

| Concern                | Location                                                                                                    | Facts that matter                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intake cohorts         | `src/db/cohorts.py`, `src/services/cohorts/cohorts.py`, `src/routers/cohorts.py`, `src/jobs/cohort_jobs.py` | Org-wide intake batch, auto-incrementing `cohort_number`. `CohortEnrollment.is_locked` gates access and surfaces on `TrailRunRead`. Create and unlock endpoints have **no authorization** (two TODOs).                                                                                                                                                                             |
| Timetable and register | `src/db/courses/schedules.py`, `src/services/courses/schedules.py`, `src/routers/courses/schedules.py`      | `CourseTimetableEvent` has `starts_at`, `ends_at`, its own `timezone` (free string, unvalidated), `recurrence` (none/weekly/biweekly/monthly), `visibility` (draft/published), `status` (scheduled/cancelled). `_parse_datetime` converts to UTC. `_get_or_create_register_policy` is the lazy-default idiom. Writes use `courses_rbac_check(..., require_course_ownership=True)`. |
| Chapters               | `src/db/courses/chapters.py`, `src/services/courses/chapters.py`                                            | `Chapter.due_date` (ISO string, optional) and `Chapter.published`. Written in `create_chapter` and `update_chapter`. Read for lateness in `src/services/trail/trail.py` using `dateutil` parsing.                                                                                                                                                                                  |
| Assignments            | `src/db/courses/assignments.py`, `src/services/courses/activities/assignments.py`                           | `due_date` (required string), `published`, `required_for_certificate`. Written in `create_assignment` and `update_assignment`. Submission statuses: PENDING, SUBMITTED, GRADED, NEEDS_REVISION, LATE, NOT_SUBMITTED.                                                                                                                                                               |
| Capstone gate          | `src/services/courses/certifications.py`                                                                    | `has_ungraded_required_assignments(user_id, course_id, db)` already defines the capstone rule and gates certificate issuance.                                                                                                                                                                                                                                                      |
| Progress               | `src/db/trail_runs.py`, `trail_steps.py`, `trail_sessions.py`, `src/services/courses/grade.py`              | Per-activity completion, points, lateness, time spent; `compute_course_grade`.                                                                                                                                                                                                                                                                                                     |
| Staff analytics        | `src/routers/admin_analytics.py`, `src/services/admin_analytics/`                                           | `/admin/analytics/orgs/{org_id}/students...` with rights-based access via `verify_student_dashboard_access`.                                                                                                                                                                                                                                                                       |
| Authorization          | `src/security/rbac/rbac.py`, `src/db/roles.py`                                                              | `Rights` model with per-resource permissions. `authorization_verify_has_rights(user_id, [(resource, action)], db)` is the resource-free, rights-based check (admin and maintainer role ids bypass). Precedent for adding a resource: `announcements` (defaulted field + grant migration `3d709ae438f2`).                                                                           |
| Roles                  | `src/services/setup/setup.py`                                                                               | Global roles: admin, maintainer, instructor, user, partner, teaching_assistant, student_success_coordinator, student_mentor, community_manager, lead_instructor.                                                                                                                                                                                                                   |
| Users                  | `src/db/users.py`                                                                                           | No timezone column.                                                                                                                                                                                                                                                                                                                                                                |
| Organization           | `src/db/organizations.py`                                                                                   | No region or timezone column.                                                                                                                                                                                                                                                                                                                                                      |
| Migrations             | `migrations/versions/`, `migrations/env.py`                                                                 | Single head `cc19b07d83fa`. `env.py` walks `src/db` recursively, so new model files are discovered automatically. Enums are created as Postgres enums with `checkfirst`.                                                                                                                                                                                                           |
| Tests                  | `src/tests/`                                                                                                | In-memory SQLite with `StaticPool`, `SQLModel.metadata.create_all`, per-module or per-package `db` fixture. No tests for the schedules or cohorts services.                                                                                                                                                                                                                        |
| Checkpoint rule        | `.agents/AGENTS.md`                                                                                         | Update the stable-state checkpoint after each stabilized feature; `apps/mobile/docs/stable_state_checkpoint.md` or the equivalent root docs.                                                                                                                                                                                                                                       |

Out-of-scope TODOs that exist in the backend and are deliberately not touched by this epic: `src/routers/users.py` (2), `src/services/courses/activities/utils.py`, `src/services/users/usergroups.py`, `src/services/utils/upload_content.py`.

---

## 2. Architecture

Dependencies point one way: routers → services → rules and models. Rules never import FastAPI or a session.

```
routers/        HTTP only: parse input, call one service function, return its result
security/       who may do what (one guard module for this epic)
services/       orchestration: load rows, call rules, persist, raise HTTP errors
  .../rules     pure functions: dates, weekdays, recurrence, week generation, criteria
db/             SQLModel tables and request/response schemas
```

### 2.1 File map (new files only)

| Layer    | File                                      | Holds                                                                        |
| -------- | ----------------------------------------- | ---------------------------------------------------------------------------- |
| db       | `src/db/academic_calendar.py`             | `AcademicYear`, `AcademicCohort`, `CourseAcademicCohort` and their schemas   |
| db       | `src/db/courses/weekly_schedule.py`       | `WeeklyOperatingSchedule`, `WeeklyOperatingScheduleDay`, `LearningPhaseEnum` |
| db       | `src/db/courses/programme_weeks.py`       | `ProgrammeWeek`                                                              |
| db       | `src/db/student_journey.py`               | `StudentJourneyMilestone`, `UserMilestoneProgress`, enums                    |
| security | `src/security/calendar_security.py`       | the two guards in section 3                                                  |
| rules    | `src/services/utils/datetimes.py`         | shared parsing, timezone resolution, local weekday                           |
| rules    | `src/services/courses/rest_day_rules.py`  | pure rest-day and recurrence logic                                           |
| services | `src/services/academic_calendar.py`       | years, cohorts, course links                                                 |
| services | `src/services/courses/weekly_schedule.py` | default seeding, resolution, updates                                         |
| services | `src/services/courses/rest_days.py`       | `assert_publishable`, conflict report                                        |
| services | `src/services/courses/programme_weeks.py` | generation and mapping                                                       |
| services | `src/services/student_journey.py`         | definitions, evaluation, progress                                            |
| routers  | `src/routers/academic_calendar.py`        | years, cohorts                                                               |
| routers  | `src/routers/courses/calendar.py`         | weekly schedule, programme weeks, course-cohort links, conflicts             |
| routers  | `src/routers/student_journey.py`          | milestones and learner view                                                  |

Fifteen new files for five tickets. Existing files are extended in place where the concern already lives (schedules, chapters, assignments, cohorts router, admin analytics, roles, setup).

---

## 3. Authorization

### 3.1 New rights resource

Add to `Rights` in `src/db/roles.py`, defaulted exactly like `announcements` so stored role rows still deserialize:

```python
academic_calendar: Permission = Permission(
    action_create=False, action_read=True, action_update=False, action_delete=False
)
```

Grant migration (pattern: `3d709ae438f2`): full create/read/update/delete on `academic_calendar` for `role_global_admin`, `role_global_maintainer`, `role_global_instructor`, `role_global_student_mentor`. The same rights are added to the role seeds in `src/services/setup/setup.py` so fresh installs match.

In `setup.py` the Students Mentor role is built from the shared `_read_only_rights` object, so it must get its own copy with `academic_calendar` added; mutating the shared object would silently grant the right to every role that reuses it.

`role_global_lead_instructor` is granted the same rights, on the reading that "instructors" includes lead instructors. Remove that one line from the migration if that is not intended. Any other role can be given access later by editing its rights, with no code change.

### 3.2 Guards (`src/security/calendar_security.py`)

| Guard                                                                    | Passes when                                                                                   | Used by                                                                                                                     |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `require_calendar_right(user, action, db)`                               | authenticated and `authorization_verify_has_rights(user.id, [("academic_calendar", action)])` | org-level endpoints: years, cohorts, org weekly schedule, journey templates, intake cohort create/unlock                    |
| `require_course_calendar_access(request, course_uuid, user, action, db)` | the calendar right **or** the existing course-ownership check                                 | course-level endpoints: course weekly schedule, programme weeks, course-cohort links, milestone overrides, timetable writes |

Both raise 401 for anonymous users and 403 otherwise. Read endpoints for learners keep the existing `courses_rbac_check(..., "read")`.

### 3.3 Changes to existing authorization

- `src/routers/cohorts.py`: `POST /cohorts/` requires `require_calendar_right(..., "create")`; `POST /cohorts/{id}/unlock` requires `"update"`. Both TODO comments are removed. Today any logged-in user can unlock a cohort, so this is a security fix.
- `src/services/courses/schedules.py`: timetable create, update, delete and `_can_manage_schedule` switch to `require_course_calendar_access`. This widens timetable management from course owners to also include holders of the calendar right, which is what D3 asks for.
- Chapter and assignment services keep their current authorization; only the rest-day check is added to them.

---

## 4. Ticket 1: Academic calendar

### 4.1 Model (`src/db/academic_calendar.py`)

The existing `Cohort` keeps its intake-batch meaning and is not altered.

```python
class AcademicYear(AcademicYearBase, table=True):
    # Base: name, region (free text), start_date, end_date, is_active
    id, academic_year_uuid (unique, "academic_year_<uuid4>"), org_id, creation_date, update_date

class AcademicCohort(AcademicCohortBase, table=True):
    # Base: name, start_date, end_date, enrollment_window_start, enrollment_window_end, status
    id, academic_cohort_uuid (unique), academic_year_id (FK cascade), org_id, creation_date, update_date

class CourseAcademicCohort(SQLModel, table=True):   # one row = one course run
    __tablename__ = "course_academic_cohort"
    id, course_id (FK cascade), academic_cohort_id (FK cascade), org_id, creation_date
    UniqueConstraint(course_id, academic_cohort_id)
```

Changes from v1: `AcademicYear.timezone` is removed (D2); `AcademicCohort.cohort_number` is removed (it duplicated the intake cohort's numbering and had no uniqueness rule). `CourseRead` is **not** modified; cohorts are read through their own endpoint, so the nine places that build `CourseRead` are untouched.

### 4.2 Service (`src/services/academic_calendar.py`)

- Years: create, list, get active (first active, else latest by `start_date`), update. Validates `start_date < end_date` and rejects overlapping active years.
- Cohorts: create under a year, list by year, update. Validates dates fall inside the year and the enrollment window ends on or before `end_date`.
- Links: `set_course_cohorts(course_uuid, cohort_uuids)` with replace-set semantics, and `list_course_cohorts(course_uuid)`. Removing a link that still has programme weeks is rejected with 409 so a run's calendar is never deleted by accident.

### 4.3 API

```
POST /api/v1/academic-years                              calendar:create
GET  /api/v1/academic-years                              authenticated
GET  /api/v1/academic-years/active                       authenticated
PUT  /api/v1/academic-years/{academic_year_uuid}         calendar:update

POST /api/v1/academic-cohorts                            calendar:create
GET  /api/v1/academic-cohorts/year/{academic_year_uuid}  authenticated
PUT  /api/v1/academic-cohorts/{academic_cohort_uuid}     calendar:update

PUT  /api/v1/courses/{course_uuid}/academic-cohorts      course calendar access
GET  /api/v1/courses/{course_uuid}/academic-cohorts      course read
```

The org is resolved server-side (single org, D1), so clients never send `org_id`.

---

## 5. Ticket 2: Weekly operating schedule

### 5.1 Model (`src/db/courses/weekly_schedule.py`)

```python
class WeeklyOperatingSchedule(table=True):
    __tablename__ = "weekly_operating_schedule"
    id, schedule_uuid (unique), org_id
    course_id: int | None        # null = the org default
    name: str
    timezone: str                # IANA; fallback only, see 7.2
    rest_day_enforced: bool = True
    creation_date, update_date

class WeeklyOperatingScheduleDay(table=True):
    __tablename__ = "weekly_operating_schedule_day"
    id, schedule_id (FK cascade), weekday (0=Mon..6=Sun), phase: LearningPhaseEnum, is_rest_day: bool
    UniqueConstraint(schedule_id, weekday)
```

Uniqueness, enforced in the migration with partial unique indexes: one row where `course_id IS NULL`, and one row per `course_id`. v1's `is_default` column is dropped as redundant.

`is_rest_day` stays separate from `phase` so the label can change without changing the rule.

### 5.2 Service (`src/services/courses/weekly_schedule.py`)

- `get_or_create_default_schedule(db)`: Monday to Friday learn/practice/connect/apply/build, Saturday support, Sunday rest. Catches the unique-index violation and re-reads, so concurrent first requests cannot create two defaults.
- `resolve_schedule(course_id, db)`: course override if present, else the default. The only place fallback is decided.
- `upsert_schedule_days(schedule, days)`, `create_course_override`, `delete_course_override`.

### 5.3 API (`src/routers/courses/calendar.py`)

```
GET    /api/v1/courses/weekly-schedule                    default; authenticated
PUT    /api/v1/courses/weekly-schedule                    calendar:update
GET    /api/v1/courses/{course_uuid}/weekly-schedule      resolved; course read
PUT    /api/v1/courses/{course_uuid}/weekly-schedule      course calendar access
DELETE /api/v1/courses/{course_uuid}/weekly-schedule      course calendar access
```

The two static paths are registered before the `/{course_uuid}` routes, as `/timetable/me` already is in the schedules router.

---

## 6. Ticket 3: Programme calendars

### 6.1 Model

`src/db/courses/programme_weeks.py`:

```python
class ProgrammeWeek(table=True):
    __tablename__ = "programme_week"
    id, programme_week_uuid (unique), org_id
    course_academic_cohort_id (FK cascade)     # the course run
    course_id (FK cascade)                     # denormalized for direct course queries
    week_number: int                           # 1-indexed
    starts_on: str, ends_on: str               # local calendar dates, YYYY-MM-DD
    chapter_id: int | None (FK SET NULL)
    milestone_id: int | None (FK SET NULL)
    creation_date, update_date
    UniqueConstraint(course_academic_cohort_id, week_number)
```

Weeks are calendar dates, not instants, so they carry no timezone and mean the same day for every student.

`CourseTimetableEventBase` gains two optional fields, both nullable so existing rows and clients are unaffected:

```python
programme_week_id: int | None = None        # FK programme_week.id, SET NULL (declared on the table class)
weekly_schedule_phase: LearningPhaseEnum | None = None
```

The phase is stored on the event and does not change if the weekly rhythm is edited later. When the client omits it, the service fills it from the resolved schedule using the event's local weekday.

### 6.2 Service (`src/services/courses/programme_weeks.py`)

- `generate_programme_weeks(course_uuid, academic_cohort_uuid, number_of_weeks)`: starts from the cohort's `start_date`, creates contiguous seven-day weeks, maps week N to the Nth published chapter by `CourseChapter.order`. Idempotent: existing weeks are kept, missing ones are added.
- `update_programme_week(week_uuid, chapter_id?, milestone_id?)`: rejects a chapter or milestone from another course.
- Timetable create and update validate that `programme_week_id` belongs to the same course.

### 6.3 API

```
POST /api/v1/courses/{course_uuid}/programme-weeks/generate   course calendar access
GET  /api/v1/courses/{course_uuid}/programme-weeks?academic_cohort_uuid=   course read
PUT  /api/v1/courses/{course_uuid}/programme-weeks/{programme_week_uuid}   course calendar access
```

Existing timetable endpoints accept the two new optional fields. No new event endpoints.

---

## 7. Ticket 5: Rest days

### 7.1 What counts

An item counts against a rest day only while it is visible to students:

| Item                | Counts when                                         |
| ------------------- | --------------------------------------------------- |
| Timetable event     | `visibility == published` and `status == scheduled` |
| Chapter due date    | `published == True` and `due_date` is set           |
| Assignment due date | `published == True`                                 |

Drafts and cancelled events are never checked. The check runs when the resulting state is published **and** the date, recurrence, timezone or published state changed in this request. Editing the title of an already-published item never fails, so existing data is not disturbed on deploy.

### 7.2 Timezone rules (`src/services/utils/datetimes.py`)

| Function                                               | Behaviour                                                                                                                                                                                                             |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parse_instant(value)`                                 | The single ISO parser. Replaces `_parse_datetime` in the schedules service and the `dateutil` call in the trail service, so lateness and scheduling can never disagree. Keeps the offset; callers convert explicitly. |
| `resolve_zone(name)`                                   | Validates an IANA name with `zoneinfo`; raises 422 on write, returns `None` on read.                                                                                                                                  |
| `item_zone(event_timezone \| None, instant, schedule)` | Event: its own `timezone`. Due date: the offset written in the ISO string. Neither available: the resolved schedule's `timezone`.                                                                                     |
| `viewer_zone(request, item_zone)`                      | `X-Timezone` request header if valid, otherwise the item's zone.                                                                                                                                                      |
| `local_date(instant, zone)`                            | The calendar date and weekday of an instant in a zone.                                                                                                                                                                |

`tzdata` is added to `pyproject.toml` so zone data is present in slim containers and on Windows.

How D2 is honoured:

- **Hard block, item's own local time.** A Sunday 00:30 Lagos class is Sunday. It is not evaluated in UTC.
- **Student's local time on every read.** `GET /courses/timetable/me`, the course timetable and the programme-week list return `local_starts_at`, `local_weekday` and `on_rest_day` computed in the viewer's zone. A student in Nairobi sees a late-Saturday Lagos session as early Sunday, correctly flagged.
- **No UTC fallback anywhere** in this epic.

A student's zone is taken from the request header because no timezone is stored on users. Storing it is not required for this epic.

### 7.3 Rules (`src/services/courses/rest_day_rules.py`, pure)

```python
def occurrences(starts_at, ends_at, recurrence, until) -> Iterator[tuple[datetime, datetime]]
def local_dates_covered(start, end, zone) -> set[date]
def find_conflicts(spans, zone, rest_weekdays) -> list[date]
```

- An event conflicts if any part of it falls on a rest day, so a Saturday 22:00 to Sunday 01:00 session is caught.
- Weekly and biweekly recurrences keep their local weekday, so one occurrence is enough.
- Monthly recurrences are expanded up to the cohort's `end_date` (twelve months if the event has no programme week) and every occurrence is checked.

### 7.4 Service (`src/services/courses/rest_days.py`)

```python
def assert_publishable(spans, zone, course_id, db) -> None   # 422 listing the conflicting local dates
def list_rest_day_conflicts(course_id | None, db) -> list[RestDayConflict]
```

`assert_publishable` resolves the schedule once, returns immediately when `rest_day_enforced` is false, and otherwise calls the pure rules. It is the only enforcement function and is called from exactly four places:

| Call site   | Function                                                                                |
| ----------- | --------------------------------------------------------------------------------------- |
| Timetable   | `create_timetable_event`, `update_timetable_event` (`services/courses/schedules.py`)    |
| Chapters    | `create_chapter`, `update_chapter` (`services/courses/chapters.py`)                     |
| Assignments | `create_assignment`, `update_assignment` (`services/courses/activities/assignments.py`) |

Each caller passes the before and after state to a small helper, `needs_rest_day_check(before, after)`, which implements the "published and changed" rule in 7.1 once.

### 7.5 API

```
GET /api/v1/courses/rest-day/conflicts                calendar:read
GET /api/v1/courses/{course_uuid}/rest-day/conflicts  course calendar access
```

These list published items that already sit on a rest day, so staff can clean up pre-existing data at their own pace.

---

## 8. Ticket 4: Student journey

### 8.1 Model (`src/db/student_journey.py`)

```python
class MilestoneCriteriaEnum(StrEnum):
    manual, course_started, chapter_completed, course_grade_at_least,
    required_assignments_graded, certificate_issued

class StudentJourneyMilestone(table=True):
    __tablename__ = "student_journey_milestone"
    id, milestone_uuid (unique), org_id
    course_id: int | None                  # null = template copied to courses on seed
    phase: JourneyPhaseEnum                # onboarding, core_learning, capstone, alumni
    name, description, sequence_order
    criteria: MilestoneCriteriaEnum
    criteria_config: dict (JSON)           # e.g. {"threshold": 70} or {"chapter_id": 12}
    UniqueConstraint(course_id, sequence_order)

class UserMilestoneProgress(table=True):
    __tablename__ = "user_milestone_progress"
    id, user_id, milestone_id, org_id
    status: not_started | in_progress | achieved | at_risk
    achieved_at: str | None
    is_manual_override: bool = False
    notes: str | None
    UniqueConstraint(user_id, milestone_id)
```

### 8.2 Service (`src/services/student_journey.py`)

Each criterion maps to one evaluator that reads an existing signal and writes nothing to it:

| Criterion                     | Signal reused                                                            |
| ----------------------------- | ------------------------------------------------------------------------ |
| `course_started`              | a `TrailRun` exists for the user and course                              |
| `chapter_completed`           | every activity of the configured chapter has a complete `TrailStep`      |
| `course_grade_at_least`       | `compute_course_grade`                                                   |
| `required_assignments_graded` | `not has_ungraded_required_assignments(...)`, the existing capstone gate |
| `certificate_issued`          | a `CertificateUser` row for the course's certification                   |
| `manual`                      | staff only                                                               |

- `seed_course_journey(course_uuid)`: creates the default four-phase journey once (course started, grade threshold, capstone, certificate).
- `evaluate_progress(user_id, course_id)`: runs evaluators, upserts progress. Rows with `is_manual_override` are never overwritten. `at_risk` is set when a milestone is tied to a programme week whose `ends_on` has passed without achievement.
- `set_progress(...)`: the staff override.

Evaluation runs on read (learner view and staff analytics), so there are no hooks scattered through the trail, grading or certificate services, and nothing to keep in sync.

### 8.3 API

```
POST /api/v1/student-journey/course/{course_uuid}/seed          course calendar access
GET  /api/v1/student-journey/course/{course_uuid}/milestones    course read
PUT  /api/v1/student-journey/milestones/{milestone_uuid}        course calendar access
PUT  /api/v1/student-journey/milestones/{milestone_uuid}/progress/{user_id}   course calendar access
GET  /api/v1/student-journey/course/{course_uuid}/me            authenticated + course read
```

### 8.4 Staff analytics (existing module, extended)

No new analytics endpoints. `StudentCourseDetail` in `src/services/admin_analytics/schemas.py` gains two defaulted fields, filled by `get_student_course_detail`:

```python
milestones: list[StudentMilestoneStatus] = []
attendance: StudentAttendanceSummary | None = None   # counts of marked/late/missed/excused from CourseRegisterEntry
```

Access stays with `verify_student_dashboard_access`, which requires `dashboard.access` and `users.read`. Students Mentors hold neither today, so they can manage the calendar and milestones but will not see this staff analytics view. Granting them those two rights is a one-line addition to migration 1; it is left out by default because it also exposes student personal data. This is the "did you achieve the milestone, not just attend" view the ticket asks for, in the place staff already look.

---

## 9. Migrations

One linear chain from the current head. Each engineer rebases `down_revision` before merging, so no merge migrations are needed.

| Order | Migration                            | Contents                                                                           |
| ----- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| 1     | `grant_academic_calendar_rights`     | adds the `academic_calendar` rights to the five roles                              |
| 2     | `add_academic_calendar_tables`       | `academicyear`, `academiccohort`, `course_academic_cohort`                         |
| 3     | `add_weekly_operating_schedule`      | two tables, partial unique indexes, `learningphaseenum`                            |
| 4     | `add_student_journey`                | two tables and their enums                                                         |
| 5     | `add_programme_weeks_and_event_tags` | `programme_week` (with both foreign keys), two columns on `course_timetable_event` |

Journey now precedes programme weeks, so `programme_week.milestone_id` is a real foreign key from the start and v1's deferred-constraint migration disappears.

Conventions followed: Postgres enums created with `checkfirst`, enum member names lowercase and equal to their values (as in the schedules enums), every migration has a working `downgrade`.

---

## 10. Tests (written first)

| Package                                        | Covers                                                                                                                                                                                                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/tests/courses/test_schedules_baseline.py` | current timetable and register behaviour, written before any change                                                                                                                                                                                              |
| `src/tests/cohorts/test_cohorts_baseline.py`   | current intake-cohort behaviour, then the new 401/403 on create and unlock                                                                                                                                                                                       |
| `src/tests/security/test_calendar_security.py` | each of the five granted roles passes; user, partner and anonymous are refused; course owner passes the course guard without the right                                                                                                                           |
| `src/tests/utils/test_datetimes.py`            | parsing, zone resolution, Sunday 00:30 Lagos is Sunday, same instant is Saturday in UTC                                                                                                                                                                          |
| `src/tests/courses/test_rest_day_rules.py`     | pure rules: midnight-spanning events, weekly, biweekly, monthly expansion                                                                                                                                                                                        |
| `src/tests/courses/test_rest_days.py`          | draft passes, publish blocked, draft-to-published blocked, title-only edit of an existing published Sunday item passes, cancelled passes, course override changes the rest day, enforcement off passes; identical behaviour for events, chapters and assignments |
| `src/tests/academic_calendar/`                 | years, cohorts, link replace-set, unlink blocked while weeks exist                                                                                                                                                                                               |
| `src/tests/courses/test_weekly_schedule.py`    | idempotent default, override precedence, delete falls back                                                                                                                                                                                                       |
| `src/tests/courses/test_programme_weeks.py`    | per-run uniqueness, two cohorts of one course each get a week 1, chapter mapping, cross-course rejection, phase unchanged after rhythm edit                                                                                                                      |
| `src/tests/student_journey/`                   | each evaluator against its signal, manual override survives re-evaluation, learner sees only their own                                                                                                                                                           |
| `src/tests/admin_analytics/` (extended)        | milestones and attendance appear on the course detail                                                                                                                                                                                                            |

---

## 11. Build order

| Stage | Work                                                                                                                                                                           | Depends on          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| 0     | Baseline tests; shared `datetimes.py` and the switch of both existing parsers; `academic_calendar` right, grant migration, seeds; guards; cohort router TODOs closed; `tzdata` | none                |
| 1     | Weekly operating schedule                                                                                                                                                      | 0                   |
| 2     | Academic years, cohorts, course links                                                                                                                                          | 0 (parallel with 1) |
| 3     | Student journey and analytics extension                                                                                                                                        | 0                   |
| 4     | Programme weeks and timetable tags                                                                                                                                             | 1, 2, 3             |
| 5     | Rest-day enforcement and conflict report                                                                                                                                       | 1, 4                |

After each stage: tests green, then update the backend section of `docs/stable_state_checkpoint.md` at the repo root with the migrations applied and endpoints live. The root location follows the "equivalent root docs" clause of `.agents/AGENTS.md`, since this work is not in `apps/mobile`.

---

## 12. Mapping to the five tickets

| Ticket                               | Delivered by |
| ------------------------------------ | ------------ |
| 1. Continental academic calendar     | Section 4    |
| 2. Master weekly operating schedule  | Section 5    |
| 3. Timetables to programme calendars | Section 6    |
| 4. Student journey and milestones    | Section 8    |
| 5. Enforce rest days                 | Section 7    |

## 13. v1 open questions, closed

| v1 question                          | Resolution                                                     |
| ------------------------------------ | -------------------------------------------------------------- |
| Reuse or separate the `Cohort` table | Separate; `Cohort` keeps intake semantics                      |
| Region as enum or text               | Free text; a single org labels its own regions                 |
| One-off blackout dates               | Not built; the recurring weekday rule is the scope of ticket 5 |
| Where due dates are written          | Four functions, listed in 7.4                                  |
| Missing baseline tests               | Stage 0                                                        |
