from src.db.referrals.marketer_payment_methods import (
    MarketerPaymentMethod,
    MarketerPaymentMethodRead,
    PaymentMethodType,
)

"""
Payout Service - Manages referrer payout requests with Paystack integration
Implements safe two-phase commit pattern to prevent balance loss
"""

import base64
import json
import logging
import os
from datetime import UTC, datetime

import httpx
import redis
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, Request, status
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import RedisError
from sqlmodel import Session, and_, select

from config.config import get_learnhouse_config
from src.db.referrals.payout_requests import (
    BankDetails,
    PayoutStatus,
    ReferrerPayoutRequest,
    ReferrerPayoutRequestRead,
)
from src.db.referrals.referral_commissions import CommissionStatus, ReferralCommission
from src.db.users import PublicUser, User
from src.services.payments.payments_paystack import make_paystack_request

logger = logging.getLogger(__name__)

# Configuration constants
MINIMUM_PAYOUT_AMOUNT = 1.00  # Minimum $1 USD

# Currency configuration
# Dynamically determined from user's country or organization settings
DEFAULT_PAYOUT_CURRENCY = "NGN"  # Fallback: Nigerian Naira
FALLBACK_USD_TO_NGN_RATE = float(
    os.getenv("USD_TO_NGN_EXCHANGE_RATE", "1500")
)  # Fallback if API fails
EXCHANGE_RATE_API_KEY = os.getenv(
    "EXCHANGE_RATE_API_KEY"
)  # Optional: exchangerate-api.com key
EXCHANGE_RATE_CACHE_TTL = 3600  # Cache rate for 1 hour (reduce API calls)

# Country to currency mapping (expandable for multi-currency support)
COUNTRY_TO_CURRENCY = {
    "NG": "NGN",  # Nigeria → Naira
    "GH": "GHS",  # Ghana → Cedi
    "KE": "KES",  # Kenya → Shilling
    "ZA": "ZAR",  # South Africa → Rand
    "US": "USD",  # United States → Dollar
    "GB": "GBP",  # United Kingdom → Pound
    "EU": "EUR",  # European Union → Euro
    "RW": "RWF",  # Rwanda
    "TZ": "TZS",  # Tanzania
    "UG": "UGX",  # Uganda
    "CI": "XOF",  # Ivory Coast
    "EG": "EGP",  # Egypt
}

CURRENCY_TO_PAYSTACK_RECIPIENT_TYPE = {
    "NGN": "nuban",
    "GHS": "ghipss",
    "KES": "mobile_money",
    "ZAR": "basa",
    "RWF": "mobile_money",
    "TZS": "mobile_money",
    "XOF": "mobile_money",
    "EGP": "nuban",
    "USD": "nuban",
}

# Redis configuration for distributed caching (multi-worker support)
_config = get_learnhouse_config()
REDIS_URL = (
    os.getenv("REDIS_URL")
    or _config.redis_config.redis_connection_string
    or "redis://localhost:6379/0"
)
REDIS_ENABLED = os.getenv("REDIS_ENABLED", "true").lower() in ("true", "1", "yes")

# Initialize Redis client with connection pooling
_redis_client = None
if REDIS_ENABLED:
    try:
        _redis_client = redis.Redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30,
        )
        # Test connection
        _redis_client.ping()
        logger.info("Redis connected successfully for exchange rate caching")
    except (RedisError, RedisConnectionError) as e:
        logger.warning(f"Redis connection failed: {e}. Using in-memory cache fallback.")
        _redis_client = None

# Fallback in-memory cache (used when Redis is unavailable)
_exchange_rate_cache = {}

# Encryption configuration
_ENCRYPTION_KEY = os.getenv("BANK_DATA_ENCRYPTION_KEY")
if not _ENCRYPTION_KEY and getattr(_config.general_config, "development_mode", False):
    from cryptography.fernet import Fernet

    _ENCRYPTION_KEY = Fernet.generate_key().decode()
    logger.warning(
        "No BANK_DATA_ENCRYPTION_KEY set — using auto-generated ephemeral key (dev only)"
    )

# Strict validation: Fail fast if encryption key is missing
if not _ENCRYPTION_KEY:
    logger.critical(
        "BANK_DATA_ENCRYPTION_KEY is REQUIRED! "
        'Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'
    )
    raise RuntimeError(
        "BANK_DATA_ENCRYPTION_KEY environment variable is required. "
        "Application cannot start without proper encryption configuration."
    )

try:
    _cipher_suite = Fernet(
        _ENCRYPTION_KEY.encode()
        if isinstance(_ENCRYPTION_KEY, str)
        else _ENCRYPTION_KEY
    )
