#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stableStringify } from '../../src/utils/stable_json.js';

export interface ProfileStepTotal {
    name: string;
    totalMs: number;
    count: number;
}

export interface ScenarioProfileJson {
    scenario: string;
    totalWallMs: number;
    totalWallS?: number;
    phaseTotals: ProfileStepTotal[];
}

export interface SectorPartitionSubFunctionInput {
    label: string;
    totalMs: number;
    count: number;
}

export interface SectorPartitionSummaryInput {
    path: string;
    invocations: number;
    totalMs: number;
    topSubFunctions: SectorPartitionSubFunctionInput[];
}

export interface ProfileHotspotReportInput {
    profilePath: string;
    profile: ScenarioProfileJson;
    finalStateHash: string;
    riskNotes?: Record<string, string>;
    sectorPartition?: SectorPartitionSummaryInput;
    topLimit?: number;
}

export interface ProfileHotspotStepReport {
    name: string;
    total_ms: number;
    pct_total: number;
    ms_per_call: number;
    count: number;
    risk_note?: string;
}

export interface SectorPartitionSubFunctionReport {
    label: string;
    total_ms: number;
    pct_sector_partition: number;
    count: number;
}

export interface ProfileHotspotReport {
    schema_version: 1;
    source_profile_path: string;
    scenario: string;
    total_wall_ms: number;
    top_steps: ProfileHotspotStepReport[];
    sector_partition?: {
        source_path: string;
        invocations: number;
        total_ms: number;
        top_sub_functions: SectorPartitionSubFunctionReport[];
    };
    optimization_decision: {
        status: 'profile_supports_candidate' | 'truth_report_only';
        rationale: string;
    };
    determinism: {
        timing_sidecar_only: true;
        deterministic_artifacts_unchanged_by_construction: true;
        final_state_hash: string;
    };
}

function round3(value: number): number {
    return Math.round(value * 1000) / 1000;
}

function assertNonNegativeFinite(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new Error(`${field} must be a non-negative finite number`);
    }
    return value;
}

function assertPositiveInteger(value: unknown, field: string): number {
    if (!Number.isInteger(value) || (value as number) <= 0) {
        throw new Error(`${field} must be a positive integer`);
    }
    return value as number;
}

function validateProfile(profile: ScenarioProfileJson): void {
    if (!profile.scenario) throw new Error('profile scenario is required');
    assertNonNegativeFinite(profile.totalWallMs, 'profile.totalWallMs');
    if (!Array.isArray(profile.phaseTotals)) throw new Error('profile.phaseTotals must be an array');
    for (const [index, step] of profile.phaseTotals.entries()) {
        if (!step?.name) throw new Error(`profile.phaseTotals[${index}].name is required`);
        assertNonNegativeFinite(step.totalMs, `profile.phaseTotals[${index}].totalMs`);
        assertPositiveInteger(step.count, `profile.phaseTotals[${index}].count`);
    }
}

function buildStepRows(input: ProfileHotspotReportInput): ProfileHotspotStepReport[] {
    const totalWallMs = input.profile.totalWallMs;
    const riskNotes = input.riskNotes ?? {};
    return input.profile.phaseTotals
        .map((step) => {
            const row: ProfileHotspotStepReport = {
                name: step.name,
                total_ms: round3(step.totalMs),
                pct_total: round3(totalWallMs > 0 ? (step.totalMs / totalWallMs) * 100 : 0),
                ms_per_call: round3(step.totalMs / step.count),
                count: step.count,
            };
            const riskNote = riskNotes[step.name];
            if (riskNote) row.risk_note = riskNote;
            return row;
        })
        .sort((left, right) => {
            const delta = right.total_ms - left.total_ms;
            if (delta !== 0) return delta;
            return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
        })
        .slice(0, input.topLimit ?? 12);
}

