/**
 * v0.4.1 Phase 5: Event Log Panel.
 * Scrollable history of recent events displayed in a right-positioned GlassPanel.
 */

import { GlassPanel } from './GlassPanel';
import { EmptyState } from './EmptyState';

/** A single entry in the event log history. */
export interface EventLogEntry {
    turn: number;
    title: string;
    category: string;
    effectsSummary: string;
}

export interface EventLogPanelProps {
    events: EventLogEntry[];
    onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    military: '#a05050',
    political: '#7a6aab',
    humanitarian: '#ab9a50',
    diplomatic: '#50aaab',
    economic: '#5aab5a',
    command: '#aa8a6a',
    territorial: '#6aaa8a',
};

export function EventLogPanel({ events, onClose }: EventLogPanelProps) {
    return (
        <GlassPanel position="right" title="Event Log" width="340px" onClose={onClose} zIndex={42}>
            {events.length === 0 ? (
                <EmptyState
                    message="No events recorded"
                    helpText="Awaiting first event."
                />
            ) : (
                <div className="space-y-2">
                    {events.map((entry, i) => {
                        const catColor = CATEGORY_COLORS[entry.category] ?? '#888';
                        return (
                            <div
                                key={`${entry.turn}-${entry.title}-${i}`}
                                className="p-2.5 rounded"
                                style={{
                                    backgroundColor: 'rgba(180,160,130,0.04)',
                                    border: '1px solid rgba(180,160,130,0.08)',
                                }}
                            >
                                {/* Turn + category badge row */}
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono" style={{ color: '#8a8578' }}>
                                        W{entry.turn}
                                    </span>
                                    <span
                                        className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider"
                                        style={{
                                            backgroundColor: `${catColor}22`,
                                            color: catColor,
                                            border: `1px solid ${catColor}33`,
                                        }}
                                    >
                                        {entry.category}
                                    </span>
                                </div>

                                {/* Title */}
                                <div className="text-sm font-semibold" style={{ color: '#c8c0b0' }}>
                                    {entry.title}
                                </div>

                                {/* Effects summary */}
                                {entry.effectsSummary && (
                                    <div className="text-xs mt-1" style={{ color: '#8a8578' }}>
                                        {entry.effectsSummary}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </GlassPanel>
    );
}
