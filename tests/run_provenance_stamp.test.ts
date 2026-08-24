/**
 * Run-provenance stamp contract (ledger 2026-08-17).
 *
 * The defect this guards: `run_meta.json` recorded no commit, no data hash and no flag
 * state, and the run-dir hash covers the SCENARIO DEFINITION FILE, which an OOB edit never
 * touches — so two runs on different armies carried the same hash. These cases pin the four
 * constraints that make the replacement stamp mean something, each of which is a defect this
 * repo has already shipped once:
 *
 *  1. the PATH LIST is recorded, not just a digest (an unnamed digest cannot be audited);
 *  2. CONTENT BYTES are hashed, never stat metadata (mtime in a fingerprint, task #13);
 *  3. CRLF is normalized first (else the same content hashes differently per machine);
 *  4. the list is `strictCompare`-ordered (determinism is sacred).
 *
 * ★ And the negative pin: `data/derived/startup/apr_1992_initial_save.json` must NOT be in
 * the headless set. It is 52w-pinned with no headless consumer and is byte-identical across
 * the exact pair that caused the incident — including it would rebuild the bug inside its
 * own fix while looking like coverage.
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
    DESKTOP_EXTRA_CONSUMED_INPUTS,
    HEADLESS_FIXED_CONSUMED_INPUTS,
    RUN_PROVENANCE_SCHEMA_VERSION,
    PROVENANCE_OVERRIDE_ENV_VAR,
    buildRunProvenance,
    compareRunProvenance,
    deriveScenarioConsumedInputs,
    nodeMajorOf,
    readProvenanceOverride,
    readRunProvenanceFrom,
    toRepoRelativePath,
} from '../src/scenario/run_provenance.js';
import { EVENT_FILES } from '../src/sim/events/event_loader.js';
import { strictCompare } from '../src/state/validateGameState.js';

const DERIVED_STARTUP_SNAPSHOT = 'data/derived/startup/apr_1992_initial_save.json';
const HEADLESS_CONSUMED_INPUTS = HEADLESS_FIXED_CONSUMED_INPUTS;

function seedTree(files: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), 'awwv-prov-'));
    for (const [relative, content] of Object.entries(files)) {
        const abs = join(root, relative);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, content, 'utf8');
    }
    return root;
}

/** Every headless input, the event catalogue and a scenario file, each with distinct content. */
function seedFullTree(overrides: Record<string, string> = {}): { root: string; scenarioPath: string } {
    const files: Record<string, string> = {};
    for (const p of HEADLESS_CONSUMED_INPUTS) files[p] = `{"stub":"${p}"}\n`;
    for (const name of EVENT_FILES) files[`data/scenarios/events/${name}`] = `{"stub":"${name}"}\n`;
    files['data/scenarios/apr1992_definitive_188w.json'] = '{"scenario_id":"apr1992_definitive_188w"}\n';
    Object.assign(files, overrides);
    const root = seedTree(files);
    return { root, scenarioPath: join(root, 'data/scenarios/apr1992_definitive_188w.json') };
}

