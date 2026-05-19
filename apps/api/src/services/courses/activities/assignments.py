from datetime import datetime
from uuid import uuid4
from fastapi import HTTPException, Request, UploadFile
from sqlmodel import Session, select

from src.db.courses.activities import Activity
from src.db.courses.assignments import (
    Assignment,
    AssignmentCreate,
    AssignmentRead,
    AssignmentTask,
    AssignmentTaskCreate,
    AssignmentTaskRead,
    AssignmentTaskSubmission,
    AssignmentTaskSubmissionCreate,
    AssignmentTaskSubmissionRead,
    AssignmentTaskSubmissionUpdate,
    AssignmentTaskUpdate,
    AssignmentUpdate,
    AssignmentUserSubmission,
    AssignmentUserSubmissionCreate,
    AssignmentUserSubmissionRead,
    AssignmentUserSubmissionStatus,
    AssignmentTaskTypeEnum,
)
from src.db.courses.courses import Course
from src.db.organizations import Organization
from src.db.trail_runs import TrailRun
from src.db.trail_steps import TrailStep
from src.db.users import AnonymousUser, PublicUser, User
from src.security.features_utils.usage import (
    check_limits_with_usage,
    decrease_feature_usage,
    increase_feature_usage,
)
from src.security.rbac.rbac import (
    authorization_verify_based_on_roles,
)
from src.services.courses.activities.uploads.sub_file import upload_submission_file
from src.services.courses.activities.uploads.tasks_ref_files import (
    upload_reference_file,
)
from src.services.trail.trail import check_trail_presence
from src.services.courses.certifications import (
    check_course_completion_and_create_certificate,
)
from src.security.courses_security import courses_rbac_check_for_assignments
from src.services.code_execution import execute_and_grade


async def perform_auto_grading(
    assignment_task: AssignmentTask, submission: AssignmentTaskSubmission
):
    """
    Helper to run student code against test cases and calculate a grade.
    """
    # 1. Get exercises and submissions
    # assignment_task.contents = {"exercises": [...]}
    # submission.task_submission = {"submissions": [{"exerciseUUID": "...", "code": "..."}]}

    exercises = assignment_task.contents.get("exercises", [])
    student_subs = submission.task_submission.get("submissions", [])

    print(f"[AutoGrading] Exercises: {len(exercises)}")
    print(f"[AutoGrading] Student Subs: {len(student_subs)}")

    total_passed = 0
    total_tests = 0
    results_summary = []

    for exercise in exercises:
        ex_uuid = exercise.get("exerciseUUID")
        # Find matching student code
        sub = next((s for s in student_subs if s.get("exerciseUUID") == ex_uuid), None)
        print(f"[AutoGrading] Exercise {ex_uuid}: Found sub? {sub is not None}")
        if not sub:
            continue

        test_cases = exercise.get("testCases", [])
        if not test_cases:
            continue

        total_tests += len(test_cases)

        # Execute and grade
        dataset_files = exercise.get("datasetFiles", [])
        exec_res = await execute_and_grade(
            language=exercise.get("language", "python"),
            code=sub.get("code", ""),
            test_cases=test_cases,
            dataset_files=dataset_files,
        )

        if exec_res:
            total_passed += exec_res.passed_count
            results_summary.append(
                {
                    "exerciseUUID": ex_uuid,
                    "passed_count": exec_res.passed_count,
                    "total_count": exec_res.total_count,
                    "test_results": [
                        getattr(tr, "model_dump", tr.dict)()
                        for tr in exec_res.test_results
                    ]
                    if exec_res.test_results
                    else [],
                }
            )

    # Calculate Grade
    if total_tests > 0:
        # Scale passed tests to max_grade_value
        raw_grade = (total_passed / total_tests) * assignment_task.max_grade_value
        submission.grade = int(raw_grade)
    else:
        submission.grade = 0

    # Update task_submission with results (for student feedback)
    # Reassign the dictionary completely to ensure SQLAlchemy tracks the change
    updated_submission = dict(submission.task_submission)
    updated_submission["grading_results"] = results_summary
    submission.task_submission = updated_submission

    submission.task_submission_grade_feedback = (
        f"Auto-graded: {total_passed}/{total_tests} tests passed."
    )


async def perform_quiz_auto_grading(
    assignment_task: AssignmentTask, submission: AssignmentTaskSubmission
) -> None:
    """
    Auto-grade a QUIZ task.
    Only awards credit for correctly selected options (true positives).
    grade = round((correct_selections / total_correct_options) * max_grade_value)

    Wrong options that were not selected are intentionally ignored — they do NOT
    contribute to the score. This prevents students from earning points simply by
    submitting blank answers.

    Stores per-question results in task_submission["grading_results"].
    """
    questions = assignment_task.contents.get("questions", [])
    student_subs = submission.task_submission.get("submissions", [])

    total_correct_options = 0  # denominator: options where assigned_right_answer=True
    correct_selections = 0  # numerator: correct options the student actually selected
    question_results = []

    for question in questions:
        q_uuid = question.get("questionUUID")
        options = question.get("options", [])
        q_correct = 0
        q_total = 0  # correct options for this question

        for option in options:
            assigned_right = option.get("assigned_right_answer", False)
            opt_uuid = option.get("optionUUID")

            if not assigned_right:
                # Wrong option: no credit gained or lost — skip entirely.
                # Counting "correctly unselected" wrong options would let students
                # earn points without selecting any correct answers.
                continue

            q_total += 1
            total_correct_options += 1

            student_entry = next(
                (
                    s
                    for s in student_subs
                    if s.get("questionUUID") == q_uuid
                    and s.get("optionUUID") == opt_uuid
                ),
                None,
            )
            student_answer = (
                student_entry.get("answer", False) if student_entry else False
            )

            if student_answer:  # student explicitly selected this correct option
                correct_selections += 1
                q_correct += 1

        question_results.append(
            {"questionUUID": q_uuid, "correct": q_correct, "total": q_total}
        )

    submission.grade = (
        round(
            (correct_selections / total_correct_options)
            * assignment_task.max_grade_value
        )
        if total_correct_options > 0
        else 0
    )

    updated = dict(submission.task_submission)
    updated["grading_results"] = question_results
    submission.task_submission = updated

    submission.task_submission_grade_feedback = (
        f"Auto-graded: {correct_selections}/{total_correct_options} options correct."
    )


