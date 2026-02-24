# Referral System Test Suite

## Overview

Comprehensive test suite for the referral code system covering:

- Referral code generation and validation
- Fraud detection and tracking
- Commission management
- Edge cases and race conditions

## Test Structure

```
tests/referrals/
├── __init__.py
├── conftest.py                      # Pytest fixtures and configuration
├── test_models.py                   # Database model tests
├── test_referral_codes.py           # Referral code service tests
├── test_referral_tracking.py        # Fraud detection and tracking tests
├── test_referral_commissions.py     # Commission management tests
└── test_integration.py              # End-to-end integration tests
```

## Running Tests

### Run All Referral Tests

```bash
cd apps/api
pytest src/tests/referrals/ -v
```

### Run Specific Test File

```bash
pytest src/tests/referrals/test_referral_codes.py -v
```

### Run Specific Test Class

```bash
pytest src/tests/referrals/test_referral_codes.py::TestGenerateUniqueCode -v
```

### Run Specific Test

```bash
pytest src/tests/referrals/test_referral_codes.py::TestGenerateUniqueCode::test_code_excludes_ambiguous_characters -v
```

### Run Tests with Coverage

```bash
pytest src/tests/referrals/ --cov=src/services/referrals --cov=src/db/referrals --cov-report=html
```

### Run Only Critical Tests

```bash
pytest src/tests/referrals/ -v -k "CRITICAL"
```

## Test Coverage

### 1. Database Models (`test_models.py`)

- ✅ Enum definitions and values
- ✅ Model field validation
- ✅ Default values
- ✅ Max length constraints
- ✅ Table name and indexes

### 2. Referral Codes (`test_referral_codes.py`)

- ✅ Code generation with cryptographic randomness
- ✅ **CRITICAL**: Ambiguous character exclusion (0, O, I, 1, L)
- ✅ Code uniqueness enforcement
- ✅ **CRITICAL**: Database collision handling with retry logic
- ✅ **CRITICAL**: IntegrityError handling from DB constraints
- ✅ Link building with environment config
- ✅ Case-insensitive code lookup
- ✅ Idempotent code creation (one code per user)
- ✅ Active/inactive status validation
- ✅ **CRITICAL**: Max retry attempts failure handling

### 3. Referral Tracking (`test_referral_tracking.py`)

- ✅ IP address extraction from headers
- ✅ X-Forwarded-For parsing (multiple IPs)
- ✅ **CRITICAL**: Fraud score calculation (single optimized query)
- ✅ **CRITICAL**: Temporal window (48-hour) fraud detection
- ✅ IP threshold detection
- ✅ Device threshold detection
- ✅ Exact duplicate (IP + device) detection
- ✅ **CRITICAL**: Self-referral prevention
- ✅ **CRITICAL**: Duplicate tracking prevention (one code per user)
- ✅ Graceful handling of duplicate attempts

### 4. Referral Commissions (`test_referral_commissions.py`)

- ✅ Commission creation with refund period
- ✅ **CRITICAL**: Idempotent commission creation (webhook retries)
- ✅ **CRITICAL**: Forfeit with balance deduction
- ✅ **CRITICAL**: Negative balance prevention
- ✅ **CRITICAL**: Forfeit idempotency
- ✅ Audit trail with refund reasons
- ✅ **CRITICAL**: Row locking (SELECT FOR UPDATE) for race conditions
- ✅ **CRITICAL**: Bulk balance updates (N+1 prevention)
- ✅ Pending to eligible batch updates
- ✅ Balance breakdown retrieval
- ✅ **CRITICAL**: Commission history with batch fetching (no N+1)

### 5. Integration Tests (`test_integration.py`)

- ✅ **CRITICAL**: Complete referral flow (create → track → commission → payout)
- ✅ **CRITICAL**: Refund flow with balance deduction
- ✅ **CRITICAL**: Fraud detection integration
- ✅ **CRITICAL**: Self-referral prevention (E2E)
- ✅ **CRITICAL**: Duplicate referral prevention
- ✅ **CRITICAL**: Concurrent code generation with collisions
- ✅ **CRITICAL**: Concurrent balance updates with row locking
- ✅ Edge cases (optional course, zero balance, large batches)

## Critical Test Cases

These tests verify production-critical scenarios:

### Security & Fraud Prevention

1. **Ambiguous character exclusion** - Prevents user confusion
2. **Self-referral prevention** - Prevents gaming the system
3. **Duplicate referral prevention** - One code per user
4. **Temporal fraud detection** - 48-hour window prevents false positives
5. **IP spoofing awareness** - X-Forwarded-For security notes

### Data Integrity

1. **Database unique constraint** - Final authority on uniqueness
2. **IntegrityError handling** - Graceful failure on DB collisions
3. **Idempotent operations** - Safe webhook retries
4. **Negative balance prevention** - Financial integrity
5. **Row locking** - Prevents race conditions

### Performance

1. **Single-query fraud detection** - No N+1 queries
2. **Bulk balance updates** - Optimized batch processing
3. **Batch fetching in history** - Efficient data retrieval

### Reliability

1. **Max retry handling** - Graceful failure after exhaustion
2. **Forfeit idempotency** - Safe repeated calls
3. **Duplicate tracking grace** - Doesn't break signup flow

## Test Data Patterns

### Mock Users

- Referrer: `user_id=500`
- Referred: `user_id=600`
- Organization: `org_id=100`

### Mock IPs

- Standard: `203.0.113.1` (TEST-NET-3)
- Alternative: `198.51.100.1` (TEST-NET-2)
- Local: `192.0.2.50` (TEST-NET-1)

### Mock Codes

- Standard: `TEST123`, `REF123`
- Self-referral: `SELF123`
- Fraud: `FRAUD123`

## Dependencies

```bash
pytest>=7.0.0
pytest-asyncio>=0.21.0
pytest-cov>=4.0.0  # For coverage reports
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Referral Tests
  run: |
    cd apps/api
    pytest src/tests/referrals/ -v --cov=src/services/referrals --cov-report=xml

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./apps/api/coverage.xml
```

## Troubleshooting

### Import Errors

Ensure `PYTHONPATH` includes the project root:

```bash
export PYTHONPATH="${PYTHONPATH}:$(pwd)/apps/api"
```

### Async Test Warnings

Install pytest-asyncio:

```bash
pip install pytest-asyncio
```

### Mock Issues

Tests use `unittest.mock` which is built-in. For advanced mocking:

```bash
pip install pytest-mock
```

## Future Enhancements

- [ ] Load testing for fraud detection queries
- [ ] Property-based testing with Hypothesis
- [ ] Database migration tests
- [ ] API endpoint integration tests
- [ ] Performance benchmarks
- [ ] Chaos engineering tests (network failures, DB timeouts)

## Contributing

When adding new features to the referral system:

1. **Add unit tests** for the new function/method
2. **Add integration tests** for E2E flows
3. **Mark critical tests** with "CRITICAL:" in docstring
4. **Test edge cases** (None values, empty lists, max values)
5. **Test race conditions** if modifying shared state
6. **Run full test suite** before committing

## Code Coverage Goals

- **Minimum**: 80% coverage
- **Target**: 90%+ coverage
- **Critical paths**: 100% coverage (payment flows, fraud detection)

Current coverage: Run `pytest --cov` to see latest.
