/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Derived read (no state of its own)
 * DOMAIN:    Contact cells for defence fix D3 (relief in place)
 * ═══════════════════════════════════════════════════════════════
 *
 * A contact cell is a cell a faction still controls and was attacked on recently:
 * it appears as `engagement.osid` of a persisted `brigade_history` engagement with
 * role `defender` (seats r2, guard G4). The engagement's cell is used, never the
 * defending brigade's own location: a roster defender can be credited for a battle
 * fought several hops from where it stands.
 *
 * Recency is the commander's own recapture window. Relief applies the turn AFTER the
 * engagement (historian, r2): an engagement recorded this turn is not yet a contact.
 *
 * Friction records from `frontline_attrition.ts` (`battle_id` containing `:friction:`)
 * are attrition at the brigade's own location, not an attack on the cell, so they are
 * not contacts (G4).
 *
 * READS:  formation brigade_history engagements, political_controllers, current turn.
 * WRITES: nothing. No new GameState field.
 *
 * Deterministic: formations are scanned in strictCompare order; the result is a set.
 * ═══════════════════════════════════════════════════════════════
 */

import { strictCompare } from '../../state/validateGameState.js';

/**
 * The commander's recapture window (turns). Shared by `commander/plan.ts`
 * (recent_recapture targets) and the D3 contact-cell recency, so both read the same
 * definition of "recent".
 */
export const RECENT_RECAPTURE_WINDOW_TURNS = 8;

/**
 * Front-donor home-distance bound (hops from `home_osid` to the target cell). Shared by
 * `ensureMinimumSectorCoverage` and the D3 relief donors, which apply the same existing
 * donor guard.
 */
export const FRONT_DONOR_HOME_DISTANCE_MAX_HOPS = 4;

/** Narrow engagement row: the only fields the contact read needs. */
export interface ContactEngagementRow {
    readonly turn: number;
    readonly osid: string;
    readonly role: 'attacker' | 'defender';
    readonly battle_id?: string;
}

/** Narrow formation read for contact cells. `FormationState` satisfies it. */
export interface ContactHistoryFormation {
    readonly faction?: string;
    readonly location_osid?: string;
    readonly brigade_history?: { readonly engagements?: readonly ContactEngagementRow[] };
}

/** Contact OSIDs keyed by the faction that defended (and still holds) them. */
export type ContactOsidsByFaction = ReadonlyMap<string, ReadonlySet<string>>;

const FRICTION_BATTLE_ID_MARKER = ':friction:';

export function isFrictionEngagement(engagement: ContactEngagementRow): boolean {
    return typeof engagement.battle_id === 'string' && engagement.battle_id.includes(FRICTION_BATTLE_ID_MARKER);
}

/**
 * Build the contact cells of every faction at `currentTurn`.
 *
 * A cell is a contact of faction F when a formation of F recorded a defender
 * engagement on it in `[currentTurn - RECENT_RECAPTURE_WINDOW_TURNS, currentTurn - 1]`
 * and F still controls it (G3: own cells only, so a just-lost cell is never a contact).
 * Without a turn or political controllers, there are no contacts.
 */
export function buildContactOsidsByFaction(
    formations: Readonly<Record<string, ContactHistoryFormation | undefined>> | undefined,
    politicalControllers: Readonly<Record<string, string | null | undefined>> | undefined,
    currentTurn: number | undefined,
): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();
    if (!formations || !politicalControllers || typeof currentTurn !== 'number') return result;
    const floor = Math.max(0, currentTurn - RECENT_RECAPTURE_WINDOW_TURNS);
    for (const formationId of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[formationId];
        const faction = formation?.faction;
        const engagements = formation?.brigade_history?.engagements;
        if (!faction || !engagements || engagements.length === 0) continue;
        for (const engagement of engagements) {
            if (engagement.role !== 'defender') continue;
            if (engagement.turn < floor || engagement.turn >= currentTurn) continue;
            if (isFrictionEngagement(engagement)) continue;
            if (politicalControllers[engagement.osid] !== faction) continue;
            let set = result.get(faction);
            if (!set) {
                set = new Set<string>();
                result.set(faction, set);
            }
            set.add(engagement.osid);
        }
    }
    return result;
}

/** True when the formation stands on a contact cell of its own faction. */
export function standsOnContactCell(
    formation: Pick<ContactHistoryFormation, 'faction' | 'location_osid'> | undefined,
    contactByFaction: ContactOsidsByFaction,
): boolean {
    const location = formation?.location_osid;
    const faction = formation?.faction;
    if (!location || !faction) return false;
    return contactByFaction.get(faction)?.has(location) === true;
}
