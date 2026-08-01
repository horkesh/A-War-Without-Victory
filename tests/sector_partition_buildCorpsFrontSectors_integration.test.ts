/**
 * G1.5 — Integration property test for `mapOsidsToCorps` per-invocation
 * memoization (LANE-NIGHTSHIFT-V094-SECTOR-COLDSTART-V2).
 *
 * Background:
 *   v0.9.3 attempted per-invocation memoization of `mapOsidsToCorps` inside
 *   `buildCorpsFrontSectors`. A 10,000-trial G1 *function-level* property test
 *   passed (the memoized return value matched legacy byte-for-byte). But the
 *   40w `final_state_hash` drifted off baseline by a single byte. The
 *   rollback report (`docs/40_reports/implemented/20260508_V093_SECTOR_COLDSTART_PHASE_B_ROLLBACK.md`)
 *   named the failure mode: G1 catches return-value identity, but it does NOT
 *   catch *cross-call side-effect or ordering leakage* — e.g. a module-level
 *   cache living across invocations, an iteration-order difference in a
 *   downstream consumer of the returned Map, or a Map-key-set divergence
 *   on real fixtures that randomized G1 fixtures never hit.
 *
 * What this test does (the "G1.5" gate):
 *   1. Loads real serialized save state + the operational contact graph.
 *   2. Runs `buildCorpsFrontSectors` end-to-end with the memoization path
 *      ENABLED (cache lifetime = per-invocation, scoped inside the function).
 *   3. Runs `buildCorpsFrontSectors` end-to-end with the memoization path
 *      DISABLED via env flag `SECTOR_COLDSTART_CACHE_DISABLED=true`. This
 *      forces every internal `mapOsidsToCorps` call site to bypass the cache
 *      and always recompute (the legacy behavior).
 *   4. Asserts the two returned sector dictionaries are byte-identical across
 *      every recursively observable field. Object keys are sorted while array
 *      order remains part of the contract, so new optional sector/sub-segment
 *      fields are covered automatically rather than by a hand-maintained list.
 *
 * Fixture variants (≥100 invocations total):
 *   - The base state from `data/derived/latest_run_final_save.json`
 *   - Deterministic mutations of the base state that vary which OSIDs are
 *     friendly to each faction, and which brigades are active. Each variant
 *     exercises a different shape of `mapOsidsToCorps` call.
 *   - Multiple back-to-back invocations on the SAME state (catches leakage
 *     across `buildCorpsFrontSectors` calls — the most likely Phase-B drift
 *     mode).
 *   - Variants that exercise the war-pass + final-pass split (the `isFinalPass`
 *     boolean); cache must NOT survive between the two passes.
 *
 * Acceptance:
 *   - All ≥100 fixture invocations: cached result === uncached result.
 *   - If this test fails on the cached path, the memoization architecture is
 *     wrong (cross-call leakage or stale cache) and must be fixed before
 *     attempting a 40w byte-stability run. This is the failure mode that
 *     pure-G1 missed.
 *
 * Test runs only when the real save fixture exists. CI Linux job ships the
 * fixture; offline environments without the save are skipped.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import {
    __buildCorpsFrontSectorsWithoutFixedPointShortcuts,
    buildCorpsFrontSectors,
} from '../src/sim/combat/corps_front_sectors.js';
import { deserializeState } from '../src/state/serialize.js';
import type {
    CorpsFrontSector,
    FormationState,
    GameState,
} from '../src/state/game_state.js';
import { strictCompare } from '../src/state/validateGameState.js';

const ROOT = process.cwd();
const SAVE_PATH = path.join(ROOT, 'data', 'derived', 'latest_run_final_save.json');
const CONTACT_GRAPH_PATH = path.join(
    ROOT,
    'data',
    'derived',
    'operational',
    'operational_contact_graph.json',
);

const hasFixture = fs.existsSync(SAVE_PATH) && fs.existsSync(CONTACT_GRAPH_PATH);

const CACHE_DISABLED_FLAG = 'SECTOR_COLDSTART_CACHE_DISABLED';

type ContactGraphEdge = {
    edge_id: string;
    a: string;
    b: string;
    shared_segments?: number;
    min_dist?: number;
};

function loadStateRaw(): GameState {
    return deserializeState(fs.readFileSync(SAVE_PATH, 'utf8')) as GameState;
}

function loadEdges(): ContactGraphEdge[] {
    const graph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as {
        edges: ContactGraphEdge[];
    };
    return graph.edges.filter((edge) => (edge.shared_segments ?? 0) >= 1);
}

/**
 * Canonicalize a sector dictionary into a deterministic JSON string for
 * byte-by-byte comparison. Keys are sorted; list contents preserve insertion
 * order (because list iteration order is part of the contract — it must NOT
 * depend on whether the cache was hit or not).
 */
