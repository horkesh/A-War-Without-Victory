# P16 Provenance And Runtime Hardening

**Date:** 2026-06-26
**Branch:** `codex/p16-provenance-runtime-hardening`
**Result:** Merged to `main` through PR #458 at `9adce5a4866907f97d5a01071c91728ba8f46ded` after local proof and all required GitHub checks passed.

## Summary
- Preserved missing corps-command telemetry as unreported instead of coercing missing source rows into healthy zero strain.
- Hardened Army HQ sector DOM/ARIA ids, Corps Detail exhaustion copy, and Corps Situation missing-source presentation.
- Extended the packaged desktop runtime probe to fail on renderer/network failures and to verify packaged route inventory for data, UI, PMTiles, source, and root asset resources.
- Repaired the packaged-probe CI path after broad runtime capture exposed missing bundled MapLibre glyph PBFs; the tactical-map build now copies local glyphs into the packaged map route and the probe verifies them.
- Kept scope UI/read-model/platform-guardrail only. No simulation control logic, scenario data, startup artifacts, save schema, calibration floors, structural fingerprint, packaging artifacts, or Srebrenica/Zepa event-owned fall receipt behavior changed.

## Changes Made

### UI Provenance
- `parseGameState(...)` now leaves `commandStrain`, `commandStrainLabel`, `corpsExhaustion`, and derived command assessment fields unreported when a corps has no `corps_command[corpsId]` row.
- Reported zero command strain and zero corps exhaustion remain exact reported zeroes.
- Army HQ Operations and Operation Briefing preserve optional command strain at the read-model boundary, using numeric fallbacks only inside legacy numeric presentation helpers.
- Corps Detail renders missing corps exhaustion as `Unreported`.
- Corps Situation renders a compact `Unreported` section when the assessment source is absent.

### Sector Accessibility
- Army HQ sector rows keep raw `data-sector-id` values for routing/provenance.
- The corresponding detail `id` and `aria-controls` values are sanitized for DOM/ARIA safety.
- Live browser proof confirmed raw sector ids such as `sector:arbih_1st_corps:0` are preserved while `aria-controls` uses `army-hq-sector-detail-sector-arbih-1st-corps-0`.

### Packaged Runtime Probe
- `electron-main.cjs` captures packaged-runtime `console-message`, `did-fail-load`, `render-process-gone`, request failures, and HTTP status failures.
- The probe filters only deterministic favicon, `data:`, `blob:`, and deliberate subframe `did-fail-load` abort noise; generic failed network requests remain reportable.
- The packaged route inventory now checks operational GeoJSON, terrain scalars, exact PMTiles Range `bytes=0-15` / `206`, HQ clickable region JSON, `data/source/settlements_initial_master.json`, and a root runtime asset.
- Packaged probe windows append `disable_pmtiles=1` so CI can prove player/window/bridge behavior without trying to render LFS-backed PMTiles, while the route inventory still proves the real PMTiles byte-range endpoint.
- `src/ui/map/vite.config.ts` copies `src/ui/map/public/font` into `dist/tactical-map/font`, and the route inventory verifies the Open Sans Bold glyph PBFs that MapLibre requests on startup.
- External Google webfont cache misses are treated as deterministic CI noise; teardown-time `net::ERR_FAILED` rows are ignored only for inventory-proven local packaged routes with unknown webContents.
- `tools/desktop_packaged_runtime_probe.mjs` now requires route inventory and runtime failure-check proof in the emitted manifest.
- Desktop release path filtering now includes `data/source/`, `data/reference/`, `src/shared/`, and `src/runtime/`.

