import { describe, it, expect, vi } from 'vitest';
import { assertFormationsInFriendlyTerritory } from '../src/sim/combat/assert_formation_territory.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(overrides: {
    political_controllers?: Record<string, string>;
    formations?: Record<string, any>;
    war_alliance_rbih_hrhb?: number;
}): GameState {
    return {
        meta: { turn: 10, phase: 'war' },
        military: {
            formations: overrides.formations ?? {},
        },
        political: {
            political_controllers: overrides.political_controllers ?? {},
            war_alliance_rbih_hrhb: overrides.war_alliance_rbih_hrhb,
        },
    } as unknown as GameState;
}

describe('assertFormationsInFriendlyTerritory', () => {
    it('logs error when brigade is in enemy territory', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const state = makeState({
            political_controllers: { 'op:foo:bar': 'RS' },
            formations: {
                brig_1: { id: 'brig_1', status: 'active', faction: 'RBiH', kind: 'brigade', location_osid: 'op:foo:bar' },
            },
        });

        assertFormationsInFriendlyTerritory(state);

        expect(spy).toHaveBeenCalledOnce();
        const msg = spy.mock.calls[0][0] as string;
        expect(msg).toContain('brig_1');
        expect(msg).toContain('RBiH');
        expect(msg).toContain('RS');
        spy.mockRestore();
    });

    it('does not log when brigade is in own territory', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const state = makeState({
            political_controllers: { 'op:foo:bar': 'RS' },
            formations: {
                brig_1: { id: 'brig_1', status: 'active', faction: 'RS', kind: 'brigade', location_osid: 'op:foo:bar' },
            },
        });

        assertFormationsInFriendlyTerritory(state);

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('does not log for inactive brigades', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const state = makeState({
            political_controllers: { 'op:foo:bar': 'RS' },
            formations: {
                brig_1: { id: 'brig_1', status: 'inactive', faction: 'RBiH', kind: 'brigade', location_osid: 'op:foo:bar' },
            },
        });

        assertFormationsInFriendlyTerritory(state);

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('does not log for brigades with no location', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const state = makeState({
            political_controllers: { 'op:foo:bar': 'RS' },
            formations: {
                brig_1: { id: 'brig_1', status: 'active', faction: 'RBiH', kind: 'brigade', location_osid: null },
            },
        });

        assertFormationsInFriendlyTerritory(state);

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('does not log for non-brigade formations', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const state = makeState({
            political_controllers: { 'op:foo:bar': 'RS' },
            formations: {
                corps_hq: { id: 'corps_hq', status: 'active', faction: 'RBiH', kind: 'corps', location_osid: 'op:foo:bar' },
            },
        });

        assertFormationsInFriendlyTerritory(state);

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('allows RBiH in HRHB territory when allied', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const state = makeState({
            political_controllers: { 'op:foo:bar': 'HRHB' },
            formations: {
                brig_1: { id: 'brig_1', status: 'active', faction: 'RBiH', kind: 'brigade', location_osid: 'op:foo:bar' },
            },
            war_alliance_rbih_hrhb: 0.5, // allied
        });

        assertFormationsInFriendlyTerritory(state);

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
});
