/**
 * LANE-NIGHTSHIFT-ANALYZE-FACTION-GRAPH-DEDUPE — G1 property test.
 *
 * 10,000 randomized BiH-shape trials. For each trial:
 *  - Generate a deterministic small game state with realistic shape (factions,
 *    formations, political_controllers, OSID adjacency).
 *  - Call analyzeFactionGraphCached(state, faction, adjacency, reverseMap).
 *  - Call analyzeFactionGraph (legacy uncached) with the same args.
 *  - Assert structural deepEqual on the two FactionGraphAnalysis outputs.
 *
 * Then verifies cache identity: a second call with the same (state, faction,
 * turn) returns the SAME REFERENCE; a third call after `state.meta.turn`
 * advances recomputes (different reference).
 *
 * Determinism: seeded LCG (NOT Math.random); strictCompare everywhere.
 *
 * Mission C precedent: hot-path optimizations that previously failed
 * hash-identity ship only with G1+G2+G3 gates. This test is G1.
 */
import { describe, it, expect } from 'vitest';
import {
    analyzeFactionGraphCached,
    __test_analyzeFactionGraphLegacy as analyzeFactionGraph,
    __test_analyzeFactionGraphOptimized as analyzeFactionGraphOptimized,
    type FactionGraphAnalysis,
} from '../src/sim/combat/osid_graph_analysis.js';
import type { FactionId, GameState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';

// ─────────────────────────────────────────────────────────────────────────
// Deterministic 32-bit LCG (Numerical Recipes). NOT Math.random.
// ─────────────────────────────────────────────────────────────────────────
function makeRng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 0x100000000;
    };
}

const FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

interface TrialInput {
    state: GameState;
    faction: FactionId;
    adjacency: Map<Osid, Osid[]>;
    reverseMap: OperationalToCanonicalReverseMap;
}

/**
 * Build a small randomized BiH-shape graph + state for a single trial.
 *
 * Shape:
 *  - N OSIDs (N in [8, 32]). All op:-prefixed.
 *  - Pseudo-planar adjacency: ring + a few chord edges + 0-2 isolated tail OSIDs.
 *  - Random political_controllers per OSID (RBiH/RS/HRHB/null distribution).
 *  - 0-N brigades scattered across OSIDs with random faction/personnel/exp/cohesion.
 *  - Empty reverseMap (controller resolved directly via political_controllers OSID key).
 *
 * Deterministic given a seed.
 */
