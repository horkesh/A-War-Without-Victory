## 2026-11-14 — Live tools no longer hard-code the F: checkout

**Problem.** The owner is moving the local checkout from `F:\A-War-Without-Victory` (a USB drive) to `C:\Pyrrhic\A-War-Without-Victory`. Several live tools hard-coded `F:/A-War-Without-Victory`, `F:/AWWV-worktrees` or `F:/AWWV-coordination` and would read, write or fall back to the old drive after the move.

**Change (tooling, tests and docs, plus `src/` data-path fixes that leave turn results unchanged; no `data/`, scenario or calibration change).**
- `src/sim/osid_areas.ts`, `src/state/legitimacy.ts`, `turn_phases/war_phases.ts` (owner follow-up: the remaining cwd loaders on the war-phase path).
  - `getOsidAreas()` now uses the bundled `osid_areas.json` module, as `sim/negotiation` and the map UI already do. Before, it read the file from `process.cwd()` and, on any error, silently returned an empty area map, so turn-summary territory and negotiation capital read zero.
  - `update-legitimacy` passes `dataBaseDir` to `updateLegitimacyState`, which builds the population and 1990-controller paths from it.
  - `process-lifecycle-events` passes it to `loadLifecycleEvents`, which falls back to no events on a read error.
  - `phase3a-pressure-eligibility` passes `turnDataFilePath(...)` to `loadEnrichedContactGraph`.
  - New `tests/turn_data_base_dir_wiring.test.ts` runs the real war-phase steps with the loaders mocked and checks the base dir each one receives. New `tests/osid_areas_bundled.test.ts` makes every `fs` read throw: the old loader returned 0 of 712 OSIDs, and the new one returns all of them. Both fail with the fix reversed.
- `src/sim/combat/strategic_priorities.ts`, `strategic_reserve.ts`, `turn_phases/war_phases.ts` (owner follow-up): the strategic-reserve step now passes the turn's `TurnInput.dataBaseDir` through `reinforceFromStrategicReserves` → `getOsidPriority` → `loadStrategicPriorities`. Before, the loader always fell back to `process.cwd()`, so a run started outside the repo root failed with ENOENT on `data/source/strategic_priorities.json`. The scenario runner and desktop sim both set `dataBaseDir`, and the packaged app `chdir`s to the same folder (`electron-main.cjs`), so every existing entry point reads the same file as before. The parameters are optional, and callers without one keep the cwd fallback. New `tests/strategic_priorities_base_dir.test.ts` fails with the `src/` change reversed and passes with it.
- New `tools/lib/repo_paths.mjs`: `REPO_ROOT` from `import.meta.url`; out-of-repo folders from `AWWV_COORDINATION_ROOT` / `AWWV_WORKTREES_ROOT`, defaulting to `AWWV-coordination` / `AWWV-worktrees` beside the main checkout. The main checkout is found through `git rev-parse --git-common-dir`, so a run from a linked worktree resolves the same folders.
- `tools/ui/*_browser_proof.mjs` (8 render proofs): the `--out` default is `$AWWV_COORDINATION_ROOT/surface_steps/<step>`. The task named only `records_surfaces_browser_proof.mjs`; the other seven had the same hard-coded default and were added after the inventory was taken.
- `tools/render_control_map.mjs`, `scripts/playwright_map_first_verify.mjs`, `scripts/playwright_shell_navigation_verify.mjs`: repo root from `import.meta.url`.
- `tools/architect/*.ps1` (5 scripts): when `git rev-parse --show-toplevel` fails, the fallback root is `$PSScriptRoot`, not `F:\A-War-Without-Victory`.
- `tools/peace/iebl_cell_audit/compute_cells.py`: reads repo data from `Path(__file__).resolve().parents[3]` instead of a removed Dayton worktree. Re-run from another cwd: exit 0, 252 cells, as its checkpoint records.
- `tools/ai_play/run_rbih_best_outcome.ts` and `tools/ai_play/electron_playthrough_rs_ahistorical.mjs` (owner follow-up): output went to a fixed folder in one past Claude session's scratchpad (`C:/Users/User/AppData/Local/Temp/claude/F--A-War-Without-Victory/<session>/...`). Both now take `--out <dir>`, default `<repo>/runs/ai_play/<run>` (gitignored). Proven here: the RBiH script wrote to `--out`, and with no flag from the repo root it created `runs/ai_play/rbih_best_outcome_run/` and advanced turns. The Electron script created its `--out` folder before failing to launch Electron in this headless container.
- `tools/ui/r4_phase5_visual_inspection_capture.cjs` (owner follow-up): same old-scratchpad output folder. It now takes `--out=<dir>`, default `runs/r4_phase5_visual_inspection`, resolved against the repo root like its other flags. Run here with and without `--out`: it created the folder (`capture_manifest.json`, `user-data/`), then stopped because its default resume save, a local run, is not in this checkout.
- `tools/fix_missing_domains.ts` (owner follow-up): it read a tsc error log from a fixed file in a Cursor agent folder on the owner's machine. It now takes the log path as its argument, and loads `tsconfig.json` and the logged file paths from the repo root (not the cwd). Files the log names that do not exist are reported instead of silently skipped. Only transpile-checked here: it imports `ts-morph`, which is not in `package.json` or the lockfile, so it could not run from a clean install before or after this change.
- `scripts/playwright_map_first_verify.mjs` and `scripts/playwright_shell_navigation_verify.mjs` (owner follow-up): Chrome was hard-coded at `C:/Program Files/Google/Chrome/...`. They now pick the browser the same way as `tools/ui/*.cjs`: `PUPPETEER_EXECUTABLE_PATH`, then `AWWV_CHROME_EXECUTABLE`, then the standard Windows Chrome folders if present, else puppeteer's own browser. Proven here: each override launched Chromium and the run failed only at `ERR_CONNECTION_REFUSED` on port 3003 (no dev server). With neither override, puppeteer reported that its own browser is not downloaded in this container. The Windows-folder branch cannot run on Linux.
- Tests: `engine_honesty_legacy_contracts` passes `process.cwd()` as the unused `baseDir` (the validator voids it); the `dayton_walkthrough_fixes` header cites `$AWWV_WORKTREES_ROOT/...`.
- Docs: README Repo Notes document both variables; `tools/opencode_implementer/README.md` uses `../AWWV-worktrees/<job>`; the brainstorming visual-companion skill no longer names a drive. `.agent/skill-distribution.json` gains an `external_path_records` note.

