/**
 * Forced-Operation Receipt read-model test suite.
 *
 * Proves the force-op AFTER-loop projection of `buildForcedOpReceipts`:
 *   - A force_launched AAR yields a receipt with the right fields + the
 *     commander_assessment_at_launch snapshot.
 *   - A normal (non-force) AAR yields no receipt.
 *   - `forcedOpReceiptsRealizedOnTurn` filters by ended_turn.
 *
 * Also covers determinism (ended_turn then id) and defensive empties.
 */

import { describe, it, expect } from 'vitest';
import {
    buildForcedOpReceipts,
    forcedOpReceiptsRealizedOnTurn,
} from '../../src/ui/map/data/forcedOpReceipts.js';
import type { OperationAAR } from '../../src/sim/combat/operation_aar.js';
import type { GameState } from '../../src/state/game_state.js';

/** Build a minimal OperationAAR; `force` toggles the player force-launch tags. */
function buildAAR(
    id: string,
    opts: {
        force?: boolean;
        endedTurn?: number;
        outcome?: OperationAAR['outcome'];
        stars?: 1 | 2 | 3 | 4 | 5;
        suffered?: { killed: number; wounded: number };
        inflicted?: { killed: number; wounded: number };
        objectives?: string[];
        commanderName?: string;
        assessment?: 'launch' | 'postpone' | 'abort';
        faction?: string;
    } = {},
): OperationAAR {
    const aar = {
        operation_id: id,
        operation_name: opts.force ? `Operation ${id}` : `Routine ${id}`,
        corps_id: '1_corps',
        faction: opts.faction ?? 'RBiH',
        type: 'sector_attack',
        started_turn: (opts.endedTurn ?? 10) - 3,
        ended_turn: opts.endedTurn ?? 10,
        outcome: opts.outcome ?? 'failure',
        objectives_targeted: ['osid_a', 'osid_b'],
        objectives_captured: opts.objectives ?? [],
        duration_turns: 3,
        total_attacks: 5,
        casualties_suffered: opts.suffered ?? { killed: 40, wounded: 60 },
        casualties_inflicted: opts.inflicted ?? { killed: 10, wounded: 15 },
        equipment_lost: { tanks: 0, artillery: 0 },
        equipment_destroyed: { tanks: 0, artillery: 0 },
        equipment_captured: { tanks: 0, artillery: 0 },
        participating_brigades: ['1bde'],
        initial_strength: 3000,
        final_strength: 2900,
        grade: { stars: opts.stars ?? 1, verdict: 'x', factors: { objective_completion: 0, exchange_ratio: 0, tempo: 0, preservation: 0 } },
        weekly_log: [],
        commander_name: opts.commanderName ?? 'Gen. Halilović',
    } as OperationAAR;
    if (opts.force) {
        aar.force_launched = true;
        aar.ca_cost_at_launch = 15;
        aar.commander_assessment_at_launch = opts.assessment ?? 'abort';
    }
    return aar;
}

function buildState(aars: OperationAAR[], playerFaction?: string): GameState {
    return {
        ...(playerFaction ? { meta: { player_faction: playerFaction } } : {}),
        operation_history: aars,
    } as unknown as GameState;
}

describe('buildForcedOpReceipts', () => {
    it('returns [] defensively when state or AAR list is absent/empty', () => {
        expect(buildForcedOpReceipts(undefined)).toEqual([]);
        expect(buildForcedOpReceipts(null)).toEqual([]);
        expect(buildForcedOpReceipts(buildState([]))).toEqual([]);
        expect(buildForcedOpReceipts({} as unknown as GameState)).toEqual([]);
    });

    it('maps a force_launched AAR to a receipt with the right fields + assessment', () => {
        const state = buildState([
            buildAAR('drina_relief', {
                force: true,
                endedTurn: 17,
                outcome: 'failure',
                stars: 1,
                suffered: { killed: 120, wounded: 80 },
                inflicted: { killed: 30, wounded: 20 },
                objectives: ['osid_a'],
                commanderName: 'Gen. Halilović',
                assessment: 'abort',
            }),
        ]);
        const receipts = buildForcedOpReceipts(state);
        expect(receipts).toHaveLength(1);
        const r = receipts[0];
        expect(r.id).toBe('drina_relief');
        expect(r.opName).toBe('Operation Drina Relief');
        expect(r.corpsId).toBe('1_corps');
        expect(r.commanderName).toBe('Gen. Halilović');
        expect(r.assessmentAtLaunch).toBe('abort');
        expect(r.outcome).toBe('failure');
        expect(r.grade).toBe(1);
        expect(r.casualtiesSuffered).toBe(200);
        expect(r.casualtiesInflicted).toBe(50);
        expect(r.objectivesHeldAtClose).toBe(1);
        expect(r.endedTurn).toBe(17);
    });

    it('renders player-safe operation names instead of generated force-launch identifiers', () => {
        const aar = buildAAR('raw_force', { force: true, endedTurn: 19 });
        aar.operation_name = 'cmd_vrs_drinacorps_t45';
        aar.corps_id = 'vrs_drinacorps';

        const receipts = buildForcedOpReceipts(buildState([aar]));

        expect(receipts).toHaveLength(1);
        expect(receipts[0].opName).toBe('Command — Drina Corps');
        expect(receipts[0].opName).not.toMatch(/cmd_|_t45|operation_name/i);
    });

    it('yields NO receipt for a normal (non-force) AAR', () => {
        const state = buildState([buildAAR('routine_push', { force: false })]);
        expect(buildForcedOpReceipts(state)).toEqual([]);
    });

    it('yields NO receipt for a foreign force-launched AAR when player faction is known', () => {
        const state = buildState([
            buildAAR('foreign_force', { force: true, faction: 'RBiH' }),
        ], 'RS');

        expect(buildForcedOpReceipts(state)).toEqual([]);
    });

    it('does not treat missing AAR ownership as belonging to the loaded player', () => {
        const aar = buildAAR('orphan_force', { force: true });
        delete (aar as { faction?: string }).faction;

        expect(buildForcedOpReceipts(buildState([aar], 'RBiH'))).toEqual([]);
    });

    it('falls back to a generic commander label when commander_name is absent', () => {
        const aar = buildAAR('no_name', { force: true });
        delete (aar as { commander_name?: string }).commander_name;
        const receipts = buildForcedOpReceipts(buildState([aar]));
        expect(receipts).toHaveLength(1);
        expect(receipts[0].commanderName).toBe('the corps commander');
    });

    it('sorts deterministically by ended_turn ascending then id', () => {
        const state = buildState([
            buildAAR('z_op', { force: true, endedTurn: 20 }),
            buildAAR('a_op', { force: true, endedTurn: 12 }),
            buildAAR('m_op', { force: true, endedTurn: 12 }),
        ]);
        const receipts = buildForcedOpReceipts(state);
        expect(receipts.map((r) => r.id)).toEqual(['a_op', 'm_op', 'z_op']);
    });

    it('forcedOpReceiptsRealizedOnTurn filters to receipts resolving on the given turn', () => {
        const state = buildState([
            buildAAR('op_a', { force: true, endedTurn: 5 }),
            buildAAR('op_b', { force: true, endedTurn: 8 }),
        ]);
        const receipts = buildForcedOpReceipts(state);
        expect(forcedOpReceiptsRealizedOnTurn(receipts, 5).map((r) => r.id)).toEqual(['op_a']);
        expect(forcedOpReceiptsRealizedOnTurn(receipts, 8).map((r) => r.id)).toEqual(['op_b']);
        expect(forcedOpReceiptsRealizedOnTurn(receipts, 99)).toEqual([]);
    });
});
