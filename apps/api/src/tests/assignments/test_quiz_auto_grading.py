"""
Comprehensive unit tests for the quiz/form auto-grading system.

Covers:
    _is_form_answer_correct()     — 12 cases  (pure sync helper)
    perform_quiz_auto_grading()   — 11 cases  (async)
    perform_form_auto_grading()   — 11 cases  (async)
    dispatch_auto_grading()       —  5 cases  (routing)
    _AUTO_GRADABLE_TYPES          —  6 cases  (membership / immutability)

All tests are self-contained; no database or network required.
"""

import pytest
from unittest.mock import AsyncMock, patch

from src.db.courses.assignments import AssignmentTaskTypeEnum
from src.services.courses.activities.assignments import (
    _AUTO_GRADABLE_TYPES,
    _AUTO_GRADE_DISPATCH,
    _is_form_answer_correct,
    dispatch_auto_grading,
    perform_form_auto_grading,
    perform_quiz_auto_grading,
)


# ─── Minimal stand-ins (no DB / SQLModel machinery needed) ───────────────────


class _Task:
    """Minimal substitute for AssignmentTask – only attributes the graders read."""

    def __init__(
        self,
        task_type: AssignmentTaskTypeEnum,
        contents: dict,
        max_grade_value: int = 100,
    ):
        self.assignment_type = task_type
        self.contents = contents
        self.max_grade_value = max_grade_value


class _Submission:
    """Minimal substitute for AssignmentTaskSubmission."""

    def __init__(self, task_submission: dict):
        self.task_submission = task_submission
        self.grade = 0
        self.task_submission_grade_feedback = ""


# ─── UUID constants (keep tests readable) ────────────────────────────────────

_Q1 = "question_q1"
_Q2 = "question_q2"
_OA = "option_a"  # assigned_right_answer = True
_OB = "option_b"  # assigned_right_answer = False
_OC = "option_c"  # assigned_right_answer = True  (used in multi-question tests)
_B1 = "blank_1"
_B2 = "blank_2"
_QF = "question_f1"


# ─── Factory helpers ─────────────────────────────────────────────────────────


def _quiz_task(q_uuid=_Q1, opts=None, max_grade=100) -> _Task:
    """Single-question QUIZ task; defaults to option_a=correct, option_b=wrong."""
    if opts is None:
        opts = [
            {"optionUUID": _OA, "text": "Paris", "assigned_right_answer": True},
            {"optionUUID": _OB, "text": "London", "assigned_right_answer": False},
        ]
    return _Task(
        AssignmentTaskTypeEnum.QUIZ,
        {"questions": [{"questionUUID": q_uuid, "options": opts}]},
        max_grade,
    )


def _form_task(q_uuid=_QF, blanks=None, max_grade=100) -> _Task:
    """Single-question FORM task; defaults to one blank with correctAnswer='Paris'."""
    if blanks is None:
        blanks = [
            {
                "blankUUID": _B1,
                "placeholder": "Capital of France",
                "correctAnswer": "Paris",
            },
        ]
    return _Task(
        AssignmentTaskTypeEnum.FORM,
        {"questions": [{"questionUUID": q_uuid, "blanks": blanks}]},
        max_grade,
    )


# ═════════════════════════════════════════════════════════════════════════════
# 1.  _is_form_answer_correct  (pure function — no async needed)
# ═════════════════════════════════════════════════════════════════════════════


class TestIsFormAnswerCorrect:
    """Tests for the comma-separated, case-insensitive blank-matching helper."""

    def test_exact_match(self):
        assert _is_form_answer_correct("Paris", "Paris") is True

    def test_case_insensitive_lower(self):
        assert _is_form_answer_correct("paris", "Paris") is True

    def test_case_insensitive_upper(self):
        assert _is_form_answer_correct("PARIS", "Paris") is True

    def test_leading_trailing_whitespace_stripped(self):
        assert _is_form_answer_correct("  Paris  ", "Paris") is True

    def test_comma_separated_first_option(self):
        assert _is_form_answer_correct("Paris", "Paris,Lyon,Marseille") is True

    def test_comma_separated_last_option(self):
        assert _is_form_answer_correct("marseille", "Paris,Lyon,Marseille") is True

    def test_comma_separated_whitespace_around_commas(self):
        assert _is_form_answer_correct("Lyon", "Paris , Lyon , Marseille") is True

    def test_comma_separated_case_insensitive(self):
        assert _is_form_answer_correct("BERLIN", "Paris,Berlin,Vienna") is True

    def test_wrong_answer_returns_false(self):
        assert _is_form_answer_correct("Berlin", "Paris") is False

    def test_empty_student_answer_returns_false(self):
        assert _is_form_answer_correct("", "Paris") is False

    def test_whitespace_only_student_answer_returns_false(self):
        assert _is_form_answer_correct("   ", "Paris") is False

    def test_empty_correct_answer_returns_false(self):
        """An empty correctAnswer means no valid alternatives → always False."""
        assert _is_form_answer_correct("Paris", "") is False

    def test_commas_with_only_spaces_returns_false(self):
        """' , , ' produces no stripped non-empty tokens → False."""
        assert _is_form_answer_correct("Paris", " , , ") is False


