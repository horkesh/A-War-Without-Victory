/**
 * Brigade classification, coverage, deduplication, and power/threat recomputation.
 * Extracted from corps_front_sectors.ts — pure refactoring, zero behavior change.
 */

import type {
    CorpsFrontSector,
    FactionId,
    FormationId,
    FormationState,
} from '../../state/game_state.js';
import { computeLocalFrontDefensivePower } from './local_front_defense.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { munFromOsid, type Osid } from './osid_adjacency.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    EXEMPT_CORPS_IDS,
    GARRISON_BUDGET_EDGES_PER_BRIGADE,
    PHASE_2C_MAX_HOPS,
} from './corps_front_sectors_constants.js';
import { getSectorComponent, getSectorFrontOsids, bfsToNearestSector } from './sector_utils.js';
import type { CorpsCommanderProfile } from './commander_override.js';

/**
 * Classify brigades into sectors based on territory membership.
 *
 * - Brigade at an OSID in a sector's territory_osids → assigned to that sector.
 * - Brigade in friendly territory but not in any sector's territory → assigned
 *   to the nearest sector (BFS through friendly territory).
 * - General staff units are exempt.
 *
 * GOLDEN RULE: Every active brigade MUST end up in a sector. If a brigade
 * falls through all classification priorities, that's a bug — investigate.
 *
 * Clears existing assigned/reserve lists and rebuilds from scratch.
 * Deterministic: sorted iteration via strictCompare.
 */
