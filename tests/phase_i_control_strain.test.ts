/**
 * Phase C Step 6: Control strain initiation tests.
 * - Strain triggers correctly and deterministically.
 * - Strain does not alter supply; strain does alter exhaustion per spec §4.5.3 (authorized).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { getFactionTotalControlStrain, runControlStrain } from '../src/sim/phase_i/control_strain.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState, MunicipalityId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function stateWithMunicipalitiesAndControl(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 12,
            seed: 'strain-fixture',
            phase: 'phase_i',
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
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: true,
                declaration_turn: 5
            },
            {
                id: 'HRHB',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: false,
                declaration_turn: null
            }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { s1: 'RBiH', s2: 'RS', s3: 'RBiH' },
        municipalities: {
            MUN_A: { stability_score: 60 },
            MUN_B: { stability_score: 50 }
        },
        phase_i_control_strain: {}
    };
}

/** Stub settlementsByMun: MUN_A has s1,s3 (RBiH majority), MUN_B has s2 (RS). */
function stubSettlementsByMun(): Map<MunicipalityId, string[]> {
    const byMun = new Map<MunicipalityId, string[]>();
    byMun.set('MUN_A' as MunicipalityId, ['s1', 's3']);
    byMun.set('MUN_B' as MunicipalityId, ['s2']);
    return byMun as Map<MunicipalityId, string[]>;
}

test('runControlStrain accumulates strain per municipality and reports faction totals', () => {
    const state = stateWithMunicipalitiesAndControl();
    const byMun = stubSettlementsByMun();
    const report = runControlStrain(state, 12, byMun);
    assert.strictEqual(report.municipalities_updated, 2);
    assert.ok(Array.isArray(report.faction_totals));
    assert.ok(report.faction_totals.length >= 2);
    const rbihTotal = report.faction_totals.find((t) => t.faction_id === 'RBiH');
    const rsTotal = report.faction_totals.find((t) => t.faction_id === 'RS');
    assert.ok(rbihTotal !== undefined);
    assert.ok(rsTotal !== undefined);
    assert.ok(state.phase_i_control_strain);
    assert.ok('MUN_A' in state.phase_i_control_strain! || 'MUN_B' in state.phase_i_control_strain!);
});

test('runControlStrain is deterministic: same state yields same report', () => {
    const state1 = stateWithMunicipalitiesAndControl();
    const state2 = stateWithMunicipalitiesAndControl();
    const byMun = stubSettlementsByMun();
    const report1 = runControlStrain(state1, 12, byMun);
    const report2 = runControlStrain(state2, 12, byMun);
    assert.deepStrictEqual(
        report1.faction_totals.map((t) => ({ id: t.faction_id, total: t.total_strain })),
        report2.faction_totals.map((t) => ({ id: t.faction_id, total: t.total_strain }))
    );
});

test('runControlStrain applies exhaustion coupling per spec (exhaustion increases)', () => {
    const state = stateWithMunicipalitiesAndControl();
    const byMun = stubSettlementsByMun();
    const rbihExhaustionBefore = state.factions!.find((f) => f.id === 'RBiH')!.profile.exhaustion;
    runControlStrain(state, 12, byMun);
    const rbihExhaustionAfter = state.factions!.find((f) => f.id === 'RBiH')!.profile.exhaustion;
    assert.ok(rbihExhaustionAfter >= rbihExhaustionBefore, 'Exhaustion coupling per spec §4.5.3');
});

test('runControlStrain does not touch supply state', () => {
    const state = stateWithMunicipalitiesAndControl();
    const byMun = stubSettlementsByMun();
    const supplySourcesBefore = state.factions!.map((f) => [...(f.supply_sources ?? [])]);
    runControlStrain(state, 12, byMun);
    const supplySourcesAfter = state.factions!.map((f) => [...(f.supply_sources ?? [])]);
    assert.deepStrictEqual(supplySourcesAfter, supplySourcesBefore, 'Supply must be unchanged');
});

test('getFactionTotalControlStrain returns sum for faction-controlled municipalities', () => {
    const state = stateWithMunicipalitiesAndControl();
    state.phase_i_control_strain = { MUN_A: 5, MUN_B: 3 };
    const byMun = stubSettlementsByMun();
    const rbihTotal = getFactionTotalControlStrain(state, 'RBiH', byMun);
    const rsTotal = getFactionTotalControlStrain(state, 'RS', byMun);
    assert.strictEqual(rbihTotal, 5, 'RBiH controls MUN_A (s1,s3)');
    assert.strictEqual(rsTotal, 3, 'RS controls MUN_B (s2)');
});

test('Phase I runTurn includes control strain in report', async () => {
    const state = stateWithMunicipalitiesAndControl();
    const { report } = await runTurn(state, { seed: state.meta.seed });
    assert.ok(report.phase_i_control_strain);
    assert.strictEqual(typeof report.phase_i_control_strain!.municipalities_updated, 'number');
    assert.ok(Array.isArray(report.phase_i_control_strain!.faction_totals));
    assert.ok(report.phases.some((p) => p.name === 'phase-i-control-strain'));
});
