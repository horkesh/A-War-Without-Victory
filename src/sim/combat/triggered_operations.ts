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
} from '../../state/game_state.js';
import { createSingleAxis } from './sector_offensive.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { assignOperationCommander } from './officer_system.js';
import { isEligibleOperationFormation } from '../../state/formation_constants.js';
import { validateOpAtInjection, collectOpInjectionWarnings } from './operation_validation.js';
import type { ValidatableOpDef } from './operation_validation.js';
import { hasActiveOperation, hasAvailableSlot } from './corps_operation_helpers.js';


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
    min_attack_outcome?: string;
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

// ═══════════════════════════════════════════════════════════════════════════
// Definitions
// ═══════════════════════════════════════════════════════════════════════════

const TRIGGERED_OPS: TriggeredOpDef[] = [
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
        // rs_2nd_herzegovina_light_infantry (home korita/bileca) needs 3+ hops to reach sopilja.
        planning_duration: 3,
        min_attack_outcome: 'repulsed' as const,
        trigger: (state, _turn) => {
            return corpsOpFinished(state, 'vrs_herzegovina');
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
                    'rs_2nd_herzegovina_light_infantry' as FormationId,
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

        // Validate before building
        const validatable: ValidatableOpDef = {
            name: def.name,
            faction: def.faction,
            axes: def.axes.map(a => ({ axis_id: a.axis_id, brigades: a.brigades, objectives: a.objectives, staging_osid: a.staging_osid })),
            staging_osid: def.staging_osid,
        };
        const trigWarnings = validateOpAtInjection(validatable, state, undefined, primaryCmd);
        collectOpInjectionWarnings(state, trigWarnings);

        // Bot auto-accept: build and inject the operation
        const result = buildOperation(def, state, turn);
        if (!result) continue;

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
