# Offline-First Support for LearnHouse

Makes the LMS usable without an internet connection: learners can read cached
course content, complete activities, and answer quizzes offline, with everything
syncing automatically when connectivity returns.

**Ships dark.** Both feature flags default to `false`, so this PR changes nothing
about how the app behaves until they are explicitly enabled.

---

## Why this design

The plan this work started from assumed an architecture the codebase does not have.
Two measurements changed the implementation fundamentally:

**1. Client reads go through SWR, not the service layer.**
`services/courses/courses.ts` states it outright: _"This file includes only POST,
PUT, DELETE requests. GET requests are called from the frontend using SWR."_
Wrapping the service GET functions — the original plan — would have missed
essentially every read in the app.

**2. A global `SWRConfig` fetcher would have covered exactly one read.**

|                                            | count   |
| ------------------------------------------ | ------- |
| `useSWR` call sites                        | 103     |
| …passing their **own** inline fetcher      | **102** |
| …inheriting the global `SWRConfig` fetcher | **1**   |

The dominant idiom is `useSWR(url, (url) => swrFetcher(url, token))`, and a per-hook
fetcher _overrides_ the global one.

So the read seam is installed inside **`swrFetcher` itself** — the real choke point —
via a runtime interceptor injected by dependency injection. One hook covers all 103
call sites without touching a single component.

```
requests.ts        setSwrReadInterceptor(fn)   ← injection point, no offline import
     ↑
swr-fetcher.ts     installReadInterceptor()    ← one implementation
     ↑
SyncEngineProvider called once at boot
```

Injection rather than a direct import keeps `requests.ts` free of any dependency on
`lib/offline`, avoids a module cycle, and keeps offline code out of the bundle for
anything that never enables it.

---

## Architecture

```
┌─ Page ──────────────────────────────────────────────────────┐
│  useSWR ──► swrFetcher ──► [read interceptor] ──► network    │
│                                  └──► read_cache (IndexedDB) │
│  service write ──► offlineWrite() ──► network                │
│                          └──► outbox (IndexedDB)             │
│  connection.ts · sync-engine.ts · drain.ts                   │
└──────────────────────────┬───────────────────────────────────┘
┌─ Service worker ─────────┴───────────────────────────────────┐
│  runtime caching (lh-*) · background sync · offline fallback │
└──────────────────────────────────────────────────────────────┘
```

### Two seams, one policy

Everything routes through exactly two entry points, and **all** cache/queue/block
decisions resolve in one registry (`lib/offline/policy.ts`) — never re-implemented
per service.

| Seam       | Module             | Purpose                                      |
| ---------- | ------------------ | -------------------------------------------- |
| A — reads  | `swr-fetcher.ts`   | Serve from cache offline, persist on success |
| B — writes | `offline-write.ts` | Queue or block offline mutations             |

The service worker consumes the same rules through `sw-cache-patterns.js` (plain
CommonJS, shared across the JS/TS boundary with `next.config.js`) so the worker
allowlist and the in-app denylist physically cannot drift apart.

---

## Behaviour preservation

The central constraint. Every change satisfies:

1. **Online behaviour is identical** — offline logic lives strictly in the
   offline/`catch` branch, unreachable while online.
2. **Additive and flag-gated** — with the flags off, the app is the app it was.
3. **No signature breaks** — only optional parameters and extra return fields.
4. **SSR and Server Actions untouched**, except one re-homed completion path; the
   original server action remains for the online case.
5. **Backend responses unchanged** — ETag/304, `Cache-Control`, idempotency and the
   delta endpoint are additive. A client sending no new headers sees no change.
6. **Queued writes replay the real request**, never a synthesized substitute.
7. **Reversible** — flags off, plus `DISABLE_PWA` as a worker kill switch.

Verified empirically: flag off ⇒ passthrough, 1 network call · online ⇒ passthrough,
1 network call · offline with nothing cached ⇒ **0 network calls** + typed
`OfflineUnavailableError`.

---

## Security

Offline caching is a new attack surface. Seven controls, each with a test.

