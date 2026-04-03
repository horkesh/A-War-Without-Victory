# 2026-04-03 - Shell authority docs and shortcut canonicalization

## Summary
- Routed tactical-map `Ctrl+S` through the canonical IPC wrapper instead of direct raw `window.awwv` access.
- Updated older engineering UI architecture docs so they stop presenting `TopToolbar` as live shell authority.
- Clarified Codex entrypoint ownership in the UI ownership matrix.

## Why
- Small shortcut bypasses matter: if hotkeys reach into raw bridge globals while the rest of the shell uses `useIPC()`, authority is still split.
- Older polished docs are one of the easiest ways for future Claude work to drift back onto dead rails. In this repo, stale architecture prose is a real bug source.

## Files changed
- `src/ui/map/hooks/useKeyboardShortcuts.ts`
- `tests/ui_shell_navigation.test.ts`
- `docs/20_engineering/MAP_UI_MASTER.md`
- `docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md`
- `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`

## Implementation notes
- `useKeyboardShortcuts.ts` now routes quick-save through `ipc.quickSave()`.
- `tests/ui_shell_navigation.test.ts` now asserts the shortcut layer does not reach directly into `window.awwv`.
- `MAP_UI_MASTER.md` and `AWWV_GUI_ARCHITECTURE_REWORK_v2.md` now carry explicit shell-authority notes pointing readers to the real live owners.
- `UI_OWNERSHIP_MATRIX.md` now names Codex primary vs secondary entrypoints instead of leaving them implied.

## Verification
- `node .\node_modules\vitest\vitest.mjs run tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Outcome
- Shortcut authority is cleaner in live code.
- The repo is less likely to mislead future agents into reviving `TopToolbar` or scattering Codex ownership again.
