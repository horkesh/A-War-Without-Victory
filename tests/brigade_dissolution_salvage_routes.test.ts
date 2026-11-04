import { describe, expect, it } from 'vitest';

import {
    DISSOLUTION_EQUIPMENT_TRANSFER_RATE,
    DISSOLUTION_PERSONNEL_TO_RESERVE_RATE,
    dissolveCombatIneffectiveBrigades,
} from '../src/sim/combat/brigade_dissolution.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

function makeBrigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        name: id,
        kind: 'brigade',
        status: 'active',
        faction: 'RS',
        corps_id: 'corps_1',
        location_osid: 'S',
        personnel: 1500,
        morale: 60,
        cohesion: 60,
        composition: {
            infantry: 1500,
            tanks: 0,
            artillery: 0,
            aa_systems: 0,
            tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
        },
        ...overrides,
    } as FormationState;
}

function makeState(
    formations: Record<string, FormationState>,
    controllers: Record<string, string | null> = {},
    alliance = 0,
): GameState {
    return {
        schema_version: 0,
        meta: { turn: 157, phase: 'war', seed: 'dissolution-salvage-routes' },
        factions: [],
        military: {
            formations,
            corps_command: { corps_1: { active_operations: [] } },
            strategic_reserves: { RS: 0, RBiH: 0, HRHB: 0 },
        },
        political: {
            political_controllers: controllers,
            war_alliance_rbih_hrhb: alliance,
        },
        displacement: {},
    } as unknown as GameState;
}

function dissolvingSource(): FormationState {
    return makeBrigade('source', {
        personnel: 200,
        cohesion: 10,
        morale: 50,
        composition: {
            infantry: 200,
            tanks: 10,
            artillery: 8,
            aa_systems: 4,
            tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
        },
    });
}

function graph(edges: Array<[string, string]>): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const [a, b] of edges) {
        if (!map.has(a)) map.set(a, []);
        if (!map.has(b)) map.set(b, []);
        map.get(a)!.push(b);
        map.get(b)!.push(a);
    }
    return map;
}

