import { strictCompare } from '../state/validateGameState.js';

export interface ControlChangeAttributionSummary {
    total_changes: number;
    combat: number;
    consolidation: number;
    abandoned: number;
    init_overrides: number;
    other: number;
}

export interface ControlChangeEventLike {
    mechanism: string;
}

export function summarizeControlChangeAttribution(
    events: ControlChangeEventLike[],
    initOverrideCount = 0
): ControlChangeAttributionSummary {
    const summary: ControlChangeAttributionSummary = {
        total_changes: Math.max(0, initOverrideCount),
        combat: 0,
        consolidation: 0,
        abandoned: 0,
        init_overrides: Math.max(0, initOverrideCount),
        other: 0,
    };

    for (const event of events) {
        switch (event.mechanism) {
            case 'combat':
                summary.combat += 1;
                break;
            case 'consolidation':
                summary.consolidation += 1;
                break;
            case 'abandoned':
                summary.abandoned += 1;
                break;
            default:
                summary.other += 1;
                break;
        }
        summary.total_changes += 1;
    }

    return summary;
}

export function countInitOverrideChanges(
    beforeControllers: Record<string, string | null | undefined>,
    afterControllers: Record<string, string | null | undefined>,
    overrides: Record<string, string>
): number {
    let count = 0;
    for (const osid of Object.keys(overrides).sort(strictCompare)) {
        if (!Object.prototype.hasOwnProperty.call(beforeControllers, osid)) {
            continue;
        }
        const before = beforeControllers[osid] ?? null;
        const after = afterControllers[osid] ?? null;
        if (before !== after) {
            count += 1;
        }
    }
    return count;
}

export function mergeControlChangeAttributionSummaries(
    left: ControlChangeAttributionSummary,
    right: ControlChangeAttributionSummary
): ControlChangeAttributionSummary {
    return {
        total_changes: left.total_changes + right.total_changes,
        combat: left.combat + right.combat,
        consolidation: left.consolidation + right.consolidation,
        abandoned: left.abandoned + right.abandoned,
        init_overrides: left.init_overrides + right.init_overrides,
        other: left.other + right.other,
    };
}
