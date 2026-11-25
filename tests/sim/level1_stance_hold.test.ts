/**
 * Engine Invariants §14.10c, Level-1 stance answers (lane C stance round 2, item 1): a Level-1
 * (Assisted) President's accept or refusal of a SET_STANCE proposal writes the 4-turn corps
 * `fixed` hold at the stance he chose. The hold survives the off-level-2 lapse while the game
 * stays at autonomy 1, is the last writer over the staff stance writers, and is inert headless.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CorpsCommandState, CorpsStance, FactionId, GameState } from '../../src/state/game_state.js';
import {
    clearCorpsHoldsForPresidentialOperation,
    isLevel1StanceAnswerHold,
    recordLevel1StanceAnswerHold,
    resolveStanceMatters,
    STANCE_HOLD_TURNS,
} from '../../src/sim/combat/stance_matters.js';
import { clampHeldCorpsStances } from '../../src/sim/combat/stance_matter_holds.js';
import { withoutComments } from '../helpers/sourceComments.js';

function makeState(opts: { autonomy?: 0 | 1 | 2 | 3; headless?: boolean; faction?: FactionId; turn?: number } = {}): GameState {
    const faction = opts.faction ?? 'RS';
    const cmd = (stance: CorpsStance) => ({
        command_span: 3, subordinate_count: 3, og_slots: 1, active_ogs: [], corps_exhaustion: 0,
        stance, active_operations: [],
    }) as unknown as CorpsCommandState;
    return {
        schema_version: 1,
        meta: {
            turn: opts.turn ?? 20, phase: 'war', seed: 'test', player_faction: faction,
            headless_scenario_auto_control: opts.headless ?? false, autonomy_level: opts.autonomy ?? 1,
        },
        factions: [{ id: faction }],
        military: {
            formations: {
                c_a: { id: 'c_a', faction, name: 'A', created_turn: 0, status: 'active', assignment: null, kind: 'corps' },
                c_x: { id: 'c_x', faction: 'RBiH', name: 'X', created_turn: 0, status: 'active', assignment: null, kind: 'corps' },
            },
            corps_command: { c_a: cmd('balanced'), c_x: cmd('balanced') },
            corps_front_sectors: {},
        },
        political: {},
    } as unknown as GameState;
}

/** One pipeline turn of the relevant steps: resolve, the staff writes a stance, the hold clamps. */
function advance(state: GameState, staffStance: CorpsStance): void {
    resolveStanceMatters(state);
    state.military.corps_command!.c_a!.stance = staffStance;
    clampHeldCorpsStances(state, state.meta.player_faction!);
    state.meta.turn += 1;
}

describe('Level-1 stance answer hold (§14.10c)', () => {
    it('a refusal holds the current stance for four turns against the staff writer, then releases', () => {
        const state = makeState();
        expect(recordLevel1StanceAnswerHold(state, 'c_a', 'balanced', 'PROP_19_military_0')).toBe(true);
        const hold = state.military.stance_matter_state!.holds[0]!;
        expect(isLevel1StanceAnswerHold(hold)).toBe(true);
        expect(hold).toMatchObject({ scope: 'corps', mode: 'fixed', stance: 'balanced', effective_from_turn: 20, until_turn: 20 + STANCE_HOLD_TURNS - 1 });
        for (let i = 0; i < STANCE_HOLD_TURNS; i++) {
            advance(state, 'offensive');
            expect(state.military.corps_command!.c_a!.stance).toBe('balanced');
        }
        advance(state, 'offensive');
        expect(state.military.corps_command!.c_a!.stance).toBe('offensive');
        expect(state.military.stance_matter_state!.holds).toEqual([]);
    });

    it('an acceptance holds the proposed stance', () => {
        const state = makeState();
        recordLevel1StanceAnswerHold(state, 'c_a', 'defensive', 'PROP_19_military_0');
        advance(state, 'offensive');
        expect(state.military.corps_command!.c_a!.stance).toBe('defensive');
    });

    it('survives the off-level-2 lapse at autonomy 1, and lapses on a change to another level', () => {
        const state = makeState();
        recordLevel1StanceAnswerHold(state, 'c_a', 'balanced', 'PROP_19_military_0');
        advance(state, 'offensive');
        expect(state.military.stance_matter_state!.holds).toHaveLength(1);
        state.meta.autonomy_level = 3;
        advance(state, 'offensive');
        expect(state.military.stance_matter_state!.holds).toEqual([]);
        expect(state.meta.stance_matter_history?.some((r) => r.outcome === 'hold_lapsed' && r.lapse_reason === 'autonomy_changed')).toBe(true);
    });

    it('the President\'s own operation clears it with a receipt line', () => {
        const state = makeState();
        recordLevel1StanceAnswerHold(state, 'c_a', 'defensive', 'PROP_19_military_0');
        clearCorpsHoldsForPresidentialOperation(state, 'c_a', 20);
        expect(state.military.stance_matter_state!.holds).toEqual([]);
        expect(state.meta.stance_matter_history?.some((r) => r.corps_id === 'c_a' && r.outcome === 'hold_lapsed' && r.lapse_reason === 'presidential_operation')).toBe(true);
    });

    it('writes nothing off autonomy 1, headless, for another faction\'s corps, or for a non-stance value', () => {
        for (const autonomy of [0, 2, 3] as const) {
            const s = makeState({ autonomy });
            expect(recordLevel1StanceAnswerHold(s, 'c_a', 'balanced', 'p')).toBe(false);
            expect(s.military.stance_matter_state).toBeUndefined();
        }
        const headless = makeState({ headless: true });
        expect(recordLevel1StanceAnswerHold(headless, 'c_a', 'balanced', 'p')).toBe(false);
        const other = makeState();
        expect(recordLevel1StanceAnswerHold(other, 'c_x', 'balanced', 'p')).toBe(false);
        expect(recordLevel1StanceAnswerHold(other, 'c_a', 'attack', 'p')).toBe(false);
        expect(other.military.stance_matter_state).toBeUndefined();
    });

    it('a second answer on the same corps replaces the first hold', () => {
        const state = makeState();
        recordLevel1StanceAnswerHold(state, 'c_a', 'balanced', 'PROP_19_military_0');
        state.meta.turn = 22;
        recordLevel1StanceAnswerHold(state, 'c_a', 'defensive', 'PROP_21_military_0');
        expect(state.military.stance_matter_state!.holds).toHaveLength(1);
        expect(state.military.stance_matter_state!.holds[0]).toMatchObject({ stance: 'defensive', effective_from_turn: 22, until_turn: 25 });
    });
});

describe('Level-1 stance answer hold: writers (source scan)', () => {
    const root = resolve(__dirname, '../..');
    const read = (rel: string) => withoutComments(readFileSync(resolve(root, rel), 'utf8'));

    it('both Level-1 SET_STANCE answers (accept and reject) write the hold', () => {
        const main = read('src/desktop/electron-main.cjs');
        expect(main.match(/sim\.recordLevel1StanceAnswerHold\(state, corpsId, /g)?.length).toBe(2);
        expect(read('src/desktop/desktop_sim.ts')).toContain('recordLevel1StanceAnswerHold');
    });

    it('the AI corps commander respects the President\'s order and hold', () => {
        const src = read('src/sim/ai_commander/corps_commander_ai.ts');
        expect(src).toMatch(/if \(cc\.player_ordered_stance == null\)/);
        expect(src).toContain('applyCorpsHoldToStance(state, faction, corpsId, derivedStance');
    });
});
