import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

test('package.json exposes one canonical desktop release check script', async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as {
        scripts?: Record<string, string>;
    };

    assert.strictEqual(
        packageJson.scripts?.['desktop:release:check'],
        'npm run desktop:map:build && npm run desktop:sim:build && npm run warroom:build',
        'desktop:release:check should define the canonical shipped-build verification path',
    );
    assert.strictEqual(
        packageJson.scripts?.desktop,
        'npm run desktop:release:check && electron .',
        'desktop runtime launch should transitively use the canonical desktop release check path',
    );
});

test('ci workflow enforces the canonical desktop release check on main and pull requests', async () => {
    const workflow = await readFile(
        join(process.cwd(), '.github', 'workflows', 'desktop-release-guard.yml'),
        'utf8',
    );

    assert.match(
        workflow,
        /pull_request:\s*\n\s*branches:\s*\[main\]/,
        'desktop release guard should run on pull requests against main',
    );
    assert.match(
        workflow,
        /push:\s*\n\s*branches:\s*\[main\]/,
        'desktop release guard should run on pushes to main',
    );
    assert.match(
        workflow,
        /npm run desktop:release:check/,
        'desktop release guard should invoke the canonical shipped-build verification path',
    );
    assert.match(
        workflow,
        /npm install --legacy-peer-deps --prefix src\/ui\/map/,
        'desktop release guard should install nested map UI dependencies before running cross-platform release checks',
    );
});

test('desktop release workflow enforces packaged runtime probe on windows', async () => {
    const workflow = await readFile(
        join(process.cwd(), '.github', 'workflows', 'desktop-release-guard.yml'),
        'utf8',
    );

    assert.match(
        workflow,
        /desktop-packaged-runtime-probe:/,
        'desktop release guard should define a dedicated packaged runtime probe job',
    );
    assert.match(
        workflow,
        /runs-on:\s*windows-latest/,
        'packaged runtime probe should run on a Windows runner because it launches the packaged executable',
    );
    assert.match(
        workflow,
        /npm run desktop:package:probe/,
        'desktop release guard should invoke the canonical packaged runtime probe command',
    );
});

test('desktop path filter watches packaged dependencies and runtime resources', async () => {
    const detector = await readFile(
        join(process.cwd(), '.github', 'scripts', 'detect-changed-paths.sh'),
        'utf8',
    );

    const desktopCaseStart = detector.indexOf('  desktop)');
    const simCaseStart = detector.indexOf('  sim)');
    const desktopCase = detector.slice(desktopCaseStart, simCaseStart);

    assert.match(desktopCase, /"package-lock\.json"/, 'lockfile-only desktop dependency changes should run desktop package/probe gates');
    assert.match(desktopCase, /"\.github\/workflows\/release\.yml"/, 'release workflow edits should run desktop package/probe gates');
    assert.match(desktopCase, /"data\/derived\/"/, 'packaged derived-data changes should run desktop package/probe gates');
    assert.match(desktopCase, /"data\/ui\/"/, 'packaged UI-data changes should run desktop package/probe gates');
    assert.match(desktopCase, /"data\/scenarios\/events\/"/, 'packaged event catalog changes should run desktop package/probe gates');
    assert.match(desktopCase, /"assets\/"/, 'packaged root asset changes should run desktop package/probe gates');
    assert.match(desktopCase, /"build\/icon\.png"/, 'packaged icon changes should run desktop package/probe gates');
});

test('trusted detector checkout is restored before tests and builds run', async () => {
    const workflowPaths = [
        join(process.cwd(), '.github', 'workflows', 'baseline-regression.yml'),
        join(process.cwd(), '.github', 'workflows', 'desktop-release-guard.yml'),
        join(process.cwd(), '.github', 'workflows', 'full-suite-and-fingerprint.yml'),
    ];

    for (const workflowPath of workflowPaths) {
        const workflow = await readFile(workflowPath, 'utf8');
        const trustedCheckoutCount = (workflow.match(/git checkout "origin\/\$\{base_ref\}" -- \.github\/scripts\/detect-[^\s]+\.sh/g) ?? []).length;
        const restoreCount = (workflow.match(/git restore --source=HEAD -- \.github\/scripts\/detect-[^\s]+\.sh/g) ?? []).length;
        assert.strictEqual(
            restoreCount,
            trustedCheckoutCount,
            `${workflowPath} should restore trusted detector checkouts so later tests/builds see the PR version`,
        );
    }
});

test('sim path filter does not force engine-health for CI-only detector workflow edits', async () => {
    const detector = await readFile(
        join(process.cwd(), '.github', 'scripts', 'detect-changed-paths.sh'),
        'utf8',
    );

    const simCaseStart = detector.indexOf('  sim)');
    const defaultCaseStart = detector.indexOf('  *)');
    const simCase = detector.slice(simCaseStart, defaultCaseStart);

    assert.doesNotMatch(
        simCase,
        /"\.github\/workflows\/baseline-regression\.yml"/,
        'baseline workflow edits should not force the 188w engine-health gate without sim/scenario changes',
    );
    assert.doesNotMatch(
        simCase,
        /"\.github\/scripts\/detect-changed-paths\.sh"/,
        'trusted detector edits should not force the 188w engine-health gate; base-branch detector integrity already prevents bypass',
    );
});

test('release workflow runs packaged runtime probe before publishing windows artifacts', async () => {
    const workflow = await readFile(
        join(process.cwd(), '.github', 'workflows', 'release.yml'),
        'utf8',
    );

    const windowsJobStart = workflow.indexOf('  build-windows:');
    const releaseJobStart = workflow.indexOf('  release:');
    const windowsJob = workflow.slice(windowsJobStart, releaseJobStart);
    const probeStart = windowsJob.indexOf('npm run desktop:package:probe');
    const packageStart = windowsJob.indexOf('npm run desktop:package:win:nsis');
    const uploadStart = windowsJob.indexOf('name: Upload Windows NSIS workflow artifact');

    assert.notStrictEqual(probeStart, -1, 'release Windows job should run the packaged runtime probe');
    assert.ok(packageStart > probeStart, 'release Windows runtime probe should run before installer packaging');
    assert.ok(uploadStart > packageStart, 'release Windows upload should remain after installer packaging');
});
