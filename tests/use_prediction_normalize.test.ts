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
});
