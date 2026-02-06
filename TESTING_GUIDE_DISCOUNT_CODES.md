# Complete Testing Guide: Discount Code System

## Sequential End-to-End Flow from Login to Payment

**Date**: February 6, 2026  
**Test Environment**: Local Development  
**Database**: `postgresql://postgres:test@localhost:5433/learnhouse`  
**API Base URL**: `http://localhost:8009/api/v1`

---

## STEP 0: Verify Backend Setup

### 0.1 Start the Backend API

```bash
cd C:\Users\torzor.peter_enbros\dev\learnhouse\apps\api
python app.py
```

**Expected**: Server running on `http://localhost:8009`

**Verify**: Open browser to `http://localhost:8009/docs` - you should see the API documentation

### 0.2 Verify Database Migrations

```bash
cd C:\Users\torzor.peter_enbros\dev\learnhouse\apps\api
alembic current
```

**Expected Output**: `280140aa1748` (or later)

**Required migrations**:

- `2a3b4c5d6e7f` - Creates `discountcode` and `discountcodeusage` tables
- `280140aa1748` - Adds discount fields to `paymentsuser` table

**If migrations are missing**, run:

```bash
alembic upgrade head
```

---

## STEP 1: Login and Get Authentication Token

**What**: Login as an admin user to get a JWT token for API requests.

```bash
curl -X POST 'http://localhost:8009/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@school.dev",
    "password": "change_this_password"
  }'
```

**Expected Response** (200 OK):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "admin@school.dev",
    ...
  }
}
```

**✓ Save the `access_token`** - Use this as `YOUR_TOKEN` in all subsequent requests

**From now on**, every curl command needs:

```bash
-H 'Authorization: Bearer YOUR_TOKEN'
```

---

## STEP 2: Verify/Create Payment Configuration

**What**: Ensure Paystack payment provider is configured and active.

### 2.1 Check if Config Exists

```bash
curl -X GET 'http://localhost:8009/api/v1/payments/2/config' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Expected**: Array with at least one config where `"active": true` and `"provider": "paystack"`

### 2.2 If No Config Exists, Create One

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/config?provider=paystack' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### 2.3 Activate the Config

```bash
curl -X PUT 'http://localhost:8009/api/v1/payments/2/config' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"active": true}'
```

**✓ Verification**: You should have an active Paystack configuration for org_id=2

---

## STEP 3: Create a Payment Product

**What**: Create a product that students can purchase (e.g., a course enrollment).

**IMPORTANT**: Use `price_type: "fixed_price"` (NOT "one_time")

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/products' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Python Programming Course",
    "description": "Complete Python course for beginners",
    "amount": 500000,
    "currency": "NGN",
    "product_type": "one_time",
    "price_type": "fixed_price"
  }'
```

**Currency Note**: Amounts are in smallest currency unit

- `500000` kobo = ₦5,000
- Always divide by 100 for display

**Expected Response** (200 OK):

```json
{
  "id": 12,
  "name": "Python Programming Course",
  "amount": 500000.0,
  "currency": "NGN",
  "product_type": "one_time",
  "price_type": "fixed_price",
  "org_id": 2,
  ...
}
```

**✓ Save the product `id`** (e.g., `12`) - You'll need this for checkout

---

## STEP 4: Get a Course ID

**What**: Find an existing course to link the product to.

```bash
curl -X GET 'http://localhost:8009/api/v1/orgs/2/courses' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Expected**: Array of courses

**✓ Save a `course_id`** from the response (e.g., `1`)

---

## STEP 5: Link Product to Course

**What**: Associate the payment product with a specific course.

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/products/12/courses/1' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Replace**: `12` with your product_id, `1` with your course_id

**Expected Response** (200 OK):

```json
{
  "id": 1,
  "product_id": 12,
  "course_id": 1,
  ...
}
```

**✓ Verification**: Product is now linked to course and can be purchased

---

## STEP 6: Create a Discount Code (Admin Operation)

---

## STEP 6: Create a Discount Code (Admin Operation)

