/**
 * Phase D Step 5: Exhaustion accumulation for Phase II (Mid-War).
 * Exhaustion is irreversible (Engine Invariants §8); degrades effectiveness; does not flip control.
 */

import { EXHAUSTION_LEGITIMACY_MULTIPLIER } from '../../state/exhaustion.js';
import type { FactionId, GameState, PhaseIIFrontDescriptor } from '../../state/game_state.js';
import { getFactionLegitimacyAverages } from '../../state/legitimacy.js';
import { getExhaustionExternalModifier } from '../../state/patron_pressure.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Exhaustion per static front (Engine Invariants §6, §8). */
const EXHAUSTION_PER_STATIC_FRONT = 2;

/** Exhaustion per point of supply pressure (0–100). */
const EXHAUSTION_PER_SUPPLY_PRESSURE_POINT = 0.1;

/** Cap exhaustion delta per turn per faction (bounded growth). */
const MAX_DELTA_PER_TURN = 10;

/**
 * Update phase_ii_exhaustion from static fronts and supply pressure.
 * Only runs when meta.phase === 'phase_ii'.
 * Exhaustion is monotonic (never decreased) — Engine Invariants §8.
 * Does not modify political_controllers.
 * When frictionMultipliers is provided (Phase D0.9), exhaustion delta is scaled by multiplier
 * so that higher command friction (higher multiplier) increases effective exhaustion growth.
 */
export function updatePhaseIIExhaustion(
    state: GameState,
    fronts: PhaseIIFrontDescriptor[] = [],
    frictionMultipliers?: Record<FactionId, number>
): void {
    if (state.meta.phase !== 'phase_ii') {
        return;
    }

    const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare);
    const staticFrontCount = fronts.filter((f) => f.stability === 'static').length;
    const supplyPressure = state.phase_ii_supply_pressure ?? {};
    const legitimacyByFaction = getFactionLegitimacyAverages(state);
    const sarajevo = state.sarajevo_state;

    if (!state.phase_ii_exhaustion) {
        (state as GameState & { phase_ii_exhaustion: Record<FactionId, number> }).phase_ii_exhaustion = {};
    }
    const exhaustion = state.phase_ii_exhaustion!;

    for (const fid of factionIds) {
        const current = typeof exhaustion[fid] === 'number' ? exhaustion[fid]! : 0;
        const supplyContrib = (supplyPressure[fid] ?? 0) * EXHAUSTION_PER_SUPPLY_PRESSURE_POINT;
        const staticContrib = staticFrontCount * EXHAUSTION_PER_STATIC_FRONT;
        const delta = Math.min(MAX_DELTA_PER_TURN, supplyContrib + staticContrib);
        const multiplier = frictionMultipliers?.[fid] ?? 1;
        const faction = state.factions.find((f) => f.id === fid);
        const externalMod = getExhaustionExternalModifier(faction?.patron_state, state.international_visibility_pressure);
        const legitimacy = legitimacyByFaction[fid] ?? 0.5;
        const legitimacyMod = (1 - legitimacy) * EXHAUSTION_LEGITIMACY_MULTIPLIER;
        const sarajevoExtra =
            sarajevo?.siege_status === 'BESIEGED'
                ? fid === 'RBiH'
                    ? 3.0
                    : fid === 'RS'
                        ? 2.0
                        : 0
                : 0;
        const effectiveDelta = Math.min(MAX_DELTA_PER_TURN, delta * multiplier * (1 + externalMod + legitimacyMod) + sarajevoExtra);
        exhaustion[fid] = current + effectiveDelta;
    }
}