describe('the consumed set is the set a headless run actually reads', () => {
    it('★ EXCLUDES the derived startup snapshot — it has no headless consumer', () => {
        expect(
            HEADLESS_CONSUMED_INPUTS.includes(DERIVED_STARTUP_SNAPSHOT),
            'apr_1992_initial_save.json is 52w-pinned and desktop/UI-only. It is byte-identical '
            + 'across the n222/n223 pair, so hashing it here would MATCH while the armies differed '
            + '— coverage-shaped, not coverage.'
        ).toBe(false);
        // It belongs to the desktop set, which is why `harness` is recorded at all.
        expect(DESKTOP_EXTRA_CONSUMED_INPUTS).toContain(DERIVED_STARTUP_SNAPSHOT);
    });

    it('covers the OOB files an edit like R7 Phase 2 touches', () => {
        // The n222/n223 confound was three deleted HVO brigades. If oob_brigades.json were not
        // hashed, the whole stamp would be theatre.
        expect(HEADLESS_CONSUMED_INPUTS).toContain('data/source/oob_brigades.json');
        expect(HEADLESS_CONSUMED_INPUTS).toContain('data/source/oob_corps.json');
    });

    it('is strictCompare-ordered and free of duplicates', () => {
        expect([...HEADLESS_CONSUMED_INPUTS].sort(strictCompare)).toEqual([...HEADLESS_CONSUMED_INPUTS]);
        expect(new Set(HEADLESS_CONSUMED_INPUTS).size).toBe(HEADLESS_CONSUMED_INPUTS.length);
    });

    /**
     * ★ THE BLOCKING GAP THE FIRST VERSION SHIPPED. The scenario definition file merely NAMES
     * these by key, so hashing it alone left them unhashed — and two runs differing in any of
     * them produced an IDENTICAL digest on different armies, which is napkin 0p rebuilt one
     * layer inward. Worst where it matters most: initial control is the most
     * calibration-moving file in the repo, and enclave fall receipts are event-owned under
     * canon H1.8, so a §6 verdict was being licensed with `war_1995.json` unrecorded.
     */
    it('★ derives the SCENARIO-DECLARED inputs the definition file only names', () => {
        // Real cwd as baseDir: resolveInitControlPath goes through node's `resolve`, which on
        // Windows turns a POSIX-looking '/repo' into a drive-rooted path the relativiser cannot
        // strip. That is a fixture artifact, not a defect, but it makes the test lie.
        const base = process.cwd();
        const derived = deriveScenarioConsumedInputs({
            baseDir: base,
            scenarioPath: join(base, 'data/scenarios/apr1992_definitive_188w.json'),
            initControl: 'apr1992',
            initFormations: 'apr1992',
            warTimeline: 'apr1992',
            initOfficers: 'apr1992',
        });
        expect(derived).toContain('data/source/municipalities_1990_initial_political_controllers_apr1992.json');
        expect(derived).toContain('data/scenarios/initial_formations/initial_formations_apr1992.json');
        expect(derived).toContain('data/scenarios/timelines/apr1992.json');
        expect(derived).toContain('data/scenarios/officers/apr1992_officers.json');
        expect(derived).toContain('data/scenarios/apr1992_definitive_188w.json');
    });

    it('★ derives the WHOLE event catalogue from the loader\'s own EVENT_FILES', () => {
        const derived = deriveScenarioConsumedInputs({
            baseDir: '/repo',
            scenarioPath: '/repo/data/scenarios/apr1992_definitive_188w.json',
        });
        // Imported, never copied: a second list here would be a second source of truth, which
        // is the defect class this whole module exists to remove.
        expect(EVENT_FILES.length).toBeGreaterThan(0);
        for (const name of EVENT_FILES) {
            expect(derived, `${name} must be hashed`).toContain(`data/scenarios/events/${name}`);
        }
        expect(derived).toContain('data/scenarios/events/war_1995.json');
    });

    it('the real 188w scenario resolves its declared keys to files that EXIST', async () => {
        // Guards the derivation against silent drift: if a resolver or template string changes,
        // the rows become ABSENT and this catches it before a §6 pair is built on empty hashes.
        const scenario = JSON.parse(
            await import('node:fs/promises').then(fs =>
                fs.readFile(join(process.cwd(), 'data/scenarios/apr1992_definitive_188w.json'), 'utf8'))
        ) as Record<string, string>;
        const derived = deriveScenarioConsumedInputs({
            baseDir: process.cwd(),
            scenarioPath: join(process.cwd(), 'data/scenarios/apr1992_definitive_188w.json'),
            initControl: scenario.init_control,
            initFormations: scenario.init_formations,
            warTimeline: scenario.war_timeline,
            initOfficers: scenario.init_officers,
        });
        const fs = await import('node:fs');
        const missing = derived.filter(p => !fs.existsSync(join(process.cwd(), p)));
        expect(missing, 'every derived consumed path must resolve to a real file').toEqual([]);
        expect(derived.length, 'scenario + 4 declared keys + the event catalogue')
            .toBe(5 + EVENT_FILES.length);
    });

    /**
     * ★ THE ROW COUNT IS PINNED AGAINST THE REAL SCENARIO, NOT A REMEMBERED NUMBER.
     *
     * An earlier draft of the module header said the 188w stamp was 20 rows. It is 24. A
     * completeness claim must never ride on a count nobody re-derived — that is the same
     * failure as the digest-over-an-unnamed-set this module was written to remove. This pin
     * recomputes it from the live fixed set plus the live derivation, so adding an input
     * turns it RED and forces the header to be updated in the same change.
     */
    it('★ the 188w stamp is exactly 31 named rows, derived not remembered', async () => {
        const fsp = await import('node:fs/promises');
        const { checkpointsForScenario } =
            await import('../src/scenario/scenario_runner.js');
        const scenarioPath = join(process.cwd(), 'data/scenarios/apr1992_definitive_188w.json');
        const scenario = JSON.parse(await fsp.readFile(scenarioPath, 'utf8')) as Record<string, string>;
        // Derive the painted keys exactly as the runner does — literals here would let the
        // stamp and the loader drift, which is the whole failure these rows exist to prevent.
        const scenarioObj = scenario as unknown as Parameters<typeof checkpointsForScenario>[0];
        const p = await buildRunProvenance({
            baseDir: process.cwd(),
            scenarioPath,
            initControl: scenario.init_control,
            initFormations: scenario.init_formations,
            warTimeline: scenario.war_timeline,
            initOfficers: scenario.init_officers,
            paintedReferenceKeys: checkpointsForScenario(scenarioObj).map((c) => c.key),
            harness: 'headless',
            collapseEnabled: false,
        });
        const paths = p.consumed_inputs.files.map(f => f.path);
        expect(paths.length, `31 = ${HEADLESS_CONSUMED_INPUTS.length} fixed + scenario + 4 declared + ${EVENT_FILES.length} events + 4 painted`)
            .toBe(31);
        // Cross-check the arithmetic rather than the literal, so the two cannot drift apart.
        expect(paths.length).toBe(HEADLESS_CONSUMED_INPUTS.length + 5 + EVENT_FILES.length + 4);
        // ★ EVERY SCORING REFERENCE is stamped, not just the terminal one. A 188w run scores
        // at all four historical checkpoints, so it opens all four painted files. Stamping
        // only oct1995 would leave three consumed files unhashed and reopen exactly the hole
        // this row closes: identical digest, identical state hash, a moved intermediate score.
        for (const key of ['jan1993', 'apr1994', 'apr1995', 'oct1995']) {
            expect(paths, `${key} is scored by a 188w run, so it must be stamped`)
                .toContain(`data/source/calibration/painted_control_${key}.json`);
        }
        expect(paths.filter(x => x.includes('painted_control_')), 'one row per checkpoint')
            .toHaveLength(4);
        expect(new Set(paths).size, 'no duplicate rows').toBe(paths.length);
        expect(paths).toEqual([...paths].sort(strictCompare));
        // Every row resolved to real content — an ABSENT row would make the stamp match
        // vacuously on that input across two runs.
        expect(p.consumed_inputs.files.filter(f => f.sha256 === null)).toEqual([]);
        // The three cwd-relative reads a baseDir-only grep does not find.
        expect(paths).toContain('data/derived/municipality_political_controllers_1990.json');
        expect(paths).toContain('data/source/settlement_political_controllers_overrides.json');
        expect(paths).toContain('data/scenarios/presidential_initiatives/apr1992.json');
    });

    /*
     * The hand-maintained known-uncovered list that used to live here has been DELETED, not
     * moved: `tests/run_provenance_input_surface_scan.test.ts` derives the same fact from a
     * walk of the real import graph and pins it exhaustively in `EXCLUSION_REGISTER`.
     *
     * Keeping both would have been two sources of truth for one fact — the defect this module
     * removed from the collapse marker. And the hand-built one was measurably the worse
     * source: of its eight entries, three had wrong paths and one named a file that appears
     * only in a comment. A list nobody can mechanically check is a list that drifts.
     */

    it('nodeMajorOf parses the major and tolerates junk', () => {
        expect(nodeMajorOf('v24.13.0')).toBe('24');
        expect(nodeMajorOf('22.11.0')).toBe('22');
        expect(nodeMajorOf(null)).toBeNull();
        expect(nodeMajorOf('not-a-version')).toBeNull();
    });
});

