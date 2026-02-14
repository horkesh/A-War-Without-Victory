# GUI Creation — External Expert Advisor Handover (Map-Only Phase)

**Date:** 2026-02-08  
**Prepared by:** Orchestrator (Paradox team)  
**Audience:** External expert advisor (GUI/UX, interaction design) — **GUI creation**  
**Scope:** **Map-only.** Warroom (HQ, desk, wall map, crests) is **out of scope** for this phase. Deliverable: a **standalone map application** — one base geographical map with information layers, settlement interaction, and zoom — per earlier report recommendation.

**Full project context:** For where the whole project stands and what needs to be done across simulation, canon, and GUI, see [EXTERNAL_EXPERT_HANDOVER.md](EXTERNAL_EXPERT_HANDOVER.md).

**Implementation (2026-02-08):** The **Tactical Map System** fulfils this deliverable. Engineering reference: `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`. Code: `src/ui/map/`. Run: `npm run dev:map`, then open `http://localhost:3001/tactical_map.html`. External experts and agents should treat that doc as the authoritative technical reference for the standalone map app.

---

## 1. Scope and Deliverable

### 1.1 What You Are Building

- **One map-focused application** that serves as the game’s primary geographical and situational view.
- **No warroom in this phase:** No HQ scene, no wall map frame, no desk, no calendar or crests. The user opens the app and sees **only the map** (plus map chrome: layer toggles, settlement panel, zoom, close if needed).
- This map application will later be **embeddable or reachable** from a warroom (e.g. “click wall map → map scene”); for this phase you deliver the **map product** that can run standalone and later be integrated.

### 1.2 Rationale (Earlier Report Recommendation)

Per strategic direction and prior handovers:

- The GUI must have **one base geographical map** (foundation), then **layers** for information. That base map has been specified and is available as data; the **GUI that presents it is not yet built**.
- To avoid scope creep and focus expertise, this phase is **“all just map”**: base geography, layers, settlement click, zoom, tooltips. Warroom and integration are a **later phase**.

### 1.3 Out of Scope (This Phase)

| Item | Notes |
|------|--------|
| Warroom / HQ | Desk, wall, calendar, crests, “click wall map to open map” — not in scope. |
| Order-giving / war system | Orders to brigades/corps, chain of command, order flow — separate track; map is **read-only** for MVP. |
| OOB / ethnicity / displacement layers | Placeholders only (labelled “Phase II”); no full implementation. |

---

## 2. Strategic Pillars (Must Follow)

These three pillars are authoritative for the map GUI:

1. **One base geographical map, then layers**  
   One clear base map of Bosnia and Herzegovina (national boundary, rivers, roads, settlements). On top of it, **information layers** (political control, contested, later OOB/ethnicity/displacement). Do not treat layers as replacing the need for a single, clear base geography.

2. **War system separate**  
   The map **shows the result** of state (control, contested, formations when available). It does **not** implement order input, hierarchy, or order flow. Order-giving is a future handover.

3. **Settlement click → layered information**  
   Clicking a settlement must show **three layers of information**: **Settlement** (identity, role, population), **Municipality** (containing municipality, boundaries, controller), **Side** (faction/control). Required; not optional.

---

## 3. What the Map Must Show

### 3.1 Base Geographical Map (Foundation)