function canonicalizeSectors(
    sectors: Record<string, CorpsFrontSector>,
): string {
    return JSON.stringify(canonicalizeObservable(sectors));
}

function canonicalizeObservable(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((entry) => canonicalizeObservable(entry));
    }
    if (value !== null && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return Object.keys(record)
            .sort(strictCompare)
            .map((key) => [key, canonicalizeObservable(record[key])]);
    }
    return value;
}

type FixedPointProductionMode = {
    label: string;
    isFinalPass: boolean;
    finalSaveGeometryProjection: boolean;
};

const FIXED_POINT_PRODUCTION_MODES: FixedPointProductionMode[] = [
    { label: 'war', isFinalPass: false, finalSaveGeometryProjection: false },
    { label: 'final-turn', isFinalPass: true, finalSaveGeometryProjection: false },
    { label: 'final-save', isFinalPass: false, finalSaveGeometryProjection: true },
];

function runFixedPointModes(
    state: GameState,
    edges: ContactGraphEdge[],
    mode: FixedPointProductionMode,
): { optimized: string; reference: string } {
    const optimizedState = deserializeState(JSON.stringify(state)) as GameState;
    const referenceState = deserializeState(JSON.stringify(state)) as GameState;
    const optimizedSectors = buildCorpsFrontSectors(
        optimizedState,
        edges as never,
        null,
        undefined,
        undefined,
        mode.isFinalPass,
        mode.finalSaveGeometryProjection,
    );
    const referenceSectors = __buildCorpsFrontSectorsWithoutFixedPointShortcuts(
        referenceState,
        edges as never,
        null,
        undefined,
        undefined,
        mode.isFinalPass,
        mode.finalSaveGeometryProjection,
    );
    return {
        optimized: JSON.stringify(canonicalizeObservable({
            sectors: optimizedSectors,
            state: optimizedState,
        })),
        reference: JSON.stringify(canonicalizeObservable({
            sectors: referenceSectors,
            state: referenceState,
        })),
    };
}

/**
 * Run buildCorpsFrontSectors with cache ON (env flag absent) and cache OFF
 * (env flag set), returning both canonicalized snapshots.
 */
function runBothModes(
    state: GameState,
    edges: ContactGraphEdge[],
    isFinalPass: boolean = false,
): { cached: string; uncached: string } {
    const originalFlag = process.env[CACHE_DISABLED_FLAG];
    let cached: string;
    let uncached: string;
    try {
        // Cache ENABLED (default behavior — flag absent).
        delete process.env[CACHE_DISABLED_FLAG];
        // Deep-clone the state so the second call gets a fresh copy
        // — buildCorpsFrontSectors must not mutate input state, but we
        // remove that confound entirely.
        const stateA = deserializeState(JSON.stringify(state)) as GameState;
        cached = canonicalizeSectors(
            buildCorpsFrontSectors(stateA, edges as never, null, undefined, undefined, isFinalPass),
        );
        // Cache DISABLED — forces every mapOsidsToCorps callsite to bypass cache.
        process.env[CACHE_DISABLED_FLAG] = 'true';
        const stateB = deserializeState(JSON.stringify(state)) as GameState;
        uncached = canonicalizeSectors(
            buildCorpsFrontSectors(stateB, edges as never, null, undefined, undefined, isFinalPass),
        );
    } finally {
        if (originalFlag === undefined) {
            delete process.env[CACHE_DISABLED_FLAG];
        } else {
            process.env[CACHE_DISABLED_FLAG] = originalFlag;
        }
    }
    return { cached, uncached };
}