# ═════════════════════════════════════════════════════════════════════════════
# 2.  perform_quiz_auto_grading
# ═════════════════════════════════════════════════════════════════════════════


class TestPerformQuizAutoGrading:
    """Tests for per-question QUIZ auto-grading."""

    @pytest.mark.asyncio
    async def test_perfect_score_all_options_matched(self):
        """Student selects the only correct option (A=True). B is a wrong option and is
        unselected. 1/1 question correct → 100."""
        task = _quiz_task()
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _Q1, "optionUUID": _OA, "answer": True},
                    {"questionUUID": _Q1, "optionUUID": _OB, "answer": False},
                ]
            }
        )
        await perform_quiz_auto_grading(task, sub)
        assert sub.grade == 100

    @pytest.mark.asyncio
    async def test_zero_score_all_options_inverted(self):
        """Student selects a wrong answer instead of the correct one → 0."""
        task = _quiz_task()
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _Q1, "optionUUID": _OA, "answer": False},
                    {"questionUUID": _Q1, "optionUUID": _OB, "answer": True},
                ]
            }
        )
        await perform_quiz_auto_grading(task, sub)
        assert sub.grade == 0

    @pytest.mark.asyncio
    async def test_wrong_option_selected_with_correct_option_scores_zero(self):
        """
        A=True (correct option, student selected).
        B=True (wrong option, student selected).
        The selected set does not exactly match the correct set → 0.
        """
        task = _quiz_task()
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _Q1, "optionUUID": _OA, "answer": True},
                    {
                        "questionUUID": _Q1,
                        "optionUUID": _OB,
                        "answer": True,
                    },  # wrong option selected
                ]
            }
        )
        await perform_quiz_auto_grading(task, sub)
        assert sub.grade == 0

    @pytest.mark.asyncio
    async def test_unsubmitted_options_default_to_zero(self):
        """
        Missing submission entries default to answer=False.
        A: assigned=True, student=False → correct option not selected → 0.
        B: assigned=False → wrong option, not selected.

        This was the root bug: the old code gave 50 here because it counted
        B's non-selection as a 'correct match' (False == False).
        """
        task = _quiz_task()
        sub = _Submission({"submissions": []})
        await perform_quiz_auto_grading(task, sub)
        assert sub.grade == 0

    @pytest.mark.asyncio
    async def test_grade_scales_with_max_grade_value(self):
        """max_grade_value=50, perfect score → grade=50 not 100."""
        task = _quiz_task(max_grade=50)
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _Q1, "optionUUID": _OA, "answer": True},
                    {"questionUUID": _Q1, "optionUUID": _OB, "answer": False},
                ]
            }
        )
        await perform_quiz_auto_grading(task, sub)
        assert sub.grade == 50

    @pytest.mark.asyncio
    async def test_empty_quiz_gives_zero(self):
        """No questions → division-by-zero guarded; grade stays 0."""
        task = _Task(AssignmentTaskTypeEnum.QUIZ, {"questions": []}, 100)
        sub = _Submission({"submissions": []})
        await perform_quiz_auto_grading(task, sub)
        assert sub.grade == 0

    @pytest.mark.asyncio
    async def test_grading_results_written_back(self):
        """task_submission["grading_results"] is populated after grading.
        total reflects one gradable question."""
        task = _quiz_task()
        sub = _Submission({"submissions": []})
        await perform_quiz_auto_grading(task, sub)

        assert "grading_results" in sub.task_submission
        results = sub.task_submission["grading_results"]
        assert len(results) == 1
        assert results[0]["questionUUID"] == _Q1
        assert results[0]["total"] == 1

    @pytest.mark.asyncio
    async def test_grading_results_correct_count_per_question(self):
        """grading_results[0] reflects whether the question was answered correctly."""
        task = _quiz_task()
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _Q1, "optionUUID": _OA, "answer": True},
                    {"questionUUID": _Q1, "optionUUID": _OB, "answer": False},
                ]
            }
        )
        await perform_quiz_auto_grading(task, sub)
        r = sub.task_submission["grading_results"][0]
        assert r["correct"] == 1
        assert r["total"] == 1

    @pytest.mark.asyncio
    async def test_multi_question_partial_credit(self):
        """
        Q1: A(correct), B(wrong). Student: A=True, B=False.
          → selected option set matches the correct option set.
        Q2: C(correct). Student: C=False (not selected).
          → selected option set does not match.
        Total correct questions = 1/2 → 50.
        """
        task = _Task(
            AssignmentTaskTypeEnum.QUIZ,
            {
                "questions": [
                    {
                        "questionUUID": _Q1,
                        "options": [
                            {"optionUUID": _OA, "assigned_right_answer": True},
                            {"optionUUID": _OB, "assigned_right_answer": False},
                        ],
                    },
                    {
                        "questionUUID": _Q2,
                        "options": [
                            {"optionUUID": _OC, "assigned_right_answer": True},
                        ],
                    },
                ]
            },
            100,
        )
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _Q1, "optionUUID": _OA, "answer": True},
                    {"questionUUID": _Q1, "optionUUID": _OB, "answer": False},
                    {
                        "questionUUID": _Q2,
                        "optionUUID": _OC,
                        "answer": False,
                    },  # missed correct option
                ]
            }
        )
        await perform_quiz_auto_grading(task, sub)
        assert sub.grade == 50
        results = sub.task_submission["grading_results"]
        assert results[0]["correct"] == 1
        assert results[0]["total"] == 1
        assert results[1]["correct"] == 0  # C not selected
        assert results[1]["total"] == 1

    @pytest.mark.asyncio
    async def test_feedback_string_format(self):
        """Feedback starts with 'Auto-graded:' and contains 'questions correct'."""
        task = _quiz_task()
        sub = _Submission({"submissions": []})
        await perform_quiz_auto_grading(task, sub)
        assert sub.task_submission_grade_feedback.startswith("Auto-graded:")
        assert "questions correct" in sub.task_submission_grade_feedback

    @pytest.mark.asyncio
    async def test_pre_existing_submission_fields_preserved(self):
        """Fields already present in task_submission survive the grading write-back."""
        task = _quiz_task()
        sub = _Submission({"submissions": [], "custom_key": "kept"})
        await perform_quiz_auto_grading(task, sub)
        assert sub.task_submission.get("custom_key") == "kept"


