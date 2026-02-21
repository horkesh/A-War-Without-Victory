# Paradox Team Convene: Tactical Sandbox 3D Map Implementation Plan

**Date:** 2026-02-20  
**Subject:** Full-team review of `docs/30_planning/TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md`  
**Goal:** Pushback and more elegant solutions; elevate latest GUI rework; identify mechanics to canonize; produce convene report before planning phase.  
**Orchestrator:** Convened Product Manager, Technical Architect, Game Designer, Gameplay Programmer, Formation Expert, UI/UX Developer, Graphics Programmer, Canon Compliance Reviewer, Systems Programmer.

---

## 1. Executive Summary

The plan describes replacing the 2D canvas tactical map with a Three.js-based 3D map, porting from the existing tactical sandbox prototype. The team **does not** blindly follow the plan: there is strong pushback on (1) mixing “3D view” and “canon mechanics” in one phase, (2) inlining sandbox code into MapApp, (3) using the sandbox’s 7-step pipeline for canonical state, and (4) treating sandbox UI (five right-side panels, SAVE/LOAD/RESET, region selector) as the main-game GUI.

**Agreed direction:**

- **3D integration:** Use a **separate 3D viewer component** sharing the same data contract (DataLoader, GameStateAdapter, LoadedGameState, IPC). Do **not** merge the full sandbox into MapApp. Main game: **single `runTurn` in main process**; 2D and 3D maps are **display-only** (render state, submit orders via IPC).
- **Phasing:** Split into **6A** (3D view only, optional 2D/3D toggle, parity with current canon), **6B** (canonize deploy/undeploy and movement-radius UI in spec + engine + IPC), **6C** (port those mechanics into 3D).
- **GUI authority:** Latest GUI rework (**TACTICAL_MAP_SYSTEM**, **warmap-figma-spec**, **IMPLEMENTED_WORK_CONSOLIDATED** §15–24) is **elevated above** any GUI recommendations in the plan. Main-game 3D must reuse the canonical layout (OOB 300px | viewport | single right panel 340px), toolbar, layer strip, theme, and shortcuts.
- **Canon mechanics:** Deploy/undeploy and movement rates (6 vs 3), movement radius as required UI, and multi-click move rules should be **canonized** in Phase II and Systems Manual; **movement through uncontrolled** and **pre-claim** remain **sandbox-only** unless canon is explicitly amended.
- **Sandbox = standalone:** The tactical sandbox is a **standalone system**. Exceptions to canon (pre-claim, BFS through uncontrolled, AoR expansion on deploy, 7-step pipeline, sandbox UI) are allowed for the sandbox alone; main game and canon are unchanged by those exceptions.
- **Single next step:** Decide and document (1) whether 3D is an **optional view** or **full replacement**, and (2) whether **canon mechanics** (deploy/undeploy, movement radius) are added **before** or **after** first 3D ship. Then update the plan and canon per this report.

**Detailed role assessments** (and where written):

- **Product Manager:** [PM_TACTICAL_SANDBOX_3D_MAP_ASSESSMENT_2026_02_20.md](PM_TACTICAL_SANDBOX_3D_MAP_ASSESSMENT_2026_02_20.md)
- **Technical Architect:** [TACTICAL_SANDBOX_3D_TECHNICAL_ARCHITECT_ASSESSMENT.md](TACTICAL_SANDBOX_3D_TECHNICAL_ARCHITECT_ASSESSMENT.md)
- **Game Designer:** [TACTICAL_SANDBOX_3D_MAP_GAME_DESIGNER_ASSESSMENT.md](TACTICAL_SANDBOX_3D_MAP_GAME_DESIGNER_ASSESSMENT.md)
- **Gameplay Programmer:** [TACTICAL_SANDBOX_3D_GAMEPLAY_PROGRAMMER_ASSESSMENT_2026_02_20.md](TACTICAL_SANDBOX_3D_GAMEPLAY_PROGRAMMER_ASSESSMENT_2026_02_20.md)
- **Formation Expert:** [FORMATION_EXPERT_TACTICAL_SANDBOX_CANONIZATION_2026_02_20.md](FORMATION_EXPERT_TACTICAL_SANDBOX_CANONIZATION_2026_02_20.md)
- **UI/UX Developer:** (see §5 below; full conflict table and checklist in subagent output)
- **Graphics Programmer:** [TACTICAL_SANDBOX_3D_GRAPHICS_PROGRAMMER_ASSESSMENT_2026_02_20.md](TACTICAL_SANDBOX_3D_GRAPHICS_PROGRAMMER_ASSESSMENT_2026_02_20.md) — if not present, see §6 below
- **Canon Compliance:** [TACTICAL_SANDBOX_3D_MAP_CANON_COMPLIANCE_REVIEW.md](TACTICAL_SANDBOX_3D_MAP_CANON_COMPLIANCE_REVIEW.md)
- **Systems Programmer:** (see §7 below)

