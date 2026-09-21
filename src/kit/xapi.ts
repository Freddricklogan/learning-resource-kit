/** xAPI 1.0.3 statement builder and a local statement store. Statements are kept in the reader's
 * browser only; nothing is transmitted (the page CSP has connect-src 'none'). */

import { type KeyValueStore, readJson } from './storage.ts';

export const VERBS = {
  experienced: 'http://adlnet.gov/expapi/verbs/experienced',
  answered: 'http://adlnet.gov/expapi/verbs/answered',
  completed: 'http://adlnet.gov/expapi/verbs/completed'
} as const;

export type VerbName = keyof typeof VERBS;

export const ACTIVITY_TYPES = {
  module: 'http://adlnet.gov/expapi/activities/module',
  question: 'http://adlnet.gov/expapi/activities/question',
  assessment: 'http://adlnet.gov/expapi/activities/assessment'
} as const;

export interface LangMap {
  'en-US': string;
}

export interface Statement {
  id: string;
  actor: { objectType: 'Agent'; account: { homePage: string; name: string } };
  verb: { id: string; display: LangMap };
  object: {
    objectType: 'Activity';
    id: string;
    definition: { name: LangMap; type: string };
  };
  result?: {
    success?: boolean;
    response?: string;
    completion?: boolean;
    score?: { scaled: number; raw?: number; max?: number };
  };
  timestamp: string;
  version: '1.0.3';
}

export interface StatementInput {
  actor: { homePage: string; name: string };
  verb: VerbName;
  object: { id: string; name: string; type: keyof typeof ACTIVITY_TYPES };
  result?: Statement['result'];
  timestamp?: Date;
  id?: string;
}

export function uuid(random: () => number = Math.random): string {
  // RFC 4122 version 4 layout from a caller-supplied source (crypto when available).
  const bytes = new Uint8Array(16);
  const c = globalThis.crypto;
  if (random === Math.random && c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(random() * 256);
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildStatement(input: StatementInput): Statement {
  const verbId = VERBS[input.verb];
  const s: Statement = {
    id: input.id ?? uuid(),
    actor: { objectType: 'Agent', account: { homePage: input.actor.homePage, name: input.actor.name } },
    verb: { id: verbId, display: { 'en-US': input.verb } },
    object: {
      objectType: 'Activity',
      id: input.object.id,
      definition: { name: { 'en-US': input.object.name }, type: ACTIVITY_TYPES[input.object.type] }
    },
    timestamp: (input.timestamp ?? new Date()).toISOString(),
    version: '1.0.3'
  };
  if (input.result) s.result = input.result;
  return s;
}

/** Structural check used by tests and by the export panel. */
export function isStatement(x: unknown): x is Statement {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Record<string, unknown>;
  const actor = s['actor'] as Record<string, unknown> | undefined;
  const verb = s['verb'] as Record<string, unknown> | undefined;
  const object = s['object'] as Record<string, unknown> | undefined;
  return (
    typeof s['id'] === 'string' &&
    actor?.['objectType'] === 'Agent' &&
    typeof verb?.['id'] === 'string' &&
    object?.['objectType'] === 'Activity' &&
    typeof object['id'] === 'string' &&
    typeof s['timestamp'] === 'string' &&
    s['version'] === '1.0.3'
  );
}

export interface StatementStore {
  record(statement: Statement): Statement[];
  all(): Statement[];
  clear(): void;
}

export function createStatementStore(store: KeyValueStore, key: string, cap: number = 500): StatementStore {
  const load = (): Statement[] => readJson<unknown[]>(store, key, []).filter(isStatement);
  return {
    record(statement) {
      const next = [...load(), statement].slice(-cap);
      store.set(key, JSON.stringify(next));
      return next;
    },
    all: load,
    clear: () => store.remove(key)
  };
}

/** A stable anonymous actor per browser: no name, no email, no cross-site identifier. */
export function anonymousActor(store: KeyValueStore, key: string, homePage: string): { homePage: string; name: string } {
  let name = store.get(key);
  if (!name) {
    name = `anon-${uuid().slice(0, 8)}`;
    store.set(key, name);
  }
  return { homePage, name };
}
