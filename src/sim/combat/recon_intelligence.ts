/**
 * Phase J: Fog of frontage — passive recon (BFS from brigade locations through enemy settlements).
 * Seeds come from formation.location_osid → canonical SIDs (OSID-native path).
 * Output remains SID-keyed.
 * Deterministic: sorted faction IDs, formation IDs, seed SIDs, neighbor expansion.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
    ReconIntelligence,
    ReconStrengthCategory,
    SettlementId
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { buildAdjacencyFromEdges } from './phase_ii_adjacency.js';

export interface ReconIntelligenceOptions {
    operationalToCanonical: OperationalToCanonicalReverseMap;
}

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
 * Update recon_intelligence for all factions: BFS from each faction's brigade locations
 * through enemy-controlled settlements only; depth = number of enemy steps (up to recon range).
 * Seeds are built from formation.location_osid (OSID-native path). Output remains SID-keyed.
 */
export function updateReconIntelligence(
    state: GameState,
    edges: EdgeRecord[],
    options?: ReconIntelligenceOptions
): void {
    const pc = state.political_controllers ?? {};
    const formations = state.formations ?? {};
    const adj = buildAdjacencyFromEdges(edges);
    const turn = state.meta?.turn ?? 0;

    if (!state.recon_intelligence) state.recon_intelligence = {};
    const factions = (state.factions ?? []).map(f => f.id).sort(strictCompare);

    /** Resolve controller for canonical SID (state may be OSID-keyed when options present). */
    const getControllerAtSid = options?.operationalToCanonical
        ? (() => {
            const sidToOsid = new Map<SettlementId, string>();
            for (const [osid, sids] of options!.operationalToCanonical) {
                for (const s of sids) sidToOsid.set(s, osid);
            }
            return (n: SettlementId): FactionId | undefined => {
                const osid = sidToOsid.get(n);
                const c = pc[osid ?? n];
                return c !== undefined && c !== null ? (c as FactionId) : undefined;
            };
        })()
        : (n: SettlementId): FactionId | undefined => {
            const c = pc[n];
            return c !== undefined && c !== null ? (c as FactionId) : undefined;
        };

    for (const factionId of factions) {
        const recon: ReconIntelligence = {
            detected_brigades: {},
            confirmed_empty: []
        };
        const range = getReconRange(factionId);
        const seedSids = new Set<SettlementId>();

        // OSID-native seed path: resolve brigade location_osid → canonical SIDs
        const otc = options?.operationalToCanonical;
        const brigadeIds = (Object.keys(formations) as FormationId[]).sort(strictCompare);
        for (const bid of brigadeIds) {
            const f = formations[bid];
            if (!f || f.faction !== factionId || (f.kind ?? 'brigade') !== 'brigade') continue;
            const mov = state.brigade_movement_state?.[bid]?.status;
            if (mov === 'packing' || mov === 'in_transit' || mov === 'unpacking') continue;
            const osid = f.location_osid;
            if (!osid) continue;
            if (otc) {
                const canonicalSids = otc.get(osid);
                if (canonicalSids) for (const s of canonicalSids) seedSids.add(s);
            }
        }

        // BFS: enemy_depth = number of steps into enemy-controlled settlements (0 = our seeds)
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
                const controller = getControllerAtSid(n);
                const isEnemy = controller !== undefined && controller !== factionId;
                if (controller !== undefined && controller === factionId) {
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
                        const enemyFormation = otc
                            ? findFormationAtCanonicalSid(state, otc, n, controller)
                            : null;
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

/** Find an enemy formation whose location_osid maps to the given canonical SID. Deterministic: sorted formation IDs. */
function findFormationAtCanonicalSid(
    state: GameState,
    operationalToCanonical: OperationalToCanonicalReverseMap,
    canonicalSid: SettlementId,
    factionId: FactionId
): FormationState | null {
    const formations = state.formations ?? {};
    const ids = (Object.keys(formations) as FormationId[]).sort(strictCompare);
    for (const id of ids) {
        const f = formations[id];
        if (!f || f.faction !== factionId || (f.kind ?? 'brigade') !== 'brigade') continue;
        const sids = operationalToCanonical.get(f.location_osid ?? '');
        if (sids?.includes(canonicalSid)) return f;
    }
    return null;
}
