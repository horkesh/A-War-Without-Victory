# Orchestrator: 3D Map and Front Assignment Checklist — Gap and Status

**Date:** 2026-02-21  
**Trigger:** User: "What the hell happened to all of these" — checklist items from 3D map and front assignment; half missing; FRONT definition wrong; OG subfront / Front Hierarchy Panel / Docs–QA missing; 2D and 3D diverge; day mode still not default / night mode still on.  
**Purpose:** Single checklist so nothing is left out of the GUI redesign; canonical FRONT definition; 2D/3D single source; day-only default.

---

## 1. Canonical FRONT definition (user clarification)

- **FRONT is not** “where a brigade is present.”
- **FRONT is** where **two hostile settlements meet** (a boundary segment between enemy-controlled territory).
- **Then** you assign units to such fronts **after**:
  - Calculating the total length of that front segment,
  - Optionally naming it.
- So: derive front segments (hostile boundaries) → compute length / name → assign brigades/corps to those segments. Design and engine should align on this.

See also: [ORCHESTRATOR_FRONTS_AND_RESERVE_GAP_2026_02_21.md](ORCHESTRATOR_FRONTS_AND_RESERVE_GAP_2026_02_21.md) (assignable fronts, reserve rule, bot + GUI assignment).

---

## 2. Full checklist (3D map + front assignment)

Use this to ensure nothing is left out of the GUI redesign.

### 2.1 3D map implementation

| Item | Status | Notes |
|------|--------|--------|
| Operational 3D (terrain, faction overlay, formation sprites, front line mesh, municipality borders, city labels) | Done / Partial | Front line mesh uses canonical `front_edges` when present; fallback when absent. |
| F1–F4 modes (operations, supply, displacement, command) | Done | Map mode controller; command hierarchy panel. |
| Command hierarchy panel | Done | Exists; full three-tier + OG in one panel — see §2.4 D. |
| Fog of war, movement range and attack odds previews, battle replay markers | Done / Partial | Implemented per IMPLEMENTED_WORK_CONSOLIDATED. |
| PostFX/audio, day/night (N) | **Day-only now** | **Night mode disabled.** Day is default; N key removed; no night toggle. |
| Action: Front line mesh and layer use canonical `front_edges` when present; add corps-front and attack-axis UI | Partial | Mesh uses canonical edges; corps-front/attack-axis **staging** in corps panel (Stage Front, Stage Axis, Stage OG); full **draw/edit** corps fronts and attack-axis UI not complete. |
| Staff map (4th zoom): parchment, front lines, formation counters; same canonical front source as 2D/3D | Partial | Staff map exists; **same canonical front source** as 2D/3D must be verified (single source §3). |
| Tactical sandbox: separate flow; align with same front data and order contracts if it shows fronts | Backlog | Sandbox separate; alignment with same front data when showing fronts. |

### 2.2 Front assignment (Phases 1–6)

| Phase | Scope | Status | Notes |
|-------|--------|--------|--------|
| **Phase 1 (visual)** | `front_edges` and `front_pressure` in state and viewer; 3D `buildFrontLineMesh`; persist `front_edges`; 2D use them; visibility | Done | Persisted in GameState; 2D uses `frontEdges`; 3D uses save `front_edges`; visibility when canonical present. |
| **Phase 2 (drawable corps fronts)** | State and IPC for `corps_front_edges`; auto-distribution in turn pipeline; GUI draw/edit corps fronts and call IPC | Partial | State + IPC exist; Stage Front derives from AoR and stages; **draw/edit** corps fronts in GUI not full; headless does not get corps_front_edges unless pipeline/desktop path fixed. |
| **Phase 3 (offensive arrows)** | `corps_attack_axis_orders` → brigade orders; GUI set attack axis and call IPC | Partial | Stage Axis in corps panel; IPC; full attack-axis **draw/edit** UI not complete. |
| **Phase 4 (OG subfronts)** | `og_subfront_edges` and IPC; GUI define subfront and call IPC | Partial | Stage OG in corps panel; **OG subfront extent UI** (draw subfront) and full flow — see §2.4 D. |
| **Phase 5 (front width, overextension, pockets)** | Engine-only for now; GUI may show overextension/pocket warnings later | Backlog | Engine; GUI later. |
| **Phase 6 (holdout)** | Engine-only; no GUI redesign required for holdout itself | Done / Engine | Holdout in engine; no GUI change needed. |

### 2.3 D: OG subfront and polish (missing from prior consolidation)

| Item | Owner | Status |
|------|--------|--------|
| OG subfront **extent** UI | UX, GP, FE | **Missing** — define/draw subfront region in GUI. |
| **Front Hierarchy Panel** (full three-tier + OG in one panel) | UX, GP, FE | **Partial** — command hierarchy panel exists; full “Front Hierarchy” with Army → Corps → Brigades, OGs as children of Corps, click to focus map and show tier extent — align with FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL. |
| Layer/zoom alignment | UX, FE | Verify 2D/3D/staff map same front source and visibility across zooms. |

### 2.4 E: Docs and QA (missing from prior consolidation)

