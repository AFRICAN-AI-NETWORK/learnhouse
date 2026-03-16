from sqlmodel import Session, select, create_engine
import os
from src.db.roles import Role
from src.db.users import User
from src.db.user_organizations import UserOrganization

if __name__ == "__main__":
    db_url = "postgresql://learnhouse:learnhouse@localhost:5432/learnhouse"
    engine = create_engine(db_url)
    with Session(engine) as session:
        roles = session.exec(select(Role)).all()
        print("--- ALL ROLES ---")
        for r in roles:
            print(f"'{r.name}' (ID: {r.id})")
        
        users_in_org = session.exec(
            select(User.email, Role.name)
            .join(UserOrganization, User.id == UserOrganization.user_id)
            .join(Role, UserOrganization.role_id == Role.id)
            .where(UserOrganization.org_id == 1)
        ).all()
        print("\n--- USERS IN ORG 1 ---")
        for email, role_name in users_in_org:
            print(f"User: {email}, Role: {role_name}")
