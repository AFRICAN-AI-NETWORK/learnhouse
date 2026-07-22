# LearnHouse — Comprehensive Offline-First Implementation Plan

## Executive Summary

This plan transforms LearnHouse from a fully server-dependent LMS into an offline-capable, progressive web application. The strategy is **offline-first reads, queued writes, selective media caching, and conflict-free sync on reconnection**. The implementation is organized into six layers that must be executed in strict dependency order: Storage Foundation → Service Worker Upgrade → Authentication → Data Synchronization → Media Pipeline → UI & UX Hardening. Each section identifies exact files to be created or modified, edge cases, and failure modes to guard against.

---

## Guiding Principles

**What will work offline:** Course browsing, chapter navigation, activity reading (text, PDFs, images, hosted video previously cached), trail progress, assignment draft writing, user profile viewing.

**What will gracefully degrade offline:** Search (returns cached results only), notifications (queued), chat (queued sends, cached history).

**What will be explicitly blocked offline:** Live sessions (Jitsi), AI chat, payments, admin analytics that require live aggregation, assignment binary file uploads, OAuth login for first-time users.

**Non-negotiable constraints:** No data integrity compromise, no token leakage via cached responses, no stale permissions served from cache, no silent data loss on sync failure.

---

## Layer 0 — Pre-Implementation Audit & Infrastructure Decisions

### 0.1 Dependency Decisions (resolve before writing a single line)

Before any code changes, make these four architectural decisions and document them in a new `apps/web/docs/offline-architecture.md` file that lives with the code:

**Decision A — Client Database Library.** Use Dexie.js as the IndexedDB abstraction layer. It has TypeScript generics, a Promises-based API, live queries, and a migration system that mirrors Alembic's versioned approach. Add it as a direct dependency in `apps/web/package.json`. Do not use raw IndexedDB — the verbosity and cross-browser quirks at scale are unmanageable.

**Decision B — Background Sync Strategy.** Use the native Background Sync API (`SyncManager`) with a Workbox `BackgroundSyncPlugin` fallback for browsers that lack native support. The fallback retries on next page load. Both paths write to the same IndexedDB outbox table, so recovery logic is unified.

**Decision C — Offline JWT Grace Period.** When a user is offline and their JWT has expired, the system will serve cached content for up to 72 hours using a "grace token" flag stored in the IndexedDB session record. The grace token does not allow any write operations — it is read-only. The moment connectivity is restored, the system immediately attempts a real refresh.

**Decision D — Storage Quota Policy.** The app will request persistent storage (`navigator.storage.persist()`) on first install. If denied, it will warn the user and cap cache usage at 200 MB, evicting least-recently-used assets beyond that limit. If granted, it targets up to 500 MB. These limits will be configurable via an environment variable in `apps/web/.env`.

### 0.2 Environment Variable Additions

Add the following to `apps/web/.env.example` and document them in the deployment guide:

- `OFFLINE_CACHE_MAX_MB` — maximum storage budget in megabytes (default 200)
- `OFFLINE_GRACE_PERIOD_HOURS` — how long a cached JWT is honoured offline (default 72)
- `OFFLINE_ENABLE_VIDEO_CACHE` — boolean, whether hosted video files are eligible for caching (default false, because video is large)
- `OFFLINE_SYNC_RETRY_MAX` — maximum Background Sync retry attempts before surfacing a permanent failure error (default 5)
- `DISABLE_PWA` — already exists, ensure it is honoured in all new worker config

### 0.3 turbo.json and pnpm Workspace Changes

Add `dexie` and `workbox-background-sync` to `apps/web/package.json`. Confirm `turbo.json` pipeline does not cache the `public/sw.js` output across builds — the service worker must always be regenerated fresh because its precache manifest is build-ID-stamped. Add `"public/sw.js"` and `"public/workbox-*.js"` to the `outputs` array of the `build` pipeline entry in `turbo.json` so Turborepo tracks them for invalidation.

---

## Layer 1 — Client-Side Storage Foundation

This layer establishes the local database that all other layers depend on. Nothing else starts until this is stable and tested.

### 1.1 New Directory: `apps/web/lib/offline/`

Create this directory. Every offline-specific module lives here to keep it isolated from the existing `services/` and `lib/` tree. This makes it easy to audit, test, and eventually extract.

### 1.2 `apps/web/lib/offline/db.ts` — Dexie Database Definition

This is the single source of truth for the client-side schema. Define one Dexie database class named `LearnHouseDB`. Version the schema starting at `1` and increment with each migration, mirroring how Alembic versions work.

**Tables and their indexed fields:**

`orgs` — stores the full organisation metadata object. Index on `slug` and `id`. The `slug` is the primary lookup key in all URL routes, so it must be indexed.

`courses` — stores course metadata. Index on `id`, `org_id`, `slug`. Store the full API response shape verbatim so no transformation is needed at render time.

`chapters` — stores chapter lists keyed to a course. Index on `id`, `course_id`. Store ordered arrays because chapter order matters for navigation.

`activities` — stores individual activity content. Index on `id`, `chapter_id`, `course_id`, `type`. The `type` index allows the service worker to make caching decisions based on activity type (e.g., skip LIVE_SESSION).

`blocks` — stores block content (quiz questions, PDF references, image references, video references). Index on `id`, `activity_id`. The `content` field is stored as a JSON blob.

`trails` — stores trail metadata and the user's current trail session. Index on `id`, `org_id`.

`trail_steps` — stores individual step records and completion state. Index on `id`, `trail_id`, `user_id`.

`user_progress` — stores the user's completion state per activity. Index on `user_id`, `activity_id`, `course_id`. This table is the primary reconciliation target on sync.

`assignments` — stores assignment metadata and task definitions. Index on `id`, `activity_id`.

`assignment_submissions` — stores the user's draft and submitted responses. Index on `id`, `assignment_id`, `user_id`. Must distinguish between `DRAFT` (local-only), `QUEUED` (pending sync), `SYNCED` (server-confirmed).

`outbox` — the write queue for all offline mutations. Index on `id`, `status`, `created_at`, `entity_type`. Fields: `id` (auto-increment), `type` (string enum of operation types), `url` (the API endpoint to replay), `method` (HTTP verb), `body` (serialised JSON payload), `headers` (object), `status` (`PENDING`, `RETRYING`, `FAILED`, `SYNCED`), `retry_count`, `created_at`, `last_attempt_at`, `error_message`.

`media_cache_index` — a record of which media URLs have been explicitly cached and their size, so the UI can show storage usage. Index on `url`, `course_id`, `cached_at`.

`sessions` — stores the offline session record. Only one row per user. Fields: `user_id`, `access_token`, `token_expiry`, `grace_until`, `user_metadata` (JSON), `org_permissions` (JSON map of org_id to role), `cached_at`.

`sync_metadata` — one row per entity type, tracks `last_synced_at` so incremental sync knows what to pull. Fields: `entity_type`, `last_synced_at`, `etag`.

`chat_messages` — stores cached conversation history. Index on `conversation_id`, `created_at`.

`collections` — stores collection metadata. Index on `id`, `org_id`.

`certifications` — stores issued certificate records. Index on `id`, `user_id`, `course_id`.

`members` — stores first-page org member list. Index on `org_id`, `user_id`.

`schedules` — stores calendar/schedule events. Index on `id`, `org_id`, `course_id`.

Define Dexie schema migrations starting at version 1 and describe each future schema change as a named migration with an `upgrade` function, exactly like Alembic does. Document a rule: every PR that touches the `LearnHouseDB` class must bump the version number and write the migration.

### 1.3 `apps/web/lib/offline/storage-policy.ts`

