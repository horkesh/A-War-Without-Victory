/**
 * Deterministic §6 G2 run-artifact selection, and PAIR COMPARABILITY.
 *
 * DEFECT 1 (RC panel, 2026-08-13): the §6 G2 invariant suite picked its 188w artifacts by
 * FILESYSTEM MTIME (`statSync(b).mtimeMs - statSync(a).mtimeMs`). Two problems:
 *  1. mtime is not a property of the run — it is a property of this checkout. A `git
 *     clone`, a `touch`, a backup restore, or a different machine reorders the candidate
 *     list and silently changes WHICH artifact the §6 invariants are asserted against.
 *     That is nondeterminism in the gate that guards the game's hardest canon line.
 *  2. The prefix filter `apr1992_definitive_188w__` also matches TRUNCATED runs of the
 *     same scenario (`__w5_`, `__w43_`, `__w60_` dirs exist in runs/ right now). A
 *     truncated run cannot satisfy §6 — Srebrenica has not fallen at week 5 — so an
 *     mtime shuffle could point the sentinel at an artifact that must fail.
 *
 * SELECTION RULE (no fs metadata anywhere in it):
 *  - candidate  = a FULL-LENGTH (`__w188`) run dir of the definitive 188w scenario that
 *                 actually carries a `final_save.json`;
 *  - partition  = collapse-ON vs collapse-OFF, read from the run's PROVENANCE STAMP;
 *  - order      = run counter DESCENDING, then `strictCompare(name)`.
 *
 * The counter is the `_n<counter>` suffix `getNextRunCounter()` stamps on unique run
 * folders. It is monotonic per run creation, so "highest counter" is the recency proxy
 * mtime was reaching for — except it is carried in the artifact's own name, is identical
 * on every machine and every checkout, and cannot be perturbed by touching a file.
 *
 * ONE SOURCE OF TRUTH FOR THE FLAG (2026-08-17). Partitioning used to read
 * `existsSync('collapse_enabled.json')`. That sidecar and `provenance.collapse_enabled`
 * now answer the same question, and the sidecar is the forgeable one — a file anyone can
 * copy into a run dir. Two sources of truth for one fact is the defect; guarding the
 * divergence would only have detected it. The stamp is authoritative; the marker survives
 * ONLY as the fallback for unstamped runs, which cannot form a pair anyway.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEFECT 2 (ledger 2026-08-17): the rule above is deterministic and still selected a
 * WORTHLESS PAIR. It validated recency and marker only, never PAIR COMPARABILITY. It
 * paired ON = `…w188_n222` (marked, pre-R7-Phase-2 OOB, three HVO brigades present)
 * against OFF = `…w188_n223` (unmarked, post-R7-Phase-2 OOB, those brigades deleted). The
 * pair differed by the collapse flag AND an entire OOB change set. A §6 test attributed 33
 * differing cells wholly to the flag; the project ledger attributed the same 33 wholly to
 * the OOB change. Two conclusions, opposite causes, one comparison.
 *
 * ★ TWO WAYS TO HAVE NO VERDICT, AND THEY MUST NOT LOOK ALIKE:
 *
 *  - `pairRefusal` ⇒ **SKIPPED**. Nobody did anything wrong — the runs predate the stamp,
 *    or one side does not exist. `AWWV_REQUIRE_S6_EXECUTION` escalates it for evidence runs.
 *  - `pairFailure` ⇒ **FAIL, RED, always.** Somebody produced a bad pair, or the tree
 *    drifted under them. If a confounded pair degraded to SKIPPED it would be
 *    indistinguishable from "no runs yet", and the entire point of this module is that a
 *    silent confound becomes a LOUD failure. n222/n223 would have been *skipped* under a
 *    merged treatment, and nobody would have learned anything.
 *
 * A CORRUPT stamp is a FAILURE, not a skip: `absent` and `corrupt` are different answers,
 * and reporting a truncated `run_meta.json` as "predates stamping" is false about the
 * artifact. Interrupted runs are the realistic source of one.
 *
 * WHY THIS DOES NOT THROW AT MODULE SCOPE. Both §6 suites call `selectS6RunDirs` at import
 * time. Commit drift is a hard failure and is ALSO the steady state of a `runs/` directory
 * — selection takes the highest-counter marked and unmarked runs, which will routinely
 * come from different commits — so throwing here would red both suites entirely, including
 * derivation pins (712 universe, SET A 84, SET B 43, D2 dead keys) that read no artifact
 * and have nothing to do with comparability. That is `docs/life_lessons.md:19`: a
 * permanently-red gate is worse than a missing one, it swallows everything after it, and it
 * gets deleted by the third person who hits it on a clean checkout. The verdict is returned
 * here; the pair-dependent CASES throw it, loudly and individually.
 *
 * `on`/`off`/`any` keep their old meaning — the raw partition winners, used by cases that
 * read ONE artifact. Only `pair` is comparability-validated; every ON-vs-OFF criterion must
 * read `pair`, never `on`+`off`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { strictCompare } from '../../src/state/validateGameState.js';
import {
    compareRunProvenance,
    readRunProvenanceFrom,
    type RunProvenance,
    type RunProvenanceRead,
} from '../../src/scenario/run_provenance.js';

/** Full-length definitive-188w run dirs only — `__w5_`/`__w43_`/`__w60_` are excluded. */
export const S6_RUN_DIR_PATTERN = /^apr1992_definitive_188w__[0-9a-f]+__w188(?:_n(\d+))?$/;

