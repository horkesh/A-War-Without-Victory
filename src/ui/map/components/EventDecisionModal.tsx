/**
 * v0.4.1 Phase 2: Event Decision Modal.
 * Displays a pending event decision with response options for the player.
 * Styled to match existing modals (PeacePlanModal pattern).
 */

import type { PendingEventDecision, EventResponseOption, EventEffect } from '../../../sim/events/event_types';

export interface EventDecisionModalProps {
    decision: PendingEventDecision;
    onRespond: (eventId: string, responseId: string) => void;
}

/** Render a human-readable summary of an effect. */
function describeEffect(effect: EventEffect): string {
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
}

function EffectPreview({ effects }: { effects: EventEffect[] }) {
    const mechanical = effects.filter(e => e.kind !== 'narrative');
    if (mechanical.length === 0) return null;
    return (
        <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, fontSize: 12, color: '#aaa' }}>
            {mechanical.map((e, i) => (
                <li key={i}>{describeEffect(e)}</li>
            ))}
        </ul>
    );
}

function ResponseButton({ option, onChoose }: { option: EventResponseOption; onChoose: () => void }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <button
                style={{
                    padding: '10px 24px',
                    backgroundColor: '#2a3a5e',
                    color: '#e0e0e0',
                    border: '1px solid #556',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 14,
                    width: '100%',
                    textAlign: 'left',
                }}
                onClick={onChoose}
            >
                {option.label}
            </button>
            {option.description && (
                <p style={{ margin: '4px 0 0 8px', fontSize: 12, color: '#999', lineHeight: 1.4 }}>
                    {option.description}
                </p>
            )}
            <EffectPreview effects={option.effects} />
        </div>
    );
}

export function EventDecisionModal({ decision, onRespond }: EventDecisionModalProps) {
    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
        }}>
            <div style={{
                backgroundColor: '#1a1a2e',
                border: '1px solid #444',
                borderRadius: 8,
                padding: 32,
                maxWidth: 560,
                width: '90%',
                color: '#e0e0e0',
                fontFamily: 'system-ui, sans-serif',
            }}>
                <h2 style={{ margin: '0 0 4px 0', color: '#ffd700', fontSize: 18 }}>
                    Event Decision Required
                </h2>
                <p style={{ margin: '0 0 4px 0', fontSize: 12, color: '#888' }}>
                    {decision.faction} -- Turn {decision.turn_fired}
                </p>
                <h3 style={{ margin: '0 0 16px 0', fontWeight: 'normal', color: '#ccc', fontSize: 15 }}>
                    {decision.event_title}
                </h3>

                <div style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: 13, color: '#aaa' }}>Choose your response:</strong>
                </div>

                {decision.response_options.map(option => (
                    <ResponseButton
                        key={option.id}
                        option={option}
                        onChoose={() => onRespond(decision.event_id, option.id)}
                    />
                ))}
            </div>
        </div>
    );
}
