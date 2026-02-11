/**
 * B1 Event framework: types for trigger/effect and event definitions.
 * Deterministic: no timestamps; random events use caller-provided RNG.
 */

import type { GameState } from '../../state/game_state.js';

/** Trigger: when to consider firing (turn range; scenario can extend with keys later). */
export interface EventTrigger {
  /** Inclusive. Omit for no lower bound. */
  turn_min?: number;
  /** Inclusive. Omit for no upper bound. */
  turn_max?: number;
  /** Require this phase. */
  phase?: 'phase_i' | 'phase_ii';
}

/** Effect: narrative only (no simulation mutation in B1). */
export interface EventEffectNarrative {
  kind: 'narrative';
  text: string;
}

export type EventEffect = EventEffectNarrative;

export interface EventDefinition {
  id: string;
  trigger: EventTrigger;
  effect: EventEffect;
  /**
   * When set, event is probabilistic: fire with this probability [0,1] using rng().
   * When omitted, event fires when trigger matches (historical).
   */
  probability?: number;
}

export interface FiredEvent {
  id: string;
  text: string;
}

export type Rng = () => number;

/** Check if trigger matches current state (deterministic). */
export function triggerMatches(def: EventDefinition, state: GameState, currentTurn: number): boolean {
  const t = def.trigger;
  if (t.turn_min != null && currentTurn < t.turn_min) return false;
  if (t.turn_max != null && currentTurn > t.turn_max) return false;
  if (t.phase != null && state.meta.phase !== t.phase) return false;
  return true;
}
