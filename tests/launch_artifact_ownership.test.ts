import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const MATRIX_KEY = 'dist-packaged/...';

function splitMarkdownTableRow(line: string): string[] {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
        return [];
    }
    return trimmed
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim());
}

test('packaged release artifacts are operator-owned transient outputs', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, gitignore, launchDay, checklist] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, '.gitignore'), 'utf8'),
        readFile(join(repoRoot, 'docs', '50_launch', 'release', 'launch_day_automation_template.md'), 'utf8'),
        readFile(join(repoRoot, 'docs', '50_launch', 'release', 'checklist.md'), 'utf8'),
    ]);

    assert.match(gitignore, /^dist-packaged\/$/m, 'dist-packaged/ should stay ignored');

    const rowLine = ownershipDoc
        .split(/\r?\n/)
        .find((line) => line.startsWith('| `dist-packaged/...`'));
    assert.ok(rowLine, 'ownership matrix should include dist-packaged/... transient package outputs');

    const cells = splitMarkdownTableRow(rowLine);
    assert.strictEqual(cells.length, 5, 'dist-packaged ownership row should have 5 columns');
    assert.strictEqual(cells[0], '`dist-packaged/...`');
    assert.ok(cells[1].includes('desktop:package'), 'row should name desktop/package owner commands');
    assert.ok(cells[2].includes('tests/launch_operator_artifacts.test.ts'), 'row should cite launch operator artifact guard');
    assert.ok(cells[2].includes('tests/launch_artifact_ownership.test.ts'), 'row should cite ownership guard');
    assert.ok(cells[3].includes('Do not commit'), 'row should keep packaged binaries out of git');
    assert.ok(cells[4].includes('Always transient'), 'row should classify release package outputs as transient');

    assert.ok(launchDay.includes('npm.cmd run launch:artifacts:dry-run'), 'launch day docs should use the dry-run planner');
    assert.ok(checklist.includes('npm.cmd run launch:artifacts:dry-run'), 'release checklist should use the dry-run planner');

    const { stdout } = await execFileAsync('git', ['ls-files', '--', 'dist-packaged'], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    assert.strictEqual(stdout.trim(), '', 'dist-packaged/ should have no committed release artifacts');
});
