import { describe, expect, it } from 'vitest';
import type { GameState, SiegeLifelineState } from '../src/state/game_state.js';
import { serializeState, deserializeState } from '../src/state/serialize.js';

// B7 — lifeline is an OPTIONAL, derived field on SarajevoState. It needs NO
// registry migration (absence is valid + the field is re-derived each turn),
// so CURRENT_SCHEMA_VERSION is intentionally NOT bumped (keeps flag-OFF
// baselines byte-identical). These tests prove the backward-compatible
// contract: legacy saves without `lifeline` load fine, and a state carrying a
// `lifeline` round-trips losslessly.

function minimalState(withLifeline: boolean): GameState {
    const lifeline: SiegeLifelineState = {
        status: 'STRANGLED', airlift_active: true, tunnel_active: false,
        throughput: 0.35, last_updated_turn: 12,
    };
    const state: any = {
        schema_version: 1,
        meta: { turn: 12, seed: 'lifeline-migration', phase: 'war' },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            fired_event_ids: [],
        },
        political: {
            political_controllers: {},
            sarajevo_state: {
                mun_id: 'sarajevo_cluster_1990',
                settlement_ids: [],
                siege_status: 'BESIEGED', siege_duration: 12,
                external_supply: 0.35, internal_supply: 0,
                siege_intensity: 0.5, international_focus: 1, humanitarian_pressure: 1,
                last_updated_turn: 12,
                ...(withLifeline ? { lifeline } : {}),
            },
        },
        displacement: {},
    };
    return state as GameState;
}

describe('B7 lifeline save round-trip', () => {
    it('legacy save without lifeline loads → lifeline stays undefined', () => {
        const payload = serializeState(minimalState(false));
        const restored = deserializeState(payload);
        expect(restored.political.sarajevo_state?.lifeline).toBeUndefined();
    });

    it('state with lifeline round-trips losslessly', () => {
        const original = minimalState(true);
        const restored = deserializeState(serializeState(original));
        expect(restored.political.sarajevo_state?.lifeline).toEqual(
            original.political.sarajevo_state?.lifeline,
        );
    });

    it('round-trip is idempotent (serialize→deserialize→serialize byte-equal)', () => {
        const once = serializeState(minimalState(true));
        const twice = serializeState(deserializeState(once));
        expect(twice).toBe(once);
    });
});
