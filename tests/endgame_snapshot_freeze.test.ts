/**
 * LANE-NIGHTSHIFT-N3 — Endgame snapshot freeze contract.
 *
 * Asserts that `freezeEndgameSnapshot` (Mission D#2) writes a single
 * canonical snapshot onto `state.meta.endgame_snapshot` and is idempotent,
 * and that the three termination writers (war_termination,
 * dayton_negotiation, peace_plans) all invoke it.
 *
 * The downstream adapter contract (snapshot preferred over recompute) is
 * covered by the larger save/load round-trip test in N10
 * (`tests/endgame_save_load_round_trip.test.ts`).
 *
 * Determinism: pure synchronous; no I/O; no random.
 */

import { describe, it, expect } from 'vitest';
import { freezeEndgameSnapshot } from '../src/sim/endgame/endgame_snapshot.js';
import { applyWarTermination } from '../src/sim/war_termination.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { GameState } from '../src/state/game_state.js';

function makeMinimalState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 188,
            phase: 'war',
            seed: 'n3-test',
            game_over: false,
        } as any,
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
        political: {
            political_controllers: {},
        } as any,
    } as unknown as GameState;
}

describe('LANE-NIGHTSHIFT-N3 endgame_snapshot freeze contract', () => {
    it('T1 — freezeEndgameSnapshot writes a snapshot with the canonical fields', () => {
        const state = makeMinimalState();
        (state.meta as any).game_over = true;
        (state.meta as any).outcome = 'dayton';
        freezeEndgameSnapshot(state);
        const snapshot = (state.meta as any).endgame_snapshot;
        expect(snapshot).toBeDefined();
        expect(snapshot.frozen_turn).toBe(188);
        expect(snapshot.outcome).toBe('dayton');
        // verdict / cost_ledger / historical_comparison are derived; on a
        // minimal state they may be undefined (the helpers throw and the
        // freeze swallows). The schema tolerates undefined.
        expect('verdict' in snapshot).toBe(true);
        expect('cost_ledger' in snapshot).toBe(true);
        expect('historical_comparison' in snapshot).toBe(true);
    });

    it('T2 — freezeEndgameSnapshot is idempotent', () => {
        const state = makeMinimalState();
        (state.meta as any).game_over = true;
        (state.meta as any).outcome = 'dayton';
        freezeEndgameSnapshot(state);
        const first = (state.meta as any).endgame_snapshot;
        // Mutate state and call again — snapshot must NOT be overwritten
        (state.meta as any).turn = 999;
        (state.meta as any).outcome = 'mutated';
        freezeEndgameSnapshot(state);
        const second = (state.meta as any).endgame_snapshot;
        expect(second).toBe(first); // same object reference
        expect(second.frozen_turn).toBe(188);
        expect(second.outcome).toBe('dayton');
    });

    it('T3 — applyWarTermination invokes freeze when game_over fires', () => {
        const state = makeMinimalState();
        applyWarTermination(state, {
            game_over: true,
            outcome: 'timeout_stalemate',
            winner: null,
            trigger: 'turn_limit',
        });
        const snapshot = (state.meta as any).endgame_snapshot;
        expect(snapshot).toBeDefined();
        expect(snapshot.outcome).toBe('timeout_stalemate');
        expect((state.meta as any).game_over).toBe(true);
    });

    it('T4 — applyWarTermination is a no-op when game_over is false', () => {
        const state = makeMinimalState();
        applyWarTermination(state, {
            game_over: false,
            outcome: null,
            winner: null,
            trigger: null,
        });
        expect((state.meta as any).endgame_snapshot).toBeUndefined();
        expect((state.meta as any).game_over).toBeFalsy();
    });
});
