/**
 * Time/condition-triggered VRS operations.
 *
 * These operations appear as offers when conditions are met:
 * - Posavina Corridor: after 1KK completes Op Corridor + EBK is idle (consolidation after Derventa)
 * - Kotor Varos: ~w10
 * - Jajce: ~w24
 * - Cerska-Kamenica: ~w40
 *
 * Bot auto-accepts all offers. Player can accept/decline (future IPC).
 * Declined ops are re-offered every 8 turns, up to 3 times.
 */

import type {
    CorpsOperation,
    FactionId,
    FormationId,
    GameState,
    OperationAxis,
    SettlementId, // LANE-2026-05-02-KRIVAJA: for prestageBrigadesForTriggeredOp brigade_movement_orders writes
} from '../../state/game_state.js';
import { createSingleAxis } from './sector_offensive_axis_helpers.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { assignOperationCommander } from './officer_system.js';
import { isEligibleOperationFormation, MIN_ATTACK_PERSONNEL } from '../../state/formation_constants.js';
import {
    validateOpAtInjection,
    collectOpInjectionWarnings,
    hasBlockingOpInjectionWarnings,
} from './operation_validation.js';
import type { ValidatableOpDef } from './operation_validation.js';
import {
    buildCorpsOperation,
    derivePrimarySectorForBrigades,
    hasActiveOperation,
    hasAvailableSlot,
} from './corps_operation_helpers.js';

const MIN_OPERATION_PARTICIPANTS = 2;


// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface TriggeredAxisDef {
    axis_id: string;
    name: string;
    corps: string; // which corps provides the brigades for this axis
    brigades: FormationId[];
    objectives: string[];
    staging_osid?: string;
}

interface TriggeredOpDef {
    name: string;
    /** Faction that owns this operation. Used for objective filtering and validation. */
    faction: FactionId;
    /** Primary corps that "owns" the operation. For joint ops, axes may have different corps. */
    primary_corps: string;
    axes: TriggeredAxisDef[];
    staging_osid: string;
    /** Trigger condition check. */
    trigger: (state: GameState, turn: number) => boolean;
    /** Planning duration in turns. */
    planning_duration: number;
    /** Override minimum attack outcome for brigades in this operation. */
    min_attack_outcome?: CorpsOperation['min_attack_outcome'];
}

// ═══════════════════════════════════════════════════════════════════════════
// Trigger helpers
// ═══════════════════════════════════════════════════════════════════════════

function corpsOpFinished(state: GameState, corpsId: string): boolean {
    const cmd = state.military.corps_command?.[corpsId];
    if (!cmd) return false;
    // Finished = no active op AND no queued ops remaining
    return !hasActiveOperation(cmd) && (!cmd.queued_operations || cmd.queued_operations.length === 0);
}

/** Check whether a corps has completed a specific operation (by name) in the AAR history. */
function corpsCompletedOp(state: GameState, corpsId: string, opName: string): boolean {
    const history = state.operation_history;
    if (!history) return false;
    return history.some(aar => aar.corps_id === corpsId && aar.operation_name === opName);
}

function hasEnemyObjective(
    state: GameState,
    faction: FactionId,
    objectives: readonly string[],
): boolean {
    return objectives.some((osid) => {
        const controller = getPoliticalControllerOSID(state, osid, undefined);
        return controller !== null && controller !== faction;
    });
}

function opStillHasEnemyObjectives(state: GameState, def: TriggeredOpDef): boolean {
    return def.axes.some((axis) => hasEnemyObjective(state, def.faction, axis.objectives));
}

// ═══════════════════════════════════════════════════════════════════════════
// Definitions
// ═══════════════════════════════════════════════════════════════════════════