# ═════════════════════════════════════════════════════════════════════════════
# 3.  perform_form_auto_grading
# ═════════════════════════════════════════════════════════════════════════════


class TestPerformFormAutoGrading:
    """Tests for per-blank FORM (fill-in-the-blank) auto-grading."""

    @pytest.mark.asyncio
    async def test_perfect_score_exact_match(self):
        task = _form_task()
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _QF, "blankUUID": _B1, "answer": "Paris"}
                ]
            }
        )
        await perform_form_auto_grading(task, sub)
        assert sub.grade == 100

    @pytest.mark.asyncio
    async def test_case_insensitive_match(self):
        task = _form_task()
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _QF, "blankUUID": _B1, "answer": "paris"}
                ]
            }
        )
        await perform_form_auto_grading(task, sub)
        assert sub.grade == 100

    @pytest.mark.asyncio
    async def test_wrong_answer_zero_score(self):
        task = _form_task()
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _QF, "blankUUID": _B1, "answer": "Berlin"}
                ]
            }
        )
        await perform_form_auto_grading(task, sub)
        assert sub.grade == 0

    @pytest.mark.asyncio
    async def test_comma_separated_accepted_answers(self):
        """Second accepted answer is used; correctAnswer='Paris,Pairs' → 'Pairs' matches."""
        task = _form_task(
            blanks=[
                {"blankUUID": _B1, "placeholder": "", "correctAnswer": "Paris,Pairs"}
            ]
        )
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _QF, "blankUUID": _B1, "answer": "Pairs"}
                ]
            }
        )
        await perform_form_auto_grading(task, sub)
        assert sub.grade == 100

    @pytest.mark.asyncio
    async def test_missing_submission_defaults_to_empty_wrong(self):
        """No submission for a blank → treated as '' → wrong."""
        task = _form_task()
        sub = _Submission({"submissions": []})
        await perform_form_auto_grading(task, sub)
        assert sub.grade == 0

    @pytest.mark.asyncio
    async def test_partial_credit_two_blanks(self):
        """Two blanks; student gets first correct, second wrong → 1/2 → 50."""
        task = _form_task(
            blanks=[
                {"blankUUID": _B1, "placeholder": "", "correctAnswer": "Paris"},
                {"blankUUID": _B2, "placeholder": "", "correctAnswer": "France"},
            ]
        )
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _QF, "blankUUID": _B1, "answer": "Paris"},
                    {"questionUUID": _QF, "blankUUID": _B2, "answer": "Germany"},
                ]
            }
        )
        await perform_form_auto_grading(task, sub)
        assert sub.grade == 50

    @pytest.mark.asyncio
    async def test_empty_form_gives_zero(self):
        """No questions → division-by-zero guarded; grade stays 0."""
        task = _Task(AssignmentTaskTypeEnum.FORM, {"questions": []}, 100)
        sub = _Submission({"submissions": []})
        await perform_form_auto_grading(task, sub)
        assert sub.grade == 0

    @pytest.mark.asyncio
    async def test_grading_results_written_back(self):
        task = _form_task()
        sub = _Submission({"submissions": []})
        await perform_form_auto_grading(task, sub)
        assert "grading_results" in sub.task_submission
        r = sub.task_submission["grading_results"][0]
        assert r["total"] == 1
        assert r["correct"] == 0

    @pytest.mark.asyncio
    async def test_grading_results_correct_count_on_pass(self):
        task = _form_task()
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _QF, "blankUUID": _B1, "answer": "Paris"}
                ]
            }
        )
        await perform_form_auto_grading(task, sub)
        r = sub.task_submission["grading_results"][0]
        assert r["correct"] == 1
        assert r["total"] == 1

    @pytest.mark.asyncio
    async def test_grade_scales_with_max_grade_value(self):
        task = _form_task(max_grade=60)
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _QF, "blankUUID": _B1, "answer": "Paris"}
                ]
            }
        )
        await perform_form_auto_grading(task, sub)
        assert sub.grade == 60

    @pytest.mark.asyncio
    async def test_feedback_string_format(self):
        task = _form_task()
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _QF, "blankUUID": _B1, "answer": "Paris"}
                ]
            }
        )
        await perform_form_auto_grading(task, sub)
        assert sub.task_submission_grade_feedback.startswith("Auto-graded:")
        assert "blanks correct" in sub.task_submission_grade_feedback

    @pytest.mark.asyncio
    async def test_pre_existing_submission_fields_preserved(self):
        task = _form_task()
        sub = _Submission({"submissions": [], "meta": "keep"})
        await perform_form_auto_grading(task, sub)
        assert sub.task_submission.get("meta") == "keep"


