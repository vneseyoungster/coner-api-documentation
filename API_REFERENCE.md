# Coner Backend API Reference

**Base URL:** `http://localhost:8080` (development)
**Authentication:** Bearer JWT tokens issued by Supabase Auth

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
   - [Health Check](#health-check)
   - [Authentication Endpoints](#authentication-endpoints)
   - [Development Endpoints](#development-endpoints)
   - [User Profile Endpoints](#user-profile-endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)

---

## Overview

The Coner Backend API is a RESTful service built with Express.js and TypeScript, following Domain-Driven Design (DDD) principles. It provides authentication and user profile management services for the Coner platform.

### Key Features

- **Supabase Authentication Integration**: JWT-based authentication with Supabase Auth
- **Profile Management**: Comprehensive user profile system with first-time setup flow
- **Global Logout**: Immediate session invalidation across all devices
- **Auto-profile Creation**: Automatic profile initialization on first login
- **Input Validation**: Zod-based schema validation for all requests
- **Type Safety**: Full TypeScript implementation

### Architecture

- **Authentication**: Hybrid Supabase + PostgreSQL (JWT verification with database cutoff)
- **Database**: PostgreSQL with connection pooling
- **Caching**: Redis for session management and caching
- **Events**: In-memory event bus for domain events

---

## Authentication

### Authentication Flow

1. **Sign Up**: Create account via `/auth/signup` with email/password
2. **Sign In**: Authenticate via `/auth/signin` to receive JWT tokens
3. **Authorization**: Include JWT in `Authorization` header for protected routes
4. **Auto-profile**: First request automatically creates user profile via `ensureProfile` middleware

### JWT Token Format

```
Authorization: Bearer <access_token>
```

### Token Verification

All protected routes verify JWT tokens against:
- **Signature**: Validated using Supabase JWKS endpoint
- **Expiry**: Checked automatically by jose library
- **Issuer**: Verified against Supabase issuer
- **Logout Cutoff**: Compared against user's `logout_at` timestamp

### Session Management

- **Access Token Lifetime**: Configurable via Supabase (default: 1 hour)
- **Refresh Token**: Used to obtain new access tokens
- **Global Logout**: Sets `logout_at` timestamp, invalidating all issued tokens

---

## API Endpoints

### Health Check

#### System Health Check

```http
GET /health
```

Checks the health status of the API server, database, and Redis.

**Response (200 OK)**

```json
{
  "status": "ok",
  "db": true,
  "redis": "ok"
}
```

**Response (500 Internal Server Error)**

```json
{
  "status": "error",
  "error": "Connection refused"
}
```

---

### Authentication Endpoints

All authentication endpoints are prefixed with `/auth`.

#### 1. Sign Up

Create a new user account.

```http
POST /auth/signup
```

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "Alice Smith"
}
```

**Validation Rules**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Minimum 8 characters |
| `displayName` | string | No | 1-100 characters if provided |

**Response (201 Created)**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**

- `400 Bad Request`: Validation error or email already exists
- `500 Internal Server Error`: Server error during account creation

---

#### 2. Sign In

Authenticate an existing user.

```http
POST /auth/signin
```

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Validation Rules**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Minimum 8 characters |

**Response (200 OK)**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "v1.MRjWyLHe1KIrqT...",
  "expires_in": 3600
}
```

**Error Responses**

- `400 Bad Request`: Invalid credentials
- `500 Internal Server Error`: Server error during authentication

---

#### 3. Auth Health Check

```http
GET /auth/health
```

Simple health check for the authentication service.

**Response (200 OK)**

```json
{
  "ok": true,
  "service": "auth"
}
```

---

#### 4. Get Current User

Get information about the currently authenticated user.

```http
GET /auth/me
Authorization: Bearer <access_token>
```

**Response (200 OK)**

```json
{
  "ok": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  }
}
```

**Error Responses**

- `401 Unauthorized`: Missing or invalid JWT token

---

#### 5. Global Logout

Invalidate all active sessions for the current user across all devices.

```http
POST /auth/logout-all
Authorization: Bearer <access_token>
```

**How It Works**

1. Sets `logout_at = NOW()` in the database (immediate cutoff)
2. Calls Supabase Admin API to revoke all refresh tokens
3. Purges middleware cache for instant invalidation

**Response (204 No Content)**

Empty response body on success.

**Error Responses**

- `401 Unauthorized`: Missing or invalid JWT token
- `500 Internal Server Error`: Failed to revoke tokens

---

#### 6. Bootstrap Profile

Explicitly create user profile (optional - normally done automatically).

```http
POST /auth/bootstrap
Authorization: Bearer <access_token>
```

**Response (200 OK)**

```json
{
  "ok": true
}
```

---

#### 7. Google OAuth URL (Test Helper)

Generate a Google OAuth authorization URL for manual testing.

```http
GET /auth/google/url
```

**Response (200 OK)**

```json
{
  "url": "https://your-project.supabase.co/auth/v1/authorize?provider=google&redirect_to=..."
}
```

---

#### 8. OAuth Callback (Test Helper)

OAuth callback endpoint for manual testing. Returns instructions to extract tokens from URL fragment.

```http
GET /auth/callback
```

**Response (200 OK)**

Returns HTML page with instructions to copy `access_token` from browser address bar.

---

### Development Endpoints

**⚠️ DEVELOPMENT ONLY** - These endpoints are only available when `NODE_ENV=development`.

All development endpoints are prefixed with `/dev/auth` and are designed for backend testing purposes only.

#### Purpose

The development token endpoints allow backend developers to obtain valid JWT access tokens without:
- Running the mobile app
- Going through the complete OAuth flow
- Manually extracting tokens from console logs
- Setting up frontend environment

#### Security

- **Environment Protection**: Endpoints return 404 in production
- **Service Role Access**: Uses Supabase Admin API with service role key
- **Auto-confirmation**: Test users are created with pre-confirmed emails
- **Test User Pattern**: Default email pattern is `test@coner.dev`

---

#### 1. Generate Test Token

Generate a valid JWT access token for API testing.

```http
POST /dev/auth/token
```

**Request Body (all fields optional)**

```json
{
  "email": "developer@test.com",
  "password": "DevPassword123!",
  "metadata": {
    "full_name": "Backend Developer",
    "avatar_url": "https://example.com/avatar.png"
  }
}
```

**Default Values**

If no request body is provided, the following defaults are used:
- `email`: `test@coner.dev`
- `password`: `TestPassword123!`
- `metadata.full_name`: `Test User`

**Behavior**

1. Attempts to sign in with provided/default credentials
2. If user doesn't exist, creates them automatically with `email_confirm: true`
3. Returns valid Supabase JWT tokens

**Response (200 OK)**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "v1-abc123...",
    "expires_in": 3600,
    "expires_at": 1732123456,
    "token_type": "bearer",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "test@coner.dev",
      "user_metadata": {
        "full_name": "Test User"
      }
    }
  },
  "message": "Test token generated successfully"
}
```

**Error Responses**

- `500 Internal Server Error`: Failed to create/sign in test user

**Example - Default Token**

```bash
curl -X POST http://localhost:8080/dev/auth/token
```

**Example - Custom Token**

```bash
curl -X POST http://localhost:8080/dev/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@test.com",
    "password": "DevPassword123!",
    "metadata": {
      "full_name": "Backend Developer"
    }
  }'
