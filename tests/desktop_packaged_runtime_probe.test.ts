import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

test('package.json exposes one canonical packaged runtime probe command', async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as {
        scripts?: Record<string, string>;
    };

    assert.strictEqual(
        packageJson.scripts?.['desktop:package:probe'],
        'npm run desktop:package:dir && node tools\\desktop_packaged_runtime_probe.mjs',
        'packaged runtime probing should transitively inherit the canonical packaged-desktop contract',
    );
});

test('electron main exposes a packaged runtime probe mode instead of a second launch path', async () => {
    const source = await readFile(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');

    assert.match(
        source,
        /const RUNTIME_PROBE_MODE = process\.env\.AWWV_DESKTOP_RUNTIME_PROBE === '1';/,
        'packaged runtime probe should use an explicit env-controlled probe mode',
    );
    assert.match(
        source,
        /runPackagedRuntimeProbe\(\)/,
        'electron main should own the packaged runtime probe branch',
    );
    assert.match(
        source,
        /AWWV_DESKTOP_RUNTIME_PROBE_OK/,
        'probe mode should emit a stable success manifest for the external probe command',
    );
});

test('probe tool launches the unpacked packaged executable with the runtime probe env', async () => {
    const source = await readFile(join(process.cwd(), 'tools', 'desktop_packaged_runtime_probe.mjs'), 'utf8');

    assert.match(
        source,
        /dist-packaged.*win-unpacked.*A War Without Victory\.exe/s,
        'probe tool should target the canonical unpacked packaged executable',
    );
    assert.match(
        source,
        /AWWV_DESKTOP_RUNTIME_PROBE: '1'/,
        'probe tool should launch the packaged executable in dedicated probe mode',
    );
    assert.match(
        source,
        /AWWV_DESKTOP_RUNTIME_PROBE_OK/,
        'probe tool should require the stable success manifest from the packaged executable',
    );
});
