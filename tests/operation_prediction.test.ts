import { describe, it, expect } from 'vitest';
import {
    predictAxisOutcome,
    generateCommanderAssessment,
    computeOperationPrediction,
} from '../src/sim/combat/operation_prediction';

describe('predictAxisOutcome', () => {
    it('returns null when no brigades assigned', () => {
        const result = predictAxisOutcome(
            {} as any,
            { axisId: 'a1', brigadeIds: [], objectiveOsids: ['op:foo:bar'], stagingOsid: undefined },
            new Map(), new Map(), {},
        );
        expect(result).toBeNull();
    });

    it('returns null when no objectives', () => {
        const result = predictAxisOutcome(
            {} as any,
            { axisId: 'a1', brigadeIds: ['b1'], objectiveOsids: [], stagingOsid: undefined },
            new Map(), new Map(), {},
        );
        expect(result).toBeNull();
    });
});

describe('generateCommanderAssessment', () => {
    it('aggressive competent commander recommends launch with good data', () => {
        const result = generateCommanderAssessment(
            { competence: 4, aggressiveness: 5 },
            { forceRatio: 2.0, intelConfidence: 0.8, supplyReadiness: 0.9, totalCasualties: 300 },
            [{
                axisId: 'a1', predictedOutcome: 'victory', terrain: 'open', entrenchment: 'light',
                forceRatio: 2.0, estimatedCasualties: 300, intelConfidence: 0.8, supplyReadiness: 0.9,
            }],
        );
        expect(result.recommendation).toBe('launch');
        expect(result.sections.enemy).toContain('CONFIRMED');
        expect(result.preparationWeeks).toBe(3);
    });

    it('cautious incompetent commander recommends abort with weak data', () => {
        const result = generateCommanderAssessment(
            { competence: 1, aggressiveness: 1 },
            { forceRatio: 0.8, intelConfidence: 0.2, supplyReadiness: 0.3, totalCasualties: 800 },
            [{
                axisId: 'a1', predictedOutcome: 'repulsed', terrain: 'mountain', entrenchment: 'heavy',
                forceRatio: 0.8, estimatedCasualties: 800, intelConfidence: 0.2, supplyReadiness: 0.3,
            }],
        );
        expect(result.recommendation).toBe('abort');
    });

    it('moderate commander recommends delay with mixed data', () => {
        const result = generateCommanderAssessment(
            { competence: 3, aggressiveness: 3 },
            { forceRatio: 1.1, intelConfidence: 0.4, supplyReadiness: 0.6, totalCasualties: 500 },
            [{
                axisId: 'a1', predictedOutcome: 'stalemate', terrain: 'forest', entrenchment: 'moderate',
                forceRatio: 1.1, estimatedCasualties: 500, intelConfidence: 0.4, supplyReadiness: 0.6,
            }],
        );
        expect(result.recommendation).toBe('delay');
    });

    it('low competence aggressive commander gives vague bullish assessment', () => {
        const result = generateCommanderAssessment(
            { competence: 1, aggressiveness: 4 },
            { forceRatio: 1.5, intelConfidence: 0.3, supplyReadiness: 0.6, totalCasualties: 400 },
            [{
                axisId: 'a1', predictedOutcome: 'costly_victory', terrain: 'open', entrenchment: 'light',
                forceRatio: 1.5, estimatedCasualties: 400, intelConfidence: 0.3, supplyReadiness: 0.6,
            }],
        );
        expect(result.sections.enemy).toContain('weak');
        expect(result.sections.ownForces).toContain('eager');
    });

    it('returns correct preparation weeks for different aggressiveness levels', () => {
        // aggressiveness 1 => 8-1 = 7
        const cautious = generateCommanderAssessment(
            { competence: 3, aggressiveness: 1 },
            { forceRatio: 2.0, intelConfidence: 0.9, supplyReadiness: 0.9, totalCasualties: 100 },
            [{ axisId: 'a1', predictedOutcome: 'victory', terrain: 'open', entrenchment: 'light',
                forceRatio: 2.0, estimatedCasualties: 100, intelConfidence: 0.9, supplyReadiness: 0.9 }],
        );
        expect(cautious.preparationWeeks).toBe(7);

        // aggressiveness 5 => 8-5 = 3
        const aggressive = generateCommanderAssessment(
            { competence: 3, aggressiveness: 5 },
            { forceRatio: 2.0, intelConfidence: 0.9, supplyReadiness: 0.9, totalCasualties: 100 },
            [{ axisId: 'a1', predictedOutcome: 'victory', terrain: 'open', entrenchment: 'light',
                forceRatio: 2.0, estimatedCasualties: 100, intelConfidence: 0.9, supplyReadiness: 0.9 }],
        );
        expect(aggressive.preparationWeeks).toBe(3);
    });

    it('high competence commander with empty axes still produces valid assessment', () => {
        const result = generateCommanderAssessment(
            { competence: 5, aggressiveness: 3 },
            { forceRatio: 0, intelConfidence: 0, supplyReadiness: 0, totalCasualties: 0 },
            [],
        );
        // aggressiveness >= 3 means passCount>=1 || aggressiveness>=3 => 'delay'
        expect(result.recommendation).toBe('delay');
        expect(result.sections.enemy).toBeTruthy();
        expect(result.sections.ownForces).toBeTruthy();
        expect(result.sections.assessment).toBeTruthy();
    });
});

describe('computeOperationPrediction', () => {
    it('returns empty axes and fallback assessment for empty request', () => {
        const result = computeOperationPrediction(
            { military: { formations: {} } } as any,
            { corpsId: 'corps_1', axes: [], tempo: 'standard', artilleryPreparation: false },
            new Map(), new Map(), {},
        );
        expect(result.axes).toHaveLength(0);
        expect(result.overall.forceRatio).toBe(0);
        expect(result.overall.totalEstimatedCasualties).toBe(0);
        expect(result.commanderAssessment.recommendation).toBeDefined();
    });

    it('skips axes where all brigadeIds are empty', () => {
        const result = computeOperationPrediction(
            { military: { formations: {} } } as any,
            {
                corpsId: 'corps_1',
                axes: [
                    { axisId: 'a1', brigadeIds: [], objectiveOsids: ['op:foo:bar'] },
                    { axisId: 'a2', brigadeIds: ['b1'], objectiveOsids: [] },
                ],
                tempo: 'standard',
                artilleryPreparation: false,
            },
            new Map(), new Map(), {},
        );
        // Both axes should be filtered out (null returns from predictAxisOutcome)
        expect(result.axes).toHaveLength(0);
    });

    it('uses explicit commander officer when provided', () => {
        const state = {
            military: {
                formations: {},
                named_officer_data: [
                    { id: 'officer_1', competence: 5, aggressiveness: 5 },
                ],
                named_officers: {},
            },
        } as any;
        const result = computeOperationPrediction(
            state,
            {
                corpsId: 'corps_1',
                axes: [],
                tempo: 'standard',
                artilleryPreparation: false,
                commanderOfficerId: 'officer_1',
            },
            new Map(), new Map(), {},
        );
        // With competence=5, aggressiveness=5: prepWeeks = 8-5 = 3
        expect(result.overall.preparationWeeks).toBe(3);
    });

    it('falls back to default commander profile when no officers available', () => {
        const result = computeOperationPrediction(
            { military: { formations: {} } } as any,
            { corpsId: 'corps_1', axes: [], tempo: 'standard', artilleryPreparation: false },
            new Map(), new Map(), {},
        );
        // Default: competence=3, aggressiveness=3 => prepWeeks = 8-3 = 5
        expect(result.overall.preparationWeeks).toBe(5);
    });
});
