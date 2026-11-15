/**
 * Verdict decision reckoning (R8 council fix 1): the player's decisions whose stated effects
 * most raised and most lowered the standing (Pyrrhic) score, read from the decision receipts.
 *
 * Measure (game-designer ruling, 2026-11-14): leave-one-out on the final dimension store.
 * A decision's points are score(final) minus score(final without that decision's own-side
 * dimension shifts). Effective values are clamped to 0-100, so a shift on a saturated
 * dimension moves nothing, and negotiating leverage is re-derived from the three dimensions
 * it averages. Event modifiers are additive, so the result does not depend on order. It
 * measures the decision's stated effect only, not the war it set off, and never compares with
 * the options not taken (that would be a false counterfactual and a perfect-run guide).
 *
 * Excluded, never ranked as a good or a bad call (Sensitive History Design Gate §3/§6:
 * atrocity is a consequence, not a lever): humanitarian events, Ring-3 sensitive families or
 * ids, camp-exposure events, the eastern safe areas, the siege of Sarajevo, paramilitary
 * policy, any event that books humanitarian harm, enclave displacement or a war-crimes delta
 * (event level or option level), any event whose text in any locale touches atrocity, safe
 * areas, enclaves, sieges, camps or expulsion, and two boundary events (RS strategic goals,
 * whose first goal is the separation of peoples; the RBiH officer-corps purge options).
 * Events that offered a single option are not decisions.
 *
 * Pure and deterministic: receipts group by (event, response); ties break by first turn, then
 * event id, then response id.
 */
import { DIMENSION_WEIGHTS } from '../../../sim/events/strategic_dimensions.js';
import { isCampExposureFamily, isRing3SensitiveFamily } from '../../../sim/events/event_families.js';
import type { EventDefinition, EventDefinitionLocalization, EventResponseOption } from '../../../sim/events/event_types.js';
import { strictCompare } from '../../../state/validateGameState.js';
import war1992Events from '../../../../data/scenarios/events/war_1992.json';
import war1992HrhbSummerEvents from '../../../../data/scenarios/events/war_1992_hrhb_summer.json';
import war1993Events from '../../../../data/scenarios/events/war_1993.json';
import war1994Events from '../../../../data/scenarios/events/war_1994.json';
import war1995Events from '../../../../data/scenarios/events/war_1995.json';
import consequenceEvents from '../../../../data/scenarios/events/consequences.json';
import { getActiveLocale, type Locale } from '../i18n/index.js';

/** One entry of `military.event_decision_log`. */
export interface DecisionReceipt {
    event_id: string;
    response_id: string;
    decision_source: string;
    faction: string | null;
    turn: number;
}

/** A faction's final dimension values (`military.negotiation.strategic_dimensions[faction]`). */
export type FactionDimensionStore = Readonly<Record<string, { base_value: number; event_modifier: number; effective_value: number }>>;

export interface RankedDecision {
    eventId: string;
    responseId: string;
    /** Turn of the first time this response was chosen. */
    turn: number;
    /** How many times this response was chosen (recurring events). */
    count: number;
    title: string;
    responseLabel: string;
    /** Standing-score points the decision's stated effect moved (leave-one-out, one decimal). */
    points: number;
}

export interface DecisionReckoning {
    /** Up to three decisions whose stated effects most raised the score, largest first. */
    best: RankedDecision[];
    /** Up to three decisions whose stated effects most lowered it, most negative first. */
    worst: RankedDecision[];
    /** Player decisions read from the receipts for this side. */
    decisions: number;
    /** Of those, decisions left out because they touch sensitive history. */
    excluded: number;
}

/** How many decisions each list shows. */
export const DECISION_LIST_SIZE = 3;

/**
 * Events never ranked, by id: the game-designer boundary cases (RS strategic goals, whose
 * first goal is the separation of peoples; the RBiH officer-corps purge options), the camps,
 * and the siege of Sarajevo (heavy-weapons ultimatum and compliance; §4 panel: the ICTY found
 * the siege a campaign of terror, Galić IT-98-29-A, so siege artillery is never a "good call").
 */
const EXCLUDED_EVENT_IDS: ReadonlySet<string> = new Set([
    'rs_strategic_goals',
    'rbih_minority_retention_1992',
    'concentration_camps_revealed_1992',
    'nato_ultimatum_sarajevo_1994',
    'rbih_nato_ultimatum_compliance_1994',
    'deliberate_force_rs_compliance_1995',
    // Parity with the excluded RBiH and RS front visits (§4 panel, red-team R2): "Visit the
    // Mostar front" falls during the historical East Mostar siege (ICTY Prlić).
    'visit_to_front_hrhb',
]);

/** The eastern safe areas (Srebrenica, Žepa, Goražde) and the safe-area regime, by id fragment. */
const SAFE_AREA_ID_FRAGMENTS: readonly string[] = ['srebrenica', 'zepa', 'gorazde', 'safe_area'];

