#!/usr/bin/env node
/**
 * Ask a question ABOUT files, without the planner reading them.
 *
 * WHY THIS EXISTS. Delegation was not being used, and the reason was friction, not discipline:
 * getting a trustworthy answer took four steps — write a spec, write a schema, dispatch, then
 * write a verifier — while reading the file directly took one. So the file got read directly,
 * every time, at thousands of tokens of planner budget each.
 *
 * This collapses all four into one command whose answer is VERIFIED BEFORE YOU SEE IT.
 *
 *   npm run local:ask -- --read a.md,b.md "which lane is active, and what still blocks it?"
 *
 * It builds the schema, demands verbatim quotes, runs the dispatch, checks every quote against
 * the file it claims to come from, and EXITS NON-ZERO if any quote cannot be found. An answer
 * that reaches you has had its evidence checked mechanically.
 *
 * WHEN TO USE IT, AND WHEN NOT TO
 *   USE IT   when you need FACTS OUT OF a file — what does it say, which value is set, what
 *            failed, which of these is stale. Measured to be the local model's strongest mode.
 *   DO NOT   when you are about to EDIT the file. You need its real contents in context to edit
 *            it, and a summary is not a substitute. Delegating a read you were going to need
 *            anyway saves nothing and loses precision.
 *
 * The distinction is reading-for-facts versus reading-to-change. Only the first is delegable.
 *
 * Exit codes: 0 answered and every quote verified; 1 a quote could not be verified (the answer
 * is printed anyway, marked); 2 refused before dispatch.
 */

'use strict';

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { quoteIsReal } from './verify_quotes.mjs';

const here = dirname(fileURLToPath(import.meta.url));

// Walk the arguments once, marking what each is for. Anything not consumed by a flag is part of
// the question — so `--read a,b "why is x stale?"` and `"why is x stale?" --read a b` both work.
const args = process.argv.slice(2);
const files = [];
const questionParts = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--read') {
    // Exactly ONE token, comma-separated. Consuming every following non-flag token would
    // swallow the question itself as a filename — which it did, on the first real use.
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) {
      console.error('REFUSING: --read needs a comma-separated list of files.');
      process.exit(2);
    }
    for (const part of value.split(',')) {
      const trimmed = part.trim();
      if (trimmed) files.push(trimmed);
    }
    i += 1;
    continue;
  }
  if (args[i].startsWith('--')) continue;
  questionParts.push(args[i]);
}
const question = questionParts.join(' ').trim();

if (files.length === 0 || !question) {
  console.error('usage: npm run local:ask -- --read <a.md,b.md> "your question"');
  console.error('\nAsks the local model about those files and verifies every quote it returns.');
  console.error('Use it to get FACTS OUT OF a file. Do not use it for a file you are about to edit.');
  process.exit(2);
}

let missing = files.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error(`REFUSING: file(s) not found: ${missing.join(', ')}`);
  process.exit(2);
}

const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
const approxTokens = Math.ceil(bytes / 4);

// The schema is fixed, because the shape of "answer a question about a file" is fixed. Quotes
// are REQUIRED: an answer with no evidence cannot be checked, and an unverifiable answer from a
// 9B model is worth less than not asking.
const schema = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    quotes: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          quote: { type: 'string' },
        },
        required: ['file', 'quote'],
      },
    },
    unresolved: { type: 'string' },
  },
  required: ['answer', 'quotes', 'unresolved'],
};

const spec = `Answer this question about the files below.

QUESTION: ${question}

RULES, stated so you do not have to infer them:
- Answer ONLY from the files given. If they do not settle it, say so in \`unresolved\`.
- \`answer\`: a direct answer, a few sentences at most. No preamble.
- \`quotes\`: at least one SHORT VERBATIM line copied from a file, with that file's path exactly
  as it appears in the "## File:" heading. Copy character for character. Every quote is checked
  against the file by a script, and an invented quote fails the whole answer.
- \`unresolved\`: anything the files do not settle, or the string "none".

Do not speculate. A quote you cannot find is worse than an answer you cannot give.
`;

const work = mkdtempSync(join(tmpdir(), 'awwv-ask-'));
const specPath = join(work, 'spec.md');
const schemaPath = join(work, 'schema.json');
const outPath = join(work, 'answer.json');
writeFileSync(specPath, spec);
writeFileSync(schemaPath, JSON.stringify(schema, null, 2));

console.error(`asking about ${files.length} file(s), ~${approxTokens.toLocaleString()} tok the planner does not have to read`);

const run = spawnSync(process.execPath, [
  join(here, 'delegate.mjs'),
  '--spec', specPath,
  '--schema', schemaPath,
  '--kind', 'extract',
  '--read', files.join(','),
  '--out', outPath,
], { stdio: ['ignore', 'inherit', 'inherit'] });

if (run.status !== 0) process.exit(run.status ?? 1);

let answer;
try {
  let text = readFileSync(outPath, 'utf8').replace(/^<!--[\s\S]*?-->\s*/, '').trim();
  text = text.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  answer = JSON.parse(text);
} catch (error) {
  console.error(`\nThe reply did not parse: ${error.message}`);
  process.exit(1);
}

// ── Verify before showing ──────────────────────────────────────────────────────
const cache = new Map();
const bodyOf = (file) => {
  if (!cache.has(file)) cache.set(file, existsSync(file) ? readFileSync(file, 'utf8') : null);
  return cache.get(file);
};

let unverified = 0;
const checked = answer.quotes.map((row) => {
  const ok = quoteIsReal(bodyOf(row.file), row.quote);
  if (!ok) unverified += 1;
  return { ...row, ok };
});

console.log(`\n${answer.answer}\n`);
console.log('evidence:');
for (const row of checked) {
  console.log(`  ${row.ok ? '[verified]' : '[UNVERIFIED]'} ${row.file}`);
  console.log(`     "${String(row.quote).slice(0, 140)}"`);
}
if (answer.unresolved && answer.unresolved.toLowerCase() !== 'none') {
  console.log(`\nnot settled by these files: ${answer.unresolved}`);
}

if (unverified > 0) {
  console.error(`\n${unverified} of ${checked.length} quotes could NOT be found in the files they name.`);
  console.error('Treat the whole answer as unsound and read the file yourself.');
  process.exit(1);
}

console.error(`\n${checked.length}/${checked.length} quotes verified.`);
process.exit(0);
