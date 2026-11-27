/**
 * CANONICAL LIFECYCLE OWNER - Corps Operations
 *
 * This file is the single authoritative owner of the corps operation lifecycle:
 * planning -> preparation -> execution -> recovery.
 *
 * All operation creation, advancement, and recovery flows through here.
 * bot_corps_operations.ts is the legacy/transitional path and is non-authoritative.
 * operation_preparation.ts owns the preparation sub-phase.
 * operation_prediction.ts owns predictive/advisory computation.
 *
 * A sector offensive IS a CorpsOperation with type === 'sector_attack'.
 * Lifecycle: planning -> execution -> recovery -> removed from state.
 *
 * Pipeline integration:
 *   advance-sector-offensives  (after corps orders, before brigade orders)
 *   update-sector-offensive-results (after attack resolution)
 *
 * **Launch and eligible-attacker gates (Phase D Trust-and-Baseline):**
 * - Launch: Corps may launch when sector has >= MIN_BRIGADES_FOR_OFFENSIVE (2) assigned,
 *   no existing sector op for that corps, and sector has valid offensive targets. Planning
 *   duration is computed from objective count; force_launch can shorten.
 * - Transition to execution: after one planning turn when the operation is prepared/staged,
 *   when the planning-duration budget expires, or through force_launch. Supply readiness is
 *   recorded but does not block launch.
 * - Eligible attacker: a brigade that may actually attack in execution is one that is in
 *   participating_brigades, assigned to the operation's sector (or explicitly in the op),
 *   can adopt attack/assault posture (not blocked by home_defense_active unless exempt as
 *   operation participant), and has the target in effectiveDirective.offensive_targets.
 *   See bot_brigade_ai_osid.ts (attack order generation) and combat-causality invalidation
 *   "operation_execution_without_eligible_attackers" when execution runs with zero such brigades.
 *
 * **Sector-anchored launch contract (Phase 3 implemented):**
 * Every commander-generated operation declares a primary sector (`sector_id`). The default
 * eligible brigade pool derives from that sector's assigned brigades. Cross-sector brigades
 * join only as explicit bounded attachments (`attached_brigades`, `reinforcement_source`,
 * `supporting_sector_ids`). See `docs/plans/2026-04-01-v08x-sector-anchored-corps-operations-plan.md`.
 * All current live operation creation paths are expected to provide a primary
 * `sector_id` anchor. Legacy flat-field save compatibility remains supported
 * during lifecycle advancement, but new operation birth without a sector anchor
 * should be treated as a contract violation.
 *
 * Deterministic: sorted iteration, no randomness, no timestamps.
 *
 * MOVEMENT TIER: T4 - Combat Consequence (Operation March)
 * Writes brigade_movement_orders during operation preparation/execution.
 * Must not override commander's operation plan - only marches participants to objectives.
 * (see MOVEMENT_AUTHORITY.md)
 */

