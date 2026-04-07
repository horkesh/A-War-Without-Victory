# 2026-04-07 — v0.8-to-v0.9 Diagnostics / SITREP Phase 2 — Operational SITREP Truth Unification

## Scope

Bounded hardening lane:

- unify operational SITREP truth across Warroom reports, Army HQ SUMMARY, and `SituationTab`
- remove the next duplicate reporting seam after command briefing unification
- correct live docs that still narrated deleted `generateBriefing()` behavior as current truth

## Why this lane

After the `last_briefing` lane, the next biggest reporting-truth seam was not command briefing anymore. It was operational reporting:

- Warroom `ReportsModal` built its own operational story from `extractWarData(...)`
- Army HQ SUMMARY / `SituationTab` rebuilt overlapping front / sustainment / corps-ops truth from separate local heuristics
- live docs still described deleted `generateBriefing()` logic as if it were current

This left the repo with two overlapping SITREP narrators for the same war state and two live docs telling an outdated ownership story.

## Audit findings

### Canonical

- `src/ui/warroom/data/war_data_extractor.ts`
  - `extractWarData(...)` already existed as a deterministic, player-safe operational snapshot owner for Warroom reporting

### Duplicate / drift-prone before change

- `src/ui/map/components/SituationTab.tsx`
  - locally recomputed overlapping operational summary fields (`frontPressureByEdge`, local supply summary heuristics, fragile-op status)
- `src/ui/map/components/army_hq/WarSummaryContent.tsx`
  - had no canonical operational SITREP packet and therefore depended on `SituationTab` / local summary logic for overlapping operational reporting
- `src/ui/warroom/components/ReportsModal.ts`
  - rendered a separate operational intelligence brief path from raw snapshot data
- `src/ui/map/data/GameStateAdapter.ts`
  - did not expose a canonical operational reporting packet to UI consumers

### Stale live docs

- `docs/20_engineering/MAP_UI_MASTER.md`
  - still described `SituationBriefing.tsx` as `generateBriefing()`-driven and described non-live Army HQ reporting ownership as current truth
- `docs/40_reports/GUI_MASTER.md`
  - still described the deleted `generateBriefing()` path as the live Situation Briefing owner

## Design

### Canonical ownership after change

- raw operational reporting owner: `extractWarData(...)`
- shared reporting transform: `src/ui/shared/operational_sitrep_views.ts`
- adapter-owned UI packet: `loadedGameState.operationalSitrep`
- consumers:
  - Warroom `ReportsModal`
  - Army HQ `WarSummaryContent`
  - `SituationTab` (including the OOB sidebar command rail)

### What changed

- introduced one shared `OperationalSitrepView`
- mapped that view in `GameStateAdapter`
- switched Warroom report rendering to the shared view
- switched Army HQ summary surfaces to consume the shared packet

### What stayed out of scope

- broader explanation surfaces beyond the operational SITREP core
- replay / save-load work beyond the already-complete command briefing packet
- Army HQ legacy helper-file retirement beyond documenting that they are not live top-row owners
- UI polish or shell-density work

## Implementation

### New shared owner

- `src/ui/shared/operational_sitrep_views.ts`
  - added deterministic shared operational SITREP view
  - owns:
    - front ordering
    - weakest-brigade ordering
    - corps-operation ordering
    - alert ordering / wording
    - headline generation

### Adapter mapping

- `src/ui/map/data/GameStateAdapter.ts`
  - maps `extractWarData(...)` through `toOperationalSitrepView(...)`
  - exposes `loadedGameState.operationalSitrep`
  - only does this when war-phase data actually includes a displacement block, preserving adapter tolerance for partial test states

- `src/ui/map/data/types.ts`
  - added `operationalSitrep?: OperationalSitrepView`

### Presentation-only consumers

- `src/ui/warroom/components/ReportsModal.ts`
  - now renders war-phase operational report sections from the shared SITREP packet instead of a separate local summary path

- `src/ui/map/components/SituationTab.tsx`
  - overview/alerts now consume `state.operationalSitrep`
  - stopped rebuilding overlapping operational top-line truth from separate local summary heuristics

- `src/ui/map/components/army_hq/WarSummaryContent.tsx`
  - Army HQ SUMMARY overview now surfaces the canonical operational SITREP packet directly

## Tests

- `tests/operational_sitrep_views.test.ts`
  - deterministic ordering / alert contract for the shared view
- `tests/ui_map_game_state_adapter.test.ts`
  - proves adapter packet parity with `extractWarData(...)` + shared transform
- `tests/warroom_player_visibility.test.ts`
  - Warroom reporting still renders player-safe output from the shared path
- `tests/ui_player_visibility.test.ts`
  - source-level regression guard that summary surfaces read `operationalSitrep`
- `tests/ui_adapter_boundary.test.ts`
  - boundary declaration coverage for `operationalSitrep`

## Documentation updates

- `docs/20_engineering/MAP_UI_MASTER.md`
  - removed stale `generateBriefing()` ownership story
  - documented current command briefing and operational SITREP owners
- `docs/40_reports/GUI_MASTER.md`
  - corrected live Army HQ ownership narrative
  - added this lane to recent GUI changes
- `docs/PROJECT_LEDGER.md`
  - added lane closeout entry
- `.claude/architect_notes.md`
  - added reusable ownership lessons
- `docs/plans/MASTER_ROADMAP.md`
  - updated v0.8-to-v0.9 status line truthfully

## Verification

### Targeted

- `npx.cmd vitest run tests/operational_sitrep_views.test.ts tests/warroom_player_visibility.test.ts tests/ui_player_visibility.test.ts`
- `npx.cmd tsx --test tests/ui_map_game_state_adapter.test.ts`

### Full

- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

### Evidence

- Warroom reports and Army HQ summary surfaces now read the same `OperationalSitrepView`
- adapter parity test proves `loadedGameState.operationalSitrep` matches the shared transform fed from `extractWarData(...)`
- live docs no longer narrate deleted `generateBriefing()` logic as current truth

## Residual risk

This lane unified the operational SITREP core. It did not yet unify every remaining explanation or staff-synthesis helper in the repo. The next strongest follow-up remains broader explanation-surface cleanup for surfaces outside the operational packet core.
