# First-Run Inbox / HQ Flow Polish

## Summary

This lane fixed the confusing first tactical start reported during live playtest: War Begins, tutorial, first-turn orientation, and inbox cards could all compete for attention, while visible Presidential Inbox situation cards did not open the owning review surface.

The shipped behavior is:

- War Begins is the first blocking start-of-war briefing.
- Tutorial appears after War Begins is dismissed.
- First-turn orientation is suppressed while War Begins or tutorial is active.
- Presidential Inbox situation cards stay informational for badge counts but route to Army HQ BRIEFING when clicked.
- Army HQ BRIEFING starts with Chief of Staff / commander context before Presidential Decision Room synthesis.
- War Begins date falls back from legacy/dev `UNKNOWN` metadata to the deterministic turn label.

## Root Causes

- `App.tsx` mounted War Begins, tutorial onboarding, and first-turn orientation from independent predicates, so valid first-run helpers could stack.
- `deriveInboxItems(...)` correctly marked situation items as informational, but used `action: 'none'`, making the cards disabled.
- `PresidentialInbox.tsx` also hard-coded situation-card clicks as a no-op, so changing the action in data alone was insufficient.
- `ArmyHQModal.tsx` rendered `PresidentialDecisionRoomPanel` before the Chief of Staff briefing, making the HQ opening read like an abstract priority board instead of a staff report.
- `PeaceWarTransition.tsx` trusted `metadata.date` even when older/dev state supplied the literal `UNKNOWN`.

## Implementation

- Added shell-level first-run sequencing in `App.tsx` with `peaceWarTransitionActive` and `onboardingActive`.
- Added `army_hq_briefing` as an inbox action and routed it through the existing Army HQ briefing tab helper.
- Routed both actionable and situation inbox cards through the same action callback when the card has an action.
- Reordered the Army HQ BRIEFING top section so the Chief of Staff report leads the surface, followed by commander/crest/position, then Presidential Decision Room.
- Added `getPeaceWarTransitionDateLabel(...)` for deterministic date fallback.

## Verification

- `npx.cmd vitest run tests\ui\inbox_items.test.ts tests\ui_presidential_toolbar_summary_click.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\v092_tutorial_lane_e_overlay_a11y.test.ts tests\ui\first_turn_orientation.test.ts tests\ui\peace_war_transition.test.ts` passed 61/61.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite/browser-external/chunk warnings.
- Browser inspection on `http://127.0.0.1:3002/index.html?dev=1` confirmed RBiH start shows War Begins alone, then tutorial, inbox situation cards are enabled, and clicking `Territory Lost` opens Army HQ with Daily Briefing before Presidential Decision Room.

## Determinism

UI/read-model only. No sim state, save schema, scenario data, generated run artifact, randomness, timestamped output, or unstable iteration changed.

## Follow-Up

Continue the broader post-fix UI inspection requested by the user, especially HQ density/readability, overlapping panels, hidden controls, and Warroom-to-tactical handoff clarity.
