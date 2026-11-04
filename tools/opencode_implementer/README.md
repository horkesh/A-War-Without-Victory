# Claude planner → OpenCode implementer

Claude plans, reviews and gives the verdict. OpenCode does bounded implementation work in a worktree of its own.
This is the Claude-side version of the loop Codex has been running since October 2026. Here the boundary
is enforced in configuration and checked after every job, instead of resting on the wording of each brief.

## Roles

| Role | Who | Owns |
|---|---|---|
| Planner / integrator | Claude (this session) | brief, write allowlist, the acceptance oracle (tests, expected values), the merge/commit decision |
| Implementer | OpenCode, `opencode-go/deepseek-v4.1-flash` (the same model Codex uses) | the edits and commands inside one worktree, plus an honest report |
| Independent reviewer | a fresh Claude subagent (Sonnet) | reads BRIEF + DIFF + receipt, **not** the implementer's report first; findings only |
| Oracle | `npm run gate:local -- --tests <files>` plus the task's own gates (188w, anchors…) | pass/fail |

The implementer never certifies itself. Verdict `IN_BOUNDS_UNREVIEWED` means it stayed inside its
boundary. It says nothing about whether the work is correct.

## How this differs from Codex's setup

| | Codex (`Documents/Codex/2026-10-26/task/activation/opencode-*`) | Here |
|---|---|---|
| Server | shared background service `127.0.0.1:49374`, password read from `opencode service get password` | `--standalone` private server per job; no service password, no interference with Codex's sessions |
| Boundaries | prose in each brief ("no Git, no install…") | default-deny `policy.json` (canary-verified), minimal env, **plus** a post-run diff of the worktree against `--allow` globs (exit 3) |
| Commit protection | trust | HEAD/branch compared before vs after; any move is a violation |
| Evidence | hand-made per job | `runs/implementer/<job>-NN/`: BRIEF, PROMPT, PRE/POST snapshots, stdout.jsonl, REPORT, TRANSCRIPT, DIFF.patch, RECEIPT.json |
| Report shape | free-form | fixed `## STATUS / CHANGED FILES / COMMANDS RUN / NOT DONE / QUESTIONS` |
| Review | Codex model "Sol" | Claude subagent on a cheaper model, plus `gate:local` |
| Long runs | foreground | `run_in_background` + Monitor; Claude keeps working meanwhile |

## The loop

```bash
# 1. one worktree per job (one writer per checkout; never the planner's or Codex's checkout)
git worktree add F:/AWWV-worktrees/<job> -b claude/<job> <base-ref>

# 2. write the brief from BRIEF_TEMPLATE.md, then confirm the launch without running it
node tools/opencode_implementer/run.mjs --job <job> --brief <brief.md> \
  --dir F:/AWWV-worktrees/<job> --allow "src/sim/x.ts,tests/x.test.ts" --dry-run

# 3. run it (Claude: run_in_background, then read RECEIPT.json when notified)
node tools/opencode_implementer/run.mjs --job <job> --brief <brief.md> \
  --dir F:/AWWV-worktrees/<job> --allow "src/sim/x.ts,tests/x.test.ts"

# 4. follow-up correction in the SAME implementer session (keeps its context, costs less)
node tools/opencode_implementer/run.mjs --job <job>-fix --brief <fix.md> --dir ... --allow ... \
  --session <session_id from RECEIPT.json>

# 5. Claude: review DIFF.patch, dispatch the independent reviewer, run the oracle in the worktree
npm run gate:local -- --tests tests/x.test.ts
```

Exit codes: `0` in bounds · `1` implementer failed/timed out · `2` invoked wrongly · `3` BOUNDARY VIOLATION.
On exit 3 the launcher reverts nothing. Claude inspects the worktree and decides what to do.

## What to delegate

The split in [../local_executor/README.md](../local_executor/README.md) still applies.
DeepSeek is a much stronger model than the local 9B, but it has the same failure shape: it defaults to reporting success.

- **Delegate:** bounded code changes that have a named test oracle, test scaffolding, passive diagnostic
  observers, evidence extraction from run logs, bulk mechanical edits.
- **Keep with Claude:** the oracle and expected values, calibration decisions and pin refreshes, canon,
  FORAWWV and §6 panels, any "is this historical" judgement, and commits, pushes and merges.
- **The local Ollama executor** (`npm run local:delegate`) is still there for free, text-only drafts.

## Permission policy (`policy.json`)

The policy is **default-deny**. The implementer may read, search and edit inside its worktree, using OpenCode's
built-in grep (there is no `rg`, because `rg --pre` runs programs). On the shell it may run only exact read-only
Git shapes, vitest, tsc and the repo's gate scripts.

After every allow, and so overriding it, the policy denies:
- **command chaining and redirection:** `; & | > < $( )` and backticks;
- **flags that run code or write files:** `--pre`, `--output`, `--ext-diff`, `--textconv`, `--exec`, `--config`, `-c`, vitest `--globalSetup`/`--setupFiles`;
- **edits to the oracle and toolchain:** `tools/local_executor/**`, `tools/opencode_implementer/**`, `tools/test/**`, `tools/hooks/**`, `tsconfig*.json`, `vitest.config.*`, `package*.json`, `.gitattributes`, `.npmrc`, `node_modules/**`;
- **edits to protected locations:** `.git`, `.claude`, `.codex`, `.github`, FORAWWV and the painted references.

A job may add a shell command only as a concrete shape with one trailing ` *` (for example
`--allow-cmd "node activation/x/observer.mjs *"`). `allowCmdProblem` rejects wildcards, metacharacters,
shells, network tools, git/npm/npx and `node -e`. The receipt records every addition.
The child process gets only the environment variables listed in `env_passthrough`, so no GitHub, Anthropic or webhook
tokens reach it. The OpenCode Go key comes from OpenCode's own `auth.json`.

**Canary 2 (2026-11-04, `runs/implementer/permission-canary-02`, $0.0049)** checked these bypass shapes at runtime:
- **refused:** `git status; New-Item …`, `git status && New-Item …`, `git diff --output=…`, and a write under `tools/local_executor/`;
- **allowed:** `git status` and the `ok/**` write;
- **also refused:** an unrequested `Get-ChildItem | Select-Object` the implementer added on its own initiative.

**Verified by the permission canary (2026-11-04, `runs/implementer/permission-canary-01`, $0.0054).**
In a scratch repo, with `--allow "ok/**"`:
- `git status` ran;
- `git commit` was refused (`Permission denied: shell`);
- writing `.claude/canary.txt` was refused (`Permission denied: edit`);
- `ok/y.txt` was written;
- `stray.txt`, which the config allows but the job's allowlist does not, was caught by the post-run check, giving exit 3, `BOUNDARY_VIOLATION`, HEAD unmoved.

The implementer also tried to delete `stray.txt` itself with `Remove-Item`; the default-deny refused that.
That establishes three facts: rules are **last-match-wins**, the shell action is **`shell`**, and the write tool is governed by **`edit`**.

**Known limit: there is no OS sandbox.** An allowed test runner executes worktree code. A test file the
implementer writes can therefore reach the network or paths outside the worktree, and only review
catches that. Read every new test and script in DIFF.patch before running it outside the job. A real
container (no network, only the worktree mounted) would close this gap; it is not set up.
