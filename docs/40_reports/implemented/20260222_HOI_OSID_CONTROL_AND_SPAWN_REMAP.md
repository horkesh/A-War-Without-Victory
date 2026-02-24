# HoI ZoC + Attack Resolution — Data/State Phase: OSID Control and Spawn Remap

**Date:** 2026-02-22  
**Scope:** Data/state only; no ZoC or attack resolution mechanics.  
**Canon:** Game Bible, Rulebook, Systems Manual, Phase II Spec, Engine Invariants already updated for location_osid and OSID control.

---

## 1. OSID control: where stored/derived and how

- **Stored:** Political control remains in `state.political_controllers` keyed by **SettlementId** (string). When the settlement graph is **operational** (operational_settlements.geojson), graph keys are OSIDs (`op:mun:cluster`), and `political_controllers` is keyed by the same IDs, so control is effectively **per OSID**. When the graph is **canonical** (S-prefix SIDs), control is per canonical settlement.
- **Derived (canonical → OSID):** `getPoliticalControllerOSID(state, osid, operationalToCanonical)` in `src/state/settlement_control.ts`:
  - If `state.political_controllers[osid]` is defined (operational graph), returns it.
  - Otherwise uses the **reverse map** (OSID → sorted list of canonical SIDs) and returns the **majority** controller among those SIDs (deterministic: faction order RBiH, RS, HRHB).
- **Single source:** Control is not duplicated. OSID-level view is either direct (operational graph) or derived via `getPoliticalControllerOSID` and the reverse map from `canonical_to_operational_map`.
- **Stable ordering:** Reverse map SIDs per OSID are sorted (`localeCompare`). Iteration over OSIDs uses `getOsidKeysSorted(data)` (sorted keys).

---

## 2. Where location_osid is set at formation creation (call sites)

| Call site | File | When |
|-----------|------|------|
| OOB corps/brigade creation | `oob_phase_i_entry.ts` | `createOobFormationsAtPhaseIEntry`: optional `canonicalToOperational`; sets `location_osid = resolveLocationOsid(hq_sid, map)` for each created formation. |
| OOB recruitment (bot) | `recruitment_engine.ts` | `runBotRecruitment`: options `canonicalToOperational`; corps and mandatory/elective brigades get `location_osid` from `resolveLocationOsid(hq_sid, map)`. |
| Single brigade recruitment | `recruitment_engine.ts` | `recruitBrigade`: optional `canonicalToOperational`; `buildRecruitedFormation(..., location_osid)`. |
| Emergent spawn (phase I) | `formation_spawn.ts` | `spawnFormationsFromPools`: options `canonicalToOperational`; each new formation gets `location_osid` from `resolveLocationOsid(hq_sid, map)`. |
| Initial formations load | `initial_formations_loader.ts` | Loads `location_osid` from JSON when present; otherwise **backfill** in scenario runner. |
| **Backfill** | `scenario_runner.ts` | After `initializeBrigadeAoR`, `backfillFormationLocationOsid(state, operationalData.canonicalToOperational)` runs once; sets `location_osid` for any formation with `hq_sid` but no `location_osid`. |

**Note:** Turn-pipeline and CLI calls to `spawnFormationsFromPools` do not yet pass `canonicalToOperational`; those formations get `location_osid` only if backfill is run later (e.g. on next scenario load) or when pipeline is given the map in a future change.

---

## 3. New state keys / types

- **FormationState.location_osid** (optional `SettlementId`): Operational settlement ID for HoI ZoC/spawn-by-OSID. Set at creation or backfilled.
- **GameState:** No new top-level keys. `political_controllers` remains the single source; OSID view is derived.
- **New module:** `src/data/operational_data.ts`:
  - `loadOperationalData(baseDir?)` → `{ canonicalToOperational, operationalToCanonical }`
  - `buildReverseMap`, `getOsidKeysSorted`, `resolveLocationOsid`, `backfillFormationLocationOsid`
  - Types: `OperationalSettlementId`, `CanonicalToOperationalMap`, `LoadedOperationalData`

---

## 4. Tests added/updated

- **New:** `tests/operational_data_osid.test.ts` (Vitest):
  - `resolveLocationOsid`: map value for SID, undefined for unknown, passthrough for `op:` prefix.
  - `buildReverseMap`: sorted SIDs per OSID.
  - `getOsidKeysSorted`: stable sorted OSID list.
  - `backfillFormationLocationOsid`: sets from `hq_sid`, skips when already set.
  - `loadOperationalData`: integration load and reverse map.
  - `getPoliticalControllerOSID`: direct OSID key, majority derivation from canonical SIDs, null when empty, determinism (same state → same result).
- **Vitest config:** `operational_data_osid.test.ts` added to `include` in `vitest.config.ts`.

---

## 5. canonical_to_operational_map and operational_contact_graph

- **canonical_to_operational_map:** Loaded in **one place**: `loadOperationalData()` in `src/data/operational_data.ts`. Used by scenario runner (try/catch; missing file is non-fatal), and passed as `canonicalToOperational` into OOB creation, recruitment, and backfill. **Stable ordering:** `buildReverseMap` sorts SIDs per OSID; `getOsidKeysSorted` returns sorted OSIDs for iteration.
- **operational_contact_graph:** Already loaded in `src/map/settlements.ts` (`loadSettlementGraph` default `edgesPath`) and in scenario runner when using operational geometry. No change to load path; iteration over edges uses the array order from JSON (deterministic if file is canonical). No new code iterates the graph by key; when needed, use sorted keys (e.g. from `getOsidKeysSorted` for OSID lists).

---

## 6. What remains for a later phase

- **Turn pipeline / CLI:** Pass `canonicalToOperational` into `spawnFormationsFromPools` when running from scenario/desktop so mid-run emergent formations get `location_osid` at creation.
- **ZoC / attack resolution:** Not in scope; engine phase next.
- **operational_political_control.json:** Used only by HoI map UI (`map_hoi.ts`); not used for sim control. Sim uses `political_controllers` + `getPoliticalControllerOSID` when OSID view is needed.
