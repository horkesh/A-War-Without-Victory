/**
 * operation_opportunity_catalog_central_bosnia.ts
 *
 * Phase 2 operation-opportunity family: Central Bosnia / Vlasic.
 *
 * Non-sensitive Ring 1 territorial operation family. The proposal authorizes
 * an ARBiH 3rd Corps military operation on the Vlasic / Travnik ridge line.
 * It does not add civilian-harm levers, new rupture behavior, or combat math.
 */

import type { GameState, FormationId } from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type {
    AxisPredicate,
    OperationOpportunityDef,
    OpportunityAxisDef,
} from './operation_opportunities.js';
import { computeCorpsOperationReadiness } from './corps_operation_readiness.js';

const PRIMARY_CORPS = 'arbih_3rd_corps';

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
    const pressure = state.political?.war_supply_pressure?.['RBiH'] ?? 0;
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

const alwaysGreen: AxisPredicate = () => ({ green: true, reason: 'not applicable for this family' });

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
    VLASIC_RIDGE_95_OPPORTUNITY,
];