/**
 * Apply a deterministic mutation to a state to vary the inputs to
 * mapOsidsToCorps. Each variant exercises a different shape of cache key /
 * call sequence.
 */
function makeVariant(
    base: GameState,
    seed: number,
): GameState {
    const clone = deserializeState(JSON.stringify(base)) as GameState;
    const formations = clone.military.formations ?? {};
    const ids = Object.keys(formations).sort(strictCompare);
    if (ids.length === 0) return clone;

    // Variant 0: pristine base.
    if (seed === 0) return clone;

    // Variant 1+: deterministically toggle the status of `seed` brigades.
    // This shifts which brigades feed mapOsidsToCorps for each faction.
    const targets = (seed * 7) % Math.max(1, ids.length);
    let toggled = 0;
    for (let i = 0; i < ids.length && toggled < targets; i++) {
        const fid = ids[(i * 13 + seed * 31) % ids.length]!;
        const f = formations[fid] as FormationState | undefined;
        if (!f) continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        // Don't mutate corps / army HQ — only field formations.
        if (f.status === 'active') {
            // Flag a small number as 'inactive' (the only non-active status the
            // FormationState schema permits) to vary mapOsidsToCorps inputs
            // without breaking schema invariants.
            (f as FormationState).status = 'inactive';
            toggled++;
        }
    }

    return clone;
}

