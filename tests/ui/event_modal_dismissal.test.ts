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

        fireEvent.click(screen.getByRole('button', { name: 'Acknowledged' }));
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
});
