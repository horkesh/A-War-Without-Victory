/**
 * War Stories: end-of-game narrative generation for brigades.
 *
 * Each brigade gets classified into a narrative arc based on combat history:
 * - veteran: backbone of the corps (>65% win rate, >60% personnel retained)
 * - bloodied: heavy combat, heavy losses, still fighting
 * - shattered: <50% peak personnel, still in line
 * - risen: rebuilt after destruction (ARBiH arc, >150% cumulative casualties)
 * - destroyed: formation ceased to exist
 * - garrison: ≤2 battles, patience not blood
 *
 * Templates are deterministic — no randomness, no AI.
 */

import type { FormationState, FactionId, GameState } from '../state/game_state.js';
import type { BrigadeHistory } from '../state/brigade_history.js';
import { getDecorationDisplayName, getHighestDecorationTier } from '../state/decoration_types.js';
import { strictCompare } from '../state/validateGameState.js';

/** Narrative arc classification. */
export type NarrativeArc = 'veteran' | 'bloodied' | 'shattered' | 'risen' | 'destroyed' | 'garrison';

/** A single notable moment in a brigade's history. */
export interface NotableMoment {
    turn: number;
    description: string;
}

/** Complete war story for one brigade. */
export interface BrigadeWarStory {
    formation_id: string;
    formation_name: string;
    faction: FactionId;
    corps_id?: string;
    arc: NarrativeArc;
    narrative: string;
    notable_moments: NotableMoment[];
    stats: {
        battles_fought: number;
        victories: number;
        defeats: number;
        total_casualties_taken: number;
        total_casualties_inflicted: number;
        final_personnel: number;
        peak_personnel: number;
        nadir_personnel: number;
    };
}

/**
 * Classify a brigade's narrative arc from its history.
 */
export function classifyArc(
    formation: FormationState,
    history: BrigadeHistory,
): NarrativeArc {
    // Destroyed: inactive or lifecycle destroyed
    if (formation.status === 'inactive' || formation.lifecycle_status === 'destroyed' || formation.lifecycle_status === 'disbanded') {
        return 'destroyed';
    }

    // Garrison: ≤2 battles
    if (history.battles_fought <= 2) {
        return 'garrison';
    }

    const currentPersonnel = formation.personnel ?? 0;
    const winRate = history.battles_fought > 0 ? history.victories / history.battles_fought : 0;
    const personnelRetained = history.peak_personnel > 0 ? currentPersonnel / history.peak_personnel : 1;
    const cumulativeCasualtyRate = history.peak_personnel > 0
        ? history.total_casualties_taken / history.peak_personnel
        : 0;

    // Risen: rebuilt after massive losses (>150% cumulative casualties relative to peak)
    if (cumulativeCasualtyRate > 1.5 && currentPersonnel > history.peak_personnel * 0.5) {
        return 'risen';
    }

    // Shattered: <50% peak personnel, still active
    if (personnelRetained < 0.50 && history.total_casualties_taken > 100) {
        return 'shattered';
    }

    // Veteran: >65% win rate AND >60% personnel retained
    if (winRate > 0.65 && personnelRetained > 0.60) {
        return 'veteran';
    }

    // Bloodied: heavy combat, heavy losses
    if (history.battles_fought >= 5 && history.total_casualties_taken > 200) {
        return 'bloodied';
    }

    // Default to garrison for low-activity units
    return 'garrison';
}

/**
 * Generate the narrative text for a brigade war story.
 */