import type {
    CorpsCommandState,
    CorpsOperation,
    FactionId,
    FormationId,
    FormationState,
    GameState,
    OperationAxis,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { resolveActiveEmbargoPhase, EMBARGO_PHASE_CAPS } from '../../state/embargo.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { ControlSide } from '../../state/political_control_types.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { releaseOperationCommanders } from './officer_system.js';
import { finalizeOperationAAR } from './operation_aar.js';
import { linkOpportunityResolutionToAAR } from './operation_opportunities.js';
import { applyOperationExperience, gradeStarsToOutcome, checkDefeatism } from './officer_experience.js';
import { createColumnMovementOrder } from './brigade_movement_order_helpers.js';
import { isEastHerzegovinaPair, isGrazAccordsActive, shouldGrazBlockAttack } from '../local_truces.js';
import { isFriendlyFaction as isFriendlyFactionCtrl, isRbihHrhbCombatBlocked } from '../early_war/alliance_update.js';
import { isEnclaveBrigade, isOsidInSameEnclave } from './enclave_resilience.js';
import { tickPreparation, hasUnresolvedProbe, autoResolveProbe, formTgsAtReadyTransition, formTgForAxis, settleLinkedPreparationProbeOnRecovery } from './operation_preparation.js';
import {
    emitCorpsExhaustionRecord,
    emitLinkedPreparationProbeRecord,
    emitSouthernMovePreparationPassRecord,
    isSouthernMovePreparationPassSelected,
} from './reason_code_debug.js';
import { advanceLatePhaseGates, isLatePhaseResultPassIdle, startLatePhaseHold } from './operation_phase_gate.js';
// ADR-0005 v2.2b #45: TG dissolution at execution→recovery. Flag-gated.
import {
    completeOperationLifecycle,
    enterOperationRecovery,
    evaluateOperationTacticalGroupExhaustion,
    markOperationExecuting,
} from './tactical_group_lifecycle.js';
import {
    BRIGADE_LOSS_THRESHOLD,
    COHESION_HEALTHY_THRESHOLD,
    EXECUTION_MAX_DURATION,
    PLANNING_DURATION,
    PROGRESS_FAILURE_THRESHOLD,
    PROGRESS_SUCCESS_THRESHOLD,
    RECOVERY_DURATION,
    PERSONNEL_HEALTHY_THRESHOLD,
} from './bot_constants.js';
import { getActiveDoctrinePhase } from './bot_strategy.js';
import { designedStrengthFraction, getFactionCorps, getCorpsSubordinates, sortByPersonnelDesc } from './bot_corps_helpers.js';
import type { PredictedOutcome } from './combat_predictor.js';
import { seedDisplacementTimerOnFlip } from '../../state/displacement_takeover.js';
import type { PreparationEvent } from '../turn_pipeline_types.js';
import { checkLoanedArrivals, areLoanedBrigadesReady, cleanupDissolvedLoans } from './operation_reinforcement.js';
import { MAX_OP_LOAN_DISTANCE, LOAN_STAGING_BUFFER_TURNS } from './operation_reinforcement_constants.js';
import {
    findBrigadeLiveOperationAnywhere,
    getMaxOperationSlots,
    getOperationSlotUsageForOperations,
    hasActiveOperation,
    isCommanderBuiltOperation,
    removeOperation,
} from './corps_operation_helpers.js';
import { resolveArmyHqOperation } from '../../state/operation_lifecycle_reconciliation.js';
import { MIN_ATTACK_PERSONNEL } from '../../state/formation_constants.js';
import { mayEliteJoinOperation } from './historical_elite_reservations.js';
import { isVlasicCohaExceptionOperation } from './coha_operation_exception.js';
import { isFactionOffensiveOpsSuppressed } from '../events/active_modifiers.js';
import {
    isCorpsBoundByOct1995Ceasefire,
    isOct1995CeasefireInForce,
    isOct1995CeasefireStandDownComplete,
    isOffensiveOperationType,
    recordOct1995CeasefireStandDown,
} from './oct1995_ceasefire.js';
import { isOperationObjectiveForeignControlled } from './operation_objective_hostility.js';
import { effectiveOperationMinimum } from './operation_minimum_policy.js';
import {
    allAxesTerminal,
    assignBrigadeRoles,
    computeMultiAxisPlanningDuration,
    PLANNING_INVALIDATION_GRACE_TURNS,
    getAllAxisBrigades,
    getAllAxisObjectives,
    getCurrentLaunchObjectives,
    getPreparationObjectiveView,
    isMultiAxis,
    isSupportBrigadeOnActiveOp,
    resetAxisForExecution,
    sumAxesField,
    validateAxisContiguity,
} from './sector_offensive_axis_helpers.js';

export {
    MAX_PLANNING_DURATION,
    PLANNING_MARCH_BUFFER,
    computePlanningDuration,
} from './sector_offensive_axis_helpers.js';
import {
    areParticipantsReadyForExecution,
    buildOsidAdjacencyFromFrontEdges,
    collectObjectiveApproachOsids,
    evaluateOpeningAttackReadiness,
    getEquipmentOffensivePriority,
    getMomentumAggressionBonus,
    getMomentumMinOutcome,
    hasEligibleAttackersForLaunch,
    launchAxisObjectiveView,
    pruneUnreachablePlanningObjectivePrefix,
    resolveEquipmentClass,
    shouldStallAxisForRecentCatastrophicObjective,
} from './sector_offensive_launch_helpers.js';
import type { OpeningAttackPredictionContext } from './sector_offensive_launch_helpers.js';

export {
    assignBrigadeRoles,
    createSingleAxis,
    getAllAxisBrigades,
    getAllAxisObjectives,
    isMultiAxis,
    isSupportBrigadeOnActiveOp,
    validateAxisContiguity,
} from './sector_offensive_axis_helpers.js';
export {
    getEquipmentOffensivePriority,
    getMomentumAggressionBonus,
    getMomentumMinOutcome,
    resolveEquipmentClass,
} from './sector_offensive_launch_helpers.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum brigades in sector to launch an offensive. */
// Single-brigade "operations" are not operations — they hammer one objective,
// fail 3 consecutive idle turns, and "complete" with 0 captures.
// 2 brigades = minimum for realistic combined-arms commitment.
const MIN_BRIGADES_FOR_OFFENSIVE = 2;

/**
 * Embargo-offensive-gate cap threshold. A faction whose current
 * `EMBARGO_PHASE_CAPS[phase][faction].general` is below this value cannot
 * launch a NEW offensive corps operation that turn (existing operations are
 * unaffected — this gates launch eligibility only). RBiH sits at 0.6 (phase 1)
 * / 0.65 (phases 2-3) / 0.8 (phase 4-5, "unenforced"/"lifted"); RS and HRHB are
 * always 1.0 in every phase, so this never gates them — a data property of
 * `EMBARGO_PHASE_CAPS`, not a hardcoded faction check. Historian citation:
 * BB1 p.199 — the embargo hit heavy weapons/ammunition hardest, the exact
 * resource a sustained multi-brigade offensive depends on; ARBiH 2nd Corps'
 * first real offensive against VRS in this theatre was mid-1994, and it failed
 * from overextension (BB1 p.422).
 */
const EMBARGO_OFFENSIVE_GATE_CAP_THRESHOLD = 0.7;

/** Maximum objectives per offensive (absolute cap). */
const MAX_OBJECTIVES_CAP = 6;
/** Objectives per brigade ratio — scales op scope with force size. */
const OBJECTIVES_PER_BRIGADE = 0.5; // 1 objective per 2 brigades

// Personnel floor below which a brigade cannot attack — use MIN_ATTACK_PERSONNEL (500) from
// formation_constants (canonical single source, shared with bot_brigade_eval_attack).
// NOTE: the local constant was previously 400 — unified to 500 to match MIN_ATTACK_PERSONNEL.

/** Maximum brigades participating in a single sector offensive. */
const MAX_PARTICIPATING_BRIGADES = 20;

/** Momentum cap. */
const MOMENTUM_CAP = 3;

/**
 * Number of failed operation attempts on the same objective before triggering a cooldown.
 * After this many failures, the objective is suppressed for OBJECTIVE_FAILURE_COOLDOWN_TURNS.
 * Set to 2: one probe-style failure is tolerable, but a second consecutive failure
 * signals the position is hardened and the corps should redirect effort.
 */
const OBJECTIVE_FAILURE_THRESHOLD = 2;

/**
 * How many turns a repeatedly-failed objective is suppressed from directive targeting.
 * 8 turns (~2 months) gives time for reinforcements, resupply, or re-assessment —
 * consistent with historical pauses after failed assaults in the Bosnian War.
 */
const OBJECTIVE_FAILURE_COOLDOWN_TURNS = 8;

/**
 * LANE-NIGHTSHIFT-A2 (2026-05-03): minimum predictor force-ratio for launch.
 *
 * Per /operations-expert Tier 1 + n1623 panel verdict: ops with
 * predictor force_ratio_estimate < 0.3 are obviously-doomed mismatches
 * (attacker <33% of defender power). Krivaja-95 in n1623 launched at
 * force_ratio 0.09 / 0 attacks; Stupčanica-95 at 0.83 / 1 attack /
 * max_failures. The 0.3 floor is conservatively set well below the
 * historical 1.5 launch standard, so this only catches catastrophic
 * mismatches without lane-tuning toward Srebrenica/Žepa outcomes.
 *
 * /war-or-game APPROVED-WITH-CAVEAT class: faction-agnostic, OSID-
 * agnostic, scenario-agnostic predictor honesty correction. Same shape
 * as IN-TRANSIT-PREDICTOR / IN-TRANSIT-COMBAT-POWER-CONTEXT predecessor
 * lanes. § 8.3 (a) honest mechanic correction.
 *
 * Forced-launch (player override `op.force_launch === true`) bypasses
 * the floor — the player retains the lever to launch a doomed op anyway.
 * Probes / feints / forced launches that skip preparation have undefined
 * force_ratio_estimate and bypass the gate by predicate construction.
 */
const MIN_LAUNCH_FORCE_RATIO_FLOOR = 0.3;

/**
 * Lower launch floor for ops that have explicitly opted into desperate-push
 * semantics via `min_attack_outcome === 'repulsed'`. The standard 0.3 floor
 * blocks Federation late-war ops (e.g. Mistral 1 Jun 1995) when depleted
 * post-Cincar HVO/HV brigades face the full VRS 2nd Krajina line — force
 * ratios fall sub-0.3 even though the op author has signalled tolerance for
 * costly outcomes. Honoring that tolerance at the launch gate restores
 * symmetry with the per-attack outcome predicate.
 */
const MIN_LAUNCH_FORCE_RATIO_FLOOR_REPULSED = 0.15;

function launchFloorForOp(op: { min_attack_outcome?: string }): number {
    return op.min_attack_outcome === 'repulsed' ? MIN_LAUNCH_FORCE_RATIO_FLOOR_REPULSED : MIN_LAUNCH_FORCE_RATIO_FLOOR;
}

/**
 * Phase E MVS — international_standing → op-launch hesitation multiplier.
 *
 * Mirrors the canonical `getActiveEquipmentQualityMultiplier` `!== 1.0`
 * byte-stable consumer pattern (combat_math.ts:1305-1310): when no hesitation
 * applies, returns 1.0 and consumers MUST gate `if (mult !== 1.0)` so the
 * historical (no-event, gate-off) path is byte-identical to baseline.
 *
 * Magnitude (0.7×) and threshold (< 30) are the orchestrator-accepted
 * Architect defaults. The threshold matches "diplomatically isolated" — a
 * commander whose faction has < 30 international_standing hesitates to
 * launch fresh offensives (UN scrutiny, embargo risk, patron pressure).
 *
 * ACTIVATION GUARD (turn-gate) — historian verdict 2026-06-08:
 * An UNGATED `< 30` op-hesitation is a 1992 ANACHRONISM. Diplomatic-isolation
 * pressure on the Serb side (the faction that bottoms out international_standing)
 * was a 1994–95 phenomenon (NATO ultimatums, the contact-group plan, the threat
 * of decisive air power); in 1992 the binding international constraint was the
 * arms embargo, which hurt the Bosnian Muslims, NOT op-launch hesitation for the
 * better-armed side. To avoid back-dating that 1994 dynamic onto the opening of
 * the war, this channel is turn-gated: it only engages from
 * `INTL_STANDING_OPS_HESITATION_MIN_TURN` onward. Before that turn (or when the
 * turn is unknown) the multiplier is 1.0 — i.e. the channel is a no-op even when
 * the propagation flags are flipped ON. This keeps the dimension wired but
 * historically inert through the early war.
 *
 * Soft consumer contract: the multiplier MAY be applied to any op-launch
 * scoring variable (force-ratio estimate, brigade-count floor, etc). The
 * canonical consumer is `buildOperations` in commander/emit.ts which scales
 * the `minForOp` threshold upward by `1/mult` when hesitation is active. That
 * consumer passes `briefing.turn` as `currentTurn`.
 *
 * Inputs:
 * - `intlStanding`: faction's effective international_standing
 *   (0..100), or `undefined` when the propagation gate is off / the
 *   briefing field is absent. Undefined → returns 1.0 (no-op).
 * - `currentTurn`: the current sim turn (week index). When omitted/NaN or below
 *   `INTL_STANDING_OPS_HESITATION_MIN_TURN`, the channel is inert (1.0). All
 *   callers (emit.ts buildOperations, the two diagnostics, and the HUD reader
 *   getProjectedDimensionMultiplier) pass the save/state turn so the turn-gate
 *   is honored consistently; omitting it yields the inert (pre-gate) signal.
 *
 * Determinism: pure function of its numeric inputs. No state, no randomness,
 * no save-state field.
 */
export function getIntlStandingOpsHesitationMultiplier(
    intlStanding: number | undefined,
    currentTurn?: number,
): number {
    if (typeof intlStanding !== 'number') return 1.0;
    // Turn-gate guard: inert before mid-1994 (see INTL_STANDING_OPS_HESITATION_MIN_TURN).
    // Unknown turn (undefined/NaN) is treated as "before the gate" → no-op, so the
    // channel can never fire without a confirmed turn ≥ the threshold.
    if (typeof currentTurn !== 'number' || Number.isNaN(currentTurn)
        || currentTurn < INTL_STANDING_OPS_HESITATION_MIN_TURN) {
        return 1.0;
    }
    if (intlStanding < INTL_STANDING_OPS_HESITATION_THRESHOLD) {
        return INTL_STANDING_OPS_HESITATION_MULTIPLIER;
    }
    return 1.0;
}

/**
 * Embargo-driven op-launch dampener — chains alongside the four hesitation
 * multipliers above (same `combinedMult` consumer, `emit.ts` buildOperations).
 * Gated by `embargo_offensive_gate_enabled` (independent of
 * `supply_reserves_enabled`, touches no reserve/siege/enclave state).
 *
 * Unlike the political-hesitation multipliers (0.7-0.85×, soft caution), this
 * models a hard material constraint — no ammunition means no sustained
 * multi-brigade offensive is physically possible, not just politically
 * disfavored — so the multiplier is deliberately punishing (0.15×) rather than
 * a mild dampener. Historian citation: BB1 p.199, the embargo hit heavy
 * weapons/ammunition hardest; ARBiH 2nd Corps' first real offensive against
 * VRS in the Brčko/Tuzla theatre was mid-1994 (BB1 p.422) and failed from
 * overextension — spring 1993 offensive capability against VRS should be
 * near-zero, not merely reduced.
 *
 * Returns 1.0 (no-op) when the gate is off, the faction's current embargo cap
 * (`EMBARGO_PHASE_CAPS`) is at/above threshold, or `faction` is unrecognized.
 * RS/HRHB are always capped at 1.0 in every embargo phase, so this never
 * fires for them — a data property of `EMBARGO_PHASE_CAPS`, not a hardcoded
 * per-faction branch.
 */
export function getEmbargoOpsHesitationMultiplier(
    state: Pick<GameState, 'meta' | 'military'>,
    faction: FactionId,
): number {
    if (!state.meta?.embargo_offensive_gate_enabled) return 1.0;
    const phase = resolveActiveEmbargoPhase(state as GameState);
    const cap = EMBARGO_PHASE_CAPS[phase]?.[faction]?.general ?? 1.0;
    return cap < EMBARGO_OFFENSIVE_GATE_CAP_THRESHOLD ? EMBARGO_OFFENSIVE_GATE_MULTIPLIER : 1.0;
}

/** Soft-consumer multiplier applied when `getEmbargoOpsHesitationMultiplier`
 *  fires — deliberately punishing (not a mild dampener like its 0.7-0.85×
 *  siblings), see function doc for why. */
const EMBARGO_OFFENSIVE_GATE_MULTIPLIER = 0.15;

/** Phase E MVS: international_standing threshold below which a faction's corps
 *  COs hesitate on op launch. Orchestrator-accepted Architect default. */
const INTL_STANDING_OPS_HESITATION_THRESHOLD = 30;

/** ACTIVATION GUARD (historian verdict 2026-06-08): earliest sim turn (week
 *  index) at which the international_standing op-hesitation channel engages.
 *  The scenario opens April 1992 at turn 0 and runs ~1 turn/week, so turn 100
 *  ≈ mid-1994 — the point at which diplomatic-isolation pressure on the Serb
 *  side became a real constraint on offensive tempo (NATO ultimatums, contact-
 *  group leverage). Before this turn the channel is inert even with the flags
 *  ON, so the 1994–95 dynamic is never back-dated onto the 1992–93 war.
 *  Owner-adjustable: raise to delay, lower to extend the window earlier. */
const INTL_STANDING_OPS_HESITATION_MIN_TURN = 100;

/** Phase E MVS: hesitation multiplier applied to op-launch scoring when
 *  international_standing < threshold. Orchestrator-accepted Architect default.
 *  Soft pressure (0.7×) — not a hard block. */
const INTL_STANDING_OPS_HESITATION_MULTIPLIER = 0.7;

/**
 * Phase E Packet 2 — internal_cohesion → op-launch caution-bias multiplier.
 *
 * Mirrors the canonical `getActiveEquipmentQualityMultiplier` `!== 1.0`
 * byte-stable consumer pattern and the sibling `getIntlStandingOpsHesitation
 * Multiplier` above. When no caution-bias applies, returns 1.0 and consumers
 * MUST gate `if (mult !== 1.0)` so the historical (no-event, gate-off) path is
 * byte-identical to baseline.
 *
 * Magnitude (0.85×) is more conservative than the 0.7× intl_standing
 * hesitation — cohesion is a slower-moving political signal (faction
 * legitimacy / mobilization frictions / internal dissent) and the bot should
 * only become modestly more cautious, not dramatically so.
 *
 * ACTIVATION GUARD (threshold recalibration) — historian verdict 2026-06-08:
 * The original `< 40` threshold was authored against an assumed [0..100]
 * effective_value distribution. AFTER #63 (cohesion-divisor rescale, commit
 * 16c1a249b) the `internal_cohesion` dimension compressed to roughly [0..50]:
 * its base formula (strategic_dimensions.ts) is
 * `clamp(allianceVal + avgCohesion/2 - exhaustion/300, 0, 100)`, whose realised
 * ceiling is ~65 early-war (RBiH/HRHB, allied bonus) / ~45 (RS, fixed allianceVal
 * 20) and collapses into the 0–30 band by mid-war. A 40w sample (turn 40,
 * hash 235c61f4) read RBiH 0.78 / RS 29.74 / HRHB 20.91 — i.e. `< 40` fires for
 * ALL THREE factions, so the original threshold no longer discriminates
 * genuinely-low cohesion: it is a universal caution penalty. Recalibrated to
 * `< 15` so only the bottom band of the post-#63 effective range trips the
 * caution-bias (in the sample: RBiH-only), preserving the original design INTENT
 * — flag the genuinely-fraying faction, not every faction.
 *
 * Soft consumer contract: the multiplier MAY be applied to any op-launch
 * scoring variable. The canonical consumer is `buildOperations` in
 * commander/emit.ts which chains it alongside the intl_standing hesitation
 * multiplier when scaling the `minForOp` threshold.
 *
 * Inputs:
 * - `cohesion`: faction's effective internal_cohesion (0..100), or
 *   `undefined` when the propagation gate is off / the briefing field is
 *   absent. Undefined or non-numeric → returns 1.0 (no-op).
 *
 * Determinism: pure function of one numeric input. No state, no randomness,
 * no save-state field.
 */
export function getCohesionCautionBiasMultiplier(
    cohesion: number | undefined,
): number {
    if (typeof cohesion !== 'number') return 1.0;
    if (Number.isNaN(cohesion)) return 1.0;
    if (cohesion < COHESION_CAUTION_BIAS_THRESHOLD) {
        return COHESION_CAUTION_BIAS_MULTIPLIER;
    }
    return 1.0;
}

/** Phase E Packet 2: internal_cohesion threshold below which a faction's
 *  corps COs become more cautious on op launch. RECALIBRATED 2026-06-08 from
 *  40 → 15 (ACTIVATION GUARD): post-#63 the internal_cohesion effective_value
 *  distribution compressed to ~[0..50] (40w turn-40 sample: RBiH 0.78 / RS 29.74
 *  / HRHB 20.91), so the original `< 40` fired for ALL factions and no longer
 *  discriminated genuinely-low cohesion. `< 15` flags only the bottom band of
 *  the post-#63 range — owner-adjustable. See the helper doc-comment above for
 *  the full recalibration basis. */
const COHESION_CAUTION_BIAS_THRESHOLD = 15;

/** Phase E Packet 2: caution-bias multiplier applied to op-launch scoring
 *  when internal_cohesion < threshold. Orchestrator-accepted Architect
 *  default. Softer pressure (0.85×) than the 0.7× intl_standing hesitation
 *  — cohesion is a slower-moving signal. */
const COHESION_CAUTION_BIAS_MULTIPLIER = 0.85;

/**
 * Phase E extension — patron_confidence → op-launch patron-hesitation multiplier.
 *
 * Mirrors the canonical `getIntlStandingOpsHesitationMultiplier` `!== 1.0`
 * byte-stable consumer pattern. When no hesitation applies, returns 1.0 and
 * consumers MUST gate `if (mult !== 1.0)` so the historical (no-event,
 * gate-off) path is byte-identical to baseline.
 *
 * Direction mirrors intl_standing: LOW patron confidence → MORE hesitant. The
 * faction's external sponsor (Belgrade→RS, Zagreb→HRHB, US/Iran→RBiH) has lost
 * confidence and will not underwrite a fresh offensive (ammunition/fuel/
 * spare-part throttling + political pressure to stop pushing — cf. the VRS
 * post-1994 Belgrade fuel embargo, the HVO Washington-Agreement cooldown).
 *
 * Magnitude (0.75×) sits between the 0.7× intl_standing hesitation and the
 * 0.85× cohesion caution: patron relationship is a moderately fast-moving
 * political signal (sponsors throttle within weeks). Threshold (< 30) mirrors
 * the intl_standing "isolated" band — a sponsor below 30 is actively withholding.
 *
 * Soft consumer contract: the multiplier MAY be applied to any op-launch
 * scoring variable. The canonical consumer is `buildOperations` in
 * commander/emit.ts which chains it alongside the other PDP multipliers when
 * scaling the `minForOp` threshold.
 *
 * Inputs:
 * - `patronConfidence`: faction's effective patron_confidence (0..100), or
 *   `undefined` when the propagation gate is off / the briefing field is
 *   absent. Undefined or non-numeric/NaN → returns 1.0 (no-op).
 *
 * Determinism: pure function of one numeric input. No state, no randomness,
 * no save-state field.
 */
export function getPatronConfidenceOpsHesitationMultiplier(
    patronConfidence: number | undefined,
): number {
    if (typeof patronConfidence !== 'number') return 1.0;
    if (Number.isNaN(patronConfidence)) return 1.0;
    if (patronConfidence < PATRON_CONFIDENCE_OPS_HESITATION_THRESHOLD) {
        return PATRON_CONFIDENCE_OPS_HESITATION_MULTIPLIER;
    }
    return 1.0;
}

/** Phase E extension: patron_confidence threshold below which a faction's corps
 *  COs hesitate on op launch (sponsor withholding support). Orchestrator-
 *  accepted Architect default; mirrors the intl_standing "isolated" band. */
const PATRON_CONFIDENCE_OPS_HESITATION_THRESHOLD = 30;

/** Phase E extension: hesitation multiplier applied to op-launch scoring when
 *  patron_confidence < threshold. Soft pressure (0.75×) — between the 0.7×
 *  intl_standing hesitation and 0.85× cohesion caution. Not a hard block. */
const PATRON_CONFIDENCE_OPS_HESITATION_MULTIPLIER = 0.75;

/**
 * Phase E extension — military_credibility → op-launch caution-bias multiplier.
 *
 * Mirrors the `getCohesionCautionBiasMultiplier` `!== 1.0` byte-stable consumer
 * pattern. When no caution-bias applies, returns 1.0 and consumers MUST gate
 * `if (mult !== 1.0)` so the historical (no-event, gate-off) path is
 * byte-identical to baseline.
 *
 * Direction mirrors internal_cohesion: LOW military credibility → MORE cautious.
 * A corps whose recent operations have failed and whose casualty-exchange ratio
 * is bleeding has lost confidence in its own offensive capability — it
 * consolidates rather than attacks.
 *
 * Magnitude (0.85×) matches the cohesion caution: both are slow-moving,
 * ops-history-derived morale-class signals, so the soft pressure is identical.
 * Threshold (< 40) mirrors the cohesion "fraying" band.
 *
 * Soft consumer contract: the multiplier MAY be applied to any op-launch
 * scoring variable. The canonical consumer is `buildOperations` in
 * commander/emit.ts which chains it alongside the other PDP multipliers when
 * scaling the `minForOp` threshold.
 *
 * Inputs:
 * - `militaryCredibility`: faction's effective military_credibility (0..100),
 *   or `undefined` when the propagation gate is off / the briefing field is
 *   absent. Undefined or non-numeric/NaN → returns 1.0 (no-op).
 *
 * Determinism: pure function of one numeric input. No state, no randomness,
 * no save-state field.
 */
export function getMilitaryCredibilityCautionBiasMultiplier(
    militaryCredibility: number | undefined,
): number {
    if (typeof militaryCredibility !== 'number') return 1.0;
    if (Number.isNaN(militaryCredibility)) return 1.0;
    if (militaryCredibility < MILITARY_CREDIBILITY_CAUTION_BIAS_THRESHOLD) {
        return MILITARY_CREDIBILITY_CAUTION_BIAS_MULTIPLIER;
    }
    return 1.0;
}

/** Phase E extension: military_credibility threshold below which a faction's
 *  corps COs become more cautious on op launch (failing ops record + bleeding
 *  exchange ratio). Orchestrator-accepted Architect default; mirrors the
 *  cohesion "fraying" band. */
const MILITARY_CREDIBILITY_CAUTION_BIAS_THRESHOLD = 40;

/** Phase E extension: caution-bias multiplier applied to op-launch scoring when
 *  military_credibility < threshold. Soft pressure (0.85×) — matches the
 *  cohesion caution magnitude (both slow-moving morale-class signals). */
const MILITARY_CREDIBILITY_CAUTION_BIAS_MULTIPLIER = 0.85;

/** Corps exhaustion decay per turn when idle (no active operation). */
const EXHAUSTION_DECAY_IDLE = 3;

/** Corps exhaustion decay per turn while running an operation. */
const EXHAUSTION_DECAY_ACTIVE = 1;

/** Maximum total failures before abort.
 *
 * WARNING (Issue #29 — REAL_WAR_MASTER.md): In multi-axis operations this cap
 * is applied PER AXIS, not per operation. With 5 axes × 5 failures each, the
 * operation can sustain 25 total failures before all axes stall and recovery
 * begins. Operacija Izlaz (3rd Corps, n701 run) ran 12 weeks, 0/5 objectives,
 * burning ~3,500 ARBiH personnel at 7-21:1 attacker:defender ratios because
 * each axis failed independently. A real corps commander would abort after the
 * 2nd catastrophic failure with 500+ casualties. Fix candidates:
 *   (a) Add an OPERATION-LEVEL failure cap that fires independently of per-axis
 *       counting — e.g. MAX_OPERATION_TOTAL_FAILURES = 8 across all axes.
 *   (b) Add a power-ratio viability gate: if predicted power_ratio < 0.35 for
 *       all remaining axes, abort regardless of failure budget.
 *   (c) Reduce to MAX_TOTAL_FAILURES = 3 for multi-axis and keep 5 for single. */
const MAX_TOTAL_FAILURES = 8;

/** Wave 20: single-axis ops abort faster. Multi-axis ops can sustain 8 failures
 *  per axis (with multi-axis zero-progress backstop catching pathological cases),
 *  but single-axis ops where the per-turn brain can't find a viable next attack
 *  (e.g. Cincar Phase 1 post-bucovaca with strong VRS Kupres garrison) should
 *  release brigades sooner. The per-axis cap fires earlier so the op enters
 *  recovery and brigades become available for downstream cascade ops. */
const MAX_TOTAL_FAILURES_SINGLE_AXIS = 4;

/** Consecutive failures on same objective before skip. */
const MAX_CONSECUTIVE_FAILURES_ON_CURRENT = 3;

/** Maximum execution turns with movement but zero attacks before abort.
 *  Prevents operations from marching brigades around indefinitely when
 *  no brigade can find an attackable target (e.g. ARBiH 1st Corps under siege). */
const MAX_MOVEMENT_ONLY_EXECUTION_TURNS = 4;

/** Execution turns without a logged attack (lifetime 0), or without any participant attack or
 *  move order (any lifetime), before the no-attack exit ends the operation. */
const MAX_EXECUTION_TURNS_ZERO_ATTACKS = 5;

/** Zero-progress failure abort threshold for multi-axis operations (Issue #29).
 *  When total axis failures reach this number AND zero objectives have been
 *  captured AND at least 1 attack has been made (not just marching), the
 *  operation is terminated early. This fires BEFORE the per-axis cap
 *  (MAX_TOTAL_FAILURES=5) for single-axis operations, cutting suicidal
 *  attack runs from 5 turns to 3. Multi-axis operations making any progress
 *  (≥1 capture) are exempt and run to their full per-axis budget.
 *
 *  R14a (2026-05-25): raised from 3 → 5. With R8 strategic_depth +
 *  R11 Krajina-collapse + R13b op-axis 2-hop concentration stacking
 *  for post-Storm RS-Krajina defenders, the asymptotic per-attempt
 *  capture probability at hardened staging OSIDs (e.g. Mistral 1 at
 *  crni_lug) is non-trivial — but n20 telemetry showed Mistral 1 hits
 *  the 3-failure axis stall after 4 attempts (axisFailures=4, captures=0)
 *  before that probability gets enough rolls. 5 gives multi-axis ops
 *  two more chances to break a hard defender, while staying well below
 *  the absolute MAX_TOTAL_FAILURES = 8 ceiling that backstops pathological
 *  Operacija-Izlaz-style marathons (per Issue #29 / REAL_WAR_MASTER).
 *  Faction-symmetric: applies to any multi-axis op of any faction.
 */
const MAX_OPERATION_ZERO_PROGRESS_FAILURES = 5;

/** Consecutive catastrophic outcomes on the same objective before axis stalls.
 *  A desperate attack at bad odds can happen once — commanders sometimes gamble.
 *  But no one sends men to die at the same fortified position three turns running.
 *  After 2 consecutive catastrophics, the axis stalls. */
const MAX_CONSECUTIVE_CATASTROPHIC_ON_CURRENT = 2;

/** Maximum turns an idle axis will wait for a sibling axis to capture a shared
 *  current objective before stalling. Prevents premature stall when another executing
 *  axis in the same operation is advancing on the same objective (convergence capture).
 *  Finite termination: the cap guarantees the waiting axis stalls if the sibling
 *  ceases advancing or fails to capture within the wait window. */
const MAX_SHARED_OBJECTIVE_WAIT_TURNS = 3;
const EARLY_LAUNCH_COHESION_PENALTY = 15;
const ALL_OUT_EXTRA_COHESION_COST = 1;
const FEINT_PLANNING_TURNS = 2;

/**
 * Synthesis §3 E-B2: Operation Una negative-control combat-power cap.
 * Applied to predictor force_ratio_estimate (which scales linearly with
 * attacker power) when an operation is HV-dominant and isolated. Tuned
 * to 0.65 from the historical record: HV-only Una collapsed in 48h with
 * roughly 1/3 of paper-strength effective power once HVO-native rear
 * support and local guides were absent.
 */
const HV_UNA_NEGATIVE_CONTROL_MULT = 0.65;
/** §3 E-B2: HV-dominance threshold (>80% of participating brigades HV-tagged). */
const HV_UNA_DOMINANCE_THRESHOLD = 0.8;
/** §3 E-B2: tag string written by hv_integration.spawnHvBrigade (E-B2). */
const HV_ATTACHED_SOURCE_TAG = 'attached_source:hv';

function isHvTaggedBrigade(f: FormationState | undefined): boolean {
    if (!f?.tags) return false;
    return f.tags.includes(HV_ATTACHED_SOURCE_TAG) || f.tags.includes('hv_origin');
}

/**
 * Negative-control predicate for Operation Una style HV-only thrusts.
 * Returns true when (a) >80% of the op's participating brigades are HV-tagged
 * and (b) no HVO-native (non-HV-tagged) HRHB brigade is assigned to any
 * sector owned by this corps. The corps-sector proxy substitutes for an
 * explicit 2-hop BFS over operational edges, which is not threaded into
 * advanceSectorOffensives; it is conservative — a non-HV HRHB brigade in
 * an adjacent corps' sector would not satisfy the predicate, matching the
 * "isolated thrust" historical signature.
 */
function isHvUnaNegativeControl(
    state: GameState,
    op: { participating_brigades: readonly FormationId[]; axes?: readonly { assigned_brigades: readonly FormationId[] }[] },
    corpsId: FormationId,
): boolean {
    const formations = state.military.formations ?? {};
    const brigadeIds = isMultiAxis(op as CorpsOperation)
        ? getAllAxisBrigades(op as CorpsOperation)
        : op.participating_brigades;
    if (!brigadeIds || brigadeIds.length === 0) return false;

    let hvCount = 0;
    let total = 0;
    for (const bid of brigadeIds) {
        const f = formations[bid];
        if (!f) continue;
        total += 1;
        if (isHvTaggedBrigade(f)) hvCount += 1;
    }
    if (total === 0) return false;
    const hvShare = hvCount / total;
    if (hvShare <= HV_UNA_DOMINANCE_THRESHOLD) return false;

    // Look for an HVO-native (non-HV-tagged) brigade in any sector owned by
    // this corps. If one exists, the op is co-deployed — no penalty.
    const sectors = state.military.corps_front_sectors ?? {};
    for (const sectorId of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sectorId];
        if (!sector || sector.corps_id !== corpsId) continue;
        for (const bid of sector.assigned_brigade_ids ?? []) {
            const f = formations[bid];
            if (!f) continue;
            if (f.faction !== 'HRHB') continue;
            if (!isHvTaggedBrigade(f)) return false;
        }
        for (const bid of sector.reserve_brigade_ids ?? []) {
            const f = formations[bid];
            if (!f) continue;
            if (f.faction !== 'HRHB') continue;
            if (!isHvTaggedBrigade(f)) return false;
        }
    }
    return true;
}

