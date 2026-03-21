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
                staging_osid: 'op:bijeljina:dvorovi_2',
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
                staging_osid: 'op:bratunac:ljubovija_2',
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
                    'rs_1st_guards_motorized',
                    'rs_65th_protection_motorized_regiment',
                    'rs_2nd_romanija_brigade',
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
                name: 'Northern Ring',
                brigades: [
                    'rs_3rd_sarajevo_infantry',
                    'rs_4th_sarajevo_light_infantry',
                    'jna_rajlovac_barracks_tg',
                ],
                objectives: [
                    'op:vogosca:svrake',
                    'op:vogosca:hotonj',
                    'op:ilijas:dragoradi',
                    'op:ilijas:krivajevici',
                    'op:ilijas:medojevici',
                    'op:ilijas:sirovine',
                ],
                staging_osid: 'op:ilijas:srednje',
            },
        ],
    },
    {
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
                objectives: [
                    'op:foca:brusna_2',
                    'op:foca:kosman',
                    'op:foca:tjentiste_2',
                    'op:foca:miljevina_2',
                    'op:foca:izbisno',
                    'op:foca:patkovina',
                    'op:foca:ustikolina',
                ],
                staging_osid: 'op:foca:foca_3',
            },
            {
                axis_id: 'kalinovik',
                name: 'Kalinovik',
                brigades: [
                    'rs_gacko_brigade',
                    'rs_kalinovik_brigade',
                ],
                objectives: [
                    'op:kalinovik:varos_2',
                    'op:kalinovik:golubici_2',
                    'op:kalinovik:sela_2',
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
        axes: [
            {
                axis_id: 'corridor_east',
                name: 'Corridor East',
                brigades: [
                    'rs_27th_derventa_motorized',   // spearhead — named for Derventa, fighting for home ground
                    'rs_43rd_prijedor_motorized',    // redeployed from Op Prijedor
                    'rs_16th_krajina_motorized',     // redeployed from Op Prijedor (Sanski Most axis)
                    'rs_5th_kozara_light_infantry',  // redeployed from Op Prijedor
                    'rs_1st_trebava_infantry',       // homed at Modriča — local knowledge, natural staging
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
        staging_osid: 'op:capljina:capljina_2',
        available_from: 8,
        min_attack_outcome: 'repulsed',
        axes: [
            {
                axis_id: 'stolac_sweep',
                name: 'Stolac-Čapljina Sweep',
                // Main effort: Čapljina → Tasovčići → Stolac
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
                    'op:stolac:rotimlja_2',
                    'op:stolac:pjesivac_kula_2',
                    'op:stolac:stolac_2',
                ],
                staging_osid: 'op:capljina:capljina_2',
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
        available_from: 25,
        min_attack_outcome: 'repulsed',
        axes: [
            {
                axis_id: 'kalesija_assault',
                name: 'Kalesija Assault',
                brigades: [
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
): { axes: OperationAxis[]; participating: FormationId[] } | null {
    const formations = state.military.formations ?? {};
    const builtAxes: OperationAxis[] = [];
    const allParticipating: FormationId[] = [];

    for (const axisDef of def.axes) {
        const axisBrigades = axisDef.brigades.filter((fid) => {
            const formation = formations[fid];
            if (!formation) return false;
            if (!isEligibleOperationFormation(formation)) return false;
            // Don't include brigades from exempt corps — they have no sector
            // assignment and can't receive march orders to reach the front.
            const corpsId = getFormationCorpsId(formation);
            if (corpsId && EXEMPT_CORPS_IDS.has(corpsId)) return false;
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
        ));
        const lastAxis = builtAxes[builtAxes.length - 1]!;
        lastAxis.axis_id = axisDef.axis_id;
        lastAxis.name = axisDef.name;
        allParticipating.push(...axisBrigades);
    }

    if (builtAxes.length === 0) return null;
    return { axes: builtAxes, participating: allParticipating };
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
        planning_duration: 1,
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

    // Track which corps already got an op this injection pass
    const injectedCorps = new Set<string>();

    for (const def of ALL_PRE_PLANNED) {
        const cmd = corpsCommand[def.corps];
        if (!cmd) continue;

        // Skip if not yet available
        if (def.available_from != null && turn < def.available_from) continue;

        // Skip if corps already has an active operation (including from this pass)
        if (cmd.active_operation) continue;
        if (injectedCorps.has(def.corps)) continue;

        // Build axes with validated brigades and objectives
        const result = buildAxesFromDef(def, state);
        if (!result) continue;

        const op = buildCorpsOperation(def, result.axes, result.participating, turn);
        cmd.active_operation = op;
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

    // Queue 1KK ops: Prijedor → Corridor → Bosanski Novi
    if (injectedCorps.has('vrs_1st_krajina')) {
        const cmd = corpsCommand['vrs_1st_krajina'];
        if (cmd && !cmd.queued_operations) {
            cmd.queued_operations = ['Operation Corridor', 'Operation Jajce', 'Operation Bosanski Novi'];
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
    if (!cmd || cmd.active_operation) return false;
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

    // Build axes — brigades may not exist yet; keep queue entry for retry
    const result = buildAxesFromDef(def, state);
    if (!result) return false;

    // Success — consume queue entry
    cmd.queued_operations.shift();
    if (cmd.queued_operations.length === 0) delete cmd.queued_operations;

    const op = buildCorpsOperation(def, result.axes, result.participating, turn);
    cmd.active_operation = op;
    assignOperationCommander(state, op, corpsId, def.faction);
    cmd.stance = 'offensive';
    return true;
}

export const _ALL_PRE_PLANNED = ALL_PRE_PLANNED;
