#!/usr/bin/env node
/**
 * Branch hygiene: classify every branch, archive what is unique, delete what is not.
 *
 * WHY THIS EXISTS. On 2026-09-01 the repo had 40 local and 50 remote branches. Every lane
 * creates a branch; nothing ever deleted one. Work landed by squash-merge or cherry-pick,
 * which leaves the original branch looking "unmerged" forever, so the list only ever grew
 * and no one could tell abandoned pointers from real stranded work without a manual audit.
 *
 * THE MEASUREMENT THAT MATTERS. `git branch --no-merged` compares commit ANCESTRY, so a
 * squash-merged branch always looks unmerged. `git diff main..branch` is worse: it counts
 * main's own progress as the branch's differences (it reported 300-1200 changed files for
 * branches that had already fully landed). `git cherry` compares PATCH IDs and is the only
 * one of the three that answers the real question — is this work in main already?
 *   '-' = an equivalent patch is already in main
 *   '+' = genuinely absent
 *
 * THE SAFETY RULE, which is the whole point: a branch is only ever deleted when it has
 * ZERO unique commits, or when an archive/<branch> tag already points at its tip. Work is
 * never destroyed — it is turned into a tag, which is a permanent ref that survives branch
 * deletion and can be restored with `git switch -c <branch> archive/<branch>`.
 *
 * Usage:
 *   node tools/repo/branch_hygiene.mjs                 # report only (default, no writes)
 *   node tools/repo/branch_hygiene.mjs --archive       # tag branches that have unique work
 *   node tools/repo/branch_hygiene.mjs --prune         # delete landed/archived branches
 *   node tools/repo/branch_hygiene.mjs --archive --prune --remote --push
 *
 * Flags:
 *   --remote   include origin/* branches
 *   --push     push archive tags / delete remote branches (otherwise local only)
 *   --keep=a,b branches never touched (always includes main and the current branch)
 *
 * Determinism: no wall-clock, no randomness. Branch lists are sorted before use.
 */

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ARCHIVE_PREFIX = 'archive/';
const ALWAYS_KEEP = ['main'];

function git(args, { allowFail = false } = {}) {
    try {
        return execFileSync('git', args, { encoding: 'utf8' }).trim();
    } catch (error) {
        if (allowFail) return '';
        throw error;
    }
}

/**
 * Run a git command for its EXIT STATUS. True if it succeeded.
 *
 * Deliberately separate from `git()` rather than making that return null on failure. `git()`
 * returns `''` when `allowFail` swallows an error, and `hasArchiveTag` tests the result with
 * `!== ''` — so a null-on-failure contract would make a MISSING archive tag read as present, and
 * this tool would delete unique work believing it had been archived. The safe change is a new
 * helper, not a new meaning for the old one.
 */
