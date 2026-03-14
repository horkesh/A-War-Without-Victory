/**
 * Tests for Phase 1 (n697): Graz faction-level RS→HRHB block for non-exempt RS corps.
 * Covers the new faction-level check that blocks SRK and other non-Posavina RS corps.
 */

import { describe, it, expect } from 'vitest';
import {
    shouldGrazBlockAttack,
} from '../src/sim/local_truces.js';
import type { FactionId, GameState } from '../src/state/game_state.js';

function makeActiveState(turn: number = 10): GameState {
    return {
        schema_version: 1,
        meta: { phase: 'war', turn, scenario_start_date: '1992-04-06' },
        factions: [],
        political: {
            vienna_declaration_turn: 4,
            vienna_accepted: { RS: true, HRHB: true } as Record<FactionId, boolean>,
        },
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
    } as unknown as GameState;
}

describe('Graz faction-level RS→HRHB block (n697)', () => {
    it('blocks SRK (vrs_sarajevo_romanija) attacking non-Kiseljak HRHB territory', () => {
        const state = makeActiveState();
        // SRK pushed into Kakanj area — should be blocked by Graz faction-level check
        expect(shouldGrazBlockAttack(state, 'vrs_sarajevo_romanija', 'RS', 'op:kakanj:kakanj_2', 'HRHB')).toBe(true);
    });

    it('blocks vrs_drina attacking HRHB territory (non-exempt RS corps)', () => {
        const state = makeActiveState();
        expect(shouldGrazBlockAttack(state, 'vrs_drina', 'RS', 'op:travnik:travnik_2', 'HRHB')).toBe(true);
    });

    it('does NOT block vrs_1st_krajina attacking HRHB (Posavina — exempt)', () => {
        const state = makeActiveState();
        expect(shouldGrazBlockAttack(state, 'vrs_1st_krajina', 'RS', 'op:brod:brod_2', 'HRHB')).toBe(false);
    });

    it('does NOT block vrs_2nd_krajina from faction-level (falls through to corps-pair which blocks it)', () => {
        // vrs_2nd_krajina is exempt from faction-level, but the corps-pair mechanism blocks it
        const state = makeActiveState();
        expect(shouldGrazBlockAttack(state, 'vrs_2nd_krajina', 'RS', 'op:duvno:duvno_2', 'HRHB')).toBe(true);
    });

    it('faction-level block clears when Herzegovina truce is broken', () => {
        // Faction-level check uses isHerzegovinaTruceActive — if Herzegovina broken, faction-level also clears
        const state = makeActiveState();
        state.political.vienna_herzegovina_broken_by = 'RS';
        expect(shouldGrazBlockAttack(state, 'vrs_sarajevo_romanija', 'RS', 'op:kakanj:kakanj_2', 'HRHB')).toBe(false);
    });

    it('Kiseljak exclusion still blocks SRK even for non-Kiseljak OSID (via faction-level)', () => {
        const state = makeActiveState();
        expect(shouldGrazBlockAttack(state, 'vrs_sarajevo_romanija', 'RS', 'op:kiseljak:kiseljak_2', 'HRHB')).toBe(true);
    });

    it('does not block when Graz accords not yet active', () => {
        const state = makeActiveState();
        state.political.vienna_declaration_turn = undefined as any;
        expect(shouldGrazBlockAttack(state, 'vrs_sarajevo_romanija', 'RS', 'op:kakanj:kakanj_2', 'HRHB')).toBe(false);
    });
});
