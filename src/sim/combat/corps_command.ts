/**
 * Stage 5: Corps command layer.
 * Corps provide standing stances + named multi-turn operations.
 * Army-level commands override corps stances.
 * Deterministic: no randomness, no timestamps.
 */

import type {
    ArmyStance,
    BrigadePosture,
    CorpsStance,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { releaseOperationCommander } from './officer_system.js';
import { hasActiveOperation, findBrigadeOperation, removeOperation } from './corps_operation_helpers.js';
import {
    completeOperationLifecycle,
    enterOperationRecovery,
    markOperationExecuting,
} from './tactical_group_lifecycle.js';

// ---------------------------------------------------------------------------
// Stance modifiers
// ---------------------------------------------------------------------------

export interface StanceModifiers {
    pressure_mult: number;       // multiplied with brigade pressure
    defense_mult: number;        // multiplied with brigade defense
    exhaustion_per_turn: number; // added to brigade exhaustion each turn
    cohesion_recovery: number;   // added to brigade cohesion per turn (reorganize)
    force_posture?: BrigadePosture; // if set, override brigade posture
}

const STANCE_MODIFIERS: Record<CorpsStance, StanceModifiers> = {
    defensive: { pressure_mult: 0.7, defense_mult: 1.2, exhaustion_per_turn: 0, cohesion_recovery: 0 },
    balanced: { pressure_mult: 1.0, defense_mult: 1.0, exhaustion_per_turn: 0, cohesion_recovery: 0 },
    offensive: { pressure_mult: 1.2, defense_mult: 0.8, exhaustion_per_turn: 1, cohesion_recovery: 0 },
    reorganize: { pressure_mult: 0.0, defense_mult: 1.0, exhaustion_per_turn: 0, cohesion_recovery: 2, force_posture: 'defend' },
};

// ---------------------------------------------------------------------------
// Operation phase durations (in turns)
// ---------------------------------------------------------------------------

const OP_PHASE_DURATION: Record<'planning' | 'execution' | 'recovery', number> = {
    planning: 3,
    execution: 4,
    recovery: 3,
};

// ---------------------------------------------------------------------------
// Operation execution modifiers (applied during execution phase ON TOP of stance)
// ---------------------------------------------------------------------------

const OP_EXECUTION_MODIFIERS: StanceModifiers = {
    pressure_mult: 1.5,
    defense_mult: 1.0,
    exhaustion_per_turn: 4,
    cohesion_recovery: -4,
};

/** Small preparation bonus during planning phase. */
const OP_PLANNING_MODIFIERS: StanceModifiers = {
    pressure_mult: 1.0,
    defense_mult: 1.05,
    exhaustion_per_turn: 0,
    cohesion_recovery: 0,
};

/** Recovery penalty during recovery phase. */
const OP_RECOVERY_MODIFIERS: StanceModifiers = {
    pressure_mult: 0.6,
    defense_mult: 0.9,
    exhaustion_per_turn: 0,
    cohesion_recovery: 1,
};

// ---------------------------------------------------------------------------
// Default command span
// ---------------------------------------------------------------------------

const DEFAULT_COMMAND_SPAN = 5;
const LARGE_CORPS_THRESHOLD = 6; // subordinate count for 2 OG slots

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize corps command state for corps formations.
 * Called at War phase entry and each turn. Idempotent: skips corps that already have state.
 *
 * Sources corps IDs from two places:
 * 1. Corps/corps_asset formations (kind === 'corps' || kind === 'corps_asset')
 * 2. Brigade corps_id references (handles cases where brigades are created by per-turn
 *    recruitment but corps formations haven't been loaded)
 */
export function initializeCorpsCommand(state: GameState): void {
    if (!state.military.formations) return;
    if (!state.military.corps_command) state.military.corps_command = {};

    // Collect all corps IDs from formations AND from brigade corps_id references
    const corpsIdSet = new Set<string>();
    const formationIds = Object.keys(state.military.formations).sort(strictCompare);
    for (const fid of formationIds) {
        const f = state.military.formations[fid];
        if ((f.kind === 'corps' || f.kind === 'corps_asset') && f.status === 'active') {
            corpsIdSet.add(fid);
        }
        if (f.corps_id && f.status === 'active') {
            corpsIdSet.add(f.corps_id);
        }
    }
    const corpsIds = [...corpsIdSet].sort(strictCompare);

    for (const cid of corpsIds) {
        // If already initialized, update subordinate count (brigades may have spawned since init)
        if (state.military.corps_command[cid]) {
            let subCount = 0;
            for (const fid of formationIds) {
                const f = state.military.formations[fid];
                if (f.corps_id === cid && (f.kind === 'brigade' || f.kind === 'og' || f.kind === 'operational_group' || f.kind === 'jna_phantom') && f.status === 'active') {
                    subCount++;
                }
            }
            state.military.corps_command[cid]!.subordinate_count = subCount;
            continue;
        }

        const corps = state.military.formations[cid];

        // Determine command span from tags or default
        let commandSpan = DEFAULT_COMMAND_SPAN;
        if (corps) {
            for (const tag of corps.tags ?? []) {
                if (tag.startsWith('cmd_span:')) {
                    const parsed = parseInt(tag.slice(9), 10);
                    if (!isNaN(parsed) && parsed > 0) commandSpan = parsed;
                }
            }
        }

        // Count subordinate brigades
        let subordinateCount = 0;
        for (const fid of formationIds) {
            const f = state.military.formations[fid];
            if (f.corps_id === cid && (f.kind === 'brigade' || f.kind === 'og' || f.kind === 'operational_group' || f.kind === 'jna_phantom') && f.status === 'active') {
                subordinateCount++;
            }
        }

        // OG slots: 2 for large corps, 1 otherwise
        const ogSlots = subordinateCount >= LARGE_CORPS_THRESHOLD ? 2 : 1;

        state.military.corps_command[cid] = {
            command_span: commandSpan,
            subordinate_count: subordinateCount,
            og_slots: ogSlots,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'balanced',
            active_operations: [],
        };
    }
}

// ---------------------------------------------------------------------------
// Effective stance (army override logic)
// ---------------------------------------------------------------------------

/**
 * Get effective stance for a corps, considering army-level overrides.
 * Army stance 'balanced' does not override; other values force a stance.
 */
export function getEffectiveCorpsStance(state: GameState, corpsId: FormationId): CorpsStance {
    const corps = state.military.formations?.[corpsId];
    if (!corps) return 'balanced';

    const armyStance = state.military.army_stance?.[corps.faction];
    if (!armyStance || armyStance === 'balanced') {
        return state.military.corps_command?.[corpsId]?.stance ?? 'balanced';
    }

    // Army stance overrides
    if (armyStance === 'general_offensive') return 'offensive';
    if (armyStance === 'general_defensive') return 'defensive';
    if (armyStance === 'total_mobilization') return 'reorganize';

    return state.military.corps_command?.[corpsId]?.stance ?? 'balanced';
}

// ---------------------------------------------------------------------------
// Stance modifiers for a brigade
// ---------------------------------------------------------------------------

/**
 * Get stance modifiers for a brigade based on its parent corps.
 * Returns balanced modifiers if the brigade has no corps.
 */
export function getCorpsStanceModifiers(state: GameState, brigade: FormationState): StanceModifiers {
    if (!brigade.corps_id) return STANCE_MODIFIERS.balanced;

    const effectiveStance = getEffectiveCorpsStance(state, brigade.corps_id);
    return STANCE_MODIFIERS[effectiveStance];
}

// ---------------------------------------------------------------------------
// Operation modifiers for a brigade
// ---------------------------------------------------------------------------

/**
 * Get operation modifiers for a brigade if it participates in an active operation.
 * Returns modifiers based on the operation phase, or null if not in any operation.
 */
export function getOperationModifiers(state: GameState, brigadeId: FormationId): StanceModifiers | null {
    if (!state.military.corps_command) return null;

    const corpsIds = Object.keys(state.military.corps_command).sort(strictCompare);
    for (const cid of corpsIds) {
        const cmd = state.military.corps_command[cid];
        const op = findBrigadeOperation(cmd, brigadeId);
        if (!op) continue;

        // Found: brigade is in this operation
        switch (op.phase) {
            case 'execution':
                return OP_EXECUTION_MODIFIERS;
            case 'planning':
                return OP_PLANNING_MODIFIERS;
            case 'recovery':
                return OP_RECOVERY_MODIFIERS;
            default:
                return null;
        }
    }

    return null;
}

// ---------------------------------------------------------------------------
// Operation phase advancement
// ---------------------------------------------------------------------------

/**
 * Advance operations by one turn. Handles phase transitions:
 * planning -> execution -> recovery -> complete (null).
 */
export function advanceOperations(state: GameState): void {
    if (!state.military.corps_command) return;

    const corpsIds = Object.keys(state.military.corps_command).sort(strictCompare);
    for (const cid of corpsIds) {
        const cmd = state.military.corps_command[cid];
        if (!hasActiveOperation(cmd)) continue;

        for (const op of [...cmd.active_operations]) {
            // Every combat operation is owned by sector_offensive.ts. This legacy
            // clock remains solely for non-combat reorganization operations.
            if (op.type !== 'reorganization') continue;

            const turnsInPhase = state.meta.turn - op.phase_started_turn;

            if (op.phase === 'planning' && turnsInPhase >= OP_PHASE_DURATION.planning) {
                op.phase = 'execution';
                op.phase_started_turn = state.meta.turn;
                markOperationExecuting(state, cid, op);
            } else if (op.phase === 'execution' && turnsInPhase >= OP_PHASE_DURATION.execution) {
                enterOperationRecovery(state, cid, op, state.meta.turn, 'completed');
            } else if (op.phase === 'recovery' && turnsInPhase >= OP_PHASE_DURATION.recovery) {
                // Operation complete
                releaseOperationCommander(state, op);
                completeOperationLifecycle(state, cid, op);
                removeOperation(cmd, op);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Per-turn corps effects on subordinate brigades
// ---------------------------------------------------------------------------

/**
 * Apply corps stance effects to subordinate brigades each turn.
 * Iterates corps and brigades in deterministic (sorted) order.
 */
export function applyCorpsEffects(state: GameState): void {
    if (!state.military.formations || !state.military.corps_command) return;

    const corpsIds = Object.keys(state.military.corps_command).sort(strictCompare);
    for (const cid of corpsIds) {
        const effectiveStance = getEffectiveCorpsStance(state, cid);
        const mods = STANCE_MODIFIERS[effectiveStance];

        // Update subordinate count while we iterate
        let subCount = 0;

        const formationIds = Object.keys(state.military.formations).sort(strictCompare);
        for (const fid of formationIds) {
            const f = state.military.formations[fid];
            if (f.corps_id !== cid || f.kind !== 'brigade' || f.status !== 'active') continue;
            subCount++;

            // Force posture override (e.g. reorganize forces defend)
            if (mods.force_posture !== undefined) {
                f.posture = mods.force_posture;
            }

            // Apply cohesion recovery
            if (mods.cohesion_recovery !== 0) {
                const currentCohesion = f.cohesion ?? 60;
                f.cohesion = Math.max(0, Math.min(100, currentCohesion + mods.cohesion_recovery));
            }
        }

        // Refresh subordinate count
        state.military.corps_command[cid].subordinate_count = subCount;
    }
}

// ---------------------------------------------------------------------------
// Army stance setter
// ---------------------------------------------------------------------------

/**
 * Update army stance for a faction.
 */
export function setArmyStance(state: GameState, faction: FactionId, stance: ArmyStance): void {
    if (!state.military.army_stance) state.military.army_stance = {};
    state.military.army_stance[faction] = stance;
}
