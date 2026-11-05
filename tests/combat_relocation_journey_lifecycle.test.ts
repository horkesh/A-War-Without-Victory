import { describe, expect, it } from 'vitest';

import type {
    BrigadeMovementOrder,
    FactionId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import type { TerrainScalarsData } from '../src/map/terrain_scalars.js';
import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import {
    applyDefeatPenalties,
    forceRetreatWithPenalties,
    relocateFormationAfterCombat,
} from '../src/sim/combat/attack_retreat_displacement.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import { invalidateBrigadeJourney } from '../src/sim/combat/brigade_journey_lifecycle.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';

const A = 'op:test:attacker_staging';
const T = 'op:donji_vakuf:babin_potok_2';
const K = 'op:donji_vakuf:kutanja';
const REAR = 'op:donji_vakuf:pribraca_2';
const OBORCI = 'op:donji_vakuf:oborci_2';
const B = 'op:test:friendly_rear';

const flatTerrain: TerrainScalarsData = {
    by_sid: Object.fromEntries([A, T, K, REAR, OBORCI, B].map((osid) => [osid, {
        road_access_index: 0.5,
        river_crossing_penalty: 0,
        elevation_mean_m: 200,
        elevation_stddev_m: 10,
        slope_index: 0.1,
        terrain_friction_index: 0.1,
    }])),
};

const reverseMap: OperationalToCanonicalReverseMap = new Map(
    [A, T, K, REAR, OBORCI, B].map((osid) => [osid, [osid]]),
);

function makeEdges(): EdgeRecord[] {
    return [
        { a: A, b: T },
        { a: T, b: K },
        { a: K, b: REAR },
        { a: A, b: B },
    ] as EdgeRecord[];
}

function makeAdjacency(): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();
    for (const edge of makeEdges()) {
        adjacency.set(edge.a, [...(adjacency.get(edge.a) ?? []), edge.b]);
        adjacency.set(edge.b, [...(adjacency.get(edge.b) ?? []), edge.a]);
    }
    adjacency.set(OBORCI, []);
    return adjacency;
}

function makeFormation(
    id: string,
    faction: FactionId,
    locationOsid: string,
    personnel: number,
    overrides: Partial<FormationState> = {},
): FormationState {
    return {
        id,
        name: id,
        faction,
        kind: 'brigade',
        status: 'active',
        location_osid: locationOsid,
        personnel,
        cohesion: 90,
        morale: 90,
        experience: 0.8,
        posture: faction === 'RBiH' ? 'attack' : 'defend',
        composition: {
            infantry: Math.max(1, personnel),
            tanks: 0,
            artillery: 0,
            aa_systems: 0,
            tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
        },
        ...overrides,
    } as FormationState;
}

function makeState(formations: FormationState[], orders: Record<string, BrigadeMovementOrder>): GameState {
    return {
        meta: {
            turn: 181,
            phase: 'war',
            scenario_start_date: { year: 1995, month: 9, day: 4 },
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }],
        military: {
            formations: Object.fromEntries(formations.map((formation) => [formation.id, formation])),
            brigade_attack_orders: { [formations[0]!.id]: T },
            brigade_movement_orders: orders,
            casualty_ledger: initializeCasualtyLedger(['RBiH', 'RS']),
        },
        political: {
            political_controllers: {
                [A]: 'RBiH',
                [T]: 'RS',
                [K]: 'RS',
                [REAR]: 'RS',
                [OBORCI]: 'RS',
                [B]: 'RS',
            },
            control_events: [],
        },
        displacement: {},
    } as unknown as GameState;
}

function staleTransit(origin: string, destination: string, turnsRemaining = 1): NonNullable<GameState['military']['brigade_movement_state']>[string] {
    return {
        status: 'in_transit',
        stance: 'column',
        destination_sids: [destination],
        path: [origin, destination],
        turns_remaining: turnsRemaining,
        owner: 'bot_discretionary',
    };
}

function makeFlipScenario() {
    const attacker = makeFormation('atk_main', 'RBiH', A, 6000, {
        composition: {
            infantry: 4000,
            tanks: 40,
            artillery: 60,
            aa_systems: 20,
            tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
        },
    });
    const leadDefender = makeFormation('rs_lead', 'RS', T, 700);
    const staleDefender = makeFormation('rs_nonlead_stale', 'RS', T, 450);
    const manualColumn: BrigadeMovementOrder = { destination_sids: [REAR], stance: 'column' };
    const manualCombat: BrigadeMovementOrder = { destination_sids: [REAR], stance: 'combat' };
    const state = makeState(
        [attacker, leadDefender, staleDefender],
        {
            rs_nonlead_stale: manualColumn,
            rs_lead: manualCombat,
        },
    );
    state.military.brigade_movement_state = {
        rs_nonlead_stale: staleTransit(T, OBORCI),
    };
    return { state, manualColumn, manualCombat };
}

