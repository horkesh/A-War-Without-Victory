import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The branch-hygiene tool deletes branches. Its one non-negotiable property is that it
 * NEVER deletes work that exists nowhere else.
 *
 * Context (2026-09-01): the repo had accumulated 40 local and 50 remote branches because
 * lanes create branches and nothing removes them. Cleaning that up by hand is exactly the
 * situation where a wrong `git branch -D` silently destroys the only copy of something —
 * one of the branches found that day (`lane/playtest-harness`) held 58 unique commits.
 *
 * These tests build a throwaway repo and prove the safety rule end to end, rather than
 * asserting on the source text.
 */

const TOOL = join(process.cwd(), 'tools', 'repo', 'branch_hygiene.mjs');

function git(cwd: string, args: string[]): string {
    return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function runTool(cwd: string, args: string[]): { code: number; out: string } {
    try {
        const out = execFileSync(process.execPath, [TOOL, ...args], { cwd, encoding: 'utf8' });
        return { code: 0, out };
    } catch (error) {
        const e = error as { status?: number; stdout?: string; stderr?: string };
        return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
}

async function makeRepo(): Promise<string> {
    const repo = await mkdtemp(join(tmpdir(), 'awwv-branch-hygiene-'));
    git(repo, ['init', '--quiet', '--initial-branch=main']);
    git(repo, ['config', 'user.name', 'AWWV Test']);
    git(repo, ['config', 'user.email', 'test@awwv.invalid']);
    await writeFile(join(repo, 'base.txt'), 'base\n', 'utf8');
    git(repo, ['add', '.']);
    git(repo, ['commit', '--quiet', '-m', 'base']);
    // The tool compares against origin/main; a self-remote keeps the fixture offline.
    git(repo, ['remote', 'add', 'origin', repo]);
    git(repo, ['fetch', '--quiet', 'origin']);
    return repo;
}

describe('branch hygiene never destroys unique work', () => {
    it('refuses to prune a branch with unique commits and no archive tag', async () => {
        const repo = await makeRepo();
        try {
            git(repo, ['switch', '--quiet', '-c', 'lane/unique']);
            await writeFile(join(repo, 'unique.txt'), 'only here\n', 'utf8');
            git(repo, ['add', '.']);
            git(repo, ['commit', '--quiet', '-m', 'work that exists nowhere else']);
            const tip = git(repo, ['rev-parse', 'lane/unique']);
            git(repo, ['switch', '--quiet', 'main']);

            const { code, out } = runTool(repo, ['--prune']);

            expect(out).toMatch(/REFUSING \(unique work, no archive tag\): lane\/unique/);
            expect(code, 'refusing must be a non-zero exit, not a silent pass').toBe(1);
            expect(git(repo, ['rev-parse', 'lane/unique']), 'branch must survive').toBe(tip);
        } finally {
            await rm(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
    }, 60_000);

    it('prunes a branch whose commits already landed in main', async () => {
        const repo = await makeRepo();
        try {
            git(repo, ['switch', '--quiet', '-c', 'lane/landed']);
            await writeFile(join(repo, 'landed.txt'), 'landed\n', 'utf8');
            git(repo, ['add', '.']);
            git(repo, ['commit', '--quiet', '-m', 'landed work']);
            git(repo, ['switch', '--quiet', 'main']);
            git(repo, ['merge', '--quiet', '--ff-only', 'lane/landed']);
            git(repo, ['fetch', '--quiet', 'origin']);

            const { code } = runTool(repo, ['--prune']);

            expect(code).toBe(0);
            expect(
                git(repo, ['branch', '--list', 'lane/landed']),
                'a fully landed branch should be gone',
            ).toBe('');
        } finally {
            await rm(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
    }, 60_000);

    it('archives unique work, then prunes it, leaving the commits recoverable', async () => {
        const repo = await makeRepo();
        try {
            git(repo, ['switch', '--quiet', '-c', 'lane/archive-me']);
            await writeFile(join(repo, 'precious.txt'), 'precious\n', 'utf8');
            git(repo, ['add', '.']);
            git(repo, ['commit', '--quiet', '-m', 'precious work']);
            const tip = git(repo, ['rev-parse', 'lane/archive-me']);
            git(repo, ['switch', '--quiet', 'main']);

            const { code } = runTool(repo, ['--archive', '--prune']);

            expect(code).toBe(0);
            expect(git(repo, ['branch', '--list', 'lane/archive-me'])).toBe('');
            // The whole promise of archiving: the commit is still reachable by tag.
            expect(git(repo, ['rev-parse', 'archive/lane/archive-me^{commit}'])).toBe(tip);
            expect(
                git(repo, ['show', `${tip}:precious.txt`]),
                'the file content must be recoverable from the archived commit',
            ).toBe('precious');
        } finally {
            await rm(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
    }, 60_000);

    it('never touches main or the checked-out branch', async () => {
        const repo = await makeRepo();
        try {
            git(repo, ['switch', '--quiet', '-c', 'lane/current']);
            const { code } = runTool(repo, ['--prune']);
            expect(code).toBe(0);
            expect(git(repo, ['branch', '--list', 'lane/current'])).not.toBe('');
            expect(git(repo, ['branch', '--list', 'main'])).not.toBe('');
        } finally {
            await rm(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
    }, 60_000);

    it('uses pathToFileURL for its entry guard so it actually runs on Windows', () => {
        // A hand-built `file://${path}` never equals import.meta.url on Windows
        // (file:///F:/... vs file://F:/...), so main() silently never runs and the tool
        // exits 0 having done nothing. Measured 2026-09-01.
        const source = readFileSync(TOOL, 'utf8');
        expect(source).toContain('pathToFileURL(process.argv[1]).href');
        expect(source).not.toMatch(/import\.meta\.url === `file:\/\/\$\{/);
    });
});
