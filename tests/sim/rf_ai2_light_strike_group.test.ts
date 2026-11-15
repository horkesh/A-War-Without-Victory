/**
 * RF-AI2: the N1297 readiness gate counts a light strike group.
 *
 * Before: any corps with zero motorized/mechanized main_effort brigades was capped at
 * 'defensive' and never planned (measured on a 188w main run: ARBiH 5th Corps all 188
 * turns; VRS corps classed mountain most of the war). Now a corps that masses >= 3 fit,
 * combat-effective brigades in one zone may reach 'balanced' (plan a local main effort),
 * never 'offensive' from this term alone.
 */

import { describe, expect, it } from 'vitest';
import { generateCorpsStanceOrders } from '../../src/sim/combat/bot_corps_stance.js';
import {
    hasLightStrikeGroup,
    LIGHT_STRIKE_GROUP_MIN_BRIGADES,
} from '../../src/sim/combat/commander/force_eval.js';
import { MIN_BRIGADES_FOR_PLAN } from '../../src/sim/combat/commander/plan.js';
import { summarizeBrigadesFireSupport } from '../../src/sim/combat/corps_fire_support.js';
import type { BrigadeEvaluation, ForceAssessment } from '../../src/sim/combat/commander/commander_state.js';
import type { CorpsCommandState, FactionId, FormationState, GameState } from '../../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../../src/state/game_state.js';

function evalRow(id: string, overrides: Partial<BrigadeEvaluation> = {}): BrigadeEvaluation {
    return {
        brigade_id: id,
        fitness_offense: 0.5,
        fitness_defense: 0.3,
        fitness_garrison: 0.4,
        equipment_class: 'light_infantry',
        equipment_priority: 0,
        tier: 'active_defense',
        is_combat_effective: true,
        is_disrupted: false,
        is_on_loan: false,
        is_home_defense: false,
        morale: 60,
        current_zone: null,
        ...overrides,
    } as BrigadeEvaluation;
}

function force(byZone: Record<string, BrigadeEvaluation[]>, mainEffort = 0): ForceAssessment {
    const evaluations = Object.values(byZone).flat();
    return {
        total_brigades: evaluations.length,
        combat_effective: evaluations.filter(e => e.is_combat_effective).length,
        evaluations,
        by_zone: byZone,
        tier_counts: { main_effort: mainEffort, active_defense: evaluations.length, garrison: 0 },
        total_surplus: 0,
    } as ForceAssessment;
}

describe('hasLightStrikeGroup', () => {
    it('uses the planner minimum brigade count', () => {
        expect(LIGHT_STRIKE_GROUP_MIN_BRIGADES).toBe(MIN_BRIGADES_FOR_PLAN);
    });

    it('is true for three fit brigades massed in one zone', () => {
        expect(hasLightStrikeGroup(force({ z1: [evalRow('a'), evalRow('b'), evalRow('c')] }))).toBe(true);
    });

    it('is false for two fit brigades', () => {
        expect(hasLightStrikeGroup(force({ z1: [evalRow('a'), evalRow('b'), evalRow('c', { fitness_offense: 0.39 })] }))).toBe(false);
    });

    it('does not add brigades across zones (separate pockets)', () => {
        expect(hasLightStrikeGroup(force({ z1: [evalRow('a'), evalRow('b')], z2: [evalRow('c'), evalRow('d')] }))).toBe(false);
    });

    it('ignores disrupted, on-loan, non-combat-effective and unassigned brigades', () => {
        expect(hasLightStrikeGroup(force({
            z1: [evalRow('a'), evalRow('b'), evalRow('c', { is_disrupted: true })],
            z2: [evalRow('d'), evalRow('e'), evalRow('f', { is_on_loan: true })],
            z3: [evalRow('g'), evalRow('h'), evalRow('i', { is_combat_effective: false })],
            __unassigned__: [evalRow('j'), evalRow('k'), evalRow('l')],
        }))).toBe(false);
    });
});

describe('summarizeBrigadesFireSupport', () => {
    it('uses the combat firepower formula: artillery x operational + 0.5 x tanks x operational', () => {
        const brigades = [
            { composition: { infantry: 0, artillery: 10, tanks: 4, aa_systems: 0,
                artillery_condition: { operational: 0.5, degraded: 0.5, non_operational: 0 },
                tank_condition: { operational: 1, degraded: 0, non_operational: 0 } } },
            { composition: undefined },
        ] as unknown as FormationState[];
        const s = summarizeBrigadesFireSupport(brigades);
        expect(s.artillery).toBe(5);
        expect(s.tanks).toBe(4);
        expect(s.fire_support).toBe(7);
    });
});

// ── Gate behaviour inside generateCorpsStanceOrders ──
// vrs_drina at turn 10 with healthy brigades: the formula and the RS early-war bias
// choose 'offensive' (see srk_siege_morale_audit.test.ts T4), so the gate's cap shows.

const CORPS = 'vrs_drina';

function makeState(fa: ForceAssessment | undefined): GameState {
    const brigades: Record<string, FormationState> = {};
    for (const id of ['b1', 'b2', 'b3']) {
        brigades[id] = {
            id, faction: 'RS' as FactionId, kind: 'brigade', status: 'active', corps_id: CORPS,
            personnel: 2400, cohesion: 60, morale: 60, location_osid: 'op:vlasenica:vlasenica_2',
        } as unknown as FormationState;
    }
    const cmd = {
        command_span: 5, subordinate_count: 3, og_slots: 1, active_ogs: [], active_operations: [],
        corps_exhaustion: 0, stance: 'balanced',
        ...(fa ? { commander_state: { force_assessment: fa } } : {}),
    } as unknown as CorpsCommandState;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'rf-ai2', phase: 'war', referendum_held: true, war_start_turn: 1 },
        factions: [],
        political: { war_alliance_rbih_hrhb: 1.0, political_controllers: {} },
        military: {
            formations: {
                [CORPS]: { id: CORPS, faction: 'RS', kind: 'corps', status: 'active', tags: ['mun:vlasenica'] } as unknown as FormationState,
                ...brigades,
            },
            corps_command: { [CORPS]: cmd },
            corps_front_sectors: {},
            front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {},
            militia_pools: {},
        } as unknown as GameState['military'],
    } as unknown as GameState;
}

function stanceFor(fa: ForceAssessment | undefined): string | undefined {
    const state = makeState(fa);
    generateCorpsStanceOrders(state, 'RS', [], new Map());
    return state.military.corps_command![CORPS].stance;
}

describe('N1297 readiness gate with the light strike group term', () => {
    it('leaves a corps with a main_effort brigade uncapped', () => {
        expect(stanceFor(force({ z1: [evalRow('b1')] }, 1))).toBe('offensive');
    });

    it('caps a corps with a light strike group at balanced, not offensive', () => {
        expect(stanceFor(force({ z1: [evalRow('b1'), evalRow('b2'), evalRow('b3')] }))).toBe('balanced');
    });

    it('caps a corps with neither at defensive (pre-RF-AI2 behaviour)', () => {
        expect(stanceFor(force({ z1: [evalRow('b1'), evalRow('b2', { fitness_offense: 0.1 }), evalRow('b3')] }))).toBe('defensive');
    });

    it('does nothing before the first force assessment exists', () => {
        expect(stanceFor(undefined)).toBe('offensive');
    });
});
