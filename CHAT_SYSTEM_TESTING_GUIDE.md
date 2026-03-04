# Chat System Testing Guide

Complete step-by-step guide to test all chat system features in LearnHouse.

## Prerequisites

### 1. Database Migration

Apply the chat system database schema:

```bash
cd apps/api
alembic upgrade head
```

**Expected Output:**

```
INFO  [alembic.runtime.migration] Running upgrade -> e8f9a0b1c2d3, add_chat_system
```

**Verify Migration:**

```bash
alembic current
```

Should show: `e8f9a0b1c2d3 (head)`

### 2. Security Configuration (CRITICAL)

Before testing WebSockets, configure Logfire to scrub tokens from logs.

Edit `apps/api/app.py` and add to `logfire.configure()`:

```python
import logfire

logfire.configure(
    token="your-logfire-token",
    scrubbing_patterns=['token', 'password', 'authorization', 'jwt'],
    scrubbing_callback=lambda key, value: '***REDACTED***'
)
```

### 3. Optional Dependencies

For full functionality, install:

```bash
# For file attachments (S3 integration)
pip install boto3

# For image thumbnails
pip install Pillow

# For scheduled email notifications
pip install apscheduler

# For Redis-based WebSocket scaling (optional)
pip install redis
```

### 4. Environment Variables

Ensure these are configured in `apps/api/config/config.yaml` or environment:

```yaml
aws_config:
  aws_access_key_id: "YOUR_AWS_ACCESS_KEY"
  aws_secret_access_key: "YOUR_AWS_SECRET_KEY"
  aws_region: "us-east-1"
  aws_bucket_name: "learnhouse-chat-attachments"

# Optional: Redis for WebSocket scaling
redis_url: "redis://localhost:6379"
```

### 5. Start the API Server

```bash
cd apps/api
python app.py
```

API should be running at: `http://localhost:8000`

---

## Test Data Setup

### Required Test Data

You need the following data to test the chat system:

1. **Organization** (existing org in database)

   - Org ID: Note this for all requests
   - Org Slug: Used in URLs

2. **Users** (at least 2 users in the same org)
   - **User A (Student)**: JWT token, user_id
   - **User B (Instructor)**: JWT token, user_id
   - Both must be members of the same organization
   - Must have appropriate roles (Student, Instructor, or Admin)

### How to Get Test Tokens

#### Option 1: Login via API

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student1@example.com",
    "password": "password123"
  }'
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "student1",
    "email": "student1@example.com"
  }
}
```

Save the `access_token` for subsequent requests.

#### Option 2: Use Existing Sessions

If you have a running web app, extract the JWT from browser cookies or local storage.

### Create Test Users (if needed)

```bash
curl -X POST http://localhost:8000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "username": "testuser1",
    "email": "testuser1@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User One"
  }'
```

---

## Testing Scenarios

### Test 1: Get Chatable Users

**Purpose:** Verify role-based permission system and see who you can chat with.

**Endpoint:** `GET /api/v1/chat/conversations/chatable-users`

**Request:**

```bash
curl -X GET "http://localhost:8000/api/v1/chat/conversations/chatable-users?org_id=1" \
  -H "Authorization: Bearer USER_A_TOKEN"
```

**Expected Response (Student):**

```json
[
  {
    "id": 5,
    "username": "instructor1",
    "email": "instructor1@example.com",
    "first_name": "John",
    "last_name": "Instructor",
    "role": "instructor"
  },
  {
    "id": 6,
    "username": "instructor2",
    "email": "instructor2@example.com",
    "first_name": "Jane",
    "last_name": "Teacher",
    "role": "instructor"
  }
]
```

**Expected Response (Instructor):**

```json
[
  {
    "id": 1,
    "username": "student1",
    "role": "student"
  },
  {
    "id": 2,
    "username": "student2",
    "role": "student"
  },
  {
    "id": 3,
    "username": "admin1",
    "role": "admin"
  }
]
```

**Verification:**

- ✅ Students see only instructors
- ✅ Instructors see students + admins
- ✅ Admins see admins + instructors
- ❌ Students CANNOT see other students

---

### Test 2: Create/Get Conversation

**Purpose:** Start a conversation between two users.

**Endpoint:** `POST /api/v1/chat/conversations/`

**Request (User A creates conversation with User B):**

```bash
curl -X POST http://localhost:8000/api/v1/chat/conversations/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -d '{
    "participant_two_id": 5,
    "org_id": 1
  }'
