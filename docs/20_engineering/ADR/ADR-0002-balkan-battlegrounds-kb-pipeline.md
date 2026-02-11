# ADR-0002: Balkan Battlegrounds knowledge base pipeline

## Status
Accepted

## Context
The project requires a deterministic, citation-backed knowledge base extracted from
`docs/Balkan_BattlegroundsI.pdf` and `docs/Balkan_BattlegroundsII.pdf`. This pipeline
must preserve page-level provenance, support conflict handling, and store extracted maps
in-repo for later review and indexing.

Canon references:
- Engine invariants: `docs/10_canon/Engine_Invariants_v0_5_0.md`
- Rulebook: `docs/10_canon/Rulebook_v0_5_0.md`
- Systems Manual: `docs/10_canon/Systems_Manual_v0_5_0.md`
- FORAWWV: `docs/FORAWWV.md` (no changes; referenced only if future insights emerge)

## Decision
Introduce a deterministic knowledge base pipeline as a new tool entrypoint:
- Script: `tools/knowledge_ingest/balkan_battlegrounds_kb.ts`
- Outputs: `data/derived/knowledge_base/balkan_battlegrounds/`
- Schema and workflow docs: `docs/knowledge/balkan_battlegrounds_kb_schema.md` and
  `docs/knowledge/balkan_battlegrounds_kb_pipeline.md`

The pipeline uses Poppler CLI tools (`pdfinfo`, `pdftotext`, `pdftoppm`) to extract
page-level text and map images deterministically. Map images are stored in-repo under
`data/derived/knowledge_base/balkan_battlegrounds/maps/`.

## Determinism Impact
- Stable ordering enforced for map catalog, proposed facts, and indexes.
- No timestamps or wall-clock values in outputs.
- Page-level extraction is deterministic for identical inputs and tool versions.
- Entry point documented in `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`.

## Consequences
- Adds a new canonical data pipeline and derived artifacts.
- Requires Poppler tools installed and on PATH for execution.
- Adds tests for index determinism and citation validation using fixture data.

## Canon References
- `docs/10_canon/Engine_Invariants_v0_5_0.md`
- `docs/10_canon/Rulebook_v0_5_0.md`
- `docs/10_canon/Systems_Manual_v0_5_0.md`
- `docs/FORAWWV.md`

## Ledger Entry
Record this ADR and pipeline outputs in `docs/PROJECT_LEDGER.md`.
