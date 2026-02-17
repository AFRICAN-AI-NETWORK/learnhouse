# Waitlist Feature Tests

Comprehensive unit and integration tests for the LearnHouse Waitlist feature.

## Test Structure

```
tests/waitlist/
├── __init__.py
├── conftest.py                    # Shared fixtures and test configuration
├── test_models.py                 # Database models tests
├── test_config_service.py         # Waitlist configuration service tests
├── test_courses_service.py        # Course listing and preferences tests
├── test_emails_service.py         # Email service and batch processing tests
├── test_user_service.py           # User registration service tests
├── test_api_router.py             # API router endpoint tests
├── test_background_jobs.py        # Background job processor tests
├── test_auth_integration.py       # Authentication flow integration tests
└── test_e2e_integration.py        # End-to-end integration tests
```

## Test Coverage

### 1. Database Models Tests (`test_models.py`)

- ✅ UserStatusEnum enumeration
- ✅ WaitlistStatusEnum enumeration
- ✅ WaitlistConfig model (creation, defaults, constraints)
- ✅ WaitlistEmailLog model (email tracking, retries)
- ✅ WaitlistCoursePreference model (user course selections)
- ✅ Request/Response models (Create, Update, Read)

### 2. Configuration Service Tests (`test_config_service.py`)

- ✅ Create waitlist campaign with validation
- ✅ Get waitlist configuration by UUID
- ✅ List organization waitlists
- ✅ Update waitlist (extend/shorten countdown)
- ✅ Cancel waitlist (soft delete)
- ✅ Date validation (past/future)
- ✅ Batch settings configuration

### 3. Courses Service Tests (`test_courses_service.py`)

- ✅ Get organization courses for waitlist
- ✅ Free course pricing identification
- ✅ Paid course pricing with payment products
- ✅ Public vs private course filtering
- ✅ Course preference analytics
- ✅ User-specific course preferences
- ✅ Multiple users selecting same courses

### 4. Emails Service Tests (`test_emails_service.py`)

- ✅ Confirmation email on waitlist join
- ✅ Activation email when countdown ends
- ✅ Batch email processing
- ✅ Email log creation
- ✅ Duplicate email prevention
- ✅ Failure handling and error logging
- ✅ Batch size and delay respecting

### 5. User Service Tests (`test_user_service.py`)

- ✅ Create waitlist user with validation
- ✅ Course preference selection
- ✅ Username and email uniqueness
- ✅ Launch date validation
- ✅ Registration count updates
- ✅ Organization limits checking
- ✅ Get waitlist users listing

### 6. API Router Tests (`test_api_router.py`)

- ✅ POST /config - Create waitlist
- ✅ GET /config/{uuid} - Get waitlist details
- ✅ GET /config/org/{org_id} - List org waitlists
- ✅ PUT /config/{uuid} - Update waitlist
- ✅ DELETE /config/{uuid} - Cancel waitlist
- ✅ POST /join - User registration
- ✅ GET /config/{uuid}/courses - Course listing
- ✅ GET /config/{uuid}/preferences - Analytics
- ✅ GET /config/{uuid}/users - User listing
- ✅ Authorization checks

### 7. Background Jobs Tests (`test_background_jobs.py`)

- ✅ Waitlist activation job execution
- ✅ Email retry job execution
- ✅ Error handling and recovery
- ✅ Session cleanup
- ✅ Synchronous wrappers for APScheduler
- ✅ Expired waitlist processing
- ✅ Future waitlist skipping
- ✅ Max retry attempts enforcement

### 8. Authentication Integration Tests (`test_auth_integration.py`)

- ✅ ACTIVE users can login
- ✅ WAITLIST users blocked from login
- ✅ WAITLIST_ACTIVATED users transition to ACTIVE
- ✅ SUSPENDED users blocked from login
- ✅ Unverified email blocking
- ✅ Wrong password handling
- ✅ Status transitions on login
- ✅ Launch date display in error messages

### 9. End-to-End Integration Tests (`test_e2e_integration.py`)

- ✅ Complete waitlist lifecycle flow
- ✅ User registration → activation → login
- ✅ Course selection and preferences
- ✅ Background job processing
- ✅ Status transitions through entire flow
- ✅ Cancelled waitlist handling
- ✅ Multiple waitlist campaigns
- ✅ Analytics and reporting
- ✅ Email retry mechanism

## Running Tests

### Run All Waitlist Tests

```bash
cd apps/api
pytest src/tests/waitlist/ -v
```

### Run Specific Test File

```bash
pytest src/tests/waitlist/test_models.py -v
```

### Run Specific Test Class

```bash
pytest src/tests/waitlist/test_config_service.py::TestCreateWaitlistConfig -v
```

### Run Specific Test

