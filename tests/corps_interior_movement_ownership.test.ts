import { describe, expect, it } from 'vitest';

import { evaluateInteriorMovement } from '../src/sim/combat/bot_brigade_eval_movement.js';
import type { BrigadeEvaluationContext } from '../src/sim/combat/bot_brigade_eval_types.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function makeContext(): BrigadeEvaluationContext {
    const result = {
        attack_orders: {},
        posture_orders: [],
        movement_orders: {},
        column_march_orders: {},
        eligible_attackers_by_corps: {},
    } as any;

    return {
        state: {
            political: {
                political_controllers: {
                    'op:own:rear': 'HRHB',
                    'op:own:mid': 'HRHB',
                    'op:own:front': 'HRHB',
                    'op:other:front': 'HRHB',
                    'op:dummy:a': 'HRHB',
                    'op:dummy:b': 'HRHB',
                },
            },
            military: {
                corps_front_sectors: {
                    'sector:hvo_southeast_herzegovina:0': {
                        sector_id: 'sector:hvo_southeast_herzegovina:0',
                        corps_id: 'hvo_southeast_herzegovina',
                        faction: 'HRHB',
                        opposing_factions: ['RBiH'],
                        edge_ids: ['op:own:front__op:enemy:a'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:hvo_southeast_herzegovina:0',
                            edge_ids: ['op:own:front__op:enemy:a'],
                            friendly_osids: ['op:own:front'],
                            enemy_osids: ['op:enemy:a'],
                            length_edges: 1,
                            primary_brigade_ids: [],
                        }],
                        length_edges: 1,
                        territory_osids: ['op:own:rear', 'op:own:mid', 'op:own:front'],
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                        density: 0,
                        threat_ratio: 0,
                        defensive_power: 0,
                        sector_stance: 'defend',
                        stance_source: 'bot',
                    },
                    'sector:hvo_tomislavgrad:0': {
                        sector_id: 'sector:hvo_tomislavgrad:0',
                        corps_id: 'hvo_tomislavgrad',
                        faction: 'HRHB',
                        opposing_factions: ['RS'],
                        edge_ids: ['op:other:front__op:enemy:b'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:hvo_tomislavgrad:0',
                            edge_ids: ['op:other:front__op:enemy:b'],
                            friendly_osids: ['op:other:front'],
                            enemy_osids: ['op:enemy:b'],
                            length_edges: 1,
                            primary_brigade_ids: [],
                        }],
                        length_edges: 1,
                        territory_osids: ['op:other:front'],
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                        density: 0,
                        threat_ratio: 0,
                        defensive_power: 0,
                        sector_stance: 'defend',
                        stance_source: 'bot',
                    },
                },
            },
        } as any,
        faction: 'HRHB' as any,
        brigade: {
            id: 'hrhb_herceg_stjepan_brigade',
            faction: 'HRHB',
            corps_id: 'hvo_southeast_herzegovina',
            status: 'active',
            kind: 'brigade',
            assignment: null,
            location_osid: 'op:own:rear',
        } as any,
        loc: 'op:own:rear' as Osid,
        corpsId: 'hvo_southeast_herzegovina' as any,
        cmd: null,
        directive: null,
        corpsStance: 'balanced' as any,
        activeOp: null,
        isActiveSectorOperationParticipant: false,
        adjEnemy: [],
        isAlliedWithRBiH: false,
        targetAdjacentCount: new Map(),
        corpsReserve: new Map(),
        chosenTargets: new Map(),
        columnAssignments: new Map(),
        counterAttackTarget: null,
        brigadeSupplyState: 'adequate',
        isHoldBrigade: false,
        sectorRecentRetreats: new Map(),
        sectorCounterAttackCount: new Map(),
        adjacency: new Map<Osid, Osid[]>([
            ['op:own:rear' as Osid, ['op:other:front' as Osid, 'op:own:mid' as Osid]],
            ['op:own:mid' as Osid, ['op:own:rear' as Osid, 'op:own:front' as Osid]],
            ['op:own:front' as Osid, ['op:own:mid' as Osid, 'op:dummy:a' as Osid]],
            ['op:other:front' as Osid, ['op:own:rear' as Osid, 'op:dummy:b' as Osid]],
            ['op:dummy:a' as Osid, ['op:own:front' as Osid]],
            ['op:dummy:b' as Osid, ['op:other:front' as Osid]],
        ]),
        reverseMap: null as any,
        terrainCache: {},
        graphAnalysis: {
            osid_analysis: new Map([
                ['op:other:front', { enemy_neighbors: ['op:enemy:b'], friendly_neighbors: ['op:own:rear', 'op:dummy:b'], classification: 'undefended' }],
            ]),
        } as any,
        supplyStateByOsid: null,
        ethnicMap: undefined,
        osidPopulationMap: undefined,
        result,
    };
}

describe('corps-owned interior movement', () => {
    it('does not bounce an unassigned field brigade from its own corps territory to another corps front', () => {
        const ctx = makeContext();

        evaluateInteriorMovement(ctx);

        expect(ctx.result.movement_orders[ctx.brigade.id]).toBe('op:own:mid');
    });
});
