import { afterEach, describe, expect, it } from 'vitest';

import {
    applyOpportunityDecisionDetailed,
    preflightOpportunityAdmission,
    type OperationOpportunityDef,
} from '../src/sim/combat/operation_opportunities.js';
import { JAJCE_95_OPPORTUNITY } from '../src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.js';
import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import { advanceSectorOffensives } from '../src/sim/combat/sector_offensive.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';
import {
    canFormationReachAssemblyInTime,
    collectObjectiveApproachOsids,
    evaluateOpeningAttackReadiness,
} from '../src/sim/combat/sector_offensive_launch_helpers.js';
import {
    ASSEMBLY_THRESHOLD,
    COUNTER_PROBE_CONFIDENCE_GAIN,
    PROBE_FORCE_COMMITMENT_FACTOR,
} from '../src/sim/combat/operation_preparation.js';
import type { CorpsOperation, FormationId, FormationState, GameState } from '../src/state/game_state.js';

const CORPS = 'arbih_3rd_corps' as FormationId;
const ID_705 = 'arbih_705th_slavna_mountain' as FormationId;
const ID_707 = 'arbih_707th_slavna_mountain' as FormationId;
const ID_717 = 'arbih_717th_slavna_mountain' as FormationId;
const ID_770 = 'arbih_770th_slavna_mountain' as FormationId;
const GRDOVO = 'op:jajce:grdovo';
const PRUSAC = 'op:donji_vakuf:prusac_2';
const PRIBRACA = 'op:donji_vakuf:pribraca_2';
const DONJI_VAKUF = 'op:donji_vakuf:donji_vakuf_2';
const KOMAR = 'op:donji_vakuf:komar_2';
const OBORCI = 'op:donji_vakuf:oborci_2';
const BUGOJNO = 'op:bugojno:gracanica';

const LIGHT_COMPOSITION = {
    infantry: 1800,
    tanks: 0,
    artillery: 5,
    aa_systems: 0,
    tank_condition: { operational: 1 },
    artillery_condition: { operational: 1 },
} as FormationState['composition'];

const STATIC_APPROACH_GRAPH = new Map<string, string[]>([
    [PRUSAC, [PRIBRACA]],
    [PRIBRACA, [PRUSAC, DONJI_VAKUF]],
    [DONJI_VAKUF, [PRIBRACA, KOMAR]],
    [KOMAR, [DONJI_VAKUF, GRDOVO]],
    [GRDOVO, [KOMAR]],
]);

const STATIC_APPROACH_EDGES = [
    { a: PRUSAC, b: PRIBRACA },
    { a: PRIBRACA, b: DONJI_VAKUF },
    { a: DONJI_VAKUF, b: KOMAR },
    { a: KOMAR, b: GRDOVO },
];

function setReasonCodes(value: string | undefined): void {
    if (value === undefined) {
        delete process.env.AWWV_DEBUG_REASON_CODES;
    } else {
        process.env.AWWV_DEBUG_REASON_CODES = value;
    }
    resetReasonCodeTopicCacheForTests();
}

afterEach(() => setReasonCodes(undefined));

function controlWithout717(): OperationOpportunityDef {
    return {
        ...JAJCE_95_OPPORTUNITY,
        axes: JAJCE_95_OPPORTUNITY.axes.map((axis) => ({
            ...axis,
            brigades: axis.brigades.filter((id) => id !== ID_717),
        })),
    };
}

function brigade(
    id: FormationId,
    location: string,
    sectorId: string,
    turn: number,
    role: 'front' | 'reserve' | 'rear' = 'front',
): FormationState {
    return {
        id,
        name: id,
        kind: 'brigade',
        faction: 'RBiH',
        corps_id: CORPS,
        status: 'active',
        personnel: id === ID_717 ? 1800 : 1500,
        cohesion: 75,
        morale: 75,
        ops: { fatigue: 0, last_supplied_turn: turn },
        disrupted_turns: 0,
        readiness: 'active',
        created_turn: 0,
        location_osid: location,
        assignment: { kind: 'sector', role, sector_id: sectorId },
        composition: LIGHT_COMPOSITION,
    };
}

