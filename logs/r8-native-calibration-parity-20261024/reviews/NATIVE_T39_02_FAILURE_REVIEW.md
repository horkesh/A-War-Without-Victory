# Native t39-02 retained-failure review

**Verdict: FAILED at turn 0 before opening the Advance confirmation. No gameplay turn or checkpoint evidence was produced.** This is the second distinct native harness failure, so another campaign remains blocked until the packaged production route is proven cheaply through toolbar open, exact modal ownership, exact confirmation dispatch, and turn transition.

## Root cause

`handleCurrentSurface` classifies a held Advance confirmation using `/ADVANCE TURN/i` against the entire body text. The ordinary turn-zero Warroom already contains persistent toolbar copy `ADVANCE TURN -> ARBIH`, even though no confirmation modal exists. The handler therefore returned `advance-turn-modal-held-for-checkpoint`; settlement then called the correctly strict modal dispatcher, which found zero `[aria-labelledby="advance-turn-title"]` owners and failed.

The production modal owner itself is source-backed: `AdvanceTurnModal` passes `ariaLabelledBy="advance-turn-title"`, and the shared `Modal` renders that value on the dialog. Classification must therefore query this exact visible owner. Body copy must play no part in deciding whether the confirmation exists.

Source audit adds a second production fact: an exact toolbar click does not always open the dialog. `PresidentialToolbar.handleAdvanceTurn` and `applyShellHandoffCommand` dispatch directly when pre-advance review is not blocked. They open `AdvanceTurnModal` only on the blocked path. The revised protocol should therefore be:

1. When no exact visible Advance dialog exists, return `none`; after the clean settlement boundary, click the exact toolbar owner.
2. Observe exactly one of two source-owned outcomes: a direct turn transition on the normal clear/review route, or exactly one visible `[aria-labelledby="advance-turn-title"]` dialog on the blocked route. Fail if neither occurs.
3. If the exact dialog appears, classify that owner rather than body text. With `allowAdvanceModal:false`, hold it. Resolve its actual blocker through the existing visible route; once an exact source-owned confirmation action is available, dispatch only that action and wait for the turn transition.
4. Fail on duplicate owners and propagate owner-query failures.

A production-shaped fixture must include the real persistent toolbar string before the toolbar click and prove it does not classify as a modal. It must cover both source-owned branches: toolbar click -> direct turn transition, and toolbar click -> exact blocked dialog -> blocker resolution/held classification -> exact in-dialog confirmation -> turn transition. The retained packaged DOM should be inspected to bind the actual dialog and button identities before any further t39 attempt.

## Retained evidence

- Wrapper/child exit: **1/1**; timeout: **false**.
- Canonical initial evidence exists; current turn remained **0**.
- Events: 29; last snapshot: `initial-post-map-probe-after-drain`.
- Provisional and settled turn archives: **0**; `FINAL_SEAL` rows: **0**.
- Console errors: 0; page errors: 0; unmatched network failures: 0.
- Thirteen raw hillshade aborts were matched by thirteen exact tile signals.
- Main stream contains four contiguous rows and only the expected debugger teardown stderr pair.
- All gameplay, daily-map, turn-39, protection, January-anchor, Save/Resume, hydration, and final-runtime gates are **UNREACHED**.

The t39-01 archival and Decision Room fixes remain independently valid. This failure is a missing negative classifier case in the new Advance-owner protocol; it does not justify weakening exact ownership or returning to body-text matching.
