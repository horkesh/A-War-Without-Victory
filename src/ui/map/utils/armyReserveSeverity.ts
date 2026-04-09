export type ArmyReserveSeverityBand = 'critical' | 'routine';

interface ArmyReserveCauseSource {
    reason?: string;
    purpose?: 'offensive' | 'defensive';
    why_needed?: string;
    description?: string;
}

interface ArmyReserveProvenanceSource {
    provenance_driver?: 'active_operation' | 'sector_threat' | 'captured_objectives' | 'commander_request';
    commander_request_priority?: 'critical' | 'high' | 'medium' | 'low';
    commander_request_brigades_needed?: number;
    commander_focus_zone_id?: string;
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

function getArmyReserveProvenanceSummary(source: ArmyReserveProvenanceSource): string {
    switch (source.provenance_driver) {
        case 'commander_request':
            return 'This request was produced by an explicit corps commander reinforcement escalation.';
        case 'active_operation':
            return 'This request was produced by an active operation that is asking Army HQ for reserve support.';
        case 'captured_objectives':
            return 'This request was produced by recent gains that opened an exploitation opportunity.';
        case 'sector_threat':
            return 'This request was produced by Army HQ threat assessment on a thin sector-front line.';
        default:
            return 'This request was produced by current army reserve pressure.';
    }
}

function getArmyReserveProvenanceDetail(source: ArmyReserveProvenanceSource): string {
    if (source.provenance_driver === 'commander_request') {
        const priorityLabel = source.commander_request_priority ?? 'unspecified';
        const brigadesLabel = typeof source.commander_request_brigades_needed === 'number'
            ? `${source.commander_request_brigades_needed} brigade${source.commander_request_brigades_needed === 1 ? '' : 's'}`
            : 'reinforcement';
        const zoneLabel = source.commander_focus_zone_id ?? 'the lead sector';
        return `Commander signal: ${priorityLabel} priority for ${brigadesLabel} in ${zoneLabel}.`;
    }

    return 'Derived from the current reserve-generation pressure owned by Army HQ and corps command state.';
}

export function classifyArmyReserveSeverity(priority: number): ArmyReserveSeverityBand {
    return priority >= 75 ? 'critical' : 'routine';
}

export function getArmyReserveToolbarSignal({
    pendingCount,
    criticalCount,
    leadCriticalReason,
    leadCriticalProvenanceDriver,
    leadCriticalCommanderPriority,
    leadCriticalCommanderBrigadesNeeded,
    leadCriticalFocusZoneId,
    leadCriticalPurpose,
    leadCriticalWhyNeeded,
    leadCriticalDescription,
}: {
    pendingCount: number;
    criticalCount: number;
    leadCriticalReason?: string;
    leadCriticalProvenanceDriver?: 'active_operation' | 'sector_threat' | 'captured_objectives' | 'commander_request';
    leadCriticalCommanderPriority?: 'critical' | 'high' | 'medium' | 'low';
    leadCriticalCommanderBrigadesNeeded?: number;
    leadCriticalFocusZoneId?: string;
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
        const leadDriver = getArmyReserveProvenanceSummary({
            provenance_driver: leadCriticalProvenanceDriver,
            commander_request_priority: leadCriticalCommanderPriority,
            commander_request_brigades_needed: leadCriticalCommanderBrigadesNeeded,
            commander_focus_zone_id: leadCriticalFocusZoneId,
        });
        return {
            label: `${criticalCount} ${criticalCount === 1 ? 'CRITICAL RESERVE REQUEST' : 'CRITICAL RESERVE REQUESTS'}`,
            title: `${criticalCount} critical reserve request${criticalCount === 1 ? '' : 's'} need${criticalCount === 1 ? 's' : ''} immediate army attention. Lead cause: ${leadCause} Lead driver: ${leadDriver} ${pendingCount} reserve request${pendingCount === 1 ? ' is' : 's are'} pending in total.`,
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
    leadCriticalProvenanceDriver,
    leadCriticalCommanderPriority,
    leadCriticalCommanderBrigadesNeeded,
    leadCriticalFocusZoneId,
    leadCriticalPurpose,
    leadCriticalWhyNeeded,
    leadCriticalDescription,
}: {
    pendingCount: number;
    criticalCount: number;
    leadCriticalReason?: string;
    leadCriticalProvenanceDriver?: 'active_operation' | 'sector_threat' | 'captured_objectives' | 'commander_request';
    leadCriticalCommanderPriority?: 'critical' | 'high' | 'medium' | 'low';
    leadCriticalCommanderBrigadesNeeded?: number;
    leadCriticalFocusZoneId?: string;
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
        const leadDriver = getArmyReserveProvenanceSummary({
            provenance_driver: leadCriticalProvenanceDriver,
            commander_request_priority: leadCriticalCommanderPriority,
            commander_request_brigades_needed: leadCriticalCommanderBrigadesNeeded,
            commander_focus_zone_id: leadCriticalFocusZoneId,
        });
        return {
            heading: `${criticalCount} critical reserve request${criticalCount === 1 ? '' : 's'} need${criticalCount === 1 ? 's' : ''} immediate army attention.`,
            detail: `Lead cause: ${leadCause} Lead driver: ${leadDriver} Reserve requests are army-level reserve management, not presidential review. Routine requests remain in the Army Reserve desk.`,
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

export function getArmyReserveRequestProvenanceCopy({
    provenance_driver,
    commander_request_priority,
    commander_request_brigades_needed,
    commander_focus_zone_id,
}: ArmyReserveProvenanceSource): {
    label: string;
    summary: string;
    detail: string;
} {
    return {
        label: 'What Produced This Request',
        summary: getArmyReserveProvenanceSummary({
            provenance_driver,
            commander_request_priority,
            commander_request_brigades_needed,
            commander_focus_zone_id,
        }),
        detail: getArmyReserveProvenanceDetail({
            provenance_driver,
            commander_request_priority,
            commander_request_brigades_needed,
            commander_focus_zone_id,
        }),
    };
}
