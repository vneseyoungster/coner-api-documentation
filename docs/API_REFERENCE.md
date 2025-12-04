# API Reference

**Base URL**: `http://localhost:8080`
**Auth**: `Authorization: Bearer <jwt_token>`

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Create account |
| POST | `/auth/signin` | Login, get JWT |
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout-all` | Invalidate all sessions |
| POST | `/auth/bootstrap` | Create profile (auto) |

### Sign Up
```json
POST /auth/signup
{ "email": "user@example.com", "password": "min8chars", "displayName": "Name" }
→ { "userId": "uuid" }
```

### Sign In
```json
POST /auth/signin
{ "email": "user@example.com", "password": "password" }
→ { "access_token": "...", "refresh_token": "...", "expires_in": 3600 }
```

## User Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/profile` | Get profile |
| PUT | `/users/profile-first` | First-time setup (all fields required) |
| PATCH | `/users/profile` | Update profile (partial) |

### First-Time Setup
```json
PUT /users/profile-first
{
  "full_name": "Alice Smith",
  "dob": "1995-03-15",
  "sex": "female",           // male | female | other
  "phone_number": "1234567890",
  "address": "123 Main St",
  "school": "Stanford",
  "major": "CS"
}
```

**Note**: `full_name` and `sex` are locked after first setup.

## Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/questions` | Get matching questions |
| POST | `/answers` | Submit answers |
| PUT | `/answers` | Update answers |
| GET | `/answers` | Get user's answers |
| GET | `/preferences` | Get preferences |
| PUT | `/preferences` | Update preferences |

### Submit Answers
```json
POST /answers
{
  "dating_style": "loud",        // loud | quiet | comfort
  "match_preference": "same field", // same field | different field | either
  "user_field": "Engineering",
  "purpose": "studying"          // studying | working | casual dating
}
```

## Queue & Matching

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/queue/join` | Join matching queue |
| POST | `/queue/leave` | Leave queue |
| GET | `/queue/status` | Get queue status |
| POST | `/queue/sessions/:sessionId/proposal/respond` | Accept/reject match |

### Join Queue
```json
POST /queue/join
{
  "location": { "lat": 49.4521, "lng": 11.0767, "placeId": "optional" },
  "timeWindow": {  // Optional - omit for "match now"
    "start": "2025-11-28T14:00:00Z",
    "end": "2025-11-28T16:00:00Z"
  }
}
→ 201 { "success": true, "queueEntry": { "queueId": "uuid", "position": 2, "status": "queued" } }

// Errors
→ 409 "Already in an active queue"
→ 429 "Daily match limit exceeded (max: 3)"
```

### Queue Status
```json
GET /queue/status
→ 200 {
  "inQueue": true,
  "status": "queued",        // queued | broadening | proposed
  "queueId": "uuid",
  "position": 2,
  "hasSession": false,
  "activeSessionId": null
}

// When matched
→ 200 {
  "status": "proposed",
  "hasSession": true,
  "activeSessionId": "uuid",
  "sessionExpiresAt": "2025-11-28T10:03:00Z"  // 3min to respond
}
```

### Respond to Match
```json
POST /queue/sessions/:sessionId/proposal/respond
{ "decision": "yes" }  // or "no"

→ 200 { 
  "success": true, 
  "newState": "confirm",           // confirm | pending | declined
  "message": "Match confirmed!"
}

// Errors
→ 404 SESSION_NOT_FOUND
→ 409 ALREADY_RESPONDED
→ 400 INVALID_SESSION_STATE
```

**Queue Lifecycle/ Status**: `queued` (0-7min) → `broadening` (7-30min) → `proposed` (when matched) → `matched`/`expired`

**Response States**:
```json
// Immediate response after first user responds
{ "newState": "pending", "message": "Waiting for the other user." }

// Both accept
{ "newState": "confirm", "message": "Match confirmed! You can now start chatting." }

// Match declined (someone said NO)
{ "newState": "declined", "message": "Match declined. You've been returned to the queue." }

// Late response (session already declined by other user)
{ "newState": "declined", "message": "Match declined. Your response has been recorded." }
```

**Detailed Response Scenarios**:

| Scenario | User A | User B | A Queue Status | B Queue Status | Session State |
|----------|--------|--------|----------------|----------------|---------------|
| Both accept | YES | YES | `matched` | `matched` | `confirm` |
| First accepts, second rejects | YES | NO | `queued` (returned) | `cancelled` | `declined` |
| First rejects, second accepts late | NO | YES | `cancelled` | `queued` (stays) | `declined` |
| Both reject | NO | NO (late) | `cancelled` | `cancelled` | `declined` |
| One responds YES, other silent | YES | ⏱️ | `queued` (returned) | `expired` (kicked) | `expired` |
| One responds NO, other silent | NO | ⏱️ | `cancelled` | `queued` (stays) | `declined` |
| Both silent (timeout) | ⏱️ | ⏱️ | `expired` | `expired` | `expired` |

**Key Business Logic**:
- ✅ **First NO immediately declines** → Session becomes `declined`, other user can still respond late
- ✅ **Late responses allowed** → Can respond to `declined` sessions, decision is recorded
- ✅ **Only rejectors (NO) get cancelled** → Acceptors/non-responders get second chance
- ✅ **Both silent = both kicked** → Strict policy to discourage inactive users (3min timeout)
- ✅ **One silent, one responded** → Active user returns to queue, silent user expires
- ✅ **Late NO after early NO** → Both users cancelled (both rejected)

**Timeout Handling**:
- **Proposal expires** after 3 minutes (`sessionExpiresAt`)
- After timeout, cleanup job processes within ~60 seconds
- Poll `/queue/status` to detect state change back to `queued` or `expired`

## Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/conversations` | List conversations |
| GET | `/api/chat/history` | Get messages |
| GET | `/api/chat/count` | Message count |

