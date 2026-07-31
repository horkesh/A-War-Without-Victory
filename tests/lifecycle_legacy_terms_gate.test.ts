import { describe, expect, it } from 'vitest';

import { shouldSkipPath } from '../tools/engineering/check_lifecycle_legacy_terms.js';

describe('lifecycle legacy-term gate scope', () => {
    it('excludes historical and generated evidence surfaces', () => {
        const excluded = [
            '.agent/napkin.md',
            'data/derived/scenario/baselines/manifest.json',
            'docs/10_canon/_backups_pre_v09_20260505/context.md',
            'docs/40_reports/implemented/20260301_PHASE_M_REFACTOR_PASS_REPORT.md',
            'docs/PROJECT_LEDGER.md',
            'docs/knowledge/AWWV/raw/session.md',
            'docs/plans/archived-plan.md',
            'runs/example/run_summary.json',
        ];

        for (const path of excluded) {
            expect(shouldSkipPath(path), path).toBe(true);
        }
    });

    it('keeps maintained source, tests, and active canon in scope', () => {
        const included = [
            'src/sim/turn_pipeline.ts',
            'tests/turn_pipeline.test.ts',
            'tools/scenario_runner/run_scenario.ts',
            'docs/10_canon/Engine_Invariants_v0_9_0.md',
            'docs/20_engineering/CODE_CANON.md',
        ];

        for (const path of included) {
            expect(shouldSkipPath(path), path).toBe(false);
        }
    });
});