# ═════════════════════════════════════════════════════════════════════════════
# 4.  dispatch_auto_grading
# ═════════════════════════════════════════════════════════════════════════════


class TestDispatchAutoGrading:
    """Tests that dispatch_auto_grading routes to the correct handler per task type."""

    @pytest.mark.asyncio
    async def test_quiz_task_is_graded(self):
        """QUIZ task gets graded end-to-end through the dispatcher."""
        task = _quiz_task()
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _Q1, "optionUUID": _OA, "answer": True},
                    {"questionUUID": _Q1, "optionUUID": _OB, "answer": False},
                ]
            }
        )
        await dispatch_auto_grading(task, sub)
        assert sub.grade == 100

    @pytest.mark.asyncio
    async def test_form_task_is_graded(self):
        """FORM task gets graded end-to-end through the dispatcher."""
        task = _form_task()
        sub = _Submission(
            {
                "submissions": [
                    {"questionUUID": _QF, "blankUUID": _B1, "answer": "Paris"}
                ]
            }
        )
        await dispatch_auto_grading(task, sub)
        assert sub.grade == 100

    @pytest.mark.asyncio
    async def test_code_editor_routes_to_perform_auto_grading(self):
        """
        CODE_EDITOR dispatches to perform_auto_grading.
        We patch the entry in _AUTO_GRADE_DISPATCH to avoid needing the code-
        execution sandbox and verify the mock was awaited with the right args.
        """
        task = _Task(AssignmentTaskTypeEnum.CODE_EDITOR, {"exercises": []}, 100)
        sub = _Submission({"submissions": []})
        mock_grader = AsyncMock()
        with patch.dict(
            "src.services.courses.activities.assignments._AUTO_GRADE_DISPATCH",
            {AssignmentTaskTypeEnum.CODE_EDITOR: mock_grader},
        ):
            await dispatch_auto_grading(task, sub)
        mock_grader.assert_awaited_once_with(task, sub)

    @pytest.mark.asyncio
    async def test_file_submission_is_noop(self):
        """FILE_SUBMISSION has no handler → grade stays 0."""
        task = _Task(AssignmentTaskTypeEnum.FILE_SUBMISSION, {}, 100)
        sub = _Submission({"submissions": []})
        await dispatch_auto_grading(task, sub)
        assert sub.grade == 0

    @pytest.mark.asyncio
    async def test_other_type_is_noop(self):
        """OTHER has no handler → grade stays 0."""
        task = _Task(AssignmentTaskTypeEnum.OTHER, {}, 100)
        sub = _Submission({"submissions": []})
        await dispatch_auto_grading(task, sub)
        assert sub.grade == 0


