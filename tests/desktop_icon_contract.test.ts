import assert from 'node:assert';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'vitest';

/**
 * LANE-V095-PLATFORM-ICON-APPID contract tests.
 *
 * Pins the v0.9.5 platform-icon + AppUserModelId deliverables (audit gaps
 * P1-G1, P1-G2, P2-G1):
 *   - build/icon.png present and at least 512x512
 *   - build/icon.ico present (multi-resolution Windows ICO)
 *   - electron-builder `build.icon` field declared
 *   - electron-main.cjs wires `icon:` on both BrowserWindow constructors
 *   - electron-main.cjs calls setAppUserModelId('com.awwv.desktop')
 *
 * Determinism: file presence + JSON parse + regex match. No Date / no Math.random.
 */

type PackageJson = {
    build?: {
        icon?: string;
    };
};

function readPackageJson(): PackageJson {
    return JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as PackageJson;
}

/** Decode the IHDR chunk of a PNG buffer to extract width/height. */
function readPngDimensions(buf: Buffer): { width: number; height: number } {
    // PNG signature: 8 bytes
    // First chunk must be IHDR: 4-byte length, 4-byte type "IHDR", 13-byte data,
    // first 4 bytes of data = width, next 4 = height (big-endian).
    assert.strictEqual(buf.readUInt8(0), 0x89, 'PNG signature byte 0');
    assert.strictEqual(buf.readUInt8(1), 0x50, 'PNG signature byte 1 (P)');
    assert.strictEqual(buf.readUInt8(2), 0x4e, 'PNG signature byte 2 (N)');
    assert.strictEqual(buf.readUInt8(3), 0x47, 'PNG signature byte 3 (G)');
    const ihdrType = buf.toString('ascii', 12, 16);
    assert.strictEqual(ihdrType, 'IHDR', 'first PNG chunk must be IHDR');
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
}

/** Decode the ICO directory to count embedded images. */
function readIcoImageCount(buf: Buffer): number {
    assert.strictEqual(buf.readUInt16LE(0), 0, 'ICO reserved field must be 0');
    assert.strictEqual(buf.readUInt16LE(2), 1, 'ICO type field must be 1 (icon)');
    return buf.readUInt16LE(4);
}

test('I1: build/icon.png exists and is at least 512x512', () => {
    const iconPath = join(process.cwd(), 'build', 'icon.png');
    assert.ok(existsSync(iconPath), `expected master icon at ${iconPath}`);
    const stat = statSync(iconPath);
    assert.ok(stat.size > 0, 'icon.png must not be empty');
    const buf = readFileSync(iconPath);
    const dims = readPngDimensions(buf);
    assert.ok(
        dims.width >= 512 && dims.height >= 512,
        `icon.png must be at least 512x512; got ${dims.width}x${dims.height}`,
    );
    assert.strictEqual(dims.width, dims.height, 'icon.png must be square');
});

test('I2: build/icon.ico exists with multiple embedded resolutions', () => {
    const icoPath = join(process.cwd(), 'build', 'icon.ico');
    assert.ok(existsSync(icoPath), `expected Windows ICO at ${icoPath}`);
    const stat = statSync(icoPath);
    assert.ok(stat.size > 0, 'icon.ico must not be empty');
    const buf = readFileSync(icoPath);
    const count = readIcoImageCount(buf);
    assert.ok(
        count >= 4,
        `icon.ico must embed at least 4 resolutions for Windows shell scaling; got ${count}`,
    );
});

test('I3: package.json build.icon field references build/icon.png', () => {
    const pkg = readPackageJson();
    assert.strictEqual(
        pkg.build?.icon,
        'build/icon.png',
        'electron-builder requires build.icon to point at the master 512x512 PNG so platform variants (Win .ico, Linux PNGs) are auto-derived',
    );
});

test('I4: electron-main.cjs wires icon on both BrowserWindow constructors', () => {
    const electronMain = readFileSync(
        join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'),
        'utf8',
    );
    // Each `new BrowserWindow({...})` must include an `icon:` field.
    // We require the dedicated helper getAppIconPath() so the path resolution
    // is single-source-of-truth and consistent across windows.
    const browserWindowMatches = Array.from(electronMain.matchAll(/new BrowserWindow\(\{[\s\S]*?\}\)/g));
    assert.ok(
        browserWindowMatches.length >= 2,
        `expected at least 2 BrowserWindow constructors; got ${browserWindowMatches.length}`,
    );
    for (const match of browserWindowMatches) {
        const ctor = match[0];
        assert.ok(
            /icon:\s*getAppIconPath\(\)/.test(ctor),
            `every BrowserWindow constructor must wire icon via getAppIconPath(); offending: ${ctor.slice(0, 120)}...`,
        );
    }

    // The helper itself must be defined and resolve through getBaseDir() so
    // dev (repo root) and packaged (process.resourcesPath/..) both work.
    assert.ok(
        /function getAppIconPath\(\)\s*\{[\s\S]*?getBaseDir\(\)[\s\S]*?'build'[\s\S]*?'icon\.png'/.test(electronMain),
        'getAppIconPath() must resolve build/icon.png through getBaseDir()',
    );
});

test('I5: electron-main.cjs calls setAppUserModelId(\'com.awwv.desktop\')', () => {
    const electronMain = readFileSync(
        join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'),
        'utf8',
    );
    assert.ok(
        /setAppUserModelId\(\s*['"]com\.awwv\.desktop['"]\s*\)/.test(electronMain),
        'electron-main.cjs must call app.setAppUserModelId(\'com.awwv.desktop\') so Windows taskbar, jump-list, and toast identity matches build.appId',
    );
});
