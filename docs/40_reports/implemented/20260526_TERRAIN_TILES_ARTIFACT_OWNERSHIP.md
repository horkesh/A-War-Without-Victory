# Terrain Tiles Artifact Ownership

**Date:** 2026-05-26
**Result:** Static ownership guard added for committed PMTiles terrain/map tile artifacts.

## Summary
- Added generated-artifact ownership matrix rows for the three committed PMTiles tile archives under `data/derived/tiles/`.
- Added a static Vitest guard proving the rows exist, the files are tracked, Git attributes treat them as LFS binary artifacts, and the desktop PMTiles route/range test remains the consumer guard.
- No PMTiles files were regenerated, read as payloads, or modified.

## Changes Made
- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md` now lists:
  - `data/derived/tiles/hillshade.pmtiles`
  - `data/derived/tiles/osm.pmtiles`
  - `data/derived/tiles/terrain.pmtiles`
- `tests/terrain_tiles_artifact_ownership.test.ts` checks ownership rows, tracking, binary attributes, and the existing desktop consumer guard.
- Closeout docs now record the slice in the report index, command board, engine-quality plan, and project ledger.

## Verification
- Red first: `F:\A-War-Without-Victory\vitest.cmd run tests\terrain_tiles_artifact_ownership.test.ts --reporter=dot` failed before the matrix update because `data/derived/tiles/hillshade.pmtiles` was not listed.
- `git check-attr filter diff merge text -- data/derived/tiles/hillshade.pmtiles data/derived/tiles/osm.pmtiles data/derived/tiles/terrain.pmtiles` - PASS; all three files report `filter: lfs`, `diff: lfs`, `merge: lfs`, and `text: unset`.
- `F:\A-War-Without-Victory\vitest.cmd run tests\terrain_tiles_artifact_ownership.test.ts --reporter=dot` - PASS; 1/1 test.
- `F:\A-War-Without-Victory\vitest.cmd run tests\desktop_pmtiles_protocol_route.test.ts --reporter=dot` - PASS; 5/5 tests.
- `git diff --check` - PASS.
- `git status --short -- data/derived/tiles; git diff --name-only -- data/derived/tiles` - PASS; no output, confirming no tracked PMTiles bytes changed.

## Files Changed
| File | Change |
|---|---|
| `tests/terrain_tiles_artifact_ownership.test.ts` | New static ownership guard. |
| `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md` | Added PMTiles artifact ownership rows. |
| `docs/40_reports/implemented/20260526_TERRAIN_TILES_ARTIFACT_OWNERSHIP.md` | Implementation report. |
| `docs/40_reports/README.md` | Latest report index entry. |
| `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` | Consolidated implemented summary entry. |
| `docs/plans/COMMAND_BOARD.md` | Save/replay/generated-artifact lane status update. |
| `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` | Phase 3 status update. |
| `docs/PROJECT_LEDGER.md` | Ledger closeout entry. |

## Residual Risk
- The exact repo-local regeneration command for these PMTiles archives is still undocumented. The matrix deliberately names the owner as the terrain/tile build pipeline rather than inventing a command.
