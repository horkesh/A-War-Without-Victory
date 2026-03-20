/**
 * Debounced hook for fetching G2 operation predictions via IPC.
 * The queryOperationPrediction channel exists end-to-end but was never
 * called from the UI until now.
 *
 * Normalizes `OperationPredictionResponse` from the sim/IPC into the
 * `PredictionResult` shape expected by G-2 tabs (field names and section layout).
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

/** Map IPC/sim payload → UI model. */
export function normalizeOperationPredictionResponse(raw: unknown): PredictionResult | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const overallIn = r.overall;
    if (!overallIn || typeof overallIn !== 'object') return null;
    const o = overallIn as Record<string, unknown>;

    const totalCas = Number(o.totalEstimatedCasualties ?? o.estimatedCasualties ?? 0) || 0;
    const forceRatio = Number(o.forceRatio ?? 0) || 0;
    const intelConfidence = Number(o.intelConfidence ?? 0) || 0;

    const axesIn = Array.isArray(r.axes) ? r.axes : [];
    const primary = axesIn[0];
    let predictedOutcome = 'stalemate';
    if (primary && typeof primary === 'object') {
        const p = primary as Record<string, unknown>;
        if (typeof p.predictedOutcome === 'string') predictedOutcome = p.predictedOutcome;
    }

    const cmd = r.commanderAssessment;
    let recommendedAction = 'launch';
    let commanderAssessment: PredictionResult['commanderAssessment'] | undefined;
    if (cmd && typeof cmd === 'object') {
        const c = cmd as Record<string, unknown>;
        const rec = c.recommendation;
        if (rec === 'abort') recommendedAction = 'abort';
        else if (rec === 'delay') recommendedAction = 'postpone';
        else recommendedAction = 'launch';

        const sec = c.sections;
        if (sec && typeof sec === 'object' && !Array.isArray(sec)) {
            const s = sec as Record<string, unknown>;
            const enemy = typeof s.enemy === 'string' ? s.enemy : '';
            const ownForces = typeof s.ownForces === 'string' ? s.ownForces : '';
            const assessment = typeof s.assessment === 'string' ? s.assessment : '';
            if (enemy || ownForces || assessment) {
                commanderAssessment = {
                    sections: [
                        { title: 'NEPRIJATELJ (Enemy)', content: enemy },
                        { title: 'VLASTITE SNAGE (Own Forces)', content: ownForces },
                        { title: 'PROCJENA (Assessment)', content: assessment },
                    ],
                };
            }
        }
    }

    const perAxis = axesIn.map((item) => {
        const ax = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        const axisId = typeof ax.axisId === 'string' ? ax.axisId : '';
        return {
            axisId,
            forceRatio: Number(ax.forceRatio ?? 0),
            predictedOutcome:
                typeof ax.predictedOutcome === 'string' ? ax.predictedOutcome : 'stalemate',
            defenseStrength: Number(ax.defenderPower ?? ax.defenseStrength ?? 0),
        };
    });

    return {
        overall: {
            intelConfidence,
            forceRatio,
            estimatedCasualties: totalCas,
            predictedOutcome,
            recommendedAction,
        },
        perAxis,
        commanderAssessment,
    };
}

const IPC_UNAVAILABLE =
    'G-2 live prediction requires the AWWV desktop app (Electron). The browser map preview has no simulation IPC.';

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
        if (!enabled || !corpsIdRef.current || !planRef.current) return;

        const currentPlan = planRef.current;
        const currentCorpsId = corpsIdRef.current;
        const validAxes = currentPlan.axes.filter((a) => a.brigadeIds.length > 0 && a.objectives.length > 0);

        if (validAxes.length === 0) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            setPrediction(null);
            setError(null);
            setLoading(false);
            return;
        }

        if (!ipc.isAvailable) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            setPrediction(null);
            setLoading(false);
            setError(IPC_UNAVAILABLE);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            const p = planRef.current;
            const cid = corpsIdRef.current;
            if (!p || !cid) return;

            const axes = p.axes.filter((a) => a.brigadeIds.length > 0 && a.objectives.length > 0);
            if (axes.length === 0) return;

            setLoading(true);
            setError(null);

            try {
                const result = await ipc.queryOperationPrediction({
                    corpsId: cid,
                    axes: axes.map((a) => ({
                        axisId: a.id,
                        brigadeIds: a.brigadeIds,
                        objectiveOsids: a.objectives,
                        stagingOsid: a.stagingOsid ?? p.defaultStagingOsid,
                    })),
                    tempo: p.tempo,
                    artilleryPreparation: p.artilleryPreparation,
                    commanderOfficerId: officerIdRef.current ?? undefined,
                });

                if (result.ok && result.data) {
                    const normalized = normalizeOperationPredictionResponse(result.data);
                    if (normalized) {
                        setPrediction(normalized);
                    } else {
                        setError('Invalid prediction response from engine');
                    }
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
    }, [key, enabled, ipc]);

    return { prediction, loading, error };
}
