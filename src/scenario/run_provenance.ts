/**
 * Run provenance — what a run was actually produced FROM.
 *
 * DEFECT THIS EXISTS TO KILL (ledger 2026-08-17, napkin 0p). `run_meta.json` recorded
 * `out_dir`, `run_id`, `scenario_id`, `scenario_path` and `weeks` — no commit, no data
 * hash, no flag state — and the run-directory hash is taken over the SCENARIO DEFINITION
 * FILE, which an OOB edit never touches. So `runs/…w188_n222` (collapse ON, pre-R7-Phase-2
 * OOB, three HVO brigades present) and `runs/…w188_n223` (collapse OFF, post-R7-Phase-2
 * OOB, those brigades deleted) carry the SAME hash while running on DIFFERENT ARMIES.
 * `selectS6RunDirs` paired them; a §6 test attributed 33 differing cells wholly to the
 * flag and the project ledger attributed the same 33 wholly to the OOB change. Two
 * conclusions, opposite causes, one comparison, and nothing in the artifacts could tell.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS HASHED, AND THE EXACT LIMIT OF THAT CLAIM
 *
 * The consumed set is DERIVED PER RUN, not hardcoded: the fixed inputs below, plus the
 * files the scenario itself declares — `init_control`, `init_formations`, `war_timeline`,
 * `init_officers` — resolved through the same functions the runner uses, plus the event
 * catalogue's own `EVENT_FILES` list imported from its loader, plus one painted-control
 * SCORING REFERENCE PER HISTORICAL CHECKPOINT the run reaches. For the definitive 188w
 * scenario that is **31 rows** = 16 fixed + scenario + 4 declared keys + 6 `EVENT_FILES`
 * + 4 painted maps (jan1993, apr1994, apr1995, oct1995 — the run scores at every one).
 *
 * DO NOT TRUST THAT NUMBER FROM THIS COMMENT. Three earlier drafts said 20, 24 and 28, and all
 * were wrong — 24 was the count before the three cwd-relative reads below were added. The
 * pin in tests/run_provenance_stamp.test.ts recomputes it from the live set against the
 * REAL scenario, so adding an input turns it red and forces this line to be corrected in
 * the same change. A completeness claim riding on a remembered count is the same defect as
 * a digest over an unnamed set.
 *
 * *** THIS IS NOT A PROVEN-COMPLETE SET, AND ITS SCOPE IS NARROWER THAN A §6 PAIR. ***
 *
 * SCOPE: these are inputs read while BUILDING TURN ZERO. A §6 differential is about 188
 * WEEKS, and the run reads more as it goes. Four independent enumerations have each found
 * inputs the previous one missed (5, then 3, then 1, then 3), so treat the list as current
 * best knowledge, never as closed. If you add a data read anywhere the run reaches, add it
 * here in the same change — the failure mode is silent: two runs differing only in that
 * file produce an IDENTICAL digest.
 *
 * ★ KNOWN-UNCOVERED — DO NOT MAINTAIN THE LIST HERE. A reader who sees an honest
 * completeness caveat will assume it covers UNKNOWN reads; these are known and unstamped.
 * But a hand-maintained list in a comment is exactly what kept being wrong: an eight-entry
 * version of it had THREE bad paths (`army_co_roster.json` is under `data/scenarios/`, not
 * `data/source/`; `formation_lifecycle_events.json` is under `data/source/`, not
 * `data/derived/`; `paramilitary_named_units` is a `.ts` SOURCE MODULE, so it is code, not
 * data) and one entry that is not a runtime read at all (`painted_control_oct1995.json`
 * appears in `triggered_operations.ts` only in a COMMENT describing an authoring-time check).
 *
 * THE LIST LIVES IN `tests/run_provenance_input_surface_scan.test.ts`, in
 * `EXCLUSION_REGISTER`, where it is checked against a walk of the real import graph from
 * `scenario_runner.ts`. Every concrete data read that graph reaches is either stamped here
 * or carries a justification there; the register is compared exhaustively, so it cannot
 * silently widen and it cannot go stale. As of that scan: **16 real run inputs are read and
 * NOT hashed**, plus the desktop-only startup snapshot which is excluded on purpose.
 *
 * ★ PARTIALLY CLOSED 2026-08-24, WIDENED LATER THE SAME DAY — read the distinction, because
 * what is still open is now SHORT RUNS ONLY. There are TWO painted reads, not one:
 *   - the SCORING references. **Stamped**, and since checkpoint scoring landed there is one row
 *     per checkpoint the run reaches, not one per scenario (see `deriveScenarioConsumedInputs`
 *     and `checkpointsForScenario`). This was the register's one entry flagged "a real gap".
 *   - `painted_control_jan1993.json`, hardcoded in `anomaly_checks_extended.ts` (Check #27)
 *     and read on EVERY scenario regardless of length. Now stamped INCIDENTALLY for any run
 *     reaching week 39, because jan1993 is that run's first checkpoint — so the 188w and 52w
 *     lines are covered. **Still unstamped for runs shorter than 39 weeks**, which is exactly
 *     where Check #27 is expected to fire (the 4w fixtures), so the register entry stands.
 *     Do not read "the 188w stamp covers jan1993" as "Check #27 is covered". Its output lands in `run_summary.json` via `anomaly_detection.reports`, so a
 *     jan1993 repaint moves a byte-pinned artifact through a read this stamp does not cover.
 *     Measured 2026-08-24: Check #27 is VACUOUS at 188w — 143 OSIDs mismatch jan1993 in the
 *     final state and it emits nothing, because `hasCanonicalDefense` is true for all of them.
 *     Sibling Check #28 fires in the same run (same cwd-relative pattern), so that silence is
 *     the predicate, not a failed load. Expect it to fire at 4w, where sector coverage is thin.
 *
 * DO NOT READ THE ABOVE AS "jan1993 only affects anomaly reports". It is ALSO a SCORING
 * reference: `pickHistoricalReferenceKey` sends every `weeks <= 56` scenario to it, so the 52w
 * baseline scores `historical_fit` / `vs_historical` / `anchor_checks` against jan1993 — and
 * `counts_by_controller[].reference_count` counts the REFERENCE, so a repainted cell moves that
 * run's summary unconditionally, whatever the sim did. That scoring half IS stamped by the row
 * below, so there is no provenance hole; the point is that a jan1993 edit moves more artifacts
 * than the Check #27 sentence alone suggests.
 *
 * The scoring half was closed AHEAD of a reference repaint rather than alongside it: had both
 * landed together, no run would ever have recorded the stamp beside the OLD reference, so the
 * instrument's first observation would already be post-change and the re-basing would have
 * gone unrecorded exactly like the previous one (`e3a28e25f`).
 *
 * Two runs differing only in one of those compare IDENTICAL. Commit and dirty-tree
 * hard-fails cover the ordinary case (a tracked edit moves the commit), so the exposure is
 * the same-commit/clean-tree path: regenerated or gitignored derived data. Closing it means
 * stamping them, which changes the digest; deliberately deferred, not overlooked.
 *
 * Derivation is by declared key wherever the scenario declares one, precisely so that this
 * list cannot silently disagree with what the runner loads.
 *
 * ★ THE START-TIME CLEANLINESS GATE IS ENTRYPOINT-SCOPED, NOT UNIVERSAL. It lives in
 * `tools/scenario_runner/run_scenario_with_preflight.ts`, which is what
 * `npm run sim:scenario:run:188w` uses, so the intended route is covered. But
 * `tools/scenario_runner/run_scenario.ts` is a live sibling with NO gate. Do not read a
 * start-time refusal as a guarantee that every run was launched from a clean tree — the
 * comparison-time `git_dirty` hard-fail is the backstop that actually holds.
 *
 * ★ `data/derived/startup/apr_1992_initial_save.json` is DELIBERATELY ABSENT from the
 * headless set. It is produced by `tools/scenario_runner/build_startup_snapshot.ts`, is
 * pinned to the DEFINITIVE 188-WEEK scenario, and its only consumers are desktop/UI (`electron-main.cjs`,
 * `warroom.ts`, `campaignRecruitmentActions.ts`). It has NO headless consumer. Including it
 * would be worse than omitting it: it is byte-identical across the exact n222/n223 pair that
 * caused the incident, so the stamp would MATCH while the armies differed — rebuilding the
 * bug in a new file while looking like coverage. It belongs to the DESKTOP set, which is why
 * `harness` is recorded.
 *
 * FOUR HASHING CONSTRAINTS, each a defect this repo has already shipped once:
 *  1. Record the PATH LIST, not just a digest. A digest over an unnamed set cannot be
 *     audited — you cannot later tell whether a file was omitted, which is how this defect
 *     class survives. Napkin 0m: the unit of evidence is the row.
 *  2. Hash CONTENT BYTES, never stat metadata. `(path, size, mtime)` is the fast obvious
 *     implementation and would rebuild the mtime-in-a-fingerprint defect inside the fix
 *     for it (napkin 0p, open task #13).
 *  3. Normalize line endings before hashing. `normalizeStartupSnapshotPayload` in
 *     `startup_snapshot.ts` is the in-repo precedent — CRLF drift is live here. Without
 *     this the same content hashes differently across machines and the hard-fail fires
 *     spuriously; a check that cries wolf gets disabled.
 *  4. Order the file list by `strictCompare`. Determinism is sacred.
 *
 * Determinism: no wall-clock, no RNG, no fs metadata. `git` and `process.version` are read
 * for provenance only, never feed the simulation, and degrade to `null` when unavailable.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { EVENT_FILES } from '../sim/events/event_loader.js';
import { strictCompare } from '../state/validateGameState.js';
import { resolveInitControlPath, resolveInitFormationsPath } from './scenario_loader.js';

export const RUN_PROVENANCE_SCHEMA_VERSION = 2;

/** Which harness produced the run. The consumed set differs between them. */
export type RunHarness = 'headless' | 'desktop';

