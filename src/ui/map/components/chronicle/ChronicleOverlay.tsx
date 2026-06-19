import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { generateChronicleEntries } from './generateChronicleEntries.js';
import { loadEventDefinitionsFull } from '../../data/DataLoader.js';
import type { EventDefinition } from '../../../../sim/events/event_types.js';
import { ChronicleCard } from './ChronicleCard.js';
import { ChronicleRibbon, ChronicleRibbonScrubber } from './ChronicleSpine.js';
import { CHRONICLE_FILTERS, chronicleFilterLabel, countChronicleEntriesByFilter, filterChronicleEntries } from './ChronicleReviewFilters.js';
import { turnToDateString } from '../../utils/formatters.js';
import { openArmyHQAftermathRecord, openArmyHQOperationHistory } from '../../utils/shellNavigation.js';
import {
    buildChronicleCampaignRecap,
    buildChronicleChapters,
    chronicleTypeLabel,
    formatChronicleBoundaryKind,
    formatChronicleChapterDateRange,
} from '../../data/chronicleChapters.js';
import type { ChronicleEntry, ChronicleCardType } from './generateChronicleEntries.js';
import type { ChronicleFilterId } from './ChronicleReviewFilters.js';
import type { ChronicleChapter } from '../../data/chronicleChapters.js';
import { EmptyState } from '../EmptyState.js';
import { Z } from '../../../shared/zIndex.js';
import { t } from '../../i18n';

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
    cost: '#d28a3a',
    personnel: '#75a9b8',
    consequence: '#b8924a',
};

export type ChronicleViewMode = 'entries' | 'chapters';

interface ChronicleViewModeToggleProps {
    mode: ChronicleViewMode;
    activeFilterLabel: string;
    chapterCount: number;
    onModeChange: (mode: ChronicleViewMode) => void;
}

