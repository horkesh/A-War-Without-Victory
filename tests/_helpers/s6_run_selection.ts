/**
 * Deterministic §6 G2 run-artifact selection.
 *
 * DEFECT (RC panel, 2026-08-13): the §6 G2 invariant suite picked its 188w artifacts by
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
 *  - partition  = `collapse_enabled.json` marker present (collapse-ON, proven) vs absent
 *                 (collapse-OFF; pre-marker IV-a artifacts classify OFF by design);
 *  - order      = run counter DESCENDING, then `strictCompare(name)`.
 *
 * The counter is the `_n<counter>` suffix `getNextRunCounter()` stamps on unique run
 * folders. It is monotonic per run creation, so "highest counter" is the recency proxy
 * mtime was reaching for — except it is carried in the artifact's own name, is identical
 * on every machine and every checkout, and cannot be perturbed by touching a file.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { strictCompare } from '../../src/state/validateGameState.js';

/** Full-length definitive-188w run dirs only — `__w5_`/`__w43_`/`__w60_` are excluded. */
export const S6_RUN_DIR_PATTERN = /^apr1992_definitive_188w__[0-9a-f]+__w188(?:_n(\d+))?$/;

/** Sidecar written by scenario_runner.ts on the ENABLE_COLLAPSE=true path only (G2-A). */
export const COLLAPSE_MARKER_FILE = 'collapse_enabled.json';

export interface S6RunCandidate {
    /** Run-dir basename (NOT a path) — the whole selection key. */
    readonly name: string;
    /** `collapse_enabled.json` present ⇒ the run is PROVEN collapse-ON. */
    readonly marked: boolean;
}

export interface S6Selection {
    /** Highest-precedence marker-verified collapse-ON candidate (G2-A), or null. */
    readonly on: string | null;
    /** Highest-precedence unmarked (collapse-OFF) candidate (G2-B baseline side), or null. */
    readonly off: string | null;
    /** Highest-precedence candidate of either kind (the ON-or-OFF sentinel), or null. */
    readonly any: string | null;
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

/** Pure selection over a candidate list. Independent of input order. */
export function selectS6RunDirs(candidates: readonly S6RunCandidate[]): S6Selection {
    const eligible = candidates
        .filter(c => S6_RUN_DIR_PATTERN.test(c.name))
        .slice()
        .sort(compareS6Candidates);
    const marked = eligible.filter(c => c.marked);
    const unmarked = eligible.filter(c => !c.marked);
    return {
        on: marked.length > 0 ? marked[0].name : null,
        off: unmarked.length > 0 ? unmarked[0].name : null,
        any: eligible.length > 0 ? eligible[0].name : null,
        counts: { total: eligible.length, marked: marked.length, unmarked: unmarked.length },
    };
}

/**
 * Read the candidate set off disk. The ONLY fs access is existence/type — never mtime,
 * never size, never ordering from `readdirSync` (the sort below is total on names).
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
        candidates.push({ name, marked: existsSync(join(dir, COLLAPSE_MARKER_FILE)) });
    }
    return candidates.sort(compareS6Candidates);
}
