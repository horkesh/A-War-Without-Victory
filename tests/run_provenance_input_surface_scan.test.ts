/**
 * ★ SELF-POLICING INPUT-SURFACE SCAN — the completeness claim as an ENFORCED CONTRACT.
 *
 * WHY THIS EXISTS. Five independent enumerations of "what does a headless run read" each
 * found inputs the previous one missed (5, then 3, then 1, then 3, then this scan's own
 * haul). A prose caveat in `run_provenance.ts` documents that gap; it does not close it, and
 * there was no reason to believe the sixth enumeration would be the last. This test replaces
 * "we believe the set is complete" with "adding an unstamped data read turns a test red" —
 * the same instrument class as the source-text pin on the guard call, applied to the input
 * surface instead of the caller.
 *
 * It already paid for itself: it found ten more uncovered files than the hand-built list,
 * and corrected three entries in it (`army_co_roster.json` is under `data/scenarios/` not
 * `data/source/`; `formation_lifecycle_events.json` is under `data/source/` not
 * `data/derived/`; `paramilitary_named_units` is a `.ts` SOURCE MODULE, not a data file, so
 * it is code and covered by the commit/dirty hard-fails rather than by content hashing).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SCOPE, STATED HERE RATHER THAN LEFT AS AN UNEXAMINED BOUNDARY.
 *
 * The corpus is the TRANSITIVE IMPORT GRAPH from `src/scenario/scenario_runner.ts` — the
 * headless entrypoint. It is walked, not guessed. Deliberately NOT "src/ minus ui/ and
 * desktop/": excluding directories by hand is how `"the t0 build path"` became a boundary
 * nobody re-examined. The graph excludes `src/cli/` audit tools and the UI automatically,
 * because `runScenario` does not import them — and if it ever does, they come into scope on
 * their own.
 *
 * ★ WHAT THIS SCAN CANNOT SEE. Its green is not a proof of completeness, and must never be
 * quoted as one:
 *   - a path ASSEMBLED FROM VARIABLES at runtime (only literals are visible; templated
 *     literals are captured as prefixes and listed separately);
 *   - a read inside `node_modules`;
 *   - a file opened by a tool the runner SHELLS OUT to;
 *   - a read reached by dynamic `import()` with a non-literal specifier;
 *   - the event catalogue, whose members are bare filenames (`'war_1992.json'`) joined to a
 *     module-relative `EVENTS_DIR` — invisible to a `data/`-anchored literal sweep. Those
 *     ARE stamped, via `EVENT_FILES` imported from the loader, so the gap is in the scan's
 *     vision rather than in the coverage;
 *   - ★ paths built from SEPARATE `join()` SEGMENTS — `join(baseDir, 'data', 'source', …)`
 *     contains no literal with `data/` in it. This one is live, not theoretical
 *     (`scenario_runner.ts:745`, the `painted_control_{refKey}` reference maps), so rather
 *     than disclaiming it the scan DETECTS the sites and pins them; see the segment-join
 *     case below.
 *
 * Comments are stripped before scanning. That is load-bearing twice over: the known-uncovered
 * register in `run_provenance.ts` names paths in prose, and `triggered_operations.ts`
 * mentions `painted_control_oct1995.json` in a comment describing an AUTHORING-TIME check —
 * treating either as a runtime read would have put a false justification in the register.
 *
 * Determinism: pure source reads. No RNG, no clock, no fs metadata.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import {
    HEADLESS_FIXED_CONSUMED_INPUTS,
    deriveScenarioConsumedInputs,
} from '../src/scenario/run_provenance.js';
import { EVENT_FILES } from '../src/sim/events/event_loader.js';
import { strictCompare } from '../src/state/validateGameState.js';

const REPO = process.cwd();
const ENTRY = join(REPO, 'src/scenario/scenario_runner.ts');
const SCENARIO = 'data/scenarios/apr1992_definitive_188w.json';

/** Comments stripped FIRST — the known-uncovered register in run_provenance.ts names paths in prose. */
function codeOnly(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function toPosix(p: string): string {
    return p.split('\\').join('/');
}

function resolveSpecifier(fromFile: string, spec: string): string | null {
    if (!spec.startsWith('.')) return null;
    const base = toPosix(resolve(dirname(fromFile), spec));
    const candidates = [base.replace(/\.js$/, '.ts'), base.replace(/\.js$/, '.tsx'), base, `${base}.ts`, `${base}/index.ts`];
    return candidates.find(c => existsSync(c)) ?? null;
}

/** Transitive import closure from the headless entrypoint. */
function reachableModules(): string[] {
    const IMPORT = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;
    const seen = new Set<string>();
    const queue = [toPosix(ENTRY)];
    while (queue.length > 0) {
        const file = queue.pop() as string;
        if (seen.has(file)) continue;
        seen.add(file);
        let src: string;
        try {
            src = readFileSync(file, 'utf8');
        } catch {
            continue;
        }
        for (const m of src.matchAll(IMPORT)) {
            const resolved = resolveSpecifier(file, m[1]);
            if (resolved !== null && !seen.has(resolved)) queue.push(resolved);
        }
    }
    return [...seen].sort(strictCompare);
}

const DATA_LITERAL = /['"`]([^'"`\n]*data\/[^'"`\n]+\.(?:json|geojson|js))['"`]/g;

interface Discovered {
    readonly concrete: string[];
    readonly templated: string[];
    readonly codeImports: string[];
    readonly shapes: { baseDirRelative: number; cwdRelative: number; moduleRelative: number };
    readonly byPath: Map<string, string[]>;
}

function scan(modules: readonly string[]): Discovered {
    const byPath = new Map<string, string[]>();
    const shapes = { baseDirRelative: 0, cwdRelative: 0, moduleRelative: 0 };
    for (const file of modules) {
        const src = codeOnly(readFileSync(file, 'utf8'));
        for (const m of src.matchAll(DATA_LITERAL)) {
            const raw = toPosix(m[1]);
            const path = raw.slice(raw.indexOf('data/'));
            const rel = file.replace(`${toPosix(REPO)}/`, '');
            const list = byPath.get(path);
            if (list === undefined) byPath.set(path, [rel]);
            else if (!list.includes(rel)) list.push(rel);
        }
        // Independent shape counters. If one enumeration shape silently stops matching after a
        // refactor, the other two would mask it in a single combined total.
        shapes.baseDirRelative += [...src.matchAll(/(?:join|resolve)\([^)]*(?:baseDir|process\.cwd\(\))[^)]*data\//g)].length;
        shapes.cwdRelative += [...src.matchAll(/resolve\(\s*(?:[A-Za-z_$][\w$]*\s*\?\?\s*)?['"]data\//g)].length;
        shapes.moduleRelative += [...src.matchAll(/(?:join|resolve)\(\s*(?:__dirname|getModuleDir\(\)|import\.meta)[^)]*data\//g)].length;
    }
    const concrete: string[] = [];
    const templated: string[] = [];
    const codeImports: string[] = [];
    for (const path of [...byPath.keys()].sort(strictCompare)) {
        if (/[$*{<]/.test(path)) templated.push(path);
        else if (existsSync(join(REPO, path))) concrete.push(path);
        else codeImports.push(path);
    }
    return { concrete, templated, codeImports, shapes, byPath };
}

/**
 * ★ THE EXCLUSION REGISTER — exhaustively pinned, every entry justified in a sentence.
 *
 * Every concrete data file the graph reaches is either STAMPED or listed here. The list is
 * compared with `toEqual`, never `subset`: adding an entry is a deliberate edit that shows up
 * in review, never a silent widening. If an exclusion cannot be justified in a sentence, that
 * is the finding.
 *
 * `deferred_stamp` = a genuine run input that is NOT yet hashed. These are the honest gap.
 * `not_an_input`   = reached by the graph but not read on the headless measurement path.
 */
type ExclusionKind = 'deferred_stamp' | 'not_an_input';
interface Exclusion {
    readonly path: string;
    readonly kind: ExclusionKind;
    readonly reason: string;
}

const EXCLUSION_REGISTER: readonly Exclusion[] = [
    {
        path: 'data/derived/fallback_geometries.json',
        kind: 'deferred_stamp',
        reason: 'Read by map/settlements.ts when a settlement polygon is missing; shapes the graph the sim runs on.',
    },
    {
        path: 'data/derived/operational/canonical_to_operational_map.json',
        kind: 'deferred_stamp',
        reason: 'Read by data/operational_data.ts; the canonical-to-OSID mapping every control read goes through.',
    },
    {
        path: 'data/derived/operational/forest_osids.json',
        kind: 'deferred_stamp',
        reason: 'Read by combat_terrain_sets_node.ts; a terrain multiplier applied in every battle.',
    },
    {
        path: 'data/derived/operational/operational_initial_master.json',
        kind: 'deferred_stamp',
        reason: 'Read by political_control_init.ts during t0 control seeding.',
    },
    {
        path: 'data/derived/operational/osid_areas.json',
        kind: 'deferred_stamp',
        reason: 'Read via operational_data.ts and osid_areas.ts; feeds faction area share into run_summary.historical_fit, which is exactly what a calibration comparison reads.',
    },
    {
        path: 'data/derived/operational/urban_osids.json',
        kind: 'deferred_stamp',
        reason: 'Read by combat_terrain_sets_node.ts; a terrain multiplier applied in every battle.',
    },
    {
        path: 'data/derived/settlement_contact_graph_enriched.json',
        kind: 'deferred_stamp',
        reason: 'Read by phase3a_pressure_eligibility.ts; determines which edges can carry pressure.',
    },
    {
        path: 'data/derived/startup/apr_1992_initial_save.json',
        kind: 'not_an_input',
        reason: 'DESKTOP-ONLY and pinned to the 52-week scenario. It has no headless consumer, and it is byte-identical across the n222/n223 pair — hashing it here would match while the armies differed, rebuilding the original bug while looking like coverage. It is in DESKTOP_EXTRA_CONSUMED_INPUTS instead. The only reason the graph reaches it is that run_provenance.ts names it.',
    },
    {
        path: 'data/derived/terrain/settlements_terrain_scalars.json',
        kind: 'deferred_stamp',
        reason: 'Read by map/terrain_scalars_node.ts; per-settlement terrain scalars feeding combat.',
    },
    {
        path: 'data/reference/historical_baseline.json',
        kind: 'deferred_stamp',
        reason: 'Read by endgame/endgame_snapshot.ts; the reference the endgame verdict is scored against.',
    },
    {
        path: 'data/scenarios/army_co_roster.json',
        kind: 'deferred_stamp',
        reason: 'Read by army_co_roster_data.ts. This is the R7 Phase 2 elite_commander class — competence and aggressiveness values that are demonstrably NOT run-inert.',
    },
    {
        path: 'data/source/calibration/painted_control_jan1993.json',
        kind: 'deferred_stamp',
        reason: 'Read by anomaly_checks_extended.ts as a mid-war reference map.',
    },
    {
        path: 'data/source/formation_lifecycle_events.json',
        kind: 'deferred_stamp',
        reason: 'Read by formation_lifecycle_events.ts; scripted formation births and deaths.',
    },
    {
        path: 'data/source/municipalities_1990_initial_political_controllers.json',
        kind: 'deferred_stamp',
        reason: 'The non-keyed default control file in political_control_init.ts. The apr1992-keyed variant IS stamped via init_control; this fallback is not.',
    },
    {
        path: 'data/source/municipality_political_controllers.json',
        kind: 'deferred_stamp',
        reason: 'Read by political_control_init.ts as a municipality-level control input.',
    },
    {
        path: 'data/source/municipality_post1995_to_mun1990.json',
        kind: 'deferred_stamp',
        reason: 'Read by political_control_init.ts; post-1995 to 1990 municipality remapping.',
    },
    {
        path: 'data/source/strategic_priorities.json',
        kind: 'deferred_stamp',
        reason: 'Read by strategic_priorities.ts; bot targeting weights.',
    },
];

describe('★ input-surface scan: every data read on the headless path is stamped or justified', () => {
    const modules = reachableModules();
    const found = scan(modules);
    const stamped = new Set<string>([
        ...HEADLESS_FIXED_CONSUMED_INPUTS,
        ...deriveScenarioConsumedInputs({
            baseDir: REPO,
            scenarioPath: join(REPO, SCENARIO),
            initControl: 'apr1992',
            initFormations: 'apr1992',
            warTimeline: 'apr1992',
            initOfficers: 'apr1992',
        }),
    ]);

    /**
     * ★ LIVENESS. An empty discovered set is trivially a subset of anything — green while
     * asserting nothing, napkin 0h(B), arriving inside the instrument built to stop the class.
     * These pins fail if the walker or the literal regex silently stops matching.
     */
    it('LIVENESS: the walker and the literal sweep both found real material', () => {
        expect(
            modules.length,
            `import walk from scenario_runner.ts reached ${modules.length} modules — a collapse here `
            + 'would make every assertion below vacuous'
        ).toBeGreaterThan(300);
        expect(modules).toContain(toPosix(join(REPO, 'src/scenario/oob_loader.ts')));
        expect(modules).toContain(toPosix(join(REPO, 'src/state/political_control_init.ts')));

        expect(
            found.concrete.length,
            `discovered ${found.concrete.length} concrete on-disk data reads:\n  ${found.concrete.join('\n  ')}`
        ).toBeGreaterThan(25);
        expect(found.templated.length, 'templated reads (officers, timelines, init_control, painted_control)')
            .toBeGreaterThan(5);
    });

    it('LIVENESS: each enumeration SHAPE independently found at least one read', () => {
        // One shape silently ceasing to match would be masked by a single combined total.
        const { baseDirRelative, cwdRelative, moduleRelative } = found.shapes;
        const summary = `baseDir=${baseDirRelative} cwd=${cwdRelative} module=${moduleRelative}`;
        expect(baseDirRelative, `baseDir/cwd-relative join|resolve shape found nothing (${summary})`).toBeGreaterThan(0);
        expect(cwdRelative, `bare cwd-relative resolve('data/…') shape found nothing (${summary})`).toBeGreaterThan(0);
        expect(moduleRelative, `module-relative shape found nothing (${summary}) — this is how EVENT_FILES hides`).toBeGreaterThan(0);
    });

    it('★ every concrete data read is STAMPED or in the exclusion register', () => {
        const excluded = new Set(EXCLUSION_REGISTER.map(e => e.path));
        const uncovered = found.concrete.filter(p => !stamped.has(p) && !excluded.has(p));
        expect(
            uncovered,
            'These data files are read on the headless path but are neither stamped in '
            + 'run_provenance.ts nor justified in EXCLUSION_REGISTER. Two runs differing only in '
            + 'one of them produce an IDENTICAL consumed_inputs digest — the n222/n223 defect. '
            + 'Either stamp them, or add a register entry saying in a sentence why they are not '
            + `an input.\n  ${uncovered.map(p => `${p}  <- ${(found.byPath.get(p) ?? []).join(', ')}`).join('\n  ')}\n`
            + `(scanned ${modules.length} modules, ${found.concrete.length} concrete reads, `
            + `${stamped.size} stamped, ${excluded.size} excluded)`
        ).toEqual([]);
    });

    it('the exclusion register is EXHAUSTIVE — no stale entries, no silent widening', () => {
        // Compared as a set, not a subset. An entry that no longer corresponds to a real read is
        // as much a defect as a missing one: it is a justification for something that is not there.
        const registerPaths = EXCLUSION_REGISTER.map(e => e.path).sort(strictCompare);
        expect(registerPaths, 'register must be sorted and duplicate-free').toEqual([...new Set(registerPaths)]);
        const stale = registerPaths.filter(p => !found.concrete.includes(p));
        expect(
            stale,
            `register entries that no longer match any discovered read — delete them:\n  ${stale.join('\n  ')}`
        ).toEqual([]);
        const alsoStamped = registerPaths.filter(p => stamped.has(p));
        expect(
            alsoStamped,
            `register entries that ARE now stamped — remove them from the register AND from the `
            + `known-uncovered list in run_provenance.ts:\n  ${alsoStamped.join('\n  ')}`
        ).toEqual([]);
    });

    it('every exclusion carries a substantive justification', () => {
        for (const entry of EXCLUSION_REGISTER) {
            expect(entry.reason.trim().length, `${entry.path} needs a real reason, not a placeholder`)
                .toBeGreaterThan(30);
            expect(['deferred_stamp', 'not_an_input']).toContain(entry.kind);
        }
    });

    /**
     * The honest headline. `deferred_stamp` entries are REAL RUN INPUTS THAT ARE NOT HASHED —
     * two runs differing only in one of them compare identical. Commit and dirty-tree
     * hard-fails cover the ordinary case (a tracked edit moves the commit), so the live
     * exposure is same-commit/clean-tree: regenerated or gitignored derived data.
     *
     * This count is pinned so the gap cannot quietly grow, and so that shrinking it is a
     * visible, deliberate change.
     */
    it('the DEFERRED-STAMP gap is exactly the size we think it is', () => {
        const deferred = EXCLUSION_REGISTER.filter(e => e.kind === 'deferred_stamp').map(e => e.path);
        expect(
            deferred.length,
            `${deferred.length} real run inputs are read but NOT hashed:\n  ${deferred.join('\n  ')}\n`
            + 'Stamping any of them changes consumed_inputs.digest and moves the row count, which '
            + 'is why it is a deliberate follow-up rather than a silent fix.'
        ).toBe(16);
        expect(EXCLUSION_REGISTER.filter(e => e.kind === 'not_an_input')).toHaveLength(1);
    });

    /**
     * ★ THE SEGMENT-JOIN BLIND SPOT, DETECTED RATHER THAN MERELY DISCLAIMED.
     *
     * `scenario_runner.ts:745` builds a real runtime read as
     * `join(baseDir, 'data', 'source', 'calibration', \`painted_control_${refKey}.json\`)`.
     * No literal in that expression contains `data/`, so the sweep above is structurally
     * blind to it — and `painted_control_oct1995.json` is the reference map `matched_osids`
     * is scored against, so this is not a hypothetical corner.
     *
     * A comment saying "the scan cannot see segment-joined paths" would be the same kind of
     * honest-but-inert caveat this whole test replaces. So the sites are DETECTED and pinned:
     * a new one shows up as a red with the file named, and has to be triaged deliberately.
     */
    it('★ segment-joined paths are detected, not silently missed', () => {
        const SEGMENT_JOIN = /(?:join|resolve)\([^)]*['"]data['"]\s*,/g;
        const sites: string[] = [];
        for (const file of modules) {
            const src = codeOnly(readFileSync(file, 'utf8'));
            const n = [...src.matchAll(SEGMENT_JOIN)].length;
            if (n > 0) sites.push(`${file.replace(`${toPosix(REPO)}/`, '')} (${n})`);
        }
        expect(
            sites,
            'Segment-joined data paths are INVISIBLE to the literal sweep. Each site must be '
            + 'triaged by hand: does it read a file that should be stamped? If this list grew, '
            + 'the new entry is an unaudited read.\n  ' + sites.join('\n  ')
        ).toEqual([
            // ★ READ, and DEFERRED-STAMP: painted_control_{refKey}.json — the calibration
            // reference maps, including oct1995, which `matched_osids` is scored against.
            // Templated by refKey, so stamping it means first resolving which snapshots a
            // given run actually loads. This is the one entry here that is a real gap.
            'src/scenario/scenario_runner.ts (1)',
            // WRITE, not a read: `join(cwd, 'data', 'derived', '_debug')` is a debug OUTPUT
            // directory. An output cannot confound a comparison, so it is not an input.
            'src/sim/combat/army_order_interpretation.ts (1)',
            // WRITE, not a read: the same `data/derived/_debug` output directory.
            'src/sim/combat/corps_front_sectors.ts (1)',
        ]);
        // Non-vacuity: the detector must actually match something, or the pin above is an
        // assertion that nothing exists.
        expect(sites.length).toBeGreaterThan(0);
    });

    it('code imports whose specifier merely contains "data/" are not mistaken for data files', () => {
        // `src/data/operational_data.ts` is imported as '../../data/operational_data.js'. Treating
        // those as unstamped data reads would bury the real findings in false positives.
        for (const p of found.codeImports) {
            expect(existsSync(join(REPO, p)), `${p} was classified a code import but exists as a file`).toBe(false);
        }
        expect(found.codeImports).toContain('data/operational_data.js');
        expect(
            found.codeImports,
            'paramilitary_named_units is a .ts SOURCE MODULE under data/source/oob/, not a data file — '
            + 'it is code, covered by the commit and dirty-tree hard-fails rather than by content hashing'
        ).toContain('data/source/oob/paramilitary_named_units.js');
    });

    it('EVENT_FILES are stamped even though the scan cannot see them', () => {
        // Documented blind spot, asserted rather than trusted: the loader joins bare filenames to
        // a module-relative EVENTS_DIR, so no `data/`-anchored literal exists to discover.
        for (const name of EVENT_FILES) {
            expect(stamped.has(`data/scenarios/events/${name}`), `${name} must be stamped`).toBe(true);
            expect(found.concrete).not.toContain(`data/scenarios/events/${name}`);
        }
    });
});
