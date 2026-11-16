/**
 * `meta.peace_war_start_control_path` must not depend on where the repo is checked out.
 * It used to hold an absolute path, so the final state hash of a peace-start scenario
 * (sep1991_to_dayton) differed between two checkouts of the same commit.
 */
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toRepoRelativePath } from '../src/scenario/scenario_runner.js';
import { resolveInitControlPath } from '../src/scenario/scenario_loader.js';

describe('repo-relative control path in GameState', () => {
    const fileKey = 'apr1992';
    const rel = 'data/source/municipalities_1990_initial_political_controllers_apr1992.json';

    it('the same key stores the same string from two different checkouts', () => {
        const a = resolve('/checkouts/one/AWWV');
        const b = resolve('/elsewhere/two/batch-b3');
        expect(toRepoRelativePath(resolveInitControlPath(fileKey, a), a)).toBe(rel);
        expect(toRepoRelativePath(resolveInitControlPath(fileKey, b), b)).toBe(rel);
    });

    it('the stored value is forward-slashed and not absolute', () => {
        const base = resolve('/x/y');
        const stored = toRepoRelativePath(resolveInitControlPath(fileKey, base), base);
        expect(stored.includes('\\')).toBe(false);
        expect(/^[A-Za-z]:|^\//.test(stored)).toBe(false);
    });

    it('the read site resolves the stored value against baseDir, and an old absolute value still resolves to itself', () => {
        const base = resolve('/x/y');
        expect(resolve(base, rel)).toBe(resolve(base, rel));
        const legacyAbsolute = resolve('/old/checkout', rel);
        expect(resolve(base, legacyAbsolute)).toBe(legacyAbsolute);
    });
});
