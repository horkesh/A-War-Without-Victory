/**
 * Brigade dissolution path coverage for the n292 threshold closeout.
 *
 * These fixtures pin the existing gates in src/sim/combat/brigade_dissolution.ts:
 * personnel/cohesion/morale criteria at any personnel, enclave 3-of-3,
 * morale-collapse override, reserve/equipment salvage, operation removal, and
 * deterministic report ordering. This file intentionally does not change
 * threshold data or production code.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
    dissolveCombatIneffectiveBrigades,
    DISSOLUTION_COHESION_THRESHOLD,
    DISSOLUTION_EQUIPMENT_TRANSFER_RATE,
    DISSOLUTION_MORALE_THRESHOLD,
    DISSOLUTION_PERSONNEL_THRESHOLD,
    DISSOLUTION_PERSONNEL_TO_RESERVE_RATE,
    MORALE_OVERRIDE_TURNS,
} from '../src/sim/combat/brigade_dissolution.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

const ORIGINAL_MORALE_OVERRIDE = process.env.MORALE_OVERRIDE_ENABLED;

afterEach(() => {
    if (ORIGINAL_MORALE_OVERRIDE === undefined) {
        delete process.env.MORALE_OVERRIDE_ENABLED;
    } else {
        process.env.MORALE_OVERRIDE_ENABLED = ORIGINAL_MORALE_OVERRIDE;
    }
});

function makeBrigade(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'rs_test_brigade',
        name: 'Test Brigade',
        faction: 'RS',
        kind: 'brigade',
        status: 'active',
        lifecycle_status: 'active',
        readiness: 'active',
        assignment: null,
        created_turn: 1,
        corps_id: 'rs_test_corps',
        location_osid: 'op:test:test_1',
        home_osid: 'op:test:test_1',
        origin_mun: 'test',
        personnel: 2000,
        morale: 60,
        cohesion: 60,
        max_personnel: 2000,
        composition: {
            infantry: 1800,
            tanks: 0,
            artillery: 0,
            aa_systems: 0,
            tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
        },
        ...overrides,
    } as FormationState;
}

function makeState(
    formations: Record<string, FormationState>,
    corpsCommand: Record<string, unknown> = {},
): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 42, phase: 'war', seed: 'brigade-dissolution-paths' } as any,
        military: {
            formations: formations as any,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            strategic_reserves: { RBiH: 0, RS: 1000, HRHB: 0 },
            corps_command: {
                rs_test_corps: {
                    command_span: 1,
                    subordinate_count: Object.keys(formations).length,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'defensive',
                    active_operations: [],
                },
                ...corpsCommand,
            } as any,
        } as any,
        political: { political_controllers: {} } as any,
    } as unknown as GameState;
}

describe('brigade dissolution path coverage', () => {
    it('D1 dissolves battle-attrited brigades on low personnel plus low cohesion', () => {
        const brigade = makeBrigade({
            personnel: 250,
            cohesion: DISSOLUTION_COHESION_THRESHOLD - 2,
            morale: 50,
        });
        const state = makeState({ [brigade.id]: brigade });

        const report = dissolveCombatIneffectiveBrigades(state);

        expect(report.dissolved_count).toBe(1);
        expect(report.dissolved_brigades[0]?.id).toBe(brigade.id);
        expect(brigade.status).toBe('inactive');
        expect(brigade.lifecycle_status).toBe('destroyed');
        expect(brigade.readiness).toBe('degraded');
    });

    it('D2 preserves passive-drain remnants when only low personnel fires', () => {
        const brigade = makeBrigade({
            personnel: 146,
            cohesion: 60,
            morale: 60,
        });
        const state = makeState({ [brigade.id]: brigade });

        const report = dissolveCombatIneffectiveBrigades(state);

        expect(report.dissolved_count).toBe(0);
        expect(brigade.status).toBe('active');
    });

    it('D3 dissolves non-enclave brigades meeting cohesion and morale criteria at high personnel', () => {
        delete process.env.MORALE_OVERRIDE_ENABLED;
        const brigade = makeBrigade({
            personnel: 1400,
            cohesion: 10,
            morale: 8,
            morale_low_streak: MORALE_OVERRIDE_TURNS,
        });
        const state = makeState({ [brigade.id]: brigade });

        const report = dissolveCombatIneffectiveBrigades(state);

        expect(report.dissolved_count).toBe(1);
        expect(brigade.status).toBe('inactive');
        expect(brigade.lifecycle_status).toBe('destroyed');
    });

    it('D4 gates morale-collapse dissolution behind MORALE_OVERRIDE_ENABLED', () => {
        const withoutFlag = makeBrigade({
            id: 'rs_override_off',
            personnel: 2000,
            cohesion: 60,
            morale: 8,
            morale_low_streak: MORALE_OVERRIDE_TURNS,
        });
        delete process.env.MORALE_OVERRIDE_ENABLED;

        const offReport = dissolveCombatIneffectiveBrigades(makeState({ [withoutFlag.id]: withoutFlag }));

        expect(offReport.dissolved_count).toBe(0);
        expect(withoutFlag.status).toBe('active');

        const withFlag = makeBrigade({
            id: 'rs_override_on',
            personnel: 2000,
            cohesion: 60,
            morale: 8,
            morale_low_streak: MORALE_OVERRIDE_TURNS,
        });
        process.env.MORALE_OVERRIDE_ENABLED = 'true';

        const onReport = dissolveCombatIneffectiveBrigades(makeState({ [withFlag.id]: withFlag }));

        expect(onReport.dissolved_count).toBe(1);
        expect(onReport.dissolved_brigades[0]?.id).toBe(withFlag.id);
        expect(withFlag.status).toBe('inactive');
    });

    it('D5 requires all three criteria for enclave brigades', () => {
        const allThree = makeBrigade({
            id: 'rs_enclave_all_three',
            personnel: 60,
            cohesion: 10,
            morale: 8,
            tags: ['enclave'],
        });
        const twoOfThree = makeBrigade({
            id: 'rs_enclave_two_of_three',
            personnel: 80,
            cohesion: 10,
            morale: 50,
            tags: ['enclave'],
        });
        const state = makeState({
            [allThree.id]: allThree,
            [twoOfThree.id]: twoOfThree,
        });

        const report = dissolveCombatIneffectiveBrigades(state);

        expect(report.dissolved_brigades.map(row => row.id)).toEqual(['rs_enclave_all_three']);
        expect(allThree.status).toBe('inactive');
        expect(twoOfThree.status).toBe('active');
    });

    it('D6 transfers personnel reserve and salvaged heavy equipment before zeroing the dissolved brigade', () => {
        const dissolving = makeBrigade({
            id: 'rs_alpha_dissolving',
            personnel: 200,
            cohesion: 10,
            morale: 50,
            composition: {
                infantry: 200,
                tanks: 10,
                artillery: 8,
                aa_systems: 4,
                tank_condition: { operational: 10, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 8, degraded: 0, non_operational: 0 },
            },
        });
        const sibling = makeBrigade({
            id: 'rs_beta_receiver',
            personnel: 1600,
            cohesion: 60,
            morale: 60,
            composition: {
                infantry: 1600,
                tanks: 1,
                artillery: 2,
                aa_systems: 3,
                tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 2, degraded: 0, non_operational: 0 },
            },
        });
        const state = makeState({ [dissolving.id]: dissolving, [sibling.id]: sibling });

        const report = dissolveCombatIneffectiveBrigades(state);

        expect(report.dissolved_count).toBe(1);
        expect(state.military.strategic_reserves?.RS).toBe(1000 + Math.floor(200 * DISSOLUTION_PERSONNEL_TO_RESERVE_RATE));
        expect(sibling.composition?.tanks).toBe(1 + Math.floor(10 * DISSOLUTION_EQUIPMENT_TRANSFER_RATE));
        expect(sibling.composition?.artillery).toBe(2 + Math.floor(8 * DISSOLUTION_EQUIPMENT_TRANSFER_RATE));
        expect(dissolving.composition?.tanks).toBe(0);
        expect(dissolving.composition?.artillery).toBe(0);
        expect(dissolving.composition?.aa_systems).toBe(0);
    });

    it('D7 removes dissolved brigades from active operations and axes', () => {
        const brigade = makeBrigade({
            id: 'rs_operation_brigade',
            personnel: 250,
            cohesion: 10,
            morale: 50,
        });
        const corpsCommand = {
            rs_test_corps: {
                command_span: 1,
                subordinate_count: 1,
                og_slots: 0,
                active_ogs: [],
                corps_exhaustion: 0,
                stance: 'offensive',
                active_operations: [
                    {
                        id: 'op-test',
                        participating_brigades: ['rs_operation_brigade', 'rs_other_brigade'],
                        axes: [
                            { id: 'axis-a', assigned_brigades: ['rs_operation_brigade'] },
                            { id: 'axis-b', assigned_brigades: ['rs_other_brigade'] },
                        ],
                    },
                ],
            },
        };
        const state = makeState({ [brigade.id]: brigade }, corpsCommand);

        dissolveCombatIneffectiveBrigades(state);

        const op = (state.military.corps_command as any).rs_test_corps.active_operations[0];
        expect(op.participating_brigades).toEqual(['rs_other_brigade']);
        expect(op.axes[0].assigned_brigades).toEqual([]);
        expect(op.axes[1].assigned_brigades).toEqual(['rs_other_brigade']);
        expect(brigade.status).toBe('inactive');
    });

    it('reports dissolved brigades in deterministic formation-id order for identical inputs', () => {
        const makeFixture = () => makeState({
            rs_zulu: makeBrigade({
                id: 'rs_zulu',
                personnel: DISSOLUTION_PERSONNEL_THRESHOLD - 1,
                cohesion: DISSOLUTION_COHESION_THRESHOLD,
                morale: 60,
            }),
            rs_alpha: makeBrigade({
                id: 'rs_alpha',
                personnel: DISSOLUTION_PERSONNEL_THRESHOLD - 1,
                cohesion: 60,
                morale: DISSOLUTION_MORALE_THRESHOLD,
            }),
        });

        const first = dissolveCombatIneffectiveBrigades(makeFixture());
        const second = dissolveCombatIneffectiveBrigades(makeFixture());

        expect(first.dissolved_brigades.map(row => row.id)).toEqual(['rs_alpha', 'rs_zulu']);
        expect(second.dissolved_brigades.map(row => row.id)).toEqual(first.dissolved_brigades.map(row => row.id));
    });
});
