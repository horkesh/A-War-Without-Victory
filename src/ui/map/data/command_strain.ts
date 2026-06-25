/**
 * Command Strain — derived per-corps metric.
 *
 * Computes a command strain score for a given corps from existing data:
 *   - Source 1: active operations with was_force_launched=true (+3 each, decayed -1/turn)
 *   - Source 2: unresolved warlord friction events for that corps's commander (+2 each, decayed -1/turn)
 *   - Source 3: corps exhaustion above threshold (+1 at ≥50, +2 at ≥75; no decay — persists while condition persists)
 *
 * This is a DERIVED value — NOT stored on GameState. Computed on-read.
 * Deterministic: all inputs are sorted, no Math.random(), no Date.now().
 *
 * See docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md §Level 3.
 */

import type { GameState } from '../../../state/game_state.js';
import type { FrictionEvent } from '../../../sim/combat/warlord_friction.js';
import { getPlayerSafeOperationBalancePresentation } from '../../../shared/playerSafeOperationBalance';
import type { MessageKey } from '../i18n';

type CommandCopyParams = Record<string, string | number>;

export interface CommandCopyToken {
    key: MessageKey;
    params?: CommandCopyParams;
    fallback: string;
}

function copyToken(key: MessageKey, fallback: string, params?: CommandCopyParams): CommandCopyToken {
    return params ? { key, params, fallback } : { key, fallback };
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Strain added per force-launched active operation on this corps. */
const FORCE_LAUNCH_STRAIN = 3;

/** Strain added per unresolved warlord friction event for this corps's commander. */
const FRICTION_EVENT_STRAIN = 2;

/** Strain decay per turn (applied to turn-age of each contributing event). */
const DECAY_PER_TURN = 1;

/** Corps exhaustion threshold for mild strain contribution. */
const EXHAUSTION_STRAIN_THRESHOLD = 50;

/** Corps exhaustion threshold for severe strain contribution. */
const EXHAUSTION_STRAIN_SEVERE_THRESHOLD = 75;

/** Strain added when corps exhaustion >= EXHAUSTION_STRAIN_THRESHOLD. */
const EXHAUSTION_STRAIN_MILD = 1;

/** Strain added when corps exhaustion >= EXHAUSTION_STRAIN_SEVERE_THRESHOLD (replaces mild). */
const EXHAUSTION_STRAIN_SEVERE = 2;

/** Strain threshold for 'strained' label. */
const STRAINED_THRESHOLD = 1;

/** Strain threshold for 'compromised' label. */
const COMPROMISED_THRESHOLD = 6;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type CommandStrainLabel = 'healthy' | 'strained' | 'compromised';

/** Exported for tests and UI: threshold at which exhaustion starts contributing to strain. */
export { EXHAUSTION_STRAIN_THRESHOLD, EXHAUSTION_STRAIN_SEVERE_THRESHOLD };

/**
 * Check whether corps exhaustion is contributing to command strain.
 * Pure function — for UI display only (e.g., explaining strain sources).
 */
export function isExhaustionContributingToStrain(corpsExhaustion: number): boolean {
    return corpsExhaustion >= EXHAUSTION_STRAIN_THRESHOLD;
}

// ═══════════════════════════════════════════════════════════════════════════
// Core
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the command strain score for a specific corps.
 *
 * Strain sources:
 *  - Each force-launched active operation on this corps: +3 (decayed -1/turn)
 *  - Each unresolved warlord friction event for this corps's active commander: +2 (decayed -1/turn)
 *  - Corps exhaustion ≥50: +1; ≥75: +2 (no decay — persists while condition persists)
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

    // ── Source 3: corps exhaustion above threshold ────────────────────────
    // No decay — strain persists while the underlying condition persists.
    // Stabilization does not resolve exhaustion-driven strain.
    if (corps) {
        const exhaustion = typeof corps.corps_exhaustion === 'number' ? corps.corps_exhaustion : 0;
        if (exhaustion >= EXHAUSTION_STRAIN_SEVERE_THRESHOLD) {
            totalStrain += EXHAUSTION_STRAIN_SEVERE;
        } else if (exhaustion >= EXHAUSTION_STRAIN_THRESHOLD) {
            totalStrain += EXHAUSTION_STRAIN_MILD;
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

export function normalizeCommandStrainLabel(
    score: number | null | undefined,
    label: CommandStrainLabel | null | undefined,
): CommandStrainLabel {
    if (label) return label;
    return getCommandStrainLabel(typeof score === 'number' && Number.isFinite(score) ? score : 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// Order Interpretation Preview — Wave 5 / Wave 1 Category Extension
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The institutional source of drag on a presidential directive.
 * Used in DragFactor to classify what is creating resistance.
 */
export type DragSource =
    | 'command_strain'       // institutional damage from force launches / friction / exhaustion
    | 'professional_caution' // commander's professional judgment (postpone/abort recommendation)
    | 'hard_constraint'      // structural operational constraint (siege, threat, garrison)
    | 'timing_gap';          // tempo mismatch — approaching readiness, directive premature

/**
 * A single interpretable drag factor on a presidential directive.
 * Ordered list: primary factor first, secondary (if any) second.
 */
export interface DragFactor {
    source: DragSource;
    intensity: 'mild' | 'moderate' | 'severe';
    /** true for the dominant drag source; false for secondary/reinforcing */
    isPrimary: boolean;
    /** Compact player-facing label line (no period at end) */
    label: string;
    /** Localized render token for player-facing UI; label remains fallback/test compatibility. */
    labelToken?: CommandCopyToken;
}

/**
 * Classifies the dominant institutional drag shaping how command reads a presidential directive.
 * Used by OrderInterpretationSection for the interpretation category badge.
 */
export type OrderInterpretationCategory =
    | 'strain_shaped'             // command strain is the primary institutional driver
    | 'caution_driven'            // commander reads directive against professional judgment (readiness caution)
    | 'feasibility_constrained'   // hard structural constraint is blocking compliance
    | 'tempo_resistant'           // commander approaching readiness, reads directive as premature
    | 'normal';                   // silence = healthy, no institutional drag

/**
 * Describes how Army HQ is reading a presidential launch order given current
 * command strain context. Used to surface institutional context before the
 * player commits to a go/no-go decision — even on clean (non-overriding) approvals.
 *
 * Silence = healthy: cautionNotice is null when severity === 'normal'.
 */
export interface OrderInterpretation {
    severity: 'normal' | 'caution' | 'alarm';
    /** Dominant institutional drag category shaping this interpretation. */
    category: OrderInterpretationCategory;
    /** null when severity === 'normal' (silence = healthy). */
    cautionNotice: string | null;
    cautionNoticeToken?: CommandCopyToken | null;
    /** Compact badge label. null when category === 'normal'. */
    categoryLabel: string | null;
    categoryLabelKey?: MessageKey | null;
    /** 'direct_intervention' when player would be overriding a reluctant commander. */
    interventionStrength: 'ordinary_approval' | 'direct_intervention';
    /** Ordered drag factors (primary first). Empty array when category === 'normal'. */
    dragFactors: DragFactor[];
}

/**
 * Derive how Army HQ interprets an incoming launch order given the corps's
 * current command strain and the commander's standing assessment.
 *
 * Priority order for category classification:
 *  1. strain >= COMPROMISED_THRESHOLD → strain_shaped / alarm
 *  2. strain > 0 → strain_shaped / caution
 *  3. primaryConstraint in ['siege','threat_pressure','defensive_duty'] AND assessment postpone/abort → feasibility_constrained
 *  4. assessment === 'postpone' AND trendDirection === 'improving' → tempo_resistant
 *  5. assessment === 'postpone' || 'abort' → caution_driven
 *  6. else → normal
 *
 * @param strain               - Current command strain score for this corps.
 * @param commanderAssessment  - The commander's standing assessment ('launch', 'postpone', 'abort', or absent).
 * @param primaryConstraint    - Optional: from classifyPrimaryConstraint() result.
 * @param trendDirection       - Optional: from deriveReadinessTrend() result.
 * @returns OrderInterpretation — pure derivation, no side effects.
 */
export function deriveOrderInterpretation(
    strain: number,
    commanderAssessment: 'launch' | 'postpone' | 'abort' | null | undefined,
    primaryConstraint?: string | null,
    trendDirection?: string | null,
    postponementCount?: number,
): OrderInterpretation {
    // ── Category + severity classification (priority order) ────────────────
    let category: OrderInterpretationCategory;
    let severity: 'normal' | 'caution' | 'alarm';

    if (strain >= COMPROMISED_THRESHOLD) {
        category = 'strain_shaped';
        severity = 'alarm';
    } else if (strain > 0) {
        category = 'strain_shaped';
        severity = 'caution';
    } else if (
        (primaryConstraint === 'siege' ||
            primaryConstraint === 'threat_pressure' ||
            primaryConstraint === 'defensive_duty') &&
        (commanderAssessment === 'postpone' || commanderAssessment === 'abort')
    ) {
        category = 'feasibility_constrained';
        severity = 'caution';
    } else if (commanderAssessment === 'postpone' && trendDirection === 'improving') {
        category = 'tempo_resistant';
        severity = 'caution';
    } else if (commanderAssessment === 'postpone' || commanderAssessment === 'abort') {
        category = 'caution_driven';
        severity = 'caution';
    } else {
        category = 'normal';
        severity = 'normal';
    }

    // ── Caution notice — silence = healthy ─────────────────────────────────
    let cautionNotice: string | null;
    switch (category) {
        case 'strain_shaped':
            cautionNotice = severity === 'alarm'
                ? 'Command cohesion is compromised. Institutional damage is severe. Further operations risk command breakdown.'
                : 'This corps carries command strain from recent interventions. Operations proceed at elevated institutional friction.';
            break;
        case 'feasibility_constrained':
            cautionNotice = 'Command is reading this directive as operationally blocked. Hard constraints prevent compliance regardless of presidential intent.';
            break;
        case 'tempo_resistant':
            cautionNotice = 'Command is approaching readiness. The corps interprets this directive as premature — compliance will proceed but coordination is sub-optimal.';
            break;
        case 'caution_driven':
            cautionNotice = 'Command is interpreting this directive against professional judgment. The corps recommends waiting but will comply under presidential direction.';
            break;
        default:
            cautionNotice = null;
    }

    // ── Drag factors (ordered, primary first) ─────────────────────────────────
    const cautionNoticeToken: CommandCopyToken | null =
        category === 'strain_shaped'
            ? severity === 'alarm'
                ? copyToken('commandStrain.order.notice.strainAlarm', cautionNotice ?? '')
                : copyToken('commandStrain.order.notice.strainCaution', cautionNotice ?? '')
            : category === 'feasibility_constrained'
                ? copyToken('commandStrain.order.notice.feasibility', cautionNotice ?? '')
                : category === 'tempo_resistant'
                    ? copyToken('commandStrain.order.notice.tempo', cautionNotice ?? '')
                    : category === 'caution_driven'
                        ? copyToken('commandStrain.order.notice.caution', cautionNotice ?? '')
                        : null;

    const dragFactors: DragFactor[] = [];

    switch (category) {
        case 'strain_shaped': {
            // Primary: command strain with intensity from score
            const strainIntensity: 'mild' | 'moderate' | 'severe' =
                strain >= COMPROMISED_THRESHOLD ? 'severe'
                : strain >= 3 ? 'moderate'
                : 'mild';
            const strainLabel =
                strainIntensity === 'severe' ? 'Command strain — severe (institutional damage)'
                : strainIntensity === 'moderate' ? 'Command strain — moderate (prior interventions)'
                : 'Command strain — mild (recent intervention)';
            const strainLabelKey =
                strainIntensity === 'severe' ? 'commandStrain.order.drag.strain.severe'
                : strainIntensity === 'moderate' ? 'commandStrain.order.drag.strain.moderate'
                : 'commandStrain.order.drag.strain.mild';
            dragFactors.push({ source: 'command_strain', intensity: strainIntensity, isPrimary: true, label: strainLabel, labelToken: copyToken(strainLabelKey, strainLabel) });

            // Secondary: professional caution if commander is reluctant
            if (commanderAssessment === 'postpone' || commanderAssessment === 'abort') {
                dragFactors.push({ source: 'professional_caution', intensity: 'mild', isPrimary: false, label: 'Commander also recommends waiting', labelToken: copyToken('commandStrain.order.drag.commanderWaiting', 'Commander also recommends waiting') });
            }
            break;
        }
        case 'caution_driven': {
            // Primary: professional caution, intensity modulated by prior postponements
            const count = postponementCount ?? 0;
            const cautionIntensity: 'mild' | 'moderate' | 'severe' = count > 1 ? 'moderate' : 'mild';
            const cautionLabel = count > 0
                ? `Professional judgment (${count} prior delay${count > 1 ? 's' : ''})`
                : commanderAssessment === 'abort'
                    ? 'Professional judgment — recommends abort'
                    : 'Professional judgment — recommends waiting';
            const cautionToken = count > 0
                ? copyToken(
                    count === 1 ? 'commandStrain.order.drag.priorDelays.one' : 'commandStrain.order.drag.priorDelays.many',
                    cautionLabel,
                    { count },
                )
                : commanderAssessment === 'abort'
                    ? copyToken('commandStrain.order.drag.recommendsAbort', cautionLabel)
                    : copyToken('commandStrain.order.drag.recommendsWaiting', cautionLabel);
            dragFactors.push({ source: 'professional_caution', intensity: cautionIntensity, isPrimary: true, label: cautionLabel, labelToken: cautionToken });
            break;
        }
        case 'feasibility_constrained': {
            // Primary: hard constraint (severe — blocks regardless of intent)
            dragFactors.push({ source: 'hard_constraint', intensity: 'severe', isPrimary: true, label: 'Hard operational limit — blocks compliance' });
            // Secondary: command strain if also present (strain=0 is the feasibility path, but guard anyway)
            if (strain > 0) {
                dragFactors.push({ source: 'command_strain', intensity: 'mild', isPrimary: false, label: 'Command strain also present' });
            }
            break;
        }
        case 'tempo_resistant': {
            // Primary: timing gap (mild — approaching readiness, not a hard block)
            dragFactors.push({ source: 'timing_gap', intensity: 'mild', isPrimary: true, label: 'Timing gap — approaching readiness, directive premature' });
            break;
        }
        // 'normal': no factors
    }

    // ── Category label (compact badge) ────────────────────────────────────
    for (const factor of dragFactors) {
        if (factor.labelToken) continue;
        if (factor.source === 'hard_constraint') {
            factor.labelToken = copyToken('commandStrain.order.drag.hardLimit', factor.label);
        } else if (factor.source === 'timing_gap') {
            factor.labelToken = copyToken('commandStrain.order.drag.timingGap', factor.label);
        } else if (factor.source === 'command_strain') {
            factor.labelToken = copyToken('commandStrain.order.drag.strainAlsoPresent', factor.label);
        }
    }

    let categoryLabel: string | null;
    let categoryLabelKey: MessageKey | null;
    switch (category) {
        case 'strain_shaped':         categoryLabel = 'STRAIN-SHAPED'; categoryLabelKey = 'commandStrain.order.category.strainShaped'; break;
        case 'feasibility_constrained': categoryLabel = 'FEASIBILITY'; categoryLabelKey = 'commandStrain.order.category.feasibility'; break;
        case 'tempo_resistant':       categoryLabel = 'TEMPO'; categoryLabelKey = 'commandStrain.order.category.tempo'; break;
        case 'caution_driven':        categoryLabel = 'CAUTION-DRIVEN'; categoryLabelKey = 'commandStrain.order.category.cautionDriven'; break;
        default:                      categoryLabel = null; categoryLabelKey = null;
    }

    // ── Intervention strength ──────────────────────────────────────────────
    const interventionStrength: 'ordinary_approval' | 'direct_intervention' =
        commanderAssessment === 'postpone' || commanderAssessment === 'abort'
            ? 'direct_intervention'
            : 'ordinary_approval';

    return { severity, category, cautionNotice, cautionNoticeToken, categoryLabel, categoryLabelKey, interventionStrength, dragFactors };
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
    noticeToken?: CommandCopyToken | null;
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
            noticeToken: copyToken('commandStrain.stance.offensiveUnavailable', 'Offensive posture is unavailable. Command cohesion is compromised - restore the command relationship first.'),
            isBlocked: true,
        };
    }
    // Strained + offensive → caution
    if (requestedStance === 'offensive' && strain > 0) {
        return {
            severity: 'caution',
            notice: 'Requesting aggressive posture while command relationship is strained. This stance is available but operations proceed at elevated institutional friction.',
            noticeToken: copyToken('commandStrain.stance.offensiveCaution', 'Requesting aggressive posture while command relationship is strained. This stance is available but operations proceed at elevated institutional friction.'),
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

// ═══════════════════════════════════════════════════════════════════════════
// Strain Decay Projection — Wave 10
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Project strain decay timeline for a corps.
 * Returns an array of { turn, projectedStrain } for the next N turns.
 * Pure derivation — calls computeCorpsCommandStrain with projected turn values.
 */
export function projectStrainDecay(
    corpsId: string,
    state: GameState,
    turnsAhead: number = 3,
): Array<{ turn: number; projectedStrain: number }> {
    const currentTurn = state.meta?.turn ?? 0;
    const projections: Array<{ turn: number; projectedStrain: number }> = [];
    for (let offset = 0; offset <= turnsAhead; offset++) {
        const projTurn = currentTurn + offset;
        // Create a shallow copy with projected turn
        const projectedState = { ...state, meta: { ...state.meta, turn: projTurn } } as GameState;
        const strain = computeCorpsCommandStrain(corpsId, projectedState);
        projections.push({ turn: projTurn, projectedStrain: strain });
    }
    return projections;
}

/**
 * Derive a recovery forecast string for player display.
 * Returns null when healthy (silence=healthy).
 */
export function deriveRecoveryForecast(
    projections: Array<{ turn: number; projectedStrain: number }>,
): string | null {
    return deriveRecoveryForecastToken(projections)?.fallback ?? null;
}

export function deriveRecoveryForecastToken(
    projections: Array<{ turn: number; projectedStrain: number }>,
): CommandCopyToken | null {
    if (projections.length === 0) return null;
    const currentStrain = projections[0].projectedStrain;
    if (currentStrain === 0) return null; // silence=healthy

    // Find first turn where strain reaches 0
    const recoveryEntry = projections.find(p => p.projectedStrain === 0);
    if (recoveryEntry) {
        const turnsUntilRecovery = recoveryEntry.turn - projections[0].turn;
        return copyToken(
            turnsUntilRecovery === 1 ? 'commandStrain.recovery.resolving.one' : 'commandStrain.recovery.resolving.many',
            `Strain resolving in ${turnsUntilRecovery} turn${turnsUntilRecovery !== 1 ? 's' : ''}`,
            { turns: turnsUntilRecovery },
        );
    }

    // Still has strain at projection horizon
    const nextTurnStrain = projections.length > 1 ? projections[1].projectedStrain : currentStrain;
    const nextLabel = getCommandStrainLabel(nextTurnStrain);
    if (nextTurnStrain < currentStrain) {
        return copyToken(
            'commandStrain.recovery.dropping',
            `Recovery: strain drops to ${nextTurnStrain} (${nextLabel}) next turn`,
            { strain: nextTurnStrain, label: nextLabel },
        );
    }
    return copyToken('commandStrain.recovery.persisting', `Strain persisting at ${currentStrain}`, { strain: currentStrain });
}

// ═══════════════════════════════════════════════════════════════════════════
// Readiness Trend — Commander Explanation Surfaces Wave 6
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Direction of an operation's readiness at the decision point.
 * Derived from existing persisted fields — no new persistence needed.
 *
 * The key insight: postponement_count is a truthful record of prior 'postpone'
 * assessments, because only 'postpone' increments it and resets to intel_gathering.
 * 'launch' ends the cycle (stays in 'ready'). 'abort' ends the operation.
 *
 * So: postponement_count=0 → first assessment (no prior to compare).
 *     postponement_count≥1 + current 'launch' → was postpone, now launch (improving).
 *     postponement_count≥1 + current 'postpone' → still postpone (stagnating).
 *     postponement_count≥1 + current 'abort' → was postpone, now abort (deteriorating).
 */
export type ReadinessTrendDirection =
    | 'nearing_launch'   // First assessment is launch — ready on first try
    | 'improving'        // Was postpone, now launch — conditions recovered
    | 'building'         // First assessment is postpone — still assembling
    | 'stagnating'       // Postponed before, still postpone — no progress
    | 'deteriorating'    // Was postpone, now abort — conditions worsened
    | 'not_viable';      // First assessment is abort — bad from start

export interface ReadinessTrend {
    /** Directional classification. */
    direction: ReadinessTrendDirection;
    /** Player-facing one-line label. Null = silence (launch on first try, healthy). */
    label: string | null;
    /** Timeline urgency — fraction of max preparation time elapsed (0-1). Null if no timeline data. */
    timelineFraction: number | null;
    /** Player-facing timeline urgency string. Null = no urgency or no data. */
    timelineLabel: string | null;
}

/**
 * Derive the readiness trend for an operation at the decision point.
 *
 * Pure function — no GameState, no side effects.
 * Uses only fields already persisted on CorpsOperation.
 *
 * Silence = healthy: label is null when direction is 'nearing_launch' (ready on first try).
 *
 * @param assessment        - Current commander_assessment ('launch' | 'postpone' | 'abort')
 * @param postponements     - postponement_count (0, 1, or 2)
 * @param turnsElapsed      - preparation_turns_elapsed (may be undefined)
 * @param maxTurns          - preparation_max_turns (may be undefined)
 */
export function deriveReadinessTrend(
    assessment: 'launch' | 'postpone' | 'abort' | null | undefined,
    postponements: number,
    turnsElapsed?: number,
    maxTurns?: number,
): ReadinessTrend {
    // No assessment yet → no trend to show
    if (!assessment) {
        return { direction: 'building', label: null, timelineFraction: null, timelineLabel: null };
    }

    // ── Timeline urgency ────────────────────────────────────────────────
    let timelineFraction: number | null = null;
    let timelineLabel: string | null = null;
    if (turnsElapsed != null && maxTurns != null && maxTurns > 0) {
        timelineFraction = Math.min(1, turnsElapsed / maxTurns);
        const remaining = Math.max(0, maxTurns - turnsElapsed);
        if (remaining <= 1 && assessment !== 'launch') {
            timelineLabel = `Preparation complete - decision forced next cycle`;
        } else if (timelineFraction >= 0.75 && assessment !== 'launch') {
            timelineLabel = `Preparation step ${turnsElapsed} of ${maxTurns} - time running short`;
        } else if (turnsElapsed > 0) {
            timelineLabel = `Preparation step ${turnsElapsed} of ${maxTurns}`;
        }
    }

    // ── Directional classification ──────────────────────────────────────
    const hasPriorPostponement = postponements > 0;

    if (assessment === 'launch') {
        if (hasPriorPostponement) {
            return {
                direction: 'improving',
                label: `Readiness recovered after ${postponements} postponement${postponements > 1 ? 's' : ''} — now recommends launch`,
                timelineFraction,
                timelineLabel,
            };
        }
        // First assessment is launch — silence=healthy (nothing remarkable)
        return { direction: 'nearing_launch', label: null, timelineFraction, timelineLabel };
    }

    if (assessment === 'postpone') {
        if (hasPriorPostponement) {
            return {
                direction: 'stagnating',
                label: `Postponed ${postponements} time${postponements > 1 ? 's' : ''} — conditions have not improved sufficiently`,
                timelineFraction,
                timelineLabel,
            };
        }
        return {
            direction: 'building',
            label: 'First assessment — conditions not yet sufficient for launch',
            timelineFraction,
            timelineLabel,
        };
    }

    // assessment === 'abort'
    if (hasPriorPostponement) {
        return {
            direction: 'deteriorating',
            label: `Conditions deteriorated after ${postponements} postponement${postponements > 1 ? 's' : ''} — recommends abort`,
            timelineFraction,
            timelineLabel,
        };
    }
    return {
        direction: 'not_viable',
        label: 'Conditions too poor for this operation from the outset',
        timelineFraction,
        timelineLabel,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Corps Situation Assessment — Commander Explanation Surfaces Wave 1 + Wave 2
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classification of the primary constraint holding back or driving a corps.
 * Priority order (highest first): siege > threat > defensive_duty > force_condition > institutional > plan > none.
 * Derived from the same real factors Wave 1 already computes.
 */
export type PrimaryConstraint =
    | 'siege'               // besieged zone — existential
    | 'threat_pressure'     // critical/heavy pressure or enemy concentration
    | 'defensive_duty'      // garrison deficit, must-hold shortfall, no surplus
    | 'force_condition'     // exhaustion, low combat effectiveness
    | 'institutional_strain' // command compromised, defensive/reorganize stance
    | 'plan_lifecycle'      // plan suspended, abandoned, or concentrating
    | 'none';               // healthy — silence

/**
 * A player-safe explanation of why a corps commander is leaning a certain way.
 * Derived on-read from CommanderState — never stored on GameState.
 *
 * Silence = healthy: when the corps is projecting with surplus and no constraints,
 * the assessment is null (nothing to explain).
 *
 * Wave 1: descriptive factors (what conditions exist)
 * Wave 2: decision-useful hierarchy (what is THE dominant reason + constraint type)
 */
export interface CorpsSituationAssessment {
    /** Overall posture summary — one-line explanation. Null = healthy (silence). */
    postureSummary: string | null;
    postureSummaryToken?: CommandCopyToken | null;
    /** Active military constraints. Empty = no constraints. */
    militaryFactors: string[];
    /** Active institutional constraints from Army HQ. Empty = none. */
    institutionalFactors: string[];
    /** Current plan status explanation. Null = no plan. */
    planExplanation: string | null;
    /** Threat context. Null = low threat / nothing notable. */
    threatContext: string | null;
    threatContextToken?: CommandCopyToken | null;
    /**
     * Wave 2: The single dominant reason this corps is constrained.
     * One sentence naming THE main factor. Null = healthy (silence).
     */
    dominantReason: string | null;
    dominantReasonToken?: CommandCopyToken | null;
    /**
     * Wave 2: Classification of the primary constraint type.
     * 'none' = healthy. Used for UI badge coloring and decision routing.
     */
    primaryConstraint: PrimaryConstraint;
    /**
     * Wave 3: What would need to change for the constraint to ease.
     * One concise sentence naming the bottleneck's inverse. Null = healthy (silence).
     * Grounded in real state — no fake forecasting or advisory theater.
     */
    reliefPath: string | null;
    reliefPathToken?: CommandCopyToken | null;
}

/**
 * Derive a player-safe situation assessment for a corps.
 *
 * Pure function — no GameState mutation, no side effects.
 * Consumes only the persisted CommanderState fields plus a few corps-level
 * fields already on FormationView.
 *
 * @param commanderState  - The persisted CommanderState for this corps (from corps_command[id].commander_state).
 * @param corpsStance     - Current corps stance ('offensive' | 'balanced' | 'defensive' | 'reorganize').
 * @param corpsExhaustion - Current corps exhaustion (0-100).
 * @param commandStrain   - Current command strain score (derived).
 * @returns CorpsSituationAssessment — postureSummary is null when healthy.
 */
export function deriveCorpsSituationAssessment(
    commanderState: {
        zone_assessments?: Array<{
            posture: string;
            deficit: number;
            surplus_brigades: readonly string[];
            front_edge_count: number;
            is_must_hold?: boolean;
            corridor_width?: number;
        }>;
        threat_assessment?: {
            overall_pressure: string;
            enemy_concentration_zones?: readonly string[];
        };
        force_assessment?: {
            total_brigades: number;
            combat_effective: number;
            total_surplus: number;
            tier_counts?: { main_effort: number; active_defense: number; garrison: number };
        };
        current_plan?: {
            objective_description: string;
            status: string;
            concentration_progress?: number;
            suspension_reason?: string;
        } | null;
        last_plan_action?: string;
        last_plan_reason?: string;
    } | null | undefined,
    corpsStance: string | undefined,
    corpsExhaustion: number | undefined,
    commandStrain: number | undefined,
): CorpsSituationAssessment {
    // No commander state → no assessment (pre-commander era saves)
    if (!commanderState) {
        return { postureSummary: null, militaryFactors: [], institutionalFactors: [], planExplanation: null, threatContext: null, dominantReason: null, primaryConstraint: 'none', reliefPath: null };
    }

    const zones = commanderState.zone_assessments ?? [];
    const threat = commanderState.threat_assessment;
    const forces = commanderState.force_assessment;
    const plan = commanderState.current_plan;

    // ── Military factors ─────────────────────────────────────────────────
    const militaryFactors: string[] = [];

    // Exhaustion
    const exhaustion = corpsExhaustion ?? 0;
    if (exhaustion >= 60) {
        militaryFactors.push('Corps is heavily exhausted — offensive capacity severely limited');
    } else if (exhaustion >= 40) {
        militaryFactors.push('Significant corps exhaustion — operations will be cautious');
    }

    // Force balance
    const totalSurplus = forces?.total_surplus ?? 0;
    const totalBrigades = forces?.total_brigades ?? 0;
    const combatEffective = forces?.combat_effective ?? 0;
    if (totalBrigades > 0 && combatEffective < totalBrigades * 0.5) {
        militaryFactors.push(`Only ${combatEffective} of ${totalBrigades} brigades combat-effective`);
    }
    if (totalSurplus === 0 && totalBrigades > 0) {
        militaryFactors.push('No surplus brigades — all forces committed to garrison duties');
    }

    // Zone deficits
    const totalDeficit = zones.reduce((sum, z) => sum + z.deficit, 0);
    if (totalDeficit > 2) {
        militaryFactors.push(`Garrison shortfall of ${totalDeficit} brigades across defended zones`);
    }

    // Besieged zones
    const besiegedZones = zones.filter(z => z.posture === 'besieged');
    if (besiegedZones.length > 0) {
        militaryFactors.push(`${besiegedZones.length} zone${besiegedZones.length > 1 ? 's' : ''} under siege — limited operational freedom`);
    }

    // Must-hold pressure
    const mustHoldZones = zones.filter(z => z.is_must_hold);
    if (mustHoldZones.length > 0) {
        const mustHoldDeficit = mustHoldZones.reduce((sum, z) => sum + z.deficit, 0);
        if (mustHoldDeficit > 0) {
            militaryFactors.push(`Critical positions require reinforcement — ${mustHoldDeficit} brigade${mustHoldDeficit > 1 ? 's' : ''} short`);
        }
    }

    // ── Institutional factors ────────────────────────────────────────────
    const institutionalFactors: string[] = [];

    if (corpsStance === 'defensive') {
        institutionalFactors.push('Corps directed to defensive posture — no offensive planning');
    } else if (corpsStance === 'reorganize') {
        institutionalFactors.push('Corps in reorganization — all operations suspended');
    }

    if ((commandStrain ?? 0) >= COMPROMISED_THRESHOLD) {
        institutionalFactors.push('Command relationship compromised — offensive options restricted');
    } else if ((commandStrain ?? 0) >= STRAINED_THRESHOLD) {
        institutionalFactors.push('Command relationship under strain from recent interventions');
    }

    // ── Plan explanation ─────────────────────────────────────────────────
    let planExplanation: string | null = null;
    if (plan) {
        const planStatus = plan.status;
        const planName = plan.objective_description || 'current operation';
        if (planStatus === 'concentrating') {
            const progress = plan.concentration_progress != null
                ? `${Math.round(plan.concentration_progress * 100)}%`
                : 'unknown';
            planExplanation = `Concentrating forces for ${planName} — ${progress} assembled`;
        } else if (planStatus === 'ready') {
            planExplanation = `Ready to launch ${planName} — awaiting execution window`;
        } else if (planStatus === 'executing') {
            planExplanation = `Executing ${planName}`;
        } else if (planStatus === 'suspended') {
            const suspendReason = plan.suspension_reason || commanderState.last_plan_reason || 'conditions deteriorated';
            planExplanation = `${planName} suspended — ${suspendReason}`;
        } else if (planStatus === 'abandoned') {
            const abandonReason = commanderState.last_plan_reason || 'no longer viable';
            planExplanation = `${planName} abandoned — ${abandonReason}`;
        }
    } else if (commanderState.last_plan_action === 'abandoned' && commanderState.last_plan_reason) {
        // Plan was abandoned this turn — show the reason even though plan is now null
        planExplanation = `Recent plan abandoned — ${commanderState.last_plan_reason}`;
    } else if (commanderState.last_plan_action === 'none' && commanderState.last_plan_reason) {
        // No plan — show the reason why (e.g., "corps in defensive stance", "no viable plan available")
        const reason = commanderState.last_plan_reason;
        // Only show non-trivial reasons (skip "clearing abandoned plan", "plan handed to execution pipeline")
        if (!reason.includes('clearing') && !reason.includes('handed to execution')) {
            planExplanation = `No active plan — ${reason}`;
        }
    }

    // ── Threat context ───────────────────────────────────────────────────
    let threatContext: string | null = null;
    let threatContextToken: CommandCopyToken | null = null;
    const pressure = threat?.overall_pressure;
    if (pressure === 'critical') {
        threatContext = 'Under critical pressure — enemy offensive threatens corps integrity';
        threatContextToken = copyToken('commandStrain.situation.threat.critical', threatContext);
    } else if (pressure === 'heavy') {
        threatContext = 'Heavy enemy pressure across the front';
        threatContextToken = copyToken('commandStrain.situation.threat.heavy', threatContext);
    } else if (pressure === 'moderate' && (threat?.enemy_concentration_zones?.length ?? 0) > 0) {
        threatContext = 'Enemy concentration detected — defensive readiness elevated';
        threatContextToken = copyToken('commandStrain.situation.threat.concentration', threatContext);
    }

    // ── Posture summary (one-line) ───────────────────────────────────────
    // Silence = healthy: projecting corps with surplus and no constraints = null
    let postureSummary: string | null = null;

    const dominantPosture = getDominantPosture(zones);
    const hasConstraints = militaryFactors.length > 0 || institutionalFactors.length > 0;
    const hasNotableThreat = threatContext !== null;

    if (dominantPosture === 'besieged') {
        postureSummary = 'Corps area under siege — operational capacity severely constrained';
    } else if (dominantPosture === 'defending' && totalDeficit > 0) {
        postureSummary = 'Garrison requirements exceed available forces — holding the line';
    } else if (dominantPosture === 'balanced' && hasConstraints) {
        postureSummary = 'Forces balanced but constrained — limited offensive potential';
    } else if (dominantPosture === 'projecting' && !hasConstraints && !hasNotableThreat) {
        postureSummary = null; // Silence = healthy
    } else if (hasConstraints || hasNotableThreat) {
        // Fallback for projecting but constrained, or balanced with notable threat
        if (exhaustion >= 40) {
            postureSummary = 'Corps exhaustion limiting operational tempo';
        } else if (totalSurplus === 0) {
            postureSummary = 'All brigades committed — no surplus for new operations';
        } else if (hasNotableThreat) {
            postureSummary = 'Forces available but threat conditions demand caution';
        }
    }

    const postureSummaryToken: CommandCopyToken | null =
        postureSummary === 'Corps exhaustion limiting operational tempo'
            ? copyToken('commandStrain.situation.posture.exhaustionTempo', postureSummary)
            : postureSummary === 'Forces available but threat conditions demand caution'
                ? copyToken('commandStrain.situation.posture.threatCaution', postureSummary)
                : postureSummary === null
                    ? null
                    : copyToken('commandStrain.situation.posture.recorded', postureSummary);

    // ── Wave 2+3: Dominant reason + primary constraint + relief path ────────
    // Priority order (highest = most urgent): siege > threat > defensive_duty > force_condition > institutional > plan > none
    const {
        dominantReason,
        dominantReasonToken,
        primaryConstraint,
        reliefPath,
        reliefPathToken,
    } = classifyPrimaryConstraint(
        zones, threat, forces, plan, commanderState,
        corpsStance, exhaustion, commandStrain ?? 0, totalDeficit, totalSurplus,
        combatEffective, totalBrigades, besiegedZones, mustHoldZones,
    );

    return {
        postureSummary,
        postureSummaryToken,
        militaryFactors,
        institutionalFactors,
        planExplanation,
        threatContext,
        threatContextToken,
        dominantReason,
        dominantReasonToken,
        primaryConstraint,
        reliefPath,
        reliefPathToken,
    };
}

/**
 * Classify the primary constraint and derive a dominant reason sentence.
 * Priority order matches real urgency: existential threats first, then force/institutional.
 * Pure function — no side effects.
 */
function classifyPrimaryConstraint(
    zones: Array<{ posture: string; deficit: number; surplus_brigades: readonly string[]; front_edge_count: number; is_must_hold?: boolean }>,
    threat: { overall_pressure: string; enemy_concentration_zones?: readonly string[] } | undefined,
    forces: { total_brigades: number; combat_effective: number; total_surplus: number } | undefined,
    plan: { status: string; objective_description: string; suspension_reason?: string } | null | undefined,
    commanderState: { last_plan_action?: string; last_plan_reason?: string },
    corpsStance: string | undefined,
    exhaustion: number,
    commandStrain: number,
    totalDeficit: number,
    totalSurplus: number,
    combatEffective: number,
    totalBrigades: number,
    besiegedZones: Array<{ posture: string }>,
    mustHoldZones: Array<{ posture: string; deficit: number }>,
): {
    dominantReason: string | null;
    dominantReasonToken?: CommandCopyToken | null;
    primaryConstraint: PrimaryConstraint;
    reliefPath: string | null;
    reliefPathToken?: CommandCopyToken | null;
} {

    // 1. Siege — existential
    if (besiegedZones.length > 0) {
        const dominantReason = 'Corps area is under siege — survival takes priority over offensive planning';
        const reliefPath = 'Requires breaking the encirclement or widening the corridor to restore movement freedom';
        return {
            primaryConstraint: 'siege',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.siege', dominantReason),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.siege', reliefPath),
        };
    }

    // 2. Threat pressure — critical/heavy enemy pressure
    const pressure = threat?.overall_pressure;
    if (pressure === 'critical') {
        const dominantReason = 'Enemy offensive threatens corps integrity — all resources committed to defense';
        const reliefPath = 'Hold defensive positions and absorb the offensive; request reinforcement from Army HQ';
        return {
            primaryConstraint: 'threat_pressure',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.threatCritical', dominantReason),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.threatCritical', reliefPath),
        };
    }
    if (pressure === 'heavy') {
        const dominantReason = 'Heavy enemy pressure demands defensive priority across the front';
        const reliefPath = 'Stabilize the front through sustained defense; pressure eases as enemy offensive culminates';
        return {
            primaryConstraint: 'threat_pressure',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.threatHeavy', dominantReason),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.threatHeavy', reliefPath),
        };
    }

    // 3. Defensive duty — garrison deficit, must-hold shortfall, no surplus
    const mustHoldDeficit = mustHoldZones.reduce((sum, z) => sum + z.deficit, 0);
    if (mustHoldDeficit > 0) {
        const params = { count: mustHoldDeficit };
        const reasonKey = mustHoldDeficit === 1
            ? 'commandStrain.situation.reason.mustHoldDeficit.one'
            : 'commandStrain.situation.reason.mustHoldDeficit.many';
        const reliefKey = mustHoldDeficit === 1
            ? 'commandStrain.situation.relief.mustHoldDeficit.one'
            : 'commandStrain.situation.relief.mustHoldDeficit.many';
        const dominantReason = `Critical positions are undermanned — ${mustHoldDeficit} brigade${mustHoldDeficit > 1 ? 's' : ''} short of minimum hold requirements`;
        const reliefPath = `Requires ${mustHoldDeficit} additional brigade${mustHoldDeficit > 1 ? 's' : ''} or consolidation of defensive positions`;
        return {
            primaryConstraint: 'defensive_duty',
            dominantReason,
            dominantReasonToken: copyToken(reasonKey, dominantReason, params),
            reliefPath,
            reliefPathToken: copyToken(reliefKey, reliefPath, params),
        };
    }
    if (totalDeficit > 2) {
        const params = { count: totalDeficit };
        const dominantReason = `Garrison requirements exceed available forces by ${totalDeficit} brigades`;
        const reliefPath = `Requires ${totalDeficit} additional brigades or reduced garrison burden through consolidation`;
        return {
            primaryConstraint: 'defensive_duty',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.garrisonDeficit', dominantReason, params),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.garrisonDeficit', reliefPath, params),
        };
    }
    if (totalSurplus === 0 && totalBrigades > 0) {
        const dominantReason = 'All brigades committed to garrison — no surplus available for operations';
        const reliefPath = 'Free surplus by receiving reinforcement or consolidating defended positions';
        return {
            primaryConstraint: 'defensive_duty',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.noSurplus', dominantReason),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.noSurplus', reliefPath),
        };
    }

    // 4. Force condition — exhaustion, low combat effectiveness
    if (exhaustion >= 60) {
        const params = { pct: Math.round(exhaustion) };
        const dominantReason = 'Corps is heavily exhausted — offensive capacity severely limited';
        const reliefPath = `Exhaustion at ${Math.round(exhaustion)}% — requires reduced operational tempo to recover`;
        return {
            primaryConstraint: 'force_condition',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.exhaustionSevere', dominantReason),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.exhaustionSevere', reliefPath, params),
        };
    }
    if (totalBrigades > 0 && combatEffective < totalBrigades * 0.5) {
        const params = { effective: combatEffective, total: totalBrigades };
        const dominantReason = `Only ${combatEffective} of ${totalBrigades} brigades are combat-effective`;
        const reliefPath = 'Rotate depleted brigades to rear for refit; bring replacements forward';
        return {
            primaryConstraint: 'force_condition',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.lowCombatEffective', dominantReason, params),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.lowCombatEffective', reliefPath),
        };
    }
    if (exhaustion >= 40) {
        const params = { pct: Math.round(exhaustion) };
        const dominantReason = 'Significant corps exhaustion is limiting operational tempo';
        const reliefPath = `Exhaustion at ${Math.round(exhaustion)}% - limit operations to allow gradual recovery`;
        return {
            primaryConstraint: 'force_condition',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.exhaustionModerate', dominantReason),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.exhaustionModerate', reliefPath, params),
        };
    }

    // 5. Institutional strain — command compromised, defensive/reorganize stance
    if (corpsStance === 'reorganize') {
        const dominantReason = 'Corps is reorganizing — all operations suspended by directive';
        const reliefPath = 'Change corps stance to balanced or defensive when reorganization is complete';
        return {
            primaryConstraint: 'institutional_strain',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.reorganizing', dominantReason),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.reorganizing', reliefPath),
        };
    }
    if (commandStrain >= COMPROMISED_THRESHOLD) {
        const dominantReason = 'Command relationship is compromised — offensive options restricted until stabilized';
        const reliefPath = 'Stabilize the command relationship or allow natural strain decay over time';
        return {
            primaryConstraint: 'institutional_strain',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.commandCompromised', dominantReason),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.commandCompromised', reliefPath),
        };
    }
    if (corpsStance === 'defensive') {
        const dominantReason = 'Corps directed to hold defensive posture — no offensive planning authorized';
        const reliefPath = 'Change corps stance to balanced or offensive to authorize new operations';
        return {
            primaryConstraint: 'institutional_strain',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.defensivePosture', dominantReason),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.defensivePosture', reliefPath),
        };
    }

    // 6. Plan lifecycle — suspended/abandoned/concentrating (non-urgent but notable)
    if (plan?.status === 'suspended') {
        const reason = plan.suspension_reason || commanderState.last_plan_reason || 'conditions deteriorated';
        const dominantReason = `Operation plan suspended — ${reason}`;
        const reliefPath = 'Address the suspension cause; plan resumes automatically when conditions improve';
        return {
            primaryConstraint: 'plan_lifecycle',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.planSuspended', dominantReason, { reason }),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.planSuspended', reliefPath),
        };
    }
    if (commanderState.last_plan_action === 'abandoned' && commanderState.last_plan_reason) {
        const reason = commanderState.last_plan_reason;
        const dominantReason = `Recent operation plan abandoned — ${reason}`;
        const reliefPath = 'Commander will evaluate new objectives when surplus and conditions permit';
        return {
            primaryConstraint: 'plan_lifecycle',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.planAbandoned', dominantReason, { reason }),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.planAbandoned', reliefPath),
        };
    }

    // 7. Moderate threat with concentration signs (lower priority than direct pressure)
    if (pressure === 'moderate' && (threat?.enemy_concentration_zones?.length ?? 0) > 0) {
        const dominantReason = 'Enemy concentration detected — defensive readiness elevated';
        const reliefPath = 'Reinforce threatened sectors; concentration may dissipate if enemy commits elsewhere';
        return {
            primaryConstraint: 'threat_pressure',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.threatConcentration', dominantReason),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.threatConcentration', reliefPath),
        };
    }

    // 8. Strained command (lower than compromised — notable but not blocking)
    if (commandStrain >= STRAINED_THRESHOLD) {
        const dominantReason = 'Command relationship under strain from recent presidential interventions';
        const reliefPath = 'Avoid further direct interventions; strain decays naturally over time';
        return {
            primaryConstraint: 'institutional_strain',
            dominantReason,
            dominantReasonToken: copyToken('commandStrain.situation.reason.commandStrained', dominantReason),
            reliefPath,
            reliefPathToken: copyToken('commandStrain.situation.relief.commandStrained', reliefPath),
        };
    }

    // 9. None — healthy
    return { primaryConstraint: 'none', dominantReason: null, reliefPath: null };
}

