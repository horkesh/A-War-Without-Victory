/**
 * Phase 0 Headline Template System — generates newspaper headlines from events.
 *
 * Templates are sorted by priority (lower = higher priority).
 * Each template has a trigger condition, faction-specific framing, and variable substitution.
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import type { FactionId, Phase0Event } from '../../../state/game_state.js';

/** A headline template with priority and faction-specific framing. */
export interface HeadlineTemplate {
    /** Numeric priority: lower = more important. */
    priority: number;
    /** Event type that triggers this template. */
    eventType: string;
    /** Check if the event matches this template's trigger condition. */
    matches: (event: Phase0Event) => boolean;
    /** Generate headline text for a specific faction. */
    headline: (event: Phase0Event, playerFaction: FactionId) => string;
    /** Generate subhead text. */
    subhead: (event: Phase0Event, playerFaction: FactionId) => string;
    /** Generate body text. */
    body: (event: Phase0Event, playerFaction: FactionId) => string;
}

/** Urgency level derived from declaration pressure. */
export type UrgencyLevel = 'normal' | 'elevated' | 'high' | 'critical';

/**
 * Get urgency level from max declaration pressure across factions.
 */
export function getUrgencyLevel(maxPressure: number): UrgencyLevel {
    if (maxPressure >= 90) return 'critical';
    if (maxPressure >= 75) return 'high';
    if (maxPressure >= 50) return 'elevated';
    return 'normal';
}

const FACTION_NAMES: Record<string, string> = {
    RS: 'Republika Srpska',
    RBiH: 'Republic of Bosnia and Herzegovina',
    HRHB: 'Croatian Republic of Herceg-Bosna',
};

const FACTION_SHORT: Record<string, string> = {
    RS: 'Serb leadership',
    RBiH: 'Bosnian government',
    HRHB: 'Croat leadership',
};

/**
 * Master list of headline templates sorted by priority.
 */
