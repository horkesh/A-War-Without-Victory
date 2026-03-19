/**
 * Phase 2 — Plan orchestrator.
 * Renders ObjectiveList (top-right), BrigadeTray (bottom), and manages auto-propose.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { OpsPlanState } from './types';
import { ObjectiveList } from './ObjectiveList';
import { BrigadeTray } from './BrigadeTray';
import { autoProposeBrigades, estimateMarchTurns } from './autoPropose';
import type { ProposedBrigade } from './autoPropose';

interface PlanPhaseProps {
    plan: OpsPlanState;
    onUpdate: (partial: Partial<OpsPlanState>) => void;
    corpsId: string;
    onAdvance: () => void;
    centroidLookup: Map<string, [number, number]>;
}

import { FACTION_HEX_COLORS } from '../plan_ui/opsConstants';

export function PlanPhase({ plan, onUpdate, corpsId, onAdvance, centroidLookup }: PlanPhaseProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const [autoProposed, setAutoProposed] = useState<ProposedBrigade[]>([]);
    const hasAutoProposedRef = useRef(false);

    const faction = useMemo(() => {
        return loadedGameState?.formations.find((f) => f.id === corpsId)?.faction ?? '';
    }, [loadedGameState, corpsId]);

    const factionColor = FACTION_HEX_COLORS[faction] ?? '#888';

    const corpsBrigades = useMemo(() => {
        if (!loadedGameState) return [];
        return loadedGameState.formations.filter(
            (f) => f.corps_id === corpsId && f.kind === 'brigade'
        );
    }, [loadedGameState, corpsId]);

    // Auto-propose brigades when first objective is added
    const activeAxis = plan.axes.find((a) => a.id === plan.activeAxisId) ?? plan.axes[0];
    const objectives = activeAxis?.objectives ?? [];

    // Use refs for plan data inside effects to avoid unstable deps
    const planRef = useRef(plan);
    planRef.current = plan;
    const activeAxisRef = useRef(activeAxis);
    activeAxisRef.current = activeAxis;

    useEffect(() => {
        if (objectives.length > 0 && !hasAutoProposedRef.current && corpsBrigades.length > 0) {
            hasAutoProposedRef.current = true;
            const currentPlan = planRef.current;
            const currentAxis = activeAxisRef.current;
            const staging = currentAxis?.stagingOsid ?? currentPlan.defaultStagingOsid;
            const proposed = autoProposeBrigades(corpsBrigades, objectives, centroidLookup, 12, staging);
            setAutoProposed(proposed);

            // Auto-assign proposed brigades to active axis
            if (currentAxis && currentAxis.brigadeIds.length === 0) {
                onUpdate({
                    axes: currentPlan.axes.map((a) =>
                        a.id === currentAxis.id
                            ? { ...a, brigadeIds: proposed.map((p) => p.brigadeId) }
                            : a
                    ),
                });
            }
        }
    }, [objectives.length, corpsBrigades, centroidLookup, onUpdate]);

    // Recompute march times when staging changes
    const stagingOsid = activeAxis?.stagingOsid ?? plan.defaultStagingOsid;
    useEffect(() => {
        if (!stagingOsid || corpsBrigades.length === 0) return;

        setAutoProposed((prev) => prev.map((p) => {
            const brigade = corpsBrigades.find((b) => b.id === p.brigadeId);
            if (!brigade?.location_osid) return p;
            const mt = estimateMarchTurns(brigade.location_osid, stagingOsid, centroidLookup);
            return { ...p, marchTurns: mt };
        }));
    }, [stagingOsid, corpsBrigades, centroidLookup]);

    const allObjectives = plan.axes.flatMap((a) => a.objectives);

    return (
        <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Objective list — top right */}
            <ObjectiveList plan={plan} onUpdate={onUpdate} osidDisplayNames={null} onAdvance={onAdvance} />

            {/* Brigade tray — bottom */}
            <BrigadeTray
                plan={plan}
                onUpdate={onUpdate}
                corpsBrigades={corpsBrigades}
                autoProposed={autoProposed}
                factionColor={factionColor}
            />

            {/* Advance button — fixed right side, vertically centered */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
                <button
                    type="button"
                    onClick={onAdvance}
                    disabled={allObjectives.length === 0}
                    className="px-5 py-3 rounded-lg font-bold text-sm uppercase tracking-wider
                               transition-all border disabled:opacity-20 disabled:cursor-not-allowed
                               bg-accent-gold/15 text-accent-gold border-accent-gold/25
                               hover:bg-accent-gold/25 hover:shadow-[0_0_20px_rgba(196,163,90,0.2)]
                               shadow-lg backdrop-blur-sm"
                >
                    G2 Assessment →
                </button>
            </div>
        </div>
    );
}