except Exception as e:
    logger.error(
        f"Failed to initialize encryption: {e}. Generate key with: Fernet.generate_key()"
    )
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
        encrypted_bytes = _cipher_suite.encrypt(json_data.encode("utf-8"))

        # Return as base64 string for database storage
        encrypted_str = base64.b64encode(encrypted_bytes).decode("utf-8")

        logger.debug("Successfully encrypted bank data")
        return encrypted_str

    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to encrypt bank data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to secure bank account information",
        )


async def get_payout_currency(
    user: User, org_id: int | None = None, db_session: Session | None = None
) -> str:
    """
    Determine payout currency from user's country or organization settings

    Users can set their country in profile.country to automatically determine payout currency.

    How to set country:
    - Frontend: PUT /api/v1/users/{id} with body: {"profile": {"country": "NG"}}
    - Supported countries: NG (NGN), GH (GHS), KE (KES), ZA (ZAR), US (USD), GB (GBP), EU (EUR)

    Priority:
    1. User's country (from profile.country or details.country)
    2. Organization's default payout currency (future enhancement)
    3. DEFAULT_PAYOUT_CURRENCY fallback (NGN)

    Args:
        user: User object
        org_id: Organization ID (optional)
        db_session: Database session (optional, for org config lookup)

    Returns:
        str: Currency code (e.g., "NGN", "GHS", "USD")
    """
    # Option 1: Check user's country from profile
    user_country = None
    if user.profile and isinstance(user.profile, dict):
        user_country = user.profile.get("country")
    elif user.details and isinstance(user.details, dict):
        user_country = user.details.get("country")

    if user_country:
        # Normalize country code (uppercase, 2-letter)
        country_code = user_country.upper()[:2]
        if country_code in COUNTRY_TO_CURRENCY:
            currency = COUNTRY_TO_CURRENCY[country_code]
            logger.info(
                f"User {user.id}: Using currency {currency} based on country {country_code}"
            )
            return currency
        else:
            # Country not supported yet
            logger.warning(
                f"User {user.id}: Country '{country_code}' not supported for payouts. "
                f"Supported countries: {', '.join(COUNTRY_TO_CURRENCY.keys())}. "
                f"Falling back to {DEFAULT_PAYOUT_CURRENCY}. "
                f"User should update profile.country to a supported code or we should add {country_code} support."
            )
    else:
        # No country set
        logger.info(
            f"User {user.id}: No country set in profile. "
            f"Recommend prompting user to set profile.country for local currency payouts. "
            f"Using default currency: {DEFAULT_PAYOUT_CURRENCY}"
        )

    # Option 3: Fallback to default
    return DEFAULT_PAYOUT_CURRENCY


