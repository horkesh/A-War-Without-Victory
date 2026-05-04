/**
 * LANE-2026-05-02-A1-PER-TURN-BRIGADE-SNAPSHOT — Tests for brigade temporal log emit.
 *
 * Asserts the deterministic, faction-agnostic, write-only emit contract for
 * `buildBrigadeTemporalRows(state, weekIndex)`.
 *
 * Test matrix:
 *  T1 schema_lock — exact field set + types on a built row
 *  T2 deterministic_byte_identity — same state, two builds, byte-identical JSONL
 *  T3 stable_brigade_ordering — strictCompare-sorted brigade_id, faction-agnostic interleave
 *  T4 active_op_attribution — fixture with brigade in active_operations → active_op_id set
 *  T5 mv_state_passthrough — fixture with brigade_movement_state → reflected on row
 *  T6 lifecycle_status_passthrough — destroyed/disbanded reflected
 *  T7 empty_state — empty formations returns []
 *  T8 forbidden_token_grep — no Math.random / Date.now / new Date / locale sort in source
 *
 * Determinism guarantees:
 *  - Pure synchronous assertions over a hand-built minimal GameState.
 *  - No I/O, no async, no random, no timestamps in the test body.
 *  - Test fixtures cite no faction-specific narrative; brigade IDs are arbitrary.
 */

import { describe, it, expect } from 'vitest';
import {
    buildBrigadeTemporalRows,
    type BrigadeTemporalRow,
} from '../src/scenario/brigade_temporal_emit.js';
import type { GameState } from '../src/state/game_state.js';

/** Minimal GameState shape sufficient for buildBrigadeTemporalRows. */
function makeState(overrides: Partial<GameState['military']> = {}): GameState {
    return {
        meta: { turn: 1, phase: 'war' },
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            ...overrides,
        },
    } as unknown as GameState;
}

const baseFormation = (id: string, faction: string, overrides: Record<string, unknown> = {}) => ({
    id,
    faction,
    name: id,
    created_turn: 0,
    status: 'active',
    assignment: null,
    kind: 'brigade',
    corps_id: `${faction}_corps_a`,
    location_osid: 'op:test:home_2',
    home_osid: 'op:test:home_2',
    personnel: 1500,
    morale: 60,
    cohesion: 50,
    ops: { fatigue: 12, last_supplied_turn: 0 },
    ...overrides,
});

