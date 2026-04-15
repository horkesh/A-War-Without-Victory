import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { copyFile, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const SNAPSHOT_OVERRIDE_ENV = 'AWWV_STARTUP_SNAPSHOT_OVERRIDE_APR_1992';

function runDesktopSimBuild(
    cwd: string,
    extraEnv?: Record<string, string>,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['tools/desktop_bundle_sim.mjs'], {
            cwd,
            env: {
                ...process.env,
                ...extraEnv,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => {
            stdout += String(chunk);
        });
        child.stderr.on('data', (chunk) => {
            stderr += String(chunk);
        });
        child.on('error', reject);
        child.on('close', (code) => {
            resolve({ code, stdout, stderr });
        });
    });
}

async function createTempSnapshotCopy(baseDir: string): Promise<{ tempDir: string; snapshotPath: string }> {
    const sourceSnapshotPath = join(baseDir, 'data', 'derived', 'startup', 'apr_1992_initial_save.json');
    const tempDir = await mkdtemp(join(tmpdir(), 'awwv-startup-guard-'));
    const snapshotPath = join(tempDir, 'apr_1992_initial_save.json');
    await copyFile(sourceSnapshotPath, snapshotPath);
    return { tempDir, snapshotPath };
}

test('desktop sim build source enforces startup snapshot check before bundling', async () => {
    const source = await readFile(join(process.cwd(), 'tools', 'desktop_bundle_sim.mjs'), 'utf8');

    assert.match(
        source,
        /startupSnapshotCheckScript[\s\S]*--check/,
        'desktop sim build should run the startup snapshot check before bundling',
    );
    assert.match(
        source,
        /desktop:sim:build aborted because the baked startup snapshot is missing or stale/,
        'desktop sim build should fail with an explicit remediation message when the startup artifact is invalid',
    );
});

test('desktop sim build fails loudly when the baked startup snapshot is missing', async () => {
    const baseDir = process.cwd();
    const { tempDir, snapshotPath } = await createTempSnapshotCopy(baseDir);
    const backupPath = `${snapshotPath}.bak`;

    assert.ok(existsSync(snapshotPath), 'expected committed startup snapshot to exist');
    await rm(backupPath, { force: true });
    await rename(snapshotPath, backupPath);

    try {
        const result = await runDesktopSimBuild(baseDir, {
            [SNAPSHOT_OVERRIDE_ENV]: snapshotPath,
        });
        assert.notStrictEqual(result.code, 0, 'desktop sim build should fail when startup snapshot is missing');
        assert.match(
            `${result.stdout}\n${result.stderr}`,
            /missing or stale|ENOENT|Startup snapshot/,
            'failure should point at the startup snapshot guard rather than bundling silently',
        );
    } finally {
        if (existsSync(backupPath)) {
            await rename(backupPath, snapshotPath);
        }
        await rm(tempDir, { recursive: true, force: true });
    }
}, 120_000);

test('desktop sim build fails loudly when the baked startup snapshot drifts', async () => {
    const baseDir = process.cwd();
    const { tempDir, snapshotPath } = await createTempSnapshotCopy(baseDir);
    const backupPath = `${snapshotPath}.bak`;

    await rm(backupPath, { force: true });
    await copyFile(snapshotPath, backupPath);

    try {
        await writeFile(snapshotPath, '{"stale":true}\n', 'utf8');
        const result = await runDesktopSimBuild(baseDir, {
            [SNAPSHOT_OVERRIDE_ENV]: snapshotPath,
        });
        assert.notStrictEqual(result.code, 0, 'desktop sim build should fail when startup snapshot drifts');
        assert.match(
            `${result.stdout}\n${result.stderr}`,
            /drift detected|missing or stale|Startup snapshot/,
            'failure should point at snapshot drift instead of shipping the stale artifact',
        );
    } finally {
        if (existsSync(backupPath)) {
            await rename(backupPath, snapshotPath);
        }
        await rm(tempDir, { recursive: true, force: true });
    }
}, 120_000);
