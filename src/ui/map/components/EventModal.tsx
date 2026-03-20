/**
 * v0.4.1 Phase 5: Event Modal.
 * Displays a fired event with narrative, effects preview, faction impact badges.
 * For decision events, renders response buttons. For non-decision events, "Acknowledge".
 * Uses GlassPanel overlay with dispatch paper inner content.
 */

import { GlassPanel } from './GlassPanel';
import { Icon, type IconName } from './icons/Icon';
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

const CATEGORY_CONFIG: Record<string, { bg: string; color: string; label: string; icon: IconName }> = {
    military: { bg: '#6b3030', color: '#c08080', label: 'MILITARY', icon: 'offensive' },
    political: { bg: '#4a3a6b', color: '#a090c0', label: 'POLITICAL', icon: 'balanced' },
    humanitarian: { bg: '#6b5a30', color: '#c0b080', label: 'HUMANITARIAN', icon: 'personnel' },
    diplomatic: { bg: '#305a6b', color: '#80b0c0', label: 'DIPLOMATIC', icon: 'recon' },
    economic: { bg: '#3a6b3a', color: '#80c080', label: 'ECONOMIC', icon: 'supply' },
    command: { bg: '#5a4a3a', color: '#c0a890', label: 'COMMAND', icon: 'star' },
    territorial: { bg: '#3a5a4a', color: '#80c0a0', label: 'TERRITORIAL', icon: 'home' },
};

const EFFECT_ICONS: Record<string, IconName> = {
    morale_change: 'morale',
    supply_delta: 'supply',
    cohesion_change: 'cohesion',
    humanitarian_impact: 'dead',
    patron_pressure: 'recon',
    alliance_change: 'balanced',
    negotiation_capital: 'star',
    equipment_grant: 'tanks',
    aggression_modifier: 'offensive',
};

/** Extract faction IDs mentioned in effects for impact badges. */
function extractFactions(effects: EventDisplayData['effects']): string[] {
    const factions = new Set<string>();
    for (const e of effects) {
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
    const cat = CATEGORY_CONFIG[event.category] ?? { bg: '#444', color: '#aaa', label: event.category.toUpperCase(), icon: 'star' as IconName };
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

            {/* Dispatch paper container */}
            <div
                className="rounded-md overflow-hidden relative"
                style={{
                    background: 'linear-gradient(165deg, #f0e8d8 0%, #e8dfc8 40%, #e0d8c0 100%)',
                    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.05)',
                }}
            >
                {/* Subtle paper noise */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{
                        backgroundImage: 'repeating-conic-gradient(#000 0.0001%, transparent 0.0002%)',
                        backgroundSize: '80px 80px',
                    }}
                />

                {/* Category stamp — top-right corner, rotated */}
                <div
                    className="absolute top-3 right-3 px-3 py-1.5 border-2 rounded-sm font-bold uppercase tracking-[0.2em] text-xs select-none"
                    style={{
                        transform: 'rotate(-4deg)',
                        borderColor: cat.color,
                        color: cat.color,
                        opacity: 0.7,
                        backgroundColor: `${cat.bg}15`,
                    }}
                >
                    <div className="flex items-center gap-1.5">
                        <Icon name={cat.icon} size={12} color={cat.color} />
                        {cat.label}
                    </div>
                </div>

                <div className="p-5 relative">
                    {/* Faction impact badges */}
                    {factions.length > 0 && (
                        <div className="flex items-center gap-1.5 mb-3">
                            {factions.map(fid => (
                                <span
                                    key={fid}
                                    className="text-[10px] px-2 py-0.5 rounded font-bold tracking-wider"
                                    style={{
                                        backgroundColor: `${FACTION_COLORS[fid] ?? '#888'}18`,
                                        color: FACTION_COLORS[fid] ?? '#888',
                                        border: `1px solid ${FACTION_COLORS[fid] ?? '#888'}40`,
                                    }}
                                >
                                    {fid}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Title — typewriter style on paper */}
                    <h3
                        className="text-lg font-bold mb-3 pr-24"
                        style={{ color: '#3a3228', fontFamily: 'Georgia, serif' }}
                    >
                        {event.title}
                    </h3>

                    {/* Narrative body — field report style */}
                    <p
                        className="text-sm leading-relaxed mb-4"
                        style={{ color: '#4a4438', fontFamily: "'Courier New', monospace", lineHeight: '1.7' }}
                    >
                        {event.narrative}
                    </p>

                    {/* Effect preview — on paper, subtle box */}
                    {mechanicalEffects.length > 0 && (
                        <div
                            className="mb-4 p-3 rounded-sm"
                            style={{
                                backgroundColor: 'rgba(60,50,35,0.06)',
                                border: '1px solid rgba(60,50,35,0.12)',
                            }}
                        >
                            <div
                                className="text-[10px] uppercase tracking-[0.15em] mb-2 font-bold"
                                style={{ color: '#8a7e68' }}
                            >
                                Intelligence Assessment
                            </div>
                            <ul className="space-y-1.5">
                                {mechanicalEffects.map((e, i) => (
                                    <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#5a5040' }}>
                                        <Icon
                                            name={EFFECT_ICONS[e.kind] ?? 'star'}
                                            size={11}
                                            color="#8a7e68"
                                        />
                                        <span>{e.description}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Decision responses or acknowledge */}
                    {event.isDecision && event.responseOptions && onDecisionResponse ? (
                        <div className="space-y-2">
                            <div
                                className="text-[10px] uppercase tracking-[0.15em] mb-2 font-bold"
                                style={{ color: '#8a7e68' }}
                            >
                                Commander's Decision Required
                            </div>
                            {event.responseOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => onDecisionResponse(opt.id)}
                                    className="w-full text-left p-3 rounded-sm text-sm transition-all group"
                                    style={{
                                        backgroundColor: 'rgba(60,50,35,0.08)',
                                        color: '#3a3228',
                                        border: '1px solid rgba(60,50,35,0.15)',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(60,50,35,0.15)';
                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(60,50,35,0.3)';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(60,50,35,0.08)';
                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(60,50,35,0.15)';
                                    }}
                                >
                                    <div className="font-bold" style={{ fontFamily: 'Georgia, serif' }}>{opt.label}</div>
                                    {opt.description && (
                                        <div className="text-xs mt-1" style={{ color: '#6a6050' }}>{opt.description}</div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={onAcknowledge}
                                className="px-5 py-2 rounded-sm text-sm font-bold uppercase tracking-wider transition-all"
                                style={{
                                    backgroundColor: 'rgba(60,80,50,0.12)',
                                    color: '#5a6a4a',
                                    border: '1px solid rgba(60,80,50,0.25)',
                                    fontFamily: 'Georgia, serif',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(60,80,50,0.22)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(60,80,50,0.12)';
                                }}
                            >
                                Acknowledged
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
}
