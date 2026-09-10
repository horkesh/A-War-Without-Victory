import assert from 'node:assert';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

const WORKFLOW_INSTALL_COUNTS = [
    ['baseline-regression.yml', 5],
    ['desktop-release-guard.yml', 2],
    ['event-system-ci.yml', 2],
    ['full-suite-and-fingerprint.yml', 2],
    ['release.yml', 2],
] as const;

test('CI dependency installs are immutable and workspace-local', async () => {
    const workflowDir = join(process.cwd(), '.github', 'workflows');
    const actualWorkflowNames = (await readdir(workflowDir))
        .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
        .sort();
    const expectedWorkflowNames = WORKFLOW_INSTALL_COUNTS.map(([name]) => name).sort();

    assert.deepStrictEqual(
        actualWorkflowNames,
        expectedWorkflowNames,
        'every workflow should be covered by the dependency-install contract',
    );

    for (const [name, expectedInstalls] of WORKFLOW_INSTALL_COUNTS) {
        const workflow = await readFile(
            join(workflowDir, name),
            'utf8',
        );
        const installCommands = Array.from(
            workflow.matchAll(/^\s*(?:-\s+)?run:\s+(npm (?:ci|install)\b.*)$/gm),
            (match) => match[1],
        );
        assert.strictEqual(
            installCommands.length,
            expectedInstalls,
            `${name} should contain exactly ${expectedInstalls} root workspace installs`,
        );
        assert.ok(
            installCommands.every((command) => command === 'npm ci --legacy-peer-deps'),
            `${name} should use only the exact immutable install command`,
        );
        assert.doesNotMatch(
            workflow,
            /working-directory:\s+src\/ui\/map/,
            `${name} should not install the map workspace separately from the root lock authority`,
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
    assert.match(readme, /root `npm ci --legacy-peer-deps` includes `src\/ui\/map` through the declared npm workspace/);
    assert.match(readme, /Do not run a second map install/);
    assert.doesNotMatch(readme, /\bnpm(?:\.cmd)?\s+install\b/);
    assert.doesNotMatch(readme, /--prefix src\/ui\/map/);
});
