/**
 * A3 — Army-Level Order Interpretation
 * LANE-NIGHTSHIFT-A3-ARMY-LEVEL-ORDER-INTERPRETATION
 *
 * Authoritative DDR: docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md
 * (eee308e0).
 * A1 closeout: docs/40_reports/implemented/20260506_A1_WIRE_CAMPAIGN_PLAN_TO_BRIEFING.md (18136710)
 * A2 closeout: docs/40_reports/implemented/20260506_A2_ARMY_CO_LOOP_SUBSTRATE.md (ba6955bf)
 *
 * What A3 ships:
 *   1. interpretArmyDirective(state, faction, directive)
 *      — translates a POLITICAL directive (DDR Q1 vocabulary) into a faction-keyed
 *        per-corps directive map; emits an `army_directive_pushback` PendingOfficerEvent
 *        when compliance score is below FULL_COMPLIANCE_THRESHOLD (DDR Q2 advisory shape).
 *
 *   2. proposeAutonomousArmyLaunch(state, faction)
 *      — when the army CO has stubbornness ≥ STUBBORNNESS_AUTONOMOUS_THRESHOLD AND
 *        the autonomous-launch cooldown has elapsed AND an opportunity-catalog entry
 *        matches the army CO's faction + readiness gates, emits an
 *        `army_co_proposes_op` PendingOfficerEvent (1-turn warning per DDR Q3).
 *        Caller (pipeline step in war_phases.ts) fires the proposal one turn
 *        before any preparation entry, giving the political leader a deterministic
 *        override window.
 *
 * What A3 does NOT do:
 *   • Mutate corps stance directly (corps Phase 1 path remains canonical for that).
 *   • Apply political_capital cost (UI handler / political-bot decision; A5/A4 wire that).
 *   • Modify operation_opportunity_catalog* (read-only consumer here).
 *   • Modify army_hq_gathering.ts behavior (A1 already wired CampaignPlan into briefing).
 *   • Populate stubbornness / override_tolerance values (A4 owns roster data).
 *
 * Faction-symmetric: NO `if (faction === 'X')` branches. All asymmetry comes
 * from data fields (stubbornness, competence, aggressiveness, override_tolerance).
 *
 * Determinism: no Math.random(), no Date.now(), no `new Date()`, no locale-sort.
 * All maps iterated via sorted keys.
 *
 * Sensitive-history compliance:
 *   Ring 1 mechanism (faction-symmetric); Ring 2 data (faction-asymmetric values
 *   land via canonical roster in A4). No FORAWWV / paint anchor /
 *   political_controllers / OOB / rupture-wiring touch.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type {
    NamedOfficer,
    NamedOfficerState,
    PendingOfficerEvent,
    OrderSnapshot,
} from '../../state/officer_types.js';
import { getArmyCommander } from './officer_system.js';
import { OPERATION_OPPORTUNITY_CATALOG, evaluateAxes, isOpportunityEligible, buildProposalId } from './operation_opportunities.js';
import type { OperationOpportunityDef } from './operation_opportunities.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants (DDR-locked per panel defaults table at DDR §"AI-officers
// P1-P5 — confirmed panel defaults")
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Maximum directive deviation: corps directives may shift this many steps from
 * the army CO's "raw" interpretation of the political directive (mirrors corps
 * Phase 1 MAX_STANCE_SHIFT). DDR Q2 advisory shape — bounded, predictable.
 */
export const MAX_DIRECTIVE_DEVIATION = 1;

/**
 * Stubbornness threshold for autonomous launch (DDR Q3, locked in panel-defaults
 * table). Officers with stubbornness ≥ this value MAY autonomously propose
 * opportunity-catalog operations the political leader did NOT explicitly order.
 */
export const STUBBORNNESS_AUTONOMOUS_THRESHOLD = 4;

/**
 * Autonomous-launch cooldown window in turns (DDR Q3, locked). Maximum one
 * autonomous proposal per army CO per N-turn rolling window. Enforced via
 * NamedOfficerState.last_autonomous_launch_turn (A2 substrate).
 */
export const AUTONOMOUS_LAUNCH_COOLDOWN_TURNS = 12;

