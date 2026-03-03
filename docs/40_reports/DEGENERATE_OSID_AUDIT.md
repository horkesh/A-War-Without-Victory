# Degenerate OSID Audit Report

**Generated**: 2026-03-03
**Threshold**: area < 0.01 km² (truly degenerate geometric artifacts)

## Summary

| Metric | Value |
|--------|-------|
| Truly degenerate OSIDs (< 0.01 km²) | 9 |
| Area range | 0.000 -- 0.009 km² |
| Zero-area OSIDs (point/collapsed) | 4 |
| Isolated (no contact-graph edges) | 9 / 9 (100%) |
| Cross-ethnicity merge warnings | 0 |
| Total population affected | 845 |

All 9 degenerate OSIDs are fully isolated in the operational contact graph (zero neighbors). They are unreachable by any movement or combat path — geometric artifacts from the Voronoi/topological merge pipeline. Every one has a same-municipality, same-ethnicity candidate for absorption.

An additional 25 OSIDs fall between 0.01--0.1 km² and are also graph-isolated. These may warrant future investigation but are not flagged as immediate merge candidates.

### Ethnicity key

- **B** = Bosniak plurality, **S** = Serb plurality, **C** = Croat plurality, **X** = no data / uninhabited

### Merge target selection criteria

1. Same municipality as source OSID
2. Same ethnic key preferred (all 9 matched without cross-ethnicity fallback)
3. Among same-ethnicity candidates, largest area selected

---

## Degenerate OSID Table (< 0.01 km²)

| # | OSID | Municipality | Settlement | Area (km²) | Population | Ethnic Key | Suggested Merge Target | Notes |
|---|------|-------------|------------|-------------|------------|------------|----------------------|-------|
| 1 | `op:cajnice:djakovici` | Čajniče | Đakovići | 0.000 | 233 | B | `op:cajnice:miljeno_2` (Miljeno, 71.3 km²) | Zero area |
| 2 | `op:gorazde:novakovici` | Goražde | Novakovići | 0.000 | 105 | B | `op:gorazde:ustipraca_2` (Ustiprača, 42.0 km²) | Zero area |
| 3 | `op:travnik:krusevo_brdo_i` | Travnik | Kruševo Brdo I | 0.000 | 0 | X | `op:travnik:cukle_2` (Cukle, 122.1 km²) | Zero area; uninhabited |
| 4 | `op:vares:pobilje` | Vareš | Pobilje | 0.000 | 34 | C | `op:vares:gornja_borovica_2` (G. Borovica, 85.5 km²) | Zero area |
| 5 | `op:gorazde:zorlaci` | Goražde | Zorlaci | 0.001 | 41 | B | `op:gorazde:ustipraca_2` (Ustiprača, 42.0 km²) | |
| 6 | `op:konjic:falanovo_brdo` | Konjic | Falanovo Brdo | 0.002 | 81 | C | `op:konjic:buturovic_polje_2` (B. Polje, 42.3 km²) | |
| 7 | `op:cajnice:metaljka` | Čajniče | Metaljka | 0.005 | 4 | S | `op:cajnice:zaborak` (Zaborak, 74.4 km²) | |
| 8 | `op:prijedor:alisici` | Prijedor | Ališići | 0.009 | 263 | B | `op:prijedor:ljubija_2` (Ljubija, 85.2 km²) | |
| 9 | `op:rudo:kosovici` | Rudo | Kosovići | 0.009 | 84 | B | `op:rudo:mrsovo_2` (Mrsovo, 146.3 km²) | |

---

## Distribution by Ethnic Key

| Ethnic Key | Count | Total Population |
|-----------|-------|-----------------|
| B (Bosniak) | 5 | 726 |
| S (Serb) | 1 | 4 |
| C (Croat) | 2 | 115 |
| X (No data) | 1 | 0 |

## Recommended Actions

1. **Merge all 9** into suggested targets via `data/source/merge_progress.json` (population transfer + OSID deletion). No cross-ethnicity conflicts.
2. **Validate** that none appear in OOB assignments (`hq_sid`), scenario `init_control`, or painted-target calibration data before merging.
3. **Re-derive** operational settlements, contact graph, and `osid_areas.json` after merge.
4. **Pipeline fix**: Investigate tessellation pipeline to prevent sub-0.01 km² fragments in future runs.

## Borderline OSIDs (0.01--0.1 km², for reference)

25 additional graph-isolated OSIDs exist in this range. Notable:

- `op:lukavac:gnojnica` — 3,093 pop in 0.051 km² (dense settlement fragment)
- `op:zepce:begov_han` — 1,041 pop in 0.010 km²
- `op:cazin:gornja_lucka` — 981 pop in 0.016 km²

These may warrant investigation but are not immediate merge candidates.
