# Army Reserve Urgency Signaling / Army-Level Attention Contract

Date: 2026-04-08
Lane: v0.8-to-v0.9
Status: Implemented

## Objective

Strengthen army-level reserve pressure signaling without folding reserve management back into presidential review or creating duplicate urgency owners.

## Candidate Seams Considered

1. Fold reserve requests into presidential review signaling.
   - Rejected because it would reverse the recently established ownership boundary and mislabel army-level reserve management as presidential action work.
2. Add one distinct army-level reserve signal on the tactical toolbar that routes directly to the Army Reserve desk.
   - Chosen because it gives the player a truthful attention path before opening Army HQ while preserving one canonical presidential review queue.
3. Broader command-shell alert redesign.
   - Deferred because it would widen into product reshaping rather than a bounded signaling contract lane.

## Chosen Seam

Add one explicit army-level reserve urgency signal to the field command bar, sourced from the canonical `armyReserveQueue` summary and routed directly to the Army Reserve desk.

## Why This Was The Highest-Value Bounded Step

The ownership boundary was already cleaner after the previous lane: reserve requests no longer lived inside presidential review. The remaining gap was signaling. Reserve pressure still required the player to infer where to act after opening Army HQ, which meant the reserve desk had an owner but not a clear attention path.

A distinct army-level reserve signal fixes that without introducing a new source of truth:
- presidential review remains one queue
- reserve management remains one queue
- the toolbar now advertises both institutions separately instead of blending them

## Design

### Canonical ownership after cleanup

- `presidentialReviewQueue` remains the only owner of presidential military review urgency.
- `armyReserveQueue` remains the only owner of reserve-management urgency.
- `PresidentialToolbar` may signal both, but it must not merge them.

### Player-facing contract

- `REVIEW / REVIEWS` continues to mean presidential military review work.
- `RESERVE REQUEST / RESERVE REQUESTS` means army-level reserve pressure.
- Clicking the reserve signal opens the existing Army Reserve desk, not the presidential review queue.

### Deferred

- Broader command-shell alert hierarchy redesign.
- Separate army-level reserve signaling outside the field toolbar.
- Reprioritizing reserve pressure relative to political or warroom notifications.

## Implementation

### Files changed

- `src/ui/map/components/PresidentialToolbar.tsx`
- `src/ui/map/App.tsx`
- `tests/army_hq_presidential_review_coherence.test.ts`

### What changed

#### `PresidentialToolbar.tsx`

- Added `reserveAttention` prop with deterministic shape:
  - `pendingCount`
  - `criticalCount`
- Added a distinct reserve attention button that:
  - renders only when reserve requests are pending
  - uses amber styling when critical requests exist, otherwise blue
  - labels itself as `RESERVE REQUEST` / `RESERVE REQUESTS`
  - routes directly to the Army Reserve desk using the existing `setSelectedArmyHqId(...)` path
- Preserved the separate presidential review button and prevented count merging.

#### `App.tsx`

- Passed the canonical `loadedGameState.armyReserveQueue` summary into the toolbar as `reserveAttention`.
- No new derivation owner was introduced in the toolbar.

#### `army_hq_presidential_review_coherence.test.ts`

- Added source-contract coverage for the reserve signal.
- Tightened the test to assert the real contract:
  - reserve attention exists as its own signal
  - it opens the Army Reserve desk
  - presidential review remains a separate count
  - no merged `pendingReviews + ...` count is introduced

## Verification

### Targeted

- `npx.cmd vitest run tests/army_hq_presidential_review_coherence.test.ts`
  - Passed: `4/4`
- `npx.cmd tsx --test tests\ui_map_game_state_adapter.test.ts`
  - Passed: `16/16`

### Full required verification

- `npm.cmd run test:vitest`
  - Passed: `217/217` files, `3024/3024` tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - Passed
- `npm.cmd run build`
  - Passed

### Verification notes

- Full Vitest still emitted pre-existing non-blocking stderr/anomaly warnings from unrelated integration coverage.
- Those warnings were unchanged by this lane.

## Outcome

The player-facing attention story is now easier to explain:

- Presidential review is one queue.
- Reserve management is one separate queue.
- The field toolbar advertises both without pretending they are the same institution.
- Army-level reserve pressure now has a direct, truthful attention path into its owner.

## Residual Risks

- Reserve pressure is now visible and separate, but the overall alert hierarchy between reserve urgency, political urgency, and interrupt-style modals is still broader product work.
- Critical reserve requests are color-signaled, but not yet described through richer severity language.
- Army HQ and the toolbar now agree on ownership, but there is still room for a future army-level attention contract outside the presidential shell if the product wants stronger institutional separation.

## Integration Notes

### `docs/PROJECT_LEDGER.md`

Add:

`2026-04-08 - Army Reserve Urgency Signaling / Army-Level Attention Contract: added one distinct army-level reserve urgency signal to the tactical PresidentialToolbar, sourced from the canonical armyReserveQueue summary and routed directly to the existing Army Reserve desk. Presidential review signaling remains keyed only to presidentialReviewQueue, so reserve pressure is now visible without collapsing back into presidential military review or introducing merged urgency counts.`

### `docs/plans/MASTER_ROADMAP.md`

Mark complete only if wording matches:
- reserve pressure now has one explicit army-level toolbar signal
- presidential review count remains separate and unmerged
- reserve urgency routes directly to the Army Reserve desk
- no claim of broader command-shell alert redesign

Recommended next lane:
- `Army Reserve Severity Legibility / Critical Request Framing`

### `.claude/architect_notes.md`

Add:

`When adjacent institutions both need attention signals, keep each urgency source mapped to its own owner even if they share one shell. In AWWV, presidentialReviewQueue owns presidential military review and armyReserveQueue owns reserve-management pressure; the field toolbar may advertise both, but it must not merge their counts or route reserve pressure through the presidential queue.`

## Recommended Next Lane

`Army Reserve Severity Legibility / Critical Request Framing`

Why:
- reserve ownership and attention routing are now clear
- the next bounded improvement is making critical reserve pressure more legible without expanding into full command-shell redesign
