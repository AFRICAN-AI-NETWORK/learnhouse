# Quiz Auto-Grading Implementation Plan

## Background

LearnHouse has **two distinct quiz systems**:

| System               | Path                          | Storage                             | Scope                 |
| -------------------- | ----------------------------- | ----------------------------------- | --------------------- |
| **Assignment QUIZ**  | `AssignmentTaskTypeEnum.QUIZ` | `AssignmentTask.contents` (DB JSON) | Assignments dashboard |
| **Assignment FORM**  | `AssignmentTaskTypeEnum.FORM` | `AssignmentTask.contents` (DB JSON) | Assignments dashboard |
| **Editor blockQuiz** | TipTap `blockQuiz` node       | Activity JSON (lesson content)      | Embedded in lessons   |

Auto-grading for `CODE_EDITOR` tasks already exists. This plan extends it to **QUIZ** and **FORM** tasks and improves the **blockQuiz** per-question feedback.

---

## Design Decisions (User-Confirmed)

1. **QUIZ partial credit**: YES — per individual option match (current frontend formula)
2. **FORM matching**: Case-insensitive + comma-separated accepted answers (e.g. `"Paris,paris,PARIS"`)
3. **blockQuiz**: Path A — client-side only (no backend), improved per-question feedback UI
4. **Auto-finalize**: Works both ways — auto-GRADED when all tasks are auto-gradable; teacher can still manually re-grade
5. **Grade visibility**: Immediately after student submits (reload from server response)

---

## DRY Principles

- One `dispatch_auto_grading()` function routes to the right handler by type — no if/else chains at call sites.
- `_AUTO_GRADABLE_TYPES` frozenset is the single source of truth for which types get auto-graded.
- Grading logic lives **on the backend** — frontend only displays the result returned by the API.
- Frontend correctness display reuses existing grading-view badge components (same `bg-lime-200 text-lime-600` / `bg-rose-200/60 text-rose-500` pattern).

---

## Phase 1 — Backend (`apps/api/src/services/courses/activities/assignments.py`)

### 1a. `perform_quiz_auto_grading()`

```python
async def perform_quiz_auto_grading(assignment_task, submission):
    # For each question → for each option:
    #   student_answer == option.assigned_right_answer → correct
    # grade = round((correct_matches / total_options) * max_grade_value)
    # Store question_results in task_submission["grading_results"]
```

### 1b. `_is_form_answer_correct()` + `perform_form_auto_grading()`

```python
def _is_form_answer_correct(student: str, correct: str) -> bool:
    # Split correct by comma → accepted list, compare case-insensitive stripped

async def perform_form_auto_grading(assignment_task, submission):
    # For each question → for each blank:
    #   _is_form_answer_correct(student_answer, blank.correctAnswer) → correct
    # grade = round((correct_blanks / total_blanks) * max_grade_value)
```

### 1c. `_AUTO_GRADE_DISPATCH` + `dispatch_auto_grading()`

```python
_AUTO_GRADE_DISPATCH = {
    AssignmentTaskTypeEnum.CODE_EDITOR: perform_auto_grading,
    AssignmentTaskTypeEnum.QUIZ: perform_quiz_auto_grading,
    AssignmentTaskTypeEnum.FORM: perform_form_auto_grading,
}

_AUTO_GRADABLE_TYPES = frozenset({CODE_EDITOR, QUIZ, FORM})

async def dispatch_auto_grading(assignment_task, submission):
    handler = _AUTO_GRADE_DISPATCH.get(assignment_task.assignment_type)
    if handler:
        await handler(assignment_task, submission)
```

### 1d. Wire dispatcher in `handle_assignment_task_submission()`

Replace **both** `if assignment_task.assignment_type == "CODE_EDITOR":` blocks (update path + create path) with:

```python
try:
    await dispatch_auto_grading(assignment_task, assignment_task_submission)
except Exception as e:
    print(f"[AutoGrading] Failed, saving without grade: {e}")
```

### 1e. Extend auto-GRADED status in `create_assignment_submission()`

Replace `all_code_editor` check with `all_auto_gradable` using `_AUTO_GRADABLE_TYPES`:

```python
all_auto_gradable = all(task.assignment_type in _AUTO_GRADABLE_TYPES for task in tasks) if tasks else False
status = SUBMITTED
if all_auto_gradable and len(task_submissions) == len(tasks):
    status = GRADED
```

