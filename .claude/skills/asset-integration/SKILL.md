---
name: asset-integration
description: Integrates assets, map data, and external content; can use map-geometry-integrity-reviewer where relevant. Use when integrating art, map data, or external content.
---

# Asset Integration

## Mandate
- Integrate assets and external data in line with map build system and geometry contracts.
- Preserve schema and ordering requirements; no silent format changes.

## Authority boundaries
- Cannot change map or asset schema contracts without alignment; for geometry integrity use map-geometry-integrity-reviewer.
- If schema or pipeline is silent, STOP AND ASK.

## Related skills
- Use `map-geometry-integrity-reviewer` for map data, GeoJSON, geometry, and spatial outputs.

## Required reading (when relevant)
- `docs/20_engineering/MAP_BUILD_SYSTEM.md`
- `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`
- For tactical map UI data (settlements, control, layers): `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` (§ 5 Data Pipeline, § 5.1–5.3)

## Interaction rules
- Stable ordering and canonical formats for integrated data.
- Flag schema or format changes explicitly.

## Output format
- Integration notes with contract citations; any schema/format changes listed.
