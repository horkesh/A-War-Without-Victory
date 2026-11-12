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
import { getPlayerSafePoliticalFactionName, getPlayerSafeOfficerName, getPlayerSafeDecisionTitle } from '../utils/playerSafeText';
import { useGameStore } from '../store/gameStore';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { DecisionModalImageHeader } from './DecisionModalImageHeader';
import { resolveEventIllustration, section6StillAlt } from '../data/eventIllustrationArt';
import { getDecisionHeaderForEventCategory } from '../data/presidentialDeskAssets';
import { isDisplayEventEffect } from '../utils/eventEffectDisplay';
import { turnToDateString } from '../utils/formatters';
import { t, useLocale, type Locale, type MessageKey } from '../i18n';
import {
    SurfaceColumns,
    SurfaceContent,
    SurfaceDetail,
    SurfaceDetailFooter,
    SurfaceFacts,
    SurfaceSections,
    SurfaceStat,
    SURFACE_CHIP,
    SURFACE_LABEL,
    SURFACE_LABEL_MUTED,
    SURFACE_MODAL_BACKDROP,
    SURFACE_MODAL_PANEL_FULL,
    SURFACE_SECONDARY_BUTTON,
    SURFACE_TONE,
} from './surface/Surface';

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
    const localizedTitle = localizedField(decision.event_title, def, locale, 'title');
    return {
        ...decision,
        event_title: getPlayerSafeDecisionTitle(localizedTitle ?? def?.title ?? decision.event_title),
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
    errorMessage?: string | null;
    onDismissError?: () => void;
    /**
     * PAUSE BEFORE COMBAT (owner decision 2026-11-05): set while the current turn is paused
     * right after its events, before movement and combat. The modal then says so and offers
     * "Continue turn" — the player may continue without answering (the decision stays
     * pending and takes effect only from next week).
     */
    turnPause?: { onContinue: () => void };
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
            <p className="m-0 text-[15px] leading-relaxed text-[#9c917b]">
                {t('eventDecision.noImmediateEffects')}
            </p>
        );
    }
    return (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[15px] leading-relaxed text-[#ddd1b3]">
            {rows.map((row, i) => (
                <li key={i} className="grid grid-cols-[0.875rem_minmax(0,1fr)] gap-2">
                    <span aria-hidden="true" className="text-[#c9a75c]">•</span>
                    <span>{row}</span>
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
    // Surface redesign (2026-11-10): each response is a matter card — the choice itself
    // is the big button; why it is marked, what it says and what follows read below it.
    return (
        <div className="flex flex-col gap-3 rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4">
            <button
                type="button"
                data-testid="event-decision-response"
                aria-label={chooseLabel}
                title={chooseLabel}
                onClick={onChoose}
                className="w-full rounded-md border border-[#c9a75c]/60 bg-[#232936] px-5 py-3.5 text-left
                           text-[18px] font-semibold leading-snug text-[#f6ecd2]
                           transition hover:border-[#c9a75c] hover:bg-[#2b3241]"
            >
                <span className="flex flex-wrap items-center gap-2.5">
                    <span>{option.label}</span>
                    {historical && (
                        <span
                            className={`${SURFACE_CHIP} border-accent-gold/60 text-accent-gold`}
                            title={historicalDescription}
                        >
                            {t('eventDecision.historicalDefault')}
                        </span>
                    )}
                    {staffRecommended && (
                        <span
                            className={`${SURFACE_CHIP} ${SURFACE_TONE.info}`}
                            title={t('eventDecision.staffRecommendationDescription')}
                        >
                            {t('eventDecision.staffRecommendation')}
                        </span>
                    )}
                </span>
            </button>
            {historical && (
                <p className="m-0 text-[15px] leading-relaxed text-[#c2b69c]">
                    {historicalDescription}
                </p>
            )}
            {staffRecommended && (
                <p className="m-0 text-[15px] leading-relaxed text-[#c2b69c]">
                    {t('eventDecision.staffRecommendationDescription')}
                </p>
            )}
            {option.description && (
                <p className="m-0 text-[16px] leading-relaxed text-[#ddd1b3]">
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
            className="flex flex-col gap-2"
            data-testid="decision-context-section"
        >
            <div className={SURFACE_LABEL}>
                {t('eventDecision.decisionContext')}
            </div>
            {showDiagnostics && eventDef && (family || sourceTier) && (
                <div
                    className="text-[15px] leading-relaxed text-[#c2b69c]"
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
                    className="text-[15px] leading-relaxed text-[#c2b69c]"
                    data-testid="decision-context-ancestry"
                >
                    {t('eventDecision.ancestry', { values: ancestorLabels.join(', ') })}
                </div>
            )}
            {dossierExcerpt && (
                <div
                    className="text-[16px] leading-relaxed text-[#ddd1b3]"
                    data-testid="decision-context-dossier"
                >
                    {t('eventDecision.sourceDossier', { dossier: dossierExcerpt })}
                </div>
            )}
        </section>
    );
}

export function EventDecisionModal({ decision, onRespond, eventCatalog, state, advisor, errorMessage, onDismissError, turnPause }: EventDecisionModalProps) {
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
    // Art: the event's own documentary still when it authors one, otherwise the
    // decision plate for its category. Presentation only; the dossier is unchanged.
    const authoredImage = eventCatalog?.get(decision.event_id)?.image;
    const headerArt = resolveEventIllustration(authoredImage)
        ?? getDecisionHeaderForEventCategory(localizedDecision.category);
    // A §6 still is record, not decoration: it carries its factual alt and the eyebrow drops
    // the faction colour for the neutral accent, so no faction brands the atrocity (D8 panel).
    const section6Alt = section6StillAlt(authoredImage);

    // Surface redesign (owner, 2026-11-10): one surface in the Command Surface's style —
    // the event's still and title on top; the situation, the staff's view and the record
    // on the left; the president's possible responses on the right, each a full-size
    // choice with what it says and what follows. A paused turn's "Continue turn" sits in
    // a footer that never scrolls away.
    return (
        <Modal
            isOpen={true}
            dismissible={false}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="event-decision-title"
            backdropClassName={SURFACE_MODAL_BACKDROP}
            panelClassName={SURFACE_MODAL_PANEL_FULL}
        >
            <div
                className="flex min-h-0 flex-1 flex-col"
                onKeyDownCapture={(event) => {
                    const key = event.key.toLowerCase();
                    if (SHELL_HOTKEYS_BLOCKED_BY_REQUIRED_DECISION.has(key) || /^[1-9]$/.test(key)) {
                        event.stopPropagation();
                    }
                }}
            >
                <DecisionModalImageHeader
                    imageUrl={headerArt}
                    imageAlt={section6Alt ?? ''}
                    imageTestId="event-decision-header-art"
                    eyebrow={`${t('eventDecision.decisionRequired')} · ${eventDecisionFactionLabel(localizedDecision.faction)} · ${decisionDate}`}
                    title={localizedDecision.event_title}
                    titleId="event-decision-title"
                    accentClassName={section6Alt ? 'text-accent-gold' : factionColor}
                />
                <SurfaceColumns layout="content-wide-detail">
                    <SurfaceContent>
                        <SurfaceSections>
                            <section className="flex flex-col gap-3">
                                <div className={SURFACE_LABEL}>
                                    {t('eventDecision.situation')}
                                </div>
                                <p className="m-0 text-[18px] leading-relaxed text-[#ddd1b3]">
                                    {localizedDecision.narrative || localizedDecision.situation || t('eventDecision.defaultSituation')}
                                </p>
                                {localizedDecision.staff_assessment && (
                                    <div className="flex flex-col gap-1.5 rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4">
                                        <div className={SURFACE_LABEL_MUTED}>
                                            {assessmentLabel === 'Staff assessment' ? t('eventDecision.staffAssessment') : assessmentLabel}
                                        </div>
                                        <p className="m-0 text-[17px] leading-relaxed text-[#ddd1b3]">
                                            {playerSafeDossierText(localizedDecision.staff_assessment, diagMode)}
                                        </p>
                                    </div>
                                )}
                                {localizedDecision.trigger_evidence && localizedDecision.trigger_evidence.length > 0 && (
                                    <SurfaceFacts
                                        label={t('eventDecision.triggerEvidence')}
                                        facts={localizedDecision.trigger_evidence.map((evidence) => playerSafeDossierText(evidence, diagMode))}
                                    />
                                )}
                            </section>

                            {/* Phase H Packet 3 — Decision Context (Component A). See H1 scoping §4.2A. */}
                            <DecisionContextSection
                                decision={localizedDecision}
                                eventCatalog={eventCatalog}
                                state={state}
                                diagMode={diagMode}
                                locale={locale}
                            />

                            <section className="flex flex-col">
                                <div className={`pb-1 ${SURFACE_LABEL}`}>
                                    {t('eventDecision.dossier')}
                                </div>
                                <SurfaceStat label={t('eventDecision.category')} value={category} />
                                <SurfaceStat
                                    label={t('eventDecision.factionDate')}
                                    value={`${eventDecisionFactionLabel(localizedDecision.faction)} / ${decisionDate}`}
                                />
                                {safeSourceNote && (
                                    <div className="flex flex-col gap-1 py-2">
                                        <span className="text-[16px] text-[#b9ad94]">{t('eventDecision.sourceNote')}</span>
                                        <span className="text-[16px] leading-relaxed text-[#ddd1b3]">{safeSourceNote}</span>
                                    </div>
                                )}
                            </section>

                            {!hasHistoricalDefault && (
                                <div className="rounded-md border border-accent-gold/30 bg-accent-gold/10 px-5 py-4 text-[16px] leading-relaxed text-[#ddd1b3]">
                                    {t('eventDecision.historicalDefaultSourceReview')}
                                </div>
                            )}

                            <p className="m-0 text-[15px] leading-relaxed text-[#9c917b]">
                                {t('eventDecision.recordTrail')}
                            </p>
                        </SurfaceSections>
                    </SurfaceContent>

                    <SurfaceDetail aria-label={t('eventDecision.presidentialResponse')}>
                        {errorMessage && (
                            <div className="flex shrink-0 flex-col gap-3 border-b border-red-500/45 bg-red-500/10 px-7 py-4">
                                <div role="alert" className="text-[16px] leading-relaxed text-red-100">
                                    {errorMessage}
                                </div>
                                {onDismissError && (
                                    <button
                                        type="button"
                                        className={`self-start ${SURFACE_SECONDARY_BUTTON}`}
                                        onClick={onDismissError}
                                    >
                                        {t('eventDecision.returnToMap')}
                                    </button>
                                )}
                            </div>
                        )}
                        {/* Response options are first-class controls: the whole right column. */}
                        <div
                            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-7 py-6"
                            data-testid="event-decision-response-rail"
                            data-event-id={localizedDecision.event_id}
                        >
                            <div className={SURFACE_LABEL}>
                                {t('eventDecision.presidentialResponse')}
                            </div>
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
                        {turnPause && (
                            <SurfaceDetailFooter>
                                <div
                                    className="flex flex-col gap-1"
                                    data-testid="event-decision-turn-paused"
                                    role="status"
                                >
                                    <div className={SURFACE_LABEL}>
                                        {t('eventDecision.turnPaused.title')}
                                    </div>
                                    <p className="m-0 text-[15px] leading-relaxed text-[#c2b69c]">
                                        {t('eventDecision.turnPaused.body')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={turnPause.onContinue}
                                    data-testid="event-decision-continue-turn"
                                    className={SURFACE_SECONDARY_BUTTON}
                                >
                                    {t('eventDecision.turnPaused.continue')}
                                </button>
                            </SurfaceDetailFooter>
                        )}
                    </SurfaceDetail>
                </SurfaceColumns>
            </div>
        </Modal>
    );
}
