/**
 * Post-run anomaly detection: pure functions that analyze final GameState.
 *
 * 12 detections covering combat tempo, formation health, territorial stability,
 * operational stagnation, and deployment coherence.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random, no timestamps.
 */

import type { GameState, FormationId } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import type { AnomalyReport } from './anomaly_types.js';

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
 * 4. brigade_never_fights (warning)
 * Active brigade with 0 battles in brigade_history.
 */
function detectBrigadeNeverFights(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const formations = state.military.formations;

    // Only flag after enough turns for combat to have occurred
    if (state.meta.turn < 10) return reports;

    const neverFought: string[] = [];
    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (f.status !== 'active') continue;
        if (!isBrigadeKind(f.kind)) continue;
        const battlesFought = f.brigade_history?.battles_fought ?? 0;
        if (battlesFought === 0) {
            neverFought.push(fid);
        }
    }

    if (neverFought.length > 0) {
        reports.push({
            category: 'deployment',
            severity: 'warning',
            type: 'brigade_never_fights',
            description: `${neverFought.length} active brigade(s) have 0 battles in brigade_history after ${state.meta.turn} turns.`,
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
        const op = cc.active_operation;
        if (!op) continue;
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
    }
    return reports;
}

/**
 * 8. empty_contested_sector (warning)
 * Sector with >0 front edges and 0 assigned+reserve brigades.
 */
function detectEmptyContestedSector(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const sectors = state.military.corps_front_sectors ?? {};

    const emptySectors: string[] = [];
    for (const sectorId of sortedKeys(sectors as Record<string, unknown>)) {
        const sector = sectors[sectorId];
        if (sector.edge_ids.length === 0) continue;
        const totalBrigades = sector.assigned_brigade_ids.length + sector.reserve_brigade_ids.length;
        if (totalBrigades === 0) {
            emptySectors.push(sectorId);
        }
    }

    if (emptySectors.length > 0) {
        reports.push({
            category: 'deployment',
            severity: 'warning',
            type: 'empty_contested_sector',
            description: `${emptySectors.length} sector(s) have front edges but 0 assigned or reserve brigades.`,
            entities: emptySectors,
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

    let attackerCasualties = 0;
    let defenderCasualties = 0;

    for (const fid of sortedKeys(formations as Record<string, unknown>)) {
        const f = formations[fid];
        if (!f.brigade_history) continue;
        for (const eng of f.brigade_history.engagements) {
            if (eng.role === 'attacker') {
                attackerCasualties += eng.casualties_taken;
            } else {
                defenderCasualties += eng.casualties_taken;
            }
        }
    }

    if (attackerCasualties > 0 || defenderCasualties > 0) {
        const ratio = defenderCasualties > 0 ? (attackerCasualties / defenderCasualties).toFixed(2) : 'N/A';
        reports.push({
            category: 'combat',
            severity: 'info',
            type: 'casualty_ratio_check',
            description: `Attacker casualties: ${attackerCasualties}, defender casualties: ${defenderCasualties}, ratio (att:def): ${ratio}.`,
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
 * Uses OperationAAR.total_attacks (aggregated from weekly_log) which persists in
 * state.operation_history after an operation ends. Orphaned ops are excluded because
 * their sector was dissolved, not because brigades failed to stage.
 */
function detectOperationZeroEligibleExecution(state: GameState): AnomalyReport[] {
    const reports: AnomalyReport[] = [];
    const opHistory = state.operation_history ?? [];

    for (const aar of opHistory.slice().sort((a, b) => strictCompare(a.operation_id, b.operation_id))) {
        if (aar.outcome === 'orphaned') continue;
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

// ── Public entry point ─────────────────────────────────────────────────

/**
 * Run all anomaly detections on the final GameState.
 * Returns a deterministically-ordered array of AnomalyReport.
 */
export function runAnomalyDetection(state: GameState): AnomalyReport[] {
    const detectors = [
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
    ];

    const results: AnomalyReport[] = [];
    for (const detect of detectors) {
        const anomalies = detect(state);
        for (const a of anomalies) {
            results.push(a);
        }
    }
    return results;
}
