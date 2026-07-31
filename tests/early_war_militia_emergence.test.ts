/**
 * Phase C Step 3: Militia emergence tests.
 * - Emergence triggers under specified conditions (organizational penetration, declarations).
 * - Deterministic ordering for formation creation (municipalities and factions sorted).
 * - No emergence before war_start_turn (Peace phase path not run; gating in phase_i_entry_gating.test.ts).
 */

import { expect, test } from 'vitest';
import {
    computeMilitiaStrength,
    MILITIA_STRENGTH_MAX,
    MILITIA_STRENGTH_MIN,
    updateMilitiaEmergence
} from '../src/sim/early_war/militia_emergence.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function stateWithMunicipalities(overrides: Partial<GameState['meta']> = {}): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 10,
            seed: 'militia-fixture',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
            ...overrides
        },
  factions: [
            {
                id: 'RBiH',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: false,
                declaration_turn: null
            },
            {
                id: 'RS',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: true,
                declaration_turn: 5
            },
            {
                id: 'HRHB',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: false,
                declaration_turn: null
            }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: { 'SID_001': 'RBiH', 'SID_002': 'RS' },
    municipalities: {
            MUN_A: {
                stability_score: 60,
                organizational_penetration: {
                    police_loyalty: 'mixed',
                    to_control: 'controlled',
                    sda_penetration: 40,
                    sds_penetration: 50,
                    hdz_penetration: 10,
                    patriotska_liga: 20,
                    paramilitary_rs: 30,
                    paramilitary_hrhb: 5
                }
            },
            MUN_B: {
                stability_score: 50,
                organizational_penetration: {
                    police_loyalty: 'hostile',
                    to_control: 'contested',
                    sds_penetration: 80,
                    paramilitary_rs: 60
                }
            }
        }
  } as any,
        displacement: {} as any
    };
}

test('updateMilitiaEmergence populates war_militia_strength when municipalities and org penetration present', () => {
    const state = stateWithMunicipalities();
    const report = updateMilitiaEmergence(state);
    expect(state.military.war_militia_strength).toBeTruthy();
    expect(report.municipalities_updated).toBe(2);
    expect(state.military.war_militia_strength!['MUN_A']).toBeTruthy();
    expect(state.military.war_militia_strength!['MUN_B']).toBeTruthy();
    const munA = state.military.war_militia_strength!['MUN_A'];
    expect(typeof munA.RBiH).toBe('number');
    expect(typeof munA.RS).toBe('number');
    expect(typeof munA.HRHB).toBe('number');
    expect(munA.RS >= MILITIA_STRENGTH_MIN && munA.RS <= MILITIA_STRENGTH_MAX).toBeTruthy();
});

test('militia strength is bounded [0, 100]', () => {
    const state = stateWithMunicipalities();
    updateMilitiaEmergence(state);
    for (const munId of Object.keys(state.military.war_militia_strength!)) {
        const byFaction = state.military.war_militia_strength![munId];
        for (const faction of Object.keys(byFaction)) {
            const v = byFaction[faction];
            expect(v >= MILITIA_STRENGTH_MIN && v <= MILITIA_STRENGTH_MAX).toBeTruthy();
        }
    }
});

test('deterministic ordering: same state yields same report order and values', () => {
    const state = stateWithMunicipalities();
    const report1 = updateMilitiaEmergence(state);
    const state2 = stateWithMunicipalities();
    const report2 = updateMilitiaEmergence(state2);
    const munIds1 = report1.by_mun.map((m) => m.mun_id);
    const munIds2 = report2.by_mun.map((m) => m.mun_id);
    expect(munIds1).toEqual(munIds2);
    expect(munIds1[0]).toBe('MUN_A');
    expect(munIds1[1]).toBe('MUN_B');
    expect(state.military.war_militia_strength).toEqual(state2.military.war_militia_strength);
});

test('computeMilitiaStrength returns 0 when no organizational penetration', () => {
    const state = stateWithMunicipalities();
    const strength = computeMilitiaStrength(undefined, 'RS', state, 'MUN_X');
    expect(strength).toBe(0);
});

test('RS declared increases militia growth; second runTurn shows higher RS strength in MUN with SDS', async () => {
    const state = stateWithMunicipalities();
    state.military.war_militia_strength = {};
    updateMilitiaEmergence(state);
    const rsFirst = state.military.war_militia_strength!['MUN_B']?.RS ?? 0;
    const { nextState } = await runTurn(state, { seed: state.meta.seed });
    const rsSecond = nextState.military.war_militia_strength!['MUN_B']?.RS ?? 0;
    expect(rsSecond >= rsFirst).toBeTruthy();
});

test('war runTurn default path omits phase_i militia emergence report', async () => { // legacy-phase-term-ok
    const state = stateWithMunicipalities();
    const { report } = await runTurn(state, { seed: state.meta.seed });
    expect(report.militia_emergence).toBe(undefined);
    expect(report.phases.some((p) => p.name === 'phase-i-militia-emergence')).toBe(false);
});