/** Harness values this module's comparison knows how to reason about. */
export const RECOGNISED_HARNESSES: readonly string[] = ['headless'];

/** Env var that marks a run as §6-grade, enabling the start-time cleanliness gate. */
export const S6_GRADE_RUN_ENV_VAR = 'AWWV_S6_GRADE_RUN';

/** Env var carrying the escape-hatch reason. Records itself; never silences a check. */
export const PROVENANCE_OVERRIDE_ENV_VAR = 'AWWV_PROVENANCE_OVERRIDE';

/**
 * Fixed baseDir-relative inputs every headless run reads. Per-run inputs (scenario file,
 * declared init/timeline/officer files, the event catalogue) are appended by
 * `buildRunProvenance`. See the completeness caveat in the header.
 */
export const HEADLESS_FIXED_CONSUMED_INPUTS: readonly string[] = [
    'data/derived/census_rolled_up_wgs84.json',
    'data/derived/municipality_hq_settlement.json',
    // Resolved against CWD rather than baseDir by political_control_init.ts (:490 / :252).
    // Named here rather than quietly folded in: a baseDir-relative grep does not find them,
    // which is one of the reasons earlier enumerations missed inputs.
    'data/derived/municipality_political_controllers_1990.json',
    'data/derived/municipality_population_1991.json',
    'data/derived/operational/operational_contact_graph.json',
    'data/derived/operational/operational_political_control.json',
    'data/derived/operational/operational_settlements.geojson',
    'data/derived/settlement_edges.json',
    'data/derived/settlement_ethnicity_data.json',
    'data/scenarios/political_leader_data.json',
    // STATIC ESM IMPORT (presidential_initiatives.ts:16), not a runtime read — it is baked
    // into the bundle. Hashed anyway because its CONTENT still shapes the run, but note the
    // difference: swapping this file without a rebuild changes nothing.
    'data/scenarios/presidential_initiatives/apr1992.json',
    'data/source/municipalities_1990_registry_110.json',
    'data/source/oob_brigades.json',
    'data/source/oob_corps.json',
    'data/source/settlement_political_controllers_overrides.json',
    'data/source/settlements_initial_master.json',
];

