# Event and Campaign-Cost Raw-Copy Closure

**Date:** 2026-06-18  
**Scope:** UI/read-model presentation and regression tests only.

**Supersession note (P17, 2026-06-27):** This report's future-consequence card sanitization work is historically true, but the pre-choice `EventDecisionModal` future-consequence card surface is now retired. Future-consequence metadata remains for diagnostics and post-choice receipt/accounting paths.

## Summary

This Pyrrhic UI sweep closes the remaining high-priority non-operation raw-copy leaks identified after the Codex/replay and Records/sitrep passes.

- Event decision response previews now use the same non-display effect filter as the event modal, keeping engine/audit-only effects out of player-facing choice previews.
- Historical note: event decision future-consequence cards sanitized raw consequence IDs, catalog filenames, and diagnostic "Recording..." fragments in this packet. P17 supersedes that behavior by removing pre-choice future-consequence cards entirely.
- Browser fallback event-decision failures now log raw detail to the console but show generic player copy.
- War Cost Summary opportunity responses and finding badges now render player-facing labels instead of raw response, faction, and severity IDs.
- Army HQ campaign-cost surfaces localize severity, replace visible OSID wording with territorial-balance copy, and render latest desk item types through decision-surface labels.
- Army HQ latest-desk item type labels are localized by decision family id, so non-event items such as humanitarian convoys do not fall back to English registry labels in BCS.

## Files

- `src/ui/map/App.tsx`
- `src/ui/map/components/EventDecisionModal.tsx`
- `src/ui/map/components/EventModal.tsx`
- `src/ui/map/utils/eventEffectDisplay.ts`
- `src/ui/map/components/WarCostSummary.tsx`
- `src/ui/map/components/army_hq/WarSummaryContent.tsx`
- `src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx`
- `src/ui/map/i18n/messages.en.ts`
- `src/ui/map/i18n/messages.bcs.ts`
- Focused UI tests under `tests/ui/`

## Verification

Local integration proof:

```powershell
npx.cmd vitest run tests/ui/event_decision_modal_phase3.test.ts tests/ui/event_decision_auto_launch_contract.test.ts tests/ui/event_modal_effect_filter.test.ts tests/ui/event_decision_modal_catalog.test.ts tests/ui/error_copy_contract.test.ts tests/load_error_toast.test.ts tests/ui/war_cost_summary.test.ts tests/ui/turn_aftermath.test.ts tests/ui/turn_aftermath_records_panel_i18n.test.ts tests/ui/war_summary_campaign_cost_i18n.test.ts tests/ui/ui_copy_raw_id_fallbacks.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck -- --pretty false
npm.cmd run test:vitest:fast
git diff --check
```

Focused integration pack passed 11 files / 67 tests before the reviewer follow-up. Typecheck passed. Fast Vitest passed 1065 files / 10026 tests with 3 files skipped. The reviewer-found BCS non-event action-type leak was fixed and `tests/ui/turn_aftermath_records_panel_i18n.test.ts` passed 3/3 after adding convoy coverage.

## Determinism

No simulation logic, scenario data, save schema, serialization, generated artifacts, calibration floor, golden baselines, randomness, timestamps, persisted output ordering, or packaged installer artifact changed.
