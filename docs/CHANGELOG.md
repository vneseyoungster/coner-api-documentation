
All notable changes to the Coner Backend project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---
## [Unreleased]

### Changed

- **User Answer Schema Restructured** - Migrated from enum-based fields to numbered question format
  - Replaced `dating_style`, `match_preference`, `user_field`, `purpose` fields with `question_1`, `question_2`, `question_3`, `question_4`
  - `question_1`: Integer (1 or 2)
  - `question_2`: Integer (1, 2, or 3)
  - `question_3`: Integer array ([1], [2], or [1,2])
  - `question_4`: Integer array ([1], [2], [3], or [1,2,3])
  - Added `id` field (UUID) to user answer entity
  - Removed enum mapping layer (datingStyleMap, purposeMap, matchPreference mappings)
  - Database migration: `20251127060725_update-user-answer-fields.sql`

- **User Answer API Updates**
  - `GET /answers/check-exists` - New endpoint to check if user has submitted answers (returns `{ exists: boolean }`)
  - Request/response payloads now use numbered question format
  - Arrays in responses are automatically sorted ascending

### Added

- **User Preference Module** - Complete preference management system
  - `PUT /preferences` - Create/update user dating preferences
  - `GET /preferences` - Retrieve authenticated user's preferences
  - `GET /preferences/check-completed` - Check if user completed preference setup
  - `DELETE /preferences/:id` - Delete a preference
  - Preference fields: dating style, match preference, purpose
  - See `docs/API_ANSWER.md` for complete documentation

- **Matching Questions System** - Questionnaire for user matching
  - `GET /questions` - Fetch all active matching questions
  - Questions stored with JSONB options, weights, display order
  - Supports question versioning and activation status
  - See `docs/API_QUESTION.md` for complete documentation

- **User Answer System** - Store and manage questionnaire responses
  - `POST /answers` - Submit answers (one per user)
  - `PUT /answers` - Update existing answers (partial updates)
  - `GET /answers` - Retrieve user's answers
  - `GET /answers/check-exists` - Check if user has submitted answers
  - Question fields: `question_1` (1|2), `question_2` (1|2|3), `question_3` ([1]|[2]|[1,2]), `question_4` ([1]|[2]|[3]|[1,2,3])
  - See `docs/archive/user-preferences/API_ANSWER.md` for complete documentation

- **Match Queue System** - Core matching functionality
  - `POST /queue/join` - Join matching queue
  - **Match Now mode**: Immediate matching with auto-generated 2-hour time window
  - **Match Later mode**: Scheduled matching with custom time windows
  - Location support with lat/lng coordinates and optional placeId
  - Preferences snapshot captured at queue join time
  - Daily limit: Max 3 "match later" entries per day
  - See `docs/API_MATCHING.md` for complete documentation

- **Match Sessions** - Track match connections and lifecycle
  - Session states: pending → confirm/declined/expired
  - Initiator/respondent tracking with queue references
  - Optional greeting text (max 280 chars)
  - Auto-close on terminal states
  - Audit trail via match_session_histories table

- **Database Migrations for Matching** - Comprehensive PostgreSQL schema
  - `match_queues` table with PostGIS geography support
  - `match_sessions` table with state machine constraints
  - `match_queue_histories` and `match_session_histories` for audit trails
  - `matching_questions_meta` table for questionnaire config
  - `user_answer` table for storing user responses
  - Database-level constraints for business rules (one active queue per user, no overlapping time windows, daily limits)

- **Shared Infrastructure**
  - `src/shared/logging/logger.ts` - Centralized logging utility
  - `src/shared/utils/AppError.ts` - Custom error class for application errors
  - Enhanced error handling middleware with better error responses

- **Real-Time Chat System** - Complete WebSocket-based messaging implementation
  - Socket.io server with JWT authentication middleware
  - Redis adapter for multi-instance scaling
  - RabbitMQ worker for batch message persistence
  - Real-time message broadcasting via `send_message` / `new_message` events
  - Auto-join rooms based on user's accepted connections
  - Domain events (`MessageSentEvent`) for analytics integration
  - See `docs/CHAT_IMPLEMENTATION_PLAN.md` for architecture details

