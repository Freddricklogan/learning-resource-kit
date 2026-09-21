/** localStorage access that never throws: private windows, blocked storage and quota errors all
 * degrade to in-memory behaviour for the session. */

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): void;
}

export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => {
      map.set(k, v);
      return true;
    },
    remove: (k) => {
      map.delete(k);
    }
  };
}

export function safeLocalStore(fallback: KeyValueStore = memoryStore()): KeyValueStore {
  let ls: Storage | null = null;
  try {
    ls = globalThis.localStorage;
    const probe = '__lr_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
  } catch {
    ls = null;
  }
  if (!ls) return fallback;
  const store = ls;
  return {
    get: (k) => {
      try {
        return store.getItem(k);
      } catch {
        return fallback.get(k);
      }
    },
    set: (k, v) => {
      try {
        store.setItem(k, v);
        return true;
      } catch {
        return fallback.set(k, v);
      }
    },
    remove: (k) => {
      try {
        store.removeItem(k);
      } catch {
        fallback.remove(k);
      }
    }
  };
}

export function readJson<T>(store: KeyValueStore, key: string, fallback: T): T {
  const raw = store.get(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
