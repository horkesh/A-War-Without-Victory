/** Player-safe, UI-only holdings and abstract heavy-pool reporting. No state writes. */
export interface EquipmentMetric { total: number | null; reportedCount: number }
export interface OwnEquipmentSummary {
    brigadeCount: number;
    holdings: Record<'tanks' | 'artillery' | 'aa_systems', EquipmentMetric>;
    pool: { operational: number | null; total: number | null; reportedCount: number; percent: number | null };
}
type EquipmentFormation = { faction?: unknown; kind?: unknown; status?: unknown; composition?: unknown; equipment_state?: unknown };
const validCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
export function summarizeOwnEquipment(formations: readonly EquipmentFormation[], playerFaction: string | null | undefined): OwnEquipmentSummary {
    const own = playerFaction && ['RS', 'RBiH', 'HRHB'].includes(playerFaction)
        ? formations.filter(f => f.faction === playerFaction && f.kind === 'brigade' && f.status === 'active') : [];
    const sum = (values: number[]) => values.length ? values.sort((a, b) => a - b).reduce((a, b) => a + b, 0) : null;
    const metric = (key: string): EquipmentMetric => {
        const values = own.map(f => record(f.composition)[key]).filter(validCount);
        return { total: sum(values), reportedCount: values.length };
    };
    const pools = own.map(f => record(f.equipment_state)).filter(p => validCount(p.operational_heavy) && validCount(p.total_heavy) && p.operational_heavy <= p.total_heavy);
    const operational = sum(pools.map(p => p.operational_heavy as number));
    const total = sum(pools.map(p => p.total_heavy as number));
    return {
        brigadeCount: own.length,
        holdings: { tanks: metric('tanks'), artillery: metric('artillery'), aa_systems: metric('aa_systems') },
        pool: { operational, total, reportedCount: pools.length, percent: total != null && total > 0 && operational != null ? operational / total * 100 : null },
    };
}
