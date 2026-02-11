# Balkan Battlegrounds Knowledge Base Pipeline

## Purpose
Deterministically extract, normalize, and index canonical facts from:
- `docs/Balkan_BattlegroundsI.pdf`
- `docs/Balkan_BattlegroundsII.pdf`

All canonical facts must have page-level citations. Non-cited data is retained only in proposals.

## Pipeline Overview
1) Inventory and hash source PDFs.
2) Page-level extraction with layout blocks.
3) OCR fallback for noisy pages (deterministic threshold).
4) Map extraction and cataloging (images stored in-repo).
5) Candidate entity/fact detection with evidence spans.
6) Canonicalization and conflict grouping.
7) Deterministic indexing (facets, timeline, geography).

## Inputs
- PDFs: `docs/Balkan_BattlegroundsI.pdf`, `docs/Balkan_BattlegroundsII.pdf`
- Optional alias tables: `data/source/knowledge_base/balkan_battlegrounds/aliases.json`
- Optional stopword lists and known units/locations: `data/source/knowledge_base/balkan_battlegrounds/`

## Extraction Tooling
- **Primary:** Poppler CLI tools (`pdfinfo`, `pdftotext`, `pdftoppm`) if available.
- **Fallback:** `pdfjs-dist` + `@napi-rs/canvas` for text extraction and page rendering.

## Outputs (Deterministic)
All outputs under: `data/derived/knowledge_base/balkan_battlegrounds/`
- `pages/BB1_p####.json`, `pages/BB2_p####.json`
- `maps/BB1_p####.png`, `maps/BB2_p####.png`
- `map_catalog.json`
- `entities.json`, `events.json`, `facts.json`, `relationships.json`
- `index/` (facet, timeline, geo, alias indexes)

## Step-by-Step Details

### 1) Source Inventory
- Compute content hash for each PDF (stable, deterministic).
- Record `volume_id`, `hash`, `page_count`.

### 2) Page Extraction
- Extract `raw_text` and `layout_blocks` per page.
- Preserve page numbers; do not reflow across pages.
- Write page JSON immediately to `pages/`.

### 3) OCR Fallback (Conditional)
If page text is below deterministic thresholds (e.g., low character count or high non-letter ratio):
- Run OCR for that page only.
- Store both `raw_text` and `clean_text`.
- Set `ocr_applied=true` and record OCR confidence if available.

### 4) Map Extraction
- Detect map regions using page layout + keyword rules (e.g., "Map", "Figure", scale bars).
- Extract map images and store in `maps/` with deterministic filenames.
- Capture captions and map metadata into `map_catalog.json`.

### 5) Candidate Extraction
- Identify entity candidates (locations, units, persons) and event candidates.
- Extract date and numeric facts with evidence spans (page-level text quote).
- Store candidates in `facts_proposed.json` (non-canonical).

### 6) Canonicalization
- Resolve aliases to canonical IDs using alias tables.
- Normalize dates to ISO (with precision markers).
- Normalize quantities (units and categories).
- Promote only cited facts to canonical `facts.json`.
- Record conflicts by assigning a shared `conflict_group_id`.

### 7) Index Construction
- Build facet indexes (year, location, faction, event type, unit type, volume).
- Build timeline index sorted by ISO date + precision.
- Build geographic index using explicit coordinates only.
- Build alias index for deterministic lookup.

## Determinism Rules
- No timestamps in output.
- Stable ordering for all arrays and map entries (sorted by deterministic keys).
- No nondeterministic iteration over filesystem results.
- Canonical IDs are stable and content-derived.

## Data Integrity Rules
- Any canonical fact without a citation is invalid.
- If page reference is missing, retain only in `facts_proposed.json`.
- If extraction is ambiguous, set `unknown` and record a follow-up note (outside canon).

## Conflict Handling
- Conflicting values for the same subject/attribute remain as separate facts.
- Each conflicting fact includes its own citation.
- `conflict_group_id` is used to link conflicting facts.

## Map Storage Policy
- Map images are stored in-repo under `data/derived/knowledge_base/balkan_battlegrounds/maps/`.
- Map entries are indexed by volume, page, and caption keywords.

## Validation Checklist
- Every canonical fact has `volume_id` + `page_number`.
- `map_catalog.json` entries reference existing images.
- Running the pipeline twice yields byte-identical outputs.
