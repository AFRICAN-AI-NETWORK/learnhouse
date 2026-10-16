"""
Tests for the Smart Article Automatic Assignment Linker.
Verifies that when a Smart Article contains interactive steps
(CODE_EXERCISE, FRONTEND_EXERCISE, QUIZ, CUSTOM_ANSWER, FILE_SUBMISSION),
an Assignment entity and matching AssignmentTasks are automatically created/updated,
and made available for instructor dashboards and student submissions.
"""

from datetime import UTC, datetime
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from src.db.courses.activities import Activity, ActivitySubTypeEnum, ActivityTypeEnum
from src.db.courses.assignments import (
    Assignment,
    AssignmentTask,
    AssignmentTaskTypeEnum,
    GradingTypeEnum,
)
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.chapters import Chapter
from src.db.courses.courses import Course
from src.db.organizations import Organization
from src.db.users import PublicUser
from src.services.courses.activities.assignments import (
    get_assignments_from_course,
    read_assignment_from_activity_uuid,
)
from src.services.courses.activities.smart_article import (
    sync_smart_article_assignment,
)


@pytest.fixture(name="db")
def db_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    tables = [
        Organization.__table__,
        Course.__table__,
        Chapter.__table__,
        Activity.__table__,
        ChapterActivity.__table__,
        Assignment.__table__,
        AssignmentTask.__table__,
    ]
    SQLModel.metadata.create_all(engine, tables=tables)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine, tables=tables)


