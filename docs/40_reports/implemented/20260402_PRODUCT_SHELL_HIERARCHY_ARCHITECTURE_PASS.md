# 2026-04-02 - Product Shell Hierarchy Architecture Pass

## Purpose

The repo already had player-truth rules and a UI ownership matrix, but it still lacked one explicit architecture contract for how the major player-facing shells compose into a single product.

That gap matters because many recurring UX and ownership bugs were not really component bugs. They were shell-hierarchy bugs:

- Warroom and Army HQ both trying to feel like command centers
- Tactical Map sometimes acting like a second command-review shell
- Codex remaining real but becoming easy to lose
- return-to-Warroom behavior being treated like a convenience instead of a shell contract

This pass adds the missing authority layer.

## What changed

### New canonical architecture doc

Added:

- `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`

This document now defines:

- `Warroom` as the primary shell
- `Tactical Map` as the battlespace shell
- `Army HQ` as the command-review shell
- `Codex` as the knowledge shell

It also defines the required handoffs:

- Warroom -> Tactical Map
- Tactical Map -> Warroom
- Tactical Map -> Army HQ
- all shells -> Codex

### Architecture stack propagation

Wired the new shell hierarchy into the live architecture stack:

- `docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md`
- `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`
- `docs/20_engineering/REPO_MAP.md`
- `README.md`
- `docs/plans/2026-04-01-v08x-player-knowledge-integrity-plan.md`

## Why this matters

This is the missing middle layer between:

- low-level player-visible-state rules
- per-concept UI ownership

Without it, the repo could still answer:

- "what may the player know?"
- "which surface owns operations?"

but still fail to answer:

- "what is the primary shell?"
- "how do these shells hand off?"
- "when may Tactical Map summarize versus own?"

That is exactly the kind of ambiguity that keeps creating drift in a strategy-game shell.

## Studio-level insight

Most stronger strategy studios eventually make this explicit, whether or not they give it this exact file name:

- one shell starts the play loop
- one shell owns the map of the war
- one shell owns staff/command review
- one shell owns knowledge/reference

If that hierarchy is left implicit, the product starts behaving like four stitched tools.

## Done means

This architecture pass is successful when future work can no longer honestly claim:

- Warroom and Army HQ are co-equal owners of command review
- Tactical Map can quietly become a second records or command-review shell
- Codex is allowed to remain hidden behind side paths
- return-to-Warroom is optional in standalone tactical-map use

## Verification

- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Follow-on work

This pass clarifies ownership. It does not by itself finish the remaining implementation work.

The next expected slices remain:

- remaining player-facing leak cleanup
- residual legacy authority cleanup
- broader repo architecture refinement after the current truth-and-shell wave is merge-ready
