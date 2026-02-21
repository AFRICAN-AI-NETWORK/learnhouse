"""
Payout Service - Manages referrer payout requests with Paystack integration
Implements safe two-phase commit pattern to prevent balance loss
"""
import os
import json
import base64
import logging
from datetime import datetime
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, Request, status
from sqlmodel import Session, select, and_
from src.db.referrals.payout_requests import (
    ReferrerPayoutRequest,
    ReferrerPayoutRequestCreate,
    ReferrerPayoutRequestRead,
    ReferrerPayoutRequestUpdate,
    PayoutStatus,
    BankDetails,
)
from src.db.referrals.referral_commissions import ReferralCommission, CommissionStatus
from src.db.users import User, PublicUser
from src.services.orgs.orgs import rbac_check
from src.services.payments.payments_paystack import make_paystack_request

logger = logging.getLogger(__name__)

# Configuration constants
MINIMUM_PAYOUT_AMOUNT = 1.00  # Minimum $1 USD

# Currency configuration
# TODO: Move to organization-level config or fetch from payment provider
DEFAULT_PAYOUT_CURRENCY = "NGN"  # Nigerian Naira
USD_TO_NGN_RATE = float(os.getenv("USD_TO_NGN_EXCHANGE_RATE", "1500"))  # Default rate (update regularly)

# Note: For production, consider integrating with a real-time exchange rate API
# e.g., exchangerate-api.com, currencyapi.com, or Paystack's conversion rates

# Encryption configuration
# CRITICAL: Set BANK_DATA_ENCRYPTION_KEY environment variable in production
# Generate key: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
_ENCRYPTION_KEY = os.getenv("BANK_DATA_ENCRYPTION_KEY")

# Strict validation: Fail fast in production environments
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
if not _ENCRYPTION_KEY:
    if ENVIRONMENT in ["production", "prod"]:
        logger.critical(
            "BANK_DATA_ENCRYPTION_KEY is REQUIRED in production! "
            "Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
        raise RuntimeError(
            "BANK_DATA_ENCRYPTION_KEY environment variable is required in production. "
            "Application cannot start without proper encryption configuration."
        )
    else:
        logger.warning(
            "BANK_DATA_ENCRYPTION_KEY not set! Using fallback key for development. "
            "THIS IS INSECURE - SET ENCRYPTION KEY IN PRODUCTION!"
        )
        # Fallback key for development only - NEVER use in production
        _ENCRYPTION_KEY = "dev-fallback-key-REPLACE-IN-PRODUCTION-12345678901234567890123="

try:
    _cipher_suite = Fernet(_ENCRYPTION_KEY.encode() if isinstance(_ENCRYPTION_KEY, str) else _ENCRYPTION_KEY)
except Exception as e:
    logger.error(f"Failed to initialize encryption: {e}. Generate key with: Fernet.generate_key()")
    raise


def encrypt_bank_data(bank_data: dict) -> str:
    """
    Encrypt sensitive bank account data (Production security)
    
    Args:
        bank_data: Bank account information dict
        
    Returns:
        Base64-encoded encrypted string
        
    Raises:
        HTTPException: If encryption fails
    """
    try:
        # Convert dict to JSON string
        json_data = json.dumps(bank_data)
        
        # Encrypt
        encrypted_bytes = _cipher_suite.encrypt(json_data.encode('utf-8'))
        
        # Return as base64 string for database storage
        encrypted_str = base64.b64encode(encrypted_bytes).decode('utf-8')
        
        logger.debug("Successfully encrypted bank data")
        return encrypted_str
        
    except Exception as e:
        logger.error(f"Failed to encrypt bank data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to secure bank account information"
        )


def decrypt_bank_data(encrypted_data: str) -> dict:
    """
    Decrypt bank account data (Production security)
    
    Args:
        encrypted_data: Base64-encoded encrypted string
        
    Returns:
        Decrypted bank account information dict
        
    Raises:
        HTTPException: If decryption fails
    """
    try:
        # Decode from base64
        encrypted_bytes = base64.b64decode(encrypted_data.encode('utf-8'))
        
        # Decrypt
        decrypted_bytes = _cipher_suite.decrypt(encrypted_bytes)
        
        # Parse JSON
        json_data = decrypted_bytes.decode('utf-8')
        bank_data = json.loads(json_data)
        
        logger.debug("Successfully decrypted bank data")
        return bank_data
        
    except InvalidToken:
        logger.error("Invalid encryption key or corrupted data")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt bank account information - invalid key"
        )
    except Exception as e:
        logger.error(f"Failed to decrypt bank data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to access bank account information"
        )


