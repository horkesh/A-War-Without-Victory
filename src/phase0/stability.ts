/**
 * Phase B Step 4: Stability Score derivation (Phase_0_Specification_v0_4_0.md §4.6).
 *
 * Formula: Base(50) + Demographic + Organizational - Geographic_Vulnerabilities.
 * Domain: [0, 100]. Output carried to Phase I.
 */

import type { ControlStatus, FactionId, GameState, MunicipalityId, OrganizationalPenetration } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';

/** Base stability (Phase_0_Spec §4.6). */
export const STABILITY_BASE = 50;

/** Stability domain bounds. */
export const STABILITY_MIN = 0;
export const STABILITY_MAX = 100;

/** Control status thresholds (System 11). */
export const STABILITY_SECURE_MIN = 60;
export const STABILITY_CONTESTED_MIN = 40;

/** Threshold for "strong" organizational presence (SDS/PL) per spec. */
const STRONG_PRESENCE_THRESHOLD = 50;

/**
 * Demographic factor from controller's population share (Phase_0_Spec §4.6).
 * controllerShare in [0, 1]. No controller => treat as minority (-15).
 */
export function demographicFactor(controllerShare: number | undefined): number {
    if (controllerShare === undefined || controllerShare < 0) return -15;
    if (controllerShare > 0.6) return 25;
    if (controllerShare >= 0.5) return 15;
    if (controllerShare >= 0.4) return 5;
    return -15;
}

/**
 * Organizational factor from penetration and controller (Phase_0_Spec §4.6).
 * Police: loyal +15, mixed -10, hostile -15.
 * TO: controlled +15, contested -10, lost 0.
 * SDS (non-RS areas): strong presence -15.
 * Patriotska Liga (RBiH area): strong +10.
 * JNA: RS-aligned +10, non-RS -10.
 */
export function organizationalFactor(
    op: OrganizationalPenetration | undefined,
    controller: FactionId | null
): number {
    if (!op) return 0;
    let sum = 0;

    if (op.police_loyalty === 'loyal') sum += 15;
    else if (op.police_loyalty === 'mixed') sum -= 10;
    else if (op.police_loyalty === 'hostile') sum -= 15;

    if (op.to_control === 'controlled') sum += 15;
    else if (op.to_control === 'contested') sum -= 10;

    const strongSds = (op.sds_penetration ?? 0) >= STRONG_PRESENCE_THRESHOLD;
    if (strongSds && controller !== 'RS') sum -= 15;

    const strongPl = (op.patriotska_liga ?? 0) >= STRONG_PRESENCE_THRESHOLD;
    if (strongPl && controller === 'RBiH') sum += 10;

    if (op.jna_presence) {
        sum += controller === 'RS' ? 10 : -10;
    }

    return sum;
}

/** Geographic vulnerability inputs (stub when data missing). */
export interface GeographicInputs {
    adjacentHostile?: boolean;
    strategicRoute?: boolean;
    isolatedEnclave?: boolean;
    connectedFriendlyRear?: boolean;
}

/**
 * Geographic vulnerability contribution (Phase_0_Spec §4.6).
 * Returns the value to subtract from raw score (so vulnerabilities are positive numbers here).
 */
export function geographicVulnerabilityTotal(geo: GeographicInputs | undefined): number {
    if (!geo) return 0;
    let total = 0;
    if (geo.adjacentHostile) total += 20;
    if (geo.strategicRoute) total += 10;
    if (geo.isolatedEnclave) total += 10;
    if (geo.connectedFriendlyRear) total -= 10; // bonus reduces vulnerability
    return total;
}

/** Inputs for computing one municipality's stability score. */
export interface StabilityInputs {
    controller: FactionId | null;
    controllerShare?: number;
    organizational?: OrganizationalPenetration;
    geographic?: GeographicInputs;
}

/**
 * Compute stability score for one municipality (Phase_0_Spec §4.6).
 * Returns value in [STABILITY_MIN, STABILITY_MAX].
 */
export function computeStabilityScore(inputs: StabilityInputs): number {
    const demo = demographicFactor(inputs.controllerShare);
    const org = organizationalFactor(inputs.organizational, inputs.controller);
    const geo = geographicVulnerabilityTotal(inputs.geographic);
    const raw = STABILITY_BASE + demo + org - geo;
    return Math.max(STABILITY_MIN, Math.min(STABILITY_MAX, Math.round(raw)));
}

/** Derive control status from stability score (System 11). */
export function computeControlStatus(score: number): ControlStatus {
    if (score >= STABILITY_SECURE_MIN) return 'SECURE';
    if (score >= STABILITY_CONTESTED_MIN) return 'CONTESTED';
    return 'HIGHLY_CONTESTED';
}

/**
 * Update stability score for a municipality in state.
 * Ensures state.municipalities[munId] exists and sets stability_score.
 * Controller and inputs can be passed; if not, reads from state.municipalities[munId] and uses defaults.
 */
export function updateMunicipalityStabilityScore(
    state: GameState,
    munId: MunicipalityId,
    inputs: StabilityInputs
): number {
    if (!state.municipalities) state.municipalities = {};
    let mun = state.municipalities[munId];
    if (!mun) {
        mun = {};
        state.municipalities[munId] = mun;
    }
    const score = computeStabilityScore(inputs);
    mun.stability_score = score;
    mun.control_status = computeControlStatus(score);
    return score;
}

/**
 * Recompute and set stability scores for all municipalities in state.
 * Uses optional lookups for controller share and geographic inputs; stubs when missing.
 * Deterministic: iterates mun IDs in sorted order (Engine Invariants §11.3).
 */
export function updateAllStabilityScores(
    state: GameState,
    options?: {
        getController?: (munId: MunicipalityId) => FactionId | null;
        getControllerShare?: (munId: MunicipalityId) => number | undefined;
        getGeographic?: (munId: MunicipalityId) => GeographicInputs | undefined;
    }
): void {
    if (!state.municipalities) return;
    const munIds = Object.keys(state.municipalities).slice().sort(strictCompare);
    for (const munId of munIds) {
        const mun = state.municipalities[munId];
        const controller = options?.getController?.(munId) ?? null;
        const controllerShare = options?.getControllerShare?.(munId);
        const geographic = options?.getGeographic?.(munId);
        updateMunicipalityStabilityScore(state, munId, {
            controller,
            controllerShare,
            organizational: mun?.organizational_penetration,
            geographic
        });
    }
}
