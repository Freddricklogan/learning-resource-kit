import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { validateQuiz } from '../src/lr-kit.js';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

describe('resource config', () => {
  it('names the resource and points at its own repository and Pages URL', () => {
    expect(config.title.length).toBeGreaterThan(3);
    expect(config.tagline.length).toBeGreaterThan(20);
    expect(config.repo).toMatch(/^https:\/\/github\.com\/Freddricklogan\/[a-z0-9-]+$/);
    expect(config.pagesUrl).toBe(`https://freddricklogan.github.io/${config.repo.split('/').pop()}/`);
    expect(html).toContain(`href="${config.pagesUrl}"`);
  });
  it('ships at least five valid quiz questions with explanations', () => {
    expect(validateQuiz(config.quiz)).toEqual([]);
    expect(config.quiz.length).toBeGreaterThanOrEqual(5);
    for (const q of config.quiz) {
      expect(q.explanation, q.id).toBeTruthy();
      expect(q.explanation.length, q.id).toBeGreaterThan(40);
    }
  });
});

describe('page', () => {
  it('has a strict CSP, no inline script or style, and the kit entry point', () => {
    expect(html).toMatch(/Content-Security-Policy[^>]*default-src 'none'/);
    expect(html).not.toMatch(/\sstyle="/);
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/);
    expect(html).not.toMatch(/\son[a-z]+="/);
    expect(html).toContain('<script type="module" src="src/main.js"></script>');
    expect(html).toContain('<main');
  });
  it('has unique section ids the navigation links resolve to', () => {
    const ids = [...html.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    const navTargets = [...html.matchAll(/class="navlinks"[\s\S]*?<\/div>/g)].flatMap((m) => [...m[0].matchAll(/href="#([^"]+)"/g)].map((h) => h[1]));
    for (const t of navTargets) expect(html, t).toMatch(new RegExp(`\\sid="${t}"`));
  });
});
