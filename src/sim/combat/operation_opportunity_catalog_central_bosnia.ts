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
import { isWesternTheaterRuptured } from './operation_storm_theater.js';
import { getFactionLiveSupplyPressure } from './supply_condition.js';

const PRIMARY_CORPS = 'arbih_3rd_corps';
// The historical Donji Vakuf push is associated with the 7th Corps under
// Alagic, but the current source OOB keeps the authored Bugojno/Komar brigade
// pool under `arbih_3rd_corps`. Host the catalog entry where the live brigades
// and sector truth exist; otherwise final operation reconciliation strips the
// operation empty before launch.
const DONJI_VAKUF_PRIMARY_CORPS = 'arbih_3rd_corps';
const KUPRES_CINCAR_PRIMARY_CORPS = 'hvo_tomislavgrad';

const STAGING_TRAVNIK = 'op:travnik:travnik_2';
const STAGING_TURBE = 'op:travnik:turbe_2';
const STAGING_CUKLE = 'op:travnik:cukle_2';

// Wave 24C (2026-05-23): reordered for OSID-adjacency reachability per the
// catalog-sweep audit (docs/40_reports/audits/20260523_CATALOG_ADJACENCY_SWEEP.md
// §c-vlasic). gornje_krcevine has no baseline-HRHB/RBiH neighbor — axis aborts
// at step 1 with 0 captures. paklarevo is adjacent to STAGING_TURBE, captures
// expose varosluk, then varosluk exposes gornje_krcevine.
const VLASIC_TRAVNIK_RIDGE_OBJECTIVES: readonly string[] = [
    'op:travnik:paklarevo',
    'op:travnik:varosluk',
    'op:travnik:gornje_krcevine',
];

