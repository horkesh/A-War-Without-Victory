/**
 * v0.4.1 Unified Event Effect System: apply mechanical effects to GameState.
 * Deterministic: effects sorted by kind before application; no timestamps or randomness.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { EventEffect } from './event_types.js';

/** Deterministic kind ordering for effect application. */
const EFFECT_KIND_ORDER: Record<string, number> = {
    aggression_modifier: 0,
    alliance_change: 1,
    cohesion_change: 2,
    control_change: 3,
    equipment_grant: 4,
    humanitarian_impact: 5,
    morale_change: 6,
    narrative: 7,
    negotiation_capital: 8,
    patron_pressure: 9,
    supply_delta: 10,
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
            applyNegotiationBreakdown(state, effect.faction, effect.dimension, effect.delta);
            break;
        case 'equipment_grant':
            applyEquipmentGrant(state, effect.faction, effect.tanks, effect.artillery, effect.aa_systems, effect.target_municipality);
            break;
        case 'aggression_modifier':
            applyAggressionModifier(state, effect.faction, effect.delta, effect.duration_turns);
            break;
        case 'control_change':
            applyControlChange(state, effect.faction, effect.osids);
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

/** Grant equipment to a faction's best-equipped brigade (or one in target municipality).
 *  Equipment starts degraded (battlefield recovery / barracks seizure condition). */
function applyEquipmentGrant(
    state: GameState,
    faction: FactionId,
    tanks?: number,
    artillery?: number,
    aa_systems?: number,
    target_municipality?: string
): void {
    const formations = state.military.formations;
    const formationIds = Object.keys(formations).sort();

    // Find best recipient: prefer brigade in target municipality, else best-equipped
    let bestId: string | null = null;
    let bestScore = -1;

    for (const fid of formationIds) {
        const f = formations[fid];
        if (!f || f.status !== 'active' || f.faction !== faction) continue;
        if (f.kind !== 'brigade' && f.kind !== 'og') continue;
        if (!f.composition) continue;

        const munMatch = target_municipality && f.location_osid?.includes(`:${target_municipality}:`) ? 1000 : 0;
        const score = munMatch + (f.composition.tanks ?? 0) + (f.composition.artillery ?? 0);
        if (score > bestScore) { bestScore = score; bestId = fid; }
    }

    if (!bestId || !formations[bestId]?.composition) return;
    const comp = formations[bestId].composition!;

    if (tanks && tanks > 0) {
        const oldCount = comp.tanks;
        comp.tanks += tanks;
        // Seized equipment: 70% operational (barracks storage, some neglected)
        const frac = tanks / Math.max(1, comp.tanks);
        comp.tank_condition.operational = comp.tank_condition.operational * (1 - frac) + 0.7 * frac;
        comp.tank_condition.degraded = comp.tank_condition.degraded * (1 - frac) + 0.2 * frac;
        comp.tank_condition.non_operational = Math.max(0, 1 - comp.tank_condition.operational - comp.tank_condition.degraded);
    }
    if (artillery && artillery > 0) {
        comp.artillery += artillery;
        const frac = artillery / Math.max(1, comp.artillery);
        comp.artillery_condition.operational = comp.artillery_condition.operational * (1 - frac) + 0.7 * frac;
        comp.artillery_condition.degraded = comp.artillery_condition.degraded * (1 - frac) + 0.2 * frac;
        comp.artillery_condition.non_operational = Math.max(0, 1 - comp.artillery_condition.operational - comp.artillery_condition.degraded);
    }
    if (aa_systems && aa_systems > 0) {
        comp.aa_systems = (comp.aa_systems ?? 0) + aa_systems;
    }
}

/** Apply a temporary aggression modifier to a faction. Stored on state for consumption by bot AI. */
function applyAggressionModifier(
    state: GameState,
    faction: FactionId,
    delta: number,
    durationTurns: number
): void {
    if (!state.military.event_aggression_modifiers) {
        state.military.event_aggression_modifiers = [];
    }
    const mods = state.military.event_aggression_modifiers;
    const currentTurn = state.meta.turn ?? 0;
    mods.push({ faction, delta, expires_turn: currentTurn + durationTurns });
}

/** Flip OSID control to a faction. Used for barracks seizures, territorial events. */
function applyControlChange(state: GameState, faction: FactionId, osids: string[]): void {
    const pc = state.political.political_controllers ??= {};
    for (const osid of osids) {
        pc[osid] = faction;
    }
}

/** Adjust a specific negotiation capital dimension for a faction. */
function applyNegotiationBreakdown(
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
