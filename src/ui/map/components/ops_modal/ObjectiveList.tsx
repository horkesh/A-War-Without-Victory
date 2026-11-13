/**
 * Objective list - a section of the Plan phase in the planning surface's detail column.
 * Shows objectives per axis with reorder, remove, schwerpunkt toggle.
 */
import type { OpsPlanState } from './types';
import { getOsidDisplayName } from '../../utils/osidDisplayName';
import { t } from '../../i18n';
import { SurfaceFigure, SurfaceSection, SURFACE_LABEL_MUTED, SURFACE_PRIMARY_BUTTON_COMPACT } from '../surface/Surface';
import { opsOptionClass } from './opsSurface';

interface ObjectiveListProps {
    plan: OpsPlanState;
    onUpdate: (partial: Partial<OpsPlanState>) => void;
    osidDisplayNames: Record<string, string> | null;
    onAdvance?: () => void;
    availableObjectiveCount?: number;
    canAdvanceToG2?: boolean;
}

export function ObjectiveList({
    plan,
    onUpdate,
    osidDisplayNames,
    onAdvance,
    availableObjectiveCount = 0,
    canAdvanceToG2 = false,
}: ObjectiveListProps) {
    const activeAxis = plan.axes.find((a) => a.id === plan.activeAxisId) ?? plan.axes[0];
    if (!activeAxis) return null;

    const objectives = activeAxis.objectives;

    const removeObjective = (osid: string) => {
        onUpdate({
            schwerpunktOsid: plan.schwerpunktOsid === osid ? '' : plan.schwerpunktOsid,
            axes: plan.axes.map((a) =>
                a.id === activeAxis.id
                    ? { ...a, objectives: a.objectives.filter((o) => o !== osid) }
                    : a
            ),
        });
    };

    const toggleSchwerpunkt = (osid: string) => {
        onUpdate({ schwerpunktOsid: plan.schwerpunktOsid === osid ? '' : osid });
    };

    const moveObjective = (idx: number, direction: -1 | 1) => {
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= objectives.length) return;
        const reordered = [...objectives];
        [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
        onUpdate({
            axes: plan.axes.map((a) =>
                a.id === activeAxis.id ? { ...a, objectives: reordered } : a
            ),
        });
    };

    const selectedAxisObjectiveCount = activeAxis.objectives.length;
    const selectedAxisBrigadeCount = activeAxis.brigadeIds.length;
    const selectedStaging = activeAxis.stagingOsid ?? plan.defaultStagingOsid;

    const iconButton = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#3a4150] bg-[#1b2029] text-[16px] text-[#e2d6b8] transition hover:border-accent-gold/60 disabled:cursor-default disabled:opacity-35';

    return (
        <SurfaceSection
            label={t('opsPlanning.phase.objectives')}
            action={<span className={SURFACE_LABEL_MUTED}>{t('opsPlanning.phase.planning')}</span>}
        >
            <div className="grid grid-cols-3 gap-3">
                <SurfaceFigure label={t('opsPlanning.phase.objectives')} value={selectedAxisObjectiveCount} />
                <SurfaceFigure label={t('opsPlanning.phase.brigades')} value={selectedAxisBrigadeCount} />
                <SurfaceFigure
                    label={t('opsPlanning.phase.available')}
                    value={availableObjectiveCount}
                    tone={availableObjectiveCount > 0 ? 'text-[#e0c27a]' : 'text-red-200'}
                />
            </div>

            {objectives.length === 0 ? (
                <p className="m-0 text-[16px] leading-relaxed text-[#c2b69c]">
                    {t('opsPlanning.phase.emptyObjectives')}
                </p>
            ) : (
                <ol className="m-0 flex list-none flex-col gap-2 p-0">
                    {objectives.map((osid, idx) => {
                        const isSchwerpunkt = plan.schwerpunktOsid === osid;
                        const displayName = getOsidDisplayName(osid, osidDisplayNames);
                        return (
                            <li
                                key={osid}
                                className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                                    isSchwerpunkt ? 'border-[#c9a75c] bg-[#232936]' : 'border-[#2a303c] bg-[#161a22]'
                                }`}
                            >
                                <span className="w-6 shrink-0 text-right font-mono text-[15px] font-semibold text-[#b9ad94]">
                                    {idx + 1}.
                                </span>

                                <span className="min-w-0 flex-1 truncate text-[17px] text-[#f1e6c8]" title={displayName}>
                                    {displayName}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => toggleSchwerpunkt(osid)}
                                    aria-pressed={isSchwerpunkt}
                                    aria-label={isSchwerpunkt ? t('opsPlanning.phase.mainEffort') : t('opsPlanning.phase.setMainEffort')}
                                    className={`${iconButton} ${isSchwerpunkt ? 'border-[#c9a75c] text-[#e0c27a]' : 'text-[#8a806c]'}`}
                                    title={isSchwerpunkt ? t('opsPlanning.phase.mainEffort') : t('opsPlanning.phase.setMainEffort')}
                                >
                                    ★
                                </button>

                                <button
                                    type="button"
                                    onClick={() => moveObjective(idx, -1)}
                                    disabled={idx === 0}
                                    aria-label={t('opsPlanning.surface.moveUp', { name: displayName })}
                                    title={t('opsPlanning.surface.moveUp', { name: displayName })}
                                    className={iconButton}
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    onClick={() => moveObjective(idx, 1)}
                                    disabled={idx === objectives.length - 1}
                                    aria-label={t('opsPlanning.surface.moveDown', { name: displayName })}
                                    title={t('opsPlanning.surface.moveDown', { name: displayName })}
                                    className={iconButton}
                                >
                                    ↓
                                </button>

                                <button
                                    type="button"
                                    onClick={() => removeObjective(osid)}
                                    aria-label={t('opsPlanning.surface.removeObjective', { name: displayName })}
                                    title={t('opsPlanning.surface.removeObjective', { name: displayName })}
                                    className={`${iconButton} hover:border-red-400/60 hover:text-red-200`}
                                >
                                    ×
                                </button>
                            </li>
                        );
                    })}
                </ol>
            )}

            <SurfaceFigure
                label={t('opsPlanning.phase.stagingArea')}
                value={selectedStaging ? getOsidDisplayName(selectedStaging, osidDisplayNames) : t('opsPlanning.phase.notSet')}
            />

            {plan.axes.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {plan.axes.map((axis) => (
                        <button
                            key={axis.id}
                            type="button"
                            onClick={() => onUpdate({ activeAxisId: axis.id })}
                            aria-pressed={axis.id === plan.activeAxisId}
                            className={`h-10 rounded-md border px-4 text-[15px] font-semibold transition ${opsOptionClass(axis.id === plan.activeAxisId)}`}
                        >
                            {axis.name}
                        </button>
                    ))}
                </div>
            )}

            {onAdvance && objectives.length > 0 && (
                <button
                    type="button"
                    onClick={onAdvance}
                    disabled={!canAdvanceToG2}
                    className={`${SURFACE_PRIMARY_BUTTON_COMPACT} w-full`}
                >
                    {t('opsPlanning.phase.requestG2')}
                </button>
            )}
        </SurfaceSection>
    );
}
