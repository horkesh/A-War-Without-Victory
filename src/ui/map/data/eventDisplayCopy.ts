/**
 * Display copy for event strings the engine persists.
 *
 * The engine copies an event's `title` into `turn_summaries[].events_fired` and the
 * notification text of a resolved response into `pending_event_notifications`. Both live in
 * the hashed save, so a correction made in place would move the save hash. Corrected copy is
 * authored in the event's `localizations` block instead (`en` for English), and the UI
 * resolves it here at display time. The persisted text stays the fallback, so saves written
 * before a correction display the corrected copy too.
 *
 * Resolution order: active locale, then `en`, then the persisted text.
 */
import type {
    EventDefinitionLocalization,
    EventNotificationText,
} from '../../../sim/events/event_types.js';
import type { FactionId } from '../../../state/game_state.js';
import war1992Events from '../../../../data/scenarios/events/war_1992.json';
import war1992HrhbSummerEvents from '../../../../data/scenarios/events/war_1992_hrhb_summer.json';
import war1993Events from '../../../../data/scenarios/events/war_1993.json';
import war1994Events from '../../../../data/scenarios/events/war_1994.json';
import war1995Events from '../../../../data/scenarios/events/war_1995.json';
import consequenceEvents from '../../../../data/scenarios/events/consequences.json';
import { getActiveLocale, type Locale } from '../i18n/index.js';

type LocalizationMap = Readonly<Record<string, EventDefinitionLocalization | undefined>>;

const LOCALIZATIONS_BY_EVENT_ID: ReadonlyMap<string, LocalizationMap> = buildLocalizationIndex([
    war1992Events,
    war1992HrhbSummerEvents,
    war1993Events,
    war1994Events,
    war1995Events,
    consequenceEvents,
]);

function buildLocalizationIndex(catalogs: ReadonlyArray<unknown>): ReadonlyMap<string, LocalizationMap> {
    const out = new Map<string, LocalizationMap>();
    for (const catalog of catalogs) {
        if (!Array.isArray(catalog)) continue;
        for (const row of catalog as Array<{ id?: unknown; localizations?: unknown }>) {
            const id = typeof row?.id === 'string' ? row.id.trim() : '';
            if (!id || out.has(id)) continue;
            if (row.localizations && typeof row.localizations === 'object') {
                out.set(id, row.localizations as LocalizationMap);
            }
        }
    }
    return out;
}

function localeChain(locale: Locale): Locale[] {
    return locale === 'en' ? ['en'] : [locale, 'en'];
}

function nonEmpty(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Display title for a fired event. `localizations` may be passed for events outside the
 * bundled war-year catalogs (for example a runtime catalog row); otherwise the bundled index
 * is used.
 */
export function resolveEventDisplayTitle(
    eventId: string,
    persistedTitle: string,
    options: { locale?: Locale; localizations?: LocalizationMap } = {},
): string {
    const localizations = options.localizations ?? LOCALIZATIONS_BY_EVENT_ID.get(eventId);
    if (!localizations) return persistedTitle;
    for (const locale of localeChain(options.locale ?? getActiveLocale())) {
        const title = nonEmpty(localizations[locale]?.title);
        if (title) return title;
    }
    return persistedTitle;
}

/**
 * Display narrative for an event. The authored `narrative` is not persisted by a bot run, so
 * English corrections are made in place; this only adds the active locale's translation.
 */
export function resolveEventDisplayNarrative(
    eventId: string,
    narrative: string,
    options: { locale?: Locale; localizations?: LocalizationMap } = {},
): string {
    const locale = options.locale ?? getActiveLocale();
    if (locale === 'en') return narrative;
    const localizations = options.localizations ?? LOCALIZATIONS_BY_EVENT_ID.get(eventId);
    return nonEmpty(localizations?.[locale]?.narrative) ?? narrative;
}

/** Display headline and body for a persisted event notification. */
export function resolveEventNotificationDisplay(
    notification: {
        event_id: string;
        response_id: string;
        target_faction: FactionId;
        headline: string;
        body: string;
    },
    options: { locale?: Locale; localizations?: LocalizationMap } = {},
): EventNotificationText {
    const localizations = options.localizations ?? LOCALIZATIONS_BY_EVENT_ID.get(notification.event_id);
    if (localizations) {
        for (const locale of localeChain(options.locale ?? getActiveLocale())) {
            const text = localizations[locale]?.notifications_to_other_factions
                ?.[notification.response_id]?.[notification.target_faction];
            const headline = nonEmpty(text?.headline);
            const body = nonEmpty(text?.body);
            if (headline && body) return { headline, body };
        }
    }
    return { headline: notification.headline, body: notification.body };
}
