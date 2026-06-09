/**
 * T2-B (orphaned-wiring audit S6/N6): the cross-municipality displacement
 * routing site now populates `dest_osid`, so the receive-side attribution
 * (displacement_event_log.ts) can credit `refugees_received` to the faction
 * that controls the destination — previously it was permanently 0 because no
 * append site set `dest_osid`.
 *
 * This suite tests the deterministic representative-dest-OSID resolver in
 * isolation: it picks the strictCompare-first `op:<destMun>:*` OSID controlled
 * by the receiving faction, and returns undefined (graceful no-op) when none
 * is controlled.
 */

import { describe, expect, it } from 'vitest';
import { resolveRepresentativeDestOsid } from '../src/state/displacement_takeover.js';
import type { GameState } from '../src/state/game_state.js';

function stateWithControllers(controllers: Record<string, string>): GameState {
    return { political: { political_controllers: controllers } } as unknown as GameState;
}

describe('resolveRepresentativeDestOsid (T2-B)', () => {
    it('returns the strictCompare-first OSID in the dest mun controlled by the faction', () => {
        const state = stateWithControllers({
            'op:zenica:zenica_2': 'RBiH',
            'op:zenica:cajdras_2': 'RBiH',
            'op:zenica:nemila_2': 'RS', // not RBiH-controlled — skipped
            'op:travnik:travnik_2': 'RBiH', // wrong mun — skipped
        });
        // cajdras_2 sorts before zenica_2 under strictCompare.
        expect(resolveRepresentativeDestOsid(state, 'zenica', 'RBiH')).toBe('op:zenica:cajdras_2');
    });

    it('returns undefined when the faction controls no OSID in the dest mun', () => {
        const state = stateWithControllers({
            'op:zenica:zenica_2': 'RS',
            'op:zenica:nemila_2': 'RS',
        });
        // Graceful no-op: event keeps dest_osid unset, receive-side drops it.
        expect(resolveRepresentativeDestOsid(state, 'zenica', 'RBiH')).toBeUndefined();
    });

    it('returns undefined when there are no political controllers', () => {
        expect(resolveRepresentativeDestOsid({} as unknown as GameState, 'zenica', 'RBiH')).toBeUndefined();
    });

    it('is deterministic across controller insertion order', () => {
        const a = stateWithControllers({
            'op:tuzla:b_2': 'RBiH',
            'op:tuzla:a_2': 'RBiH',
        });
        const b = stateWithControllers({
            'op:tuzla:a_2': 'RBiH',
            'op:tuzla:b_2': 'RBiH',
        });
        expect(resolveRepresentativeDestOsid(a, 'tuzla', 'RBiH'))
            .toBe(resolveRepresentativeDestOsid(b, 'tuzla', 'RBiH'));
        expect(resolveRepresentativeDestOsid(a, 'tuzla', 'RBiH')).toBe('op:tuzla:a_2');
    });
});
