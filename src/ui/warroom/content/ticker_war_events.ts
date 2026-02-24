/**
 * Convert TurnEvents to short ticker strings for the radio news ticker.
 *
 * Max ~5 events per turn. Fog-filtered: own events specific, enemy events vague.
 *
 * Returns strings like:
 * - "OUR FORCES RECAPTURE [settlement]"
 * - "ENEMY ADVANCE REPORTED IN SECTOR [settlement]"
 * - "HEAVY CASUALTIES IN FIGHTING NEAR [settlement]"
 * - "POPULATION DISPLACEMENT IN [municipality]"
 * - "SUPPLY DISRUPTION IN [municipality]"
 * - "CEASEFIRE BETWEEN ALLIED FACTIONS TAKES EFFECT"
 * - "FORCES APPROACHING EXHAUSTION THRESHOLD"
 *
 * No Math.random(), no timestamps. Pure functions only.
 */

import type { FactionId } from '../../../state/game_state.js';
import type { TurnEvent } from '../data/turn_event_generator.js';

/** Maximum number of dynamic war events emitted per turn. */
const MAX_WAR_EVENTS = 5;

/** Maximum character length for a single ticker string. */
const MAX_TICKER_LENGTH = 80;

/**
 * Truncate a string to fit within the ticker length limit.
 * Appends ellipsis if truncated.
 */
function truncate(s: string): string {
    if (s.length <= MAX_TICKER_LENGTH) return s;
    return s.slice(0, MAX_TICKER_LENGTH - 3) + '...';
}

/**
 * Format a settlement ID for display. Strips the "S" prefix and
 * uses the raw ID since we don't have a name lookup in ticker context.
 * Settlement IDs like "S100013" become "SECTOR 100013".
 */
function formatSettlement(sid: string | undefined): string {
    if (!sid) return 'UNKNOWN SECTOR';
    const numeric = sid.startsWith('S') ? sid.slice(1) : sid;
    return `SECTOR ${numeric}`;
}

/**
 * Format a municipality ID for display. Converts kebab-case to title case.
 * "stari-grad" -> "STARI GRAD"
 */
function formatMunicipality(munId: string | undefined): string {
    if (!munId) return 'UNKNOWN AREA';
    return munId.replace(/-/g, ' ').toUpperCase();
}

/**
 * Convert a single TurnEvent to a ticker string based on type,
 * ownership, and fog tier.
 *
 * Returns null if the event should be skipped (e.g. enemy formation created).
 */
function eventToTicker(event: TurnEvent, playerFaction: FactionId): string | null {
    const isOwn = event.faction === playerFaction;
    const details = event.details;

    switch (event.type) {
        case 'control_flip': {
            // Summary event (multiple flips)
            if (details.summary === true) {
                const totalFlips = details.totalFlips as number;
                return truncate(`MAJOR TERRITORIAL CHANGES \u2014 ${totalFlips} SETTLEMENTS IN FLUX`);
            }
            // Own gain
            if (details.isOwnGain) {
                return truncate(`OUR FORCES SECURE ${formatSettlement(event.settlement)}`);
            }
            // Own loss
            if (details.isOwnLoss) {
                return truncate(`ENEMY ADVANCE NEAR ${formatSettlement(event.settlement)} \u2014 SITUATION DEVELOPING`);
            }
            // Other factions fighting each other
            return truncate('TERRITORIAL CHANGES REPORTED ON SECONDARY FRONT');
        }

        case 'battle_casualties': {
            if (isOwn) {
                return truncate('HEAVY FIGHTING \u2014 OUR FORCES ENGAGED');
            }
            // Enemy casualties: tier 1-2 vs tier 3
            if (event.visibility <= 2) {
                return truncate('ENEMY SUFFERS LOSSES IN RECENT ENGAGEMENTS');
            }
            return truncate('REPORTS OF FIGHTING ON ENEMY LINES');
        }

        case 'displacement': {
            const mun = formatMunicipality(event.municipality);
            return truncate(`DISPLACEMENT ALERT \u2014 ${mun} AFFECTED`);
        }

        case 'civilian_casualties': {
            return truncate('CIVILIAN CASUALTIES REPORTED');
        }

        case 'formation_created': {
            if (isOwn) {
                const name = (details.name as string) ?? 'UNKNOWN';
                return truncate(`NEW FORMATION ACTIVATED \u2014 ${name.toUpperCase()}`);
            }
            // Enemy formation created: skip (fog)
            return null;
        }

        case 'alliance_change': {
            return truncate('DIPLOMATIC DEVELOPMENTS \u2014 ALLIANCE STATUS SHIFTING');
        }

        case 'sustainability_collapse': {
            if (isOwn) {
                const mun = formatMunicipality(event.municipality);
                return truncate(`SUPPLY CRISIS \u2014 ${mun} UNDER PRESSURE`);
            }
            return truncate('ENEMY LOGISTICS DISRUPTED');
        }

        case 'exhaustion_milestone': {
            if (isOwn) {
                const milestone = details.milestone as number;
                return truncate(`WARNING \u2014 FORCES APPROACHING ${milestone}% EXHAUSTION`);
            }
            // Enemy exhaustion: skip (fog)
            return null;
        }

        case 'ceasefire_started': {
            return truncate('CEASEFIRE BETWEEN ALLIED FACTIONS TAKES EFFECT');
        }

        case 'washington_signed': {
            return truncate('WASHINGTON AGREEMENT SIGNED \u2014 NEW ERA OF COOPERATION');
        }

        case 'encirclement': {
            if (isOwn) {
                return truncate('ENCIRCLEMENT THREAT \u2014 SUPPLY LINES AT RISK');
            }
            return truncate('ENEMY FORCES REPORTED ENCIRCLED');
        }

        default:
            return null;
    }
}

/**
 * Convert TurnEvents to short ticker strings for the radio news ticker.
 *
 * Events are already sorted by priority from generateTurnEvents().
 * Returns at most MAX_WAR_EVENTS strings. Skips events that produce
 * null (fog-hidden enemy events).
 *
 * Deduplicates identical ticker strings (e.g. multiple "REPORTS OF
 * FIGHTING ON ENEMY LINES" from different factions collapse to one).
 */
export function generateTickerWarEvents(
    events: TurnEvent[],
    playerFaction: FactionId,
): string[] {
    const result: string[] = [];
    const seen = new Set<string>();

    for (const event of events) {
        if (result.length >= MAX_WAR_EVENTS) break;

        const ticker = eventToTicker(event, playerFaction);
        if (ticker === null) continue;

        // Deduplicate identical ticker strings
        if (seen.has(ticker)) continue;
        seen.add(ticker);

        result.push(ticker);
    }

    return result;
}