function buildSectorPartition(input: SectorPartitionSummaryInput): ProfileHotspotReport['sector_partition'] {
    assertNonNegativeFinite(input.totalMs, 'sectorPartition.totalMs');
    assertPositiveInteger(input.invocations, 'sectorPartition.invocations');
    const topSubFunctions = input.topSubFunctions
        .map((row) => {
            if (!row.label) throw new Error('sectorPartition topSubFunctions label is required');
            assertNonNegativeFinite(row.totalMs, `sectorPartition.${row.label}.totalMs`);
            assertPositiveInteger(row.count, `sectorPartition.${row.label}.count`);
            return {
                label: row.label,
                total_ms: round3(row.totalMs),
                pct_sector_partition: round3(input.totalMs > 0 ? (row.totalMs / input.totalMs) * 100 : 0),
                count: row.count,
            };
        })
        .sort((left, right) => {
            const delta = right.total_ms - left.total_ms;
            if (delta !== 0) return delta;
            return left.label < right.label ? -1 : left.label > right.label ? 1 : 0;
        });

    return {
        source_path: input.path,
        invocations: input.invocations,
        total_ms: round3(input.totalMs),
        top_sub_functions: topSubFunctions,
    };
}

export function buildProfileHotspotReport(input: ProfileHotspotReportInput): ProfileHotspotReport {
    validateProfile(input.profile);
    if (!input.finalStateHash) throw new Error('finalStateHash is required');

    const topSteps = buildStepRows(input);
    const dominant = topSteps[0];
    const dominantRisk = dominant?.risk_note;
    const decision = dominantRisk
        ? {
              status: 'truth_report_only' as const,
              rationale: 'Dominant profiled target has declared behavior/determinism risk; do not optimize without a narrower follow-up plan.',
          }
        : {
              status: 'profile_supports_candidate' as const,
              rationale: 'Profile identifies a dominant target and no risk note was declared by the caller.',
          };

    return {
        schema_version: 1,
        source_profile_path: input.profilePath,
        scenario: input.profile.scenario,
        total_wall_ms: round3(input.profile.totalWallMs),
        top_steps: topSteps,
        ...(input.sectorPartition ? { sector_partition: buildSectorPartition(input.sectorPartition) } : {}),
        optimization_decision: decision,
        determinism: {
            timing_sidecar_only: true,
            deterministic_artifacts_unchanged_by_construction: true,
            final_state_hash: input.finalStateHash,
        },
    };
}

function formatMs(value: number): string {
    return value.toFixed(3);
}

export function formatProfileHotspotMarkdown(report: ProfileHotspotReport): string {
    const lines = [
        '# Profile Hotspot Report',
        '',
        `Scenario: \`${report.scenario}\``,
        `Profile: \`${report.source_profile_path}\``,
        `Total wall: ${formatMs(report.total_wall_ms)} ms`,
        `Final state hash: \`${report.determinism.final_state_hash}\``,
        '',
        '| step | total ms | pct total | ms/call | count | risk note |',
        '|---|---:|---:|---:|---:|---|',
        ...report.top_steps.map((step) =>
            `| ${step.name} | ${formatMs(step.total_ms)} | ${formatMs(step.pct_total)} | ${formatMs(step.ms_per_call)} | ${step.count} | ${step.risk_note ?? ''} |`,
        ),
        '',
    ];

    if (report.sector_partition) {
        lines.push(
            `Sector partition profile: \`${report.sector_partition.source_path}\` (${report.sector_partition.invocations} invocations, ${formatMs(report.sector_partition.total_ms)} ms)`,
            '',
            '| sector sub-function | total ms | pct sector partition | count |',
            '|---|---:|---:|---:|',
            ...report.sector_partition.top_sub_functions.map((row) =>
                `| ${row.label} | ${formatMs(row.total_ms)} | ${formatMs(row.pct_sector_partition)} | ${row.count} |`,
            ),
            '',
        );
    }

    lines.push(
        `Optimization decision: \`${report.optimization_decision.status}\` - ${report.optimization_decision.rationale}`,
        '',
        'Determinism: profile data remains a sidecar and is not written into deterministic saves or scenario artifacts.',
        '',
    );
    return lines.join('\n');
}

