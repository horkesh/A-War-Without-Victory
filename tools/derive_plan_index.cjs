#!/usr/bin/env node
/**
 * Derive `docs/plans/plan_index.yml` from the roadmap's Workstream Register.
 *
 * WHY THIS EXISTS. There are 292 plan documents and no machine-readable answer to "which plan
 * owns which lane, and is that lane open?". The local model was asked exactly that on
 * 2026-09-11 and correctly REFUSED, saying the roadmap has no such mapping in one place — which
 * is true, and is the gap this closes. It is the same gap `open_gates.yml` closed for gates:
 * state that can be read but not enumerated.
 *
 * DERIVED, NOT MAINTAINED. The index is regenerated from MASTER_ROADMAP.md, and
 * `tests/plan_index.test.ts` fails if the committed file differs from a fresh derivation. So it
 * cannot drift from the roadmap the way a hand-kept copy would — and the roadmap stays the single
 * authority, exactly as `open_gates.yml` declares for itself.
 *
 * WHAT IT IS FOR. Chiefly, deciding what can be handed to the local executor:
 *   - `tokens` says whether a plan fits the 32K context at all
 *   - `lane_open` says whether it is worth touching
 *   - `tasks` names a machine-readable task manifest when one exists
 * A dispatcher should never have to open 292 files to learn that 264 of them are closed history.
 *
 * Usage:
 *   node tools/derive_plan_index.cjs            rewrite docs/plans/plan_index.yml
 *   node tools/derive_plan_index.cjs --check    exit 1 if the committed file is out of date
 *   node tools/derive_plan_index.cjs --print    print the derivation without writing
 *
 * Deterministic: sorted, no wall clock, sizes read from disk.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const ROADMAP = 'docs/plans/MASTER_ROADMAP.md';
const INDEX = 'docs/plans/plan_index.yml';

const LANE_ROW = /^\|\s*(R[1-9]|RC|RE|REPO)\s*\|/;
const PLAN_LINK = /\]\(([0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+\.md)\)/g;

/**
 * LANE STATE IS THE STATUS HEAD, NOT THE WHOLE CELL.
 *
 * Every register status cell is written the same way: a bold head that states the lane's status,
 * then prose explaining it — `**ACTIVE — AUDIO AND BROADER ACCEPTANCE OPEN.** WR01 delivered…`.
 * The prose talks about sub-items, and sub-items close while their lane stays open. R6's cell
 * records that the Pješivac-Kula objective correction is CLOSED inside a lane whose head reads
 * `**JANUARY OBJECTIVE CORRECTIONS MEASURED; CALIBRATION HELD.**`, and a substring search over
 * the whole cell therefore retired a live calibration lane — the one state a dispatcher reads
 * this index to learn. So closure is taken from the head or it is not taken at all.
 *
 * Unestablished closure stays LIVE. A cell with no bold head asserts no lane-level status, and
 * a head that qualifies its own closure word ("NOT CLOSED", "partially complete") asserts the
 * opposite of one. Both read open and say why on stderr; neither silently certifies a finish.
 */
const STATUS_HEAD = /^\s*\*\*([\s\S]+?)\*\*/;
/** Whole words only: `INCOMPLETE` is not `COMPLETE`, and never was. */
const CLOSURE_WORD = /\b(?:COMPLETED?|CLOSED)\b/g;
/** Words that turn a following closure word into a denial or a part-claim. */
const CLOSURE_QUALIFIERS = new Set([
  'NOT', 'NO', 'NEVER', 'YET', 'PARTIALLY', 'PARTIAL', 'PARTLY', 'NEARLY', 'ALMOST', 'MOSTLY',
]);

/** Every closure word in `text`, each flagged with whether a nearby word denies it. */
function closureClaims(text) {
  const upper = text.toUpperCase();
  const claims = [];
  CLOSURE_WORD.lastIndex = 0;
  let match;
  while ((match = CLOSURE_WORD.exec(upper)) !== null) {
    const preceding = (upper.slice(0, match.index).match(/[A-Z]+/g) ?? []).slice(-3);
    claims.push({ word: match[0], negated: preceding.some((word) => CLOSURE_QUALIFIERS.has(word)) });
  }
  return claims;
}

/**
 * Read one register status cell. Returns the lane-level verdict, the head it was read from, and
 * any diagnostic explaining a refusal to certify closure.
 */
function classifyLaneStatus(cell) {
  const raw = String(cell ?? '');
  const head = STATUS_HEAD.exec(raw);

  if (head === null) {
    const diagnostics = closureClaims(raw).some((claim) => !claim.negated)
      ? ['no bold status head; closure wording appears only in prose — read as live']
      : [];
    return { closed: false, head: null, diagnostics };
  }

  const text = head[1].trim();
  const claims = closureClaims(text);
  if (claims.length === 0) return { closed: false, head: text, diagnostics: [] };
  if (claims.some((claim) => claim.negated)) {
    return {
      closed: false,
      head: text,
      diagnostics: [`status head qualifies its own closure ("${text}") — read as live`],
    };
  }
  return { closed: true, head: text, diagnostics: [] };
}

