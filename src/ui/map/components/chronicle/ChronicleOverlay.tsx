import React, { useMemo, useEffect, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { generateChronicleEntries } from './generateChronicleEntries.js';
import { ChronicleCard } from './ChronicleCard.js';
import { ChronicleSpine } from './ChronicleSpine.js';

export function ChronicleOverlay() {
    const open = useGameStore(s => s.chronicleOpen);
    const setOpen = useGameStore(s => s.setChronicleOpen);
    const state = useGameStore(s => s.loadedGameState);

    const turnSummaries = state?.turnSummaries ?? [];

    const entries = useMemo(() =>
        turnSummaries.length > 0 ? generateChronicleEntries(state) : [],
        [turnSummaries]
    );

    const turnGroups = useMemo(() => {
        const groups = new Map<number, typeof entries>();
        for (const entry of entries) {
            const existing = groups.get(entry.turn) ?? [];
            existing.push(entry);
            groups.set(entry.turn, existing);
        }
        return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
    }, [entries]);

    const handleClose = useCallback(() => setOpen(false), [setOpen]);

    // ESC to close
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, handleClose]);

    if (!open || !state) return null;

    return (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
                <h1 className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-amber-400">
                    War Chronicle
                </h1>
                <button
                    onClick={handleClose}
                    className="text-xs font-mono text-text-secondary hover:text-red-400 transition-colors uppercase tracking-wider"
                >
                    CLOSE [ESC]
                </button>
            </div>

            {/* Scrollable body: spine + cards */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {turnGroups.length === 0 ? (
                    <div className="text-center text-text-secondary text-xs font-mono mt-20 opacity-50">
                        No events recorded yet. Advance turns to build your chronicle.
                    </div>
                ) : (
                    <div className="flex gap-4 max-w-4xl mx-auto">
                        {/* Spine */}
                        <ChronicleSpine turnSummaries={turnSummaries} />

                        {/* Cards */}
                        <div className="flex-1 flex flex-col gap-2">
                            {turnGroups.map(([turn, groupEntries]) => (
                                <div key={turn} className="flex flex-col gap-1.5">
                                    {/* Turn marker */}
                                    <div className="text-[9px] font-mono text-text-secondary opacity-40 uppercase tracking-wider mt-2">
                                        Turn {turn}
                                    </div>
                                    {/* Cards for this turn */}
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {groupEntries.map((entry, i) => (
                                            <ChronicleCard key={`${turn}-${entry.type}-${i}`} entry={entry} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
