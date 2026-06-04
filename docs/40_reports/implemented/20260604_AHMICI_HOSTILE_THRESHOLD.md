# Ahmici Hostile Threshold Alignment

Date: 2026-06-04
Branch: `codex/issue-170-ahmici-hostile-threshold`
Base: `ae2d52e5`
Type: Authored consequence data fix for GitHub issue #170 P1

## Summary

`csq_hvo_central_bosnia_offensive_1993` now pushes the RBiH-HRHB alliance directly to the hostile threshold on the same turn it fires. The event's `alliance_change` delta moves from `-0.60` to `-1.0`, and its temporary alliance ceiling moves from `0.10` to `0.0`.

The previous authored text and source note already stated that Ahmici should break the alliance below the hostility threshold, but a default alliance value of `0.75` plus `-0.60` landed at `0.15`, which is strained/mobilizing rather than immediately combat-enabled. The new values align the numeric consequence with `HOSTILE_THRESHOLD = 0.00` and the `isRbihHrhbCombatEnabled(...)` same-turn contract.

## Scope

This is a sensitive-history correction to an existing authored rupture event. It does not add player choices, rewards, victory scoring, civilian-targeting mechanics, new event prose, save schema, engine phase logic, or scenario structure.

## Verification

- Focused regression: `node node_modules\vitest\vitest.mjs run tests\consequence_chains.test.ts tests\consequence_consumers.test.ts tests\event_effects.test.ts tests\alliance_lifecycle.test.ts --reporter=dot` passed.
- Typecheck: `npm.cmd run typecheck -- --pretty false` passed.
- Baseline refresh: `UPDATE_BASELINES=1 npm.cmd run test:baselines` refreshed only `apr1992_52w` `final_save.json` and dependent `run_summary.json` manifest hashes. Full-scenario impact is the intended Ahmici rupture: final `war_alliance_rbih_hrhb = -1`, `hvo_arbih_war_active = true`, `ahmici_1993 = true`, and a `0.0` ceiling lock expiring at turn 108 after a turn-48 firing.
- No-update baseline comparison: `npm.cmd run test:baselines` passed after the manifest refresh.
- Whitespace check: `git diff --check` passed.

## Issue #170 Status

This closes the Ahmici same-turn hostile threshold item. Issue #170 remains open for Chain 3 missing flags, enclave-resilience denominator decision, same-axis concentration support, Trnovo controlled waypoint preservation, TG anchor-only readiness decision, HRHB Graz branch coverage, and the separate PR #171/#173 follow-ups.
