/**
 * Pre-planned operations injected at scenario start (VRS + ARBiH).
 *
 * These opening operations are explicit scenario-shaping data with
 * multi-axis structure: named brigades, JNA phantom support, and
 * historically-accurate objective chains.
 *
 * All operations are player-initiated: they start in 'planning' phase
 * and the player must execute them. Operations with `available_from`
 * are deferred until the specified turn.
 */

import type {
    CorpsCommandState,
    CorpsOperation,
    FactionId,
    FormationId,
    FormationState,
    GameState,
    OperationAxis,
} from '../../state/game_state.js';
import type { Osid } from './osid_adjacency.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import { assignOperationCommander } from './officer_system.js';
import { isEligibleOperationFormation, MIN_ATTACK_PERSONNEL } from '../../state/formation_constants.js';
import { isSectorAssignmentExemptCorpsId } from './corps_front_sectors_constants.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { canEliteLoanReachCorpsTerritory, deployEliteLoan } from './army_reserve_system.js';
import {
    validateOpAtInjection,
    collectOpInjectionWarnings,
    hasBlockingOpInjectionWarnings,
} from './operation_validation.js';
import type { OpInjectionWarning } from './operation_validation.js';
import {
    buildCorpsOperation,
    derivePrimarySectorForBrigades,
    hasActiveOperation,
    isSlot0AvailableForQueue,
} from './corps_operation_helpers.js';
// Graz truce imports removed: east Herzegovina truce is handled by sector_offensive
// on operation completion (graz_east_herzegovina_active_turn), not by injection.

// ═══════════════════════════════════════════════════════════════════════════
// Pre-planned operation definitions
// ═══════════════════════════════════════════════════════════════════════════

interface AxisDef {
    axis_id: string;
    name: string;
    brigades: FormationId[];
    objectives: string[];
    staging_osid?: string;
}

interface PrePlannedOp {
    corps: string;
    faction: FactionId;
    name: string;
    axes: AxisDef[];
    /** Fallback staging for the operation (used when axis doesn't specify one). */
    staging_osid: string;
    /** Minimum turn before this op can be injected (default: 0). */
    available_from?: number;
    /** Override attack threshold — brigades attack even at worse predicted outcomes. */
    min_attack_outcome?: CorpsOperation['min_attack_outcome'];
    /** Planning duration override — gives brigades time to march to staging. */
    planning_duration?: number;
}

const MIN_OPERATION_PARTICIPANTS = 2;

function createPrePlannedAxis(
    brigades: FormationId[],
    objectives: string[],
    stagingOsid?: string,
): OperationAxis {
    const assignedBrigades = [...brigades];
    const mainBrigade = assignedBrigades[0];
    const supportBrigades = assignedBrigades.slice(1).sort(strictCompare);
    return {
        axis_id: 'main',
        name: 'Main Advance',
        assigned_brigades: assignedBrigades,
        ...(mainBrigade && { main_brigade: mainBrigade }),
        ...(supportBrigades.length > 0 && { support_brigades: supportBrigades }),
        objectives,
        current_objective_index: 0,
        status: 'executing',
        failure_count: 0,
        consecutive_failures_on_current: 0,
        momentum: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        ...(stagingOsid && { staging_osid: stagingOsid }),
    };
}

