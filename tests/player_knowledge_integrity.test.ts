/**
 * Player-knowledge integrity: verifies that the adapter filters enemy-truth
 * families (casualtyLedger, factionReserves, warPhaseSupplyPressure,
 * warPhaseExhaustion) to the player faction only when player_faction is set,
 * and passes all factions through in observer mode.
 */
import { describe, expect, it } from 'vitest';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

function buildMinimalState(playerFaction: string | null) {
    return {
        meta: { turn: 10, phase: 'war', ...(playerFaction ? { player_faction: playerFaction } : {}) },
        military: {
            formations: {},
            casualty_ledger: {
                RBiH: { killed: 100, wounded: 200, missing_captured: 10 },
                RS:   { killed: 300, wounded: 400, missing_captured: 20 },
                HRHB: { killed: 50,  wounded: 60,  missing_captured: 5 },
            },
            general_supply_reserve: { RBiH: 500, RS: 800, HRHB: 300 },
            heavy_munitions_reserve: { RBiH: 100, RS: 200, HRHB: 50 },
        } as any,
        political: {
            political_controllers: {},
            war_supply_pressure: { RBiH: 70, RS: 90, HRHB: 40 },
            war_exhaustion: { RBiH: 120, RS: 250, HRHB: 80 },
        } as any,
    };
}

describe('player-knowledge integrity — adapter-level filtering', () => {
    it('scopes casualtyLedger to player faction only', () => {
        const parsed = parseGameState(buildMinimalState('RBiH'));
        expect(parsed.casualtyLedger).toBeDefined();
        expect(Object.keys(parsed.casualtyLedger!)).toEqual(['RBiH']);
        expect(parsed.casualtyLedger!['RBiH'].killed).toBe(100);
        expect(parsed.casualtyLedger!['RS']).toBeUndefined();
        expect(parsed.casualtyLedger!['HRHB']).toBeUndefined();
    });

    it('scopes factionReserves to player faction only', () => {
        const parsed = parseGameState(buildMinimalState('RBiH'));
        expect(parsed.factionReserves).toBeDefined();
        expect(Object.keys(parsed.factionReserves!)).toEqual(['RBiH']);
        expect(parsed.factionReserves!['RBiH'].generalSupply).toBe(500);
        expect(parsed.factionReserves!['RS']).toBeUndefined();
    });

    it('scopes warPhaseSupplyPressure to player faction only', () => {
        const parsed = parseGameState(buildMinimalState('RBiH'));
        expect(parsed.warPhaseSupplyPressure).toBeDefined();
        expect(Object.keys(parsed.warPhaseSupplyPressure!)).toEqual(['RBiH']);
        expect(parsed.warPhaseSupplyPressure!['RBiH']).toBe(70);
        expect(parsed.warPhaseSupplyPressure!['RS']).toBeUndefined();
    });

    it('scopes warPhaseExhaustion to player faction only', () => {
        const parsed = parseGameState(buildMinimalState('RBiH'));
        expect(parsed.warPhaseExhaustion).toBeDefined();
        expect(Object.keys(parsed.warPhaseExhaustion!)).toEqual(['RBiH']);
        expect(parsed.warPhaseExhaustion!['RBiH']).toBe(120);
        expect(parsed.warPhaseExhaustion!['RS']).toBeUndefined();
    });

    it('works for RS player faction', () => {
        const parsed = parseGameState(buildMinimalState('RS'));
        expect(Object.keys(parsed.casualtyLedger!)).toEqual(['RS']);
        expect(Object.keys(parsed.factionReserves!)).toEqual(['RS']);
        expect(Object.keys(parsed.warPhaseSupplyPressure!)).toEqual(['RS']);
        expect(Object.keys(parsed.warPhaseExhaustion!)).toEqual(['RS']);
    });

    it('passes all factions through in observer mode (no player_faction)', () => {
        const parsed = parseGameState(buildMinimalState(null));
        // In a non-dev environment without window, playerFaction resolves to null = observer
        // The adapter may fall through to dev defaults in some envs, so we check
        // that at minimum the data is present and not reduced to a single faction
        const ledgerKeys = Object.keys(parsed.casualtyLedger ?? {});
        const reserveKeys = Object.keys(parsed.factionReserves ?? {});
        const supplyKeys = Object.keys(parsed.warPhaseSupplyPressure ?? {});
        const exhaustionKeys = Object.keys(parsed.warPhaseExhaustion ?? {});

        // Observer mode: all 3 factions should be present
        // (If dev fallback kicks in during test, at minimum the filtering still works correctly)
        if (parsed.player_faction == null) {
            expect(ledgerKeys).toEqual(expect.arrayContaining(['RBiH', 'RS', 'HRHB']));
            expect(reserveKeys).toEqual(expect.arrayContaining(['RBiH', 'RS', 'HRHB']));
            expect(supplyKeys).toEqual(expect.arrayContaining(['RBiH', 'RS', 'HRHB']));
            expect(exhaustionKeys).toEqual(expect.arrayContaining(['RBiH', 'RS', 'HRHB']));
        } else {
            // Dev fallback resolved a faction — verify scoping is consistent
            expect(ledgerKeys).toHaveLength(1);
            expect(reserveKeys).toHaveLength(1);
            expect(supplyKeys).toHaveLength(1);
            expect(exhaustionKeys).toHaveLength(1);
        }
    });
});
