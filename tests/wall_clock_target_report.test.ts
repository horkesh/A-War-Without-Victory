import { describe, expect, it } from 'vitest';

import {
    buildWallClockTargetReport,
    formatWallClockTargetMarkdown,
} from '../tools/perf/wall_clock_target_report.js';

describe('wall-clock target report', () => {
    it('builds a stable target-truth report from scenario timing JSON', () => {
        const report = buildWallClockTargetReport({
            timingPath: 'runs/sample/timing.json',
            timing: {
                schema_version: 1,
                run_id: 'apr1992_definitive_40w__sample',
                scenario_id: 'apr1992_definitive_40w',
                weeks: 40,
                final_state_hash: 'abc123',
                buckets_ms: {
                    setup: 2500,
                    simulation: 80000,
                    diagnostics_reporting: 150,
                    serialization_artifacts: 10000,
                    total: 92500,
                },
                notes: {
                    simulation: 'Turn pipeline work.',
                },
            },
            targetMsPerTurn: 100,
            benchmarkMode: 'full_harness',
            command: 'npm.cmd run sim:scenario:run:40w:timed',
            machineLabel: 'local-win-test',
            nodeVersion: 'v24.0.0',
            platform: 'win32',
            arch: 'x64',
        });

        expect(report.schema_version).toBe(1);
        expect(report.source_timing_path).toBe('runs/sample/timing.json');
        expect(report.run.run_id).toBe('apr1992_definitive_40w__sample');
        expect(report.environment).toEqual({
            machine_label: 'local-win-test',
            node_version: 'v24.0.0',
            platform: 'win32',
            arch: 'x64',
        });
        expect(report.target).toEqual({
            target_ms_per_turn: 100,
            observed_ms_per_turn: 2312.5,
            gap_multiplier: 23.125,
            status: 'over_target',
        });
        expect(report.dominant_bucket.bucket).toBe('simulation');
        expect(report.buckets.map((bucket) => bucket.bucket)).toEqual([
            'simulation',
            'serialization_artifacts',
            'setup',
            'diagnostics_reporting',
        ]);
        expect(report.buckets[0]).toEqual({
            bucket: 'simulation',
            ms: 80000,
            pct_total: 86.486,
            ms_per_turn: 2000,
            note: 'Turn pipeline work.',
        });
        expect(report.recommendation.next_step).toBe('profile_dominant_bucket');
        expect(report.determinism).toEqual({
            timing_sidecar_only: true,
            deterministic_artifacts_unchanged_by_construction: true,
            final_state_hash: 'abc123',
        });
    });

    it('formats markdown with required evidence table columns', () => {
        const report = buildWallClockTargetReport({
            timingPath: 'runs/sample/timing.json',
            timing: {
                schema_version: 1,
                run_id: 'run',
                scenario_id: 'noop_4w',
                weeks: 4,
                final_state_hash: 'hash',
                buckets_ms: {
                    setup: 4,
                    simulation: 20,
                    diagnostics_reporting: 8,
                    serialization_artifacts: 8,
                    total: 40,
                },
            },
            targetMsPerTurn: 15,
        });

        const markdown = formatWallClockTargetMarkdown(report);

        expect(markdown).toContain('| bucket | before ms | after ms | output hash/status | evidence path |');
        expect(markdown).toContain('| simulation | 20.000 | n/a | hash | runs/sample/timing.json |');
        expect(markdown).toContain('Dominant bucket: `simulation`');
        expect(markdown).not.toMatch(/timestamp/i);
        expect(markdown).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
});
