/**
 * Phase F Step 6: Pipeline integration tests.
 * - phase-f-displacement runs only when meta.phase === 'war'.
 * - Pipeline order: phase-f-displacement after phase-e-rear-zone-derivation.
 * - No displacement step in phase_0 / peace phase.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { EdgeRecord } from '../src/map/settlements.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'pf-pipe-i',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10
        },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { s1: 'RBiH', s2: 'RS' }
    };
}

function minimalPhaseIIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 20,
            seed: 'pf-pipe-ii',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10
        },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { S1: 'RBiH', S2: 'RS' }
    };
}

test('runTurn rejects peace phase (state pipeline owns peace)', async () => {
    const state = minimalPhaseIState();
    state.meta.phase = 'peace';
    const edges: EdgeRecord[] = [{ a: 's1', b: 's2' }];
    await assert.rejects(
        async () => runTurn(state, { seed: 'pf-pipe-i', settlementEdges: edges }),
        /use state pipeline runOneTurn for peace/
    );
});

test('phase_ii runTurn includes phase-f-displacement after phase-e-rear-zone-derivation', async () => {
    const state = minimalPhaseIIState();
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const { report } = await runTurn(state, { seed: 'pf-pipe-ii', settlementEdges: edges });
    const phaseNames = report.phases.map((p) => p.name);
    const idxPhaseF = phaseNames.indexOf('phase-f-displacement');
    const idxRear = phaseNames.indexOf('phase-e-rear-zone-derivation');
    assert.ok(idxPhaseF >= 0, 'phase-f-displacement must run in war phase');
    assert.ok(idxRear >= 0, 'phase-e-rear-zone-derivation must run in war phase');
    assert.ok(idxPhaseF > idxRear, 'phase-f-displacement must run after phase-e-rear-zone-derivation');
    assert.ok(report.phase_f_displacement?.trigger_report != null);
    assert.ok(report.phase_f_displacement?.capacity_report != null);
});