export function classifyBrigadesByTerritory(
    sectors: CorpsFrontSector[],
    faction: FactionId,
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    componentOf: Map<string, number>,
    commanderProfiles: Map<string, CorpsCommanderProfile>,
    playerOverrides?: Record<string, string>, // brigadeId → sector_id
): void {
    if (sectors.length === 0) return;

    // Clear existing assignments (will be rebuilt)
    for (const s of sectors) {
        s.assigned_brigade_ids = [];
        s.reserve_brigade_ids = [];
    }

    // ── Player override: pin brigades to player-assigned sectors ─────────
    const playerOverridden = new Set<FormationId>();
    if (playerOverrides) {
        const sectorById = new Map(sectors.map(s => [s.sector_id, s]));
        for (const bid of Object.keys(playerOverrides).sort(strictCompare)) {
            const sectorId = playerOverrides[bid];
            if (!sectorId) continue;
            const f = formations[bid];
            if (!f || f.faction !== faction || f.status !== 'active') continue;
            if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
            const fCorpsId = getFormationCorpsId(f);
            if (!fCorpsId) continue;
            const sector = sectorById.get(sectorId);
            if (!sector || sector.corps_id !== fCorpsId) continue; // stale/wrong corps — fall through
            sector.assigned_brigade_ids.push(bid);
            playerOverridden.add(bid);
        }
    }

    // ── Pre-compute enemy personnel per sector for budget-aware Phase 1 ──
    const preEnemyPers = new Map<string, number>();
    {
        const allFids = Object.keys(formations).sort(strictCompare);
        for (const s of sectors) {
            const enemyOsids = new Set<string>();
            for (const ss of s.sub_segments) for (const eo of ss.enemy_osids) enemyOsids.add(eo);
            let ep = 0;
            for (const fid of allFids) {
                const f = formations[fid];
                if (!f || f.faction === faction || f.status !== 'active') continue;
                if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
                if (f.location_osid && enemyOsids.has(f.location_osid)) ep += f.personnel ?? 0;
            }
            preEnemyPers.set(s.sector_id, ep);
        }
    }

    // Pre-compute sector components (avoids repeated getSectorComponent calls in Phase 1 filter)
    const sectorComponentCache = new Map<string, number>();
    for (const s of sectors) {
        sectorComponentCache.set(s.sector_id, getSectorComponent(s, componentOf));
    }

    // ── Phase 1: Assign frontline brigades by position ──────────────────
    const frontOsidToSectorIndices = new Map<string, number[]>();
    for (let i = 0; i < sectors.length; i++) {
        for (const ss of sectors[i]!.sub_segments) {
            for (const o of ss.friendly_osids) {
                const existing = frontOsidToSectorIndices.get(o);
                if (existing) {
                    if (!existing.includes(i)) existing.push(i);
                } else {
                    frontOsidToSectorIndices.set(o, [i]);
                }
            }
        }
    }

    // Per-corps unassigned brigade pool (corps decides where they go)
    const corpsPool = new Map<FormationId, FormationId[]>();

    // ── Phase 0a: Elite loan routing ─────────────────────────────────────────
    const loanedCorpsMap = new Map<FormationId, string>();
    for (const [fid, f] of Object.entries(formations)) {
        const ls = f.elite_loan_state;
        if (ls?.on_loan && ls.loaned_to_corps) loanedCorpsMap.set(fid, ls.loaned_to_corps);
    }

    const sortedFormIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedFormIds) {
        if (playerOverridden.has(fid)) continue;
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;

        const fCorpsId = getFormationCorpsId(f);
        if (fCorpsId && EXEMPT_CORPS_IDS.has(fCorpsId) && !loanedCorpsMap.has(fid)) continue;

        const effectiveCorpsId = loanedCorpsMap.get(fid) ?? fCorpsId;
        const loc = f.location_osid;

        const frontIndices = frontOsidToSectorIndices.get(loc);
        if (frontIndices && frontIndices.length > 0) {
            // Reachability guard: only consider sectors in the same connected component
            const brigComp = componentOf.get(loc) ?? -2;
            const corpsIndices = frontIndices.filter(idx => {
                const s = sectors[idx]!;
                return s.corps_id === effectiveCorpsId
                    && (sectorComponentCache.get(s.sector_id) ?? -1) === brigComp;
            });
            if (corpsIndices.length === 1) {
                sectors[corpsIndices[0]!]!.assigned_brigade_ids.push(fid);
                continue;
            } else if (corpsIndices.length > 1) {
                let bestIdx = corpsIndices[0]!;
                let bestThreat = -Infinity;
                for (const idx of corpsIndices) {
                    const s = sectors[idx]!;
                    const threat = preEnemyPers.get(s.sector_id) ?? 0;
                    if (threat > bestThreat || (threat === bestThreat && strictCompare(s.sector_id, sectors[bestIdx]!.sector_id) < 0)) {
                        bestThreat = threat;
                        bestIdx = idx;
                    }
                }
                sectors[bestIdx]!.assigned_brigade_ids.push(fid);
                continue;
            }
        }

        if (effectiveCorpsId) {
            const pool = corpsPool.get(effectiveCorpsId) ?? [];
            pool.push(fid);
            corpsPool.set(effectiveCorpsId, pool);
        }
    }

    // ── Phase 2: Corps distributes pooled brigades to sectors by need ───
    const sectorsByCorps = new Map<FormationId, CorpsFrontSector[]>();
    for (const s of sectors) {
        if (s.length_edges === 0) continue;
        const list = sectorsByCorps.get(s.corps_id) ?? [];
        list.push(s);
        sectorsByCorps.set(s.corps_id, list);
    }

    for (const [corpsId, pool] of [...corpsPool.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        const corpsSectors = sectorsByCorps.get(corpsId);
        if (!corpsSectors || corpsSectors.length === 0) {
            continue;
        }

        const sectorMunicipalities = new Map<CorpsFrontSector, Set<string>>();
        for (const s of corpsSectors) {
            const muns = new Set<string>();
            for (const osid of s.territory_osids) {
                const m = munFromOsid(osid);
                if (m) muns.add(m);
            }
            sectorMunicipalities.set(s, muns);
        }

        const EDGES_PER_GARRISON_BRIGADE = GARRISON_BUDGET_EDGES_PER_BRIGADE;
        const THREAT_BASELINE = 2000;

        const allFormIds = Object.keys(formations).sort(strictCompare);
        const sectorEnemyPers = new Map<CorpsFrontSector, number>();
        for (const s of corpsSectors) {
            const enemyOsids = new Set<string>();
            for (const ss of s.sub_segments) {
                for (const eo of ss.enemy_osids) enemyOsids.add(eo);
            }
            let enemyPers = 0;
            for (const fid of allFormIds) {
                const f = formations[fid];
                if (!f || f.faction === faction || f.status !== 'active') continue;
                if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
                if (!f.location_osid || !enemyOsids.has(f.location_osid)) continue;
                enemyPers += f.personnel ?? 0;
            }
            sectorEnemyPers.set(s, enemyPers);
        }

        // Step 1: Compute garrison budgets
        const totalPooled = pool.length;
        const totalAlreadyAssigned = corpsSectors.reduce((sum, s) => sum + s.assigned_brigade_ids.length, 0);
        const totalAvailable = totalPooled + totalAlreadyAssigned;

        const sectorBudget = new Map<CorpsFrontSector, number>();
        let totalMinGarrison = 0;
        for (const s of corpsSectors) {
            const ep = sectorEnemyPers.get(s) ?? 0;
            const threatMult = Math.min(3.0, Math.max(1.0, Math.sqrt(ep / THREAT_BASELINE)));
            const raw = Math.ceil(s.length_edges / EDGES_PER_GARRISON_BRIGADE) * threatMult;
            sectorBudget.set(s, raw);
            totalMinGarrison += raw;
        }

        const sectorAllocation = new Map<CorpsFrontSector, number>();
        if (totalMinGarrison <= totalAvailable) {
            for (const s of corpsSectors) sectorAllocation.set(s, Math.ceil(sectorBudget.get(s)!));
        } else {
            let allocated = 0;
            const frontSectors = corpsSectors.filter(s => s.length_edges > 0);
            for (const s of frontSectors) { sectorAllocation.set(s, 1); allocated++; }
            for (const s of corpsSectors) { if (!sectorAllocation.has(s)) sectorAllocation.set(s, 0); }
            const remaining = totalAvailable - allocated;
            if (remaining > 0 && totalMinGarrison > 0) {
                const proportional: Array<{ sector: CorpsFrontSector; frac: number }> = [];
                for (const s of frontSectors) {
                    proportional.push({ sector: s, frac: (sectorBudget.get(s)! / totalMinGarrison) * remaining });
                }
                for (const p of proportional) {
                    const extra = Math.floor(p.frac);
                    sectorAllocation.set(p.sector, sectorAllocation.get(p.sector)! + extra);
                    allocated += extra;
                }
                const leftover = totalAvailable - allocated;
                if (leftover > 0) {
                    const byThreat = [...proportional]
                        .sort((a, b) => (sectorEnemyPers.get(b.sector) ?? 0) - (sectorEnemyPers.get(a.sector) ?? 0)
                            || strictCompare(a.sector.sector_id, b.sector.sector_id));
                    for (let i = 0; i < leftover && i < byThreat.length; i++) {
                        sectorAllocation.set(byThreat[i]!.sector, sectorAllocation.get(byThreat[i]!.sector)! + 1);
                    }
                }
            }
        }

        const sectorNeed: Array<{ sector: CorpsFrontSector; need: number; comp: number }> = [];
        const sortedSectors = [...corpsSectors].sort((a, b) =>
            (sectorEnemyPers.get(b) ?? 0) - (sectorEnemyPers.get(a) ?? 0)
            || strictCompare(a.sector_id, b.sector_id));
        for (const s of sortedSectors) {
            const comp = getSectorComponent(s, componentOf);
            const alloc = sectorAllocation.get(s) ?? 0;
            const need = Math.max(0, alloc - s.assigned_brigade_ids.length);
            sectorNeed.push({ sector: s, need, comp });
        }

        const sectorFrontOsidSets = new Map<CorpsFrontSector, Set<string>>();
        for (const sn of sectorNeed) {
            const frontSet = new Set<string>();
            for (const ss of sn.sector.sub_segments) {
                for (const o of ss.friendly_osids) frontSet.add(o);
            }
            sectorFrontOsidSets.set(sn.sector, frontSet);
        }

        // Step 2: Fill garrisons — highest-threat sectors first
        const unmatched: FormationId[] = [];
        for (const sn of sectorNeed) {
            if (sn.need <= 0) continue;
            const candidates: Array<{ bid: FormationId; dist: number }> = [];
            for (const bid of pool) {
                if (sn.sector.assigned_brigade_ids.includes(bid)) continue;
                const f = formations[bid];
                if (!f?.location_osid) continue;
                const brigComp = componentOf.get(f.location_osid) ?? -2;
                if (brigComp !== sn.comp) continue;

                let dist = Infinity;
                const brigLoc = f.location_osid;
                if (sectorFrontOsidSets.get(sn.sector)?.has(brigLoc)) {
                    dist = 0;
                } else {
                    const visited = new Set<string>([brigLoc]);
                    let frontier = [brigLoc];
                    for (let hop = 1; hop <= PHASE_2C_MAX_HOPS && dist === Infinity; hop++) {
                        const next: string[] = [];
                        for (const osid of frontier) {
                            for (const nb of (adjacency.get(osid as Osid) ?? [])) {
                                if (visited.has(nb)) continue;
                                visited.add(nb);
                                if (!friendlyOsids.has(nb)) continue;
                                if (sectorFrontOsidSets.get(sn.sector)?.has(nb)) { dist = hop; break; }
                                next.push(nb);
                            }
                            if (dist !== Infinity) break;
                        }
                        frontier = next;
                    }
                }
                if (dist === Infinity) continue;

                const homeMun = f.home_osid ? munFromOsid(f.home_osid) : undefined;
                const isHome = homeMun && sectorMunicipalities.get(sn.sector)?.has(homeMun);
                const effectiveDist = isHome ? Math.max(0, dist - 2) : dist;

                candidates.push({ bid, dist: effectiveDist });
            }

            candidates.sort((a, b) => a.dist - b.dist || strictCompare(a.bid, b.bid));
            let filled = 0;
            for (const c of candidates) {
                if (filled >= sn.need) break;
                sn.sector.assigned_brigade_ids.push(c.bid);
                const poolIdx = pool.indexOf(c.bid);
                if (poolIdx >= 0) pool.splice(poolIdx, 1);
                filled++;
            }
            sn.need -= filled;
        }

        // Step 3: Surplus allocation — remaining pool brigades
        for (const bid of [...pool]) {
            const f = formations[bid];
            if (!f?.location_osid) continue;
            const brigComp = componentOf.get(f.location_osid) ?? -2;
            const homeMun = f.home_osid ? munFromOsid(f.home_osid) : undefined;

            const reachable = sectorNeed
                .filter(sn => sn.comp === brigComp)
                .sort((a, b) => {
                    if (a.need > 0 && b.need <= 0) return -1;
                    if (b.need > 0 && a.need <= 0) return 1;
                    const aHome = homeMun && sectorMunicipalities.get(a.sector)?.has(homeMun) ? 1 : 0;
                    const bHome = homeMun && sectorMunicipalities.get(b.sector)?.has(homeMun) ? 1 : 0;
                    if (bHome !== aHome) return bHome - aHome;
                    return (sectorEnemyPers.get(b.sector) ?? 0) - (sectorEnemyPers.get(a.sector) ?? 0)
                        || strictCompare(a.sector.sector_id, b.sector.sector_id);
                });

            if (reachable.length > 0) {
                const target = reachable[0]!;
                target.sector.assigned_brigade_ids.push(bid);
                target.need = Math.max(0, target.need - 1);
            } else if (sectorNeed.length > 0) {
                // Fallback: brigade is in a disconnected component with no matching sector.
                // Force-assign to the best sector regardless of component to avoid silent drops.
                const fallback = [...sectorNeed]
                    .sort((a, b) => {
                        if (a.need > 0 && b.need <= 0) return -1;
                        if (b.need > 0 && a.need <= 0) return 1;
                        const aHome = homeMun && sectorMunicipalities.get(a.sector)?.has(homeMun) ? 1 : 0;
                        const bHome = homeMun && sectorMunicipalities.get(b.sector)?.has(homeMun) ? 1 : 0;
                        if (bHome !== aHome) return bHome - aHome;
                        return (sectorEnemyPers.get(b.sector) ?? 0) - (sectorEnemyPers.get(a.sector) ?? 0)
                            || strictCompare(a.sector.sector_id, b.sector.sector_id);
                    });
                const target = fallback[0]!;
                target.sector.assigned_brigade_ids.push(bid);
                target.need = Math.max(0, target.need - 1);
                console.warn(`[brigade_assignment] Force-assigned ${bid} to ${target.sector.sector_id} (cross-component fallback)`);
            }
        }

    }

    // ── Force-assign loaned elites that BFS couldn't place ──
    for (const [fid, targetCorpsId] of loanedCorpsMap) {
        let alreadyAssigned = false;
        for (const sec of sectors) {
            if (sec.assigned_brigade_ids.includes(fid) || sec.reserve_brigade_ids?.includes(fid)) {
                alreadyAssigned = true;
                break;
            }
        }
        if (alreadyAssigned) continue;

        let bestSector: CorpsFrontSector | null = null;
        let bestCount = -1;
        for (const sec of sectors) {
            if (sec.corps_id !== targetCorpsId) continue;
            const count = sec.assigned_brigade_ids.length;
            if (count > bestCount || (count === bestCount && bestSector && strictCompare(sec.sector_id, bestSector.sector_id) < 0)) {
                bestCount = count;
                bestSector = sec;
            }
        }

        if (bestSector) {
            bestSector.assigned_brigade_ids.push(fid);
        }
    }

    // Sort for determinism
    for (const s of sectors) {
        s.assigned_brigade_ids.sort(strictCompare);
        s.reserve_brigade_ids.sort(strictCompare);
    }
}

