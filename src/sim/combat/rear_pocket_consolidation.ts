/**
 * Rear pocket consolidation: auto-flip enemy OSID clusters completely surrounded by faction territory.
 *
 * A cluster of 1-6 connected same-controller OSIDs where ALL external neighbors are controlled
 * by a single faction has no military access — the surrounding force controls all roads, supply
 * lines, and communication. Without a defending brigade, this territory is under de facto control
 * and should flip automatically.
 *
 * This replaces the need for brigades to physically march into every surrounded pocket.
 * Historically, isolated pockets without military presence were absorbed into the
 * surrounding faction's administrative control within days.
 *
 * Deterministic: sorted OSID iteration, BFS cluster detection, no randomness.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data_types.js';
import { buildOsidAdjacency, type Osid } from './osid_adjacency.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';
import { seedDisplacementTimerOnFlip } from '../../state/displacement_takeover.js';
import { osidBelongsToEnclave, ENCLAVE_DEFINITIONS } from './enclave_resilience.js';
import { isRbihHrhbCombatBlocked } from '../early_war/alliance_update.js';

/** Max cluster size for auto-flip. Clusters > 6 are too large to flip without military action. */
const MAX_POCKET_CLUSTER = 6;

/** Minimum share of controlled external neighbors required for an abandonment claimant. */
const ABANDONMENT_DOMINANCE_SHARE = 2 / 3;

/** Check if two factions are co-belligerent (allied) at the given turn. */
function areCobelligerent(state: GameState, factionA: string, factionB: string): boolean {
    return isRbihHrhbCombatBlocked(state, factionA, factionB);
}

/**
 * Prefix-wide enclave definitions are too broad for passive rear-pocket cleanup.
 * They are appropriate for resilience and siege behavior, but not for freezing
 * isolated singleton teeth that only happen to live inside a wide municipality
 * bundle. Capital-anchored and explicit-list enclaves remain protected here.
 */
function shouldProtectRearPocketClusterFromEnclave(
    cluster: string[],
    surroundingFaction: string,
): boolean {
    for (const clusterOsid of cluster) {
        for (const enclave of ENCLAVE_DEFINITIONS) {
            if (enclave.faction === surroundingFaction) continue;
            if (!osidBelongsToEnclave(clusterOsid, enclave)) continue;
            if (enclave.osid_prefixes && !enclave.osid_list && !enclave.capital_osid) continue;
            return true;
        }
    }
    return false;
}

export interface RearPocketConsolidationReport {
    flipped: Array<{ osid: Osid; from: string; to: string }>;
    total_flipped: number;
}

/**
 * Scan all OSIDs and auto-flip clusters of 1-6 connected enemy OSIDs completely surrounded
 * by a single faction. Only flips OSIDs with NO defending brigade present.
 */
