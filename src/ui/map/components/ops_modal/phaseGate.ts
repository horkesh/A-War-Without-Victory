import type { OpsPhase, OpsPlanState } from './types';

export function planHasObjectiveAndBrigade(plan: OpsPlanState): boolean {
    return plan.axes.some((axis) => axis.objectives.length > 0 && axis.brigadeIds.length > 0);
}

export function getOpsPhaseAdvanceMessage(
    current: OpsPhase,
    hasCommander: boolean,
    plan: OpsPlanState,
    g2AssessmentViewed: boolean,
): string | null {
    if (current === 'commander') return getOpsPhaseGateMessage('plan', hasCommander, plan, g2AssessmentViewed);
    if (current === 'plan') return getOpsPhaseGateMessage('g2_assessment', hasCommander, plan, g2AssessmentViewed);
    if (current === 'g2_assessment') return getOpsPhaseGateMessage('authorize', hasCommander, plan, g2AssessmentViewed);
    return null;
}

export function getOpsPhaseGateMessage(
    target: OpsPhase,
    hasCommander: boolean,
    plan: OpsPlanState,
    g2AssessmentViewed: boolean,
): string | null {
    if (target === 'commander') return null;
    if (target === 'plan' && !hasCommander) return 'Select a commander first.';
    if ((target === 'g2_assessment' || target === 'authorize') && !planHasObjectiveAndBrigade(plan)) {
        return 'Add at least 1 objective and 1 brigade to your axis.';
    }
    if (target === 'authorize' && !g2AssessmentViewed) return 'Review the G-2 assessment first.';
    return null;
}
