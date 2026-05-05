# LANE-V094-INSTALLER-BLOAT-TRIM — Installer Bloat Trim

**Date:** 2026-05-05
**Lane:** v0.9.5 P1-G4 follow-up — installer payload trim
**Status:** SHIPPED (PARTIAL — predecessor-pin-bound)

## Background

NSIS first-real-build shipped at 1338MB. Per audit, the win-unpacked output
contained ~650MB of clear-cut waste in `extraResources`:

| Path | Size | Classification |
|------|------|----------------|
| `data/derived/tiles/osm.pmtiles` | 438MB | RUNTIME — keep |
| `data/derived/municipalities_mun1990_viewer_v1.geojson` | 322MB | duplicate of `.gz` |
| `data/derived/municipalities_mun1990_viewer_v1.geojson.gz` | 33MB | runtime variant |
| `data/source/osm/bosnia-herzegovina-latest.osm.pbf` | 149MB | SOURCE RAW — exclude |
| `data/derived/_debug/geo_triangulation/*` | 291MB | DEBUG-ONLY — exclude |
| `data/derived/_debug/nw_provenance_overlay_bihac.geojson` | 22MB | DEBUG-ONLY — exclude |
| `assets/raw_sora/*.psd` | 30MB | PSD source — exclude |
| `data/source/historical data/Balkan_BattlegroundsI.pdf` | 21MB | RESEARCH PDF — exclude |

## Investigation

### Runtime data-fetch surface

`src/ui/map/data/DataLoader.ts` fetches only the raw `.geojson`/`.json`
forms — never `.geojson.gz`. The static HTTP server in
`src/desktop/electron-main.cjs` (lines 1064-1108) maps `/data/derived/*`,
`/data/source/*`, `/data/runs/*`, `/assets/*` to disk. There is no
gzip-decoding layer; the runtime consumes raw `.geojson` directly.

`scripts/repo/cleanup_audit.ts` flags both
`municipalities_mun1990_viewer_v1.geojson` AND its `.gz` companion as
ORPHAN_CANDIDATEs — neither is referenced by runtime code; both are
derivation by-products. Excluding both is safe.

### Predecessor contract test discovery

`tests/desktop_packaging_contract.test.ts` (lines 89-95) pins the
`data/derived` filter exactly to `['**/*']` and the full `[from, to]`
pair set. STRATEGY A (negative filters appended to the same filter
array) and STRATEGY B (whitelist replacement of the array) would both
break this contract test.

The lane spec mandates T7 GREEN on this predecessor test AND forbids
touching it (file ownership). The narrow viable vector is the
top-level electron-builder `build.files` exclusion field — it accepts
glob patterns that are applied across `extraResources` `from` paths.

Examining `node_modules/app-builder-lib/out/fileMatcher.js`:

- Each `extraResources` entry instantiates an independent `FileMatcher`.
  Top-level `build.files` patterns DO NOT cascade to extra-resource
  entries (line 237 — they get their own matcher with their own
  `pattern.filter`).
- `FileMatcher` uses `minimatch` and supports `!`-prefixed negation
  patterns within the same `filter` array (lines 176-186).

Therefore, exclusions must be added to the same `extraResources` entry's
own `filter` array. Top-level `build.files` cannot reach into
`extraResources` entries.

### Constraint analysis

Predecessor `desktop_packaging_contract.test.ts` (line 91-95) asserts
`startupSnapshotEntry.filter` is exactly `['**/*']`. Adding any
negative pattern to that filter array would break that test. The lane
forbids touching that test file.

Conclusion: the `data/derived/_debug/**` exclusion (~313MB) is OUT OF
SCOPE for this lane. It would require modifying the predecessor
contract test, which is forbidden by file ownership. Flagged as
remaining bloat candidate for follow-up.

The `data/source` and `assets` entries' filters are NOT pinned by the
predecessor contract. Their filter arrays may be tightened freely.
Only the `[from, to]` pair list is pinned (line 76-87).

### Runtime audit per data/source content

`data/source` static-served at runtime via electron-main.cjs route
`/data/source/*` (line 1097-1099). Bots and scenarios reference:
- `municipalities_1990_initial_political_controllers*.json` — runtime
- `oob_brigades.json`, `oob_corps.json` — runtime
- `master_census_clean.json`, `bih_census_1991.json` — runtime
- `municipality_political_controllers.json` — runtime

