# Paystack Payment Integration - Complete Testing & Implementation Guide

This comprehensive guide provides step-by-step instructions to test and implement the Paystack payment system in LearnHouse. It includes detailed request/response examples, implementation guidance, and explains how the payment flow works.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [How Paystack Payment Flow Works](#how-paystack-payment-flow-works)
3. [Step-by-Step Testing Guide](#step-by-step-testing-guide)
4. [Frontend Implementation Guide](#frontend-implementation-guide)
5. [API Reference with Request/Response Examples](#api-reference-with-requestresponse-examples)
6. [Webhook Handling](#webhook-handling)
7. [Additional Test Scenarios](#additional-test-scenarios)
8. [Troubleshooting](#troubleshooting)

---

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
   - **Secret Key** (starts with `sk_test_`) - Used by backend
   - **Public Key** (starts with `pk_test_`) - Can be used by frontend (optional)
4. Set up webhooks (see [Webhook Handling](#webhook-handling) section)

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

## How Paystack Payment Flow Works

### Overview

The Paystack payment integration follows this flow:

1. **Setup Phase** (Admin/Organization Owner):
   - Enable payments feature for organization
   - Initialize payment configuration with Paystack provider
   - Create payment products
   - Link courses to products

2. **Customer Payment Flow**:
   - Customer selects a course/product
   - Frontend calls checkout endpoint → Gets `checkout_url`
   - Customer redirected to Paystack checkout page
   - Customer completes payment on Paystack
   - Paystack redirects back to `redirect_uri`
   - Paystack sends webhook to backend
   - Backend updates payment status
   - Customer gains access to course

### Detailed Flow Diagram

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ 1. POST /checkout/product/{id}
       │    (with redirect_uri, currency)
       ▼
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │ 2. Creates PaymentsUser (PENDING)
       │ 3. Creates/gets Paystack customer
       │ 4. Initializes Paystack transaction
       │ 5. Returns checkout_url + reference
       ▼
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ 6. Redirects user to checkout_url
       ▼
┌─────────────┐
│   Paystack  │
└──────┬──────┘
       │ 7. Customer completes payment
       │ 8. Redirects to redirect_uri
       │ 9. Sends webhook to backend
       ▼
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │ 10. Verifies webhook signature
       │ 11. Verifies transaction with Paystack
       │ 12. Updates PaymentsUser status (COMPLETED/ACTIVE)
       │ 13. Customer now has access
       ▼
┌─────────────┐
│   Frontend  │
└─────────────┘
       │ 14. Check access endpoint confirms access
```

### Key Concepts

**Payment Statuses:**
- `PENDING` - Payment initialized, awaiting completion
- `COMPLETED` - One-time payment successful
- `ACTIVE` - Subscription active
- `FAILED` - Payment failed
- `CANCELLED` - Subscription cancelled
- `REFUNDED` - Payment refunded

**Metadata Structure:**
All Paystack transactions include metadata (as JSON string) with:
```json
{
  "product_id": "1",
  "payment_user_id": "1",
  "user_id": "1",
  "org_id": "1",
  "selected_currency": "NGN",
  "product_currency": "NGN",
  "product_amount": "5000.00"
}
```

**Currency Handling:**
- Amounts are stored in base currency (e.g., `5000.00` = ₦5000)
- Paystack requires amounts in subunits (multiply by 100)
- Supported currencies: NGN, USD, GHS, ZAR, KES, XOF
- Customer can select currency during checkout (optional)

---

## Step-by-Step Testing Guide

### Step 1: Login to Get Access Token

**Endpoint:** `POST /api/v1/auth/login`

**Request (Form Data):**
```
username: admin@school.dev
password: change_this_password
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "admin@school.dev",
    "username": "admin",
    ...
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save:** `access_token` for all subsequent API calls

**Headers for all requests:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8009/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@school.dev&password=change_this_password"
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
  "org_uuid": "org_abc123def456",
  "name": "Test School",
  "slug": "test-school",
  "description": "A test organization for payment testing",
  "email": "contact@testschool.com",
  "about": "Test organization",
  "creation_date": "2026-01-31T10:00:00Z",
  "update_date": "2026-01-31T10:00:00Z"
}
```

**Save:** 
- `org_id` (e.g., `1`)
- `org_slug` (e.g., `test-school`)

**Note:** Payments feature is enabled by default when creating an organization. No additional step is needed to enable it.

**cURL Example:**
```bash
curl -X POST "http://localhost:8009/api/v1/orgs/" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test School",
    "slug": "test-school",
    "description": "A test organization for payment testing",
    "email": "contact@testschool.com",
    "about": "Test organization"
  }'
```

---

### Step 3: Initialize Payment Configuration

**Endpoint:** `POST /api/v1/payments/{org_id}/config?provider=paystack`

**Example:** `POST /api/v1/payments/1/config?provider=paystack`

**Request:** Empty body (no request body needed)

**Response:**
```json
{
  "id": 1,
  "org_id": 1,
  "enabled": true,
  "active": true,
  "provider": "paystack",
  "provider_specific_id": null,
  "provider_config": {
    "onboarding_completed": true
  },
  "creation_date": "2026-01-31T10:05:00Z",
  "update_date": "2026-01-31T10:05:00Z"
}
```

**Response Fields Explained:**
- `id`: Internal payments config ID
- `enabled`: Whether payments feature is enabled
- `active`: Whether payment processing is active (automatically `true` for Paystack)
- `provider`: Payment provider (`"paystack"`)
- `provider_specific_id`: Paystack-specific ID (null for Paystack, no OAuth needed)
- `provider_config`: Additional provider configuration

**Note:** Paystack doesn't require OAuth connection. The config is active immediately after initialization (`active: true`).

**cURL Example:**
```bash
curl -X POST "http://localhost:8009/api/v1/payments/1/config?provider=paystack" \
  -H "Authorization: Bearer {access_token}"
```

#### 3a. Verify Configuration

**Endpoint:** `GET /api/v1/payments/{org_id}/config`

**Example:** `GET /api/v1/payments/1/config`

**Response:**
```json
[
  {
    "id": 1,
    "org_id": 1,
    "enabled": true,
    "active": true,
    "provider": "paystack",
    "provider_specific_id": null,
    "provider_config": {
      "onboarding_completed": true
    },
    "creation_date": "2026-01-31T10:05:00Z",
    "update_date": "2026-01-31T10:05:00Z"
  }
]
```

**Note:** Returns an array (for compatibility, though typically one config per org)

**cURL Example:**
```bash
curl -X GET "http://localhost:8009/api/v1/payments/1/config" \
  -H "Authorization: Bearer {access_token}"
```

#### 3b. Update Configuration (Optional)

**Endpoint:** `PUT /api/v1/payments/{org_id}/config`

**Request:**
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

**Response:** Same structure as GET response

**cURL Example:**
```bash
curl -X PUT "http://localhost:8009/api/v1/payments/1/config" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "active": true,
    "provider": "paystack",
    "provider_config": {"onboarding_completed": true}
  }'
```

---

### Step 4: Create a Course

**Endpoint:** `POST /api/v1/orgs/{org_slug}/courses`

**Example:** `POST /api/v1/orgs/test-school/courses`

**Request (Form Data or JSON):**
```json
{
  "name": "Advanced Python Programming",
  "description": "Learn advanced Python concepts and best practices",
  "public": true,
  "about": "A comprehensive course on Python programming",
  "learnings": "Python, Programming, Advanced Concepts",
  "tags": "python,programming,advanced"
}
```

**Response:**
```json
{
  "id": 1,
  "course_uuid": "course_xyz789abc123",
  "name": "Advanced Python Programming",
  "description": "Learn advanced Python concepts and best practices",
  "org_id": 1,
  "public": true,
  "about": "A comprehensive course on Python programming",
  "learnings": "Python, Programming, Advanced Concepts",
  "tags": ["python", "programming", "advanced"],
  "creation_date": "2026-01-31T10:10:00Z",
  "update_date": "2026-01-31T10:10:00Z"
}
```

**Save:** 
- `course_id` (e.g., `1`)
- `course_uuid` (e.g., `course_xyz789abc123`)

**cURL Example:**
```bash
curl -X POST "http://localhost:8009/api/v1/orgs/test-school/courses" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Advanced Python Programming",
    "description": "Learn advanced Python concepts",
    "public": true,
    "about": "A comprehensive course on Python",
    "learnings": "Python, Programming",
    "tags": "python,programming"
  }'
```

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

**Request Fields Explained:**
- `name`: Product name (required)
- `description`: Product description (optional)
- `product_type`: `"one_time"` or `"subscription"` (required)
- `price_type`: `"fixed_price"` or `"customer_choice"` (required)
- `benefits`: What customer gets (optional)
- `amount`: Price in base currency unit (required, e.g., `5000.00` = ₦5000)
- `currency`: Currency code (required, see supported currencies below)

**Supported Currencies:**
- `NGN` - Nigerian Naira
- `USD` - US Dollar
- `GHS` - Ghanaian Cedi
- `ZAR` - South African Rand
- `KES` - Kenyan Shilling
- `XOF` - West African CFA Franc

**Product Types:**
- `"one_time"` - One-time payment (customer pays once)
- `"subscription"` - Recurring monthly subscription

**Price Types:**
- `"fixed_price"` - Fixed price (customer pays exact amount)
- `"customer_choice"` - Customer can choose amount (minimum set by `amount`)

**Response:**
```json
{
  "id": 1,
  "org_id": 1,
  "payments_config_id": 1,
  "name": "Python Course Access",
  "description": "Full access to Advanced Python Programming course",
  "product_type": "one_time",
  "price_type": "fixed_price",
  "benefits": "Lifetime access, Certificate, Support",
  "amount": 5000.00,
  "currency": "NGN",
  "provider_product_id": null,
  "creation_date": "2026-01-31T10:15:00Z",
  "update_date": "2026-01-31T10:15:00Z"
}
```

**Response Fields Explained:**
- `id`: Product ID (save this for linking to course)
- `payments_config_id`: Reference to payments config
- `provider_product_id`: Paystack plan code (for subscriptions) or null (for one-time payments)

**Note:** For one-time payments, `provider_product_id` may be `null` as Paystack doesn't require product creation for one-time payments. For subscriptions, this will contain the Paystack plan code (e.g., `PLN_xxxxx`).

**cURL Example:**
```bash
curl -X POST "http://localhost:8009/api/v1/payments/1/products" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Python Course Access",
    "description": "Full access to Advanced Python Programming course",
    "product_type": "one_time",
    "price_type": "fixed_price",
    "benefits": "Lifetime access, Certificate, Support",
    "amount": 5000.00,
    "currency": "NGN"
  }'
```

---

### Step 6: Link Course to Product

**Endpoint:** `POST /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}`

**Example:** `POST /api/v1/payments/1/products/1/courses/1`

**Request:** Empty body (no request body needed)

**Response:**
```json
{
  "message": "Course linked to product successfully"
}
```

**Important:** Each course can only be linked to one product at a time. If you need to link a course to a different product, unlink it first.

**cURL Example:**
```bash
curl -X POST "http://localhost:8009/api/v1/payments/1/products/1/courses/1" \
  -H "Authorization: Bearer {access_token}"
```

#### 6a. Verify Link - Get Courses by Product

**Endpoint:** `GET /api/v1/payments/{org_id}/products/{product_id}/courses`

**Response:**
```json
[
  {
    "id": 1,
    "course_uuid": "course_xyz789abc123",
    "name": "Advanced Python Programming",
    "org_id": 1,
    ...
  }
]
```

#### 6b. Verify Link - Get Products by Course

**Endpoint:** `GET /api/v1/payments/{org_id}/courses/{course_id}/products`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Python Course Access",
    "product_type": "one_time",
    "amount": 5000.00,
    "currency": "NGN",
    ...
  }
]
```

---

### Step 7: Initialize Payment Transaction (Customer Flow)

This is the key endpoint for frontend implementation. This endpoint creates a payment transaction and returns a Paystack checkout URL.

**Endpoint:** `POST /api/v1/payments/{org_id}/checkout/product/{product_id}`

**Query Parameters:**
- `redirect_uri` (required): URL to redirect after payment completion
  - Example: `http://localhost:3000/courses/success`
  - Example: `https://yourdomain.com/payment/success`
- `currency` (optional): Currency code (NGN, USD, GHS, ZAR, KES, XOF)
  - If not provided, uses product's default currency
  - Allows customer to pay in different currency than product default

**Example:** `POST /api/v1/payments/1/checkout/product/1?redirect_uri=http://localhost:3000/courses/success&currency=USD`

**Request:** Empty body (no request body needed)

**Response:**
```json
{
  "checkout_url": "https://checkout.paystack.com/xxxxx",
  "reference": "1lg10sbiy4",
  "access_code": "xxxxx"
}
```

**Response Fields Explained:**
- `checkout_url`: Paystack checkout page URL - redirect customer here
- `reference`: Transaction reference - use this to verify payment status
- `access_code`: Paystack access code (internal use)

**What Happens Behind the Scenes:**
1. Backend creates a `PaymentsUser` record with status `PENDING`
2. Backend creates or retrieves Paystack customer
3. Backend initializes Paystack transaction with:
   - Customer email
   - Amount (converted to subunits: `5000.00` → `500000` kobo)
   - Currency
   - Metadata (product_id, payment_user_id, user_id, org_id, etc.)
   - Callback URL (redirect_uri)
4. Paystack returns authorization URL
5. Backend stores transaction reference in `provider_specific_data`

**cURL Example:**
```bash
curl -X POST "http://localhost:8009/api/v1/payments/1/checkout/product/1?redirect_uri=http://localhost:3000/courses/success&currency=NGN" \
  -H "Authorization: Bearer {access_token}"
```

**Frontend Implementation:**
```javascript
// Example: React/Next.js
async function initializePayment(productId, orgId, redirectUri, currency = null) {
  const params = new URLSearchParams({
    redirect_uri: redirectUri,
  });
  if (currency) {
    params.append('currency', currency);
  }
  
  const response = await fetch(
    `/api/v1/payments/${orgId}/checkout/product/${productId}?${params}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to initialize payment');
  }
  
  const data = await response.json();
  
  // Redirect user to Paystack checkout
  window.location.href = data.checkout_url;
  
  // Optionally save reference for later verification
  localStorage.setItem('payment_reference', data.reference);
}
```

---

### Step 8: Complete Payment (Test Mode)

1. **Open the `checkout_url`** in your browser (or redirect customer there)
2. **Use Paystack test card numbers:**
   - **Success:** `4084084084084081`
   - **Decline:** `4084084084084085`
   - **Insufficient Funds:** `4084084084084093`
3. **Use any future expiry date** (e.g., `12/25`)
4. **Use any 3-digit CVV** (e.g., `123`)
5. **Complete the payment**

**After Payment:**
- Paystack redirects to `redirect_uri` with query parameters
- Paystack sends webhook to backend (if configured)
- Backend updates payment status to `COMPLETED` or `ACTIVE`

**Redirect URL Format:**
```
{redirect_uri}?reference={transaction_reference}&trxref={transaction_reference}
```

**Frontend: Handle Redirect**
```javascript
// Example: Handle redirect after payment
// URL: http://localhost:3000/courses/success?reference=1lg10sbiy4&trxref=1lg10sbiy4

function handlePaymentCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference');
  
  if (reference) {
    // Verify payment status
    verifyPaymentStatus(reference);
  }
}

