import { describe, expect, it } from 'vitest';

import {
    OPERATION_OPPORTUNITY_CATALOG,
    applyOpportunityDecision,
    buildProposalId,
    evaluateAxes,
    isOpportunityEligible,
    linkOpportunityResolutionToAAR,
    runOpportunityEvaluationStep,
} from '../src/sim/combat/operation_opportunities.js';
import {
    CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES,
    VLASIC_RIDGE_95_OPPORTUNITY,
} from '../src/sim/combat/operation_opportunity_catalog_central_bosnia.js';
import type { OperationAAR } from '../src/sim/combat/operation_aar.js';
import type { CorpsCommandState, FactionId, GameState } from '../src/state/game_state.js';

const STAGING_ANCHORS = [
    'op:travnik:travnik_2',
    'op:travnik:turbe_2',
    'op:travnik:cukle_2',
];

const VLASIC_OBJECTIVES = [
    'op:travnik:gornje_krcevine',
    'op:travnik:paklarevo',
    'op:travnik:varosluk',
    'op:skender_vakuf:donji_koricani',
    'op:skender_vakuf:imljani_2',
    'op:skender_vakuf:javorani_2',
    'op:skender_vakuf:knezevo_2',
];

const VLASIC_BRIGADES = [
    'arbih_17th_vitezka_mountain',
    'arbih_706th_muslim_mountain',
    'arbih_712th_mountain',
    'arbih_727th_slavna',
    'arbih_737th_muslim_light',
    'arbih_705th_slavna_mountain',
];

