/**
 * operation_opportunity_catalog_federation_western_bosnia.ts
 *
 * Federation / Western Bosnia late-war operation opportunity family.
 *
 * This first slice authors Operation Mistral 2 as a T1 territorial proposal.
 * It is gated on the western theater rupture already represented by Operation
 * Storm and on live Kupres/Cincar dependency anchors; it does not add calendar
 * rails, civilian-harm levers, rupture behavior, or combat math.
 */

import type { FormationId, GameState } from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type {
    AxisPredicate,
    OperationOpportunityDef,
    OpportunityAxisDef,
} from './operation_opportunities.js';
import { isWesternTheaterRuptured } from './operation_storm_theater.js';
import { computeCorpsOperationReadiness } from './corps_operation_readiness.js';
import { getFactionLiveSupplyPressure } from './supply_condition.js';

const PRIMARY_CORPS = 'hvo_main_staff';
const SECONDARY_CORPS = 'hvo_tomislavgrad';

const STAGING_LIVNO_MISI = 'op:livno:misi_2';
const STAGING_LIVNO = 'op:livno:livno_2';

const MISTRAL_STAGING_ANCHORS: readonly string[] = [
    STAGING_LIVNO_MISI,
    STAGING_LIVNO,
];

const MISTRAL_CINCAR_DEPENDENCY_ANCHORS: readonly string[] = [
    'op:kupres:bucovaca',
    'op:glamoc:glamoc_2',
];

const MISTRAL_DRVAR_GRAHOVO_OBJECTIVES: readonly string[] = [
    'op:glamoc:halapic',
    'op:glamoc:stekerovci_2',
    'op:titov_drvar:prekaja_2',
    'op:titov_drvar:drvar_2',
    'op:titov_drvar:sipovljani_2',
    'op:bosansko_grahovo:crni_lug',
    'op:bosansko_grahovo:bosansko_grahovo_2',
    'op:bosansko_grahovo:malesevci',
    'op:bosansko_grahovo:ugarci',
];

const MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES: readonly string[] = [
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

const MISTRAL_TARGETS: readonly string[] = [
    ...MISTRAL_DRVAR_GRAHOVO_OBJECTIVES,
    ...MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES,
];

const MISTRAL_READINESS_FLOOR = 0.36;
const MISTRAL_AXIS_COORDINATION_FLOOR = 0.35;
const MISTRAL_SUPPLY_PRESSURE_CEILING = 90;
const FEDERATION_ALLIANCE_FLOOR = 0.50;

const MISTRAL_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'mistral_drvar_grahovo',
        name: 'Drvar / Grahovo Axis',
        corps: PRIMARY_CORPS,
        brigades: [
            'hvo_1st_guard_abb' as FormationId,
            'hv_4th_guards_split' as FormationId,
        ],
        objectives: MISTRAL_DRVAR_GRAHOVO_OBJECTIVES,
        staging_osid: STAGING_LIVNO_MISI,
    },
    {
        axis_id: 'mistral_sipovo_mrkonjic',
        name: 'Sipovo / Mrkonjic Axis',
        corps: SECONDARY_CORPS,
        brigades: [
            'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
            'hrhb_kralj_tomislav_brigade' as FormationId,
            'hv_7th_guards_varazdin' as FormationId,
        ],
        objectives: MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES,
        staging_osid: STAGING_LIVNO,
    },
];

const MISTRAL_DRVAR_GRAHOVO_AXIS: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'mistral_drvar_grahovo',
        name: 'Drvar / Grahovo Axis',
        corps: PRIMARY_CORPS,
        brigades: [
            'hvo_1st_guard_abb' as FormationId,
            'hv_4th_guards_split' as FormationId,
        ],
        objectives: MISTRAL_DRVAR_GRAHOVO_OBJECTIVES,
        staging_osid: STAGING_LIVNO_MISI,
    },
];

const MISTRAL_SIPOVO_MRKONJIC_AXIS: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'mistral_sipovo_mrkonjic',
        name: 'Sipovo / Mrkonjic Axis',
        corps: SECONDARY_CORPS,
        brigades: [
            'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
            'hrhb_kralj_tomislav_brigade' as FormationId,
            'hv_7th_guards_varazdin' as FormationId,
        ],
        objectives: MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES,
        staging_osid: STAGING_LIVNO,
    },
];

const dateWindowMistral: AxisPredicate = (_state, turn) => {
    if (turn < 175) return { green: false, reason: 'Mistral 2 western Bosnia window not yet open' };
    if (turn > 190) return { green: false, reason: 'Mistral 2 western Bosnia window has closed' };
    return { green: true, reason: 'within Mistral 2 western Bosnia operation window' };
};

const politicalAuthorizationMistral: AxisPredicate = (state) => {
    const alliance = state.political?.war_alliance_rbih_hrhb ?? 0;
    const washingtonSigned = state.political?.rbih_hrhb_state?.washington_signed === true;
    if (!washingtonSigned || alliance < FEDERATION_ALLIANCE_FLOOR) {
        return { green: false, reason: 'Federation authorization below Mistral 2 threshold' };
    }
    return { green: true, reason: 'Federation authorization supports Mistral 2' };
};

const corpsReadinessMistral: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[PRIMARY_CORPS]) {
        return { green: false, reason: 'HVO Main Staff command not present in this scenario' };
    }
    if (!state.military.corps_command?.[SECONDARY_CORPS]) {
        return { green: false, reason: 'HVO Tomislavgrad command not present for Mistral 2 secondary axis' };
    }
    const primaryTraits = computeCorpsOperationReadiness(state, PRIMARY_CORPS as FormationId);
    const secondaryTraits = computeCorpsOperationReadiness(state, SECONDARY_CORPS as FormationId);
    if (
        primaryTraits.operation_readiness < MISTRAL_READINESS_FLOOR
        || secondaryTraits.operation_readiness < MISTRAL_READINESS_FLOOR
    ) {
        return { green: false, reason: 'HVO/HV readiness below Mistral 2 operation floor' };
    }
    return { green: true, reason: 'HVO/HV readiness sufficient for Mistral 2' };
};

