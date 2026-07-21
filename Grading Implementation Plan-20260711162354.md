# Grading Implementation Plan

# LearnHouse — Course Grading & Certificate Grade Implementation Plan

## Executive Summary

This plan introduces a performance-based course grade computation system where a student's earned points on each gradeable activity (quiz, assignment, code, form) are scaled by their actual submission score, not just their completion status. The computed percentage grade is persisted on the certificate at issuance time and displayed on every certificate surface in the UI. All computation logic lives on the server; the client only renders what the server returns.

---

## Understanding the Current System (Baseline)

Before any change, the following facts are true about the codebase:

**Points allocation.**
Every `Activity` row (`apps/api/src/db/courses/activities.py`) has a `points: float` field
defaulting to 0. A business rule in `apps/api/src/services/courses/chapters.py` enforces that
all activities inside a single chapter must sum exactly to 100 points. A course with three
chapters therefore has a total of 300 possible points across all its activities.

**Assignment task grading.**
An `AssignmentTask` (`apps/api/src/db/courses/assignments.py`) has a `max_grade_value: int`
field (range 0–100) representing the maximum grade for that individual task. An assignment
can contain multiple tasks; their `max_grade_value` fields do not have to sum to 100 — that
is an assignment-internal constraint only. When a task submission is evaluated
(auto-graded for QUIZ, FORM, CODE_EDITOR types; manually graded for FILE_SUBMISSION and
OTHER types), the result is stored in `AssignmentTaskSubmission.grade` (0–100).
The aggregate assignment grade stored in `AssignmentUserSubmission.grade` is the sum of all
task submission grades.

**Trail step points — the gap.**
When an instructor calls `mark_activity_as_done_for_user()`
(`apps/api/src/services/courses/activities/assignments.py`, line 2309), the trail step is
updated with `trailstep.points_earned = activity.points or 0`. This is a flat, all-or-nothing
assignment. A student who scores 20% on a quiz still receives 100% of the activity's point
value when the instructor marks the activity done. The assignment grade and the activity
points are currently two disconnected systems.

**Late penalty.**
The function `get_activity_points_earned(activity, is_late)` in
`apps/api/src/services/trail/trail.py` (line 144) applies a 0.8 multiplier for late
completion. This multiplier must be preserved and applied on top of the performance-weighted
calculation introduced by this plan.

**Certificate — no grade field.**
`CertificateUser` (`apps/api/src/db/courses/certifications.py`, line 54) has no grade or
score field. `CertificateVerificationPage.tsx` and `UserCertificates.tsx` do not display any
grade. `CertificatePreview` does not accept a grade prop.

---

## Grade Computation Formula

The course grade for a student is defined as:

```plain
course_grade_percentage =
    (sum of points_earned across all TrailStep rows for this user in this course)
    ÷
    (sum of activity.points across all Activity rows in this course)
    × 100
```

**How points_earned is derived per activity type:**

For activities that have an associated assignment (types ASSIGNMENT, with tasks of type QUIZ,
FORM, CODE_EDITOR, FILE_SUBMISSION, or OTHER):

```plain
normalized_assignment_score = AssignmentUserSubmission.grade
                              ÷ sum(AssignmentTask.max_grade_value for all tasks)

<p><br/></p>

points_earned = normalized_assignment_score × activity.points
```

Then apply the late penalty on top:

```plain
if trail_step.is_late:
    points_earned = points_earned × 0.8
```

For activities that have no associated assignment (types VIDEO, DOCUMENT, DYNAMIC,
SMART_ARTICLE, LIVE_SESSION, ATTENDANCE, CUSTOM):

```plain
points_earned = activity.points   (if complete)
points_earned = 0                 (if not complete)

<p><br/></p>

if trail_step.is_late:
    points_earned = points_earned × 0.8
```

**Edge cases:**

- If `sum(task.max_grade_value)` is 0 for an assignment (all tasks have max_grade_value of

zero, which is the default), treat the assignment as completion-based and award full

`activity.points` on completion.

- If `activity.points` is 0 or null, the activity contributes nothing to numerator or

denominator and is excluded from the grade computation.

- If a course has no activities with points > 0, the grade cannot be computed. Store

`grade_percentage = None` on the certificate rather than a division-by-zero.