function sectorContainsFriendlyOsid(
    sector: { territory_osids?: readonly string[]; sub_segments?: readonly { friendly_osids: readonly string[] }[] },
    osid: string,
): boolean {
    if (sector.territory_osids?.includes(osid)) return true;
    for (const sub of sector.sub_segments ?? []) {
        if (sub.friendly_osids.includes(osid)) return true;
    }
    return false;
}

export function getTargetOsidIntelConfidenceForCorps(
    state: GameState,
    corpsId: FormationId,
    targetOsid: string,
): number | null {
    const sectors = state.military.corps_front_sectors ?? {};
    const intel = state.military.sector_intel ?? {};
    let bestConfidence: number | null = null;

    for (const sectorId of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sectorId];
        if (!sector || sector.corps_id !== corpsId) continue;
        const records = [...(intel[sectorId] ?? [])].sort((a, b) => strictCompare(a.enemy_sector_id, b.enemy_sector_id));
        for (const record of records) {
            const osidEntry = (record.osid_confidence ?? []).find(entry => entry.osid === targetOsid);
            const enemySector = sectors[record.enemy_sector_id];
            const confidence = osidEntry?.confidence
                ?? (enemySector && sectorContainsFriendlyOsid(enemySector, targetOsid)
                    ? record.confidence
                    : null);
            if (confidence == null) continue;
            bestConfidence = bestConfidence == null ? confidence : Math.max(bestConfidence, confidence);
        }
    }

    return bestConfidence;
}

// ═══════════════════════════════════════════════════════════════════════════
// Post-operation brigade release
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Issue column march orders for brigades that are away from their home
 * municipality after an operation completes. Without this, brigades stay
 * at their operation endpoint and drift into wrong sectors.
 *
 * Called at the moment the operation is about to be cleared, while
 * participating_brigades is still available on the op.
 */
function issuePostOperationReturnMarches(state: GameState, op: CorpsOperation): void {
    const formations = state.military.formations ?? {};
    const allBrigades = isMultiAxis(op) ? getAllAxisBrigades(op) : (op.participating_brigades ?? []);
    const lineAssigned = new Set<string>();
    for (const sector of Object.values(state.military.corps_front_sectors ?? {})) {
        for (const bid of sector.assigned_brigade_ids ?? []) lineAssigned.add(bid);
    }

    for (const bid of allBrigades) {
        const f = formations[bid];
        if (!f || f.status !== 'active') continue;
        if ((f.kind ?? 'brigade') !== 'brigade' && f.kind !== 'hv_phantom') continue;
        // Line-assigned brigades should return to their assigned sector fronts via
        // brigade AI, not be force-pulled to home municipality after each operation.
        if (lineAssigned.has(bid)) continue;

        const loc = f.location_osid;
        const homeOsid = f.home_osid;
        if (!loc || !homeOsid) continue;
        // Check whether the brigade is actually IN one of its corps' sector territories.
        // Previously this checked whether the corps has ANY front at all, which blocked
        // return marches for brigades stranded in disconnected pockets far from the main front.
        const isInCorpsSectorTerritory = Object.values(state.military.corps_front_sectors ?? {})
            .some((s) => s.corps_id === f.corps_id
                && (s.sub_segments?.length ?? 0) > 0
                && s.territory_osids?.includes(loc) === true);
        if (isInCorpsSectorTerritory) continue;

        // Post-operation capture retention: if the brigade is sitting on an OSID
        // that is now politically controlled by its own faction — meaning it was
        // captured during this operation — do not march it home. territory_osids is
        // derived at the start of the turn (partition-corps-front-sectors runs before
        // advance-sector-offensives), so freshly-captured OSIDs are not yet reflected
        // there. The next turn's sector recompute will incorporate the captured OSID
        // into the corps' territory naturally via the political_controllers BFS.
        // Without this guard, every participating brigade is marched home from
        // captured ground, leaving it militarily undefended for one full turn.
        const controller = getPoliticalControllerOSID(state, loc, undefined);
        if (controller === f.faction) continue;

        // Already home — no march needed
        const homeMun = homeOsid.split(':')[1] ?? '';
        const currentMun = loc.split(':')[1] ?? '';
        if (currentMun === homeMun) continue;

        // Skip disrupted brigades — they can't march
        if ((f.disrupted_turns ?? 0) > 0) continue;

        // Skip if already has pending movement orders (e.g. from another system)
        const existingOrders = state.military.brigade_movement_orders ?? {};
        if (existingOrders[bid]) continue;

        // Issue column march toward home_osid (the movement system will BFS there)
        const movementOrders = state.military.brigade_movement_orders ?? (state.military.brigade_movement_orders = {});
        movementOrders[bid] = createColumnMovementOrder(homeOsid);
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// Planning duration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record failed objectives for a corps when an operation ends without success.
 * After OBJECTIVE_FAILURE_THRESHOLD failures, the objective enters a cooldown period.
 * This prevents suicidal repeated assaults on hardened positions (Ripac pattern).
 */
export function recordFailedObjectives(cmd: CorpsCommandState, op: CorpsOperation, turn: number): void {
    if (op.recovery_reason === 'completed') return; // Success — no failure to record
    if (op.recovery_reason === 'probe_complete') return; // Probes gather intel — not a failure
    if (op.recovery_reason === 'political_blocked') return; // Truce/political block is not a failed assault
    // LANE-2026-05-02-B1-PLANNING-INVALIDATED-COOLDOWN: planning_invalidated NOW
    // counts toward objective failure cooldown. Per /operations-expert n1621 evidence
    // (6 sequential vrs_1st_krajina commander ops at boljanic_2/zelinja_gornja_2 all
    // recovering planning_invalidated against identical target_osids), the prior
    // skip silently allowed unbounded re-emission of the same dead plan every turn.
    // The OBJECTIVE_FAILURE_THRESHOLD=2 + 8-turn cooldown bounds the loop without
    // suppressing legitimate first-attempt retries (one planning_invalidated still
    // does not trigger cooldown). Faction-agnostic, corps-agnostic, OSID-agnostic.
    // Systems Manual §6.4 distinction (probe-miss → planning_invalidated) is
    // diagnostic-only and unaffected; CO objective-failure cooldown is a separate
    // concern from execution-attempt logging.

    const failedOsids: string[] = [];
    if (isMultiAxis(op) && op.axes) {
        for (const axis of op.axes) {
            if (axis.status !== 'complete') {
                for (const obj of axis.objectives) failedOsids.push(obj);
            }
        }
    } else {
        for (const obj of op.objectives ?? []) failedOsids.push(obj);
    }

    if (failedOsids.length === 0) return;

    // RF-AI2 bot objective lockout: a bot commander-planned op (buildCommanderOperation)
    // that ends because no axis could attack (zero_eligible_axis) or because it ran out
    // of failures (max_failures) locks its objectives out at once, without waiting for
    // a second failure. Measured: the woken ARBiH 5th Corps re-planned Ripac/Gornja
    // Suvaja every ~5 turns, 7 of 13 ops ending zero_eligible_axis with 0 attacks.
    // Authored, triggered, pre-planned and Army HQ ops keep their threshold behaviour.
    const hardBotFailure = isCommanderBuiltOperation(op)
        && (op.recovery_reason === 'zero_eligible_axis' || op.recovery_reason === 'max_failures');

    if (!cmd.failed_offensive_objectives) cmd.failed_offensive_objectives = {};
    for (const osid of failedOsids) {
        const entry = cmd.failed_offensive_objectives[osid] ?? { failure_count: 0, cooldown_until_turn: 0 };
        entry.failure_count += 1;
        if (hardBotFailure) {
            // Each repeated hard failure on the same objective pushes the next bot try
            // further out (8, 16, 24... turns). Run 4 measured the flat 8-turn window
            // expiring on the very turn the 5th Corps re-assaulted Ripac (t164 -> t172),
            // bleeding the 505th Brigade one turn before Operation Sana.
            // failure_count is shared with every op kind and never decays, so earlier
            // authored failures on the same objective lengthen this too.
            entry.cooldown_until_turn = Math.max(
                entry.cooldown_until_turn,
                turn + OBJECTIVE_FAILURE_COOLDOWN_TURNS * entry.failure_count,
            );
        } else if (entry.failure_count >= OBJECTIVE_FAILURE_THRESHOLD) {
            // Never shorten a longer lockout already in force (e.g. a bot hard-failure one).
            entry.cooldown_until_turn = Math.max(
                entry.cooldown_until_turn,
                turn + OBJECTIVE_FAILURE_COOLDOWN_TURNS,
            );
        }
        cmd.failed_offensive_objectives[osid] = entry;
    }
}

/** Canonical sector-operation recovery wrapper, including AAR snapshotting. */
function beginRecovery(
    op: CorpsOperation,
    turn: number,
    reason: CorpsOperation['recovery_reason'],
    state: GameState,
    hostCorpsId?: FormationId,
): void {
    const resolvedHostCorpsId = hostCorpsId ?? Object.keys(state.military.corps_command ?? {})
        .sort(strictCompare)
        .find((corpsId) => state.military.corps_command?.[corpsId]?.active_operations.includes(op));
    if (!resolvedHostCorpsId) {
        throw new Error(`Cannot enter recovery for unhosted operation ${op.name}`);
    }
    settleLinkedPreparationProbeOnRecovery(state, resolvedHostCorpsId, op);
    op.force_launch = false;
    delete op.silent_execution_turn_streak;
    // Clean up OPSEC marking when operation leaves active phase
    if (op.sector_id && Array.isArray(state.military.opsec_sectors)) {
        state.military.opsec_sectors = state.military.opsec_sectors.filter(s => s !== op.sector_id);
    }
    enterOperationRecovery(state, resolvedHostCorpsId, op, turn, reason);
}

/**
 * Council fix 3 / B10: while the October 1995 general ceasefire holds, offensives (sector attack,
 * feint, probe) are called off through the ordinary lifecycle path (`beginRecovery`, reason
 * `ceasefire`); the normal recovery tick then finalizes and removes them.
 *  - Planning: called off at once; it never launches.
 *  - Executing: on the first ceasefire turn the stand-down caps are recorded
 *    (oct1995_ceasefire.ts): each axis that had engaged may take only its current objective.
 *    The operation is called off once every axis has moved past its cap or stopped; if the
 *    ordinary lifecycle ends it first, its ordinary recovery reason applies.
 * Emergency strategic-defence and reorganization operations are kept; operations already
 * recovering are untouched, so the call is idempotent. Corps are visited in strictCompare order.
 * Returns the called-off `corps:name:t<start>` ids.
 */
export function cancelOffensivesForOct1995Ceasefire(state: GameState, turn: number): string[] {
    const cancelled: string[] = [];
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand || !isOct1995CeasefireInForce(state)) return cancelled;
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const cmd = corpsCommand[corpsId];
        if (!cmd || cmd.active_operations.length === 0) continue;
        if (!isCorpsBoundByOct1995Ceasefire(state, corpsId)) continue;
        for (const op of [...cmd.active_operations]) {
            if (!isOffensiveOperationType(op.type)) continue;
            if (op.phase === 'execution') {
                recordOct1995CeasefireStandDown(op, turn);
                if (!isOct1995CeasefireStandDownComplete(op)) continue;
            } else if (op.phase !== 'planning') {
                continue;
            }
            beginRecovery(op, turn, 'ceasefire', state, corpsId);
            cancelled.push(`${corpsId}:${op.name}:t${op.started_turn}`);
        }
    }
    return cancelled;
}

/** Receipts of one `confirmLaunchedOperationOrders` pass, as `corps:name:t<start>` ids. */
export interface LaunchOrderConfirmationReport {
    /** Zero-order launches sent back to planning this turn (first refusal). */
    demoted: string[];
    /** Zero-order launches ended `zero_eligible_axis` this turn (second refusal). */
    ended: string[];
}

/**
 * P3 mismatch rider, fix B: post-emission launch confirmation.
 *
 * `advanceSectorOffensives` launches an operation on its own readiness view; bot order emission
 * runs later in the same turn on a recomputed view and can refuse every participant. Such a
 * launch is a paper launch: execution starts, nobody attacks and nobody moves, and the existing
 * predicates cannot see it once any earlier attempt exists. This pass reads emission's own
 * output, so the two views cannot drift apart.
 *
 * For each sector attack or probe that entered execution THIS turn through the sector
 * transition (`planning_phase_started_turn` present), whose corps faction emitted bot orders
 * (`factions`), and whose participants hold zero attack orders and zero movement (movement
 * order or column in transit):
 *  - first refusal: demote it to planning, restoring the planning clock and the OPSEC sector;
 *  - second refusal: end it through the ordinary `zero_eligible_axis` recovery (1 turn, slot
 *    freed, objective cooldown via the normal recovery tick).
 * Skipped: player force-launched ops, linked preparation probes, COHA-paused ops (their clock
 * shift can land `phase_started_turn` on this turn), corps bound by the Oct 1995 ceasefire, and
 * ops whose every axis is in a late-phase hold (silence is their order).
 * TG / Army HQ receipts written at launch are left; the re-launch re-marks them idempotently.
 * Deterministic: corps in strictCompare order, operations in array order; no tuned number.
 */
export function confirmLaunchedOperationOrders(
    state: GameState,
    factions: readonly FactionId[],
): LaunchOrderConfirmationReport {
    const report: LaunchOrderConfirmationReport = { demoted: [], ended: [] };
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand || factions.length === 0) return report;
    const turn = state.meta?.turn ?? 0;
    const factionSet = new Set<FactionId>(factions);
    const attackOrders = state.military.brigade_attack_orders ?? {};
    const movementOrders = state.military.brigade_movement_orders ?? {};
    const movementState = state.military.brigade_movement_state ?? {};
    const cohaActive = state.military.event_flags?.coha_active === true;
    const hasAttackOrder = (brigadeId: FormationId): boolean => {
        const target = attackOrders[brigadeId];
        return typeof target === 'string' && target.length > 0;
    };
    const isMoving = (brigadeId: FormationId): boolean => {
        const destination = movementOrders[brigadeId]?.destination_sids?.[0];
        if (typeof destination === 'string' && destination.length > 0) return true;
        return movementState[brigadeId]?.status === 'in_transit';
    };

    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const cmd = corpsCommand[corpsId];
        if (!cmd || cmd.active_operations.length === 0) continue;
        const faction = state.military.formations?.[corpsId]?.faction;
        if (faction === undefined || !factionSet.has(faction)) continue;
        if (isCorpsBoundByOct1995Ceasefire(state, corpsId)) continue;
        for (const op of [...cmd.active_operations]) {
            if (op.type !== 'sector_attack' && op.type !== 'probe') continue;
            if (op.phase !== 'execution' || op.phase_started_turn !== turn) continue;
            const planningStartedTurn = op.planning_phase_started_turn;
            if (typeof planningStartedTurn !== 'number') continue;
            if (op.was_force_launched === true || op.preparation_probe_link !== undefined) continue;
            if (cohaActive && !isVlasicCohaExceptionOperation(state, corpsId, op, turn)) continue;
            const axes = op.axes ?? [];
            if (axes.length > 0 && axes.every((axis) => axis.late_phase?.phase === 'holding')) continue;

            const participants = new Set<FormationId>(op.participating_brigades);
            for (const axis of axes) {
                for (const brigadeId of axis.assigned_brigades) participants.add(brigadeId);
            }
            const sortedParticipants = Array.from(participants).sort(strictCompare);
            if (sortedParticipants.some((brigadeId) => hasAttackOrder(brigadeId) || isMoving(brigadeId))) continue;

            const operationId = `${corpsId}:${op.name}:t${op.started_turn}`;
            const demotions = (op.launch_demotion_count ?? 0) + 1;
            op.launch_demotion_count = demotions;
            if (demotions >= 2) {
                for (const axis of axes) {
                    if (axis.status === 'executing') axis.launch_blocker = 'zero_eligible_axis';
                }
                beginRecovery(op, turn, 'zero_eligible_axis', state, corpsId);
                report.ended.push(operationId);
                continue;
            }

            op.phase = 'planning';
            op.phase_started_turn = planningStartedTurn;
            delete op.planning_phase_started_turn;
            // Undo the one launch write that would otherwise drift: the late-phase hold clock
            // is set "exactly once" at launch and would start a week early on re-launch.
            for (const axis of axes) {
                const gate = axis.late_phase;
                if (gate && gate.phase === 'holding' && gate.hold_started_turn === turn) {
                    delete gate.hold_started_turn;
                }
            }
            if (op.sector_id) {
                if (!Array.isArray(state.military.opsec_sectors)) state.military.opsec_sectors = [];
                if (!state.military.opsec_sectors.includes(op.sector_id)) {
                    state.military.opsec_sectors.push(op.sector_id);
                }
            }
            report.demoted.push(operationId);
        }
    }
    return report;
}

/**
 * Never-ending-op exit (P3 brief 13, ruling 1): post-emission silence streak.
 *
 * The no-attack exit used to fire only while an operation's lifetime attack count was 0, so an
 * operation that attacked early and then went silent sat in execution until max_failures (its
 * participants kept attack posture, which resets the idle streak, but drew no orders). This pass
 * reads the same turn's emission output, after `confirmLaunchedOperationOrders`, and keeps
 * `silent_execution_turn_streak` on each executing sector attack or probe:
 *  - +1 when no participant (operation roster plus every axis's assigned brigades) holds an
 *    attack order and none has a move in flight (movement order, or column packing, in transit
 *    or unpacking). Attack posture without an order is not an order.
 *  - deleted when any participant attacks or moves, when every axis is in a late-phase hold
 *    (silence is their order), and on every operation not in execution.
 * Frozen (no change): factions this pass did not emit bot orders for (a manual player's
 * operation is never judged by bot silence), corps bound by the October 1995 ceasefire, and
 * COHA-paused operations (except the Vlašić exception).
 * The exit itself is in `advanceSectorOffensives`, beside the lifetime-0 exit, through the same
 * `beginRecovery(..., getNoAttemptRecoveryReason(op))`. The field is absent whenever it is 0.
 * Deterministic: corps in strictCompare order, operations in array order; no tuned number.
 */
export function recordExecutionOrderSilence(
    state: GameState,
    factions: readonly FactionId[],
): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand || factions.length === 0) return;
    const turn = state.meta?.turn ?? 0;
    const factionSet = new Set<FactionId>(factions);
    const attackOrders = state.military.brigade_attack_orders ?? {};
    const movementOrders = state.military.brigade_movement_orders ?? {};
    const movementState = state.military.brigade_movement_state ?? {};
    const cohaActive = state.military.event_flags?.coha_active === true;
    const isActive = (brigadeId: FormationId): boolean => {
        const target = attackOrders[brigadeId];
        if (typeof target === 'string' && target.length > 0) return true;
        const destination = movementOrders[brigadeId]?.destination_sids?.[0];
        if (typeof destination === 'string' && destination.length > 0) return true;
        const status = movementState[brigadeId]?.status;
        return status === 'packing' || status === 'in_transit' || status === 'unpacking';
    };

    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const cmd = corpsCommand[corpsId];
        if (!cmd || cmd.active_operations.length === 0) continue;
        const faction = state.military.formations?.[corpsId]?.faction;
        if (faction === undefined || !factionSet.has(faction)) continue;
        if (isCorpsBoundByOct1995Ceasefire(state, corpsId)) continue;
        for (const op of cmd.active_operations) {
            if (op.phase !== 'execution' || (op.type !== 'sector_attack' && op.type !== 'probe')) {
                if (op.silent_execution_turn_streak !== undefined) delete op.silent_execution_turn_streak;
                continue;
            }
            if (cohaActive && !isVlasicCohaExceptionOperation(state, corpsId, op, turn)) continue;
            const axes = op.axes ?? [];
            const participants = new Set<FormationId>(op.participating_brigades);
            for (const axis of axes) {
                for (const brigadeId of axis.assigned_brigades) participants.add(brigadeId);
            }
            const allHolding = axes.length > 0 && axes.every((axis) => axis.late_phase?.phase === 'holding');
            if (allHolding || Array.from(participants).sort(strictCompare).some(isActive)) {
                if (op.silent_execution_turn_streak !== undefined) delete op.silent_execution_turn_streak;
                continue;
            }
            op.silent_execution_turn_streak = (op.silent_execution_turn_streak ?? 0) + 1;
        }
    }
}