This module encapsulates all storage quota logic. It exports three functions:

`requestPersistentStorage()` — called once on app install. Calls `navigator.storage.persist()`. Records the result in `localStorage` under key `lh_storage_persistent`. If denied, sets a flag that the UI reads to show a warning banner.

`getStorageUsage()` — calls `navigator.storage.estimate()` and returns a structured object with `used`, `quota`, `percentUsed`, and `withinBudget` based on the configured `OFFLINE_CACHE_MAX_MB` environment variable.

`evictLRUMedia()` — queries `media_cache_index` ordered by `last_accessed_at`, calculates total stored size, and deletes from the Cache Storage API and `media_cache_index` table starting from the oldest entries until usage is under the budget limit. Must run atomically — if the Cache Storage delete succeeds but the DB row delete fails, the index is stale. Write the DB row deletion first; if it fails, abort without touching Cache Storage.

### 1.4 `apps/web/lib/offline/session-store.ts`

Manages the offline session record. Exports:

`saveOfflineSession(tokenPayload, userMetadata, orgPermissions)` — writes to the `sessions` table. Computes `grace_until` as `now + OFFLINE_GRACE_PERIOD_HOURS`. Must encrypt the `access_token` at rest using the Web Crypto API with a key derived from a device-bound secret. Do not store the raw JWT string in IndexedDB.

`getOfflineSession()` — retrieves and decrypts the session. Returns `null` if no session, `{valid, grace}` where `valid` means token is not expired and `grace` means within the grace period.

`clearOfflineSession()` — called on explicit logout. Must wipe the `sessions` table and trigger cache eviction of all user-specific data.

`isOfflineAuthValid()` — returns a boolean. True if `getOfflineSession()` returns a non-null result where either `valid` or `grace` is true.

**Security Edge Cases:**

- If the device clock is manipulated to extend `grace_until`, the system must not be fooled. Store the `grace_until` value as a server-issued timestamp recorded at login time, not computed purely from the client clock.
- Never expose the decrypted token in React state or any logging pathway.
- The Web Crypto key must not be derived from anything predictable. Use a random 256-bit key generated at install time and stored separately in `localStorage` as a base64 string. This is not secret from the user (they own the device) but prevents casual extraction of the token from a DB snapshot.

---

## Layer 2 — Service Worker Upgrade

The existing `next-pwa`/Workbox service worker only handles static asset precaching. This layer adds runtime caching, background sync, and the offline fallback.

### 2.1 `apps/web/next.config.js` — Extend `withPWA` Configuration

The `withPWA()` call must be extended with a `runtimeCaching` array. Each entry defines a URL pattern, a strategy, and options. Do not touch the existing `publicExcludes` or `buildExcludes` entries.

**Entry 1 — API GET routes (course, chapter, activity data):**
Pattern: `/api/v1/(courses|chapters|activities|blocks|trails|trail_steps|collections|orgs|users|certifications|assignments|schedule)`. Strategy: `NetworkFirst` with a cache name `lh-api-data-v1`, network timeout of 4 seconds, and `CacheableResponsePlugin` accepting only HTTP 200. The 4-second timeout means a slow connection still returns network data, but an offline or very slow connection falls back to cache within 4 seconds without making the user wait indefinitely. Expiry: 24 hours, max 500 entries.

**Entry 2 — S3 and filesystem media assets (images, PDFs):**
Pattern: matches the configured S3 bucket URL or the local filesystem content URL, pattern must be injected at build time from environment variable. Strategy: `CacheFirst` with a cache name `lh-media-v1`. `CacheableResponsePlugin` accepting 200 only. Expiry: 7 days, max 200 entries. This means once a learner has viewed an image or PDF, it is available offline for 7 days.

**Entry 3 — Next.js image optimisation endpoint (`/_next/image`):**
Strategy: `CacheFirst`, cache name `lh-images-v1`. Expiry: 3 days, max 300 entries.

**Entry 4 — Static assets already handled by precache.** Leave untouched.

**Entry 5 — Google Fonts or any external CDN fonts:** Strategy `StaleWhileRevalidate`, cache name `lh-fonts-v1`.

**Entry 6 — Umami analytics proxy routes:** Explicitly exclude from caching with a `NetworkOnly` entry so analytics events are never replayed from cache.

### 2.2 Custom Service Worker Additions via `customWorkerSrc`

`next-pwa` supports a `customWorkerSrc` directory that gets merged into the generated worker. Create `apps/web/worker/` directory and configure `customWorkerSrc: 'worker'` in the `withPWA` call.

### 2.3 `apps/web/worker/background-sync.js`

Registers a Background Sync event listener under the tag name `lh-outbox-sync`. On `sync` event for this tag, the worker:

1. Opens IndexedDB and queries all rows in `outbox` where `status = PENDING` or `status = RETRYING`.
2. For each row, attempts the stored HTTP request using `fetch()` with the stored URL, method, body, and headers.
3. On success (HTTP 2xx): marks the row `status = SYNCED` and records `last_attempt_at`.
4. On recoverable failure (HTTP 429, 503, network error): increments `retry_count`. If `retry_count` >= `OFFLINE_SYNC_RETRY_MAX`, marks `status = FAILED` and emits a push notification (if permission granted) notifying the user of a sync failure. Otherwise marks `status = RETRYING`.
5. On permanent failure (HTTP 400, 401, 403, 404, 409): marks `status = FAILED` immediately, records `error_message` from the response body, and emits a notification. These are not retriable — a 409 Conflict means the server rejected the mutation.
6. On completion, emits a `postMessage` to all active clients with a `sync-complete` event payload containing counts of synced, failed, and pending items.

The worker must process outbox items **sequentially per entity type**, not in parallel. A completion event for activity A must arrive before activity B's progress update, because the backend may have ordering constraints (e.g., a trail step cannot be marked complete before its prerequisite activity).

### 2.4 `apps/web/worker/offline-fallback.js`

Registers a `fetch` event handler as a final fallback:

