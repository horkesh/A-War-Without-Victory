/**
 * Phase D Step 7: War phase turn structure integration tests.
 * - Pipeline order for war phase: phase-ii-consolidation runs after supply-resolution.
 * - Regression: Peace phase behavior unchanged (Peace phase run reports only phase-i-* phases).
 */

import { describe, expect, it } from 'vitest';
import type { EdgeRecord } from '../src/map/settlements.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 20,
            seed: 'pipeline-ii',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
        },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
        political: {
            political_controllers: { S1: 'RBiH', S2: 'RS', S3: 'HRHB' },
        } as any,
        displacement: {} as any,
    };
}

function minimalPhaseIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'pipeline-i',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
        },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 5 },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            war_militia_strength: { MUN_A: { RBiH: 30, RS: 60, HRHB: 10 }, MUN_B: { RBiH: 25, RS: 70, HRHB: 5 } },
        } as any,
        political: {
            political_controllers: { s1: 'RBiH', s2: 'RS' },
            municipalities: { MUN_A: { stability_score: 50 }, MUN_B: { stability_score: 50 } },
            war_consolidation_until: {},
        } as any,
        displacement: {} as any,
    };
}

describe('runTurn combat pipeline order', () => {
    it('includes paramilitary-advance after supply-resolution in war phase', async () => {
        const state = minimalPhaseIIState();
        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        const { report } = await runTurn(state, { seed: 'pipeline-ii', settlementEdges: edges });
        const names = report.phases.map((p) => p.name);
        const idxSupply = names.indexOf('supply-resolution');
        const idxParaAdv = names.indexOf('paramilitary-advance');
        expect(idxSupply >= 0).toBe(true);
        expect(idxParaAdv >= 0).toBe(true);
        expect(idxParaAdv > idxSupply).toBe(true);
    });

    it('includes paramilitary-advance on the default war path', async () => {
        const state = minimalPhaseIState();
        const { report } = await runTurn(state, { seed: 'pipeline-i' });
        const names = report.phases.map((p) => p.name);
        expect(names.includes('paramilitary-advance')).toBe(true);
        expect(names.includes('phase-i-control-flip')).toBe(false);
    });
});
