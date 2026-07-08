# Archived UI Legacy Deadness Probe

**Date:** 2026-07-08
**Packet:** RR2-3A from `docs/plans/2026-07-08-release-review-round2-findings-plan.md`
**Verdict:** Initial probe was NO-GO because one test imported the archived tree; follow-up extraction completed and the archived tree was deleted.

## Inventory

- `src/_archived/ui_legacy`: 93 files, 34,180 lines, 1,434,337 bytes.
- First sampled files include `MapApp.ts`, `tactical_sandbox.ts`, `map_operational_3d.ts`, `map_staff_3d.ts`, `renderer/HoIMapRenderer.ts`, and `staff/StaffMapRenderer.ts`.

## Stop-Gate Findings

| Finding | Receipt | Meaning |
|---|---|---|
| Test imports archived module directly | `tests/sandbox_slice_determinism.test.ts:2` imports `../src/_archived/ui_legacy/sandbox/sandbox_slice.js`. | `git rm src/_archived/ui_legacy` would break the test suite. |
| Packaged sandbox route remains live | `src/desktop/electron-main.cjs:853` chooses `/tactical_sandbox.html` for sandbox mode; `src/desktop/electron-main.cjs:1424` handles missing sandbox path fallback. | Sandbox route ownership must be clarified before deleting similarly named archived sandbox code. |
| Runtime probe expects sandbox route | `tools/desktop_packaged_runtime_probe.mjs:69` checks sandbox route load; `tools/desktop_packaged_runtime_probe.mjs:154` checks `/tactical_sandbox.html` route mode. | Packaged runtime probe still treats tactical sandbox as a release contract. |
| Desktop packaged runtime tests assert sandbox proof | `tests/desktop_packaged_runtime_probe.test.ts:453` and `tests/desktop_packaged_runtime_probe.test.ts:468` assert sandbox load/interactions. | Deleting or moving sandbox-related assets requires package-probe contract review. |

## Recommendation

Initial recommendation was to split RR2-3A into two follow-ups:

1. **Sandbox slice extraction:** Move `sandbox/sandbox_slice.ts` out of `_archived` into a live deterministic utility location, update `tests/sandbox_slice_determinism.test.ts`, and run the focused test plus typecheck. This is behavior-neutral if imports only move.
2. **Archived tree deletion retry:** After the extraction, rerun the deadness search across `src`, `tests`, `tools`, `.github`, package config, and desktop packaging. If no direct `_archived/ui_legacy` imports remain, delete the tree and run the original RR2-3A gates.

The `tactical_sandbox.html` route may be live independently of `_archived/ui_legacy`; do not collapse those concepts without proving which built artifact owns the packaged sandbox route.

## Implementation Addendum

Executed follow-up:

- Extracted `sandbox_slice` and `sandbox_scenarios` into `src/ui/map/sandbox/`.
- Retargeted `tests/sandbox_slice_determinism.test.ts` from `../src/_archived/ui_legacy/sandbox/sandbox_slice.js` to `../src/ui/map/sandbox/sandbox_slice.js`.
- Re-ran focused proof for the extracted deterministic utility.
- Re-ran deadness search and found no remaining `_archived/ui_legacy` references outside the deleted tree.
- Removed `src/_archived/ui_legacy` with `git rm -r`.

The packaged `tactical_sandbox.html` route remains a live independent contract and was not removed.

## Verification Performed

Searches covered `src`, `tests`, `tools`, `.github`, `package.json`, `tsconfig.json`, desktop main process, and workflows for `_archived/ui_legacy`, `MapApp.ts`, `tactical_sandbox`, `map_operational_3d`, `map_staff_3d`, `HoIMapRenderer`, and `StaffMapRenderer`.