const VRS_PRE_PLANNED: PrePlannedOp[] = [
    {
        corps: 'vrs_east_bosnian',
        faction: 'RS',
        name: 'Operation Koridor',
        staging_osid: 'op:bijeljina:dvorovi_2',
        min_attack_outcome: 'repulsed',
        // planning_duration:9 — brcko_corridor brigades stage at donji_rahic (RS init, adjacent
        // to krepsic). March from dvorovi_2/bukovica_donja to donji_rahic takes ~8 turns via
        // crnjelovo_donje→brezovo_polje_selo_2→potocari_2→brcko(city)→donji_rahic. Op fires
        // after force_staging assembly gate (60%) clears at donji_rahic → brigades adjacent to
        // krepsic at execution time. Previous staging at crnjelovo_donje caused zero_eligible_axis:
        // posavina_flank readiness triggered multi-axis execution before brcko_corridor brigades
        // completed their march past brcko(city) to donji_rahic (the only RS-side approach to krepsic).
        planning_duration: 9,
        axes: [
            {
                axis_id: 'brcko_corridor',
                name: 'Brcko Corridor',
                brigades: [
                    'rs_1st_semberija_light_infantry',
                    'rs_2nd_semberija_light_infantry',
                    'rs_1st_bijeljina_light_infantry_panthers',
                    'jna_17th_corps_tg',
                ],
                objectives: [
                    'op:brcko:krepsic',
                    'op:brcko:skakava_donja',
                ],
                staging_osid: 'op:brcko:donji_rahic',
            },
            {
                axis_id: 'posavina_flank',
                name: 'Posavina Flank',
                brigades: [
                    'rs_3rd_posavina_light_infantry',
                    'rs_1st_posavina_infantry',
                    'rs_2nd_posavina_light_infantry',
                ],
                objectives: [
                    'op:bosanski_samac:samac_2',
                    'op:modrica:modrica',
                    'op:modrica:garevac_2',
                    'op:derventa:derventa_2',
                    'op:bosanski_brod:brod',
                ],
                staging_osid: 'op:bosanski_samac:crkvina_2',
            },
        ],
    },
    {
        corps: 'vrs_drina',
        faction: 'RS',
        name: 'Operation Drina',
        staging_osid: 'op:zvornik:kozluk_2',
        axes: [
            {
                axis_id: 'zvornik_sweep',
                name: 'Zvornik Sweep',
                brigades: [
                    'rs_1st_zvornik',
                    'rs_1st_birac',
                ],
                objectives: [
                    'op:zvornik:zvornik',
                    'op:zvornik:novo_selo',
                    'op:zvornik:krizevici',
                    'op:zvornik:donja_kamenica',
                ],
                staging_osid: 'op:zvornik:kozluk_2',
            },
            {
                axis_id: 'bratunac_vlasenica',
                name: 'Bratunac-Vlasenica',
                brigades: [
                    'rs_1st_bratunac',
                    'rs_1st_vlasenica',
                    'rs_1st_milii',
                ],
                objectives: [
                    'op:bratunac:bratunac_2',
                    'op:bratunac:glogova',
                    'op:vlasenica:vlasenica_2',
                ],
                staging_osid: 'op:bratunac:slapasnica',
            },
        ],
    },
    {
        corps: 'vrs_drina',
        faction: 'RS',
        name: 'Operation Podrinje Sweep',
        staging_osid: 'op:rogatica:stara_gora',
        min_attack_outcome: 'repulsed',
        axes: [
            {
                axis_id: 'rogatica_sokolac',
                name: 'Rogatica-Sokolac',
                brigades: [
                    'rs_1st_vlasenica',
                    'rs_5th_podrinje',
                    'rs_1st_podrinje',
                ],
                objectives: [
                    'op:rogatica:rogatica_2',
                    'op:rogatica:kovanj',
                    'op:rogatica:kramer_selo_2',
                    'op:sokolac:knezina_2',
                    'op:sokolac:meljine_2',
                    'op:hanpijesak:godjenje_2',
                    'op:hanpijesak:nevacka_3',
                ],
                staging_osid: 'op:rogatica:stara_gora',
            },
            {
                axis_id: 'srebrenica_ring',
                name: 'Srebrenica Ring',
                brigades: [
                    'rs_1st_bratunac',
                    'rs_1st_milii',
                    'rs_1st_birac',
                ],
                // BROKEN AXIS — never fires. DO NOT FIX without addressing cascade coupling below.
                // slapasnica NOT adj vranesevici (Sacred Rule 3 violation) → axis produces zero effects.
                // Subsequent broken links: zapolje_2→mala_daljegosta_2, mala_daljegosta_2→obadi, obadi→brezovice_2.
                // R24 2026-05-25: replaced with valid chain slapasnica→donji_potocari_2→milacevici→srebrenica_2
                //   →ljeskovik_2→sulice_2. Result: Srebrenica correctly RS (+6 OSIDs), BUT reversed the R22
                //   bosansko_grahovo/Sipovo HRHB cascade (−6 large-area HRHB OSIDs). Net: −0.70pp REGRESSION.
                //   REVERTED (commit 82a8e2c9-era context). The two cascades are mutually incompatible at
                //   current sim state. Fix Srebrenica only after decoupling from VRS 2nd Krajina brigade states.
                objectives: [
                    'op:bratunac:vranesevici',
                    'op:bratunac:zapolje_2',
                    'op:srebrenica:mala_daljegosta_2',
                    'op:srebrenica:obadi',
                    'op:srebrenica:brezovice_2',
                ],
                staging_osid: 'op:bratunac:slapasnica',
            },
        ],
    },
    {
        corps: 'vrs_drina',
        faction: 'RS',
        name: 'Operation Pracha River',
        staging_osid: 'op:rogatica:stara_gora',
        available_from: 41,
        min_attack_outcome: 'repulsed',
        axes: [
            {
                axis_id: 'pracha_encirclement',
                name: 'Prača Encirclement',
                brigades: [
                    'rs_1st_podrinje',
                    'rs_5th_podrinje',
                ],
                // BB2 p.409: May–Jun 1993 TG "Višegrad" (Drina Corps), Prača River offensive.
                // Staging stara_gora (RS init) adj brcigovo ✓; brcigovo adj sopotnica ✓; sopotnica adj ustipraca_2 ✓
                // All three objectives painted RBiH Jan 1993. ustipraca_2 terminus: non-chain neighbors RS-painted.
                // slatina_2 excluded — adj gorazde_2, cascade risk (belongs to Op Zvezda 94, Apr 1994).
                // available_from=41: gates past 40w calibration window (all objectives RBiH-painted at Jan 1993;
                // VRS temporarily holds this corridor in mid-1993, ARBiH recovers before ceasefire).
                objectives: [
                    'op:rogatica:brcigovo',
                    'op:gorazde:sopotnica',
                    'op:gorazde:ustipraca_2',
                ],
                staging_osid: 'op:rogatica:stara_gora',
            },
        ],
    },
    {
        // Operation Zvezda 94 — VRS Drina Corps spring 1994 offensive on Goražde safe area.
        // Historically: Drina Corps tactical groups pressed from the east and south, reaching
        // outskirts of Goražde town (BB2 p.289). Fires after Op Pracha River (w41) completes
        // and frees brigades. Available w100 (~April 1994, contemporaneous with Washington Agreement).
        //
        // Staging: podkozara_donja_2 (RS-painted from init, adj slatina_2 ✓)
        // Objectives: slatina_2 (RBiH-painted, adj gorazde_2 — encirclement approach);
        //             sopotnica (RBiH-painted, adj slatina_2 — tighten pocket; skipped if already RS)
        // gorazde_2 excluded: cascade risk documented in Op Pracha River comment (line 233).
        // Sacred Rule checks: staging adj first objective ✓; no painted-opposite objectives ✓;
        //   1st/5th Podrinje finish Op Pracha River ~w55-60, then ~40w gap before Zvezda 94 fires at w100 ✓.
        //   They end Op Pracha River in the Prača corridor, 2-3 hops from podkozara_donja_2 staging ✓.
        corps: 'vrs_drina',
        faction: 'RS',
        name: 'Operation Zvezda 94',
        staging_osid: 'op:gorazde:podkozara_donja_2',
        available_from: 100,
        min_attack_outcome: 'repulsed',
        // planning_duration: 10 — extended to allow brigades time to march 6+ hops to staging.
        // ENGINE LIMITATION (documented 2026-05-28): all vrs_drina brigades are sector-pinned by
        // bot AI after w46 and do not execute march orders (sector assignment > op march priority).
        // Op injects at w100 (3 brigades ≥ MIN_OPERATION_PARTICIPANTS=2), issues movement_orders
        // each planning turn, but eligible_attacker_count stays 0 for all 13 turns → aborts w113
        // with zero_eligible_axis. Single-brigade variant (1 < MIN=2) never injects at all —
        // keeping 3-brigade for observability. Requires engine fix: march priority for op-assigned
        // brigades must override sector defensive assignment. Assign to gameplay-programmer.
        planning_duration: 10,
        axes: [
            {
                axis_id: 'gorazde_encirclement',
                name: 'Goražde Encirclement',
                brigades: [
                    'rs_visegrad_brigade',
                    'rs_1st_podrinje',
                    'rs_5th_podrinje',
                ],
                // podkozara_donja_2 adj slatina_2 ✓; slatina_2 adj sopotnica ✓
                objectives: [
                    'op:gorazde:slatina_2',   // RBiH-painted; adj gorazde_2 — encirclement chokepoint
                    'op:gorazde:sopotnica',   // RBiH-painted; adj slatina_2 — pocket tightener
                ],
                staging_osid: 'op:gorazde:podkozara_donja_2',
            },
        ],
    },
    {
        corps: 'vrs_herzegovina',
        faction: 'RS',
        name: 'Operation Visegrad',
        staging_osid: 'op:visegrad:okrugla',
        min_attack_outcome: 'repulsed',
        axes: [
            {
                axis_id: 'visegrad_seizure',
                name: 'Visegrad Seizure',
                brigades: [
                    'rs_visegrad_brigade',
                    'rs_foa_brigade',
                    'rs_ajnie_brigade',
                    'jna_uzice_corps_tg',
                    'jna_visegrad_local_to_tg',
                    'jna_rudo_to_tg',
                ],
                objectives: [
                    'op:visegrad:visegrad_2',
                    'op:visegrad:kamenica_2',
                    'op:visegrad:medjedja_2',
                ],
                staging_osid: 'op:visegrad:okrugla',
            },
        ],
    },
    {
        corps: 'vrs_sarajevo_romanija',
        faction: 'RS',
        name: 'Operation Prsten',
        staging_osid: 'op:ilidza:kasindo',
        axes: [
            {
                axis_id: 'western_sarajevo',
                name: 'Western Sarajevo',
                brigades: [
                    'rs_1st_sarajevo_mechanized',
                    'rs_2nd_sarajevo_light_infantry',
                    'jna_4th_corps_tg',
                ],
                objectives: [
                    'op:ilidza:sarajevo_dio_ilidza_2',
                    'op:ilidza:rakovica_2',
                ],
                staging_osid: 'op:ilidza:kasindo',
            },
            {
                axis_id: 'northern_ring',
                name: 'Northern Ring — Vogošća',
                brigades: [
                    'rs_3rd_sarajevo_infantry',
                    'rs_4th_sarajevo_light_infantry',
                    'jna_rajlovac_barracks_tg',
                    'jna_vogosca_to_tg',
                ],
                objectives: [
                    'op:vogosca:svrake',
                    // hotonj removed: paint=RBiH, Sacred Rule 4 violation.
                ],
                staging_osid: 'op:vogosca:vogosca_3',
            },
            {
                axis_id: 'ilijas_ring',
                name: 'Ilijas Ring',
                brigades: [
                    'jna_ilijas_to_tg',
                    'jna_ilijas_garrison_det',
                    'jna_ilijas_north_to_tg',
                ],
                objectives: [
                    'op:ilijas:medojevici',
                    'op:ilijas:dragoradi',
                    // krivajevici removed: painted=RBiH (Sacred Rule 4) and not adjacent to sirovine
                    'op:ilijas:sirovine',
                ],
                staging_osid: 'op:ilijas:podlugovi',
            },
        ],
    },
    {
        // Operation Trnovo — VRS Sarajevo-Romanija Corps (SRK) secures the Trnovo cluster
        // south of Sarajevo. Historically, SRK held the Trnovo area throughout the war
        // (BB2 p.289). rs_trnovo_brigade home OSID is gornja_presjenica (RS from init).
        //
        // Painted control (Sacred Rule 4):
        //   gornja_presjenica = RS (staging — not an objective)
        //   kijevo_2         = RS (RS waypoint — strips at execution, not a real objective)
        //   delijas          = RBiH (painted) — valid RS attack objective
        //   trnovo           = RBiH (painted) — valid RS attack objective
        //   praca/podgrab    = RS/RBiH but not adjacent to any RS staging — excluded
        //
        // Adjacency (verified in operational_contact_graph.json):
        //   gornja_presjenica adj kijevo_2  ✓
        //   gornja_presjenica adj trnovo    ✓
        //   kijevo_2          adj delijas   ✓
        //   trnovo adj pale:praca/podgrab   ✗ — pale cluster excluded (broken chain)
        //
        // available_from: 6 — injects right after Op Prsten recovery (~w4).
        // SRK queue is explicit (see queue block below): Prsten → Trnovo.
        // Two brigades, both home gornja_presjenica → eligible at injection, no march needed:
        //   rs_trnovo_brigade:       home gornja_presjenica — east axis (delijas)
        //   rs_1st_romanija_infantry: home gornja_presjenica — town axis (trnovo)
        // Historically: Tactical Group Trnovo (Lukavac 93) drew from multiple SRK formations
        // including Romanija-area brigades pre-positioned south of Sarajevo (BB2 p.289).
        corps: 'vrs_sarajevo_romanija',
        faction: 'RS',
        name: 'Operation Trnovo',
        staging_osid: 'op:trnovo:gornja_presjenica',
        // available_from: 69 — historical Lukavac 93 = August 1993 (~w69). Earlier firing
        // would capture trnovo/delijas before Jan 1993, breaking the 40w calibration target.
        available_from: 69,
        min_attack_outcome: 'repulsed',
        axes: [
            {
                // gornja_presjenica → kijevo_2 (RS waypoint, strips) → delijas (RBiH-painted)
                axis_id: 'trnovo_east',
                name: 'Trnovo East — Delijas',
                brigades: ['rs_trnovo_brigade'],
                objectives: [
                    'op:trnovo:kijevo_2',   // RS waypoint (painted RS, strips at execution)
                    'op:trnovo:delijas',     // RBiH-painted, persistent RBiH mismatch
                ],
                staging_osid: 'op:trnovo:gornja_presjenica',
            },
            {
                // gornja_presjenica → trnovo (RBiH-painted, directly adjacent)
                axis_id: 'trnovo_town',
                name: 'Trnovo Town',
                brigades: ['rs_1st_romanija_infantry'],
                objectives: [
                    'op:trnovo:trnovo',     // RBiH-painted, persistent RBiH mismatch
                ],
                staging_osid: 'op:trnovo:gornja_presjenica',
            },
        ],
    },
    {
        // JNA Herzegovina Takeover — JNA 37th Corps (forward HQ Nevesinje, BB1 p.480)
        // directs early seizure of Bosniak areas in eastern Herzegovina, April 1992.
        // Uses synthetic 'jna_herzegovina_command' corps to run PARALLEL with vrs_herzegovina
        // ops (Visegrad, Foca). Brigades are "on loan" from vrs_herzegovina — the op system
        // doesn't require corps_id match. Paramilitaries + JNA garrison provide manpower.
        // No equipment inflation — all JNA phantoms are no_equipment_handoff.
        corps: 'jna_herzegovina_command',
        faction: 'RS',
        name: 'Operation Herzegovina',
        staging_osid: 'op:nevesinje:krekovi_2',
        min_attack_outcome: 'repulsed',
        axes: [
            {
                // Mostar heights — JNA garrison seizes Podveležje/Hum positions
                // overlooking Mostar from east (BB1 p.193). JNA phantom only —
                // VRS brigades follow their own corps' op (vrs_herzegovina → Op Višegrad).
                axis_id: 'mostar_heights',
                name: 'Mostar Heights',
                brigades: [
                    'jna_nevesinje_garrison',
                ],
                objectives: [
                    'op:mostar:vranjevici_2',
                    'op:mostar:kruzanj_2',
                ],
                staging_osid: 'op:nevesinje:sopilja',
            },
            {
                // Southern Konjic — local Serb TO takes Glavatičevo/Ljuta salient
                // (BB2 p.514: VRS held this area throughout). JNA phantom only.
                axis_id: 'konjic_south',
                name: 'Konjic South',
                brigades: [
                    'jna_konjic_south_tg',
                ],
                objectives: [
                    'op:konjic:glavaticevo_2',
                    'op:konjic:ljuta',
                ],
                staging_osid: 'op:konjic:bijela_2',
            },
        ],
    },
    {
        // Operation Foča — VRS Herzegovina Corps pushes north from Foča into the Goražde
        // enclave corridor and from Kalinovik into Trnovo. Fires after Op Višegrad completes (~w12).
        // Historically VRS held the Foča-Kalinovik axis and pressed the Goražde pocket (BB1 p.193,
        // BB2 p.514).
        //
        // IMPORTANT: All Foča-municipality OSIDs (foca_3, brusna_2, etc.) AND all Kalinovik
        // OSIDs start RS (municipality-level initial control). The old objective lists were
        // entirely RS from turn 0 — both axes produced op_empty on every run.
        //
        // foca_valley fix: foca_3 → prevrac (RS waypoint, foca_3-adjacent). The original
        //   gorazde:kolovarice + gorazde:ustipraca_2 objectives are painted RBiH and caused RS
        //   over-capture (DRINA regression -2.8pp in n1243). Objectives removed; op now secures
        //   the Foča-Goražde approach line without penetrating the enclave. VRS historically pressed
        //   the Goražde enclave from the west (BB2 p.289) but did not capture these OSIDs by Jan 1993.
        //
        // kalinovik fix: kalinovik_2 → vlaholje (RS waypoint) → varos_2 (RS waypoint) →
        //   kalinovik:golubici_2 (painted RS, sim=RBiH) → kalinovik:sela_2 (painted RS, sim=RBiH).
        //   Original trnovo:delijas + trnovo:kijevo_2 targets are painted RBiH and caused SARAJEVO
        //   regression (-4.9pp in n1243). Replaced with RS-painted kalinovik OSIDs currently held
        //   by RBiH — legitimate targets that fix the regression without over-capturing.
        corps: 'vrs_herzegovina',
        faction: 'RS',
        name: 'Operation Foca',
        staging_osid: 'op:foca:foca_3',
        // planning_duration:6 — kalinovik axis brigades take 5 elapsed turns to reach vlaholje
        // (adjacent to golubici_2). Default aggressiveness anti-paralysis fires at elapsed=5 (t10=w09),
        // 1 turn before brigades arrive → zero_eligible_axis. Extending to 6 shifts anti-paralysis
        // to elapsed=6 (t11=w10) when kalinovik_brigade is already at vlaholje. n93 regression.
        planning_duration: 6,
        axes: [
            {
                axis_id: 'foca_valley',
                name: 'Foca Valley',
                brigades: [
                    'rs_foa_brigade',
                    'rs_bilea_brigade',
                ],
                // foca_3 → patkovina (RBiH; painted RS) → prevrac (RS waypoint) → kolovarice (RBiH; painted RS).
                // R22 2026-05-25: inserted patkovina before prevrac.
                // R23 2026-05-25: ustikolina inserted then REVERTED — zero-delta (identical political_controllers,
                //   84.55% unchanged). Patkovina captured at wi=10 and lost before wi=188; ustikolina never captured.
                // foca_3 adj patkovina ✓, patkovina adj prevrac ✓, prevrac adj kolovarice ✓ (all verified).
                // patkovina 89.2 km²; painted RS; sim=RBiH — legitimate target.
                // ustipraca_2 removed (painted RBiH, caused DRINA over-capture in n1243).
                // VRS historically pressed the Goražde enclave from the west (BB2 p.289).
                objectives: [
                    'op:foca:patkovina',            // RBiH-held; painted RS — R22 insertion, foca_3-adjacent
                    'op:foca:prevrac',              // RS waypoint (patkovina-adjacent); stripped at execution
                    'op:gorazde:kolovarice',         // RBiH-held; painted RS — legitimate enclave approach target
                ],
                staging_osid: 'op:foca:foca_3',
            },
            {
                axis_id: 'kalinovik',
                name: 'Kalinovik',
                brigades: [
                    'rs_gacko_brigade',
                    'rs_kalinovik_brigade',
                    'jna_kalinovik_to_tg',
                ],
                // kalinovik_2 → vlaholje (RS waypoint) → golubici_2 → sela_2.
                // R20 2026-05-25: removed varos_2 — varos_2 adj golubici_2 = FALSE (broken link).
                // vlaholje adj golubici_2 = TRUE (verified in operational_contact_graph.json).
                // varos_2 is already RS-controlled (stripped anyway); its removal has no
                // effect on varos_2 control but unblocks brigade advance to golubici_2.
                // Original trnovo:delijas + trnovo:kijevo_2 removed — both painted RBiH and
                // caused SARAJEVO regression when RS captured them (n1243).
                objectives: [
                    'op:kalinovik:vlaholje',         // RS waypoint (kalinovik_2-adjacent); stripped
                    'op:kalinovik:golubici_2',       // painted RS, currently RBiH — correct target
                    'op:kalinovik:sela_2',           // painted RS, currently RBiH — follow-on
                ],
                staging_osid: 'op:kalinovik:kalinovik_2',
            },
        ],
    },
    {
        corps: 'vrs_1st_krajina',
        faction: 'RS',
        name: 'Operation Prijedor',
        staging_osid: 'op:prijedor:prijedor_2',
        axes: [
            {
                axis_id: 'prijedor_clean',
                name: 'Prijedor Clean',
                brigades: [
                    'rs_43rd_prijedor_motorized',
                    'rs_5th_kozara_light_infantry',
                    'rs_1st_armored',
                    'jna_2nd_md_tg',
                ],
                objectives: [
                    'op:prijedor:ljubija_2',
                    'op:prijedor:kozarac_2',
                    'op:prijedor:kamicani',
                    'op:prijedor:raljas',
                ],
                staging_osid: 'op:prijedor:prijedor_2',
            },
            {
                axis_id: 'sanski_most',
                name: 'Sanski Most',
                brigades: [
                    'rs_6th_sanske_infantry',
                    'rs_16th_krajina_motorized',
                ],
                objectives: [
                    'op:sanski_most:stari_majdan',
                    'op:sanski_most:sanski_most_2',
                    'op:sanski_most:ilidza_2',
                ],
                staging_osid: 'op:sanski_most:stari_majdan',
            },
            {
                axis_id: 'kljuc',
                name: 'Kljuc',
                brigades: [
                    'rs_11th_dubica_infantry',
                    'rs_1st_gradika_light_infantry',
                ],
                objectives: [
                    'op:kljuc:kljuc_2',
                    'op:kljuc:hadzici',
                    'op:kljuc:krasulje_2',
                ],
                staging_osid: 'op:kljuc:kljuc_2',
            },
        ],
    },
    {
        // Operation Corridor 92 — VRS's most important 1992 campaign (BB1 p.177).
        // 1KK under General Talić launched 24 June after preliminary ops cleared Doboj-Derventa.
        // Historically: Modriča fell 28 June, Derventa 4-5 July, Odžak 12 July.
        // "Most of the VRS's battle-tested former JNA units" committed here (BB1 p.183).
        // 50,000+ troops engaged across 1KK + EBK (BB1 p.181).
        // Brigades from Op Prijedor redeployed here after Prijedor mopping up.
        corps: 'vrs_1st_krajina',
        faction: 'RS',
        name: 'Operation Corridor',
        staging_osid: 'op:modrica:skugric_gornji_2',
        min_attack_outcome: 'repulsed',
        planning_duration: 3, // ~2-week preliminary phase: Doboj-Derventa clearing before main push
        axes: [
            {
                axis_id: 'corridor_east',
                name: 'Corridor East',
                brigades: [
                    'rs_27th_derventa_motorized',   // spearhead — named for Derventa, fighting for home ground
                    'rs_16th_krajina_motorized',     // redeployed from Op Prijedor (Sanski Most axis) — historically at Derventa
                    'rs_1st_trebava_infantry',       // homed at Modriča — local knowledge, natural staging
                    'rs_1st_krnjin_light_infantry',  // local — home: Doboj area
                    'rs_3rd_ozren_light_infantry',   // local — home: Doboj area
                    'rs_1st_prnjavor_light_infantry', // nearby — home: Prnjavor (~4 hops)
                ],
                objectives: [
                    'op:modrica:modrica',
                    'op:modrica:garevac_2',
                    'op:derventa:derventa_2',
                    'op:derventa:misinci_2',
                    'op:bosanski_brod:novo_selo_2',
                    'op:bosanski_brod:brod',
                ],
                staging_osid: 'op:modrica:skugric_gornji_2',
            },
            {
                // Southern prong toward Odžak — historically fell 12 July (BB1 p.182)
                axis_id: 'corridor_south',
                name: 'Corridor South',
                brigades: [
                    'rs_1st_doboj_light_infantry',
                ],
                objectives: [
                    'op:odzak:donja_dubica',
                    'op:odzak:potocani_2',
                    'op:bosanski_samac:novo_selo_2',
                ],
                staging_osid: 'op:doboj:stanari_2',
            },
        ],
    },
    {
        corps: 'vrs_1st_krajina',
        faction: 'RS',
        name: 'Operation Jajce',
        staging_osid: 'op:mrkonjic_grad:bjelajce_2',
        min_attack_outcome: 'repulsed',
        axes: [
            {
                axis_id: 'vrbas_west',
                name: 'Vrbas West',
                brigades: [
                    'rs_11th_mrkonji_light_infantry',
                    'rs_22nd_krajina_infantry',
                ],
                objectives: [
                    'op:jajce:divicani_2',
                    'op:jajce:barevo_2',
                    'op:jajce:jajce_3',
                ],
                staging_osid: 'op:mrkonjic_grad:bjelajce_2',
            },
            {
                axis_id: 'vrbas_south',
                name: 'Vrbas South',
                brigades: [
                    'rs_1st_sipovo_light_infantry',
                ],
                objectives: [
                    'op:jajce:kruscica',
                    'op:jajce:vinac_2',
                ],
                staging_osid: 'op:sipovo:brdjani',
            },
        ],
    },
    {
        // Operation Donji Vakuf — 1KK secures the Vrbas valley south of Jajce.
        // Historically the 19th and 31st Krajina brigades were organic to Donji Vakuf
        // municipality (both homed at babin_potok_2 / komar_2) and participated in the
        // VRS push that seized Donji Vakuf in late 1992 (BB1 p.177).
        //
        // Fires after Op Jajce completes (queued 4th in 1KK chain).
        // Staging pribeljci_2: Sipovo municipality (RS initial + RS painted), adjacent to
        // torlakovac_2 — first objective in the sweep. grdovo (Jajce) would also be
        // adjacent but starts HRHB; pribeljci_2 is always RS and safe.
        //
        // Objectives: all 5 painted RS, all start RBiH.
        // Removed from triggered Op Jajce (vrs_2nd_krajina) — 1KK handles DV.
        corps: 'vrs_1st_krajina',
        faction: 'RS',
        name: 'Operation Donji Vakuf',
        staging_osid: 'op:sipovo:pribeljci_2',
        min_attack_outcome: 'repulsed',
        planning_duration: 4,
        axes: [
            {
                axis_id: 'donji_vakuf_sweep',
                name: 'Donji Vakuf Sweep',
                brigades: [
                    'rs_19th_krajina_light_infantry' as FormationId,
                    'rs_31st_light_infantry' as FormationId,
                ],
                // pribeljci_2 (RS) is adjacent to torlakovac_2 — valid staging → first obj chain.
                // torlakovac_2 → babin_potok_2 → oborci_2 → donji_vakuf_2 → prusac_2
                objectives: [
                    'op:donji_vakuf:torlakovac_2',
                    'op:donji_vakuf:babin_potok_2',
                    'op:donji_vakuf:oborci_2',
                    'op:donji_vakuf:donji_vakuf_2',
                    'op:donji_vakuf:prusac_2',
                ],
                staging_osid: 'op:sipovo:pribeljci_2',
            },
        ],
    },
    {
        corps: 'vrs_1st_krajina',
        faction: 'RS',
        name: 'Operation Bosanski Novi',
        staging_osid: 'op:bosanski_novi:novi_grad_3',
        axes: [
            {
                axis_id: 'novi_grad',
                name: 'Novi Grad',
                brigades: [
                    'rs_1st_novigrad_infantry',
                    'rs_1st_banja_luka_light_infantry',
                ],
                objectives: [
                    'op:bosanski_novi:novi_grad_3',
                    'op:bosanski_novi:blagaj_japra',
                    'op:bosanski_novi:suhaca_4',
                ],
                staging_osid: 'op:bosanski_novi:bosanski_novi_2',
            },
        ],
    },
];

