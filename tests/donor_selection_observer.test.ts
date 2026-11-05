import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CorpsOperation, FormationState, GameState, MilitaryState, OperationAxis } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';
import { selectDonors } from '../src/sim/combat/tactical_group_selection.js';
import { getReservedPrePlannedBrigadeIds } from '../src/sim/combat/pre_planned_operations.js';
import { formTgForAxis } from '../src/sim/combat/operation_preparation.js';

const PREFIX = '[mistral_tg_donor_selection] ';

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, faction: 'RBiH', name: id, created_turn: 0, status: 'active', assignment: null,
        corps_id: 'corp_a', location_osid: 'op:m:s0', personnel: 2000, cohesion: 80,
        ...overrides,
    } as FormationState;
}

function stateWith(brigades: FormationState[], turn = 5): GameState {
    const formations: Record<string, FormationState> = {};
    for (const b of brigades) formations[b.id] = b;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'donor-observer', phase: 'war', player_faction: 'RBiH' } as any,
        military: { formations, tactical_groups: {} } as Partial<MilitaryState> as MilitaryState,
    } as GameState;
}

function chain(): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (let i = 0; i <= 8; i++) {
        const next: string[] = [];
        if (i > 0) next.push(`op:m:s${i - 1}`);
        if (i < 8) next.push(`op:m:s${i + 1}`);
        out.set(`op:m:s${i}`, next);
    }
    return out;
}

function records(log: ReturnType<typeof vi.spyOn>): any[] {
    return log.mock.calls
        .map(([line]) => String(line))
        .filter(line => line.startsWith(PREFIX))
        .map(line => JSON.parse(line.slice(PREFIX.length)));
}

