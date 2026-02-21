/**
 * Phase 0 Options Builder: derives real DeclarationPressureOptions from GameState.
 *
 * Replaces the empty `{}` options passed to runPhase0Turn with real lookups
 * so declaration pressure actually accumulates when enabling conditions are met.
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import type { FactionId, GameState, MunicipalityId } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import type { DeclarationPressureOptions } from './declaration_pressure.js';
import type { Phase0TurnOptions } from './turn.js';

/**
 * Historical turn thresholds for time-based enabling conditions.
 * Turn 0 = Week 1 of September 1991.
 */
const JNA_COORDINATION_TURN = 13;   // ~December 1991: Germany recognizes Croatia
const FRY_RECOGNITION_TURN = 13;     // Same period: FRY recognition follows
const CROATIA_SUPPORT_TURN = 17;     // ~January 1992: Croatia-HRHB cooperation intensifies

/**
 * Historical pre-war calibration used when a scenario explicitly carries scheduled
 * referendum/war-start metadata (e.g. Sep 1991 -> Apr 1992 flow).
 *
 * Keeps declaration emergence threshold-based while allowing historical sequence:
 * HRHB (Nov 1991) -> RS (Jan 1992) -> referendum (Mar 1992) -> war (Apr 1992).
 */
const HIST_RS_JNA_COORDINATION_TURN = 12;
const HIST_RS_FRY_RECOGNITION_TURN = 12;
const HIST_HRHB_SUPPORT_TURN = 8;
const HIST_HRHB_WAR_CONTEXT_TURN = 8; // Represents "sustained violence begun" context.
const HIST_RS_RELATIONSHIP_THRESHOLD = -0.4;
const HIST_HRHB_RELATIONSHIP_THRESHOLD = 0.6;
const HIST_RS_PRESSURE_THRESHOLD = 70;
const HIST_HRHB_PRESSURE_THRESHOLD = 32;

/**
 * Default historical relationship schedule (if state.phase0_relationships is absent).
 * RBiH-RS degrades over time; always hostile.
 */
function defaultRbihRsRelationship(turn: number): number {
    if (turn <= 8) return -0.2;   // Tense
    if (turn <= 16) return -0.4;  // Deteriorating
    return -0.6;                   // Hostile
}

/**
 * Default historical relationship schedule for RBiH-HRHB (if state.phase0_relationships is absent).
 * Starts positive; slowly degrades.
 */
function defaultRbihHrhbRelationship(turn: number): number {
    if (turn <= 12) return 0.5;   // Cooperative
    if (turn <= 20) return 0.3;   // Strained
    return 0.1;                    // Fragile
}

/**
 * Compute RS organizational coverage in Serb-majority municipalities (0-100).
 * A municipality counts as "covered" if it has any RS organizational penetration
 * (sds_penetration > 0 OR paramilitary_rs > 0).
 */
function computeRsOrgCoverage(state: GameState): number {
    if (!state.municipalities) return 0;

    const munIds = Object.keys(state.municipalities).sort(strictCompare);
    let serbMajorityCount = 0;
    let coveredCount = 0;

    for (const munId of munIds) {
        const mun = state.municipalities[munId];
        if (!mun) continue;
        const op = mun.organizational_penetration;

        // Identify Serb-majority: has SDS penetration or is RS-controlled
        const isSerbMajority =
            (op?.sds_penetration !== undefined && op.sds_penetration > 0) ||
            (state.political_controllers?.[munId] === 'RS');

        if (!isSerbMajority) continue;
        serbMajorityCount++;

        // Check if RS has organizational coverage
        const hasCoverage =
            (op?.sds_penetration !== undefined && op.sds_penetration > 0) ||
            (op?.paramilitary_rs !== undefined && op.paramilitary_rs > 0) ||
            (op?.police_loyalty === 'loyal' && state.political_controllers?.[munId] === 'RS');

        if (hasCoverage) coveredCount++;
    }

    if (serbMajorityCount === 0) return 0;
    return Math.round((coveredCount / serbMajorityCount) * 100);
}

/**
 * Compute HRHB organizational coverage in Croat-majority municipalities (0-100).
 */