function stateAt(turn: 180 | 182 | 183 | 184): GameState {
    const nearSector = turn < 183 ? 'sector:arbih_3rd_corps:5' : 'sector:arbih_3rd_corps:0';
    const sector717 = turn < 183 ? 'sector:arbih_3rd_corps:6' : nearSector;
    const role717 = turn === 184 ? 'rear' : 'front';
    const donjiVakufOperation = {
        name: 'Operation Donji Vakuf',
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 178,
        phase_started_turn: 179,
        participating_brigades: [ID_705, ID_707],
        objectives: [OBORCI],
        current_objective_index: 0,
        commander_officer_id: 'officer_donji_vakuf',
    } as CorpsOperation;
    const controllers: Record<string, string> = {
        [PRUSAC]: 'RBiH',
        [PRIBRACA]: 'RBiH',
        [DONJI_VAKUF]: 'RBiH',
        [KOMAR]: 'RBiH',
        [OBORCI]: 'RS',
        [BUGOJNO]: 'RBiH',
        [GRDOVO]: 'RS',
    };

    return {
        schema_version: 0,
        meta: { turn, seed: 'grdovo-717-fixture', phase: 'war', supply_reserves_enabled: false },
        factions: [{ id: 'RBiH' }, { id: 'RS' }],
        military: {
            formations: {
                [CORPS]: {
                    id: CORPS,
                    name: 'ARBiH 3rd Corps',
                    kind: 'corps',
                    faction: 'RBiH',
                    status: 'active',
                } as FormationState,
                [ID_705]: { ...brigade(ID_705, BUGOJNO, nearSector, turn), posture: 'attack' },
                [ID_707]: { ...brigade(ID_707, BUGOJNO, nearSector, turn), posture: 'attack' },
                [ID_717]: {
                    ...brigade(ID_717, PRUSAC, sector717, turn, role717),
                    ...(role717 === 'rear' ? { assigned_sub_segment_id: undefined } : { assigned_sub_segment_id: `subseg:${sector717}:0` }),
                },
                [ID_770]: brigade(ID_770, KOMAR, nearSector, turn),
            },
            corps_command: {
                [CORPS]: {
                    command_span: 6,
                    subordinate_count: 4,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [donjiVakufOperation],
                },
            },
            corps_front_sectors: {
                [nearSector]: {
                    sector_id: nearSector,
                    corps_id: CORPS,
                    faction: 'RBiH',
                    edge_ids: [`${KOMAR}__${GRDOVO}`],
                    territory_osids: [DONJI_VAKUF, PRIBRACA, KOMAR],
                    sub_segments: [{
                        sub_segment_id: `subseg:${nearSector}:0`,
                        edge_ids: [`${KOMAR}__${GRDOVO}`],
                        friendly_osids: [KOMAR],
                        enemy_osids: [GRDOVO],
                    }],
                    assigned_brigade_ids: turn === 183
                        ? [ID_705, ID_707, ID_770, ID_717]
                        : [ID_705, ID_707, ID_770],
                    reserve_brigade_ids: [],
                    rear_brigade_ids: turn === 184 ? [ID_717] : [],
                },
                ...(sector717 !== nearSector ? {
                    [sector717]: {
                        sector_id: sector717,
                        corps_id: CORPS,
                        faction: 'RBiH',
                        edge_ids: [],
                        territory_osids: [PRUSAC],
                        sub_segments: [{
                            sub_segment_id: `subseg:${sector717}:0`,
                            edge_ids: [],
                            friendly_osids: [PRUSAC],
                            enemy_osids: [],
                        }],
                        assigned_brigade_ids: [ID_717],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                    },
                } : {}),
            },
            sector_intel: {
                [nearSector]: [{
                    enemy_sector_id: 'sector:vrs_jajce:0',
                    enemy_faction: 'RS',
                    enemy_corps_id: 'vrs_2nd_krajina_corps',
                    front_edge_count: 1,
                    strength_category: 'thin',
                    posture_observed: 'defensive',
                    offensive_signs: false,
                    confidence: 1,
                    turns_in_contact: 3,
                    visible_brigade_ids: [],
                    last_updated_turn: turn,
                }],
            },
            war_front_edges_osid: [{
                edge_id: `${KOMAR}__${GRDOVO}`,
                a: KOMAR,
                b: GRDOVO,
                side_a: 'RBiH',
                side_b: 'RS',
            }],
            brigade_movement_orders: {},
            brigade_movement_state: {},
            named_officer_data: [{
                id: 'officer_jajce',
                name: 'Officer Jajce',
                faction: 'RBiH',
                rank: 'corps_commander',
                competence: 4,
                aggressiveness: 4,
                defensive_skill: 3,
                political_reliability: 3,
                home_corps_id: CORPS,
                available_from_turn: 0,
                origin: 'arbih',
                casualty_vulnerability: 0,
                can_improve: false,
                improvement_rate: 0,
                pool_tier: 'tier_a',
            }],
            named_officers: {
                officer_donji_vakuf: {
                    officer_id: 'officer_donji_vakuf',
                    status: 'active',
                    assigned_corps_id: CORPS,
                    assigned_operation: donjiVakufOperation.name,
                },
                officer_jajce: {
                    officer_id: 'officer_jajce',
                    status: 'reserve',
                    assigned_corps_id: null,
                    turns_in_command: 0,
                    battles: 0,
                    victories: 0,
                    effective_competence_penalty: 0,
                    penalty_turns_remaining: 0,
                    acting_commander: false,
                },
            },
            operation_opportunities: [{
                opportunity_id: JAJCE_95_OPPORTUNITY.opportunity_id,
                proposal_id: `OPP_${turn}_${JAJCE_95_OPPORTUNITY.opportunity_id}`,
                eligibility_turn: turn,
                expires_turn: 184,
                status: 'eligible_pending_review',
                approver_faction: 'RBiH',
            }],
        },
        political: { political_controllers: controllers },
        displacement: {},
        operation_history: [],
    } as unknown as GameState;
}

