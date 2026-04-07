import type {
    BriefingItem as SimBriefingItem,
    CommandBriefing as SimCommandBriefing,
} from '../../sim/briefing/collect_briefing.js';
import type {
    CommandBriefingItemView,
    CommandBriefingTargetView,
    CommandBriefingView,
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
    if (target.corpsId) return { type: 'corps', corpsId: target.corpsId };
    if (target.enclaveId) return { type: 'enclaves', enclaveId: target.enclaveId };
    if (target.osid) return { type: 'settlement', osid: target.osid };
    return { type: 'none' };
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
