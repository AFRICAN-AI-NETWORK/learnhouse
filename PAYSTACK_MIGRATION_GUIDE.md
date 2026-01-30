# Paystack Payment Integration Guide

This document outlines the Paystack payment integration implementation.

## Overview

The backend uses Paystack as the payment provider for processing course payments. The system supports one-time payments and subscriptions, with currency selection and comprehensive webhook handling.

## Key Changes

### 1. Database Models

#### `PaymentProviderEnum`
- Only `PAYSTACK = "paystack"` option available
- Default provider is `PAYSTACK`

#### `ProviderSpecificData`
- `paystack_customer`: Paystack customer object
- `paystack_customer_code`: Paystack customer code (e.g., `CUS_xxxxx`)
- `paystack_transaction_reference`: Transaction reference for verification
- `paystack_access_code`: Access code for transaction

### 2. Configuration

#### Environment Variables
Added new Paystack configuration variables in `.env`:
```env
LEARNHOUSE_PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key_here
LEARNHOUSE_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key_here
LEARNHOUSE_PAYSTACK_WEBHOOK_SECRET=your_paystack_webhook_secret_here
```

#### Config Structure
- Added `InternalPaystackConfig` class
- Updated `InternalPaymentsConfig` to include Paystack config

### 3. Service Files

#### New Files Created
- `apps/api/src/services/payments/payments_paystack.py` - Main Paystack integration service
- `apps/api/src/services/payments/webhooks/payments_paystack_webhooks.py` - Paystack webhook handler

#### Updated Files
- `apps/api/src/services/payments/payments_config.py` - Paystack provider support
- `apps/api/src/services/payments/payments_products.py` - Paystack product creation/updates
- `apps/api/src/services/payments/payments_users.py` - Paystack customer data handling
- `apps/api/ee/routers/payments.py` - Paystack API endpoints

### 4. API Endpoints

#### Payment Endpoints
- `POST /api/v1/payments/{org_id}/checkout/product/{product_id}` - Initialize Paystack transaction (supports currency selection)
- `POST /api/v1/payments/paystack/webhook` - Handle Paystack webhooks
- `GET /api/v1/payments/currencies` - Get supported currencies

#### Configuration Endpoints
- `POST /api/v1/payments/{org_id}/config?provider=paystack` - Initialize payments config
- `GET /api/v1/payments/{org_id}/config` - Get payments config
- `PUT /api/v1/payments/{org_id}/config` - Update payments config
- `DELETE /api/v1/payments/{org_id}/config` - Delete payments config

#### Product Management Endpoints
- `POST /api/v1/payments/{org_id}/products` - Create product
- `GET /api/v1/payments/{org_id}/products` - List products
- `GET /api/v1/payments/{org_id}/products/{product_id}` - Get product
- `PUT /api/v1/payments/{org_id}/products/{product_id}` - Update product
- `DELETE /api/v1/payments/{org_id}/products/{product_id}` - Delete product

#### Course-Product Linking Endpoints
- `POST /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}` - Link course to product
- `DELETE /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}` - Unlink course from product
- `GET /api/v1/payments/{org_id}/products/{product_id}/courses` - Get courses by product
- `GET /api/v1/payments/{org_id}/courses/{course_id}/products` - Get products by course

#### Access & Customer Endpoints
- `GET /api/v1/payments/{org_id}/courses/{course_id}/access` - Check course access
- `GET /api/v1/payments/{org_id}/courses/owned` - Get user's owned courses
- `GET /api/v1/payments/{org_id}/customers` - Get customers list (admin)

## How Paystack Works

### Key Features

1. **Simple Integration**: No Connect accounts needed. All transactions go through your main Paystack account.

2. **Transaction Flow**:
   - Initialize transaction → Get authorization URL → Redirect user → Webhook confirms payment
   - Uses Paystack's transaction initialization API

3. **Products/Plans**:
   - **One-time payments**: Amount specified during transaction initialization
   - **Subscriptions**: Create a Plan in Paystack (for recurring payments)

4. **Currency Support**:
   - Supports multiple currencies: NGN, USD, GHS, ZAR, KES, XOF
   - Users can select currency during checkout
   - Amounts must be in subunits (multiply by 100)
   - Example: NGN 1000 = 100000 (kobo), USD 10 = 1000 (cents)

5. **Metadata**:
   - Metadata is sent as a JSON string in transaction initialization
   - Returned as an object in webhooks
   - Includes: `product_id`, `payment_user_id`, `user_id`, `org_id`, `selected_currency`, `product_currency`

6. **Webhook Events**:
   - `charge.success` - Payment completed successfully
   - `charge.failed` - Payment failed
   - `subscription.create` - Subscription created
   - `subscription.disable` - Subscription cancelled

## Setup Instructions

### 1. Get Paystack API Keys

