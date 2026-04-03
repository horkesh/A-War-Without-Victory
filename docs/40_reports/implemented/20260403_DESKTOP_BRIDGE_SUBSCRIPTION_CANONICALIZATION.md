# 2026-04-03 - Desktop bridge subscription canonicalization

## Summary
- Replaced the desktop preload bridge's singleton `set*Callback` slots with real subscription fanout for `game-state-updated` and `turn-report-updated`.
- Repointed the tactical-map React session hook to subscribe/unsubscribe instead of claiming global callback ownership.
- Reworked the embedded tactical-map bridge so iframe subscribers register per event and receive both state and turn-report updates through the same event contract.
- Removed Warroom's `reRegisterWarroomCallback()` workaround, shrinking Warroom back toward shell ownership instead of transport arbitration.

## Why
- The old bridge model assumed one renderer owner. Warroom and tactical map were both written as if they owned the same callback slots, so the shell was compensating for bridge weakness instead of the bridge doing its job.
- That created the exact kind of half-alive false authority this repo is vulnerable to: transport policy leaking upward into UI shells.
- Embedded tactical map also had asymmetric behavior because it only mirrored game-state updates, not turn reports.

## Files changed
- `src/desktop/preload.cjs`
- `src/ui/map/hooks/useDesktopSession.ts`
- `src/ui/map/desktop/useIPC.ts`
- `src/ui/map/desktop/types.ts`
- `src/ui/map/desktop/bridge.ts`
- `src/ui/map/index.html`
- `src/ui/warroom/warroom.ts`
- `tests/engine_honesty_legacy_contracts.test.ts`

## Implementation notes
- `preload.cjs` now keeps `Set` fanout lists for game-state and turn-report listeners and returns unsubscribe closures.
- `useDesktopSession()` now subscribes through the canonical desktop bridge and cleans up by calling the returned unsubscribe functions.
- The embedded iframe shim in `src/ui/map/index.html` now supports:
  - `subscribeGameStateUpdated(cb)`
  - `subscribeTurnReportUpdated(cb)`
  - generic `awwv-bridge:subscribe-event` messages to Warroom
- Warroom now tracks embedded subscribers by event name and relays both `game-state-updated` and `turn-report-updated`.
- `reRegisterWarroomCallback()` was removed because subscriber fanout makes that workaround unnecessary.

## Verification
- `node .\node_modules\vitest\vitest.mjs run tests\engine_honesty_legacy_contracts.test.ts tests\ui_shell_navigation.test.ts`
- `node .\node_modules\vite\bin\vite.js build --config src/ui/warroom/vite.config.ts`
- `node .\node_modules\tsx\dist\cli.mjs tools/ui/warroom_stage_assets.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Outcome
- Desktop bridge ownership is cleaner: preload fans out canonical events, and shells subscribe instead of competing for one mutable callback slot.
- Warroom is less of a transport broker and more of a proper campaign shell.
- Embedded tactical map is no longer second-class for turn-report delivery.
