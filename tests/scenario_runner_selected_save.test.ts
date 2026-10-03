import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { shouldEmitRoutineConsoleDiagnostics } from '../src/utils/routine_console_diagnostics.js';

const SCENARIO_PATH = 'data/scenarios/apr1992_definitive_188w.json';

describe('scenario runner selected diagnostic saves', () => {
    it('emits sorted unique requested saves and leaves default runs without weekly saves', async () => {
        const outDirBase = await mkdtemp(join(tmpdir(), 'awwv-selected-save-'));
        try {
            const selected = await runScenario({
                scenarioPath: SCENARIO_PATH,
                outDirBase,
                weeksOverride: 3,
                emitSaveAtWeeks: [3, 1],
            });

            expect(selected.paths.weekly_saves?.map((path) => path.split(/[\\/]/).pop())).toEqual([
                'save_w1.json',
                'save_w3.json',
            ]);
            expect(JSON.parse(await readFile(join(selected.outDir, 'save_w1.json'), 'utf8')).meta.turn).toBe(1);
            expect(JSON.parse(await readFile(join(selected.outDir, 'save_w3.json'), 'utf8')).meta.turn).toBe(3);

            const defaultRun = await runScenario({
                scenarioPath: SCENARIO_PATH,
                outDirBase,
                weeksOverride: 3,
                uniqueRunFolder: true,
            });
            expect(defaultRun.paths.weekly_saves).toBeUndefined();
            await expect(readdir(defaultRun.outDir)).resolves.not.toContain('save_w1.json');
        } finally {
            await rm(outDirBase, { recursive: true, force: true });
        }
    });

    it('rejects invalid, duplicate, or out-of-horizon selected weeks', async () => {
        const outDirBase = await mkdtemp(join(tmpdir(), 'awwv-selected-save-invalid-'));
        const diagnosticsBefore = shouldEmitRoutineConsoleDiagnostics();
        try {
            await expect(runScenario({
                scenarioPath: SCENARIO_PATH,
                outDirBase,
                weeksOverride: 3,
                emitSaveAtWeeks: [0],
                uniqueRunFolder: true,
                consoleDiagnostics: false,
            })).rejects.toThrow(/emitSaveAtWeeks/);
            await expect(readdir(outDirBase)).resolves.toEqual([]);
            expect(shouldEmitRoutineConsoleDiagnostics()).toBe(diagnosticsBefore);

            await expect(runScenario({
                scenarioPath: SCENARIO_PATH,
                outDirBase,
                weeksOverride: 3,
                emitSaveAtWeeks: [1, 1],
            })).rejects.toThrow(/emitSaveAtWeeks/);
            await expect(runScenario({
                scenarioPath: SCENARIO_PATH,
                outDirBase,
                weeksOverride: 3,
                emitSaveAtWeeks: [4],
            })).rejects.toThrow(/emitSaveAtWeeks/);
        } finally {
            await rm(outDirBase, { recursive: true, force: true });
        }
    });
});
