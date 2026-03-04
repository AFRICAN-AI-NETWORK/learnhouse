# Chat System Frontend Implementation Guide

## Document Overview

This document provides a comprehensive guide for frontend developers to implement the chat functionality in the LearnHouse application. It covers all available API endpoints, data structures, authentication requirements, real-time WebSocket integration, and business logic rules that must be implemented on the frontend.

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Base Configuration](#api-base-configuration)
4. [User Roles & Chat Permissions](#user-roles--chat-permissions)
5. [REST API Endpoints](#rest-api-endpoints)
6. [WebSocket Real-Time Integration](#websocket-real-time-integration)
7. [Data Models & Structures](#data-models--structures)
8. [Feature Implementation Guidelines](#feature-implementation-guidelines)
9. [Error Handling](#error-handling)
10. [Best Practices & Performance Considerations](#best-practices--performance-considerations)
11. [Admin Features](#admin-features)

---

## System Architecture Overview

The chat system is built on a hybrid architecture combining REST APIs for CRUD operations and WebSocket connections for real-time features.

### Key Components:

- **REST API**: Handles all data creation, retrieval, updates, and deletion operations
- **WebSocket**: Provides real-time notifications for new messages, typing indicators, and read receipts
- **Organization-Scoped**: All chat functionality operates within organization boundaries
- **Role-Based Permissions**: Chat access is controlled by user roles within organizations

### Communication Flow:

1. Frontend authenticates user and obtains JWT token
2. REST API calls perform CRUD operations on conversations and messages
3. WebSocket connection receives real-time updates for active sessions
4. All operations are scoped to the user's current organization context

---

## Authentication & Authorization

### JWT Token Requirements

All API requests require a valid JWT token obtained through the authentication system.

**REST API Authentication:**

- Include JWT token in the `Authorization` header
- Format: `Authorization: Bearer <your_jwt_token>`

**WebSocket Authentication:**

- JWT token must be passed as a query parameter during connection
- Format: `ws://api-url/api/v1/chat/ws?token=<your_jwt_token>`
- This is necessary because WebSocket handshakes don't support custom headers

### Token Management:

- Store token securely (recommended: httpOnly cookies or secure storage)
- Refresh tokens before expiration to maintain uninterrupted service
- Handle token expiration gracefully with re-authentication flow
- WebSocket connections will disconnect on token expiration and need reconnection

---

## API Base Configuration

### Base URL Structure:

- REST API Base: `/api/v1`
- Chat Conversations: `/api/v1/chat/conversations`
- Chat Messages: `/api/v1/chat/messages`
- Chat Admin: `/api/v1/chat/admin`
- WebSocket: `ws://[host]/api/v1/chat/ws`

### Environment Configuration:

Frontend should configure these based on deployment environment:

- Development: `http://localhost:8009` (or configured port)
- Production: Use production API domain

### Required Headers:

All REST API requests must include:

- `Authorization: Bearer <jwt_token>`
- `Content-Type: application/json` (for POST/PATCH requests)

### Query Parameters:

Most chat endpoints require:

- `org_id`: The organization ID the user is currently operating within
- This must be included as a query parameter in most requests

---

## User Roles & Chat Permissions

### Role Hierarchy and Chat Rules

The chat system enforces strict role-based permissions. Understanding these rules is critical for implementing the UI correctly.

#### Role Definitions:

1. **Student/Learner/User** (synonymous, lowest privilege)
2. **Instructor** (can teach and mentor)
3. **Admin** (organization administrator)
4. **Maintainer** (technical/system maintainer)

#### Chat Permission Matrix:

**Students/Learners/Users CAN chat with:**

- Instructors only
- Cannot chat with other students
- Cannot chat with admins or maintainers directly

**Instructors CAN chat with:**

- Students/Learners/Users
- Other Instructors
- Admins
- Maintainers
- Essentially everyone in the organization

**Admins CAN chat with:**

- All user types (Students, Instructors, other Admins, Maintainers)
- Full chat access within organization

**Maintainers CAN chat with:**

- All user types (Students, Instructors, Admins, other Maintainers)
- Full chat access within organization

#### Implementation Implications:

**For User Listing UI:**

- When showing "Start New Chat" or "Contact" buttons, filter the user list based on current user's role
- Students should only see Instructors as available contacts
- Instructors and above see all organization members

**For Conversation Creation:**

- Validate permissions before attempting to create conversations
- Display appropriate error messages if user attempts unauthorized contact
- The API will reject unauthorized conversation attempts with 403 status

**UI Element Visibility:**

- Show/hide UI elements based on user's role
- Example: Students shouldn't see "Chat with Student" buttons on other student profiles

---

## REST API Endpoints

### 1. Conversations Management

#### 1.1 Create or Get Conversation

**Endpoint:** `POST /api/v1/chat/conversations/`

**Purpose:** Creates a new conversation with a target user, or returns existing conversation if one already exists between the two users.

**Query Parameters:**

- `org_id` (required): Organization ID

**Request Body:**

```
{
  "participant_two_id": 7
}
```

**Field Descriptions:**

- `participant_two_id`: The user ID of the person you want to chat with. The current authenticated user is automatically set as participant_one.

**Response Structure:**

```
{
  "id": 1,
  "conversation_uuid": "conv_550e8400-e29b-41d4-a716-446655440000",
  "org_id": 2,
  "participant_one_id": 6,
  "participant_two_id": 7,
  "last_message_at": "2026-03-04T10:30:00Z",
  "is_archived": false,
  "created_at": "2026-03-01T08:00:00Z",
  "updated_at": "2026-03-04T10:30:00Z",
  "unread_count": 3,
  "other_participant": {
    "id": 7,
    "user_uuid": "usr_660e8400-e29b-41d4-a716-446655440001",
    "username": "instructor.test",
    "first_name": "John",
    "last_name": "Instructor",
    "avatar_image": "https://example.com/avatar.jpg"
  }
}
```

**Response Field Descriptions:**

- `conversation_uuid`: Unique identifier for the conversation (used in most other endpoints)
- `unread_count`: Number of unread messages in this conversation for the current user
- `other_participant`: Full user details of the other person in the conversation
- `last_message_at`: Timestamp of most recent message (null if no messages yet)

**Error Responses:**

- `403 Forbidden`: Current user doesn't have permission to chat with target user
- `404 Not Found`: Target user doesn't exist or isn't in the organization
- `422 Unprocessable Entity`: Invalid request data

#### 1.2 Get User Conversations

**Endpoint:** `GET /api/v1/chat/conversations/`

**Purpose:** Retrieve list of all conversations for the current user.

**Query Parameters:**

- `org_id` (required): Organization ID
- `include_archived` (optional, default: false): Whether to include archived conversations
- `limit` (optional, default: 50, max: 100): Number of conversations to return
- `offset` (optional, default: 0): Pagination offset

**Response Structure:**

```
[
  {
    "id": 1,
    "conversation_uuid": "conv_550e8400-e29b-41d4-a716-446655440000",
    "org_id": 2,
    "participant_one_id": 6,
    "participant_two_id": 7,
    "last_message_at": "2026-03-04T10:30:00Z",
    "is_archived": false,
    "created_at": "2026-03-01T08:00:00Z",
    "updated_at": "2026-03-04T10:30:00Z",
    "unread_count": 3,
    "other_participant": {
      "id": 7,
      "user_uuid": "usr_660e8400-e29b-41d4-a716-446655440001",
      "username": "instructor.test",
      "first_name": "John",
      "last_name": "Instructor",
      "avatar_image": "https://example.com/avatar.jpg"
    },
    "last_message": {
      "message_uuid": "msg_770e8400-e29b-41d4-a716-446655440002",
      "content": "Hello, how can I help you?",
      "sender_id": 7,
      "created_at": "2026-03-04T10:30:00Z",
      "is_deleted": false
    }
  }
]
```

**Implementation Notes:**

- List is ordered by `last_message_at` descending (most recent first)
- Use pagination for large conversation lists
- `last_message` may be null if no messages have been sent yet
- Unread count only includes messages sent TO the current user

#### 1.3 Archive Conversation

**Endpoint:** `PATCH /api/v1/chat/conversations/{conversation_uuid}/archive`

**Purpose:** Archive a conversation (hides it from default view but preserves data).

**Path Parameters:**

- `conversation_uuid`: The UUID of the conversation to archive

**Response:** Returns the updated conversation object with `is_archived: true`

**Implementation Notes:**

- Archived conversations can be retrieved with `include_archived=true` parameter
- Archiving doesn't delete messages or prevent new messages
- Only the user who archives sees it as archived (not shared state)

#### 1.4 Get Chatable Users

**Endpoint:** `GET /api/v1/chat/conversations/chatable-users`

**Purpose:** Get list of users the current user can initiate chats with (respects role permissions).

**Query Parameters:**

- `org_id` (required): Organization ID
- `search` (optional): Search query to filter by username, first name, or last name

**Response Structure:**

```
[
  {
    "id": 7,
    "user_uuid": "usr_660e8400-e29b-41d4-a716-446655440001",
    "username": "instructor.test",
    "first_name": "John",
    "last_name": "Instructor",
    "avatar_image": "https://example.com/avatar.jpg"
  },
  {
    "id": 8,
    "user_uuid": "usr_770e8400-e29b-41d4-a716-446655440002",
    "username": "admin.user",
    "first_name": "Jane",
    "last_name": "Admin",
    "avatar_image": "https://example.com/avatar2.jpg"
  }
]
```

**Implementation Notes:**

- This endpoint automatically filters users based on chat permission rules
- Students will only see instructors
- Instructors and above will see all organization members
- Use this to populate "New Chat" or "Contact" selection UIs
- Search is case-insensitive and matches against username, first name, and last name

---

### 2. Messages Management

#### 2.1 Send Message

**Endpoint:** `POST /api/v1/chat/messages/`

**Purpose:** Send a new message in a conversation.

**Query Parameters:**

- `org_id` (required): Organization ID

**Request Body:**

```
{
  "conversation_id": "conv_550e8400-e29b-41d4-a716-446655440000",
  "receiver_id": 7,
  "content": "Hello! I have a question about the assignment.",
  "message_type": "text",
  "reply_to_message_id": null
}
```

**Field Descriptions:**

- `conversation_id`: The conversation UUID (accepts either UUID string or integer ID)
- `receiver_id`: User ID of the recipient
- `content`: The message text content
- `message_type`: Type of message (default: "text", also supports: "file", "image", "video", "document")
- `reply_to_message_id`: Optional ID of message being replied to (for threaded conversations, use null or omit for regular messages)

**Important Notes:**

- Set `reply_to_message_id` to `null` or omit it entirely for regular messages
- Never send `reply_to_message_id: 0` as it will cause a database error
- For replies, use the actual message ID you're replying to

**Response Structure:**

```
{
  "id": 15,
  "message_uuid": "msg_880e8400-e29b-41d4-a716-446655440003",
  "conversation_id": "conv_550e8400-e29b-41d4-a716-446655440000",
  "sender_id": 6,
  "receiver_id": 7,
  "content": "Hello! I have a question about the assignment.",
  "message_type": "text",
  "is_edited": false,
  "is_deleted": false,
  "created_at": "2026-03-04T11:45:00Z",
  "updated_at": "2026-03-04T11:45:00Z",
  "attachments": [],
  "read_receipt": null
}
```

**Response Field Descriptions:**

- `conversation_id`: Returns the conversation UUID (string format)
- `read_receipt`: Will be null initially, populated when receiver reads the message
- `attachments`: Array of file attachments (empty for text-only messages)

**Real-Time Behavior:**

- After successful API response, a WebSocket notification is automatically sent to the receiver
- Receiver will get a real-time `new_message` event if they're online

#### 2.2 Get Conversation Messages

**Endpoint:** `GET /api/v1/chat/messages/conversation/{conversation_uuid}`

**Purpose:** Retrieve messages from a conversation with pagination support.

**Path Parameters:**

- `conversation_uuid`: The UUID of the conversation

**Query Parameters:**

- `before_message_id` (optional): Get messages before this message ID (for pagination)
- `limit` (optional, default: 50, max: 100): Number of messages to return

**Response Structure:**

```
[
  {
    "id": 15,
    "message_uuid": "msg_880e8400-e29b-41d4-a716-446655440003",
    "conversation_id": "conv_550e8400-e29b-41d4-a716-446655440000",
    "sender_id": 6,
    "receiver_id": 7,
    "content": "Hello! I have a question about the assignment.",
    "message_type": "text",
    "is_edited": false,
    "is_deleted": false,
    "created_at": "2026-03-04T11:45:00Z",
    "updated_at": "2026-03-04T11:45:00Z",
    "attachments": [],
    "read_receipt": {
      "delivered_at": "2026-03-04T11:45:01Z",
      "read_at": "2026-03-04T11:50:00Z"
    }
  }
]
```

**Pagination Implementation:**

- Messages are returned in descending order (newest first)
- To load older messages, use the ID of the oldest message you have as `before_message_id`
- Example: If you have messages 20-30, use `before_message_id=20` to get messages 10-19

**Read Receipt Information:**

- `delivered_at`: When message was delivered (automatically set when message created)
- `read_at`: When receiver explicitly marked as read (null until read)

**Implementation Pattern:**

1. Initial load: GET without `before_message_id` to get latest messages
2. Scroll to load more: GET with `before_message_id` set to oldest message ID you have
3. Display messages in chronological order (reverse the array since API returns newest first)

#### 2.3 Edit Message

**Endpoint:** `PATCH /api/v1/chat/messages/{message_uuid}`

**Purpose:** Edit the content of a previously sent message.

**Path Parameters:**

- `message_uuid`: UUID of the message to edit

**Request Body:**

```
{
  "content": "Updated message content"
}
```

**Response:** Returns updated message object with `is_edited: true` and `edited_at` timestamp

**Business Rules:**

- Only the sender can edit their own messages
- Edited messages are marked with `is_edited: true`
- Original content is preserved in edit history (not exposed via API, stored for audit)
- Receiver gets real-time notification of the edit via WebSocket

**UI Recommendations:**

- Show "edited" indicator on edited messages
- Consider showing edit timestamp on hover or in message details

#### 2.4 Delete Message

**Endpoint:** `DELETE /api/v1/chat/messages/{message_uuid}`

**Purpose:** Delete a message (soft delete - marks as deleted but preserves in database).

**Path Parameters:**

- `message_uuid`: UUID of the message to delete

**Response:**

```
{
  "message": "Message deleted successfully"
}
```

**Business Rules:**

- Only the sender can delete their own messages
- Deletion is soft - message is marked `is_deleted: true` but remains in database
- Deleted messages still appear in conversation but with content hidden
- Receiver gets real-time notification via WebSocket

**UI Recommendations:**

- Show "This message was deleted" placeholder for deleted messages
- Maintain message positioning in conversation to preserve context
- Don't allow actions (reply, react) on deleted messages

#### 2.5 Mark Message as Read

**Endpoint:** `POST /api/v1/chat/messages/{message_uuid}/read`

**Purpose:** Mark a message as read by the current user (creates read receipt).

**Path Parameters:**

- `message_uuid`: UUID of the message to mark as read

**Response:**

```
{
  "message": "Message marked as read",
  "read_at": "2026-03-04T12:00:00Z"
}
```

**Critical Implementation Details:**

- This endpoint should be called by the RECEIVER, not the sender
- When you display a message that was sent TO the current user, mark it as read
- Do NOT call this for messages sent BY the current user
- The sender will be notified via WebSocket when their message is read

**Implementation Strategy:**

- Call when message enters viewport or conversation is opened
- Can batch multiple message reads in a short time window
- Trigger on conversation open for all unread messages
- Consider marking as read after short delay (e.g., 1-2 seconds visible)

#### 2.6 Upload Message Attachment

**Endpoint:** `POST /api/v1/chat/messages/{message_uuid}/attachments`

**Purpose:** Upload a file attachment to an existing message.

**Path Parameters:**

- `message_uuid`: UUID of the message to attach file to

**Request Body:** Multipart form data with file

**Response:**

```
{
  "attachment_uuid": "att_990e8400-e29b-41d4-a716-446655440004",
  "file_name": "document.pdf",
  "file_type": "application/pdf",
  "file_size": 1048576,
  "file_url": "https://storage.example.com/attachments/document.pdf",
  "thumbnail_url": "https://storage.example.com/thumbnails/document.jpg",
  "upload_status": "completed"
}
```

**File Constraints:**

- Maximum file size: 100MB
- All file types supported
- Thumbnails automatically generated for images and videos

**Implementation Workflow:**

1. Create message first (POST /messages/)
2. Upload attachment(s) to that message using message_uuid
3. Multiple attachments can be added to one message with separate calls

---

## WebSocket Real-Time Integration

### Connection Setup

#### Establishing Connection

**WebSocket URL:** `ws://[host]/api/v1/chat/ws?token=<jwt_token>`

**Connection Flow:**

1. Obtain JWT token from authentication
2. Construct WebSocket URL with token as query parameter
3. Initiate WebSocket connection
4. Server validates token and establishes connection
5. Server sends confirmation message on successful connection
6. Connection remains open for real-time bidirectional communication

**Connection Confirmation Message:**

```
{
  "type": "connection_established",
  "data": {
    "user_id": 6,
    "message": "WebSocket connection established"
  }
}
```

#### Connection Management

- Maintain single WebSocket connection per user session
- Reconnect automatically on disconnection
- Implement exponential backoff for reconnection attempts
- Close and recreate connection on JWT token refresh

---

### Client-to-Server Messages

Messages sent from client to server follow this structure:

```
{
  "type": "message_type",
  "data": { ... }
}
```

#### 1. Ping (Heartbeat)

**Purpose:** Keep connection alive and verify server responsiveness

**Send:**

```
{
  "type": "ping"
}
```

**Receive:**

```
{
  "type": "pong"
}
```

**Implementation:**

- Send ping every 30-60 seconds during idle periods
- Expect pong response within 5 seconds
- Reconnect if pong not received

#### 2. Typing Start

**Purpose:** Notify other participant that user is typing

**Send:**

```
{
  "type": "typing_start",
  "data": {
    "conversation_uuid": "conv_550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Behavior:**

- Server notifies other participant via their WebSocket connection
- Typing status is persisted temporarily in database
- Other participant receives `user_typing` event

**Implementation Guidelines:**

- Send when user starts typing (first keystroke)
- Don't send repeatedly for every keystroke
- Implement debouncing (wait for 1-2 second pause before sending)

#### 3. Typing Stop

**Purpose:** Notify other participant that user stopped typing

**Send:**

```
{
  "type": "typing_stop",
  "data": {
    "conversation_uuid": "conv_550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Implementation Guidelines:**

- Send when user stops typing for 3-5 seconds
- Send when user sends message (typing naturally ends)
- Send when user navigates away from conversation

#### 4. Mark Read (via WebSocket)

**Purpose:** Mark message as read via WebSocket (alternative to REST API)

**Send:**

```
{
  "type": "mark_read",
  "data": {
    "message_uuid": "msg_880e8400-e29b-41d4-a716-446655440003"
  }
}
```

**Behavior:**

- Message is marked as read in database
- Sender receives `message_read` notification via their WebSocket

**Note:** Can use either REST API or WebSocket for marking messages as read. WebSocket is preferred for real-time applications.

---

### Server-to-Client Messages

All messages from server have this structure:

```
{
  "type": "event_type",
  "data": { ... }
}
```

#### 1. New Message

**Triggered when:** Someone sends you a message via REST API

**Receive:**

```
{
  "type": "new_message",
  "data": {
    "message_uuid": "msg_880e8400-e29b-41d4-a716-446655440003",
    "conversation_id": "conv_550e8400-e29b-41d4-a716-446655440000",
    "sender_id": 7,
    "content": "Hello! How can I help you?",
    "created_at": "2026-03-04T11:45:00Z"
  }
}
```

**Frontend Action:**

- Add message to conversation UI immediately
- Play notification sound
- Show desktop notification if user not focused on app
- Update conversation list (move to top, update last message)
- Increment unread count if conversation not currently open

#### 2. User Typing

**Triggered when:** Other participant starts or stops typing

**Receive:**

```
{
  "type": "user_typing",
  "data": {
    "conversation_uuid": "conv_550e8400-e29b-41d4-a716-446655440000",
    "user_id": 7,
    "is_typing": true
  }
}
```

**Frontend Action:**

- If `is_typing: true`, show typing indicator in conversation UI
- If `is_typing: false`, hide typing indicator
- Only show for currently open conversation
- Dismiss typing indicator after 5-10 seconds even without explicit stop signal

**UI Recommendations:**

- Animated ellipsis "..." indicator
- Show user's name with typing indicator in group contexts
- Position at bottom of message list

#### 3. Message Read

**Triggered when:** Recipient marks your message as read

**Receive:**

```
{
  "type": "message_read",
  "data": {
    "message_uuid": "msg_880e8400-e29b-41d4-a716-446655440003",
    "read_by": 6,
    "read_at": "2026-03-04T12:00:00Z"
  }
}
```

**Frontend Action:**

- Update message UI to show "read" status (e.g., double checkmark)
- Update message object in state with read_at timestamp
- Can show read timestamp on hover or in message details

#### 4. Message Edited

**Triggered when:** Someone edits a message in your conversation

**Receive:**

```
{
  "type": "message_edited",
  "data": {
    "message_uuid": "msg_880e8400-e29b-41d4-a716-446655440003",
    "content": "Updated message content",
    "is_edited": true,
    "edited_at": "2026-03-04T12:05:00Z"
  }
}
```

**Frontend Action:**

- Update message content in UI
- Add "edited" indicator
- Optionally show edit timestamp

#### 5. Message Deleted

**Triggered when:** Someone deletes a message

**Receive:**

```
{
  "type": "message_deleted",
  "data": {
    "message_uuid": "msg_880e8400-e29b-41d4-a716-446655440003"
  }
}
```

**Frontend Action:**

- Replace message content with "This message was deleted"
- Maintain message position in conversation
- Disable interactions (reply, react, etc.)

#### 6. Notification

**Triggered when:** System sends in-app notification

**Receive:**

```
{
  "type": "notification",
  "data": {
    "notification_uuid": "notif_aa0e8400-e29b-41d4-a716-446655440005",
    "type": "new_message",
    "message": "You have a new message",
    "conversation_id": "conv_550e8400-e29b-41d4-a716-446655440000",
    "sender_id": 7,
    "created_at": "2026-03-04T12:00:00Z"
  }
}
```

**Frontend Action:**

- Show in-app notification banner or toast
- Update notification badge count
- Play notification sound if enabled
- Can be used for system-wide notifications beyond just new messages

---

### WebSocket Error Handling

**Connection Failures:**

- Implement automatic reconnection with exponential backoff
- Start with 1 second delay, double on each failure, cap at 30 seconds
- Show "Connecting..." or "Reconnecting..." indicator to user

**Authentication Errors:**

- If connection rejected due to invalid token, refresh token and retry
- If token refresh fails, redirect to login

**Network Issues:**

- Detect offline status and show appropriate UI indicator
- Queue messages sent while offline
- Send queued messages after reconnection

---

## Data Models & Structures

### Conversation Object

```
{
  id: integer,
  conversation_uuid: string (unique identifier),
  org_id: integer,
  participant_one_id: integer,
  participant_two_id: integer,
  last_message_at: timestamp (nullable),
  is_archived: boolean,
  created_at: timestamp,
  updated_at: timestamp,
  unread_count: integer (computed),
  other_participant: {
    id: integer,
    user_uuid: string,
    username: string,
    first_name: string (nullable),
    last_name: string (nullable),
    avatar_image: string (nullable, URL)
  },
  last_message: {
    message_uuid: string,
    content: string,
    sender_id: integer,
    created_at: timestamp,
    is_deleted: boolean
  } (nullable)
}
```

### Message Object

```
{
  id: integer,
  message_uuid: string (unique identifier),
  conversation_id: string (UUID of conversation),
  sender_id: integer,
  receiver_id: integer,
  content: string,
  message_type: string (text/file/image/video/document),
  is_edited: boolean,
  is_deleted: boolean,
  created_at: timestamp,
  updated_at: timestamp,
  attachments: [
    {
      attachment_uuid: string,
      file_name: string,
      file_type: string,
      file_size: integer,
      file_url: string (URL),
      thumbnail_url: string (URL, nullable)
    }
  ],
  read_receipt: {
    delivered_at: timestamp,
    read_at: timestamp (nullable)
  } (nullable)
}
```

### User Object (in chat context)

```
{
  id: integer,
  user_uuid: string,
  username: string,
  first_name: string (nullable),
  last_name: string (nullable),
  avatar_image: string (nullable, URL)
}
```

### Attachment Object

```
{
  attachment_uuid: string,
  file_name: string,
  file_type: string (MIME type),
  file_size: integer (bytes),
  file_url: string (URL for download),
  thumbnail_url: string (URL, nullable),
  upload_status: string (completed/pending/failed)
}
```

---

## Feature Implementation Guidelines

### 1. Conversation List View

**Data Loading:**

- Load initial conversations on page load with `GET /chat/conversations/`
- Use `limit=50` for first load, implement infinite scroll for more
- Sort by `last_message_at` descending (API returns in correct order)

**Display Elements:**

- Other participant's name and avatar (from `other_participant` object)
- Last message preview (from `last_message.content`)
- Last message timestamp (from `last_message.created_at`)
- Unread count badge (from `unread_count`)
- Visual indicator for unread conversations (bold text, colored badge)

**Real-Time Updates:**

- Listen for `new_message` WebSocket events
- Update relevant conversation's last message and move to top of list
- Increment unread count if message received for non-active conversation
- Play notification sound for new messages

**Search and Filter:**

- Implement client-side search by other participant's name
- Add filter toggle for archived conversations
- Consider adding filter by unread status

**Actions:**

- Click conversation to open message view
- Swipe or context menu for archive action
- Long-press for additional options (mute, delete, etc.)

### 2. Message View (Conversation Detail)

**Initial Load:**

- GET messages with `GET /chat/messages/conversation/{uuid}`
- Load latest 50 messages initially
- Display in chronological order (oldest at top)
- Auto-scroll to bottom after load

**Pagination:**

- Detect scroll to top
- Load previous messages using `before_message_id` parameter
- Prepend to message list
- Maintain scroll position after load

**Message Display:**

- Align sender's messages to right, receiver's to left
- Show timestamp on hover or beneath message
- Display sender avatar for receiver's messages
- Group consecutive messages from same sender
- Show "edited" indicator for edited messages
- Replace deleted message content with placeholder

**Message Status Indicators:**

- Sending: Show "sending" indicator (grey checkmark)
- Sent: Show "sent" indicator (single checkmark)
- Delivered: Show "delivered" indicator (double checkmark)
- Read: Show "read" indicator (blue double checkmark or custom indicator)

**Marking as Read:**

- When conversation opens, mark all unread messages as read
- Call `POST /chat/messages/{uuid}/read` for each unread message
- Or use WebSocket `mark_read` event
- Consider batching or debouncing read receipt calls

**Real-Time Updates:**

- Listen for `new_message` events and append to message list
- Listen for `message_edited` events and update message content
- Listen for `message_deleted` events and update message display
- Listen for `message_read` events to update read status
- Auto-scroll to bottom on new message if user is near bottom

### 3. Message Composition

**Input Area:**

- Multi-line text input with auto-resize
- Character count indicator
- Send button (disabled until content entered)
- Attachment button for file uploads

**Sending Messages:**

- On send button click or Enter key (Shift+Enter for new line)
- POST to `/chat/messages/` endpoint
- Show optimistic UI (display message immediately)
- Update with server response (add message UUID, timestamp)
- Handle errors (show failure indicator, retry option)

**Reply Functionality:**

- Show reply context above input when replying
- Include `reply_to_message_id` in message creation
- Display reply reference in message (quoted message snippet)

**Typing Indicators:**

- Detect user typing (keypress in input)
- Send `typing_start` WebSocket event after 500ms of typing
- Send `typing_stop` event after 3 seconds of no typing
- Cancel typing indicator when message sent
- Show typing indicator for other user based on `user_typing` events

### 4. File Attachments

**Upload Flow:**

1. User selects file from file picker
2. Create message first (text can be empty or caption)
3. Upload file using `POST /chat/messages/{uuid}/attachments`
4. Show upload progress indicator
5. Display attached file in message after upload complete

**File Display:**

- Images: Show inline thumbnail, click to open full size
- Videos: Show video player with thumbnail
- Documents: Show file icon with name and size
- Download link for all file types

**File Constraints:**

- Maximum size: 100MB
- Show error if file too large
- Supported types: All file types accepted

### 5. User Search and New Conversation

**User Selection:**

- GET chatable users with `/chat/conversations/chatable-users`
- Display filtered list based on current user's role
- Show user avatar, name, and role badge
- Implement search filter using `search` query parameter

**Conversation Creation:**

- On user selection, POST to `/chat/conversations/`
- Check if conversation already exists (API handles this)
- Navigate to conversation message view
- Allow immediate message sending

### 6. Archive Functionality

**Archiving:**

- PATCH to `/chat/conversations/{uuid}/archive`
- Remove from default conversation list
- Show success confirmation

**Viewing Archived:**

- Toggle to show archived conversations
- GET conversations with `include_archived=true`
- Visual indicator for archived status
- Option to unarchive (implementation needed on backend)

### 7. Notification System

**In-App Notifications:**

- Show notification toast for new messages when app open but conversation not active
- Display notification badge with unread count
- Update badge on new messages and when conversations viewed

**Desktop Notifications:**

- Request notification permission on app load
- Show desktop notification for new messages when app not focused
- Include sender name and message preview
- Click notification to open relevant conversation

**Email Notifications:**

- Handled by backend automatically
- User receives email if message unread for 24 hours
- No frontend implementation required

### 8. Online Status (Optional Enhancement)

**Implementation:**

- WebSocket connection indicates user is online
- Backend tracks active connections
- Frontend can query or receive online status updates
- Show green dot indicator for online users
- Show "last seen" timestamp for offline users

---

## Error Handling

### HTTP Error Responses

**400 Bad Request:**

- Indicates malformed request data
- Check request body structure and data types
- Display user-friendly error message

**401 Unauthorized:**

- JWT token invalid or expired
- Attempt token refresh
- Redirect to login if refresh fails

**403 Forbidden:**

- User doesn't have permission for action
- Most common: Attempting to chat with user outside permission scope
- Show appropriate error message
- Hide UI elements that trigger forbidden actions

**404 Not Found:**

- Resource doesn't exist (conversation, message, user)
- Can occur if resource deleted by other user
- Remove from UI and show notification

**422 Unprocessable Entity:**

- Request data fails validation
- Check field values and constraints
- Display validation error messages to user

**500 Internal Server Error:**

- Server-side error
- Show generic error message
- Provide retry option
- Log error details for debugging

### WebSocket Error Handling

**Connection Errors:**

- Implement exponential backoff reconnection
- Show connection status indicator
- Queue operations during disconnection

**Message Send Failures:**

- Store failed messages locally
- Show failure indicator in UI
- Provide manual retry option

### Network Connectivity

**Offline Detection:**

- Monitor browser online/offline events
- Disable send functionality when offline
- Show offline indicator banner
- Queue messages for sending when back online

**Slow Network:**

- Show loading indicators for API calls
- Implement request timeouts
- Provide feedback for long-running operations

---

## Best Practices & Performance Considerations

### State Management

**Local State:**

- Store active conversation messages in memory
- Cache conversation list
- Track WebSocket connection status
- Maintain unread counts locally

**State Updates:**

- Update optimistically for better UX (show sent message immediately)
- Reconcile with server response
- Handle conflicts (message sent while offline, then connection restored)

**State Persistence:**

- Consider caching conversations in localStorage/IndexedDB
- Persist draft messages
- Store last read positions

### Performance Optimization

**Message Loading:**

- Implement virtual scrolling for long conversations
- Load messages on demand (pagination)
- Lazy load images and attachments
- Use message ID as React key (if using React)

**Conversation List:**

- Render only visible conversations
- Implement infinite scroll
- Debounce search input

**WebSocket:**

- Single connection per session
- Batch multiple operations when possible
- Throttle typing indicator events

**API Calls:**

- Debounce search requests
- Cache user lists
- Batch read receipt updates

### Security Considerations

**Token Security:**

- Store JWT securely (httpOnly cookies preferred)
- Never expose token in URLs except WebSocket handshake
- Refresh tokens before expiration
- Clear tokens on logout

**Input Validation:**

- Sanitize message content before display (prevent XSS)
- Validate file types and sizes on upload
- Escape user-generated content

**Data Privacy:**

- Don't log message content
- Respect user privacy in error reports
- Follow data retention policies

### User Experience

**Loading States:**

- Show skeleton screens while loading
- Display loading indicators for operations
- Provide immediate feedback for user actions

**Error Messages:**

- Use clear, non-technical language
- Provide actionable solutions
- Don't expose system details

**Accessibility:**

- Keyboard navigation support
- Screen reader friendly
- ARIA labels for interactive elements
- Focus management for modals and navigation

**Mobile Considerations:**

- Touch-friendly tap targets
- Swipe gestures for actions
- Responsive layout
- Optimize for smaller screens

---

## Admin Features

Admin endpoints are available for users with Admin or Maintainer roles within an organization.

### Admin Conversation List

**Endpoint:** `GET /api/v1/chat/admin/conversations`

**Purpose:** View all conversations within an organization (oversight).

**Query Parameters:**

- `org_id` (required): Organization ID
- `limit` (optional, default: 50, max: 100)
- `offset` (optional, default: 0)

**Authorization:** Requires Admin or Maintainer role in specified organization

**Response:** Returns all conversations in organization with participant details and message counts

**Use Cases:**

- Moderation and oversight
- Investigating reported conversations
- Analytics and usage monitoring

### Admin Message Search

**Endpoint:** `GET /api/v1/chat/admin/messages`

**Purpose:** Search messages across all conversations in organization.

**Query Parameters:**

- `org_id` (required)
- `search_query` (optional): Search term for message content
- `user_id` (optional): Filter by specific user
- `conversation_uuid` (optional): Filter by conversation
- `start_date` (optional): Filter messages after date
- `end_date` (optional): Filter messages before date
- `limit` (optional, default: 50, max: 100)
- `offset` (optional)

**Authorization:** Requires Admin or Maintainer role

**Use Cases:**

- Content moderation
- Searching for specific content across organization
- Investigation and compliance

### Audit Logs

**Endpoint:** `GET /api/v1/chat/admin/audit-logs`

**Purpose:** View audit trail of chat actions within organization.

**Query Parameters:**

- `org_id` (required)
- `user_id` (optional): Filter by user
- `action` (optional): Filter by action type
- `resource_type` (optional): Filter by resource type
- `start_date` (optional)
- `end_date` (optional)
- `limit` (optional, default: 50, max: 100)
- `offset` (optional)

**Authorization:** Requires Admin or Maintainer role

**Tracked Actions:**

- message_sent
- message_edited
- message_deleted
- conversation_created
- conversation_archived
- attachment_uploaded

**Use Cases:**

- Compliance and auditing
- Security investigations
- User activity monitoring

### Admin Implementation Notes

**Permission Checks:**

- Verify user role before showing admin features
- Request fails with 403 if user lacks admin privileges
- Check permissions on frontend before displaying UI elements

**UI Considerations:**

- Separate admin section or panel
- Clear indication of admin-only features
- Audit log viewer with filtering and export capabilities

**Privacy and Compliance:**

- Log admin access to private conversations
- Display warnings before viewing user conversations
- Follow data protection regulations
- Implement proper access controls

---

## Implementation Checklist

### Phase 1: Basic Messaging

- [ ] Authentication setup with JWT token management
- [ ] Create conversation endpoint integration
- [ ] Get conversations list with pagination
- [ ] Display conversation list UI
- [ ] Send message endpoint integration
- [ ] Get messages endpoint with pagination
- [ ] Display message view UI
- [ ] Basic error handling

### Phase 2: Real-Time Features

- [ ] WebSocket connection setup
- [ ] Handle new message events
- [ ] Implement typing indicators (send and receive)
- [ ] Real-time message updates (edit, delete)
- [ ] Connection status indicators
- [ ] Reconnection logic

### Phase 3: Enhanced Features

- [ ] Read receipts (mark as read, display status)
- [ ] File attachment upload
- [ ] File attachment display and download
- [ ] Message editing
- [ ] Message deletion
- [ ] Search and filter conversations

### Phase 4: Advanced Features

- [ ] User search for new conversations
- [ ] Archive conversations
- [ ] Notification system (in-app and desktop)
- [ ] Draft message persistence
- [ ] Virtual scrolling for performance
- [ ] Offline support and message queueing

### Phase 5: Admin Features (if applicable)

- [ ] Admin conversation overview
- [ ] Message search across organization
- [ ] Audit log viewer
- [ ] Content moderation tools

---

## Conclusion

This document provides comprehensive guidance for implementing the chat system frontend. The backend provides a robust REST API for data operations and WebSocket integration for real-time features. Follow the role-based permission rules carefully, implement proper error handling, and prioritize user experience with optimistic updates and clear feedback.

For questions or clarifications, consult the backend API source code or contact the backend development team.

**Document Version:** 1.0  
**Last Updated:** March 4, 2026  
**Backend API Version:** v1
