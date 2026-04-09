# Military Review Shell Coherence Hardening

**Date:** 2026-04-09
**Status:** COMPLETE
**Lane:** UI/read-model military review shell coherence

## Candidate seams considered

1. Remaining runtime candidate `cmd_vrs_east_bosnian_t29` in run `n1398`
2. Military review shell coherence between `App.tsx`, `WarroomStatusBar.tsx`, and Army HQ / `presidentialReviewQueue`

The UI lane won this cycle because the fresh East Bosnian pass no longer looked like false runtime truth. In `n1398`, `cmd_vrs_east_bosnian_t29` records one real attack on `op:brcko:brka_2`, then recovers as `max_failures`, and the run-level combat-causality counters stay at `invalid_operation_count: 0`, `zero_eligible_attacker_operation_count: 0`, and `recovery_without_logged_attempt_count: 0`. That demoted it from "wrong now" to a realism/tuning audit candidate. With the runtime false-execution class closed, the next bounded hardening seam was the duplicate live military-review owner in the shell.

## Exact seam chosen

Two tactical-shell surfaces were still reading and acting on `pendingEventDecisions` directly even though the repo had already established `presidentialReviewQueue` + Army HQ as the live military review owner:

- `src/ui/map/App.tsx` still built `EventModal` queue items from `loadedGameState.pendingEventDecisions` and submitted `ipc.respondToEventDecision(...)` directly from the tactical shell.
- `src/ui/map/components/warroom/WarroomStatusBar.tsx` still advertised pending review state from `loadedGameState.pendingEventDecisions?.length`.

That left the product with two competing review truths: Army HQ owned the live queue institutionally, but the tactical shell could still answer it locally and the Warroom strip could still summarize it from a different field.

## Ownership after cleanup

- Canonical owner after cleanup: `LoadedGameState.presidentialReviewQueue` summary + Army HQ / `PresidentialAttentionPanel` as the live military review action surface
- Demoted path after cleanup: `App.tsx` direct `pendingEventDecisions` interrupt/response flow and `WarroomStatusBar.tsx` direct `pendingEventDecisions?.length` summary
- Player-visible truth after cleanup: tactical shell may still show non-decision fired events, but live military review work now routes through Army HQ only
- Canonical UI surface after cleanup: Army HQ presidential attention queue, with Warroom status strip reading the same queue summary as the tactical toolbar

## Implementation

1. `src/ui/map/App.tsx`
   - restricted the EventModal queue to non-decision fired events only
   - removed the `pendingEventDecisions` effect entirely
   - removed the direct `ipc.respondToEventDecision(...)` action path from the tactical shell
   - stopped passing `onDecisionResponse` into the EventModal mounted at the app root

2. `src/ui/map/components/warroom/WarroomStatusBar.tsx`
   - switched pending review signaling from `loadedGameState.pendingEventDecisions?.length` to `loadedGameState.presidentialReviewQueue?.pendingCount`
   - updated the strip tooltip/copy from "pending decision(s)" to "pending review(s)"

## Tests

Added/updated failing-then-passing source-boundary regressions:

- `tests/army_hq_presidential_review_coherence.test.ts`
  - now asserts Warroom review signaling reads `loadedGameState.presidentialReviewQueue?.pendingCount`
  - now asserts `WarroomStatusBar.tsx` no longer reads `loadedGameState.pendingEventDecisions?.length`
- `tests/ui_shell_navigation.test.ts`
  - now asserts `App.tsx` no longer contains `loadedGameState.pendingEventDecisions`
  - now asserts `App.tsx` no longer contains `ipc.respondToEventDecision`

## Verification

### Targeted verification

- `npx.cmd vitest run tests/army_hq_presidential_review_coherence.test.ts tests/ui_shell_navigation.test.ts`

### Full verification bar

- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

All passed after the fix.

## Proof

### Why scenario proof is not relevant here

This lane does not change simulation behavior, persisted game-state truth, scenario harness contracts, or anomaly generation. It only removes duplicate shell/read-model ownership on top of already-derived `LoadedGameState` fields. A scenario rerun would not exercise a different simulation path, so the strongest truthful proof is source-boundary regression coverage plus full repo verification.

### Baseline

- `tests/army_hq_presidential_review_coherence.test.ts` failed because `WarroomStatusBar.tsx` did not contain `loadedGameState.presidentialReviewQueue?.pendingCount`
- `tests/ui_shell_navigation.test.ts` failed because `App.tsx` still contained both `loadedGameState.pendingEventDecisions` and `ipc.respondToEventDecision`

### Post-fix rerun

- `npx.cmd vitest run tests/army_hq_presidential_review_coherence.test.ts tests/ui_shell_navigation.test.ts` passed: `19` tests green
- `npm.cmd run test:vitest` passed: `232` files, `3091` tests green
- `npx.cmd tsc --noEmit -p tsconfig.json` passed
- `npm.cmd run build` passed

### Before/after difference

- Tactical shell no longer acts as a second live military review owner
- Warroom review signaling now reads the same queue summary as Army HQ / toolbar
- Non-decision fired events still surface locally, but live review action ownership is no longer split between shell and Army HQ

## Files

- `src/ui/map/App.tsx`
- `src/ui/map/components/warroom/WarroomStatusBar.tsx`
- `tests/army_hq_presidential_review_coherence.test.ts`
- `tests/ui_shell_navigation.test.ts`

## Residual risks

- The next high-value runtime candidate is not the East Bosnian shell of zero-eligible anomalies anymore; it is the still-open `cross_corps_sector_assignment` anomaly family reported in `n1398`, which can still corrupt sector ownership and homeland-defense truth.
- `cmd_vrs_east_bosnian_t29` remains worth auditing, but after `n1398` it reads more like realism/tuning or scenario-priority work than a direct false-runtime-truth seam.

## Follow-on

Best next bounded lane: investigate the `cross_corps_sector_assignment` anomalies in `n1398` (`arbih_717th_slavna_mountain`, `rs_5th_podrinje`) as the next highest-value runtime truth candidate.
