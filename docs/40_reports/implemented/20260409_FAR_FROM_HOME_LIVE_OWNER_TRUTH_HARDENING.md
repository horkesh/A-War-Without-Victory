# 2026-04-09 - Far-from-home live-owner truth hardening

## Summary
- Reclassified far-from-home anomaly output from live owner state instead of the descriptive `placement:fixed_home_osid` tag.
- Removed the fixed-home tag exemption from `unassigned_frontline_brigades`, which exposed the real critical deployment failures instead of suppressing them.
- Split the old blended `brigade_far_from_home` warning into truthful redeployment (`brigade_far_from_home_redeployed`) versus ownerless drift (`brigade_far_from_home_unassigned`) without changing the underlying simulation outcome.

## Why
- `FormationState.tags` already documents tags as descriptive-only metadata, but the anomaly detector was still treating `placement:fixed_home_osid` as a live deployment owner and critical-anomaly exemption.
- That blurred two different truths together in the 40-week run: brigades such as `arbih_717th_slavna_mountain` and `arbih_120th_liberation_black_swans` still had live sector/loan ownership, while `rs_1st_podrinje` and `rs_5th_podrinje` were genuinely unassigned drift.
- The lane goal was to harden the harness truth surface, not redesign home-return gameplay. The correct fix was to classify from current ownership (`assignment`, `elite_loan_state`) and leave unresolved drift visible.

## Files changed
- `src/scenario/anomaly_detector.ts`
- `tests/anomaly_detector_deployment_truth.test.ts`
- `tests/integration_anomaly.test.ts`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## What changed
1. `detectUnassignedFrontlineBrigades(...)` no longer suppresses active frontline brigades just because they carry `placement:fixed_home_osid`.
2. `detectBrigadeFarFromHome(...)` now exports two truths:
   - `brigade_far_from_home_redeployed` (`info`) when a brigade is far from home but still has live sector or elite-loan ownership.
   - `brigade_far_from_home_unassigned` (`warning`) when a brigade is far from home and has no live sector/loan owner.
3. The detector now uses `isSectorAssignmentExemptCorpsId(...)` only for real sectorless reserve exemptions, not for descriptive-placement tags.
4. New regression coverage locks the contract:
   - fixed-home tags do not hide `unassigned_frontline_brigades`
   - far-from-home output splits redeployed/loaned vs ownerless drift
   - the integration anomaly suite now allows the newly exposed `unassigned_frontline_brigades` critical while still failing on any unexpected critical anomaly.

## Scenario proof

### Baseline
- Run: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1400`
- Hash: `701d14d32566c5b5`
- `end_report.md` contained one blended warning:
  - `[brigade_far_from_home] 26/213 (12.2%) ... arbih_717th_slavna_mountain ... rs_1st_podrinje ... rs_5th_podrinje ...`
- The old report gave no ownership distinction between:
  - truthful far-from-home redeployments with live owners
  - genuinely unassigned far-from-home drift

### Post-fix rerun
- Run: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1401`
- Hash: `701d14d32566c5b5` (unchanged simulation outcome)
- `end_report.md` now contains:
  - `[unassigned_frontline_brigades] 8 active brigade(s) in corps with sectors are not assigned to any sector: ... rs_1st_podrinje ... rs_5th_podrinje`
  - `[brigade_far_from_home_unassigned] 2/213 (0.9%) ... rs_1st_podrinje ... rs_5th_podrinje`
- `run_summary.json` now contains:
  - `brigade_far_from_home_redeployed` `24/213 (11.3%) ... arbih_120th_liberation_black_swans (elite loan, ...) ... arbih_717th_slavna_mountain (sector front, ...)`

### Before / after difference
- Fixed: `placement:fixed_home_osid` no longer acts as a fake runtime owner or anomaly exemption.
- Fixed: the Podrinje pair are now explicitly surfaced as ownerless drift instead of being buried inside a blended far-from-home warning.
- Clarified: `arbih_717th_slavna_mountain` remains far from home, but now truthfully appears as a redeployed brigade with live sector ownership rather than as an ambiguous anomaly.
- Newly exposed: `unassigned_frontline_brigades` is now honest about eight active brigades with no sector owner; this is the next substrate seam, not a regression caused by the detector.
- Proven safe: `n1400` and `n1401` share the same final hash, so this lane hardened truth surfaces without changing simulation behavior.

## Determinism / ownership
- Determinism impact: controlled and deterministic. The detector now reads existing live owner state; no randomness, timestamps, or unstable iteration were introduced.
- Canonical owner after cleanup: live `assignment` / `elite_loan_state` for redeployed brigades, or explicit ownerless drift when neither exists.
- Demoted path after cleanup: `placement:fixed_home_osid` as a runtime anomaly exemption or pseudo-owner.

## Verification
- `npx.cmd vitest run tests/anomaly_detector_deployment_truth.test.ts`
- `npx.cmd vitest run tests/anomaly_detector_deployment_truth.test.ts tests/integration_anomaly.test.ts`
- `npm.cmd run sim:scenario:run:40w`
- `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1401`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest` (passed on immediate rerun after a transient scenario-runner failure-report path flake in `tests/integration_anomaly.test.ts`)
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

## Residual risks
- The newly exposed `unassigned_frontline_brigades` critical is real substrate debt in HVO Central Bosnia and VRS Drina, not a reporting artifact.
- Some far-from-home brigades remain redeployed with live owners; this lane intentionally does not force home-return behavior or redesign attachment logic.

## Next lane
- Investigate the newly exposed `unassigned_frontline_brigades` seam, starting with HVO Central Bosnia and the Podrinje pair, to determine why active brigades with corps sectors are finishing ownerless.