function buildTrial(rng: () => number, trialIdx: number): TrialInput {
    const N = 8 + Math.floor(rng() * 25); // 8..32 OSIDs
    const osids: Osid[] = [];
    for (let i = 0; i < N; i++) {
        osids.push(`op:t${trialIdx}:o${i.toString().padStart(2, '0')}` as Osid);
    }

    // Adjacency: ring (cycle) + a few chord edges.
    const adjacency = new Map<Osid, Osid[]>();
    for (const o of osids) adjacency.set(o, []);
    const addEdge = (a: Osid, b: Osid) => {
        if (a === b) return;
        const la = adjacency.get(a)!;
        const lb = adjacency.get(b)!;
        if (!la.includes(b)) la.push(b);
        if (!lb.includes(a)) lb.push(a);
    };
    // Ring
    for (let i = 0; i < N; i++) {
        addEdge(osids[i]!, osids[(i + 1) % N]!);
    }
    // Chords
    const chordCount = Math.floor(rng() * 4);
    for (let c = 0; c < chordCount; c++) {
        const a = Math.floor(rng() * N);
        const b = Math.floor(rng() * N);
        if (a !== b) addEdge(osids[a]!, osids[b]!);
    }
    // Sort each adjacency list for determinism mirroring buildOsidAdjacency.
    for (const [k, list] of adjacency) {
        list.sort();
        adjacency.set(k, list);
    }

    // Political controllers — 4-way distribution: 3 factions + null gap.
    const controllers: Record<string, FactionId | null> = {};
    for (const o of osids) {
        const r = rng();
        if (r < 0.30) controllers[o] = 'RS';
        else if (r < 0.55) controllers[o] = 'RBiH';
        else if (r < 0.75) controllers[o] = 'HRHB';
        else controllers[o] = null;
    }

    // Formations — random brigade count 0..N, each at a random OSID.
    const brigadeCount = Math.floor(rng() * (N + 1));
    const formations: Record<string, unknown> = {};
    for (let b = 0; b < brigadeCount; b++) {
        const fid = `f${trialIdx}_${b.toString().padStart(2, '0')}`;
        const loc = osids[Math.floor(rng() * N)]!;
        const fac = FACTIONS[Math.floor(rng() * 3)]!;
        formations[fid] = {
            faction: fac,
            status: 'active',
            kind: 'brigade',
            location_osid: loc,
            personnel: 500 + Math.floor(rng() * 5000),
            experience: 0.2 + rng() * 0.6,
            cohesion: 30 + Math.floor(rng() * 60),
            entrenchment_turns: Math.floor(rng() * 6),
            disrupted_turns: rng() < 0.1 ? 1 + Math.floor(rng() * 3) : 0,
        };
    }

    // GameState — minimal shape. Only fields read by analyzeFactionGraph.
    const turn = Math.floor(rng() * 200);
    const state = {
        meta: { turn },
        factions: FACTIONS.map(id => ({ id })),
        military: { formations },
        political: { political_controllers: controllers },
    } as unknown as GameState;

    const faction = FACTIONS[Math.floor(rng() * 3)]!;
    const reverseMap: OperationalToCanonicalReverseMap = new Map();

    return { state, faction, adjacency, reverseMap };
}

// ─────────────────────────────────────────────────────────────────────────
// Structural deepEqual for FactionGraphAnalysis. Order-sensitive on arrays
// because analyzeFactionGraph already sorts every output array via
// strictCompare — any diverging order would itself be a determinism bug.
// ─────────────────────────────────────────────────────────────────────────
function structurallyEqual(a: FactionGraphAnalysis, b: FactionGraphAnalysis): { ok: true } | { ok: false; reason: string } {
    if (a.faction !== b.faction) return { ok: false, reason: `faction:${a.faction}!=${b.faction}` };
    if (a.osid_analysis.size !== b.osid_analysis.size) {
        return { ok: false, reason: `osid_analysis.size:${a.osid_analysis.size}!=${b.osid_analysis.size}` };
    }
    for (const [osid, av] of a.osid_analysis) {
        const bv = b.osid_analysis.get(osid);
        if (!bv) return { ok: false, reason: `osid_analysis missing osid:${osid}` };
        if (av.classification !== bv.classification) return { ok: false, reason: `osid_analysis[${osid}].classification` };
        if (av.brigade_power !== bv.brigade_power) return { ok: false, reason: `osid_analysis[${osid}].brigade_power` };
        if (av.enemy_threat !== bv.enemy_threat) return { ok: false, reason: `osid_analysis[${osid}].enemy_threat` };
        if (av.civilian_weight !== bv.civilian_weight) return { ok: false, reason: `osid_analysis[${osid}].civilian_weight` };
        if (av.is_chokepoint !== bv.is_chokepoint) return { ok: false, reason: `osid_analysis[${osid}].is_chokepoint` };
        if (av.advance_enemy_adjacency !== bv.advance_enemy_adjacency) return { ok: false, reason: `osid_analysis[${osid}].advance_enemy_adjacency` };
        if (av.brigade_id !== bv.brigade_id) return { ok: false, reason: `osid_analysis[${osid}].brigade_id` };
        if (av.controller !== bv.controller) return { ok: false, reason: `osid_analysis[${osid}].controller` };
        if (av.enemy_neighbors.length !== bv.enemy_neighbors.length || av.enemy_neighbors.some((x, i) => x !== bv.enemy_neighbors[i])) {
            return { ok: false, reason: `osid_analysis[${osid}].enemy_neighbors` };
        }
        if (av.friendly_neighbors.length !== bv.friendly_neighbors.length || av.friendly_neighbors.some((x, i) => x !== bv.friendly_neighbors[i])) {
            return { ok: false, reason: `osid_analysis[${osid}].friendly_neighbors` };
        }
    }
    const arrayKeys: Array<keyof FactionGraphAnalysis> = [
        'front_osids', 'chokepoints', 'salients', 'undefended_front', 'enemy_pockets',
    ];
    for (const k of arrayKeys) {
        const aa = a[k] as Osid[];
        const bb = b[k] as Osid[];
        if (aa.length !== bb.length) return { ok: false, reason: `${k}.length:${aa.length}!=${bb.length}` };
        for (let i = 0; i < aa.length; i++) {
            if (aa[i] !== bb[i]) return { ok: false, reason: `${k}[${i}]:${aa[i]}!=${bb[i]}` };
        }
    }
    if (a.weak_enemy_osids.length !== b.weak_enemy_osids.length) {
        return { ok: false, reason: `weak_enemy_osids.length:${a.weak_enemy_osids.length}!=${b.weak_enemy_osids.length}` };
    }
    for (let i = 0; i < a.weak_enemy_osids.length; i++) {
        const aw = a.weak_enemy_osids[i]!;
        const bw = b.weak_enemy_osids[i]!;
        if (aw.osid !== bw.osid || aw.reason !== bw.reason) {
            return { ok: false, reason: `weak_enemy_osids[${i}]` };
        }
    }
    return { ok: true };
}