- For navigation requests (page loads) that fail: serves the cached shell page from precache. This ensures the React app mounts even offline so React Router can handle the route.
- For API requests that fail (not matched by runtime caching because the response isn't cached yet): returns a structured JSON response `{ offline: true, data: null, error: "offline" }` with HTTP status 200. This prevents `fetch()` from throwing — it returns a consistent shape that all services can check.
- For media requests that fail: returns a local SVG placeholder image from precache (add `offline-placeholder.svg` to `apps/web/public/` and include it in precache).

### 2.5 `apps/web/public/manifest.json` — Additions

Add the following fields that are currently absent:

`prefer_related_applications: false` — prevents Android from showing a "use the native app" prompt.

`display_override: ["window-controls-overlay", "standalone"]` — enables richer desktop PWA chrome on Chromium.

`shortcuts` — add shortcut entries for "My Courses" and "My Trail" deep-linking to the correct org-scoped URLs. These appear in the OS jump list / right-click menu.

`file_handlers` — leave empty for now but document as a future extension point for handling `.pdf` and `.mp4` file associations.

`share_target` — leave empty for now; add in a future iteration for receiving shared content.

---

## Layer 3 — Authentication Hardening for Offline

### 3.1 `apps/web/app/auth/options.ts` — JWT Callback Extension

The existing JWT callback refreshes the token when it has less than 1 minute of life. This must be extended:

When the refresh call to the API fails because the network is unavailable (catch a `TypeError: Failed to fetch`), instead of returning the expired token and letting NextAuth invalidate the session, return the token with an additional field `offlineGrace: true` and `offlineGraceUntil: <timestamp>`. This field is checked in the session callback.

When the refresh call fails with an HTTP error (401, 403), do **not** grant grace — this means the server has revoked the session, and the user must be logged out regardless of network state.

Log all offline grace grants to the console in development and to Sentry in production with `level: "info"` so they are auditable without being noisy.

### 3.2 `apps/web/app/auth/options.ts` — Session Callback Extension

In the session callback, if `token.offlineGrace === true` and `Date.now() < token.offlineGraceUntil`, surface a session object that includes `session.isOfflineGrace = true`. This flag propagates to the React session context.

If `token.offlineGrace === true` and `Date.now() >= token.offlineGraceUntil`, return `null` to force re-authentication. The user's offline grace has expired.

### 3.3 `apps/web/components/Contexts/LHSessionContext.tsx` — Offline Awareness

The existing `LHSessionContext` handles inactivity detection and session management. Add the following:

A `connectionStatus` field with values `ONLINE`, `OFFLINE`, `DEGRADED`. This is derived from `navigator.onLine` plus a probe: every 30 seconds while online, the app pings `GET /api/v1/health` (a lightweight endpoint). If the ping fails three times consecutively, status becomes `DEGRADED`. If `navigator.onLine` is false, status is `OFFLINE`. Expose this via context.

A `isOfflineGrace` boolean derived from the session's `offlineGrace` flag. When true, a persistent banner is shown (implemented in Layer 6).

The inactivity logout logic must be **suspended** when `connectionStatus === OFFLINE`. A user reading course content offline should not be kicked out due to inactivity — they cannot re-authenticate anyway.

Register `window.addEventListener('online', ...)` and `window.addEventListener('offline', ...)` listeners in this context to update `connectionStatus` immediately on network change. On going back online, trigger a sync via `navigator.serviceWorker.ready.then(sw => sw.sync.register('lh-outbox-sync'))`.

### 3.4 `apps/web/services/utils/ts/requests.ts` — Request Interceptor Layer

All API calls in the `services/` tree ultimately go through this utility (or they should — audit and ensure they all do). Add an `offlineAwareRequest()` wrapper function that:

1. Checks `connectionStatus` from a singleton store (not React context, because services are not React components).
2. If offline: immediately returns the structured offline response `{ offline: true, data: null }` for GET requests without attempting a network call. For write requests (POST, PUT, DELETE, PATCH): writes to the outbox table and returns `{ queued: true, id: outboxId }`.
3. If online: performs the request normally. On network failure mid-request, falls back to the offline path.

Every function in every file under `apps/web/services/` must be updated to use `offlineAwareRequest()` instead of calling `fetch()` directly. This is the most labour-intensive change in the entire plan but it is non-negotiable for consistent offline behaviour.

---

## Layer 4 — Data Synchronisation Engine

### 4.1 `apps/web/lib/offline/sync-engine.ts`

This is the orchestrator. It runs in the browser (not the service worker) and is responsible for populating IndexedDB from network responses.

Export a `SyncEngine` class with the following methods:

`initialSync(orgSlug, userId)` — called once when the user first loads a page while online. Downloads and persists to IndexedDB: the org record, all accessible courses, all chapters and activities for each course, the user's trail state, and the user's progress records. This runs in the background with a progress event emitter so the UI can show a sync status indicator. Must be idempotent — calling it twice produces the same result. Uses cursor-based pagination on all list endpoints to handle large course libraries without loading everything into memory simultaneously.

`incrementalSync(orgSlug, userId)` — called every 5 minutes while online, and on every reconnection event. Queries `sync_metadata` for `last_synced_at` per entity type. Sends `If-Modified-Since` or `ETag` headers with each request (see API changes in Layer 4.3). If the server returns 304 Not Modified, skips the write. If modified, updates the IndexedDB record and the `sync_metadata` timestamp.

`drainOutbox()` — manually triggers the service worker sync. Falls back to direct execution if the Background Sync API is unavailable (e.g., Firefox desktop, iOS Safari in some modes). Same logic as the service worker background sync handler, but running in the page context.

`getCachedCourse(courseUuid)` — reads from IndexedDB `courses` table. Returns `null` if not cached. The page components call this first before attempting a network request, making the app feel instant.

`getCachedActivity(activityId)` — same pattern for activities.

`updateProgress(activityId, courseId, data)` — writes to `user_progress` table and to `outbox` atomically using a Dexie transaction. This is the core write path for marking activities complete. The transaction ensures the local state and the outbox entry are always in sync — if the outbox write fails, the progress write is rolled back.

### 4.2 `apps/web/lib/offline/conflict-resolver.ts`

When the Background Sync replays an outbox entry and the server returns a 409 Conflict, this module determines the resolution strategy.

For `user_progress` (activity completion): use server-wins for `completed = false` updates, and client-wins for `completed = true` updates. A user completing an activity offline is always valid; a server saying "uncomplete" is always wrong because only the server can't un-complete something without the user's action.

For `assignment_submissions` in DRAFT state: always client-wins. The draft was created offline; the server has no version of it.

For `assignment_submissions` in SUBMITTED state: if server has already recorded a submission, treat as a duplicate and mark the outbox entry SYNCED without re-submitting.

For all other mutations: server-wins, mark the outbox entry FAILED, surface the conflict to the user in the sync status UI.

Document these rules explicitly in `apps/web/lib/offline/conflict-resolver.ts` as comments at the top of the file because they represent business decisions, not technical decisions.

### 4.3 API Backend — `apps/api/src/routers/` — ETag and Conditional GET Support

The frontend's incremental sync only saves bandwidth if the API supports conditional requests. Add the following to each read route that the sync engine polls:

Every `GET` response for a list resource (courses, chapters, activities) must include an `ETag` header. The ETag value is a hash of the serialised response content — use Python's `hashlib.md5` over the JSON-serialised Pydantic model. This computation is cheap for most endpoints.

Every `GET` route handler must check for an `If-None-Match` header. If the header's ETag matches the computed ETag, return HTTP 304 with no body. This single change eliminates redundant data transfer for unchanged content.

Do this for the following routes in priority order:

- `apps/api/src/routers/courses/courses.py` — all GET routes
- `apps/api/src/routers/courses/activities/activities.py` — all GET routes
- `apps/api/src/routers/courses/chapters.py` — all GET routes
- `apps/api/src/routers/courses/collections.py` — GET list routes
- `apps/api/src/routers/organizations/` — GET org and member routes
- `apps/api/src/routers/trail/` — GET trail and step routes
- `apps/api/src/routers/courses/assignments.py` — GET routes only

Add a `Cache-Control: no-store` header to all **write** endpoints (POST, PUT, DELETE, PATCH) and to all **auth** endpoints to prevent any caching of sensitive mutation responses.

Add a `Cache-Control: private, max-age=300` header to GET endpoints that return user-specific data (progress, submissions). Add `Cache-Control: public, max-age=60, stale-while-revalidate=300` to GET endpoints that return org-level data (course list, chapters) because these change infrequently.

### 4.4 `apps/api/src/routers/sync.py` — New Delta Sync Endpoint

Add a new endpoint `GET /api/v1/sync/delta` that accepts `since` (ISO timestamp) and `entity_types` (comma-separated list) as query parameters. This endpoint queries the database for all entities of the requested types modified after the `since` timestamp and returns a compact delta payload. This is a single HTTP round trip for incremental sync instead of one request per entity type, dramatically reducing sync latency on reconnection.

This endpoint must be authenticated (same `Depends(get_current_user)` as all other routes) and must scope its results to the requesting user's accessible organisations and courses. A user must never receive delta updates for content they do not have permission to access.

Add `apps/api/src/routers/sync.py` as the route file and register it in `apps/api/src/router.py`.

---

## Layer 5 — Service-by-Service Frontend Integration

Every file in `apps/web/services/` must be updated. This section goes file by file.

### 5.1 `apps/web/services/auth/auth.ts`

`loginAndGetToken`: on success, call `saveOfflineSession()` from `session-store.ts` immediately after receiving the token. Also call `SyncEngine.initialSync()` in the background without awaiting it — do not block the login flow on sync completion.

`getUserSession`: check `getOfflineSession()` first. If offline and valid, return the cached session. If online, proceed normally and update the cached session on success.

Logout function (wherever it lives): must call `clearOfflineSession()` and clear all IndexedDB tables. Do not leave cached data accessible after logout. This is a critical security requirement — shared device scenarios.

### 5.2 `apps/web/services/courses/courses.ts`

`getOrgCourses`: wrap in `offlineAwareRequest()`. On offline, call `SyncEngine.getCachedCourses(orgSlug)`. On online success, persist result to IndexedDB `courses` table via `SyncEngine`.

`getCourseMetadata`: wrap in `offlineAwareRequest()`. On offline, call `SyncEngine.getCachedCourse(courseUuid)`.

`createCourse`: write to outbox on offline. Surface a toast notification saying "Course creation will be saved when you reconnect."

`updateCourse`: write to outbox on offline.

`deleteCourse`: block on offline. Return a user-facing error "Course deletion requires an internet connection." Do not queue deletes — a queued delete that replays after the user has changed their mind is a data integrity risk.

`getCourseChapters`: same pattern as `getCourseMetadata` using `chapters` table.

### 5.3 `apps/web/services/courses/activities.ts` and `apps/web/services/courses/activity.ts`

`getActivity`: wrap in `offlineAwareRequest()`. On offline, call `SyncEngine.getCachedActivity(activityId)`. Return the cached version. If not cached, return a structured error that the page component renders as "This activity hasn't been downloaded yet."

`getActivityBlocks`: same pattern using `blocks` table.

`markActivityComplete`: this is the most critical write path. Write to `user_progress` table and `outbox` atomically. Immediately return success to the UI (optimistic update). The background sync will replay the actual API call.

`getActivityPrerequisites`: read from `activities` table — prerequisite data is part of the cached activity object.

### 5.4 `apps/web/services/courses/assignments.ts`

`getAssignment`: cache in `assignments` table. Serve from cache offline.

`getAssignmentSubmissions`: cache in `assignment_submissions` table. On offline, return cached submissions, clearly labelling any with `status = DRAFT` or `QUEUED` as "not yet submitted."

`createAssignmentSubmission` (text/form-based): write to `assignment_submissions` table with `status = DRAFT`. Write to outbox. Return optimistic success to UI.

`createAssignmentSubmission` (file upload): block on offline. Show a clear message: "File uploads require an internet connection. Your text responses have been saved locally." Do not attempt to buffer binary files in IndexedDB — the storage quota and memory constraints make this unreliable.

`gradeAssignmentSubmission` (admin action): block on offline. Grading must be done online.

### 5.5 `apps/web/services/courses/chapters.ts`

All GET functions: wrap with `offlineAwareRequest()`, serve from `chapters` table offline.

All write functions: queue to outbox if offline, return optimistic response.

### 5.6 `apps/web/services/courses/certifications.ts`

`getCertification`: cache in `certifications` table. Certificates are static after issuance and are safe to cache aggressively.

`verifyCertification`: this is a public endpoint. Cache result for 7 days. The verification page should work offline for previously verified certificates.

### 5.7 `apps/web/services/courses/live_sessions.ts`

Mark all functions in this file as `requiresOnline`. Do not queue live session joins to the outbox — they are time-bound and meaningless if replayed later. Return a clear offline error.

### 5.8 `apps/web/services/ai/ai.ts`

Mark all AI functions as `requiresOnline`. AI responses depend on live LLM API calls and cannot be queued. Return an offline error immediately.

### 5.9 `apps/web/services/courses/collections.ts`

Cache collection metadata in a `collections` table. All GET functions serve from cache offline. Write functions queue to outbox.

### 5.10 `apps/web/services/courses/schedule.ts`

Cache schedule data in a `schedules` table. The calendar view should work offline showing cached events. New event creation queued to outbox.

### 5.11 `apps/web/services/courses/updates.ts`

Cache course update announcements. Show cached announcements offline with a "last updated at [timestamp]" indicator.

### 5.12 `apps/web/services/organizations/orgs.ts`

`getOrg`: cache in `orgs` table. Critical for the app to function — every page is org-scoped.

`getOrgMembers`: cache in `members` table. Large orgs may have thousands of members — do not cache all members by default. Only cache the first page of the paginated member list.

All write functions: queue to outbox or block, depending on the operation. Adding a member can be queued. Removing a member must be blocked (too risky to queue a destructive action).

### 5.13 `apps/web/services/organizations/invites.ts`

All invite operations require online — invites have time-sensitive tokens validated server-side with Redis. Block all invite operations offline.

### 5.14 `apps/web/services/users/users.ts`

`getUserProfile`: cache the user's own profile. Cache other users' profiles for 1 hour (for the user profile page).

`updateUserProfile`: queue to outbox. Optimistically update the `sessions` table's `user_metadata` field so the change is visible locally.

### 5.15 `apps/web/services/settings/profile.ts`

`updateProfile`: queue to outbox. Optimistically update local session.

`changePassword`: block on offline. Password changes require server-side validation.

`uploadAvatar`: block on offline. Binary upload.

### 5.16 `apps/web/services/settings/password.ts`

Block all password operations on offline. No exceptions.

### 5.17 `apps/web/services/settings/org.ts`

All org settings reads: cache. All writes: queue to outbox.

### 5.18 `apps/web/services/search/search.ts`

Implement client-side search over the IndexedDB `courses`, `activities`, and `chapters` tables using Dexie's `filter()` on `name` and `description` fields. This is a simple substring search — not as good as the server-side search, but functional offline. Return results from both the network (if online) and IndexedDB (always), deduplicated by `id`. Label offline-only results with a "cached" badge.

### 5.19 `apps/web/services/media/media.ts`

Add a `prefetchMediaForActivity(activityId)` function that retrieves all media URLs associated with an activity (images from `blocks` table) and calls `Cache.add()` on each URL via the service worker. This is called by the "Download Course" UI action.

Add `isMediaCached(url)` which checks `media_cache_index` to show per-asset download status in the UI.

### 5.20 `apps/web/services/communications.ts`

Cache the first page of notifications. Write operations queue to outbox.

### 5.21 `apps/web/services/payments/` (all three files)

Block all payment operations on offline. Payment state is financially sensitive — never allow queued payment mutations. Return a clear user-facing message directing the user to reconnect.

### 5.22 `apps/web/services/referral/referral.service.ts`

Cache the user's own referral code and commission summary. Block all payout requests offline.

### 5.23 `apps/web/services/roles/roles.ts`

Cache role definitions for the user's orgs. Roles change infrequently and are safe to cache for 30 minutes.

### 5.24 `apps/web/services/usergroups/usergroups.ts`

Cache user group memberships. Write operations queue to outbox.

### 5.25 `apps/web/services/waitlist/waitlist.ts`

Block all waitlist operations on offline. Waitlist state involves server-side position calculations.

### 5.26 `apps/web/services/ee/audit_logs.ts`

Block on offline. Audit logs are admin-only and require real-time data.

### 5.27 `apps/web/services/config/config.ts`

Cache the runtime config in `localStorage` on first successful fetch. On offline, read from `localStorage`. The config changes rarely and is not sensitive.

### 5.28 `apps/web/services/contact/contact.service.ts`

Queue contact form submissions to outbox. They are simple POST requests with no file attachment.

### 5.29 `apps/web/services/utils/health.ts`

This is the health ping endpoint. Do not cache it. Use it as the connectivity probe in `LHSessionContext`.

### 5.30 `apps/web/services/utils/react/middlewares/views.ts`

Activity view tracking: queue view events to outbox. Views recorded offline will sync later. This is acceptable — view counts are analytics data, not user-critical state.

### 5.31 `apps/web/services/blocks/Image/images.ts`

GET image block data: cache in `blocks` table. Image URL itself cached by service worker runtime cache (Entry 2). Write operations: queue to outbox.

### 5.32 `apps/web/services/blocks/Pdf/pdf.ts`

GET PDF block data: cache in `blocks` table. PDF file URL cached by service worker runtime cache only after the user has opened it or explicitly downloaded the course. Write operations: queue to outbox.

### 5.33 `apps/web/services/blocks/Quiz/quiz.ts`

GET quiz block data: cache in `blocks` table. Quiz responses: write to outbox if offline (quiz submissions are text, not binary). Return optimistic success.

### 5.34 `apps/web/services/blocks/Video/video.ts`

GET video block metadata: cache in `blocks` table. For YouTube video blocks: never cache the video stream (YouTube ToS prohibit it). For hosted video blocks: cache only if `OFFLINE_ENABLE_VIDEO_CACHE=true`. Write operations: queue to outbox.

### 5.35 `apps/web/services/payments/discounts.ts`

Block all discount operations on offline. Discount validation is server-side only.

---

## Layer 5B — Page and Component Changes

### 5B.1 `apps/web/app/layout.tsx`

Add the `SyncEngineProvider` context wrapper here so the sync engine is initialised at the root level. On mount: call `requestPersistentStorage()`, initialise the Dexie database, and register the `online`/`offline` event listeners.

### 5B.2 `apps/web/app/home/home.tsx`

The `useSWR` call for org list must be updated to use the SWR `fallbackData` option populated from IndexedDB `orgs` table, so the home page renders instantly from cache.

### 5B.3 `apps/web/app/orgs/[orgslug]/(withmenu)/courses/courses.tsx`

Update to read from IndexedDB first (via a custom `useCachedCourses` hook), then revalidate from network. Add a "last synced" timestamp to the UI.

### 5B.4 `apps/web/app/orgs/[orgslug]/(withmenu)/course/[courseuuid]/page.tsx`

Same pattern. Read from `courses` and `chapters` tables first.

### 5B.5 `apps/web/app/orgs/[orgslug]/(withmenu)/course/[courseuuid]/activity/[activityid]/activity.tsx`

This is the most critical page. Read from `activities` and `blocks` tables first. If not cached and offline, show a "Not Available Offline" placeholder. If online, populate cache immediately on successful load.

For `LIVE_SESSION` and `ASSIGNMENT` (file upload) activity types: show a disabled state with explanation when offline.

For `DYNAMIC` (text/rich content) activity types: fully functional offline.

For `DOCUMENT_PDF`: functional offline only if the PDF was previously cached by the media prefetch. Show a download prompt if not cached.

For `VIDEO` (YouTube): never available offline (YouTube's terms prohibit caching). For hosted video: available offline only if the user has explicitly downloaded the course and `OFFLINE_ENABLE_VIDEO_CACHE=true`.

### 5B.6 `apps/web/app/orgs/[orgslug]/(withmenu)/trail/page.tsx`

Read from `trails` and `trail_steps` tables. Trail progress marking must go through `SyncEngine.updateProgress()`.

### 5B.7 `apps/web/app/orgs/[orgslug]/(withmenu)/chat/` (all files)

Chat is real-time WebSocket based. When offline:

- Render cached conversation history from the `chat_messages` table.
- Show a "You are offline — messages will be sent when reconnected" banner.
- Allow composing messages; queue to outbox on send.
- Disable attachment sending.
- Close and do not attempt to reconnect the WebSocket while offline — the reconnection backoff in `hooks/useWebSocket.ts` must check `connectionStatus` and stop retrying when `OFFLINE`.

### 5B.8 `apps/web/app/orgs/[orgslug]/(withmenu)/search/page.tsx`

Fall back to client-side IndexedDB search as described in 5.18.

### 5B.9 `apps/web/app/orgs/[orgslug]/(withmenu)/collections/` pages

Cache and serve from `collections` table.

### 5B.10 `apps/web/app/orgs/[orgslug]/(withmenu)/calendar/` pages

Show cached schedule events. Display a "Calendar may not reflect the latest updates" notice when offline.

### 5B.11 `apps/web/app/orgs/[orgslug]/dash/layout.tsx`

Apply a blanket `requiresOnline` guard at the dash layout level. If offline, redirect to a `/offline-admin` page that explains the limitation. Do not attempt to serve cached admin analytics.

### 5B.12 `apps/web/app/editor/course/[courseid]/activity/[activityuuid]/edit/page.tsx`

When offline, allow editing with the content loaded from IndexedDB `activities` table. Auto-save drafts to IndexedDB every 30 seconds. Queue the final save to outbox.

Implement a draft conflict UI: if, on reconnection, the server's version of the activity has been modified by someone else since the user's last sync, show a diff view and prompt the user to choose server or local version.

### 5B.13 `apps/web/app/auth/login/login.tsx`

When offline, detect via `connectionStatus` and show: "You are offline. If you've previously logged in on this device, you can continue using saved content." Provide a "Continue offline" button that calls `getOfflineSession()`. If no cached session exists, show "No offline session found. Please connect to the internet to log in."

Do not disable the login form entirely — some browsers may have `navigator.onLine` incorrect. Let the user attempt login; the form will naturally fail with a network error if truly offline.

### 5B.14 `apps/web/hooks/useWebSocket.ts`

Modify the reconnection logic to inspect `connectionStatus` from the singleton store. When `OFFLINE`, stop the backoff loop immediately. Resume when `ONLINE` is restored.

### 5B.15 All `error.tsx` files

Update all `error.tsx` files under `apps/web/app/` to check if the error is network-related and show appropriate offline messaging instead of a generic error.

### 5B.16 All `loading.tsx` files

Update all `loading.tsx` files to not spin indefinitely when offline. After 5 seconds without a response, show a "Still loading..." message with a "Load from cache" button that forces IndexedDB fallback.

### 5B.17 `apps/web/app/orgs/[orgslug]/(withmenu)/certificates/[uuid]/verify/page.tsx`

The certificate verification page should work offline for previously verified certificates using the `certifications` IndexedDB table.

### 5B.18 `apps/web/app/orgs/[orgslug]/(withmenu)/user/[username]/page.tsx`

User profile page: serve from `members` cache when offline.

---

## Layer 6 — UI/UX Hardening

### 6.1 New Component: `apps/web/components/Offline/OfflineBanner.tsx`

A sticky, non-dismissible banner rendered at the root layout level. Reads `connectionStatus` from context. Shows nothing when `ONLINE`. Shows a yellow warning bar when `DEGRADED` ("Connection is unstable — changes will be saved locally"). Shows a red bar when `OFFLINE` ("You are offline — viewing saved content"). Shows an orange bar when `isOfflineGrace` is true ("Your session will expire when you reconnect — please reconnect soon").

### 6.2 New Component: `apps/web/components/Offline/SyncStatusIndicator.tsx`

A small icon in the top navigation bar showing:

- Green checkmark when all outbox entries are SYNCED.
- Orange spinning icon when entries are PENDING or RETRYING.
- Red exclamation when any entries are FAILED.

Clicking it opens a `SyncStatusPanel` drawer listing all pending and failed outbox entries by type, with a "Retry" button for failed entries and a "Dismiss" button to permanently discard a failed entry.

### 6.3 New Component: `apps/web/components/Offline/SyncStatusPanel.tsx`

The drawer/panel opened by `SyncStatusIndicator`. Lists all outbox entries grouped by status. Shows entity type, operation type, timestamp, retry count, and error message for FAILED entries. Retry button re-queues a FAILED entry as PENDING and triggers `drainOutbox()`. Dismiss button marks the entry as FAILED-DISMISSED (a terminal state that stops UI alerts).

### 6.4 New Component: `apps/web/components/Offline/DownloadCourseButton.tsx`

A button on the course page that triggers `SyncEngine.initialSync()` for that specific course and calls `prefetchMediaForActivity()` for all activities. Shows a progress bar during download. Shows "Downloaded" state with last-downloaded timestamp. Shows "Remove from offline" option to evict the course data and media from cache.

### 6.5 New Page: `apps/web/app/offline/page.tsx`

A fallback page served by the service worker for uncached navigation requests. Explains the offline state and lists courses that have been downloaded for offline use (read from IndexedDB `courses` table). Provides links to each downloaded course.

### 6.6 `apps/web/public/offline-placeholder.svg`

A simple, styled SVG illustration used as the fallback for uncached media requests. Should be on-brand and explanatory ("Image not available offline"). Add it to the service worker precache list.

### 6.7 Storage Usage in Account Settings

Add a storage usage display to the user account settings page (`apps/web/app/orgs/[orgslug]/dash/user-account/settings/`). Show: total storage used, budget remaining, list of downloaded courses with their sizes, and a "Clear all offline data" button. This empowers users to manage their own storage and resolves support tickets about "the app taking up too much space."

---

## Layer 7 — Backend API Hardening

### 7.1 `apps/api/src/routers/auth.py` — Explicit Token Refresh Endpoint

Add a `POST /api/v1/auth/refresh` endpoint separate from the existing login flow. This endpoint accepts a valid (not-expired) refresh token and returns a new access token. It is specifically designed for the Next.js JWT callback's token refresh cycle. Add Redis-based rate limiting: max 60 refreshes per user per hour.

### 7.2 `apps/api/src/routers/sync.py` — Delta Sync Endpoint

As described in 4.4. Must include cursor-based pagination (not offset-based) because a long offline period could produce thousands of delta records. Response must include a `next_cursor` field.

Register in `apps/api/src/router.py`.

### 7.3 `apps/api/src/core/middleware/cache_control.py` — New Middleware

Add a FastAPI middleware that applies `Cache-Control` headers based on request path and method, as described in 4.3. This centralises the logic rather than decorating every route handler individually.

Register this middleware in `apps/api/main.py`.

### 7.4 Idempotency Key Support in Write Endpoints

The outbox may replay a request multiple times (network timeout on the response leg means the server processed it but the client never got the 200). To prevent duplicate writes:

The outbox entry must include an `idempotency_key` field — a UUID generated at write time. All outbox replay requests send this as an `X-Idempotency-Key` header.

Backend routes must check this header. If a record with the same idempotency key already exists, return the original response (HTTP 200 with the original result). Store idempotency keys in Redis with a 24-hour TTL.

Add idempotency key checking to:

- `apps/api/src/routers/courses/activities/activities.py` — mark complete endpoint
- `apps/api/src/routers/courses/assignments.py` — create submission endpoint
- `apps/api/src/routers/trail/` — step completion endpoint

### 7.5 Permission Revocation on Reconnect

When the incremental sync fires on reconnection, it must fetch `user_organizations` and `roles` **first**, before any content sync. If the user's role has changed (e.g., removed from a course), evict the relevant `courses`, `activities`, and `blocks` cache entries immediately. Do not serve stale permission-gated content.

---

## Layer 8 — Security Hardening

### 8.1 Threat Model

Define and document these threats in `apps/web/docs/offline-architecture.md`:

**T1 — Stale Permissions:** A user's role is downgraded while offline. Mitigation: permissions are always the first thing refreshed on reconnection.

**T2 — Cached Admin Content:** A demoted admin retains cached admin pages. Mitigation: admin pages are never cached (dash layout `requiresOnline` guard; `NetworkOnly` service worker strategy for `/dash/` routes).

**T3 — Token Theft via IndexedDB:** Malicious code via XSS reads the encrypted session token. Mitigation: encryption provides defence-in-depth against physical device access. XSS is mitigated at the application layer (CSP, sanitisation). The encryption does not protect against full XSS exploitation.

**T4 — Outbox Replay Attack:** An attacker extracts outbox entries and replays them. Mitigation: outbox entries are tied to specific access tokens. Revoked tokens cause a 401; entries are marked FAILED.

**T5 — Offline Privilege Escalation:** A user creates a forged outbox entry for an admin action. Mitigation: the backend validates all permissions on every write. A forged entry receives a 403.

**T6 — Cross-User Data Leakage on Shared Device:** User A logs out; User B logs in. Mitigation: `clearOfflineSession()` on logout wipes all IndexedDB tables. All queries are scoped to `user_id`.

### 8.2 Content Security Policy Updates

Update CSP headers to ensure:

- `worker-src 'self'` is set to allow the service worker scope.
- `script-src` does not include `'unsafe-eval'` in production (Workbox uses eval in development mode).

### 8.3 Service Worker Origin Lock

The service worker install handler must validate the worker's origin matches the expected origin. Defence-in-depth against MITM scenarios where a compromised network serves a malicious worker file. In practice, HTTPS enforces this, but an additional check is warranted.

### 8.4 HTTPS Enforcement

The service worker, `Cache Storage`, `navigator.storage.persist()`, and Background Sync all require HTTPS. Ensure TLS termination exists at the reverse proxy. Add HTTP → HTTPS redirect to the reverse proxy config. This is a prerequisite for offline mode to function at all.

### 8.5 Sensitive Data Never in Cache

Confirm the following are never written to IndexedDB or Cache Storage:

- Raw JWT strings (use encrypted storage via `session-store.ts`)
- Payment card data or payment intent secrets
- Password reset tokens
- OAuth state parameters
- Admin analytics aggregation results

---

## Layer 9 — Testing Strategy

### 9.1 Unit Tests — `apps/web/__tests__/offline/`

Write Jest tests for:

- `db.ts`: migration correctness (verify each version upgrade preserves existing data using `fake-indexeddb`).
- `storage-policy.ts`: mock `navigator.storage.estimate()` and test eviction logic.
- `session-store.ts`: test `saveOfflineSession()` and `getOfflineSession()` with mocked Web Crypto. Test grace period expiry logic with mocked clocks (`jest.useFakeTimers()`).
- `conflict-resolver.ts`: test each conflict scenario with mock API responses.
- `sync-engine.ts`: test `getCachedCourse()` and `updateProgress()` atomicity.

### 9.2 Integration Tests — Service Layer

For each updated service file, write a test that:

1. Mocks `connectionStatus = OFFLINE`.
2. Calls the service function.
3. Asserts the outbox was written (or the cached value was returned).
4. Mocks `connectionStatus = ONLINE`.
5. Calls the service function again.
6. Asserts the network call was made.

Use `msw` (Mock Service Worker) for network mocking. It integrates with Jest and intercepts `fetch()` calls without requiring a real server.

### 9.3 End-to-End Tests — `apps/web/e2e/offline.spec.ts`

Add an offline test suite to the Playwright configuration:

- **Test 1:** Log in, load a course page (online), go offline (`await page.context().setOffline(true)`), navigate to the course page, assert content renders from cache.
- **Test 2:** Go offline, mark an activity complete, go online, assert the outbox was drained (check for the API call via Playwright network monitoring).
- **Test 3:** Go offline, navigate to a live session activity, assert it shows a "requires internet" message.
- **Test 4:** Go offline, navigate to the admin dash, assert redirect to offline page.
- **Test 5:** Log in, go offline, close the tab, reopen the tab (simulate PWA cold start), assert the session is restored from cache.
- **Test 6:** Log in as User A, go offline, log out, log in as User B, assert User A's data is not visible.
- **Test 7:** Go offline, compose a chat message, go online, assert the message was sent to the API.
- **Test 8:** Go offline for longer than `OFFLINE_GRACE_PERIOD_HOURS`, reconnect, assert the user is redirected to login.
- **Test 9:** Go offline, open an activity that was never cached, assert the "Not Available Offline" placeholder is shown.
- **Test 10:** Use the DownloadCourseButton, go offline, verify all activities in that course render correctly.

Playwright has native support for `page.context().setOffline(true)` which sets the Chromium network stack to offline mode at the browser level — this tests the service worker fallback in a real browser environment.

### 9.4 Backend Tests — `apps/api/src/tests/`

Add tests for:

- `test_etag_support.py`: GET routes return `ETag` headers; respond 304 on `If-None-Match` match.
- `test_idempotency.py`: duplicate outbox-replayed requests return the original response without creating duplicate records.
- `test_sync_delta.py`: delta endpoint returns only records modified after the `since` timestamp, scoped to user's permissions.
- `test_cache_control.py`: write endpoints return `Cache-Control: no-store`; read endpoints return correct values.
- `test_refresh_rate_limit.py`: `/api/v1/auth/refresh` enforces Redis rate limiting at 60 requests/hour/user.

---

## Layer 10 — CI/CD Pipeline

### 10.1 Service Worker Validation Step

Add a CI step after the Next.js build that:

1. Verifies `apps/web/public/sw.js` was generated and is non-empty.
2. Verifies the Workbox manifest in `sw.js` references the correct build ID.
3. Runs `workbox-cli checkEntries` to validate the precache manifest.

If any check fails, the build is rejected. A service worker with a stale or broken manifest breaks the offline experience for all existing users on next deploy.

### 10.2 Build ID Consistency

Ensure `BUILD_ID` environment variable is set in CI/CD and is consistent across all replicas in a Kubernetes deployment. Set `BUILD_ID` to the Git commit SHA: `BUILD_ID=$(git rev-parse HEAD)`. Pass as a build arg in the Docker build command.

An inconsistent build ID means different pods serve different service worker manifests, causing users to get stuck in a broken cache state when load-balanced to different pods.

### 10.3 `apps/web/Dockerfile` Changes

The standalone Next.js output (`output: 'standalone'`) does not include `public/` by default. The Dockerfile must explicitly copy:

- `public/sw.js`
- `public/workbox-*.js`
- `public/manifest.json`
- `public/offline-placeholder.svg`
- `public/icons/`

into the standalone output directory. Verify and add explicit `COPY` instructions if missing.

### 10.4 Docker Compose / Kubernetes Health Checks

The `/api/v1/health` endpoint is the client-side connectivity probe. Ensure it is excluded from authentication middleware. Add it to Kubernetes `livenessProbe` and `readinessProbe` if not already present.

### 10.5 Redis Dependency in CI

The idempotency key storage and the token refresh rate limiting depend on Redis. Ensure Redis is available in the CI environment for the API test suite.

### 10.6 Database Migration CI Check

Add a CI step that runs `alembic check` after the API build to verify no pending migrations exist in the build artefact.

### 10.7 Bundle Size Monitoring

Adding Dexie.js (~45 KB gzipped) and Background Sync plugin will increase bundle size. Add a bundle size check to CI using `bundlesize` or Next.js's `--experimental-bundle-analyzer`. Set a budget of `+50 KB` for the main chunk and fail the build if exceeded.

### 10.8 Lighthouse PWA Score Gate

Add Lighthouse CI (`@lhci/cli`) asserting:

- PWA score >= 90.
- Service Worker registered: pass.
- Offline response: pass.
- Web App Manifest: pass.

Run Lighthouse CI against a preview deployment (not a mocked environment) so it reflects real service worker behaviour.

---

## Layer 11 — Monitoring & Observability

### 11.1 Sentry — Offline-Specific Error Tagging

All errors in offline code paths must be tagged with `offline: true` in the Sentry context. Create a dedicated Sentry alert for offline-specific errors without noise from regular errors.

### 11.2 Outbox Failure Alerting

When an outbox entry is marked `FAILED` after exhausting retries:

- Client side: `SyncStatusIndicator` turns red.
- Send a Sentry event with the failed operation type, error message from the server, and the user's `org_id` (no PII).

Monitor the volume of `FAILED` outbox entries in aggregate. A spike in failures indicates an API regression affecting the sync endpoint.

### 11.3 Logfire / OpenTelemetry — Sync Endpoint Tracing

Add a tracing span around the `/api/v1/sync/delta` endpoint so each sync request is traceable end-to-end from the service worker's Background Sync event through the database query and response. Critical for diagnosing performance problems when many users reconnect simultaneously (e.g., after a scheduled maintenance window).

### 11.4 Umami Analytics — Offline Usage Metrics

Add custom Umami events (queued via outbox while offline, replayed on reconnect):

- `offline_session_start`: user went offline.
- `offline_session_end`: user came back online, include duration.
- `offline_content_viewed`: a cached activity was viewed offline.
- `offline_sync_completed`: outbox drain completed, include count and duration.
- `offline_sync_failed`: include operation type.

These metrics answer the business question: "How many learners are actually using offline mode, and are they completing content?"

---

## Layer 12 — Phased Rollout

### Phase 1 — Foundation (Weeks 1–2)

Implement Layer 0 (decisions), Layer 1 (Dexie DB), and Layer 3 (Auth hardening). No visible UI changes. The DB schema is established, migrations are versioned, and the offline session store is in place. All existing tests must still pass. This phase is purely additive.

### Phase 2 — Service Worker Upgrade (Weeks 3–4)

Implement Layer 2. Deploy the upgraded service worker. Monitor Sentry for service worker errors. Run Lighthouse CI. Validate that static assets and API GET responses are being cached via browser DevTools. No behaviour change from the user's perspective yet.

### Phase 3 — Read Offline (Weeks 5–7)

Implement Layer 4 (sync engine, ETag backend support) and Layer 5 service-by-service changes for all GET paths. This phase makes the app readable offline. Ship behind a feature flag: `OFFLINE_READ_ENABLED=true`. Test with a small group of internal users. Measure IndexedDB storage usage in practice against the 200 MB budget.

### Phase 4 — Write Queue & Sync (Weeks 8–10)

Implement Layer 4's Background Sync, outbox, and conflict resolver. Implement Layer 5's write path changes. Implement Layer 11 alerting. Ship to all users. This is the highest-risk phase — monitor outbox failure rates closely for the first week.

### Phase 5 — UX Hardening & Media (Weeks 11–13)

Implement Layer 6 UI components and Layer 5's media caching (`DownloadCourseButton`, media prefetch). Implement Playwright offline test suite. Run full Lighthouse CI gate.

### Phase 6 — Stabilisation & Security Audit (Weeks 14–15)

Implement Layer 8 security hardening. Run the threat model scenarios as manual penetration tests. Verify cross-user data isolation on a real device. Confirm all CI/CD gates from Layer 10 are passing on every merge to `dev`. Write the final `offline-architecture.md` documenting the settled state.

---

## Files Created (New)

```
apps/web/lib/offline/db.ts
apps/web/lib/offline/storage-policy.ts
apps/web/lib/offline/session-store.ts
apps/web/lib/offline/sync-engine.ts
apps/web/lib/offline/conflict-resolver.ts
apps/web/worker/background-sync.js
apps/web/worker/offline-fallback.js
apps/web/components/Offline/OfflineBanner.tsx
apps/web/components/Offline/SyncStatusIndicator.tsx
apps/web/components/Offline/SyncStatusPanel.tsx
apps/web/components/Offline/DownloadCourseButton.tsx
apps/web/app/offline/page.tsx
apps/web/public/offline-placeholder.svg
apps/web/docs/offline-architecture.md
apps/api/src/routers/sync.py
apps/api/src/core/middleware/cache_control.py
apps/api/src/tests/test_etag_support.py
apps/api/src/tests/test_idempotency.py
apps/api/src/tests/test_sync_delta.py
apps/api/src/tests/test_cache_control.py
apps/api/src/tests/test_refresh_rate_limit.py
apps/web/__tests__/offline/db.test.ts
apps/web/__tests__/offline/sync-engine.test.ts
apps/web/__tests__/offline/conflict-resolver.test.ts
apps/web/__tests__/offline/session-store.test.ts
apps/web/__tests__/offline/storage-policy.test.ts
apps/web/e2e/offline.spec.ts
```

## Files Modified (Existing)

```
apps/web/next.config.js
apps/web/package.json
apps/web/public/manifest.json
apps/web/app/layout.tsx
apps/web/app/auth/options.ts
apps/web/app/auth/login/login.tsx
apps/web/app/home/home.tsx
apps/web/app/orgs/[orgslug]/layout.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/courses/courses.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/course/[courseuuid]/page.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/course/[courseuuid]/activity/[activityid]/activity.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/trail/page.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/chat/chat.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/chat/[conversationId]/page.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/search/page.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/calendar/calendar.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/collections/CollectionsClient.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/collection/[collectionid]/page.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/certificates/[uuid]/verify/page.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/user/[username]/UserProfileClient.tsx
apps/web/app/orgs/[orgslug]/dash/layout.tsx
apps/web/app/editor/course/[courseid]/activity/[activityuuid]/edit/page.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/course/[courseuuid]/error.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/courses/error.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/error.tsx
apps/web/app/global-error.tsx
apps/web/app/not-found.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/course/[courseuuid]/activity/[activityid]/loading.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/courses/loading.tsx
apps/web/app/orgs/[orgslug]/(withmenu)/loading.tsx
apps/web/app/editor/course/[courseid]/activity/[activityuuid]/edit/loading.tsx
apps/web/components/Contexts/LHSessionContext.tsx
apps/web/hooks/useWebSocket.ts
apps/web/services/utils/ts/requests.ts
apps/web/services/auth/auth.ts
apps/web/services/courses/courses.ts
apps/web/services/courses/activities.ts
apps/web/services/courses/activity.ts
apps/web/services/courses/chapters.ts
apps/web/services/courses/assignments.ts
apps/web/services/courses/certifications.ts
apps/web/services/courses/live_sessions.ts
apps/web/services/courses/collections.ts
apps/web/services/courses/schedule.ts
apps/web/services/courses/updates.ts
apps/web/services/ai/ai.ts
apps/web/services/organizations/orgs.ts
apps/web/services/organizations/invites.ts
apps/web/services/users/users.ts
apps/web/services/settings/profile.ts
apps/web/services/settings/password.ts
apps/web/services/settings/org.ts
apps/web/services/search/search.ts
apps/web/services/media/media.ts
apps/web/services/communications.ts
apps/web/services/payments/payments.ts
apps/web/services/payments/products.ts
apps/web/services/payments/public-products.ts
apps/web/services/payments/discounts.ts
apps/web/services/referral/referral.service.ts
apps/web/services/roles/roles.ts
apps/web/services/usergroups/usergroups.ts
apps/web/services/waitlist/waitlist.ts
apps/web/services/ee/audit_logs.ts
apps/web/services/config/config.ts
apps/web/services/contact/contact.service.ts
apps/web/services/utils/health.ts
apps/web/services/utils/react/middlewares/views.ts
apps/web/services/blocks/Image/images.ts
apps/web/services/blocks/Pdf/pdf.ts
apps/web/services/blocks/Quiz/quiz.ts
apps/web/services/blocks/Video/video.ts
apps/api/src/routers/auth.py
apps/api/src/routers/courses/courses.py
apps/api/src/routers/courses/activities/activities.py
apps/api/src/routers/courses/chapters.py
apps/api/src/routers/courses/collections.py
apps/api/src/routers/courses/assignments.py
apps/api/src/routers/courses/certifications.py
apps/api/src/router.py
apps/api/main.py
turbo.json
apps/web/.env.example
apps/web/Dockerfile
```

---

## Known Risks and Mitigations

**Risk 1 — iOS Safari Background Sync.** iOS Safari does not support the Background Sync API. Mitigation: `drainOutbox()` runs in page context as a fallback and is called on every `online` event and on every app mount. Users on iOS Safari will have their writes synced on next app open rather than automatically in the background. This is acceptable behaviour and must be documented in the user-facing offline guide.

**Risk 2 — IndexedDB Corruption.** IndexedDB can corrupt if a write is interrupted mid-transaction (e.g., device loses power). Mitigation: all multi-table writes use Dexie transactions. On startup, run a lightweight integrity check: verify all `outbox` entries with `status = SYNCED` have a corresponding `user_progress` record. If not, re-queue the missing entries. Log any detected corruption to Sentry.

**Risk 3 — Large Course Libraries.** Orgs with 500+ courses will generate large IndexedDB stores. Mitigation: do not auto-cache all courses on initial sync. Only cache the user's enrolled courses. Implement `DownloadCourseButton` for explicit full caching. Show the user their storage usage in account settings.

**Risk 4 — Service Worker Update Breaking Existing Cache.** When a new service worker is deployed, Workbox's `skipWaiting: true` means it activates immediately and clears old caches. Mitigation: in the service worker's `activate` handler, do not delete the API data cache (`lh-api-data-v1`) — only delete old static asset caches. The API data cache is identified by name and preserved across service worker versions.

**Risk 5 — Clock Skew.** The `grace_until` timestamp and `If-Modified-Since` headers depend on consistent clocks. Mitigation: store `grace_until` as a server-computed absolute timestamp returned in the login response. Include a `Server-Timing` header on key responses so the client can detect significant clock skew and warn the user.

**Risk 6 — Quota Exceeded Errors.** A user with a large number of courses and media assets may exceed the browser's storage quota. Mitigation: before every major write to Cache Storage, call `getStorageUsage()` and run `evictLRUMedia()` if within 10% of budget. Surface a warning UI when storage is above 80% of budget.

**Risk 7 — Multiple Tabs / Windows.** If the user has the app open in multiple tabs and goes offline, both tabs will attempt to drain the outbox on reconnect. Mitigation: use the service worker as the single outbox drain coordinator (it is a singleton). Tabs post a message to the service worker to trigger sync rather than draining the outbox themselves.

**Risk 8 — Schema Migration Failures on Upgrade.** If a user upgrades the app while offline, the new service worker may run a Dexie schema migration that fails on a corrupt or unexpected existing schema. Mitigation: wrap all Dexie `upgrade()` callbacks in try/catch. On failure, delete and recreate the entire database (data loss, but the data will re-sync from the server on reconnect). Log the failure to Sentry.
