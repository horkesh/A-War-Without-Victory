import { describe, expect, it, vi } from 'vitest';

import * as turnPipeline from '../src/sim/turn_pipeline.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';

function stateWithUnplacedActiveBrigade(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 0,
            seed: 'initial-seed',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 0,
            war_start_turn: 0,
        },
        factions: [],
        military: {
            formations: {
                invalid_brigade: {
                    id: 'invalid_brigade',
                    faction: 'RBiH',
                    name: 'Invalid Brigade',
                    created_turn: 0,
                    status: 'active',
                    assignment: null,
                    kind: 'brigade',
                },
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as unknown as GameState['military'],
        political: { political_controllers: {} } as GameState['political'],
        displacement: {} as GameState['displacement'],
    };
}

describe('post-turn invariant barrier', () => {
    it('returns a discriminated structured failure instead of logging or throwing', async () => {
        const state = stateWithUnplacedActiveBrigade();

        const result = await turnPipeline.runTurn(state, { seed: 'post-turn-invariant-test', settlementEdges: [] });

        expect(result).toMatchObject({
            status: 'invariant_failure',
            turn: 1,
            stage: 'post_turn',
            issues: [{
                severity: 'error',
                code: 'formation.location_missing',
                path: 'military.formations.invalid_brigade.location_osid',
            }],
        });
        expect(state.meta.turn).toBe(0);
    });

    it('keeps throwing behavior behind an explicit development-only API', async () => {
        const devRun = (turnPipeline as unknown as Record<string, unknown>).runTurnWithInvariantThrowForDevelopment;
        expect(typeof devRun).toBe('function');

        await expect((devRun as typeof turnPipeline.runTurn)(stateWithUnplacedActiveBrigade(), {
            seed: 'post-turn-invariant-dev-test',
            settlementEdges: [],
        })).rejects.toThrow(/post-turn invariant failure/i);
    });

    it('does not publish displacement events before a failing post-turn barrier', async () => {
        const state = stateWithUnplacedActiveBrigade();
        state.displacement.displacement_event_log = [{
            turn: 0,
            origin_mun: 'origin',
            dest_mun: 'destination',
            ethnicity: 'RBiH',
            displaced: 1,
            killed: 0,
            fled_abroad: 0,
            settled: 0,
        }];
        const sink = vi.fn();

        const result = await turnPipeline.runTurn(state, {
            seed: 'post-turn-invariant-side-effect-test',
            settlementEdges: [],
            displacementEventStreamSink: sink,
        });

        expect(result.status).toBe('invariant_failure');
        expect(sink).not.toHaveBeenCalled();
    });

    it('publishes queued displacement events after a successful post-turn barrier', async () => {
        const state = stateWithUnplacedActiveBrigade();
        state.military.formations = {};
        const event = {
            turn: 0,
            origin_mun: 'origin',
            dest_mun: 'destination',
            ethnicity: 'RBiH' as const,
            displaced: 1,
            killed: 0,
            fled_abroad: 0,
            settled: 0,
        };
        state.displacement.displacement_event_log = [event];
        const sink = vi.fn();

        const result = await turnPipeline.runTurn(state, {
            seed: 'post-turn-invariant-success-side-effect-test',
            settlementEdges: [],
            displacementEventStreamSink: sink,
        });

        expect(result.status).toBe('success');
        expect(sink).toHaveBeenCalledOnce();
        expect(sink).toHaveBeenCalledWith([event]);
    });
});
