# Coner API Getting Started Guide

Version: 1.0
Last Updated: October 26, 2025

## Overview

This guide will help you get started with the Coner Backend API. Learn how to authenticate, make your first API calls, and understand common patterns used throughout the API.

---

## 1. Base URL

All API requests should be made to:

```
https://api.coner.app/v1
```

**Example:**
```
https://api.coner.app/v1/users/me
https://api.coner.app/v1/auth/signin
```

---

## 2. Authentication

### 2.1 Getting Started

The Coner API uses **Bearer Token authentication** with JWT tokens.

### 2.2 Sign Up (Create Account)

**Endpoint:** `POST /auth/signup`

**Request:**
```bash
curl -X POST https://api.coner.app/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123",
    "display_name": "John Doe"
  }'
```

**Response (201 Created):**
```json
{
  "user": {
    "user_id": "usr_123456",
    "email": "user@example.com",
    "display_name": "John Doe",
    "avatar_url": null,
    "created_at": "2025-10-26T10:30:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2.3 Sign In (Login)

**Endpoint:** `POST /auth/signin`

**Request:**
```bash
curl -X POST https://api.coner.app/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123"
  }'
```

**Response (200 OK):**
```json
{
  "user": {
    "user_id": "usr_123456",
    "email": "user@example.com",
    "display_name": "John Doe"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2.4 Using Access Tokens

Include the access token in the `Authorization` header for all authenticated requests:

```bash
curl -X GET https://api.coner.app/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2.5 Refreshing Tokens

When your access token expires, use the refresh token to get a new one:

**Endpoint:** `POST /auth/refresh`

**Request:**
```bash
curl -X POST https://api.coner.app/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2.6 Logout

**Single Device Logout:**
```bash
curl -X POST https://api.coner.app/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**All Devices Logout:**
```bash
curl -X POST https://api.coner.app/v1/auth/logout-all \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 3. Making API Requests

### 3.1 Request Headers

**Required Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Optional Headers:**
```
Accept-Language: en-US
X-Request-ID: unique-request-id-123
```

### 3.2 Request Body Format

All request bodies must be valid JSON with **snake_case** field names:

✅ **Correct:**
```json
{
  "display_name": "Alice Smith",
  "avatar_url": "https://example.com/avatar.png",
  "bio": "Software developer"
}
```

❌ **Incorrect:**
```json
{
  "displayName": "Alice Smith",
  "avatarUrl": "https://example.com/avatar.png"
}
```

### 3.3 Response Format

All responses use **snake_case** field names and include standard fields:

```json
{
  "user_id": "usr_123456",
  "email": "user@example.com",
  "display_name": "John Doe",
  "avatar_url": "https://example.com/avatar.png",
  "created_at": "2025-10-26T10:30:00Z",
  "updated_at": "2025-10-26T15:45:00Z"
}
```

---

## 4. Common API Patterns

### 4.1 Get Current User Profile

**Endpoint:** `GET /users/me`

```bash
curl -X GET https://api.coner.app/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**
```json
{
  "user_id": "usr_123456",
  "email": "user@example.com",
  "display_name": "John Doe",
  "avatar_url": "https://example.com/avatar.png",
  "bio": "Software developer",
  "created_at": "2025-10-26T10:30:00Z",
  "updated_at": "2025-10-26T15:45:00Z"
}
```

### 4.2 Update User Profile

**Endpoint:** `PATCH /users/me`

```bash
curl -X PATCH https://api.coner.app/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Jane Doe",
    "bio": "Full-stack developer"
  }'
```

**Response (200 OK):**
```json
{
  "user_id": "usr_123456",
  "email": "user@example.com",
  "display_name": "Jane Doe",
  "bio": "Full-stack developer",
  "updated_at": "2025-10-26T16:00:00Z"
}
```

### 4.3 List Resources (Pagination)

**Endpoint:** `GET /users?page=1&limit=20`

```bash
curl -X GET "https://api.coner.app/v1/users?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "user_id": "usr_123456",
      "display_name": "John Doe",
      "avatar_url": "https://example.com/avatar1.png"
    },
    {
      "user_id": "usr_789012",
      "display_name": "Jane Smith",
      "avatar_url": "https://example.com/avatar2.png"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 100,
    "items_per_page": 20,
    "has_next": true,
    "has_previous": false
  }
}
```

### 4.4 Create a Resource

**Endpoint:** `POST /posts`

```bash
curl -X POST https://api.coner.app/v1/posts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "This is the content of my post",
    "tags": ["introduction", "hello"]
  }'
```

**Response (201 Created):**
```json
{
  "post_id": "post_123456",
  "title": "My First Post",
  "content": "This is the content of my post",
  "author_id": "usr_123456",
  "tags": ["introduction", "hello"],
  "created_at": "2025-10-26T16:30:00Z"
}
```

### 4.5 Delete a Resource

**Endpoint:** `DELETE /posts/{post_id}`

```bash
curl -X DELETE https://api.coner.app/v1/posts/post_123456 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (204 No Content):**
```
(Empty response body)
```

---

## 5. Error Handling

### 5.1 Understanding Error Responses

