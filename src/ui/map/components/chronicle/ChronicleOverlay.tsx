import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { generateChronicleEntries } from './generateChronicleEntries.js';
import { loadEventDefinitionsFull } from '../../data/DataLoader.js';
import type { EventDefinition } from '../../../../sim/events/event_types.js';
import { ChronicleCard } from './ChronicleCard.js';
import { ChronicleRibbon, ChronicleRibbonScrubber } from './ChronicleSpine.js';
import { CHRONICLE_FILTERS, chronicleFilterLabel, countChronicleEntriesByFilter, filterChronicleEntries, getVisibleChronicleFilters } from './ChronicleReviewFilters.js';
import { turnToCompletedWeekRange, turnToDateString } from '../../utils/formatters.js';
import { openArmyHQAftermathRecord, openArmyHQDecisionConsequenceRecord, openArmyHQOperationHistory, openChronicleDecisionRecord } from '../../utils/shellNavigation.js';
import {
    buildChronicleCampaignRecap,
    buildChronicleChapters,
    chronicleTypeLabel,
    formatChronicleBoundaryKind,
    formatChronicleChapterDateRange,
} from '../../data/chronicleChapters.js';
import { shouldNarrateTerritorySummary } from '../../data/territorySummaryGuard.js';
import type { ChronicleEntry, ChronicleCardType } from './generateChronicleEntries.js';
import type { ChronicleFilterId } from './ChronicleReviewFilters.js';
import type { ChronicleChapter } from '../../data/chronicleChapters.js';
import { EmptyState } from '../EmptyState.js';
import { Z } from '../../../shared/zIndex.js';
import { t, useLocale } from '../../i18n';
import { SurfaceCloseButton, SurfaceHeader, SurfaceStat, SURFACE_LABEL, SURFACE_SECONDARY_BUTTON } from '../surface/Surface';

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

/** Receipt-only Chronicle groups describe the week just completed. A decision
 * in the same group retains its authored boundary date, avoiding a false date
 * shift for player choices that happen at that boundary. */
export function formatChronicleGroupDate(
    turn: number,
    entries: readonly ChronicleEntry[],
): string {
    const includesDecision = entries.some((entry) => (
        Boolean(entry.metadata?.decisionRecordId) && !entry.metadata?.receiptRecordId
    ));
    return includesDecision
        ? turnToDateString(turn)
        : turnToCompletedWeekRange(turn);
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

export interface ChronicleChromeTurnSummary {
    turn: number;
    territory_snapshot?: Partial<Record<string, number>>;
    mechanism?: unknown;
    provenance?: unknown;
    source?: unknown;
    summary_kind?: unknown;
    kind?: unknown;
    is_setup?: unknown;
}

export interface ChronicleChromeTurnRangeInput {
    turnSummaries: readonly ChronicleChromeTurnSummary[];
    entries: readonly Pick<ChronicleEntry, 'turn'>[];
}

export function getNarratedChronicleTurnSummaries(
    turnSummaries: readonly ChronicleChromeTurnSummary[],
): ChronicleChromeTurnSummary[] {
    return turnSummaries
        .filter((summary) => shouldNarrateTerritorySummary(summary))
        .slice()
        .sort((a, b) => a.turn - b.turn);
}

export function getChronicleChromeTurnRange(input: ChronicleChromeTurnRangeInput): { minTurn: number; maxTurn: number } {
    const narratedSummaries = getNarratedChronicleTurnSummaries(input.turnSummaries);
    const sourceTurns = narratedSummaries.length > 0
        ? narratedSummaries.map((summary) => summary.turn)
        : input.entries.map((entry) => entry.turn);
    if (sourceTurns.length === 0) {
        return { minTurn: 0, maxTurn: 0 };
    }
    return {
        minTurn: Math.min(...sourceTurns),
        maxTurn: Math.max(...sourceTurns),
    };
}

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
                                'h-7 min-w-[70px] rounded-sm px-2 font-mono text-[14px] uppercase transition-colors',
                                active
                                    ? 'bg-stone-200/15 text-stone-100'
                                    : 'text-stone-400 hover:text-stone-200',
                            ].join(' ')}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
            <span className="text-[14px] font-mono text-stone-400">
                {t('chronicle.lens', { label: activeFilterLabel })}
            </span>
            <span className="text-[14px] font-mono text-stone-400">
                {t(chapterCount === 1 ? 'chronicle.chapterCount.one' : 'chronicle.chapterCount.many', { count: chapterCount })}
            </span>
        </div>
    );
}