| Item | Owner | Status |
|------|--------|--------|
| Update **TACTICAL_MAP_SYSTEM**, **DESKTOP_GUI_IPC_CONTRACT** | TA, Documentation | **Done (2026-02-21)** — TACTICAL_MAP_SYSTEM §10.4 (front assignment, single source, day-only), §21.3 (verification/test plan); DESKTOP_GUI_IPC_CONTRACT state contract for front/theatres and cross-link. |
| Test plan and regression | QA | **Done (2026-02-21)** — Test plan in TACTICAL_MAP_SYSTEM §21.3. Automated verification: (1) Front assignment: node tests `ensureBrigadeFrontAssignments` / `isBrigadeAssignedToFront` and vitest `reserve brigades contribute zero pressure` pass; (2) 2D/3D parity: GameStateAdapter and ViewerStateAdapter both read `assignable_front_segments`, `brigade_front_assignment`, `front_edges` from same state (code + ui_map_game_state_adapter test); (3) Day default: 3D map is day-only (map_operational_3d comment, no N key). Scenario run (6w apr1992_definitive_52w): final_save contains `assignable_front_segments` and `brigade_front_assignment`; run_summary contains `front_corps_tracking: { corps_front_edges_present: true, corps_count: 9 }`. Manual GUI checks (assign in brigade panel, visual 2D/3D parity, day default) recommended when desktop available. |
| Canonical docs and sign-off | TA, QA, Documentation | **Outstanding** — canonical docs (Game Bible, Rulebook, Systems Manual) were updated in front system rebuild; formal sign-off process pending. |

**Checklist E verification (2026-02-21):** Automated runs: vitest (brigade_pressure reserve test, brigade_corps_front_assign); node tests (front_assignment ensureBrigadeFrontAssignments / repair); ui_map_game_state_adapter (frontEdges, brigadeFrontAssignment, assignableFrontSegments). Scenario: `--scenario data/scenarios/apr1992_definitive_52w.json --weeks 6 --out data/derived/_test` → run_summary has `front_corps_tracking`, final_save has `assignable_front_segments` and `brigade_front_assignment`. Manual: assign in brigade panel, 2D/3D visual parity, 3D day default — run when desktop available.

---

## 3. 2D and 3D diverge — single source required

**Requirement:** Single source of truth: **persisted `front_edges`** + adapter; **both 2D and 3D** read the same **LoadedGameState / ViewerSave**.

**Current:**  
- 2D: `MapApp` uses `parseGameState` → `LoadedGameState` (GameStateAdapter) with `frontEdges` from `state.front_edges`.  
- 3D: receives raw state via `push3DState` → `__awwv3dApplySave` → `toViewerSave(raw)` → `GameSave` with `front_edges` (ViewerStateAdapter).  
- Both adapters read `state.front_edges` from the same raw state when that state is the same (e.g. from desktop or file load).  

**Action:**  
- Ensure **all load paths** (file, IPC, advance turn) supply the **same** raw GameState to both 2D and 3D so both always see the same `front_edges`.  
- Document in TACTICAL_MAP_SYSTEM and DESKTOP_GUI_IPC_CONTRACT that 2D and 3D share one source (persisted `front_edges` + LoadedGameState/ViewerSave).  
- If any path (e.g. headless run, old save) omits `front_edges`, viewer derivation must be identical in both 2D and 3D (same fallback).

---

## 4. Day mode default; night mode off

- **Done (2026-02-21):** Day is the only mode. Night mode **disabled**: N key removed from 3D host; `WarMapRenderer.toggleMode()` / `setMode()` are no-ops (always day). Initial terrain opacities: day visible, night hidden.
- **Re-enable later:** Restore N key and blend logic when product requests night again.

---

## 5. What to do next

1. **Canon / design:** Formalize “front = boundary between two hostile settlements”; assign units to fronts after segment length (and optional naming). Align Game Bible/Rulebook and FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL with this.
2. **Engine:** Assignable fronts, reserve rule, persist `front_edges`; single pipeline so headless gets corps fronts where needed (see ORCHESTRATOR_FRONTS_AND_RESERVE_GAP).
3. **Single front source:** Persisted `front_edges` + adapter; 2D and 3D both use same LoadedGameState/ViewerSave; document and verify no divergence.
4. **GUI:** OG subfront extent UI; Front Hierarchy Panel (full three-tier + OG); corps-front and attack-axis draw/edit (not just stage); layer/zoom alignment.
5. **Docs and QA (E):** Update TACTICAL_MAP_SYSTEM, DESKTOP_GUI_IPC_CONTRACT; test plan and regression; canonical docs and sign-off.

Use **awwv-plan-change** (or equivalent) to break the above into ordered steps, owners, and ledger entries.

---

## 6. Continuity

- This convene: `docs/40_reports/convenes/ORCHESTRATOR_3D_MAP_FRONT_ASSIGNMENT_CHECKLIST_GAP_2026_02_21.md`
- Related: [ORCHESTRATOR_FRONTS_AND_RESERVE_GAP_2026_02_21.md](ORCHESTRATOR_FRONTS_AND_RESERVE_GAP_2026_02_21.md), [FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md](../../30_planning/FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md)
- Napkin: session note for checklist gap, FRONT definition, day-only, 2D/3D single source.
