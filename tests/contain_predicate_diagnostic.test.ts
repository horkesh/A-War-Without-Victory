/**
 * contain Lane 1 — isEnclaveContainable predicate + per-turn diagnostic.
 *
 * Design: docs/plans/2026-06-07-contain-enclave-faction-agnostic-design.md §4.
 *
 * Verifies:
 *   - the predicate is TRUE for the right (besieger, enclave-OSID) pairs at the
 *     right turns ((RS/VRS, srebrenica_2) from t16; (RBiH/ARBiH, zepce_2) from t30);
 *   - it is FALSE for non-isolated / wrong-faction / too-early / soft targets;
 *   - the diagnostic surfaces those pairs deterministically (byte-stable JSON).
 *
 * The predicate + diagnostic are pure observers (Lane 1 is byte-identical and
 * wired into nothing); these tests assert observation only.
 */

import assert from 'node:assert';
import { test } from 'vitest';

import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import type { SupplyReachabilityOsidReport } from '../src/state/supply_reachability_osid.js';
import { isEnclaveContainable } from '../src/sim/combat/enclave_resilience.js';
import { buildContainDiagnostic } from '../src/sim/combat/contain_diagnostic.js';

const SREBRENICA_2 = 'op:srebrenica:srebrenica_2';
const ZEPCE_2 = 'op:zepce:zepce_2';

/** Build a minimal GameState at a given turn. */
function stateAtTurn(turn: number): GameState {
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
        } as unknown as GameState['military'],
        political: {} as unknown as GameState['political'],
        displacement: {} as unknown as GameState['displacement'],
    } as GameState;
}

/** Build a BFS report marking the given OSIDs as isolated for one faction. */
function reachWithIsolated(
    factionId: string,
    isolated: string[],
    turn = 0,
): SupplyReachabilityOsidReport {
    return {
        schema: 1,
        turn,
        factions: [
            {
                faction_id: factionId,
                sources: [],
                controlled: [...isolated],
                reachable_osids: [],
                isolated_osids: [...isolated],
                edges_used: [],
            },
        ],
    };
}

// ── (a)+(b)+(c) true cases ───────────────────────────────────────────────────

test('VRS contains Srebrenica when isolated and past t16', () => {
    const reach = reachWithIsolated('RBiH', [SREBRENICA_2]);
    // RS (VRS) is the besieger; srebrenica enclave faction is RBiH.
    assert.strictEqual(isEnclaveContainable(stateAtTurn(16), SREBRENICA_2, 'RS', reach), true);
    assert.strictEqual(isEnclaveContainable(stateAtTurn(40), SREBRENICA_2, 'RS', reach), true);
});

test('ARBiH contains Žepče when isolated and past t30', () => {
    const reach = reachWithIsolated('HRHB', [ZEPCE_2]);
    // RBiH (ARBiH) is the besieger; zepce enclave faction is HRHB.
    assert.strictEqual(isEnclaveContainable(stateAtTurn(30), ZEPCE_2, 'RBiH', reach), true);
    assert.strictEqual(isEnclaveContainable(stateAtTurn(60), ZEPCE_2, 'RBiH', reach), true);
});

// ── (c) too-early ────────────────────────────────────────────────────────────

test('Srebrenica NOT containable before t16', () => {
    const reach = reachWithIsolated('RBiH', [SREBRENICA_2]);
    assert.strictEqual(isEnclaveContainable(stateAtTurn(15), SREBRENICA_2, 'RS', reach), false);
});

test('Žepče NOT containable before t30', () => {
    const reach = reachWithIsolated('HRHB', [ZEPCE_2]);
    assert.strictEqual(isEnclaveContainable(stateAtTurn(29), ZEPCE_2, 'RBiH', reach), false);
});

// ── (b) not isolated (soft / supplied target) ────────────────────────────────

test('Srebrenica NOT containable when not isolated (soft target)', () => {
    const reach = reachWithIsolated('RBiH', []); // nothing isolated
    assert.strictEqual(isEnclaveContainable(stateAtTurn(40), SREBRENICA_2, 'RS', reach), false);
});

