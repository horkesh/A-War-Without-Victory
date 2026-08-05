import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
    buildPerformanceWallClockReport,
    formatPerformanceWallClockMarkdown,
    hashScenarioBytesEvidence,
    type ScenarioTimingJson,
} from '../tools/perf/wall_clock_target_report.js';

const TMP_ROOT = join(process.cwd(), '.tmp_performance_wall_clock_report');

afterEach(() => rmSync(TMP_ROOT, { recursive: true, force: true }));

function scenarioBytes(sha256 = 'samehash-fullsha'): Array<{ mode: string; path: string; bytes: number; sha256: string }> {
    return [
        'measured_1',
        'measured_2',
        'measured_3',
        'sector_phase_profile',
        'v8_cpu_profile',
        'warmup',
    ].map((mode) => ({ mode, path: `runs_perf/${mode}/final_save.json`, bytes: 42, sha256 }));
}

function timing(total: number, serialization: number): ScenarioTimingJson {
    return {
        schema_version: 1,
        run_id: `run-${total}`,
        scenario_id: 'apr1992_definitive_40w',
        weeks: 40,
        final_state_hash: 'samehash',
        buckets_ms: {
            setup: 400,
            simulation: total - 400 - serialization - 100,
            diagnostics_reporting: 100,
            serialization_artifacts: serialization,
            total,
        },
    };
}