async def get_usd_to_currency_exchange_rate(target_currency: str = "NGN") -> float:
    """
    Fetch real-time USD to NGN exchange rate from API with Redis caching

    Uses Redis for distributed caching (multi-worker safe).
    Falls back to in-memory cache if Redis unavailable.
    Caches rate for 1 hour to reduce API calls.

    Returns:
        float: Current USD to NGN exchange rate

    Raises:
        HTTPException: If both API and fallback fail
    """
    global _exchange_rate_cache

    cache_key = f"exchange_rate:USD_{target_currency}"

    # Try Redis cache first (distributed, multi-worker safe)
    if _redis_client:
        try:
            cached_rate = _redis_client.get(cache_key)
            if cached_rate:
                rate = float(cached_rate)
                logger.debug(f"Using Redis cached exchange rate: {rate}")
                return rate
        except (RedisError, ValueError) as e:
            logger.warning(f"Redis cache read failed: {e}. Falling back to API.")

    # Fallback: Check in-memory cache (single-worker only)
    now = datetime.now(UTC)
    if _exchange_rate_cache.get("rate") and _exchange_rate_cache.get("timestamp"):
        cache_age = (now - _exchange_rate_cache["timestamp"]).total_seconds()
        if cache_age < EXCHANGE_RATE_CACHE_TTL:
            logger.debug(
                f"Using in-memory cached exchange rate: {_exchange_rate_cache['rate']} (age: {cache_age:.0f}s)"
            )
            return _exchange_rate_cache["rate"]

    # Try fetching from API
    try:
        import httpx

        # Option 1: exchangerate-api.com (free tier: 1500 requests/month)
        if EXCHANGE_RATE_API_KEY:
            url = f"https://v6.exchangerate-api.com/v6/{EXCHANGE_RATE_API_KEY}/pair/USD/{target_currency}"
        else:
            # Free endpoint (no key required, limited rate)
            url = "https://api.exchangerate-api.com/v4/latest/USD"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

            # Extract rate
            rate = None
            if EXCHANGE_RATE_API_KEY and "conversion_rate" in data:
                rate = float(data["conversion_rate"])
            elif "rates" in data and target_currency in data["rates"]:
                rate = float(data["rates"][target_currency])

            if rate:
                # Store in Redis cache with TTL (multi-worker safe)
                if _redis_client:
                    try:
                        _redis_client.setex(
                            cache_key,
                            EXCHANGE_RATE_CACHE_TTL,  # 1 hour TTL
                            str(rate),
                        )
                        logger.debug(f"Stored exchange rate in Redis: {rate}")
                    except RedisError as e:
                        logger.warning(f"Redis cache write failed: {e}")

                # Also update in-memory cache as fallback
                _exchange_rate_cache["rate"] = rate
                _exchange_rate_cache["timestamp"] = now

                logger.debug(
                    f"Redis cache hit for USD → {target_currency} exchange rate: {rate}"
                )
                return rate
            else:
                logger.warning(f"Unexpected API response format: {data}")

    except httpx.TimeoutException:
        logger.warning("Exchange rate API timeout. Using fallback rate.")
    except httpx.HTTPStatusError as e:
        logger.warning(f"Exchange rate API error: {e}. Falling back to default rate.")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Failed to fetch exchange rate: {e!s}. Using fallback rate.")

    # Fallbacks for other currencies if API fails
    fallback_map = {
        "NGN": FALLBACK_USD_TO_NGN_RATE,
        "GHS": float(os.getenv("USD_TO_GHS_RATE", "15")),
        "KES": float(os.getenv("USD_TO_KES_RATE", "130")),
        "ZAR": float(os.getenv("USD_TO_ZAR_RATE", "18")),
        "RWF": float(os.getenv("USD_TO_RWF_RATE", "1300")),
        "TZS": float(os.getenv("USD_TO_TZS_RATE", "2500")),
        "UGX": float(os.getenv("USD_TO_UGX_RATE", "3800")),
        "XOF": float(os.getenv("USD_TO_XOF_RATE", "600")),
        "EGP": float(os.getenv("USD_TO_EGP_RATE", "47")),
    }
    return fallback_map.get(target_currency, 1.0)


def decrypt_bank_data(encrypted_data: str | dict | None) -> dict:
    """
    Decrypt bank account data (Production security)

    Args:
        encrypted_data: Base64-encoded encrypted string

    Returns:
        Decrypted bank account information dict

    Raises:
        HTTPException: If decryption fails
    """
    if not encrypted_data:
        return {}
    if isinstance(encrypted_data, dict):
        return encrypted_data

    try:
        # Decode from base64
        encrypted_bytes = base64.b64decode(encrypted_data.encode("utf-8"))

        # Decrypt
        decrypted_bytes = _cipher_suite.decrypt(encrypted_bytes)

        # Parse JSON
        json_data = decrypted_bytes.decode("utf-8")
        bank_data = json.loads(json_data)

        logger.debug("Successfully decrypted bank data")
        return bank_data

    except InvalidToken:
        logger.error("Invalid encryption key or corrupted data")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt bank account information - invalid key",
        )
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to decrypt bank data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to access bank account information",
        )


async def validate_payout_amount(
    user_id: int, amount: float, db_session: Session, org_id: int = 1
) -> None:
    """
    Validate payout amount is within limits (DRY utility)

    Args:
        user_id: User ID
        amount: Payout amount requested
        db_session: Database session
        org_id: Organization ID

    Raises:
        HTTPException: If amount is invalid
    """
    from src.services.referrals.marketers import get_minimum_payout
    min_payout = await get_minimum_payout(user_id, org_id, db_session)
    if amount < min_payout:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "MKTR_301", "message": f"Minimum payout amount is ${min_payout:.2f}"},
        )

    # Get user's eligible balance

    # Calculate eligible amount from commissions
    from sqlmodel import func

    eligible_statement = select(func.sum(ReferralCommission.commission_amount)).where(
        and_(
            ReferralCommission.referrer_user_id == user_id,
            ReferralCommission.status == CommissionStatus.ELIGIBLE,
        )
    )
    eligible_amount = db_session.exec(eligible_statement).first() or 0.0

    if amount > eligible_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "MKTR_302", "message": f"Insufficient eligible balance. Available: ${eligible_amount:.2f}"},
        )


