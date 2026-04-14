/**
 * Stranded brigade lifecycle — autonomous garrison defense with gradual degradation.
 *
 * When a brigade is unreachable from any same-corps sector for 3+ consecutive turns,
 * it enters the stranded lifecycle:
 *   - Implicit defensive stance (defends if attacked, no operations, no movement)
 *   - Morale: -2/turn (isolation, no command structure)
 *   - Cohesion: -1/turn (supply difficulty, no rotation)
 *   - No reinforcement possible (cut off from recruitment)
 *   - No breakout attempts (historically unrealistic for BiH war)
 *
 * Resolution:
 *   - Reconnected: BFS reaches same-corps sector → clear stranded tag, resume normal pipeline
 *   - Collapsed: morale < 15 → dissolve (surrender/dispersal), generate snap event
 *   - Captured: OSID flips to enemy → destroyed via normal battle resolution
 *
 * Historical basis: Srebrenica (3 years isolated), Gorazde (degraded throughout),
 * Orasje (held via external supply), various VRS outposts.
 *
 * Canonical owner: this file. Called from war_phases.ts pipeline.
 */

import type { FormationId, FormationState, GameState } from '../../state/game_state.js';
import { emitRoutineConsoleWarn } from '../../utils/routine_console_diagnostics.js';
import { strictCompare } from '../../state/validateGameState.js';

const STRANDED_GRACE_TURNS = 3;
const STRANDED_MORALE_DECAY = 2;
const STRANDED_COHESION_DECAY = 1;
const STRANDED_COLLAPSE_MORALE = 15;

export interface StrandedBrigadeReport {
    newly_stranded: string[];
    reconnected: string[];
    collapsed: string[];
    degraded: string[];
}

/**
 * Check all active brigades for stranded status and apply lifecycle effects.
 *
 * Must run AFTER final sector truth reconciliation (needs authoritative sector lists).
 */
export function processStrandedBrigades(state: GameState): StrandedBrigadeReport {
    const report: StrandedBrigadeReport = {
        newly_stranded: [],
        reconnected: [],
        collapsed: [],
        degraded: [],
    };

    const turn = state.meta?.turn ?? 0;
    const formations = state.military?.formations ?? {};
    const sectors = state.military?.corps_front_sectors ?? {};

    // Build set of all brigades that are in any sector's lists (assigned or reserve)
    const sectorOwnedBrigades = new Set<string>();
    for (const sector of Object.values(sectors)) {
        if (!sector) continue;
        for (const bid of sector.assigned_brigade_ids ?? []) sectorOwnedBrigades.add(bid);
        for (const bid of sector.reserve_brigade_ids ?? []) sectorOwnedBrigades.add(bid);
    }

    // Also collect unresolved brigades — these are explicitly not in any sector
    const unresolvedSet = new Set<string>(state.military?.unresolved_sector_brigades ?? []);

    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid] as FormationState;
        if (!f || f.status !== 'active') continue;
        if (f.kind === 'corps' || f.kind === 'corps_asset' || f.kind === 'army_hq') continue;

        // Exempt: elite loan brigades, army HQ reserve
        if (f.elite_loan_state) continue;
        const corpsId = f.corps_id;
        if (!corpsId) continue;
        // Exempt: army HQ formations (main_staff, general_staff)
        if (corpsId.includes('main_staff') || corpsId.includes('general_staff')) continue;

        const isInSector = sectorOwnedBrigades.has(fid);
        const isUnresolved = unresolvedSet.has(fid);

        if (isInSector && !isUnresolved) {
            // Brigade is sector-owned — if it was stranded, reconnect
            if (f.stranded_since_turn != null) {
                f.stranded_since_turn = undefined;
                report.reconnected.push(fid);
                emitRoutineConsoleWarn(`[stranded] Reconnected ${fid} at turn ${turn}`);
            }
            continue;
        }

        // Brigade is NOT in any sector — track stranding duration
        if (f.stranded_since_turn == null) {
            // Not yet tagged — check if grace period should start
            // We use the unresolved list as the signal: if the brigade was removed from
            // sector assignment and is now floating, start counting
            if (isUnresolved || !isInSector) {
                // Don't tag immediately — the brigade might be reassigned next turn.
                // Only tag after STRANDED_GRACE_TURNS of continuous non-sector status.
                // For now, set the tag — the grace period is checked below.
                f.stranded_since_turn = turn;
            }
            continue;
        }

        // Brigade has stranded_since_turn set — check grace period
        const strandedDuration = turn - f.stranded_since_turn;
        if (strandedDuration < STRANDED_GRACE_TURNS) {
            continue; // Still in grace period — might be reassigned
        }

        // === STRANDED LIFECYCLE ACTIVE ===

        // Degrade morale and cohesion
        const oldMorale = f.morale ?? 60;
        const oldCohesion = f.cohesion ?? 60;
        f.morale = Math.max(0, oldMorale - STRANDED_MORALE_DECAY);
        f.cohesion = Math.max(0, oldCohesion - STRANDED_COHESION_DECAY);
        report.degraded.push(fid);

        // Check for collapse
        if ((f.morale ?? 0) < STRANDED_COLLAPSE_MORALE) {
            // Dissolve — brigade surrenders or disperses
            f.status = 'inactive';
            f.stranded_since_turn = undefined;
            report.collapsed.push(fid);
            emitRoutineConsoleWarn(`[stranded] COLLAPSED ${fid} at turn ${turn} — morale ${f.morale} below ${STRANDED_COLLAPSE_MORALE}`);

            // Record collapse in turn summaries for player visibility
            // (Turn summaries are the canonical per-turn event log consumed by Chronicle and inbox)
            if (!state.turn_summaries) state.turn_summaries = [];
            const turnSummary = state.turn_summaries.find((ts: any) => ts.turn === turn) as Record<string, unknown> | undefined;
            if (turnSummary) {
                if (!turnSummary.stranded_collapses) turnSummary.stranded_collapses = [];
                (turnSummary.stranded_collapses as Array<Record<string, unknown>>).push({
                    formation_id: fid,
                    formation_name: f.name,
                    faction: f.faction,
                    location_osid: f.location_osid,
                });
            }
        }
    }

    if (report.newly_stranded.length + report.reconnected.length + report.collapsed.length > 0) {
        emitRoutineConsoleWarn(`[stranded] Turn ${turn}: ${report.newly_stranded.length} new, ${report.reconnected.length} reconnected, ${report.collapsed.length} collapsed, ${report.degraded.length} degrading`);
    }

    return report;
}
