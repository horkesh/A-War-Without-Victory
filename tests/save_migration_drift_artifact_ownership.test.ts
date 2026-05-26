import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

const SAVE_MIGRATION_DRIFT_ARTIFACT = 'tools/diagnostics/output/save_migration_drift.json';
const SAVE_MIGRATION_DRIFT_OWNER = 'node tools/diagnostics/save_migration_drift_audit.cjs';
const SAVE_MIGRATION_DRIFT_SCRIPT = 'tools/diagnostics/save_migration_drift_audit.cjs';
const SAVE_MIGRATION_DRIFT_VALIDATION = 'tests/save_migration_drift_audit.test.ts';

function findOwnershipRow(ownershipDoc: string): string | undefined {
    return ownershipDoc
        .split(/\r?\n/)
        .find((line) => line.startsWith(`| \`${SAVE_MIGRATION_DRIFT_ARTIFACT}\``));
}

function assertSourceDoesNotUseNondeterministicApis(source: string): void {
    const forbiddenPatterns: Array<[RegExp, string]> = [
        [/\bDate\.now\s*\(/, 'Date.now'],
        [/\bnew\s+Date\s*\(/, 'new Date'],
        [/\bMath\.random\s*\(/, 'Math.random'],
        [/\brandomUUID\s*\(/, 'randomUUID'],
        [/\brandomBytes\s*\(/, 'randomBytes'],
        [/\bgetRandomValues\s*\(/, 'getRandomValues'],
    ];

    for (const [pattern, label] of forbiddenPatterns) {
        assert.doesNotMatch(source, pattern, `save migration drift audit should not use ${label}`);
    }
}

test('save migration drift generated artifact ownership stays aligned across docs, script, and committed JSON', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, scriptSource, artifactRaw] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, SAVE_MIGRATION_DRIFT_SCRIPT), 'utf8'),
        readFile(join(repoRoot, SAVE_MIGRATION_DRIFT_ARTIFACT), 'utf8'),
    ]);

    const ownershipRow = findOwnershipRow(ownershipDoc);
    assert.ok(ownershipRow, 'ownership docs should include the save migration drift artifact row');
    assert.ok(
        ownershipRow.includes(SAVE_MIGRATION_DRIFT_OWNER),
        'save migration drift ownership row should name the owner command',
    );
    assert.ok(
        ownershipRow.includes(SAVE_MIGRATION_DRIFT_VALIDATION),
        'save migration drift ownership row should name the validation test',
    );
    assert.match(
        ownershipRow,
        /Committed\.\s+Refresh after every migration registry change\./,
        'save migration drift ownership row should require commit refresh after migration registry changes',
    );

    assert.match(
        scriptSource,
        /const outputPath = resolve\(root, 'tools', 'diagnostics', 'output', 'save_migration_drift\.json'\);/,
        'save migration drift diagnostic should write the documented artifact path',
    );
    assert.strictEqual(
        [...scriptSource.matchAll(/save_migration_drift\.json/g)].length,
        1,
        'save migration drift diagnostic should name exactly one JSON output path',
    );
    assert.deepStrictEqual(
        Array.from(scriptSource.matchAll(/\bwriteFileSync\(([^,\n]+),/g), (match) => match[1].trim()),
        ['outputPath'],
        'save migration drift diagnostic should only write through the documented outputPath',
    );
    assert.match(
        scriptSource,
        /writeFileSync\(outputPath, `\$\{JSON\.stringify\(report, null, 2\)\}\\n`\);/,
        'save migration drift diagnostic should write through the documented outputPath',
    );

    const artifact = JSON.parse(artifactRaw) as { generated_by?: string };
    assert.strictEqual(
        artifact.generated_by,
        SAVE_MIGRATION_DRIFT_SCRIPT,
        'committed save migration drift JSON should identify its generator',
    );

    assertSourceDoesNotUseNondeterministicApis(scriptSource);
    assert.match(
        scriptSource,
        /\.sort\(strictCompare\)/,
        'anonymous default fields should be emitted in stable strictCompare order',
    );
    assert.match(
        scriptSource,
        /\.sort\(\(a, b\) => a\.version - b\.version \|\| strictCompare\(a\.path, b\.path\)\)/,
        'required field paths should be emitted in stable version/path order',
    );
    assert.match(
        scriptSource,
        /\.sort\(\(a, b\) => a\.version - b\.version\)/,
        'migration rows should be emitted in stable version order',
    );
});
