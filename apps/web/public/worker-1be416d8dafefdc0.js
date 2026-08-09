!(function () {
  try {
    var t =
        'u' > typeof window
          ? window
          : 'u' > typeof global
            ? global
            : 'u' > typeof globalThis
              ? globalThis
              : 'u' > typeof self
                ? self
                : {},
      e = new t.Error().stack
    e &&
      ((t._sentryDebugIds = t._sentryDebugIds || {}),
      (t._sentryDebugIds[e] = '55fca99e-5ecd-412b-9bdf-6e41d59edc6f'),
      (t._sentryDebugIdIdentifier =
        'sentry-dbid-55fca99e-5ecd-412b-9bdf-6e41d59edc6f'))
  } catch (t) {}
})(),
  (() => {
    let t = 'outbox',
      e = 'RETRYING',
      n = 'FAILED',
      r = [400, 401, 403, 404, 409, 410, 422]
    function o(e, n) {
      return e.transaction(t, n).objectStore(t)
    }
    function u(t, e) {
      return new Promise(function (n, r) {
        let u = o(t, 'readwrite').put(e)
        ;(u.onsuccess = function () {
          n()
        }),
          (u.onerror = function () {
            r(u.error)
          })
      })
    }
    function s(t) {
      return clients
        .matchAll({ includeUncontrolled: !0, type: 'window' })
        .then(function (e) {
          e.forEach(function (e) {
            e.postMessage(t)
          })
        })
    }
    function c() {
      return clients
        .matchAll({ includeUncontrolled: !0, type: 'window' })
        .then(function (t) {
          return t.length > 0
            ? (t.forEach(function (t) {
                t.postMessage({ type: 'lh-drain-request' })
              }),
              { delegated: !0 })
            : new Promise(function (t, e) {
                let n = indexedDB.open('LearnHouseDB')
                ;(n.onsuccess = function () {
                  t(n.result)
                }),
                  (n.onerror = function () {
                    e(n.error)
                  })
              }).then(function (t) {
                return new Promise(function (n, r) {
                  let u,
                    s = []
                  try {
                    u = o(t, 'readonly')
                  } catch (t) {
                    n(s)
                    return
                  }
                  let c = u.openCursor()
                  ;(c.onsuccess = function (t) {
                    let r = t.target.result
                    if (!r) {
                      s.sort(function (t, e) {
                        return t.entity_type === e.entity_type
                          ? t.created_at - e.created_at
                          : t.entity_type < e.entity_type
                            ? -1
                            : 1
                      }),
                        n(s)
                      return
                    }
                    let o = r.value
                    ;('PENDING' === o.status || o.status === e) && s.push(o),
                      r.continue()
                  }),
                    (c.onerror = function () {
                      r(c.error)
                    })
                }).then(function (o) {
                  let s = 0,
                    c = 0
                  return o
                    .reduce(function (o, i) {
                      return o.then(function () {
                        let o
                        return ((o = Object.assign({}, i.headers || {}, {
                          'X-Idempotency-Key': i.idempotency_key,
                        })),
                        fetch(i.url, {
                          method: i.method,
                          headers: o,
                          body: i.body || void 0,
                          credentials: 'include',
                          redirect: 'follow',
                        })
                          .then(function (o) {
                            return o.ok
                              ? ((i.status = 'SYNCED'),
                                (i.last_attempt_at = Date.now()),
                                (i.error_message = null),
                                u(t, i).then(function () {
                                  return 'synced'
                                }))
                              : o
                                  .text()
                                  .then(function (t) {
                                    if (!t) return o.statusText
                                    try {
                                      let e = JSON.parse(t)
                                      return (
                                        e.detail || e.message || t.slice(0, 200)
                                      )
                                    } catch (e) {
                                      return t.slice(0, 200)
                                    }
                                  })
                                  .catch(function () {
                                    return o.statusText
                                  })
                                  .then(function (s) {
                                    let c = o.status + ': ' + s
                                    return ((i.last_attempt_at = Date.now()),
                                    (i.error_message = c),
                                    -1 !== r.indexOf(o.status))
                                      ? ((i.status = n),
                                        u(t, i).then(function () {
                                          return 'failed'
                                        }))
                                      : ((i.retry_count =
                                          (i.retry_count || 0) + 1),
                                        (i.status = i.retry_count >= 5 ? n : e),
                                        u(t, i).then(function () {
                                          return i.status === n
                                            ? 'failed'
                                            : 'retry'
                                        }))
                                  })
                          })
                          .catch(function (r) {
                            return (
                              (i.retry_count = (i.retry_count || 0) + 1),
                              (i.last_attempt_at = Date.now()),
                              (i.error_message =
                                (r && r.message) || 'Network error'),
                              (i.status = i.retry_count >= 5 ? n : e),
                              u(t, i).then(function () {
                                return i.status === n ? 'failed' : 'retry'
                              })
                            )
                          })).then(function (t) {
                          'synced' === t ? s++ : 'failed' === t && c++
                        })
                      })
                    }, Promise.resolve())
                    .then(function () {
                      return { synced: s, failed: c, delegated: !1 }
                    })
                })
              })
        })
        .then(function (t) {
          return s({ type: 'lh-sync-complete', payload: t }).then(function () {
            return t
          })
        })
        .catch(function (t) {
          return s({
            type: 'lh-sync-error',
            payload: { message: (t && t.message) || 'Sync failed' },
          })
        })
    }
    self.addEventListener('sync', function (t) {
      'lh-outbox-sync' === t.tag && t.waitUntil(c())
    }),
      self.addEventListener('message', function (t) {
        let e = t.data
        if (e) {
          if ('lh-request-drain' === e.type) return void t.waitUntil(c())
          'lh-skip-waiting' === e.type && self.skipWaiting()
        }
      })
  })()
