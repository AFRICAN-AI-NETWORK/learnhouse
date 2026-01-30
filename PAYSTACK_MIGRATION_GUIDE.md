# Paystack Migration Guide

This document outlines the changes made to migrate from Stripe to Paystack payment integration.

## Overview

The backend has been refactored to use Paystack instead of Stripe as the primary payment provider. The system now supports both Paystack (default) and Stripe (for backward compatibility).

## Key Changes

### 1. Database Models

#### `PaymentProviderEnum`
- Added `PAYSTACK = "paystack"` option
- Default provider changed from `STRIPE` to `PAYSTACK`

#### `ProviderSpecificData`
- Added `paystack_customer` field
- Added `paystack_customer_code` field  
- Added `paystack_transaction_reference` field
- Kept `stripe_customer` for backward compatibility

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
- `apps/api/src/services/payments/payments_config.py` - Supports both Stripe and Paystack providers
- `apps/api/src/services/payments/payments_products.py` - Uses Paystack for product creation/updates
- `apps/api/src/services/payments/payments_users.py` - Handles Paystack customer data

### 4. API Endpoints

#### New Paystack Endpoints
- `POST /api/v1/payments/{org_id}/checkout/product/{product_id}` - Initialize Paystack transaction
- `POST /api/v1/payments/paystack/webhook` - Handle Paystack webhooks

#### Legacy Stripe Endpoints (Backward Compatibility)
- `POST /api/v1/payments/{org_id}/stripe/checkout/product/{product_id}` - Still available
- `POST /api/v1/payments/stripe/webhook` - Still available

## How Paystack Works

### Key Differences from Stripe

1. **No Connect Accounts**: Paystack doesn't have a Connect feature like Stripe. All transactions go through your main Paystack account.

2. **Transaction Flow**:
   - Initialize transaction → Get authorization URL → Redirect user → Webhook confirms payment
   - No checkout sessions, uses transaction initialization instead

3. **Products/Plans**:
   - One-time payments: No product creation needed, amount specified during transaction initialization
   - Subscriptions: Create a Plan (similar to Stripe plans)

4. **Amount Format**:
   - Amounts must be in subunits (multiply by 100)
   - Example: NGN 1000 = 100000 (kobo), USD 10 = 1000 (cents)

5. **Metadata**:
   - Metadata is sent as a JSON string in transaction initialization
   - Returned as an object in webhooks

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

```bash
POST /api/v1/payments/{org_id}/checkout/product/{product_id}?redirect_uri=https://yoursite.com/success
```

Response:
```json
{
  "checkout_url": "https://checkout.paystack.com/xxxxx",
  "reference": "ref_xxxxx",
  "access_code": "xxxxx"
}
```

### Link Course to Product

```bash
POST /api/v1/payments/{org_id}/products/{product_id}/courses/{course_id}
```

### Check Course Access

```bash
GET /api/v1/payments/{org_id}/courses/{course_id}/access
```

## Course Payment Logic

### Free vs Paid Courses

- **Free Course**: A course that is NOT linked to any product via `PaymentsCourse` table
- **Paid Course**: A course that IS linked to a product via `PaymentsCourse` table

### How It Works

1. When creating/updating a course, you can link it to a payment product
2. If linked → Course is paid, users must purchase access
3. If not linked → Course is free, all users have access

### Access Control

The system checks access in `check_course_paid_access()`:
- Authors always have access
- Free courses → All users have access
- Paid courses → Only users with active/completed payments have access

## Testing

### Test Cards (Paystack)

Use these test cards in Paystack test mode:
- **Success**: `4084084084084081` (any future expiry, any CVV)
- **Decline**: `4084084084084085`
- **Insufficient Funds**: `4084084084084093`

### Test Flow

1. Create a product
2. Link it to a course
3. Initialize payment
4. Complete payment with test card
5. Verify webhook updates payment status
6. Check course access

## Migration Notes

### Backward Compatibility

- Stripe endpoints are still available for existing integrations
- Existing Stripe products will continue to work
- New organizations default to Paystack

### Data Migration

- No database migration needed
- Existing `PaymentsUser` records with Stripe data remain valid
- New payments will use Paystack format

## Troubleshooting

### Common Issues

1. **"Paystack secret key not configured"**
   - Check `.env` file has `LEARNHOUSE_PAYSTACK_SECRET_KEY`
   - Restart the application

2. **Webhook not working**
   - Verify webhook URL is accessible
   - Check webhook secret matches
   - Ensure HTTPS is used (Paystack requires HTTPS for webhooks)

3. **Transaction initialization fails**
   - Verify amount is in subunits (multiply by 100)
   - Check currency is supported (NGN, USD, GHS, ZAR, KES, XOF)
   - Ensure customer email is valid

4. **Metadata not found in webhook**
   - Verify metadata is sent as JSON string in transaction initialization
   - Check webhook event type matches expected events

## Support

For Paystack-specific issues:
- [Paystack Documentation](https://paystack.com/docs)
- [Paystack Support](https://paystack.com/contact)

For integration issues:
- Check application logs
- Verify API keys and webhook configuration
- Test with Paystack test mode first
