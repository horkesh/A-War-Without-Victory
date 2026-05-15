import type { BrigadeEvaluationContext } from './bot_brigade_eval_types.js';
import { findNearestFriendlyOsidInSet, findNearestFriendlyOsidDestination, getCorpsBrigadeCountAtOsid, isMovementDestinationRisky } from './bot_brigade_context.js';
import { strictCompare } from '../../state/validateGameState.js';
import { findAdjacentFrontGap, computeHopsToFront, COLUMN_MARCH_MIN_HOPS, findNearestOffensiveTarget } from './bot_brigade_movement_ai.js';
import { countFactionBrigadesAtOsid, countCorpsBrigadesAtOsid, MAX_CORPS_BRIGADES_PER_OSID } from './bot_brigade_context.js';
import { issueInteriorMovement } from './bot_brigade_movement_ai.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { isEnclaveBrigade, isOsidInSameEnclave, ENCLAVE_DEFINITIONS, osidBelongsToEnclave } from './enclave_resilience.js';
import type { Osid } from './osid_adjacency.js';
import type { CorpsFrontSector, FormationState, GameState, SettlementId } from '../../state/game_state.js';
import { botOrdersPerfTime } from './_perf_profile_bot_orders.js';

const SECTOR_MARCH_PROFILE_PREFIX = 'bot_orders.executeFactionDirectives.eval.sectorMarch';
const POCKET_EVACUATION_PROFILE_PREFIX = 'bot_orders.executeFactionDirectives.eval';
const RETURN_TO_CORPS_PROFILE_PREFIX = 'bot_orders.executeFactionDirectives.eval';

function sectorMarchProfileTime<T>(labelSuffix: string, fn: () => T): T {
    return botOrdersPerfTime(`${SECTOR_MARCH_PROFILE_PREFIX}${labelSuffix}`, fn);
}

function pocketEvacuationProfileTime<T>(labelSuffix: string, fn: () => T): T {
    return botOrdersPerfTime(`${POCKET_EVACUATION_PROFILE_PREFIX}${labelSuffix}`, fn);
}

function returnToCorpsProfileTime<T>(labelSuffix: string, fn: () => T): T {
    return botOrdersPerfTime(`${RETURN_TO_CORPS_PROFILE_PREFIX}${labelSuffix}`, fn);
}

/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Canonical
 * DOMAIN:    Sector march evaluation — brigade-to-front positioning
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   Whether a brigade should column-march to its assigned sector front
 * WRITES:    brigade_movement_orders (column march to sector front)
 * READS:     sector sub_segments.friendly_osids, directive.sector_reassignment_orders
 * MUST NOT:  reassign a brigade to a different corps sector
 *
 * UPSTREAM:  commander_loop.ts sector assignment
 * DOWNSTREAM: osid_column_movement.ts (executes the column march)
 *
 * TRUTH INVARIANTS:
 * - Only marches within the brigade's already-assigned sector (T1 assignment is authoritative)
 * - Enclave brigades respect enclave lock (isEnclaveBrigade check)
 *
 * MOVEMENT TIER: T2 — Tactical Routing (Sector March) (see MOVEMENT_AUTHORITY.md)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * True if this brigade is in a corps sector's **assigned** line (not reserve) roster but its
 * `location_osid` is not one of that sector's front OSIDs (`sub_segments[].friendly_osids`).
 * Used to bypass defend-only gates so line units can column-march to the sector front first.
 * Reserve brigades (one hop behind) are intentionally excluded.
 */
export function assignedBrigadeNotOnSectorFrontOsids(
    state: GameState,
    brigade: FormationState,
    loc: string,
    assignedSectorFrontOsids?: Set<string> | null,
): boolean {
    if (assignedSectorFrontOsids !== undefined) {
        return assignedSectorFrontOsids != null
            && assignedSectorFrontOsids.size > 0
            && !assignedSectorFrontOsids.has(loc);
    }
    const sectors = state.military.corps_front_sectors;
    if (!sectors) return false;
    for (const sid of Object.keys(sectors).sort(strictCompare)) {
        const sec = sectors[sid]!;
        if (!sec.assigned_brigade_ids.includes(brigade.id)) continue;
        const frontSet = new Set<string>();
        for (const ss of sec.sub_segments) {
            for (const o of ss.friendly_osids) frontSet.add(o);
        }
        if (frontSet.size === 0) continue;
        return !frontSet.has(loc);
    }
    return false;
}

