import { describe, expect, it } from 'vitest';

import { computeSupplyBreakdown, getMobilizationInfo } from '../../src/ui/map/components/army_hq/SupplyIntelligence';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import {
    HEAVY_MAINTENANCE_PER_WEAPON,
    MAINTENANCE_DRAIN_PER_FORMATION,
} from '../../src/state/supply_reserve_constants';

describe('SupplyIntelligence mobilization info', () => {
    it('maps the current mobilization summary shape without legacy field names', () => {
        const state = {
            mobilizationSummary: {
                RBiH: {
                    faction: 'RBiH',
                    total_available: 1234,
                    total_committed: 456,
                    total_exhausted: 310,
                    exhaustion_pct: 15.5,
                    strategic_reserve: 88,
                    top_pools: [
                        { mun_id: 'sarajevo', available: 800 },
                        { mun_id: 'tuzla', available: 434 },
                    ],
                },
            },
        } as unknown as LoadedGameState;

        expect(getMobilizationInfo(state, 'RBiH')).toEqual({
            exhaustionPct: 15.5,
            activePoolCount: 2,
            currentPoolTotal: 1234,
        });
    });

    it('returns null when the selected faction has no mobilization summary', () => {
        const state = { mobilizationSummary: {} } as unknown as LoadedGameState;

        expect(getMobilizationInfo(state, 'RS')).toBeNull();
    });

    it('excludes active-but-forming brigades from supply maintenance estimates', () => {
        const state = {
            factionReserves: {
                RBiH: { generalSupply: 100, heavyMunitions: 20 },
            },
            formations: [
                {
                    id: 'fielded',
                    faction: 'RBiH',
                    kind: 'brigade',
                    status: 'active',
                    readiness: 'active',
                    composition: { tanks: 1, artillery: 2, aa_systems: 3 },
                },
                {
                    id: 'forming',
                    faction: 'RBiH',
                    kind: 'brigade',
                    status: 'active',
                    readiness: 'forming',
                    composition: { tanks: 10, artillery: 10, aa_systems: 10 },
                },
            ],
        } as unknown as LoadedGameState;

        expect(computeSupplyBreakdown(state, 'RBiH')).toMatchObject({
            estimatedMaintenanceDrain: Math.round(MAINTENANCE_DRAIN_PER_FORMATION * 100) / 100,
            estimatedHeavyDrain: Math.round(6 * HEAVY_MAINTENANCE_PER_WEAPON * 100) / 100,
        });
    });
});