describe('★ the painted SCORING REFERENCE is stamped conditionally, and fails closed both ways', () => {
    // A conditional row needs BOTH directions asserted. Present-when-read alone would pass on a
    // stamp hardcoded to always add oct1995 — which is the defect this module refuses elsewhere
    // ("the stamp would MATCH while the armies differed"). Absent-when-unread is the control.
    const PAINTED = 'data/source/calibration/painted_control_oct1995.json';

    it('stamps the painted map with REAL content when the scenario reads one', async () => {
        const { root, scenarioPath } = seedFullTree({ [PAINTED]: '{"by_settlement_id":{"op:a:b":"RS"}}\n' });
        const p = await buildRunProvenance({
            baseDir: root,
            scenarioPath,
            paintedReferenceKeys: ['oct1995'],
            harness: 'headless',
            collapseEnabled: false,
        });
        const row = p.consumed_inputs.files.find(f => f.path === PAINTED);
        expect(row, 'painted reference must be stamped when supplied').toBeDefined();
        // A row present but unhashed is a vacuous stamp: it would match across two runs that
        // read different references.
        expect(row?.sha256).toMatch(/^[0-9a-f]{64}$/);
    });

    it('CONTROL — omits it entirely when the scenario reads no painted reference', async () => {
        const { root, scenarioPath } = seedFullTree({ [PAINTED]: '{"by_settlement_id":{"op:a:b":"RS"}}\n' });
        const p = await buildRunProvenance({
            baseDir: root,
            scenarioPath,
            harness: 'headless',
            collapseEnabled: false,
        });
        // The file EXISTS in the tree — so its absence here proves the conditional, not a missing file.
        expect(p.consumed_inputs.files.map(f => f.path).filter(x => x.includes('painted_control_')))
            .toEqual([]);
    });

    it('a repaint of the reference changes the digest — the whole point of the row', async () => {
        const before = seedFullTree({ [PAINTED]: '{"by_settlement_id":{"op:kladanj:kladanj_3":"RS"}}\n' });
        const after = seedFullTree({ [PAINTED]: '{"by_settlement_id":{"op:kladanj:kladanj_3":"RBiH"}}\n' });
        const args = { paintedReferenceKeys: ['oct1995'], harness: 'headless' as const, collapseEnabled: false };
        const a = await buildRunProvenance({ baseDir: before.root, scenarioPath: before.scenarioPath, ...args });
        const b = await buildRunProvenance({ baseDir: after.root, scenarioPath: after.scenarioPath, ...args });
        expect(a.consumed_inputs.digest).not.toBe(b.consumed_inputs.digest);
    });
});

