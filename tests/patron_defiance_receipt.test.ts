import { describe, expect, it } from 'vitest';
import type { FactionId, GameState, InternationalVisibilityPressure } from '../src/state/game_state.js';
import { ensureInternationalVisibilityPressure, updatePatronState } from '../src/state/patron_pressure.js';
import { applyDimensionShift, initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import {
    buildConsequenceReceipts,
    receiptsRealizedOnTurn,
} from '../src/ui/map/data/consequenceReceipts.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';

/**
 * Patron-defiance receipts (patron-defiance panel, 2026-11-17).
 *
 * A receipt is written only when a defiance answer's `patron_supply_cut` effect applies
 * (one per answer), and `buildConsequenceReceipts` projects the player faction's receipts
 * into one-shot ConsequenceReceipts for the Turn-Aftermath "Consequences Realized" section.
 * The retired per-turn defiance term never writes one, in any decision mode.
 */

const TURN = 95;

function makeState(opts: {
    decision_mode?: 'historical' | 'emergent';
    playerFaction?: FactionId;
    confidenceDelta?: number;
}): GameState {
    const store = initializeStrategicDimensions();
    if (opts.confidenceDelta) {
        for (const f of ['RS', 'RBiH', 'HRHB'] as FactionId[]) {
            applyDimensionShift(store, f, 'patron_confidence', opts.confidenceDelta);
        }
    }
    const faction = (id: FactionId) => ({
        id,
        profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }
    });
    const state: GameState = {
        schema_version: 1,
        meta: { turn: TURN, seed: 'defiance-receipt-test', player_faction: opts.playerFaction },
        factions: [faction('RS'), faction('RBiH'), faction('HRHB')],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            negotiation: {
                strategic_dimensions: store,
                patron_relationships: { RS: { support_level: 35 }, HRHB: { support_level: 62 } },
            }
        } as any,
        political: {} as any,
        displacement: {} as any
    };
    if (opts.decision_mode) state.meta.decision_mode = opts.decision_mode;
    return state;
}

function neutralIvp(state: GameState): InternationalVisibilityPressure {
    const ivp = ensureInternationalVisibilityPressure(state);
    ivp.sarajevo_siege_visibility = 0;
    ivp.enclave_humanitarian_pressure = 0;
    ivp.atrocity_visibility = 0;
    ivp.negotiation_momentum = 0;
    ivp.composite_ivp = 0;
    return ivp;
}

const EMPTY_CATALOG = new Map<string, EventDefinition>();

function defyZagreb(state: GameState): void {
    applyEventEffects(state, [{
        kind: 'patron_supply_cut', faction: 'HRHB', multiplier: 0.85, duration_turns: 52,
        tag: 'zagreb_orders_hrhb_ceasefire#resist_patron',
    }]);
}

describe('patron-defiance receipts', () => {
    it('a defiance answer writes one receipt, projected for the selected player and realized that turn', () => {
        const state = makeState({ decision_mode: 'emergent', playerFaction: 'HRHB' });
        defyZagreb(state);
        expect(state.military.patron_defiance_supply_cuts).toHaveLength(1);

        const receipts = buildConsequenceReceipts(state, EMPTY_CATALOG);
        expect(receipts).toHaveLength(1);
        expect(receipts[0]!.decisionEventId).toContain('HRHB');
        expect(receipts[0]!.status).toBe('confirmed');
        expect(receipts[0]!.firedTurn).toBe(TURN);
        expect(receipts[0]!.claimPredicate.operands[0]?.owner_path).toBe('state.meta.player_faction');
        expect(receipts[0]!.predictedLabel).toContain('combat effectiveness -15%');
        expect(receiptsRealizedOnTurn(receipts, TURN)).toHaveLength(1);
    });

    it('another faction\'s receipt is never projected for the player', () => {
        const state = makeState({ decision_mode: 'emergent', playerFaction: 'RS' });
        defyZagreb(state);
        expect(buildConsequenceReceipts(state, EMPTY_CATALOG)).toEqual([]);
    });

    it('no selected player: the receipt is recorded but not projected', () => {
        const state = makeState({ decision_mode: 'emergent' });
        defyZagreb(state);
        expect(state.military.patron_defiance_supply_cuts).toHaveLength(1);
        expect(buildConsequenceReceipts(state, EMPTY_CATALOG)).toEqual([]);
    });

    it.each(['historical', 'emergent', undefined] as const)(
        '%s mode: low patron_confidence alone writes no receipt (the per-turn term is retired)',
        (mode) => {
            const state = makeState({ decision_mode: mode, playerFaction: 'HRHB', confidenceDelta: -40 });
            updatePatronState(state, undefined, neutralIvp(state));
            expect(state.military.patron_defiance_supply_cuts).toBeUndefined();
            expect(buildConsequenceReceipts(state, EMPTY_CATALOG)).toEqual([]);
        },
    );
});