1. Sign up at [Paystack Dashboard](https://dashboard.paystack.com)
2. Go to Settings → API Keys & Webhooks
3. Copy your Test/Live Secret Key and Public Key

### 2. Configure Environment Variables

Update your `.env` file:
```env
LEARNHOUSE_PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
LEARNHOUSE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
LEARNHOUSE_PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Set Up Webhook

1. Go to Paystack Dashboard → Settings → API Keys & Webhooks
2. Add webhook URL: `https://yourdomain.com/api/v1/payments/paystack/webhook`
3. Select events:
   - `charge.success`
   - `charge.failed`
   - `subscription.create`
   - `subscription.disable`
4. Copy the webhook secret to your `.env` file

### 4. Initialize Payments Config

```bash
POST /api/v1/payments/{org_id}/config?provider=paystack
```

## Usage Examples

### Create a Product

```bash
POST /api/v1/payments/{org_id}/products
{
  "name": "Python Course Access",
  "description": "Full access to Python course",
  "product_type": "one_time",
  "price_type": "fixed_price",
  "amount": 5000.00,
  "currency": "NGN",
  "benefits": "Lifetime access, Certificate"
}
```

### Initialize Payment (Checkout)

**With Default Currency**:
```bash
POST /api/v1/payments/{org_id}/checkout/product/{product_id}?redirect_uri=https://yoursite.com/success
```

**With Currency Selection**:
```bash
POST /api/v1/payments/{org_id}/checkout/product/{product_id}?redirect_uri=https://yoursite.com/success&currency=USD
```

**Supported Currencies**: `NGN`, `USD`, `GHS`, `ZAR`, `KES`, `XOF`

**Response**:
```json
{
  "checkout_url": "https://checkout.paystack.com/xxxxx",
  "reference": "ref_xxxxx",
  "access_code": "xxxxx"
}
```

**What Happens**:
1. Creates/retrieves Paystack customer
2. Creates `PaymentsUser` record with status `PENDING`
3. Initializes Paystack transaction with selected currency
4. Returns checkout URL for user to complete payment

### Link Course to Product

```bash
POST /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}
```

**Note**: Once linked, the course becomes **PAID**. Only users who purchase the product will have access.

### Unlink Course from Product (Make Free)

```bash
DELETE /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}
```

**Note**: Unlinking makes the course **FREE** again. All users will have access.

### Check Course Access

```bash
GET /api/v1/payments/{org_id}/courses/{course_id}/access
```

**Response**:
```json
{
  "has_access": true
}
```

**Returns `true` if**:
- User is course author
- Course is free (not linked to product)
- User has `ACTIVE` or `COMPLETED` payment status

### Get Supported Currencies

```bash
GET /api/v1/payments/currencies
```

**Response**:
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
  ...
}
```

## Course Payment Logic

### Free vs Paid Courses

- **Free Course**: A course that is NOT linked to any product via `PaymentsCourse` table
  - All users have access
  - No payment required
  
- **Paid Course**: A course that IS linked to a product via `PaymentsCourse` table
  - Only users with valid payment have access
  - Payment required to access content

### How It Works

1. **Creating a Course**: Courses are created as free by default
2. **Making a Course Paid**: Link the course to a payment product
   ```bash
   POST /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}
   ```
3. **Making a Course Free Again**: Unlink the course from the product
   ```bash
   DELETE /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}
   ```

### Access Control Logic

The system checks access in `check_course_paid_access()` and `check_activity_paid_access()`:

**Always Has Access**:
- Course authors (users who created/own the course)
- If payments feature is disabled for organization

**Free Courses**:
- All authenticated users have access
- Anonymous users have access

**Paid Courses**:
- ✅ Users with `ACTIVE` payment status (subscriptions)
- ✅ Users with `COMPLETED` payment status (one-time payments)
- ❌ Users with `PENDING`, `FAILED`, or `CANCELLED` status
- ❌ Anonymous users (no access)

### Payment Status Flow

```
PENDING → Payment initialized, awaiting completion
    ↓
COMPLETED → One-time payment successful
    OR
ACTIVE → Subscription active
    ↓
FAILED → Payment failed
    OR
