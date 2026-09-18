# LearnHouse — Comprehensive Offline-First Implementation Plan

## Executive Summary

This plan transforms LearnHouse from a fully server-dependent LMS into an offline-capable, progressive web application. The strategy is **offline-first reads, queued writes, selective media caching, and conflict-free sync on reconnection**. The implementation is organized into six layers that must be executed in strict dependency order: Storage Foundation → Service Worker Upgrade → Authentication → Data Synchronization → Media Pipeline → UI & UX Hardening. Each section identifies exact files to be created or modified, edge cases, and failure modes to guard against.

---

## IMPLEMENTATION STATUS

**Layers 1–5 are implemented** (foundation, service worker, auth/seams, sync engine, service integration). Both flags default to **OFF**, so the app currently behaves exactly as before; offline behaviour activates only when they are set.

| Layer                   | Status                  | Notes                                                                                                                                                |
| ----------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Decisions / env     | ✅ Done                 | `dexie` installed; `NEXT_PUBLIC_OFFLINE_*` documented in `.env.example`                                                                              |
| 1 — Storage foundation  | ✅ Done                 | `constants/config/policy/db/storage-policy/session-store`                                                                                            |
| 2 — Service worker      | ✅ Done                 | `workboxOptions.runtimeCaching` + `customWorkerDir`; `sw.js` + `worker-*.js` verified generated                                                      |
| 3 — Auth / seams        | ✅ Done                 | Seam A via `swrFetcher` interceptor; Seam B `offlineWrite()`; connection monitor; inactivity suspended offline                                       |
| 4 — Sync engine         | ✅ Done                 | `sync-engine`, `conflict-resolver`, `drain`; backend ETag + Cache-Control middleware, idempotency, `/api/v1/sync/delta`                              |
| 5 — Service integration | ✅ Done (policy-driven) | Central policy registry replaces per-file edits; targeted fixes applied (see below)                                                                  |
| 6 — UI components       | ✅ Done                 | `OfflineBanner` (wired into RootLayout), `SyncStatusIndicator`, `SyncStatusPanel`, `DownloadCourseButton`, `OfflineStorageSettings`, `/offline` page |
| 7 — Backend hardening   | ✅ Done                 | Redis rate limit on the **existing** `GET /auth/refresh`; idempotency on trail completion **and** assignment submission                              |
| 8 — Security            | ✅ Done                 | CSP authored from scratch (`worker-src`, `object-src`, `frame-ancestors`) + security headers; SW origin lock; threat model documented                |
| 9 — Tests               | ✅ Done                 | Jest configured; **85 frontend + 28 backend tests passing**; Playwright config + offline spec (browsers install on demand)                           |
| 10 — CI/CD              | ✅ Done                 | `web-offline.yaml`; `verify-pwa-build.mjs` + `check-bundle-size.mjs` gates; Redis already present in API CI                                          |
| 11 — Monitoring         | ✅ Done                 | `telemetry.ts` — Sentry `offline:true` tagging, outbox-failure alerting, Umami events, sync tracing                                                  |
| 12 — Documentation      | ✅ Done                 | [`apps/web/docs/offline-architecture.md`](apps/web/docs/offline-architecture.md) — decisions, threat model, ops runbook, rollback                    |

**Verification performed:** project-wide `tsc --noEmit` clean; API imports + route registration confirmed (`/api/v1/sync/delta`); 21/21 SW cache-pattern cases pass; 31/31 policy invariant cases pass (S1 no sensitive caching, S5 no queued destructive/financial writes); read-seam runtime behaviour verified (flag off ⇒ passthrough; offline+uncached ⇒ 0 network calls + typed error); service worker generated with all four `lh-*` caches and the custom background-sync worker.

**Targeted per-file fixes applied in Layer 5** (the rest is handled centrally by the policy registry): re-homed activity completion to a client path (`lib/offline/trail-complete.client.ts`); fixed the malformed `quiz.ts` URL; made `denyAccessToUser` ignore offline network errors; suspended `useActivityHeartbeat` offline; stopped the `useWebSocket` reconnect storm and made it resume on reconnect; added offline fallback to `search.ts`.

---

## Layer −1 — Architecture Reality (VERIFIED AGAINST THE CODEBASE — READ BEFORE ANYTHING ELSE)

> This section was added after a file-by-file audit of the current codebase. The layers below were originally written against an assumed architecture that differs from reality in several load-bearing ways. **Where any later layer contradicts this section, this section wins.** Ignoring these points will send a developer down a path that cannot produce a working offline app.

### R1 — How data actually flows today (this determines the entire offline strategy)

1. **Client reads use SWR directly, not the `services/` GET functions.** `apps/web/services/courses/courses.ts:9-12` states verbatim: _"This file includes only POST, PUT, DELETE requests. GET requests are called from the frontend using SWR."_ `useSWR(url, swrFetcher)` is used **175 times across 65 component files**. The `swrFetcher` lives in `apps/web/services/utils/ts/requests.ts:90` and calls `fetch()` itself. **There is no global `SWRConfig` provider** — every component wires SWR locally.

   - **Consequence:** Offline reads must be implemented at the **SWR layer**, via a NEW global `SWRConfig` (added in `RootLayout.tsx`) that supplies an **offline-aware fetcher** and a **persisted cache provider** backed by IndexedDB — _not_ by wrapping the `services/*` GET functions. Wrapping the service GETs (as Layers 3.4 and 5 originally propose) would both miss the real read path and force edits to 65 files (unmaintainable, high technical debt).

2. **`services/utils/ts/requests.ts` is NOT a request executor / choke point.** It only builds `fetch` option objects (`RequestBody`, `RequestBodyWithAuthHeader`, `RequestBodyForm*`) plus helpers (`swrFetcher`, `errorHandling`, `getResponseMetadata`). Actual `fetch()` calls are scattered inside each service file and inside SWR hooks. **Layer 3.4's premise ("all API calls ultimately go through this utility") is false.** The plan must introduce two NEW seams instead: (a) the offline-aware SWR fetcher (reads), and (b) a small `offlineWrite()` helper that write-path service functions opt into (writes).

3. **The most important write path is a Next.js Server Action, which cannot run offline.** Activity completion is `markActivityAsComplete()` in `apps/web/services/courses/activity.ts` — a `'use server'` file — hitting `POST /trail/add_activity/{activity_uuid}`. Server Actions execute on the Next.js server; when the device is offline the browser cannot reach that server, so they fail before any client code runs. The following service files are `'use server'` and are therefore **inert offline**: `courses/activity.ts`, `payments/products.ts`, `payments/payments.ts`, `payments/discounts.ts`.

   - **Consequence:** To queue completion offline, the progress-write must be invoked from a **client-side** path (a client function that `fetch`es the backend directly and can detect offline → write to the outbox). Payments/products/discounts are already "block offline," so their being server actions is fine — but the plan must stop describing `markActivityComplete` as a wrappable client function. (Note: the correct symbol is `markActivityAsComplete` in `activity.ts`, and the endpoints are `trail/add_activity/{uuid}` [POST] and `trail/remove_activity/{uuid}` [DELETE] — not anything in `activities.ts`.)

