# Paystack Payment Integration - Complete Testing Guide

## Table of Contents
1. [How Payments Work](#how-payments-work)
2. [Payment Flow Overview](#payment-flow-overview)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Testing Guide](#step-by-step-testing-guide)
5. [Test Scenarios](#test-scenarios)
6. [Troubleshooting](#troubleshooting)

---

## How Payments Work

### Core Concepts

1. **Free vs Paid Courses**
   - **Free Course**: A course that is NOT linked to any payment product
   - **Paid Course**: A course that IS linked to a payment product via `PaymentsCourse` table

2. **Payment Products**
   - Products define pricing, currency, and payment type (one-time or subscription)
   - Products can be linked to one or more courses
   - One course can only be linked to ONE product at a time

3. **Payment Flow**
   - User selects a course to purchase
   - System checks if course is linked to a product
   - If linked → User must pay
   - If not linked → Course is free, user has immediate access

4. **Access Control**
   - Course authors always have access
   - Users with `ACTIVE` or `COMPLETED` payment status have access
   - Anonymous users have NO access to paid courses
   - Free courses are accessible to everyone

---

## Payment Flow Overview

```
┌─────────────────┐
│ 1. Setup Config │  Initialize Paystack for organization
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Create Product│  Define pricing, currency, type
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Create Course │  Create course content
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Link Course  │  Link course to product (makes it paid)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. User Checkout│  User initiates payment
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Paystack     │  User completes payment on Paystack
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Webhook      │  Paystack confirms payment
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. Access Granted│ User can now access course
└─────────────────┘
```

---

## Prerequisites

### 1. Environment Setup

**Required Environment Variables** (in `.env`):
```env
LEARNHOUSE_PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
LEARNHOUSE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
LEARNHOUSE_PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here
```

**Get Paystack Test Keys:**
1. Sign up at [Paystack Dashboard](https://dashboard.paystack.com)
2. Go to Settings → API Keys & Webhooks
3. Copy Test Secret Key and Public Key
4. Set up webhook (see Step 7 below)

### 2. Test Cards (Paystack Test Mode)

| Card Number | Purpose | Expiry | CVV |
|------------|---------|--------|-----|
| `4084084084084081` | Success | Any future date | Any 3 digits |
| `4084084084084085` | Decline | Any future date | Any 3 digits |
| `4084084084084093` | Insufficient Funds | Any future date | Any 3 digits |

### 3. Base URL
```
http://localhost:8009/api/v1
```
(Adjust port if different)

### 4. Authentication
All endpoints require authentication. You'll need:
- User account with admin/author permissions
- Access token (JWT) from login

---

## Step-by-Step Testing Guide

### Step 1: Enable Payments Feature for Organization

**Purpose**: Enable payments feature in organization config

**Endpoint**: `PUT /api/v1/orgs/{org_slug}/config`

**Request Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "config": {
    "features": {
      "payments": {
        "enabled": true
      }
    }
  }
}
```

**Expected Response**: `200 OK` with updated config

**Data Needed**:
- `org_slug`: Your organization slug (e.g., "my-org")
- Access token from authenticated user

**Verification**:
```bash
GET /api/v1/orgs/{org_slug}/config
```
Check that `features.payments.enabled` is `true`

---

### Step 2: Initialize Payments Config

**Purpose**: Set up Paystack payment provider for the organization

**Endpoint**: `POST /api/v1/payments/{org_id}/config?provider=paystack`

**Request Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Query Parameters**:
- `provider`: `paystack` (required)

**Expected Response**: `200 OK`
```json
{
  "id": 1,
  "org_id": 1,
  "enabled": true,
  "active": false,
  "provider": "paystack",
  "provider_specific_id": null,
  "provider_config": {
    "onboarding_completed": false
  },
  "creation_date": "2026-01-30T...",
  "update_date": "2026-01-30T..."
}
```

**Data Needed**:
- `org_id`: Your organization ID (integer)
- Access token

**Notes**:
- `active` will be `false` initially
- `provider_specific_id` will be `null` (not needed for Paystack)

**Verification**:
```bash
GET /api/v1/payments/{org_id}/config
```

---

### Step 3: Activate Payments Config

**Purpose**: Activate the payments configuration

**Endpoint**: `PUT /api/v1/payments/{org_id}/config`

**Request Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "enabled": true,
  "active": true,
  "provider": "paystack",
  "provider_config": {
    "onboarding_completed": true
  }
}
```

**Expected Response**: `200 OK` with updated config showing `active: true`

**Data Needed**:
- `org_id`: Your organization ID
- Access token

**Verification**:
```bash
GET /api/v1/payments/{org_id}/config
```
Check that `active` is `true`

---

### Step 4: Create a Payment Product

**Purpose**: Create a product that users will purchase to access courses

**Endpoint**: `POST /api/v1/payments/{org_id}/products`

**Request Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Request Body** (One-Time Payment):
```json
{
  "name": "Python Course Access",
  "description": "Full lifetime access to Python Programming Course",
  "product_type": "one_time",
  "price_type": "fixed_price",
  "amount": 5000.00,
  "currency": "NGN",
  "benefits": "Lifetime access, Certificate of completion, All future updates"
}
```

**Request Body** (Subscription):
```json
{
  "name": "Monthly Python Subscription",
  "description": "Monthly subscription to Python Programming Course",
  "product_type": "subscription",
  "price_type": "fixed_price",
  "amount": 2000.00,
  "currency": "NGN",
  "benefits": "Monthly access, Certificate, Updates"
}
```

**Field Descriptions**:
- `name`: Product name (required)
- `description`: Product description (optional)
- `product_type`: `"one_time"` or `"subscription"` (required)
- `price_type`: `"fixed_price"` or `"customer_choice"` (required)
- `amount`: Price amount (required, float)
- `currency`: Currency code - `NGN`, `USD`, `GHS`, `ZAR`, `KES`, or `XOF` (required)
- `benefits`: Comma-separated list of benefits (required)

**Expected Response**: `200 OK`
```json
{
  "id": 1,
  "name": "Python Course Access",
  "description": "Full lifetime access to Python Programming Course",
  "product_type": "one_time",
  "price_type": "fixed_price",
  "amount": 5000.0,
  "currency": "NGN",
  "benefits": "Lifetime access, Certificate of completion, All future updates",
  "org_id": 1,
  "payments_config_id": 1,
  "provider_product_id": "product_1",
  "creation_date": "2026-01-30T...",
  "update_date": "2026-01-30T..."
}
```

**Data Needed**:
- `org_id`: Your organization ID
- Product details (name, amount, currency, etc.)
- Access token

**Save for Later**:
- `product_id`: The `id` from the response (you'll need this in Step 6)

**Verification**:
```bash
GET /api/v1/payments/{org_id}/products
```
Should return your created product

---

### Step 5: Create a Course

**Purpose**: Create a course that will be linked to the payment product

**Endpoint**: `POST /api/v1/orgs/{org_slug}/courses`

**Request Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Python Programming Masterclass",
  "description": "Learn Python from scratch to advanced",
  "about": "Complete Python course covering basics to advanced topics",
  "learnings": "Variables, Functions, Classes, APIs, Data Science",
  "tags": "python,programming,beginner",
  "public": true,
  "open_to_contributors": false
}
```

**Expected Response**: `200 OK` with course details

**Data Needed**:
- `org_slug`: Your organization slug
- Course details
- Access token

**Save for Later**:
- `course_id`: The `id` from the response
- `course_uuid`: The `course_uuid` from the response

**Verification**:
```bash
GET /api/v1/orgs/{org_slug}/courses/{course_uuid}
```

---

### Step 6: Link Course to Product

**Purpose**: Link the course to the payment product (makes the course paid)

**Endpoint**: `POST /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}`

**Request Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected Response**: `200 OK`
```json
{
  "message": "Course linked to product successfully"
}
```

**Data Needed**:
- `org_id`: Your organization ID
- `product_id`: Product ID from Step 4
- `course_id`: Course ID from Step 5
- Access token

**Important Notes**:
- Once linked, the course becomes **PAID**
- Only users who purchase the product will have access
- A course can only be linked to ONE product at a time
- To unlink: `DELETE /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}`

**Verification**:
```bash
# Get products linked to course
GET /api/v1/payments/{org_id}/courses/{course_id}/products

# Get courses linked to product
GET /api/v1/payments/{org_id}/products/{product_id}/courses
```

---

### Step 7: Set Up Paystack Webhook (Important!)

**Purpose**: Configure webhook so Paystack can notify your app when payments complete

**Steps**:
1. Go to [Paystack Dashboard](https://dashboard.paystack.com) → Settings → API Keys & Webhooks
2. Click "Add Webhook URL"
3. Enter webhook URL: `https://yourdomain.com/api/v1/payments/paystack/webhook`
   - For local testing, use ngrok: `https://your-ngrok-url.ngrok-free.app/api/v1/payments/paystack/webhook`
4. Select events:
   - ✅ `charge.success`
   - ✅ `charge.failed`
   - ✅ `subscription.create`
   - ✅ `subscription.disable`
5. Copy the webhook secret
6. Add to `.env`: `LEARNHOUSE_PAYSTACK_WEBHOOK_SECRET=your_webhook_secret`

**For Local Testing with ngrok**:
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 8009

# Use the HTTPS URL provided by ngrok
```

**Data Needed**:
- Public URL (or ngrok URL for testing)
- Webhook secret from Paystack

---

### Step 8: Get Supported Currencies (Optional)

**Purpose**: Get list of currencies users can select for payment

**Endpoint**: `GET /api/v1/payments/currencies`

**Request Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected Response**: `200 OK`
```json
{
  "NGN": {
    "code": "NGN",
    "name": "Nigerian Naira",
    "symbol": "₦",
    "subunit": "Kobo"
  },
  "USD": {
    "code": "USD",
    "name": "US Dollar",
    "symbol": "$",
    "subunit": "Cent"
  },
  "GHS": {
    "code": "GHS",
    "name": "Ghanaian Cedi",
    "symbol": "₵",
    "subunit": "Pesewa"
  },
  "ZAR": {
    "code": "ZAR",
    "name": "South African Rand",
    "symbol": "R",
    "subunit": "Cent"
  },
  "KES": {
    "code": "KES",
    "name": "Kenyan Shilling",
    "symbol": "Ksh.",
    "subunit": "Cent"
  },
  "XOF": {
    "code": "XOF",
    "name": "West African CFA Franc",
    "symbol": "CFA",
    "subunit": "Centime"
  }
}
```

**Data Needed**:
- Access token

**Use Case**: Display currency options to users in frontend

---

### Step 9: Initialize Payment (Checkout)

**Purpose**: Create a payment session and get Paystack checkout URL

**Endpoint**: `POST /api/v1/payments/{org_id}/checkout/product/{product_id}`

**Request Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Query Parameters**:
- `redirect_uri`: URL to redirect after payment (required)
  - Example: `https://yoursite.com/payment/success` or `http://localhost:3000/courses/success`
- `currency`: Optional currency code (ISO 4217)
  - If not provided, uses product's default currency
  - Supported: `NGN`, `USD`, `GHS`, `ZAR`, `KES`, `XOF`

**Example Request**:
```
POST /api/v1/payments/1/checkout/product/1?redirect_uri=https://yoursite.com/success&currency=USD
```

**Expected Response**: `200 OK`
```json
{
  "checkout_url": "https://checkout.paystack.com/3ni8kdavz62431k",
  "reference": "re4lyvq3s3",
  "access_code": "3ni8kdavz62431k"
}
```

**What Happens**:
1. Creates/retrieves Paystack customer
2. Creates `PaymentsUser` record with status `PENDING`
3. Initializes Paystack transaction
4. Returns checkout URL

**Data Needed**:
- `org_id`: Your organization ID
- `product_id`: Product ID from Step 4
- `redirect_uri`: Success page URL
- `currency`: Optional currency selection
- Access token (user making the purchase)

**Save for Later**:
- `reference`: Transaction reference (for verification)
- `checkout_url`: URL to redirect user to

**Verification**:
- Check database: `PaymentsUser` table should have new record with status `PENDING`
- Check Paystack Dashboard: Transaction should appear as "Pending"

---

### Step 10: Complete Payment (User Action)

**Purpose**: User completes payment on Paystack checkout page

**Steps**:
1. Redirect user to `checkout_url` from Step 9
2. User enters payment details on Paystack checkout page
3. Use test card: `4084084084084081` (any future expiry, any CVV)
4. Complete payment
5. User is redirected to `redirect_uri`

**Test Cards**:
- **Success**: `4084084084084081`
- **Decline**: `4084084084084085`
- **Insufficient Funds**: `4084084084084093`

**What Happens**:
- Paystack processes payment
- Webhook is sent to your server (Step 11)
- User is redirected to `redirect_uri`

**Data Needed**:
- `checkout_url`: From Step 9
- Test card details

---

### Step 11: Webhook Confirms Payment (Automatic)

**Purpose**: Paystack sends webhook to confirm payment status

**Endpoint**: `POST /api/v1/payments/paystack/webhook`

**This is called automatically by Paystack** - you don't call this manually

**What Happens**:
1. Paystack sends webhook with payment details
2. System verifies webhook signature
3. Verifies transaction with Paystack API
4. Updates `PaymentsUser` status:
   - `charge.success` → Status becomes `COMPLETED`
   - `charge.failed` → Status becomes `FAILED`
   - `subscription.create` → Status becomes `ACTIVE`
   - `subscription.disable` → Status becomes `CANCELLED`

**Webhook Payload Example** (`charge.success`):
```json
{
  "event": "charge.success",
  "data": {
    "reference": "re4lyvq3s3",
    "status": "success",
    "amount": 500000,
    "currency": "NGN",
    "metadata": {
      "product_id": "1",
      "payment_user_id": "1",
      "user_id": "1",
      "org_id": "1"
    }
  }
}
```

**Verification**:
```bash
# Check payment user status
GET /api/v1/payments/{org_id}/customers

# Should show status as "completed" or "active"
```

**Manual Verification** (if webhook fails):
```bash
# Verify transaction directly
GET /api/v1/payments/{org_id}/transactions/{reference}
```
(Note: You may need to implement this endpoint or use Paystack API directly)

---

### Step 12: Verify Course Access

**Purpose**: Verify that user now has access to the paid course

**Endpoint**: `GET /api/v1/payments/{org_id}/courses/{course_id}/access`

**Request Headers**:
```
Authorization: Bearer USER_ACCESS_TOKEN
```

**Expected Response**: `200 OK`
```json
{
  "has_access": true
}
```

**Data Needed**:
- `org_id`: Your organization ID
- `course_id`: Course ID from Step 5
- Access token from the user who made the payment

**What This Checks**:
- ✅ User is course author → `has_access: true`
- ✅ Course is free (not linked to product) → `has_access: true`
- ✅ User has `ACTIVE` or `COMPLETED` payment → `has_access: true`
- ❌ User has no payment → `has_access: false`
- ❌ Anonymous user, course is paid → `has_access: false`

**Verification**:
- Try accessing course content
- Should be able to view activities, lessons, etc.

---

### Step 13: Get User's Owned Courses

**Purpose**: Get list of all courses the user has purchased access to

**Endpoint**: `GET /api/v1/payments/{org_id}/courses/owned`

**Request Headers**:
```
Authorization: Bearer USER_ACCESS_TOKEN
```

**Expected Response**: `200 OK`
```json
[
  {
    "id": 1,
    "course_uuid": "course_xxxxx",
    "name": "Python Programming Masterclass",
    "description": "Learn Python from scratch to advanced",
    ...
  }
]
```

**Data Needed**:
- `org_id`: Your organization ID
- Access token from the user

**Use Case**: Display "My Courses" or "Purchased Courses" page

---

### Step 14: Get Customers List (Admin View)

**Purpose**: View all customers who have made payments

**Endpoint**: `GET /api/v1/payments/{org_id}/customers`

**Request Headers**:
```
Authorization: Bearer ADMIN_ACCESS_TOKEN
```

**Expected Response**: `200 OK`
```json
[
  {
    "payment_user_id": 1,
    "user": {
      "id": 1,
      "email": "user@example.com",
      ...
    },
    "product": {
      "id": 1,
      "name": "Python Course Access",
      ...
    },
    "status": "completed",
    "creation_date": "2026-01-30T...",
    "update_date": "2026-01-30T..."
  }
]
```

**Data Needed**:
- `org_id`: Your organization ID
- Admin access token

**Use Case**: Admin dashboard to view all purchases

---

## Test Scenarios

### Scenario 1: Complete Payment Flow (One-Time Payment)

**Steps**:
1. ✅ Setup payments config (Steps 1-3)
2. ✅ Create product: One-time, NGN 5000 (Step 4)
3. ✅ Create course (Step 5)
4. ✅ Link course to product (Step 6)
5. ✅ Initialize payment (Step 9)
6. ✅ Complete payment with test card `4084084084084081` (Step 10)
7. ✅ Wait for webhook (Step 11) - or verify manually
8. ✅ Check course access (Step 12) - should return `has_access: true`
9. ✅ Get owned courses (Step 13) - should include the course

**Expected Results**:
- Payment status: `COMPLETED`
- Course access: `true`
- Course appears in owned courses list

---

### Scenario 2: Free Course (No Payment Required)

**Steps**:
1. ✅ Create course (Step 5)
2. ❌ **Skip** linking to product
3. ✅ Check course access (Step 12) - should return `has_access: true` even without payment

**Expected Results**:
- Course access: `true` (course is free)
- No payment required

---

### Scenario 3: Currency Selection

**Steps**:
1. ✅ Create product with currency `NGN` (Step 4)
2. ✅ Initialize payment with `currency=USD` parameter (Step 9)
3. ✅ Complete payment (Step 10)
4. ✅ Verify transaction uses USD currency

**Expected Results**:
- Transaction initialized with USD
- Payment processed in USD
- Metadata contains `selected_currency: "USD"`

---

### Scenario 4: Payment Failure

**Steps**:
1. ✅ Setup complete (Steps 1-6)
2. ✅ Initialize payment (Step 9)
3. ✅ Use declined card `4084084084084085` (Step 10)
4. ✅ Webhook receives `charge.failed` event (Step 11)

**Expected Results**:
- Payment status: `FAILED`
- Course access: `false`
- Course does NOT appear in owned courses

---

### Scenario 5: Subscription Payment

**Steps**:
1. ✅ Create subscription product (Step 4) - `product_type: "subscription"`
2. ✅ Create course and link (Steps 5-6)
3. ✅ Initialize payment (Step 9)
4. ✅ Complete payment (Step 10)
5. ✅ Webhook receives `subscription.create` (Step 11)

**Expected Results**:
- Payment status: `ACTIVE`
- Course access: `true`
- Subscription is active

---

### Scenario 6: Multiple Products for One Course

**Note**: This scenario is NOT supported. One course can only be linked to ONE product.

**Alternative**: Create multiple courses and link each to different products.

---

### Scenario 7: Unlink Course (Make Free)

**Steps**:
1. ✅ Course is linked to product (paid)
2. ✅ Unlink: `DELETE /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}`
3. ✅ Check course access (Step 12)

**Expected Results**:
- Course becomes free
- All users have access (no payment required)
- Existing payments remain valid

---

## Data Checklist

### Required Data for Complete Test Flow

**Organization**:
- [ ] `org_id`: Integer (e.g., `1`)
- [ ] `org_slug`: String (e.g., `"my-org"`)

**User Accounts**:
- [ ] Admin user access token
- [ ] Regular user access token (for making purchases)
- [ ] User email addresses

**Product Data**:
- [ ] Product name
- [ ] Product description
- [ ] Product type: `"one_time"` or `"subscription"`
- [ ] Price amount (float)
- [ ] Currency code: `NGN`, `USD`, `GHS`, `ZAR`, `KES`, or `XOF`
- [ ] Benefits list

**Course Data**:
- [ ] Course name
- [ ] Course description
- [ ] Course details

**Payment Data**:
- [ ] Redirect URI (success page URL)
- [ ] Optional currency selection
- [ ] Test card number

**Paystack Configuration**:
- [ ] Secret key (test)
- [ ] Public key (test)
- [ ] Webhook secret
- [ ] Webhook URL

---

## API Endpoints Summary

### Configuration
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
- `GET /api/v1/payments/{org_id}/customers` - Get customers list

### Utilities
- `GET /api/v1/payments/currencies` - Get supported currencies

### Webhooks
- `POST /api/v1/payments/paystack/webhook` - Paystack webhook (called by Paystack)

---

## Troubleshooting

### Issue: Payment Status Stays PENDING

**Possible Causes**:
1. Webhook not configured or not receiving events
2. Webhook secret mismatch
3. Webhook URL not accessible

**Solutions**:
1. Check Paystack Dashboard → Webhooks → Check event logs
2. Verify webhook secret in `.env` matches Paystack
3. Use ngrok for local testing
4. Manually verify transaction: Use Paystack API to check transaction status

### Issue: Course Access Returns False After Payment

**Check**:
1. Payment status in database: `GET /api/v1/payments/{org_id}/customers`
2. Course is linked to product: `GET /api/v1/payments/{org_id}/courses/{course_id}/products`
3. User ID matches: Check `PaymentsUser.user_id` matches current user
4. Payment status is `ACTIVE` or `COMPLETED`

### Issue: Webhook Not Working

**Check**:
1. Webhook URL is accessible (use ngrok for local)
2. Webhook secret is correct
3. Paystack Dashboard shows webhook delivery attempts
4. Check application logs for webhook errors

### Issue: Currency Not Supported Error

**Solution**:
- Use only supported currencies: `NGN`, `USD`, `GHS`, `ZAR`, `KES`, `XOF`
- Check currency is uppercase: `USD` not `usd`

### Issue: Course Already Linked Error

**Solution**:
- Unlink existing product first: `DELETE /api/v1/payments/{org_id}/products/{old_product_id}/courses/{course_id}`
- Then link to new product

---

## Quick Test Script

Here's a quick test flow you can follow:

```bash
# 1. Setup
POST /api/v1/payments/1/config?provider=paystack

# 2. Activate
PUT /api/v1/payments/1/config
{"enabled": true, "active": true, "provider": "paystack"}

# 3. Create Product
POST /api/v1/payments/1/products
{"name": "Test Course", "product_type": "one_time", "amount": 1000, "currency": "NGN", ...}

# 4. Create Course (use your course creation endpoint)
POST /api/v1/orgs/my-org/courses
{"name": "Test Course", ...}

# 5. Link Course
POST /api/v1/payments/1/products/1/courses/1

# 6. Initialize Payment
POST /api/v1/payments/1/checkout/product/1?redirect_uri=http://localhost:3000/success

# 7. Complete payment on Paystack checkout page

# 8. Verify Access
GET /api/v1/payments/1/courses/1/access
```

---

## Database Tables Reference

### PaymentsConfig
- Stores payment provider configuration per organization
- Fields: `org_id`, `provider`, `active`, `enabled`

### PaymentsProduct
- Stores payment products
- Fields: `name`, `amount`, `currency`, `product_type`, `provider_product_id`

### PaymentsCourse
- Links courses to products
- Fields: `course_id`, `payment_product_id`, `org_id`

### PaymentsUser
- Tracks user purchases
- Fields: `user_id`, `payment_product_id`, `status`, `provider_specific_data`
- Status values: `PENDING`, `COMPLETED`, `ACTIVE`, `CANCELLED`, `FAILED`

---

## Additional Notes

1. **Amount Format**: Always multiply by 100 for Paystack (subunits)
   - NGN 1000 = 100000 (kobo)
   - USD 10 = 1000 (cents)

2. **Metadata**: Transaction metadata includes:
   - `product_id`: Product being purchased
   - `payment_user_id`: PaymentUser record ID
   - `user_id`: User making payment
   - `org_id`: Organization ID
   - `selected_currency`: Currency used for payment
   - `product_currency`: Product's default currency

3. **Access Control**: Access is checked at:
   - Course level: `check_course_paid_access()`
   - Activity level: `check_activity_paid_access()`

4. **Status Flow**:
   - `PENDING` → Payment initialized
   - `COMPLETED` → One-time payment successful
   - `ACTIVE` → Subscription active
   - `FAILED` → Payment failed
   - `CANCELLED` → Subscription cancelled

---

## Support

For Paystack-specific issues:
- [Paystack Documentation](https://paystack.com/docs)
- [Paystack Support](https://paystack.com/contact)

For integration issues:
- Check application logs
- Verify API keys and webhook configuration
- Test with Paystack test mode first
