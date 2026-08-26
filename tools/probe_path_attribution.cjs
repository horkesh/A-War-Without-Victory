#!/usr/bin/env node
/**
 * probe_path_attribution.cjs — which of the THREE probe emission paths produced each probe battle?
 *
 *   node tools/probe_path_attribution.cjs <run_dir> [--list]
 *
 * RE Phase 0, item 0.0c.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────────────
 * The RE plan's Phase 1 models ONE probe emission path. There are three, and the canon reviewer
 * found it. Until every probe battle is attributed, Phase 1's headline figures rest on a model of
 * an engine that has three probe sources and is modelled with one.
 *
 *   Path A — SURPLUS probe. `emit.ts:1295` -> `buildProbeOperation`, profiled as
 *            `.probe.buildProbeOperation`. Single objective by construction (`slice(0,1)`).
 *            This is the path the plan's counterfactual actually models.
 *   Path B — PLAN-CONVERTED probe. `shouldLaunchProbeInstead` (`bot_corps_directives.ts:273`,
 *            called at `emit.ts:1003`) turns a PLAN operation into a probe carrying the plan's
 *            FULL multi-objective array. It sits BEFORE the `probeOnCooldown` gate and is never
 *            tested against it — so Task 1.2's `last_probe_turn` does not cover it.
 *   Path C — ARMY-HQ OVERRIDE. `army_hq_overrides.ts:158`, `type: 'probe'`,
 *            `operation_name: "Probe: <name>"`, `target_osids.slice(0, 2)`.
 *
 * ── HOW EACH IS IDENTIFIED, AND WHERE THE IDENTIFICATION IS WEAK ───────────────────────────────
 * Probes do NOT emit AARs — `operation_aars.json` carries zero probe-typed entries; every AAR is a
 * `sector_attack`. Probes appear only as battle rows in `weekly_report.jsonl`, keyed by
 * `operation_name`. So attribution has to work from the battle log.
 *
 *   Path C: name matches /^Probe: /  — a distinct shape, unambiguous.
 *   Path A and Path B BOTH call `buildProbeOperation` and therefore BOTH produce
 *   `probe_<corps>_t<turn>`. THE NAME CANNOT SEPARATE THEM. The discriminator is the objective
 *   count: Path A is single-objective by construction, Path B carries the plan's full array. So a
 *   probe operation whose battles span MORE THAN ONE distinct `target_osid` cannot be Path A.
 *
 * ⚠ THE LIMIT OF THAT INFERENCE, STATED RATHER THAN BURIED: a Path-B probe converted from a
 * single-objective plan is indistinguishable from Path A in the artifacts. So the multi-objective
 * count is a LOWER BOUND on Path B, and the single-objective bucket is "A or B", not "A". Anyone
 * quoting these numbers must quote the bound, not the bucket. Closing this properly needs an
 * emission-path marker on the operation — which is a code change, not an artifact read.
 *
 * Exit 0 on success, 2 on a liveness failure (no probe battles found at all).
 */
const fs = require('fs');
const path = require('path');

const runDir = process.argv[2];
const wantList = process.argv.includes('--list');
if (!runDir) {
  console.error('usage: node tools/probe_path_attribution.cjs <run_dir> [--list]');
  process.exit(2);
}

const wrPath = path.join(runDir, 'weekly_report.jsonl');
if (!fs.existsSync(wrPath)) { console.error(`missing ${wrPath}`); process.exit(2); }

/** operation_name -> { battles, targets:Set, corps, turns:Set } */
const ops = new Map();
let totalBattles = 0;
let unnamed = 0;

