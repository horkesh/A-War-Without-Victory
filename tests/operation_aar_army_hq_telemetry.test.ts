/**
 * Item 3 — Army HQ AAR telemetry sidecar (ENABLE_TG_ARMY_HQ_OPS).
 *
 * finalizeOperationAAR, with the flag on, attaches an `army_hq_telemetry` sidecar to the AAR
 * when the finalized op was carried by a TG belonging to an Army HQ op:
 *   - army_hq_op_id, anchor_corps_id
 *   - donor_corps_lineage (distinct donor parent corps, sorted)
 *   - cross_corps_donor_count (donor corps OTHER than the anchor corps)
 *   - total_cohesion_bled (sum of donor cohesion_bleed_applied)
 *
 * Two scopes:
 *   - FLAG-ON  (vi.mock overrides the const to true): sidecar populated.
 *   - FLAG-OFF (real const false): sidecar absent — byte-identity contract.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    CorpsOperation,
    FormationState,
    GameState,
    MilitaryState,
    TacticalGroup,
    TgDonorContribution,
} from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function brigade(id: string, corps_id: string): FormationState {
    return {
        id, faction: 'RBiH', name: id, created_turn: 0, status: 'active', assignment: null,
        kind: 'brigade', corps_id,
        location_osid: 'op:obj:x', personnel: 1500, cohesion: 80,
    } as FormationState;
}

function donor(brigade_id: string, source_corps_id: string, bled: number): TgDonorContribution {
    return {
        brigade_id,
        source_corps_id,
        distance_hops: 2,
        personnel_lent: 300,
        heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 },
        casualties_so_far: 0,
        equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 },
        cohesion_bleed_applied: bled,
    };
}

/** State with a finished sector_attack op carried by an Army-HQ TG (anchor corp_a; donors corp_a + corp_b). */
function fixture(turn = 30): { state: GameState; op: CorpsOperation } {
    const formations: Record<string, FormationState> = {
        anchor: brigade('anchor', 'corp_a'),
        d_same: brigade('d_same', 'corp_a'),
        d_cross: brigade('d_cross', 'corp_b'),
    };
    const tgId = 'tg:corp_a:KRIVAJA_95:anchor';
    const tg: TacticalGroup = {
        id: tgId,
        corps_id: 'corp_a',
        op_id: 'KRIVAJA_95', // matches op.name
        army_hq_op_id: 'ahq:RBiH:KRIVAJA_95',
        anchor_brigade_id: 'anchor',
        donor_contributions: [
            donor('d_cross', 'corp_b', 5),
            donor('d_same', 'corp_a', 3),
        ],
        location_osid: 'op:obj:x',
        status: 'recovering',
        formed_on_turn: turn - 5,
        cohesion: 60,
    };
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'aar-ahq-fixture', phase: 'war', player_faction: 'RBiH' } as any,
        political: { political_controllers: { 'op:obj:x': 'RBiH' } } as any,
        military: {
            formations,
            tactical_groups: { [tgId]: tg },
            army_hq_operations: {},
            army_hq_last_op_turn: {},
            army_hq_op_count_by_year: {},
            casualty_ledger: {} as any,
        } as Partial<MilitaryState> as MilitaryState,
        operation_history: [],
    } as unknown as GameState;

    const op: CorpsOperation = {
        name: 'KRIVAJA_95',
        type: 'sector_attack',
        phase: 'recovery',
        started_turn: turn - 5,
        phase_started_turn: turn - 1,
        participating_brigades: ['anchor', 'd_same', 'd_cross'],
        objectives: ['op:obj:x'],
        weekly_log: [],
    } as unknown as CorpsOperation;
    return { state, op };
}

afterEach(() => {
    vi.resetModules();
    vi.doUnmock('../src/sim/combat/tactical_group_config.js');
});

describe('Army HQ AAR telemetry (flag ON)', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
            const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
                '../src/sim/combat/tactical_group_config.js',
            );
            return { ...actual, ENABLE_TG_ARMY_HQ_OPS: true };
        });
    });

    it('populates army_hq_telemetry with donor lineage, cross-corps count, and total bled', async () => {
        const { finalizeOperationAAR } = await import('../src/sim/combat/operation_aar.js');
        const { state, op } = fixture();
        const aar = finalizeOperationAAR(state, 'corp_a', op);
        expect(aar.army_hq_telemetry).toBeDefined();
        const t = aar.army_hq_telemetry!;
        expect(t.army_hq_op_id).toBe('ahq:RBiH:KRIVAJA_95');
        expect(t.anchor_corps_id).toBe('corp_a');
        // donor_corps_lineage: distinct donor source corps, sorted.
        expect(t.donor_corps_lineage).toEqual(['corp_a', 'corp_b']);
        // cross_corps_donor_count: corps other than the anchor corps (corp_a) → just corp_b.
        expect(t.cross_corps_donor_count).toBe(1);
        // total_cohesion_bled: 5 (d_cross) + 3 (d_same) = 8.
        expect(t.total_cohesion_bled).toBe(8);
    });

    it('omits army_hq_telemetry for an op NOT carried by an Army-HQ TG', async () => {
        const { finalizeOperationAAR } = await import('../src/sim/combat/operation_aar.js');
        const { state, op } = fixture();
        // Strip the army_hq_op_id → TG exists but is a regular (non-Army-HQ) TG.
        delete state.military.tactical_groups!['tg:corp_a:KRIVAJA_95:anchor'].army_hq_op_id;
        const aar = finalizeOperationAAR(state, 'corp_a', op);
        expect(aar.army_hq_telemetry).toBeUndefined();
    });
});

describe('Army HQ AAR telemetry (flag OFF — byte-identity contract)', () => {
    it('never populates army_hq_telemetry even when an Army-HQ TG matches', async () => {
        const { finalizeOperationAAR } = await import('../src/sim/combat/operation_aar.js');
        const { state, op } = fixture();
        const aar = finalizeOperationAAR(state, 'corp_a', op);
        expect(aar.army_hq_telemetry).toBeUndefined();
    });
});
