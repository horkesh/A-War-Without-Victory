import { describe, expect, it } from 'vitest';

import { collectAttackerIds, compileTurnSummary } from '../src/sim/compile_turn_summary.js';
import type { AARSnapshot, TurnReport } from '../src/sim/turn_pipeline_types.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(turn: number): GameState {
    return {
        meta: { turn, phase: 'war', seed: 'f10-all-attackers' },
        political: { control_events: [], political_controllers: {} },
        military: { formations: {}, general_supply_reserve: {}, heavy_munitions_reserve: {} },
        displacement: { displacement_event_log: [] },
    } as unknown as GameState;
}

function makeSnapshot(turn: number): AARSnapshot {
    return {
        turn,
        supply: {},
        heavy_munitions: {},
        arcs: {},
        decoration_tiers: {},
        already_destroyed: new Set(),
        formation_ids: new Set(),
        formation_locations: {},
        supply_state_by_osid: {},
    };
}

function rawBattle(target: string, lead: string, stack?: string[]) {
    return {
        battle_id: `9:${target}:${lead}:null`,
        attacker_brigade: lead,
        ...(stack ? { attacker_brigades: stack } : {}),
        attacker_faction: 'RS',
        defender_faction: 'RBiH',
        target_osid: target,
        outcome: 'victory',
        power_ratio: 2,
        attacker_won: true,
        defender_brigade: null,
        snap_events: [],
        attacker_casualties: 10,
        defender_casualties: 20,
    };
}

function summarize(battles: ReturnType<typeof rawBattle>[]) {
    return compileTurnSummary(
        makeState(9),
        makeSnapshot(9),
        { attack_resolution_osid: { battles } } as unknown as TurnReport,
    );
}

describe('turn summary attacker records (realism audit F10)', () => {
    it('lists every attacking brigade from the resolver stack, lead first then strictCompare', () => {
        const summary = summarize([rawBattle('op:x:a', 'rs_c', ['rs_a', 'rs_b', 'rs_c'])]);

        expect(summary.battles).toHaveLength(1);
        expect(summary.battles[0]!.primary_attacker_id).toBe('rs_c');
        expect(summary.battles[0]!.all_attacker_ids).toEqual(['rs_c', 'rs_a', 'rs_b']);
        expect(summary.battles[0]!.was_concentrated).toBe(true);
    });

    it('falls back to the lead attacker for reports without the stack field', () => {
        const summary = summarize([rawBattle('op:x:a', 'rs_a')]);

        expect(summary.battles[0]!.all_attacker_ids).toEqual(['rs_a']);
        expect(summary.battles[0]!.was_concentrated).toBe(false);
    });

    it('does not mark a one-brigade stack as concentrated', () => {
        const summary = summarize([rawBattle('op:x:a', 'rs_a', ['rs_a'])]);

        expect(summary.battles[0]!.all_attacker_ids).toEqual(['rs_a']);
        expect(summary.battles[0]!.was_concentrated).toBe(false);
    });

    it('is independent of stack order and dedupes across raw entries for one target', () => {
        const a = collectAttackerIds([
            { attacker_brigade: 'rs_m', attacker_brigades: ['rs_z', 'rs_m', 'rs_b'] },
            { attacker_brigade: 'rs_q' },
        ]);
        const b = collectAttackerIds([
            { attacker_brigade: 'rs_m', attacker_brigades: ['rs_b', 'rs_m', 'rs_z'] },
            { attacker_brigade: 'rs_q', attacker_brigades: ['rs_q', 'rs_b'] },
        ]);

        expect(a).toEqual(['rs_m', 'rs_b', 'rs_q', 'rs_z']);
        expect(b).toEqual(a);
    });

    it('keeps one battle per target, ordered by OSID', () => {
        const summary = summarize([
            rawBattle('op:x:b', 'rs_b', ['rs_b', 'rs_d']),
            rawBattle('op:x:a', 'rs_a', ['rs_a']),
        ]);

        expect(summary.battles.map((b) => b.osid)).toEqual(['op:x:a', 'op:x:b']);
        expect(summary.battles.map((b) => b.all_attacker_ids)).toEqual([['rs_a'], ['rs_b', 'rs_d']]);
    });
});