CANCELLED → Subscription cancelled
```

## Testing

### Test Cards (Paystack Test Mode)

Use these test cards in Paystack test mode:

| Card Number | Result | Use Case |
|------------|--------|----------|
| `4084084084084081` | ✅ Success | Normal payment testing |
| `4084084084084085` | ❌ Decline | Test payment failure |
| `4084084084084093` | ❌ Insufficient Funds | Test insufficient funds |

**Test Card Details**:
- **Expiry**: Any future date (e.g., `12/25`)
- **CVV**: Any 3 digits (e.g., `123`)
- **PIN**: Any 4 digits (if required)

### Complete Test Flow

1. **Setup**: Enable payments and initialize config
2. **Create Product**: Define pricing and currency
3. **Create Course**: Create course content
4. **Link Course**: Link course to product (makes it paid)
5. **Initialize Payment**: Get checkout URL
6. **Complete Payment**: Use test card on Paystack checkout
7. **Webhook**: Paystack confirms payment (automatic)
8. **Verify Access**: Check course access is granted

### Quick Test Checklist

- [ ] Payments config created and active
- [ ] Product created successfully
- [ ] Course created successfully
- [ ] Course linked to product
- [ ] Payment initialized (got checkout_url)
- [ ] Payment completed on Paystack
- [ ] Webhook received (check logs)
- [ ] Payment status = COMPLETED/ACTIVE
- [ ] Course access = true
- [ ] Course appears in owned courses

### Testing Currency Selection

1. Create product with currency `NGN`
2. Initialize payment with `currency=USD` parameter
3. Verify transaction uses USD
4. Complete payment
5. Check metadata contains `selected_currency: "USD"`

## Database Schema

### Key Tables

**PaymentsConfig**
- Stores payment provider configuration per organization
- Fields: `org_id`, `provider` (always "paystack"), `active`, `enabled`

**PaymentsProduct**
- Stores payment products
- Fields: `name`, `amount`, `currency`, `product_type`, `provider_product_id`
- `product_type`: `"one_time"` or `"subscription"`
- `price_type`: `"fixed_price"` or `"customer_choice"`

**PaymentsCourse**
- Links courses to products (makes courses paid)
- Fields: `course_id`, `payment_product_id`, `org_id`
- One course can only be linked to ONE product

**PaymentsUser**
- Tracks user purchases
- Fields: `user_id`, `payment_product_id`, `status`, `provider_specific_data`
- Status values: `PENDING`, `COMPLETED`, `ACTIVE`, `CANCELLED`, `FAILED`
- `provider_specific_data` contains Paystack customer info and transaction reference

## Troubleshooting

### Common Issues

1. **"Paystack secret key not configured"**
   - **Solution**: Check `.env` file has `LEARNHOUSE_PAYSTACK_SECRET_KEY`
   - **Solution**: Restart the application after adding keys
   - **Solution**: Verify keys are from Paystack Dashboard → Settings → API Keys

2. **Webhook not working**
   - **Check**: Webhook URL is accessible (use ngrok for local testing)
   - **Check**: Webhook secret in `.env` matches Paystack Dashboard
   - **Check**: HTTPS is used (Paystack requires HTTPS for webhooks)
   - **Check**: Paystack Dashboard → Webhooks → Check delivery logs
   - **Solution**: Verify webhook events are selected: `charge.success`, `charge.failed`, `subscription.create`, `subscription.disable`

3. **Transaction initialization fails**
   - **Check**: Amount is in subunits (multiply by 100)
   - **Check**: Currency is supported: `NGN`, `USD`, `GHS`, `ZAR`, `KES`, `XOF`
   - **Check**: Customer email is valid
   - **Check**: Product exists and is active
   - **Check**: Payments config is active

4. **Payment status stays PENDING**
   - **Check**: Webhook is configured correctly
   - **Check**: Webhook secret matches
   - **Check**: Application logs for webhook errors
   - **Solution**: Manually verify transaction in Paystack Dashboard

5. **Course access returns false after payment**
   - **Check**: Payment status is `COMPLETED` or `ACTIVE` (not `PENDING`)
   - **Check**: Course is linked to the correct product
   - **Check**: User ID matches the payment user
   - **Check**: `PaymentsUser` record exists with correct `payment_product_id`

6. **Currency not supported error**
   - **Solution**: Use only supported currencies: `NGN`, `USD`, `GHS`, `ZAR`, `KES`, `XOF`
   - **Solution**: Ensure currency is uppercase: `USD` not `usd`
   - **Solution**: Use `GET /api/v1/payments/currencies` to see supported currencies

7. **Course already linked error**
   - **Solution**: Unlink existing product first
   - **Solution**: Then link to new product
   - **Note**: One course can only be linked to ONE product at a time

## Additional Resources

### Documentation
- **Complete Testing Guide**: See `PAYSTACK_PAYMENT_TESTING_GUIDE.md` for detailed step-by-step testing instructions
- **Quick Reference**: See `PAYSTACK_QUICK_TEST_REFERENCE.md` for copy-paste cURL commands

### Paystack Resources
- [Paystack API Documentation](https://paystack.com/docs)
- [Paystack Dashboard](https://dashboard.paystack.com)
- [Paystack Support](https://paystack.com/contact)
- [Paystack Test Cards](https://paystack.com/docs/payments/test-payments)

### Integration Support
- Check application logs for detailed error messages
- Verify API keys and webhook configuration
- Test with Paystack test mode first before going live
- Use ngrok for local webhook testing

## Payment Flow Summary

```
1. Setup → Enable payments, initialize Paystack config
2. Create Product → Define pricing, currency, type
3. Create Course → Create course content
4. Link Course → Link course to product (makes it paid)
5. User Checkout → User initiates payment, selects currency
6. Paystack Payment → User completes payment on Paystack
7. Webhook → Paystack confirms payment, updates status
8. Access Granted → User can now access course content
```

## Key Features

✅ **Currency Selection**: Users can choose payment currency  
✅ **One-Time & Subscriptions**: Support for both payment types  
✅ **Free/Paid Courses**: Easy toggle between free and paid  
✅ **Access Control**: Automatic access management based on payment status  
✅ **Webhook Integration**: Automatic payment confirmation  
✅ **Multi-Currency**: Support for 6 currencies  
✅ **Comprehensive Logging**: Full transaction tracking
