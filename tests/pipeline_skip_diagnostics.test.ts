import { describe, expect, it } from 'vitest';
import type { EdgeRecord } from '../src/map/settlements.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalWarState(seed = 'pipeline-skip-diagnostics'): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 20,
            seed,
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
            political_controllers: { S1: 'RBiH', S2: 'RS' },
        } as any,
        displacement: {} as any,
    };
}

describe('phase pipeline skip diagnostics', () => {
    it('records a missing prerequisite skip in the turn report', async () => {
        const { report } = await runTurn(minimalWarState(), { seed: 'missing-edges' });

        expect((report as any).phase_skip_diagnostics).toContainEqual({
            phase: 'war',
            step: 'sync-front-segments',
            skip_reason: 'missing_settlement_edges',
        });
    });

    it('keeps normal war-phase diagnostic output deterministic', async () => {
        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        const first = await runTurn(minimalWarState('normal-war'), { seed: 'normal-war', settlementEdges: edges });
        const second = await runTurn(minimalWarState('normal-war'), { seed: 'normal-war', settlementEdges: edges });

        expect(first.report.phases).toEqual(second.report.phases);
        expect((first.report as any).phase_skip_diagnostics).toEqual((second.report as any).phase_skip_diagnostics);
        expect((first.report as any).phase_skip_diagnostics ?? []).not.toContainEqual({
            phase: 'war',
            step: 'sync-front-segments',
            skip_reason: 'missing_settlement_edges',
        });
    });
});
