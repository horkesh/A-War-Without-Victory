/**
 * Extended anomaly detection checks (#21-#26).
 *
 * Separated from anomaly_detector.ts to allow parallel development.
 * Each function takes GameState and returns AnomalyReport[].
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random, no timestamps.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GameState, FormationId } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import type { AnomalyReport } from './anomaly_types.js';
import { isGrazAccordsActive } from '../sim/local_truces.js';

// ── Helpers ────────────────────────────────────────────────────────────

function sortedKeys(obj: Record<string, unknown>): string[] {
    return Object.keys(obj).slice().sort(strictCompare);
}

/** True when a formation kind represents a brigade-level combat unit. */
function isBrigadeKind(kind: string | undefined): boolean {
    return kind === undefined || kind === 'brigade' || kind === 'operational_group';
}

// ── Check #21: morale_collapse_cluster ─────────────────────────────────

const CRITICAL_MORALE_THRESHOLD = 15;
const MORALE_CLUSTER_MIN = 3;

/**
 * 21. morale_collapse_cluster (warning, combat)
 * 3+ brigades in the same corps with morale below critical threshold (15).
 */
export function checkMoraleCollapseCluster(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;

    // Group active brigades by corps_id
    const corpsBrigades: Record<string, Array<{ id: FormationId; morale: number }>> = {};

    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        const cid = f.corps_id;
        if (!cid) continue;
        const morale = f.morale ?? 100;
        if (morale < CRITICAL_MORALE_THRESHOLD) {
            if (!corpsBrigades[cid]) corpsBrigades[cid] = [];
            corpsBrigades[cid].push({ id: fid, morale });
        }
    }

    for (const corpsId of sortedKeys(corpsBrigades as Record<string, unknown>)) {
        const criticalBrigades = corpsBrigades[corpsId];
        if (criticalBrigades.length < MORALE_CLUSTER_MIN) continue;

        // Determine faction from first brigade
        const faction = formations[criticalBrigades[0].id].faction;
        const detail = criticalBrigades
            .slice()
            .sort((a, b) => strictCompare(a.id, b.id))
            .map(b => `${b.id}(morale=${b.morale})`)
            .join(', ');

        reports.push({
            category: 'combat',
            severity: 'warning',
            type: 'morale_collapse_cluster',
            description: `Corps ${corpsId} (${faction}) has ${criticalBrigades.length} brigades with morale < ${CRITICAL_MORALE_THRESHOLD}: ${detail}.`,
            entities: [corpsId, ...criticalBrigades.map(b => b.id).sort(strictCompare)],
        });
    }

    return reports;
}

// ── Check #22: zero_combat_corps ───────────────────────────────────────

const ZERO_COMBAT_MIN_TURN = 10;

/**
 * 22. zero_combat_corps (warning, combat)
 * Corps with front sectors where ALL assigned brigades have 0 battles fought.
 * The dead-front detector.
 */