```

**Expected Response:**

```json
{
  "conversation_uuid": "conv_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "participant_one_id": 1,
  "participant_two_id": 5,
  "org_id": 1,
  "last_message": null,
  "last_message_at": null,
  "is_archived": false,
  "created_at": "2026-03-03T10:30:00.000Z",
  "updated_at": "2026-03-03T10:30:00.000Z"
}
```

**Save:** `conversation_uuid` for next tests.

**Verification:**

- ✅ Status code: 201 (Created) for new conversation
- ✅ Status code: 200 (OK) if conversation already exists
- ✅ Participant order normalized (lower user_id first)
- ❌ Should fail if trying to chat with unauthorized user (e.g., student → student)

**Test Authorization Failure:**

```bash
# Student trying to chat with another student (should fail)
curl -X POST http://localhost:8000/api/v1/chat/conversations/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -d '{
    "participant_two_id": 2,
    "org_id": 1
  }'
```

**Expected:** `403 Forbidden` with error message.

---

### Test 3: List Conversations

**Purpose:** Get all conversations for current user.

**Endpoint:** `GET /api/v1/chat/conversations/`

**Request:**

```bash
curl -X GET "http://localhost:8000/api/v1/chat/conversations/?org_id=1&limit=20&offset=0" \
  -H "Authorization: Bearer USER_A_TOKEN"
```

**Expected Response:**

```json
[
  {
    "conversation_uuid": "conv_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "other_participant": {
      "id": 5,
      "username": "instructor1",
      "first_name": "John",
      "last_name": "Instructor"
    },
    "last_message": {
      "message_uuid": "msg_xyz123",
      "content": "Hello, how can I help?",
      "created_at": "2026-03-03T10:35:00.000Z"
    },
    "unread_count": 1,
    "is_archived": false,
    "last_message_at": "2026-03-03T10:35:00.000Z"
  }
]
```

**Verification:**

- ✅ Returns conversations ordered by `last_message_at` (newest first)
- ✅ Includes unread message count
- ✅ Shows other participant info (not current user)
- ✅ Pagination works (limit/offset)

---

### Test 4: Send Message

**Purpose:** Send a text message in a conversation.

**Endpoint:** `POST /api/v1/chat/messages/`

**Request:**

```bash
curl -X POST http://localhost:8000/api/v1/chat/messages/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -d '{
    "conversation_id": 1,
    "receiver_id": 5,
    "content": "Hello! I have a question about the assignment.",
    "message_type": "text"
  }'
```

**Note:** Use the numeric `conversation_id` (not UUID). Get this from conversation creation response or by querying messages.

**Alternative - Get conversation_id from UUID:**

```bash
# Query database or use conversation list to find numeric ID
```

**Expected Response:**

```json
{
  "message_uuid": "msg_b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "conversation_id": 1,
  "sender_id": 1,
  "receiver_id": 5,
  "content": "Hello! I have a question about the assignment.",
  "message_type": "text",
  "is_edited": false,
  "is_deleted": false,
  "created_at": "2026-03-03T10:40:00.000Z",
  "edited_at": null,
  "reply_to_message_id": null
}
```

**Save:** `message_uuid` for next tests.

**Verification:**

- ✅ Message created with unique UUID
- ✅ Timestamp is current UTC time
- ✅ WebSocket notification sent to receiver (if connected)
- ✅ Delivery receipt created automatically
- ✅ Conversation `last_message_at` updated
- ✅ Notification scheduled for 24 hours (check logs)
- ✅ Audit log created (check database)

**Check Delivery Receipt:**

```sql
SELECT * FROM message_read_receipt WHERE message_id = <message_id>;
-- Should have delivered_at timestamp, read_at should be NULL
```

---

### Test 5: Get Conversation Messages

**Purpose:** Retrieve message history.

**Endpoint:** `GET /api/v1/chat/messages/conversation/{conversation_uuid}`

**Request:**

```bash
curl -X GET "http://localhost:8000/api/v1/chat/messages/conversation/conv_a1b2c3d4-e5f6-7890-abcd-ef1234567890?limit=50&org_id=1" \
  -H "Authorization: Bearer USER_A_TOKEN"
