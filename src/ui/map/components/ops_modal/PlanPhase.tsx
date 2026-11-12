/**
 * Phase 2 — Plan orchestrator.
 * Renders plan status, ObjectiveList and BrigadeTray as sections of the planning
 * surface's detail column (G2 assessment in the fixed footer), and manages auto-propose.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { OpsPlanState } from './types';
import { ObjectiveList } from './ObjectiveList';
import { BrigadeTray } from './BrigadeTray';
import { autoProposeBrigades, estimateMarchTurns } from './autoPropose';
import type { ProposedBrigade } from './autoPropose';
import { getOsidDisplayName } from '../../utils/osidDisplayName';
import { t } from '../../i18n';
import { SurfaceDetailFooter, SurfaceFigure, SurfaceSection, SURFACE_PRIMARY_BUTTON } from '../surface/Surface';
import { OpsNotice, OpsPhaseBody } from './opsSurface';

interface PlanPhaseProps {
    plan: OpsPlanState;
    onUpdate: (partial: Partial<OpsPlanState>) => void;
    corpsId: string;
    onAdvance: () => void;
    centroidLookup: Map<string, [number, number]>;
    availableObjectiveOsids?: string[];
    canSuggestPlan?: boolean;
    canAdvanceToG2?: boolean;
}

import { FACTION_HEX_COLORS } from '../plan_ui/opsConstants';

export function PlanPhase({
    plan,
    onUpdate,
    corpsId,
    onAdvance,
    centroidLookup,
    availableObjectiveOsids = [],
    canSuggestPlan = true,
    canAdvanceToG2 = false,
}: PlanPhaseProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
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
    const selectedAxis = activeAxis;
    const selectedStaging = selectedAxis?.stagingOsid ?? plan.defaultStagingOsid;
    const selectedStagingLabel = selectedStaging
        ? getOsidDisplayName(selectedStaging, osidDisplayNames)
        : t('opsPlanning.phase.selectOnMap');
    const selectedAxisName = selectedAxis?.name ?? t('opsPlanning.phase.mainAxis');
    const selectedAxisObjectives = selectedAxis?.objectives.length ?? 0;
    const selectedAxisBrigades = selectedAxis?.brigadeIds.length ?? 0;
    const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);

    const suggestPlan = useCallback(() => {
        if (!selectedAxis) return;
        const objective = [...availableObjectiveOsids, ...selectedAxis.objectives].sort()[0];
        if (!objective) {
            setSuggestionMessage(t('opsPlanning.phase.noViableObjective'));
            return;
        }
        const objectiveNames = selectedAxis.objectives.includes(objective)
            ? selectedAxis.objectives
            : [objective, ...selectedAxis.objectives];
        const proposed = autoProposeBrigades(
            corpsBrigades,
            objectiveNames,
            centroidLookup,
            12,
            selectedStaging,
        );
        if (proposed.length === 0) {
            setSuggestionMessage(t('opsPlanning.phase.noViableBrigades'));
            return;
        }

        onUpdate({
            schwerpunktOsid: plan.schwerpunktOsid || objective,
                    axes: plan.axes.map((axis) =>
                axis.id === selectedAxis.id
                    ? {
                        ...axis,
                        objectives: objectiveNames,
                        brigadeIds: proposed.map((p) => p.brigadeId),
                    }
                    : axis
            ),
        });
        setAutoProposed(proposed);
        const label = getOsidDisplayName(objective, osidDisplayNames);
        setSuggestionMessage(t(
            proposed.length === 1 ? 'opsPlanning.phase.suggested.one' : 'opsPlanning.phase.suggested.many',
            { label, count: proposed.length },
        ));
    }, [
        availableObjectiveOsids,
        centroidLookup,
        corpsBrigades,
        onUpdate,
        osidDisplayNames,
        plan.axes,
        plan.schwerpunktOsid,
        selectedAxis,
        selectedStaging,
    ]);

    return (
        <div
            className="flex min-h-0 flex-1 flex-col"
            data-testid="ops-planning-phase-panel"
            data-phase="plan"
        >
            <OpsPhaseBody>
                {/* Plan status: active axis and staging; Suggest plan fills both. */}
                <SurfaceSection
                    label={t('opsPlanning.phase.planStatus')}
                    action={(
                        <button
                            type="button"
                            onClick={suggestPlan}
                            disabled={!canSuggestPlan}
                            className="h-10 rounded-md border border-[#c9a75c]/60 bg-[#1b2029] px-4 text-[15px] font-semibold text-[#f1e6c8] transition hover:border-[#c9a75c] disabled:cursor-default disabled:opacity-45"
                            title={canSuggestPlan ? t('opsPlanning.phase.suggestTitle') : t('opsPlanning.phase.suggestNeedsCommander')}
                        >
                            {t('opsPlanning.phase.suggestPlan')}
                        </button>
                    )}
                >
                    {suggestionMessage && <OpsNotice role="status">{suggestionMessage}</OpsNotice>}
                    <div className="grid grid-cols-2 gap-3">
                        <SurfaceFigure label={t('opsPlanning.phase.axis')} value={selectedAxisName} />
                        <SurfaceFigure label={t('opsPlanning.phase.staging')} value={selectedStagingLabel} />
                    </div>
                    <p className="m-0 text-[15px] leading-relaxed text-[#b9ad94]">{t('opsPlanning.surface.planMapHint')}</p>
                </SurfaceSection>

                <ObjectiveList
                    plan={plan}
                    onUpdate={onUpdate}
                    osidDisplayNames={osidDisplayNames}
                    availableObjectiveCount={availableObjectiveOsids.length}
                    canAdvanceToG2={canAdvanceToG2}
                />

                <BrigadeTray
                    plan={plan}
                    onUpdate={onUpdate}
                    corpsBrigades={corpsBrigades}
                    autoProposed={autoProposed}
                    factionColor={factionColor}
                />
            </OpsPhaseBody>

            <SurfaceDetailFooter>
                <p className="m-0 text-[16px] text-[#c2b69c]">
                    {t('opsPlanning.surface.planFooter', { objectives: selectedAxisObjectives, brigades: selectedAxisBrigades })}
                </p>
                <button
                    type="button"
                    onClick={onAdvance}
                    disabled={!canAdvanceToG2}
                    className={SURFACE_PRIMARY_BUTTON}
                >
                    {t('opsPlanning.phase.g2Assessment')}
                </button>
            </SurfaceDetailFooter>
        </div>
    );
}