export function checkZeroCombatCorps(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const turn = state.meta.turn;
    if (turn <= ZERO_COMBAT_MIN_TURN) return reports;

    const formations = state.military.formations;
    const sectors = state.military.corps_front_sectors ?? {};

    // Identify corps that have sectors with front edges
    const corpsWithFronts: Record<string, { sectorCount: number; edgeCount: number }> = {};
    for (const sectorId of sortedKeys(sectors as Record<string, unknown>)) {
        const sector = sectors[sectorId];
        if (sector.edge_ids.length === 0) continue;
        const cid = sector.corps_id;
        if (!corpsWithFronts[cid]) corpsWithFronts[cid] = { sectorCount: 0, edgeCount: 0 };
        corpsWithFronts[cid].sectorCount++;
        corpsWithFronts[cid].edgeCount += sector.edge_ids.length;
    }

    // For each corps with fronts, check if any brigade has fought
    for (const corpsId of sortedKeys(corpsWithFronts as Record<string, unknown>)) {
        let totalBrigades = 0;
        let totalBattles = 0;
        let faction = '';

        for (const fid of sortedKeys(formations as Record<string, unknown>)) {
            const f = formations[fid];
            if (f.status !== 'active') continue;
            if (!isBrigadeKind(f.kind)) continue;
            if (f.corps_id !== corpsId) continue;
            totalBrigades++;
            if (!faction) faction = f.faction;
            const battlesAttacker = f.brigade_history?.battles_as_attacker ?? 0;
            const battlesDefender = f.brigade_history?.battles_as_defender ?? 0;
            totalBattles += battlesAttacker + battlesDefender;
        }

        if (totalBrigades > 0 && totalBattles === 0) {
            const info = corpsWithFronts[corpsId];
            reports.push({
                category: 'combat',
                severity: 'warning',
                type: 'zero_combat_corps',
                description: `Corps ${corpsId} (${faction}) has ${info.sectorCount} sector(s) with ${info.edgeCount} front edges and ${totalBrigades} brigades, but 0 battles fought after ${turn} turns. Dead front.`,
                entities: [corpsId],
            });
        }
    }

    return reports;
}

// ── Check #23: orphan_operation_brigades ────────────────────────────────

const MAX_ORPHAN_DISTANCE = 4;

/**
 * 23. orphan_operation_brigades (warning, operational)
 * Brigades assigned to an active operation but physically far from any
 * objective or staging OSID (>4 hops through friendly territory).
 */
export function checkOrphanOperationBrigades(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;
    const corpsCommand = state.military.corps_command ?? {};
    const politicalControllers = state.political.political_controllers ?? {};

    // Load OSID adjacency graph
    const graphPath = resolve(process.cwd(), 'data/derived/operational/operational_contact_graph.json');
    let adjacency: Map<string, string[]>;
    try {
        const raw = JSON.parse(readFileSync(graphPath, 'utf8'));
        const edges: Array<{ a: string; b: string }> = Array.isArray(raw) ? raw : (raw.edges ?? []);
        adjacency = new Map<string, string[]>();
        for (const e of edges) {
            if (!e?.a || !e?.b) continue;
            const listA = adjacency.get(e.a) ?? [];
            if (!listA.includes(e.b)) listA.push(e.b);
            adjacency.set(e.a, listA);
            const listB = adjacency.get(e.b) ?? [];
            if (!listB.includes(e.a)) listB.push(e.a);
            adjacency.set(e.b, listB);
        }
    } catch {
        // If graph cannot be loaded, skip this check silently.
        return reports;
    }

    // BFS through friendly territory from source to any target in targetSet.
    // Returns hop count or -1 if unreachable within MAX_ORPHAN_DISTANCE.
    function bfsFriendlyDistance(
        source: string,
        targetSet: Set<string>,
        friendlyFaction: string,
    ): { distance: number; nearest: string | null } {
        if (targetSet.has(source)) return { distance: 0, nearest: source };

        const visited = new Set<string>();
        visited.add(source);
        let queue: Array<{ osid: string; depth: number }> = [{ osid: source, depth: 0 }];

        while (queue.length > 0) {
            const nextQueue: Array<{ osid: string; depth: number }> = [];
            for (const { osid, depth } of queue) {
                if (depth >= MAX_ORPHAN_DISTANCE) continue;
                const neighbors = adjacency.get(osid) ?? [];
                for (const n of neighbors) {
                    if (visited.has(n)) continue;
                    visited.add(n);

                    // Only traverse friendly territory
                    const controller = politicalControllers[n];
                    if (controller !== friendlyFaction) continue;

                    if (targetSet.has(n)) {
                        return { distance: depth + 1, nearest: n };
                    }
                    nextQueue.push({ osid: n, depth: depth + 1 });
                }
            }
            queue = nextQueue;
        }

        return { distance: -1, nearest: null };
    }

    // Process each active operation in execution phase
    for (const corpsId of sortedKeys(corpsCommand as Record<string, unknown>)) {
        const cc = corpsCommand[corpsId];
        for (const op of cc.active_operations) {
        if (op.phase !== 'execution') continue;

        // Collect all relevant OSIDs: staging + objectives from axes and legacy flat fields
        const targetOsids = new Set<string>();
        if (op.staging_osid) targetOsids.add(op.staging_osid);
        if (op.objectives) {
            for (const obj of op.objectives) targetOsids.add(obj);
        }
        if (op.axes) {
            for (const axis of op.axes) {
                if (axis.staging_osid) targetOsids.add(axis.staging_osid);
                for (const obj of axis.objectives) targetOsids.add(obj);
            }
        }

        if (targetOsids.size === 0) continue;

        // Determine faction from the first participating brigade
        let opFaction = '';
        for (const bid of op.participating_brigades) {
            const f = formations[bid];
            if (f) { opFaction = f.faction; break; }
        }
        if (!opFaction) continue;

        // Check each participating brigade
        const orphans: Array<{ brigadeId: string; locationOsid: string; nearest: string | null; distance: number }> = [];

        for (const bid of op.participating_brigades.slice().sort(strictCompare)) {
            const f = formations[bid];
            if (!f) continue;
            if (f.status !== 'active') continue;
            const loc = f.location_osid;
            if (!loc) continue;

            const result = bfsFriendlyDistance(loc, targetOsids, opFaction);
            if (result.distance === -1 || result.distance > MAX_ORPHAN_DISTANCE) {
                orphans.push({
                    brigadeId: bid,
                    locationOsid: loc,
                    nearest: result.nearest,
                    distance: result.distance,
                });
            }
        }

        for (const o of orphans) {
            const distLabel = o.distance === -1 ? 'unreachable' : `${o.distance} hops`;
            const nearestLabel = o.nearest ?? 'none';
            reports.push({
                category: 'operational',
                severity: 'warning',
                type: 'orphan_operation_brigades',
                description: `Brigade ${o.brigadeId} in operation "${op.name}" (corps ${corpsId}) is at ${o.locationOsid}, ${distLabel} from nearest objective/staging (nearest: ${nearestLabel}).`,
                turn: op.started_turn,
                entities: [op.name, o.brigadeId, o.locationOsid],
            });
        }
        } // end for-of active_operations
    }

    return reports;
}

