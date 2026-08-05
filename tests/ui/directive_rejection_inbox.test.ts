// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { deriveInboxItems } from '../../src/ui/map/data/inboxItems.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { PresidentialInbox } from '../../src/ui/map/components/PresidentialInbox.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { setLocale } from '../../src/ui/map/i18n';

// R4 Phase 6 Task 6.2 — the directive-rejection Desk card. Proves the receipt rides the
// existing record-band situation rail end to end WITHOUT a live Electron window: the pure
// deriveInboxItems mapping AND the real jsdom render of PresidentialInbox.

function makeLoadedState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    return {
        label: 'RS turn 12',
        turn: 12,
        phase: 'war',
        formations: [],
        militiaPools: [],
        controlBySettlement: {},
        statusBySettlement: {},
        brigadeAorByFormationId: {},
        attackOrders: [],
        aorOrders: [],
        recentControlEvents: [],
        allControlEvents: [],
        displacementEventLog: [],
        battlesByOsid: {},
        movementsByOsid: {},
        supplyTransitionsByOsid: {},
        historicalEventsByTurn: [],
        pressureWarning: false,
        latestTurnSummary: null,
        turnSummaries: [],
        player_faction: 'RS',
        ...overrides,
    } as LoadedGameState;
}

const receipt = {
    id: 'directive-rejection:vrs_1st_krajina:12',
    corpsId: 'vrs_1st_krajina',
    targetOsid: 'op:tuzla:tuzla_2',
    reason: 'objective_unreachable',
    turn: 12,
};

describe('directive-rejection Desk card (Task 6.2)', () => {
    afterEach(() => cleanup());

    it('deriveInboxItems maps a rejection to a record-band situation item', () => {
        setLocale('en');
        const items = deriveInboxItems(makeLoadedState({ directiveOutcomeReceipts: [receipt] }), null);
        const item = items.find((i) => i.id === 'sit:directive-rejection:vrs_1st_krajina:12');
        expect(item).toBeDefined();
        expect(item!.type).toBe('situation'); // keeps hasPresidentialLever false → record band
        expect(item!.priorityBand).toBe('record');
        // Player-safe subtitle carries the reason prose, never the raw code.
        expect(item!.subtitle).toContain('cannot be carried out');
        expect(item!.subtitle).not.toContain('objective_unreachable');
    });

    it('no receipts → no directive-rejection card (defensive)', () => {
        setLocale('en');
        const items = deriveInboxItems(makeLoadedState({ directiveOutcomeReceipts: [] }), null);
        expect(items.some((i) => i.id.startsWith('sit:directive-rejection:'))).toBe(false);
    });

    it('renders the card in the President\'s Desk (real jsdom render, no Electron)', () => {
        setLocale('en');
        useGameStore.setState({
            loadedGameState: makeLoadedState({ directiveOutcomeReceipts: [receipt] }),
            openingBriefDismissed: true,
            osidDisplayNames: null,
        });
        render(createElement(PresidentialInbox, { onAction: vi.fn() }));
        // The CO's rejection text is on the Desk.
        expect(screen.getByText(/cannot be carried out/i)).toBeTruthy();
    });
});