```bash
pytest src/tests/waitlist/test_auth_integration.py::TestWaitlistAuthenticationFlow::test_active_user_can_login -v
```

### Run with Coverage

```bash
pytest src/tests/waitlist/ --cov=src/services/waitlist --cov=src/db/waitlist --cov=src/jobs --cov-report=html
```

### Run Integration Tests Only

```bash
pytest src/tests/waitlist/test_e2e_integration.py -v
```

### Run Fast Tests (Skip Slow Integration Tests)

```bash
pytest src/tests/waitlist/ -v -m "not slow"
```

## Test Fixtures

### Database Fixtures

- `test_db_engine` - In-memory SQLite database
- `db_session` - Database session for testing
- `sample_org` - Test organization
- `sample_user` - Active test user
- `waitlist_user` - User on waitlist

### Waitlist Fixtures

- `sample_waitlist_config` - Active waitlist campaign
- `expired_waitlist_config` - Expired waitlist for testing activation
- `sample_email_log` - Email delivery log
- `sample_course_preference` - User course selection

### Course Fixtures

- `sample_course` - Basic test course

### Mock Fixtures

- `mock_request` - Mocked FastAPI request object

## Test Data

### Test Organizations

- ID: 1, Name: "Test Organization", Slug: "test-org"

### Test Users

- **Active User**: username="testuser", email="test@example.com"
- **Waitlist User**: username="waitlistuser", email="waitlist@example.com"

### Test Waitlist

- Name: "Test Waitlist"
- Category: "Programming"
- Launch: 7 days in future
- Batch Size: 50
- Batch Delay: 2 seconds

## Mocking Strategy

### External Dependencies Mocked

- Email sending (`send_email`)
- Usage limits checking (`check_limits_with_usage`)
- Feature usage tracking (`increase_feature_usage`)
- Account creation emails (`send_account_creation_email`)
- Waitlist confirmation emails (`send_waitlist_confirmation_email`)

### Database Operations

- Tests use in-memory SQLite database
- Real SQLModel operations (no mocking)
- Transaction rollback between tests

## Critical Test Scenarios

### 1. User Cannot Login on Waitlist

```python
# User status = WAITLIST
# Expected: HTTPException 403 with launch date info
```

### 2. Activation Status Transition

```python
# User status = WAITLIST_ACTIVATED
# Login → Status changes to ACTIVE
# Subsequent logins remain ACTIVE
```

### 3. Email Deduplication

```python
# Email log exists with email_sent=True
# Batch processor skips duplicate sends
```

### 4. Background Job Resilience

```python
# Database error during processing
# Job catches exception, closes session
# Next run continues normally
```

### 5. Launch Date Validation

```python
# Create/Update with past date → Rejected
# Join after launch date → Rejected
# Expired waitlist → Background job processes
```

## Best Practices

### Writing New Tests

1. Use existing fixtures where possible
2. Mock external dependencies (email, payments)
3. Test both success and failure cases
4. Use descriptive test names
5. Add docstrings explaining test purpose
6. Clean up test data (use fixtures)

### Test Organization

- Group related tests in classes
- Use `pytest.mark.asyncio` for async tests
- Use `@patch` decorators for mocking
- Keep tests independent and isolated

### Assertions

- Check expected values explicitly
- Verify database state changes
- Assert error messages and status codes
- Check side effects (emails sent, logs created)

## Continuous Integration

### GitHub Actions Workflow

```yaml
- name: Run Waitlist Tests
  run: |
    cd apps/api
    pytest src/tests/waitlist/ -v --cov=src --cov-report=xml
```

### Coverage Targets

- Overall: 85%+
- Services: 90%+
- Models: 95%+
- API Routes: 80%+

## Troubleshooting

### Common Issues

**Issue**: Tests fail with database errors
**Solution**: Ensure SQLModel tables are created in `test_db_engine` fixture

**Issue**: AsyncIO warnings
**Solution**: Use `pytest.mark.asyncio` decorator

**Issue**: Mock not being called
**Solution**: Check import path in `@patch()` matches actual usage

**Issue**: Fixture not found
**Solution**: Ensure `conftest.py` is in the correct directory

## Future Enhancements

- [ ] Add performance tests for large batches
- [ ] Add stress tests for concurrent registrations
- [ ] Add security penetration tests
- [ ] Add API contract tests with OpenAPI schema
- [ ] Add browser automation tests (Selenium/Playwright)

## Contributing

When adding new waitlist features:

1. Write tests first (TDD)
2. Ensure all existing tests pass
3. Add integration test for new feature
4. Update this README with test coverage
5. Maintain 85%+ coverage

## Support

For questions about tests:

- Check existing test examples
- Review fixtures in `conftest.py`
- Consult pytest documentation
- Ask in #testing channel
