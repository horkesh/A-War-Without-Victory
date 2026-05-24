# HVO Southern Move Catalog Slice

Date: 2026-05-24

## Scope

This slice splits the late-war western Bosnia HVO/HV catalog footprint so that Mistral 2 no longer owns the Mrkonjic Grad objective chain. Mistral 2 now remains scoped to Drvar/Grahovo and Sipovo, while a new HRHB `southern_move_95` opportunity covers the Mrkonjic Grad axis after Sipovo staging anchors are HRHB-held.

## Engine Changes

- Added `SOUTHERN_MOVE_95_OPPORTUNITY` to `operation_opportunity_catalog_federation_western_bosnia.ts`.
- Hosted Southern Move on `hvo_tomislavgrad`, not `hvo_main_staff`, preserving the zero-front-sector constraint from the HVO main staff shell.
- Gated Southern Move on turns 182-188, Federation authorization, HVO/HV readiness, HRHB supply margin, western-theater rupture, Sipovo staging anchors, and RS-held Mrkonjic objectives.
- Used the VRS 1st Krajina defender-trajectory weakness reader for the Mrkonjic Grad cluster.
- Left Operation Una out of the catalog; the existing HV-only negative-control path remains the guard for that failed expeditionary action.

## Canon Notes

- Canonical faction IDs remain unchanged: HV assets are HRHB-tagged phantoms.
- No initial OSID overrides, avoided OSID lists, randomization, timestamp use, scenario data edits, or combat outcome tuning were introduced.
- This is an opportunity-catalog authoring change. Full 188-week calibration effects still require the baseline/scenario run lane.

## Verification

- `npx.cmd vitest run tests\operation_opportunities_federation_western_bosnia_catalog.test.ts --reporter=dot` - 9/9 PASS.
- `npm.cmd run typecheck` - PASS.
- `git diff --check` - PASS with the existing CRLF normalization warning on the touched catalog test.
