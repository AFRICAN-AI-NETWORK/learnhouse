import json
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException
from sqlmodel import Session, select

from src.db.organization_config import (
    AIOrgConfig,
    AnalyticsOrgConfig,
    APIOrgConfig,
    AssignmentOrgConfig,
    CollaborationOrgConfig,
    CourseOrgConfig,
    DiscussionOrgConfig,
    MemberOrgConfig,
    OrganizationConfig,
    OrganizationConfigBase,
    OrgCloudConfig,
    OrgFeatureConfig,
    OrgGeneralConfig,
    PaymentOrgConfig,
    StorageOrgConfig,
    UserGroupOrgConfig,
)
from src.db.organizations import Organization, OrganizationCreate
from src.db.roles import (
    AffiliationPermission,
    DashboardPermission,
    Permission,
    PermissionsWithOwn,
    Rights,
    Role,
    RoleTypeEnum,
)
from src.db.user_organizations import UserOrganization
from src.db.users import User, UserCreate, UserRead
from src.security.security import security_hash_password


# Install Default roles
def install_default_elements(db_session: Session):
    """ """
    # remove all default roles
    statement = select(Role).where(Role.role_type == RoleTypeEnum.TYPE_GLOBAL)
    roles = db_session.exec(statement).all()

    for role in roles:
        db_session.delete(role)

    db_session.commit()

    # Check if default roles already exist
    statement = select(Role).where(Role.role_type == RoleTypeEnum.TYPE_GLOBAL)
    roles = db_session.exec(statement).all()

    if roles and len(roles) == 10:
        raise HTTPException(
            status_code=409,
            detail="Default roles already exist",
        )

    # Create default roles
    role_global_admin = Role(
        name="Admin",
        description="Full platform control",
        id=1,
        role_type=RoleTypeEnum.TYPE_GLOBAL,
        role_uuid="role_global_admin",
        rights=Rights(
            courses=PermissionsWithOwn(
                action_create=True,
                action_read=True,
                action_read_own=True,
                action_update=True,
                action_update_own=True,
                action_delete=True,
                action_delete_own=True,
            ),
            users=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=True,
            ),
            usergroups=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=True,
            ),
            collections=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=True,
            ),
            organizations=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=True,
            ),
            coursechapters=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=True,
            ),
            activities=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=True,
            ),
            roles=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=True,
            ),
            communications=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=True,
            ),
            announcements=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=True,
            ),
            dashboard=DashboardPermission(
                action_access=True,
            ),
        ),
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )

    role_global_maintainer = Role(
        name="Maintainer",
        description="Mid-level manager, wide permissions but no platform control",
        id=2,
        role_type=RoleTypeEnum.TYPE_GLOBAL,
        role_uuid="role_global_maintainer",
        rights=Rights(
            courses=PermissionsWithOwn(
                action_create=True,
                action_read=True,
                action_read_own=True,
                action_update=True,
                action_update_own=True,
                action_delete=True,
                action_delete_own=True,
            ),
            users=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=False,
            ),
            usergroups=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=True,
            ),
            collections=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=True,
            ),
            organizations=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            coursechapters=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=True,
            ),
            activities=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=True,
            ),
            roles=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            communications=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=False,
            ),
            announcements=Permission(
                action_create=True,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            dashboard=DashboardPermission(
                action_access=True,
            ),
        ),
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )

    role_global_instructor = Role(
        name="Instructor",
        description="Can manage their own content",
        id=3,
        role_type=RoleTypeEnum.TYPE_GLOBAL,
        role_uuid="role_global_instructor",
        rights=Rights(
            courses=PermissionsWithOwn(
                action_create=True,
                action_read=True,
                action_read_own=True,
                action_update=False,
                action_update_own=True,
                action_delete=False,
                action_delete_own=True,
            ),
            users=Permission(
                action_create=False,
                action_read=False,
                action_update=False,
                action_delete=False,
            ),
            usergroups=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            collections=Permission(
                action_create=True,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            organizations=Permission(
                action_create=False,
                action_read=False,
                action_update=False,
                action_delete=False,
            ),
            coursechapters=Permission(
                action_create=True,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            activities=Permission(
                action_create=True,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            roles=Permission(
                action_create=False,
                action_read=False,
                action_update=False,
                action_delete=False,
            ),
            communications=Permission(
                action_create=True,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            announcements=Permission(
                action_create=True,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            dashboard=DashboardPermission(
                action_access=True,
            ),
        ),
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )

    role_global_user = Role(
        name="User",
        description="Read-Only Learner",
        role_type=RoleTypeEnum.TYPE_GLOBAL,
        role_uuid="role_global_user",
        id=4,
        rights=Rights(
            courses=PermissionsWithOwn(
                action_create=False,
                action_read=True,
                action_read_own=True,
                action_update=False,
                action_update_own=False,
                action_delete=True,
                action_delete_own=True,
            ),
            users=Permission(
                action_create=False,
                action_read=False,
                action_update=False,
                action_delete=False,
            ),
            usergroups=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            collections=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            organizations=Permission(
                action_create=False,
                action_read=False,
                action_update=False,
                action_delete=False,
            ),
            coursechapters=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            activities=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            roles=Permission(
                action_create=False,
                action_read=False,
                action_update=False,
                action_delete=False,
            ),
            communications=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            announcements=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            dashboard=DashboardPermission(
                action_access=False,
            ),
        ),
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )

    role_partner = Role(
        name="Partner",
        description="Referral partner with access to affiliation dashboard",
        role_type=RoleTypeEnum.TYPE_GLOBAL,
        role_uuid="partner_role",
        id=10,
        rights=Rights(
            courses=PermissionsWithOwn(
                action_create=False,
                action_read=True,
                action_read_own=True,
                action_update=False,
                action_update_own=False,
                action_delete=True,
                action_delete_own=True,
            ),
            users=Permission(
                action_create=False,
                action_read=False,
                action_update=False,
                action_delete=False,
            ),
            usergroups=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            collections=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            organizations=Permission(
                action_create=False,
                action_read=False,
                action_update=False,
                action_delete=False,
            ),
            coursechapters=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            activities=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            roles=Permission(
                action_create=False,
                action_read=False,
                action_update=False,
                action_delete=False,
            ),
            communications=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            announcements=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            dashboard=DashboardPermission(action_access=False),
            affiliation=AffiliationPermission(action_read=True),
        ),
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )

    # ── Shared rights blocks reused by support roles ───────────────────────────

    _read_only_rights = Rights(
        courses=PermissionsWithOwn(
            action_create=False,
            action_read=True,
            action_read_own=True,
            action_update=False,
            action_update_own=False,
            action_delete=False,
            action_delete_own=False,
        ),
        users=Permission(
            action_create=False,
            action_read=False,
            action_update=False,
            action_delete=False,
        ),
        usergroups=Permission(
            action_create=False,
            action_read=True,
            action_update=False,
            action_delete=False,
        ),
        collections=Permission(
            action_create=False,
            action_read=True,
            action_update=False,
            action_delete=False,
        ),
        organizations=Permission(
            action_create=False,
            action_read=False,
            action_update=False,
            action_delete=False,
        ),
        coursechapters=Permission(
            action_create=False,
            action_read=True,
            action_update=False,
            action_delete=False,
        ),
        activities=Permission(
            action_create=False,
            action_read=True,
            action_update=False,
            action_delete=False,
        ),
        roles=Permission(
            action_create=False,
            action_read=False,
            action_update=False,
            action_delete=False,
        ),
        communications=Permission(
            action_create=False,
            action_read=True,
            action_update=False,
            action_delete=False,
        ),
        announcements=Permission(
            action_create=False,
            action_read=True,
            action_update=False,
            action_delete=False,
        ),
        dashboard=DashboardPermission(action_access=False),
    )

    _teaching_rights = Rights(
        courses=PermissionsWithOwn(
            action_create=True,
            action_read=True,
            action_read_own=True,
            action_update=False,
            action_update_own=True,
            action_delete=False,
            action_delete_own=True,
        ),
        users=Permission(
            action_create=False,
            action_read=False,
            action_update=False,
            action_delete=False,
        ),
        usergroups=Permission(
            action_create=False,
            action_read=True,
            action_update=False,
            action_delete=False,
        ),
        collections=Permission(
            action_create=True,
            action_read=True,
            action_update=False,
            action_delete=False,
        ),
        organizations=Permission(
            action_create=False,
            action_read=False,
            action_update=False,
            action_delete=False,
        ),
        coursechapters=Permission(
            action_create=True,
            action_read=True,
            action_update=False,
            action_delete=False,
        ),
        activities=Permission(
            action_create=True,
            action_read=True,
            action_update=False,
            action_delete=False,
        ),
        roles=Permission(
            action_create=False,
            action_read=False,
            action_update=False,
            action_delete=False,
        ),
        communications=Permission(
            action_create=True,
            action_read=True,
            action_update=True,
            action_delete=False,
        ),
        announcements=Permission(
            action_create=False,
            action_read=True,
            action_update=False,
            action_delete=False,
        ),
        dashboard=DashboardPermission(action_access=True),
    )

    # ── Support / staff roles ─────────────────────────────────────────────────

    role_teaching_assistant = Role(
        name="Teaching Assistant",
        description="Assists instructors with course content and student queries",
        id=5,
        role_type=RoleTypeEnum.TYPE_GLOBAL,
        role_uuid="role_global_teaching_assistant",
        rights=_teaching_rights,
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )

    role_student_success_coordinator = Role(
        name="Students Success Coordinator",
        description="Monitors and supports student progress and success",
        id=6,
        role_type=RoleTypeEnum.TYPE_GLOBAL,
        role_uuid="role_global_student_success_coordinator",
        rights=Rights(
            courses=_read_only_rights.courses,
            users=Permission(
                action_create=False,
                action_read=True,
                action_update=False,
                action_delete=False,
            ),
            usergroups=_read_only_rights.usergroups,
            collections=_read_only_rights.collections,
            organizations=_read_only_rights.organizations,
            coursechapters=_read_only_rights.coursechapters,
            activities=_read_only_rights.activities,
            roles=_read_only_rights.roles,
            communications=Permission(
                action_create=True,
                action_read=True,
                action_update=True,
                action_delete=False,
            ),
            announcements=_read_only_rights.announcements,
            dashboard=DashboardPermission(action_access=True),
        ),
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )

    role_student_mentor = Role(
        name="Students Mentor",
        description="Provides guidance and mentorship to individual students",
        id=7,
        role_type=RoleTypeEnum.TYPE_GLOBAL,
        role_uuid="role_global_student_mentor",
        rights=_read_only_rights,
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )

    role_community_manager = Role(
        name="Community Manager",
        description="Manages community engagement and communication",
        id=8,
        role_type=RoleTypeEnum.TYPE_GLOBAL,
        role_uuid="role_global_community_manager",
        rights=_teaching_rights,
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )

    role_lead_instructor = Role(
        name="Lead Instructor",
        description="Senior instructor who leads courses and mentors other instructors",
        id=9,
        role_type=RoleTypeEnum.TYPE_GLOBAL,
        role_uuid="role_global_lead_instructor",
        rights=_teaching_rights,
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )

    # Serialize rights to JSON
    role_global_admin.rights = role_global_admin.rights.dict()  # type: ignore
    role_global_maintainer.rights = role_global_maintainer.rights.dict()  # type: ignore
    role_global_instructor.rights = role_global_instructor.rights.dict()  # type: ignore
    role_global_user.rights = role_global_user.rights.dict()  # type: ignore
    role_partner.rights = role_partner.rights.dict()  # type: ignore
    role_teaching_assistant.rights = role_teaching_assistant.rights.dict()  # type: ignore
    role_student_success_coordinator.rights = (
        role_student_success_coordinator.rights.dict()
    )  # type: ignore
    role_student_mentor.rights = role_student_mentor.rights.dict()  # type: ignore
    role_community_manager.rights = role_community_manager.rights.dict()  # type: ignore
    role_lead_instructor.rights = role_lead_instructor.rights.dict()  # type: ignore

    # Insert roles in DB
    db_session.add(role_global_admin)
    db_session.add(role_global_maintainer)
    db_session.add(role_global_instructor)
    db_session.add(role_global_user)
    db_session.add(role_partner)
    db_session.add(role_teaching_assistant)
    db_session.add(role_student_success_coordinator)
    db_session.add(role_student_mentor)
    db_session.add(role_community_manager)
    db_session.add(role_lead_instructor)

    # commit changes
    db_session.commit()

    # refresh roles
    db_session.refresh(role_global_admin)

    return True


# Organization creation
def install_create_organization(org_object: OrganizationCreate, db_session: Session):
    org = Organization.model_validate(org_object)

    # Complete the org object
    org.org_uuid = f"org_{uuid4()}"
    org.creation_date = str(datetime.now(UTC))
    org.update_date = str(datetime.now(UTC))

    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)

    # Org Config
    org_config = OrganizationConfigBase(
        config_version="1.3",
        general=OrgGeneralConfig(
            enabled=True,
            color="normal",
            watermark=True,
        ),
        features=OrgFeatureConfig(
            courses=CourseOrgConfig(enabled=True, limit=0),
            members=MemberOrgConfig(
                enabled=True, signup_mode="open", admin_limit=0, limit=0
            ),
            usergroups=UserGroupOrgConfig(enabled=True, limit=0),
            storage=StorageOrgConfig(enabled=True, limit=0),
            ai=AIOrgConfig(enabled=True, limit=0, model="gpt-4o-mini"),
            assignments=AssignmentOrgConfig(enabled=True, limit=0),
            payments=PaymentOrgConfig(enabled=False),
            discussions=DiscussionOrgConfig(enabled=True, limit=0),
            analytics=AnalyticsOrgConfig(enabled=True, limit=0),
            collaboration=CollaborationOrgConfig(enabled=True, limit=0),
            api=APIOrgConfig(enabled=True, limit=0),
        ),
        cloud=OrgCloudConfig(plan="free", custom_domain=False),
        landing={},
    )

    org_config = json.loads(org_config.json())

    # OrgSettings
    org_settings = OrganizationConfig(
        org_id=int(org.id if org.id else 0),
        config=org_config,
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )

    db_session.add(org_settings)
    db_session.commit()
    db_session.refresh(org_settings)

    return org


def install_create_organization_user(
    user_object: UserCreate, org_slug: str, db_session: Session
):
    user = User.model_validate(user_object)

    # Complete the user object
    user.user_uuid = f"user_{uuid4()}"
    user.password = security_hash_password(user_object.password)
    user.email_verified = False
    user.creation_date = str(datetime.now(UTC))
    user.update_date = str(datetime.now(UTC))

    # Verifications

    # Check if Organization exists
    statement = select(Organization).where(Organization.slug == org_slug)
    org = db_session.exec(statement)

    if not org.first():
        raise HTTPException(
            status_code=409,
            detail="Organization does not exist",
        )

    # Username
    statement = select(User).where(User.username == user.username)
    result = db_session.exec(statement)

    if result.first():
        raise HTTPException(
            status_code=409,
            detail="Username already exists",
        )

    # Email
    statement = select(User).where(User.email == user.email)
    result = db_session.exec(statement)

    if result.first():
        raise HTTPException(
            status_code=409,
            detail="Email already exists",
        )

    # Exclude unset values
    user_data = user.dict(exclude_unset=True)
    for key, value in user_data.items():
        setattr(user, key, value)

    # Add user to database
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # get org id
    statement = select(Organization).where(Organization.slug == org_slug)
    org = db_session.exec(statement)
    org = org.first()
    org_id = org.id if org else 0

    # Link user and organization
    user_organization = UserOrganization(
        user_id=user.id if user.id else 0,
        org_id=org_id or 0,
        role_id=1,
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )

    db_session.add(user_organization)
    db_session.commit()
    db_session.refresh(user_organization)

    user = UserRead.model_validate(user)

    return user
