/**
 * P-A — time-bounded participant admission (owner packet 2026-09-18).
 *
 * These cases pin `canFormationReachAssemblyInTime`, the admission sanity check the commander
 * uses before adding a formation to a generated operation's INITIAL roster. They are deliberately
 * about physical feasibility (location, legal route, terrain-weighted column cost, column rate,
 * and the operation's own planning_duration + grace budget) — never about combat strength,
 * ownership outcomes, or hard-coded brigades/OSIDs.
 */

import { describe, expect, it } from 'vitest';

import { canFormationReachAssemblyInTime } from '../src/sim/combat/sector_offensive_launch_helpers.js';
import type { FormationState, GameState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';

const FACTION = 'RS' as const;
const CORPS = 'c';

const HEAVY = {
    infantry: 100, tanks: 10, artillery: 10, aa_systems: 0,
    tank_condition: { operational: 1 }, artillery_condition: { operational: 1 },
} as FormationState['composition'];
const LIGHT = {
    infantry: 1000, tanks: 0, artillery: 5, aa_systems: 0,
    tank_condition: { operational: 1 }, artillery_condition: { operational: 1 },
} as FormationState['composition'];

/** Bidirectional chain L0 - L1 - ... - Ln. */
function chain(n: number): Map<Osid, Osid[]> {
    const adjacency = new Map<Osid, Osid[]>();
    const add = (a: string, b: string) => {
        adjacency.set(a as Osid, [...(adjacency.get(a as Osid) ?? []), b as Osid]);
    };
    for (let i = 0; i < n; i += 1) {
        add(`L${i}`, `L${i + 1}`);
        add(`L${i + 1}`, `L${i}`);
    }
    return adjacency;
}

interface FixtureOptions {
    location: string;
    composition?: FormationState['composition'];
    controllers: Record<string, string>;
    adjacency: Map<Osid, Osid[]>;
    frontEdges?: Array<{ a: string; b: string }>;
    sectors?: Record<string, unknown>;
    assignedSubSegmentId?: string;
}

function makeState(opts: FixtureOptions): GameState {
    const brigade = {
        id: 'b1', faction: FACTION, corps_id: CORPS, status: 'active', kind: 'brigade',
        location_osid: opts.location, composition: opts.composition ?? HEAVY,
        ...(opts.assignedSubSegmentId ? { assigned_sub_segment_id: opts.assignedSubSegmentId } : {}),
    };
    return {
        political: { political_controllers: opts.controllers },
        military: {
            formations: { b1: brigade },
            war_front_edges_osid: opts.frontEdges ?? [],
            corps_front_sectors: opts.sectors ?? {},
        },
    } as unknown as GameState;
}

function feasible(state: GameState, objective: string, planningDuration: number, adjacency: Map<Osid, Osid[]>): boolean {
    return canFormationReachAssemblyInTime(
        state, 'b1', CORPS, FACTION, objective, planningDuration,
        adjacency as Map<string, string[]>, new Map() as OperationalToCanonicalReverseMap,
        { by_sid: {} },
    );
}

describe('canFormationReachAssemblyInTime — P-A admission rule', () => {
    // Fixture: 12 terrain-weighted edges L0..L12; objective X is a live front neighbour of L12.
    // Each default-terrain edge costs ~0.916; a heavy (rate 2) brigade needs ceil(12*0.916/2)=6
    // transit turns; a light (rate 4) brigade needs 3.
    const chainAdj = chain(12);
    const frontEdges = [{ a: 'L12', b: 'X' }];
    const controllers: Record<string, string> = { X: 'RBiH' };
    for (let i = 0; i <= 12; i += 1) controllers[`L${i}`] = 'RS';

    it('A. a distant heavy brigade that cannot meet the assembly horizon is excluded', () => {
        // planning_duration 3 + grace 2 = 5 transit turns; heavy needs 6.
        const state = makeState({ location: 'L0', composition: HEAVY, controllers, adjacency: chainAdj, frontEdges });
        expect(feasible(state, 'X', 3, chainAdj)).toBe(false);
    });

    it('B. the same formation with sufficient time remains eligible', () => {
        const state = makeState({ location: 'L0', composition: HEAVY, controllers, adjacency: chainAdj, frontEdges });
        expect(feasible(state, 'X', 10, chainAdj)).toBe(true);
    });

    it('C. a formation already at an assembly/approach cell remains eligible', () => {
        const state = makeState({ location: 'L12', composition: HEAVY, controllers, adjacency: chainAdj, frontEdges });
        expect(feasible(state, 'X', 3, chainAdj)).toBe(true);
    });

    it('D. a distant formation whose real movement rate allows timely arrival stays eligible', () => {
        // Same 12-edge geometry, light composition (rate 4) => 3 transit turns <= 5.
        const state = makeState({ location: 'L0', composition: LIGHT, controllers, adjacency: chainAdj, frontEdges });
        expect(feasible(state, 'X', 3, chainAdj)).toBe(true);
    });

    it('E. a short geometric distance with no legal route is excluded', () => {
        // A - E(enemy) - L12(friendly) - X. L12 is the only friendly approach to X, but the
        // only path from A crosses enemy-held E, which production column movement cannot cross.
        const adjacency = new Map<Osid, Osid[]>([
            ['A' as Osid, ['E' as Osid]],
            ['E' as Osid, ['A' as Osid, 'L12' as Osid]],
            ['L12' as Osid, ['E' as Osid, 'X' as Osid]],
            ['X' as Osid, ['L12' as Osid]],
        ]);
        const state = makeState({
            location: 'A', composition: LIGHT,
            controllers: { A: 'RS', E: 'RBiH', L12: 'RS', X: 'RBiH' },
            adjacency, frontEdges: [{ a: 'L12', b: 'X' }],
        });
        expect(feasible(state, 'X', 10, adjacency)).toBe(false);
    });

    it('F. physical feasibility is evaluated independently of routine sub-segment scope', () => {
        // The brigade's assigned sub-segment front is only {L0}, so a routine-scope check would
        // reject the L12 approach. P-A must not: it asks whether the operation-authorized march
        // is physically possible, not whether routine discretion would have chosen it.
        // The corps legally owns the whole chain (so the operation-authorized route is legal),
        // but the brigade's assigned sub-segment front is only {L0}.
        const allCells = Array.from({ length: 13 }, (_, i) => `L${i}`);
        const sectors = {
            'sector:c:0': {
                sector_id: 'sector:c:0', corps_id: CORPS, faction: FACTION,
                sub_segments: [{
                    sub_segment_id: 'ss:L0', edge_ids: [], friendly_osids: ['L0'],
                    enemy_osids: [], primary_brigade_ids: ['b1'], length_edges: 1,
                }],
                territory_osids: allCells, assigned_brigade_ids: ['b1'], reserve_brigade_ids: [],
                rear_brigade_ids: [], length_edges: allCells.length,
            },
        };
        const state = makeState({
            location: 'L0', composition: LIGHT, controllers, adjacency: chainAdj, frontEdges,
            sectors, assignedSubSegmentId: 'ss:L0',
        });
        expect(feasible(state, 'X', 10, chainAdj)).toBe(true);
    });

    it('H. the rule is parameterized — no brigade/objective/corps identifier is special-cased', () => {
        // Same geometry as D but an unrelated corps and objective label: a light brigade is
        // admitted, a heavy one on identical ground is not. If Prodor/Orašac/Trubar were
        // hard-coded anywhere in the rule, this would behave differently.
        const otherSectors = {};
        const otherFrontEdges = [{ a: 'L12', b: 'op:other:target' }];
        const otherControllers: Record<string, string> = { 'op:other:target': 'RBiH' };
        for (let i = 0; i <= 12; i += 1) otherControllers[`L${i}`] = 'RS';
        const light = makeState({ location: 'L0', composition: LIGHT, controllers: otherControllers, adjacency: chainAdj, frontEdges: otherFrontEdges, sectors: otherSectors });
        const heavy = makeState({ location: 'L0', composition: HEAVY, controllers: otherControllers, adjacency: chainAdj, frontEdges: otherFrontEdges, sectors: otherSectors });
        expect(canFormationReachAssemblyInTime(
            light, 'b1', 'other_corps', FACTION, 'op:other:target', 3,
            chainAdj as unknown as Map<string, string[]>, new Map(), { by_sid: {} },
        )).toBe(true);
        expect(canFormationReachAssemblyInTime(
            heavy, 'b1', 'other_corps', FACTION, 'op:other:target', 3,
            chainAdj as unknown as Map<string, string[]>, new Map(), { by_sid: {} },
        )).toBe(false);
    });

    it('I. is deterministic and does not mutate the evaluated formation’s movement state', () => {
        const state = makeState({ location: 'L0', composition: LIGHT, controllers, adjacency: chainAdj, frontEdges });
        const before = JSON.stringify(state.military.formations!.b1);
        const first = feasible(state, 'X', 3, chainAdj);
        const second = feasible(state, 'X', 3, chainAdj);
        expect(first).toBe(second);
        expect(JSON.stringify(state.military.formations!.b1)).toBe(before);
    });
});
