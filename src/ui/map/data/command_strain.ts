/**
 * Command Strain — derived per-corps metric.
 *
 * Computes a command strain score for a given corps from existing data:
 *   - active operations with was_force_launched=true (+3 each)
 *   - unresolved warlord friction events for that corps's commander (+2 each)
 *   - turn-based decay (−1 per turn elapsed since the event, floor 0)
 *
 * This is a DERIVED value — NOT stored on GameState. Computed on-read.
 * Deterministic: all inputs are sorted, no Math.random(), no Date.now().
 *
 * See docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md §Level 3.
 */

import type { GameState } from '../../../state/game_state.js';
import type { FrictionEvent } from '../../../sim/combat/warlord_friction.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Strain added per force-launched active operation on this corps. */
const FORCE_LAUNCH_STRAIN = 3;

/** Strain added per unresolved warlord friction event for this corps's commander. */
const FRICTION_EVENT_STRAIN = 2;

/** Strain decay per turn (applied to turn-age of each contributing event). */
const DECAY_PER_TURN = 1;

/** Strain threshold for 'strained' label. */
const STRAINED_THRESHOLD = 1;

/** Strain threshold for 'compromised' label. */
const COMPROMISED_THRESHOLD = 6;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type CommandStrainLabel = 'healthy' | 'strained' | 'compromised';

// ═══════════════════════════════════════════════════════════════════════════
// Core
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the command strain score for a specific corps.
 *
 * Strain sources (each decayed by 1 per turn since they occurred):
 *  - Each force-launched active operation on this corps: +3
 *  - Each unresolved warlord friction event for this corps's active commander: +2
 *
 * Decay: each source contributes Math.max(0, rawStrain − turnAge).
 * Total is summed and floored at 0.
 *
 * @param corpsId - The corps formation ID to compute strain for.
 * @param state   - Raw GameState (not adapted). Read-only.
 * @returns integer strain score [0, ∞). 0 = healthy, 1–5 = strained, 6+ = compromised.
 */
export function computeCorpsCommandStrain(corpsId: string, state: GameState): number {
    const currentTurn = state.meta?.turn ?? 0;
    let totalStrain = 0;

    // ── Source 1: force-launched active operations on this corps ──────────
    const corps = state.military.corps_command?.[corpsId];
    if (corps) {
        // Sort by name for determinism
        const activeOps = [...(corps.active_operations ?? [])].sort((a, b) =>
            a.name.localeCompare(b.name)
        );
        for (const op of activeOps) {
            if (op.was_force_launched !== true) continue;
            const launchTurn = op.started_turn ?? currentTurn;
            const turnAge = Math.max(0, currentTurn - launchTurn);
            const rawStrain = FORCE_LAUNCH_STRAIN;
            totalStrain += Math.max(0, rawStrain - turnAge);
        }
    }

    // ── Source 2: unresolved friction events for this corps's commander ───
    const frictionEvents: FrictionEvent[] = state.military.friction_events ?? [];
    // Find which officer is the active commander of this corps
    const namedOfficers = state.military.named_officers;
    if (namedOfficers) {
        // Sorted officer IDs for determinism
        const officerIds = Object.keys(namedOfficers).sort();
        for (const officerId of officerIds) {
            const os = namedOfficers[officerId];
            if (!os || os.status !== 'active' || os.assigned_corps_id !== corpsId) continue;
            // This officer commands the corps — find their unresolved friction events
            // Sort events by turn for determinism
            const officerEvents = frictionEvents
                .filter((e: FrictionEvent) => e.officer_id === officerId && !e.resolved)
                .sort((a, b) => a.turn - b.turn);
            for (const event of officerEvents) {
                const turnAge = Math.max(0, currentTurn - event.turn);
                const rawStrain = FRICTION_EVENT_STRAIN;
                totalStrain += Math.max(0, rawStrain - turnAge);
            }
        }
    }

    return Math.max(0, Math.round(totalStrain));
}

