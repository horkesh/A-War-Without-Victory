/**
 * Who is shown an event's acknowledgement notice (read-model only; the engine ignores it).
 *
 * Every fired non-decision event used to reach every player, so an RBiH President read RS and HRHB private business: orders,
 * patron arms manifests, back channels, recruitment, cadre quality (owner ruling 2026-11-17, notice-leak count). This module
 * is the ONE gate. Rule, reviewed by the Historian and Narrative seats:
 *
 *   1. An event's authored `audience` (`'all'` or a faction list) wins.
 *   2. Otherwise a `csq_*` consequence notice whose effect names exactly one faction, or, when its effects name none, whose
 *      trigger names exactly one faction, is private to that faction.
 *   3. Everything else is shown to all.
 *
 * A player's own decisions are never gated here (a decision is already the player's own); a run with no player faction (dev map
 * inspection) shows everything. Default direction is privacy: an authored `audience` is added only where the Historian rules a
 * keyed notice public, or a notice belongs to both sides of an agreement (SHDG §6 record of 2026-11-17).
 */

import type { FactionId } from '../../../state/game_state.js';
import war1992Events from '../../../../data/scenarios/events/war_1992.json';
import war1992HrhbSummerEvents from '../../../../data/scenarios/events/war_1992_hrhb_summer.json';
import war1993Events from '../../../../data/scenarios/events/war_1993.json';
import war1994Events from '../../../../data/scenarios/events/war_1994.json';
import war1995Events from '../../../../data/scenarios/events/war_1995.json';
import consequenceEvents from '../../../../data/scenarios/events/consequences.json';

export type EventAudience = 'all' | readonly FactionId[];

const FACTIONS: readonly FactionId[] = ['RBiH', 'RS', 'HRHB'];
const FACTION_KEYS: ReadonlySet<string> = new Set(['faction', 'actor_faction', 'respondent']);

interface AudienceSource {
    id?: unknown;
    audience?: unknown;
    effect?: unknown;
    effects?: unknown;
    trigger?: unknown;
}

function isFaction(value: unknown): value is FactionId {
    return typeof value === 'string' && (FACTIONS as readonly string[]).includes(value);
}

function collectEffectFactions(value: unknown, out: Set<FactionId>): void {
    if (Array.isArray(value)) {
        for (const item of value) collectEffectFactions(item, out);
        return;
    }
    if (value && typeof value === 'object') {
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            if (FACTION_KEYS.has(key) && isFaction(item)) out.add(item);
            collectEffectFactions(item, out);
        }
    }
}

function triggerFactions(trigger: unknown): Set<FactionId> {
    const out = new Set<FactionId>();
    const condition = trigger && typeof trigger === 'object' ? (trigger as { condition?: unknown }).condition : undefined;
    if (condition === undefined) return out;
    collectEffectFactions(condition, out);
    // Flags and predicates name a faction by prefix ("rs_...") or as a quoted literal ("RS").
    const text = JSON.stringify(condition);
    for (const faction of FACTIONS) {
        if (text.includes(`"${faction.toLowerCase()}_`) || text.includes(`"${faction}"`)) out.add(faction);
    }
    return out;
}

/** The audience of one event definition (authored `audience`, else the csq_* rule, else all). */
export function resolveEventAudience(def: AudienceSource): EventAudience {
    const authored = def.audience;
    if (authored === 'all') return 'all';
    if (Array.isArray(authored) && authored.length > 0 && authored.every(isFaction)) return authored as FactionId[];
    if (typeof def.id !== 'string' || !def.id.startsWith('csq_')) return 'all';
    const effectFactions = new Set<FactionId>();
    collectEffectFactions([def.effect, ...(Array.isArray(def.effects) ? def.effects : [])], effectFactions);
    if (effectFactions.size === 1) return [...effectFactions];
    if (effectFactions.size > 1) return 'all';
    const keyed = triggerFactions(def.trigger);
    return keyed.size === 1 ? [...keyed] : 'all';
}

function buildAudienceIndex(catalogs: ReadonlyArray<unknown>): ReadonlyMap<string, EventAudience> {
    const out = new Map<string, EventAudience>();
    for (const catalog of catalogs) {
        if (!Array.isArray(catalog)) continue;
        for (const row of catalog as AudienceSource[]) {
            const id = typeof row?.id === 'string' ? row.id.trim() : '';
            if (!id || out.has(id)) continue;
            out.set(id, resolveEventAudience(row));
        }
    }
    return out;
}

const AUDIENCE_BY_EVENT_ID: ReadonlyMap<string, EventAudience> = buildAudienceIndex([
    war1992Events,
    war1992HrhbSummerEvents,
    war1993Events,
    war1994Events,
    war1995Events,
    consequenceEvents,
]);

/** The resolved audience of a bundled event id ('all' for an unknown id). */
export function eventAudienceFor(eventId: string): EventAudience {
    return AUDIENCE_BY_EVENT_ID.get(eventId) ?? 'all';
}

/** Whether `playerFaction` is shown the notice for `eventId`. No player faction: shown (nothing to hide from). */
export function isEventNoticeVisibleTo(eventId: string, playerFaction: string | null | undefined): boolean {
    if (!playerFaction) return true;
    const audience = eventAudienceFor(eventId);
    return audience === 'all' || (audience as readonly string[]).includes(playerFaction);
}

/** The entries of a fired-event list that `playerFaction` may see (entries without a string id are kept). */
export function filterEventNoticesFor<T extends { id?: unknown }>(entries: readonly T[], playerFaction: string | null | undefined): T[] {
    return entries.filter((entry) => typeof entry?.id !== 'string' || isEventNoticeVisibleTo(entry.id, playerFaction));
}
