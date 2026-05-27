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

import type {
    PendingEventDecision,
    EventResponseOption,
    EventEffect,
    DimensionShift,
    EventFutureConsequence,
} from '../../../sim/events/event_types';
import { getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';

type EventDecisionDossier = PendingEventDecision & {
    narrative?: string;
    category?: string;
    historical_source?: string;
    source_note?: string;
    source?: string;
    staff_assessment?: string;
    trigger_evidence?: string[];
    situation?: string;
};

const FACTION_TEXT_CLASS: Record<string, string> = {
    RS: 'text-faction-rs',
    RBiH: 'text-faction-rbih',
    HRHB: 'text-faction-hrhb',
};

export interface EventDecisionModalProps {
    decision: EventDecisionDossier;
    onRespond: (eventId: string, responseId: string) => void;
}

function humanizeToken(value: string | undefined): string {
    if (!value) return '';
    return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function sentenceToken(value: string | undefined): string {
    const text = humanizeToken(value).trim();
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
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
        case 'equipment_grant': {
            const granted = [
                effect.tanks ? `${effect.tanks} tanks` : '',
                effect.artillery ? `${effect.artillery} artillery` : '',
                effect.aa_systems ? `${effect.aa_systems} AA systems` : '',
            ].filter(Boolean).join(', ');
            return `${getPlayerSafePoliticalFactionName(effect.faction)} equipment ${granted || 'support'} added`;
        }
        case 'aggression_modifier': return `${getPlayerSafePoliticalFactionName(effect.faction)} operational aggression ${effect.delta > 0 ? '+' : ''}${effect.delta} for ${effect.duration_turns} turns`;
        case 'control_change': return `${getPlayerSafePoliticalFactionName(effect.faction)} territorial control changes in ${effect.osids.length} area${effect.osids.length === 1 ? '' : 's'}`;
        case 'guerrilla_threat': return `${getPlayerSafePoliticalFactionName(effect.faction)} rear-area threat for ${effect.duration_turns} turns`;
        case 'recruitment_modifier': return `${getPlayerSafePoliticalFactionName(effect.faction)} recruitment ${Math.round(effect.pool_multiplier * 100)}% for ${effect.duration_turns} turns`;
        case 'equipment_quality_modifier': return `${getPlayerSafePoliticalFactionName(effect.faction)} combat effectiveness ${Math.round(effect.multiplier * 100)}% for ${effect.duration_turns} turns`;
        case 'doctrine_constraint': return `${getPlayerSafePoliticalFactionName(effect.faction)} doctrine constraint for ${effect.duration_turns} turns`;
        case 'offensive_ops_suppression': return `${getPlayerSafePoliticalFactionName(effect.faction)} offensive operations suppressed for ${effect.duration_turns} turns`;
        case 'alliance_lock': return `Alliance ${effect.mode === 'floor' ? 'floor' : 'ceiling'} ${effect.value} for ${effect.duration_turns} turns`;
        case 'bot_priority_shift': return `${getPlayerSafePoliticalFactionName(effect.faction)} staff priorities shift for ${effect.duration_turns} turns`;
        case 'cost_ledger_annotation': return effect.text ?? 'Campaign cost ledger annotation recorded';
    }
    return 'Effect recorded';
}

function describeDimensionShift(shift: DimensionShift): string {
    return `${getPlayerSafePoliticalFactionName(shift.faction)} ${humanizeToken(shift.dimension).toLowerCase()} ${shift.delta > 0 ? '+' : ''}${shift.delta}`;
}

function buildPreviewRows(option: EventResponseOption): string[] {
    const rows = (option.effects ?? [])
        .filter(e => e.kind !== 'narrative')
        .map(describeEffect);
    for (const shift of option.dimension_shifts ?? []) {
        rows.push(describeDimensionShift(shift));
    }
    const flagValues = Object.values(option.sets_flags ?? {});
    if (flagValues.length > 0) {
        rows.push(`Campaign record updated: ${flagValues.map((value) => sentenceToken(String(value))).join(', ')}`);
    }
    return rows;
}

function EffectPreview({ option }: { option: EventResponseOption }) {
    const rows = buildPreviewRows(option);
    if (rows.length === 0) {
        return (
            <p className="mt-2 rounded border border-panel-border/70 bg-panel-bg/60 px-3 py-2 text-[11px] text-text-secondary">
                No immediate mechanical effects.
            </p>
        );
    }
    return (
        <ul className="mt-2 space-y-1 text-[11px] text-text-secondary">
            {rows.map((row, i) => (
                <li key={i} className="rounded border border-panel-border/70 bg-panel-bg/60 px-3 py-1.5">
                    {row}
                </li>
            ))}
        </ul>
    );
}

function formatFutureReferenceList(label: string, values: string[] | undefined): string | null {
    if (!values || values.length === 0) return null;
    return `${label}: ${values.map((value) => humanizeToken(value).toLowerCase()).join(', ')}`;
}

function buildFutureReferenceRows(consequence: EventFutureConsequence): string[] {
    return [
        formatFutureReferenceList('Later eligible events', consequence.opens_events),
        formatFutureReferenceList('Later suppressed events', consequence.closes_events),
        formatFutureReferenceList('Recorded flag context', consequence.opens_flags),
        formatFutureReferenceList('Suppressed flag context', consequence.closes_flags),
    ].filter((row): row is string => row !== null);
}

function FutureConsequenceCard({ consequence }: { consequence: EventFutureConsequence }) {
    const referenceRows = buildFutureReferenceRows(consequence);
    return (
        <li className="rounded border border-panel-border/70 bg-panel-bg/60 px-3 py-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-[11px] font-semibold text-text-primary">
                    {consequence.label}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-sm border border-panel-border bg-panel-card px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-text-secondary">
                        {sentenceToken(consequence.timing)}
                    </span>
                    <span className="rounded-sm border border-panel-border bg-panel-card px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-text-secondary">
                        {sentenceToken(consequence.certainty)}
                    </span>
                </div>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-text-secondary">
                {consequence.explanation}
            </p>
            {referenceRows.length > 0 && (
                <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-text-muted">
                    {referenceRows.map((row) => (
                        <li key={row}>{row}</li>
                    ))}
                </ul>
            )}
        </li>
    );
}

function FutureConsequencePreview({ option }: { option: EventResponseOption }) {
    const consequences = option.future_consequences ?? [];
    if (consequences.length === 0) return null;
    return (
        <div className="mt-2">
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-accent-gold">
                Future consequences
            </div>
            <ul className="space-y-1.5">
                {consequences.map((consequence) => (
                    <FutureConsequenceCard key={consequence.id} consequence={consequence} />
                ))}
            </ul>
        </div>
    );
}

function isHistoricalOption(option: EventResponseOption, decision: EventDecisionDossier): boolean {
    return option.id === decision.historical_default_response_id || option.historical_marker === 'historical_default';
}

function isStaffRecommendedOption(option: EventResponseOption, decision: EventDecisionDossier): boolean {
    return option.id === decision.staff_recommended_response_id;
}

function ResponseButton({
    option,
    decision,
    sourceNote,
    onChoose,
}: {
    option: EventResponseOption;
    decision: EventDecisionDossier;
    sourceNote: string | null;
    onChoose: () => void;
}) {
    const historical = isHistoricalOption(option, decision);
    const staffRecommended = !historical && isStaffRecommendedOption(option, decision);
    return (
        <div className="rounded border border-panel-border bg-panel-card/90 p-3">
            <button
                type="button"
                onClick={onChoose}
                className="w-full text-left rounded border border-panel-border
                           bg-panel-bg px-4 py-2.5 font-sans text-[13px] font-semibold text-text-primary
                           transition-colors hover:border-accent-gold/50 hover:bg-panel-hover"
            >
                <span className="flex flex-wrap items-center gap-2">
                    <span>{option.label}</span>
                    {historical && (
                        <span
                            className="rounded-sm border border-accent-gold/60 bg-accent-gold/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-accent-gold"
                            title={`AI historical path for calibration. Bot-controlled factions choose this option in historical mode. The player may choose any option.${sourceNote ? ` Source: ${sourceNote}.` : ''}`}
                        >
                            Historical default
                        </span>
                    )}
                    {staffRecommended && (
                        <span
                            className="rounded-sm border border-sky-400/60 bg-sky-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-sky-200"
                            title="Staff recommendation for an abstract command decision. This is not a historical default and does not control bot calibration."
                        >
                            Staff recommendation
                        </span>
                    )}
                </span>
            </button>
            {historical && (
                <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
                    AI historical path for calibration. Bot-controlled factions choose this option in historical mode.
                    The player may choose any option.{sourceNote ? ` Source: ${sourceNote}.` : ''}
                </p>
            )}
            {staffRecommended && (
                <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
                    Staff recommendation for this abstract command decision. This is not a historical default and does not control bot calibration.
                </p>
            )}
            {option.description && (
                <p className="mt-2 text-[11px] text-text-secondary leading-relaxed">
                    {option.description}
                </p>
            )}
            <EffectPreview option={option} />
            <FutureConsequencePreview option={option} />
        </div>
    );
}

export function EventDecisionModal({ decision, onRespond }: EventDecisionModalProps) {
    const factionColor = FACTION_TEXT_CLASS[decision.faction ?? ''] ?? 'text-accent-gold';
    const category = sentenceToken(decision.category) || 'Presidential decision';
    const sourceNote = decision.source_note ?? decision.historical_source ?? decision.source ?? null;
    const hasHistoricalDefault = decision.response_options.some((option) => isHistoricalOption(option, decision));

    return (
        <Modal
            isOpen={true}
            dismissible={false}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="event-decision-title"
            backdropClassName="bg-black/70"
            panelClassName="bg-panel-bg border border-panel-border rounded-lg max-w-[720px] w-[92%] max-h-[88vh] overflow-y-auto shadow-xl backdrop-blur-sm"
        >
            <div className="p-6">
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
                <h3 id="event-decision-title" className="font-sans text-lg text-text-primary font-semibold mb-3">
                    {decision.event_title}
                </h3>

                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
                    <section className="rounded border border-panel-border bg-panel-card/80 p-4">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-accent-gold">
                            Situation
                        </div>
                        <p className="text-[13px] leading-relaxed text-text-primary">
                            {decision.narrative || decision.situation || 'A player-facing presidential event decision requires your response.'}
                        </p>
                        {decision.staff_assessment && (
                            <div className="mt-3 rounded border border-panel-border/70 bg-panel-bg/60 px-3 py-2">
                                <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-text-muted">
                                    Staff assessment
                                </div>
                                <p className="text-[12px] leading-relaxed text-text-secondary">
                                    {decision.staff_assessment}
                                </p>
                            </div>
                        )}
                        {decision.trigger_evidence && decision.trigger_evidence.length > 0 && (
                            <div className="mt-3 rounded border border-panel-border/70 bg-panel-bg/60 px-3 py-2">
                                <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-text-muted">
                                    Trigger evidence
                                </div>
                                <ul className="space-y-1 text-[12px] leading-relaxed text-text-secondary">
                                    {decision.trigger_evidence.map((evidence) => (
                                        <li key={evidence}>{evidence}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                    <aside className="rounded border border-panel-border bg-panel-card/80 p-4 text-[11px] text-text-secondary">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-accent-gold">
                            Dossier
                        </div>
                        <div className="space-y-2">
                            <div>
                                <span className="block text-[9px] uppercase tracking-[0.12em] text-text-muted">Category</span>
                                <span className="text-text-primary">{category}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] uppercase tracking-[0.12em] text-text-muted">Faction / Turn</span>
                                <span className="text-text-primary">
                                    {getPlayerSafePoliticalFactionName(decision.faction)} / Turn {decision.turn_fired}
                                </span>
                            </div>
                            {sourceNote && (
                                <div>
                                    <span className="block text-[9px] uppercase tracking-[0.12em] text-text-muted">Source note</span>
                                    <span className="text-text-primary">{sourceNote}</span>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>

                {!hasHistoricalDefault && (
                    <div className="mb-4 rounded border border-accent-gold/30 bg-accent-gold/10 px-4 py-3 text-[12px] leading-relaxed text-text-secondary">
                        Historical default source review required. This is not a recommendation; choose the response that matches your policy.
                    </div>
                )}

                {/* Response options */}
                <div className="mb-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-gold mb-3">
                        Presidential Response
                    </div>
                    <div className="space-y-3">
                    {decision.response_options.map(option => (
                        <ResponseButton
                            key={option.id}
                            option={option}
                            decision={decision}
                            sourceNote={sourceNote}
                            onChoose={() => onRespond(decision.event_id, option.id)}
                        />
                    ))}
                    </div>
                </div>

                <div className="rounded border border-panel-border bg-panel-card/70 px-4 py-3 text-[11px] leading-relaxed text-text-secondary">
                    Record trail: after your response, this decision appears in the Chronicle decision ledger and Army HQ Records.
                </div>
            </div>
        </Modal>
    );
}
