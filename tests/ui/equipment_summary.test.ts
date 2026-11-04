import { describe, expect, it } from 'vitest';
import { summarizeOwnEquipment } from '../../src/ui/shared/equipmentSummary';
const brigade = (composition: unknown, equipment_state?: unknown, extra = {}) => ({ faction: 'RS', kind: 'brigade', status: 'active', composition, equipment_state, ...extra });
describe('own equipment reporting', () => {
 it('counts only explicit own active brigades, never command or taskgroup rollups', () => {
  const rows = [brigade({ tanks: 4, artillery: 0, aa_systems: 2 }), brigade({ tanks: 100 }, undefined, { faction: 'HRHB' }), brigade({ tanks: 200 }, undefined, { kind: 'operational_group' }), brigade({ tanks: 300 }, undefined, { status: 'inactive' })];
  expect(summarizeOwnEquipment(rows, 'RS')).toMatchObject({ brigadeCount: 1, holdings: { tanks: { total: 4, reportedCount: 1 }, artillery: { total: 0, reportedCount: 1 } } });
  expect(summarizeOwnEquipment(rows, null).brigadeCount).toBe(0);
 });
 it('preserves per-field gaps and malformed reports, zero and no report', () => {
  const result = summarizeOwnEquipment([brigade({ tanks: 0, artillery: -1, aa_systems: NaN }), brigade({ artillery: 3, tanks: Infinity }), brigade(null)], 'RS');
  expect(result.holdings.tanks).toEqual({ total: 0, reportedCount: 1 });
  expect(result.holdings.artillery).toEqual({ total: 3, reportedCount: 1 });
  expect(result.holdings.aa_systems).toEqual({ total: null, reportedCount: 0 });
 });
 it('keeps the abstract operational pool separate and rejects inconsistent reports', () => {
  const rows = [brigade({ tanks: 90 }, { operational_heavy: 3, total_heavy: 4 }), brigade({}, { operational_heavy: 0, total_heavy: 0 }), brigade({}, { operational_heavy: 8, total_heavy: 2 })];
  const before = structuredClone(rows);
  expect(summarizeOwnEquipment(rows, 'RS').pool).toEqual({ operational: 3, total: 4, reportedCount: 2, percent: 75 });
  expect(rows).toEqual(before);
  expect(summarizeOwnEquipment([...rows].reverse(), 'RS')).toEqual(summarizeOwnEquipment(rows, 'RS'));
  expect(summarizeOwnEquipment([brigade({}, { operational_heavy: 0, total_heavy: 0 })], 'RS').pool.percent).toBeNull();
 });
});
