/**
 * Phase F4: Deterministic unknown control attribution audit.
 * Explains WHY each unknown settlement exists (mun1990 exception vs error).
 * Exit non-zero if any error bucket count > 0.
 */

import { readFile } from 'node:fs/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_SCHEMA_VERSION, GameState } from '../state/game_state.js';
import { loadSettlementGraph } from '../map/settlements.js';
import { prepareNewGameState } from '../state/initialize_new_game_state.js';
import { getSettlementControlStatus } from '../state/settlement_control.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');


const INITIAL_CONTROLLERS_PATH = resolve(
  ROOT,
  'data/source/municipalities_1990_initial_political_controllers.json'
);
const REPORT_PATH = resolve(
  ROOT,
  'data/derived/_debug/phaseF4_unknown_control_attribution_report.txt'
);

type ReasonBucket =
  | 'mun1990_exception_null_controller'
  | 'missing_mun1990_controller_entry'
  | 'controller_field_missing';

interface UnknownEntry {
  sid: string;
  mun1990_id: string | undefined;
  reason: ReasonBucket;
}

async function loadInitialControllers(): Promise<Record<string, string | null>> {
  const content = await readFile(INITIAL_CONTROLLERS_PATH, 'utf8');
  const parsed = JSON.parse(content) as { controllers_by_mun1990_id?: Record<string, string | null> };
  if (!parsed.controllers_by_mun1990_id || typeof parsed.controllers_by_mun1990_id !== 'object') {
    throw new Error('Invalid municipalities_1990_initial_political_controllers.json: missing controllers_by_mun1990_id');
  }
  return parsed.controllers_by_mun1990_id;
}

async function main(): Promise<void> {
  const controllersByMun1990 = await loadInitialControllers();
  const graph = await loadSettlementGraph();
  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 'phaseF4-audit' },
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
  const unknownEntries: UnknownEntry[] = [];
  const byReason: Record<ReasonBucket, number> = {
    mun1990_exception_null_controller: 0,
    missing_mun1990_controller_entry: 0,
    controller_field_missing: 0
  };
  const byMun1990: Record<string, number> = {};

  for (const sid of settlementIds) {
    const status = getSettlementControlStatus(state, sid, 'only_when_missing_controller_field');
    if (status.kind !== 'unknown') continue;

    const settlement = graph.settlements.get(sid);
    const mun1990_id = settlement?.mun1990_id ?? undefined;
    const controllerValue = pc[sid];

    let reason: ReasonBucket;
    if (controllerValue === undefined) {
      reason = 'controller_field_missing';
    } else if (mun1990_id === undefined || mun1990_id === '') {
      reason = 'missing_mun1990_controller_entry';
    } else if (!(mun1990_id in controllersByMun1990)) {
      reason = 'missing_mun1990_controller_entry';
    } else if (controllersByMun1990[mun1990_id] === null) {
      reason = 'mun1990_exception_null_controller';
    } else {
      reason = 'missing_mun1990_controller_entry';
    }

    unknownEntries.push({ sid, mun1990_id, reason });
    byReason[reason] += 1;
    const key = mun1990_id ?? '(no mun1990_id)';
    byMun1990[key] = (byMun1990[key] ?? 0) + 1;
  }

  const totalUnknown = unknownEntries.length;
  const errorBucketTotal =
    byReason.controller_field_missing + byReason.missing_mun1990_controller_entry;

  const reportLines: string[] = [
    'Phase F4: Unknown control attribution audit',
    '',
    'SOURCE: prepareNewGameState (canonical init path)',
    'INITIAL_CONTROLLERS: data/source/municipalities_1990_initial_political_controllers.json',
    '',
    'total_unknown: ' + totalUnknown,
    '',
    'unknown_by_reason_bucket:',
    '  mun1990_exception_null_controller: ' + byReason.mun1990_exception_null_controller,
    '  missing_mun1990_controller_entry: ' + byReason.missing_mun1990_controller_entry,
    '  controller_field_missing: ' + byReason.controller_field_missing,
    '',
    'unknown_by_mun1990_id:'
  ];

  const sortedMun1990Keys = Object.keys(byMun1990).sort((a, b) => a.localeCompare(b));
  for (const key of sortedMun1990Keys) {
    reportLines.push('  ' + key + ': ' + byMun1990[key]);
  }
  reportLines.push('');

  reportLines.push('full_list (sid, mun1990_id, reason):');
  for (const { sid, mun1990_id, reason } of unknownEntries) {
    reportLines.push('  ' + sid + ' | ' + (mun1990_id ?? '(none)') + ' | ' + reason);
  }
  reportLines.push('');

  mkdirSync(resolve(ROOT, 'data/derived/_debug'), { recursive: true });
  writeFileSync(REPORT_PATH, reportLines.join('\n') + '\n', 'utf8');

  if (errorBucketTotal > 0) {
    process.stderr.write(
      `Phase F4 audit: error bucket count=${errorBucketTotal} (controller_field_missing=${byReason.controller_field_missing}, missing_mun1990_controller_entry=${byReason.missing_mun1990_controller_entry}). Must be 0.\n`
    );
    process.exit(1);
  }

  process.stdout.write(`Phase F4: Audit passed. Report: ${REPORT_PATH}\n`);
}

main().catch((err) => {
  process.stderr.write(String(err) + '\n');
  process.exit(1);
});