/**
 * Legacy sidecar written by scenario_runner.ts on the ENABLE_COLLAPSE=true path.
 * NO LONGER AUTHORITATIVE — see "one source of truth" above. Read only for runs that
 * carry no provenance stamp.
 */
export const COLLAPSE_MARKER_FILE = 'collapse_enabled.json';

export interface S6RunCandidate {
    /** Run-dir basename (NOT a path) — the whole selection key. */
    readonly name: string;
    /**
     * Collapse-ON. Derived from `provenance.collapse_enabled` when the run is stamped, and
     * from the legacy sidecar only when it is not.
     */
    readonly marked: boolean;
    /**
     * How reading this run's stamp went. Defaults to `absent` so existing synthetic
     * candidates keep meaning "legacy, unstamped".
     */
    readonly provenance?: RunProvenanceRead;
}

/** Thrown by a pair-dependent §6 case when the two runs are NOT comparable. */
export class S6PairComparabilityError extends Error {
    readonly onDir: string;
    readonly offDir: string;
    readonly differences: readonly string[];

    constructor(message: string, onDir: string, offDir: string, differences: readonly string[]) {
        super(message);
        this.name = 'S6PairComparabilityError';
        this.onDir = onDir;
        this.offDir = offDir;
        this.differences = differences;
    }
}

export interface S6Pair {
    readonly on: string;
    readonly off: string;
}

export interface S6Selection {
    /** Highest-precedence collapse-ON candidate (G2-A), or null. */
    readonly on: string | null;
    /** Highest-precedence collapse-OFF candidate, or null. */
    readonly off: string | null;
    /** Highest-precedence candidate of either kind (the ON-or-OFF sentinel), or null. */
    readonly any: string | null;
    /**
     * The COMPARABILITY-VALIDATED ON/OFF pair, or null. Every ON-vs-OFF §6 criterion must
     * read this and not `on`+`off`.
     */
    readonly pair: S6Pair | null;
    /** Benign reason no pair exists ⇒ the case SKIPS. Mutually exclusive with `pairFailure`. */
    readonly pairRefusal: string | null;
    /** A pair was formed and is BAD ⇒ the case FAILS. Mutually exclusive with `pairRefusal`. */
    readonly pairFailure: string | null;
    /** Differences that do not defeat comparability but that a reader must see. */
    readonly pairWarnings: readonly string[];
    /**
     * Runs removed from candidacy because they carry `provenance_override` — they were
     * started past a start-time gate and can never license a §6 verdict.
     *
     * NEVER EXEMPT, ALWAYS ROUTE INTO AN ASSERTED BUCKET. Excluding them silently is the
     * degradation this module exists to remove, so the receipt names the COUNT and the
     * DIRECTORIES, and the suites assert that it does.
     */
    readonly excludedOverrideRuns: readonly string[];
    readonly counts: { readonly total: number; readonly marked: number; readonly unmarked: number };
}

/** `_n<counter>` suffix, or -1 when the dir carries none (sorts last). */
export function runCounterOf(name: string): number {
    const m = S6_RUN_DIR_PATTERN.exec(name);
    if (m === null || m[1] === undefined) return -1;
    return Number.parseInt(m[1], 10);
}