function findLiveLinkedPreparationProbe(
    cmd: CorpsCommandState,
    parent: CorpsOperation,
): CorpsOperation | null {
    if (parent.preparation_probe_delivery !== 'subordinate') return null;
    return cmd.active_operations.find((candidate) => {
        const link = candidate.preparation_probe_link;
        return link !== undefined
            && link.parent_operation_name === parent.name
            && link.parent_started_turn === parent.started_turn
            && parent.active_probe?.started_turn === link.request_started_turn
            && parent.active_probe.target_osid === link.target_osid;
    }) ?? null;
}

type SanaPlanningTracePhase = 'pre' | 'post';

/**
 * Observation-only boundary receipt for the owner-authorized Sana diagnosis.
 *
 * The gate is deliberately the first operation: when the trace is off this
 * function must not inspect graph, sector, formation, or movement state.
 */
export function emitSanaPlanningTraceReceipt(
    state: GameState,
    corpsId: FormationId,
    op: CorpsOperation,
    faction: FactionId,
    staticAdjacency: Map<string, string[]> | undefined,
    phase: SanaPlanningTracePhase,
    verdict?: 'completed' | 'valid' | 'invalidated',
): void {
    const turn = state.meta?.turn ?? 0;
    if (
        process.env.AWWV_SANA_PLANNING_TRACE !== '1'
        || op.name !== 'Operation Sana'
        || corpsId !== 'arbih_5th_corps'
        || turn < 175
        || turn > 177
    ) return;

    const axisObjectives = (op.axes ?? []).map((axis) => ({
        axis_id: axis.axis_id,
        objectives: [...axis.objectives],
        staging_osid: axis.staging_osid ?? null,
    })).sort((a, b) => strictCompare(a.axis_id, b.axis_id));
    const tracedAxis = op.axes?.find((axis) => axis.axis_id === 'sana_sanski_most_kljuc') ?? op.axes?.[0];
    const objectives = [...(tracedAxis?.objectives ?? op.objectives ?? [])];
    const objectiveFacts = objectives.map((objective) => {
        const approaches = [...collectObjectiveApproachOsids(state, corpsId, faction, [objective], staticAdjacency)]
            .sort(strictCompare);
        return {
            objective,
            effective_controller: getPoliticalControllerOSID(state, objective, undefined) ?? null,
            approaches,
        };
    });
    const objectiveSet = new Set(objectives);
    const approachSet = new Set(objectiveFacts.flatMap((fact) => fact.approaches));
    const liveFrontEdges = (state.military.war_front_edges_osid ?? [])
        .filter((edge) => objectiveSet.has(edge.a) || objectiveSet.has(edge.b) || approachSet.has(edge.a) || approachSet.has(edge.b))
        .map((edge) => ({
            edge_id: edge.edge_id,
            a: edge.a,
            b: edge.b,
            side_a: edge.side_a,
            side_b: edge.side_b,
        }))
        .sort((a, b) => strictCompare(a.edge_id, b.edge_id));
    const staticGraphEdges = objectives.flatMap((objective) =>
        [...(staticAdjacency?.get(objective) ?? [])].sort(strictCompare).map((neighbor) => ({
            objective,
            neighbor,
            objective_controller: getPoliticalControllerOSID(state, objective, undefined) ?? null,
            neighbor_controller: getPoliticalControllerOSID(state, neighbor, undefined) ?? null,
        })))
        .sort((a, b) => strictCompare(`${a.objective}:${a.neighbor}`, `${b.objective}:${b.neighbor}`));
    const relevantSubsegments = Object.values(state.military.corps_front_sectors ?? {})
        .filter((sector) => sector.corps_id === corpsId)
        .flatMap((sector) => (sector.sub_segments ?? [])
            .filter((subSegment) => subSegment.enemy_osids.some((osid) => objectiveSet.has(osid)))
            .map((subSegment) => ({
                sector_id: sector.sector_id,
                sub_segment_id: subSegment.sub_segment_id,
                edge_ids: [...subSegment.edge_ids].sort(strictCompare),
                friendly_osids: [...subSegment.friendly_osids].sort(strictCompare),
                enemy_osids: [...subSegment.enemy_osids].sort(strictCompare),
            })))
        .sort((a, b) => strictCompare(a.sub_segment_id, b.sub_segment_id));
    const tracedBrigades = ['arbih_506th_mountain', 'arbih_517th_light'].map((brigadeId) => {
        const brigade = state.military.formations?.[brigadeId];
        return {
            brigade_id: brigadeId,
            location_osid: brigade?.location_osid ?? null,
            movement_state: state.military.brigade_movement_state?.[brigadeId] ?? null,
            movement_order: state.military.brigade_movement_orders?.[brigadeId] ?? null,
        };
    });
    const receipt = {
        trace: 'sana_planning_boundary',
        phase,
        turn,
        corps_id: corpsId,
        operation: op.name,
        axis_objectives: axisObjectives,
        objectives,
        objective_facts: objectiveFacts,
        live_front_edges: liveFrontEdges,
        static_graph_edges: staticGraphEdges,
        corps_front_subsegments: relevantSubsegments,
        operation_staging_osid: op.staging_osid ?? null,
        preserve_objective_sequence: op.preserve_objective_sequence === true,
        brigades: tracedBrigades,
        ...(phase === 'post' ? {
            resulting_objectives: [...(tracedAxis?.objectives ?? op.objectives ?? [])],
            verdict,
        } : {}),
    };
    console.log(JSON.stringify(receipt));
}

export function reconcilePlanningObjectives(
    state: GameState,
    corpsId: FormationId,
    op: CorpsOperation,
    faction: FactionId,
    staticAdjacency?: Map<string, string[]>,
): 'completed' | 'valid' | 'invalidated' {
    if (isMultiAxis(op) && op.axes) {
        const candidates: Array<{
            axis: OperationAxis;
            objectives: string[];
        }> = [];
        for (const axis of op.axes) {
            // PRIM-A3: the same pure launch view the preparation estimate reads.
            const view = launchAxisObjectiveView(state, corpsId, faction, op, axis, staticAdjacency);
            if (view === null) continue;
            const filteredObjectives = [...view.objectives];
            axis.objectives = filteredObjectives;
            axis.current_objective_index = view.currentIndex;
            candidates.push({
                axis,
                objectives: filteredObjectives,
            });
        }
        if (candidates.length === 0) {
            return (op.objectives ?? []).length > 0 ? 'completed' : 'invalidated';
        }
        op.axes = candidates.map((candidate) => candidate.axis);
        op.objectives = [...new Set(candidates.flatMap((candidate) => candidate.objectives))].sort(strictCompare);
    } else {
        const enemyObjectives = (op.objectives ?? []).filter((osid) => {
                const controller = getPoliticalControllerOSID(state, osid, undefined);
                return isOperationObjectiveForeignControlled(faction, controller);
            });
        const filteredObjectives = op.preserve_objective_sequence === true
            ? enemyObjectives
            : pruneUnreachablePlanningObjectivePrefix(
                state,
                corpsId,
                faction,
                enemyObjectives,
                staticAdjacency,
            );
        if (filteredObjectives.length === 0) {
            return (op.objectives ?? []).length > 0 ? 'completed' : 'invalidated';
        }
        op.objectives = filteredObjectives;
        op.current_objective_index = Math.min(op.current_objective_index ?? 0, filteredObjectives.length - 1);
    }

    const approachOsids = collectObjectiveApproachOsids(state, corpsId, faction, getAllAxisObjectives(op), staticAdjacency);
    return approachOsids.size > 0 ? 'valid' : 'invalidated';
}

function getRecoveryDuration(op: CorpsOperation): number {
    const objectiveCount = op.objectives?.length ?? 2;
    switch (op.recovery_reason) {
        case 'no_logged_attempt':
        case 'manual_termination':
        case 'ceasefire':
        case 'probe_complete':
        case 'brigade_attrition':
        case 'political_blocked':
        case 'planning_invalidated':
        case 'no_launch_readiness':
        case 'defender_power_too_high':
        case 'participants_below_attack_floor':
        case 'participants_below_assembly_floor':
        case 'no_approach_osid':
        case 'zero_eligible_axis':
        case 'tg_cohesion_exhausted':
        case 'tg_max_lifecycle':
            return 1;
        case 'completed':
            return Math.max(1, Math.ceil(objectiveCount / 2));
        case 'max_failures':
        case 'orphaned_sector':
        default:
            return Math.max(2, Math.ceil(objectiveCount / 2));
    }
}

function getNoAttemptRecoveryReason(op: CorpsOperation): CorpsOperation['recovery_reason'] {
    if (op.type === 'probe') {
        return 'planning_invalidated';
    }
    if (isMultiAxis(op)) {
        return sumAxesField(op.axes!, 'attack_attempt_count') > 0 ? 'max_failures' : 'no_logged_attempt';
    }
    return (op.attack_attempt_count ?? 0) > 0 ? 'max_failures' : 'no_logged_attempt';
}

function getTotalObjectiveCount(op: CorpsOperation): number {
    const axes = op.axes;
    if (Array.isArray(axes) && axes.length > 0) {
        return axes.reduce((count, axis) => count + axis.objectives.length, 0);
    }
    return op.objectives?.length ?? 0;
}

function hasCapturedAllObjectives(op: CorpsOperation): boolean {
    const totalObjectives = getTotalObjectiveCount(op);
    if (totalObjectives <= 0) return false;
    return (op.objective_capture_count ?? 0) >= totalObjectives;
}

function getCompletedObjectiveRecoveryReason(op: CorpsOperation): CorpsOperation['recovery_reason'] {
    if (op.type === 'probe') {
        if (hasCapturedAllObjectives(op)) return 'completed';
        return getNoAttemptRecoveryReason(op) === 'no_logged_attempt' ? 'no_logged_attempt' : 'probe_complete';
    }
    if (hasCapturedAllObjectives(op)) return 'completed';
    return getNoAttemptRecoveryReason(op);
}

/**
 * FARZ-END (§26, lane C s22 seats): the capture predicate read in reverse. An objective is lost
 * only when its controller is known and is neither `faction` nor friendly to it, so a null
 * controller or ground held by an ally never counts (same test as capture credit in the result
 * passes, `updateMultiAxisResults` and `updateLegacyFlatResults`; no reverse map).
 */
function isCreditedObjectiveLost(state: GameState, osid: string, faction: FactionId): boolean {
    const controller = getPoliticalControllerOSID(state, osid, undefined);
    if (controller == null) return false;
    return controller !== faction && !isFriendlyFactionCtrl(controller, faction, state);
}

/** Earliest objective below `currentIndex` that is lost, or null. */
function findEarliestLostCreditedObjective(
    state: GameState,
    objectives: readonly string[],
    currentIndex: number,
    faction: FactionId,
): { index: number; objective: string } | null {
    const credited = Math.min(currentIndex, objectives.length);
    for (let index = 0; index < credited; index += 1) {
        const objective = objectives[index];
        if (objective !== undefined && isCreditedObjectiveLost(state, objective, faction)) return { index, objective };
    }
    return null;
}

/**
 * FARZ-END (§26, lane C s22 seats): the single owner of "is this operation finished?" for a
 * sector attack whose capture counter is full. The counter alone says every objective was taken
 * once; this also asks whether each one is still held.
 *
 * Returns `'reopened'` or the recovery reason to record. Only a `sector_attack` with a full counter
 * and no `preparation_probe_link` can reopen; every other operation gets
 * `getCompletedObjectiveRecoveryReason(op)` unchanged. A full counter means no objective was
 * skipped under MAX_CONSECUTIVE_FAILURES_ON_CURRENT, so every objective behind the index was
 * credited by this operation.
 *
 * Every `complete` axis (array order) with a lost objective is a candidate at its own earliest
 * lost index k. Stalled axes, and axes whose `late_phase` is holding or terminal, never reopen.
 * Refused (no reopen) when: the October 1995 ceasefire binds the corps; offensive operations are
 * suppressed; COHA pauses the operation; every candidate objective is politically blocked; the
 * corps' live slots, this operation counted, exceed `getMaxOperationSlots`; or another live
 * non-probe operation exists (the commander's major-operation rule). A candidate axis is also
 * refused when booking the reopen would reach its failure cap (spent), or when, after dropping
 * brigades that are inactive or now in another live operation, none is above the attack floor.
 *
 * On reopen each reopened axis goes back to `executing` at k with `objective_capture_count =
 * min(count, k)`; the result pass re-credits the objectives it re-walks, so nothing is credited
 * twice. Each reopen books one failure (`failure_count` and `consecutive_failures_on_current` on
 * the axis; `failure_count` on a flat operation), so the existing caps end a capture-loss loop.
 * An operation in recovery returns to execution; `started_turn` is kept, so the AAR id is kept.
 * No axis reset, no TG formation, no late-phase hold restart.
 * A refused candidate axis is stalled (so `recordFailedObjectives` books it) and its counter is
 * truncated the same way, so a later completion check cannot count the lost objective.
 *
 * Reads control only through `getPoliticalControllerOSID`; never AAR telemetry or `weekly_log`.
 * Deterministic: axes in array order, objectives in index order.
 */
function resolveCompletionOrReopen(
    state: GameState,
    corpsId: FormationId,
    op: CorpsOperation,
    faction: FactionId,
    turn: number,
): 'reopened' | CorpsOperation['recovery_reason'] {
    const completedReason = getCompletedObjectiveRecoveryReason(op);
    if (op.type !== 'sector_attack' || op.preparation_probe_link || completedReason !== 'completed') {
        return completedReason;
    }

    const axes = op.axes ?? [];
    const candidates: Array<{ axis?: OperationAxis; index: number; objective: string }> = [];
    if (axes.length > 0) {
        for (const axis of axes) {
            if (axis.status !== 'complete') continue;
            if (axis.late_phase && (axis.late_phase.phase === 'holding' || axis.late_phase.terminal_reason !== undefined)) continue;
            if ((axis.objective_capture_count ?? 0) < axis.objectives.length) continue;
            const lost = findEarliestLostCreditedObjective(state, axis.objectives, axis.current_objective_index ?? 0, faction);
            if (lost) candidates.push({ axis, ...lost });
        }
    } else {
        const lost = findEarliestLostCreditedObjective(state, op.objectives ?? [], op.current_objective_index ?? 0, faction);
        if (lost) candidates.push(lost);
    }
    if (candidates.length === 0) return 'completed';

    const otherLiveOperations = (state.military.corps_command?.[corpsId]?.active_operations ?? [])
        .filter((other) => other !== op && other.phase !== 'recovery');
    // Each closed gate refuses with its own existing reason (s23 ops seat, amendment 1), so a
    // ceasefire or political refusal books no failed objective and no defeatism count.
    const operationGate: 'ceasefire' | 'offensive_ops_suppressed' | 'political_blocked' | 'no_attempt' | null =
        isCorpsBoundByOct1995Ceasefire(state, corpsId) ? 'ceasefire'
        : isFactionOffensiveOpsSuppressed(state, faction, turn) ? 'offensive_ops_suppressed'
        : (state.military.event_flags?.coha_active === true
            && !isVlasicCohaExceptionOperation(state, corpsId, op, turn)) ? 'political_blocked'
        : (getOperationSlotUsageForOperations([...otherLiveOperations, op])
            > getMaxOperationSlots(getCorpsSubordinates(state, corpsId).length)
            || otherLiveOperations.some((other) => other.type !== 'probe')) ? 'no_attempt'
        : null;
    const operationGateClosed = operationGate !== null;

    const formations = state.military.formations ?? {};
    const mayStay = (brigadeId: FormationId): boolean => {
        const brigade = formations[brigadeId];
        if (!brigade || brigade.status !== 'active') return false;
        const live = findBrigadeLiveOperationAnywhere(state, brigadeId);
        return live === null || live.op === op;
    };
    const reopening = new Set<(typeof candidates)[number]>();
    let belowAttackFloor = 0;
    let politicallyBlocked = 0;
    if (!operationGateClosed) {
        for (const candidate of candidates) {
            // Per candidate: a blocked axis that reopened would idle in execution (its attack
            // count is above 0, so the idle stall never fires). Refused means stalled.
            if (isObjectivePoliticallyBlocked(state, corpsId, faction, candidate.objective)) {
                politicallyBlocked += 1;
                continue;
            }
            const failures = candidate.axis ? candidate.axis.failure_count : (op.failure_count ?? 0);
            const failureCap = !candidate.axis
                ? MAX_TOTAL_FAILURES
                : axes.length === 1 ? MAX_TOTAL_FAILURES_SINGLE_AXIS : MAX_TOTAL_FAILURES;
            if (failures + 1 >= failureCap) continue;
            const brigades = (candidate.axis ? candidate.axis.assigned_brigades : op.participating_brigades)
                .filter(mayStay);
            if (!hasEligibleAttackersForLaunch(formations, brigades)) {
                belowAttackFloor += 1;
                continue;
            }
            reopening.add(candidate);
        }
    }

    for (const candidate of candidates) {
        if (candidate.axis) {
            candidate.axis.objective_capture_count = Math.min(candidate.axis.objective_capture_count, candidate.index);
            if (!reopening.has(candidate)) candidate.axis.status = 'stalled';
        } else {
            op.objective_capture_count = Math.min(op.objective_capture_count ?? 0, candidate.index);
        }
    }
    if (axes.length > 0) op.objective_capture_count = sumAxesField(axes, 'objective_capture_count');

    if (reopening.size === 0) {
        if (operationGate !== null && operationGate !== 'no_attempt') return operationGate;
        if (operationGate === null && politicallyBlocked === candidates.length) return 'political_blocked';
        if (operationGate === null && belowAttackFloor === candidates.length) return 'participants_below_attack_floor';
        return getNoAttemptRecoveryReason(op);
    }

    // Momentum is reset on reopen, as at launch (s23 ops seat, amendment 2): the retake attack
    // must not run on momentum earned weeks earlier. Re-walked objectives then earn it again.
    for (const candidate of reopening) {
        if (candidate.axis) {
            candidate.axis.status = 'executing';
            candidate.axis.current_objective_index = candidate.index;
            candidate.axis.failure_count += 1;
            candidate.axis.consecutive_failures_on_current += 1;
            candidate.axis.momentum = 0;
        } else {
            op.current_objective_index = candidate.index;
            op.failure_count = (op.failure_count ?? 0) + 1;
            op.momentum = 0;
        }
    }
    op.participating_brigades = op.participating_brigades.filter(mayStay);
    for (const axis of op.axes ?? []) axis.assigned_brigades = axis.assigned_brigades.filter(mayStay);

    if (op.phase === 'recovery') {
        op.phase = 'execution';
        op.phase_started_turn = turn;
        op.recovery_reason = undefined;
        delete op.planning_phase_started_turn;
        markOperationExecuting(state, corpsId, op);
        const armyHqOperation = resolveArmyHqOperation(state, corpsId, op);
        if (armyHqOperation) delete armyHqOperation.operation.recovery_started_turn;
    }
    return 'reopened';
}