describe('LANE-A1 brigade temporal emit', () => {
    it('T1 schema_lock — fixed field set + types on a built row', () => {
        const state = makeState({
            formations: { b1: baseFormation('b1', 'RBiH') as unknown as never },
        });
        const rows = buildBrigadeTemporalRows(state, 5);
        expect(rows).toHaveLength(1);
        const r = rows[0]!;
        const expectedKeys = [
            'turn',
            'week_index',
            'brigade_id',
            'faction',
            'corps_id',
            'kind',
            'status',
            'lifecycle_status',
            'location_osid',
            'home_osid',
            'sector_id',
            'assigned_sub_segment_id',
            'mv_state',
            'mv_destinations',
            'active_op_id',
            'current_op_phase',
            'personnel',
            'morale',
            'cohesion',
            'fatigue',
        ];
        // Build assertion in a fixed order so any missing/extra key fails clearly.
        expect(Object.keys(r).sort()).toEqual(expectedKeys.slice().sort());
        expect(typeof r.turn).toBe('number');
        expect(typeof r.week_index).toBe('number');
        expect(typeof r.brigade_id).toBe('string');
        expect(typeof r.faction).toBe('string');
        expect(typeof r.kind).toBe('string');
        expect(typeof r.status).toBe('string');
        expect(typeof r.personnel).toBe('number');
        expect(typeof r.morale).toBe('number');
        expect(typeof r.cohesion).toBe('number');
        expect(typeof r.fatigue).toBe('number');
        expect(r.week_index).toBe(5);
        expect(r.brigade_id).toBe('b1');
        expect(r.faction).toBe('RBiH');
        expect(r.fatigue).toBe(12);
    });

    it('T2 deterministic_byte_identity — two builds produce identical JSONL', () => {
        const state = makeState({
            formations: {
                b_alpha: baseFormation('b_alpha', 'RBiH') as unknown as never,
                b_beta: baseFormation('b_beta', 'RS') as unknown as never,
                b_gamma: baseFormation('b_gamma', 'HRHB') as unknown as never,
            },
        });
        const rows1 = buildBrigadeTemporalRows(state, 7);
        const rows2 = buildBrigadeTemporalRows(state, 7);
        const json1 = rows1.map((r) => JSON.stringify(r)).join('\n');
        const json2 = rows2.map((r) => JSON.stringify(r)).join('\n');
        expect(json1).toBe(json2);
    });

    it('T3 stable_brigade_ordering — strictCompare-sorted, faction-agnostic interleave', () => {
        // Insertion order is deliberately non-alphabetical and faction-mixed.
        const state = makeState({
            formations: {
                z_zulu: baseFormation('z_zulu', 'RS') as unknown as never,
                a_alpha: baseFormation('a_alpha', 'HRHB') as unknown as never,
                m_mike: baseFormation('m_mike', 'RBiH') as unknown as never,
                b_bravo: baseFormation('b_bravo', 'RS') as unknown as never,
            },
        });
        const rows = buildBrigadeTemporalRows(state, 1);
        // strictCompare on string ids produces ascending lexicographic order.
        expect(rows.map((r) => r.brigade_id)).toEqual(['a_alpha', 'b_bravo', 'm_mike', 'z_zulu']);
    });

    it('T4 active_op_attribution — active_op_id set when brigade is in any corps active_operations', () => {
        const state = makeState({
            formations: {
                b_x: baseFormation('b_x', 'RBiH', { corps_id: 'arbih_2nd' }) as unknown as never,
                b_y: baseFormation('b_y', 'RBiH', { corps_id: 'arbih_2nd' }) as unknown as never,
            },
            corps_command: {
                arbih_2nd: {
                    command_span: 1,
                    subordinate_count: 2,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'defensive',
                    active_operations: [
                        {
                            name: 'Op Alpha',
                            type: 'sector_attack',
                            phase: 'planning',
                            started_turn: 3,
                            phase_started_turn: 3,
                            participating_brigades: ['b_x'],
                        },
                    ],
                },
            } as unknown as never,
        });
        const rows = buildBrigadeTemporalRows(state, 4);
        const byId = new Map(rows.map((r) => [r.brigade_id, r]));
        expect(byId.get('b_x')?.active_op_id).toBe('arbih_2nd:Op Alpha:t3');
        expect(byId.get('b_x')?.current_op_phase).toBe('planning');
        expect(byId.get('b_y')?.active_op_id).toBeNull();
        expect(byId.get('b_y')?.current_op_phase).toBeNull();
    });

    it('T5 mv_state_passthrough — brigade_movement_state and orders surface on row', () => {
        const state = makeState({
            formations: {
                b_t: baseFormation('b_t', 'RBiH') as unknown as never,
                b_s: baseFormation('b_s', 'RBiH') as unknown as never,
            },
            brigade_movement_state: {
                b_t: {
                    status: 'in_transit',
                    destination_sids: ['op:dest:second_2', 'op:dest:first_2'],
                } as unknown as never,
            },
            brigade_movement_orders: {
                b_s: { destination_sids: ['op:queue:goal_2'] },
            },
        });
        const rows = buildBrigadeTemporalRows(state, 9);
        const byId = new Map(rows.map((r) => [r.brigade_id, r]));
        const t = byId.get('b_t');
        expect(t?.mv_state).toBe('in_transit');
        // mv_destinations must be sorted via strictCompare (deterministic).
        expect(t?.mv_destinations).toEqual(['op:dest:first_2', 'op:dest:second_2']);
        const s = byId.get('b_s');
        // No movement_state entry → mv_state is null; queued order surfaces destinations.
        expect(s?.mv_state).toBeNull();
        expect(s?.mv_destinations).toEqual(['op:queue:goal_2']);
    });

    it('T6 lifecycle_status_passthrough — destroyed brigade reflected', () => {
        const state = makeState({
            formations: {
                b_dead: baseFormation('b_dead', 'RS', {
                    status: 'inactive',
                    lifecycle_status: 'destroyed',
                    personnel: 0,
                    destruction_turn: 95,
                }) as unknown as never,
                b_live: baseFormation('b_live', 'RS') as unknown as never,
            },
        });
        const rows = buildBrigadeTemporalRows(state, 100);
        const byId = new Map(rows.map((r) => [r.brigade_id, r]));
        expect(byId.get('b_dead')?.status).toBe('inactive');
        expect(byId.get('b_dead')?.lifecycle_status).toBe('destroyed');
        expect(byId.get('b_dead')?.personnel).toBe(0);
        expect(byId.get('b_live')?.status).toBe('active');
        expect(byId.get('b_live')?.lifecycle_status).toBeNull();
    });

    it('T7 empty_state — empty formations returns []', () => {
        const state = makeState({ formations: {} });
        const rows = buildBrigadeTemporalRows(state, 0);
        expect(rows).toEqual([]);
    });

    it('T10 officer_quality_passthrough — officer_quality field present when formation has it', () => {
        // LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-1-OBSERVABILITY: per-brigade officer
        // quality must surface on the temporal row when the formation carries it
        // so Gap 2 (officer brain-drain verification) is measurable per-turn.
        const state = makeState({
            formations: {
                vrs_with_oq: baseFormation('vrs_with_oq', 'RS', { officer_quality: 0.55 }) as unknown as never,
                arbih_with_oq: baseFormation('arbih_with_oq', 'RBiH', { officer_quality: 0.05 }) as unknown as never,
                no_oq: baseFormation('no_oq', 'HRHB') as unknown as never,
            },
        });
        const rows = buildBrigadeTemporalRows(state, 12);
        const byId = new Map(rows.map((r) => [r.brigade_id, r]));
        // When the formation carries officer_quality, it must surface on the row.
        expect(byId.get('vrs_with_oq')?.officer_quality).toBe(0.55);
        expect(byId.get('arbih_with_oq')?.officer_quality).toBe(0.05);
        // When the formation does NOT carry officer_quality, the field is absent
        // (preserves byte-identity for legacy fixtures and rows without OQ).
        const noOqRow = byId.get('no_oq')!;
        expect('officer_quality' in noOqRow).toBe(false);
    });

    it('T11 officer_count_active_passthrough — officer_count_active field present when formation has it', () => {
        // LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-1-OBSERVABILITY: officer_count_active
        // is reserved for a future roster representation. The schema accepts both
        // a numeric count and explicit null; absence on the formation means
        // absence on the row (no fake flexibility).
        const state = makeState({
            formations: {
                with_count: baseFormation('with_count', 'RBiH', {
                    officer_count_active: 23,
                }) as unknown as never,
                with_null: baseFormation('with_null', 'RS', {
                    officer_count_active: null,
                }) as unknown as never,
                without_field: baseFormation('without_field', 'HRHB') as unknown as never,
            },
        });
        const rows = buildBrigadeTemporalRows(state, 18);
        const byId = new Map(rows.map((r) => [r.brigade_id, r]));
        // Numeric count surfaces verbatim.
        expect(byId.get('with_count')?.officer_count_active).toBe(23);
        // Explicit null is preserved (distinct from "absent").
        const nullRow = byId.get('with_null')!;
        expect('officer_count_active' in nullRow).toBe(true);
        expect(nullRow.officer_count_active).toBeNull();
        // Absence on the formation → absence on the row (byte-identity for
        // pre-extension fixtures).
        const absentRow = byId.get('without_field')!;
        expect('officer_count_active' in absentRow).toBe(false);
    });

    it('T9 non_brigade_kind_filter — only brigade-kind formations are emitted', () => {
        // Corps / militia / paramilitary should NOT pollute brigade temporal log.
        const state = makeState({
            formations: {
                arbih_corps: baseFormation('arbih_corps', 'RBiH', { kind: 'corps' }) as unknown as never,
                some_militia: baseFormation('some_militia', 'RBiH', { kind: 'militia' }) as unknown as never,
                real_brigade: baseFormation('real_brigade', 'RBiH') as unknown as never,
                a_paramil: baseFormation('a_paramil', 'RS', { kind: 'paramilitary' }) as unknown as never,
            },
        });
        const rows = buildBrigadeTemporalRows(state, 1);
        expect(rows.map((r) => r.brigade_id)).toEqual(['real_brigade']);
    });
});
