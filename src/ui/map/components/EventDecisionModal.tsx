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
    EventDefinition,
} from '../../../sim/events/event_types';
import type { GameState } from '../../../state/game_state';
import { getCausalAncestors } from '../../../sim/events/causality_query';
import { getPlayerSafePoliticalFactionName, getPlayerSafeOfficerName } from '../utils/playerSafeText';
import { useGameStore } from '../store/gameStore';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { isDisplayEventEffect } from '../utils/eventEffectDisplay';
import { turnToDateString } from '../utils/formatters';
import { t, useLocale, type Locale, type MessageKey } from '../i18n';

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

function eventLocalization(def: EventDefinition | undefined, locale: Locale) {
    if (locale === 'en') return undefined;
    return def?.localizations?.[locale];
}

function localizedField(
    original: string | undefined,
    def: EventDefinition | undefined,
    locale: Locale,
    field: 'title' | 'narrative' | 'situation' | 'staff_assessment' | 'historical_source' | 'source_note' | 'source',
): string | undefined {
    const localized = eventLocalization(def, locale)?.[field];
    return typeof localized === 'string' && localized.trim().length > 0 ? localized : original;
}

function localizedTriggerEvidence(
    original: string[] | undefined,
    def: EventDefinition | undefined,
    locale: Locale,
): string[] | undefined {
    const localized = eventLocalization(def, locale)?.trigger_evidence;
    return Array.isArray(localized) && localized.length > 0 ? localized : original;
}

function localizedResponseOptions(
    options: EventResponseOption[],
    def: EventDefinition | undefined,
    locale: Locale,
): EventResponseOption[] {
    const localizedOptions = eventLocalization(def, locale)?.response_options;
    if (!localizedOptions) return options;
    return options.map((option) => {
        const localized = localizedOptions[option.id];
        if (!localized) return option;
        return {
            ...option,
            label: localized.label?.trim() || option.label,
            description: localized.description?.trim() || option.description,
        };
    });
}

function resolveLocalizedDecisionDossier(
    decision: EventDecisionDossier,
    eventCatalog: ReadonlyMap<string, EventDefinition> | undefined,
    locale: Locale,
): EventDecisionDossier {
    const def = eventCatalog?.get(decision.event_id);
    return {
        ...decision,
        event_title: localizedField(decision.event_title, def, locale, 'title') ?? decision.event_title,
        narrative: localizedField(decision.narrative, def, locale, 'narrative'),
        situation: localizedField(decision.situation, def, locale, 'situation'),
        staff_assessment: localizedField(decision.staff_assessment, def, locale, 'staff_assessment'),
        trigger_evidence: localizedTriggerEvidence(decision.trigger_evidence, def, locale),
        historical_source: localizedField(decision.historical_source, def, locale, 'historical_source'),
        source_note: localizedField(decision.source_note, def, locale, 'source_note'),
        source: localizedField(decision.source, def, locale, 'source'),
        response_options: localizedResponseOptions(decision.response_options, def, locale),
    };
}

const FACTION_TEXT_CLASS: Record<string, string> = {
    RS: 'text-faction-rs',
    RBiH: 'text-faction-rbih',
    HRHB: 'text-faction-hrhb',
};