- **Chat HTTP Endpoints** - REST API for chat functionality
  - `GET /api/chat/history` - Fetch message history for a connection
  - `GET /api/chat/count` - Get total message count for a connection
  - `GET /api/chat/conversations` - Get user's conversation list with previews, unread counts, and pagination

- **Database Migrations for Chat**
  - `06_create_messages_table.sql` - Messages table with indexes
  - `07_add_chat_indexes.sql` - Performance indexes for conversation queries

- **Production Docker Configuration** - Added Redis and RabbitMQ to production deployment
  - Updated `docker-compose.prod.yml` with Redis and RabbitMQ services
  - Persistent volumes for data durability
  - Service dependencies for proper startup order

- **Development Token Endpoint** - Dev-only endpoint for generating test JWT tokens
  - New endpoint: `POST /dev/auth/token` - Generate single test token with default or custom credentials
  - New endpoint: `POST /dev/auth/tokens/batch` - Generate multiple test tokens (max 20 per request)
  - New endpoint: `DELETE /dev/auth/user/:userId` - Delete test users for cleanup
  - `DevTokenService` class with token generation and user management methods
  - Auto-creates test users with confirmed emails using Supabase Admin API
  - Environment protection: endpoints only available when `NODE_ENV=development`
  - Conditional router mounting in app.ts with console notification
  - Default test user: `test@coner.dev` with password `TestPassword123!`
  - Custom user creation support via request body (email, password, metadata)
  - Generates real Supabase JWT tokens that pass JWKS verification
  - Enables backend API testing without running mobile app
  - See `docs/DEV_TOKEN_ENDPOINT.md` for complete implementation guide

### Fixed

- **Profile Creation NOT NULL Constraint** - Fixed error when creating user profiles during authentication
  - Resolved `null value in column "full_name" violates not-null constraint` error
  - Added default empty string value to `full_name` column in migration 05
  - Issue: Migration 03 added `full_name NOT NULL` but `upsertOnLogin()` only inserts basic auth fields
  - Profile skeleton creation during first login now succeeds with default value
  - Users update `full_name` with real data via `PUT /users/profile-first` endpoint

- **JWT Token Verification** - Resolved "invalid or expired token" errors in production
  - Fixed incorrect JWKS URL format in deployment configuration
  - Corrected URL from `/auth/v1/jwks` to `/auth/v1/.well-known/jwks.json`
  - Updated `.env.droplet.template` with proper JWKS endpoint
  - Added comprehensive debug logging to `requireAuth` middleware for troubleshooting
  - Logs now include JWKS URL, issuer, token validation steps, and detailed error messages

- **Database Connection Issues** - Fixed IPv6 connectivity errors in production
  - Resolved `ENETUNREACH` errors when connecting to Supabase PostgreSQL
  - Database connection now properly uses IPv4 with SSL enabled
  - Added guidance for using Supabase connection pooler for improved reliability

### Added

- **Development Environment Configuration** - Created `.env.development` file for local development
  - Properly configured Supabase authentication settings
  - Redis and RabbitMQ marked as optional services
  - Uses Supabase PostgreSQL for both development and production

- **Deployment Documentation** - Improved deployment setup instructions
  - Documented `.env` file configuration for DigitalOcean droplet
  - Clarified environment file usage in Docker deployment
  - Added troubleshooting guide for JWT verification issues

### Planned

- Email verification flow for new users

- Password reset functionality via email

- Refresh token rotation mechanism

- Connections API (browse, request, accept/decline)

- Real-time messaging via WebSockets

- Location-based features (check-ins, nearby users)

- Safety features (block, report, moderation dashboard)

- Analytics integration (PostHog)

- OAuth providers (Google, LinkedIn, Apple)

- Unit and integration tests

---
## [0.5.0] - 2025-10-30

### Added

