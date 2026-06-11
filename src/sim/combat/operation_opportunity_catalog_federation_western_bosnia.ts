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
// deltas land. NOTE 2026-05-25: floor is bypassed when vrs_2nd_krajina has
// no active subordinates (evaluateDefenderTrajectoryWeakness returns
// available=false → always green). Floor 0.20 and 0.28 produced identical
// hashes — the cascade is combat-math driven, not floor-gated.
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

// Mistral 2 owns the Drvar/Grahovo and Sipovo exploitation. Mrkonjic Grad is
// modeled separately as Southern Move after Sipovo staging anchors are held.
const MISTRAL_SIPOVO_OBJECTIVES: readonly string[] = [
    'op:sipovo:brdjani',
    'op:sipovo:gornji_mujdzici_2',
    'op:sipovo:sipovo_2',
    'op:sipovo:volari_2',
    'op:sipovo:pribeljci_2',
];

const SOUTHERN_MOVE_STAGING_ANCHORS: readonly string[] = [
    'op:sipovo:sipovo_2',
    'op:sipovo:pribeljci_2',
];

const SOUTHERN_MOVE_MRKONJIC_OBJECTIVES: readonly string[] = [
    'op:mrkonjic_grad:gerzovo_2',
    'op:mrkonjic_grad:majdan_2',
    'op:mrkonjic_grad:podrasnica_2',
    'op:mrkonjic_grad:mrkonjic_grad_2',
    'op:mrkonjic_grad:bjelajce_2',
    'op:mrkonjic_grad:baljvine_2',
];

const MISTRAL_TARGETS: readonly string[] = [
    ...MISTRAL_DRVAR_GRAHOVO_OBJECTIVES,
    ...MISTRAL_SIPOVO_OBJECTIVES,
];

const MISTRAL_READINESS_FLOOR = 0.36;
const MISTRAL_AXIS_COORDINATION_FLOOR = 0.35;
const MISTRAL_SUPPLY_PRESSURE_CEILING = 90;
const FEDERATION_ALLIANCE_FLOOR = 0.50;

const MISTRAL_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'mistral_drvar_grahovo',
        name: 'Drvar / Grahovo Axis',
        // Wave 28 (2026-05-23): re-apply Wave 25 — re-host on SECONDARY_CORPS
        // (hvo_tomislavgrad). hvo_main_staff has zero front sectors so
        // reconcileOperationRoster drains brigades carrying non-matching
        // sector claims (same bug Wave 19A fixed for Mistral 1).
        corps: SECONDARY_CORPS,
        brigades: [
            'hvo_1st_guard_abb' as FormationId,
            'hv_4th_guards_split' as FormationId,
            'hvo_2nd_guard_mechanized' as FormationId,
            // HV OG West 1995 phantom — corps=hvo_tomislavgrad matches axis host;
            // pulls Drvar exploitation mass per BB v2 ch. 28 + HVO catalog synthesis §2.2.
            'hv_112th_infantry_1995' as FormationId,
        ],
        objectives: MISTRAL_DRVAR_GRAHOVO_OBJECTIVES,
        staging_osid: STAGING_LIVNO_MISI,
    },
    {
        axis_id: 'mistral_sipovo',
        name: 'Sipovo Axis',
        corps: SECONDARY_CORPS,
        // Wave 28: substituted 3 inactive HRHB brigades with 2 live HVO Guards
        // brigades. Kralj Petar Krešimir IV + Kralj Tomislav + HV 7th Guards
        // Varaždin were status='inactive' at t175 in n1987 (spent in Cincar
        // t132-141 + never recovered). hvo_3rd_guard_jastrebovi + hvo_rama_brigade
        // are status='active' at t175 and not committed to concurrent ops.
        brigades: [
            'hvo_3rd_guard_jastrebovi' as FormationId,
            'hvo_rama_brigade' as FormationId,
        ],
        objectives: MISTRAL_SIPOVO_OBJECTIVES,
        staging_osid: STAGING_LIVNO,
    },
];

const MISTRAL_DRVAR_GRAHOVO_AXIS: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'mistral_drvar_grahovo',
        name: 'Drvar / Grahovo Axis',
        // Wave 28 (2026-05-23): re-apply Wave 25 — re-host on SECONDARY_CORPS
        // (hvo_tomislavgrad). hvo_main_staff has zero front sectors so
        // reconcileOperationRoster drains brigades carrying non-matching
        // sector claims (same bug Wave 19A fixed for Mistral 1).
        corps: SECONDARY_CORPS,
        brigades: [
            'hvo_1st_guard_abb' as FormationId,
            'hv_4th_guards_split' as FormationId,
            'hvo_2nd_guard_mechanized' as FormationId,
            // HV OG West 1995 phantom — corps=hvo_tomislavgrad matches axis host;
            // pulls Drvar exploitation mass per BB v2 ch. 28 + HVO catalog synthesis §2.2.
            'hv_112th_infantry_1995' as FormationId,
        ],
        objectives: MISTRAL_DRVAR_GRAHOVO_OBJECTIVES,
        staging_osid: STAGING_LIVNO_MISI,
    },
];

