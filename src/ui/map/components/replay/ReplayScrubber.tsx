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
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { GameState } from '../../../../state/game_state.js';
import type { ReplaySaveManifest } from '../../../../sim/replay/replay_manifest.js';
import { buildReplayFrameSummary } from '../../../../sim/replay/replay_frame_summary.js';
import { replayPlayer } from '../../../../sim/replay/replay_player.js';
import { replaySummaryPlayer } from '../../../../sim/replay/replay_summary_player.js';

export interface ReplayScrubberProps {
    /** Save sequence (read-only). When empty/null, the scrubber renders an empty notice. */
    saveSequence?: readonly GameState[] | null | undefined;
    saveManifest?: ReplaySaveManifest | null | undefined;
    /** Optional full-frame map inspection callback. Hidden for sparse manifests. */
    onInspectFrame?: (frame: GameState, frameIndex: number) => void;
}

const REPLAY_AUTOPLAY_INTERVAL_MS = 650;

/**
 * Render a turn-by-turn scrubber for a finished war.
 *
 * Internal cursor state is React-local; the underlying player is recreated only
 * when the input sequence reference changes. No engine state is mutated.
 */
export function ReplayScrubber({ saveSequence, saveManifest, onInspectFrame }: ReplayScrubberProps): JSX.Element {
    const player = useMemo(
        () => replayPlayer(saveSequence ?? []),
        [saveSequence],
    );
    const summaryPlayer = useMemo(
        () => replaySummaryPlayer(saveManifest),
        [saveManifest],
    );

    const useManifest = player.getTurnCount() === 0 && summaryPlayer.getTurnCount() > 0;
    const turnCount = useManifest ? summaryPlayer.getTurnCount() : player.getTurnCount();
    const metadata = useMemo(
        () => (useManifest ? summaryPlayer.getMetadata() : player.getMetadata()),
        [player, summaryPlayer, useManifest],
    );

    // Cursor: local UI state. Defaults to first frame; clamped on every change.
    const [cursor, setCursor] = useState<number>(turnCount > 0 ? 0 : -1);
    const [isPlaying, setIsPlaying] = useState(false);
    const canStep = turnCount > 1;

    const onScrub = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = Number(e.target.value);
            const next = useManifest ? summaryPlayer.seekToTurn(raw) : player.seekToTurn(raw);
            setIsPlaying(false);
            setCursor(next);
        },
        [player, summaryPlayer, useManifest],
    );

    const onJump = useCallback(
        (idx: number) => {
            const next = useManifest ? summaryPlayer.seekToTurn(idx) : player.seekToTurn(idx);
            setIsPlaying(false);
            setCursor(next);
        },
        [player, summaryPlayer, useManifest],
    );

    const onStep = useCallback(
        (delta: number) => {
            const next = useManifest ? summaryPlayer.seekToTurn(cursor + delta) : player.seekToTurn(cursor + delta);
            setIsPlaying(false);
            setCursor(next);
        },
        [cursor, player, summaryPlayer, useManifest],
    );

    const onTogglePlay = useCallback(
        () => {
            if (isPlaying) {
                setIsPlaying(false);
                return;
            }
            if (!canStep) return;
            if (cursor >= turnCount - 1) {
                const next = useManifest ? summaryPlayer.seekToTurn(0) : player.seekToTurn(0);
                setCursor(next);
            }
            setIsPlaying(true);
        },
        [canStep, cursor, isPlaying, player, summaryPlayer, turnCount, useManifest],
    );

    useEffect(() => {
        if (!isPlaying || !canStep) return undefined;
        const intervalId = window.setInterval(() => {
            setCursor((currentCursor) => {
                const nextTarget = currentCursor + 1;
                const next = useManifest ? summaryPlayer.seekToTurn(nextTarget) : player.seekToTurn(nextTarget);
                if (next >= turnCount - 1) setIsPlaying(false);
                return next;
            });
        }, REPLAY_AUTOPLAY_INTERVAL_MS);
        return () => window.clearInterval(intervalId);
    }, [canStep, isPlaying, player, summaryPlayer, turnCount, useManifest]);

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

    const current = useManifest ? null : player.getTurn(cursor);
    const manifestFrame = useManifest ? summaryPlayer.getTurn(cursor) : null;
    const currentTurn =
        manifestFrame?.summary.turn
        ??
        (current as { turn?: number; metadata?: { turn?: number } } | null)?.turn
        ?? (current as { metadata?: { turn?: number } } | null)?.metadata?.turn
        ?? cursor;
    const currentDate =
        manifestFrame?.summary.date
        ?? (current as { metadata?: { date?: string } } | null)?.metadata?.date
        ?? null;
    const summary = manifestFrame?.summary ?? buildReplayFrameSummary(current);

    return (
        <div
            className="px-6 py-4 bg-panel-card/20 border-t border-panel-border"
            data-awwv-replay-surface="scrubber"
            data-awwv-replay-turn-count={turnCount}
            data-awwv-replay-cursor={cursor}
            data-awwv-replay-playback-status={isPlaying ? 'playing' : 'paused'}
            data-testid="replay-scrubber"
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
                {current && onInspectFrame && (
                    <button
                        type="button"
                        onClick={() => onInspectFrame(current, cursor)}
                        className="rounded border border-accent-gold/40 bg-accent-gold/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-accent-gold transition-colors hover:bg-accent-gold/20"
                        data-awwv-replay-inspect="true"
                    >
                        Inspect Map
                    </button>
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

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-text-secondary/70">
                <button
                    type="button"
                    onClick={() => onStep(-1)}
                    disabled={!canStep || cursor <= 0}
                    aria-label="Previous replay turn"
                    className="rounded border border-panel-border/70 bg-black/10 px-2 py-1 font-semibold text-text-secondary transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                    data-awwv-replay-step="prev"
                >
                    Prev
                </button>
                <button
                    type="button"
                    onClick={onTogglePlay}
                    disabled={!canStep}
                    aria-label={isPlaying ? 'Pause replay playback' : 'Play replay playback'}
                    className="rounded border border-accent-gold/40 bg-accent-gold/10 px-3 py-1 font-bold text-accent-gold transition-colors hover:bg-accent-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
                    data-awwv-replay-play-toggle="true"
                    data-awwv-replay-playback-status={isPlaying ? 'playing' : 'paused'}
                >
                    {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                    type="button"
                    onClick={() => onStep(1)}
                    disabled={!canStep || cursor >= turnCount - 1}
                    aria-label="Next replay turn"
                    className="rounded border border-panel-border/70 bg-black/10 px-2 py-1 font-semibold text-text-secondary transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                    data-awwv-replay-step="next"
                >
                    Next
                </button>
                <span className="ml-auto normal-case tracking-normal text-text-secondary/50">
                    {REPLAY_AUTOPLAY_INTERVAL_MS} ms / turn
                </span>
            </div>

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