describe.skipIf(!hasFixture)(
    'G1.5: buildCorpsFrontSectors integration property — cache ON vs OFF byte-equality',
    () => {
        let baseState: GameState;
        let edges: ContactGraphEdge[];
        const originalFlag = process.env[CACHE_DISABLED_FLAG];

        beforeAll(() => {
            baseState = loadStateRaw();
            edges = loadEdges();
        });

        afterAll(() => {
            if (originalFlag === undefined) {
                delete process.env[CACHE_DISABLED_FLAG];
            } else {
                process.env[CACHE_DISABLED_FLAG] = originalFlag;
            }
        });

        it('cached path matches uncached path on the pristine real-save fixture', () => {
            const { cached, uncached } = runBothModes(baseState, edges, false);
            expect(cached.length).toBeGreaterThan(0);
            expect(uncached.length).toBeGreaterThan(0);
            // Byte-equality assertion: if this fails, memoization introduced
            // a cross-call divergence that pure-G1 would not catch.
            expect(cached).toBe(uncached);
        });

        it('cached path matches uncached path on the final-pass real-save fixture', () => {
            const { cached, uncached } = runBothModes(baseState, edges, true);
            expect(cached).toBe(uncached);
        });

        it('cached path is stable across back-to-back invocations on identical state (no cross-invocation leakage)', () => {
            // Two cached-mode runs on the same state must produce byte-identical
            // results. If a module-level cache leaks state across calls, this
            // is where it surfaces.
            const originalFlag2 = process.env[CACHE_DISABLED_FLAG];
            try {
                delete process.env[CACHE_DISABLED_FLAG];
                const sA = deserializeState(JSON.stringify(baseState)) as GameState;
                const sB = deserializeState(JSON.stringify(baseState)) as GameState;
                const a = canonicalizeSectors(buildCorpsFrontSectors(sA, edges as never, null));
                const b = canonicalizeSectors(buildCorpsFrontSectors(sB, edges as never, null));
                expect(a).toBe(b);
            } finally {
                if (originalFlag2 === undefined) {
                    delete process.env[CACHE_DISABLED_FLAG];
                } else {
                    process.env[CACHE_DISABLED_FLAG] = originalFlag2;
                }
            }
        });

        it('cached path matches uncached path across ≥100 deterministic state variants', () => {
            // 100 variants × cached + uncached = 200 buildCorpsFrontSectors calls.
            // Each variant is a deterministic mutation of the base state.
            const NUM_VARIANTS = 100;
            const failures: Array<{ seed: number; diff: string }> = [];
            for (let seed = 0; seed < NUM_VARIANTS; seed++) {
                const variant = makeVariant(baseState, seed);
                const { cached, uncached } = runBothModes(variant, edges, false);
                if (cached !== uncached) {
                    // Find the first divergent character to make debugging fast.
                    let diffAt = -1;
                    const minLen = Math.min(cached.length, uncached.length);
                    for (let i = 0; i < minLen; i++) {
                        if (cached.charCodeAt(i) !== uncached.charCodeAt(i)) {
                            diffAt = i;
                            break;
                        }
                    }
                    const window = (s: string, at: number, w: number = 80) =>
                        s.slice(Math.max(0, at - w / 2), Math.min(s.length, at + w / 2));
                    failures.push({
                        seed,
                        diff: `seed=${seed} firstDiff@${diffAt}\n  cached:   ${window(cached, diffAt)}\n  uncached: ${window(uncached, diffAt)}`,
                    });
                    // Stop after first 3 failures to keep output readable.
                    if (failures.length >= 3) break;
                }
            }
            if (failures.length > 0) {
                throw new Error(
                    `G1.5 INTEGRATION DRIFT: cache ON vs OFF differs on ${failures.length} variants:\n` +
                    failures.map((f) => f.diff).join('\n\n'),
                );
            }
        }, 600_000); // up to 10 min — 100 buildCorpsFrontSectors invocations is heavy

        it('cached path matches uncached path across war-pass + final-pass split', () => {
            // Real production calls buildCorpsFrontSectors twice per turn
            // (war-pass with isFinalPass=false, then final-pass with =true).
            // The cache MUST NOT survive between the two passes — verify
            // that running both passes back-to-back in cache-on mode matches
            // running both passes back-to-back in cache-off mode.
            const originalFlag2 = process.env[CACHE_DISABLED_FLAG];
            try {
                delete process.env[CACHE_DISABLED_FLAG];
                const sA = deserializeState(JSON.stringify(baseState)) as GameState;
                const warA = canonicalizeSectors(buildCorpsFrontSectors(sA, edges as never, null, undefined, undefined, false));
                const sA2 = deserializeState(JSON.stringify(baseState)) as GameState;
                const finalA = canonicalizeSectors(buildCorpsFrontSectors(sA2, edges as never, null, undefined, undefined, true));

                process.env[CACHE_DISABLED_FLAG] = 'true';
                const sB = deserializeState(JSON.stringify(baseState)) as GameState;
                const warB = canonicalizeSectors(buildCorpsFrontSectors(sB, edges as never, null, undefined, undefined, false));
                const sB2 = deserializeState(JSON.stringify(baseState)) as GameState;
                const finalB = canonicalizeSectors(buildCorpsFrontSectors(sB2, edges as never, null, undefined, undefined, true));

                expect(warA).toBe(warB);
                expect(finalA).toBe(finalB);
            } finally {
                if (originalFlag2 === undefined) {
                    delete process.env[CACHE_DISABLED_FLAG];
                } else {
                    process.env[CACHE_DISABLED_FLAG] = originalFlag2;
                }
            }
        });

        it('fixed-point shortcuts preserve every sector field and direct state side effect across production modes and 100 real-save variants', () => {
            for (const mode of FIXED_POINT_PRODUCTION_MODES) {
                for (let seed = 0; seed < 100; seed++) {
                    const variant = makeVariant(baseState, seed);
                    const { optimized, reference } = runFixedPointModes(variant, edges, mode);
                    if (optimized !== reference) {
                        let firstDiff = 0;
                        while (
                            firstDiff < optimized.length
                            && firstDiff < reference.length
                            && optimized.charCodeAt(firstDiff) === reference.charCodeAt(firstDiff)
                        ) {
                            firstDiff += 1;
                        }
                        throw new Error(
                            `fixed-point divergence for mode ${mode.label}, seed ${seed} at byte ${firstDiff}; `
                            + `optimized=${optimized.slice(firstDiff, firstDiff + 160)}; `
                            + `reference=${reference.slice(firstDiff, firstDiff + 160)}`,
                        );
                    }
                }
            }
        }, 900_000);
    },
);