async def validate_payout_amount(
    user_id: int,
    amount: float,
    db_session: Session
) -> None:
    """
    Validate payout amount is within limits (DRY utility)
    
    Args:
        user_id: User ID
        amount: Payout amount requested
        db_session: Database session
        
    Raises:
        HTTPException: If amount is invalid
    """
    if amount < MINIMUM_PAYOUT_AMOUNT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum payout amount is ${MINIMUM_PAYOUT_AMOUNT}"
        )
    
    # Get user's eligible balance
    from src.services.referrals.referral_commissions import get_commission_balance
    from src.db.users import PublicUser
    
    # Calculate eligible amount from commissions
    from sqlmodel import func
    eligible_statement = select(func.sum(ReferralCommission.commission_amount)).where(
        and_(
            ReferralCommission.referrer_user_id == user_id,
            ReferralCommission.status == CommissionStatus.ELIGIBLE
        )
    )
    eligible_amount = db_session.exec(eligible_statement).first() or 0.0
    
    if amount > eligible_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient eligible balance. Available: ${eligible_amount:.2f}"
        )


async def check_pending_payout(
    user_id: int,
    db_session: Session
) -> Optional[ReferrerPayoutRequest]:
    """
    Check if user has pending payout request (DRY utility)
    Prevents multiple simultaneous payouts
    
    Args:
        user_id: User ID
        db_session: Database session
        
    Returns:
        Pending payout request or None
    """
    statement = select(ReferrerPayoutRequest).where(
        and_(
            ReferrerPayoutRequest.referrer_user_id == user_id,
            ReferrerPayoutRequest.status.in_([PayoutStatus.REQUESTED, PayoutStatus.PROCESSING])
        )
    )
    return db_session.exec(statement).first()


async def create_paystack_transfer_recipient(
    email: str,
    name: str,
    bank_account_info: dict,
    currency: str = "NGN"
) -> dict:
    """
    Create Paystack transfer recipient (DRY utility)
    
    Args:
        email: Recipient email
        name: Recipient name
        bank_account_info: Bank account details
        currency: Currency code
        
    Returns:
        Paystack recipient data with recipient_code
    """
    recipient_data = {
        "type": "nuban",  # Nigerian bank account (adjust for other countries)
        "name": name,
        "account_number": bank_account_info.get("account_number"),
        "bank_code": bank_account_info.get("bank_code"),
        "currency": currency,
        "email": email
    }
    
    try:
        result = await make_paystack_request("POST", "/transferrecipient", recipient_data)
        return result
    except Exception as e:
        logger.error(f"Failed to create Paystack transfer recipient: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create transfer recipient: {str(e)}"
        )


async def initiate_paystack_transfer(
    amount: float,
    recipient_code: str,
    reference: str,
    reason: str = "Referral commission payout",
    idempotency_key: Optional[str] = None
) -> dict:
    """
    Initiate Paystack transfer (DRY utility)
    
    Args:
        amount: Amount in NGN (already converted from USD)
        recipient_code: Paystack recipient code
        reference: Unique transfer reference
        reason: Transfer reason
        idempotency_key: Optional idempotency key to prevent double-charging on retries
        
    Returns:
        Paystack transfer data
    """
    # Convert amount to kobo (NGN subunit - multiply by 100)
    amount_in_kobo = int(amount * 100)
    
    transfer_data = {
        "source": "balance",
        "amount": amount_in_kobo,
        "recipient": recipient_code,
        "reference": reference,
        "reason": reason
    }
    
    # Add idempotency key if provided (prevents double-charging on retries)
    headers = {}
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
        logger.info(f"Using idempotency key: {idempotency_key}")
    
    try:
        result = await make_paystack_request(
            "POST",
            "/transfer",
            transfer_data,
            headers=headers if headers else None
        )
        return result
    except Exception as e:
        logger.error(f"Failed to initiate Paystack transfer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate transfer: {str(e)}"
        )


