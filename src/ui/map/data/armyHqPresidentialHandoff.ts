type CommandStrainLabel = 'healthy' | 'strained' | 'compromised';
type ReadinessGrade = 'COMBAT READY' | 'ADEQUATE' | 'STRAINED' | 'DEGRADED' | 'INEFFECTIVE' | 'UNREPORTED';

export interface ArmyHqPresidentialHandoffInput {
    corpsFormations: ReadonlyArray<{
        id: string;
        commandStrainLabel?: CommandStrainLabel;
    }>;
    readiness: ReadonlyArray<{
        corpsId: string;
        grade: ReadinessGrade;
        hasThreat: boolean;
    }>;
    pendingReviewCount: number;
    pendingReserveCount: number;
}

export interface ArmyHqPresidentialHandoff {
    status: 'critical_hold' | 'filed_action' | 'routine';
    criticalCommandCount: number;
    filedActionCount: number;
    route: 'desk' | 'decision_room';
}

/**
 * Translate military warning state into a presidentially valid handoff.
 * Critical reporting alone does not create authority to issue direct unit
 * orders; without a filed request, the truthful action is to hold policy.
 */
export function buildArmyHqPresidentialHandoff(
    input: ArmyHqPresidentialHandoffInput,
): ArmyHqPresidentialHandoff {
    const criticalCorpsIds = new Set<string>();

    for (const corps of [...input.corpsFormations].sort((a, b) => a.id.localeCompare(b.id))) {
        if (corps.commandStrainLabel === 'compromised') criticalCorpsIds.add(corps.id);
    }
    for (const report of [...input.readiness].sort((a, b) => a.corpsId.localeCompare(b.corpsId))) {
        if (report.grade === 'INEFFECTIVE' || (report.grade === 'DEGRADED' && report.hasThreat)) {
            criticalCorpsIds.add(report.corpsId);
        }
    }

    const filedActionCount =
        Math.max(0, Math.trunc(input.pendingReviewCount))
        + Math.max(0, Math.trunc(input.pendingReserveCount));
    const criticalCommandCount = criticalCorpsIds.size;

    if (filedActionCount > 0) {
        return {
            status: 'filed_action',
            criticalCommandCount,
            filedActionCount,
            route: 'decision_room',
        };
    }
    if (criticalCommandCount > 0) {
        return {
            status: 'critical_hold',
            criticalCommandCount,
            filedActionCount,
            route: 'desk',
        };
    }
    return {
        status: 'routine',
        criticalCommandCount,
        filedActionCount,
        route: 'decision_room',
    };
}
