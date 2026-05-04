/**
 * LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER — Replay save sequence emit.
 * LANE-NIGHTSHIFT-REPLAY-BUFFER-STREAMING — Streaming finalize (2026-05-05).
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
 * once per turn after `runTurn` returns, then calls
 * `streamFinalizeReplaySaveSequenceFromJsonl` once at end-of-run to materialize
 * the consolidated JSON from the on-disk JSONL stream WITHOUT keeping all frames
 * resident in memory.
 *
 * --------------------------------------------------------------------------
 * Why streaming finalize? (LANE-NIGHTSHIFT-REPLAY-BUFFER-STREAMING)
 * --------------------------------------------------------------------------
 * The original implementation accumulated every per-turn frame into a
 * `ReplayFrameRow[]` array, then re-parsed each frame and emitted a single
 * `JSON.stringify(states, null, 2)` payload. At 188w, this collapsed the V8
 * heap (4.4 GB replay buffer + final-save serialization saturated the 8 GB
 * cap) and prevented `run_summary.json` emission, blocking the
 * `final_state_hash` gate that future calibration lanes depend on.
 *
 * The fix: keep the JSONL stream as the single source of truth (it already
 * mirrors the proven Wave 5 `brigade_temporal_log.jsonl` chunked-write
 * pattern). At end-of-run, stream-read the JSONL line-by-line and stream-write
 * the consolidated JSON array. Peak memory is now bounded by the largest
 * single frame (~25 MB at 188w) instead of the cumulative sequence (~4.4 GB).
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
 *      campaign run ≈ 28 MB+. Embedding in `final_save.json` would balloon
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
 *  - The harness emits frames in lockstep with the per-turn loop, so JSONL
 *    line order is the canonical replay order. The streaming finalizer
 *    preserves that order line-by-line.
 *  - Consolidated output format is COMPACT JSON: `[<state1>,<state2>,...]`
 *    where each `<stateN>` is the canonical serialized GameState string from
 *    the JSONL. No re-formatting, no pretty-printing — bytes are a function
 *    of the JSONL bytes plus fixed delimiters. This is what guarantees the
 *    G1 byte-identity gate.
 *  - No nondeterministic primitives (no RNG, no wall-clock timestamps,
 *    no locale-aware sort).
 *  - No engine state mutation. Pure read.
 */

import type { WriteStream } from 'node:fs';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createInterface } from 'node:readline';
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
 * Compose one frame's contribution to the consolidated array. Given a JSONL
 * row's parsed object (or a `ReplayFrameRow`), returns the inner canonical
 * state string. Pure helper — no I/O, no allocation beyond the return value.
 */
function extractStateString(row: { state?: unknown }): string {
    const s = row?.state;
    if (typeof s !== 'string') {
        throw new Error(
            'replay_save_emit: malformed JSONL row — `state` field is not a string',
        );
    }
    return s;
}

/**
 * Stream-finalize the consolidated `replay_save_sequence.json` from the
 * per-turn `replay_sequence.jsonl` stream on disk. Bounded peak memory:
 * one frame's serialized state at a time, never the whole sequence.
 *
 * Output format (COMPACT, byte-deterministic):
 *   `[` `<state1>` `,` `<state2>` `,` ... `,` `<stateN>` `]`
 *
 * Each `<stateK>` is the canonical-serialized GameState from JSONL line K
 * (the inner `state` field of each row), passed through verbatim — no
 * re-format, no re-parse, no re-stringify. The consumer (`replayPlayer`)
 * calls `JSON.parse` on the file, which yields a `GameState[]` byte-stable
 * to the engine's canonical writer.
 *
 * Determinism:
 *  - Reads JSONL line-by-line in disk order (harness emits in turn order).
 *  - Output is a deterministic function of the JSONL contents plus three
 *    fixed delimiter strings (`[`, `,`, `]`).
 *  - No re-sort, no re-parse, no platform-dependent newline handling
 *    (`readline` strips trailing `\r` / `\n` uniformly).
 *
 * Sensitive-history compliance: faction-agnostic; iterates lines in the
 * order produced by the harness; no field-by-field inspection of GameState.
 *
 * Returns the path of the consolidated artifact.
 */