/**
 * Step 6b: Cross-corps enclave defense.
 *
 * After corps-strict assignment, some brigades are unassigned because they're
 * physically present in territory where the front edges belong to a different
 * corps's sector.
 */
export function assignCrossCorpsEnclaveDefenders(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    faction: FactionId,
    componentOf: Map<string, number>,
): void {
    const assigned = new Set<string>();
    for (const s of sectors) {
        for (const bid of s.assigned_brigade_ids) assigned.add(bid);
        for (const bid of s.reserve_brigade_ids ?? []) assigned.add(bid);
    }

    const frontOsidToSectors = new Map<string, number[]>();
    for (let i = 0; i < sectors.length; i++) {
        for (const ss of sectors[i]!.sub_segments) {
            for (const o of ss.friendly_osids) {
                const existing = frontOsidToSectors.get(o);
                if (existing) { if (!existing.includes(i)) existing.push(i); }
                else frontOsidToSectors.set(o, [i]);
            }
        }
    }

    const territoryOsidToSectors = new Map<string, number[]>();
    for (let i = 0; i < sectors.length; i++) {
        for (const o of sectors[i]!.territory_osids) {
            const existing = territoryOsidToSectors.get(o);
            if (existing) { if (!existing.includes(i)) existing.push(i); }
            else territoryOsidToSectors.set(o, [i]);
        }
    }

    const sortedFormIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedFormIds) {
        if (assigned.has(fid)) continue;
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;
        const fCorpsId = getFormationCorpsId(f);
        if (fCorpsId && EXEMPT_CORPS_IDS.has(fCorpsId)) continue;

        const loc = f.location_osid;
        const ownCorpsHasSectors = sectors.some(s => s.corps_id === fCorpsId);
        if (ownCorpsHasSectors) continue;

        let sectorIndices = frontOsidToSectors.get(loc);
        if (!sectorIndices || sectorIndices.length === 0) {
            sectorIndices = territoryOsidToSectors.get(loc);
        }
        if (!sectorIndices || sectorIndices.length === 0) continue;

        const brigComp = componentOf.get(loc) ?? -2;
        const factionIndices = sectorIndices.filter(idx => {
            const s = sectors[idx]!;
            return s.faction === faction
                && getSectorComponent(s, componentOf) === brigComp;
        });
        if (factionIndices.length === 0) continue;

        let bestIdx = factionIndices[0]!;
        let bestNeed = -Infinity;
        for (const idx of factionIndices) {
            const s = sectors[idx]!;
            const need = s.length_edges - s.assigned_brigade_ids.length;
            if (need > bestNeed || (need === bestNeed && strictCompare(s.sector_id, sectors[bestIdx]!.sector_id) < 0)) {
                bestNeed = need;
                bestIdx = idx;
            }
        }
        sectors[bestIdx]!.assigned_brigade_ids.push(fid);
        assigned.add(fid);
    }
}

