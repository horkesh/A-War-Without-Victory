/**
 * §6 G2 artifact-selection determinism (RC defect 8, part i).
 *
 * The §6 invariant suite used to order its candidate 188w run dirs by filesystem MTIME.
 * mtime is a property of the checkout, not of the run: a clone, a `touch`, a backup
 * restore or a different machine silently changes WHICH artifact §6 is asserted against.
 * These tests pin the replacement rule — name-only, total, order-independent — and pin
 * that the §6 suite itself no longer touches fs metadata.
 *
 * Determinism: pure functions over string lists, plus one source read.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    S6_RUN_DIR_PATTERN,
    compareS6Candidates,
    runCounterOf,
    scanS6RunCandidates,
    selectS6RunDirs,
    type S6RunCandidate,
} from './_helpers/s6_run_selection.js';

const HASH_A = '9e902ad68783fbe7';
const HASH_B = '63a3a0858050b865';

function c(name: string, marked = false): S6RunCandidate {
    return { name, marked };
}

/** Deterministic reorderings (rotations, and each rotation reversed) — no RNG. */
function reorderings<T>(items: readonly T[]): Array<{ label: string; items: T[] }> {
    const out: Array<{ label: string; items: T[] }> = [];
    for (let r = 0; r < items.length; r++) {
        const rotated = [...items.slice(r), ...items.slice(0, r)];
        out.push({ label: `rot${r}`, items: rotated });
        out.push({ label: `rot${r}-rev`, items: [...rotated].reverse() });
    }
    return out;
}

/**
 * Source with comments removed — a structural pin must match CODE, not the prose that
 * explains the retired rule. (This file's own pins tripped on the §6 header's
 * description of the mtime defect before the strip was added.)
 */
