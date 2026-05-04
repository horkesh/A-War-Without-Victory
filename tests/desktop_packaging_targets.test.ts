import assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'vitest';

/**
 * LANE-NIGHTSHIFT-PLATFORM-PACKAGING-GROUNDWORK contract tests.
 *
 * These pin the v0.9.5 packaging-groundwork deliverables:
 * - Linux AppImage target declared
 * - Windows unsigned NSIS target declared
 * - Smoke scripts present under tools/build/
 *
 * They intentionally do not invoke electron-builder or actually build
 * installers (slow, may require host deps). Verification is config + file
 * presence only, matching the lane spec.
 */

type LinuxBuild = { target?: Array<string | { target: string }>; category?: string };
type WinBuild = {
    target?: Array<string | { target: string }>;
    signAndEditExecutable?: boolean;
    sign?: unknown;
};
type PackageJson = {
    scripts?: Record<string, string>;
    build?: {
        win?: WinBuild;
        linux?: LinuxBuild;
        nsis?: Record<string, unknown>;
    };
};

function readPackageJson(): PackageJson {
    return JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as PackageJson;
}

function flattenTargets(target: Array<string | { target: string }> | undefined): string[] {
    if (!target) return [];
    return target.map((entry) => (typeof entry === 'string' ? entry : entry.target));
}

test('T1: package.json build section declares Linux AppImage target', () => {
    const pkg = readPackageJson();
    const linuxTargets = flattenTargets(pkg.build?.linux?.target);
    assert.ok(
        linuxTargets.includes('AppImage'),
        `Linux AppImage target must be declared in build.linux.target. Got: ${JSON.stringify(linuxTargets)}`,
    );
    assert.strictEqual(
        pkg.scripts?.['desktop:package:linux:appimage'],
        'npm run desktop:release:check && electron-builder --linux AppImage --publish never',
        'desktop:package:linux:appimage script should reuse the canonical desktop:release:check guard',
    );
});

test('T2: package.json build section declares Win NSIS target with sign: false', () => {
    const pkg = readPackageJson();
    const winTargets = flattenTargets(pkg.build?.win?.target);
    assert.ok(
        winTargets.includes('nsis'),
        `Win nsis target must be declared in build.win.target. Got: ${JSON.stringify(winTargets)}`,
    );
    // The lane requires unsigned NSIS. electron-builder uses two complementary fields:
    //   - win.signAndEditExecutable: false  (skip signtool/edit dance)
    //   - win.sign: null                    (no custom signer hook)
    assert.strictEqual(
        pkg.build?.win?.signAndEditExecutable,
        false,
        'win.signAndEditExecutable must be false for the unsigned groundwork target',
    );
    assert.strictEqual(
        pkg.build?.win?.sign,
        null,
        'win.sign must be null (no signing) for the unsigned groundwork target',
    );
    assert.strictEqual(
        pkg.scripts?.['desktop:package:win:nsis'],
        'npm run desktop:release:check && electron-builder --win nsis --publish never',
        'desktop:package:win:nsis script should reuse the canonical desktop:release:check guard',
    );
});

test('T3: tools/build/ contains both smoke scripts', () => {
    const root = process.cwd();
    const linuxSmoke = join(root, 'tools', 'build', 'linux_appimage_smoke.cjs');
    const winSmoke = join(root, 'tools', 'build', 'win_nsis_smoke.cjs');
    assert.ok(existsSync(linuxSmoke), `expected smoke script at ${linuxSmoke}`);
    assert.ok(existsSync(winSmoke), `expected smoke script at ${winSmoke}`);

    // Sanity: scripts must be CommonJS (not ESM) and must declare 'use strict'.
    const linuxSrc = readFileSync(linuxSmoke, 'utf8');
    const winSrc = readFileSync(winSmoke, 'utf8');
    assert.ok(linuxSrc.startsWith("'use strict'"), 'linux smoke script must be strict-mode CJS');
    assert.ok(winSrc.startsWith("'use strict'"), 'win smoke script must be strict-mode CJS');
    assert.ok(linuxSrc.includes("require('node:fs')"), 'linux smoke script must use node:fs');
    assert.ok(winSrc.includes("require('node:fs')"), 'win smoke script must use node:fs');
});