/**
 * After equalization and coverage, classify assigned brigades by position:
 * - On sector front OSID → stays assigned (frontline duty)
 * - 1 hop behind front → reserve candidate (recovery/reaction force)
 * - Deeper rear → stays assigned (will march toward front via interior movement)
 *
 * GOLDEN RULE 1: Every brigade MUST be in a sector. We never drop brigades.
 * GOLDEN RULE 2: Brigades in a sector MUST be at the frontline, except
 *   one reserve per sector (1 hop behind, recovering or reaction force).
 */
export function reclassifyRearBrigades(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>
): void {
    for (const sector of sectors) {
        const frontSet = getSectorFrontOsids(sector);
        if (frontSet.size === 0) continue;

        const oneHopBehind = new Set<string>();
        for (const fo of frontSet) {
            for (const n of (adjacency.get(fo as Osid) ?? [])) {
                if (frontSet.has(n)) continue;
                if (!friendlyOsids.has(n)) continue;
                oneHopBehind.add(n);
            }
        }

        const keepAssigned: FormationId[] = [];
        let reserveCandidates: Array<{ bid: FormationId; personnel: number }> = [];

        for (const bid of [...sector.assigned_brigade_ids, ...sector.reserve_brigade_ids]) {
            const f = formations[bid];
            if (!f?.location_osid) { keepAssigned.push(bid); continue; }
            if (frontSet.has(f.location_osid)) {
                keepAssigned.push(bid);
            } else if (oneHopBehind.has(f.location_osid)) {
                reserveCandidates.push({ bid, personnel: f.personnel ?? 0 });
            } else {
                keepAssigned.push(bid);
            }
        }

        // Zero-assigned guard for SRK fortress sectors
        if (
            sector.corps_id === 'vrs_sarajevo_romanija' &&
            keepAssigned.length === 0 &&
            reserveCandidates.length > 0
        ) {
            reserveCandidates.sort((a, b) => b.personnel - a.personnel || strictCompare(a.bid, b.bid));
            keepAssigned.push(reserveCandidates[0]!.bid);
            reserveCandidates = reserveCandidates.slice(1);
        }

        reserveCandidates.sort((a, b) => b.personnel - a.personnel || strictCompare(a.bid, b.bid));
        const reserveBrigade = reserveCandidates.length > 0 ? reserveCandidates[0]!.bid : null;
        for (const rc of reserveCandidates.slice(1)) {
            keepAssigned.push(rc.bid);
        }

        sector.assigned_brigade_ids = keepAssigned.sort(strictCompare);
        sector.reserve_brigade_ids = reserveBrigade ? [reserveBrigade] : [];
    }

    for (const s of sectors) {
        s.density = s.length_edges > 0
            ? s.assigned_brigade_ids.length / s.length_edges : 0;
    }
}

