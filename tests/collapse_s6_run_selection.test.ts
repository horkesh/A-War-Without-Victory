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
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
    S6PairComparabilityError,
    S6_RUN_DIR_PATTERN,
    assertS6PairComparable,
    compareS6Candidates,
    resolveS6EvidenceRoot,
    runCounterOf,
    scanS6RunCandidates,
    selectS6RunDirs,
    stampedCandidate,
    type S6RunCandidate,
} from './_helpers/s6_run_selection.js';
import { compareRunProvenance, type RunProvenance } from '../src/scenario/run_provenance.js';

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

describe('S6 evidence root', () => {
    it('does not inspect ambient repository runs unless the evidence root is explicit', () => {
        const cwd = process.cwd();
        expect(resolveS6EvidenceRoot({}, cwd)).toBeNull();
        expect(resolveS6EvidenceRoot({ AWWV_S6_EVIDENCE_DIR: 'evidence/s6' }, cwd))
            .toBe(resolve(cwd, 'evidence/s6'));
    });
});

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
            pair: null,
            pairRefusal: 'no collapse-ON and no collapse-OFF 188w candidate',
            pairFailure: null,
            pairWarnings: [],
            excludedOverrideRuns: [],
            counts: { total: 0, marked: 0, unmarked: 0 },
        });
    });

    it('a missing runs/ directory scans to nothing rather than throwing', () => {
        expect(scanS6RunCandidates(join(process.cwd(), 'runs__does_not_exist'))).toEqual([]);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAIR COMPARABILITY (ledger 2026-08-17)
//
// Selection determinism was never the whole problem. The deterministic rule paired
// n222 (collapse ON, pre-R7-Phase-2 OOB) against n223 (collapse OFF, post-R7-Phase-2
// OOB): one comparison, two variables, and two readers drew opposite conclusions from
// the same 33 cells. These cases pin the three outcomes — throw, refuse, warn.
// ─────────────────────────────────────────────────────────────────────────────

const OOB_PATH = 'data/source/oob_brigades.json';
const CONTROL_PATH = 'data/source/municipalities_1990_initial_political_controllers_apr1992.json';
const EVENTS_1995 = 'data/scenarios/events/war_1995.json';
const SCENARIO_PATH = 'data/scenarios/apr1992_definitive_188w.json';

function prov(overrides: {
    oobHash?: string;
    controlHash?: string;
    eventsHash?: string;
    commit?: string | null;
    dirty?: boolean | null;
    node?: string | null;
    collapse?: boolean;
    harness?: string;
    schema?: number;
    override?: string;
    extraFiles?: ReadonlyArray<{ path: string; sha256: string | null }>;
} = {}): RunProvenance {
    const files = [
        { path: CONTROL_PATH, sha256: overrides.controlHash ?? 'c'.repeat(64) },
        { path: EVENTS_1995, sha256: overrides.eventsHash ?? 'e'.repeat(64) },
        { path: OOB_PATH, sha256: overrides.oobHash ?? 'a'.repeat(64) },
        { path: SCENARIO_PATH, sha256: 'b'.repeat(64) },
        ...(overrides.extraFiles ?? []),
    ];
    return {
        schema_version: overrides.schema ?? 2,
        harness: overrides.harness ?? 'headless',
        git_commit: overrides.commit === undefined ? '9'.repeat(40) : overrides.commit,
        git_dirty: overrides.dirty === undefined ? false : overrides.dirty,
        node_version: overrides.node === undefined ? 'v22.11.0' : overrides.node,
        collapse_enabled: overrides.collapse ?? false,
        ...(overrides.override !== undefined ? { provenance_override: overrides.override } : {}),
        consumed_inputs: { digest: 'digest-not-load-bearing', files },
    };
}

const ON_DIR = `apr1992_definitive_188w__${HASH_A}__w188_n222`;
const OFF_DIR = `apr1992_definitive_188w__${HASH_A}__w188_n223`;

/** A stamped candidate whose partition is DERIVED from the stamp, exactly as scanning does. */
function stamped(name: string, p: RunProvenance): S6RunCandidate {
    return stampedCandidate(name, p);
}

/** Both no-verdict states in one place, so a test can never confuse them. */
function expectFails(s: ReturnType<typeof selectS6RunDirs>, pattern: RegExp): void {
    expect(s.pair, 'a failing pair must not be returned').toBeNull();
    expect(s.pairRefusal, 'a FAILURE must not present as a benign refusal').toBeNull();
    expect(s.pairFailure).toMatch(pattern);
    // The verdict must be throwable at the case, and must not throw at selection time.
    expect(() => assertS6PairComparable(s)).toThrow(S6PairComparabilityError);
}

describe('S6 pair comparability', () => {
    it('selection itself NEVER throws — the verdict is returned, the CASES throw it', () => {
        // Throwing here would red both §6 suites at module load, taking the derivation pins
        // (712 universe / SET A / SET B / D2) with them. life_lessons.md:19 — a permanently-red
        // gate is worse than a missing one.
        const s = selectS6RunDirs([
            stamped(ON_DIR, prov({ collapse: true, oobHash: 'a'.repeat(64) })),
            stamped(OFF_DIR, prov({ collapse: false, oobHash: 'f'.repeat(64) })),
        ]);
        expect(s.pairFailure).not.toBeNull();
        expect(() => assertS6PairComparable(s)).toThrow(S6PairComparabilityError);
    });

    it('FAILS when a CONSUMED input differs — this is the n222/n223 confound', () => {
        const s = selectS6RunDirs([
            stamped(ON_DIR, prov({ collapse: true, oobHash: 'a'.repeat(64) })),
            stamped(OFF_DIR, prov({ collapse: false, oobHash: 'f'.repeat(64) })),
        ]);
        // The message must NAME the path. A digest-only failure cannot be audited.
        expectFails(s, new RegExp(OOB_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });

    it('FAILS when the INITIAL CONTROL file differs — the sacrosanct input', () => {
        const s = selectS6RunDirs([
            stamped(ON_DIR, prov({ collapse: true, controlHash: '1'.repeat(64) })),
            stamped(OFF_DIR, prov({ collapse: false, controlHash: '2'.repeat(64) })),
        ]);
        expectFails(s, /municipalities_1990_initial_political_controllers_apr1992\.json/);
    });

    it('FAILS when the EVENT CATALOGUE differs — enclave fall receipts are event-owned (H1.8)', () => {
        const s = selectS6RunDirs([
            stamped(ON_DIR, prov({ collapse: true, eventsHash: '3'.repeat(64) })),
            stamped(OFF_DIR, prov({ collapse: false, eventsHash: '4'.repeat(64) })),
        ]);
        expectFails(s, /events\/war_1995\.json/);
    });

    it('FAILS when a consumed path exists on only one side', () => {
        const s = selectS6RunDirs([
            stamped(ON_DIR, prov({
                collapse: true,
                extraFiles: [{ path: 'data/scenarios/officers/apr1992_officers.json', sha256: 'd'.repeat(64) }],
            })),
            stamped(OFF_DIR, prov({ collapse: false })),
        ]);
        expectFails(s, /apr1992_officers\.json/);
    });

    it('FAILS on an UNRECOGNISED harness value, and on a harness mismatch', () => {
        const s = selectS6RunDirs([
            stamped(ON_DIR, prov({ collapse: true, harness: 'desktop' })),
            stamped(OFF_DIR, prov({ collapse: false, harness: 'headless' })),
        ]);
        expectFails(s, /does not recognise/);
        expect(s.pairFailure).toMatch(/different harnesses read different input sets/);
    });

    it('★ FAILS on COMMIT DRIFT — the stamp hashes data, not engine code', () => {
        const s = selectS6RunDirs([
            stamped(ON_DIR, prov({ collapse: true, commit: '1'.repeat(40) })),
            stamped(OFF_DIR, prov({ collapse: false, commit: '2'.repeat(40) })),
        ]);
        expectFails(s, /git_commit/);
    });

    it('★ FAILS on a DIRTY tree, and on a tree whose cleanliness cannot be certified', () => {
        const dirty = selectS6RunDirs([
            stamped(ON_DIR, prov({ collapse: true, dirty: true })),
            stamped(OFF_DIR, prov({ collapse: false, dirty: false })),
        ]);
        expectFails(dirty, /DIRTY tree/);

        const uncertifiable = selectS6RunDirs([
            stamped(ON_DIR, prov({ collapse: true, dirty: null })),
            stamped(OFF_DIR, prov({ collapse: false, dirty: false })),
        ]);
        expectFails(uncertifiable, /could not certify tree cleanliness/);
    });

    it('★ FAILS on a NODE MAJOR mismatch, and WARNS on a minor difference', () => {
        const majors = selectS6RunDirs([
            stamped(ON_DIR, prov({ collapse: true, node: 'v24.13.0' })),
            stamped(OFF_DIR, prov({ collapse: false, node: 'v22.11.0' })),
        ]);
        expectFails(majors, /node major 24 vs 22/);

        const minors = selectS6RunDirs([
            stamped(ON_DIR, prov({ collapse: true, node: 'v22.11.0' })),
            stamped(OFF_DIR, prov({ collapse: false, node: 'v22.9.0' })),
        ]);
        expect(minors.pair, 'a minor bump must not block — CI runners bump minors unasked').not.toBeNull();
        expect(minors.pairWarnings.join(' ')).toMatch(/node_version v22\.11\.0 vs v22\.9\.0/);
    });

    it('★ FAILS on SCHEMA DRIFT — an older stamp is SILENT about newer inputs, and silence is not sameness', () => {
        const s = selectS6RunDirs([
            stamped(ON_DIR, prov({ collapse: true, schema: 1 })),
            stamped(OFF_DIR, prov({ collapse: false, schema: 2 })),
        ]);
        expectFails(s, /schema_version 1 vs 2/);
    });

    /**
     * ★ RULING 1 (owner, 2026-08-17) CHANGED THIS FROM FAIL TO EXCLUDE-AND-REPORT.
     *
     * "Using the hatch disqualifies the RUN" still holds — but disqualifying the run is not
     * disqualifying the GATE. Failing meant the first exploratory override run reddened four
     * differential cases for everyone until superseded, which is the permanently-red-gate
     * shape the throw was moved into the cases to avoid.
     */
    it('★ an override stamp EXCLUDES the run from candidacy and NAMES it — it does not red the gate', () => {
        const s = selectS6RunDirs([
            stamped(ON_DIR, prov({ collapse: true, override: 'measuring an uncommitted collapse tweak' })),
            stamped(OFF_DIR, prov({ collapse: false })),
        ]);
        expect(s.excludedOverrideRuns, 'named, not merely counted').toEqual([ON_DIR]);
        expect(s.on, 'an override run can never be the ON side of a §6 pair').toBeNull();
        expect(s.pair).toBeNull();
        expect(s.pairFailure, 'exclusion must not red the gate for everyone').toBeNull();
        expect(s.pairRefusal, 'and the absence must still be explained').toMatch(/no collapse-ON/);
        expect(() => assertS6PairComparable(s)).not.toThrow();
    });

    it('the compare-level override hard-fail still bites when called directly', () => {
        // Unreachable through selectS6RunDirs now that exclusion runs first (napkin 0h(C)).
        // compareRunProvenance is the general comparison and must still fail CLOSED, so that
        // removing the exclusion cannot silently re-admit override runs.
        const cmp = compareRunProvenance(
            prov({ collapse: true, override: 'measuring an uncommitted collapse tweak' }),
            prov({ collapse: false })
        );
        expect(cmp.blockingDifferences.join(' ')).toMatch(/provenance_override/);
        expect(cmp.blockingDifferences.join(' ')).toMatch(/measuring an uncommitted collapse tweak/);
    });

    it('★ FAILS on a CORRUPT stamp — a truncated run_meta is a BROKEN artifact, not a legacy one', () => {
        const s = selectS6RunDirs([
            { name: ON_DIR, marked: true, provenance: { kind: 'corrupt', detail: 'unexpected end of JSON input' } },
            stamped(OFF_DIR, prov({ collapse: false })),
        ]);
        expectFails(s, /MALFORMED/);
        expect(s.pairFailure).toContain(ON_DIR);
        expect(
            s.pairFailure,
            'a corrupt stamp must NOT be described as predating stamping — that is false about the artifact'
        ).not.toMatch(/predate run-provenance stamping/);
    });

    /**
     * REGRESSION — found by the end-to-end mutation matrix, not by reading.
     *
     * A corrupt stamp cannot be classified, so `isCollapseOn` falls back to the sidecar. A
     * corrupt collapse-ON run with no sidecar therefore lands in the OFF partition, is never
     * selected as ON, and the pair reports "no collapse-ON candidate" — a SKIP. The broken
     * artifact silently changed which runs were compared and nothing said so. Corruption is
     * now checked across the whole eligible set, BEFORE partitioning can absorb it.
     */
    it('★ a corrupt stamp cannot hide by being mis-partitioned into the OFF side', () => {
        const s = selectS6RunDirs([
            // marked:false is exactly what the sidecar fallback produces for a corrupt ON run.
            { name: ON_DIR, marked: false, provenance: { kind: 'corrupt', detail: 'unexpected end of JSON input' } },
            stamped(OFF_DIR, prov({ collapse: false })),
        ]);
        expect(s.pairRefusal, 'must NOT degrade to "no collapse-ON candidate"').toBeNull();
        expectFails(s, /MALFORMED/);
    });

    it('returns a clean pair with NO warnings when only the flag differs', () => {
        const s = selectS6RunDirs([
            stamped(ON_DIR, prov({ collapse: true })),
            stamped(OFF_DIR, prov({ collapse: false })),
        ]);
        expect(s.pair).toEqual({ on: ON_DIR, off: OFF_DIR });
        expect(s.pairWarnings).toEqual([]);
        expect(s.pairRefusal).toBeNull();
        expect(s.pairFailure).toBeNull();
        expect(() => assertS6PairComparable(s)).not.toThrow();
    });

    it('REFUSES (skip, not fail) a pair from unstamped legacy runs, naming them', () => {
        const s = selectS6RunDirs([c(ON_DIR, true), c(OFF_DIR, false)]);
        expect(s.pair).toBeNull();
        expect(s.pairFailure, 'legacy is benign — it must NOT be a failure').toBeNull();
        expect(s.pairRefusal).toMatch(/predate run-provenance stamping/);
        expect(s.pairRefusal).toContain(ON_DIR);
        expect(s.pairRefusal).toContain(OFF_DIR);
        expect(() => assertS6PairComparable(s)).not.toThrow();
        // The single-artifact partition winners are untouched: the sentinel and G2-A still run.
        expect(s.on).toBe(ON_DIR);
        expect(s.off).toBe(OFF_DIR);
        expect(s.any, 'n223 outranks n222 on the counter').toBe(OFF_DIR);
    });

    it('REFUSES when only ONE side is stamped — half a provenance proves nothing', () => {
        const s = selectS6RunDirs([stamped(ON_DIR, prov({ collapse: true })), c(OFF_DIR, false)]);
        expect(s.pair).toBeNull();
        expect(s.pairFailure).toBeNull();
        expect(s.pairRefusal).toContain(OFF_DIR);
        expect(s.pairRefusal).not.toContain(ON_DIR);
    });

    it('REFUSES when a side is simply missing', () => {
        const onlyOff = selectS6RunDirs([stamped(OFF_DIR, prov())]);
        expect(onlyOff.pair).toBeNull();
        expect(onlyOff.pairFailure).toBeNull();
        expect(onlyOff.pairRefusal).toMatch(/no collapse-ON/);

        const onlyOn = selectS6RunDirs([stamped(ON_DIR, prov({ collapse: true }))]);
        expect(onlyOn.pair).toBeNull();
        expect(onlyOn.pairRefusal).toMatch(/no collapse-OFF/);
    });

    it('partitions on the STAMP, not the forgeable sidecar', () => {
        // `stampedCandidate` derives `marked` from provenance.collapse_enabled — the same rule
        // `scanS6RunCandidates` applies. Two sources of truth for one fact is the defect; the
        // sidecar is the one anyone can copy into a run dir.
        expect(stampedCandidate('x', prov({ collapse: true })).marked).toBe(true);
        expect(stampedCandidate('x', prov({ collapse: false })).marked).toBe(false);
    });

    it('compareRunProvenance keeps the collapse flag OUT of the blocking set', () => {
        // The flag is the one variable a §6 pair is meant to isolate; blocking on it would
        // reject every valid pair.
        const cmp = compareRunProvenance(prov({ collapse: true }), prov({ collapse: false }));
        expect(cmp.blockingDifferences).toEqual([]);
        expect(cmp.collapseFlagDiffers).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ★ THE DISK LAYER — scanS6RunCandidates → readRunProvenance → isCollapseOn
//
// Everything above hand-supplies `marked` on a synthetic candidate, so the code that
// DERIVES `marked` from a run directory had zero coverage. Two mutations survived the whole
// suite at 78/78 green:
//
//   B — corrupt short-circuits to `false`; the sidecar is never consulted.
//   C — the sidecar is checked FIRST, restoring it as authoritative.
//
// Mutation C is precisely the regression the "ONE SOURCE OF TRUTH" rule exists to prevent,
// and it was undetected. The 14-row matrix that found the corrupt-partition bug lived in a
// scratch file and was never committed — a transcript, not a net. These tests write REAL
// run directories to a temp dir and drive the real scan, so the forged-sidecar case is an
// assertion rather than a paragraph.
//
// Temp dirs only — never `runs/`. `S6_RUN_DIR_PATTERN` matches on directory NAME, so any
// fixture written into `runs/` would become a live §6 candidate for every other suite.
// ─────────────────────────────────────────────────────────────────────────────
describe('S6 disk layer: partition is derived from the STAMP, never the sidecar', () => {
    function writeRun(
        root: string,
        name: string,
        opts: { meta?: unknown; rawMeta?: string; sidecar?: boolean; finalSave?: boolean }
    ): void {
        const dir = join(root, name);
        mkdirSync(dir, { recursive: true });
        if (opts.finalSave !== false) writeFileSync(join(dir, 'final_save.json'), '{}', 'utf8');
        if (opts.sidecar) {
            writeFileSync(join(dir, 'collapse_enabled.json'), '{"collapse_enabled":true}', 'utf8');
        }
        if (opts.rawMeta !== undefined) {
            writeFileSync(join(dir, 'run_meta.json'), opts.rawMeta, 'utf8');
        } else if (opts.meta !== undefined) {
            writeFileSync(join(dir, 'run_meta.json'), JSON.stringify(opts.meta, null, 2), 'utf8');
        }
    }

    function tempRuns(): string {
        return mkdtempSync(join(tmpdir(), 'awwv-s6-runs-'));
    }

    it('★ KILLS MUTATION C — a FORGED sidecar cannot override a stamp that says collapse-OFF', () => {
        // The sidecar is a file anyone can copy into a run dir. If partitioning consulted it
        // first, this run would be classified collapse-ON against its own stamp.
        const root = tempRuns();
        writeRun(root, ON_DIR, { meta: { provenance: prov({ collapse: false }) }, sidecar: true });
        const [candidate] = scanS6RunCandidates(root);
        expect(candidate.name).toBe(ON_DIR);
        expect(
            candidate.marked,
            'stamp says collapse_enabled=false; a forged sidecar must NOT flip the partition'
        ).toBe(false);
    });

    it('a stamp saying collapse-ON is honoured even with NO sidecar present', () => {
        const root = tempRuns();
        writeRun(root, ON_DIR, { meta: { provenance: prov({ collapse: true }) } });
        const [candidate] = scanS6RunCandidates(root);
        expect(candidate.marked, 'the stamp alone is authoritative').toBe(true);
    });

    it('★ KILLS MUTATION B — a CORRUPT stamp still consults the legacy sidecar, and still FAILS', () => {
        // Corrupt must not short-circuit to `false`: the sidecar is the only classification
        // signal left, and the run must still be reported as broken rather than absorbed.
        const root = tempRuns();
        writeRun(root, ON_DIR, { rawMeta: '{"run_id":"x","provenance":{"consumed_inp', sidecar: true });
        writeRun(root, OFF_DIR, { meta: { provenance: prov({ collapse: false }) } });
        const candidates = scanS6RunCandidates(root);
        const corrupt = candidates.find(c => c.name === ON_DIR);
        expect(corrupt?.provenance?.kind, 'a truncated run_meta reads CORRUPT, not absent').toBe('corrupt');
        expect(corrupt?.marked, 'with the stamp unreadable the sidecar is the fallback').toBe(true);
        const s = selectS6RunDirs(candidates);
        expectFails(s, /MALFORMED/);
    });

    it('an UNSTAMPED legacy run falls back to the sidecar and forms no pair', () => {
        const root = tempRuns();
        writeRun(root, ON_DIR, { meta: { run_id: ON_DIR }, sidecar: true });
        writeRun(root, OFF_DIR, { meta: { run_id: OFF_DIR } });
        const candidates = scanS6RunCandidates(root);
        expect(candidates.find(c => c.name === ON_DIR)?.marked).toBe(true);
        expect(candidates.find(c => c.name === OFF_DIR)?.marked).toBe(false);
        const s = selectS6RunDirs(candidates);
        expect(s.pair).toBeNull();
        expect(s.pairFailure).toBeNull();
        expect(s.pairRefusal).toMatch(/predate run-provenance stamping/);
    });

    it('a run dir with no final_save.json is not a candidate at all', () => {
        const root = tempRuns();
        writeRun(root, ON_DIR, { meta: { provenance: prov({ collapse: true }) }, finalSave: false });
        expect(scanS6RunCandidates(root)).toEqual([]);
    });

    it('the whole disk path produces a CLEAN PAIR when only the flag differs', () => {
        // Positive control: without this, every case above could be passing for the wrong
        // reason (a scan that returns nothing satisfies most negative assertions).
        const root = tempRuns();
        writeRun(root, ON_DIR, { meta: { provenance: prov({ collapse: true }) } });
        writeRun(root, OFF_DIR, { meta: { provenance: prov({ collapse: false }) } });
        const s = selectS6RunDirs(scanS6RunCandidates(root));
        expect(s.pair).toEqual({ on: ON_DIR, off: OFF_DIR });
        expect(s.pairFailure).toBeNull();
        expect(s.counts).toEqual({ total: 2, marked: 1, unmarked: 1 });
    });

    it('★ an OVERRIDE-stamped run is EXCLUDED from candidacy and NAMED (ruling 1)', () => {
        const root = tempRuns();
        writeRun(root, ON_DIR, {
            meta: { provenance: prov({ collapse: true, override: 'exploratory, tree was dirty' }) },
        });
        writeRun(root, OFF_DIR, { meta: { provenance: prov({ collapse: false }) } });
        const s = selectS6RunDirs(scanS6RunCandidates(root));
        expect(s.excludedOverrideRuns, 'excluded runs must be NAMED, not just counted').toEqual([ON_DIR]);
        expect(s.on, 'the override run must not be selectable as the ON side').toBeNull();
        // It reds nothing — that is the point of excluding rather than failing — but the pair
        // is refused, so no verdict can be drawn either.
        expect(s.pairFailure).toBeNull();
        expect(s.pairRefusal).toMatch(/no collapse-ON/);
        expect(s.counts.total, 'the excluded run is out of the candidate count').toBe(1);
    });

    it('an override run does not shadow a clean ON run of lower counter', () => {
        // The footgun exclusion exists to defuse: highest-counter-wins would otherwise let one
        // exploratory run mask a perfectly good measurement.
        const root = tempRuns();
        const CLEAN_ON = `apr1992_definitive_188w__${HASH_A}__w188_n220`;
        writeRun(root, ON_DIR, {
            meta: { provenance: prov({ collapse: true, override: 'exploratory, tree was dirty' }) },
        });
        writeRun(root, CLEAN_ON, { meta: { provenance: prov({ collapse: true }) } });
        writeRun(root, OFF_DIR, { meta: { provenance: prov({ collapse: false }) } });
        const s = selectS6RunDirs(scanS6RunCandidates(root));
        expect(s.excludedOverrideRuns).toEqual([ON_DIR]);
        expect(s.pair).toEqual({ on: CLEAN_ON, off: OFF_DIR });
    });
});

/**
 * ★ SOURCE PIN — the ONLY instrument available for this seam, and here is why.
 *
 * `assertS6PairComparable` can only throw when `runs/` holds a bad STAMPED pair. Every 188w
 * artifact in `runs/` today is unstamped legacy, so `pairFailure` is null and the call is a
 * no-op. MEASURED: deleting all four call sites left both §6 suites 24/24 GREEN. That is
 * napkin 0h(C) — "the guard is at the right place" is not "the guard is reached" — and it is
 * the ordering hazard that shape always carries: someone deletes the call as dead, and the
 * net is silently gone by the time a stamped pair finally exists.
 *
 * A behavioural test is impossible by construction (the suites read the real `runs/` at
 * module scope, and writing a fixture there would make it a §6 candidate). So the predicate
 * CALL is pinned in source, with the reason in the failure message — pins get removed by
 * people who do not know why they exist.
 *
 * What each instrument buys, because they are not redundant:
 *  - the behavioural cases above prove the FUNCTION throws on all ten blocking conditions;
 *  - this pin proves the CALLERS are wired to it while that wiring cannot yet fire.
 */
describe('the pair-comparability guard is WIRED into every differential case', () => {
    const SUITES: ReadonlyArray<{ file: string; expectedCalls: number; cases: readonly string[] }> = [
        {
            file: 'collapse_phase1_g2_section6_invariant.test.ts',
            expectedCalls: 1,
            cases: ['G2-B'],
        },
        {
            file: 'collapse_s6_criteria_4_7_enclave_outcome.test.ts',
            expectedCalls: 3,
            cases: ['C4-keyspace-identity', 'C7-rim-regression', 'C7-teocak-corridor'],
        },
    ];

    for (const suite of SUITES) {
        it(`${suite.file} calls assertS6PairComparable once per differential case, UNCONDITIONALLY`, () => {
            const src = codeOnly(readFileSync(join(process.cwd(), 'tests', suite.file), 'utf8'));
            /*
             * ★ ANCHORED TO A BARE STATEMENT LINE, and that is the whole point.
             *
             * The permissive form `/assertS6PairComparable\s*\(\s*selection\s*\)/` matched a
             * loose call anywhere on the line, so this bypass passed 53/53:
             *
             *     if (selection.pair !== null) assertS6PairComparable(selection);
             *
             * That guard is INERT BY CONSTRUCTION — `computeS6Pair` returns `pair: null` on
             * every path that sets `failure`, so `pairFailure !== null` implies
             * `pair === null`, and the condition is false EXACTLY when the guard matters.
             * Worse than the plain deletion it replaces, because wrapping a call in a
             * null-check READS AS A BUG FIX to the next engineer.
             *
             * `^[ \t]*…;[ \t]*$` under /m admits only a bare statement on its own line, which
             * closes the whole conditional-wrapping family in one character class. Measured
             * against that bypass: permissive → 3 matches (passes), anchored → 0 (fails).
             * `codeOnly()` has already stripped comments, so a trailing comment is fine.
             */
            const calls = src.match(/^[ \t]*assertS6PairComparable\(selection\);[ \t]*$/gm) ?? [];
            expect(
                calls.length,
                `${suite.file} must call assertS6PairComparable(selection) in each of its `
                + `${suite.expectedCalls} pair-dependent case(s) [${suite.cases.join(', ')}].\n`
                + 'DO NOT DELETE THESE CALLS AS DEAD. They cannot throw today only because every '
                + '188w artifact in runs/ predates provenance stamping, so no bad STAMPED pair can '
                + 'exist yet. The moment a stamped pair does exist, this is the only thing standing '
                + 'between a confounded ON/OFF comparison and a §6 verdict drawn from it — the '
                + 'n222/n223 defect (ledger 2026-08-17). Removing them restores that defect silently.\n'
                + 'AND DO NOT WRAP THEM IN `if (selection.pair !== null)` — that reads as a tidy-up '
                + 'and is inert by construction, because a failing pair is always a null pair.'
            ).toBe(suite.expectedCalls);
        });
    }

    it('the anchored pin REJECTS a conditionally-wrapped call (the bypass that reads as a fix)', () => {
        // Non-vacuity for the pin itself: prove the anchor discriminates, rather than trusting
        // that it does. The permissive form this replaced matched the wrapped call happily.
        const wrapped = '        if (selection.pair !== null) assertS6PairComparable(selection);';
        const bare = '            assertS6PairComparable(selection);';
        const anchored = /^[ \t]*assertS6PairComparable\(selection\);[ \t]*$/gm;
        expect(wrapped.match(anchored), 'a wrapped call must NOT satisfy the pin').toBeNull();
        expect(bare.match(anchored), 'a bare statement must satisfy the pin').toHaveLength(1);
        expect(
            wrapped.match(/assertS6PairComparable\s*\(\s*selection\s*\)/g),
            'and the permissive form this replaced did accept it — which is why it changed'
        ).toHaveLength(1);
    });

    it('the differential cases read selection.pair, never selection.on/selection.off', () => {
        // The partition winners are what paired a pre-OOB-change run against a post-change one.
        for (const suite of SUITES) {
            const src = codeOnly(readFileSync(join(process.cwd(), 'tests', suite.file), 'utf8'));
            expect(
                /selection\.pair\.(on|off)/.test(src),
                `${suite.file} must derive its differential dirs from selection.pair`
            ).toBe(true);
        }
    });
});

describe('the §6 suite itself carries no filesystem-metadata dependence', () => {
    const s6Src = codeOnly(readFileSync(
        join(process.cwd(), 'tests', 'collapse_phase1_g2_section6_invariant.test.ts'),
        'utf8'
    ));

    it('does not order artifacts by mtime', () => {
        // The BARE token, not just `mtimeMs`. A re-pick via node:fs/promises `stat()` reading
        // `.mtime` contains neither `mtimeMs` nor `statSync` and evaded the narrower ban — the
        // review guard sweep derived that bypass and it was then demonstrated live. Comments are
        // stripped by codeOnly() above, so the prose explaining the retired rule does not trip it.
        expect(/mtime/.test(s6Src), 'no mtime read of any kind may appear in the §6 suite').toBe(false);
        expect(/statSync/.test(s6Src), 'statSync must not appear in the §6 suite').toBe(false);
        expect(/fs\/promises/.test(s6Src), 'the §6 suite needs no async fs — a stat() re-pick is the bypass').toBe(false);
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
