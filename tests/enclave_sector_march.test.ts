import { describe, expect, it } from 'vitest';
import { evaluateReturnToCorps, evaluateSectorMarch } from '../src/sim/combat/bot_brigade_eval_front.js';
import type { BrigadeEvaluationContext } from '../src/sim/combat/bot_brigade_eval_types.js';
import type { CorpsFrontSector, FormationState, GameState } from '../src/state/game_state.js';

const HOME = 'op:srebrenica:srebrenica_2';
const LOCAL_FRONT = 'op:srebrenica:suceska';
const OUTSIDE_FRONT = 'op:a_outside:front';
const SECTOR_ID = 'sector:arbih_2nd_corps:0';
const ZEPA_HOME = 'op:rogatica:zepa_2';

function makeContext(tags: string[]): BrigadeEvaluationContext {
    const brigade: FormationState = {
        id: 'arbih_srebrenica_defender',
        faction: 'RBiH',
        name: 'Srebrenica defender',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        corps_id: 'arbih_2nd_corps',
        location_osid: HOME,
        home_osid: HOME,
        tags,
    };
    const sector = {
        faction: 'RBiH',
        corps_id: 'arbih_2nd_corps',
        assigned_brigade_ids: [brigade.id],
        reserve_brigade_ids: [],
        sub_segments: [{ friendly_osids: [OUTSIDE_FRONT, LOCAL_FRONT] }],
    } as unknown as CorpsFrontSector;
    const state = {
        meta: { turn: 52, phase: 'war', seed: 'enclave-sector-march' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: { [brigade.id]: brigade },
            corps_front_sectors: { [SECTOR_ID]: sector },
        },
        political: {
            political_controllers: {
                [HOME]: 'RBiH',
                [LOCAL_FRONT]: 'RBiH',
                [OUTSIDE_FRONT]: 'RBiH',
            },
        },
        displacement: {},
    } as unknown as GameState;
    const frontOsids = new Set([OUTSIDE_FRONT, LOCAL_FRONT]);

    return {
        state,
        faction: 'RBiH',
        brigade,
        loc: HOME,
        corpsId: brigade.corps_id,
        cmd: null,
        directive: null,
        corpsStance: 'defensive',
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
        sectorAssignment: { sector, isReserve: false, frontOsids },
        assignedSectorFrontOsids: frontOsids,
        adjacency: new Map([
            [HOME, [OUTSIDE_FRONT, LOCAL_FRONT]],
            [OUTSIDE_FRONT, [HOME]],
            [LOCAL_FRONT, [HOME]],
        ]),
        reverseMap: new Map(),
        terrainCache: {},
        graphAnalysis: { osid_analysis: new Map() } as BrigadeEvaluationContext['graphAnalysis'],
        result: {
            posture_orders: [],
            attack_orders: {},
            attack_scores: {},
            movement_orders: {},
            column_march_orders: {},
            eligible_attackers_by_corps: {},
        },
    };
}

describe('enclave sector march destination invariant', () => {
    it.each([
        ['enclave-tagged', ['enclave']],
        ['fixed-home', ['placement:fixed_home_osid']],
    ])('%s defenders select only a destination in their own enclave', (_label, tags) => {
        const context = makeContext(tags);

        expect(evaluateSectorMarch(context)).toBe(true);
        expect(context.result.column_march_orders[context.brigade.id]).toBe(LOCAL_FRONT);
    });

    it('finalizes a fixed-home enclave defender in place when its sector has no local destination', () => {
        const context = makeContext(['enclave', 'placement:fixed_home_osid']);
        context.brigade.home_osid = ZEPA_HOME;
        context.brigade.location_osid = ZEPA_HOME;
        context.loc = ZEPA_HOME;
        context.state.political.political_controllers![ZEPA_HOME] = 'RBiH';
        const outsideOnlyFront = new Set([LOCAL_FRONT]);
        const sectorAssignment = context.sectorAssignment!;
        sectorAssignment.frontOsids = outsideOnlyFront;
        context.assignedSectorFrontOsids = outsideOnlyFront;
        sectorAssignment.sector.sub_segments = [{
            friendly_osids: [LOCAL_FRONT],
        }] as typeof sectorAssignment.sector.sub_segments;
        context.adjacency = new Map([
            [ZEPA_HOME, [LOCAL_FRONT]],
            [LOCAL_FRONT, [ZEPA_HOME]],
        ]);

        expect(evaluateSectorMarch(context)).toBe(true);
        expect(context.result.movement_orders[context.brigade.id]).toBeUndefined();
        expect(context.result.column_march_orders[context.brigade.id]).toBeUndefined();
        expect(context.result.posture_orders).toContainEqual({
            brigade_id: context.brigade.id,
            posture: 'defend',
        });
    });

    it('does not return an orphaned fixed-home defender to corps territory in another enclave', () => {
        const context = makeContext(['enclave', 'placement:fixed_home_osid']);
        context.brigade.home_osid = ZEPA_HOME;
        context.brigade.location_osid = ZEPA_HOME;
        context.loc = ZEPA_HOME;
        context.state.political.political_controllers![ZEPA_HOME] = 'RBiH';
        context.sectorAssignment = null;
        context.assignedSectorFrontOsids = null;
        context.corpsTerritoryOsidsByCorps = new Map([
            [context.brigade.corps_id!, new Set([LOCAL_FRONT])],
        ]);
        context.adjacency = new Map([
            [ZEPA_HOME, [LOCAL_FRONT]],
            [LOCAL_FRONT, [ZEPA_HOME]],
        ]);

        expect(evaluateReturnToCorps(context)).toBe(true);
        expect(context.result.movement_orders[context.brigade.id]).toBeUndefined();
        expect(context.result.posture_orders).toContainEqual({
            brigade_id: context.brigade.id,
            posture: 'defend',
        });
    });

    it('finalizes an enclave defender before generic interior movement when no sector route exists', () => {
        const context = makeContext(['enclave', 'placement:fixed_home_osid']);
        context.brigade.home_osid = ZEPA_HOME;
        context.brigade.location_osid = ZEPA_HOME;
        context.loc = ZEPA_HOME;
        context.state.political.political_controllers![ZEPA_HOME] = 'RBiH';
        context.state.military.corps_front_sectors = {};
        context.sectorAssignment = null;
        context.assignedSectorFrontOsids = null;

        expect(evaluateSectorMarch(context)).toBe(true);
        expect(context.result.movement_orders[context.brigade.id]).toBeUndefined();
        expect(context.result.column_march_orders[context.brigade.id]).toBeUndefined();
        expect(context.result.posture_orders).toContainEqual({
            brigade_id: context.brigade.id,
            posture: 'defend',
        });
    });
});
