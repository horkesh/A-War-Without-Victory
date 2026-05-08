/**
 * Tests for the heap-profile instrumentation module
 * (LANE-NIGHTSHIFT-V093-HEAP-PROFILE-REDISPATCH).
 *
 * Module under test: src/sim/perf/heap_profile.ts
 *
 * Verifies:
 *   1. Default-OFF: env flag absent at module load → maybeWriteHeapSnapshot
 *      short-circuits and writes nothing. (Determinism gate.)
 *   2. Schedule parser: HEAP_PROFILE_TURNS string → sorted-deduped-int[].
 *      Default fallback `[60, 120, 180]` when unset/empty/malformed.
 *   3. ON-path with matching turn writes a real snapshot file to the
 *      configured debug directory.
 *   4. ON-path with non-matching turn writes nothing.
 *   5. Idempotent: a second call for the same (turn, runId) is a no-op.
 *
 * Notes:
 *   - The flag is captured at module load, so we cannot flip it within a
 *     single test process. Tests use the test-hook `forceWriteForTest` to
 *     drive the write path with a synthetic schedule, and the parser export
 *     `parseHeapProfileTurns` directly to validate parsing without relying
 *     on env mutation.
 *   - Snapshots are written into a per-test temp dir (`tests/.tmp_heap_profile`)
 *     and cleaned afterward; we never touch `data/derived/_debug/`.
 *   - v8.writeHeapSnapshot is synchronous; we assert that the file exists
 *     immediately after the call returns.
 */

import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    __heapProfileTestHooks,
    computeHeapSnapshotPath,
    getHeapProfileTurns,
    isHeapProfileEnabled,
    maybeWriteHeapSnapshot,
    parseHeapProfileTurns,
} from '../../../src/sim/perf/heap_profile.js';

describe('heap_profile — env-flag default-OFF discipline', () => {
    beforeEach(() => {
        __heapProfileTestHooks.resetWrittenKeys();
    });

    afterEach(() => {
        __heapProfileTestHooks.resetWrittenKeys();
    });

    it('default-OFF: maybeWriteHeapSnapshot returns false when env flag was unset at module load', () => {
        // The module-load-time flag should be false in the standard test
        // environment (HEAP_PROFILE_188W is unset). If a developer runs the
        // suite with the flag set, this test is a SKIP because we cannot
        // un-flip a constant captured at import time.
        if (__heapProfileTestHooks.moduleLoadTimeFlag()) {
            // Defensive — should never happen in CI.
            return;
        }
        expect(isHeapProfileEnabled()).toBe(false);

        // Calling the hook with valid turns/scenario/runId must NOT write.
        const tmpDir = mkdtempSync(join(tmpdir(), 'heap-prof-off-'));
        try {
            const wrote = maybeWriteHeapSnapshot(60, 'apr1992_definitive_40w', 'run-test-off', tmpDir);
            expect(wrote).toBe(false);
            // Directory may or may not exist; either way it must contain
            // no .heapsnapshot files since the flag was OFF.
            const files = existsSync(tmpDir) ? readdirSync(tmpDir) : [];
            expect(files.filter((f) => f.endsWith('.heapsnapshot'))).toEqual([]);
        } finally {
            try {
                rmSync(tmpDir, { recursive: true, force: true });
            } catch {
                // Ignore cleanup error.
            }
        }
    });
});

describe('heap_profile — HEAP_PROFILE_TURNS parser', () => {
    it('parses unset → default [60, 120, 180]', () => {
        expect(parseHeapProfileTurns(undefined)).toEqual([60, 120, 180]);
    });

    it('parses empty string → default [60, 120, 180]', () => {
        expect(parseHeapProfileTurns('')).toEqual([60, 120, 180]);
    });

    it('parses single value', () => {
        expect(parseHeapProfileTurns('42')).toEqual([42]);
    });

    it('parses comma-separated list with whitespace and dedupes/sorts ascending', () => {
        expect(parseHeapProfileTurns(' 188 , 60 , 120 , 60 ')).toEqual([60, 120, 188]);
    });

    it('rejects negative / zero / non-integer / non-numeric tokens', () => {
        expect(parseHeapProfileTurns('-5,0,3.14,abc,42')).toEqual([42]);
    });

    it('falls back to default when all tokens are invalid', () => {
        expect(parseHeapProfileTurns('abc,xyz,-1,0')).toEqual([60, 120, 180]);
    });

    it('getHeapProfileTurns() returns the module-load-time schedule (sorted)', () => {
        const turns = getHeapProfileTurns();
        // The schedule must be sorted ascending and contain at least one
        // positive integer. Default is [60, 120, 180] when env is unset.
        expect(turns.length).toBeGreaterThan(0);
        for (let i = 1; i < turns.length; i++) {
            expect(turns[i]).toBeGreaterThan(turns[i - 1]);
        }
        for (const t of turns) {
            expect(Number.isInteger(t)).toBe(true);
            expect(t).toBeGreaterThan(0);
        }
    });
});

