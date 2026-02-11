/**
 * Phase F3: Deterministic audit of AoR fallback usage in canonical runs.
 * Proves that AoR fallback cannot change results when political_controller is initialized.
 * Exit non-zero if undefined_controller_count > 0 or diff_count_allow_vs_never > 0.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_SCHEMA_VERSION, GameState } from '../state/game_state.js';
import { loadSettlementGraph } from '../map/settlements.js';
import { prepareNewGameState } from '../state/initialize_new_game_state.js';
import { getSettlementControlStatus } from '../state/settlement_control.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');


const REPORT_PATH = resolve(
  ROOT,
  'data/derived/_debug/phaseF3_aor_fallback_usage_audit_report.txt'
);

async function main(): Promise<void> {
  const graph = await loadSettlementGraph();
  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 'phaseF3-audit' },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  };

  await prepareNewGameState(state, graph);

  const settlementIds = Array.from(graph.settlements.keys()).sort((a, b) => a.localeCompare(b));
  const pc = state.political_controllers ?? {};

  let undefinedControllerCount = 0;
  const diffSids: { sid: string; allow: unknown; never: unknown }[] = [];

  for (const sid of settlementIds) {
    if (pc[sid] === undefined) {
      undefinedControllerCount += 1;
    }
    const stAllow = getSettlementControlStatus(state, sid, 'allow');
    const stNever = getSettlementControlStatus(state, sid, 'never');
    const allowStr = JSON.stringify(stAllow);
    const neverStr = JSON.stringify(stNever);
    if (allowStr !== neverStr) {
      diffSids.push({ sid, allow: stAllow, never: stNever });
    }
  }

  const diffCount = diffSids.length;
  const first50 = diffSids.slice(0, 50);

  const reportLines: string[] = [
    'Phase F3: AoR fallback usage audit',
    '',
    'SOURCE: prepareNewGameState (canonical init path)',
    '',
    'undefined_controller_count: ' + undefinedControllerCount,
    'diff_count_allow_vs_never: ' + diffCount,
    ''
  ];

  if (diffCount > 0) {
    reportLines.push('First 50 sids with differing status under allow vs never:');
    for (const { sid, allow, never } of first50) {
      reportLines.push(`  ${sid}: allow=${JSON.stringify(allow)} never=${JSON.stringify(never)}`);
    }
    reportLines.push('');
  }

  mkdirSync(resolve(ROOT, 'data/derived/_debug'), { recursive: true });
  writeFileSync(REPORT_PATH, reportLines.join('\n') + '\n', 'utf8');

  if (undefinedControllerCount > 0) {
    process.stderr.write(
      `Phase F3 audit: undefined_controller_count=${undefinedControllerCount} (must be 0). Init invariant violated.\n`
    );
    process.exit(1);
  }
  if (diffCount > 0) {
    process.stderr.write(
      `Phase F3 audit: diff_count_allow_vs_never=${diffCount} (must be 0). AoR fallback would change canonical results.\n`
    );
    process.exit(1);
  }

  process.stdout.write(`Phase F3: Audit passed. Report: ${REPORT_PATH}\n`);
}

main().catch((err) => {
  process.stderr.write(String(err) + '\n');
  process.exit(1);
});
