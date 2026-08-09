/**
 * Jest setup.
 *
 * `fake-indexeddb/auto` installs an in-memory IndexedDB on `globalThis`, letting
 * the Dexie layer be exercised for real rather than mocked — migrations, indexes,
 * and transaction semantics all behave as they do in a browser.
 */

// jsdom does not expose `structuredClone`, which fake-indexeddb requires to
// simulate how IndexedDB stores values by copy rather than by reference. Node has
// had it natively since v17, so borrow it from the Node realm.
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = require('node:v8').deserialize
    ? (value) =>
        require('node:v8').deserialize(require('node:v8').serialize(value))
    : (value) => JSON.parse(JSON.stringify(value))
}

require('fake-indexeddb/auto')
require('@testing-library/jest-dom')

// jsdom implements neither the Cache Storage API nor StorageManager. Provide
// minimal, honest stand-ins so storage code paths run instead of throwing.
if (typeof globalThis.caches === 'undefined') {
  const stores = new Map()

  globalThis.caches = {
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)
      return {
        put: async (key, value) => void store.set(String(key), value),
        match: async (key) => store.get(String(key)),
        delete: async (key) => store.delete(String(key)),
        keys: async () => Array.from(store.keys()),
      }
    },
    keys: async () => Array.from(stores.keys()),
    delete: async (name) => stores.delete(name),
    __reset: () => stores.clear(),
  }
}

if (typeof navigator !== 'undefined' && !navigator.storage) {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {
      estimate: async () => ({ usage: 0, quota: 1024 * 1024 * 1024 }),
      persist: async () => false,
      persisted: async () => false,
    },
  })
}
