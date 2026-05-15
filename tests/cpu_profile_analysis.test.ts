import { describe, expect, it } from 'vitest';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { summarizeCpuProfile } from '../tools/perf/cpu_profile_analysis.js';

function profileUrl(appRoot: string, path: string): string {
    return pathToFileURL(join(appRoot, path)).href;
}

describe('cpu profile analysis', () => {
    it('aggregates V8 samples into stable self-time and inclusive total-time frames', () => {
        const appRoot = resolve('profile-fixture-root');
        const summary = summarizeCpuProfile({
            nodes: [
                {
                    id: 1,
                    callFrame: { functionName: '(root)', scriptId: '0', url: '', lineNumber: -1, columnNumber: -1 },
                    children: [2, 3],
                },
                {
                    id: 2,
                    callFrame: {
                        functionName: 'commanderLoop',
                        scriptId: '1',
                        url: profileUrl(appRoot, 'src/sim/combat/commander/commander_loop.ts'),
                        lineNumber: 41,
                        columnNumber: 4,
                    },
                    children: [4],
                },
                {
                    id: 3,
                    callFrame: {
                        functionName: 'stableStringify',
                        scriptId: '2',
                        url: profileUrl(appRoot, 'src/utils/stable_json.ts'),
                        lineNumber: 9,
                        columnNumber: 0,
                    },
                },
                {
                    id: 4,
                    callFrame: {
                        functionName: 'predictCombatOutcome',
                        scriptId: '3',
                        url: profileUrl(appRoot, 'src/sim/combat/combat_predictor.ts'),
                        lineNumber: 120,
                        columnNumber: 8,
                    },
                },
            ],
            samples: [4, 3, 4],
            timeDeltas: [1000, 2000, 3000],
        }, { topN: 4, appRoot });

        expect(summary.totalSampledMs).toBe(6);
        expect(summary.topSelf.map((frame) => [frame.functionName, frame.selfMs, frame.totalMs, frame.sampleCount])).toEqual([
            ['predictCombatOutcome', 4, 4, 2],
            ['stableStringify', 2, 2, 1],
            ['(root)', 0, 6, 0],
            ['commanderLoop', 0, 4, 0],
        ]);
        expect(summary.topTotal.map((frame) => [frame.functionName, frame.selfMs, frame.totalMs])).toEqual([
            ['(root)', 0, 6],
            ['predictCombatOutcome', 4, 4],
            ['commanderLoop', 0, 4],
            ['stableStringify', 2, 2],
        ]);
    });

    it('can restrict summaries to repository frames outside node_modules', () => {
        const appRoot = resolve('profile-fixture-root');
        const summary = summarizeCpuProfile({
            nodes: [
                {
                    id: 1,
                    callFrame: { functionName: '(root)', scriptId: '0', url: '', lineNumber: -1, columnNumber: -1 },
                    children: [2, 3],
                },
                {
                    id: 2,
                    callFrame: {
                        functionName: 'tsxLoader',
                        scriptId: '1',
                        url: profileUrl(appRoot, 'node_modules/tsx/dist/loader.mjs'),
                        lineNumber: 20,
                        columnNumber: 0,
                    },
                },
                {
                    id: 3,
                    callFrame: {
                        functionName: 'runTurn',
                        scriptId: '2',
                        url: profileUrl(appRoot, 'src/sim/turn_pipeline.ts'),
                        lineNumber: 50,
                        columnNumber: 2,
                    },
                },
            ],
            samples: [2, 3],
            timeDeltas: [5000, 7000],
        }, { topN: 5, appRoot, applicationOnly: true });

        expect(summary.topSelf.map((frame) => frame.functionName)).toEqual(['runTurn']);
        expect(summary.topSelf[0]?.selfMs).toBe(7);
        expect(summary.topTotal.map((frame) => frame.functionName)).toEqual(['runTurn']);
    });
});
