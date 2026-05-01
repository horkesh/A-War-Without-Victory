/**
 * corps_operation_readiness.ts — Phase 4 of FORCE QUALITY FOUNDATION milestone.
 *
 * Pure deterministic helper that converts the existing force-quality stack
 * (brigade officer_quality, faction_officer_maturity, capability_profile,
 * cohesion, morale, exhaustion, pool pressure, equipment composition) into
 * seven named operation-readiness traits in the range [0, 1].
 *
 * This is the "readiness/execution layer" between historical opportunity and
 * the existing CorpsOperation lifecycle. It does NOT touch combat math; it
 * only shapes whether/how plans get proposed, accepted, and staged.
 *
 * Architecture contract:
 *   docs/plans/2026-05-01-force-quality-operation-architecture-contract.md
 * Audit reference:
 *   docs/40_reports/implemented/20260501_FORCE_QUALITY_TRAJECTORY_EVIDENCE_AUDIT.md
 *   §3 (live-consumer trace), §10 items 3+5 (consumer wiring), CC2/CC3
 *   (proves faction_officer_maturity + capability_profile were decorative).
 *
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Canonical helper for force-quality readiness derivation
 * DOMAIN:    Operation readiness/execution layer
 * ═══════════════════════════════════════════════════════════════
 *
 * READS:     state.military.formations, state.military.faction_officer_maturity,
 *            state.factions[*].capability_profile, state.military.corps_command,
 *            state.political.war_exhaustion, state.political.war_supply_pressure
 * WRITES:    Nothing — pure helper, mutates nothing.
 * MUST NOT:  Touch combat math, attack share, or any combat multiplier.
 *
 * CONSUMERS:
 *   - src/sim/combat/commander/plan.ts (managePlan, plan creation gate)
 *   - src/sim/combat/operation_aar.ts (force_quality_traits_at_launch on AAR)
 *
 * TRUTH INVARIANTS:
 * - Pure helper: state is read-only; no mutations.
 * - All seven traits are clamped to [0, 1].
 * - "collapse_susceptibility" is the only inverse trait — higher = worse.
 * - Deterministic: strictCompare for all sorting, no Math.random / Date.now.
 * - Weights are explicit/placeholder; tuning is a separate packet (P2 in audit).
 * - Defaults are neutral (0.5) when an input is missing.
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Public types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Seven named force-quality traits derived per corps.
 *
 * All traits are in the range [0, 1].
 *
 * Six traits read positively (higher = better):
 *   - operation_readiness, staging_reliability, axis_coordination,
 *     support_delivery, failure_recovery, reserve_response.
 *
 * One trait reads inversely (higher = worse):
 *   - collapse_susceptibility ("susceptibility" — line unraveling under pressure).
 */
export interface CorpsOperationReadinessTraits {
    /** Can this corps launch at all? */
    readonly operation_readiness: number;
    /** Can brigades reach the start line in time? */
    readonly staging_reliability: number;
    /** Can multiple axes act together? */
    readonly axis_coordination: number;
    /** Is artillery/armor support meaningful? */
    readonly support_delivery: number;
    /** Can the corps regroup after repulse? */
    readonly failure_recovery: number;
    /** Can army/corps reserves arrive when needed? */
    readonly reserve_response: number;
    /** Does the line unravel under pressure? Higher = more susceptible (worse). */
    readonly collapse_susceptibility: number;
}

/**
 * Compact summary of the inputs that fed the trait computation.
 *
 * Persisted on AAR + decision_trace so a reviewer can see WHY traits came out
 * the way they did. Player-safe in the sense that it surfaces the same numbers
 * already in state, not hidden formulas.
 */