```

**Expected Response:**

```json
[
  {
    "message_uuid": "msg_b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "sender_id": 1,
    "receiver_id": 5,
    "content": "Hello! I have a question about the assignment.",
    "message_type": "text",
    "is_edited": false,
    "is_deleted": false,
    "created_at": "2026-03-03T10:40:00.000Z",
    "edited_at": null,
    "attachments": [],
    "read_receipt": {
      "delivered_at": "2026-03-03T10:40:00.000Z",
      "read_at": null
    }
  }
]
```

**Verification:**

- ✅ Messages ordered by created_at (oldest first)
- ✅ Includes attachments and read receipts
- ✅ Pagination works with `before_message_id`
- ✅ Shows deleted messages as "[deleted]" (if any)

---

### Test 6: Mark Message as Read

**Purpose:** Create read receipt when user reads a message.

**Endpoint:** `POST /api/v1/chat/messages/{message_uuid}/read`

**Request (User B marks User A's message as read):**

```bash
curl -X POST "http://localhost:8000/api/v1/chat/messages/msg_b2c3d4e5-f6a7-8901-bcde-f12345678901/read" \
  -H "Authorization: Bearer USER_B_TOKEN"
```

**Expected Response:**

```json
{
  "message": "Message marked as read",
  "read_at": "2026-03-03T10:45:00.000Z"
}
```

**Verification:**

- ✅ `read_at` timestamp added to receipt
- ✅ Scheduled email notification cancelled (check logs)
- ✅ WebSocket notification sent to sender (if connected)

**Check Database:**

```sql
SELECT * FROM message_read_receipt WHERE message_id = <message_id>;
-- Now should have both delivered_at AND read_at
```

---

### Test 7: Edit Message

**Purpose:** Edit an existing message (creates edit history).

**Endpoint:** `PATCH /api/v1/chat/messages/{message_uuid}`

**Request:**

```bash
curl -X PATCH "http://localhost:8000/api/v1/chat/messages/msg_b2c3d4e5-f6a7-8901-bcde-f12345678901" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -d '{
    "content": "Hello! I have a question about the assignment. Can we meet tomorrow?"
  }'
```

**Expected Response:**

```json
{
  "message_uuid": "msg_b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "content": "Hello! I have a question about the assignment. Can we meet tomorrow?",
  "is_edited": true,
  "edited_at": "2026-03-03T10:50:00.000Z"
}
```

**Verification:**

- ✅ Message content updated
- ✅ `is_edited` flag set to true
- ✅ `edited_at` timestamp set
- ✅ Edit history record created

**Check Edit History:**

```sql
SELECT * FROM message_edit_history WHERE message_id = <message_id>;
-- Should show original content with timestamp
```

---

### Test 8: Delete Message

**Purpose:** Soft-delete a message.

**Endpoint:** `DELETE /api/v1/chat/messages/{message_uuid}`

**Request:**

```bash
curl -X DELETE "http://localhost:8000/api/v1/chat/messages/msg_b2c3d4e5-f6a7-8901-bcde-f12345678901?org_id=1" \
  -H "Authorization: Bearer USER_A_TOKEN"