- **Extended user profile fields** - Comprehensive personal information support
  - New fields: `full_name`, `dob` (date of birth), `sex`, `phone_number`, `address`, `school`, `major`
  - Field-level validation with database constraints
  - Age validation: DOB must be within 150 years and not in future
  - Phone number validation: 8-20 characters, digits/+/-/spaces allowed
  - Unique phone number constraint for active users
  - Gender enum type (`male`, `female`, `other`)
  - Auto-update `updated_at` trigger on personal info changes

- **Profile update status tracking** - Track whether user has completed profile setup
  - New `has_updated_profile` boolean field in database
  - `GET /users/profile-updated` endpoint to check profile completion status
  - `POST /users/profile-updated` endpoint to set profile completion status
  - Enables frontend to guide users through onboarding flow

- **Swagger API Documentation** - Complete OpenAPI 3.0 specification
  - Interactive Swagger UI at `/api-docs` endpoint
  - OpenAPI spec available at `/api-docs.json`
  - Full documentation for all authentication and user profile endpoints
  - Request/response schemas matching Zod validation
  - Bearer JWT authentication scheme
  - API documentation guide in `docs/API_DOCUMENTATION.md`

### Changed

- **Profile repository interface** - Extended UserProfileRepository with new methods
  - Added `isProfileUpdated(userId)` method to check profile completion
  - Added `setProfileUpdatedStatus(userId, status)` method to update completion flag
  - Better separation of profile state management

- **Profile service layer** - New functions for profile status management
  - `isProfileUpdated` function with error handling
  - `setProfileUpdatedStatus` function with validation
  - Consistent error messaging for failed operations

### Database Changes

- **New migration**: `03_add_user_profile_details.sql`
  - Added 7 new columns for extended personal information
  - Added CHECK constraints for DOB and phone number validation
  - Added unique index for phone numbers among active users
  - Added trigger function for auto-updating timestamps
  - Created trigger for automatic `updated_at` updates

- **New migration**: `04_add_have_update.sql`
  - Added `has_updated_profile` boolean column (default: false)
  - Enables tracking of first-time profile completion

### API Changes

- **New endpoint**: `GET /users/profile-updated`
  - Returns `{ isUpdated: boolean }` indicating profile completion status
  - Requires authentication

- **New endpoint**: `POST /users/profile-updated`
  - Request body: `{ status: boolean }`
  - Sets the profile completion status
  - Returns 200 on success
  - Requires authentication

### Security

- Phone number uniqueness enforced only for active (non-deleted) users
- Personal information changes automatically update timestamp for audit trail
- Profile status tracking helps identify incomplete user accounts

---
## [0.4.0] - 2025-10-25

### Added

- **Logout-all functionality** - Global logout mechanism that invalidates all user sessions
  - `POST /auth/logout-all` endpoint to revoke all refresh tokens
  - New `logout_at` column in `user_profiles` table for immediate token cutoff
  - Integration with Supabase Admin API for token revocation
  - Cache purging mechanism for instant auth state updates

- **Auto-profile creation** - `ensureProfile` middleware for automatic profile initialization
  - Creates user profile entry on first login if it doesn't exist
  - Updates `last_seen_at` timestamp with 60-second TTL caching
  - Captures user email from JWT during authentication

- **Enhanced authentication middleware** - Improved `requireAuth` implementation
  - Token cutoff validation using `logout_at` timestamp
  - Better error handling and JWT claim extraction
  - Cache invalidation support for logout flow

- **User profile repository architecture**
  - New port/adapter pattern with `UserProfileRepository` interface
  - PostgreSQL implementation (`user-profile.repo.pg.ts`)
  - `upsertOnLogin` method for efficient profile creation/update
  - `setGlobalLogout` method for logout timestamp management

### Changed

- **Profile field updates** - Restructured profile update validation and service logic
  - Improved validation schemas for profile updates
  - Cleaner separation between first-time setup and partial updates
  - Better field-level validation

- **Removed legacy database config** - Deleted `src/config/db.ts` in favor of centralized configuration

- **Refactored profile service** - Simplified profile update logic with better error handling

### Fixed

- **Profile repository** - Removed redundant code and improved query efficiency
  - Cleaned up `profiles.repo.ts` removing 95+ lines of duplicate code
  - Better type safety with explicit repository interfaces

