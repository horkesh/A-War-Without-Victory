import { afterEach, describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import {
    refreshSarajevoLifelineCache,
    updateSarajevoState,
} from '../src/state/sarajevo_exception.js';
import { getActiveSarajevoLifeline } from '../src/state/sarajevo_lifeline.js';

// B7 STALE-CACHE FIX (#271). The authoritative `updateSarajevoState` runs LATE in
// the war pipeline (after the siege/morale/exhaustion/supply-reserve consumers),
// so consumers would otherwise read the PREVIOUS turn's cached lifeline. The new
// `refreshSarajevoLifelineCache` step runs BEFORE those consumers and rewrites
// `sarajevo_state.lifeline` from current-turn truth. These tests assert:
//   (a) flag OFF ⇒ refresh is a complete no-op (byte-identical path), and
//   (b) flag ON ⇒ the cache is current within the turn (no stale read), without
//       double-incrementing siege_duration.

const SARAJEVO_CORE_OSID = 'op:centar_sarajevo:radava';

function baseState(turn: number): GameState {
    return {
        schema_version: 1,
        meta: { turn, seed: 'lifeline-stale', phase: 'war' },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            siege_turn_counters: {},
            // tunnel NOT yet fired this turn — lifeline must reflect current truth
            fired_event_ids: [],
            event_flags: { sarajevo_siege_active: true },
        } as any,
        political: {
            political_controllers: { [SARAJEVO_CORE_OSID]: 'RBiH' },
            // Cached lifeline from the PREVIOUS turn (turn-1): stale OPEN value
            // with the tunnel "active". Current truth (no tunnel fired) is lower.
            sarajevo_state: {
                mun_id: 'sarajevo_cluster_1990',
                settlement_ids: [SARAJEVO_CORE_OSID],
                siege_status: 'BESIEGED', siege_duration: 5,
                external_supply: 0.8, internal_supply: 0,
                siege_intensity: 0.5, international_focus: 1, humanitarian_pressure: 1,
                last_updated_turn: turn - 1,
                lifeline: { status: 'OPEN', airlift_active: true, tunnel_active: true, throughput: 0.8, last_updated_turn: turn - 1 },
            },
        } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

afterEach(() => {
    delete process.env.ENABLE_SARAJEVO_LIFELINE;
});

describe('B7 stale-cache refresh (#271)', () => {
    it('flag OFF: refresh is a no-op and leaves the cached lifeline untouched', () => {
        const state = baseState(30);
        const before = JSON.parse(JSON.stringify(state.political.sarajevo_state));
        const result = refreshSarajevoLifelineCache(state, undefined);
        expect(result).toBeUndefined();
        expect(state.political.sarajevo_state).toEqual(before);
    });

    it('flag ON: refresh rewrites the cache to the CURRENT turn so consumers read a fresh value', () => {
        process.env.ENABLE_SARAJEVO_LIFELINE = 'true';
        const state = baseState(30);
        const stale = getActiveSarajevoLifeline(state)!;
        expect(stale.last_updated_turn).toBe(29);
        expect(stale.tunnel_active).toBe(true); // stale value claims the tunnel is up

        refreshSarajevoLifelineCache(state, undefined);

        const fresh = getActiveSarajevoLifeline(state)!;
        // Current-turn truth: tunnel event has NOT fired this turn.
        expect(fresh.last_updated_turn).toBe(30);
        expect(fresh.tunnel_active).toBe(false);
        // No tunnel contribution ⇒ strictly lower throughput than the stale cache.
        expect(fresh.throughput).toBeLessThan(stale.throughput);
    });

    it('flag ON: refresh does NOT advance siege_duration (late writer remains authoritative)', () => {
        process.env.ENABLE_SARAJEVO_LIFELINE = 'true';
        const state = baseState(30);
        const durationBefore = state.political.sarajevo_state!.siege_duration;
        refreshSarajevoLifelineCache(state, undefined);
        expect(state.political.sarajevo_state!.siege_duration).toBe(durationBefore);

        // The late authoritative writer increments siege_duration exactly once.
        updateSarajevoState(state, undefined);
        expect(state.political.sarajevo_state!.siege_duration).toBe(durationBefore + 1);
    });
});
