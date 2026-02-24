import sys
import os

# Add the project root and apps/api to path
sys.path.append(os.getcwd())

from sqlmodel import Session, select
from src.core.events.database import engine
from src.db.payments.payments_products import PaymentsProduct
from src.db.payments.payments_courses import PaymentsCourse
from src.db.courses.courses import Course

def check_products():
    with Session(engine) as session:
        statement = select(PaymentsProduct)
        products = session.exec(statement).all()
        
        print(f"{'ID':<5} {'Name':<30} {'Amount':<10} {'Currency':<10}")
        print("-" * 60)
        
        for p in products:
            print(f"{p.id:<5} {p.name:<30} {p.amount:<10} {p.currency:<10}")
            
            # Check linked courses
            course_stmt = select(PaymentsCourse).where(PaymentsCourse.payment_product_id == p.id)
            links = session.exec(course_stmt).all()
            for link in links:
                course = session.get(Course, link.course_id)
                if course:
                    print(f"  -> Linked Course: {course.name} ({course.course_uuid})")

if __name__ == "__main__":
    check_products()
