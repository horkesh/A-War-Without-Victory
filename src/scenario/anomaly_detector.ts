/**
 * Post-run anomaly detection: pure functions that analyze final GameState.
 *
 * 26 detections covering combat tempo, formation health, territorial stability,
 * operational stagnation, and deployment coherence.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random, no timestamps.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GameState, FormationId } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import type { AnomalyReport } from './anomaly_types.js';
import { checkMoraleCollapseCluster, checkZeroCombatCorps, checkOrphanOperationBrigades, checkGhostParamilitaryPersonnel, checkOffensiveIntelBlindness, checkWeakerFactionAttackImbalance, checkUndefendedPaintedMismatch, checkAdjacentUncontestedTerritory } from './anomaly_checks_extended.js';
import { isSectorAssignmentExemptCorpsId } from '../sim/combat/corps_front_sectors_constants.js';
import { isSectorColdFront } from '../sim/combat/sector_utils.js';

// ── Helpers ────────────────────────────────────────────────────────────

function sortedKeys(obj: Record<string, unknown>): string[] {
    return Object.keys(obj).slice().sort(strictCompare);
}

/** OSID format is "op:municipality:slug" — extract municipality segment. */
function munFromOsid(osid: string): string {
    const parts = osid.split(':');
    return parts.length >= 2 ? parts[1] : osid;
}

/** True when a formation kind represents a brigade-level combat unit. */
function isBrigadeKind(kind: string | undefined): boolean {
    return kind === undefined || kind === 'brigade' || kind === 'operational_group';
}

type NeverFightsSubtype =
    | 'loan'
    | 'operation_participant'
    | 'sector_front'
    | 'sector_reserve'
    | 'sector_rear'
    | 'sector_owned';

const NEVER_FIGHTS_SUBTYPE_ORDER: NeverFightsSubtype[] = [
    'loan',
    'operation_participant',
    'sector_front',
    'sector_reserve',
    'sector_rear',
    'sector_owned',
];

function buildActiveOperationParticipantSet(state: GameState): Set<string> {
    const participants = new Set<string>();
    const corpsCommand = state.military.corps_command ?? {};
    for (const corpsId of sortedKeys(corpsCommand as Record<string, unknown>)) {
        const command = corpsCommand[corpsId] as Record<string, any>;
        for (const operation of command?.active_operations ?? []) {
            for (const brigadeId of operation?.participating_brigades ?? []) {
                if (typeof brigadeId === 'string' && brigadeId.length > 0) {
                    participants.add(brigadeId);
                }
            }
        }
    }
    return participants;
}

function describeNeverFightsSubtype(subtype: NeverFightsSubtype): string {
    switch (subtype) {
        case 'loan':
            return 'loaned elite/general-staff brigade(s)';
        case 'operation_participant':
            return 'active operation participant brigade(s)';
        case 'sector_front':
            return 'sector-front brigade(s)';
        case 'sector_reserve':
            return 'sector reserve/rear-support brigade(s)';
        case 'sector_rear':
            return 'sector-rear brigade(s)';
        case 'sector_owned':
            return 'sector-owned brigade(s)';
    }
}

function getAssignedSector(state: GameState, formation: Record<string, any>) {
    const sectorId = formation.assignment?.kind === 'sector'
        ? formation.assignment.sector_id
        : null;
    if (!sectorId) return null;
    return state.military.corps_front_sectors?.[sectorId] ?? null;
}

function getSectorFrontOsids(sector: Record<string, any> | null | undefined): Set<string> {
    const front = new Set<string>();
    for (const subSegment of sector?.sub_segments ?? []) {
        for (const osid of subSegment?.friendly_osids ?? []) {
            if (typeof osid === 'string' && osid.length > 0) front.add(osid);
        }
    }
    return front;
}

function isSameCorpsSharedFrontKnotStack(
    osid: string,
    brigades: string[],
    formations: Record<string, any>,
    sectors: Record<string, any>,
): boolean {
    const assignments = brigades.map((bid) => formations[bid]?.assignment ?? null);
    if (assignments.length === 0) return false;
    if (!assignments.every((assignment) =>
        assignment?.kind === 'sector'
        && assignment?.role === 'front'
        && typeof assignment?.sector_id === 'string')) {
        return false;
    }

    const sectorIds = [...new Set(assignments.map((assignment) => assignment.sector_id as string))].sort(strictCompare);
    if (sectorIds.length <= 1) return false;

    const claimedSectors = sectorIds
        .map((sectorId) => sectors[sectorId] ?? null)
        .filter((sector): sector is Record<string, any> => sector != null);
    if (claimedSectors.length !== sectorIds.length) return false;

    const corpsIds = [...new Set(claimedSectors.map((sector) => sector.corps_id).filter((corpsId) => typeof corpsId === 'string'))];
    if (corpsIds.length !== 1) return false;

    return claimedSectors.every((sector) => getSectorFrontOsids(sector).has(osid));
}

function isLoanedArmyHqRearSupportStack(
    osid: string,
    brigades: string[],
    formations: Record<string, any>,
    sectors: Record<string, any>,
): boolean {
    const assignments = brigades.map((bid) => formations[bid]?.assignment ?? null);
    if (assignments.length === 0) return false;
    if (!assignments.every((assignment) =>
        assignment?.kind === 'sector'
        && assignment?.role !== 'front'
        && typeof assignment?.sector_id === 'string')) {
        return false;
    }

    const sectorIds = [...new Set(assignments.map((assignment) => assignment.sector_id as string))];
    if (sectorIds.length !== 1) return false;

    const [sectorId] = sectorIds;
    if (!sectorId) return false;
    const sector = sectors[sectorId] ?? null;
    if (!sector) return false;
    if (!(sector.territory_osids ?? []).includes(osid)) return false;
    if (getSectorFrontOsids(sector).has(osid)) return false;

    return brigades.some((bid) => {
        const formation = formations[bid];
        return !!formation?.elite_loan_state?.on_loan
            && isSectorAssignmentExemptCorpsId(formation?.corps_id);
    });
}

function isLowDensitySectorPhysicallyCoveredBySameCorps(state: GameState, sector: Record<string, any>): boolean {
    const ownBrigadeCount = (sector.assigned_brigade_ids?.length ?? 0) + (sector.reserve_brigade_ids?.length ?? 0);
    if (ownBrigadeCount > 0) return false;
    const frontOsids = [...getSectorFrontOsids(sector)].sort(strictCompare);
    if (frontOsids.length === 0) return false;
    return frontOsids.every((osid) => {
        const sectors = state.military.corps_front_sectors ?? {};
        const formations = state.military.formations ?? {};
        for (const brigadeId of sortedKeys(formations as Record<string, unknown>)) {
            const formation = formations[brigadeId] as Record<string, any>;
            if (formation?.status !== 'active') continue;
            if (!isBrigadeKind(formation?.kind)) continue;
            if (formation?.location_osid !== osid) continue;
            if (formation?.faction !== sector.faction) continue;

            const assignment = formation?.assignment;
            if (assignment?.kind !== 'sector' || assignment?.role !== 'front') continue;
            if (typeof assignment?.sector_id !== 'string') continue;
            if (assignment.sector_id === sector.sector_id) continue;

            const assignedSector = sectors[assignment.sector_id] as Record<string, any> | undefined;
            if (!assignedSector) continue;
            if (assignedSector.corps_id !== sector.corps_id) continue;
            if (assignedSector.faction !== sector.faction) continue;
            if (!getSectorFrontOsids(assignedSector).has(osid)) continue;
            return true;
        }
        return false;
    });
}