/**
 * Get the dominant (worst) posture across all zones.
 * Besieged > defending > balanced > projecting.
 */
function getDominantPosture(
    zones: Array<{ posture: string }>,
): string {
    const priority: Record<string, number> = {
        besieged: 0,
        defending: 1,
        balanced: 2,
        projecting: 3,
    };
    let worst = 'projecting';
    let worstPriority = 3;
    for (const zone of zones) {
        const p = priority[zone.posture] ?? 3;
        if (p < worstPriority) {
            worstPriority = p;
            worst = zone.posture;
        }
    }
    return worst;
}

// ═══════════════════════════════════════════════════════════════════════════
// Recommendation Explanation — Commander Explanation Surfaces Wave 5
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Why the commander recommends launch, postpone, or abort.
 * Derived on-read from the operation's assessment snapshot + commander personality.
 * Silence = healthy: null fields when assessment is 'launch' and no caution worth surfacing.
 */
export interface RecommendationExplanation {
    /** One-sentence reason for the recommendation. Null = launch with no caution (silence). */
    recommendationReason: string | null;
    /** Which readiness factor is the main blocker. Null when launch or all factors met. */
    mainBlocker: 'intel' | 'force_ratio' | 'supply' | null;
    /** What would need to change for the recommendation to improve. Null when launch. */
    wouldImproveIf: string | null;
}

