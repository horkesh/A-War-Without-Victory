/**
 * v0.8.0 Command Chain — Political Leader Types
 *
 * Types only. No behavioral logic. No function implementations.
 * Open questions flagged for daytime review (see architecture spec Section 8).
 *
 * Source: docs/plans/2026-03-25-command-chain-architecture.md Section 1.2
 *
 * Location on GameState (when wired):
 *   state.military.political_leaders?: Record<FactionId, PoliticalLeaderState>
 *   state.military.political_leader_data?: PoliticalLeaderProfile[]
 */

import type { FactionId } from './game_state.js';

// --- Posture & policy enums ---

export type PoliticalPosture = 'hawkish' | 'moderate' | 'conciliatory';
export type WarCrimesPolicy = 'tolerate' | 'deny' | 'prevent';
export type AlliancePosture = 'committed' | 'pragmatic' | 'hostile';

// --- Priority union ---

export type PoliticalPriority =
    | 'territorial_expansion'
    | 'territorial_defense'
    | 'diplomatic_recognition'
    | 'patron_appeasement'
    | 'military_modernization'
    | 'humanitarian_credibility'
    | 'internal_consolidation'
    | 'alliance_maintenance'
    | 'ethnic_homogeneity';

// --- Static profile (loaded from scenario JSON) ---

export interface PoliticalLeaderProfile {
    /** Static personality loaded from scenario JSON. */
    leader_id: string;
    faction: FactionId;
    name: string;

    // Personality axes (1-5 scale, matching officer system convention)
    /** Willingness to escalate military operations. */
    hawkishness: number;
    /** Willingness to compromise at negotiating table. */
    flexibility: number;
    /** Sensitivity to international opinion. */
    international_sensitivity: number;
    /** Obedience to patron demands. */
    patron_deference: number;
    /** Tolerance for war crimes by subordinates. */
    impunity_tolerance: number;
}

// --- Mutable state (updated each turn) ---

export interface PoliticalLeaderState {
    leader_id: string;
    faction: FactionId;

    // Derived posture (recomputed each turn from personality + game state)
    current_posture: PoliticalPosture;
    war_crimes_policy: WarCrimesPolicy;
    alliance_posture: AlliancePosture;

    // Political capital (new resource — see architecture spec Section 2)
    political_capital: number;
    political_capital_max: number;

    // Priority tracking (top 3 from set, recomputed each turn)
    current_priorities: PoliticalPriority[];

    // Relationship with player faction (if applicable)
    /** [0, 100] — how much this leader trusts the player's faction. */
    player_trust: number;

    // Decision history (for consistency — leaders don't flip-flop)
    recent_decisions: PoliticalDecisionRecord[];
}

// --- Decision record ---

export interface PoliticalDecisionRecord {
    event_id: string;
    turn: number;
    option_chosen: string;
}

// =============================================================================
// OPEN QUESTIONS — FLAGGED FOR DAYTIME REVIEW
// (from architecture spec Section 8 — do NOT resolve here)
//
// 1. Leader portraits: visual assets for Karadzic/Izetbegovic/Boban?
// 2. Political capital visibility: always visible or only on interpretation events?
// 3. Patron call frequency: 8-12 events over 180 weeks — too sparse?
// 4. Order interpretation scope: corps-level only or brigade-level too?
// 5. Warlord Problem depth: friction events mechanically binding or notification-only?
// =============================================================================
