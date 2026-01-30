# Paystack Payment Integration - Quick Test Reference

## Quick Test Flow (Copy-Paste Ready)

### Prerequisites
```bash
# Set these in .env
LEARNHOUSE_PAYSTACK_SECRET_KEY=sk_test_xxxxx
LEARNHOUSE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
LEARNHOUSE_PAYSTACK_WEBHOOK_SECRET=xxxxx
```

### Step-by-Step cURL Commands

**Replace these variables:**
- `{org_id}` = Your organization ID (e.g., `1`)
- `{org_slug}` = Your organization slug (e.g., `"my-org"`)
- `{access_token}` = Your JWT access token
- `{base_url}` = `http://localhost:8009/api/v1`

---

#### 1. Enable Payments Feature
```bash
curl -X PUT "{base_url}/orgs/{org_slug}/config" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{"config": {"features": {"payments": {"enabled": true}}}}'
```

#### 2. Initialize Payments Config
```bash
curl -X POST "{base_url}/payments/{org_id}/config?provider=paystack" \
  -H "Authorization: Bearer {access_token}"
```

#### 3. Activate Payments Config
```bash
curl -X PUT "{base_url}/payments/{org_id}/config" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "active": true,
    "provider": "paystack",
    "provider_config": {"onboarding_completed": true}
  }'
```

#### 4. Create Payment Product
```bash
curl -X POST "{base_url}/payments/{org_id}/products" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Python Course Access",
    "description": "Full access to Python course",
    "product_type": "one_time",
    "price_type": "fixed_price",
    "amount": 5000.00,
    "currency": "NGN",
    "benefits": "Lifetime access, Certificate"
  }'
```

**Save `product_id` from response** (e.g., `1`)

#### 5. Create Course
```bash
curl -X POST "{base_url}/orgs/{org_slug}/courses" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Python Programming",
    "description": "Learn Python",
    "public": true,
    "open_to_contributors": false
  }'
```

**Save `course_id` from response** (e.g., `1`)

#### 6. Link Course to Product
```bash
curl -X POST "{base_url}/payments/{org_id}/products/{product_id}/courses/{course_id}" \
  -H "Authorization: Bearer {access_token}"
```

#### 7. Initialize Payment (Checkout)
```bash
curl -X POST "{base_url}/payments/{org_id}/checkout/product/{product_id}?redirect_uri=http://localhost:3000/success&currency=NGN" \
  -H "Authorization: Bearer {access_token}"
```

**Response contains `checkout_url`** - Open this in browser

#### 8. Complete Payment
- Open `checkout_url` in browser
- Use test card: `4084084084084081`
- Expiry: Any future date (e.g., `12/25`)
- CVV: Any 3 digits (e.g., `123`)
- Complete payment

#### 9. Verify Access
```bash
curl -X GET "{base_url}/payments/{org_id}/courses/{course_id}/access" \
  -H "Authorization: Bearer {access_token}"
```

**Expected**: `{"has_access": true}`

#### 10. Get Owned Courses
```bash
curl -X GET "{base_url}/payments/{org_id}/courses/owned" \
  -H "Authorization: Bearer {access_token}"
```

---

## Test Data Template

```json
{
  "org_id": 1,
  "org_slug": "my-org",
  "product": {
    "name": "Test Course Access",
    "amount": 5000.00,
    "currency": "NGN",
    "product_type": "one_time"
  },
  "course": {
    "name": "Test Course",
    "description": "Test course description"
  },
  "test_card": {
    "number": "4084084084084081",
    "expiry": "12/25",
    "cvv": "123"
  }
}
```

---

## Paystack Test Cards

| Card Number | Result | Use Case |
|------------|--------|----------|
| `4084084084084081` | ✅ Success | Normal payment testing |
| `4084084084084085` | ❌ Decline | Test payment failure |
| `4084084084084093` | ❌ Insufficient Funds | Test insufficient funds |

---

## Supported Currencies

- `NGN` - Nigerian Naira
- `USD` - US Dollar  
- `GHS` - Ghanaian Cedi
- `ZAR` - South African Rand
- `KES` - Kenyan Shilling
- `XOF` - West African CFA Franc

---

## Payment Status Values

- `PENDING` - Payment initialized, awaiting completion
- `COMPLETED` - One-time payment successful
- `ACTIVE` - Subscription active
- `FAILED` - Payment failed
- `CANCELLED` - Subscription cancelled

---

## Quick Verification Checklist

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

---

## Common Issues & Fixes

**Issue**: Payment stays PENDING
- **Fix**: Check webhook configuration and logs

**Issue**: Access returns false after payment
- **Fix**: Verify payment status is COMPLETED/ACTIVE

**Issue**: Currency not supported
- **Fix**: Use only: NGN, USD, GHS, ZAR, KES, XOF

**Issue**: Course already linked
- **Fix**: Unlink first, then link to new product
