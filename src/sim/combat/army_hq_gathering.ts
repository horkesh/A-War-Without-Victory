/**
 * Army HQ Gathering — v0.4.7
 * Periodic command meetings producing multi-turn campaign plans.
 * Deterministic: no RNG, no timestamps.
 */

import type { GameState, FactionId, FormationState, ArmyHQOverride } from '../../state/game_state.js';
import type { TheaterAssessment, CorpsAssessment, CampaignPlan, FrontPriority, DoctrineOverride, SynchronizedOperation, SyncOpParticipant } from './army_hq_gathering_types.js';
import {
    GATHERING_CADENCE_RS, GATHERING_CADENCE_HRHB, getGatheringCadenceRBiH,
    EMERGENCY_COOLDOWN, PLAN_VALIDITY_BUFFER,
    SYNC_WINDOW_DEFAULT, SYNC_MIN_BRIGADES,
} from './army_hq_gathering_constants.js';

// ── Emergency event IDs that trigger an immediate gathering ──────────────────
const EMERGENCY_EVENT_IDS = new Set([
    'nato_deliberate_force_1995',
    'operation_storm_1995',
    'croat_bosniak_war_begins_1993',
    'washington_agreement_1994',
]);

// ── Corps communication constraints ─────────────────────────────────────────
// ARBiH enclaved corps cannot attend in person
const ARBIH_EXCLUDED_CORPS = new Set([
    'arbih_general_staff',  // staff, not a field corps — excluded from gathering
]);

const ARBIH_RADIO_CORPS = new Set([
    'arbih_5th_corps',  // Bihać pocket, isolated throughout war
]);

// Sarajevo (1st Corps) is radio-only until roughly turn 60 (Igman trail / tunnel)
const SARAJEVO_TUNNEL_TURN = 60;

// HVO Posavina pocket — radio only
const HVO_RADIO_CORPS = new Set([
    'hvo_northwest_bosnia',  // Orašje pocket, isolated
]);

/** Personnel threshold per brigade that indicates corps-level collapse. */
const CORPS_COLLAPSE_AVG_PERSONNEL = 500;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the number of turns between regular gatherings for a faction.
 */
export function getGatheringCadence(faction: FactionId, turn: number): number {
    switch (faction) {
        case 'RS':   return GATHERING_CADENCE_RS;
        case 'HRHB': return GATHERING_CADENCE_HRHB;
        case 'RBiH': return getGatheringCadenceRBiH(turn);
        default:     return GATHERING_CADENCE_RS; // fallback
    }
}

export interface GatheringDecision {
    gather: boolean;
    reason: string;
}

/**
 * Determines whether a faction should hold a gathering this turn.
 * Returns the decision and the trigger reason.
 */
export function shouldGather(
    state: GameState,
    faction: FactionId,
    currentTurn: number,
): GatheringDecision {
    const lastGatheringTurn = state.military.last_gathering_turn?.[faction] ?? 0;
    const cadence = getGatheringCadence(faction, currentTurn);

    // 1. Regular cadence
    if (currentTurn - lastGatheringTurn >= cadence) {
        return { gather: true, reason: 'regular_cadence' };
    }

    // 2. Emergency triggers (only if cooldown has elapsed)
    if (currentTurn - lastGatheringTurn >= EMERGENCY_COOLDOWN) {
        // 2a. Corps strength collapse — any corps with critically low average personnel
        if (hasCorpsStrengthCollapse(state, faction)) {
            return { gather: true, reason: 'corps_strength_collapse' };
        }

        // 2b. Emergency event fired since last gathering
        if (hasEmergencyEventSinceLastGathering(state, lastGatheringTurn)) {
            return { gather: true, reason: 'emergency_event' };
        }
    }

    return { gather: false, reason: '' };
}

/**
 * Determines the communication mode for a corps attending a gathering.
 * - 'full': corps commander attends in person
 * - 'radio': corps receives orders via radio (delay applies)
 * - 'excluded': corps is cut off, cannot participate
 */
