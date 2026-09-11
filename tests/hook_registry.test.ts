/**
 * The hook registry itself — because a hook that is registered but unreachable fails silently,
 * and silence is this repo's most expensive failure mode.
 *
 * Two defects this pins against, both found on 2026-09-11:
 *
 *   1. MACHINE-ABSOLUTE PATHS. Two hooks were registered as `bash F:/A-War-Without-Victory/...`.
 *      They work on exactly one checkout. In any other clone the file is not there, the hook
 *      quietly does nothing, and nothing reports it — the guard appears installed and is not.
 *
 *   2. AN UNVERIFIED INVOCATION FORM. A new hook was nearly registered via `$CLAUDE_PROJECT_DIR`,
 *      which nothing in this repo had ever proven expands. Had it not, the hook would have been
 *      listed, tested in isolation, and never once fired.
 *
 * So every registered hook must resolve relative to the repo root, and must exist.
 *
 * The inventory assertion is deliberate too. It is not a decoration: it makes the blocking set an
 * explicit, reviewed list, so a hook cannot become blocking — or stop being blocking — without
 * someone editing this file and saying why.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface HookEntry { command: string; event: string; matcher: string }

function registeredHooks(): HookEntry[] {
  const settings = JSON.parse(readFileSync('.claude/settings.json', 'utf8')) as {
    hooks: Record<string, Array<{ matcher?: string; hooks?: Array<{ command?: string }> }>>;
  };
  const rows: HookEntry[] = [];
  for (const [event, groups] of Object.entries(settings.hooks)) {
    for (const group of groups) {
      for (const hook of group.hooks ?? []) {
        if (hook.command) {
          rows.push({ command: hook.command, event, matcher: String(group.matcher) });
        }
      }
    }
  }
  return rows;
}

/** Registered hooks that live in tools/hooks, by script path. */
function scriptHooks(): Array<HookEntry & { path: string }> {
  return registeredHooks()
    .map((row) => {
      const match = /tools\/hooks\/([a-z_]+\.sh)/.exec(row.command);
      return match ? { ...row, path: `tools/hooks/${match[1]}` } : null;
    })
    .filter((row): row is HookEntry & { path: string } => row !== null);
}

describe('hook registry', () => {
  it('every registered hook script exists', () => {
    const missing = scriptHooks().filter((row) => !existsSync(row.path));
    expect(missing.map((row) => row.path)).toEqual([]);
  });

  it('no hook is registered by a machine-absolute path', () => {
    // `bash F:/A-War-Without-Victory/...` works on one checkout and silently does nothing on
    // every other one. A guard that is listed but never runs is worse than no guard: it is
    // counted as protection.
    const absolute = registeredHooks().filter((row) => /(^|\s)[A-Za-z]:\//.test(row.command));
    expect(absolute.map((row) => row.command)).toEqual([]);
  });

  it('no hook depends on a variable this repo has not proven expands', () => {
    const templated = registeredHooks().filter((row) => row.command.includes('$CLAUDE_PROJECT_DIR'));
    expect(templated.map((row) => row.command)).toEqual([]);
  });

  it('every hook script survives an empty payload without erroring', () => {
    // A hook that crashes on an unexpected payload is a hook that stops protecting, loudly or
    // otherwise, on the first tool call that does not look like the one it was written for.
    for (const row of scriptHooks()) {
      const code = (() => {
        try {
          execFileSync('bash', [row.path], { input: '{}', stdio: 'pipe' });
          return 0;
        } catch (error) {
          return (error as { status?: number }).status ?? -1;
        }
      })();
      expect(code, `${row.path} on an empty payload`).toBe(0);
    }
  });

  it('every hook script in tools/hooks is actually registered', () => {
    // An unregistered guard is a file nobody runs. If one is deliberately retired, delete it.
    const onDisk = readdirSync('tools/hooks').filter((name) => name.endsWith('.sh'));
    const registered = new Set(scriptHooks().map((row) => row.path.replace('tools/hooks/', '')));
    expect(onDisk.filter((name) => !registered.has(name))).toEqual([]);
  });

  it('the blocking set is an explicit, reviewed list', () => {
    // Changing this list means changing what the harness refuses. That should require editing a
    // test and justifying it, not just editing a shell script.
    const blocking = scriptHooks()
      .map((row) => row.path)
      .filter((path) => /permissionDecision.*deny/.test(readFileSync(path, 'utf8')))
      .sort();
    expect([...new Set(blocking)]).toEqual([
      // Added 2026-09-11. Writing a repo file from a python/node heredoc silently eats backslash
      // escapes: `'\\n'` intended as two characters lands as a real newline. Four occurrences in
      // one day — an unterminated string in delegate.mjs, a broken join() in a vitest file, a sed
      // pattern that meant end-of-line instead of a dollar, and an unterminated string in
      // task_manifests.test.ts. One was committed. Reads and /tmp writes are untouched.
      'tools/hooks/guard_heredoc_code_edit.sh',
      'tools/hooks/guard_inline_script.sh',
      'tools/hooks/guard_pipe_exit_code.sh',
      'tools/hooks/guard_stash_pop.sh',
      // Added 2026-09-11. A truncated file-listing search is an incomplete inventory presented
      // as a complete one. It is tier 1 rather than advisory because the written rule failed
      // twice on the same reader: once hiding the test that pinned CI install counts (an
      // exhaustive search found eight, not three, and main went red), and again choosing which
      // files a task manifest would read, which produced four perfectly verified quotes from an
      // unrelated test.
      'tools/hooks/guard_truncated_search.sh',
    ]);
  });
});