---

## 2. Mechanics to Canonize (User-Requested)

| Mechanic | Team verdict | Action |
|----------|--------------|--------|
| **AoR reshaping** | Already canon (Phase II §5, §7.1; Systems Manual §2.1; IPC `stage-brigade-aor-order`). | No change. Ensure 3D has AoR transfer UI (same IPC / panel or equivalent). **Do not** canonize “AoR expansion on deploy” as a new step; keep sandbox-only (Formation Expert, Gameplay). |
| **Deploying / undeploying brigades** | Not in canon today. Plan maps to packed/unpacked. | **Canonize:** Add to Phase II + Systems Manual §6: states (Column/Combat or equivalent), 1-turn transitions (deploying/undeploying), movement rates 6 vs 3. Use **Column** and **Combat** as player-facing labels (Game Designer). Add IPC and pipeline step if first-class. |
| **Movement** | Settlement-level movement and pathfinding exist; “friendly-only” in code. | **Canonize:** Add explicit pathfinding rule (friendly-only) to Phase II and Systems Manual. **Do not** canonize pre-claim or BFS through uncontrolled; keep sandbox-only. Multi-click destination and contiguity (1–4 settlements, personnel cap) document as movement-destination rule. |
| **GUI — “how far you can move”** | Not in canon. | **Canonize as implementation-note / UX requirement:** TACTICAL_MAP_SYSTEM + DESKTOP_GUI_IPC_CONTRACT: show reachable settlements (or movement radius) when placing movement orders, using same BFS/rate rules as engine. |

---

## 3. Pushback and More Elegant Solutions

### 3.1 Scope and phasing (PM, Tech Architect)

- **Over-scope:** Section 6 mixes “port 3D” and “port sandbox mechanics.” Split into 6A (3D view only), 6B (canon mechanics in spec + engine), 6C (port mechanics to 3D).
- **Architecture:** Do **not** inline sandbox into MapApp. Use a **separate 3D viewer** with the **same data contract** (MapViewInput / LoadedGameState). Define a **turn contract** (state in/out); main game runs full pipeline in main process; maps are display-only.
- **Decision needed:** 3D = optional (2D/3D toggle) vs full replacement; document in plan or decision memo.

### 3.2 Pipeline and state (Gameplay, Systems)

- **7-step sandbox pipeline is not canon-equivalent.** Omitted: recruitment, reinforcement, displacement, consolidation, AoR validate/rebalance/contiguity/surrounded-reform, apply-municipality-orders, apply-aor-reshaping, HQ sync, encirclement, recon, etc. Do **not** use it for canonical saves or shared state.
- **Single advance:** One `runTurn` in main process; 2D and 3D only render and submit orders. Document the 7-step subset as “same engine, subset of steps, not canon” in plan or Systems Manual.
- **Determinism:** SliceData must be deterministic: sort **settlements by SID**, **edges by canonical edge id** after filter. Add sandbox determinism test: two advances from same cloned state + same sorted slice → identical report and state. **deploymentStates:** Prefer mapping to existing brigade_movement_state; if first-class, add one key and GAMESTATE_TOP_LEVEL_KEYS. **moveSelection:** UI-only, not in GameState.

