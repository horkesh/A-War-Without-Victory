import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface V8CpuProfileCallFrame {
    functionName?: string;
    scriptId?: string;
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
}

export interface V8CpuProfileNode {
    id: number;
    callFrame: V8CpuProfileCallFrame;
    hitCount?: number;
    children?: number[];
}

export interface V8CpuProfile {
    nodes: V8CpuProfileNode[];
    samples?: number[];
    timeDeltas?: number[];
    startTime?: number;
    endTime?: number;
}

export interface CpuFrameSummary {
    key: string;
    functionName: string;
    url: string;
    location: string;
    selfMs: number;
    totalMs: number;
    selfPct: number;
    totalPct: number;
    sampleCount: number;
}

export interface CpuProfileSummary {
    totalSampledMs: number;
    frameCount: number;
    sampleCount: number;
    topSelf: CpuFrameSummary[];
    topTotal: CpuFrameSummary[];
}

export interface CpuProfileSummaryOptions {
    topN?: number;
    appRoot?: string;
    applicationOnly?: boolean;
}

interface MutableFrameSummary {
    key: string;
    functionName: string;
    url: string;
    location: string;
    selfUs: number;
    totalUs: number;
    sampleCount: number;
}

function normalizePathLike(rawUrl: string): string {
    if (!rawUrl) return '';
    let value = rawUrl;
    if (value.startsWith('file://')) {
        try {
            value = fileURLToPath(value);
        } catch {
            value = value.replace(/^file:\/\/\/?/, '');
        }
    }
    return value.replace(/\\/g, '/');
}

function normalizeRoot(appRoot: string | undefined): string {
    if (!appRoot) return '';
    return resolve(appRoot).replace(/\\/g, '/').replace(/\/+$/, '');
}

function displayUrl(rawUrl: string, appRoot: string): string {
    const normalized = normalizePathLike(rawUrl);
    if (!normalized) return '';
    if (!appRoot) return normalized;
    if (normalized === appRoot) return '.';
    if (normalized.startsWith(`${appRoot}/`)) {
        return relative(appRoot, normalized).replace(/\\/g, '/');
    }
    return normalized;
}

function isRepositoryFrame(rawUrl: string, appRoot: string): boolean {
    const normalized = normalizePathLike(rawUrl);
    if (!appRoot || !normalized.startsWith(`${appRoot}/`)) return false;
    return !normalized.includes('/node_modules/');
}

function frameKey(node: V8CpuProfileNode, appRoot: string): string {
    const callFrame = node.callFrame ?? {};
    const fn = callFrame.functionName || '(anonymous)';
    const url = displayUrl(callFrame.url ?? '', appRoot);
    const line = typeof callFrame.lineNumber === 'number' && callFrame.lineNumber >= 0
        ? callFrame.lineNumber + 1
        : 0;
    const column = typeof callFrame.columnNumber === 'number' && callFrame.columnNumber >= 0
        ? callFrame.columnNumber + 1
        : 0;
    return `${url}:${line}:${column} ${fn}`;
}

function frameLocation(node: V8CpuProfileNode, appRoot: string): string {
    const callFrame = node.callFrame ?? {};
    const url = displayUrl(callFrame.url ?? '', appRoot);
    const line = typeof callFrame.lineNumber === 'number' && callFrame.lineNumber >= 0
        ? callFrame.lineNumber + 1
        : 0;
    const column = typeof callFrame.columnNumber === 'number' && callFrame.columnNumber >= 0
        ? callFrame.columnNumber + 1
        : 0;
    return url ? `${url}:${line}:${column}` : '(native)';
}

function fallbackDeltaUs(profile: V8CpuProfile): number {
    const sampleCount = profile.samples?.length ?? 0;
    if (
        sampleCount > 0 &&
        typeof profile.startTime === 'number' &&
        typeof profile.endTime === 'number' &&
        profile.endTime > profile.startTime
    ) {
        return (profile.endTime - profile.startTime) / sampleCount;
    }
    return 1000;
}

function sortedFrames(
    frames: Iterable<MutableFrameSummary>,
    totalUs: number,
    kind: 'self' | 'total',
    topN: number,
): CpuFrameSummary[] {
    const rows = [...frames].map((frame) => {
        const selfMs = frame.selfUs / 1000;
        const totalMs = frame.totalUs / 1000;
        return {
            key: frame.key,
            functionName: frame.functionName,
            url: frame.url,
            location: frame.location,
            selfMs,
            totalMs,
            selfPct: totalUs > 0 ? (frame.selfUs / totalUs) * 100 : 0,
            totalPct: totalUs > 0 ? (frame.totalUs / totalUs) * 100 : 0,
            sampleCount: frame.sampleCount,
        };
    });
    const valueKey = kind === 'self' ? 'selfMs' : 'totalMs';
    return rows
        .sort((left, right) => {
            const valueDelta = right[valueKey] - left[valueKey];
            if (valueDelta !== 0) return valueDelta;
            return left.key < right.key ? -1 : left.key > right.key ? 1 : 0;
        })
        .slice(0, topN);
}

