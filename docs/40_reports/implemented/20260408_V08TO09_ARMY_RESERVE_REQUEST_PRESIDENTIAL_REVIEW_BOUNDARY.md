# 2026-04-08 � Army Reserve Request / Presidential Review Boundary

## Summary

This lane resolved the ownership boundary between the live presidential military review queue and army-level reserve management.

The repo already had a canonical presidential review summary derived from pending event decisions and officer review items. The remaining ambiguity was reserve requests: they are urgent military work, but they are not presidential review in the same institutional sense. Before this lane, that separation existed in code but was too implicit in the player-facing shell.

The fix was to keep reserve requests outside `presidentialReviewQueue`, introduce a canonical `armyReserveQueue` summary derived from the same reserve-request owner, and make Army HQ briefing explicitly hand the player from presidential review to the Army Reserve desk instead of implying a single blended queue.

## Candidate seams considered

1. Include reserve requests inside presidential review
- Rejected.
- This would have created false unification. Reserve requests are army-level reserve management handled through the Army Reserve desk, not the same action category as presidential event decisions or command reactions.

2. Make reserve requests explicitly separate, with Army HQ handoff to Army Reserve
- Chosen.
- Highest-value bounded step because it improves player-facing ownership without inventing a second truth owner.

3. Broader toolbar or shell redesign for reserve management
- Deferred.
- Too broad for this lane and would drift into product redesign instead of fixing the immediate ownership seam.

## Ownership decision

After cleanup:
- `presidentialReviewQueue` owns live military review that requires presidential command judgment:
  - event decisions
  - command reactions
  - personnel directives
- `armyReserveQueue` owns army-level reserve management pressure derived from pending reserve requests.
- Army HQ `BRIEFING` is the place that explains that boundary to the player.
- The tactical toolbar continues to advertise only the canonical presidential review queue, not reserve-management urgency.

This keeps one truthful owner per work category:
- presidential review stays presidential
- reserve requests stay army reserve management

## Implementation

### 1. Canonical reserve summary in the adapter

Added `ArmyReserveQueueView` to the UI read model and derived it in `GameStateAdapter` from `pending_reserve_requests`.

The adapter now:
- derives `pendingReserveRequests` once
- sorts deterministically by:
  - descending priority
  - ascending `turn_requested`
  - `corps_id`
  - `request_id`
- derives `armyReserveQueue` from the same canonical filtered request list
- keeps reserve requests outside `presidentialReviewQueue`

This avoids duplicate parsing and makes the army-owned reserve summary explicit.

### 2. Army HQ handoff clarity

`PresidentialAttentionPanel` now renders a dedicated Army Reserve section whenever `armyReserveQueue` exists.

That section explicitly tells the player:
- reserve requests are army-level reserve management
- they are not presidential review
- they should be handled in the Army Reserve desk

The panel also shows deterministic summary counts:
- pending
- critical
- defensive
- offensive

### 3. Direct handoff to the Army Reserve desk

`ArmyHQModal` now passes a reserve-desk callback into `PresidentialAttentionPanel`.

That callback:
- finds the current faction�s `army_hq` formation
- sets `selectedArmyHqId`
- closes the Army HQ modal

This routes the player directly into the existing Army Reserve surface instead of leaving the handoff implicit.

### 4. Toolbar boundary preserved

`PresidentialToolbar` was intentionally left out of the reserve summary path.

The toolbar still advertises one canonical military review signal based on `presidentialReviewQueue`, which prevents reserve requests from being misread as presidential queue work.

## Files changed

- `src/ui/map/data/types.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx`
- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/army_hq_presidential_review_coherence.test.ts`

## Verification

### Targeted

- `npx.cmd vitest run tests/army_hq_presidential_review_coherence.test.ts`
  - passed, `3/3`
- `npx.cmd tsx --test tests\ui_map_game_state_adapter.test.ts`
  - passed, `16/16`

### Full required

- `npm.cmd run test:vitest`
  - passed, `217/217` files and `3023/3023` tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - passed
- `npm.cmd run build`
  - passed

### Verification note

The full Vitest run still emitted pre-existing non-blocking stderr/anomaly warnings from unrelated integration coverage. They were unchanged by this lane and the suite passed cleanly.

## Resulting player-facing contract

The player-facing story is now:
- `REVIEW / REVIEWS` means presidential military review
- Army HQ `Presidential Attention` owns that live review queue
- reserve requests are shown in the same Army HQ briefing context only as a boundary note and handoff
- reserve requests are handled in the Army Reserve desk, not folded into presidential review

That is materially easier to explain than before because the shell no longer leaves reserve pressure in a half-in / half-out state.

## Residual risks

- Reserve requests still live in a separate desk and are not surfaced in the tactical toolbar.
- If future design wants reserve pressure elevated more aggressively, that should be a new lane about army-level urgency signaling, not a presidential review merge.
- Interrupt-style event decisions in `App.tsx` still coexist with the sustained Army HQ review desk. That is now more understandable, but still a broader product boundary topic.

## Integration notes for protected docs

### `docs/PROJECT_LEDGER.md`

Add:

`2026-04-08 - Army Reserve Request / Presidential Review Boundary: kept reserve requests outside the canonical presidentialReviewQueue and introduced an armyReserveQueue summary derived from pending reserve requests. ArmyHQ Presidential Attention now explicitly tells the player that reserve requests are army-level reserve management, not presidential review, and provides a direct handoff into the existing Army Reserve desk via selectedArmyHqId. PresidentialToolbar remains keyed only to presidentialReviewQueue so reserve pressure is not misrepresented as presidential queue work.`

### `docs/plans/MASTER_ROADMAP.md`

Mark complete only if roadmap wording matches:
- reserve requests remain explicitly outside presidential review
- Army HQ briefing now makes that ownership boundary explicit
- one canonical reserve-management summary exists without toolbar/presidential false unification

Recommended next lane:
- `Army Reserve Urgency Signaling / Army-Level Attention Contract`

### `.claude/architect_notes.md`

Add:

`When a command shell contains urgent work that belongs to different institutions, do not flatten it into one review queue. In AWWV, reserve requests are army-level reserve management, not presidential review. Keep the review queue derived from the actual presidential work owners, derive a separate reserve summary from pending reserve requests, and make the handoff explicit in Army HQ instead of implying one blended action surface.`

## Recommended next lane

`Army Reserve Urgency Signaling / Army-Level Attention Contract`

Why:
- this lane clarified ownership truthfully
- the next question is not who owns reserve requests, but how strongly army-level reserve pressure should be advertised without collapsing back into presidential review
