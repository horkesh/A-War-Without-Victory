/**
 * Vertical scrollable timeline for a settlement — "The Story of This Place."
 * Each event is a color-coded card with turn number, icon, and text.
 */
import type { SettlementTimelineEvent, TimelineEventType } from '../utils/buildSettlementTimeline';
import { t } from '../i18n/index.js';
import { turnToDateString } from '../utils/formatters.js';

const EVENT_STYLES: Record<TimelineEventType, { icon: string; color: string; bg: string }> = {
    control_flip:       { icon: '⚑', color: 'text-amber-400',    bg: 'border-amber-400/40' },
    battle:             { icon: '⚔', color: 'text-red-400',      bg: 'border-red-400/40' },
    displacement:       { icon: '→', color: 'text-orange-400',   bg: 'border-orange-400/30' },
    civilian_killed:    { icon: '†', color: 'text-red-300',      bg: 'border-red-300/30' },
    brigade_arrived:    { icon: '▲', color: 'text-emerald-400',  bg: 'border-emerald-400/30' },
    brigade_departed:   { icon: '▼', color: 'text-zinc-400',     bg: 'border-zinc-400/30' },
    siege_began:        { icon: '◉', color: 'text-red-500',      bg: 'border-red-500/30' },
    supply_restored:    { icon: '◈', color: 'text-emerald-500',  bg: 'border-emerald-500/30' },
    operation_target:   { icon: '⊕', color: 'text-blue-400',     bg: 'border-blue-400/30' },
    operation_resolved: { icon: '✓', color: 'text-blue-300',     bg: 'border-blue-300/30' },
    historical_event:   { icon: '★', color: 'text-yellow-400',   bg: 'border-yellow-400/30' },
    ethnic_shift:       { icon: '◐', color: 'text-purple-400',   bg: 'border-purple-400/30' },
};

export function formatSettlementTimelineTurnDate(turn: number): string {
    return turnToDateString(turn);
}

function formatCasualtyCount(value: number | null): string {
    return typeof value === 'number' && Number.isFinite(value)
        ? value.toLocaleString()
        : t('corpsFront.unreported');
}

interface Props {
    events: SettlementTimelineEvent[];
}

export function SettlementTimeline({ events }: Props) {
    if (events.length === 0) {
        return (
            <div className="py-4 text-center text-text-secondary text-[11px] italic">
                {t('settlementTimeline.empty')}
            </div>
        );
    }

    // Group events by turn for visual clustering
    const groups: { turn: number; events: SettlementTimelineEvent[] }[] = [];
    let currentTurn = -1;
    for (const e of events) {
        if (e.turn !== currentTurn) {
            groups.push({ turn: e.turn, events: [] });
            currentTurn = e.turn;
        }
        groups[groups.length - 1].events.push(e);
    }

    return (
        <div className="relative pl-4 space-y-0 max-h-[400px] overflow-y-auto scrollbar-thin">
            {/* Vertical timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-[1px] bg-panel-border/40" />

            {groups.map((group) => (
                <div key={group.turn} className="relative pb-2">
                    {/* Turn marker */}
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-[9px] h-[9px] rounded-full bg-panel-border/60 border border-panel-border relative z-10 -ml-[0.5px]" />
                        <span className="text-[9px] font-mono text-text-secondary tracking-wider">
                            {formatSettlementTimelineTurnDate(group.turn)}
                        </span>
                    </div>

                    {/* Events at this turn */}
                    <div className="ml-3 space-y-1">
                        {group.events.map((event, i) => {
                            const style = EVENT_STYLES[event.type];
                            return (
                                <div
                                    key={`${event.type}-${i}`}
                                    className={`border-l-2 ${style.bg} pl-2 py-0.5`}
                                >
                                    <div className="flex items-start gap-1.5">
                                        <span className={`${style.color} text-[11px] leading-none mt-0.5 flex-shrink-0`}>
                                            {style.icon}
                                        </span>
                                        <div className="min-w-0">
                                            <div className={`text-[10px] font-medium ${style.color}`}>
                                                {event.title}
                                            </div>
                                            {event.detail && (
                                                <div className="text-[9px] text-text-secondary">
                                                    {event.detail}
                                                </div>
                                            )}
                                            {event.casualties && (
                                                <div className="text-[9px] text-text-secondary font-mono">
                                                    {t('settlementTimeline.casualties', {
                                                        attacker: formatCasualtyCount(event.casualties.attacker),
                                                        defender: formatCasualtyCount(event.casualties.defender),
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