const FRONTLINE_DENSITY_WARNING_MIN_THREAT = 50;

/** Load OSID adjacency graph from operational_contact_graph.json. Returns null on failure. */
function loadOsidAdjacency(): Map<string, string[]> | null {
    const graphPath = resolve(process.cwd(), 'data/derived/operational/operational_contact_graph.json');
    try {
        const raw = JSON.parse(readFileSync(graphPath, 'utf8'));
        const edges: Array<{ a: string; b: string; min_dist?: number; shared_segments?: number }> = Array.isArray(raw) ? raw : (raw.edges ?? []);
        const adjacency = new Map<string, string[]>();
        for (const e of edges) {
            if (!e?.a || !e?.b) continue;
            // Only use shared-boundary edges (min_dist === 0 or absent).
            // Distance-contact edges (min_dist > 0) can bridge across enemy territory.
            if (e.min_dist != null && e.min_dist > 0) continue;
            // Skip point-only contacts (single shared vertex, no boundary segment).
            if (e.shared_segments != null && e.shared_segments === 0) continue;
            const listA = adjacency.get(e.a) ?? [];
            if (!listA.includes(e.b)) listA.push(e.b);
            adjacency.set(e.a, listA);
            const listB = adjacency.get(e.b) ?? [];
            if (!listB.includes(e.a)) listB.push(e.a);
            adjacency.set(e.b, listB);
        }
        return adjacency;
    } catch {
        return null;
    }
}

// ── Detection functions ────────────────────────────────────────────────

/**
 * 1. battle_tempo_floor (critical)
 * Average < 1 battle/week across the run.
 */
function detectBattleTempoFloor(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;

    // Count from brigade_history (attacker side only to avoid double-counting).
    // turn_summaries is trimmed to last 3 turns so it cannot provide full-run totals.
    let totalBattles = 0;
    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.brigade_history) {
            totalBattles += f.brigade_history.battles_as_attacker;
        }
    }

    const totalTurns = state.meta.turn;
    if (totalTurns > 0) {
        const avg = totalBattles / totalTurns;
        if (avg < 1) {
            reports.push({
                category: 'combat',
                severity: 'critical',
                type: 'battle_tempo_floor',
                description: `Average battle tempo ${avg.toFixed(2)}/week across ${totalTurns} turns (minimum: 1.0). Total battles: ${totalBattles}.`,
            });
        }
    }
    return reports;
}

/**
 * 2. outcome_distribution_skew (warning)
 * >70% of battles are decisive_victory.
 */
function detectOutcomeDistributionSkew(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;

    let totalBattles = 0;
    let decisiveVictories = 0;

    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (!f.brigade_history) continue;
        for (const eng of f.brigade_history.engagements) {
            if (eng.role === 'attacker') {
                totalBattles++;
                if (eng.outcome === 'decisive_victory') {
                    decisiveVictories++;
                }
            }
        }
    }

    if (totalBattles > 0) {
        const ratio = decisiveVictories / totalBattles;
        if (ratio > 0.70) {
            reports.push({
                category: 'combat',
                severity: 'warning',
                type: 'outcome_distribution_skew',
                description: `${(ratio * 100).toFixed(1)}% of ${totalBattles} battles are decisive_victory (threshold: 70%). Combat may be too one-sided.`,
            });
        }
    }
    return reports;
}

/**
 * 3. zero_personnel_active (critical)
 * Formation with personnel=0 and status=active.
 */
function detectZeroPersonnelActive(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;

    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        const personnel = f.personnel ?? 0;
        if (personnel === 0) {
            reports.push({
                category: 'deployment',
                severity: 'critical',
                type: 'zero_personnel_active',
                description: `Formation ${fid} (${f.name}) is active with 0 personnel.`,
                entities: [fid],
            });
        }
    }
    return reports;
}

/**
 * 4. brigade_never_fights (info)
 * Active brigade with live sector/loan ownership outside cold fronts and 0 battles in brigade_history.
 */
function detectBrigadeNeverFights(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;

    // Only flag after enough turns for combat to have occurred
    if (state.meta.turn < 10) return reports;

    const activeOperationParticipants = buildActiveOperationParticipantSet(state);
    const neverFoughtBySubtype = new Map<NeverFightsSubtype, string[]>();
    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        const assignedSector = getAssignedSector(state, f as Record<string, any>);
        const onLoan = !!f.elite_loan_state?.on_loan
            && typeof f.elite_loan_state.loaned_to_corps === 'string';
        if (!assignedSector && !onLoan) continue;
        if (assignedSector && isSectorColdFront(state, assignedSector)) continue;
        const battlesFought = f.brigade_history?.battles_fought ?? 0;
        if (battlesFought === 0) {
            const subtype: NeverFightsSubtype = onLoan
                ? 'loan'
                : activeOperationParticipants.has(fid)
                    ? 'operation_participant'
                    : f.assignment?.role === 'front'
                        ? 'sector_front'
                        : f.assignment?.role === 'reserve'
                            ? 'sector_reserve'
                            : f.assignment?.role === 'rear'
                                ? 'sector_rear'
                                : 'sector_owned';
            const list = neverFoughtBySubtype.get(subtype) ?? [];
            list.push(fid);
            neverFoughtBySubtype.set(subtype, list);
        }
    }

    for (const subtype of NEVER_FIGHTS_SUBTYPE_ORDER) {
        const neverFought = neverFoughtBySubtype.get(subtype);
        if (!neverFought || neverFought.length === 0) continue;
        const descriptionPrefix = describeNeverFightsSubtype(subtype);
        reports.push({
            category: 'deployment',
            severity: 'info',
            type: 'brigade_never_fights',
            subtype,
            description: `${neverFought.length} ${descriptionPrefix} with live non-cold ownership have 0 battles in brigade_history after ${state.meta.turn} turns.`,
            entities: neverFought.slice().sort(strictCompare),
        });
    }
    return reports;
}

/**
 * 5. unlocated_formations (warning)
 * Active formation with no location_osid.
 */
function detectUnlocatedFormations(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;

    const unlocated: string[] = [];
    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        if (!f.location_osid) {
            unlocated.push(fid);
        }
    }

    if (unlocated.length > 0) {
        reports.push({
            category: 'deployment',
            severity: 'warning',
            type: 'unlocated_formations',
            description: `${unlocated.length} active brigade(s) have no location_osid.`,
            entities: unlocated.slice().sort(strictCompare),
        });
    }
    return reports;
}

/**
 * 6. osid_seesawing (warning)
 * OSID flips faction 3+ times (from control_events in political).
 */
