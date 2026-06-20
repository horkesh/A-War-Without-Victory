# Formation Detail HQ And Effectiveness Copy

**Date:** 2026-06-20  
**Type:** UI/read-model command-surface polish  
**Branch:** `codex/formation-detail-hq-effectiveness-copy`

## Summary

Formation Detail now shows the actual Army HQ parent name for HQ-assigned brigades and uses player-facing effectiveness modifier labels instead of raw implementation keys such as `homeDistance`.

## What Changed

- Army-HQ parent rows render the localized HQ formation name instead of generic `Assigned command`.
- Effectiveness worst-factor copy maps modifier keys to player-facing labels such as `Distance from home`.
- Focused Formation Detail tests pin both player-visible labels and reject the raw fallback copy.

## Verification

- Red proof: focused Formation Detail tests first failed with visible `Assigned command` and `homeDistance 70%`.
- Green proof: `npm.cmd exec -- vitest run tests/ui/formation_detail_parity.test.ts tests/ui/operation_aar_records_review.test.ts --pool=forks --reporter=dot`
- Green proof: `npm.cmd run typecheck`

## Scope And Determinism

This is UI/read-model copy, focused tests, and documentation only. It does not change simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer output, randomness, timestamps, or persisted output ordering.