function getMultiAxisRecoveryDuration(op: CorpsOperation): number {
    let maxLen = 0;
    for (const axis of op.axes ?? []) {
        if (axis.objectives.length > maxLen) maxLen = axis.objectives.length;
    }
    switch (op.recovery_reason) {
        case 'no_logged_attempt':
        case 'manual_termination':
        case 'ceasefire':
        case 'probe_complete':
        case 'political_blocked':
        case 'planning_invalidated':
        case 'no_launch_readiness':
        case 'defender_power_too_high':
        case 'participants_below_attack_floor':
        case 'participants_below_assembly_floor':
        case 'no_approach_osid':
        case 'zero_eligible_axis':
        case 'tg_cohesion_exhausted':
        case 'tg_max_lifecycle':
            return 1;
        case 'completed':
            return Math.max(1, Math.ceil(maxLen / 2));
        case 'max_failures':
        case 'orphaned_sector':
        default:
            return Math.max(2, Math.ceil(maxLen / 2));
    }
}

function applyCohesionDelta(state: GameState, brigadeIds: FormationId[], delta: number): void {
    for (const brigadeId of [...brigadeIds].sort(strictCompare)) {
        const brigade = state.military.formations?.[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        const next = Math.max(0, Math.min(100, (brigade.cohesion ?? 100) + delta));
        brigade.cohesion = Math.round(next * 10) / 10;
    }
}

// applyArtilleryPreparation retired 2026-11-17 (Fable consult 6): it spent BOMBARDMENT_PREP_COST from the
// heavy-munitions reserve and returned without effect whenever that reserve was absent, which it always
// was with the supply-reserve economy off. The player's artillery_preparation flag is still recorded on
// the operation but has never had an effect in a reserves-off game.

function fullyRevealProbeSectorIntel(state: GameState, operation: CorpsOperation): void {
    if (operation.type !== 'probe' || !operation.sector_id || !state.military.sector_intel?.[operation.sector_id]) return;
    for (const record of state.military.sector_intel[operation.sector_id]) {
        record.confidence = 1;
    }
}

export function resolveOperationSectorId(
    state: GameState,
    corpsId: FormationId,
    objectives: string[],
    participatingBrigadeIds: readonly FormationId[] = [],
    stagingOsid?: string,
): string | null {
    if (!state.military.corps_front_sectors || objectives.length === 0) return null;
    const objectiveSet = new Set(objectives);
    let bestSectorId: string | null = null;
    let bestOverlap = 0;
    let bestParticipantCount = -1;
    let bestContainsStaging = false;
    const sectors = Object.values(state.military.corps_front_sectors)
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (const sector of sectors) {
        if (sector.corps_id !== corpsId) continue;
        let overlap = 0;
        const friendlyOsids = new Set<string>(sector.territory_osids ?? []);
        for (const ss of sector.sub_segments ?? []) {
            for (const friendlyOsid of ss.friendly_osids ?? []) friendlyOsids.add(friendlyOsid);
            for (const eo of ss.enemy_osids) {
                if (objectiveSet.has(eo)) overlap += 1;
            }
        }
        if (overlap <= 0) continue;
        const containsStaging = typeof stagingOsid === 'string' && friendlyOsids.has(stagingOsid);
        let participantCount = 0;
        for (const brigadeId of participatingBrigadeIds) {
            const location = state.military.formations?.[brigadeId]?.location_osid;
            if (location && friendlyOsids.has(location)) participantCount += 1;
        }
        if (
            (containsStaging && !bestContainsStaging)
            || (containsStaging === bestContainsStaging && participantCount > bestParticipantCount)
            || (
                containsStaging === bestContainsStaging
                && participantCount === bestParticipantCount
                && overlap > bestOverlap
            )
        ) {
            bestOverlap = overlap;
            bestParticipantCount = participantCount;
            bestContainsStaging = containsStaging;
            bestSectorId = sector.sector_id;
        }
    }
    return bestSectorId;
}


// ═══════════════════════════════════════════════════════════════════════════
// Advance sector offensives (phase transitions, validation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Advance all sector offensives: manage phase transitions, supply readiness, sector validation.
 * Called after generate-bot-corps-orders, before generate-bot-brigade-orders.
 *
 * Supports both multi-axis (op.axes[]) and legacy flat-field operations.
 */
export function advanceSectorOffensives(
    state: GameState,
    supplyByOsid?: SupplyStateByOsidReport | null,
    terrainMultByOsid?: Record<string, number>, // LANE-2026-05-02
    staticAdjacency?: Map<string, string[]>,
    openingAttackPredictionContext?: OpeningAttackPredictionContext,
    completedParticipantIds?: Set<FormationId>,
): PreparationEvent[] {
    const prepEvents: PreparationEvent[] = [];
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return prepEvents;

    const observedTurn = state.meta?.turn ?? 0;
    const observedCorpsId = 'hvo_tomislavgrad' as FormationId;
    const observedFaction = state.military.formations?.[observedCorpsId]?.faction;
    const observedCommand = corpsCommand[observedCorpsId];
    const observedOperations = isSouthernMovePreparationPassSelected(observedFaction, observedCorpsId, observedTurn)
        ? (observedCommand?.active_operations ?? []).map((operation, operationIndex) => ({
            operation,
            operationIndex,
            operationStartedTurn: operation.started_turn,
            operationPhaseStartedTurn: operation.phase_started_turn,
        }))
            .filter(({ operation }) => operation.name === 'Operation Southern Move')
        : undefined;
    const observedOutcomes: Map<CorpsOperation, 'not_reached' | 'tick_called'> | undefined = observedOperations === undefined
        ? undefined
        : new Map(observedOperations.map(({ operation }) => [operation, 'not_reached'] as const));
    const observedInventory = (entries: typeof observedOperations) => (entries ?? []).map(({
        operation, operationIndex, operationStartedTurn, operationPhaseStartedTurn,
    }) => ({
        operation_index: operationIndex,
        operation_name: operation.name,
        operation_started_turn: operationStartedTurn,
        operation_phase_started_turn: operationPhaseStartedTurn,
        operation_phase: operation.phase,
        operation_type: operation.type,
        sector_id: operation.sector_id,
    }));
    if (observedOperations !== undefined) {
        emitSouthernMovePreparationPassRecord(observedFaction, observedCorpsId, observedTurn, () => ({
            event: 'caller_start', turn: observedTurn, corps_id: observedCorpsId, faction: observedFaction,
            eligible_count: observedOperations.length, operation_inventory: observedInventory(observedOperations),
        }));
    }

    try {

    // ── Per-turn corps exhaustion decay ────────────────────────────────────
    // Corps recover from operational exhaustion each turn. Without decay,
    // corps permanently exhaust after 2 operations and the war stalls.
    const allCorpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const cid of allCorpsIds) {
        const cmd = corpsCommand[cid];
        if (!cmd || cmd.corps_exhaustion <= 0) continue;
        // Faster recovery when idle, slower when operating. PROBE-LOCK (ruling §35, Fable consult 11
        // appendix A): a one-brigade fallback probe (`probe` without `preparation_probe_link`) is not
        // operating for the decay. Before, a corps refused a plan for exhaustion probed instead, and
        // the probe held it at the active rate, so it never got back under the plan threshold.
        // A preparation probe sits beside its parent operation, so that corps stays active.
        const probeOnly = cmd.active_operations.length > 0
            && cmd.active_operations.every((o) => o.type === 'probe' && !o.preparation_probe_link);
        const active = cmd.active_operations.length > 0 && !probeOnly;
        const decayRate = active ? EXHAUSTION_DECAY_ACTIVE : EXHAUSTION_DECAY_IDLE;
        const exhBefore = cmd.corps_exhaustion;
        cmd.corps_exhaustion = Math.max(0, Math.round((cmd.corps_exhaustion - decayRate) * 10) / 10);
        emitCorpsExhaustionRecord(() => ({
            turn: state.meta?.turn ?? null, corps_id: cid,
            source: active ? 'decay_active' : 'decay_idle',
            ...(probeOnly ? { probe_only: true } : {}),
            before: exhBefore, after: cmd.corps_exhaustion,
        }));
    }

    // The Carter/COHA period suspends combat rather than consuming operation
    // preparation or execution time. Shift automatic phase clocks one week on
    // each paused tick so elapsed-duration gates resume where they stopped.
    if (state.military.event_flags?.coha_active === true) {
        const turn = state.meta?.turn ?? 0;
        for (const corpsId of allCorpsIds) {
            const cmd = corpsCommand[corpsId];
            if (!cmd) continue;
            for (const operation of cmd.active_operations) {
                if (isVlasicCohaExceptionOperation(state, corpsId, operation, turn)) continue;
                if (
                    (operation.phase === 'planning' || operation.phase === 'execution') &&
                    operation.phase_started_turn < turn
                ) {
                    operation.phase_started_turn += 1;
                }
                if (
                    operation.active_probe &&
                    operation.active_probe.started_turn < turn
                ) {
                    operation.active_probe.started_turn += 1;
                }
            }
        }
        // The exception operation continues through the normal lifecycle below;
        // every other operation has already had its clock paused above.
    }

    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        if (!cmd || cmd.active_operations.length === 0) continue;

        for (const [operationIndex, op] of [...cmd.active_operations].entries()) {
        if (op.type !== 'sector_attack' && op.type !== 'feint' && op.type !== 'probe') continue;
        if (state.military.event_flags?.coha_active === true
            && !isVlasicCohaExceptionOperation(state, corpsId, op, state.meta?.turn ?? 0)) continue;

        const operationName = op.name;
        op.participating_brigades = op.participating_brigades.filter((brigadeId) =>
            mayEliteJoinOperation(brigadeId, state.meta.turn, operationName, op.started_turn));
        if (Array.isArray(op.axes)) {
            const participantSet = new Set(op.participating_brigades);
            for (const axis of op.axes) {
                axis.assigned_brigades = axis.assigned_brigades.filter((brigadeId) =>
                    participantSet.has(brigadeId)
                    && mayEliteJoinOperation(brigadeId, state.meta.turn, operationName, op.started_turn));
            }
        }
        if (op.active_probe) {
            const linkedChild = findLiveLinkedPreparationProbe(cmd, op);
            if (!linkedChild) {
                const participantSet = new Set(op.participating_brigades);
                op.active_probe.brigade_ids = op.active_probe.brigade_ids.filter((brigadeId) =>
                    participantSet.has(brigadeId)
                    && mayEliteJoinOperation(brigadeId, state.meta.turn, operationName, op.started_turn));
                if (op.active_probe.brigade_ids.length === 0) delete op.active_probe;
            }
        }

        // Reset per-turn combat feedback counters
        op.battles_this_turn = 0;
        op.objective_battles_this_turn = 0;
        op.territory_gained_this_turn = 0;
        if (Array.isArray(op.axes)) {
            for (const axis of op.axes) {
                axis.battles_this_turn = 0;
                axis.objective_battles_this_turn = 0;
            }
        }

        const turn = state.meta?.turn ?? 0;
        const corps = state.military.formations?.[corpsId];
        const faction: FactionId = corps?.faction ?? 'RS';
        const multiAxis = isMultiAxis(op);
        const operationStaticAdjacency = op.is_pre_planned === true ? staticAdjacency : undefined;

        const fullObjectives = multiAxis ? getAllAxisObjectives(op) : (op.objectives ?? []);
        const allObjectives = getPreparationObjectiveView(op, fullObjectives);
        const allBrigades = multiAxis ? getAllAxisBrigades(op) : op.participating_brigades;

        const resolvedSectorId = resolveOperationSectorId(
            state,
            corpsId,
            allObjectives,
            allBrigades,
            op.staging_osid,
        );
        if (resolvedSectorId) {
            op.sector_id = resolvedSectorId;
        }

        // Validate sector still exists
        if (op.sector_id && state.military.corps_front_sectors) {
            if (!state.military.corps_front_sectors[op.sector_id]) {
                if (op.phase !== 'recovery') {
                    const anyAttempts = multiAxis
                        ? sumAxesField(op.axes!, 'attack_attempt_count') > 0
                        : (op.attack_attempt_count ?? 0) > 0;
                    beginRecovery(op, turn, anyAttempts ? 'orphaned_sector' : getNoAttemptRecoveryReason(op), state);
                    continue;
                }
            }
        }

        // Recompute supply readiness
        // Supply readiness is fixed at 1.0 since the supply-reserve economy was retired (2026-11-17).
        op.supply_readiness = 1.0;

        if (op.recovery_reason === 'manual_termination' && op.phase !== 'recovery') {
            beginRecovery(op, turn, 'manual_termination', state);
            continue;
        }

        if (op.phase === 'planning') {
            // Ensure OPSEC marking during planning — enables passive intel
            // buildup reduction (sector_intel.ts) and cohesion penalty (cohesion_drift.ts)
            if (op.sector_id) {
                if (!Array.isArray(state.military.opsec_sectors)) {
                    state.military.opsec_sectors = [];
                }
                if (!state.military.opsec_sectors.includes(op.sector_id)) {
                    state.military.opsec_sectors.push(op.sector_id);
                }
            }

            if (op.type === 'probe') {
                op.planning_duration = 1;
                op.participating_brigades = [...(op.participating_brigades ?? [])].sort(strictCompare).slice(0, 2);
            }

            // ── Preparation sub-phase state machine (sector_attack only) ──
            // Probes and feints skip preparation — they are too small/fast.
            // force_launch bypasses preparation entirely (player override).
            // RS blitz phase (w0-12): pre-planned JNA-style ops skip preparation.
            const earlyElapsed = turn - op.phase_started_turn;
            const earlyPlanDuration = op.planning_duration
                ?? (multiAxis ? computeMultiAxisPlanningDuration(op.axes!) : 1);
            if (
                op.force_launch !== true &&
                earlyElapsed > earlyPlanDuration + PLANNING_INVALIDATION_GRACE_TURNS
            ) {
                const openingReadiness = evaluateOpeningAttackReadiness(state, corpsId, faction, op, operationStaticAdjacency, openingAttackPredictionContext);
                if (!openingReadiness.executable) {
                    beginRecovery(op, turn, openingReadiness.blocker ?? 'no_launch_readiness', state);
                    continue;
                }
            }

            const activePhase = getActiveDoctrinePhase(faction, turn, state.military.war_timeline);
            const isPrePlannedBlitz = activePhase?.probe_exempt === true;
            if (op.type === 'sector_attack' && op.force_launch !== true && !isPrePlannedBlitz) {
                // Auto-resolve any pending probes that didn't trigger combat
                const activeProbe = op.active_probe;
                const linkedChild = findLiveLinkedPreparationProbe(cmd, op);
                if (linkedChild) {
                    op.preparation_turns_elapsed = (op.preparation_turns_elapsed ?? 0) + 1;
                    continue;
                }
                if (hasUnresolvedProbe(op) && activeProbe && (turn - activeProbe.started_turn) >= 1) {
                    autoResolveProbe(state, op, faction, corpsId, operationIndex);
                }

                // LANE-2026-05-02: thread supplyByOsid + terrainMultByOsid into preparation
                // for honest defender-modifier-aware force-ratio estimation.
                if (observedOutcomes?.has(op)) observedOutcomes.set(op, 'tick_called');
                const prepResult = tickPreparation(state, op, corpsId, faction, op.supply_readiness ?? 1.0, supplyByOsid, terrainMultByOsid, staticAdjacency, operationIndex);

                // Synthesis §3 E-B2: Operation Una negative-control penalty.
                // HV-only thrusts without HVO-native co-deployment historically
                // collapsed in 48 hours (Op. Una, Sept 18-19 1995). When the
                // operation's brigade roster is >80% HV-tagged AND no
                // HVO-native HRHB brigade is present in the corps' sectors,
                // scale the force_ratio_estimate by HV_UNA_NEGATIVE_CONTROL_MULT
                // (effective combat-power cap × 0.65). Symmetric in shape —
                // it just happens that the HV is the only foreign attached
                // source in the current OOB.
                if (
                    typeof prepResult.force_ratio_estimate === 'number'
                    && isHvUnaNegativeControl(state, op, corpsId)
                ) {
                    prepResult.force_ratio_estimate = prepResult.force_ratio_estimate * HV_UNA_NEGATIVE_CONTROL_MULT;
                }

                // Collect preparation event for turn report
                prepEvents.push({
                    corps_id: corpsId,
                    operation_name: op.name,
                    sub_phase: prepResult.sub_phase,
                    intel_confidence: prepResult.intel_confidence,
                    supply_readiness: prepResult.supply_readiness,
                    force_ratio_estimate: prepResult.force_ratio_estimate,
                    commander_assessment: prepResult.assessment,
                    probe_ordered: prepResult.probe_ordered || undefined,
                });

                if (
                    typeof prepResult.force_ratio_estimate === 'number'
                    && prepResult.force_ratio_estimate < launchFloorForOp(op)
                ) {
                    op.force_ratio_estimate = prepResult.force_ratio_estimate;
                    // PRIM-A2 (rulings §25.3): a closed political gate is read before the
                    // estimate, so an operation whose cells are all combat-blocked ends as
                    // political_blocked (no failure cooldown), not defender_power_too_high.
                    beginRecovery(
                        op,
                        turn,
                        hasOnlyPoliticallyBlockedCurrentObjectives(state, corpsId, faction, op)
                            ? 'political_blocked'
                            : 'defender_power_too_high',
                        state,
                    );
                    continue;
                }

                if (prepResult.aborted) {
                    // Commander recommends abort — low exhaustion cost
                    beginRecovery(op, turn, 'manual_termination', state);
                    continue;
                }

                if (!prepResult.ready) {
                    // Preparation still in progress — skip the planning→execution transition
                    continue;
                }
                // Preparation complete (sub_phase === 'ready') — fall through to execution transition
            }

            // ── Loaned brigade arrival tracking ──
            // Check arrivals each planning turn. Extend staging if loans haven't arrived.
            if (op.loaned_brigades && op.loaned_brigades.length > 0) {
                cleanupDissolvedLoans(op, state.military.formations ?? {});
                const targetSector = op.sector_id ? state.military.corps_front_sectors?.[op.sector_id] : undefined;
                if (targetSector) {
                    const arrivalFraction = checkLoanedArrivals(op, state.military.formations ?? {}, targetSector);

                    // During force_staging, block transition if loans haven't arrived
                    if (op.preparation_sub_phase === 'force_staging' && !areLoanedBrigadesReady(arrivalFraction)) {
                        const elapsed = op.preparation_turns_elapsed ?? 0;
                        const maxWait = MAX_OP_LOAN_DISTANCE + LOAN_STAGING_BUFFER_TURNS;
                        if (elapsed < maxWait) {
                            continue; // Keep waiting for arrivals
                        }
                        // Timeout: drop non-arrived loans from participating_brigades
                        for (const loan of op.loaned_brigades) {
                            if (!loan.arrived) {
                                op.participating_brigades = op.participating_brigades.filter(id => id !== loan.brigade_id);
                                if (op.axes) {
                                    for (const axis of op.axes) {
                                        axis.assigned_brigades = axis.assigned_brigades.filter(id => id !== loan.brigade_id);
                                    }
                                }
                            }
                        }
                        op.loaned_brigades = op.loaned_brigades.filter(l => l.arrived);
                    }
                }
            }

            const elapsed = turn - op.phase_started_turn;
            const planDuration = op.planning_duration
                ?? (multiAxis ? computeMultiAxisPlanningDuration(op.axes!) : 1);
            // A foreign-controlled objective can be temporarily or permanently
            // combat-blocked without being completed. Retain it during objective
            // reconciliation, but never consume launch readiness or create a
            // failed-objective cooldown while the political gate is closed.
            // PRIM-A2 (rulings §25.3): this runs before the estimate floor below.
            if (hasOnlyPoliticallyBlockedCurrentObjectives(state, corpsId, faction, op)) {
                beginRecovery(op, turn, 'political_blocked', state);
                continue;
            }
            if (
                op.force_launch !== true
                && typeof op.force_ratio_estimate === 'number'
                && op.force_ratio_estimate < launchFloorForOp(op)
            ) {
                beginRecovery(op, turn, 'defender_power_too_high', state);
                continue;
            }
            emitSanaPlanningTraceReceipt(
                state,
                corpsId,
                op,
                faction,
                operationStaticAdjacency,
                'pre',
            );
            const planningObjectiveState = reconcilePlanningObjectives(state, corpsId, op, faction, operationStaticAdjacency);
            emitSanaPlanningTraceReceipt(
                state,
                corpsId,
                op,
                faction,
                operationStaticAdjacency,
                'post',
                planningObjectiveState,
            );
            if (planningObjectiveState === 'completed') {
                beginRecovery(op, turn, 'completed', state);
                continue;
            }
            if (
                planningObjectiveState === 'invalidated' &&
                elapsed > planDuration + PLANNING_INVALIDATION_GRACE_TURNS
            ) {
                beginRecovery(op, turn, 'planning_invalidated', state);
                continue;
            }
            const stagedEarly = elapsed >= 1 && areParticipantsReadyForExecution(
                state,
                corpsId,
                faction,
                op,
                operationStaticAdjacency,
            );
            const forcedLaunch = op.force_launch === true && elapsed >= 1;

            // Probes are opportunistic recon-by-force, not queued mini-offensives.
            // If the launch window closes and the brigade is still not execution-ready
            // after one full planning turn, invalidate the plan instead of letting it
            // drift into an execution/recovery no-attempt artifact.
            if (op.type === 'probe' && elapsed >= 1 && !stagedEarly && !forcedLaunch) {
                beginRecovery(op, turn, 'no_launch_readiness', state);
                continue;
            }

            if (op.type === 'feint' && elapsed >= FEINT_PLANNING_TURNS) {
                applyCohesionDelta(state, allBrigades, -5);
                // The feint's -0.5 supply cost drew on the supply reserve, retired 2026-11-17 (Fable consult 6).
                beginRecovery(op, turn, 'manual_termination', state);
                continue;
            }

            // For sector_attack with preparation: only reach here when preparation is 'ready'
            // (or force_launch / probe / feint which skip preparation).
            // Keep existing elapsed/staged/forcedLaunch gates for non-preparation ops.
            //
            const preparationReady = op.type === 'sector_attack' && op.preparation_sub_phase === 'ready';
            // planning_duration is the deterministic march/preparation budget, not a
            // mandatory delay after the operation is ready. Preserve one full planning
            // turn, then let the existing readiness and opening-attack gates decide.
            const plannedLaunchReady = elapsed >= 1 && (preparationReady || stagedEarly);
            if (plannedLaunchReady || elapsed > planDuration || forcedLaunch) {
                if (hasOnlyPoliticallyBlockedCurrentObjectives(state, corpsId, faction, op)) {
                    beginRecovery(op, turn, 'political_blocked', state);
                    continue;
                }
                if (!forcedLaunch && !areParticipantsReadyForExecution(
                    state,
                    corpsId,
                    faction,
                    op,
                    operationStaticAdjacency,
                )) {
                    if (elapsed <= planDuration + PLANNING_INVALIDATION_GRACE_TURNS) {
                        continue;
                    }
                    beginRecovery(op, turn, 'no_launch_readiness', state);
                    continue;
                }
                const openingReadiness = evaluateOpeningAttackReadiness(state, corpsId, faction, op, operationStaticAdjacency, openingAttackPredictionContext);
                if (!forcedLaunch && !openingReadiness.executable) {
                    // stagedEarly fires via isCommittedInTransitTo when a brigade is en-route
                    // to its approach OSID but not yet settled. Its CURRENT location may not be
                    // adjacent to the objective, so evaluateOpeningAttackReadiness fails even though
                    // the brigade will be in position next turn. Give one turn for march completion.
                    if (stagedEarly && elapsed <= planDuration + PLANNING_INVALIDATION_GRACE_TURNS) {
                        continue;
                    }
                    beginRecovery(op, turn, openingReadiness.blocker ?? 'no_launch_readiness', state);
                    continue;
                }
                // LANE-NIGHTSHIFT-A2 (2026-05-03): predictor force-ratio launch
                // floor. Aborts launches at obviously-doomed force ratios
                // (<0.3 = attacker <33% of defender power). Faction-agnostic,
                // forced-launch override preserved. See MIN_LAUNCH_FORCE_RATIO_FLOOR
                // docstring above for full design rationale.
                if (
                    !forcedLaunch
                    && typeof op.force_ratio_estimate === 'number'
                    && op.force_ratio_estimate < launchFloorForOp(op)
                ) {
                    beginRecovery(op, turn, 'defender_power_too_high', state);
                    continue;
                }
                // Fall-1995 E-A5 launch-halt CAP: when an active
                // offensive_ops_suppression entry covers this faction (e.g. the
                // Holbrooke "halt the Federation advance" pressure via
                // us_halts_federation_advance_1995), refuse new offensive launches.
                // This is a CAP that bounds RBiH/HRHB endgame overshoot; it flips
                // no currently-RS OSID. Already-executing ops are untouched (gate is
                // only at the planning→execution transition). force_launch (player
                // override) bypasses, matching every other launch gate here.
                if (!forcedLaunch && isFactionOffensiveOpsSuppressed(state, faction, turn)) {
                    beginRecovery(op, turn, 'offensive_ops_suppressed', state);
                    continue;
                }
                // Council fix 3 / B10: the October 1995 general ceasefire closes the operation
                // channel. Unlike the E-A5 cap above, a force launch does not bypass it: the
                // war reopens only through a declined Dayton (reopenWarAfterDaytonDecline).
                if (isCorpsBoundByOct1995Ceasefire(state, corpsId)) {
                    beginRecovery(op, turn, 'ceasefire', state, corpsId);
                    continue;
                }
                // P3 mismatch rider: keep the planning clock so a launch that the same turn's
                // order emission refuses can be demoted back (confirmLaunchedOperationOrders).
                op.planning_phase_started_turn = op.phase_started_turn;
                op.phase = 'execution';
                op.phase_started_turn = turn;
                op.recovery_reason = undefined;
                if (op.preparation_probe_link) {
                    op.preparation_probe_link.entered_execution_turn = turn;
                    emitLinkedPreparationProbeRecord(op, faction, corpsId, turn, (receipt) => ({
                        event: 'linked_probe_execution',
                        ...receipt,
                        phase_before: 'planning',
                        phase_after: 'execution',
                        transition_reason: forcedLaunch
                            ? 'force_launch'
                            : preparationReady ? 'preparation_ready' : 'participants_ready',
                    }));
                }

                // ADR-0005 Phase 2: Every donor-eligible offensive attempts TG formation
                // here. The `none` policy forms no TG; zero-donor fallback remains an ordinary operation.
                // The ready-path may already have formed the TG;
                // formTgsAtReadyTransition is idempotent.
                formTgsAtReadyTransition(state, op, turn, staticAdjacency);
                markOperationExecuting(state, corpsId, op);
                delete op.silent_execution_turn_streak;

                if (multiAxis) {
                    for (const axis of op.axes!) resetAxisForExecution(axis);
                    // Opt-in phase gate: start each holding axis's own hold clock exactly once.
                    startLatePhaseHold(op, turn);
                } else {
                    op.current_objective_index = 0;
                    op.momentum = 0;
                    op.failure_count = 0;
                    op.consecutive_failures_on_current = 0;
                    op.attack_attempt_count = 0;
                    op.objective_capture_count = 0;
                    op.movement_only_execution_turns = 0;
                    op.idle_execution_turn_streak = 0;
                }

                if (op.sector_id && Array.isArray(state.military.opsec_sectors)) {
                    state.military.opsec_sectors = state.military.opsec_sectors.filter((sectorId) => sectorId !== op.sector_id);
                }
                if (forcedLaunch) {
                    applyCohesionDelta(state, allBrigades, -EARLY_LAUNCH_COHESION_PENALTY);
                    op.force_launch = false;
                }
            }
        } else if (op.phase === 'execution') {
            const tgExhaustionReason = evaluateOperationTacticalGroupExhaustion(state, corpsId, op, turn);
            if (tgExhaustionReason != null) {
                beginRecovery(op, turn, tgExhaustionReason, state, corpsId);
                continue;
            }
            if (hasOnlyPoliticallyBlockedCurrentObjectives(state, corpsId, faction, op)) {
                beginRecovery(op, turn, 'political_blocked', state);
                continue;
            }
            if (op.tempo === 'all_out') {
                applyCohesionDelta(state, allBrigades, -ALL_OUT_EXTRA_COHESION_COST);
            }

            if (multiAxis) {
                const adjacency = buildOsidAdjacencyFromFrontEdges(state);
                for (const axis of op.axes!) {
                    if (axis.status !== 'executing') continue;
                    const objective = axis.objectives[axis.current_objective_index ?? 0];
                    if (shouldStallAxisForRecentCatastrophicObjective(
                        state,
                        corpsId,
                        faction,
                        objective,
                        axis.assigned_brigades,
                        adjacency,
                        turn,
                    )) {
                        axis.status = 'stalled';
                        axis.launch_blocker = 'recent_catastrophic_losses_at_objective';
                        // REASON-CODE INSTRUMENTATION (topic `axis_reject`): the detail
                        // explains a `zero_eligible_axis` verdict specifically. This site
                        // overwrites the blocker with a different one, so the explanation
                        // must not survive alongside it. Deleting an absent key is a no-op,
                        // so a default run is unaffected.
                        delete axis.launch_blocker_detail;
                    }
                }
                // Multi-axis: check if all axes are terminal
                if (allAxesTerminal(op.axes!)) {
                    const resolution = resolveCompletionOrReopen(state, corpsId, op, faction, turn);
                    if (resolution !== 'reopened') beginRecovery(op, turn, resolution, state);
                    continue;
                }
            } else {
                // Legacy flat: check completion and failures
                const objectives = op.objectives ?? [];
                if ((op.current_objective_index ?? 0) >= objectives.length) {
                    const resolution = resolveCompletionOrReopen(state, corpsId, op, faction, turn);
                    if (resolution !== 'reopened') beginRecovery(op, turn, resolution, state);
                    continue;
                }
                if ((op.failure_count ?? 0) >= MAX_TOTAL_FAILURES) {
                    beginRecovery(op, turn, getNoAttemptRecoveryReason(op), state);
                    continue;
                }
            }

            // Execution-phase backstop: abort any op that has been executing for
            // MAX_EXECUTION_TURNS_ZERO_ATTACKS turns without a single logged attack.
            // Prevents dead ops from consuming corps op slots for 13-15 turns due to
            // the anyMoved/idle oscillation that prevents normal abort thresholds
            // (idle_execution_turn_streak, movement_only_execution_turns) from
            // accumulating fast enough. Canon-approved: equivalent to corps commander
            // discretion to abort when operational window has closed (Systems Manual §7.6).
            if ((op.attack_attempt_count ?? 0) === 0) {
                const executionTurnsElapsed = turn - (op.phase_started_turn ?? turn);
                if (executionTurnsElapsed >= MAX_EXECUTION_TURNS_ZERO_ATTACKS) {
                    beginRecovery(op, turn, getNoAttemptRecoveryReason(op), state);
                    continue;
                }
            }
            // Never-ending-op exit: the same exit for an op that attacked earlier and has since
            // issued no attack or move order for MAX_EXECUTION_TURNS_ZERO_ATTACKS consecutive
            // emission turns (streak kept by recordExecutionOrderSilence).
            if ((op.silent_execution_turn_streak ?? 0) >= MAX_EXECUTION_TURNS_ZERO_ATTACKS) {
                beginRecovery(op, turn, getNoAttemptRecoveryReason(op), state);
                continue;
            }

            if (op.type === 'probe' && !multiAxis && (op.attack_attempt_count ?? 0) > 0) {
                beginRecovery(op, turn, op.last_result === 'captured' ? 'completed' : 'probe_complete', state);
                continue;
            }
        } else if (op.phase === 'recovery') {
            // FARZ-END (§26, lane C s22 seats): before any end-of-operation work, a sector attack
            // recovering as `completed` with a full counter re-checks its credited objectives. A
            // lost one reopens the operation; a refused reopen records a non-completed reason (the
            // recovery clock is kept) so the operation never ends as `completed` over a lost cell.
            // A refusal finalizes on the next tick, so this week's operation row still shows the
            // operation and the report side re-derives its end-rule receipt from the new reason.
            if (
                op.type === 'sector_attack'
                && op.recovery_reason === 'completed'
                && !op.preparation_probe_link
                && hasCapturedAllObjectives(op)
            ) {
                const resolution = resolveCompletionOrReopen(state, corpsId, op, faction, turn);
                if (resolution === 'reopened') continue;
                if (resolution !== 'completed') {
                    op.recovery_reason = resolution;
                    continue;
                }
            }
            const elapsed = turn - op.phase_started_turn;
            const recoveryDuration = multiAxis
                ? getMultiAxisRecoveryDuration(op)
                : getRecoveryDuration(op);
            if (elapsed >= recoveryDuration) {
                // A ceasefire stand-down books no completion exhaustion (council fix 3).
                const exhaustionCost = op.preparation_probe_link || op.recovery_reason === 'ceasefire'
                    ? 0
                    : op.type === 'feint' || op.type === 'probe' ? 5 : 15;
                const exhBefore = cmd.corps_exhaustion ?? 0;
                cmd.corps_exhaustion = Math.min(100, (cmd.corps_exhaustion ?? 0) + exhaustionCost);
                emitCorpsExhaustionRecord(() => ({
                    turn, corps_id: corpsId, faction, source: 'sector_op_completion',
                    before: exhBefore, after: cmd.corps_exhaustion,
                    op_name: op.name, op_type: op.type, recovery_reason: op.recovery_reason ?? null,
                }));
                // A ceasefire stand-down is a political order, not a failed assault: it books
                // no objective failures (council fix 3; oct1995_ceasefire.ts).
                if ((op.type === 'sector_attack' || op.type === 'probe') && op.recovery_reason !== 'ceasefire') {
                    recordFailedObjectives(cmd, op, turn);
                }
                if (op.type === 'sector_attack' || op.preparation_probe_link) {
                    const finalizedAAR = finalizeOperationAAR(state, corpsId, op);
                    if (op.type === 'sector_attack') linkOpportunityResolutionToAAR(state, finalizedAAR);
                    // Apply experience gain to operation commander based on AAR grade
                    // A ceasefire stand-down is not graded into the commander's experience.
                    if (op.commander_officer_id && state.operation_history?.length && op.recovery_reason !== 'ceasefire') {
                        if (finalizedAAR.commander_officer_id === op.commander_officer_id) {
                            const outcome = gradeStarsToOutcome(finalizedAAR.grade.stars);
                            applyOperationExperience(state, op.commander_officer_id, outcome);
                        }
                    }
                    // Track consecutive operation failures for defeatism
                    if (op.commander_officer_id && state.military.named_officers) {
                        const os = state.military.named_officers[op.commander_officer_id];
                        if (os) {
                            if (op.recovery_reason === 'completed') {
                                os.consecutive_op_failures = 0; // Reset on success
                            } else if (op.recovery_reason !== 'probe_complete' && op.recovery_reason !== 'ceasefire') {
                                os.consecutive_op_failures = (os.consecutive_op_failures ?? 0) + 1;
                                checkDefeatism(state, op.commander_officer_id, os.consecutive_op_failures);
                            }
                        }
                    }
                }
                releaseOperationCommanders(state, op);

                // Activate east Herzegovina truce only when Op Jackal (pre-planned HRHB op) completes.
                // Historical: VRS-HRHB ceasefire in east Herzegovina held after June 1992 HVO offensive.
                // Op Jackal is an exception from Graz accords — it proceeds regardless of Graz status.
                // Probes and bot-generated ops must NOT trigger the truce prematurely.
                if (isGrazAccordsActive(state)
                    && isEastHerzegovinaPair(corpsId)
                    && faction === 'HRHB'
                    && op.is_pre_planned === true
                    && state.political.graz_east_herzegovina_active_turn == null) {
                    state.political.graz_east_herzegovina_active_turn = turn;
                }

                // Release brigades: issue return-march orders for participants away from home.
                // Without this, brigades stay at their operation endpoint and get classified
                // into whatever sector owns that OSID — potentially far from home.
                if (op.preparation_probe_link?.restored_to_parent !== true) {
                    issuePostOperationReturnMarches(state, op);
                }

                // Only reset probe counter when a FULL operation completes.
                // Probe completions must preserve the counter so it can reach
                // MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT and force a real commitment.
                // Bug: resetting on probe completion created an infinite probe loop —
                // counter went 0→1→complete→0→1→complete→... never reaching 2.
                if (op.type !== 'probe') {
                    cmd.consecutive_probes = 0;
                }
                // Save completed op for theater-aware follow-on suppression.
                // Probes are reconnaissance — they should NOT trigger the cooldown
                // that blocks follow-up operations. The whole point of a probe is to
                // gather intel for an immediate follow-up operation.
                if (op.type !== 'probe') {
                    cmd.last_completed_operation = op;
                    cmd.last_completed_operation_turn = turn;
                }
                completeOperationLifecycle(state, corpsId, op);
                removeOperation(cmd, op);
                if (completedParticipantIds) {
                    const participantIds = isMultiAxis(op)
                        ? getAllAxisBrigades(op)
                        : (op.participating_brigades ?? []);
                    for (const participantId of [...new Set(participantIds)].sort(strictCompare)) {
                        completedParticipantIds.add(participantId as FormationId);
                    }
                }
            }
        }
        }
    }
    return prepEvents;
    } finally {
        if (observedOperations !== undefined) {
            for (const { operation, operationIndex, operationStartedTurn, operationPhaseStartedTurn } of observedOperations) {
                emitSouthernMovePreparationPassRecord(observedFaction, observedCorpsId, observedTurn, () => ({
                    event: 'caller_outcome', turn: observedTurn, corps_id: observedCorpsId, faction: observedFaction,
                    operation_name: operation.name,
                    operation_index: operationIndex, operation_started_turn: operationStartedTurn,
                    operation_phase_started_turn: operationPhaseStartedTurn,
                    outcome: observedOutcomes?.get(operation) ?? 'not_reached',
                    cause_measured: false,
                }));
            }
            const endEntries = (observedCommand?.active_operations ?? []).map((operation, operationIndex) => ({
                operation,
                operationIndex,
                operationStartedTurn: operation.started_turn,
                operationPhaseStartedTurn: operation.phase_started_turn,
            }))
                .filter(({ operation }) => operation.name === 'Operation Southern Move');
            emitSouthernMovePreparationPassRecord(observedFaction, observedCorpsId, observedTurn, () => ({
                event: 'caller_end', turn: observedTurn, corps_id: observedCorpsId, faction: observedFaction,
                eligible_count: endEntries.length, operation_inventory: observedInventory(endEntries),
            }));
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Update sector offensive results (post-combat)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if objectives were captured after combat resolution.
 * Called after phase-ii-resolve-attack-orders.
 *
 * Supports both multi-axis (op.axes[]) and legacy flat-field operations.
 * For multi-axis: each axis is evaluated independently; convergence objectives
 * (shared terminal targets) are captured for all axes when any axis captures them.
 */
export function updateSectorOffensiveResults(
    state: GameState,
    reverseMap?: OperationalToCanonicalReverseMap | null
): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        if (!cmd || cmd.active_operations.length === 0) continue;

        for (const op of cmd.active_operations) {
            if ((op.type !== 'sector_attack' && op.type !== 'probe') || op.phase !== 'execution') continue;
            if (state.military.event_flags?.coha_active === true
                && !isVlasicCohaExceptionOperation(state, corpsId, op, state.meta?.turn ?? 0)) continue;

            const corps = state.military.formations?.[corpsId];
            const faction: FactionId = corps?.faction ?? 'RS';
            const turn = state.meta?.turn ?? 0;

            if (isMultiAxis(op)) {
                updateMultiAxisResults(state, op, corpsId, faction, turn, reverseMap);
            } else {
                updateLegacyFlatResults(state, op, corpsId, faction, turn, reverseMap);
            }
        }
    }
}