async function verifyPaymentStatus(reference, orgId) {
  const response = await fetch(
    `/api/v1/payments/${orgId}/transactions/${reference}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  
  const data = await response.json();
  
  if (data.paystack_status === 'success') {
    // Payment successful
    // Refresh course access
    checkCourseAccess();
  } else {
    // Payment failed or pending
    showError('Payment not completed');
  }
}
```

---

### Step 9: Verify Payment Status

#### 9a. Verify Transaction (Manual Verification)

**Endpoint:** `GET /api/v1/payments/{org_id}/transactions/{reference}`

**Example:** `GET /api/v1/payments/1/transactions/1lg10sbiy4`

**Response (Success):**
```json
{
  "reference": "1lg10sbiy4",
  "paystack_status": "success",
  "transaction_data": {
    "amount": 500000,
    "currency": "NGN",
    "gateway_response": "Successful",
    "paid_at": "2026-01-31T10:30:00Z",
    "created_at": "2026-01-31T10:25:00Z"
  },
  "payment_user_id": "1",
  "payment_status_updated": true,
  "previous_status": "pending",
  "new_status": "completed"
}
```

**Response (Pending):**
```json
{
  "reference": "1lg10sbiy4",
  "paystack_status": "pending",
  "transaction_data": {
    "amount": 500000,
    "currency": "NGN",
    "gateway_response": "Pending",
    "paid_at": null,
    "created_at": "2026-01-31T10:25:00Z"
  },
  "payment_user_id": "1",
  "payment_status_updated": false
}
```

**Response Fields Explained:**
- `reference`: Transaction reference
- `paystack_status`: Status from Paystack (`"success"`, `"pending"`, `"failed"`)
- `transaction_data`: Transaction details from Paystack
  - `amount`: Amount in subunits (divide by 100 for display)
  - `currency`: Currency code
  - `gateway_response`: Payment gateway response message
  - `paid_at`: When payment was completed (null if pending)
  - `created_at`: When transaction was created
- `payment_user_id`: Internal payment user ID
- `payment_status_updated`: Whether payment status was updated in database
- `previous_status`: Previous payment status (if updated)
- `new_status`: New payment status (if updated)

**cURL Example:**
```bash
curl -X GET "http://localhost:8009/api/v1/payments/1/transactions/1lg10sbiy4" \
  -H "Authorization: Bearer {access_token}"
```

#### 9b. Check Course Access

**Endpoint:** `GET /api/v1/payments/{org_id}/courses/{course_id}/access`

**Example:** `GET /api/v1/payments/1/courses/1/access`

**Response (Has Access):**
```json
{
  "has_access": true,
  "diagnostics": {
    "course_id": 1,
    "course_linked_to_product": true,
    "product_id": 1,
    "user_has_payment": true,
    "payment_status": "completed",
    "payment_user_id": 1
  }
}
```

**Response (No Access):**
```json
{
  "has_access": false,
  "diagnostics": {
    "course_id": 1,
    "course_linked_to_product": true,
    "product_id": 1,
    "user_has_payment": false,
    "payment_status": null,
    "payment_user_id": null
  }
}
```

**Response Fields Explained:**
- `has_access`: Boolean indicating if user has paid access
- `diagnostics`: Detailed information about access check
  - `course_linked_to_product`: Whether course is linked to a product
  - `product_id`: Product ID if linked
  - `user_has_payment`: Whether user has a payment record
  - `payment_status`: Payment status (`"completed"`, `"active"`, `"pending"`, etc.)
  - `payment_user_id`: Payment user ID if exists

**Note:** Access is granted if:
- User is course author, OR
- Payments feature is disabled for organization, OR
- Course is not linked to a product, OR
- User has payment with status `COMPLETED` or `ACTIVE`

**cURL Example:**
```bash
curl -X GET "http://localhost:8009/api/v1/payments/1/courses/1/access" \
  -H "Authorization: Bearer {access_token}"
```

#### 9c. Get Owned Courses

**Endpoint:** `GET /api/v1/payments/{org_id}/courses/owned`

**Example:** `GET /api/v1/payments/1/courses/owned`

**Response:**
```json
[
  {
    "id": 1,
    "course_uuid": "course_xyz789abc123",
    "name": "Advanced Python Programming",
    "description": "Learn advanced Python concepts",
    "org_id": 1,
    "public": true,
    "creation_date": "2026-01-31T10:10:00Z",
    ...
  }
]
```

**Returns:** List of courses the current user has paid access to

**cURL Example:**
```bash
curl -X GET "http://localhost:8009/api/v1/payments/1/courses/owned" \
  -H "Authorization: Bearer {access_token}"
```

#### 9d. Get Customers List (Admin)

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
        "created_at": "2026-01-31T10:25:00Z"
      }
    ]
  }
]
```

**Returns:** List of customers who have made payments

**cURL Example:**
```bash
curl -X GET "http://localhost:8009/api/v1/payments/1/customers" \
  -H "Authorization: Bearer {access_token}"
