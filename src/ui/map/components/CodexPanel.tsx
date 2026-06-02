/**
 * CodexPanel - Historical essay viewer unlocked by in-game events.
 * Sidebar list grouped by year, content viewer on right with paper aesthetic.
 * Locked essays show title only (grayed out). Unlocked essays expand with full content.
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
import { resolveCodexEssay, type EssayEntry } from './codex/codexEssayResolver.js';
import { t, useLocale } from '../i18n';
import { Z } from '../../shared/zIndex.js';
import type { EventDefinition } from '../../../sim/events/event_types.js';
import type { GameState } from '../../../state/game_state.js';
import { getEventChainSummary } from '../../../sim/events/causality_query.js';

const YEARS = [1992, 1993, 1994, 1995] as const;

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
    military: { bg: 'bg-red-400/15', text: 'text-red-400' },
    political: { bg: 'bg-blue-400/15', text: 'text-blue-400' },
    diplomatic: { bg: 'bg-cyan-400/15', text: 'text-cyan-400' },
    humanitarian: { bg: 'bg-amber-400/15', text: 'text-amber-400' },
};

function CategoryBadge({ category }: { category: string }) {
    const colors = CATEGORY_COLORS[category] ?? { bg: 'bg-neutral-400/15', text: 'text-neutral-400' };
    return (
        <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] rounded ${colors.bg} ${colors.text}`}>
            {category}
        </span>
    );
}

function formatAvailableCount(count: number): string {
    return count === 1
        ? t('codex.available.one')
        : t('codex.available.many', { count });
}

interface CodexPanelProps {
    isOpen: boolean;
    onClose: () => void;
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

export function CodexPanel({ isOpen, onClose, eventCatalog, state }: CodexPanelProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const devMode = useGameStore((s) => s.devMode);
    const [locale] = useLocale();
    const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
    const [expandedYear, setExpandedYear] = useState<number | null>(1992);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
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

    // Distance-from-history read-model v1: how far the player's emergent war has
    // drifted from the historical 1992-95 (event-decision divergence). Absent on
    // flag-off / pre-substrate saves; the section degrades to nothing.
    const distanceFromHistory = loadedGameState?.distanceFromHistory ?? null;

    const essays = (Array.isArray(essayIndex) ? essayIndex : (essayIndex as { essays: EssayEntry[] }).essays ?? []) as EssayEntry[];
    const resolvedEssays = useMemo(() => {
        const context = {
            firedEventIds,
            eventFlags: loadedGameState?.eventFlags,
            decisionResponses: loadedGameState?.decisionResponses,
            historicalComparison: loadedGameState?.historicalComparison,
            costLedger: loadedGameState?.costLedger,
            gameOver: loadedGameState?.gameOver,
        };
        return new Map(essays.map((essay) => [essay.id, resolveCodexEssay(essay, context, locale)]));
    }, [essays, firedEventIds, locale, loadedGameState?.eventFlags, loadedGameState?.decisionResponses, loadedGameState?.historicalComparison, loadedGameState?.costLedger, loadedGameState?.gameOver]);

    const visibleEssaysByYear = useMemo(() => {
        const grouped = new Map<number, EssayEntry[]>();
        for (const year of YEARS) grouped.set(year, []);
        for (const essay of essays) {
            if (!resolvedEssays.get(essay.id)?.isUnlocked) continue;
            const yearGroup = grouped.get(essay.year);
            if (yearGroup) yearGroup.push(essay);
        }
        return grouped;
    }, [essays, resolvedEssays]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm" style={{ zIndex: Z.CODEX }}>
            <div className="w-[760px] max-w-[95vw] h-[80vh] bg-[#0c0e14] border border-neutral-700/50 rounded-lg shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-700/50 bg-[#10131a]">
                    <div className="flex items-center gap-2.5">
                        <div className="text-amber-400 text-[15px] font-bold tracking-[0.13em] uppercase">
                            {t('codex.title')}
                        </div>
                        <div className="text-[9px] text-neutral-500">
                            {t(availableCount === 1 ? 'codex.essayAvailableSingular' : 'codex.essayAvailablePlural', { count: availableCount })}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-neutral-500 hover:text-neutral-300 transition-colors text-[11px] px-2 py-0.5"
                    >
                        ESC
                    </button>
                </div>

                {/* Phase 3 Thread 2 "the dilemma spine" — "The Choices That Made
                    This War". Read-only backbone of the seven keystone
                    "impossible choice" decisions: title, faced / not-yet-faced
                    badge, chosen branch (when faced), and a control that opens
                    the linked codex essay. Rows with a null essayId surface the
                    dilemma without an essay link. Renders nothing when the spine
                    is empty/absent (flag-off / pre-Thread-2 saves). */}
                {dilemmaSpine.length > 0 && (
                    <div
                        data-testid="codex-dilemma-spine-section"
                        className="border-b border-neutral-700/40 bg-[#0d0f16] px-3 py-2"
                    >
                        <div className="text-amber-400 text-[10px] font-bold tracking-[0.12em] uppercase mb-1.5">
                            The Choices That Made This War
                        </div>
                        <ul className="space-y-1">
                            {dilemmaSpine.map((dilemma) => {
                                const essayUnlocked = dilemma.essayId
                                    ? Boolean(resolvedEssays.get(dilemma.essayId)?.isUnlocked)
                                    : false;
                                return (
                                    <li
                                        key={dilemma.dilemmaId}
                                        data-testid="codex-dilemma-row"
                                        data-dilemma-id={dilemma.dilemmaId}
                                        data-faced={dilemma.faced ? 'true' : 'false'}
                                        className="flex items-start gap-2 text-[9px] leading-snug"
                                    >
                                        <span
                                            data-testid="codex-dilemma-faced-badge"
                                            className={`mt-[1px] shrink-0 px-1 py-0.5 rounded text-[7px] font-bold uppercase tracking-[0.1em] ${
                                                dilemma.faced
                                                    ? 'bg-amber-400/15 text-amber-400'
                                                    : 'bg-neutral-500/15 text-neutral-500'
                                            }`}
                                        >
                                            {dilemma.faced ? 'Faced' : 'Not yet'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-neutral-200">{dilemma.title}</div>
                                            {dilemma.faced && dilemma.chosenBranchLabel && (
                                                <div
                                                    data-testid="codex-dilemma-branch"
                                                    className="text-neutral-400 text-[8px] mt-0.5"
                                                >
                                                    Chose: {dilemma.chosenBranchLabel}
                                                    {dilemma.decisionTurn !== null && (
                                                        <span className="text-neutral-600"> (W{dilemma.decisionTurn})</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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
                                                className={`shrink-0 text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded transition-colors ${
                                                    essayUnlocked
                                                        ? 'text-amber-400 hover:bg-amber-400/10'
                                                        : 'text-neutral-600 cursor-default'
                                                }`}
                                            >
                                                {essayUnlocked ? 'Read essay' : 'Locked'}
                                            </button>
                                        ) : (
                                            <span
                                                data-testid="codex-dilemma-no-essay"
                                                className="shrink-0 text-[8px] uppercase tracking-[0.1em] text-neutral-700 px-1.5 py-0.5"
                                            >
                                                No essay
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
                        className="border-b border-neutral-700/40 bg-[#0d0f16] px-3 py-2"
                    >
                        <div className="text-amber-400 text-[10px] font-bold tracking-[0.12em] uppercase mb-1">
                            Your War vs History
                        </div>
                        <div
                            data-testid="codex-distance-from-history-summary"
                            className="text-[9px] text-neutral-300 mb-1.5"
                        >
                            <span className="text-amber-400 font-bold">
                                You authored {distanceFromHistory.playerDiverged} departure
                                {distanceFromHistory.playerDiverged === 1 ? '' : 's'} from history.
                            </span>
                            {' '}
                            <span className="text-neutral-400">
                                {distanceFromHistory.diverged} of {distanceFromHistory.totalDecided} decision
                                {distanceFromHistory.totalDecided === 1 ? '' : 's'} diverged from the historical
                                record ({distanceFromHistory.divergencePct}%).
                            </span>
                        </div>
                        {distanceFromHistory.divergences.length > 0 && (
                            <ul className="space-y-0.5">
                                {distanceFromHistory.divergences.map((d) => (
                                    <li
                                        key={d.eventId}
                                        data-testid="codex-distance-from-history-row"
                                        data-event-id={d.eventId}
                                        data-source={d.source}
                                        className="flex items-start gap-2 text-[9px] leading-snug"
                                    >
                                        <span className="text-neutral-600 shrink-0">W{d.turn}</span>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-neutral-200">{d.title}</span>
                                            <span className="text-neutral-500">
                                                {' '}— chose <span className="text-neutral-300">{d.chosen}</span>
                                                {' '}(history: {d.historical})
                                            </span>
                                        </div>
                                        {d.source === 'player' && (
                                            <span
                                                data-testid="codex-distance-from-history-player-badge"
                                                className="shrink-0 text-[7px] font-bold uppercase tracking-[0.1em] px-1 py-0.5 rounded bg-amber-400/15 text-amber-400"
                                            >
                                                Yours
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
                    gated behind the `devMode` store flag so the raw internal
                    event IDs never leak into the player-facing Codex (hidden
                    by default for players AND dev:map playtesters; shown only
                    when a developer explicitly enables DEV mode). */}
                {unlockState && devMode && (
                    <div
                        data-testid="codex-unlock-state-section"
                        className="border-b border-neutral-700/40 bg-[#0d0f16] px-3 py-2"
                    >
                        <div className="text-amber-400 text-[10px] font-bold tracking-[0.12em] uppercase mb-1">
                            Unlock State
                        </div>
                        <div
                            data-testid="codex-unlock-state-summary"
                            className="text-[9px] text-neutral-400 mb-2"
                        >
                            Foundational: {unlockState.summary.foundational_count}
                            {' | '}Fired downstream: {unlockState.summary.downstream_fired_count}
                            {' | '}Closed: {unlockState.summary.closed_count}
                            {' | '}Max depth: {unlockState.summary.max_depth}
                        </div>
                        <div className="flex gap-3">
                            <div
                                data-testid="codex-unlock-fired-list"
                                className="flex-1"
                            >
                                <div className="text-[8px] uppercase tracking-[0.1em] text-neutral-500 mb-0.5">
                                    Fired ({unlockState.fired.length})
                                </div>
                                <ul className="space-y-0.5">
                                    {unlockState.fired.slice(0, UNLOCK_STATE_MAX_ROWS_PER_LIST).map((id) => {
                                        const meta = formatUnlockRow(id, eventCatalog!);
                                        return (
                                            <li
                                                key={id}
                                                data-testid="codex-unlock-fired-row"
                                                data-event-id={id}
                                                className="text-[9px] text-neutral-300 leading-snug"
                                            >
                                                <span>{id}</span>
                                                {' '}
                                                <span className="text-neutral-500">[family={meta.family}]</span>
                                                {' '}
                                                <span className="text-neutral-500">[source={meta.sourceTier}]</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                            <div
                                data-testid="codex-unlock-enabled-list"
                                className="flex-1"
                            >
                                <div className="text-[8px] uppercase tracking-[0.1em] text-neutral-500 mb-0.5">
                                    Enabled (pending) ({unlockState.enabled.length})
                                </div>
                                <ul className="space-y-0.5">
                                    {unlockState.enabled.slice(0, UNLOCK_STATE_MAX_ROWS_PER_LIST).map((id) => {
                                        const meta = formatUnlockRow(id, eventCatalog!);
                                        return (
                                            <li
                                                key={id}
                                                data-testid="codex-unlock-enabled-row"
                                                data-event-id={id}
                                                className="text-[9px] text-neutral-300 leading-snug"
                                            >
                                                <span>{id}</span>
                                                {' '}
                                                <span className="text-neutral-500">[family={meta.family}]</span>
                                                {' '}
                                                <span className="text-neutral-500">[source={meta.sourceTier}]</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                            <div
                                data-testid="codex-unlock-closed-list"
                                className="flex-1"
                            >
                                <div className="text-[8px] uppercase tracking-[0.1em] text-neutral-500 mb-0.5">
                                    Closed ({unlockState.closed.length})
                                </div>
                                <ul className="space-y-0.5">
                                    {unlockState.closed.slice(0, UNLOCK_STATE_MAX_ROWS_PER_LIST).map((id) => {
                                        const meta = formatUnlockRow(id, eventCatalog!);
                                        return (
                                            <li
                                                key={id}
                                                data-testid="codex-unlock-closed-row"
                                                data-event-id={id}
                                                className="text-[9px] text-neutral-300 leading-snug"
                                            >
                                                <span>{id}</span>
                                                {' '}
                                                <span className="text-neutral-500">[family={meta.family}]</span>
                                                {' '}
                                                <span className="text-neutral-500">[source={meta.sourceTier}]</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-1 min-h-0">
                    <div className="w-[220px] border-r border-neutral-700/30 overflow-y-auto bg-[#0d0f16]">
                        {YEARS.map((year) => {
                            const yearEssays = visibleEssaysByYear.get(year) ?? [];
                            if (yearEssays.length === 0) return null;
                            const isExpanded = expandedYear === year;

                            return (
                                <div key={year}>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedYear(isExpanded ? null : year)}
                                        className="w-full flex items-center justify-between px-2.5 py-1 text-left hover:bg-white/5 transition-colors border-b border-neutral-800/50"
                                    >
                                        <span className="text-[10px] font-bold text-neutral-300 tracking-[0.08em]">
                                            {year}
                                        </span>
                                        <span className="text-[9px] text-neutral-500">
                                            {yearEssays.length}
                                        </span>
                                    </button>
                                    {isExpanded && yearEssays.map((essay) => {
                                        const ghost = Boolean(resolvedEssays.get(essay.id)?.isGhost);
                                        const isSelected = selectedEssayId === essay.id;

                                        return (
                                            <button
                                                key={essay.id}
                                                type="button"
                                                onClick={() => setSelectedEssayId(essay.id)}
                                                data-awwv-codex-state={ghost ? 'ghost' : 'unlocked'}
                                                className={`w-full text-left px-2.5 py-1.5 border-b border-neutral-800/30 transition-all ${
                                                    isSelected
                                                        ? 'bg-amber-400/10 border-l-2 border-l-amber-400'
                                                        : 'hover:bg-white/3 border-l-2 border-l-transparent'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <CategoryBadge category={resolvedEssays.get(essay.id)?.category ?? essay.category} />
                                                    {ghost && (
                                                        <span className="text-[7px] text-amber-500 uppercase tracking-wider">
                                                            {t('codex.ghost')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] leading-snug text-neutral-200">
                                                    {resolvedEssays.get(essay.id)?.title ?? essay.title}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex-1 overflow-y-auto p-2.5">
                        {!selectedEssay ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="text-neutral-600 text-[13px] mb-2">{t('codex.selectEssay')}</div>
                                    <div className="text-neutral-700 text-[9px] max-w-[260px]">
                                        {t('codex.selectEssayHelp')}
                                    </div>
                                </div>
                            </div>
                        ) : !selectedResolvedEssay?.isUnlocked ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="text-neutral-500 text-[13px] mb-2">{selectedResolvedEssay?.title ?? selectedEssay.title}</div>
                                    <div className="text-[9px] text-neutral-600 border border-neutral-700/30 rounded-md px-2.5 py-2 bg-neutral-800/20 max-w-[300px]">
                                        {t('codex.lockedHelp')}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#f5f0e8] border border-neutral-300 rounded-lg shadow-md relative max-w-[500px] mx-auto">
                                <div className="absolute top-2.5 right-3.5 opacity-[0.06] font-black text-[22px] -rotate-12 select-none uppercase text-neutral-800 pointer-events-none">
                                    {t('codex.title')}
                                </div>

                                <div className="px-3 py-1.5 border-b border-neutral-300/60 bg-[#ebe5d8] rounded-t-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CategoryBadge category={selectedResolvedEssay.category} />
                                        <span className="text-[8px] uppercase text-neutral-500 tracking-[0.15em]">
                                            {selectedEssay.year}
                                        </span>
                                        {selectedResolvedEssay.isGhost && (
                                            <span className="text-[8px] uppercase text-amber-700 tracking-[0.15em] font-bold">
                                                {t('codex.ghostEntry')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[12px] font-bold text-neutral-800 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                                        {selectedResolvedEssay.title}
                                    </div>
                                    <div className="text-[8px] text-neutral-500 mt-1 italic">
                                        {selectedResolvedEssay.isGhost ? t('codex.historicalGhostEntry') : t('codex.historicalContext')}
                                    </div>
                                </div>

                                <div className="px-3 py-2.5" data-awwv-codex-selected-state={selectedResolvedEssay.isGhost ? 'ghost' : 'unlocked'}>
                                    {selectedResolvedEssay.paragraphs.length > 0 ? (
                                        <div className="text-[9px] text-neutral-700 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                                            {selectedResolvedEssay.paragraphs.map((paragraph, index) => (
                                                paragraph.kind === 'canonical' ? (
                                                    <p key={index} className="mb-2 last:mb-0">{paragraph.text}</p>
                                                ) : (
                                                    <div
                                                        key={index}
                                                        className={`mb-2 last:mb-0 rounded border-l-2 px-2 py-1.5 ${
                                                            paragraph.kind === 'ghost'
                                                                ? 'border-l-amber-700 bg-amber-100/70 text-neutral-800 italic'
                                                                : 'border-l-slate-500 bg-slate-100/60 text-neutral-700'
                                                        }`}
                                                    >
                                                        <div className="text-[7px] uppercase tracking-[0.15em] font-bold mb-1 text-neutral-500">
                                                            {paragraph.kind === 'ghost'
                                                                ? t('codex.historicalGhost')
                                                                : paragraph.variant === 'divergence'
                                                                    ? t('codex.playerWarDivergence')
                                                                    : t('codex.dynamicNote')}
                                                        </div>
                                                        <p>{paragraph.text}</p>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-[9px] text-neutral-400 italic text-center py-3" style={{ fontFamily: 'Georgia, serif' }}>
                                            {t('codex.contentPending')}
                                        </div>
                                    )}
                                </div>

                                {selectedResolvedEssay.sources && selectedResolvedEssay.sources.length > 0 && (
                                    <div className="px-3 py-1.5 border-t border-neutral-300/60 bg-[#ebe5d8] rounded-b-lg">
                                        <div className="text-[7px] uppercase text-neutral-500 font-bold tracking-[0.15em] mb-1">
                                            {t('codex.sources')}
                                        </div>
                                        <ul className="text-[8px] text-neutral-500 space-y-0.5">
                                            {selectedResolvedEssay.sources.map((src, index) => (
                                                <li key={index} className="leading-snug">{src}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
