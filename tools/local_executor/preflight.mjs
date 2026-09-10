#!/usr/bin/env node
/**
 * Is the local executor usable right now?
 *
 * A standing harness must fail LOUDLY and specifically when its dependency is absent, not
 * fail obscurely at the moment of use. Every check below names what to do about it.
 *
 *   npm run local:check
 *
 * Exit 0 ready, 1 not ready (message says why).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(here, 'config.json'), 'utf8'));
const problems = [];

console.log(`local executor preflight — model ${config.model}, ctx ${config.num_ctx}, think ${config.think}`);

// 1. Is the server up?
let version = null;
try {
  const res = await fetch(`${config.host}/api/version`, { signal: AbortSignal.timeout(5000) });
  version = (await res.json()).version;
  console.log(`  ok    ollama ${version} reachable at ${config.host}`);
} catch {
  problems.push(
    `ollama not reachable at ${config.host}\n` +
    '        start it:  ollama serve      (it normally runs as a Windows service)\n' +
    '        install:   winget install --id Ollama.Ollama',
  );
}

// 2. Is the configured model actually pulled? A missing model is the most likely
//    cause of a confusing failure months from now.
if (version) {
  try {
    const res = await fetch(`${config.host}/api/tags`, { signal: AbortSignal.timeout(10000) });
    const names = ((await res.json()).models ?? []).map((m) => m.name);
    if (names.includes(config.model)) {
      console.log(`  ok    model ${config.model} present`);
    } else {
      problems.push(
        `configured model "${config.model}" is not pulled\n` +
        `        pull it:   ollama pull ${config.model}\n` +
        `        present:   ${names.length ? names.join(', ') : '(none)'}\n` +
        '        or edit tools/local_executor/config.json — model choice is data, not code',
      );
    }
  } catch {
    problems.push('could not list models (ollama responded to /api/version but not /api/tags)');
  }
}

// 3. Does the Anthropic-compatible surface exist? This is what a second Claude Code
//    session would use; its absence means the ollama build predates v0.14.
if (version) {
  const [major, minor] = version.split('.').map((n) => Number.parseInt(n, 10));
  if (Number.isFinite(major) && (major > 0 || minor >= 14)) {
    console.log(`  ok    ollama ${version} supports the Anthropic Messages API (>= 0.14)`);
  } else {
    console.log(`  warn  ollama ${version} predates 0.14 — /api/generate works, Claude Code passthrough will not`);
  }
}

console.log('');
if (problems.length === 0) {
  console.log('READY — delegate with:  npm run local:delegate -- --spec <task.md> --read <files> --out <proposal.md>');
  process.exit(0);
}
console.log(`NOT READY — ${problems.length} problem(s):`);
for (const problem of problems) console.log(`  - ${problem}`);
process.exit(1);
