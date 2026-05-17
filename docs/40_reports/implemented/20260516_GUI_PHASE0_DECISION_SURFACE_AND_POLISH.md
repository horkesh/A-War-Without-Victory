# GUI Phase 0 Decision Surface And Polish

**Date:** 2026-05-16  
**Plans:** `docs/plans/2026-05-16-aaa-triple-plus-shipping-plan.md` Phase 0 Track A0/B, `docs/plans/2026-05-16-gui-polish-action-plan.md`, `docs/plans/2026-05-16-gui-playtest-defects-plan.md`

## Summary

Phase 0 implementation closed the sensitive-history Inbox blocker and the 2026-05-16 playtest launch-blocker set, then carried the broader GUI polish backlog through the high-confidence, non-design-blocked slices.

The decision-surface audit found two hidden player-decision families beyond the original paramilitary issue. The Inbox now covers paramilitary requests, convoy decisions, and Dayton negotiation in addition to the existing event, peace-plan, autonomy, opportunity, reserve, and officer/personnel rows.

## Code Changes

- Added `ParamilitaryReviewModal` and desktop IPC routing through the existing canonical paramilitary resolver.
- Exposed `pending_paramilitary_requests` in the UI data contract and added blocking Presidential Inbox cards with explicit war-crimes/civilian-risk copy.
- Added Inbox rows for `pendingDayton` and `pendingConvoyDecisions`.
- Filtered pending officer/personnel events to the current player faction.
- Added panel-level `RootErrorBoundary` wrappers for map, toolbar, sidebar, and right-panel zones.
- Hardened Deck.gl OSID damage and force-quality polygon builders against invalid coordinates.
- Made blocked ADVANCE actions route to Decision Room review instead of silently doing nothing.
- Improved Vance-Owen/peace-plan modal: accessible meters, player-faction filtering, Review Later, accept/reject regressions.
- Completed War Summary empty states, personnel label reconciliation, and OPSEC count wording.
- Normalized tutorial behavior so progressed saves without newer tutorial metadata do not replay first-run onboarding.
- Added Inbox dedupe for repeated personnel events and clarified RECORDS routing.
- Added Warroom no-state side-picker CTA, visible hotspot labels, and blocked-advance parity.
- Added right-rail quiet Inbox Command Watch capsule and opened OOB Situation by default.
- Added Decision Room progressive disclosure: command/priorities first, advanced metrics/product-loop/lenses/handoffs behind `View Advanced`.
- Added confirmation before Army HQ Emergency Posture bulk corps orders.
- Raised active ops-planning/toolbar typography floor and made AUTH gauge discoverable without relying only on `title`.
- Retired dead `TopToolbar` / `MapModeToolbar` chrome into `_retired_chrome`.
- Added ESC/pause regression coverage.

## Deferred With Reason

- `GUI_POLISH_MASTER` P1-9 CRT overlay is an explicit aesthetic/design-owner call.
- Full onboarding consolidation remains Phase 1 Track D: this wave fixed persistence and sequencing regressions but did not collapse the product into a coachmark system.
- Full map information-design work remains Phase 1 Track C.
- Audio, localization, marketing, telemetry, and store work remain later AAA+++ phases.

## Verification

- `npm.cmd run typecheck` passed.
- `npx.cmd vitest run tests\ui\paramilitary_review_modal.test.ts tests\ui\peace_plan_modal.test.ts tests\ui\inbox_items.test.ts tests\ui\inbox_dedup.test.ts tests\ui\records_button_behavior.test.ts tests\ui\no_unicode_escapes_in_rendered_text.test.ts tests\ui\bottom_status_strip_labels.test.ts tests\ui\error_boundary_isolation.test.ts tests\ui\emergency_posture_confirm.test.ts tests\ui\pause_escape_shortcuts.test.ts tests\ui\gui_polish_typography_floor.test.ts tests\ui\retired_chrome_imports.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\ui\pre_advance_command_review.test.ts tests\sim\command\phase4_ui_data_layer.test.ts tests\desktop_persistence_contract.test.ts` passed 81/81.
- `npm.cmd run desktop:sim:build` passed with the existing `import.meta` CJS warning.
- `npm.cmd run desktop:map:build` passed with existing Vite/browser-external/dynamic-import/chunk warnings.
- `git diff --check` passed; output only included CRLF normalization warnings.

## Status

Phase 0 Track A0 is closed for engineering scope. Track B is closed for the non-design-blocked Phase 0 slices implemented in this wave; remaining design/product items are explicitly carried into later roadmap tracks rather than silently claimed.
