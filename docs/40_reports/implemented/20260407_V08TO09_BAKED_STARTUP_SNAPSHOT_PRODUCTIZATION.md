# 2026-04-07 — v0.8-to-v0.9 Baked April 1992 Startup Snapshot Productization

## Summary

Productized a real desktop-owned April 1992 startup artifact on top of the canonical startup builder that landed in the previous lane.

Desktop `New Campaign` for `apr_1992` no longer recomputes scenario-source startup state on every launch. It now consumes a committed baked startup snapshot:

- `data/derived/startup/apr_1992_initial_save.json`

The canonical builder remains the primary truth source. The baked artifact is a one-way derived product artifact that is generated and validated from that builder.

## Why this lane

The previous lane solved the harder ownership problem:

- desktop and harness shared one canonical in-memory startup builder

But the product still lacked a clearly owned startup artifact:

- desktop `New Campaign` still recomputed April 1992 startup state every time
- there was no committed product artifact representing the April 1992 campaign birth contract
- the startup story was still "compute everything on demand" instead of "load the product-owned startup save, then apply desktop-only overlays"

This lane adds that artifact without creating a competing truth source.

## Audit findings

### Canonical

- `buildScenarioStartupState(...)` in `src/scenario/scenario_runner.ts` was already the canonical startup builder.
- `canonicalizeStartupState(...)` already guaranteed builder output matched canonical save/load shape.
- `startNewCampaign(...)` already canonicalized desktop-only overlays before returning state.

### Remaining seam before the change

- `startNewCampaign(...)` still called `createStateFromScenario(...)`
- `createStateFromScenario(...)` defaulted to the in-memory builder
- desktop startup was truthful, but it still depended on scenario-source initialization instead of a product-owned startup artifact

## Design

### Ownership model

- **Scenario authoring truth:** `data/scenarios/apr1992_definitive_52w.json`
- **Canonical startup builder:** `buildScenarioStartupState(...)`
- **Baked startup artifact:** `data/derived/startup/apr_1992_initial_save.json`
- **Desktop bootstrap consumer:** `startNewCampaign(...)`

### Rules after cleanup

1. The builder remains primary truth.
2. The baked artifact is generated from the builder and must match it byte-for-byte.
3. Desktop `apr_1992` startup consumes the baked artifact, not the builder directly.
4. Desktop-only overlays (`player_faction`, recruitment seed) still happen after artifact load, followed by canonicalization.

### What was intentionally deferred

- additional baked startup artifacts for other scenarios
- build-time packaging/installer integration for snapshot regeneration
- removing `createStateFromScenario(...)` from `scenario_runner.ts`

## Implementation

### Files changed

- `src/scenario/startup_snapshot.ts`
- `src/desktop/desktop_sim.ts`
- `src/scenario/scenario_runner.ts`
- `tools/scenario_runner/build_startup_snapshot.ts`
- `tests/startup_snapshot_contract.test.ts`
- `package.json`
- `data/derived/startup/apr_1992_initial_save.json`

### What changed

- Added `src/scenario/startup_snapshot.ts` as the shared startup-artifact contract module.
  - owns snapshot path definitions
  - builds canonical artifact payloads from the builder
  - loads committed artifacts
  - validates committed artifact parity against canonical builder truth
- Exported `buildScenarioStartupState(...)` from `src/scenario/scenario_runner.ts` so the snapshot contract can derive artifacts directly from the canonical builder.
- Changed `startNewCampaign(...)` in `src/desktop/desktop_sim.ts` so `apr_1992` loads the baked startup artifact instead of recomputing startup state through `createStateFromScenario(...)`.
- Added `tools/scenario_runner/build_startup_snapshot.ts` with:
  - `--write` to regenerate the baked artifact
  - `--check` to verify artifact drift
- Added package scripts:
  - `npm run desktop:startup-snapshot:build`
  - `npm run desktop:startup-snapshot:check`
- Generated and committed `data/derived/startup/apr_1992_initial_save.json`.

## Verification

### Targeted commands

- `npx.cmd tsx --test tests/startup_snapshot_contract.test.ts tests/desktop_campaign_start_contract.test.ts tests/state.test.ts`
- `npm.cmd run desktop:startup-snapshot:check`

### Full commands

- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

### Results

- targeted startup contract tests: passed
- startup snapshot drift check: passed
- full Vitest: passed
- typecheck: passed
- build: passed

### Proof points

- the baked artifact matches canonical builder truth byte-for-byte
- desktop `startNewCampaign(...)` now consumes the baked artifact for `apr_1992`
- save/load still does not reshape startup truth after desktop overlays
- canonical builder remains primary because regeneration/validation both derive from it

## Architectural outcome

Desktop campaign birth is now easier to explain:

1. scenario authoring defines April 1992 truth
2. the canonical builder produces startup-save truth
3. the repo commits that truth as a baked product artifact
4. desktop loads the artifact and applies only minimal session overlays

That is a cleaner startup story than "recompute April 1992 every time."

## Residual risks

- only `apr_1992` is productized; additional scenarios still use the builder path directly
- artifact generation is script-driven rather than enforced in a packaging/build gate
- startup builder ownership is cleaner, but the builder still lives in `scenario_runner.ts` rather than a separate startup module

## Follow-up recommendation

Next best lane: **Desktop Startup Packaging Guardrails + Snapshot Drift Gate**

That would tighten when and how startup artifacts are validated or refreshed in regular build/release workflows without widening back into scenario-authoring redesign.