export const HEADLINE_TEMPLATES: HeadlineTemplate[] = [
    // P0: Declaration events (highest priority)
    {
        priority: 0,
        eventType: 'declaration',
        matches: (e) => e.type === 'declaration' && e.faction === 'RS',
        headline: (_e, pf) => pf === 'RS'
            ? 'REPUBLIKA SRPSKA PROCLAIMED — NEW ERA BEGINS'
            : 'SERB LEADERS DECLARE SEPARATE REPUBLIC',
        subhead: (_e, pf) => pf === 'RS'
            ? 'Assembly unanimously votes for sovereign Serb entity'
            : 'Karadzic announces split from Bosnian state',
        body: (_e, pf) => pf === 'RS'
            ? 'In a historic vote, the Assembly of the Serbian People in Bosnia and Herzegovina has declared the establishment of Republika Srpska as a sovereign entity.'
            : 'Serbian Democratic Party leaders have declared a separate republic within Bosnia-Herzegovina, dramatically escalating the political crisis.',
    },
    {
        priority: 0,
        eventType: 'declaration',
        matches: (e) => e.type === 'declaration' && e.faction === 'HRHB',
        headline: (_e, pf) => pf === 'HRHB'
            ? 'HERCEG-BOSNA COMMUNITY ESTABLISHED'
            : 'CROAT LEADERS DECLARE AUTONOMOUS COMMUNITY',
        subhead: (_e, pf) => pf === 'HRHB'
            ? 'Croatian people in Bosnia organize for collective defense'
            : 'HDZ establishes parallel political structures in Herzegovina',
        body: (_e, pf) => pf === 'HRHB'
            ? 'The Croatian Defence Council has established the Croatian Community of Herceg-Bosna to protect the interests of Croats in Bosnia-Herzegovina.'
            : 'Croatian Democratic Union leaders in Herzegovina have declared an autonomous community, further fragmenting the republic\'s political landscape.',
    },

    // P1: Referendum events
    {
        priority: 1,
        eventType: 'referendum_held',
        matches: (e) => e.type === 'referendum_held',
        headline: (_e, pf) => pf === 'RS'
            ? 'ILLEGAL REFERENDUM HELD — SERBS BOYCOTT'
            : 'INDEPENDENCE REFERENDUM COMPLETED',
        subhead: (_e, pf) => pf === 'RS'
            ? 'Results meaningless without Serbian participation, officials say'
            : 'Overwhelming majority votes for sovereignty',
        body: (_e, pf) => pf === 'RS'
            ? 'The referendum on Bosnian independence proceeded without participation from the Serbian population, who view the vote as unconstitutional.'
            : 'Citizens have voted overwhelmingly for independence from Yugoslavia. International recognition is expected to follow.',
    },
    {
        priority: 2,
        eventType: 'referendum_eligible',
        matches: (e) => e.type === 'referendum_eligible',
        headline: () => 'EC DEMANDS REFERENDUM ON INDEPENDENCE',
        subhead: () => 'European Community sets conditions for recognition',
        body: () => 'The European Community has declared that Bosnia-Herzegovina must hold a referendum on independence as a condition for international recognition.',
    },

    // P3: War countdown
    {
        priority: 3,
        eventType: 'war_countdown',
        matches: (e) => e.type === 'war_countdown',
        headline: (e) => {
            const turns = (e.details as { turnsRemaining?: number }).turnsRemaining ?? 0;
            if (turns <= 2) return 'WAR IMMINENT — LAST CHANCE FOR PEACE';
            return 'COUNTDOWN TO CONFLICT ACCELERATES';
        },
        subhead: (e) => {
            const turns = (e.details as { turnsRemaining?: number }).turnsRemaining ?? 0;
            return `Armed conflict expected within ${turns} weeks`;
        },
        body: () => 'Military preparations are intensifying on all sides as the political situation deteriorates beyond the point of diplomatic resolution.',
    },

    // P4: Stability changes (significant)
    {
        priority: 4,
        eventType: 'stability_change',
        matches: (e) => e.type === 'stability_change' && (e.details as { direction?: string }).direction === 'down',
        headline: (e) => `INSTABILITY GROWS IN ${(e.municipality ?? 'REGION').toUpperCase()}`,
        subhead: (e) => {
            const d = e.details as { oldScore?: number; newScore?: number };
            return `Stability falls from ${d.oldScore ?? '?'} to ${d.newScore ?? '?'}`;
        },
        body: (e) => `Conditions in ${e.municipality ?? 'the region'} continue to deteriorate as political tensions take their toll on local governance.`,
    },
    {
        priority: 4,
        eventType: 'stability_change',
        matches: (e) => e.type === 'stability_change' && (e.details as { direction?: string }).direction === 'up',
        headline: (e) => `STABILITY IMPROVES IN ${(e.municipality ?? 'REGION').toUpperCase()}`,
        subhead: (e) => {
            const d = e.details as { oldScore?: number; newScore?: number };
            return `Score rises from ${d.oldScore ?? '?'} to ${d.newScore ?? '?'}`;
        },
        body: (e) => `Local conditions in ${e.municipality ?? 'the region'} show signs of improvement following organizational efforts.`,
    },

    // P5: Pressure milestones
    {
        priority: 5,
        eventType: 'pressure_milestone',
        matches: (e) => e.type === 'pressure_milestone',
        headline: (e, pf) => {
            const faction = e.faction ?? 'Unknown';
            const milestone = (e.details as { milestone?: number }).milestone ?? 0;
            if (faction === pf) return `POLITICAL PRESSURE REACHES ${milestone}%`;
            return `${FACTION_SHORT[faction]?.toUpperCase() ?? faction} PRESSURE AT ${milestone}%`;
        },
        subhead: (e) => {
            const milestone = (e.details as { milestone?: number }).milestone ?? 0;
            if (milestone >= 75) return 'Declaration appears increasingly likely';
            if (milestone >= 50) return 'Significant political momentum building';
            return 'Political developments accelerating';
        },
        body: (e) => {
            const faction = e.faction ?? 'Unknown';
            return `${FACTION_NAMES[faction] ?? faction} political pressure continues to build as organizational preparations advance.`;
        },
    },

    // P6: Alliance changes
    {
        priority: 6,
        eventType: 'alliance_change',
        matches: (e) => e.type === 'alliance_change',
        headline: (e) => {
            const d = e.details as { relationship?: string; direction?: string };
            const rel = d.relationship === 'rbih_hrhb' ? 'BOSNIAK-CROAT' : 'BOSNIAK-SERB';
            const dir = d.direction === 'improving' ? 'IMPROVES' : 'DETERIORATES';
            return `${rel} RELATIONSHIP ${dir}`;
        },
        subhead: (e) => {
            const d = e.details as { direction?: string };
            return d.direction === 'improving'
                ? 'Coordination between leaders shows progress'
                : 'Growing strain between political leadership';
        },
        body: (e) => {
            const d = e.details as { relationship?: string; direction?: string };
            if (d.relationship === 'rbih_hrhb') {
                return d.direction === 'improving'
                    ? 'Relations between the Bosnian government and Croatian community show signs of cooperation against the common threat.'
                    : 'Unilateral actions are straining the fragile Bosniak-Croat partnership.';
            }
            return d.direction === 'improving'
                ? 'Diplomatic channels between Sarajevo and Serbian leaders remain open.'
                : 'Relations between the Bosnian government and Serbian leadership continue to worsen.';
        },
    },
];

/**
 * Pick the highest-priority headline template matching any event in the array.
 * Returns the matched template and event, or null if no match.
 */
export function pickBestHeadline(
    events: Phase0Event[]
): { template: HeadlineTemplate; event: Phase0Event } | null {
    let best: { template: HeadlineTemplate; event: Phase0Event } | null = null;

    for (const event of events) {
        for (const template of HEADLINE_TEMPLATES) {
            if (template.matches(event)) {
                if (!best || template.priority < best.template.priority) {
                    best = { template, event };
                }
                break; // First matching template per event (templates already sorted by priority)
            }
        }
    }

    return best;
}

/**
 * Generate a fallback headline when no events match any template.
 */
export function fallbackHeadline(turn: number, playerFaction: FactionId): {
    headline: string;
    subhead: string;
    body: string;
} {
    if (turn === 0) {
        return {
            headline: playerFaction === 'RS'
                ? 'SERBIAN PEOPLE STAND VIGILANT'
                : playerFaction === 'HRHB'
                    ? 'CROATIAN COMMUNITY ORGANIZES'
                    : 'TENSIONS RISE IN YUGOSLAVIA',
            subhead: 'Republic faces uncertain future as federation dissolves',
            body: 'The political situation across the region continues to develop rapidly. Leaders from all sides are meeting to discuss the future of the republic. International observers are monitoring the situation closely.',
        };
    }

    return {
        headline: `WEEK ${turn}: POLITICAL SITUATION REMAINS FLUID`,
        subhead: 'All sides continue preparations amid growing uncertainty',
        body: 'Diplomatic efforts continue as the political landscape shifts. Local authorities report increasing organizational activity across the republic.',
    };
}