/**
 * Derive a recommendation explanation from the operation's assessment snapshot.
 *
 * Mirrors the engine's assessment formula (operation_preparation.ts lines 527-553)
 * using snapshot values already stored on OperationView + commander personality.
 *
 * Pure function — no GameState, no side effects.
 *
 * @param intel        - intel_confidence_at_assessment (0-1)
 * @param supply       - supply_readiness_at_assessment (0-1)
 * @param forceRatio   - force_ratio_estimate (>0)
 * @param aggressiveness - commander aggressiveness (1-5)
 * @param competence   - commander competence (0-1)
 * @param assessment   - the recommendation itself ('launch' | 'postpone' | 'abort')
 * @param postponements - postponement_count
 */
export function deriveRecommendationExplanation(
    intel: number | null | undefined,
    supply: number | null | undefined,
    forceRatio: number | null | undefined,
    aggressiveness: number,
    competence: number,
    assessment: 'launch' | 'postpone' | 'abort' | null | undefined,
    postponements: number,
): RecommendationExplanation {
    // Silence when no assessment or launch (nothing to explain)
    if (!assessment || assessment === 'launch') {
        return { recommendationReason: null, mainBlocker: null, wouldImproveIf: null };
    }

    // If force ratio is missing, we can't compute the full formula
    if (forceRatio == null) {
        if (assessment === 'postpone') {
            return {
                recommendationReason: 'The commander judges conditions are not yet sufficient to launch',
                mainBlocker: null,
                wouldImproveIf: 'Continue preparation to improve readiness',
            };
        }
        return {
            recommendationReason: 'The commander judges this operation is not viable under current conditions',
            mainBlocker: null,
            wouldImproveIf: null,
        };
    }

    // ── Reconstruct the engine's assessment formula ──────────────────────
    const reqConf = Math.max(0, Math.min(1, 0.6 - aggressiveness * 0.06 + competence * 0.04));
    const reqForce = Math.max(1.0, 1.5 - aggressiveness * 0.10 + competence * 0.05);
    const goThreshold = 0.7 - aggressiveness * 0.08;
    const forceBalance = getPlayerSafeOperationBalancePresentation(forceRatio);
    const hasIntel = typeof intel === 'number' && Number.isFinite(intel);
    const hasSupply = typeof supply === 'number' && Number.isFinite(supply);

    const confMet = hasIntel ? (intel >= reqConf ? 1.0 : intel / reqConf) : null;
    const forceMet = forceRatio >= reqForce ? 1.0 : forceRatio / reqForce;

    // Weighted contributions
    const confContrib = confMet != null ? confMet * 0.4 : null;
    const forceContrib = forceMet * 0.3;
    const supplyContrib = hasSupply ? supply * 0.3 : null;

    // ── Identify main blocker (lowest factor as % of its weight) ────────
    // Factor "fullness" = contribution / weight — 1.0 means fully met
    const factors: Array<{ name: 'intel' | 'force_ratio' | 'supply'; fullness: number; contrib: number; detail: string }> = [];
    if (confMet != null && confContrib != null) {
        const reportedIntel = typeof intel === 'number' && Number.isFinite(intel) ? intel : 0;
        factors.push({
            name: 'intel',
            fullness: confMet,
            contrib: confContrib,
            detail: `Intelligence at ${Math.round(reportedIntel * 100)}%${reqConf > 0 ? ` (commander needs ${Math.round(reqConf * 100)}%)` : ''}`,
        });
    }
    factors.push({
        name: 'force_ratio',
        fullness: forceMet,
        contrib: forceContrib,
        detail: forceRatio >= reqForce
            ? `Force balance judged ${forceBalance.summary} and within the commander's launch standard`
            : `Force balance judged ${forceBalance.summary} but still short of the commander's launch standard`,
    });
    if (hasSupply && supplyContrib != null) {
        const reportedSupply = typeof supply === 'number' && Number.isFinite(supply) ? supply : 0;
        factors.push({
            name: 'supply',
            fullness: reportedSupply,
            contrib: supplyContrib,
            detail: `Supply readiness at ${Math.round(reportedSupply * 100)}%`,
        });
    }

    // Sort by fullness ascending — worst factor first
    const sorted = [...factors].sort((a, b) => a.fullness - b.fullness);
    const worstFactor = sorted[0];
    const missingReadiness = !hasIntel || !hasSupply;

    // ── Build explanation ────────────────────────────────────────────────
    if (assessment === 'postpone') {
        const reason = worstFactor.fullness < 1.0
            ? `${worstFactor.detail} — the main factor short of launch standard`
            : missingReadiness
                ? 'Readiness reporting incomplete; the commander recommends waiting until staff reporting improves'
                : 'Combined readiness falls slightly short of the launch threshold';

        if (worstFactor.fullness >= 1.0 && missingReadiness) {
            return {
                recommendationReason: reason,
                mainBlocker: null,
                wouldImproveIf: 'Complete intelligence and supply assessment before committing the operation',
            };
        }

        const improve = worstFactor.fullness < 1.0
            ? worstFactor.name === 'intel'
                ? 'Improve intelligence gathering; more time in preparation raises confidence'
                : worstFactor.name === 'force_ratio'
                    ? 'Increase participating force strength or wait for reinforcement'
                    : 'Improve supply lines to forward brigades'
            : 'Continue preparation — marginal improvement across factors may reach threshold';

        return {
            recommendationReason: reason,
            mainBlocker: worstFactor.fullness < 1.0 ? worstFactor.name : null,
            wouldImproveIf: improve,
        };
    }

    // assessment === 'abort'
    const abortDetail = sorted
        .filter(f => f.fullness < 1.0)
        .slice(0, 2)
        .map(f => f.detail)
        .join('; ');

    const reason = postponements >= 2
        ? `Operation has been postponed ${postponements} times without improvement — ${abortDetail}`
        : `Readiness far below launch standard — ${abortDetail}`;

    return {
        recommendationReason: reason,
        mainBlocker: worstFactor.fullness < 1.0 ? worstFactor.name : null,
        wouldImproveIf: null,  // Abort = not viable; no honest "would improve" to offer
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Delegation Context — Delegation Visibility Wave 1
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classification of the pre-decision delegation path for a planning-phase operation.
 *
 * - normal_delegation:     Commander is carrying the decision burden within delegated authority.
 *                          Silence = healthy — no label needed.
 * - strained_delegation:   Commander recommends launch despite institutional strain.
 *                          The delegation is functioning, but the relationship is damaged.
 * - presidential_direction: Commander recommends against; the decision burden has shifted
 *                           to the presidency. Launching would override the recommendation.
 */
export type DelegationPath = 'normal_delegation' | 'strained_delegation' | 'presidential_direction';

/**
 * Pre-decision delegation context for a planning-phase operation.
 * Derived from commander assessment + command strain. No new persisted fields.
 */
export interface DelegationContext {
    /** Classification of the current delegation path. */
    path: DelegationPath;
    /** Player-facing label. null = silence (healthy normal delegation). */
    label: string | null;
    labelToken?: CommandCopyToken | null;
    /** Who currently bears the decision burden. null = silence (commander, default). */
    decisionBearer: 'commander' | 'presidency' | null;
}

/**
 * Derive the pre-decision delegation context for a planning-phase operation.
 *
 * Pure function — no GameState, no side effects.
 * Silence = healthy: label is null for normal_delegation (commander recommends launch, strain = 0).
 *
 * @param commanderAssessment - The commander's current standing assessment.
 * @param strain              - Current command strain score for this corps.
 * @returns DelegationContext — pure derivation.
 */
export function deriveDelegationContext(
    commanderAssessment: 'launch' | 'postpone' | 'abort' | null | undefined,
    strain: number,
): DelegationContext {
    // No assessment yet — still in early preparation, delegation is normal
    if (!commanderAssessment) {
        return { path: 'normal_delegation', label: null, decisionBearer: null };
    }

    // Commander recommends launch — they are carrying the decision burden
    if (commanderAssessment === 'launch') {
        if (strain === 0) {
            // Silence = healthy — normal delegation, no noise
            return { path: 'normal_delegation', label: null, decisionBearer: null };
        }
        // Commander still recommends launch despite institutional strain
        return {
            path: 'strained_delegation',
            label: 'Commander recommends launch within delegated authority — command relationship is strained',
            labelToken: copyToken('commandStrain.delegation.strained', 'Commander recommends launch within delegated authority - command relationship is strained'),
            decisionBearer: 'commander',
        };
    }

    // Commander recommends against — decision burden has shifted to the presidency
    const verb = commanderAssessment === 'abort' ? 'abort' : 'postponement';
    return {
        path: 'presidential_direction',
        label: `Commander recommends ${verb} — decision authority rests with the Presidency`,
        labelToken: commanderAssessment === 'abort'
            ? copyToken('commandStrain.delegation.presidentialAbort', `Commander recommends ${verb} - decision authority rests with the Presidency`)
            : copyToken('commandStrain.delegation.presidentialPostpone', `Commander recommends ${verb} - decision authority rests with the Presidency`),
        decisionBearer: 'presidency',
    };
}

/**
 * Standing delegation summary for a corps — aggregates active operations
 * to show the balance between delegated and presidentially directed command.
 *
 * Pure function — no GameState, no side effects.
 * Silence = healthy: summaryLabel is null when all active ops are ordinary compliance.
 *
 * @param activeOps - Active operations for this corps (minimal subset of OperationView).
 * @returns Delegation summary with counts and optional label.
 */
export interface CorpsDelegationSummary {
    /** Total active operations counted. */
    totalActive: number;
    /** Operations under normal delegation (ordinary_compliance). */
    delegatedCount: number;
    /** Operations launched against recommendation (reluctant_compliance). */
    directedCount: number;
    /** Operations launched via Direct Intervention (direct_intervention). */
    overriddenCount: number;
    /** Player-facing summary. null when all are ordinary compliance (silence = healthy). */
    summaryLabel: string | null;
}

export function deriveCorpsDelegationSummary(
    activeOps: Array<{
        was_force_launched?: boolean;
        commander_assessment_at_launch?: 'launch' | 'postpone' | 'abort';
        phase?: string;
    }>,
): CorpsDelegationSummary {
    // Only count executing/recovery ops that have a launch snapshot
    const launchedOps = activeOps.filter(op =>
        op.phase !== 'planning' && (op.commander_assessment_at_launch != null || op.was_force_launched),
    );
    let delegated = 0;
    let directed = 0;
    let overridden = 0;
    for (const op of launchedOps) {
        const cat = deriveOperationOutcomeCategory(
            op.commander_assessment_at_launch,
            op.was_force_launched ?? false,
        );
        if (cat === 'direct_intervention') overridden++;
        else if (cat === 'reluctant_compliance') directed++;
        else delegated++;
    }

    // Silence = healthy
    const nonDelegated = directed + overridden;
    if (nonDelegated === 0) {
        return { totalActive: launchedOps.length, delegatedCount: delegated, directedCount: directed, overriddenCount: overridden, summaryLabel: null };
    }

    const parts: string[] = [];
    if (overridden > 0) parts.push(`${overridden} under Direct Intervention`);
    if (directed > 0) parts.push(`${directed} under presidential direction`);
    const summaryLabel = parts.join(', ');

    return { totalActive: launchedOps.length, delegatedCount: delegated, directedCount: directed, overriddenCount: overridden, summaryLabel };
}

// ═══════════════════════════════════════════════════════════════════════════
// Intervention Risk — Wave 3
// Category-differentiated consequence copy for the DirectInterventionSection.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Derive a category-differentiated consequence sentence for the Direct
 * Intervention decision surface. Tells the player WHY overriding this
 * particular kind of institutional drag is different from overriding another.
 *
 * Pure derivation — no side effects, no new persisted state.
 * Silence = healthy: returns null when category === 'normal'.
 *
 * @param category            - From deriveOrderInterpretation().category.
 * @param commanderAssessment - The commander's recommendation ('postpone' | 'abort').
 * @param severity            - From deriveOrderInterpretation().severity.
 * @returns A short player-facing consequence sentence, or null for normal category.
 */
export function deriveInterventionRisk(
    category: OrderInterpretationCategory,
    commanderAssessment: 'postpone' | 'abort',
    severity: 'normal' | 'caution' | 'alarm',
): string | null {
    switch (category) {
        case 'strain_shaped':
            return severity === 'alarm'
                ? 'Command cohesion is already compromised. Another intervention will deepen institutional damage.'
                : 'This corps carries active command strain. Forcing launch adds further institutional friction.';
        case 'feasibility_constrained':
            return 'Command reads this as structurally blocked. Override does not resolve the constraint.';
        case 'tempo_resistant':
            return 'The commander judges timing is premature. Forcing launch proceeds before conditions are fully set.';
        case 'caution_driven':
            return commanderAssessment === 'abort'
                ? 'The commander judges this operation is not viable. Overriding that carries full institutional cost.'
                : 'The commander recommends waiting for better conditions. Override launches against that professional judgment.';
        default:
            return null;
    }
}
