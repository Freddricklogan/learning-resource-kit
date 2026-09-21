import { describe, expect, it } from 'vitest';
import { readingMinutes, sectionIndex, wordCount } from '../src/kit/reading.ts';

describe('wordCount', () => {
  it('counts words with letters or digits and ignores punctuation-only tokens', () => {
    expect(wordCount('Hello, world — 2 words? — ...')).toBe(4);
    expect(wordCount('   ')).toBe(0);
    expect(wordCount('Ünïcödé façade 日本語')).toBe(3);
  });
});

describe('readingMinutes', () => {
  it('rounds up, floors at one minute, and rejects a non-positive rate', () => {
    expect(readingMinutes(0)).toBe(0);
    expect(readingMinutes(1)).toBe(1);
    expect(readingMinutes(230)).toBe(1);
    expect(readingMinutes(231)).toBe(2);
    expect(readingMinutes(1000, 100)).toBe(10);
    expect(() => readingMinutes(10, 0)).toThrow(RangeError);
  });
});

describe('sectionIndex', () => {
  it('reads id, h2 title and words from section-like nodes', () => {
    document.body.innerHTML =
      '<section id="one"><div><h2>  First\n title </h2><p>alpha beta</p></div></section>' +
      '<section><h2>no id</h2></section>' +
      '<section id="two"><p>gamma</p></section>';
    const idx = sectionIndex(document.querySelectorAll('section'));
    expect(idx).toEqual([
      { id: 'one', title: 'First title', words: 4 },
      { id: 'two', title: 'two', words: 1 }
    ]);
  });
});
