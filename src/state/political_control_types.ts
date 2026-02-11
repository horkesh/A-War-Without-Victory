/**
 * Phase F1: Explicit control status types for political control API.
 * Distinguishes known control (with side) from unknown control (null political_controller).
 * Consumption-only; no new mechanics.
 */



/** Canonical faction IDs for political control. */
export type ControlSide = 'RBiH' | 'RS' | 'HRHB';

/**
 * Explicit control status: known (with side) or unknown (null political_controller).
 * Prefer this over raw null checks to avoid accidental falsey semantics.
 */
export type ControlStatus =
  | { kind: 'known'; side: ControlSide }
  | { kind: 'unknown' };