// ── Check #24: ghost_paramilitary_personnel ───────────────────────────

/**
 * 24. ghost_paramilitary_personnel (warning, deployment)
 * Inactive/disbanded paramilitary formations still carrying personnel > 0.
 * Inflates faction troop strength reports.
 */
export function checkGhostParamilitaryPersonnel(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;
    const ghosts: Array<{ id: string; faction: string; personnel: number }> = [];

    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.kind !== 'paramilitary') continue;
        if (f.status === 'active') continue;
        if ((f.personnel ?? 0) > 0) {
            ghosts.push({ id: fid, faction: f.faction, personnel: f.personnel ?? 0 });
        }
    }

    if (ghosts.length > 0) {
        const totalGhostPersonnel = ghosts.reduce((sum, g) => sum + g.personnel, 0);
        const byFaction: Record<string, number> = {};
        for (const g of ghosts) {
            byFaction[g.faction] = (byFaction[g.faction] ?? 0) + g.personnel;
        }
        const factionDetail = sortedKeys(byFaction as Record<string, unknown>)
            .map(f => `${f}=${byFaction[f]}`)
            .join(', ');
        reports.push({
            category: 'deployment',
            severity: 'warning',
            type: 'ghost_paramilitary_personnel',
            description: `${ghosts.length} inactive paramilitary formation(s) carry ${totalGhostPersonnel} ghost personnel (${factionDetail}). Inflates troop strength.`,
            entities: ghosts.map(g => g.id).sort(strictCompare),
        });
    }

    return reports;
}

