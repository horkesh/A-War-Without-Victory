// @vitest-environment jsdom

import React, { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChronicleRibbonScrubber } from '../../src/ui/map/components/chronicle/ChronicleSpine.js';
import { getChronicleChromeTurnRange, getNarratedChronicleTurnSummaries } from '../../src/ui/map/components/chronicle/ChronicleOverlay.js';
import { turnToDateString } from '../../src/ui/map/utils/formatters.js';

describe('ChronicleRibbonScrubber', () => {
    afterEach(() => {
        cleanup();
    });

    it('uses date-only aria labels and titles for scrubber ticks', () => {
        render(createElement(ChronicleRibbonScrubber, {
            turnSummaries: [
                { turn: 11, territory_snapshot: { RBiH: 0.6, RS: 0.3, HRHB: 0.1 } },
                { turn: 12, territory_snapshot: { RBiH: 0.5, RS: 0.4, HRHB: 0.1 } },
            ],
            minTurn: 11,
            maxTurn: 12,
            viewportFraction: 0.5,
            viewportOffset: 0,
            onClickTurn: vi.fn(),
        }));

        const turn12Date = turnToDateString(12);
        const tick = screen.getByRole('button', { name: `Jump to ${turn12Date}` });

        expect(tick.getAttribute('aria-label')).toBe(`Jump to ${turn12Date}`);
        expect(tick.getAttribute('title')).toBe(turn12Date);
        expect(tick.getAttribute('aria-label')).not.toContain('Week 12');
        expect(tick.getAttribute('title')).not.toContain('Week 12');
    });
});

describe('Chronicle timeline chrome turn range', () => {
    it('ignores setup/non-narrated summaries when deriving narrated timeline summaries', () => {
        const summaries = [
            { turn: 0, territory_snapshot: { RBiH: 0.5 }, mechanism: 'setup_control' },
            { turn: 1, territory_snapshot: { RBiH: 0.52 }, summary_kind: 'scenario_start' },
            { turn: 5, territory_snapshot: { RBiH: 0.55 } },
        ];

        expect(getNarratedChronicleTurnSummaries(summaries).map((summary) => summary.turn)).toEqual([5]);
    });

    it('falls back to generated Chronicle entry turns when every turn summary is setup provenance', () => {
        const range = getChronicleChromeTurnRange({
            turnSummaries: [
                { turn: 0, territory_snapshot: { RBiH: 0.5 }, mechanism: 'setup_control' },
                { turn: 1, territory_snapshot: { RBiH: 0.52 }, source: 'setup' },
            ],
            entries: [
                { turn: 8 },
                { turn: 3 },
            ],
        });

        expect(range).toEqual({ minTurn: 3, maxTurn: 8 });
    });
});
