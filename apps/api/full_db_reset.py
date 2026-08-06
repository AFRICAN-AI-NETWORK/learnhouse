import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv

load_dotenv()

from pydantic import EmailStr
from sqlmodel import Session, SQLModel, create_engine, text
from src.db.models import *  # This imports all SQLModels so metadata has them

from src.db.organizations import OrganizationCreate
from src.db.users import UserCreate
from src.services.setup.setup import (
    install_create_organization,
    install_create_organization_user,
    install_default_elements,
)

DATABASE_URL = os.getenv("LEARNHOUSE_SQL_CONNECTION_STRING")
engine = create_engine(DATABASE_URL, isolation_level="AUTOCOMMIT")

print("Dropping public schema...")
with engine.connect() as conn:
    conn.execute(text("DROP SCHEMA public CASCADE;"))
    conn.execute(text("CREATE SCHEMA public;"))
    conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))

print("Creating all tables via SQLModel metadata...")
engine2 = create_engine(DATABASE_URL)
SQLModel.metadata.create_all(engine2)

print("Running Alembic Stamp Head to tell alembic we are up to date...")
os.system("alembic stamp head")

print("Seeding default elements and admin user...")
db_session = Session(engine2)
install_default_elements(db_session)

org = OrganizationCreate(
    name="Default Organization",
    description="Default Organization",
    slug="default",
    email="",
    logo_image="",
    thumbnail_image="",
    about="",
    label="",
)
install_create_organization(org, db_session)

email = os.environ.get("LEARNHOUSE_INITIAL_ADMIN_EMAIL", "admin@school.dev")
password = os.environ.get("LEARNHOUSE_INITIAL_ADMIN_PASSWORD", "change_this_password")
user = UserCreate(username="admin", email=EmailStr(email), password=password)
install_create_organization_user(user, "default", db_session)

# Force verify the admin email
from src.db.users import User

admin_db = db_session.query(User).filter(User.email == email).first()
if admin_db:
    admin_db.email_verified = True
    db_session.add(admin_db)
    db_session.commit()

print("Database reset and seeded successfully! You can login with:")
print(f"Email: {email}")
print(f"Password: {password}")
