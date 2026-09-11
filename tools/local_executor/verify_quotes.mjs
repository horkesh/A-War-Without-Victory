#!/usr/bin/env node
/**
 * Check that quotes a delegated answer claims to have copied are really in the source.
 *
 * WHY THIS IS A TOOL AND NOT A SCRIPT YOU WRITE EACH TIME. Demanding verbatim quotes is what
 * makes a local-model answer trustworthy — it converts an unverifiable claim into a checkable
 * one, and it is the only technique that has produced accepted dispatches about real repo state
 * (the active-lane question, the guard summaries: 6/6 correct).
 *
 * But the CHECKER is where it goes wrong. Written ad hoc on 2026-09-11 it produced TWO false
 * accusations of fabrication, and both times the quoted text was genuinely present:
 *
 *   1. ESCAPING. The model escapes backticks and dollars for JSON, so `\`$?\`` is not
 *      byte-identical to `` `$?` ``. A strict comparison called a faithful quote invented.
 *   2. MULTI-LINE. A quote may span two adjacent source lines, stitched with a newline and with
 *      markdown markers (`**`) dropped between them. Comparing line-at-a-time cannot see it.
 *
 * Accusing the tool of fabricating is worse than missing a fabrication: it is the same
 * false-positive failure the repo's guards keep teaching, pointed at the executor instead of the
 * planner. So the tolerances live here, tested, instead of being re-derived under pressure.
 *
 * Usage:
 *   node tools/local_executor/verify_quotes.mjs <answer.json> --field proof_of_blocking --source-field file
 *   node tools/local_executor/verify_quotes.mjs <answer.json> --field quote --source docs/plans/MASTER_ROADMAP.md
 *
 *   --field        the property holding the quote (searched at any depth)
 *   --source       a fixed file every quote should be found in
 *   --source-field the property naming the file, when each row cites a different one
 *
 * Exit 0 if every quote is found, 1 otherwise. Deterministic: no wall clock, sorted output.
 */

'use strict';

import { readFileSync, existsSync } from 'node:fs';

const BACKSLASH = String.fromCharCode(92);

/**
 * Normalise for comparison: drop the escaping the model adds for JSON, collapse whitespace,
 * and drop markdown emphasis markers that a stitched multi-line quote loses.
 *
 * Every relaxation here was earned by a false accusation. Do not tighten without a case.
 */
export function normaliseForQuote(text) {
  return String(text)
    .split(BACKSLASH).join('')
    .split('**').join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Is `quote` present in `source`, allowing for escaping, wrapping and dropped emphasis? */
export function quoteIsReal(source, quote) {
  if (!source || !quote) return false;
  const haystack = normaliseForQuote(source);
  const needle = normaliseForQuote(quote);
  if (needle.length < 12) return false; // too short to be evidence of anything
  return haystack.includes(needle);
}

/** Every {value, source} pair for `field`, walking the answer at any depth. */
export function collectQuotes(node, field, sourceField, inherited = null) {
  const found = [];
  const walk = (value, currentSource) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item, currentSource);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const source = sourceField && typeof value[sourceField] === 'string'
      ? value[sourceField]
      : currentSource;
    if (typeof value[field] === 'string') {
      found.push({ quote: value[field], source });
    }
    for (const key of Object.keys(value).sort()) walk(value[key], source);
  };
  walk(node, inherited);
  return found;
}

function parseAnswer(file) {
  let text = readFileSync(file, 'utf8').replace(/^<!--[\s\S]*?-->\s*/, '').trim();
  text = text.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  return JSON.parse(text);
}

function main() {
  const args = process.argv.slice(2);
  const answerPath = args.find((a) => !a.startsWith('--'));
  const at = (name) => {
    const i = args.indexOf(name);
    return i === -1 ? null : args[i + 1];
  };
  const field = at('--field');
  const fixedSource = at('--source');
  const sourceField = at('--source-field');

  if (!answerPath || !field || (!fixedSource && !sourceField)) {
    console.error('usage: verify_quotes.mjs <answer.json> --field <prop> (--source <file> | --source-field <prop>)');
    process.exit(2);
  }

  const answer = parseAnswer(answerPath);
  const rows = collectQuotes(answer, field, sourceField, fixedSource);
  if (rows.length === 0) {
    console.error(`REFUSING: no "${field}" values found in ${answerPath} — nothing was verified.`);
    console.error('A verifier that checks nothing and reports success is the failure it exists to catch.');
    process.exit(2);
  }

  const cache = new Map();
  const read = (file) => {
    if (!cache.has(file)) cache.set(file, existsSync(file) ? readFileSync(file, 'utf8') : null);
    return cache.get(file);
  };

  let bad = 0;
  for (const row of rows.slice().sort((a, b) => (a.source < b.source ? -1 : 1))) {
    const body = row.source ? read(row.source) : null;
    const ok = body !== null && quoteIsReal(body, row.quote);
    if (!ok) bad += 1;
    console.log(`  ${ok ? 'verbatim' : 'NOT FOUND'}  ${row.source ?? '(no source)'}`);
    if (!ok) console.log(`              ${String(row.quote).slice(0, 100)}`);
  }

  console.log(`\n${rows.length - bad}/${rows.length} quotes verified`);
  process.exit(bad > 0 ? 1 : 0);
}

if (process.argv[1] && process.argv[1].endsWith('verify_quotes.mjs')) main();
