import { afterEach, describe, expect, it } from 'vitest';
import { generateCoSBriefing } from '../../src/ui/map/components/army_hq/ChiefOfStaffBriefing.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { makeMockLoadedGameState } from '../../src/ui/map/__mocks__/loadedGameState.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function flatten(paragraphs: ReturnType<typeof generateCoSBriefing>): string {
    return paragraphs
        .map((segments) => segments.map((segment) => segment.type === 'link' ? segment.label : segment.value).join(''))
        .join('\n');
}

describe('Chief of Staff briefing localization', () => {
    afterEach(() => {
        setLocale('en');
    });

    it('localizes stable no-alert briefing prose in BCS mode', () => {
        setLocale('bcs');
        const state = {
            ...makeMockLoadedGameState(),
            turn: 2,
            latestTurnSummary: null,
        } as LoadedGameState;

        const text = flatten(generateCoSBriefing([], state, 'RBiH'));

        expect(text).toContain('Komandante, imam pitanja koja zahtijevaju vasu paznju.');
        expect(text).toContain('Situacija je zasad stabilna, ali moramo ostati oprezni.');
        expect(text).not.toContain('Commander,');
        expect(text).not.toContain('The situation is stable for now');
    });
});
