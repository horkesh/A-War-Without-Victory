# Balkan Battlegrounds Knowledge Base Schema (BB-KB)

## Scope
This schema defines the canonical, citation-backed knowledge base derived exclusively from:
- `docs/Balkan_BattlegroundsI.pdf` (BB1)
- `docs/Balkan_BattlegroundsII.pdf` (BB2)

All canonical facts MUST cite at least one page (volume + page number). Facts without page references remain non-canonical.

## Canonical Object Model

### 1) SourcePage
**Purpose:** Preserve page-level provenance and text for citations.

**Required fields:**
- `volume_id` (string): `BB1` or `BB2`
- `page_number` (number): 1-based integer
- `raw_text` (string): original text extract
- `clean_text` (string): normalized text if OCR/cleanup applied
- `ocr_applied` (boolean)
- `text_hash` (string): stable hash of raw_text
- `clean_text_hash` (string): stable hash of clean_text

**Optional fields:**
- `layout_blocks` (array)
- `tables` (array)
- `figures` (array)
- `map_regions` (array)
- `notes` (array)

### 2) Location
**Purpose:** Canonical location identity (town, region, front area, etc.).

**Required fields:**
- `location_id` (string)
- `name` (string)
- `type` (string): `city`, `town`, `village`, `region`, `front`, `facility`, `unknown`
- `admin_area` (string | `unknown`)
- `sources` (array of SourceRef)

**Optional fields:**
- `aliases` (string[])
- `coords` (object | `unknown`): `{ lat, lon }` if explicitly stated

### 3) Unit
**Purpose:** Canonical unit identity.

**Required fields:**
- `unit_id` (string)
- `name` (string)
- `faction` (string): as stated in source
- `type` (string): `brigade`, `corps`, `army`, `paramilitary`, `police`, `unknown`
- `sources` (array of SourceRef)

**Optional fields:**
- `parent_unit_id` (string | `unknown`)
- `activation_date` (string | `unknown`)
- `deactivation_date` (string | `unknown`)
- `aliases` (string[])

### 4) Person
**Purpose:** Canonical person identity (commanders, leaders).

**Required fields:**
- `person_id` (string)
- `name` (string)
- `role` (string | `unknown`)
- `affiliation` (string | `unknown`)
- `sources` (array of SourceRef)

### 5) Event
**Purpose:** Canonical events (battles, operations, negotiations, offensives).

**Required fields:**
- `event_id` (string)
- `name` (string)
- `event_type` (string): `battle`, `operation`, `offensive`, `ceasefire`, `negotiation`, `other`
- `start_date` (string | `unknown`)
- `end_date` (string | `unknown`)
- `date_precision` (string): `day`, `month`, `year`, `unknown`
- `locations` (string[] of location_id)
- `units_involved` (string[] of unit_id)
- `sources` (array of SourceRef)

**Optional fields:**
- `outcome` (string | `unknown`)
- `summary` (string | `unknown`)

### 6) Map
**Purpose:** Catalog extracted maps and their captions.

**Required fields:**
- `map_id` (string)
- `volume_id` (string)
- `page_number` (number)
- `caption` (string | `unknown`)
- `image_path` (string)
- `sources` (array of SourceRef)

**Optional fields:**
- `linked_locations` (string[] of location_id)
- `linked_events` (string[] of event_id)
- `scale_text` (string | `unknown`)
- `legend_text` (string | `unknown`)

### 7) Fact
**Purpose:** Normalized, citation-backed statements about entities/events.

**Required fields:**
- `fact_id` (string)
- `fact_type` (string): `casualties`, `force_size`, `equipment`, `displacement`, `control`, `timeline`, `other`
- `subject_id` (string): entity/event ID
- `object_id` (string | `unknown`)
- `value` (number | string | `unknown`)
- `unit` (string | `unknown`)
- `date` (string | `unknown`)
- `date_precision` (string): `day`, `month`, `year`, `unknown`
- `sources` (array of SourceRef)
- `quote` (string): direct quotation from source

**Optional fields:**
- `confidence` (string): `high`, `medium`, `low`
- `conflict_group_id` (string | `null`)
- `notes` (string | `unknown`)

### 8) Relationship
**Purpose:** Canonical links between entities and events.

**Required fields:**
- `relationship_id` (string)
- `relationship_type` (string): `participated_in`, `commanded`, `located_in`, `part_of`, `depicts`
- `from_id` (string)
- `to_id` (string)
- `sources` (array of SourceRef)

## SourceRef (Provenance)
**Required fields:**
- `volume_id` (string): `BB1` or `BB2`
- `page_number` (number)
- `evidence_span` (string): exact quoted text span

**Optional fields:**
- `block_type` (string): `narrative`, `table`, `map_caption`, `footnote`, `unknown`
- `offsets` (object): `{ start, end }` if available

## Canonical ID Rules
- IDs are deterministic and stable: no timestamps or random values.
- Recommended format: `bb_<type>_<normalized_name_or_hash>`.
- When ambiguity exists, include a short, stable hash suffix.

## Conflict & Uncertainty
- If multiple cited values conflict, create separate Fact records and set a shared `conflict_group_id`.
- If data is unclear or absent, use `unknown` and record a `followup` note outside canonical facts.
- Do not promote a fact to canonical without a citation.

## Quote vs Fact Separation
- `quote` is verbatim text from the page.
- `value` and normalized fields are derived from the quote.
- Quotes and normalized facts must point to the same `sources` record.