const EVENT_CATEGORY_LABEL_KEYS: Record<string, MessageKey> = {
    command: 'eventDecision.category.command',
    diplomatic: 'eventDecision.category.diplomatic',
    economic: 'eventDecision.category.economic',
    humanitarian: 'eventDecision.category.humanitarian',
    military: 'eventDecision.category.military',
    political: 'eventDecision.category.political',
    territorial: 'eventDecision.category.territorial',
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
const SHELL_HOTKEYS_BLOCKED_BY_REQUIRED_DECISION = new Set([
    'escape',
    'h',
    's',
    'c',
    'x',
    'd',
    'u',
    'o',
    'tab',
    ' ',
]);

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

function eventDecisionCategoryLabel(category: string | undefined): string {
    if (!category) return t('eventDecision.defaultCategory');
    const key = EVENT_CATEGORY_LABEL_KEYS[category];
    return key ? t(key) : sentenceToken(category);
}

/** Phase 2 slice 1: "corps_commander" → "Corps Commander" for advisor labels. */
function eventDecisionFactionLabel(faction: string | undefined): string {
    switch (faction) {
        case 'RBiH': return t('desk.faction.rbih');
        case 'RS': return t('desk.faction.rs');
        case 'HRHB': return t('desk.faction.hrhb');
        default: return faction ? getPlayerSafePoliticalFactionName(faction) : t('desk.faction.fallback');
    }
}

const EVENT_DIMENSION_LABEL_KEYS: Partial<Record<string, MessageKey>> = {
    military_credibility: 'diplomacyOverview.dimension.military_credibility',
    territorial_legitimacy: 'diplomacyOverview.dimension.territorial_legitimacy',
    international_standing: 'diplomacyOverview.dimension.international_standing',
    patron_confidence: 'diplomacyOverview.dimension.patron_confidence',
    internal_cohesion: 'diplomacyOverview.dimension.internal_cohesion',
    negotiating_leverage: 'diplomacyOverview.dimension.negotiating_leverage',
};

function eventDecisionDimensionLabel(dimension: string | undefined): string {
    if (!dimension) return t('eventDecision.unknown');
    const key = EVENT_DIMENSION_LABEL_KEYS[dimension];
    return key ? t(key) : humanizeToken(dimension);
}

function signedDelta(delta: number): string {
    return `${delta > 0 ? '+' : ''}${delta}`;
}

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
    const faction = 'faction' in effect ? eventDecisionFactionLabel(effect.faction) : '';
    switch (effect.kind) {
        case 'narrative': return effect.text;
        case 'morale_change': return t('eventDecision.effect.moraleChange', { faction, delta: signedDelta(effect.delta) });
        case 'supply_delta': return t('eventDecision.effect.supplyDelta', { faction, delta: signedDelta(effect.delta) });
        case 'cohesion_change': return t('eventDecision.effect.cohesionChange', { faction, delta: signedDelta(effect.delta) });
        case 'humanitarian_impact': return t('eventDecision.effect.humanitarianImpact', {
            faction,
            delta: effect.war_crimes_delta ? ` (${signedDelta(effect.war_crimes_delta)})` : '',
        });
        case 'patron_pressure': return t('eventDecision.effect.patronPressure', { faction, delta: signedDelta(effect.delta) });
        case 'alliance_change': return t('eventDecision.effect.allianceChange', {
            rbih: eventDecisionFactionLabel('RBiH'),
            hrhb: eventDecisionFactionLabel('HRHB'),
            delta: signedDelta(effect.delta),
        });
        case 'negotiation_capital': return t('eventDecision.effect.negotiationCapital', {
            faction,
            dimension: eventDecisionDimensionLabel(effect.dimension),
            delta: signedDelta(effect.delta),
        });
        case 'equipment_grant': {
            const granted = [
                effect.tanks ? t('eventDecision.equipment.tanks', { count: effect.tanks }) : '',
                effect.artillery ? t('eventDecision.equipment.artillery', { count: effect.artillery }) : '',
                effect.aa_systems ? t('eventDecision.equipment.aaSystems', { count: effect.aa_systems }) : '',
            ].filter(Boolean).join(', ');
            return t('eventDecision.effect.equipmentGrant', {
                faction,
                equipment: granted || t('eventDecision.equipment.support'),
            });
        }
        case 'aggression_modifier': return t('eventDecision.effect.aggressionModifier', { faction, delta: signedDelta(effect.delta), turns: effect.duration_turns });
        case 'control_change': return t('eventDecision.effect.controlChange', {
            faction,
            count: effect.osids.length,
            areaNoun: t(effect.osids.length === 1 ? 'eventDecision.area.one' : 'eventDecision.area.many'),
        });
        case 'guerrilla_threat': return t('eventDecision.effect.guerrillaThreat', { faction, turns: effect.duration_turns });
        case 'recruitment_modifier': return t('eventDecision.effect.recruitmentModifier', { faction, percent: Math.round(effect.pool_multiplier * 100), turns: effect.duration_turns });
        case 'equipment_quality_modifier': return t('eventDecision.effect.equipmentQualityModifier', { faction, percent: Math.round(effect.multiplier * 100), turns: effect.duration_turns });
        case 'doctrine_constraint': return t('eventDecision.effect.doctrineConstraint', { faction, turns: effect.duration_turns });
        case 'offensive_ops_suppression': return t('eventDecision.effect.offensiveOpsSuppression', { faction, turns: effect.duration_turns });
        case 'alliance_lock': return t('eventDecision.effect.allianceLock', {
            mode: t(effect.mode === 'floor' ? 'eventDecision.lockMode.floor' : 'eventDecision.lockMode.ceiling'),
            value: effect.value,
            turns: effect.duration_turns,
        });
        case 'bot_priority_shift': return t('eventDecision.effect.botPriorityShift', { faction, turns: effect.duration_turns });
        case 'cost_ledger_annotation': return effect.text ?? t('eventDecision.effect.costLedgerAnnotation');
    }
    return t('eventDecision.effect.recorded');
}

