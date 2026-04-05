/**
 * plan.ts — PLAN phase for v0.8 Corps Commander Intelligence.
 *
 * Manages multi-turn commander intentions. A plan represents a sustained
 * operational objective: "Take Jajce in 4 weeks, concentrate 5 brigades at
 * Donji Vakuf." Plans are intentions, not orders — the EMIT phase converts
 * ready plans into actual CorpsOperations.
 *
 * Lifecycle: create → concentrating → ready → executing → (done via EMIT)
 *            create → concentrating → suspended → abandoned (if conditions worsen)
 *
 * Besieged Corps Rule: encircled corps (5th Corps Bihac) can still plan LOCAL
 * ops within 2 hops of zone boundary, but cannot plan distant offensives.
 *
 * Deterministic: strictCompare for all sorting, no Math.random(), no Date.now().
 */

import type { FormationId } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { spatialFriendlyDistance, spatialSameComponent } from '../../spatial_context.js';

import type {
    CommanderBriefing,
    CommanderDecisionTrace,
    CommanderIntentCandidate,
    CommanderIntentType,
    CommanderLesson,
    CommanderPlan,
    CommanderPlanStatus,
    ZoneAssessment,
    ZoneId,
    ForceAssessment,
    BrigadeEvaluation,
} from './commander_state.js';

import { BESIEGED_SURPLUS_HOP_LIMIT } from './allocate.js';
import { CRITICAL_MORALE_THRESHOLD } from '../combat_math.js';
import { MAX_EXHAUSTION_FOR_OPERATION } from '../bot_constants.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum surplus brigades required to create a plan. */
export const MIN_BRIGADES_FOR_PLAN = 3;

/**
 * Number of turns an OSID from a failed operation stays on cooldown.
 * Prevents re-attacking the same OSID immediately after a catastrophic outcome.
 * Transient and op-scoped — computed in-memory at plan creation, never stored in GameState.
 */
const CATASTROPHIC_OSID_COOLDOWN_TURNS = 4;

/** Fraction of required brigades at staging before plan is 'ready'. */
export const CONCENTRATION_READY_THRESHOLD = 0.8;

/** Turns of suspension before a plan is abandoned. */
export const MAX_SUSPENSION_TURNS = 3;

/** Brigades that can concentrate per turn (movement rate). */
export const PLAN_CONCENTRATION_RATE = 2;

/** Viability score below which a plan is abandoned. */
const VIABILITY_ABANDON_THRESHOLD = 0.2;

/** Score penalty applied when supply belief is critically low (< 0.2). Strong preference, not hard block. */
const CRITICAL_SUPPLY_PENALTY = 0.50;

/** Enemy tanks/artillery at or above this threshold force an extra brigade in planning. */
const HEAVY_ENEMY_TANK_THRESHOLD = 12;
const HEAVY_ENEMY_ARTILLERY_THRESHOLD = 12;
const HIGH_AVG_FATIGUE_PCT_FOR_NEW_PLAN = 65;

/** Max BFS hops from brigade location to objective approach OSID (matches emit.ts). */
const MAX_REACHABILITY_HOPS = 8;

function getEnemyEquipmentBrigadeBump(briefing: CommanderBriefing): number {
    const summary = briefing.enemy_equipment_summary;
    if (summary.infantry_only) return 0;
    if (
        summary.tanks >= HEAVY_ENEMY_TANK_THRESHOLD ||
        summary.artillery >= HEAVY_ENEMY_ARTILLERY_THRESHOLD
    ) {
        return 1;
    }
    return 0;
}

function getFatigueBlockReason(briefing: CommanderBriefing): string | null {
    if (briefing.avg_fatigue_pct >= HIGH_AVG_FATIGUE_PCT_FOR_NEW_PLAN) {
        return `average brigade fatigue ${briefing.avg_fatigue_pct}% too high for a fresh operation`;
    }
    return null;
}

function getCampaignRoleBlockReason(briefing: CommanderBriefing): string | null {
    if (briefing.campaign_role === 'economy' || briefing.campaign_role === 'contain') {
        return `campaign role ${briefing.campaign_role} forbids a fresh offensive plan`;
    }
    return null;
}

function getSyncRoleBlockReason(briefing: CommanderBriefing): string | null {
    if (briefing.campaign_sync_role === 'feint' || briefing.campaign_sync_role === 'fixing') {
        return `synchronized role ${briefing.campaign_sync_role} forbids a fresh offensive plan`;
    }
    return null;
}

function getPriorityTargetSet(briefing: CommanderBriefing): Set<string> {
    const syncTargets =
        briefing.campaign_sync_role === 'main_effort' || briefing.campaign_sync_role === 'supporting'
            ? briefing.campaign_sync_targets
            : [];
    const preferredTargets = syncTargets.length > 0 ? syncTargets : briefing.campaign_offensive_targets;
    return new Set(preferredTargets);
}

// ═══════════════════════════════════════════════════════════════════════════
// buildCatastrophicOsidCooldownSet — transient cooldown for failed objectives
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Builds an in-memory set of OSIDs that are on cooldown due to recent operation
 * failures. Only considers entries from the current operation window
 * (within CATASTROPHIC_OSID_COOLDOWN_TURNS turns).
 *
 * Canon constraint: this is transient and op-scoped — computed fresh each time
 * plan creation runs. It does NOT persist in GameState and does NOT function as
 * a faction-level or cross-operation exclusion list. This is categorically
 * different from the banned `avoided_osids_by_faction`.
 */
function buildCatastrophicOsidCooldownSet(
    briefing: CommanderBriefing,
    currentTurn: number,
): Set<string> {
    const cooldown = new Set<string>();
    const history = briefing.previous_state?.operation_history;
    if (!history) return cooldown;
    for (const entry of history) {
        if (entry.osids_lost.length === 0) continue;
        if ((currentTurn - entry.ended_turn) < CATASTROPHIC_OSID_COOLDOWN_TURNS) {
            for (const osid of entry.osids_lost) {
                cooldown.add(osid);
            }
        }
    }
    return cooldown;
}

// ═══════════════════════════════════════════════════════════════════════════
// PlanDecision — output of managePlan
// ═══════════════════════════════════════════════════════════════════════════

export interface PlanDecision {
    /** Updated or new plan, or null if no active plan. */
    plan: CommanderPlan | null;
    /** What happened to the plan this turn. */
    action: 'created' | 'advanced' | 'suspended' | 'abandoned' | 'launched' | 'none';
    /** Reason for the action. */
    reason: string;
    /** Brigades that should be concentrating toward staging zone. */
    concentration_orders: Array<{ brigade_id: FormationId; destination_zone: ZoneId }>;
    /** v0.8.1: Candidate intent competition trace. Only present when a new plan decision was made. */
    decision_trace?: CommanderDecisionTrace;
}

// ═══════════════════════════════════════════════════════════════════════════
// selectWinningIntent — v0.8.1 candidate intent competition
// ═══════════════════════════════════════════════════════════════════════════

/** Priority order for tie-breaking intent competition. Lower index wins. */
const INTENT_PRIORITY_ORDER: readonly CommanderIntentType[] = [
    'reinforce_zone',
    'recall_exposed_brigades',
    'stage_operation',
    'launch_opportunity',
    'thin_quiet_sector',
    'request_army_support',
    'hold_line',
];

/**
 * Generate, score, and select a winning intent from candidate competition.
 * Returns the winning CommanderIntentCandidate (or null if all blocked) plus
 * a full CommanderDecisionTrace for audit.
 *
 * All arithmetic is deterministic: no Math.random(), no Date.now().
 * Tie-breaking uses INTENT_PRIORITY_ORDER then strictCompare on zone_id.
 *
 * v0.8.1 Phase 3.
 */