/** Higher counter first, then strictCompare(name). Total order; no fs metadata. */
export function compareS6Candidates(a: S6RunCandidate, b: S6RunCandidate): number {
    const ca = runCounterOf(a.name);
    const cb = runCounterOf(b.name);
    if (ca !== cb) return cb - ca;
    return strictCompare(a.name, b.name);
}

export interface S6PairDecision {
    readonly pair: S6Pair | null;
    /** Benign — SKIP. */
    readonly refusal: string | null;
    /** Bad pair — FAIL. */
    readonly failure: string | null;
    readonly warnings: readonly string[];
}

function formatFailure(
    onName: string,
    offName: string,
    summary: string,
    differences: readonly string[]
): string {
    return `§6 ON/OFF pair is NOT COMPARABLE and no §6 verdict may be drawn from it.\n`
        + `  collapse-ON : ${onName}\n`
        + `  collapse-OFF: ${offName}\n`
        + `  ${summary}\n`
        + differences.map(d => `    - ${d}`).join('\n')
        + `\n  This is a FAILURE, not a skip: a pair exists and it is bad. Any difference between`
        + ` these artifacts is attributable to the collapse flag OR to the differences above, and`
        + ` nothing in the artifacts can tell them apart — the n222/n223 confound (ledger`
        + ` 2026-08-17). Produce a controlled pair: two 188w runs from the same clean commit,`
        + ` same Node major, differing only in ENABLE_COLLAPSE.`;
}

/**
 * Decide whether two candidates form an admissible §6 ON/OFF pair.
 *
 * LEGACY RUNS (no stamp): REFUSED (skip), not failed. Every 188w artifact in `runs/` today
 * predates the stamp, so this refuses every pair the current tree could form — which is the
 * correct answer and not a regression: the ledger's standing ruling is that "until a
 * controlled pair exists … no §6 verdict on those criteria is admissible in either
 * direction." Degrading legacy to a warning would restore the silent confound.
 *
 * CORRUPT stamps: FAILED, not refused. See the header.
 */
export function computeS6Pair(
    on: S6RunCandidate | null,
    off: S6RunCandidate | null
): S6PairDecision {
    if (on === null || off === null) {
        return {
            pair: null,
            refusal: on === null && off === null
                ? 'no collapse-ON and no collapse-OFF 188w candidate'
                : on === null
                    ? 'no collapse-ON 188w candidate'
                    : 'no collapse-OFF 188w candidate',
            failure: null,
            warnings: [],
        };
    }

    const onRead: RunProvenanceRead = on.provenance ?? { kind: 'absent' };
    const offRead: RunProvenanceRead = off.provenance ?? { kind: 'absent' };

    // Corrupt is a FAILURE — a broken artifact must not route into the benign skip path.
    const corrupt: string[] = [];
    if (onRead.kind === 'corrupt') corrupt.push(`${on.name}: ${onRead.detail}`);
    if (offRead.kind === 'corrupt') corrupt.push(`${off.name}: ${offRead.detail}`);
    if (corrupt.length > 0) {
        return {
            pair: null,
            refusal: null,
            failure: formatFailure(
                on.name,
                off.name,
                'run_meta.json carries a MALFORMED provenance stamp (this is a broken artifact, '
                + 'NOT an unstamped legacy run — an interrupted run is the usual cause):',
                corrupt
            ),
            warnings: [],
        };
    }

    if (onRead.kind !== 'ok' || offRead.kind !== 'ok') {
        const unstamped = [
            onRead.kind !== 'ok' ? on.name : null,
            offRead.kind !== 'ok' ? off.name : null,
        ].filter((x): x is string => x !== null);
        return {
            pair: null,
            refusal:
                `run(s) predate run-provenance stamping (2026-08-17) and carry no `
                + `run_meta.json provenance block: ${unstamped.join(', ')}. Comparability `
                + `cannot be established from the artifacts, so no §6 ON/OFF verdict is `
                + `admissible in either direction. Re-run at HEAD to produce a stamped pair.`,
            failure: null,
            warnings: [],
        };
    }

    const cmp = compareRunProvenance(onRead.provenance, offRead.provenance);
    if (cmp.blockingDifferences.length > 0) {
        return {
            pair: null,
            refusal: null,
            failure: formatFailure(
                on.name,
                off.name,
                `${cmp.blockingDifferences.length} difference(s) defeat comparability:`,
                cmp.blockingDifferences
            ),
            warnings: [],
        };
    }

    // Structurally unreachable while the partition is derived from `collapse_enabled`:
    // `marked` IS that field for a stamped run, so a stamped ON/OFF pair differs in it by
    // construction. Kept, and named as unreachable (napkin 0h(C)), so that re-introducing
    // sidecar-based partitioning fails CLOSED here instead of silently pairing two runs
    // that never isolated the variable the comparison exists to isolate.
    if (!cmp.collapseFlagDiffers) {
        return {
            pair: null,
            refusal: null,
            failure: formatFailure(
                on.name,
                off.name,
                'both runs record the same collapse_enabled value, so the pair does not isolate '
                + 'the collapse flag (unreachable while partitioning reads the stamp — if you are '
                + 'seeing this, partitioning has been changed back to the forgeable sidecar):',
                [`collapse_enabled=${String(onRead.provenance.collapse_enabled)} on both sides`]
            ),
            warnings: [],
        };
    }

    return {
        pair: { on: on.name, off: off.name },
        refusal: null,
        failure: null,
        warnings: [...cmp.advisoryDifferences],
    };
}

