/**
 * CODE4 (2026-11-16): rankDefendersByPower breaks equal power by formation id, so the primary
 * defender and the stacking order never depend on the caller's list order.
 */
import { describe, expect, it } from 'vitest';

import { rankDefendersByPower } from '../src/sim/combat/combat_math.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

const TARGET = 'op:test:target';

function state(): GameState {
    return {
        meta: { turn: 10, phase: 'war' },
        political: { political_controllers: { [TARGET]: 'RS' } },
        military: { formations: {}, corps_command: {}, corps_front_sectors: {}, sector_intel: {}, named_officers: {}, named_officer_data: [] },
        factions: {},
        population: { byMunicipality: {} },
        displacement: {},
    } as unknown as GameState;
}

/** Identical brigades except for id, so their defender power is equal. */
function twin(id: string): FormationState {
    return {
        id,
        faction: 'RS',
        kind: 'brigade',
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: 1500,
        location_osid: TARGET,
        corps_id: 'corps_test',
        equipment_class: 'light_infantry',
        cohesion: 70,
        morale: 60,
        experience: 0.5,
        posture: 'defend',
    } as unknown as FormationState;
}

function rank(defenders: FormationState[]) {
    return rankDefendersByPower(defenders, state(), TARGET, {}, 0, null, () => 1);
}

describe('CODE4: rankDefendersByPower tie-break', () => {
    it('equal-power defenders rank by id whatever the input order', () => {
        const a = twin('rs_brigade_a');
        const b = twin('rs_brigade_b');
        const forward = rank([a, b]);
        const reverse = rank([b, a]);

        expect(forward.rankedDefenders[0]!.power).toBe(forward.rankedDefenders[1]!.power); // a genuine tie
        expect(forward.primary.id).toBe('rs_brigade_a');
        expect(reverse.primary.id).toBe('rs_brigade_a');
        expect(reverse.rankedDefenders.map((d) => d.id)).toEqual(['rs_brigade_a', 'rs_brigade_b']);
        expect(reverse.totalPower).toBe(forward.totalPower);
    });

    it('a stronger defender still ranks first regardless of id', () => {
        const weak = twin('rs_brigade_a');
        const strong = { ...twin('rs_brigade_z'), personnel: 2500 } as FormationState;
        expect(rank([weak, strong]).primary.id).toBe('rs_brigade_z');
        expect(rank([strong, weak]).primary.id).toBe('rs_brigade_z');
    });
});
