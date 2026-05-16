# Windows NSIS Package Build

**Date:** 2026-05-16
**Lane:** Packaging / playtest operator-support
**Result:** Windows installer built and smoke-validated locally.

## Summary
- Built the Windows NSIS installer at `dist-packaged\A War Without Victory Setup 0.9.6-alpha.1.exe`.
- Fixed the packaging blocker by splitting Node-only bot-order profiler file output from the browser-reachable profiler timing module.
- Preserved the default-off profiler behavior and scenario-runner dump path for Node CLI profiling.

## Changes Made
- `src/sim/combat/_perf_profile_bot_orders.ts` is now browser-safe: it has no top-level `node:fs`, `node:path`, or stable JSON writer import.
- `src/sim/combat/_perf_profile_bot_orders_node.ts` owns `defaultBotOrdersPerfProfilePath(...)` and `dumpBotOrdersPerfProfile(...)`.
- `tools/scenario_runner/run_scenario.ts` imports the dump helper from the Node-only module.
- `tests/bot_orders_perf_profile.test.ts` verifies both the Node dump helper and the browser-safe profiling core guard.

## Verification
- `npm.cmd run test:vitest:fast -- -- tests\bot_orders_perf_profile.test.ts` passed 5/5.
- `npm.cmd run desktop:map:build` passed; the previous fatal `_perf_profile_bot_orders.ts` browser externalization error is gone. Existing Vite warnings remain for unrelated modules.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:package:win:nsis` passed and produced `dist-packaged\A War Without Victory Setup 0.9.6-alpha.1.exe`.
- `npm.cmd run desktop:package:win:nsis:smoke -- "F:\A-War-Without-Victory\dist-packaged\A War Without Victory Setup 0.9.6-alpha.1.exe"` passed with:
  - `sizeBytes=957496842`
  - `sha256=c51f9bf8fe798ad8eed8dd01aba1b679412b8fb84b019994303dfe3aeb126c77`
  - valid MZ/PE header.

## Operator-Only Remainder
- Clean Windows VM install/launch/save/load.
- SmartScreen first-run UX.
- Settings -> Apps entry/version.
- `%APPDATA%\A War Without Victory\` persistence and uninstall behavior.
- NSIS uninstaller registry entry checks.

