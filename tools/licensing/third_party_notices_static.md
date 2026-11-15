## 1. Fonts, data, audio and other bundled content

This part is maintained by hand in `tools/licensing/third_party_notices_static.md`. Each entry names
the shipped files and the repository record its provenance comes from. "Not recorded" means the
repository holds no source or licence record for that item.

### 1.1 Fonts

| Font | Shipped files | Licence | Copyright | Provenance record |
| --- | --- | --- | --- | --- |
| IBM Plex Sans, IBM Plex Sans Condensed, IBM Plex Sans SemiCondensed (all weights in the folder; the interface loads Condensed Regular, SemiBold and Bold) | `assets/ui/fonts/IBMPlexSans*.ttf` | SIL Open Font License 1.1 | Copyright © 2017 IBM Corp. with Reserved Font Name "Plex" | `assets/ui/fonts/README.md`; licence text `assets/ui/fonts/OFL-1.1.txt` |
| IBM Plex Mono Regular and SemiBold, Latin-1 and Latin-2 subsets | `assets/ui/fonts/IBMPlexMono-*.woff2` | SIL Open Font License 1.1 | Copyright © 2017 IBM Corp. with Reserved Font Name "Plex" | IBM/plex tag `v6.4.2`, commit `242c4cccd37e87985a5337815c99b960ef13c65c` (`assets/ui/fonts/README.md`); licence text `assets/ui/fonts/OFL-1.1.txt` |
| Caveat Bold, Latin and Latin-Ext subsets | `assets/ui/fonts/Caveat-Bold-*.woff2` | SIL Open Font License 1.1 | Copyright 2014 The Caveat Project Authors (https://github.com/googlefonts/caveat) | Google Fonts Caveat v23 (`assets/ui/fonts/README.md`); licence text `assets/ui/fonts/OFL-1.1-Caveat.txt` |
| Open Sans Regular and Bold, as MapLibre glyph ranges (map labels) | `src/ui/map/public/font/Open Sans Regular/*.pbf`, `src/ui/map/public/font/Open Sans Bold/*.pbf` | Not recorded for these files. Open Sans releases have been published under the Apache License 2.0 (earlier releases) and the SIL Open Font License 1.1 (current releases). | Not recorded: the upstream release the glyphs were cut from is not recorded. | Not recorded |

All other font names in the stylesheets (Georgia, Arial, Consolas, Menlo, Courier New, Segoe UI,
system-ui) are system fonts. They are referenced, not bundled.

### 1.2 OpenStreetMap data

- **Credit:** © OpenStreetMap contributors
- **Licence:** Open Data Commons Open Database License (ODbL) 1.0. Copyright and licence details:
  https://www.openstreetmap.org/copyright
- **Shipped files derived from OpenStreetMap:**
  - `data/derived/tiles/osm.pmtiles`: vector tiles (zoom 0–15) for the war map's roads, water,
    forests, land and place labels. Extracted from the Protomaps basemap daily build of 2026-02-27
    (`pmtiles extract https://build.protomaps.com/20260227.pmtiles --bbox=15.7,42.5,19.7,45.3`),
    Protomaps basemap v4 schema. Records:
    `docs/40_reports/handovers/AWWV_GUI_REWORK_PROGRESS_20260228.md`,
    `docs/40_reports/implemented/20260302_GEOGRAPHY_LAYER_REINTRODUCTION_PMTILES.md`. The tile
    build's other upstream sources, if any, are not recorded.
  - `data/derived/terrain/osm_roads_snapshot_h6_2.geojson.gz`,
    `data/derived/terrain/osm_waterways_snapshot_h6_2.geojson` (and `.gz`), and the terrain scalars
    derived from them (`data/derived/terrain/settlements_terrain_scalars.json`, by
    `scripts/map/phase_h6_8_derive_terrain_scalars.ts`). Extracted from
    `data/source/osm/bosnia-herzegovina-latest.osm.pbf` by
    `scripts/map/phase_h6_2_snapshot_osm_terrain.ts`. The `.osm.pbf` itself is not shipped.
  - `data/source/boundaries/geoboundaries_adm0_2023/` (Croatia, Montenegro and Serbia outlines) and
    the exterior-border table derived from it (`data/derived/operational/osid_exterior_border.json`,
    compiled into the simulation as `src/sim/combat/commander/osid_exterior_border_data.ts`).
    geoBoundaries gbOpen ADM0, boundary source "OpenStreetMap, Wambacher", ODbL 1.0; see 1.4.
- **In the game:** the credit appears on the war map, on the minimap, on the Credits screen and on
  the Dayton conference boundary map.

### 1.3 Elevation data: Copernicus DEM GLO-30

- **Shipped files:**
  - `data/derived/tiles/terrain.pmtiles`: Terrain-RGB elevation tiles (zoom 6–10) for 3-D terrain in
    the operations view. Source recorded as Copernicus GLO-30 (30 m) from `data/source/dem/`, built
    with GDAL and `pmtiles convert`. Record:
    `docs/40_reports/implemented/20260320_3D_TERRAIN_DECKGL_ARROWS_COMBAT_EFFECTIVENESS.md`.
  - `data/derived/tiles/hillshade.pmtiles`: hillshade raster tiles (zoom 6–12). Source recorded as
    `data/source/dem/raw/copernicus_dem_glo30_raw.tiff` (Copernicus GLO-30, 30 m resolution), via
    `gdaldem hillshade` and `pmtiles convert`. Record:
    `docs/40_reports/handovers/AWWV_GUI_REWORK_PROGRESS_20260228.md`. The 2026-03-02 geography report
    records this source only as "DEM source (external)".
  - `data/derived/terrain/dem_clip_h6_2.tif` (clipped from `copernicus_dem_glo30_raw` by
    `scripts/map/phase_h6_2_snapshot_dem_clip.ts`), `data/derived/terrain/hillshade_bg.png` and the
    terrain scalars computed from the same DEM.
- **Licence:** Copernicus DEM licence (European Space Agency, Copernicus programme). The attribution
  wording that licence requires is not recorded in this repository.

### 1.4 geoBoundaries

- **Shipped files:** `data/source/boundaries/geoboundaries_adm0_2023/*.geojson` and their
  `*-metaData.json` files, pinned in `data/source/boundaries/geoboundaries_adm0_2023/provenance.json`
  (geoBoundaries gbOpen ADM0, API snapshot built 2023-12-12, repository revision `9469f09`).
- **Licence:** the geoBoundaries project releases its derivative works under Creative Commons
  Attribution 4.0 International (CC BY 4.0) and asks users to "include the term 'geoBoundaries' with a
  link to https://www.geoboundaries.org" (`data/source/geo/ADM3/CITATION-AND-USE-geoBoundaries.txt`).
  The three ADM0 files carry their own source licence, ODbL 1.0 (OpenStreetMap; see 1.2).
- **Citation:** Runfola D, Anderson A, Baier H, Crittenden M, Dowker E, Fuhrig S, et al. (2020)
  geoBoundaries: A global database of political administrative boundaries. PLoS ONE 15(4): e0231866.
  https://doi.org/10.1371/journal.pone.0231866

### 1.5 Other bundled data

- **Opening map texture** (`src/ui/map/assets/opening/opening_map_portal.webp`): built from NOAA
  ETOPO 2022 relief plus Natural Earth coastline and river centrelines (`docs/PROJECT_LEDGER_ARCHIVE_2026Q3.md`,
  entry for the 2026-08-29 opening art). The repository records the sources but not their terms.
  Natural Earth publishes its data in the public domain; ETOPO 2022 is U.S. Government data from
  NOAA's National Centers for Environmental Information.
- **1990 municipality boundaries** (`data/source/boundaries/bih_adm3_1990.geojson`, 110 municipalities,
  and the files derived from it): origin not recorded.
- **1991 census of Bosnia and Herzegovina** (`data/source/bih_census_1991.json`, `master_census_clean.*`
  and derived files): official population figures. No licence record in the repository.
- **Historical sources** named on the Credits screen (Balkan Battlegrounds, ICTY records, UNPROFOR
  reports) inform the scenario data. Their texts are not bundled.

### 1.6 Audio

- **VSCO 2 Community Edition** recorded samples, used in the campaign suite, the menu theme, the
  opening titles and *What Remains of Home*. Licence: Creative Commons Zero (CC0 1.0). Recorded by
  Sam Gossner and Simon Dalzell; sample cutting Elan Hickler / Soundemote; Versilian Studios. Upright
  piano: Ivy Audio / Simon Dalzell, distributed by Versilian Studios. Pinned library:
  https://github.com/sgossner/VSCO-2-CE/tree/440300901dfe9275fd84e0b7763af1f8443ae62e. Licence text:
  `docs/audio/LICENSES/VSCO-2-CE-CC0.txt`; per-asset records: `docs/audio/LICENSES/` and
  `docs/audio/AUDIO_ASSET_PROVENANCE.json`.
- The compositions, interface cues and ambient beds are first-party works of the project
  (`docs/audio/LICENSES/`). The Kenney "Interface Sounds" pack (CC0 1.0) they replaced is retained in
  the repository for reference and is not loaded by the game.

### 1.7 Desktop runtime

The packaged app runs on Electron, which embeds Chromium and Node.js. Electron's own `LICENSE` and
`LICENSES.chromium.html` (the licences of Chromium's components) are distributed with Electron. The
Electron package version is listed in section 2.
