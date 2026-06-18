# Review Backlog Coverage Batch

Date: 2026-06-05
Branch: `codex/review-backlog-engine-batch`
Type: Focused engine regression coverage / review-backlog triage

## Summary

This batch closes two safe review-backlog items from GitHub issue #170 and defers the behavior-moving items that failed scenario-anchor proof:

- Operation Trnovo regression coverage now proves `op:trnovo:kijevo_2` is stripped as an already-controlled capture objective while still resolving as the friendly approach waypoint to `op:trnovo:delijas`.
- HRHB Graz branch coverage now pins the non-east, non-exempt HRHB faction-level block against RS territory.
- Same-axis concentration support and final-sector disconnected-territory serialization remain deferred. Local CI reproduction showed both candidate behavior moves drove the 40-week Boljanic anchor to RBiH, so they need a separate engine/canon decision lane instead of a refloor.

No runtime code, save schema, migration, scenario data, OOB data, baseline manifest, sensitive-history prose, UI surface, or random/time-dependent behavior changed.

## Behavior

Trnovo does not need a new persisted waypoint field for this closeout. The operation builder still strips already-controlled objectives from the attack chain, and the execution approach resolver uses the controlled waypoint as the friendly approach to the surviving enemy objective.

Graz coverage is test-only. It pins the existing faction-level HRHB-to-RS block for non-east, non-exempt HRHB corps so future refactors cannot accidentally leave that branch untested.

The attempted same-axis gate change and final-sector disconnected-territory split are intentionally absent from the amended PR. Both were locally reproduced against `npm.cmd run test:vitest:scenario:anchors` as moving `op:doboj:boljanic_2` from RS to RBiH at week 40. That evidence keeps them open for a dedicated lane with scenario/canon review.

## Verification

- `npx.cmd vitest run tests/pre_planned_operations.test.ts tests/graz_faction_block.test.ts --reporter=dot`
- `npm.cmd run test:vitest:scenario:anchors`
- `npm.cmd run typecheck -- --pretty false`
- `npm.cmd run test:baselines`
- `node tools/diagnostics/strict_null_inventory.cjs --field-domains`
- `git diff --check`

## Remaining Issue #170 Work

Still open or classified because they move behavior or need domain decisions:

- Same-axis concentration support: likely stale supporter-count arithmetic, but calibration-held because correcting it changes attack eligibility and needs a one-change 40w/188w revalidation.
- Enclave-resilience denominator decision: point-based resilience has no canon denominator for IVP fallback pressure; `/100`, per-enclave max, or global max normalization are design/calibration choices, not safe mechanical fixes.
- TG launch readiness: closed as the current hybrid contract, pinned by focused coverage on 2026-06-18. The attack-floor gate is anchor-aware, while opening-attack executability uses the full assigned pool to preserve the Cincar/Kupres regression fix.
