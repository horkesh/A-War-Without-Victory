import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

const runTurnMock = vi.hoisted(() => vi.fn());

vi.mock('../src/sim/turn_pipeline.js', async () => {
    const actual = await vi.importActual<typeof import('../src/sim/turn_pipeline.js')>(
        '../src/sim/turn_pipeline.js',
    );
    return { ...actual, runTurn: runTurnMock };
});

import { runScenario } from '../src/scenario/scenario_runner.js';

const INVARIANT_FAILURE_MESSAGE =
    'Post-turn invariant failure at turn 1: 1 issue(s): ' +
    'formation.location_missing at military.formations.invalid_brigade.location_osid: ' +
    'Active physical formation invalid_brigade (RBiH) has no location_osid';

describe('scenario harness TurnResult handling', () => {
    it('reports the first invariant failure and never persists its invalid next state', async () => {
        const tempDir = await mkdtemp(join(tmpdir(), 'awwv-turn-result-'));
        const outDir = join(tempDir, 'failure');
        runTurnMock.mockImplementationOnce(async (state) => ({
            status: 'invariant_failure',
            turn: state.meta.turn + 1,
            stage: 'post_turn',
            issues: [{
                severity: 'error',
                code: 'formation.location_missing',
                path: 'military.formations.invalid_brigade.location_osid',
                message: 'Active physical formation invalid_brigade (RBiH) has no location_osid',
            }],
            nextState: {
                ...state,
                meta: { ...state.meta, turn: state.meta.turn + 1 },
            },
            report: { seed: state.meta.seed, phases: [] },
        }));

        try {
            await expect(runScenario({
                scenarioPath: join(process.cwd(), 'data', 'scenarios', 'noop_4w.json'),
                outDirOverride: outDir,
                weeksOverride: 2,
                consoleDiagnostics: false,
            })).rejects.toThrow(INVARIANT_FAILURE_MESSAGE);

            expect(runTurnMock).toHaveBeenCalledTimes(1);
            expect(existsSync(join(outDir, 'final_save.json'))).toBe(false);
            const failure = JSON.parse(
                await readFile(join(outDir, 'failure_report.json'), 'utf8'),
            ) as { error_message: string };
            expect(failure.error_message).toBe(INVARIANT_FAILURE_MESSAGE);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    }, 30_000);
});
