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
    CorpsOperation,
    FactionId,
    FormationId,
    GameState,
    OperationAxis,
} from '../../state/game_state.js';
import { createSingleAxis } from './sector_offensive.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import { assignOperationCommander } from './officer_system.js';
import { isEligibleOperationFormation } from '../../state/formation_constants.js';
import { EXEMPT_CORPS_IDS } from './corps_front_sectors_constants.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { deployEliteLoan } from './army_reserve_system.js';
import { validateOpAtInjection, collectOpInjectionWarnings } from './operation_validation.js';
import type { OpInjectionWarning } from './operation_validation.js';
import { hasActiveOperation, isSlot0AvailableForQueue } from './corps_operation_helpers.js';
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

const VRS_PRE_PLANNED: PrePlannedOp[] = [
    {
        corps: 'vrs_east_bosnian',
        faction: 'RS',
        name: 'Operation Koridor',
        staging_osid: 'op:bijeljina:dvorovi_2',
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
                    'op:brcko:brezovo_polje_selo_2',
                    'op:brcko:donji_rahic',
                    'op:brcko:krepsic',
                    'op:brcko:potocari_2',
                    'op:brcko:skakava_donja',
                ],
                staging_osid: 'op:bijeljina:crnjelovo_donje',
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
                    'op:bratunac:pobudje_2',
                    'op:vlasenica:vlasenica_2',
                    'op:vlasenica:cerska_2',
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
                    'op:rogatica:brcigovo',
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
                    'op:visegrad:drinsko',
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
                    'op:vogosca:hotonj',
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
                    'op:ilijas:krivajevici',
                    'op:ilijas:sirovine',
                ],
                staging_osid: 'op:ilijas:podlugovi',
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
        axes: [
            {
                axis_id: 'foca_valley',
                name: 'Foca Valley',
                brigades: [
                    'rs_foa_brigade',
                    'rs_bilea_brigade',
                    'jna_mostar_garrison_tg',
                ],
                // foca_3 → prevrac (RS waypoint) → kolovarice (RBiH; painted RS — valid target).
                // ustipraca_2 removed (painted RBiH, caused DRINA over-capture in n1243).
                // VRS historically pressed the Goražde enclave from the west (BB2 p.289).
                objectives: [
                    'op:foca:prevrac',              // RS waypoint (foca_3-adjacent); stripped at execution
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
                // kalinovik_2 → vlaholje (RS waypoint) → varos_2 (RS waypoint) →
                // kalinovik:golubici_2 (painted RS, sim=RBiH — legitimate RS target) →
                // kalinovik:sela_2 (painted RS, sim=RBiH — legitimate RS target).
                // Original trnovo:delijas + trnovo:kijevo_2 removed — both painted RBiH and
                // caused SARAJEVO regression when RS captured them (n1243).
                objectives: [
                    'op:kalinovik:vlaholje',         // RS waypoint (kalinovik_2-adjacent); stripped
                    'op:kalinovik:varos_2',          // RS waypoint (vlaholje-adjacent); stripped
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
        // Staging at tasovcici_2 (HRHB-held, directly adjacent to rotimlja_2).
        // capljina_2 was the original staging but is not adjacent to rotimlja_2 —
        // brigades marched south to Čapljina and could never reach the Stolac targets.
        staging_osid: 'op:capljina:tasovcici_2',
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
                staging_osid: 'op:capljina:tasovcici_2',
            },
        ],
    },
];

const ARBIH_PRE_PLANNED: PrePlannedOp[] = [
    {
        corps: 'arbih_2nd_corps',
        faction: 'RBiH',
        name: 'Operation Teočak',
        staging_osid: 'op:kalesija:kalesija_grad_2',
        available_from: 15,
        min_attack_outcome: 'repulsed',
        planning_duration: 5, // 2nd Tuzla needs 3 hops to march from Tuzla to Kalesija
        axes: [
            {
                axis_id: 'kalesija_assault',
                name: 'Kalesija Assault',
                brigades: [
                    'arbih_2nd_tuzla',
                    'arbih_120th_liberation_black_swans', // elite loan from General Staff
                    'arbih_241st_spreca_muslim_light_gazije',
                    'arbih_242nd_zvornik_muslim_light',
                    'arbih_245th_mountain',
                ],
                objectives: ['op:zvornik:rastosnica_2'],
                staging_osid: 'op:kalesija:kalesija_grad_2',
            },
        ],
    },
];

// v0.4.7: Mostar Hills axis removed from Op Jackal — vranjevici/kruzanj painted RS
const ALL_PRE_PLANNED: PrePlannedOp[] = [...VRS_PRE_PLANNED, ...HRHB_PRE_PLANNED, ...ARBIH_PRE_PLANNED];

// ═══════════════════════════════════════════════════════════════════════════
// Injection
// ═══════════════════════════════════════════════════════════════════════════

// Use shared isEligibleOperationFormation from formation_constants

