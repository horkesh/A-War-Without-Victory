/**
 * Phase 2 — Plan orchestrator.
 * Renders ObjectiveList (top-right), BrigadeTray (bottom), and manages auto-propose.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
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

const FACTION_COLORS: Record<string, string> = {
    RS: '#c24040', RBiH: '#4a9a55', HRHB: '#4080b8',
};

export function PlanPhase({ plan, onUpdate, corpsId, onAdvance, centroidLookup }: PlanPhaseProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const [autoProposed, setAutoProposed] = useState<ProposedBrigade[]>([]);
    const hasAutoProposedRef = useRef(false);

    const faction = useMemo(() => {
        return loadedGameState?.formations.find((f) => f.id === corpsId)?.faction ?? '';
    }, [loadedGameState, corpsId]);

    const factionColor = FACTION_COLORS[faction] ?? '#888';

    const corpsBrigades = useMemo(() => {
        if (!loadedGameState) return [];
        return loadedGameState.formations.filter(
            (f) => f.corps_id === corpsId && f.kind === 'brigade'
        );
    }, [loadedGameState, corpsId]);

    // Auto-propose brigades when first objective is added
    const activeAxis = plan.axes.find((a) => a.id === plan.activeAxisId) ?? plan.axes[0];
    const objectives = activeAxis?.objectives ?? [];

    useEffect(() => {
        if (objectives.length > 0 && !hasAutoProposedRef.current && corpsBrigades.length > 0) {
            hasAutoProposedRef.current = true;
            const staging = activeAxis?.stagingOsid ?? plan.defaultStagingOsid;
            const proposed = autoProposeBrigades(corpsBrigades, objectives, centroidLookup, 12, staging);
            setAutoProposed(proposed);

            // Auto-assign proposed brigades to active axis
            if (activeAxis && activeAxis.brigadeIds.length === 0) {
                onUpdate({
                    axes: plan.axes.map((a) =>
                        a.id === activeAxis.id
                            ? { ...a, brigadeIds: proposed.map((p) => p.brigadeId) }
                            : a
                    ),
                });
            }
        }
    }, [objectives.length, corpsBrigades, centroidLookup, activeAxis, plan, onUpdate]);

    // Recompute march times when staging changes
    useEffect(() => {
        const staging = activeAxis?.stagingOsid ?? plan.defaultStagingOsid;
        if (!staging || corpsBrigades.length === 0) return;

        setAutoProposed((prev) => prev.map((p) => {
            const brigade = corpsBrigades.find((b) => b.id === p.brigadeId);
            if (!brigade?.location_osid) return p;
            const marchTurns = estimateMarchTurns(brigade.location_osid, staging, centroidLookup);
            return { ...p, marchTurns };
        }));
    }, [activeAxis?.stagingOsid, plan.defaultStagingOsid, corpsBrigades, centroidLookup]);

    const allObjectives = plan.axes.flatMap((a) => a.objectives);

    return (
        <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Objective list — top right */}
            <ObjectiveList plan={plan} onUpdate={onUpdate} osidDisplayNames={null} />

            {/* Brigade tray — bottom */}
            <BrigadeTray
                plan={plan}
                onUpdate={onUpdate}
                corpsId={corpsId}
                autoProposed={autoProposed}
                factionColor={factionColor}
            />

            {/* Continue button — above the tray */}
            <div className="absolute bottom-[220px] right-4 pointer-events-auto">
                <button
                    type="button"
                    onClick={onAdvance}
                    disabled={allObjectives.length === 0}
                    className="px-4 py-2 rounded-lg bg-accent-gold/20 text-accent-gold font-bold text-xs uppercase
                               tracking-wider hover:bg-accent-gold/30 disabled:opacity-30 disabled:cursor-not-allowed
                               transition-colors border border-accent-gold/20"
                >
                    Continue to G2 →
                </button>
            </div>
        </div>
    );
}
