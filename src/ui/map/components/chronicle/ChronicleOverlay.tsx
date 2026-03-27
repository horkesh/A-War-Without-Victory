import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { generateChronicleEntries } from './generateChronicleEntries.js';
import { ChronicleCard } from './ChronicleCard.js';
import { ChronicleRibbon, ChronicleRibbonScrubber } from './ChronicleSpine.js';
import { turnToDateString } from '../../utils/formatters.js';
import type { ChronicleEntry, ChronicleCardType } from './generateChronicleEntries.js';

/** Abbreviated date for column labels: "Dec 1992" */
function turnToShortDate(turn: number): string {
    const full = turnToDateString(turn); // "25 Dec 1992"
    const parts = full.split(' ');
    if (parts.length >= 3) return `${parts[1]} ${parts[2]}`;
    return full;
}

/** Full date for group headers: "25 Dec 1992" */
function turnToFullDate(turn: number): string {
    return turnToDateString(turn);
}

/** Minimum width for turns with no events. */
const EMPTY_TURN_WIDTH = 80;
/** Base width per event card. */
const CARD_WIDTH = 200;
/** Gap between cards within a turn. */
const CARD_GAP = 8;
/** Vertical gap between stacked cards. */
const CARD_STACK_GAP = 6;
/** Height of the ribbon. */
const RIBBON_HEIGHT = 24;
/** Stem drop zone between ribbon and first card. */
const STEM_TOP_MARGIN = 12;

const DOT_COLORS: Record<ChronicleCardType, string> = {
    combat: '#c04040',
    political: '#c4a35a',
    humanitarian: '#4080b8',
    military: '#4a9a55',
    diplomatic: '#8855aa',
    narrative: '#d5c9bc',
};

