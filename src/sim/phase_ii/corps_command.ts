/**
 * Stage 5: Corps command layer.
 * Corps provide standing stances + named multi-turn operations.
 * Army-level commands override corps stances.
 * Deterministic: no randomness, no timestamps.
 */

import type {
  GameState,
  FactionId,
  FormationId,
  FormationState,
  CorpsStance,
  ArmyStance,
  BrigadePosture,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

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
  defensive:  { pressure_mult: 0.7, defense_mult: 1.2, exhaustion_per_turn: 0, cohesion_recovery: 0 },
  balanced:   { pressure_mult: 1.0, defense_mult: 1.0, exhaustion_per_turn: 0, cohesion_recovery: 0 },
  offensive:  { pressure_mult: 1.2, defense_mult: 0.8, exhaustion_per_turn: 1, cohesion_recovery: 0 },
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
 * Called at Phase II entry. Idempotent: skips corps that already have state.
 */
export function initializeCorpsCommand(state: GameState): void {
  if (!state.formations) return;
  if (!state.corps_command) state.corps_command = {};

  const corpsIds = Object.keys(state.formations)
    .filter((fid) => {
      const f = state.formations![fid];
      return (f.kind === 'corps' || f.kind === 'corps_asset') && f.status === 'active';
    })
    .sort(strictCompare);

  for (const cid of corpsIds) {
    // Skip if already initialized
    if (state.corps_command[cid]) continue;

    const corps = state.formations[cid];

    // Determine command span from tags or default
    let commandSpan = DEFAULT_COMMAND_SPAN;
    for (const tag of corps.tags ?? []) {
      if (tag.startsWith('cmd_span:')) {
        const parsed = parseInt(tag.slice(9), 10);
        if (!isNaN(parsed) && parsed > 0) commandSpan = parsed;
      }
    }

    // Count subordinate brigades
    let subordinateCount = 0;
    const formationIds = Object.keys(state.formations).sort(strictCompare);
    for (const fid of formationIds) {
      const f = state.formations[fid];
      if (f.corps_id === cid && f.kind === 'brigade' && f.status === 'active') {
        subordinateCount++;
      }
    }

    // OG slots: 2 for large corps, 1 otherwise
    const ogSlots = subordinateCount >= LARGE_CORPS_THRESHOLD ? 2 : 1;

    state.corps_command[cid] = {
      command_span: commandSpan,
      subordinate_count: subordinateCount,
      og_slots: ogSlots,
      active_ogs: [],
      corps_exhaustion: 0,
      stance: 'balanced',
      active_operation: null,
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
  const corps = state.formations?.[corpsId];
  if (!corps) return 'balanced';

  const armyStance = state.army_stance?.[corps.faction];
  if (!armyStance || armyStance === 'balanced') {
    return state.corps_command?.[corpsId]?.stance ?? 'balanced';
  }

  // Army stance overrides
  if (armyStance === 'general_offensive') return 'offensive';
  if (armyStance === 'general_defensive') return 'defensive';
  if (armyStance === 'total_mobilization') return 'reorganize';

  return state.corps_command?.[corpsId]?.stance ?? 'balanced';
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
  if (!state.corps_command) return null;

  const corpsIds = Object.keys(state.corps_command).sort(strictCompare);
  for (const cid of corpsIds) {
    const cmd = state.corps_command[cid];
    const op = cmd.active_operation;
    if (!op) continue;
    if (!op.participating_brigades.includes(brigadeId)) continue;

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
  if (!state.corps_command) return;

  const corpsIds = Object.keys(state.corps_command).sort(strictCompare);
  for (const cid of corpsIds) {
    const cmd = state.corps_command[cid];
    const op = cmd.active_operation;
    if (!op) continue;

    const turnsInPhase = state.meta.turn - op.phase_started_turn;

    if (op.phase === 'planning' && turnsInPhase >= OP_PHASE_DURATION.planning) {
      op.phase = 'execution';
      op.phase_started_turn = state.meta.turn;
    } else if (op.phase === 'execution' && turnsInPhase >= OP_PHASE_DURATION.execution) {
      op.phase = 'recovery';
      op.phase_started_turn = state.meta.turn;
    } else if (op.phase === 'recovery' && turnsInPhase >= OP_PHASE_DURATION.recovery) {
      // Operation complete
      cmd.active_operation = null;
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
  if (!state.formations || !state.corps_command) return;

  const corpsIds = Object.keys(state.corps_command).sort(strictCompare);
  for (const cid of corpsIds) {
    const effectiveStance = getEffectiveCorpsStance(state, cid);
    const mods = STANCE_MODIFIERS[effectiveStance];

    // Update subordinate count while we iterate
    let subCount = 0;

    const formationIds = Object.keys(state.formations).sort(strictCompare);
    for (const fid of formationIds) {
      const f = state.formations[fid];
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
    state.corps_command[cid].subordinate_count = subCount;
  }
}

// ---------------------------------------------------------------------------
// Army stance setter
// ---------------------------------------------------------------------------

/**
 * Update army stance for a faction.
 */
export function setArmyStance(state: GameState, faction: FactionId, stance: ArmyStance): void {
  if (!state.army_stance) state.army_stance = {};
  state.army_stance[faction] = stance;
}