function detectOsidSeesawing(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const controlEvents = state.political.control_events ?? [];

    // Count flips per OSID
    const flipCounts: Record<string, number> = {};
    for (const evt of controlEvents) {
        const osid = evt.settlement_id;
        flipCounts[osid] = (flipCounts[osid] ?? 0) + 1;
    }

    const seesawing: string[] = [];
    for (const osid of sortedKeys(flipCounts as Record<string, unknown>)) {
        if (flipCounts[osid] >= 3) {
            seesawing.push(osid);
        }
    }

    if (seesawing.length > 0) {
        reports.push({
            category: 'territorial',
            severity: 'warning',
            type: 'osid_seesawing',
            description: `${seesawing.length} OSID(s) flipped control 3+ times. Top: ${seesawing.slice(0, 5).map(o => `${o}(${flipCounts[o]})`).join(', ')}.`,
            entities: seesawing,
        });
    }
    return reports;
}

/**
 * 7. operation_stagnation (warning)
 * Operation in execution 4+ turns with 0 battles produced.
 */
function detectOperationStagnation(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const corpsCommand = state.military.corps_command ?? {};

    for (const corpsId of sortedKeys(corpsCommand as Record<string, unknown>)) {
        const cc = corpsCommand[corpsId];
        for (const op of cc.active_operations) {
        if (op.phase !== 'execution') continue;

        const turnsInExecution = state.meta.turn - op.phase_started_turn;
        if (turnsInExecution < 4) continue;

        // Check attack attempts across axes or legacy flat fields
        let totalAttempts = 0;
        if (op.axes && op.axes.length > 0) {
            for (const axis of op.axes) {
                totalAttempts += axis.attack_attempt_count;
            }
        } else {
            totalAttempts = op.attack_attempt_count ?? 0;
        }

        if (totalAttempts === 0) {
            reports.push({
                category: 'operational',
                severity: 'warning',
                type: 'operation_stagnation',
                description: `Operation "${op.name}" (corps ${corpsId}) has been in execution for ${turnsInExecution} turns with 0 attack attempts.`,
                turn: op.phase_started_turn,
                entities: [corpsId, op.name],
            });
        }
        } // end for-of active_operations
    }
    return reports;
}

/**
 * LANE-2026-05-02-B3-ANOMALY-SECTOR-SUBTYPE classifier.
 *
 * Classify whether a corps's empty/undefended sector or sub-segment is caused
 * by a genuinely thin brigade pool (`pool_exhausted`) or by misallocation of
 * available brigades (`misallocated`). Per /sector-expert Tier 1 finding on
 * n1621, these two root causes route to different specialists:
 *   - pool_exhausted → operations/formation expert (replacement pool)
 *   - misallocated   → corps-army-commander (rebalance)
 *
 * Heuristic: count active brigade-kind formations belonging to the corps,
 * subtract those already attached to any sector (assigned or reserve). If
 * surplus >= 1, the corps has unassigned brigades that could fill the gap.
 *
 * Read-only over GameState; deterministic via sortedKeys + strictCompare.
 */
function classifyCorpsBrigadeAvailability(
    state: GameState,
    corpsId: string,
): 'pool_exhausted' | 'misallocated' {
    const formations = state.military.formations as Record<string, any>;
    let activeBrigades = 0;
    for (const fid of sortedKeys(formations)) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        if (f.corps_id !== corpsId) continue;
        activeBrigades += 1;
    }
    const sectors = (state.military.corps_front_sectors ?? {}) as Record<string, any>;
    const sectorAssigned = new Set<string>();
    for (const sectorId of sortedKeys(sectors)) {
        const sec = sectors[sectorId];
        if (!sec || sec.corps_id !== corpsId) continue;
        for (const bid of sec.assigned_brigade_ids ?? []) sectorAssigned.add(bid);
        for (const bid of sec.reserve_brigade_ids ?? []) sectorAssigned.add(bid);
    }
    return activeBrigades > sectorAssigned.size ? 'misallocated' : 'pool_exhausted';
}

/**
 * 8. empty_contested_sector (warning)
 * Sector with >0 front edges and 0 assigned+reserve brigades.
 *
 * LANE-2026-05-02-B3: emits one report per `subtype` to distinguish
 * pool_exhausted (no surplus brigades anywhere in corps) from
 * misallocated (corps has surplus brigades sitting in other sectors).
 */
function detectEmptyContestedSector(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const sectors = state.military.corps_front_sectors ?? {};

    const emptyByCorps: Record<string, string[]> = {};
    for (const sectorId of sortedKeys(sectors as Record<string, unknown>)) {
        const sector = sectors[sectorId];
        if (sector.edge_ids.length === 0) continue;
        if (sector.unstaffed_front === true) continue;
        const totalBrigades = sector.assigned_brigade_ids.length + sector.reserve_brigade_ids.length;
        if (totalBrigades === 0) {
            const corpsId = sector.corps_id;
            if (!emptyByCorps[corpsId]) emptyByCorps[corpsId] = [];
            emptyByCorps[corpsId].push(sectorId);
        }
    }

    // Group by subtype across corps; emit one report per subtype found.
    const bySubtype: Record<'pool_exhausted' | 'misallocated', string[]> = {
        pool_exhausted: [],
        misallocated: [],
    };
    for (const corpsId of sortedKeys(emptyByCorps as Record<string, unknown>)) {
        const subtype = classifyCorpsBrigadeAvailability(state, corpsId);
        for (const sectorId of emptyByCorps[corpsId]) {
            bySubtype[subtype].push(sectorId);
        }
    }
    for (const subtype of ['misallocated', 'pool_exhausted'] as const) {
        const ids = bySubtype[subtype];
        if (ids.length === 0) continue;
        ids.sort(strictCompare);
        reports.push({
            category: 'deployment',
            severity: 'warning',
            type: 'empty_contested_sector',
            subtype,
            description: `${ids.length} sector(s) [${subtype}] have front edges but 0 assigned or reserve brigades.`,
            entities: ids,
        });
    }
    return reports;
}

/**
 * 9. corps_out_of_area (info)
 * Brigade location municipality != home municipality for >50% of corps' brigades.
 */
function detectCorpsOutOfArea(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;
    const corpsCommand = state.military.corps_command ?? {};

    // Build per-corps brigade lists
    const corpsBrigades: Record<string, FormationId[]> = {};
    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        const cid = f.corps_id;
        if (!cid) continue;
        if (!corpsBrigades[cid]) corpsBrigades[cid] = [];
        corpsBrigades[cid].push(fid);
    }

    for (const corpsId of sortedKeys(corpsBrigades as Record<string, unknown>)) {
        // Only report for corps that actually exist in corps_command
        if (!corpsCommand[corpsId]) continue;
        const brigades = corpsBrigades[corpsId];
        if (brigades.length === 0) continue;

        let outOfArea = 0;
        for (const bid of brigades) {
            const b = formations[bid];
            if (!b.home_osid || !b.location_osid) continue;
            const homeMun = munFromOsid(b.home_osid);
            const locMun = munFromOsid(b.location_osid);
            if (homeMun !== locMun) {
                outOfArea++;
            }
        }

        const ratio = outOfArea / brigades.length;
        if (ratio > 0.50) {
            reports.push({
                category: 'deployment',
                severity: 'info',
                type: 'corps_out_of_area',
                description: `Corps ${corpsId}: ${outOfArea}/${brigades.length} brigades (${(ratio * 100).toFixed(0)}%) are outside home municipality.`,
                entities: [corpsId],
            });
        }
    }
    return reports;
}

