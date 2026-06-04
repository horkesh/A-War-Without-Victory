import { describe, expect, it } from 'vitest';

import { normalizeScenario } from '../src/scenario/scenario_loader.js';

describe('scenario player_faction contract', () => {
    it('keeps gameplay scenario data faction-neutral when player_faction is missing or null', () => {
        const missing = normalizeScenario({
            scenario_id: 'player_faction_missing',
            weeks: 1,
            turns: [],
        });
        const explicitNull = normalizeScenario({
            scenario_id: 'player_faction_null',
            weeks: 1,
            player_faction: null,
            turns: [],
        });

        expect(missing.player_faction).toBeUndefined();
        expect(explicitNull.player_faction).toBeUndefined();
    });

    it('preserves authored canonical factions and rejects invalid values', () => {
        const rs = normalizeScenario({
            scenario_id: 'player_faction_rs',
            weeks: 1,
            player_faction: 'RS',
            turns: [],
        });
        const hrhb = normalizeScenario({
            scenario_id: 'player_faction_hrhb',
            weeks: 1,
            player_faction: 'HRHB',
            turns: [],
        });

        expect(rs.player_faction).toBe('RS');
        expect(hrhb.player_faction).toBe('HRHB');
        expect(() => normalizeScenario({
            scenario_id: 'player_faction_invalid',
            weeks: 1,
            player_faction: 'UNPROFOR',
            turns: [],
        })).toThrow(/player_faction/);
    });

    it('uses RS explicitly in event-rich tests instead of changing gameplay scenario JSON', () => {
        const rsHarnessFixture = normalizeScenario({
            scenario_id: 'player_faction_rs_test_fixture',
            weeks: 1,
            player_faction: 'RS',
            turns: [],
        });

        expect(rsHarnessFixture.player_faction).toBe('RS');
    });

    it('preserves authored scenario decision_mode and rejects invalid values', () => {
        const emergent = normalizeScenario({
            scenario_id: 'decision_mode_emergent',
            weeks: 1,
            decision_mode: 'emergent',
            turns: [],
        });
        const historical = normalizeScenario({
            scenario_id: 'decision_mode_historical',
            weeks: 1,
            decision_mode: 'historical',
            turns: [],
        });

        expect(emergent.decision_mode).toBe('emergent');
        expect(historical.decision_mode).toBe('historical');
        expect(normalizeScenario({
            scenario_id: 'decision_mode_missing',
            weeks: 1,
            turns: [],
        }).decision_mode).toBeUndefined();
        expect(() => normalizeScenario({
            scenario_id: 'decision_mode_invalid',
            weeks: 1,
            decision_mode: 'railroad',
            turns: [],
        })).toThrow(/decision_mode/);
    });
});
