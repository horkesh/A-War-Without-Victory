import { describe, expect, it } from 'vitest';

import { evaluateUncontestedOccupation } from '../src/sim/combat/bot_brigade_eval_attack.js';
import type { BrigadeEvaluationContext } from '../src/sim/combat/bot_brigade_eval_types.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import type { CorpsFrontSector, GameState } from '../src/state/game_state.js';

describe('evaluateUncontestedOccupation sector defense cache', () => {
    it('uses cached defender-sector coverage before allowing uncontested occupation', () => {
        const loc = 'op:test:front' as Osid;
        const target = 'op:test:target' as Osid;
        const reserveLoc = 'op:test:reserve' as Osid;
        const state = {
            meta: { turn: 4 },
            military: {
                formations: {
                    brig_attacker: {
                        id: 'brig_attacker',
                        faction: 'RBiH',
                        status: 'active',
                        kind: 'brigade',
                        corps_id: 'arbih_1st_corps',
                        location_osid: loc,
                    },
                    rs_reserve: {
                        id: 'rs_reserve',
                        faction: 'RS',
                        status: 'active',
                        kind: 'brigade',
                        corps_id: 'vrs_test_corps',
                        location_osid: reserveLoc,
                    },
                },
                corps_front_sectors: {},
            },
            political: {
                political_controllers: {
                    [loc]: 'RBiH',
                    [target]: 'RS',
                    [reserveLoc]: 'RS',
                },
            },
        } as unknown as GameState;
        const result = {
            posture_orders: [],
            attack_orders: {},
            attack_scores: {},
            movement_orders: {},
            column_march_orders: {},
            eligible_attackers_by_corps: {},
        };
        const defendingSector = {
            sector_id: 'sector:vrs:test',
            faction: 'RS',
            corps_id: 'vrs_test_corps',
            assigned_brigade_ids: [],
            reserve_brigade_ids: ['rs_reserve'],
            sub_segments: [],
            territory_osids: [target],
            length_edges: 1,
        } as unknown as CorpsFrontSector;
        const sectorDefenseByFactionAndOsid = new Map<string, Map<string, CorpsFrontSector>>([
            ['RS', new Map([[target, defendingSector]])],
        ]);
        const ctx = {
            state,
            faction: 'RBiH',
            brigade: state.military.formations!.brig_attacker!,
            loc,
            corpsId: 'arbih_1st_corps',
            cmd: null,
            directive: null,
            corpsStance: 'balanced',
            activeOp: null,
            isActiveSectorOperationParticipant: false,
            adjEnemy: [target],
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
            sectorDefenseByFactionAndOsid,
            adjacency: new Map<Osid, Osid[]>([
                [loc, [target]],
                [target, [loc]],
                [reserveLoc, []],
            ]),
            reverseMap: new Map(),
            terrainCache: {},
            graphAnalysis: {
                osid_analysis: new Map(),
            },
            result,
        } as unknown as BrigadeEvaluationContext;

        const handled = evaluateUncontestedOccupation(ctx);

        expect(handled).toBe(false);
        expect(result.attack_orders).toEqual({});
        expect(result.posture_orders).toEqual([]);
    });
});