```

**Example - Using Token**

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:8080/dev/auth/token | jq -r '.data.access_token')

# Use in protected endpoint
curl -X GET http://localhost:8080/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 2. Generate Multiple Test Tokens

Generate multiple test tokens in a single request (batch creation).

```http
POST /dev/auth/tokens/batch
```

**Request Body**

```json
{
  "count": 5
}
```

**Validation Rules**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `count` | number | No | Default: 5, Maximum: 20 |

**Behavior**

Creates test users with the pattern `test1@coner.dev`, `test2@coner.dev`, etc., and returns tokens for each.

**Response (200 OK)**

```json
{
  "success": true,
  "data": [
    {
      "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "v1-abc123...",
      "expires_in": 3600,
      "expires_at": 1732123456,
      "token_type": "bearer",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "test1@coner.dev",
        "user_metadata": {
          "full_name": "Test User 1"
        }
      }
    },
    {
      "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "v1-def456...",
      "expires_in": 3600,
      "expires_at": 1732123456,
      "token_type": "bearer",
      "user": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "email": "test2@coner.dev",
        "user_metadata": {
          "full_name": "Test User 2"
        }
      }
    }
    // ... up to 20 tokens
  ],
  "message": "Generated 2 test tokens"
}
```

**Error Responses**

- `400 Bad Request`: Count exceeds maximum of 20
- `500 Internal Server Error`: Failed to create test users

**Example**

```bash
curl -X POST http://localhost:8080/dev/auth/tokens/batch \
  -H "Content-Type: application/json" \
  -d '{"count": 3}'