```

#### 9e. Get Supported Currencies

**Endpoint:** `GET /api/v1/payments/currencies`

**Response:**
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

**Use Case:** Display currency selector in frontend

**cURL Example:**
```bash
curl -X GET "http://localhost:8009/api/v1/payments/currencies" \
  -H "Authorization: Bearer {access_token}"
```

---

## Frontend Implementation Guide

### Complete Payment Flow Implementation

Here's a complete example of implementing the payment flow in a frontend application:

```javascript
// paymentService.js

class PaymentService {
  constructor(apiBaseUrl, accessToken) {
    this.apiBaseUrl = apiBaseUrl;
    this.accessToken = accessToken;
  }

  /**
   * Initialize payment checkout
   * @param {number} orgId - Organization ID
   * @param {number} productId - Product ID
   * @param {string} redirectUri - URL to redirect after payment
   * @param {string} currency - Optional currency code
   * @returns {Promise<{checkout_url: string, reference: string}>}
   */
  async initializeCheckout(orgId, productId, redirectUri, currency = null) {
    const params = new URLSearchParams({
      redirect_uri: redirectUri,
    });
    
    if (currency) {
      params.append('currency', currency);
    }

    const response = await fetch(
      `${this.apiBaseUrl}/payments/${orgId}/checkout/product/${productId}?${params}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to initialize payment');
    }

    return await response.json();
  }

  /**
   * Verify transaction status
   * @param {number} orgId - Organization ID
   * @param {string} reference - Transaction reference
   * @returns {Promise<object>}
   */
  async verifyTransaction(orgId, reference) {
    const response = await fetch(
      `${this.apiBaseUrl}/payments/${orgId}/transactions/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to verify transaction');
    }

    return await response.json();
  }