- If the student has never submitted the assignment (no `AssignmentUserSubmission` row

exists), `points_earned = 0` for that activity.

- Round the final `course_grade_percentage` to two decimal places before persistence.

---

## Layer 1 — Database Schema Changes

### 1.1 `apps/api/src/db/courses/certifications.py`

**`CertificateUser`** **table:**
Add one new column:

- `grade_percentage: Optional[float]` — the computed course grade at time of certificate

issuance. Nullable because courses with no graded activities cannot produce a numeric grade.

Store as a `FLOAT` column in PostgreSQL. Do not backfill existing rows; they remain NULL.

**`CertificateUserRead`** **schema:**
Add `grade_percentage: Optional[float]` to the read schema so the API response carries it.

**`CertificateUserUpdate`** **schema:**
Add `grade_percentage: Optional[float]` so the field can be set during issuance.

### 1.2 Alembic Migration

Create a new Alembic migration file in `apps/api/migrations/versions/` that:

- Adds the `grade_percentage FLOAT NULL` column to the `certificateuser` table.
- Includes a descriptive message such as "add grade_percentage to certificateuser".
- Does not backfill existing rows.
- Provides a proper `downgrade()` function that drops the column.

This migration must be the first file changed in any pull request implementing this plan,
because all service and router changes depend on the column existing.

### 1.3 `apps/api/src/db/trail_steps.py`

No schema change is needed here. The existing `points_earned: float` and `grade: str` fields are sufficient. The `grade` field (currently unused/empty string) will now store the normalized assignment score string (e.g., `"0.80"`) for gradeable activities so it is available for auditing without a join. Update the inline comment on line 45 ("note: prepare assignments support") to document the updated semantics.

---

## Layer 2 — New Grade Computation Service

### 2.1 `apps/api/src/services/courses/grade.py` (new file)

This file is the single source of truth for all grade computation. No other file should contain grade calculation logic — this is the DRY enforcement point.

**Function** **`compute_course_grade(user_id, course_id, db_session) -> GradeResult`**\*\*\*\***:**

Define a `GradeResult` dataclass (or Pydantic model) with these fields:

- `total_points_possible: float` — sum of `activity.points` for all activities in the course

where `activity.points > 0`

- `total_points_earned: float` — sum of effective `points_earned` for this user
- `grade_percentage: Optional[float]` — `(earned / possible) × 100`, rounded to 2 decimal

places; `None` if `total_points_possible == 0`

- `activity_breakdown: list[ActivityGradeDetail]` — per-activity detail for audit/display

Define `ActivityGradeDetail` with:

- `activity_id: int`
- `activity_name: str`
- `activity_type: str`
- `points_possible: float`
- `points_earned: float`
- `assignment_score: Optional[float]` — the raw normalized score (0.0–1.0) from the

assignment, or None for non-assignment activities

- `is_late: bool`
- `is_complete: bool`

**Internal logic of** **`compute_course_grade`**\*\*\*\***:**

Step 1. Query all `ChapterActivity` rows for the course, join to `Activity` to get `activity.points` and `activity.type`. Filter out activities where `activity.points` is null or 0. This gives the denominator.

Step 2. For each activity, query `TrailStep` for the given `user_id` and `activity_id`. If no trail step exists (user never enrolled in that activity), `points_earned = 0`.

Step 3. Determine whether the activity is assignment-backed by querying `Assignment` where `Assignment.activity_id = activity.id`. If no assignment exists, the activity is completion-based.

Step 4. For completion-based activities: `effective_points = activity.points if trail_step.complete else 0`. Apply late multiplier.

Step 5. For assignment-backed activities: query `AssignmentUserSubmission` for the user and assignment. If no submission exists, `effective_points = 0`. If a submission exists, compute `sum(task.max_grade_value)` for all tasks in the assignment. If this sum is 0, treat as completion-based. Otherwise compute `normalized_score = submission.grade / task_max_sum` and `effective_points = normalized_score × activity.points`. Apply late multiplier.

Step 6. Accumulate totals. Return `GradeResult`.

**Function** **`get_activity_weighted_points_earned(activity, trail_step, assignment, submission, task_max_sum) -> float`**\*\*\*\***:**

Extract the per-activity computation in Steps 4 and 5 above into this standalone helper. It is pure (no DB calls) and therefore easily unit-testable. This enforces DRY — both the batch course computation and the per-activity trail step update call this same function.

