# 2026-04-03 - Activity truth and local tsx recovery

## Summary
- Restored Windows-safe local execution for `tsx` and `vitest` without depending on missing `node_modules/.bin` shims.
- Removed the scenario preflight wrapper's fragile `npm run sim:scenario:harness` hop and invoked the local `tsx` CLI directly.
- Fixed a real activity-truth bug where live sector OSID edge ownership filtered canonical graph edges to an empty set, collapsing `activity_summary.json` to zeros even during active combat.
- Re-ran the canonical 40-week scenario on `main` and confirmed:
  - sector contiguity remains clean
  - activity metrics are non-zero again
  - the repo's normal `npm run sim:scenario:run:40w` path works end-to-end on this Windows checkout

## Root causes

### 1. Missing local `.bin` shims on Windows
- This checkout had `node_modules/tsx` installed but no usable `node_modules/.bin/tsx.cmd` or `vitest.cmd`.
- Any script depending on bare `tsx` through nested shell hops could fail depending on PATH resolution.
- `tools/scenario_runner/run_scenario_with_preflight.ts` amplified that brittleness by spawning `npm run sim:scenario:harness`, which then needed `tsx` to be discoverable again.

### 2. Edge-universe mismatch in activity reporting
- `CorpsFrontSector.edge_ids` are OSID hostile-boundary edge IDs.
- `evaluateDisplacementTriggers(...)` switched to sector-owned scope when live sector truth exists.
- But the scenario runner passed canonical settlement graph edges into that function.
- The sector-owned eligibility filter compared canonical edge IDs directly to live OSID edge IDs and found no matches.
- Result:
  - `pressure_eligible_size = 0`
  - `front_active_set_size = 0`
  - `displacement_trigger_eligible_size = 0`
  - `activity_summary.json` falsely reported zero activity across the whole run

## Files changed
- `package.json`
- `tools/scenario_runner/run_scenario_with_preflight.ts`
- `src/sim/displacement_pipeline/displacement_triggers.ts`
- `tests/displacement_pipeline_displacement_triggers.test.ts`
- `tsx.cmd`
- `vitest.cmd`

## What changed

### Local CLI recovery
- Added repo-root Windows wrappers:
  - `tsx.cmd`
  - `vitest.cmd`
- These call the locally installed package entrypoints through `node`, so scripts work even if `.bin` shims are absent.
- Updated `recovery:check` to use `tsx` / `vitest` directly instead of hardcoded nonexistent `.bin` paths.

### Scenario harness hardening
- `run_scenario_with_preflight.ts` now spawns:
  - `process.execPath`
  - `node_modules/tsx/dist/cli.mjs`
  - `tools/scenario_runner/run_scenario.ts`
- This removes an unnecessary npm/shell indirection layer from the canonical scenario path.

### Activity truth repair
- `getSectorOwnedEligiblePressureEdges(...)` now accepts canonical graph edges when live sectors are OSID-owned:
  - it computes both canonical and operational edge IDs
  - matches either against sector-owned live edge IDs
- This preserves canonical edge traversal for pressure/displacement while honoring sector-owned frontline truth.

## Verification
- `node .\\node_modules\\tsx\\dist\\cli.mjs --test tests\\displacement_pipeline_displacement_triggers.test.ts tests\\scenario_activity_truth.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run sim:scenario:run:40w`

## Run confirmation
- Fresh run:
  - `runs/apr1992_definitive_40w__d452d2a10f3d69af__w40_n1306`
- Confirmed:
  - `activity_summary.json` now reports non-zero activity
  - fresh run has `badCount: 0` sectors with `sub_segments.length > 1`

## Remaining live issue
- Sector contiguity is fixed, but brigade-to-sector assignment honesty is not fully solved yet.
- The next engine-health wave should focus on:
  - false brigade-to-sector rostering
  - enclave/loan assignment truth
  - reserve vs frontline exposure semantics
