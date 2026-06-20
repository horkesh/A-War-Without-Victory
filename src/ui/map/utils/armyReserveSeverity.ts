export type ArmyReserveSeverityBand = 'critical' | 'routine';

import { formatPlayerFacingZoneLabel } from '../../../utils/player_facing_zone_label.js';
import { t, type MessageKey } from '../i18n';
import { getPlayerSafeOperationName } from './playerSafeText.js';

interface ArmyReserveCauseSource {
    reason?: string;
    purpose?: string;
    why_needed?: string;
    description?: string;
}

interface ArmyReserveProvenanceSource {
    provenance_driver?: 'active_operation' | 'sector_threat' | 'captured_objectives' | 'commander_request';
    commander_request_priority?: 'critical' | 'high' | 'medium' | 'low';
    commander_request_brigades_needed?: number;
    commander_focus_zone_id?: string;
    sector_threat_ratio?: number;
    sector_assigned_brigade_count?: number;
    operation_name?: string;
    operation_phase?: string;
    operation_preparation_sub_phase?: string;
    operation_momentum?: number;
    operation_objective_capture_count?: number;
}

const CAUSE_SUMMARY_KEYS: Record<string, MessageKey> = {
    offensive_support: 'armyReserve.cause.offensiveSupport',
    defensive_gap: 'armyReserve.cause.defensiveGap',
    exploitation: 'armyReserve.cause.exploitation',
    enclave_relief: 'armyReserve.cause.enclaveRelief',
};

const PROVENANCE_SUMMARY_KEYS: Record<string, MessageKey> = {
    commander_request: 'armyReserve.provenance.commanderRequest',
    active_operation: 'armyReserve.provenance.activeOperation',
    captured_objectives: 'armyReserve.provenance.capturedObjectives',
    sector_threat: 'armyReserve.provenance.sectorThreat',
};

const COMMANDER_PRIORITY_KEYS: Record<string, MessageKey> = {
    critical: 'armyReserve.commanderPriority.critical',
    high: 'armyReserve.commanderPriority.high',
    medium: 'armyReserve.commanderPriority.medium',
    low: 'armyReserve.commanderPriority.low',
};

function getArmyReserveCauseSummary(source: ArmyReserveCauseSource): string {
    const reasonKey = source.reason ? CAUSE_SUMMARY_KEYS[source.reason] : undefined;
    if (reasonKey) return t(reasonKey);
    return source.purpose === 'offensive'
        ? t('armyReserve.cause.offensiveFallback')
        : t('armyReserve.cause.defensiveFallback');
}

function getArmyReserveCauseDetail(_source: ArmyReserveCauseSource): string {
    return t('armyReserve.cause.detailFallback');
}

function getArmyReserveProvenanceSummary(source: ArmyReserveProvenanceSource): string {
    const key = source.provenance_driver ? PROVENANCE_SUMMARY_KEYS[source.provenance_driver] : undefined;
    return key ? t(key) : t('armyReserve.provenance.fallback');
}

function getArmyReserveProvenanceDetail(source: ArmyReserveProvenanceSource): string {
    if (source.provenance_driver === 'commander_request') {
        const priorityLabel = source.commander_request_priority
            ? t(COMMANDER_PRIORITY_KEYS[source.commander_request_priority] ?? 'armyReserve.commanderPriority.unspecified')
            : t('armyReserve.commanderPriority.unspecified');
        const brigadesLabel = typeof source.commander_request_brigades_needed === 'number'
            ? t(
                source.commander_request_brigades_needed === 1
                    ? 'armyReserve.provenance.oneBrigade'
                    : 'armyReserve.provenance.manyBrigades',
                { count: source.commander_request_brigades_needed },
            )
            : t('armyReserve.provenance.reinforcement');
        const zoneLabel = source.commander_focus_zone_id
            ? formatPlayerFacingZoneLabel(source.commander_focus_zone_id)
            : t('armyReserve.provenance.leadSector');
        return t('armyReserve.provenance.commanderSignal', {
            priority: priorityLabel,
            brigades: brigadesLabel,
            zone: zoneLabel,
        });
    }

    return t('armyReserve.provenance.derived');
}

