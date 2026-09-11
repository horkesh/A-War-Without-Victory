#!/usr/bin/env node
/**
 * Delegate a bounded coding task to the local model, and return its proposal for review.
 *
 * THE DIVISION OF LABOUR
 *   Planner (hosted model): decides what to change, names the files, names the acceptance
 *                           tests, reviews the proposal, and is the only thing that writes
 *                           to the repo.
 *   Executor (local model): produces code for one bounded request. It never edits files,
 *                           never runs commands, never chooses its own oracle.
 *
 *   This is deliberately NOT an agent loop. A 9B model is strongest on a bounded prompt and
 *   weakest given autonomy; handing it file edits and a shell is the failure mode, not the
 *   feature. It emits text; the planner decides whether that text ever reaches disk.
 *
 * USAGE
 *   node tools/local_executor/delegate.mjs --spec <task.md> --read <a.ts,b.ts> --out <proposal.md>
 *   node tools/local_executor/delegate.mjs --prompt "..." --out proposal.md
 *
 * OPTIONS
 *   --model     default qwen3.5:9b       --ctx     default 32768
 *   --think     enable model thinking (default OFF — measured 30x slower for identical output)
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);

// Every argument must be accounted for. An argument this parser silently ignores is a
// FALSE GREEN: on 2026-09-11 `--read a.sh b.sh c.sh` sent ONE file and dropped two, because
// --read took a single value and the rest became stray argv. The dispatch looked successful and
// the model answered about code it had never seen. The same shape cost a session earlier when a
// space-separated `--keep` threw "Unknown argument" and did nothing, which was indistinguishable
// from the refusal that had been predicted.
const consumed = new Array(args.length).fill(false);

const opt = (name, fallback = '') => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  consumed[index] = true;
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) {
    console.error(`REFUSING: ${name} needs a value.`);
    process.exit(2);
  }
  consumed[index + 1] = true;
  return value;
};

/**
 * A repeatable value. `--read a b c` and `--read a,b,c` both mean three files, because guessing
 * which one the caller meant is exactly how the two files went missing.
 */
const optList = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return [];
  consumed[index] = true;
  const values = [];
  for (let cursor = index + 1; cursor < args.length && !args[cursor].startsWith('--'); cursor += 1) {
    consumed[cursor] = true;
    for (const part of args[cursor].split(',')) {
      const trimmed = part.trim();
      if (trimmed) values.push(trimmed);
    }
  }
  return values;
};

// Defaults are DATA (config.json), so swapping models never requires a code edit.
// Flags still override, for one-off experiments.
const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(here, 'config.json'), 'utf8'));

const model = opt('--model', config.model);
const ctx = Number(opt('--ctx', String(config.num_ctx)));
const thinkIndex = args.indexOf('--think');
if (thinkIndex !== -1) consumed[thinkIndex] = true;
const think = thinkIndex !== -1 ? true : Boolean(config.think);
const specPath = opt('--spec');
const readFiles = optList('--read');
const promptArg = opt('--prompt');
const outPath = opt('--out', 'proposal.md');
const host = opt('--host', config.host);

// Nothing may be silently ignored. A typo'd flag or a file that fell out of --read must stop the
// dispatch, not quietly shrink it.
const stray = args.filter((value, index) => !consumed[index]);
if (stray.length > 0) {
  console.error(
    `REFUSING: unrecognised argument(s): ${stray.join(' ')}\n`
    + 'Nothing is sent unless every argument is understood — an ignored argument means the model\n'
    + 'silently receives less than you think it does, and answers confidently about code it never saw.\n'
    + 'Flags: --spec --prompt --read --out --model --ctx --host --think\n',
  );
  process.exit(2);
}

if (!specPath && !promptArg) {
  console.error('REFUSING: give --spec <file> or --prompt "<text>". The executor needs a bounded request.');
  process.exit(2);
}

// ── Build the request ──────────────────────────────────────────────────────────
let prompt = '';
if (specPath) {
  if (!existsSync(specPath)) { console.error(`REFUSING: spec not found: ${specPath}`); process.exit(2); }
  prompt += `## Task\n\n${readFileSync(specPath, 'utf8')}\n`;
}
if (promptArg) prompt += `## Task\n\n${promptArg}\n`;

