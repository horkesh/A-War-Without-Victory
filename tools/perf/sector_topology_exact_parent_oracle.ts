import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export type SectorTopologyOracleMode = 'live-war' | 'final-turn' | 'final-save-projection';

export interface SectorTopologyExactParentCase {
    readonly caseId: string;
    readonly mode: SectorTopologyOracleMode;
    readonly seed: number;
    readonly observable: unknown;
}

export interface SectorTopologyExactParentArtifact {
    readonly schema: 'awwv-sector-topology-exact-parent-v1';
    readonly lineage: Readonly<{
        commit: string;
        parent: string;
        tree: string;
    }>;
    readonly cases: readonly SectorTopologyExactParentCase[];
}

export interface SectorTopologyExactParentComparison {
    readonly schema: 'awwv-sector-topology-exact-parent-comparison-v1';
    readonly disposition: 'PASS_EXACT' | 'FAIL_DIVERGENCE';
    readonly controlLineage: SectorTopologyExactParentArtifact['lineage'];
    readonly candidateLineage: SectorTopologyExactParentArtifact['lineage'];
    readonly comparedCases: number;
    readonly failures: readonly Readonly<{
        caseId: string;
        controlSha256: string;
        candidateSha256: string;
        firstDifferenceByte: number;
        controlExcerpt: string;
        candidateExcerpt: string;
    }>[];
}

function strictCompare(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value !== null && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(record).sort(strictCompare)) {
            sorted[key] = canonicalize(record[key]);
        }
        return sorted;
    }
    return value;
}

function canonicalBytes(value: unknown): string {
    return JSON.stringify(canonicalize(value));
}

function sha256(bytes: string): string {
    return createHash('sha256').update(bytes).digest('hex');
}

function firstDifference(left: string, right: string): number {
    const sharedLength = Math.min(left.length, right.length);
    let index = 0;
    while (index < sharedLength && left.charCodeAt(index) === right.charCodeAt(index)) index += 1;
    return index === sharedLength && left.length === right.length ? -1 : index;
}

function validateArtifact(
    value: unknown,
    label: string,
): asserts value is SectorTopologyExactParentArtifact {
    if (!value || typeof value !== 'object') throw new Error(`${label} artifact must be an object.`);
    const artifact = value as Partial<SectorTopologyExactParentArtifact>;
    if (artifact.schema !== 'awwv-sector-topology-exact-parent-v1') {
        throw new Error(`${label} artifact has an unsupported schema.`);
    }
    if (!artifact.lineage?.commit || !artifact.lineage.parent || !artifact.lineage.tree) {
        throw new Error(`${label} artifact is missing complete lineage.`);
    }
    if (!Array.isArray(artifact.cases) || artifact.cases.length !== 300) {
        throw new Error(`${label} artifact must contain exactly 300 cases.`);
    }
    const seen = new Set<string>();
    for (const entry of artifact.cases) {
        if (!entry || typeof entry.caseId !== 'string' || seen.has(entry.caseId)) {
            throw new Error(`${label} artifact has a missing or duplicate caseId.`);
        }
        if (entry.mode !== 'live-war'
            && entry.mode !== 'final-turn'
            && entry.mode !== 'final-save-projection') {
            throw new Error(`${label} artifact case ${entry.caseId} has an invalid mode.`);
        }
        if (!Number.isInteger(entry.seed) || entry.seed < 0 || entry.seed >= 100) {
            throw new Error(`${label} artifact case ${entry.caseId} has an invalid seed.`);
        }
        seen.add(entry.caseId);
    }
}

export function compareSectorTopologyExactParentArtifacts(
    controlValue: unknown,
    candidateValue: unknown,
): SectorTopologyExactParentComparison {
    validateArtifact(controlValue, 'control');
    validateArtifact(candidateValue, 'candidate');
    const candidateById = new Map(
        candidateValue.cases.map((entry) => [entry.caseId, entry] as const),
    );
    const failures: Array<SectorTopologyExactParentComparison['failures'][number]> = [];

    for (const controlCase of controlValue.cases) {
        const candidateCase = candidateById.get(controlCase.caseId);
        if (!candidateCase
            || candidateCase.mode !== controlCase.mode
            || candidateCase.seed !== controlCase.seed) {
            throw new Error(`Candidate artifact is missing matching case ${controlCase.caseId}.`);
        }
        const controlBytes = canonicalBytes(controlCase.observable);
        const candidateBytes = canonicalBytes(candidateCase.observable);
        if (controlBytes === candidateBytes) continue;
        const difference = firstDifference(controlBytes, candidateBytes);
        failures.push({
            caseId: controlCase.caseId,
            controlSha256: sha256(controlBytes),
            candidateSha256: sha256(candidateBytes),
            firstDifferenceByte: difference,
            controlExcerpt: controlBytes.slice(Math.max(0, difference - 80), difference + 160),
            candidateExcerpt: candidateBytes.slice(Math.max(0, difference - 80), difference + 160),
        });
    }

    if (candidateById.size !== controlValue.cases.length) {
        throw new Error('Candidate artifact case set differs from control.');
    }
    return {
        schema: 'awwv-sector-topology-exact-parent-comparison-v1',
        disposition: failures.length === 0 ? 'PASS_EXACT' : 'FAIL_DIVERGENCE',
        controlLineage: controlValue.lineage,
        candidateLineage: candidateValue.lineage,
        comparedCases: controlValue.cases.length,
        failures,
    };
}

function argumentValue(args: readonly string[], name: string): string | undefined {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
}

function main(args: readonly string[]): void {
    const controlPath = argumentValue(args, '--control');
    const candidatePath = argumentValue(args, '--candidate');
    const reportPath = argumentValue(args, '--report');
    if (!controlPath || !candidatePath) {
        throw new Error(
            'Usage: sector_topology_exact_parent_oracle.ts --control <json> --candidate <json> [--report <json>]',
        );
    }
    const control = JSON.parse(readFileSync(resolve(controlPath), 'utf8')) as unknown;
    const candidate = JSON.parse(readFileSync(resolve(candidatePath), 'utf8')) as unknown;
    const comparison = compareSectorTopologyExactParentArtifacts(control, candidate);
    const rendered = `${JSON.stringify(comparison, null, 2)}\n`;
    if (reportPath) writeFileSync(resolve(reportPath), rendered, 'utf8');
    process.stdout.write(rendered);
    if (comparison.disposition !== 'PASS_EXACT') process.exitCode = 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
    main(process.argv.slice(2));
}
