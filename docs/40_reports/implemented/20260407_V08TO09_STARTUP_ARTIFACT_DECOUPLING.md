# 2026-04-07 — v0.8-to-v0.9 Startup Artifact Decoupling via Canonical In-Memory Builder

## Summary

Closed the next startup-architecture seam after campaign-birth save-contract hardening. Desktop `New Campaign` no longer depends on harness run-artifact generation to obtain canonical April 1992 birth state.

The repo did **not** ship a baked static April 1992 snapshot in this lane. Instead, it extracted a single canonical in-memory startup builder from `scenario_runner.ts` and made desktop startup consume that builder directly while leaving `runScenario(...)` as the harness-only owner of `run_meta.json`, `initial_save.json`, and other run artifacts.

## Why this lane

The previous lane already made campaign birth and first load share one canonical save contract. The remaining debt was architectural:

- desktop startup still flowed through `runScenario(...)`
- `createStateFromScenario(...)` still depended on `initial_save.json` as an intermediate artifact
- product startup still looked like a harness path, even when it was already producing truthful state

This lane removes that ownership ambiguity without changing scenario authoring truth or user-visible New Campaign / Load Save flow.

## Audit findings

### Canonical

- `canonicalizeStartupState(...)` already guaranteed campaign birth matched canonical save/load shape.
- `startNewCampaign(...)` already returned canonicalized state after desktop-only overlays.

### Ambiguously shared / harness-shaped before the change

- `createStateFromScenario(...)` called `runScenario({ initialStateOnly: true, ... })`
- `runScenario(...)` wrote `run_meta.json` and `initial_save.json`
- `createStateFromScenario(...)` then re-read `initial_save.json` with `deserializeState(...)`

That meant desktop startup truth was correct, but the product path still depended on harness-owned artifact generation.

## Design

### Ownership after cleanup

- `buildScenarioStartupState(...)` in `src/scenario/scenario_runner.ts` is now the canonical in-memory startup builder.
- `runScenario(...)` owns harness artifacts and week-loop execution.
- `createStateFromScenario(...)` owns the desktop/dev convenience read path for startup state.
- `startNewCampaign(...)` remains a thin desktop overlay layer on top of canonical startup state.

### What changed

- extracted the full startup-state construction block from `runScenario(...)` into `buildScenarioStartupState(...)`
- kept canonical startup normalization inside that shared builder
- changed `createStateFromScenario(...)` default path to use the shared builder directly
- retained the old harness artifact path only when `initialStateOnly: false` is explicitly requested for backward compatibility

### What was deferred

- a baked static April 1992 snapshot artifact
- removing scenario-source startup construction from tooling/harness paths
- product-flow changes to New Campaign / Load Save

## Implementation

### Files changed

- `src/scenario/scenario_runner.ts`
- `tests/desktop_campaign_start_contract.test.ts`

### Seams removed

- desktop startup no longer requires `runScenario(...)` to generate `run_meta.json` / `initial_save.json`
- desktop canonical birth state now comes from the shared in-memory startup builder instead of harness artifact round-tripping

### Hardening added

- explicit source-boundary regression proving `createStateFromScenario(...)` uses `buildScenarioStartupState(...)` on the default desktop path
- retained canonical birth-state parity proof against `initial_save.json`
- retained `startNewCampaign(...)` canonicalization proof

## Verification

### Targeted

- `npx.cmd tsx --test tests/desktop_campaign_start_contract.test.ts tests/state.test.ts`
- `npx.cmd vitest run tests/desktop_persistence_contract.test.ts tests/save_migration.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`

### Full

- `npm.cmd run test:vitest`
- `npm.cmd run build`

### Results

- targeted node tests: 7/7 passed
- targeted vitest persistence/migration tests: 7/7 passed
- full Vitest: passed
- typecheck: passed
- build: passed

## Architectural outcome

The startup story is now easier to explain:

1. scenario code builds canonical birth state in memory
2. desktop consumes that builder directly
3. harness writes run artifacts on top of the same builder

Desktop and harness still share startup truth, but desktop no longer borrows harness artifact generation just to get there.

## Residual risks

- `New Game` still pays full scenario-source startup cost on every launch
- a baked static April 1992 startup artifact is still open
- `createStateFromScenario(...)` remains in `scenario_runner.ts`; the boundary is cleaner now, but startup productization can still be separated further later if needed

## Follow-up recommendation

Next best lane: **Baked April 1992 Startup Snapshot Productization**

That work would build on the now-clean ownership line instead of trying to solve startup contract truth and startup artifact ownership at the same time.