const MISTRAL_SIPOVO_AXIS: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'mistral_sipovo',
        name: 'Sipovo Axis',
        corps: SECONDARY_CORPS,
        // Wave 28: substituted 3 inactive HRHB brigades with 2 live HVO Guards
        // brigades. Kralj Petar Krešimir IV + Kralj Tomislav + HV 7th Guards
        // Varaždin were status='inactive' at t175 in n1987 (spent in Cincar
        // t132-141 + never recovered). hvo_3rd_guard_jastrebovi + hvo_rama_brigade
        // are status='active' at t175 and not committed to concurrent ops.
        brigades: [
            'hvo_3rd_guard_jastrebovi' as FormationId,
            'hvo_rama_brigade' as FormationId,
        ],
        objectives: MISTRAL_SIPOVO_OBJECTIVES,
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
    // Wave 28 (2026-05-23): re-applying Wave 25 — hosted on hvo_tomislavgrad
    // (SECONDARY_CORPS), not hvo_main_staff (PRIMARY_CORPS / zero-sector shell).
    // Mirrors Wave 19A fix for Mistral 1. Test re-application to measure
    // spatial-accuracy impact via the new Wave 27 osid_pair_match metric.
    primary_corps: SECONDARY_CORPS,
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
            variant_id: 'sipovo_axis',
            name: 'Sipovo Axis',
            axes: MISTRAL_SIPOVO_AXIS,
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

const SOUTHERN_MOVE_READINESS_FLOOR = 0.36;
const SOUTHERN_MOVE_AXIS_COORDINATION_FLOOR = 0.35;
const SOUTHERN_MOVE_SUPPLY_PRESSURE_CEILING = 90;
const SOUTHERN_MOVE_DEFENDER_WEAKNESS_FLOOR = 0.20;

// Mrkonjić roster fix (panel-GO 2026-06-11, re-floor 651→658):
// Replaces the broken roster (3 hvo_main_staff brigades + 3 phantoms not in OOB)
// with verified hvo_tomislavgrad-resident brigades.
// Root cause: hvo_1st_guard_abb, hvo_2nd_guard_mechanized, hvo_3rd_guard_jastrebovi
// are all corps=hvo_main_staff in the OOB; hv_4th_guards_brigade_1995,
// hv_7th_guards_brigade_1995, hv_134th_hgr_1995 are jna_phantom_brigades with wrong
// corps assignments (not hvo_tomislavgrad). reconcileOperationRoster drops any brigade
// whose sector claim ≠ axis host corps → zero_eligible_axis at t182 → 6 Mrkonjić
// OSIDs stay RS. Fix: substitutes confirmed hvo_tomislavgrad in oob_brigades.json:
// hrhb_kralj_petar_kreimir_iv_brigade, hrhb_kralj_tomislav_brigade, hvo_rama_brigade
// + HV loans (hv_4th_guards_split, hv_1st_guards_tigers, hv_5th_guards_karlovac)
// which spawn into HV_CORPS_ID = hvo_tomislavgrad via hv_integration.ts.
// Proposal: docs/40_reports/proposals/20260611_western_krajina_next_levers.md §A.
const _SOUTHERN_MOVE_BRIGADES: readonly FormationId[] = [
    // hvo_tomislavgrad OOB brigades (oob_brigades.json confirmed):
    'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
    'hrhb_kralj_tomislav_brigade' as FormationId,
    'hvo_rama_brigade' as FormationId,
    // HV loan brigades — spawn into hvo_tomislavgrad via HV_CORPS_ID (hv_integration.ts):
    'hv_4th_guards_split' as FormationId,
    'hv_1st_guards_tigers' as FormationId,
    'hv_5th_guards_karlovac' as FormationId,
];

const SOUTHERN_MOVE_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'southern_move_mrkonjic',
        name: 'Mrkonjic Grad Axis',
        corps: SECONDARY_CORPS,
        brigades: _SOUTHERN_MOVE_BRIGADES,
        objectives: SOUTHERN_MOVE_MRKONJIC_OBJECTIVES,
        staging_osid: 'op:sipovo:sipovo_2',
    },
];

const dateWindowSouthernMove: AxisPredicate = (_state, turn) => {
    if (turn < 182) return { green: false, reason: 'Southern Move window not yet open' };
    if (turn > 188) return { green: false, reason: 'Southern Move window has closed' };
    return { green: true, reason: 'within Southern Move Oct 1995 window' };
};

const politicalAuthorizationSouthernMove = politicalAuthorizationMistral;

const corpsReadinessSouthernMove: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[SECONDARY_CORPS]) {
        return { green: false, reason: 'HVO Tomislavgrad command not present for Southern Move' };
    }
    const traits = computeCorpsOperationReadiness(state, SECONDARY_CORPS as FormationId);
    if (traits.operation_readiness < SOUTHERN_MOVE_READINESS_FLOOR) {
        return { green: false, reason: 'HVO/HV readiness below Southern Move operation floor' };
    }
    return { green: true, reason: 'HVO/HV readiness sufficient for Southern Move' };
};

const logisticsSouthernMove: AxisPredicate = (state) => {
    const pressure = getFactionLiveSupplyPressure(state, 'HRHB');
    if (pressure >= SOUTHERN_MOVE_SUPPLY_PRESSURE_CEILING) {
        return { green: false, reason: 'HRHB supply pressure too high for Southern Move' };
    }
    return { green: true, reason: 'HRHB supply pressure within Southern Move margin' };
};