export function selectWinningIntent(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    forces: ForceAssessment,
    surplusPool: BrigadeEvaluation[],
    turn: number,
    lessons?: readonly CommanderLesson[],
): {
    winner: CommanderIntentCandidate | null;
    trace: CommanderDecisionTrace;
} {
    // ─── Factor computations (all return [0, 1]) ──────────────────────────

    const supplyReadiness: number =
        briefing.previous_state?.belief_state?.supply_continuity_confidence ?? 0.5;

    // Threat ratio: fraction of zones under heavy/critical threat.
    // Use previous_state.threat_assessment if available; else proxy from zone posture.
    const prevThreat = briefing.previous_state?.threat_assessment;
    const threatRatio: number = (() => {
        if (prevThreat) {
            const pressure = prevThreat.overall_pressure;
            if (pressure === 'critical') return 1.0;
            if (pressure === 'heavy')    return 0.75;
            if (pressure === 'moderate') return 0.45;
            return 0.2; // 'low'
        }
        // Proxy: fraction of zones in defending/besieged posture
        if (zones.length === 0) return 0.3;
        const threatened = zones.filter(z => z.posture === 'defending' || z.posture === 'besieged').length;
        return Math.min(1.0, threatened / zones.length);
    })();

    const surplusRatio: number = Math.min(
        1.0,
        forces.total_surplus / Math.max(1, forces.total_brigades * 0.3),
    );

    const exhaustionPenalty: number = Math.max(
        0.0,
        1.0 - briefing.corps_exhaustion / MAX_EXHAUSTION_FOR_OPERATION,
    );

    const fatigueReadiness: number = Math.max(
        0.0,
        1.0 - briefing.avg_fatigue_pct / HIGH_AVG_FATIGUE_PCT_FOR_NEW_PLAN,
    );

    const maxDeficit = zones.length > 0 ? Math.max(...zones.map(z => z.deficit), 0) : 0;
    const deficitUrgency: number = Math.min(1.0, maxDeficit / 4.0);

    const campaignAlignment: number = (() => {
        // FrontPriority.role values: 'primary' | 'secondary' | 'economy' | 'contain'
        const role = briefing.campaign_role;
        if (role === 'primary')      return 1.0;
        if (role === 'secondary')    return 0.75;
        if (role === null || role === undefined) return 0.5;
        if (role === 'contain')      return 0.25;
        // 'economy' or any other
        return 0.0;
    })();

    // ─── Hard-block flag helpers ──────────────────────────────────────────

    const isOffensiveBlockedByExhaustion =
        briefing.corps_exhaustion > MAX_EXHAUSTION_FOR_OPERATION;
    const isOffensiveBlockedByFatigue =
        briefing.avg_fatigue_pct >= HIGH_AVG_FATIGUE_PCT_FOR_NEW_PLAN;
    const isOffensiveBlockedByCampaignRole =
        briefing.campaign_role === 'economy' || briefing.campaign_role === 'contain';
    const isOffensiveBlockedBySyncRole =
        briefing.campaign_sync_role === 'feint' || briefing.campaign_sync_role === 'fixing';
    const isOffensiveBlockedByStance =
        briefing.corps_stance === 'defensive' || briefing.corps_stance === 'reorganize';
    const isOffensiveBlockedByLiveMajorOp = briefing.active_operations.some(
        op => op.phase !== 'recovery' && op.type !== 'probe',
    );
    const isCriticalSupply =
        supplyReadiness < 0.2 && briefing.previous_state?.belief_state != null;

    // ─── Candidate generation ─────────────────────────────────────────────

    const isHeavyOrCriticalPressure =
        prevThreat?.overall_pressure === 'heavy' ||
        prevThreat?.overall_pressure === 'critical' ||
        threatRatio >= 0.6;

    type CandidateDef = {
        type: CommanderIntentType;
        target_zone?: string;
        generate: boolean;
    };

    // "Quiet sector" proxy: a zone that is in balanced/projecting posture AND
    // has surplus brigades AND is NOT at the front under heavy pressure.
    // `is_quiet_for_screening` does not exist on ZoneAssessment; use low deficit +
    // non-besieged + non-defending posture + surplus as the discriminator.
    const hasQuietSector = zones.some(
        z =>
            (z.posture === 'balanced' || z.posture === 'projecting') &&
            z.surplus_brigades.length > 0 &&
            z.deficit === 0,
    );

    const hasExposedBrigade = surplusPool.some(
        ev => ev.is_disrupted || ev.morale < CRITICAL_MORALE_THRESHOLD,
    );

    const candidateDefs: CandidateDef[] = [
        // hold_line — always generated
        { type: 'hold_line', generate: true },

        // reinforce_zone — generated when there is a zone deficit or heavy pressure
        {
            type: 'reinforce_zone',
            generate: zones.some(z => z.deficit > 0) || isHeavyOrCriticalPressure,
        },

        // stage_operation — pre-planned ops + sufficient surplus
        {
            type: 'stage_operation',
            generate:
                briefing.pre_planned_ops.length > 0 &&
                surplusPool.length >= MIN_BRIGADES_FOR_PLAN,
        },

        // launch_opportunity — enough surplus AND a projecting/balanced zone
        {
            type: 'launch_opportunity',
            generate:
                surplusPool.length >= MIN_BRIGADES_FOR_PLAN &&
                zones.some(z => z.posture === 'projecting' || z.posture === 'balanced'),
        },

        // thin_quiet_sector — quiet zone with extractable surplus
        { type: 'thin_quiet_sector', generate: hasQuietSector },

        // recall_exposed_brigades — disrupted or critically-low-morale brigades in surplus
        { type: 'recall_exposed_brigades', generate: hasExposedBrigade },

        // request_army_support — heavy/critical pressure AND no surplus to self-fix
        {
            type: 'request_army_support',
            generate: isHeavyOrCriticalPressure && forces.total_surplus === 0,
        },
    ];

    // Cap at 5: keep hold_line + stage_operation + launch_opportunity + reinforce_zone always,
    // then fill remaining slots by priority: recall > thin > request.
    const PRIORITY_ORDER_FOR_CAP: CommanderIntentType[] = [
        'hold_line',
        'stage_operation',
        'launch_opportunity',
        'reinforce_zone',
        'recall_exposed_brigades',
        'thin_quiet_sector',
        'request_army_support',
    ];
    const MAX_CANDIDATES = 5;

    const qualifiedDefs = candidateDefs.filter(d => d.generate);
    let selectedDefs: CandidateDef[];
    if (qualifiedDefs.length <= MAX_CANDIDATES) {
        selectedDefs = qualifiedDefs;
    } else {
        // Sort by priority order, then slice to MAX_CANDIDATES
        selectedDefs = [...qualifiedDefs].sort((a, b) => {
            const ai = PRIORITY_ORDER_FOR_CAP.indexOf(a.type);
            const bi = PRIORITY_ORDER_FOR_CAP.indexOf(b.type);
            return ai - bi;
        }).slice(0, MAX_CANDIDATES);
    }

    // ─── Build scored candidates ──────────────────────────────────────────

    // appliedLessonIds accumulates across candidates via closure (set in lesson delta block).
    const appliedLessonIds = new Set<string>();
    // appliedRelationshipIds accumulates across candidates via closure (set in relationship delta block).
    const appliedRelationshipIds = new Set<string>();

    const allCandidates: CommanderIntentCandidate[] = selectedDefs.map(def => {
        const { type } = def;
        const targetZone = def.target_zone;
        const intentId = `${type}:${turn}:${targetZone ?? 'corps'}`;

        // Compute score and breakdown
        let score: number;
        let score_breakdown: Record<string, number>;

        switch (type) {
            case 'hold_line': {
                const t = 0.4 * threatRatio;
                const s = 0.3 * (1 - surplusRatio);
                const r = 0.3 * (1 - supplyReadiness);
                score = t + s + r;
                score_breakdown = { threat_ratio: t, surplus_inverse: s, supply_inverse: r };
                break;
            }
            case 'reinforce_zone': {
                const d = 0.45 * deficitUrgency;
                const t = 0.30 * threatRatio;
                const s = 0.25 * (1 - surplusRatio);
                score = d + t + s;
                score_breakdown = { deficit_urgency: d, threat_ratio: t, surplus_inverse: s };
                break;
            }
            case 'stage_operation': {
                const r = 0.25 * supplyReadiness;
                const s = 0.25 * surplusRatio;
                const t = 0.20 * (1 - threatRatio);
                const e = 0.15 * exhaustionPenalty;
                const f = 0.10 * fatigueReadiness;
                const c = 0.05 * campaignAlignment;
                score = r + s + t + e + f + c;
                score_breakdown = {
                    supply_readiness: r,
                    surplus_ratio: s,
                    threat_inverse: t,
                    exhaustion_penalty: e,
                    fatigue_readiness: f,
                    campaign_alignment: c,
                };
                // Critical supply: strong soft penalty (reclassified from hard block in Phase 5)
                if (isCriticalSupply) {
                    score -= CRITICAL_SUPPLY_PENALTY;
                    score_breakdown = { ...score_breakdown, critical_supply_penalty: -CRITICAL_SUPPLY_PENALTY };
                }
                break;
            }
            case 'launch_opportunity': {
                const s = 0.30 * surplusRatio;
                const r = 0.25 * supplyReadiness;
                const t = 0.20 * (1 - threatRatio);
                const e = 0.15 * exhaustionPenalty;
                const f = 0.10 * fatigueReadiness;
                score = s + r + t + e + f;
                score_breakdown = {
                    surplus_ratio: s,
                    supply_readiness: r,
                    threat_inverse: t,
                    exhaustion_penalty: e,
                    fatigue_readiness: f,
                };
                // Critical supply: strong soft penalty (reclassified from hard block in Phase 5)
                if (isCriticalSupply) {
                    score -= CRITICAL_SUPPLY_PENALTY;
                    score_breakdown = { ...score_breakdown, critical_supply_penalty: -CRITICAL_SUPPLY_PENALTY };
                }
                break;
            }
            case 'thin_quiet_sector': {
                const s = 0.35 * (1 - surplusRatio);
                const t = 0.40 * (1 - threatRatio);
                const r = 0.25 * supplyReadiness;
                score = s + t + r;
                score_breakdown = { surplus_inverse: s, threat_inverse: t, supply_readiness: r };
                break;
            }
            case 'recall_exposed_brigades': {
                const disruptedCount = surplusPool.filter(
                    ev => ev.is_disrupted || ev.morale < CRITICAL_MORALE_THRESHOLD,
                ).length;
                const disruptionRatio = disruptedCount / Math.max(1, surplusPool.length);
                const d = 0.55 * disruptionRatio;
                const t = 0.30 * threatRatio;
                const r = 0.15 * (1 - supplyReadiness);
                score = d + t + r;
                score_breakdown = { disruption_ratio: d, threat_ratio: t, supply_inverse: r };
                break;
            }
            case 'request_army_support': {
                const t = 0.50 * threatRatio;
                const d = 0.30 * deficitUrgency;
                const r = 0.20 * (1 - supplyReadiness);
                score = t + d + r;
                score_breakdown = { threat_ratio: t, deficit_urgency: d, supply_inverse: r };
                break;
            }
            default: {
                score = 0;
                score_breakdown = {};
            }
        }

        // ─── Personality modifiers (additive post-score) ──────────────────────────
        const personality = briefing.officer_personality;
        let personalityDelta = 0;
        const isOffensiveIntent = type === 'stage_operation' || type === 'launch_opportunity';
        const isDefensiveIntent = type === 'hold_line' || type === 'reinforce_zone';

        if (isOffensiveIntent) {
            personalityDelta += (personality.aggression - 0.5) * 0.20;
            personalityDelta += (personality.initiative - 0.5) * 0.08;
        }
        if (isDefensiveIntent) {
            personalityDelta += (personality.caution - 0.5) * 0.20;
        }

        if (personalityDelta !== 0) {
            score += personalityDelta;
            score_breakdown = { ...score_breakdown, personality_delta: personalityDelta };
        }

        // ─── Lesson modifiers (additive post-score) ───────────────────────────
        let lessonDelta = 0;
        const sortedLessons = [...(lessons ?? [])].sort((a, b) => strictCompare(a.lesson_id, b.lesson_id));

        for (const lesson of sortedLessons) {
            // Skip expired lessons (defensive; emit.ts should have filtered these)
            if (lesson.expires_turn !== undefined && lesson.expires_turn <= turn) continue;

            const isRelevantToZone = !lesson.zone_id || lesson.zone_id === (targetZone ?? null);
            if (!isRelevantToZone) continue;

            let delta = 0;
            if (lesson.category === 'offensive_failure' && isOffensiveIntent) {
                delta = lesson.weight; // negative weight dampens offensive
            } else if (lesson.category === 'success_pattern' && isOffensiveIntent) {
                delta = lesson.weight; // positive weight boosts offensive
            }
            // Other categories deferred to Phase 5/6

            if (delta !== 0) {
                lessonDelta += delta;
                appliedLessonIds.add(lesson.lesson_id);
            }
        }

        // Cap lesson delta to prevent runaway accumulation
        const LESSON_DELTA_CAP = 0.35;
        lessonDelta = Math.max(-LESSON_DELTA_CAP, Math.min(LESSON_DELTA_CAP, lessonDelta));

        if (lessonDelta !== 0) {
            score += lessonDelta;
            score_breakdown = { ...score_breakdown, lesson_delta: lessonDelta };
        }

        // ─── Relationship modifiers (additive post-score) ───────────────────────
        const relationships = briefing.previous_state?.relationships;
        let relationshipDelta = 0;
        const appliedRelationshipKeys: string[] = [];

        if (relationships) {
            const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

            if (type === 'stage_operation' || type === 'launch_opportunity') {
                // player_trust: player confidence in this commander boosts offensive willingness
                const ptDelta = clamp((relationships.player_trust - 0.5) * 0.12, -0.06, 0.06);
                if (ptDelta !== 0) {
                    relationshipDelta += ptDelta;
                    appliedRelationshipKeys.push(`player_trust:${type}`);
                }
            }

            if (type === 'stage_operation') {
                // patron_alignment × campaignAlignment: obedience to political authority
                // Only fires when campaign has assigned a meaningful role
                const paDelta = clamp((relationships.patron_alignment - 0.5) * campaignAlignment * 0.12, -0.06, 0.06);
                if (paDelta !== 0) {
                    relationshipDelta += paDelta;
                    appliedRelationshipKeys.push(`patron_alignment:stage_operation`);
                }
            }

            if (type === 'request_army_support') {
                // sibling_corps_trust (avg): trust in neighbors affects willingness to request HQ support
                const sibValues = Object.values(relationships.sibling_corps_trust);
                const avgSiblingTrust = sibValues.length > 0
                    ? sibValues.reduce((a, b) => a + b, 0) / sibValues.length
                    : 0.5;
                const stDelta = clamp((avgSiblingTrust - 0.5) * 0.12, -0.06, 0.06);
                if (stDelta !== 0) {
                    relationshipDelta += stDelta;
                    appliedRelationshipKeys.push(`sibling_corps_trust:request_army_support`);
                }
            }

            // Outer cap: ±0.15
            const RELATIONSHIP_DELTA_CAP = 0.15;
            relationshipDelta = Math.max(-RELATIONSHIP_DELTA_CAP, Math.min(RELATIONSHIP_DELTA_CAP, relationshipDelta));
        }

        if (relationshipDelta !== 0) {
            score += relationshipDelta;
            score_breakdown = { ...score_breakdown, relationship_delta: relationshipDelta };
        }

        for (const k of appliedRelationshipKeys) appliedRelationshipIds.add(k);

        // ─── Hard-block rules ─────────────────────────────────────────────
        const blockedBy: string[] = [];
        const isOffensive = type === 'stage_operation' || type === 'launch_opportunity';

        if (isOffensive) {
            if (isOffensiveBlockedByExhaustion)
                blockedBy.push('corps_exhaustion_exceeds_threshold');
            if (isOffensiveBlockedByFatigue)
                blockedBy.push('average_fatigue_too_high');
            if (isOffensiveBlockedByCampaignRole)
                blockedBy.push('campaign_role_forbids_offensive');
            if (isOffensiveBlockedBySyncRole)
                blockedBy.push('sync_role_forbids_offensive');
            if (isOffensiveBlockedByStance)
                blockedBy.push('corps_stance_forbids_offensive');
            if (isOffensiveBlockedByLiveMajorOp)
                blockedBy.push('major_operation_already_active');
        }

        if (type === 'request_army_support' && forces.total_surplus > 0) {
            blockedBy.push('surplus_available_no_hq_request');
        }

        return {
            intent_id: intentId,
            type,
            // ZoneId is a branded string; cast is safe — values come from zone_id fields.
            target_zone: targetZone as ZoneId | undefined,
            score,
            score_breakdown,
            blocked_by: blockedBy,
        } satisfies CommanderIntentCandidate;
    });

    // ─── Winner selection ─────────────────────────────────────────────────

    const eligibleCandidates = allCandidates.filter(c => c.blocked_by.length === 0);

    let winner: CommanderIntentCandidate | null = null;
    if (eligibleCandidates.length > 0) {
        const sorted = [...eligibleCandidates].sort((a, b) => {
            // Primary: score descending
            const scoreDiff = b.score - a.score;
            if (Math.abs(scoreDiff) > 1e-9) return scoreDiff > 0 ? 1 : -1;
            // Tie-break 1: intent type priority (lower index wins)
            const ai = INTENT_PRIORITY_ORDER.indexOf(a.type);
            const bi = INTENT_PRIORITY_ORDER.indexOf(b.type);
            if (ai !== bi) return ai - bi;
            // Tie-break 2: zone_id lexicographic
            return strictCompare(a.target_zone ?? 'corps', b.target_zone ?? 'corps');
        });
        winner = sorted[0] ?? null;
    }

    // ─── Trace ────────────────────────────────────────────────────────────

    const trace: CommanderDecisionTrace = {
        turn,
        winning_intent_id: winner?.intent_id ?? null,
        candidates: allCandidates,
        hard_constraints: [...new Set(allCandidates.flatMap(c => [...c.blocked_by]))].sort(strictCompare),
        lessons_applied: [...appliedLessonIds].sort(strictCompare),
        relationships_applied: [...appliedRelationshipIds].sort(strictCompare),
    };

    return { winner, trace };
}