# ═════════════════════════════════════════════════════════════════════════════
# 5.  _AUTO_GRADE_DISPATCH  (dispatch table structure)
# ═════════════════════════════════════════════════════════════════════════════


class TestAutoGradeDispatchTable:
    """Verify the dispatch table contains exactly the expected handlers."""

    def test_quiz_entry_points_to_quiz_grader(self):
        assert (
            _AUTO_GRADE_DISPATCH[AssignmentTaskTypeEnum.QUIZ]
            is perform_quiz_auto_grading
        )

    def test_form_entry_points_to_form_grader(self):
        assert (
            _AUTO_GRADE_DISPATCH[AssignmentTaskTypeEnum.FORM]
            is perform_form_auto_grading
        )

    def test_file_submission_has_no_entry(self):
        assert AssignmentTaskTypeEnum.FILE_SUBMISSION not in _AUTO_GRADE_DISPATCH

    def test_other_has_no_entry(self):
        assert AssignmentTaskTypeEnum.OTHER not in _AUTO_GRADE_DISPATCH

    def test_code_editor_has_an_entry(self):
        assert AssignmentTaskTypeEnum.CODE_EDITOR in _AUTO_GRADE_DISPATCH


# ═════════════════════════════════════════════════════════════════════════════
# 6.  _AUTO_GRADABLE_TYPES  (membership & immutability)
# ═════════════════════════════════════════════════════════════════════════════


class TestAutoGradableTypes:
    """_AUTO_GRADABLE_TYPES must contain QUIZ/FORM/CODE_EDITOR and be immutable."""

    def test_quiz_is_auto_gradable(self):
        assert AssignmentTaskTypeEnum.QUIZ in _AUTO_GRADABLE_TYPES

    def test_form_is_auto_gradable(self):
        assert AssignmentTaskTypeEnum.FORM in _AUTO_GRADABLE_TYPES

    def test_code_editor_is_auto_gradable(self):
        assert AssignmentTaskTypeEnum.CODE_EDITOR in _AUTO_GRADABLE_TYPES

    def test_file_submission_is_not_auto_gradable(self):
        assert AssignmentTaskTypeEnum.FILE_SUBMISSION not in _AUTO_GRADABLE_TYPES

    def test_other_is_not_auto_gradable(self):
        assert AssignmentTaskTypeEnum.OTHER not in _AUTO_GRADABLE_TYPES

    def test_is_frozenset(self):
        """frozenset prevents accidental mutations at runtime."""
        assert isinstance(_AUTO_GRADABLE_TYPES, frozenset)

    def test_all_gradable_task_union_correct_size(self):
        """Exactly 3 types are auto-gradable."""
        assert len(_AUTO_GRADABLE_TYPES) == 3
