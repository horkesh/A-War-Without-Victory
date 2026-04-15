# Product Architecture Authority (AWWV)

## Purpose

This document names the current architecture authorities for the product.

Its job is simple:
- tell implementers which docs define the live architecture
- tell reviewers which docs are historical context only
- stop the repo from treating every older architecture write-up as co-equal truth

This is a product-architecture map, not a changelog and not a speculative vision memo.

## Canonical Architecture Stack

### 1. Product sequencing and milestone ownership
- [MASTER_ROADMAP.md](../plans/MASTER_ROADMAP.md)
- [20260330_REPO_HEALTH_CONSOLIDATED.md](../40_reports/audits/20260330_REPO_HEALTH_CONSOLIDATED.md)

### 2. Code entrypoints and repo structure
- [REPO_MAP.md](REPO_MAP.md)
- [PIPELINE_ENTRYPOINTS.md](PIPELINE_ENTRYPOINTS.md)
- [CODE_CANON.md](CODE_CANON.md)

**Canonical turn pipelines (one owner per phase):**
- War phase → `src/sim/turn_pipeline.ts` (`runTurn()`).
- Peace / weekly state progression → `src/state/turn_pipeline.ts` (`runOneTurn()`).

All other turn-advance code in the repo is either a caller of these (scenario runner, CLIs, desktop sim), a bounded UI variant (`src/sim/run_combat_browser.ts`), or a demoted smoke harness (`src/index.ts`, `src/turn/pipeline.ts`). Do not treat those as co-equal.

### 3. Player-truth and shell ownership
- [PLAYER_VISIBLE_STATE.md](PLAYER_VISIBLE_STATE.md)
- [UI_OWNERSHIP_MATRIX.md](UI_OWNERSHIP_MATRIX.md)
- [PRODUCT_SHELL_HIERARCHY.md](PRODUCT_SHELL_HIERARCHY.md)
- [DEBUG_SURFACE_POLICY.md](DEBUG_SURFACE_POLICY.md)
- [FEATURE_DONE_MEANS.md](FEATURE_DONE_MEANS.md)

### 4. Tactical map and desktop shell
- [TACTICAL_MAP_SYSTEM.md](TACTICAL_MAP_SYSTEM.md)
- [DESKTOP_GUI_IPC_CONTRACT.md](DESKTOP_GUI_IPC_CONTRACT.md)
- [MAP_UI_MASTER.md](MAP_UI_MASTER.md)
- [AWWV_GUI_ARCHITECTURE_REWORK_v2.md](AWWV_GUI_ARCHITECTURE_REWORK_v2.md)
- [GUI_MASTER.md](../40_reports/GUI_MASTER.md)

### 5. Command/ops architecture
- [AI_STRATEGY_SPECIFICATION.md](AI_STRATEGY_SPECIFICATION.md)
- [COMMAND_AUTHORITY_GATES.md](COMMAND_AUTHORITY_GATES.md)
- [2026-03-31-v08x-operations-singularity-plan.md](../plans/2026-03-31-v08x-operations-singularity-plan.md)
- [2026-04-01-v08x-sector-anchored-corps-operations-plan.md](../plans/2026-04-01-v08x-sector-anchored-corps-operations-plan.md)
- [2026-04-01-v08x-player-knowledge-integrity-plan.md](../plans/2026-04-01-v08x-player-knowledge-integrity-plan.md)

## Historical / Non-Canonical Architecture Docs

These may still contain useful context, but they are not authoritative for current implementation decisions unless a canonical document above points back to them explicitly.

- `ARCHITECTURE_SUMMARY.md`
  - historical phase chronicle from a much earlier engine era
  - useful as archaeology, not as current product architecture authority
- `morning-report.md`
  - session artifact, not architecture canon
- `nightshift-handoff.md`
  - operational handoff aid, not architecture canon

## Practical Review Rule

If an architecture question arises, resolve it in this order:

1. roadmap and governance truth
2. entrypoint and code-canon truth
3. player-visible and UI-ownership truth
4. live shell / tactical-map contract docs
5. historical documents only if the live authorities do not answer the question

## Why This Exists

The repo is now old enough that stale architecture prose is becoming a bug source.

That is a normal studio problem:
- historical write-ups still look polished
- newer docs are more correct but more distributed
- implementers start mixing eras

This file prevents that by making architecture authority explicit.