**Left as written (records or fixtures).** The `.agent/skill-distribution.json` backup and rollback paths are activation records. Its only consumer is a helper in `logs/` that runs from the retained packet's own manifest copy. Also left: the `engine_health_thresholds.json` rebaseline note (run provenance), the hook-guard and harness test strings (path-pattern fixtures), the `hook_registry` comments (they describe the defect that test pins), and the napkin July archive. `.claude/launch.json` was already relative on main.

**Checked.**
- `npx tsc --noEmit` exit 0 after every commit. It needs `NODE_OPTIONS=--max-old-space-size=8192`; at a 2 GB default heap it runs out of memory regardless of this change.
- Tooling commits: 18 vitest files (the 7 named tests plus 11 that read the touched docs or tools) passed, 202 tests.
- `src/` commits:
  - 11 files (315 tests) covering strategic reserves and priorities passed.
  - Then 13 files (134 tests) passed: the three new test files plus the existing turn-summary, negotiation-capital, lifecycle and priority tests.
  - Each new test fails with its `src/` change reversed.
- `npm run test:baselines` reports all scenarios match three times: before any `src/` change, after the strategic-priorities fix, and after the loader fixes.
- An independent review approved the first tooling commit and both `src/` commits, with no blocking findings.
- Helper probed from a disposable linked worktree: it resolved the main checkout and its sibling coordination folder.

**Not done.** The PowerShell and Playwright scripts were not run on Windows here. Other machine-specific paths that do not match the F: inventory pattern are listed in the PR as out of scope. After these fixes, a run from outside the repo root still fails, now at `operational_settlements.geojson`. The sim broadly assumes it runs from the data root, and the remaining reads are a larger layer that needs its own lane:
- the turn pipeline's `loadSettlementGraph()` fallbacks (`turn_pipeline_types.ts` `getOperationalSettlementGraph`, `turn_pipeline.ts`, six in `early_war_phases.ts`, `state/negotiation_capital.ts`)
- an unconditional `fallback_geometries.json` read in `map/settlements.ts`
- about ten default paths in `state/political_control_init.ts`
- the scenario anomaly checks

The desktop app (`chdir` to its data root) and the scenario runner (run from the repo root) are not affected.
