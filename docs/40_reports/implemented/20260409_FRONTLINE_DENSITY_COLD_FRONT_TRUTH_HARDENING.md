# 2026-04-09 Frontline Density Cold-Front Truth Hardening

## Lane summary

- **Lane:** `fix(harness): align frontline density with Graz cold-front truth`
- **Type:** Harness / anomaly truth hardening
- **Canonical owner after cleanup:** `isSectorColdFront(...)` in `src/sim/combat/sector_utils.ts`
- **Demoted path:** anomaly-local density inference that treated every active sector as a live pressure/combat frontage

## Seam

`detectFrontlineDensityImbalance(...)` in `src/scenario/anomaly_detector.ts` was still including canonical Graz-frozen sectors in faction density medians and outlier reporting. In `n1412`, that produced a false warning on `sector:hvo_tomislavgrad:0` even though the repo already owns that RS-HRHB frontage as a cold front and no-combat line.

This was a harness truth seam, not a gameplay seam. The sim already knew the front was frozen; the anomaly layer was competing with that owner.

## Change

1. Imported `isSectorColdFront(...)` into `src/scenario/anomaly_detector.ts`.
2. Excluded cold-front sectors from `detectFrontlineDensityImbalance(...)` before faction density grouping and outlier classification.
3. Added `tests/frontline_density_cold_front_truth.test.ts` to lock both sides of the contract:
   - Graz cold-front sectors are suppressed from density imbalance warnings.
   - Active non-cold sectors still report when they are genuine low-density outliers.

## Scenario proof

### Baseline

- **Run:** `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1412`
- **Final hash:** `bde31c0aab141f42`
- **Before:** `frontline_density_imbalance = 5`
- Included false positive:
  - `sector:hvo_tomislavgrad:0 (corps hvo_tomislavgrad, density=0.182, HRHB median=1.000, ratio=0.2x)`

### Post-fix

- **Run:** `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n0`
- **Final hash:** `bde31c0aab141f42`
- **After:** `frontline_density_imbalance = 4`
- Removed false positive:
  - `sector:hvo_tomislavgrad:0`

### Difference

- The anomaly count dropped from `5` to `4`.
- The final scenario hash stayed unchanged.
- Remaining density warnings stayed on live non-cold sectors:
  - `sector:arbih_5th_corps:0`
  - `sector:vrs_1st_krajina:6`
  - `sector:vrs_1st_krajina:7`
  - `sector:vrs_sarajevo_romanija:0`

This lane hardened anomaly truth only. It did not alter simulation outcomes.

## Verification

### Targeted

- `npx.cmd vitest run tests\frontline_density_cold_front_truth.test.ts tests\zero_combat_corps_cold_front.test.ts`
- `npm.cmd run sim:scenario:run:40w`
- `node ..\..\tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n0`

### Full verification bar

The worktree hit a local TypeScript/module-resolution mismatch on repo-wide commands, so the exact lane files were mirrored into the main workspace for truthful full-bar verification, then restored immediately afterward. No unrelated main-workspace dirt was absorbed.

- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

## Residual board after lane

- **Still active bounded hardening:** `brigade_never_fights` still mixes cold-front, ownerless, and live-owner brigades into one warning bucket.
- **Redesign-blocked:** ownerless unreachable Podrinje brigades still lack a canonical lifecycle owner.
- **Later realism / doctrine:** `arbih_444th_mountain` salient overextension near Konjic remains a planner/doctrine seam, not a truth-owner bug.
