#!/usr/bin/env node
/**
 * Record what actually happened to a delegated proposal.
 *
 * WHY THIS IS SEPARATE FROM THE DISPATCH. The dispatch cannot know its own outcome. If
 * `delegate.mjs` guessed — "generated successfully" — the ledger would record effort, not value,
 * and every entry would read as a success. The verdict is set afterwards, by the planner, after
 * the proposal has been reviewed and either used or thrown away.
 *
 * WHY IT EXISTS AT ALL. The routing rules in README.md were written from memory of six
 * dispatches. One of them — "it enumerates well" — survived until something finally measured it,
 * and then did not survive. Recorded outcomes let the routing table be derived rather than
 * recalled, and let a change to the harness be shown to have helped.
 *
 * Usage:
 *   node tools/local_executor/verdict.mjs <dispatch-id> <accepted|edited|rewritten> ["note"]
 *   node tools/local_executor/verdict.mjs --report        summarise the ledger
 *
 *   accepted   used as produced, or with cosmetic changes only
 *   edited     kept its structure, but its substance needed correcting
 *   rewritten  discarded; the planner wrote it instead
 */

'use strict';

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const LEDGER = join(here, '..', '..', 'logs', 'local_executor', 'dispatches.jsonl');
const VERDICTS = ['accepted', 'edited', 'rewritten'];

/** Byte-wise ordering. `.localeCompare` is banned repo-wide: it is locale-dependent. */
function strictCompare(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function readLedger() {
  if (!existsSync(LEDGER)) return [];
  return readFileSync(LEDGER, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function report(rows) {
  if (rows.length === 0) {
    console.log('ledger: empty — no dispatches recorded yet.');
    return;
  }
  const counts = {};
  let judged = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  for (const row of rows) {
    const key = row.verdict ?? '(unjudged)';
    counts[key] = (counts[key] ?? 0) + 1;
    if (row.verdict) judged += 1;
    inputTokens += row.input_tokens ?? 0;
    outputTokens += row.output_tokens ?? 0;
  }

  console.log(`ledger: ${rows.length} dispatch(es), ${judged} judged`);
  for (const key of Object.keys(counts).sort(strictCompare)) {
    const share = judged > 0 && key !== '(unjudged)'
      ? ` (${Math.round((counts[key] / judged) * 100)}% of judged)`
      : '';
    console.log(`  ${key.padEnd(12)} ${String(counts[key]).padStart(3)}${share}`);
  }
  console.log(`  tokens in ${inputTokens.toLocaleString()}, out ${outputTokens.toLocaleString()}`);

  const unjudged = rows.filter((row) => !row.verdict);
  if (unjudged.length > 0) {
    console.log('\nunjudged — an unrecorded outcome is a dispatch that taught nothing:');
    for (const row of unjudged.slice(-8)) {
      console.log(`  ${row.id}  ${row.spec ?? '(inline prompt)'}`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const rows = readLedger();

  if (args.includes('--report') || args.length === 0) {
    report(rows);
    process.exit(0);
  }

  const [id, verdict, ...noteParts] = args;
  if (!VERDICTS.includes(verdict)) {
    console.error(`REFUSING: verdict must be one of ${VERDICTS.join(' | ')}, got "${verdict}".`);
    process.exit(2);
  }

  const matches = rows.filter((row) => row.id === id);
  if (matches.length === 0) {
    console.error(`REFUSING: no dispatch with id ${id}. Run with --report to list unjudged ones.`);
    process.exit(2);
  }

  let written = 0;
  const updated = rows.map((row) => {
    if (row.id !== id) return row;
    written += 1;
    return { ...row, verdict, note: noteParts.join(' ') || null };
  });

  writeFileSync(LEDGER, `${updated.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  console.log(`recorded: ${id} -> ${verdict}${written > 1 ? ` (${written} entries)` : ''}`);
  process.exit(0);
}

main();
