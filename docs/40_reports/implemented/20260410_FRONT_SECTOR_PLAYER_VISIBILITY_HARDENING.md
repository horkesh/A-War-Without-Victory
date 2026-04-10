# 2026-04-10 Front Sector Player Visibility Hardening

## Lane summary

- **Lane:** `fix(ui): harden front sector player visibility`
- **Type:** UI / player-truth hardening
- **Canonical owner after cleanup:** `filterPlayerFacingSectors(...)` / `findPlayerFacingSectorById(...)` in `src/ui/shared/playerVisibility.ts`
- **Demoted path:** raw `sector_id` payloads from front-edge hover features and unvalidated `selectedCorpsFrontSectorId` store reads

## Candidate seams considered

1. **Front sector player visibility**
   - Chosen.
   - Highest-value bounded live seam because the tactical map could still route enemy sector ids into the player-facing sector shell.
2. **Player-faction fallback cleanup**
   - Deferred.
   - Real hardening, but lower priority than a direct cross-faction shell leak in normal selection paths.
3. **Operation force-ratio precision**
   - Deferred.
   - Still a player-knowledge seam, but less severe than opening the wrong faction’s sector shell.
4. **Gorazde uncovered residuals**
   - Demoted.
   - Still content/runtime audit, not yet a proven false-owner lane.
5. **Podrinje stranded lifecycle**
   - Demoted.
   - Redesign-blocked because no canonical lifecycle owner exists.
6. **444th Konjic salient**
   - Demoted.
   - Doctrine realism, not a truth-owner contradiction.

## Exact seam

The front-edge interaction path still trusted raw `sector_id` values carried by `buildFrontEdgesHoverGeoJSON(...)`. `MapContainer.tsx` could push those ids into `selectedCorpsFrontSectorId`, and `CorpsFrontPanel.tsx` then looked up any matching `corpsFrontSectors` entry instead of revalidating it against the player-facing sector filter.

That created a cross-faction leak: enemy-side front-edge features could route enemy sector shells into the player-facing tactical surface.

## Change

1. `src/ui/shared/playerVisibility.ts`
   - adds `findPlayerFacingSectorById(...)` as the canonical sector-selection gate
2. `src/ui/map/map/builders/buildFrontEdgesHoverGeoJSON.ts`
   - strips `sector_id` / `corps_id` from non-player front-edge payloads in player mode
3. `src/ui/map/map/MapContainer.tsx`
   - gates settlement-context and front-edge sector selection through `findPlayerFacingSectorById(...)`
   - passes the normalized player faction into `buildFrontEdgesHoverGeoJSON(...)`
4. `src/ui/map/components/CorpsFrontPanel.tsx`
   - resolves the selected sector through `findPlayerFacingSectorById(...)` instead of trusting any matching sector id
5. `tests/front_sector_player_visibility.test.ts`
   - locks the selection gate, front-edge payload contract, and code-path usage

## Why scenario proof is not relevant

This lane does not change:

- simulation behavior
- persistence
- anomaly generation
- scenario outputs

The strongest truthful proof is boundary regression coverage plus the full verification bar.

## Before / after proof

### Baseline

- enemy front-edge payloads still carried `sector_id` / `corps_id`
- `MapContainer.tsx` forwarded those ids directly into `selectedCorpsFrontSectorId`
- `CorpsFrontPanel.tsx` trusted any selected id found in `loadedGameState.corpsFrontSectors`

### Post-fix

- enemy front-edge payloads lose selectable sector metadata in player mode
- map/context-menu sector selection routes through `findPlayerFacingSectorById(...)`
- `CorpsFrontPanel.tsx` refuses to render injected non-player sector ids

## Verification

### Targeted

- `npx.cmd vitest run tests/front_sector_player_visibility.test.ts tests/ui_player_visibility.test.ts tests/ui_map_render_smoke.test.ts`
  - passed
  - `3` files / `43` tests

### Full verification bar

- `npm.cmd run recovery:check`
  - passed
- `npm.cmd run test:vitest`
  - passed
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - passed
- `npm.cmd run build`
  - passed

## Files changed

- `src/ui/shared/playerVisibility.ts`
- `src/ui/map/map/builders/buildFrontEdgesHoverGeoJSON.ts`
- `src/ui/map/map/MapContainer.tsx`
- `src/ui/map/components/CorpsFrontPanel.tsx`
- `tests/front_sector_player_visibility.test.ts`
- `docs/40_reports/implemented/20260410_FRONT_SECTOR_PLAYER_VISIBILITY_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Residual board after lane

- **Next bounded hardening lane:** player-facing operation force-ratio precision
- **Hardening but lower priority:** player-faction fallback cleanup in observer/bootstrap shell edges
- **Content/runtime audit:** Gorazde uncovered territorial residuals
- **Redesign-blocked:** Podrinje stranded same-faction brigade lifecycle
- **Later realism:** 444th Konjic salient discipline
