import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/kit/storage.ts';
import { anonymousActor, buildStatement, createStatementStore, isStatement, uuid, VERBS } from '../src/kit/xapi.ts';

describe('uuid', () => {
  it('is RFC 4122 v4 shaped from crypto and from a supplied source', () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(uuid()).toMatch(re);
    expect(uuid(() => 0.999)).toMatch(re);
    expect(uuid(() => 0)).toMatch(re);
    expect(uuid()).not.toBe(uuid());
  });
});

describe('buildStatement', () => {
  it('produces a 1.0.3 statement with ADL verb and activity IRIs', () => {
    const s = buildStatement({
      actor: { homePage: 'https://example.invalid/r/', name: 'anon-1' },
      verb: 'answered',
      object: { id: 'https://example.invalid/r/#q1', name: 'Q1', type: 'question' },
      result: { success: true, response: 'B' },
      timestamp: new Date('2026-01-02T03:04:05Z'),
      id: '00000000-0000-4000-8000-000000000000'
    });
    expect(s).toEqual({
      id: '00000000-0000-4000-8000-000000000000',
      actor: { objectType: 'Agent', account: { homePage: 'https://example.invalid/r/', name: 'anon-1' } },
      verb: { id: VERBS.answered, display: { 'en-US': 'answered' } },
      object: {
        objectType: 'Activity',
        id: 'https://example.invalid/r/#q1',
        definition: { name: { 'en-US': 'Q1' }, type: 'http://adlnet.gov/expapi/activities/question' }
      },
      result: { success: true, response: 'B' },
      timestamp: '2026-01-02T03:04:05.000Z',
      version: '1.0.3'
    });
    expect(isStatement(s)).toBe(true);
  });
  it('omits result when none is given and defaults id and timestamp', () => {
    const s = buildStatement({ actor: { homePage: 'h', name: 'n' }, verb: 'experienced', object: { id: 'o', name: 'O', type: 'module' } });
    expect(s.result).toBeUndefined();
    expect(s.id).toHaveLength(36);
    expect(Date.parse(s.timestamp)).not.toBeNaN();
  });
});

describe('isStatement', () => {
  it('rejects non-statements', () => {
    expect(isStatement(null)).toBe(false);
    expect(isStatement({})).toBe(false);
    expect(isStatement({ id: 'x', actor: { objectType: 'Agent' }, verb: { id: 'v' }, object: { objectType: 'Activity', id: 'o' }, timestamp: 't', version: '1.0.0' })).toBe(false);
  });
});

describe('statement store and actor', () => {
  it('records with a cap, drops corrupt entries, and clears', () => {
    const mem = memoryStore();
    const store = createStatementStore(mem, 'k', 2);
    const mk = (n: string): ReturnType<typeof buildStatement> => buildStatement({ actor: { homePage: 'h', name: 'a' }, verb: 'experienced', object: { id: n, name: n, type: 'module' } });
    store.record(mk('1'));
    store.record(mk('2'));
    const all = store.record(mk('3'));
    expect(all.map((s) => s.object.id)).toEqual(['2', '3']);
    mem.set('k', JSON.stringify([...all, { junk: true }]));
    expect(store.all()).toHaveLength(2);
    store.clear();
    expect(store.all()).toEqual([]);
  });
  it('creates one anonymous actor per browser and reuses it', () => {
    const mem = memoryStore();
    const a = anonymousActor(mem, 'actor', 'https://example.invalid/');
    const b = anonymousActor(mem, 'actor', 'https://example.invalid/');
    expect(a).toEqual(b);
    expect(a.name).toMatch(/^anon-[0-9a-f]{8}$/);
    expect(a.homePage).toBe('https://example.invalid/');
  });
});
