#!/usr/bin/env node
/**
 * Measure a local model the way this harness actually uses one, so `config.json` stays evidence.
 *
 * WHAT IS MEASURED, AND WHY IT IS PROMPT THROUGHPUT FIRST.
 * An executor spends most of its budget READING: a spec plus two or three files is thousands of
 * tokens in and a few hundred out. So prompt throughput decides whether a model is usable, and
 * generation throughput decides how pleasant it feels. Ranking by the second is how a model that
 * takes fifty minutes to read one file gets chosen — this repo already rejected a 30B MoE that
 * generated at 12 tok/s but ingested at 8.
 *
 * A model larger than VRAM spills to system RAM, and on DDR4 the spill dominates everything else.
 * That is why size in GB is reported next to the throughputs: the number that explains them.
 *
 * Usage:
 *   node tools/local_executor/benchmark.mjs                 benchmark every installed model
 *   node tools/local_executor/benchmark.mjs qwen3.5:9b ...  benchmark the named ones
 *
 * Output is a table plus a JSON blob suitable for pasting into config.json's `measured`/`rejected`.
 * Nothing is written to config automatically: which model to use is a judgement, and this tool
 * only supplies the facts it rests on.
 */

'use strict';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(here, 'config.json'), 'utf8'));
const HOST = config.host;
const ctx = Number(config.num_ctx);

/** A realistic read: a real repo file, so the prompt looks like a real dispatch. */
const SAMPLE_FILE = join(here, '..', 'validate_receipt_citations.cjs');

function strictCompare(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

async function installedModels() {
  const res = await fetch(`${HOST}/api/tags`);
  if (!res.ok) throw new Error(`cannot list models: HTTP ${res.status}`);
  const body = await res.json();
  return body.models.map((m) => ({ name: m.name, bytes: m.size }));
}

async function benchmark(model, sample, ctx) {
  const prompt = `Read this file and reply with ONE sentence naming what it validates.\n\n${sample}`;
  const started = Date.now();
  const res = await fetch(`${HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      think: false,
      keep_alive: '5m',
      // MUST match the context the harness actually runs at. The KV cache grows with num_ctx and
      // is what pushes a large model past VRAM, so benchmarking at a smaller context measures a
      // configuration nobody uses: at 8192 this rig reported qwen3-coder:30b at 177 prompt tok/s,
      // against 8 tok/s previously recorded at 32768 — a 22x gap that is the cache, not the model.
      options: { num_ctx: ctx },
    }),
  });
  if (!res.ok) return { model, error: `HTTP ${res.status}` };
  const body = await res.json();

  const promptTokS = body.prompt_eval_count / (body.prompt_eval_duration / 1e9);
  const genTokS = body.eval_count / (body.eval_duration / 1e9);
  return {
    model,
    load_s: Number(((body.load_duration ?? 0) / 1e9).toFixed(1)),
    prompt_tokens: body.prompt_eval_count,
    prompt_tok_s: Number(promptTokS.toFixed(1)),
    gen_tokens: body.eval_count,
    gen_tok_s: Number(genTokS.toFixed(1)),
    wall_s: Number(((Date.now() - started) / 1000).toFixed(1)),
  };
}

async function main() {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const installed = await installedModels();
  const sizes = new Map(installed.map((m) => [m.name, m.bytes]));
  const targets = (requested.length > 0 ? requested : installed.map((m) => m.name))
    .slice()
    .sort(strictCompare);

  const sample = readFileSync(SAMPLE_FILE, 'utf8');
  console.error(`sample: ${SAMPLE_FILE} (~${Math.ceil(sample.length / 4).toLocaleString()} tok)\n`);

  const rows = [];
  for (const model of targets) {
    process.stderr.write(`  ${model} ... `);
    try {
      const row = await benchmark(model, sample, ctx);
      row.size_gb = sizes.has(model) ? Number((sizes.get(model) / 1e9).toFixed(1)) : null;
      rows.push(row);
      console.error(row.error ? `ERROR ${row.error}` : `${row.wall_s}s`);
    } catch (error) {
      rows.push({ model, error: error.message });
      console.error(`ERROR ${error.message}`);
    }
  }

  console.log('\nmodel                              size   prompt tok/s   gen tok/s   load s');
  console.log('-'.repeat(78));
  for (const row of rows) {
    if (row.error) {
      console.log(`${row.model.padEnd(34)} ${String(row.error)}`);
      continue;
    }
    console.log(
      `${row.model.padEnd(34)} ${`${row.size_gb}GB`.padStart(5)} `
      + `${String(row.prompt_tok_s).padStart(13)} ${String(row.gen_tok_s).padStart(11)} `
      + `${String(row.load_s).padStart(8)}`,
    );
  }
  console.log('\nPrompt throughput is the one that decides. A model that generates quickly but');
  console.log('ingests slowly is unusable here: an executor spends its budget reading.');
  console.log(`\n${JSON.stringify(rows, null, 2)}`);
}

main().catch((error) => {
  console.error(`benchmark failed: ${error.message}`);
  process.exit(1);
});
