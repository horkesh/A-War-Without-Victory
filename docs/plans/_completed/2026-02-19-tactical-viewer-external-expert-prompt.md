# Tactical Sandbox Viewer — Prompt for External Expert

**Date:** 2026-02-19  
**Purpose:** Brief an external expert to build a **small tactical viewer** (HTML) for testing brigade recruitment, composition, movement, combat, and planning on a **small portion of the map** only.  
**Status:** Planning only; implementation will be done by the external expert.

---

## 1. Objective

Build a standalone **tactical sandbox viewer** in HTML/JS (or TS) that:

- Uses **only a small portion of the map** (e.g. 20–80 settlements in one region), not the full ~5,800 settlements.
- Allows **full tactical play in that slice**: recruit brigades, change their composition, move them, issue attack orders, resolve battles, and use planning controls (posture, AoR transfer, corps stance, etc.).
- Serves as a **test harness** for tuning and debugging without loading the full map and full game state.

The viewer does **not** need to integrate with the desktop Electron app or the main tactical map. It can be a separate HTML page (e.g. opened from `npm run dev:map` or a simple static server) that loads **subset data** and either:

- **Option A:** Calls into the existing engine (e.g. bundled sim + battle resolution + recruitment) with a **sliced** game state and settlement graph, or  
- **Option B:** Implements a **minimal, deterministic** resolver for the slice (recruitment, movement, battle, control flip) that matches the engine’s contracts so results can be compared or later swapped for the full engine.

**STOP AND ASK** if it’s unclear whether the expert should aim for Option A (reuse engine) or Option B (minimal resolver). The codebase has a full turn pipeline and battle resolution in TypeScript; Option A is preferred if the bundle size and dependency surface are acceptable for a browser-only viewer.

---

## 2. Core Features (Required)

| Feature | Description |
|--------|-------------|
| **Small map region** | Single region: subset of settlements (e.g. by bbox or by list of settlement IDs). Subset GeoJSON (polygons), subset `settlement_edges.json` (only edges between included settlements), subset political control. No full BiH map. |
| **Recruit brigades** | From a catalog (or minimal OOB slice): choose brigade, choose equipment class (e.g. mechanized, motorized, mountain, light_infantry, garrison, police, special). Costs: capital (C), equipment (E), manpower (M). Placement: HQ at a faction-controlled settlement in the brigade’s home municipality (if in slice) or first valid settlement in slice. |
| **Change composition** | Edit brigade composition (personnel, infantry, tanks, artillery, aa_systems) within engine bounds (e.g. MIN_BRIGADE_SPAWN, MAX_BRIGADE_PERSONNEL, equipment condition). Useful for testing battle outcomes and reinforcement. |
| **Move brigades** | Municipality-level move orders (`brigade_mun_orders`) and/or settlement-level movement (`brigade_movement_orders`: 1–4 contiguous same-faction settlements). Validate against the **slice graph** (adjacency only within the small map). **Load up (mechanic):** brigade can contract to single-settlement AoR and then move further per turn than in battle formation; after movement, brigade unfolds at destination. (Canon silent on this—see §3.1.) |
| **Fight (resolve battles)** | Issue attack orders (brigade → target settlement). Resolve battles: attacker power vs defender (garrison + militia if no brigade), terrain modifiers, casualties, control flip when attacker wins (power ratio ≥ threshold). Must be **deterministic**: same orders + same state → same outcome. |
| **Planning controls** | Stage and display: **attack orders**, **move orders**, **posture** (defend / probe / attack / elastic), **AoR transfer** (settlement from brigade A to brigade B, same faction, contiguity preserved), **corps stance** (defensive / balanced / offensive / reorganize) if corps exist in slice. “Apply” or “Advance turn” runs resolution (movement, battles, control updates, optional reinforcement). |

---

## 3. Additional Useful Features

- **Turn advance** — Single “Advance turn” button that runs (in order): movement application, attack resolution (battles), control flips, optional reinforcement/WIA trickleback so the sandbox stays consistent with the main engine’s phase order.
- **Load / save state** — Save and reload minimal state (formations, political_controllers, brigade_aor, orders, recruitment_state, turn, phase) as JSON so tests are reproducible.
- **Reset / New scenario** — Start from a predefined slice scenario (e.g. 2 factions, 3 settlements each, 2 brigades) without loading full scenario files.
- **Battle log** — After resolution, show a short log: which battles ran, attacker/defender strength, casualties, control changes.
- **Determinism check** — Optional “Run twice” that advances two copies of state and compares results (same hash or same key fields).
- **Terrain in slice** — If the full map has `settlement_terrain_scalars` or equivalent (elevation, slope, river, urban), a subset for the slice improves battle realism; optional.
- **Minimap or region selector** — If the small map is defined by bbox, show where the slice sits in BiH (tiny overview) or allow picking another region (list of predefined regions).

### 3.1 Load up for movement — canon status