describe('the stamp records rows, not just a digest', () => {
    it('names every consumed path and hashes each one, in strictCompare order', async () => {
        const { root, scenarioPath } = seedFullTree();
        const p = await buildRunProvenance({
            baseDir: root,
            scenarioPath,
            harness: 'headless',
            collapseEnabled: false,
        });

        expect(p.schema_version).toBe(RUN_PROVENANCE_SCHEMA_VERSION);
        expect(p.harness).toBe('headless');
        expect(p.collapse_enabled).toBe(false);

        const paths = p.consumed_inputs.files.map(f => f.path);
        expect(paths).toEqual([...paths].sort(strictCompare));
        for (const required of HEADLESS_CONSUMED_INPUTS) {
            expect(paths, `${required} must be a NAMED row, auditable for omission`).toContain(required);
        }
        expect(paths).toContain('data/scenarios/apr1992_definitive_188w.json');
        for (const f of p.consumed_inputs.files) {
            expect(f.sha256, `${f.path} must hash`).toMatch(/^[0-9a-f]{64}$/);
        }
    });

    it('includes the officers file when the scenario declares one', async () => {
        const { root, scenarioPath } = seedFullTree({
            'data/scenarios/officers/apr1992_officers.json': '{"officers":[]}\n',
        });
        const withOfficers = await buildRunProvenance({
            baseDir: root,
            scenarioPath,
            initOfficers: 'apr1992',
            harness: 'headless',
            collapseEnabled: false,
        });
        const without = await buildRunProvenance({
            baseDir: root,
            scenarioPath,
            harness: 'headless',
            collapseEnabled: false,
        });
        expect(withOfficers.consumed_inputs.files.map(f => f.path))
            .toContain('data/scenarios/officers/apr1992_officers.json');
        expect(without.consumed_inputs.files.map(f => f.path))
            .not.toContain('data/scenarios/officers/apr1992_officers.json');
    });

    it('adds the derived startup snapshot ONLY on the desktop harness', async () => {
        const { root, scenarioPath } = seedFullTree({
            [DERIVED_STARTUP_SNAPSHOT]: '{"snapshot":true}\n',
        });
        const headless = await buildRunProvenance({
            baseDir: root, scenarioPath, harness: 'headless', collapseEnabled: false,
        });
        const desktop = await buildRunProvenance({
            baseDir: root, scenarioPath, harness: 'desktop', collapseEnabled: false,
        });
        expect(headless.consumed_inputs.files.map(f => f.path)).not.toContain(DERIVED_STARTUP_SNAPSHOT);
        expect(desktop.consumed_inputs.files.map(f => f.path)).toContain(DERIVED_STARTUP_SNAPSHOT);
    });

    it('records an absent input as ABSENT rather than dropping the row', async () => {
        const { root, scenarioPath } = seedFullTree();
        const p = await buildRunProvenance({
            baseDir: root,
            scenarioPath,
            initOfficers: 'does_not_exist',
            harness: 'headless',
            collapseEnabled: false,
        });
        const row = p.consumed_inputs.files.find(f => f.path.includes('does_not_exist'));
        expect(row, 'a missing input must still appear as a row').toBeDefined();
        expect(row?.sha256).toBeNull();
    });
});