  /**
   * Check course access
   * @param {number} orgId - Organization ID
   * @param {number} courseId - Course ID
   * @returns {Promise<{has_access: boolean, diagnostics: object}>}
   */
  async checkCourseAccess(orgId, courseId) {
    const response = await fetch(
      `${this.apiBaseUrl}/payments/${orgId}/courses/${courseId}/access`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to check course access');
    }

    return await response.json();
  }

  /**
   * Get owned courses
   * @param {number} orgId - Organization ID
   * @returns {Promise<Array>}
   */
  async getOwnedCourses(orgId) {
    const response = await fetch(
      `${this.apiBaseUrl}/payments/${orgId}/courses/owned`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get owned courses');
    }

    return await response.json();
  }

  /**
   * Get supported currencies
   * @returns {Promise<object>}
   */
  async getSupportedCurrencies() {
    const response = await fetch(
      `${this.apiBaseUrl}/payments/currencies`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get currencies');
    }

    return await response.json();
  }
}

// Usage example (React component)
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

function CourseCheckout({ courseId, productId, orgId }) {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currencies, setCurrencies] = useState({});
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');

  const paymentService = new PaymentService(
    'http://localhost:8009/api/v1',
    localStorage.getItem('access_token')
  );

  useEffect(() => {
    // Check if returning from Paystack
    const reference = searchParams.get('reference');
    if (reference) {
      handlePaymentCallback(reference);
    }

    // Load currencies
    loadCurrencies();
  }, [searchParams]);

  async function loadCurrencies() {
    try {
      const data = await paymentService.getSupportedCurrencies();
      setCurrencies(data);
    } catch (err) {
      console.error('Failed to load currencies:', err);
    }
  }

  async function handlePaymentCallback(reference) {
    try {
      setLoading(true);
      const result = await paymentService.verifyTransaction(orgId, reference);
      
      if (result.paystack_status === 'success') {
        // Payment successful
        // Check course access
        const access = await paymentService.checkCourseAccess(orgId, courseId);
        if (access.has_access) {
          // Redirect to course or show success message
          window.location.href = `/courses/${courseId}`;
        }
      } else {
        setError('Payment not completed. Please try again.');
      }
    } catch (err) {
      setError('Failed to verify payment. Please contact support.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    try {
      setLoading(true);
      setError(null);

      const redirectUri = `${window.location.origin}/courses/${courseId}/payment-success`;
      const result = await paymentService.initializeCheckout(
        orgId,
        productId,
        redirectUri,
        selectedCurrency
      );

      // Redirect to Paystack checkout
      window.location.href = result.checkout_url;
    } catch (err) {
      setError(err.message || 'Failed to initialize payment');
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Complete Payment</h2>
      
      {error && <div className="error">{error}</div>}
      
      <div>
        <label>Currency:</label>
        <select 
          value={selectedCurrency} 
          onChange={(e) => setSelectedCurrency(e.target.value)}
        >
          {Object.values(currencies).map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.symbol} {currency.name} ({currency.code})
            </option>
          ))}
        </select>
      </div>

      <button onClick={handleCheckout} disabled={loading}>
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </button>
    </div>
  );
}
```

### Key Frontend Considerations

1. **Store Transaction Reference**: Save the `reference` from checkout response (e.g., in localStorage) for verification
2. **Handle Redirect**: After payment, Paystack redirects to `redirect_uri` with `reference` query parameter
3. **Verify Payment**: Always verify payment status after redirect (don't rely solely on redirect)
4. **Poll for Status**: If webhook is delayed, poll the verify endpoint
5. **Error Handling**: Handle network errors, payment failures, and pending states
6. **Currency Selection**: Allow users to select currency (optional) before checkout
7. **Loading States**: Show loading indicators during payment flow

---

## Webhook Handling

### Webhook Setup

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
6. Update `LEARNHOUSE_PAYSTACK_WEBHOOK_SECRET` in your `.env` file

### Local Testing with ngrok

For local testing, use ngrok to expose your local server:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 8009

# Use the HTTPS URL provided by ngrok in Paystack webhook settings
# Example: https://abc123.ngrok-free.app/api/v1/payments/paystack/webhook
```

