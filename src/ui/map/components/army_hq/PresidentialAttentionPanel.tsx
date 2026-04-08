import { useMemo } from 'react';
import type { LoadedGameState } from '../../data/types';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { getPlayerSafeCorpsName } from '../../utils/playerSafeText';
import { OrderInterpretationPanel } from './OrderInterpretationPanel';

interface PresidentialAttentionPanelProps {
    gameState: LoadedGameState;
    playerFaction: string;
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

export function PresidentialAttentionPanel({ gameState, playerFaction }: PresidentialAttentionPanelProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    const reviewQueue = gameState.presidentialReviewQueue;

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

    const handleDecisionResponse = async (eventId: string, responseId: string) => {
        if (!ipc.isAvailable) return;
        const result = await ipc.respondToEventDecision(eventId, responseId);
        if (!result.ok) setLoadError(result.error ?? 'Failed to record presidential decision.');
    };

    const handleAcknowledgeOfficerEvent = async (eventId: string) => {
        if (!ipc.isAvailable) return;
        const result = await ipc.acknowledgeOfficerEvent(eventId);
        if (!result.ok) setLoadError(result.error ?? 'Failed to acknowledge personnel directive.');
    };

    const handleAcceptReplacement = async (event: NonNullable<LoadedGameState['pendingOfficerEvents']>[number]) => {
        if (!ipc.isAvailable || event.type !== 'replacement_suggested' || !event.corps_id) return;
        const result = await ipc.acceptOfficerReplacement({
            eventId: event.event_id,
            corpsId: event.corps_id,
            newOfficerId: event.officer_id,
            currentOfficerId: event.current_commander_id,
        });
        if (!result.ok) {
            setLoadError(result.error ?? 'Failed to accept replacement.');
        }
    };

    if (!reviewQueue || reviewQueue.pendingCount === 0) {
        return (
            <div className="bg-panel-card border border-panel-border rounded-lg p-4 mb-4">
                <div className="text-[9px] uppercase tracking-[0.25em] font-bold text-text-secondary mb-2 pb-1.5 border-b border-panel-border">
                    PRESIDENTIAL ATTENTION
                </div>
                <div className="text-[11px] text-text-secondary italic">
                    No presidential military reviews pending. Situation briefing below is context only.
                </div>
            </div>
        );
    }

    return (
        <div className="bg-panel-card border border-panel-border rounded-lg p-4 mb-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-[9px] uppercase tracking-[0.25em] font-bold text-text-secondary mb-1">
                        PRESIDENTIAL ATTENTION
                    </div>
                    <div className="text-[12px] font-bold text-text-primary">
                        {reviewQueue.pendingCount} matter{reviewQueue.pendingCount === 1 ? '' : 's'} await command review
                    </div>
                    <div className="text-[10px] text-text-secondary mt-1">
                        This queue owns live military review work. Situation briefing below is context, not the action queue.
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 min-w-[15rem]">
                    <CountCard label="Critical" value={reviewQueue.criticalCount} tone="critical" />
                    <CountCard label="Event Decisions" value={reviewQueue.eventDecisionCount} tone={reviewQueue.eventDecisionCount > 0 ? 'critical' : 'neutral'} />
                    <CountCard label="Command Reactions" value={reviewQueue.commandInterpretationCount} tone={reviewQueue.commandInterpretationCount > 0 ? 'warning' : 'neutral'} />
                    <CountCard label="Personnel Directives" value={reviewQueue.personnelDirectiveCount} tone={reviewQueue.personnelDirectiveCount > 0 ? 'warning' : 'neutral'} />
                </div>
            </div>

            {pendingDecisions.length > 0 && (
                <section className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary/70 border-b border-panel-border pb-1">
                        Presidential Decisions
                    </div>
                    {pendingDecisions.map((decision) => (
                        <div key={decision.event_id} className="rounded border border-red-500/25 bg-red-950/10 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <div className="text-[11px] font-bold text-text-primary">{decision.event_title}</div>
                                    <div className="text-[10px] text-text-secondary">Pending since week {decision.turn_fired}</div>
                                </div>
                                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded border border-red-500/35 bg-red-500/10 text-red-400">
                                    Decision Required
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {decision.response_options.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => { void handleDecisionResponse(decision.event_id, option.id); }}
                                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] rounded border border-panel-border bg-panel-bg text-text-primary transition-colors hover:bg-white/5"
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {reviewQueue.commandInterpretationCount > 0 && (
                <section className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary/70 border-b border-panel-border pb-1">
                        Command Reactions
                    </div>
                    <OrderInterpretationPanel gameState={gameState} playerFaction={playerFaction} />
                </section>
            )}

            {personnelDirectives.length > 0 && (
                <section className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary/70 border-b border-panel-border pb-1">
                        Personnel Directives
                    </div>
                    {personnelDirectives.map((event) => {
                        const corpsLabel = getPlayerSafeCorpsName(event.corps_name ?? null, event.corps_id ?? null, 'this corps');
                        const isReplacement = event.type === 'replacement_suggested';
                        const badgeLabel =
                            event.type === 'officer_available'
                                ? 'New Officer'
                                : event.type === 'officer_relieved'
                                    ? 'Officer Relieved'
                                    : 'Replacement Offered';

                        return (
                            <div key={event.event_id} className="rounded border border-panel-border bg-panel-bg p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <div className="text-[11px] font-bold text-text-primary">{event.officer_name}</div>
                                        <div className="text-[10px] text-text-secondary">
                                            {isReplacement
                                                ? `Replacement available for ${corpsLabel}.`
                                                : event.type === 'officer_relieved'
                                                    ? `${event.officer_name} has been relieved and recorded for review.`
                                                    : 'New officer available for assignment review.'}
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded border border-amber-500/35 bg-amber-500/10 text-amber-400">
                                        {badgeLabel}
                                    </span>
                                </div>

                                {isReplacement && event.current_commander_name && (
                                    <div className="text-[10px] text-text-secondary">
                                        Current commander: <span className="text-text-primary font-semibold">{event.current_commander_name}</span>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {isReplacement ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => { void handleAcknowledgeOfficerEvent(event.event_id); }}
                                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] rounded border border-panel-border bg-panel-bg text-text-secondary transition-colors hover:bg-white/5"
                                            >
                                                Keep Current
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { void handleAcceptReplacement(event); }}
                                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] rounded border border-amber-500/35 bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20"
                                            >
                                                Accept Replacement
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => { void handleAcknowledgeOfficerEvent(event.event_id); }}
                                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] rounded border border-amber-500/35 bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20"
                                        >
                                            Acknowledge
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
