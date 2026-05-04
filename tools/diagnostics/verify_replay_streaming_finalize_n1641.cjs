#!/usr/bin/env node
/**
 * LANE-NIGHTSHIFT-REPLAY-BUFFER-STREAMING — G3 verification helper.
 *
 * Stream-reads the 4.4 GB `replay_sequence.jsonl` from the n1641 OOM'd 188w
 * run and produces the consolidated `replay_save_sequence.json` artifact
 * WITHOUT loading the whole sequence into memory. This is a direct empirical
 * test of the streaming-finalize approach against the actual data that
 * blew the 8 GB heap last time.
 *
 * Determinism: pure read-only over disk, deterministic line-by-line.
 * No engine state, no GameState mutation, no Math.random / Date.now /
 * locale sort. Faction-agnostic by construction (does not parse state contents
 * beyond verifying it's a string).
 *
 * Output: writes `<runDir>/replay_save_sequence.json` and prints a one-line
 * summary with peak RSS, frames-streamed, and elapsed seconds.
 */
'use strict';

const { createReadStream, createWriteStream } = require('node:fs');
const { mkdir } = require('node:fs/promises');
const { createInterface } = require('node:readline');
const { join } = require('node:path');
const path = require('node:path');

async function main() {
    const runDir = process.argv[2];
    if (!runDir) {
        console.error('Usage: verify_replay_streaming_finalize_n1641.cjs <runDir>');
        process.exit(2);
    }
    const jsonlPath = join(runDir, 'replay_sequence.jsonl');
    const outPath = join(runDir, 'replay_save_sequence.json');

    await mkdir(runDir, { recursive: true });

    const out = createWriteStream(outPath, { flags: 'w', encoding: 'utf8' });

    const writeChunk = (chunk) =>
        new Promise((resolve, reject) => {
            const ok = out.write(chunk, (err) => {
                if (err) reject(err);
            });
            if (ok) resolve();
            else out.once('drain', () => resolve());
        });

    const closeStream = () =>
        new Promise((resolve, reject) => {
            out.on('finish', () => resolve());
            out.on('error', (err) => reject(err));
            out.end();
        });

    const startTime = process.hrtime.bigint();
    const inputStream = createReadStream(jsonlPath, { encoding: 'utf8' });
    const rl = createInterface({ input: inputStream, crlfDelay: Infinity });

    await writeChunk('[');
    let firstFrame = true;
    let framesStreamed = 0;
    let peakHeapMB = 0;
    let peakRssMB = 0;
    try {
        for await (const line of rl) {
            if (line.length === 0) continue;
            const row = JSON.parse(line);
            const stateStr = row.state;
            if (typeof stateStr !== 'string') {
                throw new Error(`Malformed JSONL row at frame ${framesStreamed}`);
            }
            if (!firstFrame) {
                await writeChunk(',');
            }
            await writeChunk(stateStr);
            firstFrame = false;
            framesStreamed++;
            // Periodically sample memory.
            if (framesStreamed % 10 === 0) {
                const mu = process.memoryUsage();
                peakHeapMB = Math.max(peakHeapMB, Math.round(mu.heapUsed / 1024 / 1024));
                peakRssMB = Math.max(peakRssMB, Math.round(mu.rss / 1024 / 1024));
            }
        }
    } finally {
        rl.close();
        inputStream.close();
    }
    await writeChunk(']');
    await closeStream();

    const elapsedNs = process.hrtime.bigint() - startTime;
    const elapsedSec = Number(elapsedNs) / 1e9;
    const finalMu = process.memoryUsage();
    peakHeapMB = Math.max(peakHeapMB, Math.round(finalMu.heapUsed / 1024 / 1024));
    peakRssMB = Math.max(peakRssMB, Math.round(finalMu.rss / 1024 / 1024));

    console.log(JSON.stringify({
        ok: true,
        run_dir: path.resolve(runDir),
        jsonl_input: jsonlPath,
        consolidated_output: outPath,
        frames_streamed: framesStreamed,
        elapsed_sec: Number(elapsedSec.toFixed(2)),
        peak_heap_mb: peakHeapMB,
        peak_rss_mb: peakRssMB,
    }));
}

main().catch((err) => {
    console.error('FAIL:', err.message);
    console.error(err.stack);
    process.exit(1);
});