### Database Changes

- **New migration**: `02_add_logout_at_to_user_profiles.sql`
  - Added `logout_at timestamptz` column to `user_profiles` table
  - Enables immediate session invalidation for security

### Security

- Enhanced logout mechanism prevents zombie sessions
- Immediate access token invalidation via database timestamp check
- Server-side refresh token revocation via Supabase Admin API

---
## [0.3.0] - 2025-10-19

### Added

- Comprehensive Product Requirements Document (PRD.md)

- Project changelog (CHANGELOG.md)

- Documentation directory structure
### Changed

- Updated README.md with clearer architecture explanation

- Improved code comments throughout the codebase
### Known Issues

- **CRITICAL:** Table name mismatch between migration (`user_profiles`) and application code (`profiles`)

- Event bus is in-memory only (not suitable for production multi-instance deployment)

- RabbitMQ configured but not implemented

- Email change functionality incorrectly blocks all email updates

- No rate limiting on any endpoints

  

---

  

## [0.2.0] - 2025-10-15

### Added

- Profile update API endpoints

- `PATCH /users/me-first` for first-time profile completion

- `PATCH /users/me` for partial profile updates

- Profile service business logic (`src/modules/user/application/profile.service.ts`)

- Validation for first-time setup (prevents re-initialization)

- Domain event emission on profile updates

- Validation schemas for profile updates

- `updateProfileSchemaFirst` (all fields required)

- `updateProfileSchema` (partial updates allowed)

- Dynamic profile update in repository with field-level granularity
### Changed

- **BREAKING:** Email and display name changes now blocked in profile update endpoints

- Previously allowed, now returns validation error

- Reason: Security consideration (requires separate verification flow)

- Improved `requireAuth` middleware implementation

- Better error handling

- Clearer JWT claim extraction

- Updated router to use new `requireAuth` middleware consistently

### Fixed

- Profile update now correctly emits `UserProfileUpdatedEvent`

- Repository `updateProfile` function now returns updated profile with all fields

### Security

- Added protection against profile re-initialization attempts

- Restricted email changes pending verification flow implementation

---
## [0.1.0] - 2025-10-01

### Added

#### Core Infrastructure

- Express.js application setup with TypeScript

- Environment configuration system with Zod validation

- Support for multiple environments (development, test, staging, production)

- Config files: `.env.{NODE_ENV}`

- PostgreSQL connection pooling

- Configurable pool size (min/max connections)

- Health check endpoint

- Redis client setup

- Connection via ioredis

- Key pattern definitions for sessions and user profiles

- Database migration system structure

- Migration runner script (`src/shared/database/migrate.ts`)

- Initial migration (`migrations/01_init_profile.sql`)

- Global error handling middleware

- Request validation middleware using Zod schemas

#### Authentication Module (`/auth`)

- Supabase Auth integration

- Email/password signup

- Email/password signin

- JWT token issuance and verification

- Auth API endpoints

- `POST /auth/signup` - User registration

- `POST /auth/signin` - User authentication

- `GET /auth/me` - Get authenticated user info

- `GET /auth/health` - Service health check

- `GET /auth/google/url` - Generate Google OAuth URL (test helper)

- `GET /auth/callback` - OAuth callback handler

- Auth middleware (`requireAuth`)

- JWT verification using JWKS (JSON Web Key Set)

- Token signature validation

- Issuer verification

- Attaches `req.user` to Express request

- Validation schemas

- `SignUpSchema` (email, password, displayName)

- `SignInSchema` (email, password)

  

#### User Profile Module (`/user`)

- Profile domain entity definition

- Professional fields (profession, company, bio)

- Skills array

- Work style preference (focus, collaborative, flexible)

- Social links (LinkedIn, portfolio)

- Metadata (created_at, updated_at, last_seen_at)

- Soft delete support

- Profile API endpoints

- `GET /users/me` - Get current user profile

- `PUT /users/me` - Update display name and avatar

- Profile repository

- `getProfileById` - Fetch profile by user ID