export interface CorpsOperationReadinessInputSnapshot {
    readonly corps_id: FormationId;
    readonly faction: FactionId;
    readonly turn: number;
    readonly mean_officer_quality: number;
    readonly p25_officer_quality: number;
    readonly active_subordinate_count: number;
    readonly faction_officer_maturity_normalized: number;
    readonly capability_training_quality: number;
    readonly capability_organizational_maturity: number;
    readonly capability_equipment: number;
    readonly capability_doctrine_attack: number;
    readonly mean_cohesion_normalized: number;
    readonly mean_morale_normalized: number;
    readonly corps_exhaustion_normalized: number;
    readonly faction_pool_pressure: number;
    readonly corps_consecutive_failures: number;
    readonly corps_equipment_support_fraction: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Neutral default when a numeric input cannot be derived. */
const NEUTRAL_DEFAULT = 0.5;

/** Faction officer maturity is computed in officer_experience.ts as the mean
 *  competence of active named officers, falling back to 3.0. The expected
 *  range is [1, 5] (per officer_types.ts). Normalize linearly with 3.0 → 0.5. */
const FACTION_MATURITY_NEUTRAL = 3.0;
const FACTION_MATURITY_MIN = 1.0;
const FACTION_MATURITY_MAX = 5.0;

/** Soft ceiling for corps_exhaustion when normalizing to [0, 1]. corps_exhaustion
 *  is reported on a 0-100 scale (briefing.corps_exhaustion). MAX_EXHAUSTION_FOR_OPERATION
 *  is 30 in bot_constants — we use 100 as the saturation cap so very high values
 *  still saturate cleanly. */
const CORPS_EXHAUSTION_CAP = 100;

/** Faction pool pressure: war_supply_pressure is reported on a 0-100 scale,
 *  higher = worse. Normalize to [0, 1]. */
const FACTION_POOL_PRESSURE_CAP = 100;

/** Cohesion and morale are stored on a 0-100 scale; normalize to [0, 1]. */
const COHESION_SCALE = 100;
const MORALE_SCALE = 100;

/** Maximum corps consecutive_failures considered before saturation in trait
 *  formulas. Five failures is a strong signal a corps cannot sustain initiative. */
const CONSECUTIVE_FAILURES_SATURATION = 5;

// ═══════════════════════════════════════════════════════════════════════════
// Subroutines — input gathering (pure, deterministic)
// ═══════════════════════════════════════════════════════════════════════════

interface BrigadeOfficerStats {
    readonly mean: number;
    readonly p25: number;
    readonly count: number;
}

/** Mean and p25 of officer_quality across active subordinate brigades.
 *  Returns mean = NEUTRAL_DEFAULT, count = 0 when no active subordinates exist. */
function corpsBrigadeOfficerQuality(state: GameState, corpsId: FormationId): BrigadeOfficerStats {
    const formations = state.military?.formations ?? {};
    const ids = Object.keys(formations).sort(strictCompare);
    const qualities: number[] = [];
    for (const id of ids) {
        const f = formations[id] as FormationState | undefined;
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade') continue;
        if (f.corps_id !== corpsId) continue;
        const q = f.officer_quality;
        if (typeof q !== 'number' || !Number.isFinite(q)) continue;
        qualities.push(q);
    }
    if (qualities.length === 0) {
        return { mean: NEUTRAL_DEFAULT, p25: NEUTRAL_DEFAULT, count: 0 };
    }
    qualities.sort((a, b) => a - b);
    const sum = qualities.reduce((acc, v) => acc + v, 0);
    const mean = sum / qualities.length;
    // p25: index = floor(0.25 * (n - 1)). Stable across runs because qualities sorted.
    const p25Idx = Math.floor(0.25 * (qualities.length - 1));
    const p25 = qualities[p25Idx] ?? mean;
    return { mean, p25, count: qualities.length };
}

/** faction_officer_maturity is on [1, 5] with 3.0 neutral. Normalize to [0, 1]. */
function factionOfficerMaturityNormalized(state: GameState, faction: FactionId): number {
    const map = state.military?.faction_officer_maturity;
    const raw = map?.[faction];
    const value = (typeof raw === 'number' && Number.isFinite(raw)) ? raw : FACTION_MATURITY_NEUTRAL;
    const clamped = Math.max(FACTION_MATURITY_MIN, Math.min(FACTION_MATURITY_MAX, value));
    return (clamped - FACTION_MATURITY_MIN) / (FACTION_MATURITY_MAX - FACTION_MATURITY_MIN);
}

interface FactionCapabilityFields {
    readonly training_quality: number;
    readonly organizational_maturity: number;
    readonly equipment: number;
    readonly doctrine_attack: number;
}

/** Snapshot of capability_profile fields used by readiness traits.
 *  Reads training_quality, organizational_maturity, equipment_access (or
 *  equipment_operational fallback), and doctrine_effectiveness.ATTACK (or
 *  COORDINATED_STRIKE fallback for HRHB). Defaults to NEUTRAL_DEFAULT when
 *  capability_profile is absent. */
function factionCapabilityProfile(state: GameState, faction: FactionId): FactionCapabilityFields {
    const factions = Array.isArray(state.factions) ? state.factions : [];
    const factionState = factions.find((f) => f && f.id === faction);
    const profile = factionState?.capability_profile;
    if (!profile) {
        return {
            training_quality: NEUTRAL_DEFAULT,
            organizational_maturity: NEUTRAL_DEFAULT,
            equipment: NEUTRAL_DEFAULT,
            doctrine_attack: NEUTRAL_DEFAULT,
        };
    }
    const training = typeof profile.training_quality === 'number' && Number.isFinite(profile.training_quality)
        ? clamp01(profile.training_quality)
        : NEUTRAL_DEFAULT;
    const organizational = typeof profile.organizational_maturity === 'number' && Number.isFinite(profile.organizational_maturity)
        ? clamp01(profile.organizational_maturity)
        : NEUTRAL_DEFAULT;
    // Equipment: prefer equipment_access (RBiH/HRHB), fall back to equipment_operational (RS),
    // then to NEUTRAL_DEFAULT. Both fields are on [0, 1].
    const equipmentAccess = profile.equipment_access;
    const equipmentOperational = profile.equipment_operational;
    let equipment: number;
    if (typeof equipmentAccess === 'number' && Number.isFinite(equipmentAccess)) {
        equipment = clamp01(equipmentAccess);
    } else if (typeof equipmentOperational === 'number' && Number.isFinite(equipmentOperational)) {
        equipment = clamp01(equipmentOperational);
    } else {
        equipment = NEUTRAL_DEFAULT;
    }
    // Doctrine: ATTACK is the natural readiness signal; COORDINATED_STRIKE is HRHB's
    // late-war specialty. Take the max of the two so HRHB 1995 doesn't get penalised.
    const doctrineMap = profile.doctrine_effectiveness ?? {};
    const attackVal = doctrineMap['ATTACK'];
    const coordVal = doctrineMap['COORDINATED_STRIKE'];
    let doctrineAttack = NEUTRAL_DEFAULT;
    let saw = false;
    if (typeof attackVal === 'number' && Number.isFinite(attackVal)) {
        doctrineAttack = attackVal;
        saw = true;
    }
    if (typeof coordVal === 'number' && Number.isFinite(coordVal)) {
        doctrineAttack = saw ? Math.max(doctrineAttack, coordVal) : coordVal;
        saw = true;
    }
    if (!saw) doctrineAttack = NEUTRAL_DEFAULT;
    return {
        training_quality: training,
        organizational_maturity: organizational,
        equipment,
        doctrine_attack: clamp01(doctrineAttack),
    };
}

interface CohesionMoraleStats {
    readonly cohesion_normalized: number;
    readonly morale_normalized: number;
}

/** Mean cohesion + mean morale across active subordinate brigades, normalized to [0, 1]. */
function corpsCohesionMorale(state: GameState, corpsId: FormationId): CohesionMoraleStats {
    const formations = state.military?.formations ?? {};
    const ids = Object.keys(formations).sort(strictCompare);
    let cohSum = 0;
    let cohCount = 0;
    let morSum = 0;
    let morCount = 0;
    for (const id of ids) {
        const f = formations[id] as FormationState | undefined;
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade') continue;
        if (f.corps_id !== corpsId) continue;
        if (typeof f.cohesion === 'number' && Number.isFinite(f.cohesion)) {
            cohSum += f.cohesion;
            cohCount += 1;
        }
        if (typeof f.morale === 'number' && Number.isFinite(f.morale)) {
            morSum += f.morale;
            morCount += 1;
        }
    }
    return {
        cohesion_normalized: cohCount > 0 ? clamp01(cohSum / cohCount / COHESION_SCALE) : NEUTRAL_DEFAULT,
        morale_normalized: morCount > 0 ? clamp01(morSum / morCount / MORALE_SCALE) : NEUTRAL_DEFAULT,
    };
}

/** corps_exhaustion lives on CorpsCommandState; clamp to [0, 1] with 100 as cap.
 *  Higher = worse (more exhausted). */
function corpsExhaustionNormalized(state: GameState, corpsId: FormationId): number {
    const corpsCmd = state.military?.corps_command?.[corpsId];
    const raw = corpsCmd?.corps_exhaustion;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
    return clamp01(raw / CORPS_EXHAUSTION_CAP);
}

/** Faction pool pressure: war_supply_pressure is on [0, 100], higher = worse.
 *  Returns [0, 1] with 0 = no pressure, 1 = saturated. */
function factionPoolPressure(state: GameState, faction: FactionId): number {
    const map = state.political?.war_supply_pressure;
    const raw = map?.[faction];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
    return clamp01(raw / FACTION_POOL_PRESSURE_CAP);
}

/** Corps consecutive failures from CommanderState. Returns 0 if not present. */
function corpsConsecutiveFailures(state: GameState, corpsId: FormationId): number {
    const corpsCmd = state.military?.corps_command?.[corpsId];
    const cs = corpsCmd?.commander_state;
    if (!cs) return 0;
    // Aggregate across operation_history: count the most-recent run of 'failure'+'abandoned'
    // outcomes. Capped at saturation. Pure read; deterministic.
    const history = cs.operation_history ?? [];
    if (history.length === 0) return 0;
    // Sort by ended_turn descending (deterministic when ties via operation_name).
    const sortedHistory = [...history].sort((a, b) => {
        const dt = b.ended_turn - a.ended_turn;
        if (dt !== 0) return dt;
        return strictCompare(a.operation_name, b.operation_name);
    });
    let streak = 0;
    for (const entry of sortedHistory) {
        if (entry.outcome === 'failure' || entry.outcome === 'abandoned') {
            streak += 1;
            if (streak >= CONSECUTIVE_FAILURES_SATURATION) break;
        } else {
            break;
        }
    }
    return streak;
}

/** Equipment support fraction: mean fraction of (tank_op + artillery_op) across
 *  subordinate active brigades. Returns NEUTRAL_DEFAULT when no active subordinates. */
function corpsEquipmentSupport(state: GameState, corpsId: FormationId): number {
    const formations = state.military?.formations ?? {};
    const ids = Object.keys(formations).sort(strictCompare);
    let opTotal = 0;
    let allTotal = 0;
    let count = 0;
    for (const id of ids) {
        const f = formations[id] as FormationState | undefined;
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade') continue;
        if (f.corps_id !== corpsId) continue;
        const comp = f.composition;
        if (!comp) continue;
        const tanks = typeof comp.tanks === 'number' ? comp.tanks : 0;
        const artillery = typeof comp.artillery === 'number' ? comp.artillery : 0;
        const total = tanks + artillery;
        if (total <= 0) {
            count += 1;
            continue;
        }
        const tankCond = comp.tank_condition;
        const artCond = comp.artillery_condition;
        const tankOpFrac = tankCond && typeof tankCond.operational === 'number' ? tankCond.operational : 0;
        const artOpFrac = artCond && typeof artCond.operational === 'number' ? artCond.operational : 0;
        const opUnits = tanks * tankOpFrac + artillery * artOpFrac;
        opTotal += opUnits;
        allTotal += total;
        count += 1;
    }
    if (count === 0 || allTotal <= 0) return NEUTRAL_DEFAULT;
    return clamp01(opTotal / allTotal);
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pure deterministic helper that derives the seven readiness traits.
 *
 * State is read-only; no mutations. Inputs are gathered via dedicated
 * subroutines, each defaulting to a neutral value when state is missing.
 *
 * Trait formulas use additive/linear weights that are deliberately explicit
 * (not tuned). Weights chosen to be balanced and additive; tuning is a
 * separate packet (P2 in audit, see force-quality architecture contract).
 */
export function computeCorpsOperationReadiness(
    state: GameState,
    corpsId: FormationId,
): CorpsOperationReadinessTraits {
    const officers = corpsBrigadeOfficerQuality(state, corpsId);
    const factionId = (state.military?.formations?.[corpsId]?.faction
        ?? state.military?.corps_command?.[corpsId]?.['faction' as never]) as FactionId | undefined;
    // Resolve faction: if corps formation is present, use its faction; otherwise
    // fall back to scanning subordinate brigades (deterministic — sorted IDs).
    const faction = factionId ?? resolveFactionFromSubordinates(state, corpsId);
    const maturity = factionOfficerMaturityNormalized(state, faction);
    const cap = factionCapabilityProfile(state, faction);
    const cm = corpsCohesionMorale(state, corpsId);
    const exhaustion = corpsExhaustionNormalized(state, corpsId);
    const poolPressure = factionPoolPressure(state, faction);
    const failures = corpsConsecutiveFailures(state, corpsId);
    const equipSupport = corpsEquipmentSupport(state, corpsId);

    const officerQ = clamp01(officers.mean);
    const cohesion = cm.cohesion_normalized;
    const morale = cm.morale_normalized;

    const operation_readiness = clamp01(
        0.30 * officerQ
        + 0.20 * cohesion
        + 0.15 * morale
        + 0.15 * (1 - exhaustion)
        + 0.10 * maturity
        + 0.10 * cap.organizational_maturity,
    );

    const staging_reliability = clamp01(
        0.40 * cap.organizational_maturity
        + 0.25 * cap.training_quality
        + 0.20 * officerQ
        + 0.15 * (1 - exhaustion),
    );

    const axis_coordination = clamp01(
        0.40 * maturity
        + 0.30 * cap.doctrine_attack
        + 0.20 * officerQ
        + 0.10 * cohesion,
    );

    const support_delivery = clamp01(
        0.50 * equipSupport
        + 0.30 * cap.equipment
        + 0.20 * (1 - poolPressure),
    );

    const failureFloor = Math.max(0, 1 - (failures / CONSECUTIVE_FAILURES_SATURATION));
    const failure_recovery = clamp01(
        0.35 * morale
        + 0.25 * officerQ
        + 0.20 * cohesion
        + 0.20 * failureFloor,
    );

    const reserve_response = clamp01(
        0.40 * maturity
        + 0.30 * cap.organizational_maturity
        + 0.30 * (1 - poolPressure),
    );

    const failureSat = Math.min(1, failures / CONSECUTIVE_FAILURES_SATURATION);
    const collapse_susceptibility = clamp01(
        0.40 * (1 - morale)
        + 0.30 * (1 - cohesion)
        + 0.20 * failureSat
        + 0.10 * (1 - officerQ),
    );

    return {
        operation_readiness,
        staging_reliability,
        axis_coordination,
        support_delivery,
        failure_recovery,
        reserve_response,
        collapse_susceptibility,
    };
}

/**
 * Build an input snapshot for diagnostic surfaces (AAR, decision_trace).
 *
 * Pure: state is read-only. Returns the same numbers that fed
 * computeCorpsOperationReadiness so a reviewer can correlate trait
 * values with the underlying signals.
 */
export function buildCorpsOperationReadinessInputSnapshot(
    state: GameState,
    corpsId: FormationId,
): CorpsOperationReadinessInputSnapshot {
    const officers = corpsBrigadeOfficerQuality(state, corpsId);
    const factionId = state.military?.formations?.[corpsId]?.faction as FactionId | undefined;
    const faction = factionId ?? resolveFactionFromSubordinates(state, corpsId);
    const maturity = factionOfficerMaturityNormalized(state, faction);
    const cap = factionCapabilityProfile(state, faction);
    const cm = corpsCohesionMorale(state, corpsId);
    const exhaustion = corpsExhaustionNormalized(state, corpsId);
    const poolPressure = factionPoolPressure(state, faction);
    const failures = corpsConsecutiveFailures(state, corpsId);
    const equipSupport = corpsEquipmentSupport(state, corpsId);
    const turn = state.meta?.turn ?? 0;
    return {
        corps_id: corpsId,
        faction,
        turn,
        mean_officer_quality: officers.mean,
        p25_officer_quality: officers.p25,
        active_subordinate_count: officers.count,
        faction_officer_maturity_normalized: maturity,
        capability_training_quality: cap.training_quality,
        capability_organizational_maturity: cap.organizational_maturity,
        capability_equipment: cap.equipment,
        capability_doctrine_attack: cap.doctrine_attack,
        mean_cohesion_normalized: cm.cohesion_normalized,
        mean_morale_normalized: cm.morale_normalized,
        corps_exhaustion_normalized: exhaustion,
        faction_pool_pressure: poolPressure,
        corps_consecutive_failures: failures,
        corps_equipment_support_fraction: equipSupport,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function clamp01(x: number): number {
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.min(1, x));
}

/** Best-effort faction resolution: scan subordinate active brigades and return
 *  the first faction encountered (sorted iteration for determinism). Falls
 *  back to 'RBiH' so trait functions never crash on missing faction state. */
function resolveFactionFromSubordinates(state: GameState, corpsId: FormationId): FactionId {
    const formations = state.military?.formations ?? {};
    const ids = Object.keys(formations).sort(strictCompare);
    for (const id of ids) {
        const f = formations[id] as FormationState | undefined;
        if (!f || f.status !== 'active') continue;
        if (f.corps_id !== corpsId) continue;
        if (typeof f.faction === 'string') return f.faction as FactionId;
    }
    return 'RBiH';
}
