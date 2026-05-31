/**
 * v2.3 8-turn cohesion-recovery LOCK (ENABLE_TG_RECOVERY_SUPPRESSION).
 *
 * Item 1 of the TG recovery-lock hardening lane (ADR-0005 §Pyrrhic cost "locked 8 turns"):
 *   - formTacticalGroup, with the flag on, sets each donor's
 *     tg_recovery_suppressed_until_turn = formed_on_turn + TG_RECOVERY_SUPPRESSION_TURNS (=8).
 *   - runCohesionDrift zeroes those donors' POSITIVE ambient drift while the lock is active
 *     (turn < suppressed_until_turn), never clamping below the faction floor.
 *
 * Two scopes:
 *   - FLAG-ON  (vi.mock overrides the compile-time const to true): both effects fire.
 *   - FLAG-OFF (real module, const false): neither effect fires — byte-identity contract.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormationState, GameState, MilitaryState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { TgDonorContribution } from '../src/state/game_state.js';

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, faction: 'RBiH', name: id, created_turn: 0, status: 'active', assignment: null,
        kind: 'brigade',
        corps_id: 'corp_a',
        location_osid: 'op:test:test',
        personnel: 1500,
        cohesion: 80,
        ...overrides,
    } as FormationState;
}

function stateWith(brigades: FormationState[], turn = 5): GameState {
    const formations: Record<string, FormationState> = {};
    for (const b of brigades) formations[b.id] = b;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'tg-recovery-suppression-fixture', phase: 'war', player_faction: 'RBiH' } as any,
        factions: [{ id: 'RBiH' }] as any,
        political: {} as any,
        military: {
            formations,
            tactical_groups: {},
            army_hq_operations: {},
            army_hq_last_op_turn: {},
            army_hq_op_count_by_year: {},
        } as Partial<MilitaryState> as MilitaryState,
    } as GameState;
}

function donor(brigade_id: string): TgDonorContribution {
    return {
        brigade_id,
        source_corps_id: 'corp_a',
        distance_hops: 1,
        personnel_lent: 300,
        heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 },
        casualties_so_far: 0,
        equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 },
        cohesion_bleed_applied: 0,
    };
}

afterEach(() => {
    vi.resetModules();
    vi.doUnmock('../src/sim/combat/tactical_group_config.js');
});

describe('ENABLE_TG_RECOVERY_SUPPRESSION (flag ON)', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
            const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
                '../src/sim/combat/tactical_group_config.js',
            );
            return { ...actual, ENABLE_TG_RECOVERY_SUPPRESSION: true };
        });
    });

    it('formTacticalGroup sets donor tg_recovery_suppressed_until_turn = turn + 8', async () => {
        const { formTacticalGroup } = await import('../src/sim/combat/tactical_group_lifecycle.js');
        const turn = 5;
        const state = stateWith([brigade('anchor'), brigade('d1'), brigade('d2')], turn);
        const res = formTacticalGroup(state, {
            op_id: 'op_lock',
            anchor_brigade_id: 'anchor',
            donors: [donor('d1'), donor('d2')],
            current_turn: turn,
        });
        expect(res.tg_id).not.toBeNull();
        expect(state.military.formations.d1.tg_recovery_suppressed_until_turn).toBe(turn + 8);
        expect(state.military.formations.d2.tg_recovery_suppressed_until_turn).toBe(turn + 8);
        // Anchor is not a donor — never locked.
        expect(state.military.formations.anchor.tg_recovery_suppressed_until_turn).toBeUndefined();
    });

    it('runCohesionDrift zeroes positive drift for a locked donor', async () => {
        const { formTacticalGroup } = await import('../src/sim/combat/tactical_group_lifecycle.js');
        const { runCohesionDrift } = await import('../src/sim/combat/cohesion_drift.js');
        const turn = 5;
        // RBiH at turn 5 has positive ambient drift (+0.4) — so a NON-locked control brigade rises.
        const state = stateWith([brigade('anchor'), brigade('d1'), brigade('control')], turn);
        formTacticalGroup(state, {
            op_id: 'op_lock',
            anchor_brigade_id: 'anchor',
            donors: [donor('d1')],
            current_turn: turn,
        });
        const d1Before = state.military.formations.d1.cohesion;
        const controlBefore = state.military.formations.control.cohesion;
        runCohesionDrift(state, new Set<string>());
        // Locked donor: positive drift zeroed → cohesion unchanged.
        expect(state.military.formations.d1.cohesion).toBe(d1Before);
        // Control brigade: positive drift applied → cohesion rose.
        expect(state.military.formations.control.cohesion!).toBeGreaterThan(controlBefore!);
    });
});

describe('ENABLE_TG_RECOVERY_SUPPRESSION (flag OFF — byte-identity contract)', () => {
    beforeEach(() => {
        vi.resetModules();
        // Flags now default-ON (TG activation, commit 0b681ffe). This block verifies the
        // flag-OFF byte-identity contract, so it must explicitly force the flag false.
        vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
            const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
                '../src/sim/combat/tactical_group_config.js',
            );
            // cohesion_drift fires its suppression branch under EITHER ENABLE_TG_ARMY_HQ_OPS
            // OR ENABLE_TG_RECOVERY_SUPPRESSION, so the flag-OFF contract requires both off.
            return { ...actual, ENABLE_TG_RECOVERY_SUPPRESSION: false, ENABLE_TG_ARMY_HQ_OPS: false };
        });
    });

    it('formTacticalGroup never writes tg_recovery_suppressed_until_turn', async () => {
        const { formTacticalGroup } = await import('../src/sim/combat/tactical_group_lifecycle.js');
        const turn = 5;
        const state = stateWith([brigade('anchor'), brigade('d1')], turn);
        formTacticalGroup(state, {
            op_id: 'op_lock',
            anchor_brigade_id: 'anchor',
            donors: [donor('d1')],
            current_turn: turn,
        });
        expect(state.military.formations.d1.tg_recovery_suppressed_until_turn).toBeUndefined();
    });

    it('runCohesionDrift applies normal positive drift even with the field pre-set', async () => {
        const { runCohesionDrift } = await import('../src/sim/combat/cohesion_drift.js');
        const turn = 5;
        // Pre-set the suppression field directly; flag-off the consumer branch must ignore it.
        const state = stateWith([
            brigade('d1', { tg_recovery_suppressed_until_turn: turn + 8 }),
        ], turn);
        const before = state.military.formations.d1.cohesion;
        runCohesionDrift(state, new Set<string>());
        expect(state.military.formations.d1.cohesion!).toBeGreaterThan(before!);
    });
});
