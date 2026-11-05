import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { FormationState, GameState, MilitaryState } from '../src/state/game_state.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';
import { selectDonors } from '../src/sim/combat/tactical_group_selection.js';

const PREFIX = '[mistral_tg_donor_selection] ';
const FACTION = 'RBiH';

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        faction: FACTION,
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        corps_id: 'corp_anchor',
        location_osid: 'op:test:anchor',
        personnel: 2000,
        cohesion: 80,
        morale: 80,
        readiness: 'active',
        experience: 0.5,
        ...overrides,
    } as FormationState;
}

function legacyStatusMissingBrigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    const formation = brigade(id, overrides);
    delete (formation as { status?: 'active' | 'inactive' }).status;
    return formation;
}

function stateWith(
    formations: FormationState[],
    politicalControllers: Record<string, string> = {},
    turn = 5,
): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'tg-inactive-occupancy', phase: 'war', player_faction: FACTION } as any,
        military: {
            formations: Object.fromEntries(formations.map((formation) => [formation.id, formation])),
            tactical_groups: {},
        } as Partial<MilitaryState> as MilitaryState,
        political: { political_controllers: politicalControllers },
    } as GameState;
}

function graph(edges: Array<[string, string]>): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();
    for (const [a, b] of edges) {
        if (!adjacency.has(a)) adjacency.set(a, []);
        if (!adjacency.has(b)) adjacency.set(b, []);
        adjacency.get(a)!.push(b);
        adjacency.get(b)!.push(a);
    }
    return adjacency;
}

function records(log: ReturnType<typeof vi.spyOn>): any[] {
    return log.mock.calls
        .map(([line]) => String(line))
        .filter((line) => line.startsWith(PREFIX))
        .map((line) => JSON.parse(line.slice(PREFIX.length)));
}

function selectObserved(
    state: GameState,
    context: Parameters<typeof selectDonors>[1],
): { selected: string[]; byId: Record<string, any> } {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const selected = selectDonors(state, context).map((donor) => donor.brigade_id);
    const [record] = records(log);
    expect(record).toBeTruthy();
    return {
        selected,
        byId: Object.fromEntries(record.population.map((entry: any) => [entry.brigade_id, entry])),
    };
}

