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
    assert.match(
        source,
        /waitForWindowLoad\(/,
        'packaged runtime probe should wait for the real main window load event',
    );
    assert.match(
        source,
        /window_checks:\s*\[/,
        'packaged runtime probe manifest should record the packaged main window load contract',
    );
    assert.match(
        source,
        /route:\s*warroomUrl[\s\S]*status:\s*'did-finish-load'/,
        'packaged runtime probe should assert the real packaged warroom window reaches did-finish-load',
    );
    assert.match(
        source,
        /app\.whenReady\(\)\.then\(\s*\(\)\s*=>\s*\{\s*registerProtocol\(\);[\s\S]*if \(RUNTIME_PROBE_MODE\)/,
        'probe mode must register the awwv protocol before trying to load the packaged main window',
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
    assert.match(
        source,
        /window_checks[\s\S]*awwv:\/\/warroom\/index\.html[\s\S]*did-finish-load/s,
        'probe tool should fail if the packaged manifest omits the initial main-window load proof',
    );
});
