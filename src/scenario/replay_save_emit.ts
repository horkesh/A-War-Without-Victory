/**
 * LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER — Replay save sequence emit.
 *
 * Pure read-only projection over `GameState` per turn. Produces the stream
 * artifact `replay_sequence.jsonl` (one line per turn, each line is a serialized
 * canonical GameState string), and at end-of-run produces the consolidated
 * `replay_save_sequence.json` (a JSON array of per-turn GameStates) which the
 * UI loader / VerdictScreen Replay tab consumes via Mission J's read-only
 * `replayPlayer()` consumer (see `src/sim/replay/replay_player.ts`).
 *
 * Engine ownership boundary: this module is harness-side only; the engine
 * pipeline never imports it. The scenario harness calls `serializeReplayFrame`
 * once per turn after `runTurn` returns, then calls `finalizeReplaySaveSequence`
 * once at end-of-run.
 *
 * --------------------------------------------------------------------------
 * Design call: SEPARATE ARTIFACT (not embedded in `final_save.json`)
 * --------------------------------------------------------------------------
 * The lane spec asked us to choose between (a) extending `final_save.json`
 * with a `replay_sequence?` field, or (b) producing a separate
 * `replay_save_sequence.json` artifact alongside `final_save.json`.
 *
 * Choice: (b) — separate artifact. Justification:
 *   1. **File size.** A 40w run × ~150KB serialized state ≈ 6 MB; a 188w
 *      campaign run ≈ 28 MB. Embedding in `final_save.json` would balloon
 *      the canonical save by 50× and break the "small, loadable, validatable"
 *      contract every existing save consumer assumes.
 *   2. **Loader compatibility.** `parseGameState()` (UI), `deserializeState()`
 *      (engine), and `validateState()` (validator) all consume `final_save.json`
 *      shape. Embedding GameState[] inside GameState would either pollute the
 *      validator surface or require a parallel field that breaks
 *      schema-version migration. Separate artifact = zero churn.
 *   3. **Hash invariance.** The lane gate requires `final_save.json` byte
 *      identity vs predecessor (n1627 / n1630). A separate artifact cannot
 *      drift the canonical save hash by construction.
 *   4. **Optionality.** Replay sequence is observability, not engine state.
 *      Saves should remain loadable even if the sequence file is missing
 *      (older saves, partial copies, manual saves).
 *
 * --------------------------------------------------------------------------
 * Determinism contract
 * --------------------------------------------------------------------------
 *  - Each frame is produced via `serializeState(state)` (canonical writer
 *    with deep sort already enforced by `serializeGameState`).
 *  - `finalizeReplaySaveSequence` accumulates frames in turn order (ascending
 *    week_index) — the harness is the sole producer and emits in lockstep with
 *    the per-turn loop, so no resort is needed.
 *  - No nondeterministic primitives (no RNG, no wall-clock timestamps,
 *    no locale-aware sort).
 *  - No engine state mutation. Pure read.
 */

import type { WriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GameState } from '../state/game_state.js';
import { serializeState } from '../state/serialize.js';

/** One row of the per-turn replay save stream (JSONL).
 *
 * Each row carries:
 *  - `week_index` (0-indexed harness week — mirrors `weekly_report.jsonl`)
 *  - `turn` (1-indexed engine turn number from `state.meta.turn`)
 *  - `state` (serialized canonical GameState string — single-line JSON)
 *
 * The `state` field is a STRING (not nested JSON) so the JSONL row is one
 * grep-able line and the consolidated file (`replay_save_sequence.json`) can
 * be assembled by re-parsing each row's serialized state, preserving exact
 * byte-stable canonical form.
 */
export interface ReplayFrameRow {
    week_index: number;
    turn: number;
    /** Canonical-serialized GameState. Re-parse via JSON.parse to obtain GameState. */
    state: string;
}

/**
 * Serialize a single replay frame for the per-turn JSONL stream. Pure / read-only.
 *
 * The serialized `state` field is the exact output of `serializeState()` — the
 * same canonical writer that produces `final_save.json`. Re-parseable into
 * `GameState` via `JSON.parse(row.state)` (or `deserializeState(row.state)`
 * if validation/migration is desired).
 */
export function buildReplayFrameRow(state: GameState, weekIndex: number): ReplayFrameRow {
    const turn = state.meta?.turn ?? 0;
    return {
        week_index: weekIndex,
        turn,
        state: serializeState(state),
    };
}

/**
 * Write one replay frame (current state snapshot) to an open JSONL stream.
 *
 * Mirrors `weekly_report.jsonl` and `brigade_temporal_log.jsonl` patterns —
 * the harness owns the stream lifecycle (open before week loop, close after).
 *
 * IMPORTANT: the row payload itself is JSON.stringify'd here (one line per
 * turn). The inner `state` field is already a serialized canonical string,
 * so this stringify does not re-canonicalize — it just wraps the row.
 */
export function writeReplayFrame(
    stream: WriteStream,
    state: GameState,
    weekIndex: number,
): void {
    const row = buildReplayFrameRow(state, weekIndex);
    // Wrap as a JSONL row. The inner `state` field is a string (already
    // canonical), so JSON.stringify here only escapes for line wrapping.
    stream.write(JSON.stringify(row) + '\n');
}

/**
 * At end-of-run, materialize the consolidated `replay_save_sequence.json`
 * artifact from the in-memory frame array. Frames must already be in turn
 * order (the harness produces them in lockstep with the per-turn loop).
 *
 * Output shape: a JSON array of GameState objects, one per turn, in turn
 * order. This is the exact shape Mission J's `replayPlayer()` consumes via
 * `LoadedGameState.replaySaveSequence`.
 *
 * Determinism: each frame's `state` string was produced by `serializeState()`,
 * which is the canonical writer. Re-parsing via `JSON.parse` and emitting
 * the array via `JSON.stringify` is deterministic because object key order
 * is preserved by V8 for re-parsed objects (and the canonical writer already
 * emitted keys in deep-sorted order).
 */
export async function finalizeReplaySaveSequence(
    outDir: string,
    frames: ReadonlyArray<ReplayFrameRow>,
): Promise<string> {
    await mkdir(outDir, { recursive: true });
    const sequencePath = join(outDir, 'replay_save_sequence.json');
    // Re-parse each canonical-serialized state into an object so the consolidated
    // artifact is a JSON array of GameStates (not an array of strings).
    const states: unknown[] = new Array(frames.length);
    for (let i = 0; i < frames.length; i++) {
        states[i] = JSON.parse(frames[i].state);
    }
    // Emit pretty-printed for human inspection / diff. Deterministic because
    // input state strings were produced by canonical writer (deep-sorted keys)
    // and JSON.parse + JSON.stringify preserves that order in V8.
    await writeFile(sequencePath, JSON.stringify(states, null, 2), 'utf8');
    return sequencePath;
}