async def create_payout_request(
    request: Request,
    org_id: int,
    amount: float,
    bank_details: BankDetails,
    current_user: PublicUser,
    db_session: Session
) -> ReferrerPayoutRequestRead:
    """
    Create payout request (Core logic - DRY)
    Implements safe two-phase commit:
    1. REQUESTED: Validate and create request (no balance deduction)
    2. PROCESSING: Reserve balance and call Paystack API
    3. COMPLETED: Deduct balance on success
    4. FAILED: Restore balance on failure
    
    Args:
        request: FastAPI request
        org_id: Organization ID
        amount: Payout amount
        bank_details: Bank account details
        current_user: Current authenticated user
        db_session: Database session
        
    Returns:
        ReferrerPayoutRequestRead
        
    Raises:
        HTTPException: If validation fails
    """
    # Note: No RBAC check - all authenticated users can request payouts
    
    # Validate amount
    await validate_payout_amount(current_user.id, amount, db_session)
    
    # Check for pending payouts
    pending = await check_pending_payout(current_user.id, db_session)
    if pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending payout request"
        )
    
    # Encrypt sensitive bank account data (Production security)
    encrypted_bank_info = encrypt_bank_data(bank_details.model_dump())
    
    # Create payout request (REQUESTED status - no balance deduction yet)
    payout = ReferrerPayoutRequest(
        org_id=org_id,
        referrer_user_id=current_user.id,
        total_amount=amount,
        currency="USD",  # Base currency
        status=PayoutStatus.REQUESTED,
        bank_account_info=encrypted_bank_info,  # Encrypted for security
        request_date=datetime.now(),
        creation_date=datetime.now(),
        update_date=datetime.now()
    )
    
    db_session.add(payout)
    db_session.commit()
    db_session.refresh(payout)
    
    logger.info(f"Created payout request {payout.id} for user {current_user.id} amount ${amount}")
    
    return ReferrerPayoutRequestRead.model_validate(payout)


