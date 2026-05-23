/**
 * CodexPanel - Historical essay viewer unlocked by in-game events.
 * Sidebar list grouped by year, content viewer on right with paper aesthetic.
 * Locked essays show title only (grayed out). Unlocked essays expand with full content.
 */
import { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import essayIndex from '../../../../data/scenarios/essays/essay_index.json';
import { resolveCodexEssay, type EssayEntry } from './codex/codexEssayResolver.js';
import { useLocale } from '../i18n';
import { Z } from '../../shared/zIndex.js';

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

interface CodexPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CodexPanel({ isOpen, onClose }: CodexPanelProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const locale = useLocale();
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

    const essays = (Array.isArray(essayIndex) ? essayIndex : (essayIndex as { essays: EssayEntry[] }).essays ?? []) as EssayEntry[];
    const resolvedEssays = useMemo(() => {
        const context = {
            firedEventIds,
            eventFlags: loadedGameState?.eventFlags,
            historicalComparison: loadedGameState?.historicalComparison,
            costLedger: loadedGameState?.costLedger,
            gameOver: loadedGameState?.gameOver,
        };
        return new Map(essays.map((essay) => [essay.id, resolveCodexEssay(essay, context)]));
    }, [essays, firedEventIds, locale, loadedGameState?.eventFlags, loadedGameState?.historicalComparison, loadedGameState?.costLedger, loadedGameState?.gameOver]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm" style={{ zIndex: Z.CODEX }}>
            <div className="w-[760px] max-w-[95vw] h-[80vh] bg-[#0c0e14] border border-neutral-700/50 rounded-lg shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-700/50 bg-[#10131a]">
                    <div className="flex items-center gap-2.5">
                        <div className="text-amber-400 text-[15px] font-bold tracking-[0.13em] uppercase">
                            Codex
                        </div>
                        <div className="text-[9px] text-neutral-500">
                            {availableCount === 1 ? '1 essay' : `${availableCount} essays`} available
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
                                                    <CategoryBadge category={essay.category} />
                                                    {ghost && (
                                                        <span className="text-[7px] text-amber-500 uppercase tracking-wider">
                                                            Ghost
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] leading-snug text-neutral-200">
                                                    {essay.title}
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
                                    <div className="text-neutral-600 text-[13px] mb-2">Select an essay</div>
                                    <div className="text-neutral-700 text-[9px] max-w-[260px]">
                                        Historical essays open as you experience events during the war.
                                        Some endgame essays can also surface as historical ghosts when your war
                                        diverges sharply from the real one.
                                    </div>
                                </div>
                            </div>
                        ) : !selectedResolvedEssay?.isUnlocked ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="text-neutral-500 text-[13px] mb-2">{selectedEssay.title}</div>
                                    <div className="text-[9px] text-neutral-600 border border-neutral-700/30 rounded-md px-2.5 py-2 bg-neutral-800/20 max-w-[300px]">
                                        Experience this event during gameplay to unlock the full historical essay.
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#f5f0e8] border border-neutral-300 rounded-lg shadow-md relative max-w-[500px] mx-auto">
                                <div className="absolute top-2.5 right-3.5 opacity-[0.06] font-black text-[22px] -rotate-12 select-none uppercase text-neutral-800 pointer-events-none">
                                    CODEX
                                </div>

                                <div className="px-3 py-1.5 border-b border-neutral-300/60 bg-[#ebe5d8] rounded-t-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CategoryBadge category={selectedEssay.category} />
                                        <span className="text-[8px] uppercase text-neutral-500 tracking-[0.15em]">
                                            {selectedEssay.year}
                                        </span>
                                        {selectedResolvedEssay.isGhost && (
                                            <span className="text-[8px] uppercase text-amber-700 tracking-[0.15em] font-bold">
                                                Ghost Entry
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[12px] font-bold text-neutral-800 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                                        {selectedEssay.title}
                                    </div>
                                    <div className="text-[8px] text-neutral-500 mt-1 italic">
                                        {selectedResolvedEssay.isGhost ? 'Historical Ghost Entry' : 'Historical Context'}
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
                                                                ? 'Historical Ghost'
                                                                : paragraph.variant === 'divergence'
                                                                    ? 'Player War Divergence'
                                                                    : 'Dynamic Note'}
                                                        </div>
                                                        <p>{paragraph.text}</p>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-[9px] text-neutral-400 italic text-center py-3" style={{ fontFamily: 'Georgia, serif' }}>
                                            Essay content pending generation.
                                        </div>
                                    )}
                                </div>

                                {selectedEssay.sources && selectedEssay.sources.length > 0 && (
                                    <div className="px-3 py-1.5 border-t border-neutral-300/60 bg-[#ebe5d8] rounded-b-lg">
                                        <div className="text-[7px] uppercase text-neutral-500 font-bold tracking-[0.15em] mb-1">
                                            Sources
                                        </div>
                                        <ul className="text-[8px] text-neutral-500 space-y-0.5">
                                            {selectedEssay.sources.map((src, index) => (
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
