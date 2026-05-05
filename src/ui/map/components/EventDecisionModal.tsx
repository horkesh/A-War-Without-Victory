/**
 * Event Decision Modal.
 * Displays a pending event decision with response options for the player.
 * Matches EventModal's parchment/dispatch aesthetic.
 *
 * Migrated to the shared `<Modal>` wrapper in
 * LANE-V094-MODAL-DISMISSIBLE-EXTENSION. Must-respond modal:
 * `dismissible={false}` (no ESC, no click-outside) — the only valid close
 * path is `onRespond(eventId, responseId)` (parent stops rendering this
 * modal once the event is resolved). The bespoke `onRespond` callback
 * stays on inner panel content (`<ResponseButton>`), NOT on Modal props.
 */

import type { PendingEventDecision, EventResponseOption, EventEffect } from '../../../sim/events/event_types';
import { FACTION_COLORS } from '../utils/theme';
import { getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';

export interface EventDecisionModalProps {
    decision: PendingEventDecision;
    onRespond: (eventId: string, responseId: string) => void;
}

/** Render a human-readable summary of an effect. */
function describeEffect(effect: EventEffect): string {
    switch (effect.kind) {
        case 'narrative': return effect.text;
        case 'morale_change': return `${getPlayerSafePoliticalFactionName(effect.faction)} morale ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'supply_delta': return `${getPlayerSafePoliticalFactionName(effect.faction)} supply ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'cohesion_change': return `${getPlayerSafePoliticalFactionName(effect.faction)} cohesion ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'humanitarian_impact': return `${getPlayerSafePoliticalFactionName(effect.faction)} humanitarian impact${effect.war_crimes_delta ? ` (${effect.war_crimes_delta > 0 ? '+' : ''}${effect.war_crimes_delta})` : ''}`;
        case 'patron_pressure': return `${getPlayerSafePoliticalFactionName(effect.faction)} patron pressure ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'alliance_change': return `${getPlayerSafePoliticalFactionName('RBiH')} / ${getPlayerSafePoliticalFactionName('HRHB')} alliance ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'negotiation_capital': return `${getPlayerSafePoliticalFactionName(effect.faction)} ${effect.dimension} ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
    }
    return effect.kind;
}

function EffectPreview({ effects }: { effects: EventEffect[] }) {
    const mechanical = effects.filter(e => e.kind !== 'narrative');
    if (mechanical.length === 0) return null;
    return (
        <ul className="mt-1 pl-4 text-[11px] text-text-secondary space-y-0.5">
            {mechanical.map((e, i) => (
                <li key={i}>{describeEffect(e)}</li>
            ))}
        </ul>
    );
}

function ResponseButton({ option, onChoose }: { option: EventResponseOption; onChoose: () => void }) {
    return (
        <div className="mb-2">
            <button
                type="button"
                onClick={onChoose}
                className="w-full text-left px-4 py-2.5 rounded border border-panel-border
                           bg-panel-card hover:bg-panel-hover text-text-primary font-sans text-[13px]
                           transition-colors hover:border-accent-gold/40"
            >
                {option.label}
            </button>
            {option.description && (
                <p className="mt-1 ml-2 text-[11px] text-text-secondary leading-relaxed">
                    {option.description}
                </p>
            )}
            <EffectPreview effects={option.effects} />
        </div>
    );
}

export function EventDecisionModal({ decision, onRespond }: EventDecisionModalProps) {
    const factionColor = FACTION_COLORS[decision.faction] ?? 'text-accent-gold';

    return (
        <Modal
            isOpen={true}
            dismissible={false}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="event-decision-title"
            backdropClassName="bg-black/70"
            panelClassName="bg-panel-bg border border-panel-border rounded-lg p-6 max-w-[560px] w-[90%] shadow-xl backdrop-blur-sm"
        >
            <>
                {/* Category stamp */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-panel-bg bg-accent-gold px-2 py-0.5 rounded"
                          style={{ transform: 'rotate(-2deg)' }}>
                        Decision Required
                    </span>
                    <span className={`text-[10px] font-mono ${factionColor}`}>
                        {getPlayerSafePoliticalFactionName(decision.faction)} · Turn {decision.turn_fired}
                    </span>
                </div>

                {/* Title */}
                <h3 id="event-decision-title" className="font-sans text-base text-text-primary font-semibold mb-4">
                    {decision.event_title}
                </h3>

                {/* Response options */}
                <div className="mb-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-gold mb-3">
                        Commander's Response
                    </div>
                    {decision.response_options.map(option => (
                        <ResponseButton
                            key={option.id}
                            option={option}
                            onChoose={() => onRespond(decision.event_id, option.id)}
                        />
                    ))}
                </div>
            </>
        </Modal>
    );
}
