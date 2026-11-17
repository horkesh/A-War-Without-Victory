import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { buildAcknowledgementEffects } from '../../src/ui/map/App';
import { eventDefinitionDisplayEffects } from '../../src/ui/map/data/DataLoader';
import { EVENT_EFFECT_BCS } from '../../src/ui/map/data/eventEffectBcs';
import {
    narrativeEffectKey,
    narrativeEffectOrdinal,
    resolveNarrativeEffectText,
} from '../../src/ui/map/data/eventEffectText';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { isDisplayEventEffect } from '../../src/ui/map/utils/eventEffectDisplay';
import type { EventEffect } from '../../src/sim/events/event_types';

const CATALOG_FILES = [
    'war_1992.json',
    'war_1992_hrhb_summer.json',
    'war_1993.json',
    'war_1994.json',
    'war_1995.json',
    'consequences.json',
] as const;

interface CatalogRow {
    id?: unknown;
    requires_player_response?: unknown;
    effect?: unknown;
    effects?: unknown;
    localizations?: { bcs?: { title?: unknown; narrative?: unknown } };
}

function loadCatalog(): CatalogRow[] {
    const rows: CatalogRow[] = [];
    for (const file of CATALOG_FILES) {
        const parsed: unknown = JSON.parse(readFileSync(`data/scenarios/events/${file}`, 'utf8'));
        if (Array.isArray(parsed)) rows.push(...(parsed as CatalogRow[]));
    }
    return rows.filter((row) => typeof row.id === 'string');
}

/** The narrative lines the acknowledgement card shows, by pinned key, exactly as the card builds them. */
function shownNarrativeLines(): Map<string, string> {
    const lines = new Map<string, string>();
    for (const row of loadCatalog()) {
        // A decision that waits for the player is answered in the decision modal, which shows no narrative line.
        if (row.requires_player_response === true) continue;
        const shown = eventDefinitionDisplayEffects(row);
        shown.forEach((effect, index) => {
            if (effect.kind !== 'narrative' || typeof effect.text !== 'string') return;
            lines.set(narrativeEffectKey(String(row.id), narrativeEffectOrdinal(shown, index)), effect.text);
        });
    }
    return lines;
}

afterEach(() => {
    setLocale('en', undefined);
});

