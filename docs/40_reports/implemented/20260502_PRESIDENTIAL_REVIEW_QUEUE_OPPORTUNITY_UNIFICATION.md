# Presidential Review Queue Opportunity Unification

**Date:** 2026-05-02
**Type:** UI/read-model coherence fix. No simulation mechanics, scenario data, OOB, painted targets, operation catalog content, combat code, or run artifacts changed.

## Why

The operation-opportunity dossier surface was live, but the top-level presidential review count was split. Army HQ manually added pending opportunity dossiers to its local headline, while `presidentialReviewQueue.pendingCount` still omitted them. That meant the tactical toolbar and Warroom status indicator could say no reviews were pending even when an Army HQ operation opportunity dossier required the player's decision.

## What Changed

- `GameStateAdapter` now derives `pendingProposalReviews` and `operationOpportunityProposals` before building `presidentialReviewQueue`.
- `PresidentialReviewQueueView` gained `operationOpportunityCount`.
- `presidentialReviewQueue.pendingCount` now includes pending player-scoped operation opportunity dossiers.
- `PresidentialAttentionPanel` no longer performs a local `+ opportunityDossierCount` count. It reads `reviewQueue.pendingCount` and `reviewQueue.operationOpportunityCount` like the toolbar and Warroom.

Army reserve requests stay intentionally separate. They remain an army-reserve management queue with their own toolbar signal and Army HQ reserve section.

## Verification

- `npx.cmd vitest run tests/ui_map_game_state_adapter.test.ts tests/army_hq_presidential_review_coherence.test.ts tests/ui/inbox_items.test.ts tests/ui_turn_aftermath_wiring.test.ts tests/ui_shell_navigation.test.ts`
  - 83/83 pass
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - clean after linking the worktree's nested tactical-map dependency directory to the root `src/ui/map/node_modules`.

## Outcome

The presidential review count now has one adapter-level owner for event decisions, command reactions, personnel directives, and operation opportunity dossiers. Surfaces can still choose distinct shortcuts, but they no longer disagree about whether a pending operation dossier is presidential review work.