const HRHB_PRE_PLANNED: PrePlannedOp[] = [
    {
        corps: 'hvo_southeast_herzegovina',
        faction: 'HRHB',
        name: 'Operation Jackal',
        // Staging at capljina_2 (HRHB-held from t0, same municipality as tasovcici_2).
        // tasovcici_2 starts RS-held (JNA phantom capture) and is the first objective —
        // it cannot serve as staging. capljina_2 is adjacent to tasovcici_2 within
        // the op:capljina: municipality cluster.
        staging_osid: 'op:capljina:capljina_2',
        available_from: 8,
        min_attack_outcome: 'repulsed',
        axes: [
            {
                axis_id: 'stolac_sweep',
                name: 'Stolac-Čapljina Sweep',
                // Main effort: Čapljina → Tasovčići → Hodbina → Rotimlja → Stolac
                // HVO sweeps VRS from east Neretva bank, then takes Stolac town.
                // Pješivac Kula and Hatelji excluded — VRS retains inland positions.
                // Mostar Hills axis REMOVED: vranjevići/kružanj painted RS in Jan 1993
                // (VRS held those positions; HVO did not take them in Op Jackal)
                brigades: [
                    'hrhb_stolac_units',
                    'hrhb_apljina_brigade',
                    'hrhb_1st_herzegovina_brigade_knez_domagoj',
                    'hv_4th_guards_tg',
                    'hv_1st_guards_tg',
                    'hv_113th_brigade_tg',
                    'hrhb_1st_brigade_mostar',
                    'hrhb_2nd_brigade_mostar',
                    'hrhb_mostar_brigade',
                    'hv_116th_brigade_tg',
                ],
                objectives: [
                    'op:capljina:tasovcici_2',
                    'op:mostar:hodbina_2',
                    'op:stolac:rotimlja_2',
                    'op:stolac:stolac_2',
                ],
                staging_osid: 'op:capljina:capljina_2',
            },
        ],
    },
];