describe('narrative effect lines on the acknowledgement card', () => {
    it('has a Bosnian line for every narrative line a card can show, and for nothing else', () => {
        const shown = shownNarrativeLines();
        expect([...shown.keys()].sort()).toEqual(Object.keys(EVENT_EFFECT_BCS).sort());
    });

    it('pins each Bosnian line to the exact English it translates', () => {
        const shown = shownNarrativeLines();
        for (const [key, englishText] of shown) {
            const entry = EVENT_EFFECT_BCS[key];
            expect(entry, key).toBeDefined();
            expect(entry.en, key).toBe(englishText);
            expect(entry.bcs.trim().length, key).toBeGreaterThan(0);
            expect(entry.bcs, key).not.toBe(entry.en);
        }
    });

    it('shows one narrative line per card, so every key ends in #0', () => {
        for (const key of shownNarrativeLines().keys()) expect(key.endsWith('#0'), key).toBe(true);
    });

    it('never shows a singular narrative effect that sits beside an effects list', () => {
        // A singular narrative `effect` that merely repeats a line of the `effects` list is shown
        // through that list; only one that says something the list does not is hidden.
        const rows = loadCatalog().filter((row) => {
            if (!Array.isArray(row.effects)) return false;
            const singular = row.effect as { kind?: unknown; text?: unknown } | undefined;
            return singular?.kind === 'narrative'
                && !(row.effects as Array<{ text?: unknown }>).some((listed) => listed.text === singular.text);
        });
        expect(rows.length).toBeGreaterThan(100);
        for (const row of rows) {
            const hidden = (row.effect as { text?: unknown }).text;
            const shownTexts = eventDefinitionDisplayEffects(row).map((effect) => effect.text);
            expect(shownTexts.includes(hidden as string), String(row.id)).toBe(false);
            const pinned = Object.keys(EVENT_EFFECT_BCS).some(
                (key) => key.startsWith(`${String(row.id)}#`) && EVENT_EFFECT_BCS[key].en === hidden,
            );
            expect(pinned, String(row.id)).toBe(false);
        }
    });

    it('keeps narrative lines of decisions off the decision modal, so they need no Bosnian key', () => {
        // The decision modal lists an option's effects through `isDisplayEventEffect`; the card for
        // an answered decision shows only the recorded response. Neither path can print a narrative line.
        const decisions = loadCatalog().filter((row) => row.requires_player_response === true);
        const narrativeOnDecisions = decisions.flatMap((row) => [
            ...eventDefinitionDisplayEffects(row),
            ...(((row as { response_options?: Array<{ effects?: unknown[] }> }).response_options ?? []).flatMap(
                (option) => (option.effects ?? []) as EventEffect[],
            )),
        ]).filter((effect) => effect.kind === 'narrative');
        expect(narrativeOnDecisions.length).toBeGreaterThan(0);
        for (const effect of narrativeOnDecisions) expect(isDisplayEventEffect(effect as EventEffect)).toBe(false);
        const decisionIds = new Set(decisions.map((row) => String(row.id)));
        const keyed = Object.keys(EVENT_EFFECT_BCS).filter((key) => decisionIds.has(key.slice(0, key.lastIndexOf('#'))));
        expect(keyed).toEqual([]);
    });

    it('builds the card lines in Bosnian from the shipped catalog, and in English by default', () => {
        const byEvent = new Map<string, Array<{ kind: string; text?: string }>>();
        for (const row of loadCatalog()) {
            if (row.requires_player_response === true) continue;
            const shown = eventDefinitionDisplayEffects(row);
            if (shown.some((effect) => effect.kind === 'narrative')) byEvent.set(String(row.id), shown);
        }
        expect(byEvent.size).toBe(Object.keys(EVENT_EFFECT_BCS).length);

        for (const [id, shown] of byEvent) {
            setLocale('en', undefined);
            const english = buildAcknowledgementEffects(id, shown).find((line) => line.kind === 'narrative');
            const entry = EVENT_EFFECT_BCS[narrativeEffectKey(id, 0)];
            expect(english?.description, id).toBe(entry.en);

            setLocale('bcs', undefined);
            const bosnian = buildAcknowledgementEffects(id, shown).find((line) => line.kind === 'narrative');
            expect(bosnian?.description, id).toBe(entry.bcs);
            expect(bosnian?.description, id).not.toBe(english?.description);
        }
    });

    it('falls back to the English line when the catalog sentence no longer matches its pin', () => {
        const [key, entry] = Object.entries(EVENT_EFFECT_BCS)[0];
        const eventId = key.slice(0, key.lastIndexOf('#'));
        expect(resolveNarrativeEffectText(eventId, 0, `${entry.en} Reworded.`, 'bcs')).toBe(`${entry.en} Reworded.`);
        expect(resolveNarrativeEffectText(eventId, 0, entry.en, 'bcs')).toBe(entry.bcs);
        expect(resolveNarrativeEffectText('no_such_event', 0, 'Some line.', 'bcs')).toBe('Some line.');
    });
});

describe('Bosnian title and narrative gap (the 1.0 scope record)', () => {
    it('lists exactly the catalog events whose Bosnian title or narrative is not authored yet', () => {
        const fixture = JSON.parse(readFileSync('tests/ui/fixtures/event_bcs_copy_gap.json', 'utf8')) as { events: string[] };
        const gap = loadCatalog()
            .filter((row) => {
                const bcs = row.localizations?.bcs;
                const hasTitle = typeof bcs?.title === 'string' && bcs.title.trim().length > 0;
                const hasNarrative = typeof bcs?.narrative === 'string' && bcs.narrative.trim().length > 0;
                return !hasTitle || !hasNarrative;
            })
            .map((row) => String(row.id))
            .sort();
        // Translating an event removes it from the fixture; a new event must either ship its
        // Bosnian title and narrative or be added to the fixture on purpose.
        expect(gap).toEqual([...fixture.events].sort());
    });
});
