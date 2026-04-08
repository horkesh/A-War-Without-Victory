# v0.8-to-v0.9 Army HQ / Presidential Review Queue Coherence

Date: 2026-04-08
Lane: `Army HQ / Presidential Review Queue Coherence`
Status: Complete

## Why this seam

The packaged desktop/runtime contract was already strong enough that another micro-proof would have been lower-value than a player-facing coherence repair.

The highest-value bounded review seam was in the live military review flow:

- the tactical toolbar advertised urgent attention through separate badges
- Army HQ `BRIEFING` mixed situational context with presidential work
- pending event decisions, officer/personnel directives, and command-reaction reviews did not have one explicit live review owner

That made the player-facing question “what needs my action now?” harder than it should have been.

## Candidate seams considered

1. `Army HQ briefing vs live presidential review queue ownership`
   - Chosen.
   - Strongest bounded improvement to the live review story without redesigning the whole shell.

2. `Officer-event modal ownership cleanup only`
   - Deferred.
   - Real but narrower; fixing only the officer badge would still leave event decisions and command reactions split from the same live review story.

3. `Reserve request / Army HQ review unification`
   - Deferred.
   - Valuable, but it crosses into the separate `ArmyReservePanel` ownership path and would have widened the lane beyond one coherent military-review seam.

4. `Political peace/dayton queue integration`
   - Deferred.
   - Those are presidential, but not Army HQ military review. Pulling them into this lane would have blurred institutional ownership instead of clarifying it.

## Audit

Before this lane:

- `state.commandBriefing` was already the canonical situational packet
- `pendingEventDecisions` already owned live event decisions
- `pendingOfficerEvents` already owned both personnel directives and command-reaction events
- the tactical toolbar still split urgent review into:
  - `DECISION(S)`
  - `OFFICERS`
  - `TENSIONS RISING`
- Army HQ `BRIEFING` showed:
  - commander/context blocks
  - Chief of Staff narrative
  - `SituationBriefing`
  - corps cards

The missing product contract was not more data. It was review ownership.

## Design

The design goal was narrow and explicit:

- keep `commandBriefing` as context
- keep existing sim/adapter-owned pending review packets as truth owners
- add one canonical Army HQ / presidential military review queue summary over those packets
- make the tactical toolbar advertise one review signal instead of multiple competing attention owners
- make Army HQ `BRIEFING` explicitly own the live military review queue and its actions

In scope:

- canonical review-count summary
- Army HQ attention panel for:
  - event decisions
  - command reactions
  - personnel directives
- toolbar handoff simplification

Deferred:

- reserve-request unification
- peace/dayton political review integration
- broader shell/product redesign

## Implementation

### Canonical review summary

Added `presidentialReviewQueue` to `LoadedGameState`, derived in `GameStateAdapter` from existing pending military review owners:

- `pendingEventDecisions`
- `pendingOfficerEvents` command-reaction types:
  - `order_modified`
  - `order_pushback`
  - `order_refused`
- `pendingOfficerEvents` personnel-directive types:
  - `officer_available`
  - `replacement_suggested`
  - `officer_relieved`

This packet is summary-only:

- `pendingCount`
- `criticalCount`
- `eventDecisionCount`
- `commandInterpretationCount`
- `personnelDirectiveCount`

That keeps the summary owner canonical without duplicating the nested action payloads already owned by the existing packets.

### Tactical toolbar ownership cleanup

`PresidentialToolbar` now consumes one canonical pending review count:

- old split:
  - `pendingDecisions`
  - `pendingOfficerEvents`
- new:
  - `pendingReviews`

The toolbar now presents one Army HQ review signal:

- `1 REVIEW` / `N REVIEWS`

`pressureWarning` remains separate because it is situational pressure, not a pending presidential work item.

The separate tactical `OfficerEventBadge` is no longer part of the presidential field-command toolbar review story.

### Army HQ live review owner

Added `PresidentialAttentionPanel` to Army HQ `BRIEFING`.

This panel now explicitly owns the live military review queue and distinguishes it from the situation briefing:

- `Presidential Decisions`
  - renders pending event decisions
  - uses the existing `respondToEventDecision(...)` IPC path
- `Command Reactions`
  - embeds `OrderInterpretationPanel`
  - continues to use the existing officer-event acknowledge/override path
- `Personnel Directives`
  - renders officer arrivals, replacement offers, relieved-officer review items
  - uses the existing:
    - `acknowledgeOfficerEvent(...)`
    - `acceptOfficerReplacement(...)`

The panel also states the ownership rule directly:

> This queue owns live military review work. Situation briefing below is context, not the action queue.

That is the core player-facing coherence gain of the lane.

## Files changed

- `src/ui/map/data/types.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/App.tsx`
- `src/ui/map/components/PresidentialToolbar.tsx`
- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- `src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/army_hq_presidential_review_coherence.test.ts`

## Verification

Targeted checks:

- `npx.cmd vitest run tests/army_hq_presidential_review_coherence.test.ts tests/ui_shell_navigation.test.ts`
  - passed, `15/15`
- `npx.cmd tsx --test tests\\ui_map_game_state_adapter.test.ts`
  - passed, `15/15`
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - passed

Full required checks:

- `npm.cmd run test:vitest`
  - passed, `217/217` files and `3022/3022` tests
- `npm.cmd run build`
  - passed

Verification note:

- full Vitest still emitted pre-existing stderr/anomaly warnings from unrelated integration coverage; they were non-blocking and unchanged by this lane

## Result

Before this lane, “presidential attention” was distributed across separate tactical signals and Army HQ context blocks.

After this lane:

- the toolbar has one canonical military review signal
- Army HQ `BRIEFING` has one explicit live military review queue owner
- `commandBriefing` remains situational context instead of silently doubling as the action queue

The player-facing review story is now easier to explain:

- `REVIEWS` = pending military work requiring presidential attention
- `SITUATION BRIEFING` = context for understanding the battlefield, not the queue itself

## Deferred

- reserve-request integration into the same Army HQ presidential queue
- political peace/dayton queue integration
- broader shell-level review/inbox redesign

## Integration notes

### `docs/PROJECT_LEDGER.md`

Add:

`2026-04-08 - Army HQ / Presidential Review Queue Coherence: introduced a canonical presidentialReviewQueue summary in LoadedGameState, derived from pendingEventDecisions plus pendingOfficerEvents command-reaction and personnel-directive items. PresidentialToolbar now advertises one military review signal (REVIEW/REVIEWS) instead of separate decision/officer urgency owners, and ArmyHQModal BRIEFING now renders a PresidentialAttentionPanel that explicitly owns live military review work while leaving commandBriefing as situational context. The panel routes existing event decision, order interpretation, and personnel directive actions through the already-canonical IPC paths rather than inventing a second action surface.`

### `docs/plans/MASTER_ROADMAP.md`

Mark complete only if wording matches delivered scope:

- one canonical military review queue summary for Army HQ / presidential review
- tactical toolbar urgency collapsed to one review signal
- Army HQ `BRIEFING` now distinguishes live review ownership from situational context
- no claim of reserve-request or political peace/dayton unification

Recommended next lane:

- `Army Reserve Request / Presidential Review Boundary`

### `.claude/architect_notes.md`

Add:

`When a live command shell contains both urgent work and situational context, never let the context packet become the de facto review queue. Keep the context packet truthful to its owner, derive a separate canonical review summary from the actual pending work owners, and make the shell advertise one urgency signal that routes into the surface that owns the actions.`

