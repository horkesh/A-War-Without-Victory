/**
 * Robustness audit P1-A (task #95, docs/40_reports/proposals/20260609_1.0_ROBUSTNESS_LANDMINE_AUDIT.md):
 * the central serializer must THROW (fail-loud, naming the offending key-path) on any
 * non-finite number (NaN / Infinity / -Infinity) instead of silently serializing it to
 * "null" — which corrupts the save and moves the byte-hash with no trace (the #358
 * home_distance class).
 *
 * Guard fires only on already-corrupt values: well-formed (finite) states serialize
 * byte-identically to the pre-guard serializer.
 */

import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { serializeGameState } from '../src/state/serializeGameState.js';

function minimalState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'x', player_faction: 'RBiH', decision_mode: 'historical' } as any,
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
        political: { political_controllers: { sid_a: 'RBiH' } } as any,
        displacement: {} as any,
    };
}

function expectNonFiniteThrow(run: () => void, expectedPathFragment: string, expectedValueRepr: string): void {
    try {
        run();
        throw new Error('Expected serializeGameState to throw on non-finite number');
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        expect(message, `message should name the non-finite class: ${message}`).toContain('non-finite');
        expect(message, `message should name the offending key-path: ${message}`).toContain(expectedPathFragment);
        expect(message, `message should name the offending value: ${message}`).toContain(expectedValueRepr);
    }
}

describe('serializeGameState non-finite guard (P1-A)', () => {
    it('serializes a well-formed minimal state without throwing (guard is inert on finite input)', () => {
        const state = minimalState();
        const json = serializeGameState(state);
        expect(() => JSON.parse(json)).not.toThrow();
        expect(json).not.toContain('null'); // nothing silently nulled
    });

    it('throws with the key-path on NaN in a nested object field (formation morale)', () => {
        const state = minimalState();
        (state.military.formations as any).f1 = {
            id: 'f1', faction: 'RBiH', kind: 'brigade', status: 'active', morale: NaN,
        };
        expectNonFiniteThrow(
            () => serializeGameState(state),
            'military.formations.f1.morale',
            'NaN'
        );
    });

    it('throws with the key-path on Infinity (the #358 home_distance class)', () => {
        const state = minimalState();
        (state.military.formations as any).f1 = {
            id: 'f1', faction: 'RS', kind: 'brigade', status: 'active',
            home_distance_cache: { 'op:zvornik:zvornik': Infinity },
        };
        expectNonFiniteThrow(
            () => serializeGameState(state),
            'military.formations.f1.home_distance_cache.op:zvornik:zvornik',
            'Infinity'
        );
    });

    it('throws with the indexed key-path on -Infinity inside an array', () => {
        // NOTE: deliberately NOT cascade_penalties — validateGameStateShape already
        // finite-checks that one. This exercises the serializer's own guard on a
        // field shape the validator does not cover.
        const state = minimalState();
        (state.military.formations as any).f1 = {
            id: 'f1', faction: 'HRHB', kind: 'brigade', status: 'active',
            axis_momentum_history: [0.4, -Infinity],
        };
        expectNonFiniteThrow(
            () => serializeGameState(state),
            'military.formations.f1.axis_momentum_history.1',
            '-Infinity'
        );
    });

    it('throws with the key-path on a deliberately-Infinity corridor_width (the live corruption class fixed at the producer in #95)', () => {
        // Pre-#95, measureCorridorWidth returned Infinity for the main body and the
        // value persisted as "corridor_width": null (15× in latest_run_final_save.json).
        // The producer now returns CORRIDOR_WIDTH_UNBOUNDED=99; this pin proves the
        // serializer guard would catch any regression of that class at save time.
        const state = minimalState();
        (state.military as any).corps_command = {
            'rbih-1st-corps': {
                commander_state: {
                    zone_assessments: [
                        { zone_id: 'z1', corridor_width: Infinity, commitment_ratio: 2 },
                    ],
                },
            },
        };
        expectNonFiniteThrow(
            () => serializeGameState(state),
            'military.corps_command.rbih-1st-corps.commander_state.zone_assessments.0.corridor_width',
            'Infinity'
        );
    });

    it('throws with the key-path on NaN inside a Map value (commander v0.8 Map state)', () => {
        const state = minimalState();
        (state.military as any).corps_command = {
            c1: { garrison_budget: new Map<string, number>([['sector_a', NaN]]) },
        };
        expectNonFiniteThrow(
            () => serializeGameState(state),
            'military.corps_command.c1.garrison_budget.sector_a',
            'NaN'
        );
    });
});
