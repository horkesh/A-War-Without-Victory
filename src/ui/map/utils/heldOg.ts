/**
 * Owner ruling M3 (2026-11-12): "grouping of brigades should be the main definition of OG. Even
 * when there is only one brigade in it." A sector is a real (held) OG when it has one or more
 * brigades on its roster (assigned, reserve or rear), isolated or not. A brigade-less sector is an
 * unheld front and is never counted as an OG. Unreachable brigade-less pockets are already left
 * out of `corpsFrontSectors` by the adapter.
 */
export interface HeldOgSectorLike {
    corps_id: string;
    assigned_brigade_ids: readonly string[];
    reserve_brigade_ids: readonly string[];
    rear_brigade_ids?: readonly string[];
    unheld_front?: boolean;
}

export function isHeldOg(sector: HeldOgSectorLike): boolean {
    if (sector.unheld_front) return false;
    return sector.assigned_brigade_ids.length
        + sector.reserve_brigade_ids.length
        + (sector.rear_brigade_ids?.length ?? 0) > 0;
}

/** Held-OG count per corps id; corps with no held OG are omitted. Keys are sorted. */
export function countHeldOgsByCorps(sectors: readonly HeldOgSectorLike[]): Record<string, number> {
    const counts = new Map<string, number>();
    for (const sector of sectors) {
        if (!isHeldOg(sector)) continue;
        counts.set(sector.corps_id, (counts.get(sector.corps_id) ?? 0) + 1);
    }
    const out: Record<string, number> = {};
    for (const corpsId of [...counts.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
        out[corpsId] = counts.get(corpsId)!;
    }
    return out;
}