function strictCompare(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function escapeYaml(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Parse the register into {lane, title, closed, plans[]} rows, in roadmap order. */
function parseRegister(repoRoot = REPO_ROOT) {
  const text = fs.readFileSync(path.join(repoRoot, ROADMAP), 'utf8');
  const rows = [];
  for (const line of text.split('\n')) {
    const lane = LANE_ROW.exec(line);
    if (!lane) continue;
    const cells = line.split('|').map((cell) => cell.trim());
    const verdict = classifyLaneStatus(cells[3] ?? '');
    const status = (cells[3] ?? '').replace(/\*\*/g, '');
    const plans = [];
    PLAN_LINK.lastIndex = 0;
    let match;
    while ((match = PLAN_LINK.exec(line)) !== null) {
      if (!plans.includes(match[1])) plans.push(match[1]);
    }
    rows.push({
      lane: lane[1],
      title: cells[2] ?? '',
      closed: verdict.closed,
      status: status.slice(0, 160),
      head: verdict.head,
      diagnostics: verdict.diagnostics,
      plans: plans.slice().sort(strictCompare),
    });
  }
  return rows;
}

/** The YAML text for the current roadmap. Pure function of the roadmap plus file sizes. */
function renderIndex(repoRoot = REPO_ROOT) {
  const rows = parseRegister(repoRoot);
  const lines = [
    '# Plan Index — which plan owns which lane, as data',
    '#',
    '# DERIVED from docs/plans/MASTER_ROADMAP.md. Do not hand-edit: `tests/plan_index.test.ts`',
    '# regenerates it and fails if this file differs. Change the roadmap, then run',
    '#   node tools/derive_plan_index.cjs',
    '#',
    '# The roadmap remains the single authority for lane state. This file only makes it',
    '# enumerable, which it was not: 292 plan documents exist and 264 are unlinked history.',
    '#',
    '# FIELDS',
    '#   lane_open   the bold status head of the register row does not assert COMPLETE/CLOSED.',
    '#               Prose after the head explains sub-items and never decides the lane.',
    '#   tokens      approximate, size/4 — whether the plan fits a 32,768-token context at all',
    '#   tasks       path to a machine-readable task manifest, or null if none exists yet',
    '',
    'version: 1',
    `source: ${ROADMAP}`,
    '',
    'lanes:',
  ];

  for (const row of rows) {
    lines.push(`  - lane: ${row.lane}`);
    lines.push(`    title: "${escapeYaml(row.title)}"`);
    lines.push(`    lane_open: ${row.closed ? 'false' : 'true'}`);
    lines.push(`    status: "${escapeYaml(row.status)}"`);
    if (row.plans.length === 0) {
      lines.push('    plans: []');
      continue;
    }
    lines.push('    plans:');
    for (const plan of row.plans) {
      const rel = `docs/plans/${plan}`;
      const abs = path.join(repoRoot, rel);
      const bytes = fs.existsSync(abs) ? fs.statSync(abs).size : 0;
      const tasks = `docs/plans/tasks/${plan.replace(/\.md$/, '.yml')}`;
      const hasTasks = fs.existsSync(path.join(repoRoot, tasks));
      lines.push(`      - path: ${rel}`);
      lines.push(`        exists: ${bytes > 0 ? 'true' : 'false'}`);
      lines.push(`        tokens: ${Math.ceil(bytes / 4)}`);
      lines.push(`        fits_context: ${Math.ceil(bytes / 4) < 30720 ? 'true' : 'false'}`);
      lines.push(`        tasks: ${hasTasks ? tasks : 'null'}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

/** Report every cell whose wording left closure unestablished, so it is visible and not silent. */
function reportDiagnostics(rows) {
  for (const row of rows) {
    for (const note of row.diagnostics) console.error(`plan index: ${row.lane}: ${note}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const text = renderIndex();
  const target = path.join(REPO_ROOT, INDEX);

  if (args.includes('--print')) {
    process.stdout.write(text);
    process.exit(0);
  }

  if (args.includes('--check')) {
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
    if (current === text) {
      console.log(`plan index: up to date (${INDEX})`);
      process.exit(0);
    }
    console.error(`plan index: ${current === null ? 'missing' : 'STALE'} — regenerate with:`);
    console.error('  node tools/derive_plan_index.cjs');
    process.exit(1);
  }

  fs.writeFileSync(target, text);
  const rows = parseRegister();
  reportDiagnostics(rows);
  const open = rows.filter((row) => !row.closed);
  const openPlans = open.reduce((sum, row) => sum + row.plans.length, 0);
  console.log(`plan index: ${rows.length} lane(s), ${open.length} open, ${openPlans} plan(s) on open lanes`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { classifyLaneStatus, parseRegister, renderIndex, strictCompare, ROADMAP, INDEX };
