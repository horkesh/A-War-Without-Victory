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
import { findPlayerFacingOperationByKey } from '../../../shared/playerVisibility';
import { buildAuthorableOpEligibility } from '../../data/backTheOfficer';
import type { ValidatableOpDef } from '../../../../sim/combat/operation_validation';
import type { FactionId } from '../../../../state/game_state';
import { t } from '../../i18n';

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
        const matchingOperation = findPlayerFacingOperationByKey(
            loadedGameState,
            `${corpsId}|${plan.opName}`,
        );
        const resolvedOfficerId = matchingOperation?.commander_officer_id ?? officerId;
        const officer = resolvedOfficerId
            ? (loadedGameState.namedOfficerData ?? []).find((o) => o.id === resolvedOfficerId)
            : (loadedGameState.namedOfficerData ?? []).find(
                (o) => o.assigned_corps_id === corpsId && o.acting_commander
              );

        return { corpsName: name, faction: fac, commanderName: officer?.name ?? t('opsPlanning.g2.notAvailable'), date: turnToISODate(loadedGameState.turn ?? 0) };
    }, [loadedGameState, corpsId, officerId]);

    // Free War Phase 4, #67 (Slice 1): author-new-op eligibility/validation +
    // command-authority cost, surfaced READ-ONLY over the canonical injection
    // validator. Staging/IPC execution (Slices 2-4) is unchanged — this only
    // shows the player which findings the authored op carries and what it costs.
    const eligibility = useMemo(() => {
        const rawState = loadedGameState?.rawGameState;
        if (!rawState || !corpsId) return null;
        // Faction from the typed GameState (corps formation, else player faction,
        // else RBiH) — cast-free so the strict-null ratchet stays pinned.
        const opFaction: FactionId =
            rawState.military?.formations?.[corpsId]?.faction ?? rawState.meta?.player_faction ?? 'RBiH';
        const def: ValidatableOpDef = {
            name: plan.opName,
            faction: opFaction,
            staging_osid: plan.axes[0]?.stagingOsid ?? plan.defaultStagingOsid,
            axes: plan.axes.map((a) => ({
                axis_id: a.id,
                brigades: a.brigadeIds,
                objectives: a.objectives,
                staging_osid: a.stagingOsid ?? plan.defaultStagingOsid,
            })),
        };
        const corpsCmd = rawState.military?.corps_command?.[corpsId];
        return buildAuthorableOpEligibility(rawState, def, undefined, corpsCmd, corpsId);
    }, [loadedGameState, corpsId, plan]);

    const eligibilityErrors = eligibility?.warnings.filter((w) => w.severity === 'error') ?? [];
    const eligibilityWarnings = eligibility?.warnings.filter((w) => w.severity === 'warning') ?? [];

    const isLowIntel = prediction && prediction.overall.intelConfidence < 0.4;

    const submitOperation = async (overrides?: Partial<CorpsOperationOrderPayload>) => {
        setIsStamped(true);
        await new Promise((r) => setTimeout(r, 1500));
        if (!mountedRef.current) return;
        setTransmitted(true);

        if (!ipc.isAvailable) {
            setLoadError(t('opsPlanning.authorize.error.desktop'));
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
            setLoadError(opRes.error ?? t('opsPlanning.authorize.error.stageFailed'));
            setIsSubmitting(false);
            return;
        }
        if (!cmdRes.ok) {
            setLoadError(cmdRes.error ?? t('opsPlanning.authorize.error.commanderFailed'));
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
                        {t('opsPlanning.authorize.skipAnimation')}
                    </button>
                </div>
            )}

            {/* Transmitted message */}
            {transmitted && (
                <div className="relative z-10 mt-4 text-center animate-[fadeIn_0.5s_ease-out]">
                    <div className="text-accent-gold font-bold text-sm uppercase tracking-[0.3em]">
                        {t('opsPlanning.authorize.transmittedStamp')}
                    </div>
                    <div className="text-text-secondary text-[10px] mt-1">{t('opsPlanning.authorize.directiveTransmitted')}</div>
                </div>
            )}

            {/* Free War Phase 4, #67 (Slice 1): author-new-op eligibility + CA cost.
                Read-only surfacing — does NOT gate the Authorize button (Slice 2). */}
            {!isStamped && eligibility && (
                <div className="relative z-10 mt-5 w-[min(90vw,42rem)] rounded-lg border border-[rgba(180,160,130,0.15)]
                                bg-[rgba(20,18,15,0.6)] px-4 py-3 text-left">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-text-secondary/80">
                            {t('opsPlanning.authorize.eligibility.title')}
                        </span>
                        <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded
                                ${eligibility.affordable
                                    ? 'bg-[#2d6a4f]/20 text-[#4a9a55] border border-[#2d6a4f]/30'
                                    : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}
                            title={eligibility.affordable
                                ? t('opsPlanning.authorize.eligibility.affordableTitle')
                                : t('opsPlanning.authorize.eligibility.unaffordableTitle')}
                        >
                            {t('opsPlanning.authorize.eligibility.caCost')}: {eligibility.ca_cost}
                        </span>
                    </div>
                    {/* Operation-slot accounting — slot exhaustion is silent in-engine. */}
                    <div className="flex items-center justify-between mb-2 text-[10px]">
                        <span className="text-text-secondary/70">
                            {t('opsPlanning.authorize.eligibility.slots')}: {eligibility.slots_used}/{eligibility.slots_max}
                        </span>
                        {!eligibility.has_available_slot && (
                            <span className="font-bold uppercase tracking-wider text-red-400">
                                {t('opsPlanning.authorize.eligibility.slotExhausted')}
                            </span>
                        )}
                    </div>
                    {eligibility.has_available_slot && eligibilityErrors.length === 0 && eligibilityWarnings.length === 0 ? (
                        <div className="text-[11px] text-[#4a9a55]">
                            {t('opsPlanning.authorize.eligibility.clean')}
                        </div>
                    ) : (
                        <ul className="space-y-1">
                            {!eligibility.has_available_slot && (
                                <li className="flex items-start gap-2 text-[11px] text-red-400">
                                    <span className="font-bold uppercase text-[9px] mt-[1px]">
                                        {t('opsPlanning.authorize.eligibility.block')}
                                    </span>
                                    <span>{t('opsPlanning.authorize.eligibility.slotExhaustedDetail')}</span>
                                </li>
                            )}
                            {eligibilityErrors.map((w, i) => (
                                <li key={`e${i}`} className="flex items-start gap-2 text-[11px] text-red-400">
                                    <span className="font-bold uppercase text-[9px] mt-[1px]">
                                        {t('opsPlanning.authorize.eligibility.block')}
                                    </span>
                                    <span>{w.message}</span>
                                </li>
                            ))}
                            {eligibilityWarnings.map((w, i) => (
                                <li key={`w${i}`} className="flex items-start gap-2 text-[11px] text-amber-400/90">
                                    <span className="font-bold uppercase text-[9px] mt-[1px]">
                                        {t('opsPlanning.authorize.eligibility.warn')}
                                    </span>
                                    <span>{w.message}</span>
                                </li>
                            ))}
                        </ul>
                    )}
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
                                {t('opsPlanning.authorize.orderProbePrimary')}
                                <div className="text-[8px] font-normal mt-0.5 opacity-70">{t('opsPlanning.authorize.orderProbeSub')}</div>
                            </button>
                            <button
                                type="button"
                                onClick={handleAuthorize}
                                disabled={isSubmitting}
                                className="px-4 py-3 rounded-lg bg-[rgba(40,36,30,0.6)] text-text-secondary font-bold text-xs
                                           uppercase tracking-wider hover:bg-[rgba(60,54,44,0.7)] transition-colors
                                           border border-[rgba(180,160,130,0.1)] disabled:opacity-50"
                            >
                                {t('opsPlanning.authorize.authorizeAnyway')}
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
                            {t('opsPlanning.authorize.authorizePrimary')}
                            <div className="text-[8px] font-normal mt-0.5 opacity-70">{t('opsPlanning.authorize.authorizeSub')}</div>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
