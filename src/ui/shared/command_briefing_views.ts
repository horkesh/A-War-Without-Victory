import type {
    BriefingItem as SimBriefingItem,
    CommandBriefing as SimCommandBriefing,
} from '../../sim/briefing/collect_briefing.js';
import type {
    CommandBriefingCategoryView,
    CommandBriefingItemView,
    CommandBriefingSubjectView,
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

function categoryFromItem(item: SimBriefingItem): CommandBriefingCategoryView {
    if (item.id.startsWith('mil-cohesion-')) return 'cohesion';
    if (item.id === 'mil-active-ops') return 'active_operations';
    if (item.id === 'mil-disrupted') return 'disrupted_brigades';
    if (item.id === 'log-supply') return 'supply';
    if (item.id === 'dip-peace-plan') return 'peace_plan';
    if (item.id === 'dip-patron-override') return 'patron_override';
    if (item.id === 'dip-patron-pressure') return 'patron_pressure';
    if (item.id.startsWith('hum-enclave-')) return 'enclave';
    if (item.id.startsWith('aar-')) return 'field_report';
    if (item.id === 'cmd-order-interpretations') return 'order_interpretations';
    if (item.id === 'cmd-officer-events') return 'personnel';
    return 'unknown';
}

function labelBeforeColon(value: string): string | undefined {
    const index = value.indexOf(':');
    if (index <= 0) return undefined;
    return value.slice(0, index).trim() || undefined;
}

function subjectFromItem(item: SimBriefingItem, target: CommandBriefingTargetView): CommandBriefingSubjectView {
    const category = categoryFromItem(item);
    if (category === 'cohesion') {
        const corpsId = target.corpsId ?? item.target?.corpsId ?? item.id.slice('mil-cohesion-'.length);
        return { type: 'corps', id: corpsId, label: target.label ?? labelBeforeColon(item.title) };
    }
    if (category === 'peace_plan' || category === 'supply') {
        return { type: 'summary', label: target.label };
    }
    if (category === 'order_interpretations' || category === 'personnel') {
        return { type: 'summary', label: target.label };
    }
    if (target.type === 'operation') {
        return { type: 'operation', id: target.operationKey, label: target.label, corpsId: target.corpsId };
    }
    if (target.type === 'sector') {
        return { type: 'sector', id: target.sectorId, label: target.label, corpsId: target.corpsId };
    }
    if (target.type === 'corps' && target.corpsId) {
        return { type: 'corps', id: target.corpsId, label: target.label };
    }
    return { type: 'none', label: target.label };
}

function toItemView(item: SimBriefingItem): CommandBriefingItemView {
    const target = toTargetView(item.target);
    return {
        id: item.id,
        kind: toItemKind(item.section),
        category: item.section,
        briefingCategory: categoryFromItem(item),
        subject: subjectFromItem(item, target),
        copyToken: item.id,
        severity: item.severity,
        title: item.title,
        detail: item.detail,
        actionLabel: item.actionLabel,
        actionChipLabel: item.target?.label,
        corpsId: item.target?.corpsId,
        target,
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
