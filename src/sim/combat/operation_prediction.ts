/**
 * Operation Prediction Engine — G-2 live briefing support.
 *
 * Computes predicted outcomes for planned operations using the existing
 * combat predictor, enriched with commander personality assessments.
 * Read-only: does NOT mutate GameState.
 *
 * Used by the Ops Planning UI to display live force ratio, predicted
 * outcomes, and commander-voice briefing text before the player commits.
 *
 * Deterministic: no randomness, no timestamps.
 */

import type { GameState } from '../../state/game_state.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import type { OperationalToCanonicalReverseMap, OsidPopulationMap } from '../../data/operational_data.js';
import type { OsidEthnicComposition } from './ethnic_defense.js';
import type { Osid } from './osid_adjacency.js';
import { predictCombatOutcome, type CombatPrediction } from './combat_predictor.js';
import {
    getPreparationMaxTurns,
    getRequiredForceRatio,
    getRequiredConfidence,
} from './operation_preparation.js';
import { getCorpsCommander } from './officer_system.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface OperationPredictionRequest {
    corpsId: string;
    axes: Array<{
        axisId: string;
        brigadeIds: string[];
        objectiveOsids: string[];
        stagingOsid?: string;
    }>;
    tempo: 'methodical' | 'standard' | 'all_out';
    artilleryPreparation: boolean;
    commanderOfficerId?: string;
}

export type PredictedOutcome =
    | 'decisive_victory' | 'victory' | 'costly_victory'
    | 'stalemate' | 'repulsed' | 'catastrophic';

export type TerrainType = 'mountain' | 'urban' | 'open' | 'forest';
export type EntrenchmentLevel = 'light' | 'moderate' | 'heavy' | 'unknown';

export interface AxisPrediction {
    axisId: string;
    predictedOutcome: PredictedOutcome;
    forceRatio: number;
    estimatedCasualties: number;
    /** Defender combat power (rounded) for G-2 raw intel “defense strength” column. */
    defenderPower: number;
    terrain: TerrainType;
    entrenchment: EntrenchmentLevel;
    intelConfidence: number;
    supplyReadiness: number;
}

export interface CommanderAssessmentText {
    recommendation: 'launch' | 'delay' | 'abort';
    sections: {
        enemy: string;
        ownForces: string;
        assessment: string;
    };
    preparationWeeks: number;
    requiredForceRatio: number;
    requiredIntelConfidence: number;
}

export interface OperationPredictionResponse {
    overall: {
        forceRatio: number;
        intelConfidence: number;
        supplyReadiness: number;
        totalEstimatedCasualties: number;
        preparationWeeks: number;
    };
    axes: AxisPrediction[];
    commanderAssessment: CommanderAssessmentText;
}

// ═══════════════════════════════════════════════════════════════════════════
// Terrain & entrenchment classification
// ═══════════════════════════════════════════════════════════════════════════

function classifyTerrain(mult: number): TerrainType {
    if (mult >= 1.7) return 'mountain';
    if (mult >= 1.5) return 'urban';
    if (mult >= 1.2) return 'forest';
    return 'open';
}