/**
 * Convert a numeric strain score to a player-facing label.
 *
 * @param score - Result of computeCorpsCommandStrain.
 * @returns 'healthy' | 'strained' | 'compromised'
 */
export function getCommandStrainLabel(score: number): CommandStrainLabel {
    if (score >= COMPROMISED_THRESHOLD) return 'compromised';
    if (score >= STRAINED_THRESHOLD) return 'strained';
    return 'healthy';
}

// ═══════════════════════════════════════════════════════════════════════════
// Order Interpretation Preview — Wave 5
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Describes how Army HQ is reading a presidential launch order given current
 * command strain context. Used to surface institutional context before the
 * player commits to a go/no-go decision — even on clean (non-overriding) approvals.
 *
 * Silence = healthy: cautionNotice is null when severity === 'normal'.
 */
export interface OrderInterpretation {
    severity: 'normal' | 'caution' | 'alarm';
    /** null when severity === 'normal' (silence = healthy). */
    cautionNotice: string | null;
    /** 'direct_intervention' when player would be overriding a reluctant commander. */
    interventionStrength: 'ordinary_approval' | 'direct_intervention';
}

/**
 * Derive how Army HQ interprets an incoming launch order given the corps's
 * current command strain and the commander's standing assessment.
 *
 * @param strain               - Current command strain score for this corps.
 * @param commanderAssessment  - The commander's standing assessment ('launch', 'postpone', 'abort', or absent).
 * @returns OrderInterpretation — pure derivation, no side effects.
 */
export function deriveOrderInterpretation(
    strain: number,
    commanderAssessment: 'launch' | 'postpone' | 'abort' | null | undefined,
): OrderInterpretation {
    // Severity tier
    const severity: 'normal' | 'caution' | 'alarm' =
        strain === 0 ? 'normal'
        : strain >= COMPROMISED_THRESHOLD ? 'alarm'
        : 'caution';

    // Caution notice — silence = healthy
    const cautionNotice: string | null =
        severity === 'normal' ? null
        : severity === 'caution'
            ? 'This corps is carrying command strain from recent presidential interventions. Operations proceed, but at elevated institutional friction.'
            : 'Command cohesion is compromised. Institutional damage is severe. Further operations risk command breakdown.';

    // Intervention strength
    const interventionStrength: 'ordinary_approval' | 'direct_intervention' =
        commanderAssessment === 'postpone' || commanderAssessment === 'abort'
            ? 'direct_intervention'
            : 'ordinary_approval';

    return { severity, cautionNotice, interventionStrength };
}

// ═══════════════════════════════════════════════════════════════════════════
// Operation Outcome Category — Wave 7
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The institutional outcome category of an operation launch decision.
 *
 * Derived from the launch snapshot — pure function, no side effects.
 *
 * - ordinary_compliance:  commander recommended launch; president approved. Normal channel.
 * - reluctant_compliance: commander recommended postpone/abort; president launched via
 *                         ordinary approval (no CA spent, no Direct Intervention flag).
 *                         The command chain complied under presidential direction.
 * - direct_intervention:  president force-launched against commander judgment; CA was spent.
 *                         Sets was_force_launched=true in engine state.
 */
export type OperationOutcomeCategory = 'ordinary_compliance' | 'reluctant_compliance' | 'direct_intervention';

/**
 * Derive the outcome category for an operation launch.
 *
 * @param assessmentAtLaunch - Commander's recommendation at the moment of presidential decision.
 * @param wasForce           - Whether the president used Direct Intervention (CA spent).
 * @returns OperationOutcomeCategory — pure derivation, no side effects.
 */
export function deriveOperationOutcomeCategory(
    assessmentAtLaunch: 'launch' | 'postpone' | 'abort' | null | undefined,
    wasForce: boolean,
): OperationOutcomeCategory {
    if (wasForce) return 'direct_intervention';
    if (assessmentAtLaunch === 'postpone' || assessmentAtLaunch === 'abort') return 'reluctant_compliance';
    return 'ordinary_compliance';
}