const TRIGGERED_OPS_RAW: TriggeredOpDef[] = [
    {
        // Operation Posavina Corridor — 1KK reduces the HRHB Orašje pocket (~w31+).
        // Historically VRS isolated then squeezed the Croatian Orašje enclave (BB1 p.182).
        //
        // Root causes of 0 attacks (history):
        //   1. Cross-corps eastern axis (vrs_east_bosnian): EBK brigades invisible to
        //      brigade AI when op lives on 1KK. Sacred Rule: never share brigades across corps.
        //   2. Western_corridor staging (derventa_2): starts HRHB — invalid staging.
        //   3. Western_corridor objectives (misinci_2, zivinice, novo_selo_2, brod): all RS
        //      by trigger time → 0 valid objectives.
        //   4. op:orasje:domaljevac_2 does NOT EXIST in the graph — only
        //      op:bosanski_samac:domaljevac_2 exists (RS-painted, not a valid objective).
        //   5. op:orasje:ostra_luka is RS-painted at Jan 1993 → filtered by buildOperation.
        //   6. planning_duration=4 insufficient: rs_27th_derventa is 7 hops from new staging.
        //
        // Fix: staging = domaljevac_2 (RS, adjacent to donja_mahala HRHB).
        //   Only two valid HRHB objectives exist: donja_mahala, orasje.
        //   planning_duration=9: rs_27th (7 hops) + 2-turn buffer.
        name: 'Operation Posavina Corridor',
        faction: 'RS',
        primary_corps: 'vrs_1st_krajina',
        staging_osid: 'op:bosanski_samac:domaljevac_2',
        planning_duration: 9,
        trigger: (state, _turn) => {
            // 1KK must have completed Op Corridor
            return corpsCompletedOp(state, 'vrs_1st_krajina', 'Operation Corridor');
        },
        axes: [
            {
                axis_id: 'orasje_pocket',
                name: 'Orašje Pocket',
                corps: 'vrs_1st_krajina',
                brigades: [
                    'rs_27th_derventa_motorized' as FormationId,
                    'rs_1st_trebava_infantry' as FormationId,
                    'rs_1st_vujak_light_infantry' as FormationId,
                ],
                // domaljevac_2 (RS, adjacent to donja_mahala) is the staging.
                // ostra_luka is RS-painted (filtered out by buildOperation).
                // Valid HRHB objectives from staging: donja_mahala → orasje.
                // planning_duration=9: rs_27th_derventa is 7 hops from staging + 2 buffer.
                objectives: [
                    'op:orasje:donja_mahala',
                    'op:orasje:orasje',
                ],
                staging_osid: 'op:bosanski_samac:domaljevac_2',
            },
        ],
    },
    {
        // Herzegovina Consolidation — VRS secures Mostar hills + southern Konjic
        // after Op Višegrad + Op Foča complete. Historically held throughout war
        // (BB1 p.193 Mostar hills, BB2 p.514 Glavatičevo). Two separate axes
        // with dedicated brigades (no sharing with Op Foča brigades).
        name: 'Operation Herzegovina Consolidation',
        faction: 'RS',
        primary_corps: 'vrs_herzegovina',
        staging_osid: 'op:nevesinje:sopilja',
        // planning_duration=3: rs_nevesinje_brigade (home krekovi_2, 1 hop from sopilja) needs
        // time to disengage from sector duties and march to staging. Previous value of 1 was
        // too tight — the brigade was often still at the front when execution began.
        // rs_bilea_brigade (home bileca_2) needs time to disengage and march into the southern Konjic staging area.
        planning_duration: 3,
        min_attack_outcome: 'repulsed' as const,
        trigger: (state, _turn) => {
            return corpsCompletedOp(state, 'vrs_herzegovina', 'Operation Visegrad')
                && corpsCompletedOp(state, 'vrs_herzegovina', 'Operation Foca')
                && corpsOpFinished(state, 'vrs_herzegovina');
        },
        axes: [
            {
                axis_id: 'mostar_heights',
                name: 'Mostar Heights',
                corps: 'vrs_herzegovina',
                // sopilja is adjacent to vranjevici_2 (RS, march waypoint via osid_control_overrides).
                // vranjevici_2 is adjacent to blagaj_2 (RBiH) and hodbina_2 follows.
                // vranjevici_2 and kruzanj_2 are RS from turn 0 (painted overrides) so they are
                // stripped by buildAxesFromDef; blagaj_2 is the actual first enemy objective.
                // Historical: VRS pushed into the Neretva valley south of Mostar throughout 1992-93.
                brigades: [
                    'rs_nevesinje_brigade' as FormationId,
                ],
                objectives: [
                    'op:mostar:vranjevici_2',   // RS waypoint (sopilja-adjacent); stripped at execution
                    'op:mostar:blagaj_2',        // RBiH — first real target, Neretva valley approach
                    'op:mostar:hodbina_2',       // RBiH — follow-on objective south of Blagaj
                ],
                staging_osid: 'op:nevesinje:sopilja',
            },
            {
                axis_id: 'konjic_south',
                name: 'Konjic South',
                corps: 'vrs_herzegovina',
                // bijela_2 (RS, staging) is adjacent to glavaticevo_2 (RS, march waypoint).
                // glavaticevo_2 is adjacent to dzepi_2 (RBiH); dzepi_2 is adjacent to konjic_2 (RBiH).
                // glavaticevo_2 and ljuta are RS from turn 0 so stripped at execution.
                // Historical: VRS Herzegovina maintained pressure on southern Konjic throughout 1992-93.
                brigades: [
                    'rs_bilea_brigade' as FormationId,
                ],
                objectives: [
                    'op:konjic:glavaticevo_2',  // RS waypoint (bijela_2-adjacent); stripped at execution
                    'op:konjic:dzepi_2',         // RBiH — first real target, southern Konjic valley
                    'op:konjic:konjic_2',        // RBiH — follow-on, Konjic town axis
                ],
                staging_osid: 'op:konjic:bijela_2',
            },
        ],
    },
    {
        name: 'Operation Kotor Varos',
        faction: 'RS',
        primary_corps: 'vrs_1st_krajina',
        staging_osid: 'op:kotor_varos:kotor_varos_2',
        planning_duration: 2,
        trigger: (state, turn) => turn >= 10 && hasEnemyObjective(state, 'RS', [
            'op:kotor_varos:kotor_varos_2',
            'op:kotor_varos:vrbanjci_2',
            'op:kotor_varos:prisocka_2',
        ]),
        axes: [
            {
                axis_id: 'kotor_varos_siege',
                name: 'Kotor Varos Siege',
                corps: 'vrs_1st_krajina',
                brigades: [
                    'rs_1st_kotor_varo_light_infantry' as FormationId,
                    'rs_12th_kotorsko_light_infantry' as FormationId,
                    'rs_22nd_krajina_infantry' as FormationId,
                ],
                objectives: [
                    'op:kotor_varos:kotor_varos_2',
                    'op:kotor_varos:vrbanjci_2',
                    'op:kotor_varos:prisocka_2',
                ],
                staging_osid: 'op:kotor_varos:kotor_varos_2',
            },
        ],
    },
    {
        name: 'Operation Cerska-Kamenica',
        faction: 'RS',
        primary_corps: 'vrs_drina',
        staging_osid: 'op:srebrenica:brezovice_2',
        planning_duration: 2,
        trigger: (_state, turn) => turn >= 40,
        axes: [
            {
                axis_id: 'cerska_pocket',
                name: 'Cerska Pocket',
                corps: 'vrs_drina',
                brigades: [
                    'rs_1st_birac' as FormationId,
                    'rs_1st_milii' as FormationId,
                ],
                objectives: [
                    'op:srebrenica:brezovice_2',
                    'op:srebrenica:mala_daljegosta_2',
                ],
                staging_osid: 'op:srebrenica:brezovice_2',
            },
            {
                axis_id: 'kamenica',
                name: 'Kamenica',
                corps: 'vrs_drina',
                brigades: [
                    'rs_1st_zvornik' as FormationId,
                    'rs_1st_bratunac' as FormationId,
                ],
                objectives: [
                    'op:srebrenica:osmace_2',
                    'op:srebrenica:radovcici',
                    'op:srebrenica:sulice_2',
                ],
                staging_osid: 'op:srebrenica:osmace_2',
            },
        ],
    },
    // ═════════════════════════════════════════════════════════════════════════
    // Late-1995 historical reversal operations.
    //
    // Source: docs/40_reports/implemented/20260501_TARGET_AWARE_SCENARIO_HEALTH_BASELINE.md
    // identified four missing scripted ops as the dominant Family-1 (missing
    // scenario content) gap at oct1995. These four operations close those gaps
    // by adding turn-gated triggered ops at week >= 170 (Krivaja-95) through
    // week >= 175 (Sana). They do not affect early-war runs (104w n1588, 156w
    // n1589 hashes preserved by gate ≥ 170).
    //
    // LANE-NIGHTSHIFT-KRIVAJA-95-T168-FLOOR-FIX (2026-05-06): Krivaja-95 +
    // Stupčanica-95 trigger floors enforce the §6 sensitive-history canonical
    // floor of t≥170 (Engine_Invariants_v0_9_0.md §6 + SENSITIVE_HISTORY_
    // DESIGN_GATE.md). Prior threshold of t≥168 was a pre-existing canon
    // violation surfaced by 188w A/B (n1705 + n1707). Sign-off precedent:
    // Stupčanica SHAPE B b03333af; Krivaja Phase 1 bc44ddec. Mechanism is
    // faction-symmetric (a generic numeric-turn-gate predicate); only the
    // canon Krivaja-95 data row threshold is bumped. 40w window (t≤40)
    // unaffected; 188w first-fire shifts t168→t170 by design.
    //
    // Date math (Apr 1 1992 = w0):
    //   w170 ≈ July 8 1995   → Krivaja-95 (Srebrenica fall, July 6–11 1995)
    //   w172 ≈ July 22 1995  → Stupčanica-95 (Žepa fall, July 14–25 1995)
    //   w175 ≈ Aug 12 1995   → Mistral 2 (Drvar/Šipovo/Mrkonjić push, Sep 8–15)
    //   w175 ≈ Aug 12 1995   → Operation Sana (5th Corps liberation, Sep–Oct 1995)
    //
    // Objective OSIDs are constrained to the 712-OSID universe and are validated
    // against `data/source/calibration/painted_control_oct1995.json` so that
    // each objective is painted = the operation's faction at oct1995. OSID
    // adjacency was verified against `data/derived/operational/operational_contact_graph.json`.
    //
    // Sensitive-history note: Krivaja-95 and Stupčanica-95 are TERRITORIAL
    // representations of the operations that captured the Srebrenica and Žepa
    // safe areas in July 1995. They model the territorial control flip only.
    // Atrocity, narrative, and consequence mechanics are explicitly out of
    // scope for this packet and require a separate /historian + /game-designer
    // sign-off (see docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md).
    //
    // Known scope limitation: `checkTriggeredOperations` calls
    // `assignOperationCommander(..., 'RS')` with a hardcoded faction. For RS
    // ops (Krivaja-95, Stupčanica-95) this is correct. For RBiH (Sana) and
    // HRHB (Mistral 2) the commander assignment returns no candidate (no RS
    // officer matches a Federation corps), so those ops fire without an
    // assigned named commander — territorial behavior is unaffected; officer
    // effects default to neutral. Repairing this hardcode is engine code,
    // explicitly out of this packet's scope.
    // ═════════════════════════════════════════════════════════════════════════
    {
        // Operation Krivaja-95 — VRS Drina Corps captures the Srebrenica
        // safe area, July 6–11 1995. Territorial outcome: srebrenica_2 town
        // + Potočari + surrounding enclave OSIDs flip RBiH→RS.
        //
        // LANE-2026-05-02-KRIVAJA (REVISED 2026-05-02 follow-up after Codex
        // review found the prior catalog comment cited Krstić §123 for a
        // brigade attack-axis claim that paragraph does not actually make,
        // and asserted a Zvornik-LIB-not-in-opening-assault claim that
        // contradicts Popović §245 fn 757 + §247):
        //
        // The Drina Corps preparatory order for Krivaja-95 (issued 2 July
        // 1995 in the name of Drina Corps Commander Živanović) was addressed
        // to "the Zvornik, Birac, Romanija, Vlasenica, Podrinje, Bratunac,
        // Milici and Skelani brigades of the Drina Corps" — ICTY Popović
        // IT-05-88-T Trial Judgment §244 (verbatim), citing Ex. 5DP00106
        // "Drina Corps Order No. 01/04-156-1 Preparatory Order No. 1, 2 July
        // 1995". Specific opening-assault tasks per the combat order
        // (Ex. P00107 "Operations Order No. 1 Krivaja-95, 2 July 1995"),
        // ICTY Popović §245 fn 757 verbatim: "a part of the Bratunac Brigade
        // was given the task to prevent the intervention of the ABiH from
        // Potočari towards Srebrenica, and the Battalion of the Zvornik
        // Brigade was given the task to attack ABiH forces along the axis
        // of three wooded hills (500 metres north of Zeleni Jadar) –
        // Pusmulići village – Bojna – Srebrenica." Tactical Group 1, the
        // principal opening-assault tactical group, was commanded by
        // Pandurević, Commander of the Zvornik Brigade; TG-1 left the
        // Standard Barracks in Zvornik 4 July and arrived in Zeleni Jadar
        // 5 July; opening assault commenced 6 July 0400 hrs (ICTY Popović
        // §247 + §249 verbatim). The Zvornik Brigade is therefore
        // documented as an opening-assault participant — at battalion
        // level along the southern Zeleni Jadar–Pusmulići–Bojna axis, and
        // through TG-1 command at brigade level.
        //
        // Catalog brigades reflect a defensible Drina Corps subset of
        // Popović §244's eight named brigades, mapped to existing OOB
        // formation_ids: rs_1st_zvornik (Battalion-of-Zvornik per §245 fn
        // 757; Pandurević / TG-1 per §247), rs_1st_bratunac (Bratunac
        // Brigade Potočari-blocking task per §245 fn 757), rs_1st_milii
        // (Milici brigade per §244), rs_5th_podrinje (Podrinje brigade per
        // §244), rs_skelani_battalion (Skelani brigade per §244). 1st Birac
        // and Romanija Brigade (also in §244) are not added: 1st Birac was
        // in the Krivaja-95 preparatory list but engine integration would
        // require a separate Birac OOB cross-corps audit; the Romanija
        // Brigade (TG-2 commander Trivić per §247) belongs to
        // vrs_sarajevo_romanija corps and is out of vrs_drina scope.
        //
        // NOTE: ICTY Krstić IT-98-33-T §§122–123, contrary to a prior
        // version of this comment, do NOT name brigades or assign attack
        // axes — those paragraphs discuss only Krivaja-95's STRATEGIC
        // OBJECTIVES (split the enclaves; reduce them to urban cores).
        // Brigade-granularity citations are in Popović, not Krstić §123.
        //
        // Objectives are the five srebrenica:* OSIDs that flipped RBiH→RS
        // between apr1995 and oct1995 painted truth (donji_potocari_2,
        // srebrenica_2, bostahovine_2, milacevici, suceska). Other srebrenica
        // OSIDs (luka_2, ljeskovik_2, obadi) were already RS-painted at apr1995
        // — already captured under earlier ops (Cerska-Kamenica) or never RBiH.
        //
        // Staging at op:bratunac:bratunac_2 (RS-painted at all dates; physical
        // VRS Drina Corps HQ proximity for the operation; 1 hop from
        // donji_potocari_2). Adjacency: bratunac_2 ↔ donji_potocari_2 ↔
        // srebrenica_2 ↔ {luka_2, ljeskovik_2, obadi, suceska, milacevici} ↔
        // bostahovine_2.
        name: 'Operation Krivaja-95',
        faction: 'RS',
        primary_corps: 'vrs_drina',
        staging_osid: 'op:bratunac:bratunac_2',
        planning_duration: 3,
        min_attack_outcome: 'repulsed',
        // LANE-NIGHTSHIFT-KRIVAJA-95-T168-FLOOR-FIX (2026-05-06): bumped 168→170
        // to enforce §6 canonical floor (Engine_Invariants_v0_9_0.md §6 +
        // SENSITIVE_HISTORY_DESIGN_GATE.md). Sign-off precedent: b03333af / bc44ddec.
        trigger: (_state, turn) => turn >= 170,
        axes: [
            {
                axis_id: 'srebrenica_enclave',
                name: 'Srebrenica Enclave',
                corps: 'vrs_drina',
                brigades: [
                    // LANE-2026-05-02-KRIVAJA: per Popović §244 + §245 fn 757 + §247.
                    'rs_1st_zvornik' as FormationId,
                    'rs_1st_bratunac' as FormationId,
                    'rs_1st_milii' as FormationId,
                    'rs_5th_podrinje' as FormationId,
                    'rs_skelani_battalion' as FormationId,
                ],
                objectives: [
                    'op:srebrenica:donji_potocari_2',
                    'op:srebrenica:srebrenica_2',
                    'op:srebrenica:bostahovine_2',
                    'op:srebrenica:milacevici',
                    'op:srebrenica:suceska',
                ],
                staging_osid: 'op:bratunac:bratunac_2',
            },
        ],
    },
    {
        // Operation Stupčanica-95 — VRS Drina Corps captures the Žepa safe
        // area, July 14–25 1995, immediately after Krivaja-95. Historical
        // force: VRS 1st Bircac/Milici/Vlasenica brigades + Drina Corps
        // detachments. Territorial outcome: zepa_2 (the only Žepa-area
        // OSID that flipped RBiH→RS in this op per painted truth).
        // (BB2 p.611, ICTY Krstić verdict.)
        //
        // Single-objective op (zepa_2 was apr1995=RBiH, oct1995=RS). Other
        // rogatica OSIDs were already RS at apr1995.
        //
        // Staging at op:vlasenica:grabovica (RS-painted at all dates;
        // rs_1st_milii home; adjacent to vlasenica:bacici → pomol_2 → zepa_2).
        // Adjacency chain verified: grabovica ↔ bacici ↔ pomol_2 ↔ zepa_2.
        name: 'Operation Stupčanica-95',
        faction: 'RS',
        primary_corps: 'vrs_drina',
        staging_osid: 'op:vlasenica:grabovica',
        planning_duration: 3,
        min_attack_outcome: 'repulsed',
        trigger: (_state, turn) => turn >= 172,
        axes: [
            {
                axis_id: 'zepa_pocket',
                name: 'Žepa Pocket',
                corps: 'vrs_drina',
                brigades: [
                    'rs_1st_vlasenica' as FormationId,
                    'rs_1st_milii' as FormationId,
                    'rs_1st_podrinje' as FormationId,
                ],
                objectives: [
                    'op:rogatica:zepa_2',
                ],
                staging_osid: 'op:vlasenica:grabovica',
            },
        ],
    },
    {
        // Operation Mistral 2 — HV-HVO joint offensive, September 8–15 1995.
        // Historical thrust: Croatian Army (HV) crossed into western Bosnia
        // and joined HVO 1st Guard + Tomislavgrad-area brigades to capture
        // Drvar, Glamoč rear, Bosansko Grahovo, Šipovo, and approach
        // Mrkonjić Grad. (BB2 p.629–642.)
        //
        // SCOPE NOTE: Glamoč proper (glamoc_2/kovacevci_2/pribelja/vidimlije_2)
        // is painted=HRHB at apr1995, indicating Cincar 1994 capture. Per
        // packet scope the Mistral 2 op only includes Glamoč OSIDs that
        // flipped between apr1995 and oct1995 (halapic, stekerovci_2). A
        // separate Cincar 1994 op packet would close the apr1995 Glamoč gap
        // — out of scope here per user prompt.
        //
        // Two axes from Livno area (HRHB-held throughout the war):
        //
        // Axis 1 (Drvar/Grahovo): hvo_main_staff 1st Guard mechanized push
        //   north through Glamoč rear into Drvar, Bosansko Grahovo. Staging
        //   at op:livno:misi_2 (1st Guard home).
        //
        // Axis 2 (Šipovo/Mrkonjić Grad): hvo_tomislavgrad mountain brigades
        //   push northeast through Glamoč rear and Šipovo into Mrkonjić Grad.
        //   Staging at op:livno:livno_2 (HRHB town center).
        //
        // Cross-corps op (primary hvo_main_staff, secondary hvo_tomislavgrad).
        // No HV (Croatian Army) brigades in OOB, so HV's contribution is
        // implicitly absorbed into the HVO axes (historical accuracy is
        // preserved at the territorial level).
        name: 'Operation Mistral 2',
        faction: 'HRHB',
        primary_corps: 'hvo_main_staff',
        staging_osid: 'op:livno:misi_2',
        planning_duration: 4,
        min_attack_outcome: 'repulsed',
        trigger: (_state, turn) => turn >= 175,
        axes: [
            {
                axis_id: 'mistral_drvar',
                name: 'Drvar–Grahovo Axis',
                corps: 'hvo_main_staff',
                brigades: [
                    'hvo_1st_guard_abb' as FormationId,
                ],
                objectives: [
                    'op:glamoc:halapic',
                    'op:glamoc:stekerovci_2',
                    'op:titov_drvar:prekaja_2',
                    'op:titov_drvar:drvar_2',
                    'op:titov_drvar:sipovljani_2',
                    'op:bosansko_grahovo:crni_lug',
                    'op:bosansko_grahovo:bosansko_grahovo_2',
                    'op:bosansko_grahovo:malesevci',
                    'op:bosansko_grahovo:ugarci',
                ],
                staging_osid: 'op:livno:misi_2',
            },
            {
                axis_id: 'mistral_sipovo',
                name: 'Šipovo–Mrkonjić Axis',
                corps: 'hvo_tomislavgrad',
                brigades: [
                    'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
                    'hrhb_kralj_tomislav_brigade' as FormationId,
                ],
                objectives: [
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
                ],
                staging_osid: 'op:livno:livno_2',
            },
        ],
    },
    // Operation Sana — MIGRATED to opportunity catalog (LANE B Phase 3, 2026-05-01).
    // Single owner is now `src/sim/combat/operation_opportunity_catalog_5th_corps.ts`
    // (`SANA_95_OPPORTUNITY`). The opportunity layer evaluates pocket survival,
    // Storm/Oluja theater opening, corps readiness, staging access, and live
    // enemy posture — none of which the calendar-only `turn >= 175` trigger
    // could express. Player/bot decision routes through
    // `applyOpportunityDecision` -> `buildCorpsOperation`, producing a
    // CorpsOperation with the same brigade roster, axis layout, and objective
    // set this entry shipped — but only when the opportunity preconditions
    // are satisfied. Removal is the single-owner enforcement.
];