describe('★ CONTENT bytes are hashed, never stat metadata', () => {
    it('two files with identical content hash identically despite separate writes', async () => {
        const a = seedFullTree();
        const b = seedFullTree();
        const pa = await buildRunProvenance({
            baseDir: a.root, scenarioPath: a.scenarioPath, harness: 'headless', collapseEnabled: false,
        });
        const pb = await buildRunProvenance({
            baseDir: b.root, scenarioPath: b.scenarioPath, harness: 'headless', collapseEnabled: false,
        });
        // Written at different moments to different inodes. A (path, size, mtime) fingerprint —
        // the fast obvious implementation, and the defect in task #13 — would differ here.
        expect(pa.consumed_inputs.digest).toBe(pb.consumed_inputs.digest);
        expect(pa.consumed_inputs.files).toEqual(pb.consumed_inputs.files);
    });

    it('a one-byte content change moves the row AND the digest', async () => {
        const before = seedFullTree({ 'data/source/oob_brigades.json': '{"brigades":[1,2,3]}\n' });
        const after = seedFullTree({ 'data/source/oob_brigades.json': '{"brigades":[1,2]}\n' });
        const pb = await buildRunProvenance({
            baseDir: before.root, scenarioPath: before.scenarioPath, harness: 'headless', collapseEnabled: false,
        });
        const pa = await buildRunProvenance({
            baseDir: after.root, scenarioPath: after.scenarioPath, harness: 'headless', collapseEnabled: false,
        });
        expect(pa.consumed_inputs.digest).not.toBe(pb.consumed_inputs.digest);
        const cmp = compareRunProvenance(pb, pa);
        // Filter to CONSUMED-INPUT rows. These stamps carry this checkout's real git state, so
        // on a dirty working tree the dirtiness hard-fail legitimately fires alongside.
        const inputDiffs = cmp.blockingDifferences.filter(d => d.startsWith('data/'));
        expect(inputDiffs).toHaveLength(1);
        expect(inputDiffs[0]).toContain('data/source/oob_brigades.json');
    });
});

