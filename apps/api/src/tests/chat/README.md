# Chat System Tests

Comprehensive unit and integration tests for the LearnHouse chat system.

## Test Structure

```
src/tests/chat/
├── __init__.py
├── conftest.py                    # Test fixtures and configuration
├── test_authorization.py          # Permission and role-based access tests
├── test_conversation_service.py   # Conversation service unit tests
├── test_message_service.py        # Message service unit tests
├── test_api_integration.py        # API endpoint integration tests
└── test_critical_scenarios.py     # Critical end-to-end scenarios
```

## Test Coverage

### Authorization Tests (`test_authorization.py`)

- **Permission Verification**

  - Student can chat with instructor ✓
  - Instructor can chat with student ✓
  - Student cannot chat with student ✓
  - Admin can chat with everyone ✓
  - Instructor can chat with instructor ✓
  - User not in org raises error ✓

- **Role Resolution**

  - Get user role in organization ✓
  - Return None for non-members ✓

- **Chatable Users**
  - Students see only instructors/admins ✓
  - Instructors see everyone ✓
  - Admins see everyone ✓
  - Empty list for non-members ✓

### Conversation Service Tests (`test_conversation_service.py`)

- **Conversation Creation**

  - Create new conversation ✓
  - Get existing conversation instead of duplicate ✓
  - Bidirectional uniqueness (A→B same as B→A) ✓
  - Other participant reflects current user ✓
  - Unauthorized users cannot create conversation ✓
  - Nonexistent target user raises error ✓

- **Conversation Retrieval**

  - Get empty conversation list ✓
  - Get user's conversations ✓
  - Pagination support ✓
  - Archived conversations excluded by default ✓
  - Archived conversations included when requested ✓

- **Conversation Archival**
  - Archive conversation successfully ✓
  - Archive nonexistent conversation raises error ✓
  - Unauthorized user cannot archive ✓

### Message Service Tests (`test_message_service.py`)

- **Message Creation**

  - Create message with UUID conversation ID ✓
  - Create message with integer conversation ID ✓
  - Normalize reply_to_message_id=0 to None ✓
  - Create reply to existing message ✓
  - Update conversation timestamp ✓
  - Create delivery receipt automatically ✓
  - Nonexistent conversation raises error ✓
  - Sender must be participant ✓
  - Receiver must be other participant ✓

- **Message Retrieval**

  - Get messages from empty conversation ✓
  - Get messages from conversation ✓
  - Pagination with before_message_id ✓
  - Exclude deleted messages ✓
  - Unauthorized user cannot get messages ✓

- **Message Editing**

  - Edit message successfully ✓
  - Create edit history ✓
  - Only sender can edit ✓
  - Nonexistent message raises error ✓

- **Message Deletion**

  - Soft delete message ✓
  - Only sender can delete ✓
  - Nonexistent message raises error ✓

- **Read Receipts**
  - Mark message as read ✓
  - Mark nonexistent message returns None ✓
  - Get read receipt ✓

### Critical Scenario Tests (`test_critical_scenarios.py`)

- **Complete Workflows**

  - Complete conversation lifecycle (create → message → reply → read → archive) ✓
  - Message edit and delete workflow ✓
  - Unread count accuracy ✓
  - Multiple concurrent conversations ✓
  - Conversation ordering by recent message ✓

- **Critical Error Prevention**
  - Prevent student-to-student chat ✓
  - Prevent reply_to_message_id=0 database error ✓
  - Conversation UUID format consistency ✓
  - Read receipt receiver-only logic ✓

### API Integration Tests (`test_api_integration.py`)

- Structure for endpoint testing (requires auth mocking)
- Conversation endpoints
- Message endpoints
- Read receipt endpoints

## Running Tests

### Prerequisites

Install test dependencies:

```bash
cd apps/api
uv pip install pytest pytest-asyncio pytest-cov
```

### Run All Chat Tests

```bash
# Run all chat tests
pytest src/tests/chat/ -v

# Run with coverage
pytest src/tests/chat/ --cov=src/services/chat --cov=src/routers/chat --cov-report=html

# Run specific test file
pytest src/tests/chat/test_authorization.py -v

# Run specific test class
pytest src/tests/chat/test_authorization.py::TestVerifyChatPermission -v

# Run specific test
pytest src/tests/chat/test_authorization.py::TestVerifyChatPermission::test_student_can_chat_with_instructor -v
```

