export const FACTION_COLORS = {
    RBiH: 'rgb(70, 120, 80)',
    RS: 'rgb(180, 50, 50)',
    HRHB: 'rgb(60, 100, 140)',
    null: '#cccccc',
} as const;

export const AMBER_MISMATCH = 'rgb(224, 166, 42)';

export interface ProjectionLayout {
    scale: number;
    offX: number;
    offY: number;
    maxY: number;
    panelOffsetX: number;
    titleOffsetY: number;
}

export function projectNorthUp(point: number[], layout: ProjectionLayout): [number, number] {
    return [
        point[0] * layout.scale + layout.offX + layout.panelOffsetX,
        (layout.maxY - point[1]) * layout.scale + layout.offY + layout.titleOffsetY,
    ];
}

export function resolveControlVisual(actual: string | null, expected: string | null): {
    fill: string;
    desiredMarker: string | null;
    mismatch: boolean;
} {
    const actualFill = actual == null
        ? FACTION_COLORS.null
        : (FACTION_COLORS[actual as keyof typeof FACTION_COLORS] ?? '#888');
    if (expected != null && actual !== expected) {
        return {
            fill: AMBER_MISMATCH,
            desiredMarker: FACTION_COLORS[expected as keyof typeof FACTION_COLORS] ?? '#888',
            mismatch: true,
        };
    }
    return { fill: actualFill, desiredMarker: null, mismatch: false };
}