function computeHrhbOrgCoverage(state: GameState): number {
    if (!state.municipalities) return 0;

    const munIds = Object.keys(state.municipalities).sort(strictCompare);
    let croatMajorityCount = 0;
    let coveredCount = 0;

    for (const munId of munIds) {
        const mun = state.municipalities[munId];
        if (!mun) continue;
        const op = mun.organizational_penetration;

        // Identify Croat-majority: has HDZ penetration or is HRHB-controlled
        const isCroatMajority =
            (op?.hdz_penetration !== undefined && op.hdz_penetration > 0) ||
            (state.political_controllers?.[munId] === 'HRHB');

        if (!isCroatMajority) continue;
        croatMajorityCount++;

        // Check if HRHB has organizational coverage
        const hasCoverage =
            (op?.hdz_penetration !== undefined && op.hdz_penetration > 0) ||
            (op?.paramilitary_hrhb !== undefined && op.paramilitary_hrhb > 0);

        if (hasCoverage) coveredCount++;
    }

    if (croatMajorityCount === 0) return 0;
    return Math.round((coveredCount / croatMajorityCount) * 100);
}

function hasScheduledPhase0Timing(state: GameState): boolean {
    return Number.isInteger(state.meta.phase_0_scheduled_referendum_turn) &&
        Number.isInteger(state.meta.phase_0_scheduled_war_start_turn);
}

function isRsDeclared(state: GameState): boolean {
    return state.factions.some((f) => f.id === 'RS' && f.declared === true);
}

/**
 * Build Phase0TurnOptions from current GameState.
 * Provides real lookups for declaration pressure enabling conditions,
 * referendum options, and stability score computation.
 */
export function buildPhase0TurnOptions(state: GameState): Phase0TurnOptions {
    const turn = state.meta.turn;
    const relationships = state.phase0_relationships;
    const useHistoricalPhase0Calibration = hasScheduledPhase0Timing(state);

    const declarationPressure: DeclarationPressureOptions = {
        getRsOrgCoverageSerbMajority: (s: GameState) => computeRsOrgCoverage(s),

        getJnaCoordinationTriggered: (_s: GameState) =>
            turn >= (useHistoricalPhase0Calibration ? HIST_RS_JNA_COORDINATION_TURN : JNA_COORDINATION_TURN),

        getRbhRsRelationship: (_s: GameState) =>
            relationships?.rbih_rs ?? defaultRbihRsRelationship(turn),

        getFryRecognitionConfirmed: (_s: GameState) =>
            turn >= (useHistoricalPhase0Calibration ? HIST_RS_FRY_RECOGNITION_TURN : FRY_RECOGNITION_TURN),

        getHrhbOrgCoverageCroatMajority: (s: GameState) => computeHrhbOrgCoverage(s),

        getCroatiaSupportConfirmed: (_s: GameState) =>
            turn >= (useHistoricalPhase0Calibration ? HIST_HRHB_SUPPORT_TURN : CROATIA_SUPPORT_TURN),

        getRbhHrhbRelationship: (_s: GameState) =>
            relationships?.rbih_hrhb ?? defaultRbihHrhbRelationship(turn),

        ...(useHistoricalPhase0Calibration
            ? {
                rsOrgCoverageThreshold: 0,
                hrhbOrgCoverageThreshold: 0,
                rsRelationshipThreshold: HIST_RS_RELATIONSHIP_THRESHOLD,
                hrhbRelationshipThreshold: HIST_HRHB_RELATIONSHIP_THRESHOLD,
                rsPressureThreshold: HIST_RS_PRESSURE_THRESHOLD,
                hrhbPressureThreshold: HIST_HRHB_PRESSURE_THRESHOLD,
                isHrhbWarContextSatisfied: (s: GameState) =>
                    turn >= HIST_HRHB_WAR_CONTEXT_TURN || isRsDeclared(s)
            }
            : {})
    };

    // Deadline/schedule from scenario so Phase 0 does not hit non_war_terminal before scheduled referendum (Priority C).
    const refTurn = state.meta.phase_0_scheduled_referendum_turn ?? undefined;
    const warTurn = state.meta.phase_0_scheduled_war_start_turn ?? undefined;
    const referendum =
        refTurn != null || warTurn != null
            ? {
                ...(refTurn != null ? { deadlineTurns: refTurn + 1, scheduledReferendumTurn: refTurn } : {}),
                ...(warTurn != null ? { scheduledWarStartTurn: warTurn } : {}),
            }
            : undefined;

    return {
        declarationPressure,
        referendum,
        stability: {
            getController: (munId: MunicipalityId): FactionId | null =>
                state.political_controllers?.[munId] ?? null,
        },
    };
}