---

## Layer 3 — Update Trail Step Points Earned on Activity Completion

### 3.1 `apps/api/src/services/courses/activities/assignments.py`

**`mark_activity_as_done_for_user()`** **(line 2242):**

Replace the hard-coded `trailstep.points_earned = activity.points or 0` at line 2309 with a call to `compute_and_store_trail_step_grade(activity, trailstep, db_session)` imported from `apps/api/src/services/courses/grade.py`.

This single change makes every assignment-activity completion correctly weighted by the student's submission grade rather than awarding full points unconditionally.

**`_create_or_update_trail_step()`** **(the internal trail step creation path, ~line 1756):**

The same flat assignment at line 1756 (`points_earned=activity.points or 0`) and line 1765 must be updated the same way: call `get_activity_weighted_points_earned` with the current submission data (which may be None if the step is being pre-created before submission). When called before any submission exists, the function correctly returns 0. When the trail step is later updated after grading, `compute_and_store_trail_step_grade` is called again and the value is refreshed.

### 3.2 `apps/api/src/services/trail/trail.py`

**`get_activity_points_earned()`** **(line 144):**

This function currently receives only the `activity` and `is_late` and returns flat points. It is used by the non-assignment completion path (readable activities). Do not remove it — it remains the correct function for completion-based activities. Rename it `get_completion_based_points_earned` and update all call sites accordingly to make the distinction between the two paths explicit.

**`backfill_completed_trail_step_points()`** **(line 149):**

This backfill function only updates trail steps with `points_earned == 0` for completed
steps. Extend it to also handle gradeable activities: for each step where the activity has an
assignment and a finalized submission, call `compute_and_store_trail_step_grade`. This makes
the backfill command useful for existing data after the migration is deployed.

**\---**

**\## Layer 4 — Certificate Issuance with Grade**

**\### 4.1** **`apps/api/src/services/courses/certifications.py`**

**`check_course_completion_and_create_certificate()`** **(line 460):**

Between the completion check (line 483) and the `create_certificate_user()` call (line 501),
insert a call to `compute_course_grade(user_id, course_id, db_session)` from
`apps/api/src/services/courses/grade.py`. Pass the resulting `grade_percentage` (which may
be `None`) to `create_certificate_user()`.

**`create_certificate_user()`** **(wherever it is defined):**

Add `grade_percentage: Optional[float]` as a parameter. When creating the `CertificateUser`
row, populate `grade_percentage` from this parameter. This is the only place in the codebase
where `CertificateUser` rows are created, so the change is contained.

**`get_certificate_by_user_certification_uuid()`** **(line 515):**

This function assembles the certificate response object. Update the response to include
`grade_percentage` from `CertificateUser.grade_percentage`. The response schema passed to the
router must carry this field through.

**`get_all_certificates_for_user()`** **and** **`get_certificate_for_user_by_course()`** **(wherever these are defined):**

Both must include `grade_percentage` in their response payloads. No extra DB queries are
needed — the field is already on the `CertificateUser` row they fetch.

**\---**

**\## Layer 5 — New and Updated API Endpoints**

**\### 5.1** **`apps/api/src/routers/courses/certifications.py`**

**`GET /certificate/{user_certification_uuid}`** **(line 117):**

No new endpoint needed. Update the response model to include `grade_percentage`. The field
flows from the service change in Layer 4.1.

**`GET /user/course/{course_uuid}`** **(line 102):**

Same — update response model to include `grade_percentage`.

**`GET /user/all`** **(line 132):**

Same.

**\### 5.2** **`apps/api/src/routers/courses/`** **— New Grade Preview Endpoint**

Add `GET /courses/{course_uuid}/grade` in a logical location — either append to
`apps/api/src/routers/courses/courses.py` or create
`apps/api/src/routers/courses/grade.py` (preferred, keeps grade logic in its own router).

**Request:** Authenticated. The endpoint resolves `course_uuid` to a course, verifies the
requesting user is enrolled, and calls `compute_course_grade(current_user.id, [course.id](http://course.id), db_session)`.

**Response schema (\*\***`CourseGradeRead`\***\*):**

