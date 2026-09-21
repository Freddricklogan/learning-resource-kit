import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStore, readJson, safeLocalStore } from '../src/kit/storage.ts';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('safeLocalStore', () => {
  it('uses localStorage when it works', () => {
    const s = safeLocalStore();
    expect(s.set('k', 'v')).toBe(true);
    expect(localStorage.getItem('k')).toBe('v');
    expect(s.get('k')).toBe('v');
    s.remove('k');
    expect(s.get('k')).toBeNull();
  });
  it('falls back to memory when localStorage throws on probe', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const s = safeLocalStore();
    expect(s.set('k', 'v')).toBe(true);
    expect(s.get('k')).toBe('v');
    expect(localStorage.getItem('k')).toBeNull();
  });
  it('falls back per call when a later write throws', () => {
    const s = safeLocalStore();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(s.set('k', 'v')).toBe(true);
    expect(s.get('k')).toBe('v');
    s.remove('k');
    expect(s.get('k')).toBeNull();
  });
});

describe('readJson', () => {
  it('returns the fallback for missing or malformed values', () => {
    const s = memoryStore();
    expect(readJson(s, 'x', 7)).toBe(7);
    s.set('x', '{not json');
    expect(readJson(s, 'x', 7)).toBe(7);
    s.set('x', '[1,2]');
    expect(readJson(s, 'x', [])).toEqual([1, 2]);
  });
});
