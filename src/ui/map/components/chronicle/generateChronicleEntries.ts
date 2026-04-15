export type ChronicleCardType = 'combat' | 'political' | 'humanitarian' | 'military' | 'diplomatic' | 'narrative';

export interface ChronicleEntry {
    turn: number;
    type: ChronicleCardType;
    headline: boolean;
    ghost?: boolean;
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

import {
    getPlayerSafeDisplayLabel,
    getPlayerSafeMilitaryFactionName,
    getPlayerSafeSettlementName,
} from '../../utils/playerSafeText.js';

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

function buildEndgameComparisonEntries(state: any): ChronicleEntry[] {
    if (!state?.gameOver || !state?.historicalComparison) return [];

    const comparison = state.historicalComparison as {
        divergence_notes?: string[];
        rupture_divergence?: string[];
    };
    const rawNotes = Array.isArray(comparison.divergence_notes)
        ? comparison.divergence_notes.filter((note): note is string => typeof note === 'string' && note.trim().length > 0)
        : [];
    const ruptureDivergence = new Set(
        Array.isArray(comparison.rupture_divergence)
            ? comparison.rupture_divergence.filter((id): id is string => typeof id === 'string' && id.length > 0)
            : [],
    );
    const turn = Number(state.turn ?? 0);

    if (rawNotes.length === 0 && ruptureDivergence.size > 0) {
        return [];
    }

    const entries: ChronicleEntry[] = [];
    const nonGhostNotes = rawNotes.filter((note) => note !== 'Srebrenica enclave survived');
    const ghostSrebrenica = !ruptureDivergence.has('srebrenica_genocide_1995');
    const visibleComparisons = nonGhostNotes.length + (ghostSrebrenica ? 1 : 0);

    entries.push({
        turn,
        type: 'narrative',
        headline: true,
        title: 'History kept its own ledger',
        detail: visibleComparisons > 0
            ? `${visibleComparisons} divergence ${visibleComparisons === 1 ? 'note' : 'notes'} marked against the historical war`
            : 'No divergence notes were recorded against the historical war',
    });

    for (const note of nonGhostNotes) {
        entries.push({
            turn,
            type: 'narrative',
            headline: false,
            title: 'Historical divergence',
            detail: note,
        });
    }

    if (ghostSrebrenica) {
        entries.push({
            turn,
            type: 'narrative',
            headline: false,
            ghost: true,
            title: 'Historical rupture absent',
            detail: 'Srebrenica enclave survived in your war; the historical July 1995 catastrophe never arrived.',
        });
    }

    return entries;
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

                const location = getPlayerSafeSettlementName(battle.osid || '', 'this position');
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
                    title: `${getPlayerSafeDisplayLabel(spawn.formation_name || spawn.formation_id, 'Formation')} formed`,
                    detail: spawn.faction ? getPlayerSafeMilitaryFactionName(spawn.faction) : '',
                });
            }
        }

        if (Array.isArray(summary.formation_destructions)) {
            for (const destruction of summary.formation_destructions) {
                entries.push({
                    turn,
                    type: 'military',
                    headline: true,
                    title: `${getPlayerSafeDisplayLabel(destruction.formation_name || destruction.formation_id, 'Formation')} destroyed`,
                    detail: destruction.faction ? getPlayerSafeMilitaryFactionName(destruction.faction) : '',
                });
            }
        }

        if (Array.isArray(summary.notable_events)) {
            for (const event of summary.notable_events) {
                entries.push({
                    turn,
                    type: 'narrative',
                    headline: false,
                    title: getPlayerSafeDisplayLabel(event.text || event.id, 'Notable event'),
                    detail: '',
                });
            }
        }
    }

    entries.push(...buildEndgameComparisonEntries(state));
    entries.sort((a, b) => a.turn - b.turn);
    return entries;
}
