/**
 * Custom service worker additions.
 *
 * `@ducanh2912/next-pwa` compiles this file via `customWorkerDir` and imports it
 * into the generated `sw.js`. Only add code here that must run in the worker; the
 * runtime caching rules and the offline fallbacks are declared in
 * `next.config.js` so they stay in one place.
 *
 * DELIBERATE OMISSION — no Dexie here. Pulling the ORM into the worker bundle
 * would duplicate schema knowledge and inflate the worker, so this file talks to
 * IndexedDB directly using the shared names from `constants.ts`.
 *
 * SECURITY (S3) — the worker never stores or receives a long-lived token. When a
 * page is open it delegates the drain to that page, which holds the live session.
 * With no page open it replays using the request's own cookies, which the server
 * validates exactly as it would any other request. Every queued row carries an
 * idempotency key, so even a duplicated replay cannot double-apply server-side.
 */

/* eslint-env serviceworker */
/* global self, clients, indexedDB */

const DB_NAME = 'LearnHouseDB'
const OUTBOX_STORE = 'outbox'
const SYNC_TAG = 'lh-outbox-sync'

const STATUS_PENDING = 'PENDING'
const STATUS_RETRYING = 'RETRYING'
const STATUS_FAILED = 'FAILED'
const STATUS_SYNCED = 'SYNCED'

const RETRY_MAX = 5
const PERMANENT_STATUSES = [400, 401, 403, 404, 409, 410, 422]

/** Opens the existing database. Never upgrades — the page owns the schema. */
function openDatabase() {
  return new Promise(function (resolve, reject) {
    const request = indexedDB.open(DB_NAME)
    request.onsuccess = function () {
      resolve(request.result)
    }
    request.onerror = function () {
      reject(request.error)
    }
  })
}

function txStore(db, mode) {
  return db.transaction(OUTBOX_STORE, mode).objectStore(OUTBOX_STORE)
}

function readReplayableRows(db) {
  return new Promise(function (resolve, reject) {
    const rows = []
    let store
    try {
      store = txStore(db, 'readonly')
    } catch (error) {
      // Store missing (page never initialised the DB) — nothing to drain.
      resolve(rows)
      return
    }

    const cursorRequest = store.openCursor()
    cursorRequest.onsuccess = function (event) {
      const cursor = event.target.result
      if (!cursor) {
        rows.sort(function (a, b) {
          if (a.entity_type === b.entity_type)
            return a.created_at - b.created_at
          return a.entity_type < b.entity_type ? -1 : 1
        })
        resolve(rows)
        return
      }
      const value = cursor.value
      if (value.status === STATUS_PENDING || value.status === STATUS_RETRYING) {
        rows.push(value)
      }
      cursor.continue()
    }
    cursorRequest.onerror = function () {
      reject(cursorRequest.error)
    }
  })
}

function writeRow(db, row) {
  return new Promise(function (resolve, reject) {
    const store = txStore(db, 'readwrite')
    const request = store.put(row)
    request.onsuccess = function () {
      resolve()
    }
    request.onerror = function () {
      reject(request.error)
    }
  })
}

function readErrorDetail(response) {
  return response
    .text()
    .then(function (text) {
      if (!text) return response.statusText
      try {
        const json = JSON.parse(text)
        return json.detail || json.message || text.slice(0, 200)
      } catch (error) {
        return text.slice(0, 200)
      }
    })
    .catch(function () {
      return response.statusText
    })
}

/** Replays one queued row, updating its status in place. */
function replayRow(db, row) {
  const headers = Object.assign({}, row.headers || {}, {
    'X-Idempotency-Key': row.idempotency_key,
  })

  return fetch(row.url, {
    method: row.method,
    headers: headers,
    body: row.body || undefined,
    // Cookie-based auth; the server validates it like any other request.
    credentials: 'include',
    redirect: 'follow',
  })
    .then(function (response) {
      if (response.ok) {
        row.status = STATUS_SYNCED
        row.last_attempt_at = Date.now()
        row.error_message = null
        return writeRow(db, row).then(function () {
          return 'synced'
        })
      }

      return readErrorDetail(response).then(function (detail) {
        const message = response.status + ': ' + detail
        row.last_attempt_at = Date.now()
        row.error_message = message

        if (PERMANENT_STATUSES.indexOf(response.status) !== -1) {
          row.status = STATUS_FAILED
          return writeRow(db, row).then(function () {
            return 'failed'
          })
        }

        row.retry_count = (row.retry_count || 0) + 1
        row.status =
          row.retry_count >= RETRY_MAX ? STATUS_FAILED : STATUS_RETRYING
        return writeRow(db, row).then(function () {
          return row.status === STATUS_FAILED ? 'failed' : 'retry'
        })
      })
    })
    .catch(function (error) {
      row.retry_count = (row.retry_count || 0) + 1
      row.last_attempt_at = Date.now()
      row.error_message = (error && error.message) || 'Network error'
      row.status =
        row.retry_count >= RETRY_MAX ? STATUS_FAILED : STATUS_RETRYING
      return writeRow(db, row).then(function () {
        return row.status === STATUS_FAILED ? 'failed' : 'retry'
      })
    })
}

/** Notifies every open tab so the sync UI can refresh. */
function broadcast(payload) {
  return clients
    .matchAll({ includeUncontrolled: true, type: 'window' })
    .then(function (windowClients) {
      windowClients.forEach(function (client) {
        client.postMessage(payload)
      })
    })
}

/**
 * Drains the outbox.
 *
 * When a page is open we hand the work to it: the page holds the live session and
 * can inject a fresh bearer token, and its own re-entry guard prevents a double
 * send. Only when no page exists does the worker replay directly.
 */
function drainOutbox() {
  return clients
    .matchAll({ includeUncontrolled: true, type: 'window' })
    .then(function (windowClients) {
      if (windowClients.length > 0) {
        windowClients.forEach(function (client) {
          client.postMessage({ type: 'lh-drain-request' })
        })
        return { delegated: true }
      }

      return openDatabase().then(function (db) {
        return readReplayableRows(db).then(function (rows) {
          let synced = 0
          let failed = 0

          // Sequential: the backend has ordering constraints within an entity type.
          return rows
            .reduce(function (chain, row) {
              return chain.then(function () {
                return replayRow(db, row).then(function (outcome) {
                  if (outcome === 'synced') synced++
                  else if (outcome === 'failed') failed++
                })
              })
            }, Promise.resolve())
            .then(function () {
              return { synced: synced, failed: failed, delegated: false }
            })
        })
      })
    })
    .then(function (result) {
      return broadcast({
        type: 'lh-sync-complete',
        payload: result,
      }).then(function () {
        return result
      })
    })
    .catch(function (error) {
      return broadcast({
        type: 'lh-sync-error',
        payload: { message: (error && error.message) || 'Sync failed' },
      })
    })
}

// ─── Background Sync ─────────────────────────────────────────────────────────
self.addEventListener('sync', function (event) {
  if (event.tag !== SYNC_TAG) return
  event.waitUntil(drainOutbox())
})

// ─── Manual trigger from a page (Background Sync unavailable) ────────────────
self.addEventListener('message', function (event) {
  const data = event.data
  if (!data) return

  if (data.type === 'lh-request-drain') {
    event.waitUntil(drainOutbox())
    return
  }

  // Lets the app activate a waiting worker on the user's terms.
  if (data.type === 'lh-skip-waiting') {
    self.skipWaiting()
  }
})
