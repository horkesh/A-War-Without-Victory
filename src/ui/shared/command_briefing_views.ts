import type {
    BriefingItem as SimBriefingItem,
    CommandBriefing as SimCommandBriefing,
} from '../../sim/briefing/collect_briefing.js';
import type {
    CommandBriefingItemView,
    CommandBriefingTargetView,
    CommandBriefingView,
    SummaryFocusSection,
} from '../map/data/types.js';

function toItemKind(section: SimBriefingItem['section']): CommandBriefingItemView['kind'] {
    switch (section) {
        case 'military':
        case 'diplomatic':
        case 'humanitarian':
        case 'field_reports':
        case 'command':
            return section;
        default:
            return 'military';
    }
}

function toTargetView(target: SimBriefingItem['target'] | undefined): CommandBriefingTargetView {
    if (!target) return { type: 'none' };
    if (target.kind === 'summary') return {
        type: 'summary',
        summaryFocus: toSummaryFocus(target.summaryFocus),
        label: target.label,
    };
    if (target.kind === 'peace_plan') return {
        type: 'peace_plan',
        peacePlanId: target.peacePlanId,
        label: target.label,
    };
    if (target.kind === 'officer_events') return {
        type: 'officer_events',
        officerFocus: toOfficerFocus(target.officerFocus),
        label: target.label,
    };
    if (target.kind === 'enclaves') return { type: 'enclaves', enclaveId: target.enclaveId, label: target.label };
    if (target.kind === 'operation') return { type: 'operation', operationKey: target.operationKey, label: target.label };
    if (target.kind === 'sector') return { type: 'sector', sectorId: target.sectorId, label: target.label };
    if (target.kind === 'settlement') return { type: 'settlement', osid: target.osid, label: target.label };
    if (target.kind === 'corps') return { type: 'corps', corpsId: target.corpsId, label: target.label };
    if (target.corpsId) return { type: 'corps', corpsId: target.corpsId };
    if (target.enclaveId) return { type: 'enclaves', enclaveId: target.enclaveId };
    if (target.osid) return { type: 'settlement', osid: target.osid };
    return { type: 'none' };
}

function toSummaryFocus(value: string | undefined): SummaryFocusSection | undefined {
    return value === 'overview'
        || value === 'ivp'
        || value === 'convoys'
        || value === 'casualties'
        || value === 'support'
        || value === 'opsec'
        || value === 'capital'
        ? value
        : undefined;
}

function toOfficerFocus(value: string | undefined): 'interpretations' | 'personnel' | undefined {
    return value === 'interpretations' || value === 'personnel' ? value : undefined;
}

function toItemView(item: SimBriefingItem): CommandBriefingItemView {
    return {
        id: item.id,
        kind: toItemKind(item.section),
        category: item.section,
        severity: item.severity,
        title: item.title,
        detail: item.detail,
        actionLabel: item.actionLabel,
        actionChipLabel: item.target?.label,
        corpsId: item.target?.corpsId,
        target: toTargetView(item.target),
    };
}

export function toCommandBriefingView(
    briefing: SimCommandBriefing | null | undefined,
): CommandBriefingView | undefined {
    if (!briefing || !Array.isArray(briefing.items)) return undefined;

    return {
        headline: briefing.headline,
        criticalCount: briefing.criticalCount,
        pendingCount: briefing.items.length,
        items: briefing.items.map(toItemView),
    };
}