export function consolidateRearPockets(
    state: GameState,
    edges: EdgeRecord[],
    _reverseMap: OperationalToCanonicalReverseMap
): RearPocketConsolidationReport {
    const report: RearPocketConsolidationReport = { flipped: [], total_flipped: 0 };

    const adjacency = buildOsidAdjacency(edges);
    const formations = state.military.formations ?? {};

    // Build set of OSIDs that have an active brigade present, plus faction/location
    // keys used to prove that a mixed-ring abandonment claimant has organized forces
    // physically adjacent to the pocket.
    const defendedOsids = new Set<string>();
    const activeBrigadeFactionLocations = new Set<string>();
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid]!;
        if (f.status === 'active' && f.location_osid && f.kind === 'brigade') {
            defendedOsids.add(f.location_osid);
            activeBrigadeFactionLocations.add(`${f.faction}:${f.location_osid}`);
        }
    }

    const allOsids = [...adjacency.keys()].filter(k => k.startsWith('op:')).sort(strictCompare);
    const pc = state.political.political_controllers ?? {};
    const checked = new Set<string>();

    for (const osid of allOsids) {
        if (checked.has(osid)) continue;
        const controller = pc[osid] as string | undefined;
        if (!controller) { checked.add(osid); continue; }

        // BFS: find connected component of same-controller OSIDs
        const cluster: string[] = [];
        const clusterSet = new Set<string>();
        const bfsQueue: string[] = [osid];
        clusterSet.add(osid);
        let tooLarge = false;
        let hasDefender = false;
        let head = 0;

        while (head < bfsQueue.length) {
            const curr = bfsQueue[head++]!;
            cluster.push(curr);
            if (cluster.length > MAX_POCKET_CLUSTER) { tooLarge = true; break; }
            if (defendedOsids.has(curr)) hasDefender = true;

            for (const n of (adjacency.get(curr) ?? []).filter(x => x.startsWith('op:'))) {
                if (clusterSet.has(n)) continue;
                const nCtrl = pc[n] as string | undefined;
                if (nCtrl === controller) {
                    clusterSet.add(n);
                    bfsQueue.push(n);
                }
            }
        }

        // Mark all cluster members as checked
        for (const c of clusterSet) checked.add(c);
        if (tooLarge || hasDefender) continue;

        // Check: ALL external neighbors must be controlled by the same faction (or co-belligerent ally),
        // different from the pocket controller.
        let surroundingFaction: string | null = null;
        let allSurrounded = true;
        for (const c of cluster) {
            for (const n of (adjacency.get(c) ?? []).filter(x => x.startsWith('op:'))) {
                if (clusterSet.has(n)) continue; // skip intra-cluster edges
                const nCtrl = pc[n] as string | undefined;
                if (!nCtrl) { allSurrounded = false; break; }
                if (surroundingFaction === null) {
                    surroundingFaction = nCtrl;
                } else if (nCtrl !== surroundingFaction) {
                    // Allow co-belligerents (RBiH+HRHB pre-1993) to count as same side
                    if (!areCobelligerent(state, nCtrl, surroundingFaction)) {
                        allSurrounded = false; break;
                    }
                    // When co-belligerents surround a pocket, assign to the faction with
                    // the most surrounding OSIDs (tracked by surroundingFaction staying as
                    // the first one found — good enough for small pockets)
                }
            }
            if (!allSurrounded) break;
        }

        let mechanism: 'consolidation' | 'abandoned' = 'consolidation';

        // A small, empty, critically supplied pocket can also be abandoned when its
        // external ring is mixed. This is deliberately stricter than homogeneous rear
        // consolidation: one legally hostile faction must dominate the ring and have an
        // active brigade on an adjacent OSID. A minority third-party boundary therefore
        // cannot preserve a military vacuum indefinitely, but a mere map-color majority
        // without organized forces cannot seize it either.
        if (!allSurrounded) {
            const externalNeighbors = new Map<string, string>();
            let hasUncontrolledBoundary = false;
            for (const c of cluster) {
                for (const n of (adjacency.get(c) ?? []).filter(x => x.startsWith('op:'))) {
                    if (clusterSet.has(n)) continue;
                    const nCtrl = pc[n] as string | undefined;
                    if (!nCtrl) {
                        hasUncontrolledBoundary = true;
                        continue;
                    }
                    externalNeighbors.set(n, nCtrl);
                }
            }

            const claimantCounts = new Map<string, number>();
            for (const nCtrl of externalNeighbors.values()) {
                if (nCtrl === controller || isRbihHrhbCombatBlocked(state, nCtrl, controller)) continue;
                claimantCounts.set(nCtrl, (claimantCounts.get(nCtrl) ?? 0) + 1);
            }
            const rankedClaimants = [...claimantCounts.entries()].sort((a, b) =>
                b[1] - a[1] || strictCompare(a[0], b[0]));
            const dominant = rankedClaimants[0];
            const isCritical = cluster.every(c =>
                state.political.last_supply_state_by_osid?.[c] === 'critical');
            const hasAdjacentOrganizedForce = dominant !== undefined
                && [...externalNeighbors.entries()].some(([n, nCtrl]) =>
                    nCtrl === dominant[0]
                    && activeBrigadeFactionLocations.has(`${dominant[0]}:${n}`));
            const hasDominantShare = dominant !== undefined
                && externalNeighbors.size > 0
                && dominant[1] / externalNeighbors.size >= ABANDONMENT_DOMINANCE_SHARE;

            if (hasUncontrolledBoundary || !isCritical || !hasDominantShare || !hasAdjacentOrganizedForce) {
                continue;
            }
            surroundingFaction = dominant![0];
            mechanism = 'abandoned';
        }

        if (!surroundingFaction || surroundingFaction === controller) continue;
        if (isRbihHrhbCombatBlocked(state, surroundingFaction, controller)) continue;

        // Enclave guard: siege geometry produces topologically surrounded clusters.
        // Interior enclave OSIDs (e.g. Sarajevo city fragments, Srebrenica pocket) may
        // have all-RS neighbors because they sit inside a defended enclave ring — this is
        // correct siege geometry, NOT an abandoned pocket. Consolidation must not
        // auto-flip enclave-interior OSIDs based on topology alone.
        if (surroundingFaction) {
            if (shouldProtectRearPocketClusterFromEnclave(cluster, surroundingFaction)) continue;
        }

        // Auto-flip entire cluster
        if (!state.political.political_controllers) state.political.political_controllers = {};
        for (const c of cluster.sort(strictCompare)) {
            state.political.political_controllers[c] = surroundingFaction;
            seedDisplacementTimerOnFlip(state, c, controller, surroundingFaction);
            (state.political.control_events ??= []).push({
                turn: state.meta?.turn ?? 0,
                settlement_id: c,
                mechanism,
                from: controller as string | null,
                to: surroundingFaction,
                mun_id: c.split(':')[1],
            });
            report.flipped.push({ osid: c, from: controller, to: surroundingFaction });
            report.total_flipped++;
        }
    }

    return report;
}
