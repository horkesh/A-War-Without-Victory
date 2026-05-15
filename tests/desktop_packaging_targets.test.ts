import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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
    // The lane requires unsigned NSIS. electron-builder uses
    //   win.signAndEditExecutable: false  (skip signtool/edit dance)
    // win.sign: null was tried but caused electron-builder to attempt
    // default signing in CI; redundant with signAndEditExecutable: false.
    // Removed 2026-05-04 (LANE-NIGHTSHIFT-DRG-REGRESSION-FIX).
    assert.strictEqual(
        pkg.build?.win?.signAndEditExecutable,
        false,
        'win.signAndEditExecutable must be false for the unsigned groundwork target',
    );
    assert.strictEqual(
        pkg.build?.win?.sign,
        undefined,
        'win.sign must be undefined; signAndEditExecutable: false is the canonical unsigned switch',
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

test('T4: artifact smoke reports include deterministic release-log facts', () => {
    const root = process.cwd();
    const tmp = mkdtempSync(join(tmpdir(), 'awwv-smoke-report-'));
    try {
        const appImagePath = join(tmp, 'AWWV-Test.AppImage');
        const appImage = Buffer.alloc(32, 0);
        Buffer.from([0x7f, 0x45, 0x4c, 0x46]).copy(appImage, 0);
        Buffer.from([0x41, 0x49, 0x02]).copy(appImage, 8);
        writeFileSync(appImagePath, appImage);
        chmodSync(appImagePath, 0o755);

        const exePath = join(tmp, 'AWWV Test Setup.exe');
        const exe = Buffer.alloc(4 * 1024 * 1024, 0);
        Buffer.from([0x4d, 0x5a]).copy(exe, 0);
        exe.writeUInt32LE(0x80, 0x3c);
        Buffer.from([0x50, 0x45, 0x00, 0x00]).copy(exe, 0x80);
        writeFileSync(exePath, exe);

        const linuxResult = spawnSync(process.execPath, ['tools/build/linux_appimage_smoke.cjs', appImagePath], {
            cwd: root,
            encoding: 'utf8',
        });
        assert.strictEqual(linuxResult.status, 0, linuxResult.stderr);
        const linuxReport = JSON.parse(linuxResult.stdout) as {
            sizeBytes?: number;
            sha256?: string;
            releaseLog?: string;
        };
        assert.strictEqual(linuxReport.sizeBytes, appImage.length);
        assert.strictEqual(linuxReport.sha256, createHash('sha256').update(appImage).digest('hex'));
        assert.match(linuxReport.releaseLog ?? '', /sha256=/);
        assert.match(linuxReport.releaseLog ?? '', /sizeBytes=32/);

        const winResult = spawnSync(process.execPath, ['tools/build/win_nsis_smoke.cjs', exePath], {
            cwd: root,
            encoding: 'utf8',
        });
        assert.strictEqual(winResult.status, 0, winResult.stderr);
        const winReport = JSON.parse(winResult.stdout) as {
            sizeBytes?: number;
            sha256?: string;
            releaseLog?: string;
        };
        assert.strictEqual(winReport.sizeBytes, exe.length);
        assert.strictEqual(winReport.sha256, createHash('sha256').update(exe).digest('hex'));
        assert.match(winReport.releaseLog ?? '', /sha256=/);
        assert.match(winReport.releaseLog ?? '', /sizeBytes=4194304/);
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
});
