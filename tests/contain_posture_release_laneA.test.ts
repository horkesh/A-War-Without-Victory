/**
 * contain Lane A — ARBiH strangle-not-capture contain-posture: WASHINGTON RELEASE.
 *
 * Design: docs/plans/2026-06-07-contain-enclave-faction-agnostic-design.md §2b.
 *
 * THE LANE-A RELEASE INVARIANT under test: ARBiH (RBiH) contains the isolated
 * HVO pockets (Žepče/Lašva/Kiseljak) BEFORE the Washington Agreement, then the
 * containment RELEASES when `washington_signed` fires — at which point the
 * existing alliance/ceasefire machinery freezes the RBiH↔HRHB war, so the
 * pockets stay HVO-held (matching painted Oct-1995). This is distinct from the
 * VRS 1995-pivot release: the HRHB-enclave release keys on washington_signed,
 * NOT on srebrenica_fell / turn≥160.
 *
 * Covers:
 *   - the ARBiH gate is DEFAULT-OFF (env-fallback) and override-controllable,
 *     independent from the VRS gate;
 *   - `isEnclaveContainmentReleased` for an HRHB enclave keys on washington_signed
 *     and is INSENSITIVE to srebrenica_fell / the turn≥160 backstop;
 *   - `computeContainedOsidsForFaction('RBiH', ...)` contains the Žepče cores
 *     PRE-Washington, and EMPTIES them POST-Washington;
 *   - the RBiH-enclave release path (VRS-side) is UNCHANGED (regression guard);
 *   - determinism (sorted output, pure).
 */

import assert from 'node:assert';
import { test, afterEach } from 'vitest';

import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import type { SupplyReachabilityOsidReport } from '../src/state/supply_reachability_osid.js';
import {
    computeContainedOsidsForFaction,
    isEnclaveContainmentReleased,
    getEnclaveDefForOsid,
} from '../src/sim/combat/enclave_resilience.js';
import {
    isArbihContainPostureEnabled,
    setArbihContainPostureOverride,
    resetArbihContainPostureGate,
    isVrsContainPostureEnabled,
    setVrsContainPostureOverride,
    resetVrsContainPostureGate,
    setSrkStranglePostureOverride,
    resetSrkStranglePostureGate,
} from '../src/sim/combat/contain_posture_gate.js';
import { isContainSuppressionActiveFor } from '../src/sim/combat/commander/plan.js';

// Žepče HVO enclave cores (resilience_start_turn 30).
const OZIMICA_2 = 'op:zepce:ozimica_2';
const VINISTE_2 = 'op:zepce:viniste_2';
const ZEPCE_2 = 'op:zepce:zepce_2';
// VRS-side enclave (RBiH faction) for the regression guard.
const SREBRENICA_2 = 'op:srebrenica:srebrenica_2';

/** Build a minimal GameState at a given turn, with optional washington_signed + event_flags. */
function stateAtTurn(
    turn: number,
    opts: { washingtonSigned?: boolean; eventFlags?: Record<string, boolean> } = {},
): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'seed' },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            event_flags: opts.eventFlags ?? {},
        } as unknown as GameState['military'],
        political: {
            rbih_hrhb_state: opts.washingtonSigned
                ? ({ washington_signed: true } as unknown)
                : ({ washington_signed: false } as unknown),
        } as unknown as GameState['political'],
        displacement: {} as unknown as GameState['displacement'],
    } as GameState;
}

/** BFS report marking the given OSIDs as isolated for the HRHB enclave faction. */
function reachWithIsolatedHrhb(isolated: string[], turn = 0): SupplyReachabilityOsidReport {
    return {
        schema: 1,
        turn,
        factions: [
            {
                faction_id: 'HRHB',
                sources: [],
                controlled: [...isolated],
                reachable_osids: [],
                isolated_osids: [...isolated],
                edges_used: [],
            },
        ],
    };
}

/** BFS report marking OSIDs isolated for RBiH (for the VRS-side regression guard). */
function reachWithIsolatedRbih(isolated: string[], turn = 0): SupplyReachabilityOsidReport {
    return {
        schema: 1,
        turn,
        factions: [
            {
                faction_id: 'RBiH',
                sources: [],
                controlled: [...isolated],
                reachable_osids: [],
                isolated_osids: [...isolated],
                edges_used: [],
            },
        ],
    };
}

afterEach(() => {
    resetArbihContainPostureGate();
    resetVrsContainPostureGate();
    resetSrkStranglePostureGate();
});

// ── gate default-off + independence from the VRS gate ─────────────────────────

