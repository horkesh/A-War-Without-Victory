# 2026-04-07 - v0.8-to-v0.9 Commander Explanation Surfaces Phase 3 - Warroom Narrative Surface Narrowing

## Scope

Bounded hardening lane:

- remove the remaining soft-duplicate narrative seam in Warroom advisory surfaces
- stop `FactionOverviewPanel` from owning a separate strategic-warning model
- keep Warroom shell flavor where it stays clearly presentation-only

## Why this lane

The packet seam was already closed:

- `extractWarData(...)` owned the raw player-safe operational snapshot
- `getOperationalSitrepView(...)` owned the canonical mapped operational packet
- Army HQ SUMMARY, `SituationTab`, the adapter, and Warroom reports all consumed that packet

The remaining ambiguity lived in narrative ownership. `FactionOverviewPanel` still rendered its own warning list by recomputing overlapping operational judgments from raw snapshot data. That made the architecture harder to explain: the packet was canonical, but Warroom still had a second warning brain.

## Audit findings

### Canonical before this pass

- `src/ui/warroom/data/war_data_extractor.ts`
  - raw operational snapshot owner
- `src/ui/shared/operational_sitrep_views.ts`
  - canonical operational packet owner
- `src/ui/warroom/components/ReportsModal.ts`
  - canonical packet consumer after Phase 2
- `src/ui/map/components/army_hq/WarSummaryContent.tsx`
  - canonical packet consumer
- `src/ui/map/components/SituationTab.tsx`
  - canonical packet consumer

### Remaining soft-duplicate narrative seam

- `src/ui/warroom/components/FactionOverviewPanel.ts`
  - still called `extractWarData(...)`
  - still built local warning prose in `generateWarPhaseWarnings(...)`
  - mixed shell-handoff copy with a second strategic-warning interpretation layer

### Intentionally not chosen

- `MagazineModal.ts`
  - still authors a periodical wrapper over raw snapshot facts
  - acceptable as flavor because it does not define a competing alert model
- `DiplomacyModal.ts`
  - faction-specific diplomatic shell over diplomatic facts, not an operational SITREP owner

## Design

### Canonical boundary after cleanup

- canonical fact:
  - `extractWarData(...)`
- canonical player-safe operational packet:
  - `getOperationalSitrepView(...)`
- allowed shell summarization:
  - render packet fields and packet alerts
  - present handoff language that points detailed command review back to Army HQ
- intentionally authored flavor:
  - magazine/newspaper framing over player-safe facts
- forbidden after this lane:
  - local Warroom warning builders that recompute operational alert truth from raw state

### Accepted ownership line

- `FactionOverviewPanel`
  - may summarize command-shell posture
  - may render `operationalSitrep.alerts`
  - may not own a separate strategic-warning model
- `MagazineModal`
  - remains a flavor wrapper over snapshot facts
  - does not own operational alert truth

## Implementation

### Shared alert contract widened instead of adding a new narrative builder

- `src/ui/warroom/data/war_data_extractor.ts`
  - `ExhaustionSnapshot` now carries `increasing` and `collapseEligible`
- `src/ui/shared/operational_sitrep_views.ts`
  - expanded `alerts` generation to carry the warning conditions that Warroom had been deriving locally:
    - collapse eligibility
    - authority critical
    - exhaustion worsening
    - Bosniak-Croat alliance strain
    - brigade packing / front-gap risk

This keeps one canonical warning model instead of introducing a new advisory formatter.

### Warroom shell narrowing

- `src/ui/warroom/components/FactionOverviewPanel.ts`
  - now reads `getOperationalSitrepView(this.gameState, pf)`
  - warning band now renders `sitrep.alerts.map((alert) => alert.text)`
  - deleted local `generateWarPhaseWarnings(...)`
  - `COMMAND SHELL` handoff remains as shell-only posture summary

## Tests

- `tests/operational_sitrep_views.test.ts`
  - expanded deterministic alert-order coverage to include the newly canonicalized warning conditions
- `tests/warroom_player_visibility.test.ts`
  - added regression guard proving `FactionOverviewPanel` consumes the shared packet and no longer contains `generateWarPhaseWarnings(...)`
- `tests/ui_map_game_state_adapter.test.ts`
  - re-run to verify adapter parity against the same shared packet owner

## Verification

### Targeted

- `npx.cmd vitest run tests/operational_sitrep_views.test.ts tests/warroom_player_visibility.test.ts`
- `npx.cmd tsx --test tests/ui_map_game_state_adapter.test.ts`

### Full

- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

### Evidence

- `FactionOverviewPanel` no longer owns `generateWarPhaseWarnings(...)`
- Warroom warning copy now comes from the same shared `operationalSitrep.alerts` packet used by other surfaces
- shell-handoff prose remains separate and intentional
- `MagazineModal` remains clearly outside packet ownership and does not compete with the alert model

## Residual risk

Warroom still has authored narrative surfaces, especially `MagazineModal`, but they are now easier to explain:

- operational alert truth lives in one shared packet
- shell summaries may render that packet
- flavor wrappers may frame facts without defining a second alert model

The next repo-wide cleanup should focus on remaining docs/canon refresh and broader save/load/replay hardening rather than more explanation-surface surgery.