const stagingAccessSouthernMove: AxisPredicate = (state) => {
    for (const osid of SOUTHERN_MOVE_STAGING_ANCHORS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== 'HRHB') {
            return { green: false, reason: 'Sipovo staging anchors are not HRHB-held for Southern Move' };
        }
    }
    return { green: true, reason: 'Sipovo staging anchors are open for Southern Move' };
};

const weatherSeasonSouthernMove: AxisPredicate = (_state, turn) => {
    if (turn > 188) return { green: false, reason: 'late-autumn weather threatens Southern Move tempo' };
    return { green: true, reason: 'October western Bosnia conditions support Southern Move' };
};

const commanderConfidenceSouthernMove: AxisPredicate = (state) => {
    const secondaryState = state.military.corps_command?.[SECONDARY_CORPS]?.commander_state;
    if (!secondaryState) {
        return { green: false, reason: 'HVO/HV commander state unavailable for Southern Move' };
    }
    return { green: true, reason: 'HVO/HV commander state present for Southern Move' };
};

const enemyWeaknessSouthernMove: AxisPredicate = (state, turn) => {
    let enemyHeld = 0;
    for (const osid of SOUTHERN_MOVE_MRKONJIC_OBJECTIVES) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl === 'RS') enemyHeld++;
    }
    if (enemyHeld === 0) {
        return { green: false, reason: 'no Southern Move objectives remain in enemy hands' };
    }
    const trajectory = evaluateDefenderTrajectoryWeakness(state, {
        defenderCorpsId: VRS_1ST_KRAJINA_DEFENDER_CORPS,
        defenderFaction: 'RS',
        currentTurn: turn,
        weaknessFloor: SOUTHERN_MOVE_DEFENDER_WEAKNESS_FLOOR,
        label: 'VRS 1st Krajina',
    });
    if (trajectory.available) {
        return { green: trajectory.green, reason: trajectory.reason };
    }
    return { green: true, reason: 'Southern Move objectives remain in enemy hands' };
};

const allianceContextSouthernMove = allianceContextMistral;

const forceQualitySouthernMove: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[SECONDARY_CORPS]) {
        return { green: false, reason: 'HVO Tomislavgrad command not present for Southern Move' };
    }
    const traits = computeCorpsOperationReadiness(state, SECONDARY_CORPS as FormationId);
    if (traits.axis_coordination < SOUTHERN_MOVE_AXIS_COORDINATION_FLOOR) {
        return { green: false, reason: 'HVO/HV axis coordination below Southern Move threshold' };
    }
    return { green: true, reason: 'HVO/HV axis coordination supports Southern Move' };
};

export const SOUTHERN_MOVE_95_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'southern_move_95',
    name: 'Operation Southern Move',
    tier: 'T1',
    faction: 'HRHB',
    primary_corps: SECONDARY_CORPS,
    family: 'federation_western_bosnia',
    axes: SOUTHERN_MOVE_AXES,
    staging_osid: 'op:sipovo:sipovo_2',
    planning_duration: 2,
    min_attack_outcome: 'repulsed',
    citations: [
        'docs/40_reports/proposals/20260523_HVO_CATALOG_SYNTHESIS.md - Southern Move HVO/HV catalog synthesis',
        'src/sim/combat/triggered_operations.ts - legacy late-war western Bosnia operation footprint',
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
        date_window: dateWindowSouthernMove,
        political_authorization: politicalAuthorizationSouthernMove,
        corps_readiness: corpsReadinessSouthernMove,
        logistics: logisticsSouthernMove,
        staging_access: stagingAccessSouthernMove,
        weather_season: weatherSeasonSouthernMove,
        commander_confidence: commanderConfidenceSouthernMove,
        enemy_weakness: enemyWeaknessSouthernMove,
        alliance_context: allianceContextSouthernMove,
        force_quality: forceQualitySouthernMove,
    },
    staff_recommendation: 'approve',
};

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

// Cincar's Bučovača shoulder must already be HRHB-held (Phase 1 success).
// Mistral 1 launches FROM the Livno-Bučovača line. Wave 9D removed
// op:kupres:kupres_2 because the Cincar Phase 2 cascade has not been able
// to deliver Kupres town within the engine's current movement contract;
// Mistral 1 launching from the southern Bučovača-Livno shoulder while
// Kupres remains in RS hands is a partial-relaxation of the historical
// staging line but still defensible (the operational base was the
// Tomislavgrad-Livno-Bučovača arc, not Kupres town itself).
const MISTRAL_1_KUPRES_DEPENDENCY_ANCHORS: readonly string[] = [
    'op:kupres:bucovaca',
];

const MISTRAL_1_GRAHOVO_OBJECTIVES: readonly string[] = [
    'op:bosansko_grahovo:crni_lug',
    'op:bosansko_grahovo:malesevci',
    'op:bosansko_grahovo:bosansko_grahovo_2',
    'op:bosansko_grahovo:ugarci',
];