- `course_uuid: str`
- `total_points_possible: float`
- `total_points_earned: float`
- `grade_percentage: Optional[float]`
- `activity_breakdown: list[ActivityGradeDetail]`

This endpoint powers the grade progress display on the course page (Layer 6.3) and can be
used by instructors to preview a student's grade before final certificate issuance.

**\### 5.3** **`apps/api/src/routers/courses/grade.py`** **(new file, if created separately)**

Define the router, the `CourseGradeRead` and `ActivityGradeDetail` Pydantic response models,
and the single `GET /courses/{course_uuid}/grade` handler. Register this router in
`apps/api/src/router.py`.

**\### 5.4** **`apps/api/src/router.py`**

Register the new grade router if created as a separate file. No change needed otherwise.

**\---**

**\## Layer 6 — Frontend Changes**

All frontend changes are purely display. No grade calculation happens on the client.

**\### 6.1** **`apps/web/services/courses/certifications.ts`**

**`getCertificateByUuid()`**\*\*\*\***:**

Update the TypeScript return type to include `grade_percentage: number | null` on the
`certificate_user` object. No fetch logic changes — the field is now in the API response.

**`getCertificatesForUserByCourse()`** **and** **`getAllCertificatesForUser()`** **(wherever they exist):**

Same type update. Add `grade_percentage: number | null` to the response interface.

**\### 6.2** **`apps/web/components/Dashboard/Pages/Course/EditCourseCertification/CertificatePreview.tsx`**

This is the shared certificate rendering component used by both the verification page and the
admin preview. Add one optional prop: `gradePercentage?: number | null`.

When `gradePercentage` is a number (not null and not undefined), render a grade display
section on the certificate below the student name and above the awarded date. Format it as
`"Final Grade: 87.50%"`. When `gradePercentage` is null or undefined, render nothing — the
certificate looks identical to how it does today.

Do not change any existing props or conditional rendering logic. This is a purely additive
change.

**\### 6.3** **`apps/web/components/Pages/Certificate/CertificateVerificationPage.tsx`**

**Certificate Preview section (line 214):**

Pass `gradePercentage={certificateData.certificate_user.grade_percentage}` to
`CertificatePreview`. The prop is already optional so no default is needed.

**Certificate Information panel (right sidebar, line 380):**

After the "Awarded Date" block (line 435), add a conditional block: if
`certificateData.certificate_user.grade_percentage` is not null, render a "Final Grade" row
in the same `bg-gray-50 p-3 rounded-lg` style as the other fields. Display the value as
`"87.50%"` (two decimal places). If null, render nothing.

**\### 6.4** **`apps/web/components/Pages/Trail/UserCertificates.tsx`**

In the certificate list item, after the "Awarded Date" display, add a conditional inline
badge showing the grade. Use a neutral or green badge style consistent with the existing UI.
Only render if `grade_percentage` is not null.

**\### 6.5** **`apps/web/components/Pages/Certificate/CertificatePage.tsx`**

If this component renders the certificate in a separate page context (distinct from the
verification page), apply the same `gradePercentage` prop pass-through and sidebar display
as described in 6.3.

**\### 6.6 Grade Progress on Course Page (optional but recommended)**

In `apps/web/app/orgs/[orgslug]/(withmenu)/course/[courseuuid]/page.tsx` (or the course
client component), add a "My Grade" section for enrolled learners. Call
`GET /courses/{course_uuid}/grade` using SWR. Display:

- A progress bar showing `total_points_earned / total_points_possible`
- The percentage label: `"Current Grade: 72.30%"`
- A note: "Grade is updated each time an activity is marked complete."

This fetch is only made when the user is enrolled (i.e., `TrailRun` exists for this course).
Do not call it for anonymous users or non-enrolled users.

**\---**

**\## Layer 7 — Frontend Service for Grade Preview**

**\### 7.1** **`apps/web/services/courses/certifications.ts`** **— Grade Service Function**

Add a new exported function `getCourseGrade(courseUuid: string, session: Session)` that calls
`GET /api/v1/courses/{courseUuid}/grade` and returns the `CourseGradeRead` response. Define
the TypeScript interfaces for `CourseGradeRead` and `ActivityGradeDetail` in this file or in
a shared types file.

**\---**

**\## Layer 8 — Testing**

**\### 8.1** **`apps/api/src/tests/`** **— New Test File:** **`test_course_grade.py`**

