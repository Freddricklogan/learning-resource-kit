import { beforeEach, describe, expect, it } from 'vitest';
import { initCollapsible } from '../src/kit/collapsible.ts';

beforeEach(() => {
  location.hash = '';
  document.body.innerHTML = `
    <section aria-label="Executive summary"><div class="wrap"><div class="exec-summary"><div class="sec-head"><h2>S</h2></div><p>tl;dr</p></div></div></section>
    <section id="a"><div class="wrap"><div class="sec-head"><h2>A</h2></div><p id="a-p">body a</p></div></section>
    <section id="b"><div class="wrap"><div class="sec-head"><h2>B</h2></div><p>body b</p></div></section>
    <section id="c"><div class="wrap"><p>no head</p></div></section>`;
  Element.prototype.scrollIntoView = (): void => undefined;
});

describe('initCollapsible', () => {
  it('wraps bodies, collapses sections with a head, and skips the summary', () => {
    const api = initCollapsible();
    expect(api.sections.map((s) => s.id)).toEqual(['a', 'b']);
    expect(document.querySelector('#a .sect-body p')?.textContent).toBe('body a');
    expect(document.querySelector('#a')?.classList.contains('collapsed')).toBe(true);
    expect(document.querySelector('#a .sec-head')?.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('section[aria-label] .sect-body')).toBeNull();
    expect(document.querySelector('#c')?.classList.contains('collapsed')).toBe(false);
    expect(document.querySelector('.expand-bar + #a')).not.toBeNull();
  });
  it('toggles by click and keyboard, and expands/collapses all', () => {
    initCollapsible();
    const head = document.querySelector<HTMLElement>('#a .sec-head');
    head?.click();
    expect(document.querySelector('#a')?.classList.contains('collapsed')).toBe(false);
    head?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(document.querySelector('#a')?.classList.contains('collapsed')).toBe(true);
    head?.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    expect(document.querySelector('#a')?.classList.contains('collapsed')).toBe(true);
    const btn = document.querySelector<HTMLButtonElement>('.expand-bar button');
    btn?.click();
    expect(document.querySelectorAll('section.collapsed')).toHaveLength(0);
    expect(btn?.textContent).toBe('Collapse all sections');
    btn?.click();
    expect(document.querySelectorAll('section.collapsed')).toHaveLength(2);
  });
  it('opens the section for a deep link and is idempotent', () => {
    const api = initCollapsible();
    expect(api.openFor('a-p')).toBe(true);
    expect(document.querySelector('#a')?.classList.contains('collapsed')).toBe(false);
    expect(api.openFor('missing')).toBe(false);
    expect(initCollapsible().sections).toEqual([]);
    api.destroy();
    expect(document.querySelector('.expand-bar')).toBeNull();
  });
  it('responds to hashchange', () => {
    initCollapsible();
    location.hash = '#b';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(document.querySelector('#b')?.classList.contains('collapsed')).toBe(false);
  });
});