**What**: Admin creates a 10% discount code for bulk student enrollment.

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/discount-codes' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
  "code": "STUDENT10",
  "discount_type": "percentage",
  "discount_value": 10,
  "max_uses": 0,
  "valid_from": "2026-02-06T00:00:00",
  "valid_until": "2026-12-31T23:59:59",
  "description": "10% discount for bulk student enrollment"
}'
```

**Field Explanations**:

- `code`: Must be unique per organization (automatically converted to uppercase)
- `discount_type`: `"percentage"` or `"fixed"`
- `discount_value`: For percentage use `10` = 10%. For fixed, use amount in kobo
- `max_uses`: `0` or `null` = unlimited uses
- `valid_from` / `valid_until`: ISO 8601 datetime format (timezone optional)

**Expected Response** (200 OK):

```json
{
  "id": 1,
  "org_id": 2,
  "code": "STUDENT10",
  "discount_type": "percentage",
  "discount_value": 10.0,
  "max_uses": 0,
  "current_uses": 0,
  "valid_from": "2026-02-06T00:00:00",
  "valid_until": "2026-12-31T23:59:59",
  "is_active": true,
  "description": "10% discount for bulk student enrollment",
  "created_at": "2026-02-06T...",
  "updated_at": "2026-02-06T..."
}
```

**✓ Save the discount code `id`** (e.g., `1`)

**Verification Points**:

- Code is uppercase: `STUDENT10`
- `current_uses = 0` (no one has used it yet)
- `is_active = true` (ready to use)
- `max_uses = 0` means unlimited

---

## STEP 7: List All Discount Codes (Verify Creation)

**What**: Confirm the discount code was created successfully.

```bash
curl -X GET 'http://localhost:8009/api/v1/payments/2/discount-codes' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Expected Response** (200 OK):

```json
[
  {
    "id": 1,
    "code": "STUDENT10",
    "discount_type": "percentage",
    "discount_value": 10.0,
    "current_uses": 0,
    "max_uses": 0,
    "is_active": true,
    ...
  }
]
```

**✓ Verification**: Your `STUDENT10` code appears in the list

---

## STEP 8: Validate Discount Code (Student Operation)

**What**: Student enters the discount code to see the discounted price BEFORE payment.

**Scenario**: Course costs ₦5,000 (500000 kobo), student wants 10% discount

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/validate-discount?code=STUDENT10&course_id=1&amount=500000' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d ''
```

**Query Parameters**:

- `code`: The discount code to validate
- `course_id`: ID of the course they want to purchase
- `amount`: Original price in kobo (500000 = ₦5,000)

**Expected Response** (200 OK):

```json
{
  "valid": true,
  "discount_code_id": 1,
  "code": "STUDENT10",
  "discount_type": "percentage",
  "discount_value": 10.0,
  "original_amount": 500000.0,
  "discount_amount": 50000.0,
  "final_amount": 450000.0,
  "description": "10% discount for bulk student enrollment"
}
```

**Calculation Verification**:

- Original: ₦5,000 (500000 kobo)
- Discount: 10% = ₦500 (50000 kobo)
- Final: ₦4,500 (450000 kobo)

**✓ Frontend should display**: "Original: ₦5,000 | Discount: -₦500 | You Pay: ₦4,500"

---

## STEP 9: Test Invalid Discount Code (Error Handling)

**What**: Verify the system properly rejects invalid codes.

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/validate-discount?code=INVALID123&course_id=1&amount=500000' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d ''
```

**Expected Response** (200 OK with error):

```json
{
  "valid": false,
  "error": "Invalid or inactive discount code"
}
```

**✓ Verification**: System correctly rejects non-existent codes

---

## STEP 10: Initialize Payment with Discount Code