// Context budget guard. At 32K this repo is not explorable; oversized input silently
// truncates and the model answers confidently about code it never saw.
const files = readFiles;
let approxTokens = Math.ceil(prompt.length / 4);
for (const file of files) {
  if (!existsSync(file)) { console.error(`REFUSING: --read file not found: ${file}`); process.exit(2); }
  const body = readFileSync(file, 'utf8');
  const tokens = Math.ceil(body.length / 4);
  approxTokens += tokens;
  console.error(`  including ${file} (~${tokens.toLocaleString()} tok, ${(statSync(file).size / 1024).toFixed(1)} KB)`);
  prompt += `\n## File: ${file}\n\n\`\`\`\n${body}\n\`\`\`\n`;
}

const budget = ctx - 2048; // leave room for the reply
console.error(`  total input ~${approxTokens.toLocaleString()} tok against a ${budget.toLocaleString()} tok budget`);
if (approxTokens > budget) {
  console.error(
    `\nREFUSING: input ~${approxTokens.toLocaleString()} tokens exceeds the ${budget.toLocaleString()} budget.\n` +
    'Truncation here is invisible: the model would answer confidently about code it never saw.\n' +
    'Send fewer files, or raise --ctx if VRAM allows.\n',
  );
  process.exit(2);
}

prompt += `
## Rules

- Return ONLY the code that changes, in a fenced block, plus a one-line note per change.
- Deterministic code only: no Math.random, no Date.now, no new Date(), no .localeCompare().
  Sorted iteration uses strictCompare.
- Do not invent files, functions or imports you were not shown.
- If the task cannot be done with what you were given, say exactly what is missing and stop.
`;

// ── Call the model ─────────────────────────────────────────────────────────────
const started = Date.now();
let response;
try {
  const res = await fetch(`${host}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false, think, options: { num_ctx: ctx } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  response = await res.json();
} catch (error) {
  // Do not guess at the cause. On 2026-09-11 this printed "Is ollama running?" while ollama WAS
  // running and `local:check` reported READY one command later — the model was simply cold and
  // the first request timed out. A wrong diagnosis costs more than no diagnosis, so ask the
  // server itself before saying anything about it.
  let serverUp = false;
  try {
    const probe = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(3000) });
    serverUp = probe.ok;
  } catch (probeError) {
    serverUp = false;
  }

  console.error(`\nREQUEST FAILED: ${error.message}`);
  if (!serverUp) {
    console.error(`ollama is NOT reachable at ${host}.  Check with:  npm run local:check\n`);
  } else if (error.message.includes('HTTP 404')) {
    // The server answered; it simply has no such model. Saying "cold load" here would be the
    // same wrong-diagnosis failure this branch exists to prevent.
    console.error(
      `ollama is reachable, but it has no model named "${model}".\n`
      + `  ollama list          see what is installed\n`
      + `  ollama pull ${model}\n`
      + 'Or fix the name: the default lives in tools/local_executor/config.json.\n',
    );
  } else {
    console.error(
      `ollama IS reachable at ${host}, so this is not a "server down" problem.\n`
      + `Most likely ${model} was cold and the first load exceeded the timeout — loading it from\n`
      + 'disk takes far longer than generating with it. Run the same command again; the second\n'
      + 'attempt hits a warm model.\n',
    );
  }
  process.exit(1);
}

const genTokPerSec = response.eval_count / (response.eval_duration / 1e9);
const header = [
  `<!-- delegated to ${model} on ${new Date(started).toISOString().slice(0, 10)}`,
  `     input ~${approxTokens} tok | output ${response.eval_count} tok | ${genTokPerSec.toFixed(1)} tok/s`,
  `     think=${think} ctx=${ctx}`,
  `     PROPOSAL ONLY — not applied. The planner reviews, applies, and runs the gate. -->`,
  '',
].join('\n');

writeFileSync(outPath, header + response.response, 'utf8');

console.error(`\n  output ${response.eval_count} tok at ${genTokPerSec.toFixed(1)} tok/s -> ${outPath}`);
console.error('  NOT APPLIED. Review it, apply what is correct, then: npm run gate:local -- --tests <files>');
