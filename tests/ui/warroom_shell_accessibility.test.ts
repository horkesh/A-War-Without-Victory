// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

let storeState: Record<string, any> = { loadedGameState: null };

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector: (state: any) => any) => selector(storeState),
        {
            getState: () => storeState,
            setState: (partial: any) => { Object.assign(storeState, partial); },
            subscribe: () => () => {},
        },
    ),
}));

// @ts-expect-error TS1378: top-level await is supported by vitest runtime.
const { WarroomShellLayer } = await import('../../src/ui/map/components/warroom/WarroomShellLayer');

function renderShell(onNavigate = vi.fn()) {
    return {
        onNavigate,
        ...render(createElement(WarroomShellLayer, { onNavigate })),
    };
}

describe('WarroomShellLayer accessibility proof', () => {
    beforeEach(() => {
        storeState = { loadedGameState: null };
    });

    afterEach(() => {
        cleanup();
    });

    it('exposes hotspots as keyboard-focusable buttons with stable labels', () => {
        storeState = {
            loadedGameState: {
                player_faction: 'RBiH',
                metadata: { date: 'April 1993' },
            },
        };

        renderShell();

        expect(screen.getByRole('button', { name: 'Faction Overview' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Command Briefing' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'News & Press' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Calendar' })).toBeTruthy();
    });

    it('activates mapped hotspots with Enter and Space', () => {
        storeState = {
            loadedGameState: {
                player_faction: 'RBiH',
                metadata: { date: 'April 1993' },
            },
        };

        const { onNavigate } = renderShell();

        fireEvent.keyDown(screen.getByRole('button', { name: 'Faction Overview' }), { key: 'Enter' });
        fireEvent.keyDown(screen.getByRole('button', { name: 'News & Press' }), { key: ' ' });

        expect(onNavigate).toHaveBeenNthCalledWith(1, { kind: 'army-hq', tab: 'summary' });
        expect(onNavigate).toHaveBeenNthCalledWith(2, { kind: 'chronicle' });
    });

    it('announces the unavailable state through a live status region', () => {
        renderShell();

        const status = screen.getByRole('status');
        expect(status.textContent).toContain('Warroom unavailable until a campaign side is selected.');
    });
});