// Wave 23A (2026-05-23): reordered for OSID-adjacency reachability after Wave 22's
// Cincar success now puts Kupres area under HRHB control. Per n1985 SCRT memo
// (docs/40_reports/audits/20260523_WAVE_22_CINCAR_BREAKTHROUGH_N1985.md §(d)):
//   - vidimlije_2 is adjacent to donji_malovan + kupres_2 + novo_selo_2 (all
//     HRHB after Cincar) AND pre-existing livno:priluka_2 / zastinje. Reachable.
//   - glamoc_2 is adjacent to livno:priluka_2 (pre-existing HRHB). Reachable.
//   - halapic + stekerovci_2 have ZERO HRHB neighbors — deep-interior, only
//     reachable after vidimlije_2/glamoc_2 fall.
// Previous order put halapic + stekerovci_2 FIRST, brigade brain returned
// no_approach_osid every turn for the unreachable head of the list (same bug
// class Wave 22 fixed for Cincar). New order targets reachable Glamoč shoulder
// first, then chains inward.
//
// Wave 31 (2026-06-07): the full Glamoč/Livno shoulder (Operation Summer '95 /
// "Ljeto '95", HV Split Corps OG Rujani under Gotovina, 25-29 Jul 1995 —
// captured Glamoč + Bosansko Grahovo + the Livanjsko Polje shoulder) was only
// reaching pribelja/kovacevci_2/gubin_2 via OPPORTUNISTIC free-HV-brigade
// captures (hv_1st_guards_tigers, hv_5th_guards_karlovac) at wk164/wk180 on the
// 188w floor — a determinism-fragile path that evaporates under unrelated global
// perturbations (e.g. the Drina-Corps/Zvornik garrison hold). Making these three
// historically-Glamoč/Livno OSIDs explicit Mistral 1 objectives routes their
// capture through the deterministic catalog op instead. OSID-adjacency order
// (operational_contact_graph.json): pribelja adj glamoc_2 + vidimlije_2;
// kovacevci_2 adj glamoc_2 + pribelja; gubin_2 (Livno) adj glamoc_2 + halapic +
// pre-existing livno:priluka_2. Inserted reachable-first so the brigade brain
// never heads an unreachable objective.
// Sources: Wikipedia "Operation Summer '95" (OG Rujani, Gotovina, 8,500 HV/HVO
// vs VRS 2nd Krajina Corps, captured Glamoč + B. Grahovo 25-29 Jul 1995),
// cross-checked; ICTY Gotovina §44-58 (Mistral 1 / Storm precondition arc).
const MISTRAL_1_GLAMOC_OBJECTIVES: readonly string[] = [
    'op:glamoc:vidimlije_2',
    'op:glamoc:glamoc_2',
    'op:glamoc:pribelja',
    'op:glamoc:kovacevci_2',
    'op:glamoc:halapic',
    'op:livno:gubin_2',
    'op:glamoc:stekerovci_2',
];

const MISTRAL_1_TARGETS: readonly string[] = [
    ...MISTRAL_1_GRAHOVO_OBJECTIVES,
    ...MISTRAL_1_GLAMOC_OBJECTIVES,
];

// Wave 19A: both axes hosted on SECONDARY_CORPS (hvo_tomislavgrad). Per
// `docs/40_reports/audits/20260522_MISTRAL_1_BRIGADE_DRAIN.md`, hvo_main_staff
// is a corps shell with ZERO front sectors; reconcileOperationRoster at
// final_operation_truth_reconciliation.ts:44-47 drops any brigade whose sector
// claim ≠ host corps, and ALL 4 Mistral 1 brigades (including hvo_1st_guard_abb
// after the t159 elite-loan to hvo_tomislavgrad) carry sector:hvo_tomislavgrad:0
// claims. Hosting both axes on hvo_tomislavgrad lets the reconciler keep all
// 4 brigades on the roster. The op-level primary_corps is also moved to
// hvo_tomislavgrad below.
const MISTRAL_1_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'mistral_1_grahovo',
        name: 'Bosansko Grahovo Axis',
        corps: SECONDARY_CORPS,
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
            // HV OG West 1995 phantom — corps=hvo_tomislavgrad matches axis host.
            // Wired to the Glamoč axis (not Grahovo) to avoid extending the
            // shared-brigade grahovo axis past Mistral 2's t175 launch window —
            // preserves Mistral 2 AAR archive cleanup (recovery → operation_history).
            'hv_7th_hgr_1995' as FormationId,
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
            return { green: false, reason: 'Bučovača (Cincar Phase 1 shoulder) is not HRHB-held for Mistral 1' };
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