### Run with Different Verbosity

```bash
# Quiet mode (only failures)
pytest src/tests/chat/ -q

# Verbose mode (detailed)
pytest src/tests/chat/ -v

# Very verbose (show all output)
pytest src/tests/chat/ -vv
```

### Run Tests in Parallel

```bash
# Install pytest-xdist
uv pip install pytest-xdist

# Run tests in parallel
pytest src/tests/chat/ -n auto
```

## Test Fixtures

All tests use the fixtures defined in `conftest.py`:

- **session**: In-memory SQLite database session
- **org**: Test organization
- **student_role**: Student role
- **instructor_role**: Instructor role
- **admin_role**: Admin role
- **student_user**: Student user in organization
- **instructor_user**: Instructor user in organization
- **admin_user**: Admin user in organization
- **student_user_two**: Second student user (for testing student-student restrictions)
- **conversation**: Test conversation between student and instructor
- **message**: Test message in conversation

## Critical Tests to Run Before Deployment

These tests verify critical business logic and must pass:

```bash
# Critical authorization tests
pytest src/tests/chat/test_authorization.py::TestVerifyChatPermission::test_student_cannot_chat_with_student -v

# Critical error prevention
pytest src/tests/chat/test_critical_scenarios.py::TestCriticalErrorScenarios -v

# Complete workflow validation
pytest src/tests/chat/test_critical_scenarios.py::TestCriticalChatFlows::test_complete_conversation_lifecycle -v

# Unread count accuracy
pytest src/tests/chat/test_critical_scenarios.py::TestCriticalChatFlows::test_unread_count_accuracy -v
```

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Chat Tests
  run: |
    cd apps/api
    pytest src/tests/chat/ --cov=src/services/chat --cov=src/routers/chat --cov-report=xml

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml
```

## Known Limitations

### API Integration Tests

The integration tests in `test_api_integration.py` require proper FastAPI dependency injection mocking. To make them fully functional:

1. Mock the `get_current_user` dependency
2. Mock the `get_db_session` dependency
3. Use a test database or in-memory SQLite

Example implementation:

```python
from fastapi.testclient import TestClient
from unittest.mock import patch

def test_with_mocked_auth(client, student_user, session):
    app.dependency_overrides[get_current_user] = lambda: student_user
    app.dependency_overrides[get_db_session] = lambda: session

    response = client.post("/api/v1/chat/conversations/?org_id=1")
    assert response.status_code == 200

    app.dependency_overrides.clear()
```

## Test Maintenance

### Adding New Tests

1. Add test fixtures to `conftest.py` if needed
2. Create test class with descriptive name
3. Use async test methods with `@pytest.mark.asyncio`
4. Follow naming convention: `test_<functionality>_<scenario>`
5. Include docstring explaining what is tested
6. Assert specific behavior, not just "no error"

### Best Practices

- **Isolation**: Each test should be independent
- **Clarity**: Test names should describe what they test
- **Coverage**: Test both success and failure cases
- **Edge Cases**: Test boundary conditions
- **Performance**: Keep tests fast (use in-memory database)
- **Assertions**: Be specific about what you're asserting

## Troubleshooting

### Import Errors

```bash
# Ensure src is in Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)/apps/api/src"
```

### Database Errors

Tests use in-memory SQLite. If you see database errors:

- Check that all models are imported in conftest.py
- Verify SQLModel.metadata.create_all() is called
- Ensure each test gets a fresh session

### Async Warnings

If you see "coroutine was never awaited" warnings:

- Ensure test methods have `@pytest.mark.asyncio` decorator
- Use `await` for all async service calls

## Performance

Current test suite metrics:

- **Total Tests**: 60+
- **Execution Time**: ~2-5 seconds (in-memory database)
- **Coverage**: Services and business logic

## Future Enhancements

- [ ] WebSocket testing with websockets library
- [ ] Load testing for concurrent message handling
- [ ] Mock email notification testing
- [ ] File attachment upload/download testing
- [ ] Typing indicator state testing
- [ ] Admin endpoint authorization testing
- [ ] Full API integration tests with auth mocking
- [ ] Performance benchmarking tests
