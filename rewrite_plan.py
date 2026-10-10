import os
import re

with open('Marketers Implementation Plan-20260709234434.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace general paystack mentions
content = content.replace('Paystack or Flutterwave', 'Flutterwave')
content = content.replace('Paystack/mobile money', 'Flutterwave')
content = content.replace('Paystack', 'Flutterwave')
content = content.replace('paystack', 'flutterwave')
content = content.replace('flutterwave_recipient_code', 'flutterwave_beneficiary_id')
content = content.replace('nuban', 'NIGERIAN_BANK')

# Specific rewrite for the beneficiary part since Flutterwave transfers don't strictly require beneficiary creation
content = re.sub(
    r'\*   `flutterwave_beneficiary_id` \(str, 255, nullable\).*?country changes\.',
    '*   `flutterwave_beneficiary_id` (str, 255, nullable) — Optional. Flutterwave allows direct transfers without pre-creating beneficiaries, but if we do create them, we can cache it here.',
    content,
    flags=re.DOTALL
)

# Fix 3.2.3 which mentions hard-coding
content = re.sub(
    r'\*\*\#### 3\.2\.3.*NIGERIAN_BANK"\.',
    '''**#### 3.2.3 `create_flutterwave_transfer` Hard-Codes Nigerian Bank Type**

**File:** `apps/api/src/services/referrals/payouts.py` — `create_flutterwave_transfer`

**Root cause:** The function previously hard-coded Paystack-specific recipient types like `"type": "NIGERIAN_BANK"`. Flutterwave `/transfers` API directly accepts `account_bank` and `account_number` without needing a recipient type prefix. For mobile money, the `account_bank` is just the mobile network operator code (e.g., `MTN`, `MPS`).

**Fix:** Map `currency` and `payment_method_type` directly to the expected Flutterwave `account_bank` codes instead of Paystack types.
''',
    content,
    flags=re.DOTALL
)

# Prepend the explanation they asked for
explanation = '''# Flutterwave Currency Conversion Explanation

> [!NOTE]
> **Question:** Will Flutterwave convert the $37 checkout amount to Naira for Nigerian buyers?
>
> **Answer:** Yes! When you pass a USD amount to the Flutterwave checkout, Flutterwave detects the user's local card (or the user can select their local payment method) and automatically applies Dynamic Currency Conversion (DCC). The buyer will see and be charged the equivalent amount in Naira (NGN) at Flutterwave's daily exchange rate. Your merchant account will still correctly register the transaction, and depending on your settlement settings, you can choose to settle the funds in USD or NGN. The $37 pricing remains standard globally, but local buyers pay seamlessly in their local currency.

'''

artifact_path = r'C:\Users\hp\.gemini\antigravity-ide\brain\9fa776cd-9816-463f-bc1b-ad8f38be5328\implementation_plan.md'
with open(artifact_path, 'w', encoding='utf-8') as f:
    f.write(explanation + content)
