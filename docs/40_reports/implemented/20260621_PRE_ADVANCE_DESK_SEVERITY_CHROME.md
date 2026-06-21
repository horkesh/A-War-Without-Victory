# Pre-Advance / Desk Severity Chrome

**Date:** 2026-06-21
**Run ID:** N/A
**Baseline:** `main` after `20260621_ARMY_HQ_RECORDS_PROVENANCE_DRILLDOWN`
**Result:** Focused UI/i18n closeout for pre-advance and presidential decision-card severity chrome

## Summary
- Closed residual raw severity/status copy on the pre-advance review path, President's Desk decision packets, and the Army HQ-hosted Presidential Decision Room priority cards.
- Added EN/BCS keys for the remaining component-owned severity/chrome labels while preserving read-model ids, routing, card ordering, and decision/blocking semantics.
- Proved the exact BCS display boundaries with focused regression tests before implementation and then reran the combined local pack.

## Changes Made

### Pre-Advance Clearance
- `AdvanceTurnModal` now renders review-item severity labels through the shared Warroom severity vocabulary instead of printing `blocking`, `critical`, `warning`, or `info`.
- Hard-blocker chrome now uses localized `advanceTurn.required` and `advanceTurn.resolveBeforeAdvancing` keys.

### President's Desk
- `DecisionCard` now localizes `urgent`, `normal`, and `info` packet severity badges instead of only localizing the blocking case.
- Decision-card thumbnail alt text now uses a localized packet template while keeping the existing decision-family label source.

### Presidential Decision Room
- `PresidentialDecisionRoomPanel` priority-card severity badges now render localized Warroom severity labels instead of raw enum ids.

## Verification
- Red proof: `npx.cmd vitest run tests\ui\presidential_decision_room_panel_i18n.test.ts --reporter=dot` failed before the panel fix because the BCS priority card still displayed `blocking`.
- Green focused proof: `npx.cmd vitest run tests\ui\presidential_decision_room_panel_i18n.test.ts --reporter=dot` passed 3/3.
- Combined focused proof: `npx.cmd vitest run tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui\warroom_priority_docket.test.ts tests\ui\president_desk_decision_card_fallback.test.ts tests\ui\presidential_decision_room_panel_i18n.test.ts --reporter=dot` passed 20/20.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.
- `npm.cmd run qa:live-surface:browser` passed; evidence showed `ok: true`, live context-menu/AAR/operation-opportunity routing proof flags, and `serverPortCleanupVerified: true`; `.tmp_live_surface_browser_sweep` was removed after inspection.
- `npm.cmd run qa:player-journeys` passed 246/246.

## Files Changed

| File | Change |
| --- | --- |
| `src/ui/map/components/warroom/AdvanceTurnModal.tsx` | Localized review severity labels and hard-blocker chrome. |
| `src/ui/map/components/presidential_desk/DecisionCard.tsx` | Localized packet severity badges and thumbnail alt text. |
| `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx` | Localized priority-card severity badge display. |
| `src/ui/map/i18n/messages.en.ts` | Added EN keys for advance/desk chrome. |
| `src/ui/map/i18n/messages.bcs.ts` | Added BCS keys for advance/desk chrome. |
| `tests/ui/advance_turn_button_gated_feedback.test.ts` | Added BCS pre-advance blocker/review chrome regression. |
| `tests/ui/president_desk_decision_card_fallback.test.ts` | Extended BCS desk packet severity/alt regression. |
| `tests/ui/presidential_decision_room_panel_i18n.test.ts` | Added BCS priority-card severity regression. |

## Determinism / Scope
- UI/i18n/test/docs polish only.
- No simulation logic, scenario data, event mechanics, decision routing, blocker semantics, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Next Steps
- Keep broader BCS/native LQA as a separate lane; this closes only component-owned chrome and raw enum leakage.