// Wave 12 (2026-05-22): `min_attack_outcome: 'repulsed'` is the catalog FLOOR.
// `'repulsed'` maps to STALEMATE_FLOOR/REPULSED_FLOOR ≥ 0.5 (per
// combat_math.ts:96) — below the default `'costly_victory'` (≥ 1.0) and the
// `'stalemate'` setting (≥ 0.7). Cannot be lowered further at the catalog
// boundary; the per-brigade attack threshold path
// (bot_brigade_ai_osid.ts:355-359) is already at the most permissive setting.
//
// Live recovery_reason `defender_power_too_high` observed at t=160-162 in
// n1974 is NOT controlled by this field. It fires from
// sector_offensive.ts:813 / 869 / 946 against `op.force_ratio_estimate <
// MIN_LAUNCH_FORCE_RATIO_FLOOR (=0.3)` (sector_offensive.ts:201). Historical
// justification for accepting sub-1.0 local ratios at launch (Gotovina §54)
// is engine-level work — would require either (a) raising
// MIN_LAUNCH_FORCE_RATIO_FLOOR per-op via a new field, or (b) wiring
// op.min_attack_outcome into the prep-time `MIN_LAUNCH_FORCE_RATIO_FLOOR`
// check so 'repulsed' relaxes the launch floor from 0.3 → REPULSED_FLOOR=0.5
// (or lower for desperate ops). Both options are out of scope for Wave 12.
// See memo: docs/40_reports/proposals/20260522_WAVE_12_MISTRAL1_THRESHOLD_JAJCE_CORPS.md §1.
export const MISTRAL_1_95_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'mistral_1_95',
    name: 'Operation Mistral 1',
    tier: 'T1',
    faction: 'HRHB',
    // Wave 19A: hosted on hvo_tomislavgrad (SECONDARY_CORPS), not hvo_main_staff
    // (PRIMARY_CORPS). hvo_main_staff has ZERO front sectors so the reconciler
    // drops all foreign-sector-claim brigades — see MISTRAL_1_BRIGADE_DRAIN memo.
    primary_corps: SECONDARY_CORPS,
    family: 'federation_western_bosnia',
    axes: MISTRAL_1_AXES,
    staging_osid: STAGING_LIVNO_MISI,
    planning_duration: 4,
    min_attack_outcome: 'repulsed',
    citations: [
        'ICTY Prosecutor v. Gotovina et al., IT-06-90-T, Judgment 15 Apr 2011, §44-58 (Mistral 1 as Storm precondition; §54 documents force-of-action at sub-1.0 local ratios)',
        'Balkan Battlegrounds v2 ch. 28 (HVO Tomislavgrad axis, HV 4th Guards Split, Jun 4-11 1995)',
        'docs/40_reports/proposals/20260522_HRHB_OP_CATALOG_PROPOSAL.md §1 (catalog gap analysis)',
        'docs/40_reports/proposals/20260522_WAVE_12_MISTRAL1_THRESHOLD_JAJCE_CORPS.md §1 (threshold-floor verification)',
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
// Historical record: Jajce was recaptured on 13-14 September 1995 as part of
// the post-Mistral-2 collapse exploitation. Jajce had been lost in October
// 1992 (Jajce Brigade destroyed; refugee column toward Travnik). The 1995
// recovery was Federation-coordinated:
//   - ARBiH 7th Corps under Mehmed Alagić led the northward push from Travnik
//     / Donji Vakuf, breaking the Komar line and clearing Vlašić plateau
//     approaches.
//   - ARBiH 5th Corps linked up from the Bihać direction (Sana operation).
//   - HVO contributed (HVO 1st Guards "Ante Bruno Bušić" appears in operational
//     accounts, but the southern HVO Tomislavgrad axis was running Mistral 2
//     toward Drvar/Šipovo at the same time, not Jajce).
// Sources:
//   - Balkan Battlegrounds v2 ch. 30 (Jajce seizure 13-14 Sep 1995, ARBiH 7th
//     Corps under Alagić as principal instrument).
//   - ICTY Prosecutor v. Hadžihasanović IT-01-47-T trial record (ARBiH 7th
//     Corps order of battle, brigade composition in central Bosnia ridge sector).
//   - UNHCR Situation Report, 15 September 1995 (Federation control of Jajce
//     town and 9 surrounding OSIDs).
//
// Wave 12 re-host (2026-05-22): the op was originally authored on
// `hvo_tomislavgrad` for catalog-symmetry with the Mistral 2 family. That
// placement was always weak — Tomislavgrad's front sectors do not reach Jajce
// and the per-turn brigade brain stalls at `no_approach_osid` even after the
// launch helper's sub-segment fallback (Wave 11) because the Tomislavgrad sub-
// segments cover Livno/Glamoč/Šipovo, not the Bugojno/Donji Vakuf approach.
//
// Per user directive 2026-05-19, ARBiH 7th Corps was removed from the OOB —
// its brigades (705th Bugojno, 717th Gornji Vakuf, 727th Travnik, 770th Donji
// Vakuf, etc.) were rolled into ARBiH 3rd Corps in our reduced-OOB scenario.
// This is the corps that already runs Vlašić 95 and Donji Vakuf 95 on
// adjacent fronts and whose live front sectors (per latest_run_final_save
// inspection) include `sector:arbih_3rd_corps:1` with friendly OSIDs
// `op:donji_vakuf:donji_vakuf_2` / `op:donji_vakuf:komar_2` and enemy
// `op:jajce:grdovo` / `op:donji_vakuf:torlakovac_2` — i.e., the corps's front
// physically reaches the Jajce zone by t≥178.
//
// Defender corps corrected from `vrs_2nd_krajina` (Drvar/Grahovo shoulder) to
// `vrs_1st_krajina` (the corps that actually holds Jajce per live save:
// sector:vrs_1st_krajina:7 contains all relevant Jajce/Donji Vakuf OSIDs).
//
// Catalog rationale: painted Oct 1995 control shows 7 of 10 Jajce OSIDs
// flipped Federation. With Mistral 2's Šipovo/Mrkonjić axis already running
// hvo_tomislavgrad brigades, the Jajce push has no spare HVO Tomislavgrad
// capacity. Re-hosting on arbih_3rd_corps:
//   (a) puts the op on the corps whose front line is physically adjacent to
//       the objective set,
//   (b) uses ARBiH brigades that historically performed the operation
//       (rolled-up 7th Corps brigades on the 3rd Corps roster),
//   (c) leaves the Mistral 2 HVO/HV brigade pool undisturbed.
//
// Wave 14 axis split (2026-05-22): the single 11-OSID axis was failing at
// `no_approach_osid` because 8 of 11 targets lay deep in RS rear with no
// shared front edge to any `arbih_3rd_corps:N` sub-segment (see SCRT memo
// docs/40_reports/audits/20260522_WAVE_11_12_13_BREAKTHROUGH_N1975.md §Q5).
// Restructured into a NEAR axis (3 sub-segment-reachable OSIDs) and a RING
// axis (7 deep-Jajce OSIDs, deferred via the engine's empty-axis skip path
// until the corridor opens). `op:mrkonjic_grad:podrasnica_2` was dropped
// from the op entirely — it connects only to the Mrkonjić cluster (Mistral 2
// footprint), not to any Jajce-municipality OSID. Proposal memo:
// docs/40_reports/proposals/20260522_WAVE_14_JAJCE_AXIS_SPLIT.md.
// ═══════════════════════════════════════════════════════════════════════════

const JAJCE_PRIMARY_CORPS = 'arbih_3rd_corps';
const JAJCE_DEFENDER_WEAKNESS_FLOOR = 0.25;
const JAJCE_READINESS_FLOOR = 0.32;
const JAJCE_AXIS_COORDINATION_FLOOR = 0.30;
const JAJCE_SUPPLY_PRESSURE_CEILING = 92;
const VRS_1ST_KRAJINA_DEFENDER_CORPS = 'vrs_1st_krajina' as FormationId;

// Staging from the Bugojno/Travnik shoulder — ARBiH-held in Jan 1993 baseline
// and persists through the late-war window. Bugojno (gracanica) is the
// historical 7th Corps logistics line for the Donji Vakuf / Jajce push per
// BB v2 ch. 30. Turbe (op:travnik:turbe_2) is the Donji Vakuf 95 staging
// node and is also acceptable as a secondary anchor.
const JAJCE_STAGING_BUGOJNO = 'op:bugojno:gracanica';
const JAJCE_STAGING_TURBE = 'op:travnik:turbe_2';
const JAJCE_STAGING_ANCHORS: readonly string[] = [
    JAJCE_STAGING_BUGOJNO,
    JAJCE_STAGING_TURBE,
];

// Wave 14 (2026-05-22): axis split honoring sub-segment topology.
//
// Per n1975 SCRT memo (docs/40_reports/audits/20260522_WAVE_11_12_13_BREAKTHROUGH_N1975.md
// §Q5), the previous 11-objective single-axis pool failed at `no_approach_osid`
// because only 3 of 11 OSIDs appear in any `arbih_3rd_corps` front-sector
// sub-segment's `enemy_osids`. The Wave 11 sub-segment fallback in
// `collectObjectiveApproachOsids` (sector_offensive_launch_helpers.ts:377)
// is sound — it had nothing to return because the deep-Jajce ring shares no
// front edge with any `arbih_3rd_corps:N` sub-segment.
//
// Verified against `data/derived/operational/operational_contact_graph.json`
// (2026-05-22):
//
//   PRIMARY AXIS — reachable from arbih_3rd_corps:1 sub-segment:
//     op:donji_vakuf:oborci_2     ←adj→ op:donji_vakuf:komar_2 (3rd-corps friendly)
//                                  ←adj→ op:donji_vakuf:donji_vakuf_2 (3rd-corps friendly)
//                                  ←adj→ op:jajce:grdovo, op:donji_vakuf:torlakovac_2
//     op:donji_vakuf:torlakovac_2 ←adj→ op:jajce:grdovo, op:jajce:vinac_2
//     op:jajce:grdovo             ←adj→ op:jajce:jajce_3, op:jajce:vinac_2
//                                  (sub-segment arbih_3rd_corps:1 lists this as enemy_osid)
//
//   DEFERRED AXIS — deep RS rear; no shared 3rd-corps front edge until the
//   corridor opens via primary-axis captures. The engine's
//   `spawnCorpsOperationFromOpportunity` skip-empty-axis behavior
//   (operation_opportunities.ts:1135 `if (filteredObjectives.length === 0) continue`)
//   combined with the per-turn sub-segment fallback means this axis safely
//   no-ops until the primary advances. Once grdovo / torlakovac_2 / vinac_2
//   flip to RBiH, the 3rd-corps front sub-segment recomputes and the deep
//   ring becomes reachable.
//     op:jajce:vinac_2     (hub: torlakovac_2, grdovo, jajce_3, bravnice)
//     op:jajce:jajce_3     (hub: barevo_2, bravnice, grdovo, lupnica, vinac_2 — Jajce town)
//     op:jajce:bravnice    (hub: barevo_2, jajce_3, jezero_2, vinac_2)
//     op:jajce:barevo_2    (hub: bravnice, jajce_3, jezero_2, lupnica, prisoje)
//     op:jajce:lupnica     (adj: barevo_2, jajce_3)
//     op:jajce:jezero_2    (adj: barevo_2, bravnice, prisoje)
//     op:jajce:prisoje     (adj: barevo_2, jezero_2)
//
//   DROPPED: op:mrkonjic_grad:podrasnica_2 — connects only to the Mrkonjic
//   Grad cluster (gerzovo_2, majdan_2, mrkonjic_grad_2) and Ključ, not to
//   any Jajce-municipality OSID. Belongs to the Mistral 2 Šipovo/Mrkonjić
//   axis footprint, never reachable from a 3rd-corps approach.
const JAJCE_NEAR_OBJECTIVES: readonly string[] = [
    'op:jajce:grdovo',
];

const JAJCE_RING_OBJECTIVES: readonly string[] = [
    'op:jajce:vinac_2',
    'op:jajce:jajce_3',
    'op:jajce:bravnice',
    'op:jajce:barevo_2',
    'op:jajce:lupnica',
    'op:jajce:jezero_2',
    'op:jajce:prisoje',
];

const JAJCE_OBJECTIVES: readonly string[] = [
    ...JAJCE_NEAR_OBJECTIVES,
    ...JAJCE_RING_OBJECTIVES,
];

// Brigade pool: ARBiH 3rd Corps brigades that home in the Bugojno / Travnik /
// Donji Vakuf / Gornji Vakuf zone. These are the historical 7th Corps brigades
// (rolled into 3rd Corps in our reduced-OOB scenario per user directive
// 2026-05-19). Composition mirrors the Vlašić 95 (skender_vakuf axis) and
// Donji Vakuf 95 pools — these are the same brigades that historically broke
// the Komar line in September 1995 and pushed into Jajce.
//   - arbih_770th_slavna_mountain  — home op:donji_vakuf:donji_vakuf_2
//   - arbih_705th_slavna_mountain  — home op:bugojno:gracanica
//   - arbih_707th_slavna_mountain  — home op:bugojno:kopcic_2
//   - arbih_717th_slavna_mountain  — home op:gornji_vakuf:crkvice
//   - arbih_727th_slavna           — home op:travnik:podstinje
//   - arbih_737th_muslim_light     — home op:travnik:travnik_2
//
// Wave 14 brigade split:
//   - NEAR axis (Donji Vakuf shoulder): three brigades home to that ring
//     (770th Donji Vakuf town, 705th Bugojno, 707th Bugojno-Kopčić). They
//     have the shortest column-march to oborci_2 / torlakovac_2 / grdovo.
//   - RING axis (deep Jajce): three brigades home to the Gornji Vakuf /
//     Travnik shoulder (717th, 727th, 737th). They follow the corridor once
//     the near axis opens it; if the corridor never opens, the engine's
//     skip-empty-axis path leaves them with their home formations.
const JAJCE_NEAR_AXIS_BRIGADES: readonly FormationId[] = [
    'arbih_770th_slavna_mountain' as FormationId,
    'arbih_705th_slavna_mountain' as FormationId,
    'arbih_707th_slavna_mountain' as FormationId,
];

const JAJCE_RING_AXIS_BRIGADES: readonly FormationId[] = [
    'arbih_717th_slavna_mountain' as FormationId,
    'arbih_727th_slavna' as FormationId,
    'arbih_737th_muslim_light' as FormationId,
];

// Wave 14C (2026-05-22): n1977 fired the single-axis Wave 14B variant but
// recovered as zero_eligible_axis. The combined 6-brigade pool included the
// RING brigades (717th/727th/737th from Travnik & Gornji Vakuf shoulder) that
// don't sit in the arbih_3rd_corps:1 front sector covering Donji Vakuf →
// Jajce. Per-turn axis evaluation requires brigades in the same front sector
// as the objective sub-segment, so RING brigades were marked ineligible and
// the axis returned zero eligible attackers. Shrinking to the 3 NEAR brigades
// (770th + 705th + 707th, all homed in Donji Vakuf / Bugojno cluster) which
// ARE in arbih_3rd_corps:1's sub-segment.
const JAJCE_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'jajce_recovery_near',
        name: 'Donji Vakuf Shoulder Axis',
        corps: JAJCE_PRIMARY_CORPS,
        brigades: JAJCE_NEAR_AXIS_BRIGADES,
        objectives: JAJCE_NEAR_OBJECTIVES,
        staging_osid: JAJCE_STAGING_BUGOJNO,
    },
];

