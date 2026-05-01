# Operation Opportunity Footprint + Redirect DTO - Implemented

**Date:** 2026-05-01
**Type:** Opportunity proposal DTO + Army HQ UI.
**Status:** Shipped and verified.
**Commit:** This packet.

## Summary

- Operation opportunity proposals now persist authored objective/staging footprints and redirect variant snapshots.
- Army HQ opportunity dossiers now show player-safe objective/staging labels, can highlight that footprint on the existing map target layer, and can resolve a specific redirect variant through the existing rich IPC bridge.
- No combat math, opportunity catalog content, scenario data, OOB, painted targets, or calibration outputs changed.

## Changes Made

### Proposal Snapshots

`src/sim/combat/operation_opportunities.ts` now adds two optional proposal snapshots:

- `last_footprint?: OperationOpportunityFootprintSnapshot`
- `redirect_variants?: OperationOpportunityRedirectVariantSnapshot[]`

The evaluator refreshes these snapshots whenever a live proposal is refreshed and writes them when a new proposal surfaces. The snapshots are deterministic and authored from the opportunity definition:

- default footprint objectives come from default axes in catalog order
- default staging comes from opportunity-level staging plus per-axis staging
- redirect variants carry variant id, name, objective OSIDs, and staging OSIDs

### Player-Safe Read Model

`src/ui/map/data/operationOpportunityDossiers.ts` now converts persisted footprint OSIDs into player-safe display labels using the existing OSID display helper. The UI read model exposes:

- `objectives`
- `staging`
- `redirect_variants`

The UI does not import sim catalog files. Catalog truth is projected through the persisted proposal snapshot.

### Army HQ Dossier

`OperationOpportunityDossierPanel` now renders a compact **Map Footprint** section:

- objective chips
- staging chips
- `Highlight` and `Clear` controls wired to the existing `operationTargetOsids` map layer

When redirect variants exist, the dossier renders **Redirect Options**. Selecting one writes:

- `decision: 'redirect'`
- `redirectVariantId: <variant_id>`

through the already-implemented `resolveOperationOpportunityDecision` IPC bridge. The war pipeline remains the single mutation owner.

## Invariants

- No direct brigade control.
- No new operation lifecycle.
- No desktop-side opportunity mutation.
- No raw `op:` strings rendered in the normal dossier.
- No catalog imports in UI.
- Redirect remains catalog-authored and deterministic; the UI can only choose variants that came from the proposal snapshot.

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/operation_opportunities.ts` | Added footprint/redirect snapshot types and evaluator persistence. |
| `src/ui/map/data/types.ts` | Added objective, staging, and redirect variant view types. |
| `src/ui/map/data/operationOpportunityDossiers.ts` | Added player-safe footprint and redirect variant DTO derivation. |
| `src/ui/map/components/army_hq/OperationOpportunityDossierPanel.tsx` | Added Map Footprint section, map highlighting, and variant-specific redirect buttons. |
| `tests/operation_opportunities_substrate.test.ts` | Added proposal snapshot regression test. |
| `tests/ui_map_game_state_adapter.test.ts` | Added footprint labels, redirect variants, and action-list regression coverage. |
| `tests/army_hq_presidential_review_coherence.test.ts` | Added source-level guard for Army HQ footprint/redirect ownership. |
| `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` | Recorded opportunity footprint highlighting on the existing operation-target map layers. |
| `docs/40_reports/GUI_MASTER.md`, `docs/40_reports/README.md`, `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` | Registered the implemented report and updated current GUI status. |
| `docs/PROJECT_LEDGER.md`, `docs/PROJECT_LEDGER_KNOWLEDGE.md`, `.claude/napkin.md` | Propagated behavior, reusable rule, and session runbook knowledge. |

## Verification

- Red first: focused tests failed on missing `last_footprint`, missing DTO fields, and missing Army HQ footprint/redirect surface.
- Green focused pack: `npx.cmd vitest run tests/operation_opportunities_substrate.test.ts tests/ui_map_game_state_adapter.test.ts tests/army_hq_presidential_review_coherence.test.ts` -> 62/62 pass.
- `npx.cmd tsc --noEmit` -> clean.
- Broader opportunity/UI pack: `npx.cmd vitest run tests/operation_opportunities_substrate.test.ts tests/operation_opportunities_phase2_decisions.test.ts tests/operation_opportunities_5th_corps_sana.test.ts tests/operation_opportunities_tigar_sloboda_94.test.ts tests/operation_opportunities_apwb_pressure_94.test.ts tests/operation_opportunities_una_94.test.ts tests/operation_opportunities_breza_94.test.ts tests/operation_opportunities_pauk_94_95.test.ts tests/operation_opportunities_grmec_94.test.ts tests/desktop_autonomy_boundary_truth.test.ts tests/ui_map_game_state_adapter.test.ts tests/army_hq_presidential_review_coherence.test.ts tests/ui/inbox_items.test.ts` -> 228/228 pass.
- `npm.cmd run desktop:map:build` -> pass with pre-existing Vite warnings only.

## Next Steps

- Run an end-to-end UI smoke in the live map once Claude's current run lane is idle enough to avoid shared-machine churn.
- Let future opportunity family docs author redirect variants normally; no family-specific UI is needed.
- Consider map-hover detail for highlighted opportunity footprints after the core Army HQ flow has had play time.
