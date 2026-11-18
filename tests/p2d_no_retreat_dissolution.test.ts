/**
 * Package P2-D (2026-11-18): a formation with no reachable friendly cell is destroyed through the
 * canonical dissolution record (`dissolveFormationAsDestroyed`), so brigade reconstitution can see
 * it. Before P2-D the force-retreat dead end set it inactive with no `lifecycle_status`, no reserve
 * share and no record, and the brigade was lost for good (main's own 188w run ends with 8 such).
 * One pinning test per call site: the dissolution pass, the force-retreat fallback,
 * displaceFormationsInEnemyTerritory (attack_retreat_displacement.ts) and the final displacement
 * pass of resolveAttackOrdersOsid (attack_resolution_osid.ts). Each fails on the pre-P2-D code.
 */

import { describe, expect, it } from 'vitest';
import type { FormationState, GameState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import type { TerrainScalarsData } from '../src/map/terrain_scalars.js';
import { dissolveCombatIneffectiveBrigades, dissolveFormationAsDestroyed } from '../src/sim/combat/brigade_dissolution.js';
import { displaceFormationsInEnemyTerritory, forceRetreatWithPenalties } from '../src/sim/combat/attack_retreat_displacement.js';
import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';

// RS brigade at LOST, which RBiH holds; the only neighbour is RBiH too. RS holds nothing: no retreat.
const LOST = 'op:test:lost';
const NEXT = 'op:test:next';
const reverseMap: OperationalToCanonicalReverseMap = new Map([LOST, NEXT].map((osid) => [osid, [osid]]));
const edges = [{ a: LOST, b: NEXT }] as EdgeRecord[];
const adjacency = new Map<string, string[]>([[LOST, [NEXT]], [NEXT, [LOST]]]);
const flatTerrain: TerrainScalarsData = {
    by_sid: Object.fromEntries([LOST, NEXT].map((osid) => [osid, {
        road_access_index: 0.5, river_crossing_penalty: 0, elevation_mean_m: 200,
        elevation_stddev_m: 10, slope_index: 0.1, terrain_friction_index: 0.1,
    }])),
};

function brigade(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'rs_cut_off', name: 'rs_cut_off', faction: 'RS', kind: 'brigade', status: 'active',
        corps_id: 'vrs_corps', location_osid: LOST, personnel: 800, cohesion: 60, morale: 60,
        created_turn: 0, assignment: null, stranded_status: 'holding', stranded_since_turn: 10,
        composition: {
            infantry: 800, tanks: 4, artillery: 6, aa_systems: 1,
            tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
        },
        ...overrides,
    } as FormationState;
}

function stateWith(formation: FormationState): GameState {
    return {
        meta: { turn: 16, phase: 'war', scenario_start_date: { year: 1992, month: 7, day: 20 } },
        factions: [{ id: 'RBiH' }, { id: 'RS' }],
        military: {
            formations: { [formation.id]: formation },
            brigade_attack_orders: {},
            brigade_movement_orders: {},
            strategic_reserves: { RS: 1000, RBiH: 0 },
            casualty_ledger: initializeCasualtyLedger(['RBiH', 'RS']),
        },
        political: { political_controllers: { [LOST]: 'RBiH', [NEXT]: 'RBiH' }, control_events: [] },
    } as unknown as GameState;
}

function expectDestroyedRecord(state: GameState, f: FormationState): void {
    expect(f.status).toBe('inactive');
    expect(f.lifecycle_status).toBe('destroyed'); // pre-P2-D: undefined
    expect(f.destruction_turn).toBe(16);
    expect(f.personnel).toBe(0);
    expect((state.military.strategic_reserves as Record<string, number>).RS).toBeGreaterThan(1000); // pre-P2-D: 1000
    expect(f.composition?.tanks).toBe(0);
    expect(f.stranded_status).toBe('holding'); // EH-3: the stranded record is never touched
}

describe('package P2-D: no-retreat formations get the canonical dissolution record', () => {
    it('the dissolution pass and the shared helper write the same record', () => {
        const viaPass = stateWith(brigade({ personnel: 120, cohesion: 10 }));
        const viaHelper = stateWith(brigade({ personnel: 120, cohesion: 10 }));
        const report = dissolveCombatIneffectiveBrigades(viaPass);
        const record = dissolveFormationAsDestroyed(viaHelper, 'rs_cut_off');
        expect(report.dissolved_brigades).toEqual([record]);
        expect(JSON.stringify(viaPass)).toBe(JSON.stringify(viaHelper));
        expect(record.personnel_to_reserve).toBe(60);
    });

    it('the force-retreat fallback destroys through the record', () => {
        const f = brigade();
        const state = stateWith(f);
        forceRetreatWithPenalties(state, f, reverseMap, LOST, { adjacency: adjacency as any, friendlyOsids: new Set() });
        expect(f.location_osid).toBeUndefined();
        expectDestroyedRecord(state, f);
    });

    it('displaceFormationsInEnemyTerritory: a brigade left in enemy ground with nowhere to go', () => {
        const f = brigade();
        const state = stateWith(f);
        displaceFormationsInEnemyTerritory(state, edges, reverseMap, adjacency);
        expectDestroyedRecord(state, f);
    });

    it('a non-brigade kind keeps the plain terminal path: no reserve share for a unit that never re-forms (seat ops r1)', () => {
        const f = brigade({ kind: 'militia' as FormationState['kind'] });
        const state = stateWith(f);
        forceRetreatWithPenalties(state, f, reverseMap, LOST, { adjacency: adjacency as any, friendlyOsids: new Set() });
        expect(f.status).toBe('inactive');
        expect(f.destruction_turn).toBe(16);
        expect(f.lifecycle_status).toBeUndefined();
        expect((state.military.strategic_reserves as Record<string, number>).RS).toBe(1000);
    });

    it('resolveAttackOrdersOsid final displacement pass', () => {
        const f = brigade();
        const state = stateWith(f);
        resolveAttackOrdersOsid(state, edges, reverseMap, flatTerrain, null, null, null, adjacency as any);
        expectDestroyedRecord(state, f);
    });
});
