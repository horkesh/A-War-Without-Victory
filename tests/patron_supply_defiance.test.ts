import { describe, expect, it } from 'vitest';
import type { FactionId, GameState, InternationalVisibilityPressure } from '../src/state/game_state.js';
import { ensureInternationalVisibilityPressure, updatePatronState } from '../src/state/patron_pressure.js';
import { applyDimensionShift, initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';

/**
 * Patron-defiance panel (2026-11-17): the per-turn "defiance cut" that scaled
 * material_support_level by low effective patron_confidence (emergent mode only) is RETIRED.
 * Its signal was not defiance (a hands-off RS that complied every time logged 90 weeks of
 * cuts) and it never reached combat. A defiance answer now carries its own live cost, the
 * `patron_supply_cut` event effect (tests/patron_supply_cut.test.ts). These tests pin that the
 * patron state update no longer reads patron_confidence and never writes a receipt.
 */

function makeState(opts: {
    decision_mode?: 'historical' | 'emergent';
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
        meta: { turn: 12, seed: 'defiance-test' },
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

function supportByFaction(state: GameState): Record<string, number> {
    const out: Record<string, number> = {};
    for (const f of state.factions) out[f.id] = f.patron_state?.material_support_level ?? -1;
    return out;
}

describe('patron state: the retired per-turn defiance term', () => {
    for (const mode of ['historical', 'emergent', undefined] as const) {
        it(`${mode ?? 'unset'} mode: low patron_confidence leaves material_support_level unchanged`, () => {
            const neutral = makeState({ decision_mode: mode, confidenceDelta: 0 });
            updatePatronState(neutral, undefined, neutralIvp(neutral));
            const defiant = makeState({ decision_mode: mode, confidenceDelta: -40 });
            updatePatronState(defiant, undefined, neutralIvp(defiant));
            expect(supportByFaction(defiant)).toEqual(supportByFaction(neutral));
        });

        it(`${mode ?? 'unset'} mode: the patron state update never writes a defiance receipt`, () => {
            const defiant = makeState({ decision_mode: mode, confidenceDelta: -60 });
            defiant.meta.player_faction = 'HRHB';
            updatePatronState(defiant, undefined, neutralIvp(defiant));
            expect(defiant.military?.patron_defiance_supply_cuts).toBeUndefined();
        });
    }

    it('emergent and historical produce the same material_support_level', () => {
        const emergent = makeState({ decision_mode: 'emergent', confidenceDelta: -40 });
        updatePatronState(emergent, undefined, neutralIvp(emergent));
        const historical = makeState({ decision_mode: 'historical', confidenceDelta: -40 });
        updatePatronState(historical, undefined, neutralIvp(historical));
        expect(supportByFaction(emergent)).toEqual(supportByFaction(historical));
    });
});