describe('tactical group explicit-inactive occupancy exclusion', () => {
    beforeEach(() => {
        process.env.AWWV_DEBUG_REASON_CODES = 'mistral_tg_donor_selection';
        resetReasonCodeTopicCacheForTests();
    });

    afterEach(() => {
        delete process.env.AWWV_DEBUG_REASON_CODES;
        resetReasonCodeTopicCacheForTests();
        vi.restoreAllMocks();
    });

    it('does not let an inactive anchor-corps witness confer corps adjacency', () => {
        const anchor = brigade('anchor', { corps_id: 'corp_anchor', location_osid: 'op:test:a' });
        const inactiveAnchorWitness = brigade('inactive_anchor_witness', {
            status: 'inactive',
            corps_id: 'corp_anchor',
            location_osid: 'op:test:w',
        });
        const crossCorpsDonor = brigade('cross_corps_donor', {
            corps_id: 'corp_other',
            location_osid: 'op:test:d',
        });
        const state = stateWith([anchor, inactiveAnchorWitness, crossCorpsDonor]);
        const adjacency = graph([
            ['op:test:a', 'op:test:w'],
            ['op:test:w', 'op:test:d'],
        ]);
        const { selected, byId } = selectObserved(state, {
            anchor_brigade_id: 'anchor',
            staging_osid: 'op:test:a',
            adjacency,
        });

        expect(selected).toEqual([]);
        expect(byId.cross_corps_donor.first_rejection).toBe('corps_scope');
        expect(byId.inactive_anchor_witness.first_rejection).toBe('inactive');
    });

    it('does not let an inactive donor-corps witness confer corps adjacency', () => {
        const anchor = brigade('anchor', { corps_id: 'corp_anchor', location_osid: 'op:test:a' });
        const inactiveDonorWitness = brigade('inactive_donor_witness', {
            status: 'inactive',
            corps_id: 'corp_other',
            location_osid: 'op:test:n',
        });
        const crossCorpsDonor = brigade('cross_corps_donor', {
            corps_id: 'corp_other',
            location_osid: 'op:test:d',
        });
        const state = stateWith([anchor, inactiveDonorWitness, crossCorpsDonor]);
        const adjacency = graph([
            ['op:test:a', 'op:test:n'],
            ['op:test:n', 'op:test:d'],
        ]);
        const { selected, byId } = selectObserved(state, {
            anchor_brigade_id: 'anchor',
            staging_osid: 'op:test:a',
            adjacency,
        });

        expect(selected).toEqual([]);
        expect(byId.cross_corps_donor.first_rejection).toBe('corps_scope');
        expect(byId.inactive_donor_witness.first_rejection).toBe('inactive');
    });

    it('does not let an inactive historical location make a hostile intermediate cell friendly for BFS', () => {
        const anchor = brigade('anchor', { corps_id: 'corp_anchor', location_osid: 'op:test:a' });
        const inactiveRouteWitness = brigade('inactive_route_witness', {
            status: 'inactive',
            corps_id: 'corp_anchor',
            location_osid: 'op:test:m',
        });
        const donor = brigade('same_corps_donor', {
            corps_id: 'corp_anchor',
            location_osid: 'op:test:d',
        });
        const state = stateWith([anchor, inactiveRouteWitness, donor], { 'op:test:m': 'RS' });
        const adjacency = graph([
            ['op:test:a', 'op:test:m'],
            ['op:test:m', 'op:test:d'],
        ]);
        const { selected, byId } = selectObserved(state, {
            anchor_brigade_id: 'anchor',
            staging_osid: 'op:test:a',
            adjacency,
        });

        expect(selected).toEqual([]);
        expect(byId.same_corps_donor.first_rejection).toBe('distance');
        expect(byId.inactive_route_witness.first_rejection).toBe('inactive');
    });

    it('does not let an inactive historical location make an uncontrolled intermediate cell friendly for BFS', () => {
        const anchor = brigade('anchor', { corps_id: 'corp_anchor', location_osid: 'op:test:a' });
        const inactiveRouteWitness = brigade('inactive_route_witness', {
            status: 'inactive',
            corps_id: 'corp_anchor',
            location_osid: 'op:test:m',
        });
        const donor = brigade('same_corps_donor', {
            corps_id: 'corp_anchor',
            location_osid: 'op:test:d',
        });
        const state = stateWith([anchor, inactiveRouteWitness, donor]);
        const adjacency = graph([
            ['op:test:a', 'op:test:m'],
            ['op:test:m', 'op:test:d'],
        ]);
        const { selected, byId } = selectObserved(state, {
            anchor_brigade_id: 'anchor',
            staging_osid: 'op:test:a',
            adjacency,
        });

        expect(selected).toEqual([]);
        expect(byId.same_corps_donor.first_rejection).toBe('distance');
        expect(byId.inactive_route_witness.first_rejection).toBe('inactive');
    });

    it('retains active sparse-fixture occupancy as friendly BFS ground', () => {
        const anchor = brigade('anchor', { corps_id: 'corp_anchor', location_osid: 'op:test:a' });
        const activeRouteOccupant = brigade('active_route_occupant', {
            corps_id: 'corp_other',
            cohesion: 0,
            location_osid: 'op:test:m',
        });
        const donor = brigade('same_corps_donor', {
            corps_id: 'corp_anchor',
            location_osid: 'op:test:d',
        });
        const state = stateWith([anchor, activeRouteOccupant, donor]);
        const adjacency = graph([
            ['op:test:a', 'op:test:m'],
            ['op:test:m', 'op:test:d'],
        ]);
        const { selected, byId } = selectObserved(state, {
            anchor_brigade_id: 'anchor',
            staging_osid: 'op:test:a',
            adjacency,
        });

        expect(selected).toEqual(['same_corps_donor']);
        expect(byId.same_corps_donor).toMatchObject({ first_rejection: null, distance_hops: 2 });
        expect(byId.active_route_occupant.first_rejection).toBe('cohesion');
    });

    it('retains politically friendly unoccupied routes for BFS', () => {
        const anchor = brigade('anchor', { corps_id: 'corp_anchor', location_osid: 'op:test:a' });
        const donor = brigade('same_corps_donor', {
            corps_id: 'corp_anchor',
            location_osid: 'op:test:d',
        });
        const state = stateWith([anchor, donor], { 'op:test:m': FACTION });
        const adjacency = graph([
            ['op:test:a', 'op:test:m'],
            ['op:test:m', 'op:test:d'],
        ]);
        const { selected, byId } = selectObserved(state, {
            anchor_brigade_id: 'anchor',
            staging_osid: 'op:test:a',
            adjacency,
        });

        expect(selected).toEqual(['same_corps_donor']);
        expect(byId.same_corps_donor).toMatchObject({ first_rejection: null, distance_hops: 2 });
    });

    it('retains the Army HQ faction-wide corps bypass', () => {
        const anchor = brigade('anchor', { corps_id: 'corp_anchor', location_osid: 'op:test:a' });
        const crossCorpsDonor = brigade('cross_corps_donor', {
            corps_id: 'corp_other',
            location_osid: 'op:test:d',
        });
        const state = stateWith([anchor, crossCorpsDonor]);
        const { selected } = selectObserved(state, {
            anchor_brigade_id: 'anchor',
            staging_osid: 'op:test:a',
            army_hq_op_id: 'army_hq_op',
            adjacency: new Map(),
        });

        expect(selected).toEqual(['cross_corps_donor']);
    });

    it('retains status-missing legacy anchor-corps occupancy and friendly routing', () => {
        const anchor = brigade('anchor', { corps_id: 'corp_anchor', location_osid: 'op:test:a' });
        const legacyAnchorWitness = legacyStatusMissingBrigade('legacy_anchor_witness', {
            corps_id: 'corp_anchor',
            location_osid: 'op:test:w',
        });
        const crossCorpsDonor = brigade('cross_corps_donor', {
            corps_id: 'corp_other',
            location_osid: 'op:test:d',
        });
        const state = stateWith([anchor, legacyAnchorWitness, crossCorpsDonor]);
        const adjacency = graph([
            ['op:test:a', 'op:test:w'],
            ['op:test:w', 'op:test:d'],
        ]);
        const { selected } = selectObserved(state, {
            anchor_brigade_id: 'anchor',
            staging_osid: 'op:test:a',
            adjacency,
        });

        expect(selected).toEqual(['cross_corps_donor']);
    });

    it('retains status-missing legacy donor-corps adjacency occupancy', () => {
        const anchor = brigade('anchor', { corps_id: 'corp_anchor', location_osid: 'op:test:a' });
        const legacyDonorWitness = legacyStatusMissingBrigade('legacy_donor_witness', {
            corps_id: 'corp_other',
            location_osid: 'op:test:n',
        });
        const crossCorpsDonor = brigade('cross_corps_donor', {
            corps_id: 'corp_other',
            location_osid: 'op:test:d',
        });
        const state = stateWith([anchor, legacyDonorWitness, crossCorpsDonor]);
        const adjacency = graph([
            ['op:test:a', 'op:test:n'],
            ['op:test:n', 'op:test:d'],
        ]);
        const { selected } = selectObserved(state, {
            anchor_brigade_id: 'anchor',
            staging_osid: 'op:test:a',
            adjacency,
        });

        expect(selected).toEqual(['cross_corps_donor']);
    });
});