/**
 * 10. casualty_ratio_check (info)
 * Report attacker vs defender casualty totals. Informational only.
 */
function detectCasualtyRatio(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;

    let battleAttackerCas = 0;
    let battleDefenderCas = 0;
    let frictionCas = 0;

    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (!f.brigade_history) continue;
        for (const eng of f.brigade_history.engagements) {
            // Friction engagements use battle_id format "*:friction:*" — separate from attack resolution
            const isFriction = typeof eng.battle_id === 'string' && eng.battle_id.includes(':friction:');
            if (isFriction) {
                frictionCas += eng.casualties_taken;
            } else if (eng.role === 'attacker') {
                battleAttackerCas += eng.casualties_taken;
            } else {
                battleDefenderCas += eng.casualties_taken;
            }
        }
    }

    if (battleAttackerCas > 0 || battleDefenderCas > 0) {
        const ratio = battleDefenderCas > 0 ? (battleAttackerCas / battleDefenderCas).toFixed(2) : 'N/A';
        const frictionNote = frictionCas > 0 ? ` Frontline friction casualties (excluded): ${frictionCas}.` : '';
        reports.push({
            category: 'combat',
            severity: 'info',
            type: 'casualty_ratio_check',
            description: `Battle casualties — attacker: ${battleAttackerCas}, defender: ${battleDefenderCas}, ratio (att:def): ${ratio}.${frictionNote}`,
        });
    }
    return reports;
}

/**
 * 11. phantom_sector_advantage (critical)
 * Sector has front edges and 0 brigades but positive combat power —
 * any displayed force superiority is phantom / stale derived state.
 *
 * Checks both sector.defensive_power (on CorpsFrontSector directly) and
 * sector_combat_ratings[sectorId].defensive_power / offensive_power (if present).
 * An empty sector with positive power in either source is flagged.
 */
function detectPhantomSectorAdvantage(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const sectors = state.military.corps_front_sectors ?? {};
    const combatRatings = state.military.sector_combat_ratings ?? {};

    const phantom: Array<{ sectorId: string; corpsId: string; edgeCount: number; defensivePower: number; offensivePower: number }> = [];

    for (const sectorId of sortedKeys(sectors as Record<string, unknown>)) {
        const sector = sectors[sectorId];
        if (sector.edge_ids.length === 0) continue;

        const totalBrigades = sector.assigned_brigade_ids.length + sector.reserve_brigade_ids.length;
        if (totalBrigades > 0) continue;

        // Check power on the sector itself
        const sectorDefPow = sector.defensive_power ?? 0;

        // Check sector_combat_ratings entry if available
        const rating = combatRatings[sectorId];
        const ratingDefPow = rating?.defensive_power ?? 0;
        const ratingOffPow = rating?.offensive_power ?? 0;

        const maxPower = Math.max(sectorDefPow, ratingDefPow, ratingOffPow);

        if (maxPower > 0) {
            phantom.push({
                sectorId,
                corpsId: sector.corps_id,
                edgeCount: sector.edge_ids.length,
                defensivePower: Math.max(sectorDefPow, ratingDefPow),
                offensivePower: ratingOffPow,
            });
        }
    }

    for (const p of phantom.sort((a, b) => strictCompare(a.sectorId, b.sectorId))) {
        reports.push({
            category: 'deployment',
            severity: 'critical',
            type: 'phantom_sector_advantage',
            description: `Sector ${p.sectorId} (corps ${p.corpsId}) has ${p.edgeCount} front edges and 0 brigades — any displayed force superiority is phantom (def_power=${p.defensivePower.toFixed(1)}, off_power=${p.offensivePower.toFixed(1)}).`,
            entities: [p.sectorId, p.corpsId],
        });
    }
    return reports;
}

/**
 * 12. operation_zero_eligible_execution (warning)
 * A completed operation in operation_history (total_attacks === 0 and outcome !== 'orphaned')
 * means brigades never reached staging during any execution turn — the "eligible=0 stall" pattern.
 *
 * Uses OperationAAR.total_attacks (copied from operation/axis lifecycle counters,
 * with weekly-log fallback for old shapes) which persists in state.operation_history
 * after an operation ends. Orphaned ops are excluded because their sector was
 * dissolved, not because brigades failed to stage.
 */
function detectOperationZeroEligibleExecution(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const opHistory = state.operation_history ?? [];

    for (const aar of opHistory.slice().sort((a, b) => strictCompare(a.operation_id, b.operation_id))) {
        if (aar.outcome === 'orphaned') continue;
        const enteredExecution = (aar.weekly_log ?? []).some((entry) => entry.phase === 'execution');
        if (!enteredExecution) continue;
        // Consolidation-only successes: ops that captured objectives via rear_pocket_consolidation
        // without combat are intentional — not a staging failure.
        if (aar.outcome === 'success' && aar.objectives_captured.length > 0 && aar.total_attacks === 0) continue;
        if (aar.total_attacks > 0) continue;

        // Only flag operations that actually entered execution (duration > planning phase).
        // If duration_turns is 0 or 1 it may have been aborted in planning — skip those.
        if (aar.duration_turns < 2) continue;

        reports.push({
            category: 'operational',
            severity: 'warning',
            type: 'operation_zero_eligible_execution',
            description: `Operation "${aar.operation_name}" (corps ${aar.corps_id}, turns ${aar.started_turn}–${aar.ended_turn}, outcome: ${aar.outcome}) completed with 0 total attacks — brigades never reached staging during any execution turn.`,
            turn: aar.started_turn,
            entities: [aar.corps_id, aar.operation_name],
        });
    }
    return reports;
}

/**
 * 13. disconnected_sector_territory (critical)
 * Sector whose territory_osids form 2+ connected components via OSID adjacency.
 * A disconnected sector means the territory partition is broken — brigades cannot
 * reach parts of their own sector without crossing foreign territory.
 */
function detectDisconnectedSectorTerritory(state: GameState, adjacency: Map<string, string[]>): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const sectors = state.military.corps_front_sectors ?? {};

    for (const sectorId of sortedKeys(sectors as Record<string, unknown>)) {
        const sector = sectors[sectorId];
        const osids = sector.territory_osids;
        if (!osids || osids.length <= 1) continue;

        // BFS to find connected components within this sector's territory
        const osidSet = new Set(osids);
        const visited = new Set<string>();
        const componentSizes: number[] = [];

        for (const startOsid of osids.slice().sort(strictCompare)) {
            if (visited.has(startOsid)) continue;

            // BFS from startOsid within the sector's territory
            let size = 0;
            const queue: string[] = [startOsid];
            visited.add(startOsid);
            let head = 0;
            while (head < queue.length) {
                const current = queue[head++]!;
                size++;
                const neighbors = adjacency.get(current) ?? [];
                for (const n of neighbors) {
                    if (osidSet.has(n) && !visited.has(n)) {
                        visited.add(n);
                        queue.push(n);
                    }
                }
            }
            componentSizes.push(size);
        }

        if (componentSizes.length >= 2) {
            const sortedSizes = componentSizes.slice().sort((a, b) => b - a);
            reports.push({
                category: 'territorial',
                severity: 'critical',
                type: 'disconnected_sector_territory',
                description: `Sector ${sectorId} (corps ${sector.corps_id}, faction ${sector.faction}) has ${componentSizes.length} disconnected components (sizes: ${sortedSizes.join(', ')}). Territory OSIDs: ${osids.length}.`,
                entities: [sectorId, sector.corps_id, sector.faction],
            });
        }
    }
    return reports;
}

