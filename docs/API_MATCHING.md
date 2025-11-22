# MATCHING_API
---

## POST `/queue/join`

Join the matching queue (“Find now” or “Match later”).

### Auth

* **Required**: `Authorization: Bearer <access_token>` (Supabase access token)

---

### Request body

```jsonc
// "Find now": omit timeWindow
{
  "location": {
    "lat": 10.779783,          // number, required
    "lng": 106.699018,         // number, required
    "placeId": "coffee-123"    // string, optional
  }
}
```

```jsonc
// "Match later": provide explicit timeWindow (UTC ISO 8601)
{
  "location": {
    "lat": 10.779783,
    "lng": 106.699018,
    "placeId": "coffee-123"
  },
  "timeWindow": {
    "start": "2025-11-14T14:00:00Z",   // ISO string, required
    "end":   "2025-11-14T16:00:00Z"    // ISO string, > start
  }
}
```

Notes:

* If `timeWindow` is **omitted**, backend auto-creates a window `[now+5min, now+6h]`.
* All times are treated as **UTC**.

---

### Success response `201`

```json
{
  "success": true,
  "queueEntry": {
    "queueId": "eab71b1c-cb88-4736-9909-ef99e9abb61d",
    "position": 2,                          // rough position in queue
    "joinedAt": "2025-11-14T12:09:14.481Z", // ISO UTC
    "timeWindow": {
      "start": "2025-11-14T12:14:14.481Z",
      "end":   "2025-11-14T18:09:14.481Z"
    }
  }
}
```

---

### Error responses (frontend should handle)

* `400` – validation / bad time window

  * e.g. missing fields, invalid lat/lng, `end <= start`
  * body:

    ```json
    {
      "success": false,
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid JoinQueue payload",
        "details": [ /* zod issues */ ]
      }
    }
    ```
* `401` – no / invalid token
* `409` – conflict

  * `"User already has an active queue"`
  * or `"Active session exists"`
* `429` – daily limit

  * `"Daily queue join limit reached"` or `"Daily match limit reached"`
* `500` – generic server error

  * `{ "success": false, "error": "Internal server error" }`

That’s all your frontend dev needs: **send body, look at `queueEntry`, and handle 400/401/409/429**.
