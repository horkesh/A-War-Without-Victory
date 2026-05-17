#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function anchor(relativePath, line) {
  return `${path.join(REPO_ROOT, relativePath)}:${line}`;
}

function strictCompare(a, b) {
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

const ROWS = [
  {
    section: '§3',
    item: 'OSID supply trace per-OSID state',
    status: 'DONE',
    owner: 'sim_mechanic',
    anchor: anchor('src/state/supply_state_derivation.ts', 748),
  },
  {
    section: '§3',
    item: 'by_osid in report sorted by osid',
    status: 'DONE',
    owner: 'sim_mechanic',
    anchor: anchor('src/state/supply_state_derivation.ts', 811),
  },
  {
    section: '§4',
    item: 'fallback to last_supplied_turn when by_osid missing',
    status: 'DONE',
    owner: 'sim_mechanic',
    anchor: anchor('src/sim/combat/combat_math.ts', 849),
  },
  {
    section: '§4',
    item: 'getSupplyMult reads supply state at formation.location_osid',
    status: 'DONE',
    owner: 'sim_mechanic',
    anchor: anchor('src/sim/combat/combat_math.ts', 849),
  },
  {
    section: '§5',
    item: 'corridor cascade dependency thresholds',
    status: 'PARTIAL',
    owner: 'sim_mechanic',
    anchor: anchor('src/state/supply_state_derivation.ts', 620),
  },
  {
    section: '§5',
    item: 'propagation order by faction then node id',
    status: 'DONE',
    owner: 'sim_mechanic',
    anchor: anchor('src/state/supply_state_derivation.ts', 748),
  },
  {
    section: '§6',
    item: 'enclave resilience curve',
    status: 'DONE',
    owner: 'sim_mechanic',
    anchor: anchor('src/sim/combat/enclave_resilience.ts', 1),
  },
  {
    section: '§6',
    item: 'hardening defense bonus',
    status: 'DONE',
    owner: 'sim_mechanic',
    anchor: anchor('src/sim/combat/enclave_resilience.ts', 1),
  },
  {
    section: '§7',
    item: 'minimum supply UX panel and IPC corridor summary',
    status: 'PARTIAL',
    owner: 'ui_feedback',
    anchor: anchor('src/ui/map/components/SupplyPanel.tsx', 1),
  },
  {
    section: '§8',
    item: 'bot supply awareness in target/defense scoring',
    status: 'PARTIAL',
    owner: 'sim_mechanic',
    anchor: anchor('src/sim/combat/commander/force_eval.ts', 49),
  },
  {
    section: '§9',
    item: 'Phase 1 OSID trace',
    status: 'DONE',
    owner: 'sim_mechanic',
    anchor: anchor('src/state/supply_reachability_osid.ts', 1),
  },
  {
    section: '§9',
    item: 'Phase 2 cascade canon wording',
    status: 'DRIFTED',
    owner: 'canon_wording',
  },
];

function main() {
  const runDir = process.argv[2];
  if (runDir) {
    const resolvedRunDir = path.resolve(runDir);
    const summaryPath = path.join(resolvedRunDir, 'summary.json');
    const runSummaryPath = path.join(resolvedRunDir, 'run_summary.json');
    if (!fs.existsSync(summaryPath) && !fs.existsSync(runSummaryPath)) {
      console.error(`Missing run summary: ${summaryPath} or ${runSummaryPath}`);
      process.exit(2);
    }
  }

  const rows = [...ROWS].sort((a, b) => {
    const section = strictCompare(a.section, b.section);
    return section !== 0 ? section : strictCompare(a.item, b.item);
  });

  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
}

main();
