/**
 * Objective list panel — top-right floating panel in Phase 2.
 * Shows objectives per axis with reorder, remove, schwerpunkt toggle.
 */
import type { AxisState, OpsPlanState } from './types';
import { getOsidDisplayName } from '../../utils/osidDisplayName';

interface ObjectiveListProps {
    plan: OpsPlanState;
    onUpdate: (partial: Partial<OpsPlanState>) => void;
    osidDisplayNames: Record<string, string> | null;
}

export function ObjectiveList({ plan, onUpdate, osidDisplayNames }: ObjectiveListProps) {
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

    return (
        <div className="absolute top-16 right-4 z-20 w-[280px] pointer-events-auto
                        bg-[rgba(20,18,15,0.92)] backdrop-blur-xl rounded-lg
                        border border-[rgba(180,160,130,0.15)] p-3">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent-gold mb-2">
                Objectives
            </div>

            {objectives.length === 0 ? (
                <div className="text-[10px] text-text-secondary/50 italic py-4 text-center">
                    Click enemy territory on the map to add objectives
                </div>
            ) : (
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                    {objectives.map((osid, idx) => {
                        const isSchwerpunkt = plan.schwerpunktOsid === osid;
                        const displayName = getOsidDisplayName(osid, osidDisplayNames);
                        return (
                            <div key={osid} className="flex items-center gap-1.5 group">
                                {/* Number */}
                                <span className="text-[10px] font-bold text-text-secondary w-4 text-right">
                                    {idx + 1}.
                                </span>

                                {/* Name */}
                                <span className="text-[10px] text-white flex-1 truncate" title={osid}>
                                    {displayName}
                                </span>

                                {/* Schwerpunkt star */}
                                <button
                                    type="button"
                                    onClick={() => toggleSchwerpunkt(osid)}
                                    className={`text-[12px] transition-colors ${
                                        isSchwerpunkt ? 'text-accent-gold' : 'text-text-secondary/20 hover:text-accent-gold/60'
                                    }`}
                                    title={isSchwerpunkt ? 'Main effort' : 'Set as main effort'}
                                >
                                    ★
                                </button>

                                {/* Reorder */}
                                <button
                                    type="button"
                                    onClick={() => moveObjective(idx, -1)}
                                    disabled={idx === 0}
                                    className="text-[9px] text-text-secondary/30 hover:text-white disabled:opacity-0 transition-opacity opacity-0 group-hover:opacity-100"
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    onClick={() => moveObjective(idx, 1)}
                                    disabled={idx === objectives.length - 1}
                                    className="text-[9px] text-text-secondary/30 hover:text-white disabled:opacity-0 transition-opacity opacity-0 group-hover:opacity-100"
                                >
                                    ↓
                                </button>

                                {/* Remove */}
                                <button
                                    type="button"
                                    onClick={() => removeObjective(osid)}
                                    className="text-[9px] text-text-secondary/20 hover:text-red-400 transition-opacity opacity-0 group-hover:opacity-100"
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Axis tabs (if multiple axes) */}
            {plan.axes.length > 1 && (
                <div className="flex gap-1 mt-2 pt-2 border-t border-[rgba(180,160,130,0.08)]">
                    {plan.axes.map((axis) => (
                        <button
                            key={axis.id}
                            type="button"
                            onClick={() => onUpdate({ activeAxisId: axis.id })}
                            className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-colors
                                ${axis.id === plan.activeAxisId
                                    ? 'bg-accent-gold/20 text-accent-gold'
                                    : 'text-text-secondary/50 hover:text-text-secondary'
                                }`}
                        >
                            {axis.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
