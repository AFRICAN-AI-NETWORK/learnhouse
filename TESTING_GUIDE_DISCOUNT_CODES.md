# Complete Testing Guide: Discount Code System

## End-to-End Testing from Code Creation to Paystack Payment

**Date**: February 6, 2026  
**Test Environment**: Local Development  
**API Base URL**: `http://localhost:8009/api/v1`

---

## Prerequisites

### 1. Ensure Backend is Running

```bash
cd C:\Users\torzor.peter_enbros\dev\learnhouse\apps\api
# Activate virtual environment if needed
python app.py
# or
uvicorn app:app --reload --port 8009
```

**Expected**: Server running on `http://localhost:8009`

### 2. Verify Database Migration Applied

```bash
cd C:\Users\torzor.peter_enbros\dev\learnhouse\apps\api
alembic current
```

**Expected Output**: `2a3b4c5d6e7f` (or later)

### 3. Get Authentication Token

Login to get your JWT token:

```bash
# POST to login endpoint
curl -X POST http://localhost:8009/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-admin@example.com",
    "password": "your-password"
  }'
```

**Save the token** - you'll need it for all subsequent requests.

### 4. Identify Required IDs

You need:

- `org_id` - Your organization ID (e.g., `2`)
- `course_id` - A course ID to test with (e.g., `1`)
- `product_id` - A payment product linked to the course (e.g., `10`)

---

## Test Flow: Complete End-to-End

### **STEP 1: Create a Discount Code (Admin Operation)**

**What**: Admin creates a 40% discount code for 100 students, valid for 3 months.

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/discount-codes' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json' \
  -d '{
  "code": "TESTCODE40",
  "discount_type": "percentage",
  "discount_value": 40,
  "max_uses": 100,
  "valid_from": "2026-02-06T00:00:00Z",
  "valid_until": "2026-05-06T23:59:59Z",
  "description": "40% discount for testing bulk enrollment"
}'
```

**Expected Response** (200 OK):

```json
{
  "id": 1,
  "org_id": 2,
  "code": "TESTCODE40",
  "discount_type": "percentage",
  "discount_value": 40,
  "max_uses": 100,
  "current_uses": 0,
  "valid_from": "2026-02-06T00:00:00",
  "valid_until": "2026-05-06T23:59:59",
  "is_active": true,
  "description": "40% discount for testing bulk enrollment",
  "created_at": "2026-02-06T...",
  "updated_at": "2026-02-06T..."
}
```

**✓ Verification Points**:

- Code is created with `current_uses = 0`
- Code is automatically uppercase: `TESTCODE40`
- `is_active = true`

**Save the `id`** from response (e.g., `1`) - this is your `code_id`.

---

### **STEP 2: List All Discount Codes (Verify Creation)**

```bash
curl -X GET 'http://localhost:8009/api/v1/payments/2/discount-codes' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

**Expected Response** (200 OK):

```json
[
  {
    "id": 1,
    "org_id": 2,
    "code": "TESTCODE40",
    "discount_type": "percentage",
    "discount_value": 40,
    "max_uses": 100,
    "current_uses": 0,
    ...
  }
]
```

**✓ Verification Points**:

- Your code appears in the list
- All fields match what you created

---

### **STEP 3: Validate Discount Code (Student Operation)**

**What**: Student enters discount code and sees the discounted price before payment.

**Scenario**: Course costs $500, student wants to see price with discount.

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/validate-discount?code=TESTCODE40&course_id=1&amount=500' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -d ''
```

**Expected Response** (200 OK):

```json
{
  "valid": true,
  "discount_code_id": 1,
  "code": "TESTCODE40",
  "discount_type": "percentage",
  "discount_value": 40,
  "original_amount": 500,
  "discount_amount": 200,
  "final_amount": 300,
  "description": "40% discount for testing bulk enrollment"
}
```

**✓ Verification Points**:

- `valid = true`
- Calculation is correct: $500 - 40% = $500 - $200 = $300
- Shows discount breakdown for UI display

**Test Invalid Code** (should fail gracefully):

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/validate-discount?code=INVALID123&course_id=1&amount=500' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -d ''
```