**What**: Student proceeds to checkout with the discount applied.

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/checkout/product/12?discount_code=STUDENT10&currency=NGN&redirect_uri=http://localhost:3000/success' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d ''
```

**Query Parameters**:

- `discount_code`: The code to apply (optional)
- `currency`: Must match product currency (NGN)
- `redirect_uri`: Where to redirect after payment

**Replace**: `12` with your actual product_id from Step 3

**Expected Response** (200 OK):

```json
{
  "checkout_url": "https://checkout.paystack.com/abc123xyz",
  "reference": "s4dl75eavp",
  "access_code": "abc123xyz"
}
```

**✓ Save the `reference`** - You'll need it to verify payment later

**Backend Logs Should Show**:

```
INFO: Making Paystack GET request to /customer/admin@school.dev
INFO: Making Paystack POST request to /transaction/initialize
INFO: Discount code validated successfully
```

---

## STEP 11: Verify Database State (Before Payment)

**What**: Check that the payment record was created with discount information.

**Connect to database**:

```bash
psql -U postgres -h localhost -p 5433 -d learnhouse
```

**Query paymentsuser table**:

```sql
SELECT id, user_id, discount_code_id, original_amount, discount_amount, final_amount, status
FROM paymentsuser
ORDER BY id DESC
LIMIT 1;
```

**Expected Result**:
| id | user_id | discount_code_id | original_amount | discount_amount | final_amount | status |
|----|---------|------------------|-----------------|-----------------|--------------|--------|
| 123 | 1 | 1 | 500000.0 | 50000.0 | 450000.0 | pending |

**✓ Verification**:

- Discount information is stored BEFORE payment
- Status is `pending` (payment not completed yet)
- Final amount is the discounted price (450000 kobo)

---

## STEP 12: Complete Payment on Paystack (Manual Step)

**What**: Student completes payment on Paystack's checkout page.

**Manual Actions**:

1. **Copy the `checkout_url`** from Step 10 response
2. **Open in browser**: Paste the URL
3. **Verify amount on Paystack page**: Should show **₦4,500** (discounted, NOT ₦5,000)
4. **Use Paystack test card**:
   ```
   Card Number: 4084084084084081
   Expiry: 12/25
   CVV: 408
   PIN: 0000
   OTP: 123456
   ```
5. **Complete the payment**
6. **You'll be redirected** to: `http://localhost:3000/success?reference=s4dl75eavp`

**✓ Verification Points**:

- Paystack page shows ₦4,500 (not ₦5,000)
- Payment succeeds without errors
- Redirect includes the reference parameter

---

## STEP 13: Verify Transaction Status

**What**: After payment, verify it was successful using the reference.

```bash
curl -X GET 'http://localhost:8009/api/v1/payments/2/transactions/s4dl75eavp' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Replace**: `s4dl75eavp` with your actual reference from Step 10

**Expected Response** (200 OK):

```json
{
  "reference": "s4dl75eavp",
  "paystack_status": "success",
  "transaction_data": {
    "amount": 450000,
    "currency": "NGN",
    "gateway_response": "Successful",
    "paid_at": "2026-02-06T12:34:56.000Z",
    "created_at": "2026-02-06T12:30:00.000Z"
  },
  "payment_user_id": 123,
  "payment_status_updated": true,
  "previous_status": "pending",
  "new_status": "completed"
}
```

**✓ Verification Points**:

- `paystack_status`: "success"
- `amount`: 450000 (the discounted amount)
- `payment_status_updated`: true (system updated the status automatically)
- Status changed from "pending" to "completed"

---

## STEP 14: Verify Database State (After Payment)

**What**: Confirm the discount was recorded and usage counter incremented.

### 14.1 Check Payment Status Updated

```sql
SELECT id, user_id, status, discount_code_id, original_amount, discount_amount, final_amount
FROM paymentsuser
WHERE id = 123;  -- Use your actual payment_user_id
```

**Expected**:

- `status = 'completed'` (was 'pending' before)
- `discount_code_id = 1`
- All discount amounts are preserved

### 14.2 Check Discount Usage Counter Incremented

```sql
SELECT id, code, current_uses, max_uses
FROM discountcode
WHERE id = 1;
```

**Expected**:

- `current_uses = 1` (incremented from 0)
- This prevents race conditions (atomic update)

### 14.3 Check Usage Record Created

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
| user_id | 1 |
| course_id | 1 |
| original_amount | 500000.0 |
| discount_amount | 50000.0 |
| final_amount | 450000.0 |
| used_at | 2026-02-06 12:34:56 |

**✓ Verification**: Complete audit trail of who used the discount, when, and how much they saved

---

## STEP 15: View Discount Analytics (Admin)

**What**: Admin checks the performance and revenue impact of the discount code.

```bash
curl -X GET 'http://localhost:8009/api/v1/payments/2/discount-codes/1/analytics' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Expected Response** (200 OK):