```

**Expected Response:**

```json
{
  "message": "Message deleted successfully"
}
```

**Verification:**

- ✅ Message not actually deleted (soft delete)
- ✅ `is_deleted` flag set to true
- ✅ Content replaced with "[deleted]" in API responses
- ✅ Message still appears in conversation history

**Check Database:**

```sql
SELECT content, is_deleted FROM message WHERE message_uuid = 'msg_b2c3d4e5...';
-- Original content preserved, is_deleted = true
```

---

### Test 9: Archive Conversation

**Purpose:** Archive a conversation (soft archive).

**Endpoint:** `PATCH /api/v1/chat/conversations/{conversation_uuid}/archive`

**Request:**

```bash
curl -X PATCH "http://localhost:8000/api/v1/chat/conversations/conv_a1b2c3d4-e5f6-7890-abcd-ef1234567890/archive?org_id=1" \
  -H "Authorization: Bearer USER_A_TOKEN"
```

**Expected Response:**

```json
{
  "message": "Conversation archived",
  "conversation_uuid": "conv_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "is_archived": true,
  "archived_at": "2026-03-03T11:00:00.000Z"
}
```

**Verification:**

- ✅ Conversation marked as archived
- ✅ Still appears in database (not deleted)
- ✅ Can be unarchived by calling endpoint again

---

### Test 10: Upload File Attachment

**Purpose:** Upload a file to a message (requires boto3 + AWS config).

**Endpoint:** `POST /api/v1/chat/messages/{message_uuid}/attachments`

**Request:**

```bash
curl -X POST "http://localhost:8000/api/v1/chat/messages/msg_xyz123/attachments" \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -F "file=@/path/to/document.pdf"
```

**Example with Image:**

```bash
curl -X POST "http://localhost:8000/api/v1/chat/messages/msg_xyz123/attachments" \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

**Expected Response:**

```json
{
  "attachment_uuid": "att_c3d4e5f6-a7b8-9012-cdef-123456789012",
  "file_name": "document.pdf",
  "file_type": "application/pdf",
  "file_size": 524288,
  "file_url": "https://s3.amazonaws.com/bucket/chat/attachments/att_c3d4e5f6.../document.pdf?...",
  "thumbnail_url": null,
  "upload_status": "completed"
}
```

**For Images:**

```json
{
  "attachment_uuid": "att_c3d4e5f6-a7b8-9012-cdef-123456789012",
  "file_name": "image.jpg",
  "file_type": "image/jpeg",
  "file_size": 245760,
  "file_url": "https://s3.amazonaws.com/.../image.jpg?...",
  "thumbnail_url": "https://s3.amazonaws.com/.../thumbnails/.../image.jpg?...",
  "upload_status": "completed"
}
```

**Verification:**

- ✅ File uploaded to S3
- ✅ Thumbnail generated for images (300x300)
- ✅ Presigned URL valid for 7 days
- ✅ File size validation (max 100MB)
- ✅ File type validation (images, videos, documents only)

**Test Invalid File:**

```bash
# Should fail - unsupported file type
curl -X POST "http://localhost:8000/api/v1/chat/messages/msg_xyz123/attachments" \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -F "file=@/path/to/script.exe"
```

**Expected:** `400 Bad Request` - File type not allowed

---

### Test 11: WebSocket Real-Time Communication

**Purpose:** Test real-time messaging, typing indicators, and read receipts.

#### Setup WebSocket Connection

**Using JavaScript (Browser Console or Node.js):**

```javascript
// Replace with actual JWT token
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const ws = new WebSocket(`ws://localhost:8000/api/v1/chat/ws?token=${token}`);

ws.onopen = () => {
  console.log("✅ WebSocket connected");
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log("📨 Received:", message);
};

ws.onerror = (error) => {
  console.error("❌ WebSocket error:", error);
};

ws.onclose = () => {
  console.log("🔌 WebSocket closed");
};
```

**Using Python:**

```python
import asyncio
import websockets
import json

async def test_websocket():
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    uri = f"ws://localhost:8000/api/v1/chat/ws?token={token}"

    async with websockets.connect(uri) as websocket:
        # Wait for connection confirmation
        response = await websocket.recv()
        print(f"Connected: {response}")

        # Send ping
        await websocket.send(json.dumps({"type": "ping"}))
        pong = await websocket.recv()
        print(f"Pong: {pong}")

        # Wait for messages
        while True:
            message = await websocket.recv()
            print(f"Received: {message}")

