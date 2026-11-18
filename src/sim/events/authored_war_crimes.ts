/**
 * §6 E3b (ruling 2026-11-17, signed 6/6): the ONE place that counts war-crime INCIDENTS.
 *
 * Two lenses, both counted in incidents (one firing of a card, one chosen response, one
 * recorded war crime), never in `war_crimes_delta` units:
 *
 * - **Authored** (`authoredWarCrimeIncidents`): what a side authorized in play. It is
 *   `war_crimes_events_emergent` (sole writer `recordWarCrime`: paramilitary sweeps and the first
 *   wave of a minority-expulsion policy) + every firing of a scripted card marked
 *   `authored_by_choice: true` + every chosen response option that carries a `war_crimes_delta`
 *   (option-level deltas are authored by default). Every reader that judges a side's own conduct
 *   uses it: the atrocity cost term and all three A+ anchors (`scoring.ts`), the Codex
 *   clean-hands ghosts (`dynamic_section_builder.ts`), and the standing ceiling of E3c.
 * - **Recorded** (`recordedWarCrimeIncidents`): what the historical record of this campaign
 *   holds. Every firing of a scripted war-crimes card (authored or not) + every chosen response
 *   option that carries a `war_crimes_delta` (read from `event_decision_log`).
 *
 * The shared `war_crimes_events` counter sums deltas from both sources and is not an incident
 * count; no verdict surface reads it any more.
 *
 * A card's incident belongs to the side its `war_crimes_delta` is booked to (the effect's
 * `faction`). The card classification lives in the catalog (`authored_by_choice`), enforced at
 * load by `validateWarCrimeAuthorship` (event_loader.ts).
 *
 * No new counter, no schema change: everything is read from fields the save already carries.
 * Pure and deterministic; the catalog index is built once in loader order (turn_min, then id).
 */
import type { EventDefinition, EventEffect } from './event_types.js';
import war1992Events from '../../../data/scenarios/events/war_1992.json';
import war1992HrhbSummerEvents from '../../../data/scenarios/events/war_1992_hrhb_summer.json';
import war1993Events from '../../../data/scenarios/events/war_1993.json';
import war1994Events from '../../../data/scenarios/events/war_1994.json';
import war1995Events from '../../../data/scenarios/events/war_1995.json';
import consequenceEvents from '../../../data/scenarios/events/consequences.json';

/** The narrow state a war-crime incident count reads. A full `GameState` satisfies it. */
export interface WarCrimeIncidentStateView {
    military?: {
        event_fire_counts?: Readonly<Record<string, number | undefined>>;
        event_decision_log?: ReadonlyArray<{ event_id: string; response_id: string }>;
        negotiation?: {
            capital?: Readonly<Partial<Record<string, { war_crimes_events_emergent?: number } | undefined>>>;
        };
    };
}

/** A scripted card that books a war-crimes delta when it fires. */
export interface WarCrimeCard {
    event_id: string;
    /** English display title (the persisted `title`, or `localizations.en.title` when set). */
    title: string;
    /** Sides the card books an incident to (every effect with `war_crimes_delta > 0`), sorted. */
    factions: readonly string[];
    /** The catalog classification; `undefined` when the row is not choice-dependent. */
    authored_by_choice: boolean | undefined;
}

/** A response option that books a war-crimes delta when chosen (authored by default). */
export interface WarCrimeOption {
    event_id: string;
    response_id: string;
    title: string;
    factions: readonly string[];
}

export interface WarCrimeCardIndex {
    /** Scripted cards in loader order (turn_min ascending, then id). */
    cards: readonly WarCrimeCard[];
    /** Response options keyed `event_id#response_id`. */
    options: ReadonlyMap<string, WarCrimeOption>;
}

/** One term of a side's authored count, with the state path it is read from. */
export interface AuthoredWarCrimeTerm {
    source: 'recorded_war_crime' | 'authored_card' | 'response_option';
    /** `state.`-rooted path of the field the count is read from. */
    owner_path: string;
    event_id?: string;
    response_id?: string;
    count: number;
}

export interface RecordedWarCrimeIncident {
    event_id: string;
    /** Set for an option-level incident. */
    response_id?: string;
    title: string;
    count: number;
}

function strictCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function effectList(value: unknown): EventEffect[] {
    if (Array.isArray(value)) return value as EventEffect[];
    return value && typeof value === 'object' ? [value as EventEffect] : [];
}

/** Sides an effect list books a positive `war_crimes_delta` to, sorted and unique. */
export function warCrimeFactionsOf(...effectSources: unknown[]): string[] {
    const factions = new Set<string>();
    for (const source of effectSources) {
        for (const effect of effectList(source)) {
            const delta = (effect as { war_crimes_delta?: unknown }).war_crimes_delta;
            const faction = (effect as { faction?: unknown }).faction;
            if (typeof delta === 'number' && delta > 0 && typeof faction === 'string') factions.add(faction);
        }
    }
    return [...factions].sort(strictCompare);
}

function englishTitle(row: EventDefinition): string {
    const en = row.localizations?.en?.title;
    if (typeof en === 'string' && en.trim().length > 0) return en.trim();
    return typeof row.title === 'string' && row.title.trim().length > 0 ? row.title.trim() : row.id;
}

