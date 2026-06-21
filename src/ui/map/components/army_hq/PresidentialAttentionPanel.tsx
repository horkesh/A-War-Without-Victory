import { useMemo } from 'react';
import type { LoadedGameState } from '../../data/types';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { getArmyReserveAttentionSummary } from '../../utils/armyReserveSeverity';
import { turnToDateString } from '../../utils/formatters';
import { getPlayerSafeCorpsName } from '../../utils/playerSafeText';
import { t } from '../../i18n';
import { OperationOpportunityDossierPanel } from './OperationOpportunityDossierPanel';
import { OrderInterpretationPanel } from './OrderInterpretationPanel';

interface PresidentialAttentionPanelProps {
    gameState: LoadedGameState;
    playerFaction: string;
    onOpenArmyReserve?: () => void;
}

function CountCard({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'critical' | 'warning' }) {
    const valueClass =
        tone === 'critical'
            ? 'text-red-400'
            : tone === 'warning'
                ? 'text-amber-400'
                : 'text-text-primary';

    return (
        <div className="rounded border border-panel-border bg-panel-bg px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-wide text-text-secondary">{label}</div>
            <div className={`text-[12px] font-bold ${valueClass}`}>{value}</div>
        </div>
    );
}

export function PresidentialAttentionPanel({ gameState, playerFaction, onOpenArmyReserve }: PresidentialAttentionPanelProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    const reviewQueue = gameState.presidentialReviewQueue;
    const armyReserveQueue = gameState.armyReserveQueue;
    const reserveSummary = armyReserveQueue ? getArmyReserveAttentionSummary(armyReserveQueue) : null;
    const liveReviewCount = reviewQueue?.pendingCount ?? 0;

    const pendingDecisions = useMemo(
        () =>
            [...(gameState.pendingEventDecisions ?? [])]
                .filter((decision) => decision.faction === playerFaction)
                .sort((a, b) => a.turn_fired - b.turn_fired || a.event_id.localeCompare(b.event_id)),
        [gameState.pendingEventDecisions, playerFaction],
    );

    const personnelDirectives = useMemo(
        () =>
            [...(gameState.pendingOfficerEvents ?? [])]
                .filter(
                    (event) =>
                        event.faction === playerFaction &&
                        (event.type === 'officer_available' ||
                            event.type === 'replacement_suggested' ||
                            event.type === 'officer_relieved'),
                )
                .sort((a, b) => a.turn - b.turn || a.event_id.localeCompare(b.event_id)),
        [gameState.pendingOfficerEvents, playerFaction],
    );

    const handleAcknowledgeOfficerEvent = async (eventId: string) => {
        if (!ipc.isAvailable) {
            setLoadError(t('attention.bridgeUnavailablePersonnelError'));
            return;
        }
        const result = await ipc.acknowledgeOfficerEvent(eventId);
        if (!result.ok) setLoadError(result.error ?? t('attention.error.ackPersonnel'));
    };

    const handleAcceptReplacement = async (event: NonNullable<LoadedGameState['pendingOfficerEvents']>[number]) => {
        if (!ipc.isAvailable) {
            setLoadError(t('attention.bridgeUnavailableReplacementError'));
            return;
        }
        if (event.type !== 'replacement_suggested' || !event.corps_id) return;
        const result = await ipc.acceptOfficerReplacement({
            eventId: event.event_id,
            corpsId: event.corps_id,
            newOfficerId: event.officer_id,
            currentOfficerId: event.current_commander_id,
        });
        if (!result.ok) {
            setLoadError(result.error ?? t('attention.error.acceptReplacement'));
        }
    };

    if ((!reviewQueue || reviewQueue.pendingCount === 0) && !armyReserveQueue && pendingDecisions.length === 0 && personnelDirectives.length === 0) {
        return (
            <div className="bg-panel-card border border-panel-border rounded-lg p-4 mb-4">
                <div className="text-[9px] uppercase tracking-[0.25em] font-bold text-text-secondary mb-2 pb-1.5 border-b border-panel-border">
                    {t('attention.title')}
                </div>
                <div className="text-[11px] text-text-secondary italic">
                    {t('attention.emptyDetail')}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-panel-card border border-panel-border rounded-lg p-4 mb-4 space-y-4">
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-[9px] uppercase tracking-[0.25em] font-bold text-text-secondary mb-1">
                            {t('attention.title')}
                        </div>
                        <div className="text-[12px] font-bold text-text-primary">
                            {liveReviewCount > 0
                                ? t(liveReviewCount === 1 ? 'attention.awaitReview.one' : 'attention.awaitReview.many', { count: liveReviewCount })
                                : t('attention.noReviews')}
                        </div>
                        <div className="text-[10px] text-text-secondary mt-1">
                            {t('attention.queueDetail')}
                        </div>
                    </div>
                    {liveReviewCount > 0 && (
                        <div className="grid grid-cols-2 gap-2 min-w-[15rem]">
                            <CountCard label={t('attention.critical')} value={reviewQueue?.criticalCount ?? 0} tone="critical" />
                            <CountCard label={t('attention.eventDecisions')} value={reviewQueue?.eventDecisionCount ?? 0} tone={(reviewQueue?.eventDecisionCount ?? 0) > 0 ? 'critical' : 'neutral'} />
                            <CountCard label={t('attention.commandReactions')} value={reviewQueue?.commandInterpretationCount ?? 0} tone={(reviewQueue?.commandInterpretationCount ?? 0) > 0 ? 'warning' : 'neutral'} />
                            <CountCard label={t('attention.personnelDirectives')} value={reviewQueue?.personnelDirectiveCount ?? 0} tone={(reviewQueue?.personnelDirectiveCount ?? 0) > 0 ? 'warning' : 'neutral'} />
                            <CountCard label={t('attention.opDossiers')} value={reviewQueue?.operationOpportunityCount ?? 0} tone={(reviewQueue?.operationOpportunityCount ?? 0) > 0 ? 'warning' : 'neutral'} />
                        </div>
                    )}
                </div>

                {!ipc.isAvailable && (pendingDecisions.length > 0 || personnelDirectives.length > 0) && (
                    <div className="rounded border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-[10px] leading-relaxed text-amber-200">
                        {t('attention.bridgeUnavailableReadOnly')}
                    </div>
                )}

                {armyReserveQueue && (
                    <section className="rounded border border-panel-border bg-panel-bg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary/70">
                                    {t('attention.reserveRequests')}
                                </div>
                                <div className={`text-[11px] mt-1 font-semibold ${reserveSummary?.tone === 'critical' ? 'text-amber-400' : 'text-text-primary'}`}>
                                    {reserveSummary?.heading}
                                </div>
                                <div className="text-[10px] text-text-secondary mt-1">
                                    {reserveSummary?.detail}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 min-w-[11rem]">
                                <CountCard label={t('attention.pending')} value={armyReserveQueue.pendingCount} tone={armyReserveQueue.criticalCount > 0 ? 'warning' : 'neutral'} />
                                <CountCard label={t('attention.critical')} value={armyReserveQueue.criticalCount} tone="critical" />
                                <CountCard label={t('attention.defensive')} value={armyReserveQueue.defensiveCount} />
                                <CountCard label={t('attention.offensive')} value={armyReserveQueue.offensiveCount} />
                            </div>
                        </div>
                        {onOpenArmyReserve && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={onOpenArmyReserve}
                                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] rounded border border-panel-border bg-panel-bg text-text-primary transition-colors hover:bg-white/5"
                                >
                                    {t('attention.openReserveDesk')}
                                </button>
                            </div>
                        )}
                    </section>
                )}
            </div>

            <OperationOpportunityDossierPanel gameState={gameState} playerFaction={playerFaction} />

            {pendingDecisions.length > 0 && (
                <section className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary/70 border-b border-panel-border pb-1">
                        {t('attention.presidentialDecisions')}
                    </div>
                    {pendingDecisions.map((decision) => (
                        <div key={decision.event_id} className="rounded border border-red-500/25 bg-red-950/10 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <div className="text-[11px] font-bold text-text-primary">{decision.event_title}</div>
                                    <div className="text-[10px] text-text-secondary">{t('attention.pendingSinceWeek', { date: turnToDateString(decision.turn_fired) })}</div>
                                </div>
                                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded border border-red-500/35 bg-red-500/10 text-red-400">
                                    {t('attention.decisionRequired')}
                                </span>
                            </div>
                            <div className="rounded border border-panel-border/70 bg-panel-bg/70 px-3 py-2 text-[10px] leading-relaxed text-text-secondary">
                                {t(
                                    decision.response_options.length === 1
                                        ? 'attention.responseOptionsAwaiting.one'
                                        : 'attention.responseOptionsAwaiting.many',
                                    { count: decision.response_options.length },
                                )}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {reviewQueue && reviewQueue.commandInterpretationCount > 0 && (
                <section className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary/70 border-b border-panel-border pb-1">
                        {t('attention.commandReactions')}
                    </div>
                    <OrderInterpretationPanel gameState={gameState} playerFaction={playerFaction} />
                </section>
            )}

            {personnelDirectives.length > 0 && (
                <section className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary/70 border-b border-panel-border pb-1">
                        {t('attention.personnelDirectives')}
                    </div>
                    {personnelDirectives.map((event) => {
                        const corpsLabel = getPlayerSafeCorpsName(event.corps_name ?? null, event.corps_id ?? null, 'this corps');
                        const isReplacement = event.type === 'replacement_suggested';
                        const badgeLabel =
                            event.type === 'officer_available'
                                ? t('attention.newOfficer')
                                : event.type === 'officer_relieved'
                                    ? t('attention.officerRelieved')
                                    : t('attention.replacementOffered');

                        return (
                            <div key={event.event_id} className="rounded border border-panel-border bg-panel-bg p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <div className="text-[11px] font-bold text-text-primary">{event.officer_name}</div>
                                        <div className="text-[10px] text-text-secondary">
                                            {isReplacement
                                                ? t('attention.replacementAvailable', { corps: corpsLabel })
                                                : event.type === 'officer_relieved'
                                                    ? t('attention.officerRelievedDetail', { officer: event.officer_name })
                                                    : t('attention.newOfficerDetail')}
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded border border-amber-500/35 bg-amber-500/10 text-amber-400">
                                        {badgeLabel}
                                    </span>
                                </div>

                                {isReplacement && event.current_commander_name && (
                                    <div className="text-[10px] text-text-secondary">
                                        {t('attention.currentCommander')} <span className="text-text-primary font-semibold">{event.current_commander_name}</span>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {isReplacement ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => { void handleAcknowledgeOfficerEvent(event.event_id); }}
                                                disabled={!ipc.isAvailable}
                                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] rounded border border-panel-border bg-panel-bg text-text-secondary transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {t('attention.keepCurrent')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { void handleAcceptReplacement(event); }}
                                                disabled={!ipc.isAvailable}
                                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] rounded border border-amber-500/35 bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {t('attention.acceptReplacement')}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => { void handleAcknowledgeOfficerEvent(event.event_id); }}
                                            disabled={!ipc.isAvailable}
                                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] rounded border border-amber-500/35 bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {t('attention.acknowledge')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}
        </div>
    );
}
