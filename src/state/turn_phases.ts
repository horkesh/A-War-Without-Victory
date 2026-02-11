/**
 * Phase A1.2: Stub phase handlers for the canonical weekly turn pipeline.
 * Each phase is a pure function: (state, inputs, gate) → state.
 * All phases are stubs that return state unchanged.
 *
 * Determinism rule (Engine Invariants §11.3):
 * - No iteration over Record/Map/Set without explicit sorting.
 * - Use strict comparator for ordering: (a < b ? -1 : a > b ? 1 : 0)
 * - No localeCompare (locale-dependent ordering is forbidden).
 */

import type { GameState } from './game_state.js';
import type { PhaseGate, PhaseGateId } from './phase_gates.js';

export interface TurnPipelineInput {
  seed: string;
}

export type PhaseFn = (
  state: GameState,
  inputs: TurnPipelineInput,
  gate: PhaseGate
) => GameState;

/**
 * Strict comparator for deterministic ordering (Engine Invariants §11.3).
 * Replaces localeCompare to avoid locale-dependent behavior.
 */
export function strictCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function stubPhase(state: GameState, _inputs: TurnPipelineInput, gate: PhaseGate, phaseId: PhaseGateId): GameState {
  const enabled = gate[phaseId] ?? true;
  if (!enabled) return state;
  return state;
}

export const phaseDirectives: PhaseFn = (state, inputs, gate) =>
  stubPhase(state, inputs, gate, 'directives');

export const phaseDeployments: PhaseFn = (state, inputs, gate) =>
  stubPhase(state, inputs, gate, 'deployments');

export const phaseMilitaryInteraction: PhaseFn = (state, inputs, gate) =>
  stubPhase(state, inputs, gate, 'military_interaction');

export const phaseFragmentationResolution: PhaseFn = (state, inputs, gate) =>
  stubPhase(state, inputs, gate, 'fragmentation_resolution');

export const phaseSupplyResolution: PhaseFn = (state, inputs, gate) =>
  stubPhase(state, inputs, gate, 'supply_resolution');

export const phasePoliticalEffects: PhaseFn = (state, inputs, gate) =>
  stubPhase(state, inputs, gate, 'political_effects');

export const phaseExhaustionUpdate: PhaseFn = (state, inputs, gate) =>
  stubPhase(state, inputs, gate, 'exhaustion_update');

export const phasePersistence: PhaseFn = (state, inputs, gate) =>
  stubPhase(state, inputs, gate, 'persistence');

export const PHASE_ORDER: PhaseGateId[] = [
  'directives',
  'deployments',
  'military_interaction',
  'fragmentation_resolution',
  'supply_resolution',
  'political_effects',
  'exhaustion_update',
  'persistence'
];