/**
 * The desktop path additionally consumes the baked startup snapshot. Recorded so a §6
 * verdict taken from a playthrough is never silently compared against a headless run.
 */
export const DESKTOP_EXTRA_CONSUMED_INPUTS: readonly string[] = [
    'data/derived/startup/apr_1992_initial_save.json',
];

/** One consumed file. `sha256: null` means the file was absent when the run started. */
export interface ConsumedInputHash {
    readonly path: string;
    readonly sha256: string | null;
}

export interface ConsumedInputSet {
    /** sha256 over the ordered rows below. A shorthand, never the evidence. */
    readonly digest: string;
    /** THE EVIDENCE — named rows, `strictCompare(path)` ascending. */
    readonly files: readonly ConsumedInputHash[];
}

export interface RunProvenance {
    readonly schema_version: number;
    readonly harness: RunHarness | string;
    /** HEAD at run start, or null where git is unavailable (packaged runtime, tarball). */
    readonly git_commit: string | null;
    /**
     * Working-tree modifications at run start, INCLUDING untracked non-ignored files.
     * Untracked must be counted: a new uncommitted `src/` file is an engine change that a
     * tracked-only check reads as clean, which would make the commit hard-fail decorative.
     * `runs/` and the `tmp-*` roots are gitignored, so they never register.
     */
    readonly git_dirty: boolean | null;
    /** Full `process.version`, e.g. `v24.13.0`. Major drives the hard-fail; the rest warns. */
    readonly node_version: string | null;
    /** `ENABLE_COLLAPSE` gate state. The AUTHORITATIVE flag record — see the marker note below. */
    readonly collapse_enabled: boolean;
    /**
     * Present only when the run was started through the escape hatch. Its PRESENCE
     * disqualifies the run from a §6 verdict; it silences nothing.
     */
    readonly provenance_override?: string;
    readonly consumed_inputs: ConsumedInputSet;
}

