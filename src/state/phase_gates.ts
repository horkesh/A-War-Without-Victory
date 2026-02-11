/**
 * Phase A1.2: Minimal gating scaffold for the turn pipeline.
 * Each phase may be gated; for now all gates are open (enabled).
 * No gameplay logic; structural only.
 */

export type PhaseGateId =
  | 'directives'
  | 'deployments'
  | 'military_interaction'
  | 'fragmentation_resolution'
  | 'supply_resolution'
  | 'political_effects'
  | 'exhaustion_update'
  | 'persistence';

export interface PhaseGate {
  directives: boolean;
  deployments: boolean;
  military_interaction: boolean;
  fragmentation_resolution: boolean;
  supply_resolution: boolean;
  political_effects: boolean;
  exhaustion_update: boolean;
  persistence: boolean;
}

export const ALL_GATES_OPEN: PhaseGate = {
  directives: true,
  deployments: true,
  military_interaction: true,
  fragmentation_resolution: true,
  supply_resolution: true,
  political_effects: true,
  exhaustion_update: true,
  persistence: true
};

export function isPhaseEnabled(gate: PhaseGate, phaseId: PhaseGateId): boolean {
  return gate[phaseId] ?? true;
}