export function canCorpsAttendGathering(
    corpsId: string,
    faction: FactionId,
    state: GameState,
): 'full' | 'radio' | 'excluded' {
    const turn = state.meta.turn;

    if (faction === 'RBiH') {
        if (ARBIH_EXCLUDED_CORPS.has(corpsId)) return 'excluded';
        if (ARBIH_RADIO_CORPS.has(corpsId)) return 'radio';
        // Sarajevo: radio before tunnel, full after
        if (corpsId === 'arbih_1st_corps') {
            return turn < SARAJEVO_TUNNEL_TURN ? 'radio' : 'full';
        }
    }

    if (faction === 'HRHB') {
        if (HVO_RADIO_CORPS.has(corpsId)) return 'radio';
    }

    // VRS and all other corps: full attendance
    return 'full';
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Check if any corps of the given faction has critically low average brigade personnel.
 * Groups active brigades by corps_id; if any corps averages below threshold → collapse.
 */
function hasCorpsStrengthCollapse(state: GameState, faction: FactionId): boolean {
    const corpsBuckets = new Map<string, { totalPersonnel: number; count: number }>();

    for (const fmn of Object.values(state.military.formations)) {
        if (fmn.faction !== faction) continue;
        if (fmn.status !== 'active') continue;
        if (!fmn.corps_id) continue;
        // Only count brigades (default kind)
        const kind = fmn.kind ?? 'brigade';
        if (kind !== 'brigade') continue;

        const bucket = corpsBuckets.get(fmn.corps_id);
        const pers = fmn.personnel ?? 1000;
        if (bucket) {
            bucket.totalPersonnel += pers;
            bucket.count += 1;
        } else {
            corpsBuckets.set(fmn.corps_id, { totalPersonnel: pers, count: 1 });
        }
    }

    for (const [, bucket] of corpsBuckets) {
        if (bucket.count > 0 && bucket.totalPersonnel / bucket.count < CORPS_COLLAPSE_AVG_PERSONNEL) {
            return true;
        }
    }

    return false;
}

/**
 * Check if any emergency event has been fired since the last gathering.
 * Uses `state.political.fired_event_ids` (a flat array of event ID strings).
 * Since we don't track *when* each event fired, this is a conservative check:
 * we treat any matching event as potentially recent.
 * In practice, emergency events fire at most once, so once seen it stays permanent —
 * the cooldown + cadence prevent infinite re-triggering.
 */
function hasEmergencyEventSinceLastGathering(
    state: GameState,
    _lastGatheringTurn: number,
): boolean {
    const firedIds = state.political?.fired_event_ids;
    if (!firedIds || firedIds.length === 0) return false;

    for (const id of firedIds) {
        if (EMERGENCY_EVENT_IDS.has(id)) return true;
    }
    return false;
}

// ── Theater Assessment ──────────────────────────────────────────────────────

/** Default officer competence when no corps commander is found. */
const DEFAULT_OFFICER_COMPETENCE = 2.0;

/**
 * Produces a theater-wide assessment for a faction — corps-by-corps evaluation,
 * territory trend, supply/manpower status, and threat identification.
 * Used as input for campaign plan generation.
 */
export function assessTheater(state: GameState, faction: FactionId): TheaterAssessment {
    // 1. Collect unique corps IDs for this faction from active formations
    const corpsIds = collectFactionCorps(state, faction);

    // 2. Per-corps assessment
    const corpsAssessments: CorpsAssessment[] = [];
    for (const corpsId of corpsIds) {
        corpsAssessments.push(assessCorps(state, faction, corpsId));
    }
    // Deterministic sort by corps_id
    corpsAssessments.sort((a, b) => a.corps_id < b.corps_id ? -1 : a.corps_id > b.corps_id ? 1 : 0);

    // 3. Territory trend (derived from strength_class distribution)
    const territoryTrend = computeTerritoryTrend(corpsAssessments);

    // 4. Supply status
    const supplyStatus = computeSupplyStatus(state, faction);

    // 5. Manpower status
    const manpowerStatus = computeManpowerStatus(state, faction);

    // 6. Weakest enemy front + strongest threat (from sector intel)
    const { weakestEnemyFront, strongestThreat } = identifyEnemyFronts(state, faction);

    return {
        corps_assessments: corpsAssessments,
        territory_trend: territoryTrend,
        supply_status: supplyStatus,
        manpower_status: manpowerStatus,
        weakest_enemy_front: weakestEnemyFront,
        strongest_threat: strongestThreat,
    };
}

/** Collect unique corps IDs for a faction from formations. */
function collectFactionCorps(state: GameState, faction: FactionId): string[] {
    const corpsSet = new Set<string>();
    for (const fmn of Object.values(state.military.formations)) {
        if (fmn.faction !== faction) continue;
        if (!fmn.corps_id) continue;
        corpsSet.add(fmn.corps_id);
    }
    return Array.from(corpsSet).sort();
}

/** Assess a single corps for the gathering. */
function assessCorps(state: GameState, faction: FactionId, corpsId: string): CorpsAssessment {
    const attendance = canCorpsAttendGathering(corpsId, faction, state);
    const cc = state.military.corps_command?.[corpsId];
    const exhaustion = cc?.corps_exhaustion ?? 0;
    const hasActiveOp = cc?.active_operation != null;

    // Count active brigades and sum personnel
    let availableBrigades = 0;
    let totalPersonnel = 0;
    for (const fmn of Object.values(state.military.formations)) {
        if (fmn.faction !== faction) continue;
        if (fmn.corps_id !== corpsId) continue;
        if (fmn.status !== 'active') continue;
        const kind = fmn.kind ?? 'brigade';
        if (kind !== 'brigade') continue;
        availableBrigades++;
        totalPersonnel += fmn.personnel ?? 1000;
    }

    // Officer competence: find corps commander in named_officers
    const officerCompetence = getCorpsCommanderCompetence(state, corpsId);

    // Strength class from average personnel
    const avgPersonnel = availableBrigades > 0 ? totalPersonnel / availableBrigades : 0;
    const strengthClass = classifyStrength(avgPersonnel);

    // Sector threat average from sector_combat_ratings
    const sectorThreatAvg = computeSectorThreatAvg(state, faction, corpsId);

    return {
        corps_id: corpsId,
        attendance,
        strength_class: strengthClass,
        exhaustion,
        has_active_op: hasActiveOp,
        recent_territory_change: 0, // Placeholder for v0.4.7
        sector_threat_avg: sectorThreatAvg,
        available_brigades: availableBrigades,
        officer_competence: officerCompetence,
    };
}

/** Look up the corps commander competence from named officer data. */
function getCorpsCommanderCompetence(state: GameState, corpsId: string): number {
    const officers = state.military.named_officers;
    const officerData = state.military.named_officer_data;
    if (!officers || !officerData) return DEFAULT_OFFICER_COMPETENCE;

    // Find the officer state assigned to this corps
    for (const [officerId, officerState] of Object.entries(officers)) {
        if (officerState.assigned_corps_id !== corpsId) continue;
        if (officerState.status !== 'active') continue;
        // Find the static data for competence
        const data = officerData.find(o => o.id === officerId);
        if (data) return data.competence;
    }
    return DEFAULT_OFFICER_COMPETENCE;
}

/** Classify corps strength from average brigade personnel. */
function classifyStrength(avgPersonnel: number): string {
    if (avgPersonnel >= 1500) return 'fortress';
    if (avgPersonnel >= 1000) return 'strong';
    if (avgPersonnel >= 600)  return 'adequate';
    if (avgPersonnel >= 300)  return 'thin';
    return 'critical';
}

/** Compute average sector threat for a corps from sector_combat_ratings. */
function computeSectorThreatAvg(state: GameState, faction: FactionId, corpsId: string): number {
    const ratings = state.military.sector_combat_ratings;
    if (!ratings) return 0.5;

    // Find sectors belonging to this corps, compute average of a normalized threat proxy
    // Use inverse of defense_per_edge as threat indicator (lower defense = higher threat)
    let totalThreat = 0;
    let count = 0;
    for (const rating of Object.values(ratings)) {
        if (rating.faction !== faction) continue;
        // Sector IDs embed the corps_id — check via corps_front_sectors
        const sector = state.military.corps_front_sectors?.[rating.sector_id];
        if (!sector || sector.corps_id !== corpsId) continue;
        // Normalize threat: defense_per_edge inversely proportional to threat
        // A rough heuristic: threat = 1 / (1 + defense_per_edge / 1000)
        const threat = 1 / (1 + rating.defense_per_edge / 1000);
        totalThreat += threat;
        count++;
    }
    return count > 0 ? totalThreat / count : 0.5;
}

/** Derive territory trend from corps strength distribution. */
function computeTerritoryTrend(assessments: CorpsAssessment[]): 'gaining' | 'stable' | 'losing' {
    if (assessments.length === 0) return 'stable';

    let weak = 0;
    let strong = 0;
    for (const a of assessments) {
        if (a.strength_class === 'thin' || a.strength_class === 'critical') weak++;
        if (a.strength_class === 'fortress' || a.strength_class === 'strong') strong++;
    }

    const majority = assessments.length / 2;
    if (weak > majority) return 'losing';
    if (strong > majority) return 'gaining';
    return 'stable';
}

/** Derive supply status from general_supply_reserve. */
function computeSupplyStatus(state: GameState, faction: FactionId): 'abundant' | 'adequate' | 'strained' | 'critical' {
    const reserve = state.military.general_supply_reserve?.[faction] ?? 0;
    if (reserve >= 75) return 'abundant';
    if (reserve >= 50) return 'adequate';
    if (reserve >= 25) return 'strained';
    return 'critical';
}

/** Derive manpower status from average brigade personnel. */
function computeManpowerStatus(state: GameState, faction: FactionId): 'healthy' | 'adequate' | 'strained' | 'critical' {
    let totalPersonnel = 0;
    let count = 0;
    for (const fmn of Object.values(state.military.formations)) {
        if (fmn.faction !== faction) continue;
        if (fmn.status !== 'active') continue;
        const kind = fmn.kind ?? 'brigade';
        if (kind !== 'brigade') continue;
        totalPersonnel += fmn.personnel ?? 1000;
        count++;
    }

    const avg = count > 0 ? totalPersonnel / count : 0;
    if (avg >= 1500) return 'healthy';
    if (avg >= 1000) return 'adequate';
    if (avg >= 600)  return 'strained';
    return 'critical';
}

/** Identify weakest enemy front (best opportunity) and strongest threat from sector intel. */
function identifyEnemyFronts(
    state: GameState,
    faction: FactionId,
): { weakestEnemyFront: string | null; strongestThreat: string | null } {
    const sectorIntel = state.military.sector_intel;
    if (!sectorIntel) return { weakestEnemyFront: null, strongestThreat: null };

    // Tally weak/strong sectors per enemy corps
    const enemyCorpsWeak = new Map<string, number>();
    const enemyCorpsStrong = new Map<string, number>();

    for (const records of Object.values(sectorIntel)) {
        for (const rec of records) {
            if (rec.confidence < 0.3) continue;
            const eid = rec.enemy_corps_id;
            if (rec.strength_category === 'thin') {
                enemyCorpsWeak.set(eid, (enemyCorpsWeak.get(eid) ?? 0) + 1);
            }
            if (rec.strength_category === 'fortress' || rec.strength_category === 'dense') {
                enemyCorpsStrong.set(eid, (enemyCorpsStrong.get(eid) ?? 0) + 1);
            }
        }
    }

    // Weakest enemy: most 'thin'/'critical' sectors
    let weakestEnemyFront: string | null = null;
    let maxWeak = 0;
    for (const [eid, count] of enemyCorpsWeak) {
        if (count > maxWeak) { maxWeak = count; weakestEnemyFront = eid; }
    }

    // Strongest threat: most 'fortress'/'dense' sectors
    let strongestThreat: string | null = null;
    let maxStrong = 0;
    for (const [eid, count] of enemyCorpsStrong) {
        if (count > maxStrong) { maxStrong = count; strongestThreat = eid; }
    }

    return { weakestEnemyFront, strongestThreat };
}

// ── Campaign Plan Generation ────────────────────────────────────────────────

/**
 * Compute opportunity score for a corps assessment.
 * Higher = more capable of offensive action.
 */
function computeOpportunityScore(ca: CorpsAssessment): number {
    let score = ca.available_brigades * 10;

    // Strength bonuses / penalties
    if (ca.strength_class === 'fortress') score += 30;
    else if (ca.strength_class === 'strong') score += 15;
    else if (ca.strength_class === 'thin') score -= 20;
    else if (ca.strength_class === 'critical') score -= 40;

    // Exhaustion penalties
    if (ca.exhaustion > 50) score -= 40;
    else if (ca.exhaustion > 30) score -= 20;

    // Threat modifiers
    if (ca.sector_threat_avg < 0.3) score += 10;
    else if (ca.sector_threat_avg > 0.7) score -= 10;

    return score;
}

/**
 * Generates a campaign plan from the theater assessment.
 * Assigns front priorities per corps, computes doctrine overrides,
 * and applies faction personality adjustments.
 */
export function generateCampaignPlan(
    state: GameState,
    faction: FactionId,
    assessment: TheaterAssessment,
    currentTurn: number,
    reason: string,
    emergency: boolean,
): CampaignPlan {
    const priorities = generateFrontPriorities(faction, assessment, currentTurn);
    const doctrine = generateDoctrineOverride(faction, assessment, currentTurn, priorities);

    const syncOps = generateSynchronizedOperations(assessment, priorities, currentTurn);

    return {
        issued_turn: currentTurn,
        valid_until_turn: currentTurn + getGatheringCadence(faction, currentTurn) + PLAN_VALIDITY_BUFFER,
        emergency,
        trigger_reason: reason,
        front_priorities: priorities,
        doctrine_override: doctrine,
        synchronized_operations: syncOps,
        force_transfers: [],          // Not implemented in v0.4.7
        excluded_corps: assessment.corps_assessments
            .filter(c => c.attendance === 'excluded')
            .map(c => c.corps_id),
    };
}

/** Generate front priorities for all corps. */
function generateFrontPriorities(
    faction: FactionId,
    assessment: TheaterAssessment,
    currentTurn: number,
): FrontPriority[] {
    // Separate excluded corps from candidates
    const excluded: CorpsAssessment[] = [];
    const candidates: Array<{ ca: CorpsAssessment; score: number }> = [];

    for (const ca of assessment.corps_assessments) {
        if (ca.attendance === 'excluded') {
            excluded.push(ca);
        } else {
            candidates.push({ ca, score: computeOpportunityScore(ca) });
        }
    }

    // Sort candidates by score descending, then by corps_id for determinism
    candidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.ca.corps_id < b.ca.corps_id ? -1 : a.ca.corps_id > b.ca.corps_id ? 1 : 0;
    });

    // Assign roles based on score ranking
    const priorities: FrontPriority[] = [];
    let primaryCount = 0;

    for (const { ca, score } of candidates) {
        let role: FrontPriority['role'];
        let suggestedStance: FrontPriority['suggested_stance'];

        if (ca.strength_class === 'critical') {
            role = 'contain';
            suggestedStance = 'reorganize';
        } else if (score > 0 && primaryCount < 2) {
            role = 'primary';
            suggestedStance = 'offensive';
            primaryCount++;
        } else if (score > -20) {
            role = 'secondary';
            suggestedStance = 'balanced';
        } else {
            role = 'economy';
            suggestedStance = 'defensive';
        }

        // Radio-only corps capped at secondary
        if (ca.attendance === 'radio' && (role === 'primary')) {
            role = 'secondary';
            suggestedStance = 'balanced';
            primaryCount--;
        }

        priorities.push({ corps_id: ca.corps_id, role, suggested_stance: suggestedStance });
    }

    // Excluded corps always contain
    for (const ca of excluded) {
        priorities.push({ corps_id: ca.corps_id, role: 'contain', suggested_stance: 'defensive' });
    }

    // Faction personality adjustments
    applyFactionPersonality(faction, currentTurn, priorities);

    // Deterministic output order by corps_id
    priorities.sort((a, b) => a.corps_id < b.corps_id ? -1 : a.corps_id > b.corps_id ? 1 : 0);

    return priorities;
}

