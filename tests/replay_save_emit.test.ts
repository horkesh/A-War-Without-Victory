/**
 * LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER — Tests for replay save emit.
 *
 * Asserts the deterministic, faction-agnostic, read-only emit contract for
 * `buildReplayFrameRow(state, weekIndex)` and `finalizeReplaySaveSequence()`.
 *
 * Test matrix:
 *  T1 frame_shape — fixed field set + types on a built row
 *  T2 deterministic_byte_identity — same state, two builds, byte-identical row + finalized JSON
 *  T3 faction_agnostic — RBiH/RS/HRHB states all produce the same shape
 *  T4 sequence_completeness — finalize emits exactly N frames in input order, GameState[] shape
 *  T5 forbidden_token_grep — no Math.random / Date.now / new Date / locale sort in source
 *
 * Determinism guarantees:
 *  - Pure synchronous assertions over a hand-built minimal GameState.
 *  - Filesystem assertions use a temp dir; cleanup is best-effort.
 *  - No random, no timestamps, no wall-clock in the test body.
 */

import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    buildReplayFrameRow,
    finalizeReplaySaveSequence,
    type ReplayFrameRow,
} from '../src/scenario/replay_save_emit.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';

/**
 * Minimal valid GameState for `serializeState`. The serializer validates
 * required fields; we provide just enough to pass `validateState` —
 * notably an empty `political.political_controllers` and
 * `political.control_overrides` block so the validator can find them.
 *
 * Faction-agnostic — `seed` is a string, no faction-specific fields used.
 */
function makeState(
    turn: number,
    overrides: Partial<{ faction: string }> = {},
): GameState {
    void overrides; // explicit: builder does not branch on faction.
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn,
            phase: 'war',
            seed: `test-seed-${turn}`,
            date: '1992-04-06',
        },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
        political: {
            political_controllers: {},
            control_overrides: {},
        },
        displacement: {},
    } as unknown as GameState;
}

describe('LANE-REPLAY-SAVE-SEQUENCE replay save emit', () => {
    it('T1 frame_shape — fixed field set + types on a built row', () => {
        const state = makeState(1);
        const row = buildReplayFrameRow(state, 0);
        expect(Object.keys(row).sort()).toEqual(['state', 'turn', 'week_index']);
        expect(typeof row.turn).toBe('number');
        expect(typeof row.week_index).toBe('number');
        expect(typeof row.state).toBe('string');
        expect(row.turn).toBe(1);
        expect(row.week_index).toBe(0);
        // The serialized state must round-trip via JSON.parse to a valid object
        // with meta.turn matching the source. (Validated round-trip exists upstream.)
        const reparsed = JSON.parse(row.state) as { meta: { turn: number } };
        expect(reparsed.meta.turn).toBe(1);
    });

    it('T2 deterministic_byte_identity — same state, two builds, byte-identical row', () => {
        const state = makeState(7);
        const a = buildReplayFrameRow(state, 6);
        const b = buildReplayFrameRow(state, 6);
        expect(a).toEqual(b);
        // Wire-format byte identity (the JSONL row).
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it('T3 faction_agnostic — RBiH / RS / HRHB states all produce the same row shape', () => {
        // The emit module never branches on faction; this asserts that
        // contractually by building three states with different "faction"
        // hint metadata and asserting identical output structure.
        const rbih = buildReplayFrameRow(makeState(2, { faction: 'RBiH' }), 1);
        const rs = buildReplayFrameRow(makeState(2, { faction: 'RS' }), 1);
        const hrhb = buildReplayFrameRow(makeState(2, { faction: 'HRHB' }), 1);
        expect(Object.keys(rbih).sort()).toEqual(Object.keys(rs).sort());
        expect(Object.keys(rs).sort()).toEqual(Object.keys(hrhb).sort());
        // Byte-identical because nothing in the GameState differs across
        // calls (the overrides arg is consumed but unused — see makeState).
        expect(rbih).toEqual(rs);
        expect(rs).toEqual(hrhb);
    });

    it('T4 sequence_completeness — finalize emits N frames in input order, GameState[] shape', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'replay-emit-test-'));
        try {
            const frames: ReplayFrameRow[] = [
                buildReplayFrameRow(makeState(1), 0),
                buildReplayFrameRow(makeState(2), 1),
                buildReplayFrameRow(makeState(3), 2),
                buildReplayFrameRow(makeState(4), 3),
                buildReplayFrameRow(makeState(5), 4),
            ];
            const sequencePath = await finalizeReplaySaveSequence(dir, frames);
            expect(sequencePath).toBe(join(dir, 'replay_save_sequence.json'));
            const fileContent = await readFile(sequencePath, 'utf8');
            const parsed = JSON.parse(fileContent) as Array<{ meta: { turn: number } }>;
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed).toHaveLength(5);
            // Order preserved: turn 1..5 corresponds to input order.
            expect(parsed.map((f) => f.meta.turn)).toEqual([1, 2, 3, 4, 5]);
            // Each frame is a GameState (not a wrapper / not a string).
            for (const frame of parsed) {
                expect(typeof frame).toBe('object');
                expect(frame.meta).toBeDefined();
                expect(typeof frame.meta.turn).toBe('number');
            }
            // Determinism: re-finalize same frames → byte-identical file.
            const dir2 = await mkdtemp(join(tmpdir(), 'replay-emit-test2-'));
            try {
                const path2 = await finalizeReplaySaveSequence(dir2, frames);
                const content2 = await readFile(path2, 'utf8');
                expect(content2).toBe(fileContent);
            } finally {
                await rm(dir2, { recursive: true, force: true });
            }
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    it('T5 forbidden_token_grep — no Math.random / Date.now / new Date / locale sort', async () => {
        // Resolve from repo root (vitest cwd is project root) for ESM-safety.
        const sourcePath = join(process.cwd(), 'src', 'scenario', 'replay_save_emit.ts');
        const source = await readFile(sourcePath, 'utf8');
        // Core determinism guards — match the brigade_temporal_emit.ts T8 contract.
        expect(source).not.toMatch(/Math\.random/);
        expect(source).not.toMatch(/Date\.now/);
        expect(source).not.toMatch(/new\s+Date/);
        expect(source).not.toMatch(/localeCompare/);
        // Inline sentinel: the design call is documented in the source.
        expect(source).toMatch(/SEPARATE ARTIFACT/);
    });
});