export function ChronicleOverlay() {
    const open = useGameStore(s => s.chronicleOpen);
    const setOpen = useGameStore(s => s.setChronicleOpen);
    const state = useGameStore(s => s.loadedGameState);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [viewportFraction, setViewportFraction] = useState(1);
    const [viewportOffset, setViewportOffset] = useState(0);
    const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
    const [selectedTurn, setSelectedTurn] = useState<number | null>(null);

    const turnSummaries = state?.turnSummaries ?? [];

    const entries = useMemo(() =>
        turnSummaries.length > 0 ? generateChronicleEntries(state) : [],
        [turnSummaries]
    );

    // Group entries by turn
    const turnGroups = useMemo(() => {
        const groups = new Map<number, ChronicleEntry[]>();
        for (const entry of entries) {
            const existing = groups.get(entry.turn) ?? [];
            existing.push(entry);
            groups.set(entry.turn, existing);
        }
        return groups;
    }, [entries]);

    // Compute turn range
    const minTurn = useMemo(() => {
        if (turnSummaries.length === 0) return 0;
        return Math.min(...turnSummaries.map(s => s.turn));
    }, [turnSummaries]);

    const maxTurn = useMemo(() => {
        if (turnSummaries.length === 0) return 0;
        return Math.max(...turnSummaries.map(s => s.turn));
    }, [turnSummaries]);

    useEffect(() => {
        if (!open) return;
        if (selectedTurn == null) {
            setSelectedTurn(maxTurn);
            return;
        }
        if (selectedTurn < minTurn || selectedTurn > maxTurn) {
            setSelectedTurn(maxTurn);
        }
    }, [open, selectedTurn, minTurn, maxTurn]);

    // Compute column widths: hybrid (empty=narrow, events=wide)
    const turnWidths = useMemo(() => {
        const widths = new Map<number, number>();
        for (let t = minTurn; t <= maxTurn; t++) {
            const group = turnGroups.get(t);
            if (!group || group.length === 0) {
                widths.set(t, EMPTY_TURN_WIDTH);
            } else {
                // Width = enough for cards side by side (max 2 per row) + padding
                const cols = Math.min(group.length, 2);
                widths.set(t, Math.max(cols * CARD_WIDTH + (cols - 1) * CARD_GAP + 32, CARD_WIDTH + 32));
            }
        }
        return widths;
    }, [minTurn, maxTurn, turnGroups]);

    const totalWidth = useMemo(() => {
        let w = 0;
        for (const v of turnWidths.values()) w += v;
        return w;
    }, [turnWidths]);

    // Scroll to end (latest turn) on open
    useEffect(() => {
        if (open && scrollRef.current) {
            requestAnimationFrame(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
                }
            });
        }
    }, [open]);

    // Track scroll position for scrubber viewport indicator
    const updateViewport = useCallback(() => {
        const el = scrollRef.current;
        if (!el || el.scrollWidth <= el.clientWidth) {
            setViewportFraction(1);
            setViewportOffset(0);
            return;
        }
        setViewportFraction(el.clientWidth / el.scrollWidth);
        setViewportOffset(el.scrollLeft / (el.scrollWidth - el.clientWidth));
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !open) return;
        el.addEventListener('scroll', updateViewport, { passive: true });
        updateViewport();
        return () => el.removeEventListener('scroll', updateViewport);
    }, [open, updateViewport]);

    // Mousewheel → horizontal scroll
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !open) return;
        const handler = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, [open]);

    const handleClose = useCallback(() => setOpen(false), [setOpen]);

    const toggleWeekExpanded = useCallback((turn: number) => {
        setExpandedWeeks(prev => {
            const next = new Set(prev);
            if (next.has(turn)) next.delete(turn);
            else next.add(turn);
            return next;
        });
    }, []);

    // ESC to close
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.preventDefault(); handleClose(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, handleClose]);

    // Scrubber click → scroll to turn
    const scrollToTurn = useCallback((turn: number) => {
        const el = scrollRef.current;
        if (!el) return;
        let offset = 0;
        for (let t = minTurn; t < turn; t++) {
            offset += turnWidths.get(t) ?? EMPTY_TURN_WIDTH;
        }
        el.scrollTo({ left: offset, behavior: 'smooth' });
    }, [minTurn, turnWidths]);

    if (!open || !state) return null;

    // Build turn columns
    const columns: React.ReactNode[] = [];
    for (let t = minTurn; t <= maxTurn; t++) {
        const width = turnWidths.get(t) ?? EMPTY_TURN_WIDTH;
        const group = turnGroups.get(t) ?? [];
        const hasEvents = group.length > 0;

        // Most significant event type for dot color
        const dotColor = hasEvents
            ? DOT_COLORS[group.find(e => e.headline)?.type ?? group[0].type]
            : undefined;

        columns.push(
            <div
                key={t}
                className="shrink-0 flex flex-col items-center relative"
                style={{ width: `${width}px` }}
            >
                {/* Dot on the ribbon line */}
                {hasEvents && (
                    <div
                        className="absolute rounded-full border-2 border-black/80 z-10"
                        style={{
                            width: group.some(e => e.headline) ? 12 : 8,
                            height: group.some(e => e.headline) ? 12 : 8,
                            backgroundColor: dotColor,
                            top: RIBBON_HEIGHT - (group.some(e => e.headline) ? 6 : 4),
                            left: '50%',
                            transform: 'translateX(-50%)',
                        }}
                    />
                )}

                {/* Turn label */}
                <div
                    className="text-[8px] font-mono text-stone-500 mt-1 select-none"
                    style={{ marginTop: RIBBON_HEIGHT + 2 }}
                >
                    {t % 4 === 0 || hasEvents ? turnToShortDate(t) : ''}
                </div>

                {/* Stem + cards */}
                {hasEvents && (
                    <div className="flex flex-col items-center w-full" style={{ marginTop: STEM_TOP_MARGIN }}>
                        {/* Vertical stem */}
                        <div
                            className="w-px bg-gradient-to-b from-stone-500/60 to-stone-700/20"
                            style={{ height: '20px' }}
                        />

                        {group.length === 1 ? (
                            /* Single entry — show card directly with date */
                            <div className="flex flex-col items-center" style={{ gap: `${CARD_STACK_GAP}px` }}>
                                <div className="text-[8px] font-mono text-stone-400 mb-1">
                                    {turnToFullDate(t)}
                                </div>
                                <ChronicleCard key={`${t}-${group[0].type}-0`} entry={group[0]} />
                            </div>
                        ) : (
                            /* Multiple entries — expandable group */
                            <div className="flex flex-col items-center w-full" style={{ gap: `${CARD_STACK_GAP}px` }}>
                                <button
                                    onClick={() => {
                                        setSelectedTurn(t);
                                        toggleWeekExpanded(t);
                                    }}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[9px] font-mono text-stone-300 hover:text-amber-300 transition-colors cursor-pointer select-none"
                                    style={{
                                        background: 'linear-gradient(135deg, #2a2520 0%, #1e1b18 100%)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        minWidth: '140px',
                                    }}
                                >
                                    <span className="text-amber-400/80">{turnToFullDate(t)}</span>
                                    <span className="text-stone-500">—</span>
                                    <span>{group.length} events</span>
                                    <span className="ml-auto text-[8px] text-stone-500">
                                        {expandedWeeks.has(t) ? '\u25B2' : '\u25BC'}
                                    </span>
                                </button>

                                {expandedWeeks.has(t) && (
                                    <div
                                        className="flex flex-col items-center"
                                        style={{
                                            gap: `${CARD_STACK_GAP}px`,
                                            maxHeight: '400px',
                                            overflowY: 'auto',
                                            scrollbarWidth: 'thin',
                                            scrollbarColor: '#555 #1a1a1a',
                                        }}
                                    >
                                        {group.map((entry, i) => (
                                            <ChronicleCard key={`${t}-${entry.type}-${i}`} entry={entry} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[1000] bg-black/92 backdrop-blur-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/8">
                <div className="flex items-center gap-3">
                    <h1
                        className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400/90"
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                        War Chronicle
                    </h1>
                    <span className="text-[9px] font-mono text-stone-500">
                        {entries.length} events — {turnToFullDate(minTurn)} – {turnToFullDate(maxTurn)}
                    </span>
                </div>
                <button
                    onClick={handleClose}
                    className="text-[10px] font-mono text-stone-500 hover:text-red-400 transition-colors uppercase tracking-wider"
                >
                    Close [ESC]
                </button>
            </div>

            {/* Main scrollable area: ribbon + stems + cards */}
            <div className="flex-1 flex min-h-0">
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-x-auto overflow-y-auto border-r border-white/8"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#555 #1a1a1a' }}
                >
                    {entries.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-stone-600 text-xs font-mono">
                                No events recorded yet. Advance turns to build your chronicle.
                            </p>
                        </div>
                    ) : (
                        <div style={{ width: `${totalWidth}px`, minHeight: '100%' }}>
                            {/* Territory ribbon */}
                            <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-sm border-b border-white/5">
                                <ChronicleRibbon
                                    turnSummaries={turnSummaries}
                                    turnWidths={turnWidths}
                                    minTurn={minTurn}
                                    maxTurn={maxTurn}
                                />
                            </div>

                            {/* Turn columns with stems and cards */}
                            <div className="flex">
                                {columns}
                            </div>
                        </div>
                    )}
                </div>

                <aside className="w-[360px] shrink-0 bg-black/35 backdrop-blur-sm flex flex-col min-h-0">
                    <div className="px-4 py-3 border-b border-white/8">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-amber-400/80 font-bold">
                            Chronicle Dossier
                        </div>
                        <div className="mt-1 text-[11px] text-text-primary font-semibold">
                            {selectedTurn != null ? turnToFullDate(selectedTurn) : 'No turn selected'}
                        </div>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-2 gap-2 border-b border-white/8 text-[10px]">
                        <div className="bg-black/20 border border-panel-border/40 rounded p-2">
                            <div className="text-text-secondary uppercase tracking-wide">Events</div>
                            <div className="text-text-primary font-bold">
                                {selectedTurn != null ? (turnGroups.get(selectedTurn)?.length ?? 0) : 0}
                            </div>
                        </div>
                        <div className="bg-black/20 border border-panel-border/40 rounded p-2">
                            <div className="text-text-secondary uppercase tracking-wide">Headline</div>
                            <div className="text-text-primary font-bold">
                                {selectedTurn != null
                                    ? (turnGroups.get(selectedTurn)?.some((e) => e.headline) ? 'Yes' : 'No')
                                    : 'No'}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                        {selectedTurn == null || (turnGroups.get(selectedTurn)?.length ?? 0) === 0 ? (
                            <div className="text-[11px] text-text-secondary italic">
                                Select a turn on the timeline to inspect its event dossier.
                            </div>
                        ) : (
                            (turnGroups.get(selectedTurn) ?? []).map((entry, i) => (
                                <div
                                    key={`${selectedTurn}-${entry.type}-${i}`}
                                    className="border border-panel-border/30 rounded p-2 bg-black/15"
                                >
                                    <ChronicleCard entry={entry} />
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            </div>

            {/* Scrubber strip */}
            {entries.length > 0 && (
                <ChronicleRibbonScrubber
                    turnSummaries={turnSummaries}
                    minTurn={minTurn}
                    maxTurn={maxTurn}
                    viewportFraction={viewportFraction}
                    viewportOffset={viewportOffset}
                    onClickTurn={scrollToTurn}
                />
            )}
        </div>
    );
}