test('ARBiH contain-posture gate is DEFAULT-OFF (env unset)', () => {
    resetArbihContainPostureGate();
    const prev = process.env.AWWV_ARBIH_CONTAIN_POSTURE;
    delete process.env.AWWV_ARBIH_CONTAIN_POSTURE;
    try {
        assert.strictEqual(isArbihContainPostureEnabled(), false);
    } finally {
        if (prev !== undefined) process.env.AWWV_ARBIH_CONTAIN_POSTURE = prev;
    }
});

test('ARBiH gate override controls the flag; independent of the VRS gate', () => {
    setArbihContainPostureOverride(true);
    assert.strictEqual(isArbihContainPostureEnabled(), true);
    // Turning ON the ARBiH lane does NOT turn on the VRS lane.
    assert.strictEqual(isVrsContainPostureEnabled(), false);
    setArbihContainPostureOverride(false);
    assert.strictEqual(isArbihContainPostureEnabled(), false);
});

// ── HRHB-enclave release predicate keys on washington_signed ───────────────────

test('HRHB-enclave release does NOT fire pre-Washington', () => {
    const enclave = getEnclaveDefForOsid(ZEPCE_2)!;
    assert.strictEqual(enclave.faction, 'HRHB');
    assert.strictEqual(isEnclaveContainmentReleased(stateAtTurn(50), enclave), false);
    assert.strictEqual(isEnclaveContainmentReleased(stateAtTurn(120), enclave), false);
});

test('HRHB-enclave release FIRES on washington_signed', () => {
    const enclave = getEnclaveDefForOsid(ZEPCE_2)!;
    const st = stateAtTurn(110, { washingtonSigned: true });
    assert.strictEqual(isEnclaveContainmentReleased(st, enclave), true);
});

test('HRHB-enclave release is INSENSITIVE to srebrenica_fell / turn≥160 backstop', () => {
    const enclave = getEnclaveDefForOsid(ZEPCE_2)!;
    // The VRS 1995 pivot must NOT release the HVO pockets (different war).
    assert.strictEqual(
        isEnclaveContainmentReleased(stateAtTurn(150, { eventFlags: { srebrenica_fell: true } }), enclave),
        false,
    );
    assert.strictEqual(isEnclaveContainmentReleased(stateAtTurn(185), enclave), false);
    // Only Washington releases it, even at a late turn.
    assert.strictEqual(
        isEnclaveContainmentReleased(stateAtTurn(185, { washingtonSigned: true }), enclave),
        true,
    );
});

// ── contained set: pre-Washington ──────────────────────────────────────────────

test('PRE-Washington: RBiH contains the Žepče cores when isolated (past t30)', () => {
    const reach = reachWithIsolatedHrhb([OZIMICA_2, VINISTE_2, ZEPCE_2]);
    const contained = computeContainedOsidsForFaction(stateAtTurn(60), 'RBiH', reach);
    assert.ok(contained.includes(OZIMICA_2), 'ozimica_2 contained pre-Washington');
    assert.ok(contained.includes(VINISTE_2), 'viniste_2 contained pre-Washington');
    assert.ok(contained.includes(ZEPCE_2), 'zepce_2 contained pre-Washington');
});

test('PRE-formation: Žepče NOT contained before resilience_start_turn (t30)', () => {
    const reach = reachWithIsolatedHrhb([ZEPCE_2]);
    const contained = computeContainedOsidsForFaction(stateAtTurn(20), 'RBiH', reach);
    assert.ok(!contained.includes(ZEPCE_2), 'Žepče not yet a resilient enclave at t20');
});

// ── THE LANE-A RELEASE INVARIANT: post-Washington set is EMPTY for HVO pockets ──

test('RELEASE (washington_signed): Žepče cores DROP OUT of the contained set', () => {
    const reach = reachWithIsolatedHrhb([OZIMICA_2, VINISTE_2, ZEPCE_2]);
    const st = stateAtTurn(110, { washingtonSigned: true });
    const contained = computeContainedOsidsForFaction(st, 'RBiH', reach);
    // After Washington the war freezes (existing machinery) → pockets stay
    // HVO-held; containment lifts (the bot would not generate cross-Washington
    // assaults anyway, but the set is empty so nothing leaks).
    assert.deepStrictEqual(contained, [], 'all HVO pockets released at Washington');
});

// ── faction-agnostic guard: HRHB never contains its own pocket ──────────────────

test('HRHB (enclave faction) never contains its own Žepče', () => {
    const reach = reachWithIsolatedHrhb([ZEPCE_2]);
    const contained = computeContainedOsidsForFaction(stateAtTurn(60), 'HRHB', reach);
    assert.ok(!contained.includes(ZEPCE_2));
});