describe('CRLF is normalized before hashing', () => {
    it('LF and CRLF versions of the same content produce the same hash', async () => {
        const lf = seedFullTree({ 'data/source/oob_corps.json': '{\n  "corps": []\n}\n' });
        const crlf = seedFullTree({ 'data/source/oob_corps.json': '{\r\n  "corps": []\r\n}\r\n' });
        const plf = await buildRunProvenance({
            baseDir: lf.root, scenarioPath: lf.scenarioPath, harness: 'headless', collapseEnabled: false,
        });
        const pcrlf = await buildRunProvenance({
            baseDir: crlf.root, scenarioPath: crlf.scenarioPath, harness: 'headless', collapseEnabled: false,
        });
        const hashOf = (p: typeof plf, path: string) =>
            p.consumed_inputs.files.find(f => f.path === path)?.sha256;
        expect(
            hashOf(pcrlf, 'data/source/oob_corps.json'),
            'without normalization a Windows checkout hard-fails against a Linux one, and a check '
            + 'that cries wolf gets disabled'
        ).toBe(hashOf(plf, 'data/source/oob_corps.json'));
        // Non-vacuity: the raw bytes really were different.
        const raw = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
        expect(raw('{\r\n  "corps": []\r\n}\r\n')).not.toBe(raw('{\n  "corps": []\n}\n'));
    });
});

/**
 * ★ THE PER-PROCESS GIT CACHE MUST NOT CACHE THE OVERRIDE ALONGSIDE IT.
 *
 * `readGitState` is memoised per baseDir so a harness process running ~13 scenarios does not
 * spawn 26 `git` subprocesses and contend on `index.lock` in this shared worktree. The hazard
 * that buys: if `provenance_override` were cached with it, a process that ran an override
 * scenario and then a clean one would stamp the SECOND with the FIRST's override — silently
 * disqualifying a legitimate run, or worse, carrying a stale justification.
 *
 * Verified as a measurement during review; committed here because a measurement nobody
 * re-runs is not a guard.
 */
describe('git state is cached per process; the override is NOT', () => {
    it('an override run does not contaminate a later clean run in the same process', async () => {
        const { root, scenarioPath } = seedFullTree();
        const args = { baseDir: root, scenarioPath, harness: 'headless' as const, collapseEnabled: false };

        process.env[PROVENANCE_OVERRIDE_ENV_VAR] = 'first run taken dirty on purpose';
        const first = await buildRunProvenance(args);
        delete process.env[PROVENANCE_OVERRIDE_ENV_VAR];
        const second = await buildRunProvenance(args);
        process.env[PROVENANCE_OVERRIDE_ENV_VAR] = 'third run, a different reason';
        const third = await buildRunProvenance(args);
        delete process.env[PROVENANCE_OVERRIDE_ENV_VAR];

        expect(first.provenance_override).toBe('first run taken dirty on purpose');
        expect(second.provenance_override, 'the clean run must NOT inherit the override').toBeUndefined();
        expect(third.provenance_override, 'and a later override must be its own reason, not a replay')
            .toBe('third run, a different reason');

        // The other half of the contract: git state IS shared, which is the documented cache.
        expect(second.git_commit).toBe(first.git_commit);
        expect(second.git_dirty).toBe(first.git_dirty);
    });

    it('a blank or whitespace override is not a reason', () => {
        process.env[PROVENANCE_OVERRIDE_ENV_VAR] = '   ';
        expect(readProvenanceOverride()).toBeUndefined();
        process.env[PROVENANCE_OVERRIDE_ENV_VAR] = '  a real reason, stated  ';
        expect(readProvenanceOverride()).toBe('a real reason, stated');
        delete process.env[PROVENANCE_OVERRIDE_ENV_VAR];
    });
});

/**
 * ★ AN EVIDENCE RUN MUST NOT MUTATE TRACKED STATE.
 *
 * `--map` copies the final save into `data/derived/latest_run_final_save.json`, a TRACKED
 * file, and `sim:scenario:run:188w` passes `--map`. So run 1 of a §6 pair dirtied the tree
 * and run 2 was refused at start: every exit closed, and the serial pair the gate exists to
 * enable became impossible. `run_scenario.ts` now skips that copy under
 * `AWWV_S6_GRADE_RUN=true`.
 *
 * Pinned in SOURCE because the behaviour lives in a CLI `main()` that the suite does not
 * invoke — the alternative is a measurement nobody re-runs. Verified live at the time of
 * writing: with the flag set, the file's sha256 was byte-identical before and after a real
 * `--map` run; without it, the same run changed it (so the suppression is not global).
 */