// Operation Mistral 2 is migrated to the Federation / Western Bosnia
// opportunity catalog. Keep the legacy definition inert as historical footprint
// source text only; the active triggered catalog must not dual-own it.
const TRIGGERED_OPS: TriggeredOpDef[] = TRIGGERED_OPS_RAW.filter(
    (def) => def.name !== 'Operation Mistral 2',
);

// ═══════════════════════════════════════════════════════════════════════════
// Re-offer constants
// ═══════════════════════════════════════════════════════════════════════════

const REOFFER_COOLDOWN_TURNS = 8;
const MAX_DECLINE_COUNT = 3;

// ═══════════════════════════════════════════════════════════════════════════
// Core logic
// ═══════════════════════════════════════════════════════════════════════════

// Use shared isEligibleOperationFormation from formation_constants

function buildOperation(
    def: TriggeredOpDef,
    state: GameState,
    turn: number,
): { op: CorpsOperation; corpsAxes: Map<string, OperationAxis[]> } | null {
    const formations = state.military.formations ?? {};
    const movementState = state.military.brigade_movement_state ?? {};

    const builtAxes: OperationAxis[] = [];
    const allParticipating: FormationId[] = [];
    const corpsAxes = new Map<string, OperationAxis[]>();

    for (const axisDef of def.axes) {
        const axisBrigades = axisDef.brigades.filter((fid) => {
            const formation = formations[fid];
            if (!formation || getFormationCorpsId(formation) !== axisDef.corps) return false;
            if (!isEligibleOperationFormation(formation)) return false;
            if ((formation.personnel ?? 0) < MIN_ATTACK_PERSONNEL) return false;
            if ((formation.disrupted_turns ?? 0) > 0) return false;
            if (movementState[fid]?.status === 'in_transit') return false;
            return true;
        }).sort(strictCompare);

        if (axisBrigades.length === 0) continue;

        const axisObjectives = axisDef.objectives.filter((osid) => {
            const controller = getPoliticalControllerOSID(state, osid, undefined);
            return controller !== null && controller !== def.faction;
        });

        if (axisObjectives.length === 0) continue;

        const axis = createSingleAxis(
            axisBrigades,
            axisObjectives,
            axisDef.staging_osid ?? def.staging_osid,
            formations,
        );
        axis.axis_id = axisDef.axis_id;
        axis.name = axisDef.name;

        builtAxes.push(axis);
        allParticipating.push(...axisBrigades);

        // Track which axes belong to which corps (for joint ops)
        if (!corpsAxes.has(axisDef.corps)) corpsAxes.set(axisDef.corps, []);
        corpsAxes.get(axisDef.corps)!.push(axis);
    }

    if (builtAxes.length === 0) return null;
    if (allParticipating.length < MIN_OPERATION_PARTICIPANTS) return null;

    const allObjectives = builtAxes.flatMap(a => a.objectives);

    const primarySectorId = derivePrimarySectorForBrigades(
        Object.values(state.military.corps_front_sectors ?? {}),
        def.primary_corps,
        allParticipating,
        state.military.formations ?? {},
    );
    // PERMITTED CREATION ENTRY POINT — triggered (condition/time-gated) operations.
    // Not pre-planned (no is_pre_planned flag) — does not occupy the slot-0 queue.
    // Sector anchoring now derives from the primary corps brigade set.
    const op = buildCorpsOperation(def, builtAxes, allParticipating, turn, false, primarySectorId);

    return { op, corpsAxes };
}

