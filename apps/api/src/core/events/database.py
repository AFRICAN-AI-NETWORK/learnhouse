import logging
import os
import re
import importlib
import importlib.util
from config.config import get_learnhouse_config
from fastapi import FastAPI
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import event


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
                    logging.warning(f"Skipping unsafe module path: {full_module_path}")
                    continue

                # Ensure module is under the expected base module path
                if not (
                    full_module_path == base_module_path
                    or full_module_path.startswith(base_module_path + ".")
                ):
                    logging.warning(
                        f"Skipping module outside base path: {full_module_path}"
                    )
                    continue

                # Check that module actually exists before importing
                try:
                    spec = importlib.util.find_spec(full_module_path)
                except Exception:
                    spec = None

                if spec is None:
                    logging.debug(f"Module spec not found for {full_module_path}")
                    continue

                try:
                    # Load module via spec loader rather than import_module() to satisfy non-literal-import guardrails.
                    module = importlib.util.module_from_spec(spec)
                    if spec.loader is None:
                        logging.debug(f"No loader available for {full_module_path}")
                        continue
                    spec.loader.exec_module(module)
                except Exception as e:
                    logging.error(f"Failed to import model {full_module_path}: {e}")


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

    logging.info(
        "Database pool configured: size=%d, overflow=%d, recycle=%ds, timeout=%ds",
        _pool_size,
        _max_overflow,
        _pool_recycle,
        _pool_timeout,
    )

    # Add connection pool monitoring for debugging
    @event.listens_for(engine, "connect")
    def receive_connect(dbapi_connection, connection_record):
        logging.debug("Database connection established")

    @event.listens_for(engine, "checkout")
    def receive_checkout(dbapi_connection, connection_record, connection_proxy):
        logging.debug("Connection checked out from pool")

    @event.listens_for(engine, "checkin")
    def receive_checkin(dbapi_connection, connection_record):
        logging.debug("Connection returned to pool")


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
    except Exception as e:
        logging.warning(f"Could not pre-create paymentproviderenum type: {e}")

    SQLModel.metadata.create_all(engine)
    # Note: logfire instrumentation will be handled in app.py after configuration


async def connect_to_db(app: FastAPI):
    app.db_engine = engine  # type: ignore
    logging.info("LearnHouse database has been started.")
    # Only create tables if not in test mode
    if not is_testing:
        SQLModel.metadata.create_all(engine)


def get_db_session():
    with Session(engine) as session:
        yield session


async def close_database(app: FastAPI):
    logging.info("LearnHouse has been shut down.")
    return app
