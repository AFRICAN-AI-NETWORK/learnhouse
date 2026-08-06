"""Dashboard-shaped read models for the centralized student dashboard.

These are flat, presentation-ready payloads so the frontend performs no
recomputation. They are derived from existing trail / course / user data plus
the lightweight time-tracking table.
"""


from pydantic import BaseModel


class StudentCourseProgress(BaseModel):
    """A single student's progress in one course."""

    course_id: int
    course_uuid: str
    course_name: str
    thumbnail_image: str | None = ""
    status: str  # "completed" | "in_progress"
    total_activities: int
    completed_activities: int
    progress_percentage: float
    points_earned: float
    time_spent_seconds: int
    is_certified: bool
    started_at: str | None = None
    completed_at: str | None = None


class StudentSummary(BaseModel):
    """One row in the students list."""

    user_id: int
    user_uuid: str
    username: str
    first_name: str
    last_name: str
    email: str
    avatar_image: str | None = ""
    courses_enrolled: int
    courses_in_progress: int
    courses_completed: int
    average_progress: float
    total_time_spent_seconds: int
    total_points: float
    certificates_count: int
    last_active: str | None = None


class StudentListResponse(BaseModel):
    """Paginated students list."""

    total: int
    page: int
    page_size: int
    students: list[StudentSummary]


class TopStudentsResponse(BaseModel):
    """Top students list."""

    students: list[StudentSummary]


class StudentRoleInfo(BaseModel):
    role_id: int
    name: str


class StudentDetail(BaseModel):
    """Full profile and per-course breakdown for a single student."""

    user_id: int
    user_uuid: str
    username: str
    first_name: str
    last_name: str
    email: str
    phone_number: str | None = None
    avatar_image: str | None = ""
    bio: str | None = ""
    details: dict | None = None
    profile: dict | None = None
    user_status: str | None = None
    creation_date: str | None = None
    roles: list[StudentRoleInfo] = []
    # aggregates
    courses_enrolled: int
    courses_in_progress: int
    courses_completed: int
    average_progress: float
    total_time_spent_seconds: int
    total_points: float
    certificates_count: int
    last_active: str | None = None
    courses: list[StudentCourseProgress] = []


class StudentActivityProgress(BaseModel):
    activity_id: int
    activity_uuid: str
    name: str
    order: int
    complete: bool
    teacher_verified: bool
    grade: str
    points_earned: float
    is_late: bool
    time_spent_seconds: int
    completed_at: str | None = None


class StudentChapterProgress(BaseModel):
    chapter_id: int
    name: str
    total_activities: int
    completed_activities: int
    activities: list[StudentActivityProgress] = []


class StudentCourseDetail(BaseModel):
    """Chapter -> activity drilldown for one student in one course."""

    course_id: int
    course_uuid: str
    course_name: str
    status: str
    total_activities: int
    completed_activities: int
    progress_percentage: float
    points_earned: float
    time_spent_seconds: int
    chapters: list[StudentChapterProgress] = []


class OrgAnalyticsSummary(BaseModel):
    """Org-wide headline metrics for the dashboard top cards."""

    total_students: int
    active_students: int  # students with at least one trail run
    total_enrollments: int
    total_completions: int
    average_completion: float
    total_learning_seconds: int
