/**
 * v0.8.3 Phase 1 — Order Interpretation Engine (Stance)
 *
 * Deterministic personality-based filtering of player stance orders through
 * corps commander traits (competence, aggressiveness). Officers may comply fully,
 * modify the effective stance one step toward their preferred posture, or refuse.
 *
 * Phase 1 scope: stance interpretation only.
 * Phase 2 will add: interpretOperationLaunch, interpretOperationHalt, IPC wiring.
 * Phase 3 will add: decay pipeline step, reliabilityModifier population from political_reliability.
 *
 * Deterministic: no Math.random(), no Date.now(). All scoring is pure functions of
 * officer traits and order parameters. Tie-breaks are lexicographic on stance names.
 *
 * Design reference: docs/plans/2026-03-24-v081-order-interpretation-plan.md
 */

import type { GameState } from '../../state/game_state.js';
import type { FactionId } from '../../state/game_state.js';
import type {
    NamedOfficer,
    NamedOfficerState,
    PendingOfficerEvent,
    OrderSnapshot,
    OfficerEventType,
} from '../../state/officer_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getCorpsCommander } from './officer_system.js';
import { getActivePatronDirective } from './patron_directive_scope.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

// Compliance score thresholds
const FULL_COMPLIANCE_THRESHOLD = 0.80;
const MODIFIED_COMPLIANCE_THRESHOLD = 0.50;
const PARTIAL_COMPLIANCE_THRESHOLD = 0.25;
// Below PARTIAL_COMPLIANCE_THRESHOLD = refusal

// Maximum stance shift from interpretation (1 step)
const MAX_STANCE_SHIFT = 1;

// Extra preparation turns for cautious officers (by aggressiveness 0-5 index)
// Phase 2 will use these; defined here to document the system's eventual bounds
const CAUTIOUS_EXTRA_PREP_TURNS = [0, 3, 2, 0, 0, 0];

// Max bonus objectives aggressive officers can add (Phase 2)
const MAX_BONUS_OBJECTIVES = 2;

// Turns of delayed halt for aggressive officers (Phase 2)
const AGGRESSIVE_HALT_DELAY = 2;

// Momentum threshold to trigger halt delay (Phase 2)
const HALT_DELAY_MOMENTUM_THRESHOLD = 2;

// Consecutive overrides before officer becomes cowed
const COWED_OVERRIDE_THRESHOLD = 2;
// Override window (turns) for counting consecutive overrides
const COWED_OVERRIDE_WINDOW = 8;
// Turns officer is cowed after threshold
const COWED_DURATION = 8;
// Competence modifier while cowed (applied to effective compliance)
const COWED_COMPETENCE_BONUS = 0.30; // cowed officers over-comply: +0.30 to score

// Per-point reliability modifier (political_reliability range 1-5, centred on 3)
// modifier: -0.20 (pol_rel=1) to +0.20 (pol_rel=5)
const RELIABILITY_STEP = 0.10;

// Extra compliance penalty for early-war RBiH warlords (pol_rel <= 2, before warlord_friction_end_week)
const WARLORD_MODIFIER = -0.15;

// Morale hit when relieving an officer (passed to caller; this module reports it)
export const RELIEF_MORALE_PENALTY = -10;
// Acting commander duration after relief
export const RELIEF_ACTING_DURATION = 4;

// ═══════════════════════════════════════════════════════════════════════════
// Stance rank mapping
// ═══════════════════════════════════════════════════════════════════════════

/** Stance numeric rank for gap calculation. Higher = more aggressive. */
const STANCE_RANKS: Record<string, number> = {
    defensive:  0,
    reorganize: 0.5,
    balanced:   1,
    offensive:  2,
};

/** All stances in rank order (low to high) */
const STANCE_ORDER: string[] = ['defensive', 'reorganize', 'balanced', 'offensive'];

// ═══════════════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Derive the officer's preferred stance from aggressiveness.
 * agg >= 4 → offensive, agg === 3 → balanced, agg <= 2 → defensive
 */
function computePreferredStance(aggressiveness: number): string {
    if (aggressiveness >= 4) return 'offensive';
    if (aggressiveness === 3) return 'balanced';
    return 'defensive';
}

/**
 * Compute the base reliability modifier from political_reliability (1-5, centred on 3).
 * Returns -0.20 at reliability=1, 0.00 at reliability=3, +0.20 at reliability=5.
 */
