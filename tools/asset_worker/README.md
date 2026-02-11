# Asset Worker (Phase A1.0)

Local asset tooling for UI plates and sprites. This pipeline is **opt-in** and **separate from simulation**. It enforces deterministic postprocessing and stable manifest ordering.

## Canon + UI contracts
- `docs/UI_SYSTEMS_SPECIFICATION.md`
- `docs/UI_TEMPORAL_CONTRACT.md`
- `docs/SORA_ASSET_SPECIFICATION.md`
- `docs/PHOTOSHOP_TEMPLATE_SPECIFICATION.md`
- `docs/UI_DESIGNER_BRIEF.md`

## Folder structure
```
assets/
  raw_sora/          # raw Sora outputs (un-curated)
  sources/           # curated sources (truth)
    hq/
    props/
    crests/
    papers/
  derived/           # deterministic postprocessed outputs
    hq/
    props/
    crests/
    papers/
    atlases/
  manifests/
    assets_manifest.json
    assets_manifest.schema.json
```

## Scripts
```bash
npm run assets:ensure
npm run assets:post -- --family hq --trim --resize 1024x576
npm run assets:validate
npm run assets:mcp
```

## Manifest rules
- Stable ordering: `assets` sorted by `asset_id`, `derived_paths` sorted.
- Use **forward slashes** for paths.
- `source_path` lives under `assets/sources/<family>/` when curated.
- `raw_path` lives under `assets/raw_sora/` for uncurated assets.
- `derived_paths` lives under `assets/derived/`.
- No timestamps. Use version tags like `created_at: "v1"`.

## Determinism
- Postprocess uses fixed algorithms (no randomness).
- `assets:validate` checks hashes and deterministic ordering.
- Avoid any map/terrain pipeline execution from this tooling.

## Known gaps / notes
- Existing `assets/raw_sora/hq_base_stable_v1.png` is tracked as a **raw** asset. The Sora spec prefers a single **clean** base plate (no baked state). Do not change without explicit request.
- Atlas packing is intentionally stubbed (no atlas tool in Phase A1.0).

## MCP tool summary
- `asset_generate_image`: Writes manifest entry, generates PNG if `OPENAI_API_KEY` is set.
- `asset_postprocess_png`: Runs deterministic PNG postprocess.
- `asset_validate`: Validates manifest and files.
