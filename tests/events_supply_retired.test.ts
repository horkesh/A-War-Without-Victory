/**
 * Supply-reserve retirement guard (2026-11-17: supply is connection, not stock).
 *
 * The faction supply-reserve stock is retired. The `supply_delta` effect kind and the
 * `supply_below` / `supply_above` condition types are no longer event vocabulary, and the 18
 * consequence events that existed only to move the reserve are deleted. This guard fails if the
 * shipped catalog ever carries the retired vocabulary or any of the deleted ids again.
 *
 * Counterpart tests: tests/event_loader.test.ts (the loader rejects the retired vocabulary in
 * authored data) and tests/event_decisions.test.ts (an old save's staged decision that still
 * carries a `supply_delta` option resolves without throwing).
 */
import { describe, expect, it } from 'vitest';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import {
    KNOWN_EVENT_CONDITION_TYPE_SET,
    KNOWN_EVENT_EFFECT_KIND_SET,
} from '../src/sim/events/event_vocabulary.js';

const RETIRED_VOCABULARY = ['supply_delta', 'supply_below', 'supply_above'] as const;

const DELETED_EVENT_IDS = [
    'csq_black_market_supply_route',
    'csq_arms_pipeline_disrupted',
    'csq_arms_pipeline_disrupted_RBiH',
    'csq_arms_pipeline_disrupted_HRHB',
    'csq_supply_corridor_chronic_strain',
    'csq_supply_corridor_chronic_strain_RS',
    'csq_supply_corridor_chronic_strain_HRHB',
    'csq_supply_corridor_chronic_strain_RBiH',
    'csq_winter_supply_attrition',
    'csq_winter_supply_attrition_RBiH',
    'csq_winter_supply_attrition_HRHB',
    'csq_winter_supply_attrition_RS',
    'csq_spring_thaw_supply_recovery_RBiH',
    'csq_spring_thaw_supply_recovery_RS',
    'csq_spring_thaw_supply_recovery_HRHB',
    'csq_grain_corridor_reopened',
    'csq_grain_corridor_reopened_RS',
    'csq_grain_corridor_reopened_HRHB',
] as const;

describe('supply-reserve retirement: shipped event catalog', () => {
    const catalog = loadEventDefinitions(0);

    it('loads a non-empty catalog (the scans below are not vacuous)', () => {
        expect(catalog.length).toBeGreaterThan(0);
    });

    it('lists exactly 18 deleted ids', () => {
        expect(new Set(DELETED_EVENT_IDS).size).toBe(18);
    });

    it('no event definition contains a retired effect kind or condition type', () => {
        const offenders: string[] = [];
        for (const definition of catalog) {
            const serialized = JSON.stringify(definition);
            for (const token of RETIRED_VOCABULARY) {
                if (serialized.includes(`"${token}"`)) offenders.push(`${definition.id}: ${token}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('none of the 18 deleted event ids is in the catalog', () => {
        const present = new Set(catalog.map((definition) => definition.id));
        expect(DELETED_EVENT_IDS.filter((id) => present.has(id))).toEqual([]);
    });

    it('no surviving event references a deleted id as a prerequisite, enabler or closer', () => {
        const deleted = new Set<string>(DELETED_EVENT_IDS);
        const offenders: string[] = [];
        for (const definition of catalog) {
            const serialized = JSON.stringify(definition);
            for (const id of deleted) {
                if (serialized.includes(`"${id}"`)) offenders.push(`${definition.id} -> ${id}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('the event vocabulary no longer lists the retired tokens', () => {
        expect(KNOWN_EVENT_EFFECT_KIND_SET.has('supply_delta')).toBe(false);
        expect(KNOWN_EVENT_CONDITION_TYPE_SET.has('supply_below')).toBe(false);
        expect(KNOWN_EVENT_CONDITION_TYPE_SET.has('supply_above')).toBe(false);
    });
});
