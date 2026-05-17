#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stableStringify } from '../../src/utils/stable_json.js';

export type WallClockBucketName =
    | 'setup'
    | 'simulation'
    | 'diagnostics_reporting'
    | 'serialization_artifacts';

export interface ScenarioTimingJson {
    schema_version: number;
    run_id: string;
    scenario_id: string;
    weeks: number;
    final_state_hash: string;
    buckets_ms: Record<WallClockBucketName | 'total', number>;
    notes?: Partial<Record<WallClockBucketName, string>>;
}

export interface WallClockTargetReportInput {
    timingPath: string;
    timing: ScenarioTimingJson;
    targetMsPerTurn?: number;
    benchmarkMode?: string;
    command?: string;
    machineLabel?: string;
    nodeVersion?: string;
    platform?: string;
    arch?: string;
}

export interface WallClockBucketReport {
    bucket: WallClockBucketName;
    ms: number;
    pct_total: number;
    ms_per_turn: number;
    note?: string;
}

export interface WallClockTargetReport {
    schema_version: 1;
    source_timing_path: string;
    benchmark_mode: string;
    command?: string;
    run: {
        run_id: string;
        scenario_id: string;
        weeks: number;
        final_state_hash: string;
        total_ms: number;
    };
    environment: {
        machine_label: string;
        node_version: string;
        platform: string;
        arch: string;
    };
    target: {
        target_ms_per_turn: number;
        observed_ms_per_turn: number;
        gap_multiplier: number;
        status: 'at_or_under_target' | 'over_target';
    };
    dominant_bucket: WallClockBucketReport;
    buckets: WallClockBucketReport[];
    recommendation: {
        next_step: 'profile_dominant_bucket' | 'target_met_recheck_mode';
        rationale: string;
    };
    determinism: {
        timing_sidecar_only: true;
        deterministic_artifacts_unchanged_by_construction: true;
        final_state_hash: string;
    };
}

const BUCKET_ORDER: WallClockBucketName[] = [
    'setup',
    'simulation',
    'diagnostics_reporting',
    'serialization_artifacts',
];

function round3(value: number): number {
    return Math.round(value * 1000) / 1000;
}

function finiteNumber(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new Error(`${name} must be a non-negative finite number`);
    }
    return value;
}

function validateTiming(timing: ScenarioTimingJson): void {
    if (timing.schema_version !== 1) {
        throw new Error(`unsupported timing schema_version: ${timing.schema_version}`);
    }
    if (!timing.run_id || !timing.scenario_id || !timing.final_state_hash) {
        throw new Error('timing JSON is missing run_id, scenario_id, or final_state_hash');
    }
    if (!Number.isInteger(timing.weeks) || timing.weeks <= 0) {
        throw new Error('timing weeks must be a positive integer');
    }
    finiteNumber(timing.buckets_ms?.total, 'buckets_ms.total');
    for (const bucket of BUCKET_ORDER) {
        finiteNumber(timing.buckets_ms?.[bucket], `buckets_ms.${bucket}`);
    }
}

export function buildWallClockTargetReport(input: WallClockTargetReportInput): WallClockTargetReport {
    validateTiming(input.timing);
    const targetMsPerTurn = input.targetMsPerTurn ?? 100;
    if (!Number.isFinite(targetMsPerTurn) || targetMsPerTurn <= 0) {
        throw new Error('targetMsPerTurn must be a positive finite number');
    }

    const totalMs = input.timing.buckets_ms.total;
    const observedMsPerTurn = totalMs / input.timing.weeks;
    const buckets = BUCKET_ORDER.map((bucket) => {
        const ms = input.timing.buckets_ms[bucket];
        const row: WallClockBucketReport = {
            bucket,
            ms: round3(ms),
            pct_total: round3(totalMs > 0 ? (ms / totalMs) * 100 : 0),
            ms_per_turn: round3(ms / input.timing.weeks),
        };
        const note = input.timing.notes?.[bucket];
        if (note) row.note = note;
        return row;
    }).sort((left, right) => {
        const delta = right.ms - left.ms;
        if (delta !== 0) return delta;
        return left.bucket < right.bucket ? -1 : left.bucket > right.bucket ? 1 : 0;
    });
    const dominantBucket = buckets[0];

    return {
        schema_version: 1,
        source_timing_path: input.timingPath,
        benchmark_mode: input.benchmarkMode ?? 'scenario_timing_json',
        ...(input.command ? { command: input.command } : {}),
        run: {
            run_id: input.timing.run_id,
            scenario_id: input.timing.scenario_id,
            weeks: input.timing.weeks,
            final_state_hash: input.timing.final_state_hash,
            total_ms: round3(totalMs),
        },
        environment: {
            machine_label: input.machineLabel ?? 'unspecified',
            node_version: input.nodeVersion ?? process.version,
            platform: input.platform ?? process.platform,
            arch: input.arch ?? process.arch,
        },
        target: {
            target_ms_per_turn: round3(targetMsPerTurn),
            observed_ms_per_turn: round3(observedMsPerTurn),
            gap_multiplier: round3(observedMsPerTurn / targetMsPerTurn),
            status: observedMsPerTurn <= targetMsPerTurn ? 'at_or_under_target' : 'over_target',
        },
        dominant_bucket: dominantBucket,
        buckets,
        recommendation: observedMsPerTurn <= targetMsPerTurn
            ? {
                  next_step: 'target_met_recheck_mode',
                  rationale: 'Observed per-turn wall clock is at or below the configured target; re-check that the benchmark mode matches the product target before closing.',
              }
            : {
                  next_step: 'profile_dominant_bucket',
                  rationale: `Profile the dominant '${dominantBucket.bucket}' bucket before attempting optimization.`,
              },
        determinism: {
            timing_sidecar_only: true,
            deterministic_artifacts_unchanged_by_construction: true,
            final_state_hash: input.timing.final_state_hash,
        },
    };
}