const dateWindowJajce: AxisPredicate = (_state, turn) => {
    if (turn < 178) return { green: false, reason: 'Jajce recovery window not yet open' };
    if (turn > 184) return { green: false, reason: 'Jajce recovery window has closed' };
    return { green: true, reason: 'within Jajce recovery Sep 1995 window' };
};

// Intra-RBiH op — political_authorization is n_a (mirrors Donji Vakuf 95 and
// Vlašić 95 pattern). The Federation alliance is implicitly required because
// the brigade pool draws from the central Bosnia line that exists because
// of the Federation; the alliance_context predicate covers theater state.
const politicalAuthorizationJajce: AxisPredicate = () => ({
    green: true,
    reason: 'not applicable for ARBiH-internal Jajce recovery',
});

const corpsReadinessJajce: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[JAJCE_PRIMARY_CORPS]) {
        return { green: false, reason: 'ARBiH 3rd Corps command not present for Jajce recovery' };
    }
    const traits = computeCorpsOperationReadiness(state, JAJCE_PRIMARY_CORPS as FormationId);
    if (traits.operation_readiness < JAJCE_READINESS_FLOOR) {
        return { green: false, reason: 'ARBiH 3rd Corps readiness below Jajce recovery floor' };
    }
    return { green: true, reason: 'ARBiH 3rd Corps readiness sufficient for Jajce recovery' };
};

