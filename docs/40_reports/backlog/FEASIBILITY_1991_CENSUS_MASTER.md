# Feasibility Study: Clean 1991 Census Master

**Date:** 2026-02-07  
**Scope:** Short feasibility study per Option C (PARADOX_CENSUS_1991_MASTER_TEAM_CONVENE.md)  
**Status:** Draft for team review

---

## 1. Current State

### Census data flow

| Artifact | Role | Structure |
|----------|------|-----------|
| `bih_census_1991.json` | Source | Post-1995 municipality codes; settlements keyed by census_id; m = mun code (post-1995) |
| `municipality_post1995_to_mun1990.json` | Mapping | post1995_code → mun1990_name |
| `settlements_wgs84_1990.geojson` | Derived | Voronoi tessellation; mun1990_id; MERGE_INTO_NOVO_SARAJEVO_PAIRS merges duplicates |
| `census_rolled_up_wgs84.json` | Derived | by_sid; built from WGS84 GeoJSON |
| `settlement_names.json` | Derived | by_census_id; names from census |

### Post-war split municipalities (examples)

- **Sarajevo area:** Istočno Novo Sarajevo, Istočni Stari Grad, Istočna Ilidža, etc. → merge into Novo Sarajevo, Stari Grad Sarajevo, Ilidža.
- **Duplicate settlement names:** e.g. "Sarajevo Dio - Novo Sarajevo" exists as S170666 (Novo Sarajevo) and S209490 (Istočno Novo Sarajevo) in source census; we merge at Voronoi stage.
- **Other splits:** Milići → Vlasenica (H4.3); Oštra Luka / Sanski Most (same mun1990).

---

## 2. Proposed: 1991 Census Master

A **canonical 1991 census file** that:

1. Keys settlements by **mun1990_id + census_id** (or canonical SID) — 1990 opština semantics.
2. **Rolls up** post-1995 municipalities into 1990 opštine using existing `municipality_post1995_to_mun1990`.
3. **Resolves duplicate names** (e.g. Sarajevo Dio variants) into a single canonical entity per mun1990, with merge rules documented.
4. Is the **single source** for settlement metadata (name, population, ethnicity) for map and sim pipelines.

### Schema sketch

```json
{
  "role": "census_1991_master",
  "version": "1.0",
  "by_mun1990_id": {
    "novo_sarajevo": {
      "settlements": [
        { "sid": "S170666", "census_ids": ["170666", "209490"], "name": "Sarajevo Dio - Novo Sarajevo", "p": [90892, ...] }
      ]
    }
  },
  "by_sid": { "S170666": { "mun1990_id": "novo_sarajevo", "name": "...", "p": [...] } }
}
```

---

## 3. Feasibility Assessment

### Pros

- **Single source of truth** for 1991 settlement semantics; downstream pipelines simplify.
- **Duplicate-name handling** is centralized (merge rules in one place) instead of scattered (Voronoi, political control, etc.).
- **Clear 1990 opština semantics** — aligns with mun1990 registry, bih_adm3_1990, and game design.

### Cons / Risks

- **Merge rules** must be maintained (MERGE_INTO_NOVO_SARAJEVO_PAIRS, etc.) — moving them into the census master doesn’t remove the need; it consolidates.
- **Schema migration** — all consumers (census_rolled_up, settlement_names, political_control, attributes) would need to read from the master or a derived view.
- **Determinism** — merge and ordering must remain deterministic; audit trail for merged census_ids.

### Effort estimate (rough)

| Task | Effort |
|------|--------|
| Design schema + merge rule format | 0.5 d |
| Build derivation script (census → master) | 1–2 d |
| Refactor census_rolled_up, settlement_names to use master | 1 d |
| Update political_control, settlement_attributes | 0.5 d |
| Tests, validation, ledger | 0.5 d |
| **Total** | **3–4 d** |

---

## 4. Alternatives

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | Keep current flow; fix only rendering | Fast | Duplicate logic remains; no single source |
| B | Build master; full migration | Clean architecture | Higher effort; migration risk |
| C | Build master as parallel artifact; migrate incrementally | Lower risk; reversible | Two sources during transition |

---

## 5. Recommendation

- **Short term:** Rendering fixes (point-in-polygon hit test, Go to SID/name) — done.
- **Medium term:** Proceed with **Option C** — create `bih_census_1991_master.json` as a derived artifact; wire one consumer (e.g. census_rolled_up) to use it; migrate others incrementally.
- **Dependencies:** Merge rules (MERGE_INTO_NOVO_SARAJEVO_PAIRS, municipality overrides) must be codified in a single config or script consumed by the master derivation.

---

## 6. Open Questions

1. **Lukavica, Miljevići:** ~~User mentioned these as merge pairs; SIDs and census_ids not yet identified.~~ **Resolved:** Orchestrator scope includes these; Asset Integration to identify SIDs/census_ids and merge pairs as part of master build. Include in master design.
2. **settlement_names.json:** Should it be derived from the master (by_sid → name) or remain a separate join?
3. **ADR:** Does this require an Architecture Decision Record for the new canonical census layer?
