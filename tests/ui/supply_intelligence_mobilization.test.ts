// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { render } from '@testing-library/react';
import React from 'react';

import { computeSupplyBreakdown, getEnclaveStatuses, getMobilizationInfo, SupplyIntelligence } from '../../src/ui/map/components/army_hq/SupplyIntelligence';
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

    it('marks missing faction reserves as unreported instead of explicit zero supply', () => {
        const state = {
            formations: [
                {
                    id: 'fielded',
                    faction: 'RBiH',
                    kind: 'brigade',
                    status: 'active',
                    readiness: 'ready',
                },
            ],
        } as unknown as LoadedGameState;

        const breakdown = computeSupplyBreakdown(state, 'RBiH');

        expect(breakdown.currentGeneralReported).toBe(false);
        expect(breakdown.currentHeavyReported).toBe(false);
        expect(breakdown.currentGeneral).toBeNull();
        expect(breakdown.currentHeavy).toBeNull();

        const { container } = render(React.createElement(SupplyIntelligence, {
            breakdown,
            enclaves: [],
            mobilization: null,
            currentTurn: 0,
        }));

        expect(container.textContent).toContain('GENERAL SUPPLY: Unreported');
        expect(container.textContent).not.toContain('GENERAL SUPPLY: 0');
    });

    it('keeps explicit zero faction reserves as reported zero supply', () => {
        const state = {
            factionReserves: {
                RBiH: { generalSupply: 0, heavyMunitions: 0 },
            },
            formations: [],
        } as unknown as LoadedGameState;

        const breakdown = computeSupplyBreakdown(state, 'RBiH');

        expect(breakdown.currentGeneralReported).toBe(true);
        expect(breakdown.currentHeavyReported).toBe(true);
        expect(breakdown.currentGeneral).toBe(0);
        expect(breakdown.currentHeavy).toBe(0);
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
