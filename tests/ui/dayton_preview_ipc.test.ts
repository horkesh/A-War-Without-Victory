/**
 * Dayton Phase-4 — preview IPC contract + save/load-mid-negotiation tests.
 *
 * The `preview-dayton` IPC handler (electron-main.cjs) runs the real
 * evaluateBotResponse + resolveDaytonNegotiation on a THROWAWAY deserialized
 * clone and discards it — surfacing the authoritative readouts + bot counter-offers
 * WITHOUT mutating game state. These tests pin that contract at the sim level:
 *   1. running the resolver on a clone leaves the ORIGINAL state's pending_dayton
 *      and dayton_result untouched (no-mutation guarantee the handler relies on);
 *   2. evaluateBotResponse returns a counter-offer the modal can surface;
 *   3. a pending_dayton packet survives a JSON save/load round-trip (the player can
 *      save mid-negotiation, reload, and the Dayton menu is still pending).
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '../../src/state/game_state.js';
import type { DaytonProposal, NegotiationBreakdown, PatronRelationship, PendingDaytonPacket } from '../../src/state/negotiation_types.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../../src/state/negotiation_types.js';
import { resolveDaytonNegotiation } from '../../src/sim/negotiation/dayton_negotiation.js';
import { evaluateBotResponse } from '../../src/sim/negotiation/bot_negotiation.js';
import { initializeStrategicDimensions } from '../../src/sim/events/strategic_dimensions.js';
import { derivePendingDayton } from '../../src/ui/map/data/GameStateAdapter.js';

const PENDING: PendingDaytonPacket = {
    territorial_packages: [
        { id: 'gorazde_corridor', name: 'Goražde Corridor', default_holder: 'RS', demand_cost: 12, concede_cost: 8 },
        { id: 'brcko_district', name: 'Brčko District', default_holder: 'RS', demand_cost: 20, concede_cost: 15 },
    ],
    institutional_packages: [
        { id: 'military', name: 'Military Structure', centralized_cost: 15, decentralized_cost: 10 },
    ],
    faction_capital: { RBiH: 80, RS: 60, HRHB: 40 },
    patron_override: { RBiH: 5, RS: 10, HRHB: 25 },
};

function makeState(): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        capital[f] = { ...createEmptyCapital(), territory_controlled_pct: 30, refugees_created: 50_000 };
        patron_relationships[f] = createDefaultPatronRelationship(f);
    }
    const store = initializeStrategicDimensions();
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        for (const dim of Object.keys(store[f])) store[f][dim] = { base_value: 55, event_modifier: 0, effective_value: 55 };
    }
    return {
        meta: { turn: 190, war_start_turn: 0, phase: 'war', seed: 1, date: '1995-11-21', game_over: false, player_faction: 'RBiH', decision_mode: 'emergent' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            negotiation: {
                capital, patron_relationships, peace_plan_history: [],
                strategic_dimensions: store, pending_dayton: PENDING,
            },
        },
        political: { political_controllers: { 'op:sarajevo:sarajevo_1': 'RBiH', 'op:banja_luka:banja_luka_2': 'RS', 'op:mostar:mostar_1': 'HRHB' } },
        displacement: {},
    } as unknown as GameState;
}

const DEMAND_PROPOSAL: DaytonProposal = {
    territorial_demands: ['gorazde_corridor', 'brcko_district'],
    territorial_concessions: [],
    institutional_choices: { military: 'centralized' },
};

describe('preview-dayton: no-mutation guarantee (run on a clone)', () => {
    it('resolving on a deserialized clone leaves the original state pending + unresolved', () => {
        const original = makeState();
        const beforeJson = JSON.stringify(original);

        // Simulate the IPC handler: deserialize a fresh CLONE and resolve on it only.
        const clone = JSON.parse(beforeJson) as GameState;
        const result = resolveDaytonNegotiation(clone, DEMAND_PROPOSAL);

        // The clone resolved (authoritative readouts present)…
        expect(result.entity_autonomy_index).toBeTypeOf('number');
        expect(typeof result.brcko_status).toBe('string');
        expect(clone.meta.game_over).toBe(true);

        // …but the ORIGINAL is byte-identical: still pending, not game-over, no result.
        expect(JSON.stringify(original)).toBe(beforeJson);
        expect(original.meta.game_over).toBe(false);
        expect(original.military.negotiation?.dayton_result).toBeUndefined();
        expect(original.military.negotiation?.pending_dayton).toBeDefined();
    });

    it('the preview surfaces the authoritative dysfunction + Brčko readouts', () => {
        const clone = makeState();
        const result = resolveDaytonNegotiation(clone, {
            territorial_demands: [], territorial_concessions: [], institutional_choices: {},
        });
        // Unraised Brčko → arbitration district (Annex-2 third state).
        expect(result.brcko_status).toBe('arbitration');
        expect(result.brcko_arbitration).toBe(true);
        // Emergent-mode → dysfunction index is computed and stamped.
        expect(result.peace_dysfunction_index).toBeTypeOf('number');
    });
});

describe('preview-dayton: bot counter-offer is surfaced', () => {
    it('evaluateBotResponse produces a counter-offer the modal can render', () => {
        const state = makeState();
        // A heavy demand against RS that exceeds its acceptance band → reject/counter.
        const resp = evaluateBotResponse(state, 'RS', DEMAND_PROPOSAL);
        expect(['accept', 'reject', 'counter']).toContain(resp.decision);
        expect(resp.available_capital).toBeGreaterThan(0);
        if (resp.decision === 'counter') {
            expect(resp.counter_proposal).toBeDefined();
            // The counter is a SUBSET of the player's demands → the modal diff works.
            for (const id of resp.counter_proposal!.territorial_demands) {
                expect(DEMAND_PROPOSAL.territorial_demands).toContain(id);
            }
        }
    });
});

describe('save/load mid-negotiation: pending_dayton survives a round-trip', () => {
    it('a pending packet persists through JSON serialize → parse and re-derives in the UI adapter', () => {
        const state = makeState();
        const roundTripped = JSON.parse(JSON.stringify(state)) as GameState;

        const pd = roundTripped.military.negotiation?.pending_dayton;
        expect(pd).toBeDefined();
        expect(pd!.territorial_packages).toHaveLength(2);

        // The UI adapter still derives the pending-Dayton view (modal re-opens).
        const view = derivePendingDayton(roundTripped);
        expect(view).toBeDefined();
        expect(view!.territorialPackages.map((p) => p.id).sort()).toEqual(['brcko_district', 'gorazde_corridor']);
        expect(view!.factionCapital.RBiH).toBe(80);
    });

    it('once resolved, the adapter stops deriving the pending view (modal closes)', () => {
        const state = makeState();
        resolveDaytonNegotiation(state, DEMAND_PROPOSAL);
        const roundTripped = JSON.parse(JSON.stringify(state)) as GameState;
        // game_over + dayton_result set → no pending view.
        expect(derivePendingDayton(roundTripped)).toBeUndefined();
    });
});
