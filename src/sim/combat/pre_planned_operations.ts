/**
 * Pre-planned VRS operations injected at scenario start.
 *
 * These opening operations are explicit scenario-shaping data with
 * multi-axis structure: named brigades, JNA phantom support, and
 * historically-accurate objective chains.
 *
 * All operations are player-initiated: they start in 'planning' phase
 * and the player must execute them.
 */

import type {
    CorpsOperation,
    FormationId,
    GameState,
    OperationAxis,
} from '../../state/game_state.js';
import { createSingleAxis } from './sector_offensive.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getFormationCorpsId } from './corps_sector_partition.js';

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
    name: string;
    axes: AxisDef[];
    /** Fallback staging for the operation (used when axis doesn't specify one). */
    staging_osid: string;
}

const VRS_PRE_PLANNED: PrePlannedOp[] = [
    {
        corps: 'vrs_east_bosnian',
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
                    'rs_2nd_posavina',
                ],
                objectives: [
                    'op:bosanski_samac:samac_2',
                    'op:modrica:modrica',
                    'op:modrica:garevac_2',
                    'op:derventa:derventa_2',
                    'op:bosanski_brod:brod',
                ],
                staging_osid: 'op:bosanski_samac:pisari_2',
            },
        ],
    },
    {
        corps: 'vrs_drina',
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
                    'op:zvornik:drinjaca',
                    'op:zvornik:novo_selo',
                    'op:zvornik:paljevici',
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
                    'rs_1st_milici',
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
        corps: 'vrs_herzegovina',
        name: 'Operation Visegrad',
        staging_osid: 'op:visegrad:visegrad_2',
        axes: [
            {
                axis_id: 'visegrad_seizure',
                name: 'Visegrad Seizure',
                brigades: [
                    'rs_foa_brigade',
                    'rs_ajnie_brigade',
                    'jna_uzice_corps_tg',
                ],
                objectives: [
                    'op:visegrad:visegrad_2',
                    'op:visegrad:drinsko',
                    'op:visegrad:bogdasici',
                    'op:visegrad:kamenica_2',
                    'op:visegrad:medjedja_2',
                    'op:visegrad:prelovo_2',
                    'op:visegrad:velji_lug',
                    'op:visegrad:zlijeb',
                ],
                staging_osid: 'op:visegrad:visegrad_2',
            },
        ],
    },
    {
        corps: 'vrs_sarajevo_romanija',
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
                ],
                objectives: [
                    'op:vogosca:svrake',
                    'op:vogosca:hotonj',
                    'op:ilijas:dragoradi',
                    'op:ilijas:krivajevici',
                    'op:ilijas:medojevici',
                    'op:ilijas:sirovine',
                ],
                staging_osid: 'op:vogosca:vogosca_2',
            },
        ],
    },
    {
        corps: 'vrs_herzegovina',
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
        corps: 'vrs_1st_krajina',
        name: 'Operation Bosanski Novi',
        staging_osid: 'op:bosanski_novi:novi_grad_3',
        axes: [
            {
                axis_id: 'novi_grad',
                name: 'Novi Grad',
                brigades: [
                    'rs_1st_novigrad_infantry',
                    'rs_1st_banja_luka',
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

// ═══════════════════════════════════════════════════════════════════════════
// Injection
// ═══════════════════════════════════════════════════════════════════════════

function isEligibleFormation(f: { kind?: string; status: string }): boolean {
    return (f.kind === 'brigade' || f.kind === 'og' || f.kind === 'operational_group' || f.kind === 'jna_phantom')
        && f.status === 'active';
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
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const formations = state.formations ?? {};
    const turn = state.meta?.turn ?? 0;

    // Track which corps already got an op this injection pass
    const injectedCorps = new Set<string>();

    for (const def of VRS_PRE_PLANNED) {
        const cmd = corpsCommand[def.corps];
        if (!cmd) continue;

        // Skip if corps already has an active operation (including from this pass)
        if (cmd.active_operation) continue;
        if (injectedCorps.has(def.corps)) continue;

        // Build axes with validated brigades and objectives
        const builtAxes: OperationAxis[] = [];
        const allParticipating: FormationId[] = [];

        for (const axisDef of def.axes) {
            const axisBrigades = axisDef.brigades.filter((fid) => {
                const formation = formations[fid];
                if (!formation || getFormationCorpsId(formation) !== def.corps) return false;
                return isEligibleFormation(formation);
            }).sort(strictCompare);

            if (axisBrigades.length === 0) continue;

            const axisObjectives = axisDef.objectives.filter((osid) => {
                const controller = getPoliticalControllerOSID(state, osid, undefined);
                return controller !== null && controller !== 'RS';
            });

            if (axisObjectives.length === 0) continue;

            builtAxes.push(createSingleAxis(
                axisBrigades,
                axisObjectives,
                axisDef.staging_osid ?? def.staging_osid,
            ));
            // Override the auto-generated axis_id and name
            const lastAxis = builtAxes[builtAxes.length - 1]!;
            lastAxis.axis_id = axisDef.axis_id;
            lastAxis.name = axisDef.name;

            allParticipating.push(...axisBrigades);
        }

        if (builtAxes.length === 0) continue;

        // Flat fields for backward compatibility
        const allObjectives = builtAxes.flatMap(a => a.objectives);
        const dedupedObjectives = [...new Set(allObjectives)];

        const op: CorpsOperation = {
            name: def.name,
            type: 'sector_attack',
            phase: 'planning',
            started_turn: turn,
            phase_started_turn: turn,
            participating_brigades: [...new Set(allParticipating)].sort(strictCompare),
            axes: builtAxes,
            objectives: dedupedObjectives,
            current_objective_index: 0,
            planning_duration: 1,
            supply_readiness: 1.0,
            momentum: 0,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            staging_osid: def.staging_osid,
        };

        cmd.active_operation = op;
        cmd.stance = 'offensive';
        injectedCorps.add(def.corps);
    }

    // Queue second Herzegovina op (Foca) if Visegrad was injected
    // This will be picked up when the first op completes
    if (injectedCorps.has('vrs_herzegovina')) {
        const focaDef = VRS_PRE_PLANNED.find(d => d.name === 'Operation Foca');
        const cmd = corpsCommand['vrs_herzegovina'];
        if (focaDef && cmd && !cmd.queued_operations) {
            cmd.queued_operations = [focaDef.name];
        }
    }

    // Queue second 1KK op (Bosanski Novi) if Prijedor was injected
    if (injectedCorps.has('vrs_1st_krajina')) {
        const noviDef = VRS_PRE_PLANNED.find(d => d.name === 'Operation Bosanski Novi');
        const cmd = corpsCommand['vrs_1st_krajina'];
        if (noviDef && cmd && !cmd.queued_operations) {
            cmd.queued_operations = [noviDef.name];
        }
    }
}

/**
 * Inject a queued operation by name for a corps.
 * Called when a corps completes an operation and has queued_operations.
 */
export function injectQueuedOperation(state: GameState, corpsId: string): boolean {
    const cmd = state.corps_command?.[corpsId];
    if (!cmd || cmd.active_operation) return false;
    if (!cmd.queued_operations?.length) return false;

    const opName = cmd.queued_operations.shift()!;
    if (cmd.queued_operations.length === 0) delete cmd.queued_operations;

    const def = VRS_PRE_PLANNED.find(d => d.name === opName && d.corps === corpsId);
    if (!def) return false;

    const formations = state.formations ?? {};
    const turn = state.meta?.turn ?? 0;

    const builtAxes: OperationAxis[] = [];
    const allParticipating: FormationId[] = [];

    for (const axisDef of def.axes) {
        const axisBrigades = axisDef.brigades.filter((fid) => {
            const formation = formations[fid];
            if (!formation || getFormationCorpsId(formation) !== def.corps) return false;
            return isEligibleFormation(formation);
        }).sort(strictCompare);

        if (axisBrigades.length === 0) continue;

        const axisObjectives = axisDef.objectives.filter((osid) => {
            const controller = getPoliticalControllerOSID(state, osid, undefined);
            return controller !== null && controller !== 'RS';
        });

        if (axisObjectives.length === 0) continue;

        builtAxes.push(createSingleAxis(axisBrigades, axisObjectives, axisDef.staging_osid ?? def.staging_osid));
        const lastAxis = builtAxes[builtAxes.length - 1]!;
        lastAxis.axis_id = axisDef.axis_id;
        lastAxis.name = axisDef.name;
        allParticipating.push(...axisBrigades);
    }

    if (builtAxes.length === 0) return false;

    const allObjectives = builtAxes.flatMap(a => a.objectives);

    cmd.active_operation = {
        name: def.name,
        type: 'sector_attack',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        participating_brigades: [...new Set(allParticipating)].sort(strictCompare),
        axes: builtAxes,
        objectives: [...new Set(allObjectives)],
        current_objective_index: 0,
        planning_duration: 1,
        supply_readiness: 1.0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        staging_osid: def.staging_osid,
    };
    cmd.stance = 'offensive';
    return true;
}

export const _VRS_PRE_PLANNED = VRS_PRE_PLANNED;
