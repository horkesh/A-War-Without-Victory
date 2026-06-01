import { describe, expect, it } from 'vitest';
import type { FactionId, GameState, InternationalVisibilityPressure } from '../src/state/game_state.js';
import { ensureInternationalVisibilityPressure, updatePatronState } from '../src/state/patron_pressure.js';
import { applyDimensionShift, initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';

/**
 * Patron-supply "defiance" consequence: refusing a patron demand (resist_patron,
 * which drives patron_confidence down) must cut faction.patron_state.material_support_level
 * — but ONLY in decision_mode === 'emergent'. In historical/unset (calibration) mode the
 * penalty must NOT apply, keeping material_support_level byte-identical by construction.
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
    // Zero-pressure IVP so material_support_level reflects base path + defiance gate only.
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

describe('patron-defiance supply penalty (emergent-gated)', () => {
    it('HISTORICAL mode: low patron_confidence does NOT cut material support (byte-identical)', () => {
        const baseline = makeState({ decision_mode: 'historical', confidenceDelta: 0 });
        updatePatronState(baseline, undefined, neutralIvp(baseline));
        const baseSupport = supportByFaction(baseline);

        const defiant = makeState({ decision_mode: 'historical', confidenceDelta: -40 });
        updatePatronState(defiant, undefined, neutralIvp(defiant));
        const defiantSupport = supportByFaction(defiant);

        for (const id of ['RS', 'RBiH', 'HRHB']) {
            expect(defiantSupport[id]).toBe(baseSupport[id]);
        }
    });

    it('UNSET mode: low patron_confidence does NOT cut material support (byte-identical)', () => {
        const baseline = makeState({ confidenceDelta: 0 });
        updatePatronState(baseline, undefined, neutralIvp(baseline));
        const baseSupport = supportByFaction(baseline);

        const defiant = makeState({ confidenceDelta: -40 });
        updatePatronState(defiant, undefined, neutralIvp(defiant));
        const defiantSupport = supportByFaction(defiant);

        for (const id of ['RS', 'RBiH', 'HRHB']) {
            expect(defiantSupport[id]).toBe(baseSupport[id]);
        }
    });

    it('EMERGENT mode: low patron_confidence cuts RS and HRHB material support, leaves RBiH untouched', () => {
        const neutral = makeState({ decision_mode: 'emergent', confidenceDelta: 0 });
        updatePatronState(neutral, undefined, neutralIvp(neutral));
        const neutralSupport = supportByFaction(neutral);

        const defiant = makeState({ decision_mode: 'emergent', confidenceDelta: -40 });
        updatePatronState(defiant, undefined, neutralIvp(defiant));
        const defiantSupport = supportByFaction(defiant);

        // RS and HRHB (coercive patrons) lose material support on defiance.
        expect(defiantSupport['RS']).toBeLessThan(neutralSupport['RS']);
        expect(defiantSupport['HRHB']).toBeLessThan(neutralSupport['HRHB']);
        // RBiH (arms embargo, no coercive state patron) is unaffected.
        expect(defiantSupport['RBiH']).toBe(neutralSupport['RBiH']);
    });

    it('EMERGENT mode: severity ordering HRHB > RS > RBiH (RBiH = 0)', () => {
        const neutral = makeState({ decision_mode: 'emergent', confidenceDelta: 0 });
        updatePatronState(neutral, undefined, neutralIvp(neutral));
        const n = supportByFaction(neutral);

        const defiant = makeState({ decision_mode: 'emergent', confidenceDelta: -40 });
        updatePatronState(defiant, undefined, neutralIvp(defiant));
        const d = supportByFaction(defiant);

        // Fractional cut per faction (severity * defiance). HRHB severity 0.6 > RS 0.5 > RBiH 0.0.
        const cutFrac = (id: string) => (n[id] - d[id]) / n[id];
        expect(cutFrac('HRHB')).toBeGreaterThan(cutFrac('RS'));
        expect(cutFrac('RS')).toBeGreaterThan(0);
        expect(cutFrac('RBiH')).toBe(0);
    });

    it('EMERGENT mode: neutral patron_confidence (50) applies no cut', () => {
        const neutral = makeState({ decision_mode: 'emergent', confidenceDelta: 0 });
        updatePatronState(neutral, undefined, neutralIvp(neutral));
        const nEmergent = supportByFaction(neutral);

        const histNeutral = makeState({ decision_mode: 'historical', confidenceDelta: 0 });
        updatePatronState(histNeutral, undefined, neutralIvp(histNeutral));
        const nHistorical = supportByFaction(histNeutral);

        for (const id of ['RS', 'RBiH', 'HRHB']) {
            expect(nEmergent[id]).toBe(nHistorical[id]);
        }
    });
});