def _is_form_answer_correct(student_answer: str, correct_answer: str) -> bool:
    """
    Check if a student answer matches the correct answer.
    Supports comma-separated accepted answers (e.g. "Paris,paris,PARIS").
    Matching is case-insensitive with leading/trailing whitespace stripped.
    """
    student = student_answer.strip().lower()
    accepted = [a.strip().lower() for a in correct_answer.split(",") if a.strip()]
    return student in accepted if accepted else False


async def perform_form_auto_grading(
    assignment_task: AssignmentTask, submission: AssignmentTaskSubmission
) -> None:
    """
    Auto-grade a FORM (fill-in-the-blank) task.
    Supports comma-separated accepted answers in blank.correctAnswer field.
    grade = round((correct_blanks / total_blanks) * max_grade_value)
    Stores per-question results in task_submission["grading_results"].
    """
    questions = assignment_task.contents.get("questions", [])
    student_subs = submission.task_submission.get("submissions", [])

    total_blanks = 0
    correct_blanks = 0
    question_results = []

    for question in questions:
        q_uuid = question.get("questionUUID")
        blanks = question.get("blanks", [])
        q_correct = 0

        for blank in blanks:
            total_blanks += 1
            blank_uuid = blank.get("blankUUID")
            correct_answer = blank.get("correctAnswer", "")

            student_entry = next(
                (
                    s
                    for s in student_subs
                    if s.get("questionUUID") == q_uuid
                    and s.get("blankUUID") == blank_uuid
                ),
                None,
            )
            student_answer = student_entry.get("answer", "") if student_entry else ""

            if _is_form_answer_correct(student_answer, correct_answer):
                correct_blanks += 1
                q_correct += 1

        question_results.append(
            {"questionUUID": q_uuid, "correct": q_correct, "total": len(blanks)}
        )

    submission.grade = (
        round((correct_blanks / total_blanks) * assignment_task.max_grade_value)
        if total_blanks > 0
        else 0
    )

    updated = dict(submission.task_submission)
    updated["grading_results"] = question_results
    submission.task_submission = updated

    submission.task_submission_grade_feedback = (
        f"Auto-graded: {correct_blanks}/{total_blanks} blanks correct."
    )


# Dispatch table: maps AssignmentTaskTypeEnum → grading handler (single source of truth)
_AUTO_GRADE_DISPATCH = {
    AssignmentTaskTypeEnum.CODE_EDITOR: perform_auto_grading,
    AssignmentTaskTypeEnum.QUIZ: perform_quiz_auto_grading,
    AssignmentTaskTypeEnum.FORM: perform_form_auto_grading,
}

# Set of task types that support auto-grading (used for final submission status)
_AUTO_GRADABLE_TYPES = frozenset(
    {
        AssignmentTaskTypeEnum.CODE_EDITOR,
        AssignmentTaskTypeEnum.QUIZ,
        AssignmentTaskTypeEnum.FORM,
    }
)


async def dispatch_auto_grading(
    assignment_task: AssignmentTask, submission: AssignmentTaskSubmission
) -> None:
    """Route auto-grading to the correct handler based on task type. No-op for non-auto-gradable types."""
    handler = _AUTO_GRADE_DISPATCH.get(assignment_task.assignment_type)
    if handler:
        await handler(assignment_task, submission)


## > Assignments CRUD


