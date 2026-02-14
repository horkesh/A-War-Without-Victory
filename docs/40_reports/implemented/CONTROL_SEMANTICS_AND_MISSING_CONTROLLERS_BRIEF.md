# Control semantics and missing controllers — team brief

**Date:** 2026-02-06  
**Requested by:** User (orchestrator to troubleshoot with team)  
**Status:** Phase 1 and Phase 2 implemented; Process QA pending.

---

## 1. Clarification: control is settlement-level

**Requirement:** Control is defined at **settlement** level. Settlements can change owner (controller) **without** the whole municipality flipping. Municipalities are aggregates of settlements; a municipality can be “split” in control (some settlements RBiH, some RS) and individual settlements can flip independently.

**Canon / docs (implemented):**
- Canon: [Systems_Manual_v0_4_0.md § System 11](../10_canon/Systems_Manual_v0_4_0.md) — "Political control semantics" states that control is stored and simulated per settlement; municipality-level control is a derived view for display/aggregation only.
- Concepts: [docs_index.md](../00_start_here/docs_index.md) — "Political control" bullet under "Where to start" links to the above.

**Actions for the team:**
- **Game Designer:** Confirm canon and any rulebook wording that control is settlement-level; municipality is derived (e.g. majority) for display/aggregation only.
- **Documentation / UX:** Ensure all user-facing and engineering docs state that:
  - Political control is stored and simulated per **settlement** (`political_controllers[sid]`).
  - Municipality-level control (e.g. “who controls Lukavac”) is a **derived** view (e.g. majority of settlements in that municipality), not the source of truth.
- **Reporting / snapshots:** Control snapshots (e.g. `control_initial_vs_final.png`) and end reports should be clearly labeled as settlement-level control; avoid wording that implies “municipality flips” as the unit of change.

---

## 2. Missing controllers (e.g. post-1995 Bužim, formerly Cazin)

**Status (resolved):** Root cause was substrate vs state id: substrate uses 1990 municipality_id (10227 for Cazin) for Bužim polygons; state uses post-1995 mun_code in sid (11240:104108). Control snapshot now uses a fallback: when substrate sid is not in political_controllers, resolve by census_id (deterministic map from state keys) so Bužim and similar areas color correctly.

**Observed:** Some settlements appear with no controller set (e.g. in the control snapshot, or in data). Example: **Bužim** (post-1995 municipality; in 1990 it was part of **Cazin**). Those settlements should inherit the 1990 controller of the parent municipality (Cazin → RBiH).

**Likely causes (for the team to verify):**
1. **Settlement graph vs init path**
   - Scenario init uses `initializePoliticalControllersFromMun1990Only`: for each settlement it does `mapping[settlement.mun1990_id]`. So every settlement in the graph must have `mun1990_id` set to a key that exists in the scenario control file (e.g. `controllers_by_mun1990_id` with keys like `"cazin"`).
   - If the **settlement graph** is built from a source that uses **post-1995** municipality codes (e.g. Bužim = 11240), then `mun1990_id` on those settlements must be **resolved to 1990** (e.g. Cazin) before lookup. The remap exists: `data/source/municipality_post1995_to_mun1990.json` has `"11240": "Cazin"` in `index_by_post1995_code`.
2. **Where remap is applied**
   - `build_settlements_initial_master.ts` uses the remap: if `entry.mun1990_id` is empty or not in registry, it uses `remapIndex[entry.mun_code]` to get `mun1990_name` and normalizes to `mun1990Id`. So the **master** (settlements_initial_master.json) should have Bužim settlements with `mun1990_id = "cazin"` and `political_controller = "RBiH"` **if** they appear in `settlements_index_1990.json` with `mun_code = "11240"`.
   - The **scenario runner** loads `loadSettlementGraph()` which by default uses `data/source/settlements_initial_master.json`. So the graph should already have `mun1990_id` set from the master. If the master was built from an index that **does not list Bužim settlements**, they would not be in the graph at all (then we’d have 6101 settlements and no Bužim).
3. **Substrate vs state id mismatch**
   - The control snapshot uses `data/derived/settlements_substrate.geojson` (polygons) and matches by `municipality_id:census_id` to `political_controllers`. If the **substrate** uses a different id scheme (e.g. post-1995 municipality_id for Bužim) or has extra polygons not present in the simulation graph, those polygons would render with no controller (grey). So “missing controller” could be either:
     - **Simulation:** settlement in graph but no `political_controllers[sid]` (init bug).
     - **Visualization:** polygon sid not in `political_controllers` (id mismatch or substrate has more/different settlements).

**Actions for the team:**
- **Technical Architect / Data:** Trace end-to-end:
  1. Does `settlements_index_1990.json` (or the source used to build the master) include all settlements that today belong to Bužim (post-1995 code 11240)?
  2. For those, does the master build set `mun1990_id` to `"cazin"` via the remap?
  3. When the scenario runs with `init_control` = apr1995 file (mun1990-only), does `initializePoliticalControllersFromMun1990Only` see `mun1990_id = "cazin"` for Bužim settlements and assign RBiH?
- **Asset Integration / Map:** Confirm settlement id scheme in `settlements_substrate.geojson` (and any other map layers) vs `political_controllers` keys. If substrate uses post-1995 municipality_id in the sid, either (a) derive 1990-equivalent sid for lookup, or (b) ensure init writes controllers for the same sid form the substrate uses.
- **Game Designer:** If canon defines which settlements exist and how they map to 1990 opštine, document that; data pipeline should align.

---

## 3. Summary

| Issue | Owner(s) | Outcome needed |
|-------|----------|-----------------|
| Control is settlement-level; municipalities are derived | Game Designer, Docs, UX | Canon and docs state it; reports/snapshots labeled correctly |
| Missing controllers (e.g. Bužim) | Tech Architect, Data, Asset Integration | Root cause: index/master/remap or substrate id; fix so every settlement has a controller where canon requires it |

Once the above is agreed and fixes are in place, Process QA can be invoked per orchestrator workflow.
