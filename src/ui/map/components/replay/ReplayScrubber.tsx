/**
 * LANE-NIGHTSHIFT-REPLAY-PLAYBACK-CONSUMER
 *
 * VerdictScreen Replay tab — turn-by-turn scrubber over a saved snapshot
 * sequence. Read-only. Does NOT advance turns, does NOT mutate engine state,
 * does NOT trigger any sim effects.
 *
 * The component owns local cursor state for the slider but delegates all
 * sequence reads to a ReplayPlayer instance constructed from a save sequence.
 * The player is the single source of read-truth; this file is presentation
 * only.
 *
 * Faction-agnostic. Visible only when the parent passes a non-empty sequence.
 */
import { useMemo, useState, useCallback } from 'react';
import type { GameState } from '../../../../state/game_state.js';
import { buildReplayFrameSummary } from '../../../../sim/replay/replay_frame_summary.js';
import { replayPlayer } from '../../../../sim/replay/replay_player.js';

export interface ReplayScrubberProps {
    /** Save sequence (read-only). When empty/null, the scrubber renders an empty notice. */
    saveSequence: readonly GameState[] | null | undefined;
}

/**
 * Render a turn-by-turn scrubber for a finished war.
 *
 * Internal cursor state is React-local; the underlying player is recreated only
 * when the input sequence reference changes. No engine state is mutated.
 */
export function ReplayScrubber({ saveSequence }: ReplayScrubberProps): JSX.Element {
    const player = useMemo(
        () => replayPlayer(saveSequence ?? []),
        [saveSequence],
    );

    const turnCount = player.getTurnCount();
    const metadata = useMemo(() => player.getMetadata(), [player]);

    // Cursor: local UI state. Defaults to first frame; clamped on every change.
    const [cursor, setCursor] = useState<number>(turnCount > 0 ? 0 : -1);

    const onScrub = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = Number(e.target.value);
            const next = player.seekToTurn(raw);
            setCursor(next);
        },
        [player],
    );

    const onJump = useCallback(
        (idx: number) => {
            const next = player.seekToTurn(idx);
            setCursor(next);
        },
        [player],
    );

    if (turnCount === 0) {
        return (
            <div
                className="px-6 py-4 text-[10px] text-text-secondary italic"
                data-awwv-replay-empty="true"
            >
                Replay is unavailable for this war &mdash; no saved snapshots.
            </div>
        );
    }

    const current = player.getTurn(cursor);
    const currentTurn =
        (current as { turn?: number; metadata?: { turn?: number } } | null)?.turn
        ?? (current as { metadata?: { turn?: number } } | null)?.metadata?.turn
        ?? cursor;
    const currentDate =
        (current as { metadata?: { date?: string } } | null)?.metadata?.date ?? null;
    const summary = buildReplayFrameSummary(current);

    return (
        <div
            className="px-6 py-4 bg-panel-card/20 border-t border-panel-border"
            data-awwv-replay-surface="scrubber"
            data-awwv-replay-turn-count={turnCount}
            data-awwv-replay-cursor={cursor}
        >
            <div className="text-[9px] uppercase tracking-[0.3em] text-text-secondary font-semibold mb-2">
                Replay &mdash; Scrub Your War
            </div>

            <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] text-text-secondary tabular-nums">
                    Turn {currentTurn}
                </span>
                {currentDate && (
                    <span className="text-[10px] text-text-primary font-mono">
                        {currentDate}
                    </span>
                )}
                <span className="text-[10px] text-text-secondary/60 ml-auto tabular-nums">
                    {cursor + 1} / {turnCount}
                </span>
            </div>

            <input
                type="range"
                min={0}
                max={turnCount - 1}
                step={1}
                value={cursor}
                onChange={onScrub}
                aria-label="Replay turn scrubber"
                className="w-full h-1.5 accent-accent-gold cursor-pointer"
                data-awwv-replay-input="slider"
            />

            <div className="flex items-center justify-between mt-2 text-[9px] text-text-secondary/70">
                <button
                    type="button"
                    onClick={() => onJump(0)}
                    className="px-2 py-0.5 rounded hover:bg-white/5 transition-colors"
                    data-awwv-replay-jump="first"
                >
                    {metadata.firstTurnDate ?? `Turn ${metadata.firstTurn ?? 0}`}
                </button>
                <button
                    type="button"
                    onClick={() => onJump(turnCount - 1)}
                    className="px-2 py-0.5 rounded hover:bg-white/5 transition-colors"
                    data-awwv-replay-jump="last"
                >
                    {metadata.lastTurnDate ?? `Turn ${metadata.lastTurn ?? turnCount - 1}`}
                </button>
            </div>

            <div
                className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-text-secondary sm:grid-cols-4"
                data-awwv-replay-summary="true"
            >
                <div className="min-w-0 rounded border border-panel-border/70 bg-black/10 px-2 py-2">
                    <div className="text-[8px] uppercase tracking-[0.18em] text-text-secondary/60">Active formations</div>
                    <div className="mt-1 font-mono text-text-primary tabular-nums">{summary.activeFormations}</div>
                </div>
                <div className="min-w-0 rounded border border-panel-border/70 bg-black/10 px-2 py-2">
                    <div className="text-[8px] uppercase tracking-[0.18em] text-text-secondary/60">Casualties</div>
                    <div className="mt-1 font-mono text-text-primary tabular-nums">{String(summary.totalCasualties)}</div>
                </div>
                <div className="min-w-0 rounded border border-panel-border/70 bg-black/10 px-2 py-2">
                    <div className="text-[8px] uppercase tracking-[0.18em] text-text-secondary/60">Displaced</div>
                    <div className="mt-1 font-mono text-text-primary tabular-nums">{String(summary.totalDisplaced)}</div>
                </div>
                <div className="min-w-0 rounded border border-panel-border/70 bg-black/10 px-2 py-2">
                    <div className="text-[8px] uppercase tracking-[0.18em] text-text-secondary/60">Control</div>
                    <div className="mt-1 break-words font-mono leading-relaxed text-text-primary tabular-nums">
                        {summary.controlByFaction.length === 0
                            ? 'n/a'
                            : summary.controlByFaction.map((row) => `${row.faction}:${row.osids}`).join(' ')}
                    </div>
                </div>
            </div>
        </div>
    );
}
