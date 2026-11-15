#!/usr/bin/env node
/**
 * CI guard: a PR that changes src/ or data/ must add a ledger fragment.
 *
 * A fragment is one new file, docs/ledger/fragments/YYYY-MM-DD-<slug>.md (see
 * tools/ledger_compile.cjs). Format problems in any fragment also fail the check.
 *
 * Transition: while lanes that started before fragments existed are still in flight, a direct
 * edit of docs/PROJECT_LEDGER.md is accepted in place of a fragment (ACCEPT_DIRECT_LEDGER_EDIT).
 * Flip it to false once the queue has drained. A PR labelled `no-ledger` skips the job in the
 * workflow, for the rare change that has nothing to record.
 *
 * Usage: node tools/ledger_fragment_check.cjs [--base origin/main]
 */
'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { loadFragments } = require('./ledger_compile.cjs');

const ACCEPT_DIRECT_LEDGER_EDIT = true;
const FRAGMENT_PREFIX = 'docs/ledger/fragments/';
const LEDGER = 'docs/PROJECT_LEDGER.md';
const PRODUCT_PREFIXES = ['src/', 'data/'];

/** Pure decision. `changed` is every changed path; `added` is the paths newly added. */
function evaluate(changed, added) {
  const touchesProduct = changed.some((f) => PRODUCT_PREFIXES.some((p) => f.startsWith(p)));
  if (!touchesProduct) return { ok: true, reason: 'no src/ or data/ change' };
  const addedFragment = added.some((f) => f.startsWith(FRAGMENT_PREFIX) && f.endsWith('.md') && !f.endsWith('/README.md'));
  if (addedFragment) return { ok: true, reason: 'adds a ledger fragment' };
  if (ACCEPT_DIRECT_LEDGER_EDIT && changed.includes(LEDGER)) {
    return { ok: true, reason: 'edits the ledger directly (transition rule)' };
  }
  return {
    ok: false,
    reason:
      'this PR changes src/ or data/ but adds no ledger fragment. Add docs/ledger/fragments/YYYY-MM-DD-<slug>.md ' +
      '(first line "## YYYY-MM-DD — <title>"), or label the PR `no-ledger` if there is nothing to record.',
  };
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);
}

function main(argv) {
  const i = argv.indexOf('--base');
  const base = i === -1 ? 'origin/main' : argv[i + 1];
  const changed = git(['diff', '--name-only', `${base}...HEAD`]);
  const added = git(['diff', '--name-only', '--diff-filter=A', `${base}...HEAD`]);

  const { errors } = loadFragments(path.resolve(__dirname, '..', 'docs', 'ledger', 'fragments'));
  if (errors.length > 0) {
    for (const e of errors) console.error(`ledger fragment error: ${e}`);
    return 1;
  }
  const verdict = evaluate(changed, added);
  if (!verdict.ok) {
    console.error(`ledger fragment check failed: ${verdict.reason}`);
    return 1;
  }
  console.log(`ledger fragment check passed: ${verdict.reason}`);
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { evaluate, ACCEPT_DIRECT_LEDGER_EDIT };
