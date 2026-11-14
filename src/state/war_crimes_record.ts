import type { FactionId, GameState } from './game_state.js';

/**
 * Record one authorized war-crime event on a faction's negotiation capital.
 *
 * Increments `war_crimes_events` and the EMERGENT-only counter
 * `war_crimes_events_emergent`. This is the sole writer of the emergent counter, which
 * feeds the §2a `authorized_cleansing_condemnation` flag (SENSITIVE_HISTORY_DESIGN_GATE.md
 * §2a(ii)(a)). Scripted `humanitarian_impact` effects deliberately do NOT call this, so
 * the counter stays free of calendar-driven contamination.
 *
 * Callers (each an authorized act, never a scripted calendar event):
 * - `paramilitary_sweep.ts`: every resolved paramilitary capture;
 * - `displacement_takeover.ts`: the first wave of a faction's recorded minority
 *   expulsion policy (RF-5B), once per faction.
 */
export function recordWarCrime(state: GameState, faction: FactionId): void {
    const neg = state.military.negotiation;
    if (!neg?.capital?.[faction]) return;
    neg.capital[faction].war_crimes_events = (neg.capital[faction].war_crimes_events ?? 0) + 1;
    neg.capital[faction].war_crimes_events_emergent = (neg.capital[faction].war_crimes_events_emergent ?? 0) + 1;
}
