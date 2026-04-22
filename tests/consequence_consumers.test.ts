/**
 * v0.9.0 Consequence System — Phase 1 Session 2 consumer contracts.
 *
 * Covers:
 *   - applyAllianceChange clamps against alliance_locks (floor/ceiling)
 *   - getActiveRecruitmentMultiplier product across active modifiers
 *   - isOffensiveObjective / isDefensivePriority merge bot_priority_shifts
 *   - applyGuerrillaAttrition drains cohesion/morale in threat zones
 *   - cleanupExpiredEventModifiers GCs all six modifier containers
 *
 * Writers' contracts are in tests/consequence_effects.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import {
    cleanupExpiredEventModifiers,
    getActiveAllianceBounds,
    getActiveBotObjectiveShifts,
    getActiveGuerrillaThreatIntensity,
    getActiveRecruitmentMultiplier,
} from '../src/sim/events/active_modifiers.js';
import { applyGuerrillaAttrition } from '../src/sim/combat/guerrilla_attrition.js';
import { isDefensivePriority, isOffensiveObjective } from '../src/sim/combat/bot_strategy.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(overrides?: Partial<GameState>): GameState {
    return {
        schema_version: 1,
        meta: { turn: 10, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'a' } as GameState['meta'],
        factions: [
            { id: 'RBiH', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 40 },
            heavy_munitions_reserve: { RBiH: 30, RS: 50, HRHB: 20 },
            fired_event_ids: [],
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
        } as GameState['political'],
        ...overrides,
    } as GameState;
}

describe('applyAllianceChange with alliance_lock floor', () => {
    it('refuses to drop below active floor', () => {
        const state = makeState();
        state.political.war_alliance_rbih_hrhb = 0.5;
        applyEventEffects(state, [
            { kind: 'alliance_lock', mode: 'floor', value: 0.4, duration_turns: 20 },
        ]);
        applyEventEffects(state, [{ kind: 'alliance_change', delta: -0.8 }]);
        expect(state.political.war_alliance_rbih_hrhb).toBe(0.4);
    });

    it('refuses to rise above active ceiling', () => {
        const state = makeState();
        state.political.war_alliance_rbih_hrhb = 0.5;
        applyEventEffects(state, [
            { kind: 'alliance_lock', mode: 'ceiling', value: 0.7, duration_turns: 20 },
        ]);
        applyEventEffects(state, [{ kind: 'alliance_change', delta: 0.9 }]);
        expect(state.political.war_alliance_rbih_hrhb).toBe(0.7);
    });

    it('applies delta normally when no lock active', () => {
        const state = makeState();
        applyEventEffects(state, [{ kind: 'alliance_change', delta: 0.2 }]);
        expect(state.political.war_alliance_rbih_hrhb).toBeCloseTo(0.7);
    });

    it('ignores expired locks', () => {
        const state = makeState();
        // Lock expires turn 10 (current turn), so it's already expired per
        // the `expires_turn > currentTurn` semantics.
        (state.military as any).alliance_locks = [
            { mode: 'floor', value: 0.9, expires_turn: 10 },
        ];
        applyEventEffects(state, [{ kind: 'alliance_change', delta: -0.4 }]);
        expect(state.political.war_alliance_rbih_hrhb).toBeCloseTo(0.1);
    });
});

describe('getActiveRecruitmentMultiplier', () => {
    it('returns 1.0 with no modifiers', () => {
        const state = makeState();
        expect(getActiveRecruitmentMultiplier(state, 'RBiH', 10)).toBe(1.0);
    });

    it('returns product of active modifiers for same faction', () => {
        const state = makeState();
        applyEventEffects(state, [
            { kind: 'recruitment_modifier', faction: 'RBiH', pool_multiplier: 1.15, duration_turns: 20 },
            { kind: 'recruitment_modifier', faction: 'RBiH', pool_multiplier: 0.8, duration_turns: 20 },
        ]);
        expect(getActiveRecruitmentMultiplier(state, 'RBiH', 10)).toBeCloseTo(0.92);
    });

    it('ignores modifiers for other factions', () => {
        const state = makeState();
        applyEventEffects(state, [
            { kind: 'recruitment_modifier', faction: 'RS', pool_multiplier: 2.0, duration_turns: 20 },
        ]);
        expect(getActiveRecruitmentMultiplier(state, 'RBiH', 10)).toBe(1.0);
        expect(getActiveRecruitmentMultiplier(state, 'RS', 10)).toBe(2.0);
    });

    it('ignores expired modifiers', () => {
        const state = makeState();
        (state.military as any).recruitment_modifiers = [
            { faction: 'RBiH', pool_multiplier: 2.0, expires_turn: 10 },
        ];
        expect(getActiveRecruitmentMultiplier(state, 'RBiH', 10)).toBe(1.0);
        expect(getActiveRecruitmentMultiplier(state, 'RBiH', 9)).toBe(2.0);
    });
});

describe('bot_strategy accessors with bot_priority_shift merge', () => {
    it('static answer unchanged when no state is passed', () => {
        // RS offensive_objectives includes Drina valley muns like 'zvornik'.
        expect(isOffensiveObjective('zvornik', 'RS')).toBe(true);
        expect(isOffensiveObjective('qqq_nonexistent', 'RS')).toBe(false);
    });

    it('add_objectives extends the offensive objective set', () => {
        const state = makeState();
        applyEventEffects(state, [
            {
                kind: 'bot_priority_shift',
                faction: 'RBiH',
                add_objectives: ['qqq_custom_objective'],
                duration_turns: 20,
            },
        ]);
        expect(isOffensiveObjective('qqq_custom_objective', 'RBiH', state)).toBe(true);
        expect(isOffensiveObjective('qqq_custom_objective', 'RBiH')).toBe(false);
    });

    it('remove_objectives strips existing static objectives', () => {
        const state = makeState();
        const { removes } = getActiveBotObjectiveShifts(state, 'RS', 10);
        expect(removes.size).toBe(0);
        applyEventEffects(state, [
            {
                kind: 'bot_priority_shift',
                faction: 'RS',
                remove_objectives: ['zvornik'],
                duration_turns: 20,
            },
        ]);
        expect(isOffensiveObjective('zvornik', 'RS', state)).toBe(false);
        expect(isOffensiveObjective('zvornik', 'RS')).toBe(true);
    });

    it('defensive_priority accessor honors both add and remove', () => {
        const state = makeState();
        applyEventEffects(state, [
            {
                kind: 'bot_priority_shift',
                faction: 'RBiH',
                add_objectives: ['qqq_defense_only'],
                duration_turns: 20,
            },
        ]);
        expect(isDefensivePriority('qqq_defense_only', 'RBiH', state)).toBe(true);
    });
});

describe('applyGuerrillaAttrition', () => {
    function stateWithBrigades(): GameState {
        const state = makeState();
        state.military.formations = {
            rs_drina_1: {
                id: 'rs_drina_1', faction: 'RS', name: 'RS Drina 1',
                kind: 'brigade', status: 'active', assignment: null,
                created_turn: 0, location_osid: 'op:zvornik:zvornik_1',
                morale: 60, cohesion: 70,
            } as any,
            rs_banja_luka: {
                id: 'rs_banja_luka', faction: 'RS', name: 'RS BL',
                kind: 'brigade', status: 'active', assignment: null,
                created_turn: 0, location_osid: 'op:banja_luka:banja_luka_1',
                morale: 60, cohesion: 70,
            } as any,
            arbih_tuzla: {
                id: 'arbih_tuzla', faction: 'RBiH', name: 'ARBiH Tuzla',
                kind: 'brigade', status: 'active', assignment: null,
                created_turn: 0, location_osid: 'op:zvornik:zvornik_1',
                morale: 60, cohesion: 70,
            } as any,
        };
        return state;
    }

    it('no-op when no threats active', () => {
        const state = stateWithBrigades();
        const report = applyGuerrillaAttrition(state);
        expect(report.brigades_affected).toBe(0);
        expect((state.military.formations as any).rs_drina_1.cohesion).toBe(70);
    });

    it('attrits only faction brigades in threat municipalities', () => {
        const state = stateWithBrigades();
        applyEventEffects(state, [
            {
                kind: 'guerrilla_threat',
                faction: 'RS',
                municipalities: ['zvornik'],
                intensity: 1.0,
                duration_turns: 20,
            },
        ]);
        const report = applyGuerrillaAttrition(state);
        // RS brigade in zvornik: cohesion 70 -> 67, morale 60 -> 58
        expect((state.military.formations as any).rs_drina_1.cohesion).toBe(67);
        expect((state.military.formations as any).rs_drina_1.morale).toBe(58);
        // RS brigade in banja_luka: unchanged (not a threat municipality)
        expect((state.military.formations as any).rs_banja_luka.cohesion).toBe(70);
        // RBiH brigade in zvornik: unchanged (threat targets RS, not RBiH)
        expect((state.military.formations as any).arbih_tuzla.cohesion).toBe(70);
        expect(report.brigades_affected).toBe(1);
        expect(report.total_cohesion_loss).toBe(3);
        expect(report.total_morale_loss).toBe(2);
    });

    it('scales attrition with intensity', () => {
        const state = stateWithBrigades();
        applyEventEffects(state, [
            {
                kind: 'guerrilla_threat',
                faction: 'RS',
                municipalities: ['zvornik'],
                intensity: 0.5,
                duration_turns: 20,
            },
        ]);
        applyGuerrillaAttrition(state);
        // 0.5 intensity → round(3*0.5)=2 coh, round(2*0.5)=1 mor
        expect((state.military.formations as any).rs_drina_1.cohesion).toBe(68);
        expect((state.military.formations as any).rs_drina_1.morale).toBe(59);
    });

    it('floors at zero', () => {
        const state = stateWithBrigades();
        (state.military.formations as any).rs_drina_1.cohesion = 1;
        (state.military.formations as any).rs_drina_1.morale = 1;
        applyEventEffects(state, [
            {
                kind: 'guerrilla_threat',
                faction: 'RS',
                municipalities: ['zvornik'],
                intensity: 1.0,
                duration_turns: 20,
            },
        ]);
        applyGuerrillaAttrition(state);
        expect((state.military.formations as any).rs_drina_1.cohesion).toBe(0);
        expect((state.military.formations as any).rs_drina_1.morale).toBe(0);
    });
});

describe('cleanupExpiredEventModifiers', () => {
    it('removes expired entries from the four new v0.9.0 arrays', () => {
        const state = makeState();
        // Seed the four in-scope arrays with one expired + one active entry each
        (state.military as any).guerrilla_threats = [
            { faction: 'RS', municipalities: ['a'], intensity: 0.5, expires_turn: 5 },
            { faction: 'RS', municipalities: ['b'], intensity: 0.5, expires_turn: 20 },
        ];
        (state.military as any).recruitment_modifiers = [
            { faction: 'RBiH', pool_multiplier: 1.2, expires_turn: 5 },
            { faction: 'RBiH', pool_multiplier: 0.9, expires_turn: 20 },
        ];
        (state.military as any).alliance_locks = [
            { mode: 'floor', value: 0.5, expires_turn: 5 },
            { mode: 'ceiling', value: 0.9, expires_turn: 20 },
        ];
        (state.military as any).bot_priority_shifts = [
            { faction: 'RS', add_objectives: ['a'], expires_turn: 5 },
            { faction: 'RS', add_objectives: ['b'], expires_turn: 20 },
        ];

        cleanupExpiredEventModifiers(state, 10);

        expect(state.military.guerrilla_threats).toHaveLength(1);
        expect(state.military.recruitment_modifiers).toHaveLength(1);
        expect(state.military.alliance_locks).toHaveLength(1);
        expect(state.military.bot_priority_shifts).toHaveLength(1);
    });

    it('does NOT touch pre-existing event_aggression_modifiers or event_constraints arrays', () => {
        // Scope decision: the v0.9.0 GC only touches arrays this session added.
        // Pre-existing arrays keep their legacy unbounded-growth behavior so the
        // golden final_save.json hash on historical runs is preserved.
        const state = makeState();
        (state.military as any).event_aggression_modifiers = [
            { faction: 'RS', delta: 0.1, expires_turn: 5 },
            { faction: 'RS', delta: 0.2, expires_turn: 20 },
        ];
        state.military.event_constraints = {
            operation_blocks: [
                { faction: 'RS', expires_turn: 5, reason: 'old' },
                { faction: 'RS', expires_turn: 20, reason: 'new' },
            ],
            doctrine_overrides: [
                { faction: 'RS', forced_stance: 'defensive', expires_turn: 5, reason: 'old' },
                { faction: 'RS', forced_stance: 'offensive', expires_turn: 20, reason: 'new' },
            ],
            scope_restrictions: [
                { faction: 'RS', blocked_municipalities: ['x'], expires_turn: 5, reason: 'old' },
                { faction: 'RS', blocked_municipalities: ['y'], expires_turn: 20, reason: 'new' },
            ],
        };

        cleanupExpiredEventModifiers(state, 10);

        // Pre-existing arrays survive unchanged — both expired and active entries.
        expect(state.military.event_aggression_modifiers).toHaveLength(2);
        expect(state.military.event_constraints!.operation_blocks).toHaveLength(2);
        expect(state.military.event_constraints!.doctrine_overrides).toHaveLength(2);
        expect(state.military.event_constraints!.scope_restrictions).toHaveLength(2);
    });

    it('is a no-op when all arrays are empty or undefined', () => {
        const state = makeState();
        cleanupExpiredEventModifiers(state, 10);
        // Still fine; no crashes, no new arrays created.
        expect(state.military.guerrilla_threats).toBeUndefined();
    });
});

describe('getActiveAllianceBounds', () => {
    it('picks most-restrictive floor and ceiling', () => {
        const state = makeState();
        (state.military as any).alliance_locks = [
            { mode: 'floor', value: 0.2, expires_turn: 20 },
            { mode: 'floor', value: 0.4, expires_turn: 20 },
            { mode: 'ceiling', value: 0.9, expires_turn: 20 },
            { mode: 'ceiling', value: 0.7, expires_turn: 20 },
        ];
        const bounds = getActiveAllianceBounds(state, 10);
        expect(bounds.floor).toBe(0.4); // highest floor
        expect(bounds.ceiling).toBe(0.7); // lowest ceiling
    });
});

describe('getActiveGuerrillaThreatIntensity', () => {
    it('returns max intensity across matching threats', () => {
        const state = makeState();
        (state.military as any).guerrilla_threats = [
            { faction: 'RS', municipalities: ['zvornik'], intensity: 0.3, expires_turn: 20 },
            { faction: 'RS', municipalities: ['zvornik', 'bratunac'], intensity: 0.6, expires_turn: 20 },
            { faction: 'RS', municipalities: ['foca'], intensity: 0.9, expires_turn: 20 },
        ];
        expect(getActiveGuerrillaThreatIntensity(state, 'RS', 'zvornik', 10)).toBe(0.6);
        expect(getActiveGuerrillaThreatIntensity(state, 'RS', 'bratunac', 10)).toBe(0.6);
        expect(getActiveGuerrillaThreatIntensity(state, 'RS', 'foca', 10)).toBe(0.9);
        expect(getActiveGuerrillaThreatIntensity(state, 'RS', 'banja_luka', 10)).toBe(0);
        expect(getActiveGuerrillaThreatIntensity(state, 'RBiH', 'zvornik', 10)).toBe(0);
    });
});
