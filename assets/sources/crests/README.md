# Army crests for tactical map and OOB

Place PNG crest images here for the standalone tactical map viewer. The viewer loads them from `/assets/sources/crests/` (served from project root by the map Vite dev server; in production/Electron builds they are copied into `dist/tactical-map/assets/sources/crests/` by the Vite build).

**Required filenames:**

| Faction | Filename |
|---------|----------|
| RBiH (ARBiH) | `crest_ARBiH.png` |
| RS (VRS)     | `crest_VRS.png`   |
| HRHB (HVO)   | `crest_HVO.png`   |

If a file is missing, the map falls back to faction-colored rectangles for markers and omits the crest image in OOB/INTEL rows.

**Faction flags (settlement/brigade panel header):**

| Faction | Filename    |
|---------|-------------|
| RBiH    | `flag_RBiH.png` |
| RS      | `flag_RS.png`   |
| HRHB    | `flag_HRHB.png` |
