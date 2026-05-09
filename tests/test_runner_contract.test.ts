import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';
// @ts-expect-error JS-only repo helper exercised at runtime by the test suite.
import { buildVitestSliceArgs } from '../tools/test/run_vitest_slice.mjs';

type PackageJson = {
    scripts?: Record<string, string>;
};

test('package.json routes canonical test commands through Vitest lanes only', async () => {
    const packageJson = JSON.parse(
        await readFile(join(process.cwd(), 'package.json'), 'utf8'),
    ) as PackageJson;

    assert.strictEqual(
        packageJson.scripts?.test,
        'npm run test:vitest:fast',
        'npm test should point at the canonical fast Vitest slice',
    );
    assert.strictEqual(
        packageJson.scripts?.['test:engine'],
        'npm run test:vitest:fast',
        'test:engine should remain a compatibility alias for the fast Vitest slice',
    );
    assert.strictEqual(
        packageJson.scripts?.['test:coverage'],
        'vitest run --coverage',
        'test:coverage should use the single canonical Vitest coverage owner',
    );
    assert.strictEqual(
        packageJson.scripts?.['test:node:progress'],
        'npm run test:vitest:fast',
        'test:node:progress should no longer route through a retired node:test runner',
    );
    assert.strictEqual(
        packageJson.scripts?.['qa:all'],
        'npm run typecheck && npm run test:coverage && npm run desktop:map:build && npm run test:baselines',
        'qa:all should run the canonical coverage/build/baseline chain without duplicate runner passes',
    );

    for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
        assert.doesNotMatch(
            command,
            /run_node_tests\.mjs/,
            `${name} should not reference the retired node:test runner`,
        );
    }
});

test('typecheck workflow installs nested map deps before running the root compiler gate', async () => {
    const workflow = await readFile(
        join(process.cwd(), '.github', 'workflows', 'typecheck.yml'),
        'utf8',
    );

    const nestedInstalls = workflow.match(/npm install --legacy-peer-deps --prefix src\/ui\/map/g) ?? [];

    assert.strictEqual(
        nestedInstalls.length,
        1,
        'typecheck workflow should install nested map UI dependencies exactly once',
    );
    assert.match(
        workflow,
        /npm run typecheck/,
        'typecheck workflow should invoke the canonical root typecheck script',
    );
});

test('Vitest slice runner uses a project file list instead of expanding every test as argv', () => {
    const root = process.cwd();
    const files = [
        join(root, 'tests', 'alpha.test.ts'),
        join(root, 'tests', 'bravo.test.ts'),
        join(root, 'tests', 'charlie.test.ts'),
    ];

    const args = buildVitestSliceArgs(root, files, ['--reporter=dot']);

    assert.deepStrictEqual(args, [
        'run',
        '--config',
        '.tmp_vitest_slice/vitest.slice.config.mjs',
        '--reporter=dot',
    ]);
});