function buildVlasicState(opts: {
    turn: number;
    alliance?: number;
    stagingHeld?: boolean;
    objectivesHeldByRs?: boolean;
    addCommanderState?: boolean;
    supplyPressure?: number;
    axisCoordinationLow?: boolean;
}): GameState {
    const cmd: CorpsCommandState = {
        command_span: 8,
        subordinate_count: 8,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 8,
        stance: 'offensive',
        active_operations: [],
        commander_state: (opts.addCommanderState ?? true)
            ? { current_plan: null, decision_trace: null, operation_history: [] } as unknown as CorpsCommandState['commander_state']
            : undefined,
    };

    const controllers: Record<string, FactionId> = {};
    for (const osid of STAGING_ANCHORS) {
        controllers[osid] = (opts.stagingHeld ?? true) ? 'RBiH' : 'RS';
    }
    for (const osid of VLASIC_OBJECTIVES) {
        controllers[osid] = (opts.objectivesHeldByRs ?? true) ? 'RS' : 'RBiH';
    }

    const formations: Record<string, unknown> = {};
    for (const id of VLASIC_BRIGADES) {
        formations[id] = {
            id,
            name: id,
            faction: 'RBiH',
            own_corps_cmd: 'arbih_3rd_corps',
            strength: 1400,
            officer_quality: opts.axisCoordinationLow ? 0.25 : 0.75,
            cohesion: opts.axisCoordinationLow ? 35 : 70,
            morale: opts.axisCoordinationLow ? 40 : 72,
            composition: {
                tanks: 0,
                artillery: 1,
                tank_condition: { operational: 0 },
                artillery_condition: { operational: 1 },
            },
        };
    }

    return {
        schema_version: 0,
        meta: { turn: opts.turn, seed: 'vlasic-test', phase: 'war' },
        factions: [{
            id: 'RBiH',
            capability_profile: {
                training_quality: opts.axisCoordinationLow ? 0.3 : 0.7,
                organizational_maturity: opts.axisCoordinationLow ? 0.3 : 0.7,
                equipment_access: 0.5,
                equipment_operational: 0.5,
                doctrine_effectiveness: { ATTACK: 0.6, COORDINATED_STRIKE: 0.6 },
            },
        }],
        military: {
            formations,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_command: { arbih_3rd_corps: cmd },
            faction_officer_maturity: { RBiH: opts.axisCoordinationLow ? 1.5 : 3.5 },
        },
        political: {
            political_controllers: controllers,
            war_alliance_rbih_hrhb: opts.alliance ?? 0.65,
            war_supply_pressure: { RBiH: opts.supplyPressure ?? 55 },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

describe('Central Bosnia / Vlasic operation opportunity catalog', () => {
    it('exposes Vlasic Ridge 95 through its family export and the canonical catalog', () => {
        expect(CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES).toEqual([VLASIC_RIDGE_95_OPPORTUNITY]);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'vlasic_ridge_95')).toBe(true);
        expect(VLASIC_RIDGE_95_OPPORTUNITY.family).toBe('central_bosnia_vlasic');
        expect(VLASIC_RIDGE_95_OPPORTUNITY.tier).toBe('T1');
        expect(VLASIC_RIDGE_95_OPPORTUNITY.faction).toBe('RBiH');
        expect(VLASIC_RIDGE_95_OPPORTUNITY.primary_corps).toBe('arbih_3rd_corps');
        expect(VLASIC_RIDGE_95_OPPORTUNITY.variants?.map(v => v.variant_id).sort())
            .toEqual(['bugojno_support', 'ridge_probe']);
    });

    it('surfaces inside the spring 1995 window when required axes and two optional axes are green', () => {
        const state = buildVlasicState({ turn: 156 });
        runOpportunityEvaluationStep(state, 156);

        const proposal = state.military.operation_opportunities
            ?.find(p => p.opportunity_id === 'vlasic_ridge_95');

        expect(proposal).toBeDefined();
        expect(proposal!.proposal_id).toBe('OPP_156_vlasic_ridge_95');
        expect(proposal!.status).toBe('eligible_pending_review');
        expect(proposal!.last_axis_evaluation).toHaveLength(10);
        expect(proposal!.redirect_variants?.map(v => v.variant_id).sort())
            .toEqual(['bugojno_support', 'ridge_probe']);
        expect(isOpportunityEligible(VLASIC_RIDGE_95_OPPORTUNITY, evaluateAxes(state, 156, VLASIC_RIDGE_95_OPPORTUNITY)))
            .toBe(true);
    });

    it('does not surface before/after window, under broken alliance, lost staging, or no enemy-held objectives', () => {
        const cases = [
            buildVlasicState({ turn: 151 }),
            buildVlasicState({ turn: 167 }),
            buildVlasicState({ turn: 156, alliance: 0.35 }),
            buildVlasicState({ turn: 156, stagingHeld: false }),
            buildVlasicState({ turn: 156, objectivesHeldByRs: false }),
        ];

        for (const state of cases) {
            runOpportunityEvaluationStep(state, state.meta.turn);
            expect((state.military.operation_opportunities ?? [])
                .find(p => p.opportunity_id === 'vlasic_ridge_95')).toBeUndefined();
        }
    });

    it('requires at least two optional axes; supply-red still passes if commander and force-quality are green', () => {
        const supplyRed = buildVlasicState({ turn: 156, supplyPressure: 95 });
        runOpportunityEvaluationStep(supplyRed, 156);
        const proposal = supplyRed.military.operation_opportunities
            ?.find(p => p.opportunity_id === 'vlasic_ridge_95');
        expect(proposal).toBeDefined();
        expect(proposal!.last_axis_evaluation.find(a => a.axis === 'logistics')?.green).toBe(false);
        expect(proposal!.last_axis_evaluation.find(a => a.axis === 'commander_confidence')?.green).toBe(true);
        expect(proposal!.last_axis_evaluation.find(a => a.axis === 'force_quality')?.green).toBe(true);

        const twoOptionalRed = buildVlasicState({
            turn: 153,
            supplyPressure: 95,
            addCommanderState: false,
        });
        runOpportunityEvaluationStep(twoOptionalRed, 153);
        expect((twoOptionalRed.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === 'vlasic_ridge_95')).toBeUndefined();
    });

    it('decline records a resolution without spawning an operation; approve and redirect use canonical op spawn', () => {
        const declineState = buildVlasicState({ turn: 156 });
        runOpportunityEvaluationStep(declineState, 156);
        const proposalId = buildProposalId('vlasic_ridge_95', 156);
        const declined = applyOpportunityDecision(declineState, 156, proposalId, 'decline');
        expect(declined?.status).toBe('declined');
        expect(declineState.military.corps_command!.arbih_3rd_corps.active_operations).toHaveLength(0);
        expect(declineState.military.operation_opportunity_resolutions)
            .toEqual([{ proposal_id: proposalId, opportunity_id: 'vlasic_ridge_95', response: 'decline', response_turn: 156 }]);

        const approveState = buildVlasicState({ turn: 156 });
        runOpportunityEvaluationStep(approveState, 156);
        const approved = applyOpportunityDecision(approveState, 156, proposalId, 'approve');
        expect(approved?.status).toBe('approved');
        expect(approveState.military.corps_command!.arbih_3rd_corps.active_operations[0].name)
            .toBe('Operation Vlasic Ridge');

        const redirectState = buildVlasicState({ turn: 156 });
        runOpportunityEvaluationStep(redirectState, 156);
        const redirected = applyOpportunityDecision(
            redirectState,
            156,
            proposalId,
            'redirect',
            undefined,
            { redirect_variant_id: 'ridge_probe' },
        );
        expect(redirected?.status).toBe('redirected');
        expect(redirected?.redirect_variant_id).toBe('ridge_probe');
        expect(redirectState.military.corps_command!.arbih_3rd_corps.active_operations[0].axes)
            .toHaveLength(1);
    });

    it('links partial AAR exit class deterministically for failed/partial outcomes', () => {
        const state = buildVlasicState({ turn: 156 });
        runOpportunityEvaluationStep(state, 156);
        const proposalId = buildProposalId('vlasic_ridge_95', 156);
        applyOpportunityDecision(state, 156, proposalId, 'approve');
        const aar: OperationAAR = {
            operation_id: 'arbih_3rd_corps:vlasic:t156',
            operation_name: 'Operation Vlasic Ridge',
            corps_id: 'arbih_3rd_corps',
            faction: 'RBiH',
            type: 'sector_attack',
            started_turn: 156,
            ended_turn: 161,
            outcome: 'partial',
            objectives_targeted: [...VLASIC_OBJECTIVES],
            objectives_captured: ['op:travnik:paklarevo'],
            duration_turns: 5,
            total_attacks: 4,
            casualties_suffered: { killed: 0, wounded: 0 },
            casualties_inflicted: { killed: 0, wounded: 0 },
            equipment_lost: { tanks: 0, artillery: 0 },
            equipment_destroyed: { tanks: 0, artillery: 0 },
            equipment_captured: { tanks: 0, artillery: 0 },
            participating_brigades: [...VLASIC_BRIGADES],
            initial_strength: 7000,
            final_strength: 6400,
            grade: {
                stars: 2,
                verdict: 'partial',
                factors: { objective_completion: 0.25, exchange_ratio: 1, tempo: 1, preservation: 0.9 },
            },
            weekly_log: [],
        };

        expect(linkOpportunityResolutionToAAR(state, aar)).toBe(true);
        expect(state.military.operation_opportunity_resolutions?.[0].exit_class).toBe('partial_success');
        expect(state.military.operation_opportunity_resolutions?.[0].executed_op_aar_id)
            .toBe('arbih_3rd_corps:vlasic:t156');
    });
});
