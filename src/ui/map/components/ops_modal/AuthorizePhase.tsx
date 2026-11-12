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
import { resolveCorpsCommanderDisplay } from '../../utils/officerUtils';
import { findPlayerFacingOperationByKey } from '../../../shared/playerVisibility';
import { buildAuthorableOpEligibility } from '../../data/backTheOfficer';
import type { AuthorableOpWarningView } from '../../data/backTheOfficer';
import type { ValidatableOpDef } from '../../../../sim/combat/operation_validation';
import type { FactionId } from '../../../../state/game_state';
import { t, type MessageKey } from '../../i18n';
import {
    SurfaceDetailFooter,
    SurfaceSection,
    SurfaceStat,
    SURFACE_CHIP,
    SURFACE_LABEL,
    SURFACE_SECONDARY_BUTTON,
    SURFACE_TONE,
} from '../surface/Surface';
import { OpsNotice, OpsPhaseBody } from './opsSurface';

interface AuthorizePhaseProps {
    plan: OpsPlanState;
    prediction: PredictionResult | null;
    corpsId: string;
    officerId: string | null;
    originSectorId: string | null;
}

const ELIGIBILITY_MESSAGE_KEYS: Record<AuthorableOpWarningView['code'], MessageKey> = {
    staging_adjacency: 'opsPlanning.authorize.eligibility.finding.stagingAdjacency',
    chain_gap: 'opsPlanning.authorize.eligibility.finding.chainGap',
    brigade_missing: 'opsPlanning.authorize.eligibility.finding.brigadeUnavailable',
    brigade_ineligible: 'opsPlanning.authorize.eligibility.finding.brigadeUnavailable',
    all_objectives_owned: 'opsPlanning.authorize.eligibility.finding.objectivesAlreadyHeld',
    axis_empty: 'opsPlanning.authorize.eligibility.finding.axisEmpty',
    op_empty: 'opsPlanning.authorize.eligibility.finding.operationEmpty',
    objective_overlap: 'opsPlanning.authorize.eligibility.finding.objectiveOverlap',
    participants_below_attack_floor: 'opsPlanning.authorize.eligibility.finding.participantsBelowFloor',
};