function classifyEntrenchment(level: number): EntrenchmentLevel {
    if (level >= 0.15) return 'heavy';
    if (level >= 0.08) return 'moderate';
    if (level > 0) return 'light';
    return 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════
// Axis prediction
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Predict the combat outcome for a single axis of advance.
 *
 * Delegates to the existing `predictCombatOutcome` from combat_predictor.ts,
 * then maps the result into the AxisPrediction shape for the UI.
 *
 * Returns null if the axis has no brigades or no objectives.
 */
export function predictAxisOutcome(
    state: GameState,
    axis: { axisId: string; brigadeIds: string[]; objectiveOsids: string[]; stagingOsid?: string },
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    terrainCache: Record<string, number>,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    osidPopulationMap?: OsidPopulationMap | null,
    slopeByOsid?: Record<string, number> | null,
    ethnicComposition?: OsidEthnicComposition | null,
): AxisPrediction | null {
    if (axis.brigadeIds.length === 0 || axis.objectiveOsids.length === 0) return null;

    const targetOsid = axis.objectiveOsids[0]! as Osid;
    const primaryBrigade = axis.brigadeIds[0]!;
    const additionalAttackers = axis.brigadeIds.slice(1);

    const prediction = predictCombatOutcome(
        state,
        primaryBrigade,
        targetOsid,
        adjacency,
        reverseMap,
        terrainCache,
        'attack',
        additionalAttackers,
        supplyStateByOsid,
        osidPopulationMap,
        slopeByOsid,
        ethnicComposition,
    );

    if (!prediction) {
        return {
            axisId: axis.axisId,
            predictedOutcome: 'stalemate',
            forceRatio: 0,
            estimatedCasualties: 0,
            defenderPower: 0,
            terrain: classifyTerrain(terrainCache[targetOsid] ?? 1.0),
            entrenchment: 'unknown',
            intelConfidence: 0,
            supplyReadiness: 0,
        };
    }

    return {
        axisId: axis.axisId,
        predictedOutcome: prediction.predicted_outcome as PredictedOutcome,
        forceRatio: prediction.power_ratio,
        estimatedCasualties: prediction.expected_attacker_casualties,
        defenderPower: Math.round(prediction.defender_power),
        terrain: classifyTerrain(prediction.defender_terrain_mult),
        entrenchment: classifyEntrenchment(prediction.defender_entrenchment),
        intelConfidence: 0, // filled by caller from sector_intel
        supplyReadiness: 0, // filled by caller from supply state
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Commander assessment generation
// ═══════════════════════════════════════════════════════════════════════════

interface CommanderProfile {
    competence: number;
    aggressiveness: number;
}

interface OverallMetrics {
    forceRatio: number;
    intelConfidence: number;
    supplyReadiness: number;
    totalCasualties: number;
}

const INTEL_LABELS: Array<[number, string]> = [
    [0.8, 'CONFIRMED'], [0.6, 'RELIABLE'], [0.4, 'PARTIAL'],
    [0.2, 'FRAGMENTARY'], [0, 'BLIND'],
];

const SUPPLY_LABELS: Array<[number, string]> = [
    [0.9, 'FULL'], [0.7, 'STRONG'], [0.5, 'ADEQUATE'],
    [0.3, 'STRAINED'], [0, 'CRITICAL'],
];

function labelFromThresholds(value: number, thresholds: Array<[number, string]>): string {
    for (const [threshold, label] of thresholds) {
        if (value >= threshold) return label;
    }
    return thresholds[thresholds.length - 1]![1]!;
}

/**
 * Generate commander-voice assessment text based on personality and metrics.
 *
 * High-competence commanders produce detailed, structured briefings.
 * Mid-competence commanders give functional but less detailed assessments.
 * Low-competence commanders give vague, personality-driven impressions.
 *
 * The recommendation (launch/delay/abort) is derived from whether force ratio,
 * intel confidence, and supply readiness meet the commander's thresholds.
 */
export function generateCommanderAssessment(
    commander: CommanderProfile,
    overall: OverallMetrics,
    axes: AxisPrediction[],
): CommanderAssessmentText {
    const { competence, aggressiveness } = commander;
    const prepWeeks = getPreparationMaxTurns(aggressiveness);
    const reqForceRatio = getRequiredForceRatio(competence, aggressiveness);
    const reqIntelConf = getRequiredConfidence(competence, aggressiveness);

    const forceOk = overall.forceRatio >= reqForceRatio;
    const intelOk = overall.intelConfidence >= reqIntelConf;
    const supplyOk = overall.supplyReadiness >= 0.5;
    const passCount = [forceOk, intelOk, supplyOk].filter(Boolean).length;

    let recommendation: 'launch' | 'delay' | 'abort';
    if (passCount >= 2 && (forceOk || aggressiveness >= 4)) {
        recommendation = 'launch';
    } else if (passCount >= 1 || aggressiveness >= 3) {
        recommendation = 'delay';
    } else {
        recommendation = 'abort';
    }

    const intelLabel = labelFromThresholds(overall.intelConfidence, INTEL_LABELS);
    const supplyLabel = labelFromThresholds(overall.supplyReadiness, SUPPLY_LABELS);
    const primaryAxis = axes[0];
    const terrainStr = primaryAxis?.terrain?.toUpperCase() ?? 'UNKNOWN';
    const entrenchStr = primaryAxis?.entrenchment?.toUpperCase() ?? 'UNKNOWN';

    let enemy: string;
    let ownForces: string;
    let assessment: string;

    if (competence >= 4) {
        // High competence: detailed, structured briefing
        enemy = `Enemy strength estimated at ${overall.forceRatio < 1 ? 'SUPERIOR' : 'INFERIOR'} force levels `
            + `(${intelLabel} confidence). ${terrainStr} terrain. Entrenchment ${entrenchStr}.`;

        const fatigueNote = axes.some(a => a.supplyReadiness < 0.5)
            ? ' Supply concerns on one or more axes.' : '';
        ownForces = `${axes.reduce((s, a) => s + (a.forceRatio > 0 ? 1 : 0), 0)} axes assigned, `
            + `aggregate ratio ${overall.forceRatio.toFixed(1)}:1. Supply ${supplyLabel}.${fatigueNote}`;

        const outcomeStr = primaryAxis?.predictedOutcome?.replace(/_/g, ' ').toUpperCase() ?? 'UNCERTAIN';
        if (recommendation === 'launch') {
            assessment = `Conditions ${overall.forceRatio >= 1.5 ? 'DECISIVE' : 'FAVORABLE'}. `
                + `Expect ${outcomeStr} on primary axis. `
                + (aggressiveness >= 4 ? 'Recommend ALL-OUT tempo. LAUNCH IMMEDIATELY.' : 'Recommend STANDARD tempo. Clear to LAUNCH.');
        } else if (recommendation === 'delay') {
            assessment = `Operation carries ${overall.forceRatio < 1 ? 'SIGNIFICANT' : 'MODERATE'} risk. `
                + `Expect ${outcomeStr}. `
                + `Recommend extending preparation ${Math.max(1, prepWeeks - 2)} weeks. `
                + `REQUEST reconnaissance-in-force before commitment.`;
        } else {
            assessment = `Force ratio INSUFFICIENT for ${terrainStr.toLowerCase()} assault. `
                + `Expect ${outcomeStr}. RECOMMEND ABORT.`;
        }
    } else if (competence >= 2) {
        // Mid competence: functional but less detailed
        enemy = `Enemy positions ${entrenchStr !== 'UNKNOWN' ? entrenchStr.toLowerCase() : 'of unknown strength'}. `
            + `Intel ${intelLabel.toLowerCase()}.`;
        ownForces = `Forces assigned. Ratio ${overall.forceRatio.toFixed(1)}:1. Supply ${supplyLabel.toLowerCase()}.`;

        if (recommendation === 'launch') {
            assessment = 'Situation favorable. Recommend attack.';
        } else if (recommendation === 'delay') {
            assessment = 'Mixed conditions. More preparation advised.';
        } else {
            assessment = 'Conditions unfavorable. Advise reconsideration.';
        }
    } else {
        // Low competence: vague, personality-driven
        enemy = aggressiveness >= 3 ? 'Enemy weak. Morale suspected low.' : 'Strength unclear. Reports conflicting.';
        ownForces = aggressiveness >= 3 ? 'Ready. Men eager to fight.' : 'Situation uncertain.';

        if (recommendation === 'launch') {
            assessment = 'Attack. No reason to delay.';
        } else if (recommendation === 'delay') {
            assessment = aggressiveness >= 3 ? 'Should attack soon.' : 'Perhaps more time needed.';
        } else {
            assessment = 'Concerns remain. Perhaps reconsider the operation scope.';
        }
    }

    return {
        recommendation,
        sections: { enemy, ownForces, assessment },
        preparationWeeks: prepWeeks,
        requiredForceRatio: reqForceRatio,
        requiredIntelConfidence: reqIntelConf,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Top-level prediction
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute a full operation prediction for the Ops Planning UI.
 *
 * Evaluates each axis via the combat predictor, enriches with supply readiness,
 * resolves the commander profile, and generates the assessment briefing.
 *
 * All inputs are read-only — no mutation of GameState.
 */
export function computeOperationPrediction(
    state: GameState,
    request: OperationPredictionRequest,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    terrainCache: Record<string, number>,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    osidPopulationMap?: OsidPopulationMap | null,
    slopeByOsid?: Record<string, number> | null,
    ethnicComposition?: OsidEthnicComposition | null,
): OperationPredictionResponse {
    const axisPredictions: AxisPrediction[] = [];
    for (const axis of request.axes) {
        const pred = predictAxisOutcome(
            state, axis, adjacency, reverseMap, terrainCache,
            supplyStateByOsid, osidPopulationMap, slopeByOsid, ethnicComposition,
        );
        if (pred) {
            // Estimate supply readiness from faction general reserve level
            const reserve = state.military?.general_supply_reserve;
            if (reserve) {
                const formations = state.military?.formations ?? {};
                const firstBrigade = formations[axis.brigadeIds[0]!];
                const faction = firstBrigade?.faction;
                if (faction && reserve[faction] !== undefined) {
                    // Normalize: 100+ = full, 0 = critical
                    pred.supplyReadiness = Math.min(1, Math.max(0, reserve[faction]! / 100));
                }
            }
            axisPredictions.push(pred);
        }
    }

    const totalCasualties = axisPredictions.reduce((s, a) => s + a.estimatedCasualties, 0);
    const avgForceRatio = axisPredictions.length > 0
        ? axisPredictions.reduce((s, a) => s + a.forceRatio, 0) / axisPredictions.length : 0;
    const avgIntel = axisPredictions.length > 0
        ? axisPredictions.reduce((s, a) => s + a.intelConfidence, 0) / axisPredictions.length : 0;
    const avgSupply = axisPredictions.length > 0
        ? axisPredictions.reduce((s, a) => s + a.supplyReadiness, 0) / axisPredictions.length : 0;

    // Resolve commander profile: explicit officer > corps commander > default
    let commanderProfile: CommanderProfile = { competence: 3, aggressiveness: 3 };
    if (request.commanderOfficerId && state.military?.named_officer_data) {
        const officer = state.military.named_officer_data.find(
            (o) => o.id === request.commanderOfficerId,
        );
        if (officer) {
            commanderProfile = {
                competence: officer.competence ?? 3,
                aggressiveness: officer.aggressiveness ?? 3,
            };
        }
    } else {
        const corpsCdr = getCorpsCommander(request.corpsId, state);
        if (corpsCdr) {
            commanderProfile = {
                competence: corpsCdr.data.competence,
                aggressiveness: corpsCdr.data.aggressiveness,
            };
        }
    }

    const cmdAssessment = generateCommanderAssessment(
        commanderProfile,
        { forceRatio: avgForceRatio, intelConfidence: avgIntel, supplyReadiness: avgSupply, totalCasualties },
        axisPredictions,
    );

    return {
        overall: {
            forceRatio: avgForceRatio,
            intelConfidence: avgIntel,
            supplyReadiness: avgSupply,
            totalEstimatedCasualties: totalCasualties,
            preparationWeeks: cmdAssessment.preparationWeeks,
        },
        axes: axisPredictions,
        commanderAssessment: cmdAssessment,
    };
}
