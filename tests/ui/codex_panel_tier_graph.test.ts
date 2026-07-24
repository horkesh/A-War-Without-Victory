// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';

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

// Inject a small synthetic essay set so the panel test is independent of the
// shipped essay_index.json content (tiers there are owner-tunable data).
vi.mock('../../data/scenarios/essays/essay_index.json', () => ({
    default: {
        essays: [
            {
                id: 'essay_fixed_1995', event_id: 'ev_fixed', title: 'Fixed Scaffold Essay',
                year: 1995, category: 'diplomatic', tier: 0, content: 'Body.',
            },
            {
                id: 'essay_shapeable_1995', event_id: 'ev_shapeable', title: 'Shapeable War Essay',
                year: 1995, category: 'military', tier: 2, content: 'Body.',
            },
            {
                id: 'essay_gated_1995', event_id: 'ev_gated', title: 'Gated Downstream Essay',
                year: 1995, category: 'political', tier: 3, content: 'Body.',
                requires_events: ['ev_not_fired'],
            },
            {
                id: 'essay_hidden_1995', event_id: 'ev_hidden', title: 'Unfired Tier Three Title',
                year: 1995, category: 'political', tier: 3, content: 'Body.',
            },
        ],
    },
}));

// @ts-expect-error TS1378: top-level await is supported by vitest runtime.
const { CodexPanel } = await import('../../src/ui/map/components/CodexPanel');

function renderPanel() {
    return render(createElement(CodexPanel, { isOpen: true, onClose: () => {} }));
}

function firedEvent(id: string) {
    return { id, turn: 100, title: id, narrative: '', category: 'diplomatic', effects: [], isDecision: false };
}

describe('CodexPanel tier + dependency-graph (A1a/A1b)', () => {
    beforeEach(() => { storeState = { loadedGameState: null }; setLocale('en'); });
    afterEach(() => { cleanup(); setLocale('en'); });

    it('groups Tier 0-2 essays from scenario start under localized tier headers', () => {
        storeState = {
            loadedGameState: {
                turn: 100,
                firedEvents: [],
                gameOver: false,
            },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1995'));

        expect(screen.getByText('Fixed Scaffold Essay')).toBeTruthy();
        expect(screen.getByText('Shapeable War Essay')).toBeTruthy();
        expect(screen.getAllByText('Fixed History').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Shaped by Your War').length).toBeGreaterThan(0);
    });

    it('surfaces a graph-gated essay as a non-clickable "unlocks after" hint row', () => {
        storeState = {
            loadedGameState: {
                turn: 100,
                // gated essay's own event fired, but its required upstream did not
                firedEvents: [firedEvent('ev_gated')],
                gameOver: false,
            },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1995'));

        expect(screen.getByText('Locked campaign entry')).toBeTruthy();
        expect(screen.getByText('Campaign entry appears after another campaign event')).toBeTruthy();
        expect(screen.queryByText('Gated Downstream Essay')).toBeNull();

        // The hint row is rendered as a disabled button (locked-hint state).
        const hintRow = screen.getByText('Locked campaign entry').closest('button');
        expect(hintRow).toBeTruthy();
        expect((hintRow as HTMLButtonElement).disabled).toBe(true);
    });

    it('hides an unfired Tier 3 entry and does not leak its title', () => {
        storeState = {
            loadedGameState: { turn: 0, firedEvents: [], gameOver: false },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1995'));
        expect(screen.queryByText('Unfired Tier Three Title')).toBeNull();
    });

    it('localizes tier headers in BCS', () => {
        setLocale('bcs');
        storeState = {
            loadedGameState: {
                turn: 100,
                firedEvents: [],
                gameOver: false,
            },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1995'));
        expect(screen.getAllByText('Nepromjenjiva historija').length).toBeGreaterThan(0);
        expect(screen.queryByText('Fixed History')).toBeNull();
    });

    it('localizes locked Tier 3 chrome as a campaign entry in BCS', () => {
        setLocale('bcs');
        storeState = {
            loadedGameState: {
                turn: 100,
                firedEvents: [firedEvent('ev_gated')],
                gameOver: false,
            },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1995'));
        expect(screen.getByText('Zaključan zapis kampanje')).toBeTruthy();
        expect(screen.getByText('Zapis kampanje pojavljuje se nakon drugog događaja kampanje')).toBeTruthy();
        expect(screen.queryByText('Gated Downstream Essay')).toBeNull();
    });
});
