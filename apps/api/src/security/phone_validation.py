import re
from typing import Optional


E164_PATTERN = re.compile(r"^\+[1-9]\d{1,14}$")


def normalize_phone_number(raw_phone_number: Optional[str]) -> Optional[str]:
    """Normalize phone numbers to a compact E.164-compatible representation."""
    if raw_phone_number is None:
        return None

    compact_phone_number = (
        raw_phone_number.strip()
        .replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )

    if compact_phone_number == "":
        return None

    return compact_phone_number


def validate_e164_phone_number(
    phone_number: Optional[str], required: bool = False
) -> Optional[str]:
    """Validate and normalize a phone number in strict E.164 format."""
    normalized_phone_number = normalize_phone_number(phone_number)

    if normalized_phone_number is None:
        if required:
            raise ValueError("Phone number is required")
        return None

    if not E164_PATTERN.fullmatch(normalized_phone_number):
        raise ValueError(
            "Phone number must be in strict E.164 format (example: +14155552671)"
        )

    return normalized_phone_number