NOT runtime-needed:
- `osm/*.osm.pbf` (149MB) — used only by tile-build pipeline
- `historical data/*.pdf` (21MB+) — research source PDFs
- `*.zip` archives (settlements_pack.zip, master_municipalities.zip,
  bih_census_1991.zip) — source archives, not consumed at runtime
- `census-loader.ts`, `settlement.ts` — code, not runtime data
- `_inputs/`, `boundaries/`, `dem/`, `geo/` — build inputs

### assets/ runtime audit

`assets/` includes `crests/`, `flags/`, `ui/` (consumed at runtime by
warroom and tactical map). `raw_sora/` contains source PSDs from the
asset worker — not consumed at runtime.

CHECKPOINT: investigation complete; proceeding to implementation with
in-scope exclusions on `data/source` and `assets` only.

## Strategy

**STRATEGY A (per-entry filter exclusions, in-scope only).**

- `data/source` filter: prepend `**/*` (existing) then append negative
  globs to drop `.osm.pbf`, `.pdf`, `.zip`, `.ts`, build-only subtrees.
- `assets` filter: prepend `**/*` (existing) then append negative globs
  to drop `raw_sora/` and `*.psd`.
- `data/derived` filter remains `['**/*']` exactly — predecessor
  contract pin. Debug subtree exclusion deferred.
- Other entries (`dist/*`, `data/ui`) stay unchanged — small surface,
  no bloat.

Rationale: preserves T7 (predecessor contract test) while still
trimming ~200MB+ of in-scope bloat. Out-of-scope items
(`data/derived/_debug/**` ~313MB, `municipalities_mun1990_viewer_v1.geojson`
duplicate ~322MB) flagged as follow-up requiring contract test update.

## Implementation

`package.json` `build.extraResources` modified — only the two
unpinned entries (`data/source` and `assets`) gained negative-pattern
filters:

```jsonc
{
  "from": "data/source",
  "to": "data/source",
  "filter": [
    "**/*",
    "!**/*.pbf",          // raw OSM extract
    "!**/*.pdf",          // research source PDFs
    "!**/*.zip",          // source archives (have unzipped JSON companions)
    "!**/*.ts",           // census-loader.ts, settlement.ts (code, not data)
    "!osm/**",            // raw OSM tree
    "!historical data/**",// research PDF tree
    "!_inputs/**",        // pipeline input scratch
    "!dem/**",            // DEM raster (build-only, terrain pre-bake)
    "!geo/**"             // raw GAUL/PRIO geometry (derivation inputs)
  ]
},
{
  "from": "assets",
  "to": "assets",
  "filter": [
    "**/*",
    "!raw_sora/**",       // Photoshop source tree
    "!**/*.psd"           // Photoshop documents
  ]
}
```

Other entries (`dist/desktop`, `dist/tactical-map`, `dist/warroom`,
`data/derived`, `data/ui`) remain unchanged. The `data/derived` filter
literal pin `['**/*']` is preserved — predecessor contract honored.

### Runtime safety verification

Before excluding each path, runtime references were audited:

| Path / pattern | Excluded | Runtime audit |
|---|---|---|
| `data/source/osm/*.pbf` | yes | only build-pipeline tools/build/* references |
| `data/source/historical data/*.pdf` | yes | research PDFs; not fetched by `src/` code |
| `data/source/*.zip` | yes | unzipped `.json` companions exist in same dir |
| `data/source/*.ts` | yes | flagged as ORPHAN_CANDIDATE in cleanup_audit |
| `data/source/_inputs/` | yes | <1KB scratch dir |
| `data/source/dem/` | yes | DEM TIFF; only build pipeline (terrain pre-bake) |
| `data/source/geo/` | yes | raw GAUL/PRIO; derivation inputs only |
| `data/source/boundaries/` | NO (kept) | `bih_adm3_1990.geojson` referenced by tactical map style |
| `data/source/calibration/` | NO (kept) | `painted_control_jan1993.json` read by `anomaly_checks_extended.ts` |
| `assets/raw_sora/` | yes | Sora source tree; not imported by Vite |
| `assets/**/*.psd` | yes | Photoshop sources; not imported by Vite |
| `assets/crests/`, `assets/ui/` | NO (kept) | bundled into Vite output via `?url` imports |

## Tests

`tests/desktop_packaging_extraresources_filter.test.ts` — 7 tests:

- T1: data/source filter has bloat-exclusion patterns (≥5 negative).
- T2: data/source raw OSM PBF excluded (`osm/**` or `**/*.pbf`).
- T3: data/source historical-data PDFs excluded.
- T4: assets excludes `raw_sora/` and `**/*.psd`.
- T5: data/source archives (.zip) and code (.ts) excluded.
- T6: required runtime resources NOT blanket-excluded — pins
  `crests/`, `ui/`, `*.webp`, `boundaries/`, `calibration/`, JSON, and
  the `data/derived` `['**/*']` filter.