/**
 * 14. unassigned_frontline_brigades (critical)
 * Final-sector unresolved brigades that truly fell through the sector pipeline.
 * Canonical owner is `military.unresolved_sector_brigades`, populated by the
 * final sector truth builder/reconciliation pass.
 */
export function detectUnassignedFrontlineBrigades(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;
    const canonicalUnresolved = state.military.unresolved_sector_brigades ?? [];

    const unassigned: Array<{ id: string; corps: string; location: string }> = [];
    for (const fid of [...canonicalUnresolved].sort(strictCompare)) {
        const f = formations[fid];
        if (!f) continue;
        if (f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        if (!f.corps_id) continue;
        unassigned.push({ id: fid, corps: f.corps_id, location: f.location_osid ?? 'none' });
    }

    if (unassigned.length > 0) {
        unassigned.sort((a, b) => strictCompare(a.id, b.id));
        const detail = unassigned.slice(0, 10).map(u => `${u.id} (corps ${u.corps}, at ${u.location})`).join(', ');
        const suffix = unassigned.length > 10 ? `, ... +${unassigned.length - 10} more` : '';
        reports.push({
            category: 'deployment',
            severity: 'critical',
            type: 'unassigned_frontline_brigades',
            description: `${unassigned.length} active brigade(s) in corps with sectors are not assigned to any sector: ${detail}${suffix}.`,
            entities: unassigned.map(u => u.id),
        });
    }
    return reports;
}

/**
 * 15. rear_brigades_in_sector (warning)
 * Brigades assigned to a sector but physically NOT at any of the sector's frontline OSIDs.
 */
function detectRearBrigadesInSector(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;
    const sectors = state.military.corps_front_sectors ?? {};
    const corpsCommand = state.military.corps_command ?? {};
    const movementState = state.military.brigade_movement_state ?? {};

    // Collect brigades participating in active operations
    const opParticipants = new Set<string>();
    for (const corpsId of sortedKeys(corpsCommand as Record<string, unknown>)) {
        const cc = corpsCommand[corpsId];
        for (const op of cc.active_operations) {
            for (const bid of op.participating_brigades) opParticipants.add(bid);
        }
    }

    let totalAssigned = 0;
    const rearBrigades: Array<{ id: string; sector: string; location: string }> = [];

    for (const sectorId of sortedKeys(sectors as Record<string, unknown>)) {
        const sector = sectors[sectorId];

        // Flatten all frontline OSIDs from sub_segments
        const frontlineOsids = new Set<string>();
        for (const sub of sector.sub_segments) {
            for (const osid of sub.friendly_osids) frontlineOsids.add(osid);
        }

        for (const bid of sector.assigned_brigade_ids) {
            totalAssigned++;
            const f = formations[bid];
            if (!f) continue;
            // Exclusions
            if (opParticipants.has(bid)) continue;
            if ((f.disrupted_turns ?? 0) > 0) continue;
            // Check for active movement (brigade_movement_state)
            const ms = movementState[bid];
            if (ms && ms.status !== 'unpacking') continue; // packing or in_transit = marching

            const loc = f.location_osid;
            if (!loc) continue;
            if (!frontlineOsids.has(loc)) {
                rearBrigades.push({ id: bid, sector: sectorId, location: loc });
            }
        }
    }

    if (rearBrigades.length > 0 && totalAssigned > 0) {
        const pct = (rearBrigades.length / totalAssigned * 100).toFixed(1);
        if (rearBrigades.length / totalAssigned > 0.15) {
            rearBrigades.sort((a, b) => strictCompare(a.id, b.id));
            const detail = rearBrigades.slice(0, 10).map(r => `${r.id} at ${r.location} (sector ${r.sector})`).join(', ');
            const suffix = rearBrigades.length > 10 ? `, ... +${rearBrigades.length - 10} more` : '';
            reports.push({
                category: 'deployment',
                severity: 'warning',
                type: 'rear_brigades_in_sector',
                description: `${rearBrigades.length}/${totalAssigned} (${pct}%) assigned brigades are not at their sector's frontline OSIDs: ${detail}${suffix}.`,
                entities: rearBrigades.map(r => r.id),
            });
        }
    }
    return reports;
}

/**
 * 16. brigade_stacking (warning/info)
 * Multiple brigades at the same OSID, which should only happen in specific cases.
 */
function detectBrigadeStacking(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;
    const corpsCommand = state.military.corps_command ?? {};
    const sectors = state.military.corps_front_sectors ?? {};

    const osidSectorCoverage = new Map<string, Set<string>>();
    for (const sectorId of sortedKeys(sectors as Record<string, unknown>)) {
        const sector = sectors[sectorId];
        const coveredOsids = new Set<string>();
        for (const osid of sector.territory_osids ?? []) coveredOsids.add(osid);
        for (const subSegment of sector.sub_segments ?? []) {
            for (const osid of subSegment.friendly_osids ?? []) coveredOsids.add(osid);
        }
        for (const osid of [...coveredOsids].sort(strictCompare)) {
            const coveringSectors = osidSectorCoverage.get(osid) ?? new Set<string>();
            coveringSectors.add(sectorId);
            osidSectorCoverage.set(osid, coveringSectors);
        }
    }

    // Build OSID → brigade ID list
    const osidBrigades = new Map<string, string[]>();
    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        if (!f.location_osid) continue;
        const list = osidBrigades.get(f.location_osid) ?? [];
        list.push(fid);
        osidBrigades.set(f.location_osid, list);
    }

    // Collect operation participants and staging OSIDs
    const opBrigades = new Set<string>();
    const stagingOsids = new Set<string>();
    for (const corpsId of sortedKeys(corpsCommand as Record<string, unknown>)) {
        const cc = corpsCommand[corpsId];
        for (const op of cc.active_operations) {
            for (const bid of op.participating_brigades) opBrigades.add(bid);
            if (op.staging_osid) stagingOsids.add(op.staging_osid);
            if (op.axes) {
                for (const axis of op.axes) {
                    if (axis.staging_osid) stagingOsids.add(axis.staging_osid);
                }
            }
        }
    }

    const stacked: Array<{ osid: string; brigades: string[] }> = [];
    const sortedOsids = [...osidBrigades.keys()].sort(strictCompare);
    for (const osid of sortedOsids) {
        const brigades = osidBrigades.get(osid)!
            .filter((bid) => {
                const formation = formations[bid];
                const onLoan = formation?.elite_loan_state?.on_loan === true;
                return !(isSectorAssignmentExemptCorpsId(formation?.corps_id) && !onLoan && !formation?.assignment);
            });
        if (brigades.length < 2) continue;

        // Exempt: Sarajevo OSIDs
        if (osid.includes('sarajevo')) continue;

        // Exempt: staging OSIDs of active operations
        if (stagingOsids.has(osid)) continue;

        // Exempt: all brigades at this OSID are in the same active operation
        const allInSameOp = brigades.every(bid => opBrigades.has(bid));
        if (allInSameOp && brigades.length > 0) continue;

        // Exempt: all brigades at this OSID are frontline brigades of the same sector,
        // and that sector canonically covers this OSID.
        const assignments = brigades.map((bid) => formations[bid]?.assignment ?? null);
        const frontSectorIds = assignments.flatMap((assignment) =>
            assignment?.kind === 'sector'
            && assignment.role === 'front'
            && typeof assignment.sector_id === 'string'
                ? [assignment.sector_id]
                : []
        );
        const sameSectorFrontStack = assignments.length > 0
            && frontSectorIds.length === assignments.length
            && new Set(frontSectorIds).size === 1;
        if (sameSectorFrontStack) {
            const sectorId = assignments[0]?.sector_id;
            if (typeof sectorId === 'string' && osidSectorCoverage.get(osid)?.has(sectorId)) {
                continue;
            }
        }

        if (isSameCorpsSharedFrontKnotStack(osid, brigades, formations as Record<string, any>, sectors as Record<string, any>)) {
            continue;
        }

        if (isLoanedArmyHqRearSupportStack(osid, brigades, formations as Record<string, any>, sectors as Record<string, any>)) {
            continue;
        }

        stacked.push({ osid, brigades: brigades.slice().sort(strictCompare) });
    }

    if (stacked.length > 0) {
        const severity = stacked.length > 5 ? 'warning' : 'info';
        const detail = stacked.slice(0, 10).map(s => `${s.osid}(${s.brigades.length}: ${s.brigades.join(',')})`).join('; ');
        const suffix = stacked.length > 10 ? `; ... +${stacked.length - 10} more` : '';
        reports.push({
            category: 'deployment',
            severity,
            type: 'brigade_stacking',
            description: `${stacked.length} OSID(s) have 2+ brigades stacked (non-exempt): ${detail}${suffix}.`,
            entities: stacked.map(s => s.osid),
        });
    }
    return reports;
}

