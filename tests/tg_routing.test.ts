/**
 * Tactical Group Phase 2 ROUTING tests (ADR-0005 §"Migration of existing pre-planned ops",
 * §"Bot AI ops" + plan 2026-05-30 Phase 2).
 *
 * Phase 2 makes TG formation uniform: EVERY offensive operation forms a Tactical Group,
 * classified by KIND via a pure `op_kind_donor_policy` classifier:
 *
 *   - 'full'    — sector_attack / general_offensive (offensives) → form a TG, full donor pull.
 *   - 'limited' — strategic_defense / is_emergency (emergency reactions) → TG with ≤2 donors.
 *   - 'none'    — probe / feint / reorganization (low-commitment) → NO TG.
 *
 * Asserts:
 *   1. classifyOpDonorPolicy maps each op kind correctly; explicit override wins.
 *   2. donorCapForPolicy returns the right cap per policy.
 *   3. (flag-on) an offensive op forms a TG via formTgsAtReadyTransition.
 *   4. (flag-on) a probe ('none' policy) forms NO TG.
 *   5. (flag-on) an emergency op ('limited') caps the donor pull at 2.
 *   6. (flag-on) formation is idempotent — a second call does not double-form.
 */

import { describe, expect, it, vi } from 'vitest';
import type { CorpsOperation, FormationState, GameState, MilitaryState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import {
    classifyOpDonorPolicy,
    donorCapForPolicy,
    TG_LIMITED_POLICY_MAX_DONORS,
} from '../src/sim/combat/tactical_group_config.js';

// === Pure classifier + cap (flag-independent) ===

describe('classifyOpDonorPolicy — kind → policy mapping', () => {
    it('offensive kinds classify as full', () => {
        expect(classifyOpDonorPolicy({ type: 'sector_attack' })).toBe('full');
        expect(classifyOpDonorPolicy({ type: 'general_offensive' })).toBe('full');
    });

    it('emergency / strategic_defense classify as limited', () => {
        expect(classifyOpDonorPolicy({ type: 'strategic_defense' })).toBe('limited');
        expect(classifyOpDonorPolicy({ type: 'sector_attack', is_emergency: true })).toBe('limited');
    });

    it('probe / feint / reorganization classify as none', () => {
        expect(classifyOpDonorPolicy({ type: 'probe' })).toBe('none');
        expect(classifyOpDonorPolicy({ type: 'feint' })).toBe('none');
        expect(classifyOpDonorPolicy({ type: 'reorganization' })).toBe('none');
    });

    it('unset/unknown kind defaults to full (primary ops path)', () => {
        expect(classifyOpDonorPolicy({})).toBe('full');
    });

    it('explicit op_kind_donor_policy overrides the kind-derived default', () => {
        expect(classifyOpDonorPolicy({ type: 'probe', op_kind_donor_policy: 'full' })).toBe('full');
        expect(classifyOpDonorPolicy({ type: 'sector_attack', op_kind_donor_policy: 'none' })).toBe('none');
    });

    it('is a pure function — repeated calls are stable', () => {
        const op = { type: 'sector_attack' as const, is_emergency: true };
        expect(classifyOpDonorPolicy(op)).toBe(classifyOpDonorPolicy(op));
    });
});

describe('donorCapForPolicy', () => {
    it('none → 0 (no TG), limited → cap, full → undefined (module default)', () => {
        expect(donorCapForPolicy('none')).toBe(0);
        expect(donorCapForPolicy('limited')).toBe(TG_LIMITED_POLICY_MAX_DONORS);
        expect(donorCapForPolicy('full')).toBeUndefined();
    });
});

// === Flag-on routing (formTgsAtReadyTransition policy behaviour) ===

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, faction: 'RBiH', name: id, created_turn: 0, status: 'active', assignment: null,
        corps_id: 'corp_a',
        location_osid: 'op:m:s0',
        personnel: 2000,
        cohesion: 80,
        ...overrides,
    } as FormationState;
}

function stateWith(brigades: FormationState[], turn = 5): GameState {
    const formations: Record<string, FormationState> = {};
    for (const b of brigades) formations[b.id] = b;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'tg-routing', phase: 'war', player_faction: 'RBiH' } as any,
        military: {
            formations,
            tactical_groups: {},
            army_hq_operations: {},
            army_hq_last_op_turn: {},
            army_hq_op_count_by_year: {},
        } as Partial<MilitaryState> as MilitaryState,
    } as GameState;
}

