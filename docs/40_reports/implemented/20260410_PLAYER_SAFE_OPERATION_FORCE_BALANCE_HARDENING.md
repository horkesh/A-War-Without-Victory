# 2026-04-10 - Player-Safe Operation Force-Balance Hardening

## Lane

- **Lane title:** `fix(ui): demote player-facing operation force-ratio precision to staff abstractions`
- **Date:** 2026-04-10
- **Branch/worktree:** `codex/hardening-444-pocket`

## Why this lane

After the shell player-faction cleanup, the clearest bounded cross-surface truth seam was still player-facing operation force-ratio precision. Normal operation shells were printing exact decimals and threshold math in multiple places even though those exact numerics are staff-estimate internals, not president-facing truth.

This lane won over Gorazde, Podrinje, and the 444th salient because:

- Gorazde is still a content/runtime-audit seam, not yet a clear hardening defect
- Podrinje remains redesign-blocked because no canonical stranded-brigade lifecycle owner exists
- 444th remains doctrine realism, not a truth-owner failure
- operation force-balance wording was a bounded, multi-surface player-truth seam with an existing canonical upstream owner

## Seam and root cause

### Exact seam

Exact operation force-ratio decimals and commander-threshold math were leaking into normal player-facing shells:

- Army HQ operations surfaces
- Corps front operations rollups
- operation briefing modal
- axis assessment cards
- OPORD / narrative surfaces
- command-strain recommendation explanation

### Root cause

The repo already owned exact ratio truth in engine/read-model fields like `force_ratio_estimate` and `prediction.forceRatio`, but no shared downstream presentation owner existed for normal player-facing shells. Each surface rendered its own `toFixed(...)` string, and some player-facing narrative text in `operation_prediction.ts` also embedded exact ratio prose.

## Canonical owner after cleanup

- **Canonical exact owner:** operation prediction / readiness ratio truth (`force_ratio_estimate`, `prediction.forceRatio`)
- **Canonical player-facing owner:** `getPlayerSafeOperationBalancePresentation(...)` in `src/shared/playerSafeOperationBalance.ts`
- **Demoted path:** per-surface `toFixed(...)` rendering and threshold-math prose in normal player-facing shells

## Changes made

1. Added shared player-safe force-balance presentation
   - `src/shared/playerSafeOperationBalance.ts` now owns deterministic staff-balance banding:
     - `CLEAR EDGE`
     - `FAVORABLE`
     - `CONTESTED`
     - `UNFAVORABLE`

2. Replaced exact ratio rendering in normal operation shells
   - `OperationsSection.tsx`
   - `CorpsFrontPanel.tsx`
   - `OperationBriefingModal.tsx`
   - `AxisAssessmentCard.tsx`
   - `NarrativeTab.tsx`
   - `OpordDocument.tsx`
   - `command_strain.ts`

3. Demoted exact numeric prose in player-facing operation prediction text
   - `src/sim/combat/operation_prediction.ts` now emits staff-balance wording rather than exact ratio prose for player-facing commander assessment sections

4. Preserved debug-only exact precision
   - `RawIntelTab.tsx` still shows exact `forceRatio.toFixed(2)` values and remains the explicit debug-only surface

5. Added regression coverage
   - `tests/player_safe_operation_force_balance.test.ts` locks both:
     - banded presentation output
     - absence of exact ratio formatting in normal player-facing shells
   - `tests/command_authority.test.ts` updated to match the new shared player-facing wording

## Player-visible result

Normal operation shells no longer tell the player:

- exact decimal force ratios
- exact commander threshold math
- hidden planning precision that belongs to staff internals

They now tell the player the truthful abstraction instead:

- clear attack advantage
- favorable balance
- contested balance
- defender advantage

Debug-only raw intel remains the place for exact numerics.

## Proof

This lane is player-truth hardening, not a runtime sim-behavior change, so the strongest proof is local regression plus the full verification bar. Scenario residuals are unchanged because no sim owner or persisted runtime behavior changed.

### Baseline

`tests/player_safe_operation_force_balance.test.ts` initially failed with 11 exact-force-ratio leaks across normal player-facing shells.

### Post-fix

The same regression now passes, broader operation/UI suites stay green, and the full repo bar remains green.

### Exact verification

- `npx.cmd vitest run tests/player_safe_operation_force_balance.test.ts`
- `npx.cmd vitest run tests/player_safe_operation_force_balance.test.ts tests/ui_map_operations_mode.test.ts tests/operation_prediction.test.ts tests/operational_sitrep_views.test.ts tests/front_sector_player_visibility.test.ts`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

### Outcome

- the 11 targeted exact-ratio leaks are gone from normal player-facing shells
- exact precision remains available in the explicit debug-only raw-intel surface
- full integration residuals are unchanged, which is correct for a presentation-boundary hardening lane

## Files changed

- `src/shared/playerSafeOperationBalance.ts`
- `src/ui/map/components/army_hq/OperationsSection.tsx`
- `src/ui/map/components/CorpsFrontPanel.tsx`
- `src/ui/map/components/OperationBriefingModal.tsx`
- `src/ui/map/components/plan_ui/AxisAssessmentCard.tsx`
- `src/ui/map/components/ops_modal/NarrativeTab.tsx`
- `src/ui/map/components/ops_modal/OpordDocument.tsx`
- `src/ui/map/data/command_strain.ts`
- `src/sim/combat/operation_prediction.ts`
- `tests/player_safe_operation_force_balance.test.ts`
- `tests/command_authority.test.ts`
- `docs/40_reports/implemented/20260410_PLAYER_SAFE_OPERATION_FORCE_BALANCE_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Residual risks

- Gorazde residuals are still content/runtime-audit territory until the painted-target owner is classified more tightly
- Podrinje strandedness remains redesign-blocked
- 444th Konjic remains doctrine / realism rather than a truth-owner hardening seam
- exact commander launch standards still exist as internal logic, which is correct; this lane only hardened the player-facing presentation boundary

## Next lane

- **Next bounded lane selected:** global board reassessment after commit, with Gorazde residual content/runtime audit currently the leading bounded candidate unless a stronger cross-domain seam emerges
