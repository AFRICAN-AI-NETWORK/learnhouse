"""Aggregation correctness tests for the student dashboard service."""

import pytest
from fastapi import HTTPException

from src.services.admin_analytics.students import (get_org_analytics_summary,
                                                   get_student_course_detail,
                                                   get_student_detail,
                                                   list_org_students)

from .conftest import (add_time, complete_activity, current_user, enroll,
                       make_activity, make_chapter, make_course)


def _build_course_with_two_activities(session, org):
    course = make_course(session, org, "Maths")
    chapter = make_chapter(session, org, course, "Chapter 1")
    a1 = make_activity(session, org, course, chapter, order=1, points=10)
    a2 = make_activity(session, org, course, chapter, order=2, points=10)
    return course, chapter, a1, a2


@pytest.mark.asyncio
async def test_list_reports_progress_and_time(session, org, admin_user, student_user):
    course, _, a1, a2 = _build_course_with_two_activities(session, org)
    run = enroll(session, org, student_user, course)
    complete_activity(session, org, student_user, course, run, a1, points=10)
    add_time(session, org, student_user, course, a1, seconds=120)
    add_time(session, org, student_user, course, a2, seconds=30)

    result = await list_org_students(org.id, current_user(admin_user), session)

    students = {s.user_id: s for s in result.students}
    s = students[student_user.id]
    assert s.courses_enrolled == 1
    assert s.courses_completed == 0
    assert s.courses_in_progress == 1
    assert s.average_progress == 50.0  # 1 of 2 activities
    assert s.total_time_spent_seconds == 150
    assert s.total_points == 10.0


@pytest.mark.asyncio
async def test_completed_course_counts(session, org, admin_user, student_user):
    course, _, a1, a2 = _build_course_with_two_activities(session, org)
    run = enroll(session, org, student_user, course)
    complete_activity(session, org, student_user, course, run, a1)
    complete_activity(session, org, student_user, course, run, a2)

    result = await list_org_students(org.id, current_user(admin_user), session)
    s = next(s for s in result.students if s.user_id == student_user.id)
    assert s.courses_completed == 1
    assert s.courses_in_progress == 0
    assert s.average_progress == 100.0


@pytest.mark.asyncio
async def test_list_is_forbidden_for_plain_student(session, org, student_user):
    with pytest.raises(HTTPException):
        await list_org_students(org.id, current_user(student_user), session)


@pytest.mark.asyncio
async def test_search_filters_by_name(session, org, admin_user, student_user):
    result = await list_org_students(
        org.id, current_user(admin_user), session, search="Jane"
    )
    assert any(s.user_id == student_user.id for s in result.students)

    empty = await list_org_students(
        org.id, current_user(admin_user), session, search="NoSuchName"
    )
    assert all(s.user_id != student_user.id for s in empty.students)


@pytest.mark.asyncio
async def test_pagination(session, org, admin_user, coordinator_user, student_user):
    page1 = await list_org_students(
        org.id, current_user(admin_user), session, page=1, page_size=1
    )
    assert page1.page_size == 1
    assert len(page1.students) == 1
    assert page1.total == 1


@pytest.mark.asyncio
async def test_student_detail_breakdown(session, org, admin_user, student_user):
    course, _, a1, _a2 = _build_course_with_two_activities(session, org)
    run = enroll(session, org, student_user, course)
    complete_activity(session, org, student_user, course, run, a1, points=10)
    add_time(session, org, student_user, course, a1, seconds=60)

    detail = await get_student_detail(
        org.id, student_user.id, current_user(admin_user), session
    )
    assert detail.user_id == student_user.id
    assert detail.courses_enrolled == 1
    assert len(detail.courses) == 1
    cp = detail.courses[0]
    assert cp.total_activities == 2
    assert cp.completed_activities == 1
    assert cp.progress_percentage == 50.0
    assert cp.time_spent_seconds == 60
    assert cp.status == "in_progress"


@pytest.mark.asyncio
async def test_student_detail_unknown_user_404(session, org, admin_user):
    with pytest.raises(HTTPException) as exc:
        await get_student_detail(org.id, 999999, current_user(admin_user), session)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_course_detail_drilldown(session, org, admin_user, student_user):
    course, _chapter, a1, _a2 = _build_course_with_two_activities(session, org)
    run = enroll(session, org, student_user, course)
    complete_activity(session, org, student_user, course, run, a1, points=10)
    add_time(session, org, student_user, course, a1, seconds=45)

    detail = await get_student_course_detail(
        org.id, student_user.id, course.id, current_user(admin_user), session
    )
    assert detail.total_activities == 2
    assert detail.completed_activities == 1
    assert detail.progress_percentage == 50.0
    assert detail.time_spent_seconds == 45
    assert len(detail.chapters) == 1
    ch = detail.chapters[0]
    assert ch.total_activities == 2
    assert ch.completed_activities == 1
    completed_flags = {act.order: act.complete for act in ch.activities}
    assert completed_flags == {1: True, 2: False}


@pytest.mark.asyncio
async def test_org_summary(session, org, admin_user, student_user):
    course, _, a1, _a2 = _build_course_with_two_activities(session, org)
    run = enroll(session, org, student_user, course)
    complete_activity(session, org, student_user, course, run, a1)
    add_time(session, org, student_user, course, a1, seconds=90)

    summary = await get_org_analytics_summary(org.id, current_user(admin_user), session)
    assert summary.active_students == 1
    assert summary.total_enrollments == 1
    assert summary.total_completions == 0
    assert summary.average_completion == 50.0
    assert summary.total_learning_seconds == 90
    assert summary.total_students == 1
