# Visual polish Phase C — art wiring (2026-11-05)

**Packet:** [2026-11-05-visual-polish-art-direction-plan.md](../../plans/2026-11-05-visual-polish-art-direction-plan.md), Phase C, run before Phase B on the owner's accepted re-order.
**Branch:** `claude/visual-polish-phase-c`, stacked on `claude/visual-polish-art-direction` (PR #525), worktree `F:/AWWV-worktrees/visual-polish`.
**Scope:** presentation only. No focus, dismissal, keyboard, response or state logic changed in any dialog. No data file changed.

## What changed

- **Required event decision carries an image header.** `EventDecisionModal.tsx` now renders the shared `DecisionModalImageHeader` (the component six sibling decision modals already use) above the dossier. The art is the event's own documentary still when the catalog event authors an `image`, otherwise a decision plate chosen by the event's category through the new `getDecisionHeaderForEventCategory` in `presidentialDeskAssets.ts` (political and diplomatic → diplomacy plate, military and territorial → military staff, humanitarian → humanitarian convoy, command → personnel, economic → intelligence; unknown → military staff). The eyebrow carries "Decision required", the faction and the date; the category stays in the dossier aside, so it is not repeated. The rotated category stamp and the plain `h3` title are replaced; the heading keeps `id="event-decision-title"` through the header's `titleId`, so `aria-labelledby` still resolves.
- **Turn aftermath draws a consequence still behind its header.** `TurnAftermathModal.tsx` layers one of the five `consequence_*` plates, chosen by the turn's tone through `getConsequenceStillForTone` (gain → reserve deployment, loss → public pressure, mixed → humanitarian access, quiet → negotiated settlement), under a left-to-right fade so the text keeps its contrast.
- **Army HQ crest at nameplate size.** The 32 px, 80 % opacity crest in `ArmyHQModal.tsx` becomes 44 px with a drop shadow, next to the army name.
- **`DecisionModalImageHeader.tsx`** gains an optional `imageTestId` so tests can find the art without reaching into markup.
- **`eventIllustrationArt.ts`** header comment corrected: the directory ships 31 stills and 28 events author an `image`; it is no longer "intentionally empty".
- **Tests.** New `tests/ui/decision_modal_art_wiring.test.ts` (RED 6/6 before, GREEN 6/6 after): a plate for every category and a fallback, a still for every tone, the category plate renders when the event has no image and the labelled title survives, the authored illustration wins when present, and source checks for the aftermath still and the crest. `tests/modal_migration_3.test.ts` and `tests/v093_a11y_lane_a_modal_stack.test.ts` accept `titleId="…"` as the id declaration, because the shared header component renders the heading that carries it.

## Evidence (`F:/AWWV-worktrees/_logs/visual-polish/C/`)

- `art_wiring_RED.log` (6 failed before implementation), `art_wiring_GREEN.log` (6 passed after).
- `tsc_final2.log` exit 0; `vitest_final.log` 23 files / 228 tests pass (decision, aftermath, Army HQ, modal migration and a11y contracts, event modal, typography, map style contract); `vitest_contract2.log` 37 pass after the test-message fix; `map_build.log` `desktop:map:build` exit 0.
- `first_decision_header_1366_final.jpg`: the turn-1 "What Is Bosnia?" decision on the real Vite route (port 3003, RBiH) with the diplomacy plate, eyebrow and title; response rail unchanged below. `army_hq_crest_1366_after.jpg`: Army HQ nameplate with the enlarged crest.
- The aftermath still has source-test and typecheck proof only: the browser dev route does not advance turns (desktop-owned), so no aftermath screenshot was taken. Zero turns advanced.
- Stale HMR console lines from an earlier module-edit ordering remain in the tab's console buffer; the served module exports were verified with `curl` and the reloaded route renders every surface.

## Simplify pass

Four review lenses (reuse, simplification, efficiency, altitude) ran on the diff. Fixed in this slice:

- `getConsequenceStillForTone` drops a fallback the `Record<TurnAftermathTone, string>` type already makes unreachable.
- `getDecisionHeaderForEventCategory` matches catalog categories exactly, like the sibling label lookup, instead of trimming and lower-casing.
- The decision modal body is re-indented inside its new padding wrapper so the file reads as nested.
- The crest test no longer pins a class string; it checks the test id only.
- The aftermath header band carries a comment naming `DecisionModalImageHeader` as the owner of the shared image-plus-fade recipe.

Recorded, not done: give `DecisionModalImageHeader` an actions slot so the aftermath header can reuse it instead of an inline band; type the category table with the event category union once `EventDefinition` exports one; share the `declaresId` helper between the two modal contract tests; if product wants a more relevant aftermath image, add a primary family to the aftermath view and prefer `getConsequenceStillForRecord` with tone as fallback. The altitude review kept the category-keyed plate table, the `titleId` acceptance in the contract tests and the tone-keyed stills as the right depth. The efficiency review found no waste.

After the fixes: `tsc` exit 0, 13 files / 162 tests pass, `desktop:map:build` exit 0 (`C/tsc_post_simplify.log`, `C/vitest_post_simplify.log`, `C/map_build_post_simplify.log`).

## Not done in this phase

- No additional `image` keys were authored on events; the plan's decision packet for which events should carry an illustration (Historian and canon seats for §6 events) is still to be written.
- Effect rows keep their exact copy and layout; the "typed staff memo" rewording waits for the Game Designer seat.