// ── Check #25: offensive_intel_blindness ──────────────────────────────

const INTEL_BLINDNESS_MIN_TURN = 20;

/**
 * 25. offensive_intel_blindness (warning, operational)
 * After 20+ weeks of war, if offensive_signs is false on ALL sector intel
 * records, the defensive intelligence loop is dead. Defenders receive
 * zero warning about enemy staging.
 */
export function checkOffensiveIntelBlindness(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const turn = state.meta.turn;
    if (turn <= INTEL_BLINDNESS_MIN_TURN) return reports;

    const sectorIntel = state.military.sector_intel;
    if (!sectorIntel) return reports;

    let totalRecords = 0;
    let signsDetected = 0;

    for (const sectorId of sortedKeys(sectorIntel as Record<string, unknown>)) {
        const records = sectorIntel[sectorId];
        if (!records) continue;
        for (const rec of records) {
            totalRecords++;
            if (rec.offensive_signs) signsDetected++;
        }
    }

    if (totalRecords > 0 && signsDetected === 0) {
        reports.push({
            category: 'operational',
            severity: 'warning',
            type: 'offensive_intel_blindness',
            description: `0/${totalRecords} sector intel records have offensive_signs=true after ${turn} turns. Defensive intelligence loop is dead — no faction detects enemy staging.`,
            entities: [],
        });
    }

    return reports;
}

// ── Check #26: weaker_faction_attack_imbalance ───────────────────────

/**
 * 26. weaker_faction_attack_imbalance (warning, faction)
 * A faction with lower average equipment ratio is issuing more offensive
 * orders than a faction with higher equipment. The weaker side should
 * emergently attack less, not more.
 */
export function checkWeakerFactionAttackImbalance(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;
    const operationHistory = state.operation_history ?? [];

    // Count non-probe offensive orders per faction from operation AARs
    const ordersByFaction: Record<string, number> = {};
    for (const aar of operationHistory) {
        if (aar.type === 'probe' || aar.type === 'feint') continue;
        const fac = aar.faction;
        if (!fac) continue;
        ordersByFaction[fac] = (ordersByFaction[fac] ?? 0) + 1;
    }

    // Compute average equipment score per faction from active brigades
    const equipByFaction: Record<string, { sum: number; count: number }> = {};
    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        if (f.kind === 'paramilitary') continue;
        const fac = f.faction;
        if (!fac) continue;
        if (!equipByFaction[fac]) equipByFaction[fac] = { sum: 0, count: 0 };
        const classScore: Record<string, number> = {
            heavy: 1.5, mechanized: 1.2, motorized: 1.0, light: 0.5, infantry: 0.4,
        };
        const score = classScore[f.equipment_class ?? 'infantry'] ?? 0.4;
        equipByFaction[fac].sum += score;
        equipByFaction[fac].count++;
    }

    const factions = sortedKeys(ordersByFaction as Record<string, unknown>)
        .filter(f => equipByFaction[f] && equipByFaction[f].count > 0);

    for (let i = 0; i < factions.length; i++) {
        for (let j = i + 1; j < factions.length; j++) {
            const fA = factions[i];
            const fB = factions[j];
            const avgA = equipByFaction[fA].sum / equipByFaction[fA].count;
            const avgB = equipByFaction[fB].sum / equipByFaction[fB].count;
            const ordersA = ordersByFaction[fA] ?? 0;
            const ordersB = ordersByFaction[fB] ?? 0;

            const equipGap = Math.abs(avgA - avgB) / Math.max(avgA, avgB);
            if (equipGap < 0.20) continue;

            const weaker = avgA < avgB ? fA : fB;
            const stronger = avgA < avgB ? fB : fA;
            const weakerOrders = weaker === fA ? ordersA : ordersB;
            const strongerOrders = stronger === fA ? ordersA : ordersB;
            const weakerAvg = weaker === fA ? avgA : avgB;
            const strongerAvg = stronger === fA ? avgA : avgB;

            if (weakerOrders > strongerOrders && weakerOrders > 0) {
                reports.push({
                    category: 'faction',
                    severity: 'warning',
                    type: 'weaker_faction_attack_imbalance',
                    description: `${weaker} (avg equip ${weakerAvg.toFixed(2)}) issued ${weakerOrders} offensive orders vs ${stronger} (avg equip ${strongerAvg.toFixed(2)}) with ${strongerOrders}. Weaker faction attacking more than stronger — emergent decision-making failure.`,
                    entities: [weaker, stronger],
                });
            }
        }
    }

    return reports;
}