asyncio.run(test_websocket())
```

**Using wscat (CLI tool):**

```bash
npm install -g wscat
wscat -c "ws://localhost:8000/api/v1/chat/ws?token=YOUR_JWT_TOKEN"
```

#### Test Scenarios

**A. Connection and Ping:**

```javascript
// Send ping
ws.send(JSON.stringify({ type: "ping" }));

// Expected response:
// {"type": "pong"}
```

**B. Typing Indicators:**

```javascript
// User A starts typing
ws.send(
  JSON.stringify({
    type: "typing_start",
    data: {
      conversation_uuid: "conv_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    },
  }),
);

// User B should receive:
// {
//   "type": "user_typing",
//   "data": {
//     "conversation_uuid": "conv_a1b2c3d4...",
//     "user_id": 1,
//     "is_typing": true
//   }
// }

// User A stops typing
ws.send(
  JSON.stringify({
    type: "typing_stop",
    data: {
      conversation_uuid: "conv_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    },
  }),
);

// User B should receive:
// {
//   "type": "user_typing",
//   "data": {
//     "conversation_uuid": "conv_a1b2c3d4...",
//     "user_id": 1,
//     "is_typing": false
//   }
// }
```

**C. Mark Read via WebSocket:**

```javascript
ws.send(
  JSON.stringify({
    type: "mark_read",
    data: {
      message_uuid: "msg_b2c3d4e5-f6a7-8901-bcde-f12345678901",
    },
  }),
);

// Sender should receive:
// {
//   "type": "message_read",
//   "data": {
//     "message_uuid": "msg_b2c3d4e5...",
//     "read_by": 5,
//     "read_at": "2026-03-03T11:15:00.000Z"
//   }
// }
```

**D. Receive New Message Notification:**

```javascript
// When another user sends a message via REST API,
// connected WebSocket should receive:
// {
//   "type": "new_message",
//   "data": {
//     "message_uuid": "msg_xyz123",
//     "conversation_id": 1,
//     "sender_id": 5,
//     "content": "Here's the answer to your question.",
//     "created_at": "2026-03-03T11:20:00.000Z"
//   }
// }
```

**Verification:**

- ✅ WebSocket accepts JWT token from query parameter
- ✅ Connection confirmed with {"type": "connected"} message
- ✅ Ping/pong works (heartbeat)
- ✅ Typing indicators broadcast to other participant
- ✅ Typing status persisted to database
- ✅ New messages trigger WebSocket notifications
- ✅ Read receipts sent to message sender

---

### Test 12: Admin Endpoints (Admin Only)

**Purpose:** Test admin monitoring and export features.

**Prerequisites:** Login as user with Admin or Maintainer role.

#### A. Get All Org Conversations

```bash
curl -X GET "http://localhost:8000/api/v1/chat/admin/conversations?org_id=1&limit=50" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response:**

```json
[
  {
    "conversation_uuid": "conv_a1b2c3d4...",
    "participant_one": {
      "id": 1,
      "username": "student1",
      "name": "Test User"
    },
    "participant_two": {
      "id": 5,
      "username": "instructor1",
      "name": "John Instructor"
    },
    "message_count": 15,
    "last_message_at": "2026-03-03T11:20:00.000Z",
    "is_archived": false,
    "created_at": "2026-03-03T10:30:00.000Z"
  }
]
```

#### B. Get Chat Statistics

```bash
curl -X GET "http://localhost:8000/api/v1/chat/admin/stats?org_id=1" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response:**

```json
{
  "total_conversations": 25,
  "active_conversations": 20,
  "archived_conversations": 5,
  "total_messages": 487,
  "messages_today": 42
}
```

#### C. Export Conversation (JSON)

```bash
curl -X GET "http://localhost:8000/api/v1/chat/admin/conversations/conv_a1b2c3d4.../export?org_id=1&format=json" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response:**

```json
{
  "conversation_uuid": "conv_a1b2c3d4...",
  "exported_at": "2026-03-03T12:00:00.000Z",
  "exported_by": "admin_user",
  "participants": [
    { "id": 1, "username": "student1", "name": "Test User" },
    { "id": 5, "username": "instructor1", "name": "John Instructor" }
  ],
  "messages": [
    {
      "message_uuid": "msg_xyz...",
      "sender_id": 1,
      "content": "Hello!",
      "message_type": "text",
      "is_edited": false,
      "is_deleted": false,
      "created_at": "2026-03-03T10:40:00.000Z",
      "edited_at": null
    }
  ]
}
```

#### D. Export Conversation (CSV)

```bash
curl -X GET "http://localhost:8000/api/v1/chat/admin/conversations/conv_a1b2c3d4.../export?org_id=1&format=csv" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -o conversation_export.csv
```

**Expected:** CSV file downloaded with message history.

#### E. Get Audit Logs

```bash
curl -X GET "http://localhost:8000/api/v1/chat/admin/audit-logs?org_id=1&action=message_sent&limit=100" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response:**

```json
[
  {
    "log_uuid": "audit_xyz123...",
    "user_id": 1,
    "action": "message_sent",
    "resource_type": "message",
    "resource_id": "msg_b2c3d4e5...",
    "metadata": {
      "conversation_id": "conv_a1b2c3d4...",
      "message_type": "text"
    },
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2026-03-03T10:40:00.000Z"
  }
]
```

**Verification:**

- ✅ Only admins/maintainers can access these endpoints
- ✅ Regular users get 403 Forbidden
- ✅ Export includes deleted messages (for compliance)
- ✅ Audit logs capture all actions

**Test Authorization:**

```bash
# Try as student - should fail
curl -X GET "http://localhost:8000/api/v1/chat/admin/stats?org_id=1" \
  -H "Authorization: Bearer STUDENT_TOKEN"

# Expected: 403 Forbidden
```

---

### Test 13: Notification System

**Purpose:** Test multi-channel notifications.

#### A. In-App Notifications

1. User A sends message to User B
2. If User B has WebSocket connected, they should immediately receive:

```json
{
  "type": "notification",
  "data": {
    "notification_uuid": "notif_xyz...",
    "type": "new_message",
    "message": "You have a new message",
    "conversation_id": 1,
    "sender_id": 1,
    "created_at": "2026-03-03T12:30:00.000Z"
  }
}
```

#### B. Scheduled Email Notifications

1. User A sends message to User B
2. User B does NOT read message
3. After 24 hours, User B should receive email

**Check Scheduled Jobs:**

```python
# In Python shell or check logs
from apscheduler.schedulers.asyncio import AsyncIOScheduler
scheduler = AsyncIOScheduler()
print(scheduler.get_jobs())
# Should show scheduled email job
```

**Check Database:**

```sql
SELECT * FROM chat_notification WHERE message_id = <message_id>;
-- delivery_status should show: {"email": "scheduled"}
```

#### C. Email Cancellation

1. User A sends message to User B
2. Email scheduled for 24 hours later
3. User B reads message within 24 hours
4. Email should be cancelled

**Verify:**

```sql
SELECT * FROM chat_notification WHERE message_id = <message_id>;
-- delivery_status should show: {"email": "cancelled_read"}
```

---

## Performance Testing

### Test N+1 Query Prevention

**Purpose:** Verify conversation list doesn't have N+1 query issues.

**Enable SQL Logging:**

```python
# In app.py, enable SQL echo
engine = create_engine(DATABASE_URL, echo=True)
```

**Request:**

```bash
curl -X GET "http://localhost:8000/api/v1/chat/conversations/?org_id=1&limit=50" \
  -H "Authorization: Bearer USER_TOKEN"
```

**Expected Query Count:**
For 50 conversations, should execute approximately **5 queries**:

1. SELECT conversations for user
2. SELECT last messages (subquery)
3. SELECT other participants (batch)
4. SELECT unread counts (subquery)
5. SELECT participant states (if needed)

**BAD (N+1):** 101 queries for 50 conversations
**GOOD (Optimized):** 5 queries for 50 conversations

---

## Error Scenarios to Test

### 1. Unauthorized Chat Attempt

```bash
# Student tries to chat with another student
curl -X POST http://localhost:8000/api/v1/chat/conversations/ \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -d '{"participant_two_id": 2, "org_id": 1}'

# Expected: 403 Forbidden
# Message: "Not authorized to chat with this user"
```

### 2. Invalid Conversation Access

```bash
# User tries to access conversation they're not part of
curl -X GET "http://localhost:8000/api/v1/chat/messages/conversation/conv_someone_else?org_id=1" \
  -H "Authorization: Bearer USER_TOKEN"

# Expected: 403 Forbidden
```

### 3. Message to Wrong Receiver

```bash
# Try to send message to user not in conversation
curl -X POST http://localhost:8000/api/v1/chat/messages/ \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{
    "conversation_id": 1,
    "receiver_id": 999,
    "content": "Test"
  }'

# Expected: 400 Bad Request
# Message: "Invalid receiver for this conversation"
```

### 4. Edit Others' Messages

```bash
# Try to edit message sent by another user
curl -X PATCH "http://localhost:8000/api/v1/chat/messages/msg_from_other_user" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"content": "Hacked!"}'

