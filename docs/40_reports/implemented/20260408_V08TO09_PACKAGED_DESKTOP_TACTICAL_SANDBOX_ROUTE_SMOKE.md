# V0.8-to-V0.9 Packaged Desktop Tactical Sandbox Route Smoke

Date: 2026-04-08
Lane: Packaged Desktop Tactical Sandbox Route Smoke
Status: Implemented

## Summary

This lane strengthened the existing canonical packaged runtime probe by proving the real packaged tactical sandbox route/window under `desktop:package:probe`.

Before this lane the packaged runtime contract already proved:
- packaged resource presence
- baked April 1992 startup snapshot loading
- tactical-map server routing
- initial Warroom window load
- secondary tactical-map operational window load

The remaining route gap was the real tactical sandbox window. It was reachable through existing app code, but it was still implicit in the packaged contract. This lane made it explicit and deterministic under the same packaged probe path.

## Audit findings

Before this lane:
- `openTacticalMapWindow('sandbox')` existed as a real desktop path, but `desktop:package:probe` did not require it.
- The canonical tactical-map route helper already supported `sandbox`, but the packaged probe only asserted `desktop_window=operational`.
- The packaged runtime story was still slightly asymmetric: one real secondary map route was proved, the other remained implied.

## Design

Canonical contract after cleanup:
- `desktop:package:probe` remains the only packaged-runtime probe path.
- The same probe now proves three real window loads in packaged mode:
  - `awwv://warroom/index.html`
  - `/?desktop_window=operational`
  - `/tactical_sandbox.html?desktop_window=sandbox`
- Tactical-map routing stays deterministic and continues to use the existing route helper.
- No hidden regeneration, no second smoke command, and no fake launch path were introduced.

Deferred:
- packaged UI interaction automation
- installer / publishing flow
- non-Windows packaged targets

## Implementation

Files changed:
- `src/desktop/electron-main.cjs`
- `tools/desktop_packaged_runtime_probe.mjs`
- `tests/desktop_packaged_runtime_probe.test.ts`
- `src/desktop/README.md`

Key changes:
- Extended `runPackagedRuntimeProbe()` to open the real packaged tactical sandbox window via `createTacticalMapWindow({ mode: 'sandbox' })`.
- Added sandbox proof to the packaged probe manifest in stable `window_checks` order.
- Hardened the external probe tool so success now requires the sandbox route proof in addition to the Warroom and operational map window proofs.
- Updated source-level regression tests and README contract documentation accordingly.

## Verification

Targeted:
- `node --check src\\desktop\\electron-main.cjs`
- `npx.cmd tsx --test tests\\desktop_packaged_runtime_probe.test.ts`

Required commands:
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run desktop:release:check`
- `npm.cmd run desktop:package:probe`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

Results:
- syntax check passed
- targeted packaged probe tests passed: `3/3`
- `desktop:startup-snapshot:check` passed
- `desktop:release:check` passed
- `desktop:package:probe` passed
- `test:vitest` passed: `216/216` files, `3018/3018` tests
- `tsc --noEmit` passed
- `build` passed

Probe manifest now includes the tactical sandbox route proof:
- `http://127.0.0.1:<port>/tactical_sandbox.html?desktop_window=sandbox`

## Residual risks

Still deferred:
- packaged sandbox interaction coverage beyond did-finish-load
- packaged tactical-map mode switching within one live window
- installer / store / publish flow
- non-Windows packaged runtime contracts

## Integration notes

For `docs/PROJECT_LEDGER.md`:
- Add a 2026-04-08 entry for `Packaged Desktop Tactical Sandbox Route Smoke`.
- Suggested text:
  - `2026-04-08 - Packaged Desktop Tactical Sandbox Route Smoke: strengthened desktop:package:probe to prove the real packaged tactical sandbox BrowserWindow reaches did-finish-load on /tactical_sandbox.html?desktop_window=sandbox under the same canonical packaged runtime probe contract. This closes the remaining real tactical-map route gap without adding a second packaged smoke path.`

For `docs/plans/MASTER_ROADMAP.md`:
- Mark the lane complete only if wording matches delivered scope: packaged tactical sandbox route proof under the existing probe, not packaged UI automation.
- Recommended next lane: `Packaged Desktop Tactical-Map Interaction Contract`.

For `.claude/architect_notes.md`:
- Record the lesson that once a packaged runtime probe covers multiple real desktop windows, route completeness should be expanded by extending the same probe manifest contract instead of adding parallel smoke commands for each route.
