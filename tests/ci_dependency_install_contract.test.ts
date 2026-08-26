import assert from 'node:assert';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

const WORKFLOW_INSTALL_PAIRS = [
    ['baseline-regression.yml', 5],
    ['desktop-release-guard.yml', 2],
    ['event-system-ci.yml', 1],
    ['full-suite-and-fingerprint.yml', 2],
    ['release.yml', 2],
    ['typecheck.yml', 1],
] as const;

test('CI dependency installs are immutable and workspace-local', async () => {
    const workflowDir = join(process.cwd(), '.github', 'workflows');
    const actualWorkflowNames = (await readdir(workflowDir))
        .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
        .sort();
    const expectedWorkflowNames = WORKFLOW_INSTALL_PAIRS.map(([name]) => name).sort();

    assert.deepStrictEqual(
        actualWorkflowNames,
        expectedWorkflowNames,
        'every workflow should be covered by the dependency-install contract',
    );

    for (const [name, expectedPairs] of WORKFLOW_INSTALL_PAIRS) {
        const workflow = await readFile(
            join(workflowDir, name),
            'utf8',
        );
        const installCommands = Array.from(
            workflow.matchAll(/^\s*(?:-\s+)?run:\s+(npm (?:ci|install)\b.*)$/gm),
            (match) => match[1],
        );
        const mapPairs = workflow.match(
            /^\s*(?:-\s+)?run:\s+npm ci --legacy-peer-deps\s*\r?\n\s+working-directory:\s+src\/ui\/map\s*$/gm,
        ) ?? [];

        assert.strictEqual(
            installCommands.length,
            expectedPairs * 2,
            `${name} should contain exactly ${expectedPairs} root/map install pairs`,
        );
        assert.ok(
            installCommands.every((command) => command === 'npm ci --legacy-peer-deps'),
            `${name} should use only the exact immutable install command`,
        );
        assert.strictEqual(
            mapPairs.length,
            expectedPairs,
            `${name} should run every map install from src/ui/map`,
        );
        assert.doesNotMatch(workflow, /\bnpm(?:\.cmd)?\s+install\b/, `${name} should not use lock-mutating npm install`);
        assert.doesNotMatch(workflow, /--prefix\b/, `${name} should not install a workspace through --prefix`);
    }
});

test('workflow documentation states the immutable root and map install convention', async () => {
    const readme = await readFile(
        join(process.cwd(), '.github', 'workflows', 'README.md'),
        'utf8',
    );

    assert.match(readme, /Install command: `npm ci --legacy-peer-deps`\./);
    assert.match(readme, /working-directory: src\/ui\/map/);
    assert.doesNotMatch(readme, /\bnpm(?:\.cmd)?\s+install\b/);
    assert.doesNotMatch(readme, /--prefix src\/ui\/map/);
});