const logisticsMistral: AxisPredicate = (state) => {
    const pressure = getFactionLiveSupplyPressure(state, 'HRHB');
    if (pressure >= MISTRAL_SUPPLY_PRESSURE_CEILING) {
        return { green: false, reason: 'HRHB supply pressure too high for Mistral 2' };
    }
    return { green: true, reason: 'HRHB supply pressure within Mistral 2 margin' };
};

const stagingAccessMistral: AxisPredicate = (state) => {
    for (const osid of MISTRAL_STAGING_ANCHORS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== null && ctrl !== 'HRHB') {
            return { green: false, reason: 'Livno staging anchors are not held for Mistral 2' };
        }
    }
    for (const osid of MISTRAL_CINCAR_DEPENDENCY_ANCHORS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== 'HRHB') {
            return { green: false, reason: 'Kupres/Cincar dependency anchors are not open for Mistral 2' };
        }
    }
    return { green: true, reason: 'Livno staging and Kupres/Cincar dependency anchors are open' };
};

const weatherSeasonMistral: AxisPredicate = (_state, turn) => {
    if (turn > 187) return { green: false, reason: 'late-autumn weather threatens Mistral 2 tempo' };
    return { green: true, reason: 'late-summer western Bosnia conditions support Mistral 2' };
};

const commanderConfidenceMistral: AxisPredicate = (state) => {
    const primaryState = state.military.corps_command?.[PRIMARY_CORPS]?.commander_state;
    const secondaryState = state.military.corps_command?.[SECONDARY_CORPS]?.commander_state;
    if (!primaryState || !secondaryState) {
        return { green: false, reason: 'HVO/HV commander state unavailable for Mistral 2' };
    }
    return { green: true, reason: 'HVO/HV commander state present for Mistral 2' };
};

const enemyWeaknessMistral: AxisPredicate = (state) => {
    let enemyHeld = 0;
    for (const osid of MISTRAL_TARGETS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl === 'RS') enemyHeld++;
    }
    if (enemyHeld === 0) {
        return { green: false, reason: 'no Mistral 2 objectives remain in enemy hands' };
    }
    return { green: true, reason: 'Mistral 2 objectives remain in enemy hands' };
};

const allianceContextMistral: AxisPredicate = (state) => {
    if (!isWesternTheaterRuptured(state)) {
        return { green: false, reason: 'western theater has not ruptured yet' };
    }
    return { green: true, reason: 'western theater rupture creates Mistral 2 opportunity context' };
};

const forceQualityMistral: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[PRIMARY_CORPS]) {
        return { green: false, reason: 'HVO Main Staff command not present in this scenario' };
    }
    const traits = computeCorpsOperationReadiness(state, PRIMARY_CORPS as FormationId);
    if (traits.axis_coordination < MISTRAL_AXIS_COORDINATION_FLOOR) {
        return { green: false, reason: 'HVO/HV axis coordination below Mistral 2 threshold' };
    }
    return { green: true, reason: 'HVO/HV axis coordination supports Mistral 2' };
};

export const MISTRAL_2_95_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'mistral_2_95',
    name: 'Operation Mistral 2',
    tier: 'T1',
    faction: 'HRHB',
    primary_corps: PRIMARY_CORPS,
    family: 'federation_western_bosnia',
    axes: MISTRAL_AXES,
    staging_osid: STAGING_LIVNO_MISI,
    planning_duration: 4,
    min_attack_outcome: 'repulsed',
    citations: [
        'docs/research/2026-05-01-late-war-operation-opportunity-research.md - Federation / Western Bosnia candidates',
        'docs/plans/late-war-operation-opportunity-system-design.md - T1 opportunity proposal contract and dependency model',
        'src/sim/combat/triggered_operations.ts - legacy Mistral 2 objective footprint',
    ],
    historical_exit_class: 'partial_success',
    prerequisites: {
        date_window: 'required',
        political_authorization: 'required',
        corps_readiness: 'required',
        logistics: 'optional',
        staging_access: 'required',
        weather_season: 'optional',
        commander_confidence: 'optional',
        enemy_weakness: 'required',
        alliance_context: 'required',
        force_quality: 'optional',
        min_optional_axes: 2,
    },
    evaluators: {
        date_window: dateWindowMistral,
        political_authorization: politicalAuthorizationMistral,
        corps_readiness: corpsReadinessMistral,
        logistics: logisticsMistral,
        staging_access: stagingAccessMistral,
        weather_season: weatherSeasonMistral,
        commander_confidence: commanderConfidenceMistral,
        enemy_weakness: enemyWeaknessMistral,
        alliance_context: allianceContextMistral,
        force_quality: forceQualityMistral,
    },
    variants: [
        {
            variant_id: 'drvar_grahovo_axis',
            name: 'Drvar / Grahovo Axis',
            axes: MISTRAL_DRVAR_GRAHOVO_AXIS,
            staging_osid: STAGING_LIVNO_MISI,
        },
        {
            variant_id: 'sipovo_mrkonjic_axis',
            name: 'Sipovo / Mrkonjic Axis',
            axes: MISTRAL_SIPOVO_MRKONJIC_AXIS,
            staging_osid: STAGING_LIVNO,
        },
    ],
    staff_recommendation: 'approve',
};

export const FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES: readonly OperationOpportunityDef[] = [
    MISTRAL_2_95_OPPORTUNITY,
];
