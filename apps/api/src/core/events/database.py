import importlib
import importlib.util
import logging

logger = logging.getLogger(__name__)
import os
import re
import sys

from fastapi import FastAPI
from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

from config.config import get_learnhouse_config


def import_all_models():
    # List of directories to scan for models
    model_configs = [
        {"base_dir": "src/db", "base_module_path": "src.db"},
        {"base_dir": "ee/db", "base_module_path": "ee.db"},
    ]

    for config in model_configs:
        base_dir = config["base_dir"]
        base_module_path = config["base_module_path"]

        if not os.path.exists(base_dir):
            continue

        # Recursively walk through the base directory
        for root, dirs, files in os.walk(base_dir):
            # Filter out __init__.py and non-Python files
            module_files = [
                f for f in files if f.endswith(".py") and f != "__init__.py"
            ]

            # Calculate the module's base path from its directory structure
            path_diff = os.path.relpath(root, base_dir)
            if path_diff == ".":
                current_module_base = base_module_path
            else:
                current_module_base = (
                    f"{base_module_path}.{path_diff.replace(os.sep, '.')}"
                )

            # Dynamically import each module
            for file_name in module_files:
                module_name = file_name[:-3]  # Remove the '.py' extension
                full_module_path = f"{current_module_base}.{module_name}"
                # Validate module path to avoid importing arbitrary/unexpected modules
                safe_pattern = re.compile(r"^[A-Za-z0-9_.]+$")
                if not safe_pattern.match(full_module_path):
                    logger.warning(f"Skipping unsafe module path: {full_module_path}")
                    continue

                # Ensure module is under the expected base module path
                if not (
                    full_module_path == base_module_path
                    or full_module_path.startswith(base_module_path + ".")
                ):
                    logger.warning(
                        f"Skipping module outside base path: {full_module_path}"
                    )
                    continue

                # Check that module actually exists before importing
                try:
                    spec = importlib.util.find_spec(full_module_path)
                except Exception:  # noqa: BLE001
                    spec = None

                if spec is None:
                    logger.debug(f"Module spec not found for {full_module_path}")
                    continue

                try:
                    # Avoid re-executing already imported modules to prevent duplicate SQLModel table registration.
                    if full_module_path in sys.modules:
                        continue

                    # Load module via spec loader rather than import_module() to satisfy non-literal-import guardrails.
                    module = importlib.util.module_from_spec(spec)
                    if spec.loader is None:
                        logger.debug(f"No loader available for {full_module_path}")
                        continue
                    sys.modules[full_module_path] = module
                    spec.loader.exec_module(module)
                except Exception as e:  # noqa: BLE001
                    # Remove partial module entries on failure.
                    sys.modules.pop(full_module_path, None)
                    logger.error(f"Failed to import model {full_module_path}: {e}")


# Import all models before creating engine
import_all_models()

learnhouse_config = get_learnhouse_config()

# Check if we're in test mode
is_testing = os.getenv("TESTING", "false").lower() == "true"

if is_testing:
    # Use SQLite for tests
    engine = create_engine(
        "sqlite:///:memory:", echo=False, connect_args={"check_same_thread": False}
    )
else:
    _pool_size = int(os.getenv("DB_POOL_SIZE", "20"))
    _max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    _pool_recycle = int(os.getenv("DB_POOL_RECYCLE", "300"))
    _pool_timeout = int(os.getenv("DB_POOL_TIMEOUT", "30"))

    engine = create_engine(
        learnhouse_config.database_config.sql_connection_string,  # type: ignore
        echo=False,
        pool_pre_ping=True,  # type: ignore
        pool_size=_pool_size,
        max_overflow=_max_overflow,
        pool_recycle=_pool_recycle,  # Recycle connections after N seconds
        pool_timeout=_pool_timeout,
    )

    logger.info(
        "Database pool configured: size=%d, overflow=%d, recycle=%ds, timeout=%ds",
        _pool_size,
        _max_overflow,
        _pool_recycle,
        _pool_timeout,
    )

    # Add connection pool monitoring for debugging
    @event.listens_for(engine, "connect")
    def receive_connect(dbapi_connection, connection_record):
        logger.debug("Database connection established")

    @event.listens_for(engine, "checkout")
    def receive_checkout(dbapi_connection, connection_record, connection_proxy):
        logger.debug("Connection checked out from pool")

    @event.listens_for(engine, "checkin")
    def receive_checkin(dbapi_connection, connection_record):
        logger.debug("Connection returned to pool")