```json
{
  "code": "STUDENT10",
  "discount_type": "percentage",
  "discount_value": 10.0,
  "max_uses": 0,
  "current_uses": 1,
  "usage_percentage": null,
  "is_active": true,
  "valid_from": "2026-02-06T00:00:00",
  "valid_until": "2026-12-31T23:59:59",
  "total_uses": 1,
  "unique_students": 1,
  "unique_courses": 1,
  "total_revenue": 450000.0,
  "total_discount_given": 50000.0,
  "original_revenue": 500000.0,
  "revenue_impact_percentage": 10.0
}
```

**Analytics Breakdown**:

- **Total Uses**: 1 student used this code
- **Revenue Impact**: Gave away 10% (₦500) of potential revenue
- **Actual Revenue**: Collected ₦4,500 instead of ₦5,000
- **Unique Students**: 1 different student
- **Unique Courses**: Applied to 1 course

**✓ Frontend Dashboard**: Can display charts showing revenue impact, usage over time, etc.

---

## STEP 16: Test Duplicate Usage Prevention

**What**: Same student tries to use the same code again for the same course.

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/validate-discount?code=STUDENT10&course_id=1&amount=500000' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d ''
```

**Expected Response** (200 OK):

```json
{
  "valid": false,
  "error": "You have already used this discount code for this course"
}
```

**✓ Verification**: System correctly prevents duplicate usage per student per course

**Note**: Same student CAN use the code for a DIFFERENT course (if max_uses allows)

---

## STEP 17: Test Payment Without Discount Code

**What**: Verify normal payment flow still works (no discount applied).

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/checkout/product/12?currency=NGN&redirect_uri=http://localhost:3000/success' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d ''
```

**Note**: No `discount_code` parameter

**Expected Response** (200 OK):

```json
{
  "checkout_url": "https://checkout.paystack.com/xyz789",
  "reference": "ref_abc456",
  "access_code": "def789xyz"
}
```

**Complete payment on Paystack**:

- Amount should be **₦5,000** (full price, not discounted)

**Database Verification After Payment**:

```sql
SELECT id, discount_code_id, original_amount, discount_amount, final_amount
FROM paymentsuser
ORDER BY id DESC
LIMIT 1;
```

**Expected**:

- `discount_code_id = NULL` (no discount)
- `original_amount = NULL`
- `discount_amount = NULL`
- `final_amount = NULL`

**✓ Verification**: Discount system is optional - normal checkout works without it

---

## STEP 18: Test Admin Operations

### 18.1 Update Discount Code

```bash
curl -X PATCH 'http://localhost:8009/api/v1/payments/2/discount-codes/1' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
  "discount_value": 15,
  "description": "Updated to 15% discount!"
}'
```

**Expected**: Discount value updated to 15%

**Verify**:

```bash
curl -X GET 'http://localhost:8009/api/v1/payments/2/discount-codes/1' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### 18.2 Deactivate Discount Code

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/discount-codes/1/deactivate' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Expected**: `is_active = false`

### 18.3 Try to Use Deactivated Code

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/validate-discount?code=STUDENT10&course_id=2&amount=500000' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d ''
```

**Expected Response**:

```json
{
  "valid": false,
  "error": "Invalid or inactive discount code"
}
```

**✓ Verification**: Deactivated codes cannot be used

---

## Summary: What Was Tested

### ✅ Setup Phase (Steps 0-5)

1. Backend running
2. Database migrations applied
3. User authenticated
4. Payment config created and active
5. Product created (₦5,000)
6. Product linked to course

### ✅ Discount Creation (Steps 6-7)

7. Admin created discount code (STUDENT10, 10% off)
8. Verified code exists in database

### ✅ Student Usage (Steps 8-14)

9. Student validated code (saw ₦4,500 final price)
10. Student proceeded to checkout
11. Database recorded pending payment with discount
12. Student completed payment on Paystack (paid ₦4,500)
13. Transaction verified as successful
14. Database updated: status=completed, usage incremented, audit record created

### ✅ Admin Analytics (Step 15)

15. Admin viewed revenue impact (₦500 discount given, ₦4,500 collected)

### ✅ Edge Cases (Steps 16-18)