function formatMs(value: number): string {
    return value.toFixed(3);
}

export function formatWallClockTargetMarkdown(report: WallClockTargetReport): string {
    const lines = [
        '# Wall Clock Target Truth Report',
        '',
        `Scenario: \`${report.run.scenario_id}\``,
        `Run ID: \`${report.run.run_id}\``,
        `Benchmark mode: \`${report.benchmark_mode}\``,
        ...(report.command ? [`Command: \`${report.command}\``] : []),
        `Node: \`${report.environment.node_version}\` on \`${report.environment.platform} ${report.environment.arch}\``,
        `Machine label: \`${report.environment.machine_label}\``,
        '',
        `Observed: ${formatMs(report.target.observed_ms_per_turn)} ms/turn`,
        `Target: ${formatMs(report.target.target_ms_per_turn)} ms/turn`,
        `Gap: ${formatMs(report.target.gap_multiplier)}x (${report.target.status})`,
        `Dominant bucket: \`${report.dominant_bucket.bucket}\``,
        '',
        '| bucket | before ms | after ms | output hash/status | evidence path |',
        '|---|---:|---:|---|---|',
        ...report.buckets.map((bucket) =>
            `| ${bucket.bucket} | ${formatMs(bucket.ms)} | n/a | ${report.run.final_state_hash} | ${report.source_timing_path} |`,
        ),
        '',
        '| bucket | pct total | ms/turn | note |',
        '|---|---:|---:|---|',
        ...report.buckets.map((bucket) =>
            `| ${bucket.bucket} | ${formatMs(bucket.pct_total)} | ${formatMs(bucket.ms_per_turn)} | ${bucket.note ?? ''} |`,
        ),
        '',
        `Next step: \`${report.recommendation.next_step}\` - ${report.recommendation.rationale}`,
        '',
        'Determinism: timing remains a sidecar report and is not written into deterministic saves or scenario artifacts.',
        '',
    ];
    return lines.join('\n');
}

interface CliArgs {
    timingPath: string;
    jsonOut?: string;
    markdownOut?: string;
    targetMsPerTurn?: number;
    benchmarkMode?: string;
    command?: string;
    machineLabel?: string;
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = { timingPath: '' };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if ((arg === '--timing' || arg === '--timing-json') && argv[i + 1]) {
            args.timingPath = argv[++i];
        } else if (arg === '--json-out' && argv[i + 1]) {
            args.jsonOut = argv[++i];
        } else if (arg === '--markdown-out' && argv[i + 1]) {
            args.markdownOut = argv[++i];
        } else if (arg === '--target-ms-per-turn' && argv[i + 1]) {
            args.targetMsPerTurn = Number.parseFloat(argv[++i]);
        } else if (arg === '--benchmark-mode' && argv[i + 1]) {
            args.benchmarkMode = argv[++i];
        } else if (arg === '--command' && argv[i + 1]) {
            args.command = argv[++i];
        } else if (arg === '--machine-label' && argv[i + 1]) {
            args.machineLabel = argv[++i];
        } else if (!args.timingPath) {
            args.timingPath = arg;
        }
    }
    if (!args.timingPath) {
        throw new Error('usage: wall_clock_target_report --timing PATH [--json-out PATH] [--markdown-out PATH] [--target-ms-per-turn N]');
    }
    return args;
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    const timingPath = resolve(args.timingPath);
    const timing = JSON.parse(readFileSync(timingPath, 'utf8')) as ScenarioTimingJson;
    const report = buildWallClockTargetReport({
        timingPath: args.timingPath,
        timing,
        targetMsPerTurn: args.targetMsPerTurn,
        benchmarkMode: args.benchmarkMode,
        command: args.command,
        machineLabel: args.machineLabel,
    });

    if (args.jsonOut) {
        writeFileSync(resolve(args.jsonOut), `${stableStringify(report, 2)}\n`, 'utf8');
    }
    const markdown = formatWallClockTargetMarkdown(report);
    if (args.markdownOut) {
        writeFileSync(resolve(args.markdownOut), markdown, 'utf8');
    }
    if (!args.jsonOut && !args.markdownOut) {
        process.stdout.write(markdown);
    }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
    main().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`wall_clock_target_report failed: ${message}\n`);
        process.exitCode = 1;
    });
}
