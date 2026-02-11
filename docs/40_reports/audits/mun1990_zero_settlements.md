# Zero-settlement 1990 municipalities

This audit lists 1990 (pre-war) municipalities from the **canonical 110-opština registry** that have **no settlements** in the settlement index. Comparison uses a **single canonical key** (normalize_name). Municipality existence ≠ settlement presence. Zero-settlement municipalities are valid and must still exist in the logic layer.

## Counts

- **Total canonical (registry):** 110
- **Observed via settlements (distinct normalized keys):** 108
- **Missing (zero settlements):** 2

## Missing (stable sorted by mun1990_id)

- **Breza** — `breza`
- **Centar Sarajevo** — `centar_sarajevo`

## Diagnostic (format drift)

Top 10 raw `settlement.mun1990_id` values (stable sorted):

- `Banja Luka`
- `Bihać`
- `Bijeljina`
- `Bileća`
- `Bosanska Dubica`
- `Bosanska Gradiška`
- `Bosanska Kostajnica`
- `Bosanska Krupa`
- `Bosanski Brod`
- `Bosanski Novi`

Settlement mun1990_id values in sample look name-like (mixed case, spaces/diacritics).

## Phase 6D.5 remap correctness (post-check)

Deterministic checks on `municipality_post1995_to_mun1990.json`:

- **Ribnik as mun1990 target:** absent (OK) — post-1995 Ribnik contributes to Ključ.
- **Vogošća:** post1995_code `10928` → mun1990_name `Vogošća` (OK)

---

**Note:** Municipality existence ≠ settlement presence. Zero-settlement municipalities are valid and must still exist in logic layer.