// LANE-2026-05-02-KRIVAJA: trigger-turn pre-stage helper.
/**
 * LANE-2026-05-02-KRIVAJA: Trigger-turn pre-stage helper.
 *
 * Triggered ops historically relied on bot AI + `planning_duration` grace to
 * drift participant brigades to the staging OSID, but Phase B distribution
 * (`brigade_assignment.ts:1809/1876/1992`) is blind to op participation —
 * see PROJECT_LEDGER 20260502 DRINA PARTIAL handoff #5. This helper emits
 * column-march `brigade_movement_orders` for any participant whose
 * `location_osid` is not the axis `staging_osid`, allowing brigades to march
 * during the planning window. Faction-agnostic; deterministic via
 * `strictCompare`-sorted participant iteration. Mirrors the planning_duration
 * design intent of `pre_planned_operations.ts:69`. Skips inactive / destroyed
 * formations (filtered by `isEligibleOperationFormation` already, but enforced
 * here too for defense-in-depth — also filters `kind` to brigade/og/phantom).
 *
 * Overwrite contract (REVISED 2026-05-02 follow-up after Codex review):
 * The helper NEVER overwrites existing movement plans. Specifically:
 *   1. Brigade already at staging → SKIP (no-op).
 *   2. Brigade `brigade_movement_state[id].status === 'in_transit'` → SKIP
 *      regardless of current `destination_sids`. This preserves accumulated
 *      transit progress (`turns_remaining`, `path`) and respects whatever
 *      system originally set the brigade in motion (Phase B distribution,
 *      column-march, commander correction). Re-issuing an order at trigger
 *      turn would reset transit state per architecture lesson 2026-04-01
 *      (Phase B re-orders in-transit brigades unless guarded).
 *   3. Brigade has an existing `brigade_movement_orders[id]` entry → SKIP
 *      regardless of destination. The triggered-op pre-stage does NOT have
 *      priority over other movement-order owners; if the engine has already
 *      written an order, that owner has reason for it (e.g. emergency
 *      defensive deployment, commander correction of a wrong march, army-
 *      reserve recall). Silent overwrite would corrupt those owners.
 *   4. Otherwise (no transit, no order, not at staging) → write the column-
 *      march order toward the axis `staging_osid`.
 *
 * Net effect: triggered-op pre-stage fills the GAP for participants the
 * engine has not given a movement plan to yet. Brigades already with a plan
 * keep theirs. This is the conservative shape that does not regress
 * `estimateForceRatio` numerator bookkeeping for already-in-transit brigades
 * (predecessor handoff #7 still applies for participants who become
 * in_transit AFTER pre-stage fires).
 *
 * Mutates `state.military.brigade_movement_orders` in place. Returns void.
 */
