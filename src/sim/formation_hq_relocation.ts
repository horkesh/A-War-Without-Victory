/**
 * Formation HQ relocation: when a formation's HQ settlement is in enemy-controlled
 * territory, relocate HQ to a friendly settlement (same mun or nearest friendly mun).
 * Deterministic: sorted formation IDs, sorted candidate settlements.
 */

import type { EdgeRecord, SettlementRecord } from '../map/settlements.js';
import type { FactionId, FormationId, GameState, MunicipalityId, SettlementId } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import { identifyFrontActiveSettlements } from './phase_ii/brigade_aor.js';

export interface FormationHqRelocationReport {
    relocated: number;
    formation_ids: FormationId[];
}

function buildSettlementsByMun(settlements: Map<string, SettlementRecord>): Map<MunicipalityId, SettlementId[]> {
    const byMun = new Map<MunicipalityId, SettlementId[]>();
    for (const [sid, rec] of settlements.entries()) {
        const munId = (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
        const list = byMun.get(munId) ?? [];
        list.push(sid);
        byMun.set(munId, list);
    }
    for (const list of byMun.values()) {
        list.sort(strictCompare);
    }
    return byMun;
}

function buildSidToMun(byMun: Map<MunicipalityId, SettlementId[]>): Map<SettlementId, MunicipalityId> {
    const sidToMun = new Map<SettlementId, MunicipalityId>();
    for (const [munId, sids] of byMun.entries()) {
        for (const sid of sids) {
            sidToMun.set(sid, munId);
        }
    }
    return sidToMun;
}

function buildMunAdjacency(
    sidToMun: Map<SettlementId, MunicipalityId>,
    edges: EdgeRecord[]
): Map<MunicipalityId, MunicipalityId[]> {
    const adj = new Map<MunicipalityId, Set<MunicipalityId>>();
    for (const edge of edges) {
        const munA = sidToMun.get(edge.a);
        const munB = sidToMun.get(edge.b);
        if (!munA || !munB || munA === munB) continue;
        let setA = adj.get(munA);
        if (!setA) {
            setA = new Set();
            adj.set(munA, setA);
        }
        setA.add(munB);
        let setB = adj.get(munB);
        if (!setB) {
            setB = new Set();
            adj.set(munB, setB);
        }
        setB.add(munA);
    }
    const result = new Map<MunicipalityId, MunicipalityId[]>();
    for (const [mun, set] of adj.entries()) {
        result.set(mun, Array.from(set).sort(strictCompare));
    }
    return result;
}

/**
 * Find a friendly settlement for the formation: same mun first, then adjacent muns (sorted).
 * Returns first settlement ID where political_controllers[sid] === faction, or null.
 */
function findFriendlySettlement(
    pc: Record<SettlementId, FactionId | null>,
    faction: FactionId,
    byMun: Map<MunicipalityId, SettlementId[]>,
    sidToMun: Map<SettlementId, MunicipalityId>,
    munAdjacency: Map<MunicipalityId, MunicipalityId[]>,
    currentHqSid: SettlementId
): SettlementId | null {
    const currentMun = sidToMun.get(currentHqSid);
    if (currentMun) {
        const sidsInMun = byMun.get(currentMun) ?? [];
        for (const sid of sidsInMun) {
            if (pc[sid] === faction) return sid;
        }
        const neighborMuns = munAdjacency.get(currentMun) ?? [];
        for (const neighborMun of neighborMuns) {
            const sids = byMun.get(neighborMun) ?? [];
            for (const sid of sids) {
                if (pc[sid] === faction) return sid;
            }
        }
    }
    return null;
}

function buildAdjacency(edges: EdgeRecord[]): Map<SettlementId, SettlementId[]> {
    const adj = new Map<SettlementId, SettlementId[]>();
    for (const edge of edges) {
        const listA = adj.get(edge.a) ?? [];
        listA.push(edge.b);
        adj.set(edge.a, listA);
        const listB = adj.get(edge.b) ?? [];
        listB.push(edge.a);
        adj.set(edge.b, listB);
    }
    for (const list of adj.values()) list.sort(strictCompare);
    return adj;
}

function getBrigadeAoRSettlements(
    state: GameState,
    formationId: FormationId
): SettlementId[] {
    const out: SettlementId[] = [];
    const aor = state.brigade_aor ?? {};
    for (const [sid, assigned] of Object.entries(aor)) {
        if (assigned === formationId) out.push(sid as SettlementId);
    }
    return out.sort(strictCompare);
}

/**
 * Pick deterministic HQ target from brigade AoR at preferred rear depth from front.
 * Priority:
 * 1) any AoR settlement at exact preferred depth
 * 2) nearest deeper depth (> preferred)
 * 3) nearest shallower depth (< preferred)
 * 4) lexicographically first AoR settlement (unreachable fallback)
 */
function pickAoRDepthTarget(
    aorSids: SettlementId[],
    frontActive: Set<SettlementId>,
    adj: Map<SettlementId, SettlementId[]>,
    preferredDepth: number
): SettlementId | null {
    if (aorSids.length === 0) return null;
    const aorSet = new Set(aorSids);
    const seeds = aorSids.filter((sid) => frontActive.has(sid)).sort(strictCompare);
    if (seeds.length === 0) return aorSids[0];

    const depthBySid = new Map<SettlementId, number>();
    const queue: SettlementId[] = [];
    let head = 0;
    for (const sid of seeds) {
        if (depthBySid.has(sid)) continue;
        depthBySid.set(sid, 0);
        queue.push(sid);
    }

    while (head < queue.length) {
        const current = queue[head++];
        const currentDepth = depthBySid.get(current) ?? 0;
        const neighbors = adj.get(current) ?? [];
        for (const n of neighbors) {
            if (!aorSet.has(n) || depthBySid.has(n)) continue;
            depthBySid.set(n, currentDepth + 1);
            queue.push(n);
        }
    }

    let exact: SettlementId[] = [];
    let deeperDepth = Number.POSITIVE_INFINITY;
    let deeper: SettlementId[] = [];
    let shallowerDepth = -1;
    let shallower: SettlementId[] = [];

    for (const sid of aorSids) {
        const d = depthBySid.get(sid);
        if (d == null) continue;
        if (d === preferredDepth) {
            exact.push(sid);
            continue;
        }
        if (d > preferredDepth) {
            if (d < deeperDepth) {
                deeperDepth = d;
                deeper = [sid];
            } else if (d === deeperDepth) {
                deeper.push(sid);
            }
            continue;
        }
        if (d > shallowerDepth) {
            shallowerDepth = d;
            shallower = [sid];
        } else if (d === shallowerDepth) {
            shallower.push(sid);
        }
    }

    exact = exact.sort(strictCompare);
    deeper = deeper.sort(strictCompare);
    shallower = shallower.sort(strictCompare);
    if (exact.length > 0) return exact[0];
    if (deeper.length > 0) return deeper[0];
    if (shallower.length > 0) return shallower[0];
    return aorSids[0];
}

/**
 * Run formation HQ relocation: for any formation whose hq_sid is in enemy-controlled
 * territory, set hq_sid to a friendly settlement (same or nearest friendly mun).
 * Deterministic: formations and candidate lists sorted.
 */
export function runFormationHqRelocation(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    edges: EdgeRecord[]
): FormationHqRelocationReport {
    const pc = state.political_controllers ?? {};
    const formations = state.formations ?? {};
    const report: FormationHqRelocationReport = { relocated: 0, formation_ids: [] };

    const byMun = buildSettlementsByMun(settlements);
    const sidToMun = buildSidToMun(byMun);
    const munAdjacency = buildMunAdjacency(sidToMun, edges);
    const frontActive = identifyFrontActiveSettlements(state, edges);
    const adj = buildAdjacency(edges);
    const preferredHqRearDepth = 2;

    const formationIds = Object.keys(formations).sort(strictCompare);
    for (const id of formationIds) {
        const f = formations[id];
        if (!f || !f.hq_sid) continue;
        let changed = false;

        const controllerAtHq = pc[f.hq_sid] ?? null;
        if (controllerAtHq !== f.faction) {
            const newSid = findFriendlySettlement(
                pc,
                f.faction,
                byMun,
                sidToMun,
                munAdjacency,
                f.hq_sid
            );
            if (newSid && newSid !== f.hq_sid) {
                f.hq_sid = newSid;
                changed = true;
            }
        }

        // Phase II brigade rule: keep HQ synchronized with AoR depth as fronts shift.
        if (
            state.meta.phase === 'phase_ii' &&
            (f.kind ?? 'brigade') === 'brigade' &&
            f.status === 'active' &&
            state.brigade_aor
        ) {
            const aorSids = getBrigadeAoRSettlements(state, id as FormationId);
            const target = pickAoRDepthTarget(aorSids, frontActive, adj, preferredHqRearDepth);
            if (target && target !== f.hq_sid) {
                f.hq_sid = target;
                changed = true;
            }
        }

        if (changed) {
            report.relocated++;
            report.formation_ids.push(id as FormationId);
        }
    }
    report.formation_ids.sort(strictCompare);
    return report;
}