describe('the map copy is suppressed on an evidence run', () => {
    it('run_scenario.ts gates the tracked-file copy on the §6-grade flag', async () => {
        const fsp = await import('node:fs/promises');
        const src = await fsp.readFile(join(process.cwd(), 'tools/scenario_runner/run_scenario.ts'), 'utf8');
        const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

        expect(
            /if\s*\(enableMap\s*&&\s*s6GradeRun\)/.test(code),
            'the --map copy must be gated on AWWV_S6_GRADE_RUN. Without this, run 1 of a §6 pair '
            + 'writes data/derived/latest_run_final_save.json (TRACKED), dirties the tree, and run 2 '
            + 'is refused at start — the pair becomes impossible to take.'
        ).toBe(true);
        // The copy must still happen for ordinary runs: the map viewer depends on it, and a
        // global suppression would be a silent regression rather than a fix.
        expect(
            /else if \(enableMap\)/.test(code),
            'ordinary --map runs must still refresh the viewer'
        ).toBe(true);
        expect(code).toContain('S6_GRADE_RUN_ENV_VAR');
    });

    it('the refusal message NAMES the dirty paths', async () => {
        const fsp = await import('node:fs/promises');
        const src = await fsp.readFile(
            join(process.cwd(), 'tools/scenario_runner/run_scenario_with_preflight.ts'), 'utf8'
        );
        const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
        expect(
            code.includes('readGitDirtyPaths'),
            'A gate that exists to prevent an attribution error must not emit a message you cannot '
            + 'attribute. The first version said only "the tree is dirty" and cost a round trip — the '
            + 'dirty file was the previous evidence run\'s own output.'
        ).toBe(true);
        expect(code).toContain('DIRTY:');
    });
});

describe('★ ABSENT and CORRUPT are different answers', () => {
    it('an unstamped run_meta reads ABSENT', () => {
        expect(readRunProvenanceFrom({ run_id: 'x', weeks: 188 })).toEqual({ kind: 'absent' });
    });

    it('a MALFORMED stamp reads CORRUPT, never absent — a truncated run_meta is a broken artifact', () => {
        // Collapsing these to one value makes a partially-written stamp report "this run
        // predates stamping", which is false about the artifact and routes a broken run into
        // the benign skip path. Interrupted runs are the realistic source.
        const cases: Array<[string, unknown]> = [
            ['not an object', null],
            ['provenance not an object', { provenance: 7 }],
            ['no consumed_inputs', { provenance: { schema_version: 2 } }],
            ['digest not a string', { provenance: { consumed_inputs: { digest: 1, files: [] } } }],
            ['files not an array', { provenance: { consumed_inputs: { digest: 'd', files: 'nope' } } }],
            ['row without a path', { provenance: { consumed_inputs: { digest: 'd', files: [{ sha256: null }] } } }],
            ['no schema_version', { provenance: { consumed_inputs: { digest: 'd', files: [] } } }],
            ['no harness', { provenance: { schema_version: 2, consumed_inputs: { digest: 'd', files: [] } } }],
            ['no collapse_enabled', { provenance: { schema_version: 2, harness: 'headless', consumed_inputs: { digest: 'd', files: [] } } }],
        ];
        for (const [label, payload] of cases) {
            const read = readRunProvenanceFrom(payload);
            expect(read.kind, label).toBe('corrupt');
        }
    });

    it('round-trips a stamped run_meta', async () => {
        const { root, scenarioPath } = seedFullTree();
        const p = await buildRunProvenance({
            baseDir: root, scenarioPath, harness: 'headless', collapseEnabled: true,
        });
        const read = readRunProvenanceFrom(JSON.parse(JSON.stringify({ provenance: p })) as unknown);
        expect(read.kind).toBe('ok');
        expect(read.kind === 'ok' ? read.provenance : null).toEqual(p);
    });

    it('toRepoRelativePath forward-slashes and strips the base', () => {
        expect(toRepoRelativePath('F:\\repo', 'F:\\repo\\data\\source\\oob_corps.json'))
            .toBe('data/source/oob_corps.json');
        expect(toRepoRelativePath('/home/u/repo', '/home/u/repo/data/source/oob_corps.json'))
            .toBe('data/source/oob_corps.json');
        // A path outside the base is left alone rather than silently mangled.
        expect(toRepoRelativePath('/home/u/repo', '/elsewhere/x.json')).toBe('/elsewhere/x.json');
    });
});
