"""
Tests for the APScheduler enqueue helper used by chapter/activity/announcement
fan-out triggers.
"""

from unittest.mock import MagicMock

from src.services.notifications.scheduling import enqueue_job


def _noop():
    pass


class TestEnqueueJob:
    def test_adds_job_when_scheduler_running(self, monkeypatch):
        import app as app_module

        fake_scheduler = MagicMock()
        monkeypatch.setattr(app_module, "scheduler", fake_scheduler)

        enqueue_job("job_1", _noop, [1, 2])

        fake_scheduler.add_job.assert_called_once()
        _, kwargs = fake_scheduler.add_job.call_args
        assert kwargs["args"] == [1, 2]
        assert kwargs["id"] == "job_1"
        assert kwargs["replace_existing"] is True

    def test_does_not_raise_when_scheduler_not_running(self, monkeypatch):
        import app as app_module

        monkeypatch.setattr(app_module, "scheduler", None)

        # Must not raise — publishing a chapter must succeed even if the
        # background scheduler isn't up (e.g. disabled, or outside the app
        # lifecycle in a script/test).
        enqueue_job("job_2", _noop, [])

    def test_does_not_raise_when_scheduler_add_job_fails(self, monkeypatch):
        import app as app_module

        fake_scheduler = MagicMock()
        fake_scheduler.add_job.side_effect = RuntimeError("scheduler shut down")
        monkeypatch.setattr(app_module, "scheduler", fake_scheduler)

        enqueue_job("job_3", _noop, [])
