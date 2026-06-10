/**
 * Phase 3D: Capacity modifiers (consumption helpers)
 *
 * Side-effect free helpers to read per-SID capacity multipliers produced by Phase 3D.
 * These helpers must NOT introduce new mechanics: they only expose existing multipliers/caps
 * for consumption at existing hook points (e.g., pressure generation, supply penalties).
 */

import type { GameState } from '../../state/game_state.js';
import { clamp01 as _clamp01 } from '../../utils/math.js';


export type CapacityModifierKey = 'authority_mult' | 'cohesion_mult' | 'supply_mult' | 'pressure_cap_mult';

export interface SidCapacityModifiers {
    authority_mult: number;
    cohesion_mult: number;
    supply_mult: number;
    pressure_cap_mult: number;
}

const DEFAULT_MODIFIERS: SidCapacityModifiers = {
    authority_mult: 1,
    cohesion_mult: 1,
    supply_mult: 1,
    pressure_cap_mult: 1
};

/** Clamp to [0, 1], returning 1 for non-finite inputs (NaN, Infinity). */
function clamp01(x: number): number {
    if (!Number.isFinite(x)) return 1;
    return _clamp01(x);
}

/**
 * Safe per-SID modifier reader. Defaults to all 1s.
 */
export function getSidCapacityModifiers(state: GameState, sid: string): SidCapacityModifiers {
    const rec = state.political.capacity_modifiers?.by_sid?.[sid] as Partial<SidCapacityModifiers> | undefined;
    if (!rec || typeof rec !== 'object') return DEFAULT_MODIFIERS;
    return {
        authority_mult: clamp01(rec.authority_mult ?? 1),
        cohesion_mult: clamp01(rec.cohesion_mult ?? 1),
        supply_mult: clamp01(rec.supply_mult ?? 1),
        pressure_cap_mult: clamp01(rec.pressure_cap_mult ?? 1)
    };
}

/**
 * COLLAPSE PHASE IV-e — COMBAT CONSUMER (own-OSID-only defender degradation).
 *
 * Returns the collapse-driven defender-strength multiplier for an OSID, read from
 * that OSID's OWN `capacity_modifiers.by_sid[osid].supply_mult` (the supply-capacity
 * floor Phase 3D wrote for a chronically-collapsed defended OSID; 0.8937 in the
 * IV-d first-fire case). The combat consumer multiplies the defended OSID's
 * assembled `defenderPower` by this value so a collapsed defender is materially
 * weaker on its OWN ground and its OSID can fall through the normal combat path.
 *
 * INVARIANTS:
 * - OWN-OSID-ONLY: reads `getSidCapacityModifiers(state, osid)` (the single OSID
 *   passed in). It does NOT call `getEdgeCapacityMultiplier` / read any edge, so
 *   the §6 edge-min residual stays inert (own-OSID read only — no neighbor bleed).
 * - DEGRADE-ONLY: the return is in [floor, 1]. It can only WEAKEN the collapsed
 *   faction's own defender (accelerate its fall), never aid the attacker and never
 *   flip control directly — control still requires an actual attack to resolve.
 * - ENCLAVE-SAFE (G1): Phase 3D never writes `by_sid` for an enclave OSID, so
 *   `getSidCapacityModifiers` returns the all-1.0 default there → multiplier 1.0
 *   → enclave defenders are never degraded.
 * - DEFAULT-OFF NO-OP: with collapse disabled nothing is written to `by_sid`, so
 *   every OSID returns the all-1.0 default → multiplier 1.0 → `defenderPower`
 *   unchanged → byte-identical to the collapse-OFF baseline.
 * - DEFENSIVE FLOOR (`COLLAPSE_DEFENDER_FLOOR` 0.6, scope §A.4/§D1(b)): a safety
 *   rail, NOT a tuning knob — magnitude is tuned via the collapse constants. The
 *   floor guarantees collapse is "chronic, not catastrophic": a defender is never
 *   zeroed (which would make any attack auto-win — an unintended hard flip).
 */
export const COLLAPSE_DEFENDER_FLOOR = 0.6;

export function getCollapseDefenderMultiplier(state: GameState, osid: string): number {
    // Own-OSID-only read (no edge read). Absent OSID (incl. all enclaves via G1,
    // and every OSID when collapse is disabled) → supply_mult defaults to 1.0.
    const supplyMult = getSidCapacityModifiers(state, osid).supply_mult;
    // Degrade-only with a defensive floor: never below COLLAPSE_DEFENDER_FLOOR,
    // never above 1.0 (getSidCapacityModifiers already clamps to [0,1]).
    return Math.max(COLLAPSE_DEFENDER_FLOOR, supplyMult);
}

/**
 * Conservative edge multiplier: min(endpoint multipliers).
 * This avoids inventing side attribution logic.
 */
export function getEdgeCapacityMultiplier(
    state: GameState,
    sidA: string,
    sidB: string,
    which: CapacityModifierKey
): number {
    const a = getSidCapacityModifiers(state, sidA)[which];
    const b = getSidCapacityModifiers(state, sidB)[which];
    return Math.min(a, b);
}

