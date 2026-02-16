# Tactical Map Viewer — Findings and Fixes (2026-02-13)

**Orchestrator:** Investigation of Political control layer, Ethnic 1991, Dataset: Latest run, and load-saves flows.

---

## 1. Summary

| Area | Finding | Fix |
|------|---------|-----|
| **Political control layer** | Checkbox toggles settlement fill visibility; when off, settlements render grey. Label "Political control" is correct; when Ethnic 1991 is on, the same layer shows ethnic fill (label could be "Settlement fill" for clarity but not required). | No code bug. Optional UX: rename to "Settlement fill" in a later pass. |
| **Ethnic 1991** | Toggle, legend, and tooltip correctly use `settlementFillMode` and `getMajorityEthnicity` (ethnicity from `settlement_ethnicity_data.json` or GeoJSON `majority_ethnicity`). | No code bug. |
| **Dataset: Latest run** | On fetch failure (e.g. no `latest_run_final_save.json`), dropdown was reverted to "baseline" but **control lookups and loaded game state were not reset**, so the map and OOB could show stale data. | Reset `activeControlLookup`/`activeStatusLookup` to baseline and call `state.clearGameState()` in catch. |
| **Load saves (general)** | Same failure-to-baseline gap for **Jan 1993** load. On **Load State** success, status bar was not cleared when a previous error had been shown. | Jan1993 catch: reset to baseline + clear state. On Load State success: clear status bar (textContent, hidden, remove error class). |

---

## 2. Root Causes

- **Latest run / Jan 1993 failure path:** Only the dropdown value was reverted; `activeControlLookup`, `activeStatusLookup`, and `loadedGameState` were left as-is, so the user saw "Baseline" in the dropdown but the previous dataset’s control and OOB.
- **Load State success:** Error message was written to `#status` and `classList` updated, but success path did not clear or hide the status bar, so old errors persisted.

---

## 3. Implemented Fixes (MapApp.ts)

1. **Latest run `catch` block**  
   - Set `activeControlLookup = { ...this.baselineControlLookup }`, `activeStatusLookup = { ...this.baselineStatusLookup }`.  
   - Call `this.state.clearGameState()` so OOB and formations reset.  
   - Keep `datasetEl.value = 'baseline'` and status message.

2. **Jan 1993 `catch` block**  
   - Same: reset control lookups to baseline and call `this.state.clearGameState()`.  
   - Set `datasetEl.value = 'baseline'` so UI and map stay in sync.

3. **Load State success**  
   - Clear status: `statusEl.textContent = ''`, `statusEl.classList.add('hidden')`, `statusEl.classList.remove('error')` (use a shared `clearStatusBar()` or inline where status is updated on success).

4. **Dataset success paths (Latest run, Jan 1993, Load State, sep1992, baseline)**  
   - Clear status bar so any prior error is removed (e.g. after successful Latest run load).

---

## 4. Handoff

- **Owner:** UI/Map (gameplay-programmer or ui-ux-developer).  
- **Files:** `src/ui/map/MapApp.ts` (dataset change handler, file input handler).  
- **Verification:** Run scenario with `--map`, open tactical map, select "Latest run" (should load); remove or rename `data/derived/latest_run_final_save.json`, select "Latest run" again — map and dropdown should show baseline, OOB empty. Load a state file, then load another — status bar should not retain old error.

---

## 5. References

- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` — data pipeline, dataset dropdown, layers.  
- `.agent/napkin.md` — Tactical map null-control, ethnic mode UX, army strength.  
- `src/ui/map/state/MapState.ts` — `clearGameState()`.
