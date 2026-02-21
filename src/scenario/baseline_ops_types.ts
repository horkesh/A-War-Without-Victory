/**
 * Phase H1.9: Baseline operations scheduler types (scenario-only, run-only).
 * No GameState schema changes; no serialization of these into saves.
 */

/** Per-week engagement signal derived from activity counts + scenario intensity. */
export interface EngagementSignal {
    front_active: number;
    pressure_edges: number;
    intensity: number;
}

/** Fixed scaling constants for deterministic engagement_level in [0, 1]. */
export const FRONT_ACTIVE_NORM = 1500;
export const PRESSURE_EDGES_NORM = 2000;
export const ENGAGEMENT_WEIGHT_FRONT = 0.5;
export const ENGAGEMENT_WEIGHT_PRESSURE = 0.5;

/** Exhaustion delta per week at level=1. Max ~0.104 over 52 weeks. */
export const BASELINE_OPS_EXHAUSTION_RATE = 0.002;

/** Total displacement budget per week across front-active pool (level-scaled). */
export const BASELINE_OPS_DISPLACEMENT_RATE = 0.1;

/** Optional supply pressure worsening per week (0–100 scale). Not applied if semantics unclear. */
export const BASELINE_OPS_SUPPLY_RATE = 0.5;
