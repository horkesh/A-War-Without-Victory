// @vitest-environment jsdom
/**
 * Codex #763 r4598165970: the English decision modal must show a card's `localizations.en` display copy.
 *
 * `localizations.en` is the corrected English display text for strings the engine persists (event_types.ts).
 * The modal's resolver used to return nothing for English, so an English player kept reading the old
 * persisted or catalog wording on every card whose copy a panel had corrected (the two Washington cards,
 * the 1993 HVO-ARBiH titles, the Ahmići title). The fallback chain is the same as for any other locale:
 * the override, then the catalog's current text, then the persisted copy. A persisted `title` stays as it
 * is unless `localizations.en.title` corrects it (the comment above `catalogText`).
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EventDecisionModal } from '../../src/ui/map/components/EventDecisionModal.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { displayEventProse } from '../../src/ui/map/data/eventDisplayCopy.js';
import { restoreBosnianProperNames } from '../../src/ui/shared/bosnianPlaceNames.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import consequences from '../../data/scenarios/events/consequences.json';
import war1992 from '../../data/scenarios/events/war_1992.json';
import war1993 from '../../data/scenarios/events/war_1993.json';
import war1994 from '../../data/scenarios/events/war_1994.json';
import war1995 from '../../data/scenarios/events/war_1995.json';

afterEach(() => {
    cleanup();
    setLocale('en');
});

const CATALOG = [consequences, war1992, war1993, war1994, war1995]
    .flatMap((file) => file as unknown as EventDefinition[]);

function eventById(id: string): EventDefinition {
    const event = CATALOG.find((entry) => entry.id === id);
    if (!event) throw new Error(`${id} not in the catalog`);
    return event;
}

/** Renders the card as the app does: the persisted decision is the catalog text at fire time. */
function renderCard(event: EventDefinition, faction: string): string {
    render(React.createElement(EventDecisionModal, {
        decision: {
            event_id: event.id,
            event_title: event.title ?? event.id,
            narrative: event.narrative,
            situation: event.situation,
            category: event.category,
            historical_source: event.historical_source,
            source_note: event.source_note,
            source: event.source,
            staff_assessment: event.staff_assessment,
            trigger_evidence: event.trigger_evidence,
            turn_fired: event.trigger?.turn_min ?? 1,
            faction: faction as never,
            requires_player_response: true,
            historical_default_response_id: event.historical_default_response_id,
            staff_recommended_response_id: event.staff_recommended_response_id,
            response_options: event.response_options ?? [],
        },
        onRespond: () => undefined,
        eventCatalog: new Map([[event.id, event]]),
    }));
    return document.body.textContent ?? '';
}

describe('English decision modal: localizations.en display copy (Codex #763)', () => {
    it.each([
        ['rbih_washington_agreement_1994', 'RBiH'],
        ['hrhb_washington_agreement_1994', 'HRHB'],
    ])('%s shows the corrected English title, narrative, staff assessment, evidence and options', (id, faction) => {
        setLocale('en');
        const event = eventById(id);
        const en = event.localizations!.en!;
        const text = renderCard(event, faction);

        expect(screen.getByRole('dialog', { name: restoreBosnianProperNames(en.title!) })).toBeTruthy();
        expect(text).toContain(displayEventProse(en.narrative!));
        expect(text).toContain(displayEventProse(en.staff_assessment!));
        for (const line of en.trigger_evidence ?? []) expect(text).toContain(displayEventProse(line));
        for (const [optionId, option] of Object.entries(en.response_options ?? {})) {
            expect(text, `${id} ${optionId} label`).toContain(displayEventProse(option.label!));
            expect(text, `${id} ${optionId} description`).toContain(displayEventProse(option.description!));
        }
        // The old wording the copy panel corrected is gone from the rendered card.
        expect(text).not.toContain(displayEventProse(event.staff_assessment!));
        for (const option of event.response_options ?? []) expect(text).not.toContain(displayEventProse(option.description!));
    });

    it('every card whose localizations.en corrects its title shows that title in English', () => {
        setLocale('en');
        const corrected = CATALOG.filter((event) => {
            const title = event.localizations?.en?.title;
            return typeof title === 'string' && title.trim().length > 0;
        });
        expect(corrected.length).toBeGreaterThan(0);
        for (const event of corrected) {
            renderCard(event, 'RBiH');
            expect(screen.getByRole('dialog', { name: restoreBosnianProperNames(event.localizations!.en!.title!) }), event.id).toBeTruthy();
            cleanup();
        }
    });

    it('a card with no English override keeps the persisted title and the catalog text', () => {
        setLocale('en');
        const plain = CATALOG.find((event) => !event.localizations?.en && event.title && event.narrative && (event.response_options?.length ?? 0) > 0)!;
        const text = renderCard(plain, 'RBiH');
        expect(screen.getByRole('dialog', { name: restoreBosnianProperNames(plain.title!) })).toBeTruthy();
        expect(text).toContain(displayEventProse(plain.narrative!));
    });
});
