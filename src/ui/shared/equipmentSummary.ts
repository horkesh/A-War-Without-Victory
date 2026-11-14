/**
 * Player-safe, UI-only weapon holdings reporting. No state writes.
 *
 * The abstract heavy-equipment pool (`formation.equipment_state`) is not reported
 * here. Its only readers are the legacy front-pressure and tactical-doctrine steps,
 * which never run in the current build, so it carries no combat weight
 * (realism audit F9). Holdings come from `composition`, which combat does read.
 */
export interface EquipmentMetric { total: number | null; reportedCount: number }
export interface OwnEquipmentSummary {
    brigadeCount: number;
    holdings: Record<'tanks' | 'artillery' | 'aa_systems', EquipmentMetric>;
}
type EquipmentFormation = { faction?: unknown; kind?: unknown; status?: unknown; composition?: unknown };
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
    return {
        brigadeCount: own.length,
        holdings: { tanks: metric('tanks'), artillery: metric('artillery'), aa_systems: metric('aa_systems') },
    };
}
