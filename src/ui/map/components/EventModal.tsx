/**
 * v0.4.1 Phase 5: Event Modal.
 * Displays a fired event with narrative, effects preview, faction impact badges.
 * For decision events, renders response buttons. For non-decision events, "Acknowledge".
 * Uses GlassPanel overlay styling.
 */

import { GlassPanel } from './GlassPanel';
import type { EventEffect } from '../../../sim/events/event_types';

/** Display-ready event data for the modal. */
export interface EventDisplayData {
    id: string;
    title: string;
    narrative: string;
    category: string;
    effects: Array<{ kind: string; description: string }>;
    isDecision: boolean;
    responseOptions?: Array<{ id: string; label: string; description?: string }>;
    image?: string;
}

export interface EventModalProps {
    event: EventDisplayData;
    queuePosition?: number;
    queueTotal?: number;
    onAcknowledge: () => void;
    onDecisionResponse?: (responseId: string) => void;
}

const FACTION_COLORS: Record<string, string> = {
    RBiH: '#4a9eff',
    RS: '#e05050',
    HRHB: '#50b850',
};

const CATEGORY_BADGES: Record<string, { bg: string; label: string }> = {
    military: { bg: '#6b3030', label: 'Military' },
    political: { bg: '#4a3a6b', label: 'Political' },
    humanitarian: { bg: '#6b5a30', label: 'Humanitarian' },
    diplomatic: { bg: '#305a6b', label: 'Diplomatic' },
    economic: { bg: '#3a6b3a', label: 'Economic' },
    command: { bg: '#5a4a3a', label: 'Command' },
    territorial: { bg: '#3a5a4a', label: 'Territorial' },
};

/** Extract faction IDs mentioned in effects for impact badges. */
function extractFactions(effects: EventDisplayData['effects']): string[] {
    const factions = new Set<string>();
    for (const e of effects) {
        // Look for faction names in the description
        for (const fid of ['RBiH', 'RS', 'HRHB']) {
            if (e.description.includes(fid)) factions.add(fid);
        }
    }
    return Array.from(factions).sort();
}

/** Describe an EventEffect for display. Reuses logic from EventDecisionModal. */
export function describeEventEffect(effect: EventEffect): string {
    switch (effect.kind) {
        case 'narrative': return effect.text;
        case 'morale_change': return `${effect.faction} morale ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'supply_delta': return `${effect.faction} supply ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'cohesion_change': return `${effect.faction} cohesion ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'humanitarian_impact': return `${effect.faction} humanitarian impact${effect.war_crimes_delta ? ` (${effect.war_crimes_delta > 0 ? '+' : ''}${effect.war_crimes_delta})` : ''}`;
        case 'patron_pressure': return `${effect.faction} patron pressure ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'alliance_change': return `RBiH-HRHB alliance ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'negotiation_capital': return `${effect.faction} ${effect.dimension} ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
    }
    return effect.kind;
}

export function EventModal({ event, queuePosition, queueTotal, onAcknowledge, onDecisionResponse }: EventModalProps) {
    const badge = CATEGORY_BADGES[event.category] ?? { bg: '#444', label: event.category };
    const factions = extractFactions(event.effects);
    const mechanicalEffects = event.effects.filter(e => !e.description.startsWith('[narrative]'));

    return (
        <GlassPanel position="overlay" title="Event" width="520px" zIndex={55}>
            {/* Queue indicator */}
            {queueTotal != null && queueTotal > 1 && (
                <div className="text-right text-xs mb-2" style={{ color: '#8a8578' }}>
                    {queuePosition ?? 1} of {queueTotal}
                </div>
            )}

            {/* Category badge */}
            <div className="flex items-center gap-2 mb-3">
                <span
                    className="text-xs px-2 py-0.5 rounded uppercase tracking-wider font-semibold"
                    style={{ backgroundColor: badge.bg, color: '#d0c8b0' }}
                >
                    {badge.label}
                </span>

                {/* Faction impact badges */}
                {factions.map(fid => (
                    <span
                        key={fid}
                        className="text-xs px-2 py-0.5 rounded font-semibold"
                        style={{
                            backgroundColor: `${FACTION_COLORS[fid] ?? '#888'}22`,
                            color: FACTION_COLORS[fid] ?? '#888',
                            border: `1px solid ${FACTION_COLORS[fid] ?? '#888'}44`,
                        }}
                    >
                        {fid}
                    </span>
                ))}
            </div>

            {/* Title */}
            <h3
                className="text-lg font-bold mb-2"
                style={{ color: '#c4a04a', textShadow: '0 0 6px rgba(196,160,74,0.2)' }}
            >
                {event.title}
            </h3>

            {/* Narrative body */}
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#c8c0b0' }}>
                {event.narrative}
            </p>

            {/* Effect preview */}
            {mechanicalEffects.length > 0 && (
                <div className="mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(180,160,130,0.06)', border: '1px solid rgba(180,160,130,0.1)' }}>
                    <div className="text-xs uppercase tracking-wider mb-2" style={{ color: '#8a8578' }}>
                        Effects
                    </div>
                    <ul className="space-y-1">
                        {mechanicalEffects.map((e, i) => (
                            <li key={i} className="text-xs" style={{ color: '#a09888' }}>
                                {e.description}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Decision responses or acknowledge */}
            {event.isDecision && event.responseOptions && onDecisionResponse ? (
                <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wider mb-2" style={{ color: '#8a8578' }}>
                        Choose your response
                    </div>
                    {event.responseOptions.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => onDecisionResponse(opt.id)}
                            className="w-full text-left p-3 rounded text-sm transition-colors"
                            style={{
                                backgroundColor: 'rgba(42,58,94,0.6)',
                                color: '#d0c8b0',
                                border: '1px solid rgba(85,102,136,0.4)',
                            }}
                            onMouseEnter={e => {
                                (e.target as HTMLElement).style.backgroundColor = 'rgba(42,58,94,0.9)';
                            }}
                            onMouseLeave={e => {
                                (e.target as HTMLElement).style.backgroundColor = 'rgba(42,58,94,0.6)';
                            }}
                        >
                            <div className="font-semibold">{opt.label}</div>
                            {opt.description && (
                                <div className="text-xs mt-1" style={{ color: '#8a8578' }}>{opt.description}</div>
                            )}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex justify-end">
                    <button
                        onClick={onAcknowledge}
                        className="px-6 py-2 rounded text-sm font-semibold transition-colors"
                        style={{
                            backgroundColor: 'rgba(196,160,74,0.15)',
                            color: '#c4a04a',
                            border: '1px solid rgba(196,160,74,0.3)',
                        }}
                        onMouseEnter={e => {
                            (e.target as HTMLElement).style.backgroundColor = 'rgba(196,160,74,0.25)';
                        }}
                        onMouseLeave={e => {
                            (e.target as HTMLElement).style.backgroundColor = 'rgba(196,160,74,0.15)';
                        }}
                    >
                        Acknowledge
                    </button>
                </div>
            )}
        </GlassPanel>
    );
}