// ── Check #27: undefended_painted_mismatch ──────────────────────────────

const PAINTED_CONTROL_PATH = 'data/source/calibration/painted_control_jan1993.json';
const UNDEFENDED_MISMATCH_CRITICAL_THRESHOLD = 100;

/**
 * 27. undefended_painted_mismatch (warning/critical, territorial)
 * OSIDs where the sim controller differs from the painted target AND the
 * sim-controlling faction has ZERO brigades located at that OSID.
 * Territory held purely by inertia — nobody defending it, nobody walking in.
 */
export function checkUndefendedPaintedMismatch(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const politicalControllers = state.political.political_controllers ?? {};

    // Load painted targets
    let paintedCtrl: Record<string, string>;
    try {
        const paintedPath = resolve(process.cwd(), PAINTED_CONTROL_PATH);
        const raw = JSON.parse(readFileSync(paintedPath, 'utf8'));
        paintedCtrl = raw.by_settlement_id;
        if (!paintedCtrl) return reports;
    } catch {
        // If painted control file cannot be loaded, skip silently.
        return reports;
    }

    // Build OSID → set of factions with active brigades present
    const formations = state.military.formations;
    const osidBrigadeFactions = new Map<string, Set<string>>();
    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        const loc = f.location_osid;
        if (!loc) continue;
        const set = osidBrigadeFactions.get(loc) ?? new Set<string>();
        set.add(f.faction);
        osidBrigadeFactions.set(loc, set);
    }

    const undefended: Array<{ osid: string; simFaction: string; paintedFaction: string }> = [];

    for (const osid of sortedKeys(paintedCtrl as Record<string, unknown>)) {
        const painted = paintedCtrl[osid];
        const sim = politicalControllers[osid];
        if (!sim || !painted) continue;
        if (sim === painted) continue;

        // Mismatch: check if the sim-controlling faction has any brigade here
        const factionsPresent = osidBrigadeFactions.get(osid);
        const hasDefender = factionsPresent != null && factionsPresent.has(sim);
        if (!hasDefender) {
            undefended.push({ osid, simFaction: sim, paintedFaction: painted });
        }
    }

    if (undefended.length > 0) {
        undefended.sort((a, b) => strictCompare(a.osid, b.osid));
        const severity = undefended.length >= UNDEFENDED_MISMATCH_CRITICAL_THRESHOLD ? 'critical' : 'warning';
        const detail = undefended.slice(0, 10).map(u =>
            `${u.osid} (sim=${u.simFaction}, painted=${u.paintedFaction})`
        ).join(', ');
        const suffix = undefended.length > 10 ? `, ... +${undefended.length - 10} more` : '';
        reports.push({
            category: 'territorial',
            severity,
            type: 'undefended_painted_mismatch',
            description: `${undefended.length} OSID(s) differ from painted targets with 0 defending brigades (inertia territory): ${detail}${suffix}.`,
            entities: undefended.map(u => u.osid),
        });
    }

    return reports;
}

// ── Check #28: adjacent_uncontested_territory ───────────────────────────

/**
 * 28. adjacent_uncontested_territory (warning, territorial)
 * OSIDs controlled by faction Y with ZERO brigades present, where faction X
 * has 1+ brigades at an adjacent OSID. Excludes cold fronts (RS↔HRHB under
 * Graz Accords). Catches "why aren't you walking in?" situations.
 */
