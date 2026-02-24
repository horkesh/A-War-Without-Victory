# Orchestrator: Four-Item Execution Summary (2026-02-22)

**Date:** 2026-02-22  
**Scope:** ZoC overlay, scenario validation, OSID front segment drawing, HoI map polish (agreed “what’s next” list).

---

## 1. ZoC overlay drawing — DONE

**Owner:** UI/UX Developer / Graphics Programmer (implemented this session.)

**Outcome:** Enemy Zone of Control is drawn on the HoI-style map when the ZoC layer is enabled.

**Implemented:**
- **HoIMapRenderer** (`src/ui/map/renderer/HoIMapRenderer.ts`):
  - Added `zoc: boolean` to `HoILayerVisibility` (default `false`).
  - Added `zocMeshes`, `enemyZocByFaction`, `buildZocLayer()`, `setEnemyZocByFaction(data)`.
  - ZoC layer: per-faction overlay from `phase_ii_enemy_zoc_by_faction` / `enemyZocByFaction`; each faction’s enemy-ZoC OSIDs drawn as subtle faction-colored fill (opacity 0.22) above the control layer.
- **MapModeToolbar:** ZoC button and F6 shortcut.
- **map_hoi.ts:** Passes `loaded.enemyZocByFaction` into the renderer (and pendingData when renderer not ready).

**Acceptance:** Load a save with Phase II and operational data; open HoI map; toggle ZoC (F6 or toolbar). OSIDs under enemy ZoC appear as a light faction-colored overlay. No engine or canon changes.

**Tactical map:** ZoC overlay on the 2D tactical map was not implemented; data is in `LoadedGameState.enemyZocByFaction`. Optional follow-up: add a layer toggle and fill settlements (e.g. via canonical→OSID mapping) for that view.

---

## 2. Scenario validation run — DONE

**Owner:** QA Engineer / Scenario-harness-engineer (run executed this session.)

**Outcome:** apr1992_definitive 20-week run with operational data and OSID/ZoC path completes; outputs are sane; no regressions observed.

**Executed:**
- Command: `npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_52w.json --weeks 20 --out data/derived/_test`
- Run ID: `apr1992_definitive_52w__08e0cea89bdf5835__w20`
- Outputs: `final_save.json`, `run_summary.json`, `activity_summary.json`, `weekly_report.jsonl`, `replay.jsonl`, etc.

**Verified:**
- `run_summary.json`: contains `phase_ii_attack_resolution` (e.g. `weeks_with_phase_ii: 20`), `front_corps_tracking` (corps_count 12, corps_front_edges_present true), all 8 anchor checks passed, `final_state_hash` present.
- Run completes without crash; Phase II and OSID path active.

**52w full run:** Not run this session. For full acceptance, run 52w (e.g. `--weeks 52`) and confirm `run_summary` and `final_save` as above; optional handoff to scenario-creator-runner-tester for historical check.

---

## 3. OSID front segment drawing on HoI map — HANDOFF

**Owner:** UI/UX Developer or Graphics Programmer.

**Goal:** Draw or expose assignable front segments on the HoI map when operational data is present. State already has `assignable_front_segments` from the engine (derived from canonical front_edges / hostile boundary).

**Acceptance criteria:**
- When `assignableFrontSegments` (from GameStateAdapter / loaded state) is non-empty and the HoI map is showing operational data:
  - Assignable front segments are visible (e.g. as line strips or ribbons along segment edges).
- Segment data: `AssignableFrontSegmentView[]` with `front_id`, `edge_ids`, `side_a`, `side_b`, `length_edges`, optional `name` / `theatre_id`.
- Geometry: segments are today derived from **canonical** front_edges (SID pairs). On the HoI map, either:
  - Resolve segment edges to world positions (e.g. SID or OSID centroids / shared borders from `operational_settlements.geojson` or shared-borders data), or
  - Reuse the tactical map’s approach: `orderBordersAsChain` + `chainedPointsForOrderedBorders` (MapApp) to get ordered points, then convert to HoI world coords for line/ribbon drawing.

**References:**
- `src/ui/map/MapApp.ts`: `assignableFrontSegments`, `orderBordersAsChain`, `chainedPointsForOrderedBorders`, drawing of assignable segment paths.
- `src/state/assignable_front_segments.ts`: `deriveAssignableFrontSegments`, segment shape.
- `src/ui/map/renderer/HoIMapRenderer.ts`: front ribbons (`frontRibbonMeshes`), `setFrontEdges`, world coords.

**No canon or engine changes required;** renderer-only using existing state.

---

## 4. HoI map polish — HANDOFF

**Owner:** UI/UX Developer (per prior planning docs).

**Goal:** UX/visual polish for the HoI-style map as specified in planning.

**References:**
- `docs/30_planning/20260221_settlement remapping and GUI rework/HOI_VISUAL_GUI_OVERHAUL_SPEC.md`
- `docs/30_planning/FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md`
- `docs/30_planning/BRIGADE_CORPS_ARMY_HOI_FRONTS_THEATRES_PROPOSAL.md`
- Napkin: “map_hoi: Class-based components…; Tooltips: 300ms delay…”; TACTICAL_MAP_SYSTEM §2 (map_hoi).

**Scope:** Visual and interaction polish only; no new mechanics or canon changes unless a role proposes and Orchestrator escalates.

---

## Summary table

| # | Item                      | Status   | Owner (handoff)        | Notes                                                |
|---|---------------------------|----------|------------------------|------------------------------------------------------|
| 1 | ZoC overlay drawing       | Done     | —                      | HoI map; F6/toolbar; renderer-only.                 |
| 2 | Scenario validation run   | Done     | —                      | 20w run verified; 52w optional for full acceptance. |
| 3 | OSID front segment drawing| Done     | —                      | Gold ribbons on HoI map; F3 Front Lines layer.      |
| 4 | HoI map polish            | Partial  | UI/UX                  | 300ms tooltip delay done; full spec remains handoff. |

**Blockers / deferrals:** None.

**Follow-up (same session):** Item 3 and 4 implemented. **Item 3:** HoIMapRenderer now has `setAssignableFrontSegments(segments)`; assignable front segments are drawn as gold ribbons (F3 Front Lines layer). **Item 4:** HoI map hover tooltip uses 300ms delay to avoid flicker (napkin). Full HOI_VISUAL_GUI_OVERHAUL_SPEC polish remains a larger handoff.

**Recommended next steps:**
- Optionally: run 52w scenario and delegate to scenario-creator-runner-tester for historical sanity check.
- Ledger: add an entry for ZoC overlay and for assignable front segment drawing on HoI map if desired.
