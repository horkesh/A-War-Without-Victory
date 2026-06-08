/**
 * Corps coordination-coherence decay (synthesis §3 E-B1).
 *
 * `FormationState.coordination_coherence` (number in [0,1], default 1.0) is the
 * per-corps measure of operational command-and-control cohesion — the ability
 * of a corps to coordinate adjacent sectors, redeploy laterally, and hold a
 * contiguous line. It is DISTINCT from `strategic_depth` (geometric rear room)
 * and from the equipment-quality multiplier (NATO air-campaign C2/ammo damage):
 * coherence is the *operational coordination* layer that those two erode.
 *
 * Historical subject (the only corps that actually lost coordination in-period):
 * VRS 1st + 2nd Krajina Corps after Operation Storm (4-7 Aug 1995). SVK
 * destruction removed the rear cushion, ~165k Krajina-Serb refugees paralysed
 * the Bosanski Petrovac / Drvar / Glamoč rear, and frontage stretched from
 * ~30 to 50-60 km/brigade with no operational reserve. The corps did not lose
 * battles — they lost coordination (ICTY Mladić MICT-13-56 §3437-3450; BB v2
 * ch 28). E-B1 reproduces that emergently: the periphery sectors of those corps
 * become brittle once coherence falls below a threshold, letting the war's most
 * marginal western-Krajina captures *emerge* rather than be forced.
 *
 * Decay inputs (per corps, all live-state, deterministic):
 *   (1) Operation Storm onset — `state.meta.operation_storm_triggered`. Pre-Storm
 *       coherence is a byte-stable 1.0 for every corps (no consumer fires).
 *   (2) Krajina-collapse subject — membership in `KRAJINA_COLLAPSE_CORPS`
 *       (the canonical corps-id list owned by strategic_depth.ts). Faction-
 *       symmetric in shape: a corps-id gate, not a faction predicate.
 *   (3) Strategic depth (E-B3, shipped) — lower depth (lost SVK buffer, frontage
 *       overstretch) drives coherence down. Direct input per game_state.ts:1047.
 *   (4) NATO C2 suppression — the equipment-quality multiplier active during the
 *       Deliberate Force window erodes coordination further.
 *
 * SCOPE NOTE (v2): per the first-build NO-GO diagnosis, the all-corps faction-
 * symmetric launch-block (the `<0.7` Consumer-2) over-reached and its collateral
 * landed on the war's most marginal western captures (the attacker was gagged).
 * v2 keeps ONLY the periphery defender-brittleness consumer (Consumer-1, in
 * combat_math.ts) and confines decay onset to the post-Storm Krajina-collapse
 * subject so the mechanic stays the canonical VRS-2KK-collapse representation.
 *
 * CANONICAL OWNERSHIP: this module owns the `coordination_coherence` derivation.
 * Do not write `formation.coordination_coherence` elsewhere; call
 * `updateCoordinationCoherence()` or `computeCoordinationCoherence()`.
 *
 * Determinism: sorted iteration, fraction math only, no randomness, no
 * timestamps. Mirrors strategic_depth.ts discipline exactly.
 */

import type {
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getActiveEquipmentQualityMultiplier } from '../events/active_modifiers.js';
import {
    KRAJINA_COLLAPSE_CORPS,
    getStrategicDepth,
} from './strategic_depth.js';

/**
 * Coherence floor. A corps never fragments to zero coordination; even a
 * collapsing corps retains a residual command structure.
 */
const COHERENCE_FLOOR = 0.1;

/**
 * Weight of the strategic-depth component in the post-onset coherence value.
 * Lower depth (lost rear cushion / frontage overstretch) → lower coherence.
 */
const DEPTH_WEIGHT = 0.6;

/**
 * Weight of the NATO-C2 (equipment-quality suppression) component. The
 * Deliberate Force air campaign degraded VRS command-and-control; the same
 * suppression multiplier that erodes equipment quality erodes coordination.
 */
const C2_WEIGHT = 0.4;

/**
 * Return coordination_coherence for a corps formation. Default 1.0 if absent.
 * Canonical read accessor — use it instead of reading the raw field directly
 * so the default semantics stay in one place.
 */
export function getCoordinationCoherence(corps: FormationState | undefined | null): number {
    if (!corps) return 1.0;
    const v = corps.coordination_coherence;
    if (typeof v !== 'number' || !Number.isFinite(v)) return 1.0;
    return v;
}

/**
 * Compute coordination_coherence for one corps from current state.
 *
 * Returns 1.0 (byte-stable historical path; no consumer fires) unless:
 *   - operation_storm_triggered is true in state.meta, AND
 *   - the corps belongs to KRAJINA_COLLAPSE_CORPS.
 *
 * Once both gates hold, coherence is a depth+C2 blend clamped to
 * [COHERENCE_FLOOR, 1.0]. Faction-symmetric in shape (corps-id gate, not a
 * faction predicate); only RS corps with the historical Krajina geography are
 * listed. Pure: reads meta flag + strategic_depth + equipment-quality
 * suppression, mutates nothing.
 */
export function computeCoordinationCoherence(state: GameState, corpsId: FormationId): number {
    const corps = state.military.formations?.[corpsId];
    if (!corps) return 1.0;
    if (corps.kind !== 'corps' && corps.kind !== 'corps_asset') return 1.0;

    // Onset gate: pre-Storm everything is fully coherent (byte-stable).
    if (state.meta?.operation_storm_triggered !== true) return 1.0;
    // Subject gate: only the canonical post-Storm Krajina-collapse corps decay.
    if (!KRAJINA_COLLAPSE_CORPS.has(corpsId)) return 1.0;

    // Depth component: strategic_depth in [0.1,1.0]. Lower depth (lost SVK
    // buffer + frontage overstretch) → lower coherence.
    const depth = getStrategicDepth(corps);

    // C2 component: equipment-quality suppression (NATO Deliberate Force).
    // Returns 1.0 when no suppression active; <1.0 (e.g. 0.70) during the
    // air-campaign window. Clamp to [0,1] defensively.
    const c2 = Math.max(0, Math.min(1.0, getActiveEquipmentQualityMultiplier(
        state, corps.faction, state.meta.turn ?? 0,
    )));

    const blended = DEPTH_WEIGHT * depth + C2_WEIGHT * c2;
    return Math.max(COHERENCE_FLOOR, Math.min(1.0, blended));
}

/**
 * Recompute coordination_coherence for every corps formation each turn.
 * Deterministic: corps iterated in sorted id order. Mutates
 * `formation.coordination_coherence` on every corps formation.
 */
export function updateCoordinationCoherence(state: GameState): void {
    const formations = state.military.formations;
    if (!formations) return;

    const corpsIds = Object.keys(formations).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const f = formations[corpsId];
        if (!f || (f.kind !== 'corps' && f.kind !== 'corps_asset')) continue;
        f.coordination_coherence = computeCoordinationCoherence(state, corpsId as FormationId);
    }
}

/**
 * Initial population for scenario init: compute coordination_coherence for
 * every corps at scenario load. Identical semantics to
 * `updateCoordinationCoherence`; named separately so callers can document
 * intent at the init site without duplicating logic.
 */
export function initCoordinationCoherence(state: GameState): void {
    updateCoordinationCoherence(state);
}
