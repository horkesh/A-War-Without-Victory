/**
 * Browser-safe AoR initialization for Phase II.
 * No Node/fs imports. Used by scenario_runner (Node) and run_phase_ii_browser (browser).
 */

import type { GameState } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';

/**
 * Populate each faction's areasOfResponsibility with settlement IDs they control (from political_controllers).
 * Deterministic: sids sorted.
 */
export function populateFactionAoRFromControl(
    state: GameState,
    settlementIds: Iterable<string>
): void {
    const pc = state.political_controllers ?? {};
    const sidsSorted = Array.from(settlementIds).sort(strictCompare);
    const byFaction = new Map<string, string[]>();
    for (const sid of sidsSorted) {
        const controller = pc[sid] ?? null;
        const key = controller ?? '_null_';
        const arr = byFaction.get(key) ?? [];
        arr.push(sid);
        byFaction.set(key, arr);
    }
    const factions = state.factions ?? [];
    for (const faction of factions) {
        const id = faction.id;
        faction.areasOfResponsibility = byFaction.get(id) ?? [];
    }
}

/**
 * Ensure each formation's home municipality (from tag mun:X) has its settlement IDs in that faction's AoR.
 * Deterministic: stable order; merges without duplicating.
 */
export function ensureFormationHomeMunsInFactionAoR(
    state: GameState,
    settlementsByMun: Map<string, string[]>
): void {
    const formations = state.formations ?? {};
    const formationIds = Object.keys(formations).sort(strictCompare);
    for (const fid of formationIds) {
        const formation = formations[fid];
        if (!formation?.faction || formation.status !== 'active') continue;
        const munTag = formation.tags?.find((t) => t.startsWith('mun:'));
        if (!munTag) continue;
        const munId = munTag.slice(4);
        const sids = settlementsByMun.get(munId);
        if (!sids || sids.length === 0) continue;
        const faction = state.factions?.find((f) => f.id === formation.faction);
        if (!faction) continue;
        const aor = faction.areasOfResponsibility ?? [];
        const aorSet = new Set(aor);
        let added = false;
        for (const sid of sids) {
            if (!aorSet.has(sid)) {
                aorSet.add(sid);
                added = true;
            }
        }
        if (added) {
            faction.areasOfResponsibility = Array.from(aorSet).sort(strictCompare);
        }
    }
}
