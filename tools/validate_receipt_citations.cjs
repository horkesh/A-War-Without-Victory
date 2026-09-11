#!/usr/bin/env node
/**
 * Validate the evidence citations in the governing docs.
 *
 * The governing docs cite receipts under `logs/`. A citation pointing at something that does not
 * exist is a broken receipt: the doc claims proof that cannot be produced. Reviewers cannot tell
 * a real receipt from a plausible-looking path, so this decides it.
 *
 * ONLY MARKDOWN CODE SPANS COUNT. A path is a citation when it is written inside single backticks;
 * prose is not a citation. This rule is not decoration — the docs contain
 *
 *   "environment, logs/exits and stopping rules are in the plan"
 *   "logs/run artifacts remain local"
 *
 * where the slash means "or" and no file is being claimed at all. A naive scan reports both as
 * broken receipts. Requiring backticks excludes both WITHOUT a special case, which matters: a
 * checker that cries wolf gets ignored, and an ignored checker proves nothing.
 *
 * Citations may be written as globs (`logs/r9/phase2-*`) or brace groups
 * (`logs/bc06/disposition-{docs-tests-final,links,diff-check}.log`). A citation is satisfied when
 * at least one real path matches it — the docs cite a set of receipts, not a single file.
 *
 * Usage:
 *   node tools/validate_receipt_citations.cjs           validate; exit 1 if any citation is broken
 *   node tools/validate_receipt_citations.cjs --list    every citation with [ OK ] / [MISS]
 *   node tools/validate_receipt_citations.cjs --json    machine-readable report
 *   node tools/validate_receipt_citations.cjs --strict  evidence must be TRACKED, not merely
 *                                                       present on this machine — what CI needs
 *
 * Deterministic: no wall-clock reads, no randomness, sorted iteration throughout, and directory
 * listings are sorted before use so a glob resolves the same way on every filesystem.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

/** The docs that carry citations. Adding one here puts its receipts under the same gate. */
const DOC_FILES = [
  'docs/PROJECT_LEDGER.md',
  'docs/PROJECT_LEDGER_KNOWLEDGE.md',
  '.claude/napkin.md',
  'docs/plans/MASTER_ROADMAP.md',
  'docs/open_gates.yml',
];

