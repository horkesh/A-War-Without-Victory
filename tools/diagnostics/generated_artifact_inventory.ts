#!/usr/bin/env node

import { readFileSync, readdirSync, type Dirent } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { stableStringify as stableJsonStringify } from '../../src/utils/stable_json.js';

export const ARTIFACT_POLICIES = [
    'committed-golden-output',
    'committed-static-input',
    'retained-research-evidence',
    'transient-package-output',
    'untracked-diagnostic',
] as const;

export type ArtifactPolicy = typeof ARTIFACT_POLICIES[number];

export type GeneratedArtifactInventoryRow = {
    artifact: string;
    owner: string;
    validation: string;
    commit_policy: string;
    transient_policy: string;
    policy: ArtifactPolicy;
    source: {
        file: string;
        line: number;
    };
};

export type GeneratedArtifactInventory = {
    generated_by?: 'tools/diagnostics/generated_artifact_inventory.ts';
    artifacts: GeneratedArtifactInventoryRow[];
    coverage: {
        baseline: boolean;
        diagnostic: boolean;
        package: boolean;
        replay_or_run: boolean;
        scenario: boolean;
    };
    summary: {
        artifact_count: number;
        unowned_count: number;
        by_policy: Record<ArtifactPolicy, number>;
    };
    writes: {
        call_count: number;
        discovered_count: number;
        external_or_caller_selected_count: number;
        unowned_count: number;
        entries: GeneratedArtifactWriteEvidence[];
    };
};

export type GeneratedArtifactWriteEvidence = {
    destination: string;
    operation: string;
    owner_artifact: string | null;
    source: {
        file: string;
        line: number;
    };
};

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

export function stableStringify(value: unknown): string {
    return `${stableJsonStringify(value, 2)}\n`;
}

function splitMarkdownTableRow(line: string): string[] {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return [];
    return trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
}