function ChronicleChapterView({
    chapters,
    aftermathTurns,
    onSelectTurn,
    onOpenTurnRecord,
}: {
    chapters: ChronicleChapter[];
    aftermathTurns: ReadonlySet<number>;
    onSelectTurn: (turn: number) => void;
    onOpenTurnRecord: (turn: number) => void;
}) {
    if (chapters.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-[14px] text-stone-400">{t('chronicle.noChapters')}</p>
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
                    <div className="text-[14px] font-mono uppercase tracking-[0.18em] text-amber-300/80">
                        {t('chronicle.recapTitle')}
                    </div>
                    <p className="mt-1 text-[14px] leading-relaxed text-stone-300">
                        {t(recap.chapterCount === 1 ? 'chronicle.recapBody.one' : 'chronicle.recapBody.many', {
                            chapters: recap.chapterCount,
                            range: recap.monthRange,
                            entries: recap.entryCount,
                            thread: recapThread,
                            headlines: recap.headlineCount,
                        })}
                    </p>
                    <p className="mt-1 text-[14px] font-mono uppercase tracking-[0.08em] text-stone-400">
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
                            <div className="text-[14px] font-mono uppercase tracking-[0.16em] text-stone-400">
                                {chapter.monthLabels.join(' / ')}
                            </div>
                            <h2
                                className="mt-1 text-base font-semibold text-amber-200"
                                style={{ fontFamily: 'var(--font-command)' }}
                            >
                                {chapter.title}
                            </h2>
                            <p className="mt-1 text-[14px] text-stone-400">
                                {chapter.summary} | {formatChronicleChapterDateRange(chapter)}
                            </p>
                        </div>
                        <div className="shrink-0 text-right text-[14px] font-mono uppercase text-stone-400">
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
                                    <span className="text-[14px] font-mono uppercase text-stone-400">
                                        {turnToFullDate(ref.turn)} | {chronicleTypeLabel(ref.type)}
                                    </span>
                                    {ref.headline && (
                                        <span className="text-[14px] font-mono uppercase text-amber-300">{t('chronicle.headline')}</span>
                                    )}
                                </div>
                                <div className="mt-1 text-[14px] leading-snug text-stone-200">
                                    {ref.title}
                                </div>
                                <div className="mt-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onSelectTurn(ref.turn)}
                                        className="h-7 rounded-sm border border-white/10 px-2 text-[14px] font-bold uppercase tracking-[0.12em] text-stone-300 hover:border-stone-400/60"
                                    >
                                        {t('chronicle.select')}
                                    </button>
                                    {aftermathTurns.has(ref.turn) ? (
                                        <button
                                            type="button"
                                            data-testid="chronicle-chapter-open-turn-record"
                                            data-turn={ref.turn}
                                            onClick={() => onOpenTurnRecord(ref.turn)}
                                            className="h-7 rounded-sm border border-amber-400/25 px-2 text-[14px] font-bold uppercase tracking-[0.12em] text-amber-200 hover:border-amber-300/70"
                                        >
                                            {t('chronicle.openTurnRecord')}
                                        </button>
                                    ) : (
                                        <span
                                            data-testid="chronicle-chapter-entry-only"
                                            data-turn={ref.turn}
                                            className="inline-flex h-6 items-center rounded-sm border border-white/10 px-2 text-[14px] font-bold uppercase tracking-[0.12em] text-stone-400"
                                        >
                                            {t('chronicle.chronicleOnlyEntry')}
                                        </span>
                                    )}
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
    const [locale] = useLocale();
    const open = useGameStore(s => s.chronicleOpen);
    const setOpen = useGameStore(s => s.setChronicleOpen);
    const focusedChronicleDecisionRecordId = useGameStore(s => s.focusedChronicleDecisionRecordId);
    const state = useGameStore(s => s.loadedGameState);
    const osidDisplayNames = useGameStore(s => s.osidDisplayNames);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [viewportFraction, setViewportFraction] = useState(1);
    const [viewportOffset, setViewportOffset] = useState(0);
    const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
    const [selectedTurn, setSelectedTurn] = useState<number | null>(null);
    const [activeFilter, setActiveFilter] = useState<ChronicleFilterId>('all');
    const [viewMode, setViewMode] = useState<ChronicleViewMode>('chapters');

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
        state ? generateChronicleEntries(state, eventCatalogFull, osidDisplayNames) : [],
        [state, eventCatalogFull, osidDisplayNames, locale]
    );

    const narratedTurnSummaries = useMemo(
        () => getNarratedChronicleTurnSummaries(turnSummaries),
        [turnSummaries],
    );
    const aftermathTurns = useMemo(
        () => new Set(narratedTurnSummaries.map((summary) => summary.turn)),
        [narratedTurnSummaries],
    );

    const focusedChronicleEntry = useMemo(
        () => focusedChronicleDecisionRecordId
            ? allEntries.find(entry => entry.metadata?.decisionRecordId === focusedChronicleDecisionRecordId) ?? null
            : null,
        [allEntries, focusedChronicleDecisionRecordId],
    );

    const entryCounts = useMemo(() => countChronicleEntriesByFilter(allEntries), [allEntries]);
    const visibleFilters = useMemo(() => getVisibleChronicleFilters(entryCounts), [entryCounts]);

    useEffect(() => {
        if (activeFilter !== 'all' && entryCounts[activeFilter] === 0) {
            setActiveFilter('all');
        }
    }, [activeFilter, entryCounts]);

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

    // Compute turn range from narrated summaries; setup-only saves fall back to generated entries.
    const { minTurn, maxTurn } = useMemo(
        () => getChronicleChromeTurnRange({ turnSummaries, entries: allEntries }),
        [turnSummaries, allEntries],
    );

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
        if (open && viewMode === 'entries' && scrollRef.current) {
            requestAnimationFrame(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
                }
            });
        }
    }, [open, viewMode]);

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
        if (!el || !open || viewMode !== 'entries') return;
        el.addEventListener('scroll', updateViewport, { passive: true });
        updateViewport();
        return () => el.removeEventListener('scroll', updateViewport);
    }, [open, updateViewport, viewMode]);

    // Mousewheel → horizontal scroll
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !open || viewMode !== 'entries') return;
        const handler = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, [open, viewMode]);

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
        if (typeof el.scrollTo === 'function') {
            el.scrollTo({ left: offset, behavior: 'smooth' });
        } else {
            el.scrollLeft = offset;
        }
    }, [minTurn, turnWidths]);

    useEffect(() => {
        if (!open || !focusedChronicleEntry) return;
        setViewMode('entries');
        setActiveFilter('all');
        setSelectedTurn(focusedChronicleEntry.turn);
        setExpandedWeeks(prev => {
            if (prev.has(focusedChronicleEntry.turn)) return prev;
            const next = new Set(prev);
            next.add(focusedChronicleEntry.turn);
            return next;
        });
        requestAnimationFrame(() => scrollToTurn(focusedChronicleEntry.turn));
    }, [focusedChronicleEntry, open, scrollToTurn]);

    useEffect(() => {
        if (!open || !focusedChronicleDecisionRecordId || typeof document === 'undefined') return;
        const el = document.querySelector<HTMLElement>(
            `[data-focused-chronicle-decision-record-id="${focusedChronicleDecisionRecordId}"]`,
        );
        el?.scrollIntoView?.({ block: 'center' });
        el?.focus();
    }, [filteredEntries.length, focusedChronicleDecisionRecordId, open, selectedTurn]);

    const handleOpenTurnRecord = useCallback((turn: number) => {
        openArmyHQAftermathRecord(useGameStore.getState(), turn);
    }, []);

    const handleOpenEntryRecord = useCallback((entry: ChronicleEntry) => {
        if (entry.metadata?.operationAarId) {
            openArmyHQOperationHistory(useGameStore.getState(), entry.metadata.operationAarId);
            return;
        }
        if (entry.metadata?.decisionRecordId) {
            if (entry.metadata.decisionRecordSurface === 'chronicle') {
                openChronicleDecisionRecord(useGameStore.getState(), entry.metadata.decisionRecordId);
                return;
            }
            openArmyHQDecisionConsequenceRecord(useGameStore.getState(), entry.metadata.decisionRecordId);
            return;
        }
        if (aftermathTurns.has(entry.turn)) handleOpenTurnRecord(entry.turn);
    }, [aftermathTurns, handleOpenTurnRecord]);

    const actionLabelForEntry = useCallback((entry: ChronicleEntry) => (
        entry.metadata?.operationAarId
            ? t('chronicle.openOperationRecord')
            : entry.metadata?.decisionRecordId
                ? t('chronicle.openDecisionRecord')
                : aftermathTurns.has(entry.turn)
                    ? t('chronicle.openTurnRecord')
                    : t('chronicle.chronicleOnlyEntry')
    ), [aftermathTurns]);

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
                    className="text-[14px] font-mono text-stone-400 mt-1 select-none"
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
                                <div className="text-[14px] font-mono text-stone-400 mb-1">
                                    {formatChronicleGroupDate(turn, group)}
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
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[14px] font-mono text-stone-300 hover:text-amber-300 transition-colors cursor-pointer select-none"
                                    style={{
                                        background: 'linear-gradient(135deg, #2a2520 0%, #1e1b18 100%)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        minWidth: '140px',
                                    }}
                                >
                                    <span className="text-amber-400/80">{formatChronicleGroupDate(turn, group)}</span>
                                    <span className="text-stone-400">—</span>
                                    <span>{t('chronicle.eventCount', { count: group.length })}</span>
                                    <span className="ml-auto text-[14px] text-stone-400">
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

    // Surface redesign (owner, 2026-11-10): the Chronicle keeps the full window for its
    // timeline but reads in the Command Surface's style — a fixed header (eyebrow, the
    // date range, the lenses, the view toggle, Close), the timeline, and the selected
    // week's dossier as a right-hand column that scrolls on its own.
    return (
        <div
            className="fixed inset-0 overflow-hidden bg-[#090a0f] flex flex-col"
            style={{ zIndex: Z.MODAL }}
            data-testid="chronicle-overlay"
        >
            <SurfaceHeader
                eyebrow={t('chronicle.title')}
                title={`${turnToFullDate(minTurn)} – ${turnToFullDate(maxTurn)}`}
                trailing={(
                    <span className="text-[15px] text-[#b9ad94]">
                        {t('chronicle.eventRatio', { filtered: filteredEntries.length, total: allEntries.length })}
                    </span>
                )}
                close={(
                    <SurfaceCloseButton onClick={handleClose} data-testid="chronicle-close">
                        {t('chronicle.close')}
                    </SurfaceCloseButton>
                )}
            />
            {/* Lenses and view toggle on their own strip, so the header never wraps. */}
            <div className="flex shrink-0 items-center border-b border-[#262b35] bg-[#11141b] px-7 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2" data-coachmark-id="chronicle-filter">
                    {visibleFilters.map(filter => {
                        const active = filter.id === activeFilter;
                        const count = entryCounts[filter.id];
                        return (
                            <button
                                key={filter.id}
                                type="button"
                                aria-pressed={active}
                                data-testid={`chronicle-filter-${filter.id}`}
                                data-selected={active ? 'true' : 'false'}
                                title={t('chronicle.filterTitle', { label: chronicleFilterLabel(filter), count })}
                                onClick={() => setActiveFilter(filter.id)}
                                className={[
                                    'h-10 min-w-[54px] rounded-md border px-3.5 text-[15px] font-semibold transition-colors',
                                    active
                                        ? 'border-[#c9a75c] bg-[#232936] text-[#f1e6c8]'
                                        : 'border-[#3a4150] bg-[#1b2029] text-[#c2b69c] hover:border-accent-gold/60 hover:text-[#f1e6c8]',
                                ].join(' ')}
                            >
                                <span>{chronicleFilterLabel(filter)}</span>
                                <span aria-hidden="true" className="text-[#9c917b]">
                                    {' · '}
                                </span>
                                <span
                                    aria-label={t(count === 1 ? 'chronicle.entryCount.one' : 'chronicle.entryCount.many', { count })}
                                    className="font-mono text-[#9c917b]"
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                    <ChronicleViewModeToggle
                        mode={viewMode}
                        activeFilterLabel={activeFilterLabel}
                        chapterCount={chapters.length}
                        onModeChange={setViewMode}
                    />
                </div>
            </div>

            {/* Main scrollable area: ribbon + stems + cards */}
            <div className="flex-1 flex min-h-0 min-w-0">
                <div
                    ref={scrollRef}
                    className={[
                        'min-w-0 flex-1 border-r border-[#262b35]',
                        viewMode === 'entries' ? 'overflow-x-auto overflow-y-hidden' : 'overflow-x-hidden overflow-y-auto',
                    ].join(' ')}
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
                            aftermathTurns={aftermathTurns}
                            onSelectTurn={setSelectedTurn}
                            onOpenTurnRecord={handleOpenTurnRecord}
                        />
                    ) : (
                        <div style={{ width: `${totalWidth}px`, minHeight: '100%' }}>
                            {/* Territory ribbon */}
                            <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-sm border-b border-white/5">
                                <ChronicleRibbon
                                    turnSummaries={narratedTurnSummaries}
                                    turnWidths={turnWidths}
                                    minTurn={minTurn}
                                    maxTurn={maxTurn}
                                />
                            </div>

                            {/* Turn columns with stems and cards */}
                            {filteredEntries.length === 0 ? (
                                <div className="flex items-center justify-center" style={{ minHeight: '320px' }}>
                                    <p className="text-[16px] text-[#c2b69c]">
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

                <aside className="w-[clamp(21rem,calc(var(--interface-viewport-width,100vw)*0.28),32rem)] shrink-0 bg-[#11131a] flex flex-col min-h-0">
                    <div className="flex flex-col gap-1 border-b border-[#262b35] px-6 py-4">
                        <div className={SURFACE_LABEL}>
                            {t('chronicle.dossier')}
                        </div>
                        <div className="text-[22px] font-semibold leading-tight text-[#f6ecd2]">
                            {selectedTurn != null ? turnToFullDate(selectedTurn) : t('chronicle.noTurnSelected')}
                        </div>
                    </div>
                    <div className="flex flex-col border-b border-[#262b35] px-6 py-2">
                        <SurfaceStat
                            label={t('chronicle.metric.events')}
                            value={selectedTurn != null ? (turnGroups.get(selectedTurn)?.length ?? 0) : 0}
                        />
                        <SurfaceStat
                            label={t('chronicle.metric.headline')}
                            value={selectedTurn != null
                                ? (turnGroups.get(selectedTurn)?.some((e) => e.headline) ? t('chronicle.yes') : t('chronicle.no'))
                                : t('chronicle.no')}
                        />
                        <SurfaceStat
                            label={t('chronicle.metric.lens')}
                            value={<span title={activeFilterLabel}>{activeFilterLabel}</span>}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                        {allEntries.length > 0 && filteredEntries.length === 0 ? (
                            <div className="text-[16px] leading-relaxed text-[#c2b69c] italic">
                                {t('chronicle.noEntries')}
                            </div>
                        ) : selectedTurn == null || (turnGroups.get(selectedTurn)?.length ?? 0) === 0 ? (
                            <div className="text-[16px] leading-relaxed text-[#c2b69c] italic">
                                {t('chronicle.selectTurnHelp')}
                            </div>
                        ) : (
                            (turnGroups.get(selectedTurn) ?? []).map((entry, i) => {
                                const isFocusedDecisionEntry = Boolean(
                                    focusedChronicleDecisionRecordId
                                    && entry.metadata?.decisionRecordId === focusedChronicleDecisionRecordId,
                                );
                                const recordAvailable = Boolean(entry.metadata?.operationAarId || entry.metadata?.decisionRecordId || aftermathTurns.has(entry.turn));
                                return (
                                <div
                                    key={`${selectedTurn}-${entry.type}-${i}`}
                                    tabIndex={isFocusedDecisionEntry ? -1 : undefined}
                                    className={[
                                        'rounded-md border bg-[#161a22] p-3',
                                        isFocusedDecisionEntry
                                            ? 'border-[#c9a75c] shadow-[0_0_0_1px_rgba(201,167,92,0.3)]'
                                            : 'border-[#2a303c]',
                                    ].join(' ')}
                                    data-testid="chronicle-dossier-entry"
                                    data-turn={entry.turn}
                                    data-entry-type={entry.type}
                                    data-operation-aar-id={entry.metadata?.operationAarId ?? undefined}
                                    data-decision-record-id={entry.metadata?.decisionRecordId ?? undefined}
                                    data-focused-chronicle-decision-record-id={isFocusedDecisionEntry ? entry.metadata?.decisionRecordId : undefined}
                                >
                                    <ChronicleCard entry={entry} />
                                    <button
                                        type="button"
                                        data-testid="chronicle-open-record"
                                        data-record-target={entry.metadata?.operationAarId ? 'operation' : entry.metadata?.decisionRecordId ? 'decision' : 'aftermath'}
                                        data-turn={entry.turn}
                                        data-operation-aar-id={entry.metadata?.operationAarId ?? undefined}
                                        data-decision-record-id={entry.metadata?.decisionRecordId ?? undefined}
                                        onClick={() => handleOpenEntryRecord(entry)}
                                        disabled={!recordAvailable}
                                        className={`mt-3 w-full ${SURFACE_SECONDARY_BUTTON}`}
                                    >
                                        {actionLabelForEntry(entry)}
                                    </button>
                                </div>
                                );
                            })
                        )}
                    </div>
                </aside>
            </div>

            {/* Scrubber strip */}
            {viewMode === 'entries' && allEntries.length > 0 && (
                <ChronicleRibbonScrubber
                    turnSummaries={narratedTurnSummaries}
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
