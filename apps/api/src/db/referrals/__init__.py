# Referral system database models
from src.db.referrals.referral_codes import ReferralCode
from src.db.referrals.referral_commissions import (
    ReferralCommission,
    CommissionStatus,
    CommissionType,
)
from src.db.referrals.referral_tracking import ReferralTracking
from src.db.referrals.payout_requests import (
    ReferrerPayoutRequest,
    PayoutStatus,
)
from src.db.referrals.email_domain_lists import (
    EmailDomainList,
    DomainListType,
)
from src.db.referrals.marketers import Marketer, MarketerStatus
from src.db.referrals.marketer_payment_methods import (
    MarketerPaymentMethod,
    PaymentMethodType,
)
from src.db.referrals.marketer_kyc import (
    MarketerKYC,
    KYCStatus,
    KYCDocumentType,
)

__all__ = [
    "ReferralCode",
    "ReferralCommission",
    "CommissionStatus",
    "CommissionType",
    "ReferralTracking",
    "ReferrerPayoutRequest",
    "PayoutStatus",
    "EmailDomainList",
    "DomainListType",
    "Marketer",
    "MarketerStatus",
    "MarketerPaymentMethod",
    "PaymentMethodType",
    "MarketerKYC",
    "KYCStatus",
    "KYCDocumentType",
]