/** Update results for multi-axis operations. */
function updateMultiAxisResults(
    state: GameState,
    op: CorpsOperation,
    corpsId: FormationId,
    faction: FactionId,
    turn: number,
    reverseMap?: OperationalToCanonicalReverseMap | null
): void {
    const axes = op.axes!;

    // Opt-in phase gate (operation_phase_gate.ts): receipts written by this turn's combat may now
    // satisfy a holding axis's prerequisites. Inert for operations without an `late_phase` axis.
    advanceLatePhaseGates(state, op, corpsId, faction, turn, reverseMap,
        (axis) => formTgForAxis(state, op, axis, turn, undefined, { corps_id: corpsId, caller_stage: 'pre_results' }),
        'pre_results');

    // First pass: check for convergence captures (shared objectives captured by any axis)
    const capturedThisTurn = new Set<string>();
    for (const axis of axes) {
        if (axis.status !== 'executing') continue;
        // A holding axis neither credits nor advances (no progression through friendly control).
        if (isLatePhaseResultPassIdle(axis, turn)) continue;
        const currentIdx = axis.current_objective_index;
        if (currentIdx >= axis.objectives.length) continue;
        const currentObj = axis.objectives[currentIdx]!;
        const controller = getPoliticalControllerOSID(state, currentObj, reverseMap ?? undefined);
        if (controller === faction || isFriendlyFactionCtrl(controller, faction, state)) {
            capturedThisTurn.add(currentObj);
        } else if (controller == null && op.type !== 'probe') {
            // Null-controlled OSID: auto-claim — no enemy, no battle needed.
            // Probes never capture territory (n1580 fix); skip the auto-claim
            // path for them so the rule is consistent across capture mechanisms.
            if (!state.political.political_controllers) state.political.political_controllers = {};
            state.political.political_controllers[currentObj] = faction;
            (state.political.control_events ??= []).push({
                turn: state.meta?.turn ?? 0,
                settlement_id: currentObj,
                mechanism: 'combat' as const,
                from: null,
                to: faction,
                mun_id: currentObj.split(':')[1],
            });
            capturedThisTurn.add(currentObj);
        }
    }

    // Snapshot eligible sibling shared-objective paths at the start of the second
    // pass. Loop iterations mutate sibling status and current_objective_index
    // (captures advance the index, stalls flip status), so deciding the wait from
    // a snapshot keeps it independent of axis iteration order.
    const eligibleSiblingPaths = axes.map((other, idx) => {
        if (other.status !== 'executing') return null;
        if (isLatePhaseResultPassIdle(other, turn)) return null;
        // Credible progress: the sibling has attacked at least once, or was active
        // on the previous turn (the idle streak only survives a fully idle turn).
        const hasCredibleProgress = other.attack_attempt_count > 0
            || other.idle_execution_turn_streak === 0;
        if (!hasCredibleProgress) return null;
        const remaining = other.current_objective_index < other.objectives.length
            ? other.objectives.slice(other.current_objective_index)
            : [];
        return { idx, remaining };
    });

    // Second pass: advance each axis
    for (const [axisIndex, axis] of axes.entries()) {
        if (axis.status !== 'executing') continue;
        // Holding axis: lawful approach/hold only; the only axis-local clock is the main axis's
        // lifecycle (stall if it ends terminal without the owned captures) — no movement-only,
        // idle, failure or shared-wait accrual while capture authority is withheld.
        if (isLatePhaseResultPassIdle(axis, turn)) continue;
        const currentIdx = axis.current_objective_index;
        if (currentIdx >= axis.objectives.length) {
            axis.status = 'complete';
            continue;
        }

        const currentObjective = axis.objectives[currentIdx]!;

        if (capturedThisTurn.has(currentObjective)) {
            // Captured (either by this axis's brigades or convergence from another axis).
            // Probes never capture (n1580); skip capture credit even when their
            // axis target is friendly-controlled via another mechanism. Probe
            // still advances current_objective_index to recognize and move on.
            axis.attack_attempt_count += 1;
            if (op.type !== 'probe') {
                axis.objective_capture_count += 1;
                axis.last_result = 'captured';
                axis.momentum = Math.min(MOMENTUM_CAP, axis.momentum + 1);
            }
            axis.idle_execution_turn_streak = 0;
            axis.movement_only_execution_turns = 0; // reset: objective captured
            axis.shared_objective_wait_turns = 0; // reset: no longer waiting for sibling
            axis.current_objective_index = currentIdx + 1;
            axis.consecutive_failures_on_current = 0;
            axis.consecutive_catastrophic_on_current = 0;
            fullyRevealProbeSectorIntel(state, op);
        } else {
            // Check if any of THIS AXIS's brigades attacked (objective or intermediate)
            const adjacentFriendlyOsids = collectAdjacentFriendlyOsids(state, corpsId, currentObjective);
            const hasObjectiveAttackPosture = axis.assigned_brigades.some(bid => {
                const b = state.military.formations?.[bid];
                if (!b || (b.posture !== 'attack' && b.posture !== 'assault')) return false;
                return b.location_osid ? adjacentFriendlyOsids.has(b.location_osid) : false;
            });
            // Also count brigades attacking intermediate targets (fighting through)
            const anyAttackedAnything = axis.assigned_brigades.some(bid => {
                const b = state.military.formations?.[bid];
                return b != null && (b.posture === 'attack' || b.posture === 'assault');
            });
            const anyResolvedAxisBattle = (axis.battles_this_turn ?? 0) > 0;
            const anyResolvedObjectiveBattle = axis.objective_battles_this_turn !== undefined
                ? axis.objective_battles_this_turn > 0
                : hasObjectiveAttackPosture && anyResolvedAxisBattle;
            const anyAttacked = hasObjectiveAttackPosture || anyAttackedAnything || anyResolvedAxisBattle;
            // Check brigade_movement_state (persists across turns) NOT brigade_movement_orders
            // (which is cleared by apply-brigade-movement BEFORE this step runs).
            const anyMoved = axis.assigned_brigades.some(bid => {
                const movState = state.military.brigade_movement_state?.[bid];
                return movState?.status === 'in_transit' || movState?.status === 'packing';
            });

            if (anyResolvedObjectiveBattle) {
                // Direct attack on current objective. A resolved attacker win
                // can reduce defender resistance without crossing the political
                // occupation threshold in the same turn; that is continued
                // operational progress, not a failed assault.
                axis.attack_attempt_count += 1;
                axis.idle_execution_turn_streak = 0;
                // Only reset movement_only counter when no brigades are also marching.
                // If some axis brigades are in transit while others attack, the marching
                // signal must persist — stranded brigades cycling attack/march never reset.
                if (!anyMoved) axis.movement_only_execution_turns = 0;
                const hadSuccessfulObjectiveBattle = axis.assigned_brigades.some(bid => {
                    const b = state.military.formations?.[bid];
                    if (!b?.brigade_history?.engagements?.length) return false;
                    const lastEng = b.brigade_history.engagements[b.brigade_history.engagements.length - 1];
                    return lastEng.turn === turn
                        && lastEng.osid === currentObjective
                        && lastEng.role === 'attacker'
                        && (lastEng.outcome === 'costly_victory'
                            || lastEng.outcome === 'victory'
                            || lastEng.outcome === 'decisive_victory');
                });
                axis.last_result = hadSuccessfulObjectiveBattle ? 'approach' : 'failed';
                axis.momentum = 0;
                if (hadSuccessfulObjectiveBattle) {
                    axis.consecutive_failures_on_current = 0;
                } else {
                    axis.failure_count += 1;
                    axis.consecutive_failures_on_current += 1;
                }
                fullyRevealProbeSectorIntel(state, op);

                // ── Catastrophic outcome stall ──
                // Check if any attacking brigade's last engagement was catastrophic.
                // A desperate attack at bad odds can happen once — commanders sometimes gamble.
                // But no one sends men to die at the same fortified position three turns running.
                const wasCatastrophic = axis.assigned_brigades.some(bid => {
                    const b = state.military.formations?.[bid];
                    if (!b?.brigade_history?.engagements?.length) return false;
                    const lastEng = b.brigade_history.engagements[b.brigade_history.engagements.length - 1];
                    return lastEng.turn === turn
                        && lastEng.osid === currentObjective
                        && lastEng.role === 'attacker'
                        && lastEng.outcome === 'catastrophic';
                });
                if (wasCatastrophic) {
                    axis.consecutive_catastrophic_on_current = (axis.consecutive_catastrophic_on_current ?? 0) + 1;
                } else {
                    axis.consecutive_catastrophic_on_current = 0;
                }
                if ((axis.consecutive_catastrophic_on_current ?? 0) >= MAX_CONSECUTIVE_CATASTROPHIC_ON_CURRENT) {
                    axis.status = 'stalled';
                    continue;
                }

                if (!hadSuccessfulObjectiveBattle
                    && axis.consecutive_failures_on_current >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                    axis.current_objective_index = currentIdx + 1;
                    axis.consecutive_failures_on_current = 0;
                    axis.consecutive_catastrophic_on_current = 0; // reset on objective change
                }
            } else if (anyResolvedAxisBattle) {
                // Intermediate attack (fighting through toward objective)
                // Counts as approach progress, not a failure on the current objective
                axis.attack_attempt_count += 1;
                axis.idle_execution_turn_streak = 0;
                axis.last_result = 'approach';
                axis.momentum = 0;
                axis.movement_only_execution_turns += 1;
            } else if (anyAttacked) {
                axis.idle_execution_turn_streak = 0;
                axis.last_result = 'approach';
                axis.momentum = 0;
                axis.movement_only_execution_turns += 1;
            } else {
                if (anyMoved) {
                    // Approach movement: brigade is marching toward objective.
                    // This is not a combat failure — don't increment failure counts.
                    axis.movement_only_execution_turns += 1;
                    axis.idle_execution_turn_streak = 0;
                    axis.last_result = 'approach';
                    axis.momentum = 0;
                } else {
                    // Truly idle: no movement, no attack.
                    axis.idle_execution_turn_streak += 1;
                    axis.momentum = 0;

                    // Check if this axis is waiting for a sibling to capture a shared objective.
                    // When another executing axis in the same operation has credible progress
                    // (attacked at least once, or active on the previous turn) and the shared
                    // objective lies on its remaining path, the idle axis gets a bounded wait
                    // instead of stalling.
                    const hasAdvancingSiblingOnSameObjective = eligibleSiblingPaths.some(entry =>
                        entry !== null && entry.idx !== axisIndex && entry.remaining.includes(currentObjective));

                    const idleStallThreshold = op.type === 'probe' ? 1 : 4;
                    const wouldIdleStall = !anyMoved && axis.attack_attempt_count === 0
                        && axis.idle_execution_turn_streak >= idleStallThreshold;

                    if (wouldIdleStall && hasAdvancingSiblingOnSameObjective) {
                        // Bounded wait for sibling to capture shared objective.
                        axis.shared_objective_wait_turns = (axis.shared_objective_wait_turns ?? 0) + 1;
                        if (axis.shared_objective_wait_turns <= MAX_SHARED_OBJECTIVE_WAIT_TURNS) {
                            axis.last_result = 'approach';
                            // Don't increment failure counts — this is a wait, not a failure.
                            continue;
                        }
                        // Wait cap reached — fall through to normal stall.
                    }

                    axis.last_result = 'stalemate';
                    axis.failure_count += 1;
                    axis.consecutive_failures_on_current += 1;

                    // Idle stall: no movement and no attacks ever on this axis.
                    // Threshold = 4 to give brigades time to march from staging to objectives
                    // via regular movement (1 hop/turn). Column-marching brigades are already
                    // detected via anyMoved (in_transit) and use the movement-only stall instead.
                    if (wouldIdleStall) {
                        axis.movement_only_execution_turns = Math.max(1, axis.movement_only_execution_turns);
                        axis.status = 'stalled';
                        continue;
                    }
                }

                // Movement-only stall: brigades marching but not attacking objectives.
                // Checked after both branches so a continuously marching axis still stalls
                // at its existing cap.
                if (axis.movement_only_execution_turns >= MAX_MOVEMENT_ONLY_EXECUTION_TURNS) {
                    axis.status = 'stalled';
                    continue;
                }
            }
        }

        // Check axis completion or stall
        if (axis.current_objective_index >= axis.objectives.length) {
            axis.status = 'complete';
        }
        // Per-axis cap. The zero-progress backstop (MAX_OPERATION_ZERO_PROGRESS_FAILURES)
        // fires first for single-axis zero-capture operations; this per-axis cap remains
        // the backstop for multi-axis operations making partial progress.
        // Wave 20: single-axis ops use a tighter cap so brigades release sooner for
        // downstream cascade ops (Cincar Phase 1 → Mistral 1).
        const failureCap = axes.length === 1 ? MAX_TOTAL_FAILURES_SINGLE_AXIS : MAX_TOTAL_FAILURES;
        if (axis.failure_count >= failureCap) {
            axis.status = 'stalled';
        }
    }

    // Aggregate axis-level captures to operation level
    let totalCaptures = 0;
    let totalAttempts = 0;
    let totalAxisFailures = 0;
    for (const axis of axes) {
        totalCaptures += axis.objective_capture_count ?? 0;
        totalAttempts += axis.attack_attempt_count ?? 0;
        totalAxisFailures += axis.failure_count ?? 0;
    }
    op.objective_capture_count = totalCaptures;
    op.attack_attempt_count = totalAttempts;

    // Factory-built probes carry a single axis, so they take the multi-axis
    // result path. Reconnaissance is complete after the first resolved contact:
    // sector intel has already been fully revealed above, and another attack
    // would turn a disposable probe into an unbounded offensive commitment.
    // Match the legacy flat-probe lifecycle enforced in advanceSectorOffensives.
    if (op.type === 'probe' && totalAttempts > 0) {
        beginRecovery(op, turn, 'probe_complete', state);
        return;
    }

    // Opt-in phase gate: the main axis may have just become terminal in this pass; a holding axis
    // then stalls terminally unless its owned prerequisites already activated it above.
    advanceLatePhaseGates(state, op, corpsId, faction, turn, reverseMap,
        (axis) => formTgForAxis(state, op, axis, turn, undefined, { corps_id: corpsId, caller_stage: 'post_results' }),
        'post_results');

    // Zero-progress early abort — now PER-AXIS for true parallel execution.
    // Each axis stalls from its own zero-progress failures, not contaminated
    // by other axes. A stalled Foča Valley axis won't kill a progressing Kalinovik axis.
    for (const axis of axes) {
        if (axis.status !== 'executing') continue;
        const axisFailures = axis.failure_count ?? 0;
        const axisCaptures = axis.objective_capture_count ?? 0;
        const axisAttempts = axis.attack_attempt_count ?? 0;
        if (
            axisFailures >= MAX_OPERATION_ZERO_PROGRESS_FAILURES
            && axisCaptures === 0
            && axisAttempts >= 1
        ) {
            axis.status = 'stalled';
        }
    }

    // Check if all axes terminal → operation enters recovery (unless a lost objective reopens it)
    if (allAxesTerminal(axes)) {
        const resolution = resolveCompletionOrReopen(state, corpsId, op, faction, turn);
        if (resolution !== 'reopened') beginRecovery(op, turn, resolution, state);
    }
}

