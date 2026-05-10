import type { ReplaySaveManifest } from './replay_manifest.js';
import type { ReplayFrameSummary } from './replay_frame_summary.js';
import type { ReplayMetadata } from './replay_player.js';

export interface ReplaySummaryFrame {
    summary: ReplayFrameSummary;
}

export interface ReplaySummaryPlayer {
    getTurnCount(): number;
    getCurrentIndex(): number;
    getCurrent(): ReplaySummaryFrame | null;
    getTurn(turnIndex: number): ReplaySummaryFrame | null;
    seekToTurn(turnIndex: number): number;
    getMetadata(): ReplayMetadata;
}

function clampIndex(index: number, length: number): number {
    if (length <= 0) return -1;
    if (Number.isNaN(index)) return 0;
    if (index === Number.POSITIVE_INFINITY) return length - 1;
    if (index === Number.NEGATIVE_INFINITY) return 0;
    const i = Math.trunc(index);
    if (i < 0) return 0;
    if (i >= length) return length - 1;
    return i;
}

export function replaySummaryPlayer(manifest: ReplaySaveManifest | null | undefined): ReplaySummaryPlayer {
    const summaries = manifest?.schema_version === 1 && Array.isArray(manifest.frames)
        ? manifest.frames
        : [];
    const frames: readonly ReplaySummaryFrame[] = summaries.map((summary) => ({ summary }));
    const length = frames.length;
    let cursor = length > 0 ? 0 : -1;

    return {
        getTurnCount(): number {
            return length;
        },
        getCurrentIndex(): number {
            return cursor;
        },
        getCurrent(): ReplaySummaryFrame | null {
            if (cursor < 0 || cursor >= length) return null;
            return frames[cursor] ?? null;
        },
        getTurn(turnIndex: number): ReplaySummaryFrame | null {
            if (length === 0 || !Number.isFinite(turnIndex)) return null;
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
            const first = frames[0]?.summary;
            const last = frames[length - 1]?.summary;
            return {
                turnCount: length,
                firstTurnDate: first?.date ?? null,
                lastTurnDate: last?.date ?? null,
                firstTurn: first?.turn ?? null,
                lastTurn: last?.turn ?? null,
            };
        },
    };
}
