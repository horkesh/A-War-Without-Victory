# 2026-04-03 - Operations and officer player-safe labels

## Summary
- Hardened operations and personnel shells so live Army HQ/operations surfaces stop trusting raw `corps_name`, brigade names, and ad hoc OSID formatting.
- Repointed Army HQ operations review to the canonical OSID display-name layer for objectives.
- Added source-contract regressions to keep these shells on player-safe naming helpers.

## Why
- Operations review and officer replacement are high-trust command surfaces. If they leak `arbih_3rd_corps`-style ids or fallback brigade identifiers, the player shell still feels like a debug tool.
- Army HQ had already become the canonical operations-review surface, so this was higher-value than another tactical-map cosmetics pass.

## Files changed
- `src/ui/map/components/army_hq/OperationsSection.tsx`
- `src/ui/map/components/OperationBriefingModal.tsx`
- `src/ui/map/components/OperationsPanel.tsx`
- `src/ui/map/components/OfficerEventBadge.tsx`
- `tests/ui_player_visibility.test.ts`

## Implementation notes
- `OperationsSection.tsx`
  - brigade ORBAT rows now use `getPlayerSafeBrigadeName(...)`
  - objective and weekly-log settlement labels now resolve through `getOsidDisplayName(...)`
- `OperationBriefingModal.tsx` now derives corps text via `getPlayerSafeCorpsName(...)`
- `OperationsPanel.tsx` now derives list/detail/open-orders corps labels via `getPlayerSafeCorpsName(...)`
- `OfficerEventBadge.tsx` now derives replacement-target corps labels via `getPlayerSafeCorpsName(...)`
- The regression suite now asserts these shells depend on the player-safe naming/display helpers.

## Verification
- `node .\node_modules\vitest\vitest.mjs run tests\ui_player_visibility.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Outcome
- The most authoritative operations/personnel command shells now speak the same player-facing language as the rest of the product.
- One more class of “summary/helper leaked an internal id” regressions is fenced off with tests and repo memory.