**Test:** **`test_compute_course_grade_basic`**
Set up a course with two activities: one worth 60 points (with an assignment where
`sum(max_grade_value) = 100` and submission grade = 80), one worth 40 points (completion-based,
completed). Expected result: `points_earned = (80/100 × 60) + 40 = 48 + 40 = 88`, total
possible = 100, grade = 88.00%.

**Test:** **`test_compute_course_grade_late_penalty`**
Same setup but the 60-point assignment activity is marked late. Expected: `48 × 0.8 = 38.4`,
total earned = `38.4 + 40 = 78.4`, grade = 78.40%.

**Test:** **`test_compute_course_grade_no_submission`**
User has no submission for the assignment activity. Expected: `points_earned = 0 + 40 = 40`,
grade = 40.00%.

**Test:** **`test_compute_course_grade_zero_max_grade`**
Assignment tasks all have `max_grade_value = 0`. Expected: falls back to completion-based,
awards full 60 points, grade = 100.00%.

**Test:** **`test_compute_course_grade_no_points_activities`**
All activities have `points = 0`. Expected: `grade_percentage = None`.

**Test:** **`test_certificate_stores_grade`**
Complete all activities in a course, trigger certificate issuance, assert that the resulting
`CertificateUser.grade_percentage` is not null and equals the computed grade.

**Test:** **`test_grade_endpoint_authentication`**
Call `GET /courses/{uuid}/grade` without authentication. Assert 401.

**Test:** **`test_grade_endpoint_non_enrolled`**
Call `GET /courses/{uuid}/grade` as an authenticated user who is not enrolled in the course.
Assert 403 or 404 (match whatever RBAC behaviour the existing course endpoints use).

**Test:** **`test_get_activity_weighted_points_earned_pure`**
Test the pure helper function `get_activity_weighted_points_earned` directly with mock
objects. No DB calls. Verify all edge cases: null submission, zero max grade, late penalty,
normal weighted calculation. This is the fastest-running test suite entry.

**\### 8.2 Extend** **`apps/api/src/tests/assignments/test_quiz_auto_grading.py`**

Add integration tests that verify the full path: quiz auto-graded → assignment submission
grade set → `mark_activity_as_done_for_user` → `trail_step.points_earned` reflects weighted
grade, not flat points. This closes the loop between the existing auto-grading tests and the
new points computation.

**\---**

**\## Layer 9 — Migration Path for Existing Data**

After deploying the Alembic migration and the code changes:

1. All existing `CertificateUser` rows will have `grade_percentage = NULL`. This is

intentional. Backfilling historical grades is possible but not required for launch because

historical grades cannot be computed with certainty (submission data may have been modified

after certificate issuance).

2. Run the extended `backfill_completed_trail_step_points()` function (Layer 3.2) as a one-

time script to recompute `points_earned` for all existing trail steps. This refreshes the

accuracy of any future `compute_course_grade` calls for users who completed courses before

this change. It does not modify `CertificateUser.grade_percentage` for already-issued

certificates.

3. New certificate issuances after the deployment will carry the grade automatically.
4. If the team decides to backfill historical certificates, a separate one-time script should

query all `CertificateUser` rows where `grade_percentage IS NULL`, call

`compute_course_grade` for each, and update the row. This script must be run in a

maintenance window because it may produce many DB writes for large organisations.

**\---**

**\## Files Created (New)**