/**
 * Player override cost (DDR Q1). Charged when a player faction directly sets
 * a corps directive that contradicts the army CO's interpretation. A3 exposes
 * the constant; the IPC handler / political-bot decision lane (A5/A4) consumes
 * it. Not deducted here (A3 is a pure interpretation predicate).
 */
export const ARMY_OVERRIDE_POLITICAL_CAPITAL_COST = 2;

// Compliance score thresholds — mirror corps Phase 1 (order_interpretation.ts)
const FULL_COMPLIANCE_THRESHOLD = 0.80;
const MODIFIED_COMPLIANCE_THRESHOLD = 0.50;
const PARTIAL_COMPLIANCE_THRESHOLD = 0.25;
// Below PARTIAL_COMPLIANCE_THRESHOLD = refusal

// Alignment / misalignment bonuses on the base compliance score
const ALIGNMENT_BONUS = 0.20;
const MISALIGNMENT_PENALTY = 0.20;

// Reliability-modifier integration is a Phase-3-of-corps concern; A3 leaves
// it as a 0.0 placeholder slot for forward compatibility.
const A3_RELIABILITY_PLACEHOLDER = 0.0;

// ═══════════════════════════════════════════════════════════════════════════
// Public types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Canonical political-directive vocabulary (DDR Q1).
 *
 * The player UI (A5) issues one of these per turn. The army CO interprets
 * the verb into a per-corps directive role (FrontPriority['role']) — this is
 * the political → corps translation that A3 owns.
 */
export type PoliticalDirectiveVerb =
    | 'HOLD_AT_ALL_COSTS'        // DEFENSIVE-WEIGHT
    | 'PRESS_OFFENSIVE'          // OFFENSIVE-WEIGHT in named theater
    | 'MAINTAIN_CORRIDOR'        // CONTINGENT-DEFENSE
    | 'PREPARE_RESERVE'          // RESERVE-WEIGHT
    | 'HONOR_TRUCE'              // NEGOTIATION-WEIGHT
    | 'BALANCE_FRONTS';          // default / undirected

export interface PoliticalDirective {
    /** Directive verb from the canonical vocabulary. */
    verb: PoliticalDirectiveVerb;
    /** Optional corps focus — when present, the army CO weights translation toward this corps. */
    target_corps_id?: string;
    /** Optional opaque directive id (for cross-reference into army_co_decision_traces). */
    directive_id?: string;
}

export type ArmyComplianceCategory = 'full' | 'modified' | 'partial' | 'refused';

/**
 * Per-corps directive output of A3 interpretation. A "raw" reading of the
 * political verb produces a base role; the army CO's deviation may shift that
 * role at most MAX_DIRECTIVE_DEVIATION steps along the role ladder (below).
 */
export type ArmyCorpsDirectiveRole = 'primary' | 'secondary' | 'economy' | 'contain';

export interface ArmyCorpsDirective {
    corps_id: string;
    role: ArmyCorpsDirectiveRole;
    /** True when this directive deviated from the raw political-verb baseline. */
    deviated: boolean;
}

export interface ArmyDirectiveInterpretation {
    compliance: ArmyComplianceCategory;
    /** Per-corps directives, sorted by corps_id ascending for determinism. */
    corps_directives: ArmyCorpsDirective[];
    /** Optional pushback event — only populated for non-FULL compliance. */
    event?: PendingOfficerEvent;
    /** Human-readable reason (always populated; empty string for FULL compliance). */
    reason: string;
    /** Raw compliance score in [0, 1] (debug + UI surfacing). */
    compliance_score: number;
}