- T7: predecessor contract invariants ([from,to] pair list and
  `data/derived` filter pin) remain green.

## Verification

```
$ npx vitest run \
    tests/desktop_packaging_extraresources_filter.test.ts \
    tests/desktop_packaging_contract.test.ts \
    tests/desktop_packaging_targets.test.ts \
    tests/desktop_icon_contract.test.ts

 Test Files  4 passed (4)
      Tests  17 passed (17)
```

```
$ npx tsc --noEmit -p tsconfig.json
(no output, exit 0)
```

Per lane spec, did NOT run `npm run desktop:package:win:nsis` — sibling
Linux build lane may be using host resources.

### Estimated post-trim size

Measured raw on-disk sizes of excluded paths:

| Path | Bytes |
|---|---|
| `data/source/osm/` | 155,880,483 (155.9 MB) |
| `data/source/historical data/` | 62,453,030 (62.5 MB) |
| `data/source/dem/` | 40,335,556 (40.3 MB) |
| `data/source/geo/` | 3,596,577 (3.6 MB) |
| `data/source/_inputs/` | 409 (<1 KB) |
| `data/source/*.zip` (3 files) | 12,455,086 (12.5 MB) |
| `assets/raw_sora/` (incl. PSDs) | 80,640,107 (80.6 MB) |
| **Total in-scope trim** | **~355 MB** |

Pre-trim NSIS build: 1338 MB.
Estimated post-trim NSIS build: ~983 MB (1338 − 355).

The lane's stated goal of ~700 MB (650 MB cut) is partially met —
remaining ~283 MB lives in `data/derived/_debug/**` and the
`municipalities_mun1990_viewer_v1.geojson` duplicate, both blocked by
the predecessor `desktop_packaging_contract.test.ts` filter pin.

## Remaining bloat candidates (follow-up)

These were identified in the audit but cannot be excluded in this lane
without modifying `tests/desktop_packaging_contract.test.ts` (forbidden
by file ownership). They require a successor lane that owns BOTH the
config and the predecessor contract test:

1. **`data/derived/_debug/**` (~313 MB, audit estimated 291 MB).**
   Contains debug-only diagnostic outputs: `geo_triangulation/*`,
   `nw_provenance_overlay_bihac.geojson` (22MB), various audit JSON.
   No runtime consumer. Excluding requires modifying the
   `data/derived` filter beyond `['**/*']`.
2. **`data/derived/municipalities_mun1990_viewer_v1.geojson` (322 MB).**
   Flagged as ORPHAN_CANDIDATE by cleanup_audit.json (no inbound
   references). Its `.gz` companion (33 MB) is also orphaned.
   Excluding either requires modifying the `data/derived` filter.
3. **`data/derived/municipalities_viewer_v1.geojson`.** Listed in
   `data_index.json` with `path` and `path_gz` — runtime would prefer
   the raw `.geojson` (DataLoader.ts pattern). If runtime can be
   confirmed to never read it, exclude it too.

Recommended successor lane: `LANE-V094-INSTALLER-BLOAT-TRIM-PHASE-2`,
owning `package.json` AND `tests/desktop_packaging_contract.test.ts`,
revising the predecessor pin from `['**/*']` to an array containing
explicit `_debug/**` and viewer-duplicate exclusions. That should
recover the remaining ~635 MB and bring the installer to ~350 MB.

## Sensitive-history compliance

- Ring N/A — packaging configuration only. No sim path entered.
- No determinism / state path touched.
- No tests in `src/sim/`, `src/state/`, `src/scenario/` modified.

