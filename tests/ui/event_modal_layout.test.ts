// @vitest-environment jsdom
/**
 * Event notice layout (owner playtest, 2026-11-14): the still and its chips on the left, the
 * narrative first and the effects below it on the right, so the narrative does not scroll at
 * common window sizes and neither column is left blank. jsdom cannot measure layout, so this
 * pins the structure and the class contract that the rendered screenshots in the PR verified.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import type { EventDisplayData } from '../../src/ui/map/components/EventModal';
import { withoutComments } from '../helpers/sourceComments';

const EVENT: EventDisplayData = {
    id: 'cessation_of_hostilities',
    title: 'Cessation of Hostilities Takes Effect',
    narrative: 'At noon on New Year\'s Day, the guns fall silent across most of Bosnia.',
    category: 'diplomatic',
    effects: [
        { kind: 'aggression_modifier', description: 'RBiH operational aggression -0.1 for 16 weeks' },
        { kind: 'aggression_modifier', description: 'HRHB operational aggression -0.1 for 16 weeks' },
    ],
    isDecision: false,
};

afterEach(() => {
    cleanup();
    vi.resetModules();
    vi.doUnmock('../../src/ui/map/data/eventIllustrationArt');
});

async function renderModal(event: EventDisplayData, withStill: boolean) {
    if (withStill) {
        vi.doMock('../../src/ui/map/data/eventIllustrationArt', () => ({
            resolveEventIllustration: () => '/assets/event_illustrations/still.webp',
            section6StillAlt: () => null,
        }));
    }
    const { EventModal } = await import('../../src/ui/map/components/EventModal');
    render(createElement(EventModal, { event, onAcknowledge: vi.fn() }));
}

describe('EventModal layout', () => {
    it('puts the still and the chips in the left column, the narrative and effects in the right', async () => {
        await renderModal(EVENT, true);

        const media = screen.getByTestId('event-modal-media-column');
        const region = screen.getByTestId('event-modal-scroll-region');

        expect(media.contains(screen.getByTestId('event-modal-illustration'))).toBe(true);
        expect(media.contains(screen.getByTestId('event-modal-metadata-row'))).toBe(true);
        expect(media.contains(screen.getByTestId('event-modal-category-stamp'))).toBe(true);
        expect(media.contains(screen.getByTestId('event-modal-narrative'))).toBe(false);
        expect(media.contains(screen.getByTestId('event-modal-effects'))).toBe(false);

        const narrative = screen.getByTestId('event-modal-narrative');
        const effects = screen.getByTestId('event-modal-effects');
        expect(region.contains(narrative)).toBe(true);
        expect(region.contains(effects)).toBe(true);
        // Narrative first, effects below it.
        expect(narrative.compareDocumentPosition(effects) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(effects.textContent).toContain('RBiH operational aggression -0.1 for 16 weeks');
    });

    it('lets the still fill the left column so there is no blank space under it', async () => {
        await renderModal(EVENT, true);
        const illustration = screen.getByTestId('event-modal-illustration');
        expect(illustration.className).toContain('flex-1');
        expect(illustration.querySelector('img')?.className).toContain('object-cover');
    });

    it('stacks chips, narrative and effects in one column when the event has no still', async () => {
        await renderModal(EVENT, false);

        expect(screen.queryByTestId('event-modal-media-column')).toBeNull();
        const region = screen.getByTestId('event-modal-scroll-region');
        expect(region.contains(screen.getByTestId('event-modal-metadata-row'))).toBe(true);
        expect(region.contains(screen.getByTestId('event-modal-narrative'))).toBe(true);
        expect(region.contains(screen.getByTestId('event-modal-effects'))).toBe(true);
    });

    it('omits the assessment box for an event with no player-facing effects', async () => {
        await renderModal({ ...EVENT, effects: [] }, true);
        expect(screen.queryByTestId('event-modal-effects')).toBeNull();
        expect(screen.getByTestId('event-modal-narrative')).toBeTruthy();
    });

    it('keeps the Acknowledged action and the Close button', async () => {
        await renderModal(EVENT, true);
        expect(screen.getByTestId('event-notice-acknowledge').textContent).toBe('Acknowledged');
        expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    });
});

describe('Warroom status strip placement', () => {
    const source = withoutComments(readFileSync('src/ui/map/components/warroom/WarroomStatusBar.tsx', 'utf8'));

    it('is centred horizontally on the desk, not pinned to the right edge', () => {
        const strip = source.match(/data-tutorial-step="warroom-status-bar"\s+className="([^"]+)"/);
        expect(strip).not.toBeNull();
        const classes = strip![1].split(/\s+/);
        expect(classes).toContain('left-1/2');
        expect(classes).toContain('-translate-x-1/2');
        // w-max keeps the strip on one row until it hits max-w; without it an absolutely
        // positioned element at left:50% could only be half the plate wide.
        expect(classes).toContain('w-max');
        expect(classes).not.toContain('right-[2%]');
        expect(classes).not.toContain('right-0');
    });

    it('opens the priority docket centred above the strip', () => {
        expect(source).toMatch(/absolute bottom-full left-1\/2 mb-2[^"]*-translate-x-1\/2/);
        expect(source).not.toMatch(/absolute bottom-full right-0/);
    });
});