```

---

#### 3. Delete Test User

Delete a test user for cleanup purposes.

```http
DELETE /dev/auth/user/:userId
```

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | uuid | The Supabase user ID to delete |

**Response (200 OK)**

```json
{
  "success": true,
  "message": "Test user deleted successfully"
}
```

**Error Responses**

- `500 Internal Server Error`: Failed to delete test user

**Example**

```bash
curl -X DELETE http://localhost:8080/dev/auth/user/550e8400-e29b-41d4-a716-446655440000
```

---

#### Development Workflow

**Typical Usage Pattern:**

1. Start development server: `cd src && npm run dev`
2. Generate test token: `POST /dev/auth/token`
3. Use token to test protected endpoints
4. Clean up test users when done (optional)

**Postman Setup:**

```javascript
// In Postman Tests tab for /dev/auth/token request
const response = pm.response.json();
pm.environment.set("access_token", response.data.access_token);
pm.environment.set("user_id", response.data.user.id);
```

Then use `{{access_token}}` in Authorization headers for other requests.

**CI/CD Integration:**

```yaml
# Example GitHub Actions workflow
- name: Get test token
  run: |
    TOKEN=$(curl -s -X POST http://localhost:8080/dev/auth/token | jq -r '.data.access_token')
    echo "TOKEN=$TOKEN" >> $GITHUB_ENV

- name: Run API tests
  run: |
    curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/users/me
```

**See Also:** `docs/DEV_TOKEN_ENDPOINT.md` for complete implementation guide.

---

### User Profile Endpoints

All user profile endpoints are prefixed with `/users` and require authentication.

**Middleware Chain**: `requireAuth` → `ensureProfile` → route handler

---

#### 1. Get Legacy Profile

Get basic profile information (legacy endpoint).

```http
GET /users/me
Authorization: Bearer <access_token>
```

**Response (200 OK)**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_name": "Alice Smith",
  "avatar_url": "https://cdn.example.com/avatar.png",
  "email": "user@example.com",
  "profession": "Software Engineer",
  "company": "Tech Corp",
  "bio": "Passionate about building great products",
  "skills": ["JavaScript", "React", "Node.js"],
  "work_style": "collaborative",
  "years_experience": 5,
  "linkedin_url": "https://linkedin.com/in/alice",
  "portfolio_url": "https://alice.dev",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-20T14:22:00Z",
  "last_seen_at": "2025-01-25T09:15:00Z",
  "is_deleted": false
}
```

**Error Responses**

- `401 Unauthorized`: Missing or invalid JWT token
- `404 Not Found`: Profile not found

---

#### 2. Update Legacy Profile

Update basic profile fields (legacy endpoint).

```http
PUT /users/me
Authorization: Bearer <access_token>
```

**Request Body**

```json
{
  "display_name": "Alice Smith",
  "avatar_url": "https://cdn.example.com/new-avatar.png"
}
```

**Validation Rules**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `display_name` | string | No | 1-100 characters if provided |
| `avatar_url` | string | No | Valid URL, max 2048 characters |

**Response (200 OK)**

Returns the updated profile object (same format as GET /users/me).

**Error Responses**

- `401 Unauthorized`: Missing or invalid JWT token
- `400 Bad Request`: Validation error

---

#### 3. Get Current Profile

Get detailed profile information for the authenticated user.

```http
GET /users/profile
Authorization: Bearer <access_token>
```

**Response (200 OK)**

```json
{
  "full_name": "Alice Smith",
  "dob": "1995-03-15",
  "sex": "female",
  "phone_number": "1234567890",
  "address": "123 Main St, San Francisco, CA 94102",
  "school": "Stanford University",
  "major": "Computer Science"
}
```

**Field Descriptions**

| Field | Type | Description |
|-------|------|-------------|
| `full_name` | string \| null | User's full legal name |
| `dob` | date \| null | Date of birth (ISO 8601 format) |
| `sex` | enum \| null | Gender: `"male"`, `"female"`, or `"other"` |
| `phone_number` | string \| null | Phone number (8-15 digits) |
| `address` | string \| null | Full address |
| `school` | string \| null | Educational institution |
| `major` | string \| null | Field of study |

**Error Responses**

- `401 Unauthorized`: Missing or invalid JWT token
- `404 Not Found`: Profile not found

---

#### 4. First-Time Profile Setup

Complete the profile with all required information (first-time setup only).

```http
PUT /users/profile-first
Authorization: Bearer <access_token>
```

**Request Body**

```json
{
  "full_name": "Alice Smith",
  "dob": "1995-03-15",
  "sex": "female",
  "phone_number": "1234567890",
  "address": "123 Main St, San Francisco, CA 94102",
  "school": "Stanford University",
  "major": "Computer Science"
}
```

**Validation Rules**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `full_name` | string | Yes | 1-255 characters |
| `dob` | date | Yes | Age 0-150 years |
| `sex` | enum | Yes | `"male"`, `"female"`, or `"other"` |
| `phone_number` | string | Yes | 8-15 digits only |
| `address` | string | Yes | 1-500 characters |
| `school` | string | Yes | 1-255 characters |
| `major` | string | Yes | 1-255 characters |

**Important Notes**

- This endpoint can only be called **once** per user
- All fields are required for first-time setup
- Subsequent calls will return `400 Bad Request` error
- Use `PATCH /users/profile` for updates after first-time setup

**Response (200 OK)**

Returns the complete profile object (same format as GET /users/profile).

**Error Responses**

- `401 Unauthorized`: Missing or invalid JWT token
- `400 Bad Request`: Validation error or profile already initialized
- `404 Not Found`: Profile not found

---

#### 5. Update Profile

Update profile fields after first-time setup (partial updates allowed).

```http
PATCH /users/profile
Authorization: Bearer <access_token>
```

**Request Body**

```json
{
  "phone_number": "9876543210",
  "address": "456 Oak Ave, New York, NY 10001",
  "school": "MIT"
}
```

**Validation Rules**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `full_name` | - | - | **Cannot be updated** (locked after first setup) |
| `dob` | date | No | Age 0-150 years |
| `sex` | - | - | **Cannot be updated** (locked after first setup) |
| `phone_number` | string | No | 8-15 digits only |
| `address` | string | No | 1-500 characters |
| `school` | string | No | 1-255 characters |
| `major` | string | No | 1-255 characters |

**Important Notes**

- **Locked fields**: `full_name` and `sex` cannot be changed after first-time setup
- All fields are optional - only include fields you want to update
- Omitted fields will retain their current values

**Response (200 OK)**

Returns the complete updated profile object (same format as GET /users/profile).

**Error Responses**

- `401 Unauthorized`: Missing or invalid JWT token
- `400 Bad Request`: Validation error or attempting to update locked fields
- `404 Not Found`: Profile not found

---

## Data Models

### User Profile Schema

The `user_profiles` table stores all user information:

```sql
CREATE TABLE user_profiles (
  user_id           uuid PRIMARY KEY,
  display_name      varchar(100),
  profession        varchar(200),
  company           varchar(200),
  bio               text,
  skills            text[],
  work_style        varchar(50),
  avatar_url        text,
  linkedin_url      text,
  portfolio_url     text,
  years_experience  integer,
  email             varchar(255),
  is_email_verified boolean NOT NULL DEFAULT false,
  full_name         varchar(255),
  dob               date,
  sex               varchar(10),
  phone_number      varchar(15),
  address           varchar(500),
  school            varchar(255),
  major             varchar(255),
  logout_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  is_deleted        boolean NOT NULL DEFAULT false
);
```

### Enum Types

#### Sex

```typescript
type Sex = 'male' | 'female' | 'other'
```

#### Work Style (Legacy)

```typescript
type WorkStyle = 'focus' | 'collaborative' | 'flexible'
```

---

## Error Handling

### Error Response Format

All errors follow a consistent JSON format:

```json
{
  "error": "Error message here"
}
```

### Validation Errors

Zod validation errors include detailed field-level information:

```json
{
  "error": "ValidationError",
  "details": {
    "email": ["Please provide a valid email address"],
    "password": ["Password must be at least 8 characters long"]
  }
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| `200` | OK | Successful GET/PATCH request |
| `201` | Created | Successful POST request (resource created) |
| `204` | No Content | Successful DELETE or logout request |
| `400` | Bad Request | Validation error or invalid request |
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Resource not found |
| `500` | Internal Server Error | Server-side error |

### Common Error Scenarios

#### Authentication Errors

```json
{
  "error": "Unauthorized: JWT token missing or invalid"
}
```

**Solution**: Ensure valid JWT token is included in `Authorization` header.

#### Validation Errors

```json
{
  "error": "ValidationError",
  "details": {
    "phone_number": ["Invalid phone number"]
  }
}
```

**Solution**: Fix validation errors according to field requirements.

#### Profile Already Initialized

```json
{
  "error": "Profile already initialized"
}
```

**Solution**: Use `PATCH /users/profile` for updates instead of `PUT /users/profile-first`.

#### Locked Field Update

```json
{
  "error": "ValidationError",
  "details": {
    "full_name": ["Cannot update full name after first completion"]
  }
}
```

**Solution**: Remove locked fields (`full_name`, `sex`) from update request.

---

## Rate Limiting

**Current Status**: No rate limiting is implemented.

**Planned**: Rate limiting will be added in future releases to prevent abuse.

**Recommendation**: Implement client-side throttling and respect server resources.

---

## Examples

### Complete Authentication Flow

#### 1. Sign Up

```bash
curl -X POST http://localhost:8080/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "securePass123",
    "displayName": "Alice Smith"
  }'