export async function streamFinalizeReplaySaveSequenceFromJsonl(
    outDir: string,
    jsonlPath: string,
): Promise<string> {
    await mkdir(outDir, { recursive: true });
    const sequencePath = join(outDir, 'replay_save_sequence.json');
    const out = createWriteStream(sequencePath, { flags: 'w', encoding: 'utf8' });

    // Helper: await a write stream `write` call so backpressure is honored.
    // Without this, very large frames (~25 MB at 188w) can blow the internal
    // buffer cap on slow disks. The pattern is the same one used by
    // `brigade_temporal_log.jsonl` (which writes per-line through a single
    // shared stream and is proven stable at 188w / 23.4 MB).
    const writeChunk = (chunk: string): Promise<void> =>
        new Promise<void>((resolve, reject) => {
            const ok = out.write(chunk, (err) => {
                if (err) reject(err);
            });
            if (ok) resolve();
            else out.once('drain', () => resolve());
        });

    const closeStream = (): Promise<void> =>
        new Promise<void>((resolve, reject) => {
            out.on('finish', () => resolve());
            out.on('error', (err) => reject(err));
            out.end();
        });

    // Open JSONL for line-by-line read. `readline` handles arbitrary line
    // length and strips trailing CR/LF uniformly — important for
    // cross-platform byte-identity.
    const inputStream = createReadStream(jsonlPath, { encoding: 'utf8' });
    const rl = createInterface({ input: inputStream, crlfDelay: Infinity });

    await writeChunk('[');
    let firstFrame = true;
    try {
        for await (const line of rl) {
            if (line.length === 0) continue; // tolerate trailing newline
            const row = JSON.parse(line) as { state?: unknown };
            const stateStr = extractStateString(row);
            if (!firstFrame) {
                await writeChunk(',');
            }
            await writeChunk(stateStr);
            firstFrame = false;
        }
    } finally {
        rl.close();
        inputStream.close();
    }
    await writeChunk(']');
    await closeStream();
    return sequencePath;
}

/**
 * Stream-finalize from an in-memory `ReplayFrameRow[]`. Used by the existing
 * test surface and by callers that already hold the frame array in memory
 * (small scenarios where buffering is acceptable).
 *
 * Output format is identical to `streamFinalizeReplaySaveSequenceFromJsonl`
 * — `[<state1>,<state2>,...]` compact — so the G1 byte-identity gate holds:
 * for a given input frame sequence, both finalizers produce byte-identical
 * `replay_save_sequence.json`.
 *
 * Backwards-compatible signature: the existing call site (test T4) and the
 * existing return-path semantics are preserved.
 */
export async function finalizeReplaySaveSequence(
    outDir: string,
    frames: ReadonlyArray<ReplayFrameRow>,
): Promise<string> {
    await mkdir(outDir, { recursive: true });
    const sequencePath = join(outDir, 'replay_save_sequence.json');
    const out = createWriteStream(sequencePath, { flags: 'w', encoding: 'utf8' });

    const writeChunk = (chunk: string): Promise<void> =>
        new Promise<void>((resolve, reject) => {
            const ok = out.write(chunk, (err) => {
                if (err) reject(err);
            });
            if (ok) resolve();
            else out.once('drain', () => resolve());
        });

    const closeStream = (): Promise<void> =>
        new Promise<void>((resolve, reject) => {
            out.on('finish', () => resolve());
            out.on('error', (err) => reject(err));
            out.end();
        });

    await writeChunk('[');
    for (let i = 0; i < frames.length; i++) {
        if (i > 0) {
            await writeChunk(',');
        }
        await writeChunk(extractStateString(frames[i]));
    }
    await writeChunk(']');
    await closeStream();
    return sequencePath;
}
