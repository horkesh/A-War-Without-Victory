import { describe, expect, it } from 'vitest';

import {
    OPERATION_OPPORTUNITY_CATALOG,
    applyOpportunityDecision,
    buildProposalId,
    evaluateAxes,
    isOpportunityEligible,
    runOpportunityEvaluationStep,
} from '../src/sim/combat/operation_opportunities.js';
import {
    FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES,
    MISTRAL_2_95_OPPORTUNITY,
} from '../src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.js';
import { OPERATION_STORM_EVENT_ID } from '../src/sim/combat/operation_storm_theater.js';
import { _TRIGGERED_OPS } from '../src/sim/combat/triggered_operations.js';
import type { CorpsCommandState, FactionId, GameState } from '../src/state/game_state.js';

const MISTRAL_STAGING_ANCHORS = [
    'op:livno:misi_2',
    'op:livno:livno_2',
];

const MISTRAL_CINCAR_DEPENDENCY_ANCHORS = [
    'op:kupres:bucovaca',
    'op:glamoc:glamoc_2',
];

const MISTRAL_OBJECTIVES = [
    'op:glamoc:halapic',
    'op:glamoc:stekerovci_2',
    'op:titov_drvar:prekaja_2',
    'op:titov_drvar:drvar_2',
    'op:titov_drvar:sipovljani_2',
    'op:bosansko_grahovo:crni_lug',
    'op:bosansko_grahovo:bosansko_grahovo_2',
    'op:bosansko_grahovo:malesevci',
    'op:bosansko_grahovo:ugarci',
    'op:sipovo:brdjani',
    'op:sipovo:gornji_mujdzici_2',
    'op:sipovo:sipovo_2',
    'op:sipovo:volari_2',
    'op:sipovo:pribeljci_2',
    'op:mrkonjic_grad:gerzovo_2',
    'op:mrkonjic_grad:mrkonjic_grad_2',
    'op:mrkonjic_grad:bjelajce_2',
    'op:mrkonjic_grad:baljvine_2',
    'op:mrkonjic_grad:majdan_2',
    'op:mrkonjic_grad:podrasnica_2',
];

const MISTRAL_BRIGADES = [
    'hvo_1st_guard_abb',
    'hrhb_kralj_petar_kreimir_iv_brigade',
    'hrhb_kralj_tomislav_brigade',
    'hv_4th_guards_split',
    'hv_7th_guards_varazdin',
];

function makeCommand(opts: { addCommanderState?: boolean; axisCoordinationLow?: boolean } = {}): CorpsCommandState {
    return {
        command_span: 7,
        subordinate_count: 7,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 9,
        stance: 'offensive',
        active_operations: [],
        commander_state: (opts.addCommanderState ?? true)
            ? { current_plan: null, decision_trace: null, operation_history: [] } as unknown as CorpsCommandState['commander_state']
            : undefined,
    };
}

