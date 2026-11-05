import { describe, expect, it } from 'vitest';

import type {
    BrigadeMovementOrder,
    CorpsFrontSector,
    FactionId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import type { TerrainScalarsData } from '../src/map/terrain_scalars.js';
import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import { applyDefeatPenalties } from '../src/sim/combat/attack_retreat_displacement.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';

const A = 'op:test:attacker_staging';
const T = 'op:test:target';
const K = 'op:test:coverage';
const B = 'op:test:rear';
const PREVIOUS = 'op:test:previous_retreat';

const flatTerrain: TerrainScalarsData = {
    by_sid: Object.fromEntries([A, T, K, B, PREVIOUS].map((osid) => [osid, {
        road_access_index: 0.5,
        river_crossing_penalty: 0,
        elevation_mean_m: 200,
        elevation_stddev_m: 10,
        slope_index: 0.1,
        terrain_friction_index: 0.1,
    }])),
};

const reverseMap: OperationalToCanonicalReverseMap = new Map(
    [A, T, K, B, PREVIOUS].map((osid) => [osid, [osid]]),
);

function makeEdges(): EdgeRecord[] {
    return [
        { a: A, b: T },
        { a: T, b: K },
        { a: K, b: B },
    ] as EdgeRecord[];
}

function makeAdjacency(): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();
    for (const edge of makeEdges()) {
        adjacency.set(edge.a, [...(adjacency.get(edge.a) ?? []), edge.b]);
        adjacency.set(edge.b, [...(adjacency.get(edge.b) ?? []), edge.a]);
    }
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
        home_osid: locationOsid,
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

function makeState(
    formations: FormationState[],
    orders: Record<string, BrigadeMovementOrder>,
): GameState {
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
                [B]: 'RS',
                [PREVIOUS]: 'RS',
            },
            control_events: [],
        },
        displacement: {},
    } as unknown as GameState;
}

function makeSector(assignedBrigades: string[]): CorpsFrontSector {
    return {
        sector_id: 'sector:rs_corps:0',
        corps_id: 'rs_corps',
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: [`${A}__${T}`],
        sub_segments: [{
            sub_segment_id: 'subseg:rs_corps:0',
            edge_ids: [`${A}__${T}`],
            friendly_osids: [T],
            enemy_osids: [A],
            length_edges: 1,
            primary_brigade_ids: assignedBrigades,
        }],
        length_edges: 1,
        territory_osids: [T, K],
        assigned_brigade_ids: assignedBrigades,
        reserve_brigade_ids: [],
        density: assignedBrigades.length,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

function strongAttacker(): FormationState {
    return makeFormation('atk_main', 'RBiH', A, 6000, {
        cohesion: 100,
        morale: 100,
        experience: 1,
        composition: {
            infantry: 4000,
            tanks: 40,
            artillery: 60,
            aa_systems: 20,
            tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
        },
    });
}

describe('coverage defenders do not acquire retreat-origin metadata', () => {
    it('keeps a coverage-only defender in place without a false last_retreat_from', () => {
        const coverage = makeFormation('rs_cover', 'RS', K, 800, {
            cohesion: 60,
            morale: 40,
            entrenchment_turns: 4,
            last_retreat_from: { osid: PREVIOUS, turn: 179 },
        } as Partial<FormationState>);
        const packingJourney = {
            status: 'packing' as const,
            stance: 'combat' as const,
            destination_sids: [T],
            path: [K, T],
            turns_remaining: 1,
            owner: 'bot_discretionary' as const,
        };
        const pendingReposition = { settlement_ids: [B] };
        const state = makeState([strongAttacker(), coverage], {});
        state.military.brigade_movement_state = { rs_cover: packingJourney };
        state.military.brigade_reposition_orders = { rs_cover: pendingReposition };
        state.military.corps_front_sectors = {
            'sector:rs_corps:0': makeSector(['rs_cover']),
        };

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
        expect(report.battles).toHaveLength(1);
        expect(report.battles[0]?.defender_brigade).toBe('rs_cover');
        expect(report.battles[0]?.defending_sub_segment_id).toBe('subseg:rs_corps:0');
        expect(coverage.location_osid).toBe(K);
        expect(state.military.brigade_movement_state?.rs_cover).toEqual(packingJourney);
        expect(state.military.brigade_reposition_orders?.rs_cover).toEqual(pendingReposition);
        expect(coverage.last_retreat_from).toEqual({ osid: PREVIOUS, turn: 179 });
        expect(coverage.entrenchment_turns).toBe(0);
        expect(coverage.disrupted_turns ?? 0).toBeGreaterThan(0);
    });

    it('preserves an active transit journey and pending movement order when coverage penalties are applied', () => {
        const coverage = makeFormation('rs_cover_transit', 'RS', K, 800, {
            cohesion: 60,
            morale: 40,
            entrenchment_turns: 4,
            last_retreat_from: { osid: PREVIOUS, turn: 179 },
        } as Partial<FormationState>);
        const transit = {
            status: 'in_transit' as const,
            stance: 'column' as const,
            destination_sids: [T],
            path: [K, T],
            turns_remaining: 1,
            owner: 'bot_discretionary' as const,
        };
        const pendingOrder: BrigadeMovementOrder = {
            destination_sids: [B],
            stance: 'combat',
        };
        const state = makeState([coverage], { rs_cover_transit: pendingOrder });
        state.military.brigade_movement_state = { rs_cover_transit: transit };

        applyDefeatPenalties(coverage, T, 181, 'decisive_victory', {
            recordRetreatOrigin: false,
        });

        expect(coverage.location_osid).toBe(K);
        expect(state.military.brigade_movement_state?.rs_cover_transit).toEqual(transit);
        expect(state.military.brigade_movement_orders?.rs_cover_transit).toEqual(pendingOrder);
        expect(coverage.last_retreat_from).toEqual({ osid: PREVIOUS, turn: 179 });
        expect(coverage.entrenchment_turns).toBe(0);
        expect(coverage.disrupted_turns).toBe(2);
    });

    it('records the real source when a physically present defender retreats', () => {
        const physical = makeFormation('rs_physical', 'RS', T, 650, {
            cohesion: 60,
            morale: 40,
            entrenchment_turns: 5,
        });
        const state = makeState([strongAttacker(), physical], {});

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
        expect(report.battles[0]?.defender_brigade).toBe('rs_physical');
        expect(physical.location_osid).toBe(K);
        expect(physical.last_retreat_from).toEqual({ osid: T, turn: 181 });
        expect(physical.entrenchment_turns).toBe(0);
        expect(physical.disrupted_turns ?? 0).toBeGreaterThan(0);
    });

    it('preserves a legitimate marker when a sector brigade counterattacks', () => {
        const defender = makeFormation('arbih_hold', 'RBiH', A, 650, {
            cohesion: 60,
            morale: 40,
        });
        const counterattacker = makeFormation('rs_counter', 'RS', T, 6000, {
            cohesion: 100,
            morale: 100,
            experience: 1,
            last_retreat_from: { osid: A, turn: 180 },
            composition: {
                infantry: 4000,
                tanks: 40,
                artillery: 60,
                aa_systems: 20,
                tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
            },
        });
        const state = makeState([counterattacker, defender], {});
        state.military.brigade_attack_orders = { rs_counter: A };

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
        expect(state.political.political_controllers?.[A]).toBe('RS');
        expect(counterattacker.location_osid).toBe(A);
        expect(counterattacker.last_retreat_from).toEqual({ osid: A, turn: 180 });
    });
});