// ═══════════════════════════════════════════════════════════════════════════
// Stance Interpretation Preview — Wave 6
// ═══════════════════════════════════════════════════════════════════════════

export interface StanceInterpretation {
    severity: 'normal' | 'caution' | 'constrained';
    /** null when severity === 'normal' (silence = healthy). */
    notice: string | null;
    /** true when the stance is blocked by command state (compromised + offensive). */
    isBlocked: boolean;
}

/**
 * Derive how Army HQ interprets an incoming stance-change order given current
 * command strain. Used to surface institutional context before the player
 * commits to a stance change — or to explain why a stance is unavailable.
 *
 * Silence = healthy: notice is null when severity === 'normal'.
 *
 * @param strain          - Current command strain score for this corps.
 * @param strainLabel     - Derived strain label ('healthy' | 'strained' | 'compromised').
 * @param requestedStance - The stance the player is about to request.
 * @returns StanceInterpretation — pure derivation, no side effects.
 */
export function deriveStanceInterpretation(
    strain: number,
    strainLabel: CommandStrainLabel,
    requestedStance: string,
): StanceInterpretation {
    // Compromised + offensive → constrained (IPC also blocks this)
    if (requestedStance === 'offensive' && strainLabel === 'compromised') {
        return {
            severity: 'constrained',
            notice: 'Offensive posture is unavailable. Command cohesion is compromised — restore the command relationship first.',
            isBlocked: true,
        };
    }
    // Strained + offensive → caution
    if (requestedStance === 'offensive' && strain > 0) {
        return {
            severity: 'caution',
            notice: 'Requesting aggressive posture while command relationship is strained. This stance is available but operations proceed at elevated institutional friction.',
            isBlocked: false,
        };
    }
    // All other: silence = healthy
    return { severity: 'normal', notice: null, isBlocked: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// Operation Trend Summary — Wave 9
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aggregated command-relationship summary for a list of completed operations.
 * Silence = healthy: trendNotice is null when all ops are ordinary compliance.
 */
export interface OperationTrendSummary {
    totalCompleted: number;
    directInterventions: number;
    reluctantCompliance: number;
    /** null when healthy — silence=healthy */
    trendNotice: string | null;
}

/**
 * Derive an aggregated command-relationship summary from a list of completed operations.
 *
 * Pure function — no GameState, no side effects. Accepts a minimal subset of
 * CompletedOp fields so it can be called with any compatible array.
 *
 * @param completedOps - Array of completed ops (only force_launched + commander_assessment_at_launch used).
 * @returns OperationTrendSummary — trendNotice is null when all ops are ordinary compliance.
 */
export function buildOperationTrendSummary(
    completedOps: Array<{
        force_launched?: boolean;
        commander_assessment_at_launch?: 'launch' | 'postpone' | 'abort';
    }>
): OperationTrendSummary {
    const total = completedOps.length;
    let directInterventions = 0;
    let reluctantCompliance = 0;
    for (const op of completedOps) {
        const cat = deriveOperationOutcomeCategory(op.commander_assessment_at_launch, op.force_launched ?? false);
        if (cat === 'direct_intervention') directInterventions++;
        else if (cat === 'reluctant_compliance') reluctantCompliance++;
    }
    // Silence = healthy: no notice if all ordinary compliance
    const nonCompliant = directInterventions + reluctantCompliance;
    let trendNotice: string | null = null;
    if (total > 0 && nonCompliant > 0) {
        const parts: string[] = [];
        if (directInterventions > 0) parts.push(`${directInterventions} Direct Intervention${directInterventions > 1 ? 's' : ''}`);
        if (reluctantCompliance > 0) parts.push(`${reluctantCompliance} Reluctant Compliance${reluctantCompliance > 1 ? 's' : ''}`);
        trendNotice = parts.join(', ');
    }
    return { totalCompleted: total, directInterventions, reluctantCompliance, trendNotice };
}
