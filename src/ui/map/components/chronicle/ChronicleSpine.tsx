import React from 'react';
import { FACTION_HEX_COLORS } from '../../utils/theme.js';
import { turnToDateString } from '../../utils/formatters.js';

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

interface HorizontalRibbonProps {
    turnSummaries: Array<{
        turn: number;
        territory_snapshot?: Partial<Record<string, number>>;
    }>;
    /** Width per turn column in px (from layout). */
    turnWidths: Map<number, number>;
    /** Total turns range. */
    minTurn: number;
    maxTurn: number;
}

/**
 * Horizontal territory ribbon — the timeline spine.
 * Each turn's column shows a stacked bar of faction territory %.
 * Runs left-to-right (earliest → latest).
 */
export const ChronicleRibbon = React.memo(function ChronicleRibbon({
    turnSummaries,
    turnWidths,
    minTurn,
    maxTurn,
}: HorizontalRibbonProps) {
    const snapshots = React.useMemo(() => {
        const map = new Map<number, Partial<Record<string, number>>>();
        for (const s of turnSummaries) {
            if (s.territory_snapshot) map.set(s.turn, s.territory_snapshot);
        }
        return map;
    }, [turnSummaries]);

    // Interpolate: for turns without snapshots, use the last known snapshot
    const segments: Array<{ turn: number; width: number; snapshot: Partial<Record<string, number>> }> = [];
    let lastSnapshot: Partial<Record<string, number>> = {};
    for (let t = minTurn; t <= maxTurn; t++) {
        if (snapshots.has(t)) lastSnapshot = snapshots.get(t)!;
        segments.push({
            turn: t,
            width: turnWidths.get(t) ?? 80,
            snapshot: lastSnapshot,
        });
    }

    return (
        <div className="flex h-6 w-full">
            {segments.map((seg) => (
                <div
                    key={seg.turn}
                    className="flex h-full shrink-0"
                    style={{ width: `${seg.width}px` }}
                >
                    {FACTIONS.map((f) => {
                        const pct = (seg.snapshot[f] ?? 0) * 100;
                        return (
                            <div
                                key={f}
                                style={{
                                    width: `${pct}%`,
                                    backgroundColor: FACTION_HEX_COLORS[f],
                                    opacity: 0.85,
                                }}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
});

/** Scrubber at the bottom — one thin tick per turn. */
export const ChronicleRibbonScrubber = React.memo(function ChronicleRibbonScrubber({
    turnSummaries,
    minTurn,
    maxTurn,
    viewportFraction,
    viewportOffset,
    onClickTurn,
}: {
    turnSummaries: Array<{ turn: number; territory_snapshot?: Partial<Record<string, number>> }>;
    minTurn: number;
    maxTurn: number;
    /** 0..1 fraction of total width visible. */
    viewportFraction: number;
    /** 0..1 scroll position. */
    viewportOffset: number;
    onClickTurn: (turn: number) => void;
}) {
    const totalTurns = maxTurn - minTurn + 1;

    const snapshots = React.useMemo(() => {
        const map = new Map<number, Partial<Record<string, number>>>();
        for (const s of turnSummaries) {
            if (s.territory_snapshot) map.set(s.turn, s.territory_snapshot);
        }
        return map;
    }, [turnSummaries]);

    let lastSnap: Partial<Record<string, number>> = {};

    return (
        <div className="relative h-7 bg-black/60 border-t border-white/10 flex items-center px-2 select-none">
            {/* Turn ticks */}
            <div className="flex-1 flex h-3 rounded-sm overflow-hidden">
                {Array.from({ length: totalTurns }, (_, i) => {
                    const turn = minTurn + i;
                    if (snapshots.has(turn)) lastSnap = snapshots.get(turn)!;
                    // Dominant faction color for this tick
                    let maxPct = 0;
                    let color = '#333';
                    for (const f of FACTIONS) {
                        const pct = lastSnap[f] ?? 0;
                        if (pct > maxPct) { maxPct = pct; color = FACTION_HEX_COLORS[f]; }
                    }
                    return (
                            <button
                                type="button"
                                key={turn}
                                className="flex-1 cursor-pointer hover:opacity-100 transition-opacity border-0 p-0"
                                style={{ backgroundColor: color, opacity: 0.5 }}
                                onClick={() => onClickTurn(turn)}
                                aria-label={`Jump to ${turnToDateString(turn)} (Week ${turn})`}
                                title={`${turnToDateString(turn)} (Week ${turn})`}
                            />
                    );
                })}
            </div>

            {/* Viewport indicator */}
            <div
                className="absolute top-1 h-5 border border-amber-400/60 rounded-sm pointer-events-none"
                style={{
                    left: `${8 + viewportOffset * (100 - 1)}%`,
                    width: `${Math.max(viewportFraction * 100, 3)}%`,
                }}
            />
        </div>
    );
});
