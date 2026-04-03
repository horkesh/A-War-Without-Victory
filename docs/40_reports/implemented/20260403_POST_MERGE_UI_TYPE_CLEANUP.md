# 2026-04-03 - Post-merge UI type cleanup on main

## Summary
- Fixed the live shell cleanup regressions left behind after the truth-ownership merge on `main`.
- Removed one dead archived import path and deleted one invalid legacy test that still referenced the retired theatre module.
- Updated drifting test fixtures so they reflect the current canonical `GameState`, `LoadedGameState`, and shell-navigation contracts instead of the pre-cleanup shapes.

## Files changed
- `src/_archived/ui_legacy/sandbox/sandbox_engine.ts`
- `src/ui/map/components/AARPanel.tsx`
- `src/ui/map/components/OperationsPanel.tsx`
- `tests/army_hq_gathering.test.ts`
- `tests/bot_corps_corridor.test.ts`
- `tests/commander/reinforcement_signal_flow.test.ts`
- `tests/scenario_end_report_army_strengths.test.ts`
- `tests/triggered_operations.test.ts`
- `tests/ui_army_hq_war_summary_visibility.test.ts`
- `tests/theatres.test.ts`

## Why
- The merge correctly retired several legacy/runtime authority paths, but a few UI and test surfaces still assumed the older contracts.
- Leaving these mismatches around would make future cleanups look risky when the real issue was just stale fixtures or archived references.
- Deleting the invalid theatre test is part of the same honesty pass: a removed runtime module should not keep a “green-looking” test scaffold alive.

## Verification
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `node .\node_modules\vitest\vitest.mjs run tests/army_hq_gathering.test.ts tests/bot_corps_corridor.test.ts tests/ui_army_hq_war_summary_visibility.test.ts`
- `node .\node_modules\vitest\vitest.mjs run tests/commander/reinforcement_signal_flow.test.ts`
- `node .\node_modules\tsx\dist\cli.mjs --test tests/scenario_end_report_army_strengths.test.ts tests/triggered_operations.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
