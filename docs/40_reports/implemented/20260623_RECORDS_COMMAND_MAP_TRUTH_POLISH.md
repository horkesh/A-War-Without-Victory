# Records, Command, and Map Truth Polish

**Date:** 2026-06-23
**Run ID:** N/A
**Baseline:** `2a9669143` (`main`, green after command-anchor rebaseline)
**Result:** UI/read-model/map truth polish implemented on `codex/records-command-truth-polish`

## Summary
- Closed the next Pyrrhic scout tranche across Records provenance, command controls, Army Reserve browser-mode safety, valid posture/stance labels, map tooltip truth, and sector frontline fills.
- Kept the packet UI/read-model/map-projection only: no simulation logic, scenario source data, startup snapshot, save schema, baseline manifest, structural fingerprint, or packaging changes.
- Verified with focused tests, the broader player-journey pack, typecheck, diff check, and live browser gates against the active `http://127.0.0.1:3003/?dev=1` app.

## Changes Made

### Records Provenance
- `buildTurnAftermathView` now suppresses decision-event signals from turn summaries unless a matching `event_decision_log` row proves `decision_source === 'player'` for the loaded player faction.
- Pending decision events, bot-authored decisions, and foreign-faction decisions no longer become Records strategic signals.
- Non-decision historical events remain visible, preserving the ordinary event-memory path.

### Command Surfaces
- Operations Panel close now actually closes the panel and clears selection/hover/target state.
- Missing operation `supply_readiness` renders as `Unassessed`, while explicit failure counters can still render `Strained` or `Fragile`.
- Valid formation postures (`dig_in`, `counterattack`, `elastic_defense`, `defend_at_all_costs`, `assault`) and sector stances (`defensive`, `balanced`, `offensive`) now resolve to player-facing copy.
- Army Reserve live command buttons are disabled and guarded when the desktop command bridge is unavailable in browser/dev mode.

### Map Truth
- Front tooltips now list own formations only from live line holders, not reserve/AoR-only membership.
- Defense and density fill builders derive staffed frontline truth from `buildSectorFormationAssignment(...).lineHoldingIds` plus the shared fielded tactical-formation boundary.
- Defense strength no longer grants a defensive stance bonus when `sector_stance` is unreported; missing stance is neutral.
- Field-inspection routing clears expanded stack overlays along with hover/tooltip chrome.
- OSID hover state is cleared when front-edge priority wins, preventing stale OSID tooltips under front-edge inspection.
- Operations Panel allocated-brigade drilldowns now preserve the brigade's known settlement anchor.

## Verification
- Focused pack: `.\vitest.cmd run tests\ui\turn_aftermath.test.ts tests\ui\oob_operations_panel.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\army_reserve_hook_order.test.ts tests\ui_map_tooltip_player_visibility.test.ts tests\ui_map_sector_frontline_fills.test.ts tests\ui\gamestore_field_inspection.test.ts tests\ui_map_interactions.test.ts --pool=forks --reporter=dot` passed 8 files / 101 tests.
- Fix-forward blocker pack: `.\vitest.cmd run tests\ui_map_sector_frontline_fills.test.ts tests\ui\oob_operations_panel.test.ts --pool=forks --reporter=dot` passed 2 files / 16 tests.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 542 tests.
- `AWWV_LIVE_SURFACE_BROWSER_URL=http://127.0.0.1:3003/?dev=1 npm.cmd run qa:live-surface:browser` passed.
- `AWWV_FIRST_HOUR_BROWSER_URL=http://127.0.0.1:3003/?dev=1 npm.cmd run qa:first-hour:browser` passed.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/data/turnAftermath.ts` | Player-filed decision-event signal gate |
| `src/ui/map/components/OperationsPanel.tsx` | Close behavior and unassessed supply readiness |
| `src/ui/map/components/ArmyReservePanel.tsx` | Browser-mode bridge guard/disabled live controls |
| `src/ui/map/utils/playerSafeText.ts` | Added canonical posture/stance labels |
| `src/ui/map/components/tooltipPlayerSafe.ts` | Own-line labels scoped to line holders |
| `src/ui/map/map/builders/buildDefenseStrengthGeoJSON.ts` | Defense fills use current line-holder truth |
| `src/ui/map/map/builders/buildDensityGeoJSON.ts` | Density fills use current line-holder truth |
| `src/ui/map/map/useMapInteractions.ts` | Front-edge hover clears stale OSID hover |
| `src/ui/map/store/gameStore.ts` | Field inspection clears expanded stack overlay |
| `src/ui/map/i18n/messages.en.ts` / `messages.bcs.ts` | Added operations unassessed label |
| `tests/...` | Focused regressions for provenance, command, reserve, tooltip, fill, and hover behavior |

## Lessons Learned
- Turn summaries are not enough provenance for decision history; decision-event rows need filed-player ownership before they become player memory.
- Reserve and AoR membership are useful navigation/context facts, but they must not be treated as live frontline truth.
- Browser/dev command controls should fail closed and visibly read-only when Electron IPC is absent.

## Next Steps
- Continue the broader D2 polish plan with the next non-BCS, non-packaging scout tranche: operation-detail player copy, Records/Chronicle receipt dedupe, and live map/Army HQ ergonomics.
- Keep batching related UI/read-model fixes before long CI runs; this packet demonstrates a useful size for verification without excessive wait churn.