/** Effects that book harm to civilians or a war crime. */
const HARM_EFFECT_KINDS: ReadonlySet<string> = new Set(['humanitarian_impact', 'enclave_formation_displacement']);

type EffectLike = { kind?: string; war_crimes_delta?: number };

function effectBooksHarm(effect: unknown): boolean {
    const candidate = effect as EffectLike | null;
    if (!candidate || typeof candidate !== 'object') return false;
    return HARM_EFFECT_KINDS.has(candidate.kind ?? '') || typeof candidate.war_crimes_delta === 'number';
}

/**
 * True when the event books harm anywhere: at event level (`effect` / `effects`, where the
 * catalogs put every humanitarian impact today) or in any option (game-design seat, §4 panel).
 */
function eventBooksHarm(definition: EventDefinition): boolean {
    const row = definition as EventDefinition & { effect?: unknown; effects?: unknown };
    const eventEffects = [
        ...(Array.isArray(row.effects) ? row.effects : []),
        ...(row.effect !== undefined ? [row.effect] : []),
    ];
    if (eventEffects.some(effectBooksHarm)) return true;
    return (definition.response_options ?? []).some(option => (option.effects ?? []).some(effectBooksHarm));
}

/** Dimensions the negotiating-leverage base averages (strategic_dimensions.ts). */
const LEVERAGE_INPUTS: readonly string[] = ['military_credibility', 'territorial_legitimacy', 'patron_confidence'];

type CatalogRow = Partial<EventDefinition> & { id?: unknown };

function buildCatalog(catalogs: ReadonlyArray<unknown>): ReadonlyMap<string, EventDefinition> {
    const out = new Map<string, EventDefinition>();
    for (const catalog of catalogs) {
        if (!Array.isArray(catalog)) continue;
        for (const row of catalog as CatalogRow[]) {
            const id = typeof row?.id === 'string' ? row.id : '';
            if (!id || out.has(id)) continue;
            out.set(id, row as EventDefinition);
        }
    }
    return out;
}

let bundledCatalog: ReadonlyMap<string, EventDefinition> | null = null;

/** The bundled war-year and consequence catalogs, indexed by event id (first row wins). */
export function bundledEventCatalog(): ReadonlyMap<string, EventDefinition> {
    bundledCatalog ??= buildCatalog([
        war1992Events,
        war1992HrhbSummerEvents,
        war1993Events,
        war1994Events,
        war1995Events,
        consequenceEvents,
    ]);
    return bundledCatalog;
}

/**
 * Words that mark an event as touching atrocity, the safe areas, enclaves, sieges, camps or
 * expulsion, in English or BCS (§4 panel, red-team B2, 2026-11-14). Matched against the
 * event's title, narrative and every option's label and description in every locale, so a
 * diplomatic or command event about Srebrenica or the Sarajevo siege lines is never ranked.
 */
const SENSITIVE_TEXT = /srebreni|žep[aeu]|\bzep[aeu]\b|gora[žz]d|safe area|enclave|enklav|siege|besieg|opsad|exclusion zone|hwez|markale|massac|masakr|genocid|cleansing|čišćenj|\bcamps?\b|logor|detention|expuls|protjer|deport/i;

function eventTexts(definition: EventDefinition): string[] {
    const texts: string[] = [definition.title ?? '', definition.narrative ?? ''];
    for (const option of definition.response_options ?? []) texts.push(option.label ?? '', option.description ?? '');
    for (const localization of Object.values(definition.localizations ?? {})) {
        if (!localization) continue;
        texts.push(localization.title ?? '', localization.narrative ?? '');
        for (const option of Object.values(localization.response_options ?? {})) {
            texts.push(option?.label ?? '', option?.description ?? '');
        }
    }
    return texts;
}

/** True when a decision on this event must never be ranked as a good or bad call. */
export function isSensitiveDecisionEvent(definition: EventDefinition): boolean {
    const id = definition.id;
    const family = definition.family ?? '';
    if (definition.category === 'humanitarian') return true;
    if (eventTexts(definition).some(text => SENSITIVE_TEXT.test(text))) return true;
    if (EXCLUDED_EVENT_IDS.has(id)) return true;
    if (isRing3SensitiveFamily(family) || isRing3SensitiveFamily(id)) return true;
    if (isCampExposureFamily(family) || id.startsWith('hvo_detention_camps_')) return true;
    if (id.includes('paramilitary') || family.includes('paramilitary')) return true;
    if (SAFE_AREA_ID_FRAGMENTS.some(fragment => id.includes(fragment) || family.includes(fragment))) return true;
    return eventBooksHarm(definition);
}

function clamp100(value: number): number {
    return Math.max(0, Math.min(100, value));
}

/**
 * Standing score of a faction's dimension store with the given modifier adjustments removed:
 * effective = clamp(base + modifier - removed), leverage re-derived from its three inputs.
 */
