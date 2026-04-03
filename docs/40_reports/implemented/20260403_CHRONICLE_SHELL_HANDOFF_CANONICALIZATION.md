# 2026-04-03 - Chronicle Shell Handoff Canonicalization

## Summary

Promoted `Chronicle` into the shared shell-handoff contract and made the Warroom newspaper desk prop hand off to Chronicle whenever the tactical shell is available.

This closes another subtle shell-ownership leak: Warroom can keep the newspaper as atmosphere, but once the live tactical shell exists, campaign memory should belong to Chronicle instead of a parallel Warroom-local modal.

## What changed

- added `chronicle` to the shared `ShellHandoffCommand` contract
- taught `applyShellHandoffCommand(...)` to open Chronicle and Codex directly, removing app-level special-casing
- routed Warroom newspaper clicks through Chronicle when a tactical-shell handoff handler exists
- extended shell-navigation regression coverage for Chronicle/Codex handoff round-trips
- updated shell hierarchy docs so Chronicle is explicitly named as the campaign-memory shell

## Why

The product had the right pieces but the wrong ownership signal:

- `Army HQ Records` already owned military review
- `Codex` already owned static essays/reference
- `Chronicle` already existed as campaign memory
- but Warroom newspaper still looked like a co-equal owner of “what happened in the war”

That is the kind of overlap that makes a strategy game feel stitched together instead of authored.

## Files changed

- `src/ui/shared/shellHandoff.ts`
- `src/ui/map/utils/shellNavigation.ts`
- `src/ui/map/App.tsx`
- `src/ui/warroom/ClickableRegionManager.ts`
- `tests/ui_shell_navigation.test.ts`
- `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`

## Verification

- `node .\\node_modules\\vitest\\vitest.mjs run tests\\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
