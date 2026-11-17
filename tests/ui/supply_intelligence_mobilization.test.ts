// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { render } from '@testing-library/react';
import React from 'react';

import { getEnclaveStatuses, getMobilizationInfo, SupplyIntelligence } from '../../src/ui/map/components/army_hq/SupplyIntelligence';
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

    it('shows no reserve breakdown (supply-reserve economy retired 2026-11-17)', () => {
        const { container } = render(React.createElement(SupplyIntelligence, {
            enclaves: [],
            mobilization: null,
        }));

        expect(container.textContent).not.toContain('GENERAL SUPPLY');
        expect(container.textContent).not.toContain('patron');
        expect(container.textContent).not.toContain('Depletion');
    });

    it('keeps missing enclave supply unreported instead of inventing adequate supply', () => {
        const state = {
            player_faction: 'RBiH',
            enclaveResilience: {
                gorazde: {
                    display_name: 'Gorazde',
                    faction: 'RBiH',
                    resilience: 18,
                    isolation_turns: 0,
                    hardening_active: false,
                },
            },
        } as unknown as LoadedGameState;

        expect(getEnclaveStatuses(state, 'RBiH')).toMatchObject([
            { id: 'gorazde', supplyState: 'unreported' },
        ]);
    });
});
