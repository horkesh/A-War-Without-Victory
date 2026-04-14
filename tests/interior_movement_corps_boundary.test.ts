import { describe, expect, it } from 'vitest';

import { issueInteriorMovement } from '../src/sim/combat/bot_brigade_movement_ai.js';
import type { BrigadePosture, FormationState, GameState } from '../src/state/game_state.js';
import type { FactionGraphAnalysis, OsidAnalysis } from '../src/sim/combat/osid_graph_analysis.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function makeAnalysis(
    entries: Record<string, Partial<OsidAnalysis>>,
): FactionGraphAnalysis {
    const osidAnalysis = new Map<Osid, OsidAnalysis>();
    for (const [osid, partial] of Object.entries(entries)) {
        osidAnalysis.set(osid as Osid, {
            osid: osid as Osid,
            controller: 'HRHB',
            enemy_neighbors: [],
            friendly_neighbors: [],
            brigade_id: null,
            brigade_power: 0,
            enemy_threat: 0,
            classification: 'interior',
            civilian_weight: 0,
            is_chokepoint: false,
            advance_enemy_adjacency: 0,
            ...partial,
        });
    }
    return {
        faction: 'HRHB',
        osid_analysis: osidAnalysis,
        front_osids: [...osidAnalysis.values()].filter((entry) => entry.enemy_neighbors.length > 0).map((entry) => entry.osid),
        chokepoints: [],
        salients: [],
        undefended_front: [],
        weak_enemy_osids: [],
        enemy_pockets: [],
    };
}

function makeResult() {
    return {
        posture_orders: [] as Array<{ brigade_id: string; posture: BrigadePosture }>,
        movement_orders: {} as Record<string, Osid>,
        column_march_orders: {} as Record<string, Osid>,
    };
}

describe('interior movement corps boundary', () => {
    it('prefers the brigade owner corps front over a nearer foreign-corps front', () => {
        const brigade = {
            id: 'hrhb_herceg_stjepan_brigade',
            faction: 'HRHB',
            corps_id: 'hvo_southeast_herzegovina',
            status: 'active',
            kind: 'brigade',
            location_osid: 'op:hrhb:interior',
            entrenchment_turns: 0,
        } as unknown as FormationState;

        const state = {
            political: {
                political_controllers: {
                    'op:hrhb:interior': 'HRHB',
                    'op:hrhb:foreign_step': 'HRHB',
                    'op:hrhb:foreign_front': 'HRHB',
                    'op:hrhb:own_step': 'HRHB',
                    'op:hrhb:own_front': 'HRHB',
                    'op:enemy:foreign': 'RS',
                    'op:enemy:own': 'RS',
                },
            },
            military: {
                corps_front_sectors: {
                    'sector:hvo_tomislavgrad:0': {
                        corps_id: 'hvo_tomislavgrad',
                        sub_segments: [{ friendly_osids: ['op:hrhb:foreign_front'] }],
                    },
                    'sector:hvo_southeast_herzegovina:0': {
                        corps_id: 'hvo_southeast_herzegovina',
                        sub_segments: [{ friendly_osids: ['op:hrhb:own_front'] }],
                    },
                },
            },
        } as unknown as GameState;

        const adjacency = new Map<Osid, Osid[]>([
            ['op:hrhb:interior' as Osid, ['op:hrhb:foreign_step' as Osid, 'op:hrhb:own_step' as Osid]],
            ['op:hrhb:foreign_step' as Osid, ['op:hrhb:interior' as Osid, 'op:hrhb:foreign_front' as Osid]],
            ['op:hrhb:foreign_front' as Osid, ['op:hrhb:foreign_step' as Osid, 'op:enemy:foreign' as Osid]],
            ['op:hrhb:own_step' as Osid, ['op:hrhb:interior' as Osid, 'op:hrhb:own_front' as Osid]],
            ['op:hrhb:own_front' as Osid, ['op:hrhb:own_step' as Osid, 'op:enemy:own' as Osid]],
            ['op:enemy:foreign' as Osid, ['op:hrhb:foreign_front' as Osid]],
            ['op:enemy:own' as Osid, ['op:hrhb:own_front' as Osid]],
        ]);
        const graphAnalysis = makeAnalysis({
            'op:hrhb:interior': { classification: 'interior' },
            'op:hrhb:foreign_step': { classification: 'interior', friendly_neighbors: ['op:hrhb:interior' as Osid, 'op:hrhb:foreign_front' as Osid] },
            'op:hrhb:foreign_front': {
                classification: 'critical',
                enemy_neighbors: ['op:enemy:foreign' as Osid],
                friendly_neighbors: ['op:hrhb:foreign_step' as Osid, 'op:hrhb:interior' as Osid],
            },
            'op:hrhb:own_step': { classification: 'interior', friendly_neighbors: ['op:hrhb:interior' as Osid, 'op:hrhb:own_front' as Osid] },
            'op:hrhb:own_front': {
                classification: 'active',
                enemy_neighbors: ['op:enemy:own' as Osid],
                friendly_neighbors: ['op:hrhb:own_step' as Osid, 'op:hrhb:interior' as Osid],
            },
        });
        const result = makeResult();

        issueInteriorMovement(
            brigade,
            'op:hrhb:interior' as Osid,
            'HRHB',
            adjacency,
            state,
            new Map(),
            graphAnalysis,
            result,
            ['undefended', 'critical', 'threatened', 'active'],
        );

        expect(result.movement_orders[brigade.id]).toBeUndefined();
        expect(result.column_march_orders[brigade.id]).toBe('op:hrhb:own_front');
    });
});
