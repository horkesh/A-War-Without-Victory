/**
 * Time/condition-triggered VRS operations.
 *
 * These operations appear as offers when conditions are met:
 * - Posavina Corridor: after 1KK + EBK opening ops finish
 * - Kotor Varos: ~w10
 * - Jajce: ~w24
 * - Cerska-Kamenica: ~w40
 *
 * Bot auto-accepts all offers. Player can accept/decline (future IPC).
 * Declined ops are re-offered every 8 turns, up to 3 times.
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
import { assignOperationCommander } from './officer_system.js';
import { isEligibleOperationFormation } from '../../state/formation_constants.js';

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
    /** Primary corps that "owns" the operation. For joint ops, axes may have different corps. */
    primary_corps: string;
    axes: TriggeredAxisDef[];
    staging_osid: string;
    /** Trigger condition check. */
    trigger: (state: GameState, turn: number) => boolean;
    /** Planning duration in turns. */
    planning_duration: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Trigger helpers
// ═══════════════════════════════════════════════════════════════════════════

function corpsOpFinished(state: GameState, corpsId: string): boolean {
    const cmd = state.military.corps_command?.[corpsId];
    if (!cmd) return false;
    // Finished = no active op AND no queued ops remaining
    return !cmd.active_operation && (!cmd.queued_operations || cmd.queued_operations.length === 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// Definitions
// ═══════════════════════════════════════════════════════════════════════════

const TRIGGERED_OPS: TriggeredOpDef[] = [
    {
        name: 'Operation Posavina Corridor',
        primary_corps: 'vrs_1st_krajina',
        staging_osid: 'op:derventa:derventa_2',
        planning_duration: 2,
        trigger: (state, _turn) => {
            // Both 1KK and EBK opening ops must be done
            return corpsOpFinished(state, 'vrs_1st_krajina')
                && corpsOpFinished(state, 'vrs_east_bosnian');
        },
        axes: [
            {
                axis_id: 'western_corridor',
                name: 'Western Corridor',
                corps: 'vrs_1st_krajina',
                brigades: [
                    'rs_27th_derventa_motorized' as FormationId,
                    'rs_1st_trebava_infantry' as FormationId,
                ],
                objectives: [
                    'op:derventa:misinci_2',
                    'op:derventa:zivinice',
                    'op:bosanski_brod:novo_selo_2',
                    'op:bosanski_brod:brod',
                ],
                staging_osid: 'op:derventa:derventa_2',
            },
            {
                axis_id: 'eastern_corridor',
                name: 'Eastern Corridor',
                corps: 'vrs_east_bosnian',
                brigades: [
                    'rs_3rd_posavina_light_infantry' as FormationId,
                    'rs_2nd_posavina_light_infantry' as FormationId,
                ],
                objectives: [
                    'op:orasje:ostra_luka',
                    'op:doboj:makljenovac',
                ],
                staging_osid: 'op:bosanski_samac:samac_2',
            },
        ],
    },
    {
        name: 'Operation Kotor Varos',
        primary_corps: 'vrs_1st_krajina',
        staging_osid: 'op:kotor_varos:kotor_varos_2',
        planning_duration: 2,
        trigger: (_state, turn) => turn >= 10,
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
        name: 'Operation Jajce',
        primary_corps: 'vrs_2nd_krajina',
        staging_osid: 'op:jajce:jajce_3',
        planning_duration: 3,
        trigger: (_state, turn) => turn >= 24,
        axes: [
            {
                axis_id: 'jajce_assault',
                name: 'Jajce Assault',
                corps: 'vrs_2nd_krajina',
                brigades: [
                    'rs_7th_krajina_motorized' as FormationId,
                    'rs_1st_drvar_light_infantry' as FormationId,
                    'rs_17th_klju_light_infantry' as FormationId,
                ],
                objectives: [
                    'op:jajce:jajce_3',
                    'op:jajce:jezero_2',
                    'op:jajce:kruscica',
                    'op:jajce:vinac_2',
                ],
                staging_osid: 'op:jajce:jajce_3',
            },
            {
                axis_id: 'donji_vakuf',
                name: 'Donji Vakuf',
                corps: 'vrs_2nd_krajina',
                brigades: [
                    'rs_5th_glamo_light_infantry' as FormationId,
                    'rs_3rd_petrovac_light_infantry' as FormationId,
                ],
                objectives: [
                    'op:donji_vakuf:donji_vakuf_2',
                    'op:donji_vakuf:oborci_2',
                    'op:donji_vakuf:prusac_2',
                    'op:donji_vakuf:torlakovac_2',
                ],
                staging_osid: 'op:donji_vakuf:donji_vakuf_2',
            },
        ],
    },
    {
        name: 'Operation Cerska-Kamenica',
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
];

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

    const builtAxes: OperationAxis[] = [];
    const allParticipating: FormationId[] = [];
    const corpsAxes = new Map<string, OperationAxis[]>();

    for (const axisDef of def.axes) {
        const axisBrigades = axisDef.brigades.filter((fid) => {
            const formation = formations[fid];
            if (!formation || getFormationCorpsId(formation) !== axisDef.corps) return false;
            return isEligibleOperationFormation(formation);
        }).sort(strictCompare);

        if (axisBrigades.length === 0) continue;

        const axisObjectives = axisDef.objectives.filter((osid) => {
            const controller = getPoliticalControllerOSID(state, osid, undefined);
            return controller !== null && controller !== 'RS';
        });

        if (axisObjectives.length === 0) continue;

        const axis = createSingleAxis(
            axisBrigades,
            axisObjectives,
            axisDef.staging_osid ?? def.staging_osid,
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

    const allObjectives = builtAxes.flatMap(a => a.objectives);

    const op: CorpsOperation = {
        name: def.name,
        type: 'sector_attack',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        participating_brigades: [...new Set(allParticipating)].sort(strictCompare),
        axes: builtAxes,
        objectives: [...new Set(allObjectives)],
        current_objective_index: 0,
        planning_duration: def.planning_duration,
        supply_readiness: 1.0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        staging_osid: def.staging_osid,
    };

    return { op, corpsAxes };
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
        if (!primaryCmd || primaryCmd.active_operation) continue;

        // For joint ops, check secondary corps too
        const secondaryCorps = new Set(def.axes.map(a => a.corps).filter(c => c !== def.primary_corps));
        let secondaryBlocked = false;
        for (const secCorpsId of secondaryCorps) {
            const secCmd = cc[secCorpsId];
            if (secCmd?.active_operation) {
                secondaryBlocked = true;
                break;
            }
        }
        if (secondaryBlocked) continue;

        // Bot auto-accept: build and inject the operation
        const result = buildOperation(def, state, turn);
        if (!result) continue;

        // For single-corps ops: inject directly
        // For joint ops: inject into primary corps (all axes), set participating brigades
        primaryCmd.active_operation = result.op;
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
