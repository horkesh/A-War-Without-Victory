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
    if (projections.length === 0) return null;
    const currentStrain = projections[0].projectedStrain;
    if (currentStrain === 0) return null; // silence=healthy

    // Find first turn where strain reaches 0
    const recoveryEntry = projections.find(p => p.projectedStrain === 0);
    if (recoveryEntry) {
        const turnsUntilRecovery = recoveryEntry.turn - projections[0].turn;
        return `Strain resolving in ${turnsUntilRecovery} turn${turnsUntilRecovery !== 1 ? 's' : ''}`;
    }

    // Still has strain at projection horizon
    const nextTurnStrain = projections.length > 1 ? projections[1].projectedStrain : currentStrain;
    const nextLabel = getCommandStrainLabel(nextTurnStrain);
    if (nextTurnStrain < currentStrain) {
        return `Recovery: strain drops to ${nextTurnStrain} (${nextLabel}) next turn`;
    }
    return `Strain persisting at ${currentStrain}`;
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
    /** Active military constraints. Empty = no constraints. */
    militaryFactors: string[];
    /** Active institutional constraints from Army HQ. Empty = none. */
    institutionalFactors: string[];
    /** Current plan status explanation. Null = no plan. */
    planExplanation: string | null;
    /** Threat context. Null = low threat / nothing notable. */
    threatContext: string | null;
    /**
     * Wave 2: The single dominant reason this corps is constrained.
     * One sentence naming THE main factor. Null = healthy (silence).
     */
    dominantReason: string | null;
    /**
     * Wave 2: Classification of the primary constraint type.
     * 'none' = healthy. Used for UI badge coloring and decision routing.
     */
    primaryConstraint: PrimaryConstraint;
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
        return { postureSummary: null, militaryFactors: [], institutionalFactors: [], planExplanation: null, threatContext: null, dominantReason: null, primaryConstraint: 'none' };
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
    const pressure = threat?.overall_pressure;
    if (pressure === 'critical') {
        threatContext = 'Under critical pressure — enemy offensive threatens corps integrity';
    } else if (pressure === 'heavy') {
        threatContext = 'Heavy enemy pressure across the front';
    } else if (pressure === 'moderate' && (threat?.enemy_concentration_zones?.length ?? 0) > 0) {
        threatContext = 'Enemy concentration detected — defensive readiness elevated';
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

    // ── Wave 2: Dominant reason + primary constraint classification ────────
    // Priority order (highest = most urgent): siege > threat > defensive_duty > force_condition > institutional > plan > none
    const { dominantReason, primaryConstraint } = classifyPrimaryConstraint(
        zones, threat, forces, plan, commanderState,
        corpsStance, exhaustion, commandStrain ?? 0, totalDeficit, totalSurplus,
        combatEffective, totalBrigades, besiegedZones, mustHoldZones,
    );

    return {
        postureSummary,
        militaryFactors,
        institutionalFactors,
        planExplanation,
        threatContext,
        dominantReason,
        primaryConstraint,
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
): { dominantReason: string | null; primaryConstraint: PrimaryConstraint } {

    // 1. Siege — existential
    if (besiegedZones.length > 0) {
        return {
            primaryConstraint: 'siege',
            dominantReason: 'Corps area is under siege — survival takes priority over offensive planning',
        };
    }

    // 2. Threat pressure — critical/heavy enemy pressure
    const pressure = threat?.overall_pressure;
    if (pressure === 'critical') {
        return {
            primaryConstraint: 'threat_pressure',
            dominantReason: 'Enemy offensive threatens corps integrity — all resources committed to defense',
        };
    }
    if (pressure === 'heavy') {
        return {
            primaryConstraint: 'threat_pressure',
            dominantReason: 'Heavy enemy pressure demands defensive priority across the front',
        };
    }

    // 3. Defensive duty — garrison deficit, must-hold shortfall, no surplus
    const mustHoldDeficit = mustHoldZones.reduce((sum, z) => sum + z.deficit, 0);
    if (mustHoldDeficit > 0) {
        return {
            primaryConstraint: 'defensive_duty',
            dominantReason: `Critical positions are undermanned — ${mustHoldDeficit} brigade${mustHoldDeficit > 1 ? 's' : ''} short of minimum hold requirements`,
        };
    }
    if (totalDeficit > 2) {
        return {
            primaryConstraint: 'defensive_duty',
            dominantReason: `Garrison requirements exceed available forces by ${totalDeficit} brigades`,
        };
    }
    if (totalSurplus === 0 && totalBrigades > 0) {
        return {
            primaryConstraint: 'defensive_duty',
            dominantReason: 'All brigades committed to garrison — no surplus available for operations',
        };
    }

    // 4. Force condition — exhaustion, low combat effectiveness
    if (exhaustion >= 60) {
        return {
            primaryConstraint: 'force_condition',
            dominantReason: 'Corps is heavily exhausted — offensive capacity severely limited',
        };
    }
    if (totalBrigades > 0 && combatEffective < totalBrigades * 0.5) {
        return {
            primaryConstraint: 'force_condition',
            dominantReason: `Only ${combatEffective} of ${totalBrigades} brigades are combat-effective`,
        };
    }
    if (exhaustion >= 40) {
        return {
            primaryConstraint: 'force_condition',
            dominantReason: 'Significant corps exhaustion is limiting operational tempo',
        };
    }

    // 5. Institutional strain — command compromised, defensive/reorganize stance
    if (corpsStance === 'reorganize') {
        return {
            primaryConstraint: 'institutional_strain',
            dominantReason: 'Corps is reorganizing — all operations suspended by directive',
        };
    }
    if (commandStrain >= COMPROMISED_THRESHOLD) {
        return {
            primaryConstraint: 'institutional_strain',
            dominantReason: 'Command relationship is compromised — offensive options restricted until stabilized',
        };
    }
    if (corpsStance === 'defensive') {
        return {
            primaryConstraint: 'institutional_strain',
            dominantReason: 'Corps directed to hold defensive posture — no offensive planning authorized',
        };
    }

    // 6. Plan lifecycle — suspended/abandoned/concentrating (non-urgent but notable)
    if (plan?.status === 'suspended') {
        const reason = plan.suspension_reason || commanderState.last_plan_reason || 'conditions deteriorated';
        return {
            primaryConstraint: 'plan_lifecycle',
            dominantReason: `Operation plan suspended — ${reason}`,
        };
    }
    if (commanderState.last_plan_action === 'abandoned' && commanderState.last_plan_reason) {
        return {
            primaryConstraint: 'plan_lifecycle',
            dominantReason: `Recent operation plan abandoned — ${commanderState.last_plan_reason}`,
        };
    }

    // 7. Moderate threat with concentration signs (lower priority than direct pressure)
    if (pressure === 'moderate' && (threat?.enemy_concentration_zones?.length ?? 0) > 0) {
        return {
            primaryConstraint: 'threat_pressure',
            dominantReason: 'Enemy concentration detected — defensive readiness elevated',
        };
    }

    // 8. Strained command (lower than compromised — notable but not blocking)
    if (commandStrain >= STRAINED_THRESHOLD) {
        return {
            primaryConstraint: 'institutional_strain',
            dominantReason: 'Command relationship under strain from recent presidential interventions',
        };
    }

    // 9. None — healthy
    return { primaryConstraint: 'none', dominantReason: null };
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
