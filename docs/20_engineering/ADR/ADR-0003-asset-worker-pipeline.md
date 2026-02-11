# ADR-0003: Asset Worker Pipeline (MCP + Postprocess)

## Status
Proposed

## Context
We need a local, opt-in asset pipeline for Warroom GUI assets that does not touch simulation determinism or canonical run entrypoints. This pipeline must satisfy UI asset contracts and determinism rules:
- Engine invariants: `docs/10_canon/Engine_Invariants_v0_5_0.md`
- Systems Manual: `docs/10_canon/Systems_Manual_v0_5_0.md`
- Rulebook: `docs/10_canon/Rulebook_v0_5_0.md`
- UI contracts: `docs/UI_SYSTEMS_SPECIFICATION.md`, `docs/UI_TEMPORAL_CONTRACT.md`, `docs/SORA_ASSET_SPECIFICATION.md`, `docs/PHOTOSHOP_TEMPLATE_SPECIFICATION.md`, `docs/UI_DESIGNER_BRIEF.md`

## Decision
Add a local asset worker pipeline with:
- Deterministic PNG postprocessing CLI and batch wrapper.
- Asset manifest + validation tool.
- MCP server exposing `asset_generate_image`, `asset_postprocess_png`, `asset_validate`.
- Warroom build staging script that copies required assets and data into `dist/warroom`.

New entrypoints:
- `tools/asset_worker/ensure_assets.ts` (npm `assets:ensure`)
- `tools/asset_worker/post/postprocess_assets.ts` (npm `assets:post`)
- `tools/asset_worker/validate/validate_assets.ts` (npm `assets:validate`)
- `tools/asset_worker/mcp/server.ts` (npm `assets:mcp`)
- `tools/ui/warroom_stage_assets.ts` (npm `warroom:build` post-step)

## Determinism Impact
- No simulation logic or canonical run entrypoints are modified.
- Asset manifest is written with stable ordering and no timestamps.
- Postprocessing uses fixed algorithms (nearest-neighbor resize, deterministic trim).
- Validation enforces stable ordering and hash integrity.

## Consequences
Positive:
- Isolated asset tooling that does not contaminate sim determinism.
- Repeatable postprocess + validation for UI assets.
Negative:
- Additional dependencies (`pngjs`, MCP SDK) and new entrypoints to maintain.

## Canon References
- `docs/CANON.md`
- `docs/10_canon/Engine_Invariants_v0_5_0.md`
- `docs/UI_SYSTEMS_SPECIFICATION.md`
- `docs/UI_TEMPORAL_CONTRACT.md`
- `docs/SORA_ASSET_SPECIFICATION.md`
- `docs/PHOTOSHOP_TEMPLATE_SPECIFICATION.md`
- `docs/UI_DESIGNER_BRIEF.md`

## Ledger Entry
Add a line to `docs/PROJECT_LEDGER.md` with the ADR link.
