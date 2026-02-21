/**
 * Phase J: Fog of frontage — passive recon (BFS from brigade AoR through enemy settlements).
 * Deterministic: sorted faction IDs, brigade IDs, neighbor expansion.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type {
    FactionId,
    FormationId,
    GameState,
    ReconIntelligence,
    ReconStrengthCategory,
    SettlementId
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getBrigadeAoRSettlements } from './brigade_aor.js';
import { buildAdjacencyFromEdges } from './phase_ii_adjacency.js';

export const RECON_RANGE_RBIH = 2;
export const RECON_RANGE_RS = 1;
export const RECON_RANGE_HRHB = 1;

export function getReconRange(factionId: FactionId): number {
    if (factionId === 'RBiH') return RECON_RANGE_RBIH;
    if (factionId === 'RS') return RECON_RANGE_RS;
    if (factionId === 'HRHB') return RECON_RANGE_HRHB;
    return 1;
}

/** Strength category for fog display (personnel thresholds). */
export function getStrengthCategory(personnel: number): ReconStrengthCategory {
    if (personnel < 400) return 'weak';
    if (personnel < 800) return 'moderate';
    if (personnel < 1200) return 'strong';
    return 'fortress';
}

/**
 * Update recon_intelligence for all factions: BFS from each faction's brigade AoR
 * through enemy-controlled settlements only; depth = number of enemy steps (up to recon range).
 */
export function updateReconIntelligence(state: GameState, edges: EdgeRecord[]): void {
    const pc = state.political_controllers ?? {};
    const formations = state.formations ?? {};
    const brigadeAor = state.brigade_aor ?? {};
    const adj = buildAdjacencyFromEdges(edges);
    const turn = state.meta?.turn ?? 0;

    if (!state.recon_intelligence) state.recon_intelligence = {};
    const factions = (state.factions ?? []).map(f => f.id).sort(strictCompare);

    for (const factionId of factions) {
        const recon: ReconIntelligence = {
            detected_brigades: {},
            confirmed_empty: []
        };
        const range = getReconRange(factionId);
        const seedSids = new Set<SettlementId>();
        for (const [sid, bid] of Object.entries(brigadeAor) as [SettlementId, FormationId | null][]) {
            if (!bid) continue;
            const f = formations[bid];
            if (!f || f.faction !== factionId || (f.kind ?? 'brigade') !== 'brigade') continue;
            const mov = state.brigade_movement_state?.[bid]?.status;
            if (mov === 'packing' || mov === 'in_transit' || mov === 'unpacking') continue;
            const aor = getBrigadeAoRSettlements(state, bid);
            for (const s of aor) seedSids.add(s);
        }
        // BFS: enemy_depth = number of steps into enemy-controlled settlements (0 = our AoR)
        const reached = new Map<SettlementId, number>();
        const queue: Array<{ sid: SettlementId; enemy_depth: number }> = [];
        for (const s of [...seedSids].sort(strictCompare)) {
            queue.push({ sid: s, enemy_depth: 0 });
            reached.set(s, 0);
        }
        while (queue.length > 0) {
            const { sid, enemy_depth } = queue.shift()!;
            const neighbors = adj.get(sid);
            if (!neighbors) continue;
            const sorted = [...neighbors].sort(strictCompare);
            for (const n of sorted) {
                const controller = pc[n];
                const isEnemy = controller && controller !== factionId;
                if (controller === factionId) {
                    const cur = reached.get(n);
                    if (cur === undefined || cur > enemy_depth) {
                        reached.set(n, enemy_depth);
                        queue.push({ sid: n, enemy_depth });
                    }
                    continue;
                }
                if (isEnemy && enemy_depth < range) {
                    const nextDepth = enemy_depth + 1;
                    const cur = reached.get(n);
                    if (cur === undefined || cur > nextDepth) {
                        reached.set(n, nextDepth);
                        const enemyBrigade = brigadeAor[n];
                        const enemyFormation = enemyBrigade ? formations[enemyBrigade] : null;
                        if (enemyFormation && enemyFormation.faction === controller) {
                            recon.detected_brigades[n] = {
                                strength_category: getStrengthCategory(enemyFormation.personnel ?? 0),
                                detected_turn: turn,
                                detected_via: 'recon'
                            };
                        } else {
                            recon.confirmed_empty.push(n);
                        }
                        queue.push({ sid: n, enemy_depth: nextDepth });
                    }
                }
            }
        }
        recon.confirmed_empty = [...new Set(recon.confirmed_empty)].sort(strictCompare);
        state.recon_intelligence[factionId] = recon;
    }
}
