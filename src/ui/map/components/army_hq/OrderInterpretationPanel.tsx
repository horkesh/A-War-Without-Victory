/**
 * OrderInterpretationPanel — Phase 3 officer interpretation event display.
 *
 * Shows unacknowledged order deviation events (order_modified, order_pushback,
 * order_refused) for the player's faction. Returns null when nothing pending
 * (silence = healthy).
 *
 * Design: warroom dark palette, matches CommanderSection style.
 * No business logic: read-only over adapter data, IPC calls only on user action.
 */
import type { LoadedGameState } from '../../data/types';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { RELIEF_MORALE_PENALTY } from '../../../../sim/combat/order_interpretation.js';

// Phase 3 interpretation event types only (not personnel events)
const INTERPRETATION_TYPES = new Set(['order_modified', 'order_pushback', 'order_refused']);

interface BadgeStyle {
    border: string;
    bg: string;
    text: string;
    label: string;
}

const BADGE_STYLES: Record<string, BadgeStyle> = {
    order_modified: {
        border: 'border-amber-500/30',
        bg: 'bg-amber-900/10',
        text: 'text-amber-400',
        label: 'MODIFIED',
    },
    order_pushback: {
        border: 'border-orange-500/30',
        bg: 'bg-orange-900/10',
        text: 'text-orange-400',
        label: 'PUSHBACK',
    },
    order_refused: {
        border: 'border-red-500/30',
        bg: 'bg-red-900/10',
        text: 'text-red-400',
        label: 'REFUSED',
    },
};

interface OrderInterpretationPanelProps {
    gameState: LoadedGameState;
    playerFaction: string;
}

type PendingOfficerEvent = NonNullable<LoadedGameState['pendingOfficerEvents']>[number];
const SUPPORTED_ORDER_OVERRIDE_ACTIONS = new Set<string>();

export function shouldShowOrderOverrideControl(
    event: Pick<PendingOfficerEvent, 'overridable' | 'override_action'>,
): boolean {
    return event.overridable === true
        && typeof event.override_action === 'string'
        && SUPPORTED_ORDER_OVERRIDE_ACTIONS.has(event.override_action);
}

export function OrderInterpretationPanel({ gameState, playerFaction }: OrderInterpretationPanelProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);

    const events = (gameState.pendingOfficerEvents ?? [])
        .filter(e => e.faction === playerFaction && INTERPRETATION_TYPES.has(e.type));

    if (events.length === 0) return null;

    const handleAcknowledge = async (eventId: string) => {
        if (!ipc.isAvailable) return;
        const result = await ipc.acknowledgeOfficerEvent(eventId);
        if (!result.ok) setLoadError(result.error ?? 'Failed to acknowledge event.');
    };

    return (
        <div className="space-y-2">
            {/* Section header */}
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary/60">
                ORDER INTERPRETATIONS // {events.length} PENDING
            </div>

            {events.map((event) => {
                const badge = BADGE_STYLES[event.type] ?? BADGE_STYLES['order_modified'];
                const showOverride = shouldShowOrderOverrideControl(event);
                return (
                    <div
                        key={event.event_id}
                        className={`border ${badge.border} ${badge.bg} p-3 space-y-2`}
                    >
                        {/* Type badge + officer name */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 border ${badge.border} ${badge.text}`}>
                                {badge.label}
                            </span>
                            <span className="text-[11px] font-bold text-text-primary font-mono">
                                {event.officer_name}
                            </span>
                            {event.corps_name && (
                                <span className="text-[10px] text-text-secondary font-mono">
                                    — {event.corps_name}
                                </span>
                            )}
                        </div>

                        {/* Reason text */}
                        {event.reason && (
                            <div className="text-[10px] text-text-secondary italic leading-relaxed">
                                {event.reason}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => { void handleAcknowledge(event.event_id); }}
                                className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-panel-border text-text-primary hover:bg-panel-bg transition-all font-mono"
                            >
                                ACCEPT
                            </button>
                            {showOverride && (
                                <button
                                    type="button"
                                    onClick={() => { setLoadError('Order override bridge is not available yet.'); }}
                                    className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 border ${badge.border} ${badge.text} hover:opacity-80 transition-all font-mono`}
                                >
                                    OVERRIDE
                                </button>
                            )}
                        </div>
                        {event.overridable && !showOverride && (
                            <div className="text-[9px] text-amber-300/70 italic">
                                Override path unavailable until the command-authority bridge exposes a distinct override action.
                            </div>
                        )}
                        {event.type === 'order_refused' && event.overridable && (
                            <div className="text-[9px] text-text-secondary/60 italic">
                                Officer morale {RELIEF_MORALE_PENALTY} if relieved
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