16. Duplicate usage prevented
17. Payment without discount works normally
18. Admin can update/deactivate codes

---

## Quick Reference: IDs and Values Used

| Item             | Value       | Notes                     |
| ---------------- | ----------- | ------------------------- |
| org_id           | 2           | Your organization         |
| course_id        | 1           | Course to link product to |
| product_id       | 12          | Created in Step 3         |
| discount_code_id | 1           | Created in Step 6         |
| discount_code    | STUDENT10   | 10% off                   |
| original_price   | 500000 kobo | ₦5,000                    |
| discount_amount  | 50000 kobo  | ₦500                      |
| final_price      | 450000 kobo | ₦4,500                    |

---

## Next Steps for Frontend Development

Now that the backend is fully tested and working, frontend developers can:

1. **Implement Checkout UI**:

   - Add discount code input field
   - Call validation endpoint
   - Show price breakdown

2. **Implement Admin Dashboard**:

   - List discount codes
   - Create/edit code form
   - Analytics charts

3. **See**: [FRONTEND_DISCOUNT_GUIDE.md](FRONTEND_DISCOUNT_GUIDE.md) for complete React examples

---

**Testing Status**: ✅ Complete - All flows working correctly  
**Backend Status**: ✅ Production-ready  
**Date Verified**: February 6, 2026
"updated_at": "2026-02-06T..."
}

````

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
````

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

**Use the product_id from Step 6** (e.g., `12`):

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/checkout/product/12?discount_code=STUDENT10&currency=NGN&redirect_uri=http://localhost:3000/success' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d ''
```

**Important Query Parameters**:

- `discount_code`: The discount code to apply (optional)
- `currency`: Must match product currency (NGN)
- `redirect_uri`: Where to redirect after payment

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

### **STEP 6: Verify Transaction Manually**

**What**: After payment, verify the transaction status using the reference.

**Use the reference from Step 4** (e.g., `s4dl75eavp`):

```bash
curl -X GET 'http://localhost:8009/api/v1/payments/2/transactions/s4dl75eavp' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Expected Response** (200 OK):

```json
{
  "reference": "s4dl75eavp",
  "paystack_status": "success",
  "transaction_data": {
    "amount": 450000,
    "currency": "NGN",
    "gateway_response": "Successful",
    "paid_at": "2026-02-06T12:34:56.000Z",
    "created_at": "2026-02-06T12:30:00.000Z"
  },
  "payment_user_id": 123,
  "payment_status_updated": true,
  "previous_status": "pending",
  "new_status": "completed"
}
```

**✓ Verification Points**:

- `paystack_status`: "success"
- `amount`: 450000 (discounted amount in kobo)
- `payment_status_updated`: true
- Status changed from "pending" to "completed"

---

### **STEP 7: Verify Webhook Processing**

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

### **STEP 9: Test Duplicate Usage Prevention**

**What**: Same student tries to use the same code again for the same course.

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/validate-discount?code=STUDENT10&course_id=1&amount=500000' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
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

### **STEP 10: Test Without Discount Code**