---

## Phase 2 — Frontend (TaskQuizObject + TaskFormObject)

### 2a. `TaskQuizObject.tsx`

**State addition:**

```tsx
const [hasSubmitted, setHasSubmitted] = useState(false);
```

**In `getAssignmentTaskSubmissionFromUserUI()`** (student initial load):

```tsx
setUserSubmissionObject(res.data);
setHasSubmitted(!!res.data.task_submission?.grading_results);
```

**In `submitFC()` success**:

```tsx
setHasSubmitted(true);
setUserSubmissionObject(res.data);
```

**In option render** — split student indicator by `hasSubmitted`:

- `!hasSubmitted` → show existing green/slate selection indicator (unchanged)
- `hasSubmitted` → show correctness badge: compare `(student?.answer ?? false) === option.assigned_right_answer` → `bg-lime-200 / bg-rose-200` with Correct/Wrong label

### 2b. `TaskFormObject.tsx`

Same `hasSubmitted` pattern. Add helper:

```tsx
const isFormAnswerCorrect = (student: string, correct: string) =>
  correct
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .includes(student.trim().toLowerCase());
```

**In student blank indicator** — split by `hasSubmitted`:

- `!hasSubmitted` → existing has-content green/slate indicator (unchanged)
- `hasSubmitted` → `isFormAnswerCorrect(answer, blank.correctAnswer)` → correctness badge

Also update **grading view** blank comparison to use `isFormAnswerCorrect()` (supports comma-separated).

---

## Phase 3 — Frontend (`AssignmentBoxUI.tsx`)

**Add grade badge in student view** when `currentPoints` is defined:

```tsx
{
  view === "student" &&
    currentPoints !== undefined &&
    currentPoints !== null && (
      <div className="flex space-x-2 items-center ... bg-emerald-200/20 text-emerald-600">
        <BookPlus size={12} />
        <p className="text-xs">
          {t("assignments.current_points", { points: currentPoints })}
        </p>
      </div>
    );
}
```

The Grade button in `grading` view remains unchanged (teachers can still manually re-grade).

---

## Phase 4 — Frontend (`QuizBlockComponent.tsx`)

**State addition:**

```tsx
const [questionResults, setQuestionResults] = React.useState<
  Record<string, boolean>
>({});
```

**Updated `handleUserSubmission()`**:

- Per-question: compute `questionCorrect` (same logic, per question)
- Set `questionResults` map `{ [question_id]: boolean }`
- Set `submissionMessage` as before

**Updated `refreshUserSubmission()`**: reset `questionResults` to `{}`

**In question header**: after question text, show per-question pass/fail badge when `submitted`:

```tsx
{
  submitted && (
    <div
      className={`text-xs px-2 py-0.5 rounded-md ${questionResults[question.question_id] ? "bg-lime-100 text-lime-700" : "bg-red-100 text-red-700"}`}
    >
      {questionResults[question.question_id] ? "✓ Correct" : "✗ Incorrect"}
    </div>
  );
}
```

---

## Data Flow Summary

```
Student submits → handleAssignmentTaskSubmission() → dispatch_auto_grading()
  → perform_quiz/form_auto_grading()
    → sets submission.grade + submission.task_submission["grading_results"]
  → returns AssignmentTaskSubmissionRead (includes grade + grading_results)

Frontend receives res.data → setUserSubmissionObject(res.data) → setHasSubmitted(true)
  → AssignmentBoxUI shows currentPoints badge
  → Option/blank rows show correctness indicators
```

---

## Files Changed

| File                                                                        | Change                                                                                |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `apps/api/src/services/courses/activities/assignments.py`                   | Add quiz/form graders, dispatcher, update both call sites, update GRADED status check |
| `apps/web/.../TaskTypes/TaskQuizObject.tsx`                                 | Add hasSubmitted, post-submit grade + per-option correctness                          |
| `apps/web/.../TaskTypes/TaskFormObject.tsx`                                 | Add hasSubmitted, post-submit grade + per-blank correctness                           |
| `apps/web/components/Objects/Activities/Assignment/AssignmentBoxUI.tsx`     | Add student grade badge                                                               |
| `apps/web/components/Objects/Editor/Extensions/Quiz/QuizBlockComponent.tsx` | Add per-question result tracking                                                      |
