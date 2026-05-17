type OpsPlanningSectorCandidate = {
    sector_id: string;
    sub_segments?: Array<{
        enemy_osids?: string[];
    }>;
};

export function chooseOpsPlanningSector<T extends OpsPlanningSectorCandidate>(sectors: T[]): T | null {
    return sectors.find((sector) =>
        (sector.sub_segments ?? []).some((segment) => (segment.enemy_osids ?? []).length > 0)
    ) ?? sectors[0] ?? null;
}