const VLASIC_SKENDER_VAKUF_OBJECTIVES: readonly string[] = [
    'op:skender_vakuf:donji_koricani',
    'op:skender_vakuf:imljani_2',
    'op:skender_vakuf:javorani_2',
    'op:skender_vakuf:knezevo_2',
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

const DONJI_VAKUF_STAGING_GRACANICA = 'op:bugojno:gracanica';
const DONJI_VAKUF_STAGING_KOPCIC = 'op:bugojno:kopcic_2';
const DONJI_VAKUF_STAGING_TURBE = 'op:travnik:turbe_2';
const DONJI_VAKUF_STAGING_ANCHORS: readonly string[] = [
    DONJI_VAKUF_STAGING_TURBE,
    DONJI_VAKUF_STAGING_GRACANICA,
    DONJI_VAKUF_STAGING_KOPCIC,
];

const DONJI_VAKUF_OBJECTIVES: readonly string[] = [
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

const DONJI_VAKUF_READINESS_FLOOR = 0.36;
const DONJI_VAKUF_AXIS_COORDINATION_FLOOR = 0.35;
const DONJI_VAKUF_SUPPLY_PRESSURE_CEILING = 90;

const KUPRES_CINCAR_STAGING_LIVNO = 'op:livno:livno_2';
const KUPRES_CINCAR_STAGING_TOMISLAVGRAD = 'op:duvno:tomislavgrad_2';
// Retained as identifiers (referenced by axis `staging_osid` fields below) but
// deliberately NOT in the precondition anchors list — see comment on
// KUPRES_CINCAR_STAGING_ANCHORS.
const KUPRES_CINCAR_STAGING_KUPRES = 'op:kupres:kupres_2';
const KUPRES_CINCAR_STAGING_GORAVCI = 'op:kupres:goravci';
void KUPRES_CINCAR_STAGING_GORAVCI;

// 2026-05-22 Wave 3B-A.1 (forensics memo
// docs/40_reports/audits/20260522_FORENSICS_5_BLOCKED_ARBIH_OPS.md §3 kupres_cincar_94):
// previously the anchors list also included op:kupres:kupres_2 and op:kupres:goravci,
// but those are RS-held targets the op is supposed to take — listing them as
// REQUIRED-HRHB-HELD precondition staging anchors creates a circular precondition.
// Trimmed to the genuine HVO/HV western-Herzegovina staging spine (Livno +
// Tomislavgrad). The Kupres identifier is still used as axis `staging_osid` for
// the axis that converges on Kupres area — that field accepts non-Federation-held
// OSIDs because it's about route geometry, not pre-held precondition.
const KUPRES_CINCAR_STAGING_ANCHORS: readonly string[] = [
    KUPRES_CINCAR_STAGING_LIVNO,
    KUPRES_CINCAR_STAGING_TOMISLAVGRAD,
];

// 2026-05-22 Wave 7 cascade unblock (forensics memo
// docs/40_reports/audits/20260522_WAVE_7_OPS_NO_FIRE_N1966.md §4 + Option B
// recommendation, and proposal memo
// docs/40_reports/proposals/20260522_KUPRES_CINCAR_FIX.md):
// Added op:kupres:kupres_2 as an explicit objective so a successful Cincar
// actually flips the Kupres-town anchor that gates the downstream
// staging_access predicate of mistral_1_95 and jajce_95. The historical
// Operation Cincar (Nov 1994) DID take Kupres town itself per BB v2 ch. 28
// — the previous three-objective shoulder-only definition was a calibration
// artefact, not a historical reconstruction. Insertion order
// (bucovaca → kupres_2 → donji_malovan → novo_selo_2) follows the
// Tomislavgrad → Bučovača → Kupres axis described in BB v2 ch. 28.
// Wave 22 (2026-05-23): reordered for OSID-adjacency reachability.
// docs/40_reports/audits/20260523_SUBSEGMENT_REFRESH_INVESTIGATION.md verified
// sub-segment refresh works correctly after bucovaca capture, but bucovaca and
// kupres_2 are NOT OSID-adjacent per operational_contact_graph.json — they
// share donji_malovan + goravci as common neighbors but no direct edge. The
// previous [bucovaca, kupres_2, ...] order put an unreachable objective second,
// the per-axis brigade brain returned no_approach_osid every turn, axis idle-
// stalled → max_failures abort after 8 turns with only bucovaca captured.
// New order targets bucovaca-adjacent OSIDs first (donji_malovan, goravci),
// then kupres_2 (now adjacent via either captured shoulder), then novo_selo_2.
const KUPRES_CINCAR_OBJECTIVES: readonly string[] = [
    'op:kupres:bucovaca',
    'op:kupres:donji_malovan',
    'op:kupres:goravci',
    'op:kupres:kupres_2',
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

const DONJI_VAKUF_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'donji_vakuf_komar_line',
        name: 'Donji Vakuf Komar Line',
        corps: DONJI_VAKUF_PRIMARY_CORPS,
        brigades: [
            'arbih_17th_vitezka_mountain' as FormationId,
            'arbih_705th_slavna_mountain' as FormationId,
            'arbih_706th_muslim_mountain' as FormationId,
            'arbih_707th_slavna_mountain' as FormationId,
            'arbih_727th_slavna' as FormationId,
        ],
        objectives: DONJI_VAKUF_OBJECTIVES,
        staging_osid: DONJI_VAKUF_STAGING_TURBE,
    },
];

// 2026-05-22 Wave 7 cascade unblock: brigade pool widened from 4 → 6 brigades.
// SCRT diagnostic (docs/40_reports/audits/20260522_WAVE_7_OPS_NO_FIRE_N1966.md)
// shows only 2 brigades launched at t=132 (kreimir_iv + tomislav, total 3600
// personnel, force_ratio_estimate=0.127, total_attacks=0, recovery_reason=
// defender_power_too_high). Root cause: hv_5th_guards_karlovac and
// hv_7th_guards_varazdin were both status=inactive at runtime (HVO undelivery
// investigation 20260522_HVO_UNDELIVERY_INVESTIGATION.md), and hv_4th_guards_split
// — the principal HV loan brigade for the Cincar/Kupres axis per BB v2 ch. 28
// — was never in the catalog pool at all. Pool now includes 4 historically
// attestable ACTIVE-at-t=132 brigades plus the two legacy HV entries (kept for
// when HV undelivery is fixed):
//   - hrhb_kralj_petar_kreimir_iv_brigade — HVO Tomislavgrad, af=0 (BB v2 ch. 28)
//   - hrhb_kralj_tomislav_brigade — HVO Tomislavgrad, af=8 (BB v2 ch. 28)
//   - hvo_rama_brigade — HVO Tomislavgrad, af=0 (BB v2 ch. 28: Rama covered
//     Prozor-Kupres approach for the Cincar axis; ICTY Prlić IT-04-74-T
//     trial record on HVO Tomislavgrad operative group composition)
//   - hv_4th_guards_split — HV loan brigade, hvo_tomislavgrad after WA+6
//     (BB v2 ch. 28; ICTY Gotovina IT-06-90-T §44-58 confirms HV 4th Guards
//     cross-border employment on the Livno-Kupres-Grahovo axis from late 1994)
//   - hv_5th_guards_karlovac, hv_7th_guards_varazdin — retained for plausibility
//     symmetry; currently inactive at runtime but become available once HV
//     activation undelivery is resolved.
const KUPRES_CINCAR_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'kupres_cincar_line',
        name: 'Kupres Line',
        corps: KUPRES_CINCAR_PRIMARY_CORPS,
        brigades: [
            'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
            'hrhb_kralj_tomislav_brigade' as FormationId,
            'hvo_rama_brigade' as FormationId,
            'hv_4th_guards_split' as FormationId,
            'hv_5th_guards_karlovac' as FormationId,
            'hv_7th_guards_varazdin' as FormationId,
        ],
        objectives: KUPRES_CINCAR_OBJECTIVES,
        staging_osid: KUPRES_CINCAR_STAGING_LIVNO,
    },
];

