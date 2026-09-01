/**
 * The documented whole-suite command must be the one CI actually runs.
 *
 * This guard exists because it already failed once. `CLAUDE.md` listed
 * `npm run test:vitest` as the suite command while that script was a bare `vitest run` —
 * unsharded, `maxWorkers: 1`, the slowest possible route to coverage CI obtains in a
 * quarter of the time via `test:vitest:balanced`. A reader following the documentation
 * got the slow path and no indication a fast one existed.
 *
 * These assertions bind three surfaces that drift independently: the npm scripts, the CI
 * workflow, and the documentation a human or agent reads first.
 *
 * Deliberately NOT asserted: a test COUNT. `CLAUDE.md` previously claimed "3513 tests,
 * 298 suites" against ~1,290 discovered files. A count pinned here would either be wrong
 * again within a week or force an edit on every added test, so this guard pins the
 * COMMAND and lets the inventory move.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const KEY_COMMANDS = '## Key Commands';
const BASH_FENCE = '```bash';
const CLOSING_FENCE = '```';
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

const packageJson = JSON.parse(read('package.json')) as {
    scripts: Record<string, string>;
};
const claudeMd = read('CLAUDE.md');
const fullSuiteWorkflow = read('.github/workflows/full-suite-and-fingerprint.yml');

describe('whole-suite runner contract', () => {
    it('routes the default test:vitest script through the dispatcher, not a bare vitest run', () => {
        const script = packageJson.scripts['test:vitest'];
        expect(script).toBeDefined();
        expect(script).toContain('run_vitest_default.mjs');
        // A bare `vitest run` here is the regression this guard exists to prevent.
        expect(script).not.toMatch(/^vitest run\s*$/);
    });

    it('keeps an unsharded escape hatch for diagnosing cross-shard interaction', () => {
        expect(packageJson.scripts['test:vitest:serial']).toBe('vitest run');
    });

    it('runs the same shard count locally and in CI', () => {
        const balanced = packageJson.scripts['test:vitest:balanced'];
        expect(balanced).toContain('run_vitest_balanced.mjs');

        const shardMatch = /--shards=(\d+)/.exec(balanced);
        expect(shardMatch).not.toBeNull();

        // The dispatcher must request the same sharding the balanced script declares,
        // so "no arguments" and "the CI gate" cannot diverge.
        const dispatcher = read('tools/test/run_vitest_default.mjs');
        expect(dispatcher).toContain(`--shards=${shardMatch![1]}`);
    });

    it('has CI execute the balanced runner as its full-suite gate', () => {
        expect(fullSuiteWorkflow).toContain('npm run test:vitest:balanced');
    });

    it('documents a suite command that exists and is not the slow unsharded path', () => {
        // Every `npm run test:vitest*` CLAUDE.md mentions must be a real script...
        const documented = [...claudeMd.matchAll(/npm run (test:vitest[:a-z]*)/g)]
            .map((m) => m[1]!);
        expect(documented.length).toBeGreaterThan(0);
        for (const script of documented) {
            expect(Object.keys(packageJson.scripts)).toContain(script);
        }
        // ...the fast default must be documented...
        expect(documented).toContain('test:vitest');

        // ...and the Key Commands block must not offer the slow unsharded run as the way
        // to run the suite. Mentioning `test:vitest:serial` elsewhere as an escape hatch is
        // correct and deliberate; leading with it is the regression.
        const fenceStart = claudeMd.indexOf(BASH_FENCE, claudeMd.indexOf(KEY_COMMANDS));
        const keyCommands = claudeMd.slice(
            fenceStart, claudeMd.indexOf(CLOSING_FENCE, fenceStart));
        expect(fenceStart).toBeGreaterThan(0);
        expect(keyCommands).not.toContain('test:vitest:serial');
    });
});
