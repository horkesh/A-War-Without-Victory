# Branch Archive - 2026-06-05

This repository cleanup preserved the remaining local branches and worktree-only
edits before removing visible branch/worktree clutter.

## Recovery Refs

All original branch tips were copied under:

- `refs/archive/20260605-pre-unify/*` - branch tips before dirty worktree edits were committed.
- `refs/archive/20260605-post-dirty/*` - branch tips after dirty worktree edits were committed.

Use `git for-each-ref refs/archive/20260605-post-dirty` to list the preserved
refs. Use `git branch <name> <archive-ref>` to restore one as a visible branch.

## Preserved Dirty Worktree Commits

The cleanup converted loose worktree edits into commits before any branch or
worktree removal:

- `archive/20260605-post-dirty/worktree-agent-a3a47538c6b92c590`
  preserves the Sarajevo constant inventory line-number update.
- `archive/20260605-post-dirty/worktree-agent-a8d307c6e8340e6a9`
  preserves the OOB worktree edits and generated save difference.
- `archive/20260605-post-dirty/worktree-agent-aae9c5e98b245123b`
  preserves the player-safe operation-name test variant.
- `archive/20260605-post-dirty/codex-issue-170-phase-e-off-skip-2`
  preserves the Phase E off-skip worktree edits.
- `archive/20260605-post-dirty/codex-standing-og-phase-c-flagon-eval`
  preserves the Standing OG flag-on evaluation edits.
- `archive/20260605-post-dirty/codex-archive-standing-og-validation-b`
  preserves the detached Standing OG 188-week validation snapshot.

## Integration Policy

Whole old feature branch trees were not merged into current `main` because their
tips predated later canonical work and would have reverted current files by
thousands of lines. Patch-equivalent branches are represented by current `main`;
non-equivalent branches are represented by the archive refs above for targeted
future restoration or cherry-pick.

The unified active branch for this cleanup is `codex/unified-preserved-tree`.