export function checkAdjacentUncontestedTerritory(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const politicalControllers = state.political.political_controllers ?? {};
    const formations = state.military.formations;
    const grazActive = isGrazAccordsActive(state);

    // Load OSID adjacency graph
    const graphPath = resolve(process.cwd(), 'data/derived/operational/operational_contact_graph.json');
    let adjacency: Map<string, string[]>;
    try {
        const raw = JSON.parse(readFileSync(graphPath, 'utf8'));
        const edges: Array<{ a: string; b: string; min_dist?: number; shared_segments?: number }> = Array.isArray(raw) ? raw : (raw.edges ?? []);
        adjacency = new Map<string, string[]>();
        for (const e of edges) {
            if (!e?.a || !e?.b) continue;
            // Only shared-boundary edges (min_dist === 0 or absent).
            if (e.min_dist != null && e.min_dist > 0) continue;
            if (e.shared_segments != null && e.shared_segments === 0) continue;
            const listA = adjacency.get(e.a) ?? [];
            if (!listA.includes(e.b)) listA.push(e.b);
            adjacency.set(e.a, listA);
            const listB = adjacency.get(e.b) ?? [];
            if (!listB.includes(e.a)) listB.push(e.a);
            adjacency.set(e.b, listB);
        }
    } catch {
        return reports;
    }

    // Build OSID → set of factions with active brigades present
    const osidBrigadeFactions = new Map<string, Set<string>>();
    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        const loc = f.location_osid;
        if (!loc) continue;
        const set = osidBrigadeFactions.get(loc) ?? new Set<string>();
        set.add(f.faction);
        osidBrigadeFactions.set(loc, set);
    }

    const uncontested: Array<{ osid: string; controller: string; adjacentFaction: string; adjacentOsid: string }> = [];

    for (const osid of sortedKeys(politicalControllers as Record<string, unknown>)) {
        const controller = politicalControllers[osid];
        if (!controller) continue;

        // Skip if the controller has brigades here — it's defended
        const factionsHere = osidBrigadeFactions.get(osid);
        if (factionsHere && factionsHere.has(controller)) continue;

        // Check adjacent OSIDs for enemy brigades
        const neighbors = adjacency.get(osid) ?? [];
        let found = false;
        for (const adj of neighbors.slice().sort(strictCompare)) {
            if (found) break;
            const adjFactions = osidBrigadeFactions.get(adj);
            if (!adjFactions) continue;

            for (const adjFaction of [...adjFactions].sort(strictCompare)) {
                if (adjFaction === controller) continue; // same faction, not enemy

                // Cold front filter: RS↔HRHB under Graz Accords
                if (grazActive) {
                    const pair = [controller, adjFaction].sort(strictCompare);
                    if (pair[0] === 'HRHB' && pair[1] === 'RS') continue;
                }

                uncontested.push({
                    osid,
                    controller,
                    adjacentFaction: adjFaction,
                    adjacentOsid: adj,
                });
                found = true;
                break;
            }
        }
    }

    if (uncontested.length > 0) {
        uncontested.sort((a, b) => strictCompare(a.osid, b.osid));
        const detail = uncontested.slice(0, 10).map(u =>
            `${u.osid} (${u.controller}, no defenders) adj to ${u.adjacentOsid} (${u.adjacentFaction} brigade present)`
        ).join(', ');
        const suffix = uncontested.length > 10 ? `, ... +${uncontested.length - 10} more` : '';
        reports.push({
            category: 'territorial',
            severity: 'warning',
            type: 'adjacent_uncontested_territory',
            description: `${uncontested.length} OSID(s) have no defending brigades with enemy brigades at adjacent OSIDs: ${detail}${suffix}.`,
            entities: uncontested.map(u => u.osid),
        });
    }

    return reports;
}
