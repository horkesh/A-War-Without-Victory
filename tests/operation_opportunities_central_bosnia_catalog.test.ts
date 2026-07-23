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
    DONJI_VAKUF_95_OPPORTUNITY,
    KUPRES_CINCAR_94_OPPORTUNITY,
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

const DONJI_VAKUF_STAGING_ANCHORS = [
    'op:travnik:turbe_2',
    'op:bugojno:gracanica',
    'op:bugojno:kopcic_2',
];

const DONJI_VAKUF_OBJECTIVES = [
    'op:donji_vakuf:komar_2',
    'op:donji_vakuf:donji_vakuf_2',
    'op:donji_vakuf:babin_potok_2',
    'op:donji_vakuf:kutanja',
    'op:donji_vakuf:torlakovac_2',
    'op:donji_vakuf:pribraca_2',
    'op:donji_vakuf:prusac_2',
    'op:donji_vakuf:jemanlici',
    'op:donji_vakuf:korenici',
    'op:donji_vakuf:oborci_2',
];

const DONJI_VAKUF_BRIGADES = [
    'arbih_17th_vitezka_mountain',
    'arbih_705th_slavna_mountain',
    'arbih_706th_muslim_mountain',
    'arbih_707th_slavna_mountain',
    'arbih_727th_slavna',
];

const KUPRES_STAGING_ANCHORS = [
    'op:livno:livno_2',
    'op:duvno:tomislavgrad_2',
    'op:kupres:kupres_2',
    'op:kupres:goravci',
];

const KUPRES_OBJECTIVES = [
    'op:kupres:bucovaca',
    'op:kupres:donji_malovan',
    'op:kupres:novo_selo_2',
];

const KUPRES_GLAMOC_SHOULDER_OBJECTIVES = [
    'op:glamoc:glamoc_2',
    'op:glamoc:pribelja',
    'op:glamoc:vidimlije_2',
];

