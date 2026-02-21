/**
 * Phase F1: Deterministic audit proving legacy getSettlementSide matches
 * getSettlementControlStatus for known-control settlements.
 * Exit non-zero on errors or any mismatch.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSettlementGraph } from '../map/settlements.js';
import { CURRENT_SCHEMA_VERSION, GameState } from '../state/game_state.js';
import { prepareNewGameState } from '../state/initialize_new_game_state.js';
import {
    getSettlementControlStatus,
    getSettlementSideLegacy
} from '../state/settlement_control.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');


const REPORT_PATH = resolve(
    ROOT,
    'data/derived/_debug/phaseF1_unknown_control_behavior_audit_report.txt'
);

async function main(): Promise<void> {
    const graph = await loadSettlementGraph();
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'phaseF1-audit' },
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

    const settlementIds = Array.from(graph.settlements.keys()).sort((a, b) =>
        a.localeCompare(b)
    );
    const totalSettlements = settlementIds.length;

    const knownBySide: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0 };
    let unknownCount = 0;

    const knownSettlementIds: string[] = [];
    for (const sid of settlementIds) {
        const status = getSettlementControlStatus(state, sid);
        if (status.kind === 'unknown') {
            unknownCount += 1;
        } else {
            knownBySide[status.side] = (knownBySide[status.side] ?? 0) + 1;
            knownSettlementIds.push(sid);
        }
    }

    const sampleSize = 50;
    const sample = knownSettlementIds.slice(0, sampleSize);
    const mismatches: string[] = [];

    for (const sid of sample) {
        const legacySide = getSettlementSideLegacy(state, sid);
        const status = getSettlementControlStatus(state, sid);
        if (status.kind !== 'known') {
            mismatches.push(`${sid}: expected known, got unknown`);
            continue;
        }
        if (legacySide !== status.side) {
            mismatches.push(
                `${sid}: legacy=${legacySide ?? 'null'} vs status.side=${status.side}`
            );
        }
    }

    if (mismatches.length > 0) {
        process.stderr.write(
            `Phase F1 audit: ${mismatches.length} mismatch(es):\n${mismatches.join('\n')}\n`
        );
        process.exit(1);
    }

    const sampleLines = sample.map((sid) => {
        const status = getSettlementControlStatus(state, sid);
        const side = status.kind === 'known' ? status.side : 'unknown';
        return `  ${sid}: ${side}`;
    });

    const reportLines: string[] = [
        'Phase F1: Unknown control behavior audit (behavior unchanged)',
        '',
        'SOURCE: prepareNewGameState (canonical init path)',
        'SETTLEMENTS: data/derived/settlements_index_1990.json',
        '',
        'TOTAL_SETTLEMENTS: ' + totalSettlements,
        'KNOWN_BY_SIDE:',
        `  RBiH: ${knownBySide.RBiH ?? 0}`,
        `  RS: ${knownBySide.RS ?? 0}`,
        `  HRHB: ${knownBySide.HRHB ?? 0}`,
        'UNKNOWN_COUNT: ' + unknownCount,
        '',
        `SAMPLE_VERIFICATION: first ${sampleSize} known-control settlements (by sid)`,
        'getSettlementSideLegacy matches getSettlementControlStatus.side for all sampled.',
        '',
        'SAMPLE_SIDS:',
        ...sampleLines
    ];

    await mkdir(resolve(ROOT, 'data/derived/_debug'), { recursive: true });
    await writeFile(REPORT_PATH, reportLines.join('\n') + '\n', 'utf8');

    process.stdout.write(
        `Phase F1: Audit passed. Report: ${REPORT_PATH}\n`
    );
}

main().catch((err) => {
    process.stderr.write(String(err) + '\n');
    process.exit(1);
});
