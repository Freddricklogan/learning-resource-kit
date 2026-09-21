import { describe, expect, it } from 'vitest';
import { createProgress } from '../src/kit/progress.ts';
import { memoryStore } from '../src/kit/storage.ts';

describe('createProgress', () => {
  it('records known sections once and computes a rounded percentage', () => {
    const mem = memoryStore();
    const p = createProgress(mem, 'k', ['a', 'b', 'c']);
    expect(p.percent()).toBe(0);
    expect(p.markOpened('a')).toBe(true);
    expect(p.markOpened('a')).toBe(false);
    expect(p.markOpened('zz')).toBe(false);
    expect(p.opened()).toEqual(['a']);
    expect(p.isOpened('a')).toBe(true);
    expect(p.isOpened('b')).toBe(false);
    expect(p.percent()).toBe(33);
    p.reset();
    expect(p.opened()).toEqual([]);
  });
  it('ignores corrupt or unknown stored ids', () => {
    const mem = memoryStore();
    mem.set('k', JSON.stringify(['a', 'nope', 5]));
    const p = createProgress(mem, 'k', ['a', 'b']);
    expect(p.opened()).toEqual(['a']);
    mem.set('k', '"string"');
    expect(p.opened()).toEqual([]);
    expect(createProgress(mem, 'k2', []).percent()).toBe(0);
  });
});
