# Payment System Testing Guide

This guide provides step-by-step instructions to test the payment system in LearnHouse, including all necessary data and API endpoints.

## Prerequisites

### 1. Environment Setup

Ensure your `.env` file in `apps/api/.env` has the following Paystack configuration variables:

```env
LEARNHOUSE_PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
LEARNHOUSE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
LEARNHOUSE_PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here
```

**OR** configure them in `apps/api/config/config.yaml`:

```yaml
payments_config:
  paystack:
    paystack_secret_key: "sk_test_..."
    paystack_public_key: "pk_test_..."
    paystack_webhook_secret: "your_webhook_secret_here"
```

### 2. Get Paystack Test Credentials

1. Sign up at [Paystack Dashboard](https://dashboard.paystack.com)
2. Go to Settings → API Keys & Webhooks
3. Copy your **Test Mode** API keys:
   - **Secret Key** (starts with `sk_test_`)
   - **Public Key** (starts with `pk_test_`)
4. Set up webhooks (see Webhook Setup section below)

### 3. Database Setup

Ensure PostgreSQL and Redis are running:
```bash
# Using Docker Compose
cd dev
docker-compose up -d
```

### 4. API Base URL

The API base URL is: `http://localhost:8009/api/v1` (or your configured port)

---

## Step-by-Step Testing Guide

### Step 1: Login to Get Access Token

**Note:** If you're setting up a new instance, use the admin account created during installation. Otherwise, create a user account first.

**Endpoint:** `POST /api/v1/auth/login`

**Request (Form Data):**
```
username: admin@school.dev
password: change_this_password
```

**Response:**
```json
{
  "user": {...},
  "tokens": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ..."
  }
}
```

**Save:** `access_token` for all subsequent API calls

**Headers for all requests:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

---

### Step 2: Create an Organization (if needed)

**Note:** If you already have an organization, skip this step and use the existing `org_id` and `org_slug`.

**Endpoint:** `POST /api/v1/orgs/`

**Request:**
```json
{
  "name": "Test School",
  "slug": "test-school",
  "description": "A test organization for payment testing",
  "email": "contact@testschool.com",
  "about": "Test organization"
}
```

**Response:**
```json
{
  "id": 1,
  "org_uuid": "org_...",
  "name": "Test School",
  "slug": "test-school",
  ...
}
```

**Save:** `org_id` (e.g., `1`) and `org_slug` (e.g., `test-school`) for all subsequent steps

**Note:** Payments feature is enabled by default when creating an organization. No additional step is needed to enable it.

---

### Step 3: Initialize Payment Configuration

**Endpoint:** `POST /api/v1/payments/{org_id}/config?provider=paystack`

**Example:** `POST /api/v1/payments/1/config?provider=paystack`

**Request:** Empty body

**Response:**
```json
{
  "id": 1,
  "org_id": 1,
  "enabled": true,
  "active": true,
  "provider": "paystack",
  "provider_specific_id": null,
  "provider_config": {},
  "creation_date": "2026-01-29T...",
  "update_date": "2026-01-29T..."
}
```

**Note:** Paystack doesn't require OAuth connection. The config is active immediately after initialization (`active: true`).

#### 4a. Verify Configuration

**Endpoint:** `GET /api/v1/payments/{org_id}/config`

**Example:** `GET /api/v1/payments/1/config`

**Expected Response:**
```json
[{
  "id": 1,
  "org_id": 1,
  "enabled": true,
  "active": true,
  "provider": "paystack",
  "provider_specific_id": null,
  "provider_config": {},
  ...
}]
```

---

### Step 4: Create a Course

**Endpoint:** `POST /api/v1/courses/?org_id={org_id}`

**Example:** `POST /api/v1/courses/?org_id=1`

**Request (Form Data):**
```
name: Advanced Python Programming
description: Learn advanced Python concepts
public: true
about: A comprehensive course on Python
learnings: Python, Programming, Advanced Concepts
tags: python,programming,advanced
thumbnail_type: IMAGE
```

**Response:**
```json
{
  "id": 1,
  "course_uuid": "course_...",
  "name": "Advanced Python Programming",
  "org_id": 1,
  ...
}
```

**Save:** `course_id` (e.g., `1`) and `course_uuid`

---

### Step 5: Create a Payment Product

**Endpoint:** `POST /api/v1/payments/{org_id}/products`

**Example:** `POST /api/v1/payments/1/products`

**Request Body:**
```json
{
  "name": "Python Course Access",
  "description": "Full access to Advanced Python Programming course",
  "product_type": "one_time",
  "price_type": "fixed_price",
  "benefits": "Lifetime access, Certificate, Support",
  "amount": 5000.00,
  "currency": "NGN"
}
```

**Supported Currencies:**
- `NGN` - Nigerian Naira
- `USD` - US Dollar
- `GHS` - Ghanaian Cedi
- `ZAR` - South African Rand
- `KES` - Kenyan Shilling
- `XOF` - West African CFA Franc

**Product Types:**
- `"one_time"` - One-time payment
- `"subscription"` - Recurring monthly subscription

**Price Types:**
- `"fixed_price"` - Fixed price
- `"customer_choice"` - Customer can choose amount (minimum set by `amount`)

**Response:**
```json
{
  "id": 1,
  "org_id": 1,
  "payments_config_id": 1,
  "name": "Python Course Access",
  "product_type": "one_time",
  "price_type": "fixed_price",
  "amount": 5000.00,
  "currency": "NGN",
  "benefits": "Lifetime access, Certificate, Support",
  "provider_product_id": null,
  "creation_date": "2026-01-29T...",
  "update_date": "2026-01-29T..."
}
```

**Note:** For one-time payments, `provider_product_id` may be `null` as Paystack doesn't require product creation for one-time payments.

**Save:** `product_id` (e.g., `1`)

---

### Step 6: Link Course to Product

**Endpoint:** `POST /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}`

**Example:** `POST /api/v1/payments/1/products/1/courses/1`

**Request:** Empty body

**Response:**
```json
{
  "message": "Course linked to product successfully"
}
```

**Verify Link:**
- **Get courses by product:** `GET /api/v1/payments/{org_id}/products/{product_id}/courses`
- **Get products by course:** `GET /api/v1/payments/{org_id}/courses/{course_id}/products`

---

### Step 7: Initialize Payment Transaction (Customer Flow)

**Endpoint:** `POST /api/v1/payments/{org_id}/checkout/product/{product_id}`

**Query Parameters:**
- `redirect_uri`: URL to redirect after payment (e.g., `http://localhost:3000/courses/success`)
- `currency`: (Optional) Currency code (NGN, USD, GHS, ZAR, KES, XOF). If not provided, uses product's default currency.

**Example:** `POST /api/v1/payments/1/checkout/product/1?redirect_uri=http://localhost:3000/courses/success&currency=USD`

**Request:** Empty body

**Response:**
```json
{
  "checkout_url": "https://checkout.paystack.com/xxxxx",
  "reference": "ref_xxxxx",
  "access_code": "xxxxx"
}
```

**Note:** This creates a `PaymentsUser` record with status `PENDING` and stores the transaction reference in `provider_specific_data`.

---

### Step 8: Complete Payment (Test Mode)

1. Open the `checkout_url` in your browser
2. Use Stripe test card numbers:
   - **Success:** `4242 4242 4242 4242`
   - **Decline:** `4000 0000 0000 0002`
   - **3D Secure:** `4000 0025 0000 3155`
3. Use any future expiry date (e.g., `12/34`)
4. Use any 3-digit CVC
5. Use any ZIP code
6. Complete the payment

---

### Step 9: Verify Payment Status

#### 11a. Check Course Access

**Endpoint:** `GET /api/v1/payments/{org_id}/courses/{course_id}/access`

**Example:** `GET /api/v1/payments/1/courses/1/access`

**Response:**
```json
{
  "has_access": true
}
```

#### 11b. Get Owned Courses

**Endpoint:** `GET /api/v1/payments/{org_id}/courses/owned`

**Example:** `GET /api/v1/payments/1/courses/owned`

**Response:**
```json
[
  {
    "id": 1,
    "course_uuid": "course_...",
    "name": "Advanced Python Programming",
    ...
  }
]
```

#### 11c. Get Customers List

**Endpoint:** `GET /api/v1/payments/{org_id}/customers`

**Example:** `GET /api/v1/payments/1/customers`

**Response:**
```json
[
  {
    "user_id": 1,
    "user_email": "admin@school.dev",
    "products": [
      {
        "product_id": 1,
        "product_name": "Python Course Access",
        "status": "completed",
        "created_at": "2026-01-29T..."
      }
    ]
  }
]
```

---

### Step 10: Test Webhooks (Optional but Recommended)

Webhooks update payment status automatically. To test:

#### 12a. Set Up Paystack Webhook

1. Go to [Paystack Dashboard](https://dashboard.paystack.com) → Settings → API Keys & Webhooks
2. Click "Add Webhook URL"
3. Set endpoint URL: `https://your-domain.com/api/v1/payments/paystack/webhook`
   - **Note:** Paystack requires HTTPS for webhooks. Use ngrok for local testing.
4. Select events:
   - `charge.success` - Payment completed successfully
   - `charge.failed` - Payment failed
   - `subscription.create` - Subscription created
   - `subscription.disable` - Subscription cancelled
5. Copy the webhook secret (displayed after creating webhook)

#### 12b. Test Webhook Locally

For local testing, use ngrok to expose your local server:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 8009

# Use the HTTPS URL provided by ngrok in Paystack webhook settings
# Example: https://abc123.ngrok-free.app/api/v1/payments/paystack/webhook
```

**Important:** Update `LEARNHOUSE_PAYSTACK_WEBHOOK_SECRET` in your `.env` file with the webhook secret from Paystack dashboard.

---

## Additional Test Scenarios

### Test Scenario 1: Subscription Product

**Create Subscription Product:**
```json
{
  "name": "Monthly Premium Access",
  "description": "Monthly subscription for premium courses",
  "product_type": "subscription",
  "price_type": "fixed_price",
  "benefits": "Access to all premium courses, Priority support",
  "amount": 29.99,
  "currency": "USD"
}
```

**Test Flow:**
1. Create product (Step 5)
2. Link to course (Step 6)
3. Initialize payment transaction (Step 7)
4. Complete payment with test card (Step 8)
5. Verify status is `ACTIVE` (not `COMPLETED`)

### Test Scenario 2: Customer Choice Pricing

**Create Customer Choice Product:**
```json
{
  "name": "Pay What You Want",
  "description": "Support our course",
  "product_type": "one_time",
  "price_type": "customer_choice",
  "benefits": "Course access, Community support",
  "amount": 1000.00,  // Minimum amount
  "currency": "NGN"
}
```

**Test Flow:**
1. Create product
2. Link to course
3. Initialize payment transaction
4. Customer can enter custom amount (minimum amount set in product)

### Test Scenario 3: Multiple Products for One Course

**Test Flow:**
1. Create Course A
2. Create Product 1 (One-time, $99)
3. Create Product 2 (Subscription, $29/month)
4. Link both products to Course A
5. Verify: `GET /api/v1/payments/{org_id}/courses/{course_id}/products` returns both products

### Test Scenario 4: Payment Failure

**Test Flow:**
1. Initialize payment transaction
2. Use declined card: `4084084084084085`
3. Verify payment status becomes `FAILED` (via webhook)
4. Verify course access is `false`

### Test Scenario 5: Currency Selection

**Test Flow:**
1. Create product with currency `NGN`
2. Initialize payment with `currency=USD` parameter
3. Verify transaction uses USD amount
4. Complete payment
5. Check metadata contains `selected_currency: "USD"`

---

## API Endpoints Summary

### Payment Configuration
- `POST /api/v1/payments/{org_id}/config?provider=paystack` - Initialize config
- `GET /api/v1/payments/{org_id}/config` - Get config
- `PUT /api/v1/payments/{org_id}/config` - Update config
- `DELETE /api/v1/payments/{org_id}/config` - Delete config

### Products
- `POST /api/v1/payments/{org_id}/products` - Create product
- `GET /api/v1/payments/{org_id}/products` - List products
- `GET /api/v1/payments/{org_id}/products/{product_id}` - Get product
- `PUT /api/v1/payments/{org_id}/products/{product_id}` - Update product
- `DELETE /api/v1/payments/{org_id}/products/{product_id}` - Delete product

### Course-Product Linking
- `POST /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}` - Link course
- `DELETE /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}` - Unlink course
- `GET /api/v1/payments/{org_id}/products/{product_id}/courses` - Get courses by product
- `GET /api/v1/payments/{org_id}/courses/{course_id}/products` - Get products by course

### Checkout & Access
- `POST /api/v1/payments/{org_id}/checkout/product/{product_id}?redirect_uri=...&currency=...` - Initialize payment
- `GET /api/v1/payments/{org_id}/courses/{course_id}/access` - Check access
- `GET /api/v1/payments/{org_id}/courses/owned` - Get owned courses
- `GET /api/v1/payments/{org_id}/customers` - Get customers
- `GET /api/v1/payments/currencies` - Get supported currencies

### Webhooks
- `POST /api/v1/payments/paystack/webhook` - Paystack webhook handler

---

## Test Data Checklist

### Required Data:
- [ ] User account (email, password)
- [ ] Access token
- [ ] Organization (org_id, org_uuid)
- [ ] Payment config initialized and active
- [ ] Course created (course_id, course_uuid)
- [ ] Product created (product_id)
- [ ] Course linked to product

### Test Cards:
- [ ] Success: `4084084084084081`
- [ ] Decline: `4084084084084085`
- [ ] Insufficient Funds: `4084084084084093`

### Verification Points:
- [ ] Payment config is active
- [ ] Product created successfully
- [ ] Payment transaction initialized
- [ ] Payment completed successfully on Paystack
- [ ] Webhook received and processed
- [ ] Payment status updated to COMPLETED/ACTIVE
- [ ] Course access granted

---

## Troubleshooting

### Issue: "Paystack secret key not configured"
**Solution:** Add `LEARNHOUSE_PAYSTACK_SECRET_KEY` to `.env` or `config.yaml`

### Issue: "Payments config is not active"
**Solution:** Initialize payment config with `POST /api/v1/payments/{org_id}/config?provider=paystack`

### Issue: "Product not found"
**Solution:** Ensure product exists and belongs to the correct org_id

### Issue: "Course is already linked to a product"
**Solution:** Each course can only be linked to one product. Unlink first or use different course.

### Issue: "Invalid currency"
**Solution:** Use only supported currencies: NGN, USD, GHS, ZAR, KES, XOF. Check with `GET /api/v1/payments/currencies`

### Issue: Webhook not updating payment status
**Solution:** 
1. Verify webhook secret is correct in `.env`
2. Check webhook endpoint is accessible (use HTTPS/ngrok for local testing)
3. Verify webhook events are selected in Paystack dashboard
4. Check Paystack dashboard → Webhooks → Delivery logs for errors

### Issue: Payment status stays PENDING
**Solution:**
1. Check webhook is configured correctly
2. Verify webhook secret matches Paystack dashboard
3. Check application logs for webhook processing errors
4. Manually verify transaction in Paystack dashboard

---

## Notes

- All payment amounts are in the base currency unit (e.g., `5000.00` = ₦5000 for NGN, `99.99` = $99.99 for USD)
- Paystack converts amounts to subunits automatically (multiply by 100: NGN 5000 = 500000 kobo)
- Test mode uses test API keys (start with `sk_test_` and `pk_test_`)
- Webhooks are essential for production but can be tested manually in development
- Payment statuses: `PENDING` → `COMPLETED` (one-time) or `ACTIVE` (subscription) → `FAILED` or `CANCELLED`
- A course can only be linked to one product at a time
- Products with active/completed payments cannot be deleted
- Supported currencies: NGN, USD, GHS, ZAR, KES, XOF
- Users can select currency during checkout (optional parameter)
- Paystack requires HTTPS for webhooks (use ngrok for local testing)
