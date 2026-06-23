# Sarajevo Runtime Flag Gate and CI Cleanup

**Date:** 2026-06-23
**Result:** Implemented; local verification green; successor GitHub gate pending after merge/push.

## Summary
- Closed the PR #440 Sarajevo siege legibility runtime-flag defect: Electron renderers no longer infer `AWWV_SRK_STRANGLE_POSTURE` from unavailable `process.env`.
- Added an explicit desktop runtime feature flag bridge and threaded it into Sarajevo Situation/Chronicle read models.
- Absorbed the latest pushed `main` Baseline Regression failures by updating stale UI test expectations for current BCS response-option copy and setup-only Records behavior.

## Changes Made
### Desktop Runtime Bridge
- `desktop_sim` now exposes `getRuntimeFeatureFlags()` with `srkStranglePostureActive`.
- Electron main/preload/desktop bridge/useIPC expose `get-runtime-feature-flags` to the renderer.
- `useDesktopSession` refreshes runtime feature flags before save load and stores them in the UI game store.

### Sarajevo Read Models
- `deriveSarajevoSiegeStateFromGameState(...)` and Sarajevo Chronicle generation accept explicit runtime options.
- `SituationTab` and Chronicle entry generation pass loaded runtime flags so diagnostic flag-off runs suppress stale Sarajevo siege display.

### CI Cleanup
- Updated `army_hq_timing_copy` to assert the current BCS response-option wording.
- Updated Records setup-provenance proof to expect no normal AAR report and no `Quiet turn` fallback for setup-only turn-zero provenance.

## Verification
- Red proof failed before implementation on renderer-style Sarajevo flag-off and missing desktop runtime-flag bridge.
- Focused green proof passed: `tests/sarajevo_siege_legibility.test.ts`, `tests/contain_posture_release_laneA.test.ts`, `tests/srk_strangle_posture.test.ts`, `tests/desktop_persistence_contract.test.ts`, `tests/ui_map_desktop_bridge.test.ts` (65/65).
- Baseline-failure reproducer passed locally: `tests/ui/army_hq_timing_copy.test.ts`, `tests/ui/operation_aar_records_review.test.ts` (30/30).
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 531 tests.
- `npm.cmd run desktop:sim:build` passed.
- `npm.cmd run qa:first-hour:browser` passed with port cleanup verified.
- `npm.cmd run qa:live-surface:browser` passed with port cleanup verified.

## Determinism / Scope
- UI/read-model/desktop bridge/test/docs hygiene only.
- No simulation logic, scenario data, startup artifact, event evaluator mechanics, turn pipeline, save schema, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
- Srebrenica/Zepa fall receipts remain event-owned and unrelated to this Sarajevo runtime display gate.

## Lessons Learned
- Renderer code in the packaged desktop path cannot rely on `globalThis.process?.env` because the window runs with context isolation and no Node integration.
- Runtime feature flags that affect player-visible renderer read models should cross a typed IPC/preload boundary and be stored with the loaded game UI state.

## Files Changed
| File | Change |
|------|--------|
| `src/desktop/desktop_sim.ts` | Exposes runtime feature flags from the sim side. |
| `src/desktop/electron-main.cjs` | Registers `get-runtime-feature-flags`. |
| `src/desktop/preload.cjs` | Exposes runtime flag IPC to the renderer. |
| `src/ui/map/desktop/*` | Types and bridge method for runtime flags. |
| `src/ui/map/hooks/useDesktopSession.ts` | Loads runtime flags before save load. |
| `src/ui/map/store/gameStore.ts` | Stores runtime feature flags for parsed state. |
| `src/ui/map/data/*` | Carries flags into loaded state and Sarajevo read models. |
| `src/ui/map/components/*` | Passes flags to Situation and Chronicle surfaces. |
| `tests/*` | Pins renderer flag behavior, desktop contract, and stale CI expectation cleanup. |

## Next Steps
- Push successor commit and verify GitHub Baseline Regression plus Full Suite are green.
- Keep the runtime-flag bridge pattern for any future renderer-visible diagnostic/default feature flags.
