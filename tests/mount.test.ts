import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mountLearningResource, type ResourceApi } from '../src/kit/mount.ts';
import type { QuizItem } from '../src/kit/quiz.ts';

const quiz: QuizItem[] = [
  { id: 'q1', prompt: 'One?', options: ['a', 'b', 'c'], answer: 1, explanation: 'b it is' },
  { id: 'q2', prompt: 'Two?', options: ['a', 'b', 'c'], answer: 0 },
  { id: 'q3', prompt: 'Three?', options: ['a', 'b', 'c'], answer: 2 }
];

function page(): void {
  document.body.innerHTML = `
    <nav class="top"></nav>
    <header class="hero"><h1>Title</h1></header>
    <section aria-label="Executive summary"><div class="wrap"><div class="exec-summary"><h2>Summary</h2></div></div></section>
    <section id="s1" class="collapsed"><div class="wrap"><div class="sec-head sect-toggle"><h2>First</h2></div><div class="sect-body"><p>${'word '.repeat(300)}</p></div></div></section>
    <section id="s2"><div class="wrap"><div class="sec-head"><h2>Second</h2></div><p>open by default</p></div></section>
    <footer><div class="wrap">foot</div></footer>`;
  // Emulate the resources' collapsible behaviour: clicking the head toggles the class.
  const head = document.querySelector<HTMLElement>('#s1 .sec-head');
  head?.addEventListener('click', () => head.closest('section')?.classList.toggle('collapsed'));
}

let api: ResourceApi;
beforeEach(() => {
  localStorage.clear();
  page();
  api = mountLearningResource({ title: 'Demo', tagline: 'Tag', repo: 'https://github.com/x/y', pagesUrl: 'https://x.github.io/y/', quiz });
});
afterEach(() => api.destroy());

const kpi = (label: string): string => {
  const cells = [...document.querySelectorAll('.exec-kpi')];
  const cell = cells.find((c) => c.textContent?.includes(label));
  return cell?.querySelector('.exec-kpi__value')?.textContent ?? '';
};
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('mountLearningResource', () => {
  it('indexes sections, mounts the shell, and inserts the quiz before the footer', () => {
    expect(api.sections.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(document.querySelector('.exec-header h1')?.textContent).toBe('Demo');
    expect(document.querySelector('#lr-quiz + footer')).not.toBeNull();
    expect(document.querySelectorAll('#lr-quiz fieldset')).toHaveLength(3);
    expect(kpi('Sections')).toBe('2');
    expect(kpi('Reading time')).toBe('2 min');
  });
  it('counts an already-open section and records an experienced statement', async () => {
    await flush();
    expect(api.progress.opened()).toEqual(['s2']);
    expect(api.statements.all().map((s) => s.verb.display['en-US'])).toEqual(['experienced']);
    expect(kpi('Sections opened')).toBe('1 / 2');
  });
  it('marks a section opened when its collapsed class is removed', async () => {
    document.querySelector<HTMLElement>('#s1 .sec-head')?.click();
    await flush();
    expect(api.progress.opened()).toEqual(['s2', 's1']);
    expect(kpi('Sections opened')).toBe('2 / 2');
    document.querySelector<HTMLElement>('#s1 .sec-head')?.click(); // collapse again: no new statement
    await flush();
    expect(api.statements.all()).toHaveLength(2);
  });
  it('answers once per item, shows feedback, records answered and completed statements', async () => {
    const pick = (item: string, j: number): void => {
      const input = document.querySelector<HTMLInputElement>(`#lr-${item}-${j}`);
      if (!input) throw new Error('missing input');
      input.checked = true;
      input.dispatchEvent(new Event('change'));
    };
    pick('q1', 1);
    expect(document.querySelector('[data-item="q1"]')?.classList.contains('is-correct')).toBe(true);
    expect(document.querySelector('[data-item="q1"] .lr-q__feedback')?.textContent).toContain('b it is');
    expect([...document.querySelectorAll<HTMLInputElement>('[data-item="q1"] input')].every((i) => i.disabled)).toBe(true);
    pick('q2', 2);
    expect(document.querySelector('[data-item="q2"]')?.classList.contains('is-wrong')).toBe(true);
    expect(document.querySelector('[data-item="q2"] .is-answer')?.textContent).toBe('a');
    expect(kpi('Quiz')).toBe('1 / 2');
    pick('q3', 2);
    await flush();
    const verbs = api.statements.all().map((s) => s.verb.display['en-US']);
    expect(verbs.filter((v) => v === 'answered')).toHaveLength(3);
    expect(verbs).toContain('completed');
    const completed = api.statements.all().find((s) => s.verb.display['en-US'] === 'completed');
    expect(completed?.result?.score).toEqual({ scaled: 2 / 3, raw: 2, max: 3 });
    expect(document.querySelector('.lr-quiz__score')?.textContent).toContain('complete, score 67%');
    expect(document.querySelector('.lr-log summary')?.textContent).toMatch(/\(\d+\)/);
  });
  it('clears statements and progress on request', async () => {
    await flush();
    document.querySelector<HTMLButtonElement>('.lr-log__actions button')?.click();
    expect(api.statements.all()).toEqual([]);
    expect(api.progress.opened()).toEqual([]);
    expect(kpi('Statements')).toBe('0');
  });
  it('persists progress across mounts in the same browser', async () => {
    document.querySelector<HTMLElement>('#s1 .sec-head')?.click();
    await flush();
    api.destroy();
    page();
    api = mountLearningResource({ title: 'Demo', tagline: 'Tag', repo: 'https://github.com/x/y', pagesUrl: 'https://x.github.io/y/', quiz });
    expect(api.progress.opened().sort()).toEqual(['s1', 's2']);
  });
});