- `upsertMyProfile` - Insert or update profile

- Validation schemas

- `UpdateMeSchema` (display_name, avatar_url)

#### Event System

- Custom EventBus implementation

- In-memory event emitter

- Type-safe event handlers

- Async event handling support

- Domain events

- `UserProfileUpdatedEvent` - Emitted on profile changes

- Event handler registration system

#### Database Schema

Complete PostgreSQL schema with the following tables:

1. **user_profiles** - Main user data

- Core fields: display_name, email, profession, company

- Professional fields: bio, skills, work_style, years_experience

- Social links: avatar_url, linkedin_url, portfolio_url

- Metadata: created_at, updated_at, last_seen_at, is_deleted

- Constraints: unique email (active profiles only), work_style enum

- Triggers: auto-update updated_at timestamp

  

2. **user_preferences** - User settings and preferences

- Work preferences: work_mode, available_for, max_distance_km

- Notification settings: push, email, matches, messages

- Quiet hours: start/end times

- FK to user_profiles with CASCADE delete

- Triggers: auto-update updated_at timestamp

  

3. **connections** - User-to-user relationships

- Fields: user1_id, user2_id, connection_type, status

- Connection metadata: initiator_id, match_score, mutual_skills

- Venue context: met_at_venue_id

- Timestamps: requested_at, responded_at

- Constraints: unique pair (A-B == B-A), no self-connections

- Indexes: user1, user2, initiator, status, requested_at

  

4. **user_blocks** - Block list

- Composite PK: (blocker_id, blocked_id)

- Fields: reason, created_at

- Constraint: prevent self-blocking

- Indexes: blocker_id, blocked_id

  

5. **user_reports** - Content moderation queue

- Fields: reporter_id, reported_user_id, reason, description

- Status workflow: pending → reviewed → resolved

- Timestamps: created_at, resolved_at

- Indexes: status, reporter_id, reported_user_id

  

6. **user_identities** - OAuth provider linkage

- Tracks Google, Apple, LinkedIn, etc.

- Composite PK: (user_id, provider)

- Fields: provider_user_id, provider_email

- Index: (provider, provider_user_id)

  

#### Shared Infrastructure

- PostgreSQL query helper with TypeScript generics

- Database health check utility

- Supabase client initialization

- Redis key pattern definitions

- CORS configuration

- JSON body parsing middleware

  

#### Development Tools

- TypeScript configuration

- Development server with hot reload (tsx watch)

- Build script (TypeScript compilation)

- Database migration runner script

  

### Configuration

- Environment variables schema

- NODE_ENV (development, test, staging, production)

- PORT (default: 8080)

- DATABASE_URL (PostgreSQL connection string)

- DB_POOL_MIN, DB_POOL_MAX (connection pool settings)

- REDIS_URL (Redis connection string)

- RABBITMQ_URL (RabbitMQ connection string)

- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

- SUPABASE_JWKS_URL, SUPABASE_ISSUER (JWT verification)

- APP_JWT_SECRET (application JWT signing key)

  

### Dependencies

- **Runtime:**

- express ^4.21.2 - Web framework

- @supabase/supabase-js ^2.75.0 - Supabase client

- pg ^8.16.3 - PostgreSQL driver

- ioredis ^5.8.1 - Redis client

- jose ^6.1.0 - JWT handling

- zod ^4.1.12 - Schema validation

- cors ^2.8.5 - CORS middleware

- dotenv ^17.2.3 - Environment variables

- amqplib ^0.10.4 - RabbitMQ client

  

- **Development:**

- typescript ^5.9.3

- tsx ^4.20.6 - TypeScript execution