describe('heap_profile — snapshot path computation', () => {
    it('produces canonical filename', () => {
        const p = computeHeapSnapshotPath(
            60,
            'apr1992_definitive_40w',
            'n1728-abc',
            'data/derived/_debug'
        );
        // Path separator is OS-dependent; we assert the tail filename only.
        expect(p.endsWith('heap_60_apr1992_definitive_40w_n1728-abc.heapsnapshot')).toBe(true);
    });

    it('sanitizes filesystem-unsafe characters in slug and runId', () => {
        const p = computeHeapSnapshotPath(
            120,
            'foo bar/baz',
            'run\\with*chars',
            '/tmp'
        );
        expect(p).toMatch(/heap_120_foo_bar_baz_run_with_chars\.heapsnapshot$/);
    });

    it('falls back to "unknown" for empty slug or runId', () => {
        const p = computeHeapSnapshotPath(180, '', '', '/tmp');
        expect(p).toMatch(/heap_180_unknown_unknown\.heapsnapshot$/);
    });
});

describe('heap_profile — ON-path write behaviour (forceWriteForTest)', () => {
    let tmpDir: string;

    beforeEach(() => {
        __heapProfileTestHooks.resetWrittenKeys();
        tmpDir = mkdtempSync(join(tmpdir(), 'heap-prof-on-'));
    });

    afterEach(() => {
        __heapProfileTestHooks.resetWrittenKeys();
        try {
            rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup error.
        }
    });

    it('writes a snapshot file when turn matches schedule', () => {
        const schedule = new Set([60]);
        const wrote = __heapProfileTestHooks.forceWriteForTest(
            60,
            'test-scenario',
            'run-A',
            schedule,
            tmpDir
        );
        expect(wrote).toBe(true);

        const expectedPath = computeHeapSnapshotPath(60, 'test-scenario', 'run-A', tmpDir);
        expect(existsSync(expectedPath)).toBe(true);
        // V8 heap snapshots are non-trivially-sized JSON; assert > 0 bytes.
        expect(statSync(expectedPath).size).toBeGreaterThan(0);
    });

    it('writes nothing when turn does NOT match schedule', () => {
        const schedule = new Set([60, 120, 180]);
        const wrote = __heapProfileTestHooks.forceWriteForTest(
            42,
            'test-scenario',
            'run-B',
            schedule,
            tmpDir
        );
        expect(wrote).toBe(false);
        const files = existsSync(tmpDir) ? readdirSync(tmpDir) : [];
        expect(files.filter((f) => f.endsWith('.heapsnapshot'))).toEqual([]);
    });

    it('is idempotent per (turn, runId): second call is no-op', () => {
        const schedule = new Set([60]);
        const first = __heapProfileTestHooks.forceWriteForTest(
            60,
            'test-scenario',
            'run-C',
            schedule,
            tmpDir
        );
        const second = __heapProfileTestHooks.forceWriteForTest(
            60,
            'test-scenario',
            'run-C',
            schedule,
            tmpDir
        );
        expect(first).toBe(true);
        expect(second).toBe(false);
        // Only one file should exist.
        const files = readdirSync(tmpDir).filter((f) => f.endsWith('.heapsnapshot'));
        expect(files.length).toBe(1);
    });

    it('different runIds produce different files even on the same turn', () => {
        const schedule = new Set([60]);
        const a = __heapProfileTestHooks.forceWriteForTest(
            60,
            'test-scenario',
            'run-D-1',
            schedule,
            tmpDir
        );
        const b = __heapProfileTestHooks.forceWriteForTest(
            60,
            'test-scenario',
            'run-D-2',
            schedule,
            tmpDir
        );
        expect(a).toBe(true);
        expect(b).toBe(true);
        const files = readdirSync(tmpDir).filter((f) => f.endsWith('.heapsnapshot'));
        expect(files.length).toBe(2);
    });
});
