# Defender Trajectory Weakness Predicate

Date: 2026-05-22

## Summary

W2 from the force-trajectory roadmap is implemented. The Operation Opportunity `enemy_weakness` gates for `sana_95`, `sana_95_follow_on`, and `mistral_2_95` now consult VRS 2nd Krajina defender-corps trajectory when active subordinate defender brigades are present.

The new helper combines existing, deterministic state:

- `computeCorpsOperationReadiness(state, 'vrs_2nd_krajina').collapse_susceptibility`
- `1 - operation_readiness`
- `1 - getActiveEquipmentQualityMultiplier(state, 'RS', turn)`

If defender-corps evidence is absent, the catalogs preserve their prior live-objective posture behavior. No scenario data, painted-control targets, OOB rows, save schema, combat math, or outcome tuning changed.

## Evidence

- TDD red: healthy VRS 2nd Krajina fixture still allowed `sana_95` and `mistral_2_95` to surface.
- Green focused tests: `npx.cmd vitest run tests/operation_opportunities_catalog.test.ts tests/operation_opportunities_federation_western_bosnia_catalog.test.ts --reporter=dot` PASS (50/50).
- `npm.cmd run typecheck` PASS.
- `npm.cmd run test:baselines` PASS; no baseline manifest re-bless needed because covered baselines are pre-Sana/Mistral.
- `git diff --check` PASS.
- Fresh 188w run `runs/apr1992_definitive_188w__210e69404d054959__w188_n1936` completed with final hash `2a76baab245442d4`.

## 188w Trace Result

`sana_95` is eligible at turn 175. Its `enemy_weakness` axis reports:

`VRS Krajina defender corps trajectory degraded; weakness window open`

`sana_95_follow_on` remains blocked by staging access: the Sanski/Kljuc interior axis has no live approach corridor.

`mistral_2_95` remains blocked through the late-war window by:

- Federation authorization below Mistral 2 threshold
- Kupres/Cincar dependency anchors are not open for Mistral 2

The W2 predicate is therefore not the remaining Mistral blocker. The Sana readiness floor also does not need lowering on this evidence because `sana_95` already reaches eligible state with `SANA_READINESS_FLOOR = 0.40`.

## Painted Compare

Fresh 188w `oct1995` compare remains at 71.7% area-weighted match:

- Painted: RS 48.7%, RBiH 30.7%, HRHB 20.6%
- Sim: RS 60.9%, RBiH 26.5%, HRHB 12.6%

This confirms W2 is a gating/observability repair, not a delivery fix by itself. Next delivery work should target proposal acceptance/launch behavior for eligible `sana_95` and upstream Mistral authorization/staging, before W3 casualty-trajectory schema work.
