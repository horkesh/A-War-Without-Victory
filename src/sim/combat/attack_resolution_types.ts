/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Type definitions for attack resolution
 * DOMAIN:    Battle report types, snap events, defender contributions
 * ═══════════════════════════════════════════════════════════════
 *
 * Extracted from attack_resolution_osid.ts — pure type extraction,
 * no behavior change.
 */

import type { CombatOutcome } from './combat_math.js';
import type { FormationId, FactionId } from '../../state/game_state.js';
import type { Osid } from './osid_adjacency.js';

// Backward-compat re-exports
export type AttackOutcome = CombatOutcome;
export type { CombatOutcome };

export type AttackResolutionOsidSnapEventType =
    | 'ammo_crisis'
    | 'commander_casualty'
    | 'last_stand'
    | 'surrender_cascade'
    | 'pyrrhic_victory'
    | 'morale_absorption';

export interface AttackResolutionOsidSnapEvent {
    snap_type: AttackResolutionOsidSnapEventType;
    trigger_phase: 'pre_battle' | 'post_battle';
    attacker_brigade: FormationId;
    target_osid: Osid;
    affected_formation?: FormationId;
    description: string;
    effects: Record<string, number | string | boolean | null>;
}

export type IntelFrictionLabel = 'stale_intel' | 'defender_opsec' | 'ambush_risk';
export type IntelConfidenceBand = 'low' | 'medium' | 'high';

export interface PublicIntelFrictionAnnotation {
    labels: IntelFrictionLabel[];
    attacker_confidence_band?: IntelConfidenceBand;
}

export type AttackOrderSkipReason =
    | 'missing_or_inactive_formation'
    | 'no_location'
    | 'not_tactically_adjacent'
    | 'alliance_blocked'
    | 'not_enemy_controlled_without_defenders';

export interface AttackResolutionOsidReport {
    orders_processed: number;
    unique_attack_targets: number;
    flips_applied: number;
    casualty_attacker: number;
    casualty_defender: number;
    combat_suppressed_reason?: 'coha_ceasefire';
    operation_lifecycle_paused_reason?: 'coha_ceasefire';
    orders_by_faction: Record<string, number>;
    orders_seen_by_brigade?: Record<FormationId, Osid>;
    suppressed_attack_orders?: Array<{
        brigade_id: FormationId;
        target_osid: Osid;
        reason: 'coha_ceasefire';
    }>;
    engaged_formation_ids: FormationId[];
    snap_events: AttackResolutionOsidSnapEvent[];
    snap_event_counts: Partial<Record<AttackResolutionOsidSnapEventType, number>>;
    skipped_attack_orders?: Array<{
        brigade_id: FormationId;
        target_osid: Osid;
        reason: AttackOrderSkipReason;
        location_osid?: string;
        target_controller?: FactionId | null;
    }>;
    battles: Array<{
        /** Deterministic join key: {turn}:{osid}:{attacker_brigade}:{defender_brigade|null} */
        battle_id: string;
        attacker_brigade: FormationId;
        /** Every validated attacker that contributed to this battle, sorted by id. */
        attacker_brigades?: FormationId[];
        /** Every executing operation represented by validated attackers, sorted by id. */
        contributing_operation_ids?: string[];
        attacker_faction: FactionId;
        defender_faction: FactionId;
        target_osid: Osid;
        outcome: CombatOutcome;
        power_ratio: number;
        attacker_won: boolean;
        defender_brigade: FormationId | null;
        snap_events: AttackResolutionOsidSnapEvent[];
        /** Actual total attacker casualties (KIA+WIA+MIA) from this battle. */
        attacker_casualties: number;
        /** Actual total defender casualties (KIA+WIA+MIA) from this battle. */
        defender_casualties: number;
        /** Per-brigade defender contributions (Layer A distance-weighted). */
        defender_contributions?: DefenderContribution[];
        /** Public-safe execution-friction annotation; no hidden enemy truth. */
        execution_friction?: PublicIntelFrictionAnnotation;
        /** Sub-segment that defended this OSID (Phase B). */
        defending_sub_segment_id?: string;
        /** Equipment destroyed, scavenged, and captured in this battle. */
        equipment?: {
            attacker_tanks_lost: number;
            attacker_artillery_lost: number;
            defender_tanks_lost: number;
            defender_artillery_lost: number;
            scavenged_tanks: number;
            scavenged_artillery: number;
            scavenged_by?: string;
            captured_tanks: number;
            captured_artillery: number;
            captured_by?: string;
        };
        /** Deterministic operation join key: {corps_id}:{op_name}:t{started_turn}. */
        operation_id?: string;
        /** Human-readable operation name. */
        operation_name?: string;
        /**
         * REASON-CODE INSTRUMENTATION, topic `battle_power`. Absent unless
         * `AWWV_DEBUG_REASON_CODES` requests it — see `reason_code_debug.ts` for
         * why absence rather than null is load-bearing.
         */
        power_breakdown?: BattlePowerBreakdown;
    }>;
}