# Expected: 403 Forbidden
```

### 5. File Too Large

```bash
# Try to upload file > 100MB
curl -X POST "http://localhost:8000/api/v1/chat/messages/msg_xyz/attachments" \
  -H "Authorization: Bearer USER_TOKEN" \
  -F "file=@large_file.zip"

# Expected: 413 Request Entity Too Large
```

### 6. Invalid File Type

```bash
curl -X POST "http://localhost:8000/api/v1/chat/messages/msg_xyz/attachments" \
  -H "Authorization: Bearer USER_TOKEN" \
  -F "file=@virus.exe"

# Expected: 400 Bad Request
# Message: "File type application/x-msdownload is not allowed"
```

### 7. Invalid JWT Token

```bash
curl -X GET "http://localhost:8000/api/v1/chat/conversations/?org_id=1" \
  -H "Authorization: Bearer INVALID_TOKEN"

# Expected: 401 Unauthorized
```

---

## Database Verification Queries

### Check All Tables Created

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '%chat%' OR table_name LIKE '%conversation%' OR table_name LIKE '%message%';

-- Expected tables:
-- conversation
-- conversation_participant_state
-- message
-- message_edit_history
-- message_attachment
-- message_read_receipt
-- chat_notification
-- chat_audit_log
```

### Check Conversation Data

