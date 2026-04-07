# 2026-04-07 — v0.8-to-v0.9 Desktop Campaign-Start Snapshot + Save Contract Cleanup

## Lane

`Desktop Campaign-Start Snapshot + Save Contract Cleanup`

Bounded package chosen:
- canonicalize campaign-birth state onto the loaded-save contract before `initial_save.json` is written
- make desktop `startNewCampaign(...)` return canonicalized state after its desktop-only overlays
- prove that campaign birth and first load now tell the same persistence story

## Why This Package

Audit showed that the broad "campaign-start snapshot" problem still had one smaller, stronger seam that was already live:
- `runScenario(... initialStateOnly: true)` wrote `initial_save.json` directly from the freshly built engine state
- `createStateFromScenario(...)` then re-read that file through `deserializeState(...)`
- that meant desktop startup was effectively stronger *after* load than at campaign birth

The proof was concrete:
- before this lane, `serializeState(await createStateFromScenario(...)) !== initial_save.json`
- the first difference appeared immediately in the `displacement` block because the loaded path gained canonical nested defaults that the birth save had not yet materialized

That made the startup contract harder to explain than it should be: the first save was not yet the same thing as the first loaded save.

## Canonical Model After Cleanup

- Freshly built campaign-start state may still come from scenario-source initialization
- But before that state is treated as a desktop campaign birth artifact or harness `initial_save.json`, it must be canonicalized through the save/load contract:
  - `serializeState(...)`
  - `deserializeState(...)`
  - `serializeState(...)`
- Desktop `startNewCampaign(...)` may apply session overlays (`player_faction`, recruitment seed) first, but it must then return the canonicalized result

Rules after cleanup:
- `initial_save.json` must already be in loaded-save form
- desktop startup state must already be in manual-save/load form before the player takes the first action
- a later baked April 1992 snapshot is still allowed, but it is an optimization/product-flow lane, not a prerequisite for startup truth

## Implementation

### Code

- `src/scenario/scenario_runner.ts`
  - added `canonicalizeStartupState(state)`:
    - serializes the freshly built state
    - hydrates it through `deserializeState(...)`
    - re-serializes the hydrated state
  - `runScenario(...)` now canonicalizes the initial campaign state before:
    - capturing `historicalMetricsInitial`
    - writing `initial_save.json`
    - continuing into week execution
- `src/desktop/desktop_sim.ts`
  - `startNewCampaign(...)` now canonicalizes the state after desktop-only overlays (`player_faction`, recruitment seed) and returns that canonicalized state

### Tests

- `tests/desktop_campaign_start_contract.test.ts` (new)
  - proves `initial_save.json` is already in canonical loaded-save form at campaign birth
  - proves desktop `createStateFromScenario(...)` matches that canonical `initial_save.json`
  - proves `startNewCampaign(...)` returns canonicalized state before the first manual save

## Verification

### Targeted

- `npx.cmd tsx --test tests/desktop_campaign_start_contract.test.ts tests/state.test.ts`
  - pass, 6/6
- Ad hoc parity probe after fix:
  - `serializeState(await createStateFromScenario(...)) === initial_save.json`
  - result: `true`

### Full required checks

- `npm.cmd run test:vitest`
  - pass
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - pass
- `npm.cmd run build`
  - pass

## Deferred

Not touched in this lane:
- baked April 1992 desktop startup snapshot
- removing the harness-artifact path from `createStateFromScenario(...)`
- broader validation-contract unification
- replay productization

## Outcome

This lane materially strengthens startup/persistence truth before `v0.9`:
- campaign birth state is no longer weaker than the first loaded save
- `initial_save.json` now matches the canonical loaded-save contract
- desktop `startNewCampaign(...)` now returns state that is already in manual-save/load form
- future snapshot work can focus on optimization and startup ownership, not on fixing a birth-vs-load contract mismatch first
