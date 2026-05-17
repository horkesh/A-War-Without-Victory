import { describe, expect, it } from 'vitest';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { deriveInboxItems } from '../../src/ui/map/data/inboxItems.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeLoadedState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    return {
        label: 'rs turn 1',
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
        player_faction: 'RS',
        ...overrides,
    } as LoadedGameState;
}

function makeRawState(overrides: Record<string, unknown> = {}): any {
    return {
        meta: { turn: 1, phase: 'war', player_faction: 'RS', ...((overrides.meta as object) ?? {}) },
        military: {
            formations: {},
            named_officer_data: [],
            named_officers: {},
            brigade_movement_state: {},
            ...((overrides.military as object) ?? {}),
        },
        political: {
            controllers: {},
        },
        factions: [],
        ...overrides,
    };
}

describe('paramilitary Presidential Inbox items', () => {
    it('maps root pending paramilitary requests for only the player faction', () => {
        const loaded = parseGameState(makeRawState({
            pending_paramilitary_requests: [
                { faction: 'RS', strength: 150, target_osid: 'op:bijeljina:bijeljina_2', mode: 'offensive' },
                { faction: 'RS', strength: '75', target_osid: 'op:brcko:brcko_2', decision: 'deny' },
                { faction: 'RBiH', strength: 90, target_osid: 'op:tuzla:tuzla_2' },
                { faction: 'RS', strength: 'bad', target_osid: 'op:zvornik:zvornik_2' },
                { faction: 'RS', strength: 10 },
            ],
        }));

        expect(loaded.pendingParamilitaryRequests).toEqual([
            { faction: 'RS', strength: 150, target_osid: 'op:bijeljina:bijeljina_2', mode: 'offensive' },
            { faction: 'RS', strength: 75, target_osid: 'op:brcko:brcko_2', decision: 'deny' },
        ]);
    });

    it('surfaces pending paramilitary requests with explicit warning copy', () => {
        const state = makeLoadedState({
            pendingParamilitaryRequests: [
                { faction: 'RS', strength: 150, target_osid: 'op:bijeljina:bijeljina_2' },
            ],
        });

        const items = deriveInboxItems(state, null);
        const paramilitary = items.find((item) => item.type === 'paramilitary_request');

        expect(paramilitary).toBeDefined();
        expect(paramilitary?.severity).toBe('blocking');
        expect(paramilitary?.action).toBe('paramilitary_review');
        expect(`${paramilitary?.title} ${paramilitary?.subtitle}`.toLowerCase()).toContain('paramilitary');
        expect(`${paramilitary?.title} ${paramilitary?.subtitle}`.toLowerCase()).toContain('war crimes');
    });
});