/** Apply faction-specific constraints to front priorities. */
function applyFactionPersonality(
    faction: FactionId,
    currentTurn: number,
    priorities: FrontPriority[],
): void {
    const primaryCorps = priorities.filter(p => p.role === 'primary');
    const nonExcluded = priorities.filter(p => p.role !== 'contain' || p.suggested_stance !== 'reorganize');

    if (faction === 'RS') {
        if (currentTurn < 26) {
            // VRS early war: force at least 1 primary
            if (primaryCorps.length === 0) {
                // Promote the best secondary to primary
                const best = priorities.find(p => p.role === 'secondary');
                if (best) {
                    best.role = 'primary';
                    best.suggested_stance = 'offensive';
                }
            }
        } else if (currentTurn > 52) {
            // VRS late war: max 1 primary
            let seenPrimary = false;
            for (const p of priorities) {
                if (p.role === 'primary') {
                    if (seenPrimary) {
                        p.role = 'secondary';
                        p.suggested_stance = 'balanced';
                    }
                    seenPrimary = true;
                }
            }
        }
    } else if (faction === 'RBiH') {
        if (currentTurn < 40) {
            // ARBiH early war: no primary — survival mode
            for (const p of priorities) {
                if (p.role === 'primary') {
                    p.role = 'secondary';
                    p.suggested_stance = 'balanced';
                }
            }
        } else if (currentTurn <= 80) {
            // ARBiH mid-war: max 1 primary
            let seenPrimary = false;
            for (const p of priorities) {
                if (p.role === 'primary') {
                    if (seenPrimary) {
                        p.role = 'secondary';
                        p.suggested_stance = 'balanced';
                    }
                    seenPrimary = true;
                }
            }
        }
        // ARBiH late war (>80): up to 2 primary — no additional cap needed
    } else if (faction === 'HRHB') {
        // HRHB: max 1 primary. Herzegovina corps preferred.
        const hrhbPrimary = priorities.filter(p => p.role === 'primary');
        if (hrhbPrimary.length > 1) {
            // Keep Herzegovina corps if present, demote others
            const herzegovinaIdx = hrhbPrimary.findIndex(p =>
                p.corps_id.includes('herzegovina') || p.corps_id.includes('southeast'),
            );
            for (let i = 0; i < hrhbPrimary.length; i++) {
                if (i !== (herzegovinaIdx >= 0 ? herzegovinaIdx : 0)) {
                    hrhbPrimary[i].role = 'secondary';
                    hrhbPrimary[i].suggested_stance = 'balanced';
                }
            }
        }
    }
}

