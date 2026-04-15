/**
 * Phase C Step 5: Authority degradation tests.
 * - Authority can degrade while control remains unchanged.
 * - Control can change without granting authority (control flip does not modify authority; Step 4).
 */

import { expect, test } from 'vitest';
import { runAuthorityDegradation } from '../src/sim/early_war/authority_degradation.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function stateWithDeclarations(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 10,
            seed: 'authority-fixture',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10
        },
  factions: [
            {
                id: 'RBiH',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: false,
                declaration_turn: null
            },
            {
                id: 'RS',
                profile: { authority: 40, legitimacy: 40, control: 40, logistics: 40, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: true,
                declaration_turn: 5
            },
            {
                id: 'HRHB',
                profile: { authority: 35, legitimacy: 35, control: 35, logistics: 35, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: true,
                declaration_turn: 6
            }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    war_jna: { transition_begun: true, withdrawal_progress: 0.2, asset_transfer_rs: 0.15 }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH', s2: 'RS' },
    municipalities: { MUN_A: { stability_score: 50 }, MUN_B: { stability_score: 50 } }
  } as any,
        displacement: {} as any
    };
}

test('runAuthorityDegradation updates RBiH authority (decay from RS/HRHB declared and JNA)', () => {
    const state = stateWithDeclarations();
    const rbihBefore = state.factions!.find((f) => f.id === 'RBiH')!.profile.authority;
    const report = runAuthorityDegradation(state);
    const rbihAfter = state.factions!.find((f) => f.id === 'RBiH')!.profile.authority;
    const change = report.changes.find((c) => c.faction_id === 'RBiH');
    expect(change).toBeTruthy();
    expect(change!.authority_before).toBe(rbihBefore);
    expect(change!.authority_after).toBe(rbihAfter);
    expect(rbihAfter !== rbihBefore).toBeTruthy();
});

test('RBiH authority does not fall below 20 (Peace phase floor)', () => {
    const state = stateWithDeclarations();
    state.factions!.find((f) => f.id === 'RBiH')!.profile.authority = 22;
    for (let i = 0; i < 5; i++) runAuthorityDegradation(state);
    const rbihAfter = state.factions!.find((f) => f.id === 'RBiH')!.profile.authority;
    expect(rbihAfter >= 20).toBeTruthy();
});

test('RS authority is capped at 85', () => {
    const state = stateWithDeclarations();
    state.factions!.find((f) => f.id === 'RS')!.profile.authority = 84;
    runAuthorityDegradation(state);
    const rsAfter = state.factions!.find((f) => f.id === 'RS')!.profile.authority;
    expect(rsAfter <= 85).toBeTruthy();
});

test('HRHB authority is capped at 70', () => {
    const state = stateWithDeclarations();
    state.factions!.find((f) => f.id === 'HRHB')!.profile.authority = 69;
    runAuthorityDegradation(state);
    const hrhbAfter = state.factions!.find((f) => f.id === 'HRHB')!.profile.authority;
    expect(hrhbAfter <= 70).toBeTruthy();
});

test('Authority can degrade while control unchanged (political_controllers not touched)', () => {
    const state = stateWithDeclarations();
    const pcBefore = { ...state.political.political_controllers };
    runAuthorityDegradation(state);
    expect(state.political.political_controllers).toEqual(pcBefore);
    const rbihAfter = state.factions!.find((f) => f.id === 'RBiH')!.profile.authority;
    expect(typeof rbihAfter === 'number').toBeTruthy();
});

test('war runTurn default path omits phase_i authority report', async () => {
    const state = stateWithDeclarations();
    const { report } = await runTurn(state, { seed: state.meta.seed });
    expect(report.authority_degradation).toBe(undefined);
    expect(report.phases.some((p) => p.name === 'phase-i-authority-update')).toBe(false);
});
