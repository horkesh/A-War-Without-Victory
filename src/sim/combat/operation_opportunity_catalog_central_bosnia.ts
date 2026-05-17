/**
 * operation_opportunity_catalog_central_bosnia.ts
 *
 * Phase 2 operation-opportunity family: Central Bosnia / Vlasic / Kupres.
 *
 * Non-sensitive Ring 1 territorial operation family. The proposal authorizes
 * ARBiH 3rd Corps and HRHB/HVO/HV territorial military operations in Central
 * Bosnia. It does not add civilian-harm levers, new rupture behavior, or
 * combat math.
 */

import type { GameState, FormationId } from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type {
    AxisPredicate,
    OperationOpportunityDef,
    OpportunityAxisDef,
} from './operation_opportunities.js';
import { computeCorpsOperationReadiness } from './corps_operation_readiness.js';
import { getFactionLiveSupplyPressure } from './supply_condition.js';

const PRIMARY_CORPS = 'arbih_3rd_corps';
const KUPRES_CINCAR_PRIMARY_CORPS = 'hvo_tomislavgrad';

const STAGING_TRAVNIK = 'op:travnik:travnik_2';
const STAGING_TURBE = 'op:travnik:turbe_2';
const STAGING_CUKLE = 'op:travnik:cukle_2';

const VLASIC_TRAVNIK_RIDGE_OBJECTIVES: readonly string[] = [
    'op:travnik:gornje_krcevine',
    'op:travnik:paklarevo',
    'op:travnik:varosluk',
];

const VLASIC_SKENDER_VAKUF_OBJECTIVES: readonly string[] = [
    'op:skender_vakuf:donji_koricani',
    'op:skender_vakuf:imljani_2',
    'op:skender_vakuf:javorani_2',
    'op:skender_vakuf:knezevo_2',
];

const BUGOJNO_SUPPORT_OBJECTIVES: readonly string[] = [
    'op:donji_vakuf:komar_2',
    'op:donji_vakuf:prusac_2',
    'op:donji_vakuf:donji_vakuf_2',
];

const VLASIC_STAGING_ANCHORS: readonly string[] = [
    STAGING_TRAVNIK,
    STAGING_TURBE,
    STAGING_CUKLE,
];

const VLASIC_ENEMY_TARGETS: readonly string[] = [
    ...VLASIC_TRAVNIK_RIDGE_OBJECTIVES,
    ...VLASIC_SKENDER_VAKUF_OBJECTIVES,
];

const VLASIC_READINESS_FLOOR = 0.36;
const VLASIC_AXIS_COORDINATION_FLOOR = 0.35;
const VLASIC_SUPPLY_PRESSURE_CEILING = 90;
const FEDERATION_ALLIANCE_FLOOR = 0.50;

const KUPRES_CINCAR_STAGING_LIVNO = 'op:livno:livno_2';
const KUPRES_CINCAR_STAGING_TOMISLAVGRAD = 'op:tomislavgrad:tomislavgrad_2';
const KUPRES_CINCAR_STAGING_KUPRES = 'op:kupres:kupres_2';
const KUPRES_CINCAR_STAGING_GORAVCI = 'op:kupres:goravci';

const KUPRES_CINCAR_STAGING_ANCHORS: readonly string[] = [
    KUPRES_CINCAR_STAGING_LIVNO,
    KUPRES_CINCAR_STAGING_TOMISLAVGRAD,
    KUPRES_CINCAR_STAGING_KUPRES,
    KUPRES_CINCAR_STAGING_GORAVCI,
];

const KUPRES_CINCAR_OBJECTIVES: readonly string[] = [
    'op:kupres:bucovaca',
    'op:kupres:donji_malovan',
    'op:kupres:novo_selo_2',
];

const KUPRES_CINCAR_GLAMOC_SHOULDER_OBJECTIVES: readonly string[] = [
    'op:glamoc:glamoc_2',
    'op:glamoc:pribelja',
    'op:glamoc:vidimlije_2',
];