test('non-enclave OSID is never containable', () => {
    const reach = reachWithIsolated('RBiH', ['op:tuzla:tuzla_2']);
    assert.strictEqual(isEnclaveContainable(stateAtTurn(40), 'op:tuzla:tuzla_2', 'RS', reach), false);
});

// ── (a) besieger is the enclave's own faction → never containable ─────────────

test('enclave faction cannot besiege its own pocket', () => {
    const reach = reachWithIsolated('RBiH', [SREBRENICA_2]);
    // RBiH is Srebrenica's own faction — predicate (a) fails.
    assert.strictEqual(isEnclaveContainable(stateAtTurn(40), SREBRENICA_2, 'RBiH', reach), false);
    const reachZ = reachWithIsolated('HRHB', [ZEPCE_2]);
    assert.strictEqual(isEnclaveContainable(stateAtTurn(60), ZEPCE_2, 'HRHB', reachZ), false);
});

// ── missing report ───────────────────────────────────────────────────────────

test('no supply report → not containable', () => {
    assert.strictEqual(isEnclaveContainable(stateAtTurn(40), SREBRENICA_2, 'RS', undefined), false);
    assert.strictEqual(isEnclaveContainable(stateAtTurn(40), SREBRENICA_2, 'RS', null), false);
});

// ── diagnostic surface ───────────────────────────────────────────────────────

test('diagnostic surfaces (RS, srebrenica) containable at t16, not at t15', () => {
    const reach = reachWithIsolated('RBiH', [SREBRENICA_2]);

    const early = buildContainDiagnostic(stateAtTurn(15), reach);
    const srbEarly = early.pairs.find(
        (p) => p.enclave_id === 'srebrenica' && p.besieging_faction === 'RS',
    );
    assert.ok(srbEarly, 'srebrenica/RS pair present');
    assert.strictEqual(srbEarly!.containable, false);

    const at16 = buildContainDiagnostic(stateAtTurn(16), reach);
    const srb16 = at16.pairs.find(
        (p) => p.enclave_id === 'srebrenica' && p.besieging_faction === 'RS',
    );
    assert.ok(srb16);
    assert.strictEqual(srb16!.containable, true);
    assert.strictEqual(srb16!.containable_osid_count, 1);
    assert.strictEqual(srb16!.isolated_osid_count, 1);
});

test('diagnostic surfaces (RBiH, zepce) containable at t30', () => {
    const reach = reachWithIsolated('HRHB', [ZEPCE_2]);
    const at30 = buildContainDiagnostic(stateAtTurn(30), reach);
    const z = at30.pairs.find(
        (p) => p.enclave_id === 'zepce' && p.besieging_faction === 'RBiH',
    );
    assert.ok(z);
    assert.strictEqual(z!.containable, true);
    assert.ok(at30.containable_pairs >= 1);
});

test('diagnostic never lists an enclave faction as its own besieger', () => {
    const reach = reachWithIsolated('RBiH', [SREBRENICA_2]);
    const d = buildContainDiagnostic(stateAtTurn(40), reach);
    for (const p of d.pairs) {
        assert.notStrictEqual(p.besieging_faction, p.enclave_faction);
    }
});

// ── determinism ──────────────────────────────────────────────────────────────

test('diagnostic is deterministic (byte-identical across repeated builds)', () => {
    const reach = reachWithIsolated('RBiH', [SREBRENICA_2, 'op:gorazde:gorazde_2']);
    const a = buildContainDiagnostic(stateAtTurn(50), reach);
    const b = buildContainDiagnostic(stateAtTurn(50), reach);
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b));

    // pairs are sorted by (enclave_id, besieging_faction) — stable order.
    const keys = a.pairs.map((p) => `${p.enclave_id}|${p.besieging_faction}`);
    const sorted = [...keys].sort();
    assert.deepStrictEqual(keys, sorted);
});

test('predicate is deterministic (pure: same inputs → same output)', () => {
    const reach = reachWithIsolated('RBiH', [SREBRENICA_2]);
    const st = stateAtTurn(20);
    for (let i = 0; i < 5; i++) {
        assert.strictEqual(isEnclaveContainable(st, SREBRENICA_2, 'RS', reach), true);
    }
});