async def create_assignment(
    request: Request,
    assignment_object: AssignmentCreate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if org exists
    statement = select(Course).where(Course.id == assignment_object.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "create", db_session
    )

    # Usage check
    check_limits_with_usage("assignments", course.org_id, db_session)

    # Create Assignment
    assignment = Assignment(**assignment_object.model_dump())

    assignment.assignment_uuid = str(f"assignment_{uuid4()}")
    assignment.creation_date = str(datetime.now())
    assignment.update_date = str(datetime.now())
    assignment.org_id = course.org_id

    # Insert Assignment in DB
    db_session.add(assignment)
    db_session.commit()
    db_session.refresh(assignment)

    # Feature usage
    increase_feature_usage("assignments", course.org_id, db_session)

    # return assignment read
    return AssignmentRead.model_validate(assignment)


async def read_assignment(
    request: Request,
    assignment_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment exists
    statement = select(Assignment).where(Assignment.assignment_uuid == assignment_uuid)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # return assignment read
    return AssignmentRead.model_validate(assignment)


async def read_assignment_from_activity_uuid(
    request: Request,
    activity_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if activity exists
    statement = select(Activity).where(Activity.activity_uuid == activity_uuid)
    activity = db_session.exec(statement).first()

    if not activity:
        raise HTTPException(
            status_code=404,
            detail="Activity not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == activity.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(Assignment.activity_id == activity.id)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # return assignment read
    return AssignmentRead.model_validate(assignment)


async def update_assignment(
    request: Request,
    assignment_uuid: str,
    assignment_object: AssignmentUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment exists
    statement = select(Assignment).where(Assignment.assignment_uuid == assignment_uuid)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "update", db_session
    )

    # Update only the fields that were passed in
    for var, value in vars(assignment_object).items():
        if value is not None:
            setattr(assignment, var, value)
    assignment.update_date = str(datetime.now())

    # Insert Assignment in DB
    db_session.add(assignment)
    db_session.commit()
    db_session.refresh(assignment)

    # return assignment read
    return AssignmentRead.model_validate(assignment)


async def delete_assignment(
    request: Request,
    assignment_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment exists
    statement = select(Assignment).where(Assignment.assignment_uuid == assignment_uuid)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "delete", db_session
    )

    # Feature usage
    decrease_feature_usage("assignments", course.org_id, db_session)

    # Delete Assignment
    db_session.delete(assignment)
    db_session.commit()

    return {"message": "Assignment deleted"}


async def delete_assignment_from_activity_uuid(
    request: Request,
    activity_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if activity exists
    statement = select(Activity).where(Activity.activity_uuid == activity_uuid)

    activity = db_session.exec(statement).first()

    if not activity:
        raise HTTPException(
            status_code=404,
            detail="Activity not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == activity.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(Assignment.activity_id == activity.id)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "delete", db_session
    )

    # Feature usage
    decrease_feature_usage("assignments", course.org_id, db_session)

    # Delete Assignment
    db_session.delete(assignment)

    db_session.commit()

    return {"message": "Assignment deleted"}


## > Assignments Tasks CRUD


async def create_assignment_task(
    request: Request,
    assignment_uuid: str,
    assignment_task_object: AssignmentTaskCreate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment exists
    statement = select(Assignment).where(Assignment.assignment_uuid == assignment_uuid)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "create", db_session
    )

    # Create Assignment Task
    assignment_task = AssignmentTask(**assignment_task_object.model_dump())

    assignment_task.assignment_task_uuid = str(f"assignmenttask_{uuid4()}")
    assignment_task.creation_date = str(datetime.now())
    assignment_task.update_date = str(datetime.now())
    assignment_task.org_id = course.org_id
    assignment_task.chapter_id = assignment.chapter_id
    assignment_task.activity_id = assignment.activity_id
    assignment_task.assignment_id = assignment.id  # type: ignore
    assignment_task.course_id = assignment.course_id

    # Insert Assignment Task in DB
    db_session.add(assignment_task)
    db_session.commit()
    db_session.refresh(assignment_task)

    # return assignment task read
    return AssignmentTaskRead.model_validate(assignment_task)


async def read_assignment_tasks(
    request: Request,
    assignment_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Find assignment
    statement = select(Assignment).where(Assignment.assignment_uuid == assignment_uuid)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # Find assignments tasks for an assignment
    statement = select(AssignmentTask).where(
        AssignmentTask.assignment_id == assignment.id
    )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # return assignment tasks read
    return [
        AssignmentTaskRead.model_validate(assignment_task)
        for assignment_task in db_session.exec(statement).all()
    ]


async def read_assignment_task(
    request: Request,
    assignment_task_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Find assignment
    statement = select(AssignmentTask).where(
        AssignmentTask.assignment_task_uuid == assignment_task_uuid
    )
    assignmenttask = db_session.exec(statement).first()

    if not assignmenttask:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(Assignment.id == assignmenttask.assignment_id)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # return assignment task read
    return AssignmentTaskRead.model_validate(assignmenttask)


async def put_assignment_task_reference_file(
    request: Request,
    db_session: Session,
    assignment_task_uuid: str,
    current_user: PublicUser | AnonymousUser,
    reference_file: UploadFile | None = None,
):
    # Check if assignment task exists
    statement = select(AssignmentTask).where(
        AssignmentTask.assignment_task_uuid == assignment_task_uuid
    )
    assignment_task = db_session.exec(statement).first()

    if not assignment_task:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(Assignment.id == assignment_task.assignment_id)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check for activity
    statement = select(Activity).where(Activity.id == assignment.activity_id)
    activity = db_session.exec(statement).first()

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # Get org uuid
    org_statement = select(Organization).where(Organization.id == course.org_id)
    org = db_session.exec(org_statement).first()

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "update", db_session
    )

    # Upload reference file
    if reference_file and reference_file.filename and activity and org:
        name_in_disk = (
            f"{assignment_task_uuid}{uuid4()}.{reference_file.filename.split('.')[-1]}"
        )
        await upload_reference_file(
            reference_file,
            name_in_disk,
            activity.activity_uuid,
            org.org_uuid,
            course.course_uuid,
            assignment.assignment_uuid,
            assignment_task_uuid,
        )
        # Update reference file
        assignment_task.reference_file = name_in_disk

    assignment_task.update_date = str(datetime.now())

    # Insert Assignment Task in DB
    db_session.add(assignment_task)
    db_session.commit()
    db_session.refresh(assignment_task)

    # return assignment task read
    return AssignmentTaskRead.model_validate(assignment_task)


async def put_assignment_task_submission_file(
    request: Request,
    db_session: Session,
    assignment_task_uuid: str,
    current_user: PublicUser | AnonymousUser,
    sub_file: UploadFile | None = None,
):
    # Check if assignment task exists
    statement = select(AssignmentTask).where(
        AssignmentTask.assignment_task_uuid == assignment_task_uuid
    )
    assignment_task = db_session.exec(statement).first()

    if not assignment_task:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(Assignment.id == assignment_task.assignment_id)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check for activity
    statement = select(Activity).where(Activity.id == assignment.activity_id)
    activity = db_session.exec(statement).first()

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # Get org uuid
    org_statement = select(Organization).where(Organization.id == course.org_id)
    org = db_session.exec(org_statement).first()

    # RBAC check - only need read permission to submit files
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # Check if user is enrolled in the course
    if not await authorization_verify_based_on_roles(
        request, current_user.id, "read", course.course_uuid, db_session
    ):
        raise HTTPException(
            status_code=403,
            detail="You must be enrolled in this course to submit files",
        )

    # Upload submission file
    if sub_file and sub_file.filename and activity and org:
        name_in_disk = f"{assignment_task_uuid}_sub_{current_user.email}_{uuid4()}.{sub_file.filename.split('.')[-1]}"
        await upload_submission_file(
            sub_file,
            name_in_disk,
            activity.activity_uuid,
            org.org_uuid,
            course.course_uuid,
            assignment.assignment_uuid,
            assignment_task_uuid,
        )

        # Persist the submission record at the same time so the "me" lookup
        # has a row to return even before the explicit submit action runs.
        statement = select(AssignmentTaskSubmission).where(
            AssignmentTaskSubmission.assignment_task_id == assignment_task.id,
            AssignmentTaskSubmission.user_id == current_user.id,
        )
        assignment_task_submission = db_session.exec(statement).first()

        current_time = str(datetime.now())
        if assignment_task_submission:
            updated_task_submission = dict(
                assignment_task_submission.task_submission or {}
            )
            updated_task_submission["fileUUID"] = name_in_disk

            assignment_task_submission.task_submission = updated_task_submission
            assignment_task_submission.grade = 0
            assignment_task_submission.task_submission_grade_feedback = ""
            assignment_task_submission.assignment_type = assignment_task.assignment_type
            assignment_task_submission.update_date = current_time
        else:
            assignment_task_submission = AssignmentTaskSubmission(
                assignment_task_submission_uuid=f"assignmenttasksubmission_{uuid4()}",
                task_submission={"fileUUID": name_in_disk},
                grade=0,
                task_submission_grade_feedback="",
                assignment_type=assignment_task.assignment_type,
                user_id=current_user.id,
                activity_id=assignment.activity_id,
                course_id=assignment.course_id,
                chapter_id=assignment.chapter_id,
                assignment_task_id=int(assignment_task.id),  # type: ignore
                creation_date=current_time,
                update_date=current_time,
            )

        db_session.add(assignment_task_submission)
        db_session.commit()
        db_session.refresh(assignment_task_submission)

        return AssignmentTaskSubmissionRead.model_validate(assignment_task_submission)


async def update_assignment_task(
    request: Request,
    assignment_task_uuid: str,
    assignment_task_object: AssignmentTaskUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment task exists
    statement = select(AssignmentTask).where(
        AssignmentTask.assignment_task_uuid == assignment_task_uuid
    )
    assignment_task = db_session.exec(statement).first()

    if not assignment_task:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(Assignment.id == assignment_task.assignment_id)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "update", db_session
    )

    # Update only the fields that were passed in
    for var, value in vars(assignment_task_object).items():
        if value is not None:
            setattr(assignment_task, var, value)
    assignment_task.update_date = str(datetime.now())

    # Insert Assignment Task in DB
    db_session.add(assignment_task)
    db_session.commit()
    db_session.refresh(assignment_task)

    # return assignment task read
    return AssignmentTaskRead.model_validate(assignment_task)


async def delete_assignment_task(
    request: Request,
    assignment_task_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment task exists
    statement = select(AssignmentTask).where(
        AssignmentTask.assignment_task_uuid == assignment_task_uuid
    )
    assignment_task = db_session.exec(statement).first()

    if not assignment_task:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(Assignment.id == assignment_task.assignment_id)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "delete", db_session
    )

    # Delete Assignment Task
    db_session.delete(assignment_task)
    db_session.commit()

    return {"message": "Assignment Task deleted"}


## > Assignments Tasks Submissions CRUD


async def handle_assignment_task_submission(
    request: Request,
    assignment_task_uuid: str,
    assignment_task_submission_object: AssignmentTaskSubmissionUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    assignment_task_submission_uuid = (
        assignment_task_submission_object.assignment_task_submission_uuid
    )
    # Check if assignment task exists
    statement = select(AssignmentTask).where(
        AssignmentTask.assignment_task_uuid == assignment_task_uuid
    )
    assignment_task = db_session.exec(statement).first()

    if not assignment_task:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(Assignment.id == assignment_task.assignment_id)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # SECURITY: Check if user has instructor/admin permissions for grading
    is_instructor = await authorization_verify_based_on_roles(
        request, current_user.id, "update", course.course_uuid, db_session
    )

    # For regular users, ensure they can only submit their own work
    if not is_instructor:
        # Check if user is enrolled in the course
        if not await authorization_verify_based_on_roles(
            request, current_user.id, "read", course.course_uuid, db_session
        ):
            raise HTTPException(
                status_code=403,
                detail="You must be enrolled in this course to submit assignments",
            )

        # SECURITY: Regular users cannot update grades - only check if actual values are being set
        if (
            assignment_task_submission_object.grade is not None
            and assignment_task_submission_object.grade != 0
        ) or (
            assignment_task_submission_object.task_submission_grade_feedback is not None
            and assignment_task_submission_object.task_submission_grade_feedback != ""
        ):
            raise HTTPException(
                status_code=403, detail="You do not have permission to update grades"
            )

        # Only need read permission for submissions
        await courses_rbac_check_for_assignments(
            request, course.course_uuid, current_user, "read", db_session
        )
    else:
        # SECURITY: Instructors/admins need update permission to grade
        await courses_rbac_check_for_assignments(
            request, course.course_uuid, current_user, "update", db_session
        )

    # Try to find existing submission by user_id and assignment_task_id first (for save progress functionality)
    statement = select(AssignmentTaskSubmission).where(
        AssignmentTaskSubmission.assignment_task_id == assignment_task.id,
        AssignmentTaskSubmission.user_id == current_user.id,
    )
    assignment_task_submission = db_session.exec(statement).first()

    # If no submission found by user+task, try to find by UUID if provided (for specific submission updates)
    if not assignment_task_submission and assignment_task_submission_uuid:
        statement = select(AssignmentTaskSubmission).where(
            AssignmentTaskSubmission.assignment_task_submission_uuid
            == assignment_task_submission_uuid
        )
        assignment_task_submission = db_session.exec(statement).first()

        # If submission exists, update it
    if assignment_task_submission:
        # SECURITY: For regular users, ensure they can only update their own submissions
        if not is_instructor and assignment_task_submission.user_id != current_user.id:
            raise HTTPException(
                status_code=403, detail="You can only update your own submissions"
            )

        # Update only the fields that were passed in
        for var, value in vars(assignment_task_submission_object).items():
            if value is not None:
                # Capture history for CODE_EDITOR tasks
                if (
                    var == "task_submission"
                    and assignment_task.assignment_type == "CODE_EDITOR"
                ):
                    # Get existing history
                    existing_history = (
                        assignment_task_submission.task_submission.get("history", [])
                        if assignment_task_submission.task_submission
                        else []
                    )

                    # Ensure value is a dict and has submissions
                    if isinstance(value, dict) and "submissions" in value:
                        # Append the new attempt with timestamp
                        attempt = {
                            "timestamp": str(datetime.now()),
                            "submissions": value.get("submissions", []),
                        }
                        existing_history.append(attempt)

                        # Keep only the last 30 attempts to avoid bloating the JSON
                        if len(existing_history) > 30:
                            existing_history = existing_history[-30:]

                        # Put history back into the new value Dictionary
                        value["history"] = existing_history

                setattr(assignment_task_submission, var, value)
        assignment_task_submission.update_date = str(datetime.now())

        # AUTO-GRADING: dispatch to the correct handler based on task type
        try:
            await dispatch_auto_grading(assignment_task, assignment_task_submission)
            if assignment_task_submission.grade:
                print(
                    f"[HandleSubmission] Auto-grading done. Task: {assignment_task.assignment_task_uuid}, Grade: {assignment_task_submission.grade}"
                )
        except Exception as e:
            print(
                f"[AutoGrading] Failed (update path), saving submission without grade: {e}"
            )

        # Insert Assignment Task Submission in DB
        db_session.add(assignment_task_submission)
        db_session.commit()
        db_session.refresh(assignment_task_submission)
    else:
        # Create new Task submission
        current_time = str(datetime.now())

        # Assuming model_dump() returns a dictionary
        model_data = assignment_task_submission_object.model_dump()

        task_submission_json = model_data.get("task_submission", {})

        # Initialize history for CODE_EDITOR tasks
        if assignment_task.assignment_type == "CODE_EDITOR":
            if (
                isinstance(task_submission_json, dict)
                and "submissions" in task_submission_json
            ):
                task_submission_json["history"] = [
                    {
                        "timestamp": current_time,
                        "submissions": task_submission_json.get("submissions", []),
                    }
                ]

        assignment_task_submission = AssignmentTaskSubmission(
            assignment_task_submission_uuid=assignment_task_submission_uuid
            or f"assignmenttasksubmission_{uuid4()}",
            task_submission=task_submission_json,
            grade=0,  # Always start with 0 for new submissions
            task_submission_grade_feedback="",  # Start with empty feedback
            assignment_task_id=int(assignment_task.id),  # type: ignore
            assignment_type=assignment_task.assignment_type,
            activity_id=assignment.activity_id,
            course_id=assignment.course_id,
            chapter_id=assignment.chapter_id,
            user_id=current_user.id,
            creation_date=current_time,
            update_date=current_time,
        )

        # AUTO-GRADING: dispatch to the correct handler based on task type
        try:
            await dispatch_auto_grading(assignment_task, assignment_task_submission)
        except Exception as e:
            print(
                f"[AutoGrading] Failed (create path), saving submission without grade: {e}"
            )

        # Insert Assignment Task Submission in DB
        db_session.add(assignment_task_submission)
        db_session.commit()
        db_session.refresh(assignment_task_submission)

    # return assignment task submission read
    return AssignmentTaskSubmissionRead.model_validate(assignment_task_submission)


async def read_user_assignment_task_submissions(
    request: Request,
    assignment_task_uuid: str,
    user_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment task exists
    statement = select(AssignmentTask).where(
        AssignmentTask.assignment_task_uuid == assignment_task_uuid
    )
    assignment_task = db_session.exec(statement).first()

    if not assignment_task:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task not found",
        )

    # Check if assignment task submission exists
    statement = select(AssignmentTaskSubmission).where(
        AssignmentTaskSubmission.assignment_task_id == assignment_task.id,
        AssignmentTaskSubmission.user_id == user_id,
    )
    assignment_task_submission = db_session.exec(statement).first()

    if not assignment_task_submission:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task Submission not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(Assignment.id == assignment_task.assignment_id)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # return assignment task submission read
    return AssignmentTaskSubmissionRead.model_validate(assignment_task_submission)


async def read_user_assignment_task_submissions_me(
    request: Request,
    assignment_task_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment task exists
    statement = select(AssignmentTask).where(
        AssignmentTask.assignment_task_uuid == assignment_task_uuid
    )
    assignment_task = db_session.exec(statement).first()

    if not assignment_task:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(Assignment.id == assignment_task.assignment_id)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # Check if assignment task submission exists
    statement = select(AssignmentTaskSubmission).where(
        AssignmentTaskSubmission.assignment_task_id == assignment_task.id,
        AssignmentTaskSubmission.user_id == current_user.id,
    )
    assignment_task_submission = db_session.exec(statement).first()

    if not assignment_task_submission:
        default_task_submission: dict = {"fileUUID": ""}
        if assignment_task.assignment_type == AssignmentTaskTypeEnum.CODE_EDITOR:
            default_task_submission = {"submissions": [], "history": []}
        elif assignment_task.assignment_type in (
            AssignmentTaskTypeEnum.QUIZ,
            AssignmentTaskTypeEnum.FORM,
        ):
            default_task_submission = {"submissions": []}

        return AssignmentTaskSubmissionRead.model_validate(
            {
                "id": 0,
                "assignment_task_submission_uuid": "",
                "task_submission": default_task_submission,
                "grade": 0,
                "task_submission_grade_feedback": "",
                "assignment_type": assignment_task.assignment_type,
                "user_id": current_user.id,
                "activity_id": assignment.activity_id,
                "course_id": assignment.course_id,
                "chapter_id": assignment.chapter_id,
                "assignment_task_id": assignment_task.id,
                "creation_date": "",
                "update_date": "",
            }
        )

    # return assignment task submission read
    return AssignmentTaskSubmissionRead.model_validate(assignment_task_submission)


async def read_assignment_task_submissions(
    request: Request,
    assignment_task_submission_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment task submission exists
    statement = select(AssignmentTaskSubmission).where(
        AssignmentTaskSubmission.assignment_task_submission_uuid
        == assignment_task_submission_uuid,
    )
    assignment_task_submission = db_session.exec(statement).first()

    if not assignment_task_submission:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task Submission not found",
        )

    # Check if assignment task exists
    statement = select(AssignmentTask).where(
        AssignmentTask.id == assignment_task_submission.assignment_task_id
    )
    assignment_task = db_session.exec(statement).first()

    if not assignment_task:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(Assignment.id == assignment_task.assignment_id)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # return assignment task submission read
    return AssignmentTaskSubmissionRead.model_validate(assignment_task_submission)


async def update_assignment_task_submission(
    request: Request,
    assignment_task_submission_uuid: str,
    assignment_task_submission_object: AssignmentTaskSubmissionCreate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment task submission exists
    statement = select(AssignmentTaskSubmission).where(
        AssignmentTaskSubmission.assignment_task_submission_uuid
        == assignment_task_submission_uuid
    )
    assignment_task_submission = db_session.exec(statement).first()

    if not assignment_task_submission:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task Submission not found",
        )

    # Check if assignment task exists
    statement = select(AssignmentTask).where(
        AssignmentTask.id == assignment_task_submission.assignment_task_id
    )
    assignment_task = db_session.exec(statement).first()

    if not assignment_task:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(Assignment.id == assignment_task.assignment_id)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # Update only the fields that were passed in
    for var, value in vars(assignment_task_submission_object).items():
        if value is not None:
            setattr(assignment_task_submission, var, value)
    assignment_task_submission.update_date = str(datetime.now())

    # Insert Assignment Task Submission in DB
    db_session.add(assignment_task_submission)
    db_session.commit()
    db_session.refresh(assignment_task_submission)

    # return assignment task submission read
    return AssignmentTaskSubmissionRead.model_validate(assignment_task_submission)


async def delete_assignment_task_submission(
    request: Request,
    assignment_task_submission_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment task submission exists
    statement = select(AssignmentTaskSubmission).where(
        AssignmentTaskSubmission.assignment_task_submission_uuid
        == assignment_task_submission_uuid
    )
    assignment_task_submission = db_session.exec(statement).first()

    if not assignment_task_submission:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task Submission not found",
        )

    # Check if assignment task exists
    statement = select(AssignmentTask).where(
        AssignmentTask.id == assignment_task_submission.assignment_task_id
    )
    assignment_task = db_session.exec(statement).first()

    if not assignment_task:
        raise HTTPException(
            status_code=404,
            detail="Assignment Task not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(Assignment.id == assignment_task.assignment_id)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "delete", db_session
    )

    # Delete Assignment Task Submission
    db_session.delete(assignment_task_submission)
    db_session.commit()

    return {"message": "Assignment Task Submission deleted"}


## > Assignments Submissions CRUD


async def create_assignment_submission(
    request: Request,
    assignment_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment exists
    statement = select(Assignment).where(Assignment.assignment_uuid == assignment_uuid)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if the submission has already been made
    statement = select(AssignmentUserSubmission).where(
        AssignmentUserSubmission.assignment_id == assignment.id,
        AssignmentUserSubmission.user_id == current_user.id,
    )

    assignment_user_submission = db_session.exec(statement).first()

    if assignment_user_submission:
        raise HTTPException(
            status_code=400,
            detail="Assignment User Submission already exists",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # Check if User already submitted the assignment
    statement = select(AssignmentUserSubmission).where(
        AssignmentUserSubmission.assignment_id == assignment.id,
        AssignmentUserSubmission.user_id == current_user.id,
    )
    assignment_user_submission = db_session.exec(statement).first()

    if assignment_user_submission:
        raise HTTPException(
            status_code=400,
            detail="Assignment User Submission already exists",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # Calculate grade and status based on task submissions
    statement = select(AssignmentTask).where(
        AssignmentTask.assignment_id == assignment.id
    )
    tasks = db_session.exec(statement).all()

    statement = select(AssignmentTaskSubmission).where(
        AssignmentTaskSubmission.user_id == current_user.id,
        AssignmentTaskSubmission.activity_id == assignment.activity_id,
    )
    task_submissions = db_session.exec(statement).all()

    total_grade = sum(sub.grade for sub in task_submissions)

    # Check if all tasks are auto-gradable (CODE_EDITOR, QUIZ, or FORM)
    all_auto_gradable = (
        all(task.assignment_type in _AUTO_GRADABLE_TYPES for task in tasks)
        if tasks
        else False
    )

    status = AssignmentUserSubmissionStatus.SUBMITTED
    if all_auto_gradable and len(task_submissions) == len(tasks):
        status = AssignmentUserSubmissionStatus.GRADED

    # Create Assignment User Submission
    assignment_user_submission = AssignmentUserSubmission(
        user_id=current_user.id,
        assignment_id=assignment.id,  # type: ignore
        grade=total_grade,
        assignmentusersubmission_uuid=str(f"assignmentusersubmission_{uuid4()}"),
        submission_status=status,
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )

    # Insert Assignment User Submission in DB
    db_session.add(assignment_user_submission)
    db_session.commit()

    # User
    statement = select(User).where(User.id == current_user.id)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # Activity
    statement = select(Activity).where(Activity.id == assignment.activity_id)
    activity = db_session.exec(statement).first()

    if not activity:
        raise HTTPException(
            status_code=404,
            detail="Activity not found",
        )

    # Add TrailStep
    trail = await check_trail_presence(
        org_id=course.org_id,
        user_id=user.id,  # type: ignore
        request=request,
        user=user,  # type: ignore
        db_session=db_session,
    )

    statement = select(TrailRun).where(
        TrailRun.trail_id == trail.id,
        TrailRun.course_id == course.id,
        TrailRun.user_id == user.id,
    )
    trailrun = db_session.exec(statement).first()

    if not trailrun:
        trailrun = TrailRun(
            trail_id=trail.id if trail.id is not None else 0,
            course_id=course.id if course.id is not None else 0,
            org_id=course.org_id,
            user_id=user.id,  # type: ignore
            creation_date=str(datetime.now()),
            update_date=str(datetime.now()),
        )
        db_session.add(trailrun)
        db_session.commit()
        db_session.refresh(trailrun)

    statement = select(TrailStep).where(
        TrailStep.trailrun_id == trailrun.id,
        TrailStep.activity_id == activity.id,
        TrailStep.user_id == user.id,
    )
    trailstep = db_session.exec(statement).first()

    if not trailstep:
        trailstep = TrailStep(
            trailrun_id=trailrun.id if trailrun.id is not None else 0,
            activity_id=activity.id if activity.id is not None else 0,
            course_id=course.id if course.id is not None else 0,
            trail_id=trail.id if trail.id is not None else 0,
            org_id=course.org_id,
            complete=True,
            teacher_verified=False,
            grade="",
            user_id=user.id,  # type: ignore
            creation_date=str(datetime.now()),
            update_date=str(datetime.now()),
        )
        db_session.add(trailstep)
        db_session.commit()
        db_session.refresh(trailstep)

    # Check if all activities in the course are completed and create certificate if so
    if course and course.id and user and user.id:
        await check_course_completion_and_create_certificate(
            request, user.id, course.id, db_session
        )

    # return assignment user submission read
    return AssignmentUserSubmissionRead.model_validate(assignment_user_submission)


async def read_assignment_submissions(
    request: Request,
    assignment_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Find assignment
    statement = select(Assignment).where(Assignment.assignment_uuid == assignment_uuid)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # Find assignments tasks for an assignment
    statement = select(AssignmentUserSubmission).where(
        AssignmentUserSubmission.assignment_id == assignment.id
    )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # return assignment tasks read
    return [
        AssignmentUserSubmissionRead.model_validate(assignment_user_submission)
        for assignment_user_submission in db_session.exec(statement).all()
    ]


async def read_user_assignment_submissions(
    request: Request,
    assignment_uuid: str,
    user_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Find assignment
    statement = select(Assignment).where(Assignment.assignment_uuid == assignment_uuid)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # Find assignments tasks for an assignment
    statement = select(AssignmentUserSubmission).where(
        AssignmentUserSubmission.assignment_id == assignment.id,
        AssignmentUserSubmission.user_id == user_id,
    )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # return assignment tasks read
    return [
        AssignmentUserSubmissionRead.model_validate(assignment_user_submission)
        for assignment_user_submission in db_session.exec(statement).all()
    ]


async def read_user_assignment_all_tasks_submissions_me(
    request: Request,
    assignment_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Find assignment
    statement = select(Assignment).where(Assignment.assignment_uuid == assignment_uuid)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # Find assignments tasks submissions for an assignment
    statement = select(AssignmentTaskSubmission).where(
        AssignmentTaskSubmission.activity_id == assignment.activity_id,
        AssignmentTaskSubmission.user_id == current_user.id,
    )

    return [
        AssignmentTaskSubmissionRead.model_validate(assignment_task_submission)
        for assignment_task_submission in db_session.exec(statement).all()
    ]


async def read_user_assignment_submissions_me(
    request: Request,
    assignment_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    return await read_user_assignment_submissions(
        request,
        assignment_uuid,
        current_user.id,
        current_user,
        db_session,
    )


async def update_assignment_submission(
    request: Request,
    user_id: str,
    assignment_user_submission_object: AssignmentUserSubmissionCreate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment user submission exists
    statement = select(AssignmentUserSubmission).where(
        AssignmentUserSubmission.user_id == user_id
    )
    assignment_user_submission = db_session.exec(statement).first()

    if not assignment_user_submission:
        raise HTTPException(
            status_code=404,
            detail="Assignment User Submission not found",
        )

    # Check if assignment exists
    statement = select(Assignment).where(
        Assignment.id == assignment_user_submission.assignment_id
    )
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # Update only the fields that were passed in
    for var, value in vars(assignment_user_submission_object).items():
        if value is not None:
            setattr(assignment_user_submission, var, value)
    assignment_user_submission.update_date = str(datetime.now())

    # Insert Assignment User Submission in DB
    db_session.add(assignment_user_submission)
    db_session.commit()
    db_session.refresh(assignment_user_submission)

    # return assignment user submission read
    return AssignmentUserSubmissionRead.model_validate(assignment_user_submission)


async def delete_assignment_submission(
    request: Request,
    user_id: str,
    assignment_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment exists
    statement = select(Assignment).where(Assignment.assignment_uuid == assignment_uuid)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if assignment user submission exists
    statement = select(AssignmentUserSubmission).where(
        AssignmentUserSubmission.user_id == user_id,
        AssignmentUserSubmission.assignment_id == assignment.id,
    )
    assignment_user_submission = db_session.exec(statement).first()

    if not assignment_user_submission:
        raise HTTPException(
            status_code=404,
            detail="Assignment User Submission not found",
        )

    # Check if course exists
    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "delete", db_session
    )

    # Delete Assignment User Submission
    db_session.delete(assignment_user_submission)
    db_session.commit()

    return {"message": "Assignment User Submission deleted"}


## > Assignments Submissions Grading
async def grade_assignment_submission(
    request: Request,
    user_id: str,
    assignment_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # SECURITY: This function should only be accessible by course owners or instructors
    # Check if assignment exists
    statement = select(Assignment).where(Assignment.assignment_uuid == assignment_uuid)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # SECURITY: Require course ownership or instructor role for grading
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "update", db_session
    )

    # Check if assignment user submission exists
    statement = select(AssignmentUserSubmission).where(
        AssignmentUserSubmission.user_id == user_id,
        AssignmentUserSubmission.assignment_id == assignment.id,
    )
    assignment_user_submission = db_session.exec(statement).first()

    if not assignment_user_submission:
        raise HTTPException(
            status_code=404,
            detail="Assignment User Submission not found",
        )

    # Get all the task submissions for the user
    task_subs = select(AssignmentTaskSubmission).where(
        AssignmentTaskSubmission.user_id == user_id,
        AssignmentTaskSubmission.activity_id == assignment.activity_id,
    )
    task_submissions = db_session.exec(task_subs).all()

    # Calculate the grade
    grade = 0
    for task_submission in task_submissions:
        grade += task_submission.grade

    # Update the assignment user submission
    assignment_user_submission.grade = grade

    # Insert Assignment User Submission in DB
    db_session.add(assignment_user_submission)
    db_session.commit()
    db_session.refresh(assignment_user_submission)

    # Change the status of the submission
    assignment_user_submission.submission_status = AssignmentUserSubmissionStatus.GRADED

    # Insert Assignment User Submission in DB
    db_session.add(assignment_user_submission)
    db_session.commit()
    db_session.refresh(assignment_user_submission)

    # return OK
    return {
        "message": "Assignment User Submission graded with the grade of " + str(grade)
    }


async def get_grade_assignment_submission(
    request: Request,
    user_id: str,
    assignment_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if assignment exists
    statement = select(Assignment).where(Assignment.assignment_uuid == assignment_uuid)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if assignment user submission exists
    statement = select(AssignmentUserSubmission).where(
        AssignmentUserSubmission.user_id == user_id,
        AssignmentUserSubmission.assignment_id == assignment.id,
    )
    assignment_user_submission = db_session.exec(statement).first()

    if not assignment_user_submission:
        raise HTTPException(
            status_code=404,
            detail="Assignment User Submission not found",
        )

    # Get the max grade value from the sum of every assignmenttask
    statement = select(AssignmentTask).where(
        AssignmentTask.assignment_id == assignment.id
    )
    assignment_tasks = db_session.exec(statement).all()
    max_grade = 0

    for task in assignment_tasks:
        max_grade += task.max_grade_value

    # Now get the grade from the user submission
    statement = select(AssignmentUserSubmission).where(
        AssignmentUserSubmission.user_id == user_id,
        AssignmentUserSubmission.assignment_id == assignment.id,
    )
    assignment_user_submission = db_session.exec(statement).first()

    if not assignment_user_submission:
        raise HTTPException(
            status_code=404,
            detail="Assignment User Submission not found",
        )

    # return the grade
    return {
        "grade": int(assignment_user_submission.grade),
        "max_grade": max_grade,
        "grading_type": assignment.grading_type,
    }


async def mark_activity_as_done_for_user(
    request: Request,
    user_id: str,
    assignment_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # SECURITY: This function should only be accessible by course owners or instructors
    # Get Assignment
    statement = select(Assignment).where(Assignment.assignment_uuid == assignment_uuid)
    assignment = db_session.exec(statement).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    # Check if activity exists
    statement = select(Activity).where(Activity.id == assignment.activity_id)
    activity = db_session.exec(statement).first()

    statement = select(Course).where(Course.id == assignment.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # SECURITY: Require course ownership or instructor role for marking activities as done
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "update", db_session
    )

    if not activity:
        raise HTTPException(
            status_code=404,
            detail="Activity not found",
        )

    # Check if user exists
    statement = select(User).where(User.id == user_id)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # Check if user is enrolled in the course
    trailsteps = select(TrailStep).where(
        TrailStep.activity_id == activity.id,
        TrailStep.user_id == user_id,
    )
    trailstep = db_session.exec(trailsteps).first()

    if not trailstep:
        raise HTTPException(
            status_code=404,
            detail="User not enrolled in the course",
        )

    # Mark activity as done
    trailstep.complete = True
    trailstep.update_date = str(datetime.now())

    # Insert TrailStep in DB
    db_session.add(trailstep)
    db_session.commit()
    db_session.refresh(trailstep)

    # Check if all activities in the course are completed and create certificate if so
    if course and course.id:
        await check_course_completion_and_create_certificate(
            request, int(user_id), course.id, db_session
        )

    # return OK
    return {"message": "Activity marked as done for user"}


async def get_assignments_from_course(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Find course
    statement = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    # Get Activities
    statement = select(Activity).where(Activity.course_id == course.id)
    activities = db_session.exec(statement).all()

    # Get Assignments
    assignments = []
    for activity in activities:
        statement = select(Assignment).where(Assignment.activity_id == activity.id)
        assignment = db_session.exec(statement).first()
        if assignment:
            assignments.append(assignment)

    # RBAC check
    await courses_rbac_check_for_assignments(
        request, course.course_uuid, current_user, "read", db_session
    )

    # return assignments read
    return [AssignmentRead.model_validate(assignment) for assignment in assignments]