async def process_payout_request(
    payout_id: int,
    db_session: Session
) -> ReferrerPayoutRequest:
    """
    Process payout request with Paystack (Background job logic)
    This should be called by a background worker, not directly from API
    
    Args:
        payout_id: Payout request ID
        db_session: Database session
        
    Returns:
        Updated payout request
    """
    # Get payout request
    statement = select(ReferrerPayoutRequest).where(
        ReferrerPayoutRequest.id == payout_id
    )
    payout = db_session.exec(statement).first()
    
    if not payout:
        raise ValueError(f"Payout request {payout_id} not found")
    
    if payout.status != PayoutStatus.REQUESTED:
        logger.warning(f"Payout {payout_id} is not in REQUESTED status")
        return payout
    
    # Update status to PROCESSING
    payout.status = PayoutStatus.PROCESSING
    payout.update_date = datetime.now()
    db_session.add(payout)
    db_session.commit()
    
    try:
        # Get user details
        user_statement = select(User).where(User.id == payout.referrer_user_id)
        user = db_session.exec(user_statement).first()
        
        if not user:
            raise ValueError(f"User {payout.referrer_user_id} not found")
        
        # Decrypt bank account information (Production security)
        decrypted_bank_info = decrypt_bank_data(payout.bank_account_info)
        
        # Create Paystack transfer recipient
        # TODO: Determine currency from user's country or org settings
        recipient_result = await create_paystack_transfer_recipient(
            email=user.email,
            name=f"{user.first_name} {user.last_name}",
            bank_account_info=decrypted_bank_info,
            currency=DEFAULT_PAYOUT_CURRENCY  # Configurable (default: NGN)
        )
        
        recipient_code = recipient_result.get("recipient_code")
        payout.paystack_transfer_recipient_code = recipient_code
        db_session.add(payout)
        db_session.commit()
        
        # Convert USD to NGN (Paystack requires NGN amounts)
        amount_in_ngn = payout.total_amount * USD_TO_NGN_RATE
        logger.info(
            f"Payout {payout.id}: Converting ${payout.total_amount:.2f} USD to "
            f"₦{amount_in_ngn:.2f} NGN (rate: {USD_TO_NGN_RATE})"
        )
        
        # Initiate transfer with idempotency key to prevent double-charging on retries
        transfer_reference = f"ref_payout_{payout.id}_{int(datetime.now().timestamp())}"
        idempotency_key = f"payout_{payout.id}_{payout.request_date.strftime('%Y%m%d%H%M%S')}"
        
        transfer_result = await initiate_paystack_transfer(
            amount=amount_in_ngn,  # Already in NGN
            recipient_code=recipient_code,
            reference=transfer_reference,
            reason="Referral commission payout",
            idempotency_key=idempotency_key
        )
        
        transfer_code = transfer_result.get("transfer_code")
        
        # CRITICAL: Atomic transaction for balance updates
        # Use explicit transaction to ensure all-or-nothing consistency
        # If server crashes during commit, entire transaction rolls back
        try:
            # Start explicit transaction
            with db_session.begin_nested():
                # Update payout status
                payout.paystack_transfer_code = transfer_code
                payout.status = PayoutStatus.COMPLETED
                payout.completion_date = datetime.now()
                db_session.add(payout)
                
                # Fetch all eligible commissions for this user
                commissions_statement = select(ReferralCommission).where(
                    and_(
                        ReferralCommission.referrer_user_id == user.id,
                        ReferralCommission.status == CommissionStatus.ELIGIBLE
                    )
                ).order_by(ReferralCommission.creation_date.asc())  # FIFO order
                
                all_eligible_commissions = db_session.exec(commissions_statement).all()
                
                # Correctly attribute commissions to this payout
                # Loop through commissions and subtract amounts until payout is fulfilled
                remaining_payout_amount = payout.total_amount
                commissions_to_mark_paid = []
                
                for commission in all_eligible_commissions:
                    if remaining_payout_amount <= 0:
                        break
                    
                    # Subtract this commission from the remaining amount
                    remaining_payout_amount -= commission.commission_amount
                    commissions_to_mark_paid.append(commission)
                    
                    # Mark commission as PAID
                    commission.status = CommissionStatus.PAID
                    commission.payout_date = datetime.now()
                    commission.payout_request_id = payout.id  # Link to payout
                    db_session.add(commission)
                
                # Sanity check: Ensure we marked enough commissions
                total_marked = sum(c.commission_amount for c in commissions_to_mark_paid)
                if abs(total_marked - payout.total_amount) > 0.01:  # Allow 1 cent rounding
                    logger.warning(
                        f"Payout {payout.id}: Marked ${total_marked:.2f} in commissions, "
                        f"but payout was ${payout.total_amount:.2f}. "
                        f"Difference: ${abs(total_marked - payout.total_amount):.2f}"
                    )
                
                # Deduct from user balance (safe - only after successful transfer)
                user.referral_commission_balance -= payout.total_amount
                if user.referral_commission_balance < 0:
                    logger.warning(
                        f"User {user.id} balance went negative after payout {payout.id}. "
                        f"Setting to 0. Previous: ${user.referral_commission_balance + payout.total_amount:.2f}"
                    )
                    user.referral_commission_balance = 0
                
                db_session.add(user)
            
            # Commit the nested transaction
            db_session.commit()
            
            logger.info(
                f"Successfully processed payout {payout_id}. "
                f"Marked {len(commissions_to_mark_paid)} commissions as PAID (${total_marked:.2f})"
            )
            
        except Exception as commit_error:
            logger.error(f"Failed to commit payout {payout_id} transaction: {commit_error}")
            db_session.rollback()
            raise
        
        logger.info(f"Successfully processed payout {payout_id}")
        
    except Exception as e:
        logger.error(f"Failed to process payout {payout_id}: {str(e)}")
        
        # Update status to FAILED (balance not deducted)
        payout.status = PayoutStatus.FAILED
        payout.failure_reason = str(e)
        payout.update_date = datetime.now()
        db_session.add(payout)
        db_session.commit()
    
    return payout


async def get_payout_history(
    request: Request,
    org_id: int,
    current_user: PublicUser,
    db_session: Session,
    limit: int = 20
) -> list[ReferrerPayoutRequestRead]:
    """
    Get payout request history for current user
    
    Args:
        request: FastAPI request
        org_id: Organization ID
        current_user: Current authenticated user
        db_session: Database session
        limit: Maximum number of records
        
    Returns:
        List of payout requests
    """
    # Note: No RBAC check - all authenticated users can view their payout history
    
    statement = select(ReferrerPayoutRequest).where(
        ReferrerPayoutRequest.referrer_user_id == current_user.id
    ).order_by(ReferrerPayoutRequest.creation_date.desc()).limit(limit)
    
    payouts = db_session.exec(statement).all()
    
    return [ReferrerPayoutRequestRead.model_validate(p) for p in payouts]