/**
 * Build axes and operation from a PrePlannedOp definition.
 * Shared by both initial injection and queued operation injection.
 */
function buildAxesFromDef(
    def: PrePlannedOp,
    state: GameState,
): { axes: OperationAxis[]; participating: FormationId[]; eliteLoans: { brigadeId: FormationId; corpsId: string }[] } | null {
    const formations = state.military.formations ?? {};
    const builtAxes: OperationAxis[] = [];
    const allParticipating: FormationId[] = [];
    const eliteLoans: { brigadeId: FormationId; corpsId: string }[] = [];

    for (const axisDef of def.axes) {
        const axisBrigades = axisDef.brigades.filter((fid) => {
            const formation = formations[fid];
            if (!formation) return false;
            if (!isEligibleOperationFormation(formation)) return false;
            // Exempt-corps brigades (e.g. General Staff elites) are allowed
            // if explicitly named in a pre-planned op — they get an elite loan
            // to the operation's corps at injection time.
            const corpsId = getFormationCorpsId(formation);
            if (corpsId && EXEMPT_CORPS_IDS.has(corpsId)) {
                if (!formation.elite_loan_state) return false; // non-elite exempt = skip
                eliteLoans.push({ brigadeId: fid, corpsId: def.corps });
            }
            return true;
        }).sort(strictCompare);

        if (axisBrigades.length === 0) continue;

        const axisObjectives = axisDef.objectives.filter((osid) => {
            const controller = getPoliticalControllerOSID(state, osid, undefined);
            return controller !== null && controller !== def.faction;
        });

        if (axisObjectives.length === 0) continue;

        builtAxes.push(createSingleAxis(
            axisBrigades,
            axisObjectives,
            axisDef.staging_osid ?? def.staging_osid,
            formations,
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
): void {
    for (const loan of eliteLoans) {
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

function buildCorpsOperation(def: PrePlannedOp, axes: OperationAxis[], participating: FormationId[], turn: number): CorpsOperation {
    const allObjectives = axes.flatMap(a => a.objectives);
    return {
        name: def.name,
        type: 'sector_attack',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        participating_brigades: [...new Set(participating)].sort(strictCompare),
        axes,
        objectives: [...new Set(allObjectives)],
        current_objective_index: 0,
        planning_duration: def.planning_duration ?? 1,
        supply_readiness: 1.0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        staging_osid: def.staging_osid,
        is_pre_planned: true,
        ...(def.min_attack_outcome ? { min_attack_outcome: def.min_attack_outcome } : {}),
    };
}

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
export function injectPrePlannedOperations(state: GameState): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    const formations = state.military.formations ?? {};
    const turn = state.meta?.turn ?? 0;

    // Validate all definitions and collect warnings
    const allWarnings: OpInjectionWarning[] = [];
    for (const def of ALL_PRE_PLANNED) {
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

        // Build axes with validated brigades and objectives
        const result = buildAxesFromDef(def, state);
        if (!result) continue;

        deployPrePlannedEliteLoans(state, result.eliteLoans, def, turn);

        const op = buildCorpsOperation(def, result.axes, result.participating, turn);
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

    // Queue Drina Corps: Operation Drina → Podrinje Sweep
    if (injectedCorps.has('vrs_drina')) {
        const cmd = corpsCommand['vrs_drina'];
        if (cmd && !cmd.queued_operations) {
            cmd.queued_operations = ['Operation Podrinje Sweep'];
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

/**
 * Inject a queued operation by name for a corps.
 * Called when a corps completes an operation and has queued_operations.
 */
export function injectQueuedOperation(state: GameState, corpsId: string): boolean {
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

    // Skip if all objectives already achieved (faction-controlled) — op is moot.
    // Without this, the queue entry blocks sector offensives forever.
    const allObjectives = def.axes.flatMap(a => a.objectives);
    const allAchieved = allObjectives.length > 0 && allObjectives.every(osid => {
        const controller = getPoliticalControllerOSID(state, osid, undefined);
        return controller === def.faction;
    });
    if (allAchieved) {
        cmd.queued_operations.shift();
        if (cmd.queued_operations.length === 0) delete cmd.queued_operations;
        return false;
    }

    // Validate before building
    const queueWarnings = validateOpAtInjection(def, state, undefined, cmd);
    collectOpInjectionWarnings(state, queueWarnings);

    // Build axes — brigades may not exist yet; keep queue entry for retry
    const result = buildAxesFromDef(def, state);
    if (!result) return false;

    deployPrePlannedEliteLoans(state, result.eliteLoans, def, turn);

    // Success — consume queue entry
    cmd.queued_operations.shift();
    if (cmd.queued_operations.length === 0) delete cmd.queued_operations;

    const op = buildCorpsOperation(def, result.axes, result.participating, turn);
    cmd.active_operations.push(op);
    assignOperationCommander(state, op, corpsId, def.faction);
    cmd.stance = 'offensive';
    return true;
}

export const _ALL_PRE_PLANNED = ALL_PRE_PLANNED;