const KUPRES_CINCAR_READINESS_FLOOR = 0.34;
const KUPRES_CINCAR_AXIS_COORDINATION_FLOOR = 0.34;
const KUPRES_CINCAR_SUPPLY_PRESSURE_CEILING = 90;

const VLASIC_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'vlasic_travnik_ridge',
        name: 'Travnik Ridge Line',
        corps: PRIMARY_CORPS,
        brigades: [
            'arbih_17th_vitezka_mountain' as FormationId,
            'arbih_706th_muslim_mountain' as FormationId,
            'arbih_727th_slavna' as FormationId,
        ],
        objectives: VLASIC_TRAVNIK_RIDGE_OBJECTIVES,
        staging_osid: STAGING_TURBE,
    },
    {
        axis_id: 'vlasic_skender_vakuf',
        name: 'Skender Vakuf Shoulder',
        corps: PRIMARY_CORPS,
        brigades: [
            'arbih_712th_mountain' as FormationId,
            'arbih_737th_muslim_light' as FormationId,
            'arbih_705th_slavna_mountain' as FormationId,
        ],
        objectives: VLASIC_SKENDER_VAKUF_OBJECTIVES,
        staging_osid: STAGING_CUKLE,
    },
];

const VLASIC_RIDGE_PROBE_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'vlasic_ridge_probe',
        name: 'Travnik Ridge Probe',
        corps: PRIMARY_CORPS,
        brigades: [
            'arbih_17th_vitezka_mountain' as FormationId,
            'arbih_706th_muslim_mountain' as FormationId,
            'arbih_727th_slavna' as FormationId,
        ],
        objectives: VLASIC_TRAVNIK_RIDGE_OBJECTIVES,
        staging_osid: STAGING_TURBE,
    },
];

const BUGOJNO_SUPPORT_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'vlasic_bugojno_support',
        name: 'Bugojno Support Axis',
        corps: PRIMARY_CORPS,
        brigades: [
            'arbih_705th_slavna_mountain' as FormationId,
            'arbih_707th_slavna_mountain' as FormationId,
            'arbih_717th_slavna_mountain' as FormationId,
        ],
        objectives: BUGOJNO_SUPPORT_OBJECTIVES,
        staging_osid: 'op:bugojno:gracanica',
    },
];

const KUPRES_CINCAR_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'kupres_cincar_line',
        name: 'Kupres Line',
        corps: KUPRES_CINCAR_PRIMARY_CORPS,
        brigades: [
            'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
            'hrhb_kralj_tomislav_brigade' as FormationId,
            'hv_5th_guards_karlovac' as FormationId,
            'hv_7th_guards_varazdin' as FormationId,
        ],
        objectives: KUPRES_CINCAR_OBJECTIVES,
        staging_osid: KUPRES_CINCAR_STAGING_LIVNO,
    },
];

const KUPRES_LINE_ONLY_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'kupres_cincar_line_only',
        name: 'Kupres Line Only',
        corps: KUPRES_CINCAR_PRIMARY_CORPS,
        brigades: [
            'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
            'hrhb_kralj_tomislav_brigade' as FormationId,
        ],
        objectives: KUPRES_CINCAR_OBJECTIVES,
        staging_osid: KUPRES_CINCAR_STAGING_LIVNO,
    },
];

const KUPRES_GLAMOC_SHOULDER_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'kupres_glamoc_shoulder',
        name: 'Glamoc Shoulder',
        corps: KUPRES_CINCAR_PRIMARY_CORPS,
        brigades: [
            'hv_5th_guards_karlovac' as FormationId,
            'hv_7th_guards_varazdin' as FormationId,
        ],
        objectives: KUPRES_CINCAR_GLAMOC_SHOULDER_OBJECTIVES,
        staging_osid: KUPRES_CINCAR_STAGING_KUPRES,
    },
];

const dateWindowVlasic: AxisPredicate = (_state, turn) => {
    if (turn < 152) return { green: false, reason: 'spring 1995 Central Bosnia window not yet open' };
    if (turn > 166) return { green: false, reason: 'spring 1995 Central Bosnia window has closed' };
    return { green: true, reason: 'within spring 1995 Central Bosnia operation window' };
};

