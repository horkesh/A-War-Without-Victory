/**
 * Phase H1.8: Probe context types (run-only; not serialized, not in GameState).
 * Used by baseline vs probe comparator to document whether an intent gate was found.
 */

/** Run-only probe context; never stored in GameState or saves. */
export interface ProbeContext {
  probe_intent_enabled: boolean;
  /** If Step A found a gating condition that was toggled: kind + location (path:line). */
  discovered_gate: { kind: string; location: string } | null;
}