All errors follow a consistent format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "details": {
    "field_name": ["Error description"]
  }
}
```

### 5.2 Common Error Examples

**Validation Error (400):**
```json
{
  "error": "ValidationError",
  "message": "Request validation failed",
  "details": {
    "email": ["Must be a valid email address"],
    "password": ["Must be at least 8 characters long"]
  }
}
```

**Unauthorized (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

**Not Found (404):**
```json
{
  "error": "NotFound",
  "message": "User not found"
}
```

**Conflict (409):**
```json
{
  "error": "Conflict",
  "message": "Email already exists"
}
```

**Rate Limit (429):**
```json
{
  "error": "RateLimitExceeded",
  "message": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

### 5.3 Error Handling Best Practices

1. **Always check the HTTP status code first**
2. **Parse the error response body for details**
3. **Implement retry logic for 5xx errors**
4. **Display user-friendly messages based on error types**
5. **Log errors for debugging**

**Example (JavaScript):**
```javascript
try {
  const response = await fetch('https://api.coner.app/v1/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();

    switch (response.status) {
      case 401:
        // Redirect to login
        break;
      case 404:
        // Show not found message
        break;
      case 500:
        // Retry or show error message
        break;
    }
  }

  const data = await response.json();
  // Process successful response
} catch (error) {
  console.error('Network error:', error);
}
```

---

## 6. Rate Limiting

### 6.1 Rate Limit Headers

Every API response includes rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1698328800
```

### 6.2 Rate Limit Tiers

| Tier | Requests per Hour | Notes |
|------|-------------------|-------|
| Free | 1,000 | Standard rate limit |
| Premium | 10,000 | Increased quota |
| Enterprise | Custom | Contact support |

### 6.3 Handling Rate Limits

When you exceed the rate limit (429 response):

```json
{
  "error": "RateLimitExceeded",
  "message": "Too many requests",
  "retry_after": 60
}
```

**Best Practice:**
- Monitor `X-RateLimit-Remaining` header
- Implement exponential backoff
- Cache responses when possible
- Use webhooks instead of polling

---

## 7. API Client Examples

### 7.1 JavaScript/TypeScript

```javascript
class ConerAPI {
  constructor(baseUrl = 'https://api.coner.app/v1') {
    this.baseUrl = baseUrl;
    this.accessToken = null;
  }

  async signIn(email, password) {
    const response = await fetch(`${this.baseUrl}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    return data;
  }

  async getProfile() {
    const response = await fetch(`${this.baseUrl}/users/me`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    return await response.json();
  }
}

// Usage
const api = new ConerAPI();
await api.signIn('user@example.com', 'password');
const profile = await api.getProfile();
```

### 7.2 Python

```python
import requests

class ConerAPI:
    def __init__(self, base_url='https://api.coner.app/v1'):
        self.base_url = base_url
        self.access_token = None

    def sign_in(self, email, password):
        response = requests.post(
            f'{self.base_url}/auth/signin',
            json={'email': email, 'password': password}
        )
        data = response.json()
        self.access_token = data['access_token']
        return data

    def get_profile(self):
        response = requests.get(
            f'{self.base_url}/users/me',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        return response.json()

# Usage
api = ConerAPI()
api.sign_in('user@example.com', 'password')
profile = api.get_profile()
```

### 7.3 cURL Examples

**Sign In:**
```bash
curl -X POST https://api.coner.app/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

**Get Profile:**
```bash
curl -X GET https://api.coner.app/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 8. Best Practices

### 8.1 Security

- ✅ **Always use HTTPS**
- ✅ **Store tokens securely** (never in localStorage for web apps)
- ✅ **Implement token refresh logic**
- ✅ **Use environment variables for API keys**
- ✅ **Validate SSL certificates**
- ❌ **Never log tokens or sensitive data**
- ❌ **Never expose tokens in URLs**

### 8.2 Performance

- ✅ **Cache responses when appropriate**
- ✅ **Use pagination for large datasets**
- ✅ **Implement request debouncing**
- ✅ **Use webhooks instead of polling**
- ✅ **Compress request/response bodies**
- ❌ **Don't make unnecessary API calls**
- ❌ **Don't fetch all data at once**

### 8.3 Error Handling

- ✅ **Always check HTTP status codes**
- ✅ **Implement retry logic with exponential backoff**
- ✅ **Handle network failures gracefully**
- ✅ **Provide user-friendly error messages**
- ✅ **Log errors for debugging**

### 8.4 Data Validation

- ✅ **Validate input before sending requests**
- ✅ **Use snake_case for all field names**
- ✅ **Follow the API schema exactly**
- ✅ **Handle timezone-aware dates properly**

---

## 9. Quick Reference

### 9.1 Common Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/signup | Create new account |
| POST | /auth/signin | Login |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/logout | Logout current session |
| POST | /auth/logout-all | Logout all sessions |
| GET | /users/me | Get current user profile |
| PATCH | /users/me | Update current user profile |
| GET | /users/{id} | Get user by ID |

### 9.2 Status Codes Quick Reference

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 201 | Created | Resource created successfully |
| 204 | No Content | Operation successful, no data |
| 400 | Bad Request | Fix request data |
| 401 | Unauthorized | Re-authenticate |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Check resource ID |
| 429 | Too Many Requests | Implement backoff |
| 500 | Server Error | Retry or contact support |

---

## 10. Support

### 10.1 Documentation

- **API Reference:** https://docs.coner.app/api-reference
- **Design Rules:** https://docs.coner.app/rules
- **Changelog:** https://docs.coner.app/changelog

### 10.2 Getting Help

- **Support Email:** support@coner.app
- **Developer Discord:** https://discord.gg/coner
- **GitHub Issues:** https://github.com/coner/api/issues

### 10.3 Updates

Subscribe to API updates to stay informed about:
- New features and endpoints
- Breaking changes
- Deprecation notices
- Security updates

---

**Happy coding! 🚀**