```sql
SELECT
  c.conversation_uuid,
  u1.username as participant_one,
  u2.username as participant_two,
  c.last_message_at,
  c.is_archived
FROM conversation c
JOIN "user" u1 ON c.participant_one_id = u1.id
JOIN "user" u2 ON c.participant_two_id = u2.id
WHERE c.org_id = 1;
```

### Check Message Data

```sql
SELECT
  m.message_uuid,
  u1.username as sender,
  u2.username as receiver,
  m.content,
  m.is_edited,
  m.is_deleted,
  m.created_at
FROM message m
JOIN "user" u1 ON m.sender_id = u1.id
JOIN "user" u2 ON m.receiver_id = u2.id
ORDER BY m.created_at DESC
LIMIT 20;
```

### Check Read Receipts

```sql
SELECT
  m.message_uuid,
  mrr.delivered_at,
  mrr.read_at,
  EXTRACT(EPOCH FROM (mrr.read_at - mrr.delivered_at))/60 as minutes_to_read
FROM message_read_receipt mrr
JOIN message m ON mrr.message_id = m.id
WHERE mrr.read_at IS NOT NULL;
```

### Check Audit Logs

```sql
SELECT
  cal.action,
  cal.resource_type,
  cal.resource_id,
  u.username,
  cal.created_at,
  cal.metadata
FROM chat_audit_log cal
LEFT JOIN "user" u ON cal.user_id = u.id
WHERE cal.org_id = 1
ORDER BY cal.created_at DESC
LIMIT 50;
```

### Check Typing Indicators

```sql
SELECT
  u.username,
  cps.is_typing,
  cps.typing_updated_at,
  EXTRACT(EPOCH FROM (NOW() - cps.typing_updated_at)) as seconds_since_update
FROM conversation_participant_state cps
JOIN "user" u ON cps.user_id = u.id
WHERE cps.is_typing = true;
```

