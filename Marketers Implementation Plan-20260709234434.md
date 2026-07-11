# Marketers Implementation Plan

# LearnHouse: Marketer System Implementation Plan
* * *
## 1\. Executive Summary
This plan introduces a **Marketer** tier on top of the existing referral system. A marketer is a new user who registers specifically to promote the platform. When a student they referred pays for a course, the marketer earns **$7.70 per student per paid course** instead of the $4.00 that standard referrers earn.

The $7.70 replaces the commission amount for marketer-owned referral codes. It is not a separate bonus. The entire existing pipeline (referral code table, commission lifecycle, payout pipeline, fraud detection, bank-data encryption, exchange-rate caching, background job scheduler) is reused. The commission amount is the only value that changes, derived at webhook time by checking whether the referral code owner is a marketer.

**What is built new:**
*   Marketer registration, admin approval, profile, and identity verification (KYC)
*   Commission amount differentiation ($7.70 vs $4.00) at commission creation time
*   Marketer dashboard: students brought, per-course purchases, monthly revenue, payout state
*   Admin additions: marketer leaderboard, KYC review queue, marketer payout approval
*   Saved payment method profiles (bank transfer and mobile money)
*   Mobile money support: Kenya M-Pesa, Ghana MTN MoMo, Rwanda, Tanzania
*   Expanded African country coverage: RW, TZ, UG, CI, EG
*   Automated payout on admin approval
*   Email notifications at every lifecycle event

**Bugs fixed as part of this implementation (same deploy):**
*   `process_payout_request` ignores APPROVED payouts: zero payouts have ever auto-processed
*   `check_pending_payout` misses APPROVED status: double payout submission is possible
*   `create_paystack_transfer_recipient` hard-codes `nuban`: fails for all non-Nigerian accounts
*   Exchange rate function only covers NGN: GHS/KES/ZAR conversions use no dynamic rate
*   Flutterwave webhook never creates commissions: Flutterwave payments earn referrers nothing
*   `get_commission_balance` runs 3 DB queries where 1 suffices
*   `update_pending_commissions_to_eligible` loads all rows into memory: unbounded at scale
*   Missing DB indexes cause nightly eligibility job to do full table scans

* * *
## 2\. Architecture Overview

```plain
Marketer registers (new User + Marketer profile)  
        │  
        ▼  
Admin approves (PENDING_APPROVAL → ACTIVE)  
        │  
        ▼  
Referral code auto-generated (reuses ReferralCode table, prefix MKT-)  
        │  
        ▼  
Marketer shares code → Student signs up (ReferralTracking, fraud scored)  
        │  
        ▼  
Student pays (Paystack or Flutterwave webhook fires)  
        │  
        ▼  
create_commission_for_payment() — checks is_active_marketer()  
        │  
        ├── YES → commission = $7.70, commission_type = MARKETER  
        └── NO  → commission = $4.00, commission_type = STANDARD  
        │  
        ▼  
Commission stored (PENDING, 14-day refund period)  
        │  
        ▼  daily background job  
Commission → ELIGIBLE  
        │  
        ▼  
Marketer requests payout (min $7.70, from saved payment method, KYC required)  
        │  
        ▼  
Admin approves → status = APPROVED  
        │  
        ▼  background job (every 30 min)  
Paystack/mobile money transfer fires automatically  
        │  
        ▼  
Commission → PAID, balance decremented, email sent
```

* * *
## 3\. Backend Implementation

Implement everything in this section before touching the frontend. The sections are ordered
by dependency — implement them in sequence.

* * *
### 3.1 Database — All Schema Changes

Run all migrations together in one deployment, ordered as listed below.

#### 3.1.1 New Table: `apps/api/src/db/referrals/marketers.py`

**`MarketerStatus`** **enum:** `PENDING_APPROVAL`, `ACTIVE`, `SUSPENDED`, `REJECTED`

