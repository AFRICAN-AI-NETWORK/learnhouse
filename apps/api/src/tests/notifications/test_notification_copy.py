"""
Unit tests for notification message copy.

These are pure functions (no DB, no I/O) so every case is a plain
input -> expected string assertion.
"""

from src.services.notifications.notification_copy import (
    FEEDBACK_PREVIEW_LENGTH, activity_added_copy, app_update_copy,
    assignment_reviewed_copy, chapter_added_copy, retake_requested_copy,
    truncate)


class TestTruncate:
    def test_short_text_is_unchanged(self):
        assert truncate("short", 140) == "short"

    def test_long_text_is_cut_with_ellipsis(self):
        text = "a" * 200
        result = truncate(text, 140)
        assert len(result) == 140
        assert result.endswith("…")

    def test_none_is_empty_string(self):
        assert truncate(None, 140) == ""

    def test_whitespace_is_stripped(self):
        assert truncate("  padded  ", 140) == "padded"


class TestAssignmentReviewedCopy:
    def test_title_is_fixed(self):
        copy = assignment_reviewed_copy("Jane Doe", "Chapter 2 Quiz", 95, 100)
        assert copy.title == "Assignment graded"

    def test_message_includes_grade(self):
        copy = assignment_reviewed_copy("Jane Doe", "Chapter 2 Quiz", 95, 100)
        assert 'Jane Doe graded your submission for "Chapter 2 Quiz"' in copy.message
        assert "95/100" in copy.message

    def test_feedback_is_appended_when_present(self):
        copy = assignment_reviewed_copy(
            "Jane Doe", "Chapter 2 Quiz", 95, 100, feedback="Excellent work!"
        )
        assert "Excellent work!" in copy.message

    def test_no_trailing_space_when_feedback_missing(self):
        copy = assignment_reviewed_copy("Jane Doe", "Chapter 2 Quiz", 95, 100)
        assert copy.message.endswith("95/100.")

    def test_long_feedback_is_truncated(self):
        copy = assignment_reviewed_copy("Jane Doe", "Quiz", 95, 100, feedback="x" * 500)
        # message = fixed prefix + " " + truncated feedback
        feedback_part = copy.message.split("100. ", 1)[1]
        assert len(feedback_part) <= FEEDBACK_PREVIEW_LENGTH


class TestRetakeRequestedCopy:
    def test_title_is_fixed(self):
        copy = retake_requested_copy("Jane Doe", "Essay 1")
        assert copy.title == "Resubmission requested"

    def test_uses_default_when_no_feedback(self):
        copy = retake_requested_copy("Jane Doe", "Essay 1")
        assert "Please review and resubmit." in copy.message

    def test_uses_provided_feedback(self):
        copy = retake_requested_copy(
            "Jane Doe", "Essay 1", feedback="Missing citations"
        )
        assert "Missing citations" in copy.message
        assert "Please review and resubmit." not in copy.message


class TestChapterAddedCopy:
    def test_message_names_chapter_and_course(self):
        copy = chapter_added_copy("Advanced Concepts", "Python 101")
        assert copy.title == "New chapter available"
        assert '"Advanced Concepts"' in copy.message
        assert "Python 101" in copy.message


class TestActivityAddedCopy:
    def test_message_names_activity_chapter_and_course(self):
        copy = activity_added_copy("Lesson 3", "Advanced Concepts", "Python 101")
        assert copy.title == "New activity available"
        assert '"Lesson 3"' in copy.message
        assert "Advanced Concepts" in copy.message
        assert "Python 101" in copy.message


class TestAppUpdateCopy:
    def test_title_is_announcement_title(self):
        copy = app_update_copy("Scheduled maintenance", "We will be down at 2am UTC.")
        assert copy.title == "Scheduled maintenance"

    def test_message_is_truncated_content(self):
        copy = app_update_copy("Update", "y" * 500)
        assert len(copy.message) <= 160