interface SectorPartitionJsonlRow {
    total_ns: string;
    sub_functions?: Array<{ label: string; total_ns: string; count: number }>;
}

export function summarizeSectorPartitionJsonl(path: string, topLimit: number = 12): SectorPartitionSummaryInput {
    const rows = readFileSync(resolve(path), 'utf8')
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as SectorPartitionJsonlRow);
    if (rows.length === 0) throw new Error('sector partition JSONL has no rows');

    let totalNs = 0n;
    const byLabel = new Map<string, { ns: bigint; count: number }>();
    for (const row of rows) {
        totalNs += BigInt(row.total_ns);
        for (const sub of row.sub_functions ?? []) {
            const cur = byLabel.get(sub.label) ?? { ns: 0n, count: 0 };
            cur.ns += BigInt(sub.total_ns);
            cur.count += sub.count;
            byLabel.set(sub.label, cur);
        }
    }

    const topSubFunctions = Array.from(byLabel.entries())
        .map(([label, value]) => ({
            label,
            totalMs: Number(value.ns) / 1e6,
            count: value.count,
        }))
        .sort((left, right) => {
            const delta = right.totalMs - left.totalMs;
            if (delta !== 0) return delta;
            return left.label < right.label ? -1 : left.label > right.label ? 1 : 0;
        })
        .slice(0, topLimit);

    return {
        path,
        invocations: rows.length,
        totalMs: Number(totalNs) / 1e6,
        topSubFunctions,
    };
}

interface CliArgs {
    profilePath: string;
    finalStateHash: string;
    sectorPartitionPath?: string;
    jsonOut?: string;
    markdownOut?: string;
    riskNote?: string[];
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = { profilePath: '', finalStateHash: '' };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if ((arg === '--profile' || arg === '--profile-json') && argv[i + 1]) {
            args.profilePath = argv[++i];
        } else if (arg === '--final-state-hash' && argv[i + 1]) {
            args.finalStateHash = argv[++i];
        } else if (arg === '--sector-partition-jsonl' && argv[i + 1]) {
            args.sectorPartitionPath = argv[++i];
        } else if (arg === '--json-out' && argv[i + 1]) {
            args.jsonOut = argv[++i];
        } else if (arg === '--markdown-out' && argv[i + 1]) {
            args.markdownOut = argv[++i];
        } else if (arg === '--risk-note' && argv[i + 1]) {
            (args.riskNote ??= []).push(argv[++i]);
        } else if (!args.profilePath) {
            args.profilePath = arg;
        }
    }
    if (!args.profilePath || !args.finalStateHash) {
        throw new Error('usage: profile_hotspot_report --profile PATH --final-state-hash HASH [--sector-partition-jsonl PATH] [--risk-note step=note]');
    }
    return args;
}

function parseRiskNotes(notes: string[] | undefined): Record<string, string> {
    const out: Record<string, string> = {};
    for (const note of notes ?? []) {
        const idx = note.indexOf('=');
        if (idx <= 0) throw new Error(`invalid --risk-note "${note}", expected step=note`);
        out[note.slice(0, idx)] = note.slice(idx + 1);
    }
    return out;
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    const profile = JSON.parse(readFileSync(resolve(args.profilePath), 'utf8')) as ScenarioProfileJson;
    const report = buildProfileHotspotReport({
        profilePath: args.profilePath,
        profile,
        finalStateHash: args.finalStateHash,
        riskNotes: parseRiskNotes(args.riskNote),
        ...(args.sectorPartitionPath
            ? { sectorPartition: summarizeSectorPartitionJsonl(args.sectorPartitionPath) }
            : {}),
    });

    if (args.jsonOut) {
        writeFileSync(resolve(args.jsonOut), `${stableStringify(report, 2)}\n`, 'utf8');
    }
    const markdown = formatProfileHotspotMarkdown(report);
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
        process.stderr.write(`profile_hotspot_report failed: ${message}\n`);
        process.exitCode = 1;
    });
}
