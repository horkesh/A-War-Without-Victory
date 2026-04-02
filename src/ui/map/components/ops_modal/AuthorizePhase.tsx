/**
 * Phase 4 — Authorize.
 * Shows OPORD document, stamp animation on authorize, then IPC submission.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useIPC } from '../../desktop/useIPC';
import type { CorpsOperationOrderPayload } from '../../desktop/useIPC';
import type { OpsPlanState } from './types';
import type { PredictionResult } from './usePrediction';
import { OpordDocument } from './OpordDocument';
import { formatCorpsDisplayName, turnToISODate } from '../../utils/formatters';

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
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);

    const [isStamped, setIsStamped] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transmitted, setTransmitted] = useState(false);
    const mountedRef = useRef(true);
    useEffect(() => { return () => { mountedRef.current = false; }; }, []);

    const { corpsName, faction, commanderName, date } = useMemo(() => {
        if (!loadedGameState || !corpsId) return { corpsName: '', faction: '', commanderName: '', date: '' };
        const corpsFormation = loadedGameState.formations.find((f) => f.id === corpsId);
        const fac = corpsFormation?.faction ?? '';
        const name = corpsFormation
            ? formatCorpsDisplayName(corpsFormation.name, corpsFormation.id)
            : corpsId;

        // Commander identity sourced from OperationView.commander_officer_id (canonical)
        // Fall back to officerId prop (player planning selection) if no matching operation exists yet.
        const matchingOperation = (loadedGameState.operations ?? []).find(
            (op) => op.corps_id === corpsId && op.phase !== 'recovery'
        );
        const resolvedOfficerId = matchingOperation?.commander_officer_id ?? officerId;
        const officer = resolvedOfficerId
            ? (loadedGameState.namedOfficerData ?? []).find((o) => o.id === resolvedOfficerId)
            : (loadedGameState.namedOfficerData ?? []).find(
                (o) => o.assigned_corps_id === corpsId && o.acting_commander
              );

        return { corpsName: name, faction: fac, commanderName: officer?.name ?? 'N/A', date: turnToISODate(loadedGameState.turn ?? 0) };
    }, [loadedGameState, corpsId, officerId]);

    const isLowIntel = prediction && prediction.overall.intelConfidence < 0.4;

    const submitOperation = async (overrides?: Partial<CorpsOperationOrderPayload>) => {
        setIsStamped(true);
        await new Promise((r) => setTimeout(r, 1500));
        if (!mountedRef.current) return;
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
            ...overrides,
        };

        const opResult = ipc.stageCorpsOperationOrder(payload);
        const cmdResult = officerId
            ? ipc.stageAssignOperationCommander({ corpsId, operationName: payload.name, officerId })
            : Promise.resolve({ ok: true } as { ok: boolean; error?: string });

        const [opRes, cmdRes] = await Promise.all([opResult, cmdResult]);
        if (!mountedRef.current) return;

        if (!opRes.ok) {
            setLoadError(opRes.error ?? 'Failed to stage operation order.');
            setIsSubmitting(false);
            return;
        }
        if (!cmdRes.ok) {
            setLoadError(cmdRes.error ?? 'Operation staged but commander assignment failed.');
        }

        setOperationTargetOsids(allObjs);
        setIsSubmitting(false);
        setTimeout(() => { if (mountedRef.current) clearContext(); }, 1000);
    };

    const handleAuthorize = () => submitOperation();

    const handleProbe = () => {
        const allObjs = plan.axes.flatMap((a) => a.objectives);
        const allBrigades = plan.axes.flatMap((a) => a.brigadeIds);
        return submitOperation({
            name: plan.opName + ' (Probe)',
            type: 'probe',
            participatingBrigades: allBrigades.slice(0, 3),
            objectives: allObjs.slice(0, 1),
            minAttackOutcome: 'repulsed',
            tempo: 'standard',
            axes: undefined,
        });
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
                    osidDisplayNames={osidDisplayNames}
                />
            </div>

            {/* WP4i: Skip animation button */}
            {isStamped && !transmitted && (
                <div className="relative z-10 mt-4 text-center">
                    <button
                        type="button"
                        onClick={() => setTransmitted(true)}
                        className="text-[9px] text-text-secondary/50 hover:text-text-secondary transition-colors"
                    >
                        Skip animation &rarr;
                    </button>
                </div>
            )}

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