function spawnedJajceOperation(state: GameState): CorpsOperation {
    return state.military.corps_command![CORPS]!.active_operations.find(
        (op) => op.name === JAJCE_95_OPPORTUNITY.name,
    )!;
}

describe('589 — production 717th Grdovo delivery', () => {
    it.each([180, 182, 183, 184] as const)(
        'admits the production roster in assignment case %i while the explicit no-717 control stays below the floor',
        (turn) => {
            const state = stateAt(turn);
            const before = JSON.stringify(state);

            expect(preflightOpportunityAdmission(
                state,
                JAJCE_95_OPPORTUNITY,
                JAJCE_95_OPPORTUNITY.axes,
                'standard',
                turn,
            )).toEqual({
                admitted: true,
                selected_participants: 2,
                required_participants: 2,
                reason: null,
            });
            expect(preflightOpportunityAdmission(
                state,
                controlWithout717(),
                controlWithout717().axes,
                'standard',
                turn,
            )).toEqual({
                admitted: false,
                selected_participants: 1,
                required_participants: 2,
                reason: 'below_minimum_brigades (1/2)',
            });
            expect(JSON.stringify(state)).toBe(before);
        },
    );

    it('spawns one stable Jajce operation with exactly 717th + 770th and preserves Donji Vakuf ownership', () => {
        const state = stateAt(180);
        const donjiBefore = structuredClone(state.military.corps_command![CORPS]!.active_operations[0]);

        expect(applyOpportunityDecisionDetailed(
            state,
            180,
            'OPP_180_jajce_95',
            'approve',
            [JAJCE_95_OPPORTUNITY],
            { commitment_profile: 'standard' },
        )).toMatchObject({ decision_applied: true, reason: null });

        const jajce = spawnedJajceOperation(state);
        expect(jajce.name).toBe('Operation Jajce Recovery');
        expect(state.military.operation_opportunities![0]!.opportunity_id).toBe('jajce_95');
        expect(state.military.operation_opportunities![0]!.executed_op_id).toBe('Operation Jajce Recovery');
        expect(jajce.started_turn).toBe(180);
        expect(jajce.planning_duration).toBe(3);
        expect(jajce.min_attack_outcome).toBe('repulsed');
        expect(jajce.participating_brigades).toEqual([ID_717, ID_770]);
        expect(jajce.axes).toHaveLength(1);
        expect(jajce.axes![0]!.assigned_brigades).toEqual([ID_770, ID_717]);
        expect(new Set(jajce.participating_brigades).size).toBe(2);
        expect(jajce.commander_officer_id).toBe('officer_jajce');
        expect(state.military.named_officers!.officer_jajce).toMatchObject({
            status: 'active',
            assigned_operation: 'Operation Jajce Recovery',
        });
        expect(state.military.corps_command![CORPS]!.active_operations[0]).toEqual(donjiBefore);
        expect(state.military.named_officers!.officer_donji_vakuf!.assigned_operation)
            .toBe('Operation Donji Vakuf');
    });

    it.each([180, 182, 183, 184] as const)(
        'finds the real Grdovo approach and a timely Prusac route in assignment case %i',
        (turn) => {
            const state = stateAt(turn);
            const nearSector = turn < 183 ? 'sector:arbih_3rd_corps:5' : 'sector:arbih_3rd_corps:0';
            const sector717 = turn < 183 ? 'sector:arbih_3rd_corps:6' : nearSector;
            const role717 = turn === 184 ? 'rear' : 'front';
            const formation717 = state.military.formations![ID_717]!;
            expect(formation717.assignment).toEqual({
                kind: 'sector',
                role: role717,
                sector_id: sector717,
            });
            expect(formation717.assigned_sub_segment_id).toBe(
                role717 === 'rear' ? undefined : `subseg:${sector717}:0`,
            );
            expect(state.military.corps_front_sectors![nearSector]!.assigned_brigade_ids).toEqual(
                turn === 183
                    ? [ID_705, ID_707, ID_770, ID_717]
                    : [ID_705, ID_707, ID_770],
            );
            expect(state.military.corps_front_sectors![nearSector]!.rear_brigade_ids)
                .toEqual(turn === 184 ? [ID_717] : []);
            if (sector717 !== nearSector) {
                expect(state.military.corps_front_sectors![sector717]!.assigned_brigade_ids)
                    .toEqual([ID_717]);
            }
            expect([...collectObjectiveApproachOsids(state, CORPS, 'RBiH', [GRDOVO], STATIC_APPROACH_GRAPH)])
                .toEqual([KOMAR]);
            expect(canFormationReachAssemblyInTime(
                state,
                ID_717,
                CORPS,
                'RBiH',
                GRDOVO,
                JAJCE_95_OPPORTUNITY.planning_duration,
                STATIC_APPROACH_GRAPH,
                new Map(),
                { by_sid: {} },
            )).toBe(true);
        },
    );

    it('rejects the same 717th when the real Prusac-to-shoulder corridor is broken', () => {
        const state = stateAt(180);
        const broken = new Map(STATIC_APPROACH_GRAPH);
        broken.set(PRIBRACA, [PRUSAC]);
        broken.set(DONJI_VAKUF, [KOMAR]);

        expect(canFormationReachAssemblyInTime(
            state,
            ID_717,
            CORPS,
            'RBiH',
            GRDOVO,
            JAJCE_95_OPPORTUNITY.planning_duration,
            broken,
            new Map(),
            { by_sid: {} },
        )).toBe(false);
    });

    it('issues and completes the operation-owned 717th march before the real lifecycle enters execution', () => {
        const state = stateAt(180);
        const withoutJajce = structuredClone(state);

        generateAllBotOrdersOsid(withoutJajce, ['RBiH'], {
            edges: STATIC_APPROACH_EDGES as never,
            adjacency: STATIC_APPROACH_GRAPH,
            reverseMap: new Map(),
            supplyStateByOsid: {} as never,
            osidPopulationMap: new Map(),
        }, {
            brigadeFilter: (formation) => formation.id === ID_717,
        });
        expect(withoutJajce.military.brigade_movement_orders?.[ID_717]).toBeUndefined();

        expect(applyOpportunityDecisionDetailed(
            state,
            180,
            'OPP_180_jajce_95',
            'approve',
            [JAJCE_95_OPPORTUNITY],
        )).toMatchObject({ decision_applied: true, reason: null });
        const op = spawnedJajceOperation(state);

        setReasonCodes('dispatcher_decision');
        const botDiagnostics = generateAllBotOrdersOsid(state, ['RBiH'], {
            edges: STATIC_APPROACH_EDGES as never,
            adjacency: STATIC_APPROACH_GRAPH,
            reverseMap: new Map(),
            supplyStateByOsid: {} as never,
            osidPopulationMap: new Map(),
        }, {
            brigadeFilter: (formation) => formation.id === ID_717 || formation.id === ID_770,
        });
        setReasonCodes(undefined);
        expect(botDiagnostics.dispatcher_decision_details?.find((detail) => detail.formation_id === ID_717))
            .toMatchObject({
                first_handler: 'sector_attack',
                operation_name: 'Operation Jajce Recovery',
                operation_axis_id: 'jajce_recovery_near',
                operation_current_objective: GRDOVO,
                final_generated_output: {
                    column_march_destination_osid: KOMAR,
                },
            });
        expect(state.military.brigade_movement_orders?.[ID_717]).toMatchObject({
            destination_sids: [KOMAR],
            stance: 'column',
            owner: 'bot_discretionary',
        });
        expect(state.military.formations![ID_717]!.location_osid).toBe(PRUSAC);

        state.meta.turn = 181;
        const started = processOsidColumnMovement(
            state,
            STATIC_APPROACH_EDGES as never,
            new Map(),
            { by_sid: {} },
            STATIC_APPROACH_GRAPH,
        );
        expect(started).toMatchObject({ column_starts: 1, column_blocked: 0 });
        expect(state.military.brigade_movement_state?.[ID_717]).toMatchObject({
            status: 'in_transit',
            destination_sids: [KOMAR],
        });
        expect(state.military.formations![ID_717]!.location_osid).toBe(PRUSAC);
        advanceSectorOffensives(state, undefined, undefined, STATIC_APPROACH_GRAPH);
        expect(op.phase).toBe('planning');

        state.meta.turn = 182;
        const arrived = processOsidColumnMovement(
            state,
            STATIC_APPROACH_EDGES as never,
            new Map(),
            { by_sid: {} },
            STATIC_APPROACH_GRAPH,
        );

        expect(arrived).toMatchObject({ column_arrivals: 1, column_blocked: 0 });
        expect(state.military.formations![ID_717]!.location_osid).toBe(KOMAR);
        expect(state.military.brigade_movement_state?.[ID_717]).toBeUndefined();
        advanceSectorOffensives(state, undefined, undefined, STATIC_APPROACH_GRAPH);
        expect(op).toMatchObject({
            phase: 'execution',
            phase_started_turn: 182,
            recovery_reason: undefined,
        });
        expect(op.participating_brigades).toEqual([ID_717, ID_770]);
        expect(op.axes?.[0]?.assigned_brigades).toEqual([ID_770, ID_717]);
        expect(state.military.corps_command![CORPS]!.active_operations[0]).toMatchObject({
            name: 'Operation Donji Vakuf',
            phase: 'execution',
            participating_brigades: [ID_705, ID_707],
            commander_officer_id: 'officer_donji_vakuf',
        });
        expect(state.military.named_officers!.officer_jajce).toMatchObject({
            status: 'active',
            assigned_operation: 'Operation Jajce Recovery',
        });
        expect(state.military.named_officers!.officer_donji_vakuf!.assigned_operation)
            .toBe('Operation Donji Vakuf');

        expect(evaluateOpeningAttackReadiness(state, CORPS, 'RBiH', op, STATIC_APPROACH_GRAPH))
            .toEqual({ executable: true });

        state.military.war_front_edges_osid = [];
        state.military.corps_front_sectors = {};
        expect(evaluateOpeningAttackReadiness(state, CORPS, 'RBiH', op, STATIC_APPROACH_GRAPH))
            .toEqual({ executable: false, blocker: 'no_approach_osid' });
    });

    it('keeps minimum and probe policy constants unchanged', () => {
        const state = stateAt(180);
        expect(preflightOpportunityAdmission(
            state,
            JAJCE_95_OPPORTUNITY,
            JAJCE_95_OPPORTUNITY.axes,
            'minimum',
            180,
        ))
            .toMatchObject({ admitted: true, selected_participants: 2, required_participants: 2 });
        expect(ASSEMBLY_THRESHOLD).toBe(0.6);
        expect(PROBE_FORCE_COMMITMENT_FACTOR).toBe(0.4);
        expect(COUNTER_PROBE_CONFIDENCE_GAIN).toBe(0.15);
    });
});