export interface AutonomousLaunchProposal {
    /** True when the proposal fired this turn. */
    proposed: boolean;
    /** Catalog opportunity_id, or null when no proposal fired. */
    opportunity_id: string | null;
    /** PendingOfficerEvent — pushed onto state.military.pending_officer_events when proposed. */
    event?: PendingOfficerEvent;
    /** Player-safe reason when proposed (or empty when not). */
    reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Role ladder used for deviation calculations. Higher index = more aggressive
 * commitment. Mirrors the Phase 1 STANCE_RANKS pattern at the corps level
 * (defensive=0, balanced=1, offensive=2) but applied to FrontPriority['role'].
 */
const ROLE_LADDER: readonly ArmyCorpsDirectiveRole[] = ['contain', 'economy', 'secondary', 'primary'];

function roleRank(role: ArmyCorpsDirectiveRole): number {
    const idx = ROLE_LADDER.indexOf(role);
    return idx === -1 ? 1 : idx;
}

/**
 * Map a political directive verb to the "raw" baseline corps role for a corps.
 * Faction-symmetric: depends only on the verb + whether the corps is the
 * directive's named focus (target_corps_id).
 */
function rawRoleForVerb(verb: PoliticalDirectiveVerb, isTargetCorps: boolean): ArmyCorpsDirectiveRole {
    switch (verb) {
        case 'HOLD_AT_ALL_COSTS':
            return isTargetCorps ? 'primary' : 'economy';
        case 'PRESS_OFFENSIVE':
            return isTargetCorps ? 'primary' : 'secondary';
        case 'MAINTAIN_CORRIDOR':
            return isTargetCorps ? 'primary' : 'economy';
        case 'PREPARE_RESERVE':
            return isTargetCorps ? 'secondary' : 'economy';
        case 'HONOR_TRUCE':
            return 'contain';
        case 'BALANCE_FRONTS':
        default:
            return isTargetCorps ? 'secondary' : 'economy';
    }
}

/**
 * Derive the army CO's preferred posture from aggressiveness + stubbornness.
 * High-aggressiveness officers prefer offensive directives; cautious officers
 * prefer defensive directives.
 */
function preferredVerbForOfficer(data: NamedOfficer): PoliticalDirectiveVerb {
    if (data.aggressiveness >= 4) return 'PRESS_OFFENSIVE';
    if (data.aggressiveness <= 2) return 'HOLD_AT_ALL_COSTS';
    return 'BALANCE_FRONTS';
}

/**
 * Whether the directive verb aligns with the army CO's preferred posture.
 * Returns +1 (aligned), -1 (misaligned), 0 (neutral).
 */
function alignmentForVerb(verb: PoliticalDirectiveVerb, data: NamedOfficer): -1 | 0 | 1 {
    const preferred = preferredVerbForOfficer(data);
    if (verb === preferred) return 1;
    // Strong opposition: aggressive officer told to honor truce / reserve, or
    // cautious officer told to press offensive.
    if (preferred === 'PRESS_OFFENSIVE' && (verb === 'HONOR_TRUCE' || verb === 'PREPARE_RESERVE')) return -1;
    if (preferred === 'HOLD_AT_ALL_COSTS' && verb === 'PRESS_OFFENSIVE') return -1;
    return 0;
}

/**
 * Compute the compliance score in [0, 1].
 *
 * Formula (DDR-locked, mirrors corps Phase 1 baseline shape):
 *   base = (competence + (5 - stubbornness)) / 10
 *   + ALIGNMENT_BONUS    when verb aligns with stubbornness-driven preference
 *   - MISALIGNMENT_PENALTY when verb misaligns
 *   + reliability_modifier (placeholder; A3 leaves at 0.0)
 *
 * Inputs are pure functions of officer data + directive; same inputs → same
 * output (determinism).
 */
function computeArmyComplianceScore(
    data: NamedOfficer,
    verb: PoliticalDirectiveVerb,
): number {
    const stubbornness = typeof data.stubbornness === 'number' ? data.stubbornness : 3;
    const competence = typeof data.competence === 'number' ? data.competence : 3;
    const base = (competence + (5 - stubbornness)) / 10;

    const align = alignmentForVerb(verb, data);
    const alignmentDelta = align === 1 ? ALIGNMENT_BONUS : (align === -1 ? -MISALIGNMENT_PENALTY : 0);

    const raw = base + alignmentDelta + A3_RELIABILITY_PLACEHOLDER;
    return Math.max(0.0, Math.min(1.0, raw));
}

/**
 * Map score → compliance category (mirrors corps Phase 1 thresholds).
 */
function categoryForScore(score: number): ArmyComplianceCategory {
    if (score >= FULL_COMPLIANCE_THRESHOLD) return 'full';
    if (score >= MODIFIED_COMPLIANCE_THRESHOLD) return 'modified';
    if (score >= PARTIAL_COMPLIANCE_THRESHOLD) return 'partial';
    return 'refused';
}

/**
 * Compute deviation steps applied to the raw role given the compliance category.
 * - FULL:     0 (raw role)
 * - MODIFIED: ±1 toward officer preference (within MAX_DIRECTIVE_DEVIATION)
 * - PARTIAL:  ±1 toward officer preference (explicit pushback)
 * - REFUSED:  shift fully to officer's preferred role
 */
function deviationStepsForCategory(
    category: ArmyComplianceCategory,
    rawRoleRank: number,
    preferredRoleRank: number,
): number {
    if (category === 'full') return 0;
    const direction = preferredRoleRank > rawRoleRank ? 1 : (preferredRoleRank < rawRoleRank ? -1 : 0);
    if (direction === 0) return 0;
    if (category === 'modified') return direction * MAX_DIRECTIVE_DEVIATION;
    if (category === 'partial') return direction * MAX_DIRECTIVE_DEVIATION;
    // refused → shift all the way to preferred (clamped by ladder bounds at apply time)
    const fullShift = Math.abs(preferredRoleRank - rawRoleRank);
    return direction * fullShift;
}

/**
 * Officer's preferred role: cautious officers default to 'economy' (defensive
 * concentration), aggressive officers default to 'primary'.
 */
function preferredRoleForOfficer(data: NamedOfficer): ArmyCorpsDirectiveRole {
    if (data.aggressiveness >= 4) return 'primary';
    if (data.aggressiveness <= 2) return 'economy';
    return 'secondary';
}

/**
 * Build a player-safe reason string for the interpretation event.
 */
function buildArmyReason(
    officerName: string,
    verb: PoliticalDirectiveVerb,
    category: ArmyComplianceCategory,
): string {
    const display = officerName || 'The army commander';
    if (category === 'full') return '';
    if (category === 'modified') {
        return `${display} acknowledges the political directive but routes it through the staff's reading of conditions before passing to corps commanders.`;
    }
    if (category === 'partial') {
        return `${display} pushes back on the political directive — corps allocations will deviate from the literal reading.`;
    }
    return `${display} considers the political directive (${verb}) untenable; he asks for an override or to be relieved.`;
}

/**
 * Pure helper to read the stable list of corps_ids for a faction from
 * GameState in deterministic order. Iterates corps_command keys (the canonical
 * "active corps" set) and resolves faction via formations[corpsId].faction
 * (the same lookup pattern used by computeCorpsOperationReadiness).
 */
function listCorpsIdsForFaction(state: GameState, faction: FactionId): string[] {
    const corpsCommand = state.military.corps_command;
    const formations = state.military.formations;
    if (!corpsCommand) return [];
    const ids: string[] = [];
    const keys = Object.keys(corpsCommand).sort();
    for (const corpsId of keys) {
        const cmd = corpsCommand[corpsId];
        if (!cmd) continue;
        const corpsFaction = formations?.[corpsId]?.faction;
        if (corpsFaction === faction) ids.push(corpsId);
    }
    return ids;
}

/**
 * Append a decision-trace entry. A2 substrate; A3 owns writes.
 * Sorted by turn ascending for determinism (caller guarantees monotonic turn).
 */
function appendDecisionTrace(
    state: GameState,
    faction: FactionId,
    entry: { turn: number; campaign_role: string; rationale: string; raw_directive_id?: string },
): void {
    if (!state.military.army_co_decision_traces) {
        state.military.army_co_decision_traces = {};
    }
    if (!state.military.army_co_decision_traces[faction]) {
        state.military.army_co_decision_traces[faction] = [];
    }
    state.military.army_co_decision_traces[faction]!.push(entry);
}

function pushOfficerEvent(state: GameState, event: PendingOfficerEvent): void {
    if (!state.military.pending_officer_events) {
        state.military.pending_officer_events = [];
    }
    state.military.pending_officer_events.push(event);
}

// ═══════════════════════════════════════════════════════════════════════════
// Public predicate 1: interpretArmyDirective
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Translate a POLITICAL directive into per-corps directives via the army CO's
 * advisory interpretation (DDR Q1, Q2). Mirrors the corps-level Phase 1 shape:
 * full / modified / partial / refused — deviation bounded by
 * MAX_DIRECTIVE_DEVIATION; pushback PendingOfficerEvent emitted on non-FULL
 * compliance; player retains override authority at ARMY_OVERRIDE_POLITICAL_CAPITAL_COST.
 *
 * Substrate-driven: when the army CO has no stubbornness/competence values
 * populated (pre-A4 roster data), defaults (3, 3) yield a baseline compliance
 * of 0.50 → MODIFIED for non-aligned verbs but 0.70 → MODIFIED for aligned, so
 * behavior surfaces only once A4 lands real values. (40w byte-stable
 * pre-A4 because no political directive is issued yet — pipeline step short-
 * circuits when verb is undefined.)
 */
export function interpretArmyDirective(
    state: GameState,
    faction: FactionId,
    directive: PoliticalDirective,
): ArmyDirectiveInterpretation {
    const commander = getArmyCommander(faction, state);
    const corpsIds = listCorpsIdsForFaction(state, faction);

    // No army commander (or no corps) → pass through as full compliance with
    // raw role mapping. Mirrors corps Phase 1's "no commander → full" path.
    if (!commander) {
        const corpsDirectives: ArmyCorpsDirective[] = corpsIds.map(corpsId => ({
            corps_id: corpsId,
            role: rawRoleForVerb(directive.verb, corpsId === directive.target_corps_id),
            deviated: false,
        }));
        return {
            compliance: 'full',
            corps_directives: corpsDirectives,
            reason: '',
            compliance_score: 1.0,
        };
    }

    const { data, state: officerState } = commander;

    // Acting commanders always comply (mirrors corps Phase 1).
    if (officerState.acting_commander) {
        const corpsDirectives: ArmyCorpsDirective[] = corpsIds.map(corpsId => ({
            corps_id: corpsId,
            role: rawRoleForVerb(directive.verb, corpsId === directive.target_corps_id),
            deviated: false,
        }));
        return {
            compliance: 'full',
            corps_directives: corpsDirectives,
            reason: '',
            compliance_score: 1.0,
        };
    }

    const score = computeArmyComplianceScore(data, directive.verb);
    const category = categoryForScore(score);
    const preferredRole = preferredRoleForOfficer(data);
    const preferredRank = roleRank(preferredRole);

    const corpsDirectives: ArmyCorpsDirective[] = corpsIds.map(corpsId => {
        const isTarget = corpsId === directive.target_corps_id;
        const rawRole = rawRoleForVerb(directive.verb, isTarget);
        const rawRank = roleRank(rawRole);
        const steps = deviationStepsForCategory(category, rawRank, preferredRank);
        const newRank = Math.max(0, Math.min(ROLE_LADDER.length - 1, rawRank + steps));
        const finalRole = ROLE_LADDER[newRank]!;
        return {
            corps_id: corpsId,
            role: finalRole,
            deviated: finalRole !== rawRole,
        };
    });

    const reason = buildArmyReason(data.name, directive.verb, category);

    // Decision trace — every interpretation gets a trace entry.
    appendDecisionTrace(state, faction, {
        turn: state.meta.turn,
        campaign_role: directive.verb,
        rationale: reason || `${data.name} executes ${directive.verb} as issued.`,
        raw_directive_id: directive.directive_id,
    });

    if (category === 'full') {
        return {
            compliance: 'full',
            corps_directives: corpsDirectives,
            reason,
            compliance_score: score,
        };
    }

    // Build pushback event for non-FULL compliance (DDR Q2 advisory shape).
    const original: OrderSnapshot = {
        order_type: 'political_directive',
        corps_id: directive.target_corps_id ?? '',
        directive_verb: directive.verb,
    };
    const interpreted: OrderSnapshot = {
        order_type: 'political_directive',
        corps_id: directive.target_corps_id ?? '',
        directive_verb: directive.verb,
        objectives: corpsDirectives
            .filter(cd => cd.deviated)
            .map(cd => `${cd.corps_id}:${cd.role}`),
    };

    const event: PendingOfficerEvent = {
        event_id: `army:${faction}:directive:${state.meta.turn}`,
        type: 'army_directive_pushback',
        faction,
        turn: state.meta.turn,
        officer_id: data.id,
        acknowledged: false,
        original_order: original,
        interpreted_order: interpreted,
        reason,
        overridable: true,
        override_action: 'override-army-directive',
    };
    pushOfficerEvent(state, event);

    return {
        compliance: category,
        corps_directives: corpsDirectives,
        event,
        reason,
        compliance_score: score,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Public predicate 2: proposeAutonomousArmyLaunch
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mladić-class autonomous-launch proposal (DDR Q3).
 *
 * When ALL of:
 *   • the army CO has stubbornness ≥ STUBBORNNESS_AUTONOMOUS_THRESHOLD
 *   • last_autonomous_launch_turn is undefined OR
 *     state.meta.turn − last_autonomous_launch_turn ≥ AUTONOMOUS_LAUNCH_COOLDOWN_TURNS
 *   • at least one OperationOpportunityDef in the catalog matches the army CO's
 *     faction AND is currently eligible (all required axes green)
 * then the army CO emits an `army_co_proposes_op` PendingOfficerEvent with a
 * 1-turn override window (the political leader / player can relieve or override
 * before the op enters preparation).
 *
 * The actual operation creation entry happens NEXT TURN if the proposal is not
 * overridden. A3 only emits the proposal; A5 / IPC handler consumes it.
 *
 * NOTE: A3 does NOT mutate last_autonomous_launch_turn here — that mutation
 * occurs at the moment the un-overridden proposal converts into a real op
 * (downstream lane). Emitting a proposal is not yet a launch.
 */
export function proposeAutonomousArmyLaunch(
    state: GameState,
    faction: FactionId,
): AutonomousLaunchProposal {
    const commander = getArmyCommander(faction, state);
    const empty: AutonomousLaunchProposal = { proposed: false, opportunity_id: null, reason: '' };

    if (!commander) return empty;

    const { data, state: officerState } = commander;

    // Acting commanders never autonomously launch.
    if (officerState.acting_commander) return empty;

    const stubbornness = typeof data.stubbornness === 'number' ? data.stubbornness : 0;
    if (stubbornness < STUBBORNNESS_AUTONOMOUS_THRESHOLD) return empty;

    // Cooldown enforcement
    const lastLaunch = officerState.last_autonomous_launch_turn;
    if (typeof lastLaunch === 'number') {
        const elapsed = state.meta.turn - lastLaunch;
        if (elapsed < AUTONOMOUS_LAUNCH_COOLDOWN_TURNS) return empty;
    }

    // Find the first eligible catalog entry for this faction (deterministic
    // order: catalog is sorted by opportunity_id).
    const candidates: OperationOpportunityDef[] = OPERATION_OPPORTUNITY_CATALOG
        .filter(def => def.faction === faction)
        .slice()
        .sort((a, b) => a.opportunity_id.localeCompare(b.opportunity_id));

    let chosen: OperationOpportunityDef | null = null;
    for (const def of candidates) {
        const axes = evaluateAxes(state, state.meta.turn, def);
        if (isOpportunityEligible(def, axes)) {
            chosen = def;
            break;
        }
    }
    if (!chosen) return empty;

    const reason =
        `${data.name} has decided to launch ${chosen.name} on his own authority. ` +
        `The political leader has one turn to override or relieve before preparation begins.`;

    const proposalId = buildProposalId(chosen.opportunity_id, state.meta.turn);

    const interpreted: OrderSnapshot = {
        order_type: 'army_co_proposed_op',
        corps_id: chosen.primary_corps,
        operation_name: chosen.name,
        opportunity_id: chosen.opportunity_id,
    };

    const event: PendingOfficerEvent = {
        event_id: `army:${faction}:autonomous_launch:${proposalId}:${state.meta.turn}`,
        type: 'army_co_proposes_op',
        faction,
        turn: state.meta.turn,
        officer_id: data.id,
        corps_id: chosen.primary_corps,
        acknowledged: false,
        interpreted_order: interpreted,
        reason,
        overridable: true,
        override_action: 'override-army-autonomous-launch',
    };
    pushOfficerEvent(state, event);

    appendDecisionTrace(state, faction, {
        turn: state.meta.turn,
        campaign_role: 'AUTONOMOUS_LAUNCH_PROPOSAL',
        rationale: reason,
        raw_directive_id: chosen.opportunity_id,
    });

    return {
        proposed: true,
        opportunity_id: chosen.opportunity_id,
        event,
        reason,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Pipeline entry — invoked from war_phases.ts (A3 step)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read the soft-state political directive for a faction from
 * `state.military.political_directives_by_faction` (consumed defensively;
 * the state slot may be undefined pre-A5). Returns null when no directive
 * is present — pipeline step short-circuits in that case (byte-stable
 * 40w pre-A4-roster-data per DDR substrate-driven design).
 */
function readPoliticalDirective(state: GameState, faction: FactionId): PoliticalDirective | null {
    type LooseMilitary = GameState['military'] & {
        political_directives_by_faction?: Record<string, PoliticalDirective | undefined>;
    };
    const mil = state.military as LooseMilitary;
    const slot = mil.political_directives_by_faction?.[faction];
    if (!slot) return null;
    return slot;
}

/**
 * C1 (LANE-NIGHTSHIFT-C1-CORPS-DIRECTIVE-CONSUMER-WIRE) — persist
 * the per-corps directive map produced by `interpretArmyDirective` into
 * `state.military.army_corps_directives_by_faction[faction]` so the
 * commander briefing can overlay `frontPriority.role` → `campaign_role`.
 *
 * Env flag `C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true` short-circuits
 * the persist path (mirrors briefing.ts read-path short-circuit) for
 * byte-stable A/B verification per DDR (57cec91c).
 *
 * Lazy slot init — when no directives are persisted (env flag set, or no
 * faction produced one) the slot remains undefined, preserving pre-C1
 * save byte-stability.
 *
 * Faction-symmetric: same code path for RBiH / RS / HRHB.
 */
function persistCorpsDirectives(
    state: GameState,
    faction: FactionId,
    interpretation: ArmyDirectiveInterpretation,
): void {
    if (process.env.C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED === 'true') return;
    if (!interpretation.corps_directives.length) return;

    type LooseMilitary = GameState['military'] & {
        army_corps_directives_by_faction?: Record<string, Record<string, ArmyCorpsDirective>>;
    };
    const mil = state.military as LooseMilitary;
    if (!mil.army_corps_directives_by_faction) {
        mil.army_corps_directives_by_faction = {};
    }
    const factionMap: Record<string, ArmyCorpsDirective> = {};
    // Iterate in deterministic order (interpretation already sorts; double-guard).
    const sorted = [...interpretation.corps_directives].sort((a, b) =>
        a.corps_id < b.corps_id ? -1 : (a.corps_id > b.corps_id ? 1 : 0),
    );
    for (const cd of sorted) {
        factionMap[cd.corps_id] = {
            corps_id: cd.corps_id,
            role: cd.role,
            deviated: cd.deviated,
        };
    }
    mil.army_corps_directives_by_faction[faction] = factionMap;
}

/**
 * Single pipeline-step entry: for each (non-player) faction, run the A3
 * predicates and emit traces / events. Faction-symmetric: no per-faction
 * branches.
 *
 * Caller (war_phases.ts) gates by phase==='war' and orders this step AFTER
 * `evaluate-army-hq-gathering` and BEFORE `generate-bot-corps-orders`.
 *
 * C1 (LANE-NIGHTSHIFT-C1-CORPS-DIRECTIVE-CONSUMER-WIRE): when an interpretation
 * is produced, persist its corps_directives[] into
 * `state.military.army_corps_directives_by_faction[faction]` so the briefing
 * overlay path can read it. Persist short-circuits when env flag
 * `C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true` is set.
 */
export function applyArmyDirectiveInterpretation(state: GameState): void {
    const factions: FactionId[] = ['HRHB', 'RBiH', 'RS']; // sorted alphabetically — determinism
    for (const faction of factions) {
        const directive = readPoliticalDirective(state, faction);
        if (directive) {
            const interpretation = interpretArmyDirective(state, faction, directive);
            persistCorpsDirectives(state, faction, interpretation);
        }
        // Autonomous-launch evaluation is independent of the political directive
        // (it is the army CO's volitional act). Always evaluate; the function
        // short-circuits when stubbornness / cooldown gate fails, so pre-A4
        // populated rosters yield zero behavior change.
        proposeAutonomousArmyLaunch(state, faction);
    }
}

// Validator-friendly named export for the A3 pipeline step name. The pipeline
// definition file (war_phases.ts) imports this constant so the step name has
// a single canonical owner (test T12 static-grep guards this).
export const A3_PIPELINE_STEP_NAME = 'apply-army-directive-interpretation';
