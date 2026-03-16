/**
 * v0.4.1 Unified Event Effect System: apply mechanical effects to GameState.
 * Deterministic: effects sorted by kind before application; no timestamps or randomness.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { NegotiationCapital } from '../../state/negotiation_types.js';
import type { EventEffect } from './event_types.js';

/** Deterministic kind ordering for effect application. */
const EFFECT_KIND_ORDER: Record<string, number> = {
    alliance_change: 0,
    cohesion_change: 1,
    humanitarian_impact: 2,
    morale_change: 3,
    narrative: 4,
    negotiation_capital: 5,
    patron_pressure: 6,
    supply_delta: 7,
};

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Apply event effects to GameState. Effects are sorted by kind for determinism.
 * Mutates state in place.
 */
export function applyEventEffects(state: GameState, effects: EventEffect[]): void {
    if (effects.length === 0) return;

    // Sort by kind for deterministic application order
    const sorted = [...effects].sort((a, b) => {
        const oa = EFFECT_KIND_ORDER[a.kind] ?? 99;
        const ob = EFFECT_KIND_ORDER[b.kind] ?? 99;
        return oa - ob;
    });

    for (const effect of sorted) {
        applySingleEffect(state, effect);
    }
}

function applySingleEffect(state: GameState, effect: EventEffect): void {
    switch (effect.kind) {
        case 'morale_change':
            applyMoraleChange(state, effect.faction, effect.delta);
            break;
        case 'supply_delta':
            applySupplyDelta(state, effect.faction, effect.delta);
            break;
        case 'cohesion_change':
            applyCohesionChange(state, effect.faction, effect.delta);
            break;
        case 'humanitarian_impact':
            applyHumanitarianImpact(state, effect.faction, effect.war_crimes_delta);
            break;
        case 'patron_pressure':
            applyPatronPressure(state, effect.faction, effect.delta);
            break;
        case 'alliance_change':
            applyAllianceChange(state, effect.delta);
            break;
        case 'negotiation_capital':
            applyNegotiationCapital(state, effect.faction, effect.dimension, effect.delta);
            break;
        case 'narrative':
            // No mechanical effect; narrative text is logged via FiredEvent.
            break;
    }
}

/** Apply morale delta to all active brigades of the given faction. Clamped [0, 100]. */
function applyMoraleChange(state: GameState, faction: FactionId, delta: number): void {
    const formations = state.military.formations;
    for (const fid of Object.keys(formations).sort()) {
        const f = formations[fid];
        if (f.faction === faction && f.status === 'active' && f.morale != null) {
            f.morale = clamp(f.morale + delta, 0, 100);
        }
    }
}

/** Apply cohesion delta to all active brigades of the given faction. Clamped [0, 100]. */
function applyCohesionChange(state: GameState, faction: FactionId, delta: number): void {
    const formations = state.military.formations;
    for (const fid of Object.keys(formations).sort()) {
        const f = formations[fid];
        if (f.faction === faction && f.status === 'active' && f.cohesion != null) {
            f.cohesion = clamp(f.cohesion + delta, 0, 100);
        }
    }
}

/** Add delta to faction's general supply reserve. Floor at 0. */
function applySupplyDelta(state: GameState, faction: FactionId, delta: number): void {
    if (!state.military.general_supply_reserve) return;
    const current = state.military.general_supply_reserve[faction] ?? 0;
    state.military.general_supply_reserve[faction] = Math.max(0, current + delta);
}

/** Adjust war_crimes_events in faction's negotiation capital. */
function applyHumanitarianImpact(state: GameState, faction: FactionId, warCrimesDelta?: number): void {
    if (warCrimesDelta == null) return;
    const neg = state.military.negotiation;
    if (!neg?.capital?.[faction]) return;
    const cap = neg.capital[faction];
    cap.war_crimes_events = (cap.war_crimes_events ?? 0) + warCrimesDelta;
}

/** Adjust patron support_level for faction's patron relationship. */
function applyPatronPressure(state: GameState, faction: FactionId, delta: number): void {
    const neg = state.military.negotiation;
    if (!neg?.patron_relationships?.[faction]) return;
    const rel = neg.patron_relationships[faction];
    rel.support_level = clamp(rel.support_level + delta, 0, 100);
}

/** Adjust RBiH-HRHB alliance value. Clamped [-1, 1]. */
function applyAllianceChange(state: GameState, delta: number): void {
    const current = state.political.war_alliance_rbih_hrhb ?? 0;
    state.political.war_alliance_rbih_hrhb = clamp(current + delta, -1, 1);
}

/** Adjust a specific negotiation capital dimension for a faction. */
function applyNegotiationCapital(
    state: GameState,
    faction: FactionId,
    dimension: string,
    delta: number
): void {
    const neg = state.military.negotiation;
    if (!neg?.capital?.[faction]) return;
    const cap = neg.capital[faction] as unknown as Record<string, number>;
    if (dimension in cap) {
        cap[dimension] = (cap[dimension] ?? 0) + delta;
    }
}
