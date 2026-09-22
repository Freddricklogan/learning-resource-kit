const OWNER = "Freddrick Logan";
const OWNER_GITHUB = "https://github.com/Freddricklogan";
const OWNER_SITE = "https://fredlogan.phd";
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
function el(tag, props = {}, kids = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === void 0 || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const kid of kids) {
    if (kid == null) continue;
    node.append(kid);
  }
  return node;
}
function prefersReducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
const THEMES = ["signal", "graphite", "ember", "plum", "forest", "midnight"];
function applyTheme(theme, accent = "primary") {
  if (!THEMES.includes(theme)) throw new Error(`applyTheme: unknown theme "${theme}" (expected one of ${THEMES.join(", ")})`);
  document.documentElement.dataset.theme = theme;
  if (accent === "secondary") document.documentElement.dataset.accent = "secondary";
  else delete document.documentElement.dataset.accent;
}
function mountExecShell(config) {
  const {
    title,
    tagline,
    repo,
    pagesUrl = "",
    badges = defaultBadges(),
    kpis = [],
    tour = [],
    mainSelector = "#demo-root",
    theme,
    accent
  } = config || {};
  if (theme) applyTheme(theme, accent);
  if (!title || !tagline || !repo) {
    throw new Error("mountExecShell: title, tagline and repo are required.");
  }
  const skip = el("a", {
    class: "exec-skip-link",
    href: mainSelector.startsWith("#") ? mainSelector : "#demo-root",
    text: "Skip to demo"
  });
  const tourBtn = el("button", {
    type: "button",
    class: "exec-btn exec-btn--primary",
    id: "exec-tour-start"
  }, ["Take the 30-second tour"]);
  const header = buildHeader({ title, tagline, repo, pagesUrl, badges, tourBtn });
  const { strip, cells } = buildKpiStrip(kpis);
  const footer = buildFooter({ repo, pagesUrl });
  document.body.prepend(skip, header);
  if (strip) header.after(strip);
  document.body.append(footer);
  const tourApi = buildTour(tour, tourBtn);
  if (!tour.length) tourBtn.hidden = true;
  const api = {
    header,
    kpiStrip: strip,
    footer,
    /** Recompute every KPI from live demo state. Safe to call on every render. */
    refreshKpis() {
      for (const cell of cells) {
        let value;
        try {
          value = cell.spec.compute();
        } catch {
          value = "—";
        }
        cell.valueEl.textContent = String(value ?? "—");
      }
    },
    startTour: tourApi.start,
    stopTour: tourApi.stop,
    destroy() {
      tourApi.destroy();
      skip.remove();
      header.remove();
      strip?.remove();
      footer.remove();
    }
  };
  api.refreshKpis();
  return api;
}
function defaultBadges() {
  return [
    { label: "Client-side only", tone: "accent" },
    { label: "No backend · no account", dot: true }
  ];
}
function buildHeader({ title, tagline, repo, pagesUrl, badges, tourBtn }) {
  const badgeList = el(
    "ul",
    { class: "exec-badges", "aria-label": "Project attributes" },
    badges.map(
      (b) => el(
        "li",
        {
          class: "exec-badges__item" + (b.tone === "accent" ? " exec-badges__item--accent" : "")
        },
        [b.dot ? el("span", { class: "exec-badges__dot", "aria-hidden": "true" }) : null, b.label]
      )
    )
  );
  const links = [
    el("a", {
      class: "exec-btn",
      href: repo,
      rel: "noopener",
      target: "_blank",
      text: "Source on GitHub"
    })
  ];
  if (pagesUrl) {
    links.push(
      el("a", { class: "exec-btn", href: pagesUrl, rel: "noopener", text: "Live demo" })
    );
  }
  return el("header", { class: "exec-header", role: "banner" }, [
    el("div", { class: "exec-header__inner" }, [
      el("div", { class: "exec-header__identity" }, [
        el("h1", { class: "exec-header__title", text: title }),
        el("p", { class: "exec-header__tagline", text: tagline }),
        badgeList
      ]),
      el("div", { class: "exec-header__actions" }, [tourBtn, ...links])
    ])
  ]);
}
function buildKpiStrip(kpis) {
  if (!kpis.length) return { strip: null, cells: [] };
  const cells = [];
  const strip = el("section", {
    class: "exec-kpis",
    "aria-label": "Key metrics",
    id: "exec-kpis"
  });
  for (const spec of kpis) {
    const valueEl = el("div", {
      class: "exec-kpi__value",
      "aria-live": "polite",
      text: "—"
    });
    const card = el(
      "div",
      { class: "exec-kpi" + (spec.tone ? ` exec-kpi--${spec.tone}` : "") },
      [valueEl, el("div", { class: "exec-kpi__label", text: spec.label })]
    );
    strip.append(card);
    cells.push({ spec, valueEl });
  }
  return { strip, cells };
}
function buildFooter({ repo, pagesUrl }) {
  const links = [
    el("li", {}, [el("a", { href: OWNER_GITHUB, rel: "noopener", text: "github.com/Freddricklogan" })]),
    el("li", {}, [el("a", { href: OWNER_SITE, rel: "noopener", text: "fredlogan.phd" })]),
    el("li", {}, [el("a", { href: repo, rel: "noopener", text: "Repository" })])
  ];
  if (pagesUrl) {
    links.push(el("li", {}, [el("a", { href: pagesUrl, rel: "noopener", text: "Live demo" })]));
  }
  return el("footer", { class: "exec-footer", role: "contentinfo" }, [
    el("div", { class: "exec-footer__inner" }, [
      el("span", { text: `${OWNER} · engineering portfolio` }),
      el("ul", { class: "exec-footer__links" }, links)
    ])
  ]);
}
function buildTour(steps, tourBtn) {
  if (!steps.length) {
    return { start() {
    }, stop() {
    }, destroy() {
    } };
  }
  let index = 0;
  let open = false;
  let lastFocus = null;
  const spot = el("div", { class: "exec-tour-spot" });
  const stepEl = el("div", { class: "exec-tour-card__step" });
  const titleEl = el("h2", { class: "exec-tour-card__title", id: "exec-tour-title" });
  const bodyEl = el("p", { class: "exec-tour-card__body" });
  const prevBtn = el("button", { type: "button", class: "exec-btn" }, ["Back"]);
  const nextBtn = el("button", { type: "button", class: "exec-btn exec-btn--primary" }, ["Next"]);
  const closeBtn = el("button", { type: "button", class: "exec-btn" }, ["Close"]);
  const card = el(
    "div",
    {
      class: "exec-tour-card",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "exec-tour-title"
    },
    [
      stepEl,
      titleEl,
      bodyEl,
      el("div", { class: "exec-tour-card__nav" }, [
        closeBtn,
        el("span", { class: "exec-tour-card__spacer" }),
        prevBtn,
        nextBtn
      ]),
      el("p", {
        class: "exec-tour-card__hint",
        html: "<kbd>&larr;</kbd> <kbd>&rarr;</kbd> to step · <kbd>Esc</kbd> to close"
      })
    ]
  );
  const backdrop = el("div", { class: "exec-tour-backdrop", hidden: true }, [spot, card]);
  document.body.append(backdrop);
  async function render() {
    const step = steps[index];
    stepEl.textContent = `Step ${index + 1} of ${steps.length}`;
    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === steps.length - 1 ? "Finish" : "Next";
    if (typeof step.action === "function") {
      try {
        await step.action();
      } catch (err) {
        bodyEl.textContent = `${step.body} (step action unavailable)`;
        if (typeof console !== "undefined" && console.warn) {
          console.warn("Tour step action failed:", err);
        }
      }
    }
    position(step);
  }
  function position(step) {
    const target = step.selector ? document.querySelector(step.selector) : null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!target) {
      spot.style.display = "none";
      card.style.left = `${Math.max(16, (vw - card.offsetWidth) / 2)}px`;
      card.style.top = `${Math.max(16, (vh - card.offsetHeight) / 2)}px`;
      return;
    }
    target.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion() ? "auto" : "smooth"
    });
    const r = target.getBoundingClientRect();
    spot.style.display = "";
    spot.style.left = `${Math.max(4, r.left - 6)}px`;
    spot.style.top = `${Math.max(4, r.top - 6)}px`;
    spot.style.width = `${r.width + 12}px`;
    spot.style.height = `${r.height + 12}px`;
    const cw = card.offsetWidth || 360;
    const ch = card.offsetHeight || 220;
    let top = r.bottom + 16;
    if (top + ch > vh - 12) top = Math.max(12, r.top - ch - 16);
    let left = r.left;
    if (left + cw > vw - 12) left = Math.max(12, vw - cw - 12);
    card.style.left = `${Math.max(12, left)}px`;
    card.style.top = `${Math.max(12, top)}px`;
  }
  function onKeydown(event) {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      stop();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      prev();
    } else if (event.key === "Tab") {
      trapFocus(event);
    }
  }
  function trapFocus(event) {
    const nodes = [...card.querySelectorAll(FOCUSABLE)].filter((n) => !n.disabled);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  function onResize() {
    if (open) position(steps[index]);
  }
  function next() {
    if (index === steps.length - 1) {
      stop();
      return;
    }
    index += 1;
    void render();
  }
  function prev() {
    if (index === 0) return;
    index -= 1;
    void render();
  }
  function start() {
    if (open) return;
    open = true;
    index = 0;
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    void render().then(() => nextBtn.focus());
  }
  function stop() {
    if (!open) return;
    open = false;
    backdrop.hidden = true;
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }
  tourBtn.addEventListener("click", start);
  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);
  closeBtn.addEventListener("click", stop);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) stop();
  });
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", onResize);
  return {
    start,
    stop,
    destroy() {
      document.removeEventListener("keydown", onKeydown);
      window.removeEventListener("resize", onResize);
      backdrop.remove();
    }
  };
}
function memoryStore() {
  const map = /* @__PURE__ */ new Map();
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => {
      map.set(k, v);
      return true;
    },
    remove: (k) => {
      map.delete(k);
    }
  };
}
function safeLocalStore(fallback = memoryStore()) {
  let ls = null;
  try {
    ls = globalThis.localStorage;
    const probe = "__lr_probe__";
    ls.setItem(probe, "1");
    ls.removeItem(probe);
  } catch {
    ls = null;
  }
  if (!ls) return fallback;
  const store = ls;
  return {
    get: (k) => {
      try {
        return store.getItem(k);
      } catch {
        return fallback.get(k);
      }
    },
    set: (k, v) => {
      try {
        store.setItem(k, v);
        return true;
      } catch {
        return fallback.set(k, v);
      }
    },
    remove: (k) => {
      try {
        store.removeItem(k);
      } catch {
        fallback.remove(k);
      }
    }
  };
}
function readJson(store, key, fallback) {
  const raw = store.get(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function createProgress(store, key, sectionIds) {
  const known = new Set(sectionIds);
  const load = () => readJson(store, key, []);
  const clean = (ids) => Array.isArray(ids) ? ids.filter((x) => typeof x === "string" && known.has(x)) : [];
  return {
    sectionIds,
    opened: () => clean(load()),
    isOpened: (id) => clean(load()).includes(id),
    markOpened(id) {
      if (!known.has(id)) return false;
      const cur = clean(load());
      if (cur.includes(id)) return false;
      store.set(key, JSON.stringify([...cur, id]));
      return true;
    },
    percent() {
      if (sectionIds.length === 0) return 0;
      return Math.round(clean(load()).length / sectionIds.length * 100);
    },
    reset: () => store.remove(key)
  };
}
function validateQuiz(items) {
  const problems = [];
  if (items.length < 3) problems.push(`need at least 3 items, got ${items.length}`);
  const ids = /* @__PURE__ */ new Set();
  items.forEach((it, i) => {
    const where = `item ${i} (${it.id || "no id"})`;
    if (!it.id) problems.push(`${where}: missing id`);
    else if (ids.has(it.id)) problems.push(`${where}: duplicate id`);
    ids.add(it.id);
    if (!it.prompt?.trim()) problems.push(`${where}: empty prompt`);
    if (it.options.length < 3) problems.push(`${where}: fewer than 3 options`);
    if (new Set(it.options.map((o) => o.trim().toLowerCase())).size !== it.options.length) {
      problems.push(`${where}: duplicate options`);
    }
    if (it.options.some((o) => !o.trim())) problems.push(`${where}: empty option`);
    if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer >= it.options.length) {
      problems.push(`${where}: answer index ${it.answer} out of range`);
    }
  });
  return problems;
}
function createQuiz(items) {
  const problems = validateQuiz(items);
  if (problems.length) throw new Error(`invalid quiz: ${problems.join("; ")}`);
  return { items, answers: {} };
}
function answerItem(state, id, choice) {
  const item = state.items.find((it) => it.id === id);
  if (!item) throw new Error(`unknown quiz item ${id}`);
  if (id in state.answers) return state;
  if (!Number.isInteger(choice) || choice < 0 || choice >= item.options.length) {
    throw new RangeError(`choice ${choice} out of range for ${id}`);
  }
  return { items: state.items, answers: { ...state.answers, [id]: choice } };
}
function isCorrect(state, id) {
  const item = state.items.find((it) => it.id === id);
  if (!item || !(id in state.answers)) return null;
  return state.answers[id] === item.answer;
}
function scoreQuiz(state) {
  const total = state.items.length;
  let answered = 0;
  let correct = 0;
  for (const it of state.items) {
    if (it.id in state.answers) {
      answered += 1;
      if (state.answers[it.id] === it.answer) correct += 1;
    }
  }
  return {
    total,
    answered,
    correct,
    scaled: total === 0 ? 0 : correct / total,
    complete: total > 0 && answered === total
  };
}
const DEFAULT_WPM = 230;
function wordCount(text) {
  const words = text.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  return words.length;
}
function readingMinutes(words, wpm = DEFAULT_WPM) {
  if (words <= 0) return 0;
  if (wpm <= 0) throw new RangeError("wpm must be positive");
  return Math.max(1, Math.ceil(words / wpm));
}
function sectionIndex(sections) {
  const out = [];
  for (const s of sections) {
    if (!s.id) continue;
    const title = s.querySelector("h2")?.textContent?.replace(/\s+/g, " ").trim() ?? s.id;
    out.push({ id: s.id, title, words: wordCount(s.textContent ?? "") });
  }
  return out;
}
const VERBS = {
  experienced: "http://adlnet.gov/expapi/verbs/experienced",
  answered: "http://adlnet.gov/expapi/verbs/answered",
  completed: "http://adlnet.gov/expapi/verbs/completed"
};
const ACTIVITY_TYPES = {
  module: "http://adlnet.gov/expapi/activities/module",
  question: "http://adlnet.gov/expapi/activities/question",
  assessment: "http://adlnet.gov/expapi/activities/assessment"
};
function uuid(random = Math.random) {
  const bytes = new Uint8Array(16);
  const c = globalThis.crypto;
  if (random === Math.random && c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(random() * 256);
  }
  bytes[6] = (bytes[6] ?? 0) & 15 | 64;
  bytes[8] = (bytes[8] ?? 0) & 63 | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function buildStatement(input) {
  const verbId = VERBS[input.verb];
  const s = {
    id: input.id ?? uuid(),
    actor: { objectType: "Agent", account: { homePage: input.actor.homePage, name: input.actor.name } },
    verb: { id: verbId, display: { "en-US": input.verb } },
    object: {
      objectType: "Activity",
      id: input.object.id,
      definition: { name: { "en-US": input.object.name }, type: ACTIVITY_TYPES[input.object.type] }
    },
    timestamp: (input.timestamp ?? /* @__PURE__ */ new Date()).toISOString(),
    version: "1.0.3"
  };
  if (input.result) s.result = input.result;
  return s;
}
function isStatement(x) {
  if (typeof x !== "object" || x === null) return false;
  const s = x;
  const actor = s["actor"];
  const verb = s["verb"];
  const object = s["object"];
  return typeof s["id"] === "string" && actor?.["objectType"] === "Agent" && typeof verb?.["id"] === "string" && object?.["objectType"] === "Activity" && typeof object["id"] === "string" && typeof s["timestamp"] === "string" && s["version"] === "1.0.3";
}
function createStatementStore(store, key, cap = 500) {
  const load = () => readJson(store, key, []).filter(isStatement);
  return {
    record(statement) {
      const next = [...load(), statement].slice(-cap);
      store.set(key, JSON.stringify(next));
      return next;
    },
    all: load,
    clear: () => store.remove(key)
  };
}
function anonymousActor(store, key, homePage) {
  let name = store.get(key);
  if (!name) {
    name = `anon-${uuid().slice(0, 8)}`;
    store.set(key, name);
  }
  return { homePage, name };
}
function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.append(c);
  return node;
}
function namespace(config) {
  if (config.storageKey) return config.storageKey;
  const parts = config.pagesUrl.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "resource";
}
function mountLearningResource(config) {
  const store = safeLocalStore();
  const ns = namespace(config);
  const sections = sectionIndex(document.querySelectorAll("section[id]"));
  const words = sections.reduce((n, s) => n + s.words, 0);
  const progress = createProgress(store, `lr:${ns}:progress`, sections.map((s) => s.id));
  const statements = createStatementStore(store, `lr:${ns}:xapi`);
  const actor = anonymousActor(store, "lr:actor", config.pagesUrl);
  let quiz = createQuiz(config.quiz);
  let shell = null;
  const refresh = () => shell?.refreshKpis();
  const record = (verb, objectId, name, type, result) => {
    const input = { actor, verb, object: { id: `${config.pagesUrl}#${objectId}`, name, type } };
    if (result) input.result = result;
    statements.record(buildStatement(input));
    renderLog();
  };
  const quizSection = h("section", { id: "lr-quiz", class: "lr-quiz", "aria-labelledby": "lr-quiz-title" });
  const wrap = h("div", { class: "wrap" });
  const head = h("div", { class: "sec-head" }, [
    h("span", { class: "eyebrow" }, ["Check your understanding"]),
    h("h2", { id: "lr-quiz-title" }, [config.quizTitle ?? "Five questions on this resource"]),
    h("p", { class: "lead" }, [config.quizIntro ?? "One attempt per question. Your answers stay in this browser; nothing is sent anywhere."])
  ]);
  const form = h("form", { class: "lr-quiz__form", novalidate: "" });
  const scoreEl = h("p", { class: "lr-quiz__score", "aria-live": "polite" });
  const logDetails = h("details", { class: "lr-log" });
  const logSummary = h("summary", {}, ["xAPI statements recorded in this browser"]);
  const logPre = h("pre", { class: "lr-log__pre" });
  const logActions = h("div", { class: "lr-log__actions" });
  const clearBtn = h("button", { type: "button", class: "btn lr-btn" }, ["Clear statements and progress"]);
  logActions.append(clearBtn);
  logDetails.append(logSummary, logActions, logPre);
  wrap.append(head, form, scoreEl, logDetails);
  quizSection.append(wrap);
  const renderScore = () => {
    const s = scoreQuiz(quiz);
    scoreEl.textContent = s.answered === 0 ? `${s.total} questions, none answered yet.` : `${s.correct} of ${s.answered} answered correctly${s.complete ? ` — complete, score ${Math.round(s.scaled * 100)}%.` : "."}`;
  };
  const renderLog = () => {
    const all = statements.all();
    logSummary.textContent = `xAPI statements recorded in this browser (${all.length})`;
    logPre.textContent = all.length ? JSON.stringify(all.slice(-10), null, 2) : "No statements yet.";
  };
  const renderQuiz = () => {
    form.replaceChildren();
    quiz.items.forEach((item, i) => {
      const answered = item.id in quiz.answers;
      const fs = h("fieldset", { class: "lr-q", "data-item": item.id });
      if (answered) fs.classList.add(isCorrect(quiz, item.id) ? "is-correct" : "is-wrong");
      fs.append(h("legend", { class: "lr-q__prompt" }, [`${i + 1}. ${item.prompt}`]));
      item.options.forEach((opt, j) => {
        const id = `lr-${item.id}-${j}`;
        const input = h("input", { type: "radio", name: item.id, id, value: String(j), class: "lr-q__input" });
        if (answered) {
          input.disabled = true;
          input.checked = quiz.answers[item.id] === j;
        }
        const label = h("label", { for: id, class: "lr-q__opt" }, [opt]);
        if (answered && j === item.answer) label.classList.add("is-answer");
        input.addEventListener("change", () => choose(item, j));
        fs.append(h("div", { class: "lr-q__row" }, [input, label]));
      });
      if (answered) {
        const ok = isCorrect(quiz, item.id);
        const fb = h("p", { class: "lr-q__feedback" }, [
          h("strong", {}, [ok ? "Correct. " : `Not quite — the answer is “${item.options[item.answer] ?? ""}”. `]),
          item.explanation ?? ""
        ]);
        fs.append(fb);
      }
      form.append(fs);
    });
    renderScore();
  };
  const choose = (item, j) => {
    const before = scoreQuiz(quiz);
    quiz = answerItem(quiz, item.id, j);
    const ok = isCorrect(quiz, item.id) === true;
    record("answered", `quiz-${item.id}`, item.prompt, "question", { success: ok, response: item.options[j] ?? "" });
    const after = scoreQuiz(quiz);
    if (after.complete && !before.complete) {
      record("completed", "quiz", `${config.title} — quiz`, "assessment", {
        completion: true,
        success: after.scaled >= 0.6,
        score: { scaled: after.scaled, raw: after.correct, max: after.total }
      });
    }
    renderQuiz();
    refresh();
  };
  const pageFooter = document.querySelector("body > footer");
  if (pageFooter) pageFooter.before(quizSection);
  else document.body.append(quizSection);
  const onOpen = (el2) => {
    const info = sections.find((s) => s.id === el2.id);
    if (info && progress.markOpened(el2.id)) {
      record("experienced", el2.id, info.title, "module");
      refresh();
    }
  };
  const observer = new MutationObserver((muts) => {
    for (const m of muts) {
      const el2 = m.target;
      if (el2.tagName === "SECTION" && el2.id && !el2.classList.contains("collapsed")) onOpen(el2);
    }
  });
  for (const sec of document.querySelectorAll("section[id]")) {
    observer.observe(sec, { attributes: true, attributeFilter: ["class"] });
    if (!sec.classList.contains("collapsed")) onOpen(sec);
  }
  clearBtn.addEventListener("click", () => {
    statements.clear();
    progress.reset();
    quiz = createQuiz(config.quiz);
    renderQuiz();
    renderLog();
    refresh();
  });
  const firstCollapsible = sections.find((s) => document.getElementById(s.id)?.classList.contains("collapsed"));
  const openSection = (id) => {
    const sec = document.getElementById(id);
    const headEl = sec?.querySelector(".sec-head.sect-toggle");
    if (sec?.classList.contains("collapsed") && headEl) headEl.click();
  };
  const heroSelector = [".exec-summary", "header.hero", "main", "body"].find((sel) => document.querySelector(sel)) ?? "body";
  const tour = [
    { selector: heroSelector, title: "A graduate-level resource, not a slide deck", body: `${sections.length} sections and about ${readingMinutes(words)} minutes of reading. Every section is collapsible; the summary at the top is the two-minute version.`, action: () => window.scrollTo({ top: 0 }) },
    ...firstCollapsible ? [{ selector: `#${firstCollapsible.id}`, title: "Open a section", body: "Opening a section marks it as visited and records an xAPI “experienced” statement in this browser only. Progress persists across visits.", action: () => openSection(firstCollapsible.id) }] : [],
    { selector: "#lr-quiz", title: "Check your understanding", body: "Five questions written for this resource. One attempt each; the explanation appears after you answer, and the result is recorded as an xAPI “answered” statement.", action: () => document.getElementById("lr-quiz")?.scrollIntoView({ block: "start" }) },
    { selector: ".lr-log", title: "Your statements, inspectable", body: "The statements are standard xAPI 1.0.3 JSON with an anonymous actor. Nothing leaves the page: the content-security policy forbids network calls.", action: () => {
      logDetails.open = true;
    } }
  ];
  shell = mountExecShell({
    title: config.title,
    tagline: config.tagline,
    repo: config.repo,
    pagesUrl: config.pagesUrl,
    ...config.theme ? { theme: config.theme } : {},
    ...config.accent ? { accent: config.accent } : {},
    mainSelector: document.querySelector("main") ? "main" : "#lr-quiz",
    badges: [{ label: "Learning resource", tone: "accent" }, { label: "xAPI statements", dot: true }, { label: "Progress stays in your browser", dot: true }],
    kpis: [
      { label: "Sections", compute: () => sections.length, tone: "accent" },
      { label: "Reading time", compute: () => `${readingMinutes(words)} min` },
      { label: "Sections opened", compute: () => `${progress.opened().length} / ${sections.length}`, tone: "ok" },
      { label: "Quiz", compute: () => {
        const s = scoreQuiz(quiz);
        return s.answered ? `${s.correct} / ${s.answered}` : `0 / ${s.total}`;
      } },
      { label: "Statements", compute: () => statements.all().length, tone: "muted" }
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
function setOpen(section, head, open) {
  section.classList.toggle("collapsed", !open);
  head.setAttribute("aria-expanded", open ? "true" : "false");
}
function initCollapsible(root = document) {
  const sections = [];
  const cleanups = [];
  if (root.querySelector(".sec-head.sect-toggle")) {
    return { sections, setAll: () => void 0, openFor: () => false, destroy: () => void 0 };
  }
  for (const sec of root.querySelectorAll("section")) {
    const wrap = sec.querySelector(":scope > .wrap");
    const head = wrap?.querySelector(":scope > .sec-head");
    if (!wrap || !head) continue;
    if (wrap.querySelector(".memo-head") || wrap.querySelector(".exec-summary")) continue;
    const body = document.createElement("div");
    body.className = "sect-body";
    let n = head.nextSibling;
    while (n) {
      const next = n.nextSibling;
      body.append(n);
      n = next;
    }
    wrap.append(body);
    head.classList.add("sect-toggle");
    head.setAttribute("role", "button");
    head.setAttribute("tabindex", "0");
    setOpen(sec, head, false);
    const toggle = () => setOpen(sec, head, sec.classList.contains("collapsed"));
    const onKey = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    };
    head.addEventListener("click", toggle);
    head.addEventListener("keydown", onKey);
    cleanups.push(() => {
      head.removeEventListener("click", toggle);
      head.removeEventListener("keydown", onKey);
    });
    sections.push(sec);
  }
  const openFor = (id) => {
    const el2 = id ? document.getElementById(id) : null;
    if (!el2) return false;
    const sec = el2.closest("section");
    const head = sec?.querySelector(".sec-head.sect-toggle");
    if (sec && head && sec.classList.contains("collapsed")) setOpen(sec, head, true);
    el2.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  };
  const onHash = () => {
    openFor(decodeURIComponent((location.hash || "").slice(1)));
  };
  window.addEventListener("hashchange", onHash);
  cleanups.push(() => window.removeEventListener("hashchange", onHash));
  let bar = null;
  let expanded = false;
  const setAll = (open) => {
    expanded = open;
    for (const sec of sections) {
      const head = sec.querySelector(".sec-head.sect-toggle");
      if (head) setOpen(sec, head, open);
    }
    if (btn) {
      btn.textContent = open ? "Collapse all sections" : "Expand all sections";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
  };
  let btn = null;
  const first = sections[0];
  if (first) {
    bar = document.createElement("div");
    bar.className = "expand-bar";
    btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Expand all sections";
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", () => setAll(!expanded));
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
export {
  ACTIVITY_TYPES,
  DEFAULT_WPM,
  VERBS,
  anonymousActor,
  answerItem,
  buildStatement,
  createProgress,
  createQuiz,
  createStatementStore,
  initCollapsible,
  isCorrect,
  isStatement,
  memoryStore,
  mountLearningResource,
  readJson,
  readingMinutes,
  safeLocalStore,
  scoreQuiz,
  sectionIndex,
  uuid,
  validateQuiz,
  wordCount
};