function buildMistralState(opts: {
    turn: number;
    alliance?: number;
    stormFired?: boolean;
    stagingHeld?: boolean;
    dependencyHeld?: boolean;
    objectivesHeldByRs?: boolean;
    addCommanderState?: boolean;
    supplyPressure?: number;
    supplyCondition?: number;
    axisCoordinationLow?: boolean;
}): GameState {
    const controllers: Record<string, FactionId> = {};
    for (const osid of MISTRAL_STAGING_ANCHORS) {
        controllers[osid] = (opts.stagingHeld ?? true) ? 'HRHB' : 'RS';
    }
    for (const osid of MISTRAL_CINCAR_DEPENDENCY_ANCHORS) {
        controllers[osid] = (opts.dependencyHeld ?? true) ? 'HRHB' : 'RS';
    }
    for (const osid of MISTRAL_OBJECTIVES) {
        controllers[osid] = (opts.objectivesHeldByRs ?? true) ? 'RS' : 'HRHB';
    }

    const formations: Record<string, unknown> = {};
    for (const id of MISTRAL_BRIGADES) {
        formations[id] = {
            id,
            name: id,
            faction: 'HRHB',
            own_corps_cmd: id === 'hvo_1st_guard_abb' ? 'hvo_main_staff' : 'hvo_tomislavgrad',
            strength: 1500,
            officer_quality: opts.axisCoordinationLow ? 0.25 : 0.72,
            cohesion: opts.axisCoordinationLow ? 34 : 70,
            morale: opts.axisCoordinationLow ? 40 : 72,
            composition: {
                tanks: 1,
                artillery: 2,
                tank_condition: { operational: 1 },
                artillery_condition: { operational: 2 },
            },
            tags: id.startsWith('hv_') ? ['hv_origin'] : [],
        };
    }

    const stormFired = opts.stormFired ?? true;
    return {
        schema_version: 0,
        meta: {
            turn: opts.turn,
            seed: 'mistral-test',
            phase: 'war',
            hv_brigades_spawned: true,
            ...(stormFired ? { operation_storm_turn: 172 } : {}),
        },
        factions: [{
            id: 'HRHB',
            capability_profile: {
                training_quality: opts.axisCoordinationLow ? 0.3 : 0.7,
                organizational_maturity: opts.axisCoordinationLow ? 0.3 : 0.7,
                equipment_access: 0.7,
                equipment_operational: 0.7,
                doctrine_effectiveness: { ATTACK: 0.65, COORDINATED_STRIKE: 0.65 },
            },
        }],
        military: {
            formations,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            fired_event_ids: stormFired ? [OPERATION_STORM_EVENT_ID] : [],
            event_last_fired_turn: stormFired ? { [OPERATION_STORM_EVENT_ID]: 172 } : {},
            corps_command: {
                hvo_main_staff: makeCommand({
                    addCommanderState: opts.addCommanderState,
                    axisCoordinationLow: opts.axisCoordinationLow,
                }),
                hvo_tomislavgrad: makeCommand({
                    addCommanderState: opts.addCommanderState,
                    axisCoordinationLow: opts.axisCoordinationLow,
                }),
            },
            faction_officer_maturity: { HRHB: opts.axisCoordinationLow ? 1.5 : 3.5 },
        },
        political: {
            political_controllers: controllers,
            war_alliance_rbih_hrhb: opts.alliance ?? 0.7,
            war_supply_pressure: { HRHB: opts.supplyPressure ?? 55 },
            ...(typeof opts.supplyCondition === 'number' ? { war_supply_condition: { HRHB: opts.supplyCondition } } : {}),
            rbih_hrhb_state: { washington_signed: true, washington_turn: 85 },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

function addVrsKrajinaDefenderCorps(
    state: GameState,
    opts: { degraded?: boolean; equipmentMultiplier?: number } = {},
): void {
    const degraded = opts.degraded ?? false;
    state.factions.push({
        id: 'RS',
        capability_profile: {
            training_quality: degraded ? 0.25 : 0.75,
            organizational_maturity: degraded ? 0.25 : 0.75,
            equipment_access: degraded ? 0.35 : 0.8,
            equipment_operational: degraded ? 0.35 : 0.8,
            doctrine_effectiveness: { ATTACK: degraded ? 0.3 : 0.75 },
        },
    } as unknown as GameState['factions'][number]);
    state.military.corps_command ??= {};
    state.military.corps_command.vrs_2nd_krajina = {
        command_span: 7,
        subordinate_count: 3,
        og_slots: 0,
        active_ogs: [],
        corps_exhaustion: degraded ? 70 : 5,
        stance: 'defensive',
        active_operations: [],
        commander_state: {
            current_plan: null,
            decision_trace: null,
            operation_history: degraded
                ? [
                    { operation_name: 'Krajina Line', ended_turn: 170, outcome: 'failure' },
                    { operation_name: 'Storm Spillover', ended_turn: 172, outcome: 'failure' },
                ]
                : [],
        } as unknown as CorpsCommandState['commander_state'],
    };
    state.military.faction_officer_maturity = {
        ...(state.military.faction_officer_maturity ?? {}),
        RS: degraded ? 1.4 : 4.2,
    };
    if (typeof opts.equipmentMultiplier === 'number') {
        state.military.equipment_quality_modifiers = [{
            faction: 'RS',
            multiplier: opts.equipmentMultiplier,
            expires_turn: 999,
        }];
    }
    for (let i = 0; i < 3; i++) {
        state.military.formations[`rs_krajina_test_${i}`] = {
            id: `rs_krajina_test_${i}`,
            name: `RS Krajina test ${i}`,
            kind: 'brigade',
            status: 'active',
            faction: 'RS',
            corps_id: 'vrs_2nd_krajina',
            strength: degraded ? 650 : 1800,
            officer_quality: degraded ? 0.28 : 0.78,
            cohesion: degraded ? 22 : 78,
            morale: degraded ? 18 : 76,
            composition: {
                tanks: degraded ? 0 : 2,
                artillery: degraded ? 1 : 4,
                tank_condition: { operational: degraded ? 0 : 2 },
                artillery_condition: { operational: degraded ? 1 : 4 },
            },
        } as unknown as GameState['military']['formations'][string];
    }
}

describe('Federation / Western Bosnia operation opportunity catalog', () => {
    it('exposes Mistral 2 through its family export and the canonical catalog', () => {
        expect(FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES.map(op => op.opportunity_id))
            .toEqual(['mistral_1_95', 'mistral_2_95', 'jajce_95']);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'mistral_2_95')).toBe(true);
        expect(_TRIGGERED_OPS.some(def => def.name === 'Operation Mistral 2')).toBe(false);
        expect(MISTRAL_2_95_OPPORTUNITY.family).toBe('federation_western_bosnia');
        expect(MISTRAL_2_95_OPPORTUNITY.tier).toBe('T1');
        expect(MISTRAL_2_95_OPPORTUNITY.faction).toBe('HRHB');
        expect(MISTRAL_2_95_OPPORTUNITY.primary_corps).toBe('hvo_tomislavgrad');
        expect(MISTRAL_2_95_OPPORTUNITY.variants?.map(v => v.variant_id).sort())
            .toEqual(['drvar_grahovo_axis', 'sipovo_mrkonjic_axis']);
    });

    it('surfaces Mistral 2 after Storm rupture and Cincar/Kupres dependency anchors are live', () => {
        const state = buildMistralState({ turn: 180 });
        runOpportunityEvaluationStep(state, 180);

        const proposal = state.military.operation_opportunities
            ?.find(p => p.opportunity_id === 'mistral_2_95');

        expect(proposal).toBeDefined();
        expect(proposal!.proposal_id).toBe('OPP_180_mistral_2_95');
        expect(proposal!.status).toBe('eligible_pending_review');
        expect(proposal!.last_axis_evaluation).toHaveLength(10);
        expect(proposal!.redirect_variants?.map(v => v.variant_id).sort())
            .toEqual(['drvar_grahovo_axis', 'sipovo_mrkonjic_axis']);
        expect(isOpportunityEligible(
            MISTRAL_2_95_OPPORTUNITY,
            evaluateAxes(state, 180, MISTRAL_2_95_OPPORTUNITY),
        )).toBe(true);
    });

    it('uses live supply condition instead of saturated cumulative pressure for logistics gates', () => {
        const state = buildMistralState({ turn: 180, supplyPressure: 100, supplyCondition: 100 });
        runOpportunityEvaluationStep(state, 180);

        const proposal = state.military.operation_opportunities
            ?.find(p => p.opportunity_id === 'mistral_2_95');
        const logistics = proposal?.last_axis_evaluation.find(axis => axis.axis === 'logistics');

        expect(logistics).toMatchObject({
            axis: 'logistics',
            green: true,
        });
    });

    it('blocks Mistral 2 before/after window, before Storm, without Cincar dependency, or without enemy targets', () => {
        const cases = [
            buildMistralState({ turn: 174 }),
            buildMistralState({ turn: 191 }),
            buildMistralState({ turn: 180, stormFired: false }),
            buildMistralState({ turn: 180, dependencyHeld: false }),
            buildMistralState({ turn: 180, objectivesHeldByRs: false }),
        ];

        for (const state of cases) {
            runOpportunityEvaluationStep(state, state.meta.turn);
            expect((state.military.operation_opportunities ?? [])
                .find(p => p.opportunity_id === 'mistral_2_95')).toBeUndefined();
        }
    });

    it('requires VRS Krajina trajectory weakness when defender-corps evidence is available', () => {
        const healthyDefender = buildMistralState({ turn: 180 });
        addVrsKrajinaDefenderCorps(healthyDefender);
        runOpportunityEvaluationStep(healthyDefender, 180);
        expect((healthyDefender.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === 'mistral_2_95')).toBeUndefined();

        const degradedDefender = buildMistralState({ turn: 180 });
        addVrsKrajinaDefenderCorps(degradedDefender, { degraded: true, equipmentMultiplier: 0.70 });
        runOpportunityEvaluationStep(degradedDefender, 180);
        const proposal = (degradedDefender.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === 'mistral_2_95');
        expect(proposal).toBeDefined();
        expect(proposal!.last_axis_evaluation.find(a => a.axis === 'enemy_weakness')?.green)
            .toBe(true);
    });

    it('spawns Mistral 2 as a multi-axis opportunity through the canonical path', () => {
        const state = buildMistralState({ turn: 180 });
        runOpportunityEvaluationStep(state, 180);
        const proposalId = buildProposalId('mistral_2_95', 180);

        const approved = applyOpportunityDecision(state, 180, proposalId, 'approve');

        expect(approved?.status).toBe('approved');
        const op = state.military.corps_command!.hvo_tomislavgrad.active_operations[0];
        expect(op.name).toBe('Operation Mistral 2');
        expect(op.axes).toHaveLength(2);
        expect(op.axes!.map(axis => axis.axis_id).sort()).toEqual(['mistral_drvar_grahovo', 'mistral_sipovo_mrkonjic']);
    });
});
