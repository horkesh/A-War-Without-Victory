import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { stableStringify } from '../../utils/stable_json.js';

export const BOT_ORDERS_PERF_FLAG = 'PERF_PROFILE_BOT_ORDERS';

interface PerfBucket {
    count: number;
    totalNs: bigint;
    samples: bigint[];
}

export interface BotOrdersPerfLabelSnapshot {
    label: string;
    count: number;
    total_ns: string;
    mean_ns: string;
    median_ns: string;
    p95_ns: string;
    min_ns: string;
    max_ns: string;
}

export interface BotOrdersPerfSnapshot {
    schema_version: 1;
    flag: typeof BOT_ORDERS_PERF_FLAG;
    labels: BotOrdersPerfLabelSnapshot[];
}

const buckets = new Map<string, PerfBucket>();

function strictCompare(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

export function isBotOrdersPerfEnabled(): boolean {
    return process.env[BOT_ORDERS_PERF_FLAG] === 'true';
}

export function resetBotOrdersPerfProfile(): void {
    buckets.clear();
}

export function botOrdersPerfTime<T>(label: string, fn: () => T): T {
    if (!isBotOrdersPerfEnabled()) return fn();
    const start = process.hrtime.bigint();
    try {
        return fn();
    } finally {
        const elapsed = process.hrtime.bigint() - start;
        const bucket = buckets.get(label) ?? { count: 0, totalNs: 0n, samples: [] };
        bucket.count += 1;
        bucket.totalNs += elapsed;
        bucket.samples.push(elapsed);
        buckets.set(label, bucket);
    }
}

function percentile(sorted: bigint[], fraction: number): bigint {
    if (sorted.length === 0) return 0n;
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
    return sorted[idx] ?? 0n;
}

function bucketSnapshot(label: string, bucket: PerfBucket): BotOrdersPerfLabelSnapshot {
    const samples = [...bucket.samples].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const count = bucket.count;
    const mean = count > 0 ? bucket.totalNs / BigInt(count) : 0n;
    return {
        label,
        count,
        total_ns: bucket.totalNs.toString(),
        mean_ns: mean.toString(),
        median_ns: percentile(samples, 0.5).toString(),
        p95_ns: percentile(samples, 0.95).toString(),
        min_ns: (samples[0] ?? 0n).toString(),
        max_ns: (samples[samples.length - 1] ?? 0n).toString(),
    };
}

export function buildBotOrdersPerfSnapshot(): BotOrdersPerfSnapshot {
    const labels = Array.from(buckets.entries())
        .sort(([a], [b]) => strictCompare(a, b))
        .map(([label, bucket]) => bucketSnapshot(label, bucket));
    return {
        schema_version: 1,
        flag: BOT_ORDERS_PERF_FLAG,
        labels,
    };
}

export function defaultBotOrdersPerfProfilePath(): string {
    return join(process.cwd(), 'data', 'derived', '_debug', 'bot_orders_perf_profile.json');
}

export function dumpBotOrdersPerfProfile(outPath = defaultBotOrdersPerfProfilePath()): string | null {
    if (!isBotOrdersPerfEnabled()) return null;
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, stableStringify(buildBotOrdersPerfSnapshot(), 2) + '\n', 'utf8');
    return outPath;
}