const KUPRES_BRIGADES = [
    'hrhb_kralj_petar_kreimir_iv_brigade',
    'hrhb_kralj_tomislav_brigade',
    'hv_5th_guards_karlovac',
    'hv_7th_guards_varazdin',
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
            kind: 'brigade',
            status: 'active',
            faction: 'RBiH',
            corps_id: 'arbih_3rd_corps',
            personnel: 1400,
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

function buildDonjiVakufState(opts: {
    turn: number;
    stormRuptured?: boolean;
    stagingHeld?: boolean;
    objectivesHeldByRs?: boolean;
    addCommanderState?: boolean;
    supplyPressure?: number;
    axisCoordinationLow?: boolean;
}): GameState {
    const cmd: CorpsCommandState = {
        command_span: 4,
        subordinate_count: 4,
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
    for (const osid of DONJI_VAKUF_STAGING_ANCHORS) {
        controllers[osid] = (opts.stagingHeld ?? true) ? 'RBiH' : 'RS';
    }
    for (const osid of DONJI_VAKUF_OBJECTIVES) {
        controllers[osid] = (opts.objectivesHeldByRs ?? true) ? 'RS' : 'RBiH';
    }

    const formations: Record<string, unknown> = {};
    for (const id of DONJI_VAKUF_BRIGADES) {
        formations[id] = {
            id,
            name: id,
            kind: 'brigade',
            status: 'active',
            faction: 'RBiH',
            corps_id: 'arbih_3rd_corps',
            own_corps_cmd: 'arbih_3rd_corps',
            personnel: 1350,
            strength: 1350,
            officer_quality: opts.axisCoordinationLow ? 0.25 : 0.72,
            cohesion: opts.axisCoordinationLow ? 34 : 68,
            morale: opts.axisCoordinationLow ? 40 : 70,
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
        meta: {
            turn: opts.turn,
            seed: 'donji-vakuf-test',
            phase: 'war',
            operation_storm_turn: (opts.stormRuptured ?? true) ? 172 : undefined,
        },
        factions: [{
            id: 'RBiH',
            capability_profile: {
                training_quality: opts.axisCoordinationLow ? 0.3 : 0.7,
                organizational_maturity: opts.axisCoordinationLow ? 0.3 : 0.7,
                equipment_access: 0.55,
                equipment_operational: 0.55,
                doctrine_effectiveness: { ATTACK: 0.62, COORDINATED_STRIKE: 0.62 },
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
            event_last_fired_turn: (opts.stormRuptured ?? true) ? { operation_storm_1995: 172 } : {},
        },
        political: {
            political_controllers: controllers,
            war_supply_pressure: { RBiH: opts.supplyPressure ?? 55 },
            war_alliance_rbih_hrhb: 0.65,
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

function buildDonjiVakufSourceOobState(turn: number): GameState {
    const state = buildDonjiVakufState({ turn });
    for (const id of DONJI_VAKUF_BRIGADES) {
        const formation = state.military.formations[id] as { corps_id?: string; own_corps_cmd?: string };
        formation.corps_id = 'arbih_3rd_corps';
        formation.own_corps_cmd = 'arbih_3rd_corps';
    }
    return state;
}

function buildKupresCincarState(opts: {
    turn: number;
    alliance?: number;
    stagingHeld?: boolean;
    objectivesHeldByRs?: boolean;
    addCommanderState?: boolean;
    supplyPressure?: number;
    axisCoordinationLow?: boolean;
}): GameState {
    const cmd: CorpsCommandState = {
        command_span: 6,
        subordinate_count: 6,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 10,
        stance: 'offensive',
        active_operations: [],
        commander_state: (opts.addCommanderState ?? true)
            ? { current_plan: null, decision_trace: null, operation_history: [] } as unknown as CorpsCommandState['commander_state']
            : undefined,
    };

    const controllers: Record<string, FactionId> = {};
    for (const osid of KUPRES_STAGING_ANCHORS) {
        controllers[osid] = (opts.stagingHeld ?? true) ? 'HRHB' : 'RS';
    }
    for (const osid of [...KUPRES_OBJECTIVES, ...KUPRES_GLAMOC_SHOULDER_OBJECTIVES]) {
        controllers[osid] = (opts.objectivesHeldByRs ?? true) ? 'RS' : 'HRHB';
    }

    const formations: Record<string, unknown> = {};
    for (const id of KUPRES_BRIGADES) {
        formations[id] = {
            id,
            name: id,
            kind: 'brigade',
            status: 'active',
            faction: 'HRHB',
            corps_id: 'hvo_tomislavgrad',
            personnel: 1450,
            strength: 1450,
            officer_quality: opts.axisCoordinationLow ? 0.25 : 0.72,
            cohesion: opts.axisCoordinationLow ? 34 : 68,
            morale: opts.axisCoordinationLow ? 40 : 70,
            composition: {
                tanks: 1,
                artillery: 2,
                tank_condition: { operational: 1 },
                artillery_condition: { operational: 2 },
            },
        };
    }

    return {
        schema_version: 0,
        meta: { turn: opts.turn, seed: 'kupres-cincar-test', phase: 'war', hv_brigades_spawned: true },
        factions: [{
            id: 'HRHB',
            capability_profile: {
                training_quality: opts.axisCoordinationLow ? 0.3 : 0.7,
                organizational_maturity: opts.axisCoordinationLow ? 0.3 : 0.7,
                equipment_access: 0.65,
                equipment_operational: 0.65,
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
            corps_command: { hvo_tomislavgrad: cmd },
            faction_officer_maturity: { HRHB: opts.axisCoordinationLow ? 1.5 : 3.5 },
        },
        political: {
            political_controllers: controllers,
            war_alliance_rbih_hrhb: opts.alliance ?? 0.65,
            war_supply_pressure: { HRHB: opts.supplyPressure ?? 55 },
            rbih_hrhb_state: { washington_signed: true, washington_turn: 85 },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

describe('Central Bosnia / Vlasic operation opportunity catalog', () => {
    it('exposes Central Bosnia opportunities through their family export and the canonical catalog', () => {
        expect(CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES).toEqual([
            KUPRES_CINCAR_94_OPPORTUNITY,
            VLASIC_RIDGE_95_OPPORTUNITY,
            DONJI_VAKUF_95_OPPORTUNITY,
        ]);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'kupres_cincar_94')).toBe(true);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'vlasic_ridge_95')).toBe(true);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'donji_vakuf_95')).toBe(true);
        expect(KUPRES_CINCAR_94_OPPORTUNITY.family).toBe('central_bosnia_vlasic');
        expect(KUPRES_CINCAR_94_OPPORTUNITY.tier).toBe('T1');
        expect(KUPRES_CINCAR_94_OPPORTUNITY.faction).toBe('HRHB');
        expect(KUPRES_CINCAR_94_OPPORTUNITY.primary_corps).toBe('hvo_tomislavgrad');
        expect(KUPRES_CINCAR_94_OPPORTUNITY.variants?.map(v => v.variant_id).sort())
            .toEqual(['glamoc_shoulder', 'kupres_line_only']);
        expect(VLASIC_RIDGE_95_OPPORTUNITY.family).toBe('central_bosnia_vlasic');
        expect(VLASIC_RIDGE_95_OPPORTUNITY.tier).toBe('T1');
        expect(VLASIC_RIDGE_95_OPPORTUNITY.faction).toBe('RBiH');
        expect(VLASIC_RIDGE_95_OPPORTUNITY.primary_corps).toBe('arbih_3rd_corps');
        expect(VLASIC_RIDGE_95_OPPORTUNITY.variants?.map(v => v.variant_id).sort())
            .toEqual(['ridge_probe']);
        expect(DONJI_VAKUF_95_OPPORTUNITY.family).toBe('central_bosnia_vlasic');
        expect(DONJI_VAKUF_95_OPPORTUNITY.tier).toBe('T1');
        expect(DONJI_VAKUF_95_OPPORTUNITY.faction).toBe('RBiH');
        expect(DONJI_VAKUF_95_OPPORTUNITY.primary_corps).toBe('arbih_3rd_corps');
    });

    it('starts Donji Vakuf 95 on the live Travnik-Komar contact edge', () => {
        const openingAxis = DONJI_VAKUF_95_OPPORTUNITY.axes[0];

        expect(openingAxis.staging_osid).toBe('op:travnik:turbe_2');
        expect(openingAxis.objectives[0]).toBe('op:donji_vakuf:komar_2');
        expect(openingAxis.brigades).toContain('arbih_17th_vitezka_mountain');
        expect(openingAxis.brigades).toContain('arbih_706th_muslim_mountain');
    });

    it('surfaces Kupres/Cincar in autumn 1994 as a dependency opportunity', () => {
        const state = buildKupresCincarState({ turn: 138 });
        runOpportunityEvaluationStep(state, 138);

        const proposal = state.military.operation_opportunities
            ?.find(p => p.opportunity_id === 'kupres_cincar_94');

        expect(proposal).toBeDefined();
        expect(proposal!.proposal_id).toBe('OPP_138_kupres_cincar_94');
        expect(proposal!.status).toBe('eligible_pending_review');
        expect(proposal!.last_axis_evaluation).toHaveLength(10);
        expect(proposal!.redirect_variants?.map(v => v.variant_id).sort())
            .toEqual(['glamoc_shoulder', 'kupres_line_only']);
        expect(isOpportunityEligible(
            KUPRES_CINCAR_94_OPPORTUNITY,
            evaluateAxes(state, 138, KUPRES_CINCAR_94_OPPORTUNITY),
        )).toBe(true);
    });

    it('uses the canonical Duvno OSID for the Tomislavgrad staging anchor', () => {
        const state = buildKupresCincarState({ turn: 138 });
        const controllers = state.political.political_controllers!;
        controllers['op:tomislavgrad:tomislavgrad_2'] = 'RS';
        controllers['op:duvno:tomislavgrad_2'] = 'HRHB';

        runOpportunityEvaluationStep(state, 138);

        expect(state.military.operation_opportunities
            ?.find(p => p.opportunity_id === 'kupres_cincar_94')).toBeDefined();
    });

    it('blocks Kupres/Cincar outside window, broken alliance, lost staging, or no enemy-held objectives', () => {
        const missingStagingController = buildKupresCincarState({ turn: 138 });
        delete missingStagingController.political.political_controllers!['op:duvno:tomislavgrad_2'];
        const cases = [
            buildKupresCincarState({ turn: 131 }),
            buildKupresCincarState({ turn: 143 }),
            buildKupresCincarState({ turn: 138, alliance: 0.35 }),
            buildKupresCincarState({ turn: 138, stagingHeld: false }),
            missingStagingController,
            buildKupresCincarState({ turn: 138, objectivesHeldByRs: false }),
        ];

        for (const state of cases) {
            runOpportunityEvaluationStep(state, state.meta.turn);
            expect((state.military.operation_opportunities ?? [])
                .find(p => p.opportunity_id === 'kupres_cincar_94')).toBeUndefined();
        }
    });

    it('spawns Kupres/Cincar through the canonical opportunity decision path', () => {
        const state = buildKupresCincarState({ turn: 138 });
        runOpportunityEvaluationStep(state, 138);
        const proposalId = buildProposalId('kupres_cincar_94', 138);

        const approved = applyOpportunityDecision(state, 138, proposalId, 'approve');

        expect(approved?.status).toBe('approved');
        expect(state.military.corps_command!.hvo_tomislavgrad.active_operations[0].name)
            .toBe('Operation Cincar / Kupres');
        expect(state.military.corps_command!.hvo_tomislavgrad.active_operations[0].axes![0].objectives)
            .toEqual(KUPRES_OBJECTIVES);
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
            .toEqual(['ridge_probe']);
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

    it('surfaces Donji Vakuf 95 after Storm rupture when 7th Corps staging and live RS objectives hold', () => {
        const state = buildDonjiVakufState({ turn: 178 });
        runOpportunityEvaluationStep(state, 178);

        const proposal = state.military.operation_opportunities
            ?.find(p => p.opportunity_id === 'donji_vakuf_95');

        expect(proposal).toBeDefined();
        expect(proposal!.proposal_id).toBe('OPP_178_donji_vakuf_95');
        expect(proposal!.status).toBe('eligible_pending_review');
        expect(proposal!.last_axis_evaluation).toHaveLength(10);
        expect(isOpportunityEligible(
            DONJI_VAKUF_95_OPPORTUNITY,
            evaluateAxes(state, 178, DONJI_VAKUF_95_OPPORTUNITY),
        )).toBe(true);
    });

    it('blocks Donji Vakuf 95 outside window, pre-Storm, lost staging, or no enemy-held objectives', () => {
        const cases = [
            buildDonjiVakufState({ turn: 176 }),
            buildDonjiVakufState({ turn: 181 }),
            buildDonjiVakufState({ turn: 178, stormRuptured: false }),
            buildDonjiVakufState({ turn: 178, stagingHeld: false }),
            buildDonjiVakufState({ turn: 178, objectivesHeldByRs: false }),
        ];

        for (const state of cases) {
            runOpportunityEvaluationStep(state, state.meta.turn);
            expect((state.military.operation_opportunities ?? [])
                .find(p => p.opportunity_id === 'donji_vakuf_95')).toBeUndefined();
        }
    });

    it('spawns Donji Vakuf 95 through the canonical opportunity decision path', () => {
        const state = buildDonjiVakufState({ turn: 178 });
        runOpportunityEvaluationStep(state, 178);
        const proposalId = buildProposalId('donji_vakuf_95', 178);

        const approved = applyOpportunityDecision(state, 178, proposalId, 'approve');

        expect(approved?.status).toBe('approved');
        expect(state.military.corps_command!.arbih_3rd_corps.active_operations[0].name)
            .toBe('Operation Donji Vakuf 95');
        expect(state.military.corps_command!.arbih_3rd_corps.active_operations[0].axes![0].objectives)
            .toEqual(DONJI_VAKUF_OBJECTIVES);
    });

    it('spawns Donji Vakuf 95 against the source-OOB 3rd Corps brigade owner', () => {
        const state = buildDonjiVakufSourceOobState(178);
        runOpportunityEvaluationStep(state, 178);
        const proposalId = buildProposalId('donji_vakuf_95', 178);

        const approved = applyOpportunityDecision(state, 178, proposalId, 'approve');

        expect(approved?.status).toBe('approved');
        const op = state.military.corps_command!.arbih_3rd_corps.active_operations[0];
        expect(op.name).toBe('Operation Donji Vakuf 95');
        expect(op.participating_brigades).toEqual([...DONJI_VAKUF_BRIGADES].sort());
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
