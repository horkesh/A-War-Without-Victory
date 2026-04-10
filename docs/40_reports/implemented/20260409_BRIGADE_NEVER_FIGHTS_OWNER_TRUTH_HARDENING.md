# 2026-04-09 Brigade Never-Fights Owner Truth Hardening

## Lane summary

- **Lane:** `fix(harness): align brigade_never_fights with live owner truth`
- **Type:** Harness / anomaly truth hardening
- **Canonical owner after cleanup:** live brigade sector/loan ownership plus `isSectorColdFront(...)`
- **Demoted path:** anomaly-local `active + battles_fought === 0` sweep over every brigade

## Seam

`detectBrigadeNeverFights(...)` in `src/scenario/anomaly_detector.ts` was still treating every active brigade with `battles_fought = 0` as a warning-worthy deployment failure. In the committed baseline `n0`, that mixed together three different truths:

- `72` brigades with live non-cold sector/loan ownership
- `17` brigades on canonical Graz cold fronts
- `8` brigades with no live sector/loan owner

That made the warning bucket compete with existing sim-owned truth instead of consuming it.

## Investigation disagreement

The parallel reads agreed on the seam but not the cleanup shape:

- **Dalton + blindspot winner:** keep the lane narrow; report only live non-cold owned brigades and do not create a new anomaly family.
- **James:** split ownerless zero-battle brigades into a second bucket.

I chose the narrower Dalton/blindspot path. It removes false battle-expectation classes without inventing a new anomaly contract, which keeps the lane inside hardening rather than widening scope.

## Change

1. Added `getAssignedSector(...)` helper so `detectBrigadeNeverFights(...)` can consume canonical final sector ownership.
2. Restricted the detector to brigades that still have:
   - live `assignment.kind === 'sector'`, or
   - live `elite_loan_state.on_loan`
3. Excluded sector-owned brigades on canonical cold fronts via `isSectorColdFront(...)`.
4. Demoted severity from `warning` to `info`, because the surviving bucket is now an inventory/coherence surface rather than a broken-runtime-truth accusation.
5. Added a regression in `tests/anomaly_detector_deployment_truth.test.ts` that proves:
   - live non-cold sector brigades still report
   - live loaned brigades still report
   - ownerless brigades are excluded
   - Graz cold-front brigades are excluded

## Scenario proof

### Baseline

- **Run:** `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n0`
- **Final hash:** `bde31c0aab141f42`
- **Before:** `brigade_never_fights`
  - severity: `warning`
  - count: `97`
  - description: `97 active brigade(s) have 0 battles in brigade_history after 40 turns.`

### Post-fix

- **Run:** `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n4`
- **Final hash:** `bde31c0aab141f42`
- **After:** `brigade_never_fights`
  - severity: `info`
  - count: `72`
  - description: `72 active brigade(s) with live sector/loan ownership outside cold-front sectors have 0 battles in brigade_history after 40 turns.`

### Difference

- Count dropped from `97` to `72`.
- Cold-front contamination removed: `17 -> 0`.
- Ownerless contamination removed: `8 -> 0`.
- Final scenario hash stayed unchanged.

This lane hardened anomaly truth only. It did not alter simulation behavior.

## Verification

### Targeted

- `npx.cmd vitest run tests\anomaly_detector_deployment_truth.test.ts tests\integration_anomaly.test.ts`
- `npm.cmd run sim:scenario:run:40w`
- `node ..\..\tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n4`

### Full verification bar

The worktree still hit the local TypeScript/module-resolution mismatch on repo-wide commands, so the exact lane files were mirrored into the main workspace for full-bar verification and then restored immediately afterward.

- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

## Residual board after lane

- **Still active but weaker / mixed:** the two Gorazde residual territorial warnings may be content, scenario, or live uncovered-edge truth; they need exact seam investigation before another hardening claim.
- **Redesign-blocked:** ownerless unreachable Podrinje brigades still lack a canonical lifecycle owner.
- **Later realism:** `arbih_444th_mountain` remains a salient-risk doctrine seam, not a truth-owner bug.
