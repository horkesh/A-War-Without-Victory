# Player Surface Polish Wave

**Date:** 2026-06-24
**Result:** Local proof green; ready for commit/merge after final diff review.

## Summary
- Preserved missing command/readiness data as unreported across Force Readiness, Army HQ corps cards, Army Reserve, and ORBAT.
- Corrected Decision Room/Desk ownership so operation opportunities do not become generic proposal cards, blocked Desk advance opens the Advance review modal, modal-required blockers count as required Desk signatures, and pre-advance status cannot say clear while blocker rows disable advance.
- Tightened map truth: stack expansion uses physical unit location only, formation context-menu corps drilldown preserves field context, primary supply fill prefers explicit local OSID supply truth over faction reserve summaries, and sparse Army HQ ORBAT rows no longer invent zeroed metrics or active-green status.

## Changes Made
### Command Truth
- `ForceReadiness` and `ArmyHQCorpsCard` now average only reported cohesion/fatigue values and render absent condition as unreported/neutral presentation.
- `ArmyReservePanel` no longer treats missing command authority as affordable and labels no-suggested-brigade requests as staff-selection pending.
- `OrbatPanel` no longer prints the stale `AWWV v0.6.0-TAC` footer.

### Decision And Desk Ownership
- `presidentialDecisionRoom` filters operation-opportunity reviews out of generic proposal-review cards.
- `PresidentDeskShell` splits blocked advance review from the generic command-surface strip. Blocked advance now opens the Advance review modal; ready advance no longer uses red blocked styling.
- `preAdvanceCommandReview` derives fallback blocker status from the same presidential-blocker source used by AdvanceTurnModal, covering convoy, peace, and Dayton blockers when `playerDecisionSummary` is absent.
- `DeskPacket` receives required item ids from `derivePresidentialBlockers`, so modal-required convoy/peace/Dayton cards count as required signatures even when their visual severity is not `blocking`.

### Map And Supply Truth
- Expanded formation stacks use physical `location_osid` only, not AoR or HQ anchors.
- Formation context-menu `View Corps` uses field inspection with formation/corps/OSID context instead of dropping into a bare corps selection.
- `buildSupplyGeoJSON` accepts player-scoped `supplyStateByOsid` and uses explicit OSID supply state before faction reserves, conditions, or legacy pressure.
- `OrbatSection` renders absent personnel, morale, cohesion, fatigue, entrenchment, status, and posture as unreported/neutral instead of zero or active-green.

## Verification To Date
- Focused pack passed 10 files / 104 tests:
  - `node node_modules\vitest\vitest.mjs run tests\ui\army_hq_readiness_threat_copy.test.ts tests\ui\army_reserve_hook_order.test.ts tests\ui\orbatpanel_drilldown_routing.test.ts tests\ui\decision_room_review_proposal.test.ts tests\ui\map_click_routing_contract.test.ts tests\ui_player_visibility.test.ts tests\ui\president_desk_shell.test.ts tests\ui\supply_fallbacks.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\gui_audit_label_discipline.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 566 tests.
- `npm.cmd run qa:first-hour:browser` passed and verified dev-server cleanup.
- `npm.cmd run qa:live-surface:browser` passed and verified dev-server cleanup.
- `git diff --check` passed; Git reported only the expected line-ending normalization warning for the touched supply builder.
- Pending before merge/push: final diff review, commit/merge, branch cleanup, and GitHub green verification after push.

## Files Changed
| File | Change |
| --- | --- |
| `src/ui/map/components/army_hq/ForceReadiness.tsx` | Reported-only condition averages and unreported fatigue copy. |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` | Neutral missing condition presentation. |
| `src/ui/map/components/ArmyReservePanel.tsx` | Missing command authority/staff selection presentation. |
| `src/ui/map/components/OrbatPanel.tsx` | Removed stale version footer. |
| `src/ui/map/components/army_hq/OrbatSection.tsx` | Sparse brigade metrics/status/posture render as unreported. |
| `src/ui/map/data/presidentialDecisionRoom.ts` | Operation-opportunity reviews excluded from generic proposal cards. |
| `src/ui/map/data/preAdvanceCommandReview.ts` | Shared blocker count/status for modal-required blockers. |
| `src/ui/map/components/presidential_desk/DeskPacket.tsx` | Required signature count driven by presidential-blocker ids. |
| `src/ui/map/components/presidential_desk/PresidentDeskShell.tsx` | Blocked advance opens advance review; ready CTA styling corrected. |
| `src/ui/map/map/builders/buildSupplyGeoJSON.ts` | Explicit OSID supply state takes primary fill precedence. |
| `src/ui/map/map/MapContainer.tsx` | Passes OSID supply state to primary supply fill and preserves context-menu field inspection. |
| `src/ui/map/utils/visibleFormationStack.ts` | Physical-only stack expansion. |
| `tests/**` | Focused regressions for the above player-truth contracts. |

## Next Steps
- Commit, merge to `main`, push, delete the branch, and verify GitHub checks before considering this lane integrated.