export function isCurrentSectorRetroactiveTooth(sector: CorpsFrontSector, loc: string): boolean {
    for (const ss of sector.sub_segments) {
        if (ss.friendly_osids.includes(loc)) {
            return ss.friendly_osids.length === 1;
        }
    }
    return false;
}

export function evaluateSectorMarch(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, state, faction, loc, adjacency, reverseMap, isActiveSectorOperationParticipant, result, graphAnalysis, columnAssignments, directive, sectorAssignment, assignedSectorFrontOsids, corpsBrigadeCountsByOsid } = ctx;
    const countCorpsAt = (osid: Osid): number => corpsBrigadeCountsByOsid
        ? getCorpsBrigadeCountAtOsid(corpsBrigadeCountsByOsid, brigade.corps_id, osid)
        : countCorpsBrigadesAtOsid(state, faction, brigade.corps_id, osid);
    const offAssignedFront = sectorMarchProfileTime('.offAssignedFront', () =>
        assignedBrigadeNotOnSectorFrontOsids(state, brigade, loc, assignedSectorFrontOsids)
    );

    // --- Sector reassignment: corps AI issued explicit reassignment order ---
    // Must be checked BEFORE "stay on sector" logic, otherwise a brigade already
    // on its current sector's front returns true and evaluateFrontCoverage (which
    // also processes sector_reassignment_orders) never runs.
    if (sectorMarchProfileTime('.sectorReassignment', () => {
        if (directive?.sector_reassignment_orders && state.military.corps_front_sectors) {
            const reassign = directive.sector_reassignment_orders.find(r => r.brigade_id === brigade.id);
            if (reassign) {
                const targetSec = state.military.corps_front_sectors[reassign.to_sector_id];
                if (targetSec) {
                    const targetOsids = new Set<string>();
                    for (const ss of targetSec.sub_segments) {
                        for (const o of ss.friendly_osids) targetOsids.add(o);
                    }
                    if (targetOsids.size > 0 && !targetOsids.has(loc)) {
                        const dest = findNearestFriendlyOsidDestination(state, faction, loc, adjacency, reverseMap, targetOsids);
                        if (dest) {
                            result.column_march_orders[brigade.id] = dest;
                            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    })) return true;

    // --- Sector march: brigade assigned/reserve in a sector but not on its front → column march ---
    // This overrides home defense: the corps needs this brigade at the front.
    // Op participants are exempt: they march toward objectives (evaluateSectorAttack handles them).
    // The old `|| offAssignedFront` caused oscillation — op participants advancing off-sector
    // were rerouted back to sector front every turn, producing ZEA and recovery-no-attempt.
    const sectors = state.military.corps_front_sectors;
    if (sectors && !isActiveSectorOperationParticipant) {
        let assignedSector = sectorAssignment?.sector ?? null;
        let isReserve = sectorAssignment?.isReserve ?? false;
        let cachedFrontSet = sectorAssignment?.frontOsids ?? null;
        if (sectorAssignment === undefined) {
            sectorMarchProfileTime('.assignedSectorLookup', () => {
                for (const sid of Object.keys(sectors).sort(strictCompare)) {
                    const sec = sectors[sid]!;
                    if (sec.assigned_brigade_ids.includes(brigade.id)) {
                        assignedSector = sec;
                        break;
                    }
                    if (sec.reserve_brigade_ids.includes(brigade.id)) {
                        assignedSector = sec;
                        isReserve = true;
                        break;
                    }
                }
            });
        }
        if (assignedSector) {
            const sector = assignedSector;
            // If brigade has a pending return-to-home movement order, normally don't override it.
            // Exception: line-assigned brigades that are still off their assigned sector front
            // must be pulled to the sector front (root fix for rear lock-in).
            const pendingMove = state.military.brigade_movement_orders?.[brigade.id];
            if (pendingMove) {
                const destSids = pendingMove.destination_sids ?? [];
                const homeOsid = brigade.home_osid;
                if (homeOsid && destSids.some((d: string) => d === homeOsid) && !offAssignedFront) {
                    return false; // Returning home — don't redirect to sector front
                }
            }

            const frontSet = sectorMarchProfileTime('.frontSet', () => {
                const resolvedFrontSet = cachedFrontSet ?? new Set<string>();
                if (!cachedFrontSet) {
                    for (const ss of sector.sub_segments) {
                        for (const o of ss.friendly_osids) resolvedFrontSet.add(o);
                    }
                }
                return resolvedFrontSet;
            });
            if (!frontSet.has(loc)) {
                // Reserve brigades only column march if deep rear (2+ hops).
                // 1-hop reserves stay put when the sector already has line holders. If the
                // sector has no line holder, the reserve must march forward to close the seam.
                if (isReserve) {
                    const neighbors = adjacency.get(loc as Osid) ?? [];
                    const nearFront = sectorMarchProfileTime('.reserveNearFront', () => neighbors.some(n => {
                        const nAnalysis = graphAnalysis.osid_analysis.get(n as Osid);
                        return nAnalysis != null && nAnalysis.enemy_neighbors.length > 0;
                    }));
                    if (nearFront && sector.assigned_brigade_ids.length > 0) return false;
                }
                // Not on sector front — column march there (use actual destination
                // for multi-hop Dijkstra pathfinding, not just first step)
                // Enclave brigades must NOT march outside their enclave — they defend their pocket.
                // Without this, Goražde brigades march to Visoko via temporary corridors.
                if (frontSet.size > 0) {
                    if (isEnclaveBrigade(brigade)) {
                        const hasEnclaveTarget = sectorMarchProfileTime('.enclaveGuard', () =>
                            [...frontSet].some(f => isOsidInSameEnclave(loc, f))
                        );
                        if (!hasEnclaveTarget) return false; // Skip march — no enclave-local sector front
                    }
                    const dest = sectorMarchProfileTime('.destination', () =>
                        findNearestFriendlyOsidDestination(state, faction, loc, adjacency, reverseMap, frontSet)
                    );
                    if (dest) {
                        // "Do not garrison the tooth" guard:
                        // A single-OSID sub-segment has no lateral support — if the tooth is risky
                        // (salient: ≥3 enemy neighbors, or cut-off risk: ≤1 friendly neighbor),
                        // the brigade should not march there. Fall through to corps-wide rerouting.
                        const isToothDest = sector.sub_segments.some(
                            ss => ss.friendly_osids.length === 1 && ss.friendly_osids[0] === dest
                        );
                        if (isToothDest && graphAnalysis && isMovementDestinationRisky(dest as Osid, graphAnalysis)) {
                            // Don't issue march order — fall through to trap remediation below
                        } else {
                            // No home-distance cap: destination is always chosen from **this sector's**
                            // front OSIDs. Corps assignment already binds the brigade to this sector;
                            // capping by home↔front distance stranded line units in the rear (see
                            // brigade rear audits 2026-03-27). Reserve / enclave carve-outs above.
                            result.column_march_orders[brigade.id] = dest;
                            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                            return true;
                        }
                    }
                    // Trap remediation: assigned sector front may be disconnected from brigade location.
                    // Re-route within corps to nearest reachable sector-front OSID to avoid rear lock-in.
                    // Risky single-OSID sub-segment teeth are excluded from the rerouting set —
                    // picking the same tooth as the previous guard just blocked achieves nothing.
                    // If the entire corps front is teeth with no safe alternative, suppress the march
                    // (brigade holds at current depth position — reactive defense).
                    if (sectorMarchProfileTime('.trapReroute', () => {
                        const corpsId = brigade.corps_id;
                        if (corpsId) {
                            const reachableCorpsFront = new Set<string>();
                            for (const sid of Object.keys(sectors).sort(strictCompare)) {
                                const sec = sectors[sid]!;
                                if (sec.corps_id !== corpsId) continue;
                                for (const ss of sec.sub_segments) {
                                    const isTooth = ss.friendly_osids.length === 1;
                                    for (const o of ss.friendly_osids) {
                                        if (isTooth && graphAnalysis && isMovementDestinationRisky(o as Osid, graphAnalysis)) {
                                            continue; // exclude risky tooth from rerouting candidates
                                        }
                                        reachableCorpsFront.add(o);
                                    }
                                }
                            }
                            if (reachableCorpsFront.size > 0) {
                                const rerouteDest = findNearestFriendlyOsidDestination(
                                    state, faction, loc, adjacency, reverseMap, reachableCorpsFront
                                );
                                if (rerouteDest) {
                                    result.column_march_orders[brigade.id] = rerouteDest;
                                    result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                                    return true;
                                }
                            }
                            // No safe corps front available — suppress march (hold at current depth position).
                        }
                        return false;
                    })) return true;
                }
            } else {
                // Already on assigned sector front: cancel stale home-return column orders.
                const pendingMove = state.military.brigade_movement_orders?.[brigade.id];
                if (pendingMove) {
                    const homeOsid = brigade.home_osid;
                    const destSids = pendingMove.destination_sids ?? [];
                    if (homeOsid && destSids.some((d: string) => d === homeOsid)) {
                        delete state.military.brigade_movement_orders?.[brigade.id];
                    }
                }
                // ── Retroactive-tooth eviction guard ─────────────────────────────────
                // A brigade can arrive at a sub-segment that was multi-OSID at the time
                // (safe), but the enemy then captures the adjacent OSIDs leaving it as a
                // sole-OSID sub-segment retroactively. No eviction happens automatically,
                // so the brigade is stuck on a tooth indefinitely.
                //
                // Conditions to evict:
                //   1. The brigade's sub-segment has exactly one friendly_osid (the tooth).
                //   2. That OSID is flagged risky by isMovementDestinationRisky.
                //   3. No column march is already in flight (pendingMove is falsy).
                //   4. The OSID is NOT in must_hold_osids_by_corps for this brigade's corps.
                //   5. The brigade is not disrupted (disrupted_turns > 0).
                if (sectorMarchProfileTime('.retroactiveTooth', () => {
                    if (!pendingMove && graphAnalysis) {
                        const corpsIdEvict = brigade.corps_id;
                        const isRetroactiveTooth = !isReserve
                            && isCurrentSectorRetroactiveTooth(sector, loc);
                        if (isRetroactiveTooth && isMovementDestinationRisky(loc as Osid, graphAnalysis)) {
                            // Check must_hold override
                            const mustHoldOsids: string[] =
                                (corpsIdEvict ? (state.military.must_hold_osids_by_corps?.[corpsIdEvict] ?? []) : []);
                            const isMustHold = mustHoldOsids.includes(loc);
                            // Check disruption
                            const isDisrupted = (brigade.disrupted_turns ?? 0) > 0;
                            if (!isMustHold && !isDisrupted) {
                                // Build safe destination set: all corps front OSIDs excluding the
                                // current tooth and any other risky sole-OSID teeth.
                                const safeFront = new Set<string>();
                                if (corpsIdEvict) {
                                    for (const sid of Object.keys(sectors).sort(strictCompare)) {
                                        const sec = sectors[sid]!;
                                        if (sec.corps_id !== corpsIdEvict) continue;
                                        for (const ss of sec.sub_segments) {
                                            const ssIsTooth = ss.friendly_osids.length === 1;
                                            for (const o of ss.friendly_osids) {
                                                if (o === loc) continue; // exclude current tooth
                                                if (ssIsTooth && isMovementDestinationRisky(o as Osid, graphAnalysis)) {
                                                    continue; // exclude other risky teeth
                                                }
                                                safeFront.add(o);
                                            }
                                        }
                                    }
                                }
                                if (safeFront.size > 0) {
                                    const evictDest = findNearestFriendlyOsidDestination(
                                        state, faction, loc, adjacency, reverseMap, safeFront
                                    );
                                    if (evictDest) {
                                        result.column_march_orders[brigade.id] = evictDest;
                                        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                                        return true;
                                    }
                                }
                                // No safe destination found — brigade is fully trapped; hold in place.
                            }
                        }
                    }
                    return false;
                })) return true;
                // ── End retroactive-tooth eviction guard ─────────────────────────────
                // Brigade IS on a sector front OSID. Check if this position is overstacked
                // while other front OSIDs in the same sector are under-covered.
                // This prevents brigades from piling into a corner front OSID (e.g. a single RS
                // pocket embedded in enemy territory) while the main sector front goes undefended.
                //
                // CRITICAL: Use columnAssignments to track planned departures/arrivals THIS turn.
                // Without this, all stacked brigades see the same static count and all pick the
                // same destination — causing perpetual ping-pong oscillation.
                if (sectorMarchProfileTime('.overstackRedistribution', () => {
                    const plannedDepartures = columnAssignments.get(loc as Osid) ?? 0;
                    // Negative values in columnAssignments = planned departures from this OSID
                    const effectiveCountHere = sectorMarchProfileTime('.overstackRedistribution.countHere', () =>
                        countCorpsAt(loc)
                        + Math.min(0, plannedDepartures) // departures reduce count
                    );
                    if (effectiveCountHere > MAX_CORPS_BRIGADES_PER_OSID && frontSet.size > 1) {
                        // Find least-covered other sector front OSID (prefer undefended, then lightly defended)
                        // ENCLAVE GUARD: enclave brigades must not redistribute to front OSIDs outside their
                        // enclave. Without this guard, Goražde brigades (tagged 'enclave') end up at Foča
                        // front OSIDs in the same sector when those OSIDs have fewer brigades.
                        const enclave = isEnclaveBrigade(brigade);
                        const otherFronts = sectorMarchProfileTime('.overstackRedistribution.rankCandidates', () =>
                            [...frontSet]
                                .filter(o => o !== loc)
                                .filter(o => !enclave || isOsidInSameEnclave(loc as string, o))
                                .sort((a, b) => {
                                    const ca = countCorpsAt(a as Osid)
                                        + (columnAssignments.get(a as Osid) ?? 0);
                                    const cb = countCorpsAt(b as Osid)
                                        + (columnAssignments.get(b as Osid) ?? 0);
                                    return ca - cb || strictCompare(a, b);
                                })
                        );
                        for (const candidate of otherFronts) {
                            // Check: would this destination be overstacked after planned arrivals?
                            const plannedAtDest = columnAssignments.get(candidate as Osid) ?? 0;
                            const destCount = sectorMarchProfileTime('.overstackRedistribution.destCount', () =>
                                countCorpsAt(candidate as Osid)
                                + Math.max(0, plannedAtDest) // arrivals increase count
                            );
                            if (destCount >= MAX_CORPS_BRIGADES_PER_OSID) continue; // already full

                            const dest = sectorMarchProfileTime('.overstackRedistribution.destination', () =>
                                findNearestFriendlyOsidDestination(
                                    state, faction, loc, adjacency, reverseMap, new Set([candidate])
                                )
                            );
                            // No isMovementDestinationRisky check here — the brigade is being
                            // ordered to a FRONT OSID in its own sector. Front OSIDs are inherently
                            // "risky" (adjacent to enemy) but that's where defenders must be.
                            if (dest) {
                                result.column_march_orders[brigade.id] = dest;
                                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                                // Track this movement so next brigade sees updated counts
                                columnAssignments.set(loc as Osid, (columnAssignments.get(loc as Osid) ?? 0) - 1);
                                columnAssignments.set(dest, (columnAssignments.get(dest) ?? 0) + 1);
                                return true;
                            }
                        }
                    }
                    return false;
                })) return true;
            }
        }
    }
    return false;
}

/**
 * Return-to-corps: orphaned brigades outside their corps territory march home.
 *
 * A brigade not assigned to any sector AND not in any of its corps's sector
 * territories is lost — it's in the wrong part of the map (e.g. Čajniče brigade
 * at Banja Luka). The commander recalls it by issuing a column march toward
 * home_osid. The brigade will eventually reach its corps's territory and get
 * assigned to a sector through the normal pipeline.
 */
export function evaluateReturnToCorps(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, state, loc, adjacency, result, sectorAssignment, corpsTerritoryOsidsByCorps } = ctx;

    // Only fires for brigades NOT in any sector
    if (!state.military.corps_front_sectors) return false;
    const sectors = state.military.corps_front_sectors;
    const isRostered = returnToCorpsProfileTime('.returnToCorps.rosterScan', () => {
        if (sectorAssignment !== undefined) return sectorAssignment != null;
        for (const s of Object.values(sectors)) {
            if (s.assigned_brigade_ids.includes(brigade.id)) return true;
            if ((s.reserve_brigade_ids ?? []).includes(brigade.id)) return true;
        }
        return false;
    });
    if (isRostered) return false;

    // Check: is the brigade in ANY of its target corps's sector territories?
    // Elite reserve loans remain owned by main staff in corps_id, but while on
    // loan they should route toward the receiving corps's sector footprint.
    const corpsId = brigade.elite_loan_state?.on_loan
        ? brigade.elite_loan_state.loaned_to_corps
        : brigade.corps_id;
    if (!corpsId) return false;
    const cachedCorpsTerritory = corpsTerritoryOsidsByCorps?.get(corpsId);
    const inCorpsTerritory = returnToCorpsProfileTime('.returnToCorps.territoryCheck', () => {
        if (cachedCorpsTerritory !== undefined) return cachedCorpsTerritory.has(loc);
        for (const sid of Object.keys(sectors).sort(strictCompare)) {
            const s = sectors[sid]!;
            if (s.corps_id === corpsId && s.territory_osids.includes(loc)) return true;
        }
        return false;
    });
    if (inCorpsTerritory) return false;

    // Brigade is orphaned and outside corps territory — march toward nearest
    // own-corps sector territory. BFS from current location through friendly
    // territory, looking for any OSID in a corps sector's territory.
    const pc = state.political.political_controllers ?? {};

    // Collect all own-corps territory OSIDs as BFS targets
    const corpsTerritory = returnToCorpsProfileTime('.returnToCorps.collectTargets', () => {
        if (cachedCorpsTerritory !== undefined) return cachedCorpsTerritory;
        const targets = new Set<string>();
        for (const sid of Object.keys(sectors).sort(strictCompare)) {
            const s = sectors[sid]!;
            if (s.corps_id === corpsId) {
                for (const o of [...s.territory_osids].sort(strictCompare)) targets.add(o);
            }
        }
        return targets;
    });
    if (corpsTerritory.size === 0) return false;

    // BFS from current location toward nearest corps territory OSID
    const { targetFound, parent } = returnToCorpsProfileTime('.returnToCorps.bfs', () => {
        const visited = new Set<string>([loc]);
        const parent = new Map<string, string>();
        const queue: string[] = [loc];
        let targetFound: string | null = null;
        while (queue.length > 0 && !targetFound) {
            const curr = queue.shift()!;
            const neighbors = adjacency.get(curr as Osid) ?? [];
            for (const n of neighbors) {
                if (visited.has(n)) continue;
                if (pc[n] !== brigade.faction) continue;
                visited.add(n);
                parent.set(n, curr);
                if (corpsTerritory.has(n)) { targetFound = n; break; }
                queue.push(n);
            }
        }
        return { targetFound, parent };
    });
    if (!targetFound) return false;

    // Walk back from target to loc to find the first step
    const step = returnToCorpsProfileTime('.returnToCorps.walkBack', () => {
        let nextStep = targetFound;
        while (parent.has(nextStep) && parent.get(nextStep) !== loc) {
            nextStep = parent.get(nextStep)!;
        }
        return nextStep;
    });
    if (step && step !== loc) {
        result.movement_orders[brigade.id] = step as Osid;
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'hold' });
        return true;
    }
    return false;
}

/** Maximum territory OSIDs for a sector to be considered a "tiny pocket" worth evacuating. */
const POCKET_EVACUATION_MAX_TERRITORY = 2;

/**
 * Pocket evacuation: brigades in tiny ad-hoc pockets (<=2 territory OSIDs) that are
 * NOT named enclaves (Gorazde, Srebrenica, Sarajevo, etc.) should column-march toward
 * home rather than defending a strategically worthless pocket indefinitely.
 *
 * Placed after evaluateReturnToCorps and before hold/defense evaluations.
 */
export function evaluatePocketEvacuation(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, state, loc, result, sectorAssignment } = ctx;

    if (!state.military.corps_front_sectors) return false;

    // Find the sector this brigade is assigned to
    const sectors = state.military.corps_front_sectors;
    let assignedSector: (typeof sectors)[string] | null = sectorAssignment?.sector ?? null;
    if (sectorAssignment === undefined) {
        assignedSector = pocketEvacuationProfileTime('.pocketEvacuation.assignedSectorLookup', () => {
            for (const sid of Object.keys(sectors).sort(strictCompare)) {
                const sec = sectors[sid]!;
                if (sec.assigned_brigade_ids.includes(brigade.id)) {
                    return sec;
                }
            }
            return null;
        });
    } else {
        pocketEvacuationProfileTime('.pocketEvacuation.assignedSectorLookup', () => {
            return assignedSector;
        });
        if (sectorAssignment?.isReserve) {
            return false;
        }
    }
    if (!assignedSector) return false;

    // Only fire for tiny pockets
    if ((assignedSector.territory_osids?.length ?? 0) > POCKET_EVACUATION_MAX_TERRITORY) return false;

    // Don't evacuate named enclaves — they are strategically valuable and historically held
    const isNamedEnclave = ENCLAVE_DEFINITIONS.some(enc =>
        assignedSector!.territory_osids?.some(osid => osidBelongsToEnclave(osid, enc)) === true
    );
    if (isNamedEnclave) return false;

    // Don't evacuate disrupted brigades — they can't march
    if ((brigade.disrupted_turns ?? 0) > 0) return false;

    // Issue column march toward home_osid
    const homeOsid = brigade.home_osid;
    if (!homeOsid) return false;

    // Don't override existing movement orders
    const existingOrders = state.military.brigade_movement_orders ?? {};
    if (existingOrders[brigade.id]) return false;

    if (!state.military.brigade_movement_orders) {
        state.military.brigade_movement_orders = {};
    }
    state.military.brigade_movement_orders![brigade.id] = {
        destination_sids: [homeOsid as SettlementId],
        stance: 'column',
    } as { destination_sids: SettlementId[] };

    result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
    return true;
}

