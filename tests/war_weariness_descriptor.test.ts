import { describe, expect, it } from 'vitest';
import {
    WAR_WEARINESS_RANK,
    WAR_WEARINESS_THRESHOLDS,
    bandForLevel,
    deriveAllWarWeariness,
    deriveWarWeariness,
    exhaustionLevel,
} from '../src/ui/map/data/warWeariness.js';

describe('war-weariness descriptor (Collapse Repurpose Design A read-model)', () => {
    it('recovers the 0..100 scale from raw war_exhaustion (÷100) and clamps', () => {
        expect(exhaustionLevel(0)).toBe(0);
        expect(exhaustionLevel(6500)).toBe(65);
        expect(exhaustionLevel(10000)).toBe(100);
        // cap: raw above 10000 still clamps to 100
        expect(exhaustionLevel(12345)).toBe(100);
        // negative / NaN guard
        expect(exhaustionLevel(-50)).toBe(0);
        expect(exhaustionLevel(Number.NaN)).toBe(0);
    });

    it('maps each band deterministically at and across its threshold', () => {
        expect(bandForLevel(0)).toBe('steady');
        expect(bandForLevel(WAR_WEARINESS_THRESHOLDS.strained - 0.01)).toBe('steady');
        expect(bandForLevel(WAR_WEARINESS_THRESHOLDS.strained)).toBe('strained');
        expect(bandForLevel(WAR_WEARINESS_THRESHOLDS.cracking - 0.01)).toBe('strained');
        expect(bandForLevel(WAR_WEARINESS_THRESHOLDS.cracking)).toBe('cracking');
        expect(bandForLevel(WAR_WEARINESS_THRESHOLDS.collapsing - 0.01)).toBe('cracking');
        expect(bandForLevel(WAR_WEARINESS_THRESHOLDS.collapsing)).toBe('collapsing');
        expect(bandForLevel(100)).toBe('collapsing');
    });

    it('bands progress steady → strained → cracking → collapsing as exhaustion climbs', () => {
        // mid-1992 (steady), early-mid 1993 crossing (cracking band ~65), late-war (collapsing)
        expect(deriveWarWeariness(1000).band).toBe('steady'); // 10
        expect(deriveWarWeariness(4500).band).toBe('strained'); // 45
        expect(deriveWarWeariness(7000).band).toBe('cracking'); // 70
        expect(deriveWarWeariness(9000).band).toBe('collapsing'); // 90

        // ranks are strictly ordered
        expect(WAR_WEARINESS_RANK.steady).toBe(0);
        expect(deriveWarWeariness(4500).rank).toBe(1);
        expect(deriveWarWeariness(7000).rank).toBe(2);
        expect(deriveWarWeariness(9000).rank).toBe(3);
    });

    it('echoes 3C Tier-0 collapse-eligibility when present, false otherwise', () => {
        const eligible = {
            eligible_authority: false,
            eligible_cohesion: true,
            eligible_spatial: false,
            persistence_authority: 0,
            persistence_cohesion: 4,
            persistence_spatial: 0,
            suppressed: false,
            immune: false,
            last_updated_turn: 50,
        };
        expect(deriveWarWeariness(9000, eligible).collapseEligible).toBe(true);
        // default path (collapse pipeline disabled → no eligibility state)
        expect(deriveWarWeariness(9000).collapseEligible).toBe(false);
        // eligibility never drives the band — band stays signal-only
        expect(deriveWarWeariness(1000, eligible).band).toBe('steady');
    });

    it('represents all three factions (universal negative-sum texture), defaulting absent to steady', () => {
        const all = deriveAllWarWeariness({ RBiH: 9000, RS: 7000 /* HRHB absent */ });
        expect(all.RBiH.band).toBe('collapsing');
        expect(all.RS.band).toBe('cracking');
        expect(all.HRHB.band).toBe('steady'); // absent → 0/steady, still present in the record
        expect(Object.keys(all).sort()).toEqual(['HRHB', 'RBiH', 'RS']);
    });

    it('is a pure function — same input yields identical output (determinism)', () => {
        const a = deriveWarWeariness(6543);
        const b = deriveWarWeariness(6543);
        expect(a).toEqual(b);
    });
});