// 2026-05-22 Wave 7: HRHB-only (no HV loan) variant now includes hvo_rama_brigade
// alongside the two HVO Tomislavgrad core brigades — this is the historical
// HVO-alone composition for the Kupres approach per BB v2 ch. 28 before the
// HV cross-border integration; with this addition the variant carries 3
// brigades and is a more credible fallback when the HV pool is unavailable.
const KUPRES_LINE_ONLY_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'kupres_cincar_line_only',
        name: 'Kupres Line Only',
        corps: KUPRES_CINCAR_PRIMARY_CORPS,
        brigades: [
            'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
            'hrhb_kralj_tomislav_brigade' as FormationId,
            'hvo_rama_brigade' as FormationId,
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
    // 2026-05-22 Wave 3B-C (forensics memo
    // docs/40_reports/audits/20260522_FORENSICS_5_BLOCKED_ARBIH_OPS.md §3
    // vlasic_ridge_95): accept either RBiH OR HRHB as Federation-held staging.
    // After the Stupni Do flip (Nov 1993) and Washington Agreement (Mar 1994),
    // central-Bosnia Federation operations stage from a mix of RBiH-held and
    // HRHB-held OSIDs in the Travnik/Vitez corridor. The original predicate
    // rejected HRHB-held cukle_2 as "not 3rd Corps" — pre-Federation logic
    // that no longer matches the post-Washington alliance reality. Also: use
    // `!= null` to catch both null (unpainted) and undefined (paint-gap) OSIDs.
    for (const osid of VLASIC_STAGING_ANCHORS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl != null && ctrl !== 'RBiH' && ctrl !== 'HRHB') {
            return { green: false, reason: 'Travnik staging anchor no longer Federation-held' };
        }
    }
    return { green: true, reason: 'Travnik staging anchors Federation-held' };
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

const dateWindowDonjiVakuf: AxisPredicate = (_state, turn) => {
    if (turn < 177) return { green: false, reason: 'September 1995 Donji Vakuf window not yet open' };
    if (turn > 180) return { green: false, reason: 'September 1995 Donji Vakuf window has closed' };
    return { green: true, reason: 'within September 1995 Donji Vakuf operation window' };
};

const allianceContextDonjiVakuf: AxisPredicate = (state) => {
    if (!isWesternTheaterRuptured(state)) {
        return { green: false, reason: 'Operation Storm theater rupture has not opened the western collapse window' };
    }
    return { green: true, reason: 'Operation Storm theater rupture opens the western collapse window' };
};

const stagingAccessDonjiVakuf: AxisPredicate = (state) => {
    for (const osid of DONJI_VAKUF_STAGING_ANCHORS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== null && ctrl !== 'RBiH') {
            return { green: false, reason: 'Bugojno staging anchor no longer held by 7th Corps' };
        }
    }
    return { green: true, reason: 'Bugojno staging anchors held for the Donji Vakuf operation' };
};

