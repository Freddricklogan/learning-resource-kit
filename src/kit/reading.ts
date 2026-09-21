/** Reading-time and section-index helpers. Pure functions over strings and a minimal DOM shape so
 * they can be tested without a browser. */

export const DEFAULT_WPM = 230;

export function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  return words.length;
}

/** Minutes, rounded up, never below 1 for non-empty text. */
export function readingMinutes(words: number, wpm: number = DEFAULT_WPM): number {
  if (words <= 0) return 0;
  if (wpm <= 0) throw new RangeError('wpm must be positive');
  return Math.max(1, Math.ceil(words / wpm));
}

export interface SectionInfo {
  id: string;
  title: string;
  words: number;
}

interface SectionLike {
  id: string;
  textContent: string | null;
  querySelector(selector: string): { textContent: string | null } | null;
}

/** Index of `section[id]` elements: id, its h2 text, and its word count. */
export function sectionIndex(sections: Iterable<SectionLike>): SectionInfo[] {
  const out: SectionInfo[] = [];
  for (const s of sections) {
    if (!s.id) continue;
    const title = s.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim() ?? s.id;
    out.push({ id: s.id, title, words: wordCount(s.textContent ?? '') });
  }
  return out;
}
