# Discount Code Implementation Plan

## How I'll Implement Organization Bulk Purchase Discounts

**Use Case**: An organization registers 100 students with a discount code (e.g., "SCHOOL2026" for 20% off).

---

## 1. What I'll Build

**Two new database tables:**

- `discount_code` - Store codes with rules (20% off, max 100 uses, expires March 1)
- `discount_code_usage` - Track which student used which code (prevent reuse)

**Backend changes:**

- Add discount validation logic before payment
- Modify Paystack payment to use discounted amount
- Update webhook to record usage after successful payment

**Frontend changes:**

- Add discount code input on payment page
- Show discount calculation (Original: $500, Discount: -$100, Final: $400)
- Build admin UI to create and manage codes
- Build admin UI to create or set discout percentage

---

## 2. How It Works

### Student Flow:

1. Student goes to course enrollment page
2. Enters discount code "SCHOOL2026"
3. System validates code (checks expiry, usage limit, if student already used it)
4. Shows discounted price: $400 instead of $500
5. Student pays via Paystack
6. System records code usage and grants course access

### Admin Flow:

1. Admin creates discount code with:
   - Code: "SCHOOL2026"
   - Discount: 20% or $100 fixed
   - Max uses: 120 students
   - Valid: Feb 1 - March 31(min of 3 month period admin can extend it)
2. Share code with organization
3. Track usage in dashboard (89/120 used, $45K revenue)

---

## 3. Current System (What Exists)

## 3. Current System (What Exists)

**Payment Flow:**

- Student clicks enroll → Frontend gets price → Backend initializes Paystack payment → Student pays → Webhook confirms → Course access granted

**What I'll leverage:**

- Existing Paystack integration (`payments_paystack.py`)
- Existing payment tracking (`PaymentsUser` table)
- Existing RBAC (only admins create codes and set percentage when neccessary)
- Existing organization structure

---

## 4. Implementation Steps (6 Weeks)

**Week 1: Database**

- Create `discount_code` and `discount_code_usage` tables
- Add discount fields to `paymentsuser` table
- Write and test migration

**Week 2-3: Backend**

- Build discount validation service (check expiry, limits, duplicate usage)
- Add API endpoints (create code and discount percentage, list codes, validate code)
- Modify payment initialization to accept discount code
- Calculate discounted amount before Paystack call

**Week 4: Webhook**

- Update Paystack webhook handler
- Record usage in `discount_code_usage` table after successful payment
- Increment usage counter on discount code

**Week 5: Frontend**

- Add discount code input field on payment page
- Show price breakdown (original, discount, final)
- **[NEW UX] Support URL auto-apply: `enroll?code=SCHOOL2026`**
  - Check URL search params on component mount
  - If `code` param present, auto-validate it
  - Auto-apply discount if valid
  - Auto-scroll to show applied discount
  - Perfect for email links sent to organization students
- Build admin dashboard for creating/managing codes
- Show analytics (usage, revenue, students enrolled)
- Student's within an organisation with discount code and company has purchased the couser can access without paying again just used the discount code

**Week 6: Testing & Deploy**

- End-to-end testing
- Test expired codes, usage limits, duplicate prevention
- Deploy to production

---

## 5. Key Technical Decisions

### ⚠️ CRITICAL: Race Condition Prevention - "Price Switch" Attack

**The Problem:** Between frontend validation and payment initialization, the code could expire or hit max_uses limit (other students used it).

**Solution:** Implement double-validation

- Frontend validates code and shows breakdown
- Backend **re-validates inside `initialize_payment` function BEFORE calling Paystack**
- If code is invalid now (expired/max_uses hit), reject payment with error message
- Only if still valid, send discounted amount to Paystack

### ⚠️ CRITICAL: Atomic Usage Counter Increment

**The Problem:** Multiple concurrent payments can race on `current_uses` counter, causing overselling (e.g., 100 max_uses becomes 101).

**Solution:** Use atomic database update (single SQL transaction)

- Instead of read-modify-write pattern, use single atomic UPDATE
- Database handles all concurrency internally
- No application-level race condition possible

### ⚠️ CRITICAL: Webhook Idempotency

**The Problem:** Paystack may send the same webhook multiple times (network retries). Without idempotency check, same payment usage recorded twice, skewing analytics.

**Solution:** Check before recording

- Before recording discount usage in webhook handler, check if it's already been recorded
- If already exists, skip processing (return "already processed")
- If new, process normally