const enemyWeaknessDonjiVakuf: AxisPredicate = (state) => {
    let enemyHeld = 0;
    for (const osid of DONJI_VAKUF_OBJECTIVES) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl === 'RS') enemyHeld++;
    }
    if (enemyHeld === 0) {
        return { green: false, reason: 'no Donji Vakuf objectives remain in enemy hands' };
    }
    return { green: true, reason: 'Donji Vakuf objectives remain in enemy hands' };
};

const corpsReadinessDonjiVakuf: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[DONJI_VAKUF_PRIMARY_CORPS]) {
        return { green: false, reason: '7th Corps command not present in this scenario' };
    }
    const traits = computeCorpsOperationReadiness(state, DONJI_VAKUF_PRIMARY_CORPS as FormationId);
    if (traits.operation_readiness < DONJI_VAKUF_READINESS_FLOOR) {
        return { green: false, reason: '7th Corps readiness below Donji Vakuf operation floor' };
    }
    return { green: true, reason: '7th Corps readiness sufficient for Donji Vakuf operation' };
};

const logisticsDonjiVakuf: AxisPredicate = (state) => {
    const pressure = getFactionLiveSupplyPressure(state, 'RBiH');
    if (pressure >= DONJI_VAKUF_SUPPLY_PRESSURE_CEILING) {
        return { green: false, reason: 'RBiH supply pressure too high for Donji Vakuf operation' };
    }
    return { green: true, reason: 'RBiH supply pressure within Donji Vakuf margin' };
};

const commanderConfidenceDonjiVakuf: AxisPredicate = (state) => {
    const commanderState = state.military.corps_command?.[DONJI_VAKUF_PRIMARY_CORPS]?.commander_state;
    if (!commanderState) {
        return { green: false, reason: '7th Corps commander state unavailable' };
    }
    return { green: true, reason: '7th Corps commander state present' };
};

const forceQualityDonjiVakuf: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[DONJI_VAKUF_PRIMARY_CORPS]) {
        return { green: false, reason: '7th Corps command not present in this scenario' };
    }
    const traits = computeCorpsOperationReadiness(state, DONJI_VAKUF_PRIMARY_CORPS as FormationId);
    if (traits.axis_coordination < DONJI_VAKUF_AXIS_COORDINATION_FLOOR) {
        return { green: false, reason: '7th Corps axis coordination below Donji Vakuf threshold' };
    }
    return { green: true, reason: '7th Corps axis coordination supports Donji Vakuf' };
};

const weatherSeasonDonjiVakuf: AxisPredicate = () => (
    { green: true, reason: 'September conditions are acceptable for Donji Vakuf' }
);

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
    // Required rear-area anchors must be explicitly HRHB-held. Missing
    // controller data cannot satisfy a historical staging precondition.
    for (const osid of KUPRES_CINCAR_STAGING_ANCHORS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== 'HRHB') {
            return { green: false, reason: 'Livno-Tomislavgrad staging anchors are not Federation-held' };
        }
    }
    return { green: true, reason: 'Livno-Tomislavgrad staging anchors are Federation-held' };
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
    ],
    staff_recommendation: 'approve',
};

export const DONJI_VAKUF_95_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'donji_vakuf_95',
    name: 'Operation Donji Vakuf 95',
    tier: 'T1',
    faction: 'RBiH',
    primary_corps: DONJI_VAKUF_PRIMARY_CORPS,
    family: 'central_bosnia_vlasic',
    axes: DONJI_VAKUF_AXES,
    staging_osid: DONJI_VAKUF_STAGING_TURBE,
    planning_duration: 3,
    min_attack_outcome: 'repulsed',
    citations: [
        'docs/40_reports/audits/20260521_OPERATIONS_EXPERT_BB_CODE_GAPS.md - Donji Vakuf 1995 ARBiH 7th Corps catalog gap',
        'data/source/calibration/painted_control_apr1995.json + oct1995.json - Donji Vakuf dated-control references',
        'docs/40_reports/audits/20260522_OPS_FORCE_TRAJECTORY_GATING.md - lowest-risk catalog-fill recommendation after opportunity lifecycle tracing',
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
        date_window: dateWindowDonjiVakuf,
        political_authorization: alwaysGreen,
        corps_readiness: corpsReadinessDonjiVakuf,
        logistics: logisticsDonjiVakuf,
        staging_access: stagingAccessDonjiVakuf,
        weather_season: weatherSeasonDonjiVakuf,
        commander_confidence: commanderConfidenceDonjiVakuf,
        enemy_weakness: enemyWeaknessDonjiVakuf,
        alliance_context: allianceContextDonjiVakuf,
        force_quality: forceQualityDonjiVakuf,
    },
    staff_recommendation: 'approve',
};