function getArmyReserveEvidenceSummary(source: ArmyReserveProvenanceSource): string | null {
    const operationName = getPlayerSafeOperationName(source.operation_name, null, 'the operation');
    if (
        source.provenance_driver === 'active_operation'
        && typeof source.operation_name === 'string'
        && source.operation_phase === 'execution'
        && typeof source.operation_momentum === 'number'
        && Number.isFinite(source.operation_momentum)
    ) {
        return t('armyReserve.evidence.operationExecution', {
            operation: operationName,
            momentum: `${source.operation_momentum >= 0 ? '+' : ''}${source.operation_momentum.toFixed(1)}`,
        });
    }

    if (
        source.provenance_driver === 'active_operation'
        && typeof source.operation_name === 'string'
        && source.operation_phase === 'planning'
        && typeof source.operation_preparation_sub_phase === 'string'
    ) {
        return t('armyReserve.evidence.operationPlanning', {
            operation: operationName,
            phase: source.operation_preparation_sub_phase,
        });
    }

    if (
        source.provenance_driver === 'captured_objectives'
        && typeof source.operation_name === 'string'
        && source.operation_phase === 'execution'
        && typeof source.operation_objective_capture_count === 'number'
        && Number.isFinite(source.operation_objective_capture_count)
    ) {
        return t(
            source.operation_objective_capture_count === 1
                ? 'armyReserve.evidence.capturedObjectiveOne'
                : 'armyReserve.evidence.capturedObjectiveMany',
            { operation: operationName, count: source.operation_objective_capture_count },
        );
    }

    if (
        source.provenance_driver === 'sector_threat'
        && typeof source.sector_threat_ratio === 'number'
        && typeof source.sector_assigned_brigade_count === 'number'
    ) {
        return t(
            source.sector_assigned_brigade_count === 1
                ? 'armyReserve.evidence.sectorThreatOne'
                : 'armyReserve.evidence.sectorThreatMany',
            {
                ratio: source.sector_threat_ratio.toFixed(1),
                count: source.sector_assigned_brigade_count,
            },
        );
    }

    return null;
}

