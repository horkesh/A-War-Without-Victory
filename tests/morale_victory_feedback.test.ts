import { describe, it, expect } from 'vitest';
import { runMoraleDrift } from '../src/sim/combat/morale_drift.js';
import type { GameState, FormationState } from '../src/state/game_state.js';

/** Minimal GameState factory for morale drift tests. */
function makeState(formations: Record<string, Partial<FormationState>>): GameState {
    const fmns: Record<string, FormationState> = {};
    for (const [id, partial] of Object.entries(formations)) {
        fmns[id] = {
            id, faction: 'RS', name: id, created_turn: 0, status: 'active',
            assignment: null, kind: 'brigade', morale: 60, personnel: 2000,
            cohesion: 60, location_osid: 'op:banja_luka:rekavice_2',
            ...partial,
        } as FormationState;
    }
    return { meta: { turn: 10 }, military: { formations: fmns } } as unknown as GameState;
}

describe('Battle habituation', () => {
    it('first battle applies full drift (habituation = 1.0)', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        // HRHB sensitivity 1.0, habituation 1/(1+0*0.03)=1.0 → +5×1.0×1.0 = +5
        expect(state.military.formations!['b1']!.morale).toBe(55);
    });

    it('after 10 battles, drift is reduced (habituation ≈ 0.77)', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 10 } as any,
        });
        runMoraleDrift(state, []);
        // 1/(1+10*0.03)=0.769 → 5×0.769×1.0 = 3.846 → round 4
        expect(state.military.formations!['b1']!.morale).toBe(54);
    });

    it('after 20 battles, drift is ~62%', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 20 } as any,
        });
        runMoraleDrift(state, []);
        // 1/(1+20*0.03)=0.625 → 5×0.625×1.0 = 3.125 → round 3
        expect(state.military.formations!['b1']!.morale).toBe(53);
    });

    it('after 40 battles, drift is ~45%', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 40 } as any,
        });
        runMoraleDrift(state, []);
        // 1/(1+40*0.03)=0.455 → 5×0.455×1.0 = 2.273 → round 2
        expect(state.military.formations!['b1']!.morale).toBe(52);
    });

    it('increments battle_outcome_count after processing', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'victory', battle_outcome_count: 5 } as any,
        });
        runMoraleDrift(state, []);
        expect((state.military.formations!['b1'] as any).battle_outcome_count).toBe(6);
    });

    it('initializes battle_outcome_count from undefined to 1', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'victory' } as any,
        });
        runMoraleDrift(state, []);
        expect((state.military.formations!['b1'] as any).battle_outcome_count).toBe(1);
    });
});