|        | Control                                     | Why                                                                                                                                                                              |
| ------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** | Sensitive endpoints never persisted         | Payments, referrals, admin, audit, auth, AI, live sessions — one denylist drives both the worker and the app                                                                     |
| **S2** | Wipe on **user switch**, not just logout    | The original design only cleared on logout, leaving data exposed when a user simply closes the tab                                                                               |
| **S3** | No tokens in the outbox                     | `Authorization`/`Cookie` stripped at enqueue, fresh token injected at replay — a revoked token cannot be replayed                                                                |
| **S4** | All caches namespaced `lh-*`                | Purgeable as a set on logout/user switch                                                                                                                                         |
| **S5** | Destructive + financial writes never queued | Every `DELETE`, payments, payouts, KYC, grading, member removal, invites — a queued destructive action that replays after the user changed their mind is a data-integrity hazard |
| **S6** | **No token at rest**                        | The backend already issues the access token in a `httponly=False` cookie, so encrypting a copy in IndexedDB would be theatre. Only non-secret session metadata is stored         |
| **S7** | Permission-first reconnect                  | Roles refresh _before_ content; changed roles evict cached content immediately                                                                                                   |

**CSP** authored from scratch (the app had none): `worker-src 'self'`,
`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, plus
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
Service worker origin lock unregisters rather than running unverified.

---

## Offline behaviour by domain

Source of truth: `lib/offline/policy.ts`.

| Domain                                                    | Read                                      | Write                              |
| --------------------------------------------------------- | ----------------------------------------- | ---------------------------------- |
| Courses, chapters, activities, blocks, collections        | cache                                     | queue (deletes blocked)            |
| **Activity completion**                                   | cache                                     | **queue** — the core offline write |
| Quiz answers, assignment text submissions                 | cache                                     | queue                              |
| Notifications, announcements                              | cache                                     | queue (read receipts)              |
| Certificates                                              | cache (7d)                                | blocked                            |
| Search                                                    | client-side substring over cached content | —                                  |
| File uploads, grading, un-completion                      | cache                                     | blocked                            |
| Payments, referrals, marketers                            | **never**                                 | **blocked**                        |
| Admin, audit logs, dashboards                             | **never**                                 | **blocked**                        |
| Auth, password changes, AI, live sessions, code execution | **never**                                 | **blocked**                        |

---

## Notable decisions

**Activity completion was re-homed to the client.**
`services/courses/activity.ts` is a `'use server'` module, so completion ran as a
Server Action — which POSTs to the Next.js server and is unreachable offline. It
could neither succeed nor be queued. Added `lib/offline/trail-complete.client.ts`;
the original server action is untouched and remains the online path.

**Un-completion is online-only.** A product decision, not an oversight: `DELETE` is
never queued (S5), and it matches the conflict rule that the server wins for
`completed = false`. Flag if learners need this offline.

**Downloads are explicit.** Initial sync covers the org shell, course list and the
user's trail — not the whole library, which would exhaust a learner's storage on a
large org. Full course content is opt-in via `DownloadCourseButton`.

**No Lighthouse CI gate.** It needs a running app with a reachable API; a flaky gate
everyone learns to ignore is worse than none. The static PWA assertions cover the
same ground deterministically.

---

## Bugs found and fixed

Four bugs surfaced **only** when the E2E suite ran against a real browser. Every one
was silent — typecheck, lint, unit tests and the production build were all green
throughout. Initial E2E result was 1 passed / 4 failed.

### 1. A single 404 in the precache killed offline support entirely

Workbox fails the **whole** service worker install if any precached URL cannot be
fetched. `/assets/illustrations/*.png` returned 404, so the worker went
`installing → redundant`, never activated, and offline mode was completely dead with
no error anywhere.
→ Excluded from precache; **new CI gate** fails the build if the manifest references
a missing file.

### 2. `proxy.ts` swallows unlisted `public/` subdirectories _(pre-existing)_

The middleware matcher lists which paths are exempt from org-slug rewriting.
`assets` was missing, so those images 404'd — a bug that predates this work and made
the illustrations unreachable in the app.
→ Added `assets` and `offline` to the matcher, with a comment explaining the trap.

### 3. CSP `connect-src` without `http:` broke every API call

LearnHouse self-hosts its API over plain HTTP by default. Allowing only `https:`
blocked every request with _"Refused to connect"_ — the app loaded and did nothing.
→ `connect-src` now includes `http:`. Deliberately permissive; see the doc.

### 4. The offline fallback page was doubly broken

`/offline` hit the same proxy trap (404), **and** Next precaches only the route's JS
chunk — not the HTML document — so `caches.match('/offline')` missed and offline
navigation failed with `ERR_FAILED`.
→ Route exempted in the matcher; document precached via `additionalManifestEntries`.

**Also fixed in passing:** `services/blocks/Quiz/quiz.ts` had a stray `"` in its URL,
so quiz submissions were hitting a malformed endpoint. Worth checking whether that
ever worked in production.

---

## Testing

| Suite                                 | Result                          |
| ------------------------------------- | ------------------------------- |
| Frontend unit (`pnpm test`)           | **85 passed**                   |
| Backend (`pytest src/tests/`)         | **28 passed**                   |
| E2E credential-free (`pnpm test:e2e`) | **5 passed**                    |
| Typecheck / ESLint                    | clean / **0 errors**            |
| PWA + bundle gates                    | pass (2896 KB / 3500 KB budget) |

Security invariants are covered by tests, not just prose: S1 (nothing sensitive
cached), S2 (user-switch wipe including the closed-tab case), S3 (no tokens in the
outbox), S5 (destructive/financial writes never queued).

E2E verified in real Chromium against a production build: service worker registers,
activates and controls the page; offline fallback serves; banner appears on
disconnect; security headers present; all caches `lh-*` prefixed.

**Not yet verified:** the credentialed round trip — go offline, complete an activity,
reconnect, confirm the server received it. Needs seeded accounts and a running API.
The logic is unit-tested; the full loop is not. **Verify this in staging before
enabling writes in production.**

---

## Rollout

`server-wrapper.js` reads all `NEXT_PUBLIC_*` vars at container start, so enabling
requires **no rebuild** — set the variable and restart.

| Variable                                 | Default |
| ---------------------------------------- | ------- |
| `NEXT_PUBLIC_OFFLINE_READ_ENABLED`       | `false` |
| `NEXT_PUBLIC_OFFLINE_WRITE_ENABLED`      | `false` |
| `NEXT_PUBLIC_OFFLINE_CACHE_MAX_MB`       | `200`   |
| `NEXT_PUBLIC_OFFLINE_GRACE_PERIOD_HOURS` | `72`    |
| `NEXT_PUBLIC_OFFLINE_ENABLE_VIDEO_CACHE` | `false` |
| `NEXT_PUBLIC_OFFLINE_SYNC_RETRY_MAX`     | `5`     |

**Recommended sequence:** staging reads → staging writes (verify the round trip in
the database) → production reads → production writes.

**Requirements:** HTTPS (service workers, Cache Storage, Background Sync all need a
secure context) · `BUILD_ID` set to the commit SHA, enforced by CI — inconsistent
build IDs across replicas strand load-balanced users on a broken cache · Redis for
idempotency and rate limiting, both of which **fail open**.

**Rollback:** set the flags to `false` and restart. Note this disables offline
_behaviour_ but does not unregister service workers already installed on devices;
a full worker removal would need a self-unregistering worker, which is not built.

---

## Known limitations

1. **iOS Safari has no Background Sync** — writes drain on next app open rather than
   in the background. Document for users.
2. **CSP allows `'unsafe-inline'` for scripts** — `RootLayout` has an inline theme
   script and Next injects hydration scripts. Removing it needs a nonce through
   middleware. `CSP_REPORT_ONLY=true` available to observe first.
3. **Un-completion is online-only** (see Notable decisions).
4. **Delta sync compares date strings** — `update_date` is stored as
   `str(datetime.now(UTC))`, so comparison is lexicographic. Correct for a fixed UTC
   format; if that format changes, `_to_update_date_string()` must change with it.
5. **`.gitignore` tail is corrupted UTF-16** _(pre-existing)_ — the `sw.js`/`workbox-*`
   ignore rules are dead, which is why `public/sw.js` is git-tracked. Not fixed here
   because untracking those files changes deploy behaviour; your call.

---

## Review guide

Start here, in order:

1. **`lib/offline/policy.ts`** — every cache/queue/block decision. If a security
   question has an answer, it is here.
2. **`services/utils/ts/requests.ts`** — the interceptor injection point (small
   diff, large consequence).
3. **`lib/offline/swr-fetcher.ts`** — the read seam.
4. **`lib/offline/offline-write.ts`** — the write seam; note the online path is the
   caller's existing code, untouched.
5. **`docs/offline-architecture.md`** — decisions, threat model, ops runbook, and
   the four traps written up in full.

Backend is four small additive pieces: `middleware/etag.py`, `middleware/cache_control.py`,
`core/idempotency.py`, `core/rate_limit.py`, plus `routers/sync.py`.