/** Generate doctrine override from theater assessment and front priorities. */
function generateDoctrineOverride(
    faction: FactionId,
    assessment: TheaterAssessment,
    currentTurn: number,
    priorities: FrontPriority[],
): DoctrineOverride {
    let armyStance: DoctrineOverride['army_stance'] = 'balanced';
    let aggression = 0.0;

    // Compute average exhaustion
    const corpsAssessments = assessment.corps_assessments;
    const totalExhaustion = corpsAssessments.reduce((sum, c) => sum + c.exhaustion, 0);
    const avgExhaustion = corpsAssessments.length > 0 ? totalExhaustion / corpsAssessments.length : 0;

    // Territory + supply + manpower → army stance
    if (assessment.territory_trend === 'losing' &&
        (assessment.manpower_status === 'critical' || assessment.supply_status === 'critical')) {
        armyStance = 'general_defensive';
        aggression = -0.15;
    } else if (assessment.territory_trend === 'gaining' && assessment.supply_status !== 'critical') {
        armyStance = 'general_offensive';
        aggression = 0.10;
    } else if (avgExhaustion > 40) {
        armyStance = 'balanced';
        aggression = -0.05;
    }

    // Faction adjustments
    if (faction === 'RS' && currentTurn < 26) {
        if (armyStance !== 'general_offensive') {
            aggression += 0.05;
        }
        if (armyStance === 'balanced') {
            armyStance = 'general_offensive';
        }
    } else if (faction === 'RBiH' && currentTurn < 40) {
        armyStance = 'general_defensive';
        if (aggression > -0.15) aggression = -0.15;
    } else if (faction === 'HRHB') {
        if (armyStance === 'general_offensive') {
            armyStance = 'balanced';
            aggression = Math.min(aggression, 0.0);
        }
    }

    // Corps stance ceilings from front priorities
    const corpsStanceCeilings: Record<string, 'offensive' | 'balanced' | 'defensive' | 'reorganize'> = {};
    for (const p of priorities) {
        if (p.role === 'economy') {
            corpsStanceCeilings[p.corps_id] = 'balanced';
        } else if (p.role === 'contain') {
            corpsStanceCeilings[p.corps_id] = 'defensive';
        }
    }

    return {
        army_stance: armyStance,
        corps_stance_ceilings: Object.keys(corpsStanceCeilings).length > 0 ? corpsStanceCeilings : undefined,
        aggression_modifier: aggression,
    };
}

