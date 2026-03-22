export type ChronicleCardType = 'combat' | 'political' | 'humanitarian' | 'military' | 'diplomatic' | 'narrative';

export interface ChronicleEntry {
    turn: number;
    type: ChronicleCardType;
    headline: boolean;
    title: string;
    detail: string;
    metadata?: {
        corpsId?: string;
        osid?: string;
        operationName?: string;
        dimensionShifts?: Array<{ dimension: string; delta: number }>;
        casualties?: number;
        displaced?: number;
    };
}

import { humanizeOsid } from '../../utils/osidDisplayName.js';

const HEADLINE_EVENT_PATTERNS = ['strategic_goals', 'state_identity', 'political_goal'];
const DIPLOMATIC_EVENT_PATTERNS = ['graz', 'ceasefire', 'alliance', 'embargo', 'conference'];
const CASUALTY_THRESHOLD = 100;
const DISPLACEMENT_THRESHOLD = 500;

function formatOutcome(outcome: string): string {
    return outcome.replace(/_/g, ' ');
}

function isDiplomaticEvent(id: string): boolean {
    return DIPLOMATIC_EVENT_PATTERNS.some(p => id.includes(p));
}

function isHeadlineEvent(id: string): boolean {
    return HEADLINE_EVENT_PATTERNS.some(p => id.includes(p));
}

export function generateChronicleEntries(state: any): ChronicleEntry[] {
    if (!state || !state.turnSummaries || !Array.isArray(state.turnSummaries)) {
        return [];
    }

    const entries: ChronicleEntry[] = [];

    for (const summary of state.turnSummaries) {
        const turn = summary.turn;

        if (Array.isArray(summary.battles)) {
            for (const battle of summary.battles) {
                const totalCasualties = (battle.attacker_casualties || 0) + (battle.defender_casualties || 0);
                if (!battle.territory_flipped && totalCasualties <= CASUALTY_THRESHOLD) continue;

                const location = humanizeOsid(battle.osid || '');
                entries.push({
                    turn,
                    type: 'combat',
                    headline: battle.territory_flipped === true,
                    title: `Battle of ${location}`,
                    detail: `${formatOutcome(battle.outcome || 'unknown')} — ${totalCasualties} casualties`,
                    metadata: {
                        osid: battle.osid,
                        casualties: totalCasualties,
                    },
                });
            }
        }

        if (Array.isArray(summary.events_fired)) {
            for (const event of summary.events_fired) {
                const id = event.id || '';
                const title = event.text || event.id || 'Unknown event';

                if (isDiplomaticEvent(id)) {
                    entries.push({
                        turn,
                        type: 'diplomatic',
                        headline: true,
                        title,
                        detail: '',
                    });
                } else {
                    entries.push({
                        turn,
                        type: 'political',
                        headline: isHeadlineEvent(id),
                        title,
                        detail: '',
                    });
                }
            }
        }

        if (summary.displacement_total > DISPLACEMENT_THRESHOLD) {
            const ethnicBreakdown = summary.displacement_by_ethnicity || {};
            const detail = Object.entries(ethnicBreakdown)
                .map(([eth, count]) => `${eth}: ${count}`)
                .join(', ');
            entries.push({
                turn,
                type: 'humanitarian',
                headline: summary.displacement_total > 5000,
                title: 'Displacement wave',
                detail: `${summary.displacement_total} displaced${detail ? ` (${detail})` : ''}`,
                metadata: {
                    displaced: summary.displacement_total,
                },
            });
        }

        if (Array.isArray(summary.formation_spawns)) {
            for (const spawn of summary.formation_spawns) {
                entries.push({
                    turn,
                    type: 'military',
                    headline: false,
                    title: `${spawn.name || spawn.id} formed`,
                    detail: spawn.faction || '',
                });
            }
        }

        if (Array.isArray(summary.formation_destructions)) {
            for (const destruction of summary.formation_destructions) {
                entries.push({
                    turn,
                    type: 'military',
                    headline: true,
                    title: `${destruction.name || destruction.id} destroyed`,
                    detail: destruction.faction || '',
                });
            }
        }

        if (Array.isArray(summary.notable_events)) {
            for (const event of summary.notable_events) {
                entries.push({
                    turn,
                    type: 'narrative',
                    headline: false,
                    title: event.text || event.id || 'Notable event',
                    detail: '',
                });
            }
        }
    }

    entries.sort((a, b) => a.turn - b.turn);
    return entries;
}
