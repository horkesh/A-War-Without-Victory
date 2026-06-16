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
    EventDefinition,
} from '../../../sim/events/event_types';
import type { GameState } from '../../../state/game_state';
import { getCausalAncestors } from '../../../sim/events/causality_query';
import { getPlayerSafePoliticalFactionName, getPlayerSafeOfficerName } from '../utils/playerSafeText';
import { useGameStore } from '../store/gameStore';
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
    /**
     * Phase H Packet 3 — optional event catalog for the Decision Context
     * panel (Component A per H1 scoping §4.2A). When omitted, the panel
     * gracefully degrades (no family / source_tier / source-dossier excerpt
     * rendered from the catalog side). Backward compatible — existing
     * callers that pass only `decision` + `onRespond` continue to work.
     */
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
    /**
     * Phase H Packet 3 — optional GameState handle for ancestry lookup via
     * `getCausalAncestors`. When omitted, the ancestry chain row is
     * skipped. Backward compatible.
     */
    state?: GameState;
    /**
     * Phase 2 slice 1 "Back the Officer": named advisor whose voice frames the
     * assessment block for operation/corps-scoped events ('command' / 'military'
     * category). When a commander resolves, the block is labelled "{rank} {name}"
     * instead of the generic "Staff assessment". Backward compatible — omit to
     * keep the generic label. Names are already player-safe via the roster, but
     * sanitised defensively here too.
     */
    advisor?: { name: string | null | undefined; rank?: string };
}

/** Phase H Packet 3 — Maximum chars of source dossier excerpt rendered in
 *  the Decision Context section. Per spec: first 200 chars with "..."
 *  truncation. */
const SOURCE_DOSSIER_EXCERPT_MAX_CHARS = 200;

/** Phase H Packet 3 — Truncate a source-note / historical_source string to
 *  the dossier excerpt limit, appending "..." when truncated. Pure helper. */
