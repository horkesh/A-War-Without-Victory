# Player Surface Truth Sweep

**Date:** 2026-06-25
**Branch:** `codex/p3-player-surface-truth-sweep`
**Status:** Local implementation complete; GitHub closeout pending.

## Summary

This packet closes the next non-packaging, non-BCS owner-playthrough findings from the Sagan, Feynman, and Heisenberg scout wave. The fixes are UI/read-model/accessibility/docs polish only: they preserve sparse truth, keep Records and Chronicle ownership separate, and make browser read-only controls explain themselves.

## Changes

- Army Reserve rows now use player-facing brigade/corps names in reserve action labels, expose recall/decline buttons with specific accessible names, render missing reserve personnel and missing loaned-command fields as unreported, and make campaign history a stateful disclosure with `aria-expanded` and `aria-controls`.
- Presidential Decision Room Chronicle memory now counts only Chronicle-target decision receipts. Records-only receipts still file in Records and no longer create a false Chronicle review card.
- OOB operations, Corps Detail, and Corps Front no longer invent `1/N` current-objective progress or green `0.0` momentum when the loaded operation state omits those values.
- Expanded Army HQ ORBAT campaign-loss rows now preserve partial casualty provenance: reported fields render exactly and missing killed/wounded/missing fields render `Unreported` instead of `0`.
- Settlement local-support controls now show and describe the desktop command bridge unavailable state in browser/dev views, with visible copy and `aria-describedby`.

## Verification

Focused proof passed:

```powershell
npm.cmd exec -- vitest run tests/ui/army_reserve_hook_order.test.ts tests/ui/army_reserve_elite_commander.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/oob_operations_panel.test.ts tests/ui/command_drilldown_routing.test.ts tests/ui/corps_front_panel_routing.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/gui_audit_label_discipline.test.ts --pool=forks --reporter=dot
```

Result: 8 files / 184 tests passed.

Additional local proof passed:

- `npm.cmd run typecheck -- --pretty false`
- `git diff --check`
- `npm.cmd run qa:player-journeys` - 43 files / 616 tests
- `npm.cmd run qa:first-hour:browser`
- `npm.cmd run qa:live-surface:browser`

Manual in-app browser proof on `http://127.0.0.1:3003/` verified fresh RBiH start, `WAR HAS STARTED`, `War begins: 6 Apr 1992`, foundational decision routing and unblock after the historical default, Army HQ opening, Personnel tab, command-card/sector inspect labels, Corps Detail/Corps Front routing from the live map, disabled sector-command bridge-unavailable copy, and console health with only the expected browser-fallback warning.

## Scope / Determinism

UI/read-model/accessibility/test/docs polish only. No simulation logic, scenario source data, event evaluator mechanics, startup snapshot, save schema, calibration floor, baseline/golden manifest, structural fingerprint artifact, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.

## Pending Closeout

- GitHub checks green after push/PR
- Merge to `main`, delete local/remote branch, and confirm no extra worktrees/subagents remain open