describe('donor selection observer', () => {
    beforeEach(() => {
        delete process.env.AWWV_DEBUG_REASON_CODES;
        resetReasonCodeTopicCacheForTests();
    });
    afterEach(() => {
        delete process.env.AWWV_DEBUG_REASON_CODES;
        resetReasonCodeTopicCacheForTests();
        vi.restoreAllMocks();
    });

    it('is silent by default and leaves result and state bytes identical', () => {
        const state = stateWith([brigade('anchor'), brigade('donor')]);
        const before = JSON.stringify(state);
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const actual = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:m:s0' });
        expect(actual.map(d => d.brigade_id)).toEqual(['donor']);
        expect(JSON.stringify(state)).toBe(before);
        expect(records(log)).toEqual([]);
    });

    it('reports each executed first rejection, survivor order, cap, contribution, and caller binding', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'mistral_tg_donor_selection';
        resetReasonCodeTopicCacheForTests();
        const reserved = [...getReservedPrePlannedBrigadeIds(0)].sort()[0];
        expect(reserved).toBeTruthy();
        const formations = [
            brigade('anchor'),
            brigade('inactive', { status: 'inactive' }),
            brigade('wrong_faction', { faction: 'RS' }),
            brigade('no_corps', { corps_id: undefined }),
            brigade(reserved!, { corps_id: 'corp_a' }),
            brigade('low_cohesion', { cohesion: 49 }),
            brigade('already_lending', { personnel_lent_by_tg: { tg_x: 1 } }),
            brigade('cooldown', { tg_cooldown_until_turn: 2 }),
            brigade('donation_cap', { tg_donations_this_scenario: 3 }),
            brigade('too_far', { location_osid: 'op:m:s7' }),
            brigade('zero_contribution', { personnel: 800 }),
            brigade('z_selected', { location_osid: 'op:m:s1', corps_id: 'corp_b' }),
            brigade('a_selected', { location_osid: 'op:m:s1', corps_id: 'corp_a' }),
            brigade('m_selected', { location_osid: 'op:m:s2', corps_id: 'corp_a' }),
            brigade('capped_out', { location_osid: 'op:m:s3', corps_id: 'corp_a' }),
        ];
        for (let i = 0; i <= 8; i++) formations.push(brigade(`territory_${i}`, {
            location_osid: `op:m:s${i}`, cohesion: 0, corps_id: 'corp_a',
        }));
        // Deliberately reverse insertion order; emitted population and survivors must remain stable.
        const state = stateWith([...formations].reverse(), 0);
        const before = JSON.stringify(state);
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const selected = selectDonors(state, {
            anchor_brigade_id: 'anchor', staging_osid: 'op:m:s0', adjacency: chain(),
            max_donors: 3,
            observation: {
                caller_turn: 0, operation_name: 'direct fixture', operation_id: null,
                axis_id: null, corps_id: null, caller_stage: 'direct',
            },
        });
        expect(selected.map(d => d.brigade_id)).toEqual(['a_selected', 'z_selected', 'm_selected']);
        expect(JSON.stringify(state)).toBe(before);

        const [record] = records(log);
        expect(record).toMatchObject({
            schema_version: 1, kind: 'donor_selection', turn: 0, caller_turn: 0,
            operation_name: 'direct fixture', axis_id: null, corps_id: null,
            caller_stage: 'direct', anchor_brigade_id: 'anchor', population_count: formations.length,
            survivor_count: 4, selected_count: 3, effective_cap: 3,
            survivor_order: ['a_selected', 'z_selected', 'm_selected', 'capped_out'],
            selected_order: ['a_selected', 'z_selected', 'm_selected'],
        });
        const byId = Object.fromEntries(record.population.map((entry: any) => [entry.brigade_id, entry]));
        expect(byId.anchor.first_rejection).toBe('anchor');
        expect(byId.inactive.first_rejection).toBe('inactive');
        expect(byId.wrong_faction.first_rejection).toBe('wrong_faction');
        expect(byId.no_corps.first_rejection).toBe('corps_scope');
        expect(byId[reserved!].first_rejection).toBe('reserved_pre_planned');
        expect(byId.low_cohesion.first_rejection).toBe('cohesion');
        expect(byId.already_lending.first_rejection).toBe('already_lending');
        expect(byId.cooldown.first_rejection).toBe('cooldown');
        expect(byId.donation_cap.first_rejection).toBe('donation_cap');
        expect(byId.too_far.first_rejection).toBe('distance');
        expect(byId.zero_contribution.first_rejection).toBe('nonpositive_contribution');
        expect(byId.a_selected).toMatchObject({ first_rejection: null, outcome: 'selected', survivor_index: 0, selected_index: 0, distance_hops: 1, personnel_lent: 600 });
        expect(byId.capped_out).toMatchObject({ first_rejection: null, outcome: 'survived_cap', survivor_index: 3, selected_index: null, distance_hops: 3, personnel_lent: 600 });
        expect(record.population.map((entry: any) => entry.brigade_id)).toEqual(
            [...record.population.map((entry: any) => entry.brigade_id)].sort(),
        );
    });

    it('binds the actual formTgForAxis caller turn, operation, axis, corps, and stage', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'mistral_tg_donor_selection';
        resetReasonCodeTopicCacheForTests();
        const state = stateWith([brigade('anchor'), brigade('donor')], 184);
        const axis = {
            axis_id: 'misi_2', name: 'Misi 2', assigned_brigades: ['anchor'], objectives: ['op:m:target'],
            current_objective_index: 0, status: 'executing', failure_count: 0,
            consecutive_failures_on_current: 0, momentum: 0, attack_attempt_count: 0,
            objective_capture_count: 0, movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
            staging_osid: 'op:m:s0',
        } as OperationAxis;
        const op = {
            name: 'Livno: Misi_2', type: 'general_offensive', phase: 'execution', started_turn: 172,
            phase_started_turn: 180, participating_brigades: ['anchor'], axes: [axis],
        } as CorpsOperation;
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        formTgForAxis(state, op, axis, 184, undefined, {
            corps_id: 'hvo_tomislavgrad', caller_stage: 'pre_results',
        });
        expect(records(log)[0]).toMatchObject({
            turn: 184, caller_turn: 184, operation_name: 'Livno: Misi_2',
            operation_id: 'hvo_tomislavgrad:Livno: Misi_2:t172', axis_id: 'misi_2',
            corps_id: 'hvo_tomislavgrad', caller_stage: 'pre_results',
        });
    });

    it('links population outcomes to the actual Array.slice result for a fractional cap', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'mistral_tg_donor_selection';
        resetReasonCodeTopicCacheForTests();
        const state = stateWith([
            brigade('anchor'), brigade('a'), brigade('b'), brigade('c'),
        ]);
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const selected = selectDonors(state, {
            anchor_brigade_id: 'anchor', staging_osid: 'op:m:s0', max_donors: 2.5,
        });
        expect(selected.map(donor => donor.brigade_id)).toEqual(['a', 'b']);
        const [record] = records(log);
        expect(record.selected_order).toEqual(['a', 'b']);
        expect(record.population.find((entry: any) => entry.brigade_id === 'c')).toMatchObject({
            outcome: 'survived_cap', survivor_index: 2, selected_index: null,
        });
    });

    it('marks candidate locals unreached when selection exits before the anchor exists', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'mistral_tg_donor_selection';
        resetReasonCodeTopicCacheForTests();
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        selectDonors(stateWith([brigade('candidate')]), {
            anchor_brigade_id: 'missing', staging_osid: 'op:m:s0',
        });
        expect(records(log)[0]).toMatchObject({
            terminal_reason: 'anchor_missing', allowed_corps: null, survivor_order: [], selected_order: [],
            population: [{ brigade_id: 'candidate', outcome: 'unreached', first_rejection: null }],
        });
    });
});
