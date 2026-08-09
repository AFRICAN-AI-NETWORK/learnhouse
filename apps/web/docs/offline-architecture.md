# Offline Architecture

How offline support works in LearnHouse, why it is built this way, and how to
operate it. This document lives with the code and is the reference for anyone
changing offline behaviour.

> **Current state:** Layers 1–12 of the implementation plan are built. Both feature
> flags default to **off**, so the app behaves exactly as it did before offline
> support existed until they are turned on.

---

## 1. The one thing to understand first

**Client reads in this codebase go through SWR, not the service layer.**

`services/courses/courses.ts` says it outright: _"This file includes only POST, PUT,
DELETE requests. GET requests are called from the frontend using SWR."_

That alone would suggest installing a fetcher on a global `<SWRConfig>`. Measuring
the real call sites showed why that is not enough:

|                                            | count   |
| ------------------------------------------ | ------- |
| `useSWR` call sites                        | 103     |
| …passing their **own** inline fetcher      | **102** |
| …relying on the global `SWRConfig` fetcher | **1**   |

The dominant idiom is `useSWR(url, (url) => swrFetcher(url, access_token))`, and a
per-hook fetcher **overrides** the one from `SWRConfig`. A global fetcher alone
would have made exactly one read work offline.

The actual choke point is **`swrFetcher` itself** — nearly every inline fetcher
delegates to it. So offline reads are installed there, via an interceptor injected
at runtime:

```
requests.ts          setSwrReadInterceptor(fn)   ← injection point, no offline import
   ↑
swr-fetcher.ts       installReadInterceptor()    ← one implementation
   ↑
SyncEngineProvider   calls it once at boot
```

Dependency injection rather than a direct import keeps `requests.ts` free of any
edge into `lib/offline`, avoids a module cycle, and keeps offline code out of the
bundle for anything that never enables it.

---

## 2. Architecture at a glance

```
┌─ Page context ──────────────────────────────────────────────┐
│                                                             │
│  useSWR ──► swrFetcher ──► [read interceptor] ──► network   │
│                                   │                          │
│                                   └──► read_cache (IndexedDB)│
│                                                             │
│  service write ──► offlineWrite() ──► network                │
│                          │                                   │
│                          └──► outbox (IndexedDB)             │
│                                                             │
│  connection.ts ── health probe + online/offline events       │
│  sync-engine.ts ─ initial + periodic sync, permission first  │
│  drain.ts ─────── replays outbox, injects fresh token        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─ Service worker ────────────┴───────────────────────────────┐
│  runtime caching (lh-* caches)    background sync            │
│  offline fallbacks                origin lock                │
└─────────────────────────────────────────────────────────────┘
```

### Module map

| Module                   | Responsibility                                                         |
| ------------------------ | ---------------------------------------------------------------------- |
| `constants.ts`           | Every default and identifier, once. Importable by page **and** worker. |
| `config.ts`              | `NEXT_PUBLIC_OFFLINE_*` overrides on top of those defaults.            |
| `policy.ts`              | **The** policy registry: cache / queue / block per endpoint.           |
| `sw-cache-patterns.js`   | Patterns shared across the JS/TS boundary with `next.config.js`.       |
| `db.ts`                  | Dexie schema, corruption recovery.                                     |
| `swr-fetcher.ts`         | Seam A — offline reads.                                                |
| `offline-write.ts`       | Seam B — offline writes.                                               |
| `outbox.ts` / `drain.ts` | Durable write queue and its replay.                                    |
| `conflict-resolver.ts`   | 409 business rules.                                                    |
| `sync-engine.ts`         | Populating the cache; permission refresh.                              |
| `session-store.ts`       | Offline session metadata, user-switch enforcement.                     |
| `storage-policy.ts`      | Quota, LRU eviction, cache purging.                                    |
| `download-course.ts`     | Explicit "make available offline".                                     |
| `telemetry.ts`           | Sentry + Umami instrumentation, in one place.                          |

---

## 3. Architectural decisions

**A — Dexie over raw IndexedDB.** TypeScript generics, a versioned migration
system, and transactions. The verbosity of raw IndexedDB at this table count is
unmanageable. The service worker is the deliberate exception: it uses raw IndexedDB
so the ORM is not pulled into the worker bundle.

**B — Background Sync, with a page-context fallback.** iOS Safari and Firefox
desktop lack `SyncManager`, so `drainOutbox()` also runs in the page and is
triggered on every `online` event and app mount. Both paths write to the same
table with the same status semantics.