// ═══════════════════════════════════════════════════════════════════════════
// KUPRES_PHASE_2_94 — Operation Cincar Phase 2 / Kupres Town (Nov 1994)
//
// Historical record: BB v2 ch. 28 (pp.529-530) and Historija.ba "Početak
// operacije Cincar" (https://historija.ba/d/188-pocetak-operacije-cincar)
// document Cincar/Kupres-94 as a multi-step HVO-Tomislavgrad campaign:
//   - 3 Nov 1994: HVO Tomislavgrad takes the Bučovača-Kupres shoulder
//     (modelled by KUPRES_CINCAR_94_OPPORTUNITY above; n1968 confirmed this
//     captured op:kupres:bucovaca as a 4-star Solid Victory at t138).
//   - 3-7 Nov 1994: follow-on push from the captured shoulder into Kupres
//     town and the surrounding Goravci / Donji Malovan / Novo Selo ring.
//     HV cross-border reinforcement (4th Guards Split, BB v2 ch. 28; ICTY
//     Gotovina IT-06-90-T §44-58) arrived mid-campaign and integrated into
//     the HVO operational group.
//
// Catalog rationale: n1968 (audit memo
// docs/40_reports/audits/20260522_WAVE_8_CASCADE_N1968.md) showed Cincar
// fired, captured bucovaca, then stalled 6 turns (t141-146, zero attacks)
// trying to push directly into Kupres town within the same opportunity, and
// aborted at max_failures with kupres_2 / donji_malovan / novo_selo_2 still
// RS-held. Mistral 1 (t160) and Jajce 95 (t178) both require kupres_2 = HRHB
// as a staging-dependency anchor, so the entire late-war HRHB cascade
// brick-walls at the Kupres-town garrison.
//
// Strategy B (this op) authors the historical Phase 2 follow-on as a SEPARATE
// opportunity gated on Cincar's bucovaca capture. Distinct from Strategy A
// (widening Cincar's pool) because: (1) per-axis MAX_TOTAL_FAILURES counter
// resets on a new op; (2) RECOVERY_DURATION = 3 lets brigades regenerate
// cohesion/morale; (3) forward-staging from the captured bucovaca shoulder
// gives short planning (2 turns) versus another long Livno-Tomislavgrad
// march; (4) preserves Cincar's working Wave 7B brigade pool untouched;
// (5) matches the BB v2 ch. 28 historical sequencing rather than collapsing
// a multi-day campaign into one mass push.
//
// Window: t148-t158. Lower bound = Cincar recovery completes t149 (per n1968
// AAR ended_turn). Upper bound = before Mistral 1's t160 window opens; since
// Phase 2 RECOVERY_DURATION = 3, brigades return to the corps pool by t161
// at latest, giving Mistral 1 a clean t160 launch.
//
// Citations:
//   - Balkan Battlegrounds v2 ch. 28 (pp.529-530) — Kupres / Cincar OOB and
//     control shift, multi-day campaign sequencing.
//   - Historija.ba "Početak operacije Cincar"
//     (https://historija.ba/d/188-pocetak-operacije-cincar) — 3-7 Nov
//     campaign timeline.
//   - ICTY Prosecutor v. Gotovina et al., IT-06-90-T, Judgment 15 Apr 2011,
//     §44-58 — HV cross-border employment on Livno-Kupres-Grahovo axis.
//   - docs/40_reports/audits/20260522_WAVE_8_CASCADE_N1968.md — n1968 Cincar
//     stall AAR and Phase 2 recommendation.
//   - docs/research/2026-05-01-late-war-operation-opportunity-research.md
//     §6 — Cincar/Kupres as dependency node, Mistral/Summer/Storm should
//     not solve missing 1994 control alone.
// ═══════════════════════════════════════════════════════════════════════════

const KUPRES_PHASE_2_PRIMARY_CORPS = 'hvo_tomislavgrad';
const KUPRES_PHASE_2_STAGING_BUCOVACA = 'op:kupres:bucovaca';
const KUPRES_PHASE_2_READINESS_FLOOR = 0.30;
const KUPRES_PHASE_2_AXIS_COORDINATION_FLOOR = 0.30;
const KUPRES_PHASE_2_SUPPLY_PRESSURE_CEILING = 92;

