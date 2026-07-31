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
 * P2 #48 — REAL LIFECYCLE: beginRecovery (inside advanceSectorOffensives) dissolves the op's TG
 * immediately, but finalizeOperationAAR runs only after the recovery window elapses. So a LIVE-TG
 * lookup at finalize time finds nothing for real Army-HQ ops → the sidecar was silently omitted.
 * The fix snapshots the telemetry onto the op record AT dissolution. These tests drive the real
 * recovery path (TG actually dissolved) before finalizing, so they exercise the snapshot — not a
 * pre-injected live-TG artifact.
 *
 * Two scopes:
 *   - FLAG-ON  (vi.mock overrides the const to true): sidecar populated FROM THE SNAPSHOT.
 *   - FLAG-OFF (real const false): sidecar absent — byte-identity contract.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    CorpsCommandState,
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

/**
 * State with a live sector_attack op carried by an Army-HQ TG (anchor corp_a; donors corp_a +
 * corp_b). The op sits in `corps_command.active_operations` in EXECUTION phase and points at a
 * sector that does not exist in corps_front_sectors — so the first advanceSectorOffensives tick
 * sends it to recovery (orphaned_sector), which dissolves the TG. The corps brigade `corp_a`
 * provides the faction lookup advanceSectorOffensives needs.
 */
function fixture(turn = 30): { state: GameState; op: CorpsOperation } {
    const formations: Record<string, FormationState> = {
        corp_a: { ...brigade('corp_a', 'corp_a'), kind: 'corps' } as FormationState,
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
        status: 'engaged',
        formed_on_turn: turn - 5,
        cohesion: 60,
    };

    const op: CorpsOperation = {
        name: 'KRIVAJA_95',
        army_hq_op_id: 'ahq:RBiH:KRIVAJA_95',
        type: 'sector_attack',
        phase: 'execution',
        started_turn: turn - 5,
        phase_started_turn: turn - 1,
        sector_id: 'sector:does_not_exist', // missing sector → orphaned recovery on next tick
        participating_brigades: ['anchor', 'd_same', 'd_cross'],
        objectives: ['op:obj:x'],
        weekly_log: [],
    } as unknown as CorpsOperation;

    const corpsCommand: Record<string, CorpsCommandState> = {
        corp_a: {
            command_span: 3,
            subordinate_count: 3,
            og_slots: 1,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'offensive' as any,
            active_operations: [op],
        },
    };

    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'aar-ahq-fixture', phase: 'war', player_faction: 'RBiH' } as any,
        political: { political_controllers: { 'op:obj:x': 'RBiH' } } as any,
        military: {
            formations,
            tactical_groups: { [tgId]: tg },
            corps_command: corpsCommand,
            corps_front_sectors: {}, // sector:does_not_exist absent → orphaned
            army_hq_operations: {},
            army_hq_last_op_turn: {},
            army_hq_op_count_by_year: {},
            casualty_ledger: {} as any,
        } as Partial<MilitaryState> as MilitaryState,
        operation_history: [],
    } as unknown as GameState;

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
            return { ...actual, ENABLE_TG_FORMATION: true, ENABLE_TG_ARMY_HQ_OPS: true };
        });
    });

    it('snapshots telemetry at TG dissolution and finalize emits it AFTER the live TG is gone', async () => {
        const { advanceSectorOffensives } = await import('../src/sim/combat/sector_offensive.js');
        const { finalizeOperationAAR } = await import('../src/sim/combat/operation_aar.js');
        const { state, op } = fixture();

        // 1. Drive the real recovery path. The op's sector is missing → beginRecovery fires,
        //    which dissolves the op's TG (the timing bug source).
        advanceSectorOffensives(state);

        // 2. Prove the live TG is GONE — a live lookup at finalize would now find nothing.
        expect(state.military.tactical_groups?.['tg:corp_a:KRIVAJA_95:anchor']).toBeUndefined();
        // ...but the snapshot was captured onto the op record at dissolution time.
        expect(op.army_hq_telemetry_snapshot).toBeDefined();

        // 3. Finalize turns later (no live TG). The sidecar must survive via the snapshot.
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

    it('still emits telemetry from a LIVE TG when finalize runs synchronously (no recovery yet)', async () => {
        // Belt-and-suspenders: the live-TG path must remain intact for any synchronous finalize.
        const { finalizeOperationAAR } = await import('../src/sim/combat/operation_aar.js');
        const { state, op } = fixture();
        const aar = finalizeOperationAAR(state, 'corp_a', op);
        expect(aar.army_hq_telemetry).toBeDefined();
        expect(aar.army_hq_telemetry!.total_cohesion_bled).toBe(8);
    });

    it('omits army_hq_telemetry for an op NOT carried by an Army-HQ TG (even after dissolution)', async () => {
        const { advanceSectorOffensives } = await import('../src/sim/combat/sector_offensive.js');
        const { finalizeOperationAAR } = await import('../src/sim/combat/operation_aar.js');
        const { state, op } = fixture();
        // Strip both identities so the composite-linked pair is a regular TG.
        delete state.military.tactical_groups!['tg:corp_a:KRIVAJA_95:anchor'].army_hq_op_id;
        delete op.army_hq_op_id;
        advanceSectorOffensives(state); // dissolves the (non-Army-HQ) TG; nothing to snapshot
        expect(op.army_hq_telemetry_snapshot).toBeUndefined();
        const aar = finalizeOperationAAR(state, 'corp_a', op);
        expect(aar.army_hq_telemetry).toBeUndefined();
    });
});

describe('Army HQ AAR telemetry (flag OFF — byte-identity contract)', () => {
    beforeEach(() => {
        vi.resetModules();
        // Flags now default-ON (TG activation, commit 0b681ffe). This block verifies the
        // flag-OFF byte-identity contract, so it must explicitly force the flag false.
        vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
            const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
                '../src/sim/combat/tactical_group_config.js',
            );
            return { ...actual, ENABLE_TG_ARMY_HQ_OPS: false };
        });
    });

    it('never populates army_hq_telemetry even when an Army-HQ TG matches', async () => {
        const { finalizeOperationAAR } = await import('../src/sim/combat/operation_aar.js');
        const { state, op } = fixture();
        const aar = finalizeOperationAAR(state, 'corp_a', op);
        expect(aar.army_hq_telemetry).toBeUndefined();
    });

    it('never snapshots telemetry at dissolution when the flag is off', async () => {
        const { advanceSectorOffensives } = await import('../src/sim/combat/sector_offensive.js');
        const { state, op } = fixture();
        advanceSectorOffensives(state);
        expect(op.army_hq_telemetry_snapshot).toBeUndefined();
    });
});
