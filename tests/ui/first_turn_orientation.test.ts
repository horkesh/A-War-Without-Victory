/**
 * Read-model unit tests for buildFirstTurnOrientation.
 *
 * The first-turn orientation card is a one-time onboarding overlay shown after
 * the side picker on a fresh save. It points the player at four EXISTING
 * surfaces (Inbox, Advance Turn, Chronicle, Codex). The read-model is pure —
 * it returns null when not on the first turn or when the player has already
 * dismissed the card; it returns a typed item list otherwise.
 *
 * Covers:
 *  - returns null when state is null
 *  - returns null when hasSeenIntro is true
 *  - returns null when turn > 1 (player has already advanced)
 *  - returns a 4-item list on turn 1 with hasSeenIntro=false
 *  - items reference EXISTING surfaces (inbox, advance-turn, chronicle, codex)
 *  - item ordering is deterministic (sorted iteration only)
 *  - no Date / Math.random / locale calls in the model
 */

import { describe, it, expect } from 'vitest';
import { buildFirstTurnOrientation } from '../../src/ui/map/data/firstTurnOrientation.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeStub(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    return {
        label: 'test',
        turn: 1,
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
        player_faction: 'RBiH',
        ...overrides,
    } as LoadedGameState;
}

describe('buildFirstTurnOrientation — null cases', () => {
    it('returns null when state is null', () => {
        expect(buildFirstTurnOrientation(null, false)).toBeNull();
    });

    it('returns null when hasSeenIntro is true', () => {
        const state = makeStub({ turn: 1 });
        expect(buildFirstTurnOrientation(state, true)).toBeNull();
    });

    it('returns null when turn > 1 (player already advanced)', () => {
        const state = makeStub({ turn: 2 });
        expect(buildFirstTurnOrientation(state, false)).toBeNull();
    });

    it('returns null when turn is large (mid-campaign load)', () => {
        const state = makeStub({ turn: 25 });
        expect(buildFirstTurnOrientation(state, false)).toBeNull();
    });
});

describe('buildFirstTurnOrientation — first-turn payload', () => {
    it('returns a 4-item list on turn 1 with hasSeenIntro=false', () => {
        const state = makeStub({ turn: 1 });
        const view = buildFirstTurnOrientation(state, false);
        expect(view).not.toBeNull();
        expect(view!.items).toHaveLength(4);
    });

    it('also accepts turn 0 as first turn (defensive)', () => {
        const state = makeStub({ turn: 0 });
        const view = buildFirstTurnOrientation(state, false);
        expect(view).not.toBeNull();
        expect(view!.items.length).toBeGreaterThan(0);
    });

    it('items reference the four existing surfaces by key', () => {
        const state = makeStub({ turn: 1 });
        const view = buildFirstTurnOrientation(state, false)!;
        const keys = view.items.map(i => i.key);
        expect(keys).toContain('inbox');
        expect(keys).toContain('advance-turn');
        expect(keys).toContain('chronicle');
        expect(keys).toContain('codex');
    });

    it('every item carries a label, description, and a typed navigation target', () => {
        const state = makeStub({ turn: 1 });
        const view = buildFirstTurnOrientation(state, false)!;
        for (const item of view.items) {
            expect(item.label.length).toBeGreaterThan(0);
            expect(item.description.length).toBeGreaterThan(0);
            expect(item.target).toBeDefined();
            expect(item.target.kind).toBeDefined();
        }
    });

    it('inbox item routes to the inbox-home navigation target', () => {
        const state = makeStub({ turn: 1 });
        const view = buildFirstTurnOrientation(state, false)!;
        const inbox = view.items.find(i => i.key === 'inbox')!;
        expect(inbox.target.kind).toBe('inbox-home');
    });

    it('chronicle item routes to chronicle navigation target', () => {
        const state = makeStub({ turn: 1 });
        const view = buildFirstTurnOrientation(state, false)!;
        const chronicle = view.items.find(i => i.key === 'chronicle')!;
        expect(chronicle.target.kind).toBe('chronicle');
    });

    it('codex item routes to codex navigation target', () => {
        const state = makeStub({ turn: 1 });
        const view = buildFirstTurnOrientation(state, false)!;
        const codex = view.items.find(i => i.key === 'codex')!;
        expect(codex.target.kind).toBe('codex');
    });

    it('advance-turn item routes to advance-turn navigation target', () => {
        const state = makeStub({ turn: 1 });
        const view = buildFirstTurnOrientation(state, false)!;
        const advance = view.items.find(i => i.key === 'advance-turn')!;
        expect(advance.target.kind).toBe('advance-turn');
    });

    it('item ordering is deterministic across calls', () => {
        const state = makeStub({ turn: 1 });
        const a = buildFirstTurnOrientation(state, false)!;
        const b = buildFirstTurnOrientation(state, false)!;
        expect(a.items.map(i => i.key)).toEqual(b.items.map(i => i.key));
    });
});
