/** Section progress: which sections the reader has opened, persisted per resource. Pure state
 * with an injectable store; the DOM wiring lives in mount.ts. */

import { type KeyValueStore, readJson } from './storage.ts';

export interface Progress {
  sectionIds: readonly string[];
  opened(): string[];
  isOpened(id: string): boolean;
  /** Returns true when the id was newly recorded. Unknown ids are ignored and return false. */
  markOpened(id: string): boolean;
  percent(): number;
  reset(): void;
}

export function createProgress(store: KeyValueStore, key: string, sectionIds: readonly string[]): Progress {
  const known = new Set(sectionIds);
  const load = (): string[] => readJson<unknown>(store, key, []) as string[];
  const clean = (ids: unknown): string[] =>
    Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string' && known.has(x)) : [];
  return {
    sectionIds,
    opened: () => clean(load()),
    isOpened: (id) => clean(load()).includes(id),
    markOpened(id) {
      if (!known.has(id)) return false;
      const cur = clean(load());
      if (cur.includes(id)) return false;
      store.set(key, JSON.stringify([...cur, id]));
      return true;
    },
    percent() {
      if (sectionIds.length === 0) return 0;
      return Math.round((clean(load()).length / sectionIds.length) * 100);
    },
    reset: () => store.remove(key)
  };
}
