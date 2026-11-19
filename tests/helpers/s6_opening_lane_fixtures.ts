/**
 * Save-shape fixtures for the §6 opening-card timing change (design T, 2026-11-19).
 *
 * A build before T fired the RBiH identity card and the RS goals card at campaign birth
 * (`preFiresOpeningDecisionAtBirth` returned true for them) and applied their definition-level
 * effects then. `asPreTBirthSave` rewrites a current t0 campaign into that shape, so the old-lane
 * tests run on the saves an older build actually wrote.
 */

import { deserializeState, serializeState, startNewCampaign } from '../../src/desktop/desktop_sim.js';
import { applyEventEffects } from '../../src/sim/events/apply_effects.js';
import { applyDefinitionDimensionShifts, applyDefinitionFlags } from '../../src/sim/events/evaluate_events.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import type { GameState } from '../../src/state/game_state.js';
import war1992Events from '../../data/scenarios/events/war_1992.json';

export const EVENT_CATALOG = war1992Events as EventDefinition[];
export const IDENTITY = 'rbih_state_identity';
export const RS_GOALS = 'rs_strategic_goals';
export const HRHB_GOAL = 'hrhb_political_goal';
export const RBIH_POLICY = 'rbih_paramilitary_policy_1992';
export const RS_POLICY = 'rs_paramilitary_policy_1992';

export function eventDef(id: string): EventDefinition {
    const def = EVENT_CATALOG.find((entry) => entry.id === id);
    if (!def) throw new Error(`missing event ${id}`);
    return def;
}

export function cloneState(state: GameState): GameState {
    return deserializeState(serializeState(state));
}

export async function newCampaign(faction: 'RBiH' | 'RS' | 'HRHB'): Promise<GameState> {
    return (await startNewCampaign(process.cwd(), faction, 'apr_1992', 'historical')).state;
}

/** The t0 save a build before T wrote: the player's opening card FIRED at birth, its card still pending. */
export function asPreTBirthSave(state: GameState): GameState {
    const copy = cloneState(state);
    const eventId = copy.meta.player_faction === 'RBiH' ? IDENTITY : copy.meta.player_faction === 'RS' ? RS_GOALS : null;
    if (!eventId) throw new Error('Only the RBiH and RS opening cards were fired at birth before T');
    if (!(copy.military.pending_event_decisions ?? []).some((decision) => decision.event_id === eventId)) {
        throw new Error(`${eventId} is not on the desk`);
    }
    const def = eventDef(eventId);
    applyEventEffects(copy, [def.effect, ...(def.effects ?? [])]);
    applyDefinitionDimensionShifts(copy, def.dimension_shifts);
    applyDefinitionFlags(copy, def.sets_flags);
    if (!copy.military.fired_event_ids.includes(eventId)) copy.military.fired_event_ids.push(eventId);
    copy.military.event_fire_counts[eventId] = 1;
    copy.military.event_last_fired_turn[eventId] = 0;
    copy.military.event_readiness[eventId] = 0;
    return cloneState(copy);
}

export function dimensions(state: GameState): unknown {
    return JSON.parse(JSON.stringify(state.military.negotiation?.strategic_dimensions ?? {}));
}