**Important:** Update `LEARNHOUSE_PAYSTACK_WEBHOOK_SECRET` in your `.env` file with the webhook secret from Paystack dashboard.

### Webhook Events

#### charge.success

**Triggered:** When payment is completed successfully

**Webhook Payload:**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "1lg10sbiy4",
    "amount": 500000,
    "currency": "NGN",
    "status": "success",
    "gateway_response": "Successful",
    "paid_at": "2026-01-31T10:30:00Z",
    "created_at": "2026-01-31T10:25:00Z",
    "metadata": {
      "product_id": "1",
      "payment_user_id": "1",
      "user_id": "1",
      "org_id": "1",
      "selected_currency": "NGN",
      "product_currency": "NGN",
      "product_amount": "5000.00"
    }
  }
}
```

**Backend Action:**
- Verifies webhook signature
- Verifies transaction with Paystack API
- Updates `PaymentsUser` status to `COMPLETED` (one-time) or `ACTIVE` (subscription)

#### charge.failed

**Triggered:** When payment fails

**Backend Action:**
- Updates `PaymentsUser` status to `FAILED`

#### subscription.create

**Triggered:** When subscription is created

**Backend Action:**
- Updates `PaymentsUser` status to `ACTIVE`

#### subscription.disable

**Triggered:** When subscription is cancelled

**Backend Action:**
- Updates `PaymentsUser` status to `CANCELLED`

### Webhook Security

The webhook endpoint verifies the signature using HMAC SHA512:

1. Paystack sends webhook with `x-paystack-signature` header
2. Backend computes HMAC SHA512 hash of payload using webhook secret
3. Compares computed hash with signature header
4. If match, processes webhook; otherwise, rejects with 400 error

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
6. Check webhook receives `subscription.create` event

**Expected Response (Checkout):**
```json
{
  "checkout_url": "https://checkout.paystack.com/xxxxx",
  "reference": "1lg10sbiy4",
  "access_code": "xxxxx"
}
```

**Expected Status:** `ACTIVE` (subscription)

### Test Scenario 2: Customer Choice Pricing

**Create Customer Choice Product:**
```json
{
  "name": "Pay What You Want",
  "description": "Support our course",
  "product_type": "one_time",
  "price_type": "customer_choice",
  "benefits": "Course access, Community support",
  "amount": 1000.00,
  "currency": "NGN"
}
```

**Test Flow:**
1. Create product
2. Link to course
3. Initialize payment transaction
4. On Paystack checkout, customer can enter custom amount (minimum: ₦1000)

**Note:** Paystack checkout page will allow customer to modify amount if `price_type` is `customer_choice`.

### Test Scenario 3: Multiple Products for One Course

**Test Flow:**
1. Create Course A
2. Create Product 1 (One-time, $99)
3. Create Product 2 (Subscription, $29/month)
4. Link Product 1 to Course A
5. Link Product 2 to Course A (unlinks Product 1 automatically)
6. Verify: `GET /api/v1/payments/{org_id}/courses/{course_id}/products` returns Product 2

**Note:** Each course can only be linked to one product at a time. Linking a new product automatically unlinks the previous one.

### Test Scenario 4: Payment Failure

**Test Flow:**
1. Initialize payment transaction
2. Use declined card: `4084084084084085`
3. Complete payment attempt
4. Verify payment status becomes `FAILED` (via webhook or manual verification)
5. Verify course access is `false`

**Expected Response (Verify Transaction):**
```json
{
  "reference": "1lg10sbiy4",
  "paystack_status": "failed",
  "transaction_data": {
    "gateway_response": "Declined",
    ...
  },
  "payment_user_id": "1",
  "payment_status_updated": false
}
```

### Test Scenario 5: Currency Selection

**Test Flow:**
1. Create product with currency `NGN` (amount: 5000.00)
2. Initialize payment with `currency=USD` parameter
3. Verify transaction uses USD amount (Paystack handles conversion)
4. Complete payment
5. Check metadata contains `selected_currency: "USD"` and `product_currency: "NGN"`

**Example Request:**
```bash
POST /api/v1/payments/1/checkout/product/1?redirect_uri=http://localhost:3000/success&currency=USD
```

**Note:** Paystack handles currency conversion. The amount charged will be equivalent to the product amount in the selected currency.

### Test Scenario 6: Payment Verification After Redirect

**Test Flow:**
1. Initialize payment
2. Complete payment on Paystack
3. Get redirected to `redirect_uri` with `reference` parameter
4. Call verify transaction endpoint
5. Verify payment status updated to `COMPLETED`
6. Check course access

**Frontend Implementation:**
```javascript
// In your redirect handler page
const urlParams = new URLSearchParams(window.location.search);
const reference = urlParams.get('reference');