/** Byte-wise ordering. `.localeCompare` is banned repo-wide: it is locale-dependent. */
function strictCompare(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Every `logs/...` citation in one document's text, sorted and deduped.
 *
 * A code span qualifies when `logs/` appears in it at a token boundary, so `catalogs/foo` is not
 * mistaken for a receipt. The citation itself is the run of path characters starting at `logs/`.
 */
function extractCitations(text) {
  if (typeof text !== 'string') return [];
  const citations = new Set();
  const codeSpan = /`([^`\n]+)`/g;
  let match;
  while ((match = codeSpan.exec(text)) !== null) {
    const content = match[1];
    const start = content.search(/(^|[^A-Za-z0-9_])logs\//);
    if (start === -1) continue;
    const from = content.indexOf('logs/', start);
    // Path characters, OR a whole brace group — which may contain spaces, as `{ a , b }`.
    // Matching braces as a unit matters: a plain character class stops at the first space and
    // silently truncates the citation to `logs/a{`, which then reports a baffling "does not
    // exist" for a path nobody wrote.
    const token = /^(?:[A-Za-z0-9._/*,-]|\{[^}]*\})+/.exec(content.slice(from));
    if (!token) continue;
    const cleaned = token[0].replace(/[.,]+$/, '');
    if (cleaned.length > 0) citations.add(cleaned);
  }
  return Array.from(citations).sort(strictCompare);
}

/**
 * Expand every brace group combinatorially: `a{1,2}b{x,y}` -> four paths.
 * A citation with no brace group expands to itself, so callers never special-case it.
 */
function expandBraces(citation) {
  if (typeof citation !== 'string') return [];
  const group = /\{([^{}]*)\}/.exec(citation);
  if (!group) return [citation];
  const before = citation.slice(0, group.index);
  const after = citation.slice(group.index + group[0].length);
  const options = group[1].split(',').map((option) => option.trim());
  const expanded = new Set();
  for (const option of options) {
    for (const tail of expandBraces(before + option + after)) expanded.add(tail);
  }
  return Array.from(expanded).sort(strictCompare);
}

/**
 * Walk `segments` down from `baseAbs`, allowing `*` to match within a single path segment.
 * Returns true as soon as one real path matches; a glob whose parent is absent is simply
 * unsatisfied, never a crash.
 */
function matchSegments(baseAbs, segments, wantsDir) {
  if (segments.length === 0) {
    if (!fs.existsSync(baseAbs)) return false;
    if (!wantsDir) return true;
    try {
      return fs.statSync(baseAbs).isDirectory();
    } catch (error) {
      return false;
    }
  }

  const head = segments[0];
  const rest = segments.slice(1);

  if (!head.includes('*')) {
    const next = path.join(baseAbs, head);
    if (!fs.existsSync(next)) return false;
    return matchSegments(next, rest, wantsDir);
  }

  const pattern = new RegExp(`^${escapeRegex(head).split('\\*').join('[^/]*')}$`);
  let entries;
  try {
    entries = fs.readdirSync(baseAbs);
  } catch (error) {
    return false;
  }
  for (const entry of entries.slice().sort(strictCompare)) {
    if (!pattern.test(entry)) continue;
    if (matchSegments(path.join(baseAbs, entry), rest, wantsDir)) return true;
  }
  return false;
}

/**
 * Is at least one real path on disk described by this citation?
 * A trailing `/` means the citation claims a directory, and a file will not satisfy it.
 */
function resolveCitation(citation, repoRoot = REPO_ROOT) {
  for (const candidate of expandBraces(citation)) {
    const wantsDir = candidate.endsWith('/');
    const clean = wantsDir ? candidate.slice(0, -1) : candidate;
    const segments = clean.split('/').filter((segment) => segment.length > 0);
    if (segments.length === 0) continue;
    if (matchSegments(repoRoot, segments, wantsDir)) return true;
  }
  return false;
}

/**
 * The set of paths git actually tracks. Returns null if git is unavailable, so a checkout without
 * git degrades to the existence check rather than reporting every citation as broken.
 */
function trackedPaths(repoRoot = REPO_ROOT) {
  try {
    const raw = execFileSync('git', ['-C', repoRoot, 'ls-files', '-z', 'logs'], {
      encoding: 'utf8',
      maxBuffer: 1 << 28,
    });
    return new Set(raw.split('\0').filter((entry) => entry.length > 0));
  } catch (error) {
    return null;
  }
}

/**
 * Is this citation backed by evidence that survives a FRESH CLONE?
 *
 * Existing on this machine is not enough: 5.6 GB of the cited receipts are run directories that
 * must never enter git (one is 5.4 GB of replay sequences), so a citation is satisfied here when
 * at least one TRACKED path matches it — for a bulk directory that is its `MANIFEST.txt`, which
 * records what the evidence was without shipping it.
 *
 * A citation matches a tracked path when the path IS it, or lies under it.
 */
function resolveCitationTracked(citation, tracked) {
  for (const candidate of expandBraces(citation)) {
    const clean = candidate.endsWith('/') ? candidate.slice(0, -1) : candidate;
    if (clean.length === 0) continue;
    const pattern = new RegExp(`^${escapeRegex(clean).split('\\*').join('[^/]*')}(/|$)`);
    for (const entry of tracked) {
      if (pattern.test(entry)) return true;
    }
  }
  return false;
}

/** Every citation across every doc, as {doc, citation}, sorted by doc then citation. */
function collectCitations(docs = DOC_FILES, repoRoot = REPO_ROOT) {
  const rows = [];
  for (const doc of docs.slice().sort(strictCompare)) {
    const absolute = path.join(repoRoot, doc);
    if (!fs.existsSync(absolute)) continue;
    const text = fs.readFileSync(absolute, 'utf8');
    for (const citation of extractCitations(text)) rows.push({ doc, citation });
  }
  return rows.sort((a, b) => (a.doc === b.doc
    ? strictCompare(a.citation, b.citation)
    : strictCompare(a.doc, b.doc)));
}

/**
 * Sorted human-readable errors; empty means every citation resolves.
 * In `strict` mode the evidence must be TRACKED, i.e. must survive a fresh clone.
 */
function validateCitations(docs = DOC_FILES, repoRoot = REPO_ROOT, options = {}) {
  const { strict = false } = options;
  const tracked = strict ? trackedPaths(repoRoot) : null;
  return collectCitations(docs, repoRoot)
    .filter((row) => (tracked
      ? !resolveCitationTracked(row.citation, tracked)
      : !resolveCitation(row.citation, repoRoot)))
    .map((row) => (tracked
      ? `${row.doc}: cites ${row.citation}, which is not tracked and would vanish in a fresh clone`
      : `${row.doc}: cites ${row.citation}, which does not exist`))
    .sort(strictCompare);
}

function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const tracked = strict ? trackedPaths() : null;
  const rows = collectCitations().map((row) => ({
    ...row,
    satisfied: tracked
      ? resolveCitationTracked(row.citation, tracked)
      : resolveCitation(row.citation),
  }));
  const broken = rows.filter((row) => !row.satisfied);

  if (args.includes('--json')) {
    console.log(JSON.stringify({
      strict,
      total: rows.length,
      broken: broken.length,
      citations: rows,
    }));
    process.exit(0);
  }

  if (args.includes('--list')) {
    for (const row of rows) {
      console.log(`${row.satisfied ? '[ OK ]' : '[MISS]'} ${row.citation} (${row.doc})`);
    }
    process.exit(0);
  }

  if (broken.length > 0) {
    console.error(`receipts: ${broken.length} broken citation(s)`);
    const why = strict
      ? 'is not tracked and would vanish in a fresh clone'
      : 'does not exist';
    for (const row of broken) {
      console.error(`  - ${row.doc}: cites ${row.citation}, which ${why}`);
    }
    process.exit(1);
  }

  const docCount = new Set(rows.map((row) => row.doc)).size;
  const mode = strict ? ' (strict: tracked evidence only)' : '';
  console.log(`receipts: OK — ${rows.length} citation(s) across ${docCount} doc(s)${mode}`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = {
  extractCitations,
  expandBraces,
  resolveCitation,
  resolveCitationTracked,
  trackedPaths,
  collectCitations,
  validateCitations,
  strictCompare,
  DOC_FILES,
  REPO_ROOT,
};
