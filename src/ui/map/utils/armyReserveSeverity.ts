export type ArmyReserveSeverityBand = 'critical' | 'routine';

export function classifyArmyReserveSeverity(priority: number): ArmyReserveSeverityBand {
    return priority >= 75 ? 'critical' : 'routine';
}

export function getArmyReserveToolbarSignal({
    pendingCount,
    criticalCount,
}: {
    pendingCount: number;
    criticalCount: number;
}): {
    label: string;
    title: string;
    tone: ArmyReserveSeverityBand;
} {
    if (criticalCount > 0) {
        return {
            label: `${criticalCount} ${criticalCount === 1 ? 'CRITICAL RESERVE REQUEST' : 'CRITICAL RESERVE REQUESTS'}`,
            title: `${criticalCount} critical reserve request${criticalCount === 1 ? '' : 's'} need${criticalCount === 1 ? 's' : ''} immediate army attention. ${pendingCount} reserve request${pendingCount === 1 ? ' is' : 's are'} pending in total.`,
            tone: 'critical',
        };
    }

    return {
        label: `${pendingCount} ${pendingCount === 1 ? 'RESERVE REQUEST' : 'RESERVE REQUESTS'}`,
        title: `${pendingCount} reserve request${pendingCount === 1 ? ' awaits' : 's await'} army reserve review.`,
        tone: 'routine',
    };
}

export function getArmyReserveAttentionSummary({
    pendingCount,
    criticalCount,
}: {
    pendingCount: number;
    criticalCount: number;
}): {
    heading: string;
    detail: string;
    tone: ArmyReserveSeverityBand;
} {
    if (criticalCount > 0) {
        return {
            heading: `${criticalCount} critical reserve request${criticalCount === 1 ? '' : 's'} need${criticalCount === 1 ? 's' : ''} immediate army attention.`,
            detail: 'Reserve requests are army-level reserve management, not presidential review. Routine requests remain in the Army Reserve desk.',
            tone: 'critical',
        };
    }

    return {
        heading: `${pendingCount} reserve request${pendingCount === 1 ? '' : 's'} await${pendingCount === 1 ? 's' : ''} army reserve review.`,
        detail: 'Reserve requests are army-level reserve management, not presidential review. Handle them in the Army Reserve desk.',
        tone: 'routine',
    };
}

export function getArmyReserveRequestSeverityCopy(priority: number): {
    label: string;
    detail: string;
    tone: ArmyReserveSeverityBand;
} {
    if (classifyArmyReserveSeverity(priority) === 'critical') {
        return {
            label: 'Immediate Army Need',
            detail: 'Handle this reserve request before routine reserve reviews if you can support it.',
            tone: 'critical',
        };
    }

    return {
        label: 'Reserve Review',
        detail: 'This request can stay in the reserve desk queue unless higher-pressure needs emerge.',
        tone: 'routine',
    };
}