function truncateSourceDossier(text: string): string {
    if (text.length <= SOURCE_DOSSIER_EXCERPT_MAX_CHARS) return text;
    return text.slice(0, SOURCE_DOSSIER_EXCERPT_MAX_CHARS) + '...';
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

/** Phase 2 slice 1: "corps_commander" → "Corps Commander" for advisor labels. */
function humanizeRank(rank: string): string {
    return rank
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
}

/**
 * Phase 2 slice 1 "Back the Officer": label for the assessment block.
 *
 * Operation/corps-scoped events ('command' / 'military') speak in a named
 * officer's voice ("{rank} {name}") when a commander resolves; everything else
 * (and the no-officer fallback) keeps the generic "Staff assessment". Pure +
 * exported for unit testing without a DOM render.
 */
export function deriveAssessmentLabel(
    category: string | undefined,
    advisor: { name: string | null | undefined; rank?: string } | undefined,
): string {
    const isOfficerScoped = category === 'command' || category === 'military';
    if (!isOfficerScoped || !advisor) return 'Staff assessment';
    // `advisor` is now narrowed; access its fields without non-null assertions.
    if ((advisor.name ?? '').trim().length === 0) return 'Staff assessment';
    const rankPrefix = advisor.rank ? `${humanizeRank(advisor.rank)} ` : '';
    return `${rankPrefix}${getPlayerSafeOfficerName(advisor.name)}`;
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
        case 'negotiation_capital': return `${getPlayerSafePoliticalFactionName(effect.faction)} ${humanizeToken(effect.dimension)} ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
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

const PLAYER_SAFE_CONSEQUENCE_TERMS: Array<[RegExp, string]> = [
    [/\brbih_state_identity\b/g, 'state identity posture'],
    [/\bcsq_bosniak_unity_1993\b/g, 'later Bosniak-national unity consolidation'],
    [/\bcsq_minority_defections_1992\b/g, 'later minority-officer and recruit defection cascade'],
    [/\bcsq_pragmatic_coalition_1993\b/g, 'later pragmatic coalition branch'],
    [/\bbosniak_national\b/g, 'Bosniak national'],
];

function playerSafeFutureExplanation(text: string, showDiagnostics: boolean): string {
    if (showDiagnostics) return text;
    let safe = text.split(/\s*§\d+(?:\.\d+)?\s*/)[0]?.trim() ?? text;
    safe = safe.split(/\bThese consequence rows\b/)[0]?.trim() ?? safe;
    for (const [pattern, replacement] of PLAYER_SAFE_CONSEQUENCE_TERMS) {
        safe = safe.replace(pattern, replacement);
    }
    safe = safe.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (token) => humanizeToken(token).toLowerCase());
    safe = safe.replace(/\s*\((later [^)]+)\)/g, '');
    return safe.replace(/\s+/g, ' ').trim();
}

function FutureConsequenceCard({
    consequence,
    showDiagnostics,
}: {
    consequence: EventFutureConsequence;
    showDiagnostics: boolean;
}) {
    const referenceRows = showDiagnostics ? buildFutureReferenceRows(consequence) : [];
    const explanation = playerSafeFutureExplanation(consequence.explanation, showDiagnostics);
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
                {explanation}
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

function FutureConsequencePreview({
    option,
    showDiagnostics,
}: {
    option: EventResponseOption;
    showDiagnostics: boolean;
}) {
    const consequences = option.future_consequences ?? [];
    if (consequences.length === 0) return null;
    return (
        <div className="mt-2">
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-accent-gold">
                Future consequences
            </div>
            <ul className="space-y-1.5">
                {consequences.map((consequence) => (
                    <FutureConsequenceCard key={consequence.id} consequence={consequence} showDiagnostics={showDiagnostics} />
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
    showDiagnostics,
    onChoose,
}: {
    option: EventResponseOption;
    decision: EventDecisionDossier;
    sourceNote: string | null;
    showDiagnostics: boolean;
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
                            title={`The historically attested choice. You are free to choose any option.${sourceNote ? ` Source: ${sourceNote}.` : ''}`}
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
                    This is the historically attested choice. You are free to choose any option.{sourceNote ? ` Source: ${sourceNote}.` : ''}
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
            <FutureConsequencePreview option={option} showDiagnostics={showDiagnostics} />
        </div>
    );
}

/**
 * Phase H Packet 3 (Component A — Decision Context expansion) — renders the
 * event's causal-context substrate (family + source_tier badge, ancestry
 * chain, source-dossier excerpt). Conservative scope: data display only,
 * no styling polish. Gracefully omits sub-rows when their inputs are
 * missing. See `docs/40_reports/proposals/20260528_UI_CODEX_INTEGRATION_SCOPING.md` §4.2A.
 */
function DecisionContextSection({
    decision,
    eventCatalog,
    state,
    diagMode,
}: {
    decision: EventDecisionDossier;
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
    state?: GameState;
    diagMode: boolean;
}) {
    // Graceful degradation: if neither catalog nor state is available, omit
    // the entire section. The existing modal sidebar already shows the
    // source_note; the Decision Context section adds CAUSAL context only.
    if (!eventCatalog && !state) return null;
    const eventDef = eventCatalog?.get(decision.event_id);
    const family = eventDef?.family;
    const sourceTier = eventDef?.source_tier;
    const ancestors = state ? getCausalAncestors(decision.event_id, state) : [];
    const rawDossier = eventDef?.source_note ?? eventDef?.historical_source ?? null;
    const dossierExcerpt = rawDossier ? truncateSourceDossier(rawDossier) : null;
    // Resolve ancestry event_ids to catalog titles (humanized id as fallback)
    // so the dev diagnostic shows readable names rather than raw slugs.
    const ancestorLabels = ancestors.map(
        (id) => eventCatalog?.get(id)?.title ?? humanizeToken(id),
    );

    // If catalog provided but the event_id is not in it AND we have no
    // ancestors to render, omit the section (nothing to show).
    if (!eventDef && ancestors.length === 0) return null;

    // Family/Source taxonomy and the causal ancestry chain are engine-internal
    // designer/debug diagnostics — gate them behind the explicit diagMode
    // flag, not generic devMode. The source dossier excerpt below is player-facing
    // historical provenance and stays visible.
    const showDiagnostics = diagMode && (Boolean(eventDef && (family || sourceTier)) || ancestors.length > 0);

    // If the only content this section could render is the (now-gated)
    // diagnostics and the player-facing dossier is absent, omit it entirely.
    if (!showDiagnostics && !dossierExcerpt) return null;

    return (
        <section
            className="mb-4 rounded border border-panel-border bg-panel-card/80 p-4"
            data-testid="decision-context-section"
        >
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-accent-gold">
                Decision Context
            </div>
            {showDiagnostics && eventDef && (family || sourceTier) && (
                <div
                    className="mb-2 text-[11px] leading-relaxed text-text-secondary"
                    data-testid="decision-context-family-source"
                >
                    Family: {family ?? 'unknown'} | Source: {sourceTier ?? 'unknown'}
                </div>
            )}
            {showDiagnostics && ancestors.length > 0 && (
                <div
                    className="mb-2 text-[11px] leading-relaxed text-text-secondary"
                    data-testid="decision-context-ancestry"
                >
                    Ancestry: {ancestorLabels.join(', ')}
                </div>
            )}
            {dossierExcerpt && (
                <div
                    className="text-[11px] leading-relaxed text-text-secondary"
                    data-testid="decision-context-dossier"
                >
                    Source dossier: {dossierExcerpt}
                </div>
            )}
        </section>
    );
}

export function EventDecisionModal({ decision, onRespond, eventCatalog, state, advisor }: EventDecisionModalProps) {
    const factionColor = FACTION_TEXT_CLASS[decision.faction ?? ''] ?? 'text-accent-gold';
    const category = sentenceToken(decision.category) || 'Presidential decision';
    const sourceNote = decision.source_note ?? decision.historical_source ?? decision.source ?? null;
    const hasHistoricalDefault = decision.response_options.some((option) => isHistoricalOption(option, decision));

    // Phase 2 slice 1 "Back the Officer": for operation/corps-scoped events
    // the assessment block speaks in a named officer's voice; otherwise it falls
    // back to the generic "Staff assessment". (See deriveAssessmentLabel.)
    const assessmentLabel = deriveAssessmentLabel(decision.category, advisor);
    const diagMode = useGameStore((s) => s.diagMode);

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
                            {decision.narrative || decision.situation || 'This decision requires your response.'}
                        </p>
                        {decision.staff_assessment && (
                            <div className="mt-3 rounded border border-panel-border/70 bg-panel-bg/60 px-3 py-2">
                                <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-text-muted">
                                    {assessmentLabel}
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

                {/* Phase H Packet 3 — Decision Context (Component A) renders
                    after the dossier sidebar / source-note, before the
                    response option list. See H1 scoping §4.2A. */}
                <DecisionContextSection
                    decision={decision}
                    eventCatalog={eventCatalog}
                    state={state}
                    diagMode={diagMode}
                />

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
                            showDiagnostics={diagMode}
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