function gitOk(args) {
    try {
        execFileSync('git', args, { encoding: 'utf8', stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function strictCompare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

function parseArgs(argv) {
    const opts = { archive: false, prune: false, remote: false, push: false, keep: [] };
    for (const arg of argv) {
        if (arg === '--archive') opts.archive = true;
        else if (arg === '--prune') opts.prune = true;
        else if (arg === '--remote') opts.remote = true;
        else if (arg === '--push') opts.push = true;
        else if (arg.startsWith('--keep=')) opts.keep = arg.slice('--keep='.length).split(',').filter(Boolean);
        else throw new Error(`Unknown argument: ${arg}`);
    }
    return opts;
}

/** Unique (not-yet-in-main) commit count, by PATCH ID rather than ancestry. */
export function uniqueCommitCount(ref, upstream = 'origin/main') {
    const out = git(['cherry', upstream, ref], { allowFail: true });
    if (!out) return 0;
    return out.split('\n').filter((line) => line.startsWith('+')).length;
}

function hasArchiveTag(branch) {
    return git(['rev-parse', '--verify', '--quiet', `${ARCHIVE_PREFIX}${branch}`], { allowFail: true }) !== '';
}

/**
 * LANDED  -> zero unique commits; deleting loses nothing.
 * ARCHIVED-> unique commits, but archive/<branch> already preserves them.
 * STRANDED-> unique commits and NO archive tag; never deleted without --archive first.
 */
export function classify(branch, upstream = 'origin/main') {
    const unique = uniqueCommitCount(branch, upstream);
    if (unique === 0) return { branch, unique, state: 'LANDED' };
    if (hasArchiveTag(branch.replace(/^origin\//, ''))) return { branch, unique, state: 'ARCHIVED' };
    return { branch, unique, state: 'STRANDED' };
}

function localBranches() {
    return git(['for-each-ref', '--format=%(refname:short)', 'refs/heads'])
        .split('\n').filter(Boolean).sort(strictCompare);
}

function remoteBranches() {
    return git(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'])
        .split('\n').filter(Boolean)
        // refs/remotes/origin/HEAD shortens to bare "origin", not "origin/HEAD", so filter
        // on the shape instead: a real remote branch is always "origin/<something>".
        .filter((r) => r !== 'origin' && r !== 'origin/HEAD' && r.startsWith('origin/'))
        .sort(strictCompare);
}

function main(argv) {
    const opts = parseArgs(argv);
    const current = git(['rev-parse', '--abbrev-ref', 'HEAD'], { allowFail: true });
    const keep = new Set([...ALWAYS_KEEP, ...opts.keep, current].filter(Boolean));

    const refs = [...localBranches(), ...(opts.remote ? remoteBranches() : [])];
    const rows = [];
    for (const ref of refs) {
        const name = ref.replace(/^origin\//, '');
        if (keep.has(name) || keep.has(ref)) continue;
        rows.push({ ...classify(ref), name, remote: ref.startsWith('origin/') });
    }

    for (const state of ['STRANDED', 'ARCHIVED', 'LANDED']) {
        const group = rows.filter((r) => r.state === state);
        if (group.length === 0) continue;
        console.log(`\n${state} (${group.length}):`);
        for (const r of group) console.log(`  ${String(r.unique).padStart(4)} unique  ${r.branch}`);
    }

    if (opts.archive) {
        const stranded = rows.filter((r) => r.state === 'STRANDED');
        for (const r of stranded) {
            git(['tag', '-f', `${ARCHIVE_PREFIX}${r.name}`, r.branch]);
            r.state = 'ARCHIVED';
            console.log(`archived ${r.branch} -> ${ARCHIVE_PREFIX}${r.name}`);
        }
        if (opts.push && stranded.length > 0) git(['push', 'origin', '--tags']);
    }

    if (opts.prune) {
        // Re-derive rather than trust the earlier pass: --archive may have just changed state.
        const deletable = rows.filter((r) => r.state === 'LANDED'
            || (r.unique > 0 && hasArchiveTag(r.name)));
        const refused = rows.filter((r) => !deletable.includes(r));
        for (const r of refused) console.log(`REFUSING (unique work, no archive tag): ${r.branch}`);

        const localDel = deletable.filter((r) => !r.remote).map((r) => r.branch);
        const remoteDel = deletable.filter((r) => r.remote).map((r) => r.name);
        // COUNT OUTCOMES, NOT INTENTIONS. This reported `deleted ${localDel.length}` after firing
        // the deletes through `allowFail`, which swallows the error — so on 2026-09-12 it printed
        // "deleted 7 local branch(es)" while all seven had failed with "cannot delete branch 'x'
        // used by worktree at ...". Every branch was still there. A hygiene tool that reports
        // success without acting is worse than no tool, which this file already knew.
        const deletedLocal = [];
        const heldByWorktree = [];
        for (const b of localDel) {
            if (gitOk(['branch', '-D', b])) deletedLocal.push(b);
            else heldByWorktree.push(b);
        }
        if (deletedLocal.length > 0) console.log(`deleted ${deletedLocal.length} local branch(es)`);
        if (heldByWorktree.length > 0) {
            console.log(`${heldByWorktree.length} local branch(es) still checked out in a worktree, left alone:`);
            for (const b of heldByWorktree) console.log(`  ${b}`);
            console.log('  (remove the worktree first: git worktree remove <path>)');
        }
        if (opts.push && remoteDel.length > 0) {
            // ONE AT A TIME, and a missing ref is success rather than failure.
            //
            // This was a single batched `push origin --delete a b c`, and git aborts the WHOLE
            // push if any one ref is already gone: "unable to delete 'x': remote ref does not
            // exist" → nothing deleted, non-zero exit, stack trace. That is not a rare case, it is
            // the normal one — `gh pr merge --delete-branch` removes the remote branch, so every
            // branch cleaned up straight after its own merge is already absent from origin while
            // the local listing still names it. Measured 2026-09-12: three live branches survived
            // because a fourth had already been deleted by the merge.
            let deleted = 0;
            const gone = [];
            for (const branch of remoteDel) {
                if (gitOk(['push', 'origin', '--delete', branch])) deleted += 1;
                else gone.push(branch);
            }
            if (deleted > 0) console.log(`deleted ${deleted} remote branch(es)`);
            if (gone.length > 0) {
                console.log(`${gone.length} remote branch(es) already absent: ${gone.join(', ')}`);
            }
        }
        if (refused.length > 0) {
            console.error(`\n${refused.length} branch(es) refused: run with --archive first.`);
            return 1;
        }
    }
    return 0;
}

// pathToFileURL, NOT a hand-built `file://` string: on Windows import.meta.url is
// file:///F:/... (three slashes) while `file://` + a backslash-replaced path yields
// file://F:/... - they never match, main() silently never runs, and the tool exits 0
// having done nothing. Measured 2026-09-01; a hygiene tool that reports success
// without acting is worse than no tool.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exit(main(process.argv.slice(2)));
}
