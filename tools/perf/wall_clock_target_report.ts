#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
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

export interface PerformanceTimingEvidence {
    path: string;
    timing: ScenarioTimingJson;
}

export interface PerformanceProfileEvidence {
    path: string;
    scenario: string;
    totalWallMs: number;
    phaseBoundarySampledPeakHeapMB: number;
    phaseTotals: Array<{ name: string; totalMs: number; count: number }>;
}

export interface PerformanceSectorEvidence {
    path: string;
    invocations: number;
    totalMs: number;
    topSubFunctions: Array<{ label: string; totalMs: number; count: number }>;
}

export interface PerformanceWallClockReportInput {
    warmup: PerformanceTimingEvidence;
    measured: PerformanceTimingEvidence[];
    profile: PerformanceProfileEvidence;
    sectorPartition?: PerformanceSectorEvidence;
    v8InclusiveOwners: Array<{ function_name: string; location: string; total_ms: number }>;
    scenarioBytes: PerformanceScenarioBytesEvidence[];
    targetMsPerTurn?: number;
    machine: {
        label: string;
        node_version: string;
        platform: string;
        arch: string;
        cpu: string;
    };
}

export interface PerformanceScenarioBytesEvidence {
    mode: string;
    path: string;
    bytes: number;
    sha256: string;
}

interface PerformanceStatistic {
    mean: number;
    p50: number;
    p95: number;
    samples: number[];
}

interface PerformanceOwnerTotal {
    total_ms: number;
    source_steps: string[];
}

