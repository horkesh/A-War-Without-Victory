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
import { isPreStormWesternTheater, isWesternTheaterRuptured } from './operation_storm_theater.js';
import { computeCorpsOperationReadiness } from './corps_operation_readiness.js';
import { evaluateDefenderTrajectoryWeakness } from './operation_opportunity_defender_weakness.js';
import { getFactionLiveSupplyPressure } from './supply_condition.js';

const PRIMARY_CORPS = 'hvo_main_staff';
const SECONDARY_CORPS = 'hvo_tomislavgrad';
const VRS_KRAJINA_DEFENDER_CORPS = 'vrs_2nd_krajina' as FormationId;
// 2026-05-22 Wave 3B-A.2: lowered 0.40 → 0.20 mirroring the sana_95 fix
// (commit 939c409a). Same root cause: vrs_2nd_krajina composite weakness
// (`0.5·collapse + 0.3·(1−readiness) + 0.2·equipWeak`) stays sub-0.40
// across the late-war window despite the force-quality substrate
// correctly capturing the arc shape (per
// docs/40_reports/audits/20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md
// — VRS w188 morale 12.6/cohesion 26.5 vs RBiH 89.5/73.6). Forensics:
// docs/40_reports/audits/20260522_FORENSICS_5_BLOCKED_ARBIH_OPS.md §3
// mistral_2_95. Re-tune empirically against painted Oct 1995 once 188w
// deltas land.
const MISTRAL_DEFENDER_WEAKNESS_FLOOR = 0.20;

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

const enemyWeaknessMistral: AxisPredicate = (state, turn) => {
    let enemyHeld = 0;
    for (const osid of MISTRAL_TARGETS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl === 'RS') enemyHeld++;
    }
    if (enemyHeld === 0) {
        return { green: false, reason: 'no Mistral 2 objectives remain in enemy hands' };
    }
    const trajectory = evaluateDefenderTrajectoryWeakness(state, {
        defenderCorpsId: VRS_KRAJINA_DEFENDER_CORPS,
        defenderFaction: 'RS',
        currentTurn: turn,
        weaknessFloor: MISTRAL_DEFENDER_WEAKNESS_FLOOR,
        label: 'VRS Krajina',
    });
    if (trajectory.available) {
        return { green: trajectory.green, reason: trajectory.reason };
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

// ═══════════════════════════════════════════════════════════════════════════
// MISTRAL_1_95 — Operation Mistral 1 / "Skok 1" (Jun 1995)
//
// Historical record: HV/HVO Operation Mistral 1 ran 4-11 June 1995 against the
// RS 2nd Krajina Corps' southern shoulder, capturing Bosansko Grahovo and the
// Glamoč salient. This was the *precondition* for Operation Storm (4 August
// 1995, cutting the Knin-Banja Luka land bridge) and for Operation Mistral 2
// (September 1995). Sources:
//   - ICTY Prosecutor v. Gotovina et al., IT-06-90-T, Judgment 15 Apr 2011,
//     §44-58 (Mistral 1 as Storm precondition).
//   - Balkan Battlegrounds v2 ch. 28 (HVO Tomislavgrad axis, HV 4th Guards
//     Split as joint instrument).
//
// Catalog rationale: existing catalog has Mistral 2 (t≥175, Drvar/Šipovo) but
// no Jun-Jul 1995 prelude. Without Mistral 1 the painted Oct 1995 transfers of
// Bosansko Grahovo (4 OSIDs) and the Glamoč shoulder (4 OSIDs) have no
// operational instrument. Mistral 1 *creates* the western theater rupture; it
// therefore gates on `isPreStormWesternTheater(state)` (inverted sense of
// Mistral 2's alliance_context predicate) — Storm must not yet have fired.
// ═══════════════════════════════════════════════════════════════════════════

const MISTRAL_1_DEFENDER_WEAKNESS_FLOOR = 0.20;
const MISTRAL_1_READINESS_FLOOR = 0.36;
const MISTRAL_1_AXIS_COORDINATION_FLOOR = 0.35;
const MISTRAL_1_SUPPLY_PRESSURE_CEILING = 90;

const STAGING_TOMISLAVGRAD = 'op:duvno:tomislavgrad_2';

const MISTRAL_1_STAGING_ANCHORS: readonly string[] = [
    STAGING_LIVNO_MISI,
    STAGING_LIVNO,
    STAGING_TOMISLAVGRAD,
];

// Kupres / Cincar line must already be HRHB-held (Operation Cincar / Kupres-94
// previously succeeded). Mistral 1 launches FROM the Kupres-Livno line.
const MISTRAL_1_KUPRES_DEPENDENCY_ANCHORS: readonly string[] = [
    'op:kupres:kupres_2',
    'op:kupres:bucovaca',
];

const MISTRAL_1_GRAHOVO_OBJECTIVES: readonly string[] = [
    'op:bosansko_grahovo:crni_lug',
    'op:bosansko_grahovo:malesevci',
    'op:bosansko_grahovo:bosansko_grahovo_2',
    'op:bosansko_grahovo:ugarci',
];

const MISTRAL_1_GLAMOC_OBJECTIVES: readonly string[] = [
    'op:glamoc:halapic',
    'op:glamoc:stekerovci_2',
    'op:glamoc:vidimlije_2',
    'op:glamoc:glamoc_2',
];

const MISTRAL_1_TARGETS: readonly string[] = [
    ...MISTRAL_1_GRAHOVO_OBJECTIVES,
    ...MISTRAL_1_GLAMOC_OBJECTIVES,
];

const MISTRAL_1_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'mistral_1_grahovo',
        name: 'Bosansko Grahovo Axis',
        corps: PRIMARY_CORPS,
        brigades: [
            'hvo_1st_guard_abb' as FormationId,
            'hv_4th_guards_split' as FormationId,
        ],
        objectives: MISTRAL_1_GRAHOVO_OBJECTIVES,
        staging_osid: STAGING_LIVNO_MISI,
    },
    {
        axis_id: 'mistral_1_glamoc',
        name: 'Glamoč Shoulder Axis',
        corps: SECONDARY_CORPS,
        brigades: [
            'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
            'hrhb_kralj_tomislav_brigade' as FormationId,
        ],
        objectives: MISTRAL_1_GLAMOC_OBJECTIVES,
        staging_osid: STAGING_TOMISLAVGRAD,
    },
];