export function evaluateFrontCoverage(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, state, faction, loc, adjacency, reverseMap, graphAnalysis, directive, corpsStance, adjEnemy, result, columnAssignments } = ctx;

    // --- Rule 5b: Redeploy toward offensive target ---
    // On front but no offensive_target adjacent and there are excess brigades here:
    // Move along front toward the nearest offensive_target through friendly territory.
    if (adjEnemy.length > 0 && directive && directive.offensive_targets.length > 0 &&
        (corpsStance === 'offensive' || corpsStance === 'balanced')) {
        const redeployTargetSet = new Set(directive.offensive_targets);
        const hasAdjacentTarget = adjEnemy.some(o => redeployTargetSet.has(o));
        const factionHere = countFactionBrigadesAtOsid(state, faction, loc);
        if (!hasAdjacentTarget && factionHere >= 2) {
            // BFS through friendly territory toward nearest offensive_target neighbor
            const redeployTarget = findNearestOffensiveTarget(state, faction, loc, redeployTargetSet, adjacency, reverseMap, 6);
            if (redeployTarget) {
                if (!isMovementDestinationRisky(redeployTarget, graphAnalysis)) {
                    result.movement_orders[brigade.id] = redeployTarget;
                }
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                return true;
            }
        }
    }

    // --- Rule 5b2: Sector reassignment from density equalization ---
    // Corps AI issued explicit reassignment orders — this brigade should column march
    // to its assigned sector. Only act if not heavily entrenched.
    if (directive?.sector_reassignment_orders && state.military.corps_front_sectors) {
        const reassign = directive.sector_reassignment_orders.find(r => r.brigade_id === brigade.id);
        if (reassign) {
            const targetSec = state.military.corps_front_sectors[reassign.to_sector_id];
            if (targetSec) {
                const targetOsids = new Set<string>();
                for (const ss of targetSec.sub_segments) {
                    for (const o of ss.friendly_osids) targetOsids.add(o);
                }
                if (targetOsids.size > 0 && !targetOsids.has(loc)) {
                    const dest = findNearestFriendlyOsidInSet(state, faction, loc, adjacency, reverseMap, targetOsids);
                    if (dest) {
                        // Use column march for distant moves, 1-hop for adjacent
                        const hops = computeHopsToFront(loc, faction, adjacency, state, reverseMap, graphAnalysis);
                        if (hops >= COLUMN_MARCH_MIN_HOPS) {
                            result.column_march_orders[brigade.id] = dest;
                        } else {
                            result.movement_orders[brigade.id] = dest;
                        }
                        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                        return true;
                    }
                }
            }
        }
    }

    // --- Rule 5c: Reinforce under-density or empty sector ---
    // When this brigade is on a stacked front OSID (≥2 friendly brigades here) and
    // the directive flags under-density sectors, march to the nearest one.
    if (adjEnemy.length > 0 &&
        directive?.reinforce_sector_ids?.length &&
        state.military.corps_front_sectors &&
        countFactionBrigadesAtOsid(state, faction, loc) >= 2) {
        const targetOsids = new Set<string>();
        for (const sid of directive.reinforce_sector_ids) {
            const sec = state.military.corps_front_sectors[sid];
            if (!sec) continue;
            for (const ss of sec.sub_segments) {
                for (const o of ss.friendly_osids) targetOsids.add(o);
            }
        }
        if (targetOsids.size > 0 && !targetOsids.has(loc)) {
            const dest = findNearestFriendlyOsidInSet(state, faction, loc, adjacency, reverseMap, targetOsids);
            if (dest && !isMovementDestinationRisky(dest, graphAnalysis)) {
                result.movement_orders[brigade.id] = dest;
            }
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }
    }

    // --- Rule 6: Front coverage — fill gaps, rebalance ---
    if (adjEnemy.length > 0) {
        // On front but no viable attack: fill adjacent gaps
        const factionHere = countFactionBrigadesAtOsid(state, faction, loc);
        if (factionHere >= 2) {
            const gap = findAdjacentFrontGap(state, loc, faction, adjacency, reverseMap, graphAnalysis);
            if (gap) {
                result.movement_orders[brigade.id] = gap;
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                return true;
            }
        }
        // Corps-level rebalancing (use columnAssignments to avoid oscillation)
        const plannedHere = columnAssignments.get(loc as Osid) ?? 0;
        const corpsCount = countCorpsBrigadesAtOsid(state, faction, brigade.corps_id, loc)
            + Math.min(0, plannedHere);
        if (corpsCount > MAX_CORPS_BRIGADES_PER_OSID) {
            issueInteriorMovement(brigade, loc, faction, adjacency, state, reverseMap, graphAnalysis, result,
                ['undefended', 'critical', 'threatened'], columnAssignments);
            return true;
        }
        // On front, no viable attack, holding position.
        // Defensive corps exits early at Rule 4 with dig_in. Balanced and offensive corps use
        // 'defend' so movement lockout doesn't freeze them when repositioning is needed.
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        return true;
    }

    return false;
}
