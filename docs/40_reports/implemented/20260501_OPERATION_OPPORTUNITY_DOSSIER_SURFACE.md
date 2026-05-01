# Operation Opportunity Dossier Surface - Implemented

**Date:** 2026-05-01
**Type:** UI/data-consumer feature.
**Status:** Shipped and verified.
**Commit:** This packet.

## 1. Headline

Pending operation opportunities now surface as Army HQ command dossiers instead of generic autonomy proposal cards. The player sees the operation name, staff recommendation, expiry, prerequisite-axis chips, required/optional readiness counts, and can authorize or decline through the existing proposal IPC bridge.

This is intentionally a UI/read-path lane. No simulation behavior, combat math, opportunity catalog content, OOB, scenario data, painted targets, or operation definitions changed.

## 2. Why

The opportunity system had already gained:

- catalog truth (`state.military.operation_opportunities`)
- proposal review rows (`state.meta.pending_proposal_reviews` with `OPPORTUNITY:<proposal_id>`)
- decision/AAR records (`operation_opportunity_resolutions`, Army HQ Records, Cost Ledger)

But live review still appeared as a thin generic proposal in the autonomy panel. That hid the real product loop: named historical opportunities should be inspected and authorized at Army HQ, then executed through the normal operation lifecycle.

## 3. What Changed

### Adapter and DTO

Added `OperationOpportunityProposalView` to `LoadedGameState` with:

- proposal/opportunity ids
- display name
- faction/status/window
- review id and staff recommendation
- player-safe prerequisite axis chips
- required/optional axis counts
- currently available actions: authorize and decline

The new derivation lives in `src/ui/map/data/operationOpportunityDossiers.ts`. It reads raw proposal state plus pending review rows, filters by player faction, sorts by expiry/proposal id, and never reads catalog files directly.

`pendingProposalReviews` now preserves `proposed_action`, `current_value`, and `proposed_value`, so UI consumers can distinguish operation opportunities from ordinary autonomy proposals.

### Inbox Routing

`deriveInboxItems(...)` now recognizes `proposed_action: "OPPORTUNITY:<proposal_id>"` rows and emits:

- type: `operation_opportunity`
- action: `army_hq_opportunity`
- title: opportunity name from the review description
- subtitle: staff recommendation line

The generic `autonomy_proposal` route remains for non-opportunity proposals.

### Army HQ Surface

Added `OperationOpportunityDossierPanel.tsx` under Army HQ briefing. It:

- renders live operation dossiers in the presidential attention stack
- shows prerequisite chips as ready / blocked / strained / not applicable
- shows expiry and staff recommendation
- calls `ipc.acceptProposal(review_id)` for Authorize
- calls `ipc.rejectProposal(review_id)` for Decline

The tactical inbox routes opportunity clicks to Army HQ briefing. App routing remains navigation-only; the Army HQ panel owns the execution call, matching the existing event/personnel review ownership pattern.

## 4. Deliberate Limits

This packet does not add the richer `stage-operation-opportunity-decision` IPC from the design doc. Therefore the live dossier exposes Authorize and Decline only. Delay, Redirect, and Under-resource remain valid system/design vocabulary but need the richer decision bridge before they can become first-class UI actions.

No map footprint highlighting landed in this packet. The dossier is ready for it because it already centralizes live proposals at Army HQ; objective/staging labels still need to be persisted in the player-safe proposal DTO before the map should visualize them.

## 5. Files Changed

- `src/ui/map/data/types.ts`
- `src/ui/map/data/operationOpportunityDossiers.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/inboxItems.ts`
- `src/ui/map/components/PresidentialInbox.tsx`
- `src/ui/map/App.tsx`
- `src/ui/map/components/army_hq/OperationOpportunityDossierPanel.tsx`
- `src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/ui/inbox_items.test.ts`
- `tests/army_hq_presidential_review_coherence.test.ts`

## 6. Verification

- Red first: focused UI tests failed on missing `proposed_action` preservation, missing opportunity inbox route, and missing Army HQ dossier component.
- `npx.cmd vitest run tests/ui_map_game_state_adapter.test.ts tests/ui/inbox_items.test.ts tests/army_hq_presidential_review_coherence.test.ts` -> 55/55 pass.
- `npx.cmd tsc --noEmit` -> clean.
- `npx.cmd vitest run tests/ui_map_game_state_adapter.test.ts tests/ui/inbox_items.test.ts tests/army_hq_presidential_review_coherence.test.ts tests/autonomy_panel_player_faction_truth.test.ts tests/desktop_autonomy_boundary_truth.test.ts tests/ui_shell_navigation.test.ts` -> 81/81 pass.
- `npm.cmd run desktop:map:build` -> pass with pre-existing Vite warnings only.

## 7. Follow-Up Lane

Next natural UI/IPC lane: add a dedicated opportunity-decision IPC endpoint so the dossier can support all five canonical responses: approve, delay, redirect, under-resource, decline. That lane should still route approval through the existing opportunity decision applier and normal CorpsOperation factory; it should not create a second operation lifecycle.