- One clear **base geographical map** of Bosnia and Herzegovina.
- Include: national boundary, rivers, roads (MSR and secondary), settlements (polygons or markers as per data).
- **Source:** `A1_BASE_MAP.geojson` (canonical). See [A1_BASE_MAP_REFERENCE.md](../20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md).
- **Visual style:** “1990s paper” / NATO tactical. See [NATO_AESTHETIC_SPEC.md](NATO_AESTHETIC_SPEC.md) and `.agent/napkin.md` (roads grey, rivers dusty blue, background e.g. #F4EBD0).

### 3.2 Information Layers (On Top of Base)

| Layer | Status | Description |
|-------|--------|-------------|
| **Political control** | Required | Settlement-level control by faction (RBiH, RS, HRHB); color fill per faction. |
| **Contested outline** | Required | Crosshatch or outline for CONTESTED / HIGHLY_CONTESTED settlements. |
| **Order of Battle** | Phase II placeholder | Brigade/corps/OG — labelled placeholder only. |
| **Population / ethnicity** | Phase II placeholder | Census-derived; labelled placeholder only. |
| **Displacement** | Phase II placeholder | Labelled placeholder only. |

### 3.3 Zoom Levels

- **Strategic (Level 0):** Full BiH extent; major cities labelled.
- **Operational (Level 1):** Regional zoom; front segments / regional context.
- **Tactical (Level 2):** Maximum zoom; individual settlement polygons; unit symbols when OOB is active (Phase II).

---

## 4. How the User Sees Information

### 4.1 Settlement Click → Layered Info Panel (Must Have)

When the user **clicks a settlement**, a panel (or drill-down) must show **three layers**:

1. **Settlement** — Identity (name, SID), role (urban center / town / village), population, key attributes.
2. **Municipality** — Containing municipality (name, mun1990_id), boundaries, controller.
3. **Side** — Faction/control for that settlement (and optionally municipality).

**Data sources:** `political_control_data.json`, `settlements_viewer_v1.geojson` or `settlements_a1_viewer.geojson`, `mun1990_names.json`, `settlement_names.json`. Municipality and control lookup by SID / mun1990_id.

### 4.2 Hover Tooltips (Should Have)

- Settlement hover: name, controller faction, population.
- No critical info only in color; labels must accompany color coding.

### 4.3 Decisions Needed From You

- **Layout of settlement info panel** — Tabs (Settlement | Municipality | Side)? Stacked sections? Collapsible?
- **Interaction model for zoom** — Click map to cycle vs +/- buttons vs both? Keyboard shortcuts?
- **Placement of layer toggles** — Side panel, top bar, or floating?
- **Accessibility** — Focus trap, keyboard nav, labels (no color-only critical info).
- **Chrome** — Minimal frame, “Close” or “Back” (for future embedding), or none if purely standalone.

---

## 5. Data and Technical Context

### 5.1 Data (Map and Control)

| Asset | Path (under `src/ui/warroom/public/data/` or repo `data/derived/`) | Purpose |
|-------|-------------------------------------------------------------------|---------|
| Base map geometry | `derived/A1_BASE_MAP.geojson` | Base geography (boundaries, roads, rivers, settlements). |
| Settlements (viewer) | `derived/settlements_a1_viewer.geojson` or `settlements_viewer_v1.geojson` | Settlement polygons/points for interaction and control overlay. |
| Political control | `derived/political_control_data.json` | Per-settlement (and per-municipality) control; keyed by SID and/or mun1990_id. |
| Names | `derived/mun1990_names.json`, `derived/settlement_names.json` | Labels for panel and tooltips. |
| Control zones (optional) | `derived/control_zones_A1.geojson` | Faction zones for overlay. |

**Coordinate space:** Use one coordinate system at render time. A1 is in project tactical space; do not mix with WGS84 at render. See napkin and A1_BASE_MAP_REFERENCE.

### 5.2 Existing Reference (Not the Deliverable)

- **Standalone map viewer:** `src/ui/warroom/map_viewer_standalone.html` and `map_viewer_app.ts` — current proof-of-concept that loads A1 and political control. It does **not** yet match the full handover spec (zoom levels, settlement panel layout, layer toggles, NATO aesthetic). Use it as **reference for data loading and wiring**; your deliverable is the **new map-only GUI** that fulfils this handover.
- **Warroom and WarPlanningMap:** `warroom.ts`, `WarPlanningMap.ts`, `TacticalMap.ts` — these live in the warroom codebase and are **out of scope** for this phase. You may reuse patterns or data contracts; you are not required to modify or integrate with the warroom.

### 5.3 Run and View (Reference)

To run the existing standalone viewer (for data and behaviour reference):

```powershell
npm run dev:warroom
```

Then open the map viewer entry (e.g. map_viewer_standalone.html via the dev server). Do not use `file://` — use the dev server. Your new map-only app may have its own entry point (e.g. dedicated HTML + app script).

---

## 6. Constraints (Must Follow)

- **Canon:** Do not invent mechanics; align with Rulebook, Game Bible, phase specs. If canon is silent, ask; do not assume.
- **Determinism:** No timestamps, random seeds, or nondeterministic iteration in simulation-facing code. Ordering of collections must be stable.
- **Patterns:** Read `.agent/napkin.md` at session start. Label clipping: render labels outside boundary clip. Roads grey, rivers dusty blue; NATO aesthetic. OneDrive file locks: retry on write failures if applicable.
- **Read-only for MVP:** Map inspects state; it does not mutate simulation state. No order-giving in this phase.
- **Ledger:** Any change that affects behaviour, data outputs, or scenarios requires a PROJECT_LEDGER entry; docs-only may still need ledger evaluation.

---

## 7. Reference Documents

| Document | Purpose |
|----------|---------|
| [GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION.md](GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION.md) | Three pillars: base map → layers; war system separate; settlement click. |
| [GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md](GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md) | Earlier handover (map opened from warroom); content still applies to **what** the map shows and **how** the user sees info. |
| [WAR_PLANNING_MAP_VIEWER_DUTY_DELEGATION.md](WAR_PLANNING_MAP_VIEWER_DUTY_DELEGATION.md) | Duty list for base map, zoom, settlement panel, tooltips, layers, accessibility. |
| [NATO_AESTHETIC_SPEC.md](NATO_AESTHETIC_SPEC.md) | Color palette, roads, rivers, urban density, symbolic language. |
| [A1_BASE_MAP_REFERENCE.md](../20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md) | Canonical base map data and build. |
| `.agent/napkin.md` | Visual preferences, failure patterns, domain notes — read at session start. |

---

## 8. Summary for the Expert

- **You are building the GUI** for the map. The GUI is **not yet written**; this handover defines the map-only product.
- **Scope:** One **map-only application** — base geographical map (A1) + layers (political control, contested, placeholders for OOB/ethnicity/displacement) + settlement click (panel: settlement / municipality / side) + zoom levels + hover tooltips. **No warroom** in this phase.
- **Later:** This map will be embeddable or reachable from a warroom; integration is out of scope here.
- **Decisions:** Panel layout, zoom interaction, layer toggle placement, accessibility, and minimal chrome are left for you to propose or decide, within the constraints above.
- **References:** Use the existing standalone viewer and warroom code only as reference; your deliverable is the new map-only GUI that satisfies this handover.

**Orchestrator:** This handover gives the external GUI expert a single, map-only scope so they can design and implement the primary game map without warroom or war-system scope. Warroom integration and order-giving remain separate tracks.