export interface PerformanceWallClockReport {
    schema_version: 1;
    generated_by: 'tools/perf/wall_clock_target_report.ts';
    machine: PerformanceWallClockReportInput['machine'];
    evidence: {
        warmup: string;
        measured: string[];
        profile: string;
        sector_partition?: string;
    };
    statistics: {
        measured_run_count: 3;
        warmup_excluded: true;
        total_ms: PerformanceStatistic;
        ms_per_turn: PerformanceStatistic;
    };
    target: {
        target_ms_per_turn: number;
        mean_gap_multiplier: number;
        status: 'at_or_under_target' | 'over_target';
    };
    owners: {
        graph_load: PerformanceOwnerTotal;
        combat: PerformanceOwnerTotal;
        bot_orders: PerformanceOwnerTotal;
        serialization: { mean_ms: number; source: 'measured timing serialization_artifacts bucket' };
        sector_partition: {
            invocations: number;
            total_ms: number;
            top_sub_functions: Array<{ label: string; total_ms: number; count: number }>;
        };
        v8_inclusive: Array<{ function_name: string; location: string; total_ms: number }>;
    };
    phase_boundary_sampled_peak_heap_mb: number;
    determinism: {
        final_state_hash: string;
        measured_hashes_identical: true;
        profiling_flags_byte_identical: true;
        scenario_bytes: {
            bytes: number;
            sha256: string;
            evidence: PerformanceScenarioBytesEvidence[];
        };
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

function strictCompare(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function statistic(values: number[]): PerformanceStatistic {
    const samples = values.map(round3).sort((left, right) => left - right);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const nearestRank = (percentile: number): number =>
        samples[Math.max(0, Math.ceil(percentile * samples.length) - 1)];
    return {
        mean: round3(mean),
        p50: nearestRank(0.5),
        p95: nearestRank(0.95),
        samples,
    };
}

function ownerTotal(
    phaseTotals: PerformanceProfileEvidence['phaseTotals'],
    predicate: (name: string) => boolean,
): PerformanceOwnerTotal {
    const rows = phaseTotals.filter((row) => predicate(row.name));
    return {
        total_ms: round3(rows.reduce((sum, row) => sum + row.totalMs, 0)),
        source_steps: rows.map((row) => row.name).sort(strictCompare),
    };
}

function assertRelativeEvidencePath(path: string): void {
    if (/^[A-Za-z]:[\\/]|^[\\/]/.test(path)) {
        throw new Error(`performance evidence path must be repo-relative: ${path}`);
    }
}

const REQUIRED_SCENARIO_BYTE_MODES = [
    'measured_1',
    'measured_2',
    'measured_3',
    'sector_phase_profile',
    'v8_cpu_profile',
    'warmup',
] as const;

export function hashScenarioBytesEvidence(
    paths: Array<{ mode: string; path: string }>,
    rootDir = process.cwd(),
): PerformanceScenarioBytesEvidence[] {
    return paths.map(({ mode, path }) => {
        assertRelativeEvidencePath(path);
        const absolutePath = resolve(rootDir, path);
        const bytes = statSync(absolutePath).size;
        const sha256 = createHash('sha256').update(readFileSync(absolutePath)).digest('hex');
        return { mode, path, bytes, sha256 };
    }).sort((left, right) => strictCompare(left.mode, right.mode));
}

export function buildPerformanceWallClockReport(
    input: PerformanceWallClockReportInput,
): PerformanceWallClockReport {
    if (input.measured.length !== 3) {
        throw new Error('performance report requires exactly three measured runs after one warmup');
    }
    const allTiming = [input.warmup, ...input.measured];
    for (const evidence of allTiming) {
        validateTiming(evidence.timing);
        assertRelativeEvidencePath(evidence.path);
        if (evidence.timing.weeks !== 40) {
            throw new Error('performance report requires exactly 40 turns in every run');
        }
    }
    assertRelativeEvidencePath(input.profile.path);
    if (input.sectorPartition) assertRelativeEvidencePath(input.sectorPartition.path);
    if (!Number.isFinite(input.profile.phaseBoundarySampledPeakHeapMB)
        || input.profile.phaseBoundarySampledPeakHeapMB < 0) {
        throw new Error('profile.phaseBoundarySampledPeakHeapMB must be a non-negative finite number');
    }
    const targetMsPerTurn = input.targetMsPerTurn ?? 100;
    if (!Number.isFinite(targetMsPerTurn) || targetMsPerTurn <= 0) {
        throw new Error('targetMsPerTurn must be a positive finite number');
    }

    const hashes = new Set(allTiming.map((evidence) => evidence.timing.final_state_hash));
    if (hashes.size !== 1) {
        throw new Error('scenario bytes differ across warmup/measured performance runs');
    }
    const scenarioBytes = input.scenarioBytes.slice().sort((left, right) => strictCompare(left.mode, right.mode));
    const modes = scenarioBytes.map((row) => row.mode);
    if (modes.length !== REQUIRED_SCENARIO_BYTE_MODES.length
        || modes.some((mode, index) => mode !== REQUIRED_SCENARIO_BYTE_MODES[index])) {
        throw new Error(`scenario byte evidence requires modes: ${REQUIRED_SCENARIO_BYTE_MODES.join(', ')}`);
    }
    for (const row of scenarioBytes) {
        assertRelativeEvidencePath(row.path);
        if (!Number.isInteger(row.bytes) || row.bytes <= 0 || !row.sha256) {
            throw new Error(`invalid scenario byte evidence: ${row.mode}`);
        }
    }
    if (new Set(scenarioBytes.map((row) => `${row.bytes}:${row.sha256}`)).size !== 1) {
        throw new Error('profiling changed final-save bytes');
    }
    const scenarioByteTruth = scenarioBytes[0];
    if (!scenarioByteTruth.sha256.startsWith(allTiming[0].timing.final_state_hash)) {
        throw new Error('timing final_state_hash does not match final-save SHA-256');
    }

    const totals = input.measured.map((evidence) => evidence.timing.buckets_ms.total);
    const perTurn = input.measured.map((evidence) =>
        evidence.timing.buckets_ms.total / evidence.timing.weeks,
    );
    const serializationMean = input.measured.reduce(
        (sum, evidence) => sum + evidence.timing.buckets_ms.serialization_artifacts,
        0,
    ) / input.measured.length;
    const phaseTotals = input.profile.phaseTotals;
    const sector = input.sectorPartition;
    const totalStatistic = statistic(totals);
    const perTurnStatistic = statistic(perTurn);

    return {
        schema_version: 1,
        generated_by: 'tools/perf/wall_clock_target_report.ts',
        machine: input.machine,
        evidence: {
            warmup: input.warmup.path,
            measured: input.measured.map((run) => run.path),
            profile: input.profile.path,
            ...(sector ? { sector_partition: sector.path } : {}),
        },
        statistics: {
            measured_run_count: 3,
            warmup_excluded: true,
            total_ms: totalStatistic,
            ms_per_turn: perTurnStatistic,
        },
        target: {
            target_ms_per_turn: round3(targetMsPerTurn),
            mean_gap_multiplier: round3(perTurnStatistic.mean / targetMsPerTurn),
            status: perTurnStatistic.mean <= targetMsPerTurn ? 'at_or_under_target' : 'over_target',
        },
        owners: {
            graph_load: ownerTotal(phaseTotals, (name) => name === 'load-operational-data' || /graph-load/i.test(name)),
            combat: ownerTotal(phaseTotals, (name) => /combat|attack|offensive/i.test(name)),
            bot_orders: ownerTotal(phaseTotals, (name) => /(?:^ai-|bot|commander.*order)/i.test(name)),
            serialization: {
                mean_ms: round3(serializationMean),
                source: 'measured timing serialization_artifacts bucket',
            },
            sector_partition: {
                invocations: sector?.invocations ?? 0,
                total_ms: round3(sector?.totalMs ?? 0),
                top_sub_functions: (sector?.topSubFunctions ?? [])
                    .map((row) => ({ label: row.label, total_ms: round3(row.totalMs), count: row.count }))
                    .sort((left, right) => right.total_ms - left.total_ms || strictCompare(left.label, right.label)),
            },
            v8_inclusive: input.v8InclusiveOwners
                .map((row) => ({ ...row, total_ms: round3(row.total_ms) }))
                .sort((left, right) => right.total_ms - left.total_ms || strictCompare(left.location, right.location)),
        },
        phase_boundary_sampled_peak_heap_mb: round3(input.profile.phaseBoundarySampledPeakHeapMB),
        determinism: {
            final_state_hash: allTiming[0].timing.final_state_hash,
            measured_hashes_identical: true,
            profiling_flags_byte_identical: true,
            scenario_bytes: {
                bytes: scenarioByteTruth.bytes,
                sha256: scenarioByteTruth.sha256,
                evidence: scenarioBytes,
            },
        },
    };
}

export function formatPerformanceWallClockMarkdown(report: PerformanceWallClockReport): string {
    const ownerRows: Array<[string, number, string]> = [
        ['graph_load', report.owners.graph_load.total_ms, report.owners.graph_load.source_steps.join(', ')],
        ['combat', report.owners.combat.total_ms, report.owners.combat.source_steps.join(', ')],
        ['bot_orders', report.owners.bot_orders.total_ms, report.owners.bot_orders.source_steps.join(', ')],
        ['serialization', report.owners.serialization.mean_ms, report.owners.serialization.source],
        ['sector_partition', report.owners.sector_partition.total_ms, report.evidence.sector_partition ?? 'not captured'],
    ];
    return [
        '# Phase 0 Performance Wall-Clock Report',
        '',
        `Machine: \`${report.machine.label}\` (${report.machine.cpu}; ${report.machine.node_version}; ${report.machine.platform} ${report.machine.arch})`,
        `Mean: ${report.statistics.ms_per_turn.mean.toFixed(3)} ms/turn`,
        `P50: ${report.statistics.ms_per_turn.p50.toFixed(3)} ms/turn`,
        `P95: ${report.statistics.ms_per_turn.p95.toFixed(3)} ms/turn`,
        `Target: ${report.target.target_ms_per_turn.toFixed(3)} ms/turn (${report.target.status}, ${report.target.mean_gap_multiplier.toFixed(3)}x)`,
        `Phase-boundary sampled peak heap: ${report.phase_boundary_sampled_peak_heap_mb.toFixed(3)} MB`,
        '',
        '| owner | total/mean ms | source |',
        '|---|---:|---|',
        ...ownerRows.map(([owner, ms, source]) => `| ${owner} | ${ms.toFixed(3)} | ${source} |`),
        '',
        '## Top sector sub-functions',
        '',
        '| sub-function | total ms | calls |',
        '|---|---:|---:|',
        ...report.owners.sector_partition.top_sub_functions.slice(0, 12).map((row) =>
            `| ${row.label} | ${row.total_ms.toFixed(3)} | ${row.count} |`,
        ),
        '',
        '## Top V8 inclusive owners',
        '',
        '| function | total ms | location |',
        '|---|---:|---|',
        ...report.owners.v8_inclusive.slice(0, 12).map((row) =>
            `| ${row.function_name || '(anonymous)'} | ${row.total_ms.toFixed(3)} | ${row.location} |`,
        ),
        '',
        `Final state hash: \`${report.determinism.final_state_hash}\``,
        `Final-save SHA-256: \`${report.determinism.scenario_bytes.sha256}\` (${report.determinism.scenario_bytes.bytes} bytes)`,
        'Profiling flags byte-identical: yes',
        '',
    ].join('\n');
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
    performanceManifest?: string;
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
        } else if (arg === '--performance-manifest' && argv[i + 1]) {
            args.performanceManifest = argv[++i];
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
    if (!args.timingPath && !args.performanceManifest) {
        throw new Error('usage: wall_clock_target_report (--timing PATH | --performance-manifest PATH) [--json-out PATH] [--markdown-out PATH]');
    }
    return args;
}

interface PerformanceReportManifest {
    warmup_timing: string;
    measured_timing: [string, string, string];
    profile: string;
    sector_report?: string;
    v8_summary: string;
    final_saves: Array<{ mode: string; path: string }>;
    target_ms_per_turn?: number;
    machine: PerformanceWallClockReportInput['machine'];
}

interface HotspotReportJson {
    sector_partition: {
        source_path: string;
        invocations: number;
        total_ms: number;
        top_sub_functions: Array<{ label: string; total_ms: number; count: number }>;
    };
}

interface V8SummaryJson {
    topTotal: Array<{
        functionName: string;
        location: string;
        totalMs: number;
    }>;
}

function readJson<T>(path: string): T {
    return JSON.parse(readFileSync(resolve(path), 'utf8')) as T;
}

function buildPerformanceReportFromManifest(path: string): PerformanceWallClockReport {
    const manifest = readJson<PerformanceReportManifest>(path);
    if (!Array.isArray(manifest.measured_timing) || manifest.measured_timing.length !== 3) {
        throw new Error('performance manifest requires exactly three measured_timing paths');
    }
    const profile = readJson<PerformanceProfileEvidence>(manifest.profile);
    const hotspot = manifest.sector_report
        ? readJson<HotspotReportJson>(manifest.sector_report).sector_partition
        : undefined;
    const v8 = readJson<V8SummaryJson>(manifest.v8_summary);
    return buildPerformanceWallClockReport({
        warmup: { path: manifest.warmup_timing, timing: readJson<ScenarioTimingJson>(manifest.warmup_timing) },
        measured: manifest.measured_timing.map((timingPath) => ({
            path: timingPath,
            timing: readJson<ScenarioTimingJson>(timingPath),
        })),
        profile: { ...profile, path: manifest.profile },
        ...(hotspot ? {
            sectorPartition: {
                path: hotspot.source_path,
                invocations: hotspot.invocations,
                totalMs: hotspot.total_ms,
                topSubFunctions: hotspot.top_sub_functions.map((row) => ({
                    label: row.label,
                    totalMs: row.total_ms,
                    count: row.count,
                })),
            },
        } : {}),
        v8InclusiveOwners: v8.topTotal.slice(0, 20).map((row) => ({
            function_name: row.functionName,
            location: row.location,
            total_ms: row.totalMs,
        })),
        scenarioBytes: hashScenarioBytesEvidence(manifest.final_saves),
        targetMsPerTurn: manifest.target_ms_per_turn,
        machine: manifest.machine,
    });
}

function emitReport(args: CliArgs, report: unknown, markdown: string): void {
    if (args.jsonOut) writeFileSync(resolve(args.jsonOut), `${stableStringify(report, 2)}\n`, 'utf8');
    if (args.markdownOut) writeFileSync(resolve(args.markdownOut), markdown, 'utf8');
    if (!args.jsonOut && !args.markdownOut) process.stdout.write(markdown);
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    if (args.performanceManifest) {
        const report = buildPerformanceReportFromManifest(args.performanceManifest);
        emitReport(args, report, formatPerformanceWallClockMarkdown(report));
        return;
    }
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

    emitReport(args, report, formatWallClockTargetMarkdown(report));
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
    main().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`wall_clock_target_report failed: ${message}\n`);
        process.exitCode = 1;
    });
}