/**
 * Pure selection over a candidate list. Independent of input order. NEVER THROWS — the
 * verdict is returned for the pair-dependent cases to act on. See the header for why.
 */
export function selectS6RunDirs(candidates: readonly S6RunCandidate[]): S6Selection {
    const eligible = candidates
        .filter(c => S6_RUN_DIR_PATTERN.test(c.name))
        .slice()
        .sort(compareS6Candidates);

    /*
     * CORRUPTION IS CHECKED ACROSS THE WHOLE ELIGIBLE SET, NOT JUST THE SELECTED PAIR.
     *
     * Found by the end-to-end mutation matrix, and it is the silent-degradation shape this
     * module exists to remove: a run whose stamp will not parse cannot be CLASSIFIED, so
     * `isCollapseOn` falls back to the sidecar — and a corrupt collapse-ON run with no
     * sidecar silently lands in the OFF partition. It is then never selected as ON, the pair
     * reports "no collapse-ON candidate", and the case SKIPS. A broken artifact would have
     * quietly changed which runs were compared and reported nothing.
     *
     * So corruption fails here, before partitioning can absorb it, naming the directory. A
     * malformed `run_meta.json` in the evidence tree is always worth fixing: delete the run
     * or re-run it.
     */
    const corruptCandidates = eligible.filter(
        (c): c is S6RunCandidate & { provenance: { kind: 'corrupt'; detail: string } } =>
            c.provenance !== undefined && c.provenance.kind === 'corrupt'
    );
    if (corruptCandidates.length > 0) {
        const rows = corruptCandidates.map(c => `${c.name}: ${c.provenance.detail}`);
        return {
            on: null,
            off: null,
            any: eligible.length > 0 ? eligible[0].name : null,
            pair: null,
            pairRefusal: null,
            pairFailure:
                `§6 artifact selection found ${corruptCandidates.length} run(s) with a MALFORMED `
                + `run_meta.json provenance stamp. These are BROKEN ARTIFACTS, not unstamped legacy `
                + `runs — an interrupted run is the usual cause.\n`
                + rows.map(r => `    - ${r}`).join('\n')
                + `\n  This is a FAILURE, not a skip. A run whose stamp will not parse cannot be`
                + ` classified as collapse-ON or collapse-OFF, so leaving it in the candidate set`
                + ` lets it silently change WHICH runs get compared. Delete the run directory or`
                + ` re-run it, then re-run the §6 suites.`,
            pairWarnings: [],
            excludedOverrideRuns: [],
            counts: { total: eligible.length, marked: 0, unmarked: 0 },
        };
    }

    /*
     * OVERRIDE RUNS ARE EXCLUDED FROM CANDIDACY, AND NAMED (owner ruling, 2026-08-17).
     *
     * "Using the hatch is what disqualifies the run" stands — but disqualifying the RUN is
     * not disqualifying the GATE. Left in the candidate set, the first exploratory override
     * run becomes the highest-counter ON candidate and reds four differential cases for
     * everyone until somebody supersedes it. That is the permanently-red-gate shape the
     * throw was moved into the cases to avoid (life_lessons.md:19); applying the lesson to
     * one and not the other would be incoherent.
     *
     * Excluding SILENTLY would be worse, so this is the never-exempt-always-route pattern:
     * they come out of candidacy AND go into `excludedOverrideRuns`, which the receipt
     * prints and the suites assert on. Consequence worth knowing: if the only collapse-ON
     * run carries an override, the pair goes REFUSED (skip) rather than red, and the
     * receipt line is what tells you an ON run exists but is disqualified.
     */
    const excludedOverrideRuns = eligible
        .filter(c => c.provenance?.kind === 'ok' && c.provenance.provenance.provenance_override !== undefined)
        .map(c => c.name);
    const admissible = eligible.filter(c => !excludedOverrideRuns.includes(c.name));

    const marked = admissible.filter(c => c.marked);
    const unmarked = admissible.filter(c => !c.marked);
    const onCandidate = marked.length > 0 ? marked[0] : null;
    const offCandidate = unmarked.length > 0 ? unmarked[0] : null;
    const decision = computeS6Pair(onCandidate, offCandidate);
    return {
        on: onCandidate?.name ?? null,
        off: offCandidate?.name ?? null,
        // The sentinel reads ONE artifact and needs no comparability, but an override run is
        // still not §6 evidence, so it is excluded here too.
        any: admissible.length > 0 ? admissible[0].name : null,
        pair: decision.pair,
        pairRefusal: decision.refusal,
        pairFailure: decision.failure,
        pairWarnings: decision.warnings,
        excludedOverrideRuns,
        counts: { total: admissible.length, marked: marked.length, unmarked: unmarked.length },
    };
}