**What**: Verify normal payment flow still works (student doesn't have/use discount code).

```bash
curl -X POST 'http://localhost:8009/api/v1/payments/2/checkout/product/12?currency=NGN&redirect_uri=http://localhost:3000/success' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d ''
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

### **STEP 11: Test Admin Operations**

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

## Frontend Integration Guide

### For Frontend Developers

This section explains how to integrate the discount code system into your React/Next.js frontend.

### 1. Checkout Flow with Discount

**User Journey**:

1. Student views course → clicks "Enroll Now"
2. If payment required, show checkout form with discount code input
3. When user enters code, validate it (Step 3 API)
4. Show price breakdown: Original / Discount / Final
5. On confirm, initialize checkout (Step 4 API)
6. Redirect to Paystack page
7. After payment, verify transaction (Step 6 API)

**Example React Component Flow**:

```typescript
// 1. Discount validation
const validateDiscount = async (code: string) => {
  const response = await fetch(
    `/api/v1/payments/2/validate-discount?code=${code}&course_id=${courseId}&amount=${amount}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await response.json();
  if (data.valid) {
    setDiscountAmount(data.discount_amount);
    setFinalAmount(data.final_amount);
  }
};

// 2. Initialize checkout
const checkout = async () => {
  const url = `/api/v1/payments/2/checkout/product/${productId}?discount_code=${discountCode}&currency=NGN`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const { checkout_url, reference } = await response.json();

  // Save reference for verification later
  localStorage.setItem("payment_reference", reference);

  // Redirect to Paystack
  window.location.href = checkout_url;
};

// 3. Verify after redirect back
const verifyPayment = async (reference: string) => {
  const response = await fetch(`/api/v1/payments/2/transactions/${reference}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();

  if (data.paystack_status === "success") {
    // Payment successful, grant course access
    router.push(`/courses/${courseId}`);
  }
};
```

### 2. Display Amounts Correctly

**Important**: API returns amounts in **kobo** (smallest currency unit)

```typescript
// Convert kobo to naira for display
const formatAmount = (kobo: number) => {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString()}`;
};

// Example:
formatAmount(500000); // "₦5,000"
formatAmount(50000); // "₦500"
```

### 3. Price Breakdown UI

```tsx
<div className="price-breakdown">
  <div className="line-item">
    <span>Course Price:</span>
    <span>{formatAmount(originalAmount)}</span>
  </div>

  {discountAmount > 0 && (
    <div className="line-item discount">
      <span>Discount ({discountCode}):</span>
      <span className="text-green">-{formatAmount(discountAmount)}</span>
    </div>
  )}

  <div className="line-item total">
    <span className="font-bold">Total:</span>
    <span className="font-bold">{formatAmount(finalAmount)}</span>
  </div>
</div>
```

### 4. Error Handling

```typescript
try {
  const data = await validateDiscount(code);

  if (!data.valid) {
    // Show error message to user
    switch (data.error) {
      case "Invalid or inactive discount code":
        showError("This discount code is not valid");
        break;
      case "Discount code has expired":
        showError("This discount code has expired");
        break;
      case "You have already used this discount code for this course":
        showError("You've already used this code for this course");
        break;
      default:
        showError(data.error);
    }
  }
} catch (error) {
  showError("Failed to validate discount code");
}
```

### 5. Admin Dashboard Integration

**Discount Management UI** should include:

1. **List View**: Show all codes with status, usage, expiry
2. **Create Form**: Modal/page to create new code
3. **Analytics View**: Revenue impact, usage charts
4. **Bulk Actions**: Deactivate multiple codes

**Example Admin List Component**:

```tsx
const DiscountCodeList = () => {
  const [codes, setCodes] = useState([]);

  useEffect(() => {
    fetch("/api/v1/payments/2/discount-codes", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setCodes);
  }, []);

  return (
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Type</th>
          <th>Value</th>
          <th>Usage</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {codes.map((code) => (
          <tr key={code.id}>
            <td>
              <code>{code.code}</code>
            </td>
            <td>{code.discount_type}</td>
            <td>
              {code.discount_type === "percentage"
                ? `${code.discount_value}%`
                : formatAmount(code.discount_value)}
            </td>
            <td>
              {code.current_uses} / {code.max_uses || "∞"}
            </td>
            <td>
              <Badge variant={code.is_active ? "success" : "danger"}>
                {code.is_active ? "Active" : "Inactive"}
              </Badge>
            </td>
            <td>
              <Button onClick={() => viewAnalytics(code.id)}>Analytics</Button>
              <Button onClick={() => deactivate(code.id)}>Deactivate</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

### 6. Testing Checklist for Frontend

- [ ] Discount input field appears on checkout page
- [ ] "Apply" button validates code and shows breakdown
- [ ] Error messages display for invalid codes
- [ ] Price breakdown shows original, discount, and final amounts
- [ ] Amounts display in correct currency format (₦5,000 not 500000)
- [ ] Checkout redirects to Paystack with discounted amount
- [ ] After payment, verification shows success
- [ ] Without discount code, checkout works normally
- [ ] Admin can create/view/update/deactivate codes
- [ ] Analytics dashboard shows revenue impact

---

**Testing Complete**: Backend implementation fully functional ✅  
**Next Steps**:

1. Frontend UI implementation (Week 5)
2. Admin dashboard components
3. Student checkout flow integration
4. End-to-end testing in staging environment