if (reference) {
  // Verify payment
  const result = await paymentService.verifyTransaction(orgId, reference);
  
  if (result.paystack_status === 'success' && result.payment_status_updated) {
    // Payment verified and status updated
    // Now check course access
    const access = await paymentService.checkCourseAccess(orgId, courseId);
    if (access.has_access) {
      // Redirect to course
      window.location.href = `/courses/${courseId}`;
    }
  }
}
```

---

## API Reference with Request/Response Examples

### Payment Configuration Endpoints

#### POST /api/v1/payments/{org_id}/config

**Initialize payment configuration**

**Query Parameters:**
- `provider` (required): `"paystack"`

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
  "provider_config": {
    "onboarding_completed": true
  },
  "creation_date": "2026-01-31T10:05:00Z",
  "update_date": "2026-01-31T10:05:00Z"
}
```

#### GET /api/v1/payments/{org_id}/config

**Get payment configuration**

**Response:** Array of config objects (same structure as POST)

#### PUT /api/v1/payments/{org_id}/config

**Update payment configuration**

**Request:**
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

**Response:** Same structure as GET

#### DELETE /api/v1/payments/{org_id}/config

**Delete payment configuration**

**Response:**
```json
{
  "message": "Payments config deleted successfully"
}
```

### Product Management Endpoints

#### POST /api/v1/payments/{org_id}/products

**Create payment product**

**Request:**
```json
{
  "name": "Python Course Access",
  "description": "Full access to Python course",
  "product_type": "one_time",
  "price_type": "fixed_price",
  "benefits": "Lifetime access, Certificate",
  "amount": 5000.00,
  "currency": "NGN"
}
```

**Response:**
```json
{
  "id": 1,
  "org_id": 1,
  "payments_config_id": 1,
  "name": "Python Course Access",
  "description": "Full access to Python course",
  "product_type": "one_time",
  "price_type": "fixed_price",
  "benefits": "Lifetime access, Certificate",
  "amount": 5000.00,
  "currency": "NGN",
  "provider_product_id": null,
  "creation_date": "2026-01-31T10:15:00Z",
  "update_date": "2026-01-31T10:15:00Z"
}
```

