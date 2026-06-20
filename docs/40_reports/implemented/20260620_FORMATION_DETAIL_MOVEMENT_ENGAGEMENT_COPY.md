# Formation Detail Movement And Engagement Copy

**Date:** 2026-06-20
**Type:** UI/read-model i18n copy polish
**Branch:** `codex/formationdetail-copy-polish`

## Summary

Formation Detail now renders movement and recent-engagement labels through explicit player-facing copy. Movement states such as `packing`, `in_transit`, and `unpacking` no longer fall through title-cased enum display, and unknown recent-engagement outcome ids no longer become title-cased player copy.

## Implementation

- Added localized Formation Detail movement-status labels for deployed, packing, in transit, and unpacking.
- Replaced generic movement-status display fallback with a typed movement-status label map.
- Replaced recent-engagement outcome title-casing with known outcome label keys and neutral fallback copy.
- Extended `tests/ui/formation_detail_parity.test.ts` for movement-status labels and recent-engagement outcome fallback behavior.
- Enrolled `tests/ui/formation_detail_parity.test.ts` in `qa:player-journeys`.

## Verification

- `npm.cmd exec -- vitest run tests/ui/formation_detail_parity.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 2 files / 20 tests.
- `npm.cmd run typecheck` passed.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
