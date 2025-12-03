# Avatar Upload Feature

## Overview

The avatar upload feature allows users to upload profile pictures that are automatically processed into multiple sizes and stored in Cloudflare R2 object storage. The system generates five optimized WebP images for different use cases across the application.

### Key Features

- Multi-size avatar generation (32px, 64px, 128px, 256px, 512px)
- Automatic image optimization and format conversion to WebP
- Cloudflare R2 storage integration
- Cache busting via version parameters
- Metadata stripping for privacy
- EXIF-based auto-rotation
- Validation for file size and type

### Architecture

```
┌─────────────────┐
│   Client App    │
│  (Mobile/Web)   │
└────────┬────────┘
         │ POST /users/avatar
         │ (multipart/form-data)
         ▼
┌─────────────────────────────────────────────────────────┐
│                    Avatar Router                        │
│  - Multer middleware (file validation & upload)         │
│  - Error handling                                       │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                   Avatar Service                        │
│  1. Validate file (size, type)                          │
│  2. Process image (Sharp):                              │
│     - Auto-rotate based on EXIF                         │
│     - Strip metadata                                    │
│     - Generate 5 sizes in parallel                      │
│     - Convert to WebP                                   │
│  3. Upload to R2 (5 files in parallel)                  │
│  4. Update database (avatar metadata)                   │
│  5. Emit AvatarUploadedEvent                            │
└────────┬────────────────────────────────────────────────┘
         │
         ├───────────────────┬────────────────┐
         ▼                   ▼                ▼
┌──────────────┐    ┌──────────────┐   ┌──────────────┐
│  R2 Storage  │    │  PostgreSQL  │   │  Event Bus   │
│              │    │              │   │              │
│ avatars/     │    │ user_profiles│   │ Analytics    │
│ {userId}/    │    │ - avatar_key │   │ Webhooks     │
│ 32.webp      │    │ - version    │   │ Logs         │
│ 64.webp      │    │ - uploaded_at│   │              │
│ 128.webp     │    │              │   │              │
│ 256.webp     │    │              │   │              │
│ 512.webp     │    │              │   │              │
└──────────────┘    └──────────────┘   └──────────────┘
         │
         │ Public URL
         ▼
┌─────────────────────────────────────────────────────────┐
│  https://{bucket}.r2.dev/avatars/{userId}/{size}.webp  │
│  ?v={version}                                           │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Cloudflare R2** | Object storage (S3-compatible) | Latest |
| **Sharp** | High-performance image processing | ^0.33.5 |
| **Multer** | Multipart/form-data file uploads | ^1.4.5-lts.1 |
| **AWS SDK S3** | R2 client (S3-compatible API) | ^3.x |

---

## API Reference

All endpoints require authentication via JWT Bearer token.

### Upload Avatar

Upload a new profile picture. Replaces any existing avatar.

**Endpoint**: `POST /users/avatar`

**Authentication**: Required (JWT Bearer token)

**Content-Type**: `multipart/form-data`

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `avatar` | File | Yes | Image file (JPEG, PNG, or WebP) |

**File Requirements**:
- Maximum size: 5MB (configurable)
- Allowed types: `image/jpeg`, `image/png`, `image/webp`
- Minimum dimensions: 64x64 pixels

**Success Response** (200 OK):

```json
{
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

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `No file uploaded` | Missing file in request |
| 400 | `File size exceeds 5.0MB limit` | File too large |
| 400 | `Invalid file type...` | Wrong MIME type |
| 400 | `Image must be at least 64x64 pixels` | Image too small |
| 401 | `Unauthorized` | Missing or invalid JWT |
| 500 | `Failed to upload avatar` | Server error |
| 503 | `Avatar storage is not configured` | R2 not configured |

**cURL Example**:

```bash
curl -X POST https://api.coner.vn/users/avatar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "avatar=@/path/to/image.jpg"
```

**JavaScript Example**:

```javascript
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);

const response = await fetch('https://api.coner.vn/users/avatar', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(result.sizes);
```

---

### Get Avatar URLs

Retrieve avatar URLs for all sizes of the current user.

**Endpoint**: `GET /users/avatar`

**Authentication**: Required (JWT Bearer token)

**Success Response** (200 OK):

```json
{
  "hasAvatar": true,
  "urls": {
    "32": "https://pub-xxx.r2.dev/avatars/user-123/32.webp?v=1732768800000",
    "64": "https://pub-xxx.r2.dev/avatars/user-123/64.webp?v=1732768800000",
    "128": "https://pub-xxx.r2.dev/avatars/user-123/128.webp?v=1732768800000",
    "256": "https://pub-xxx.r2.dev/avatars/user-123/256.webp?v=1732768800000",
    "512": "https://pub-xxx.r2.dev/avatars/user-123/512.webp?v=1732768800000"
  }
}
```

**No Avatar Response** (200 OK):

```json
{
  "hasAvatar": false,
  "urls": null
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `Unauthorized` | Missing or invalid JWT |

**cURL Example**:

```bash
curl -X GET https://api.coner.vn/users/avatar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Delete Avatar

Remove the user's avatar from both storage and database.

**Endpoint**: `DELETE /users/avatar`

**Authentication**: Required (JWT Bearer token)

**Success Response** (200 OK):

```json
{
  "message": "Avatar deleted successfully"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `Unauthorized` | Missing or invalid JWT |
| 500 | `Failed to delete avatar` | Server error |

**cURL Example**:

```bash
curl -X DELETE https://api.coner.vn/users/avatar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Avatar Sizes

The system generates five sizes for each uploaded avatar, all in WebP format:

| Size (px) | Use Case | Example Usage |
|-----------|----------|---------------|
| **32** | Tiny | Notifications, inline mentions, status indicators |
| **64** | Small | Chat message bubbles, user lists, compact UI |
| **128** | Medium (Default) | Profile cards, search results, standard display |
| **256** | Large | Profile pages, headers, detailed views |
| **512** | Extra Large | Modals, full profile view, high-resolution displays |

### Format Details

- **Output Format**: WebP
- **Quality**: 85% (configurable in code)
- **Compression**: Optimized with Sharp (effort: 4)
- **Metadata**: Stripped for privacy (EXIF, IPTC, XMP removed)
- **Auto-rotation**: Applied based on EXIF orientation before stripping

### Storage Structure

R2 object keys follow this pattern:

```
avatars/{userId}/{size}.webp
```

**Examples**:
```
avatars/550e8400-e29b-41d4-a716-446655440000/32.webp
avatars/550e8400-e29b-41d4-a716-446655440000/64.webp
avatars/550e8400-e29b-41d4-a716-446655440000/128.webp
avatars/550e8400-e29b-41d4-a716-446655440000/256.webp
avatars/550e8400-e29b-41d4-a716-446655440000/512.webp
```

### Cache Busting

All URLs include a version parameter (`?v={timestamp}`) for cache invalidation:

```
https://pub-xxx.r2.dev/avatars/user-123/128.webp?v=1732768800000
```

The version is a Unix timestamp (milliseconds) set when the avatar is uploaded. When a new avatar is uploaded, the version changes, forcing browsers and CDNs to fetch the new image.

---

## Configuration

### Environment Variables

Add these variables to your environment file (`env/.env.development` or `env/.env.production`):

#### Required R2 Configuration

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `R2_ACCOUNT_ID` | String | Cloudflare account ID | `a1b2c3d4e5f6g7h8i9j0` |
| `R2_ACCESS_KEY_ID` | String | R2 API token access key | `abc123def456...` |
| `R2_SECRET_ACCESS_KEY` | String | R2 API token secret key | `xyz789uvw012...` |
| `R2_BUCKET_NAME` | String | R2 bucket name | `coner-avatars` |
| `R2_PUBLIC_URL` | URL | Public URL for bucket | `https://pub-xxx.r2.dev` |

#### Optional Avatar Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AVATAR_MAX_SIZE_BYTES` | Number | `5242880` | Max upload size (5MB) |
| `AVATAR_ALLOWED_TYPES` | String | `image/jpeg,image/png,image/webp` | Allowed MIME types |

### Example Configuration

**.env.development**:
```env
# Cloudflare R2
R2_ACCOUNT_ID=a1b2c3d4e5f6g7h8i9j0
R2_ACCESS_KEY_ID=abc123def456ghi789jkl012
R2_SECRET_ACCESS_KEY=xyz789uvw012rst345mno678
R2_BUCKET_NAME=coner-avatars-dev
R2_PUBLIC_URL=https://pub-1234567890abcdef.r2.dev

# Avatar Settings (optional)
AVATAR_MAX_SIZE_BYTES=10485760  # 10MB for development
AVATAR_ALLOWED_TYPES=image/jpeg,image/png,image/webp
```

**.env.production**:
```env
# Cloudflare R2
R2_ACCOUNT_ID=a1b2c3d4e5f6g7h8i9j0
R2_ACCESS_KEY_ID=prod_abc123def456ghi789jkl012
R2_SECRET_ACCESS_KEY=prod_xyz789uvw012rst345mno678
R2_BUCKET_NAME=coner-avatars-prod
R2_PUBLIC_URL=https://avatars.coner.vn  # Custom domain (recommended)

# Avatar Settings
AVATAR_MAX_SIZE_BYTES=5242880  # 5MB
AVATAR_ALLOWED_TYPES=image/jpeg,image/png,image/webp
```

---

## Cloudflare R2 Setup Guide

### Step 1: Create R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage** in the left sidebar
3. Click **Create bucket**
4. Enter bucket name: `coner-avatars-dev` (or `coner-avatars-prod`)
5. Choose a location (automatic is fine)
6. Click **Create bucket**

### Step 2: Enable Public Access

> **Warning**: This method is suitable for development but NOT recommended for production. See [Production Security Considerations](#production-security-considerations) below.

1. Go to your bucket in the R2 dashboard
2. Click **Settings** tab
3. Scroll to **Public access**
4. Click **Allow Access**
5. Click **Connect Domain** (or use the auto-generated `*.r2.dev` subdomain)
6. For development: Copy the `https://pub-xxx.r2.dev` URL
7. Set this as your `R2_PUBLIC_URL` environment variable

### Step 3: Create API Token

1. In the R2 dashboard, click **Manage R2 API Tokens** (top right)
2. Click **Create API token**
3. Configure the token:
   - **Token name**: `coner-backend-dev` (or `coner-backend-prod`)
   - **Permissions**:
     - Read: ✓ (enabled)
     - Edit: ✓ (enabled)
   - **Scope**:
     - Apply to specific buckets only
     - Select your bucket: `coner-avatars-dev`
4. Click **Create API Token**
5. Copy the credentials:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
   - **Account ID** → `R2_ACCOUNT_ID`

> **Important**: Save these credentials immediately. The secret access key will not be shown again.

### Step 4: Configure CORS (Optional)

If you need to access avatars from a web application on a different domain:

1. Go to your bucket settings
2. Click **CORS Policy** tab
3. Add a CORS rule:

```json
[
  {
    "AllowedOrigins": [
      "https://coner.vn",
      "https://app.coner.vn",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

4. Save the CORS policy

### Step 5: Verify Configuration

Test your R2 setup with a simple curl command:

```bash
# Upload a test file
curl -X PUT "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/test.txt" \
  -H "Content-Type: text/plain" \
  -H "Authorization: AWS4-HMAC-SHA256 ..." \
  -d "Hello R2"

# Or use the AWS CLI
aws s3 cp test.txt s3://coner-avatars-dev/test.txt \
  --endpoint-url https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com \
  --profile r2
```

---

## Production Security Considerations

> **Critical**: The current development setup uses public R2 buckets with `*.r2.dev` subdomains. This is NOT secure or scalable for production.

### Current Setup (Development Only)

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ Direct public access
       ▼
┌──────────────────────────────┐
│  https://pub-xxx.r2.dev/     │  ⚠️ PUBLIC
│  avatars/user-123/128.webp   │
└──────────────────────────────┘
```

**Limitations**:
- Direct R2 URLs are not cached globally
- No DDoS protection
- No rate limiting
- Generic domain (not branded)
- Limited control over access patterns

---

### Recommended Production Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────┐
│  Cloudflare CDN              │
│  https://avatars.coner.vn/   │  ✓ Custom Domain
└──────┬───────────────────────┘  ✓ Global CDN
       │                           ✓ DDoS Protection
       │                           ✓ Cache Rules
       ▼                           ✓ Rate Limiting
┌──────────────────────────────┐
│  R2 Bucket (Private)         │
│  Custom Domain Binding       │
└──────────────────────────────┘
```

---

### Production Implementation Checklist

#### 1. Custom Domain Setup

**Benefits**: Branding, CDN integration, better control

**Steps**:
1. Add `avatars.coner.vn` subdomain in Cloudflare DNS:
   ```
   Type: CNAME
   Name: avatars
   Target: YOUR_BUCKET.r2.cloudflarestorage.com
   Proxy: Enabled (orange cloud)
   ```

2. In R2 bucket settings:
   - Click **Settings** → **Custom Domains**
   - Click **Connect Domain**
   - Enter: `avatars.coner.vn`
   - Verify DNS setup

3. Update environment variable:
   ```env
   R2_PUBLIC_URL=https://avatars.coner.vn
   ```

#### 2. Access Control Options

Choose one of these approaches based on your security requirements:

**Option A: Public Read with Custom Domain (Simple)**
- Keep bucket public
- Use custom domain for CDN benefits
- Suitable if: Avatars don't contain sensitive information
- Setup time: 5 minutes

**Option B: Cloudflare Workers for Signed URLs (Balanced)**
- Make bucket private
- Create a Cloudflare Worker to generate signed URLs
- Add authentication and rate limiting in Worker
- Suitable if: Need moderate security and control
- Setup time: 1-2 hours

**Option C: Backend-Generated Presigned URLs (Most Secure)**
- Make bucket fully private
- Generate presigned URLs from backend on-demand
- Full control over access patterns
- Suitable if: Maximum security required
- Setup time: 2-4 hours

#### 3. CDN & Cache Configuration

In Cloudflare Dashboard → Rules → Page Rules (or Transform Rules):

```
URL Pattern: avatars.coner.vn/*

Settings:
- Cache Level: Standard
- Edge Cache TTL: 1 year
- Browser Cache TTL: 1 year
- Always Online: Off
```

Or using Cache Rules (recommended):

```yaml
When incoming requests match:
  - Hostname equals avatars.coner.vn
  - URI Path matches ^/avatars/.*\.webp$

Then:
  - Cache eligibility: Eligible for cache
  - Edge TTL: 1 year
  - Browser TTL: 1 year
  - Origin Cache Control: Off
```

#### 4. Rate Limiting

Protect upload endpoints from abuse:

**Backend Rate Limiting** (`src/modules/user/api/avatar.router.ts`):

```typescript
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 uploads per window
  message: 'Too many avatar uploads. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', uploadLimiter, upload.single('avatar'), ...);
```

**Cloudflare Rate Limiting** (Dashboard → Security → WAF):

```yaml
When incoming requests match:
  - Hostname equals api.coner.vn
  - URI Path equals /users/avatar
  - Method equals POST

Then:
  - Rate limit:
      - Requests: 10
      - Period: 60 seconds
      - Action: Block
```

#### 5. Content Moderation

**Option 1: Cloudflare AI Image Moderation**

Use Cloudflare Workers AI to scan uploaded images:

```typescript
// In avatar.service.ts - before upload
import { Ai } from '@cloudflare/ai';

const ai = new Ai(account);
const result = await ai.run('@cf/microsoft/resnet-50', {
  image: fileBuffer
});

if (result.inappropriate) {
  throw new AppError(400, 'Image contains inappropriate content');
}
```

**Option 2: AWS Rekognition or Google Vision API**

Integrate third-party moderation APIs for comprehensive checks.

**Option 3: Manual Review Queue**

Store uploads in a "pending" folder and require admin approval for first upload.

#### 6. Monitoring & Analytics

**R2 Analytics**:
1. Enable R2 Analytics in Cloudflare Dashboard
2. Track:
   - Storage usage
   - Request counts (GET, PUT, DELETE)
   - Bandwidth usage
   - Error rates

**Application Logging**:

```typescript
// In avatar.service.ts
import { logger } from '../../../shared/utils/logger';

await eventBus.emit('AvatarUploadedEvent', new AvatarUploadedEvent(
  userId,
  avatarUrl,
  version
));

logger.info('Avatar uploaded', {
  userId,
  size: fileBuffer.length,
  version,
  processingTime: Date.now() - startTime
});
```

**Alerts**:
- Set up alerts for:
  - Upload failures > 5% error rate
  - Storage usage > 80% of quota
  - Bandwidth spikes (potential attack)
  - Missing R2 credentials

#### 7. Backup & Disaster Recovery

**Cross-Region Replication** (Enterprise R2 only):
```bash
# Configure R2 replication to backup bucket
cloudflare r2 bucket create coner-avatars-backup --location=eu
cloudflare r2 bucket replicate coner-avatars --destination=coner-avatars-backup
```

**Scheduled Backups**:

Create a cron job or Cloudflare Worker to periodically backup avatar metadata:

```typescript
// Daily cron job
const avatarBackup = await db.query(`
  SELECT user_id, avatar_key, avatar_version, avatar_uploaded_at
  FROM user_profiles
  WHERE avatar_version IS NOT NULL
`);

await uploadToBackupStorage('avatar-metadata.json', JSON.stringify(avatarBackup));
```

#### 8. Cost Optimization

**Current R2 Pricing** (as of 2025):
- Storage: $0.015/GB/month
- Class A operations (PUT): $4.50/million
- Class B operations (GET): $0.36/million
- Egress: FREE (within Cloudflare network)

**Optimization Tips**:
1. Use Cloudflare CDN to reduce R2 GET requests
2. Set long cache TTLs (1 year for avatars)
3. Delete old avatar versions when new ones are uploaded (already implemented)
4. Consider lazy loading for smaller sizes
5. Monitor unused avatars (deleted users) and clean up

**Estimated Costs** (10,000 active users):
- Storage: ~5GB × $0.015 = $0.075/month
- Uploads: 10,000 users × 5 sizes × $4.50/million = $0.23/month
- GETs: Mostly cached by CDN = minimal
- **Total: ~$0.30/month**

---

### Migration Path: Dev → Production

1. **Week 1**: Set up custom domain (`avatars.coner.vn`)
2. **Week 2**: Implement rate limiting on upload endpoint
3. **Week 3**: Add content moderation (basic checks)
4. **Week 4**: Enable monitoring and alerts
5. **Week 5**: Test failover and backup procedures
6. **Week 6**: Load testing and performance optimization
7. **Production Launch**: Switch `R2_PUBLIC_URL` to custom domain

---

## Database Schema

### Migration: `09_add_avatar_metadata.sql`

```sql
-- Add avatar metadata columns to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_version BIGINT DEFAULT NULL;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_key TEXT DEFAULT NULL;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_uploaded_at TIMESTAMPTZ DEFAULT NULL;

-- Create partial index for optimizing queries for users with avatars
CREATE INDEX IF NOT EXISTS ix_user_profiles_has_avatar
  ON public.user_profiles(user_id)
  WHERE avatar_version IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.user_profiles.avatar_version IS
  'Unix timestamp (ms) for cache busting avatar URLs';
COMMENT ON COLUMN public.user_profiles.avatar_key IS
  'R2 object key for primary avatar (e.g., avatars/uuid/128.webp)';
COMMENT ON COLUMN public.user_profiles.avatar_uploaded_at IS
  'Timestamp when avatar was last uploaded';
```

### Schema Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `avatar_version` | BIGINT | Yes | NULL | Unix timestamp (ms) for cache busting |
| `avatar_key` | TEXT | Yes | NULL | R2 object key for primary avatar (128px) |
| `avatar_uploaded_at` | TIMESTAMPTZ | Yes | NULL | Timestamp of last upload (UTC) |

### Index

**Index Name**: `ix_user_profiles_has_avatar`

**Type**: Partial B-tree index

**Purpose**: Optimize queries that filter for users with avatars

**Query Example**:
```sql
-- This query uses the index efficiently
SELECT user_id, avatar_key, avatar_version
FROM user_profiles
WHERE avatar_version IS NOT NULL
LIMIT 100;
```

### Sample Data

```sql
-- User with avatar
user_id: '550e8400-e29b-41d4-a716-446655440000'
avatar_version: 1732768800000
avatar_key: 'avatars/550e8400-e29b-41d4-a716-446655440000/128.webp'
avatar_uploaded_at: '2025-11-28 10:30:00+00'

-- User without avatar
user_id: '650e8400-e29b-41d4-a716-446655440001'
avatar_version: NULL
avatar_key: NULL
avatar_uploaded_at: NULL
```

---

## File Structure

### New Files Created

```
src/
├── modules/user/
│   ├── api/
│   │   └── avatar.router.ts              # Avatar upload/get/delete endpoints
│   ├── application/
│   │   └── avatar.service.ts              # Business logic for avatar operations
│   ├── domain/
│   │   └── avatar.vo.ts                   # Avatar value object, constants
│   ├── infrastructure/
│   │   └── image-processor.ts             # Sharp image processing utilities
│   └── events/
│       ├── avatar-uploaded.event.ts       # Domain event for avatar uploads
│       └── avatar-uploaded.handler.ts     # Event handler (analytics, webhooks)
│
├── shared/storage/
│   └── r2.client.ts                       # Cloudflare R2 client wrapper
│
└── config/
    └── config.ts                          # Added R2 and avatar env vars

migrations/
└── 09_add_avatar_metadata.sql             # Database migration

docs/features/
└── avatar-upload.md                       # This documentation file
```

### Modified Files

```
src/
├── modules/user/
│   ├── api/
│   │   ├── user.router.ts                 # Mounted avatar router at /avatar
│   │   └── user.schemas.ts                # Added avatar-related schemas
│   ├── domain/
│   │   ├── user-profile.port.ts           # Added avatar repo methods
│   │   └── profile.entity.ts              # Added avatar properties
│   └── infrastructure/
│       ├── user-profile.repo.pg.ts        # Implemented avatar repo methods
│       └── profiles.repo.ts               # Updated profile queries
│
├── app.ts                                  # Registered avatar event handlers
│
└── package.json                            # Added Sharp, Multer, AWS SDK dependencies
```

### Dependencies Added

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.709.0",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.5"
  },
  "devDependencies": {
    "@types/multer": "^1.4.12"
  }
}
```

---

## Troubleshooting

### Upload Errors

#### Error: "Avatar storage is not configured"

**Cause**: R2 environment variables are missing or invalid.

**Solution**:
1. Verify all R2 env vars are set:
   ```bash
   echo $R2_ACCOUNT_ID
   echo $R2_ACCESS_KEY_ID
   echo $R2_SECRET_ACCESS_KEY
   echo $R2_BUCKET_NAME
   echo $R2_PUBLIC_URL
   ```

2. Check config validation in logs:
   ```bash
   npm run dev
   # Look for: "[env] loaded from: ..."
   ```

3. Test R2 connection manually:
   ```bash
   curl -X PUT "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/test.txt" \
     --aws-sigv4 "aws:amz:auto:s3" \
     --user "${R2_ACCESS_KEY_ID}:${R2_SECRET_ACCESS_KEY}" \
     -d "test"
   ```

---

#### Error: "File size exceeds 5.0MB limit"

**Cause**: Uploaded file is larger than the configured limit.

**Solution**:
1. Compress the image before uploading
2. Or increase the limit (not recommended):
   ```env
   AVATAR_MAX_SIZE_BYTES=10485760  # 10MB
   ```

---

#### Error: "Invalid file type. Allowed types: JPEG, PNG, WebP"

**Cause**: Unsupported file format (e.g., GIF, BMP, TIFF).

**Solution**:
1. Convert image to JPEG, PNG, or WebP before uploading
2. Or add support for more types (in `avatar.vo.ts`):
   ```typescript
   export const ALLOWED_MIME_TYPES = [
     'image/jpeg',
     'image/png',
     'image/webp',
     'image/gif',  // Add GIF support
   ] as const;
   ```

---

#### Error: "Image must be at least 64x64 pixels"

**Cause**: Uploaded image is too small to generate all required sizes.

**Solution**:
1. Upload a larger image (minimum 64x64 pixels)
2. The system will automatically resize it to all required sizes

---

### Processing Errors

#### Error: "Unable to read image dimensions"

**Cause**: Corrupted or invalid image file.

**Solution**:
1. Verify the file is a valid image:
   ```bash
   file image.jpg
   # Should output: "JPEG image data..."
   ```

2. Try re-saving the image in an image editor
3. Check file isn't truncated or corrupted

---

#### Slow Upload Performance

**Symptoms**: Upload takes > 5 seconds for a 2MB image.

**Causes**:
1. Sharp processing is slow (CPU-bound)
2. R2 upload latency
3. Large image dimensions

**Solutions**:
1. Check server CPU usage:
   ```bash
   top -o %CPU
   ```

2. Optimize Sharp processing:
   ```typescript
   // In image-processor.ts
   .webp({
     quality: 80,     // Reduce from 85
     effort: 2,       // Reduce from 4 (faster)
   })
   ```

3. Profile upload time:
   ```typescript
   const startTime = Date.now();
   await avatarService.uploadAvatar(...);
   console.log(`Upload took ${Date.now() - startTime}ms`);
   ```

4. Consider background processing for large images

---

### Storage Errors

#### Error: "Access Denied" from R2

**Cause**: Invalid or expired R2 API credentials.

**Solution**:
1. Verify credentials in Cloudflare Dashboard:
   - Go to R2 → Manage R2 API Tokens
   - Check token permissions (Read + Edit required)
   - Check token is not expired

2. Regenerate API token if needed

3. Update environment variables with new credentials

---

#### Error: "NoSuchBucket"

**Cause**: Bucket doesn't exist or name is wrong.

**Solution**:
1. List your R2 buckets:
   ```bash
   cloudflare r2 bucket list
   ```

2. Verify `R2_BUCKET_NAME` matches exactly

3. Create bucket if missing:
   ```bash
   cloudflare r2 bucket create coner-avatars-dev
   ```

---

### CDN & Cache Issues

#### Images not updating after re-upload

**Cause**: Browser or CDN cache is serving old version.

**Solution**:
1. The system uses version query parameters for cache busting
2. Verify the version changed in the response:
   ```json
   {
     "version": 1732768800000  // This should be a new timestamp
   }
   ```

3. Clear Cloudflare cache manually:
   - Dashboard → Caching → Configuration
   - Click "Purge Everything"

4. Force refresh in browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

#### CORS errors in browser console

**Error**: "Access to fetch at 'https://pub-xxx.r2.dev/...' from origin 'https://app.coner.vn' has been blocked by CORS policy"

**Solution**:
1. Add CORS policy to R2 bucket (see [Step 4: Configure CORS](#step-4-configure-cors-optional))

2. Verify CORS headers in response:
   ```bash
   curl -I -H "Origin: https://app.coner.vn" \
     https://pub-xxx.r2.dev/avatars/user-123/128.webp

   # Should include:
   # Access-Control-Allow-Origin: https://app.coner.vn
   ```

---

### Database Issues

#### Migration fails with "column already exists"

**Cause**: Migration was partially applied or run multiple times.

**Solution**:
1. The migration uses `IF NOT EXISTS`, so this shouldn't happen
2. If it does, manually verify column existence:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'user_profiles'
   AND column_name LIKE 'avatar%';
   ```

3. If columns exist but migration didn't complete:
   ```sql
   -- Manually create missing index
   CREATE INDEX IF NOT EXISTS ix_user_profiles_has_avatar
     ON public.user_profiles(user_id)
     WHERE avatar_version IS NOT NULL;
   ```

---

#### Avatar URLs return NULL for existing avatars

**Cause**: Database has `avatar_key` but missing `avatar_version`.

**Solution**:
1. Check database state:
   ```sql
   SELECT user_id, avatar_key, avatar_version
   FROM user_profiles
   WHERE avatar_key IS NOT NULL AND avatar_version IS NULL;
   ```

2. Regenerate versions for affected users:
   ```sql
   UPDATE user_profiles
   SET avatar_version = EXTRACT(EPOCH FROM avatar_uploaded_at) * 1000
   WHERE avatar_key IS NOT NULL AND avatar_version IS NULL;
   ```

---

### Performance Optimization

#### Reducing R2 Costs

1. **Enable CDN caching** (most important):
   - Use custom domain with Cloudflare CDN
   - Set long cache TTLs (1 year)
   - This reduces GET requests to R2 by 95%+

2. **Delete old avatars** when uploading new ones (already implemented)

3. **Lazy load avatars** in UI:
   ```javascript
   // Only load 128px by default
   // Load 512px on click/hover
   ```

4. **Monitor usage**:
   ```sql
   -- Count total avatars
   SELECT COUNT(*) FROM user_profiles WHERE avatar_version IS NOT NULL;

   -- Total storage estimate (5 sizes × avg 50KB per size)
   SELECT COUNT(*) * 5 * 50 / 1024 / 1024 AS storage_gb
   FROM user_profiles WHERE avatar_version IS NOT NULL;
   ```

---

#### Improving Upload Speed

1. **Reduce image quality** (trade-off with file size):
   ```typescript
   // In image-processor.ts
   .webp({ quality: 80, effort: 2 })  // Faster, slightly larger files
   ```

2. **Parallel processing** (already implemented):
   - All 5 sizes are processed in parallel
   - All 5 uploads to R2 are parallel

3. **Consider background jobs** for very large images:
   ```typescript
   // Option: Queue large uploads for background processing
   if (fileBuffer.length > 10 * 1024 * 1024) {  // > 10MB
     await jobQueue.add('process-avatar', { userId, fileBuffer });
     return { success: true, status: 'processing' };
   }
   ```

---

## Support & Resources

### Internal Documentation

- [API Reference](/docs/API.md)
- [Deployment Guide](/docs/DEPLOYMENT.md)
- [Database Schema](/docs/archive/DATABASE.md)

### External Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [Multer File Uploads](https://github.com/expressjs/multer)
- [AWS S3 SDK Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/)

### Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-28 | Initial implementation with R2 storage |

---

**Last Updated**: 2025-11-28
**Maintained By**: Coner Backend Team
**Status**: Production Ready (with security considerations for production deployment)
