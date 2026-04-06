/**
 * Tests for v0.8.4 Phase A — apply-autonomy-transition step logic.
 *
 * Covers:
 * 1. Pending level commits: autonomy_level_pending=2 + autonomy_level=0 → level=2, pending=undefined
 * 2. No-op when autonomy_level_pending is undefined: level unchanged, no error
 * 3. Overrides cleared: autonomy_overrides entries → undefined after step runs
 * 4. Non-war phase: step is a no-op (level unchanged, pending unchanged)
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import { warPhases } from '../../../src/sim/turn_phases/war_phases.js';
import type { GameState } from '../../../src/state/game_state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeState(metaOverrides: Record<string, unknown> = {}): GameState {
    return {
        meta: {
            turn: 5,
            seed: 'test',
            phase: 'war',
            ...metaOverrides,
        },
        factions: [],
        military: { formations: {} },
        displacement: {},
        economy: {},
        political: {},
    } as unknown as GameState;
}

function makeContext(state: GameState) {
    return { state } as unknown as Parameters<typeof warPhases[0]['run']>[0];
}

function getStep(name: string) {
    const step = warPhases.find(s => s.name === name);
    if (!step) throw new Error(`Step '${name}' not found in warPhases`);
    return step;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('apply-autonomy-transition step', () => {
    const step = getStep('apply-autonomy-transition');

    it('commits pending autonomy level and clears pending field', async () => {
        const state = makeState({
            autonomy_level: 0,
            autonomy_level_pending: 2,
        });
        await step.run(makeContext(state));
        expect(state.meta.autonomy_level).toBe(2);
        expect(state.meta.autonomy_level_pending).toBeUndefined();
    });

    it('is no-op when autonomy_level_pending is undefined', async () => {
        const state = makeState({
            autonomy_level: 1,
            autonomy_level_pending: undefined,
        });
        await step.run(makeContext(state));
        expect(state.meta.autonomy_level).toBe(1);
        expect(state.meta.autonomy_level_pending).toBeUndefined();
    });

    it('clears autonomy_overrides each turn', async () => {
        const state = makeState({
            autonomy_overrides: [
                { turn: 5, level: 'army', target_id: 'arb_1st_corps', faction: 'RBiH' },
                { turn: 5, level: 'corps', target_id: 'vrs_drina_corps', faction: 'RS' },
            ],
        });
        await step.run(makeContext(state));
        expect(state.meta.autonomy_overrides).toBeUndefined();
    });

    it('is a no-op when meta.phase is not war', async () => {
        const state = makeState({
            phase: 'peace',
            autonomy_level: 0,
            autonomy_level_pending: 3,
            autonomy_overrides: [{ turn: 5, level: 'event', target_id: 'ev_1', faction: 'RBiH' }],
        });
        await step.run(makeContext(state));
        // Nothing should have changed
        expect(state.meta.autonomy_level).toBe(0);
        expect(state.meta.autonomy_level_pending).toBe(3);
        expect(state.meta.autonomy_overrides).toHaveLength(1);
    });
});
