# User Answer API Reference

**Base URL:** `http://localhost:8080` (development)
**Authentication:** Bearer JWT tokens issued by Supabase Auth

---

## Table of Contents

1. [Overview](#overview)
2. [Data Models](#data-models)
3. [API Endpoints](#api-endpoints)
   - [Get My Answer](#get-my-answer)
   - [Create My Answer](#create-my-answer)
   - [Update My Answer](#update-my-answer)
4. [Enum Mappings](#enum-mappings)
5. [Error Handling](#error-handling)
6. [Examples](#examples)

---

## Overview

The User Answer API manages user questionnaire responses for the Coner platform. It handles dating style preferences, match preferences, user fields, and purpose selections through a clean domain-driven architecture.

### Key Features

- **Single Answer Per User**: Each user can only submit one answer (enforced at service layer)
- **Enum Mapping**: Automatic conversion between database values and frontend enums
- **Update Support**: Partial updates allowed for all fields
- **Type Safety**: Full validation using Zod schemas
- **Protected Routes**: All endpoints require JWT authentication

### Architecture

- **Service Layer**: Business logic with enum mapping and conflict detection
- **Repository Layer**: Supabase integration with error handling
- **Controller Layer**: Request validation and response formatting

---

## Data Models

### UserAnswer Entity

```typescript
interface UserAnswer {
  user_id: string;
  dating_style: DatingStyle;
  match_preference: MatchPreference;
  user_field: string;
  purpose: Purpose;
  created_at?: string;
  updated_at?: string;
}
```

### Enums

#### DatingStyle

```typescript
enum DatingStyle {
  LOUD = "loud",
  QUIET = "quiet",
  COMFORT = "comfort"
}
```

#### Purpose

```typescript
enum Purpose {
  STUDYING = "studying",
  WORKING = "working",
  CASUAL = "casual dating"
}
```

#### MatchPreference

```typescript
enum MatchPreference {
  SAME_FIELD = "same field",
  DIFFERENT_FIELD = "different field",
  EITHER = "either"
}
```

---

## API Endpoints

All user answer endpoints are prefixed with `/answers` and require authentication.

### Get My Answer

Retrieve the authenticated user's answer.

```http
GET /answers/
Authorization: Bearer <access_token>
```

**Response (200 OK)**

```json
{
  "message": "Your answer fetched",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "dating_style": "loud",
    "match_preference": "same field",
    "user_field": "Computer science",
    "purpose": "studying",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses**

- `401 Unauthorized`: Missing or invalid JWT token
- `404 Not Found`: User has not submitted an answer yet
- `500 Internal Server Error`: Failed to fetch answer

---

### Create My Answer

Submit a new answer for the authenticated user. Each user can only submit once.

```http
POST /answers
Authorization: Bearer <access_token>
```

**Request Body**

```json
{
  "dating_style": "loud",
  "match_preference": "same field",
  "user_field": "Computer science",
  "purpose": "studying"
}
```

**Validation Rules**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `dating_style` | enum | Yes | Must be one of: `loud`, `quiet`, `comfort` |
| `match_preference` | enum | Yes | Must be one of: `same field`, `different field`, `either` |
| `user_field` | string | Yes | Non-empty string |
| `purpose` | enum | Yes | Must be one of: `studying`, `working`, `casual dating` |

**Response (201 Created)**

```json
{
  "message": "Your answer created",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "dating_style": "loud",
    "match_preference": "same field",
    "user_field": "Computer science",
    "purpose": "studying",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses**

- `400 Bad Request`: Validation error (invalid enum values or missing required fields)
- `401 Unauthorized`: Missing or invalid JWT token
- `409 Conflict`: User has already submitted an answer
- `500 Internal Server Error`: Failed to create answer

---

### Update My Answer

Update the authenticated user's existing answer. Supports partial updates.

```http
PUT /answers
Authorization: Bearer <access_token>
```

**Request Body**

All fields are optional. Only provided fields will be updated.

```json
{
  "dating_style": "quiet",
  "purpose": "working"
}
```

**Validation Rules**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `dating_style` | enum | No | Must be one of: `loud`, `quiet`, `comfort` |
| `match_preference` | enum | No | Must be one of: `same field`, `different field`, `either` |
| `user_field` | string | No | Non-empty string if provided |
| `purpose` | enum | No | Must be one of: `studying`, `working`, `casual dating` |

**Response (200 OK)**

```json
{
  "message": "Your answer updated",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "dating_style": "quiet",
    "match_preference": "same field",
    "user_field": "Computer science",
    "purpose": "working",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T14:45:00.000Z"
  }
}
```

**Error Responses**

- `400 Bad Request`: Validation error (invalid enum values)
- `401 Unauthorized`: Missing or invalid JWT token
- `404 Not Found`: User has not submitted an answer yet
- `500 Internal Server Error`: Failed to update answer

---

## Enum Mappings

The API automatically converts between database values and frontend enums.

### Dating Style Mapping

| Database Value | Frontend Enum | Description |
|----------------|---------------|-------------|
| `one` | `loud` | Outgoing, social dating style |
| `two` | `quiet` | Introverted, calm dating style |
| `three` | `comfort` | Comfort-focused dating style |

### Purpose Mapping

| Database Value | Frontend Enum | Description |
|----------------|---------------|-------------|
| `one` | `studying` | Academic/study purposes |
| `two` | `working` | Professional/work purposes |
| `three` | `casual dating` | Casual/leisure purposes |

### Match Preference Mapping

| Database Value | Frontend Enum | Description |
|----------------|---------------|-------------|
| `one` | `same field` | Prefer matches in same field |
| `two` | `different field` | Prefer matches in different field |
| `one,two` | `either` | No preference (either field) |

**Note:** The mapping is bidirectional. Frontend sends enum strings, backend converts to database values. Database values are converted back to enum strings in responses.

---

## Error Handling

All endpoints follow consistent error response format:

### Validation Errors (400)

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "dating_style",
      "message": "Invalid enum value"
    }
  ]
}
```

### Authentication Errors (401)

```json
{
  "error": "Unauthorized"
}
```

### Not Found Errors (404)

```json
{
  "error": "User answer not found"
}
```

### Conflict Errors (409)

```json
{
  "error": "User already submitted an answer"
}
```

### Server Errors (500)

```json
{
  "error": "Failed to create user answer"
}
```

---

## Examples

### Complete Flow Example

#### 1. Create Answer

```bash
curl -X POST http://localhost:8080/answers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
  "exists": true / false
    }
'
```

**Response nếu người dùng đã hoàn thành**

```json
{
  "exists": true
}

```

**Response nếu người dùng đã hoàn thành**

```json
{
  "exists": true
}


```

#### 2. Check Answer

```bash
curl -X POST http://localhost:8080/answers/check-exists \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "dating_style": "loud",
    "match_preference": "same field",
    "user_field": "Computer science",
    "purpose": "studying"
  }'
```

**Response:**

```json
{
  "message": "Your answer created",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "dating_style": "loud",
    "match_preference": "same field",
    "user_field": "Computer science",
    "purpose": "studying",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

#### 3. Retrieve Answer

```bash
curl -X GET http://localhost:8080/answers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**

```json
{
  "message": "Your answer fetched",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "dating_style": "loud",
    "match_preference": "same field",
    "user_field": "Computer science",
    "purpose": "studying",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

#### 3. Update Answer (Partial)

```bash
curl -X PUT http://localhost:8080/answers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "working",
    "match_preference": "either"
  }'
```

**Response:**

```json
{
  "message": "Your answer updated",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "dating_style": "loud",
    "match_preference": "either",
    "user_field": "Computer science",
    "purpose": "working",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T14:45:00.000Z"
  }
}
```

### Error Example: Duplicate Submission

```bash
curl -X POST http://localhost:8080/answers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "dating_style": "quiet",
    "match_preference": "different field",
    "user_field": "Business",
    "purpose": "casual dating"
  }'
```

**Response (409 Conflict):**

```json
{
  "error": "User already submitted an answer"
}
```

### Error Example: Invalid Enum

```bash
curl -X POST http://localhost:8080/answers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "dating_style": "INVALID_STYLE",
    "match_preference": "same field",
    "user_field": "Engineering",
    "purpose": "studying"
  }'
```

**Response (400 Bad Request):**

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "dating_style",
      "message": "Invalid enum value. Expected loud, quiet, or comfort"
    }
  ]
}
```

---

## Best Practices

1. **Always validate enums on frontend**: Use the same enum definitions to prevent validation errors
2. **Handle 409 conflicts gracefully**: If user tries to create twice, redirect them to update instead
3. **Use partial updates**: Only send fields that need to be updated to minimize payload size
4. **Cache responses**: Answer data changes infrequently, consider caching GET responses
5. **Check 404 on update**: Ensure user has created an answer before attempting updates

---

## Database Schema

For reference, the underlying `user_answer` table structure:

```sql
CREATE TABLE user_answer (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  dating_style VARCHAR(10) NOT NULL,  -- 'one', 'two', 'three'
  match_preference VARCHAR(10) NOT NULL,  -- 'one', 'two', 'one,two'
  user_field TEXT NOT NULL,
  purpose VARCHAR(10) NOT NULL,  -- 'one', 'two', 'three'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

The service layer handles all enum conversions automatically.