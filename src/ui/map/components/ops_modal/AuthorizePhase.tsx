/**
 * Phase 4 — Authorize.
 * Shows OPORD document, stamp animation on authorize, then IPC submission.
 */
import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useIPC } from '../../desktop/useIPC';
import type { CorpsOperationOrderPayload } from '../../desktop/useIPC';
import type { OpsPlanState } from './types';
import type { PredictionResult } from './usePrediction';
import { OpordDocument } from './OpordDocument';
import { toTitleCase } from '../../utils/formatters';

interface AuthorizePhaseProps {
    plan: OpsPlanState;
    prediction: PredictionResult | null;
    corpsId: string;
    officerId: string | null;
    originSectorId: string | null;
}

export function AuthorizePhase({ plan, prediction, corpsId, officerId, originSectorId }: AuthorizePhaseProps) {
    const ipc = useIPC();
    const clearContext = useGameStore((s) => s.clearOpsPlanningContext);
    const setLoadError = useGameStore((s) => s.setLoadError);
    const setOperationTargetOsids = useGameStore((s) => s.setOperationTargetOsids);
    const loadedGameState = useGameStore((s) => s.loadedGameState);

    const [isStamped, setIsStamped] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transmitted, setTransmitted] = useState(false);

    const { corpsName, faction, commanderName, date } = useMemo(() => {
        if (!loadedGameState || !corpsId) return { corpsName: '', faction: '', commanderName: '', date: '' };
        const corpsFormation = loadedGameState.formations.find((f) => f.id === corpsId);
        const fac = corpsFormation?.faction ?? '';
        const name = corpsFormation
            ? (corpsFormation.name === corpsFormation.id
                ? toTitleCase(corpsFormation.name.replace(/^(RS|RBiH|HRHB)_/i, ''))
                : corpsFormation.name)
            : corpsId;

        // Find selected officer or corps commander
        const officer = officerId
            ? (loadedGameState.namedOfficerData ?? []).find((o) => o.id === officerId)
            : (loadedGameState.namedOfficerData ?? []).find(
                (o) => o.assigned_corps_id === corpsId && o.acting_commander
              );

        const turn = loadedGameState.turn ?? 0;
        const d = new Date(1992, 3, 1);
        d.setDate(d.getDate() + turn * 7);
        const dateStr = d.toISOString().split('T')[0];
        return { corpsName: name, faction: fac, commanderName: officer?.name ?? 'N/A', date: dateStr };
    }, [loadedGameState, corpsId, officerId]);

    const isLowIntel = prediction && prediction.overall.intelConfidence < 0.4;

    const handleAuthorize = async () => {
        setIsStamped(true);
        // Wait for stamp animation
        await new Promise((r) => setTimeout(r, 1500));
        setTransmitted(true);

        if (!ipc.isAvailable) {
            setLoadError('Operation submission requires desktop mode.');
            return;
        }

        setIsSubmitting(true);

        const allObjs = plan.axes.flatMap((a) => a.objectives);
        const allBrigades = plan.axes.flatMap((a) => a.brigadeIds);

        const payload: CorpsOperationOrderPayload = {
            corpsId,
            name: plan.opName,
            type: plan.opType,
            targetSettlements: allObjs,
            participatingBrigades: allBrigades,
            sectorId: originSectorId ?? undefined,
            objectives: allObjs,
            stagingOsid: plan.axes[0]?.stagingOsid ?? plan.defaultStagingOsid,
            minAttackOutcome: plan.tolerance,
            tempo: plan.tempo,
            schwerpunktOsid: plan.schwerpunktOsid || undefined,
            artilleryPreparation: plan.artilleryPreparation,
            axes: plan.axes.map((a) => ({
                axis_id: a.id,
                name: a.name,
                assigned_brigades: a.brigadeIds,
                objectives: a.objectives,
                current_objective_index: 0,
                status: 'executing' as const,
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
                staging_osid: a.stagingOsid ?? plan.defaultStagingOsid,
            })),
        };

        const result = await ipc.stageCorpsOperationOrder(payload);

        if (!result.ok) {
            setLoadError(result.error ?? 'Failed to stage operation order.');
            setIsSubmitting(false);
            return;
        }

        // Assign commander
        if (officerId) {
            await ipc.stageAssignOperationCommander({
                corpsId,
                operationName: plan.opName,
                officerId,
            });
        }

        setOperationTargetOsids(allObjs);
        setIsSubmitting(false);

        // Close after brief delay
        setTimeout(() => clearContext(), 1000);
    };

    const handleProbe = async () => {
        // Submit as probe type
        const probePlan = { ...plan, opType: 'probe' as const };
        setIsStamped(true);
        await new Promise((r) => setTimeout(r, 1500));
        setTransmitted(true);

        if (!ipc.isAvailable) {
            setLoadError('Operation submission requires desktop mode.');
            return;
        }

        setIsSubmitting(true);

        const allObjs = probePlan.axes.flatMap((a) => a.objectives);
        const allBrigades = probePlan.axes.flatMap((a) => a.brigadeIds);

        const payload: CorpsOperationOrderPayload = {
            corpsId,
            name: probePlan.opName + ' (Probe)',
            type: 'probe',
            targetSettlements: allObjs,
            participatingBrigades: allBrigades.slice(0, 3), // Limited force for probe
            sectorId: originSectorId ?? undefined,
            objectives: allObjs.slice(0, 1),
            stagingOsid: probePlan.axes[0]?.stagingOsid ?? probePlan.defaultStagingOsid,
            minAttackOutcome: 'repulsed',
            tempo: 'standard',
        };

        const result = await ipc.stageCorpsOperationOrder(payload);
        if (!result.ok) {
            setLoadError(result.error ?? 'Failed to stage probe order.');
        }
        setIsSubmitting(false);
        setTimeout(() => clearContext(), 1000);
    };

    return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            {/* Dim overlay */}
            <div className="absolute inset-0 bg-black/40" />

            {/* OPORD Document */}
            <div className="relative z-10 max-h-[80vh] overflow-y-auto">
                <OpordDocument
                    plan={plan}
                    prediction={prediction}
                    commanderName={commanderName}
                    corpsName={corpsName}
                    faction={faction}
                    date={date}
                    isStamped={isStamped}
                />
            </div>

            {/* Transmitted message */}
            {transmitted && (
                <div className="relative z-10 mt-4 text-center animate-[fadeIn_0.5s_ease-out]">
                    <div className="text-accent-gold font-bold text-sm uppercase tracking-[0.3em]">
                        ZAPOVIJED PROSLIJEĐENA
                    </div>
                    <div className="text-text-secondary text-[10px] mt-1">Directive Transmitted</div>
                </div>
            )}

            {/* Action buttons */}
            {!isStamped && (
                <div className="relative z-10 mt-6 flex gap-3">
                    {isLowIntel ? (
                        <>
                            <button
                                type="button"
                                onClick={handleProbe}
                                disabled={isSubmitting}
                                className="px-6 py-3 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-sm
                                           uppercase tracking-wider hover:bg-amber-500/30 transition-colors
                                           border border-amber-500/30 disabled:opacity-50"
                            >
                                NAREDITI IZVIĐANJE
                                <div className="text-[8px] font-normal mt-0.5 opacity-70">Order Probe</div>
                            </button>
                            <button
                                type="button"
                                onClick={handleAuthorize}
                                disabled={isSubmitting}
                                className="px-4 py-3 rounded-lg bg-[rgba(40,36,30,0.6)] text-text-secondary font-bold text-xs
                                           uppercase tracking-wider hover:bg-[rgba(60,54,44,0.7)] transition-colors
                                           border border-[rgba(180,160,130,0.1)] disabled:opacity-50"
                            >
                                Authorize Anyway
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={handleAuthorize}
                            disabled={isSubmitting}
                            className="px-8 py-3 rounded-lg bg-[#2d6a4f]/20 text-[#4a9a55] font-bold text-sm
                                       uppercase tracking-wider hover:bg-[#2d6a4f]/30 transition-colors
                                       border border-[#2d6a4f]/30 disabled:opacity-50"
                        >
                            ODOBRITI OPERACIJU
                            <div className="text-[8px] font-normal mt-0.5 opacity-70">Authorize Operation</div>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
