export type ArmyReserveSeverityBand = 'critical' | 'routine';

interface ArmyReserveCauseSource {
    reason?: string;
    purpose?: 'offensive' | 'defensive';
    why_needed?: string;
    description?: string;
}

function getArmyReserveCauseSummary(source: ArmyReserveCauseSource): string {
    switch (source.reason) {
        case 'offensive_support':
            return 'An active offensive needs elite reinforcement to sustain its main effort.';
        case 'defensive_gap':
            return 'A corps is reporting a thin defensive sector that needs immediate reinforcement.';
        case 'exploitation':
            return 'A local breakthrough needs rapid reinforcement before the enemy can close it.';
        case 'enclave_relief':
            return 'An enclave relief effort needs reinforcement to keep or open a corridor.';
        default:
            return source.purpose === 'offensive'
                ? 'An active operation is asking for reserve support before momentum is lost.'
                : 'A corps is reporting urgent reserve pressure on the line.';
    }
}

function getArmyReserveCauseDetail(source: ArmyReserveCauseSource): string {
    return source.why_needed ?? source.description ?? 'Current reserve pressure has exceeded routine army reserve handling.';
}

export function classifyArmyReserveSeverity(priority: number): ArmyReserveSeverityBand {
    return priority >= 75 ? 'critical' : 'routine';
}

export function getArmyReserveToolbarSignal({
    pendingCount,
    criticalCount,
    leadCriticalReason,
    leadCriticalPurpose,
    leadCriticalWhyNeeded,
    leadCriticalDescription,
}: {
    pendingCount: number;
    criticalCount: number;
    leadCriticalReason?: string;
    leadCriticalPurpose?: 'offensive' | 'defensive';
    leadCriticalWhyNeeded?: string;
    leadCriticalDescription?: string;
}): {
    label: string;
    title: string;
    tone: ArmyReserveSeverityBand;
} {
    if (criticalCount > 0) {
        const leadCause = getArmyReserveCauseSummary({
            reason: leadCriticalReason,
            purpose: leadCriticalPurpose,
            why_needed: leadCriticalWhyNeeded,
            description: leadCriticalDescription,
        });
        return {
            label: `${criticalCount} ${criticalCount === 1 ? 'CRITICAL RESERVE REQUEST' : 'CRITICAL RESERVE REQUESTS'}`,
            title: `${criticalCount} critical reserve request${criticalCount === 1 ? '' : 's'} need${criticalCount === 1 ? 's' : ''} immediate army attention. Lead cause: ${leadCause} ${pendingCount} reserve request${pendingCount === 1 ? ' is' : 's are'} pending in total.`,
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
    leadCriticalReason,
    leadCriticalPurpose,
    leadCriticalWhyNeeded,
    leadCriticalDescription,
}: {
    pendingCount: number;
    criticalCount: number;
    leadCriticalReason?: string;
    leadCriticalPurpose?: 'offensive' | 'defensive';
    leadCriticalWhyNeeded?: string;
    leadCriticalDescription?: string;
}): {
    heading: string;
    detail: string;
    tone: ArmyReserveSeverityBand;
} {
    if (criticalCount > 0) {
        const leadCause = getArmyReserveCauseSummary({
            reason: leadCriticalReason,
            purpose: leadCriticalPurpose,
            why_needed: leadCriticalWhyNeeded,
            description: leadCriticalDescription,
        });
        return {
            heading: `${criticalCount} critical reserve request${criticalCount === 1 ? '' : 's'} need${criticalCount === 1 ? 's' : ''} immediate army attention.`,
            detail: `Lead cause: ${leadCause} Reserve requests are army-level reserve management, not presidential review. Routine requests remain in the Army Reserve desk.`,
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

export function getArmyReserveRequestCauseCopy({
    priority,
    reason,
    purpose,
    why_needed,
    description,
}: {
    priority: number;
    reason?: string;
    purpose?: 'offensive' | 'defensive';
    why_needed?: string;
    description?: string;
}): {
    label: string;
    summary: string;
    detail: string;
    tone: ArmyReserveSeverityBand;
} {
    const tone = classifyArmyReserveSeverity(priority);
    return {
        label: tone === 'critical' ? 'Why This Is Critical' : 'Why This Needs Review',
        summary: getArmyReserveCauseSummary({ reason, purpose, why_needed, description }),
        detail: getArmyReserveCauseDetail({ reason, purpose, why_needed, description }),
        tone,
    };
}
