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

## Avatar

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/avatar` | Upload avatar (multipart/form-data) |
| GET | `/users/avatar` | Get avatar URLs |
| DELETE | `/users/avatar` | Remove avatar |

### Upload Avatar
```
POST /users/avatar
Content-Type: multipart/form-data

Body: avatar (file) - JPEG, PNG, or WebP, max 5MB, min 64x64px

→ {
  "message": "Avatar uploaded successfully",
  "avatarUrl": "https://pub-xxx.r2.dev/avatars/user-123/128.webp?v=1732768800000",
  "version": 1732768800000,
  "sizes": {
    "32": "https://pub-xxx.r2.dev/avatars/user-123/32.webp?v=1732768800000",
    "64": "https://pub-xxx.r2.dev/avatars/user-123/64.webp?v=1732768800000",
    "128": "https://pub-xxx.r2.dev/avatars/user-123/128.webp?v=1732768800000",
    "256": "https://pub-xxx.r2.dev/avatars/user-123/256.webp?v=1732768800000",
    "512": "https://pub-xxx.r2.dev/avatars/user-123/512.webp?v=1732768800000"
  }
}
```

### Get Avatar URLs
```json
GET /users/avatar
→ { "hasAvatar": true, "urls": { "32": "...", "64": "...", "128": "...", "256": "...", "512": "..." } }
→ { "hasAvatar": false, "urls": null }  // No avatar
```

### Delete Avatar
```json
DELETE /users/avatar
→ { "message": "Avatar deleted successfully" }
```

## Preferences & Matching

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/questions` | Get matching questions |
| POST | `/answers` | Submit answers |
| PUT | `/answers` | Update answers |
| GET | `/answers` | Get user's answers |
| GET | `/answers/check-exists` | Check if user has submitted answers |
| GET | `/preferences` | Get preferences |
| PUT | `/preferences` | Update preferences |
| POST | `/queue/join` | Join match queue |

### Submit Answers
```json
POST /answers
{
  "question_1": 1,        // 1 or 2
  "question_2": 2,        // 1, 2, or 3
  "question_3": [1, 2],   // [1], [2], or [1,2]
  "question_4": [1, 2, 3] // [1], [2], [3], or [1,2,3]
}
→ {
  "message": "Your answer created",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "question_1": 1,
    "question_2": 2,
    "question_3": [1, 2],
    "question_4": [1, 2, 3],
    "created_at": "2025-11-27T14:07:25.713Z",
    "updated_at": "2025-11-27T14:07:25.713Z"
  }
}
```

### Get My Answers
```json
GET /answers
→ {
  "message": "Your answer fetched",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "question_1": 1,
    "question_2": 3,
    "question_3": [1, 2],
    "question_4": [1, 2, 3],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### Check Answer Exists
```json
GET /answers/check-exists
→ { "exists": true }  // or { "exists": false }
```

### Join Queue
```json
POST /queue/join
{
  "location": { "lat": 10.77, "lng": 106.69, "placeId": "place-123" },
  "timeWindow": {  // optional - omit for "match now"
    "start": "2025-11-14T14:00:00Z",
    "end": "2025-11-14T16:00:00Z"
  }
}
→ { "success": true, "queueEntry": { "queueId": "...", "position": 2 } }
```

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
