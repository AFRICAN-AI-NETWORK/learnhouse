"""
Thin wrapper around the app-wide APScheduler instance (built in apps/api/app.py)
for enqueuing one-off notification fan-out jobs.

``app`` is imported lazily inside the function, not at module load time:
app.py imports src.router, which imports this package transitively, so a
top-level ``import app`` here would be circular. Deferring it to call time
(well after app.py has finished loading) avoids that.

Never raises — the action that triggers a fan-out (publishing a chapter,
etc.) must succeed even if the scheduler isn't running (e.g. background
jobs disabled, or running outside the FastAPI app lifecycle in a script or
test). The fan-out is simply skipped and logged in that case.
"""

import logging
from collections.abc import Callable, Sequence

logger = logging.getLogger(__name__)


def enqueue_job(job_id: str, func: Callable, args: Sequence) -> None:
    try:
        import app as app_module

        scheduler = app_module.scheduler
        if scheduler is None:
            logger.warning(
                "Background scheduler not running, skipping fan-out job %s", job_id
            )
            return

        scheduler.add_job(
            func,
            args=list(args),
            trigger="date",
            id=job_id,
            replace_existing=True,
            misfire_grace_time=300,
        )
    except Exception as e:  # noqa: BLE001
        logger.warning("Failed to enqueue fan-out job %s: %s", job_id, e)
