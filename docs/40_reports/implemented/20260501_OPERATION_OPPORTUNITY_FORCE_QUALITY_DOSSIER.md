# Operation Opportunity Force-Quality Dossier - Implemented

**Date:** 2026-05-01
**Type:** Opportunity proposal observability + Army HQ UI.
**Status:** Shipped and verified.
**Commit:** This packet.

## 1. Headline

Operation opportunity dossiers now show the institutional force-quality signals behind an opportunity, not just prerequisite chips and action buttons. The opportunity evaluator persists the current seven-trait force-quality snapshot for the primary corps, the UI adapter turns that into player-safe bands, and the Army HQ dossier renders a compact Force Quality board.

This does not tune combat, launch operations, alter opportunity eligibility, or script historical outcomes. It makes the existing force-quality architecture visible to the player and testable by reviewers.

## 2. Why

The late-war architecture says ARBiH improvement and VRS deterioration should surface through operation delivery: readiness, staging, axis coordination, support delivery, recovery, reserves, and collapse risk. Before this packet, the live opportunity dossier showed whether `corps_readiness` was green or red, but it did not show the deeper trait profile that explains why staff confidence is high or strained.

That made the UI too thin for the goal: a Paradox-grade command dossier where the player understands institutional capability rather than seeing a hidden boolean gate.

## 3. What Changed

### Proposal Snapshot

`OperationOpportunityState` now carries:

- `last_force_quality_traits?: CorpsOperationReadinessTraits`

The evaluator computes this from `computeCorpsOperationReadiness(state, def.primary_corps)` whenever a proposal is surfaced or refreshed. The value is cloned across evaluator passes, preserving deterministic save shape and avoiding shared object mutation.

### Player-Safe DTO

`OperationOpportunityProposalView` now includes:

- `force_quality_traits: OperationOpportunityForceTraitView[]`

The DTO exposes bands, not raw formulas:

- `strong`
- `adequate`
- `strained`
- `poor`

For `collapse_susceptibility`, the band is inverted: high raw susceptibility becomes a poor player-facing health band.

### Army HQ Dossier

`OperationOpportunityDossierPanel` renders a Force Quality section when trait bands are present. The section is dense and scannable: seven compact chips with label, band, and concise staff-language reason. It does not expose exact numeric values or hidden formulas.

## 4. Invariants

- No combat math changes.
- No opportunity catalog content changes.
- No operation execution changes.
- No desktop IPC changes.
- No scenario data, painted targets, OOB, or canon changes.
- Determinism preserved: the evaluator still walks the catalog in stable order, and trait derivation is pure / sorted internally.
- This is an additive save-shape / UI-observability change. Scenario final-state hashes can move because live proposals now serialize an extra player-safe snapshot.

## 5. Files Changed

- `src/sim/combat/operation_opportunities.ts`
- `src/ui/map/data/types.ts`
- `src/ui/map/data/operationOpportunityDossiers.ts`
- `src/ui/map/components/army_hq/OperationOpportunityDossierPanel.tsx`
- `tests/operation_opportunities_substrate.test.ts`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/army_hq_presidential_review_coherence.test.ts`

Documentation updates:

- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/40_reports/GUI_MASTER.md`
- `docs/40_reports/README.md`
- `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md`
- `docs/plans/2026-05-01-operation-opportunity-review-surface-design.md`
- `.claude/napkin.md`

## 6. Verification

- Red first: focused tests failed on missing persisted `last_force_quality_traits`, missing `force_quality_traits` DTO, and missing Force Quality dossier section.
- `npx.cmd vitest run tests/operation_opportunities_substrate.test.ts tests/ui_map_game_state_adapter.test.ts tests/army_hq_presidential_review_coherence.test.ts` -> 61/61 pass.
- `npx.cmd tsc --noEmit` -> clean.
- `npx.cmd vitest run tests/operation_opportunities_substrate.test.ts tests/operation_opportunities_phase2_decisions.test.ts tests/operation_opportunities_5th_corps_sana.test.ts tests/operation_opportunities_tigar_sloboda_94.test.ts tests/operation_opportunities_apwb_pressure_94.test.ts tests/operation_opportunities_una_94.test.ts tests/operation_opportunities_breza_94.test.ts tests/operation_opportunities_pauk_94_95.test.ts tests/operation_opportunities_grmec_94.test.ts tests/desktop_autonomy_boundary_truth.test.ts tests/ui_map_game_state_adapter.test.ts tests/army_hq_presidential_review_coherence.test.ts tests/ui/inbox_items.test.ts` -> 227/227 pass.
- `npm.cmd run desktop:map:build` -> pass with pre-existing Vite warnings only.

## 7. Follow-Up Lane

The remaining generic opportunity review surface gap is map-linked footprint data: objective labels, staging labels, axis/variant DTOs, and a map highlight handoff. Redirect should stay hidden until those player-safe variant DTOs exist.
