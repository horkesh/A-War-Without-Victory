/**
 * Display text for the narrative lines under an acknowledgement card.
 *
 * An event's `effects[]` (or, when it has no `effects[]`, its single `effect`) can carry a
 * `{ kind: 'narrative', text }` line: one English sentence the card shows beneath the event's
 * narrative. Those sentences are authored in the event catalogs, which are shared with the
 * engine and hash-pinned, so a Bosnian rendering cannot be written in place. It is kept in
 * `eventEffectBcs.ts`, pinned to the exact English it translates:
 *
 *   key  = `<event id>#<ordinal>`  (ordinal counts the narrative lines the card shows, from 0)
 *   en   = the English line as authored in the catalog
 *   bcs  = the Bosnian/Croatian/Serbian line
 *
 * A line reaches the screen in the active locale only when its pinned English still matches the
 * catalog. If the catalog line is reworded, the pin stops matching, the card shows the English
 * until the Bosnian is re-reviewed, and `tests/ui/event_effect_text_localised.test.ts` fails, so
 * a stale translation never goes out under a new sentence.
 *
 * A narrative `effect` that sits beside a non-empty `effects[]` is not shown (see
 * `eventDefinitionDisplayEffects`) and has no key here.
 */
import { getActiveLocale, type Locale } from '../i18n/index.js';
import { displayEventProse } from './eventDisplayCopy.js';
import { EVENT_EFFECT_BCS } from './eventEffectBcs.js';

export interface EventEffectLike {
    readonly kind: string;
}

/** Catalog key of the `ordinal`-th narrative line shown for an event. */
export function narrativeEffectKey(eventId: string, ordinal: number): string {
    return `${eventId}#${ordinal}`;
}

/** How many narrative lines precede `index` in the list the card shows (0 for the first). */
export function narrativeEffectOrdinal(effects: ReadonlyArray<EventEffectLike>, index: number): number {
    let ordinal = 0;
    for (let i = 0; i < index && i < effects.length; i++) {
        if (effects[i].kind === 'narrative') ordinal += 1;
    }
    return ordinal;
}

/** True when the Bosnian line for this key exists and translates exactly `englishText`. */
export function hasPinnedNarrativeEffectText(eventId: string, ordinal: number, englishText: string): boolean {
    const entry = EVENT_EFFECT_BCS[narrativeEffectKey(eventId, ordinal)];
    return entry !== undefined && entry.en === englishText;
}

export function resolveNarrativeEffectText(
    eventId: string,
    ordinal: number,
    englishText: string,
    locale: Locale = getActiveLocale(),
): string {
    if (locale !== 'en' && hasPinnedNarrativeEffectText(eventId, ordinal, englishText)) {
        return displayEventProse(EVENT_EFFECT_BCS[narrativeEffectKey(eventId, ordinal)].bcs);
    }
    return displayEventProse(englishText);
}