**Canon is silent** on this mechanic. The Systems Manual and Phase II Specification describe municipality/settlement movement and AoR reshape but do **not** define: (a) a "load up" action that contracts a brigade to a single-settlement AoR, or (b) different movement range for "loaded" vs "battle formation" (spread AoR). The **main engine** implements a pack → in_transit → unpack cycle (`src/sim/phase_ii/brigade_movement.ts`) with a fixed movement rate (e.g. 3 settlements per turn); it does not tie movement range to whether the brigade is contracted to one settlement. The sandbox viewer may implement **load up / unfold** as an **experimental mechanic** for playtesting. If the design is validated, it would require **canonization** (design doc, Systems Manual / Phase II update) before adoption in the main engine. Expert should **STOP AND ASK** if asked to align the sandbox with current canon on movement (no extended range when loaded).

- **Load up / unfold:** Implement as the mechanic in §3.1 and the Move brigades table (contract to single AoR → move further → unfold at destination). UI may show packed/unfolded state when implementing that mechanic. 

---

## 4. Data Contracts (Minimal)

The viewer should consume **subset data** only:

| Data | Description |
|------|-------------|
| **Settlements** | GeoJSON (or JSON) with polygon + properties: `sid`, `name`, `pop`, `nato_class`, `municipality_id` or `mun1990_id`. Only settlements in the chosen slice. |
| **Edges** | List of `{ a: string, b: string }` SIDs; only pairs where both `a` and `b` are in the slice. |
| **Political control** | `by_settlement_id: Record<string, string \| null>` for slice SIDs only (faction IDs: RBiH, RS, HRHB). |
| **Game state (minimal)** | Formations (id, faction, kind, personnel, equipment_state/composition, hq_sid, corps_id, posture, brigade_aor subset), political_controllers (slice only), brigade_attack_orders, brigade_mun_orders, brigade_movement_orders, brigade_aor_orders, brigade_posture_orders, recruitment_state (capital, equipment, pools for slice muns), turn, meta.phase. |
| **OOB / catalog (slice)** | Brigades that have home municipality in the slice (or a minimal list for testing). |

Existing full data can be **sliced** by a build step or script (e.g. filter `settlements_a1_viewer.geojson` by bbox or by list of SIDs; filter `settlement_edges.json`; filter political control and state to slice SIDs). The expert can assume such subset files exist or implement a simple slicer.

**Canon types:** Formation state, equipment classes, and battle constants are defined in:

- `src/state/game_state.ts` (FormationState, BrigadeComposition, brigade_aor, orders)
- `src/state/recruitment_types.ts` (EquipmentClass, EQUIPMENT_CLASS_TEMPLATES)
- `src/sim/phase_ii/battle_resolution.ts` (resolveBattleOrders inputs/outputs; constants)
- `src/sim/phase_ii/resolve_attack_orders.ts` (how attack orders are turned into battles)

---

## 5. Constraints (Non-Negotiable)

- **Determinism:** No `Math.random()`, no `Date.now()` in resolution logic. Sorted iteration over formations, settlements, edges. Same inputs → same outputs.
- **Stable ordering:** Any collection that affects resolution or UI (e.g. formation list, settlement list) must be ordered (e.g. by ID) so replay and regression tests are stable.
- **Canon precedence:** If the expert needs a rule (e.g. victory threshold, casualty fractions), use the engine’s constants and types; do not invent new mechanics. Reference: `docs/10_canon/Systems_Manual_v0_5_0.md`, `docs/10_canon/Phase_II_Specification_v0_5_0.md`.
- **No edit of FORAWWV.md:** Do not change project guidance documents; only build the viewer and any slice-data scripts.

---

## 6. References in This Repo

| Topic | Location |
|-------|----------|
| Tactical map architecture, data pipeline, state | `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` |
| Desktop IPC (orders, recruitment, advance) | `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md` |
| Game state types, formations, AoR, orders | `src/state/game_state.ts` |
| Battle resolution API and constants | `src/sim/phase_ii/battle_resolution.ts`, `src/sim/phase_ii/resolve_attack_orders.ts` |
| Recruitment (catalog, costs, composition) | `src/sim/recruitment_engine.ts`, `src/state/recruitment_types.ts` |
| Turn pipeline (order of steps) | `src/state/turn_pipeline.ts` (Phase II steps) |
| Map projection, coordinates | `src/ui/map/geo/MapProjection.ts`, TACTICAL_MAP_SYSTEM.md §6 |
| Faction colors / NATO tokens | `src/map/nato_tokens.ts` |

---

## 7. Deliverables (Suggested)

1. **HTML + JS/TS viewer** that loads slice data and runs recruit / compose / move / fight / plan / advance.
2. **Slice data** for one or two regions (e.g. Sarajevo environs, or a small front of 30–50 settlements), or a script to produce slice GeoJSON + edges + control from full data.
3. **Short README** for the viewer: how to run, how to add a new region, how load/save and determinism work.

---

## 8. STOP AND ASK Clauses for the Expert

- If **canon** is silent on a needed rule (e.g. edge case in movement validation): STOP AND ASK with options and risks.
- If **reusing the full engine** in the browser is blocked by Node-only deps or bundle size: STOP AND ASK so we can decide between Option A (fix engine for browser) or Option B (minimal resolver).
- If **scope** grows (e.g. full replay, full warroom integration): STOP AND ASK for scope confirmation before implementing.

---

*This document is the single brief for the external expert. Implementation details (file names, folder layout, framework choice) are left to the expert within the constraints above.*