function playerSafeEligibilityMessage(warning: AuthorableOpWarningView): string {
    return t(ELIGIBILITY_MESSAGE_KEYS[warning.code] ?? 'opsPlanning.authorize.eligibility.finding.generic');
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
            : null;
        const commanderDisplay = officer ? null : resolveCorpsCommanderDisplay(corpsId, fac, loadedGameState);

        return { corpsName: name, faction: fac, commanderName: officer?.name ?? commanderDisplay?.name ?? t('opsPlanning.g2.notAvailable'), date: turnToISODate(loadedGameState.turn ?? 0) };
    }, [loadedGameState, corpsId, officerId, plan.opName]);

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

    const isLowIntel = prediction?.overall.intelConfidence != null && prediction.overall.intelConfidence < 0.4;

    // Free War Phase 4, #67 (Slice 2): gate the Authorize button on the canonical
    // eligibility read-model. Disabled unless the op is valid (no blocking errors),
    // affordable (CA >= AUTHOR_OP_COST), and a free operation slot exists. When the
    // eligibility read-model is unavailable (no rawState), do not block — the engine
    // remains the final validator (it rejects + clears on injection).
    const authorizeBlocked = eligibility
        ? !(eligibility.ok && eligibility.affordable && eligibility.has_available_slot)
        : false;

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

    const primaryAction = 'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md bg-[#c9a75c] px-6 py-3 text-[18px] font-bold text-[#15120b] transition hover:bg-[#d8b86c] disabled:cursor-default disabled:opacity-45';
    const secondaryAction = 'flex flex-col items-center justify-center rounded-md border border-[#3a4150] bg-[#1b2029] px-5 py-3 text-[16px] font-semibold text-[#e8dcbc] transition hover:border-accent-gold/60 disabled:cursor-default disabled:opacity-45';

    return (
        <div
            className="flex min-h-0 flex-1 flex-col"
            data-testid="ops-planning-phase-panel"
            data-phase="authorize"
        >
            <OpsPhaseBody>
                {/* The operation order (OPORD) */}
                <SurfaceSection label={t('opsPlanning.surface.orderSection')}>
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
                </SurfaceSection>

                {/* Free War Phase 4, #67 (Slice 1): author-new-op eligibility + CA cost.
                    Read-only surfacing; the Authorize gate is `authorizeBlocked` (Slice 2). */}
                {!isStamped && eligibility && (
                    <SurfaceSection
                        label={t('opsPlanning.authorize.eligibility.title')}
                        action={(
                            <span
                                className={`${SURFACE_CHIP} ${eligibility.affordable ? SURFACE_TONE.good : SURFACE_TONE.danger}`}
                                title={eligibility.affordable
                                    ? t('opsPlanning.authorize.eligibility.affordableTitle')
                                    : t('opsPlanning.authorize.eligibility.unaffordableTitle')}
                            >
                                {t('opsPlanning.authorize.eligibility.caCost')}: {eligibility.ca_cost}
                            </span>
                        )}
                    >
                        {/* Operation-slot accounting — slot exhaustion is silent in-engine. */}
                        <SurfaceStat
                            label={t('opsPlanning.authorize.eligibility.slots')}
                            value={`${eligibility.slots_used}/${eligibility.slots_max}`}
                            tone={eligibility.has_available_slot ? undefined : 'text-red-200'}
                        />
                        {!eligibility.has_available_slot && (
                            <span className="text-[15px] font-semibold text-red-200">
                                {t('opsPlanning.authorize.eligibility.slotExhausted')}
                            </span>
                        )}
                        {eligibility.has_available_slot && eligibilityErrors.length === 0 && eligibilityWarnings.length === 0 ? (
                            <OpsNotice tone="good">{t('opsPlanning.authorize.eligibility.clean')}</OpsNotice>
                        ) : (
                            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                                {!eligibility.has_available_slot && (
                                    <li className="flex items-start gap-3 rounded-md border border-red-400/45 bg-red-950/40 px-4 py-2.5 text-[16px] text-red-100">
                                        <span className="shrink-0 font-mono text-[13px] font-semibold uppercase tracking-[0.12em]">
                                            {t('opsPlanning.authorize.eligibility.block')}
                                        </span>
                                        <span>{t('opsPlanning.authorize.eligibility.slotExhaustedDetail')}</span>
                                    </li>
                                )}
                                {eligibilityErrors.map((w, i) => (
                                    <li key={`e${i}`} className="flex items-start gap-3 rounded-md border border-red-400/45 bg-red-950/40 px-4 py-2.5 text-[16px] text-red-100">
                                        <span className="shrink-0 font-mono text-[13px] font-semibold uppercase tracking-[0.12em]">
                                            {t('opsPlanning.authorize.eligibility.block')}
                                        </span>
                                        <span>{playerSafeEligibilityMessage(w)}</span>
                                    </li>
                                ))}
                                {eligibilityWarnings.map((w, i) => (
                                    <li key={`w${i}`} className="flex items-start gap-3 rounded-md border border-amber-300/45 bg-[#2a2416] px-4 py-2.5 text-[16px] text-amber-100">
                                        <span className="shrink-0 font-mono text-[13px] font-semibold uppercase tracking-[0.12em]">
                                            {t('opsPlanning.authorize.eligibility.warn')}
                                        </span>
                                        <span>{playerSafeEligibilityMessage(w)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SurfaceSection>
                )}
            </OpsPhaseBody>

            <SurfaceDetailFooter>
                {/* Transmitted message */}
                {transmitted && (
                    <div role="status" className="flex flex-col gap-1 animate-[fadeIn_0.5s_ease-out]">
                        <span className={SURFACE_LABEL}>{t('opsPlanning.authorize.transmittedStamp')}</span>
                        <span className="text-[16px] text-[#c2b69c]">{t('opsPlanning.authorize.directiveTransmitted')}</span>
                    </div>
                )}

                {/* WP4i: Skip animation button */}
                {isStamped && !transmitted && (
                    <button type="button" onClick={() => setTransmitted(true)} className={SURFACE_SECONDARY_BUTTON}>
                        {t('opsPlanning.authorize.skipAnimation')}
                    </button>
                )}

                {/* Action buttons */}
                {!isStamped && (
                    <div className="flex flex-wrap gap-3">
                        {isLowIntel ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleProbe}
                                    disabled={isSubmitting}
                                    className={primaryAction}
                                >
                                    <span>{t('opsPlanning.authorize.orderProbePrimary')}</span>
                                    <span className="text-[14px] font-normal">{t('opsPlanning.authorize.orderProbeSub')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAuthorize}
                                    disabled={isSubmitting || authorizeBlocked}
                                    className={secondaryAction}
                                >
                                    {t('opsPlanning.authorize.authorizeAnyway')}
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={handleAuthorize}
                                disabled={isSubmitting || authorizeBlocked}
                                title={authorizeBlocked ? t('opsPlanning.authorize.eligibility.unaffordableTitle') : undefined}
                                className={primaryAction}
                            >
                                <span>{t('opsPlanning.authorize.authorizePrimary')}</span>
                                <span className="text-[14px] font-normal">{t('opsPlanning.authorize.authorizeSub')}</span>
                            </button>
                        )}
                    </div>
                )}
            </SurfaceDetailFooter>
        </div>
    );
}