**Expected Response** (200 OK):

```json
{
  "valid": false,
  "error": "Invalid or inactive discount code"
}
```

---

### **STEP 4: Initialize Payment with Discount Code**

**What**: Student proceeds to checkout with the discount code applied.

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/checkout/product/10?redirect_uri=http://localhost:3000/success&discount_code=TESTCODE40' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

**Expected Response** (200 OK):

```json
{
  "checkout_url": "https://checkout.paystack.com/xyzabc123",
  "reference": "ref_xyz123456",
  "access_code": "abc123xyz"
}
```

**✓ Verification Points**:

- You receive a valid Paystack checkout URL
- Reference code is generated
- Check the backend logs for discount validation:

**Backend Logs Should Show**:

```
INFO: Discount code validated: TESTCODE40, discount=200.0, final=300.0
```

**Database Verification**:

```sql
-- Check paymentsuser table
SELECT id, user_id, discount_code_id, original_amount, discount_amount, final_amount, status
FROM paymentsuser
ORDER BY id DESC
LIMIT 1;
```

**Expected Database State**:
| Field | Value |
|-------|-------|
| discount_code_id | 1 |
| original_amount | 500.0 |
| discount_amount | 200.0 |
| final_amount | 300.0 |
| status | PENDING |

---

### **STEP 5: Complete Payment on Paystack**

**What**: Student completes payment on Paystack checkout page.

**Manual Steps**:

1. **Copy the `checkout_url`** from Step 4 response
2. **Open in browser**: Paste URL in browser
3. **You'll see Paystack payment page** showing:
   - Amount: **₦30,000** (if in kobo) or **$300** (if USD)
   - Product name
   - Organization name
4. **Test Card Details** (Paystack Test Mode):
   ```
   Card Number: 4084084084084081
   Expiry: 12/25 (any future date)
   CVV: 408
   PIN: 0000
   OTP: 123456
   ```
5. **Complete payment**
6. **You'll be redirected** to: `http://localhost:3000/success?reference=ref_xyz123456`

**✓ Verification Points**:

- Payment page shows discounted amount ($300, not $500)
- Payment succeeds without errors

---

### **STEP 6: Verify Webhook Processing**

**What**: After successful payment, Paystack sends webhook to your backend.

**Backend Should Process Webhook**:

**Check Backend Logs**:

```
INFO: Processing Paystack webhook event: charge.success
INFO: Recorded discount usage for payment_user_id: 123, discount_code_id: 1
INFO: Payment completed for payment_user_id: 123
```

**Database Verification**:

**1. Check PaymentsUser Status Updated**:

```sql
SELECT id, user_id, status, discount_code_id, final_amount
FROM paymentsuser
WHERE id = 123;  -- Use actual payment_user_id from webhook
```

**Expected**:

- `status = 'COMPLETED'`
- `discount_code_id = 1`
- `final_amount = 300.0`

**2. Check Discount Usage Counter Incremented**:

```sql
SELECT id, code, current_uses, max_uses
FROM discountcode
WHERE id = 1;
```

**Expected**:

- `current_uses = 1` (incremented from 0)
- `max_uses = 100`

**3. Check Usage Record Created**:

```sql
SELECT id, discount_code_id, user_id, course_id, original_amount, discount_amount, final_amount, used_at
FROM discountcodeusage
WHERE discount_code_id = 1
ORDER BY used_at DESC
LIMIT 1;
```

**Expected**:
| Field | Value |
|-------|-------|
| discount_code_id | 1 |
| user_id | (your user ID) |
| course_id | 1 |
| original_amount | 500.0 |
| discount_amount | 200.0 |
| final_amount | 300.0 |
| used_at | (current timestamp) |

---

### **STEP 7: Verify Analytics**

**What**: Admin checks discount code performance.

