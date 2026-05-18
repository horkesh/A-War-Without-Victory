/**
 * Phase H1.1: Weekly report builder (derived only; NOT reloadable).
 * Do NOT add fields to GameState for reporting. Stable ordering throughout.
 */

import type { GameState, FormationId, FactionId } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import type { OperationCombatDiagnostic } from './combat_causality.js';
import type { CombatOutcome } from '../sim/combat/combat_math.js';
import type { Osid } from '../sim/combat/osid_adjacency.js';
import type { PublicIntelFrictionAnnotation } from '../sim/combat/attack_resolution_types.js';
import { getFactionLiveSupplyCondition } from '../sim/combat/supply_condition.js';

/** Phase H1.7: Per-week activity diagnostics (counts only; derived reporting). */
export interface WeeklyActivityCounts {
    front_active_set_size: number;
    pressure_eligible_size: number;
    displacement_trigger_eligible_size: number;
}

/** Per-faction compact corps AI summary for weekly report. */
export interface WeeklyCorpsSummaryEntry {
    faction: string;
    corps_count: number;
    offensive_targets_total: number;
    hold_osids_total: number;
    stances: Record<string, number>;
}

export interface WeeklyCombatCausalitySummary {
    valid_for_combat_calibration: boolean;
    total_attack_orders: number;
    total_objective_attempts: number;
    total_objective_captures: number;
    movement_only_execution_turns: number;
    total_battles: number;
    invalid_operation_count: number;
    zero_eligible_attacker_operation_count: number;
    recovery_without_logged_attempt_count: number;
    invalidation_reasons: string[];
}

export interface WeeklyControlChangeAttributionSummary {
    total_changes: number;
    combat: number;
    consolidation: number;
    abandoned: number;
    init_overrides: number;
    other: number;
}

export interface WeeklyBehavioralHealthSummary {
    valid_for_combat_calibration: boolean;
    combat_causality: WeeklyCombatCausalitySummary;
    control_change_attribution: WeeklyControlChangeAttributionSummary;
}

export interface WeeklyReportRow {
    week_index: number;
    phase: string | undefined;
    factions: Array<{ id: string; exhaustion: number; supply_pressure?: number; supply_condition?: number }>;
    control_counts: Record<string, number>;
    settlement_displacement_count: number;
    settlement_displacement_total: number;
    municipality_displacement_count: number;
    municipality_displacement_total: number;
    /** Phase H1.7: Activity diagnostics (counts only). Present when turn report provided. */
    activity?: WeeklyActivityCounts;
    /** Phase H1.9: Baseline ops (enabled + level) when baseline_ops action applied. */
    ops?: { enabled: boolean; level: number };
    /** Per-faction corps AI summary (war phase only). */
    corps_summary?: WeeklyCorpsSummaryEntry[];
    /** Combat-causality gate summary for this turn. */
    combat_causality?: WeeklyCombatCausalitySummary;
    /** Live control-change attribution for this turn. */
    control_change_attribution?: WeeklyControlChangeAttributionSummary;
    /** Grouped reporting family for combat and attribution health. */
    behavioral_health?: WeeklyBehavioralHealthSummary;
    /** Per-operation diagnostics for invalid-causality debugging. */
    operation_diagnostics?: OperationCombatDiagnostic[];
    /** Per-battle results from attack resolution (raw data for diagnostics). */
    battles?: WeeklyBattleEntry[];
    /** Brigade dissolution report — which brigades dissolved and why. */
    brigade_dissolution?: WeeklyDissolutionEntry[];
    /** Brigade reconstitution report — which brigades reformed from municipality manpower. */
    brigade_reconstitution?: WeeklyReconstitutionEntry[];
    /** Historical events that fired this turn (id + narrative text). */
    events_fired?: Array<{ id: string; text: string }>;
}