function computeReliabilityModifier(politicalReliability: number): number {
    return (politicalReliability - 3) * RELIABILITY_STEP;
}

/**
 * Compute the effective reliability modifier, including warlord supersession bonus.
 * Warlord supersession applies an extra -0.15 penalty when ALL of:
 *   - faction === 'RBiH'
 *   - political_reliability <= 2
 *   - current turn < warlord_friction_end_week (from war_timeline officer_config)
 * Iteration-order-safe: pure function of officer data + state.
 */
function computeEffectiveReliabilityModifier(
    data: NamedOfficer,
    state: GameState,
): number {
    const base = computeReliabilityModifier(data.political_reliability);
    const timeline = state.military.war_timeline;
    const warlordEndWeek = timeline?.officer_config?.['RBiH']?.warlord_friction_end_week;
    if (
        data.faction === 'RBiH' &&
        data.political_reliability <= 2 &&
        warlordEndWeek !== undefined &&
        state.meta.turn < warlordEndWeek
    ) {
        return base + WARLORD_MODIFIER;
    }
    return base;
}

/**
 * Compute compliance score in [0, 1].
 * gap = abs(orderedRank - preferredRank)
 * if gap === 0: return 1.0 (always comply with aligned orders)
 * baseCompliance = 0.45 + competence * 0.10  (comp 5 = 0.95, comp 1 = 0.55)
 * gapPenalty = gap * 0.25
 * score = clamp(0.0, 1.0, baseCompliance - gapPenalty + reliabilityModifier)
 */
function computeComplianceScore(
    competence: number,
    aggressiveness: number,
    orderedStanceRank: number,
    preferredStanceRank: number,
    reliabilityModifier = 0,
): number {
    const gap = Math.abs(orderedStanceRank - preferredStanceRank);
    if (gap === 0) return 1.0;
    const baseCompliance = 0.45 + competence * 0.10;
    const gapPenalty = gap * 0.25;
    const raw = baseCompliance - gapPenalty + reliabilityModifier;
    return Math.max(0.0, Math.min(1.0, raw));
}

/**
 * Determine the effective stance after officer interpretation.
 * >= FULL_COMPLIANCE_THRESHOLD: orderedStance (full compliance)
 * >= MODIFIED_COMPLIANCE_THRESHOLD: orderedStance (modified — same stance, officer grumbles)
 * >= PARTIAL_COMPLIANCE_THRESHOLD: shift one step toward preferred
 * < PARTIAL_COMPLIANCE_THRESHOLD: return officerPreferredStance (refusal)
 */
function determineEffectiveStance(
    orderedStance: string,
    officerPreferredStance: string,
    complianceScore: number,
): string {
    if (complianceScore >= MODIFIED_COMPLIANCE_THRESHOLD) {
        return orderedStance;
    }

    if (complianceScore >= PARTIAL_COMPLIANCE_THRESHOLD) {
        // Shift one step toward preferred
        const orderedIdx = STANCE_ORDER.indexOf(orderedStance);
        const preferredIdx = STANCE_ORDER.indexOf(officerPreferredStance);
        if (orderedIdx === -1 || preferredIdx === -1) return orderedStance;
        const direction = preferredIdx > orderedIdx ? 1 : -1;
        const shiftedIdx = Math.max(0, Math.min(STANCE_ORDER.length - 1, orderedIdx + direction * MAX_STANCE_SHIFT));
        return STANCE_ORDER[shiftedIdx]!;
    }

    return officerPreferredStance;
}

/**
 * Build a human-readable reason string for the interpretation event.
 *
 * @param officerName - Display name of the officer
 * @param orderedStance - The stance the player ordered
 * @param effectiveStance - The stance the officer will actually execute
 * @param complianceScore - Raw compliance score [0, 1]
 * @param isWarlordModifierActive - True when the warlord supersession penalty was applied
 * @param officerId - Optional officer ID for Halilović-specific strings
 */