---

## Integration Testing Checklist

### Pre-Testing

- [ ] Database migration applied successfully
- [ ] Logfire security configured (token scrubbing)
- [ ] API server running on port 8000
- [ ] Test users created in database
- [ ] Test users assigned to organization
- [ ] Test users have appropriate roles
- [ ] JWT tokens obtained for test users

### Core Features

- [ ] Get chatable users (role-based permissions)
- [ ] Create conversation
- [ ] List conversations with pagination
- [ ] Send text message
- [ ] Receive message via WebSocket
- [ ] Get message history
- [ ] Mark message as read
- [ ] Edit message
- [ ] Delete message
- [ ] Archive conversation

### Advanced Features

- [ ] Upload file attachment (image)
- [ ] Upload file attachment (document)
- [ ] Thumbnail generation for images
- [ ] Typing indicator (start/stop)
- [ ] Typing status persistence
- [ ] In-app notifications via WebSocket
- [ ] Email notification scheduled (check logs)
- [ ] Email notification cancelled on read

### Admin Features

- [ ] List all org conversations (admin only)
- [ ] Get chat statistics
- [ ] Export conversation (JSON)
- [ ] Export conversation (CSV)
- [ ] View audit logs
- [ ] Non-admin denied access (403)

### Security & Authorization

- [ ] Student cannot chat with student (403)
- [ ] User cannot access others' conversations (403)
- [ ] User cannot edit others' messages (403)
- [ ] Invalid JWT rejected (401)
- [ ] Message to wrong receiver rejected (400)

### Performance

- [ ] Conversation list uses ~5 queries (not N+1)
- [ ] Message history loads quickly
- [ ] WebSocket connections stable

### Error Handling

- [ ] File too large rejected (413)
- [ ] Invalid file type rejected (400)
- [ ] Missing required fields handled (422)
- [ ] Invalid UUID handled (404)

---

## Troubleshooting

### WebSocket Connection Fails

**Problem:** `WebSocket connection failed: Error 1008`

**Solutions:**

1. Check JWT token is valid (not expired)
2. Verify Logfire configured properly
3. Check token in URL: `?token=YOUR_TOKEN`
4. Test with simple ping/pong first

### File Upload Fails

**Problem:** `503 Service Unavailable - boto3 not installed`

**Solution:**

```bash
pip install boto3 Pillow
```

### Email Notifications Not Scheduled

**Problem:** Email notification status shows "scheduler_unavailable"

**Solution:**

```bash
pip install apscheduler
# Restart API server
```

### Typing Indicators Not Working

**Problem:** Typing status not broadcasting

**Check:**

1. WebSocket connected for both users?
2. Correct conversation_uuid sent?
3. Check database `conversation_participant_state` table

### Database Query Slow

**Problem:** Conversation list takes > 2 seconds

**Solution:** Verify indexes created:

```sql
-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename IN ('conversation', 'message');

-- Should have indexes on:
-- conversation: org_id, participant_one_id, participant_two_id, last_message_at
-- message: conversation_id, created_at, sender_id, receiver_id
```

---

## Success Criteria

✅ **All tests pass with expected responses**
✅ **No unauthorized access allowed**
✅ **Real-time features work via WebSocket**
✅ **Database properly stores all data**
✅ **Performance optimized (no N+1 queries)**
✅ **Admin features restricted properly**
✅ **File uploads work (if configured)**
✅ **Notifications send correctly**

---

## Next Steps

After completing testing:

1. **Frontend Implementation** - Build React components for chat UI
2. **Push Notifications** - Add mobile push notifications
3. **Search** - Add message search functionality
4. **Group Chat** - Extend to support multi-participant conversations
5. **Voice/Video** - Integrate WebRTC for calls

---

## Support

For issues or questions:

- Check `apps/api/logs/` for detailed error logs
- Review `CHAT_QUICK_START.md` for configuration help
- Check database with SQL queries above
- Enable SQL echo to debug query issues
