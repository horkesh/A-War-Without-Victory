/**
 * CodexPanel — Historical essay viewer unlocked by in-game events.
 * Sidebar list grouped by year, content viewer on right with paper aesthetic.
 * Locked essays show title only (grayed out). Unlocked essays expand with full content.
 */
import { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import essayIndex from '../../../../data/scenarios/essays/essay_index.json';

interface EssayEntry {
    id: string;
    event_id: string;
    title: string;
    year: number;
    category: string;
    content?: string;
    sources?: string[];
    generated?: boolean;
}

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
    const firedEvents = useGameStore((s) => s.loadedGameState?.firedEvents);
    const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
    const [expandedYear, setExpandedYear] = useState<number | null>(1992);

    // Escape key closes the panel
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

    // Build set of fired event IDs for O(1) lookup
    const firedEventIds = useMemo(() => {
        const ids = new Set<string>();
        if (firedEvents) {
            for (const e of firedEvents) {
                ids.add(e.id);
            }
        }
        return ids;
    }, [firedEvents]);

    // Cast and group essays by year
    const essays = (Array.isArray(essayIndex) ? essayIndex : (essayIndex as { essays: EssayEntry[] }).essays ?? []) as EssayEntry[];
    const essaysByYear = useMemo(() => {
        const grouped = new Map<number, EssayEntry[]>();
        for (const year of YEARS) {
            grouped.set(year, []);
        }
        for (const essay of essays) {
            const yearGroup = grouped.get(essay.year);
            if (yearGroup) {
                yearGroup.push(essay);
            }
        }
        return grouped;
    }, [essays]);

    // Count stats
    const totalEssays = essays.length;
    const unlockedCount = useMemo(
        () => essays.filter((e) => firedEventIds.has(e.event_id)).length,
        [essays, firedEventIds],
    );

    const selectedEssay = useMemo(
        () => (selectedEssayId ? essays.find((e) => e.id === selectedEssayId) ?? null : null),
        [selectedEssayId, essays],
    );
    const isSelectedUnlocked = selectedEssay ? firedEventIds.has(selectedEssay.event_id) : false;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-[800px] max-w-[95vw] h-[82vh] bg-[#0c0e14] border border-neutral-700/50 rounded-lg shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-neutral-700/50 bg-[#10131a]">
                    <div className="flex items-center gap-2.5">
                        <div className="text-amber-400 text-[15px] font-bold tracking-[0.13em] uppercase">
                            Codex
                        </div>
                        <div className="text-[9px] text-neutral-500">
                            {unlockedCount} / {totalEssays} essays unlocked
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

                {/* Body: sidebar + content */}
                <div className="flex flex-1 min-h-0">
                    {/* Sidebar — essay list grouped by year */}
                    <div className="w-[236px] border-r border-neutral-700/30 overflow-y-auto bg-[#0d0f16]">
                        {YEARS.map((year) => {
                            const yearEssays = essaysByYear.get(year) ?? [];
                            const yearUnlocked = yearEssays.filter((e) => firedEventIds.has(e.event_id)).length;
                            const isExpanded = expandedYear === year;

                            return (
                                <div key={year}>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedYear(isExpanded ? null : year)}
                                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-left hover:bg-white/5 transition-colors border-b border-neutral-800/50"
                                    >
                                        <span className="text-[10px] font-bold text-neutral-300 tracking-[0.08em]">
                                            {year}
                                        </span>
                                        <span className="text-[9px] text-neutral-500">
                                            {yearUnlocked}/{yearEssays.length}
                                        </span>
                                    </button>
                                    {isExpanded && yearEssays.map((essay) => {
                                        const unlocked = firedEventIds.has(essay.event_id);
                                        const isSelected = selectedEssayId === essay.id;

                                        return (
                                            <button
                                                key={essay.id}
                                                type="button"
                                                onClick={() => setSelectedEssayId(essay.id)}
                                            className={`w-full text-left px-3 py-1.5 border-b border-neutral-800/30 transition-all ${
                                                    isSelected
                                                        ? 'bg-amber-400/10 border-l-2 border-l-amber-400'
                                                        : 'hover:bg-white/3 border-l-2 border-l-transparent'
                                                } ${unlocked ? '' : 'opacity-40'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <CategoryBadge category={essay.category} />
                                                    {!unlocked && (
                                                        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">
                                                            Locked
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`text-[10px] leading-snug ${
                                                    unlocked ? 'text-neutral-200' : 'text-neutral-500'
                                                }`}>
                                                    {essay.title}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    {/* Content viewer */}
                    <div className="flex-1 overflow-y-auto p-3">
                        {!selectedEssay ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="text-neutral-600 text-[13px] mb-2">Select an essay</div>
                                    <div className="text-neutral-700 text-[9px] max-w-[280px]">
                                        Historical essays are unlocked as you experience events during the war.
                                        Each essay provides context drawn from ICTY trial records, academic sources,
                                        and primary documents.
                                    </div>
                                </div>
                            </div>
                        ) : !isSelectedUnlocked ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="text-neutral-500 text-[13px] mb-2">{selectedEssay.title}</div>
                                    <div className="text-[9px] text-neutral-600 border border-neutral-700/30 rounded-md px-3 py-2.5 bg-neutral-800/20 max-w-[330px]">
                                        Experience this event during gameplay to unlock the full historical essay.
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Paper aesthetic for unlocked essay */
                            <div className="bg-[#f5f0e8] border border-neutral-300 rounded-lg shadow-md relative max-w-[540px] mx-auto">
                                {/* Stamp */}
                                <div className="absolute top-2.5 right-3.5 opacity-[0.06] font-black text-[22px] -rotate-12 select-none uppercase text-neutral-800 pointer-events-none">
                                    CODEX
                                </div>

                                {/* Header */}
                                <div className="px-3.5 py-2 border-b border-neutral-300/60 bg-[#ebe5d8] rounded-t-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CategoryBadge category={selectedEssay.category} />
                                        <span className="text-[8px] uppercase text-neutral-500 tracking-[0.15em]">
                                            {selectedEssay.year}
                                        </span>
                                    </div>
                                    <div className="text-[12px] font-bold text-neutral-800 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                                        {selectedEssay.title}
                                    </div>
                                    <div className="text-[8px] text-neutral-500 mt-1 italic">
                                        Historical Context
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="px-3.5 py-3">
                                    {selectedEssay.content ? (
                                        <div
                                            className="text-[9px] text-neutral-700 leading-relaxed"
                                            style={{ fontFamily: 'Georgia, serif' }}
                                        >
                                            {selectedEssay.content.split('\n\n').map((para, i) => (
                                                <p key={i} className="mb-2.5 last:mb-0">{para}</p>
                                            ))}
                                        </div>
                                    ) : (
                                    <div className="text-[9px] text-neutral-400 italic text-center py-4" style={{ fontFamily: 'Georgia, serif' }}>
                                            Essay content pending generation.
                                        </div>
                                    )}
                                </div>

                                {/* Sources footer */}
                                {selectedEssay.sources && selectedEssay.sources.length > 0 && (
                                    <div className="px-3.5 py-1.5 border-t border-neutral-300/60 bg-[#ebe5d8] rounded-b-lg">
                                        <div className="text-[7px] uppercase text-neutral-500 font-bold tracking-[0.15em] mb-1">
                                            Sources
                                        </div>
                                        <ul className="text-[8px] text-neutral-500 space-y-0.5">
                                            {selectedEssay.sources.map((src, i) => (
                                                <li key={i} className="leading-snug">{src}</li>
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
