/**
 * Debounced hook for fetching G2 operation predictions via IPC.
 * The queryOperationPrediction channel exists end-to-end but was never
 * called from the UI until now.
 */
import { useEffect, useRef, useState } from 'react';
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

/** Serialize plan fields that affect predictions into a stable key. */
function planKey(plan: OpsPlanState | null): string {
    if (!plan) return '';
    const axes = plan.axes.map((a) => `${a.id}:${a.brigadeIds.join(',')}:${a.objectives.join(',')}`).join('|');
    return `${axes}::${plan.tempo}::${plan.artilleryPreparation}`;
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

    // Use refs for data accessed inside the fetch to avoid unstable callback deps
    const planRef = useRef(plan);
    planRef.current = plan;
    const corpsIdRef = useRef(corpsId);
    corpsIdRef.current = corpsId;
    const officerIdRef = useRef(commanderOfficerId);
    officerIdRef.current = commanderOfficerId;

    // Stable key that changes only when prediction-relevant plan fields change
    const key = planKey(plan);

    // Debounced fetch — 500ms after last meaningful plan change
    useEffect(() => {
        if (!enabled || !corpsIdRef.current || !planRef.current || !ipc.isAvailable) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            const currentPlan = planRef.current;
            const currentCorpsId = corpsIdRef.current;
            if (!currentPlan || !currentCorpsId) return;

            const validAxes = currentPlan.axes.filter(
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
                    corpsId: currentCorpsId,
                    axes: validAxes.map((a) => ({
                        axisId: a.id,
                        brigadeIds: a.brigadeIds,
                        objectiveOsids: a.objectives,
                        stagingOsid: a.stagingOsid ?? currentPlan.defaultStagingOsid,
                    })),
                    tempo: currentPlan.tempo,
                    artilleryPreparation: currentPlan.artilleryPreparation,
                    commanderOfficerId: officerIdRef.current ?? undefined,
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
        }, 500);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [key, enabled, ipc]); // key changes only when prediction-relevant fields change

    return { prediction, loading, error };
}