**`Marketer`** **table fields:**
*   `id` (int, PK)
*   `user_id` (BigInteger, FK → [user.id](http://user.id), CASCADE)
*   `org_id` (BigInteger, FK → [organization.id](http://organization.id), CASCADE)
*   `referral_code_id` (BigInteger, FK → [referralcode.id](http://referralcode.id), nullable — set on approval)
*   `status` (MarketerStatus, default PENDING\_APPROVAL)
*   `commission_rate_usd` (float, default 7.70) — stored per row; resolves the existing

  `COMMISSION_AMOUNT_USD = 4.00` TODO comment in `referral_commissions.py`

*   `phone_number` (str, 20, nullable) — collected at registration
*   `approved_by_user_id` (BigInteger, FK → [user.id](http://user.id), nullable)
*   `approved_at` (datetime, nullable)
*   `rejection_reason` (Text, nullable)
*   `total_students_referred` (int, default 0) — denormalized, refreshed by daily job
*   `total_courses_sold` (int, default 0) — denormalized
*   `total_earned_usd` (float, default 0.0) — denormalized, lifetime earnings
*   `total_paid_usd` (float, default 0.0) — denormalized, lifetime paid out
*   `notes` (Text, nullable) — admin-only internal notes
*   `creation_date` (datetime)
*   `update_date` (datetime)

**Constraints and indexes:**
*   `uq_marketer_user_org` — UNIQUE on `(user_id, org_id)`
*   `uq_marketer_phone_org` — UNIQUE on `(org_id, phone_number)` (prevents same phone in two accounts)
*   `idx_marketer_status` on `(org_id, status)`
*   `idx_marketer_referral_code` on `referral_code_id`

**Pydantic schemas:** `MarketerCreate`, `MarketerRead`, `MarketerUpdate`,
`MarketerPublicRead` (hides `rejection_reason`, `notes`, `approved_by_user_id` from non-admins)

**\#### 3.1.2 New Table:** **`apps/api/src/db/referrals/marketer_payment_methods.py`**

Saves the marketer's preferred payout destination. One active method per marketer at a time.
Eliminates the current UX problem where bank details must be re-entered on every payout.

**`PaymentMethodType`** **enum:** `BANK_TRANSFER`, `MOBILE_MONEY`

**`MarketerPaymentMethod`** **table fields:**
*   `id` (int, PK)
*   `marketer_id` (BigInteger, FK → [marketer.id](http://marketer.id), CASCADE)
*   `user_id` (BigInteger, FK → [user.id](http://user.id), CASCADE)
*   `org_id` (BigInteger, FK → [organization.id](http://organization.id), CASCADE)
*   `payment_method_type` (PaymentMethodType)
*   `currency` (str, 3) — derived from country at save time
*   `country_code` (str, 2) — NG, GH, KE, ZA, RW, TZ, UG, CI, EG
*   `account_details` (Text) — Fernet-encrypted JSON blob.

  Bank: `{bank_name, account_number, account_holder, account_type, bank_code}`

  Mobile: `{phone_number, provider, account_name}` (provider: mpesa, mtn, airtel, etc.)

*   `paystack_recipient_code` (str, 255, nullable) — cached after first-time recipient

  creation. Reused on subsequent payouts to avoid redundant Paystack API calls.

  Set to `None` when account details change or country changes.

*   `is_active` (bool, default True)
*   `verified_at` (datetime, nullable)
*   `creation_date` (datetime)
*   `update_date` (datetime)

**Indexes:**
*   `idx_payment_method_marketer_active` on `(marketer_id, is_active)`
*   `idx_payment_method_user` on `user_id`

#### 3.1.3 New Table: `apps/api/src/db/referrals/marketer_kyc.py`

Identity verification. KYC must be VERIFIED before a marketer can request their first payout.
Government ID hash uniqueness prevents one person creating two marketer accounts.

**`KYCStatus`** **enum:** `UNVERIFIED`, `PENDING_REVIEW`, `VERIFIED`, `REJECTED`

**`KYCDocumentType`** **enum:** `NATIONAL_ID`, `PASSPORT`, `DRIVERS_LICENSE`

**`MarketerKYC`** **table fields:**
*   `id` (int, PK)
*   `marketer_id` (BigInteger, FK → [marketer.id](http://marketer.id), CASCADE)
*   `user_id` (BigInteger, FK → [user.id](http://user.id), CASCADE)
*   `org_id` (BigInteger, FK → [organization.id](http://organization.id), CASCADE)
*   `document_type` (KYCDocumentType)
*   `id_number_hash` (str, 64) — SHA-256 hex of the government ID number (uppercase, trimmed).

  Never stored in plaintext. Used only for uniqueness enforcement.

*   `document_front_url` (str, 500) — S3 key (not public URL; signed on demand)
*   `document_back_url` (str, 500, nullable) — required for NATIONAL\_ID and DRIVERS\_LICENSE
*   `selfie_url` (str, 500) — selfie holding the document for liveness proof
*   `status` (KYCStatus, default UNVERIFIED)
*   `rejection_reason` (Text, nullable)
*   `reviewed_by_user_id` (BigInteger, FK → [user.id](http://user.id), nullable)
*   `reviewed_at` (datetime, nullable)
*   `submission_count` (int, default 0) — max 3; prevents brute-forcing ID hashes
*   `creation_date` (datetime)
*   `update_date` (datetime)

**Constraints and indexes:**
*   `uq_kyc_id_number_hash` — UNIQUE on `id_number_hash`. This is the hard anti-duplication

  guarantee. The same government ID cannot appear twice. DB-level, not application-level.

*   `idx_kyc_marketer` on `marketer_id`
*   `idx_kyc_status_org` on `(org_id, status)` — admin review queue

**\#### 3.1.4 Extend** **`apps/api/src/db/referrals/referral_commissions.py`**

Add one field to the existing `ReferralCommission` table:

**`CommissionType`** **enum:** `STANDARD` (default, $4.00), `MARKETER` ($7.70)

Add `commission_type: CommissionType = Field(default=CommissionType.STANDARD)` to
`ReferralCommission`, `ReferralCommissionCreate`, `ReferralCommissionRead`.

This field lets the admin dashboard filter marketer earnings from standard earnings without
joining to the `Marketer` table on every analytics query.

New index: `idx_commission_type_referrer` on `(referrer_user_id, commission_type, status)`.

#### 3.1.5 Extend `apps/api/src/db/referrals/payout_requests.py`

Add two fields to `ReferrerPayoutRequest` for the payout retry system (Section 3.6.4):
*   `retry_count` (int, default 0)
*   `last_retry_at` (datetime, nullable)

Add to `ReferrerPayoutRequestRead` and `ReferrerPayoutRequestUpdate` schemas.

**\#### 3.1.6 Missing Indexes — Fix for All Referrers**

These indexes are missing from the existing schema and cause performance problems for
all users today. Add in the same migration batch:

**On** **`ReferralCommission`**\*\*\*\***:**
*   `idx_commission_referrer_status` on `(referrer_user_id, status)` — used by balance and

  history queries (currently a filtered full scan)

*   `idx_commission_refund_expiry` on `(status, refund_period_expiration_date)` — used by

  the nightly eligibility job (currently a full table scan on `ReferralCommission`)

**On** **`ReferrerPayoutRequest`**\*\*\*\***:**
*   `idx_payout_referrer_status` on `(referrer_user_id, status)` — used by

  `check_pending_payout` and payout history

*   `idx_payout_status` on `status` — used by the background job that queries APPROVED payouts

**\#### 3.1.7 Alembic Migration Files**

Four migration files in `apps/api/migrations/versions/`, run in this order:

1. `<ts>_add_indexes_and_payout_retry_fields.py`

   — Adds the 4 indexes above and `retry_count`, `last_retry_at` to `ReferrerPayoutRequest`

   — Deploy this first (no table locks on most Postgres versions for index creation)

1. `<ts>_add_commission_type_to_referralcommission.py`

   — Adds `commission_type` column with `server_default = 'STANDARD'` so all existing

   rows are backfilled atomically

1. `<ts>_create_marketer_and_payment_method_tables.py`

   — Creates `marketer` and `marketerpaymethods` tables

1. `<ts>_create_marketer_kyc_table.py`

   — Creates `marketerkyc` table

Each migration must have a correct `downgrade()`.

* * *
### 3.2 Bug Fixes — Apply Before Any New Feature Code

These fixes go into the same PR as the feature. They touch existing files. Apply them
first so the new feature code is built on a correct foundation.

**\#### 3.2.1 Critical:** **`process_payout_request`** **Rejects All Approved Payouts**

**File:** `apps/api/src/services/referrals/payouts.py` — line 603

**Root cause:** The background job in `referral_jobs.py:83` queries for
`status == APPROVED` payouts and passes them to `process_payout_request`. But the function
guard at line 603 says `if payout.status != PayoutStatus.REQUESTED` — which rejects
every APPROVED payout immediately. The function returns early without processing. Every
payout that has ever been approved has silently been skipped.

**Fix:** Change line 603:

```plain
# Before (broken):  
if payout.status != PayoutStatus.REQUESTED:

<p><br/></p>

# After (correct):  
if payout.status != PayoutStatus.APPROVED:
```

One line change. Do not amend other logic — just this guard.

#### 3.2.2 `check_pending_payout` Missing APPROVED in In-Flight Check

**File:** `apps/api/src/services/referrals/payouts.py` — line 415

**Root cause:** `check_pending_payout` considers only REQUESTED and PROCESSING as in-flight.
A payout in APPROVED status is not blocked. A referrer can submit a second payout request
while the first is approved-but-not-yet-processed. Both payouts then race against the same
eligible balance.

**Fix:** Add `PayoutStatus.APPROVED` to the status list at line 415:

```python
# Before:  
[PayoutStatus.REQUESTED, PayoutStatus.PROCESSING]

<p><br/></p>

# After:  
[PayoutStatus.REQUESTED, PayoutStatus.APPROVED, PayoutStatus.PROCESSING]
```

**\#### 3.2.3** **`create_paystack_transfer_recipient`** **Hard-Codes Nigerian Bank Type**

**File:** `apps/api/src/services/referrals/payouts.py` — `create_paystack_transfer_recipient`

**Root cause:** The function hard-codes `"type": "nuban"` which is only valid for Nigerian
bank accounts. Any payout to Ghana, Kenya, South Africa, Rwanda, or Tanzania fails at the
Paystack API level with a recipient validation error.

**Fix:** Add `CURRENCY_TO_PAYSTACK_RECIPIENT_TYPE` map to this file:

```plain
NGN → nuban          (Nigerian bank)  
GHS → ghipss         (Ghanaian bank)  
KES → mobile_money   (Kenya M-Pesa via Paystack)  
ZAR → basa           (South African bank)  
RWF → mobile_money   (Rwanda mobile money)  
TZS → mobile_money   (Tanzania mobile money)  
XOF → mobile_money   (West Africa CFA — Paystack limited support)  
EGP → nuban          (Egypt — Paystack Nile)  
USD → nuban          (international)
```

Update `create_paystack_transfer_recipient` signature to accept `payment_method_type`
(BANK\_TRANSFER or MOBILE\_MONEY) and `currency`. Replace the hard-coded `"type": "nuban"`
with `CURRENCY_TO_PAYSTACK_RECIPIENT_TYPE.get(currency, "nuban")`. For MOBILE\_MONEY type,
use `phone_number` from `account_details` instead of `account_number`.

**\#### 3.2.4 Exchange Rate Function Only Covers NGN**

**File:** `apps/api/src/services/referrals/payouts.py` — `get_usd_to_ngn_exchange_rate`

**Root cause:** The function is hard-coded to fetch only the USD → NGN rate. All other
currencies (GHS, KES, ZAR, etc.) fall back to an env-var static rate or fail silently.

**Fix:** Rename to `get_usd_to_currency_exchange_rate(target_currency: str) -> float`.
The function fetches the rate for any `target_currency` from [exchangerate-api.com](http://exchangerate-api.com).
Redis cache key changes from `exchange_rate:usd_ngn` to `exchange_rate:USD:{TARGET}` with
the same 1-hour TTL. Add env-var fallbacks for each currency:
`USD_TO_GHS_RATE`, `USD_TO_KES_RATE`, `USD_TO_ZAR_RATE`, `USD_TO_RWF_RATE`, etc. in
`.env.example`. Update all callers of the old function name.

#### 3.2.5 Country Coverage Gap in `COUNTRY_TO_CURRENCY`

**File:** `apps/api/src/services/referrals/payouts.py`

**Current map:** NG, GH, KE, ZA, US, GB, EU only.

**Fix:** Add:

```plain
"RW": "RWF"   # Rwanda  
"TZ": "TZS"   # Tanzania  
"UG": "UGX"   # Uganda  
"CI": "XOF"   # Ivory Coast  
"EG": "EGP"   # Egypt
```

**\#### 3.2.6 Flutterwave Webhook Never Creates Commissions**

**File:** `apps/api/src/routers/webhooks/flutterwave.py`

**Root cause:** The Flutterwave `charge.completed` handler enrolls students in courses but
never calls `create_commission_for_payment`. Any student who pays via Flutterwave using a
marketer's referral code earns the marketer nothing.

**Fix:** After successful course enrollment in the Flutterwave webhook handler:

1. Look up whether the paying user has a `referral_code_id` in `PaymentsUser` or the

   payment metadata.

2. If a referral code exists, call `create_commission_for_payment(referral_code_id, payment_user_id, course_id, db_session)`.
3. The existing unique index on `(payment_user_id, referral_code_id)` prevents duplicates

   even if both Paystack and Flutterwave webhooks fire for the same payment — no extra

   idempotency logic needed.

**\#### 3.2.7** **`get_commission_balance`** **— 3 Queries → 1**

**File:** `apps/api/src/services/referrals/referral_commissions.py`

**Current:** Runs a separate `SELECT SUM()` for ELIGIBLE, a separate one for PENDING, and a
`SELECT` on the User row — three DB round-trips per balance check. This is called on every
dashboard load and payout page.

**Fix:** Replace with a single grouped query:

```sql
SELECT status, COALESCE(SUM(commission_amount), 0)  
FROM referralcommission  
WHERE referrer_user_id = :user_id  
  AND status IN ('ELIGIBLE', 'PENDING')  
GROUP BY status
```

Read results into a `{status: amount}` dict. Read `total_balance` from
`User.referral_commission_balance` directly (already maintained by the eligibility job and
payout processor) without an extra `SELECT User` query.

Result: 3 queries → 1 per balance check.

#### 3.2.8 `update_pending_commissions_to_eligible` — Unbounded Memory

**File:** `apps/api/src/services/referrals/referral_commissions.py` — line 196

**Current:** Loads ALL eligible commissions into Python memory with a single query, then
processes them. On a large platform with thousands of commissions maturing on the same day,
this exhausts application memory and crashes the job.

**Fix:** Wrap the query in a chunk loop with `LIMIT 500`. After processing each chunk
(update statuses, update balances, commit), loop until the query returns zero rows. Each
500-row commit is atomic. If the job is interrupted, the next run picks up remaining rows
because processed commissions are no longer PENDING. Memory usage becomes O(1).

* * *
### 3.3 Services — New and Extended

#### 3.3.1 `apps/api/src/services/referrals/marketers.py` (new file)

All marketer business logic lives here. All functions are async and receive `db_session`.

**`register_marketer(user_id, org_id, phone_number, db_session) -> Marketer`**
*   Validates user exists
*   Checks `uq_marketer_user_org` — raises `MKTR_001` if duplicate
*   Checks phone uniqueness — raises `MKTR_006` if taken
*   Checks registration rate limits via Redis (3 per IP per hour → `MKTR_004`;

  3 marketer accounts per IP in 30 days across all orgs → `MKTR_005`)

*   Computes device fingerprint (SHA-256 of User-Agent + Accept-Language + /24 IP range)

  from the request; if same fingerprint is already linked to an ACTIVE marketer in this org,

  flags the new registration for review (sets internal `needs_review = True`) but does not

  auto-reject — shared devices are real

*   Creates `Marketer` row with `status = PENDING_APPROVAL`
*   Sends acknowledgement email to applicant

**`approve_marketer(marketer_id, admin_user_id, db_session) -> Marketer`**
*   Guards: marketer must be in PENDING\_APPROVAL status, else raise `MKTR_402`
*   Sets `status = ACTIVE`, `approved_by_user_id`, `approved_at`
*   Calls `generate_referral_code_for_marketer(marketer_id, db_session)`
*   Sends approval email with referral link
*   RBAC: admin or maintainer only

**`reject_marketer(marketer_id, reason, admin_user_id, db_session) -> Marketer`**
*   Sets `status = REJECTED`, stores `rejection_reason`
*   Sends rejection email
*   RBAC: admin or maintainer only

**`suspend_marketer(marketer_id, admin_user_id, db_session) -> Marketer`**
*   Sets `status = SUSPENDED`
*   Sets `ReferralCode.status = INACTIVE` for the marketer's code (new signups cannot use it)
*   Immediately deletes Redis key `mkt:active:{user_id}:{org_id}` — the commission rate

  reverts to $4.00 within the same request, not after the 5-minute TTL

*   Existing commissions already created are unaffected
*   RBAC: admin or maintainer only

**`reactivate_marketer(marketer_id, admin_user_id, db_session) -> Marketer`**
*   Guards: must be SUSPENDED (rejected accounts cannot be reactivated — raise `MKTR_404`)
*   Sets `status = ACTIVE`, re-activates referral code
*   Invalidates Redis cache key

**`generate_referral_code_for_marketer(marketer_id, db_session) -> ReferralCode`**
*   Calls the existing referral code generation logic from `referral_codes.py`
*   Prefixes code with `MKT-` (e.g., `MKT-JOHN2024`) for visual distinction in admin view
*   Sets `User.has_referral_code = True`
*   Links `ReferralCode.id` → `Marketer.referral_code_id`

**`is_active_marketer(user_id, org_id, db_session) -> bool`**
*   Checks Redis key `mkt:active:{user_id}:{org_id}` first (5-minute TTL)
*   On cache miss: queries `Marketer WHERE user_id = ? AND org_id = ? AND status = ACTIVE`
*   Writes result to Redis before returning
*   Called by `get_commission_amount_for_code` on every payment webhook

**`get_commission_amount_for_code(referral_code_id, db_session) -> tuple[float, CommissionType]`**
*   Gets `referrer_user_id` from `ReferralCode`
*   Calls `is_active_marketer(referrer_user_id, org_id, db_session)`
*   Returns `(marketer.commission_rate_usd, CommissionType.MARKETER)` if marketer is active
*   Returns `(4.00, CommissionType.STANDARD)` otherwise
*   Replaces the hard-coded `COMMISSION_AMOUNT_USD = 4.00` constant. This resolves the

  existing TODO comment in `referral_commissions.py`

**`get_minimum_payout(user_id, org_id, db_session) -> float`**
*   Returns `7.70` if active marketer, `1.00` otherwise
*   Called by `validate_payout_amount` in `payouts.py`

**`get_marketer_dashboard(marketer_user_id, org_id, db_session) -> MarketerDashboardData`**
One service call, one database round-trip per panel. Returns:
*   `profile`: name, email, code, referral\_link, status, approved\_at, commission\_rate\_usd
*   `summary`:

        - `total_students`: count of distinct `referred_user_id` in `ReferralTracking`

        - `total_courses_sold`: count of marketer's `ReferralCommission` rows

        - `total_earned_usd`: sum of all commission amounts (excludes FORFEITED)

        - `eligible_for_payout_usd`: sum where `status = ELIGIBLE`

        - `pending_usd`: sum where `status = PENDING`

        - `total_paid_usd`: sum where `status = PAID`

*   `monthly_revenue`: last 12 months via single `GROUP BY DATE_TRUNC('month', ...)` query
*   `recent_students`: top 5 most recent (paginated list is a separate endpoint)
*   `payout_info`: balance, last payout date, minimum payout amount, payment method summary,

  kyc\_status, profile\_complete flag

*   `completeness_flags`: `{ country_set, phone_set, kyc_verified, payment_method_saved }`

Use batch fetching for all list data — no N+1 queries. Summary stats read from
denormalized `Marketer` counters (updated daily by background job) except
`eligible_for_payout_usd` which is always live.

**`get_marketer_students(marketer_user_id, org_id, page, limit, db_session) -> list`**
Paginated. Each record: student name, email, signup date, courses purchased (with commission
status per course), total commission from this student. Batch fetch users and commissions —
no nested loops.

**`get_marketer_monthly_revenue(marketer_user_id, org_id, year, db_session) -> list`**
Single SQL group-by query. Returns 12 records: `{month, year, courses_sold, commission_earned_usd, commissions_eligible_usd, commissions_paid_usd}`.

**`get_admin_marketer_stats(org_id, db_session) -> AdminMarketerStats`**
Admin only. Returns: total/active/pending marketers, total commissions paid to marketers,
top-10 leaderboard (by `total_students_referred` DESC) with name, email, code, students,
courses, earned, paid.

**`refresh_marketer_counters(marketer_id, db_session) -> None`**
Recomputes and writes denormalized counters to `Marketer` row: `total_students_referred`,
`total_courses_sold`, `total_earned_usd`, `total_paid_usd`. Called by the daily job and
after payout completion.

**\#### 3.3.2** **`apps/api/src/services/referrals/marketer_kyc.py`** **(new file)**

**`submit_kyc(marketer_id, document_type, id_number, front_key, back_key, selfie_key, db_session)`**
*   Computes `SHA-256(id_number.strip().upper())` → `id_number_hash`
*   Checks uniqueness: `SELECT 1 FROM marketerkyc WHERE id_number_hash = :hash`
*   If found: raise `MKTR_201` — "This government ID is already linked to another account"
*   Checks `submission_count < 3`; if at limit: raise `MKTR_202`
*   Creates or updates `MarketerKYC` with `status = PENDING_REVIEW`, increments `submission_count`
*   Notifies admin of pending review

**`approve_kyc(kyc_id, admin_user_id, db_session)`**
Sets `status = VERIFIED`. Sends "KYC verified — payouts unlocked" email to marketer.

**`reject_kyc(kyc_id, reason, admin_user_id, db_session)`**
Sets `status = REJECTED`, stores reason. If `submission_count < 3`, marketer can resubmit.

**`get_kyc_status(marketer_id, db_session) -> KYCStatus`**
Returns current status. Used by `validate_payout_prerequisites`.

**`validate_payout_prerequisites(user_id, org_id, db_session) -> None`**
Raises specific errors in order:

1. Profile has no country set → `MKTR_305`
2. KYC status is UNVERIFIED → `MKTR_206`
3. KYC status is PENDING\_REVIEW → `MKTR_207`
4. No active payment method → `MKTR_304`

Called at the start of `create_payout_request` before any other logic.

**`generate_kyc_document_url(s3_key, db_session) -> str`**
Generates a pre-signed S3 URL with 15-minute expiry. Never returns public S3 URLs.
KYC documents are in a restricted bucket prefix (`/marketer-kyc/{org_id}/{marketer_id}/`).
This function is called only inside admin-authenticated endpoints — marketers never receive
their document URLs back after upload.

#### 3.3.3 Extend `apps/api/src/services/referrals/referral_commissions.py`

Apply bug fixes 3.2.7 and 3.2.8 above.

Then update `create_commission_for_payment`:

1. Before creating the commission, call `get_commission_amount_for_code(referral_code_id, db_session)`
2. Pass returned `commission_amount` and `commission_type` into the `ReferralCommission` constructor
3. All other logic in the function stays identical

Update `validate_payout_amount` to call `get_minimum_payout(user_id, org_id, db_session)`
instead of a hard-coded constant.

#### 3.3.4 Extend `apps/api/src/services/referrals/payouts.py`

Apply bug fixes 3.2.1 through 3.2.5 above. Then add:

**`get_active_payment_method(marketer_id, db_session) -> Optional[MarketerPaymentMethod]`**
Returns the marketer's active payment method row. Returns None if none saved.

**`save_payment_method(marketer_id, payment_method_type, country_code, account_details, db_session) -> MarketerPaymentMethod`**
*   Validates `country_code` is in `COUNTRY_TO_CURRENCY`. Raises `MKTR_351` if not.
*   Validates `payment_method_type` is available for that country. Raises `MKTR_352`/`MKTR_353`.
*   Derives `currency` from country map
*   Encrypts `account_details` with `encrypt_bank_data` (existing Fernet function)
*   Sets all existing active methods to `is_active = False`
*   Creates new record with `is_active = True`, `paystack_recipient_code = None`
*   If marketer's country changes in their user profile later, a post-save hook in the user

  profile update endpoint calls this reset: `paystack_recipient_code = None` on all methods

**`cache_paystack_recipient_code(payment_method_id, recipient_code, db_session) -> None`**
Writes `paystack_recipient_code` to the `MarketerPaymentMethod` row after first creation.
On subsequent payouts, `process_payout_request` checks: if `payment_method.paystack_recipient_code`
is not None, skip the Paystack `/transferrecipient` call and use the cached code directly.

**Update** **`create_payout_request`**\*\*\*\***:**
*   Accept `use_saved_method: bool = False` parameter
*   When `True`: fetch active payment method via `get_active_payment_method`, decrypt

  `account_details`, use those as bank\_details. The caller passes `bank_details=None`.

*   Call `validate_payout_prerequisites(user_id, org_id, db_session)` at the start

**Update** **`process_payout_request`** **(after applying bug fix 3.2.1):**
Add retry logic:
*   On Paystack failure: increment `payout.retry_count`, set `payout.last_retry_at = now()`
*   If `payout.retry_count >= 3`: set `status = FAILED`, send `marketer_payout_failed` email

  to marketer and alert email to admin

*   Otherwise: set status back to `APPROVED` (background job will retry on next run)
*   Saves marketer from a permanent-fail on a transient Paystack error

* * *
### 3.4 API Endpoints

Create `apps/api/src/routers/referrals/marketers.py`. Register in `apps/api/src/router.py`
under prefix `/api/v1`.

All marketer self-service endpoints require `require_active_marketer(current_user, org_id, db_session)`
— a new RBAC helper that raises HTTP 403 if the user has no ACTIVE marketer row.
SUSPENDED marketers get 403 on all endpoints except `/me` (so they can see why they're suspended).

All admin endpoints reuse the existing `role_id IN (1, 2)` check.

**\#### Marketer Self-Service**

`POST /marketers/{org_id}/register`
Body: `{ first_name, last_name, phone_number, country_code }`
Calls `register_marketer`. Rate limit: 3 per IP per hour.
Response: `MarketerPublicRead`

`GET /marketers/{org_id}/me`
Returns current marketer profile + referral code.
HTTP 404 if user is not a marketer.

`GET /marketers/{org_id}/dashboard`
Full dashboard payload — one call, all panels.
Response: `MarketerDashboardData`

`GET /marketers/{org_id}/students?page=1&limit=20`
Paginated student list. Response: `{ students, total_count, page, limit }`

`GET /marketers/{org_id}/monthly-revenue?year=2024`
Response: `{ year, months: [MonthlyRevenueRecord] }`

`POST /marketers/{org_id}/payment-method`
Body: `{ payment_method_type, country_code, account_details }`
Calls `save_payment_method`. Raises `MKTR_355` if a payout is currently PROCESSING.
Response: masked `MarketerPaymentMethodRead` (last 4 digits of account number only)

`GET /marketers/{org_id}/payment-method`
Returns active payment method (masked). 404 if none saved.

`DELETE /marketers/{org_id}/payment-method`
Deactivates saved method. HTTP 400 if payout is in PROCESSING.

`POST /marketers/{org_id}/kyc/upload`
Multipart form: `document_type`, `id_number`, `front_file`, `back_file` (optional), `selfie_file`
Max file size 10MB, accepted: JPEG, PNG, PDF. Uploads to S3, calls `submit_kyc`.
Response: `{ status: "PENDING_REVIEW", submission_count: 1 }`

`GET /marketers/{org_id}/kyc/status`
Response: `{ status, rejection_reason (if REJECTED), reviewed_at (if VERIFIED) }`

`POST /marketers/{org_id}/request-payout`
Body: `{ amount }` only — bank details from saved payment method.
Calls `validate_payout_prerequisites` then `create_payout_request(use_saved_method=True)`.
Response: `ReferrerPayoutRequestRead`

`GET /marketers/{org_id}/payout-history?limit=20`
Response: list of `ReferrerPayoutRequestRead`

**\#### Admin Endpoints**

`GET /marketers/{org_id}/admin/all?status=pending_approval&page=1&limit=50`
Lists marketers filtered by status.

`GET /marketers/{org_id}/admin/stats`
Calls `get_admin_marketer_stats`.

`GET /marketers/{org_id}/admin/leaderboard?limit=10`
Top marketers by students referred.

`POST /marketers/{org_id}/admin/{marketer_id}/approve`
Calls `approve_marketer`.

`POST /marketers/{org_id}/admin/{marketer_id}/reject`
Body: `{ reason }`. Calls `reject_marketer`.

`POST /marketers/{org_id}/admin/{marketer_id}/suspend`
Calls `suspend_marketer`.

`POST /marketers/{org_id}/admin/{marketer_id}/reactivate`
Calls `reactivate_marketer`.

`GET /marketers/{org_id}/admin/{marketer_id}/students?page=1&limit=20`
Admin view of a specific marketer's student list.

`GET /marketers/{org_id}/admin/kyc/pending?page=1&limit=20`
Lists PENDING\_REVIEW KYC submissions with marketer name, document type, submitted date,
and pre-signed document URLs (15-min expiry, generated per request).

`POST /marketers/{org_id}/admin/kyc/{kyc_id}/approve`
Calls `approve_kyc`.

`POST /marketers/{org_id}/admin/kyc/{kyc_id}/reject`
Body: `{ reason }`. Calls `reject_kyc`.

`GET /marketers/{org_id}/admin/payouts?status=requested&page=1&limit=50`
Lists payout requests from marketers only (joins `Marketer` to filter).
Each row includes marketer name, email, referral code alongside the payout data.

`POST /marketers/{org_id}/admin/payouts/{payout_id}/approve`
Sets payout to APPROVED. Background job picks it up and processes automatically.

`POST /marketers/{org_id}/admin/payouts/{payout_id}/reject`
Body: `{ reason }`. Raises `MKTR_406` if payout is already APPROVED or beyond.

* * *
### 3.5 Background Jobs

**File:** `apps/api/src/jobs/referral_jobs.py`

Apply bug fix 3.2.8 (chunked processing) to the existing `update_pending_commissions_to_eligible`.

Add `refresh_all_marketer_counters_job` running daily at 01:00 UTC:
*   Queries all active `Marketer` rows across all orgs
*   Calls `refresh_marketer_counters([marketer.id](http://marketer.id), db_session)` for each
*   Keeps denormalized counter fields accurate

The existing `process_payout_requests_job` runs every 30 minutes, queries for `APPROVED`
payouts, and calls `process_payout_request` — this already works correctly once bug 3.2.1
is fixed. No structural change to the job itself.

* * *
### 3.6 Error Handling

**\#### 3.6.1 Error Response Shape**

All marketer endpoint errors use:

```json
{  
  "error_code": "MKTR_301",  
  "message": "Human-readable explanation for the user",  
  "field": "amount"  
}
```

`field` is optional — only present when the error is tied to a specific input field.
Internal details (stack trace, user\_id, SQL) are logged server-side only, never in the response.

**\#### 3.6.2 Global Exception Handler**

In `apps/api/src/routers/referrals/marketers.py`, add an exception handler on the router:

1. Catches any unhandled exception
2. Logs full traceback + request context (user\_id, org\_id, endpoint, timestamp) to Sentry
3. Returns HTTP 500 with `{ "error_code": "MKTR_500", "message": "An unexpected error occurred. Our team has been notified." }`

**\#### 3.6.3 Error Code Registry**

**Registration (MKTR\_001–099):**
*   `MKTR_001` — User already has a marketer profile in this org
*   `MKTR_002` — User account not found
*   `MKTR_003` — Organisation not found or inactive
*   `MKTR_004` — Registration rate limit exceeded (3 attempts/hour/IP)
*   `MKTR_005` — Network registration limit reached (3 accounts/30 days/IP)
*   `MKTR_006` — Phone number already registered to another marketer in this org
*   `MKTR_007` — Marketer account is suspended — contact support
*   `MKTR_008` — Marketer application was rejected — contact support to appeal

**Commission (MKTR\_100–199):**
*   `MKTR_101` — Referral code not found for this marketer
*   `MKTR_102` — Commission already exists (idempotency duplicate — logged, not surfaced to caller)
*   `MKTR_103` — Commission amount calculation failed (internal — logged, falls back to $4.00)

**KYC (MKTR\_200–299):**
*   `MKTR_201` — This government ID is already linked to another account
*   `MKTR_202` — Maximum KYC submission attempts reached (3/3) — contact support
*   `MKTR_203` — Invalid document type
*   `MKTR_204` — File type not supported — use JPEG, PNG, or PDF
*   `MKTR_205` — File size exceeds 10MB limit
*   `MKTR_206` — KYC required before payout — complete identity verification first
*   `MKTR_207` — KYC is under review — payouts unlock once verification is complete

**Payout (MKTR\_300–399):**
*   `MKTR_301` — Payout amount below minimum ($7.70)
*   `MKTR_302` — Requested amount exceeds eligible balance
*   `MKTR_303` — A payout is already in progress — wait for it to complete
*   `MKTR_304` — No payment method saved — add bank or mobile money details first
*   `MKTR_305` — Country not set on profile — update your profile before requesting a payout
*   `MKTR_306` — Paystack recipient creation failed — check your bank details
*   `MKTR_307` — Payout transfer failed after retries — your balance has been restored
*   `MKTR_308` — Payout not found
*   `MKTR_309` — Payout cannot be approved — it is not in REQUESTED status
*   `MKTR_310` — Currency not supported for your country

**Payment Method (MKTR\_350–399):**
*   `MKTR_351` — Country not supported
*   `MKTR_352` — Mobile money not available for this country
*   `MKTR_353` — Bank transfer not available for this country
*   `MKTR_354` — Account details invalid (Paystack verification failed)
*   `MKTR_355` — Cannot update payment method — payout is currently processing

**Admin (MKTR\_400–499):**
*   `MKTR_401` — Marketer not found
*   `MKTR_402` — Cannot approve — marketer is not in PENDING\_APPROVAL status
*   `MKTR_403` — Cannot suspend — marketer is already suspended
*   `MKTR_404` — Cannot reactivate — rejected accounts must re-apply
*   `MKTR_405` — KYC record not found
*   `MKTR_406` — Payout already approved or processed — cannot modify

**\#### 3.6.4 Graceful Payout Retry**

`process_payout_request` (after fix 3.2.1) on Paystack API failure:
*   Increments `payout.retry_count`, sets `payout.last_retry_at`
*   If `retry_count < 3`: sets status back to `APPROVED` (auto-retried on next job run in 30 min)
*   If `retry_count >= 3`: sets status to `FAILED`, sends `MKTR_307` to marketer and admin alert
*   Marketer balance is restored on FAILED (existing two-phase commit logic handles this)

**\---**

**\### 3.7 Email Notifications**

Add these templates to `apps/api/src/services/email/templates/`:

*   `marketer_application_received.html` — sent on registration
*   `marketer_approved.html` — sent on admin approval; includes referral link and instruction to add payment method
*   `marketer_rejected.html` — sent on rejection; includes reason and support contact
*   `marketer_commission_eligible.html` — sent daily (digest) when commissions move to ELIGIBLE; includes eligible amount and link to request payout
*   `marketer_payout_processing.html` — sent when admin approves and job starts
*   `marketer_payout_completed.html` — sent on COMPLETED; includes amount, local currency equivalent, last 4 digits, Paystack reference
*   `marketer_payout_failed.html` — sent on FAILED after all retries; includes reason and link to update payment method
*   `marketer_kyc_verified.html` — sent on KYC approval; confirms payouts are now unlocked
*   `marketer_kyc_rejected.html` — sent on KYC rejection; includes reason and resubmission instructions if attempts remain

* * *
### 3.8 Backend Files Summary

**New files:**

```plain
apps/api/src/db/referrals/marketers.py  
apps/api/src/db/referrals/marketer_payment_methods.py  
apps/api/src/db/referrals/marketer_kyc.py  
apps/api/src/services/referrals/marketers.py  
apps/api/src/services/referrals/marketer_kyc.py  
apps/api/src/routers/referrals/marketers.py  
apps/api/migrations/versions/<ts>_add_indexes_and_payout_retry_fields.py  
apps/api/migrations/versions/<ts>_add_commission_type_to_referralcommission.py  
apps/api/migrations/versions/<ts>_create_marketer_and_payment_method_tables.py  
apps/api/migrations/versions/<ts>_create_marketer_kyc_table.py  
apps/api/src/tests/marketers/test_commission_amount.py  
apps/api/src/tests/marketers/test_marketer_service.py  
apps/api/src/tests/marketers/test_marketer_kyc.py  
apps/api/src/tests/marketers/test_marketer_payout.py  
apps/api/src/tests/marketers/test_flutterwave_commission.py  
apps/api/src/tests/marketers/test_marketer_registration_flow.py  
apps/api/src/tests/marketers/test_marketer_payout_flow.py  
apps/api/src/services/email/templates/marketer_*.html  (9 templates)
```

**Modified files:**

```plain
apps/api/src/db/referrals/referral_commissions.py  
  — add CommissionType enum  
  — add commission_type field to ReferralCommission + schemas

<p><br/></p>

apps/api/src/db/referrals/payout_requests.py  
  — add retry_count, last_retry_at fields + schemas

<p><br/></p>

apps/api/src/services/referrals/referral_commissions.py  
  — replace COMMISSION_AMOUNT_USD constant with get_commission_amount_for_code()  
  — update create_commission_for_payment to call get_commission_amount_for_code  
  — update validate_payout_amount to call get_minimum_payout()  
  — FIX: get_commission_balance — 3 queries → 1  
  — FIX: update_pending_commissions_to_eligible — chunked 500 rows

<p><br/></p>

apps/api/src/services/referrals/payouts.py  
  — FIX line 603: REQUESTED → APPROVED guard  
  — FIX line 415: add APPROVED to in-flight check  
  — FIX: replace nuban hard-code with CURRENCY_TO_PAYSTACK_RECIPIENT_TYPE map  
  — FIX: rename + generalise exchange rate function for all currencies  
  — FIX: expand COUNTRY_TO_CURRENCY (RW, TZ, UG, CI, EG)  
  — add get_active_payment_method()  
  — add save_payment_method()  
  — add cache_paystack_recipient_code()  
  — update create_payout_request for use_saved_method + prerequisites check  
  — add retry logic to process_payout_request

<p><br/></p>

apps/api/src/routers/webhooks/flutterwave.py  
  — FIX: add commission creation after successful course enrollment

<p><br/></p>

apps/api/src/jobs/referral_jobs.py  
  — FIX: apply chunking to update_pending_commissions_to_eligible  
  — add refresh_all_marketer_counters_job at 01:00 UTC

<p><br/></p>

apps/api/src/router.py  
  — register marketers router
```

**\---**

**\## 4. Frontend Implementation**

Implement everything in this section after the backend is deployed. The sections are
ordered by dependency.

* * *
### 4.1 Service Layer — `apps/web/services/referral/marketer.service.ts` (new file)

Define TypeScript interfaces first:
`MarketerProfile`, `MarketerDashboardData`, `MarketerStudent`, `MarketerStudentCourse`,
`MonthlyRevenueRecord`, `MarketerPaymentMethod`, `AdminMarketerStats`, `MarketerKYCStatus`,
`MarketerPayoutRecord`, `MarketerError`

`MarketerError` shape:

```plain
interface MarketerError {  
  error_code: string   // e.g. "MKTR_301"  
  message: string      // human-readable, show this to user  
  field?: string       // optional field that caused the error  
}
```

Central error handler:

```plain
function handleMarketerError(err: MarketerError): void {  
  // maps error_code to user-facing message (localised)  
  // logs error_code to console for debugging  
  // never displays raw error_code in the UI  
  toast.error(err.message)  
}
```

Export async functions for every endpoint:
*   `registerAsMarketer(orgSlug, data)`
*   `getMarketerDashboard(orgSlug)`
*   `getMarketerStudents(orgSlug, page, limit)`
*   `getMarketerMonthlyRevenue(orgSlug, year)`
*   `savePaymentMethod(orgSlug, data)`
*   `getPaymentMethod(orgSlug)`
*   `deletePaymentMethod(orgSlug)`
*   `uploadKYCDocuments(orgSlug, formData)`
*   `getKYCStatus(orgSlug)`
*   `requestMarketerPayout(orgSlug, amount)`
*   `getMarketerPayoutHistory(orgSlug)`
*   `adminGetMarketers(orgSlug, status, page, limit)`
*   `adminGetMarketerStats(orgSlug)`
*   `adminGetLeaderboard(orgSlug)`
*   `adminApproveMarketer(orgSlug, marketerId)`
*   `adminRejectMarketer(orgSlug, marketerId, reason)`
*   `adminSuspendMarketer(orgSlug, marketerId)`
*   `adminReactivateMarketer(orgSlug, marketerId)`
*   `adminGetKYCQueue(orgSlug, page, limit)`
*   `adminApproveKYC(orgSlug, kycId)`
*   `adminRejectKYC(orgSlug, kycId, reason)`
*   `adminGetMarketerPayouts(orgSlug, status, page, limit)`
*   `adminApproveMarketerPayout(orgSlug, payoutId)`
*   `adminRejectMarketerPayout(orgSlug, payoutId, reason)`

Use SWR for all read endpoints with sensible keys. Payout balance uses a 60-second
revalidation interval. Dashboard summary uses a 5-minute interval (reads denormalized counters).

**\---**

**\### 4.2 Pages**

**\####** **`apps/web/app/orgs/[orgslug]/marketer/register/page.tsx`**

Public registration page — works for both logged-in users and new visitors.

Form fields: first name, last name, email (pre-filled if logged in), password (if not logged
in), phone number, country (dropdown from `COUNTRY_TO_CURRENCY` keys). Country selector
auto-shows the currency the marketer will be paid in: "You will receive payouts in NGN."

Submit calls `registerAsMarketer`. On success: shows a pending state page.
On failure: maps `error_code` to field-level or global error via `handleMarketerError`.
Specific display: `MKTR_006` → "This phone number is already registered" below the phone
field. `MKTR_001` → "You already have a marketer account — log in to view your dashboard."

Selling point line below the heading: "Earn $7.70 for every student you refer who pays for
a course — paid to your bank or mobile money account."

#### `apps/web/app/orgs/[orgslug]/marketer/page.tsx`

Root marketer dashboard. Gated by marketer status:
*   `PENDING_APPROVAL`: shows holding page — "Your application is under review. We'll email you when approved."
*   `REJECTED`: shows rejection reason and a "Contact Support" link
*   `SUSPENDED`: shows suspension notice with a "Contact Support" link
*   `ACTIVE`: shows full dashboard (see components below)

Fetches `getMarketerDashboard` via SWR. Passes data down to child components as props.
No child component fetches its own data — one network call per page load.

Profile completeness banner: shown below the header when `completeness_flags` has any false
values. Each missing item is a link: "Add payment method", "Complete KYC verification",
"Set your country". Disappears once all flags are true.

#### `apps/web/app/orgs/[orgslug]/marketer/students/page.tsx`

Full paginated student list. Separate page (not a modal) because the table can be large.
Fetches `getMarketerStudents` with SWR, supports search by student name/email on the
client side. Links back to the dashboard.

#### `apps/web/app/orgs/[orgslug]/marketer/revenue/page.tsx`

Monthly revenue detail. Year picker (default current year). Fetches `getMarketerMonthlyRevenue`.
Shows chart + table side by side. Table is exportable as CSV (client-side generation,
no backend endpoint needed).

#### `apps/web/app/orgs/[orgslug]/marketer/payouts/page.tsx`

Three panels on one page:

1. Payout balance panel (live, 60s SWR revalidation)
2. Saved payment method (bank or mobile money, masked)
3. Payout history table

* * *
### 4.3 Components

#### `apps/web/components/Marketer/MarketerSummaryCards.tsx`

Four stat cards at the top of the dashboard:
*   Total Students Referred (number)
*   Total Courses Sold (number)
*   Total Earned (USD formatted)
*   Available for Payout (USD — highlighted green if > $7.70, grey otherwise)

Accepts pre-fetched `summary` from dashboard response as props. No internal fetch.

#### `apps/web/components/Marketer/MarketerRevenueChart.tsx`

Bar chart showing monthly commission earnings for the last 6 months (condensed view on
dashboard). Two data series: Earned vs Paid. Uses whatever charting library is already in
the project; introduce no new dependencies.

"View full history" link routes to `/marketer/revenue`.

#### `apps/web/components/Marketer/MarketerStudentTable.tsx`

Reusable table used on both the dashboard (top 5 rows, no pagination) and the student list
page (full, with pagination). Props: `students`, `showPagination`.

Columns: Student Name, Email, Signup Date, Courses Purchased (badge count), Total Commission,
Status. Row is expandable: shows per-course breakdown (course name, purchase date, commission
amount, commission status badge).

#### `apps/web/components/Marketer/ReferralCodeCard.tsx`

Displays the marketer's referral code and referral link with a copy-to-clipboard button.
Reuses the existing referral code card component if one exists. If not, create it once here
and also export it for use in the existing referral dashboard.

#### `apps/web/components/Marketer/PaymentMethodForm.tsx`

Dual-mode form toggled by `PaymentMethodType`. Country selector auto-sets available payment
types and the expected currency.

Bank Transfer fields: bank name, account number, account holder name, bank code (with
tooltip explaining where to find it).

Mobile Money fields: phone number (with country code prefix), provider name (dropdown:
M-Pesa, MTN MoMo, Airtel Money, Orange Money), account name.

On submit: calls `savePaymentMethod`. On `MKTR_354` (Paystack validation failed): shows
"We could not verify these account details — please check and try again" below the form.
On success: shows masked saved method with an Edit button.

Country-to-available-methods logic lives in this component so the user can never select
mobile money for Nigeria (only bank transfer) or bank transfer for a mobile-money-only
country.

#### `apps/web/components/Marketer/MarketerPayoutPanel.tsx`

Shows:
*   Eligible balance (USD)
*   Minimum payout reminder ($7.70)
*   Saved payment method summary (masked account, last 4 digits)
*   Amount input with max button (fills eligible balance)
*   "Request Payout" button

Disabled with tooltip when any prerequisite is unmet (balance < $7.70, no payment method,
KYC not verified). Tooltip text maps to the specific missing prerequisite, not a generic
message. On submit: calls `requestMarketerPayout`. Shows in-progress state (PROCESSING/APPROVED)
with a spinner and "Your payout is being processed" message while a payout is in flight.

Error display: `MKTR_303` → "A payout is already in progress — wait for it to complete."
`MKTR_301` → "Minimum payout is $7.70." `MKTR_302` → "Amount exceeds your available balance."

#### `apps/web/components/Marketer/KYCUploadForm.tsx`

Three-step form:

Step 1: Select document type → upload front image (required for all types) → upload back
image (required for NATIONAL\_ID and DRIVERS\_LICENSE, hidden for PASSPORT).

Step 2: Upload selfie. Instruction text: "Hold your \[document type\] next to your face and
take a clear photo." File restrictions shown: max 10MB, JPEG/PNG/PDF.

Step 3: Enter government ID number (plaintext — sent to backend where it is hashed). Review
summary of what will be submitted, confirm checkbox, then Submit.

On `MKTR_201`: show "This ID is already registered to another account — contact support."
On `MKTR_202`: show "You have reached the maximum submission attempts. Contact support."
On success: show "Documents submitted. You'll receive an email once reviewed."

KYC status banner in the dashboard sidebar uses `kyc_status` from the dashboard response:
*   `UNVERIFIED` → "Complete identity verification to unlock payouts" (orange, links to KYC form)
*   `PENDING_REVIEW` → "Identity verification in progress" (yellow)
*   `VERIFIED` → "Identity verified" (green, no link)
*   `REJECTED` → "Verification failed — \[reason\]. Resubmit →" (red)

**\####** **`apps/web/components/Marketer/AdminMarketerStats.tsx`**

Summary bar at top of the admin Marketers tab:
*   Total Marketers, Active, Pending Approval, Total Commissions Paid to Marketers

Each number is a link that filters the table below to that status.

**\---**

**\### 4.4 Admin Dashboard Additions**

**File:** `apps/web/app/orgs/[orgslug]/dash/referrals/page.tsx`

Add a "Marketers" top-level tab alongside existing referral tabs. Three sub-tabs inside:

**Sub-tab: Applications**
Table: Name, Email, Country, Phone, Applied Date, Status badge, Actions.
Filter by status (PENDING\_APPROVAL, ACTIVE, REJECTED, SUSPENDED). Each row: "Approve" and
"Reject" actions for PENDING rows, "Suspend" / "Reactivate" for ACTIVE/SUSPENDED rows.
On Approve: confirmation dialog with the marketer's name. On Reject: modal with required
reason textarea.

**Sub-tab: KYC Review**
Table: Marketer Name, Email, Document Type, Submitted Date, Status badge, "Review" action.
Badge on the sub-tab heading shows count of PENDING\_REVIEW items.
"Review" action opens a side panel (`AdminKYCReviewPanel.tsx` — see below).

**Sub-tab: Leaderboard**
Ranked table: Rank, Name, Email, Referral Code, Students Referred, Courses Sold, Total
Earned, Paid Out, Balance Due. Sortable. "View Students" action opens a side panel showing
that marketer's student table (reuses `MarketerStudentTable`).

**Sub-tab: Marketer Payouts**
Filtered payout list — only marketers. Each row: marketer name, email, code, requested
amount, local currency equivalent, bank/mobile last 4, status badge, date.
Badge on sub-tab shows count of REQUESTED items awaiting approval.
"Approve" button calls `adminApproveMarketerPayout`. "Reject" button opens reason modal.
On approve: row updates to APPROVED status inline (optimistic update then revalidate).

**\####** **`apps/web/components/Marketer/AdminKYCReviewPanel.tsx`**

Side panel (slide-over) opened from the KYC Review sub-tab.
Shows:
*   Marketer name, email, registration date
*   Document type label
*   Document front image (rendered from pre-signed URL, 15-min expiry)
*   Document back image if present
*   Selfie image
*   Approve and Reject buttons
*   Reject button opens an inline textarea for rejection reason
*   Images load with a spinner; if the pre-signed URL expires while the panel is open,

  show "Image expired — close and reopen to refresh"

* * *
### 4.5 Navigation

In the org sidebar (wherever the existing nav items live):
*   Add "Marketer Dashboard" nav item visible only when `session.user` has a marketer profile

  (any status — so PENDING and REJECTED users can check their status)

*   Show a dot indicator on the nav item when `kyc_status = PENDING_REVIEW` or

  `status = PENDING_APPROVAL` to indicate something awaits their attention

Profile page: no new page needed. Add a "Marketer: View Dashboard" link in the existing
user profile page sidebar if the user has a marketer profile. Profile photo, name, country
updates continue through existing profile endpoints — no duplication.

Country change side effect: when the user saves a new country on the existing profile page,
the frontend calls `deletePaymentMethod` with a flag or the backend's post-save hook handles
it (see Section 3.3.4). Show a notice: "Your saved payment method has been reset because
your country changed. Please re-add your payment details."

**\---**

**\### 4.6 Frontend Files Summary**

**New files:**

```plain
apps/web/services/referral/marketer.service.ts  
apps/web/app/orgs/[orgslug]/marketer/register/page.tsx  
apps/web/app/orgs/[orgslug]/marketer/page.tsx  
apps/web/app/orgs/[orgslug]/marketer/students/page.tsx  
apps/web/app/orgs/[orgslug]/marketer/revenue/page.tsx  
apps/web/app/orgs/[orgslug]/marketer/payouts/page.tsx  
apps/web/components/Marketer/MarketerSummaryCards.tsx  
apps/web/components/Marketer/MarketerRevenueChart.tsx  
apps/web/components/Marketer/MarketerStudentTable.tsx  
apps/web/components/Marketer/ReferralCodeCard.tsx  
apps/web/components/Marketer/PaymentMethodForm.tsx  
apps/web/components/Marketer/MarketerPayoutPanel.tsx  
apps/web/components/Marketer/KYCUploadForm.tsx  
apps/web/components/Marketer/AdminMarketerStats.tsx  
apps/web/components/Marketer/AdminKYCReviewPanel.tsx
```

**Modified files:**

```plain
apps/web/app/orgs/[orgslug]/dash/referrals/page.tsx  
  — add Marketers tab with Applications, KYC Review, Leaderboard, Marketer Payouts sub-tabs  
  — add AdminMarketerStats summary bar

<p><br/></p>

apps/web/app/orgs/[orgslug]/layout.tsx (or sidebar component)  
  — add Marketer Dashboard nav item with dot indicator

<p><br/></p>

apps/web/app/orgs/[orgslug]/profile/page.tsx (or equivalent)  
  — add country-change side effect for payment method invalidation  
  — add "View Marketer Dashboard" link if user is a marketer
```

* * *
## 5\. Security

**RBAC:** `require_active_marketer` guard on all self-service endpoints. Admin endpoints
require `role_id IN (1, 2)`. SUSPENDED marketers can only reach `/me` and `/kyc/status`.

**Data isolation:** Every service function filters by `referrer_user_id = current_user.id`
or `marketer_id = <their marketer id>`. No marketer can access another marketer's data
regardless of query parameter manipulation.

**Payment method masking:** Full account numbers are never returned by any API endpoint.
Only last 4 digits (`****1234`). Full decryption happens only inside `process_payout_request`
in the background job worker, never in API response handlers.

**KYC document access:** S3 keys are stored, not public URLs. Pre-signed URLs (15-min expiry)
are generated only inside admin-authenticated endpoints. Marketers never receive their
document URLs back after upload.

**Device fingerprint at registration:** SHA-256 of User-Agent + Accept-Language + /24 IP
range. Same fingerprint + existing active marketer → review flag. More than 3 marketer
registrations per IP in 30 days → `MKTR_005` auto-reject.

**Government ID uniqueness:** `uq_kyc_id_number_hash` DB constraint — enforced at DB level,
not application level. Application catches `IntegrityError` and raises `MKTR_201`.

**Rate limits:** Registration endpoint: 3 per IP per hour (Redis counter).

**Audit trail:** `approved_by_user_id` + `approved_at` on `Marketer`. `reviewed_by_user_id`
*   `reviewed_at` on `MarketerKYC`. All admin actions are attributable.

**\---**

**\## 6. Testing Requirements**

**Unit tests —** **`apps/api/src/tests/marketers/`**

`test_commission_amount.py`
*   Active marketer → returns 7.70 and CommissionType.MARKETER
*   Non-marketer → returns 4.00 and CommissionType.STANDARD
*   Suspended marketer → returns 4.00 (Redis cache invalidated on suspend)
*   Marketer with custom rate → returns custom rate

`test_marketer_service.py`
*   `register_marketer` creates PENDING\_APPROVAL row
*   `register_marketer` raises MKTR\_001 on duplicate user\_org
*   `register_marketer` raises MKTR\_006 on duplicate phone
*   `approve_marketer` sets ACTIVE, generates referral code, sends email
*   `reject_marketer` sets REJECTED, stores reason
*   `suspend_marketer` sets SUSPENDED, deactivates code, deletes Redis key
*   `is_active_marketer` returns False for SUSPENDED, REJECTED, PENDING\_APPROVAL

`test_marketer_kyc.py`
*   Duplicate ID hash raises MKTR\_201
*   submission\_count >= 3 raises MKTR\_202
*   Approved KYC sends email
*   `validate_payout_prerequisites` raises MKTR\_206 when UNVERIFIED
*   `validate_payout_prerequisites` raises MKTR\_207 when PENDING\_REVIEW

`test_marketer_payout.py`
*   Minimum payout $7.70 enforced (MKTR\_301 below minimum)
*   Payout uses saved payment method without requiring bank details in request
*   Cached recipient code reused when `paystack_recipient_code` is set
*   New recipient created when `paystack_recipient_code` is None
*   Mobile money recipient uses phone\_number not account\_number
*   `check_pending_payout` blocks when APPROVED payout exists
*   Retry count increments on Paystack failure; FAILED after 3 retries
*   Bug fix: `process_payout_request` processes APPROVED (not REQUESTED) payouts

`test_flutterwave_commission.py`
*   Flutterwave charge.completed with referral\_code\_id → commission created
*   Flutterwave charge.completed without referral\_code\_id → no commission
*   Duplicate Flutterwave webhook → no duplicate commission (idempotency)

**Integration tests**

`test_marketer_registration_flow.py`
*   Full flow: register → pending → approve → code generated → $7.70 commission on payment

`test_marketer_payout_flow.py`
*   Full flow: commission created → eligible → KYC verified → payout requested → admin

  approves → background job processes → payout completed → balance decremented

**Frontend tests**

Playwright e2e:
*   Registration form submits and shows holding page
*   Admin approves — marketer sees full dashboard on next login
*   Dashboard cards show correct values matching API
*   Payment method form saves (bank and mobile money paths)
*   Request payout disabled below $7.70; enabled above
*   KYC form uploads documents and shows PENDING\_REVIEW status
*   Error codes map to correct visible messages (not raw codes)
*   Country change shows payment method reset notice

* * *
## 7\. Rollout Plan

**Phase 1 — Hotfix (deploy immediately, before any feature work):**
Apply bug fixes 3.2.1 and 3.2.2 to `payouts.py`. This unblocks all existing referral
payouts that have been stuck in APPROVED status. Deploy and verify: check that the
background job processes at least one existing APPROVED payout end-to-end.

**Phase 2 — Backend (feature + remaining fixes):**
Run all four Alembic migrations. Deploy the full backend: new services, new router,
Flutterwave fix (3.2.6), exchange rate fix (3.2.4), nuban fix (3.2.3), country expansion
(3.2.5), query optimizations (3.2.7, 3.2.8), background job additions. No frontend changes
yet — the API is testable via curl/Postman. QA team registers a test marketer, approves,
earns a commission, requests a payout, verifies full lifecycle.

**Phase 3 — Admin Frontend:**
Deploy admin dashboard Marketers tab (Applications, KYC Review, Leaderboard, Marketer Payouts).
Admin team can now manage marketers. First real marketers can be onboarded manually.

**Phase 4 — Marketer Frontend:**
Deploy registration page, marketer dashboard, student table, revenue chart, payout UI,
KYC upload flow, nav additions. Announce marketer program.

**\---**

**\## 8. DRY Enforcement Summary**

| Concern | Single Source |
| ---| --- |
| Commission amount per code | `get_commission_amount_for_code()` in `marketers.py` |
| Marketer active check | `is_active_marketer()` with Redis cache in `marketers.py` |
| Minimum payout per user type | `get_minimum_payout()` in `marketers.py` |
| Payout prerequisites validation | `validate_payout_prerequisites()` in `marketer_kyc.py` |
| Bank data encryption | `encrypt_bank_data()` / `decrypt_bank_data()` in `payouts.py` |
| Paystack recipient creation | `create_paystack_transfer_recipient()` in `payouts.py` |
| Payout pipeline | `process_payout_request()` in `payouts.py` |
| Commission lifecycle | `update_pending_commissions_to_eligible()` job |
| Exchange rate | `get_usd_to_currency_exchange_rate(target)` in `payouts.py` |
| Frontend error display | `handleMarketerError(err)` in `marketer.service.ts` |
| RBAC guard | `require_active_marketer()` applied once per router, not per endpoint |
| Fraud detection | Existing `validate_and_track_referral()` — unchanged |

No commission arithmetic in any router or frontend file. All financial calculations in the
service layer. Frontend receives pre-computed USD amounts and renders them only.