export function prestageBrigadesForTriggeredOp(
    state: GameState,
    def: TriggeredOpDef,
): void {
    const formations = state.military.formations ?? {}; // LANE-2026-05-02-KRIVAJA
    const movementState = state.military.brigade_movement_state ?? {}; // LANE-2026-05-02-KRIVAJA: in-transit guard
    for (const axis of def.axes) { // LANE-2026-05-02-KRIVAJA: axes order is the catalog-declared order, deterministic
        // LANE-2026-05-02-KRIVAJA: sort participant brigade IDs for deterministic write order
        const sortedBrigades = [...axis.brigades].sort(strictCompare);
        const stagingOsid = axis.staging_osid; // LANE-2026-05-02-KRIVAJA
        if (!stagingOsid) continue; // LANE-2026-05-02-KRIVAJA: no staging means nothing to march toward
        for (const brigadeId of sortedBrigades) { // LANE-2026-05-02-KRIVAJA
            const formation = formations[brigadeId]; // LANE-2026-05-02-KRIVAJA
            if (!formation) continue; // LANE-2026-05-02-KRIVAJA: roster lists brigade absent from OOB at this turn
            if (!isEligibleOperationFormation(formation)) continue; // LANE-2026-05-02-KRIVAJA: skip inactive / non-brigade kinds
            if (formation.location_osid === stagingOsid) continue; // LANE-2026-05-02-KRIVAJA: already at staging
            // LANE-2026-05-02-KRIVAJA contract rule 2: do not reset in_transit brigades.
            // Re-issuing a movement order resets transit state per architecture lesson 2026-04-01.
            if (movementState[brigadeId]?.status === 'in_transit') continue;
            // LANE-2026-05-02-KRIVAJA contract rule 3: do not silently stomp an existing order.
            // Other owners (commander correction, emergency defense, army reserve recall) have priority.
            if (state.military.brigade_movement_orders?.[brigadeId]) continue;
            if (!state.military.brigade_movement_orders) { // LANE-2026-05-02-KRIVAJA
                state.military.brigade_movement_orders = {}; // LANE-2026-05-02-KRIVAJA
            }
            // LANE-2026-05-02-KRIVAJA: stance:'column' is mandatory for multi-hop destinations
            // (architecture lesson 2026-04-04: omitting stance routes to wrong movement system).
            // Cast mirrors brigade_front_distribution.ts:255-257 / commander_march_correction.ts:113-116.
            state.military.brigade_movement_orders[brigadeId] = {
                destination_sids: [stagingOsid as SettlementId], // LANE-2026-05-02-KRIVAJA
                stance: 'column', // LANE-2026-05-02-KRIVAJA
            } as { destination_sids: SettlementId[] };
        }
    }
}