describe('brigade dissolution salvage routes', () => {
    it('sends equipment to the nearest valid recipient, not the alphabetically first remote one', () => {
        const source = dissolvingSource();
        const remote = makeBrigade('a_remote', { location_osid: 'A' });
        const near = makeBrigade('z_near', { location_osid: 'Z' });
        const state = makeState(
            { source, a_remote: remote, z_near: near },
            { S: 'RS', A: 'RS', Z: 'RS' },
        );
        dissolveCombatIneffectiveBrigades(state, graph([['S', 'Z']]));
        expect(near.composition!.tanks).toBe(Math.floor(10 * DISSOLUTION_EQUIPMENT_TRANSFER_RATE));
        expect(remote.composition!.tanks).toBe(0);
        expect(source.composition!.tanks).toBe(0);
    });

    it('uses stable formation ID for equal distance and is insertion-order independent', () => {
        for (const ordered of [
            { source: dissolvingSource(), b_receiver: makeBrigade('b_receiver', { location_osid: 'B' }), a_receiver: makeBrigade('a_receiver', { location_osid: 'A' }) },
            { a_receiver: makeBrigade('a_receiver', { location_osid: 'A' }), b_receiver: makeBrigade('b_receiver', { location_osid: 'B' }), source: dissolvingSource() },
        ]) {
            const state = makeState(ordered, { S: 'RS', A: 'RS', B: 'RS' });
            dissolveCombatIneffectiveBrigades(state, graph([['S', 'A'], ['S', 'B']]));
            expect(ordered.a_receiver.composition!.tanks).toBe(7);
            expect(ordered.b_receiver.composition!.tanks).toBe(0);
        }
    });

    it('treats hostile and unknown controllers as barriers', () => {
        for (const barrier of ['RS_ENEMY', null]) {
            const source = dissolvingSource();
            const gate = makeBrigade('gate', { location_osid: 'G' });
            const receiver = makeBrigade('receiver', { location_osid: 'R' });
            const state = makeState(
                { source, gate, receiver },
                { S: 'RS', G: barrier, R: 'RS' },
            );
            dissolveCombatIneffectiveBrigades(state, graph([['S', 'G'], ['G', 'R']]));
            expect(receiver.composition!.tanks).toBe(0);
            expect(source.composition!.tanks).toBe(0);
        }
    });

    it('rejects enemy, unknown, missing-location, wrong-corps, inactive, wrong-kind and compositionless recipients', () => {
        const candidates = [
            makeBrigade('enemy', { location_osid: 'R0' }),
            makeBrigade('unknown', { location_osid: 'R1' }),
            makeBrigade('no_location', { location_osid: undefined }),
            makeBrigade('wrong_corps', { location_osid: 'R3', corps_id: 'corps_2' }),
            makeBrigade('inactive', { location_osid: 'R4', status: 'inactive' }),
            makeBrigade('wrong_kind', { location_osid: 'R5', kind: 'corps' }),
            makeBrigade('no_composition', { location_osid: 'R6', composition: undefined }),
        ];
        const source = dissolvingSource();
        const formations = Object.fromEntries(candidates.map((f) => [f.id, f]));
        formations.source = source;
        const state = makeState(formations, { S: 'RS', R0: 'RBiH', R3: 'RS', R4: 'RS', R5: 'RS', R6: 'RS' });
        dissolveCombatIneffectiveBrigades(state, graph([
            ['S', 'R0'], ['S', 'R3'], ['S', 'R4'], ['S', 'R5'], ['S', 'R6'],
        ]));
        for (const candidate of candidates) expect(candidate.composition?.tanks ?? 0).toBe(0);
        expect(source.composition!.tanks).toBe(0);
    });

    it('rejects a source with enemy or unknown location control', () => {
        for (const sourceController of ['RBiH', null]) {
            const source = dissolvingSource();
            const receiver = makeBrigade('receiver', { location_osid: 'S' });
            const state = makeState({ source, receiver }, { S: sourceController });
            dissolveCombatIneffectiveBrigades(state);
            expect(receiver.composition!.tanks).toBe(0);
            expect(source.composition!.tanks).toBe(0);
        }
    });

    it('allows an allied bridge only with actual alliance', () => {
        const source = makeBrigade('source', {
            faction: 'RBiH',
            personnel: 200,
            cohesion: 10,
            morale: 50,
            composition: {
                infantry: 200,
                tanks: 10,
                artillery: 8,
                aa_systems: 0,
                tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
            },
        });
        const bridge = makeBrigade('bridge', { faction: 'HRHB', location_osid: 'M' });
        const receiver = makeBrigade('receiver', { faction: 'RBiH', location_osid: 'R' });
        const edges = graph([['S', 'M'], ['M', 'R']]);
        const allied = makeState({ source, bridge, receiver }, { S: 'RBiH', M: 'HRHB', R: 'RBiH' }, 0.9);
        dissolveCombatIneffectiveBrigades(allied, edges);
        expect(receiver.composition!.tanks).toBe(7);

        const hostileSource = makeBrigade('source', {
            faction: 'RBiH',
            personnel: 200,
            cohesion: 10,
            morale: 50,
            composition: {
                infantry: 200,
                tanks: 10,
                artillery: 8,
                aa_systems: 0,
                tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
            },
        });
        const hostileBridge = makeBrigade('bridge', { faction: 'HRHB', location_osid: 'M' });
        const hostileReceiver = makeBrigade('receiver', { faction: 'RBiH', location_osid: 'R' });
        const hostile = makeState(
            { source: hostileSource, bridge: hostileBridge, receiver: hostileReceiver },
            { S: 'RBiH', M: 'HRHB', R: 'RBiH' },
            0,
        );
        dissolveCombatIneffectiveBrigades(hostile, edges);
        expect(hostileReceiver.composition!.tanks).toBe(0);
    });

    it('allows only a provable own-controlled same-cell recipient without a graph', () => {
        const source = dissolvingSource();
        const sameCell = makeBrigade('same_cell', { location_osid: 'S' });
        dissolveCombatIneffectiveBrigades(makeState({ source, sameCell }, { S: 'RS' }));
        expect(sameCell.composition!.tanks).toBe(7);

        const source2 = dissolvingSource();
        const remote = makeBrigade('remote', { location_osid: 'R' });
        dissolveCombatIneffectiveBrigades(makeState({ source2, remote }, { S: 'RS', R: 'RS' }));
        expect(remote.composition!.tanks).toBe(0);
        expect(source2.composition!.tanks).toBe(0);
    });

    it('leaves inaccessible equipment unrecovered while preserving reserve and zeroing', () => {
        const source = dissolvingSource();
        const unreachable = makeBrigade('unreachable', { location_osid: 'R' });
        const state = makeState({ source, unreachable }, { S: 'RS', R: 'RS' });
        dissolveCombatIneffectiveBrigades(state, graph([['S', 'X'], ['X', 'R']]));
        expect(unreachable.composition!.tanks).toBe(0);
        expect(source.composition!.tanks).toBe(0);
        expect(source.composition!.artillery).toBe(0);
        expect(source.composition!.aa_systems).toBe(0);
        expect(state.military.strategic_reserves?.RS).toBe(Math.floor(200 * DISSOLUTION_PERSONNEL_TO_RESERVE_RATE));
    });

    it('keeps conservation and the 70% rate when a legal recipient exists', () => {
        const source = dissolvingSource();
        const receiver = makeBrigade('receiver', {
            location_osid: 'R',
            composition: {
                infantry: 1500,
                tanks: 1,
                artillery: 2,
                aa_systems: 0,
                tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
            },
        });
        const state = makeState({ source, receiver }, { S: 'RS', R: 'RS' });
        dissolveCombatIneffectiveBrigades(state, graph([['S', 'R']]));
        expect(receiver.composition!.tanks).toBe(1 + Math.floor(10 * DISSOLUTION_EQUIPMENT_TRANSFER_RATE));
        expect(receiver.composition!.artillery).toBe(2 + Math.floor(8 * DISSOLUTION_EQUIPMENT_TRANSFER_RATE));
        expect(source.composition!.tanks).toBe(0);
        expect(source.composition!.artillery).toBe(0);
        expect(state.military.strategic_reserves?.RS).toBe(Math.floor(200 * DISSOLUTION_PERSONNEL_TO_RESERVE_RATE));
    });

    it('rejects missing or empty faction before any same-cell ownership credit', () => {
        // Deliberately malformed state: normal FormationState requires a faction.
        // This pins the source guard so undefined/undefined or ''/'' cannot prove ownership.
        for (const faction of [undefined, '']) {
            const source = makeBrigade('source', {
                faction: faction as any,
                personnel: 200,
                cohesion: 10,
                morale: 50,
                composition: {
                    infantry: 200,
                    tanks: 10,
                    artillery: 8,
                    aa_systems: 4,
                    tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
                    artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
                },
            });
            const receiver = makeBrigade('receiver', { faction: faction as any, location_osid: 'S' });
            const controllers = (faction === undefined ? {} : { S: '' }) as Record<string, string | null>;
            const state = makeState({ source, receiver }, controllers);

            expect(dissolveCombatIneffectiveBrigades(state).dissolved_count).toBe(1);
            expect(receiver.composition!.tanks).toBe(0);
            expect(receiver.composition!.artillery).toBe(0);
            expect(source.composition!.tanks).toBe(0);
        }
    });

    it('wires both real war-phase dissolution calls through operational OSID adjacency', async () => {
        const stepNames = ['check-brigade-dissolution', 'check-brigade-dissolution-post-combat'];
        for (const stepName of stepNames) {
            const remote = makeBrigade('a_remote', { location_osid: 'A' });
            const near = makeBrigade('z_near', { location_osid: 'Z' });
            const source = dissolvingSource();
            const state = makeState({ source, a_remote: remote, z_near: near }, { S: 'RS', A: 'RS', Z: 'RS' });
            const context = {
                state,
                report: { attack_resolution_osid: { engaged_formation_ids: [] } },
                input: { operationalData: { edges: [{ a: 'S', b: 'Z' }] } },
            } as any;
            const step = warPhases.find((candidate) => candidate.name === stepName);
            expect(step).toBeDefined();
            await step!.run(context);
            expect(near.composition!.tanks).toBe(7);
            expect(remote.composition!.tanks).toBe(0);
        }
    });
});