- @types/* - Type definitions

- rimraf ^6.0.1 - Clean build directory

  

### Known Limitations

- No email verification flow

- No password reset functionality

- OAuth (Google) URL generation only, no complete flow

- Event bus is in-memory (single instance only)

- RabbitMQ configured but not implemented

- No rate limiting

- No request logging

- No tests

- No API documentation

  

---

  

## Project Structure

  

```

coner-backend/

├── src/

│ ├── api/

│ │ └── middleware/ # Global middleware (error handling, validation)

│ ├── config/ # Configuration files (env, db, redis, amqp)

│ ├── modules/

│ │ ├── auth/ # Authentication module

│ │ │ ├── api/ # Routes and schemas

│ │ │ ├── application/ # Business logic (signUp, signIn)

│ │ │ └── infrastructure/ # Auth middleware (requireAuth)

│ │ └── user/ # User profile module

│ │ ├── api/ # Routes and schemas

│ │ ├── application/ # Profile service

│ │ ├── domain/ # Profile entity definition

│ │ ├── events/ # Domain events

│ │ └── infrastructure/ # Profile repository

│ ├── shared/

│ │ ├── database/ # PostgreSQL and Supabase clients

│ │ └── events/ # Event bus implementation

│ ├── supabase/ # Supabase schema dump

│ ├── app.ts # Express app setup

│ ├── server.ts # HTTP server

│ ├── package.json

│ └── tsconfig.json

├── migrations/ # Database migrations

├── docs/ # Documentation

│ ├── PRD.md # Product Requirements Document

│ └── CHANGELOG.md # This file

└── README.md # Architecture overview

```

  

---

  

## Version History Summary



| Version | Date | Highlights |

|---------|------|------------|

| 0.5.0 | 2025-10-30 | Extended profile fields, profile status tracking, Swagger docs |

| 0.4.0 | 2025-10-25 | Logout-all functionality, auto-profile creation, enhanced auth |

| 0.3.0 | 2025-10-19 | Documentation: PRD, Changelog |

| 0.2.0 | 2025-10-15 | Profile updates, restrictions on email/name changes |

| 0.1.0 | 2025-10-01 | Initial release: Auth, Profile, Database schema |

  

---

  

## Migration Guide

### From 0.4.0 to 0.5.0

#### Database Migrations

1. **Run the new migrations:**
   ```bash
   npm run db:migrate
   ```
   This will:
   - Add extended profile fields (`full_name`, `dob`, `sex`, `phone_number`, `address`, `school`, `major`) via `03_add_user_profile_details.sql`
   - Add `has_updated_profile` tracking column via `04_add_have_update.sql`

#### Breaking Changes

- **New required field**: `full_name` is now a required (NOT NULL) field in the database
  - Existing users without a `full_name` value should be updated before migration
  - Consider running a data migration script to set default values if needed

#### New Features to Integrate

1. **Extended profile fields**: Users can now provide comprehensive personal information
   - Frontend forms should be updated to collect the new fields
   - First-time profile setup (`PUT /users/profile-first`) requires all fields
   - Subsequent updates (`PATCH /users/profile`) allow partial updates with locked fields

2. **Profile status tracking**: New endpoints to track onboarding completion
   - `GET /users/profile-updated` - Check if user has completed profile setup
   - `POST /users/profile-updated` - Mark profile as completed
   - Use this to guide users through onboarding flow

3. **Swagger documentation**: Interactive API documentation now available
   - Access Swagger UI at `/api-docs` endpoint
   - OpenAPI spec available at `/api-docs.json`
   - Use for API testing and client code generation

#### Code Changes Required

- Update profile repository mocks/tests to implement new `isProfileUpdated` and `setProfileUpdatedStatus` methods
- If you have custom profile forms, add the new fields with proper validation:
  - `full_name`: 1-255 characters (required)
  - `dob`: Valid date, age 0-150 years (required)
  - `sex`: Enum `male`, `female`, or `other` (required)
  - `phone_number`: 8-20 characters, digits/+/-/spaces only (required)
  - `address`: 1-500 characters (required)
  - `school`: 1-255 characters (required)
  - `major`: 1-255 characters (required)

#### Field-Level Restrictions

- **Locked after first setup**: `full_name` and `sex` cannot be changed after initial profile completion
- **Unique constraint**: Phone numbers must be unique among active (non-deleted) users
- **Age validation**: Date of birth must be within the last 150 years and not in the future

### From 0.3.1 to 0.4.0

#### Database Migrations

1. **Run the new migration:**
   ```bash
   npm run db:migrate
   ```
   This will add the `logout_at` column to the `user_profiles` table.

#### Breaking Changes

- **Repository Interface Changes**: If you're directly using the profile repository, note that it now implements the `UserProfileRepository` interface from `user-profile.port.ts`
- **Profile Service Refactoring**: Profile service method signatures have changed - review any direct service calls

#### New Features to Integrate

1. **Logout-all endpoint**: Available at `POST /auth/logout-all`
   - Requires authenticated user
   - Revokes all refresh tokens and invalidates active sessions

2. **Auto-profile creation**: The `ensureProfile` middleware automatically creates user profiles on first login
   - No manual profile creation needed for new users
   - Profile entries are created with user ID and email from JWT

#### Code Changes Required

- If you have custom authentication flows, ensure they're compatible with the new `logout_at` timestamp checking
- Update any profile repository mocks/tests to implement the new `UserProfileRepository` interface

### From 0.2.0 to 0.3.0

- No breaking changes

- New documentation files added to `/docs` directory



### From 0.1.0 to 0.2.0

  

#### Breaking Changes

1. **Email and display name changes blocked**

- Previously: `PATCH /users/me` allowed email and display_name updates

- Now: These fields are rejected with validation error

- **Action Required:** Remove any client code attempting to update email or display_name

- **Future:** Separate endpoints will be added for verified email changes

  

#### Database Migrations

- No schema changes in this version

- Existing data remains compatible

  

#### API Changes

- `PATCH /users/me-first` - New endpoint for first-time profile setup

- Requires all core fields (profession, company, bio, skills, work_style, years_experience)

- Can only be called once (subsequent calls return 400 error)

- `PATCH /users/me` - Now rejects `email` and `display_name` fields

- All other profile fields remain updateable

  

#### Environment Variables

- No new environment variables required

  

---

  

## Contributing

  

### Commit Message Format

  

We follow [Conventional Commits](https://www.conventionalcommits.org/):

  

```

<type>[optional scope]: <description>

  

[optional body]

  

[optional footer(s)]

```

  

**Types:**

- `feat:` - New feature

- `fix:` - Bug fix

- `docs:` - Documentation changes

- `style:` - Code style changes (formatting, missing semicolons, etc.)

- `refactor:` - Code refactoring (no functional changes)

- `perf:` - Performance improvements

- `test:` - Adding or updating tests

- `chore:` - Maintenance tasks (dependency updates, build config, etc.)

- `ci:` - CI/CD changes

  

**Examples:**

```

feat(auth): add password reset functionality

fix(profile): prevent duplicate first-time setup

docs: update API documentation for profile endpoints

refactor(events): extract event bus to shared module

test(auth): add integration tests for signup flow

```

  

### Pull Request Process

  

1. Create a feature branch from `dev`

```bash

git checkout -b feat/your-feature-name dev

```

  

2. Make your changes following the DDD module structure

  

3. Update relevant documentation

- Update CHANGELOG.md under `[Unreleased]`

- Update API specs in PRD.md if adding endpoints

- Add code comments for complex logic

  

4. Write tests (when test framework is set up)

  

5. Ensure code passes linting and builds successfully

```bash

npm run build

```

  

6. Submit PR to `dev` branch with description of changes

  

7. Address review feedback

  

8. Once approved, PR will be merged and changes included in next release

  

---

  

## Release Process


1. **Feature Development** → `dev` branch

2. **Release Preparation** → Create release branch `release/vX.Y.Z`

3. **Update Version** → Update `package.json` version and finalize `CHANGELOG.md`

4. **Testing** → Full QA on release branch

5. **Merge to Main** → Merge release branch to `main` with tag `vX.Y.Z`

6. **Deploy** → Deploy `main` branch to production

7. **Backmerge** → Merge `main` back to `dev`

  

---

  

## Support

  
For questions or issues:

- Create an issue on GitHub

- Contact the development team

- Refer to PRD.md for product specifications

- Check README.md for architecture overview

  

---

  

**Maintained by:** Coner Development Team

**Last Updated:** 2025-10-30