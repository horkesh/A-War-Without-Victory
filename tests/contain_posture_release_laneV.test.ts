/**
 * contain Lane V — VRS strangle-not-capture contain-posture: RELEASE RELIABILITY.
 *
 * Design: docs/plans/2026-06-08-vrs-contain-posture-laneV-design.md.
 *
 * THE §6 HARD INVARIANT under test: the 1995-pivot RELEASE must reliably fire so
 * the eastern enclaves are NO LONGER contained inside the historical fall window
 * (t160-190). If containment did not lift, the bot's organic targeting would stay
 * suppressed, but the event-owned *_falls_1995 receipts still own the control
 * transition. Krivaja-95/Stupcanica-95 are separate chronology/AAR context rows,
 * not fall-delivery mechanics; this suite proves the CONTAINMENT SET itself is
 * empty for the eastern pockets once released, so nothing about the posture can
 * interfere with the fall.
 *
 * Covers:
 *   - the gate is DEFAULT-OFF (env-fallback) and override-controllable;
 *   - `isEnclaveContainmentReleased` fires on `srebrenica_fell` OR turn≥160;
 *   - `computeContainedOsidsForFaction('RS', ...)` contains Srebrenica/Žepa
 *     PRE-pivot, and EMPTIES them POST-release (both signals);
 *   - Goražde stays contained pre-pivot but also releases at the turn backstop;
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
    CONTAIN_RELEASE_TURN_BACKSTOP,
} from '../src/sim/combat/enclave_resilience.js';
import {
    isVrsContainPostureEnabled,
    setVrsContainPostureOverride,
    resetVrsContainPostureGate,
} from '../src/sim/combat/contain_posture_gate.js';

const SREBRENICA_2 = 'op:srebrenica:srebrenica_2';
const ZEPA_2 = 'op:rogatica:zepa_2';
const GORAZDE_2 = 'op:gorazde:gorazde_2';

/** Build a minimal GameState at a given turn, with optional event_flags. */
function stateAtTurn(turn: number, eventFlags: Record<string, boolean> = {}): GameState {
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
            event_flags: eventFlags,
        } as unknown as GameState['military'],
        political: {} as unknown as GameState['political'],
        displacement: {} as unknown as GameState['displacement'],
    } as GameState;
}

