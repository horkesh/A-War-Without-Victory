import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
    assertCompleteArtifactInventory,
    buildGeneratedArtifactInventory,
    stableStringify,
    type GeneratedArtifactInventory,
} from '../tools/diagnostics/generated_artifact_inventory.js';

const TMP_ROOT = join(process.cwd(), '.tmp_generated_artifact_inventory');

function write(relativePath: string, contents: string): void {
    const absolutePath = join(TMP_ROOT, relativePath);
    mkdirSync(join(absolutePath, '..'), { recursive: true });
    writeFileSync(absolutePath, contents, 'utf8');
}

const HEADER = `| Artifact (repo-relative POSIX) | Owner command | Validation command | Commit policy | Transient/run-output policy |
| --- | --- | --- | --- | --- |`;

describe('generated artifact inventory diagnostic', () => {
    afterEach(() => {
        rmSync(TMP_ROOT, { recursive: true, force: true });
    });

    it('normalizes ownership rows into the five roadmap policies with ASCII-stable output', () => {
        write('docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md', `
# Generated Artifact Ownership

## Matrix

${HEADER}
| \`tests/fixtures/save_migration/v*.json\` | None - retained legacy fixtures. | fixture test | Committed static legacy schema fixtures. | Not transient. |
| \`data/derived/scenario/baselines/manifest.json\` | \`npm.cmd run test:baselines -- --update\` | baseline test | Committed golden output. | Not transient. |
| \`tools/diagnostics/output/save_migration_drift.json\` | migration drift command | drift test | Committed. Refresh after migration registry changes. | Not transient. |
| \`tools/diagnostics/_force_quality_*.md\` | None - retained static evidence. | audit test | Committed retained research evidence. | Not transient. |
| \`tools/diagnostics/output/*.json\` | Owner script under \`tools/diagnostics/\`. | diagnostic test | Do not commit unlisted diagnostics. | Default transient. |
| \`dist-packaged/...\` | \`npm.cmd run desktop:package:win\` | package test | Do not commit packaged binaries. | Always transient. |
| \`runs/<scenario_run>/...\` | \`npm.cmd run sim:scenario:run:*\` | run test | Do not commit. | Default transient. |
`);
        write('tools/scenario_runner/write_run.ts', `
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
writeFileSync(join('runs', 'fixture', 'final_save.json'), '{}');
`);

        const inventory = buildGeneratedArtifactInventory(TMP_ROOT);

        expect(inventory.artifacts.map((row) => [row.artifact, row.policy])).toEqual([
            ['data/derived/scenario/baselines/manifest.json', 'committed-golden-output'],
            ['dist-packaged/...', 'transient-package-output'],
            ['runs/<scenario_run>/...', 'transient-package-output'],
            ['tests/fixtures/save_migration/v*.json', 'committed-static-input'],
            ['tools/diagnostics/_force_quality_*.md', 'retained-research-evidence'],
            ['tools/diagnostics/output/*.json', 'untracked-diagnostic'],
            ['tools/diagnostics/output/save_migration_drift.json', 'committed-golden-output'],
        ]);
        expect(inventory.summary).toEqual({
            artifact_count: 7,
            by_policy: {
                'committed-golden-output': 2,
                'committed-static-input': 1,
                'retained-research-evidence': 1,
                'transient-package-output': 2,
                'untracked-diagnostic': 1,
            },
            unowned_count: 0,
        });
        expect(inventory.writes).toMatchObject({
            discovered_count: 1,
            unowned_count: 0,
        });
        expect(inventory.writes.entries[0]).toMatchObject({
            destination: 'runs/fixture/final_save.json',
            owner_artifact: 'runs/<scenario_run>/...',
            source: { file: 'tools/scenario_runner/write_run.ts', line: 4 },
        });
        expect(inventory.coverage).toEqual({
            baseline: true,
            diagnostic: true,
            package: true,
            replay_or_run: true,
            scenario: true,
        });

        const serialized = stableStringify(inventory);
        expect(serialized).toBe(stableStringify(buildGeneratedArtifactInventory(TMP_ROOT)));
        expect(serialized).not.toContain(TMP_ROOT.replace(/\\/g, '/'));
        expect(serialized).not.toMatch(/generated_at|timestamp/i);
    });

    it('fails closed when a known artifact family lacks an owner or policy', () => {
        const incomplete = {
            artifacts: [{
                artifact: 'runs/<scenario_run>/...',
                owner: '',
                validation: 'run test',
                commit_policy: 'Do not commit.',
                transient_policy: 'Default transient.',
                policy: 'transient-package-output',
                source: { file: 'docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md', line: 7 },
            }],
            coverage: {
                baseline: false,
                diagnostic: false,
                package: false,
                replay_or_run: true,
                scenario: true,
            },
            summary: {
                artifact_count: 1,
                by_policy: {
                    'committed-golden-output': 0,
                    'committed-static-input': 0,
                    'retained-research-evidence': 0,
                    'transient-package-output': 1,
                    'untracked-diagnostic': 0,
                },
                unowned_count: 1,
            },
            writes: {
                call_count: 0,
                discovered_count: 0,
                external_or_caller_selected_count: 0,
                unowned_count: 0,
                entries: [],
            },
        } as GeneratedArtifactInventory;

        expect(() => assertCompleteArtifactInventory(incomplete))
            .toThrow('Unowned generated artifacts: runs/<scenario_run>/...');
    });

    it('fails closed when a canonical producer writes outside every ownership pattern', () => {
        write('docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md', `
# Generated Artifact Ownership

## Matrix

${HEADER}
| \`runs/<scenario_run>/...\` | run command | run test | Do not commit. | Default transient. |
`);
        write('tools/scenario_runner/unowned_write.ts', `
import { writeFileSync } from 'node:fs';
writeFileSync('mystery/output.json', '{}');
`);

        expect(() => buildGeneratedArtifactInventory(TMP_ROOT))
            .toThrow('Unowned generated artifact writes: mystery/output.json');
    });

    it('keeps every live scenario, replay/run, baseline, diagnostic, and package family owned', () => {
        const inventory = buildGeneratedArtifactInventory(process.cwd());

        expect(() => assertCompleteArtifactInventory(inventory)).not.toThrow();
        expect(inventory.coverage).toEqual({
            baseline: true,
            diagnostic: true,
            package: true,
            replay_or_run: true,
            scenario: true,
        });
        expect(inventory.summary.unowned_count).toBe(0);
        expect(inventory.writes.unowned_count).toBe(0);
        expect(inventory.artifacts.find((row) => row.artifact === 'tools/diagnostics/output/save_migration_drift.json')?.policy)
            .toBe('committed-golden-output');
        expect(inventory.artifacts.some((row) => row.artifact.startsWith('`'))).toBe(false);
    });
});