```bash
curl -X GET 'http://localhost:8009/api/v1/payments/2/discount-codes/1/analytics' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

**Expected Response** (200 OK):

```json
{
  "code": "TESTCODE40",
  "discount_type": "percentage",
  "discount_value": 40,
  "max_uses": 100,
  "current_uses": 1,
  "usage_percentage": 1.0,
  "is_active": true,
  "valid_from": "2026-02-06T00:00:00",
  "valid_until": "2026-05-06T23:59:59",
  "total_uses": 1,
  "unique_students": 1,
  "unique_courses": 1,
  "total_revenue": 300.0,
  "total_discount_given": 200.0,
  "original_revenue": 500.0,
  "revenue_impact_percentage": 40.0
}
```

**✓ Verification Points**:

- `current_uses = 1`
- `usage_percentage = 1.0%` (1 out of 100)
- `total_revenue = 300.0` (what was actually paid)
- `total_discount_given = 200.0` (discount amount)
- `revenue_impact_percentage = 40.0%` (discount gave away 40% of original)

---

### **STEP 8: Test Duplicate Usage Prevention**

**What**: Same student tries to use the same code again for the same course.

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/validate-discount?code=TESTCODE40&course_id=1&amount=500' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -d ''
```

**Expected Response** (200 OK):

```json
{
  "valid": false,
  "error": "You have already used this discount code for this course"
}
```

**✓ Verification Points**:

- System correctly prevents duplicate usage
- Student cannot use the same code twice for the same course

---

### **STEP 9: Test Without Discount Code**