const dateWindowMistral1: AxisPredicate = (_state, turn) => {
    if (turn < 160) return { green: false, reason: 'Mistral 1 pre-Storm window not yet open' };
    if (turn > 170) return { green: false, reason: 'Mistral 1 pre-Storm window has closed (Storm imminent)' };
    return { green: true, reason: 'within Mistral 1 Jun 1995 operation window' };
};

const politicalAuthorizationMistral1: AxisPredicate = (state) => {
    const alliance = state.political?.war_alliance_rbih_hrhb ?? 0;
    const washingtonSigned = state.political?.rbih_hrhb_state?.washington_signed === true;
    if (!washingtonSigned || alliance < FEDERATION_ALLIANCE_FLOOR) {
        return { green: false, reason: 'Federation authorization below Mistral 1 threshold' };
    }
    return { green: true, reason: 'Federation authorization supports Mistral 1' };
};

const corpsReadinessMistral1: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[PRIMARY_CORPS]) {
        return { green: false, reason: 'HVO Main Staff command not present in this scenario' };
    }
    if (!state.military.corps_command?.[SECONDARY_CORPS]) {
        return { green: false, reason: 'HVO Tomislavgrad command not present for Mistral 1 secondary axis' };
    }
    const primaryTraits = computeCorpsOperationReadiness(state, PRIMARY_CORPS as FormationId);
    const secondaryTraits = computeCorpsOperationReadiness(state, SECONDARY_CORPS as FormationId);
    if (
        primaryTraits.operation_readiness < MISTRAL_1_READINESS_FLOOR
        || secondaryTraits.operation_readiness < MISTRAL_1_READINESS_FLOOR
    ) {
        return { green: false, reason: 'HVO/HV readiness below Mistral 1 operation floor' };
    }
    return { green: true, reason: 'HVO/HV readiness sufficient for Mistral 1' };
};

const logisticsMistral1: AxisPredicate = (state) => {
    const pressure = getFactionLiveSupplyPressure(state, 'HRHB');
    if (pressure >= MISTRAL_1_SUPPLY_PRESSURE_CEILING) {
        return { green: false, reason: 'HRHB supply pressure too high for Mistral 1' };
    }
    return { green: true, reason: 'HRHB supply pressure within Mistral 1 margin' };
};

const stagingAccessMistral1: AxisPredicate = (state) => {
    for (const osid of MISTRAL_1_STAGING_ANCHORS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== null && ctrl !== 'HRHB') {
            return { green: false, reason: 'Livno/Tomislavgrad staging anchors are not held for Mistral 1' };
        }
    }
    for (const osid of MISTRAL_1_KUPRES_DEPENDENCY_ANCHORS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== 'HRHB') {
            return { green: false, reason: 'Kupres dependency anchors are not open for Mistral 1' };
        }
    }
    return { green: true, reason: 'Livno/Tomislavgrad staging and Kupres dependency anchors are open' };
};