export function generateNarrative(
    formation: FormationState,
    history: BrigadeHistory,
    arc: NarrativeArc,
): string {
    const name = formation.name;
    const battles = history.battles_fought;
    const wins = history.victories;
    const losses = history.defeats;
    const casualties = history.total_casualties_taken;
    const inflicted = history.total_casualties_inflicted;
    const currentPers = formation.personnel ?? 0;
    const peak = history.peak_personnel;
    const nadir = history.nadir_personnel;

    switch (arc) {
        case 'veteran':
            return `The ${name} fought ${battles} battles, winning ${wins}. ` +
                `It inflicted ${inflicted} casualties while losing ${casualties} of its own. ` +
                `A reliable formation, it ended the war at ${currentPers} personnel — the backbone of its corps.`;

        case 'bloodied':
            return `The ${name} was tested in ${battles} engagements, suffering ${casualties} total casualties. ` +
                `It won ${wins} and lost ${losses}. The cost of holding the line was written in its ranks: ` +
                `from a peak of ${peak} to a low of ${nadir}, then rebuilt to ${currentPers}.`;

        case 'shattered':
            return `The ${name} is a shadow of what it was. After ${battles} battles and ${casualties} casualties, ` +
                `it stands at ${currentPers} personnel — ${Math.round(100 * currentPers / Math.max(1, peak))}% of its peak strength. ` +
                `Still in the line, but barely.`;

        case 'risen':
            return `The ${name} was nearly destroyed and rebuilt. Over ${battles} battles, ` +
                `it suffered ${casualties} total casualties — far exceeding its peak strength of ${peak}. ` +
                `But it rose each time. By war's end, it stood at ${currentPers} men, ` +
                `a testament to the will to fight on.`;

        case 'destroyed':
            return `The ${name} ceased to exist. ` +
                (battles > 0
                    ? `In its ${battles} battles, it suffered ${casualties} casualties before being destroyed.`
                    : `It was dissolved before seeing significant action.`);

        case 'garrison':
            return `The ${name} held its ground. With only ${battles} engagements, ` +
                `its war was one of patience, not blood. It ended at ${currentPers} personnel.`;
    }
}

/**
 * Select up to 3 notable moments from a brigade's history.
 */
export function selectNotableMoments(
    formation: FormationState,
    history: BrigadeHistory,
): NotableMoment[] {
    const moments: NotableMoment[] = [];

    // First battle
    if (history.first_battle_turn != null && history.first_battle_osid) {
        moments.push({
            turn: history.first_battle_turn,
            description: `First battle at ${history.first_battle_osid}`,
        });
    }

    // Longest victory streak
    if (history.longest_victory_streak >= 4) {
        moments.push({
            turn: 0, // Streak spans multiple turns
            description: `${history.longest_victory_streak} consecutive victories`,
        });
    }

    // Longest defense streak
    if (history.longest_defense_streak >= 3 && moments.length < 3) {
        moments.push({
            turn: 0,
            description: `Held position through ${history.longest_defense_streak} consecutive attacks`,
        });
    }

    // Worst single battle
    if (history.worst_single_battle_casualties > 50 && history.worst_single_battle_turn != null && moments.length < 3) {
        moments.push({
            turn: history.worst_single_battle_turn,
            description: `Lost ${history.worst_single_battle_casualties} in a single battle`,
        });
    }

    // Personnel nadir
    if (history.nadir_personnel < history.peak_personnel * 0.30 && moments.length < 3) {
        moments.push({
            turn: 0,
            description: `Reached a low of ${history.nadir_personnel} personnel (${Math.round(100 * history.nadir_personnel / Math.max(1, history.peak_personnel))}% of peak)`,
        });
    }

    // Decorations
    if (formation.decorations && formation.decorations.length > 0 && moments.length < 3) {
        const highest = getHighestDecorationTier(formation.decorations);
        if (highest) {
            const dec = formation.decorations.find(d => d.tier === highest);
            if (dec) {
                moments.push({
                    turn: dec.awarded_turn,
                    description: `Earned ${getDecorationDisplayName(formation.faction, highest)} — ${dec.reason}`,
                });
            }
        }
    }

    return moments.slice(0, 3);
}

/**
 * Generate war stories for all brigades in the game state.
 * Called at end of game (final save generation).
 */
export function generateWarStories(state: GameState): BrigadeWarStory[] {
    const stories: BrigadeWarStory[] = [];
    const formationIds = Object.keys(state.formations ?? {}).sort(strictCompare);

    for (const id of formationIds) {
        const f = state.formations![id];
        const kind = f.kind ?? 'brigade';
        if (kind !== 'brigade') continue;

        const history = f.brigade_history;
        if (!history) continue;

        const arc = classifyArc(f, history);
        const narrative = generateNarrative(f, history, arc);
        const notable_moments = selectNotableMoments(f, history);

        stories.push({
            formation_id: id,
            formation_name: f.name,
            faction: f.faction,
            corps_id: f.corps_id ?? undefined,
            arc,
            narrative,
            notable_moments,
            stats: {
                battles_fought: history.battles_fought,
                victories: history.victories,
                defeats: history.defeats,
                total_casualties_taken: history.total_casualties_taken,
                total_casualties_inflicted: history.total_casualties_inflicted,
                final_personnel: f.personnel ?? 0,
                peak_personnel: history.peak_personnel,
                nadir_personnel: history.nadir_personnel,
            },
        });
    }

    return stories;
}