/**
 * Ensure every sector has at least one assigned brigade.
 */
export function ensureMinimumSectorCoverage(
    allSectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    componentOf: Map<string, number>
): void {
    const sectorsByCorps = new Map<FormationId, CorpsFrontSector[]>();
    for (const s of allSectors) {
        const list = sectorsByCorps.get(s.corps_id) ?? [];
        list.push(s);
        sectorsByCorps.set(s.corps_id, list);
    }

    for (const [, corpsSectors] of [...sectorsByCorps.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        for (const sector of corpsSectors) {
            if (sector.assigned_brigade_ids.length > 0) continue;

            const sectorComp = getSectorComponent(sector, componentOf);

            // Step 1: promote first connected reserve to assigned
            {
                const sectorFriendly = getSectorFrontOsids(sector);
                let promoted = false;
                for (let ri = 0; ri < sector.reserve_brigade_ids.length; ri++) {
                    const bid = sector.reserve_brigade_ids[ri]!;
                    const f = formations[bid];
                    if (!f?.location_osid) continue;
                    const reachable = bfsToNearestSector(
                        f.location_osid,
                        new Map([...sectorFriendly].map(o => [o, 0])),
                        adjacency, friendlyOsids
                    );
                    if (reachable !== null) {
                        sector.reserve_brigade_ids.splice(ri, 1);
                        sector.assigned_brigade_ids.push(bid);
                        promoted = true;
                        break;
                    }
                }
                if (promoted) continue;
            }

            // Step 2: transfer from surplus
            {
                const surplusSectors = corpsSectors
                    .filter(s => s.assigned_brigade_ids.length > 1
                        && s.sector_id !== sector.sector_id
                        && getSectorComponent(s, componentOf) === sectorComp)
                    .sort((a, b) => b.assigned_brigade_ids.length - a.assigned_brigade_ids.length || strictCompare(a.sector_id, b.sector_id));

                let transferred = false;
                for (const donor of surplusSectors) {
                    const donorFront = getSectorFrontOsids(donor);
                    for (const bid of [...donor.assigned_brigade_ids].sort(strictCompare)) {
                        const f = formations[bid];
                        if (!f?.location_osid) continue;
                        if (donorFront.has(f.location_osid)) continue;
                        const idx = donor.assigned_brigade_ids.indexOf(bid);
                        if (idx >= 0) donor.assigned_brigade_ids.splice(idx, 1);
                        sector.assigned_brigade_ids.push(bid);
                        transferred = true;
                        break;
                    }
                    if (transferred) break;
                }
                if (!transferred) {
                    for (const donor of surplusSectors) {
                        if (donor.assigned_brigade_ids.length <= 1) continue;
                        const bid = donor.assigned_brigade_ids[donor.assigned_brigade_ids.length - 1]!;
                        donor.assigned_brigade_ids.pop();
                        sector.assigned_brigade_ids.push(bid);
                        transferred = true;
                        break;
                    }
                }
            }
        }
    }

    // ── Density floor pass (n701→n750) ──
    const DENSITY_FLOOR_EDGES_PER_BRIGADE = 8;
    const DENSITY_FLOOR_THREAT_GATE = 300;
    const needed = (s: CorpsFrontSector): number =>
        Math.max(1, Math.ceil(s.length_edges / DENSITY_FLOOR_EDGES_PER_BRIGADE));

    for (const [, corpsSectors] of [...sectorsByCorps.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        const underStaffed = corpsSectors
            .filter(s =>
                s.assigned_brigade_ids.length > 0
                && s.assigned_brigade_ids.length < needed(s)
                && (s.threat_ratio ?? 0) > DENSITY_FLOOR_THREAT_GATE)
            .sort((a, b) =>
                (needed(b) - b.assigned_brigade_ids.length) - (needed(a) - a.assigned_brigade_ids.length)
                || strictCompare(a.sector_id, b.sector_id));

        for (const recipient of underStaffed) {
            const deficit = needed(recipient) - recipient.assigned_brigade_ids.length;
            const recipComp = getSectorComponent(recipient, componentOf);
            const donors = corpsSectors
                .filter(s =>
                    s.sector_id !== recipient.sector_id
                    && getSectorComponent(s, componentOf) === recipComp
                    && s.assigned_brigade_ids.length > needed(s))
                .sort((a, b) =>
                    (b.assigned_brigade_ids.length - needed(b)) - (a.assigned_brigade_ids.length - needed(a))
                    || strictCompare(a.sector_id, b.sector_id));

            let transferred = 0;
            for (const donor of donors) {
                if (transferred >= deficit) break;
                if (donor.assigned_brigade_ids.length <= needed(donor)) continue;

                const donorFront = getSectorFrontOsids(donor);
                let bid: string | undefined;
                for (const b of [...donor.assigned_brigade_ids].sort(strictCompare)) {
                    const f = formations[b];
                    if (f?.location_osid && !donorFront.has(f.location_osid)) { bid = b; break; }
                }
                if (!bid && donor.assigned_brigade_ids.length > needed(donor)) {
                    bid = donor.assigned_brigade_ids[donor.assigned_brigade_ids.length - 1];
                }
                if (!bid) continue;

                const idx = donor.assigned_brigade_ids.indexOf(bid);
                if (idx >= 0) {
                    donor.assigned_brigade_ids.splice(idx, 1);
                    recipient.assigned_brigade_ids.push(bid);
                    transferred++;
                }
            }
        }
    }

    // ── Idle equalization pass (Step 7c) ──
    const EQUALIZATION_DONOR_MAX_THREAT = 25;
    const EQUALIZATION_MIN_DONOR_DENSITY = 0.90;
    const EQUALIZATION_MAX_RECIP_DENSITY = 0.25;
    const EQUALIZATION_MAX_TRANSFERS = 1;

    for (const [, corpsSectors] of [...sectorsByCorps.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        const overDense = corpsSectors
            .filter(s =>
                s.assigned_brigade_ids.length > 1
                && s.length_edges > 0
                && s.assigned_brigade_ids.length / s.length_edges >= EQUALIZATION_MIN_DONOR_DENSITY
                && (s.threat_ratio ?? 0) <= EQUALIZATION_DONOR_MAX_THREAT)
            .sort((a, b) =>
                (b.assigned_brigade_ids.length / b.length_edges)
                - (a.assigned_brigade_ids.length / a.length_edges)
                || strictCompare(a.sector_id, b.sector_id));

        const thin = corpsSectors
            .filter(s =>
                s.assigned_brigade_ids.length > 0
                && s.length_edges > 0
                && s.assigned_brigade_ids.length / s.length_edges < EQUALIZATION_MAX_RECIP_DENSITY)
            .sort((a, b) =>
                (a.assigned_brigade_ids.length / a.length_edges)
                - (b.assigned_brigade_ids.length / b.length_edges)
                || strictCompare(a.sector_id, b.sector_id));

        for (const recipient of thin) {
            const recipComp = getSectorComponent(recipient, componentOf);
            let transferred = 0;

            for (const donor of overDense) {
                if (transferred >= EQUALIZATION_MAX_TRANSFERS) break;
                if (donor.sector_id === recipient.sector_id) continue;
                if (getSectorComponent(donor, componentOf) !== recipComp) continue;
                if (donor.assigned_brigade_ids.length / donor.length_edges < EQUALIZATION_MIN_DONOR_DENSITY) continue;

                const donorFront = getSectorFrontOsids(donor);
                let bid: string | undefined;
                for (const b of [...donor.assigned_brigade_ids].sort(strictCompare)) {
                    const f = formations[b];
                    if (f?.location_osid && !donorFront.has(f.location_osid)) { bid = b; break; }
                }
                if (!bid) continue;

                const idx = donor.assigned_brigade_ids.indexOf(bid);
                if (idx >= 0) {
                    donor.assigned_brigade_ids.splice(idx, 1);
                    recipient.assigned_brigade_ids.push(bid);
                    transferred++;
                }
            }
        }
    }

    // ── Moderate-pressure reinforcement pass (Step 7d) ──
    const PASS_7D_RECIPIENT_MAX_DENSITY = 0.25;
    const PASS_7D_RECIPIENT_MIN_THREAT = 50;
    const PASS_7D_DONOR_MIN_DENSITY = 0.75;
    const PASS_7D_MAX_TRANSFERS = 2;

    for (const [, corpsSectors] of [...sectorsByCorps.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        const recipients = corpsSectors
            .filter(s =>
                s.assigned_brigade_ids.length > 0
                && s.length_edges > 0
                && s.assigned_brigade_ids.length / s.length_edges < PASS_7D_RECIPIENT_MAX_DENSITY
                && (s.threat_ratio ?? 0) >= PASS_7D_RECIPIENT_MIN_THREAT)
            .sort((a, b) =>
                (a.assigned_brigade_ids.length / a.length_edges)
                - (b.assigned_brigade_ids.length / b.length_edges)
                || strictCompare(a.sector_id, b.sector_id));

        for (const recipient of recipients) {
            const recipComp = getSectorComponent(recipient, componentOf);
            let transferred = 0;

            const donors = corpsSectors
                .filter(s =>
                    s.sector_id !== recipient.sector_id
                    && s.assigned_brigade_ids.length > 1
                    && s.length_edges > 0
                    && s.assigned_brigade_ids.length / s.length_edges >= PASS_7D_DONOR_MIN_DENSITY
                    && getSectorComponent(s, componentOf) === recipComp)
                .sort((a, b) =>
                    (b.assigned_brigade_ids.length / b.length_edges)
                    - (a.assigned_brigade_ids.length / a.length_edges)
                    || strictCompare(a.sector_id, b.sector_id));

            for (const donor of donors) {
                if (transferred >= PASS_7D_MAX_TRANSFERS) break;
                if (donor.assigned_brigade_ids.length / donor.length_edges < PASS_7D_DONOR_MIN_DENSITY) continue;

                const donorFront = getSectorFrontOsids(donor);
                let bid: string | undefined;
                for (const b of [...donor.assigned_brigade_ids].sort(strictCompare)) {
                    const f = formations[b];
                    if (f?.location_osid && !donorFront.has(f.location_osid)) { bid = b; break; }
                }
                if (!bid) continue;

                const idx = donor.assigned_brigade_ids.indexOf(bid);
                if (idx >= 0) {
                    donor.assigned_brigade_ids.splice(idx, 1);
                    recipient.assigned_brigade_ids.push(bid);
                    transferred++;
                }
            }
        }
    }

    // Sort for determinism
    for (const s of allSectors) s.assigned_brigade_ids.sort(strictCompare);
}

/**
 * Remove brigades that appear in multiple sectors, keeping only the first
 * claim in sector_id order.
 */
export function deduplicateBrigadesAcrossSectors(sectors: CorpsFrontSector[]): void {
    if (sectors.length <= 1) return;
    const claimed = new Set<FormationId>();
    const sorted = [...sectors].sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (const sector of sorted) {
        sector.assigned_brigade_ids = sector.assigned_brigade_ids.filter(bid => {
            if (claimed.has(bid)) return false;
            claimed.add(bid);
            return true;
        });
        sector.reserve_brigade_ids = sector.reserve_brigade_ids.filter(bid => {
            if (claimed.has(bid)) return false;
            claimed.add(bid);
            return true;
        });
    }
}

/**
 * Recompute density, defensive_power, and threat_ratio for all sectors.
 * This MUST run AFTER all brigade-assignment steps.
 */
export function recomputeSectorPowerAndThreat(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    faction: FactionId,
): void {
    const allFormIds = Object.keys(formations).sort(strictCompare);
    for (const s of sectors) {
        s.density = s.length_edges > 0
            ? s.assigned_brigade_ids.length / s.length_edges : 0;
        s.defensive_power = computeLocalFrontDefensivePower(
            formations, s.assigned_brigade_ids, s.length_edges
        );

        const enemyOsids = new Set<string>();
        for (const ss of s.sub_segments) {
            for (const eo of ss.enemy_osids) enemyOsids.add(eo);
        }
        let enemyPower = 0;
        for (const fid of allFormIds) {
            const f = formations[fid];
            if (!f || f.faction === faction || f.status !== 'active') continue;
            if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
            if (!f.location_osid || !enemyOsids.has(f.location_osid)) continue;
            enemyPower += f.personnel ?? 0;
        }
        s.threat_ratio = s.defensive_power > 0
            ? enemyPower / s.defensive_power
            : (enemyPower > 0 ? 9999 : 0);
    }
}