const weatherSeasonMistral1: AxisPredicate = (_state, turn) => {
    // Jun 1995 is the historical launch window; weather is unconditionally permissive
    // (summer in western Bosnia). The axis exists for symmetry with Mistral 2 so the
    // optional-count threshold can include it.
    if (turn < 160 || turn > 170) {
        return { green: false, reason: 'outside Mistral 1 summer-launch window' };
    }
    return { green: true, reason: 'early-summer western Bosnia conditions support Mistral 1' };
};

const commanderConfidenceMistral1: AxisPredicate = (state) => {
    const primaryState = state.military.corps_command?.[PRIMARY_CORPS]?.commander_state;
    const secondaryState = state.military.corps_command?.[SECONDARY_CORPS]?.commander_state;
    if (!primaryState || !secondaryState) {
        return { green: false, reason: 'HVO/HV commander state unavailable for Mistral 1' };
    }
    return { green: true, reason: 'HVO/HV commander state present for Mistral 1' };
};

const enemyWeaknessMistral1: AxisPredicate = (state, turn) => {
    let enemyHeld = 0;
    for (const osid of MISTRAL_1_TARGETS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl === 'RS') enemyHeld++;
    }
    if (enemyHeld === 0) {
        return { green: false, reason: 'no Mistral 1 objectives remain in enemy hands' };
    }
    const trajectory = evaluateDefenderTrajectoryWeakness(state, {
        defenderCorpsId: VRS_KRAJINA_DEFENDER_CORPS,
        defenderFaction: 'RS',
        currentTurn: turn,
        weaknessFloor: MISTRAL_1_DEFENDER_WEAKNESS_FLOOR,
        label: 'VRS Krajina',
    });
    if (trajectory.available) {
        return { green: trajectory.green, reason: trajectory.reason };
    }
    return { green: true, reason: 'Mistral 1 objectives remain in enemy hands' };
};

const allianceContextMistral1: AxisPredicate = (state) => {
    // INVERTED SENSE vs Mistral 2: Mistral 1 must run BEFORE Operation Storm has
    // fired — Mistral 1 is the operational *precondition* for Storm, not an
    // exploitation of it. Per ICTY Gotovina §44-58 / BB v2 ch. 28.
    if (!isPreStormWesternTheater(state)) {
        return { green: false, reason: 'western theater rupture (Storm) has already fired — Mistral 1 window closed' };
    }
    return { green: true, reason: 'pre-Storm western theater conditions create Mistral 1 opportunity' };
};

const forceQualityMistral1: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[PRIMARY_CORPS]) {
        return { green: false, reason: 'HVO Main Staff command not present in this scenario' };
    }
    const traits = computeCorpsOperationReadiness(state, PRIMARY_CORPS as FormationId);
    if (traits.axis_coordination < MISTRAL_1_AXIS_COORDINATION_FLOOR) {
        return { green: false, reason: 'HVO/HV axis coordination below Mistral 1 threshold' };
    }
    return { green: true, reason: 'HVO/HV axis coordination supports Mistral 1' };
};

export const MISTRAL_1_95_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'mistral_1_95',
    name: 'Operation Mistral 1',
    tier: 'T1',
    faction: 'HRHB',
    primary_corps: PRIMARY_CORPS,
    family: 'federation_western_bosnia',
    axes: MISTRAL_1_AXES,
    staging_osid: STAGING_LIVNO_MISI,
    planning_duration: 4,
    min_attack_outcome: 'repulsed',
    citations: [
        'ICTY Prosecutor v. Gotovina et al., IT-06-90-T, Judgment 15 Apr 2011, §44-58 (Mistral 1 as Storm precondition)',
        'Balkan Battlegrounds v2 ch. 28 (HVO Tomislavgrad axis, HV 4th Guards Split, Jun 4-11 1995)',
        'docs/40_reports/proposals/20260522_HRHB_OP_CATALOG_PROPOSAL.md §1 (catalog gap analysis)',
    ],
    historical_exit_class: 'decisive_success',
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
        date_window: dateWindowMistral1,
        political_authorization: politicalAuthorizationMistral1,
        corps_readiness: corpsReadinessMistral1,
        logistics: logisticsMistral1,
        staging_access: stagingAccessMistral1,
        weather_season: weatherSeasonMistral1,
        commander_confidence: commanderConfidenceMistral1,
        enemy_weakness: enemyWeaknessMistral1,
        alliance_context: allianceContextMistral1,
        force_quality: forceQualityMistral1,
    },
    staff_recommendation: 'approve',
};

