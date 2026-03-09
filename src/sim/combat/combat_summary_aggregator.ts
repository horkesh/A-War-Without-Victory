/**
 * Pipeline aggregator: computes CombatSummary for corps and army_hq formations.
 *
 * Runs after generate-war-stories so that war_story.arc is current for arc_distribution.
 * Sorted iteration for determinism.
 */

import type { GameState, FormationState } from '../../state/game_state.js';
import { aggregateBrigadeHistories } from '../../state/combat_summary.js';
import { strictCompare } from '../../state/validateGameState.js';

/**
 * Compute and assign combat_summary for all corps/corps_asset/army_hq formations.
 *
 * - Corps: aggregates brigades where corps_id === corps.id
 * - Army HQ: aggregates all brigades in the same faction
 */
export function computeCombatSummaries(state: GameState): void {
    const formations = state.military.formations;
    if (!formations) return;

    const sortedIds = Object.keys(formations).sort(strictCompare);

    // Pre-collect brigades by corps_id and by faction (sorted order preserved)
    const brigadesByCorps: Record<string, FormationState[]> = {};
    const brigadesByFaction: Record<string, FormationState[]> = {};

    for (const fid of sortedIds) {
        const f = formations[fid];
        if (!f || f.kind !== 'brigade') continue;

        // By corps
        if (f.corps_id) {
            if (!brigadesByCorps[f.corps_id]) brigadesByCorps[f.corps_id] = [];
            brigadesByCorps[f.corps_id].push(f);
        }

        // By faction
        if (!brigadesByFaction[f.faction]) brigadesByFaction[f.faction] = [];
        brigadesByFaction[f.faction].push(f);
    }

    // Assign summaries to corps/corps_asset and army_hq
    for (const fid of sortedIds) {
        const f = formations[fid];
        if (!f) continue;

        if (f.kind === 'corps' || f.kind === 'corps_asset') {
            f.combat_summary = aggregateBrigadeHistories(brigadesByCorps[f.id] ?? []);
        } else if (f.kind === 'army_hq') {
            f.combat_summary = aggregateBrigadeHistories(brigadesByFaction[f.faction] ?? []);
        }
    }
}