export function summarizeCpuProfile(
    profile: V8CpuProfile,
    options: CpuProfileSummaryOptions = {},
): CpuProfileSummary {
    const topN = options.topN ?? 25;
    const appRoot = normalizeRoot(options.appRoot);
    const nodeById = new Map<number, V8CpuProfileNode>();
    const parentById = new Map<number, number>();

    for (const node of profile.nodes) {
        nodeById.set(node.id, node);
    }
    for (const node of profile.nodes) {
        for (const child of node.children ?? []) {
            parentById.set(child, node.id);
        }
    }

    const frameByKey = new Map<string, MutableFrameSummary>();
    const getFrame = (node: V8CpuProfileNode): MutableFrameSummary | null => {
        const callFrame = node.callFrame ?? {};
        if (options.applicationOnly && !isRepositoryFrame(callFrame.url ?? '', appRoot)) {
            return null;
        }
        const key = frameKey(node, appRoot);
        const existing = frameByKey.get(key);
        if (existing) return existing;
        const frame: MutableFrameSummary = {
            key,
            functionName: callFrame.functionName || '(anonymous)',
            url: displayUrl(callFrame.url ?? '', appRoot),
            location: frameLocation(node, appRoot),
            selfUs: 0,
            totalUs: 0,
            sampleCount: 0,
        };
        frameByKey.set(key, frame);
        return frame;
    };

    const samples = profile.samples ?? [];
    const defaultDeltaUs = fallbackDeltaUs(profile);
    let totalUs = 0;

    for (let i = 0; i < samples.length; i++) {
        const nodeId = samples[i];
        const deltaUs = profile.timeDeltas?.[i] ?? defaultDeltaUs;
        totalUs += deltaUs;
        const leaf = nodeById.get(nodeId);
        if (!leaf) continue;

        const selfFrame = getFrame(leaf);
        if (selfFrame) {
            selfFrame.selfUs += deltaUs;
            selfFrame.sampleCount += 1;
        }

        let current: V8CpuProfileNode | undefined = leaf;
        while (current) {
            const totalFrame = getFrame(current);
            if (totalFrame) {
                totalFrame.totalUs += deltaUs;
            }
            const parentId = parentById.get(current.id);
            current = parentId === undefined ? undefined : nodeById.get(parentId);
        }
    }

    return {
        totalSampledMs: totalUs / 1000,
        frameCount: frameByKey.size,
        sampleCount: samples.length,
        topSelf: sortedFrames(frameByKey.values(), totalUs, 'self', topN),
        topTotal: sortedFrames(frameByKey.values(), totalUs, 'total', topN),
    };
}

function markdownTable(title: string, rows: CpuFrameSummary[]): string {
    const lines = [
        `## ${title}`,
        '',
        '| Rank | Function | Self ms | Total ms | Self % | Total % | Location |',
        '|---:|---|---:|---:|---:|---:|---|',
    ];
    rows.forEach((row, index) => {
        lines.push(
            `| ${index + 1} | \`${row.functionName.replace(/`/g, "'")}\` | ${row.selfMs.toFixed(3)} | ${row.totalMs.toFixed(3)} | ${row.selfPct.toFixed(2)} | ${row.totalPct.toFixed(2)} | \`${row.location.replace(/`/g, "'")}\` |`,
        );
    });
    return lines.join('\n');
}

export function formatCpuProfileMarkdown(summary: CpuProfileSummary): string {
    return [
        '# CPU Profile Summary',
        '',
        `Sampled time: ${summary.totalSampledMs.toFixed(3)}ms`,
        `Samples: ${summary.sampleCount}`,
        `Frames: ${summary.frameCount}`,
        '',
        markdownTable('Top Self-Time Frames', summary.topSelf),
        '',
        markdownTable('Top Total-Time Frames', summary.topTotal),
        '',
    ].join('\n');
}

export function readCpuProfile(path: string): V8CpuProfile {
    return JSON.parse(readFileSync(path, 'utf8')) as V8CpuProfile;
}

export function writeCpuProfileSummaryFiles(
    profilePath: string,
    options: CpuProfileSummaryOptions & { jsonOut?: string; markdownOut?: string } = {},
): CpuProfileSummary {
    const summary = summarizeCpuProfile(readCpuProfile(profilePath), options);
    if (options.jsonOut) {
        writeFileSync(options.jsonOut, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    }
    if (options.markdownOut) {
        writeFileSync(options.markdownOut, formatCpuProfileMarkdown(summary), 'utf8');
    }
    return summary;
}