/**
 * Throw the pair verdict, if it is a failure. Called by every pair-dependent §6 case, so a
 * bad pair is RED at the case rather than at module load.
 */
export function assertS6PairComparable(selection: S6Selection): void {
    if (selection.pairFailure !== null) {
        throw new S6PairComparabilityError(
            selection.pairFailure,
            selection.on ?? '(none)',
            selection.off ?? '(none)',
            selection.pairFailure.split('\n').filter(l => l.trimStart().startsWith('- '))
        );
    }
}

/** `run_meta.json` provenance for one run dir: absent, corrupt, or parsed. */
export function readRunProvenance(runDir: string): RunProvenanceRead {
    const metaPath = join(runDir, 'run_meta.json');
    if (!existsSync(metaPath)) return { kind: 'absent' };
    let parsed: unknown;
    try {
        parsed = JSON.parse(readFileSync(metaPath, 'utf8')) as unknown;
    } catch (err) {
        // A truncated or unparseable run_meta.json is a BROKEN artifact, never a legacy one.
        return { kind: 'corrupt', detail: `run_meta.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}` };
    }
    return readRunProvenanceFrom(parsed);
}

/** The authoritative collapse-ON answer for a candidate: stamp first, sidecar only as fallback. */
function isCollapseOn(dir: string, read: RunProvenanceRead): boolean {
    if (read.kind === 'ok') return read.provenance.collapse_enabled;
    // Unstamped or broken: fall back to the legacy sidecar purely so the run still lands in
    // a partition. Neither can form a pair, so this never licenses a verdict.
    return existsSync(join(dir, COLLAPSE_MARKER_FILE));
}

/**
 * Read the candidate set off disk. The ONLY fs access is existence/type and the CONTENT of
 * `run_meta.json` — never mtime, never size, never ordering from `readdirSync` (the sort
 * below is total on names).
 */
export function scanS6RunCandidates(runsDir: string): S6RunCandidate[] {
    if (!existsSync(runsDir)) return [];
    const candidates: S6RunCandidate[] = [];
    for (const name of readdirSync(runsDir)) {
        if (!S6_RUN_DIR_PATTERN.test(name)) continue;
        const dir = join(runsDir, name);
        try {
            if (!statSync(dir).isDirectory()) continue;
        } catch {
            continue;
        }
        if (!existsSync(join(dir, 'final_save.json'))) continue;
        const provenance = readRunProvenance(dir);
        candidates.push({ name, marked: isCollapseOn(dir, provenance), provenance });
    }
    return candidates.sort(compareS6Candidates);
}

/** Convenience for fixtures and callers that already hold a parsed stamp. */
export function stampedCandidate(
    name: string,
    provenance: RunProvenance
): S6RunCandidate {
    return { name, marked: provenance.collapse_enabled, provenance: { kind: 'ok', provenance } };
}
