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

export type IntelFrictionLabel = 'stale_intel' | 'defender_opsec';
export type IntelConfidenceBand = 'low' | 'medium' | 'high';

export interface PublicIntelFrictionAnnotation {
    labels: IntelFrictionLabel[];
    attacker_confidence_band?: IntelConfidenceBand;
}

export interface AttackResolutionOsidReport {
    orders_processed: number;
    unique_attack_targets: number;
    flips_applied: number;
    casualty_attacker: number;
    casualty_defender: number;
    orders_by_faction: Record<string, number>;
    engaged_formation_ids: FormationId[];
    snap_events: AttackResolutionOsidSnapEvent[];
    snap_event_counts: Partial<Record<AttackResolutionOsidSnapEventType, number>>;
    battles: Array<{
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
    }>;
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
