#!/usr/bin/env node

import process from 'node:process';

import {
    getStartupSnapshotPath,
    type StartupSnapshotKey,
    validateStartupSnapshot,
    writeStartupSnapshot,
} from '../../src/scenario/startup_snapshot.js';

type Mode = 'write' | 'check';

function parseArgs(): { key: StartupSnapshotKey; mode: Mode } {
    const args = process.argv.slice(2);
    let key: StartupSnapshotKey = 'apr_1992';
    let mode: Mode = 'check';

    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === '--key' && args[i + 1] === 'apr_1992') {
            key = 'apr_1992';
            i += 1;
            continue;
        }
        if (arg === '--write') {
            mode = 'write';
            continue;
        }
        if (arg === '--check') {
            mode = 'check';
            continue;
        }
        throw new Error(`Unknown argument: ${arg}`);
    }

    return { key, mode };
}

async function main(): Promise<void> {
    const { key, mode } = parseArgs();
    const baseDir = process.cwd();

    if (mode === 'write') {
        const result = await writeStartupSnapshot(baseDir, key);
        process.stdout.write(`Wrote startup snapshot: ${result.path}\n`);
        return;
    }

    const result = await validateStartupSnapshot(baseDir, key);
    if (!result.matches) {
        process.stderr.write(`Startup snapshot drift detected for ${key}: ${result.path}\n`);
        process.exitCode = 1;
        return;
    }
    process.stdout.write(`Startup snapshot OK: ${getStartupSnapshotPath(baseDir, key)}\n`);
}

main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
});