function buildInterpretationReason(
    officerName: string,
    orderedStance: string,
    effectiveStance: string,
    complianceScore: number,
    isWarlordModifierActive = false,
    officerId?: string,
): string {
    const displayName = officerName || 'The commander';

    if (complianceScore >= FULL_COMPLIANCE_THRESHOLD) {
        return '';
    }

    const isHaliovic = officerId === 'arbih_halilovic';

    if (complianceScore >= MODIFIED_COMPLIANCE_THRESHOLD) {
        if (isWarlordModifierActive) {
            if (isHaliovic) {
                return `Halilović acknowledges the order but has amended the operational guidance before passing it to corps commanders.`;
            }
            return `${displayName} acknowledges the order but routes it through his own staff before passing it to subordinates.`;
        }
        const isDowngrade = (STANCE_RANKS[orderedStance] ?? 1) < (STANCE_RANKS[effectiveStance] ?? 1);
        const direction = isDowngrade ? 'the aggressive posture' : 'the defensive posture';
        return `${displayName} acknowledges the order with reservations about ${direction}.`;
    }

    if (complianceScore >= PARTIAL_COMPLIANCE_THRESHOLD) {
        if (isWarlordModifierActive) {
            if (isHaliovic) {
                return `Halilović considers ${orderedStance} a political directive, not a military one, and will advance to ${effectiveStance}.`;
            }
            return `${displayName} considers the order incompatible with local conditions and will advance to ${effectiveStance}.`;
        }
        return `${displayName} considers ${orderedStance} untenable and will advance to ${effectiveStance}.`;
    }

    // Refused
    if (isWarlordModifierActive) {
        if (isHaliovic) {
            return `Halilović has not forwarded the order. The Supreme Command Staff's authority over operational matters remains contested.`;
        }
        return `${displayName} has not transmitted the order. His formation continues under independent command.`;
    }

    return `${displayName} refuses to comply with ${orderedStance}, maintaining ${effectiveStance}.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Public types
// ═══════════════════════════════════════════════════════════════════════════

export interface InterpretationResult {
    compliance: 'full' | 'modified' | 'partial' | 'refused';
    effective_stance: string;
    event?: PendingOfficerEvent;
    reason?: string;
}

export interface InterpretationPreview {
    predicted_compliance: 'full' | 'modified' | 'partial' | 'refused';
    effective_stance: string;
    reason: string;
    officer_name: string;
    officer_competence: number;
    officer_aggressiveness: number;
}

export interface ReliefResult {
    relieved_officer_id: string;
    replacement_officer_id: string | null;
    transition_penalty_turns: number;
    morale_hit: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Core computation (shared by interpretStanceOrder and previewInterpretation)
// ═══════════════════════════════════════════════════════════════════════════

interface InterpretationComputation {
    compliance: 'full' | 'modified' | 'partial' | 'refused';
    effective_stance: string;
    reason: string;
    officer_name: string;
    officer_competence: number;
    officer_aggressiveness: number;
    officer_id: string;
    officer_state: NamedOfficerState;
    faction: FactionId;
    complianceScore: number;
}

function computeInterpretation(
    state: GameState,
    corpsId: string,
    orderedStance: string,
): InterpretationComputation | null {
    const commander = getCorpsCommander(corpsId, state);
    if (!commander) return null;

    const { data, state: officerState } = commander;

    // Acting commanders always comply
    if (officerState.acting_commander) return null;

    // Cowed officers comply fully
    if (
        officerState.cowed_until_turn !== undefined &&
        state.meta.turn <= officerState.cowed_until_turn
    ) {
        return null;
    }

    const competence = data.competence;
    const aggressiveness = data.aggressiveness;
    const preferredStance = computePreferredStance(aggressiveness);

    const orderedRank = STANCE_RANKS[orderedStance] ?? 1;
    const preferredRank = STANCE_RANKS[preferredStance] ?? 1;

    const reliabilityModifier = computeEffectiveReliabilityModifier(data, state);
    const baseReliabilityModifier = computeReliabilityModifier(data.political_reliability);
    const isWarlordModifierActive = reliabilityModifier !== baseReliabilityModifier;
    let score = computeComplianceScore(competence, aggressiveness, orderedRank, preferredRank, reliabilityModifier);

    // Check PatronDirective stance_ceiling (cap effective stance if needed).
    // Officer-level interpretation has no corps context, so this consumer uses
    // the faction-wide variant (no corpsId argument) — matching legacy behavior
    // before the 2026-05-17 hybrid-scope helper extraction. See patron_directive_scope.ts.
    const turn = state.meta.turn;
    const activeDirective = getActivePatronDirective(data.faction, turn, state);
    const stanceCeiling: string | null = activeDirective?.stance_ceiling ?? null;

    let effectiveStance = determineEffectiveStance(orderedStance, preferredStance, score);

    // Apply patron ceiling: if effective stance exceeds ceiling, cap it
    if (stanceCeiling !== null) {
        const ceilingRank = STANCE_RANKS[stanceCeiling] ?? 2;
        if ((STANCE_RANKS[effectiveStance] ?? 0) > ceilingRank) {
            effectiveStance = stanceCeiling;
        }
    }

    // Determine compliance category
    let compliance: 'full' | 'modified' | 'partial' | 'refused';
    if (effectiveStance === orderedStance) {
        compliance = score >= FULL_COMPLIANCE_THRESHOLD ? 'full' : 'modified';
    } else if (effectiveStance === preferredStance) {
        compliance = 'refused';
    } else {
        compliance = 'partial';
    }

    const reason = buildInterpretationReason(data.name, orderedStance, effectiveStance, score, isWarlordModifierActive, data.id);

    return {
        compliance,
        effective_stance: effectiveStance,
        reason,
        officer_name: data.name,
        officer_competence: competence,
        officer_aggressiveness: aggressiveness,
        officer_id: data.id,
        officer_state: officerState,
        faction: data.faction,
        complianceScore: score,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main exports
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Interpret a player-issued stance order through the corps commander's personality.
 * May emit a PendingOfficerEvent if the officer deviates.
 * Mutates state.military.pending_officer_events on non-full compliance.
 */
export function interpretStanceOrder(
    state: GameState,
    corpsId: string,
    orderedStance: string,
): InterpretationResult {
    const computation = computeInterpretation(state, corpsId, orderedStance);

    // No commander, acting commander, or cowed → full compliance, no event
    if (!computation) {
        return { compliance: 'full', effective_stance: orderedStance };
    }

    const { compliance, effective_stance, reason, officer_id, officer_state, faction } = computation;

    if (compliance === 'full') {
        return { compliance: 'full', effective_stance, reason };
    }

    // Build event for non-full compliance
    const eventTypeMap: Record<'modified' | 'partial' | 'refused', OfficerEventType> = {
        modified: 'order_modified',
        partial: 'order_pushback',
        refused: 'order_refused',
    };
    const eventType = eventTypeMap[compliance as 'modified' | 'partial' | 'refused'];

    const originalOrder: OrderSnapshot = {
        order_type: 'stance_change',
        corps_id: corpsId,
        stance: orderedStance,
    };
    const interpretedOrder: OrderSnapshot = {
        order_type: 'stance_change',
        corps_id: corpsId,
        stance: effective_stance,
    };

    const event: PendingOfficerEvent = {
        event_id: `${corpsId}:stance:${state.meta.turn}`,
        type: eventType,
        faction,
        turn: state.meta.turn,
        officer_id,
        corps_id: corpsId,
        acknowledged: false,
        original_order: originalOrder,
        interpreted_order: interpretedOrder,
        reason,
        overridable: true,
        override_action: 'override-officer-interpretation',
    };

    // Ensure pending_officer_events array exists
    if (!state.military.pending_officer_events) {
        state.military.pending_officer_events = [];
    }
    state.military.pending_officer_events.push(event);

    return { compliance, effective_stance, event, reason };
}

/**
 * Preview what interpretStanceOrder would produce without mutating state.
 * Read-only: does NOT push any event to state.
 */
export function previewInterpretation(
    state: GameState,
    corpsId: string,
    orderedStance: string,
): InterpretationPreview {
    const computation = computeInterpretation(state, corpsId, orderedStance);

    if (!computation) {
        // No commander or always-comply case
        const commander = getCorpsCommander(corpsId, state);
        return {
            predicted_compliance: 'full',
            effective_stance: orderedStance,
            reason: '',
            officer_name: commander?.data.name ?? '',
            officer_competence: commander?.data.competence ?? 0,
            officer_aggressiveness: commander?.data.aggressiveness ?? 0,
        };
    }

    return {
        predicted_compliance: computation.compliance,
        effective_stance: computation.effective_stance,
        reason: computation.reason,
        officer_name: computation.officer_name,
        officer_competence: computation.officer_competence,
        officer_aggressiveness: computation.officer_aggressiveness,
    };
}

/**
 * Record a presidential override against a corps's current commanding officer — the
 * BARE officer-state mutation, factored out of `overrideInterpretation` so it can be
 * invoked WITHOUT a synthesized PendingOfficerEvent (e.g. by the force-op pushback
 * consequence path in war_phases.ts `inject-op-directive`, where the president forced a
 * requested op past a shown commander objection).
 *
 * Effects (deterministic; no Math.random/Date.now):
 *  - bump override_count + set last_override_turn to `turn`;
 *  - on the cowed threshold (override_count ≥ COWED_OVERRIDE_THRESHOLD within
 *    COWED_OVERRIDE_WINDOW of the prior override) set cowed_until_turn and reset the count;
 *  - append a sorted `recent_overrides` entry (resolution 'override') for the
 *    political-bot auto-relief window (A2/A4 substrate).
 *
 * No-op when the corps has no active named commander. Does NOT acknowledge any event
 * (that stays the caller's concern).
 */
export function recordPresidentialOverride(
    state: GameState,
    corpsId: string,
    turn: number,
): void {
    const commander = getCorpsCommander(corpsId, state);
    if (!commander) return;

    const officerState = commander.state;
    const prevLastOverrideTurn = officerState.last_override_turn;

    // Increment override count.
    officerState.override_count = (officerState.override_count ?? 0) + 1;
    officerState.last_override_turn = turn;

    // Cowed condition: if the previous override was within COWED_OVERRIDE_WINDOW AND
    // override_count has reached COWED_OVERRIDE_THRESHOLD → cow the officer.
    const withinWindow =
        prevLastOverrideTurn !== undefined &&
        turn - prevLastOverrideTurn <= COWED_OVERRIDE_WINDOW;

    if (withinWindow && officerState.override_count >= COWED_OVERRIDE_THRESHOLD) {
        officerState.cowed_until_turn = turn + COWED_DURATION;
        officerState.override_count = 0;
    }

    // Append the rolling override-history entry (A2/A4 auto-relief window). Sorted by
    // turn ascending for determinism.
    const history = officerState.recent_overrides ?? [];
    history.push({ turn, resolution: 'override' });
    history.sort((a, b) => a.turn - b.turn);
    officerState.recent_overrides = history;
}

/**
 * Handle player override of an officer interpretation event.
 * Increments override_count, checks for cowed condition (via recordPresidentialOverride).
 * NOTE: Applying original_order.stance back to CorpsCommandState is an IPC concern (Phase 2).
 * This function only handles officer state mutation and event acknowledgment.
 */
export function overrideInterpretation(
    state: GameState,
    corpsId: string,
    eventId: string,
): void {
    if (!state.military.pending_officer_events) return;

    const event = state.military.pending_officer_events.find(e => e.event_id === eventId);
    if (!event || !event.overridable) return;

    const officers = state.military.named_officers;
    if (!officers) return;

    // Find the officer for this corps
    const commander = getCorpsCommander(corpsId, state);
    if (!commander) return;

    // Officer-state mutation (override_count / last_override_turn / cowed / history).
    recordPresidentialOverride(state, corpsId, state.meta.turn);

    // Mark event acknowledged
    event.acknowledged = true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 2: Operation Interpretation
// ═══════════════════════════════════════════════════════════════════════════

export interface LaunchInterpretationResult {
    compliance: 'full' | 'modified' | 'partial' | 'refused';
    effective_planning_duration?: number; // undefined = no change
    effective_objectives?: string[];      // undefined = no change (trimmed subset)
    event?: PendingOfficerEvent;
    reason?: string;
}

export interface HaltInterpretationResult {
    compliance: 'full' | 'modified' | 'partial' | 'refused';
    halt_delay_turns?: number; // turns before halt takes effect
    event?: PendingOfficerEvent;
    reason?: string;
}

/**
 * Interpret a player-issued operation launch order through the corps commander's personality.
 * Cautious officers may delay planning; aggressive officers may trim objectives.
 * Refused officers abort the operation outright.
 *
 * Phase 3 seam: reliabilityModifier is 0.0 until political_reliability is wired.
 */
export function interpretOperationLaunch(
    state: GameState,
    corpsId: string,
    operationName: string,
): LaunchInterpretationResult {
    const corpsCommand = state.military.corps_command?.[corpsId];

    // Fast-path: no corps command entry
    if (!corpsCommand) return { compliance: 'full' };

    const op = corpsCommand.active_operations?.find(o => o.name === operationName);

    // Fast-path: operation not found or not in planning phase
    if (!op || op.phase !== 'planning') return { compliance: 'full' };

    const commander = getCorpsCommander(corpsId, state);

    // Fast-path: no named commander
    if (!commander) return { compliance: 'full' };

    const { data, state: officerState } = commander;

    // Fast-path: acting commander always complies
    if (officerState.acting_commander) return { compliance: 'full' };

    // Fast-path: cowed officer always complies
    if ((officerState.cowed_until_turn ?? 0) >= state.meta.turn) return { compliance: 'full' };

    const aggressiveness = data.aggressiveness;
    const preferredStance = computePreferredStance(aggressiveness);
    const orderedRank = 2.0; // launch = full offensive intent
    const preferredRank = STANCE_RANKS[preferredStance] ?? 1;
    const reliabilityModifier = computeEffectiveReliabilityModifier(data, state);

    const score = computeComplianceScore(data.competence, aggressiveness, orderedRank, preferredRank, reliabilityModifier);

    const eventIdBase = `${corpsId}:launch:${operationName}:${state.meta.turn}`;

    if (score >= FULL_COMPLIANCE_THRESHOLD) {
        return { compliance: 'full' };
    }

    if (score >= MODIFIED_COMPLIANCE_THRESHOLD) {
        // Balanced officers (agg 3) comply on launch without side effects
        if (aggressiveness === 3) {
            return { compliance: 'full' };
        }

        let effectivePlanningDuration: number | undefined;
        let effectiveObjectives: string[] | undefined;

        if (aggressiveness <= 2) {
            // Cautious: extend planning duration
            const extra = CAUTIOUS_EXTRA_PREP_TURNS[aggressiveness] ?? 0;
            const current = op.planning_duration ?? 0;
            effectivePlanningDuration = current + extra;
            op.planning_duration = effectivePlanningDuration;
        } else {
            // Aggressive (agg >= 4): trim last objective
            if (op.objectives && op.objectives.length > 1) {
                effectiveObjectives = op.objectives.slice(0, -1);
                op.objectives = effectiveObjectives;
            }
        }

        const reason = `${data.name} modifies the operation plan before launch.`;
        const event = buildOperationEvent(
            'order_modified',
            eventIdBase,
            corpsId,
            data,
            operationName,
            reason,
            state,
        );
        pushOfficerEvent(state, event);
        return { compliance: 'modified', effective_planning_duration: effectivePlanningDuration, effective_objectives: effectiveObjectives, event, reason };
    }

    if (score >= PARTIAL_COMPLIANCE_THRESHOLD) {
        // Partial: extend planning duration AND trim one objective
        let effectivePlanningDuration: number | undefined;
        let effectiveObjectives: string[] | undefined;

        const extra = CAUTIOUS_EXTRA_PREP_TURNS[Math.min(aggressiveness, CAUTIOUS_EXTRA_PREP_TURNS.length - 1)] ?? 0;
        if (extra > 0) {
            const current = op.planning_duration ?? 0;
            effectivePlanningDuration = current + extra;
            op.planning_duration = effectivePlanningDuration;
        }

        if (op.objectives && op.objectives.length > 1) {
            effectiveObjectives = op.objectives.slice(0, -1);
            op.objectives = effectiveObjectives;
        }

        const reason = `${data.name} pushes back on the operation scope before launch.`;
        const event = buildOperationEvent(
            'order_pushback',
            eventIdBase,
            corpsId,
            data,
            operationName,
            reason,
            state,
        );
        pushOfficerEvent(state, event);
        return { compliance: 'partial', effective_planning_duration: effectivePlanningDuration, effective_objectives: effectiveObjectives, event, reason };
    }

    // Refused: abort the operation
    op.recovery_reason = 'manual_termination';
    const reason = `${data.name} refuses to launch the operation.`;
    const event = buildOperationEvent(
        'order_refused',
        eventIdBase,
        corpsId,
        data,
        operationName,
        reason,
        state,
    );
    pushOfficerEvent(state, event);
    return { compliance: 'refused', event, reason };
}

/**
 * Interpret a player-issued operation halt order through the corps commander's personality.
 * Aggressive officers in momentum may delay the halt or refuse outright.
 *
 * Phase 3 seam: reliabilityModifier is 0.0 until political_reliability is wired.
 */
export function interpretOperationHalt(
    state: GameState,
    corpsId: string,
    operationName: string,
): HaltInterpretationResult {
    const corpsCommand = state.military.corps_command?.[corpsId];

    // Fast-path: no corps command entry
    if (!corpsCommand) return { compliance: 'full', halt_delay_turns: 0 };

    const op = corpsCommand.active_operations?.find(o => o.name === operationName);

    // Fast-path: operation not found or not active
    if (!op || op.phase !== 'execution') return { compliance: 'full', halt_delay_turns: 0 };

    const commander = getCorpsCommander(corpsId, state);

    // Fast-path: no named commander
    if (!commander) return { compliance: 'full', halt_delay_turns: 0 };

    const { data, state: officerState } = commander;

    // Fast-path: acting commander always complies
    if (officerState.acting_commander) return { compliance: 'full', halt_delay_turns: 0 };

    // Fast-path: cowed officer always complies
    if ((officerState.cowed_until_turn ?? 0) >= state.meta.turn) return { compliance: 'full', halt_delay_turns: 0 };

    const aggressiveness = data.aggressiveness;
    const preferredStance = computePreferredStance(aggressiveness);
    const orderedRank = 0.0; // halt = full defensive intent
    const preferredRank = STANCE_RANKS[preferredStance] ?? 1;
    const reliabilityModifier = computeEffectiveReliabilityModifier(data, state);

    const score = computeComplianceScore(data.competence, aggressiveness, orderedRank, preferredRank, reliabilityModifier);

    const eventIdBase = `${corpsId}:halt:${operationName}:${state.meta.turn}`;

    if (score >= FULL_COMPLIANCE_THRESHOLD) {
        return { compliance: 'full', halt_delay_turns: 0 };
    }

    if (score >= MODIFIED_COMPLIANCE_THRESHOLD) {
        const reason = `${data.name} acknowledges the halt order but needs one turn to disengage.`;
        const event = buildOperationEvent(
            'order_modified',
            eventIdBase,
            corpsId,
            data,
            operationName,
            reason,
            state,
        );
        pushOfficerEvent(state, event);
        return { compliance: 'modified', halt_delay_turns: 1, event, reason };
    }

    if (score >= PARTIAL_COMPLIANCE_THRESHOLD) {
        // Aggressive officer with momentum resists halt
        const hasMomentum = (op.momentum ?? 0) >= HALT_DELAY_MOMENTUM_THRESHOLD;
        const delay = hasMomentum ? AGGRESSIVE_HALT_DELAY : 1;
        const reason = `${data.name} pushes back on halting while the operation has momentum.`;
        const event = buildOperationEvent(
            'order_pushback',
            eventIdBase,
            corpsId,
            data,
            operationName,
            reason,
            state,
        );
        pushOfficerEvent(state, event);
        return { compliance: 'partial', halt_delay_turns: delay, event, reason };
    }

    // Refused: op continues, delay applied
    const reason = `${data.name} refuses to halt the operation.`;
    const event = buildOperationEvent(
        'order_refused',
        eventIdBase,
        corpsId,
        data,
        operationName,
        reason,
        state,
    );
    pushOfficerEvent(state, event);
    return { compliance: 'refused', halt_delay_turns: AGGRESSIVE_HALT_DELAY, event, reason };
}

// ─── Phase 2 internal helpers ────────────────────────────────────────────────

function buildOperationEvent(
    type: OfficerEventType,
    eventId: string,
    corpsId: string,
    data: { id: string; name: string; faction: FactionId },
    operationName: string,
    reason: string,
    state: GameState,
): PendingOfficerEvent {
    const originalOrder: OrderSnapshot = {
        order_type: 'operation_launch',
        corps_id: corpsId,
        operation_name: operationName,
    };
    return {
        event_id: eventId,
        type,
        faction: data.faction,
        turn: state.meta.turn,
        officer_id: data.id,
        corps_id: corpsId,
        acknowledged: false,
        original_order: originalOrder,
        reason,
        overridable: true,
        override_action: 'override-officer-interpretation',
    };
}

function pushOfficerEvent(state: GameState, event: PendingOfficerEvent): void {
    if (!state.military.pending_officer_events) {
        state.military.pending_officer_events = [];
    }
    state.military.pending_officer_events.push(event);
}

/**
 * Relieve (fire) a named officer from their corps command.
 * Finds a replacement, sets acting commander flag, applies morale penalty.
 * Emits an officer_relieved PendingOfficerEvent.
 *
 * NOTE: Morale application to brigades is documented as TODO — no brigade morale field
 * is directly accessible here without iterating formations. The penalty is returned
 * in ReliefResult for the caller to apply as appropriate.
 */
export function relieveOfficer(
    state: GameState,
    officerId: string,
    corpsId: string,
): ReliefResult {
    const noOp: ReliefResult = {
        relieved_officer_id: officerId,
        replacement_officer_id: null,
        transition_penalty_turns: 0,
        morale_hit: 0,
    };

    const officers = state.military.named_officers;
    const officerData = state.military.named_officer_data;
    if (!officers || !officerData) return noOp;

    const officerState = officers[officerId];
    if (!officerState || officerState.status !== 'active') return noOp;
    if (officerState.assigned_corps_id !== corpsId) return noOp;

    const data = officerData.find(o => o.id === officerId);
    if (!data) return noOp;

    // Mark officer as retired and unassign from corps
    officerState.status = 'retired';
    officerState.assigned_corps_id = null;

    // Find best available replacement from reserve pool
    type ReplacementCandidate = { id: string; competence: number; pool_tier: string };
    const TIER_PRIORITY: Record<string, number> = { starter: 0, tier_a: 1, tier_b: 2, tier_c: 3 };
    const candidates = officerData
        .filter(o =>
            o.faction === data.faction &&
            o.rank === 'corps_commander' &&
            o.id !== officerId &&
            officers[o.id]?.status === 'reserve'
        )
        .sort((a, b) => {
            const aHome = a.home_corps_id === corpsId ? 0 : 1;
            const bHome = b.home_corps_id === corpsId ? 0 : 1;
            if (aHome !== bHome) return aHome - bHome;
            const aTier = TIER_PRIORITY[a.pool_tier] ?? 99;
            const bTier = TIER_PRIORITY[b.pool_tier] ?? 99;
            if (aTier !== bTier) return aTier - bTier;
            if (a.competence !== b.competence) return b.competence - a.competence;
            return strictCompare(a.id, b.id);
        });

    let replacementId: string | null = null;

    if (candidates.length > 0) {
        const replacement = candidates[0]!;
        replacementId = replacement.id;
        const repState = officers[replacementId]!;
        repState.status = 'active';
        repState.assigned_corps_id = corpsId;
        repState.turns_in_command = 0;
        repState.acting_commander = true; // Acting for RELIEF_ACTING_DURATION turns
    } else {
        // Create generic acting commander
        const turn = state.meta.turn;
        const genericId = `generic_relief_${data.faction}_${corpsId}_t${turn}`;
        const factionConfig = state.military.war_timeline?.officer_config?.[data.faction];
        const genericComp = factionConfig?.generic_replacement_competence ?? 2;

        const genericData = {
            id: genericId,
            name: `Acting Commander (${corpsId})`,
            faction: data.faction,
            rank: 'corps_commander' as const,
            competence: genericComp,
            aggressiveness: 3,
            defensive_skill: 2,
            political_reliability: 3,
            home_corps_id: corpsId,
            available_from_turn: turn,
            origin: 'military' as const,
            casualty_vulnerability: 0.15,
            can_improve: true,
            improvement_rate: 0.06,
            pool_tier: 'tier_c' as const,
        };
        officerData.push(genericData);
        officers[genericId] = {
            officer_id: genericId,
            status: 'active',
            assigned_corps_id: corpsId,
            turns_in_command: 0,
            battles: 0,
            victories: 0,
            effective_competence_penalty: 0,
            penalty_turns_remaining: 0,
            acting_commander: true,
        };
        replacementId = genericId;
    }

    // TODO: Apply RELIEF_MORALE_PENALTY to brigades assigned to this corps.
    // Iterating formations here would create a dependency; returned in ReliefResult
    // so the caller (IPC handler, Phase 2) can apply it to relevant formations.

    // Emit officer_relieved event
    if (!state.military.pending_officer_events) {
        state.military.pending_officer_events = [];
    }
    const event: PendingOfficerEvent = {
        event_id: `${corpsId}:relieved:${state.meta.turn}`,
        type: 'officer_relieved',
        faction: data.faction,
        turn: state.meta.turn,
        officer_id: officerId,
        corps_id: corpsId,
        acknowledged: false,
        reason: `Officer ${data.name} was relieved of command.`,
    };
    state.military.pending_officer_events.push(event);

    return {
        relieved_officer_id: officerId,
        replacement_officer_id: replacementId,
        transition_penalty_turns: RELIEF_ACTING_DURATION,
        morale_hit: RELIEF_MORALE_PENALTY,
    };
}