### 3.3 Design (Game Designer, Formation Expert)

- **Labels:** Use **Column** and **Combat** (not “undeployed”/“deployed”) for player-facing posture to avoid clashing with canon movement state. Lock this before porting.
- **AoR expansion on deploy:** Keep sandbox-only; canon AoR comes from brigade_municipality_assignment and rebalance. If ever adopted, define as deliberate design change with interaction to rebalance/contiguity.
- **Front line teeth:** Sandbox “both settlements have brigade in AoR” is stricter than main map; document as optional FEBA rendering rule.

### 3.4 GUI (UI/UX)

- Plan §4.6–4.8 describe a **standalone sandbox** UI (five right panels, Region selector, SAVE/LOAD/RESET, AoR toggle). For **main game**, the **canonical** GUI is TACTICAL_MAP_SYSTEM + warmap-figma-spec + IMPLEMENTED §15–24: **single** right panel (settlement 5 tabs or formation panel), OOB 300px left, bottom layer toolbar, no dataset/load/save on map surface, campaign date on toolbar, AoR when formation selected (no separate toggle). Plan should state that main-game 3D **reuses this chrome** and that §4.6–4.7 apply to sandbox-only build.

### 3.5 Graphics (Graphics Programmer)

- **Scaling:** Heightmap **cropping** is mandatory; full 1024×1024 is not acceptable for full BiH. Overlay texture **rebuild on every state change** at 5,800 settlements is costly; Phase 2: partial rebake / dirty regions. NATO sprites: consider atlas + culling in Phase 2. **Picking:** O(n) centroid projection at 5,800 is a risk; use spatial index or LOD for full BiH.
- **Phase 1:** Document or fix MultiPolygon first-ring-only and text legibility. **Defer:** Fog of war, supply lines, movement animation.

---

## 4. Canon Update Checklist (After Team Agreement)

- **Phase II spec:** Add deploy/undeploy (states, 1-turn transitions, rates 6/3); add explicit pathfinding rule (friendly-only); movement 1–4 contiguous, personnel cap.
- **Systems Manual §6:** Deploy/undeploy subsection; settlement-level movement and path rule; optional 1–4 cap formula.
- **TACTICAL_MAP_SYSTEM:** Movement-order mode must show reachable set/radius per engine rules; add 3D render path subsection (cropping, overlay stack, picking note).
- **DESKTOP_GUI_IPC_CONTRACT:** Reachability validation (BFS, same rule as engine); deploy/undeploy IPC if canonized.
- **Plan doc:** State explicitly that movement pre-claim and BFS through uncontrolled are **sandbox-only**; main game remains friendly-only unless canon is changed.

---

## 5. UI/UX: Plan vs Canonical GUI (Summary)

