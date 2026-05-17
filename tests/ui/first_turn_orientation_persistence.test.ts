// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';

import { FirstTurnOrientationCard } from '../../src/ui/map/components/FirstTurnOrientationCard.js';
import type { FirstTurnOrientationView } from '../../src/ui/map/data/firstTurnOrientation.js';

function orientationView(): FirstTurnOrientationView {
    return {
        headline: 'Where to start',
        body: 'Four surfaces are open to you.',
        dismissLabel: 'Got it',
        items: [
            {
                key: 'inbox',
                label: 'Inbox',
                description: 'Decisions and signals from the front.',
                target: { kind: 'inbox-home' },
            },
        ],
    };
}

describe('FirstTurnOrientationCard persistence', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        window.localStorage.clear();
    });

    it('dismisses through caller-owned session state without writing localStorage', () => {
        const setItem = vi.spyOn(window.localStorage.__proto__, 'setItem');
        const onDismiss = vi.fn();

        render(createElement(FirstTurnOrientationCard, {
            view: orientationView(),
            onDismiss,
        }));

        fireEvent.click(screen.getByRole('button', { name: 'Got it' }));

        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(setItem).not.toHaveBeenCalled();
        expect(window.localStorage.getItem('awwv_seen_first_turn_intro')).toBeNull();
    });
});
