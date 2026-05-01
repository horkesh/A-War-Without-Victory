# Operation Opportunity Decision Bridge - Implemented

**Date:** 2026-05-01
**Type:** Desktop IPC + war-pipeline consumer + Army HQ UI action expansion.
**Status:** Shipped and verified.
**Commit:** This packet.

## 1. Headline

Operation opportunity dossiers now have a dedicated rich decision bridge. The Army HQ dossier no longer uses the generic binary proposal buttons for opportunity decisions; it calls a new desktop IPC endpoint that records explicit player intent on the pending review row. The existing war-pipeline step remains the only owner that mutates `state.military.operation_opportunities`.

Live dossier actions now include Authorize, Delay, Under-resource, and Decline. The bridge also validates Redirect payloads, but the UI does not render Redirect until variant choices are persisted into the player-safe dossier DTO.

## 2. Why

The previous dossier MVP made opportunity review legible, but the action surface was still restricted to `acceptProposal(review_id)` and `rejectProposal(review_id)`. That was enough for approve / decline, but too cramped for the design vocabulary:

- approve
- delay
- redirect
- under-resource
- decline

The important architecture constraint was to avoid a desktop shortcut that calls `applyOpportunityDecision(...)` directly. Desktop IPC should record the player response, then the canonical `apply-resolved-opportunity-decisions` turn step should translate that response into opportunity state, resolution rows, or normal CorpsOperation creation.

## 3. What Changed

### Review Row Schema

`PendingProposalReview` now accepts:

- `opportunity_decision?: 'approve' | 'delay' | 'redirect' | 'under_resource' | 'decline'`
- `opportunity_decision_options?: { redirect_variant_id?, delay_turns?, commitment_profile? }`

These fields are optional and backward-compatible. Legacy `accepted: true/false` reviews still work.

### War-Pipeline Consumer

`applyResolvedOpportunityDecisions(...)` now reads either:

- explicit `opportunity_decision`, with normalized options, or
- legacy `accepted` as approve / decline fallback

It still sorts review rows by id before applying decisions, preserving deterministic replay order.

### Desktop IPC

Added `resolve-operation-opportunity-decision` in `src/desktop/electron-main.cjs`, exposed as `resolveOperationOpportunityDecision(...)` through preload and `useIPC`.

The helper `resolveOpportunityDecisionPayload(...)` in `src/desktop/autonomy_ipc_contract.cjs` validates:

- review exists
- review belongs to the player faction
- review is an `OPPORTUNITY:<proposal_id>` row
- payload proposal id matches the review action
- decision is one of the five canonical choices
- delay turns, redirect variant id, and commitment profile options are valid
- the review is not already resolved

On success the handler writes only `opportunity_decision`, `opportunity_decision_options`, and `resolved_turn`, then broadcasts the serialized state. It does not create operations or mutate opportunity status.

### Army HQ Dossier

`OperationOpportunityDossierPanel` now calls `ipc.resolveOperationOpportunityDecision(...)` and renders its action buttons from the dossier DTO. The current action list is:

- Authorize
- Delay
- Under-resource
- Decline

Redirect is intentionally absent from the live button list until catalog variants are projected into `OperationOpportunityProposalView`.

## 4. Invariants

- No new operation lifecycle.
- No desktop direct-call into `applyOpportunityDecision(...)`.
- No combat math, OOB, scenario, painted target, or opportunity catalog changes.
- No scenario-scale rerun required: normal scenario runs have no player review row with explicit `opportunity_decision` unless the desktop player chooses one.
- Determinism preserved: review consumption is still stable-sorted by proposal-review id; no randomness, time, locale sort, or unordered object traversal was introduced.

## 5. Files Changed

- `src/state/game_state.ts`
- `src/sim/combat/operation_opportunities.ts`
- `src/desktop/autonomy_ipc_contract.cjs`
- `src/desktop/electron-main.cjs`
- `src/desktop/preload.cjs`
- `src/ui/map/desktop/useIPC.ts`
- `src/ui/map/data/types.ts`
- `src/ui/map/data/operationOpportunityDossiers.ts`
- `src/ui/map/components/army_hq/OperationOpportunityDossierPanel.tsx`
- `tests/operation_opportunities_phase2_decisions.test.ts`
- `tests/desktop_autonomy_boundary_truth.test.ts`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/army_hq_presidential_review_coherence.test.ts`

## 6. Verification

- Red first: focused tests failed on missing explicit decision consumption, missing IPC bridge, missing action DTOs, and dossier still using `acceptProposal` / `rejectProposal`.
- `npx.cmd vitest run tests/operation_opportunities_phase2_decisions.test.ts tests/desktop_autonomy_boundary_truth.test.ts tests/ui_map_game_state_adapter.test.ts tests/army_hq_presidential_review_coherence.test.ts` -> 47/47 pass.
- `npx.cmd tsc --noEmit` -> clean.
- `npx.cmd vitest run tests/operation_opportunities_substrate.test.ts tests/operation_opportunities_phase2_decisions.test.ts tests/operation_opportunities_5th_corps_sana.test.ts tests/operation_opportunities_tigar_sloboda_94.test.ts tests/operation_opportunities_una_94.test.ts tests/desktop_autonomy_boundary_truth.test.ts tests/ui_map_game_state_adapter.test.ts tests/army_hq_presidential_review_coherence.test.ts tests/ui/inbox_items.test.ts` -> 154/154 pass.
- `npm.cmd run desktop:map:build` -> pass with pre-existing Vite warnings only.

## 7. Follow-Up Lane

Next generic opportunity UI lane: persist player-safe redirect variants, objective labels, staging labels, and map footprint DTOs so Redirect can be rendered without importing catalog truth into the UI. Force-quality trait bands can land separately once the current force-quality lanes settle.
