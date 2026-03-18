/**
 * Brigade tray — bottom-anchored panel with parameters strip + scrollable brigade cards.
 */
import { useCallback, useMemo } from 'react';
import type { FormationView } from '../../data/types';
import type { OpsPlanState } from './types';
import { BrigadeCard } from './BrigadeCard';
import { PlanParameters } from './PlanParameters';
import type { ProposedBrigade } from './autoPropose';

interface BrigadeTrayProps {
    plan: OpsPlanState;
    onUpdate: (partial: Partial<OpsPlanState>) => void;
    corpsBrigades: FormationView[];
    autoProposed: ProposedBrigade[];
    factionColor: string;
}

export function BrigadeTray({ plan, onUpdate, corpsBrigades, autoProposed, factionColor }: BrigadeTrayProps) {
    const activeAxis = plan.axes.find((a) => a.id === plan.activeAxisId) ?? plan.axes[0];
    const brigadeIdList = activeAxis?.brigadeIds ?? [];
    const assignedIds = useMemo(() => new Set(brigadeIdList), [brigadeIdList]);

    // Auto-proposed lookup
    const proposedMap = useMemo(() => {
        const m = new Map<string, ProposedBrigade>();
        for (const p of autoProposed) m.set(p.brigadeId, p);
        return m;
    }, [autoProposed]);

    // Sort: assigned first, then by auto-propose score, then by personnel
    const sortedBrigades = useMemo(() => {
        return [...corpsBrigades].sort((a, b) => {
            const aAssigned = assignedIds.has(a.id) ? 0 : 1;
            const bAssigned = assignedIds.has(b.id) ? 0 : 1;
            if (aAssigned !== bAssigned) return aAssigned - bAssigned;
            const aScore = proposedMap.get(a.id)?.score ?? 0;
            const bScore = proposedMap.get(b.id)?.score ?? 0;
            if (aScore !== bScore) return bScore - aScore;
            return (b.personnel ?? 0) - (a.personnel ?? 0);
        });
    }, [corpsBrigades, assignedIds, proposedMap]);

    const toggleBrigade = useCallback((brigadeId: string) => {
        if (!activeAxis) return;
        const isCurrentlyAssigned = activeAxis.brigadeIds.includes(brigadeId);
        const newBrigadeIds = isCurrentlyAssigned
            ? activeAxis.brigadeIds.filter((id) => id !== brigadeId)
            : [...activeAxis.brigadeIds, brigadeId];

        onUpdate({
            axes: plan.axes.map((a) =>
                a.id === activeAxis.id ? { ...a, brigadeIds: newBrigadeIds } : a
            ),
        });
    }, [activeAxis, plan.axes, onUpdate]);

    // Max assembly time
    const maxMarch = useMemo(() => {
        if (!activeAxis) return 0;
        let max = 0;
        for (const id of activeAxis.brigadeIds) {
            const p = proposedMap.get(id);
            if (p && p.marchTurns < 99) max = Math.max(max, p.marchTurns);
        }
        return max;
    }, [activeAxis, proposedMap]);

    return (
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto">
            <div className="bg-[rgba(20,18,15,0.94)] backdrop-blur-xl
                            border-t border-[rgba(180,160,130,0.15)] p-3">
                {/* Parameters strip */}
                <div className="mb-3 overflow-x-auto">
                    <PlanParameters plan={plan} onUpdate={onUpdate} />
                </div>

                {/* Assembly time badge */}
                {activeAxis && activeAxis.brigadeIds.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-secondary">
                            Full assembly:
                        </span>
                        <span className={`text-[10px] font-bold ${
                            maxMarch <= 1 ? 'text-green-400' : maxMarch <= 3 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                            {maxMarch} turn{maxMarch !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[8px] text-text-secondary">
                            ({activeAxis.brigadeIds.length} brigade{activeAxis.brigadeIds.length !== 1 ? 's' : ''} assigned)
                        </span>
                    </div>
                )}

                {/* Scrollable brigade cards */}
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                    {sortedBrigades.map((brigade) => {
                        const proposed = proposedMap.get(brigade.id);
                        return (
                            <BrigadeCard
                                key={brigade.id}
                                brigade={brigade}
                                isAssigned={assignedIds.has(brigade.id)}
                                isAutoProposed={proposed?.isAutoProposed ?? false}
                                marchTurns={proposed?.marchTurns ?? null}
                                factionColor={factionColor}
                                onToggle={toggleBrigade}
                            />
                        );
                    })}
                    {sortedBrigades.length === 0 && (
                        <div className="text-[10px] text-text-secondary/50 italic py-8 text-center w-full">
                            No brigades available for this corps
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