/**
 * 17. brigade_far_from_home (warning)
 * Active brigades far from their home_osid via friendly-territory BFS.
 * The drift problem that killed the Sarajevo siege.
 */
export function detectBrigadeFarFromHome(state: GameState, adjacency: Map<string, string[]>): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;
    const controllers = state.political?.political_controllers ?? {};
    const corpsCommand = state.military.corps_command ?? {};

    // Collect brigades participating in active operations
    const opParticipants = new Set<string>();
    for (const corpsId of sortedKeys(corpsCommand as Record<string, unknown>)) {
        const cc = corpsCommand[corpsId];
        for (const op of cc.active_operations) {
            for (const bid of op.participating_brigades) opParticipants.add(bid);
        }
    }

    const MAX_BFS_HOPS = 20;
    const DRIFT_THRESHOLD = 6;

    let eligible = 0;
    const redeployed: Array<{ id: string; home: string; location: string; distance: number; owner: string }> = [];
    const drifted: Array<{ id: string; home: string; location: string; distance: number }> = [];

    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        if (!f.home_osid || !f.location_osid) continue;
        if (opParticipants.has(fid)) continue;
        if ((f.disrupted_turns ?? 0) > 0) continue;

        eligible++;

        if (f.home_osid === f.location_osid) continue;

        // BFS from location_osid to home_osid through friendly territory
        const faction = f.faction;
        const target = f.home_osid;
        const start = f.location_osid;

        let found = false;
        let distance = -1;
        const visited = new Set<string>();
        const queue: Array<{ osid: string; dist: number }> = [{ osid: start, dist: 0 }];
        visited.add(start);

        let head = 0;
        while (head < queue.length) {
            const cur = queue[head++]!;
            if (cur.osid === target) {
                found = true;
                distance = cur.dist;
                break;
            }
            if (cur.dist >= MAX_BFS_HOPS) continue;

            const neighbors = adjacency.get(cur.osid) ?? [];
            for (const n of neighbors) {
                if (visited.has(n)) continue;
                // Only walk through friendly territory
                if (controllers[n] !== faction) continue;
                visited.add(n);
                queue.push({ osid: n, dist: cur.dist + 1 });
            }
        }

        const effectiveDistance = found ? distance : MAX_BFS_HOPS + 1;
        if (effectiveDistance <= DRIFT_THRESHOLD) continue;

        const assignment = f.assignment;
        const hasLiveSectorOwner = assignment?.kind === 'sector'
            && typeof assignment.sector_id === 'string'
            && (assignment.role === 'front' || assignment.role === 'reserve' || assignment.role === 'rear');
        const onLoan = !!f.elite_loan_state?.on_loan && typeof f.elite_loan_state.loaned_to_corps === 'string';
        const movementOrder = state.military.brigade_movement_orders?.[fid];
        const onHomeRecall = movementOrder?.destination_sids?.[0] === f.home_osid;
        const sectorlessReserve = isSectorAssignmentExemptCorpsId(f.corps_id) && !onLoan;

        if (hasLiveSectorOwner || onLoan || onHomeRecall) {
            redeployed.push({
                id: fid,
                home: target,
                location: start,
                distance: effectiveDistance,
                owner: onLoan
                    ? 'elite loan'
                    : onHomeRecall
                        ? 'home recall'
                        : `sector ${assignment?.role ?? 'owned'}`,
            });
            continue;
        }

        if (sectorlessReserve) continue;
        drifted.push({ id: fid, home: target, location: start, distance: effectiveDistance });
    }

    if (redeployed.length > 0) {
        redeployed.sort((a, b) => strictCompare(a.id, b.id));
        const pct = (redeployed.length / eligible * 100).toFixed(1);
        const detail = redeployed.slice(0, 10).map(d =>
            `${d.id} (${d.owner}, home=${d.home}, loc=${d.location}, dist=${d.distance > MAX_BFS_HOPS ? 'unreachable' : d.distance})`
        ).join(', ');
        const suffix = redeployed.length > 10 ? `, ... +${redeployed.length - 10} more` : '';
        reports.push({
            category: 'deployment',
            severity: 'info',
            type: 'brigade_far_from_home_redeployed',
            description: `${redeployed.length}/${eligible} (${pct}%) eligible brigades are >6 hops from home_osid but still have live sector/loan ownership: ${detail}${suffix}.`,
            entities: redeployed.map(d => d.id),
        });
    }

    if (drifted.length > 0) {
        drifted.sort((a, b) => strictCompare(a.id, b.id));
        const pct = (drifted.length / eligible * 100).toFixed(1);
        const detail = drifted.slice(0, 10).map(d =>
            `${d.id} (home=${d.home}, loc=${d.location}, dist=${d.distance > MAX_BFS_HOPS ? 'unreachable' : d.distance})`
        ).join(', ');
        const suffix = drifted.length > 10 ? `, ... +${drifted.length - 10} more` : '';
        reports.push({
            category: 'deployment',
            severity: 'warning',
            type: 'brigade_far_from_home_unassigned',
            description: `${drifted.length}/${eligible} (${pct}%) eligible brigades are >6 hops from home_osid with no live sector/loan owner: ${detail}${suffix}.`,
            entities: drifted.map(d => d.id),
        });
    }
    return reports;
}

