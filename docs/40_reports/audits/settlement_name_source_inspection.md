# Settlement Name Source Inspection (Phase 6D.10)

**Date:** 2026-01-30  
**Scope:** Inspection only. No refactors, no behavior changes, no data regeneration.  
**Goal:** Identify where per-settlement names are stored (or confirm they are not).

---

## 1. `settlements_index_1990.json`

**Fields per settlement:** `sid`, `source_id`, `mun_code`, `mun`, `name`, `source_data` (with `id`, `mun_code`, `mun`, `name`, `d`), `mun1990_id`.

**Settlement-level name field?** Yes, `name` exists. In practice it is **always equal to `mun`** (or `mun1990_id` after remap). Every settlement in a municipality shares the same `name` (the municipality name). Example: all Banovici settlements have `name: "Banovici"`. There is **no** distinct per-settlement name; `name` is municipality-level.

---

## 2. `data/raw/map_kit_v1/map_data/bih_settlements_*.json`

**`bih_settlements_map_data.json`:** Each record has `id`, `mun_code`, `mun`, `name`, `d`. The `name` field is present but **always identical to `mun`**. No per-settlement name.

**`bih_settlements_municipality_index.json`:** Maps municipality name → array of numeric `id`s. No settlement names.

**Conclusion:** Raw map data contains **only municipality-level identifiers and names**. No settlement-level names.

---

## 3. `data/source/settlements/*.js` (e.g. `Breza_10189.js`)

**Contents:** JS defines `mun.push(R.path("...").data("munID", N))` per polygon. Each polygon has only:
- `munID` (numeric, e.g. 107743)
- `d` (SVG path string)

**Settlement name metadata?** **No.** Polygon definitions include **only** `munID` + geometry path `d`. Municipality name and code are inferred from the **filename** (e.g. `Breza_10189.js` → "Breza", "10189") in `build_raw_settlements_from_js.ts`. There is no per-settlement name in the JS sources.

---

## 4. Viewer `main.ts` (settlements_only_1990)

**Tooltip `name:` value:** The tooltip uses **only** `entry.name`:

```ts
const settlementName = (entry && typeof entry.name === 'string' && entry.name.trim() !== '')
  ? entry.name.trim()
  : '(unknown)';
tooltip.textContent = `SID: ${sid}\nname: ${settlementName}\n...`;
```

**Confirmed:** The viewer reads **`entry.name`** and nothing else. When `name` is missing or empty, it shows `(unknown)`. Because the index sets `name` to the municipality name for every settlement, the tooltip effectively shows **municipality names** only.

---

## 5. Census cross-check: `data/source/bih_census_1991.json`

**Structure:**  
- `metadata`: description, source, totals.  
- `municipalities`: keyed by municipality code (e.g. `"10014"`, `"20010"`). Each value has:
  - `n`: municipality name (e.g. "Banovići", "Banja Luka")
  - `s`: array of settlement IDs (e.g. `["100013","100021",...]`)
  - `p`: `[total, bosniak, croat, serb, other]` — **municipality-level** population totals

**SID → settlement name mapping?** **No.** The census provides **municipality-level** data only: municipality name (`n`), list of settlement IDs (`s`), and municipality demographics (`p`). There is **no** per-settlement name field. Keys are municipality codes; `s` lists numeric settlement IDs (compatible with `source_id` / `mun_code:source_id` SIDs), but no names are attached to those IDs.

**Conclusion:** Census does **not** contain SID → settlement name. It contains mun code → mun name + list of settlement IDs. Showing true settlement names **cannot** be done from the current census structure alone.

---

## Conclusion

**No true per-settlement names exist in the current map source.** Only municipality names are available.

- **Map pipeline:** JS → `build_raw_settlements_from_js` → `bih_settlements_map_data` → `build_map` → `settlements_index` / `settlements_index_1990`. Throughout, `name` is set to the municipality name (`mun`) so that the viewer shows something instead of "(unknown)".
- **Viewer:** Correctly displays `entry.name`; that value is the municipality name for every settlement.
- **Census:** No SID → settlement name map; only municipality names and settlement ID lists.

**Therefore:** Showing true per-settlement names (e.g. "Lukavica", "Cerici") in the settlements-only 1990 viewer **would require introducing a new authoritative data source** that provides SID (or equivalent) → settlement name. Likely options include:
- A dedicated **settlement names** dataset (e.g. extracted from `bih_settlements_1991.geojson`, `geography_settlements.geojson`, or similar GeoJSON that have `id` + `name` per feature), or
- **Census-derived** settlement names **only if** the census were extended or a separate table added with per-settlement names keyed by an ID compatible with `sid` / `source_id`.

---

## Summary

| Question | Answer |
|----------|--------|
| Fields in `settlements_index_1990`? | `sid`, `source_id`, `mun_code`, `mun`, `name`, `source_data`, `mun1990_id`. |
| Settlement-level `name` in index? | `name` exists but is always municipality name; no distinct per-settlement name. |
| Per-settlement name in raw `bih_settlements_*`? | No; only `mun`/`name` (municipality). |
| Per-settlement name in `settlements/*.js`? | No; only `munID` + path `d`. |
| What does viewer show as `name:`? | `entry.name` only; in practice the municipality name. |
| Census SID → settlement name? | No; census has municipality-level data only, no per-settlement names. |
| SID format match (census vs index)? | Census `s` IDs match `source_id`; but no names attached. |

**Explicit conclusion:** **No true settlement names exist in the current map source; only municipality names are available.** To show real settlement names, a new authoritative source (likely census-based or from another named GeoJSON) must be introduced and wired through.
