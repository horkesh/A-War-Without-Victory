import type { OpsPlanState } from './types';
import { getOsidDisplayName } from '../../utils/osidDisplayName';

export interface OpordAxisDisplay {
    id: string;
    name: string;
    brigadeCount: number;
    objectiveCount: number;
    stagingLabel: string | null;
}

export interface OpordDisplayModel {
    axes: OpordAxisDisplay[];
    objectiveLabels: string[];
    schwerpunktLabel: string | null;
}

export function buildOpordDisplayModel(
    plan: OpsPlanState,
    osidDisplayNames: Record<string, string> | null,
): OpordDisplayModel {
    const objectiveLabels = Array.from(
        new Set(
            plan.axes.flatMap((axis) =>
                axis.objectives.map((osid) => getOsidDisplayName(osid, osidDisplayNames)),
            ),
        ),
    );

    return {
        axes: plan.axes.map((axis) => ({
            id: axis.id,
            name: axis.name,
            brigadeCount: axis.brigadeIds.length,
            objectiveCount: axis.objectives.length,
            stagingLabel: axis.stagingOsid
                ? getOsidDisplayName(axis.stagingOsid, osidDisplayNames)
                : null,
        })),
        objectiveLabels,
        schwerpunktLabel: plan.schwerpunktOsid
            ? getOsidDisplayName(plan.schwerpunktOsid, osidDisplayNames)
            : null,
    };
}
