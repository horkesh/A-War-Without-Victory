/**
 * Officer Experience & Weight of Command (v0.4.4)
 *
 * Post-operation experience gain, faction learning curves,
 * heroic stand / defeatism checks.
 *
 * Deterministic: no Math.random(). All state mutations are replay-safe.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../../state/officer_types.js';
import { strictCompare } from '../../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Base experience gain per operation. */
const EXPERIENCE_BASE = 0.1;

/** Max competence (hard cap). */
const COMPETENCE_CAP = 5;

/** ARBiH learning curve multiplier (rabble → professional arc). */
const ARBIH_LEARNING_MULT = 1.5;

/** Per-operation skill shift toward offensive command. */
const OFFENSIVE_AGGRESSIVENESS_SHIFT = 0.05;
/** Per-operation skill shift away from defensive specialization. */
const DEFENSIVE_SKILL_SHIFT = -0.02;

/** Max skill drift from initial value (in either direction). */
const SKILL_SHIFT_CAP = 1.0;

/** Consecutive failures threshold for defeatism. */
const DEFEATISM_FAILURE_THRESHOLD = 3;
/** Competence loss on defeatism trigger. */
const DEFEATISM_COMPETENCE_LOSS = 0.3;

/** Defense ratio threshold for heroic stand. */
const HEROIC_STAND_RATIO = 3.0;
/** Aggressiveness boost from heroic stand. */
const HEROIC_STAND_AGGRESSIVENESS_GAIN = 1;
/** Corps morale boost from heroic stand. */
const HEROIC_STAND_MORALE_BOOST = 5;

// ═══════════════════════════════════════════════════════════════════════════
// Outcome multipliers
// ═══════════════════════════════════════════════════════════════════════════

export type OperationOutcomeLabel =
    | 'decisive'
    | 'victory'
    | 'costly'
    | 'stalemate'
    | 'repulsed'
    | 'catastrophic';

const OUTCOME_MULTIPLIERS: Record<OperationOutcomeLabel, number> = {
    decisive: 1.5,
    victory: 1.2,
    costly: 1.0,
    stalemate: 0.5,
    repulsed: 0.3,
    catastrophic: 0.1,
};

/**
 * Map AAR grade stars (1-5) to an outcome label.
 */
export function gradeStarsToOutcome(stars: number): OperationOutcomeLabel {
    if (stars >= 5) return 'decisive';
    if (stars >= 4) return 'victory';
    if (stars >= 3) return 'costly';
    if (stars >= 2) return 'stalemate';
    if (stars >= 1) return 'repulsed';
    return 'catastrophic';
}

// ═══════════════════════════════════════════════════════════════════════════
// Post-operation experience gain
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply experience gain to an officer after commanding an operation.
 * Mutates officer data (competence) and officer state (experience tracking).
 *
 * Only officers with `can_improve !== false` gain experience.
 * ARBiH officers get a 1.5x learning multiplier (historical learning curve).
 */
export function applyOperationExperience(
    state: GameState,
    officerId: string,
    outcome: OperationOutcomeLabel,
): void {
    const officerData = state.military.named_officer_data;
    const officers = state.military.named_officers;
    if (!officerData || !officers) return;

    const data = officerData.find(o => o.id === officerId);
    const os = officers[officerId];
    if (!data || !os) return;

    // Track operations commanded regardless of can_improve
    os.operations_commanded = (os.operations_commanded ?? 0) + 1;

    if (!data.can_improve) return;

    // Snapshot initial values on first experience gain
    if (os.initial_competence === undefined) {
        os.initial_competence = data.competence;
    }
    if (os.initial_aggressiveness === undefined) {
        os.initial_aggressiveness = data.aggressiveness;
    }

    // Compute experience gain
    const outcomeMult = OUTCOME_MULTIPLIERS[outcome] ?? 1.0;
    const factionMult = data.faction === 'RBiH' ? ARBIH_LEARNING_MULT : 1.0;
    const gain = EXPERIENCE_BASE * outcomeMult * factionMult;

    // Accumulate experience points (informational)
    os.experience_points = (os.experience_points ?? 0) + gain;

    // Grow competence (capped at COMPETENCE_CAP)
    data.competence = Math.min(COMPETENCE_CAP, data.competence + gain);

    // Skill shift: offensive command experience nudges aggressiveness up, defensive down
    const initAgg = os.initial_aggressiveness!;
    const initDef = data.defensive_skill; // defensive_skill shift is minor, no initial tracking needed
    const aggShift = OFFENSIVE_AGGRESSIVENESS_SHIFT;
    const defShift = DEFENSIVE_SKILL_SHIFT;

    // Apply aggressiveness shift, capped at ±SKILL_SHIFT_CAP from initial
    const newAgg = data.aggressiveness + aggShift;
    data.aggressiveness = Math.max(1, Math.min(5,
        Math.max(initAgg - SKILL_SHIFT_CAP, Math.min(initAgg + SKILL_SHIFT_CAP, newAgg))
    ));

    // Apply defensive skill shift, capped at ±SKILL_SHIFT_CAP from initial
    const newDef = data.defensive_skill + defShift;
    data.defensive_skill = Math.max(1, Math.min(5, newDef));
}

