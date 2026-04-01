# Active Task Governance

## Task

Task name:
Studio truth-governance contracts + player-knowledge roadmap integration

Owner-level intent:
Turn studio-level product-truth instincts into hard repo process: player-visible-state contract, canonical UI ownership, debug-surface policy, fixed done-means block, and roadmap ownership for player-knowledge integrity.

## Scope

Files / systems in scope:
- `docs/plans/2026-04-01-v08x-player-knowledge-integrity-plan.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/20_engineering/PLAYER_VISIBLE_STATE.md`
- `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`
- `docs/20_engineering/DEBUG_SURFACE_POLICY.md`
- `docs/20_engineering/FEATURE_DONE_MEANS.md`
- `docs/20_engineering/ROADMAP_GOVERNANCE.md`
- `docs/20_engineering/COMMAND_AUTHORITY_GATES.md`
- `.claude/commands/taskforce.md`
- `.claude/commands/governance-review.md`
- `.claude/napkin.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`

Files / systems explicitly out of scope:
- gameplay code changes
- canon documents
- UI implementation changes
- renderer/data-boundary code changes

## Canonical owner

What system owns the decision after this change?
The studio-governance layer owns the product-truth rules. `PLAYER_VISIBLE_STATE.md` owns what the player may know, `UI_OWNERSHIP_MATRIX.md` owns canonical surface ownership, `DEBUG_SURFACE_POLICY.md` owns debug-vs-player boundaries, and `FEATURE_DONE_MEANS.md` owns the minimum completion block.

## Demoted path

What old path is removed, demoted, or declared non-authoritative?
Pure chat memory, reviewer instinct, and ad-hoc owner advice are demoted as the primary source of truth for these rules. The repo-local governance docs become canonical.

## Decision boundary

What is this system allowed to decide?
This task is allowed to define player-visible-state rules, canonical UI ownership language, debug-surface policy, fixed completion language, and roadmap slotting for player-knowledge integrity.

What must not also decide this elsewhere?
Future chat advice or ad-hoc doc fragments should not silently replace the studio governance docs without explicit updates.

## Done means

What test, report, or observable behavior proves the change is real?
- the four new engineering governance docs exist
- taskforce / governance-review commands reference them
- `MASTER_ROADMAP.md` names player-knowledge integrity and studio truth governance explicitly
- ledger and knowledge docs record the doctrine

## UI/report truth

What player-facing or report-facing surface reflects the new truth?
`MASTER_ROADMAP.md`, the four engineering governance docs, and the updated Claude command files become the visible truth for implementers and reviewers.

## Roadmap slot

What milestone does this belong in?
Primarily `v0.8.x-final`, with immediate `v0.8.0.x` hotfix implications for worst player-facing leaks.

Why here and not later?
Because richer commander UX and political/LLM work should not sit on top of unresolved player-truth leaks or unclear UI ownership.

## What this unlocks

What future work becomes safe only after this is done?
Player-knowledge leak fixes, truthful command-review UX, Codex/Warroom/tactical-map shell cleanup, and later commander/autonomy surfaces without rebuilding this governance argument every session.

## Exact milestone changes

Use this section only if roadmap edits are involved.
Add player-knowledge integrity and studio-truth-governance docs to the roadmap as explicit `v0.8.x-final` work and cross-cutting simplification dependencies.

## Exact renumbering

Use this section only if roadmap edits are involved.
No milestone renumbering in this task.

## Items moved

Use this section only if roadmap edits are involved.
No milestone renumbering or item migration.

## Sequencing risks avoided

Use this section only if roadmap edits are involved.
Avoids implementers treating player-visible truth, debug boundaries, and canonical UI ownership as optional polish or remembered lore instead of roadmap-owned work.

## Operations gate

Use this section if operations are in scope.
Operations are not directly in scope for implementation here, but remain governed by the same product-truth rules: ops UI must not leak hidden truth and must respect canonical UI ownership.

## Checkpoints

- date: 2026-03-31
  progress: Added the player-knowledge-integrity plan, four studio governance docs, updated taskforce/review commands, and wired the roadmap/ledger/knowledge/napkin.
  next verification: Run the governance check script and verify the new docs are the canonical reference points for future work.
