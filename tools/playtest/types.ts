/**
 * Shared types for the playtest harness (tools/playtest/).
 *
 * RECORD-ONLY LANE. Nothing here mutates engine source; the harness observes a
 * campaign driven through the real player-decision seam and writes findings.
 * Fixes are somebody else's commit — see README.md.
 */

import type { FactionId, GameState } from '../../src/state/game_state.js';
import type { TurnDecisionContext, LeverResult } from '../ai_play/president_playthrough.js';
import type { DaytonProposal } from '../../src/state/negotiation_types.js';

// ── Findings ─────────────────────────────────────────────────────────────────

export type FindingKind =
    /** Broken promised behavior, stale/incorrect state, crash, blocked progress. */
    | 'bug'
    /** Working behavior that is slow, obscure, repetitive, or insufficiently presidential. */
    | 'friction'
    /** Numerically or historically implausible, but not provably broken. */
    | 'anomaly'
    /** Something the harness cannot decide alone; needs a human or a specialist. */
    | 'question';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

/** A single observation, as emitted by a probe. */
export interface Finding {
    kind: FindingKind;
    severity: Severity;
    /** Probe id that emitted this (stable, kebab-case). */
    probe: string;
    /** One-line summary. Keep it stable across turns — it feeds the fingerprint. */
    title: string;
    /** What the harness saw, in plain language. */
    detail: string;
    /** Owning surface, e.g. `engine:recruitment`, `lever:force_launch`, `ui:decision_modal`. */
    surface: string;
    turn: number;
    faction: FactionId;
    /** Raw supporting values. Kept verbatim in the per-run log. */
    evidence?: Record<string, unknown>;
    /** Free-form note on how to reproduce beyond the run config. */
    repro_note?: string;
}

/** A finding after fingerprinting + cross-run merge. This is what lands in the ledger. */
export interface LedgerEntry extends Finding {
    /** Stable dedup key: hash of kind|surface|probe|normalized(title). */
    fingerprint: string;
    /** How many times this fired, across all runs. */
    occurrences: number;
    /** Run ids that hit it, oldest first. */
    runs: string[];
    /** Turn of the first-ever sighting. */
    first_seen_turn: number;
    /** Run id of the first-ever sighting. */
    first_seen_run: string;
    /**
     * Set by a human/triage pass; the harness only ever writes 'open' itself.
     *
     * `unconfirmed` is distinct from `wontfix`: it means the finding is suspected to
     * be an artefact of the HARNESS (a probe measuring the policy rather than the
     * engine, say) and must not be reported as an engine defect until re-verified.
     * `wontfix` means a real defect nobody intends to fix — a very different claim.
     */
    status?: 'open' | 'triaged' | 'unconfirmed' | 'fixed' | 'wontfix' | 'duplicate';
}

// ── Policy: how the player decides ───────────────────────────────────────────

/** One chosen event-decision response. */
export interface DecisionChoice {
    eventId: string;
    responseId: string;
    rationale?: string;
}

/** Which presidential levers to fire this turn. Empty = fire nothing. */
export interface LeverPlan {
    request_op?: Array<{ corpsId: string; targetOsid: string }>;
    stop_op?: Array<{ corpsId: string; opName: string }>;
    replace_co?: Array<{ corpsId: string; replacementOfficerId?: string }>;
    force_launch?: Array<{ corpsId: string; operationName: string }>;
    local_support?: Array<{ munId: string; type: 'weapons_shipment' | 'staff_priority' | 'croatian_support_package' }>;
    /** Proposal reviews to resolve: proposal id -> accept?. */
    proposals?: Array<{ proposalId: string; accept: boolean }>;
}

/**
 * A policy is the swappable "how would this president play?" — the axis along
 * which different outcomes get explored. Pure and synchronous so a run replays.
 */
export interface Policy {
    id: string;
    description: string;
    /** Choose a response for every pending decision. Omitting one leaves it pending. */
    decide(ctx: TurnDecisionContext, state: GameState): DecisionChoice[];
    /** Optional: what to do with the levers this turn. */
    levers?(state: GameState, faction: FactionId): LeverPlan;
    /** Optional: accept or reject a peace plan by id. Default: reject. */
    peacePlan?(planId: string, state: GameState): 'accepted' | 'rejected';
    /** Optional: allow/deny paramilitary integration by target osid. Default: deny. */
    paramilitary?(targetOsids: string[], state: GameState): Record<string, 'allow' | 'deny'>;
    /**
     * Optional: the Dayton position to table. Default is the empty proposal — demand
     * nothing, concede nothing — i.e. accept the historical settlement as drafted.
     */
    dayton?(state: GameState): DaytonProposal;
}

// ── Probes: what counts as a finding ─────────────────────────────────────────

export interface TurnProbeContext {
    /** State BEFORE this turn's decisions + advance. */
    prevState: GameState;
    /** State AFTER advance. */
    state: GameState;
    /** Turn number of `state` (post-advance). */
    turn: number;
    faction: FactionId;
    /** Wall-clock ms the advance took. Measurement only — never fed to the sim. */
    advanceMs: number;
    /** The decision context the policy saw this turn. */
    decisionContext: TurnDecisionContext;
    /** Choices the policy actually made this turn. */
    choices: DecisionChoice[];
}

export interface LeverProbeContext {
    lever: string;
    payload: Record<string, unknown>;
    result: LeverResult;
    /** State hash immediately before the lever call. */
    hashBefore: string;
    /** State hash immediately after. Equal to `hashBefore` means the lever did nothing. */
    hashAfter: string;
    turn: number;
    faction: FactionId;
}

export interface EndProbeContext {
    state: GameState;
    faction: FactionId;
    turnsPlayed: number;
    /** Per-turn advance timings, in turn order. */
    advanceMsByTurn: number[];
    /**
     * How many CA-COSTING lever calls the policy attempted all run. Probes about the
     * lever economy MUST consult this: "Command Authority never spent" means one
     * thing when the policy tried 400 times and another when it never tried at all.
     *
     * Counts only levers that actually charge Command Authority — request_op, stop_op,
     * replace_co, force_launch, elite_deploy. resolve_proposal and local_support are
     * FREE, so counting them lets a policy that never spends anything pass the gate.
     */
    leverAttempts: number;
}

/**
 * A probe turns "I noticed something" into a recorded finding. Probes must be
 * side-effect free apart from returning findings.
 */
export interface Probe {
    id: string;
    description: string;
    onTurn?(ctx: TurnProbeContext): Finding[];
    onLever?(ctx: LeverProbeContext): Finding[];
    onEnd?(ctx: EndProbeContext): Finding[];
}

// ── Run configuration ────────────────────────────────────────────────────────

export interface RunConfig {
    /** Stable id for this run; used in the ledger's `runs[]`. */
    runId: string;
    faction: FactionId;
    policyId: string;
    turns: number;
    scenario: string;
    /**
     * 'historical' makes the OTHER factions' bots take authored AI defaults, matching
     * the calibration scenarios. 'emergent' routes every faction-attributed event
     * through the political scorer, so the run is not calibration-comparable.
     */
    decisionMode: 'emergent' | 'historical';
    outDir: string;
    /** When false, the run writes only its own log and leaves the shared ledger alone. */
    updateLedger: boolean;
    /** Probe ids to skip. */
    disabledProbes: string[];
}