4. **Auth is NextAuth (JWT strategy) and runs server-side.** `apps/web/app/auth/options.ts` `jwt`/`session` callbacks execute on the Next.js server; `useSession()` polls `GET /api/auth/session` (Next server) every 60s (`RootLayout.tsx:82`), and the `session` callback additionally calls the backend `GET /users/session`. **All of this is unreachable offline.** Therefore the offline-grace logic proposed for the NextAuth callbacks (Layers 3.1/3.2) will not execute offline and is largely moot. **Offline auth must be handled entirely client-side** via the IndexedDB session store (Layer 1.4) plus a client "offline session" gate that the UI consults when `useSession()` cannot resolve. Keep the NextAuth changes only for the _online→about-to-expire_ refresh case; do not rely on them for the offline path.

### R2 — Corrected facts about specific files/paths the later layers get wrong

- **PWA library is `@ducanh2912/next-pwa@^10`** (devDependency in `apps/web/package.json`), a fork whose API differs from `next-pwa`:
  - Runtime caching goes under **`workboxOptions.runtimeCaching`**, not a top-level `runtimeCaching` key (fixes Layer 2.1).
  - The custom-worker option is **`customWorkerDir`** (default `'worker'`), not `customWorkerSrc` (fixes Layer 2.2).
  - `apps/web/next.config.js` already sets `dest`, `register`, `skipWaiting`, `disable: DISABLE_PWA==='true'`, `publicExcludes`, `buildExcludes`. Extend that same call — do not replace it. The production build uses `next build --webpack` (Workbox needs webpack; dev uses turbopack and PWA should stay disabled in dev).
- **The service worker cannot read runtime config.** Client env/config is injected at runtime via `/runtime-config.js` + `runtime-config.json` (generated by `server-wrapper.js`/`docker-entrypoint.sh`) and read through `services/config/config.ts` `getConfig()`. The SW has none of this. **SW runtime-caching URL patterns must be PATH-based** (e.g. match `/api/v1/…` and `/content/…` regardless of origin), not "injected at build time from an env var." (fixes Layer 2.1 Entries 1–2).
- **API entry point is `apps/api/app.py`**, not `apps/api/main.py` (fixes Layers 7.3, 10.x). Register any new middleware there.
- **CORS already exposes custom headers.** `app.py:59` and `:78` set `Access-Control-Expose-Headers: *`, so the browser can already read `ETag`/`Server-Timing` cross-origin. No CORS change needed for conditional GETs. `GZipMiddleware` is active (`app.py:96`) — compute ETag from the _serialized body before_ the response is compressed (i.e. in the route/handler), which is what the plan already implies.
- **Router paths are single files, not directories:** it's `apps/api/src/routers/orgs.py` (not `routers/organizations/`) and `apps/api/src/routers/trail.py` (not `routers/trail/`). Schedules and grade are mounted under the `/courses` prefix (`router.py:75-76`). The trail prefix is `/trail` (`router.py:77`). (fixes Layers 4.3, 7.4.)
- **A refresh endpoint already exists:** `GET /api/v1/auth/refresh` (`auth.py:30`, fastapi-jwt-auth refresh cookie), already consumed by the frontend. Layer 7.1 should **reuse and rate-limit the existing endpoint**, not add a duplicate `POST /auth/refresh`.
- **Redis is already in the stack** (used by referrals, password reset, invites, chat) — reuse the existing client (`apps/api/src/services/referrals/redis_cache.py` pattern) for idempotency keys and refresh rate-limiting rather than introducing a new dependency.
- **Media delivery:** `content_delivery.type` is `filesystem` (default → served same-origin at `<backend>/content/**` via a `StaticFiles` mount, `app.py:343`) or `s3api` (endpoint `LEARNHOUSE_S3_API_ENDPOINT_URL` — **backend-only, not exposed to the client**). The SW media rule (Layer 2.1 Entry 2) must therefore match `/content/**` by path for filesystem mode; to cache S3-hosted media you must add a **new `NEXT_PUBLIC_` variable** for the S3 host (or match by file extension), because the current S3 endpoint is not visible to the browser or SW.
- **The Dockerfile already copies `public/` wholesale** (`apps/web/Dockerfile:52` `COPY --from=builder /app/public ./public`), and next-pwa writes `sw.js`/`workbox-*.js` into `public/` during the build stage. So the generated worker is already shipped; Layer 10.3's "standalone output omits `public/`" is largely incorrect. Verify the copy, but explicit per-file `COPY` lines are unnecessary. (Note both `Dockerfile` and `Dockerfile.frontend` exist — confirm which the deploy uses.)

### R3 — Client-consumed settings must be `NEXT_PUBLIC_`-prefixed AND injected into runtime config

Every `OFFLINE_*` setting in Layer 0.2 is consumed in the browser and/or must be compiled into the service worker. In this codebase:

- Browser-readable env vars **must** be prefixed `NEXT_PUBLIC_` and flow through the runtime-config mechanism (`window.__RUNTIME_CONFIG__` / `runtime-config.json`), read via `getConfig()`. Rename them accordingly (e.g. `NEXT_PUBLIC_OFFLINE_CACHE_MAX_MB`).
- Values the **service worker** needs (cache budgets, retry max, video-cache flag) cannot be read at SW runtime; inject them at build time via the Next.js `env`/`define` mechanism or a generated `worker/offline-config.js` constant. Document both hops.

### R4 — Net effect on scope

The originally-estimated "wrap every `services/*` file" effort (Layers 3.4, 5) is **replaced** by a smaller, cleaner surface:

1. One global `SWRConfig` + offline-aware fetcher + IndexedDB cache provider (covers all 65 read sites at once).
2. One `offlineWrite()` helper adopted only by the genuinely client-side write functions; server-action writes stay online-only or are re-homed to client calls where offline queueing is required (only activity-completion needs re-homing).
3. The per-file Layer 5 list below is retained as a **behavior policy matrix** (what each domain does offline: cache / queue / block), not as "add a wrapper to this GET." Read it that way.

### R5 — Behavior-Preservation Contract (NON-NEGOTIABLE: "no functionality altered")

Every change in this plan must satisfy all of the following. A PR that violates any of these is rejected.

1. **Online behavior is identical.** When `connectionStatus === ONLINE` and the network succeeds, every code path must behave exactly as today — same request, same response shape, same side effects, same error handling. Offline logic lives strictly in the `else`/`catch` branch and must be unreachable while online.
2. **Additive & flag-gated.** All offline behavior sits behind `NEXT_PUBLIC_OFFLINE_READ_ENABLED` / `NEXT_PUBLIC_OFFLINE_WRITE_ENABLED` (Phase flags). With the flags off, the app is byte-for-byte the current app. Ship each phase dark, enable by flag.
3. **No signature breaks.** Do not change existing exported function signatures; only add **optional** parameters/return fields. The offline fetcher must return the _same shape_ `swrFetcher` returns so no component rendering changes.
4. **SSR/Server Actions untouched except one.** Do not convert server components or server actions to client, except the single re-homed activity-completion trigger (5.3) — and even there, the existing server action stays for the online path.
5. **Response contracts unchanged on the backend.** ETag/304, `Cache-Control`, idempotency, and the delta endpoint are **additive**. Existing endpoints keep identical 200 bodies; 304 is only returned when the client explicitly sends `If-None-Match`; idempotency replay returns the _same_ body the original did.
6. **Offline never fabricates writes.** Queued mutations must produce the identical server effect they would have online (same endpoint, body, permissions) — the outbox replays the real request; it does not synthesize a different one.
7. **Reversibility.** Every phase is independently revertible (flag off + SW kill-switch via `DISABLE_PWA`) with no data loss and no schema lock-in.

### R6 — Exhaustive service classification (result of the full file-by-file pass)

