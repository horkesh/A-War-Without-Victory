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
    onAdvance?: () => void;
}

export function ObjectiveList({ plan, onUpdate, osidDisplayNames, onAdvance }: ObjectiveListProps) {
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

    return (
        <div className="absolute top-16 right-4 bottom-24 z-20 w-[360px] pointer-events-auto
                        bg-[rgba(20,18,15,0.92)] backdrop-blur-xl rounded-lg
                        border border-[rgba(180,160,130,0.15)] p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent-gold">
                    Objectives
                </div>
                <div className="text-[8px] uppercase tracking-[0.16em] text-text-secondary/70">
                    Planning
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded border border-[rgba(180,160,130,0.16)] bg-[rgba(180,160,130,0.06)] px-2 py-1.5">
                    <div className="text-[7px] uppercase tracking-[0.18em] text-text-secondary/70">Axis</div>
                    <div className="text-[10px] font-bold text-white truncate">{activeAxis.name}</div>
                </div>
                <div className="rounded border border-[rgba(180,160,130,0.16)] bg-[rgba(180,160,130,0.06)] px-2 py-1.5">
                    <div className="text-[7px] uppercase tracking-[0.18em] text-text-secondary/70">Objectives</div>
                    <div className="text-[10px] font-bold text-white">{selectedAxisObjectiveCount}</div>
                </div>
                <div className="rounded border border-[rgba(180,160,130,0.16)] bg-[rgba(180,160,130,0.06)] px-2 py-1.5">
                    <div className="text-[7px] uppercase tracking-[0.18em] text-text-secondary/70">Brigades</div>
                    <div className="text-[10px] font-bold text-white">{selectedAxisBrigadeCount}</div>
                </div>
            </div>

            {objectives.length === 0 ? (
                <div className="text-[10px] text-text-secondary/50 italic py-4 text-center">
                    Click enemy territory on the map to add objectives
                </div>
            ) : (
                <div className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-1">
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
                                <span className="text-[10px] text-white flex-1 truncate" title={displayName}>
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
                                {/* WP4e: Always-visible reorder/remove controls */}
                                <button
                                    type="button"
                                    onClick={() => moveObjective(idx, -1)}
                                    disabled={idx === 0}
                                    className="text-[9px] text-text-secondary/40 hover:text-white disabled:opacity-20 transition-colors"
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    onClick={() => moveObjective(idx, 1)}
                                    disabled={idx === objectives.length - 1}
                                    className="text-[9px] text-text-secondary/40 hover:text-white disabled:opacity-20 transition-colors"
                                >
                                    ↓
                                </button>

                                {/* Remove */}
                                <button
                                    type="button"
                                    onClick={() => removeObjective(osid)}
                                    className="text-[9px] text-text-secondary/40 hover:text-red-400 transition-colors"
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-2 rounded border border-[rgba(180,160,130,0.12)] bg-[rgba(180,160,130,0.05)] px-2 py-1.5">
                <div className="text-[7px] uppercase tracking-[0.18em] text-text-secondary/70">Staging OSID</div>
                <div className="text-[10px] text-white truncate">
                    {selectedStaging ? getOsidDisplayName(selectedStaging, osidDisplayNames) : 'Not set'}
                </div>
            </div>

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

            {/* Advance button — visible when objectives exist */}
            {onAdvance && objectives.length > 0 && (
                <button
                    type="button"
                    onClick={onAdvance}
                    className="mt-3 w-full py-2 rounded-md text-[10px] font-bold uppercase tracking-wider
                               bg-accent-gold/15 text-accent-gold border border-accent-gold/25
                               hover:bg-accent-gold/25 transition-all"
                >
                    Request G2 Assessment →
                </button>
            )}
        </div>
    );
}
