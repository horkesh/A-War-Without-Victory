import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
    auditFatigueDistribution,
} = require('../tools/diagnostics/fatigue_distribution_audit.cjs') as {
    auditFatigueDistribution: (inputPath: string) => {
        diagnostic: string;
        schema_version: number;
        weeks: number[];
        buckets: Array<{
            week: number | null;
            faction_id: string;
            corps_id: string;
            role: string;
            count: number;
            mean_fatigue: number;
            pct_zero: number;
            pct_above_threshold: number;
            pct_above_FATIGUE_MAX_half: number;
            classified_sources: Record<string, number>;
            formation_ids: string[];
        }>;
    };
};

describe('fatigue distribution audit diagnostic', () => {
    it('emits stable per-week faction corps role fatigue buckets', () => {
        const runDir = join(process.cwd(), 'tests', 'fixtures', 'fatigue_distribution', 'compact_run');
        const audit = auditFatigueDistribution(runDir);

        expect(audit.diagnostic).toBe('fatigue_distribution_audit');
        expect(audit.schema_version).toBe(1);
        expect(audit.weeks).toEqual([1, 2]);
        expect(audit.buckets.map((bucket) => [
            bucket.week,
            bucket.faction_id,
            bucket.corps_id,
            bucket.role,
            bucket.count,
            bucket.mean_fatigue,
            bucket.pct_zero,
            bucket.classified_sources,
            bucket.formation_ids,
        ])).toEqual([
            [
                1,
                'RBiH',
                'arbih_1st_corps',
                'engaged_this_turn',
                1,
                4,
                0,
                { combat_driven: 1, front_duty_driven: 0, unknown: 0, unsupplied_accumulation: 0 },
                ['b_front_combat'],
            ],
            [
                1,
                'RBiH',
                'arbih_1st_corps',
                'sector_front',
                1,
                0,
                100,
                { combat_driven: 0, front_duty_driven: 0, unknown: 0, unsupplied_accumulation: 0 },
                ['a_front_zero'],
            ],
            [
                1,
                'RS',
                'vrs_drina',
                'sector_reserve',
                1,
                2,
                0,
                { combat_driven: 0, front_duty_driven: 0, unknown: 1, unsupplied_accumulation: 0 },
                ['c_reserve'],
            ],
            [
                2,
                'RBiH',
                'arbih_1st_corps',
                'sector_front',
                2,
                2,
                0,
                { combat_driven: 1, front_duty_driven: 1, unknown: 0, unsupplied_accumulation: 0 },
                ['a_front_zero', 'b_front_combat'],
            ],
            [
                2,
                'RS',
                'vrs_drina',
                'sector_reserve',
                1,
                1,
                0,
                { combat_driven: 0, front_duty_driven: 0, unknown: 1, unsupplied_accumulation: 0 },
                ['c_reserve'],
            ],
        ]);
        expect(audit.buckets[0].pct_above_threshold).toBe(100);
        expect(audit.buckets[0].pct_above_FATIGUE_MAX_half).toBe(0);
    });
});
