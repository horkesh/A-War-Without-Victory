/**
 * Brigade tray: the Plan phase's Parameters and Brigades sections (a card grid) in the
 * planning surface's detail column.
 */
import { useCallback, useMemo } from 'react';
import type { FormationView } from '../../data/types';
import type { OpsPlanState } from './types';
import { BrigadeCard } from './BrigadeCard';
import { PlanParameters } from './PlanParameters';
import type { ProposedBrigade } from './autoPropose';
import { t, useLocale } from '../../i18n';
import { SurfaceSection } from '../surface/Surface';
import { OPS_TONE_TEXT } from './opsSurface';

interface BrigadeTrayProps {
    plan: OpsPlanState;
    onUpdate: (partial: Partial<OpsPlanState>) => void;
    corpsBrigades: FormationView[];
    autoProposed: ProposedBrigade[];
    factionColor: string;
}

export function BrigadeTray({ plan, onUpdate, corpsBrigades, autoProposed, factionColor }: BrigadeTrayProps) {
    const [locale] = useLocale();
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
    const assignedCount = activeAxis?.brigadeIds.length ?? 0;

    return (
        <>
            {/* Operation parameters */}
            <SurfaceSection label={t('opsPlanning.surface.parametersSection', undefined, locale)}>
                <PlanParameters plan={plan} onUpdate={onUpdate} />
            </SurfaceSection>

            {/* Brigades: assigned first, then suggested, then by strength */}
            <SurfaceSection label={t('opsPlanning.phase.brigades', undefined, locale)}>
                {activeAxis && activeAxis.brigadeIds.length > 0 && (
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[16px]">
                        <span className="text-[#b9ad94]">{t('opsModal.fullAssembly', undefined, locale)}</span>
                        <span className={`font-semibold ${
                            maxMarch <= 1 ? OPS_TONE_TEXT.good : maxMarch <= 3 ? OPS_TONE_TEXT.warn : OPS_TONE_TEXT.danger
                        }`}>
                            {t(maxMarch === 1 ? 'opsModal.march.turn.one' : 'opsModal.march.turn.many', { count: maxMarch }, locale)}
                        </span>
                        <span className="text-[#c2b69c]">
                            {t(assignedCount === 1 ? 'opsModal.assignedSummary.one' : 'opsModal.assignedSummary.many', { count: assignedCount }, locale)}
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))] gap-3">
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
                </div>
                {sortedBrigades.length === 0 && (
                    <p className="m-0 text-[16px] text-[#c2b69c]">
                        {t('opsModal.noBrigadesForCorps', undefined, locale)}
                    </p>
                )}
            </SurfaceSection>
        </>
    );
}