function describeDimensionShift(shift: DimensionShift): string {
    return t('eventDecision.effect.dimensionShift', {
        faction: eventDecisionFactionLabel(shift.faction),
        dimension: eventDecisionDimensionLabel(shift.dimension),
        delta: signedDelta(shift.delta),
    });
}

function describeFlagValue(value: string | number | boolean, option: EventResponseOption): string {
    const valueText = String(value);
    if (valueText === option.id) return option.label;
    if (typeof value === 'number' || typeof value === 'boolean') return valueText;
    return t('eventDecision.flag.recordedChoice');
}

function buildPreviewRows(option: EventResponseOption): string[] {
    const rows = (option.effects ?? [])
        .filter(isDisplayEventEffect)
        .map(describeEffect);
    for (const shift of option.dimension_shifts ?? []) {
        rows.push(describeDimensionShift(shift));
    }
    const flagValues = Object.values(option.sets_flags ?? {});
    if (flagValues.length > 0) {
        rows.push(t('eventDecision.campaignRecordUpdated', { values: flagValues.map((value) => describeFlagValue(value, option)).join(', ') }));
    }
    return rows;
}

function EffectPreview({ option }: { option: EventResponseOption }) {
    const rows = buildPreviewRows(option);
    if (rows.length === 0) {
        return (
            <p className="mt-2 rounded border border-panel-border/70 bg-panel-bg/60 px-3 py-2 text-[11px] text-text-secondary">
                {t('eventDecision.noImmediateEffects')}
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

const PLAYER_SAFE_DOSSIER_TERMS: Array<[RegExp, string]> = [
    [/\brbih_state_identity\b/g, 'state identity posture'],
    [/\bretain_minorities\b/g, 'civic minority-protection line'],
    [/\bmandatory_purge\b/g, 'hardline expulsion line'],
    [/\bcsq_[a-z0-9_]+\b/g, 'later consequence branch'],
    [/\b[\w./-]+\.json\b/gi, 'source dossier'],
    [/\bsource_note\b/g, 'source note'],
];

function playerSafeDossierText(text: string, showDiagnostics: boolean): string {
    if (showDiagnostics) return text;
    let safe = text.replace(/`([^`]+)`/g, '$1');
    for (const [pattern, replacement] of PLAYER_SAFE_DOSSIER_TERMS) {
        safe = safe.replace(pattern, replacement);
    }
    safe = safe.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (token) => humanizeToken(token).toLowerCase());
    return safe.replace(/\s+/g, ' ').trim();
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
    const historicalDescription = `${t('eventDecision.historicalDefaultDescription')}${sourceNote ? ` ${t('eventDecision.sourceInline', { source: sourceNote.replace(/[.。]+$/u, '') })}` : ''}`;
    const chooseLabel = t('eventDecision.chooseResponseAria', { response: option.label });
    return (
        <div className="rounded border border-panel-border bg-panel-card/90 p-3">
            <button
                type="button"
                data-testid="event-decision-response"
                data-event-id={decision.event_id}
                data-response-id={option.id}
                aria-label={chooseLabel}
                title={chooseLabel}
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
                            title={historicalDescription}
                        >
                            {t('eventDecision.historicalDefault')}
                        </span>
                    )}
                    {staffRecommended && (
                        <span
                            className="rounded-sm border border-sky-400/60 bg-sky-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-sky-200"
                            title={t('eventDecision.staffRecommendationDescription')}
                        >
                            {t('eventDecision.staffRecommendation')}
                        </span>
                    )}
                </span>
            </button>
            {historical && (
                <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
                    {historicalDescription}
                </p>
            )}
            {staffRecommended && (
                <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
                    {t('eventDecision.staffRecommendationDescription')}
                </p>
            )}
            {option.description && (
                <p className="mt-2 text-[11px] text-text-secondary leading-relaxed">
                    {option.description}
                </p>
            )}
            <EffectPreview option={option} />
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
    locale,
}: {
    decision: EventDecisionDossier;
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
    state?: GameState;
    diagMode: boolean;
    locale: Locale;
}) {
    // Graceful degradation: if neither catalog nor state is available, omit
    // the entire section. The existing modal sidebar already shows the
    // source_note; the Decision Context section adds CAUSAL context only.
    if (!eventCatalog && !state) return null;
    const eventDef = eventCatalog?.get(decision.event_id);
    const family = eventDef?.family;
    const sourceTier = eventDef?.source_tier;
    const ancestors = state ? getCausalAncestors(decision.event_id, state) : [];
    const rawDossier = localizedField(eventDef?.source_note, eventDef, locale, 'source_note')
        ?? localizedField(eventDef?.historical_source, eventDef, locale, 'historical_source')
        ?? null;
    const dossierExcerpt = rawDossier ? truncateSourceDossier(playerSafeDossierText(rawDossier, diagMode)) : null;
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
                {t('eventDecision.decisionContext')}
            </div>
            {showDiagnostics && eventDef && (family || sourceTier) && (
                <div
                    className="mb-2 text-[11px] leading-relaxed text-text-secondary"
                    data-testid="decision-context-family-source"
                >
                    {t('eventDecision.familySource', {
                        family: family ?? t('eventDecision.unknown'),
                        source: sourceTier ?? t('eventDecision.unknown'),
                    })}
                </div>
            )}
            {showDiagnostics && ancestors.length > 0 && (
                <div
                    className="mb-2 text-[11px] leading-relaxed text-text-secondary"
                    data-testid="decision-context-ancestry"
                >
                    {t('eventDecision.ancestry', { values: ancestorLabels.join(', ') })}
                </div>
            )}
            {dossierExcerpt && (
                <div
                    className="text-[11px] leading-relaxed text-text-secondary"
                    data-testid="decision-context-dossier"
                >
                    {t('eventDecision.sourceDossier', { dossier: dossierExcerpt })}
                </div>
            )}
        </section>
    );
}

export function EventDecisionModal({ decision, onRespond, eventCatalog, state, advisor }: EventDecisionModalProps) {
    const [locale] = useLocale();
    const localizedDecision = resolveLocalizedDecisionDossier(decision, eventCatalog, locale);
    const factionColor = FACTION_TEXT_CLASS[localizedDecision.faction ?? ''] ?? 'text-accent-gold';
    const category = eventDecisionCategoryLabel(localizedDecision.category);
    const sourceNote = localizedDecision.source_note ?? localizedDecision.historical_source ?? localizedDecision.source ?? null;
    const hasHistoricalDefault = localizedDecision.response_options.some((option) => isHistoricalOption(option, localizedDecision));

    // Phase 2 slice 1 "Back the Officer": for operation/corps-scoped events
    // the assessment block speaks in a named officer's voice; otherwise it falls
    // back to the generic "Staff assessment". (See deriveAssessmentLabel.)
    const assessmentLabel = deriveAssessmentLabel(localizedDecision.category, advisor);
    const diagMode = useGameStore((s) => s.diagMode);
    const decisionDate = turnToDateString(localizedDecision.turn_fired);
    const safeSourceNote = sourceNote ? playerSafeDossierText(sourceNote, diagMode) : null;

    return (
        <Modal
            isOpen={true}
            dismissible={false}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="event-decision-title"
            backdropClassName="bg-black/70"
            panelClassName="bg-panel-bg border border-panel-border rounded-lg max-w-[720px] w-[92%] max-h-[88vh] overflow-y-auto shadow-xl backdrop-blur-sm"
        >
            <div
                className="p-6"
                onKeyDownCapture={(event) => {
                    const key = event.key.toLowerCase();
                    if (SHELL_HOTKEYS_BLOCKED_BY_REQUIRED_DECISION.has(key) || /^[1-9]$/.test(key)) {
                        event.stopPropagation();
                    }
                }}
            >
                {/* Category stamp */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-panel-bg bg-accent-gold px-2 py-0.5 rounded"
                          style={{ transform: 'rotate(-2deg)' }}>
                        {t('eventDecision.decisionRequired')}
                    </span>
                    <span className={`text-[10px] font-mono ${factionColor}`}>
                        {eventDecisionFactionLabel(localizedDecision.faction)} · {decisionDate}
                    </span>
                </div>

                {/* Title */}
                <h3 id="event-decision-title" className="font-sans text-lg text-text-primary font-semibold mb-3">
                    {localizedDecision.event_title}
                </h3>

                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
                    <section className="rounded border border-panel-border bg-panel-card/80 p-4">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-accent-gold">
                            {t('eventDecision.situation')}
                        </div>
                        <p className="text-[13px] leading-relaxed text-text-primary">
                            {localizedDecision.narrative || localizedDecision.situation || t('eventDecision.defaultSituation')}
                        </p>
                        {localizedDecision.staff_assessment && (
                            <div className="mt-3 rounded border border-panel-border/70 bg-panel-bg/60 px-3 py-2">
                                <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-text-muted">
                                    {assessmentLabel === 'Staff assessment' ? t('eventDecision.staffAssessment') : assessmentLabel}
                                </div>
                                <p className="text-[12px] leading-relaxed text-text-secondary">
                                    {playerSafeDossierText(localizedDecision.staff_assessment, diagMode)}
                                </p>
                            </div>
                        )}
                        {localizedDecision.trigger_evidence && localizedDecision.trigger_evidence.length > 0 && (
                            <div className="mt-3 rounded border border-panel-border/70 bg-panel-bg/60 px-3 py-2">
                                <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-text-muted">
                                    {t('eventDecision.triggerEvidence')}
                                </div>
                                <ul className="space-y-1 text-[12px] leading-relaxed text-text-secondary">
                                    {localizedDecision.trigger_evidence.map((evidence) => (
                                        <li key={evidence}>{playerSafeDossierText(evidence, diagMode)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                    <aside className="rounded border border-panel-border bg-panel-card/80 p-4 text-[11px] text-text-secondary">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-accent-gold">
                            {t('eventDecision.dossier')}
                        </div>
                        <div className="space-y-2">
                            <div>
                                <span className="block text-[9px] uppercase tracking-[0.12em] text-text-muted">{t('eventDecision.category')}</span>
                                <span className="text-text-primary">{category}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] uppercase tracking-[0.12em] text-text-muted">{t('eventDecision.factionDate')}</span>
                                <span className="text-text-primary">
                                    {eventDecisionFactionLabel(localizedDecision.faction)} / {decisionDate}
                                </span>
                            </div>
                            {safeSourceNote && (
                                <div>
                                    <span className="block text-[9px] uppercase tracking-[0.12em] text-text-muted">{t('eventDecision.sourceNote')}</span>
                                    <span className="text-text-primary">{safeSourceNote}</span>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>

                {/* Phase H Packet 3 — Decision Context (Component A) renders
                    after the dossier sidebar / source-note, before the
                    response option list. See H1 scoping §4.2A. */}
                <DecisionContextSection
                    decision={localizedDecision}
                    eventCatalog={eventCatalog}
                    state={state}
                    diagMode={diagMode}
                    locale={locale}
                />

                {!hasHistoricalDefault && (
                    <div className="mb-4 rounded border border-accent-gold/30 bg-accent-gold/10 px-4 py-3 text-[12px] leading-relaxed text-text-secondary">
                        {t('eventDecision.historicalDefaultSourceReview')}
                    </div>
                )}

                {/* Response options */}
                <div className="mb-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-gold mb-3">
                        {t('eventDecision.presidentialResponse')}
                    </div>
                    <div className="space-y-3">
                    {localizedDecision.response_options.map(option => (
                        <ResponseButton
                            key={option.id}
                            option={option}
                            decision={localizedDecision}
                            sourceNote={safeSourceNote}
                            showDiagnostics={diagMode}
                            onChoose={() => onRespond(localizedDecision.event_id, option.id)}
                        />
                    ))}
                    </div>
                </div>

                <div className="rounded border border-panel-border bg-panel-card/70 px-4 py-3 text-[11px] leading-relaxed text-text-secondary">
                    {t('eventDecision.recordTrail')}
                </div>
            </div>
        </Modal>
    );
}