/** BFS report marking the given OSIDs as isolated for the RBiH enclave faction. */
function reachWithIsolated(isolated: string[], turn = 0): SupplyReachabilityOsidReport {
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

afterEach(() => resetVrsContainPostureGate());

// ── gate default-off ─────────────────────────────────────────────────────────

test('contain-posture gate is DEFAULT-OFF (env unset)', () => {
    resetVrsContainPostureGate();
    const prev = process.env.AWWV_VRS_CONTAIN_POSTURE;
    delete process.env.AWWV_VRS_CONTAIN_POSTURE;
    try {
        assert.strictEqual(isVrsContainPostureEnabled(), false);
    } finally {
        if (prev !== undefined) process.env.AWWV_VRS_CONTAIN_POSTURE = prev;
    }
});

test('gate override controls the flag (tests)', () => {
    setVrsContainPostureOverride(true);
    assert.strictEqual(isVrsContainPostureEnabled(), true);
    setVrsContainPostureOverride(false);
    assert.strictEqual(isVrsContainPostureEnabled(), false);
});

// ── release predicate ─────────────────────────────────────────────────────────

test('release does NOT fire pre-pivot (turn < backstop, no fall flag)', () => {
    const enclave = getEnclaveDefForOsid(SREBRENICA_2)!;
    assert.strictEqual(isEnclaveContainmentReleased(stateAtTurn(140), enclave), false);
    assert.strictEqual(isEnclaveContainmentReleased(stateAtTurn(159), enclave), false);
});

test('release FIRES on srebrenica_fell flag (event-driven, even pre-backstop turn)', () => {
    const enclave = getEnclaveDefForOsid(SREBRENICA_2)!;
    const st = stateAtTurn(150, { srebrenica_fell: true });
    assert.strictEqual(isEnclaveContainmentReleased(st, enclave), true);
});

test('release FIRES at the turn backstop (turn ≥ 160) even without the flag', () => {
    const enclave = getEnclaveDefForOsid(SREBRENICA_2)!;
    assert.strictEqual(CONTAIN_RELEASE_TURN_BACKSTOP, 160);
    assert.strictEqual(isEnclaveContainmentReleased(stateAtTurn(160), enclave), true);
    assert.strictEqual(isEnclaveContainmentReleased(stateAtTurn(185), enclave), true);
});

// ── contained set: pre-pivot ───────────────────────────────────────────────────

test('PRE-pivot: RS contains Srebrenica + Žepa when isolated', () => {
    const reach = reachWithIsolated([SREBRENICA_2, ZEPA_2]);
    const contained = computeContainedOsidsForFaction(stateAtTurn(120), 'RS', reach);
    assert.ok(contained.includes(SREBRENICA_2), 'Srebrenica contained pre-pivot');
    assert.ok(contained.includes(ZEPA_2), 'Žepa contained pre-pivot');
});

test('PRE-pivot: Goražde contained when isolated', () => {
    const reach = reachWithIsolated([GORAZDE_2]);
    const contained = computeContainedOsidsForFaction(stateAtTurn(120), 'RS', reach);
    assert.ok(contained.includes(GORAZDE_2), 'Goražde contained pre-pivot');
});

// ── THE §6 RELEASE-RELIABILITY INVARIANT: post-release set is EMPTY for eastern ──

test('RELEASE (srebrenica_fell): eastern enclaves DROP OUT of the contained set', () => {
    const reach = reachWithIsolated([SREBRENICA_2, ZEPA_2]);
    const st = stateAtTurn(150, { srebrenica_fell: true });
    const contained = computeContainedOsidsForFaction(st, 'RS', reach);
    assert.ok(!contained.includes(SREBRENICA_2), 'Srebrenica RELEASED → bot free to target → still falls');
    assert.ok(!contained.includes(ZEPA_2), 'Žepa RELEASED → bot free to target → still falls');
});

test('RELEASE (turn ≥ 160 backstop): NOTHING is contained in the fall window', () => {
    const reach = reachWithIsolated([SREBRENICA_2, ZEPA_2, GORAZDE_2]);
    // Across the entire historical fall window the contained set is empty —
    // the posture cannot interfere with the scripted/triggered fall.
    for (const turn of [160, 170, 172, 185, 190]) {
        const contained = computeContainedOsidsForFaction(stateAtTurn(turn), 'RS', reach);
        assert.deepStrictEqual(
            contained,
            [],
            `containment fully lifted at t${turn} (release backstop) — Srebrenica/Žepa/Goražde all free`,
        );
    }
});

// ── faction-agnostic guard: enclave faction never contains its own pocket ───────

test('RBiH (enclave faction) never contains its own Srebrenica', () => {
    const reach = reachWithIsolated([SREBRENICA_2]);
    const contained = computeContainedOsidsForFaction(stateAtTurn(120), 'RBiH', reach);
    assert.ok(!contained.includes(SREBRENICA_2));
});

// ── determinism ────────────────────────────────────────────────────────────────

test('contained set is sorted + deterministic (pure)', () => {
    const reach = reachWithIsolated([ZEPA_2, SREBRENICA_2, GORAZDE_2]);
    const a = computeContainedOsidsForFaction(stateAtTurn(100), 'RS', reach);
    const b = computeContainedOsidsForFaction(stateAtTurn(100), 'RS', reach);
    assert.deepStrictEqual(a, b);
    assert.deepStrictEqual(a, [...a].sort());
});

test('no supply report → nothing contained', () => {
    assert.deepStrictEqual(computeContainedOsidsForFaction(stateAtTurn(100), 'RS', undefined), []);
    assert.deepStrictEqual(computeContainedOsidsForFaction(stateAtTurn(100), 'RS', null), []);
});