- **Right panel:** Plan = SELECTION, ORDERS, BATTLE LOG, FORCES, SPAWN BRIGADE. **Canonical** = single panel: settlement (5 tabs) or formation (Chain of Command, posture, MOVE/ATTACK, Clear Orders); no separate BATTLE LOG/FORCES/SPAWN unless integrated into existing tabs/OOB.
- **Toolbar:** Plan = Region, ADVANCE TURN, Turn counter, SELECT/ATTACK/MOVE, AoR toggle, SAVE/LOAD/RESET. **Canonical** = Menu, zoom pill, −/+, Legend, Ethnic 1991, OOB, Search, Summary, Settings, Help, Recruit, **campaign date**; no region/dataset/load/save on map; AoR when formation selected (no toggle).
- **Layer controls:** Canonical = bottom floating `.tm-layer-toolbar` (Control, Front, Municipalities, Minimap, Formations); no Labels/AoR toggles.
- **3D compliance:** Same layout (OOB 300px | viewport | right 340px), same toolbar and layer strip, same theme (#0d0d1a, accent green, IBM Plex Mono), same shortcuts and accessibility; 3D viewport replaces canvas in the same DOM slot.

---

## 6. Graphics: Scaling and Doc Updates (Summary)

- **TACTICAL_MAP_SYSTEM:** Add “3D render path” subsection: reference plan §6.1, mandatory heightmap cropping, overlay stack, spatial index recommendation for full BiH.
- **Plan §6.3:** Add scaling note (cropping mandatory; full BiH = region-based or Phase 2 LOD/tiling). **§6.4:** Tag Phase 1 vs Defer (MultiPolygon/text = Phase 1; fog, supply, animation = Defer). Add “Phase 2 rendering”: partial overlay rebake, formation atlas + culling, spatial index for picking.

---

## 7. Systems: Determinism and Slice Ordering (Summary)

- **Edges:** Supply in **canonical order** to sandbox (e.g. sort by `a:b` with `a ≤ b` via strictCompare after filter).
- **Settlements:** After bbox filter, **sort by SID**. Build political_controllers from sorted SID set.
- **Engine Invariants:** When state/slice is built from a geographic subset, iteration order for settlements, edges, formations must be deterministic (SID, canonical edge id, formation ID).
- **DETERMINISM_TEST_MATRIX:** Add slice/sandbox row: settlements and edges sorted after filter; sandbox advance from same inputs → identical report and state; gate = unit test.

---

## 8. Proposed New Subagents

No role explicitly requested a **new** specialized subagent. Recommendation:

- **Optional:** If 3D map integration becomes a long-lived stream, consider a dedicated **tactical-3d-viewer** or **3d-map-integration** skill/owner (e.g. graphics-programmer + ui-ux-developer handoff) to own rendering, view contract, and TACTICAL_MAP_SYSTEM 3D subsection. Not required for the convene; can be added when moving to implementation planning.

---

## 9. Single Next Step and Handoff to Planning

**Single next step:** Product decision and doc update:

1. **3D role:** Optional view (2D/3D toggle) vs full replacement — document in plan or decision memo.
2. **Canon mechanics timing:** Deploy/undeploy and movement radius added to Phase II + Systems Manual + IPC **before** vs **after** first 3D ship — document and update plan phasing (6A / 6B / 6C) accordingly.

**Handoff to planning phase:** Use this convene report as the authority for (1) phasing, (2) GUI precedence, (3) mechanics to canonize and sandbox-only boundaries, (4) architecture (separate 3D viewer, turn contract, display-only maps), and (5) canon update checklist. The implementation plan in `docs/30_planning/TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md` should be revised to align with this report before detailed task breakdown.

---

## 10. Product Decisions (2026-02-20) — Plan Revised

After this convene, the product owner confirmed:

- **3D replaces 2D completely.** Staff Map remains for **2D snapshots**.
- **Canon mechanics or 3D:** Either order; **both** in the **same plan**, in **phases** (6A, 6B, 6C).
- **Sandbox:** Will **eventually be folded into the full game** for specialized scenario creation.
- **Undeployed movement radius:** **Composition-, roads-, and terrain-scalar–dependent.** Baseline preference **12** (6 is too few); range depends on **roads network** and **scalar scaling** (movement **slower uphill** and **across major rivers**; use settlements_terrain_scalars). **Team to work out details** (formula + cost model) and document in canon.

The plan doc has been **revised accordingly** (Product Decisions table, §4.2/4.3 movement, §6 scope, §7 Implementation Phases). Team to define **composition-dependent** formula, **roads-dependent** rule, and **terrain-scalar** cost model (slower uphill and across major rivers; use settlements_terrain_scalars) for Column movement range, and add to Phase II + Systems Manual.

**Front line visual (2026-02-20):** **Front line teeth** (toothed FEBA) are **removed** from scope. Replace with **contact-edge highlighting**: edges between settlements with friendly units (in AoR) and opposing settlements get a **red, glowing** boundary stroke (warning red e.g. `#ff4444`, soft glow). Document as contact-edge convention; if confused with RS faction color, use amber fallback.

---

*Paradox convene report 2026-02-20. Role assessments linked above; napkin and PROJECT_LEDGER to be updated per ledger discipline.*