async def check_pending_payout(
    user_id: int, db_session: Session
) -> ReferrerPayoutRequest | None:
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
            ReferrerPayoutRequest.status.in_(
                [PayoutStatus.REQUESTED, PayoutStatus.APPROVED, PayoutStatus.PROCESSING]
            ),
        )
    )
    return db_session.exec(statement).first()


async def create_paystack_transfer_recipient(
    email: str, name: str, bank_account_info: dict, currency: str = "NGN"
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
        "type": CURRENCY_TO_PAYSTACK_RECIPIENT_TYPE.get(currency, "nuban"),
        "name": name,
        "account_number": bank_account_info.get("account_number"),
        "bank_code": bank_account_info.get("bank_code"),
        "currency": currency,
        "email": email,
    }

    try:
        result = await make_paystack_request(
            "POST", "/transferrecipient", recipient_data
        )
        return result
    except httpx.RequestError:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to create Paystack transfer recipient: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create transfer recipient: {e!s}",
        )


async def initiate_paystack_transfer(
    amount: float,
    recipient_code: str,
    reference: str,
    reason: str = "Referral commission payout",
    idempotency_key: str | None = None,
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
        "reason": reason,
    }

    # Add idempotency key if provided (prevents double-charging on retries)
    headers = {}
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
        logger.info(f"Using idempotency key: {idempotency_key}")

    try:
        result = await make_paystack_request(
            "POST", "/transfer", transfer_data, headers=headers if headers else None
        )
        return result
    except httpx.RequestError:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to initiate Paystack transfer: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate transfer: {e!s}",
        )