```

**Response:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 2. Sign In

```bash
curl -X POST http://localhost:8080/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "securePass123"
  }'
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "v1.MRjWyLHe1KIrqT...",
  "expires_in": 3600
}
```

#### 3. Access Protected Route

```bash
curl -X GET http://localhost:8080/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**

```json
{
  "ok": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com"
  }
}
```

---

### Complete Profile Setup Flow

#### 1. First-Time Profile Setup

```bash
curl -X PUT http://localhost:8080/users/profile-first \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Alice Smith",
    "dob": "1995-03-15",
    "sex": "female",
    "phone_number": "1234567890",
    "address": "123 Main St, San Francisco, CA 94102",
    "school": "Stanford University",
    "major": "Computer Science"
  }'
```

**Response:**

```json
{
  "full_name": "Alice Smith",
  "dob": "1995-03-15",
  "sex": "female",
  "phone_number": "1234567890",
  "address": "123 Main St, San Francisco, CA 94102",
  "school": "Stanford University",
  "major": "Computer Science"
}
```

#### 2. Update Profile Later

```bash
curl -X PATCH http://localhost:8080/users/profile \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "9876543210",
    "address": "456 Oak Ave, New York, NY 10001"
  }'
```

**Response:**

```json
{
  "full_name": "Alice Smith",
  "dob": "1995-03-15",
  "sex": "female",
  "phone_number": "9876543210",
  "address": "456 Oak Ave, New York, NY 10001",
  "school": "Stanford University",
  "major": "Computer Science"
}
```