describe('Faction victory sensitivity', () => {
    it('RS decisive victory: 0.8× sensitivity → +4', () => {
        const state = makeState({
            b1: { faction: 'RS', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        expect(state.military.formations!['b1']!.morale).toBe(54);
    });

    it('RBiH decisive victory: 1.3× sensitivity → +7', () => {
        const state = makeState({
            b1: { faction: 'RBiH', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        // 5 × 1.0 × 1.3 = 6.5 → round 7... wait: Math.round(6.5) = 7 in JS (rounds to even? no, JS rounds .5 up)
        // Actually Math.round(6.5) = 7 in JS
        expect(state.military.formations!['b1']!.morale).toBe(57);
    });

    it('HRHB decisive victory: 1.0× sensitivity → +5 (baseline)', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        expect(state.military.formations!['b1']!.morale).toBe(55);
    });
});

describe('Faction defeat sensitivity', () => {
    it('RS catastrophic defeat: 1.3× sensitivity → -5', () => {
        const state = makeState({
            b1: { faction: 'RS', morale: 50, recent_battle_outcome: 'catastrophic', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        // -4 × 1.0 × 1.3 = -5.2 → round -5
        expect(state.military.formations!['b1']!.morale).toBe(45);
    });

    it('RBiH catastrophic defeat: 0.7× sensitivity → -3', () => {
        const state = makeState({
            b1: { faction: 'RBiH', morale: 50, recent_battle_outcome: 'catastrophic', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        // -4 × 1.0 × 0.7 = -2.8 → round -3
        expect(state.military.formations!['b1']!.morale).toBe(47);
    });
});

describe('Combined habituation + sensitivity', () => {
    it('RS decisive after 20 battles: +5 × 0.625 × 0.8 = 2.5 → +3', () => {
        const state = makeState({
            b1: { faction: 'RS', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 20 } as any,
        });
        runMoraleDrift(state, []);
        // Math.round(5 * 0.625 * 0.8) = Math.round(2.5) = 3
        expect(state.military.formations!['b1']!.morale).toBe(53);
    });

    it('ARBiH catastrophic after 20 battles: -4 × 0.625 × 0.7 = -1.75 → -2', () => {
        const state = makeState({
            b1: { faction: 'RBiH', morale: 50, recent_battle_outcome: 'catastrophic', battle_outcome_count: 20 } as any,
        });
        runMoraleDrift(state, []);
        expect(state.military.formations!['b1']!.morale).toBe(48);
    });
});

describe('Faction home morale floors', () => {
    it('RBiH home defender: floor 30', () => {
        const state = makeState({
            b1: { faction: 'RBiH', morale: 22, home_defense_active: true,
                  recent_battle_outcome: 'catastrophic', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        // morale 22 + drift (catastrophic: -4 × 0.7 = -2.8 → -3) = 19, but floor 30
        expect(state.military.formations!['b1']!.morale).toBeGreaterThanOrEqual(30);
    });

    it('RS home defender: floor 20', () => {
        const state = makeState({
            b1: { faction: 'RS', morale: 15, home_defense_active: true,
                  recent_battle_outcome: 'repulsed', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        // morale 15 + drift (repulsed: -2 × 1.3 = -2.6 → -3) = 12, but floor 20
        expect(state.military.formations!['b1']!.morale).toBeGreaterThanOrEqual(20);
    });

    it('RS fixed-home sector front holder gets morale floor when home remains in same-corps standing OG territory', () => {
        const state = makeState({
            b1: {
                faction: 'RS',
                morale: 18,
                home_defense_active: false,
                location_osid: 'op:maglaj:jablanica',
                home_osid: 'op:gracanica:petrovo_2',
                corps_id: 'vrs_1st_krajina',
                assignment: { kind: 'sector', role: 'front', sector_id: 'sector:vrs_1st_krajina:2' },
                tags: ['placement:fixed_home_osid'],
            } as any,
        });
        state.military.corps_front_sectors = {
            'sector:vrs_1st_krajina:0': {
                sector_id: 'sector:vrs_1st_krajina:0',
                corps_id: 'vrs_1st_krajina',
                faction: 'RS',
                territory_osids: ['op:gracanica:petrovo_2'],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
            } as any,
            'sector:vrs_1st_krajina:2': {
                sector_id: 'sector:vrs_1st_krajina:2',
                corps_id: 'vrs_1st_krajina',
                faction: 'RS',
                territory_osids: ['op:maglaj:jablanica'],
                assigned_brigade_ids: ['b1'],
                reserve_brigade_ids: [],
            } as any,
        };

        const munPop = { maglaj: { total: 100, bosniak: 70, serb: 20, croat: 5, other: 5 } };
        runMoraleDrift(state, [], munPop);

        expect(state.military.formations!['b1']!.morale).toBeGreaterThanOrEqual(20);
    });

    it('does not give standing-OG morale floor without fixed-home placement tag', () => {
        const state = makeState({
            b1: {
                faction: 'RS',
                morale: 18,
                home_defense_active: false,
                location_osid: 'op:maglaj:jablanica',
                home_osid: 'op:gracanica:petrovo_2',
                corps_id: 'vrs_1st_krajina',
                assignment: { kind: 'sector', role: 'front', sector_id: 'sector:vrs_1st_krajina:2' },
                tags: [],
            } as any,
        });
        state.military.corps_front_sectors = {
            'sector:vrs_1st_krajina:0': {
                sector_id: 'sector:vrs_1st_krajina:0',
                corps_id: 'vrs_1st_krajina',
                faction: 'RS',
                territory_osids: ['op:gracanica:petrovo_2'],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
            } as any,
            'sector:vrs_1st_krajina:2': {
                sector_id: 'sector:vrs_1st_krajina:2',
                corps_id: 'vrs_1st_krajina',
                faction: 'RS',
                territory_osids: ['op:maglaj:jablanica'],
                assigned_brigade_ids: ['b1'],
                reserve_brigade_ids: [],
            } as any,
        };

        const munPop = { maglaj: { total: 100, bosniak: 70, serb: 20, croat: 5, other: 5 } };
        runMoraleDrift(state, [], munPop);

        expect(state.military.formations!['b1']!.morale).toBe(16);
    });

    it('does not give standing-OG morale floor to reserve or rear sector members', () => {
        const state = makeState({
            b1: {
                faction: 'RS',
                morale: 18,
                home_defense_active: false,
                location_osid: 'op:maglaj:jablanica',
                home_osid: 'op:gracanica:petrovo_2',
                corps_id: 'vrs_1st_krajina',
                assignment: { kind: 'sector', role: 'reserve', sector_id: 'sector:vrs_1st_krajina:2' },
                tags: ['placement:fixed_home_osid'],
            } as any,
        });
        state.military.corps_front_sectors = {
            'sector:vrs_1st_krajina:0': {
                sector_id: 'sector:vrs_1st_krajina:0',
                corps_id: 'vrs_1st_krajina',
                faction: 'RS',
                territory_osids: ['op:gracanica:petrovo_2'],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
            } as any,
            'sector:vrs_1st_krajina:2': {
                sector_id: 'sector:vrs_1st_krajina:2',
                corps_id: 'vrs_1st_krajina',
                faction: 'RS',
                territory_osids: ['op:maglaj:jablanica'],
                assigned_brigade_ids: [],
                reserve_brigade_ids: ['b1'],
            } as any,
        };

        const munPop = { maglaj: { total: 100, bosniak: 70, serb: 20, croat: 5, other: 5 } };
        runMoraleDrift(state, [], munPop);

        expect(state.military.formations!['b1']!.morale).toBe(16);
    });

    it('does not give standing-OG morale floor when home is no longer in same-corps territory', () => {
        const state = makeState({
            b1: {
                faction: 'RS',
                morale: 18,
                home_defense_active: false,
                location_osid: 'op:maglaj:jablanica',
                home_osid: 'op:gracanica:petrovo_2',
                corps_id: 'vrs_1st_krajina',
                assignment: { kind: 'sector', role: 'front', sector_id: 'sector:vrs_1st_krajina:2' },
                tags: ['placement:fixed_home_osid'],
            } as any,
        });
        state.military.corps_front_sectors = {
            'sector:vrs_1st_krajina:2': {
                sector_id: 'sector:vrs_1st_krajina:2',
                corps_id: 'vrs_1st_krajina',
                faction: 'RS',
                territory_osids: ['op:maglaj:jablanica'],
                assigned_brigade_ids: ['b1'],
                reserve_brigade_ids: [],
            } as any,
        };

        const munPop = { maglaj: { total: 100, bosniak: 70, serb: 20, croat: 5, other: 5 } };
        runMoraleDrift(state, [], munPop);

        expect(state.military.formations!['b1']!.morale).toBe(16);
    });

    it('HRHB home defender: floor 25', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 20, home_defense_active: true,
                  recent_battle_outcome: 'repulsed', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        expect(state.military.formations!['b1']!.morale).toBeGreaterThanOrEqual(25);
    });
});

describe('RBiH existential floor', () => {
    it('RBiH in co-ethnic majority (>50%) gets floor 25 without home_defense_active', () => {
        const state = makeState({
            b1: { faction: 'RBiH', morale: 20, location_osid: 'op:tuzla:tuzla_1' } as any,
        });
        // Affinity must exceed HIGH_AFFINITY_THRESHOLD (0.70) to produce non-zero drift,
        // otherwise the drift===0 guard skips floor logic. bosniak+other = 76% > 70%.
        const munPop = { tuzla: { total: 100, bosniak: 71, serb: 12, croat: 12, other: 5 } };
        runMoraleDrift(state, [], munPop);
        expect(state.military.formations!['b1']!.morale).toBeGreaterThanOrEqual(25);
    });

    it('RBiH in low co-ethnic area (<50%) does NOT get existential floor', () => {
        const state = makeState({
            b1: { faction: 'RBiH', morale: 10, location_osid: 'op:prijedor:prijedor_1' } as any,
        });
        const munPop = { prijedor: { total: 100, bosniak: 20, serb: 60, croat: 10, other: 10 } };
        runMoraleDrift(state, [], munPop);
        expect(state.military.formations!['b1']!.morale).toBeLessThan(25);
    });

    it('RS in co-ethnic majority does NOT get existential floor', () => {
        const state = makeState({
            b1: { faction: 'RS', morale: 10, location_osid: 'op:prijedor:prijedor_1' } as any,
        });
        const munPop = { prijedor: { total: 100, bosniak: 20, serb: 60, croat: 10, other: 10 } };
        runMoraleDrift(state, [], munPop);
        expect(state.military.formations!['b1']!.morale).toBeLessThan(25);
    });
});