const allianceContextVlasic: AxisPredicate = (state) => {
    const alliance = state.political?.war_alliance_rbih_hrhb ?? 0;
    if (alliance < FEDERATION_ALLIANCE_FLOOR) {
        return { green: false, reason: 'post-Washington Federation coordination below threshold' };
    }
    return { green: true, reason: 'post-Washington Federation coordination holds' };
};

const stagingAccessVlasic: AxisPredicate = (state) => {
    for (const osid of VLASIC_STAGING_ANCHORS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== null && ctrl !== 'RBiH') {
            return { green: false, reason: 'Travnik staging anchor no longer held by 3rd Corps' };
        }
    }
    return { green: true, reason: 'Travnik staging anchors held by 3rd Corps' };
};

const enemyWeaknessVlasic: AxisPredicate = (state) => {
    let enemyHeld = 0;
    for (const osid of VLASIC_ENEMY_TARGETS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl === 'RS') enemyHeld++;
    }
    if (enemyHeld === 0) {
        return { green: false, reason: 'no Vlasic ridge objectives remain in enemy hands' };
    }
    return { green: true, reason: 'Vlasic ridge objectives remain in enemy hands' };
};

const corpsReadinessVlasic: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[PRIMARY_CORPS]) {
        return { green: false, reason: '3rd Corps command not present in this scenario' };
    }
    const traits = computeCorpsOperationReadiness(state, PRIMARY_CORPS as FormationId);
    if (traits.operation_readiness < VLASIC_READINESS_FLOOR) {
        return { green: false, reason: '3rd Corps readiness below Central Bosnia operation floor' };
    }
    return { green: true, reason: '3rd Corps readiness sufficient for Central Bosnia operation' };
};

const logisticsVlasic: AxisPredicate = (state) => {
    const pressure = getFactionLiveSupplyPressure(state, 'RBiH');
    if (pressure >= VLASIC_SUPPLY_PRESSURE_CEILING) {
        return { green: false, reason: 'RBiH supply pressure too high for sustained ridge operation' };
    }
    return { green: true, reason: 'RBiH supply pressure within ridge-operation margin' };
};

const commanderConfidenceVlasic: AxisPredicate = (state) => {
    const commanderState = state.military.corps_command?.[PRIMARY_CORPS]?.commander_state;
    if (!commanderState) {
        return { green: false, reason: '3rd Corps commander state unavailable' };
    }
    return { green: true, reason: '3rd Corps commander state present' };
};

const forceQualityVlasic: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[PRIMARY_CORPS]) {
        return { green: false, reason: '3rd Corps command not present in this scenario' };
    }
    const traits = computeCorpsOperationReadiness(state, PRIMARY_CORPS as FormationId);
    if (traits.axis_coordination < VLASIC_AXIS_COORDINATION_FLOOR) {
        return { green: false, reason: '3rd Corps axis coordination below two-axis ridge threshold' };
    }
    return { green: true, reason: '3rd Corps axis coordination supports a two-axis ridge operation' };
};

const weatherSeasonVlasic: AxisPredicate = (_state, turn) => {
    if (turn < 154) return { green: false, reason: 'late-winter mountain conditions still constrain ridge action' };
    return { green: true, reason: 'spring mountain conditions are acceptable for ridge action' };
};

const dateWindowKupresCincar: AxisPredicate = (_state, turn) => {
    if (turn < 132) return { green: false, reason: 'autumn 1994 Kupres/Cincar window not yet open' };
    if (turn > 142) return { green: false, reason: 'autumn 1994 Kupres/Cincar window has closed' };
    return { green: true, reason: 'within autumn 1994 Kupres/Cincar operation window' };
};