describe('T4 relocation invalidates only the journey it interrupts', () => {
    it('shared invalidator removes only the named journey and preserves independent state', () => {
        const moving = makeFormation('rs_target', 'RS', A, 800, { morale: 66, entrenchment_turns: 4 });
        const other = makeFormation('rs_keep', 'RS', B, 800);
        const order: BrigadeMovementOrder = { destination_sids: [REAR], stance: 'column' };
        const state = makeState([moving, other], { rs_target: order });
        state.military.brigade_movement_state = {
            rs_target: staleTransit(A, B, 3),
            rs_keep: staleTransit(B, REAR, 2),
        };

        invalidateBrigadeJourney(state, 'rs_target' as any);

        expect(state.military.brigade_movement_state?.rs_target).toBeUndefined();
        expect(state.military.brigade_movement_state?.rs_keep).toEqual(staleTransit(B, REAR, 2));
        expect(state.military.brigade_movement_orders?.rs_target).toEqual(order);
        expect(moving.location_osid).toBe(A);
        expect(moving.personnel).toBe(800);
        expect(moving.morale).toBe(66);
        expect(moving.entrenchment_turns).toBe(4);
    });

    it('shared invalidator uses consistent empty-map cleanup', () => {
        const moving = makeFormation('rs_only', 'RS', A, 800);
        const state = makeState([moving], {});
        state.military.brigade_movement_state = { rs_only: staleTransit(A, B, 2) };

        invalidateBrigadeJourney(state, 'rs_only' as any);

        expect(state.military.brigade_movement_state).toBeUndefined();
    });

    it('clears a non-lead defender transit at the flip before the next T3 and revalidates preserved orders', () => {
        const { state, manualColumn, manualCombat } = makeFlipScenario();
        const edges = makeEdges();
        const adjacency = makeAdjacency();

        const report = resolveAttackOrdersOsid(
            state,
            edges,
            reverseMap,
            flatTerrain,
            null,
            null,
            null,
            adjacency,
        );

        expect(report.flips_applied).toBe(1);
        expect(state.political.political_controllers?.[T]).toBe('RBiH');
        expect(state.military.formations?.rs_nonlead_stale?.location_osid).toBe(K);
        expect(state.military.brigade_movement_state?.rs_nonlead_stale).toBeUndefined();
        expect(state.military.brigade_movement_orders?.rs_nonlead_stale).toEqual(manualColumn);
        expect(state.military.brigade_movement_orders?.rs_lead).toEqual(manualCombat);

        const roundTripped = deserializeState(serializeState(state));
        expect(roundTripped.military.formations?.rs_nonlead_stale?.location_osid).toBe(K);
        expect(roundTripped.military.brigade_movement_state?.rs_nonlead_stale).toBeUndefined();
        expect(roundTripped.military.brigade_movement_orders?.rs_nonlead_stale).toEqual(manualColumn);
        expect(roundTripped.military.brigade_movement_orders?.rs_lead).toEqual(manualCombat);

        const next = processOsidColumnMovement(
            roundTripped,
            edges,
            reverseMap,
            flatTerrain,
            adjacency,
        );
        expect(next.column_starts).toBe(1);
        expect(roundTripped.military.brigade_movement_state?.rs_nonlead_stale?.path?.[0]).toBe(K);
        expect(roundTripped.military.brigade_movement_state?.rs_nonlead_stale?.destination_sids).toEqual([REAR]);
        expect(roundTripped.military.brigade_movement_orders?.rs_lead).toEqual(manualCombat);
    });

    it('clears stale transit when force-retreat moves a formation', () => {
        const formation = makeFormation('rs_force', 'RS', A, 800);
        const state = makeState([formation], {});
        state.military.brigade_movement_state = {
            rs_force: staleTransit(A, B),
        };
        const adjacency = new Map([[A, [B]], [B, [A]]]);

        forceRetreatWithPenalties(state, formation, reverseMap, A, {
            adjacency,
            friendlyOsids: new Set([B]),
        });

        expect(formation.location_osid).toBe(B);
        expect(state.military.brigade_movement_state?.rs_force).toBeUndefined();
    });

    it('clears stale transit on the terminal force-retreat branch', () => {
        const formation = makeFormation('rs_force_terminal', 'RS', A, 800);
        const state = makeState([formation], {});
        state.military.brigade_movement_state = {
            rs_force_terminal: staleTransit(A, B),
        };

        forceRetreatWithPenalties(state, formation, reverseMap, A, {
            adjacency: new Map([[A, []]]),
            friendlyOsids: new Set(),
        });

        expect(formation.location_osid).toBeUndefined();
        expect(formation.status).toBe('inactive');
        expect(state.military.brigade_movement_state?.rs_force_terminal).toBeUndefined();
    });

    it('does not clear transit for a sector-coverage defeat penalty with no physical relocation', () => {
        const covered = makeFormation('rs_cover', 'RS', K, 800);
        const state = makeState([covered], {});
        state.military.brigade_movement_state = {
            rs_cover: staleTransit(K, REAR, 2),
        };

        applyDefeatPenalties(covered, T, 181, 'decisive_victory');

        expect(covered.location_osid).toBe(K);
        expect(state.military.brigade_movement_state?.rs_cover).toEqual(staleTransit(K, REAR, 2));
    });

    it('same-location relocation is a true no-op for the journey and unrelated state', () => {
        const moving = makeFormation('rs_same', 'RS', K, 800, {
            entrenchment_turns: 5,
            assigned_sub_segment_id: 'subseg:test:0',
            morale: 77,
        });
        const other = makeFormation('rs_other', 'RS', REAR, 800);
        const order: BrigadeMovementOrder = { destination_sids: [REAR], stance: 'column' };
        const state = makeState([moving, other], { rs_same: order });
        state.military.brigade_movement_state = {
            rs_same: staleTransit(K, REAR, 2),
            rs_other: staleTransit(REAR, B, 3),
        };

        relocateFormationAfterCombat(state, moving, K);

        expect(moving.location_osid).toBe(K);
        expect(state.military.brigade_movement_state?.rs_same).toEqual(staleTransit(K, REAR, 2));
        expect(state.military.brigade_movement_state?.rs_other).toEqual(staleTransit(REAR, B, 3));
        expect(state.military.brigade_movement_orders?.rs_same).toEqual(order);
        expect(moving.entrenchment_turns).toBe(5);
        expect(moving.assigned_sub_segment_id).toBe('subseg:test:0');
        expect(moving.morale).toBe(77);
    });

    it('A to B to A invalidates on the first physical change and never restores transit', () => {
        const moving = makeFormation('rs_back_forth', 'RS', A, 800);
        const other = makeFormation('rs_unrelated', 'RS', REAR, 800);
        const state = makeState([moving, other], {});
        state.military.brigade_movement_state = {
            rs_back_forth: staleTransit(A, B, 2),
            rs_unrelated: staleTransit(REAR, B, 2),
        };

        relocateFormationAfterCombat(state, moving, B);
        expect(moving.location_osid).toBe(B);
        expect(state.military.brigade_movement_state?.rs_back_forth).toBeUndefined();
        expect(state.military.brigade_movement_state?.rs_unrelated).toEqual(staleTransit(REAR, B, 2));

        relocateFormationAfterCombat(state, moving, A);
        expect(moving.location_osid).toBe(A);
        expect(state.military.brigade_movement_state?.rs_back_forth).toBeUndefined();
    });

    it('clears both lead and coordinated-support advances on a flip', () => {
        const lead = makeFormation('atk_a', 'RBiH', A, 5000, { corps_id: 'rbih_corps' as any });
        const support = makeFormation('atk_b', 'RBiH', A, 5000, { corps_id: 'rbih_corps' as any });
        const defender = makeFormation('rs_def', 'RS', T, 300);
        const state = makeState([lead, support, defender], {
            atk_a: { destination_sids: [REAR], stance: 'column' },
            atk_b: { destination_sids: [REAR], stance: 'combat' },
        });
        state.military.brigade_attack_orders = { atk_a: T, atk_b: T } as any;
        state.military.brigade_movement_state = {
            atk_a: staleTransit(A, OBORCI),
            atk_b: staleTransit(A, OBORCI),
        };
        state.military.corps_command = {
            rbih_corps: {
                active_operations: [{
                    name: 'Relocation Test Operation',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 1,
                    phase_started_turn: 1,
                    participating_brigades: ['atk_a', 'atk_b'],
                    objectives: [T],
                    occupies_on_victory: true,
                    coordinated_advance: true,
                    axes: [{
                        axis_id: 'axis_a',
                        name: 'Main',
                        assigned_brigades: ['atk_a', 'atk_b'],
                        objectives: [T],
                        current_objective_index: 0,
                        status: 'executing',
                    }],
                }],
            },
        } as any;

        const report = resolveAttackOrdersOsid(
            state,
            makeEdges(),
            reverseMap,
            flatTerrain,
            null,
            null,
            null,
            makeAdjacency(),
        );

        expect(report.flips_applied).toBe(1);
        expect(state.military.formations?.atk_a?.location_osid).toBe(T);
        expect(state.military.formations?.atk_b?.location_osid).toBe(T);
        expect(state.military.brigade_movement_state?.atk_a).toBeUndefined();
        expect(state.military.brigade_movement_state?.atk_b).toBeUndefined();
        expect(state.military.brigade_movement_orders?.atk_a).toEqual({ destination_sids: [REAR], stance: 'column' });
        expect(state.military.brigade_movement_orders?.atk_b).toEqual({ destination_sids: [REAR], stance: 'combat' });
    });
});
