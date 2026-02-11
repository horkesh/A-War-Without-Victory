import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { deserializeState } from '../state/serialize.js';
import { loadSettlementGraph } from '../map/settlements.js';
import { buildAdjacencyMap } from '../map/adjacency_map.js';
import { computeSupplyReachability } from '../state/supply_reachability.js';
import {
  deriveCorridors,
  deriveSupplyState,
  deriveLocalProductionCapacity
} from '../state/supply_state_derivation.js';

const defaultPath = resolve('saves', 'save_0001.json');
const defaultOutPath = resolve('data', 'derived', 'supply_reachability.json');

type CliOptions = {
  savePath: string;
  outPath: string;
  withState: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const positional: string[] = [];
  let outPath: string | null = null;
  let withState = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      const next = argv[i + 1];
      if (next === undefined) throw new Error('Missing value for --out');
      outPath = resolve(next);
      i += 1;
      continue;
    }
    if (arg === '--with-state') {
      withState = true;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    positional.push(arg);
  }

  const savePath = positional.length > 0 ? resolve(positional[0]) : defaultPath;

  return {
    savePath,
    outPath: outPath ?? defaultOutPath,
    withState
  };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const payload = await readFile(opts.savePath, 'utf8');
  const state = deserializeState(payload);

  const graph = await loadSettlementGraph();
  const adjacencyMap = buildAdjacencyMap(graph.edges);
  const report = computeSupplyReachability(state, adjacencyMap);

  await mkdir(resolve(opts.outPath, '..'), { recursive: true });
  await writeFile(opts.outPath, JSON.stringify(report, null, 2), 'utf8');

  process.stdout.write(`supply_reachability for turn ${report.turn}\n`);
  for (const faction of report.factions) {
    process.stdout.write(
      `  ${faction.faction_id}: controlled=${faction.controlled.length}, ` +
      `reachable=${faction.reachable_controlled.length}, ` +
      `isolated=${faction.isolated_controlled.length}, ` +
      `edges_used=${(faction.edges_used ?? []).length}\n`
    );
  }
  process.stdout.write(`  wrote: ${opts.outPath}\n`);

  if (opts.withState) {
    const corridorReport = deriveCorridors(state, adjacencyMap, report);
    const supplyStateReport = deriveSupplyState(state, adjacencyMap, report, corridorReport);
    const localProductionReport = deriveLocalProductionCapacity(state, report, graph.settlements);

    const stateOutPath = opts.outPath.replace(/reachability\.json$/i, 'state_h7.json');
    await writeFile(
      stateOutPath,
      JSON.stringify(
        {
          turn: report.turn,
          supply_state: supplyStateReport,
          corridors: corridorReport,
          local_production: localProductionReport
        },
        null,
        2
      ),
      'utf8'
    );
    process.stdout.write(`supply_state (H7.x): adequate/strained/critical per settlement; corridors open/brittle/cut\n`);
    for (const fac of supplyStateReport.factions) {
      process.stdout.write(
        `  ${fac.faction_id}: adequate=${fac.adequate_count}, strained=${fac.strained_count}, critical=${fac.critical_count}\n`
      );
    }
    const openCount = corridorReport.corridors.filter((c) => c.state === 'open').length;
    const brittleCount = corridorReport.corridors.filter((c) => c.state === 'brittle').length;
    const cutCount = corridorReport.corridors.filter((c) => c.state === 'cut').length;
    process.stdout.write(`corridors: open=${openCount}, brittle=${brittleCount}, cut=${cutCount}\n`);
    process.stdout.write(`  wrote: ${stateOutPath}\n`);
  }
}

// Only run the CLI when invoked directly (tests may import functions).
const isDirectRun = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isDirectRun) {
  main().catch((err) => {
    console.error('sim:supply failed', err);
    process.exitCode = 1;
  });
}
