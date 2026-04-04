# Runtime Asset Canonicalization

Date: 2026-04-04
Commit: e4445b2b

## Policy: WebP is canonical for live UI runtime

Live runtime already imported only `.webp` assets (confirmed by grep of `src/ui/`). This pass removes
residue and fixes tooling so the repo stops sending mixed signals.

## Changes

### Dead PNG twins deleted (11 files)

All from `src/ui/warroom/assets/`:
- `crest_ARBiH.png`
- `crest_HRHB.png`
- `crest_HVO.png`
- `crest_RBiH.png`
- `crest_RS.png`
- `crest_VRS.png`
- `flag_HRHB.png`
- `flag_RBiH.png`
- `flag_RS.png`
- `game start.png`
- `wall_map_frame_v1.png`

Each had a `.webp` twin that was already the live import. Zero code references to the deleted PNGs
in `src/` (only `src/_archived/` legacy references remain, which are correctly categorized as dead).

### Preserved unchanged
- `src/ui/warroom/assets/_old/` — archived old scene plates
- `src/ui/warroom/assets/raw_sora/` — raw/source art
- `src/ui/map/assets/crests/` — already pure WebP

### `vite.config.ts` MIME map fixed (`src/ui/warroom/vite.config.ts`)

Added `.webp: 'image/webp'` to the static file handler `types` record. Previously, WebP files served
through the dev server static handler received `application/octet-stream` instead of `image/webp`.

### `warroom_resize_assets.ts` header updated (`tools/ui/warroom_resize_assets.ts`)

Header rewritten to clarify:
- This tool is for the **art pipeline only** — it resizes source `.png` files to canonical 2752×1536
- Live runtime format is `.webp` — output PNGs must be converted separately before committing as live assets
- Usage examples updated to use `node_modules/.bin/tsx` (not `npx tsx`)

### Docs
- `VISUAL_ASSET_STRATEGY.md` — already WebP-aware throughout ("WebP format for all new assets (no PNG)"). No amendment needed.
- `PRODUCT_ARCHITECTURE_AUTHORITY.md` — silent on asset format policy. No change needed.

## Asset classification (canonical reference)

| Location | Format | Status |
|---|---|---|
| `src/ui/warroom/assets/*.webp` | WebP | Live runtime — canonical |
| `src/ui/map/assets/crests/*.webp` | WebP | Live runtime — canonical |
| `src/ui/warroom/assets/_old/*.png` | PNG | Archived — keep |
| `src/ui/warroom/assets/raw_sora/*.png` | PNG | Raw source art — keep |
| `src/ui/map/assets/officers/source/*.jpg` | JPEG | Raw source art — keep |

## Verification
- tsc: clean (0 errors)
- grep for deleted filenames in `src/`: 0 results in live code (`src/_archived/` references expected and acceptable)
- vitest: 6 files failed / 20 tests failed — confirmed pre-existing baseline (identical failure count on clean HEAD before our changes)
- desktop:map:build: PATH/batch issue in shell — unrelated to this change (Vite itself not on PATH in this bash session)
- governance: OK (no relevant changed files)