// ═══════════════════════════════════════════════════════════════════════════
// Faction officer maturity
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute average competence of active officers for a faction.
 * Returns 3.0 (neutral) if no active officers exist.
 */
export function getFactionOfficerMaturity(state: GameState, faction: FactionId): number {
    const officers = state.military.named_officers;
    const officerData = state.military.named_officer_data;
    if (!officers || !officerData) return 3.0;

    let sum = 0;
    let count = 0;

    const ids = Object.keys(officers).sort(strictCompare);
    for (const id of ids) {
        const os = officers[id]!;
        if (os.status !== 'active') continue;
        const data = officerData.find(o => o.id === id);
        if (!data || data.faction !== faction) continue;
        sum += data.competence;
        count++;
    }

    return count > 0 ? sum / count : 3.0;
}

/**
 * Compute and store faction officer maturity for all factions.
 * Called once per turn in the pipeline.
 */
export function updateFactionOfficerMaturity(state: GameState): void {
    const factions: FactionId[] = ['RBiH', 'RS', 'HRHB'];
    if (!state.military.faction_officer_maturity) {
        state.military.faction_officer_maturity = {};
    }
    for (const f of factions) {
        state.military.faction_officer_maturity[f] = getFactionOfficerMaturity(state, f);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Heroic stand / defeatism
// ═══════════════════════════════════════════════════════════════════════════

export interface HeroicStandResult {
    triggered: boolean;
    officer_id: string;
    aggressiveness_gain: number;
    morale_boost: number;
}

/**
 * Check if an officer's defense against overwhelming odds qualifies as a heroic stand.
 * Triggered when successful defense at 3:1+ power ratio.
 *
 * Effects: aggressiveness +1 (capped at 5), corps morale +5.
 */
export function checkHeroicStand(
    state: GameState,
    officerId: string,
    defenseRatio: number,
): HeroicStandResult {
    const result: HeroicStandResult = {
        triggered: false,
        officer_id: officerId,
        aggressiveness_gain: 0,
        morale_boost: 0,
    };

    if (defenseRatio < HEROIC_STAND_RATIO) return result;

    const officerData = state.military.named_officer_data;
    const officers = state.military.named_officers;
    if (!officerData || !officers) return result;

    const data = officerData.find(o => o.id === officerId);
    const os = officers[officerId];
    if (!data || !os) return result;

    result.triggered = true;
    result.aggressiveness_gain = HEROIC_STAND_AGGRESSIVENESS_GAIN;
    result.morale_boost = HEROIC_STAND_MORALE_BOOST;

    // Apply aggressiveness boost
    data.aggressiveness = Math.min(COMPETENCE_CAP, data.aggressiveness + HEROIC_STAND_AGGRESSIVENESS_GAIN);

    return result;
}

export interface DefeatismResult {
    triggered: boolean;
    officer_id: string;
    competence_loss: number;
}

/**
 * Check if an officer has suffered enough consecutive failures to trigger defeatism.
 * 3+ consecutive failures → competence -0.3.
 */
export function checkDefeatism(
    state: GameState,
    officerId: string,
    consecutiveFailures: number,
): DefeatismResult {
    const result: DefeatismResult = {
        triggered: false,
        officer_id: officerId,
        competence_loss: 0,
    };

    if (consecutiveFailures < DEFEATISM_FAILURE_THRESHOLD) return result;

    const officerData = state.military.named_officer_data;
    if (!officerData) return result;

    const data = officerData.find(o => o.id === officerId);
    if (!data) return result;

    result.triggered = true;
    result.competence_loss = DEFEATISM_COMPETENCE_LOSS;

    // Apply competence loss (floor at 1)
    data.competence = Math.max(1, data.competence - DEFEATISM_COMPETENCE_LOSS);

    return result;
}
