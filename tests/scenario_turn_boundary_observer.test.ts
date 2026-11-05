import { existsSync } from 'node:fs';
import { readFile, readdir, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { serializeState } from '../src/state/serialize.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

const SCENARIO = join(process.cwd(), 'data', 'scenarios', 'apr1992_4w.json');
const RETAIN_FIXTURES = process.env.AWWV_OBSERVER_TEST_OUTPUT_ROOT !== undefined;
const ROOT = process.env.AWWV_OBSERVER_TEST_OUTPUT_ROOT
    ?? join(process.cwd(), '.tmp_scenario_turn_boundary_observer');

async function cleanup(): Promise<void> {
    if (!RETAIN_FIXTURES && existsSync(ROOT)) await rm(ROOT, { recursive: true, force: true });
}

async function artifactBytes(root: string): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    async function walk(dir: string): Promise<void> {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) await walk(path);
            else out[relative(root, path).replaceAll('\\', '/')] = await readFile(path, 'utf8');
        }
    }
    await walk(root);
    return out;
}

describe('scenario diagnostic turn-boundary observer', () => {
    afterEach(async () => {
        vi.restoreAllMocks();
        await cleanup();
    });

    it('is inert when absent and delivers one detached snapshot per completed week', async () => {
        await cleanup();
        const cloneSpy = vi.spyOn(globalThis, 'structuredClone');
        const sharedOutDir = join(ROOT, 'byte-neutral');
        const commonOptions = {
            scenarioPath: SCENARIO,
            outDirOverride: sharedOutDir,
            weeksOverride: 2,
            emitSaveAtWeeks: [1, 2],
            consoleDiagnostics: false,
        } as const;

        const baseline = await runScenario(commonOptions);
        const baselineBytes = await artifactBytes(baseline.outDir);
        const baselineCloneCount = cloneSpy.mock.calls.length;

        const explicitAbsent = await runScenario({
            ...commonOptions,
            diagnosticTurnBoundaryObserver: undefined,
        });
        expect(cloneSpy.mock.calls.length - baselineCloneCount).toBe(baselineCloneCount);
        expect(explicitAbsent.final_state_hash).toBe(baseline.final_state_hash);
        expect(await artifactBytes(explicitAbsent.outDir)).toEqual(baselineBytes);

        const noOpBoundaries: number[] = [];
        const noOpObserved = await runScenario({
            ...commonOptions,
            diagnosticTurnBoundaryObserver: ({ week_index }) => {
                noOpBoundaries.push(week_index);
            },
        });
        expect(noOpBoundaries).toEqual([0, 1]);
        expect(noOpObserved.final_state_hash).toBe(baseline.final_state_hash);
        expect(await artifactBytes(noOpObserved.outDir)).toEqual(baselineBytes);

        const observations: Array<{ week_index: number; turn: number }> = [];
        const observedBoundarySaves: string[] = [];
        let sawOwnUndefinedFormationProperty = false;
        const observed = await runScenario({
            ...commonOptions,
            diagnosticTurnBoundaryObserver: ({ week_index, state, report }) => {
                observations.push({ week_index, turn: state.meta.turn });
                observedBoundarySaves.push(serializeState(state));
                expect(report.seed).toBe(state.meta.seed);
                for (const formation of Object.values(state.military.formations ?? {})) {
                    for (const key of Object.keys(formation)) {
                        if (Object.prototype.hasOwnProperty.call(formation, key)
                            && (formation as unknown as Record<string, unknown>)[key] === undefined) {
                            sawOwnUndefinedFormationProperty = true;
                        }
                    }
                }
                state.meta.turn = 9999;
                report.phases.length = 0;
            },
        });

        expect(observations).toEqual([
            { week_index: 0, turn: 1 },
            { week_index: 1, turn: 2 },
        ]);
        expect(sawOwnUndefinedFormationProperty).toBe(true);
        expect(observed.final_state_hash).toBe(baseline.final_state_hash);
        expect(JSON.parse(await readFile(observed.paths.final_save, 'utf8')).meta.turn).toBe(2);
        expect(await artifactBytes(observed.outDir)).toEqual(baselineBytes);
        expect(observed.paths.weekly_saves).toHaveLength(2);
        expect(await Promise.all(observed.paths.weekly_saves!.map((path) => readFile(path, 'utf8'))))
            .toEqual(observedBoundarySaves);
    }, 120_000);

    it('fails closed when detached report cloning fails', async () => {
        await cleanup();
        const originalStructuredClone = globalThis.structuredClone;
        vi.spyOn(globalThis, 'structuredClone').mockImplementation(((value: unknown, options?: StructuredSerializeOptions) => {
            if (value && typeof value === 'object' && Array.isArray((value as { phases?: unknown }).phases)) {
                throw new Error('observer report clone failed');
            }
            return originalStructuredClone(value, options);
        }) as typeof structuredClone);

        await expect(runScenario({
            scenarioPath: SCENARIO,
            outDirOverride: join(ROOT, 'clone-failure'),
            weeksOverride: 1,
            consoleDiagnostics: false,
            diagnosticTurnBoundaryObserver: () => {
                throw new Error('callback must not run after clone failure');
            },
        })).rejects.toThrow('observer report clone failed');
    }, 120_000);

    it('fails closed when the callback throws', async () => {
        await cleanup();
        await expect(runScenario({
            scenarioPath: SCENARIO,
            outDirOverride: join(ROOT, 'callback-failure'),
            weeksOverride: 1,
            consoleDiagnostics: false,
            diagnosticTurnBoundaryObserver: () => {
                throw new Error('observer callback failed');
            },
        })).rejects.toThrow('observer callback failed');
    }, 120_000);
});