const allianceContextKupresCincar: AxisPredicate = (state) => {
    const alliance = state.political?.war_alliance_rbih_hrhb ?? 0;
    if (alliance < FEDERATION_ALLIANCE_FLOOR) {
        return { green: false, reason: 'post-Washington Federation coordination below Kupres/Cincar threshold' };
    }
    return { green: true, reason: 'post-Washington Federation coordination supports Kupres/Cincar' };
};

const stagingAccessKupresCincar: AxisPredicate = (state) => {
    for (const osid of KUPRES_CINCAR_STAGING_ANCHORS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== null && ctrl !== 'HRHB') {
            return { green: false, reason: 'Livno-Tomislavgrad-Kupres staging anchors are not held' };
        }
    }
    return { green: true, reason: 'Livno-Tomislavgrad-Kupres staging anchors are held' };
};

const enemyWeaknessKupresCincar: AxisPredicate = (state) => {
    let enemyHeld = 0;
    for (const osid of KUPRES_CINCAR_OBJECTIVES) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl === 'RS') enemyHeld++;
    }
    if (enemyHeld === 0) {
        return { green: false, reason: 'no Kupres/Cincar objectives remain in enemy hands' };
    }
    return { green: true, reason: 'Kupres/Cincar objectives remain in enemy hands' };
};

const corpsReadinessKupresCincar: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[KUPRES_CINCAR_PRIMARY_CORPS]) {
        return { green: false, reason: 'HVO Tomislavgrad command not present in this scenario' };
    }
    const traits = computeCorpsOperationReadiness(state, KUPRES_CINCAR_PRIMARY_CORPS as FormationId);
    if (traits.operation_readiness < KUPRES_CINCAR_READINESS_FLOOR) {
        return { green: false, reason: 'HVO Tomislavgrad readiness below Kupres/Cincar operation floor' };
    }
    return { green: true, reason: 'HVO Tomislavgrad readiness sufficient for Kupres/Cincar operation' };
};

const logisticsKupresCincar: AxisPredicate = (state) => {
    const pressure = getFactionLiveSupplyPressure(state, 'HRHB');
    if (pressure >= KUPRES_CINCAR_SUPPLY_PRESSURE_CEILING) {
        return { green: false, reason: 'HRHB supply pressure too high for sustained Kupres/Cincar operation' };
    }
    return { green: true, reason: 'HRHB supply pressure within Kupres/Cincar margin' };
};

const commanderConfidenceKupresCincar: AxisPredicate = (state) => {
    const commanderState = state.military.corps_command?.[KUPRES_CINCAR_PRIMARY_CORPS]?.commander_state;
    if (!commanderState) {
        return { green: false, reason: 'HVO Tomislavgrad commander state unavailable' };
    }
    return { green: true, reason: 'HVO Tomislavgrad commander state present' };
};

const forceQualityKupresCincar: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[KUPRES_CINCAR_PRIMARY_CORPS]) {
        return { green: false, reason: 'HVO Tomislavgrad command not present in this scenario' };
    }
    const traits = computeCorpsOperationReadiness(state, KUPRES_CINCAR_PRIMARY_CORPS as FormationId);
    if (traits.axis_coordination < KUPRES_CINCAR_AXIS_COORDINATION_FLOOR) {
        return { green: false, reason: 'HVO Tomislavgrad axis coordination below Kupres/Cincar threshold' };
    }
    return { green: true, reason: 'HVO Tomislavgrad axis coordination supports Kupres/Cincar' };
};

const weatherSeasonKupresCincar: AxisPredicate = (_state, turn) => {
    if (turn < 136) return { green: false, reason: 'early-autumn mountain conditions still constrain Kupres/Cincar' };
    return { green: true, reason: 'autumn mountain conditions are acceptable for Kupres/Cincar' };
};

const alwaysGreen: AxisPredicate = () => ({ green: true, reason: 'not applicable for this family' });