/** CRLF → LF before hashing. See constraint 3 above. */
function normalizeForHash(payload: string): string {
    return payload.replace(/\r\n/g, '\n');
}

async function hashFileContent(absolutePath: string): Promise<string | null> {
    let raw: string;
    try {
        raw = await readFile(absolutePath, 'utf8');
    } catch {
        return null;
    }
    return createHash('sha256').update(normalizeForHash(raw), 'utf8').digest('hex');
}

/** Repo-relative, forward-slashed, so the row is comparable across machines. */
export function toRepoRelativePath(baseDir: string, path: string): string {
    const normalizedBase = baseDir.replace(/\\/g, '/').replace(/\/+$/, '');
    const normalized = path.replace(/\\/g, '/');
    if (normalizedBase.length > 0 && normalized.startsWith(`${normalizedBase}/`)) {
        return normalized.slice(normalizedBase.length + 1);
    }
    return normalized;
}

function digestOfRows(files: readonly ConsumedInputHash[]): string {
    const hash = createHash('sha256');
    for (const entry of files) {
        hash.update(`${entry.path} ${entry.sha256 ?? 'ABSENT'}\n`, 'utf8');
    }
    return hash.digest('hex');
}

function gitCapture(baseDir: string, args: readonly string[]): string | null {
    try {
        return execFileSync('git', [...args], {
            cwd: baseDir,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
            timeout: 10_000,
        });
    } catch {
        return null;
    }
}

/**
 * Per-process git cache, keyed by baseDir.
 *
 * `runScenario` is called many times per process (the harness contract suite runs ~13
 * scenarios; `run_baseline_regression` runs several), and this worktree is SHARED with
 * other agents, so `git status` can block on `index.lock` while another process commits.
 * Two subprocess spawns per run turns that into a recurring stall. Git state is read once
 * per process and reused: a harness process that runs several scenarios stamps them all
 * with the state at first read, which is the only state that could be meaningful for them
 * anyway. The measurement runs that matter are separate processes, serial per napkin 0d.
 */
interface GitState {
    readonly commit: string | null;
    readonly dirty: boolean | null;
    /** Porcelain lines, e.g. ` M data/derived/x.json`. Empty when clean, null when git is unavailable. */
    readonly dirtyPaths: readonly string[] | null;
}

const gitStateCache = new Map<string, GitState>();

function readGitState(baseDir: string): GitState {
    const cached = gitStateCache.get(baseDir);
    if (cached !== undefined) return cached;

    const headOut = gitCapture(baseDir, ['rev-parse', 'HEAD']);
    const head = headOut === null ? null : headOut.trim();
    const commit = head !== null && /^[0-9a-f]{40}$/.test(head) ? head : null;

    // NO `--untracked-files=no`. An uncommitted engine change dropped in as an untracked
    // file under src/ would otherwise read CLEAN, and two runs at the same commit — one
    // carrying it — would compare identical. That bypass makes the commit hard-fail
    // decorative. Gitignored output roots (`runs/`, `tmp-*`) are not untracked files and
    // never appear here; verified against this repo's .gitignore.
    const statusOut = gitCapture(baseDir, ['status', '--porcelain']);
    const dirtyPaths = statusOut === null
        ? null
        : statusOut.split('\n').map(l => l.trimEnd()).filter(l => l.length > 0);
    const dirty = dirtyPaths === null ? null : dirtyPaths.length > 0;

    const state: GitState = { commit, dirty, dirtyPaths };
    gitStateCache.set(baseDir, state);
    return state;
}

/** Test-only: drop the per-process git cache so a fixture can vary git state. */
export function resetGitStateCacheForTests(): void {
    gitStateCache.clear();
}

