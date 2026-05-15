# Kupres/Cincar + Mistral Opportunity Families

**Date:** 2026-05-15  
**Lane:** Operation Opportunity Families Phase 2  
**Status:** Implemented and scenario-proofed

## What Changed

- Added `kupres_cincar_94` to the Central Bosnia / Vlasic-Kupres opportunity family.
- Added `mistral_2_95` as the first Federation / Western Bosnia opportunity family entry.
- Migrated active ownership of Operation Mistral 2 out of `triggered_operations` and into the opportunity catalog.
- Added focused catalog tests for Kupres/Cincar, Mistral 2, and the triggered-operation single-owner boundary.

## Canon / Design Posture

Both entries are non-sensitive Ring 1 territorial operation opportunities. They do not add combat math, scenario paint, OOB rows, civilian-harm levers, rupture suppression, or T4 sensitive-history entries.

Kupres/Cincar is a dependency opportunity rather than a hidden flag: later entries read live HRHB control of Kupres/Glamoc anchors. Mistral 2 now requires western theater rupture, Kupres/Cincar dependency anchors, Livno staging, Federation authorization, corps readiness, alliance context, and live RS-held objectives.

## Verification

Red first:

- `npm.cmd exec vitest -- run tests\operation_opportunities_central_bosnia_catalog.test.ts tests\operation_opportunities_federation_western_bosnia_catalog.test.ts` failed because `kupres_cincar_94` and the Federation-Western Bosnia catalog did not exist.

Green focused:

- `npm.cmd exec vitest -- run tests\operation_opportunities_central_bosnia_catalog.test.ts tests\operation_opportunities_federation_western_bosnia_catalog.test.ts` passed 13/13.
- `npm.cmd run test:vitest:fast -- -- tests\operation_opportunities_catalog.test.ts tests\operation_opportunities_central_bosnia_catalog.test.ts tests\operation_opportunities_federation_western_bosnia_catalog.test.ts tests\triggered_operations.test.ts tests\triggered_operations_late_1995.test.ts` passed 80/80.
- `npm.cmd run sim:scenario:run:40w` passed with run `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` and final hash `0cb626c032204372`; opportunity health audit found 0 decisions and no broken rows.
- `npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --map --out runs` passed with run `runs\apr1992_definitive_188w__210e69404d054959__w188_n1` and final hash `a0111273f26f907d`; opportunity health audit found 7 decisions, 7 completed resolutions, 0 unlinked offensive resolutions, 0 broken AAR links, and 0 duplicate resolution rows.

Blocked / environment-limited:

- `npm.cmd run typecheck` in the isolated worktree is blocked by missing UI map dependency declarations for `maplibre-gl`, `pmtiles`, `@deck.gl/*`, and `@vitejs/plugin-react`. The new opportunity tests no longer contribute type errors.

## Campaign Proof Notes

The 40w hash stayed at `0cb626c032204372`.

In the 188w proof run, the new opportunities did not surface because live prerequisite state did not support them:

- `kupres_cincar_94` emitted diagnostics in turns 132-142 and failed `staging_access` plus `alliance_context`.
- `vlasic_ridge_95` emitted diagnostics in turns 152-166 and failed `staging_access` plus `alliance_context`.
- `mistral_2_95` emitted diagnostics in turns 175-188 and failed `political_authorization` plus `staging_access` because the Kupres/Cincar dependency anchors were not open.

That is intended non-railroad behavior: Mistral 2 no longer launches as a calendar-triggered operation and instead appears only when live prerequisite state supports the proposal and bot/player authorization path.

## Remaining Work

- Consider Winter 94 / Leap / Summer 95 / Southern Move only when local OSID, owner, and dependency evidence is sufficient.
