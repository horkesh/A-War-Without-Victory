/**
 * Heap-snapshot instrumentation for v0.9.3 perf Phase 0 — 188w accumulator hunt
 * (LANE-NIGHTSHIFT-V093-HEAP-PROFILE-REDISPATCH).
 *
 * Default-OFF env-flag-gated wrapper around Node's synchronous
 * `v8.writeHeapSnapshot()`. Activated by setting the literal string "true"
 * in `HEAP_PROFILE_188W` in the process env. When unset, every entry point
 * here short-circuits in O(1) — production runs pay only one boolean read
 * per turn.
 *
 * Snapshot turns default to [60, 120, 180]. Override with
 * `HEAP_PROFILE_TURNS=60,120,180` (comma-separated integers).
 *
 * Output:
 *   data/derived/_debug/heap_<turn>_<scenarioSlug>_<runId>.heapsnapshot
 *
 * `data/derived/_debug/` is gitignored; snapshots are local-only.
 *
 * Determinism contract:
 *   - Default-OFF is the production path. v8.writeHeapSnapshot() is NOT called
 *     when the flag is unset. No allocator probe, no clock read, no fs touch.
 *     Result: hash-byte-identical to predecessor baseline.
 *   - When the flag is ON: we still perform no Math.random / Date.now / locale
 *     /strictCompare-violating reads. The only side effect is the heap snapshot
 *     file write, which does not feed game state.
 *   - The hook is faction-symmetric (it is invoked once per turn; it does not
 *     branch on faction). It is also idempotent per (turn, runId) — second
 *     call for the same turn within a process is a no-op.
 *
 * Faction-agnostic, Ring 0 tooling-only. No §6 surface, no political_controllers,
 * no rupture-wiring. The module imports `node:fs`, `node:path`, and `node:v8`
 * unconditionally so ESM static-analysis is clean; all three are dead-code-
 * eliminable down each function's `if (!HEAP_PROFILE_FLAG) return false;` gate.
 *
 * Sim-only module. UI builds (Electron renderer / Vite map) never import this
 * file.
 */

import * as fsModule from 'node:fs';
import * as pathModule from 'node:path';
import * as v8Module from 'node:v8';

// ═══════════════════════════════════════════════════════════════════════════
// Env-flag contract (frozen at module load — single read for production cost)
// ═══════════════════════════════════════════════════════════════════════════

const HEAP_PROFILE_FLAG_NAME = 'HEAP_PROFILE_188W' as const;
const HEAP_PROFILE_TURNS_NAME = 'HEAP_PROFILE_TURNS' as const;

const HEAP_PROFILE_FLAG: boolean =
    process.env[HEAP_PROFILE_FLAG_NAME] === 'true';

/**
 * Parse the HEAP_PROFILE_TURNS env override into a sorted, deduped, positive-
 * integer set. Returns the default `[60, 120, 180]` when unset/empty/malformed.
 *
 * Exposed for unit testing — allows the test to drive the parser without
 * touching process.env.
 */
export function parseHeapProfileTurns(raw: string | undefined): number[] {
    if (!raw) return [60, 120, 180];
    const parts = raw.split(',');
    const set = new Set<number>();
    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed === '') continue;
        const n = Number(trimmed);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) continue;
        set.add(n);
    }
    if (set.size === 0) return [60, 120, 180];
    return Array.from(set).sort((a, b) => a - b);
}

const HEAP_PROFILE_TURNS: ReadonlySet<number> = new Set(
    parseHeapProfileTurns(process.env[HEAP_PROFILE_TURNS_NAME])
);

/** Returns true iff the heap-profile flag is enabled for this process. */
export function isHeapProfileEnabled(): boolean {
    return HEAP_PROFILE_FLAG;
}