describe('Phase 0 performance wall-clock report', () => {
    it('aggregates one warmup plus three measured 40-turn runs and named owners', () => {
        const report = buildPerformanceWallClockReport({
            warmup: { path: 'runs_perf/r5_phase0_warmup/timing.json', timing: timing(4500, 250) },
            measured: [
                { path: 'runs_perf/r5_phase0_m1/timing.json', timing: timing(3600, 200) },
                { path: 'runs_perf/r5_phase0_m2/timing.json', timing: timing(4000, 240) },
                { path: 'runs_perf/r5_phase0_m3/timing.json', timing: timing(4400, 280) },
            ],
            profile: {
                path: 'data/derived/_debug/r5_phase0_profile.json',
                scenario: 'data/scenarios/apr1992_definitive_40w.json',
                totalWallMs: 4800,
                phaseBoundarySampledPeakHeapMB: 512,
                phaseTotals: [
                    { name: 'advance-sector-offensives', totalMs: 400, count: 40 },
                    { name: 'generate-bot-brigade-orders', totalMs: 50, count: 40 },
                    { name: 'generate-bot-corps-orders', totalMs: 100, count: 40 },
                    { name: 'load-operational-data', totalMs: 80, count: 40 },
                    { name: 'partition-corps-front-sectors', totalMs: 300, count: 40 },
                    { name: 'resolve-attack-orders', totalMs: 200, count: 40 },
                ],
            },
            sectorPartition: {
                path: 'data/derived/_debug/r5_phase0_sector.jsonl',
                invocations: 40,
                totalMs: 300,
                topSubFunctions: [
                    { label: 'recover-dropped-edges', totalMs: 100, count: 40 },
                    { label: 'build-faction-sectors', totalMs: 180, count: 40 },
                ],
            },
            v8InclusiveOwners: [
                { function_name: 'buildCorpsFrontSectors', location: 'src/sim/combat/corps_front_sectors.ts:1:1', total_ms: 700 },
                { function_name: 'runTurn', location: 'src/sim/turn_pipeline.ts:1:1', total_ms: 1200 },
            ],
            scenarioBytes: scenarioBytes(),
            machine: {
                label: 'local-reference',
                node_version: 'v24.0.0',
                platform: 'win32',
                arch: 'x64',
                cpu: 'fixture cpu',
            },
        });

        expect(report.statistics).toEqual({
            measured_run_count: 3,
            warmup_excluded: true,
            total_ms: { mean: 4000, p50: 4000, p95: 4400, samples: [3600, 4000, 4400] },
            ms_per_turn: { mean: 100, p50: 100, p95: 110, samples: [90, 100, 110] },
        });
        expect(report.target).toEqual({
            target_ms_per_turn: 100,
            mean_gap_multiplier: 1,
            status: 'at_or_under_target',
        });
        expect(report.owners.graph_load).toEqual({ total_ms: 80, source_steps: ['load-operational-data'] });
        expect(report.owners.combat).toEqual({
            total_ms: 600,
            source_steps: ['advance-sector-offensives', 'resolve-attack-orders'],
        });
        expect(report.owners.bot_orders).toEqual({
            total_ms: 150,
            source_steps: ['generate-bot-brigade-orders', 'generate-bot-corps-orders'],
        });
        expect(report.owners.serialization).toEqual({ mean_ms: 240, source: 'measured timing serialization_artifacts bucket' });
        expect(report.owners.sector_partition.top_sub_functions.map((row) => row.label)).toEqual([
            'build-faction-sectors',
            'recover-dropped-edges',
        ]);
        expect(report.owners.v8_inclusive.map((row) => row.function_name)).toEqual([
            'runTurn',
            'buildCorpsFrontSectors',
        ]);
        expect(report.phase_boundary_sampled_peak_heap_mb).toBe(512);
        expect(report.determinism).toEqual({
            final_state_hash: 'samehash',
            measured_hashes_identical: true,
            profiling_flags_byte_identical: true,
            scenario_bytes: {
                bytes: 42,
                sha256: 'samehash-fullsha',
                evidence: scenarioBytes(),
            },
        });

        const markdown = formatPerformanceWallClockMarkdown(report);
        expect(markdown).toContain('Mean: 100.000 ms/turn');
        expect(markdown).toContain('Target: 100.000 ms/turn (at_or_under_target, 1.000x)');
        expect(markdown).toContain('| graph_load | 80.000 | load-operational-data |');
        expect(markdown).not.toMatch(/timestamp|generated_at/i);
        expect(markdown).not.toMatch(/[A-Za-z]:\\/);
    });

    it('fails closed on a non-40-turn run, wrong measured count, or hash drift', () => {
        const base = {
            warmup: { path: 'warmup/timing.json', timing: timing(4500, 250) },
            measured: [
                { path: 'm1/timing.json', timing: timing(3600, 200) },
                { path: 'm2/timing.json', timing: timing(4000, 240) },
                { path: 'm3/timing.json', timing: timing(4400, 280) },
            ],
            profile: {
                path: 'profile.json',
                scenario: 'data/scenarios/apr1992_definitive_40w.json',
                totalWallMs: 4800,
                phaseBoundarySampledPeakHeapMB: 512,
                phaseTotals: [],
            },
            v8InclusiveOwners: [],
            scenarioBytes: scenarioBytes(),
            machine: {
                label: 'local-reference', node_version: 'v24', platform: 'win32', arch: 'x64', cpu: 'cpu',
            },
        };

        expect(() => buildPerformanceWallClockReport({ ...base, measured: base.measured.slice(0, 2) }))
            .toThrow('exactly three measured runs');
        expect(() => buildPerformanceWallClockReport({
            ...base,
            measured: base.measured.map((run, index) => index === 2
                ? { ...run, timing: { ...run.timing, final_state_hash: 'drift' } }
                : run),
        })).toThrow('scenario bytes differ');
        expect(() => buildPerformanceWallClockReport({
            ...base,
            measured: base.measured.map((run, index) => index === 0
                ? { ...run, timing: { ...run.timing, weeks: 39 } }
                : run),
        })).toThrow('exactly 40 turns');
        expect(() => buildPerformanceWallClockReport({
            ...base,
            scenarioBytes: scenarioBytes().map((row, index) => index === 5 ? { ...row, sha256: 'drift' } : row),
        })).toThrow('profiling changed final-save bytes');
    });

    it('calculates final-save SHA-256 and size from explicit repo-relative paths', () => {
        mkdirSync(join(TMP_ROOT, 'warmup'), { recursive: true });
        writeFileSync(join(TMP_ROOT, 'warmup', 'final_save.json'), '{"same":true}\n', 'utf8');

        const evidence = hashScenarioBytesEvidence(
            [{ mode: 'warmup', path: 'warmup/final_save.json' }],
            TMP_ROOT,
        );

        expect(evidence).toEqual([{
            mode: 'warmup',
            path: 'warmup/final_save.json',
            bytes: 14,
            sha256: 'ab61316b3fbf3c7c282ce4975861a36183f474374ace409d5938a032266c0be6',
        }]);
    });
});
