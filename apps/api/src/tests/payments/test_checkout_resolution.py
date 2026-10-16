"""
Unit tests for resolve_payment_product_and_course in ee.routers.payments.
Verifies resolution of checkout identifiers across:
1. Direct product ID
2. Product name / slug (e.g. 'aina-pro-subscription')
3. Course UUID (with and without 'course_' prefix)
4. Course name / slug (e.g. 'career-accelerator')
5. Auto-linking of PaymentsCourse when course matches product name
"""

from sqlmodel import Session, select

from ee.routers.payments import resolve_payment_product_and_course
from src.db.courses.courses import Course
from src.db.organizations import Organization
from src.db.payments.payments import PaymentsConfig
from src.db.payments.payments_courses import PaymentsCourse
from src.db.payments.payments_products import (
    PaymentPriceTypeEnum,
    PaymentProductTypeEnum,
    PaymentsProduct,
)


def test_resolve_by_direct_product_id(
    db_session: Session, mock_org: Organization, mock_payments_config: PaymentsConfig
):
    prod = PaymentsProduct(
        name="Direct Course Product",
        org_id=mock_org.id,
        payments_config_id=mock_payments_config.id,
        provider_product_id="prod_direct_1",
        product_type=PaymentProductTypeEnum.ONE_TIME,
        price_type=PaymentPriceTypeEnum.FIXED_PRICE,
        amount=50.0,
        currency="USD",
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    product_id, course = resolve_payment_product_and_course(
        str(prod.id), mock_org.id, db_session
    )
    assert product_id == prod.id


def test_resolve_by_product_slug_subscription(
    db_session: Session, mock_org: Organization, mock_payments_config: PaymentsConfig
):
    prod = PaymentsProduct(
        name="AINA Pro Subscription",
        org_id=mock_org.id,
        payments_config_id=mock_payments_config.id,
        provider_product_id="sub_aina_pro",
        product_type=PaymentProductTypeEnum.SUBSCRIPTION,
        price_type=PaymentPriceTypeEnum.FIXED_PRICE,
        amount=10.0,
        currency="USD",
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    product_id, course = resolve_payment_product_and_course(
        "aina-pro-subscription", mock_org.id, db_session
    )
    assert product_id == prod.id


def test_resolve_by_course_uuid_and_prefix(
    db_session: Session, mock_org: Organization, mock_payments_config: PaymentsConfig
):
    course = Course(
        name="AI Automation for Content Creators",
        course_uuid="course_ai_automation_999",
        org_id=mock_org.id,
        public=True,
        open_to_contributors=False,
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    prod = PaymentsProduct(
        name="AI Automation Product",
        org_id=mock_org.id,
        payments_config_id=mock_payments_config.id,
        provider_product_id="prod_ai_auto",
        product_type=PaymentProductTypeEnum.ONE_TIME,
        price_type=PaymentPriceTypeEnum.FIXED_PRICE,
        amount=99.0,
        currency="USD",
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    pc = PaymentsCourse(
        course_id=course.id, payment_product_id=prod.id, org_id=mock_org.id
    )
    db_session.add(pc)
    db_session.commit()

    # Exact course_uuid
    product_id, matched_course = resolve_payment_product_and_course(
        "course_ai_automation_999", mock_org.id, db_session
    )
    assert product_id == prod.id
    assert matched_course.id == course.id

    # Without 'course_' prefix
    product_id_noprefix, _ = resolve_payment_product_and_course(
        "ai_automation_999", mock_org.id, db_session
    )
    assert product_id_noprefix == prod.id


def test_resolve_by_course_slug_and_autolink(
    db_session: Session, mock_org: Organization, mock_payments_config: PaymentsConfig
):
    course = Course(
        name="Career Accelerator",
        course_uuid="course_career_acc_111",
        org_id=mock_org.id,
        public=True,
        open_to_contributors=False,
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    prod = PaymentsProduct(
        name="Career Accelerator",
        org_id=mock_org.id,
        payments_config_id=mock_payments_config.id,
        provider_product_id="prod_career_acc",
        product_type=PaymentProductTypeEnum.ONE_TIME,
        price_type=PaymentPriceTypeEnum.FIXED_PRICE,
        amount=20.0,
        currency="USD",
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    # Resolution by slug 'career-accelerator'
    product_id, matched_course = resolve_payment_product_and_course(
        "career-accelerator", mock_org.id, db_session
    )
    assert product_id == prod.id
    assert matched_course is not None
    assert matched_course.id == course.id

    # Verify PaymentsCourse was automatically linked
    linked_pc = db_session.exec(
        select(PaymentsCourse).where(
            PaymentsCourse.course_id == course.id,
            PaymentsCourse.payment_product_id == prod.id,
        )
    ).first()
    assert linked_pc is not None
