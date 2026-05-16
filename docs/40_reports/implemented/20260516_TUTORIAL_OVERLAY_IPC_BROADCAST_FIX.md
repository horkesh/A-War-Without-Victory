# Tutorial Overlay IPC Broadcast Fix

## Summary

Fixed the desktop tutorial overlay getting stuck on step 1 when the player clicked `Next` or `Skip Tutorial`.

## Root Cause

The tutorial IPC handlers updated canonical `meta.tutorial_state`, but called `writeCanonicalCurrentState(sim, state, event.sender)`. That excluded the renderer that clicked the tutorial button from the `game-state-updated` broadcast. The overlay reads tutorial state from the React store and the tutorial IPC responses do not carry `stateJson`, so the visible renderer never learned that the step advanced or the tutorial was dismissed.

## Fix

`tutorial:dismiss`, `tutorial:advance-step`, and `tutorial:restart` now broadcast the updated canonical state to all renderers, including the sender.

## Verification

- `npx.cmd vitest run tests\tutorial_onboarding_skeleton.test.ts tests\v092_tutorial_lane_e_overlay_a11y.test.ts tests\v092_tutorial_lane_b_auto_dismiss.test.ts` - passed 17/17.
- `node --check src\desktop\electron-main.cjs` - passed.
- `npm.cmd run typecheck` - passed.
- `git diff --check` - passed with CRLF warnings only.

## Determinism

No simulation rule, scenario data, save schema, random source, or ordering behavior changed. This is a desktop UI broadcast delivery fix for an existing canonical state write.