// ── Synchronized Operations ──────────────────────────────────────────────

/** Max sync operations per gathering to avoid over-coordination. */
const MAX_SYNC_OPS_PER_GATHERING = 2;

/**
 * Generate synchronized multi-corps operations from front priorities.
 * Pairs primary/secondary corps that share enemy contact for coordinated launch.
 */
export function generateSynchronizedOperations(
    assessment: TheaterAssessment,
    priorities: FrontPriority[],
    currentTurn: number,
): SynchronizedOperation[] {
    // 1. Find all corps with role 'primary' or 'secondary' that are eligible
    const eligible: Array<{ corpsId: string; role: string; score: number }> = [];
    for (const p of priorities) {
        if (p.role !== 'primary' && p.role !== 'secondary') continue;
        const ca = assessment.corps_assessments.find(c => c.corps_id === p.corps_id);
        if (!ca) continue;
        if (ca.attendance === 'excluded') continue;
        if (ca.available_brigades < SYNC_MIN_BRIGADES) continue;
        if (ca.sector_threat_avg <= 0) continue; // Not in contact with enemy
        eligible.push({
            corpsId: p.corps_id,
            role: p.role,
            score: computeOpportunityScore(ca),
        });
    }

    // Sort for determinism
    eligible.sort((a, b) => {
        if (a.corpsId < b.corpsId) return -1;
        if (a.corpsId > b.corpsId) return 1;
        return 0;
    });

    // 2. Generate pairs: at least one must be 'primary'
    const syncOps: SynchronizedOperation[] = [];
    const used = new Set<string>();

    for (let i = 0; i < eligible.length && syncOps.length < MAX_SYNC_OPS_PER_GATHERING; i++) {
        if (used.has(eligible[i]!.corpsId)) continue;
        if (eligible[i]!.role !== 'primary') continue; // First of pair must be primary

        for (let j = i + 1; j < eligible.length; j++) {
            if (used.has(eligible[j]!.corpsId)) continue;
            if (syncOps.length >= MAX_SYNC_OPS_PER_GATHERING) break;

            const a = eligible[i]!;
            const b = eligible[j]!;

            // Determine main effort vs supporting by opportunity score
            const aIsMain = a.score >= b.score;
            const mainCorps = aIsMain ? a : b;
            const supportCorps = aIsMain ? b : a;

            // Get offensive_targets from main effort's FrontPriority
            const mainPriority = priorities.find(p => p.corps_id === mainCorps.corpsId);
            const targetArea = mainPriority?.offensive_targets ?? [];

            const participants: SyncOpParticipant[] = [
                {
                    corps_id: mainCorps.corpsId,
                    role: 'main_effort',
                    target_osids: [],
                    min_brigades: SYNC_MIN_BRIGADES,
                },
                {
                    corps_id: supportCorps.corpsId,
                    role: 'supporting',
                    target_osids: [],
                    min_brigades: SYNC_MIN_BRIGADES,
                },
            ];

            syncOps.push({
                name: `sync_${mainCorps.corpsId}_${supportCorps.corpsId}`,
                participants,
                launch_window_start: currentTurn + 3,
                launch_window_end: currentTurn + 3 + SYNC_WINDOW_DEFAULT,
                target_area: targetArea,
            });

            used.add(a.corpsId);
            used.add(b.corpsId);
            break; // Move to next primary
        }
    }

    return syncOps;
}

