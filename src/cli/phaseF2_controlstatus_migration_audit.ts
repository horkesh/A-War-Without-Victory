/**
 * Phase F2: Deterministic audit for ControlStatus migration.
 * 1) Asserts legacy adapter matches getSettlementControlStatus.side for 200 known-control settlements.
 * 2) Static sanity: fails if migrated modules contain ".political_controller" (raw read guard).
 * Exit non-zero on mismatch or forbidden token.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSettlementGraph } from '../map/settlements.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../state/game_state.js';
import { prepareNewGameState } from '../state/initialize_new_game_state.js';
import {
    getSettlementControlStatus,
    getSettlementSideLegacy
} from '../state/settlement_control.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');


const REPORT_PATH = resolve(
    ROOT,
    'data/derived/_debug/phaseF2_controlstatus_migration_audit_report.txt'
);

/** Migrated modules that must not contain raw ".political_controller" reads. */
const MIGRATED_MODULE_PATHS = [
    'src/state/territorial_valuation.ts',
    'src/state/treaty_acceptance.ts',
    'src/state/control_flip_proposals.ts',
    'src/state/supply_reachability.ts',
    'src/state/formation_fatigue.ts',
    'src/state/front_pressure.ts',
    'src/state/control_effective.ts',
    'src/state/displacement.ts',
    'src/map/front_edges.ts'
];

const SAMPLE_SIZE = 200;
const RAW_POLITICAL_CONTROLLER_READ = /\.political_controller(?!s)\b/;

function runStaticGuard(): { forbidden: boolean; filesChecked: string[]; forbiddenIn: string[] } {
    const forbiddenIn: string[] = [];
    for (const relPath of MIGRATED_MODULE_PATHS) {
        const absPath = resolve(ROOT, relPath);
        try {
            const text = readFileSync(absPath, 'utf8');
            if (RAW_POLITICAL_CONTROLLER_READ.test(text)) {
                forbiddenIn.push(relPath);
            }
        } catch {
            // File missing: treat as failure
            forbiddenIn.push(relPath + ' (read failed)');
        }
    }
    return {
        forbidden: forbiddenIn.length > 0,
        filesChecked: MIGRATED_MODULE_PATHS,
        forbiddenIn
    };
}

async function main(): Promise<void> {
    const graph = await loadSettlementGraph();
    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 0, seed: 'phaseF2-audit' },
  factions: [],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    army_co_decision_traces: {},
    army_corps_directives_by_faction: {},
    event_decision_log: [],
    fired_event_ids: [],
    event_readiness: {},
    event_fire_counts: {},
    event_last_fired_turn: {},
    event_flags: {},
    enabled_event_ids: [],
    phantoms_spawned: []
  },
  political: {
    war_consolidation_until: {},
    war_control_strain: {},
    war_supply_pressure: {},
    war_supply_condition: {},
    war_exhaustion: {},
    war_exhaustion_local: {}
  },
  displacement: {
    displacement_state: {},
    minority_flight_state: {},
    sustainability_state: {},
    war_displacement_initiated: {},
    hostile_takeover_timers: {},
    displacement_camp_state: {},
    displacement_event_log: [],
    displacement_humanitarian_aggregates: {},
    displacement_origin_dest_arrivals: {},
    displacement_recent_by_turn: {},
    settlement_displacement: {},
    settlement_displacement_started_turn: {},
    municipality_displacement: {},
    civilian_casualties: {}
  }
};

    await prepareNewGameState(state, graph);

    const settlementIds = Array.from(graph.settlements.keys()).sort((a, b) =>
        a.localeCompare(b)
    );

    const knownSettlementIds: string[] = [];
    for (const sid of settlementIds) {
        const status = getSettlementControlStatus(state, sid);
        if (status.kind === 'known') {
            knownSettlementIds.push(sid);
        }
    }

    const sample = knownSettlementIds.slice(0, SAMPLE_SIZE);
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
            `Phase F2 audit: ${mismatches.length} mismatch(es):\n${mismatches.join('\n')}\n`
        );
        process.exit(1);
    }

    const staticGuard = runStaticGuard();
    if (staticGuard.forbidden) {
        process.stderr.write(
            `Phase F2 audit: forbidden token ".political_controller" found in: ${staticGuard.forbiddenIn.join(', ')}\n`
        );
        process.exit(1);
    }

    const reportLines: string[] = [
        'Phase F2: ControlStatus migration audit',
        '',
        'SOURCE: prepareNewGameState (canonical init path)',
        '',
        'LEGACY_VS_STATUS: first ' + SAMPLE_SIZE + ' known-control settlements (by sid)',
        'getSettlementSideLegacy matches getSettlementControlStatus.side for all sampled.',
        'SAMPLED_COUNT: ' + sample.length,
        'KNOWN_CONTROL_TOTAL: ' + knownSettlementIds.length,
        '',
        'STATIC_GUARD: migrated modules must not contain ".political_controller"',
        'FILES_CHECKED:',
        ...staticGuard.filesChecked.map((p) => '  ' + p),
        'FORBIDDEN_TOKEN_FOUND: ' + staticGuard.forbidden,
        ''
    ];

    mkdirSync(resolve(ROOT, 'data/derived/_debug'), { recursive: true });
    writeFileSync(REPORT_PATH, reportLines.join('\n') + '\n', 'utf8');

    process.stdout.write(`Phase F2: Audit passed. Report: ${REPORT_PATH}\n`);
}

main().catch((err) => {
    process.stderr.write(String(err) + '\n');
    process.exit(1);
});
