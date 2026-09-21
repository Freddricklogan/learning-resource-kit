/* Exercises the vendored kit against this resource's own page so a stale or broken bundle fails here. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { initCollapsible, mountLearningResource, readingMinutes, scoreQuiz, wordCount } from '../src/lr-kit.js';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const bodyHtml = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));

let api;
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = bodyHtml.replace(/<script[\s\S]*?<\/script>/g, '');
  Element.prototype.scrollIntoView = () => undefined;
  initCollapsible();
  api = mountLearningResource(config);
});
afterEach(() => api.destroy());

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('kit applied to this page', () => {
  it('indexes every section with an id and computes a reading time from the real word count', () => {
    const ids = [...html.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(api.sections.map((s) => s.id)).toEqual(ids);
    const words = api.sections.reduce((n, s) => n + s.words, 0);
    expect(words).toBeGreaterThan(1000);
    expect(readingMinutes(words)).toBe(Math.ceil(words / 230));
    expect(wordCount('a b c')).toBe(3);
  });
  it('collapses sections, opens them on click, and records progress', async () => {
    const collapsed = document.querySelectorAll('section.collapsed');
    expect(collapsed.length).toBeGreaterThan(3);
    const head = collapsed[0].querySelector('.sec-head.sect-toggle');
    expect(head.getAttribute('aria-expanded')).toBe('false');
    head.click();
    await flush();
    expect(api.progress.opened()).toContain(collapsed[0].id);
    expect(api.statements.all().some((s) => s.verb.display['en-US'] === 'experienced')).toBe(true);
  });
  it('renders the quiz and scores a full attempt with a completed statement', async () => {
    expect(document.querySelectorAll('#lr-quiz fieldset')).toHaveLength(config.quiz.length);
    for (const q of config.quiz) {
      const input = document.querySelector(`#lr-${q.id}-${q.answer}`);
      input.checked = true;
      input.dispatchEvent(new Event('change'));
    }
    await flush();
    const score = scoreQuiz(api.quiz());
    expect(score).toMatchObject({ correct: config.quiz.length, complete: true, scaled: 1 });
    const completed = api.statements.all().find((s) => s.verb.display['en-US'] === 'completed');
    expect(completed.result.score).toEqual({ scaled: 1, raw: config.quiz.length, max: config.quiz.length });
    expect(completed.object.id).toBe(`${config.pagesUrl}#quiz`);
  });
});