function normalizeArtifactCell(value: string): string {
    const leadingCode = value.match(/^`([^`]+)`/);
    return leadingCode?.[1] ?? value;
}

const ARTIFACT_POLICY_GROUPS = {
    'committed-golden-output': [
        'data/calibration/structural_fingerprint_40w.json',
        'data/derived/scenario/baselines/manifest.json',
        'data/derived/startup/apr_1992_initial_save.json',
        'data/derived/tiles/hillshade.pmtiles',
        'data/derived/tiles/osm.pmtiles',
        'data/derived/tiles/terrain.pmtiles',
        'docs/40_reports/working/SARAJEVO_CONSTANT_INVENTORY.md',
        'tools/diagnostics/_phase5a_painted_compares/*.txt',
        'tools/diagnostics/output/save_migration_drift.json',
    ],
    'committed-static-input': [
        'tests/fixtures/save_migration/v*.json',
    ],
    'retained-research-evidence': [
        'data/derived/georef/',
        'data/derived/knowledge_base/balkan_battlegrounds/',
        'data/derived/municipality_audit/',
        'data/derived/operational/',
        'data/derived/scenario/baseline_ops_sensitivity*/',
        'data/derived/scenario/recruitment_test_matrix_2026_02_11/',
        'data/derived/scenario/sweeps/h2_4/h2_4_sweep/',
        'data/derived/terrain/',
        'tests/fixtures/fatigue_distribution/compact_run/',
        'tools/diagnostics/_force_quality_*.md',
    ],
    'transient-package-output': [
        'data/derived/latest_run_final_save.json',
        'dist-packaged/...',
        'runs/<scenario_run>/...',
        'runs/<scenario_run>/replay.jsonl',
        'runs/<scenario_run>/replay_save_manifest.json',
        'runs/<scenario_run>/replay_save_sequence.json',
        'runs/<scenario_run>/replay_sequence.jsonl',
        'runs/<scenario_run>/replay_timeline.json',
    ],
    'untracked-diagnostic': [
        'data/derived/_debug/**',
        'data/derived/scenario/_*/...',
        'tools/diagnostics/output/*.json',
    ],
} as const satisfies Record<ArtifactPolicy, readonly string[]>;

function buildArtifactPolicyRegistry(): ReadonlyMap<string, ArtifactPolicy> {
    const registry = new Map<string, ArtifactPolicy>();
    for (const policy of ARTIFACT_POLICIES) {
        for (const artifact of ARTIFACT_POLICY_GROUPS[policy]) {
            if (registry.has(artifact)) throw new Error(`Duplicate generated artifact policy: ${artifact}`);
            registry.set(artifact, policy);
        }
    }
    return registry;
}

const ARTIFACT_POLICY_REGISTRY = buildArtifactPolicyRegistry();

function assertRepoRelativePosix(artifact: string, line: number): void {
    if (!artifact || artifact.includes('\\') || artifact.startsWith('/') || /^[A-Za-z]:/.test(artifact)) {
        throw new Error(`Invalid generated artifact path at line ${line}: ${artifact}`);
    }
}

function parseOwnershipMatrix(rootDir: string): GeneratedArtifactInventoryRow[] {
    const filePath = resolve(rootDir, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md');
    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
    const headingIndex = lines.findIndex((line) => line.trim() === '## Matrix');
    if (headingIndex < 0) throw new Error('Generated artifact ownership document has no Matrix section');

    const rows: GeneratedArtifactInventoryRow[] = [];
    const seen = new Set<string>();
    for (let index = headingIndex + 1; index < lines.length; index += 1) {
        if (lines[index].startsWith('## ')) break;
        const cells = splitMarkdownTableRow(lines[index]);
        if (cells.length === 0 || cells.every((cell) => /^-+$/.test(cell))) continue;
        if (cells[0] === 'Artifact (repo-relative POSIX)') continue;
        if (cells.length !== 5) throw new Error(`Ownership matrix line ${index + 1} must have exactly five columns`);

        const artifact = normalizeArtifactCell(cells[0]);
        assertRepoRelativePosix(artifact, index + 1);
        if (seen.has(artifact)) throw new Error(`Duplicate generated artifact ownership row: ${artifact}`);
        seen.add(artifact);
        const policy = ARTIFACT_POLICY_REGISTRY.get(artifact);
        if (!policy) throw new Error(`Unclassified generated artifact policy: ${artifact}`);
        rows.push({
            artifact,
            owner: cells[1],
            validation: cells[2],
            commit_policy: cells[3],
            transient_policy: cells[4],
            policy,
            source: {
                file: relative(rootDir, filePath).replace(/\\/g, '/'),
                line: index + 1,
            },
        });
    }
    return rows.sort((a, b) => strictCompare(a.artifact, b.artifact));
}

const PRODUCER_ROOTS = [
    'src/scenario',
    'src/sim/replay',
    'tools/diagnostics',
    'tools/perf',
    'tools/scenario_runner',
] as const;

const WRITE_OPERATIONS = new Set([
    'appendFile',
    'appendFileSync',
    'copyFile',
    'copyFileSync',
    'createWriteStream',
    'rename',
    'renameSync',
    'writeFile',
    'writeFileSync',
]);

function listProducerFiles(rootDir: string): string[] {
    const files: string[] = [];
    for (const producerRoot of PRODUCER_ROOTS) {
        const stack = [resolve(rootDir, producerRoot)];
        while (stack.length > 0) {
            const current = stack.pop();
            if (!current) continue;
            let entries: Dirent<string>[];
            try {
                entries = readdirSync(current, { withFileTypes: true, encoding: 'utf8' });
            } catch {
                continue;
            }
            for (const entry of entries.slice().sort((a, b) => strictCompare(a.name, b.name)).reverse()) {
                const path = resolve(current, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name !== 'node_modules' && entry.name !== 'output' && entry.name !== '_archived') stack.push(path);
                } else if (entry.isFile() && /\.(?:cjs|js|mjs|ts|tsx)$/.test(entry.name)) {
                    files.push(path);
                }
            }
        }
    }
    return files.sort(strictCompare);
}

function callName(expression: ts.Expression): string | null {
    if (ts.isIdentifier(expression)) return expression.text;
    if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
    return null;
}

function staticPath(expression: ts.Expression, constants: ReadonlyMap<string, string>): string | null {
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
    if (ts.isIdentifier(expression)) return constants.get(expression.text) ?? null;
    if (ts.isTemplateExpression(expression)) {
        return expression.templateSpans.reduce(
            (value, span) => `${value}*${span.literal.text}`,
            expression.head.text,
        );
    }
    if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        const left = staticPath(expression.left, constants);
        const right = staticPath(expression.right, constants);
        return left !== null && right !== null ? `${left}${right}` : null;
    }
    if (ts.isCallExpression(expression)) {
        const name = callName(expression.expression);
        if (name !== 'join' && name !== 'resolve') return null;
        return expression.arguments
            .map((argument) => staticPath(argument, constants) ?? '*')
            .join('/');
    }
    return null;
}

function normalizeDestination(path: string): string | null {
    const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.\//, '');
    if (!normalized || normalized === '*') return null;
    const repoRoot = normalized.match(/(?:^|\/)(data\/calibration|data\/derived|dist-packaged|docs\/40_reports|runs|tests\/fixtures|tools\/diagnostics)\//);
    if (repoRoot?.index !== undefined) {
        const offset = normalized[repoRoot.index] === '/' ? repoRoot.index + 1 : repoRoot.index;
        return normalized.slice(offset);
    }
    if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) return null;
    return normalized.includes('/') && !normalized.startsWith('*/') ? normalized : null;
}

function globRegex(pattern: string): RegExp {
    let normalized = pattern.replace(/<[^>]+>/g, '*').replace(/\.\.\./g, '**');
    if (normalized.endsWith('/')) normalized += '**';
    let source = '';
    for (let index = 0; index < normalized.length; index += 1) {
        const char = normalized[index];
        if (char === '*' && normalized[index + 1] === '*') {
            source += '.*';
            index += 1;
        } else if (char === '*') {
            source += '[^/]*';
        } else {
            source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
    }
    return new RegExp(`^${source}$`);
}

function ownerForDestination(destination: string, artifacts: GeneratedArtifactInventoryRow[]): string | null {
    return artifacts
        .filter((row) => globRegex(row.artifact).test(destination))
        .sort((left, right) => {
            const literalDelta = right.artifact.replace(/[*.]|<[^>]+>/g, '').length
                - left.artifact.replace(/[*.]|<[^>]+>/g, '').length;
            return literalDelta || strictCompare(left.artifact, right.artifact);
        })[0]?.artifact ?? null;
}

function inferredOwnerForDynamicWrite(relativePath: string, argumentText: string): string | null {
    if (relativePath === 'src/scenario/scenario_runner.ts') {
        if (/replaySaveManifest/i.test(argumentText)) return 'runs/<scenario_run>/replay_save_manifest.json';
        if (/replaySaveSequence/i.test(argumentText)) return 'runs/<scenario_run>/replay_save_sequence.json';
        if (/replaySequence/i.test(argumentText)) return 'runs/<scenario_run>/replay_sequence.jsonl';
        if (/replayTimeline/i.test(argumentText)) return 'runs/<scenario_run>/replay_timeline.json';
        if (/replayPath/i.test(argumentText)) return 'runs/<scenario_run>/replay.jsonl';
        return 'runs/<scenario_run>/...';
    }
    if (relativePath === 'src/scenario/replay_save_emit.ts') {
        return /manifest/i.test(argumentText)
            ? 'runs/<scenario_run>/replay_save_manifest.json'
            : 'runs/<scenario_run>/replay_save_sequence.json';
    }
    if (relativePath === 'src/scenario/baseline_ops_sensitivity.ts') {
        return 'data/derived/scenario/baseline_ops_sensitivity*/';
    }
    if (relativePath === 'src/scenario/startup_snapshot.ts') {
        return 'data/derived/startup/apr_1992_initial_save.json';
    }
    if (relativePath === 'tools/scenario_runner/run_baseline_regression.ts') {
        return 'data/derived/scenario/baselines/manifest.json';
    }
    if (relativePath === 'tools/scenario_runner/run_scenario.ts') {
        return 'data/derived/latest_run_final_save.json';
    }
    if (relativePath === 'tools/scenario_runner/run_scenario_sweep_h2_4.ts') {
        return 'data/derived/scenario/sweeps/h2_4/h2_4_sweep/';
    }
    if (relativePath === 'tools/diagnostics/structural_fingerprint.cjs') {
        return 'data/calibration/structural_fingerprint_40w.json';
    }
    if (relativePath === 'tools/diagnostics/sarajevo_constant_inventory.cjs') {
        return 'docs/40_reports/working/SARAJEVO_CONSTANT_INVENTORY.md';
    }
    if (/^tools\/diagnostics\/(?:late_war_atrocity_pre_conditions|srebrenica_rupture_trace|verify_replay_streaming_finalize_n1641)\.cjs$/.test(relativePath)) {
        return 'runs/<scenario_run>/...';
    }
    return null;
}

type ArtifactWriteScan = {
    callCount: number;
    externalOrCallerSelectedCount: number;
    entries: GeneratedArtifactWriteEvidence[];
};

function collectArtifactWrites(rootDir: string, artifacts: GeneratedArtifactInventoryRow[]): ArtifactWriteScan {
    const entries: GeneratedArtifactWriteEvidence[] = [];
    let callCount = 0;
    let externalOrCallerSelectedCount = 0;
    for (const filePath of listProducerFiles(rootDir)) {
        const source = ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true);
        const constants = new Map<string, string>();
        const collectConstants = (node: ts.Node): void => {
            if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
                const value = staticPath(node.initializer, constants);
                if (value !== null) constants.set(node.name.text, value);
            }
            ts.forEachChild(node, collectConstants);
        };
        collectConstants(source);

        const visit = (node: ts.Node): void => {
            if (ts.isCallExpression(node)) {
                const operation = callName(node.expression);
                if (operation && WRITE_OPERATIONS.has(operation)) {
                    callCount += 1;
                    const destinationIndex = operation.startsWith('copy') || operation.startsWith('rename') ? 1 : 0;
                    const argument = node.arguments[destinationIndex];
                    const destination = argument ? normalizeDestination(staticPath(argument, constants) ?? '') : null;
                    if (destination) {
                        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
                        entries.push({
                            destination,
                            operation,
                            owner_artifact: ownerForDestination(destination, artifacts),
                            source: {
                                file: relative(rootDir, filePath).replace(/\\/g, '/'),
                                line: line + 1,
                            },
                        });
                    } else if (argument) {
                        const relativePath = relative(rootDir, filePath).replace(/\\/g, '/');
                        const inferredOwner = inferredOwnerForDynamicWrite(relativePath, argument.getText(source));
                        if (inferredOwner) {
                            const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
                            const declaredOwner = artifacts.some((row) => row.artifact === inferredOwner)
                                ? inferredOwner
                                : null;
                            entries.push({
                                destination: inferredOwner,
                                operation,
                                owner_artifact: declaredOwner,
                                source: { file: relativePath, line: line + 1 },
                            });
                        } else {
                            externalOrCallerSelectedCount += 1;
                        }
                    } else {
                        externalOrCallerSelectedCount += 1;
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }
    entries.sort((left, right) =>
        strictCompare(left.destination, right.destination)
        || strictCompare(left.source.file, right.source.file)
        || left.source.line - right.source.line,
    );
    return { callCount, externalOrCallerSelectedCount, entries };
}

function buildCoverage(artifacts: GeneratedArtifactInventoryRow[]): GeneratedArtifactInventory['coverage'] {
    const paths = artifacts.map((row) => row.artifact);
    return {
        baseline: paths.some((path) => /baseline/i.test(path)),
        diagnostic: paths.some((path) => path.startsWith('tools/diagnostics/')),
        package: paths.some((path) => path.startsWith('dist-packaged/')),
        replay_or_run: paths.some((path) => /replay/i.test(path) || path.startsWith('runs/')),
        scenario: paths.some((path) => path.includes('scenario') || path.startsWith('runs/')),
    };
}

export function assertCompleteArtifactInventory(inventory: GeneratedArtifactInventory): void {
    const unowned = inventory.artifacts
        .filter((row) => row.owner.trim() === '' || row.validation.trim() === '' || !ARTIFACT_POLICIES.includes(row.policy))
        .map((row) => row.artifact)
        .sort(strictCompare);
    if (unowned.length > 0) {
        throw new Error(`Unowned generated artifacts: ${unowned.join(', ')}`);
    }
    const unownedWrites = inventory.writes.entries
        .filter((entry) => entry.owner_artifact === null)
        .map((entry) => entry.destination)
        .sort(strictCompare);
    if (unownedWrites.length > 0) {
        throw new Error(`Unowned generated artifact writes: ${unownedWrites.join(', ')}`);
    }
    const missingFamilies = Object.entries(inventory.coverage)
        .filter(([, covered]) => !covered)
        .map(([family]) => family)
        .sort(strictCompare);
    if (missingFamilies.length > 0) {
        throw new Error(`Missing generated artifact families: ${missingFamilies.join(', ')}`);
    }
}

export function buildGeneratedArtifactInventory(rootDir = process.cwd()): GeneratedArtifactInventory {
    const resolvedRoot = resolve(rootDir);
    const artifacts = parseOwnershipMatrix(resolvedRoot);
    const byPolicy = Object.fromEntries(ARTIFACT_POLICIES.map((policy) => [policy, 0])) as Record<ArtifactPolicy, number>;
    for (const row of artifacts) byPolicy[row.policy] += 1;
    const writes = collectArtifactWrites(resolvedRoot, artifacts);
    const inventory: GeneratedArtifactInventory = {
        generated_by: 'tools/diagnostics/generated_artifact_inventory.ts',
        artifacts,
        coverage: buildCoverage(artifacts),
        summary: {
            artifact_count: artifacts.length,
            unowned_count: artifacts.filter((row) => row.owner.trim() === '' || row.validation.trim() === '').length,
            by_policy: byPolicy,
        },
        writes: {
            call_count: writes.callCount,
            discovered_count: writes.entries.length,
            external_or_caller_selected_count: writes.externalOrCallerSelectedCount,
            unowned_count: writes.entries.filter((entry) => entry.owner_artifact === null).length,
            entries: writes.entries,
        },
    };
    assertCompleteArtifactInventory(inventory);
    return inventory;
}

function main(): void {
    const rootDir = process.argv[2] ?? process.cwd();
    process.stdout.write(stableStringify(buildGeneratedArtifactInventory(rootDir)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
