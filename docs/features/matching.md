# Matching Module - Backend Architecture & API Reference

## Overview

The Matching Module is a real-time connection matching system built with Domain-Driven Design (DDD) principles. It matches users based on geographic proximity, time windows, preference compatibility, and waiting time using a sophisticated scoring algorithm.

### Key Features

- **Match Now**: Immediate matching with auto-generated time window
- **Match Later**: Scheduled matching with custom time windows
- **Smart Scoring**: Multi-factor compatibility scoring (distance, preferences, wait time)
- **Broadening**: Automatic relaxation of criteria after waiting
- **Real-time**: WebSocket notifications for instant updates
- **Scalable**: Geographic partitioning for large user bases

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Queue Storage | Redis | Real-time waiting set, distributed locks |
| Persistence | PostgreSQL/Supabase | Queue entries, sessions, history |
| Real-time | Socket.io + Redis Pub/Sub | WebSocket events |
| Geospatial | PostGIS | Location-based queries |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           API Layer                                  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ MatchQueueCtrl  │  │ MatchSessionCtrl │  │ MatchingJobCtrl  │   │
│  │ /queue/*        │  │ /queue/sessions/*│  │ /queue/jobs/*    │   │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬─────────┘   │
└───────────┼─────────────────────┼─────────────────────┼─────────────┘
            │                     │                     │
┌───────────┼─────────────────────┼─────────────────────┼─────────────┐
│           ▼                     ▼                     ▼             │
│                        Application Layer                             │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ QueueManagement │  │ ProposalResponse │  │  MatchingJob     │   │
│  │    Service      │  │    Service       │  │    Service       │   │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬─────────┘   │
└───────────┼─────────────────────┼─────────────────────┼─────────────┘
            │                     │                     │
┌───────────┼─────────────────────┼─────────────────────┼─────────────┐
│           ▼                     ▼                     ▼             │
│                          Domain Layer                                │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │   MatchQueue    │  │   MatchSession   │  │  MatchingEngine  │   │
│  │    Entity       │  │     Entity       │  │ + ScoringService │   │
│  └─────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                      │
│  Value Objects: TimeWindow, GeoPoint, PreferencesSnapshot            │
└──────────────────────────────────────────────────────────────────────┘
            │                     │                     │
┌───────────┼─────────────────────┼─────────────────────┼─────────────┐
│           ▼                     ▼                     ▼             │
│                       Infrastructure Layer                           │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  PostgreSQL     │  │     Redis        │  │    WebSocket     │   │
│  │  Repositories   │  │    Adapter       │  │     Server       │   │
│  └─────────────────┘  └──────────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## API Reference

Base path: `/queue`

All endpoints require JWT authentication.

### 1. Join Queue

Join the matching queue to find a match.

**Endpoint**: `POST /queue/join`

**Request Body**:
```json
{
  "location": {
    "lat": 10.7769,
    "lng": 106.7009,
    "placeId": "ChIJ0T2NLikpdTERKxE8d61aX_E"  // optional
  },
  "timeWindow": {  // optional - omit for "Match Now"
    "start": "2025-12-03T14:00:00Z",
    "end": "2025-12-03T20:00:00Z"
  }
}
```

**Validation Rules**:
- `lat`: -90 to 90 (required)
- `lng`: -180 to 180 (required)
- `timeWindow.start/end`: ISO 8601 UTC format, must end with 'Z'
- `timeWindow.end` must be after `timeWindow.start`

**Success Response** (201 Created):
```json
{
  "success": true,
  "queueEntry": {
    "queueId": "uuid",
    "position": 5,
    "joinedAt": "2025-12-03T14:00:00Z",
    "timeWindow": {
      "start": "2025-12-03T14:05:00Z",
      "end": "2025-12-03T20:00:00Z"
    }
  }
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid location or time window |
| 409 | `AlreadyInQueueError` | User already has active queue |
| 409 | `ActiveSessionExistsError` | User has pending match session |
| 429 | `DailyLimitExceededError` | Exceeded daily join/match limit |

**Business Rules**:
- One active queue per user
- Max 10 joins per day
- Max 3 confirmed matches per day
- If no `timeWindow` provided: auto-generates [now+5min, now+6h]

---

### 2. Leave Queue

Leave the matching queue voluntarily.

**Endpoint**: `POST /queue/leave`

**Request Body**: None (user ID from auth context)

**Success Response** (200 OK):
```json
{
  "success": true,
  "queueId": "uuid"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 404 | `NoActiveQueueError` | No active queue found |
| 409 | `ActiveSessionExistsError` | Cannot leave with active session |

**Business Rules**:
- Can only leave if status is `queued` or `broadening`
- Cannot leave if has active match proposal

---

### 3. Get Queue Status

Get current queue and session status.

**Endpoint**: `GET /queue/status`

**Success Response** (200 OK):
```json
{
  "success": true,
  "inQueue": true,
  "status": "proposed",
  "queueId": "uuid",
  "joinedAt": "2025-12-03T14:00:00Z",
  "activeSessionId": "session-uuid",
  "session": {
    "sessionId": "session-uuid",
    "state": "pending",
    "myDecision": null,
    "peerDecision": null,
    "peer": {
      "id": "peer-uuid",
      "displayName": "John",
      "avatarUrl": "https://...",
      "bio": "..."
    },
    "expiresAt": "2025-12-03T14:03:00Z"
  }
}
```

**Queue Status Values**:
- `queued`: Actively waiting (< 7 min)
- `broadening`: Extended search criteria (>= 7 min)
- `proposed`: Has active match proposal
- `matched`: Successfully matched
- `cancelled`: User left or rejected
- `expired`: Timeout without match

---

### 4. Respond to Proposal

Accept or decline a match proposal.

**Endpoint**: `POST /queue/sessions/:sessionId/proposal/respond`

**Request Body**:
```json
{
  "decision": "yes"  // or "no"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "newState": "confirm",
  "message": "Match confirmed! You're now connected."
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid decision | Must be "yes" or "no" |
| 403 | `UserNotInSessionError` | User not part of session |
| 404 | `MatchSessionNotFoundError` | Session not found |
| 409 | `AlreadyRespondedError` | Already responded |
| 409 | `InvalidSessionStateError` | Session expired or invalid |

**Decision Flow**:

| Your Decision | Peer Decision | Result |
|---------------|---------------|--------|
| YES | YES | `confirm` - Both matched! |
| YES | NO | `declined` - You return to queue |
| YES | (waiting) | `pending` - Waiting for peer |
| NO | (any) | `declined` - You leave queue |

---

### 5. Admin: Run Matching Scan

Manually trigger the matching algorithm.

**Endpoint**: `POST /queue/jobs/run-scan`

**Response**:
```json
{
  "success": true,
  "message": "Scan complete"
}
```

---

### 6. Admin: Cleanup Expired

Clean up expired proposals.

**Endpoint**: `POST /queue/jobs/cleanup-expired`

**Response**:
```json
{
  "success": true,
  "message": "Cleanup completed"
}
```

---

### 7. Admin: Reconcile

Sync Redis with database.

**Endpoint**: `POST /queue/jobs/reconcile`

**Response**:
```json
{
  "success": true,
  "message": "Reconciliation completed"
}
```

---

## Matching Algorithm

### Scoring Formula

```
totalScore = distanceScore + preferencesScore + waitingBoost
```

**Maximum possible score**: 80 points

### Distance Scoring (0-20 points)

| Distance | Score |
|----------|-------|
| 0-3 km | 20 pts |
| 3-5 km | 15 pts |
| 5-10 km | 10 pts |
| 10-20 km | 5 pts |
| > 20 km | 0 pts |

### Preference Scoring (0-40 points)

| Question | Max Points | Logic |
|----------|------------|-------|
| Purpose (studying/dating) | 10 pts | Same = 10, Different = 0 |
| Style (quiet/loud/flexible) | 10 pts | Same OR either flexible = 10 |
| Field preference | 15 pts | Complex matching logic |
| Location preference | 10 pts | Overlap-based scoring |

### Waiting Boost (0-20 points)

- +2 points per minute waiting
- Capped at 20 points (10 min)

### Dynamic Threshold

Score required decreases with wait time:

| Wait Time | Threshold |
|-----------|-----------|
| 0-1 min | 60 pts |
| 1-3 min | 50 pts |
| 3-5 min | 40 pts |
| 5-7 min | 30 pts |
| 7+ min (broadening) | 0 pts |

### Algorithm Steps

1. **Filter**: Remove expired time windows
2. **Generate Pairs**: O(n²) with early exits
   - Skip if recently rejected each other (`lastPeerUserId`)
   - Skip if time windows don't overlap (min 2 hours)
   - Skip if distance > 10 km
   - Skip if score < threshold
3. **Greedy Selection**: Sort by score, select non-overlapping pairs

### Scalability: Partitioned Matching

When user count > 500, uses geographic partitioning:
- Divides into 5km × 5km grid cells
- Processes each cell with neighbors
- Reduces complexity from O(n²) to O((n/k)² × k²)

---

## WebSocket Events

Connection: `/ws/matching`

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `match_proposed` | `{ sessionId, peer, expiresAt }` | New match proposal |
| `peer_decision` | `{ sessionId, decision }` | Peer responded |
| `match_confirmed` | `{ sessionId, peer }` | Both accepted |
| `match_declined` | `{ sessionId }` | Someone rejected |
| `match_expired` | `{ sessionId }` | Proposal timed out |

### Event Payload Examples

**match_proposed**:
```json
{
  "sessionId": "uuid",
  "peer": {
    "id": "uuid",
    "displayName": "Jane",
    "avatarUrl": "https://...",
    "bio": "Coffee lover"
  },
  "expiresAt": "2025-12-03T14:03:00Z"
}
```

---

## Database Schema

### match_queues

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User reference |
| status | ENUM | queued/broadening/proposed/matched/cancelled/expired |
| time_window | TSTZRANGE | Start-end time range |
| match_point | GEOGRAPHY | PostGIS point (lat/lng) |
| district | TEXT | Optional location name |
| joined_at | TIMESTAMPTZ | Original join timestamp |
| updated_at | TIMESTAMPTZ | Last update |
| broadened | BOOLEAN | Has entered broadening |
| broaden_after_at | TIMESTAMPTZ | When to broaden |
| active_session_id | UUID | Current session (if proposed) |
| last_peer_user_id | UUID | Last rejected peer (avoid re-match) |
| prefs_snapshot | JSONB | Preferences at join time |

### match_sessions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_a_id | UUID | First user |
| user_b_id | UUID | Second user |
| queue_a_id | UUID | First user's queue |
| queue_b_id | UUID | Second user's queue |
| state | ENUM | pending/confirm/declined/expired |
| a_decision | ENUM | yes/no/none |
| b_decision | ENUM | yes/no/none |
| request_expires_at | TIMESTAMPTZ | Proposal TTL |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update |

---

## Configuration

Key parameters in `matchingConfig.ts`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MATCHING_JOB_INTERVAL` | 30s | Matching scan frequency |
| `MATCHING_JOB_LOCK_TTL` | 25s | Distributed lock TTL |
| `EXPIRY_CLEANUP_INTERVAL` | 60s | Expired proposal cleanup |
| `MAX_RADIUS_KM` | 10 | Maximum matching distance |
| `GRID_CELL_SIZE_KM` | 5 | Partition cell size |
| `MAX_LIFETIME_MINUTES` | 30 | Queue auto-expiry |
| `BROADEN_AFTER_MINUTES` | 7 | When to relax criteria |
| `MAX_JOIN_PER_DAY` | 10 | Daily join limit |
| `MAX_MATCHES_PER_DAY` | 3 | Daily match limit |
| `PROPOSAL_TTL_MS` | 180000 | 3 min proposal timeout |
| `MIN_OVERLAP_MINUTES` | 120 | Min time window overlap |

---

## File Structure

```
src/modules/matching/
├── api/
│   ├── MatchQueueController.ts      # Queue endpoints
│   ├── MatchSessionController.ts    # Session endpoints
│   ├── MatchingJobController.ts     # Admin job endpoints
│   └── JoinQueueValidator.ts        # Zod validation
├── application/
│   └── services/
│       ├── QueueManagementService.ts
│       ├── ProposalResponseService.ts
│       └── MatchingJobService.ts
├── domain/
│   ├── entities/
│   │   ├── MatchQueue.ts
│   │   └── MatchSession.ts
│   ├── value-objects/
│   │   ├── TimeWindow.ts
│   │   ├── GeoPoint.ts
│   │   └── PreferencesSnapshot.ts
│   ├── matching-engine/
│   │   ├── MatchingEngine.ts
│   │   ├── PartitionedMatchingEngine.ts
│   │   └── ScoringService.ts
│   └── ports/
│       ├── IMatchQueueRepository.ts
│       └── IMatchSessionRepository.ts
├── infrastructure/
│   ├── repositories/
│   │   ├── MatchQueueRepositoryPg.ts
│   │   └── MatchSessionRepositoryPg.ts
│   ├── RedisMatchQueueAdapter.ts
│   └── MatchWebSocketServer.ts
└── events/
    └── index.ts
```

---

## Related Documentation

- [Frontend Integration Guide](../MATCH_QUEUE_FRONTEND_INTEGRATION.md) - WebSocket and REST API for frontend
- [Matching Flow Diagram](../MATCHING_FLOW.mmd) - Visual flowchart (Mermaid)
