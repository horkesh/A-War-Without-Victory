/**
 * Peace-phase §4.8: RBiH–HRHB alliance update (per-turn deterministic).
 *
 * Drivers:
 *   (a) appeasement:  +APPEASEMENT_BASE_RATE when no bilateral incidents
 *   (b) patron_drag:  -PATRON_PRESSURE_COEFF * hrhb_patron_commitment
 *   (c) incident:     -INCIDENT_PENALTY_PER_FLIP * bilateral_flips_last_turn
 *   (d) ceasefire:    +CEASEFIRE_RECOVERY_RATE when ceasefire active
 *
 * Update is one-turn-delayed for incidents (this turn's flips feed next turn's update).
 * Canon: Phase_I_Specification_v0_4_0.md §4.8; Engine Invariants §J.
 */

import type { FactionId, GameState, RbihHrhbState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

// ── Tunable constants (all canon-referenced, version-controlled) ──

/** Positive drift per turn toward alliance when no bilateral incidents occurred last turn. */
export const APPEASEMENT_BASE_RATE = 0.003;
/** Negative drift per turn from HRHB patron commitment pressure. */
export const PATRON_PRESSURE_COEFF = 0.018;
/** Penalty per bilateral RBiH–HRHB control flip from the *previous* turn. */
export const INCIDENT_PENALTY_PER_FLIP = 0.04;
/** Positive recovery per turn when ceasefire is active. */
export const CEASEFIRE_RECOVERY_RATE = 0.015;
/** Penalty per weighted territorial competition incident from the previous turn. */
export const TERRITORIAL_INCIDENT_PENALTY = 0.02;
/** RS recapture by one ally in a mixed municipality is a partial RBiH-HRHB competition signal. */
export const MIXED_MUN_RS_RECAPTURE_PARTIAL = 0.5;

// ── Phase B1: Refugee pressure constants ──

/** Per-municipality per-turn degradation rate from refugee pressure. */
export const REFUGEE_PRESSURE_RATE = 0.004;
/** Displaced-in / original_population ratio cap for scaling (diminishing returns above this). */
export const REFUGEE_PRESSURE_RATIO_CAP = 0.30;
/** Minimum displaced ratio before refugee pressure kicks in. */
export const REFUGEE_PRESSURE_MIN_RATIO = 0.05;

/** Municipalities with mixed RBiH/HRHB populations where refugee influx strains alliance. */
export const REFUGEE_PRESSURE_MUNICIPALITIES: readonly string[] = [
    'bugojno',
    'busovaca',
    'kiseljak',
    'mostar',
    'novi_travnik',
    'travnik',
    'vitez'
];

/** Threshold above which RBiH and HRHB are considered allied (no bilateral flips). */
export const ALLIED_THRESHOLD = 0.20;
/** Threshold below which open war mechanics (minority erosion) begin. */
export const HOSTILE_THRESHOLD = 0.00;
/** Threshold for "strong alliance" (full coordination, joint defense). */
export const STRONG_ALLIANCE_THRESHOLD = 0.50;
/** Threshold for "full war" (maximum pressure, formation displacement). */
export const FULL_WAR_THRESHOLD = -0.50;

/** Alliance floor before war: prevents premature collapse. Alliance cannot drop below this until war_earliest_turn. */
export const ALLIANCE_FLOOR_BEFORE_WAR = 0.40;

/** Number of turns between mobilization start (alliance ≤ ALLIED_THRESHOLD) and combat enablement. */
export const MOBILIZATION_DURATION_TURNS = 4;

/** Default initial alliance value (fragile alliance, April 1992). */
export const DEFAULT_INIT_ALLIANCE = 0.75;

/** Default mixed municipalities with both RBiH and HRHB formations. */
export const DEFAULT_MIXED_MUNICIPALITIES: readonly string[] = [
    'bugojno',
    'busovaca',
    'kiseljak',
    'mostar',
    'novi_travnik',
    'travnik',
    'vitez'
];

export type AlliancePhase = 'strong_alliance' | 'fragile_alliance' | 'strained' | 'open_war' | 'full_war';

export function getAlliancePhase(value: number): AlliancePhase {
    if (value > STRONG_ALLIANCE_THRESHOLD) return 'strong_alliance';
    if (value > ALLIED_THRESHOLD) return 'fragile_alliance';
    if (value > HOSTILE_THRESHOLD) return 'strained';
    if (value >= FULL_WAR_THRESHOLD) return 'open_war';
    return 'full_war';
}

export function areRbihHrhbAllied(state: GameState): boolean {
    const value = state.political.war_alliance_rbih_hrhb;
    if (value === undefined || value === null) return true; // absent = allied
    return value > ALLIED_THRESHOLD;
}

/**
 * Check if territory controlled by `controller` is traversable by `factionId`.
 * Allied factions (RBiH↔HRHB when alliance > threshold) can move through each other's territory.
 */
export function isFriendlyFaction(controller: string | null | undefined, factionId: string, state: GameState): boolean {
    if (!controller) return false;
    if (controller === factionId) return true;
    // RBiH and HRHB can traverse each other's territory when allied
    if (
        (factionId === 'RBiH' && controller === 'HRHB') ||
        (factionId === 'HRHB' && controller === 'RBiH')
    ) {
        return areRbihHrhbAllied(state);
    }
    return false;
}

export function isRbihHrhbAtWar(state: GameState): boolean {
    const value = state.political.war_alliance_rbih_hrhb;
    if (value === undefined || value === null) return false;
    return value <= HOSTILE_THRESHOLD;
}

/**
 * True when alliance ≤ ALLIED_THRESHOLD but combat not yet enabled.
 * Front edges exist, sectors form, but no fighting between RBiH and HRHB.
 */
export function isRbihHrhbMobilizing(state: GameState): boolean {
    const value = state.political.war_alliance_rbih_hrhb;
    if (value === undefined || value === null) return false;
    if (value > ALLIED_THRESHOLD) return false; // still allied
    const rhs = state.political.rbih_hrhb_state;
    if (!rhs?.mobilization_started_turn) return false;
    return !isRbihHrhbCombatEnabled(state);
}

/**
 * True when HRHB-RBiH combat is allowed: mobilization expired OR alliance ≤ HOSTILE_THRESHOLD.
 * Returns false when still allied or during mobilization buildup.
 */
export function isRbihHrhbCombatEnabled(state: GameState): boolean {
    const value = state.political.war_alliance_rbih_hrhb;
    if (value === undefined || value === null) return false;
    if (value > ALLIED_THRESHOLD) return false; // still allied, no combat
    // Combat enabled if alliance is at war threshold
    if (value <= HOSTILE_THRESHOLD) return true;
    // Combat enabled if mobilization period expired
    const rhs = state.political.rbih_hrhb_state;
    if (!rhs?.mobilization_started_turn) return false;
    const turn = state.meta?.turn ?? 0;
    return (turn - rhs.mobilization_started_turn) >= MOBILIZATION_DURATION_TURNS;
}

/**
 * Returns true if a combat order between attacker and defender must be blocked because
 * the pair is RBiH↔HRHB and one of:
 *   - turn < rbih_hrhb_war_earliest_turn (default 26)
 *   - !isRbihHrhbCombatEnabled (still allied or in mobilization)
 *   - bilateral ceasefire active
 *   - Washington Agreement signed
 *
 * For non-RBiH↔HRHB pairs always returns false.
 *
 * Mirrors the gate at battle_resolution.ts (the canonical RBiH-HRHB gate). Centralized so
 * the same predicate is applied at every combat-flip site (battle_resolution, sector_offensive,
 * paramilitary_sweep, jna_phantom_brigades, attack_resolution_osid). See ledger entry for
 * Orasje post-WA regression.
 */
export function isRbihHrhbCombatBlocked(
    state: GameState,
    attackerFaction: string | null | undefined,
    defenderFaction: string | null | undefined
): boolean {
    if (!attackerFaction || !defenderFaction) return false;
    const isRbihVsHrhb =
        (attackerFaction === 'RBiH' && defenderFaction === 'HRHB') ||
        (attackerFaction === 'HRHB' && defenderFaction === 'RBiH');
    if (!isRbihVsHrhb) return false;
    const turn = state.meta?.turn ?? 0;
    const earliestTurn = state.meta?.rbih_hrhb_war_earliest_turn ?? 26;
    if (turn < earliestTurn) return true;
    if (!isRbihHrhbCombatEnabled(state)) return true;
    const rhs = state.political.rbih_hrhb_state;
    if (rhs?.ceasefire_active) return true;
    if (rhs?.washington_signed) return true;
    return false;
}

export interface AllianceUpdateReport {
    previous_value: number;
    new_value: number;
    delta: number;
    drivers: {
        appeasement: number;
        patron_drag: number;
        incident_penalty: number;
        territorial_penalty: number;
        ceasefire_boost: number;
        refugee_pressure: number;
    };
    phase: AlliancePhase;
    war_started_this_turn: boolean;
    mobilizing: boolean;
    locked: boolean;
}

/**
 * Initialize rbih_hrhb_state if absent.
 */
export function ensureRbihHrhbState(state: GameState, initValue?: number, initMixedMunicipalities?: string[]): void {
    if (state.political.war_alliance_rbih_hrhb === undefined || state.political.war_alliance_rbih_hrhb === null) {
        const phase0Value = state.political.phase0_relationships?.rbih_hrhb;
        state.political.war_alliance_rbih_hrhb = initValue
            ?? (typeof phase0Value === 'number' ? mapPhase0RelationshipToAlliance(phase0Value) : DEFAULT_INIT_ALLIANCE);
    }
    if (!state.political.rbih_hrhb_state) {
        const mixed = initMixedMunicipalities
            ? [...initMixedMunicipalities].sort(strictCompare)
            : [...DEFAULT_MIXED_MUNICIPALITIES].sort(strictCompare);
        state.political.rbih_hrhb_state = {
            war_started_turn: null,
            mobilization_started_turn: null,
            ceasefire_active: false,
            ceasefire_since_turn: null,
            washington_signed: false,
            washington_turn: null,
            stalemate_turns: 0,
            bilateral_flips_this_turn: 0,
            territorial_incidents_this_turn: 0,
            total_bilateral_flips: 0,
            allied_mixed_municipalities: mixed,
            bilateral_diverted_corps: {},
            bilateral_corps_release_progress: {}
        } satisfies RbihHrhbState;
    } else if (typeof state.political.rbih_hrhb_state.territorial_incidents_this_turn !== 'number') {
        state.political.rbih_hrhb_state.territorial_incidents_this_turn = 0;
    }
    const rhs = state.political.rbih_hrhb_state;
    if (rhs) {
        rhs.bilateral_diverted_corps ??= {};
        rhs.bilateral_corps_release_progress ??= {};
    }
}

export function mapPhase0RelationshipToAlliance(phase0Value: number): number {
    const clampedPhase0 = Math.max(0, Math.min(1, phase0Value));
    const degradation = 1 - clampedPhase0;
    const raw = DEFAULT_INIT_ALLIANCE - degradation * 0.35;
    return Math.max(ALLIANCE_FLOOR_BEFORE_WAR, Math.min(DEFAULT_INIT_ALLIANCE, raw));
}

/**
 * Per-turn alliance value update (Peace-phase §4.8). Pure function of state; no randomness.
 * Must run BEFORE control flip (so this turn's threshold governs flip eligibility).
 * Uses bilateral_flips_this_turn from PREVIOUS turn (one-turn-delayed feedback).
 */
export function updateAllianceValue(state: GameState): AllianceUpdateReport {
    ensureRbihHrhbState(state);
    const rhs = state.political.rbih_hrhb_state!;

    const previousValue = state.political.war_alliance_rbih_hrhb!;

    // If Washington signed, alliance is locked — no update.
    if (rhs.washington_signed) {
        return {
            previous_value: previousValue,
            new_value: previousValue,
            delta: 0,
            drivers: { appeasement: 0, patron_drag: 0, incident_penalty: 0, territorial_penalty: 0, ceasefire_boost: 0, refugee_pressure: 0 },
            phase: getAlliancePhase(previousValue),
            war_started_this_turn: false,
            mobilizing: false,
            locked: true
        };
    }

    // Retrieve HRHB patron_commitment (default 0 if absent)
    const hrhbFaction = (state.factions ?? []).find((f) => f.id === 'HRHB');
    const patronCommitment = hrhbFaction?.patron_state?.patron_commitment ?? 0;

    // One-turn-delayed feedback: bilateral_flips_this_turn is from the PREVIOUS turn's control flip step.
    const bilateralFlipsLastTurn = rhs.bilateral_flips_this_turn;
    const territorialIncidentsLastTurn = rhs.territorial_incidents_this_turn ?? 0;
    const noIncidents = bilateralFlipsLastTurn === 0;

    // Compute drivers
    const appeasement = APPEASEMENT_BASE_RATE * (noIncidents ? 1.0 : 0.3);
    const patronDrag = PATRON_PRESSURE_COEFF * patronCommitment;
    const incidentPenalty = INCIDENT_PENALTY_PER_FLIP * bilateralFlipsLastTurn;
    const territorialPenalty = TERRITORIAL_INCIDENT_PENALTY * territorialIncidentsLastTurn;
    const ceasefireBoost = rhs.ceasefire_active ? CEASEFIRE_RECOVERY_RATE : 0;

    // Phase B1: Refugee pressure — displaced arrivals in mixed municipalities strain alliance
    const refugeePressure = computeRefugeePressure(state);

    const delta = appeasement - patronDrag - incidentPenalty - territorialPenalty + ceasefireBoost - refugeePressure;

    // Apply delta, clamp to [-1, 1]
    let newValue = Math.max(-1, Math.min(1, previousValue + delta));
    // Peace-phase §4.8 (historical fidelity): no open war before rbih_hrhb_war_earliest_turn (e.g. Oct 1992 for Apr 1992 start).
    const earliestTurn = state.meta.rbih_hrhb_war_earliest_turn ?? 40;
    if (state.meta.turn < earliestTurn) {
        newValue = Math.max(newValue, ALLIANCE_FLOOR_BEFORE_WAR);
    }
    state.political.war_alliance_rbih_hrhb = newValue;

    // Track mobilization start: first time alliance drops to ≤ ALLIED_THRESHOLD after earliest turn
    if (
        state.meta.turn >= earliestTurn &&
        rhs.mobilization_started_turn === null &&
        newValue <= ALLIED_THRESHOLD
    ) {
        rhs.mobilization_started_turn = state.meta.turn;
    }

    // Track war start (only after earliest turn)
    let warStartedThisTurn = false;
    if (
        state.meta.turn >= earliestTurn &&
        rhs.war_started_turn === null &&
        newValue <= HOSTILE_THRESHOLD
    ) {
        rhs.war_started_turn = state.meta.turn;
        warStartedThisTurn = true;
    }

    // Reset bilateral flips for this turn (will be populated by control flip step)
    rhs.bilateral_flips_this_turn = 0;
    rhs.territorial_incidents_this_turn = 0;

    return {
        previous_value: previousValue,
        new_value: newValue,
        delta,
        drivers: {
            appeasement,
            patron_drag: patronDrag,
            incident_penalty: incidentPenalty,
            territorial_penalty: territorialPenalty,
            ceasefire_boost: ceasefireBoost,
            refugee_pressure: refugeePressure
        },
        phase: getAlliancePhase(newValue),
        war_started_this_turn: warStartedThisTurn,
        mobilizing: isRbihHrhbMobilizing(state),
        locked: false
    };
}

/**
 * Phase B1: Compute refugee pressure on alliance from displaced populations
 * arriving in mixed municipalities. Each municipality with displaced_in/original_pop > 5%
 * adds REFUGEE_PRESSURE_RATE * min(1.0, ratio / REFUGEE_PRESSURE_RATIO_CAP) to degradation.
 * Deterministic: sorted iteration over REFUGEE_PRESSURE_MUNICIPALITIES.
 */
export function computeRefugeePressure(state: GameState): number {
    const displacementState = state.displacement?.displacement_state;
    if (!displacementState) return 0;

    let totalPressure = 0;

    // Sorted iteration (REFUGEE_PRESSURE_MUNICIPALITIES is already sorted at definition)
    for (const munId of REFUGEE_PRESSURE_MUNICIPALITIES) {
        const ds = displacementState[munId];
        if (!ds) continue;
        if (ds.original_population <= 0) continue;

        const ratio = ds.displaced_in / ds.original_population;
        if (ratio <= REFUGEE_PRESSURE_MIN_RATIO) continue;

        // Scale linearly up to cap, then saturate at 1.0
        const scaledRatio = Math.min(1.0, ratio / REFUGEE_PRESSURE_RATIO_CAP);
        totalPressure += REFUGEE_PRESSURE_RATE * scaledRatio;
    }

    return totalPressure;
}

/**
 * Count bilateral RBiH–HRHB flips from a control flip report.
 * Called AFTER control flip step to populate rhs.bilateral_flips_this_turn.
 */
export function countBilateralFlips(
    state: GameState,
    flips: Array<{ mun_id: string; from_faction: FactionId | null; to_faction: FactionId }>
): number {
    const rhs = state.political.rbih_hrhb_state;
    if (!rhs) return 0;

    let count = 0;
    for (const flip of flips) {
        const from = flip.from_faction;
        const to = flip.to_faction;
        if (
            (from === 'RBiH' && to === 'HRHB') ||
            (from === 'HRHB' && to === 'RBiH')
        ) {
            count++;
        }
    }

    rhs.bilateral_flips_this_turn = count;
    rhs.total_bilateral_flips += count;

    // Update stalemate counter
    if (count === 0) {
        rhs.stalemate_turns++;
    } else {
        rhs.stalemate_turns = 0;
    }

    return count;
}

export interface TerritorialIncidentReport {
    bilateral_incidents: number;
    mixed_mun_rs_recapture_incidents: number;
}

export function countTerritorialIncidents(
    state: GameState,
    flips: Array<{ mun_id: string; from_faction: FactionId | null; to_faction: FactionId | null }>
): TerritorialIncidentReport {
    const rhs = state.political.rbih_hrhb_state;
    if (!rhs) return { bilateral_incidents: 0, mixed_mun_rs_recapture_incidents: 0 };

    const mixedMunicipalities = new Set([
        ...REFUGEE_PRESSURE_MUNICIPALITIES,
        ...(rhs.allied_mixed_municipalities ?? [])
    ].map(normalizeMunicipalityId));

    let bilateralIncidents = 0;
    let mixedMunRsRecaptureIncidents = 0;
    const orderedFlips = [...flips].sort((a, b) => {
        const mun = strictCompare(normalizeMunicipalityId(a.mun_id), normalizeMunicipalityId(b.mun_id));
        if (mun !== 0) return mun;
        const from = strictCompare(a.from_faction ?? '', b.from_faction ?? '');
        if (from !== 0) return from;
        return strictCompare(a.to_faction ?? '', b.to_faction ?? '');
    });

    for (const flip of orderedFlips) {
        const from = flip.from_faction;
        const to = flip.to_faction;
        if (
            (from === 'RBiH' && to === 'HRHB') ||
            (from === 'HRHB' && to === 'RBiH')
        ) {
            bilateralIncidents++;
            continue;
        }
        if (
            from === 'RS' &&
            (to === 'RBiH' || to === 'HRHB') &&
            mixedMunicipalities.has(normalizeMunicipalityId(flip.mun_id))
        ) {
            mixedMunRsRecaptureIncidents++;
        }
    }

    rhs.territorial_incidents_this_turn =
        bilateralIncidents + MIXED_MUN_RS_RECAPTURE_PARTIAL * mixedMunRsRecaptureIncidents;

    return {
        bilateral_incidents: bilateralIncidents,
        mixed_mun_rs_recapture_incidents: mixedMunRsRecaptureIncidents
    };
}

function normalizeMunicipalityId(munId: string): string {
    return munId.trim().toLowerCase();
}
