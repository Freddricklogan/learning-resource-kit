# Case Study — Learning Resource Kit

**Repository:** [learning-resource-kit](https://github.com/Freddricklogan/learning-resource-kit) · **Live demo:** [freddricklogan.github.io/learning-resource-kit](https://freddricklogan.github.io/learning-resource-kit/) · **Author:** Freddrick Logan

---

## 1. Who has this problem

Anyone who has built teaching material faster than the infrastructure to run it: a faculty member with a dozen self-authored web guides, a teaching-and-learning centre that inherited them, an instructional-design team asked to make "the resources" consistent, trackable and accessible before an accreditation visit. I had ten myself — graduate-level guides on research methods, policy, leadership and course design — each a single HTML file with its own widgets, and no way to change all ten at once.

## 2. The problem, as a scenario

A department wants to adopt the guides for a doctoral programme. The learning technologist asks three questions. Can we see which sections students open? No — the pages record nothing. Can quiz results reach our learning record store? There is no quiz engine, only hand-written self-checks that vanish on reload. Do the pages pass our security and accessibility review? Inline scripts and styles, untyped buttons, tables without bodies, no main landmark: the checklist fails on line one. The content is good; the packaging blocks adoption.

## 3. What it costs to leave it alone

Material that cannot be adopted stays personal, and its author maintains ten copies of the same navigation by hand. For the institution, the cost is the alternative: licensing a platform to host content it already has, or rebuilding guides that only need a consistent layer. I will not put a number on it — institutions price staff time and platforms differently — but the pattern is familiar: content is cheap to author and expensive to standardise afterwards.

## 4. The approach, and the alternative I rejected

I wrote a typed kit that each resource vendors as one module and one stylesheet, and a converter that applies it. The kit indexes a page's sections, mounts the Executive Shell with live counts, makes sections collapsible with progress saved in the browser, appends a five-question quiz written for each resource, and records xAPI 1.0.3 statements — experienced, answered, completed — in a local store the reader can inspect. The converter moves styles and scripts out of the page, namespaces custom properties so two design systems coexist, converts inline styles to classes, fixes the validation defects, drops in CI, lint and tests, and writes an audit of what it changed. Each resource then needs one authored file: its quiz.

The alternative I rejected was a content migration into a documentation framework or an LMS package. It would have discarded the widgets that make the guides worth reading — design selectors, coding walkthroughs, rigour self-checks — and replaced authored pages with generated ones. The kit keeps the authored page intact and adds the layer around it.

## 5. What the code does today

Real: a quiz engine with a validator, first-attempt scoring and scaled results; section progress with an injectable store that degrades to memory; xAPI statements with ADL verb and activity IRIs, an anonymous per-browser actor and a capped local store; reading-time and section indexing; a typed collapsible-section module with keyboard support and deep links; the DOM mount; a print stylesheet; a Vite library build; the converter with its templates; and the demo page. Strict TypeScript, tests under jsdom, a strict content-security policy on every page.

Simulated: nothing — but no learning record store receives the statements. They are built to the standard and kept locally because the pages forbid network calls; connecting an LRS is a deliberate step, not a default.

Worth knowing: progress means a section was opened, not read; the quiz records one attempt so the score reflects prior knowledge; the converter is deterministic but not idempotent — it runs once on the original page, and the tests in each resource guard the result.

## 6. Evidence

Measured locally with the commands CI runs: 31 tests passing across seven files; 99.03% statement and 94.49% branch coverage of the kit modules; typed ESLint, `tsc --noEmit` and html-validate clean; the library builds to a 30.2 kB module. On the first resource the converter namespaced 26 custom properties, replaced 124 inline style attributes with 35 classes, typed 27 buttons, gave six tables a body and added a `<main>` landmark; that resource passes html-validate and its seven tests, and every original widget — tabs, design selector, coding walkthrough, rigour scorer, self-quiz — still works under the strict policy. Headless Chrome on the demo: zero console errors, KPIs updating on open and answer, no horizontal scroll at 1200 or 400 pixels.

## 7. What it would take to run this in production

The kit is production-grade for static hosting now. To feed an institutional learning record store it needs an LRS endpoint with credentials, a consent notice, an actor tied to the institution's identity provider, and the content-security policy widened to that one origin. A day of integration per LRS, plus the privacy review that identified statements deserve. Applying it to the remaining resources is the converter plus one authored quiz each.

## 8. Limits and next steps

Opening-based progress, single-attempt quizzes, no spaced retrieval, no per-section questions. Next: questions attached to sections rather than one quiz at the end, a retry mode that records attempts separately, an optional LRS adapter behind explicit configuration, and a converter step that runs the resource's tests last.

## 9. Who should look at this

**Hiring manager:** evidence that I turn a pile of good content into a maintainable product with standards, tests and an audit trail rather than a rewrite.
**Consulting client:** a template for making inherited web-based teaching material consistent, trackable and reviewable without moving it into a platform.
**Engineer:** read `src/kit/xapi.ts` and `tests/xapi.test.ts` for the statement builder against its expected JSON, and `apply/convert.mjs` for a deterministic page transformation with a written audit.
