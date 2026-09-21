/** DOM layer: mounts the Executive Shell over a learning resource, tracks section progress,
 * renders the kit quiz with xAPI statements, and exposes the statement log. */

import { mountExecShell, type ShellApi, type TourStep } from '../shell/exec-shell.js';
import { createProgress, type Progress } from './progress.ts';
import { answerItem, createQuiz, isCorrect, type QuizItem, type QuizState, scoreQuiz } from './quiz.ts';
import { readingMinutes, sectionIndex, type SectionInfo } from './reading.ts';
import { safeLocalStore } from './storage.ts';
import { anonymousActor, buildStatement, createStatementStore, type StatementStore } from './xapi.ts';

export interface ResourceConfig {
  title: string;
  tagline: string;
  repo: string;
  pagesUrl: string;
  quiz: readonly QuizItem[];
  quizTitle?: string;
  quizIntro?: string;
  /** Storage namespace; defaults to the last path segment of pagesUrl. */
  storageKey?: string;
}

export interface ResourceApi {
  shell: ShellApi;
  progress: Progress;
  statements: StatementStore;
  sections: SectionInfo[];
  quiz: () => QuizState;
  destroy(): void;
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.append(c);
  return node;
}

function namespace(config: ResourceConfig): string {
  if (config.storageKey) return config.storageKey;
  const parts = config.pagesUrl.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? 'resource';
}