export function ChronicleViewModeToggle({
    mode,
    activeFilterLabel,
    chapterCount,
    onModeChange,
}: ChronicleViewModeToggleProps) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex rounded-sm border border-white/10 bg-black/25 p-0.5">
                {(['entries', 'chapters'] as const).map(option => {
                    const active = option === mode;
                    const label = option === 'entries' ? t('chronicle.mode.entries') : t('chronicle.mode.chapters');
                    return (
                        <button
                            key={option}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onModeChange(option)}
                            className={[
                                'h-6 min-w-[70px] rounded-sm px-2 font-mono text-[8px] uppercase transition-colors',
                                active
                                    ? 'bg-stone-200/15 text-stone-100'
                                    : 'text-stone-500 hover:text-stone-300',
                            ].join(' ')}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
            <span className="text-[9px] font-mono text-stone-500">
                {t('chronicle.lens', { label: activeFilterLabel })}
            </span>
            <span className="text-[9px] font-mono text-stone-600">
                {t('chronicle.chapterCount', { count: chapterCount })}
            </span>
        </div>
    );
}

function ChronicleChapterView({
    chapters,
    onSelectTurn,
    onOpenTurnRecord,
}: {
    chapters: ChronicleChapter[];
    onSelectTurn: (turn: number) => void;
    onOpenTurnRecord: (turn: number) => void;
}) {
    if (chapters.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-xs font-mono text-stone-600">{t('chronicle.noChapters')}</p>
            </div>
        );
    }

    const recap = buildChronicleCampaignRecap(chapters);
    const recapThread = recap ? chronicleFilterLabel(CHRONICLE_FILTERS.find(filter => filter.id === recap.dominantType) ?? CHRONICLE_FILTERS[0]) : '';

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-5">
            {recap && (
                <section
                    className="rounded-sm border border-amber-400/20 bg-amber-950/10 px-4 py-3"
                    aria-label={t('chronicle.recapTitle')}
                >
                    <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-amber-300/80">
                        {t('chronicle.recapTitle')}
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-stone-300">
                        {t('chronicle.recapBody', {
                            chapters: recap.chapterCount,
                            range: recap.monthRange,
                            entries: recap.entryCount,
                            thread: recapThread,
                            headlines: recap.headlineCount,
                        })}
                    </p>
                    <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.08em] text-stone-500">
                        {t('chronicle.recapArc', {
                            opening: recap.openingChapterTitle,
                            closing: recap.closingChapterTitle,
                            signals: recap.signalChapterCount,
                        })}
                    </p>
                </section>
            )}
            {chapters.map(chapter => (
                <section
                    key={chapter.id}
                    className="border-b border-white/8 pb-4"
                    aria-label={chapter.title}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-stone-500">
                                {chapter.monthLabels.join(' / ')}
                            </div>
                            <h2
                                className="mt-1 text-base font-semibold text-amber-200"
                                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                            >
                                {chapter.title}
                            </h2>
                            <p className="mt-1 text-[11px] font-mono text-stone-400">
                                {chapter.summary} | {formatChronicleChapterDateRange(chapter)}
                            </p>
                        </div>
                        <div className="shrink-0 text-right text-[9px] font-mono uppercase text-stone-500">
                            {formatChronicleBoundaryKind(chapter.boundaryKind)}
                        </div>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {chapter.entries.map(ref => (
                            <div
                                key={ref.sourceEntryId}
                                className="rounded-sm border border-panel-border/30 bg-black/20 p-2 text-left"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[8px] font-mono uppercase text-stone-500">
                                        {turnToFullDate(ref.turn)} | {chronicleTypeLabel(ref.type)}
                                    </span>
                                    {ref.headline && (
                                        <span className="text-[8px] font-mono uppercase text-amber-300">{t('chronicle.headline')}</span>
                                    )}
                                </div>
                                <div className="mt-1 text-[11px] leading-snug text-stone-200">
                                    {ref.title}
                                </div>
                                <div className="mt-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onSelectTurn(ref.turn)}
                                        className="h-6 rounded-sm border border-white/10 px-2 text-[8px] font-bold uppercase tracking-[0.12em] text-stone-300 hover:border-stone-400/60"
                                    >
                                        {t('chronicle.select')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onOpenTurnRecord(ref.turn)}
                                        className="h-6 rounded-sm border border-amber-400/25 px-2 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-200 hover:border-amber-300/70"
                                    >
                                        {t('chronicle.openTurnRecord')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

export function ChronicleOverlay() {
    const open = useGameStore(s => s.chronicleOpen);
    const setOpen = useGameStore(s => s.setChronicleOpen);
    const state = useGameStore(s => s.loadedGameState);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [viewportFraction, setViewportFraction] = useState(1);
    const [viewportOffset, setViewportOffset] = useState(0);
    const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
    const [selectedTurn, setSelectedTurn] = useState<number | null>(null);
    const [activeFilter, setActiveFilter] = useState<ChronicleFilterId>('all');
    const [viewMode, setViewMode] = useState<ChronicleViewMode>('entries');

    const turnSummaries = state?.turnSummaries ?? [];

    // Full event catalog for the consequence-receipt chronicle cards
    // (promise→receipt loop). Cached by the loader; absent → receipt cards
    // simply do not appear. Only loaded while the overlay is open.
    const [eventCatalogFull, setEventCatalogFull] = useState<ReadonlyMap<string, EventDefinition> | undefined>(undefined);
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        loadEventDefinitionsFull()
            .then((catalog) => { if (!cancelled) setEventCatalogFull(catalog); })
            .catch(() => { /* non-fatal: receipt cards degrade to absent */ });
        return () => { cancelled = true; };
    }, [open]);

    const allEntries = useMemo(() =>
        state ? generateChronicleEntries(state, eventCatalogFull) : [],
        [state, eventCatalogFull]
    );

    const entryCounts = useMemo(() => countChronicleEntriesByFilter(allEntries), [allEntries]);

    const filteredEntries = useMemo(() => filterChronicleEntries(allEntries, activeFilter), [activeFilter, allEntries]);

    const activeFilterLabel = chronicleFilterLabel(
        CHRONICLE_FILTERS.find(filter => filter.id === activeFilter) ?? CHRONICLE_FILTERS[0],
    );

    const chapters = useMemo(() => buildChronicleChapters(filteredEntries, state), [filteredEntries, state]);

    // Group filtered entries by turn
    const turnGroups = useMemo(() => {
        const groups = new Map<number, ChronicleEntry[]>();
        for (const entry of filteredEntries) {
            const existing = groups.get(entry.turn) ?? [];
            existing.push(entry);
            groups.set(entry.turn, existing);
        }
        return groups;
    }, [filteredEntries]);

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
        if (filteredEntries.length > 0) {
            if (selectedTurn == null || !turnGroups.has(selectedTurn)) {
                setSelectedTurn(filteredEntries[filteredEntries.length - 1].turn);
            }
            return;
        }
        if (selectedTurn == null) {
            setSelectedTurn(maxTurn);
            return;
        }
        if (selectedTurn < minTurn || selectedTurn > maxTurn) {
            setSelectedTurn(maxTurn);
        }
    }, [open, selectedTurn, minTurn, maxTurn, filteredEntries, turnGroups]);

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

    const handleOpenTurnRecord = useCallback((turn: number) => {
        openArmyHQAftermathRecord(useGameStore.getState(), turn);
    }, []);

    const handleOpenEntryRecord = useCallback((entry: ChronicleEntry) => {
        if (entry.metadata?.operationAarId) {
            openArmyHQOperationHistory(useGameStore.getState(), entry.metadata.operationAarId);
            return;
        }
        handleOpenTurnRecord(entry.turn);
    }, [handleOpenTurnRecord]);

    const actionLabelForEntry = useCallback((entry: ChronicleEntry) => (
        entry.metadata?.operationAarId ? t('chronicle.openOperationRecord') : t('chronicle.openTurnRecord')
    ), []);

    if (!open || !state) return null;

    // Build turn columns
    const columns: React.ReactNode[] = [];
    for (let turn = minTurn; turn <= maxTurn; turn++) {
        const width = turnWidths.get(turn) ?? EMPTY_TURN_WIDTH;
        const group = turnGroups.get(turn) ?? [];
        const hasEvents = group.length > 0;

        // Most significant event type for dot color
        const dotColor = hasEvents
            ? DOT_COLORS[group.find(e => e.headline)?.type ?? group[0].type]
            : undefined;

        columns.push(
            <div
                key={turn}
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
                    {turn % 4 === 0 || hasEvents ? turnToShortDate(turn) : ''}
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
                                    {turnToFullDate(turn)}
                                </div>
                                <ChronicleCard key={`${turn}-${group[0].type}-0`} entry={group[0]} />
                            </div>
                        ) : (
                            /* Multiple entries — expandable group */
                            <div className="flex flex-col items-center w-full" style={{ gap: `${CARD_STACK_GAP}px` }}>
                                <button
                                    onClick={() => {
                                        setSelectedTurn(turn);
                                        toggleWeekExpanded(turn);
                                    }}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[9px] font-mono text-stone-300 hover:text-amber-300 transition-colors cursor-pointer select-none"
                                    style={{
                                        background: 'linear-gradient(135deg, #2a2520 0%, #1e1b18 100%)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        minWidth: '140px',
                                    }}
                                >
                                    <span className="text-amber-400/80">{turnToFullDate(turn)}</span>
                                    <span className="text-stone-500">—</span>
                                    <span>{t('chronicle.eventCount', { count: group.length })}</span>
                                    <span className="ml-auto text-[8px] text-stone-500">
                                        {expandedWeeks.has(turn) ? '\u25B2' : '\u25BC'}
                                    </span>
                                </button>

                                {expandedWeeks.has(turn) && (
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
                                            <ChronicleCard key={`${turn}-${entry.type}-${i}`} entry={entry} />
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
        <div className="fixed inset-0 bg-black/92 backdrop-blur-sm flex flex-col" style={{ zIndex: Z.MODAL }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/8">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                    <h1
                        className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400/90 shrink-0"
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                        {t('chronicle.title')}
                    </h1>
                    <span className="text-[9px] font-mono text-stone-500 shrink-0">
                        {t('chronicle.eventRatio', { filtered: filteredEntries.length, total: allEntries.length })} - {turnToFullDate(minTurn)} - {turnToFullDate(maxTurn)}
                    </span>
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5" data-coachmark-id="chronicle-filter">
                        {CHRONICLE_FILTERS.map(filter => {
                            const active = filter.id === activeFilter;
                            const count = entryCounts[filter.id];
                            return (
                                <button
                                    key={filter.id}
                                    type="button"
                                    aria-pressed={active}
                                    title={`${chronicleFilterLabel(filter)}: ${count}`}
                                    onClick={() => setActiveFilter(filter.id)}
                                    className={[
                                        'h-6 min-w-[54px] rounded-sm border px-2 font-mono text-[8px] uppercase transition-colors',
                                        active
                                            ? 'border-amber-400/70 bg-amber-400/15 text-amber-200'
                                            : 'border-white/10 bg-black/25 text-stone-500 hover:border-stone-500/60 hover:text-stone-300',
                                    ].join(' ')}
                                >
                                    <span>{chronicleFilterLabel(filter)}</span>
                                    <span aria-hidden="true" className="text-stone-600">
                                        {' · '}
                                    </span>
                                    <span aria-label={`${count} entries`} className="text-stone-500">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                    <ChronicleViewModeToggle
                        mode={viewMode}
                        activeFilterLabel={activeFilterLabel}
                        chapterCount={chapters.length}
                        onModeChange={setViewMode}
                    />
                </div>
                <button
                    onClick={handleClose}
                    className="ml-3 shrink-0 text-[10px] font-mono text-stone-500 hover:text-red-400 transition-colors uppercase tracking-wider"
                >
                    {t('chronicle.close')}
                </button>
            </div>

            {/* Main scrollable area: ribbon + stems + cards */}
            <div className="flex-1 flex min-h-0">
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-x-auto overflow-y-auto border-r border-white/8"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#555 #1a1a1a' }}
                >
                    {allEntries.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <EmptyState
                                message={t('chronicle.emptyTitle')}
                                helpText={t('chronicle.emptyHelp')}
                            />
                        </div>
                    ) : viewMode === 'chapters' ? (
                        <ChronicleChapterView
                            chapters={chapters}
                            onSelectTurn={setSelectedTurn}
                            onOpenTurnRecord={handleOpenTurnRecord}
                        />
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
                            {filteredEntries.length === 0 ? (
                                <div className="flex items-center justify-center" style={{ minHeight: '320px' }}>
                                    <p className="text-stone-600 text-xs font-mono">
                                        {t('chronicle.noEntries')}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex">
                                    {columns}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <aside className="w-[360px] shrink-0 bg-black/35 backdrop-blur-sm flex flex-col min-h-0">
                    <div className="px-4 py-3 border-b border-white/8">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-amber-400/80 font-bold">
                            {t('chronicle.dossier')}
                        </div>
                        <div className="mt-1 text-[11px] text-text-primary font-semibold">
                            {selectedTurn != null ? turnToFullDate(selectedTurn) : t('chronicle.noTurnSelected')}
                        </div>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-white/8 text-[10px]">
                        <div className="bg-black/20 border border-panel-border/40 rounded p-2">
                            <div className="text-text-secondary uppercase tracking-wide">{t('chronicle.metric.events')}</div>
                            <div className="text-text-primary font-bold">
                                {selectedTurn != null ? (turnGroups.get(selectedTurn)?.length ?? 0) : 0}
                            </div>
                        </div>
                        <div className="bg-black/20 border border-panel-border/40 rounded p-2">
                            <div className="text-text-secondary uppercase tracking-wide">{t('chronicle.metric.headline')}</div>
                            <div className="text-text-primary font-bold">
                                {selectedTurn != null
                                    ? (turnGroups.get(selectedTurn)?.some((e) => e.headline) ? t('chronicle.yes') : t('chronicle.no'))
                                    : t('chronicle.no')}
                            </div>
                        </div>
                        <div className="bg-black/20 border border-panel-border/40 rounded p-2">
                            <div className="text-text-secondary uppercase tracking-wide">{t('chronicle.metric.lens')}</div>
                            <div className="text-text-primary font-bold truncate" title={activeFilterLabel}>
                                {activeFilterLabel}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                        {allEntries.length > 0 && filteredEntries.length === 0 ? (
                            <div className="text-[11px] text-text-secondary italic">
                                {t('chronicle.noEntries')}
                            </div>
                        ) : selectedTurn == null || (turnGroups.get(selectedTurn)?.length ?? 0) === 0 ? (
                            <div className="text-[11px] text-text-secondary italic">
                                {t('chronicle.selectTurnHelp')}
                            </div>
                        ) : (
                            (turnGroups.get(selectedTurn) ?? []).map((entry, i) => (
                                <div
                                    key={`${selectedTurn}-${entry.type}-${i}`}
                                    className="border border-panel-border/30 rounded p-2 bg-black/15"
                                >
                                    <ChronicleCard entry={entry} />
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEntryRecord(entry)}
                                        className="mt-2 h-7 w-full rounded-sm border border-amber-400/30 bg-amber-400/10 px-2 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200 transition-colors hover:border-amber-300/70 hover:bg-amber-400/15"
                                    >
                                        {actionLabelForEntry(entry)}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            </div>

            {/* Scrubber strip */}
            {allEntries.length > 0 && (
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