#### 3. Get Current Profile

```bash
curl -X GET http://localhost:8080/users/profile \
  -H "Authorization: Bearer <access_token>"
```

**Response:**

```json
{
  "full_name": "Alice Smith",
  "dob": "1995-03-15",
  "sex": "female",
  "phone_number": "9876543210",
  "address": "456 Oak Ave, New York, NY 10001",
  "school": "Stanford University",
  "major": "Computer Science"
}
```

---

### PowerShell Examples

#### Sign Up

```powershell
Invoke-WebRequest -Uri "http://localhost:8080/auth/signup" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"alice@example.com","password":"securePass123","displayName":"Alice Smith"}'
```

#### Sign In

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:8080/auth/signin" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"alice@example.com","password":"securePass123"}'

$tokens = $response.Content | ConvertFrom-Json
$accessToken = $tokens.access_token
```

#### Get Profile

```powershell
Invoke-WebRequest -Uri "http://localhost:8080/users/profile" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $accessToken"}
```

#### Update Profile

```powershell
Invoke-WebRequest -Uri "http://localhost:8080/users/profile" `
  -Method PATCH `
  -Headers @{
    "Authorization"="Bearer $accessToken"
    "Content-Type"="application/json"
  } `
  -Body '{"phone_number":"9876543210"}'
```

#### Global Logout

```powershell
Invoke-WebRequest -Uri "http://localhost:8080/auth/logout-all" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $accessToken"}
```

---

## Additional Resources

- **Changelog**: [CHANGELOG.md](./CHANGELOG.md) - Detailed version history
- **Architecture**: [CLAUDE.md](../CLAUDE.md) - Development guide and architecture overview
- **Database Migrations**: [/migrations](../migrations/) - SQL migration files

---

## Support

For issues or questions:
- Create an issue on GitHub
- Contact the development team
- Refer to the Product Requirements Document (PRD.md)

---

**Maintained by**: Coner Development Team
**Last Updated**: 2025-11-20
**API Version**: 0.5.0 (unreleased)