/** Returns the snapshot-turn schedule (sorted ascending, frozen at load). */
export function getHeapProfileTurns(): number[] {
    return Array.from(HEAP_PROFILE_TURNS).sort((a, b) => a - b);
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-process idempotency — never re-snapshot the same (turn, runId)
// ═══════════════════════════════════════════════════════════════════════════

const _writtenKeys = new Set<string>();

function _key(turn: number, runId: string): string {
    return `${turn}::${runId}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Snapshot path computation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the heap snapshot output path. Exposed for unit testing.
 *
 * Format: `data/derived/_debug/heap_<turn>_<scenarioSlug>_<runId>.heapsnapshot`
 *
 * `scenarioSlug` is sanitized to [A-Za-z0-9_-] so filenames are filesystem-safe.
 * `runId` is sanitized identically. Empty/falsy slug or runId → `unknown`.
 */
export function computeHeapSnapshotPath(
    turn: number,
    scenarioSlug: string,
    runId: string,
    debugDir: string = 'data/derived/_debug'
): string {
    const safeSlug = sanitize(scenarioSlug);
    const safeRunId = sanitize(runId);
    const filename = `heap_${turn}_${safeSlug}_${safeRunId}.heapsnapshot`;
    return pathModule.join(debugDir, filename);
}

function sanitize(s: string | undefined | null): string {
    if (s === undefined || s === null || s === '') return 'unknown';
    const cleaned = s.replace(/[^A-Za-z0-9_-]/g, '_');
    return cleaned === '' ? 'unknown' : cleaned;
}

// ═══════════════════════════════════════════════════════════════════════════
// Public hook — called by turn_pipeline at end-of-turn
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Heap-snapshot hook for the turn pipeline. Default-OFF zero cost: when the
 * env flag is unset, returns `false` immediately after a single boolean read.
 *
 * When the flag is ON and `turn` matches the schedule, writes one heap snapshot
 * to `data/derived/_debug/heap_<turn>_<scenarioSlug>_<runId>.heapsnapshot`
 * (synchronously, so determinism is preserved relative to the surrounding
 * sequential turn pipeline).
 *
 * Idempotent per (turn, runId): a second call within the same process for
 * the same key is a no-op.
 *
 * Returns `true` iff a snapshot was written by this call. The caller MUST
 * treat the return value as advisory only — game state is never mutated.
 */
export function maybeWriteHeapSnapshot(
    turn: number,
    scenarioSlug: string,
    runId: string,
    debugDir: string = 'data/derived/_debug'
): boolean {
    // Single-read fast path. Production cost: one Boolean comparison per turn.
    if (!HEAP_PROFILE_FLAG) return false;
    if (!HEAP_PROFILE_TURNS.has(turn)) return false;

    const k = _key(turn, runId);
    if (_writtenKeys.has(k)) return false;
    _writtenKeys.add(k);

    const outputPath = computeHeapSnapshotPath(turn, scenarioSlug, runId, debugDir);

    // Ensure debug dir exists. mkdirSync with recursive:true is idempotent.
    try {
        fsModule.mkdirSync(pathModule.dirname(outputPath), { recursive: true });
    } catch {
        // Directory creation failure is non-fatal — snapshot will throw next.
    }

    // v8.writeHeapSnapshot is SYNCHRONOUS in Node — verified via Node docs
    // (fs.writeFileSync underneath). This preserves the deterministic per-turn
    // ordering of the surrounding pipeline.
    v8Module.writeHeapSnapshot(outputPath);
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Test hooks — exposed only for tests/sim/perf/heap_profile.test.ts
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test-only escape hatches. These let the unit test:
 *   - reset the per-process idempotency cache between cases
 *   - inject a fake schedule + flag override without re-loading the module
 *   - call the parser directly
 *
 * NOT for production use. The integration hook (`maybeWriteHeapSnapshot`) is
 * the single canonical entry point for the turn pipeline.
 */
export const __heapProfileTestHooks = {
    /** Clear the idempotency cache so a test can drive multiple writes. */
    resetWrittenKeys(): void {
        _writtenKeys.clear();
    },
    /**
     * Synchronous direct write — bypasses the env-flag gate. Used by the
     * "ON-path writes a snapshot" test to verify the file actually appears
     * on disk without polluting the parent process env.
     */
    forceWriteForTest(
        turn: number,
        scenarioSlug: string,
        runId: string,
        scheduleTurns: ReadonlySet<number>,
        debugDir: string
    ): boolean {
        if (!scheduleTurns.has(turn)) return false;
        const k = _key(turn, runId);
        if (_writtenKeys.has(k)) return false;
        _writtenKeys.add(k);
        const outputPath = computeHeapSnapshotPath(turn, scenarioSlug, runId, debugDir);
        fsModule.mkdirSync(pathModule.dirname(outputPath), { recursive: true });
        v8Module.writeHeapSnapshot(outputPath);
        return true;
    },
    /** Read the captured module-load-time flag (read-only). */
    moduleLoadTimeFlag(): boolean {
        return HEAP_PROFILE_FLAG;
    },
    /** Read the captured module-load-time turn schedule (sorted copy). */
    moduleLoadTimeTurns(): number[] {
        return Array.from(HEAP_PROFILE_TURNS).sort((a, b) => a - b);
    },
};
