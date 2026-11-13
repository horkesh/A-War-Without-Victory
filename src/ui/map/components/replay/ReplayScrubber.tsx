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
 *
 * Command Surface restyle (R8, sensitive-copy lane 2026-11-13): shared surface
 * parts, 13 px text floor, every string through i18n. Copy ruled on by the
 * Pyrrhic sensitive-history panel (record in SENSITIVE_HISTORY_DESIGN_GATE.md
 * §6).
 *
 * Casualty and displaced figures (replay real-totals lane, 2026-11-13; SC6):
 * `buildReplayFrameSummary` reads the engine's own records, the casualty ledger
 * for "Military casualties" (killed + wounded + missing/captured, all sides) and
 * the displacement aggregates for "Displaced or killed" (`refugees_created`,
 * which counts the killed, so §4 requires the label to say so). A figure the
 * frame does not record arrives as `null` and its card is hidden, never shown
 * as 0 (§4 "False zero"); v1 manifests, whose figures were always 0, read as
 * `null` for both.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { GameState } from '../../../../state/game_state.js';
import type { ReadableReplaySaveManifest } from '../../../../sim/replay/replay_manifest.js';
import { buildReplayFrameSummary } from '../../../../sim/replay/replay_frame_summary.js';
import { replayPlayer } from '../../../../sim/replay/replay_player.js';
import { replaySummaryPlayer } from '../../../../sim/replay/replay_summary_player.js';
import { getActiveLocale, t, useLocale } from '../../i18n';
import { formatCount, turnToDateString } from '../../utils/formatters';
import { FACTION_MILITARY_LABELS } from '../../utils/theme';
import {
    SURFACE_LABEL,
    SURFACE_LABEL_MUTED,
    SURFACE_PRIMARY_BUTTON_COMPACT,
    SURFACE_SECONDARY_BUTTON,
    SurfaceEmpty,
    SurfacePanel,
} from '../surface/Surface';

export interface ReplayScrubberProps {
    /** Save sequence (read-only). When empty/null, the scrubber renders an empty notice. */
    saveSequence?: readonly GameState[] | null | undefined;
    saveManifest?: ReadableReplaySaveManifest | null | undefined;
    /** Optional full-frame map inspection callback. Hidden for sparse manifests. */
    onInspectFrame?: (frame: GameState, frameIndex: number) => void;
}

const REPLAY_AUTOPLAY_INTERVAL_MS = 650;

/** BCS count forms: 1, 21, 31 … take the singular; 11 does not. */
function settlementCount(osids: number): string {
    const singular = getActiveLocale() === 'bcs'
        ? osids % 10 === 1 && osids % 100 !== 11
        : osids === 1;
    return t(singular ? 'replay.settlementsOne' : 'replay.settlementsMany', { count: osids });
}

function formatControlFactionTotal(faction: string, osids: number): string {
    const label = FACTION_MILITARY_LABELS[faction] ?? faction;
    return `${label} ${settlementCount(osids)}`;
}

function replayDateLabel(turn: number, date: string | null | undefined): string {
    return date?.trim() || turnToDateString(turn);
}

const STEP_BUTTON = `${SURFACE_SECONDARY_BUTTON} min-w-[6.5rem]`;
const JUMP_BUTTON =
    'min-h-11 rounded-md px-3 text-[15px] font-semibold tabular-nums text-[#c2b69c] transition hover:bg-[#1b2029] hover:text-[#f1e6c8]';

function ReplayFigure({ label, figure, children }: { label: string; figure?: string; children: React.ReactNode }) {
    return (
        <div className="min-w-0 rounded-md border border-[#262b35] bg-[#141821] px-4 py-3" data-awwv-replay-figure={figure}>
            <div className={SURFACE_LABEL_MUTED}>{label}</div>
            <div className="mt-1.5 break-words font-mono text-[18px] font-semibold leading-relaxed tabular-nums text-[#f1e6c8]">
                {children}
            </div>
        </div>
    );
}

/**
 * Render a turn-by-turn scrubber for a finished war.
 *
 * Internal cursor state is React-local; the underlying player is recreated only
 * when the input sequence reference changes. No engine state is mutated.
 */