const ARBIH_PRE_PLANNED: PrePlannedOp[] = [
    // R28 BLOCKED: Op Sana 95 on arbih_5th_corps caused regression (−6, −1pp).
    // Root cause: triggered "Operation Sana" already runs on 5th Corps at w175-188.
    // Op Sana 95 queued behind it, stayed in planning, brigade marching from
    // bosanska_krupa sectors let VRS capture jasenica_2 + 5 adjacents. Zero captures.
    // Sanski Most / Ključ mismatches require either:
    //   (a) extending the existing triggered Operation Sana to include sanski_most axis, OR
    //   (b) a separate synthetic corps op, OR
    //   (c) an event-based control_change (triggered by RSK collapse 1995).
];

// v0.4.7: Mostar Hills axis removed from Op Jackal — vranjevici/kruzanj painted RS
const ALL_PRE_PLANNED: PrePlannedOp[] = [...VRS_PRE_PLANNED, ...HRHB_PRE_PLANNED, ...ARBIH_PRE_PLANNED];

function hasInjectableBrigadeRoster(state: GameState): boolean {
    const formations = state.military.formations ?? {};
    for (const formation of Object.values(formations)) {
        if (!formation) continue;
        if ((formation.kind ?? 'brigade') !== 'brigade') continue;
        if (formation.status !== 'active') continue;
        return true;
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// Injection
// ═══════════════════════════════════════════════════════════════════════════

// Use shared isEligibleOperationFormation from formation_constants

function canReachAxisStaging(
    state: GameState,
    formation: FormationState,
    faction: FactionId,
    stagingOsid: Osid | undefined,
    adjacency: Map<Osid, Osid[]> | undefined,
    maxHops?: number,
): boolean {
    if (!adjacency || !stagingOsid) return true;
    const start = formation.location_osid as Osid | undefined;
    if (!start) return false;
    if (start === stagingOsid) return true;

    const seen = new Set<Osid>([start]);
    const queue: Array<{ osid: Osid; hops: number }> = [{ osid: start, hops: 0 }];
    while (queue.length > 0) {
        const current = queue.shift()!;
        if (maxHops != null && current.hops >= maxHops) continue;
        for (const next of adjacency.get(current.osid) ?? []) {
            if (seen.has(next)) continue;
            const controller = getPoliticalControllerOSID(state, next, undefined);
            if (next !== stagingOsid && controller !== faction) continue;
            if (next === stagingOsid) return controller === faction;
            seen.add(next);
            queue.push({ osid: next, hops: current.hops + 1 });
        }
    }
    return false;
}

function activeOperationObjectiveOsids(cmd: CorpsCommandState | undefined): Set<Osid> {
    const objectives = new Set<Osid>();
    for (const op of cmd?.active_operations ?? []) {
        const opObjectives = op.axes?.flatMap(axis => axis.objectives ?? []) ?? op.objectives ?? [];
        for (const osid of opObjectives) objectives.add(osid as Osid);
    }
    return objectives;
}

function omitObjectivesClaimedByActiveOperations(def: PrePlannedOp, cmd: CorpsCommandState | undefined): PrePlannedOp {
    const claimedObjectives = activeOperationObjectiveOsids(cmd);
    if (claimedObjectives.size === 0) return def;

    const axes = def.axes
        .map((axis) => ({
            ...axis,
            objectives: axis.objectives.filter((osid) => !claimedObjectives.has(osid as Osid)),
        }))
        .filter((axis) => axis.objectives.length > 0);

    return { ...def, axes };
}

/**
 * Build axes and operation from a PrePlannedOp definition.
 * Shared by both initial injection and queued operation injection.
 */
function buildAxesFromDef(
    def: PrePlannedOp,
    state: GameState,
    adjacency?: Map<Osid, Osid[]>,
): { axes: OperationAxis[]; participating: FormationId[]; eliteLoans: { brigadeId: FormationId; corpsId: string }[] } | null {
    const formations = state.military.formations ?? {};
    const builtAxes: OperationAxis[] = [];
    const allParticipating: FormationId[] = [];
    const eliteLoans: { brigadeId: FormationId; corpsId: string }[] = [];

    const movementState = state.military.brigade_movement_state ?? {};
    for (const axisDef of def.axes) {
        const axisBrigades = axisDef.brigades.filter((fid) => {
            const formation = formations[fid];
            if (!formation) return false;
            if (!isEligibleOperationFormation(formation)) return false;
            // Exclude combat-ineffective brigades — they pass isEligibleOperationFormation
            // (which only checks kind/status) but will fail at execution, causing zero
            // eligible attackers per turn.
            if ((formation.personnel ?? 0) < MIN_ATTACK_PERSONNEL) return false;
            if ((formation.disrupted_turns ?? 0) > 0) return false;
            // Exclude brigades currently in column-march transit — they are already
            // marching somewhere else and contribute zero eligible attackers until they arrive.
            if (movementState[fid]?.status === 'in_transit') return false;
            if (!canReachAxisStaging(
                state,
                formation,
                def.faction,
                (axisDef.staging_osid ?? def.staging_osid) as Osid | undefined,
                adjacency,
                def.planning_duration != null ? Math.max(0, def.planning_duration - 1) : undefined,
            )) return false;
            // Exempt-corps brigades (e.g. General Staff elites) are allowed
            // if explicitly named in a pre-planned op — they get an elite loan
            // to the operation's corps at injection time.
            const corpsId = getFormationCorpsId(formation);
            if (isSectorAssignmentExemptCorpsId(corpsId)) {
                if (!formation.elite_loan_state) return false; // non-elite exempt = skip
                if (adjacency && !canEliteLoanReachCorpsTerritory(state, fid, def.corps, adjacency)) return false;
                // Only schedule a new loan if not already loaned to this corps
                // (e.g. a probe may have already loaned the brigade at the same turn).
                const ls = formation.elite_loan_state;
                if (!ls.on_loan || ls.loaned_to_corps !== def.corps) {
                    eliteLoans.push({ brigadeId: fid, corpsId: def.corps });
                }
            }
            return true;
        });

        if (axisBrigades.length === 0) continue;

        const axisObjectives = axisDef.objectives.filter((osid) => {
            const controller = getPoliticalControllerOSID(state, osid, undefined);
            return controller !== null && controller !== def.faction;
        });

        if (axisObjectives.length === 0) continue;

        builtAxes.push(createPrePlannedAxis(
            axisBrigades,
            axisObjectives,
            axisDef.staging_osid ?? def.staging_osid,
        ));
        const lastAxis = builtAxes[builtAxes.length - 1]!;
        lastAxis.axis_id = axisDef.axis_id;
        lastAxis.name = axisDef.name;
        allParticipating.push(...axisBrigades);
    }

    if (builtAxes.length === 0) return null;
    return { axes: builtAxes, participating: allParticipating, eliteLoans };
}

/** Deploy elite loans for exempt-corps brigades named in a pre-planned operation. */
function deployPrePlannedEliteLoans(
    state: GameState,
    eliteLoans: { brigadeId: FormationId; corpsId: string }[],
    def: PrePlannedOp,
    turn: number,
    adjacency?: Map<Osid, Osid[]>,
): void {
    for (const loan of eliteLoans) {
        if (adjacency && !canEliteLoanReachCorpsTerritory(state, loan.brigadeId, loan.corpsId, adjacency)) {
            continue;
        }
        deployEliteLoan(
            state,
            loan.brigadeId,
            loan.corpsId,
            'offensive_support',
            0,
            turn,
            {
                purpose: 'offensive',
                why_needed: `Pre-planned deployment: ${loan.brigadeId} assigned to ${def.name}`,
                how_to_use: `Assault reserve on main axis of ${def.name}`,
            },
            `Pre-planned elite loan for ${def.name}`,
            'army_ai',
        );
    }
}

// PERMITTED CREATION ENTRY POINT — pre-planned and player-queued operations only.
// All CorpsOperation objects must be built via buildCorpsOperation() in corps_operation_helpers.ts.
/**
 * Inject pre-planned VRS operations into corps_command at scenario start.
 * Each operation starts in planning phase with planning_duration: 1.
 *
 * Note: Herzegovina corps gets TWO operations (Visegrad + Foca). The second
 * will be injected only if the first corps slot is already taken, using a
 * queued_operation approach — or we inject both if the corps has no active op.
 * For now, we inject the first matching op per corps (Visegrad first since it's
 * listed first) and queue the second.
 */
export function injectPrePlannedOperations(state: GameState, adjacency?: Map<Osid, Osid[]>): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;
    if (!hasInjectableBrigadeRoster(state)) return;

    const formations = state.military.formations ?? {};
    const turn = state.meta?.turn ?? 0;

    // Validate only definitions that are actually eligible to inject now.
    // Deferred operations are validated when their queue slot becomes live.
    const allWarnings: OpInjectionWarning[] = [];
    for (const def of ALL_PRE_PLANNED) {
        if (def.available_from != null && turn < def.available_from) continue;
        const cmd = corpsCommand[def.corps];
        const warnings = validateOpAtInjection(def, state, undefined, cmd ?? undefined);
        allWarnings.push(...warnings);
    }
    collectOpInjectionWarnings(state, allWarnings);

    // Track which corps already got an op this injection pass
    const injectedCorps = new Set<string>();

    for (const def of ALL_PRE_PLANNED) {
        const cmd = corpsCommand[def.corps];
        if (!cmd) continue;

        // Skip if not yet available
        if (def.available_from != null && turn < def.available_from) continue;

        // Skip if corps already has an active operation (including from this pass)
        if (hasActiveOperation(cmd)) continue;
        if (injectedCorps.has(def.corps)) continue;

        const warnings = validateOpAtInjection(def, state, undefined, cmd);
        collectOpInjectionWarnings(state, warnings);
        if (hasBlockingOpInjectionWarnings(warnings)) continue;

        // Build axes with validated brigades and objectives
        const result = buildAxesFromDef(def, state, adjacency);
        if (!result) continue;
        if (result.participating.length < MIN_OPERATION_PARTICIPANTS) continue;

        deployPrePlannedEliteLoans(state, result.eliteLoans, def, turn, adjacency);

        const primarySectorId = derivePrimarySectorForBrigades(
            Object.values(state.military.corps_front_sectors ?? {}),
            def.corps,
            result.participating,
            state.military.formations ?? {},
        );
        const op = buildCorpsOperation(def, result.axes, result.participating, turn, true, primarySectorId);
        cmd.active_operations.push(op);
        assignOperationCommander(state, op, def.corps, def.faction);
        cmd.stance = 'offensive';
        injectedCorps.add(def.corps);
    }

    // Queue second Herzegovina op (Foca) if Visegrad was injected
    // This will be picked up when the first op completes
    if (injectedCorps.has('vrs_herzegovina')) {
        const focaDef = ALL_PRE_PLANNED.find(d => d.name === 'Operation Foca');
        const cmd = corpsCommand['vrs_herzegovina'];
        if (focaDef && cmd && !cmd.queued_operations) {
            cmd.queued_operations = [focaDef.name];
        }
    }

    // Queue Drina Corps: Operation Drina → Podrinje Sweep → Pracha River → Zvezda 94 (available_from:100)
    if (injectedCorps.has('vrs_drina')) {
        const cmd = corpsCommand['vrs_drina'];
        if (cmd && !cmd.queued_operations) {
            cmd.queued_operations = ['Operation Podrinje Sweep', 'Operation Pracha River', 'Operation Zvezda 94'];
        }
    }

    // Queue SRK: Operation Prsten → Operation Trnovo
    // Prsten completes ~w9-10; Trnovo (available_from:6) injects immediately after.
    if (injectedCorps.has('vrs_sarajevo_romanija')) {
        const cmd = corpsCommand['vrs_sarajevo_romanija'];
        if (cmd && !cmd.queued_operations) {
            cmd.queued_operations = ['Operation Trnovo'];
        }
    }

    // Queue 1KK ops: Prijedor → Corridor → Jajce → Donji Vakuf → Bosanski Novi
    // Corridor fires 2nd (historically June-July 1992 ~w10-16), Jajce 3rd (~w20-25),
    // Donji Vakuf 4th (after Jajce completes). Previous n1145 regression: DV was moved
    // to 2nd position, stalled 23 turns, blocked Corridor → cascaded everywhere. Reverted.
    if (injectedCorps.has('vrs_1st_krajina')) {
        const cmd = corpsCommand['vrs_1st_krajina'];
        if (cmd && !cmd.queued_operations) {
            cmd.queued_operations = ['Operation Corridor', 'Operation Jajce', 'Operation Donji Vakuf', 'Operation Bosanski Novi'];
        }
    }

    // Queue deferred ops (those with available_from that weren't injected this pass)
    for (const def of ALL_PRE_PLANNED) {
        if (def.available_from == null) continue;
        if (injectedCorps.has(def.corps)) continue; // already injected directly
        const cmd = corpsCommand[def.corps];
        if (!cmd) continue;
        if (!cmd.queued_operations) cmd.queued_operations = [];
        if (!cmd.queued_operations.includes(def.name)) {
            cmd.queued_operations.push(def.name);
        }
    }
}

// PERMITTED CREATION ENTRY POINT — pre-planned and player-queued operations only.
// All CorpsOperation objects must be built via buildCorpsOperation() in corps_operation_helpers.ts.
/**
 * Inject a queued operation by name for a corps.
 * Called when a corps completes an operation and has queued_operations.
 */
export function injectQueuedOperation(state: GameState, corpsId: string, adjacency?: Map<Osid, Osid[]>): boolean {
    const cmd = state.military.corps_command?.[corpsId];
    // Queued pre-planned ops are sequential in slot 0.
    // Bot AI ops in other slots do NOT block queue injection.
    if (!cmd || !isSlot0AvailableForQueue(cmd)) return false;
    if (!cmd.queued_operations?.length) return false;

    const turn = state.meta?.turn ?? 0;
    const opName = cmd.queued_operations[0]!;

    const def = ALL_PRE_PLANNED.find(d => d.name === opName && d.corps === corpsId);
    if (!def) {
        // Unknown op — remove from queue and skip
        cmd.queued_operations.shift();
        if (cmd.queued_operations.length === 0) delete cmd.queued_operations;
        return false;
    }

    // Check available_from gating
    if (def.available_from != null && turn < def.available_from) return false;

    const effectiveDef = omitObjectivesClaimedByActiveOperations(def, cmd);
    if (effectiveDef.axes.length === 0) return false;

    // Skip if all objectives already achieved (faction-controlled) — op is moot.
    // Without this, the queue entry blocks sector offensives forever.
    const allObjectives = effectiveDef.axes.flatMap(a => a.objectives);
    const allAchieved = allObjectives.length > 0 && allObjectives.every(osid => {
        const controller = getPoliticalControllerOSID(state, osid, undefined);
        return controller === effectiveDef.faction;
    });
    if (allAchieved) {
        collectOpInjectionWarnings(state, [{
            op_name: effectiveDef.name,
            check: 'all_objectives_owned',
            detail: `Queued operation skipped because all ${allObjectives.length} objective(s) are already controlled by ${effectiveDef.faction}`,
            severity: 'warning',
            turn,
        }]);
        cmd.queued_operations.shift();
        if (cmd.queued_operations.length === 0) delete cmd.queued_operations;
        return false;
    }

    // Validate before building
    const queueWarnings = validateOpAtInjection(effectiveDef, state, undefined, cmd);
    collectOpInjectionWarnings(state, queueWarnings);
    if (hasBlockingOpInjectionWarnings(queueWarnings)) return false;

    // Build axes — brigades may not exist yet; keep queue entry for retry
    const result = buildAxesFromDef(effectiveDef, state, adjacency);
    if (!result) return false;
    if (result.participating.length < MIN_OPERATION_PARTICIPANTS) {
        collectOpInjectionWarnings(state, [{
            op_name: effectiveDef.name,
            check: 'participants_below_attack_floor',
            detail: `Queued operation has ${result.participating.length} viable participant(s); ${MIN_OPERATION_PARTICIPANTS} required`,
            severity: 'warning',
            turn,
        }]);
        return false;
    }

    deployPrePlannedEliteLoans(state, result.eliteLoans, effectiveDef, turn, adjacency);

    // Success — consume queue entry
    cmd.queued_operations.shift();
    if (cmd.queued_operations.length === 0) delete cmd.queued_operations;

    const primarySectorId = derivePrimarySectorForBrigades(
        Object.values(state.military.corps_front_sectors ?? {}),
        corpsId,
        result.participating,
        state.military.formations ?? {},
    );
    const op = buildCorpsOperation(effectiveDef, result.axes, result.participating, turn, true, primarySectorId);
    cmd.active_operations.push(op);
    assignOperationCommander(state, op, corpsId, effectiveDef.faction);
    cmd.stance = 'offensive';
    return true;
}

export const _ALL_PRE_PLANNED = ALL_PRE_PLANNED;

/**
 * ADR-0005 v2.2c (issue #40): brigade IDs reserved by pre-planned ops that have NOT yet
 * injected (`available_from > currentTurn`). These brigades are op-critical anchors/participants
 * referenced by hardcoded ID; excluding them from TG donor selection prevents donor consumption
 * from stranding a pre-planned op before it injects — e.g. Op Trnovo at w69, where the flag-on
 * 188w smoke showed `rs_trnovo_brigade` consumed/gone before injection, so the op failed with
 * `not found in formations` → axis_empty. A brigade is reserved only until its op's injection
 * turn; once injected (`available_from <= currentTurn`), the active op owns it and Hard Invariant
 * #1 (one-TG-per-brigade) governs any further TG membership.
 */
export function getReservedPrePlannedBrigadeIds(currentTurn: number): Set<FormationId> {
    const reserved = new Set<FormationId>();
    for (const def of ALL_PRE_PLANNED) {
        if ((def.available_from ?? 0) <= currentTurn) continue;
        for (const axis of def.axes) {
            for (const bid of axis.brigades) reserved.add(bid);
        }
    }
    return reserved;
}
