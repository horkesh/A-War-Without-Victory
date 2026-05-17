import { describe, expect, it } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { SupplyReachabilityOsidReport } from '../src/state/supply_reachability_osid.js';
import {
    deriveCorridorsOsid,
    deriveSupplyStateByOsid,
} from '../src/state/supply_state_derivation.js';

const EDGES_ORDERED: EdgeRecord[] = [
    { a: 'op:alpha:source', b: 'op:alpha:junction' } as EdgeRecord,
    { a: 'op:alpha:junction', b: 'op:alpha:front' } as EdgeRecord,
    { a: 'op:alpha:front', b: 'op:alpha:pocket' } as EdgeRecord,
    { a: 'op:alpha:junction', b: 'op:alpha:reserve' } as EdgeRecord,
    { a: 'op:alpha:reserve', b: 'op:alpha:front' } as EdgeRecord,
    { a: 'op:bravo:source', b: 'op:bravo:junction' } as EdgeRecord,
    { a: 'op:bravo:junction', b: 'op:alpha:pocket' } as EdgeRecord,
];

const EDGES_SHUFFLED: EdgeRecord[] = [
    EDGES_ORDERED[6]!,
    EDGES_ORDERED[2]!,
    EDGES_ORDERED[4]!,
    EDGES_ORDERED[0]!,
    EDGES_ORDERED[5]!,
    EDGES_ORDERED[1]!,
    EDGES_ORDERED[3]!,
];

function makeState(): GameState {
    return {
        meta: { turn: 17, phase: 'war', seed: 'supply-cascade-order' },
        factions: [
            { id: 'RS', supply_sources: ['op:bravo:source'] },
            { id: 'RBiH', supply_sources: ['op:alpha:source'] },
        ],
    } as unknown as GameState;
}

function makeSupplyReport(): SupplyReachabilityOsidReport {
    return {
        schema: 1,
        turn: 17,
        factions: [
            {
                faction_id: 'RS',
                sources: ['op:bravo:source'],
                controlled: [
                    'op:bravo:junction',
                    'op:bravo:source',
                    'op:alpha:pocket',
                ],
                reachable_osids: [
                    'op:alpha:pocket',
                    'op:bravo:junction',
                    'op:bravo:source',
                ],
                isolated_osids: [],
                edges_used: [
                    'op:alpha:pocket__op:bravo:junction',
                    'op:bravo:junction__op:bravo:source',
                ],
            },
            {
                faction_id: 'RBiH',
                sources: ['op:alpha:source'],
                controlled: [
                    'op:alpha:front',
                    'op:alpha:junction',
                    'op:alpha:reserve',
                    'op:alpha:source',
                ],
                reachable_osids: [
                    'op:alpha:front',
                    'op:alpha:junction',
                    'op:alpha:reserve',
                    'op:alpha:source',
                ],
                isolated_osids: [],
                edges_used: [
                    'op:alpha:front__op:alpha:junction',
                    'op:alpha:front__op:alpha:reserve',
                    'op:alpha:junction__op:alpha:reserve',
                    'op:alpha:junction__op:alpha:source',
                ],
            },
        ],
    };
}

function derive(edges: EdgeRecord[]) {
    const state = makeState();
    const supplyReport = makeSupplyReport();
    const corridors = deriveCorridorsOsid(state, edges, supplyReport);
    const supply = deriveSupplyStateByOsid(state, edges, supplyReport, corridors);
    return {
        corridors,
        supply,
        serialized: JSON.stringify({ corridors, supply }),
    };
}

describe('Phase 2 supply cascade deterministic ordering', () => {
    it('emits byte-identical corridor and OSID supply reports across adjacency insertion order', () => {
        const ordered = derive(EDGES_ORDERED);
        const shuffled = derive(EDGES_SHUFFLED);

        expect(shuffled.serialized).toBe(ordered.serialized);
        expect(ordered.supply.factions.map((entry) => entry.faction_id)).toEqual(['RBiH', 'RS']);
        expect(ordered.supply.factions[0]!.by_osid.map((entry) => entry.osid)).toEqual([
            'op:alpha:front',
            'op:alpha:junction',
            'op:alpha:reserve',
            'op:alpha:source',
        ]);
        expect(ordered.supply.factions[1]!.by_osid.map((entry) => entry.osid)).toEqual([
            'op:alpha:pocket',
            'op:bravo:junction',
            'op:bravo:source',
        ]);
    });
});