const logisticsJajce: AxisPredicate = (state) => {
    const pressure = getFactionLiveSupplyPressure(state, 'RBiH');
    if (pressure >= JAJCE_SUPPLY_PRESSURE_CEILING) {
        return { green: false, reason: 'RBiH supply pressure too high for Jajce recovery' };
    }
    return { green: true, reason: 'RBiH supply pressure within Jajce recovery margin' };
};

const stagingAccessJajce: AxisPredicate = (state) => {
    for (const osid of JAJCE_STAGING_ANCHORS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== null && ctrl !== 'RBiH') {
            return { green: false, reason: 'Bugojno/Turbe staging anchors are not RBiH-held for Jajce recovery' };
        }
    }
    return { green: true, reason: 'Bugojno/Turbe staging anchors are open for Jajce recovery' };
};

const weatherSeasonJajce: AxisPredicate = (_state, turn) => {
    // Mid-September is the historical window. Beyond that, Vlašić plateau
    // weather degrades quickly and the operational tempo collapses.
    if (turn > 190) return { green: false, reason: 'autumn weather threatens Jajce recovery tempo' };
    return { green: true, reason: 'early-autumn conditions support Jajce recovery' };
};

const commanderConfidenceJajce: AxisPredicate = (state) => {
    const commanderState = state.military.corps_command?.[JAJCE_PRIMARY_CORPS]?.commander_state;
    if (!commanderState) {
        return { green: false, reason: 'ARBiH 3rd Corps commander state unavailable for Jajce recovery' };
    }
    return { green: true, reason: 'ARBiH 3rd Corps commander state present for Jajce recovery' };
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
    // Wave 12: defender corps corrected to VRS 1st Krajina — live save shows
    // sector:vrs_1st_krajina:7 holds Jajce/Donji Vakuf/Mrkonjić OSIDs, not
    // vrs_2nd_krajina (which holds the Drvar/Grahovo southern shoulder).
    const trajectory = evaluateDefenderTrajectoryWeakness(state, {
        defenderCorpsId: VRS_1ST_KRAJINA_DEFENDER_CORPS,
        defenderFaction: 'RS',
        currentTurn: turn,
        weaknessFloor: JAJCE_DEFENDER_WEAKNESS_FLOOR,
        label: 'VRS 1st Krajina',
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
    if (!state.military.corps_command?.[JAJCE_PRIMARY_CORPS]) {
        return { green: false, reason: 'ARBiH 3rd Corps command not present for Jajce recovery' };
    }
    const traits = computeCorpsOperationReadiness(state, JAJCE_PRIMARY_CORPS as FormationId);
    if (traits.axis_coordination < JAJCE_AXIS_COORDINATION_FLOOR) {
        return { green: false, reason: 'ARBiH 3rd Corps axis coordination below Jajce recovery threshold' };
    }
    return { green: true, reason: 'ARBiH 3rd Corps axis coordination supports Jajce recovery' };
};

export const JAJCE_95_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'jajce_95',
    name: 'Operation Jajce Recovery',
    tier: 'T1',
    faction: 'RBiH',
    primary_corps: JAJCE_PRIMARY_CORPS,
    family: 'federation_western_bosnia',
    axes: JAJCE_AXES,
    staging_osid: JAJCE_STAGING_BUGOJNO,
    planning_duration: 3,
    min_attack_outcome: 'repulsed',
    citations: [
        'Balkan Battlegrounds v2 ch. 30 (Jajce seizure 13-14 Sep 1995; ARBiH 7th Corps under Alagić as principal instrument)',
        'ICTY Prosecutor v. Hadžihasanović IT-01-47-T (ARBiH 7th Corps OOB, central Bosnia ridge sector brigade composition)',
        'UNHCR Situation Report, 15 September 1995 (Federation control of Jajce town and 9 surrounding OSIDs)',
        'docs/40_reports/proposals/20260522_WAVE_12_MISTRAL1_THRESHOLD_JAJCE_CORPS.md (Wave 12 re-host rationale)',
        'docs/40_reports/audits/20260522_WAVE_11_12_13_BREAKTHROUGH_N1975.md §Q5 (n1975 no_approach_osid diagnosis: 8 of 11 OSIDs unreachable from arbih_3rd_corps sub-segments)',
        'docs/40_reports/proposals/20260522_WAVE_14_JAJCE_AXIS_SPLIT.md (Wave 14 NEAR/RING axis split rationale and adjacency verification)',
    ],
    historical_exit_class: 'decisive_success',
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
    SOUTHERN_MOVE_95_OPPORTUNITY,
    JAJCE_95_OPPORTUNITY,
];