describe('analyzeFactionGraphCached — G1 property test', () => {
    it('cached === legacy structurally over 10,000 random trials (deterministic LCG)', () => {
        const rng = makeRng(0xC0FFEE);
        const TRIAL_COUNT = 10_000;
        let firstFailure: string | null = null;
        for (let i = 0; i < TRIAL_COUNT; i++) {
            const trial = buildTrial(rng, i);
            const cached = analyzeFactionGraphCached(trial.state, trial.faction, trial.adjacency, trial.reverseMap);
            const legacy = analyzeFactionGraph(trial.state, trial.faction, trial.adjacency, trial.reverseMap);
            const eq = structurallyEqual(cached, legacy);
            if (!eq.ok) {
                firstFailure = `trial ${i}: ${eq.reason}`;
                break;
            }
        }
        expect(firstFailure).toBeNull();
    }, 60_000);

    it('returns same reference on second call with same (state, faction, turn)', () => {
        const rng = makeRng(0xBADBEE);
        const trial = buildTrial(rng, 0);
        const a = analyzeFactionGraphCached(trial.state, trial.faction, trial.adjacency, trial.reverseMap);
        const b = analyzeFactionGraphCached(trial.state, trial.faction, trial.adjacency, trial.reverseMap);
        expect(a).toBe(b);
    });

    it('recomputes on turn advance (different reference, same shape)', () => {
        const rng = makeRng(0xFA11);
        const trial = buildTrial(rng, 0);
        const a = analyzeFactionGraphCached(trial.state, trial.faction, trial.adjacency, trial.reverseMap);
        // Advance turn fingerprint on the same state reference.
        (trial.state.meta as { turn: number }).turn = ((trial.state.meta as { turn: number }).turn ?? 0) + 1;
        const b = analyzeFactionGraphCached(trial.state, trial.faction, trial.adjacency, trial.reverseMap);
        expect(a).not.toBe(b);
        const eq = structurallyEqual(a, b);
        expect(eq.ok).toBe(true);
    });

    it('different factions in same turn are independently cached', () => {
        const rng = makeRng(0xDECAF);
        const trial = buildTrial(rng, 0);
        const rb = analyzeFactionGraphCached(trial.state, 'RBiH', trial.adjacency, trial.reverseMap);
        const rs = analyzeFactionGraphCached(trial.state, 'RS', trial.adjacency, trial.reverseMap);
        const rb2 = analyzeFactionGraphCached(trial.state, 'RBiH', trial.adjacency, trial.reverseMap);
        const rs2 = analyzeFactionGraphCached(trial.state, 'RS', trial.adjacency, trial.reverseMap);
        expect(rb).toBe(rb2);
        expect(rs).toBe(rs2);
        expect(rb).not.toBe(rs);
        expect(rb.faction).toBe('RBiH');
        expect(rs.faction).toBe('RS');
    });

    it('different state references are independently cached (WeakMap key)', () => {
        const rng = makeRng(0xFEED);
        const trial1 = buildTrial(rng, 0);
        const trial2 = buildTrial(rng, 1);
        // Force same turn fingerprint on both states so the only differentiator is state ref.
        (trial2.state.meta as { turn: number }).turn = (trial1.state.meta as { turn: number }).turn;
        const a = analyzeFactionGraphCached(trial1.state, 'RBiH', trial1.adjacency, trial1.reverseMap);
        const b = analyzeFactionGraphCached(trial2.state, 'RBiH', trial2.adjacency, trial2.reverseMap);
        expect(a).not.toBe(b);
    });

    it('parity wrapper opt-in via env flag — passes without throwing on healthy trials', () => {
        const prev = process.env.ANALYZE_FACTION_GRAPH_PARITY_CHECK;
        process.env.ANALYZE_FACTION_GRAPH_PARITY_CHECK = 'true';
        try {
            const rng = makeRng(0xA110A11);
            for (let i = 0; i < 50; i++) {
                const trial = buildTrial(rng, i);
                // Two consecutive cached calls; second one triggers parity assertion.
                analyzeFactionGraphCached(trial.state, trial.faction, trial.adjacency, trial.reverseMap);
                analyzeFactionGraphCached(trial.state, trial.faction, trial.adjacency, trial.reverseMap);
            }
        } finally {
            if (prev === undefined) delete process.env.ANALYZE_FACTION_GRAPH_PARITY_CHECK;
            else process.env.ANALYZE_FACTION_GRAPH_PARITY_CHECK = prev;
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────
// LANE-NIGHTSHIFT-ANALYZE-FACTION-GRAPH-TIER-2 — direct optimized-vs-legacy
// G1 property test. Bypasses the per-turn cache so any drift between the
// optimized body and the frozen legacy reference body is detectable
// independently of cache-correctness. Cached-vs-legacy continues to be
// covered by the original 10k-trial test above.
// ─────────────────────────────────────────────────────────────────────────
describe('analyzeFactionGraphOptimized — Tier 2 G1 property test (direct optimized vs legacy)', () => {
    it('optimized === legacy structurally over 10,000 random trials (deterministic LCG)', () => {
        const rng = makeRng(0xC0FFEE);
        const TRIAL_COUNT = 10_000;
        let firstFailure: string | null = null;
        for (let i = 0; i < TRIAL_COUNT; i++) {
            const trial = buildTrial(rng, i);
            const optimized = analyzeFactionGraphOptimized(trial.state, trial.faction, trial.adjacency, trial.reverseMap);
            const legacy = analyzeFactionGraph(trial.state, trial.faction, trial.adjacency, trial.reverseMap);
            const eq = structurallyEqual(optimized, legacy);
            if (!eq.ok) {
                firstFailure = `trial ${i}: ${eq.reason}`;
                break;
            }
        }
        expect(firstFailure).toBeNull();
    }, 60_000);

    it('Tier 2 parity flag opt-in — passes without throwing on healthy trials', () => {
        const prev = process.env.ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK;
        process.env.ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK = 'true';
        try {
            const rng = makeRng(0x7152C001);
            for (let i = 0; i < 50; i++) {
                const trial = buildTrial(rng, i);
                analyzeFactionGraphCached(trial.state, trial.faction, trial.adjacency, trial.reverseMap);
                analyzeFactionGraphCached(trial.state, trial.faction, trial.adjacency, trial.reverseMap);
            }
        } finally {
            if (prev === undefined) delete process.env.ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK;
            else process.env.ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK = prev;
        }
    });
});
