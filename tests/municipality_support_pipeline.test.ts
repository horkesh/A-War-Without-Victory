/**
 * Regression (2026-11-07): Local Support orders were a silent no-op in real turns.
 *
 * The order is staged on the player's turn N (`staged_turn = N`), but the turn pipeline
 * advances `meta.turn` to N+1 before any phase runs, and the consumers required
 * `staged_turn === meta.turn`. The unit tests in phase_e_municipality_support.test.ts call
 * the consumers directly, so they passed while the live path was dead. This test goes
 * through the real desktop `advanceTurn`: the same state is advanced with and without an
 * order, and the staged municipality must differ.
 */
import { describe, expect, it } from 'vitest';

import { advanceTurn, deserializeState, serializeState, startNewCampaign } from '../src/desktop/desktop_sim.js';
import type { GameState } from '../src/state/game_state.js';
// @ts-ignore -- CommonJS staging module used by the Electron IPC handler
import { stageMunicipalitySupportOrderOnState, SUPPORT_TYPE_BY_FACTION } from '../src/desktop/municipality_support_staging.cjs';

const baseDir = process.cwd();

function clone(state: GameState): GameState {
    return deserializeState(serializeState(state)) as GameState;
}

function brigadesOf(state: GameState, faction: string, mun: string) {
    return Object.values(state.military.formations ?? {})
        .filter((f) => f.faction === faction && f.kind === 'brigade' && f.origin_mun === mun)
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

async function advanceWithAndWithout(faction: 'RBiH' | 'HRHB', mun: string) {
    const start = (await startNewCampaign(baseDir, faction, 'apr_1992', 'historical')).state;
    const without = clone(start);
    const withOrder = clone(start);
    const staged = stageMunicipalitySupportOrderOnState(withOrder, {
        faction, munId: mun, type: SUPPORT_TYPE_BY_FACTION[faction],
    });
    expect(staged).toEqual({ ok: true });
    const a = (await advanceTurn(without, baseDir)).state;
    const b = (await advanceTurn(withOrder, baseDir)).state;
    return { a, b };
}

describe('Local Support through the real turn pipeline', () => {
    it('RBiH weapons shipment adds local mobilization in the staged municipality', async () => {
        const { a, b } = await advanceWithAndWithout('RBiH', 'tuzla');
        const personnel = (s: GameState) => brigadesOf(s, 'RBiH', 'tuzla').reduce((n, f) => n + (f.personnel ?? 0), 0);
        const committed = (s: GameState) => Object.values(s.military.militia_pools ?? {})
            .filter((p) => p.faction === 'RBiH' && p.mun_id === 'tuzla')
            .reduce((n, p) => n + p.available + p.committed, 0);
        expect(committed(b)).toBeGreaterThan(committed(a));
        expect(personnel(b)).toBeGreaterThanOrEqual(personnel(a));
    }, 180_000);

    it('HRHB Croatian support package adds reinforcement cohesion in the staged municipality', async () => {
        const { a, b } = await advanceWithAndWithout('HRHB', 'mostar');
        const cohesion = (s: GameState) => brigadesOf(s, 'HRHB', 'mostar').reduce((n, f) => n + (f.cohesion ?? 0), 0);
        expect(cohesion(b)).toBeGreaterThan(cohesion(a));
    }, 180_000);

    it('an order applies to exactly one resolution', async () => {
        const start = (await startNewCampaign(baseDir, 'RBiH', 'apr_1992', 'historical')).state;
        stageMunicipalitySupportOrderOnState(start, { faction: 'RBiH', munId: 'tuzla', type: 'weapons_shipment' });
        const once = (await advanceTurn(start, baseDir)).state;
        // A second advance with the stale order still stored must equal a second advance with it removed.
        const stale = clone(once);
        const cleared = clone(once);
        delete (cleared.military as { municipality_support_orders?: unknown }).municipality_support_orders;
        const twiceStale = (await advanceTurn(stale, baseDir)).state;
        const twiceCleared = (await advanceTurn(cleared, baseDir)).state;
        const pools = (s: GameState) => JSON.stringify(Object.values(s.military.militia_pools ?? {})
            .filter((p) => p.faction === 'RBiH' && p.mun_id === 'tuzla'));
        expect(pools(twiceStale)).toBe(pools(twiceCleared));
    }, 240_000);
});
