/** Collapsible sections: every `section > .wrap > .sec-head` becomes a keyboard-operable toggle
 * (except the executive summary), deep links open their section, and an "Expand all" control is
 * inserted before the first collapsible section. Typed port of the script the resources shipped. */

export interface CollapsibleApi {
  sections: HTMLElement[];
  setAll(open: boolean): void;
  openFor(id: string): boolean;
  destroy(): void;
}

function setOpen(section: HTMLElement, head: HTMLElement, open: boolean): void {
  section.classList.toggle('collapsed', !open);
  head.setAttribute('aria-expanded', open ? 'true' : 'false');
}

export function initCollapsible(root: ParentNode = document): CollapsibleApi {
  const sections: HTMLElement[] = [];
  const cleanups: (() => void)[] = [];
  if (root.querySelector('.sec-head.sect-toggle')) {
    return { sections, setAll: () => undefined, openFor: () => false, destroy: () => undefined };
  }
  for (const sec of root.querySelectorAll<HTMLElement>('section')) {
    const wrap = sec.querySelector<HTMLElement>(':scope > .wrap');
    const head = wrap?.querySelector<HTMLElement>(':scope > .sec-head');
    if (!wrap || !head) continue;
    if (wrap.querySelector('.memo-head') || wrap.querySelector('.exec-summary')) continue;
    const body = document.createElement('div');
    body.className = 'sect-body';
    let n = head.nextSibling;
    while (n) {
      const next = n.nextSibling;
      body.append(n);
      n = next;
    }
    wrap.append(body);
    head.classList.add('sect-toggle');
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    setOpen(sec, head, false);
    const toggle = (): void => setOpen(sec, head, sec.classList.contains('collapsed'));
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', onKey);
    cleanups.push(() => {
      head.removeEventListener('click', toggle);
      head.removeEventListener('keydown', onKey);
    });
    sections.push(sec);
  }

  const openFor = (id: string): boolean => {
    const el = id ? document.getElementById(id) : null;
    if (!el) return false;
    const sec = el.closest<HTMLElement>('section');
    const head = sec?.querySelector<HTMLElement>('.sec-head.sect-toggle');
    if (sec && head && sec.classList.contains('collapsed')) setOpen(sec, head, true);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  };
  const onHash = (): void => {
    openFor(decodeURIComponent((location.hash || '').slice(1)));
  };
  window.addEventListener('hashchange', onHash);
  cleanups.push(() => window.removeEventListener('hashchange', onHash));

  let bar: HTMLElement | null = null;
  let expanded = false;
  const setAll = (open: boolean): void => {
    expanded = open;
    for (const sec of sections) {
      const head = sec.querySelector<HTMLElement>('.sec-head.sect-toggle');
      if (head) setOpen(sec, head, open);
    }
    if (btn) {
      btn.textContent = open ? 'Collapse all sections' : 'Expand all sections';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  };
  let btn: HTMLButtonElement | null = null;
  const first = sections[0];
  if (first) {
    bar = document.createElement('div');
    bar.className = 'expand-bar';
    btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Expand all sections';
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => setAll(!expanded));
    bar.append(btn);
    first.before(bar);
  }
  onHash();
  return {
    sections,
    setAll,
    openFor,
    destroy() {
      for (const c of cleanups) c();
      bar?.remove();
    }
  };
}