// Phase 1 dependency: Cincar's captured shoulder MUST be HRHB-held. If RS has
// somehow retaken bucovaca, Phase 2 is geometrically impossible. Wave 9C
// inlined this check into stagingAccessKupresPhase2 — an anchor-array
// formulation caused the engine to route Phase 2 brigades toward bucovaca
// as a corridor waypoint instead of forward to the actual objectives.
// The constant is retained for cross-reference but no longer enumerated as
// an anchor array.

// Standard HVO Tomislavgrad rear staging spine (carried forward from Cincar
// for supply / commander headquarters access). Treat unpainted (null/undefined)
// as pass-through per Wave 3B-A.1 paint-gap pattern.
const KUPRES_PHASE_2_REAR_STAGING_ANCHORS: readonly string[] = [
    KUPRES_CINCAR_STAGING_LIVNO,
    KUPRES_CINCAR_STAGING_TOMISLAVGRAD,
];

const KUPRES_PHASE_2_SOUTHERN_OBJECTIVES: readonly string[] = [
    'op:kupres:donji_malovan',
    'op:kupres:kupres_2',
];

const KUPRES_PHASE_2_NORTHERN_OBJECTIVES: readonly string[] = [
    'op:kupres:goravci',
    'op:kupres:kupres_2',
    'op:kupres:novo_selo_2',
];

const KUPRES_PHASE_2_TARGETS: readonly string[] = [
    'op:kupres:donji_malovan',
    'op:kupres:goravci',
    'op:kupres:kupres_2',
    'op:kupres:novo_selo_2',
];

const KUPRES_PHASE_2_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'kupres_phase_2_southern',
        name: 'Donji Malovan Thrust',
        corps: KUPRES_PHASE_2_PRIMARY_CORPS,
        brigades: [
            'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
            'hvo_rama_brigade' as FormationId,
        ],
        objectives: KUPRES_PHASE_2_SOUTHERN_OBJECTIVES,
        staging_osid: KUPRES_CINCAR_STAGING_LIVNO,
    },
    {
        axis_id: 'kupres_phase_2_northern',
        name: 'Goravci Thrust',
        corps: KUPRES_PHASE_2_PRIMARY_CORPS,
        brigades: [
            'hrhb_kralj_tomislav_brigade' as FormationId,
            'hv_4th_guards_split' as FormationId,
            'hvo_1st_guard_abb' as FormationId,
        ],
        objectives: KUPRES_PHASE_2_NORTHERN_OBJECTIVES,
        staging_osid: KUPRES_CINCAR_STAGING_LIVNO,
    },
];

const KUPRES_PHASE_2_SOUTHERN_ONLY_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'kupres_phase_2_southern',
        name: 'Donji Malovan Thrust (single-axis fallback)',
        corps: KUPRES_PHASE_2_PRIMARY_CORPS,
        brigades: [
            'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
            'hvo_rama_brigade' as FormationId,
            'hrhb_kralj_tomislav_brigade' as FormationId,
        ],
        objectives: [
            'op:kupres:donji_malovan',
            'op:kupres:kupres_2',
            'op:kupres:novo_selo_2',
        ],
        staging_osid: KUPRES_CINCAR_STAGING_LIVNO,
    },
];

const dateWindowKupresPhase2: AxisPredicate = (_state, turn) => {
    if (turn < 148) return { green: false, reason: 'Cincar Phase 2 window not yet open (Cincar recovery still in progress)' };
    if (turn > 158) return { green: false, reason: 'Cincar Phase 2 window has closed (Mistral 1 t160 window approaching)' };
    return { green: true, reason: 'within Cincar Phase 2 Nov 1994 operation window' };
};

const allianceContextKupresPhase2: AxisPredicate = (state) => {
    const alliance = state.political?.war_alliance_rbih_hrhb ?? 0;
    if (alliance < FEDERATION_ALLIANCE_FLOOR) {
        return { green: false, reason: 'post-Washington Federation coordination below Cincar Phase 2 threshold' };
    }
    return { green: true, reason: 'post-Washington Federation coordination supports Cincar Phase 2' };
};