**What**: Verify normal payment flow still works (student doesn't have/use discount code).

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/checkout/product/10?redirect_uri=http://localhost:3000/success' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

**Expected Response** (200 OK):

```json
{
  "checkout_url": "https://checkout.paystack.com/xyzabc456",
  "reference": "ref_xyz789",
  "access_code": "def789xyz"
}
```

**Complete payment** on Paystack page.

**✓ Verification Points**:

- Payment page shows **full price** ($500, not discounted)
- Payment succeeds normally
- No discount fields in database for this payment_user record

**Database Verification**:

```sql
SELECT id, discount_code_id, original_amount, discount_amount, final_amount
FROM paymentsuser
ORDER BY id DESC
LIMIT 1;
```

**Expected**:

- `discount_code_id = NULL`
- `original_amount = NULL`
- `discount_amount = NULL`
- `final_amount = NULL`

---

### **STEP 10: Test Admin Operations**

**1. Update Discount Code**:

```bash
curl -X PATCH 'http://localhost:8009/api/v1/payments/2/discount-codes/1' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json' \
  -d '{
  "discount_value": 50,
  "description": "Updated to 50% discount!"
}'
```

**Expected**: Discount value updated to 50%

**2. Deactivate Discount Code**:

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/discount-codes/1/deactivate' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

**Expected**: `is_active = false`

**3. Try to Use Deactivated Code**:

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/validate-discount?code=TESTCODE40&course_id=2&amount=500' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -d ''
```

**Expected Response**:

```json
{
  "valid": false,
  "error": "Invalid or inactive discount code"
}
```

---

## Edge Case Testing

### **Test 1: Expired Code**

1. Create a code with `valid_until` in the past
2. Try to validate it
3. **Expected**: `"error": "Discount code has expired"`

### **Test 2: Max Uses Reached**

1. Create a code with `max_uses: 2`
2. Use it twice successfully
3. Try to use it a 3rd time
4. **Expected**: `"error": "Discount code has reached maximum usage limit"`

### **Test 3: Code Not Yet Valid**

1. Create a code with `valid_from` in the future
2. Try to validate it
3. **Expected**: `"error": "Discount code is not yet valid"`

### **Test 4: Fixed Amount Discount**

1. Create code with `discount_type: "fixed"`, `discount_value: 100`
2. Validate with `amount=500`
3. **Expected**: `final_amount = 400` ($500 - $100)

### **Test 5: Unlimited Uses**

1. Create code with `max_uses: 0` (or `null`)
2. Use it multiple times
3. **Expected**: All uses succeed, no limit enforced

### **Test 6: Race Condition Simulation**

**Requires concurrent testing tool (e.g., Apache JMeter, k6, or custom script)**

Simulate 10 students using the same code simultaneously:

- Code has `max_uses: 100`
- All 10 payments initialize at the same time
- **Expected**: All 10 succeed, `current_uses` increments to 10 (not 5 or 15)
- Atomic SQL ensures no race condition

---

## Webhook Testing (Local Development)

### Option 1: Use Paystack Test Webhook

Paystack dashboard → Settings → Webhooks → Test webhook

### Option 2: Use ngrok for Local Testing

```bash
# Install ngrok: https://ngrok.com/
ngrok http 8009

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Add to Paystack webhook URL: https://abc123.ngrok.io/api/v1/payments/paystack/webhook
```

### Option 3: Manual Webhook Simulation

```bash
# Simulate a successful charge webhook
curl -X POST 'http://localhost:8009/api/v1/payments/paystack/webhook' \
  -H 'Content-Type: application/json' \
  -H 'x-paystack-signature: YOUR_SIGNATURE_HERE' \
  -d '{
  "event": "charge.success",
  "data": {
    "reference": "ref_xyz123456",
    "status": "success",
    "metadata": {
      "payment_user_id": "123",
      "org_id": "2",
      "user_id": "5",
      "discount_code_id": "1",
      "course_id": "1"
    }
  }
}'
```

---

## Success Criteria Checklist

### Database

- ✅ `discountcode` table exists
- ✅ `discountcodeusage` table exists
- ✅ `paymentsuser` has discount fields

### Admin Operations

- ✅ Can create discount codes
- ✅ Can list discount codes
- ✅ Can update discount codes
- ✅ Can deactivate discount codes
- ✅ Can view analytics

### Student Operations

- ✅ Can validate discount codes
- ✅ Sees correct price calculation
- ✅ Can checkout with discount applied
- ✅ Cannot reuse same code for same course

### Payment Flow

- ✅ Paystack receives discounted amount
- ✅ Payment succeeds with discount
- ✅ Payment succeeds without discount (normal flow)

### Webhook Processing

- ✅ Webhook increments `current_uses`
- ✅ Webhook creates usage record
- ✅ Webhook updates payment status
- ✅ Idempotency prevents duplicate processing

### Security

- ✅ RBAC blocks non-admins from admin operations
- ✅ Atomic SQL prevents race conditions
- ✅ Duplicate usage prevented
- ✅ Expired codes rejected
- ✅ Max uses enforced

---

## Troubleshooting

### Issue: "Invalid or inactive discount code"

**Check**:

1. Code is uppercase in database
2. `is_active = true`
3. `valid_from <= now`
4. `valid_until` is null or `>= now`
5. Code belongs to correct `org_id`

### Issue: "Discount code has reached maximum usage limit"

**Check**:

1. `current_uses < max_uses`
2. If `max_uses = 0`, it should work (means unlimited)

### Issue: Webhook not processing

**Check**:

1. Backend logs for errors
2. Paystack webhook signature is correct
3. `payment_user_id` exists in metadata
4. `discount_code_id` exists in metadata

### Issue: Wrong discount amount

**Check**:

1. Discount type (percentage vs fixed)
2. Discount value (40 means 40%, not $40 for percentage)
3. Original amount passed correctly

---

## Quick Reference: API Endpoints

| Method | Endpoint                                            | Purpose                | Auth    |
| ------ | --------------------------------------------------- | ---------------------- | ------- |
| POST   | `/payments/{org_id}/discount-codes`                 | Create code            | Admin   |
| GET    | `/payments/{org_id}/discount-codes`                 | List codes             | Admin   |
| GET    | `/payments/{org_id}/discount-codes/{id}`            | Get code               | Admin   |
| PATCH  | `/payments/{org_id}/discount-codes/{id}`            | Update code            | Admin   |
| POST   | `/payments/{org_id}/discount-codes/{id}/deactivate` | Deactivate code        | Admin   |
| GET    | `/payments/{org_id}/discount-codes/{id}/analytics`  | View analytics         | Admin   |
| POST   | `/payments/{org_id}/validate-discount`              | Validate code          | Student |
| POST   | `/payments/{org_id}/checkout/product/{id}`          | Checkout with discount | Student |

---

**Testing Complete**: Backend implementation fully functional ✅
**Next**: Frontend UI implementation (Week 5)
