/**
 * LANE-NIGHTSHIFT-REPLAY-PLAYBACK-CONSUMER
 *
 * Read-only replay playback consumer.
 *
 * The save/load round-trip has been proven byte-identical (2026-04-15). This
 * module exposes a thin, deterministic player over a sequence of saved
 * GameState snapshots. It does NOT advance turns, does NOT mutate the engine,
 * and does NOT trigger any sim effects. It is purely a read-only seek/scrub
 * surface for the VerdictScreen Replay tab and any other post-run review UI.
 *
 * Determinism (Engine Invariants §11.1–§11.3):
 * - No Math.random, no Date.now, no timestamps.
 * - No sorting that depends on Object.keys insertion order; explicit sorted
 *   iteration via strictCompare where required.
 *
 * Faction-agnostic: the player only reads turn / metadata.date, never any
 * faction-specific field.
 */
import type { GameState } from '../../state/game_state.js';

// Use a structural subset of GameState so this module can also accept the
// LoadedGameState adapter shape that the UI hands back. Both share `turn` and
// optional `metadata.date`. We keep the public sequence type as `GameState[]`
// per the lane spec, but read access is through a narrow internal helper.
type ReplayFrameLike = {
    turn?: number;
    meta?: { turn?: number };
    metadata?: { turn?: number; date?: string };
};

/** Metadata describing a replay sequence. Pure / deterministic. */
export interface ReplayMetadata {
    /** Number of frames (turns) in the sequence. */
    turnCount: number;
    /** First-frame date string, or null when sequence is empty / lacks metadata. */
    firstTurnDate: string | null;
    /** Last-frame date string, or null when sequence is empty / lacks metadata. */
    lastTurnDate: string | null;
    /** First-frame turn number, or null when empty. */
    firstTurn: number | null;
    /** Last-frame turn number, or null when empty. */
    lastTurn: number | null;
}

/** Read-only replay player surface. */
export interface ReplayPlayer {
    /** Total turn count (== sequence length). */
    getTurnCount(): number;
    /** Current cursor index (0-based). Returns -1 for empty sequence. */
    getCurrentIndex(): number;
    /** Snapshot at the current cursor; null when empty. */
    getCurrent(): GameState | null;
    /** Snapshot at index; null when out-of-bounds or empty. */
    getTurn(turnIndex: number): GameState | null;
    /** Move cursor to clamped index. Returns the resulting cursor index. */
    seekToTurn(turnIndex: number): number;
    /** Pure metadata over the full sequence. */
    getMetadata(): ReplayMetadata;
}

function readDate(frame: ReplayFrameLike | undefined | null): string | null {
    if (!frame) return null;
    const d = frame.metadata?.date;
    return typeof d === 'string' && d.length > 0 ? d : null;
}

function readTurn(frame: ReplayFrameLike | undefined | null): number | null {
    if (!frame) return null;
    if (typeof frame.turn === 'number') return frame.turn;
    if (typeof frame.metadata?.turn === 'number') return frame.metadata!.turn!;
    if (typeof frame.meta?.turn === 'number') return frame.meta!.turn!;
    return null;
}

function clampIndex(index: number, length: number): number {
    if (length <= 0) return -1;
    // NaN → 0 (defensive default for malformed UI input).
    if (Number.isNaN(index)) return 0;
    // ±Infinity → clamp to range edges (Math.trunc preserves Infinity).
    if (index === Number.POSITIVE_INFINITY) return length - 1;
    if (index === Number.NEGATIVE_INFINITY) return 0;
    const i = Math.trunc(index);
    if (i < 0) return 0;
    if (i >= length) return length - 1;
    return i;
}

/**
 * Build a read-only replay player over a saved snapshot sequence.
 *
 * The sequence is NOT cloned — the player MUST NOT mutate it, and callers
 * should not expect the player to defend against external mutation. Callers
 * that need defensive copies should clone before constructing the player.
 *
 * Faction-agnostic: works for RBiH / RS / HRHB / any subset.
 */
export function replayPlayer(saveSequence: readonly GameState[]): ReplayPlayer {
    // Defensive: accept null / undefined as empty without crashing the UI.
    const frames: readonly GameState[] = Array.isArray(saveSequence) ? saveSequence : [];
    const length = frames.length;
    let cursor: number = length > 0 ? 0 : -1;

    const player: ReplayPlayer = {
        getTurnCount(): number {
            return length;
        },
        getCurrentIndex(): number {
            return cursor;
        },
        getCurrent(): GameState | null {
            if (cursor < 0 || cursor >= length) return null;
            return frames[cursor] ?? null;
        },
        getTurn(turnIndex: number): GameState | null {
            if (length === 0) return null;
            if (!Number.isFinite(turnIndex)) return null;
            const i = Math.trunc(turnIndex);
            if (i < 0 || i >= length) return null;
            return frames[i] ?? null;
        },
        seekToTurn(turnIndex: number): number {
            cursor = clampIndex(turnIndex, length);
            return cursor;
        },
        getMetadata(): ReplayMetadata {
            if (length === 0) {
                return {
                    turnCount: 0,
                    firstTurnDate: null,
                    lastTurnDate: null,
                    firstTurn: null,
                    lastTurn: null,
                };
            }
            const first = frames[0] as ReplayFrameLike | undefined;
            const last = frames[length - 1] as ReplayFrameLike | undefined;
            return {
                turnCount: length,
                firstTurnDate: readDate(first),
                lastTurnDate: readDate(last),
                firstTurn: readTurn(first),
                lastTurn: readTurn(last),
            };
        },
    };

    return player;
}
