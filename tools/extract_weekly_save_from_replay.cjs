'use strict';

/**
 * extract_weekly_save_from_replay.cjs
 *
 * Read a 188w run's `replay_sequence.jsonl` (one full state per turn) and write
 * synthetic single-file run directories each containing `final_save.json` at
 * the requested turn. This lets `compare_painted_vs_sim.cjs` (which only reads
 * `final_save.json`) be pointed at an intermediate week from a single full-war
 * run, instead of running multiple scenarios that each end at a different week.
 *
 * Format expected (per line of replay_sequence.jsonl):
 *   {"week_index": <0-indexed>, "turn": <1-indexed>, "state": "<JSON-string>"}
 *
 * Usage:
 *   node tools/extract_weekly_save_from_replay.cjs <run_dir> <out_root> <turn1> [<turn2> ...]
 *
 * Example:
 *   node tools/extract_weekly_save_from_replay.cjs \
 *     runs/apr1992_definitive_188w__abc__w188_n1799 \
 *     runs/_painted_xcheck_n1799 \
 *     40 105 157 188
 *
 * Writes:
 *   <out_root>/w040/final_save.json
 *   <out_root>/w105/final_save.json
 *   <out_root>/w157/final_save.json
 *   <out_root>/w188/final_save.json
 *
 * CommonJS — runs with plain node.
 *
 * Determinism: pure line-by-line streaming; no timestamps; sorted output of
 * per-turn writes by turn number.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: node tools/extract_weekly_save_from_replay.cjs <run_dir> <out_root> <turn1> [<turn2> ...]');
    process.exit(2);
  }

  const runDir = args[0];
  const outRoot = args[1];
  const targetTurns = args.slice(2)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);

  if (targetTurns.length === 0) {
    console.error('No valid target turns supplied.');
    process.exit(2);
  }

  const jsonlPath = path.join(runDir, 'replay_sequence.jsonl');
  if (!fs.existsSync(jsonlPath)) {
    console.error(`Missing: ${jsonlPath}`);
    process.exit(1);
  }

  fs.mkdirSync(outRoot, { recursive: true });

  const wanted = new Set(targetTurns);
  const found = new Map();

  const stream = fs.createReadStream(jsonlPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    // Cheap pre-parse turn-number probe so we don't JSON.parse every megabyte line.
    const probe = line.match(/"turn"\s*:\s*(\d+)/);
    if (!probe) continue;
    const turn = parseInt(probe[1], 10);
    if (!wanted.has(turn)) continue;

    let rec;
    try {
      rec = JSON.parse(line);
    } catch (e) {
      console.error(`Failed to parse line for turn ${turn}: ${e.message}`);
      continue;
    }

    let stateObj;
    try {
      stateObj = typeof rec.state === 'string' ? JSON.parse(rec.state) : rec.state;
    } catch (e) {
      console.error(`Failed to parse state for turn ${turn}: ${e.message}`);
      continue;
    }

    found.set(turn, stateObj);

    if (found.size === wanted.size) {
      // Got all of them — close the stream early.
      rl.close();
      break;
    }
  }

  const missing = targetTurns.filter((t) => !found.has(t));
  if (missing.length > 0) {
    console.error(`WARNING: missing target turns in replay sequence: ${missing.join(', ')}`);
  }

  // Write in deterministic turn order.
  const sortedTurns = Array.from(found.keys()).sort((a, b) => a - b);
  for (const turn of sortedTurns) {
    const subDir = path.join(outRoot, `w${String(turn).padStart(3, '0')}`);
    fs.mkdirSync(subDir, { recursive: true });
    const outPath = path.join(subDir, 'final_save.json');
    fs.writeFileSync(outPath, JSON.stringify(found.get(turn), null, 2));
    console.log(`wrote ${outPath}`);
  }

  if (missing.length > 0) process.exit(3);
}

main().catch((e) => {
  console.error(e?.stack ?? String(e));
  process.exit(1);
});