Verified across every file in `apps/web/services/`. Offline policy per domain (**cache** = served read-only from IndexedDB/SW; **queue** = client write via `offlineWrite()` → outbox; **block** = online-only, clear error; **never-cache** = excluded from all persistence for security):

| Domain / file                                                                    | Kind                        | Offline policy                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| courses/courses.ts, chapters.ts, collections.ts, updates.ts                      | client (writes) + SWR reads | reads **cache**; create/update **queue**; **delete block**                                                                                                                                                                                                                                         |
| courses/activity.ts (`'use server'`)                                             | server action               | completion **re-homed to client + queue** (5.3); start/remove course **queue** via client                                                                                                                                                                                                          |
| courses/activities.ts                                                            | client + SSR                | reads **cache**; create/**file** create **block**; delete **block**                                                                                                                                                                                                                                |
| courses/assignments.ts                                                           | client                      | text submission (`handleAssignmentTaskSubmission`, `submitAssignmentForGrading`) **queue**; **file** submission (`updateSubFile`/`updateReferenceFile`) **block**; grading/revision/delete **block**; **`executeCode` block** (needs live sandbox — new domain surprise, not in original plan)     |
| courses/certifications.ts                                                        | client                      | user/issued certs **cache**; `getCertificateByUuid` is **public** → cache for verify page; create/update/delete **block**                                                                                                                                                                          |
| courses/live_sessions.ts                                                         | client + SWR                | **block** all (time-bound)                                                                                                                                                                                                                                                                         |
| courses/schedule.ts                                                              | client + SWR                | reads **cache**; writes **queue**                                                                                                                                                                                                                                                                  |
| blocks/Quiz/quiz.ts                                                              | client                      | quiz answer submit **queue**. ⚠️ **Pre-existing bug: `quiz.ts:10` URL has a stray trailing `"`** — fix before queueing or the outbox replays a malformed request                                                                                                                                   |
| blocks/Image, Pdf, Video                                                         | client (FormData uploads)   | block **data cache**; **uploads block** (binary); YouTube never cached; hosted video cache only if flag                                                                                                                                                                                            |
| ai/ai.ts                                                                         | client                      | **block** all                                                                                                                                                                                                                                                                                      |
| payments/\* (payments, products, discounts are `'use server'`)                   | server action + client      | **block + never-cache** (financial)                                                                                                                                                                                                                                                                |
| referral/referral.service.ts, referral/marketer.service.ts                       | client                      | read summaries **cache but never-persist-sensitive**; `requestPayout`, KYC upload, payment-method, all admin approve/reject/suspend **block** (financial/PII/destructive). ⚠️ **DRY: marketer.service.ts uses inline `fetch(headers)` instead of `RequestBodyWithAuthHeader`** — unify on adoption |
| ee/audit_logs.ts                                                                 | client + SWR                | **block + never-cache** (admin)                                                                                                                                                                                                                                                                    |
| dashboard/students.ts                                                            | client                      | **block + never-cache** (admin/aggregation)                                                                                                                                                                                                                                                        |
| organizations/orgs.ts (FormData), invites.ts                                     | client                      | org read **cache**; add member **queue**; **remove member block**; **invites block** (time-sensitive tokens); logo/image upload **block** (binary)                                                                                                                                                 |
| users/users.ts (FormData avatar)                                                 | client + SWR                | own profile **cache**; profile update **queue**; **avatar upload block**                                                                                                                                                                                                                           |
| settings/profile.ts, password.ts, org.ts (FormData)                              | client                      | profile **queue**; **password block**; org image upload **block**                                                                                                                                                                                                                                  |
| communications.ts (FormData), notifications/notificationAPI.ts, announcements.ts | client                      | first page **cache**; marks/read-receipts **queue**; attachment send **block**                                                                                                                                                                                                                     |
| roles/roles.ts, usergroups/usergroups.ts                                         | client                      | defs **cache** (short TTL); writes **queue**; **role/usergroup deletes block**                                                                                                                                                                                                                     |
| waitlist/waitlist.ts, contact/contact.service.ts                                 | client                      | waitlist **block**; contact form **queue**                                                                                                                                                                                                                                                         |
| search/search.ts                                                                 | client + SWR                | fall back to **client-side IndexedDB search**                                                                                                                                                                                                                                                      |
| config/config.ts                                                                 | client                      | cache runtime config in `localStorage`                                                                                                                                                                                                                                                             |
| utils/health.ts                                                                  | client                      | connectivity probe — **never cache**                                                                                                                                                                                                                                                               |
| utils/react/middlewares/views.ts                                                 | client                      | view events **queue** (analytics-grade)                                                                                                                                                                                                                                                            |

**Domain surprises not in the original plan:** (a) `executeCode` code-execution activity → must block offline; (b) `quiz.ts` malformed-URL bug; (c) `marketer.service.ts` DRY divergence (inline fetch); (d) **`dash/user-account/*` lives under `/dash` but is the user's own account area** — a blanket dash offline-block (5B.11) would wrongly disable it _and_ the storage-management UI from 6.6/6.7 — see the corrected 5B.11.

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

Add the following to `apps/web/.env.example` and document them in the deployment guide. **These are consumed in the browser, so they MUST be `NEXT_PUBLIC_`-prefixed and flow through the runtime-config mechanism** (`window.__RUNTIME_CONFIG__` / `runtime-config.json`, read via `services/config/config.ts` `getConfig()`) — a bare `OFFLINE_*` name is invisible to the browser in this codebase. See Layer −1 · R3. Values the service worker itself needs must additionally be injected at build time (the SW cannot read runtime config).

- `NEXT_PUBLIC_OFFLINE_CACHE_MAX_MB` — maximum storage budget in megabytes (default 200)
- `NEXT_PUBLIC_OFFLINE_GRACE_PERIOD_HOURS` — how long a cached session is honoured offline (default 72)
- `NEXT_PUBLIC_OFFLINE_ENABLE_VIDEO_CACHE` — boolean, whether hosted video files are eligible for caching (default false, because video is large)
- `NEXT_PUBLIC_OFFLINE_SYNC_RETRY_MAX` — maximum Background Sync retry attempts before surfacing a permanent failure error (default 5)
- (optional) `NEXT_PUBLIC_OFFLINE_S3_MEDIA_HOST` — S3/endpoint host to match for media caching when `content_delivery.type = s3api` (the backend's `LEARNHOUSE_S3_API_ENDPOINT_URL` is not exposed to the client; see Layer −1 · R2). Unset for `filesystem` mode, where media is same-origin under `/content/`.
- `DISABLE_PWA` — already exists (`next.config.js:9`), ensure it is honoured in all new worker config

### 0.3 turbo.json and pnpm Workspace Changes

Add `dexie` and `workbox-background-sync` to `apps/web/package.json` **dependencies** (note: `@ducanh2912/next-pwa@^10` is already present and bundles Workbox — do not add `next-pwa`). `turbo.json` currently uses the v1 `pipeline` key with `build.outputs = [".next/**", "!.next/cache/**"]`. next-pwa writes `sw.js`/`workbox-*.js` into `public/` (a git-tracked source dir, not a turbo output) during `next build`; because the precache manifest is build-ID-stamped, ensure the generated worker is not stale-cached — the simplest correct approach is to keep `generateBuildId` tied to the commit SHA (see Layer 10.2, already wired in `next.config.js:42`) so a new build always yields a fresh manifest. If you want Turborepo to track the generated worker, add `"public/sw.js"` and `"public/workbox-*.js"` to `build.outputs`, but this is optional given the build-ID strategy.

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

> **Corrected for `@ducanh2912/next-pwa` (see Layer −1 · R2).** Runtime caching goes under **`workboxOptions.runtimeCaching`**, NOT a top-level `runtimeCaching` key. Extend the existing `withPWA({...})` call in `next.config.js` (keep `dest`, `register`, `skipWaiting`, `disable`, `publicExcludes`, `buildExcludes`). Because the SW cannot read runtime config, **all `urlPattern`s must be path/extension based, matched on any origin** — do not try to inject the API/S3 host at build time. Each entry is a `{urlPattern, handler, options}` object (ducanh's schema).

**Entry 1 — API GET routes (course, chapter, activity data):**
Match by pathname on any origin: `urlPattern: ({url}) => /\/api\/v1\/(courses|chapters|activities|blocks|trail|collections|orgs|users|certifications|assignments|roles|usergroups|communications|announcements|notifications|search)(\/|$)/.test(url.pathname)`. (Corrected endpoint names — actual router prefixes are `/trail` not `trails`/`trail_steps`, and `schedules`/`grade` live under `/courses`; see `router.py`.) Handler: `NetworkFirst`, cache name `lh-api-data-v1`, `networkTimeoutSeconds: 4`, `cacheableResponse: { statuses: [200] }`, expiry `maxAgeSeconds: 24h`, `maxEntries: 500`. **Do NOT cache authenticated user-specific mutation responses here** — this NetworkFirst rule is for GET reads only; scope the regex so it never matches write responses (Workbox only applies runtime caching to GET by default, but be explicit).

**Entry 2 — Media assets (images, PDFs) — filesystem and S3:**
For `filesystem` delivery (default) media is same-origin under `/content/`: `urlPattern: ({url}) => url.pathname.startsWith('/content/')`. For `s3api` delivery, add a second entry matching the host from `NEXT_PUBLIC_OFFLINE_S3_MEDIA_HOST` (compiled in at build) or match by extension: `urlPattern: ({url}) => /\.(png|jpe?g|gif|webp|svg|pdf)$/i.test(url.pathname)`. Handler: `CacheFirst`, cache name `lh-media-v1`, `cacheableResponse: { statuses: [200] }`, expiry `maxAgeSeconds: 7d`, `maxEntries: 200`. This means once a learner has viewed an image or PDF, it is available offline for 7 days.

**Entry 3 — Next.js image optimisation endpoint (`/_next/image`):**
Strategy: `CacheFirst`, cache name `lh-images-v1`. Expiry: 3 days, max 300 entries.

**Entry 4 — Static assets already handled by precache.** Leave untouched.

**Entry 5 — Google Fonts or any external CDN fonts:** Strategy `StaleWhileRevalidate`, cache name `lh-fonts-v1`.

**Entry 6 — Umami analytics proxy routes:** Explicitly exclude from caching with a `NetworkOnly` entry so analytics events are never replayed from cache.

### 2.2 Custom Service Worker Additions via `customWorkerDir`

> **Corrected (see Layer −1 · R2):** `@ducanh2912/next-pwa` uses **`customWorkerDir`** (default `'worker'`), not `customWorkerSrc`. Create `apps/web/worker/` and either rely on the default or set `customWorkerDir: 'worker'` explicitly in the `withPWA` call. The fork concatenates/imports modules from this directory into the generated worker. Verify the exact merge semantics against the installed `@ducanh2912/next-pwa@^10` docs before writing `background-sync.js`/`offline-fallback.js`, and confirm compatibility with Next.js 16 (`next@16.2.11`) during Phase 2 — pin/upgrade the fork if the generated worker fails to build.

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

> **Read Layer −1 · R1.4 first.** NextAuth's `jwt`/`session` callbacks run on the Next.js **server** and `useSession()` polls `/api/auth/session` (also the server). None of that is reachable when the device is offline. Sections 3.1–3.2 therefore only help the _online, token-about-to-expire_ case; they do **not** provide offline auth. **Offline auth is delivered client-side** by the IndexedDB session store (Layer 1.4) plus a client gate (3.3) that the UI consults when `useSession()` returns `unauthenticated`/`loading` due to being offline. Also note: the current `jwt` callback (`options.ts:118-138`) has **no try/catch** around `getNewAccessTokenUsingRefreshTokenServer`, so a failed refresh currently throws — wrap it as part of 3.1.

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

### 3.4 The two request seams (CORRECTED — replaces the "single interceptor" model)

> **`requests.ts` is not a request executor** (Layer −1 · R1.2): it only builds `fetch` option objects. There is no single point every call flows through. Reads happen via SWR; writes happen via scattered `fetch()` in service files (some of them Server Actions). So instead of one `offlineAwareRequest()` wrapper, introduce **two** narrow seams:

**Seam A — Offline-aware SWR fetcher (covers ALL reads at once).** Create `apps/web/lib/offline/swr-fetcher.ts` exporting `offlineFetcher(url, token?)` that:

1. If `connectionStatus === ONLINE`: performs the normal `swrFetcher` request; on success, **writes the response into the IndexedDB cache** (keyed by the SWR key/URL) before returning it.
2. If offline (or the fetch throws a network error): **reads the last-good value from IndexedDB** and returns it; if nothing is cached, throws a typed `OfflineUnavailableError` the UI renders as "not downloaded yet."

Wire this fetcher and a persisted cache **once**, via a global `<SWRConfig value={{ fetcher: offlineFetcher, keepPreviousData: true, revalidateOnReconnect: true }}>` added in `apps/web/components/RootLayout/RootLayout.tsx` (there is currently no global `SWRConfig`). This replaces the "edit 65 components" work implied elsewhere.

> ⚠️ **CRITICAL CORRECTION — measured during implementation (do not skip).**
> A global `SWRConfig` fetcher is **necessary but nowhere near sufficient**. A count of the real call sites found **102 of 103 `useSWR` calls pass their own inline fetcher** — the dominant idiom is:
>
> ```ts
> useSWR(`${getAPIUrl()}trail/org/${org?.id}/trail`, (url) =>
>   swrFetcher(url, access_token),
> );
> ```
>
> A per-hook `fetcher` **overrides** the one from `SWRConfig`, so the global fetcher would have covered exactly **one** read in the entire app.
>
> **The actual choke point is `swrFetcher` itself**, in `apps/web/services/utils/ts/requests.ts` — nearly every inline fetcher delegates to it. So Seam A is installed there via a **runtime interceptor injected by dependency injection**:
>
> - `requests.ts` gains `setSwrReadInterceptor(fn)` and wraps its existing body in a `network()` closure. With no interceptor registered, behaviour is byte-for-byte unchanged.
> - `lib/offline/swr-fetcher.ts` exports `installReadInterceptor()`, called once by `SyncEngineProvider`. One `readThroughCache()` implementation backs **both** the interceptor and the global `offlineFetcher`, so the caching logic exists exactly once (DRY).
> - Injection (rather than importing the offline layer into `requests.ts`) avoids a module cycle and keeps offline code out of the bundle for anything that never enables it.
>
> This is the difference between offline reads working everywhere and working on one page. Verified behaviour: flag off ⇒ passthrough + 1 network call; online ⇒ passthrough + 1 network call; offline with no cache ⇒ **0 network calls** + typed `OfflineUnavailableError`.

**Seam B — `offlineWrite()` helper (opt-in for client-side write functions).** Create `apps/web/lib/offline/offline-write.ts` exporting `offlineWrite({url, method, body, headers, entityType, idempotencyKey})` that:

1. Reads `connectionStatus` from a **singleton store** (not React context — services aren't components).
2. If offline: for queueable mutations, writes an `outbox` row (with an `idempotency_key`) and returns `{ queued: true, id }`; for non-queueable mutations (deletes, payments, live sessions), returns `{ blocked: true }` so the caller can surface a clear error.
3. If online: performs the `fetch` normally; on mid-flight network failure, falls back to the offline path.

Only the **client-side** write functions listed in Layer 5 adopt Seam B. `'use server'` write functions (`courses/activity.ts`, `payments/*`) cannot use it while remaining Server Actions — for the one that must work offline (activity completion), re-home it to a client function per Layer −1 · R1.3; the payments actions stay online-only.

`connectionStatus` singleton: create `apps/web/lib/offline/connection.ts` holding the current status, updated by the `online`/`offline` window events and the health probe (3.3), readable from both React (via context in 3.3) and non-React code (Seam B).

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

> **No CORS change needed** for this: `app.py` already sets `Access-Control-Expose-Headers: *` (lines 59 and 78), so the browser can read `ETag`/`Server-Timing`. Because `GZipMiddleware` is active (`app.py:96`), compute the ETag from the serialized body **inside the route handler** (before compression), not from the wire bytes.

Do this for the following routes in priority order (**corrected paths** — see Layer −1 · R2):

- `apps/api/src/routers/courses/courses.py` — all GET routes
- `apps/api/src/routers/courses/activities/activities.py` — all GET routes
- `apps/api/src/routers/courses/chapters.py` — all GET routes
- `apps/api/src/routers/courses/collections.py` — GET list routes
- `apps/api/src/routers/orgs.py` — GET org and member routes _(single file, not `routers/organizations/`)_
- `apps/api/src/routers/trail.py` — GET trail and step routes _(single file, not `routers/trail/`)_
- `apps/api/src/routers/courses/assignments.py` — GET routes only

Add a `Cache-Control: no-store` header to all **write** endpoints (POST, PUT, DELETE, PATCH) and to all **auth** endpoints to prevent any caching of sensitive mutation responses.

Add a `Cache-Control: private, max-age=300` header to GET endpoints that return user-specific data (progress, submissions). Add `Cache-Control: public, max-age=60, stale-while-revalidate=300` to GET endpoints that return org-level data (course list, chapters) because these change infrequently.

### 4.4 `apps/api/src/routers/sync.py` — New Delta Sync Endpoint

Add a new endpoint `GET /api/v1/sync/delta` that accepts `since` (ISO timestamp) and `entity_types` (comma-separated list) as query parameters. This endpoint queries the database for all entities of the requested types modified after the `since` timestamp and returns a compact delta payload. This is a single HTTP round trip for incremental sync instead of one request per entity type, dramatically reducing sync latency on reconnection.

This endpoint must be authenticated (same `Depends(get_current_user)` as all other routes) and must scope its results to the requesting user's accessible organisations and courses. A user must never receive delta updates for content they do not have permission to access.

Add `apps/api/src/routers/sync.py` as the route file and register it in `apps/api/src/router.py`.

---

## Layer 5 — Service-by-Service Frontend Integration

> **How to read this layer (see Layer −1 · R4).** Because reads flow through SWR (Seam A) and only writes are per-file, this list is a **behavior-policy matrix** — for each domain it states what happens offline: **cache** (served by the SWR offline fetcher / IndexedDB), **queue** (client write via `offlineWrite()` → outbox), or **block** (return a clear online-only error). It is _not_ an instruction to add a wrapper to each GET; the GETs are largely SWR keys handled centrally. Apply Seam B (`offlineWrite()`) only to the **client-side** write functions named below.
>
> **Complete file inventory** (the original list omitted four files that exist): the service tree also includes `apps/web/services/announcements.ts`, `apps/web/services/dashboard/students.ts`, `apps/web/services/notifications/notificationAPI.ts`, and `apps/web/services/referral/marketer.service.ts`. Policy: announcements → cache first page, queue writes; dashboard/students → block (admin, live aggregation); notifications → cache first page, queue read-receipts/marks; marketer.service → cache read-only summaries, block payout/KYC writes. `'use server'` files (`courses/activity.ts`, `payments/products.ts`, `payments/payments.ts`, `payments/discounts.ts`) cannot queue while remaining Server Actions — treat as online-only except activity-completion, which is re-homed (5.3).

This section goes file by file.

> **Terminology bridge:** the subsections below were written with a single `offlineAwareRequest()` wrapper in mind. Read every such mention as follows: **for GET functions**, "wrap in `offlineAwareRequest()`" → _this read is served by the global offline SWR fetcher (Seam A); the service GET itself only needs changes if it is used outside SWR (e.g. SSR)_. **For write functions (POST/PUT/PATCH/DELETE)**, "wrap in `offlineAwareRequest()`" → _route the client-side write through `offlineWrite()` (Seam B)_; server-action writes stay online-only unless re-homed (5.3). All bare `OFFLINE_*` env names below are the `NEXT_PUBLIC_OFFLINE_*` variables from Layer −1 · R3.

### 5.1 `apps/web/services/auth/auth.ts`

> **Placement note:** `loginAndGetToken`/`getUserSession` are invoked from the **NextAuth `authorize`/`session` callbacks, which run server-side** (`options.ts`) — IndexedDB is not available there. So `saveOfflineSession()` (IndexedDB, Web Crypto) must run **client-side**: call it from a `useEffect` in the session context (3.3) that fires when `useSession()` transitions to `authenticated` (persist `session.tokens`, `session.user`, `session.roles`). Do the same to trigger `SyncEngine.initialSync()` in the background (do not await).

`getOfflineSession()` gate: consumed client-side by 3.3 / login page (5B.13) when `useSession()` cannot resolve because the device is offline. If offline and within grace, treat as authenticated (read-only).

Logout (`logout()` in `auth.ts` + NextAuth `signOut`): the client logout handler must also call `clearOfflineSession()` and wipe all IndexedDB tables + the app's Cache Storage buckets. Do not leave cached data accessible after logout — critical for shared-device scenarios (threat T6).

### 5.2 `apps/web/services/courses/courses.ts`

`getOrgCourses`: wrap in `offlineAwareRequest()`. On offline, call `SyncEngine.getCachedCourses(orgSlug)`. On online success, persist result to IndexedDB `courses` table via `SyncEngine`.

`getCourseMetadata`: wrap in `offlineAwareRequest()`. On offline, call `SyncEngine.getCachedCourse(courseUuid)`.

`createCourse`: write to outbox on offline. Surface a toast notification saying "Course creation will be saved when you reconnect."

`updateCourse`: write to outbox on offline.

`deleteCourse`: block on offline. Return a user-facing error "Course deletion requires an internet connection." Do not queue deletes — a queued delete that replays after the user has changed their mind is a data integrity risk.

`getCourseChapters`: same pattern as `getCourseMetadata` using `chapters` table.

### 5.3 `apps/web/services/courses/activities.ts` and `apps/web/services/courses/activity.ts`

> **Corrected (Layer −1 · R1.3).** There is **no `markActivityComplete` in `activities.ts`.** Activity completion is `markActivityAsComplete()` in `apps/web/services/courses/activity.ts`, which is a **`'use server'` Server Action** hitting `POST /trail/add_activity/{activity_uuid}` (and `unmarkActivityAsComplete` → `DELETE /trail/remove_activity/{activity_uuid}`). Server Actions cannot run offline.

`getActivity` / `getActivityByID` / `getActivityWithAuthHeader` (in `activities.ts`): these are used for **server-side** rendering and are inert offline. The offline read path for activities is the SWR key that the activity page uses (Seam A) plus the `activities`/`blocks` IndexedDB tables. If not cached, surface the typed `OfflineUnavailableError` → "This activity hasn't been downloaded yet."

`getActivityBlocks`: served from the `blocks` table via Seam A.

**Activity completion (the most critical write path) — must be re-homed to a client path.** Create a client function (e.g. `markActivityCompleteClient(activityUuid, accessToken)` in a **client** module, not `activity.ts`) that calls `POST /trail/add_activity/{uuid}` directly via `fetch` and routes through `offlineWrite()` (Seam B). When offline: write `user_progress` and the `outbox` row in a single Dexie transaction (atomic; roll back both on failure), optimistically update the UI, and let Background Sync replay. Keep the existing Server Action for the online SSR/refresh path if desired, but the offline-capable trigger must be the client function. Send an `X-Idempotency-Key` so replays are safe (Layer 7.4).

`getActivityPrerequisites`: read from the cached activity object (`activities` table) — prerequisite data is part of it.

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

### 5.30 `apps/web/services/utils/react/middlewares/views.ts` + `apps/web/hooks/useActivityHeartbeat.ts`

> **Corrected (exhaustive pass):** `views.ts` is **not** view tracking — it is `denyAccessToUser(error, router)`, which redirects to `/login` on HTTP 401/403. Actual activity view/heartbeat tracking lives in **`hooks/useActivityHeartbeat.ts`**. Two changes:

- **`views.ts` (`denyAccessToUser`) must be offline-aware:** do **not** redirect to `/login` on a _network_ error while offline (a failed fetch offline is not a 401/403). Only redirect on genuine 401/403 responses. Otherwise offline users get bounced to login — a functionality regression. It only acts on `error.status`, so ensure offline network failures never surface as a 401/403-shaped error.
- **`useActivityHeartbeat.ts`:** while offline, **suspend** the heartbeat (do not spin failing requests); optionally queue a single view/heartbeat event to the outbox on completion. View counts are analytics-grade, not user-critical — losing some offline is acceptable; hammering the network is not.

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

### 5B.1 `apps/web/components/RootLayout/RootLayout.tsx` (NOT `app/layout.tsx`)

> **Corrected:** `app/layout.tsx` is a thin server component that just renders `<RootLayout>`. The actual client provider stack lives in `apps/web/components/RootLayout/RootLayout.tsx` (`'use client'`), currently `SessionProvider → LHSessionProvider → I18nProvider → StyledComponentsRegistry`. Make the additions there.

Add two things inside that provider stack:

1. A global **`<SWRConfig>`** (there is none today) supplying the offline-aware fetcher and IndexedDB cache provider from Seam A (Layer 3.4): `value={{ fetcher: offlineFetcher, provider: indexedDbCacheProvider, keepPreviousData: true, revalidateOnReconnect: true }}`. This is what makes all 65 SWR read sites offline-capable at once.
2. A **`SyncEngineProvider`** that on mount calls `requestPersistentStorage()`, initialises the Dexie database, seeds the `connectionStatus` singleton, and registers `online`/`offline` listeners. Place it so it can read the session (inside `LHSessionProvider`) to trigger `saveOfflineSession()` + `initialSync()` on `authenticated` (Layer 5.1).

Note `SessionProvider` currently sets `refetchInterval={60000}`; while offline this poll fails every minute — gate/relax it via the connection status so it doesn't thrash (see 3.3).

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

For `VIDEO` (YouTube): never available offline (YouTube's terms prohibit caching). For hosted video: available offline only if the user has explicitly downloaded the course and `NEXT_PUBLIC_OFFLINE_ENABLE_VIDEO_CACHE=true`.

> Verify the exact activity-type identifiers against the backend enum before coding the switch (do not assume the strings `DYNAMIC`/`DOCUMENT_PDF`/`VIDEO`/`LIVE_SESSION`/`ASSIGNMENT` — confirm in `apps/api/src/db/courses/activities.py`). The client component here is `activity.tsx` (uses `useSWR` 7×); its sibling `page.tsx` is the server wrapper.

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

### 5B.11 `apps/web/app/orgs/[orgslug]/dash/ClientAdminLayout.tsx` (route-scoped guard — NOT a blanket block)

> **Corrected (domain surprise from the exhaustive pass, see Layer −1 · R6).** `dash/layout.tsx` just renders `ClientAdminLayout`, which already gates children with `<AdminAuthorization authorizationMode="page">`. **Do not blanket-block all of `/dash` offline** — `dash/user-account/settings/*` and `dash/user-account/owned` live under `/dash` but are the _user's own_ pages, and 6.6/6.7 explicitly require the storage-management UI (which lives in `dash/user-account/settings/`) to work offline.

Implement the guard **route-scoped**, ideally inside/next to `AdminAuthorization`:

- **Allowed offline (read/queue):** `dash/user-account/**` (own settings, owned courses, offline-storage management).
- **Blocked offline (redirect to `/offline-admin`):** everything else under `/dash` — analytics, students, payments, referrals, users, org settings, communications, courses admin, assignments admin. These are admin/live-aggregation/financial and are `never-cache` per S1.
- Do not attempt to serve cached admin analytics. Drive the allow/block decision from the shared policy registry (8.7), not a hardcoded list in two places.

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

### 7.1 `apps/api/src/routers/auth.py` — Rate-limit the EXISTING refresh endpoint

> **Corrected (Layer −1 · R2):** a refresh endpoint already exists — `GET /api/v1/auth/refresh` (`auth.py:30`), built on fastapi-jwt-auth's refresh cookie and already consumed by the frontend (`getNewAccessTokenUsingRefreshToken` / `...Server`). **Do not add a duplicate `POST /auth/refresh`.** Instead, add **Redis-based rate limiting (max 60 refreshes/user/hour)** to the existing handler, reusing the Redis client already in the codebase (`apps/api/src/services/referrals/redis_cache.py` pattern). Keep the existing GET contract so the NextAuth JWT callback and client code keep working unchanged.

### 7.2 `apps/api/src/routers/sync.py` — Delta Sync Endpoint

As described in 4.4. Must include cursor-based pagination (not offset-based) because a long offline period could produce thousands of delta records. Response must include a `next_cursor` field.

Register in `apps/api/src/router.py`.

### 7.3 `apps/api/src/core/middleware/cache_control.py` — New Middleware

Add a FastAPI middleware that applies `Cache-Control` headers based on request path and method, as described in 4.3. This centralises the logic rather than decorating every route handler individually.

Register this middleware in **`apps/api/app.py`** (there is no `apps/api/main.py`; the FastAPI app is created in `app.py`). Mind middleware ordering: Starlette runs middlewares in reverse registration order, and `GZipMiddleware` + the two CORS middlewares are already registered (`app.py:66-96`). Add the cache-control middleware so it runs on the response path without clobbering the existing CORS/expose-headers behaviour; verify with a smoke test that `Access-Control-Expose-Headers` and `ETag` both survive.

### 7.4 Idempotency Key Support in Write Endpoints

The outbox may replay a request multiple times (network timeout on the response leg means the server processed it but the client never got the 200). To prevent duplicate writes:

The outbox entry must include an `idempotency_key` field — a UUID generated at write time. All outbox replay requests send this as an `X-Idempotency-Key` header.

Backend routes must check this header. If a record with the same idempotency key already exists, return the original response (HTTP 200 with the original result). Store idempotency keys in Redis with a 24-hour TTL.

Add idempotency key checking to (**corrected paths** — see Layer −1 · R2):

- `apps/api/src/routers/trail.py` — `POST /trail/add_activity/{activity_uuid}` (activity completion — this is the "mark complete" endpoint, in `trail.py`, **not** `activities.py`)
- `apps/api/src/routers/courses/assignments.py` — create submission endpoint
- Any other queueable mutations you enable in Layer 5 (e.g. quiz submission, contact form) — add on demand as those write paths gain outbox support.

Reuse the existing Redis client for the 24h idempotency store (`apps/api/src/services/referrals/redis_cache.py` pattern).

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

### 8.2 Content Security Policy

> **Corrected:** there is currently **no CSP** anywhere in `apps/web` (no header in `next.config.js`, middleware, or proxy). So this is "author a CSP," not "update" one — and it must be done carefully because `RootLayout.tsx` relies on an inline theme `<script dangerouslySetInnerHTML>` and a synchronous `<script src="/runtime-config.js">`. Introduce the CSP as its own scoped task (ideally after Phase 2) so it doesn't break existing inline scripts:

- Add the header via `next.config.js` `async headers()` (or the reverse proxy).
- `worker-src 'self'` to allow the service worker scope.
- Avoid `'unsafe-eval'` in production (Workbox only uses eval in dev builds).
- Because of the inline theme script, either use a nonce/hash or keep `'unsafe-inline'` scoped narrowly — validate the app still boots (theme flash, runtime config, Umami) before shipping.

### 8.3 Service Worker Origin Lock

The service worker install handler must validate the worker's origin matches the expected origin. Defence-in-depth against MITM scenarios where a compromised network serves a malicious worker file. In practice, HTTPS enforces this, but an additional check is warranted.

### 8.4 HTTPS Enforcement

The service worker, `Cache Storage`, `navigator.storage.persist()`, and Background Sync all require HTTPS. Ensure TLS termination exists at the reverse proxy. Add HTTP → HTTPS redirect to the reverse proxy config. This is a prerequisite for offline mode to function at all.

### 8.5 Sensitive Data Never in Cache

Confirm the following are never written to IndexedDB or Cache Storage:

- Raw JWT strings (see 8.6 — prefer _not storing the access token at all_)
- Payment card data or payment intent secrets
- Password reset tokens
- OAuth state parameters
- Admin analytics aggregation results

### 8.6 Offline Security Requirements (MANDATORY — "100% security-proof")

> These close the attack surface that offline caching introduces. Each is testable (Layer 9) and each maps to a threat in 8.1.

**S1 — Sensitive-endpoint denylist (single source of truth).** Neither Seam A (SWR→IndexedDB) nor the SW `NetworkFirst` API cache may persist responses from sensitive/admin/financial endpoints. Maintain ONE denylist in `apps/web/lib/offline/policy.ts` (see 8.7) matching: `payments/**`, `referrals/**`, `marketers/**`, `ee/**`, `admin/**`, `admin/analytics/**`, `dashboard/**`, `users/session`, `auth/**`, `chat/ws/**`, `code/execute`. The SW runtime-cache regex (Layer 2.1 Entry 1) must be the _allowlist_ complement of this — it already excludes these; keep the two in sync via the shared registry, never hand-maintained in two places.

**S2 — Wipe on user-switch, not just logout (fixes T6 fully).** On every successful authentication, compare the authenticating `user_id` with the `sessions` row already in IndexedDB. **If they differ (or any stale session exists from a user who never logged out), wipe ALL IndexedDB tables and delete every `lh-*` Cache Storage bucket _before_ seeding the new session.** Relying only on `clearOfflineSession()` at logout (original plan) leaves User A's data exposed if A merely closed the tab. This check runs client-side in the post-login effect (5.1).

**S3 — Never store bearer tokens in the outbox.** Outbox rows store only `{method, url, body, entityType, idempotency_key, created_at, status, retry_count}` — **no `Authorization` header, no cookies.** At replay time (SW Background Sync or `drainOutbox()`), inject the _current_ valid access token. This prevents token-at-rest in a replayable structure (fixes T4) and guarantees a revoked token can't be replayed with stale credentials. (Overrides Layer 1.2's `outbox.headers` field — drop `headers` or store only non-auth headers like `X-Idempotency-Key`.)

**S4 — Cache Storage lifecycle.** All app caches are named `lh-*`. On logout/user-switch delete them all; on SW `activate`, delete `lh-*` caches from prior _app_ versions per Risk 4's rules (but preserve `lh-api-data-v1` only if the same user — combined with S2 this is safe). Never leave an authenticated response in a cache that outlives the session.

**S5 — Destructive & financial actions are NEVER queued.** `offlineWrite()` must hard-block (return `{blocked:true}`, never enqueue) for: all `payments/**` and `referrals|marketers` payout/KYC/approve/reject/suspend, member/role/usergroup **removal**, all **DELETE**s, assignment **grading**, `code/execute`, live-session control, invites, waitlist. A queued destructive/financial op that replays after the user changed their mind (or after permissions changed) is a data-integrity and financial-safety hazard. Encode this in the policy registry (8.7), not per-call.

**S6 — Token-at-rest: be honest and minimal.** The backend sets the access-token cookie with `httponly=False` (`auth.py:79`), so the access token is _already_ readable by any script on the origin — IndexedDB encryption of it (original Layer 1.4) is weak defense-in-depth, not a real control. **Preferred design: do not store the access token in IndexedDB at all.** Persist only non-secret session metadata (user id, roles snapshot, `grace_until`, org permissions) needed to gate the offline UI; obtain the actual token for replay from the existing cookie/NextAuth session in memory when online. This removes a secret-at-rest entirely and is simpler (DRY with the existing auth model). If a token must be cached for cold-start replay, encrypt via Web Crypto as originally described and document the residual risk explicitly.

**S7 — Permission snapshot gating + reconnect revocation.** Offline UI gates (admin vs learner, course access) read the roles/permissions snapshot captured at last online sync. On reconnect, fetch `user_organizations` + `roles` FIRST (Layer 7.5) and, if changed, immediately evict now-forbidden `courses/activities/blocks` from IndexedDB and their SW cache entries before rendering. Never let a stale snapshot unlock content the server would now deny (fixes T1/T2).

### 8.7 DRY Mandates (single-source-of-truth, no duplicated offline logic)

> "Follow DRY consistently." Offline concerns must not be copy-pasted across 40 service files or split across client/SW. Enforce these:

1. **One policy registry — `apps/web/lib/offline/policy.ts`.** A single declarative map from endpoint pattern → `{ read: 'cache'|'never', write: 'queue'|'block', sensitive: boolean, ttl? }`. Consumed by (a) the SWR offline fetcher (Seam A) to decide whether to persist a read, (b) `offlineWrite()` (Seam B) to decide queue vs block, and (c) the SW allowlist/denylist generation (S1). The Layer 5 matrix and the R6 table are the _human_ view of this one machine-readable registry — do not encode policy a second time in each service function.
2. **One read seam, one write seam.** All reads go through `offlineFetcher` (global `SWRConfig`); all client writes go through `offlineWrite()`. No bespoke `if (offline)` branches inside individual service functions.
3. **One conflict resolver** (`conflict-resolver.ts`) — already centralized; keep business rules only there.
4. **Backend: one ETag/304 mechanism and one Cache-Control mechanism.** Implement conditional GET as a **single reusable FastAPI dependency or middleware** (not `If-None-Match` handling copy-pasted into each of the ~7 route files), and `Cache-Control` as the single middleware in 7.3. This also guarantees consistent behavior and satisfies "no functionality altered" (one tested code path).
5. **One idempotency helper** on the backend (a dependency wrapping the Redis check), applied via `Depends(...)` to the write routes in 7.4 — not re-implemented per route.
6. **Unify divergent client code during adoption.** `marketer.service.ts` (and any file using inline `fetch(headers)`) must adopt the shared request builders (`RequestBodyWithAuthHeader`) / seams so there is exactly one auth-header construction path.

---

## Layer 9 — Testing Strategy

### 9.1 Unit Tests — `apps/web/__tests__/offline/`

> **New tooling required (none of this is installed today).** `apps/web` currently has **only** Jest + Testing Library (`package.json` devDeps). Add as devDependencies and scaffold config before writing these tests: `fake-indexeddb`, `msw`, `@playwright/test` (+ a `playwright.config.ts` — there is none), `@lhci/cli` (Layer 10.8), and a bundle-size checker (Layer 10.7). The current test scripts are `lint`/`build` only — add `test`, `test:e2e`, and CI wiring. Jest uses `jest-environment-jsdom` already.

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
- **Test 11 (S2 user-switch):** Log in as User A (cache data), **close tab without logging out**, reopen and log in as User B → assert IndexedDB and all `lh-*` caches were wiped and none of A's data is present.
- **Test 12 (S5 financial block):** Go offline, attempt a payout/payment/KYC action → assert it is **blocked with a clear message and NOT enqueued** (outbox length unchanged).
- **Test 13 (S3 token hygiene):** Queue a write offline → inspect the outbox row and assert it contains **no `Authorization` header / token**; go online, assert replay succeeds with a freshly injected token.
- **Test 14 (S1 denylist):** Go online, load an admin/referrals/payments page, then inspect IndexedDB + Cache Storage → assert **no sensitive-endpoint responses were persisted**.
- **Test 15 (S7 revocation):** Cache a course offline, have the server revoke access, reconnect → assert the course/activities are evicted and no longer render.
- **Test 16 (user-account offline):** Go offline, open `dash/user-account/settings` storage page → assert it **renders** (not blocked) and shows offline storage usage (guards against the 5B.11 over-block regression).

Playwright has native support for `page.context().setOffline(true)` which sets the Chromium network stack to offline mode at the browser level — this tests the service worker fallback in a real browser environment.

### 9.4 Backend Tests — `apps/api/src/tests/`

Add tests for:

- `test_etag_support.py`: GET routes return `ETag` headers; respond 304 on `If-None-Match` match.
- `test_idempotency.py`: duplicate outbox-replayed requests return the original response without creating duplicate records.
- `test_sync_delta.py`: delta endpoint returns only records modified after the `since` timestamp, scoped to user's permissions.
- `test_cache_control.py`: write endpoints return `Cache-Control: no-store`; read endpoints return correct values.
- `test_refresh_rate_limit.py`: `GET /api/v1/auth/refresh` (the existing endpoint) enforces Redis rate limiting at 60 requests/hour/user. (The API test suite already exists under `apps/api/src/tests/` and uses pytest; Redis is available — see Layer 10.5.)

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

### 10.3 `apps/web/Dockerfile` — verify (mostly already handled)

> **Corrected:** `apps/web/Dockerfile:52` already does `COPY --from=builder /app/public ./public`, and `@ducanh2912/next-pwa` writes `sw.js`/`workbox-*.js` into `public/` during the `builder` stage's `pnpm run build`. So the generated worker, `manifest.json`, and `icons/` are already shipped — the "standalone omits `public/`" claim does not apply here. Action items:

- **Verify** the generated `public/sw.js` and `public/workbox-*.js` are present in the builder stage before the copy (they are build outputs, likely git-ignored — that's fine, they're generated pre-copy).
- Add `public/offline-placeholder.svg` (a source asset from Layer 6.6) — it ships automatically via the existing `public/` copy once committed.
- No new per-file `COPY` lines are required. Just confirm `DISABLE_PWA` is not set in the production build stage (otherwise no worker is generated).
- Note there are **two** Dockerfiles (`Dockerfile` and `Dockerfile.frontend`) — confirm which the deployment actually uses and apply the check there.

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
apps/web/lib/offline/connection.ts            # connectionStatus singleton (Seam, 3.4)
apps/web/lib/offline/policy.ts                # SINGLE offline policy registry: endpoint→cache/queue/block + sensitive denylist (8.7 DRY, S1/S5)
apps/web/lib/offline/swr-fetcher.ts           # offline-aware SWR fetcher + IndexedDB cache provider (Seam A, 3.4/5B.1)
apps/web/lib/offline/offline-write.ts         # offlineWrite() outbox helper (Seam B, 3.4) — injects token at replay (S3)
apps/web/lib/offline/trail-complete.client.ts # client-side markActivityCompleteClient (re-homed from the 'use server' activity.ts, 5.3/R1.3)
apps/web/components/Offline/SyncEngineProvider.tsx  # root provider (5B.1)
playwright.config.ts                          # no Playwright config exists today (Layer 9)
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
apps/api/src/core/dependencies/conditional_get.py  # ONE reusable ETag/If-None-Match/304 dependency (8.7 DRY, 4.3)
apps/api/src/core/dependencies/idempotency.py      # ONE Redis idempotency Depends() for write routes (8.7 DRY, 7.4)
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
apps/web/package.json                          # +dexie, +workbox-background-sync, +fake-indexeddb, +msw, +@playwright/test, +@lhci/cli, +bundle-size checker; +test scripts
apps/web/public/manifest.json
apps/web/components/RootLayout/RootLayout.tsx  # REAL provider stack (add SWRConfig + SyncEngineProvider) — app/layout.tsx only renders <RootLayout>
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
apps/web/app/orgs/[orgslug]/dash/ClientAdminLayout.tsx   # route-scoped offline guard (5B.11) — NOT a blanket dash block
apps/web/app/orgs/[orgslug]/dash/user-account/settings/[subpage]/page.tsx  # storage-management UI must work offline (6.7)
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
apps/web/hooks/useActivityHeartbeat.ts          # suspend heartbeat offline (5.30)
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
apps/web/services/announcements.ts             # ADDED — was omitted from Layer 5
apps/web/services/dashboard/students.ts        # ADDED — block offline (admin/live aggregation)
apps/web/services/notifications/notificationAPI.ts  # ADDED — cache first page, queue marks
apps/web/services/referral/marketer.service.ts # ADDED — cache read-only, block payout/KYC
apps/web/app/orgs/[orgslug]/(withmenu)/chat/page.tsx  # ADDED — chat index page
apps/api/src/routers/auth.py                    # rate-limit EXISTING GET /auth/refresh (7.1)
apps/api/src/routers/courses/courses.py
apps/api/src/routers/courses/activities/activities.py
apps/api/src/routers/courses/chapters.py
apps/api/src/routers/courses/collections.py
apps/api/src/routers/courses/assignments.py
apps/api/src/routers/courses/certifications.py
apps/api/src/routers/orgs.py                     # was mislisted as routers/organizations/
apps/api/src/routers/trail.py                    # activity-completion + idempotency (7.4)
apps/api/src/router.py
apps/api/app.py                                  # was mislisted as apps/api/main.py — register cache_control middleware here (7.3)
turbo.json
apps/web/.env.example
apps/web/Dockerfile                              # verify only — public/ already copied (10.3)
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