/** Compact per-dissolution entry persisted in weekly report. */
export interface WeeklyDissolutionEntry {
    id: string;
    name: string;
    faction: string;
    personnel_remaining: number;
    cohesion: number;
    morale: number;
    personnel_to_reserve: number;
}

/** Compact per-reconstitution entry persisted in weekly report. */
export interface WeeklyReconstitutionEntry {
    id: string;
    name: string;
    faction: string;
    corps_id: string;
    home_mun: string;
    personnel_spawned: number;
}

/** Compact per-battle entry persisted in weekly report for diagnostics. */
export interface WeeklyBattleEntry {
    /** Deterministic join key: {turn}:{osid}:{attacker_brigade}:{defender_brigade|null} */
    battle_id: string;
    attacker_brigade: FormationId;
    attacker_faction: FactionId;
    defender_faction: FactionId;
    target_osid: Osid;
    outcome: CombatOutcome;
    power_ratio: number;
    attacker_won: boolean;
    defender_brigade: FormationId | null;
    attacker_casualties: number;
    defender_casualties: number;
    /** Public-safe execution-friction annotation; no hidden enemy truth. */
    execution_friction?: PublicIntelFrictionAnnotation;
    /** Deterministic operation join key: {corps_id}:{op_name}:t{started_turn} */
    operation_id?: string;
    /** Human-readable operation name. */
    operation_name?: string;
}

function sortedKeys(obj: Record<string, unknown>): string[] {
    return Object.keys(obj).slice().sort(strictCompare);
}

/**
 * Build a compact derived report for one week. Stable ordering; no timestamps.
 * When activity is provided (from turn report), includes activity counts for diagnostics.
 */