function baseOp(overrides: Partial<CorpsOperation>): CorpsOperation {
    return {
        name: 'op_route_test',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 0,
        phase_started_turn: 0,
        participating_brigades: ['anchor'],
        staging_osid: 'op:m:s0',
        ...overrides,
    } as CorpsOperation;
}

async function withFormationFlagOn() {
    vi.resetModules();
    vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
        const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
            '../src/sim/combat/tactical_group_config.js',
        );
        return { ...actual, ENABLE_TG_FORMATION: true };
    });
    return import('../src/sim/combat/operation_preparation.js');
}

describe('formTgsAtReadyTransition routing (flag-on)', () => {
    it('offensive op (full) forms a TG with the anchor', async () => {
        const { formTgsAtReadyTransition } = await withFormationFlagOn();
        // Several adjacent donors present (all eligible); offensive op pulls the full set.
        const state = stateWith([
            brigade('anchor', { location_osid: 'op:m:s0' }),
            brigade('d1', { location_osid: 'op:m:s0' }),
            brigade('d2', { location_osid: 'op:m:s0' }),
            brigade('d3', { location_osid: 'op:m:s0' }),
            brigade('d4', { location_osid: 'op:m:s0' }),
        ]);
        const op = baseOp({ type: 'sector_attack', participating_brigades: ['anchor'] });
        formTgsAtReadyTransition(state, op, 5);
        const tgs = Object.values(state.military!.tactical_groups!);
        expect(tgs).toHaveLength(1);
        expect(tgs[0].anchor_brigade_id).toBe('anchor');
        // Phase 1.7 POWER FLOOR: full policy → offensive cap (MAX_DONORS_PER_TG_FULL_POLICY=6),
        // so all 4 eligible donors are kept (was capped at 3 pre-Phase-1.7).
        expect(tgs[0].donor_contributions.length).toBe(4);
    });

    it('probe op (none) forms NO TG', async () => {
        const { formTgsAtReadyTransition } = await withFormationFlagOn();
        const state = stateWith([
            brigade('anchor', { location_osid: 'op:m:s0' }),
            brigade('d1', { location_osid: 'op:m:s0' }),
        ]);
        const op = baseOp({ type: 'probe', participating_brigades: ['anchor'] });
        formTgsAtReadyTransition(state, op, 5);
        expect(Object.keys(state.military!.tactical_groups!)).toHaveLength(0);
    });

    it('emergency op (limited) caps the donor pull at 2', async () => {
        const { formTgsAtReadyTransition } = await withFormationFlagOn();
        const state = stateWith([
            brigade('anchor', { location_osid: 'op:m:s0' }),
            brigade('d1', { location_osid: 'op:m:s0' }),
            brigade('d2', { location_osid: 'op:m:s0' }),
            brigade('d3', { location_osid: 'op:m:s0' }),
            brigade('d4', { location_osid: 'op:m:s0' }),
        ]);
        const op = baseOp({ type: 'strategic_defense', is_emergency: true, participating_brigades: ['anchor'] });
        formTgsAtReadyTransition(state, op, 5);
        const tgs = Object.values(state.military!.tactical_groups!);
        expect(tgs).toHaveLength(1);
        expect(tgs[0].donor_contributions.length).toBe(TG_LIMITED_POLICY_MAX_DONORS);
    });

    it('is idempotent — a second call does not double-form the TG', async () => {
        const { formTgsAtReadyTransition } = await withFormationFlagOn();
        const state = stateWith([
            brigade('anchor', { location_osid: 'op:m:s0' }),
            brigade('d1', { location_osid: 'op:m:s0' }),
        ]);
        const op = baseOp({ type: 'sector_attack', participating_brigades: ['anchor'] });
        formTgsAtReadyTransition(state, op, 5);
        formTgsAtReadyTransition(state, op, 6);
        expect(Object.keys(state.military!.tactical_groups!)).toHaveLength(1);
    });

    it('flag-off: no TG formed (byte-identity guard)', async () => {
        // Default import — ENABLE_TG_FORMATION is false in the unmocked module.
        // doUnmock clears any flag-on doMock left registered by prior cases before reset.
        vi.doUnmock('../src/sim/combat/tactical_group_config.js');
        vi.resetModules();
        const { formTgsAtReadyTransition } = await import('../src/sim/combat/operation_preparation.js');
        const state = stateWith([
            brigade('anchor', { location_osid: 'op:m:s0' }),
            brigade('d1', { location_osid: 'op:m:s0' }),
        ]);
        const op = baseOp({ type: 'sector_attack', participating_brigades: ['anchor'] });
        formTgsAtReadyTransition(state, op, 5);
        expect(Object.keys(state.military!.tactical_groups!)).toHaveLength(0);
    });
});