/** HEAD sha, or null when git cannot answer. Provenance only — never read by the sim. */
export function readGitCommit(baseDir: string): string | null {
    return readGitState(baseDir).commit;
}

/** Working-tree dirtiness including untracked non-ignored files, or null when git cannot answer. */
export function readGitDirty(baseDir: string): boolean | null {
    return readGitState(baseDir).dirty;
}

/**
 * The porcelain lines behind `readGitDirty`, so a refusal can NAME what is dirty.
 *
 * A gate whose whole job is preventing an attribution error must not emit a message you
 * cannot attribute. The first version said only "the working tree has uncommitted or
 * untracked changes" and cost a round trip: the dirty file turned out to be the PREVIOUS
 * evidence run's own `--map` output, which a one-line list would have made obvious.
 * Same cached read as `readGitDirty` — no extra `git` subprocess.
 */
export function readGitDirtyPaths(baseDir: string): readonly string[] | null {
    return readGitState(baseDir).dirtyPaths;
}

/** The escape-hatch reason from the environment, or undefined. Blank/whitespace is not a reason. */
export function readProvenanceOverride(): string | undefined {
    const raw = process.env[PROVENANCE_OVERRIDE_ENV_VAR];
    if (typeof raw !== 'string') return undefined;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

/** Minimum length for an override reason. A reason nobody can act on is not a reason. */
export const MIN_OVERRIDE_REASON_LENGTH = 12;

export interface BuildRunProvenanceArgs {
    readonly baseDir: string;
    /** Path to the scenario definition this run loaded. */
    readonly scenarioPath: string;
    /** `scenario.init_control` as declared, when present. */
    readonly initControl?: string;
    /** `scenario.init_formations` as declared, when present. */
    readonly initFormations?: string;
    /** `scenario.war_timeline` as declared, when present. */
    readonly warTimeline?: string;
    /** `scenario.init_officers` as declared, when present. */
    readonly initOfficers?: string;
    /**
     * EVERY painted-control snapshot key this run reads, ascending by checkpoint week.
     *
     * A run now scores at every historical checkpoint it reaches, not only its terminal
     * one (HISTORICAL_CHECKPOINTS), so a 188w run opens jan1993, apr1994, apr1995 AND
     * oct1995. Stamping only the terminal key would leave three consumed files unhashed
     * and reintroduce exactly the hole this row exists to close: an identical digest and
     * an identical `final_state_hash` while an intermediate score moved underneath.
     *
     * Supplied by the caller from the runner's own `checkpointsForScenario`, so the stamp
     * and the loader share one source of truth. Empty for scenarios that read none.
     */
    readonly paintedReferenceKeys?: readonly string[];
    readonly harness: RunHarness;
    readonly collapseEnabled: boolean;
}

/**
 * The per-run consumed paths implied by a scenario's declared keys, repo-relative.
 *
 * Resolution goes through the runner's own resolvers (`resolveInitControlPath`,
 * `resolveInitFormationsPath`) and the runner's own template strings for timeline and
 * officers, so this list cannot drift from what is actually loaded.
 */
export function deriveScenarioConsumedInputs(args: {
    readonly baseDir: string;
    readonly scenarioPath: string;
    readonly initControl?: string;
    readonly initFormations?: string;
    readonly warTimeline?: string;
    readonly initOfficers?: string;
    readonly paintedReferenceKeys?: readonly string[];
}): string[] {
    const out: string[] = [toRepoRelativePath(args.baseDir, args.scenarioPath)];
    if (args.initControl) {
        out.push(toRepoRelativePath(args.baseDir, resolveInitControlPath(args.initControl, args.baseDir)));
    }
    if (args.initFormations) {
        out.push(toRepoRelativePath(args.baseDir, resolveInitFormationsPath(args.initFormations, args.baseDir)));
    }
    if (args.warTimeline) {
        out.push(`data/scenarios/timelines/${args.warTimeline}.json`);
    }
    if (args.initOfficers) {
        out.push(`data/scenarios/officers/${args.initOfficers}_officers.json`);
    }
    // The event catalogue governs enclave fall receipts (canon H1.8), so a §6 verdict whose
    // war_1995.json is unhashed is a verdict on an unrecorded input. EVENT_FILES is imported
    // from the loader rather than copied: a second list here would be a second source of truth.
    for (const name of EVENT_FILES) {
        out.push(`data/scenarios/events/${name}`);
    }
    // ── The SCORING REFERENCE. Closes the last KNOWN-UNCOVERED entry in this module's header.
    //
    // WHY IT MATTERS: the painted map is what `matched_osids` is measured AGAINST, and it is not
    // engine code, so `git_commit` does not cover it. Before this row, two runs at the same commit
    // on the same clean tree could carry an identical `consumed_inputs.digest` AND an identical
    // `final_state_hash` — provably the same simulation — and still report different scores,
    // because someone had repainted a cell in between, with NOTHING anywhere recording it. That
    // is not hypothetical: it has now happened twice (`e3a28e25f`, and the Kladanj correction this
    // row was added ahead of).
    //
    // CONDITIONAL AND PER-RUN, NOT A FIXED SET. The keys are a function of the checkpoints the
    // run reaches (`checkpointsForScenario`, which is itself gated on
    // `usesPaintedControlReference`), exported from the runner so this stamp and the loader
    // cannot drift. A fixed `oct1995` row
    // would hash a file a 40w run never opens — the same defect this module refuses for
    // `apr_1992_initial_save.json`, where "the stamp would MATCH while the armies differed".
    // Scenarios that read no painted file get no row, so absence here is itself truthful.
    for (const key of args.paintedReferenceKeys ?? []) {
        out.push(`data/source/calibration/painted_control_${key}.json`);
    }
    return out;
}

export async function buildRunProvenance(args: BuildRunProvenanceArgs): Promise<RunProvenance> {
    const fixed = args.harness === 'desktop'
        ? [...HEADLESS_FIXED_CONSUMED_INPUTS, ...DESKTOP_EXTRA_CONSUMED_INPUTS]
        : [...HEADLESS_FIXED_CONSUMED_INPUTS];
    const perRun = deriveScenarioConsumedInputs(args);
    const relativePaths = Array.from(new Set([...fixed, ...perRun])).sort(strictCompare);

    const files: ConsumedInputHash[] = [];
    for (const relativePath of relativePaths) {
        files.push({
            path: relativePath,
            sha256: await hashFileContent(join(args.baseDir, relativePath)),
        });
    }

    const git = readGitState(args.baseDir);
    const override = readProvenanceOverride();
    return {
        schema_version: RUN_PROVENANCE_SCHEMA_VERSION,
        harness: args.harness,
        git_commit: git.commit,
        git_dirty: git.dirty,
        node_version: process.version,
        collapse_enabled: args.collapseEnabled,
        ...(override !== undefined ? { provenance_override: override } : {}),
        consumed_inputs: { digest: digestOfRows(files), files },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparison — pure, so a consumer needs no filesystem to decide comparability.
// ─────────────────────────────────────────────────────────────────────────────

export interface RunProvenanceComparison {
    /**
     * Everything that defeats comparability: differing consumed content, an unrecognised
     * harness, commit drift, a dirty or uncertifiable tree, schema drift, a Node major
     * mismatch, or an override stamp on either side.
     */
    readonly blockingDifferences: readonly string[];
    /** Recorded differences that do not defeat comparability, but that a reader must see. */
    readonly advisoryDifferences: readonly string[];
    /** True when the runs differ in the collapse gate. Expected for a §6 ON/OFF pair. */
    readonly collapseFlagDiffers: boolean;
}

/** `v24.13.0` → `24`; null when unparseable. */
export function nodeMajorOf(version: string | null): string | null {
    if (version === null) return null;
    const m = /^v?(\d+)\./.exec(version.trim());
    return m === null ? null : m[1];
}

/**
 * Compare two provenance stamps.
 *
 * `collapse_enabled` is EXCLUDED from the blocking set on purpose: for a §6 pair it is the
 * one variable the comparison is supposed to isolate. Everything else that describes how
 * the run was produced must match, or the pair proves nothing about the flag.
 */
export function compareRunProvenance(a: RunProvenance, b: RunProvenance): RunProvenanceComparison {
    const blocking: string[] = [];
    const advisory: string[] = [];

    // ── Harness. Today only `headless` is ever written: the desktop's real startup path
    // (`createStateFromScenario` with the default `initialStateOnly: true`) builds state in
    // memory and writes no run dir at all, so NOTHING produces `'desktop'` and the mismatch
    // branch below is UNREACHABLE until a desktop run-dir writer exists (napkin 0h(C) — do
    // not delete the reachable checks believing this one covers them). It is written as an
    // unrecognised-value check rather than `=== 'headless'` so that the day such a writer
    // lands, it fails CLOSED and names the reason instead of two incomparable harnesses
    // quietly pairing.
    for (const [label, prov] of [['first', a], ['second', b]] as const) {
        if (!RECOGNISED_HARNESSES.includes(prov.harness)) {
            blocking.push(
                `${label} run declares harness '${prov.harness}', which this comparison does not `
                + `recognise (known: ${RECOGNISED_HARNESSES.join(', ')}) — its consumed set is not `
                + `known to be comparable`
            );
        }
    }
    if (a.harness !== b.harness) {
        blocking.push(`harness ${a.harness} vs ${b.harness} — different harnesses read different input sets`);
    }

    // ── Schema. Napkin 0m at field level: a v1 stamp's SILENCE about a path a v2 stamp
    // records is absence of measurement, not evidence of sameness. Comparing across schemas
    // would read the two as matching on everything they happen to share, which is exactly
    // what the old run-dir hash did.
    if (a.schema_version !== b.schema_version) {
        blocking.push(
            `provenance schema_version ${a.schema_version} vs ${b.schema_version} — the older stamp `
            + `is silent about inputs the newer one records, and silence is not sameness`
        );
    }

    // ── Consumed content.
    const byPath = (p: RunProvenance): Map<string, string | null> =>
        new Map(p.consumed_inputs.files.map(f => [f.path, f.sha256]));
    const left = byPath(a);
    const right = byPath(b);
    for (const path of Array.from(new Set([...left.keys(), ...right.keys()])).sort(strictCompare)) {
        const hasLeft = left.has(path);
        const hasRight = right.has(path);
        if (!hasLeft) {
            blocking.push(`${path} (absent from the first run's consumed set)`);
            continue;
        }
        if (!hasRight) {
            blocking.push(`${path} (absent from the second run's consumed set)`);
            continue;
        }
        const lh = left.get(path) ?? null;
        const rh = right.get(path) ?? null;
        if (lh !== rh) {
            blocking.push(`${path} (${lh ?? 'ABSENT'} vs ${rh ?? 'ABSENT'})`);
        }
    }

    // ── Commit. Hard-fail: the stamp hashes DATA, so an engine change between two commits
    // is invisible to it. The only legitimate-looking cross-commit case — reusing an
    // expensive OFF run after changing the engine — is the expensive-rerun shortcut, which
    // is n222/n223 one variable over.
    if (a.git_commit !== b.git_commit) {
        blocking.push(
            `git_commit ${a.git_commit ?? 'unknown'} vs ${b.git_commit ?? 'unknown'} — the stamp hashes `
            + `data, not engine code, so two commits are not comparable even on identical inputs`
        );
    }

    // ── Dirtiness. `null` blocks too: git unavailable means the tree cannot be CERTIFIED
    // clean, and an uncertified tree is not a baseline.
    for (const [label, prov] of [['first', a], ['second', b]] as const) {
        if (prov.git_dirty === true) {
            blocking.push(`${label} run was produced from a DIRTY tree — its commit does not describe it`);
        } else if (prov.git_dirty === null) {
            blocking.push(`${label} run could not certify tree cleanliness (git unavailable at run time)`);
        }
    }

    // ── Interpreter. Major hard-fails; any other difference warns. Napkin 0g is measured,
    // not theoretical: a non-transitive comparator produced nine distinct outputs from 120
    // permutations of one real 5-brigade axis, and local Node is v24 against CI's 22. A
    // minor-version V8 change is the same shape, so it gets somewhere to show up rather
    // than a hard-fail CI runners would trip unasked.
    const majorA = nodeMajorOf(a.node_version);
    const majorB = nodeMajorOf(b.node_version);
    if (majorA !== majorB) {
        blocking.push(`node major ${majorA ?? 'unknown'} vs ${majorB ?? 'unknown'} (${a.node_version ?? 'unknown'} vs ${b.node_version ?? 'unknown'})`);
    } else if (a.node_version !== b.node_version) {
        advisory.push(`node_version ${a.node_version ?? 'unknown'} vs ${b.node_version ?? 'unknown'} (same major)`);
    }

    // ── Escape hatch. Presence disqualifies; it never silences.
    //
    // UNREACHABLE VIA `selectS6RunDirs`, which now excludes override-stamped runs from
    // candidacy before pairing (owner ruling, 2026-08-17) so one exploratory run cannot red
    // the gate for everyone. Kept because this function is the general comparison and can be
    // called directly, and because it must fail CLOSED if the exclusion is ever removed.
    // Named as unreachable per napkin 0h(C): do not delete the exclusion believing this
    // covers it, or the other way round — they defend different callers.
    for (const [label, prov] of [['first', a], ['second', b]] as const) {
        if (prov.provenance_override !== undefined) {
            blocking.push(
                `${label} run carries provenance_override ("${prov.provenance_override}") — it was `
                + `started past a start-time gate and cannot license a §6 verdict; supersede it with a clean run`
            );
        }
    }

    return {
        blockingDifferences: blocking,
        advisoryDifferences: advisory,
        collapseFlagDiffers: a.collapse_enabled !== b.collapse_enabled,
    };
}

/** Outcome of reading a stamp: never conflate "no stamp" with "broken stamp". */
export type RunProvenanceRead =
    | { readonly kind: 'absent' }
    | { readonly kind: 'corrupt'; readonly detail: string }
    | { readonly kind: 'ok'; readonly provenance: RunProvenance };

/**
 * Structural parse of a `run_meta.json` payload's `provenance` block.
 *
 * ABSENT and CORRUPT are DIFFERENT ANSWERS. Collapsing both to null (the first version of
 * this module) makes a truncated stamp report "this run predates stamping", which is false
 * about the artifact and routes a broken run into the benign SKIP path. Interrupted runs
 * are the realistic source of a partially-written `run_meta.json`.
 */
export function readRunProvenanceFrom(runMeta: unknown): RunProvenanceRead {
    if (typeof runMeta !== 'object' || runMeta === null) {
        return { kind: 'corrupt', detail: 'run_meta.json is not a JSON object' };
    }
    const raw = (runMeta as { provenance?: unknown }).provenance;
    if (raw === undefined) return { kind: 'absent' };
    if (typeof raw !== 'object' || raw === null) {
        return { kind: 'corrupt', detail: 'provenance is present but is not an object' };
    }
    const p = raw as Record<string, unknown>;

    const consumed = p.consumed_inputs;
    if (typeof consumed !== 'object' || consumed === null) {
        return { kind: 'corrupt', detail: 'provenance.consumed_inputs is missing or not an object' };
    }
    const c = consumed as Record<string, unknown>;
    if (typeof c.digest !== 'string') {
        return { kind: 'corrupt', detail: 'provenance.consumed_inputs.digest is missing or not a string' };
    }
    if (!Array.isArray(c.files)) {
        return { kind: 'corrupt', detail: 'provenance.consumed_inputs.files is missing or not an array' };
    }
    const files: ConsumedInputHash[] = [];
    for (const entry of c.files) {
        if (typeof entry !== 'object' || entry === null) {
            return { kind: 'corrupt', detail: 'a consumed_inputs.files entry is not an object' };
        }
        const e = entry as Record<string, unknown>;
        if (typeof e.path !== 'string') {
            return { kind: 'corrupt', detail: 'a consumed_inputs.files entry has no string path' };
        }
        if (e.sha256 !== null && typeof e.sha256 !== 'string') {
            return { kind: 'corrupt', detail: `consumed_inputs row '${e.path}' has a non-string, non-null sha256` };
        }
        files.push({ path: e.path, sha256: (e.sha256 as string | null) ?? null });
    }
    if (typeof p.schema_version !== 'number') {
        return { kind: 'corrupt', detail: 'provenance.schema_version is missing or not a number' };
    }
    if (typeof p.harness !== 'string') {
        return { kind: 'corrupt', detail: 'provenance.harness is missing or not a string' };
    }
    if (typeof p.collapse_enabled !== 'boolean') {
        return { kind: 'corrupt', detail: 'provenance.collapse_enabled is missing or not a boolean' };
    }
    if (p.provenance_override !== undefined && typeof p.provenance_override !== 'string') {
        return { kind: 'corrupt', detail: 'provenance.provenance_override is present but not a string' };
    }

    return {
        kind: 'ok',
        provenance: {
            schema_version: p.schema_version,
            harness: p.harness,
            git_commit: typeof p.git_commit === 'string' ? p.git_commit : null,
            git_dirty: typeof p.git_dirty === 'boolean' ? p.git_dirty : null,
            node_version: typeof p.node_version === 'string' ? p.node_version : null,
            collapse_enabled: p.collapse_enabled,
            ...(typeof p.provenance_override === 'string' ? { provenance_override: p.provenance_override } : {}),
            consumed_inputs: { digest: c.digest, files },
        },
    };
}