export function buildWeeklyReport(
    state: GameState,
    activity?: WeeklyActivityCounts,
    ops?: { enabled: boolean; level: number },
    corpsSummary?: WeeklyCorpsSummaryEntry[],
    combatCausality?: WeeklyCombatCausalitySummary,
    controlChangeAttribution?: WeeklyControlChangeAttributionSummary,
    operationDiagnostics?: OperationCombatDiagnostic[],
    battles?: WeeklyBattleEntry[],
    dissolutionEntries?: WeeklyDissolutionEntry[],
    reconstitutionEntries?: WeeklyReconstitutionEntry[]
): WeeklyReportRow {
    const week_index = state.meta.turn;
    const phase = state.meta.phase;

    // war_exhaustion is the authoritative unbounded accumulator (Engine Invariants §8).
    // profile.exhaustion is a legacy normalized field used by older mechanics; do not read it here.
    const warExhaustion = state.political.war_exhaustion ?? {};
    const factions = (state.factions ?? []).map((f) => ({
        id: f.id,
        exhaustion: warExhaustion[f.id] ?? 0,
        supply_pressure: state.political.war_supply_pressure?.[f.id],
        supply_condition: getFactionLiveSupplyCondition(state, f.id)
    })).sort((a, b) => strictCompare(a.id, b.id));

    const control_counts: Record<string, number> = {};
    const pc = state.political.political_controllers ?? {};
    for (const sid of sortedKeys(pc as Record<string, unknown>)) {
        const c = pc[sid] ?? 'null';
        const key = c === null ? 'null' : c;
        control_counts[key] = (control_counts[key] ?? 0) + 1;
    }
    const control_counts_sorted: Record<string, number> = {};
    for (const k of sortedKeys(control_counts as Record<string, unknown>)) {
        control_counts_sorted[k] = control_counts[k];
    }

    let settlement_displacement_count = 0;
    let settlement_displacement_total = 0;
    let municipality_displacement_count = 0;
    let municipality_displacement_total = 0;

    if (state.meta?.phase === 'war' && state.displacement.displacement_state && typeof state.displacement.displacement_state === 'object') {
        // War displacement derivation: from displacement_state (displaced_out + lost_population)
        const ds = state.displacement.displacement_state;
        for (const munId of sortedKeys(ds as Record<string, unknown>)) {
            const d = ds[munId] as { displaced_out?: number; lost_population?: number } | undefined;
            const out = typeof d?.displaced_out === 'number' ? d.displaced_out : 0;
            const lost = typeof d?.lost_population === 'number' ? d.lost_population : 0;
            const total = out + lost;
            if (total > 0) {
                municipality_displacement_count += 1;
                municipality_displacement_total += total;
                settlement_displacement_total += total; // No per-settlement split in displacement_state; use municipality total as proxy.
            }
        }
        settlement_displacement_count = municipality_displacement_count; // 1:1 proxy when only municipality-level displacement is available.
    } else {
        const sd = state.displacement.settlement_displacement ?? {};
        for (const sid of sortedKeys(sd as Record<string, unknown>)) {
            const v = sd[sid];
            if (typeof v === 'number' && v > 0) {
                settlement_displacement_count += 1;
                settlement_displacement_total += v;
            }
        }
        const md = state.displacement.municipality_displacement ?? {};
        for (const mid of sortedKeys(md as Record<string, unknown>)) {
            const v = md[mid];
            if (typeof v === 'number' && v > 0) {
                municipality_displacement_count += 1;
                municipality_displacement_total += v;
            }
        }
        // System A (displacement_state) carries real displacement data used by war mechanics.
        // System C (settlement_displacement / municipality_displacement) is currently incomplete
        // (always 0) due to the OSID key mismatch in isPressureEligible fixed by Phase 0.
        // Only aggregate System A when System C produced nothing, to prevent double-counting
        // once System C is repaired and starts producing non-zero totals.
        if (municipality_displacement_total === 0 && state.displacement.displacement_state && typeof state.displacement.displacement_state === 'object') {
            const ds = state.displacement.displacement_state;
            for (const munId of sortedKeys(ds as Record<string, unknown>)) {
                const d = ds[munId] as { displaced_out?: number; lost_population?: number } | undefined;
                const out = typeof d?.displaced_out === 'number' ? d.displaced_out : 0;
                const lost = typeof d?.lost_population === 'number' ? d.lost_population : 0;
                const total = out + lost;
                if (total > 0) {
                    municipality_displacement_count += 1;
                    municipality_displacement_total += total;
                    settlement_displacement_total += total; // no per-settlement breakdown; use mun total as proxy
                }
            }
            // settlement_displacement_count is not incremented: displacement_state is
            // municipality-level only; leave settlement count to System C per-settlement data.
        }
    }

    const row: WeeklyReportRow = {
        week_index,
        phase,
        factions,
        control_counts: control_counts_sorted,
        settlement_displacement_count,
        settlement_displacement_total,
        municipality_displacement_count,
        municipality_displacement_total
    };
    if (activity !== undefined) {
        row.activity = activity;
    }
    if (ops !== undefined) {
        row.ops = ops;
    }
    if (corpsSummary !== undefined && corpsSummary.length > 0) {
        row.corps_summary = corpsSummary;
    }
    if (combatCausality !== undefined) {
        row.combat_causality = combatCausality;
    }
    if (controlChangeAttribution !== undefined) {
        row.control_change_attribution = controlChangeAttribution;
    }
    if (combatCausality !== undefined && controlChangeAttribution !== undefined) {
        row.behavioral_health = {
            valid_for_combat_calibration: combatCausality.valid_for_combat_calibration,
            combat_causality: combatCausality,
            control_change_attribution: controlChangeAttribution
        };
    }
    if (operationDiagnostics !== undefined && operationDiagnostics.length > 0) {
        row.operation_diagnostics = operationDiagnostics;
    }
    if (battles !== undefined && battles.length > 0) {
        row.battles = battles;
    }
    if (dissolutionEntries !== undefined && dissolutionEntries.length > 0) {
        row.brigade_dissolution = dissolutionEntries;
    }
    if (reconstitutionEntries !== undefined && reconstitutionEntries.length > 0) {
        row.brigade_reconstitution = reconstitutionEntries;
    }
    return row;
}
