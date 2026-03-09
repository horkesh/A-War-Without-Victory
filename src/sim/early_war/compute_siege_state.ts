/**
 * Phase F Step 23: Siege state computation.
 * Computes per-(municipality, faction) siege ratios: what fraction of the municipality's
 * external OSID neighbors are enemy-controlled.
 *
 * siege_ratio = enemy_external_neighbor_count / total_external_neighbor_count
 *
 * "External" means the neighbor belongs to a DIFFERENT municipality.
 * "Enemy" means the neighbor has a political_controllers entry that is neither
 * undefined nor the queried faction.
 *
 * Siege state is TURN-LOCAL and must NOT be written to GameState.
 * Deterministic: all iteration is sorted (mun_id then faction).
 */

import type { GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/**
 * Per (mun_id, faction) siege ratio (0.0–1.0).
 * Key format: `${mun_id}:${faction}`.
 * 0.0 = no surrounding enemy presence; 1.0 = fully surrounded.
 */
export type SiegeRatioByMunFaction = Map<string, number>;

/**
 * Returns the siege ratio for a (mun_id, faction) pair.
 * Returns 0.0 if the key is not found (no data → not besieged).
 */
export function getSiegeRatio(
    map: SiegeRatioByMunFaction,
    munId: string,
    faction: string
): number {
    return map.get(`${munId}:${faction}`) ?? 0.0;
}

/**
 * Compute siege ratios for all (municipality, faction) pairs.
 *
 * @param state       - Current game state (political_controllers, municipalities, factions).
 * @param adjacency   - OSID → neighbor OSIDs (full bidirectional adjacency from operational contact graph).
 * @param osidToMun   - OSID → mun_id lookup (built from reverse map + canonical SID→mun).
 * @returns SiegeRatioByMunFaction map, keyed `${mun_id}:${faction}`.
 */
export function computeSiegeState(
    state: GameState,
    adjacency: Map<string, string[]>,
    osidToMun: Map<string, string>
): SiegeRatioByMunFaction {
    const result: SiegeRatioByMunFaction = new Map();

    // Collect mun_ids and faction ids, sorted for determinism
    const munIds = Object.keys(state.political.municipalities ?? {}).slice().sort(strictCompare);
    const factionIds = (state.factions ?? [])
        .map((f) => f.id)
        .filter((x): x is string => typeof x === 'string')
        .slice()
        .sort(strictCompare);

    if (munIds.length === 0 || factionIds.length === 0) return result;

    // Build mun_id → OSID[] reverse lookup (sorted for determinism)
    const osidsByMun = new Map<string, string[]>();
    const osidsSorted = Array.from(osidToMun.keys()).sort(strictCompare);
    for (const osid of osidsSorted) {
        const mun = osidToMun.get(osid)!;
        const list = osidsByMun.get(mun) ?? [];
        list.push(osid);
        osidsByMun.set(mun, list);
    }

    const pc = state.political.political_controllers ?? {};

    for (const munId of munIds) {
        const munOsids = osidsByMun.get(munId) ?? [];
        const munOsidSet = new Set(munOsids);

        // Collect all external neighbor OSIDs for this municipality (dedup)
        // "External" = neighbor's mun_id differs from munId
        const externalNeighborSet = new Set<string>();
        for (const osid of munOsids) {
            const neighbors = adjacency.get(osid) ?? [];
            for (const nb of neighbors) {
                if (munOsidSet.has(nb)) continue; // internal neighbor — same mun
                const nbMun = osidToMun.get(nb);
                if (nbMun === munId) continue; // also same mun (belt-and-suspenders)
                externalNeighborSet.add(nb);
            }
        }

        const totalExternal = externalNeighborSet.size;

        for (const faction of factionIds) {
            let siegeRatio = 0.0;

            if (totalExternal > 0) {
                // Count external neighbors that are enemy-controlled for this faction
                let enemyCount = 0;
                for (const nb of externalNeighborSet) {
                    const controller = pc[nb];
                    // Uncontrolled (no entry) does NOT count as enemy
                    if (controller === undefined) continue;
                    if (controller !== faction) {
                        enemyCount += 1;
                    }
                }
                siegeRatio = enemyCount / totalExternal;
            }

            result.set(`${munId}:${faction}`, siegeRatio);
        }
    }

    return result;
}