function getArmyReserveEvidenceDetail(source: ArmyReserveProvenanceSource): string | null {
    if (
        source.provenance_driver === 'active_operation'
        && typeof source.operation_name === 'string'
        && source.operation_phase === 'execution'
        && typeof source.operation_momentum === 'number'
        && Number.isFinite(source.operation_momentum)
    ) {
        return t('armyReserve.evidence.detail.operationExecution');
    }

    if (
        source.provenance_driver === 'active_operation'
        && typeof source.operation_name === 'string'
        && source.operation_phase === 'planning'
        && typeof source.operation_preparation_sub_phase === 'string'
    ) {
        return t('armyReserve.evidence.detail.operationPlanning');
    }

    if (
        source.provenance_driver === 'captured_objectives'
        && typeof source.operation_name === 'string'
        && source.operation_phase === 'execution'
        && typeof source.operation_objective_capture_count === 'number'
        && Number.isFinite(source.operation_objective_capture_count)
    ) {
        return t('armyReserve.evidence.detail.capturedObjectives');
    }

    if (
        source.provenance_driver === 'sector_threat'
        && typeof source.sector_threat_ratio === 'number'
        && typeof source.sector_assigned_brigade_count === 'number'
    ) {
        return t('armyReserve.evidence.detail.sectorThreat');
    }

    return null;
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
    leadCriticalThreatRatio,
    leadCriticalAssignedBrigadeCount,
    leadCriticalOperationName,
    leadCriticalOperationPhase,
    leadCriticalOperationPreparationSubPhase,
    leadCriticalOperationMomentum,
    leadCriticalOperationObjectiveCaptureCount,
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
    leadCriticalThreatRatio?: number;
    leadCriticalAssignedBrigadeCount?: number;
    leadCriticalOperationName?: string;
    leadCriticalOperationPhase?: string;
    leadCriticalOperationPreparationSubPhase?: string;
    leadCriticalOperationMomentum?: number;
    leadCriticalOperationObjectiveCaptureCount?: number;
    leadCriticalPurpose?: string;
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
            sector_threat_ratio: leadCriticalThreatRatio,
            sector_assigned_brigade_count: leadCriticalAssignedBrigadeCount,
            operation_name: leadCriticalOperationName,
            operation_phase: leadCriticalOperationPhase,
            operation_preparation_sub_phase: leadCriticalOperationPreparationSubPhase,
            operation_momentum: leadCriticalOperationMomentum,
            operation_objective_capture_count: leadCriticalOperationObjectiveCaptureCount,
        });
        const leadEvidence = getArmyReserveEvidenceSummary({
            provenance_driver: leadCriticalProvenanceDriver,
            commander_request_priority: leadCriticalCommanderPriority,
            commander_request_brigades_needed: leadCriticalCommanderBrigadesNeeded,
            commander_focus_zone_id: leadCriticalFocusZoneId,
            sector_threat_ratio: leadCriticalThreatRatio,
            sector_assigned_brigade_count: leadCriticalAssignedBrigadeCount,
            operation_name: leadCriticalOperationName,
            operation_phase: leadCriticalOperationPhase,
            operation_preparation_sub_phase: leadCriticalOperationPreparationSubPhase,
            operation_momentum: leadCriticalOperationMomentum,
            operation_objective_capture_count: leadCriticalOperationObjectiveCaptureCount,
        });
        return {
            label: `${criticalCount} ${criticalCount === 1 ? 'CRITICAL RESERVE REQUEST' : 'CRITICAL RESERVE REQUESTS'}`,
            title: t('armyReserve.toolbar.criticalTitle', {
                criticalCount,
                requestWord: criticalCount === 1 ? 'request' : 'requests',
                needWord: criticalCount === 1 ? 'needs' : 'need',
                leadCause,
                leadDriver,
                leadEvidence: leadEvidence ? ` ${t('armyReserve.toolbar.leadSignal', { leadEvidence })}` : '',
                pendingCount,
                pendingVerb: pendingCount === 1 ? 'is' : 'are',
                pendingWord: pendingCount === 1 ? 'request' : 'requests',
            }),
            tone: 'critical',
        };
    }

    return {
        label: `${pendingCount} ${pendingCount === 1 ? 'RESERVE REQUEST' : 'RESERVE REQUESTS'}`,
        title: t('armyReserve.toolbar.routineTitle', {
            count: pendingCount,
            requestWord: pendingCount === 1 ? 'request' : 'requests',
            awaitWord: pendingCount === 1 ? 'awaits' : 'await',
        }),
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
    leadCriticalThreatRatio,
    leadCriticalAssignedBrigadeCount,
    leadCriticalOperationName,
    leadCriticalOperationPhase,
    leadCriticalOperationPreparationSubPhase,
    leadCriticalOperationMomentum,
    leadCriticalOperationObjectiveCaptureCount,
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
    leadCriticalThreatRatio?: number;
    leadCriticalAssignedBrigadeCount?: number;
    leadCriticalOperationName?: string;
    leadCriticalOperationPhase?: string;
    leadCriticalOperationPreparationSubPhase?: string;
    leadCriticalOperationMomentum?: number;
    leadCriticalOperationObjectiveCaptureCount?: number;
    leadCriticalPurpose?: string;
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
            sector_threat_ratio: leadCriticalThreatRatio,
            sector_assigned_brigade_count: leadCriticalAssignedBrigadeCount,
            operation_name: leadCriticalOperationName,
            operation_phase: leadCriticalOperationPhase,
            operation_preparation_sub_phase: leadCriticalOperationPreparationSubPhase,
            operation_momentum: leadCriticalOperationMomentum,
            operation_objective_capture_count: leadCriticalOperationObjectiveCaptureCount,
        });
        const leadEvidence = getArmyReserveEvidenceSummary({
            provenance_driver: leadCriticalProvenanceDriver,
            commander_request_priority: leadCriticalCommanderPriority,
            commander_request_brigades_needed: leadCriticalCommanderBrigadesNeeded,
            commander_focus_zone_id: leadCriticalFocusZoneId,
            sector_threat_ratio: leadCriticalThreatRatio,
            sector_assigned_brigade_count: leadCriticalAssignedBrigadeCount,
            operation_name: leadCriticalOperationName,
            operation_phase: leadCriticalOperationPhase,
            operation_preparation_sub_phase: leadCriticalOperationPreparationSubPhase,
            operation_momentum: leadCriticalOperationMomentum,
            operation_objective_capture_count: leadCriticalOperationObjectiveCaptureCount,
        });
        return {
            heading: `${criticalCount} critical reserve request${criticalCount === 1 ? '' : 's'} need${criticalCount === 1 ? 's' : ''} immediate army attention.`,
            detail: t('armyReserve.attention.criticalDetail', {
                leadCause,
                leadDriver,
                leadEvidence: leadEvidence ? ` ${t('armyReserve.toolbar.leadSignal', { leadEvidence })}` : '',
            }),
            tone: 'critical',
        };
    }

    return {
        heading: `${pendingCount} reserve request${pendingCount === 1 ? '' : 's'} await${pendingCount === 1 ? 's' : ''} army reserve review.`,
        detail: t('armyReserve.attention.routineDetail'),
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
            label: t('armyReserve.requestSeverity.critical.label'),
            detail: t('armyReserve.requestSeverity.critical.detail'),
            tone: 'critical',
        };
    }

    return {
        label: t('armyReserve.requestSeverity.routine.label'),
        detail: t('armyReserve.requestSeverity.routine.detail'),
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
    purpose?: string;
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
        label: tone === 'critical' ? t('armyReserve.cause.labelCritical') : t('armyReserve.cause.labelRoutine'),
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
        label: t('armyReserve.provenance.label'),
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

export function getArmyReserveRequestEvidenceCopy(
    source: ArmyReserveProvenanceSource,
): {
    label: string;
    summary: string;
    detail: string;
} | null {
    const summary = getArmyReserveEvidenceSummary(source);
    const detail = getArmyReserveEvidenceDetail(source);
    if (!summary || !detail) return null;

    return {
        label: t('armyReserve.evidence.label'),
        summary,
        detail,
    };
}
