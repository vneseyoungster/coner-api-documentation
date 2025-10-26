# Coner API Design Rules

Version: 1.0  
Last Updated: October 26, 2025

## Overview

This document defines the design rules and conventions for the Coner Backend API to ensure consistency, maintainability, and ease of use.

---

## 1. Naming Conventions

### 1.1 Snake Case (snake_case)

**All API field names MUST use snake_case**

✅ **Correct:**
```json
{
  "user_id": "123",
  "display_name": "Alice Smith",
  "avatar_url": "https://example.com/avatar.png",
  "created_at": "2025-01-15T10:30:00Z",
  "is_deleted": false
}
```

❌ **Incorrect:**
```json
{
  "userId": "123",
  "DisplayName": "Alice Smith",
  "avatarURL": "https://example.com/avatar.png"
}
```

### 1.2 URL Structure

**Endpoints:**
- Use lowercase letters
- Use hyphens for multi-word resources (if needed)
- Use plural nouns for collections
- Maximum 3 levels of nesting

✅ **Correct:**
```
GET  /users
GET  /users/{id}
GET  /users/me/profile
POST /auth/logout-all
```

❌ **Incorrect:**
```
GET  /user
GET  /getUsers
GET  /users/{id}/profile/{profile_id}/settings/{setting_id}
```

---

## 2. Versioning

### 2.1 Version Format

**URL-based versioning using `/v{major}` prefix**

```
https://api.coner.app/v1/users
https://api.coner.app/v1/auth/signin
```

### 2.2 Version Lifecycle

- **Current Version:** v1
- **Version Increment Rules:**
  - Major version (v1 → v2): Breaking changes
  - No minor versions in URL (handle via backward compatibility)

### 2.3 Breaking Changes

Changes that require a new major version:
- Removing endpoints
- Removing required fields
- Changing field types
- Changing authentication mechanism
- Renaming fields

### 2.4 Non-Breaking Changes

Can be made within the same version:
- Adding new endpoints
- Adding optional fields
- Adding new enum values (at the end)
- Bug fixes

### 2.5 Deprecation Policy

1. Announce deprecation in API documentation
2. Maintain old version for minimum 6 months
3. Return deprecation warnings in response headers:
   ```
   Deprecation: true
   Sunset: Sat, 31 Dec 2025 23:59:59 GMT
   Link: <https://docs.coner.app/migration>; rel="sunset"
   ```

---

## 3. HTTP Response Codes

### 3.1 Success Codes (2xx)

| Code | Status | Usage |
|------|--------|-------|
| 200 | OK | Successful GET, PUT, PATCH requests |
| 201 | Created | Successful POST request that creates a resource |
| 204 | No Content | Successful DELETE request or POST with no response body |

**Examples:**
```
GET  /users/me        → 200 OK
POST /auth/signup     → 201 Created
POST /auth/logout-all → 204 No Content
```

### 3.2 Client Error Codes (4xx)

| Code | Status | Usage |
|------|--------|-------|
| 400 | Bad Request | Validation errors, malformed request body |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource conflict (e.g., email already exists) |
| 422 | Unprocessable Entity | Semantic validation errors |
| 429 | Too Many Requests | Rate limit exceeded |

**Example Error Response (400):**
```json
{
  "error": "ValidationError",
  "details": {
    "email": ["Must be a valid email address"],
    "password": ["Must be at least 8 characters long"]
  }
}
```

**Example Error Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 3.3 Server Error Codes (5xx)

| Code | Status | Usage |
|------|--------|-------|
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream service failure |
| 503 | Service Unavailable | Temporary server maintenance |
| 504 | Gateway Timeout | Upstream service timeout |

**Example Error Response (500):**
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

### 3.4 Response Code Selection Guide

```
Is the request authenticated and authorized?
├─ No  → 401 Unauthorized or 403 Forbidden
└─ Yes
   │
   Is the request body valid JSON and well-formed?
   ├─ No  → 400 Bad Request
   └─ Yes
      │
      Does the resource exist (for GET, PUT, PATCH, DELETE)?
      ├─ No  → 404 Not Found
      └─ Yes
         │
         Is the data semantically valid?
         ├─ No  → 400 Bad Request or 422 Unprocessable Entity
         └─ Yes
            │
            Did the operation succeed?
            ├─ Yes → 200 OK / 201 Created / 204 No Content
            └─ No  → 500 Internal Server Error
```


