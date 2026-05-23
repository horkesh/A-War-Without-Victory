# Command Briefing Supply Visibility

**Date:** 2026-05-23
**Result:** Implemented

## Summary
- Added a deterministic logistics collector to the sim-side command briefing.
- The collector summarizes player-faction supply-state counts and corridor risk from existing canonical supply reports.
- No supply mechanics, map overlay behavior, scenario data, save schema, calibration/army-arc tuning, or combat math changed.

## Changes Made
### Command Briefing
- `assembleCommandBriefing(...)` now reads `supply_state_by_osid.factions[]` scoped to the requested faction.
- It also reads `supply_corridors_osid.corridors[]` scoped to the requested faction.
- The briefing emits one `log-supply` item:
  - `critical` when any player-faction OSID is critical or any player-faction corridor is cut.
  - `warning` when supply is strained or a corridor is brittle.
  - `info` when only adequate/open supply evidence exists.

### Tests
- Added command-briefing regression coverage for faction-scoped supply and corridor reporting.

## Verification
- Red/green: `npx.cmd vitest run tests\command_briefing.test.ts --reporter=dot` failed before implementation on missing `log-supply`, then PASS 9/9 after implementation.
- `npx.cmd vitest run tests\command_briefing.test.ts tests\ui_player_supply_visibility.test.ts tests\ui_decision_room_supply_visibility.test.ts tests\supply_panel_contract.test.ts --reporter=dot` PASS 22/22.
- `npm.cmd run typecheck` PASS.
- `npm.cmd run test:baselines` PASS, no baseline manifest refresh required.
- `git diff --check` PASS.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/briefing/collect_briefing.ts` | Adds faction-scoped logistics/supply briefing collector. |
| `tests/command_briefing.test.ts` | Adds supply/corridor briefing regression. |

## Next Steps
- The map supply-reach overlay already exists; remaining supply/logistics lift is visual polish and stronger operational affordances, not missing substrate.