```plain
apps/api/src/services/courses/grade.py
apps/api/src/routers/courses/grade.py
apps/api/src/tests/test_course_grade.py
apps/api/migrations/versions/<timestamp>_add_grade_percentage_to_certificateuser.py
<p><br/></p>

**## Files Modified (Existing)**

<p><br/></p>
apps/api/src/db/courses/certifications.py
    — add grade_percentage field to CertificateUser, CertificateUserRead, CertificateUserUpdate

<p><br/></p>

apps/api/src/services/courses/certifications.py
    — update check_course_completion_and_create_certificate to compute and store grade
    — update create_certificate_user to accept and store grade_percentage
    — update all certificate read functions to return grade_percentage

<p><br/></p>

apps/api/src/services/courses/activities/assignments.py
    — update mark_activity_as_done_for_user to use weighted points (line 2309)
    — update _create_or_update_trail_step to use weighted points (lines 1756, 1765)

<p><br/></p>

apps/api/src/services/trail/trail.py
    — rename get_activity_points_earned to get_completion_based_points_earned
    — extend backfill_completed_trail_step_points to handle gradeable activities

<p><br/></p>

apps/api/src/routers/courses/certifications.py
    — update response models for all GET endpoints to include grade_percentage

<p><br/></p>

apps/api/src/router.py
    — register new grade router

<p><br/></p>

apps/api/src/tests/assignments/test_quiz_auto_grading.py
    — add end-to-end grade flow tests

<p><br/></p>

apps/web/services/courses/certifications.ts
    — add grade_percentage to all response type interfaces
    — add getCourseGrade() service function

<p><br/></p>

apps/web/components/Dashboard/Pages/Course/EditCourseCertification/CertificatePreview.tsx
    — add optional gradePercentage prop and conditional grade display

<p><br/></p>

apps/web/components/Pages/Certificate/CertificateVerificationPage.tsx
    — pass gradePercentage to CertificatePreview
    — add grade row to Certificate Information sidebar

<p><br/></p>

apps/web/components/Pages/Trail/UserCertificates.tsx
    — add conditional grade badge to certificate list items

<p><br/></p>

apps/web/components/Pages/Certificate/CertificatePage.tsx
    — apply same grade display as CertificateVerificationPage

<p><br/></p>

apps/web/app/orgs/[orgslug]/(withmenu)/course/[courseuuid]/page.tsx (or client component)
    — add My Grade section for enrolled learners
<p><br/></p>

**---**

<p><br/></p>

**## DRY Enforcement Summary**

<p><br/></p>

The single function `get_activity_weighted_points_earned` in
`apps/api/src/services/courses/grade.py` is the only place in the entire codebase that
contains the formula `normalized_score × activity.points × late_multiplier`. Every other path
that needs this value calls this function:

<p><br/></p>

- `compute_and_store_trail_step_grade` calls it when updating a trail step.
- `compute_course_grade` calls it for every activity when computing the course total.
- The backfill script calls it for historical data.
- Unit tests test it directly without any DB setup.

<p><br/></p>

The `compute_course_grade` function is the only place that sums per-activity earned points
into a course-level percentage. It is called:

<p><br/></p>

- From `check_course_completion_and_create_certificate` at certificate issuance.
- From `GET /courses/{course_uuid}/grade` for live grade preview.

<p><br/></p>

No grade percentage arithmetic appears anywhere else.

<p><br/></p>

**---**

<p><br/></p>

**## Security Considerations**

<p><br/></p>

- The `GET /courses/{course_uuid}/grade` endpoint must check that the requesting user is
  either the student themselves (seeing their own grade) or an org admin/instructor. A student
  must not be able to see another student's grade breakdown. Apply the same RBAC pattern used
  by the existing assignment submission endpoints.
- `grade_percentage` on `CertificateUser` is set only by the system at certificate issuance
  (triggered server-side by activity completion). There is no user-facing endpoint to set or
  override this value. Instructors cannot manually adjust the certificate grade; they must
  adjust the underlying assignment grades and the student must re-complete the course (or a
  separate admin-only endpoint can be added later to recompute and update a specific
  certificate's grade).
- The grade preview endpoint must not expose `activity_breakdown` entries for activities the
  requesting user does not have permission to view (relevant if some activities are restricted
  to specific user groups).

<p><br/></p>

**---**

<p><br/></p>

**## Phased Delivery**

<p><br/></p>

****Phase 1 — Data and computation (no UI change, no visible behaviour change to users):****
Deliver the Alembic migration, `grade.py` service, updated `trail.py` and
`assignments.py` points computation, and the updated certificate issuance service. All
new certificates issued after this deployment will carry a grade. Existing certificates
remain unchanged. Run the `backfill_completed_trail_step_points` script.

<p><br/></p>

****Phase 2 — API exposure:****
Deliver the new `GET /courses/{course_uuid}/grade` endpoint and the updated certificate read
endpoints that now return `grade_percentage`. Run the backend test suite.

<p><br/></p>

****Phase 3 — Frontend display:****
Deliver all frontend changes: `CertificatePreview` grade prop, verification page grade
display, user certificates grade badge, and the course page grade progress section.

<p><br/></p>
```
