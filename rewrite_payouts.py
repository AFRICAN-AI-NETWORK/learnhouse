import os
import re

file_path = 'apps/api/src/services/referrals/payouts.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 3.2.4 Rename exchange rate function
content = content.replace('def get_usd_to_ngn_exchange_rate', 'def get_usd_to_currency_exchange_rate')
content = content.replace('get_usd_to_ngn_exchange_rate', 'get_usd_to_currency_exchange_rate')

# 3.2.5 Country Coverage Gap
new_countries = '''    "RW": "RWF",  # Rwanda → Franc
    "TZ": "TZS",  # Tanzania → Shilling
    "UG": "UGX",  # Uganda → Shilling
    "CI": "XOF",  # Ivory Coast → CFA Franc
    "EG": "EGP",  # Egypt → Pound
    "US": "USD",  # United States → Dollar'''
content = content.replace('    "US": "USD",  # United States → Dollar', new_countries)


# 3.2.3 Flutterwave transfer replacement
# We need to replace `create_paystack_transfer_recipient` and `initiate_paystack_transfer` with `create_flutterwave_transfer`
# Also need to replace the imports for make_paystack_request
flutterwave_transfer_code = '''
async def make_flutterwave_request(method: str, endpoint: str, data: dict = None, headers: dict = None) -> dict:
    import httpx
    secret_key = os.getenv("FLUTTERWAVE_SECRET_KEY")
    if not secret_key:
        raise HTTPException(status_code=500, detail="FLUTTERWAVE_SECRET_KEY not configured")
        
    url = f"https://api.flutterwave.com/v3{endpoint}"
    req_headers = {
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json"
    }
    if headers:
        req_headers.update(headers)
        
    async with httpx.AsyncClient() as client:
        try:
            if method.upper() == "POST":
                response = await client.post(url, headers=req_headers, json=data)
            elif method.upper() == "GET":
                response = await client.get(url, headers=req_headers)
            else:
                raise ValueError(f"Unsupported method {method}")
                
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Flutterwave HTTP error {e.response.status_code}: {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Flutterwave API error: {e.response.text}")
        except Exception as e:
            logger.error(f"Flutterwave request failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to connect to Flutterwave")

async def create_flutterwave_transfer(
    amount: float,
    currency: str,
    bank_account_info: dict,
    reference: str,
    reason: str = "Referral commission payout",
    payment_method_type: PaymentMethodType = PaymentMethodType.BANK_TRANSFER,
) -> dict:
    """
    Directly initiate a transfer using Flutterwave API
    """
    account_number = bank_account_info.get("account_number")
    
    # For mobile money, account bank is the provider network code (MTN, MPS, etc)
    # and account number is the phone number
    if payment_method_type == PaymentMethodType.MOBILE_MONEY:
        account_number = bank_account_info.get("phone_number")
        account_bank = bank_account_info.get("provider", "").upper()
        if not account_bank and bank_account_info.get("bank_code"):
            account_bank = bank_account_info.get("bank_code")
    else:
        account_bank = bank_account_info.get("bank_code")
        
    transfer_data = {
        "account_bank": account_bank,
        "account_number": account_number,
        "amount": amount,
        "narration": reason,
        "currency": currency,
        "reference": reference,
        "debit_currency": currency
    }
    
    result = await make_flutterwave_request("POST", "/transfers", transfer_data)
    return result
'''

# Find the start of create_paystack_transfer_recipient
start_idx = content.find('async def create_paystack_transfer_recipient')
end_idx = content.find('async def create_payout_request')

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + flutterwave_transfer_code + '\n\n' + content[end_idx:]
else:
    print("Could not find the target functions to replace")

# Replace calls in process_payout_request
content = content.replace('recipient_data = await create_paystack_transfer_recipient(', 'transfer_data = await create_flutterwave_transfer(')
# The logic for process_payout_request was:
# recipient_data = await create_paystack_transfer_recipient(
#    email=user.email,
#    name=f"{user.first_name} {user.last_name}".strip() or user.email,
#    bank_account_info=decrypted_bank_info,
#    currency=saved_currency or payout.currency,
#    payment_method_type=payment_method_type,
# )
# payout.paystack_transfer_recipient_code = recipient_data.get("recipient_code")
# transfer_data = await initiate_paystack_transfer(
#     amount=payout.converted_amount or payout.total_amount,
#     recipient_code=recipient_data.get("recipient_code"),
#     reference=reference,
#     idempotency_key=idempotency_key,
# )
# payout.paystack_transfer_code = transfer_data.get("transfer_code")

# I'll write a specific replacement for process_payout_request payload
payout_process_old = '''        # Create recipient
        if not payout.paystack_transfer_recipient_code:
            recipient_data = await create_paystack_transfer_recipient(
                email=user.email,
                name=f"{user.first_name} {user.last_name}".strip() or user.email,
                bank_account_info=decrypted_bank_info,
                currency=saved_currency or payout.currency,
                payment_method_type=payment_method_type,
            )
            payout.paystack_transfer_recipient_code = recipient_data.get(
                "recipient_code"
            )
            db_session.add(payout)
            db_session.commit()

        # Initiate transfer
        if not payout.paystack_transfer_code:
            reference = f"payout_{payout.id}_{int(datetime.now().timestamp())}"
            idempotency_key = f"payout_idem_{payout.id}_{payout.retry_count}"

            transfer_data = await initiate_paystack_transfer(
                amount=payout.converted_amount or payout.total_amount,
                recipient_code=payout.paystack_transfer_recipient_code,
                reference=reference,
                idempotency_key=idempotency_key,
            )
            payout.paystack_transfer_code = transfer_data.get("transfer_code")
            db_session.add(payout)
            db_session.commit()'''

payout_process_new = '''        # Initiate Flutterwave transfer
        if not payout.flutterwave_transfer_id:
            reference = f"payout_{payout.id}_{int(datetime.now().timestamp())}"

            transfer_data = await create_flutterwave_transfer(
                amount=payout.converted_amount or payout.total_amount,
                currency=saved_currency or payout.currency,
                bank_account_info=decrypted_bank_info,
                reference=reference,
                payment_method_type=payment_method_type,
            )
            payout.flutterwave_transfer_id = str(transfer_data.get("data", {}).get("id", ""))
            db_session.add(payout)
            db_session.commit()'''

content = content.replace(payout_process_old, payout_process_new)

# Also fix the import
content = content.replace('from src.services.payments.payments_paystack import make_paystack_request\n', '')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated payouts.py successfully")