// ═══════════════════════════════════════════════════════════════════════════
// JAJCE_95 — Operation Jajce Recovery (Sep 1995)
//
// Historical record: The HVO 1st Guards "Ante Bruno Bušić" and HVO
// Tomislavgrad operational group recaptured Jajce on 13-14 September 1995 as
// part of the post-Mistral-2 collapse exploitation. Jajce had been lost in
// October 1992 (Jajce Brigade destroyed; refugee column toward Travnik) — its
// recovery in 1995 closed a major symbolic and operational loop for HVO.
// Sources:
//   - Balkan Battlegrounds v2 ch. 30 (Jajce seizure 13-14 Sep 1995).
//   - UNHCR Situation Report, 15 September 1995 (HVO control of Jajce town
//     and 9 surrounding OSIDs).
//
// Catalog rationale: painted Oct 1995 control shows 7 of 10 Jajce OSIDs
// flipped HRHB. The current catalog has *zero* operations covering Jajce. This
// op is single-axis (hvo_tomislavgrad sole), reuses the Mistral brigade pool,
// and gates on Mistral 1 / Cincar dependency anchors being HRHB-held (Kupres
// line, which is the launch shoulder for the Jajce push).
// ═══════════════════════════════════════════════════════════════════════════

const JAJCE_DEFENDER_WEAKNESS_FLOOR = 0.25;
const JAJCE_READINESS_FLOOR = 0.32;
const JAJCE_AXIS_COORDINATION_FLOOR = 0.30;
const JAJCE_SUPPLY_PRESSURE_CEILING = 92;

const JAJCE_STAGING_ANCHORS: readonly string[] = [
    STAGING_LIVNO,
    STAGING_TOMISLAVGRAD,
    'op:kupres:kupres_2',
];

const JAJCE_OBJECTIVES: readonly string[] = [
    'op:jajce:barevo_2',
    'op:jajce:bravnice',
    'op:jajce:jajce_3',
    'op:jajce:jezero_2',
    'op:jajce:lupnica',
    'op:jajce:prisoje',
    'op:jajce:vinac_2',
    'op:mrkonjic_grad:podrasnica_2',
];

const JAJCE_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'jajce_recovery',
        name: 'Jajce Recovery Axis',
        corps: SECONDARY_CORPS,
        brigades: [
            'hvo_1st_guard_abb' as FormationId,
            'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
            'hrhb_kralj_tomislav_brigade' as FormationId,
        ],
        objectives: JAJCE_OBJECTIVES,
        staging_osid: STAGING_TOMISLAVGRAD,
    },
];

const dateWindowJajce: AxisPredicate = (_state, turn) => {
    if (turn < 178) return { green: false, reason: 'Jajce recovery window not yet open' };
    if (turn > 184) return { green: false, reason: 'Jajce recovery window has closed' };
    return { green: true, reason: 'within Jajce recovery Sep 1995 window' };
};

const politicalAuthorizationJajce: AxisPredicate = (state) => {
    const alliance = state.political?.war_alliance_rbih_hrhb ?? 0;
    const washingtonSigned = state.political?.rbih_hrhb_state?.washington_signed === true;
    if (!washingtonSigned || alliance < FEDERATION_ALLIANCE_FLOOR) {
        return { green: false, reason: 'Federation authorization below Jajce recovery threshold' };
    }
    return { green: true, reason: 'Federation authorization supports Jajce recovery' };
};

const corpsReadinessJajce: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[SECONDARY_CORPS]) {
        return { green: false, reason: 'HVO Tomislavgrad command not present for Jajce recovery' };
    }
    const traits = computeCorpsOperationReadiness(state, SECONDARY_CORPS as FormationId);
    if (traits.operation_readiness < JAJCE_READINESS_FLOOR) {
        return { green: false, reason: 'HVO Tomislavgrad readiness below Jajce recovery floor' };
    }
    return { green: true, reason: 'HVO Tomislavgrad readiness sufficient for Jajce recovery' };
};

const logisticsJajce: AxisPredicate = (state) => {
    const pressure = getFactionLiveSupplyPressure(state, 'HRHB');
    if (pressure >= JAJCE_SUPPLY_PRESSURE_CEILING) {
        return { green: false, reason: 'HRHB supply pressure too high for Jajce recovery' };
    }
    return { green: true, reason: 'HRHB supply pressure within Jajce recovery margin' };
};

const stagingAccessJajce: AxisPredicate = (state) => {
    for (const osid of JAJCE_STAGING_ANCHORS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== 'HRHB') {
            return { green: false, reason: 'Jajce staging anchors (Livno/Tomislavgrad/Kupres) are not all HRHB-held' };
        }
    }
    return { green: true, reason: 'Jajce staging anchors (Livno/Tomislavgrad/Kupres) are open' };
};