export const KUPRES_CINCAR_94_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'kupres_cincar_94',
    name: 'Operation Cincar / Kupres',
    tier: 'T1',
    faction: 'HRHB',
    primary_corps: KUPRES_CINCAR_PRIMARY_CORPS,
    family: 'central_bosnia_vlasic',
    axes: KUPRES_CINCAR_AXES,
    staging_osid: KUPRES_CINCAR_STAGING_LIVNO,
    planning_duration: 4,
    min_attack_outcome: 'repulsed',
    citations: [
        'docs/research/2026-05-01-late-war-operation-opportunity-research.md - Central Bosnia / Vlasic / Kupres candidates',
        'docs/plans/late-war-central-bosnia-vlasic-kupres-design.md - Central Bosnia family sensitive-history boundary',
        'src/sim/combat/triggered_operations.ts - legacy Mistral note that Cincar/Kupres is the dependency node for later Glamac/Western Bosnia logic',
    ],
    historical_exit_class: 'partial_success',
    prerequisites: {
        date_window: 'required',
        political_authorization: 'n_a',
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
        date_window: dateWindowKupresCincar,
        political_authorization: alwaysGreen,
        corps_readiness: corpsReadinessKupresCincar,
        logistics: logisticsKupresCincar,
        staging_access: stagingAccessKupresCincar,
        weather_season: weatherSeasonKupresCincar,
        commander_confidence: commanderConfidenceKupresCincar,
        enemy_weakness: enemyWeaknessKupresCincar,
        alliance_context: allianceContextKupresCincar,
        force_quality: forceQualityKupresCincar,
    },
    variants: [
        {
            variant_id: 'kupres_line_only',
            name: 'Kupres Line Only',
            axes: KUPRES_LINE_ONLY_AXES,
            staging_osid: KUPRES_CINCAR_STAGING_LIVNO,
        },
        {
            variant_id: 'glamoc_shoulder',
            name: 'Glamoc Shoulder',
            axes: KUPRES_GLAMOC_SHOULDER_AXES,
            staging_osid: KUPRES_CINCAR_STAGING_KUPRES,
        },
    ],
    staff_recommendation: 'approve',
};

export const VLASIC_RIDGE_95_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'vlasic_ridge_95',
    name: 'Operation Vlasic Ridge',
    tier: 'T1',
    faction: 'RBiH',
    primary_corps: PRIMARY_CORPS,
    family: 'central_bosnia_vlasic',
    axes: VLASIC_AXES,
    staging_osid: STAGING_TRAVNIK,
    planning_duration: 4,
    min_attack_outcome: 'repulsed',
    citations: [
        'docs/research/2026-05-01-late-war-operation-opportunity-research.md - Central Bosnia / Vlasic-Kupres family backlog',
        'docs/plans/late-war-operation-opportunity-system-design.md - T1 opportunity proposal contract and failure model',
        'data/source/calibration/painted_control_apr1995.json + oct1995.json - Travnik/Vlasic ridge dated-control references',
    ],
    historical_exit_class: 'partial_success',
    prerequisites: {
        date_window: 'required',
        political_authorization: 'n_a',
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
        date_window: dateWindowVlasic,
        political_authorization: alwaysGreen,
        corps_readiness: corpsReadinessVlasic,
        logistics: logisticsVlasic,
        staging_access: stagingAccessVlasic,
        weather_season: weatherSeasonVlasic,
        commander_confidence: commanderConfidenceVlasic,
        enemy_weakness: enemyWeaknessVlasic,
        alliance_context: allianceContextVlasic,
        force_quality: forceQualityVlasic,
    },
    variants: [
        {
            variant_id: 'ridge_probe',
            name: 'Ridge Probe',
            axes: VLASIC_RIDGE_PROBE_AXES,
            staging_osid: STAGING_TURBE,
        },
        {
            variant_id: 'bugojno_support',
            name: 'Bugojno Support Axis',
            axes: BUGOJNO_SUPPORT_AXES,
            staging_osid: 'op:bugojno:gracanica',
        },
    ],
    staff_recommendation: 'approve',
};

export const CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES: readonly OperationOpportunityDef[] = [
    KUPRES_CINCAR_94_OPPORTUNITY,
    VLASIC_RIDGE_95_OPPORTUNITY,
];