// ── REGRESSION GUARD: the VRS-side (RBiH-enclave) release path is UNCHANGED ──────

test('REGRESSION: RBiH-enclave (Srebrenica) release still keys on srebrenica_fell / turn≥160', () => {
    const enclave = getEnclaveDefForOsid(SREBRENICA_2)!;
    assert.strictEqual(enclave.faction, 'RBiH');
    // Pre-pivot: not released.
    assert.strictEqual(isEnclaveContainmentReleased(stateAtTurn(140), enclave), false);
    // srebrenica_fell flag releases.
    assert.strictEqual(
        isEnclaveContainmentReleased(stateAtTurn(150, { eventFlags: { srebrenica_fell: true } }), enclave),
        true,
    );
    // turn≥160 backstop releases.
    assert.strictEqual(isEnclaveContainmentReleased(stateAtTurn(160), enclave), true);
    // washington_signed must NOT release a VRS-side enclave (wrong war).
    assert.strictEqual(
        isEnclaveContainmentReleased(stateAtTurn(140, { washingtonSigned: true }), enclave),
        false,
    );
});

test('REGRESSION: RS still contains Srebrenica pre-pivot, releases at backstop', () => {
    const reach = reachWithIsolatedRbih([SREBRENICA_2]);
    const pre = computeContainedOsidsForFaction(stateAtTurn(120), 'RS', reach);
    assert.ok(pre.includes(SREBRENICA_2), 'RS contains Srebrenica pre-pivot (unchanged)');
    const post = computeContainedOsidsForFaction(stateAtTurn(160), 'RS', reach);
    assert.ok(!post.includes(SREBRENICA_2), 'RS-side release at backstop (unchanged)');
});

// ── default-off PURITY (resumed-save stale-set guard, Codex P2) ────────────────
//
// The planner (commander/plan.ts) only honors `last_contained_osids_by_faction`
// when THAT faction's contain flag is enabled. A save written with a contain flag
// ON serializes the field; resumed with the flag OFF, the supply phase no longer
// clears it, but the planner must NOT read the stale set — default-off has to be
// a TRUE no-op for resumed saves too. We pin the gating signal both gates expose:
// with the flags OFF, neither faction's contain suppression is active, so the
// planner bypasses the (possibly stale) serialized set entirely.

test('PURITY: with both flags OFF, the planner contain-gate is INACTIVE for both factions', () => {
    setArbihContainPostureOverride(false);
    setVrsContainPostureOverride(false);
    // SRK strangle is DEFAULT-ON (2026-06-13, task #34) and is the third RS-side
    // contributor to isContainSuppressionActiveFor('RS'). Disable it explicitly to
    // isolate the Lane-A/Lane-V purity property (all RS-side contain inputs OFF).
    setSrkStranglePostureOverride(false);
    // This is the EXACT predicate the planner reads before honoring a serialized
    // last_contained_osids_by_faction set. OFF → false for both → a save written
    // with a contain flag ON (field serialized), resumed flag-OFF, is ignored →
    // byte-identical to never-flagged.
    assert.strictEqual(isContainSuppressionActiveFor('RBiH'), false);
    assert.strictEqual(isContainSuppressionActiveFor('RS'), false);
});

test('PURITY: planner contain-gate is INDEPENDENT per faction (RBiH on, RS off)', () => {
    setArbihContainPostureOverride(true);
    setVrsContainPostureOverride(false);
    // SRK strangle is DEFAULT-ON; disable it so "RS off" means all RS-side inputs off.
    setSrkStranglePostureOverride(false);
    assert.strictEqual(isContainSuppressionActiveFor('RBiH'), true, 'RBiH lane active → honor RBiH set');
    assert.strictEqual(isContainSuppressionActiveFor('RS'), false, 'RS lane inactive → stale RS set NOT honored');
    // HRHB is never a contain besieger.
    assert.strictEqual(isContainSuppressionActiveFor('HRHB'), false);
});

test('PURITY: flag ON → planner gate active (honors the set)', () => {
    setArbihContainPostureOverride(true);
    assert.strictEqual(isContainSuppressionActiveFor('RBiH'), true);
});

// ── determinism ────────────────────────────────────────────────────────────────

test('Lane-A contained set is sorted + deterministic (pure)', () => {
    const reach = reachWithIsolatedHrhb([ZEPCE_2, OZIMICA_2, VINISTE_2]);
    const a = computeContainedOsidsForFaction(stateAtTurn(60), 'RBiH', reach);
    const b = computeContainedOsidsForFaction(stateAtTurn(60), 'RBiH', reach);
    assert.deepStrictEqual(a, b);
    assert.deepStrictEqual(a, [...a].sort());
});
