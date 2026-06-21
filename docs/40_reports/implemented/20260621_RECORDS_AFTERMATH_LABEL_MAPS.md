# Records Aftermath Label Maps

**Date:** 2026-06-21
**Run ID:** N/A
**Baseline:** `main` at `3807fbeba`
**Result:** Army HQ Records / War Summary aftermath chrome now uses explicit i18n label maps instead of dynamic enum-key construction.

## Summary
- Replaced dynamic `turnAftermath.*` key construction in Army HQ Records with typed label maps for tone, cost severity, signal kind, territory direction, campaign momentum, and top desk-item action type.
- Replaced the War Summary campaign-cost severity dynamic key path with the same explicit map pattern.
- Added a focused source-level regression guard so the old `enumLabel(prefix, value)` and `records.actionType.${familyId}` patterns cannot return unnoticed.

## Changes Made
### Army HQ Records
- `TurnAftermathRecordsPanel.tsx` now resolves aftermath badge/action labels through `satisfies Record<..., MessageKey>` maps.
- Top desk-item action labels now use `ACTION_TYPE_LABEL_KEYS` keyed by `DecisionSurfaceFamilyId`, matching the existing consequence-record label-map pattern.

### War Summary
- `WarSummaryContent.tsx` now renders campaign-cost severity through `CAMPAIGN_COST_SEVERITY_LABEL_KEYS`.

### Tests
- `turn_aftermath_records_panel_i18n.test.ts` now checks the explicit label-map contract and rejects the prior dynamic key builders.

## Scenario Results
N/A. This is UI/i18n/read-model display hardening only.

## Lessons Learned
- Dynamic i18n key construction is brittle on player-facing chrome: a new enum member or stale family id can turn into a raw label path or runtime failure at the display edge.
- For compact command/records labels, typed `MessageKey` maps are clearer than string interpolation and keep EN/BCS parity reviewable.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx` | Replaced dynamic aftermath/action label keys with explicit typed maps. |
| `src/ui/map/components/army_hq/WarSummaryContent.tsx` | Replaced dynamic campaign-cost severity key construction with an explicit typed map. |
| `tests/ui/turn_aftermath_records_panel_i18n.test.ts` | Added static regression guard for the label-map boundary. |

## Verification
- `npx.cmd vitest run tests\ui\turn_aftermath_records_panel_i18n.test.ts tests\ui\war_summary_campaign_cost_i18n.test.ts --reporter=dot` passed 6/6.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.
- `npm.cmd run qa:player-journeys` passed 246/246.
- `npm.cmd run qa:live-surface:browser` passed; inspected evidence showed Records AAR formation-link proof, operation-opportunity Inbox/Desk/Decision Room routing proof, map context-menu proof, battle-marker proof, and `serverPortCleanupVerified: true`. `.tmp_live_surface_browser_sweep` was removed after evidence inspection.

## Next Steps
- Continue same-class sweeps on adjacent Records/Chronicle/Army HQ surfaces for dynamic label construction and raw fallback text.
- Keep packaging paused until the live D2 first-hour/polish path remains owner-satisfactory.
