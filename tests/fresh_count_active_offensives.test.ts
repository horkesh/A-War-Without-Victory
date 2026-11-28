/**
 * FRESH-COUNT (rulings §74 item 2, §75; fable_consults/14_forecast_gap.md, appendix A).
 *
 * The multi-axis count `active_offensives_against_corps` is transient (never saved). It used
 * to be built by one war step, so earlier readers in the turn read last turn's value, or
 * nothing after a load: a resumed save made different launch decisions, and an operation
 * that entered execution in `advance-sector-offensives` was not counted by that turn's gate.
 * These tests fail on main 36352ff20 (no refresh in `runNamedPhase`).
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import type { NamedPhase, TurnContext } from '../src/sim/turn_pipeline_types.js';
import { runNamedPhase } from '../src/sim/turn_pipeline.js';
import {
    countActiveOffensivesAgainstCorps,
    withFreshActiveOffensivesCount,
} from '../src/sim/combat/active_offensives_count.js';
import { TRANSIENT_MILITARY_STATE_FIELDS } from '../src/state/serializeGameState.js';

type Op = { id: string; phase: string; type: string; objectives?: string[]; axes?: Array<{ objectives?: string[] }> };

function fixture(attackerOps: Op[], defenderOps: Op[] = []): GameState {
    return {
        meta: { phase: 'war', turn: 100 },
        political: { political_controllers: { 'op:x': 'RS', 'op:y': 'RS', 'op:z': 'RBiH' } },
        military: {
            formations: {
                corps_a: { id: 'corps_a', faction: 'RBiH' },
                corps_b: { id: 'corps_b', faction: 'RBiH' },
                corps_d: { id: 'corps_d', faction: 'RS' },
            },
            corps_command: {
                corps_a: { active_operations: attackerOps },
                corps_b: { active_operations: [] },
                corps_d: { active_operations: defenderOps },
            },
        },
    } as unknown as GameState;
}

function context(state: GameState): TurnContext {
    return { state, rng: () => 0, input: {}, report: { phases: [] } } as unknown as TurnContext;
}

describe('FRESH-COUNT: the multi-axis count is derived before every war step', () => {
    it('stays a transient field (never serialized)', () => {
        expect(TRANSIENT_MILITARY_STATE_FIELDS).toContain('active_offensives_against_corps');
    });

    it('counts enemy offensives in execution against the defender faction, and nothing else', () => {
        const state = fixture([
            { id: 'o1', phase: 'execution', type: 'sector_attack', objectives: ['op:x'] },
            { id: 'o2', phase: 'execution', type: 'general_offensive', axes: [{ objectives: ['op:z', 'op:y'] }] },
            { id: 'o3', phase: 'planning', type: 'sector_attack', objectives: ['op:x'] },
            { id: 'o4', phase: 'execution', type: 'probe', objectives: ['op:x'] },
            { id: 'o5', phase: 'execution', type: 'sector_attack', objectives: ['op:z'] },
        ], [{ id: 'd1', phase: 'execution', type: 'sector_attack', objectives: ['op:z'] }]);
        const before = JSON.stringify(state);
        // RS corps_d faces o1 and o2. Both RBiH corps face d1 (the count is per faction).
        expect(countActiveOffensivesAgainstCorps(state)).toEqual({ corps_a: 1, corps_b: 1, corps_d: 2 });
        expect(JSON.stringify(state)).toBe(before);
    });

    it('a step reads the count derived from state, not a stale or missing field (save and resume)', async () => {
        const state = fixture([
            { id: 'o1', phase: 'execution', type: 'sector_attack', objectives: ['op:x'] },
            { id: 'o2', phase: 'execution', type: 'sector_attack', objectives: ['op:y'] },
        ]);
        // As after a load: the transient field is absent.
        expect(state.military.active_offensives_against_corps).toBeUndefined();
        let seen: number | undefined;
        const reader: NamedPhase = { name: 'reader', run: (ctx) => { seen = ctx.state.military.active_offensives_against_corps?.corps_d; } };
        await runNamedPhase(context(state), reader, 'war');
        expect(seen).toBe(2);
        // As at the start of an uninterrupted turn: last turn's value is stale.
        state.military.active_offensives_against_corps = { corps_d: 5 };
        await runNamedPhase(context(state), reader, 'war');
        expect(seen).toBe(2);
    });

    it('an operation entering execution in one step is counted by the next step in the same turn', async () => {
        const state = fixture([
            { id: 'o1', phase: 'execution', type: 'sector_attack', objectives: ['op:x'] },
            { id: 'o2', phase: 'planning', type: 'sector_attack', objectives: ['op:y'] },
        ]);
        const ctx = context(state);
        const advance: NamedPhase = {
            name: 'advance-sector-offensives',
            run: (c) => { c.state.military.corps_command!.corps_a!.active_operations[1]!.phase = 'execution'; },
        };
        let gateCount: number | undefined;
        const gate: NamedPhase = { name: 'generate-bot-brigade-orders', run: (c) => { gateCount = c.state.military.active_offensives_against_corps?.corps_d; } };
        await runNamedPhase(ctx, advance, 'war');
        await runNamedPhase(ctx, gate, 'war');
        expect(gateCount).toBe(2);
    });

    it('a between-turn forecast reads a fresh count from a snapshot without mutating it', () => {
        const state = fixture([
            { id: 'o1', phase: 'execution', type: 'sector_attack', objectives: ['op:x'] },
            { id: 'o2', phase: 'execution', type: 'sector_attack', objectives: ['op:y'] },
        ]);
        state.military.active_offensives_against_corps = { corps_d: 1 };
        const before = JSON.stringify(state);
        const fresh = withFreshActiveOffensivesCount(state);
        expect(fresh.military.active_offensives_against_corps).toEqual({ corps_d: 2 });
        expect(JSON.stringify(state)).toBe(before);
    });
});