/**
 * Convert synchronized operations from a campaign plan into ArmyHQOverride entries.
 * These overrides are consumed by the existing corps directive system.
 */
export function generateSyncOperationOverrides(
    state: GameState,
    _faction: FactionId,
    plan: CampaignPlan,
): void {
    if (plan.synchronized_operations.length === 0) return;

    if (!state.military.army_hq_overrides) {
        state.military.army_hq_overrides = [];
    }

    for (const syncOp of plan.synchronized_operations) {
        for (const participant of syncOp.participants) {
            state.military.army_hq_overrides.push({
                corps_id: participant.corps_id,
                operation_name: syncOp.name,
                min_brigades: participant.min_brigades,
                target_osids: participant.target_osids,
                reason: `Synchronized operation: ${syncOp.name} (${participant.role})`,
                issued_turn: plan.issued_turn,
                type: participant.role === 'feint' ? 'feint' : 'offensive',
                max_brigades: 12,
            });
        }
    }
}

// ── Pipeline Integration ─────────────────────────────────────────────────

/**
 * Top-level gathering evaluation. Called once per turn per bot faction.
 * Checks if a gathering should occur, runs assessment, generates plan, writes to state.
 */
export function evaluateArmyHQGathering(
    state: GameState, faction: FactionId, currentTurn: number
): void {
    const { gather, reason } = shouldGather(state, faction, currentTurn);
    if (!gather) return;

    const emergency = reason !== 'regular_cadence';
    const assessment = assessTheater(state, faction);
    const plan = generateCampaignPlan(state, faction, assessment, currentTurn, reason, emergency);

    // Write plan to state
    if (!state.military.campaign_plans) {
        state.military.campaign_plans = {};
    }
    state.military.campaign_plans[faction] = plan;

    if (!state.military.last_gathering_turn) {
        state.military.last_gathering_turn = {};
    }
    state.military.last_gathering_turn[faction] = currentTurn;

    // Generate army HQ overrides for synchronized operations
    generateSyncOperationOverrides(state, faction, plan);
}
