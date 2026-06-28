# P19 Battle Marker, Sparse Army HQ, and Priority Truth

**Date:** 2026-06-28  
**Branch:** `codex/p19-d2-polish-continuation`  
**PR:** #460  
**Scope:** UI/map-interaction/read-model/i18n/test/docs polish.

## Summary

This packet absorbs the Averroes, Carver, and Schrodinger scout residuals from the P19 owner-playthrough polish lane.

- Battle-marker hover and context-menu behavior now matches the actual settlement battle-context route.
- Army HQ sparse cohesion/frontage data now renders as unreported rather than healthy, zero, or exact-looking density.
- Warroom and Turn Aftermath priority surfaces now use effective blocker severity and expose disabled-control reasons.
- Decision Room quiet-state copy no longer frames absent review items as future buried items.

## Changes

- `Tooltip` uses `tooltip.clickForBattleSettlement` for battle markers.
- `useMapInteractions` includes `battle-markers-pulse` in context-menu hit-testing, routes battle right-clicks as settlement context, and clears lower-priority delayed hover state on battle hover.
- `ArmyHQCorpsCard` exposes cohesion report state/title/aria and renders missing cohesion at zero visual fill with unreported provenance.
- `OrbatSection` renders missing brigade cohesion as `Unreported` instead of empty zero segments.
- `SectorsSection` returns nullable current density and renders `Frontage unreported` when line holders exist without reported front segments.
- `turnAftermath` uses `effectiveInboxSeverity` for next-action blocker counts and top-item severity.
- `WarroomStatusBar` explains disabled priority review, priority row, source handoff, and open-board controls.
- EN/BCS i18n keys were added for the new copy.

## Verification

- `npm.cmd exec -- vitest run tests/ui_map_interactions.test.ts tests/ui_map_tooltip_player_visibility.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui/turn_aftermath.test.ts tests/ui/advance_turn_button_gated_feedback.test.ts tests/ui/operation_aar_records_review.test.ts --pool=forks --reporter=dot` passed: 6 files / 141 tests, including the prior GitHub failure.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:first-hour:browser` passed.
- `git diff --check` passed.

## Determinism

No simulation logic, event evaluator mechanics, event JSON, scenario source data, startup snapshot construction, save schema, calibration threshold, golden manifest, structural fingerprint artifact, Srebrenica/Zepa event ownership, randomness, timestamps, locale sorting, installer artifact, or persisted output ordering changed.
