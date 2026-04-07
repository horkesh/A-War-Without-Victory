import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

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
        'npm run desktop:release:check && node .\\node_modules\\electron\\cli.js .',
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
});