## Verification
- UI red phase initially failed 4 expected assertions for missing `corps_command` provenance, raw sector ARIA ids, missing Corps Detail exhaustion, and absent Corps Situation copy.
- Desktop red phase initially failed 3 expected assertions for missing runtime failure capture, route inventory proof, and desktop path-filter coverage.
- Focused UI proof passed: `node node_modules/vitest/vitest.mjs run tests/ui_map_game_state_adapter.test.ts tests/ui/corps_detail_sector_truth.test.ts tests/ui/army_hq_sector_truth.test.ts tests/ui/command_strain_i18n_boundary.test.ts --pool=forks --reporter=dot` (4 files / 80 tests).
- Focused desktop proof passed: `node node_modules/vitest/vitest.mjs run tests/desktop_packaged_runtime_probe.test.ts tests/desktop_release_ci_guardrails.test.ts --pool=forks --reporter=dot` (2 files / 12 tests).
- Combined focused proof passed: `node node_modules/vitest/vitest.mjs run tests/ui_map_game_state_adapter.test.ts tests/ui/corps_detail_sector_truth.test.ts tests/ui/army_hq_sector_truth.test.ts tests/ui/command_strain_i18n_boundary.test.ts tests/desktop_packaged_runtime_probe.test.ts tests/desktop_release_ci_guardrails.test.ts --pool=forks --reporter=dot` (6 files / 92 tests).
- Reviewer-fix red phase failed the expected assertions for missing-strain coercion, generic `ERR_ABORTED` filtering, and missing exact PMTiles range matching.
- Reviewer-fix proof passed: `node node_modules/vitest/vitest.mjs run tests/ui/oob_operations_panel.test.ts tests/desktop_packaged_runtime_probe.test.ts --pool=forks --reporter=dot` (2 files / 35 tests).
- Expanded P16 focused proof passed: `node node_modules/vitest/vitest.mjs run tests/ui_map_game_state_adapter.test.ts tests/ui/corps_detail_sector_truth.test.ts tests/ui/army_hq_sector_truth.test.ts tests/ui/command_strain_i18n_boundary.test.ts tests/ui/oob_operations_panel.test.ts tests/desktop_packaged_runtime_probe.test.ts tests/desktop_release_ci_guardrails.test.ts --pool=forks --reporter=dot` (7 files / 122 tests).
- `npm.cmd run typecheck` passed.
- `node --check src\desktop\electron-main.cjs` and `node --check tools\desktop_packaged_runtime_probe.mjs` passed.
- `git diff --check` passed.
- `npm.cmd run qa:player-journeys` passed (43 files / 677 tests).
- `npm.cmd run desktop:release:check` passed through tactical map build, desktop sim bundle, startup snapshot, and Warroom build with existing non-fatal Vite warnings.
- `npm.cmd run qa:first-hour:browser` passed with dev-server cleanup verified.
- `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified.
- Live in-app browser proof on `http://127.0.0.1:3004/` verified fresh RBiH start, war-start briefing, Army HQ, 1st Corps sector expansion, sanitized sector ARIA ids with raw sector data ids preserved, visible `Unreported` sector truth, no alert banners, no visible `NaN` / `Infinity` / `undefined` / `null`, and console health with only the expected dev-map desktop-bridge fallback warning.
- Packaged-probe CI repair proof passed: `node node_modules/vitest/vitest.mjs run tests/desktop_packaged_runtime_probe.test.ts tests/ui/first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot` (2 files / 13 tests).
- `npm.cmd run desktop:map:build` passed and produced all eight glyph PBF ranges under `dist\tactical-map\font`.
- `npm.cmd run desktop:package:probe` passed; the manifest recorded glyph routes at HTTP 200, PMTiles Range `bytes=0-15` at HTTP 206, tactical operational/sandbox windows with `disable_pmtiles=1`, and `runtime_failure_checks: []`.
- GitHub PR #458 passed Event System validation x2, Desktop Release Guard (`desktop-release-check` and `desktop-packaged-runtime-probe`), Baseline Regression (`typecheck`, `test`, `scenario-anchors`, `scenarios`, and `engine-health-188w`), structural fingerprint, Typecheck, and Full Suite before merge.
- `gh pr view 458` and direct API/GraphQL sweeps showed no comments, no reviews, and no review threads before merge.
- A broad `npm.cmd run test:ui` attempt exceeded the local 4-minute timeout and is not used as completion proof.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/data/GameStateAdapter.ts` | Preserve missing corps-command rows as unreported |
| `src/ui/map/components/CorpsDetail.tsx` | Render missing corps exhaustion as `Unreported` |
| `src/ui/map/components/OperationBriefingModal.tsx` | Preserve optional command strain until numeric presentation boundary |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` | Pass raw optional command strain to operations detail |
| `src/ui/map/components/army_hq/OperationsSection.tsx` | Avoid command-strain notices when strain source is unreported |
| `src/ui/map/components/army_hq/CorpsSituationSection.tsx` | Render compact unreported state for missing assessment source |
| `src/ui/map/components/army_hq/SectorsSection.tsx` | Sanitize DOM/ARIA ids while preserving raw sector ids |
| `src/desktop/electron-main.cjs` | Capture packaged runtime renderer/network failures and route inventory |
| `src/ui/map/vite.config.ts` | Copy bundled MapLibre glyph PBFs into packaged tactical-map output |
| `tools/desktop_packaged_runtime_probe.mjs` | Require route inventory and runtime failure-check manifest proof |
| `.github/scripts/detect-changed-paths.sh` | Watch additional packaged source/reference/runtime paths |
| `.github/workflows/README.md` | Document desktop path-set expansion |
| `tests/*` | Focused regression coverage for UI provenance and packaged runtime guardrails |

## Closeout
- PR #458 merged to `main` at `9adce5a4866907f97d5a01071c91728ba8f46ded`.
- Remote/local branch and worktree cleanup performed after merge.
- Continue the next non-BCS owner-playthrough polish packet from the active D2 information-quality plan.
