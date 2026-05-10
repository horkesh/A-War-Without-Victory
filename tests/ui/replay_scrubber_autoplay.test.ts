// @vitest-environment jsdom

import { createElement } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReplayScrubber } from '../../src/ui/map/components/replay/ReplayScrubber';
import type { ReplaySaveManifest } from '../../src/sim/replay/replay_manifest';

function makeManifest(): ReplaySaveManifest {
    return {
        schema_version: 1,
        frame_count: 3,
        frames: [
            {
                turn: 1,
                date: '1992-04-06',
                activeFormations: 10,
                totalCasualties: 100,
                totalDisplaced: 1_000,
                controlByFaction: [{ faction: 'RBiH', osids: 12 }],
            },
            {
                turn: 2,
                date: '1992-04-13',
                activeFormations: 11,
                totalCasualties: 200,
                totalDisplaced: 2_000,
                controlByFaction: [{ faction: 'RS', osids: 14 }],
            },
            {
                turn: 3,
                date: '1992-04-20',
                activeFormations: 12,
                totalCasualties: 300,
                totalDisplaced: 3_000,
                controlByFaction: [{ faction: 'HRHB', osids: 16 }],
            },
        ],
    };
}

function renderScrubber(): void {
    render(createElement(ReplayScrubber, { saveManifest: makeManifest() }));
}

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('ReplayScrubber autoplay controls', () => {
    it('renders read-only playback controls for sparse replay manifests', () => {
        renderScrubber();

        const surface = screen.getByTestId('replay-scrubber');
        expect(surface.getAttribute('data-awwv-replay-playback-status')).toBe('paused');
        expect(screen.getByRole('button', { name: 'Play replay playback' }).getAttribute('data-awwv-replay-play-toggle')).toBe('true');
        expect(screen.getByRole('button', { name: 'Previous replay turn' }).getAttribute('data-awwv-replay-step')).toBe('prev');
        expect(screen.getByRole('button', { name: 'Next replay turn' }).getAttribute('data-awwv-replay-step')).toBe('next');
        expect(screen.getByText('1 / 3')).toBeTruthy();
    });

    it('advances sparse manifest frames on play and pauses on the final frame', () => {
        vi.useFakeTimers();
        renderScrubber();

        fireEvent.click(screen.getByRole('button', { name: 'Play replay playback' }));
        expect(screen.getByTestId('replay-scrubber').getAttribute('data-awwv-replay-playback-status')).toBe('playing');

        act(() => {
            vi.advanceTimersByTime(700);
        });
        expect(screen.getByText('2 / 3')).toBeTruthy();
        expect(screen.getByText('200')).toBeTruthy();

        act(() => {
            vi.advanceTimersByTime(700);
        });
        expect(screen.getByText('3 / 3')).toBeTruthy();
        expect(screen.getByText('300')).toBeTruthy();
        expect(screen.getByTestId('replay-scrubber').getAttribute('data-awwv-replay-playback-status')).toBe('paused');
    });

    it('pauses playback when the player steps or scrubs manually', () => {
        vi.useFakeTimers();
        renderScrubber();

        fireEvent.click(screen.getByRole('button', { name: 'Play replay playback' }));
        fireEvent.click(screen.getByRole('button', { name: 'Next replay turn' }));

        expect(screen.getByText('2 / 3')).toBeTruthy();
        expect(screen.getByTestId('replay-scrubber').getAttribute('data-awwv-replay-playback-status')).toBe('paused');

        fireEvent.click(screen.getByRole('button', { name: 'Play replay playback' }));
        fireEvent.change(screen.getByLabelText('Replay turn scrubber'), { target: { value: '2' } });

        expect(screen.getByText('3 / 3')).toBeTruthy();
        expect(screen.getByTestId('replay-scrubber').getAttribute('data-awwv-replay-playback-status')).toBe('paused');
    });
});