function scoreWithout(store: FactionDimensionStore, weights: Readonly<Record<string, number>>, removed: Readonly<Record<string, number>>): number {
    const effective: Record<string, number> = {};
    for (const dimension of Object.keys(weights)) {
        if (dimension === 'negotiating_leverage') continue;
        const value = store[dimension];
        effective[dimension] = value
            ? clamp100(value.base_value + value.event_modifier - (removed[dimension] ?? 0))
            : 50;
    }
    const leverage = store.negotiating_leverage;
    if (leverage) {
        const base = clamp100(LEVERAGE_INPUTS.reduce((sum, d) => sum + (effective[d] ?? 50), 0) / LEVERAGE_INPUTS.length);
        effective.negotiating_leverage = clamp100(base + leverage.event_modifier - (removed.negotiating_leverage ?? 0));
    } else {
        effective.negotiating_leverage = 50;
    }
    let score = 0;
    for (const [dimension, weight] of Object.entries(weights)) score += (effective[dimension] ?? 50) * weight;
    return score;
}

function ownShifts(option: EventResponseOption, faction: string, times: number): Record<string, number> {
    const removed: Record<string, number> = {};
    for (const shift of option.dimension_shifts ?? []) {
        if (shift.faction !== faction) continue;
        removed[shift.dimension] = (removed[shift.dimension] ?? 0) + shift.delta * times;
    }
    return removed;
}

function localizedText(
    localizations: Readonly<Record<string, EventDefinitionLocalization | undefined>> | undefined,
    locale: Locale,
    pick: (localization: EventDefinitionLocalization) => string | undefined,
): string | undefined {
    for (const candidate of locale === 'en' ? ['en'] : [locale, 'en']) {
        const localization = localizations?.[candidate];
        const value = localization ? pick(localization) : undefined;
        if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    }
    return undefined;
}

function tieBreak(a: RankedDecision, b: RankedDecision): number {
    if (a.turn !== b.turn) return a.turn - b.turn;
    const byEvent = strictCompare(a.eventId, b.eventId);
    return byEvent !== 0 ? byEvent : strictCompare(a.responseId, b.responseId);
}

/**
 * Rank the player's decisions for `faction` by the standing-score points their chosen
 * option's stated effect moved. Decisions whose event or option is not in the catalog, that
 * offered one option, or that moved nothing are not listed. Without a dimension store there
 * is nothing to measure against, and both lists are empty.
 */
export function buildDecisionReckoning(
    receipts: readonly DecisionReceipt[] | undefined,
    faction: string,
    store: FactionDimensionStore | undefined,
    catalog: ReadonlyMap<string, EventDefinition> = bundledEventCatalog(),
    locale: Locale = getActiveLocale(),
): DecisionReckoning {
    const weights = DIMENSION_WEIGHTS[faction];
    const groups = new Map<string, { receipt: DecisionReceipt; definition: EventDefinition; option: EventResponseOption; count: number }>();
    let decisions = 0;
    let excluded = 0;
    for (const receipt of receipts ?? []) {
        if (receipt.decision_source !== 'player' || receipt.faction !== faction) continue;
        decisions++;
        const definition = catalog.get(receipt.event_id);
        if (!definition) continue;
        if (isSensitiveDecisionEvent(definition)) {
            excluded++;
            continue;
        }
        if ((definition.response_options ?? []).length < 2) continue;
        const option = (definition.response_options ?? []).find(candidate => candidate.id === receipt.response_id);
        if (!option) continue;
        const key = `${receipt.event_id}\u0000${receipt.response_id}`;
        const group = groups.get(key);
        if (group) {
            group.count++;
            if (receipt.turn < group.receipt.turn) group.receipt = receipt;
        } else {
            groups.set(key, { receipt, definition, option, count: 1 });
        }
    }

    const ranked: RankedDecision[] = [];
    if (weights && store) {
        const finalScore = scoreWithout(store, weights, {});
        for (const { receipt, definition, option, count } of groups.values()) {
            const points = Math.round((finalScore - scoreWithout(store, weights, ownShifts(option, faction, count))) * 10) / 10;
            if (points === 0) continue;
            ranked.push({
                eventId: receipt.event_id,
                responseId: receipt.response_id,
                turn: receipt.turn,
                count,
                title: localizedText(definition.localizations, locale, l => l.title) ?? definition.title ?? receipt.event_id,
                responseLabel: localizedText(definition.localizations, locale, l => l.response_options?.[option.id]?.label)
                    ?? option.label,
                points,
            });
        }
    }
    return {
        best: ranked.filter(d => d.points > 0).sort((a, b) => b.points - a.points || tieBreak(a, b)).slice(0, DECISION_LIST_SIZE),
        worst: ranked.filter(d => d.points < 0).sort((a, b) => a.points - b.points || tieBreak(a, b)).slice(0, DECISION_LIST_SIZE),
        decisions,
        excluded,
    };
}
