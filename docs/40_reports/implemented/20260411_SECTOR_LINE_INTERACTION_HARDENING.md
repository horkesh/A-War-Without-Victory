## 2026-04-11 - Sector Line Interaction Hardening

### Seam chosen

Sector/front lines could be visibly correct but still feel unreliable to hover or click because the interaction hook was not treating every visible sector-line layer as an authoritative interaction surface.

### Why this lane won

- The remaining symptom was interaction-only: "touch and go" hover/click on visible sector lines.
- The map already rendered additional visible sector-glow layers, but `useMapInteractions.ts` still privileged only part of that layer family.
- This could be fixed without touching simulation behavior or geometry truth.

### Canonical owner after cleanup

`src/ui/map/map/useMapInteractions.ts`

### Files changed

- `src/ui/map/map/useMapInteractions.ts`
- `tests/ui_map_interactions.test.ts`

### Exact behavior change

1. Sector-glow layers (`sector-edge-glow-pos` / `sector-edge-glow-neg`) are now first-class interactive layers for click and hover, not passive rendering-only layers.
2. The generic map click fallback now also treats sector-glow hits as sector/front-line interactions instead of ignoring them.
3. OSID hover suppression now recognizes the full interactive front-line layer family, so settlement hover does not compete with visible line hover.
4. Hovering a stitched highlight-only line segment no longer clears an existing front tooltip just because that segment has `sector_id` but no `edge_id`.

### Verification

- `npx.cmd vitest run tests/ui_map_interactions.test.ts`
- `npx.cmd vitest run tests/ui_map_interactions.test.ts tests/ui_map_sector_lookup.test.ts tests/front_sector_player_visibility.test.ts tests/ui_front_edge_display_ownership_real_save.test.ts tests/ui_sector_glow_continuity.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

### Residual risk

- This lane hardens the interaction path against the current layer family, but if a future renderer lane introduces another visible sector-line layer without adding it to the interactive family, the map can regress back into "looks selectable, is not selectable."
