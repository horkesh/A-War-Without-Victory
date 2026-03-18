/**
 * Debounced hook for fetching G2 operation predictions via IPC.
 * The queryOperationPrediction channel exists end-to-end but was never
 * called from the UI until now.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIPC } from '../../desktop/useIPC';
import type { OpsPlanState } from './types';

export interface PredictionResult {
    overall: {
        intelConfidence: number;
        forceRatio: number;
        estimatedCasualties: number;
        predictedOutcome: string;
        recommendedAction: string;
    };
    perAxis: Array<{
        axisId: string;
        forceRatio: number;
        predictedOutcome: string;
        defenseStrength: number;
    }>;
    commanderAssessment?: {
        sections: Array<{
            title: string;
            content: string;
        }>;
    };
}

export function usePrediction(
    corpsId: string | null,
    plan: OpsPlanState | null,
    commanderOfficerId: string | null,
    enabled: boolean,
) {
    const ipc = useIPC();
    const [prediction, setPrediction] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchPrediction = useCallback(async () => {
        if (!corpsId || !plan || !ipc.isAvailable) return;

        // Need at least one axis with brigades and objectives
        const validAxes = plan.axes.filter(
            (a) => a.brigadeIds.length > 0 && a.objectives.length > 0
        );
        if (validAxes.length === 0) {
            setPrediction(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await ipc.queryOperationPrediction({
                corpsId,
                axes: validAxes.map((a) => ({
                    axisId: a.id,
                    brigadeIds: a.brigadeIds,
                    objectiveOsids: a.objectives,
                    stagingOsid: a.stagingOsid ?? plan.defaultStagingOsid,
                })),
                tempo: plan.tempo,
                artilleryPreparation: plan.artilleryPreparation,
                commanderOfficerId: commanderOfficerId ?? undefined,
            });

            if (result.ok && result.data) {
                setPrediction(result.data as unknown as PredictionResult);
            } else {
                setError(result.error ?? 'Prediction failed');
            }
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }, [corpsId, plan, commanderOfficerId, ipc]);

    // Debounced fetch — 500ms after last plan change
    useEffect(() => {
        if (!enabled) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            void fetchPrediction();
        }, 500);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [fetchPrediction, enabled]);

    return { prediction, loading, error, refetch: fetchPrediction };
}