#### GET /api/v1/payments/{org_id}/products

**List all products**

**Response:** Array of product objects

#### GET /api/v1/payments/{org_id}/products/{product_id}

**Get specific product**

**Response:** Single product object

#### PUT /api/v1/payments/{org_id}/products/{product_id}

**Update product**

**Request:** Same structure as POST

**Response:** Updated product object

#### DELETE /api/v1/payments/{org_id}/products/{product_id}

**Delete product**

**Response:**
```json
{
  "message": "Product deleted successfully"
}
```

**Note:** Products with active/completed payments cannot be deleted.

### Course-Product Linking Endpoints

#### POST /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}

**Link course to product**

**Request:** Empty body

**Response:**
```json
{
  "message": "Course linked to product successfully"
}
```

#### DELETE /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}

**Unlink course from product**

**Response:**
```json
{
  "message": "Course unlinked from product successfully"
}
```

#### GET /api/v1/payments/{org_id}/products/{product_id}/courses

**Get courses linked to product**

**Response:** Array of course objects

#### GET /api/v1/payments/{org_id}/courses/{course_id}/products

**Get products linked to course**

**Response:** Array of product objects

### Checkout & Access Endpoints

#### POST /api/v1/payments/{org_id}/checkout/product/{product_id}

**Initialize payment transaction**

**Query Parameters:**
- `redirect_uri` (required): URL to redirect after payment
- `currency` (optional): Currency code

**Request:** Empty body

**Response:**
```json
{
  "checkout_url": "https://checkout.paystack.com/xxxxx",
  "reference": "1lg10sbiy4",
  "access_code": "xxxxx"
}
```

#### GET /api/v1/payments/{org_id}/transactions/{reference}

**Verify transaction status**

**Response:**
```json
{
  "reference": "1lg10sbiy4",
  "paystack_status": "success",
  "transaction_data": {
    "amount": 500000,
    "currency": "NGN",
    "gateway_response": "Successful",
    "paid_at": "2026-01-31T10:30:00Z",
    "created_at": "2026-01-31T10:25:00Z"
  },
  "payment_user_id": "1",
  "payment_status_updated": true,
  "previous_status": "pending",
  "new_status": "completed"
}
```

#### GET /api/v1/payments/{org_id}/courses/{course_id}/access

**Check course access**

**Response:**
```json
{
  "has_access": true,
  "diagnostics": {
    "course_id": 1,
    "course_linked_to_product": true,
    "product_id": 1,
    "user_has_payment": true,
    "payment_status": "completed",
    "payment_user_id": 1
  }
}
```

#### GET /api/v1/payments/{org_id}/courses/owned

**Get owned courses**

**Response:** Array of course objects

#### GET /api/v1/payments/{org_id}/customers

