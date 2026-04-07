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
    assert.match(
        source,
        /getTacticalMapWindowUrl\(/,
        'secondary tactical-map window URLs should be built through one deterministic helper',
    );
    assert.doesNotMatch(
        source,
        /Date\.now\(/,
        'desktop tactical-map window routing should not depend on a timestamp cache buster',
    );
    assert.match(
        source,
        /packaged tactical map window/,
        'packaged runtime probe should exercise the real secondary tactical-map window path',
    );
    assert.match(
        source,
        /desktop_window=operational/,
        'secondary tactical-map probe should use a deterministic operational route marker',
    );
    assert.match(
        source,
        /packaged tactical sandbox window/,
        'packaged runtime probe should exercise the real tactical sandbox window path',
    );
    assert.match(
        source,
        /desktop_window=sandbox/,
        'tactical sandbox probe should use a deterministic sandbox route marker',
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
    assert.match(
        source,
        /window_checks[\s\S]*desktop_window=operational[\s\S]*did-finish-load/s,
        'probe tool should fail if the packaged manifest omits the tactical-map secondary window proof',
    );
    assert.match(
        source,
        /window_checks[\s\S]*tactical_sandbox\.html\?desktop_window=sandbox[\s\S]*did-finish-load/s,
        'probe tool should fail if the packaged manifest omits the tactical sandbox route proof',
    );
    assert.match(
        source,
        /awwv_desktop_runtime_probe_manifest\.json/,
        'probe tool should have a deterministic packaged-manifest fallback instead of relying only on GUI stdout',
    );
});