export function ReplayScrubber({ saveSequence, saveManifest, onInspectFrame }: ReplayScrubberProps): JSX.Element {
    useLocale();
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
            <div data-awwv-replay-empty="true">
                <SurfaceEmpty title={t('replay.empty')} />
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
    const currentDateLabel = replayDateLabel(currentTurn, currentDate);
    const summary = manifestFrame?.summary ?? buildReplayFrameSummary(current);

    return (
        <div
            className="flex flex-col gap-4"
            data-awwv-replay-surface="scrubber"
            data-awwv-replay-turn-count={turnCount}
            data-awwv-replay-cursor={cursor}
            data-awwv-replay-playback-status={isPlaying ? 'playing' : 'paused'}
            data-testid="replay-scrubber"
        >
            <h4 className={`m-0 ${SURFACE_LABEL}`}>{t('replay.heading')}</h4>

            <SurfacePanel className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-[20px] font-semibold tabular-nums text-[#f6ecd2]">
                        {currentDateLabel}
                    </span>
                    <span className="font-mono text-[15px] tabular-nums text-[#b9ad94]">
                        {t('replay.position', { current: cursor + 1, total: turnCount })}
                    </span>
                    {current && onInspectFrame && (
                        <button
                            type="button"
                            onClick={() => onInspectFrame(current, cursor)}
                            className={`${SURFACE_SECONDARY_BUTTON} ml-auto`}
                            data-awwv-replay-inspect="true"
                        >
                            {t('replay.inspectMap')}
                        </button>
                    )}
                </div>

                <input
                    type="range"
                    min={0}
                    max={turnCount - 1}
                    step={1}
                    value={cursor}
                    onChange={onScrub}
                    aria-label={t('replay.turnScrubber')}
                    className="h-2 w-full cursor-pointer accent-[#c9a75c]"
                    data-awwv-replay-input="slider"
                />

                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => onJump(0)}
                        className={JUMP_BUTTON}
                        data-awwv-replay-jump="first"
                    >
                        {replayDateLabel(metadata.firstTurn ?? 0, metadata.firstTurnDate)}
                    </button>
                    <button
                        type="button"
                        onClick={() => onJump(turnCount - 1)}
                        className={JUMP_BUTTON}
                        data-awwv-replay-jump="last"
                    >
                        {replayDateLabel(metadata.lastTurn ?? turnCount - 1, metadata.lastTurnDate)}
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => onStep(-1)}
                        disabled={!canStep || cursor <= 0}
                        aria-label={t('replay.previousTurn')}
                        className={STEP_BUTTON}
                        data-awwv-replay-step="prev"
                    >
                        {t('replay.prev')}
                    </button>
                    <button
                        type="button"
                        onClick={onTogglePlay}
                        disabled={!canStep}
                        aria-label={isPlaying ? t('replay.pausePlayback') : t('replay.playPlayback')}
                        className={`${SURFACE_PRIMARY_BUTTON_COMPACT} min-w-[7rem]`}
                        data-awwv-replay-play-toggle="true"
                        data-awwv-replay-playback-status={isPlaying ? 'playing' : 'paused'}
                    >
                        {isPlaying ? t('replay.pause') : t('replay.play')}
                    </button>
                    <button
                        type="button"
                        onClick={() => onStep(1)}
                        disabled={!canStep || cursor >= turnCount - 1}
                        aria-label={t('replay.nextTurn')}
                        className={STEP_BUTTON}
                        data-awwv-replay-step="next"
                    >
                        {t('replay.next')}
                    </button>
                    <span className="ml-auto text-[15px] italic text-[#b9ad94]">
                        {t('replay.autoplayCadence')}
                    </span>
                </div>
            </SurfacePanel>

            <div
                className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]"
                data-awwv-replay-summary="true"
            >
                <ReplayFigure label={t('replay.activeFormations')}>{summary.activeFormations}</ReplayFigure>
                {summary.totalCasualties != null && (
                    <ReplayFigure label={t('replay.casualties')} figure="casualties">
                        {formatCount(summary.totalCasualties)}
                    </ReplayFigure>
                )}
                {summary.totalDisplacedOrKilled != null && (
                    <ReplayFigure label={t('replay.displacedOrKilled')} figure="displaced-or-killed">
                        {formatCount(summary.totalDisplacedOrKilled)}
                    </ReplayFigure>
                )}
                <ReplayFigure label={t('replay.control')}>
                    {summary.controlByFaction.length === 0
                        ? t('verdict.notRecorded')
                        : summary.controlByFaction.map((row) => formatControlFactionTotal(row.faction, row.osids)).join(', ')}
                </ReplayFigure>
            </div>
        </div>
    );
}