/**
 * 18. frontline_density_imbalance (warning)
 * Sectors with dangerously low brigade density compared to their faction's median.
 * High density is force concentration, not a line-holding failure; physical
 * stacking and false ownership are covered by dedicated checks.
 */
function detectFrontlineDensityImbalance(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const sectors = state.military.corps_front_sectors ?? {};

    // Group sectors by faction, only those with >0 edges
    const factionSectors: Record<string, Array<{ sectorId: string; corpsId: string; density: number }>> = {};
    for (const sectorId of sortedKeys(sectors as Record<string, unknown>)) {
        const sector = sectors[sectorId];
        if (sector.edge_ids.length === 0) continue;
        if (isSectorColdFront(state, sector)) continue;
        const faction = sector.faction;
        if (!factionSectors[faction]) factionSectors[faction] = [];
        factionSectors[faction].push({
            sectorId,
            corpsId: sector.corps_id,
            density: sector.density,
        });
    }

    const flagged: Array<{ sectorId: string; corpsId: string; density: number; median: number; ratio: number; faction: string }> = [];

    for (const faction of sortedKeys(factionSectors as Record<string, unknown>)) {
        const sectorList = factionSectors[faction];
        if (sectorList.length < 2) continue;

        // Compute median density
        const densities = sectorList.map(s => s.density).sort((a, b) => a - b);
        const mid = Math.floor(densities.length / 2);
        const median = densities.length % 2 === 0
            ? (densities[mid - 1] + densities[mid]) / 2
            : densities[mid];

        if (median <= 0) continue;

        for (const s of sectorList) {
            const ratio = s.density / median;
            if (ratio < 1 / 3) {
                const sector = sectors[s.sectorId];
                if ((sector.threat_ratio ?? 0) < FRONTLINE_DENSITY_WARNING_MIN_THREAT) {
                    continue;
                }
                if (ratio < 1 / 3 && isLowDensitySectorPhysicallyCoveredBySameCorps(state, sector)) {
                    continue;
                }
                flagged.push({
                    sectorId: s.sectorId,
                    corpsId: s.corpsId,
                    density: s.density,
                    median,
                    ratio,
                    faction,
                });
            }
        }
    }

    if (flagged.length > 0) {
        flagged.sort((a, b) => strictCompare(a.sectorId, b.sectorId));
        const detail = flagged.slice(0, 10).map(f =>
            `${f.sectorId} (corps ${f.corpsId}, density=${f.density.toFixed(3)}, ${f.faction} median=${f.median.toFixed(3)}, ratio=${f.ratio.toFixed(1)}x)`
        ).join(', ');
        const suffix = flagged.length > 10 ? `, ... +${flagged.length - 10} more` : '';
        reports.push({
            category: 'deployment',
            severity: 'warning',
            type: 'frontline_density_imbalance',
            description: `${flagged.length} sector(s) have density <1/3 of faction median without same-corps physical coverage: ${detail}${suffix}.`,
            entities: flagged.map(f => f.sectorId),
        });
    }
    return reports;
}

/**
 * 19. undefended_front_subsegments (warning)
 * Sub-segments with gap=true that have many edges — large unmanned front sections.
 *
 * LANE-2026-05-02-B3: emits one report per `subtype` (pool_exhausted vs
 * misallocated) classified by the owning corps's brigade availability.
 */
function detectUndefendedFrontSubsegments(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const sectors = state.military.corps_front_sectors ?? {};

    const flagged: Array<{ subSegId: string; sectorId: string; corpsId: string; edgeCount: number }> = [];

    for (const sectorId of sortedKeys(sectors as Record<string, unknown>)) {
        const sector = sectors[sectorId];
        for (let i = 0; i < sector.sub_segments.length; i++) {
            const sub = sector.sub_segments[i];
            if (sub.gap === true && sub.edge_ids.length > 2) {
                flagged.push({
                    subSegId: sub.sub_segment_id ?? `${sectorId}:${i}`,
                    sectorId,
                    corpsId: sector.corps_id,
                    edgeCount: sub.edge_ids.length,
                });
            }
        }
    }

    if (flagged.length > 0) {
        flagged.sort((a, b) => strictCompare(a.subSegId, b.subSegId));
        // LANE-B3: group by subtype based on owning-corps brigade availability.
        const corpsSubtypeCache: Record<string, 'pool_exhausted' | 'misallocated'> = {};
        const bySubtype: Record<'pool_exhausted' | 'misallocated', typeof flagged> = {
            pool_exhausted: [],
            misallocated: [],
        };
        for (const f of flagged) {
            if (!(f.corpsId in corpsSubtypeCache)) {
                corpsSubtypeCache[f.corpsId] = classifyCorpsBrigadeAvailability(state, f.corpsId);
            }
            bySubtype[corpsSubtypeCache[f.corpsId]].push(f);
        }
        for (const subtype of ['misallocated', 'pool_exhausted'] as const) {
            const items = bySubtype[subtype];
            if (items.length === 0) continue;
            const detail = items.slice(0, 10).map(f =>
                `${f.subSegId} (sector ${f.sectorId}, corps ${f.corpsId}, ${f.edgeCount} edges)`
            ).join(', ');
            const suffix = items.length > 10 ? `, ... +${items.length - 10} more` : '';
            reports.push({
                category: 'deployment',
                severity: 'warning',
                type: 'undefended_front_subsegments',
                subtype,
                description: `${items.length} sub-segment(s) [${subtype}] are gap=true with >2 edges (unmanned front sections): ${detail}${suffix}.`,
                entities: items.map(f => f.subSegId),
            });
        }
    }
    return reports;
}

/**
 * 20. combat_ineffective_concentration (critical)
 * Corps where too many brigades are below combat effectiveness threshold (personnel < 400).
 */
function detectCombatIneffectiveConcentration(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;
    const sectors = state.military.corps_front_sectors ?? {};

    // Identify corps that HAVE sectors (skip exempt/logistics corps)
    const corpsWithSectors = new Set<string>();
    for (const sectorId of sortedKeys(sectors as Record<string, unknown>)) {
        corpsWithSectors.add(sectors[sectorId].corps_id);
    }

    // Group active brigades by corps_id
    const corpsBrigades: Record<string, { total: number; ineffective: number; faction: string }> = {};
    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        if (!f.corps_id) continue;
        if (!corpsWithSectors.has(f.corps_id)) continue;

        if (!corpsBrigades[f.corps_id]) {
            corpsBrigades[f.corps_id] = { total: 0, ineffective: 0, faction: f.faction };
        }
        corpsBrigades[f.corps_id].total++;
        if ((f.personnel ?? 0) < 400) {
            corpsBrigades[f.corps_id].ineffective++;
        }
    }

    const flagged: Array<{ corpsId: string; faction: string; total: number; ineffective: number; pct: number }> = [];
    for (const corpsId of sortedKeys(corpsBrigades as Record<string, unknown>)) {
        const c = corpsBrigades[corpsId];
        if (c.total === 0) continue;
        const pct = c.ineffective / c.total;
        if (pct > 0.55) {
            flagged.push({
                corpsId,
                faction: c.faction,
                total: c.total,
                ineffective: c.ineffective,
                pct,
            });
        }
    }

    for (const f of flagged.sort((a, b) => strictCompare(a.corpsId, b.corpsId))) {
        reports.push({
            category: 'combat',
            severity: 'critical',
            type: 'combat_ineffective_concentration',
            description: `Corps ${f.corpsId} (${f.faction}): ${f.ineffective}/${f.total} brigades (${(f.pct * 100).toFixed(0)}%) are below combat effectiveness (personnel < 400).`,
            entities: [f.corpsId],
        });
    }
    return reports;
}