/**
 * Check triggered operation conditions and auto-inject for bot factions.
 * Called each turn from the pipeline. Returns names of newly injected ops.
 */
export function checkTriggeredOperations(state: GameState): string[] {
    const turn = state.meta?.turn ?? 0;
    const cc = state.military.corps_command;
    if (!cc) return [];

    const injected: string[] = [];

    for (const def of TRIGGERED_OPS) {
        // Already accepted?
        if (state.military.triggered_operations_accepted?.[def.name]) continue;

        // Permanently declined (3 strikes)?
        const declineInfo = state.military.declined_operations?.[def.name];
        if (declineInfo && declineInfo.decline_count >= MAX_DECLINE_COUNT) continue;

        // In re-offer cooldown?
        if (declineInfo && (turn - declineInfo.declined_turn) < REOFFER_COOLDOWN_TURNS) continue;

        // Check trigger condition
        if (!def.trigger(state, turn)) continue;

        // Primary corps must not have an active operation
        const primaryCmd = cc[def.primary_corps];
        if (!primaryCmd || hasActiveOperation(primaryCmd)) continue;

        // For joint ops, check secondary corps too
        const secondaryCorps = new Set(def.axes.map(a => a.corps).filter(c => c !== def.primary_corps));
        let secondaryBlocked = false;
        for (const secCorpsId of secondaryCorps) {
            const secCmd = cc[secCorpsId];
            if (secCmd && hasActiveOperation(secCmd)) {
                secondaryBlocked = true;
                break;
            }
        }
        if (secondaryBlocked) continue;

        // Skip stale offers that no longer have any enemy objectives to pursue.
        // This keeps historical-op orchestration honest when the map state has
        // already made an offer moot before its trigger date.
        if (!opStillHasEnemyObjectives(state, def)) continue;

        // Validate before building
        const liveAxes = def.axes
            .map((axis) => ({
                ...axis,
                objectives: axis.objectives.filter((osid) => {
                    const controller = getPoliticalControllerOSID(state, osid, undefined);
                    return controller !== null && controller !== def.faction;
                }),
            }))
            .filter((axis) => axis.objectives.length > 0);
        if (liveAxes.length === 0) continue;
        const effectiveDef = { ...def, axes: liveAxes };

        const validatable: ValidatableOpDef = {
            name: effectiveDef.name,
            faction: effectiveDef.faction,
            axes: liveAxes.map(a => ({ axis_id: a.axis_id, brigades: a.brigades, objectives: a.objectives, staging_osid: a.staging_osid })),
            staging_osid: effectiveDef.staging_osid,
        };
        const trigWarnings = validateOpAtInjection(validatable, state, undefined, primaryCmd);
        collectOpInjectionWarnings(state, trigWarnings);
        if (hasBlockingOpInjectionWarnings(trigWarnings)) continue;

        // Bot auto-accept: build and inject the operation
        const result = buildOperation(effectiveDef, state, turn);
        if (!result) continue;

        // LANE-2026-05-02-KRIVAJA: emit column-march orders for any participant
        // whose location_osid is not the axis staging_osid. Phase B distribution
        // (brigade_assignment.ts:1809/1876/1992) treats existing
        // brigade_movement_orders as exclusion gates, so this prevents Phase B
        // drift from re-tasking participants away from the operation during the
        // planning_duration grace window. Triggered_operations_accepted (set
        // below) ensures this fires once per def.
        prestageBrigadesForTriggeredOp(state, effectiveDef); // LANE-2026-05-02-KRIVAJA

        // For single-corps ops: inject directly
        // For joint ops: inject into primary corps (all axes), set participating brigades
        primaryCmd.active_operations.push(result.op);
        assignOperationCommander(state, result.op, def.primary_corps, 'RS');
        primaryCmd.stance = 'offensive';

        // Track acceptance
        if (!state.military.triggered_operations_accepted) state.military.triggered_operations_accepted = {};
        state.military.triggered_operations_accepted[def.name] = turn;

        injected.push(def.name);
    }

    return injected;
}

/** Exported for testing. */
export const _TRIGGERED_OPS = TRIGGERED_OPS;
