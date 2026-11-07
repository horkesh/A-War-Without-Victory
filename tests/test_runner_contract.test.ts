import assert from 'node:assert';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, vi } from 'vitest';
import { buildVitestSliceArgs, runVitestSlice } from '../tools/test/run_vitest_slice.mjs';

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

test('baseline regression workflow invokes the root compiler gate', async () => {
    const workflow = await readFile(
        join(process.cwd(), '.github', 'workflows', 'baseline-regression.yml'),
        'utf8',
    );

    assert.match(
        workflow,
        /npm run typecheck/,
        'baseline regression workflow should invoke the canonical root typecheck gate',
    );
});

test('the existing Baseline Regression test check opts into sector partitioning', async () => {
    const workflow = await readFile(join(process.cwd(), '.github/workflows/baseline-regression.yml'), 'utf8');
    const testJob = workflow.match(/^  test:\r?\n(?:    .*\r?\n|\r?\n)*/m)?.[0] ?? '';
    assert.match(testJob, /run: npm run test:vitest:fast -- --partition-sector-property\s*$/m);
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

const sectorProperty = 'tests/sector_partition_buildCorpsFrontSectors_integration.test.ts';
const partitionFlag = '--partition-sector-property';

async function withFastFixture(callback: (root: string) => void, includeProperty = true) {
    const root = await mkdtemp(join(tmpdir(), 'awwv-fast-slice-'));
    try {
        await mkdir(join(root, 'node_modules', 'vitest'), { recursive: true });
        await writeFile(join(root, 'node_modules', 'vitest', 'vitest.mjs'), '');
        await mkdir(join(root, 'tests'));
        const files = includeProperty ? [sectorProperty, 'tests/other.test.ts'] : ['tests/other.test.ts'];
        for (const file of files) await writeFile(join(root, file), "import { test } from 'vitest';\n");
        callback(root);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
}

test('the fast opt-in runs the exact sector file in four workers before its serial remainder', async () => {
    await withFastFixture(root => {
        const child = vi.fn().mockReturnValue({ status: 0 });
        assert.strictEqual(runVitestSlice(['fast', partitionFlag], root, child), 0);
        assert.deepStrictEqual(child.mock.calls.map(([, args]) => args), [
            [
                join(root, 'tools', 'test', 'run_vitest_balanced.mjs'),
                '--shards=4',
                '--match=^tests/sector_partition_buildCorpsFrontSectors_integration\\.test\\.ts$',
                '--', '--reporter=dot', '--silent',
            ],
            [
                join(root, 'node_modules', 'vitest', 'vitest.mjs'),
                'run', '--config', '.tmp_vitest_slice/vitest.slice.config.mjs',
                '--exclude', sectorProperty,
            ],
        ]);
    });
});

test('a failed property worker fails the fast job before launching the remainder', async () => {
    await withFastFixture(root => {
        const child = vi.fn().mockReturnValue({ status: 1 });
        assert.strictEqual(runVitestSlice(['fast', partitionFlag], root, child), 1);
        assert.strictEqual(child.mock.calls.length, 1);
    });
});

test('the default fast entry point keeps the existing serial invocation', async () => {
    await withFastFixture(root => {
        const child = vi.fn().mockReturnValue({ status: 0 });
        assert.strictEqual(runVitestSlice(['fast', '--', '--reporter=dot'], root, child), 0);
        assert.deepStrictEqual(child.mock.calls.map(([, args]) => args), [[
            join(root, 'node_modules', 'vitest', 'vitest.mjs'),
            'run', '--config', '.tmp_vitest_slice/vitest.slice.config.mjs', '--reporter=dot',
        ]]);
    });
});

test('the partition option refuses a missing fast target before launching children', async () => {
    await withFastFixture(root => {
        const child = vi.fn();
        assert.strictEqual(runVitestSlice(['fast', partitionFlag], root, child), 1);
        assert.strictEqual(child.mock.calls.length, 0);
    }, false);
});

test('the partition option refuses scenario and filtered commands before launching children', async () => {
    await withFastFixture(root => {
        const child = vi.fn();
        for (const args of [
            ['scenario', partitionFlag],
            ['fast', partitionFlag, '--', 'other.test.ts'],
        ]) {
            assert.strictEqual(runVitestSlice(args, root, child), 1);
        }
        assert.strictEqual(child.mock.calls.length, 0);
    });
});
