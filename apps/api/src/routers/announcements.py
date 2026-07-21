import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select, desc
from src.core.events.database import get_db_session
from src.db.announcements import (
    Announcement,
    AnnouncementCreate,
    AnnouncementReadResponse,
    AnnouncementUpdate,
    AnnouncementRead,
)
from src.security.auth import get_current_user
from src.db.users import PublicUser
from src.services.orgs.orgs import get_organization_by_slug
from src.security.rbac.rbac import authorization_verify_based_on_org_admin_status

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{orgslug}")
async def list_announcements(
    orgslug: str,
    request: Request,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
    active_only: bool = Query(True),
):
    org = await get_organization_by_slug(request, orgslug, db_session, current_user)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    statement = select(Announcement).where(Announcement.org_id == org.id)
    if active_only:
        statement = statement.where(Announcement.is_active == True)

    statement = statement.order_by(desc(Announcement.creation_date))
    announcements = db_session.exec(statement).all()

    # Find read announcements for this user
    read_announcements_ids = set()
    if current_user and announcements:
        ann_ids = [a.id for a in announcements]
        reads_statement = select(AnnouncementRead.announcement_id).where(
            AnnouncementRead.user_id == current_user.id,
            AnnouncementRead.announcement_id.in_(ann_ids),
        )
        read_announcements_ids = set(db_session.exec(reads_statement).all())

    response = []
    for ann in announcements:
        resp_dict = ann.dict()
        resp_dict["is_read"] = ann.id in read_announcements_ids
        response.append(AnnouncementReadResponse(**resp_dict))

    return response


@router.post("/{orgslug}")
async def create_announcement(
    orgslug: str,
    announcement: AnnouncementCreate,
    request: Request,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    org = await get_organization_by_slug(request, orgslug, db_session, current_user)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_admin = await authorization_verify_based_on_org_admin_status(
        request, current_user.id, "create", org.slug, db_session
    )

    if not is_admin:
        raise HTTPException(
            status_code=403, detail="Not authorized to create announcements"
        )

    new_announcement = Announcement(
        **announcement.dict(), org_id=org.id, created_by_user_id=current_user.id
    )
    db_session.add(new_announcement)
    db_session.commit()
    db_session.refresh(new_announcement)

    # Real-time nudge for currently-online org members only — no per-user
    # notification rows are created here (see the notification system's
    # design decision to keep Announcements a parallel, sparse-by-design
    # backend rather than fan out an eager row per member). Offline users
    # still see it via the existing GET /announcements list, unchanged.
    if new_announcement.is_active:
        try:
            from src.services.notifications.fanout_jobs import sync_fanout_app_update
            from src.services.notifications.scheduling import enqueue_job

            enqueue_job(
                f"app_update_notif_{new_announcement.id}",
                sync_fanout_app_update,
                [
                    new_announcement.id,
                    org.id,
                    new_announcement.title,
                    new_announcement.content,
                ],
            )
        except Exception as e:
            logger.warning(
                "Failed to schedule app_update fan-out for announcement %s: %s",
                new_announcement.id,
                e,
            )

    return new_announcement


@router.put("/{orgslug}/{announcement_id}")
async def update_announcement(
    orgslug: str,
    announcement_id: int,
    update_data: AnnouncementUpdate,
    request: Request,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    org = await get_organization_by_slug(request, orgslug, db_session, current_user)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_admin = await authorization_verify_based_on_org_admin_status(
        request, current_user.id, "update", org.slug, db_session
    )

    if not is_admin:
        raise HTTPException(
            status_code=403, detail="Not authorized to update announcements"
        )

    announcement = db_session.get(Announcement, announcement_id)
    if not announcement or announcement.org_id != org.id:
        raise HTTPException(status_code=404, detail="Announcement not found")

    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(announcement, key, value)

    db_session.add(announcement)
    db_session.commit()
    db_session.refresh(announcement)
    return announcement


@router.post("/{orgslug}/{announcement_id}/read")
async def mark_announcement_read(
    orgslug: str,
    announcement_id: int,
    request: Request,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    org = await get_organization_by_slug(request, orgslug, db_session, current_user)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    announcement = db_session.get(Announcement, announcement_id)
    if not announcement or announcement.org_id != org.id:
        raise HTTPException(status_code=404, detail="Announcement not found")

    existing_read = db_session.exec(
        select(AnnouncementRead).where(
            AnnouncementRead.announcement_id == announcement_id,
            AnnouncementRead.user_id == current_user.id,
        )
    ).first()

    if not existing_read:
        read_record = AnnouncementRead(
            announcement_id=announcement_id, user_id=current_user.id
        )
        db_session.add(read_record)
        db_session.commit()

    return {"status": "ok"}