for (const line of fs.readFileSync(wrPath, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let rec;
  try { rec = JSON.parse(line); } catch { continue; }
  const turn = rec.week_index ?? rec.turn ?? rec.week ?? null; // `week_index` is the real key — `turn`/`week` do not exist on a weekly record and silently yielded undefined
  for (const b of (rec.battles || [])) {
    totalBattles++;
    const name = b.operation_name;
    if (typeof name !== 'string') { unnamed++; continue; }
    if (!ops.has(name)) ops.set(name, { battles: 0, targets: new Set(), turns: new Set() });
    const e = ops.get(name);
    e.battles++;
    if (b.target_osid) e.targets.add(b.target_osid);
    if (turn !== null) e.turns.add(turn);
  }
}

const PROBE_A_B = /^probe_(.+)_t(\d+)$/;   // buildProbeOperation — Path A OR Path B
const PROBE_C = /^Probe: /;                // army_hq_overrides — Path C

const buckets = { A_or_B_single: [], B_multi: [], C: [] };
let probeBattles = 0;

for (const [name, e] of ops) {
  if (PROBE_C.test(name)) { buckets.C.push([name, e]); probeBattles += e.battles; continue; }
  if (PROBE_A_B.test(name)) {
    probeBattles += e.battles;
    if (e.targets.size > 1) buckets.B_multi.push([name, e]);
    else buckets.A_or_B_single.push([name, e]);
  }
}

const sum = (rows) => rows.reduce((n, [, e]) => n + e.battles, 0);

console.log('');
console.log(`PROBE EMISSION-PATH ATTRIBUTION — ${path.basename(runDir)}`);
console.log(`  battles in run: ${totalBattles}   probe battles: ${probeBattles}   (unnamed battle rows: ${unnamed})`);
console.log('');
console.log('  bucket                            ops   battles   note');
console.log('  ' + '-'.repeat(84));
console.log(`  A-or-B (single objective)   ${String(buckets.A_or_B_single.length).padStart(8)} ${String(sum(buckets.A_or_B_single)).padStart(9)}   NOT separable in artifacts — see header`);
console.log(`  B (multi-objective, ≥2)     ${String(buckets.B_multi.length).padStart(8)} ${String(sum(buckets.B_multi)).padStart(9)}   LOWER BOUND on Path B`);
console.log(`  C (army-HQ override)        ${String(buckets.C.length).padStart(8)} ${String(sum(buckets.C)).padStart(9)}   unambiguous`);
console.log('');

// LIVENESS: zero probe battles means the matcher failed, not that the engine emitted none.
// A probe-free run is possible in principle but is far more likely a broken pattern, and a
// silent 0 here would be exactly the vacuous result this repo keeps shipping.
if (probeBattles === 0) {
  console.error('  LIVENESS FAILURE — zero probe battles matched. Either this run has none (state that');
  console.error('  explicitly) or the naming pattern changed and this tool is measuring nothing.');
  console.error(`  Sample operation_names seen: ${[...ops.keys()].slice(0, 5).join(' | ')}`);
  process.exit(2);
}

console.log(`  ⇒ Path C is attributed exactly. Path B is bounded BELOW at ${sum(buckets.B_multi)} battles across`);
console.log(`    ${buckets.B_multi.length} operations. The remaining ${sum(buckets.A_or_B_single)} battles are Path A OR a Path-B`);
console.log('    conversion of a single-objective plan; the artifacts cannot separate them, and closing');
console.log('    that gap needs an emission-path marker on the operation, not another artifact read.');
console.log('');
console.log('  ⚠ Phase 1 models Path A alone. Its predictions therefore apply to AT MOST the');
console.log(`    ${sum(buckets.A_or_B_single)}-battle bucket, and to none of the ${sum(buckets.B_multi) + sum(buckets.C)} battles attributed to B or C.`);

if (wantList) {
  console.log('');
  console.log('  Path B (multi-objective) operations:');
  for (const [name, e] of buckets.B_multi.sort((x, y) => y[1].battles - x[1].battles)) {
    console.log(`    ${name.padEnd(34)} ${String(e.battles).padStart(3)} battles  ${e.targets.size} targets  turns ${[...e.turns].sort((a, b) => a - b).join(',')}`);
  }
  console.log('  Path C operations:');
  for (const [name, e] of buckets.C) console.log(`    ${name.padEnd(34)} ${String(e.battles).padStart(3)} battles  ${e.targets.size} targets`);
}
console.log('');
