# 2026-04-07 - v0.8-to-v0.9 Commander Explanation Surfaces Phase 2 - Staff / Advisory Reporting Unification

## Scope

Bounded hardening lane:

- close the remaining reporting-truth seam left by operational SITREP Phase 2
- stop Warroom `ReportsModal` from rebuilding its own operational SITREP packet
- make the final ownership story exact across code, docs, and tests

## Why this lane

The previous operational SITREP lane moved Army HQ SUMMARY and `SituationTab` onto a shared packet, but one bypass remained:

- `src/ui/warroom/components/ReportsModal.ts` still called `extractWarData(...)`
- it then rebuilt its own SITREP packet locally before formatting the staff report body

That meant the repo was still overclaiming unification. The raw snapshot owner was right, but the packet-consumer story was not yet true.

## Audit findings

### Canonical before this pass

- `src/ui/warroom/data/war_data_extractor.ts`
  - raw player-safe operational snapshot owner
- `src/ui/shared/operational_sitrep_views.ts`
  - shared SITREP transform
- `src/ui/map/data/GameStateAdapter.ts`
  - adapter-owned `loadedGameState.operationalSitrep`

### Remaining seam

- `src/ui/warroom/components/ReportsModal.ts`
  - still imported `extractWarData(...)`
  - still called `toOperationalSitrepView(snap)` locally
  - still mixed canonical facts with a local packet-construction step in the reporting surface itself

## Design

### Ownership after cleanup

- raw operational snapshot owner:
  - `extractWarData(gameState, playerFaction)`
- canonical mapped packet owner:
  - `getOperationalSitrepView(gameState, playerFaction)` in `src/ui/shared/operational_sitrep_views.ts`
- consumers:
  - `GameStateAdapter`
  - Army HQ SUMMARY / `SituationTab` through `loadedGameState.operationalSitrep`
  - Warroom `ReportsModal`

### Presentation rule

Warroom staff reporting may still read extra snapshot-only fields that are outside the SITREP packet contract, such as enemy-contact lines. But it must not rebuild the packet itself.

## Implementation

### Shared canonical read path

- `src/ui/shared/operational_sitrep_views.ts`
  - added `getOperationalSitrepView(gameState, playerFaction)`
  - this now owns the canonical read path from raw `GameState` to `OperationalSitrepView`

### Adapter simplification

- `src/ui/map/data/GameStateAdapter.ts`
  - now calls `getOperationalSitrepView(...)`
  - no longer wires `extractWarData(...)` and `toOperationalSitrepView(...)` together locally

### Warroom reporting unification

- `src/ui/warroom/components/ReportsModal.ts`
  - now calls `getOperationalSitrepView(this.gameState, factionId)`
  - no longer rebuilds the SITREP packet locally
  - still reads `extractWarData(...)` once for enemy-contact lines that are not part of the SITREP packet contract

## Tests

- `tests/operational_sitrep_views.test.ts`
  - added coverage for the shared raw-state read path
- `tests/ui_map_game_state_adapter.test.ts`
  - adapter parity now asserts against `getOperationalSitrepView(...)`
- `tests/warroom_player_visibility.test.ts`
  - added regression guard proving `ReportsModal` uses the shared packet path and no longer contains `toOperationalSitrepView(snap)`

## Verification

### Targeted

- `npx.cmd vitest run tests/operational_sitrep_views.test.ts tests/warroom_player_visibility.test.ts`
- `npx.cmd tsx --test tests/ui_map_game_state_adapter.test.ts`

### Full

- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

### Evidence

- `ReportsModal` now consumes the same shared packet owner as the adapter
- the local `toOperationalSitrepView(snap)` bypass is gone
- docs now describe the exact final ownership line:
  - raw snapshot owner
  - shared packet owner
  - presentation-only consumers

## Residual risk

This closes the remaining operational SITREP packet seam. It does not fully unify every broader staff/advisory narrative helper outside this packet family, especially surfaces that still summarize command or political state in their own prose.