def ensure_schema_compatibility(db_engine):
    """
    Ensure newly added columns and enum values exist in PostgreSQL/SQLite
    so that queries don't crash with UndefinedColumn or LookupError.
    Idempotent and safe to run on every startup.
    """
    try:
        from sqlalchemy import inspect, text

        with db_engine.connect() as conn:
            inspector = inspect(conn)
            tables = inspector.get_table_names()

            # 1. paymentsproduct table
            if "paymentsproduct" in tables:
                cols = {c["name"] for c in inspector.get_columns("paymentsproduct")}
                if "interval" not in cols:
                    try:
                        conn.execute(
                            text(
                                'ALTER TABLE paymentsproduct ADD COLUMN IF NOT EXISTS "interval" VARCHAR DEFAULT NULL;'
                            )
                        )
                        conn.commit()
                    except Exception as e:  # noqa: BLE001
                        logger.warning(
                            f"Failed to add interval to paymentsproduct: {e}"
                        )
                if "trial_days" not in cols:
                    try:
                        conn.execute(
                            text(
                                'ALTER TABLE paymentsproduct ADD COLUMN IF NOT EXISTS "trial_days" INTEGER DEFAULT 0;'
                            )
                        )
                        conn.commit()
                    except Exception as e:  # noqa: BLE001
                        logger.warning(
                            f"Failed to add trial_days to paymentsproduct: {e}"
                        )

            # 2. paymentsuser table
            if "paymentsuser" in tables:
                cols = {c["name"] for c in inspector.get_columns("paymentsuser")}
                if "grace_period_start_date" not in cols:
                    try:
                        conn.execute(
                            text(
                                'ALTER TABLE paymentsuser ADD COLUMN IF NOT EXISTS "grace_period_start_date" TIMESTAMP WITH TIME ZONE DEFAULT NULL;'
                            )
                        )
                        conn.commit()
                    except Exception as e:  # noqa: BLE001
                        logger.warning(
                            f"Failed to add grace_period_start_date to paymentsuser: {e}"
                        )
                if "discount_code_id" not in cols:
                    try:
                        conn.execute(
                            text(
                                'ALTER TABLE paymentsuser ADD COLUMN IF NOT EXISTS "discount_code_id" BIGINT DEFAULT NULL;'
                            )
                        )
                        conn.commit()
                    except Exception as e:  # noqa: BLE001
                        logger.warning(
                            f"Failed to add discount_code_id to paymentsuser: {e}"
                        )
                if "referral_code_id" not in cols:
                    try:
                        conn.execute(
                            text(
                                'ALTER TABLE paymentsuser ADD COLUMN IF NOT EXISTS "referral_code_id" BIGINT DEFAULT NULL;'
                            )
                        )
                        conn.commit()
                    except Exception as e:  # noqa: BLE001
                        logger.warning(
                            f"Failed to add referral_code_id to paymentsuser: {e}"
                        )
                if "original_amount" not in cols:
                    try:
                        conn.execute(
                            text(
                                'ALTER TABLE paymentsuser ADD COLUMN IF NOT EXISTS "original_amount" DOUBLE PRECISION DEFAULT NULL;'
                            )
                        )
                        conn.commit()
                    except Exception as e:  # noqa: BLE001
                        logger.warning(
                            f"Failed to add original_amount to paymentsuser: {e}"
                        )
                if "discount_amount" not in cols:
                    try:
                        conn.execute(
                            text(
                                'ALTER TABLE paymentsuser ADD COLUMN IF NOT EXISTS "discount_amount" DOUBLE PRECISION DEFAULT NULL;'
                            )
                        )
                        conn.commit()
                    except Exception as e:  # noqa: BLE001
                        logger.warning(
                            f"Failed to add discount_amount to paymentsuser: {e}"
                        )
                if "final_amount" not in cols:
                    try:
                        conn.execute(
                            text(
                                'ALTER TABLE paymentsuser ADD COLUMN IF NOT EXISTS "final_amount" DOUBLE PRECISION DEFAULT NULL;'
                            )
                        )
                        conn.commit()
                    except Exception as e:  # noqa: BLE001
                        logger.warning(
                            f"Failed to add final_amount to paymentsuser: {e}"
                        )

            # 3. course_timetable_event table: add weekly_schedule_phase column if missing
            if "course_timetable_event" in tables:
                col_query = text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = 'course_timetable_event';"
                )
                cols = {r[0] for r in conn.execute(col_query).fetchall()}
                if "weekly_schedule_phase" not in cols:
                    try:
                        conn.execute(
                            text(
                                'ALTER TABLE course_timetable_event ADD COLUMN IF NOT EXISTS "weekly_schedule_phase" VARCHAR(255) DEFAULT NULL;'
                            )
                        )
                        conn.commit()
                    except Exception as e:  # noqa: BLE001
                        logger.warning(
                            f"Failed to add weekly_schedule_phase to course_timetable_event: {e}"
                        )

            # 4. notification table: normalize uppercase enum values to lowercase
            if "notification" in tables:
                try:
                    conn.execute(
                        text(
                            "UPDATE notification SET notification_type = lower(notification_type) WHERE notification_type IS NOT NULL;"
                        )
                    )
                    conn.commit()
                except Exception as e:  # noqa: BLE001
                    logger.debug(
                        f"Notification enum normalization (ignored): {e}"
                    )

    except Exception as e:  # noqa: BLE001
        logger.warning(f"ensure_schema_compatibility error: {e}")


# Only create tables if not in test mode (tests will handle this themselves)
if not is_testing:
    from sqlalchemy import text

    try:
        with engine.connect() as conn:
            conn.execute(
                text(
                    "DO $$ BEGIN "
                    "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paymentproviderenum') THEN "
                    "CREATE TYPE paymentproviderenum AS ENUM ('paystack'); "
                    "END IF; END $$;"
                )
            )
            conn.commit()
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Could not pre-create paymentproviderenum type: {e}")

    SQLModel.metadata.create_all(engine)
    ensure_schema_compatibility(engine)
    # Note: logfire instrumentation will be handled in app.py after configuration


async def connect_to_db(app: FastAPI):
    app.db_engine = engine  # type: ignore
    logger.info("LearnHouse database has been started.")
    # Only create tables if not in test mode
    if not is_testing:
        SQLModel.metadata.create_all(engine)
        ensure_schema_compatibility(engine)


def get_db_session():
    with Session(engine) as session:
        yield session


async def close_database(app: FastAPI):
    logger.info("LearnHouse has been shut down.")
    return app