function codeOnly(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('S6 run-dir pattern', () => {
    it('accepts full-length 188w run dirs', () => {
        expect(S6_RUN_DIR_PATTERN.test(`apr1992_definitive_188w__${HASH_A}__w188_n220`)).toBe(true);
        expect(S6_RUN_DIR_PATTERN.test(`apr1992_definitive_188w__${HASH_A}__w188`)).toBe(true);
    });

    it('REJECTS truncated runs of the same scenario', () => {
        // These exist in runs/ today. Srebrenica has not fallen at week 5 — a §6 assertion
        // set pointed at one of them must fail, so they can never be candidates.
        for (const truncated of ['__w5_n180', '__w43_n208', '__w60_n178']) {
            expect(
                S6_RUN_DIR_PATTERN.test(`apr1992_definitive_188w__${HASH_A}${truncated}`),
                truncated
            ).toBe(false);
        }
    });

    it('rejects unrelated run dirs', () => {
        expect(S6_RUN_DIR_PATTERN.test('apr1992_definitive_40w__deadbeef__w40_n3')).toBe(false);
        expect(S6_RUN_DIR_PATTERN.test('_canon188_a_20260717.log')).toBe(false);
    });

    it('reads the _n<counter> suffix, -1 when absent', () => {
        expect(runCounterOf(`apr1992_definitive_188w__${HASH_A}__w188_n220`)).toBe(220);
        expect(runCounterOf(`apr1992_definitive_188w__${HASH_A}__w188_n7`)).toBe(7);
        expect(runCounterOf(`apr1992_definitive_188w__${HASH_A}__w188`)).toBe(-1);
    });
});

describe('S6 selection ordering', () => {
    it('orders by counter DESCENDING, not lexicographically', () => {
        // The bug a plain string sort would hide: 'n7' > 'n220' lexicographically.
        const sorted = [
            c(`apr1992_definitive_188w__${HASH_A}__w188_n7`),
            c(`apr1992_definitive_188w__${HASH_A}__w188_n220`),
            c(`apr1992_definitive_188w__${HASH_A}__w188_n99`),
        ].sort(compareS6Candidates).map(x => runCounterOf(x.name));
        expect(sorted).toEqual([220, 99, 7]);
    });

    it('breaks counter ties on the name (strictCompare), giving a total order', () => {
        const a = c(`apr1992_definitive_188w__${HASH_A}__w188`);
        const b = c(`apr1992_definitive_188w__${HASH_B}__w188`);
        expect(compareS6Candidates(a, b)).toBeGreaterThan(0); // '9e...' > '63...'
        expect(compareS6Candidates(b, a)).toBeLessThan(0);
        expect(compareS6Candidates(a, a)).toBe(0);
    });

    it('is INDEPENDENT of input order (readdir order must not matter)', () => {
        const candidates = [
            c(`apr1992_definitive_188w__${HASH_B}__w188_n93`),
            c(`apr1992_definitive_188w__${HASH_A}__w188_n220`, true),
            c(`apr1992_definitive_188w__${HASH_B}__w188_n150`),
            c(`apr1992_definitive_188w__${HASH_A}__w188_n205`, true),
            c(`apr1992_definitive_188w__${HASH_B}__w5_n180`),
            c(`apr1992_definitive_188w__${HASH_A}__w188_n219`),
        ];
        const expected = selectS6RunDirs(candidates);
        for (const { label, items } of reorderings(candidates)) {
            expect(selectS6RunDirs(items), label).toEqual(expected);
        }
    });
});

describe('S6 selection partitioning', () => {
    const candidates = [
        c(`apr1992_definitive_188w__${HASH_A}__w188_n220`, true),
        c(`apr1992_definitive_188w__${HASH_A}__w188_n205`, true),
        c(`apr1992_definitive_188w__${HASH_B}__w188_n219`),
        c(`apr1992_definitive_188w__${HASH_B}__w188_n93`),
        c(`apr1992_definitive_188w__${HASH_B}__w60_n178`), // truncated — never a candidate
    ];

    it('ON is the highest-counter MARKED dir; OFF is the highest-counter UNMARKED dir', () => {
        const s = selectS6RunDirs(candidates);
        expect(s.on).toBe(`apr1992_definitive_188w__${HASH_A}__w188_n220`);
        expect(s.off).toBe(`apr1992_definitive_188w__${HASH_B}__w188_n219`);
        expect(s.any).toBe(`apr1992_definitive_188w__${HASH_A}__w188_n220`);
        expect(s.counts).toEqual({ total: 4, marked: 2, unmarked: 2 });
    });

    it('ON is null when nothing is marked — the state runs/ is in today', () => {
        const s = selectS6RunDirs(candidates.map(x => c(x.name)));
        expect(s.on).toBeNull();
        // With the markers gone, the ex-ON dir is simply the highest-counter OFF dir.
        expect(s.off).toBe(`apr1992_definitive_188w__${HASH_A}__w188_n220`);
        expect(s.any).toBe(`apr1992_definitive_188w__${HASH_A}__w188_n220`);
        expect(s.counts).toEqual({ total: 4, marked: 0, unmarked: 4 });
    });

    it('everything is null on an empty candidate set', () => {
        expect(selectS6RunDirs([])).toEqual({
            on: null,
            off: null,
            any: null,
            counts: { total: 0, marked: 0, unmarked: 0 },
        });
    });

    it('a missing runs/ directory scans to nothing rather than throwing', () => {
        expect(scanS6RunCandidates(join(process.cwd(), 'runs__does_not_exist'))).toEqual([]);
    });
});

describe('the §6 suite itself carries no filesystem-metadata dependence', () => {
    const s6Src = codeOnly(readFileSync(
        join(process.cwd(), 'tests', 'collapse_phase1_g2_section6_invariant.test.ts'),
        'utf8'
    ));

    it('does not order artifacts by mtime', () => {
        expect(/mtimeMs/.test(s6Src), 'mtimeMs must not appear in the §6 suite').toBe(false);
        expect(/statSync/.test(s6Src), 'statSync must not appear in the §6 suite').toBe(false);
    });

    it('selects through the deterministic helper', () => {
        expect(s6Src.includes('selectS6RunDirs(scanS6RunCandidates(')).toBe(true);
    });

    it('does not silently skip its §6 cases', () => {
        // it.skipIf / it.runIf remove a case from the report entirely — the false green.
        expect(/it\.skipIf/.test(s6Src), 'it.skipIf must not gate a §6 case').toBe(false);
        expect(/it\.runIf/.test(s6Src), 'it.runIf must not gate a §6 case').toBe(false);
    });
});
