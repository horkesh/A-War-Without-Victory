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

const args = process.argv.slice(2);
const opt = (name, fallback = '') => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);

const model = opt('--model', 'qwen3.5:9b');
const ctx = Number(opt('--ctx', '32768'));
const think = args.includes('--think');
const specPath = opt('--spec');
const readList = opt('--read');
const promptArg = opt('--prompt');
const outPath = opt('--out', 'proposal.md');
const host = opt('--host', 'http://localhost:11434');

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
const files = readList ? readList.split(',').map((f) => f.trim()).filter(Boolean) : [];
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
  console.error(`\nREQUEST FAILED: ${error.message}\nIs ollama running?  ollama list\n`);
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
