import { describe, expect, it } from 'vitest';

import { getMobilizationInfo } from '../../src/ui/map/components/army_hq/SupplyIntelligence';
import type { LoadedGameState } from '../../src/ui/map/data/types';

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
});