**C — Offline session, read-only.** A cached session gates _reading_ cached content
for a grace period after token expiry. It never authorises a write.

**D — Storage budget.** 200 MB without persistent storage, 500 MB with it. LRU
eviction over `media_cache_index` when the budget is crossed.

**E — Explicit downloads.** Initial sync deliberately covers the org shell, the
course list, and the user's own trail — not the whole library. Full course content
is opt-in via `DownloadCourseButton`, so a large org cannot exhaust a learner's
storage without them asking for it.

---

## 4. Behaviour preservation contract

Every change had to satisfy these. They are the reason offline support can ship
without risking the existing product.

1. **Online behaviour is identical.** Offline logic lives strictly in the
   offline/`catch` branch and is unreachable while online.
2. **Additive and flag-gated.** With `NEXT_PUBLIC_OFFLINE_READ_ENABLED` and
   `NEXT_PUBLIC_OFFLINE_WRITE_ENABLED` off, the app is the app it was.
3. **No signature breaks.** Only optional parameters and additional return fields.
4. **SSR and Server Actions untouched**, except the one re-homed completion path —
   and the original server action remains for the online case.
5. **Backend responses unchanged.** ETag/304, `Cache-Control`, idempotency and the
   delta endpoint are additive; a client that sends no new headers sees no change.
6. **Queued writes replay the real request** — never a synthesized substitute.
7. **Reversible.** Flags off, plus `DISABLE_PWA` as a service worker kill switch.

Verified: flag off ⇒ passthrough with one network call; online ⇒ passthrough with
one network call; offline with nothing cached ⇒ zero network calls and a typed
`OfflineUnavailableError`.

---

## 5. Security

### 5.1 Threat model