// ═══════════════════════════════════════════════════════════════════════════
// managePlan — main entry point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Manage the commander's multi-turn plan:
 * 1. If no plan exists, evaluate whether to create one (pre-planned ops first, then opportunity).
 * 2. If plan exists, advance it (check viability, update concentration progress).
 * 3. Plans can be suspended (threat on flank) or abandoned (lost too many brigades).
 */
export function managePlan(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    forces: ForceAssessment,
    surplusPool: BrigadeEvaluation[],
    previousPlan: CommanderPlan | null,
    turn: number,
): PlanDecision {
    // If we have an existing plan, manage its lifecycle
    if (previousPlan) {
        return advanceExistingPlan(briefing, zones, forces, surplusPool, previousPlan, turn);
    }

    // No existing plan — evaluate whether to create one.
    // Defensive / reorganizing corps do not initiate new offensive plans.
    if (briefing.corps_stance === 'defensive' || briefing.corps_stance === 'reorganize') {
        return {
            plan: null,
            action: 'none',
            reason: `corps in ${briefing.corps_stance} stance — no new plans`,
            concentration_orders: [],
            decision_trace: {
                turn,
                winning_intent_id: null,
                candidates: [],
                hard_constraints: ['corps_stance_forbids_offensive'],
                lessons_applied: [],
                relationships_applied: [],
            },
        };
    }

    if (briefing.corps_exhaustion > MAX_EXHAUSTION_FOR_OPERATION) {
        return {
            plan: null,
            action: 'none',
            reason: `corps exhaustion ${briefing.corps_exhaustion} above operation threshold ${MAX_EXHAUSTION_FOR_OPERATION}`,
            concentration_orders: [],
            decision_trace: {
                turn,
                winning_intent_id: null,
                candidates: [],
                hard_constraints: ['corps_exhaustion_exceeds_threshold'],
                lessons_applied: [],
                relationships_applied: [],
            },
        };
    }

    const fatigueBlockReason = getFatigueBlockReason(briefing);
    if (fatigueBlockReason) {
        return {
            plan: null,
            action: 'none',
            reason: fatigueBlockReason,
            concentration_orders: [],
            decision_trace: {
                turn,
                winning_intent_id: null,
                candidates: [],
                hard_constraints: ['average_fatigue_too_high'],
                lessons_applied: [],
                relationships_applied: [],
            },
        };
    }

    const campaignRoleBlockReason = getCampaignRoleBlockReason(briefing);
    if (campaignRoleBlockReason) {
        return {
            plan: null,
            action: 'none',
            reason: campaignRoleBlockReason,
            concentration_orders: [],
            decision_trace: {
                turn,
                winning_intent_id: null,
                candidates: [],
                hard_constraints: ['campaign_role_forbids_offensive'],
                lessons_applied: [],
                relationships_applied: [],
            },
        };
    }

    const syncRoleBlockReason = getSyncRoleBlockReason(briefing);
    if (syncRoleBlockReason) {
        return {
            plan: null,
            action: 'none',
            reason: syncRoleBlockReason,
            concentration_orders: [],
            decision_trace: {
                turn,
                winning_intent_id: null,
                candidates: [],
                hard_constraints: ['sync_role_forbids_offensive'],
                lessons_applied: [],
                relationships_applied: [],
            },
        };
    }

    // Guard: if this corps already has a live non-recovery, non-probe op, do not create a new plan.
    // Probes are independent of the plan system (created directly in emit.ts when ops.length === 0)
    // and must not block opportunity plan creation — otherwise corps with only probes running
    // (e.g. arbih_1st_corps) are starved of sector_attack ops indefinitely.
    const hasLiveMajorOp = briefing.active_operations.some(
        op => op.phase !== 'recovery' && op.type !== 'probe'
    );
    if (hasLiveMajorOp) {
        return {
            plan: null,
            action: 'none',
            reason: 'major operation already active for this corps',
            concentration_orders: [],
            decision_trace: {
                turn,
                winning_intent_id: null,
                candidates: [],
                hard_constraints: ['major_operation_already_active'],
                lessons_applied: [],
                relationships_applied: [],
            },
        };
    }

    // v0.8.1 Phase 3: Candidate intent competition.
    // Run the competition to determine what the commander *wants* to do this turn.
    // The existing stance/exhaustion/fatigue/role guards above already enforce the same
    // hard-block conditions, so any `stage_operation` or `launch_opportunity` winner
    // here is already known-eligible for offensive planning.
    const { winner, trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn, briefing.previous_state?.lessons);

    // Route based on winning intent type.
    // When competition selects an offensive intent, preserve original priority ordering:
    // pre-planned ops take precedence over opportunity even when launch_opportunity scored higher.
    const offensiveWinner =
        winner?.type === 'stage_operation' || winner?.type === 'launch_opportunity';

    if (offensiveWinner) {
        // Priority 1: pre-planned operations (always attempted first when eligible)
        const prePlannedDecision = tryCreateFromPrePlanned(briefing, zones, surplusPool, forces.tier_counts.main_effort, turn);
        if (prePlannedDecision) return { ...prePlannedDecision, decision_trace: trace };

        // Priority 2: opportunity (weak/undefended enemy zone adjacent to surplus)
        const opportunityDecision = tryCreateFromOpportunity(briefing, zones, forces, surplusPool, turn);
        if (opportunityDecision) return { ...opportunityDecision, decision_trace: trace };

        // Offensive winner but underlying plan functions returned null (e.g. no reachable targets).
        return { plan: null, action: 'none', reason: 'no viable plan available', concentration_orders: [], decision_trace: trace };
    }

    // Non-offensive intent won (hold_line, reinforce_zone, thin_quiet_sector,
    // recall_exposed_brigades, request_army_support) or all candidates were blocked.
    return {
        plan: null,
        action: 'none',
        reason: winner
            ? `intent competition selected ${winner.type}`
            : 'all candidates blocked',
        concentration_orders: [],
        decision_trace: trace,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// advanceExistingPlan — lifecycle management for active plans
// ═══════════════════════════════════════════════════════════════════════════

function advanceExistingPlan(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    forces: ForceAssessment,
    surplusPool: BrigadeEvaluation[],
    plan: CommanderPlan,
    turn: number,
): PlanDecision {
    // Clear already-abandoned plans so new plans can be created next turn.
    // Abandoned plans are stored in state for one turn to allow EMIT to see the reason,
    // but on the NEXT advance they must be cleared rather than re-evaluated.
    if (plan.status === 'abandoned') {
        return { plan: null, action: 'none', reason: 'clearing abandoned plan', concentration_orders: [] };
    }

    // Check for abandon conditions first
    const abandonReason = checkAbandonConditions(plan, zones, surplusPool, turn);
    if (abandonReason) {
        return {
            plan: { ...plan, status: 'abandoned' },
            action: 'abandoned',
            reason: abandonReason,
            concentration_orders: [],
        };
    }

    // Check for suspend conditions
    const suspendReason = checkSuspendConditions(plan, zones, surplusPool, briefing);
    if (suspendReason) {
        // If already suspended, check duration using suspended_since_turn
        if (plan.status === 'suspended') {
            const suspendedSince = plan.suspended_since_turn ?? turn;
            const suspendedTurns = turn - suspendedSince;
            if (suspendedTurns >= MAX_SUSPENSION_TURNS) {
                return {
                    plan: { ...plan, status: 'abandoned' },
                    action: 'abandoned',
                    reason: `suspended for ${suspendedTurns} turns: ${suspendReason}`,
                    concentration_orders: [],
                };
            }
        }
        // Record the turn suspension started (preserve existing value if already suspended)
        const suspendedSince = plan.status === 'suspended' ? plan.suspended_since_turn : turn;
        return {
            plan: { ...plan, status: 'suspended', suspension_reason: suspendReason, suspended_since_turn: suspendedSince },
            action: 'suspended',
            reason: suspendReason,
            concentration_orders: [],
        };
    }

    // Executing plans have been handed to EMIT — they're done from the planner's perspective.
    // Clear the plan so new plans can be created next turn.
    if (plan.status === 'executing') {
        return {
            plan: null,
            action: 'none',
            reason: 'plan handed to execution pipeline',
            concentration_orders: [],
        };
    }

    // If previously suspended, resume to concentrating
    const effectiveStatus: CommanderPlanStatus = plan.status === 'suspended' ? 'concentrating' : plan.status;

    // Compute concentration progress — time-based, not location-based.
    // Concentration orders are planning artefacts; no downstream system physically
    // moves brigades to the staging zone, so we measure elapsed turns vs target.
    const concentrationDuration = plan.target_ready_turn - plan.created_turn;
    const concentrationProgress = concentrationDuration <= 0
        ? 1.0
        : Math.min(1.0, (turn - plan.created_turn) / concentrationDuration);

    // Compute viability
    const viability = computeViabilityScore(plan, zones, surplusPool);

    if (viability < VIABILITY_ABANDON_THRESHOLD) {
        return {
            plan: { ...plan, status: 'abandoned', viability_score: viability },
            action: 'abandoned',
            reason: `viability dropped to ${viability.toFixed(2)}`,
            concentration_orders: [],
        };
    }

    // Ready check: enough brigades concentrated
    if (effectiveStatus === 'concentrating' && concentrationProgress >= CONCENTRATION_READY_THRESHOLD) {
        const readyPlan: CommanderPlan = {
            ...plan,
            status: 'ready',
            concentration_progress: concentrationProgress,
            viability_score: viability,
            suspended_since_turn: undefined,
        };
        return {
            plan: readyPlan,
            action: 'advanced',
            reason: `concentration complete (${(concentrationProgress * 100).toFixed(0)}%), ready to launch`,
            concentration_orders: [],
        };
    }

    // Launch check: ready for 1+ turns means execute
    if (effectiveStatus === 'ready' || plan.status === 'ready') {
        const launchPlan: CommanderPlan = {
            ...plan,
            status: 'executing',
            concentration_progress: concentrationProgress,
            viability_score: viability,
            suspended_since_turn: undefined,
        };
        return {
            plan: launchPlan,
            action: 'launched',
            reason: 'plan ready, launching operation',
            concentration_orders: [],
        };
    }

    // Still concentrating — issue movement orders
    const concentrationOrders = buildConcentrationOrders(
        plan.assigned_brigades,
        surplusPool,
        plan.staging_zone,
    );

    const advancedPlan: CommanderPlan = {
        ...plan,
        status: effectiveStatus,
        concentration_progress: concentrationProgress,
        viability_score: viability,
    };

    return {
        plan: advancedPlan,
        action: 'advanced',
        reason: `concentrating: ${(concentrationProgress * 100).toFixed(0)}% (turn ${turn} / target ${plan.target_ready_turn})`,
        concentration_orders: concentrationOrders,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// tryCreateFromPrePlanned — adopt pre-planned operations
// ═══════════════════════════════════════════════════════════════════════════

function tryCreateFromPrePlanned(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    surplusPool: BrigadeEvaluation[],
    mainEffortCap: number,
    turn: number,
): PlanDecision | null {
    if (!briefing.pre_planned_ops || briefing.pre_planned_ops.length === 0) return null;

    // Take the first pre-planned op (queue order is priority order)
    const opDef = briefing.pre_planned_ops[0] as Record<string, unknown>;
    if (!opDef) return null;

    const opName = (opDef['name'] as string) ?? 'pre_planned_op';

    // Find the best staging zone: zone with most surplus, preferring projecting posture
    const stagingZone = findBestStagingZone(briefing, zones, surplusPool);
    if (!stagingZone) return null;

    // Determine required brigades: scale to main_effort capacity (n1298).
    // mainEffortCap = tier_counts.main_effort: only brigades capable of offensive ops.
    // A corps with 2 main_effort brigades out of 10 total deploys 3 (floor), not all 10.
    const mainEffortLimit = mainEffortCap > 0 ? mainEffortCap : surplusPool.length;
    const baseRequiredBrigades = Math.max(MIN_BRIGADES_FOR_PLAN, Math.min(mainEffortLimit, surplusPool.length));
    const requiredBrigades = baseRequiredBrigades + getEnemyEquipmentBrigadeBump(briefing);
    if (requiredBrigades > surplusPool.length) {
        return null;
    }

    // Estimate concentration time: 1 turn per 2 brigades that need to move
    const brigadesAlreadyAtStaging = countBrigadesInZone(
        surplusPool.map(e => e.brigade_id),
        surplusPool,
        stagingZone.zone_id,
    );
    const brigadesToMove = Math.max(0, requiredBrigades - brigadesAlreadyAtStaging);
    const concentrationTurns = Math.ceil(brigadesToMove / PLAN_CONCENTRATION_RATE);

    // Check besieged corps rule
    if (isBesiegedCorps(zones) && !isLocalTarget(opDef, stagingZone)) {
        return null; // Cannot plan distant offensives from besieged position
    }

    // Assign brigades from surplus pool (sorted by offensive fitness)
    const assignedBrigades = selectBrigadesForPlan(surplusPool, requiredBrigades);

    // Pre-planned ops are designed to execute AFTER concentration, not from current positions.
    // Reachability is enforced in emit.ts (buildAxesFromDef) at execution time when brigades
    // are already near staging. Applying it here at plan-creation time incorrectly rejects
    // valid pre-planned ops whose brigades will march toward staging over the next few turns.
    const targetOsids = extractTargetOsids(opDef);

    const plan: CommanderPlan = {
        plan_id: `plan_${briefing.corps_id}_t${turn}_${opName.replace(/\s+/g, '_').toLowerCase()}`,
        objective_description: opName,
        target_osids: targetOsids,
        required_brigades: requiredBrigades,
        assigned_brigades: assignedBrigades,
        staging_zone: stagingZone.zone_id,
        status: 'concentrating',
        created_turn: turn,
        target_ready_turn: turn + concentrationTurns,
        concentration_progress: requiredBrigades > 0
            ? Math.min(1.0, brigadesAlreadyAtStaging / requiredBrigades)
            : 0,
        viability_score: 1.0,
        source: 'pre_planned',
    };

    const concentrationOrders = buildConcentrationOrders(assignedBrigades, surplusPool, stagingZone.zone_id);

    return {
        plan,
        action: 'created',
        reason: `adopted pre-planned op: ${opName}`,
        concentration_orders: concentrationOrders,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// tryCreateFromOpportunity — detect weak/undefended adjacent zone
// ═══════════════════════════════════════════════════════════════════════════

function tryCreateFromOpportunity(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    forces: ForceAssessment,
    surplusPool: BrigadeEvaluation[],
    turn: number,
): PlanDecision | null {
    if (surplusPool.length < MIN_BRIGADES_FOR_PLAN) return null;

    // Find projecting or balanced zones (surplus check is already done at corps level above)
    const eligibleZones = zones
        .filter(z =>
            (z.posture === 'projecting' || z.posture === 'balanced')
        )
        .sort((a, b) => {
            // Prefer projecting over balanced
            const posturePriority = (p: string) => p === 'projecting' ? 0 : 1;
            const posDiff = posturePriority(a.posture) - posturePriority(b.posture);
            if (posDiff !== 0) return posDiff;
            const diff = b.surplus_brigades.length - a.surplus_brigades.length;
            if (diff !== 0) return diff;
            return strictCompare(a.zone_id, b.zone_id);
        });

    if (eligibleZones.length === 0) return null;

    // Check besieged corps rule
    if (isBesiegedCorps(zones)) {
        // Besieged corps can only do local ops
        // Still allow opportunity within hop limit
        const bestZone = eligibleZones[0]!;
        return createOpportunityPlan(briefing, bestZone, surplusPool, forces.tier_counts.main_effort, turn, true);
    }

    const bestZone = eligibleZones[0]!;
    return createOpportunityPlan(briefing, bestZone, surplusPool, forces.tier_counts.main_effort, turn, false);
}

function createOpportunityPlan(
    briefing: CommanderBriefing,
    stagingZone: ZoneAssessment,
    surplusPool: BrigadeEvaluation[],
    mainEffortCap: number,
    turn: number,
    isLocal: boolean,
): PlanDecision | null {
    // ── Reachability-aware selection (Fix A) ───────────────────────────
    // Pre-filter surplus to brigades that can actually reach at least one
    // enemy objective approach OSID within MAX_REACHABILITY_HOPS.
    // Without this, the planner picks the best-fitness brigades (often deep-rear
    // main_effort), then rejects the plan when they fail the reachability check.
    // That pattern starves corps with rear-positioned elite assets of all plans.
    const reachableSurplus = filterSurplusByReachability(
        briefing, surplusPool, stagingZone.enemy_adjacent_osids,
    );

    // Use the reachable pool if it can form a plan; otherwise the plan truly cannot form.
    if (reachableSurplus.length < MIN_BRIGADES_FOR_PLAN) {
        return null;
    }

    // Recompute main_effort cap among reachable brigades only.
    // If main_effort units are unreachable (deep rear), the plan scales to
    // what's available rather than sizing for absent assets.
    const reachableMainEffort = reachableSurplus.filter(ev => ev.tier === 'main_effort').length;
    const isFallback = reachableMainEffort === 0 && mainEffortCap > 0;

    // Cap by main_effort tier count (n1298) — corps deploys at most as many brigades as
    // it has reachable main_effort-capable brigades. When no main_effort are reachable,
    // allow a bounded fallback at MIN_BRIGADES_FOR_PLAN scale only.
    const effectiveMainEffortCap = reachableMainEffort > 0 ? reachableMainEffort : 0;
    const naturalRequired = Math.min(reachableSurplus.length, stagingZone.surplus_brigades.length);
    const mainEffortLimit = effectiveMainEffortCap > 0 ? effectiveMainEffortCap : MIN_BRIGADES_FOR_PLAN;
    const baseRequiredBrigades = Math.max(
        MIN_BRIGADES_FOR_PLAN,
        Math.min(mainEffortLimit, naturalRequired),
    );
    const requiredBrigades = baseRequiredBrigades + getEnemyEquipmentBrigadeBump(briefing);
    if (requiredBrigades > naturalRequired) {
        return null;
    }

    const assignedBrigades = selectBrigadesForPlan(reachableSurplus, requiredBrigades);

    // Verify objectives are reachable from the selected (already-filtered) brigades.
    const reachableEnemyOsids = filterReachableObjectives(
        briefing,
        assignedBrigades,
        stagingZone.enemy_adjacent_osids,
    );

    // If no enemy objectives survive the reachability filter, this plan cannot be created.
    if (reachableEnemyOsids.length === 0) {
        return null;
    }

    // Apply catastrophic-outcome cooldown: suppress OSIDs where recent ops failed.
    // Fall back to the full reachable set if every candidate is on cooldown (avoids
    // indefinite planning freeze when the corps has only one axis of advance).
    const cooldownSet = buildCatastrophicOsidCooldownSet(briefing, briefing.turn);
    const cooledCandidates = reachableEnemyOsids.filter(osid => !cooldownSet.has(osid));
    const effectiveOsids = cooledCandidates.length > 0 ? cooledCandidates : reachableEnemyOsids;

    // Wrap as a ZoneAssessment-like object with filtered enemy OSIDs for selectOpportunityTargets.
    const filteredZone: ZoneAssessment = { ...stagingZone, enemy_adjacent_osids: effectiveOsids };

    const brigadesAlreadyAtStaging = countBrigadesInZone(assignedBrigades, surplusPool, stagingZone.zone_id);
    const brigadesToMove = Math.max(0, requiredBrigades - brigadesAlreadyAtStaging);
    const concentrationTurns = Math.ceil(brigadesToMove / PLAN_CONCENTRATION_RATE);

    const plan: CommanderPlan = {
        plan_id: `plan_${briefing.corps_id}_t${turn}_opportunity`,
        objective_description: isLocal
            ? `local opportunity from ${stagingZone.zone_id}`
            : `offensive opportunity from ${stagingZone.zone_id}`,
        target_osids: selectOpportunityTargets(filteredZone, requiredBrigades, briefing),
        required_brigades: requiredBrigades,
        assigned_brigades: assignedBrigades,
        staging_zone: stagingZone.zone_id,
        status: 'concentrating',
        created_turn: turn,
        target_ready_turn: turn + concentrationTurns,
        concentration_progress: requiredBrigades > 0
            ? Math.min(1.0, brigadesAlreadyAtStaging / requiredBrigades)
            : 0,
        viability_score: isFallback ? 0.55 : 0.8,  // Fallback plans (no reachable main_effort) start weaker
        source: 'opportunity',
    };

    const concentrationOrders = buildConcentrationOrders(assignedBrigades, surplusPool, stagingZone.zone_id);

    return {
        plan,
        action: 'created',
        reason: isLocal
            ? `local opportunity: ${requiredBrigades} brigades at ${stagingZone.zone_id}`
            : `offensive opportunity: ${requiredBrigades} brigades at ${stagingZone.zone_id}`,
        concentration_orders: concentrationOrders,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: select opportunity targets from zone's enemy adjacency
// ═══════════════════════════════════════════════════════════════════════════

/**
 * n1301: Select opportunity targets ranked by approach count (strength-based).
 * Enemy OSIDs with more friendly-zone neighbors are more exposed and thus
 * preferred attack vectors. Secondary sort: lexicographic for determinism.
 */
function selectOpportunityTargets(
    stagingZone: ZoneAssessment,
    requiredBrigades: number,
    briefing: CommanderBriefing,
): string[] {
    const enemyOsids = stagingZone.enemy_adjacent_osids;
    if (enemyOsids.length === 0) return [];
    const maxObjectives = Math.max(1, Math.min(6, Math.floor(requiredBrigades * 0.5)));
    const campaignTargetSet = getPriorityTargetSet(briefing);

    // Rank by number of staging-zone OSIDs adjacent to each enemy OSID.
    // More approach vectors = more exposed target = higher priority.
    // Guard: adjacency may be absent in unit tests — fall back to lex sort.
    const zoneOsidSet = new Set(stagingZone.osids);
    const adjacency = briefing.spatial?.adjacency;
    const approachCount = (osid: string): number => {
        if (!adjacency) return 0;
        const neighbors = adjacency.get(osid as any) ?? [];
        return (neighbors as readonly string[]).filter(n => zoneOsidSet.has(n)).length;
    };

    return [...enemyOsids]
        .sort((a, b) => {
            const campaignDiff = Number(campaignTargetSet.has(b)) - Number(campaignTargetSet.has(a));
            if (campaignDiff !== 0) return campaignDiff;
            const diff = approachCount(b) - approachCount(a); // descending
            return diff !== 0 ? diff : strictCompare(a, b);
        })
        .slice(0, maxObjectives);
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: filter surplus brigades to those that can reach enemy objectives
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns the subset of surplusPool whose brigade location can BFS-reach at
 * least one friendly approach OSID adjacent to any candidateOsid (enemy target)
 * within MAX_REACHABILITY_HOPS through friendly territory.
 *
 * This pre-filters the surplus pool BEFORE brigade selection so the planner
 * picks from reachable units rather than selecting the best-fitness deep-rear
 * brigades and then rejecting the entire plan on reachability.
 */
function filterSurplusByReachability(
    briefing: CommanderBriefing,
    surplusPool: readonly BrigadeEvaluation[],
    candidateOsids: readonly string[],
): BrigadeEvaluation[] {
    if (candidateOsids.length === 0) return [];

    const adjacency = briefing.spatial.adjacency;
    const fofMap = briefing.spatial.friendlyOsidsByFaction;
    if (!adjacency || !fofMap) return [...surplusPool]; // unit test fallback
    const factionFriendlyOsids = fofMap.get(briefing.faction);
    if (!factionFriendlyOsids) return [...surplusPool];

    // Build all friendly approach OSIDs across all candidate enemy objectives.
    // A brigade is reachable if it can BFS to ANY of these approach OSIDs.
    const allApproachOsids = new Set<string>();
    for (const candidateOsid of candidateOsids) {
        const neighbors = adjacency.get(candidateOsid as any) ?? [];
        for (const n of neighbors as readonly string[]) {
            if (factionFriendlyOsids.has(n)) allApproachOsids.add(n);
        }
    }
    if (allApproachOsids.size === 0) return [];

    // Build location map from briefing brigades.
    const brigadeLocationMap = new Map<string, string>();
    for (const b of briefing.brigades) {
        if (b.location_osid) brigadeLocationMap.set(b.id, b.location_osid);
    }

    const sortedApproaches = [...allApproachOsids].sort(strictCompare);

    const reachable: BrigadeEvaluation[] = [];
    for (const ev of surplusPool) {
        const locationOsid = brigadeLocationMap.get(ev.brigade_id);
        if (!locationOsid) continue;

        // Component gate: brigade must be in the same connected component as at least one approach.
        let inComponent = false;
        for (const approachOsid of sortedApproaches) {
            if (spatialSameComponent(briefing.spatial, briefing.faction, locationOsid, approachOsid)) {
                inComponent = true;
                break;
            }
        }
        if (!inComponent) continue;

        // BFS hop check: can this brigade reach any approach OSID within the hop limit?
        let canReach = false;
        for (const approachOsid of sortedApproaches) {
            const dist = spatialFriendlyDistance(
                briefing.spatial, briefing.faction,
                locationOsid, approachOsid, MAX_REACHABILITY_HOPS,
            );
            if (dist >= 0) { canReach = true; break; }
        }
        if (canReach) reachable.push(ev);
    }
    return reachable;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: filter enemy objectives to those reachable from assigned brigades
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns the subset of candidateOsids reachable by at least one assigned brigade
 * via BFS through friendly territory within MAX_REACHABILITY_HOPS.
 *
 * Mirrors the reachability check in emit.ts (lines ~559-599). Objectives are
 * enemy-held, so BFS checks the friendly OSIDs adjacent to each objective rather
 * than the objective itself. A brigade is considered able to reach an objective
 * if it can reach any one of the objective's friendly-side approach OSIDs.
 */
function filterReachableObjectives(
    briefing: CommanderBriefing,
    assignedBrigades: readonly FormationId[],
    candidateOsids: readonly string[],
): string[] {
    if (candidateOsids.length === 0) return [];

    // Guard: if spatial data is incomplete (e.g. in unit tests), pass through unfiltered.
    const adjacency = briefing.spatial.adjacency;
    const fofMap = briefing.spatial.friendlyOsidsByFaction;
    if (!adjacency || !fofMap) return [...candidateOsids];
    const factionFriendlyOsids = fofMap.get(briefing.faction);
    if (!factionFriendlyOsids) return [...candidateOsids];

    // Build location map from briefing brigades (FormationState has location_osid).
    const brigadeLocationMap = new Map<string, string>();
    for (const b of briefing.brigades) {
        if (b.location_osid) brigadeLocationMap.set(b.id, b.location_osid);
    }

    // Collect assigned brigade locations (those that have a known OSID position).
    const assignedLocations: string[] = [];
    for (const id of assignedBrigades) {
        const loc = brigadeLocationMap.get(id);
        if (loc) assignedLocations.push(loc);
    }
    if (assignedLocations.length === 0) return [];

    const reachable: string[] = [];
    for (const candidateOsid of candidateOsids) {
        // Objectives are enemy-held; BFS through friendly territory to an approach
        // OSID (a friendly OSID neighboring the objective) instead of the objective itself.
        const neighbors = adjacency.get(candidateOsid as any) ?? [];
        const approachOsids = (neighbors as readonly string[]).filter(n => factionFriendlyOsids.has(n));
        if (approachOsids.length === 0) continue; // objective has no friendly approach

        // Component-sameness gate: reject objectives whose approach OSIDs are in a different
        // connected component from ALL assigned brigades. This prevents enclave corps
        // (e.g. arbih_1st_corps in Sarajevo) from planning objectives reachable only via
        // disconnected RBiH territory (Foča/Kalinovik), without restricting which approach
        // OSIDs are visible. spatialFriendlyDistance alone does not enforce this — it does
        // plain BFS through the faction-wide friendly set and would find a "path" through
        // Tuzla/Goražde that doesn't exist on the ground.
        const approachesInSameComponent = approachOsids.filter(approachOsid =>
            assignedLocations.some(loc =>
                spatialSameComponent(briefing.spatial, briefing.faction, loc, approachOsid)
            )
        );
        if (approachesInSameComponent.length === 0) continue; // objective unreachable from this enclave

        // Check if any assigned brigade can reach any same-component approach OSID within hop limit.
        let objectiveReachable = false;
        outer: for (const approachOsid of approachesInSameComponent.slice().sort(strictCompare)) {
            for (const locationOsid of assignedLocations) {
                const dist = spatialFriendlyDistance(
                    briefing.spatial,
                    briefing.faction,
                    locationOsid,
                    approachOsid,
                    MAX_REACHABILITY_HOPS,
                );
                if (dist >= 0) {
                    objectiveReachable = true;
                    break outer;
                }
            }
        }
        if (objectiveReachable) reachable.push(candidateOsid);
    }
    return reachable;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: check abandon conditions
// ═══════════════════════════════════════════════════════════════════════════

function checkAbandonConditions(
    plan: CommanderPlan,
    zones: ZoneAssessment[],
    surplusPool: BrigadeEvaluation[],
    turn: number,
): string | null {
    // Already abandoned
    if (plan.status === 'abandoned') return null;

    // Staging zone became besieged
    const stagingZone = zones.find(z => z.zone_id === plan.staging_zone);
    if (stagingZone && stagingZone.posture === 'besieged') {
        return 'staging zone is now besieged';
    }

    // Required brigades no longer achievable — check assigned brigade availability,
    // not raw surplus pool size (which fluctuates with garrison budgets).
    const abandonAssignedIds = new Set(plan.assigned_brigades);
    const abandonAvailable = surplusPool.filter(ev => abandonAssignedIds.has(ev.brigade_id)).length;
    if (abandonAvailable < Math.ceil(plan.required_brigades * 0.5)) {
        return `assigned brigades depleted: ${abandonAvailable}/${plan.required_brigades}`;
    }

    // Plan has been active too long without reaching ready (stalled).
    // With time-based concentration this should rarely fire; keep as safety net.
    const turnsSinceCreation = turn - plan.created_turn;
    const expectedDuration = (plan.target_ready_turn - plan.created_turn) * 2;
    if (plan.status === 'concentrating' && turnsSinceCreation > Math.max(expectedDuration, 10)) {
        return `stalled: ${turnsSinceCreation} turns without reaching ready state`;
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: check suspend conditions
// ═══════════════════════════════════════════════════════════════════════════

function checkSuspendConditions(
    plan: CommanderPlan,
    zones: ZoneAssessment[],
    surplusPool: BrigadeEvaluation[],
    briefing: CommanderBriefing,
): string | null {
    // Only concentrating plans can be suspended — 'ready' plans must launch or wait,
    // never retreat to suspended. Suspending a ready plan on objective-capture threat
    // is inverted logic: the enemy taking your objective is reason to attack faster.
    if (plan.status !== 'concentrating' && plan.status !== 'suspended') {
        return null;
    }

    // Only suspend if the staging zone itself is under high/critical threat.
    // Checking any zone caused ARBiH corps with perpetually thin fronts (deficit>2
    // in a non-staging zone) to suspend every plan before it reached 'ready'.
    const previousThreat = briefing.previous_state?.threat_assessment;
    if (previousThreat) {
        const stagingZoneThreat = previousThreat.threatened_zones.find(
            tz => tz.zone_id === plan.staging_zone
        );
        // Suspend only on critical (active territory loss) — high is structural baseline for
        // narrow-corridor corps (e.g. Posavina) and must not permanently veto offensive action.
        if (stagingZoneThreat?.threat_level === 'critical') {
            return `staging zone ${plan.staging_zone} under critical threat`;
        }
    }

    // Assigned brigades depleted below half — plan is no longer viable.
    // A brigade is "alive" if the commander system knows about it: either in the surplus
    // pool or in a zone's assigned_brigades (garrison-locked). briefing.brigades is
    // FormationState[] and may be empty in tests / minimal briefings — don't rely on it.
    const suspendAssignedIds = new Set(plan.assigned_brigades);
    const knownBrigadeIds = new Set<string>();
    for (const ev of surplusPool) knownBrigadeIds.add(ev.brigade_id);
    for (const z of zones) {
        for (const bid of z.assigned_brigades) knownBrigadeIds.add(bid);
    }
    const activeAssigned = plan.assigned_brigades.filter(bid => knownBrigadeIds.has(bid)).length;
    if (activeAssigned < Math.ceil(plan.required_brigades * 0.5)) {
        return `assigned brigades depleted: ${activeAssigned}/${plan.required_brigades} in commander system`;
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: count brigades in zone
// ═══════════════════════════════════════════════════════════════════════════

function countBrigadesInZone(
    brigadeIds: readonly FormationId[],
    evaluations: readonly BrigadeEvaluation[],
    zoneId: ZoneId,
): number {
    const idSet = new Set(brigadeIds);
    let count = 0;
    for (const ev of evaluations) {
        if (idSet.has(ev.brigade_id) && ev.current_zone === zoneId) {
            count++;
        }
    }
    return count;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: build concentration orders for brigades not yet at staging
// ═══════════════════════════════════════════════════════════════════════════

function buildConcentrationOrders(
    assignedBrigades: readonly FormationId[],
    evaluations: readonly BrigadeEvaluation[],
    stagingZone: ZoneId,
): Array<{ brigade_id: FormationId; destination_zone: ZoneId }> {
    const orders: Array<{ brigade_id: FormationId; destination_zone: ZoneId }> = [];
    const idSet = new Set(assignedBrigades);

    // Collect brigades not at staging zone, sort deterministically
    const needsMovement: BrigadeEvaluation[] = [];
    for (const ev of evaluations) {
        if (idSet.has(ev.brigade_id) && ev.current_zone !== stagingZone) {
            needsMovement.push(ev);
        }
    }
    needsMovement.sort((a, b) => strictCompare(a.brigade_id, b.brigade_id));

    for (const ev of needsMovement) {
        orders.push({ brigade_id: ev.brigade_id, destination_zone: stagingZone });
    }

    return orders;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: select brigades for a plan (best offensive fitness first)
// ═══════════════════════════════════════════════════════════════════════════

function selectBrigadesForPlan(
    surplusPool: readonly BrigadeEvaluation[],
    count: number,
): FormationId[] {
    const sorted = [...surplusPool]
        .filter(ev => ev.is_combat_effective && !ev.is_disrupted && ev.morale > CRITICAL_MORALE_THRESHOLD)
        .sort((a, b) => {
            const fitDiff = b.fitness_offense - a.fitness_offense;
            if (fitDiff !== 0) return fitDiff;
            return strictCompare(a.brigade_id, b.brigade_id);
        });

    const selected: FormationId[] = [];
    for (let i = 0; i < Math.min(count, sorted.length); i++) {
        selected.push(sorted[i]!.brigade_id);
    }
    return selected;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: find best staging zone
// ═══════════════════════════════════════════════════════════════════════════

function findBestStagingZone(
    briefing: CommanderBriefing,
    zones: readonly ZoneAssessment[],
    surplusPool: readonly BrigadeEvaluation[],
): ZoneAssessment | null {
    // Prefer projecting > balanced > defending. Never stage from besieged.
    const posturePriority: Record<string, number> = {
        projecting: 0,
        balanced: 1,
        defending: 2,
        besieged: 99,
    };

    const campaignTargetSet = getPriorityTargetSet(briefing);
    const wantsCampaignPush = briefing.campaign_role === 'primary' || briefing.campaign_role === 'secondary';

    const candidates = zones
        .filter(z => z.posture !== 'besieged' && z.front_edge_count > 0)
        .sort((a, b) => {
            if (wantsCampaignPush && campaignTargetSet.size > 0) {
                const aMatches = a.enemy_adjacent_osids.some(osid => campaignTargetSet.has(osid)) ? 1 : 0;
                const bMatches = b.enemy_adjacent_osids.some(osid => campaignTargetSet.has(osid)) ? 1 : 0;
                const matchDiff = bMatches - aMatches;
                if (matchDiff !== 0) return matchDiff;
            }
            // 1. Posture priority
            const posA = posturePriority[a.posture] ?? 99;
            const posB = posturePriority[b.posture] ?? 99;
            if (posA !== posB) return posA - posB;
            // 2. Most surplus brigades
            const surpDiff = b.surplus_brigades.length - a.surplus_brigades.length;
            if (surpDiff !== 0) return surpDiff;
            // 3. Deterministic tiebreaker
            return strictCompare(a.zone_id, b.zone_id);
        });

    return candidates.length > 0 ? candidates[0]! : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: check if corps is besieged (all zones besieged, or main body isolated)
// ═══════════════════════════════════════════════════════════════════════════

function isBesiegedCorps(zones: readonly ZoneAssessment[]): boolean {
    if (zones.length === 0) return false;
    // Case A: all zones besieged
    if (zones.every(z => z.posture === 'besieged')) return true;
    // Case B: main body is physically isolated (corridor_width <= 1) even if a
    // fringe zone is technically non-besieged. A corps whose core is cut off
    // cannot plan distant offensives regardless of fringe zone posture.
    const mainBody = zones.find(z => z.is_main_body);
    return mainBody != null && mainBody.corridor_width <= 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: check if op target is local to staging zone (within hop limit)
// ═══════════════════════════════════════════════════════════════════════════

function isLocalTarget(opDef: Record<string, unknown>, stagingZone: ZoneAssessment): boolean {
    // For pre-planned ops, check if target OSIDs overlap with or are adjacent to staging zone
    const targetOsids = extractTargetOsids(opDef);
    if (targetOsids.length === 0) return true; // No specific targets = local by default
    // If any target OSID is in the staging zone's OSIDs, it's local
    const zoneOsidSet = new Set(stagingZone.osids);
    return targetOsids.some(osid => zoneOsidSet.has(osid));
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: extract target OSIDs from an op definition
// ═══════════════════════════════════════════════════════════════════════════

function extractTargetOsids(opDef: Record<string, unknown>): string[] {
    // Pre-planned ops may have target_osids, objectives, or similar fields
    const targets = opDef['target_osids'] as string[] | undefined;
    if (Array.isArray(targets)) return [...targets].sort(strictCompare);

    const objectives = opDef['objectives'] as Array<{ osid?: string }> | undefined;
    if (Array.isArray(objectives)) {
        return objectives
            .map(o => o.osid)
            .filter((osid): osid is string => typeof osid === 'string')
            .sort(strictCompare);
    }

    return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: compute viability score for an existing plan
// ═══════════════════════════════════════════════════════════════════════════

function computeViabilityScore(
    plan: CommanderPlan,
    zones: readonly ZoneAssessment[],
    surplusPool: readonly BrigadeEvaluation[],
): number {
    let score = 1.0;

    // Exact match first; fall back to OSID-content search if zone was re-anchored
    // (zone gained a lex-smaller OSID this turn, shifting the anchor without losing territory).
    let stagingZone = zones.find(z => z.zone_id === plan.staging_zone);
    if (!stagingZone) {
        const storedAnchorOsid = plan.staging_zone.split(':').slice(2).join(':');
        stagingZone = zones.find(z => (z.osids as readonly string[]).includes(storedAnchorOsid));
    }
    if (!stagingZone) {
        return 0.0; // Staging zone truly lost (anchor OSID captured by enemy)
    }
    if (stagingZone.posture === 'defending') score *= 0.7;
    if (stagingZone.deficit > 0) score *= 0.8;

    const assignedIds = new Set(plan.assigned_brigades);
    const freshSurplusEffective = surplusPool.filter(
        ev => ev.is_combat_effective && !assignedIds.has(ev.brigade_id),
    ).length;
    const effectiveForPlan = freshSurplusEffective + plan.assigned_brigades.length;
    if (effectiveForPlan < plan.required_brigades) {
        score *= effectiveForPlan / plan.required_brigades;
    }

    return Math.max(0, Math.min(1, score));
}

