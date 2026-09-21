#!/usr/bin/env node
/**
 * Applies the Learning Resource Kit to a single-file resource repository.
 *
 *   node apply/convert.mjs <resource-dir> <repo-name>
 *
 * What it does, deterministically:
 *   1. Moves the page's <style> block to src/page.css and prefixes every custom property
 *      declared on :root with --lr- (in CSS and in extracted JS) so nothing collides with the
 *      Executive Shell's tokens.
 *   2. Replaces every inline style="…" attribute with a generated class (src/page.css), so the
 *      page satisfies html-validate's no-inline-style rule and a strict CSP.
 *   3. Moves inline <script> blocks to src/page.js as one ES module; the resources' shared
 *      collapsible-section script is dropped in favour of the kit's typed initCollapsible().
 *   4. Vendors lib/lr-kit.js, lib/lr-kit.css and the shell stylesheet into src/, writes
 *      src/main.js and a src/config.js stub (title/tagline from the page; quiz to be authored).
 *   5. Copies CI, lint, test and validate templates and writes AUDIT.md with what it found.
 *
 * The original stays in git history; the converter rewrites index.html in place.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [dir, repo] = process.argv.slice(2);
if (!dir || !repo) {
  console.error('usage: convert.mjs <resource-dir> <repo-name>');
  process.exit(2);
}
const root = resolve(dir);
const pagesUrl = `https://freddricklogan.github.io/${repo}/`;
const repoUrl = `https://github.com/Freddricklogan/${repo}`;
const html = readFileSync(join(root, 'index.html'), 'utf8');
const audit = [];

// --- 1. stylesheet ---------------------------------------------------------------------
const styleBlocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
let css = styleBlocks.join('\n');
const rootVars = [...css.matchAll(/:root\s*{([^}]*)}/g)].flatMap((m) => [...m[1].matchAll(/--([a-z0-9-]+)\s*:/gi)].map((v) => v[1]));
const varNames = [...new Set(rootVars)].sort((a, b) => b.length - a.length);
const prefixVars = (text) => {
  let out = text;
  for (const name of varNames) out = out.replace(new RegExp(`--${name}(?![a-z0-9-])`, 'g'), `--lr-${name}`);
  return out;
};
css = prefixVars(css);
audit.push(`Custom properties prefixed with --lr-: ${varNames.length} (${varNames.join(', ')}).`);

// --- 2. inline style attributes ----------------------------------------------------------
const styleClasses = new Map();
let body = html.replace(/<style>[\s\S]*?<\/style>/g, '');
body = body.replace(/<([a-z0-9]+)([^>]*?)\sstyle="([^"]*)"([^>]*)>/gi, (m, tag, before, style, after) => {
  const decl = prefixVars(style.trim().replace(/\s+/g, ' '));
  if (!styleClasses.has(decl)) styleClasses.set(decl, `lr-s${styleClasses.size + 1}`);
  const cls = styleClasses.get(decl);
  const attrs = `${before}${after}`;
  const classMatch = attrs.match(/\sclass="([^"]*)"/);
  if (classMatch) {
    const merged = attrs.replace(classMatch[0], ` class="${classMatch[1]} ${cls}"`);
    return `<${tag}${merged}>`;
  }
  return `<${tag} class="${cls}"${attrs}>`;
});
const generated = [...styleClasses].map(([decl, cls]) => `.${cls} { ${decl.endsWith(';') ? decl : `${decl};`} }`).join('\n');
css += `\n\n/* Generated from former inline style attributes (${styleClasses.size} distinct). */\n${generated}\n`;
audit.push(`Inline style attributes converted to classes: ${(html.match(/\sstyle="/g) || []).length} occurrences, ${styleClasses.size} distinct declarations.`);

// --- 3. scripts ------------------------------------------------------------------------------
const scripts = [...body.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
let dropped = 0;
const kept = scripts.filter((s) => {
  const shared = s.includes('sect-toggle') && s.includes('expand-bar');
  if (shared) dropped += 1;
  return !shared;
});
body = body.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>\s*/g, '');
const pageJs = `/* Page widgets for ${repo}, moved from inline script blocks by the Learning Resource Kit converter.\n   Runs as an ES module after the document is parsed; the kit mounts the shell and quiz separately. */\n${prefixVars(kept.join('\n\n'))}\n`;
audit.push(`Inline script blocks moved to src/page.js: ${kept.length}; shared collapsible script replaced by the kit: ${dropped}.`);

// --- 4. head and body edits ------------------------------------------------------------------
const title = (html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? repo).replace(/\s+/g, ' ').trim();
const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'">`;
const links = [
  `<link rel="canonical" href="${pagesUrl}">`,
  `<link rel="preconnect" href="https://fonts.googleapis.com">`,
  `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;display=swap">`,
  `<link rel="stylesheet" href="src/exec-shell.css">`,
  `<link rel="stylesheet" href="src/lr-kit.css">`,
  `<link rel="stylesheet" href="src/page.css">`
].join('\n');
body = body.replace(/<link rel="canonical"[^>]*>\s*/g, '');
body = body.replace(/(<meta name="viewport"[^>]*>)/, `$1\n${csp}`);
body = body.replace(/<\/head>/, `${links}\n</head>`);
if (!/<main[\s>]/.test(body)) {
  // Wrap everything between the top nav and the footer in a main landmark.
  body = body.replace(/(<\/nav>\s*)/, '$1<main>\n').replace(/(\s*<footer)/, '\n</main>$1');
  audit.push('No <main> landmark in the original; content between the top nav and the footer wrapped in <main>.');
} else {
  audit.push('<main> landmark present in the original.');
}
body = body.replace(/<\/body>/, `<script type="module" src="src/main.js"></script>\n</body>`);
body = body.replace(/href="\.\.\/resources\/"/g, 'href="https://freddricklogan.github.io/resources/"');
// Accessibility and validity fixes that html-validate:recommended requires.
let buttonsTyped = 0;
body = body.replace(/<button(?![^>]*\btype=)([^>]*)>/g, (m, attrs) => {
  buttonsTyped += 1;
  return `<button type="button"${attrs}>`;
});
let tablesFixed = 0;
body = body.replace(/<table([^>]*)>([\s\S]*?)<\/table>/g, (m, attrs, inner) => {
  if (/<tbody[\s>]/.test(inner)) return m;
  tablesFixed += 1;
  const head = inner.match(/^([\s\S]*?<\/thead>)([\s\S]*)$/);
  return head ? `<table${attrs}>${head[1]}<tbody>${head[2]}</tbody></table>` : `<table${attrs}><tbody>${inner}</tbody></table>`;
});
body = body.replace(/<nav class="top">/, '<nav class="top" aria-label="Sections">');
audit.push(`Buttons given an explicit type: ${buttonsTyped}; tables given a <tbody>: ${tablesFixed}; top navigation given an accessible name.`);
body = body.replace(/\n{3,}/g, '\n\n');

const sectionIds = [...body.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
audit.push(`Sections with ids: ${sectionIds.length} (${sectionIds.join(', ')}).`);
const h3BeforeH2 = /<h3[\s>]/.test(body.split(/<h2[\s>]/)[0]);
if (h3BeforeH2) audit.push('Heading order: an h3 appears before the first h2.');

// --- 5. write --------------------------------------------------------------------------------
mkdirSync(join(root, 'src'), { recursive: true });
mkdirSync(join(root, 'docs'), { recursive: true });
mkdirSync(join(root, 'tests'), { recursive: true });
mkdirSync(join(root, '.github/workflows'), { recursive: true });
writeFileSync(join(root, 'index.html'), body);
writeFileSync(join(root, 'src/page.css'), `/* Styles for ${repo}, moved from the page's <style> block; custom properties carry the --lr- prefix. */\n${css}`);
writeFileSync(join(root, 'src/page.js'), pageJs);
copyFileSync(join(here, '..', 'lib', 'lr-kit.js'), join(root, 'src/lr-kit.js'));
copyFileSync(join(here, '..', 'lib', 'lr-kit.css'), join(root, 'src/lr-kit.css'));
copyFileSync(join(here, '..', 'src', 'shell', 'exec-shell.css'), join(root, 'src/exec-shell.css'));
writeFileSync(join(root, 'src/main.js'), `import './page.js';\nimport { initCollapsible, mountLearningResource } from './lr-kit.js';\nimport { config } from './config.js';\n\ninitCollapsible();\nmountLearningResource(config);\n`);
if (!existsSync(join(root, 'src/config.js'))) {
  writeFileSync(
    join(root, 'src/config.js'),
    `/** Resource configuration: the kit reads this; tests/config.test.js validates it. */\nexport const config = {\n  title: ${JSON.stringify(title.split(/\s+[—–-]\s+/)[0])},\n  tagline: ${JSON.stringify(desc)},\n  repo: ${JSON.stringify(repoUrl)},\n  pagesUrl: ${JSON.stringify(pagesUrl)},\n  quizTitle: 'Five questions on this resource',\n  quiz: [\n    // { id: 'q1', prompt: '…', options: ['…', '…', '…'], answer: 0, explanation: '…' }\n  ]\n};\n`
  );
}
for (const f of ['package.json', 'eslint.config.js', 'vitest.config.js', '.htmlvalidate.json', '.gitignore', 'tests/config.test.js', 'tests/kit.test.js', '.github/workflows/deploy.yml', '.github/workflows/codeql.yml']) {
  const src = readFileSync(join(here, 'templates', f), 'utf8').replaceAll('__REPO__', repo);
  writeFileSync(join(root, f), src);
}
writeFileSync(
  join(root, 'AUDIT.md'),
  `# Conversion audit — ${repo}\n\nProduced by the Learning Resource Kit converter (\`apply/convert.mjs\`) from the single-file original (previous revision in git history).\n\n## Findings\n\n${audit.map((a) => `- ${a}`).join('\n')}\n\n## What changed for the reader\n\n- Executive Shell header, KPI strip (sections, reading time, sections opened, quiz, statements) and footer.\n- Collapsible sections are keyboard-operable with saved progress; deep links still open their section.\n- A five-question quiz at the end records xAPI 1.0.3 statements in the browser only.\n- A print stylesheet expands every section.\n- Strict content-security policy: no inline script or style, no network calls.\n`
);
console.log(`converted ${repo}: ${audit.length} findings`);