|        | Threat                                      | Mitigation                                                                                                                                                                                         |
| ------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T1** | Stale permissions after a role change       | `syncPermissions()` runs **first** on every sync; changed roles evict cached content immediately                                                                                                   |
| **T2** | A demoted admin retains cached admin pages  | Admin surfaces are `NetworkOnly` in the worker and `never` in the policy registry; `/dash` is guarded (except the user's own account pages)                                                        |
| **T3** | XSS reads local data                        | Not solvable by encrypting at rest — the page can read whatever it can decrypt. Addressed at the application layer (CSP, sanitisation). We reduce the prize instead: no tokens are stored (see S6) |
| **T4** | Outbox replay with a stale token            | Rows carry no credentials; a fresh token is injected at replay. A revoked token yields 401 and the row is marked FAILED                                                                            |
| **T5** | Forged outbox entry for a privileged action | The backend authorises every write regardless of origin; a forged row gets 403                                                                                                                     |
| **T6** | Cross-user leakage on a shared device       | `enforceSessionOwner()` wipes all tables and `lh-*` caches on user switch — including when the previous user never logged out                                                                      |

### 5.2 Controls in code

- **S1 — Sensitive denylist.** One list (`sw-cache-patterns.js`) drives both the
  worker's `NetworkOnly` rules and the in-page `never` policy, so they cannot drift.
  Covers payments, referrals, marketers, admin, audit, auth, code execution, AI,
  live sessions, and nested `.../admin/...` paths.
- **S2 — Wipe on user switch, not just logout.** The original design only cleared on
  logout, which leaves data exposed when a user simply closes the tab.
- **S3 — No tokens in the outbox.** `Authorization` and `Cookie` are stripped at
  enqueue time and injected at replay.
- **S4 — Cache lifecycle.** All caches are `lh-*` so they can be purged as a set.
- **S5 — Destructive and financial actions are never queued.** Every `DELETE`, all
  payments, payouts, KYC, grading, member removal, and invites are blocked offline
  with a user-facing reason. A queued destructive action that replays after the user
  changed their mind — or after their permissions changed — is a data-integrity
  hazard.
- **S6 — No token at rest.** The backend already issues the access token in a
  cookie with `httponly=False`, so encrypting a copy in IndexedDB would be theatre:
  the device owner holds the key either way. We store only non-secret session
  metadata and read the real token from the live session.
- **S7 — Permission-first reconnect.** Roles refresh before content on every sync.

### 5.3 Never persisted

Raw JWTs · payment or payment-intent data · password-reset tokens · OAuth state ·
admin analytics · audit logs · websocket tickets.

### 5.4 Content Security Policy

Authored from scratch in `next.config.js` — the app previously had none.

`worker-src 'self'` is the directive that matters here. `object-src 'none'`,
`base-uri 'self'` and `frame-ancestors 'self'` come along cheaply.

> **Known limitation.** `script-src` includes `'unsafe-inline'` because
> `RootLayout` renders an inline theme script and Next.js injects inline hydration
> scripts. Removing it requires threading a nonce through middleware — a worthwhile
> follow-up, not a blocker. Set `CSP_REPORT_ONLY=true` to observe violations before
> enforcing.

---

## 6. Offline behaviour by domain

Machine-readable source of truth: `lib/offline/policy.ts`.

| Domain                                             | Read                                      | Write                              |
| -------------------------------------------------- | ----------------------------------------- | ---------------------------------- |
| Courses, chapters, activities, blocks, collections | cache                                     | queue (deletes blocked)            |
| Activity completion (`trail/add_activity`)         | cache                                     | **queue** — the core offline write |
| Un-completion (`trail/remove_activity`)            | cache                                     | blocked (DELETE)                   |
| Quiz answers                                       | cache                                     | queue                              |
| Assignment text submissions                        | cache                                     | queue                              |
| Assignment file uploads / grading                  | cache                                     | blocked                            |
| Certificates                                       | cache (7 days)                            | blocked                            |
| Notifications, announcements                       | cache                                     | queue (read receipts)              |
| Search                                             | client-side substring over cached content | —                                  |
| Payments, referrals, marketers                     | **never**                                 | **blocked**                        |
| Admin, audit logs, dashboards                      | **never**                                 | **blocked**                        |
| Auth, password changes                             | **never**                                 | **blocked**                        |
| AI, live sessions, code execution                  | **never**                                 | **blocked**                        |

### Un-completion is online-only

A deliberate product decision, not an oversight: `DELETE` is never queued (S5), and
it matches the conflict rule that the server wins for `completed = false`. Revisit
with product if learners need to un-complete offline.

---

## 7. Conflict resolution

Business rules, in `conflict-resolver.ts`:

1. Completion `true` → **client wins** (a 409 means the server already agrees).
2. Completion `false` → **server wins**.
3. Draft submission → **client wins**; never silently discarded.
4. Already-submitted → **duplicate**; settle without resubmitting.
5. Everything else → **server wins**, surfaced in the sync panel.

---

## 8. Operations

### Configuration

| Variable                                 | Default | Purpose                              |
| ---------------------------------------- | ------- | ------------------------------------ |
| `NEXT_PUBLIC_OFFLINE_READ_ENABLED`       | `false` | Offline reads                        |
| `NEXT_PUBLIC_OFFLINE_WRITE_ENABLED`      | `false` | Offline writes / outbox              |
| `NEXT_PUBLIC_OFFLINE_CACHE_MAX_MB`       | `200`   | Storage budget                       |
| `NEXT_PUBLIC_OFFLINE_GRACE_PERIOD_HOURS` | `72`    | Read-only grace after expiry         |
| `NEXT_PUBLIC_OFFLINE_ENABLE_VIDEO_CACHE` | `false` | Cache hosted video                   |
| `NEXT_PUBLIC_OFFLINE_SYNC_RETRY_MAX`     | `5`     | Replay attempts                      |
| `DISABLE_PWA`                            | —       | Kill switch: skips worker generation |
| `CSP_REPORT_ONLY`                        | —       | CSP in report-only mode              |

The `NEXT_PUBLIC_` prefix is mandatory — without it the value never reaches the
browser. The service worker cannot read runtime config at all and uses the compiled
defaults from `constants.ts`.

### Deployment requirements

- **HTTPS.** Service workers, Cache Storage, persistent storage and Background Sync
  all require a secure context.
- **`BUILD_ID` must be the commit SHA.** Different replicas serving different
  precache manifests under the same build id strands load-balanced users on a
  broken cache. CI enforces this via `verify-pwa-build.mjs`.
- **Redis.** Backs idempotency and refresh rate limiting. Both fail _open_ — an
  outage degrades de-duplication, never availability.

### Rolling back

1. Set both `NEXT_PUBLIC_OFFLINE_*` flags to `false` → the app reverts to its
   previous behaviour immediately.
2. If the worker itself is the problem, set `DISABLE_PWA=true` and redeploy.
3. Local data is a cache; discarding it costs nothing that has already synced.

### Monitoring

Sentry errors are tagged `offline: true` with an `offline_context` naming the code
path. Exhausted outbox entries arrive as warnings tagged `outbox_failure` — a spike
across users means an API regression, not unlucky individuals.

Umami events: `offline_session_start` / `_end`, `offline_content_viewed`,
`offline_sync_completed` / `_failed`, `offline_course_downloaded`,
`offline_storage_evicted`. Counts and durations only — no learner data.

---

## 9. Testing

| Suite              | Command                                 | Coverage                                                                                           |
| ------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Unit (85 tests)    | `pnpm test`                             | Policy invariants, outbox, session isolation, conflicts                                            |
| Backend (28 tests) | `uv run pytest src/tests/`              | ETag/304, cache-control, idempotency, rate limiting                                                |
| E2E                | `pnpm test:e2e`                         | Real service worker, real offline (needs `npx playwright install chromium` and seeded credentials) |
| Build gates        | `pnpm verify:pwa && pnpm verify:bundle` | Worker integrity, cache rules, bundle budget                                                       |

Security invariants are covered by tests, not just prose: S1 (nothing sensitive
cached), S2 (user-switch wipe, including the closed-tab case), S3 (no tokens in the
outbox), S5 (destructive and financial writes never queued).

---

## 10. Known limitations

1. **iOS Safari has no Background Sync.** Writes drain on next app open rather than
   in the background. Document this for users.
2. **CSP still allows inline scripts** (§5.4).
3. **Un-completion is online-only** (§6).
4. **Server-rendered pages need a cached shell.** Pages that fetch on the Next.js
   server cannot render offline from the server; the worker serves the app shell and
   hydration reads IndexedDB.
5. **Delta sync compares date strings.** `update_date` is stored as
   `str(datetime.now(UTC))`, so comparison is lexicographic. Correct for a fixed
   UTC format — but if that format ever changes, `_to_update_date_string()` must
   change with it.

---

## 11. Traps found the hard way

Four bugs surfaced only when the suite was run against a real browser. Every one of
them was silent — nothing logged a useful error, and the app looked fine — so they
are recorded here in full.

**None of them would have been caught by typechecking, linting, unit tests, or the
production build.** That is the argument for running the E2E suite before trusting
offline mode in production.

### A single 404 in the precache kills offline support entirely

Workbox fails the **whole** service worker install if any precached URL cannot be
fetched. The worker goes `installing → redundant`, never activates, and offline
support is completely dead — with no console error on the page.

`/assets/illustrations/edu_background.png` and `edu_doodle_bg.png` were being
precached but returned 404, so the worker never survived install.

Guarded by `verify-pwa-build.mjs`, which now fails the build if the precache
manifest references a file missing from `public/`.

### `proxy.ts` swallows any unlisted `public/` subdirectory

The middleware matcher lists the public subdirectories to _exclude_ from org-slug
rewriting. `assets` was missing, so `/assets/**` was rewritten into an org route
and 404'd — a pre-existing bug that predates offline support and made those two
illustrations unreachable in the app.

**When adding a subdirectory to `public/`, add it to the matcher in `proxy.ts`.**
Nothing else will tell you.

### The offline fallback page was unreachable, and not precached

Two compounding problems, both invisible:

1. `/offline` hit the same `proxy.ts` matcher trap as `assets` — it was rewritten
   into an org route and returned **404**, so the fallback page could never load.
2. The generated fallback handler resolves a failed navigation with
   `caches.match('/offline', { ignoreSearch: true })`, but Next.js precaches only
   the route's **JS chunk**, never the HTML document. The lookup missed and the
   navigation failed with `ERR_FAILED`.

Fixed by adding `offline` to the proxy matcher and precaching the document via
`workboxOptions.additionalManifestEntries`.

### `connect-src` without `http:` breaks the whole app

The first CSP allowed `https:` but not `http:`. LearnHouse self-hosts its API over
plain HTTP by default (`http://localhost:1338`), so every API call was blocked with
"Refused to connect" — the app loaded and then did nothing.

`connect-src` now includes `http:`. It is permissive by design; see §5.4.

---

## 12. Changing offline behaviour

- **New endpoint?** Add a rule to `policy.ts`. Do not add offline branches inside a
  service function.
- **New cacheable segment?** Add it to `sw-cache-patterns.js` so the worker and the
  app stay in agreement.
- **Schema change?** Bump `DB_VERSION` in `constants.ts` and add a
  `.version(n).stores({...}).upgrade(...)` block in `db.ts`.
- **New queueable write?** Route it through `offlineWrite()` and confirm the backend
  endpoint honours `X-Idempotency-Key`.
- **Anything security-adjacent?** Add the test alongside it. The S-numbered controls
  in §5.2 each have one; keep it that way.
