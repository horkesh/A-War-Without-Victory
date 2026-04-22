#!/usr/bin/env node
/**
 * Per-step scenario profiler (v0.9.3 Lane 4 permanent tool).
 *
 * Wraps `runScenario` with per-step wall-time instrumentation and writes a
 * JSON report to the path passed via `--report` (default:
 * `/tmp/awwv_profile/report.json`). Mutates `warPhases[*].run` bindings in
 * memory only — does NOT modify sim source.
 *
 * Usage:
 *   npx tsx tools/perf/profile_scenario.ts \
 *       --scenario data/scenarios/apr1992_definitive_40w.json \
 *       --out /tmp/awwv_profile/out \
 *       --report /tmp/awwv_profile/report.json
 *
 * Stdout gets polluted by the scenario runner's own logs; the JSON report is
 * written to a file so downstream tooling can parse it reliably.
 *
 * Deterministic: wraps deterministic step.run functions with a timing shim;
 * no randomness, no Date.now in the measurement code.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { runScenario } from '../../src/scenario/scenario_runner.js';
import { warPhases } from '../../src/sim/turn_phases/war_phases.js';

const phaseTimings = new Map<string, { totalNs: bigint; count: number }>();

for (const step of warPhases) {
  const origRun = step.run;
  (step as { run: (ctx: unknown) => Promise<void> }).run = async (ctx: unknown) => {
    const t0 = process.hrtime.bigint();
    try {
      await origRun(ctx);
    } finally {
      const dt = process.hrtime.bigint() - t0;
      const cur = phaseTimings.get(step.name) ?? { totalNs: 0n, count: 0 };
      cur.totalNs += dt;
      cur.count += 1;
      phaseTimings.set(step.name, cur);
    }
  };
}

async function main() {
  const args = process.argv.slice(2);
  let scenario = '';
  let out = '/tmp/awwv_profile/out';
  let reportPath = '/tmp/awwv_profile/report.json';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scenario') scenario = args[++i];
    else if (args[i] === '--out') out = args[++i];
    else if (args[i] === '--report') reportPath = args[++i];
  }
  if (!scenario) {
    process.stderr.write('usage: profile_scenario --scenario PATH [--out PATH] [--report PATH]\n');
    process.exit(1);
  }

  const t0 = process.hrtime.bigint();
  const startMem = process.memoryUsage();
  await runScenario({ scenarioPath: scenario, outDirBase: out, uniqueRunFolder: true });
  const totalMs = Number(process.hrtime.bigint() - t0) / 1e6;
  const endMem = process.memoryUsage();

  const sorted = [...phaseTimings.entries()]
    .map(([name, v]) => ({ name, totalMs: Number(v.totalNs) / 1e6, count: v.count }))
    .sort((a, b) => b.totalMs - a.totalMs);

  const report = {
    scenario,
    totalWallMs: totalMs,
    totalWallS: totalMs / 1000,
    startHeapMB: startMem.heapUsed / (1024 * 1024),
    endHeapMB: endMem.heapUsed / (1024 * 1024),
    rssMB: endMem.rss / (1024 * 1024),
    phaseTotals: sorted,
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  process.stderr.write(`profile report written to ${reportPath}\n`);
  process.stderr.write(`totalWallS=${report.totalWallS.toFixed(2)} rssMB=${report.rssMB.toFixed(1)} steps=${sorted.length}\n`);
}

main().catch((e) => {
  console.error('profile_scenario error:', e);
  process.exit(1);
});
