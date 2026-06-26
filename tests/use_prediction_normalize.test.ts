import { describe, it, expect } from 'vitest';
import { normalizeOperationPredictionResponse } from '../src/ui/map/components/ops_modal/usePrediction';

describe('normalizeOperationPredictionResponse', () => {
    it('maps OperationPredictionResponse to PredictionResult', () => {
        const raw = {
            overall: {
                forceRatio: 1.5,
                intelConfidence: 0.7,
                supplyReadiness: 0.8,
                totalEstimatedCasualties: 420,
                preparationWeeks: 4,
            },
            axes: [
                {
                    axisId: 'axis-1',
                    predictedOutcome: 'victory',
                    forceRatio: 1.6,
                    estimatedCasualties: 200,
                    defenderPower: 333,
                    terrain: 'open',
                    entrenchment: 'light',
                    intelConfidence: 0.5,
                    supplyReadiness: 0.6,
                },
            ],
            commanderAssessment: {
                recommendation: 'delay' as const,
                sections: {
                    enemy: 'Enemy text',
                    ownForces: 'Own text',
                    assessment: 'Go slow',
                },
                preparationWeeks: 4,
                requiredForceRatio: 1.2,
                requiredIntelConfidence: 0.5,
            },
        };

        const out = normalizeOperationPredictionResponse(raw);
        expect(out).not.toBeNull();
        expect(out!.overall.estimatedCasualties).toBe(420);
        expect(out!.overall.predictedOutcome).toBe('victory');
        expect(out!.overall.recommendedAction).toBe('postpone');
        expect(out!.perAxis).toHaveLength(1);
        expect(out!.perAxis[0].defenseStrength).toBe(333);
        expect(out!.commanderAssessment?.sections).toHaveLength(3);
        expect(out!.commanderAssessment?.sections[0].content).toBe('Enemy text');
    });

    it('returns null for invalid payload', () => {
        expect(normalizeOperationPredictionResponse(null)).toBeNull();
        expect(normalizeOperationPredictionResponse({})).toBeNull();
    });

    it('preserves sparse and non-finite prediction fields as unreported', () => {
        const out = normalizeOperationPredictionResponse({
            overall: {
                forceRatio: Number.NaN,
                intelConfidence: undefined,
                totalEstimatedCasualties: Number.POSITIVE_INFINITY,
            },
            axes: [
                { axisId: 'axis-sparse', forceRatio: Number.NaN, defenderPower: undefined },
            ],
        });

        expect(out).not.toBeNull();
        expect(out!.overall.forceRatio).toBeNull();
        expect(out!.overall.intelConfidence).toBeNull();
        expect(out!.overall.estimatedCasualties).toBeNull();
        expect(out!.overall.predictedOutcome).toBeNull();
        expect(out!.perAxis[0].forceRatio).toBeNull();
        expect(out!.perAxis[0].defenseStrength).toBeNull();
        expect(out!.perAxis[0].predictedOutcome).toBeNull();
    });

    it('preserves explicit zero prediction values', () => {
        const out = normalizeOperationPredictionResponse({
            overall: { forceRatio: 0, intelConfidence: 0, totalEstimatedCasualties: 0 },
            axes: [{ axisId: 'axis-zero', forceRatio: 0, defenderPower: 0, predictedOutcome: 'stalemate' }],
        });

        expect(out?.overall.forceRatio).toBe(0);
        expect(out?.overall.intelConfidence).toBe(0);
        expect(out?.overall.estimatedCasualties).toBe(0);
        expect(out?.perAxis[0].forceRatio).toBe(0);
        expect(out?.perAxis[0].defenseStrength).toBe(0);
    });
});
