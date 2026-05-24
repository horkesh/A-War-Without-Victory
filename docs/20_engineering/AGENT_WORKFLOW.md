# AGENT_WORKFLOW.md - Agent/Cursor Workflow Rules

## Mandatory First Read

**All work MUST begin by reading `docs/10_canon/context.md` or `docs/00_start_here/docs_index.md`.**

`docs/10_canon/context.md` contains the authoritative workflow, commit discipline, ledger usage, and preferences check procedures. It supersedes any duplicated instructions elsewhere.

## Required Reading Order

Before starting any task:

1. **`docs/10_canon/context.md`** - Process canon (workflow, ledger, preferences check, determinism rules)
2. **`docs/10_canon/CANON.md`** - Canon document index and precedence order
3. **`docs/PROJECT_LEDGER.md`** - Current project state and recent changes

## Do Not Duplicate

Do not restate procedures already defined in `docs/10_canon/context.md`. This file exists only to enforce the mandatory first-read rule.

## Paradox (agent team)

The collective identity for subagents in this repo is **Pyrrhic**. For **big-picture or team coordination** (strategic priority, convening roles, aligning roadmap and ledger), invoke **orchestrator**; Product Manager is the Orchestrator's deputy for scope and sequencing. For other non-trivial tasks, use the skills exposed by the current runtime and the repo briefs in `.claude/agents/`. In desktop Codex, custom skills are loaded from `C:\Users\User\.codex\skills`; in Claude-oriented repo flows, `.claude/skills/` and `.claude/agents/` are the shipped reference layer. Use clarification-first for high-risk items (cross-phase, canon, architecture, determinism); document handoffs when passing between roles.

## Process QA (validates others — eliminates micromanagement)

**Process QA changes everything.** Invoke **Process QA** (quality-assurance-process) to validate that *other* Pyrrhic roles followed established process (context.md, ledger, preferences check, commit discipline). Process QA is the single process checkpoint: it does not do the work for others; it verifies they followed the rules. Invoke Process QA **after significant handoffs**, **after Orchestrator or Product Manager execution**, or **before merge**. This virtually eliminates micromanagement—others follow process, Process QA verifies.

## Windows EOL Guard

The repository pins source/docs/data text files to LF through `.gitattributes` and `.editorconfig`. Use `npm run repo:eol:check` to detect tracked text files whose working-tree copy has mixed CRLF/LF endings.

If the guard fails, treat it as a local checkout hygiene issue unless a content diff proves otherwise:

1. Commit or stash unrelated work first.
2. Apply the scoped fix only after the tree is clean enough to review: `git add --renormalize <scoped paths>`.
3. Re-run `npm run repo:eol:check`, the relevant focused tests, and `git diff --check`.
4. Do not use `git reset --hard` as an EOL heal unless the operator explicitly requests it and the target paths are known safe.

## See Also

- `.claude/agents/README.md` - repo-shipped Pyrrhic agent briefs and handoffs
- `docs/plans/COMMAND_BOARD.md` - current roadmap/backlog ownership and active lanes
- `docs/00_start_here/docs_index.md` - Docs entrypoint
- `docs/10_canon/context.md` - Complete workflow and process rules
- `docs/10_canon/CANON.md` - Canon document index
- `docs/PROJECT_LEDGER.md` - Project ledger
