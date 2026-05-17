# Primary Command Quick-Select Cleanup

**Date:** 2026-05-18
**Run ID:** N/A
**Baseline:** `docs/40_reports/CONSOLIDATED_BACKLOG.md` section 16 row "Primary Army / Primary Corps quick-select"
**Result:** Implemented

## Summary
- Removed two unwired `App.tsx` quick-select handlers for primary army and primary corps.
- Preserved the existing visible command paths in `OOBSidebar` and `PresidentialToolbar` rather than adding duplicate toolbar buttons.
- Added a focused UI regression test that fails if the dead handlers return.

## Changes Made
### Tactical Map App
- Deleted `selectPrimaryArmy` and `selectPrimaryCorps` from `src/ui/map/App.tsx`.
- No visible UI button was added because command selection is already exposed through the OOB sidebar army/HQ rows and corps cards.

### Regression Coverage
- Added `tests/ui/app_primary_command_quick_select_cleanup.test.ts`.
- The test statically guards against reintroducing the two unwired `App.tsx` handlers.

## Scenario Results
N/A - UI shell cleanup only. No simulation, scenario data, save schema, or scenario artifacts changed.

## Lessons Learned
- The backlog line was still accurate: the handlers existed but were not passed to any rendered component.
- The smallest product-correct cleanup was deletion, because the live OOB command surface already owns army and corps selection affordances.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/App.tsx` | Removed dead primary army/corps quick-select handlers. |
| `tests/ui/app_primary_command_quick_select_cleanup.test.ts` | Added focused regression guard. |
| `docs/40_reports/implemented/20260518_PRIMARY_COMMAND_QUICK_SELECT_CLEANUP.md` | Recorded implementation and verification notes. |

## Verification
- `npm.cmd run test:ui -- tests/ui/app_primary_command_quick_select_cleanup.test.ts` - passed, 1/1 test.
- `npm.cmd run test:ui -- tests/ui/app_primary_command_quick_select_cleanup.test.ts tests/ui_shell_frame_contract.test.ts tests/ui_presidential_toolbar_summary_click.test.ts` - passed, 12/12 tests.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run desktop:map:build` - passed; emitted existing Vite browser-external/dynamic-import/chunk-size warnings.

## Next Steps
- None for this row.