async def create_payout_request(
    request: Request,
    org_id: int,
    amount: float,
    bank_details: BankDetails | None,
    current_user: PublicUser,
    db_session: Session,
    use_saved_method: bool = False,
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
        bank_details: Bank account details (None when use_saved_method=True)
        current_user: Current authenticated user
        db_session: Database session
        use_saved_method: When True, the marketer's saved active payment method
            is used as the payout destination (KYC + payment method required)

    Returns:
        ReferrerPayoutRequestRead

    Raises:
        HTTPException: If validation fails
    """
    # Note: No RBAC check - all authenticated users can request payouts

    payout_details: dict | None = None

    if use_saved_method:
        # Marketer flow: KYC + saved payment method prerequisites
        # Lazy imports avoid circular dependency
        from src.services.referrals.marketer_kyc import validate_payout_prerequisites
        from src.services.referrals.marketers import get_marketer_by_user

        await validate_payout_prerequisites(current_user.id, org_id, db_session)

        marketer = await get_marketer_by_user(current_user.id, org_id, db_session)
        payment_method = await get_active_payment_method(marketer.id, db_session)
        if not payment_method:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "MKTR_304",
                    "message": "No payment method saved — add bank or mobile money details first",
                },
            )
        payout_details = decrypt_bank_data(payment_method.account_details)
        # Embed routing metadata so process_payout_request can pick the right
        # Paystack recipient type and reuse/cache the recipient code
        payout_details["_payment_method_id"] = payment_method.id
        payout_details["_payment_method_type"] = (
            payment_method.payment_method_type.value
        )
        payout_details["_currency"] = payment_method.currency
    elif bank_details is not None:
        payout_details = bank_details.model_dump()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "MKTR_304",
                "message": "Bank details are required",
                "field": "bank_details",
            },
        )

    # Validate amount (minimum is dynamic: marketer vs standard)
    await validate_payout_amount(current_user.id, amount, db_session, org_id)

    # Check for pending payouts
    pending = await check_pending_payout(current_user.id, db_session)
    if pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "MKTR_303",
                "message": "A payout is already in progress — wait for it to complete",
            },
        )

    # Encrypt sensitive bank account data (Production security).
    # The ciphertext is wrapped in a dict because bank_account_info is a
    # JSON/dict column — assigning a bare string is silently dropped to None
    # by the model layer, losing the bank details entirely.
    encrypted_bank_info = {"encrypted": encrypt_bank_data(payout_details)}

    # Create payout request (REQUESTED status - no balance deduction yet)
    payout = ReferrerPayoutRequest(
        org_id=org_id,
        referrer_user_id=current_user.id,
        total_amount=amount,
        currency="USD",  # Base currency
        status=PayoutStatus.REQUESTED,
        bank_account_info=encrypted_bank_info,  # Encrypted for security
        request_date=datetime.now(UTC),
        creation_date=datetime.now(UTC),
        update_date=datetime.now(UTC),
    )

    db_session.add(payout)
    db_session.commit()
    db_session.refresh(payout)

    logger.info(
        f"Created payout request {payout.id} for user {current_user.id} amount ${amount}"
    )

    return ReferrerPayoutRequestRead.model_validate(payout)


async def process_payout_request(
    payout_id: int, db_session: Session
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

    if payout.status != PayoutStatus.APPROVED:
        logger.warning(f"Payout {payout_id} is not in REQUESTED status")
        return payout

    # Update status to PROCESSING
    payout.status = PayoutStatus.PROCESSING
    payout.update_date = datetime.now(UTC)
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

        # Determine payout currency from user's country or org settings
        payout_currency = await get_payout_currency(
            user=user, org_id=payout.org_id, db_session=db_session
        )

        # Create Paystack transfer recipient with dynamic currency
        recipient_result = await create_paystack_transfer_recipient(
            email=user.email,
            name=f"{user.first_name} {user.last_name}",
            bank_account_info=decrypted_bank_info,
            currency=payout_currency,
        )

        recipient_code = recipient_result.get("recipient_code")
        payout.paystack_transfer_recipient_code = recipient_code
        db_session.add(payout)
        db_session.commit()

        # Fetch real-time USD to currency exchange rate
        if payout_currency == "USD":
            conversion_rate = 1.0
        else:
            conversion_rate = await get_usd_to_currency_exchange_rate(payout_currency)

        # Convert USD to local currency
        amount_in_local = payout.total_amount * conversion_rate
        logger.info(
            f"Payout {payout.id}: Converting ${payout.total_amount:.2f} USD to "
            f"{amount_in_local:.2f} {payout_currency} (rate: {conversion_rate})"
        )

        # Initiate transfer with idempotency key to prevent double-charging on retries
        transfer_reference = f"ref_payout_{payout.id}_{int(datetime.now(UTC).timestamp())}"
        idempotency_key = (
            f"payout_{payout.id}_{payout.request_date.strftime('%Y%m%d%H%M%S')}"
        )

        transfer_result = await initiate_paystack_transfer(
            amount=amount_in_local,
            recipient_code=recipient_code,
            reference=transfer_reference,
            reason="Referral commission payout",
            idempotency_key=idempotency_key,
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
                payout.converted_amount = amount_in_local
                payout.completion_date = datetime.now(UTC)
                db_session.add(payout)

                # Fetch all eligible commissions for this user
                commissions_statement = (
                    select(ReferralCommission)
                    .where(
                        and_(
                            ReferralCommission.referrer_user_id == user.id,
                            ReferralCommission.status == CommissionStatus.ELIGIBLE,
                        )
                    )
                    .order_by(ReferralCommission.creation_date.asc())
                )  # FIFO order

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
                    commission.payout_date = datetime.now(UTC)
                    commission.payout_request_id = payout.id  # Link to payout
                    db_session.add(commission)

                # Calculate total commissions marked
                total_marked = sum(
                    c.commission_amount for c in commissions_to_mark_paid
                )

                # CRITICAL: Prevent under-collateralized payouts
                # If eligible commissions don't fully cover payout, fail the transaction
                if remaining_payout_amount > 0.01:  # Allow 1 cent rounding tolerance
                    shortage = remaining_payout_amount
                    logger.error(
                        f"CRITICAL: Payout {payout.id} is under-collateralized! "
                        f"Requested: ${payout.total_amount:.2f}, "
                        f"Eligible commissions: ${total_marked:.2f}, "
                        f"Shortage: ${shortage:.2f}"
                    )
                    raise ValueError(
                        f"Insufficient eligible commissions to cover payout. "
                        f"Requested ${payout.total_amount:.2f} but only ${total_marked:.2f} available. "
                        f"Shortage: ${shortage:.2f}"
                    )

                # Sanity check: Log if we marked slightly more than payout (acceptable if < 1 cent)
                if total_marked > payout.total_amount:
                    overage = total_marked - payout.total_amount
                    if overage > 0.01:
                        logger.warning(
                            f"Payout {payout.id}: Marked ${total_marked:.2f} in commissions, "
                            f"but payout was ${payout.total_amount:.2f}. "
                            f"Overage: ${overage:.2f} (acceptable within rounding tolerance)"
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

        except ValueError as validation_error:
            # Under-collateralization or other validation errors
            logger.error(f"Payout {payout_id} validation failed: {validation_error}")
            db_session.rollback()

            # Mark payout as FAILED with reason
            payout.status = PayoutStatus.FAILED
            payout.failure_reason = str(validation_error)
            payout.update_date = datetime.now(UTC)
            db_session.add(payout)
            db_session.commit()

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(validation_error)
            )
        except Exception as commit_error:
            logger.error(
                f"Failed to commit payout {payout_id} transaction: {commit_error}"
            )
            db_session.rollback()
            raise

        logger.info(f"Successfully processed payout {payout_id}")

    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to process payout {payout_id}: {e!s}")

        try:
            is_transient_network_error = isinstance(
                e, (httpx.RequestError, httpx.TimeoutException, httpx.HTTPStatusError)
            )
        except Exception:
            is_transient_network_error = False

        if is_transient_network_error:
            _handle_payout_failure(payout, str(e), db_session)
        else:
            payout.status = PayoutStatus.FAILED
            payout.failure_reason = str(e)
            payout.update_date = datetime.now(UTC)
            db_session.add(payout)
            db_session.commit()

    return payout


async def get_payout_history(
    request: Request,
    org_id: int,
    current_user: PublicUser,
    db_session: Session,
    limit: int = 20,
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

    statement = (
        select(ReferrerPayoutRequest)
        .where(ReferrerPayoutRequest.referrer_user_id == current_user.id)
        .order_by(ReferrerPayoutRequest.creation_date.desc())
        .limit(limit)
    )

    payouts = db_session.exec(statement).all()

    return [ReferrerPayoutRequestRead.model_validate(p) for p in payouts]


MAX_PAYOUT_RETRIES = 3  # Transient Paystack failures retried before FAILED


def _handle_payout_failure(
    payout: ReferrerPayoutRequest, reason: str, db_session: Session
) -> None:
    payout.retry_count = (payout.retry_count or 0) + 1
    payout.last_retry_at = datetime.now(UTC)
    if payout.retry_count < MAX_PAYOUT_RETRIES:
        payout.status = PayoutStatus.APPROVED
        payout.failure_reason = (
            f"Attempt {payout.retry_count}/{MAX_PAYOUT_RETRIES} failed: {reason}"
        )
    else:
        payout.status = PayoutStatus.FAILED
        payout.failure_reason = (
            f"Failed after {MAX_PAYOUT_RETRIES} attempts: {reason}"
        )
    payout.update_date = datetime.now(UTC)
    db_session.add(payout)
    db_session.commit()


async def cache_paystack_recipient_code(
    payment_method_id: int, recipient_code: str, db_session: Session
) -> None:
    """
    Cache the Paystack recipient code on the saved payment method after
    first-time creation so subsequent payouts skip the /transferrecipient call.
    """
    payment_method = db_session.get(MarketerPaymentMethod, payment_method_id)
    if payment_method:
        payment_method.paystack_recipient_code = recipient_code
        payment_method.update_date = datetime.now(UTC)
        db_session.add(payment_method)
        db_session.commit()
        logger.info(
            f"Cached Paystack recipient code on payment method {payment_method_id}"
        )



async def reset_paystack_recipient_codes_for_user(
    user_id: int, db_session: Session
) -> None:
    """
    Invalidate cached Paystack recipient codes for all of a user's payment
    methods. Called when the user's country changes in their profile.
    """
    methods = db_session.exec(
        select(MarketerPaymentMethod).where(MarketerPaymentMethod.user_id == user_id)
    ).all()
    for method in methods:
        method.paystack_recipient_code = None
        method.update_date = datetime.now(UTC)
        db_session.add(method)
    if methods:
        db_session.commit()
        logger.info(
            f"Reset Paystack recipient codes on {len(methods)} payment methods "
            f"for user {user_id} (country change)"
        )



async def save_payment_method(
    marketer_id: int,
    user_id: int,
    org_id: int,
    payment_method_type: PaymentMethodType,
    country_code: str,
    account_details: dict,
    db_session: Session,
) -> MarketerPaymentMethod:
    """
    Save a marketer's payout destination (bank transfer or mobile money).
    Only one active method per marketer: previous methods are deactivated.
    Account details are Fernet-encrypted; the cached Paystack recipient code
    starts as None and is populated on first successful payout.

    Raises:
        HTTPException MKTR_351 — country not supported
        HTTPException MKTR_352/353 — method type unavailable for the country
        HTTPException MKTR_355 — a payout is currently PROCESSING
    """
    country_code = (country_code or "").upper()

    if country_code not in COUNTRY_TO_CURRENCY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "MKTR_351",
                "message": f"Country {country_code} is not supported for payouts",
                "field": "country_code",
            },
        )

    available = COUNTRY_TO_AVAILABLE_PAYMENT_METHODS.get(country_code, set())
    if payment_method_type not in available:
        error_code = (
            "MKTR_352"
            if payment_method_type == PaymentMethodType.MOBILE_MONEY
            else "MKTR_353"
        )
        method_label = (
            "Mobile money"
            if payment_method_type == PaymentMethodType.MOBILE_MONEY
            else "Bank transfer"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": error_code,
                "message": f"{method_label} is not available for {country_code}",
                "field": "payment_method_type",
            },
        )

    # Block changes while a payout is mid-flight against the current method
    processing = db_session.exec(
        select(ReferrerPayoutRequest).where(
            and_(
                ReferrerPayoutRequest.referrer_user_id == user_id,
                ReferrerPayoutRequest.status == PayoutStatus.PROCESSING,
            )
        )
    ).first()
    if processing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "MKTR_355",
                "message": "Cannot update payment method — a payout is currently processing",
            },
        )

    currency = COUNTRY_TO_CURRENCY[country_code]
    encrypted_details = encrypt_bank_data(account_details)

    # Deactivate all existing active methods (one active method at a time)
    existing_methods = db_session.exec(
        select(MarketerPaymentMethod).where(
            and_(
                MarketerPaymentMethod.marketer_id == marketer_id,
                MarketerPaymentMethod.is_active == True,
            )
        )
    ).all()
    for method in existing_methods:
        method.is_active = False
        method.update_date = datetime.now(UTC)
        db_session.add(method)

    payment_method = MarketerPaymentMethod(
        marketer_id=marketer_id,
        user_id=user_id,
        org_id=org_id,
        payment_method_type=payment_method_type,
        currency=currency,
        country_code=country_code,
        account_details=encrypted_details,
        paystack_recipient_code=None,
        is_active=True,
        creation_date=datetime.now(UTC),
        update_date=datetime.now(UTC),
    )
    db_session.add(payment_method)
    db_session.commit()
    db_session.refresh(payment_method)

    logger.info(
        f"Saved {payment_method_type.value} payment method {payment_method.id} "
        f"for marketer {marketer_id} ({country_code}/{currency})"
    )
    return payment_method



async def get_active_payment_method(
    marketer_id: int, db_session: Session
) -> MarketerPaymentMethod | None:
    """
    Get the marketer's active saved payment method (DRY utility)

    Args:
        marketer_id: Marketer ID
        db_session: Database session

    Returns:
        MarketerPaymentMethod or None if none saved
    """
    statement = select(MarketerPaymentMethod).where(
        and_(
            MarketerPaymentMethod.marketer_id == marketer_id,
            MarketerPaymentMethod.is_active == True,
        )
    )
    return db_session.exec(statement).first()



def _handle_payout_failure(
    payout: ReferrerPayoutRequest, reason: str, db_session: Session
) -> None:
    """
    Graceful payout retry (DRY utility)

    Transient Paystack failures are retried by the background job: the payout
    is set back to APPROVED so the next job run (every ~5-30 min) retries it.
    After MAX_PAYOUT_RETRIES the payout is marked FAILED permanently and the
    marketer + admin are notified. Balance is never deducted on failure.
    """
    payout.retry_count = (payout.retry_count or 0) + 1
    payout.last_retry_at = datetime.now(UTC)
    payout.failure_reason = reason[:2000] if reason else None
    payout.update_date = datetime.now(UTC)

    if payout.retry_count >= MAX_PAYOUT_RETRIES:
        payout.status = PayoutStatus.FAILED
        logger.error(
            f"Payout {payout.id} FAILED permanently after "
            f"{payout.retry_count} attempts: {reason}"
        )
        user = db_session.get(User, payout.referrer_user_id)
        if user:
            _send_marketer_payout_email_safe(
                payout, user, payout.currency, db_session, completed=False
            )
    else:
        # Back to APPROVED — background job retries on its next run
        payout.status = PayoutStatus.APPROVED
        logger.warning(
            f"Payout {payout.id} attempt {payout.retry_count}/"
            f"{MAX_PAYOUT_RETRIES} failed, will retry: {reason}"
        )

    db_session.add(payout)
    db_session.commit()

MAX_PAYOUT_RETRIES = 3

def build_masked_payment_method(
    payment_method: MarketerPaymentMethod,
) -> MarketerPaymentMethodRead:
    """
    Build the masked API representation of a payment method.
    Full account numbers never leave the service layer — only last 4 digits.
    """
    details = decrypt_bank_data(payment_method.account_details)

    if payment_method.payment_method_type == PaymentMethodType.MOBILE_MONEY:
        raw_number = details.get("phone_number") or ""
        holder = details.get("account_name")
        bank_name = None
        provider = details.get("provider")
    else:
        raw_number = details.get("account_number") or ""
        holder = details.get("account_holder")
        bank_name = details.get("bank_name")
        provider = None

    masked = f"****{raw_number[-4:]}" if raw_number else "****"

    return MarketerPaymentMethodRead(
        id=payment_method.id,
        marketer_id=payment_method.marketer_id,
        payment_method_type=payment_method.payment_method_type,
        currency=payment_method.currency,
        country_code=payment_method.country_code,
        is_active=payment_method.is_active,
        verified_at=payment_method.verified_at,
        masked_account=masked,
        account_holder=holder,
        bank_name=bank_name,
        provider=provider,
        has_cached_recipient=payment_method.flutterwave_beneficiary_id is not None,
        creation_date=payment_method.creation_date,
    )

def _handle_payout_failure(
    payout: ReferrerPayoutRequest, reason: str, db_session: Session
) -> None:
    """
    Graceful payout retry (DRY utility)

    Transient Paystack failures are retried by the background job: the payout
    is set back to APPROVED so the next job run (every ~5-30 min) retries it.
    After MAX_PAYOUT_RETRIES the payout is marked FAILED permanently and the
    marketer + admin are notified. Balance is never deducted on failure.
    """
    payout.retry_count = (payout.retry_count or 0) + 1
    payout.last_retry_at = datetime.now(UTC)
    payout.failure_reason = reason[:2000] if reason else None
    payout.update_date = datetime.now(UTC)

    if payout.retry_count >= MAX_PAYOUT_RETRIES:
        payout.status = PayoutStatus.FAILED
        logger.error(
            f"Payout {payout.id} FAILED permanently after "
            f"{payout.retry_count} attempts: {reason}"
        )
        user = db_session.get(User, payout.referrer_user_id)
        if user:
            _send_marketer_payout_email_safe(
                payout, user, payout.currency, db_session, completed=False
            )
    else:
        # Back to APPROVED — background job retries on its next run
        payout.status = PayoutStatus.APPROVED
        logger.warning(
            f"Payout {payout.id} attempt {payout.retry_count}/"
            f"{MAX_PAYOUT_RETRIES} failed, will retry: {reason}"
        )

    db_session.add(payout)
    db_session.commit()


COUNTRY_TO_AVAILABLE_PAYMENT_METHODS = {
    "NG": {PaymentMethodType.BANK_TRANSFER},
    "GH": {PaymentMethodType.BANK_TRANSFER, PaymentMethodType.MOBILE_MONEY},
    "KE": {PaymentMethodType.MOBILE_MONEY},
    "ZA": {PaymentMethodType.BANK_TRANSFER},
    "RW": {PaymentMethodType.MOBILE_MONEY},
    "TZ": {PaymentMethodType.MOBILE_MONEY},
    "UG": {PaymentMethodType.MOBILE_MONEY},
    "CI": {PaymentMethodType.MOBILE_MONEY},
    "EG": {PaymentMethodType.BANK_TRANSFER},
    "US": {PaymentMethodType.BANK_TRANSFER},
    "GB": {PaymentMethodType.BANK_TRANSFER},
    "EU": {PaymentMethodType.BANK_TRANSFER},
}


def _send_marketer_payout_email_safe(
    payout: ReferrerPayoutRequest,
    user: User,
    currency: str,
    db_session: Session,
    completed: bool,
) -> None:
    """
    Send payout lifecycle email to marketers. Never raises — email failure
    must not affect payout state. No-op for standard (non-marketer) referrers.
    """
    try:
        from src.db.referrals.marketers import Marketer, MarketerStatus

        marketer = db_session.exec(
            select(Marketer).where(
                and_(
                    Marketer.user_id == payout.referrer_user_id,
                    Marketer.org_id == payout.org_id,
                    Marketer.status == MarketerStatus.ACTIVE,
                )
            )
        ).first()
        if not marketer:
            return

        from src.services.referrals.marketer_emails import (
            send_marketer_payout_completed_email,
            send_marketer_payout_failed_email,
        )

        if completed:
            send_marketer_payout_completed_email(
                email=user.email,
                username=user.username,
                amount_usd=payout.total_amount,
                converted_amount=payout.converted_amount,
                currency=currency,
                reference=payout.flutterwave_transfer_id,
            )
        else:
            send_marketer_payout_failed_email(
                email=user.email,
                username=user.username,
                amount_usd=payout.total_amount,
                reason=payout.failure_reason,
            )
    except Exception as e:
        logger.error(f"Failed to send marketer payout email: {e}")

