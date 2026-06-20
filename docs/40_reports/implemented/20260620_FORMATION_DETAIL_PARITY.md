# Formation Detail Parity

**Date:** 2026-06-20  
**Type:** UI/read-model command-surface polish  
**Branch:** `codex/pyrrhic-formation-detail-parity`

## Summary

Formation Detail now matches the player-safe labels already used by Army HQ ORBAT, and the Orders tab no longer turns a no-op click on the automatically current sector into a persistent sector override.

## What Changed

- Formation Detail history/overview copy now uses `getPlayerSafeFormationNarrativeArcLabel(...)` instead of local raw narrative-arc labels such as `Bloodied`.
- Formation Detail Orders disables/no-ops the automatic current-sector row, preventing accidental persistent overrides.
- Army HQ ORBAT expanded decoration chips now render faction decoration names instead of raw decoration type ids such as `unit_citation`.
- Focused UI coverage pins the Formation Detail narrative label, current-sector no-op behavior, and ORBAT decoration label.

## Verification

- Red proof from the worker branch failed on raw `Bloodied`, current-sector override dispatch, and raw `unit_citation`.
- Green proof: `npm.cmd exec -- vitest run tests/ui/formation_detail_parity.test.ts tests/ui/operation_aar_records_review.test.ts --pool=forks --reporter=dot`
- Green proof: `git diff --check`
- Green proof: `npm.cmd run typecheck`

## Scope And Determinism

This is UI/read-model copy, command-surface no-op protection, focused tests, and documentation only. It does not change simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer output, randomness, timestamps, or persisted output ordering.