### Other Security Measures

- **Rate limiting:** Apply to validation endpoint (10 attempts/min per IP) and payment init (5 attempts/min per user)
- **RBAC:** Only org admins create/manage codes; students can only validate
- **Audit logging:** Log all code operations, validation failures, usage events

### Partial Refunds Support

**Schema already handles this correctly:**

- Store both `original_amount` and `final_amount` (discounted price paid)
- When refunding, use `final_amount` not `original_amount`
- Decrement `current_uses` counter when refund processed
- This way refunds match exactly what customer paid

---

## 6. Database Schema (Simple View)

**discount_code table:**

```
id, org_id, code, discount_type (percentage/fixed), discount_value,
max_uses, current_uses, valid_from, valid_until, is_active
```

**discount_code_usage table:**

```
id, discount_code_id, user_id, course_id, payment_user_id,
original_amount, discount_amount, final_amount, used_at
```

**paymentsuser (add fields):**

```
discount_code_id, original_amount, discount_amount, final_amount
```

---

## 7. API Endpoints

**Admin operations:**

- `POST /organizations/{org_id}/discount-codes` - Create code
- `GET /organizations/{org_id}/discount-codes` - List codes
- `GET /organizations/{org_id}/discount-codes/{code_id}/analytics` - View usage stats
- `PATCH /organizations/{org_id}/discount-codes/{code_id}/deactivate` - Disable code

**Student operations:**

- `POST /payments/{org_id}/validate-discount` - Check if code valid and get discount amount

---

## 8. What Could Go Wrong & How I'll Handle It

| Issue                                                                  | Solution                                                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **[CRITICAL] Code expires/hits max_uses between validation & payment** | Re-validate inside `initialize_payment` before Paystack call                                         |
| **[CRITICAL] Race condition on usage counter (concurrent payments)**   | Atomic SQL: `UPDATE discount_code SET current_uses = current_uses + 1 WHERE current_uses < max_uses` |
| **[CRITICAL] Duplicate webhooks cause double-counting**                | Check if `discount_code_usage` record exists before processing                                       |
| Student uses code twice for same course                                | Database unique constraint prevents it                                                               |
| Code shared publicly beyond intended scope                             | Set max_uses limit, monitor for abuse patterns, alert at 80%                                         |
| Refund issued but counter not decremented                              | Always decrement counter when refund processed                                                       |
| Payment partial failure (mid-transaction)                              | Usage only recorded after successful webhook                                                         |

---

## 9. Success Metrics

- Admin can create discount code in < 30 seconds
- Student sees discount applied instantly (<1 second)
- Zero duplicate usages (database constraint enforced)
- **[CRITICAL] Zero expired-code payments (re-validation catches them)**
- **[CRITICAL] Usage counter always accurate (atomic SQL prevents oversell)**
- **[CRITICAL] No duplicate webhook processing (idempotency check)**
- Analytics dashboard shows accurate revenue tracking (no double-counts)
- 100% webhook success rate for recording usage
- **[UX] URL auto-apply works correctly** (shares with students via email: `enroll?code=SCHOOL2026`)

---

## 10. Files I'll Create/Modify

**New:**

- `apps/api/src/db/payments/discount_codes.py` (models)
- `apps/api/src/services/payments/discount_codes.py` (validation logic)
- `apps/api/migrations/versions/XXX_add_discount_codes.py` (migration)
- `apps/web/services/payments/discounts.ts` (frontend service)
- `apps/web/app/orgs/[orgslug]/admin/discounts/page.tsx` (admin UI)

**Modify:**

- `apps/api/src/db/payments/payments_users.py` (add discount fields)
- `apps/api/src/services/payments/payments_users.py` (accept discount code param)
- `apps/api/src/services/payments/webhooks/paystack_webhook.py` (record usage)
- `apps/api/src/routers/orgs.py` (add discount endpoints)
- `apps/web/app/orgs/[orgslug]/courses/[courseid]/enroll/page.tsx` (discount input)

---

## Summary

I'll build a discount code system that integrates seamlessly with the existing Paystack payment flow. Organizations create codes, share with students, students apply codes at checkout, and pay discounted amounts. The system tracks everything for analytics and prevents abuse through validation rules and database constraints.

**Timeline**: 6 weeks  
**Risk**: Low (minimal changes to existing code)  
**Estimated Effort**: ~3,000 lines of code (backend + frontend + tests)
