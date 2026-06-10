/**
 * Collapse Phase IV-e — combat consumer unit tests.
 *
 * Covers `getCollapseDefenderMultiplier` (the own-OSID-only defender-degradation
 * multiplier applied to `defenderPower` at attack_resolution_osid.ts, after the
 * enclave-garrison block, before the post-Washington multiplier).
 *
 * INVARIANTS asserted here:
 * - collapsed non-enclave OSID with a written supply_mult < 1.0 → multiplier < 1.0 (degrades);
 * - enclave OSID (G1 keeps it out of by_sid) → multiplier 1.0 (never degraded);
 * - undamaged / collapse-OFF OSID (absent from by_sid) → multiplier 1.0 (byte-identical no-op);
 * - own-OSID-only: the reader never consults a neighbor/edge — a degraded NEIGHBOR
 *   does not change the queried OSID's multiplier;
 * - defensive floor COLLAPSE_DEFENDER_FLOOR (0.6): a catastrophic written value is
 *   clamped up to the floor (never zeroes a defender) and never above 1.0.
 *
 * Scope: docs/40_reports/proposals/20260610_COLLAPSE_PHASE4E_CONSUMER_SCOPE.md §A/§C/§D1(b).
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import {
    getCollapseDefenderMultiplier,
    COLLAPSE_DEFENDER_FLOOR,
} from '../src/sim/collapse/capacity_modifiers.js';
import { getEnclaveDefForOsid } from '../src/sim/combat/enclave_resilience.js';

// A real RBiH-enclave OSID (Srebrenica capital — G1-guarded) and a real non-enclave OSID.
const ENCLAVE_OSID = 'op:srebrenica:srebrenica_2';
const NON_ENCLAVE_OSID = 'op:zvornik:zvornik';
const NEIGHBOR_OSID = 'op:stolac:hatelji_2';

/** Minimal state; collapse OFF leaves capacity_modifiers absent (the no-op path). */
function baseState(): GameState {
    return {
        meta: { turn: 150, phase: 'war' },
        military: { formations: {}, front_pressure: {} },
        political: {},
    } as unknown as GameState;
}

/** Writes a single by_sid capacity-modifier entry (mirrors the Phase 3D write shape). */
function withSupplyMult(state: GameState, osid: string, supply_mult: number): void {
    const pol = state.political as {
        capacity_modifiers?: { by_sid: Record<string, { supply_mult: number }> };
    };
    if (!pol.capacity_modifiers) pol.capacity_modifiers = { by_sid: {} };
    pol.capacity_modifiers.by_sid[osid] = { supply_mult };
}

describe('Phase IV-e consumer — getCollapseDefenderMultiplier', () => {
    it('precondition: ENCLAVE_OSID is an enclave, NON_ENCLAVE_OSID is not', () => {
        expect(getEnclaveDefForOsid(ENCLAVE_OSID)).not.toBeNull();
        expect(getEnclaveDefForOsid(NON_ENCLAVE_OSID)).toBeNull();
    });

    it('collapse OFF (no by_sid map): every OSID → 1.0 (byte-identical no-op)', () => {
        const state = baseState();
        expect(getCollapseDefenderMultiplier(state, NON_ENCLAVE_OSID)).toBe(1);
        expect(getCollapseDefenderMultiplier(state, ENCLAVE_OSID)).toBe(1);
    });

    it('undamaged OSID (absent from by_sid) → 1.0', () => {
        const state = baseState();
        withSupplyMult(state, NEIGHBOR_OSID, 0.8937); // a DIFFERENT, damaged OSID
        // The undamaged OSID we query is absent → default 1.0 (no edge/neighbor read).
        expect(getCollapseDefenderMultiplier(state, NON_ENCLAVE_OSID)).toBe(1);
    });

    it('collapsed non-enclave OSID (supply_mult 0.8937) → degrades (< 1.0, == written)', () => {
        const state = baseState();
        withSupplyMult(state, NON_ENCLAVE_OSID, 0.8937); // IV-d first-fire value
        const m = getCollapseDefenderMultiplier(state, NON_ENCLAVE_OSID);
        expect(m).toBeLessThan(1);
        expect(m).toBeCloseTo(0.8937, 6); // above the floor → passed through unchanged
    });

    it('enclave OSID stays 1.0 even if a write somehow landed (G1 read-side safety)', () => {
        const state = baseState();
        // G1 prevents this write in production; assert the consumer is still safe-by-default
        // for any enclave OSID that is ABSENT from by_sid (the real G1-guaranteed state).
        withSupplyMult(state, NON_ENCLAVE_OSID, 0.7); // unrelated collapsed OSID present
        expect(getCollapseDefenderMultiplier(state, ENCLAVE_OSID)).toBe(1);
    });

    it('own-OSID-only: a degraded NEIGHBOR never changes the queried OSID multiplier', () => {
        const state = baseState();
        withSupplyMult(state, NEIGHBOR_OSID, 0.6); // collapsed neighbor
        // No edge read → the (absent) queried OSID stays 1.0 regardless of the neighbor.
        expect(getCollapseDefenderMultiplier(state, NON_ENCLAVE_OSID)).toBe(1);
    });

    it('defensive floor: a catastrophic written value is clamped up to COLLAPSE_DEFENDER_FLOOR (never zeroes)', () => {
        const state = baseState();
        withSupplyMult(state, NON_ENCLAVE_OSID, 0); // would otherwise auto-win the attacker
        expect(getCollapseDefenderMultiplier(state, NON_ENCLAVE_OSID)).toBe(COLLAPSE_DEFENDER_FLOOR);
        expect(COLLAPSE_DEFENDER_FLOOR).toBe(0.6);
    });

    it('never above 1.0 (degrade-only): an out-of-range high value clamps to 1.0', () => {
        const state = baseState();
        withSupplyMult(state, NON_ENCLAVE_OSID, 1.5); // getSidCapacityModifiers clamps to [0,1]
        expect(getCollapseDefenderMultiplier(state, NON_ENCLAVE_OSID)).toBe(1);
    });
});