### Get Conversations
```json
GET /api/chat/conversations?limit=20&offset=0
→ {
  "data": [{
    "connectionId": "uuid",
    "otherUser": { "id": "uuid", "displayName": "John", "avatarUrl": "..." },
    "lastMessage": { "content": "Hey!", "sentAt": "...", "isOwn": false },
    "unreadCount": 3
  }],
  "pagination": { "total": 45, "hasMore": true }
}
```

### Get History
```json
GET /api/chat/history?connectionId=uuid&limit=50&before=2025-01-20T10:00:00Z
→ { "messages": [{ "id": 1, "senderId": "uuid", "content": "Hello", "createdAt": "..." }] }
```

## Presence

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/presence?userIds=uuid1,uuid2` | Check online status |
| GET | `/api/presence/connections` | All contacts' status |

```json
GET /api/presence/connections
→ { "presence": { "user-id-1": true, "user-id-2": false } }
```
## Activities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/activities` | Get user activities list |
| PATCH | `/activities/:id/cancel` | Cancel an upcoming appointment |

### Get User Activities
Supports filtering by tabs: `ongoing` (includes active queue), `upcoming`, `completed`, `cancelled`.

```json
GET /activities?tab=ongoing
→ {
  "message": "Get activities successfully",
  "data": [
    {
      "id": "55555555-5555-4555-a555-555555555555",
      "type": "queue",
      "status": "searching",
      "status_label": "Đang tìm Buddy...",
      "created_at": "2025-12-02T15:12:37.554687+00:00",
      "partner": null,
      "location_name": "Gần đây",
      "location_address": "Đang quét...",
      "date_display": "Ngay bây giờ"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440006", 
      "type": "session",
      "status": "ongoing",
      "status_label": "Đang diễn ra",
      "created_at": "2025-12-02T15:12:37.554687+00:00",
      "partner": {
        "id": "12db0233-aee5-4eeb-9ca5-5467f11ff965",
        "display_name": "Người dùng ẩn danh",
        "avatar_url": "",
        "profession": null
      },
      "location_name": "Highlands Coffee - Vincom",
      "location_address": "789 Vincom St, City",
      "date_display": "02/12/2025 22:42"
    }
  ]
}
```

### Cancel Appointment
Only applicable for appointments with up coming status. No body required.

```json
PATCH /activities/550e8400-e29b-41d4-a716-446655440006/cancel
Body: {}
→ {
  "message": "Appointment cancelled successfully"
}
```

## Block

User blocking functionality to prevent unwanted interactions.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/block/users/:id` | Block a user |
| DELETE | `/block/users/:id` | Unblock a user |
| GET | `/block/users/:id/check` | Check if blocked by/blocking a user |
| GET | `/block/users` | Get list of blocked users |

### Block User
Block another user. Blocked users cannot interact with you.

```json
POST /block/users/550e8400-e29b-41d4-a716-446655440006
Body: { "reason": "Spam" }  // reason is optional
→ 201 {
  "success": true,
  "message": "User blocked successfully",
  "data": {
    "blocker_id": "your-user-id",
    "blocked_id": "550e8400-e29b-41d4-a716-446655440006",
    "reason": "Spam",
    "created_at": "2025-12-04T10:00:00Z"
  }
}

// Errors
→ 400 { "error": "Cannot block yourself" }
→ 409 { "error": "User already blocked" }
```

### Unblock User
Remove a block on a user.

```json
DELETE /block/users/550e8400-e29b-41d4-a716-446655440006
→ 200 {
  "success": true,
  "message": "User unblocked successfully"
}

// Errors
→ 404 { "error": "Block relationship not found" }
```

### Check Block Status
Check if there's a block relationship between you and another user.

```json
GET /block/users/550e8400-e29b-41d4-a716-446655440006/check
→ 200 {
  "success": true,
  "data": {
    "isBlocked": true,
    "blockedBy": "550e8400-e29b-41d4-a716-446655440006",
    "direction": "blocked"  // blocker | blocked | both
  }
}

// No block exists
→ 200 {
  "success": true,
  "data": {
    "isBlocked": false
  }
}
```

### Get Blocked Users
Get list of all users you have blocked.

```json
GET /block/users
→ 200 {
  "success": true,
  "data": [
    {
      "blocker_id": "your-user-id",
      "blocked_id": "550e8400-e29b-41d4-a716-446655440006",
      "reason": "Spam",
      "created_at": "2025-12-04T10:00:00Z"
    }
  ]
}
```

## Dev Endpoints

**Development only** (`NODE_ENV=development`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/dev/auth/token` | Generate test JWT |
| POST | `/dev/auth/tokens/batch` | Generate multiple tokens |
| DELETE | `/dev/auth/user/:userId` | Delete test user |

```bash
curl -X POST http://localhost:8080/dev/auth/token
→ { "data": { "access_token": "...", "user": { "id": "...", "email": "test@coner.dev" } } }
```

## Error Handling

```json
// Validation error
{ "error": "ValidationError", "details": { "email": ["Invalid email"] } }

// Auth error
{ "error": "Unauthorized: JWT token missing or invalid" }
```

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 500 | Server error |