function hasOnlyPoliticallyBlockedCurrentObjectives(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    op: CorpsOperation,
): boolean {
    if (isMultiAxis(op) && op.axes) {
        const activeAxes = op.axes.filter((axis) => axis.status === 'executing');
        if (activeAxes.length === 0) return false;
        return activeAxes.every((axis) => {
            const objective = axis.objectives[axis.current_objective_index ?? 0];
            if (!objective) return false;
            return isObjectivePoliticallyBlocked(state, corpsId, faction, objective);
        });
    }
    const objective = op.objectives?.[op.current_objective_index ?? 0];
    if (!objective) return false;
    return isObjectivePoliticallyBlocked(state, corpsId, faction, objective);
}

/** The Graz / RBiH-HRHB political gate on one objective (shared with the FARZ-END reopen gate). */
function isObjectivePoliticallyBlocked(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    objective: string,
): boolean {
    const controller = state.political.political_controllers?.[objective] ?? '';
    return shouldGrazBlockAttack(state, corpsId, faction, objective, controller)
        || isRbihHrhbCombatBlocked(state, faction, controller);
}

/**
 * Collect friendly OSIDs adjacent to a target objective for attack detection.
 * Exported for the report-only `masked_by_march` idle-week check (combat_causality.ts).
 * The result is a Set; callers only test membership, so its insertion order never leaks.
 */
export function collectAdjacentFriendlyOsids(state: GameState, corpsId: FormationId, targetOsid: string): Set<string> {
    const result = new Set<string>();
    if (!state.military.corps_front_sectors) return result;
    for (const sector of Object.values(state.military.corps_front_sectors)) {
        if (sector.corps_id !== corpsId) continue;
        for (const ss of sector.sub_segments) {
            if (ss.enemy_osids.includes(targetOsid)) {
                for (const fo of ss.friendly_osids) result.add(fo);
            }
        }
    }
    return result;
}

