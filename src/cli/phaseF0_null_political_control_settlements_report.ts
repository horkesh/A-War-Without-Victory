/**
 * Phase F0: Deterministic audit of null political control settlements.
 * Uses same canonical path as runtime (prepareNewGameState) to ensure political control init runs.
 * Produces: data/derived/_debug/phaseF0_null_political_control_settlements_report.txt
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSettlementGraph } from '../map/settlements.js';
import { CURRENT_SCHEMA_VERSION, GameState } from '../state/game_state.js';
import { prepareNewGameState } from '../state/initialize_new_game_state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const REPORT_PATH = resolve(ROOT, 'data/derived/_debug/phaseF0_null_political_control_settlements_report.txt');

async function main(): Promise<void> {
    const graph = await loadSettlementGraph();
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'phaseF0-audit' },
        factions: [],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {}
    };

    await prepareNewGameState(state, graph);

    const controllers = state.political_controllers;
    if (!controllers) {
        process.stderr.write('political_controllers not initialized\n');
        process.exit(1);
    }

    const settlementIds = Array.from(graph.settlements.keys()).sort((a, b) => a.localeCompare(b));
    const totalSettlements = settlementIds.length;

    const nullSettlements: Array<{ sid: string; mun1990_id: string }> = [];
    const nullByMun1990Id = new Map<string, number>();

    for (const sid of settlementIds) {
        const controller = controllers[sid];
        if (controller === null || controller === undefined) {
            const rec = graph.settlements.get(sid);
            const mun1990_id = rec?.mun1990_id ?? '(unknown)';
            nullSettlements.push({ sid, mun1990_id });
            nullByMun1990Id.set(mun1990_id, (nullByMun1990Id.get(mun1990_id) ?? 0) + 1);
        }
    }

    const totalNull = nullSettlements.length;

    const mun1990IdsSorted = [...nullByMun1990Id.keys()].sort((a, b) => a.localeCompare(b));
    const byMun1990Lines: string[] = [];
    for (const mid of mun1990IdsSorted) {
        const count = nullByMun1990Id.get(mid)!;
        byMun1990Lines.push(`  ${mid}: ${count}`);
    }

    const MAX_FULL_LIST = 200;
    const nullSidLines =
        totalNull <= MAX_FULL_LIST
            ? nullSettlements.map((s) => `  ${s.sid} (mun1990_id=${s.mun1990_id})`)
            : [
                ...nullSettlements.slice(0, MAX_FULL_LIST).map((s) => `  ${s.sid} (mun1990_id=${s.mun1990_id})`),
                `  ... and ${totalNull - MAX_FULL_LIST} more (total ${totalNull})`
            ];

    const reportLines: string[] = [
        'Phase F0: Null political control settlements audit',
        '',
        'SOURCE: prepareNewGameState (canonical init path)',
        'SETTLEMENTS: data/derived/settlements_index_1990.json',
        'CONTROLLERS: data/source/municipalities_1990_initial_political_controllers.json',
        '',
        'TOTAL_SETTLEMENTS: ' + totalSettlements,
        'TOTAL_NULL: ' + totalNull,
        '',
        'NULL_BY_MUN1990_ID:',
        ...byMun1990Lines,
        '',
        'NULL_SETTLEMENT_IDS:',
        ...nullSidLines
    ];

    await mkdir(resolve(ROOT, 'data/derived/_debug'), { recursive: true });
    await writeFile(REPORT_PATH, reportLines.join('\n') + '\n', 'utf8');

    process.stdout.write(
        `Phase F0: Report written. Total settlements: ${totalSettlements}, null: ${totalNull}. Report: ${REPORT_PATH}\n`
    );
}

main().catch((err) => {
    process.stderr.write(String(err) + '\n');
    process.exit(1);
});
