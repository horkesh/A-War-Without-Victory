import { describe, expect, it } from 'vitest';
import type { FactionId, GameState, InternationalVisibilityPressure } from '../src/state/game_state.js';
import { ensureInternationalVisibilityPressure, updatePatronState } from '../src/state/patron_pressure.js';
import { applyDimensionShift, initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import {
    buildConsequenceReceipts,
    receiptsRealizedOnTurn,
} from '../src/ui/map/data/consequenceReceipts.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';

/**
 * Slice 4a — patron-defiance consequence-receipt.
 *
 * When (and only when) the emergent patron-defiance penalty actually CUTS a
 * faction's material support, `updatePatronState` must record the realized cut
 * in `state.military.patron_defiance_supply_cuts`, and `buildConsequenceReceipts`
 * must project it into a one-shot ConsequenceReceipt surfaced by the existing
 * Turn-Aftermath "Consequences Realized" section (receiptsRealizedOnTurn).
 *
 * In historical/unset (calibration) mode NOTHING is recorded → byte-identical.
 * RBiH (severity 0) earns no cut → no receipt even in emergent mode.
 */

const TURN = 12;

function makeState(opts: {
    decision_mode?: 'historical' | 'emergent';
    playerFaction?: FactionId;
    /** patron_confidence delta applied to every faction (negative = defiance). */
    confidenceDelta?: number;
}): GameState {
    const store = initializeStrategicDimensions();
    if (opts.confidenceDelta && opts.confidenceDelta !== 0) {
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
            negotiation: { strategic_dimensions: store }
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

// Catalog can be empty — patron-defiance receipts need no event catalog.
const EMPTY_CATALOG = new Map<string, EventDefinition>();

describe('patron-defiance consequence-receipt (Slice 4a)', () => {
    it.each(['RS', 'HRHB'] as FactionId[])(
        'EMERGENT + defiant: records both patron cuts but projects only selected-player %s',
        (playerFaction) => {
            const state = makeState({
                decision_mode: 'emergent',
                confidenceDelta: -40,
                playerFaction,
            });
            updatePatronState(state, undefined, neutralIvp(state));

            const cuts = state.military.patron_defiance_supply_cuts ?? [];
            const factions = cuts.map((c) => c.faction).sort();
            expect(factions).toEqual(['HRHB', 'RS']);
            for (const c of cuts) {
                expect(c.turn).toBe(TURN);
                expect(c.cut_fraction).toBeGreaterThan(0);
                expect(c.support_after).toBeGreaterThanOrEqual(0);
            }

            const receipts = buildConsequenceReceipts(state, EMPTY_CATALOG);
            expect(receipts).toHaveLength(1);
            expect(receipts[0]!.decisionEventId).toContain(playerFaction);
            expect(receipts[0]!.status).toBe('confirmed');
            expect(receipts[0]!.firedTurn).toBe(TURN);
            expect(receipts[0]!.decisionTurn).toBe(TURN);
            expect(receipts[0]!.claimPredicate.operands[0]?.owner_path).toBe('state.meta.player_faction');
            // Sober/factual; never a reward.
            expect(receipts[0]!.predictedLabel.toLowerCase()).toContain('cut');

            // Surfaces in the existing aftermath "realized this turn" filter.
            const realized = receiptsRealizedOnTurn(receipts, TURN);
            expect(realized).toHaveLength(1);
        },
    );

    it('EMERGENT + defiant: records engine cuts but projects none without a selected player', () => {
        const state = makeState({ decision_mode: 'emergent', confidenceDelta: -40 });
        updatePatronState(state, undefined, neutralIvp(state));

        expect(state.military.patron_defiance_supply_cuts).toHaveLength(2);
        expect(buildConsequenceReceipts(state, EMPTY_CATALOG)).toEqual([]);
    });

    it('HISTORICAL mode: defiance records NO cut and projects NO receipt (byte-identical)', () => {
        const state = makeState({ decision_mode: 'historical', confidenceDelta: -40 });
        updatePatronState(state, undefined, neutralIvp(state));

        expect(state.military.patron_defiance_supply_cuts).toBeUndefined();
        expect(buildConsequenceReceipts(state, EMPTY_CATALOG)).toEqual([]);
    });

    it('UNSET mode: defiance records NO cut and projects NO receipt (byte-identical)', () => {
        const state = makeState({ confidenceDelta: -40 });
        updatePatronState(state, undefined, neutralIvp(state));

        expect(state.military.patron_defiance_supply_cuts).toBeUndefined();
        expect(buildConsequenceReceipts(state, EMPTY_CATALOG)).toEqual([]);
    });

    it('EMERGENT but neutral confidence (no cut): records NO cut and projects NO receipt', () => {
        const state = makeState({ decision_mode: 'emergent', confidenceDelta: 0 });
        updatePatronState(state, undefined, neutralIvp(state));

        expect(state.military.patron_defiance_supply_cuts).toBeUndefined();
        expect(buildConsequenceReceipts(state, EMPTY_CATALOG)).toEqual([]);
    });

    it('EMERGENT + defiant: RBiH (severity 0) earns NO cut → no RBiH receipt', () => {
        const state = makeState({
            decision_mode: 'emergent',
            confidenceDelta: -40,
            playerFaction: 'RBiH',
        });
        updatePatronState(state, undefined, neutralIvp(state));

        const cuts = state.military.patron_defiance_supply_cuts ?? [];
        expect(cuts.some((c) => c.faction === 'RBiH')).toBe(false);

        const receipts = buildConsequenceReceipts(state, EMPTY_CATALOG);
        expect(receipts.some((r) => r.decisionEventId.includes('RBiH'))).toBe(false);
    });
});
