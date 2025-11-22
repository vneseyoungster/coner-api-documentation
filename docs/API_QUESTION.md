# Question API Reference

**Base URL:** `http://localhost:8080` (development)
**Authentication:** Bearer JWT tokens issued by Supabase Auth

---

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
   - [Get All Questions](#get-all-questions)
3. [Data Models](#data-models)
4. [Error Handling](#error-handling)
5. [Examples](#examples)

---

## Overview

The Question API provides access to matching questions used in the Coner platform. These questions help users define their preferences and interests for better matching.

### Key Features

- **Active Questions Only**: Returns only active questions configured in the system
- **Ordered Results**: Questions are returned in display order for consistent UI rendering
- **JSONB Options**: Flexible option structure for different question types
- **Protected Endpoints**: Requires valid JWT authentication

### Architecture

- **Database**: PostgreSQL via Supabase with `matching_questions_meta` table
- **Domain-Driven Design**: Follows DDD principles with clear separation of layers
- **Type Safety**: Full TypeScript implementation with domain entities

---

## API Endpoints

All question endpoints are prefixed with `/questions`.

### Get All Questions

Retrieve all active matching questions in display order.

```
GET /questions
```

**Authentication Required:** Yes (Bearer token)

**Query Parameters:** None

**Response (200 OK)**

```json
{
  "message": "Get questions successfully",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "question_text": "What are your interests?",
      "options": [
        { "value": "sports", "label": "Sports" },
        { "value": "music", "label": "Music" },
        { "value": "travel", "label": "Travel" }
      ],
      "display_order": 1
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "question_text": "What's your preferred meeting style?",
      "options": [
        { "value": "casual", "label": "Casual hangout" },
        { "value": "structured", "label": "Structured activity" }
      ],
      "display_order": 2
    }
  ]
}
```

**Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| message | string | Success message |
| data | Question[] | Array of question objects |

**Error Responses**

- **401 Unauthorized**: Missing or invalid JWT token
- **500 Internal Server Error**: Database error or server issue

**Example cURL Request**

```bash
curl -X GET http://localhost:8080/questions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response (Error)**

```json
{
  "error": "Database query failed",
  "message": "[SupabaseQuestionRepository] getAllQuestions failed: connection timeout"
}
```

---

## Data Models

### Question Entity

Represents a matching question in the system.

```typescript
interface Question {
  id: string;              // UUID of the question
  question_text: string;   // The question text to display
  options: any;            // JSONB field containing question options
  display_order: number;   // Order in which to display the question
}
```

**Field Details**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier for the question |
| question_text | string | Not Null | The actual question text shown to users |
| options | JSONB | Not Null | Flexible JSON structure for answer options |
| display_order | integer | Not Null | Determines the order questions are shown (ascending) |

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Common Error Scenarios

| Status Code | Scenario | Solution |
|-------------|----------|----------|
| 401 | Missing Authorization header | Include valid Bearer token |
| 401 | Expired JWT token | Refresh token and retry |
| 500 | Database connection error | Check database connectivity |
| 500 | Supabase query error | Check database schema and permissions |

---

## Examples

### cURL Request Example

**1. Authenticate First**

```bash
# Sign in to get access token
```

**2. Get Questions**

```bash
# Use access token from sign-in response
curl -X GET http://localhost:8080/questions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Implementation Details

### Repository Layer

The question data is fetched from the `matching_questions_meta` table in Supabase:

- **Filter**: Only questions where `is_active = true`
- **Sort**: Results ordered by `display_order ASC`
- **Selection**: Returns `id`, `question_text`, `options`, and `display_order` fields

### Service Layer

The service layer provides a clean interface for the controller:
- Delegates to repository for data access
- Can be extended with business logic (caching, filtering, etc.)

### Controller Layer

The controller handles HTTP concerns:
- Parses requests and formats responses
- Handles errors and passes to Express error middleware
- Logs operations for debugging

---

## Future Enhancements

Potential improvements to the Question API:

- **Pagination**: Support for large question sets
- **Filtering**: Get questions by category or tags
- **Localization**: Multi-language support for questions
- **Caching**: Redis caching for improved performance
- **Question Responses**: POST endpoint to submit user answers
- **Question Analytics**: Track which questions are most answered
- **Versioning**: API versioning for breaking changes

---

## Support

For issues or questions about the Question API:

1. Check server logs for detailed error messages
2. Verify JWT token is valid and not expired
3. Ensure database connection is active
4. Review Supabase table permissions

**Database Table:** `matching_questions_meta`
**Required Permissions:** SELECT on active questions