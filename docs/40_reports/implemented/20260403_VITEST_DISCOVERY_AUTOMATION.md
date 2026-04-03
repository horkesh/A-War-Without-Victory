# 2026-04-03 - Vitest discovery automation

## Summary

- Replaced the repo's hard-coded Vitest include list with automatic discovery based on the actual files in `tests/`.
- Centralized test discovery so the Vitest runner and the `node:test` chunk runner now classify files using the same logic.
- Added explicit top-level test scripts so developers can run engine, UI, or full suites without remembering runner internals.

## Files changed

- `vitest.config.ts`
- `tools/test/discover_test_files.mjs`
- `tools/test/run_node_tests.mjs`
- `package.json`
- `README.md`

## Why

- The previous Vitest setup required manual registration of every new Vitest file. That made `vitest.config.ts` an authority surface: a regression could exist in the repo and still never run.
- The repo already uses two runners for legitimate reasons:
  - `node:test` for fast engine/unit coverage
  - Vitest for UI/jsdom and targeted suite work
- The dangerous part was not dual runners. It was dual discovery logic plus a manual allowlist.

## New contract

- `tools/test/discover_test_files.mjs` is the canonical discovery helper for test classification.
- Vitest files are discovered automatically by content (`from 'vitest'` / `@vitest/*` imports).
- jsdom Vitest files are discovered by:
  - `@vitest-environment jsdom`
  - `.browser.test.ts` suffix
  - existing Warroom smoke/player-visibility files
- `node tools/test/run_node_tests.mjs` now consumes the same discovery helper rather than maintaining its own separate scanner.

## Developer workflow

- `npm run test:engine` — run the `node:test` engine suite
- `npm run test:ui` — run Vitest-discovered suites
- `npm run test:all` — run both

## Verification

- `node tools/test/run_node_tests.mjs --help`
- `node .\node_modules\vitest\vitest.mjs run tests\sector_rearrangement.test.ts tests\ui_shell_navigation.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