@pytest.fixture(name="sample_course_setup")
def sample_course_setup_fixture(db: Session):
    org = Organization(
        name="Test Org",
        slug="test-org",
        email="org@example.com",
        org_uuid=f"org_{uuid4()}",
        creation_date=str(datetime.now(UTC)),
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    course = Course(
        name="Full Stack Dev",
        course_uuid=f"course_{uuid4()}",
        org_id=org.id,
        public=True,
        open_to_contributors=False,
        creation_date=str(datetime.now(UTC)),
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    chapter = Chapter(
        name="Chapter 1",
        chapter_uuid=f"chapter_{uuid4()}",
        course_id=course.id,
        org_id=org.id,
        creation_date=str(datetime.now(UTC)),
    )
    db.add(chapter)
    db.commit()
    db.refresh(chapter)

    return {"org": org, "course": course, "chapter": chapter}


def test_sync_smart_article_assignment_creates_assignment_and_tasks(
    db: Session, sample_course_setup
):
    org = sample_course_setup["org"]
    course = sample_course_setup["course"]
    chapter = sample_course_setup["chapter"]

    steps = [
        {
            "type": "introduction",
            "title": "Welcome",
            "content": "Intro text",
        },
        {
            "type": "CODE_EXERCISE",
            "title": "Backend Challenge: Process Order Total",
            "language": "javascript",
            "startingCode": "function calculateTotal() {}",
            "solutionCode": "function calculateTotal() { return 107.5; }",
            "testCases": [
                {
                    "testUUID": "tc-1",
                    "input": "",
                    "expectedOutput": "Total: $107.50",
                    "description": "Calculates order total",
                }
            ],
        },
        {
            "type": "FRONTEND_EXERCISE",
            "title": "Frontend Challenge: Interactive Course Card",
            "template": "react",
            "files": {
                "/App.js": "export default function App() { return <div>Card</div>; }"
            },
            "tests": [
                {
                    "id": "t1",
                    "description": "Renders card",
                    "type": "dom_text",
                    "selector": "div",
                    "expected": "Card",
                }
            ],
            "passingScore": 100,
        },
        {
            "type": "QUIZ",
            "title": "Check Your Knowledge",
            "questions": [
                {
                    "content": "What hook handles component state?",
                    "options": ["useState", "useEffect"],
                    "correctOptionIndex": 0,
                }
            ],
        },
        {
            "type": "summary",
            "title": "Recap",
            "items": ["Done!"],
        },
    ]

    activity = Activity(
        name="Full-Stack React & Node Lesson",
        activity_type=ActivityTypeEnum.TYPE_SMART_ARTICLE,
        activity_sub_type=ActivitySubTypeEnum.SUBTYPE_SMART_ARTICLE_PDF,
        activity_uuid=f"activity_{uuid4()}",
        course_id=course.id,
        org_id=org.id,
        content={"steps": steps},
        published=True,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    assignment = sync_smart_article_assignment(
        activity=activity,
        steps=steps,
        chapter_id=chapter.id,
        db_session=db,
    )

    assert assignment is not None
    assert assignment.activity_id == activity.id
    assert assignment.title == activity.name
    assert assignment.published is True
    assert assignment.grading_type == GradingTypeEnum.NUMERIC

    # Verify tasks created
    tasks = db.exec(
        select(AssignmentTask).where(AssignmentTask.assignment_id == assignment.id).order_by(AssignmentTask.id)
    ).all()
    assert len(tasks) == 3

    # Task 1: CODE_EXERCISE -> CODE_EDITOR
    assert tasks[0].assignment_type == AssignmentTaskTypeEnum.CODE_EDITOR
    assert tasks[0].title == "Backend Challenge: Process Order Total"
    assert "exercises" in tasks[0].contents
    assert tasks[0].contents["exercises"][0]["language"] == "javascript"
    assert tasks[0].contents["exercises"][0]["starterCode"] == "function calculateTotal() {}"

    # Task 2: FRONTEND_EXERCISE -> CODE_EDITOR
    assert tasks[1].assignment_type == AssignmentTaskTypeEnum.CODE_EDITOR
    assert tasks[1].title == "Frontend Challenge: Interactive Course Card"
    assert tasks[1].contents["exercises"][0]["template"] == "react"
    assert "/App.js" in tasks[1].contents["exercises"][0]["files"]

    # Task 3: QUIZ -> QUIZ
    assert tasks[2].assignment_type == AssignmentTaskTypeEnum.QUIZ
    assert len(tasks[2].contents["questions"]) == 1


def test_sync_smart_article_assignment_idempotent_and_updates(
    db: Session, sample_course_setup
):
    org = sample_course_setup["org"]
    course = sample_course_setup["course"]
    chapter = sample_course_setup["chapter"]

    initial_steps = [
        {
            "type": "CODE_EXERCISE",
            "title": "Exercise 1",
            "language": "python",
            "startingCode": "def solve(): pass",
            "testCases": [],
        },
        {
            "type": "QUIZ",
            "title": "Quiz 1",
            "questions": [],
        },
    ]

    activity = Activity(
        name="Lesson A",
        activity_type=ActivityTypeEnum.TYPE_SMART_ARTICLE,
        activity_sub_type=ActivitySubTypeEnum.SUBTYPE_SMART_ARTICLE_PDF,
        activity_uuid=f"activity_{uuid4()}",
        course_id=course.id,
        org_id=org.id,
        content={"steps": initial_steps},
        published=False,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    assignment1 = sync_smart_article_assignment(
        activity=activity, steps=initial_steps, chapter_id=chapter.id, db_session=db
    )
    assert assignment1 is not None

    tasks1 = db.exec(
        select(AssignmentTask).where(AssignmentTask.assignment_id == assignment1.id)
    ).all()
    assert len(tasks1) == 2

    # Now update: change title, change step content, remove Quiz
    activity.name = "Lesson A (Updated)"
    updated_steps = [
        {
            "type": "CODE_EXERCISE",
            "title": "Exercise 1 - Advanced",
            "language": "python",
            "startingCode": "def solve_advanced(): pass",
            "testCases": [{"testUUID": "t-1", "input": "", "expectedOutput": "1"}],
        }
    ]
    activity.content = {"steps": updated_steps}
    activity.published = True
    db.add(activity)
    db.commit()

    assignment2 = sync_smart_article_assignment(
        activity=activity, steps=updated_steps, chapter_id=chapter.id, db_session=db
    )

    # Must be the exact same assignment entity (idempotent, updated)
    assert assignment2.id == assignment1.id
    assert assignment2.title == "Lesson A (Updated)"
    assert assignment2.published is True

    # Tasks should have pruned the removed quiz and updated the code exercise
    tasks2 = db.exec(
        select(AssignmentTask).where(AssignmentTask.assignment_id == assignment2.id)
    ).all()
    assert len(tasks2) == 1
    assert tasks2[0].title == "Exercise 1 - Advanced"
    assert tasks2[0].contents["exercises"][0]["starterCode"] == "def solve_advanced(): pass"


def test_sync_smart_article_assignment_no_interactive_steps(
    db: Session, sample_course_setup
):
    org = sample_course_setup["org"]
    course = sample_course_setup["course"]
    chapter = sample_course_setup["chapter"]

    passive_steps = [
        {"type": "introduction", "title": "Intro", "content": "Just text"},
        {"type": "concept", "title": "Concepts", "subsections": []},
        {"type": "summary", "title": "Recap", "items": []},
    ]

    activity = Activity(
        name="Passive Reading Article",
        activity_type=ActivityTypeEnum.TYPE_SMART_ARTICLE,
        activity_sub_type=ActivitySubTypeEnum.SUBTYPE_SMART_ARTICLE_PDF,
        activity_uuid=f"activity_{uuid4()}",
        course_id=course.id,
        org_id=org.id,
        content={"steps": passive_steps},
        published=True,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    assignment = sync_smart_article_assignment(
        activity=activity, steps=passive_steps, chapter_id=chapter.id, db_session=db
    )

    assert assignment is None
    assignments_in_db = db.exec(
        select(Assignment).where(Assignment.activity_id == activity.id)
    ).all()
    assert len(assignments_in_db) == 0


@pytest.mark.asyncio
async def test_read_assignment_from_activity_uuid_and_course_list(
    db: Session, sample_course_setup, monkeypatch
):
    org = sample_course_setup["org"]
    course = sample_course_setup["course"]
    chapter = sample_course_setup["chapter"]

    steps = [
        {
            "type": "FRONTEND_EXERCISE",
            "title": "React Component Card",
            "template": "react",
            "files": {"/App.js": "export default () => <h1>Hello</h1>"},
            "tests": [],
        }
    ]

    activity = Activity(
        name="Smart Article with Frontend",
        activity_type=ActivityTypeEnum.TYPE_SMART_ARTICLE,
        activity_sub_type=ActivitySubTypeEnum.SUBTYPE_SMART_ARTICLE_PDF,
        activity_uuid=f"activity_{uuid4()}",
        course_id=course.id,
        org_id=org.id,
        content={"steps": steps},
        published=True,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    sync_smart_article_assignment(
        activity=activity, steps=steps, chapter_id=chapter.id, db_session=db
    )

    # Bypass RBAC for direct service test
    async def mock_rbac(*args, **kwargs):
        return True

    monkeypatch.setattr(
        "src.services.courses.activities.assignments.courses_rbac_check_for_assignments",
        mock_rbac,
    )

    mock_request = MagicMock()
    mock_user = PublicUser(
        id=1,
        username="testinstructor",
        first_name="Test",
        last_name="Instructor",
        email="instructor@example.com",
        user_uuid=f"user_{uuid4()}",
    )

    # 1. Test read_assignment_from_activity_uuid includes tasks
    res = await read_assignment_from_activity_uuid(
        request=mock_request,
        activity_uuid=activity.activity_uuid,
        current_user=mock_user,
        db_session=db,
    )
    assert res is not None
    assert res.title == "Smart Article with Frontend"
    assert res.assignment_tasks is not None
    assert len(res.assignment_tasks) == 1
    assert res.assignment_tasks[0].title == "React Component Card"

    # 2. Test get_assignments_from_course includes the Smart Article assignment
    course_assignments = await get_assignments_from_course(
        request=mock_request,
        course_uuid=course.course_uuid,
        current_user=mock_user,
        db_session=db,
    )
    assert len(course_assignments) == 1
    assert course_assignments[0].title == "Smart Article with Frontend"
