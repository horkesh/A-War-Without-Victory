// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EventModal, type EventDisplayData } from '../../src/ui/map/components/EventModal';

const EVENT: EventDisplayData = {
    id: 'test_event',
    title: 'Dispatch From Sarajevo',
    narrative: 'A field report has reached the presidency.',
    category: 'political',
    effects: [
        { kind: 'morale_change', description: 'RBiH morale +1' },
    ],
    isDecision: false,
};

describe('EventModal dismissal contract', () => {
    it('uses one acknowledge path for the button, Escape, and backdrop dismissal', () => {
        const onAcknowledge = vi.fn();
        const { unmount } = render(createElement(EventModal, { event: EVENT, onAcknowledge }));

        const acknowledge = screen.getByTestId('event-notice-acknowledge');
        expect(acknowledge.textContent).toBe('Acknowledged');
        expect(acknowledge.getAttribute('data-event-id')).toBe(EVENT.id);
        fireEvent.click(acknowledge);
        expect(onAcknowledge).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onAcknowledge).toHaveBeenCalledTimes(2);

        fireEvent.click(screen.getByTestId('event-modal-backdrop'));
        expect(onAcknowledge).toHaveBeenCalledTimes(3);
        unmount();
    });

    it('renders as a labelled modal dialog', () => {
        const { unmount } = render(createElement(EventModal, { event: EVENT, onAcknowledge: vi.fn() }));

        const dialog = screen.getByRole('dialog', { name: 'Dispatch From Sarajevo' });
        expect(dialog).toBeTruthy();
        unmount();
    });

    it('keeps the acknowledge action outside the narrative scroll region', () => {
        const longEvent: EventDisplayData = {
            ...EVENT,
            narrative: 'A long field report. '.repeat(200),
        };
        const { unmount } = render(createElement(EventModal, { event: longEvent, onAcknowledge: vi.fn() }));

        const scrollRegion = screen.getByTestId('event-modal-scroll-region');
        const actionBar = screen.getByTestId('event-modal-action-bar');
        const acknowledge = screen.getByTestId('event-notice-acknowledge');

        expect(scrollRegion.contains(acknowledge)).toBe(false);
        expect(actionBar.contains(acknowledge)).toBe(true);
        unmount();
    });
});
