import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

const STARTUP_SNAPSHOT_ARTIFACT = 'data/derived/startup/apr_1992_initial_save.json';

function findOwnershipRow(ownershipDoc: string): string | undefined {
    return ownershipDoc
        .split(/\r?\n/)
        .find((line) => line.startsWith(`| \`${STARTUP_SNAPSHOT_ARTIFACT}\``));
}

function parseStartupSnapshotDefinitionKeys(source: string): string[] {
    const match = source.match(/const STARTUP_SNAPSHOT_DEFINITIONS:[\s\S]*?=\s*\{([\s\S]*?)\};/);
    assert.ok(match, 'startup_snapshot.ts should define STARTUP_SNAPSHOT_DEFINITIONS');
    return Array.from(match[1].matchAll(/^\s+([a-z0-9_]+):\s*\{/gm), (keyMatch) => keyMatch[1]).sort();
}

test('startup snapshot generated artifact ownership stays aligned across docs, package scripts, source, and builder CLI', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, packageRaw, startupSnapshotSource, builderSource] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, 'package.json'), 'utf8'),
        readFile(join(repoRoot, 'src', 'scenario', 'startup_snapshot.ts'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'scenario_runner', 'build_startup_snapshot.ts'), 'utf8'),
    ]);

    const ownershipRow = findOwnershipRow(ownershipDoc);
    assert.ok(ownershipRow, 'ownership docs should include the April 1992 startup snapshot artifact row');
    assert.ok(
        ownershipRow.includes('npm.cmd run desktop:startup-snapshot:build'),
        'startup snapshot ownership row should name the owner build command',
    );

    for (const validation of [
        'npm.cmd run desktop:startup-snapshot:check',
        'tests/startup_snapshot_contract.test.ts',
        'tests/save_migration_round_trip_contract.test.ts',
    ]) {
        assert.ok(
            ownershipRow.includes(validation),
            `startup snapshot ownership row should name validation ${validation}`,
        );
    }

    const packageJson = JSON.parse(packageRaw) as {
        scripts?: Record<string, string>;
    };
    assert.strictEqual(
        packageJson.scripts?.['desktop:startup-snapshot:build'],
        'tsx tools/scenario_runner/build_startup_snapshot.ts --write',
    );
    assert.strictEqual(
        packageJson.scripts?.['desktop:startup-snapshot:check'],
        'tsx tools/scenario_runner/build_startup_snapshot.ts --check',
    );

    assert.deepStrictEqual(
        parseStartupSnapshotDefinitionKeys(startupSnapshotSource),
        ['apr_1992'],
        'startup_snapshot.ts should only define the approved April 1992 startup key',
    );
    assert.match(
        startupSnapshotSource,
        /export type StartupSnapshotKey = 'apr_1992';/,
        'StartupSnapshotKey should only allow apr_1992',
    );
    assert.ok(
        startupSnapshotSource.includes(`artifactRelativePath: '${STARTUP_SNAPSHOT_ARTIFACT}'`),
        'startup_snapshot.ts should own the documented startup snapshot artifact path',
    );

    assert.match(
        builderSource,
        /import\s*\{[\s\S]*validateStartupSnapshot,[\s\S]*writeStartupSnapshot,[\s\S]*\}\s*from '\.\.\/\.\.\/src\/scenario\/startup_snapshot\.js';/,
        'startup snapshot builder should import writeStartupSnapshot and validateStartupSnapshot',
    );
    assert.match(
        builderSource,
        /await writeStartupSnapshot\(baseDir, key\)/,
        'startup snapshot builder should call writeStartupSnapshot in write mode',
    );
    assert.match(
        builderSource,
        /await validateStartupSnapshot\(baseDir, key\)/,
        'startup snapshot builder should call validateStartupSnapshot in check mode',
    );
});