/**
 * 29. cross_corps_sector_assignment (warning)
 * A brigade assigned to a sector whose corps_id does not match the brigade's own corps_id.
 * Root cause: sector Phase 2 BFS fills across corps boundaries when home OSIDs are in
 * enemy-held territory, claiming distant front edges and assigning foreign brigades to them.
 * Effect: foreign brigades become sector-coverage primary defenders in battles far from their
 * theater (e.g. arbih_215th Brčko brigade as primary defender at op:ilijas:sirovine), and
 * the homeland-defense morale absorption mechanic incorrectly applies because it is keyed
 * on the target OSID's co-ethnic share, not the defender's home municipality.
 * n1239: arbih_215th_vitezka_mountain (arbih_2nd_corps, home=op:brcko:bijela_2) was
 * sector-assigned to a vrs_sarajevo_romanija sector covering sirovine, causing decisive_victory
 * attacks to be absorbed by homelandAbsorbDecisive and preventing OSID transfer.
 */
function detectCrossCorpsSectorAssignment(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;
    const sectors = state.military.corps_front_sectors ?? {};

    const violations: Array<{
        brigadeId: string;
        brigadeFaction: string;
        brigadeCorps: string;
        sectorId: string;
        sectorCorps: string;
        sectorFaction: string;
        brigadeLocation: string;
        brigadeHome: string;
    }> = [];

    // Build a set of army_hq corps IDs — elite brigades belonging to army HQ are
    // intentionally loaned to subordinate corps sectors and are NOT a cross-assignment bug.
    const armyHqCorps = new Set<string>();
    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.kind === 'army_hq') armyHqCorps.add(fid);
    }

    for (const sectorId of sortedKeys(sectors as Record<string, unknown>)) {
        const sector = sectors[sectorId];
        const sectorCorps = sector.corps_id;
        const sectorFaction = sector.faction;

        // Check both assigned and reserve brigades — both participate in sector coverage defense.
        const allBrigadeIds = [
            ...(sector.assigned_brigade_ids ?? []),
            ...(sector.reserve_brigade_ids ?? []),
        ].sort(strictCompare);

        for (const bid of allBrigadeIds) {
            const f = formations[bid];
            if (!f) continue;
            if (f.status !== 'active') continue;
            if (!f.corps_id) continue;
            if (f.corps_id === sectorCorps) continue;
            // Army HQ brigades are only exempt when actively on loan to THIS sector's corps.
            // A brigade physically stationed in a distant sector without an active loan is a
            // real mis-assignment (e.g. rs_65th at op:foca assigned to vrs_sarajevo_romanija).
            if (armyHqCorps.has(f.corps_id)) {
                const loan = f.elite_loan_state;
                if (loan?.on_loan && loan.loaned_to_corps === sectorCorps) continue;
            }

            violations.push({
                brigadeId: bid,
                brigadeFaction: f.faction ?? 'unknown',
                brigadeCorps: f.corps_id,
                sectorId,
                sectorCorps,
                sectorFaction,
                brigadeLocation: f.location_osid ?? 'none',
                brigadeHome: f.home_osid ?? 'none',
            });
        }
    }

    if (violations.length === 0) return reports;

    violations.sort((a, b) => strictCompare(a.brigadeId, b.brigadeId));

    const detail = violations.slice(0, 15).map(v =>
        `${v.brigadeId} (corps=${v.brigadeCorps}, home=${v.brigadeHome}) in sector ${v.sectorId} (corps=${v.sectorCorps})`
    ).join('; ');
    const suffix = violations.length > 15 ? `; ... +${violations.length - 15} more` : '';

    reports.push({
        category: 'deployment',
        severity: 'warning',
        type: 'cross_corps_sector_assignment',
        description: `${violations.length} brigade(s) are assigned to sectors belonging to a different corps. Foreign-corps brigades become sector-coverage defenders in wrong theaters and receive incorrect homeland-defense bonuses: ${detail}${suffix}.`,
        entities: violations.map(v => v.brigadeId),
    });

    return reports;
}

// ── Public entry point ─────────────────────────────────────────────────

/**
 * Run all anomaly detections on the final GameState.
 * Returns a deterministically-ordered array of AnomalyReport.
 */
export function runAnomalyDetection(state: GameState): AnomalyReport[] {
    // Load OSID adjacency graph once for checks that need it (#13, #17).
    const adjacency = loadOsidAdjacency();

    const detectors: Array<(s: GameState) => AnomalyReport[]> = [
        detectBattleTempoFloor,
        detectOutcomeDistributionSkew,
        detectZeroPersonnelActive,
        detectBrigadeNeverFights,
        detectUnlocatedFormations,
        detectOsidSeesawing,
        detectOperationStagnation,
        detectEmptyContestedSector,
        detectCorpsOutOfArea,
        detectCasualtyRatio,
        detectPhantomSectorAdvantage,
        detectOperationZeroEligibleExecution,
        // #13 and #17 need adjacency — handled separately below
        detectUnassignedFrontlineBrigades,
        detectRearBrigadesInSector,
        detectBrigadeStacking,
        // #18, #19, #20 — standard signature
        detectFrontlineDensityImbalance,
        detectUndefendedFrontSubsegments,
        detectCombatIneffectiveConcentration,
        // #21, #22, #23 — extended checks (anomaly_checks_extended.ts)
        checkMoraleCollapseCluster,
        checkZeroCombatCorps,
        checkOrphanOperationBrigades,
        // #24, #25, #26 — n1194 investigation checks
        checkGhostParamilitaryPersonnel,
        checkOffensiveIntelBlindness,
        checkWeakerFactionAttackImbalance,
        // #27, #28 — territorial inertia checks
        checkUndefendedPaintedMismatch,
        checkAdjacentUncontestedTerritory,
        // #29 — cross-corps sector assignment (sector BFS boundary leak)
        detectCrossCorpsSectorAssignment,
    ];

    const results: AnomalyReport[] = [];
    for (const detect of detectors) {
        const anomalies = detect(state);
        for (const a of anomalies) {
            results.push(a);
        }
    }

    // Adjacency-dependent checks (#13, #17) — skip if graph failed to load
    if (adjacency) {
        for (const a of detectDisconnectedSectorTerritory(state, adjacency)) results.push(a);
        for (const a of detectBrigadeFarFromHome(state, adjacency)) results.push(a);
    }

    return results;
}