**Get customers list (admin)**

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
        "created_at": "2026-01-31T10:25:00Z"
      }
    ]
  }
]
```

#### GET /api/v1/payments/currencies

**Get supported currencies**

**Response:**
```json
{
  "NGN": {
    "code": "NGN",
    "name": "Nigerian Naira",
    "symbol": "₦",
    "subunit": "Kobo"
  },
  ...
}
```

### Webhook Endpoints

#### POST /api/v1/payments/paystack/webhook

**Handle Paystack webhooks**

**Headers:**
- `x-paystack-signature`: Webhook signature (required)

**Request:** Paystack webhook payload

**Response:**
```json
{
  "status": "success",
  "message": "Payment processed successfully"
}
```

---

## Troubleshooting

### Issue: "Paystack secret key not configured"

**Error:**
```json
{
  "detail": "Paystack secret key not configured"
}
```

**Solution:** 
1. Add `LEARNHOUSE_PAYSTACK_SECRET_KEY` to `.env` file
2. Restart the API server
3. Verify key starts with `sk_test_` (test mode) or `sk_live_` (live mode)

### Issue: "Payments config is not active"

**Error:**
```json
{
  "detail": "Payments config is not active"
}
```

**Solution:** 
1. Initialize payment config: `POST /api/v1/payments/{org_id}/config?provider=paystack`
2. Verify config is active: `GET /api/v1/payments/{org_id}/config`
3. Ensure `active: true` in response

### Issue: "Product not found"

**Error:**
```json
{
  "detail": "Product not found"
}
```

**Solution:**
1. Verify product exists: `GET /api/v1/payments/{org_id}/products`
2. Ensure `product_id` matches an existing product
3. Ensure product belongs to the correct `org_id`

### Issue: "Course is already linked to a product"

**Error:**
```json
{
  "detail": "Course is already linked to a product"
}
```

**Solution:**
1. Unlink existing product: `DELETE /api/v1/payments/{org_id}/products/{old_product_id}/courses/{course_id}`
2. Link to new product: `POST /api/v1/payments/{org_id}/products/{new_product_id}/courses/{course_id}`

### Issue: "Invalid currency"

**Error:**
```json
{
  "detail": "Currency USD is not supported. Supported currencies: GHS, KES, NGN, XOF, USD, ZAR"
}
```

**Solution:**
1. Use only supported currencies: NGN, USD, GHS, ZAR, KES, XOF
2. Check available currencies: `GET /api/v1/payments/currencies`
3. Ensure currency code is uppercase (e.g., `NGN` not `ngn`)

### Issue: Webhook not updating payment status

**Symptoms:**
- Payment completed on Paystack
- Payment status stays `PENDING` in database
- Course access remains `false`

**Solution:**
1. **Verify webhook secret:**
   - Check `LEARNHOUSE_PAYSTACK_WEBHOOK_SECRET` in `.env`
   - Ensure it matches webhook secret in Paystack dashboard

2. **Check webhook endpoint accessibility:**
   - Use HTTPS (required by Paystack)
   - Use ngrok for local testing: `ngrok http 8009`
   - Update webhook URL in Paystack dashboard

3. **Verify webhook events:**
   - Ensure `charge.success` event is selected
   - Check Paystack dashboard → Webhooks → Delivery logs

4. **Check application logs:**
   - Look for webhook processing errors
   - Verify webhook signature validation

5. **Manual verification:**
   - Use `GET /api/v1/payments/{org_id}/transactions/{reference}` endpoint
   - This will update payment status if transaction is successful

### Issue: Payment status stays PENDING

**Solution:**
1. **Check webhook configuration** (see above)
2. **Manually verify transaction:**
   ```bash
   GET /api/v1/payments/{org_id}/transactions/{reference}
   ```
3. **Check Paystack dashboard:**
   - Verify transaction status in Paystack
   - Check if webhook was sent and received

### Issue: "No active payment configuration found"

**Error:**
```json
{
  "detail": "No active payment configuration found for org_id 1. Please configure a payment provider (e.g., Paystack) first."
}
```

**Solution:**
1. Initialize payment config: `POST /api/v1/payments/{org_id}/config?provider=paystack`
2. Verify config is active: `GET /api/v1/payments/{org_id}/config`
3. Ensure `active: true` in response

### Issue: Currency conversion not working

**Note:** Paystack handles currency conversion automatically. The amount charged will be equivalent to the product amount in the selected currency.

**If conversion seems incorrect:**
1. Verify product amount is correct
2. Check Paystack dashboard for actual charged amount
3. Note: Exchange rates are determined by Paystack

### Issue: Frontend redirect not working

**Symptoms:**
- Payment completes on Paystack
- User not redirected back to application

**Solution:**
1. **Check redirect_uri:**
   - Ensure `redirect_uri` is a valid, accessible URL
   - Use absolute URL (not relative)
   - Ensure URL is whitelisted in Paystack (if required)

2. **Handle redirect in frontend:**
   ```javascript
   // Check for reference parameter
   const urlParams = new URLSearchParams(window.location.search);
   const reference = urlParams.get('reference');
   
   if (reference) {
     // Verify payment and update UI
   }
   ```

---

## Test Data Checklist

### Required Data:
- [ ] User account (email, password)
- [ ] Access token
- [ ] Organization (org_id, org_slug)
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
- [ ] Course appears in owned courses list

---

## Notes

- **Amount Format:** All payment amounts are in the base currency unit (e.g., `5000.00` = ₦5000 for NGN, `99.99` = $99.99 for USD)
- **Subunit Conversion:** Paystack converts amounts to subunits automatically (multiply by 100: NGN 5000 = 500000 kobo)
- **Test Mode:** Test mode uses test API keys (start with `sk_test_` and `pk_test_`)
- **Webhooks:** Webhooks are essential for production but can be tested manually in development using the verify transaction endpoint
- **Payment Statuses:** `PENDING` → `COMPLETED` (one-time) or `ACTIVE` (subscription) → `FAILED` or `CANCELLED`
- **Course Linking:** A course can only be linked to one product at a time
- **Product Deletion:** Products with active/completed payments cannot be deleted
- **Supported Currencies:** NGN, USD, GHS, ZAR, KES, XOF
- **Currency Selection:** Users can select currency during checkout (optional parameter)
- **HTTPS Required:** Paystack requires HTTPS for webhooks (use ngrok for local testing)
- **Metadata:** All transactions include metadata with product_id, payment_user_id, user_id, org_id, and currency information
- **Transaction Verification:** Always verify transactions after redirect, don't rely solely on redirect status

---

## Quick Reference

### Paystack Test Cards

| Card Number | Result | Use Case |
|------------|--------|----------|
| `4084084084084081` | ✅ Success | Normal payment testing |
| `4084084084084085` | ❌ Decline | Test payment failure |
| `4084084084084093` | ❌ Insufficient Funds | Test insufficient funds |

### Payment Status Values

- `PENDING` - Payment initialized, awaiting completion
- `COMPLETED` - One-time payment successful
- `ACTIVE` - Subscription active
- `FAILED` - Payment failed
- `CANCELLED` - Subscription cancelled
- `REFUNDED` - Payment refunded

### Supported Currencies

- `NGN` - Nigerian Naira (₦)
- `USD` - US Dollar ($)
- `GHS` - Ghanaian Cedi (₵)
- `ZAR` - South African Rand (R)
- `KES` - Kenyan Shilling (Ksh.)
- `XOF` - West African CFA Franc (CFA)

---

## Additional Resources

- [Paystack API Documentation](https://paystack.com/docs/api/)
- [Paystack Test Cards](https://paystack.com/docs/payments/test-payments)
- [Paystack Webhooks Guide](https://paystack.com/docs/payments/webhooks)
- [PAYSTACK_QUICK_TEST_REFERENCE.md](./PAYSTACK_QUICK_TEST_REFERENCE.md) - Quick reference with cURL commands
- [PAYSTACK_MIGRATION_GUIDE.md](./PAYSTACK_MIGRATION_GUIDE.md) - Migration guide from Stripe
