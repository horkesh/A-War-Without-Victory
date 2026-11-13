/**
 * CodexPanel - Historical record and campaign-entry viewer.
 * Sidebar list grouped by year, content viewer on right with paper aesthetic.
 * Tier 0-2 records are visible from scenario start. Tier 3 campaign entries
 * stay hidden or title-redacted until their predicates fire.
 *
 * Phase H Packet 5 (Component C — Codex unlock-state display): the panel
 * accepts OPTIONAL `eventCatalog` + `state` props that, when both provided,
 * surface a read-only Unlock State section under the existing year tabs.
 * Backward compatible: existing callers (mounted from `MapContainer`)
 * continue to render exactly as before; no styling regressions. The new
 * section consumes the H2 wave 1 helper `getEventChainSummary` for the
 * aggregate row and reads `state.military.fired_event_ids` /
 * `enabled_event_ids` / `closed_event_ids` directly for the three sub-lists.
 * See `docs/40_reports/proposals/20260528_UI_CODEX_INTEGRATION_SCOPING.md` §4.2C.
 */
import { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import essayIndex from '../../../../data/scenarios/essays/essay_index.json';
import {
    resolveCodexEssayIndex,
    effectiveTier,
    CodexTier,
    type EssayEntry,
    type CodexLockReason,
} from './codex/codexEssayResolver.js';
import { t, useLocale } from '../i18n';
import { Z } from '../../shared/zIndex.js';
import type { EventDefinition } from '../../../sim/events/event_types.js';
import type { GameState } from '../../../state/game_state.js';
import { getEventChainSummary } from '../../../sim/events/causality_query.js';
import {
    buildGhostEntries,
    type GhostRecordClassification,
} from '../../../sim/codex/dynamic_section_builder.js';
import { turnToDateString } from '../utils/formatters.js';
import { parseGhostEntryProse, resolveGhostEntryProse } from '../data/ghostEntryProse.js';
import { buildConsequenceReceipts } from '../data/consequenceReceipts.js';
import {
    SURFACE_CHIP,
    SURFACE_LABEL,
    SURFACE_LABEL_MUTED,
    SurfaceCloseButton,
    SurfaceColumns,
    SurfaceContent,
    SurfaceDetail,
    SurfaceEmpty,
    SurfaceHeader,
    SurfaceRail,
} from './surface/Surface';

const YEARS = [1992, 1993, 1994, 1995] as const;

// Surface redesign, step 4 (2026-11-12): category chips in the surface chip style.
// `onPaper` uses dark ink for the essay sheet header.
const CATEGORY_COLORS: Record<string, { surface: string; paper: string }> = {
    military: { surface: 'border-red-400/50 text-red-200', paper: 'border-red-800/50 text-red-900' },
    political: { surface: 'border-sky-400/40 text-sky-200', paper: 'border-sky-800/50 text-sky-900' },
    diplomatic: { surface: 'border-cyan-400/40 text-cyan-200', paper: 'border-cyan-800/50 text-cyan-900' },
    humanitarian: { surface: 'border-amber-300/50 text-amber-200', paper: 'border-amber-800/50 text-amber-900' },
};

function CategoryBadge({ category, onPaper = false }: { category: string; onPaper?: boolean }) {
    const colors = CATEGORY_COLORS[category] ?? { surface: 'border-[#3a4150] text-[#c2b69c]', paper: 'border-neutral-500/50 text-neutral-800' };
    return (
        <span className={`shrink-0 whitespace-nowrap rounded border px-2 py-0.5 font-mono text-[13px] font-semibold uppercase tracking-[0.12em] ${onPaper ? colors.paper : colors.surface}`}>
            {category}
        </span>
    );
}

function formatAvailableCount(count: number): string {
    return count === 1
        ? t('codex.available.one')
        : t('codex.available.many', { count });
}

function ghostClassificationLabel(classification: GhostRecordClassification): string {
    switch (classification) {
        case 'path_not_taken': return t('codex.record.pathNotTaken');
        case 'audit_context': return t('codex.record.auditContext');
        case 'divergence_context':
        default: return t('codex.record.divergenceContext');
    }
}

/** A1a: tier order for grouping/sorting within a year (FIXED → AHISTORICAL). */
const TIER_ORDER: readonly CodexTier[] = [
    CodexTier.FIXED,
    CodexTier.CONDITIONAL,
    CodexTier.SHAPEABLE,
    CodexTier.AHISTORICAL,
];

/** A1a: localized tier label. */
function tierLabel(tier: CodexTier): string {
    switch (tier) {
        case CodexTier.CONDITIONAL: return t('codex.tier.conditional');
        case CodexTier.SHAPEABLE: return t('codex.tier.shapeable');
        case CodexTier.AHISTORICAL: return t('codex.tier.ahistorical');
        case CodexTier.FIXED:
        default: return t('codex.tier.fixed');
    }
}

/** Soft campaign-entry hint for a graph-gated Tier 3 entry. Plain unfired Tier
 *  3 entries remain hidden. */
function lockHint(lockReason: CodexLockReason | null): string | null {
    if (!lockReason) return null;
    switch (lockReason.kind) {
        case 'event': return t('codex.unlocksAfterEvent');
        case 'essay': return t('codex.unlocksAfterEssay');
        case 'turn': return t('codex.unlocksAfterTurn', { date: turnToDateString(lockReason.turn ?? 0) });
        case 'event_fire':
        default: return null;
    }
}

/** A sidebar row: visible history or a title-redacted Tier 3 campaign hint. */
interface CodexRow {
    essay: EssayEntry;
    unlocked: boolean;
    hint: string | null;
    tier: CodexTier;
    /** Original essay-index position; stable secondary sort key within a tier. */
    index: number;
}

/** Tier badge for the sidebar list. */
function TierBadge({ tier }: { tier: CodexTier }) {
    return (
        <span
            data-testid="codex-tier-badge"
            data-tier={tier}
            className="shrink-0 whitespace-nowrap rounded border border-[#3a4150] px-2 py-0.5 font-mono text-[13px] font-semibold uppercase tracking-[0.1em] text-[#b9ad94]"
        >
            {tierLabel(tier)}
        </span>
    );
}

interface CodexPanelProps {
    isOpen: boolean;
    onClose: () => void;
    requestedEventId?: string | null;
    /**
     * Phase H Packet 5 (Component C) — optional event catalog for the
     * Unlock State section (family + source_tier lookups + aggregate
     * `getEventChainSummary` headline). When omitted (or when `state` is
     * omitted), the Unlock State section is suppressed entirely.
     * Backward compatible — existing callers passing only `isOpen` +
     * `onClose` continue to work and render exactly as before.
     */
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
    /**
     * Phase H Packet 5 (Component C) — optional GameState handle. Read
     * paths: `state.military.fired_event_ids`, `enabled_event_ids`,
     * `closed_event_ids` (sub-list source) plus the wider causality
     * substrate consumed by `getEventChainSummary`. Same graceful
     * degradation rule as `eventCatalog`.
     */
    state?: GameState;
}

/** Closed Codex panels do not pay the dynamic decision/causality projection cost. */
export function shouldProjectLiveDynamicCodex(
    isOpen: boolean,
    state: GameState | undefined,
): state is GameState {
    return isOpen && state !== undefined;
}

/** Phase H Packet 5 — Maximum number of per-event rows rendered inside any
 *  single Unlock State sub-list. The full count is always reflected in the
 *  section heading; this caps DOM volume to keep the panel scrollable.
 *  Mirrors the conservative-scope rule in H1 §6 (data display only). */
const UNLOCK_STATE_MAX_ROWS_PER_LIST = 25;

/** Phase H Packet 5 — Format a single event row for an Unlock State sub-list:
 *  `id [family=X] [source=Y]`. Family + source_tier sourced from the
 *  catalog; absent entries render their respective bracket as `unknown`.
 *  Pure helper; deterministic. */
function formatUnlockRow(
    id: string,
    eventCatalog: ReadonlyMap<string, EventDefinition>,
): { family: string; sourceTier: string } {
    const def = eventCatalog.get(id);
    const family = def?.family ?? 'unknown';
    const sourceTier = (def?.source_tier ?? 'unknown') as string;
    return { family, sourceTier };
}

export function CodexPanel({ isOpen, onClose, requestedEventId, eventCatalog, state }: CodexPanelProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    // Diagnostics gate (NOT generic dev mode): raw event IDs / unlock diagnostics
    // must never surface in dev:map for playtesters. Requires explicit ?diag=1.
    const diagMode = useGameStore((s) => s.diagMode);
    const [locale] = useLocale();
    const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
    const [expandedYear, setExpandedYear] = useState<number | null>(1992);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', handler, true);
        return () => window.removeEventListener('keydown', handler, true);
    }, [isOpen, onClose]);

    const firedEventIds = useMemo(() => {
        const ids = new Set<string>();
        if (loadedGameState?.firedEvents) {
            for (const entry of loadedGameState.firedEvents) {
                ids.add(entry.id);
            }
        }
        return ids;
    }, [loadedGameState?.firedEvents]);

    // Phase 3 Thread 2 "the dilemma spine": already-projected read-model from the
    // adapter. Empty array when absent (flag-off / pre-Thread-2 saves) so the
    // section degrades gracefully.
    const dilemmaSpine = loadedGameState?.dilemmaSpine ?? [];
    const visibleDilemmaSpine = useMemo(
        () => dilemmaSpine.filter((dilemma) => dilemma.faced || Boolean(loadedGameState?.gameOver)),
        [dilemmaSpine, loadedGameState?.gameOver],
    );

    // Distance-from-history read-model v1: how far the player's emergent war has
    // drifted from the historical 1992-95 (event-decision divergence). Absent on
    // flag-off / pre-substrate saves; the section degrades to nothing.
    const distanceFromHistory = loadedGameState?.distanceFromHistory ?? null;

    const essays = (Array.isArray(essayIndex) ? essayIndex : (essayIndex as { essays: EssayEntry[] }).essays ?? []) as EssayEntry[];
    // Index-level resolution keeps Tier 0-2 history visible while applying the
    // deterministic dependency fixpoint to Tier 3 campaign entries.
    const resolvedEssays = useMemo(() => {
        const context = {
            firedEventIds,
            eventFlags: loadedGameState?.eventFlags,
            decisionResponses: loadedGameState?.decisionResponses,
            historicalComparison: loadedGameState?.historicalComparison,
            costLedger: loadedGameState?.costLedger,
            gameOver: loadedGameState?.gameOver,
            currentTurn: loadedGameState?.turn,
        };
        return resolveCodexEssayIndex(essays, context, locale);
    }, [essays, firedEventIds, locale, loadedGameState?.eventFlags, loadedGameState?.decisionResponses, loadedGameState?.historicalComparison, loadedGameState?.costLedger, loadedGameState?.gameOver, loadedGameState?.turn]);

    // Per-year rows sort Tier 0-2 start-visible history before Tier 3 campaign
    // entries. A graph-gated Tier 3 row may show a redacted hint; a plain
    // unfired Tier 3 entry stays hidden.
    const rowsByYear = useMemo(() => {
        const tierRank = new Map<CodexTier, number>(TIER_ORDER.map((tier, i) => [tier, i]));
        const grouped = new Map<number, CodexRow[]>();
        for (const year of YEARS) grouped.set(year, []);
        essays.forEach((essay, index) => {
            const resolved = resolvedEssays.get(essay.id);
            const unlocked = Boolean(resolved?.isUnlocked);
            const tier = resolved?.tier ?? effectiveTier(essay);
            const hint = unlocked ? null : lockHint(resolved?.lockReason ?? null);
            if (!unlocked && hint === null) return; // hidden (plain not-yet-experienced)
            grouped.get(essay.year)?.push({ essay, unlocked, hint, tier, index });
        });
        for (const year of YEARS) {
            grouped.get(year)?.sort((a, b) => {
                const ta = tierRank.get(a.tier) ?? 0;
                const tb = tierRank.get(b.tier) ?? 0;
                if (ta !== tb) return ta - tb;
                if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1; // unlocked before locked-hint
                return a.index - b.index;
            });
        }
        return grouped;
    }, [essays, resolvedEssays]);

    useEffect(() => {
        if (!isOpen || !requestedEventId) return;
        const target = essays.find((essay) => essay.event_id === requestedEventId);
        if (!target) return;
        const resolved = resolvedEssays.get(target.id);
        if (!resolved?.isUnlocked) return;
        setSelectedEssayId(target.id);
        setExpandedYear(target.year);
    }, [isOpen, requestedEventId, essays, resolvedEssays]);

    const availableCount = useMemo(
        () => essays.filter((essay) => resolvedEssays.get(essay.id)?.isUnlocked).length,
        [essays, resolvedEssays],
    );

    const selectedEssay = useMemo(
        () => (selectedEssayId ? essays.find((essay) => essay.id === selectedEssayId) ?? null : null),
        [selectedEssayId, essays],
    );
    const selectedResolvedEssay = selectedEssay ? resolvedEssays.get(selectedEssay.id) ?? null : null;

    // Phase H Packet 5 (Component C) — Unlock State derivation. Suppressed
    // (returns null) when either `state` or `eventCatalog` is absent; this
    // is the graceful-degradation hook the mounted-without-props path uses.
    // Sorted via strictCompare semantics by the underlying causality helpers
    // (fired/enabled/closed are filtered through Set ops; we sort the final
    // arrays alphabetically for determinism in the rendered DOM).
    const unlockState = useMemo(() => {
        if (!state || !eventCatalog) return null;
        const military = state.military;
        const firedRaw = military?.fired_event_ids ?? [];
        const enabledRaw = military?.enabled_event_ids ?? [];
        const closedRaw = military?.closed_event_ids ?? [];
        const firedSet = new Set(firedRaw);
        // "Enabled but not fired" = enabled \ fired (pending opportunities).
        const enabledOnly = enabledRaw.filter((id) => !firedSet.has(id));
        // Sorted alphabetical for deterministic render order.
        const fired = firedRaw.slice().sort();
        const enabled = enabledOnly.slice().sort();
        const closed = closedRaw.slice().sort();
        const summary = getEventChainSummary(state, eventCatalog);
        return { fired, enabled, closed, summary };
    }, [state, eventCatalog]);

    // Canonical live Dynamic Codex path. The app supplies the raw GameState,
    // so the builder evaluates the same nested owner paths as the engine.
    const liveDynamicCodex = useMemo(() => {
        if (!shouldProjectLiveDynamicCodex(isOpen, state)) return { ghosts: [], receipts: [] };
        const currentTurn = state.meta?.turn ?? loadedGameState?.turn ?? 0;
        try {
            return {
                ghosts: buildGhostEntries(state, currentTurn),
                receipts: buildConsequenceReceipts(state, eventCatalog, locale),
            };
        } catch {
            return { ghosts: [], receipts: [] };
        }
    }, [isOpen, state, eventCatalog, locale, loadedGameState?.turn]);

    if (!isOpen) return null;

    const hasLiveRecords = liveDynamicCodex.receipts.length > 0 || liveDynamicCodex.ghosts.length > 0;
    const hasDistance = Boolean(distanceFromHistory && distanceFromHistory.totalDecided > 0);
    const showUnlockState = Boolean(unlockState && diagMode);
    const hasSideColumn = hasLiveRecords || visibleDilemmaSpine.length > 0 || hasDistance || showUnlockState;
    const dateLabel = turnToDateString(loadedGameState?.turn ?? 0);

    // Surface redesign, step 4 (2026-11-12): the Codex is one surface in the Command
    // Surface style. Header (date, title, count, Close); the years and essays in the left
    // rail; the selected essay in the middle on its paper reading sheet (visual-polish
    // lane D); campaign records, choices and distance from history in the right column,
    // which appears only when one of them has content. Each column scrolls on its own.
    // Text 13 px and up. Every essay, record and label is rendered exactly as before.
    return (
        <div
            data-testid="codex-panel"
            role="presentation"
            className="fixed inset-0 bg-[#05070a]/80"
            style={{ zIndex: Z.CODEX }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="codex-panel-title"
                className="absolute bottom-6 left-1/2 top-[4.5rem] flex w-[min(110rem,calc(100%-3rem))] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-accent-gold/35 bg-[#11141b] text-text-primary shadow-[0_30px_90px_rgba(0,0,0,0.65)]"
            >
                <SurfaceHeader
                    eyebrow={dateLabel}
                    title={<span id="codex-panel-title">{t('codex.title')}</span>}
                    trailing={(
                        <span className="text-[16px] text-[#b9ad94]">
                            {t(availableCount === 1 ? 'codex.essayAvailableSingular' : 'codex.essayAvailablePlural', { count: availableCount })}
                        </span>
                    )}
                    close={<SurfaceCloseButton onClick={onClose} data-testid="codex-close" />}
                />

                <SurfaceColumns layout={hasSideColumn ? 'rail-content-detail' : 'rail-content'}>
                    <SurfaceRail aria-label={t('codex.title')} className="gap-1">
                        {YEARS.map((year) => {
                            const yearRows = rowsByYear.get(year) ?? [];
                            if (yearRows.length === 0) return null;
                            const isExpanded = expandedYear === year;
                            const unlockedCount = yearRows.filter((row) => row.unlocked).length;

                            return (
                                <div key={year} className="flex flex-col gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedYear(isExpanded ? null : year)}
                                        aria-expanded={isExpanded}
                                        className={`flex w-full items-center justify-between rounded-md border px-3.5 py-2.5 text-left transition ${
                                            isExpanded ? 'border-[#3a4150] bg-[#171b23]' : 'border-transparent hover:border-[#3a4150] hover:bg-[#171b23]'
                                        }`}
                                    >
                                        <span className="font-mono text-[18px] font-semibold tracking-[0.08em] text-[#f1e6c8]">
                                            {year}
                                        </span>
                                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#262b35] px-2 font-mono text-[14px] font-semibold text-[#e2d6b8]">
                                            {unlockedCount}
                                        </span>
                                    </button>
                                    {isExpanded && yearRows.map((row, rowIndex) => {
                                        const { essay } = row;
                                        const resolved = resolvedEssays.get(essay.id);
                                        const ghost = Boolean(resolved?.isGhost);
                                        const isSelected = selectedEssayId === essay.id;
                                        // A1a: tier sub-header when the tier changes from the prior row.
                                        const showTierHeader = rowIndex === 0 || yearRows[rowIndex - 1].tier !== row.tier;

                                        return (
                                            <div key={essay.id} className="flex flex-col">
                                                {showTierHeader && (
                                                    <div
                                                        data-testid="codex-tier-header"
                                                        data-tier={row.tier}
                                                        className={`px-3.5 pb-1.5 pt-3 ${SURFACE_LABEL_MUTED}`}
                                                    >
                                                        {tierLabel(row.tier)}
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => { if (row.unlocked) setSelectedEssayId(essay.id); }}
                                                    disabled={!row.unlocked}
                                                    aria-pressed={isSelected}
                                                    data-testid="codex-essay-row"
                                                    data-essay-id={essay.id}
                                                    data-essay-year={essay.year}
                                                    data-awwv-codex-state={row.unlocked ? (ghost ? 'ghost' : 'unlocked') : 'locked-hint'}
                                                    data-tier={row.tier}
                                                    data-selected={isSelected ? 'true' : 'false'}
                                                    className={`w-full rounded-md border px-3.5 py-3 text-left transition ${
                                                        !row.unlocked
                                                            ? 'cursor-default border-transparent opacity-60'
                                                            : isSelected
                                                                ? 'border-[#c9a75c] bg-[#232936]'
                                                                : 'border-transparent hover:border-[#3a4150] hover:bg-[#171b23]'
                                                    }`}
                                                >
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-0.5">
                                                        <CategoryBadge category={resolved?.category ?? essay.category} />
                                                        <TierBadge tier={row.tier} />
                                                        {ghost && (
                                                            <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.1em] text-amber-200">
                                                                {t('codex.ghost')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`pt-1.5 text-[17px] font-semibold leading-snug ${row.unlocked ? 'text-[#f1e6c8]' : 'text-[#b9ad94]'}`}>
                                                        {row.unlocked ? (resolved?.title ?? essay.title) : t('codex.lockedHistoricalEntry')}
                                                    </div>
                                                    {!row.unlocked && row.hint && (
                                                        <div
                                                            data-testid="codex-unlock-hint"
                                                            className="pt-1 text-[15px] italic text-[#9c917b]"
                                                        >
                                                            {row.hint}
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </SurfaceRail>

                    <SurfaceContent>
                        {!selectedEssay ? (
                            <SurfaceEmpty centered title={t('codex.selectEssay')} body={t('codex.selectEssayHelp')} />
                        ) : !selectedResolvedEssay?.isUnlocked ? (
                            <SurfaceEmpty centered title={selectedResolvedEssay?.title ?? selectedEssay.title} body={t('codex.lockedHelp')} />
                        ) : (
                            <div className="px-8 py-8">
                                <div
                                    className="bg-paper paper-grain relative mx-auto max-w-[50rem] overflow-hidden rounded-lg border border-neutral-400/60 shadow-md"
                                    data-testid="codex-selected-essay"
                                    data-essay-id={selectedEssay.id}
                                    data-essay-year={selectedEssay.year}
                                    data-codex-state={selectedResolvedEssay.isGhost ? 'ghost' : 'unlocked'}
                                >
                                    <div className="pointer-events-none absolute right-5 top-4 -rotate-12 select-none text-[28px] font-black uppercase text-neutral-800 opacity-[0.06]">
                                        {t('codex.title')}
                                    </div>

                                    <div className="flex flex-col gap-2 border-b border-neutral-500/30 bg-black/5 px-8 pb-5 pt-6">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <CategoryBadge category={selectedResolvedEssay.category} onPaper />
                                            <span className="font-mono text-[14px] font-semibold uppercase tracking-[0.15em] text-neutral-800">
                                                {selectedEssay.year}
                                            </span>
                                            {selectedResolvedEssay.isGhost && (
                                                <span className="font-mono text-[14px] font-bold uppercase tracking-[0.15em] text-amber-900">
                                                    {t('codex.ghostEntry')}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="m-0 text-[28px] font-bold leading-tight text-neutral-900" style={{ fontFamily: 'var(--font-command)' }}>
                                            {selectedResolvedEssay.title}
                                        </h3>
                                        <div className="text-[16px] italic text-neutral-800">
                                            {selectedResolvedEssay.isGhost ? t('codex.historicalGhostEntry') : t('codex.historicalContext')}
                                        </div>
                                    </div>

                                    <div
                                        className="px-8 py-6"
                                        data-testid="codex-selected-essay-body"
                                        data-awwv-codex-selected-state={selectedResolvedEssay.isGhost ? 'ghost' : 'unlocked'}
                                    >
                                        {selectedResolvedEssay.paragraphs.length > 0 ? (
                                            <div className="flex flex-col gap-4 text-[18px] leading-relaxed text-neutral-900" style={{ fontFamily: 'var(--font-command)' }}>
                                                {selectedResolvedEssay.paragraphs.map((paragraph, index) => (
                                                    paragraph.kind === 'canonical' ? (
                                                        <p key={index} className="m-0">{paragraph.text}</p>
                                                    ) : (
                                                        <div
                                                            key={index}
                                                            className={`rounded border-l-4 px-4 py-3 ${
                                                                paragraph.kind === 'ghost'
                                                                    ? 'border-l-amber-700 bg-amber-100/70 italic text-neutral-900'
                                                                    : 'border-l-slate-500 bg-slate-100/60 text-neutral-900'
                                                            }`}
                                                        >
                                                            <div className="mb-1.5 font-mono text-[13px] font-bold uppercase tracking-[0.15em] text-neutral-800">
                                                                {paragraph.kind === 'ghost'
                                                                    ? t('codex.historicalGhost')
                                                                    : paragraph.variant === 'divergence'
                                                                        ? t('codex.playerWarDivergence')
                                                                        : t('codex.dynamicNote')}
                                                            </div>
                                                            <p className="m-0">{paragraph.text}</p>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-3 text-center text-[17px] italic text-neutral-800" style={{ fontFamily: 'var(--font-command)' }}>
                                                {t('codex.contentPending')}
                                            </div>
                                        )}
                                    </div>

                                    {selectedResolvedEssay.sources && selectedResolvedEssay.sources.length > 0 && (
                                        <div className="border-t border-neutral-500/30 bg-black/5 px-8 py-5">
                                            <div className="mb-2 font-mono text-[13px] font-bold uppercase tracking-[0.15em] text-neutral-800">
                                                {t('codex.sources')}
                                            </div>
                                            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[15px] text-neutral-800">
                                                {selectedResolvedEssay.sources.map((src, index) => (
                                                    <li key={index} className="leading-snug">{src}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </SurfaceContent>

                    {hasSideColumn && (
                        <SurfaceDetail aria-label={t('codex.campaignContext.title')}>
                            <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-7 py-6">
                                {/* Live campaign records: realized consequences and campaign-context
                                    ghost records of this campaign. Rendered verbatim. */}
                                {hasLiveRecords && (
                                    <section
                                        data-testid="codex-live-campaign-records"
                                        aria-label={t('codex.campaignContext.title')}
                                        className="flex flex-col gap-3"
                                    >
                                        <h4 className={`m-0 ${SURFACE_LABEL}`}>
                                            {t('codex.campaignContext.title')}
                                        </h4>
                                        <ul className="m-0 flex list-none flex-col gap-3 p-0">
                                            {liveDynamicCodex.receipts.map((receipt) => (
                                                <li
                                                    key={receipt.id}
                                                    data-testid="codex-realized-receipt"
                                                    data-receipt-record-id={receipt.receiptRecordId}
                                                    data-claim-predicate={receipt.claimPredicate.expression}
                                                    data-claim-owner-paths={receipt.claimPredicate.owner_paths.join('|')}
                                                    className="flex flex-col gap-1.5 rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4 text-[16px] leading-relaxed text-[#c2b69c]"
                                                >
                                                    <div className="text-[17px] font-semibold text-[#f1e6c8]">
                                                        {t('chronicle.generated.consequence.title', {
                                                            predictedLabel: receipt.predictedLabel,
                                                        })}
                                                    </div>
                                                    <div>
                                                        {t('chronicle.generated.consequence.detail', {
                                                            decisionOptionLabel: receipt.decisionOptionLabel,
                                                            date: turnToDateString(receipt.decisionTurn),
                                                        })}
                                                    </div>
                                                </li>
                                            ))}
                                            {liveDynamicCodex.ghosts.map((ghost) => {
                                                const prose = resolveGhostEntryProse(ghost.ghost_id, locale);
                                                const proseBlocks = prose === null
                                                    ? []
                                                    : parseGhostEntryProse(prose, ghost.classification);
                                                const headingIndex = proseBlocks.findIndex((block) => block.kind === 'heading');
                                                const rowTitle = headingIndex >= 0
                                                    ? proseBlocks[headingIndex].text
                                                    : t('chronicle.card.ghost');
                                                const bodyBlocks = headingIndex >= 0
                                                    ? proseBlocks.filter((_block, index) => index !== headingIndex)
                                                    : proseBlocks;
                                                return (
                                                    <li
                                                        key={ghost.ghost_id}
                                                        data-testid="codex-live-ghost"
                                                        data-ghost-id={ghost.ghost_id}
                                                        data-ghost-classification={ghost.classification}
                                                        data-claim-predicate={ghost.claim_predicate.expression}
                                                        data-claim-owner-paths={ghost.claim_predicate.owner_paths.join('|')}
                                                        className="flex flex-col gap-1.5 rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4 text-[16px] leading-relaxed text-[#c2b69c]"
                                                    >
                                                        <div className="text-[17px] font-semibold text-[#f1e6c8]">
                                                            {rowTitle}
                                                        </div>
                                                        <div className={SURFACE_LABEL_MUTED}>
                                                            {ghostClassificationLabel(ghost.classification)}
                                                        </div>
                                                        {bodyBlocks.length > 0 && (
                                                            <div data-testid="codex-live-ghost-prose" className="flex flex-col gap-2 pt-1 text-[#ddd1b3]">
                                                                {bodyBlocks.map((block, index) => block.kind === 'heading' ? (
                                                                    <div key={index} className="font-semibold text-[#f1e6c8]">
                                                                        {block.text}
                                                                    </div>
                                                                ) : (
                                                                    <p key={index} className="m-0">{block.text}</p>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </section>
                                )}

                                {/* Phase 3 Thread 2 "the dilemma spine" — "The Choices That Made
                                    This War". Read-only backbone of the seven keystone
                                    "impossible choice" decisions: title, faced / not-yet-faced
                                    badge, chosen branch (when faced), and a control that opens
                                    the linked codex essay. Rows with a null essayId surface the
                                    dilemma without an essay link. Renders nothing when the spine
                                    is empty/absent (flag-off / pre-Thread-2 saves). */}
                                {visibleDilemmaSpine.length > 0 && (
                                    <div
                                        data-testid="codex-dilemma-spine-section"
                                        className="flex flex-col gap-3"
                                    >
                                        <h4 className={`m-0 ${SURFACE_LABEL}`}>
                                            {t('codex.dilemmaSpine.title')}
                                        </h4>
                                        <ul className="m-0 flex list-none flex-col gap-2 p-0">
                                            {visibleDilemmaSpine.map((dilemma) => {
                                                const essayUnlocked = dilemma.essayId
                                                    ? Boolean(resolvedEssays.get(dilemma.essayId)?.isUnlocked)
                                                    : false;
                                                return (
                                                    <li
                                                        key={dilemma.dilemmaId}
                                                        data-testid="codex-dilemma-row"
                                                        data-dilemma-id={dilemma.dilemmaId}
                                                        data-faced={dilemma.faced ? 'true' : 'false'}
                                                        className="flex flex-col gap-2 rounded-md border border-[#2a303c] bg-[#161a22] px-4 py-3.5 text-[16px] leading-snug"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 flex-1 text-[17px] font-semibold text-[#f1e6c8]">{dilemma.title}</div>
                                                            <span
                                                                data-testid="codex-dilemma-faced-badge"
                                                                className={`shrink-0 whitespace-nowrap border px-2.5 py-1 font-mono rounded text-[13px] leading-none font-bold uppercase tracking-[0.1em] ${
                                                                    dilemma.faced
                                                                        ? 'border-amber-300/50 text-amber-200'
                                                                        : 'border-[#3a4150] text-[#b9ad94]'
                                                                }`}
                                                            >
                                                                {dilemma.faced ? t('codex.dilemma.faced') : t('codex.dilemma.notYet')}
                                                            </span>
                                                        </div>
                                                        {dilemma.faced && dilemma.chosenBranchLabel && (
                                                            <div
                                                                data-testid="codex-dilemma-branch"
                                                                className="text-[15px] text-[#c2b69c]"
                                                            >
                                                                {t('codex.dilemma.chose', { choice: dilemma.chosenBranchLabel })}
                                                                {dilemma.decisionTurn !== null && (
                                                                    <span className="text-[#9c917b]"> ({turnToDateString(dilemma.decisionTurn)})</span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {dilemma.essayId ? (
                                                            <button
                                                                type="button"
                                                                data-testid="codex-dilemma-essay-link"
                                                                disabled={!essayUnlocked}
                                                                onClick={() => {
                                                                    const essay = essays.find((e) => e.id === dilemma.essayId);
                                                                    if (essay) setExpandedYear(essay.year);
                                                                    setSelectedEssayId(dilemma.essayId);
                                                                }}
                                                                className={`self-start rounded border px-3 py-1.5 text-[15px] font-semibold transition ${
                                                                    essayUnlocked
                                                                        ? 'border-[#3a4150] bg-[#1b2029] text-[#e8dcbc] hover:border-accent-gold/60 hover:text-accent-gold'
                                                                        : 'cursor-default border-transparent text-[#9c917b]'
                                                                }`}
                                                            >
                                                                {essayUnlocked ? t('codex.dilemma.readEssay') : t('codex.dilemma.locked')}
                                                            </button>
                                                        ) : (
                                                            <span
                                                                data-testid="codex-dilemma-no-essay"
                                                                className="text-[15px] text-[#9c917b]"
                                                            >
                                                                {t('codex.dilemma.noEssay')}
                                                            </span>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}

                                {/* Distance-from-history v1 — "Your War vs History". Read-only
                                    summary of how far the player's emergent war has drifted from
                                    the historical 1992-95, measured as event-decision divergence.
                                    The player-authored divergence count is led. Renders nothing
                                    when the read-model is absent OR no decisions have a historical
                                    default to compare against (totalDecided === 0). */}
                                {distanceFromHistory && distanceFromHistory.totalDecided > 0 && (
                                    <div
                                        data-testid="codex-distance-from-history-section"
                                        className="flex flex-col gap-3"
                                    >
                                        <h4 className={`m-0 ${SURFACE_LABEL}`}>
                                            {t('codex.distance.title')}
                                        </h4>
                                        <div
                                            data-testid="codex-distance-from-history-summary"
                                            className="text-[16px] leading-relaxed text-[#ddd1b3]"
                                        >
                                            <span className="font-semibold text-[#e0c27a]">
                                                {t(
                                                    distanceFromHistory.playerDiverged === 1
                                                        ? 'codex.distance.playerDeparture.one'
                                                        : 'codex.distance.playerDeparture.many',
                                                    { count: distanceFromHistory.playerDiverged },
                                                )}
                                            </span>
                                            {' '}
                                            <span className="text-[#c2b69c]">
                                                {t(
                                                    distanceFromHistory.totalDecided === 1
                                                        ? 'codex.distance.totalDivergence.one'
                                                        : 'codex.distance.totalDivergence.many',
                                                    {
                                                        diverged: distanceFromHistory.diverged,
                                                        total: distanceFromHistory.totalDecided,
                                                        pct: distanceFromHistory.divergencePct,
                                                    },
                                                )}
                                            </span>
                                        </div>
                                        {distanceFromHistory.divergences.length > 0 && (
                                            <ul className="m-0 flex list-none flex-col p-0">
                                                {distanceFromHistory.divergences.map((d) => (
                                                    <li
                                                        key={d.eventId}
                                                        data-testid="codex-distance-from-history-row"
                                                        data-event-id={d.eventId}
                                                        data-source={d.source}
                                                        className="flex items-start gap-3 border-b border-[#262b35] py-2.5 text-[15px] leading-snug last:border-b-0"
                                                    >
                                                        <span className="shrink-0 font-mono text-[14px] text-[#9c917b]">{turnToDateString(d.turn)}</span>
                                                        <div className="min-w-0 flex-1">
                                                            <span className="text-[#f1e6c8]">{d.title}</span>
                                                            <span className="text-[#9c917b]">
                                                                {' '}{t('codex.distance.rowChoicePrefix')}{' '}
                                                                <span className="text-[#ddd1b3]">{d.chosen}</span>
                                                                {' '}{t('codex.distance.rowHistory', { historical: d.historical })}
                                                            </span>
                                                        </div>
                                                        {d.source === 'player' && (
                                                            <span
                                                                data-testid="codex-distance-from-history-player-badge"
                                                                className={`${SURFACE_CHIP} shrink-0 border-amber-300/50 text-amber-200`}
                                                            >
                                                                {t('codex.distance.yours')}
                                                            </span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                {/* Phase H Packet 5 (Component C) — Unlock State section.
                                    Renders only when BOTH `state` and `eventCatalog` props
                                    were provided. Pure data display: aggregate headline +
                                    three sub-lists (fired / enabled-but-not-fired /
                                    closed). Sub-list rows capped at
                                    UNLOCK_STATE_MAX_ROWS_PER_LIST; the section heading
                                    always shows the full count. Developer diagnostic ONLY:
                                    gated behind the dedicated `diagMode` store flag (explicit
                                    `?diag=1` opt-in) so the raw internal event IDs never leak
                                    into the player-facing Codex — hidden by default for players
                                    AND for dev:map playtesters (dev:map runs with generic dev
                                    mode auto-enabled, which deliberately does NOT include this
                                    diagnostics surface). */}
                                {unlockState && diagMode && (
                                    <div
                                        data-testid="codex-unlock-state-section"
                                        className="flex flex-col gap-3"
                                    >
                                        <h4 className={`m-0 ${SURFACE_LABEL}`}>
                                            Unlock State
                                        </h4>
                                        <div
                                            data-testid="codex-unlock-state-summary"
                                            className="font-mono text-[14px] text-[#c2b69c]"
                                        >
                                            Foundational: {unlockState.summary.foundational_count}
                                            {' | '}Fired downstream: {unlockState.summary.downstream_fired_count}
                                            {' | '}Closed: {unlockState.summary.closed_count}
                                            {' | '}Max depth: {unlockState.summary.max_depth}
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            <div
                                                data-testid="codex-unlock-fired-list"
                                                className="flex flex-col gap-1"
                                            >
                                                <div className={SURFACE_LABEL_MUTED}>
                                                    Fired ({unlockState.fired.length})
                                                </div>
                                                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                                                    {unlockState.fired.slice(0, UNLOCK_STATE_MAX_ROWS_PER_LIST).map((id) => {
                                                        const meta = formatUnlockRow(id, eventCatalog!);
                                                        return (
                                                            <li
                                                                key={id}
                                                                data-testid="codex-unlock-fired-row"
                                                                data-event-id={id}
                                                                className="break-words font-mono text-[13px] leading-snug text-[#ddd1b3]"
                                                            >
                                                                <span>{id}</span>
                                                                {' '}
                                                                <span className="text-[#9c917b]">[family={meta.family}]</span>
                                                                {' '}
                                                                <span className="text-[#9c917b]">[source={meta.sourceTier}]</span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                            <div
                                                data-testid="codex-unlock-enabled-list"
                                                className="flex flex-col gap-1"
                                            >
                                                <div className={SURFACE_LABEL_MUTED}>
                                                    Enabled (pending) ({unlockState.enabled.length})
                                                </div>
                                                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                                                    {unlockState.enabled.slice(0, UNLOCK_STATE_MAX_ROWS_PER_LIST).map((id) => {
                                                        const meta = formatUnlockRow(id, eventCatalog!);
                                                        return (
                                                            <li
                                                                key={id}
                                                                data-testid="codex-unlock-enabled-row"
                                                                data-event-id={id}
                                                                className="break-words font-mono text-[13px] leading-snug text-[#ddd1b3]"
                                                            >
                                                                <span>{id}</span>
                                                                {' '}
                                                                <span className="text-[#9c917b]">[family={meta.family}]</span>
                                                                {' '}
                                                                <span className="text-[#9c917b]">[source={meta.sourceTier}]</span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                            <div
                                                data-testid="codex-unlock-closed-list"
                                                className="flex flex-col gap-1"
                                            >
                                                <div className={SURFACE_LABEL_MUTED}>
                                                    Closed ({unlockState.closed.length})
                                                </div>
                                                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                                                    {unlockState.closed.slice(0, UNLOCK_STATE_MAX_ROWS_PER_LIST).map((id) => {
                                                        const meta = formatUnlockRow(id, eventCatalog!);
                                                        return (
                                                            <li
                                                                key={id}
                                                                data-testid="codex-unlock-closed-row"
                                                                data-event-id={id}
                                                                className="break-words font-mono text-[13px] leading-snug text-[#ddd1b3]"
                                                            >
                                                                <span>{id}</span>
                                                                {' '}
                                                                <span className="text-[#9c917b]">[family={meta.family}]</span>
                                                                {' '}
                                                                <span className="text-[#9c917b]">[source={meta.sourceTier}]</span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SurfaceDetail>
                    )}
                </SurfaceColumns>
            </section>
        </div>
    );
}
