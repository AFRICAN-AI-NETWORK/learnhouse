"""
Tests for the announcement -> live WS push wiring in create_announcement().

RBAC (both the legacy admin-status check and the current rights-based one)
and org lookup are monkeypatched to bypass. These tests target only the
fan-out scheduling call, not authorization itself.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.db.announcements import AnnouncementCreate
from src.routers import announcements as announcements_router


@pytest.fixture(autouse=True)
def _bypass_org_and_rbac(monkeypatch, org):
    monkeypatch.setattr(
        announcements_router,
        "get_organization_by_slug",
        AsyncMock(return_value=org),
    )
    monkeypatch.setattr(
        announcements_router,
        "authorization_verify_based_on_org_admin_status",
        AsyncMock(return_value=True),
    )
    monkeypatch.setattr(
        announcements_router,
        "authorization_verify_has_rights",
        AsyncMock(return_value=True),
    )


class TestCreateAnnouncementSchedulesFanout:
    @pytest.mark.asyncio
    async def test_active_announcement_enqueues_fanout_job(
        self, session, user, org, monkeypatch
    ):
        mock_enqueue = MagicMock()
        monkeypatch.setattr(
            "src.services.notifications.scheduling.enqueue_job", mock_enqueue
        )

        announcement = await announcements_router.create_announcement(
            orgslug=org.slug,
            announcement=AnnouncementCreate(
                title="Scheduled maintenance",
                content="We will be down at 2am UTC.",
                is_active=True,
            ),
            request=None,
            current_user=user,
            db_session=session,
        )

        mock_enqueue.assert_called_once()
        job_id, _func, args = mock_enqueue.call_args[0]
        assert job_id == f"app_update_notif_{announcement.id}"
        assert args == [
            announcement.id,
            org.id,
            "Scheduled maintenance",
            "We will be down at 2am UTC.",
        ]

    @pytest.mark.asyncio
    async def test_inactive_announcement_does_not_enqueue(
        self, session, user, org, monkeypatch
    ):
        mock_enqueue = MagicMock()
        monkeypatch.setattr(
            "src.services.notifications.scheduling.enqueue_job", mock_enqueue
        )

        await announcements_router.create_announcement(
            orgslug=org.slug,
            announcement=AnnouncementCreate(
                title="Draft", content="Not ready yet", is_active=False
            ),
            request=None,
            current_user=user,
            db_session=session,
        )

        mock_enqueue.assert_not_called()

    @pytest.mark.asyncio
    async def test_scheduling_failure_does_not_break_creation(
        self, session, user, org, monkeypatch
    ):
        monkeypatch.setattr(
            "src.services.notifications.scheduling.enqueue_job",
            MagicMock(side_effect=RuntimeError("scheduler down")),
        )

        announcement = await announcements_router.create_announcement(
            orgslug=org.slug,
            announcement=AnnouncementCreate(
                title="Scheduled maintenance",
                content="We will be down at 2am UTC.",
                is_active=True,
            ),
            request=None,
            current_user=user,
            db_session=session,
        )

        assert announcement.id is not None