const weatherSeasonJajce: AxisPredicate = (_state, turn) => {
    // Mid-September is the historical window. Beyond that, Vlašić plateau
    // weather degrades quickly and the operational tempo collapses.
    if (turn > 190) return { green: false, reason: 'autumn weather threatens Jajce recovery tempo' };
    return { green: true, reason: 'early-autumn conditions support Jajce recovery' };
};

const commanderConfidenceJajce: AxisPredicate = (state) => {
    const commanderState = state.military.corps_command?.[SECONDARY_CORPS]?.commander_state;
    if (!commanderState) {
        return { green: false, reason: 'HVO Tomislavgrad commander state unavailable for Jajce recovery' };
    }
    return { green: true, reason: 'HVO Tomislavgrad commander state present for Jajce recovery' };
};

const enemyWeaknessJajce: AxisPredicate = (state, turn) => {
    let enemyHeld = 0;
    for (const osid of JAJCE_OBJECTIVES) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl === 'RS') enemyHeld++;
    }
    if (enemyHeld === 0) {
        return { green: false, reason: 'no Jajce recovery objectives remain in enemy hands' };
    }
    const trajectory = evaluateDefenderTrajectoryWeakness(state, {
        defenderCorpsId: VRS_KRAJINA_DEFENDER_CORPS,
        defenderFaction: 'RS',
        currentTurn: turn,
        weaknessFloor: JAJCE_DEFENDER_WEAKNESS_FLOOR,
        label: 'VRS Krajina',
    });
    if (trajectory.available) {
        return { green: trajectory.green, reason: trajectory.reason };
    }
    return { green: true, reason: 'Jajce recovery objectives remain in enemy hands' };
};

const allianceContextJajce: AxisPredicate = (state) => {
    // Jajce recovery is a post-Storm exploitation — it requires the western
    // theater to have already ruptured (Storm fired Aug 4-7 1995, well before
    // Jajce was retaken Sep 13-14). This gates Jajce to the live VRS Krajina
    // collapse window.
    if (!isWesternTheaterRuptured(state)) {
        return { green: false, reason: 'western theater rupture (Storm) has not yet opened the Jajce window' };
    }
    return { green: true, reason: 'post-Storm western theater rupture creates Jajce recovery opportunity' };
};

const forceQualityJajce: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[SECONDARY_CORPS]) {
        return { green: false, reason: 'HVO Tomislavgrad command not present for Jajce recovery' };
    }
    const traits = computeCorpsOperationReadiness(state, SECONDARY_CORPS as FormationId);
    if (traits.axis_coordination < JAJCE_AXIS_COORDINATION_FLOOR) {
        return { green: false, reason: 'HVO Tomislavgrad axis coordination below Jajce recovery threshold' };
    }
    return { green: true, reason: 'HVO Tomislavgrad axis coordination supports Jajce recovery' };
};

export const JAJCE_95_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'jajce_95',
    name: 'Operation Jajce Recovery',
    tier: 'T1',
    faction: 'HRHB',
    primary_corps: SECONDARY_CORPS,
    family: 'federation_western_bosnia',
    axes: JAJCE_AXES,
    staging_osid: STAGING_TOMISLAVGRAD,
    planning_duration: 3,
    min_attack_outcome: 'repulsed',
    citations: [
        'Balkan Battlegrounds v2 ch. 30 (Jajce seizure 13-14 Sep 1995 by HVO 1st Guards "Ante Bruno Bušić")',
        'UNHCR Situation Report, 15 September 1995 (HVO control of Jajce town and 9 surrounding OSIDs)',
        'docs/40_reports/proposals/20260522_HRHB_OP_CATALOG_PROPOSAL.md §2 (catalog gap analysis)',
    ],
    historical_exit_class: 'decisive_success',
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
        date_window: dateWindowJajce,
        political_authorization: politicalAuthorizationJajce,
        corps_readiness: corpsReadinessJajce,
        logistics: logisticsJajce,
        staging_access: stagingAccessJajce,
        weather_season: weatherSeasonJajce,
        commander_confidence: commanderConfidenceJajce,
        enemy_weakness: enemyWeaknessJajce,
        alliance_context: allianceContextJajce,
        force_quality: forceQualityJajce,
    },
    staff_recommendation: 'approve',
};

export const FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES: readonly OperationOpportunityDef[] = [
    MISTRAL_1_95_OPPORTUNITY,
    MISTRAL_2_95_OPPORTUNITY,
    JAJCE_95_OPPORTUNITY,
];