/** Update results for legacy flat-field operations (no axes). */
function updateLegacyFlatResults(
    state: GameState,
    op: CorpsOperation,
    corpsId: FormationId,
    faction: FactionId,
    turn: number,
    reverseMap?: OperationalToCanonicalReverseMap | null
): void {
    const objectives = op.objectives ?? [];
    const currentIdx = op.current_objective_index ?? 0;
    if (currentIdx >= objectives.length) {
        const resolution = resolveCompletionOrReopen(state, corpsId, op, faction, turn);
        if (resolution !== 'reopened') beginRecovery(op, turn, resolution, state);
        return;
    }

    const currentObjective = objectives[currentIdx]!;
    let effectiveController = getPoliticalControllerOSID(state, currentObjective, reverseMap ?? undefined);

    // Null-controlled OSID: auto-claim — no enemy, no battle needed.
    // Gated on the operation's DECLARED intent to hold, not on its type. Was
    // `op.type !== 'probe'`, a second unexplained special case alongside the one in
    // attack_resolution_osid.ts; both now read the same declaration, so the rule is stated once.
    // Default TRUE — an operation that has not said otherwise intends to hold.
    // See `occupies_on_victory` in game_state.ts.
    if (effectiveController == null && (op.occupies_on_victory ?? true)) {
        if (!state.political.political_controllers) state.political.political_controllers = {};
        state.political.political_controllers[currentObjective] = faction;
        (state.political.control_events ??= []).push({
            turn: state.meta?.turn ?? 0,
            settlement_id: currentObjective,
            mechanism: 'combat' as const,
            from: null,
            to: faction,
            mun_id: currentObjective.split(':')[1],
        });
        effectiveController = faction as ControlSide;
    }

    if (effectiveController === faction || isFriendlyFactionCtrl(effectiveController, faction, state)) {
        op.attack_attempt_count = (op.attack_attempt_count ?? 0) + 1;
        // Probes never capture territory — even when their current_objective
        // becomes friendly-controlled via a different mechanism (separate op,
        // brigade-independent attack, abandonment), the probe must not take
        // capture credit. Otherwise downstream consumers (army_reserve
        // exploitation windows, AAR, scenario diagnostics) misattribute
        // non-probe captures to probes (n1582 surfaced 2 such artifacts).
        // Probes still advance current_objective_index so they recognize the
        // target is no longer enemy and move on.
        if (op.type !== 'probe') {
            op.objective_capture_count = (op.objective_capture_count ?? 0) + 1;
            op.last_result = 'captured';
            op.momentum = Math.min(MOMENTUM_CAP, (op.momentum ?? 0) + 1);
        }
        op.idle_execution_turn_streak = 0;
        op.movement_only_execution_turns = 0; // reset: objective captured
        op.current_objective_index = currentIdx + 1;
        op.consecutive_failures_on_current = 0;
        fullyRevealProbeSectorIntel(state, op);
    } else {
        const adjacentFriendlyOsids = collectAdjacentFriendlyOsids(state, corpsId, currentObjective);
        const hasObjectiveAttackPosture = op.participating_brigades.some(bid => {
            const b = state.military.formations?.[bid];
            if (!b || (b.posture !== 'attack' && b.posture !== 'assault')) return false;
            return b.location_osid ? adjacentFriendlyOsids.has(b.location_osid) : false;
        });
        const anyAttackedAnything = op.participating_brigades.some(bid => {
            const b = state.military.formations?.[bid];
            return b != null && (b.posture === 'attack' || b.posture === 'assault');
        });
        const anyResolvedBattle = (op.battles_this_turn ?? 0) > 0;
        const anyResolvedObjectiveBattle = op.objective_battles_this_turn !== undefined
            ? op.objective_battles_this_turn > 0
            : hasObjectiveAttackPosture && anyResolvedBattle;
        // Check brigade_movement_state (persists across turns) NOT brigade_movement_orders
        // (which is cleared by apply-brigade-movement BEFORE this step runs).
        const anyMoved = op.participating_brigades.some(bid => {
            const movState = state.military.brigade_movement_state?.[bid];
            return movState?.status === 'in_transit' || movState?.status === 'packing';
        });

        if (anyResolvedObjectiveBattle) {
            op.attack_attempt_count = (op.attack_attempt_count ?? 0) + 1;
            op.idle_execution_turn_streak = 0;
            // Only reset movement_only counter when no brigades are also marching.
            // If some op brigades are in transit while others attack, the marching
            // signal must persist — stranded brigades cycling attack/march never reset.
            if (!anyMoved) op.movement_only_execution_turns = 0;
            op.last_result = 'failed';
            op.momentum = 0;
            op.failure_count = (op.failure_count ?? 0) + 1;
            op.consecutive_failures_on_current = (op.consecutive_failures_on_current ?? 0) + 1;
            fullyRevealProbeSectorIntel(state, op);

            if ((op.consecutive_failures_on_current ?? 0) >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                op.current_objective_index = currentIdx + 1;
                op.consecutive_failures_on_current = 0;
            }
        } else if (anyResolvedBattle) {
            // Intermediate attack: fighting through toward objective
            op.attack_attempt_count = (op.attack_attempt_count ?? 0) + 1;
            op.idle_execution_turn_streak = 0;
            op.last_result = 'approach';
            op.momentum = 0;
            op.movement_only_execution_turns = (op.movement_only_execution_turns ?? 0) + 1;
        } else if (hasObjectiveAttackPosture || anyAttackedAnything) {
            op.idle_execution_turn_streak = 0;
            op.last_result = 'approach';
            op.momentum = 0;
            op.movement_only_execution_turns = (op.movement_only_execution_turns ?? 0) + 1;
        } else {
            if (anyMoved) {
                // Approach movement: brigade is marching toward objective.
                // Not a combat failure — don't increment failure counts.
                op.movement_only_execution_turns = (op.movement_only_execution_turns ?? 0) + 1;
                op.idle_execution_turn_streak = 0;
                op.last_result = 'approach';
                op.momentum = 0;
            } else {
                // Truly idle: no movement, no attack.
                op.idle_execution_turn_streak = (op.idle_execution_turn_streak ?? 0) + 1;
                op.last_result = 'stalemate';
                op.momentum = 0;
                op.failure_count = (op.failure_count ?? 0) + 1;
                op.consecutive_failures_on_current = (op.consecutive_failures_on_current ?? 0) + 1;
            }

            // Idle stall: 4-turn threshold (matching multi-axis path) to give brigades
            // time to march from staging to objectives via regular movement (1 hop/turn).
            const idleStallThreshold = op.type === 'probe' ? 1 : 4;
            if (!anyMoved && (op.attack_attempt_count ?? 0) === 0 && (op.idle_execution_turn_streak ?? 0) >= idleStallThreshold) {
                op.movement_only_execution_turns = Math.max(1, op.movement_only_execution_turns ?? 0);
                beginRecovery(op, turn, getNoAttemptRecoveryReason(op), state);
                return;
            }

            // Movement-only stall: brigades are marching but not attacking objectives.
            // Happens when brigades can't reach objectives or fail probe thresholds.
            // Abort before wasting the entire command cycle.
            if ((op.movement_only_execution_turns ?? 0) >= MAX_MOVEMENT_ONLY_EXECUTION_TURNS) {
                beginRecovery(op, turn, getNoAttemptRecoveryReason(op), state);
                return;
            }

        }
    }

    if ((op.current_objective_index ?? 0) >= objectives.length) {
        const resolution = resolveCompletionOrReopen(state, corpsId, op, faction, turn);
        if (resolution !== 'reopened') beginRecovery(op, turn, resolution, state);
    }
    if ((op.failure_count ?? 0) >= MAX_TOTAL_FAILURES) {
        beginRecovery(op, turn, getNoAttemptRecoveryReason(op), state);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Operation reevaluation — detect and abort weakened operations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fraction of initial_strength below which the operation is aborted.
 * 50% = if the force has lost half its starting personnel, the op is no
 * longer viable regardless of how many brigades remain nominally assigned.
 */
const POWER_ATTRITION_ABORT_THRESHOLD = 0.50;

/** Reevaluation log entry (diagnostic — attached to operation for traceability). */
export interface ReevaluationLogEntry {
    turn: number;
    reason: string;
    decision: 'continue' | 'abort';
    active_brigades: number;
    total_personnel: number;
}

/**
 * Reevaluate all active operations for viability after brigade mutations.
 *
 * Called after brigade dissolution, lifecycle events, and combat resolution
 * but BEFORE bot order generation. Detects operations that have lost too
 * many brigades (through dissolution, emergency retreat, or combat death)
 * and cannot feasibly continue. Such operations are aborted into recovery
 * to free the corps slot.
 *
 * Decision tree per operation:
 *   1. Count active participating brigades (alive + active status).
 *   2. If 0 active brigades → abort (empty operation, slot blocked).
 *   3. If below type minimum → abort (cannot achieve objectives).
 *   4. If remaining personnel < 50% of initial_strength → abort (spent force).
 *   5. For multi-axis: stall any axis with 0 active brigades.
 *   6. Otherwise → continue (operation still viable).
 *
 * Deterministic: sorted corps iteration via strictCompare.
 */
export function reevaluateWeakenedOperations(state: GameState): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;
    const formations = state.military.formations ?? {};
    const turn = state.meta?.turn ?? 0;

    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        if (!cmd || cmd.active_operations.length === 0) continue;

        for (const op of [...cmd.active_operations]) {

        // Only reevaluate operations in planning or execution phase.
        // Recovery-phase operations are already winding down.
        if (op.phase === 'recovery') continue;

        // Count active participating brigades and total personnel.
        // Always use participating_brigades (consistent with how initial_strength is set in
        // operation_aar.ts). getAllAxisBrigades would under-count when reconcilePlanningObjectives
        // prunes a stale axis but leaves its brigades in participating_brigades.
        const multiAxis = isMultiAxis(op);
        const allBrigadeIds = op.participating_brigades;
        let activeBrigadeCount = 0;
        let totalPersonnel = 0;
        for (const bid of allBrigadeIds) {
            const f = formations[bid];
            if (!f || f.status !== 'active') continue;
            activeBrigadeCount++;
            totalPersonnel += f.personnel ?? 0;
        }

        // --- Decision: should this operation be aborted? ---
        const minRequired = effectiveOperationMinimum(op.type, op.minimum_viable_participants);
        let abortReason: string | null = null;

        if (activeBrigadeCount === 0) {
            abortReason = 'zero_active_brigades';
        } else if (activeBrigadeCount < minRequired) {
            abortReason = `below_minimum_brigades (${activeBrigadeCount}/${minRequired})`;
        } else if (op.initial_strength && op.initial_strength > 0
            && totalPersonnel < op.initial_strength * POWER_ATTRITION_ABORT_THRESHOLD) {
            abortReason = `power_attrition (${totalPersonnel}/${op.initial_strength}, threshold ${POWER_ATTRITION_ABORT_THRESHOLD})`;
        }

        // For multi-axis operations: stall any axis with 0 active brigades,
        // even if the operation as a whole continues.
        if (multiAxis && op.axes && !abortReason) {
            for (const axis of op.axes) {
                if (axis.status !== 'executing') continue;
                // An explicit late-phase handoff deliberately leaves its destination empty
                // until the operation-owned prerequisite capture is received. Keep that
                // holding axis eligible for the handoff; every other empty axis still stalls.
                if (axis.late_phase?.phase === 'holding' && axis.late_phase.handoff !== undefined) continue;
                let axisActive = 0;
                for (const bid of axis.assigned_brigades) {
                    const f = formations[bid];
                    if (f && f.status === 'active') axisActive++;
                }
                if (axisActive === 0) {
                    axis.status = 'stalled';
                }
            }
            // After stalling empty axes, if ALL axes are now terminal, abort the operation
            if (allAxesTerminal(op.axes)) {
                const anyComplete = op.axes.some(a => a.status === 'complete');
                abortReason = anyComplete ? null : 'all_axes_stalled';
                if (anyComplete) {
                    // Some axes completed, treat as partial success — enter recovery normally,
                    // unless a lost credited objective reopens the operation (FARZ-END).
                    const faction: FactionId = formations[corpsId]?.faction ?? 'RS';
                    const resolution = resolveCompletionOrReopen(state, corpsId, op, faction, turn);
                    if (resolution === 'reopened') continue;
                    beginRecovery(op, turn, resolution, state, corpsId);
                    appendReevaluationLog(op, turn, 'abort', activeBrigadeCount, totalPersonnel,
                        'all_axes_terminal_partial_success');
                    continue;
                }
            }
        }

        // Append diagnostic log
        if (abortReason) {
            // Abort: enter recovery with brigade_attrition reason
            beginRecovery(op, turn, 'brigade_attrition', state, corpsId);
            appendReevaluationLog(op, turn, 'abort', activeBrigadeCount, totalPersonnel, abortReason);

            // Clean up participating_brigades: remove inactive brigade IDs
            // so recovery/finalization doesn't reference dead formations
            if (multiAxis && op.axes) {
                for (const axis of op.axes) {
                    axis.assigned_brigades = axis.assigned_brigades.filter(bid => {
                        const f = formations[bid];
                        return f && f.status === 'active';
                    });
                    if (axis.status === 'executing') axis.status = 'stalled';
                }
            }
            op.participating_brigades = op.participating_brigades.filter(bid => {
                const f = formations[bid];
                return f && f.status === 'active';
            });
        }
        }
    }
}

/** Append a reevaluation log entry to the operation. */
function appendReevaluationLog(
    op: CorpsOperation,
    turn: number,
    decision: 'continue' | 'abort',
    activeBrigades: number,
    totalPersonnel: number,
    reason: string,
): void {
    if (!op.reevaluation_log) op.reevaluation_log = [];
    op.reevaluation_log.push({
        turn,
        reason,
        decision,
        active_brigades: activeBrigades,
        total_personnel: totalPersonnel,
    });
}

/**
 * Evaluate progress of active operations and advance/abort them.
 * Handles general_offensive and strategic_defense op types.
 * sector_attack, probe, and feint have their own lifecycle in advanceSectorOffensives().
 * Called each turn for active operations.
 */
export function evaluateOperationProgress(
    state: GameState,
    faction: FactionId
): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;
    const pc = state.political.political_controllers ?? {};
    const formations = state.military.formations ?? {};

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!hasActiveOperation(cmd)) continue;

        for (const op of [...cmd.active_operations]) {
            // Sector ops are owned by advanceSectorOffensives; reorganization is
            // owned by corps_command.advanceOperations on its canonical 3/4/3 clock.
            if (
                op.type === 'sector_attack'
                || op.type === 'probe'
                || op.type === 'feint'
                || op.type === 'reorganization'
            ) continue;

            const turnsInPhase = turn - op.phase_started_turn;

            if (op.phase === 'planning') {
                // Advance to execution after planning duration
                if (turnsInPhase >= PLANNING_DURATION) {
                    op.phase = 'execution';
                    op.phase_started_turn = turn;
                    // ADR-0005 Phase 2: general_offensive + strategic_defense (emergency)
                    // ops transition planning→execution HERE (not in advanceSectorOffensives).
                    // Route them through TG formation so emergency reactions ('limited' policy
                    // → ≤2 donors) and any general_offensive ('full') form a TG. Idempotent +
                    // policy-gated. Flag-off: early-return, byte-identical.
                    formTgsAtReadyTransition(state, op, turn);
                    markOperationExecuting(state, corps.id, op);
                }
            } else if (op.phase === 'execution') {
                const tgExhaustionReason = evaluateOperationTacticalGroupExhaustion(state, corps.id, op, turn);
                if (tgExhaustionReason != null) {
                    beginRecovery(op, turn, tgExhaustionReason, state, corps.id);
                    continue;
                }
                // Check progress
                const targets = op.target_settlements ?? [];
                if (targets.length > 0) {
                    const captured = targets.filter(sid => pc[sid] === faction).length;
                    const captureRate = captured / targets.length;

                    // Only captured objectives constitute success. Early failure and
                    // execution timeout retain the existing attempt-history diagnostic.
                    if (captureRate >= PROGRESS_SUCCESS_THRESHOLD) {
                        beginRecovery(op, turn, 'completed', state, corps.id);
                        continue;
                    }

                    if (
                        (turnsInPhase >= 2 && captureRate < PROGRESS_FAILURE_THRESHOLD)
                        || turnsInPhase >= EXECUTION_MAX_DURATION
                    ) {
                        beginRecovery(op, turn, getNoAttemptRecoveryReason(op), state, corps.id);
                        continue;
                    }
                } else if (turnsInPhase >= EXECUTION_MAX_DURATION) {
                    beginRecovery(op, turn, getNoAttemptRecoveryReason(op), state, corps.id);
                    continue;
                }

                // Replace heavily damaged brigades
                const updatedParticipants: FormationId[] = [];
                const replacementMap = new Map<FormationId, FormationId>();
                for (const brigId of op.participating_brigades) {
                    const brig = formations[brigId];
                    if (!brig || brig.status !== 'active') continue;
                    // Below the healthy line against its own designed strength (RF-STRENGTH 2026-11-15;
                    // was the 3,000 cap, which read every full ARBiH/VRS brigade as heavily damaged).
                    // Strength at op start is not recorded per brigade.
                    const lossRate = 1 - designedStrengthFraction(brig);
                    if (lossRate > BRIGADE_LOSS_THRESHOLD) {
                        // Try to find a replacement from the same corps
                        const subordinates = getCorpsSubordinates(state, corps.id);
                        const replacement = subordinates.find(s =>
                            !op.participating_brigades.includes(s.id) &&
                            !updatedParticipants.includes(s.id) &&
                            findBrigadeLiveOperationAnywhere(state, s.id) === null &&
                            mayEliteJoinOperation(s.id, turn, op.name) &&
                            designedStrengthFraction(s) >= PERSONNEL_HEALTHY_THRESHOLD &&
                            (s.cohesion ?? 60) >= COHESION_HEALTHY_THRESHOLD
                        );
                        if (replacement) {
                            updatedParticipants.push(replacement.id);
                            replacementMap.set(brigId, replacement.id);
                            continue;
                        }
                    }
                    updatedParticipants.push(brigId);
                }
                op.participating_brigades = updatedParticipants;
                if (replacementMap.size > 0 && Array.isArray(op.axes)) {
                    for (const axis of op.axes) {
                        axis.assigned_brigades = axis.assigned_brigades
                            .map((brigadeId) => replacementMap.get(brigadeId) ?? brigadeId)
                            .filter((brigadeId, index, ids) => ids.indexOf(brigadeId) === index);
                    }
                }
            } else if (op.phase === 'recovery') {
                // Clear operation after recovery duration
                if (turnsInPhase >= RECOVERY_DURATION) {
                    releaseOperationCommanders(state, op);
                    completeOperationLifecycle(state, corps.id, op);
                    removeOperation(cmd, op);
                    // Add exhaustion from the operation
                    const exhBefore = cmd.corps_exhaustion;
                    cmd.corps_exhaustion = Math.min(100, cmd.corps_exhaustion + 15);
                    emitCorpsExhaustionRecord(() => ({
                        turn, corps_id: corps.id, faction, source: 'named_op_completion',
                        before: exhBefore, after: cmd.corps_exhaustion,
                        op_name: op.name, op_type: op.type, recovery_reason: op.recovery_reason ?? null,
                    }));
                }
            }
        }
    }
}
