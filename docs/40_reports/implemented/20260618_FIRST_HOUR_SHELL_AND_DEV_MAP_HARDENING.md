# First-Hour Shell and Dev Map Hardening

**Date:** 2026-06-18
**Result:** UI/read-model and repo-command hardening, calibration-inert

## Summary
- `npm run dev:map` and `npm run desktop:map:build` now call the map workspace's Vite entrypoint directly, avoiding the Windows root `.bin` shim failure found during live browser review.
- Warroom/game shell handoffs now share cleanup paths, Desk-local Command Surface no longer stacks over the Desk, and the Warroom toolbar exposes the route as `Army HQ` instead of the vague `Staff`.
- Event decision future-consequence previews now use progressive disclosure: response choices and a downstream count are visible first; detailed future branches render only after `Show details`.

## Changes Made

### Dev Map Command Contract
- Root map scripts no longer rely on a missing root `node_modules/.bin/vite.cmd`.
- Added `tests/map_workspace_script_contract.test.ts` so the documented map commands stay aligned with the workspace-local Vite install.

### Shell Ownership
- `leaveWarroomForGame()` now clears Warroom overlays, command strip, diplomacy, decision history, and summary state before game-owned shells open.
- `awwv-shell:show-warroom` uses a shared return cleanup that closes game-owned overlays and selections before returning to Warroom.
- `awwv-shell:handoff` now exits through `leaveWarroomForGame()` after applying the handoff command.
- Opening Command Surface from the President's Desk closes the Desk overlay first.

### Decision Preview Polish
- Detailed future-consequence copy is hidden behind per-option reveal buttons.
- The live turn-0 `What Is Bosnia?` modal shows response options plus a downstream-impact count before any named future event branches.
- A sanitizer regression prevents `Civic platform forecloses...` from becoming `Civic platform and forecloses...`.

## Live Browser Verification
- Chrome live sweep on `http://127.0.0.1:3002/tactical_map.html?dev=1`.
- Verified: faction picker -> war-start splash -> detailed war-begins briefing -> opening brief / `Open desk` -> `What Is Bosnia?`.
- Before reveal: no visible Srebrenica, Dayton, Washington, Vance-Owen, Owen-Stoltenberg, `csq_`, `rbih_state_identity`, `rs_strategic_goals`, or `.json` leakage.
- After reveal: detailed future branch copy is available on request, sanitized, and free of raw ids; Warroom route list shows `Army HQ`.

## Verification
- `npx.cmd vitest run tests\ui\event_decision_modal_phase3.test.ts tests\warroom_shell_layer.test.ts tests\ui\warroom_shell_ownership.test.ts tests\ui\warroom_shell_accessibility.test.ts tests\ui\president_desk_shell.test.ts tests\map_workspace_script_contract.test.ts --pool=forks --reporter=dot` passed 82/82.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run desktop:map:build` passed with the direct workspace-local Vite entrypoint.

## Files Changed
| File | Change |
|------|--------|
| `package.json` | Routes map dev/build scripts through the map workspace Vite entrypoint. |
| `src/ui/map/App.tsx` | Shared shell cleanup, Desk/Command Surface exclusivity, Warroom `Army HQ` copy. |
| `src/ui/map/components/EventDecisionModal.tsx` | Progressive disclosure for future consequences and grammar sanitization. |
| `src/ui/map/utils/warroomNavigation.ts` | Warroom route label changed from `Staff` to `Army HQ`. |
| `tests/*` | Regression coverage for map script contract, shell cleanup, route label, and decision preview behavior. |

## Next Steps
- Continue the broader live-browser polish sweep, especially first-hour Army HQ density and opening brief focus.
- Keep Vitezovi as a source/modeling decision, not a blind data edit.
- Treat Issue #170 Trnovo and Graz residual claims as stale-closed unless a new failing proof appears.
