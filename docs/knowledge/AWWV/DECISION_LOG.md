# AWWV Knowledge Base — Decision Log

One entry per explicit decision recovered from ChatGPT and/or Claude archives. Recovery-oriented; no invention.

| # | Decision | Source(s) | Rationale | Consequences | Superseded? |
|---|----------|------------|-----------|--------------|-------------|
| 1 | One game turn = one week | both | Engine Invariants; Phase A | Turn pipeline, meta.turn; no sub-turn | No |
| 2 | Determinism mandatory: no randomness, no timestamps in derived artifacts, stable ordering | both | Reproducibility, auditability | strictCompare; sorted keys; serialize byte-stable | No |
| 3 | Political control per-settlement; distinct from military presence; stable by default | both | Control ≠ legitimacy; rear zones; authority separate | Engine Invariants §9; initialization before fronts/AoR | No |
| 4 | Exhaustion monotonic, irreversible | both | Negative-sum; no “recovery” of exhaustion | Engine Invariants §8; never reduced | No |
| 5 | Settlement-first substrate; ~6,137 settlements; SVG-derived geometry; mun1990 = 110 | both | Canonical geography; registry restored | data/derived/settlements_substrate.geojson; municipalities_1990_registry_110.json | No |
| 6 | CASE C (v3 degree 0 vs Phase 1 degree > 0) is canonical, not a bug | chatgpt | Documented mismatch; no silent fixes | FORAWWV addendum; G3.5 quantification | No |
| 7 | NW coordinate ambiguity (Bihać, Cazin, Velika Kladuša, Bužim) resolved via legacy master-derived substrate | chatgpt | No heuristic offsets | Geometry correct in viewers | No |
| 8 | Bužim merged into Cazin (mun1990_id 10227); geometry preserved, ID remapped | chatgpt | Registry 110 | No further ID changes without migration | No |
| 9 | Corridor rights deprecated in treaty system; territorial annexes (transfer/recognize) used | chatgpt | Design simplification | Treaty system design (Bosnia War Simulation Design) | No |
| 10 | Population displacement: future; settlement + municipality level; turn-indexed overlays; geometry immutable; DO NOT implement yet | chatgpt | Locked constraint | Future layers; no viewer assumption of static population | No |
| 11 | Phase order fixed: directives → deployments → military_interaction → fragmentation_resolution → supply_resolution → political_effects → exhaustion_update → persistence | both | Phase A; determinism | turn_pipeline.ts; no reordering | No |
| 12 | Code must not contradict canon docs; code is wrong if it does | both | CANON.md | Validation; doc precedence | No |
| 13 | Mistake log and ledger mandatory; do not repeat past mistakes | both | context.md; Claude refactoring plan | ASSISTANT_MISTAKES.log; PROJECT_LEDGER; assertNoRepeat | No |
| 14 | Terrain scalars (H6.x) not consumed by simulation yet; H6.2 data-only | chatgpt | H6.7-PREP; non-goals | OSM/DEM snapshots; no scalar consumption | No |
| 15 | Peace ends the war; territorial clauses trigger peace → game ends | chatgpt | Design (Bosnia War Simulation Design) | state.end_state; war pipeline short-circuits | No |
| 16 | Denylisted derived-state keys: fronts, corridors, derived, cache — not serialized | claude / code | Engine Invariants §13.1 | validateGameStateShape; derived recomputed each turn | No |
| 17 | Every settlement assigned to exactly one brigade (implied by AoR coverage) | claude | Code review requirement from docs | Aligns with formation/AoR; not verbatim in invariants | No |

*Sources: chatgpt = ChatGPT raw; claude = Claude raw; both = both archives.*