const stagingAccessKupresPhase2: AxisPredicate = (state) => {
    // Phase 1 dependency: Bučovača MUST be HRHB-held. This is the hard gate
    // distinguishing Phase 2 from any standalone Kupres push — Phase 2 only
    // makes sense once Cincar's captured shoulder is locked in. Inlined here
    // (Wave 9C) to avoid the engine treating an anchor array as a routing
    // waypoint list.
    {
        const bucovacaCtrl = getPoliticalControllerOSID(state, KUPRES_PHASE_2_STAGING_BUCOVACA, undefined);
        if (bucovacaCtrl !== 'HRHB') {
            return { green: false, reason: 'Bučovača (Cincar Phase 1 capture) is not HRHB-held — Phase 2 precondition fails' };
        }
    }
    // Rear staging spine: pass-through for unpainted OSIDs (Wave 3B-A.1
    // paint-gap pattern); only reject if a known-non-HRHB controller is set.
    for (const osid of KUPRES_PHASE_2_REAR_STAGING_ANCHORS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl != null && ctrl !== 'HRHB') {
            return { green: false, reason: 'Livno-Tomislavgrad rear staging anchors are not Federation-held' };
        }
    }
    return { green: true, reason: 'Bučovača and rear staging anchors are HRHB-held for Cincar Phase 2' };
};

const enemyWeaknessKupresPhase2: AxisPredicate = (state) => {
    let enemyHeld = 0;
    for (const osid of KUPRES_PHASE_2_TARGETS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl === 'RS') enemyHeld++;
    }
    if (enemyHeld === 0) {
        return { green: false, reason: 'no Cincar Phase 2 objectives remain in enemy hands' };
    }
    return { green: true, reason: 'Cincar Phase 2 objectives remain in enemy hands' };
};

const corpsReadinessKupresPhase2: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[KUPRES_PHASE_2_PRIMARY_CORPS]) {
        return { green: false, reason: 'HVO Tomislavgrad command not present in this scenario' };
    }
    const traits = computeCorpsOperationReadiness(state, KUPRES_PHASE_2_PRIMARY_CORPS as FormationId);
    if (traits.operation_readiness < KUPRES_PHASE_2_READINESS_FLOOR) {
        return { green: false, reason: 'HVO Tomislavgrad readiness below Cincar Phase 2 floor (post-Cincar exhaustion)' };
    }
    return { green: true, reason: 'HVO Tomislavgrad readiness sufficient for Cincar Phase 2' };
};

const logisticsKupresPhase2: AxisPredicate = (state) => {
    const pressure = getFactionLiveSupplyPressure(state, 'HRHB');
    if (pressure >= KUPRES_PHASE_2_SUPPLY_PRESSURE_CEILING) {
        return { green: false, reason: 'HRHB supply pressure too high for Cincar Phase 2 push' };
    }
    return { green: true, reason: 'HRHB supply pressure within Cincar Phase 2 margin' };
};

const commanderConfidenceKupresPhase2: AxisPredicate = (state) => {
    const commanderState = state.military.corps_command?.[KUPRES_PHASE_2_PRIMARY_CORPS]?.commander_state;
    if (!commanderState) {
        return { green: false, reason: 'HVO Tomislavgrad commander state unavailable for Cincar Phase 2' };
    }
    return { green: true, reason: 'HVO Tomislavgrad commander state present for Cincar Phase 2' };
};

const forceQualityKupresPhase2: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[KUPRES_PHASE_2_PRIMARY_CORPS]) {
        return { green: false, reason: 'HVO Tomislavgrad command not present in this scenario' };
    }
    const traits = computeCorpsOperationReadiness(state, KUPRES_PHASE_2_PRIMARY_CORPS as FormationId);
    if (traits.axis_coordination < KUPRES_PHASE_2_AXIS_COORDINATION_FLOOR) {
        return { green: false, reason: 'HVO Tomislavgrad axis coordination below Cincar Phase 2 pincer threshold' };
    }
    return { green: true, reason: 'HVO Tomislavgrad axis coordination supports Cincar Phase 2 pincer' };
};

const weatherSeasonKupresPhase2: AxisPredicate = (_state, turn) => {
    // November 1994 mountain conditions: same regime as Cincar Phase 1 (t136+
    // permissive). Phase 2's t148+ floor is well past that threshold.
    if (turn < 148) {
        return { green: false, reason: 'autumn mountain conditions still degrading from Cincar Phase 1 weather' };
    }
    return { green: true, reason: 'autumn mountain conditions are acceptable for Cincar Phase 2' };
};

