## 2026-04-11 - Front-Edge Display Ownership Completion Hardening

### Seam chosen

The live seam was missing display ownership on some authoritative `war_front_edges_osid` faction-sides. The raw sector packet could omit sector-side ownership for those edges, which left the renderer with no `sector_id` for hover, click, or selected-sector glow on visible front segments.

### Why this lane won

- It fixed the actual player-visible breakage without mutating simulation behavior.
- A sim-side backfill attempt changed operation behavior and broke `scenario_vrs_operation_proof`, so the safe canonical owner had to be display-side.
- It let both map renderers share one deterministic completion rule instead of continuing to improvise edge lookups independently.

### Canonical owner after cleanup

`src/ui/map/map/builders/displayFrontEdgeOwnership.ts`

This helper now owns display-only completion of missing front-edge faction-side sector/corps ownership from:

1. exact raw sector edge claims
2. sector front and territory claims
3. nearest same-faction adjacency over the rendered polygon graph
4. last-resort nearest display adjacency when only a weaker path exists

### Demoted path after cleanup

- sim-side front-edge backfill in `src/sim/combat/corps_front_sectors.ts`
- broad geometry authority changes in `src/map/front_edges.ts`
- ad hoc edge-to-sector lookup inside individual renderers

### Files changed

- `src/ui/map/map/builders/displayFrontEdgeOwnership.ts`
- `src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts`
- `src/ui/map/map/builders/buildFrontEdgesHoverGeoJSON.ts`
- `tests/front_edge_ownership_completion.test.ts`
- `tests/ui_front_edge_display_ownership_real_save.test.ts`

### Exact behavior change

1. `buildCorpsFrontLinesGeoJSON(...)` and `buildFrontEdgesHoverGeoJSON(...)` now consume one shared completed ownership map.
2. Hover/click payloads preserve `sector_id` and `corps_id` for authoritative front-edge faction-sides even when the raw sector packet omitted that side.
3. Selected-sector line rendering reads the same completed ownership, so those missing sides no longer create false visual breaks.
4. East Bosnia proof case: `op:foca:donje_zesce__op:pale:podgrab` now resolves both `RBiH` and `RS` display-side sector ownership.

### Proof

- Real-save raw sector packet missing front-edge faction-side ownerships: `45`
- Real-save display-layer missing front-edge faction-side ownerships after completion: `0`
- Real-save visible hover features missing `sector_id`: `0 / 596`
- East Bosnia proof edge:
  - `op:foca:donje_zesce__op:pale:podgrab`
  - `RBiH` side display owner present: yes
  - `RS` side display owner present: yes

### Verification

- `npx.cmd vitest run tests/front_edge_ownership_completion.test.ts tests/ui_sector_glow_continuity.test.ts tests/ui_map_sector_lookup.test.ts tests/front_sector_player_visibility.test.ts tests/ui_front_edge_display_ownership_real_save.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `node tools/validate_run_consistency.cjs runs\\apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1425`
- `npm.cmd run recovery:check`
- `npm.cmd run build`
- `npm.cmd run test:vitest`

### Scenario note

I also ran `npm.cmd run sim:scenario:run:40w`, producing `runs\\apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1425`. This lane is display/read-model hardening, so the strongest evidence is the live-save ownership audit rather than a scenario hash delta.

### Residual risks

- The raw sim packet still omits some front-edge faction-side ownerships. That remains acceptable only because the display layer now has one canonical completion owner.
- Any future attempt to promote this completion into sim truth must first prove zero scenario drift under operation proof and 40-week validation.