export function mountLearningResource(config: ResourceConfig): ResourceApi {
  const store = safeLocalStore();
  const ns = namespace(config);
  const sections = sectionIndex(document.querySelectorAll<HTMLElement>('section[id]'));
  const words = sections.reduce((n, s) => n + s.words, 0);
  const progress = createProgress(store, `lr:${ns}:progress`, sections.map((s) => s.id));
  const statements = createStatementStore(store, `lr:${ns}:xapi`);
  const actor = anonymousActor(store, 'lr:actor', config.pagesUrl);
  let quiz = createQuiz(config.quiz);
  let shell: ShellApi | null = null;
  const refresh = (): void => shell?.refreshKpis();

  const record = (verb: 'experienced' | 'answered' | 'completed', objectId: string, name: string, type: 'module' | 'question' | 'assessment', result?: NonNullable<Parameters<typeof buildStatement>[0]['result']>): void => {
    const input: Parameters<typeof buildStatement>[0] = { actor, verb, object: { id: `${config.pagesUrl}#${objectId}`, name, type } };
    if (result) input.result = result;
    statements.record(buildStatement(input));
    renderLog();
  };

  // --- quiz section ---------------------------------------------------------
  const quizSection = h('section', { id: 'lr-quiz', class: 'lr-quiz', 'aria-labelledby': 'lr-quiz-title' });
  const wrap = h('div', { class: 'wrap' });
  const head = h('div', { class: 'sec-head' }, [
    h('span', { class: 'eyebrow' }, ['Check your understanding']),
    h('h2', { id: 'lr-quiz-title' }, [config.quizTitle ?? 'Five questions on this resource']),
    h('p', { class: 'lead' }, [config.quizIntro ?? 'One attempt per question. Your answers stay in this browser; nothing is sent anywhere.'])
  ]);
  const form = h('form', { class: 'lr-quiz__form', novalidate: '' });
  const scoreEl = h('p', { class: 'lr-quiz__score', 'aria-live': 'polite' });
  const logDetails = h('details', { class: 'lr-log' });
  const logSummary = h('summary', {}, ['xAPI statements recorded in this browser']);
  const logPre = h('pre', { class: 'lr-log__pre' });
  const logActions = h('div', { class: 'lr-log__actions' });
  const clearBtn = h('button', { type: 'button', class: 'btn lr-btn' }, ['Clear statements and progress']);
  logActions.append(clearBtn);
  logDetails.append(logSummary, logActions, logPre);
  wrap.append(head, form, scoreEl, logDetails);
  quizSection.append(wrap);

  const renderScore = (): void => {
    const s = scoreQuiz(quiz);
    scoreEl.textContent = s.answered === 0
      ? `${s.total} questions, none answered yet.`
      : `${s.correct} of ${s.answered} answered correctly${s.complete ? ` — complete, score ${Math.round(s.scaled * 100)}%.` : '.'}`;
  };

  const renderLog = (): void => {
    const all = statements.all();
    logSummary.textContent = `xAPI statements recorded in this browser (${all.length})`;
    logPre.textContent = all.length ? JSON.stringify(all.slice(-10), null, 2) : 'No statements yet.';
  };

  const renderQuiz = (): void => {
    form.replaceChildren();
    quiz.items.forEach((item, i) => {
      const answered = item.id in quiz.answers;
      const fs = h('fieldset', { class: 'lr-q', 'data-item': item.id });
      if (answered) fs.classList.add(isCorrect(quiz, item.id) ? 'is-correct' : 'is-wrong');
      fs.append(h('legend', { class: 'lr-q__prompt' }, [`${i + 1}. ${item.prompt}`]));
      item.options.forEach((opt, j) => {
        const id = `lr-${item.id}-${j}`;
        const input = h('input', { type: 'radio', name: item.id, id, value: String(j), class: 'lr-q__input' });
        if (answered) {
          input.disabled = true;
          input.checked = quiz.answers[item.id] === j;
        }
        const label = h('label', { for: id, class: 'lr-q__opt' }, [opt]);
        if (answered && j === item.answer) label.classList.add('is-answer');
        input.addEventListener('change', () => choose(item, j));
        fs.append(h('div', { class: 'lr-q__row' }, [input, label]));
      });
      if (answered) {
        const ok = isCorrect(quiz, item.id);
        const fb = h('p', { class: 'lr-q__feedback' }, [
          h('strong', {}, [ok ? 'Correct. ' : `Not quite — the answer is “${item.options[item.answer] ?? ''}”. `]),
          item.explanation ?? ''
        ]);
        fs.append(fb);
      }
      form.append(fs);
    });
    renderScore();
  };

  const choose = (item: QuizItem, j: number): void => {
    const before = scoreQuiz(quiz);
    quiz = answerItem(quiz, item.id, j);
    const ok = isCorrect(quiz, item.id) === true;
    record('answered', `quiz-${item.id}`, item.prompt, 'question', { success: ok, response: item.options[j] ?? '' });
    const after = scoreQuiz(quiz);
    if (after.complete && !before.complete) {
      record('completed', 'quiz', `${config.title} — quiz`, 'assessment', {
        completion: true,
        success: after.scaled >= 0.6,
        score: { scaled: after.scaled, raw: after.correct, max: after.total }
      });
    }
    renderQuiz();
    refresh();
  };

  const pageFooter = document.querySelector('body > footer');
  if (pageFooter) pageFooter.before(quizSection);
  else document.body.append(quizSection);

  // --- section progress -----------------------------------------------------
  const onOpen = (el: HTMLElement): void => {
    const info = sections.find((s) => s.id === el.id);
    if (info && progress.markOpened(el.id)) {
      record('experienced', el.id, info.title, 'module');
      refresh();
    }
  };
  const observer = new MutationObserver((muts) => {
    for (const m of muts) {
      const el = m.target as HTMLElement;
      if (el.tagName === 'SECTION' && el.id && !el.classList.contains('collapsed')) onOpen(el);
    }
  });
  for (const sec of document.querySelectorAll<HTMLElement>('section[id]')) {
    observer.observe(sec, { attributes: true, attributeFilter: ['class'] });
    // Sections that are not collapsible are open by definition.
    if (!sec.classList.contains('collapsed')) onOpen(sec);
  }

  clearBtn.addEventListener('click', () => {
    statements.clear();
    progress.reset();
    quiz = createQuiz(config.quiz);
    renderQuiz();
    renderLog();
    refresh();
  });

  // --- shell ------------------------------------------------------------------
  const firstCollapsible = sections.find((s) => document.getElementById(s.id)?.classList.contains('collapsed'));
  const openSection = (id: string): void => {
    const sec = document.getElementById(id);
    const headEl = sec?.querySelector<HTMLElement>('.sec-head.sect-toggle');
    if (sec?.classList.contains('collapsed') && headEl) headEl.click();
  };
  const heroSelector = ['.exec-summary', 'header.hero', 'main', 'body'].find((sel) => document.querySelector(sel)) ?? 'body';
  const tour: TourStep[] = [
    { selector: heroSelector, title: 'A graduate-level resource, not a slide deck', body: `${sections.length} sections and about ${readingMinutes(words)} minutes of reading. Every section is collapsible; the summary at the top is the two-minute version.`, action: () => window.scrollTo({ top: 0 }) },
    ...(firstCollapsible ? [{ selector: `#${firstCollapsible.id}`, title: 'Open a section', body: 'Opening a section marks it as visited and records an xAPI “experienced” statement in this browser only. Progress persists across visits.', action: () => openSection(firstCollapsible.id) }] : []),
    { selector: '#lr-quiz', title: 'Check your understanding', body: 'Five questions written for this resource. One attempt each; the explanation appears after you answer, and the result is recorded as an xAPI “answered” statement.', action: () => document.getElementById('lr-quiz')?.scrollIntoView({ block: 'start' }) },
    { selector: '.lr-log', title: 'Your statements, inspectable', body: 'The statements are standard xAPI 1.0.3 JSON with an anonymous actor. Nothing leaves the page: the content-security policy forbids network calls.', action: () => { logDetails.open = true; } }
  ];
  shell = mountExecShell({
    title: config.title,
    tagline: config.tagline,
    repo: config.repo,
    pagesUrl: config.pagesUrl,
    mainSelector: document.querySelector('main') ? 'main' : '#lr-quiz',
    badges: [{ label: 'Learning resource', tone: 'accent' }, { label: 'xAPI statements', dot: true }, { label: 'Progress stays in your browser', dot: true }],
    kpis: [
      { label: 'Sections', compute: () => sections.length, tone: 'accent' },
      { label: 'Reading time', compute: () => `${readingMinutes(words)} min` },
      { label: 'Sections opened', compute: () => `${progress.opened().length} / ${sections.length}`, tone: 'ok' },
      { label: 'Quiz', compute: () => { const s = scoreQuiz(quiz); return s.answered ? `${s.correct} / ${s.answered}` : `0 / ${s.total}`; } },
      { label: 'Statements', compute: () => statements.all().length, tone: 'muted' }
    ],
    tour
  });

  const mounted = shell;
  renderQuiz();
  renderLog();
  mounted.refreshKpis();

  return {
    shell: mounted,
    progress,
    statements,
    sections,
    quiz: () => quiz,
    destroy() {
      observer.disconnect();
      quizSection.remove();
      mounted.destroy();
    }
  };
}