export const KUPRES_PHASE_2_94_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'kupres_phase_2_94',
    name: 'Operation Cincar Phase 2 / Kupres Town',
    tier: 'T1',
    faction: 'HRHB',
    primary_corps: KUPRES_PHASE_2_PRIMARY_CORPS,
    family: 'central_bosnia_vlasic',
    axes: KUPRES_PHASE_2_AXES,
    // staging_osid is Livno (rear area where Phase 1 brigades home), NOT bucovaca:
    // brigades do not auto-relocate to a captured objective. bucovaca remains a
    // corridor anchor (validated by stagingAccessKupresPhase2's
    // KUPRES_PHASE_2_CINCAR_DEPENDENCY_ANCHORS check). planning_duration bumped
    // 2→4 to give brigades movement time from Livno toward donji_malovan/goravci.
    staging_osid: KUPRES_CINCAR_STAGING_LIVNO,
    planning_duration: 4,
    min_attack_outcome: 'repulsed',
    citations: [
        'Balkan Battlegrounds v2 ch. 28 (pp.529-530) — Kupres / Cincar OOB and multi-day campaign sequencing',
        'Historija.ba — Početak operacije Cincar (https://historija.ba/d/188-pocetak-operacije-cincar) — 3-7 Nov 1994 timeline',
        'ICTY Prosecutor v. Gotovina et al., IT-06-90-T, Judgment 15 Apr 2011, §44-58 — HV 4th Guards Split cross-border employment',
        'docs/40_reports/audits/20260522_WAVE_8_CASCADE_N1968.md — n1968 Cincar stall AAR and Phase 2 recommendation',
        'docs/40_reports/proposals/20260522_WAVE_9_CINCAR_PHASE_2.md — full strategy memo and implementation notes',
        'docs/research/2026-05-01-late-war-operation-opportunity-research.md §6 — Cincar/Kupres as dependency node',
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
        date_window: dateWindowKupresPhase2,
        political_authorization: alwaysGreen,
        corps_readiness: corpsReadinessKupresPhase2,
        logistics: logisticsKupresPhase2,
        staging_access: stagingAccessKupresPhase2,
        weather_season: weatherSeasonKupresPhase2,
        commander_confidence: commanderConfidenceKupresPhase2,
        enemy_weakness: enemyWeaknessKupresPhase2,
        alliance_context: allianceContextKupresPhase2,
        force_quality: forceQualityKupresPhase2,
    },
    variants: [
        {
            variant_id: 'kupres_phase_2_southern_only',
            name: 'Donji Malovan Thrust Only',
            axes: KUPRES_PHASE_2_SOUTHERN_ONLY_AXES,
            staging_osid: KUPRES_CINCAR_STAGING_LIVNO,
        },
    ],
    staff_recommendation: 'approve',
};

// 2026-05-22 Wave 11 (proposal memo
// docs/40_reports/proposals/20260522_WAVE_11_PHASE2_DISABLE_JAJCE_EDGES.md §"Problem 1"):
// KUPRES_PHASE_2_94_OPPORTUNITY is intentionally UNENUMERATED here. The op def
// + constants + predicates are retained above for forensic reference and possible
// future re-enablement once HVO undelivery / Cincar Phase 1 expansion can land
// kupres_2. As authored in Wave 9 it captured 0 OSIDs across n1969-n1972 (then
// n1973), and its brigade pool overlaps 5/5 with Mistral 1's pool — Phase 2
// running t148-156 leaves Mistral 1 (t160) launching with zero active participants
// (recovery_reason='brigade_attrition'). Sacred Rule #2 in operations-expert
// SKILL.md ("NEVER share brigades between ops on different corps. The first op
// grabs them; the second runs empty") explicitly forbids this configuration.
// Removing the array entry is the smallest surface-area fix; re-enable by
// reintroducing one identifier in the array.
export const CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES: readonly OperationOpportunityDef[] = [
    KUPRES_CINCAR_94_OPPORTUNITY,
    VLASIC_RIDGE_95_OPPORTUNITY,
    DONJI_VAKUF_95_OPPORTUNITY,
];