/**
 * REASON-CODE INSTRUMENTATION (topic `battle_power`) — the two halves of
 * `power_ratio`, plus the sector context that produced the denominator.
 *
 * WHY THIS EXISTS. `powerRatio = effectiveAttackerPower / defenderPower`, and
 * `defenderPower` is a SECTOR aggregate assembled in `attack_resolution_osid.ts`
 * from every brigade the sector roster contributes, distance-weighted. The two
 * NAMED combatants on the battle record can therefore be byte-identical between
 * two runs while the ratio swings sevenfold, because a brigade that never
 * appears on the record moved the denominator. Without this breakdown no
 * artifact can distinguish "the defender got stronger" from "the sector got
 * repartitioned" — a distinction that cost one lane a full investigation.
 *
 * Every field is a local that already existed at the point the record is built.
 * Nothing here is newly computed, and nothing here is read back by the sim.
 */
export interface BattlePowerBreakdown {
    /**
     * The ratio's NUMERATOR as used: `attackerPower × intel attacker mult`.
     * Compare against `attacker_power_raw` to see the intel-friction share.
     */
    attacker_power: number;
    /** Numerator before intel friction was applied. */
    attacker_power_raw: number;
    /** Number of validated attacker formations in the stack. */
    attacker_count: number;
    /**
     * The ratio's DENOMINATOR as used — AFTER every post-assembly multiplier
     * (enclave garrison, collapse, post-Washington joint pressure, last-stand
     * ×1.5, intel friction). This is the value the ratio was actually divided by.
     */
    defender_power: number;
    /**
     * Sector id whose roster assembled the denominator, or **null on every
     * non-sector defence path** — i.e. null unless `defender_power_path` is
     * `'sector'`. Only the SUB-segment id is on the record today, and a
     * sub-segment does not identify the roster.
     *
     * The null is load-bearing, not tidiness. The underlying engine local is set
     * before the defence path is chosen and survives into paths where the sector
     * contributed nothing, so reporting it verbatim named a sector beside a zero
     * roster and invited exactly the wrong inference. Read this field only
     * together with `defender_power_path`.
     */
    defending_sector_id: string | null;
    /** Which of the four defence branches ran. Names the shape of the denominator. */
    defender_power_path: 'sector' | 'osid_brigades' | 'non_enemy_osid' | 'militia_only';
    /** Brigades on the defending roster — the count that repartitioning moves. */
    sector_brigade_count: number;
    /** Sector stance driving `SECTOR_STANCE_REACTIVE_BONUS` (0.5 screening … 1.3 fortify). */
    sector_stance: string | null;
    /** Full-power contribution of brigades physically standing on the target OSID. */
    physical_power: number;
    /** Distance-weighted reserve contribution, after stance bonus and the attack-size cap. */
    reactive_response: number;
    /** True when the `avgBrigadePower × MIN_DEFENSE_FLOOR_FRACTION` floor beat the sum. */
    min_floor_applied: boolean;
}

export interface DefenderContribution {
    brigade_id: FormationId;
    /** BFS hop distance from brigade location to battle OSID (0 = physically present). */
    distance_hops: number;
    /** Whether brigade is defending its home municipality. */
    is_home_municipality: boolean;
    /** Reactive weight used for power and casualty calculation. */
    reactive_weight: number;
    /** Casualties absorbed by this brigade in this battle. */
    casualties_taken: number;
}

export function pushSnapEvent(report: AttackResolutionOsidReport, event: AttackResolutionOsidSnapEvent): void {
    report.snap_events.push(event);
    report.snap_event_counts[event.snap_type] = (report.snap_event_counts[event.snap_type] ?? 0) + 1;
}
