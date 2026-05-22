import type { AxisState, OpsPlanState } from './types';

export function hasOpsPlanningDraftAssignments(plan: OpsPlanState): boolean {
    return plan.axes.some((axis) => axis.objectives.length > 0 || axis.brigadeIds.length > 0);
}

export function getNextAxisId(axes: readonly AxisState[]): string {
    const highest = axes.reduce((max, axis) => {
        const match = /^axis_(\d+)$/.exec(axis.id);
        if (!match) return max;
        return Math.max(max, Number(match[1]));
    }, 0);
    return `axis_${highest + 1}`;
}