/** Build the war-crimes card index from a catalog. Pure; the order is the loader's. */
export function buildWarCrimeCardIndex(rows: readonly EventDefinition[]): WarCrimeCardIndex {
    const sorted = [...rows].sort((a, b) => {
        const aMin = a.trigger?.turn_min ?? Number.MAX_SAFE_INTEGER;
        const bMin = b.trigger?.turn_min ?? Number.MAX_SAFE_INTEGER;
        return aMin !== bMin ? aMin - bMin : strictCompare(a.id, b.id);
    });
    const cards: WarCrimeCard[] = [];
    const options = new Map<string, WarCrimeOption>();
    for (const row of sorted) {
        const factions = warCrimeFactionsOf(row.effect, row.effects);
        if (factions.length > 0) {
            cards.push({
                event_id: row.id,
                title: englishTitle(row),
                factions,
                authored_by_choice: typeof row.authored_by_choice === 'boolean' ? row.authored_by_choice : undefined,
            });
        }
        for (const option of row.response_options ?? []) {
            const optionFactions = warCrimeFactionsOf(
                (option as { effect?: unknown }).effect,
                option.effects,
            );
            if (optionFactions.length === 0) continue;
            options.set(`${row.id}#${option.id}`, {
                event_id: row.id,
                response_id: option.id,
                title: englishTitle(row),
                factions: optionFactions,
            });
        }
    }
    return { cards, options };
}

/** The shipped catalog, bundled the same way as the Verdict's decision reckoning. */
const SHIPPED_CATALOGS: readonly unknown[] = [
    war1992Events, war1992HrhbSummerEvents, war1993Events, war1994Events, war1995Events, consequenceEvents,
];
export const SHIPPED_WAR_CRIME_CARDS: WarCrimeCardIndex = buildWarCrimeCardIndex(
    SHIPPED_CATALOGS.flatMap((catalog) => (Array.isArray(catalog) ? (catalog as EventDefinition[]) : [])),
);

function fireCount(state: WarCrimeIncidentStateView, eventId: string): number {
    const raw = state.military?.event_fire_counts?.[eventId];
    return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 0;
}

/** Chosen responses that carry a war-crimes delta booked to `faction`, grouped by (event, response). */
function optionIncidents(
    state: WarCrimeIncidentStateView,
    faction: string,
    index: WarCrimeCardIndex,
): Array<{ option: WarCrimeOption; count: number }> {
    const counts = new Map<string, number>();
    for (const entry of state.military?.event_decision_log ?? []) {
        const key = `${entry.event_id}#${entry.response_id}`;
        const option = index.options.get(key);
        if (!option || !option.factions.includes(faction)) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
        .sort(([a], [b]) => strictCompare(a, b))
        .map(([key, count]) => ({ option: index.options.get(key)!, count }));
}

/**
 * The terms of a side's authored count, each with its state path. Terms for authored cards are
 * listed even at zero (they are what a "no authored incident" claim rests on); the recorded war
 * crime term is always first.
 */
export function authoredWarCrimeIncidentTerms(
    state: WarCrimeIncidentStateView,
    faction: string,
    index: WarCrimeCardIndex = SHIPPED_WAR_CRIME_CARDS,
): AuthoredWarCrimeTerm[] {
    const emergent = state.military?.negotiation?.capital?.[faction]?.war_crimes_events_emergent;
    const terms: AuthoredWarCrimeTerm[] = [{
        source: 'recorded_war_crime',
        owner_path: `state.military.negotiation.capital.${faction}.war_crimes_events_emergent`,
        count: typeof emergent === 'number' && Number.isFinite(emergent) && emergent > 0 ? Math.trunc(emergent) : 0,
    }];
    for (const card of index.cards) {
        if (card.authored_by_choice !== true || !card.factions.includes(faction)) continue;
        terms.push({
            source: 'authored_card',
            owner_path: `state.military.event_fire_counts.${card.event_id}`,
            event_id: card.event_id,
            count: fireCount(state, card.event_id),
        });
    }
    for (const { option, count } of optionIncidents(state, faction, index)) {
        terms.push({
            source: 'response_option',
            owner_path: 'state.military.event_decision_log',
            event_id: option.event_id,
            response_id: option.response_id,
            count,
        });
    }
    return terms;
}

/** War-crime incidents `faction` authorized in play (see the module note). */
export function authoredWarCrimeIncidents(
    state: WarCrimeIncidentStateView,
    faction: string,
    index: WarCrimeCardIndex = SHIPPED_WAR_CRIME_CARDS,
): number {
    return authoredWarCrimeIncidentTerms(state, faction, index).reduce((sum, term) => sum + term.count, 0);
}

/**
 * The incidents the historical record of this campaign holds against `faction`: every firing of
 * a scripted war-crimes card, then every chosen response option with a war-crimes delta.
 * Card order is the loader's (turn_min, then id); option incidents follow, by (event, response).
 */
export function recordedWarCrimeIncidentList(
    state: WarCrimeIncidentStateView,
    faction: string,
    index: WarCrimeCardIndex = SHIPPED_WAR_CRIME_CARDS,
): RecordedWarCrimeIncident[] {
    const out: RecordedWarCrimeIncident[] = [];
    for (const card of index.cards) {
        if (!card.factions.includes(faction)) continue;
        const count = fireCount(state, card.event_id);
        if (count > 0) out.push({ event_id: card.event_id, title: card.title, count });
    }
    for (const { option, count } of optionIncidents(state, faction, index)) {
        out.push({ event_id: option.event_id, response_id: option.response_id, title: option.title, count });
    }
    return out;
}

/** Number of incidents in the historical record of this campaign for `faction`. */
export function recordedWarCrimeIncidents(
    state: WarCrimeIncidentStateView,
    faction: string,
    index: WarCrimeCardIndex = SHIPPED_WAR_CRIME_CARDS,
): number {
    return recordedWarCrimeIncidentList(state, faction, index).reduce((sum, incident) => sum + incident.count, 0);
}
