# Army Ops Command Label Copy Polish

**Date:** 2026-06-20
**Result:** Implemented

## Summary
- Army HQ expanded Operations details now spell out commander stats, readiness labels, ORBAT columns, disrupted status, casualty breakdowns, AAR duration/objective rows, and commander rank labels instead of compact staff shorthand.
- EN and BCS copy now avoid visible `COMP`, `AGGR`, `DEF`, `OPS`, `INTEL`, `COHESN`, `OBJ`, `MOM`, `PERS`, `COH`, `MOR`, `STS`, `CMDR`, `KIA`, `WIA`, and win-count shorthand on this surface.
- Fixed column widths for readiness and ORBAT rows so the expanded labels do not collide in the compact Army HQ panel.

## Changes Made
- `src/ui/map/components/army_hq/OperationsSection.tsx`
  - Added localized officer-rank display in the operation commander card.
  - Replaced hardcoded KIA/WIA casualty fragments with localized killed/wounded copy.
  - Widened readiness labels and ORBAT status/stat columns for full player labels.
- `src/ui/map/i18n/messages.en.ts`
  - Expanded command/stat/readiness/ORBAT/AAR keys to player-facing words.
  - Added `operationsSection.casualtyBreakdown`.
- `src/ui/map/i18n/messages.bcs.ts`
  - Mirrored the same expanded labels and casualty breakdown in BCS copy.
- `tests/ui/army_hq_timing_copy.test.ts`
  - Added regression coverage for planning readiness labels, operation commander stats/rank, axis detail, ORBAT headers/status, casualty breakdowns, and completed AAR copy.

## Verification
- `npm.cmd exec -- vitest run tests/ui/army_hq_timing_copy.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 21/21.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.
- `npm.cmd run qa:player-journeys` passed 232/232.
- `npm.cmd run qa:live-surface:browser` passed with strict dev-server cleanup; temporary `.tmp_live_surface_browser_sweep` evidence was removed after verification.

## Determinism / Scope
UI/read-model copy, i18n templates, layout widths, tests, and docs only. No simulation logic, scenario data, Srebrenica/Zepa lifecycle ownership, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Next Steps
- Apply the same raw-enum discipline to the ops-planning G2/Narrative prediction labels identified by the Pyrrhic scout.
- Harden the live browser raw-token guard with low-noise patterns for exact command telemetry fragments.
